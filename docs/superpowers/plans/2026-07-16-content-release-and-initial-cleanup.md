# Content Release and Initial Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe homepage content draft/preview/publish flow and a one-time pre-launch cleanup for test data.

**Architecture:** Store homepage content as `homepageDraft` and `homepagePublished` inside the existing single `settings` row. Public campaign reads only `homepagePublished`; admin reads and edits draft, can preview draft, and can publish draft to production. A one-time admin endpoint clears test business data and ordinary users, then stores `initial_cleanup_done: true` so it cannot run again.

**Tech Stack:** Node.js, Express, existing JSON-in-SQLite/Supabase database adapter, vanilla JS admin UI, Node test runner + Supertest.

## Global Constraints

- Keep the current production service and Supabase deployment model.
- Do not require a second cloud service for this phase.
- Clearing test data is only allowed once before first official launch.
- Clearing test data must keep admin accounts, homepage content, campaign settings, church seed data, and system configuration.
- Commit and push messages must be bilingual Chinese + English.

---

### Task 1: Server Draft / Publish API

**Files:**
- Modify: `routes/admin.js`
- Modify: `test/admin-api.test.js`

**Interfaces:**
- Produces `GET /api/admin/homepage` returning `{ homepage, draft, published, has_unpublished_changes, published_at }`.
- Produces `PATCH /api/admin/homepage` saving draft only.
- Produces `POST /api/admin/homepage/publish` copying draft to published content.
- Public `GET /api/campaign` continues using published homepage content.

Steps:
- [ ] Add failing API tests proving draft saves do not update public campaign homepage.
- [ ] Add failing API tests proving publishing copies draft to public campaign homepage.
- [ ] Implement settings helpers in `routes/admin.js`.
- [ ] Run targeted admin tests and confirm green.

### Task 2: One-Time Initial Cleanup API

**Files:**
- Modify: `routes/admin.js`
- Modify: `test/admin-api.test.js`

**Interfaces:**
- Produces `GET /api/admin/launch-cleanup` returning counts and `initial_cleanup_done`.
- Produces `POST /api/admin/launch-cleanup` requiring `{ confirm: "确认首次上线清空" }`.

Steps:
- [ ] Add failing API tests proving cleanup removes ordinary users, wishes, comments, notifications, and email logs.
- [ ] Add failing API tests proving admins, churches, settings, and cleanup lock are preserved.
- [ ] Add failing API test proving cleanup cannot run twice.
- [ ] Implement cleanup endpoint in `routes/admin.js`.
- [ ] Run targeted admin tests and confirm green.

### Task 3: Admin UI for Draft / Publish / Cleanup

**Files:**
- Modify: `public/js/admin.mjs`
- Modify: `test/final-polish.test.mjs` or `test/auth-ui.test.mjs`

**Interfaces:**
- Admin homepage panel exposes Save Draft, Preview Draft, and Publish to Official Homepage.
- Admin homepage panel exposes a one-time pre-launch cleanup section only when cleanup has not been done.

Steps:
- [ ] Add UI text tests for Save Draft, Preview Draft, Publish, and one-time cleanup confirmation copy.
- [ ] Update `loadHomepage()` to use draft/published response.
- [ ] Add publish and preview buttons.
- [ ] Add cleanup status UI and confirmation prompt.
- [ ] Run UI and admin tests.

### Task 4: Full Verification and Deployment

**Files:**
- Verify all changed files.

Steps:
- [ ] Run `npm run check`.
- [ ] Run `git diff --check`.
- [ ] Commit with bilingual message.
- [ ] Push `codex/churchos-h5`.
