import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { formatRemainingTime, shouldCollapseDrawer } from '../public/js/landing.mjs';

test('countdown formats complete day-hour-minute-second values', () => {
  assert.equal(
    formatRemainingTime('2026-07-17T00:00:00Z', Date.parse('2026-07-15T22:58:59Z')),
    '01天 01时 01分 01秒'
  );
});

test('first scroll collapses an expanded drawer', () => {
  assert.equal(shouldCollapseDrawer({ expanded: true, userToggled: false }), true);
  assert.equal(shouldCollapseDrawer({ expanded: true, userToggled: true }), false);
});

test('visual tokens preserve the approved navy and cyan reference palette', () => {
  const css = fs.readFileSync(new URL('../public/styles/tokens.css', import.meta.url), 'utf8');
  assert.match(css, /--color-bg:\s*#0b1120/i);
  assert.match(css, /--color-primary:\s*#22d3ee/i);
  assert.match(css, /--radius-card:\s*8px/i);
});
