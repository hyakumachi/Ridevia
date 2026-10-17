// Offline admin pagination checks: bounded fleet reads and whole-group receipt pages.
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
for (const view of ["fleet", "bookings"]) {
  const component = view === "fleet" ? "CarManagement" : "BookingManagement";
  const bundle = await build({
    stdin: {
      contents: `import React from 'react';import{createRoot}from'react-dom/client';import View from './src/components/admin/${component}.jsx';createRoot(document.getElementById('root')).render(<View/>);`,
      resolveDir: root,
      loader: "jsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    plugins: [
      {
        name: "mock",
        setup(builder) {
          builder.onResolve({ filter: /lib\/supabase$/ }, () => ({
            path: "supabase",
            namespace: "mock",
          }));
          builder.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
            contents: "export const supabase=window.testDatabase;",
          }));
        },
      },
    ],
  });
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/",
    runScripts: "dangerously",
  });
  const w = dom.window;
  const cars = Array.from({ length: 13 }, (_, i) => ({
    id: "car-" + i,
    name: "Car " + (i + 1),
    make: "Test",
    model: "Demo",
    category: "sedan",
    plate_number: "TEST-" + i,
    daily_rate: 1000,
    maintenance: false,
    image_paths: [],
  }));
  const groups = Array.from({ length: 12 }, (_, i) => ({
    ref: "group-" + (i + 1),
    rows: [0, 1].map((j) => ({
      id: `booking-${i}-${j}`,
      group_ref: "group-" + (i + 1),
      status: i % 2 ? "pending" : "completed",
      payment_status: i % 2 ? "unpaid" : "paid",
      payment_method: i % 2 ? null : "cash",
      start_date: "2099-11-01",
      end_date: "2099-11-08",
      rental_days: 7,
      discount_percent: 10,
      total_price: 6300,
      customers: { full_name: "Guest " + i },
      cars: { name: `Car ${i}-${j}` },
    })),
  }));
  const ranges = [];
  const calls = [];
  w.testDatabase = {
    storage: {
      from() {
        return { getPublicUrl: () => ({ data: { publicUrl: "" } }) };
      },
    },
    from(table) {
      assert.equal(table, "cars");
      return {
        select() {
          return this;
        },
        order() {
          return this;
        },
        range(a, b) {
          ranges.push([a, b]);
          return Promise.resolve({
            data: cars.slice(a, b + 1),
            count: cars.length,
          });
        },
      };
    },
    async rpc(name, params) {
      assert.equal(name, "admin_booking_groups_page");
      calls.push(params);
      const list = params.p_receipts_only
        ? groups.filter((group) =>
            group.rows.every(
              (row) =>
                row.status === "completed" && row.payment_status === "paid",
            ),
          )
        : groups;
      return {
        data: {
          groups: list.slice(
            (params.p_page - 1) * params.p_page_size,
            params.p_page * params.p_page_size,
          ),
          total: list.length,
          page: params.p_page,
        },
      };
    },
  };
  try {
    w.eval(bundle.outputFiles[0].text);
    const ui = within(w.document.body);
    const wait = (fn) => waitFor(fn, { container: w.document.body });
    const label = view === "fleet" ? "Fleet pagination" : "Bookings pagination";
    await wait(() => assert(ui.getByRole("navigation", { name: label })));
    const pager = () => within(ui.getByRole("navigation", { name: label }));
    fireEvent.click(pager().getByRole("button", { name: "Next" }));
    if (view === "fleet") {
      await wait(() => assert(ui.getByRole("button", { name: "Edit Car 9" })));
      assert(!ui.queryByRole("button", { name: "Edit Car 1" }));
      assert.deepEqual(ranges, [
        [0, 7],
        [8, 15],
      ]);
    } else {
      await wait(() =>
        assert(ui.getByRole("article", { name: "Booking group group-6" })),
      );
      assert(!ui.queryByRole("article", { name: "Booking group group-1" }));
      assert.equal(ui.getAllByRole("article").length, 5);
      assert(
        within(
          ui.getByRole("article", { name: "Booking group group-6" }),
        ).getByText(/Booking ID: booking-5-1/),
      );
      fireEvent.click(ui.getByRole("button", { name: "Receipts" }));
      await wait(() =>
        assert(ui.getByRole("navigation", { name: "Receipts pagination" })),
      );
      assert.equal(calls.at(-1).p_page, 1);
      assert.equal(calls.at(-1).p_receipts_only, true);
      await wait(() =>
        assert(
          !within(
            ui.getByRole("navigation", { name: "Receipts pagination" }),
          ).getByRole("button", { name: "Next" }).disabled,
        ),
      );
      const receiptPager = within(
        ui.getByRole("navigation", { name: "Receipts pagination" }),
      );
      fireEvent.click(receiptPager.getByRole("button", { name: "Next" }));
      await wait(() =>
        assert(ui.getByRole("article", { name: "Booking group group-11" })),
      );
      assert.equal(ui.getAllByRole("article").length, 1);
    }
  } finally {
    dom.window.close();
  }
}
console.log(
  "PASS bounded fleet pages, whole-group booking pagination and completed/paid receipt pages",
);
