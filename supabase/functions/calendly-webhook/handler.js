const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const groupPattern = new RegExp(`^${uuid}$`, 'i');
const eventPattern = new RegExp(`^https://api[.]calendly[.]com/scheduled_events/${uuid}$`, 'i');
const inviteePattern = new RegExp(`^https://api[.]calendly[.]com/scheduled_events/${uuid}/invitees/${uuid}$`, 'i');
const encoder = new TextEncoder();
export async function verifySignature(raw, header, secret, now = Date.now()) {
  if (!secret || !header) return false;
  const parts = header.split(',').map(part => part.trim().split('='));
  const timestamps = parts.filter(([key]) => key === 't');
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (timestamps.length !== 1 || !/^\d+$/.test(timestamps[0][1])) return false;
  const timestamp = timestamps[0][1];
  if (Math.abs(now / 1000 - Number(timestamp)) > 180) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['verify']);
  for (const signature of signatures) {
    if (!/^[0-9a-f]{64}$/i.test(signature || '')) continue;
    const bytes = new Uint8Array(signature.match(/../g).map(value => parseInt(value, 16)));
    if (await crypto.subtle.verify('HMAC', key, bytes, encoder.encode(`${timestamp}.${raw}`))) return true;
  }
  return false;
}
const reply = (status, message) => Response.json({ message }, { status });
export function createHandler(config, fetcher = fetch) {
  return async function handle(request) {
    if (request.method !== 'POST') return reply(405, 'POST required');
    if (!config.signingKey || !config.calendlyToken || !config.eventTypeURI || !config.supabaseURL || !config.serviceKey) return reply(503, 'Webhook not configured');
    try {
      // Bound the streamed body too; Content-Length cannot be trusted.
      const reader = request.body?.getReader();
      if (!reader) return reply(400, 'Missing body');
      const chunks = []; let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 262144) { await reader.cancel(); return reply(413, 'Payload too large'); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (!await verifySignature(raw, request.headers.get('Calendly-Webhook-Signature'), config.signingKey)) return reply(401, 'Invalid signature');
      let envelope;
      try { envelope = JSON.parse(raw); } catch { return reply(400, 'Invalid JSON'); }
      if (!['invitee.created','invitee.canceled'].includes(envelope.event)) return reply(200, 'Ignored event');
      const payload = envelope.payload;
      const group = payload?.tracking?.utm_content;
      if (!groupPattern.test(group || '')) return reply(200, 'Unrelated appointment');
      const eventURI = typeof payload.event === 'string' ? payload.event : payload.scheduled_event?.uri;
      if (!eventPattern.test(eventURI || '') || !inviteePattern.test(payload.uri || '') || !payload.uri.startsWith(eventURI + '/invitees/') || typeof payload.email !== 'string') return reply(400, 'Invalid invitee');
      // Fetch the canonical event only after authentication; never fetch arbitrary webhook URLs.
      const response = await fetcher(eventURI, { headers: { Authorization: `Bearer ${config.calendlyToken}` }, redirect: 'error', signal: AbortSignal.timeout(5000) });
      if (!response.ok) return reply(503, 'Calendar lookup unavailable');
      const event = (await response.json()).resource;
      if (event?.event_type !== config.eventTypeURI) return reply(200, 'Unrelated event type');
      if (event.uri !== eventURI || !Number.isFinite(Date.parse(event.start_time))) return reply(400, 'Invalid appointment time');
      const result = await fetcher(`${config.supabaseURL}/rest/v1/rpc/handle_calendly_webhook`, {
        method: 'POST', headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ p_group_ref: group, p_invitee_uri: payload.uri, p_event_uri: eventURI, p_email: payload.email,
          p_pickup_at: event.start_time, p_created_at: payload.created_at,
          p_cancelled: envelope.event === 'invitee.canceled' || payload.status === 'canceled' || event.status === 'canceled' }),
        signal: AbortSignal.timeout(5000),
      });
      if (!result.ok) return reply(503, 'Appointment persistence unavailable');
      return reply(200, 'Appointment processed');
    } catch {
      // No provider payloads, customer details or secrets in logs/responses.
      return reply(503, 'Webhook temporarily unavailable');
    }
  };
}
