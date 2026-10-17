import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createHandler, verifySignature } from './handler.js';
const secret='test-signing-secret';
const stamp=String(Math.floor(Date.now()/1000));
const sign=(body,t=stamp)=>`t=${t},v1=${createHmac('sha256',secret).update(`${t}.${body}`).digest('hex')}`;
const eventURI='https://api.calendly.com/scheduled_events/90000000-0000-0000-0000-000000000001';
const typeURI='https://api.calendly.com/event_types/90000000-0000-0000-0000-000000000002';
const fixture={event:'invitee.created',payload:{uri:eventURI+'/invitees/90000000-0000-0000-0000-000000000003',event:eventURI,email:'guest@example.com',created_at:'2026-10-12T01:00:00Z',tracking:{utm_content:'90000000-0000-0000-0000-000000000004'}}};
const config={signingKey:secret,calendlyToken:'test-token',eventTypeURI:typeURI,supabaseURL:'https://demo.supabase.co',serviceKey:'server-test-key'};
test('signatures reject tampering, stale/future timestamps and malformed headers', async()=>{
 const raw=JSON.stringify(fixture);
 assert(await verifySignature(raw,sign(raw),secret));
 assert(!await verifySignature(raw+' ',sign(raw),secret));
 for(const t of [String(Number(stamp)-181),String(Number(stamp)+181)]) assert(!await verifySignature(raw,sign(raw,t),secret,Number(stamp)*1000));
 assert(!await verifySignature(raw,`t=${stamp},t=${stamp},v1=bad`,secret));
});
test('authenticated webhook checks canonical event then persists without updating payment', async()=>{
 const calls=[];
 const handle=createHandler(config,async(url,options)=>{
  calls.push({url,options});
  if(url===eventURI) return Response.json({resource:{uri:eventURI,event_type:typeURI,start_time:'2026-11-10T01:00:00Z',status:'active'}});
  return Response.json('processed');
 });
 const raw=JSON.stringify(fixture);
 assert.equal((await handle(new Request('http://localhost',{method:'POST',body:raw,headers:{'Calendly-Webhook-Signature':sign(raw)}}))).status,200);
 assert.equal(calls.length,2);
 const payload=JSON.parse(calls[1].options.body);
 assert.equal(payload.p_cancelled,false);assert.equal(payload.p_group_ref,fixture.payload.tracking.utm_content);
 assert(!Object.hasOwn(payload,'payment_status'));
 assert.equal((await handle(new Request('http://localhost',{method:'POST',body:raw}))).status,401);
 assert.equal(calls.length,2);
});
test('unrelated events and hostile URLs never reach persistence',async()=>{
 let calls=0;
 const handle=createHandler(config,async()=>{calls++;return Response.json({resource:{uri:eventURI,event_type:'other',start_time:'2026-11-10T01:00:00Z'}});});
 for(const [body,status] of [[{...fixture,payload:{...fixture.payload,event:'https://attacker.example/'}},400],[fixture,200]]){
  const raw=JSON.stringify(body);assert.equal((await handle(new Request('http://localhost',{method:'POST',body:raw,headers:{'Calendly-Webhook-Signature':sign(raw)}}))).status,status);
 }
 assert.equal(calls,1);
});
