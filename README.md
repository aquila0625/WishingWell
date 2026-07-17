# ChurchOS Co-creation Platform

> **中文版本：** [README.zh-CN.md](./README.zh-CN.md)

ChurchOS is a responsive H5 and desktop co-creation website for collecting, discussing, and prioritizing real church ministry needs. It includes public campaign pages, staff authentication, a requirement wall, comments and translation, sharing materials, notifications, and an administrator workspace.

## Requirements

- Node.js 24 or newer
- npm 9 or newer

## Run Locally

```bash
npm install
npm start
```

Open [http://localhost:3000/index.html](http://localhost:3000/index.html).

Use another port when 3000 is occupied:

```bash
PORT=3001 npm start
```

## Verify

```bash
npm test
npm run check
```

`npm run check` performs server syntax checks and runs the complete Node test suite.

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Local demo administrator | `admin@churchos.net` | `adminpassword` |
| Pastor | `pastor.tim@grace.org` | `password123` |
| Treasurer | `sarah.treasurer@stjohns.ca` | `password123` |

These credentials and local seed records are for demonstration only. In production Supabase data, the default administrator should be disabled; the current owner administrator is the configured `254351776@qq.com` account.

## Local Data

Runtime data is stored in the SQLite file `db/churchos.sqlite`. The tracked `db/*.json` files remain the first-start seed source.

Uploaded images and audio are written to `public/uploads/` and are ignored by Git.

## Deployment Configuration

Copy `.env.example` to `.env` and adjust it for the server:

```bash
PORT=3000
CHURCHOS_SESSION_SECRET=replace-with-a-long-random-secret
CHURCHOS_DB_DIR=/srv/churchos/data
CHURCHOS_DB_FILE=/srv/churchos/data/churchos.sqlite
CHURCHOS_UPLOAD_DIR=/srv/churchos/uploads
CHURCHOS_ADMIN_EMAIL=your-admin@example.org
CHURCHOS_ADMIN_PASSWORD=change-this-password
CHURCHOS_ADMIN_NAME=ChurchOS Admin
OPENAI_API_KEY=your-openai-api-key
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
```

When `CHURCHOS_ADMIN_EMAIL`, `CHURCHOS_ADMIN_PASSWORD`, and `CHURCHOS_ADMIN_NAME` are all set, the service creates or updates that administrator account on startup.

`CHURCHOS_SESSION_SECRET` signs login session tokens. Production deployments must use a long, random, private value. Changing it signs users out and requires them to log in again.

Back up SQLite by copying the file pointed to by `CHURCHOS_DB_FILE`. To restore, stop the service, replace that file, and restart.

Supabase credentials should live only in server-side environment variables such as `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; never commit them or put them in frontend code.

Voice transcription uses OpenAI from the server only. Set `OPENAI_API_KEY` to enable real transcription. `OPENAI_TRANSCRIPTION_MODEL` defaults to `gpt-4o-mini-transcribe`; use `gpt-4o-transcribe` if you prefer the higher-capability transcription model.

## Switching to Supabase

1. Run `docs/supabase-schema.sql` in the Supabase SQL Editor.
2. Set these variables in the local or server `.env` file:

```bash
CHURCHOS_DB_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` must stay server-side. Do not put it in frontend code, chat messages, or Git commits.

The Supabase adapter is now connected to the backend database interface. On first startup, it attempts to import JSON seed data into empty tables.

If the production environment already contains real users or requirements, do not repeatedly clear Supabase tables. Seed import runs only when a table is empty.

## Render Deployment

The repository includes `render.yaml` for Blueprint deployment on Render. Do not write secrets into GitHub. Fill these values only in Render environment variables:

```bash
SUPABASE_URL=your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=your Supabase service role key
CHURCHOS_SESSION_SECRET=a long random string
OPENAI_API_KEY=your OpenAI API key
```

After Render deploys successfully, verify the temporary Render URL can open `/api/health` and the homepage, then bind:

```text
churchosapp.org
www.churchosapp.org
```

After adding the custom domains in Render, return to Namecheap Advanced DNS and add the DNS records provided by Render.

## Pre-launch Security Checklist

- Confirm `.env` is not committed to Git.
- Confirm `CHURCHOS_SESSION_SECRET` is a long random string.
- Confirm `SUPABASE_SERVICE_ROLE_KEY` exists only in server-side environment variables.
- Confirm `OPENAI_API_KEY` exists only in server-side environment variables if voice transcription is enabled.
- Confirm the default demo administrator `admin@churchos.net` is disabled.
- Confirm the owner administrator account, for example `254351776@qq.com`, can log in and open the admin workspace.

## Demo-only Integrations

AI translation, speech transcription, analysis, geolocation, and email delivery use deterministic local demo responses. OAuth, SMS, and real email providers are not connected. Progress emails are currently simulated and logged in the admin workspace until a mail provider is connected.

## Project Structure

- `app.js`: testable Express application factory
- `server.js`: process entry point
- `routes/`: authentication, wishes, sharing, and admin APIs
- `public/js/`: focused browser modules
- `public/styles/`: shared ChurchOS design system
- `test/`: API and frontend behavior tests
- `docs/`: bilingual design and implementation documentation
