# SQLite Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace JSON-file persistence with a SQLite-backed service layer while preserving the current API and frontend behavior.

**Architecture:** Keep the existing route surface intact and swap the database helper underneath it. Seed the SQLite file from the existing JSON fixtures, store rows as JSON payloads, and preserve the current admin and auth flows with minimal route changes.

**Tech Stack:** Node.js 24+, built-in `node:sqlite`, Express, native `node:test`, Supertest.

## Global Constraints

- Use the built-in `node:sqlite` module.
- Require Node.js 24 or newer in development and production.
- Preserve existing API routes and response shapes where practical.
- Keep the default admin account and seed data.
- Passwords should be hashed for new registrations; legacy seeded passwords may be upgraded on login.

---

### Task 1: Database Core

**Files:**
- Modify: `db.js`
- Create: `test/db.test.js`

**Interfaces:**
- Produces: SQLite-backed `createDatabase({ dir })` with the same methods as today.

- [ ] **Step 1: Write the failing database tests**

Add tests for seed import, persistence across database instances, and insert/update/remove using the existing helper API.

- [ ] **Step 2: Run the database tests and verify RED**

Run: `npm test -- test/db.test.js`
Expected: FAIL because SQLite-backed storage is not implemented.

- [ ] **Step 3: Implement the SQLite helper**

Replace JSON file reads and writes with SQLite tables and JSON payload storage.

- [ ] **Step 4: Run the database tests and verify GREEN**

Run: `npm test -- test/db.test.js`
Expected: PASS.

### Task 2: Auth Upgrade

**Files:**
- Modify: `routes/auth.js`
- Modify: `lib/http.js`
- Test: `test/auth-api.test.js`

**Interfaces:**
- Consumes: SQLite-backed database helper from Task 1.
- Produces: login-compatible password hashing and the existing auth API shape.

- [ ] **Step 1: Extend auth tests**

Add a test proving a newly registered password is stored hashed and that a legacy plain-text seeded password still logs in and upgrades safely.

- [ ] **Step 2: Run auth tests and verify RED**

Run: `npm test -- test/auth-api.test.js`
Expected: FAIL before password hashing support exists.

- [ ] **Step 3: Implement auth changes**

Hash new registrations, compare hashes on login, and upgrade legacy plain-text passwords when a seeded account logs in.

- [ ] **Step 4: Run auth tests and verify GREEN**

Run: `npm test -- test/auth-api.test.js`
Expected: PASS.

### Task 3: Full Regression

**Files:**
- Modify: any files needed to resolve regressions from Tasks 1-2.

**Interfaces:**
- Consumes: updated database and auth layers.

- [ ] **Step 1: Run the full suite**

Run: `npm run check`
Expected: all tests pass.

- [ ] **Step 2: Verify storage files**

Confirm the SQLite database file is created under `db/` during local startup and that the old JSON seed files still serve as import sources.
