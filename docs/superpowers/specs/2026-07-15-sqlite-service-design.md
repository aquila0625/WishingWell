# SQLite Service Design

## Goal

Upgrade the ChurchOS requirement collection site from JSON-file storage to a small deployable service backend backed by SQLite, while keeping the existing frontend and admin API behavior stable.

## Runtime

Use the built-in `node:sqlite` module. The service requires Node.js 24 or newer in development and production. No third-party SQLite package is added.

## Scope

This phase changes persistence only. It does not add a separate production hosting platform, real email provider, object storage, payment, or public development-update module.

## Storage

The database is a single SQLite file. By default it lives at `db/churchos.sqlite`; tests can pass a temporary database file path.

Tables:

- `churches`
- `users`
- `wishes`
- `comments`
- `notifications`
- `settings`
- `email_logs`

To keep the migration small, each row stores the existing object shape as JSON in a `data` column plus `id` and `created_at` columns for lookup and ordering. This preserves current API behavior and avoids rewriting every route at once.

## Seeding

On startup, the database creates all tables automatically. If a table is empty, it imports the matching `db/<table>.json` seed file. This preserves the existing sample data and default administrator account.

## Database Interface

The existing database API remains:

- `read(table)`
- `write(table, rows)`
- `findById(table, id)`
- `insert(table, row)`
- `update(table, id, updates)`
- `remove(table, id)`
- `seed()`

Routes should not need broad changes.

## Authentication

Keep the current login API shape for the frontend. During this phase, new registrations store password hashes. Existing seeded plain-text passwords continue to work and are upgraded to a hash on successful login.

## Testing

Add database tests proving SQLite persists data across database instances, imports JSON seed data, and supports insert/update/remove with the existing API. Existing API tests must continue to pass unchanged.
