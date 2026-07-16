# Admin Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the concise ChurchOS admin console approved in `docs/superpowers/specs/2026-07-15-admin-console-design.md`.

**Architecture:** Extend the existing Express JSON-file backend and replace the old prototype-heavy admin UI with four practical admin tabs. Keep data in the existing database helper and avoid adding external services.

**Tech Stack:** Node.js 18+, Express, native `node:test`, Supertest, browser-side ES modules, existing CSS.

## Global Constraints

- Keep phase one small: no public development updates module, no embedded AI API, no private admin notes, no user reports, no private submissions.
- New requirements publish immediately.
- Login is required for submitting, voting, and commenting.
- Authors can edit only while status is `voting`.
- Hidden records stay stored and recoverable.
- Export may include full user information, including email.
- Progress email supports simulation and history first; real provider wiring comes later.

---

### Task 1: Admin API

**Files:**
- Modify: `db.js`
- Modify: `routes/auth.js`
- Modify: `routes/admin.js`
- Test: `test/admin-api.test.js`

**Interfaces:**
- Produces: `GET /api/admin/wishes`, `PATCH /api/admin/wishes/:id`, `POST /api/admin/wishes/merge`, `POST /api/admin/wishes/export`, `GET /api/admin/users`, `PATCH /api/admin/users/:id`, `GET /api/admin/homepage`, `PATCH /api/admin/homepage`, `POST /api/admin/progress-emails/send`, `GET /api/admin/progress-emails/logs`.

- [ ] **Step 1: Add failing API tests**

Add tests proving admin can list/filter wishes, change status/reply with notification, hide/restore, merge, export selected wishes with author email, list/disable users, update homepage settings, simulate progress email, and read send history.

- [ ] **Step 2: Run API tests and verify RED**

Run: `npm test -- test/admin-api.test.js`
Expected: FAIL because the new admin endpoints are missing.

- [ ] **Step 3: Implement minimal backend**

Extend seed tables with `email_logs`. Add registration consent fields. Add admin helper serializers and endpoints in `routes/admin.js`. Preserve existing campaign, dispute, and legacy export endpoints when still used by tests.

- [ ] **Step 4: Run API tests and verify GREEN**

Run: `npm test -- test/admin-api.test.js`
Expected: PASS.

### Task 2: Admin UI

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/admin.mjs`
- Modify: `public/js/wishes.mjs`
- Modify: `public/styles/components.css`
- Modify: `public/styles/pages.css`
- Test: existing frontend tests

**Interfaces:**
- Consumes: admin endpoints from Task 1.
- Produces: practical admin tabs named `需求数据`, `用户管理`, `首页内容`, `进度邮件`.

- [ ] **Step 1: Add failing frontend checks**

Update existing frontend tests to expect the new admin tab names and user-facing status labels for all statuses.

- [ ] **Step 2: Run frontend tests and verify RED**

Run: `npm test -- test/wishes-ui.test.mjs test/final-polish.test.mjs`
Expected: FAIL on missing labels/tabs.

- [ ] **Step 3: Implement admin UI**

Replace old prototype-heavy admin rendering with searchable requirement management, user list, homepage settings form, progress email composer/history, and JSON export buttons.

- [ ] **Step 4: Run frontend tests and verify GREEN**

Run: `npm test -- test/wishes-ui.test.mjs test/final-polish.test.mjs`
Expected: PASS.

### Task 3: Full Verification

**Files:**
- No new files.

**Interfaces:**
- Consumes: all completed backend and frontend work.
- Produces: verified local implementation.

- [ ] **Step 1: Run full check**

Run: `npm run check`
Expected: all tests pass.

- [ ] **Step 2: Inspect git diff**

Run: `git diff --check`
Expected: no whitespace errors.
