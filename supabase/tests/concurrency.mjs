// Run only against a linked development project: creates temporary fixtures and deletes them.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const exec=promisify(execFile);
const cli=process.env.RIDEVIA_SUPABASE_CLI || 'supabase';
async function query(sql){return exec(cli,['db','query','--linked',sql],{cwd:repository,timeout:45000,maxBuffer:100000});}
const id='40000000-0000-0000-0000-000000000001';
const id2='40000000-0000-0000-0000-000000000002';
const customer='40000000-0000-0000-0000-000000000004';
const group='40000000-0000-0000-0000-000000000005';
const admin='40000000-0000-0000-0000-000000000006';
const insert=(ids=[id])=>`insert into public.bookings(group_ref,customer_id,car_id,start_date,end_date,daily_rate) select gen_random_uuid(),'${customer}',id,current_date+150,current_date+157,1 from unnest(array[${ids.map(x=>`'${x}'::uuid`).join(',')}]) id`;
const maintenance=`update public.cars set maintenance=true where id='${id}'`;
async function cleanBookings(){await query(`delete from public.bookings where car_id in ('${id}','${id2}');update public.cars set maintenance=false where id in ('${id}','${id2}')`);}
async function race(label,first,second,finish,expected){
 const a=query(`begin;set local application_name='ridevia-race-test-a';${first};select pg_sleep(8);${finish};`).then(()=>({ok:true}),e=>({error:e}));
 // Poll until session A has performed its mutation and is sleeping with locks held.
 let sleeping=false;
 for(let i=0;i<6;i++){
  const r=await query(`select exists(select 1 from pg_stat_activity where application_name='ridevia-race-test-a' and wait_event='PgSleep') as ready`);
  if(/"ready":\s*true/.test(r.stdout)){sleeping=true;break;}
 }
 assert(sleeping,'Session A did not become ready');
 const started=Date.now();
 const b=query(`begin;set local lock_timeout='15s';${second};commit;`).then(r=>({ok:true,result:r}),e=>({error:e}));
 const ar=await a;assert(ar.ok,ar.error?.stderr);
 const br=await b;
 assert(Date.now()-started>1000,'No lock wait observed');
 if(expected){assert(br.error,'Competing transaction unexpectedly succeeded');assert((br.error.stderr+br.error.stdout).includes(expected),br.error.stderr+br.error.stdout);}
 else assert(br.ok,br.error?.stderr);
 console.log('PASS '+label);
 await cleanBookings();
}
let created=false;
try{
 await query(`begin;insert into public.cars(id,name,plate_number,daily_rate) values ('${id}','Concurrency test','RACE-TEMP-A',1000),('${id2}','Concurrency test','RACE-TEMP-B',2000);insert into public.customers(id,full_name,email,phone,license_number) values ('${customer}','Concurrency Test','concurrency-test@example.com','09123456789','TEST-ONLY');insert into auth.users(id) values ('${admin}');insert into private.admins(user_id) values ('${admin}');commit;`);created=true;
 await race('overlapping reservations serialize and reject second',insert(),insert(),'commit','23514');
 await race('rollback releases reservation lock',insert(),insert(),'rollback',null);
 await race('maintenance blocks competing booking',maintenance,insert(),'commit','23514');
 await race('booking blocks competing maintenance',insert(),maintenance,'commit','23514');
 // Exercise the actual RPC with cars selected in reverse order.
 const submit=ids=>`set local role anon;select public.submit_booking(array[${ids.map(x=>`'${x}'::uuid`).join(',')}],current_date+160,current_date+167,'Concurrency Test','race-rpc@example.com','09123456789','TEST-ONLY');reset role`;
 await race('RPC reverse car order avoids deadlock',submit([id,id2]),submit([id2,id]),'commit','23514');
 const insertGroup = `insert into public.bookings(group_ref,customer_id,car_id,start_date,end_date,daily_rate) select '${group}','${customer}',id,current_date+180,current_date+187,1 from unnest(array['${id}'::uuid,'${id2}'::uuid]) id`;
 const action = status => `set local request.jwt.claims='{"sub":"${admin}"}';set local role authenticated;select public.update_booking_group('${group}','${status}');reset role`;
 await query(insertGroup);
 await race('group cancellation blocks competing start without partial updates',action('cancelled'),action('ongoing'),'commit','23514');
 await query(insertGroup);
 await race('group cancellation releases cars for competing maintenance',action('cancelled'),maintenance,'commit',null);
}finally{
 if(created) await query(`begin;delete from public.bookings where car_id in ('${id}','${id2}');delete from public.cars where id in ('${id}','${id2}');delete from public.customers where id='${customer}' or email='race-rpc@example.com';delete from auth.users where id='${admin}';commit;`);
}
