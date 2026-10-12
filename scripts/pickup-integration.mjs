// Offline component test: stub Calendly rather than opening a browser or scheduling an appointment.
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { within, fireEvent, waitFor } from '@testing-library/dom';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const reservation = { start: '2026-11-10', guestName: 'Demo Guest', guestEmail: 'demo@example.com', group_ref: 'demo-group' };
const bundle = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import PickupScheduler from './src/components/PickupScheduler.jsx'; createRoot(document.getElementById('root')).render(<React.StrictMode><PickupScheduler reservation={${JSON.stringify(reservation)}} /></React.StrictMode>);`, resolveDir: root, loader: 'jsx' },
  bundle: true, write: false, format: 'iife', jsx: 'automatic',
});
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', runScripts: 'dangerously' });
const calls = [];
dom.window.Calendly = { initInlineWidget(options) { calls.push(options); options.parentElement.appendChild(dom.window.document.createElement('iframe')); } };
try {
  dom.window.eval(bundle.outputFiles[0].text);
  const ui = within(dom.window.document.body);
  const wait = fn => waitFor(fn, { container: dom.window.document.body });
  await wait(() => assert(ui.getByRole('button', {name:'Choose pickup time'})));
  assert.equal(calls.length, 0, 'Scheduler loaded before guest requested it');
  fireEvent.click(ui.getByRole('button', {name:'Choose pickup time'}));
  await wait(() => assert.equal(calls.length, 1));
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].prefill)), { name: reservation.guestName, email: reservation.guestEmail });
  assert.equal(calls[0].utm.utmContent, reservation.group_ref);
  const fallback = new URL(ui.getByRole('link', {name:'Open pickup scheduling in a new tab'}).href);
  assert.equal(fallback.searchParams.get('date'), reservation.start);
  assert(dom.window.document.querySelector('.pickup-widget iframe'));
  console.log('PASS lazy pickup embed, prefill/reference, fallback date and StrictMode initialization');
} finally { dom.window.close(); }
