// Offline DOM test: no browser preview, network requests or print dialogs.
import { JSDOM } from "jsdom";
import { build } from "esbuild";
import { within, fireEvent, waitFor, configure } from "@testing-library/dom";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
configure({
  getElementError: (message) =>
    new Error(String(message || "Element query failed").split("\n")[0]),
});
const bundle = await build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';import BookingManagement from './src/components/admin/BookingManagement.jsx';createRoot(document.getElementById('root')).render(<React.StrictMode><BookingManagement /></React.StrictMode>);`,
    resolveDir: root,
    loader: "jsx",
  },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  plugins: [
    {
      name: "offline-database",
      setup(builder) {
        builder.onResolve({ filter: /lib\/supabase$/ }, () => ({
          path: "supabase",
          namespace: "mock",
        }));
        builder.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents: "export const supabase = window.testDatabase;",
        }));
      },
    },
  ],
});
const group = "receipt-test-group";
const base = {
  group_ref: group,
  start_date: "2026-11-10",
  end_date: "2026-11-17",
  rental_days: 7,
  discount_percent: 10,
  status: "completed",
  payment_status: "paid",
  payment_method: "cash",
  customers: {
    full_name: "Guest <script>alert(1)</script>",
    license_number: "PRIVATE-LICENSE",
    email: "private@example.com",
    phone: "09123456789",
  },
};
const fixtures = [
  {
    ...base,
    id: "booking-one",
    daily_rate: 1000,
    total_price: 6300,
    cars: { name: "Car One", plate_number: "TEST-ONE" },
  },
  {
    ...base,
    id: "booking-two",
    daily_rate: 1500,
    total_price: 9450,
    cars: { name: "Car Two", plate_number: "TEST-TWO" },
  },
];
async function scenario(kind) {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/",
    runScripts: "dangerously",
  });
  const w = dom.window;
  let printCount = 0,
    reads = 0;
  w.print = () => {
    printCount++;
  };
  w.testDatabase = {
    async rpc(name, params) {
      assert.equal(name, "admin_booking_groups_page");
      const rows =
        kind === "unpaid"
          ? fixtures.map((row) => ({ ...row, payment_status: "unpaid" }))
          : kind === "pending"
            ? fixtures.map((row) => ({ ...row, status: "pending" }))
            : fixtures;
      const eligible = rows.every(
        (row) => row.status === "completed" && row.payment_status === "paid",
      );
      const groups =
        params.p_receipts_only && !eligible ? [] : [{ ref: group, rows }];
      return { data: { groups, total: groups.length, page: 1 } };
    },
    from(table) {
      let filtered = false;
      return {
        select() {
          return this;
        },
        eq() {
          filtered = true;
          return this;
        },
        order() {
          assert.equal(table, "bookings");
          reads++;
          const rows =
            kind === "unpaid"
              ? fixtures.map((row) => ({ ...row, payment_status: "unpaid" }))
              : kind === "pending"
                ? fixtures.map((row) => ({ ...row, status: "pending" }))
                : kind === "stale" && filtered
                  ? fixtures.map((row) => ({
                      ...row,
                      payment_status: "unpaid",
                    }))
                  : fixtures;
          return Promise.resolve({ data: rows });
        },
      };
    },
  };
  try {
    w.eval(bundle.outputFiles[0].text);
    const ui = within(w.document.body);
    const wait = (fn) => waitFor(fn, { container: w.document.body });
    await wait(() => assert(ui.getByText("Reference: " + group)));
    if (kind === "pending" || kind === "unpaid") {
      assert(!ui.queryByRole("button", { name: "View receipt" }));
      return;
    }
    fireEvent.click(ui.getByRole("button", { name: "View receipt" }));
    if (kind === "stale") {
      await wait(() => assert(ui.getByRole("alert")));
      assert(!ui.queryByRole("button", { name: "Print / Save as PDF" }));
      return;
    }
    await wait(() =>
      assert(ui.getByRole("button", { name: "Print / Save as PDF" })),
    );
    assert(reads >= 2, "Receipt did not refresh the group");
    const receipt = ui.getByRole("region", { name: "Rental receipt" });
    assert(receipt.textContent.includes("booking-one"));
    assert(receipt.textContent.includes("booking-two"));
    assert(receipt.textContent.includes("₱15,750.00"));
    assert(receipt.textContent.includes("₱700.00"));
    assert(receipt.textContent.includes("CASH"));
    assert(!receipt.textContent.includes("PRIVATE-LICENSE"));
    assert(!receipt.textContent.includes("private@example.com"));
    assert.equal(receipt.querySelectorAll("script").length, 0);
    fireEvent.click(ui.getByRole("button", { name: "Print / Save as PDF" }));
    assert.equal(printCount, 1);
    fireEvent.click(
      ui.getByRole("button", { name: "Back to booking management" }),
    );
    await wait(() => assert(ui.getByRole("heading", { name: "Reservations" })));
  } finally {
    dom.window.close();
  }
}
for (const kind of ["paid", "pending", "unpaid", "stale"]) await scenario(kind);
console.log(
  "PASS receipt navigation, fresh eligibility, multi-car prices, safe customer text and print action",
);
