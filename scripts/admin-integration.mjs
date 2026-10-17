// Integration test for a linked development project only. Creates temporary Auth users and records; cleans them up.
import { JSDOM } from "jsdom";
import { build } from "esbuild";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../", import.meta.url));
const cli = process.env.RIDEVIA_SUPABASE_CLI || "supabase";
const projectRef = readFileSync(
  root + "/supabase/.temp/project-ref",
  "utf8",
).trim();
const exec = promisify(execFile);
const { createClient } = createRequire(root + "/package.json")(
  "@supabase/supabase-js",
);
const env = {};
for (const filename of [".env", ".env.local"])
  if (existsSync(root + "/" + filename))
    for (const line of readFileSync(root + "/" + filename, "utf8").split(
      "\n",
    )) {
      const m = line.match(/^\s*(VITE_SUPABASE_[A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
const keyResult = await exec(
  cli,
  ["projects", "api-keys", "--project-ref", projectRef, "--output", "json"],
  { cwd: root },
);
const serviceKey = JSON.parse(keyResult.stdout).find(
  (key) => key.name === "service_role",
)?.api_key;
assert(serviceKey, "Privileged test key unavailable");
const server = createClient(env.VITE_SUPABASE_URL, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const bundle = await build({
  entryPoints: [root + "/src/main.jsx"],
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  loader: { ".css": "empty" },
  define: { "import.meta.env": JSON.stringify(env) },
  logLevel: "silent",
});
const { within, fireEvent, waitFor, configure } =
  await import("@testing-library/dom");
configure({
  getElementError: (message) =>
    new Error(String(message || "Element query failed").split("\n")[0]),
});
const users = [],
  doms = [];
const photoPaths = [];
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFe8AAAAASUVORK5CYII=",
  "base64",
);
let testCar, secondCar, bookingRef, customerId;
function open(hash = "admin") {
  const dom = new JSDOM('<html><body><div id="root"></div></body></html>', {
    url: "http://localhost/#" + hash,
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  doms.push(dom);
  const w = dom.window;
  Object.assign(w, {
    fetch: globalThis.fetch,
    Headers: globalThis.Headers,
    Request: globalThis.Request,
    Response: globalThis.Response,
    AbortController: globalThis.AbortController,
    TextEncoder: globalThis.TextEncoder,
    TextDecoder: globalThis.TextDecoder,
    Blob: globalThis.Blob,
    File: globalThis.File,
    FormData: globalThis.FormData,
  });
  let verificationCount = 0;
  w.fetch = (...args) => {
    if (String(args[0]).includes("/auth/v1/verify")) verificationCount++;
    return globalThis.fetch(...args);
  };
  w.eval(bundle.outputFiles[0].text);
  return {
    dom,
    w,
    ui: within(w.document.body),
    wait: (fn) => waitFor(fn, { container: w.document.body, timeout: 30000 }),
    verified: () => verificationCount,
  };
}
async function checked(promise) {
  const r = await promise;
  if (r.error)
    throw new Error(
      "Test operation failed: " + r.error.code + " " + r.error.message,
    );
  return r.data;
}
const suffix = randomBytes(6).toString("hex");
const email = `ridevia-admin-test-${suffix}@example.com`,
  password = randomBytes(18).toString("base64url");
const carName = "000 UI Admin Test " + suffix;
try {
  const user = (
    await checked(
      server.auth.admin.createUser({ email, password, email_confirm: true }),
    )
  ).user;
  users.push(user.id);
  const { w, ui, wait } = open();
  await wait(() => assert(ui.getByRole("button", { name: "Sign in" })));
  const login = async () => {
    fireEvent.change(ui.getByLabelText("Email address"), {
      target: { value: email },
    });
    fireEvent.change(ui.getByLabelText("Password"), {
      target: { value: password },
    });
    fireEvent.submit(w.document.querySelector("form"));
  };
  await login();
  await wait(() => assert(ui.getByText("Admin access required")));
  console.log("PASS real Auth login denies non-admin account");
  fireEvent.click(ui.getByRole("button", { name: "Sign out" }));
  await wait(() => assert(ui.getByRole("button", { name: "Sign in" })));
  await exec(
    cli,
    [
      "db",
      "query",
      "--linked",
      `insert into private.admins(user_id) values ('${user.id}')`,
    ],
    { cwd: root },
  );
  await login();
  await wait(() => assert(ui.getByRole("heading", { name: "Car management" })));
  console.log("PASS real Auth admin login and authorization");
  for (const [label, value] of [
    ["Display name", carName],
    ["Make", "Test"],
    ["Model", "Demo"],
    ["Plate number", "UI-" + suffix],
    ["Daily rate (PHP)", "1500"],
  ])
    fireEvent.change(ui.getByLabelText(label), { target: { value } });
  fireEvent.change(ui.getByLabelText("Car photos"), {
    target: {
      files: [
        new File([png], "car.png", { type: "image/png" }),
        new File([png], "car-side.png", { type: "image/png" }),
      ],
    },
  });
  fireEvent.submit(ui.getByRole("form", { name: "Car editor" }));
  await wait(() => assert(ui.getByText("Car added.")));
  await wait(() => assert(ui.getByRole("button", { name: "Edit " + carName })));
  testCar = (
    await checked(
      server
        .from("cars")
        .select("id,image_path")
        .eq("plate_number", ("UI-" + suffix).toUpperCase())
        .single(),
    )
  ).id;
  const storedPhoto = (
    await checked(
      server.from("cars").select("image_path").eq("id", testCar).single(),
    )
  ).image_path;
  assert(storedPhoto, "Car photo path missing after upload");
  const gallery = (
    await checked(
      server.from("cars").select("image_paths").eq("id", testCar).single(),
    )
  ).image_paths;
  assert.equal(gallery.length, 2);
  photoPaths.push(...gallery);
  const photoURL = publicClient.storage
    .from("car-photos")
    .getPublicUrl(storedPhoto).data.publicUrl;
  const download = await fetch(photoURL);
  assert.equal(download.status, 200);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), png);
  const guestPhotos = open("");
  await guestPhotos.wait(() =>
    assert(guestPhotos.ui.getByRole("img", { name: carName })),
  );
  assert.equal(
    guestPhotos.ui.getByRole("img", { name: carName }).src,
    photoURL,
  );
  const photoDetail = open("cars/" + testCar);
  await photoDetail.wait(() =>
    assert(photoDetail.ui.getByRole("img", { name: carName })),
  );
  fireEvent.click(
    photoDetail.ui.getByRole("button", { name: "View photo 2 of " + carName }),
  );
  await photoDetail.wait(() =>
    assert(
      photoDetail.ui
        .getByRole("img", { name: carName })
        .src.endsWith(gallery[1]),
    ),
  );
  const deniedUpload = await publicClient.storage
    .from("car-photos")
    .upload(`${testCar}/00000000-0000-0000-0000-000000000001.png`, png, {
      contentType: "image/png",
    });
  assert(deniedUpload.error, "Anonymous upload unexpectedly allowed");
  const nonAdminClient = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const outsider = (
    await checked(
      server.auth.admin.createUser({
        email: `ridevia-photo-test-${suffix}@example.com`,
        password,
        email_confirm: true,
      }),
    )
  ).user;
  users.push(outsider.id);
  await checked(
    nonAdminClient.auth.signInWithPassword({ email: outsider.email, password }),
  );
  assert(
    (
      await nonAdminClient.storage
        .from("car-photos")
        .upload(`${testCar}/00000000-0000-0000-0000-000000000002.png`, png, {
          contentType: "image/png",
        })
    ).error,
    "Non-admin upload unexpectedly allowed",
  );
  await nonAdminClient.storage.from("car-photos").remove([storedPhoto]);
  const storedObjects = await checked(
    server.storage.from("car-photos").list(testCar),
  );
  assert(
    storedObjects.some((object) => object.name === storedPhoto.split("/")[1]),
    "Non-admin deleted public photo",
  );
  console.log(
    "PASS admin photo upload, public download/rendering and unauthorized upload rejection",
  );
  fireEvent.click(ui.getByRole("button", { name: "Edit " + carName }));
  await wait(() => assert(ui.getByRole("heading", { name: "Edit car" })));
  fireEvent.change(ui.getByLabelText("Daily rate (PHP)"), {
    target: { value: "1800" },
  });
  fireEvent.click(ui.getByRole("button", { name: "Use as cover" }));
  fireEvent.click(ui.getByLabelText("Under maintenance"));
  fireEvent.submit(ui.getByRole("form", { name: "Car editor" }));
  await wait(() => assert(ui.getByRole("heading", { name: "Add a car" })));
  await wait(() => assert(ui.getByText("Car updated.")));
  const covered = await checked(
    server
      .from("cars")
      .select("image_path,image_paths")
      .eq("id", testCar)
      .single(),
  );
  assert.equal(covered.image_path, gallery[1]);
  assert.equal(covered.image_paths.length, 2);
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() + 120);
  const start = dt.toISOString().slice(0, 10);
  dt.setUTCDate(dt.getUTCDate() + 7);
  const end = dt.toISOString().slice(0, 10);
  assert.equal(
    await checked(
      publicClient.rpc("check_availability", {
        p_car_id: testCar,
        p_start_date: start,
        p_end_date: end,
      }),
    ),
    false,
  );
  console.log("PASS car add/edit and maintenance affects public availability");
  await wait(() => assert(ui.getByRole("button", { name: "Edit " + carName })));
  fireEvent.click(ui.getByRole("button", { name: "Edit " + carName }));
  await wait(() => assert(ui.getByRole("heading", { name: "Edit car" })));
  fireEvent.click(ui.getByRole("button", { name: "Remove photo 2" }));
  fireEvent.click(ui.getByLabelText("Under maintenance"));
  fireEvent.submit(ui.getByRole("form", { name: "Car editor" }));
  await wait(() => assert(ui.getByRole("heading", { name: "Add a car" })));
  await wait(() => assert(ui.getByText("Car updated.")));
  const reducedGallery = await checked(
    server
      .from("cars")
      .select("image_path,image_paths")
      .eq("id", testCar)
      .single(),
  );
  assert.equal(reducedGallery.image_paths.length, 1);
  assert.equal(reducedGallery.image_path, gallery[1]);
  console.log(
    "PASS multi-photo upload, detail gallery, cover selection and photo removal",
  );
  secondCar = (
    await checked(
      server
        .from("cars")
        .insert({
          name: "Group Test " + suffix,
          plate_number: "GROUP-" + suffix,
          daily_rate: 1000,
        })
        .select("id")
        .single(),
    )
  ).id;
  const reservation = await checked(
    publicClient.rpc("submit_booking", {
      p_car_ids: [testCar, secondCar],
      p_start_date: start,
      p_end_date: end,
      p_full_name: "UI Test",
      p_email: email,
      p_phone: "09123456789",
      p_license_number: "UI-TEST",
    }),
  );
  bookingRef = reservation.group_ref;
  customerId = (
    await checked(
      server
        .from("bookings")
        .select("customer_id")
        .eq("group_ref", bookingRef)
        .limit(1)
        .single(),
    )
  ).customer_id;
  await wait(() => assert(ui.getByRole("button", { name: "Edit " + carName })));
  fireEvent.click(ui.getByRole("button", { name: "Edit " + carName }));
  await wait(() => assert(ui.getByRole("heading", { name: "Edit car" })));
  fireEvent.click(ui.getByLabelText("Under maintenance"));
  fireEvent.submit(ui.getByRole("form", { name: "Car editor" }));
  await wait(() =>
    assert(
      ui.getByText(
        "Check the car details. A car with pending or ongoing bookings cannot be placed under maintenance.",
      ),
    ),
  );
  fireEvent.click(ui.getByRole("button", { name: "Delete " + carName }));
  await wait(() => assert(ui.getByRole("button", { name: "Confirm delete" })));
  fireEvent.click(ui.getByRole("button", { name: "Confirm delete" }));
  await wait(() =>
    assert(
      ui.getByText(
        "This car has booking history and cannot be deleted. Keep its record and use maintenance when appropriate.",
      ),
    ),
  );
  console.log("PASS protected maintenance/deletion errors shown in admin UI");
  fireEvent.click(ui.getByRole("button", { name: "Bookings" }));
  await wait(() =>
    assert(ui.getByRole("heading", { name: "Booking management" })),
  );
  await wait(() => assert(ui.getByText("Reference: " + bookingRef)));
  const groupUI = () =>
    within(ui.getByRole("article", { name: "Booking group " + bookingRef }));
  assert(groupUI().getByText("Group total: ₱17,640.00"));
  fireEvent.click(groupUI().getByRole("button", { name: "Record payment" }));
  await wait(() => assert(ui.getByText("Record payment for all 2 cars?")));
  // Opening confirmation alone must not change the stored payment state.
  assert(
    (
      await checked(
        server
          .from("bookings")
          .select("payment_status")
          .eq("group_ref", bookingRef),
      )
    ).every((row) => row.payment_status === "unpaid"),
  );
  fireEvent.click(
    groupUI().getByRole("button", { name: "Confirm record payment" }),
  );
  await wait(() => assert(ui.getByText("Booking group updated.")));
  await wait(() =>
    assert(
      !groupUI().queryByRole("button", { name: "Record payment" }),
      "Payment controls still visible",
    ),
  );
  assert(
    (
      await checked(
        server
          .from("bookings")
          .select("payment_status,payment_method")
          .eq("group_ref", bookingRef),
      )
    ).every(
      (row) => row.payment_status === "paid" && row.payment_method === "cash",
    ),
  );
  fireEvent.click(groupUI().getByRole("button", { name: "Start rental" }));
  await wait(() =>
    assert(
      !groupUI().getByRole("button", { name: "Complete rental" }).disabled,
    ),
  );
  fireEvent.click(groupUI().getByRole("button", { name: "Complete rental" }));
  await wait(() =>
    assert(
      !groupUI().queryByRole("button", { name: "Complete rental" }),
      "Rental controls still visible",
    ),
  );
  assert(
    (
      await checked(
        server.from("bookings").select("status").eq("group_ref", bookingRef),
      )
    ).every((row) => row.status === "completed"),
  );
  assert.equal(
    await checked(
      publicClient.rpc("check_availability", {
        p_car_id: testCar,
        p_start_date: start,
        p_end_date: end,
      }),
    ),
    true,
  );
  console.log(
    "PASS multi-car grouping, payment confirmation and rental lifecycle in admin UI",
  );
  fireEvent.click(ui.getByRole("button", { name: "Cars" }));
  await wait(() =>
    assert(ui.getByRole("button", { name: "Delete " + carName })),
  );
  fireEvent.click(ui.getByRole("button", { name: "Delete " + carName }));
  await wait(() => assert(ui.getByRole("button", { name: "Confirm delete" })));
  await checked(server.from("bookings").delete().eq("group_ref", bookingRef));
  bookingRef = null;
  await checked(server.from("customers").delete().eq("id", customerId));
  customerId = null;
  fireEvent.click(ui.getByRole("button", { name: "Confirm delete" }));
  await wait(() => assert(ui.getByText("Car deleted.")));
  testCar = null;
  fireEvent.click(ui.getByRole("button", { name: "Sign out" }));
  await wait(() => assert(ui.getByRole("button", { name: "Sign in" })));
  console.log("PASS delete confirmation and logout");
  // Exercise the invitation-token setup flow without sending any email.
  const inviteEmail = `ridevia-setup-test-${suffix}@example.com`;
  const invite = await checked(
    server.auth.admin.generateLink({ type: "invite", email: inviteEmail }),
  );
  users.push(invite.user.id);
  await exec(
    cli,
    [
      "db",
      "query",
      "--linked",
      `insert into private.admins(user_id) values ('${invite.user.id}')`,
    ],
    { cwd: root },
  );
  const setup = open(
    "admin/setup?token=" + invite.properties.hashed_token + "&type=invite",
  );
  await setup.wait(() => assert(setup.ui.getByText("Choose your password.")));
  assert.equal(
    setup.verified(),
    1,
    "StrictMode repeated single-use verification",
  );
  assert.equal(setup.w.location.hash, "#admin");
  const newPassword = randomBytes(18).toString("base64url");
  fireEvent.change(setup.ui.getByLabelText("New password"), {
    target: { value: newPassword },
  });
  fireEvent.change(setup.ui.getByLabelText("Confirm password"), {
    target: { value: newPassword },
  });
  fireEvent.submit(setup.w.document.querySelector("form"));
  await setup.wait(() =>
    assert(setup.ui.getByRole("heading", { name: "Car management" })),
  );
  console.log("PASS one-time setup, URL token removal and password creation");
  const detail = open("cars/50000000-0000-0000-0000-000000000001");
  await detail.wait(() =>
    assert(detail.ui.getByRole("heading", { name: "Toyota Vios · Sample" })),
  );
  fireEvent.change(detail.ui.getByLabelText("Pickup date"), {
    target: { value: start },
  });
  fireEvent.change(detail.ui.getByLabelText("Return date"), {
    target: { value: end },
  });
  fireEvent.submit(detail.w.document.querySelector("form"));
  await detail.wait(() =>
    assert(detail.ui.getByText("Available for your dates")),
  );
  assert(detail.ui.getByText("₱9,450.00"));
  fireEvent.click(detail.ui.getByRole("link", { name: "Book this car" }));
  await detail.wait(() =>
    assert(detail.ui.getByRole("heading", { name: "Find your ride" })),
  );
  assert.equal(detail.ui.getByLabelText("Pickup date").value, start);
  assert.equal(detail.ui.getByLabelText("Return date").value, end);
  await detail.wait(() =>
    assert(detail.ui.getByLabelText("Select Toyota Vios · Sample").checked),
  );
  console.log("PASS detail quote and preselected booking navigation");
} finally {
  if (bookingRef) {
    if (!customerId) {
      const { data } = await server
        .from("bookings")
        .select("customer_id")
        .eq("group_ref", bookingRef)
        .limit(1)
        .maybeSingle();
      customerId = data?.customer_id;
    }
    await checked(server.from("bookings").delete().eq("group_ref", bookingRef));
  }
  if (customerId) await server.from("customers").delete().eq("id", customerId);
  if (testCar) await server.from("cars").delete().eq("id", testCar);
  if (secondCar)
    await checked(server.from("cars").delete().eq("id", secondCar));
  if (photoPaths.length)
    await checked(server.storage.from("car-photos").remove(photoPaths));
  for (const id of users) await checked(server.auth.admin.deleteUser(id));
  for (const dom of doms) dom.window.close();
}
