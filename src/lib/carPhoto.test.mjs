import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePhoto } from './carPhoto.js';
test('photo validation permits supported raster files up to 5 MB', () => {
  for (const type of ['image/jpeg','image/png','image/webp']) assert.equal(validatePhoto({type,size:5242880}), '');
  for (const file of [null,{type:'image/svg+xml',size:100},{type:'text/html',size:100},{type:'image/png',size:0},{type:'image/png',size:5242881}]) assert(validatePhoto(file));
});
