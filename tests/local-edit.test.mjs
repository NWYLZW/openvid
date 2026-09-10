import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLocalEdit } from '../lib/local-edit.ts';
const fixture = () => JSON.parse(readFileSync(new URL('../recipes/chrome-google-search/edit.json', import.meta.url), 'utf8'));
test('accepts the real video recipe within its media duration', () => {
  const parsed = parseLocalEdit(fixture(), 29.233333);
  assert.equal(parsed.speed, 1.1);
  assert.ok(parsed.zooms.some(z => z.tiltX !== 0));
});
test('rejects ranges beyond the source before applying edits', () => {
  assert.throws(() => parseLocalEdit(fixture(), 10), /Invalid end/);
});
test('rejects invalid numeric values and overlapping zooms', () => {
  const edit = fixture(); edit.speed = NaN;
  assert.throws(() => parseLocalEdit(edit, 30), /speed/);
  edit.speed = 1; edit.zooms[1].start = 0;
  assert.throws(() => parseLocalEdit(edit, 30), /non-overlapping/);
});
test('unknown operations are not silently ignored', () => {
  assert.throws(() => parseLocalEdit({ ...fixture(), deleteProject: true }, 30), /Unknown edit field/);
});

test('accepts catalog wallpaper names and rejects invalid paths', () => {
  const edit = fixture(); edit.background = {wallpaper: 'desktop-01'};
  assert.equal(parseLocalEdit(edit, 30).background.wallpaper, 'desktop-01');
  edit.background = {wallpaper: '../desktop-01.jpg'};
  assert.throws(() => parseLocalEdit(edit, 30), /wallpaper/);
});
