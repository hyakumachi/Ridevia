import { createHandler } from './handler.js';
Deno.serve(createHandler({
  signingKey: Deno.env.get('CALENDLY_WEBHOOK_SIGNING_KEY'),
  calendlyToken: Deno.env.get('CALENDLY_ACCESS_TOKEN'),
  eventTypeURI: Deno.env.get('CALENDLY_EVENT_TYPE_URI'),
  supabaseURL: Deno.env.get('SUPABASE_URL'),
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
}));
