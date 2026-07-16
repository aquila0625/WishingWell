# Staging Production Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe staging environment that uses `staging_` Supabase tables while production keeps using the existing tables.

**Architecture:** Keep all business routes using logical table names such as `users`, `wishes`, and `settings`. Add one table prefix setting in configuration, then let the Supabase database adapter map logical names to physical Supabase table names. Document and test the `staging_` schema so Render can deploy one preview service and one production service from the same codebase.

**Tech Stack:** Node.js 24, Express, Supabase PostgREST, Render Web Services, Node test runner.

## Global Constraints

- Do not create a second Supabase project.
- Production tables remain unchanged and unprefixed.
- Staging tables use the exact prefix `staging_`.
- Test service must use `CHURCHOS_TABLE_PREFIX=staging_`.
- Production service must leave `CHURCHOS_TABLE_PREFIX` empty or unset.
- All application code must continue using logical table names; physical table mapping belongs in `db.js`.
- Commit messages must be bilingual Chinese + English.

---

## File Structure

- Modify `lib/config.js`
  - Add `tablePrefix` from `CHURCHOS_TABLE_PREFIX`.
  - Keep default empty for production and local SQLite.

- Modify `db.js`
  - Pass `tablePrefix` into `createSupabaseDatabase`.
  - Map logical table names to physical names only after `assertKnownTable(table)` succeeds.
  - Keep SQLite table names unchanged.

- Modify `docs/supabase-schema.sql`
  - Add `create table if not exists staging_*` statements.
  - Add indexes for both production and staging tables.

- Modify `render.yaml`
  - Add `CHURCHOS_TABLE_PREFIX` to the production service with an empty value.
  - Add a second web service for staging, using `CHURCHOS_TABLE_PREFIX=staging_`.
  - Keep secrets marked `sync: false`.

- Modify `test/config.test.js`
  - Verify config resolves `CHURCHOS_TABLE_PREFIX`.

- Modify `test/supabase-db.test.js`
  - Verify Supabase requests use `staging_wishes` when a prefix is configured.
  - Verify unknown logical tables are still rejected before prefix mapping.

---

### Task 1: Configuration Supports Table Prefix

**Files:**
- Modify: `lib/config.js`
- Modify: `test/config.test.js`

**Interfaces:**
- Consumes: environment variable `CHURCHOS_TABLE_PREFIX`
- Produces: `resolveConfig(env).tablePrefix: string`

- [ ] **Step 1: Write the failing config test**

Add this test to `test/config.test.js`:

```js
test('resolveConfig exposes an optional database table prefix', () => {
  const config = resolveConfig({
    CHURCHOS_TABLE_PREFIX: 'staging_'
  });

  assert.equal(config.tablePrefix, 'staging_');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- test/config.test.js
```

Expected: FAIL because `config.tablePrefix` is currently `undefined`.

- [ ] **Step 3: Add config parsing**

In `lib/config.js`, add this field inside the `config` object returned by `resolveConfig`:

```js
tablePrefix: String(env.CHURCHOS_TABLE_PREFIX || '').trim(),
```

Place it near `databaseProvider` and Supabase config so deployment settings stay grouped.

- [ ] **Step 4: Run config test to verify it passes**

Run:

```bash
npm test -- test/config.test.js
```

Expected: PASS.

---

### Task 2: Supabase Adapter Maps Logical Tables to Prefixed Physical Tables

**Files:**
- Modify: `db.js`
- Modify: `test/supabase-db.test.js`

**Interfaces:**
- Consumes: `createSupabaseDatabase({ url, serviceRoleKey, fetchImpl, tablePrefix })`
- Produces: Supabase endpoint paths such as `/rest/v1/staging_wishes`
- Produces: `createDatabase({ provider: 'supabase', tablePrefix })`

- [ ] **Step 1: Write the failing Supabase prefix test**

Add this test to `test/supabase-db.test.js`:

```js
test('Supabase database adapter applies a configured table prefix', async () => {
  const calls = [];
  const database = createSupabaseDatabase({
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-role',
    tablePrefix: 'staging_',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return responseJson([]);
    }
  });

  await database.read('wishes');

  assert.match(calls[0].url, /\/rest\/v1\/staging_wishes\?select=id%2Cdata&order=id\.asc$/);
});
```

- [ ] **Step 2: Run Supabase adapter test to verify it fails**

Run:

```bash
npm test -- test/supabase-db.test.js
```

Expected: FAIL because the adapter still calls `/rest/v1/wishes`.

- [ ] **Step 3: Implement physical table mapping**

In `db.js`, change the Supabase factory signature:

```js
function createSupabaseDatabase({ url, serviceRoleKey, fetchImpl = fetch, tablePrefix = '' } = {}) {
```

Add this helper inside `createSupabaseDatabase`, after `baseUrl`:

```js
  const prefix = String(tablePrefix || '').trim();

  function physicalTable(table) {
    assertKnownTable(table);
    return `${prefix}${table}`;
  }
```

Then update `endpoint(table, params)` to use the mapped table:

```js
  function endpoint(table, params = new URLSearchParams()) {
    const physical = physicalTable(table);
    const query = params.toString();
    return `${baseUrl}/rest/v1/${physical}${query ? `?${query}` : ''}`;
  }
```

Keep `write(table, rows)` using `assertKnownTable(table)` before any write; the `request()` calls will map to the physical table.

- [ ] **Step 4: Pass tablePrefix through configured database creation**

In `createConfiguredDatabase(options = {})`, pass `options.tablePrefix` into `createSupabaseDatabase`:

```js
return createSupabaseDatabase({
  url: options.supabaseUrl,
  serviceRoleKey: options.supabaseServiceRoleKey,
  fetchImpl: options.fetchImpl,
  tablePrefix: options.tablePrefix
});
```

- [ ] **Step 5: Run Supabase tests**

Run:

```bash
npm test -- test/supabase-db.test.js
```

Expected: PASS.

---

### Task 3: App Startup Passes Prefix into Database

**Files:**
- Modify: `app.js`
- Test: `test/app.test.js`

**Interfaces:**
- Consumes: `config.tablePrefix`
- Produces: `db.createDatabase({ provider: 'supabase', tablePrefix })`

- [ ] **Step 1: Inspect current app database initialization**

Open `app.js` and locate the call to `databaseModule.createDatabase`.

Expected existing behavior: app startup passes database provider and Supabase credentials into the database layer.

- [ ] **Step 2: Write or update an app test if tablePrefix is not covered**

If `test/app.test.js` already verifies Supabase startup with custom config, extend it to pass:

```js
tablePrefix: 'staging_'
```

and assert the fake database factory receives:

```js
assert.equal(receivedOptions.tablePrefix, 'staging_');
```

If no such captured options exist, add the smallest capture inside the existing test rather than creating a broad new test.

- [ ] **Step 3: Run the app test to verify it fails if prefix is not passed**

Run:

```bash
npm test -- test/app.test.js
```

Expected: FAIL if `tablePrefix` is not passed into the database layer.

- [ ] **Step 4: Pass tablePrefix from app config**

In `app.js`, update the database creation options to include:

```js
tablePrefix: config.tablePrefix,
```

- [ ] **Step 5: Run the app test**

Run:

```bash
npm test -- test/app.test.js
```

Expected: PASS. If sandbox blocks local port listening with `EPERM`, rerun with escalated test permission.

---

### Task 4: Supabase Schema Includes Staging Tables

**Files:**
- Modify: `docs/supabase-schema.sql`
- Test: `test/config.test.js` or `test/final-polish.test.mjs`

**Interfaces:**
- Produces: SQL that creates `staging_churches`, `staging_users`, `staging_wishes`, `staging_comments`, `staging_notifications`, `staging_settings`, and `staging_email_logs`.

- [ ] **Step 1: Write a schema coverage test**

Add this test to `test/config.test.js`:

```js
test('Supabase schema documents staging tables', () => {
  const schema = fs.readFileSync(new URL('../docs/supabase-schema.sql', import.meta.url), 'utf8');
  for (const table of ['churches', 'users', 'wishes', 'comments', 'notifications', 'settings', 'email_logs']) {
    assert.match(schema, new RegExp(`create table if not exists staging_${table}\\\\b`));
  }
  assert.match(schema, /staging_wishes_created_at_idx/);
  assert.match(schema, /staging_users_email_idx/);
  assert.match(schema, /staging_notifications_user_id_idx/);
});
```

If `test/config.test.js` is CommonJS, use:

```js
const schema = fs.readFileSync(path.join(__dirname, '..', 'docs', 'supabase-schema.sql'), 'utf8');
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run:

```bash
npm test -- test/config.test.js
```

Expected: FAIL because staging tables are not yet documented.

- [ ] **Step 3: Add staging table SQL**

Append to `docs/supabase-schema.sql`:

```sql
create table if not exists staging_churches (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists staging_users (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists staging_wishes (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists staging_comments (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists staging_notifications (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists staging_settings (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists staging_email_logs (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create index if not exists staging_wishes_created_at_idx on staging_wishes (created_at desc);
create index if not exists staging_users_email_idx on staging_users ((lower(data->>'email')));
create index if not exists staging_notifications_user_id_idx on staging_notifications (((data->>'user_id')::bigint));
```

- [ ] **Step 4: Run schema/config tests**

Run:

```bash
npm test -- test/config.test.js
```

Expected: PASS.

---

### Task 5: Render Blueprint Documents Production and Staging Services

**Files:**
- Modify: `render.yaml`
- Test: `test/config.test.js`

**Interfaces:**
- Produces: production service `churchosapp` with empty `CHURCHOS_TABLE_PREFIX`
- Produces: staging service `churchosapp-staging` with `CHURCHOS_TABLE_PREFIX=staging_`

- [ ] **Step 1: Write a Render blueprint test**

Add this test to `test/config.test.js`:

```js
test('Render blueprint defines isolated production and staging table prefixes', () => {
  const blueprint = fs.readFileSync(path.join(__dirname, '..', 'render.yaml'), 'utf8');

  assert.match(blueprint, /name:\s*churchosapp\b/);
  assert.match(blueprint, /name:\s*churchosapp-staging\b/);
  assert.match(blueprint, /key:\s*CHURCHOS_TABLE_PREFIX\s*\n\s*value:\s*staging_/);
  assert.match(blueprint, /key:\s*SUPABASE_SERVICE_ROLE_KEY\s*\n\s*sync:\s*false/);
});
```

- [ ] **Step 2: Run the blueprint test to verify it fails**

Run:

```bash
npm test -- test/config.test.js
```

Expected: FAIL because staging service is not yet documented.

- [ ] **Step 3: Update production service env vars**

In `render.yaml`, add this env var to the existing `churchosapp` service:

```yaml
      - key: CHURCHOS_TABLE_PREFIX
        value: ""
```

- [ ] **Step 4: Add staging service**

Append a second service in `render.yaml`:

```yaml
  - type: web
    name: churchosapp-staging
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: NODE_VERSION
        value: 24
      - key: CHURCHOS_DB_PROVIDER
        value: supabase
      - key: CHURCHOS_TABLE_PREFIX
        value: staging_
      - key: CHURCHOS_PUBLIC_URL
        value: https://churchosapp-staging.onrender.com
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: CHURCHOS_SESSION_SECRET
        sync: false
      - key: CHURCHOS_ADMIN_EMAIL
        sync: false
      - key: CHURCHOS_ADMIN_PASSWORD
        sync: false
      - key: CHURCHOS_ADMIN_NAME
        sync: false
```

- [ ] **Step 5: Run blueprint/config tests**

Run:

```bash
npm test -- test/config.test.js
```

Expected: PASS.

---

### Task 6: Full Verification and Commit

**Files:**
- Verify all changed files.

**Interfaces:**
- Produces: tested commit ready to push.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npm test -- test/config.test.js test/supabase-db.test.js test/app.test.js
```

Expected: PASS. If sandbox blocks local server listening with `EPERM`, rerun with escalated permission.

- [ ] **Step 2: Run full check**

Run:

```bash
npm run check
```

Expected: PASS with all tests passing. If sandbox blocks local server listening with `EPERM`, rerun with escalated permission.

- [ ] **Step 3: Check diff quality**

Run:

```bash
git diff --check
git diff --stat
git status --short
```

Expected:

- `git diff --check` prints no whitespace errors.
- Changed files are limited to config, database adapter, Supabase schema, Render blueprint, tests, and this implementation plan.

- [ ] **Step 4: Commit with bilingual message**

Run:

```bash
git add db.js lib/config.js docs/supabase-schema.sql render.yaml test/config.test.js test/supabase-db.test.js test/app.test.js docs/superpowers/plans/2026-07-16-staging-production-release.md
git commit -m "Add staging table prefix support / 添加测试环境表前缀支持"
```

- [ ] **Step 5: Push branch**

Run:

```bash
git push origin codex/churchos-h5
```

Expected: push succeeds, and Render can deploy the updated branch.

---

## Self-Review

- Spec coverage:
  - Same Supabase project with `staging_` tables: covered by Tasks 2 and 4.
  - Render staging and production separation: covered by Task 5.
  - Business code uses logical table names: covered by Task 2.
  - Production stays unprefixed: covered by Tasks 1, 2, and 5.
  - Testing requirements: covered by Tasks 1 through 6.

- Placeholder scan:
  - The plan contains no unresolved placeholder markers or vague implementation steps.

- Type consistency:
  - `tablePrefix` is the single config property.
  - `CHURCHOS_TABLE_PREFIX` is the single environment variable.
  - `createSupabaseDatabase({ tablePrefix })` is the database adapter interface.
