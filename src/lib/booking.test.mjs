import { test } from "node:test";
import assert from "node:assert/strict";
import { rentalDays, estimatePrice, manilaToday } from "./booking.js";
test("exclusive dates handle month, leap-year and daylight-saving boundaries", () => {
  assert.equal(rentalDays("2026-10-10", "2026-10-13"), 3);
  assert.equal(rentalDays("2028-02-28", "2028-03-01"), 2);
  assert.equal(rentalDays("2026-03-07", "2026-03-10"), 3);
  assert.equal(rentalDays("2026-10-10", "2026-10-10"), 0);
  assert.equal(rentalDays("", ""), 0);
});
test("discount starts at seven days and rounds each car to centavos", () => {
  assert.equal(
    estimatePrice([{ daily_rate: "1500.00" }, { daily_rate: 2500 }], 6),
    24000,
  );
  assert.equal(
    estimatePrice([{ daily_rate: "1500.00" }, { daily_rate: 2500 }], 7),
    25200,
  );
  assert.equal(
    estimatePrice([{ daily_rate: 1.01 }, { daily_rate: 1.01 }], 7),
    12.72,
  );
  assert.match(manilaToday(), /^\d{4}-\d{2}-\d{2}$/);
});
