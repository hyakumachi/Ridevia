// Offline guest/galleries regression. No server, external scripts or network calls.
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
  entryPoints: [root + "/src/main.jsx"],
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  loader: { ".css": "empty" },
  plugins: [
    {
      name: "offline-supabase",
      setup(builder) {
        builder.onResolve({ filter: /lib\/supabase$/ }, () => ({
          path: "supabase",
          namespace: "fixture",
        }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: "export const supabase = window.testDatabase;",
        }));
      },
    },
  ],
});
const cars = [
  {
    id: "car-a",
    name: "Car A",
    make: "Test",
    model: "A",
    category: "sedan",
    daily_rate: 1000,
    maintenance: false,
    image_path: "a/cover.jpg",
    image_paths: ["a/cover.jpg", "a/side.jpg"],
  },
  {
    id: "car-b",
    name: "Car B",
    category: "suv",
    daily_rate: 1500,
    maintenance: false,
    image_paths: [],
  },
  {
    id: "car-c",
    name: "Maintenance car",
    category: "van",
    daily_rate: 2000,
    maintenance: true,
    image_paths: [],
  },
];
for (let i = 1; i <= 7; i++)
  cars.push({
    id: `extra-${i}`,
    name: `Extra ${i}`,
    category: "sedan",
    daily_rate: 1000,
    maintenance: false,
    image_paths: [],
  });
for (const conflict of [false, true]) {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/",
    runScripts: "dangerously",
  });
  const w = dom.window;
  const calls = [];
  let rejected = false;
  w.testDatabase = {
    storage: {
      from() {
        return {
          getPublicUrl: (path) => ({
            data: { publicUrl: "https://photos.example/" + path },
          }),
        };
      },
    },
    async rpc(name, payload) {
      if (name === "public_cars_by_ids")
        return {
          data: cars.filter(
            (car) => payload.p_ids.includes(car.id) && !car.maintenance,
          ),
        };
      if (name === "car_catalog_page") {
        const all = cars
          .filter(
            (car) =>
              !car.maintenance &&
              (!payload.p_category || car.category === payload.p_category),
          )
          .sort((a, b) => a.name.localeCompare(b.name));
        const page = Math.min(
          payload.p_page,
          Math.max(1, Math.ceil(all.length / payload.p_page_size)),
        );
        return {
          data: {
            cars: all.slice(
              (page - 1) * payload.p_page_size,
              page * payload.p_page_size,
            ),
            total: all.length,
            page,
          },
        };
      }
      if (name === "car_availability_for_ids")
        return {
          data: cars
            .filter((car) => payload.p_ids.includes(car.id))
            .map((car) => ({
              car_id: car.id,
              available: !car.maintenance && !rejected,
            })),
        };
      if (name === "submit_booking") {
        calls.push(payload);
        if (conflict) {
          rejected = true;
          return { error: { code: "23P01" } };
        }
        return {
          data: {
            group_ref: "test-group-reference",
            total_price: 15750,
            bookings: [{ id: "one" }, { id: "two" }],
          },
        };
      }
      throw new Error("Unexpected RPC " + name);
    },
  };
  try {
    w.eval(bundle.outputFiles[0].text);
    const ui = within(w.document.body);
    const wait = (fn) => waitFor(fn, { container: w.document.body });
    await wait(() => assert(ui.getByLabelText("Select Car A")));
    assert(ui.getByRole("heading", { level: 1, name: "Reserve your ride" }));
    for (const heading of ["Pick your dates", "Find your ride", "Make it yours"]) {
      const step = ui.getByRole("heading", { name: heading }).parentElement;
      assert.equal(step.querySelector("p"), null, "Step description should be removed");
    }
    fireEvent.click(ui.getAllByRole("link", { name: "Contact us" })[0]);
    await wait(() => assert(ui.getByRole("heading", { name: "Contact us" })));
    for (const username of ["guywithbag", "hyakumachi"]) {
      const heading = ui.getByRole("heading", { name: username });
      const card = within(heading.closest("article"));
      const link = card.getByRole("link", { name: "View GitHub profile ↗" });
      assert.equal(link.href, `https://github.com/${username}`);
      assert.equal(link.target, "_blank");
      assert.ok(link.rel.includes("noopener"));
      assert(card.getByRole("img", { name: `${username}'s GitHub avatar` }));
    }
    fireEvent.click(ui.getByRole("link", { name: "Back to bookings" }));
    await wait(() => assert(ui.getByLabelText("Select Car A")));
    fireEvent.click(ui.getByRole("link", { name: "Car A" }));
    await wait(() =>
      assert(ui.getByRole("button", { name: "View photo 2 of Car A" })),
    );
    fireEvent.click(ui.getByRole("button", { name: "View photo 2 of Car A" }));
    await wait(() =>
      assert(ui.getByRole("img", { name: "Car A" }).src.endsWith("a/side.jpg")),
    );
    w.location.hash = "";
    await wait(() => assert(ui.getByLabelText("Select Car A")));
    fireEvent.change(ui.getByLabelText("Pickup date"), {
      target: { value: "2099-11-01" },
    });
    fireEvent.change(ui.getByLabelText("Return date"), {
      target: { value: "2099-11-08" },
    });
    fireEvent.click(ui.getByLabelText("Select Car A"));
    const pager = () =>
      within(ui.getByRole("navigation", { name: "Cars pagination" }));
    fireEvent.click(pager().getByRole("button", { name: "Next" }));
    await wait(() => assert(ui.getByLabelText("Select Extra 5")));
    fireEvent.click(ui.getByLabelText("Select Extra 5"));
    await wait(() =>
      assert(ui.getByRole("button", { name: "Remove Car A from reservation" })),
    );
    fireEvent.change(ui.getByLabelText("Car type"), {
      target: { value: "suv" },
    });
    await wait(() => assert(ui.getByLabelText("Select Car B")));
    assert(!ui.queryByLabelText("Select Car A"));
    fireEvent.click(
      ui.getByRole("button", { name: "Remove Extra 5 from reservation" }),
    );
    fireEvent.click(ui.getByLabelText("Select Car B"));
    fireEvent.change(ui.getByLabelText("Car type"), { target: { value: "" } });
    await wait(() => assert(ui.getByLabelText("Select Car A").checked));
    assert(ui.getByLabelText("Select Car B").checked);
    assert(!ui.queryByLabelText("Select Maintenance car"));
    fireEvent.change(ui.getByLabelText("Sort by"), {
      target: { value: "type" },
    });
    await wait(() => assert(ui.getByLabelText("Select Car A").checked));
    assert(ui.getByLabelText("Select Car B").checked);
    for (const [label, value] of [
      ["Full name", "Demo Guest"],
      ["Email address", "guest@example.com"],
      ["Phone number", "09123456789"],
      ["Driver’s license number", "TEST-LICENSE"],
    ])
      fireEvent.change(ui.getByLabelText(label), { target: { value } });
    const button = ui.getByRole("button", { name: "Reserve your ride →" });
    await wait(() => assert(!button.disabled));
    const form = w.document.querySelector("form");
    fireEvent.submit(form);
    fireEvent.submit(form);
    if (conflict) {
      await wait(() =>
        assert(
          ui.getByText(
            "A selected car is no longer available. Please choose another car or different dates.",
          ),
        ),
      );
      await wait(() =>
        assert(
          ui.getByRole("button", { name: "Reserve your ride →" }).disabled,
        ),
      );
    } else {
      await wait(() => assert(ui.getByText("test-group-reference")));
      assert(ui.getByText("₱15,750.00"));
      assert(ui.getByRole("button", { name: "Choose pickup time" }));
    }
    assert.equal(calls.length, 1, "Duplicate reservation submitted");
    assert.deepEqual(JSON.parse(JSON.stringify(calls[0].p_car_ids)), [
      "car-a",
      "car-b",
    ]);
    assert(!Object.hasOwn(calls[0], "total_price"));
  } finally {
    dom.window.close();
  }
}
console.log(
  "PASS guest gallery, date/selection flow, multi-car totals, duplicate protection and conflict recovery",
);
