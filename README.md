# Trivia Roguelike

A roguelike trivia game: clear floors of category-themed encounters (trivia “monsters”), earn run money, spend it to skip or in the shop, and track progress across runs.

## Stack

- **Next.js 14** (App Router), TypeScript, Tailwind
- **Prisma** + **PostgreSQL**
- **NextAuth** (credentials: email + password)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Database**

   **Local Postgres (already installed):**

   - Start Postgres (e.g. open Postgres.app, or `brew services start postgresql`).
   - Create the database (in your project folder):

     ```bash
     createdb trivia_time
     ```

     If `createdb` isn’t on your PATH (e.g. with Postgres.app), add it first:

     ```bash
     export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"
     createdb trivia_time
     ```

   Your `.env` is already set to `postgresql://roccopic@localhost:5432/trivia_time`. If your Mac username differs, change `roccopic` in that URL to your username. If you use a password, use `postgresql://USER:PASSWORD@localhost:5432/trivia_time`.

   Alternatively use a hosted DB: [Neon](https://neon.tech), [Vercel Postgres](https://vercel.com/storage/postgres), etc., and set `DATABASE_URL` in `.env` to the connection string they give you.

3. **Environment**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` – PostgreSQL connection string
   - `NEXTAUTH_SECRET` – random string (e.g. `openssl rand -base64 32`)
   - `NEXTAUTH_URL` – `http://localhost:3000` in development

4. **Prisma**

   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign up, then start a run.

## Game flow

- **Start run** – 3 lives, 0 run money. Floors are assigned random categories (art, science, history, geography, math, sports).
- **Encounter** – Answer the question to “defeat” the monster and earn run money. Wrong answer costs 1 life. You can pay run money to skip (no life lost).
- **Lives** – +1 life for 3 correct in a row (up to 6).
- **Run end** – At 0 lives: game over. 50% of run money is added to your **collection**. Completing all floors also ends the run and converts run money to collection.
- **Progress** – View collection balance, per-category stats, and recent runs.

## Questions (one file per category)

Questions live in **`questions/`**: one TypeScript file per category (e.g. `questions/art.ts`, `questions/science.ts`). Each file exports an array of `{ text, options, correctIndex }`. The seed imports `questions/index.ts`, which re-exports all category arrays. Categories and display names are derived from these files when you run `npm run db:seed`.

- **Add a category:** Create `questions/<slug>.ts` exporting `<slug>Questions`, then add it to `questions/index.ts` (import and add to `allCategoryQuestions`). Run `npx prisma db seed`.
- **Add questions:** Edit the category file, then run `npx prisma db seed` (new questions are added; existing ones are skipped).

## Scripts

- `npm run dev` – Start dev server
- `npm run build` – Build for production
- `npm run start` – Start production server
- `npm run db:generate` – Generate Prisma client
- `npm run db:push` – Push schema to DB (no migrations)
- `npm run db:seed` – Seed categories and questions
