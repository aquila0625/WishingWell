const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function createTestDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'churchos-db-'));

  return {
    dir,
    cleanup() {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

module.exports = { createTestDb };
