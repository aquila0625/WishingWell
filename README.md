# ChurchOS Co-creation Platform

> **中文版本：** [README.zh-CN.md](./README.zh-CN.md)

ChurchOS is a responsive H5 and desktop co-creation website for collecting, discussing, and prioritizing real church ministry needs. It includes public campaign pages, staff authentication, a requirement wall, comments and translation, sharing materials, notifications, and an administrator workspace.

## Requirements

- Node.js 18 or newer
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
| Administrator | `admin@churchos.net` | `adminpassword` |
| Pastor | `pastor.tim@grace.org` | `password123` |
| Treasurer | `sarah.treasurer@stjohns.ca` | `password123` |

These credentials and the file-based database are for local demonstration only.

## Local Data

Data is stored in `db/*.json`. To restore the original seed content after local testing, restore the tracked files with Git or replace them with the desired seed records before restarting the server.

Uploaded images and audio are written to `public/uploads/` and are ignored by Git.

## Demo-only Integrations

AI translation, speech transcription, analysis, geolocation, and email delivery use deterministic local demo responses. OAuth, SMS, real email providers, production password hashing, and a production database are not connected.

## Project Structure

- `app.js`: testable Express application factory
- `server.js`: process entry point
- `routes/`: authentication, wishes, sharing, and admin APIs
- `public/js/`: focused browser modules
- `public/styles/`: shared ChurchOS design system
- `test/`: API and frontend behavior tests
- `docs/`: bilingual design and implementation documentation
