export function canIssueReceipt(rows) {
  return rows.length > 0 && rows.every(row => row.status === "completed" && row.payment_status === "paid");
}
export function receiptTotal(rows) {
  return rows.reduce((sum, row) => sum + Math.round(Number(row.total_price) * 100), 0) / 100;
}
