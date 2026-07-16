import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { formatRemainingTime } from '../public/js/landing.mjs';

test('countdown formats complete day-hour-minute-second values', () => {
  assert.equal(
    formatRemainingTime('2026-07-17T00:00:00Z', Date.parse('2026-07-15T22:58:59Z')),
    '01天 01时 01分 01秒'
  );
});

test('quick drawer stays open until the user clicks its handle', () => {
  const source = fs.readFileSync(new URL('../public/js/landing.mjs', import.meta.url), 'utf8');

  assert.match(source, /let expanded = true/);
  assert.match(source, /handle\.addEventListener\('click'/);
  assert.doesNotMatch(source, /addEventListener\('scroll'/);
});

test('visual tokens preserve the approved navy and cyan reference palette', () => {
  const css = fs.readFileSync(new URL('../public/styles/tokens.css', import.meta.url), 'utf8');
  assert.match(css, /--color-bg:\s*#0b1120/i);
  assert.match(css, /--color-primary:\s*#22d3ee/i);
  assert.match(css, /--radius-card:\s*8px/i);
});

test('section eyebrow labels use a stronger readable size', () => {
  const css = fs.readFileSync(new URL('../public/styles/components.css', import.meta.url), 'utf8');

  assert.match(css, /\.eyebrow \{[^}]*font-size:\s*1rem/s);
});
