const { createApp } = require('../../app');
const { createTestDb } = require('./test-db');
const { createSessionToken } = require('../../lib/session-tokens');

function authHeader(userId) {
  return `Bearer ${createSessionToken(userId)}`;
}

function createApiContext(t) {
  const temp = createTestDb();
  t.after(() => temp.cleanup());

  return {
    app: createApp({ dbDir: temp.dir }),
    dir: temp.dir
  };
}

module.exports = { createApiContext };
module.exports = { createApiContext, authHeader };
