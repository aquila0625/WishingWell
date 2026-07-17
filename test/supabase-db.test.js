const test = require('node:test');
const assert = require('node:assert/strict');
const { createSupabaseDatabase } = require('../db');

function createJsonResponse(payload, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    async json() {
      return payload;
    },
    async text() {
      return JSON.stringify(payload);
    }
  };
}

test('Supabase database adapter reads and writes rows through PostgREST', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (options.method === 'POST') return createJsonResponse([{ id: 3, data: { id: 3, title: '新需求' } }]);
    if (options.method === 'PATCH') return createJsonResponse([{ id: 3, data: { id: 3, title: '已更新' } }]);
    if (options.method === 'DELETE') return createJsonResponse([]);
    return createJsonResponse([
      { id: 1, data: { id: 1, title: 'A' } },
      { id: 2, data: { id: 2, title: 'B' } }
    ]);
  };
  const database = createSupabaseDatabase({
    url: 'https://churchos.supabase.co',
    serviceRoleKey: 'service-key',
    fetchImpl
  });

  assert.deepEqual(await database.read('wishes'), [{ id: 1, title: 'A' }, { id: 2, title: 'B' }]);
  assert.deepEqual(await database.insert('wishes', { title: '新需求' }), { id: 3, title: '新需求' });
  assert.deepEqual(await database.update('wishes', 3, { title: '已更新' }), { id: 3, title: '已更新' });
  assert.equal(await database.remove('wishes', 3), true);

  assert.match(calls[0].url, /\/rest\/v1\/wishes\?select=id%2Cdata&order=id\.asc$/);
  assert.equal(calls[0].options.headers.apikey, 'service-key');
  assert.ok(calls.some((call) => call.options.method === 'POST'));
  assert.ok(calls.some((call) => call.options.method === 'PATCH'));
  assert.ok(calls.some((call) => call.options.method === 'DELETE'));
});

test('Supabase database adapter applies a configured table prefix', async () => {
  const calls = [];
  const database = createSupabaseDatabase({
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-role',
    tablePrefix: 'staging_',
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return createJsonResponse([]);
    }
  });

  await database.read('wishes');

  assert.match(calls[0].url, /\/rest\/v1\/staging_wishes\?select=id%2Cdata&order=id\.asc$/);
});

test('Supabase database adapter does not seed fixture data into prefixed tables', async () => {
  const calls = [];
  const database = createSupabaseDatabase({
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-role',
    tablePrefix: 'staging_',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (options.method === 'POST') return createJsonResponse([{ id: 1, data: { id: 1 } }]);
      return createJsonResponse([]);
    }
  });

  await database.seed();

  const postUrls = calls.filter((call) => call.options.method === 'POST').map((call) => call.url);
  assert.ok(postUrls.some((url) => url.includes('/rest/v1/staging_settings')));
  assert.ok(!postUrls.some((url) => url.includes('/rest/v1/staging_wishes')));
  assert.ok(!postUrls.some((url) => url.includes('/rest/v1/staging_users')));
});

test('Supabase database adapter does not reseed demo data after launch cleanup', async () => {
  const calls = [];
  const database = createSupabaseDatabase({
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-role',
    fetchImpl: async (url, options = {}) => {
      const textUrl = String(url);
      calls.push({ url: textUrl, options });
      if (options.method === 'POST') return createJsonResponse([{ id: 1, data: { id: 1 } }]);
      if (textUrl.includes('/rest/v1/settings')) {
        return createJsonResponse([
          { id: 1, data: { id: 1, initial_cleanup_done: true } }
        ]);
      }
      if (textUrl.includes('/rest/v1/users')) {
        return createJsonResponse([
          { id: 4, data: { id: 4, email: '254351776@qq.com', is_admin: true } }
        ]);
      }
      return createJsonResponse([]);
    }
  });

  await database.seed();

  const postUrls = calls.filter((call) => call.options.method === 'POST').map((call) => call.url);
  assert.ok(!postUrls.some((url) => url.includes('/rest/v1/wishes')));
  assert.ok(!postUrls.some((url) => url.includes('/rest/v1/comments')));
  assert.ok(!postUrls.some((url) => url.includes('/rest/v1/notifications')));
  assert.ok(!postUrls.some((url) => url.includes('/rest/v1/email_logs')));
});

test('Supabase database adapter rejects unknown tables', async () => {
  const database = createSupabaseDatabase({
    url: 'https://churchos.supabase.co',
    serviceRoleKey: 'service-key',
    fetchImpl: async () => createJsonResponse([])
  });

  await assert.rejects(() => database.read('bad_table'), /Unknown database table/);
});
