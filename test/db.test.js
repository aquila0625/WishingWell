const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createTestDb } = require('./helpers/test-db');
const { createDatabase } = require('../db');

test('database seeds existing JSON fixtures into SQLite storage', (t) => {
  const temp = createTestDb();
  t.after(() => temp.cleanup());
  const database = createDatabase({ dir: temp.dir });

  database.seed();

  assert.equal(database.findById('users', 1).email, 'admin@churchos.net');
  assert.ok(database.read('churches').length > 0);
  assert.ok(fs.existsSync(path.join(temp.dir, 'churchos.sqlite')));
});

test('database persists inserts and updates across instances', (t) => {
  const temp = createTestDb();
  t.after(() => temp.cleanup());
  const first = createDatabase({ dir: temp.dir });
  first.seed();

  const inserted = first.insert('notifications', {
    user_id: 4,
    type: 'admin_update',
    message: '持久化测试',
    read: false
  });
  first.update('notifications', inserted.id, { read: true });

  const second = createDatabase({ dir: temp.dir });
  second.seed();

  const persisted = second.findById('notifications', inserted.id);
  assert.equal(persisted.message, '持久化测试');
  assert.equal(persisted.read, true);
});

test('database write and remove preserve existing helper behavior', (t) => {
  const temp = createTestDb();
  t.after(() => temp.cleanup());
  const database = createDatabase({ dir: temp.dir });
  database.seed();

  database.write('email_logs', [
    { id: 8, subject: 'A', created_at: 100 },
    { id: 9, subject: 'B', created_at: 200 }
  ]);

  assert.deepEqual(database.read('email_logs').map((row) => row.id), [8, 9]);
  assert.equal(database.remove('email_logs', 8), true);
  assert.equal(database.remove('email_logs', 999), false);
  assert.deepEqual(database.read('email_logs').map((row) => row.id), [9]);
});
