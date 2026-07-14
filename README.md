# Indocycle Ledger

A double-entry accounting ledger for Indocycle: chart of accounts, journal entries, inventory with weighted-average costing, purchases, sales (with automatic COGS), and trial balance / income statement / balance sheet reports. Currency is IDR.

## Stack

Next.js (App Router, TypeScript) + PostgreSQL + Prisma, NextAuth (credentials login), Tailwind + shadcn/ui.

## Run with Docker Compose (recommended)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Copy the env file and fill in secrets:

   ```bash
   cp .env.example .env
   ```

   Generate a value for `NEXTAUTH_SECRET`:

   ```bash
   openssl rand -base64 32
   ```

   Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` to whatever you want your first login to be.

3. Start everything:

   ```bash
   docker compose up --build
   ```

   This builds the app image, starts Postgres, runs migrations, seeds the chart of accounts and the first admin user (only if no users exist yet — safe to re-run), then starts the app.

4. Open [http://localhost:3000](http://localhost:3000) and log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`.

To stop: `docker compose down` (add `-v` to also delete the database volume and start fresh).

## Local development (without Docker)

Requires Node 20+ and a reachable PostgreSQL instance.

```bash
npm install
cp .env.example .env   # point DATABASE_URL at your local Postgres
npx prisma migrate dev
npm run dev
```

Useful scripts:

- `npm run db:migrate` — create/apply a new migration in dev
- `npm run db:seed` — re-run the chart-of-accounts seed (idempotent)
- `npm run db:studio` — open Prisma Studio to browse the database

## How the books work

- **Chart of Accounts** is seeded on first run with standard retail accounts (Cash, Bank, AR, Inventory, AP, Owner's Equity, Sales Revenue, COGS, common operating expenses).
- **Journal Entries** are the source of truth; every entry must balance (total debit = total credit).
- **Purchases** increase inventory quantity and recompute the product's weighted-average unit cost, and post `Dr Inventory / Cr Payment Account`.
- **Sales** decrease inventory quantity (validated against on-hand stock) and post two entries: `Dr Payment Account / Cr Sales Revenue` and `Dr COGS / Cr Inventory` (COGS computed at the product's current weighted-average cost).
- Posted journal entries, purchases, and sales are not editable — corrections should be made with new reversing entries, per standard bookkeeping practice.
- The **Balance Sheet** computes a live "Current Earnings" equity line (Income − Expenses since inception) since there's no year-end closing process yet, keeping Assets = Liabilities + Equity at any date.
