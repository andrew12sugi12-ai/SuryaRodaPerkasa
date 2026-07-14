# Deploying Indocycle Ledger to Railway

This app is a single Next.js service + a PostgreSQL database. The included
`Dockerfile` automatically runs database migrations, seeds the chart of accounts
and the first admin user, then starts the app — so deployment is mostly
configuration.

## Prerequisites (you do these once)

1. A **GitHub account** (github.com) — free. Stores the code.
2. A **Railway account** (railway.com) — sign in with GitHub, add a payment
   method (~$5/month).

## Step 1 — Put the code on GitHub

The project is already committed to git locally. Create an empty repository on
GitHub, then from the project folder:

```bash
git remote add origin https://github.com/<your-username>/indocycle-ledger.git
git branch -M main
git push -u origin main
```

## Step 2 — Create the Railway project

1. Railway → **New Project → Deploy from GitHub repo** → pick the repo.
   Railway detects the `Dockerfile` and builds it.
2. In the project, **New → Database → PostgreSQL**. Railway provisions it.

## Step 3 — Set environment variables (on the app service → Variables)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Reference Railway's Postgres: `${{Postgres.DATABASE_URL}}` |
| `NEXTAUTH_SECRET` | The random secret provided to you separately (or run `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your Railway public URL, e.g. `https://indocycle.up.railway.app` |
| `ADMIN_NAME` | e.g. `Admin` |
| `ADMIN_EMAIL` | Your admin login email |
| `ADMIN_PASSWORD` | **A strong, unique password** (this seeds the first admin) |

> `DATABASE_URL` must reach Railway's Postgres. Using the `${{Postgres.DATABASE_URL}}`
> reference is the easiest — Railway fills it in automatically.

## Step 4 — Deploy & open

Railway builds and gives you a `https://…railway.app` URL. Open it, log in with
`ADMIN_EMAIL` / `ADMIN_PASSWORD`, then create staff accounts under **Users**.

## Day-to-day

- **Update the app:** push to GitHub → Railway auto-rebuilds and redeploys.
- **Reset the data** (after staff practice): log in as admin → **Reset Data**
  in the sidebar → type `RESET`. This clears all transactions & master data but
  keeps user logins and the chart of accounts. (CLI equivalent: `npm run db:reset`.)
- **Backups:** Railway's managed Postgres includes automatic backups.

## Notes on the local `docker-compose.yml`

The `docker-compose.yml` in this repo is for **local development only**. It
publishes the Postgres port (`5433`) for convenience on your own machine — do
not use that compose file to expose a database on a public server. On Railway,
the database is Railway's managed Postgres and is never publicly exposed.

## Security posture (already built in)

- HTTPS is provided automatically by Railway.
- Passwords are bcrypt-hashed; login locks an account for 15 minutes after 8
  failed attempts.
- Security headers (CSP, X-Frame-Options, HSTS, etc.) are set on every response.
- All server actions enforce authentication and role checks.
- Set a strong `ADMIN_PASSWORD` — that is the single most important step.
