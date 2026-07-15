const { createApp } = require('../../app');
const { createTestDb } = require('./test-db');

function createApiContext(t) {
  const temp = createTestDb();
  t.after(() => temp.cleanup());

  return {
    app: createApp({ dbDir: temp.dir }),
    dir: temp.dir
  };
}

module.exports = { createApiContext };
