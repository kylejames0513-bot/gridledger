# 🏈 GridLedger — NFL Salary Cap Command Center

Real-time NFL salary cap tracker, transaction wire, and GM simulator for all 32 teams.

!\[Next.js](https://img.shields.io/badge/Next.js-14-black)
!\[Supabase](https://img.shields.io/badge/Supabase-Database-green)
!\[Vercel](https://img.shields.io/badge/Vercel-Deployed-blue)

## Features

* **All 32 Teams** — Full roster, salary cap breakdown, contract details
* **GM Simulator** — Cut players, restructure contracts, post-June 1 designations, extensions
* **Trade Simulator** — Trade players between teams with real-time cap impact
* **Free Agent Market** — Sign available free agents to your team
* **Transaction Wire** — Live feed of trades, signings, cuts, waivers
* **Breaking News** — Scrolling ticker with latest NFL transactions
* **Draft Picks** — View and manage draft capital
* **Undo System** — Full undo/reset for GM moves
* **Real-time Updates** — Supabase Realtime subscriptions for live data

## Tech Stack

|Layer|Technology|
|-|-|
|Frontend|Next.js 14 (App Router)|
|Styling|Tailwind CSS|
|Database|Supabase (PostgreSQL)|
|Auth|Supabase Auth (optional)|
|Realtime|Supabase Realtime|
|Hosting|Vercel|
|Cron|Vercel Cron Jobs|

## Architecture

```
gridledger/
├── src/
│   ├── app/
│   │   ├── layout.js              # Root layout
│   │   ├── page.js                # Home page (team selector)
│   │   ├── globals.css            # Global styles
│   │   ├── teams/\[teamId]/page.js # Team detail + GM simulator
│   │   └── api/
│   │       ├── teams/route.js     # GET teams
│   │       ├── roster/route.js    # GET roster by team
│   │       ├── transactions/route.js # GET transactions
│   │       ├── gm/route.js        # CRUD GM scenarios
│   │       └── sync/route.js      # Cron sync endpoint
│   ├── components/
│   │   ├── Header.js              # Global search + nav
│   │   ├── NewsTicker.js          # Scrolling news bar
│   │   ├── CapOverview.js         # Cap stats + allocation bar
│   │   ├── RosterTable.js         # Sortable roster with actions
│   │   ├── GMModal.js             # Cut/restructure/extend modals
│   │   ├── TradeSimulator.js      # Two-team trade builder
│   │   ├── FreeAgentMarket.js     # FA signing interface
│   │   ├── DraftPicks.js          # Draft capital display
│   │   ├── TransactionList.js     # Transaction feed
│   │   └── GMLog.js               # User move history
│   └── lib/
│       ├── supabase.js            # Supabase client (browser + server)
│       ├── constants.js           # Teams, positions, helpers
│       └── demo-data.js           # Generated demo data (no DB needed)
├── supabase/migrations/
│   └── 001\_initial\_schema.sql     # Full database schema
├── scripts/
│   └── seed.js                    # Database seed script
├── vercel.json                    # Cron job config
└── README.md
```

## Quick Start (Demo Mode)

The app works **without Supabase** using generated demo data. Just:

```bash
git clone https://github.com/kylejames0513-bot/gridledger.git
cd gridledger
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see all 32 teams with demo rosters.

## Full Setup with Supabase

### 1\. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your **Project URL** and **anon/public key** from Settings → API

Anon: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Znl1ZWZscGRqYnBoeG9sY2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MzI3NTYsImV4cCI6MjA4OTIwODc1Nn0.UGsBa9QcfWXYVF1lJ5wp6dkNVZwSCLKSzznMi7I9nE8

SR:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Znl1ZWZscGRqYnBoeG9sY2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYzMjc1NiwiZXhwIjoyMDg5MjA4NzU2fQ.nLA-j4\_phxaHA-nPX7A2qF781lLvB4do4Y4Y37vE0nU

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Znl1ZWZscGRqYnBoeG9sY2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYzMjc1NiwiZXhwIjoyMDg5MjA4NzU2fQ.nLA-j4\_phxaHA-nPX7A2qF781lLvB4do4Y4Y37vE0nU';


PURL: https://vvfyueflpdjbphxolckn.supabase.co

PUBK: sb\_publishable\_4VAxPPpOjAW3mxUKvZhoXg\_vWPm8G-B

NEXT_PUBLIC_SUPABASE_URL=https://vvfyueflpdjbphxolckn.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Znl1ZWZscGRqYnBoeG9sY2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYzMjc1NiwiZXhwIjoyMDg5MjA4NzU2fQ.nLA-j4\_phxaHA-nPX7A2qF781lLvB4do4Y4Y37vE0nU node scripts/seed.js

$env:SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Znl1ZWZscGRqYnBoeG9sY2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYzMjc1NiwiZXhwIjoyMDg5MjA4NzU2fQ.nLA-j4\_phxaHA-nPX7A2qF781lLvB4do4Y4Y37vE0nU"

3. Copy your **service\_role key** (keep this secret!)

### 2\. Set Up Database

1. Open the **SQL Editor** in your Supabase dashboard
2. Paste and run the contents of `supabase/migrations/001\_initial\_schema.sql`
3. This creates all tables, indexes, RLS policies, and functions

### 3\. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT\_PUBLIC\_SUPABASE\_URL=https://xxxxx.supabase.co
NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY=eyJhbGciOi...
SUPABASE\_SERVICE\_ROLE\_KEY=eyJhbGciOi...
CRON\_SECRET=some-random-secret
```

### 4\. Seed Data

```bash
npm run db:seed
```

This populates teams, sample transactions, news, and draft picks.

### 5\. Run Locally

```bash
npm run dev
```

## Deploy to Vercel

### One-Click Deploy

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your `gridledger` repository
4. Add environment variables:

   * `NEXT\_PUBLIC\_SUPABASE\_URL`
   * `NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY`
   * `SUPABASE\_SERVICE\_ROLE\_KEY`
   * `CRON\_SECRET`
5. Deploy

### Cron Job

The `vercel.json` configures a cron job that runs every 6 hours to sync data:

```json
{
  "crons": \[{
    "path": "/api/sync?secret=${CRON\_SECRET}",
    "schedule": "0 \*/6 \* \* \*"
  }]
}
```

This keeps your transaction wire and team data fresh.

## Adding Real Data

The app ships with generated demo data. To add real contract data:

### Option A: Manual Entry via Supabase Dashboard

1. Open your Supabase table editor
2. Add players to the `players` table
3. Add contracts to the `contracts` table
4. Data appears instantly via Realtime

### Option B: Import from Spotrac/OTC

1. Export CSV from Spotrac or Over The Cap
2. Transform to match the schema
3. Import via Supabase CSV import or the seed script

### Option C: Build a Scraper

Extend `src/app/api/sync/route.js` to scrape from:

* NFL.com `/transactions/league/{type}/{year}/{month}`
* Spotrac team cap pages
* ESPN API endpoints

## Database Schema

### Core Tables

* **teams** — 32 NFL teams with cap totals
* **players** — All rostered players
* **contracts** — Current and historical contracts
* **transactions** — Transaction wire entries
* **draft\_picks** — Draft capital with trade tracking

### User Tables

* **gm\_scenarios** — Saved GM simulator sessions
* **gm\_moves** — Individual moves within scenarios

### Features

* Row Level Security on all tables
* Realtime subscriptions on transactions, news, players, contracts
* Auto-updating timestamps
* Cap recalculation function

## Roadmap

* \[ ] Real-time Spotrac data integration
* \[ ] User authentication + saved scenarios
* \[ ] Multi-year cap projections (2026-2030)
* \[ ] Compensatory pick calculator
* \[ ] Trade value chart
* \[ ] Mobile app (React Native)
* \[ ] Push notifications for breaking transactions
* \[ ] CSV/PDF export of rosters
* \[ ] AI trade analyzer

## License

MIT

