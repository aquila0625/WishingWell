# ChurchOS Admin Console Design

## Goal

Build a concise administrator console for the single ChurchOS founder to manage requirement submissions, users, homepage copy, exports, and progress emails without needing code changes for routine operations.

## Scope

Phase one keeps the backend deliberately small. It does not include a public development updates module, embedded AI APIs, private admin notes, user reports, or hidden/private submissions.

The admin console includes four areas:

- Requirement data: search, filter, inspect, change status, add official replies, hide or restore, merge, and export.
- User management: view registered users, their church and region context, role, participation counts, and disable abnormal accounts.
- Homepage content: edit homepage text and common button visibility/copy from stored settings.
- Progress email: compose an email update, preview the unique recipient count from users who have submitted requirements, simulate or send through a provider later, and keep send history.

## Requirement Workflow

New requirements publish immediately after login-based submission. Users can vote and comment only after login.

Statuses visible to users:

- `voting`: 共创中
- `accepted`: 已采纳
- `planned`: 已规划
- `developing`: 开发中
- `testing`: 内测中
- `completed`: 已完成
- `rejected`: 暂不采纳
- `merged`: 已合并
- `hidden`: 已隐藏

Authors may edit their own requirement only while status is `voting`. Admin changes to `accepted` or `merged` lock editing. Hidden records remain stored and recoverable.

Admin status changes and official replies create site notifications for the author. Email delivery is recorded as a separate history item and may be simulated until a provider is configured.

## Export

The admin can export:

- All requirements.
- Current filtered requirements.
- Manually selected requirements.

The export is structured JSON-like text suitable for pasting into an external AI tool. It may include full user information, including email, because the founder approved non-anonymized exports for this internal admin use.

## Consent

Registration requires consent for using account and submission data for requirement research, product planning, notifications, acknowledgment, and analysis. Consent is stored on the user record.

## Email

The progress email tool selects unique registered users who have submitted at least one requirement and have not been disabled. The first implementation supports simulated sending and send history. Real sending will be activated later by adding a server-side provider API key and domain settings.

## Data Storage

The project currently uses JSON files as a lightweight database. Phase one continues that pattern:

- `settings.json` stores campaign and homepage content settings.
- `wishes.json` stores requirement state and admin fields.
- `users.json` stores user profile, consent, and disabled status.
- `email_logs.json` stores progress email send batches.

## Testing

Backend tests cover admin authentication, requirement filtering/export, status and reply updates, hide/restore, user disabling, homepage settings, and progress email simulation. Frontend tests cover admin tab rendering and key actions where practical.
