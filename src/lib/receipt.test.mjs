import test from 'node:test';
import assert from 'node:assert/strict';
import {canIssueReceipt, receiptTotal} from './receipt.js';
test('receipts require every booking to be completed and paid',()=>{
 const paid={status:'completed',payment_status:'paid'};
 assert(canIssueReceipt([paid,paid]));
 assert(!canIssueReceipt([]));
 for(const row of [{status:'pending',payment_status:'paid'},{status:'ongoing',payment_status:'paid'},{status:'completed',payment_status:'unpaid'},{status:'cancelled',payment_status:'refunded'}]) assert(!canIssueReceipt([paid,row]));
});
test('receipt total sums the stored per-car centavo amounts',()=>{
 assert.equal(receiptTotal([{total_price:'1000.01'},{total_price:'2000.02'}]),3000.03);
});
