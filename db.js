const fs = require('node:fs');
const path = require('node:path');

const SEED_DIR = path.join(__dirname, 'db');
const SEED_TABLES = ['churches', 'users', 'wishes', 'comments', 'notifications', 'settings'];

function createDatabase({ dir = SEED_DIR } = {}) {
  fs.mkdirSync(dir, { recursive: true });

  function getFilePath(table) {
    return path.join(dir, `${table}.json`);
  }

  function read(table) {
    const filePath = getFilePath(table);
    if (!fs.existsSync(filePath)) return [];

    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
    } catch (error) {
      console.error(`Error reading database table "${table}":`, error);
      return [];
    }
  }

  function write(table, rows) {
    fs.writeFileSync(getFilePath(table), JSON.stringify(rows, null, 2), 'utf8');
    return rows;
  }

  function findById(table, id) {
    return read(table).find((item) => item.id === Number(id));
  }

  function insert(table, row) {
    const rows = read(table);
    const nextId = rows.length > 0
      ? Math.max(...rows.map((item) => Number(item.id) || 0)) + 1
      : 1;
    const nextRow = { id: nextId, ...row, created_at: row.created_at || Date.now() };
    rows.push(nextRow);
    write(table, rows);
    return nextRow;
  }

  function update(table, id, updates) {
    const rows = read(table);
    const index = rows.findIndex((item) => item.id === Number(id));
    if (index === -1) return null;
    rows[index] = { ...rows[index], ...updates };
    write(table, rows);
    return rows[index];
  }

  function remove(table, id) {
    const rows = read(table);
    const nextRows = rows.filter((item) => item.id !== Number(id));
    write(table, nextRows);
    return nextRows.length !== rows.length;
  }

  function seed() {
    for (const table of SEED_TABLES) {
      const target = getFilePath(table);
      if (fs.existsSync(target) && read(table).length > 0) continue;

      const source = path.join(SEED_DIR, `${table}.json`);
      if (path.resolve(source) !== path.resolve(target) && fs.existsSync(source)) {
        write(table, JSON.parse(fs.readFileSync(source, 'utf8') || '[]'));
      } else if (!fs.existsSync(target)) {
        write(table, table === 'settings' ? [{ enabled: false, deadline: null }] : []);
      }
    }
  }

  return { dir, read, write, findById, insert, update, remove, seed };
}

const defaultDatabase = createDatabase();

module.exports = Object.assign(defaultDatabase, { createDatabase });
