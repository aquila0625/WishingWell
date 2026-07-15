const test = require('node:test');
const assert = require('node:assert/strict');

test('application module exports createApp', () => {
  const application = require('../app');

  assert.equal(typeof application.createApp, 'function');
});
