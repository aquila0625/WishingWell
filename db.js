const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const SEED_DIR = path.join(__dirname, 'db');
const SEED_TABLES = ['churches', 'users', 'wishes', 'comments', 'notifications', 'settings', 'email_logs'];
const SQLITE_FILENAME = 'churchos.sqlite';

function assertKnownTable(table) {
  if (!SEED_TABLES.includes(table)) {
    throw new Error(`Unknown database table "${table}"`);
  }
}

function createSupabaseDatabase({ url, serviceRoleKey, fetchImpl = fetch } = {}) {
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase database requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  const baseUrl = String(url).replace(/\/$/, '');

  function endpoint(table, params = new URLSearchParams()) {
    assertKnownTable(table);
    const query = params.toString();
    return `${baseUrl}/rest/v1/${table}${query ? `?${query}` : ''}`;
  }

  function headers(extra = {}) {
    return {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...extra
    };
  }

  async function request(table, params, options = {}) {
    const response = await fetchImpl(endpoint(table, params), {
      ...options,
      headers: headers(options.headers)
    });
    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(`Supabase request failed (${response.status}): ${message}`);
    }
    return response.json();
  }

  async function read(table) {
    const params = new URLSearchParams({ select: 'id,data', order: 'id.asc' });
    const rows = await request(table, params);
    return rows.map((row) => row.data);
  }

  async function findById(table, id) {
    const params = new URLSearchParams({ select: 'id,data', id: `eq.${Number(id)}`, limit: '1' });
    const rows = await request(table, params);
    return rows[0]?.data || null;
  }

  async function nextId(table) {
    const rows = await read(table);
    return rows.length > 0 ? Math.max(...rows.map((row) => Number(row.id) || 0)) + 1 : 1;
  }

  async function insert(table, row) {
    const nextRow = { id: await nextId(table), ...row, created_at: row.created_at || Date.now() };
    const rows = await request(table, new URLSearchParams(), {
      method: 'POST',
      body: JSON.stringify({
        id: nextRow.id,
        created_at: nextRow.created_at,
        data: nextRow
      })
    });
    return rows[0]?.data || nextRow;
  }

  async function update(table, id, updates) {
    const existing = await findById(table, id);
    if (!existing) return null;
    const nextRow = { ...existing, ...updates };
    const params = new URLSearchParams({ id: `eq.${Number(id)}` });
    const rows = await request(table, params, {
      method: 'PATCH',
      body: JSON.stringify({
        created_at: Number(nextRow.created_at || Date.now()),
        data: nextRow
      })
    });
    return rows[0]?.data || nextRow;
  }

  async function remove(table, id) {
    await request(table, new URLSearchParams({ id: `eq.${Number(id)}` }), { method: 'DELETE' });
    return true;
  }

  async function write(table, rows) {
    assertKnownTable(table);
    await request(table, new URLSearchParams({ id: 'not.is.null' }), { method: 'DELETE' });
    if (!rows.length) return rows;
    await request(table, new URLSearchParams(), {
      method: 'POST',
      body: JSON.stringify(rows.map((row, index) => {
        const id = Number(row.id) || index + 1;
        const createdAt = Number(row.created_at || Date.now());
        return {
          id,
          created_at: createdAt,
          data: { ...row, id, created_at: createdAt }
        };
      }))
    });
    return rows;
  }

  async function seed() {
    for (const table of SEED_TABLES) {
      if ((await read(table)).length > 0) continue;
      const source = path.join(SEED_DIR, `${table}.json`);
      if (fs.existsSync(source)) {
        await write(table, JSON.parse(fs.readFileSync(source, 'utf8') || '[]'));
      } else if (table === 'settings') {
        await write(table, [{ id: 1, enabled: false, deadline: null, created_at: Date.now() }]);
      }
    }
  }

  return { read, write, findById, insert, update, remove, seed };
}

function createDatabase({ dir = SEED_DIR, filePath = path.join(dir, SQLITE_FILENAME) } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const sqlite = new DatabaseSync(filePath);

  function run(sql, params = []) {
    return sqlite.prepare(sql).run(...params);
  }

  function all(sql, params = []) {
    return sqlite.prepare(sql).all(...params);
  }

  function get(sql, params = []) {
    return sqlite.prepare(sql).get(...params);
  }

  function ensureTable(table) {
    assertKnownTable(table);
    run(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id INTEGER PRIMARY KEY,
        created_at INTEGER NOT NULL,
        data TEXT NOT NULL
      )
    `);
  }

  function encode(row) {
    const createdAt = Number(row.created_at || Date.now());
    return {
      id: Number(row.id),
      created_at: createdAt,
      data: JSON.stringify({ ...row, id: Number(row.id), created_at: createdAt })
    };
  }

  function decode(row) {
    if (!row) return null;
    return JSON.parse(row.data);
  }

  function read(table) {
    ensureTable(table);
    return all(`SELECT data FROM ${table} ORDER BY id ASC`).map(decode);
  }

  function write(table, rows) {
    ensureTable(table);
    sqlite.exec('BEGIN');
    try {
      run(`DELETE FROM ${table}`);
      for (const row of rows) {
        const encoded = encode(row);
        run(
          `INSERT INTO ${table} (id, created_at, data) VALUES (?, ?, ?)`,
          [encoded.id, encoded.created_at, encoded.data]
        );
      }
      sqlite.exec('COMMIT');
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
    return rows;
  }

  function findById(table, id) {
    ensureTable(table);
    return decode(get(`SELECT data FROM ${table} WHERE id = ?`, [Number(id)]));
  }

  function nextId(table) {
    ensureTable(table);
    const row = get(`SELECT MAX(id) AS id FROM ${table}`);
    return Number(row?.id || 0) + 1;
  }

  function insert(table, row) {
    ensureTable(table);
    const nextRow = { id: nextId(table), ...row, created_at: row.created_at || Date.now() };
    const encoded = encode(nextRow);
    run(
      `INSERT INTO ${table} (id, created_at, data) VALUES (?, ?, ?)`,
      [encoded.id, encoded.created_at, encoded.data]
    );
    return nextRow;
  }

  function update(table, id, updates) {
    const existing = findById(table, id);
    if (!existing) return null;
    const nextRow = { ...existing, ...updates };
    const encoded = encode(nextRow);
    run(
      `UPDATE ${table} SET created_at = ?, data = ? WHERE id = ?`,
      [encoded.created_at, encoded.data, Number(id)]
    );
    return nextRow;
  }

  function remove(table, id) {
    ensureTable(table);
    const result = run(`DELETE FROM ${table} WHERE id = ?`, [Number(id)]);
    return result.changes > 0;
  }

  function seed() {
    for (const table of SEED_TABLES) {
      ensureTable(table);
      if (read(table).length > 0) continue;

      const source = path.join(SEED_DIR, `${table}.json`);
      if (fs.existsSync(source)) {
        write(table, JSON.parse(fs.readFileSync(source, 'utf8') || '[]'));
      } else if (table === 'settings') {
        write(table, [{ id: 1, enabled: false, deadline: null }]);
      } else {
        write(table, []);
      }
    }
  }

  function close() {
    sqlite.close();
  }

  for (const table of SEED_TABLES) ensureTable(table);

  return { dir, filePath, read, write, findById, insert, update, remove, seed, close };
}

function createConfiguredDatabase(options = {}) {
  if (options.provider === 'supabase') {
    return createSupabaseDatabase({
      url: options.supabaseUrl,
      serviceRoleKey: options.supabaseServiceRoleKey,
      fetchImpl: options.fetchImpl
    });
  }
  return createDatabase(options);
}

const defaultDatabase = createDatabase();

module.exports = Object.assign(defaultDatabase, { createDatabase: createConfiguredDatabase, createSqliteDatabase: createDatabase, createSupabaseDatabase });
