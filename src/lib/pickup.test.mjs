import test from 'node:test';
import assert from 'node:assert/strict';
import { pickupLink } from './pickup.js';
test('pickup link preserves encoded guest details, rental date and group reference', () => {
  const url = new URL(pickupLink({ guestName: 'Bernard & Guest', guestEmail: 'guest+ride@example.com', start: '2026-11-10', group_ref: 'test-group', license: 'NEVER-SHARE' }));
  assert.equal(url.origin, 'https://calendly.com');
  assert.equal(url.searchParams.get('name'), 'Bernard & Guest');
  assert.equal(url.searchParams.get('email'), 'guest+ride@example.com');
  assert.equal(url.searchParams.get('date'), '2026-11-10');
  assert.equal(url.searchParams.get('utm_content'), 'test-group');
  assert(!url.href.includes('NEVER-SHARE'));
});
