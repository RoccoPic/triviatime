# Operation Go Live

Steps to deploy Trivia Time so others can play without running it locally.

---

## Stack

- **App hosting:** Vercel (native Next.js, free tier, auto-deploys on push)
- **Database:** Neon — serverless PostgreSQL (free tier, already referenced in `.env.example`)
- **Auth:** NextAuth — already wired up, just needs production env vars

---

## Step 1 — Hosted Database (Neon)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project (pick the region closest to your users)
3. Copy the connection string — it will be your `DATABASE_URL`

---

## Step 2 — Deploy to Vercel

1. Push the `main` branch to GitHub (branch off `adaptive-difficulty`)
2. Go to [vercel.com](https://vercel.com) and import the GitHub repo
3. Set these three environment variables in the Vercel dashboard:

```
DATABASE_URL        = <neon connection string>
NEXTAUTH_SECRET     = <run: openssl rand -base64 32>
NEXTAUTH_URL        = https://your-app.vercel.app
```

4. Deploy — Vercel auto-detects Next.js, no build config needed
5. Every future push to `main` triggers an automatic redeploy

---

## Step 3 — Seed the Database (one-time)

Run this once against the production database to load all categories and questions:

```bash
DATABASE_URL=<production url> npx prisma db push
DATABASE_URL=<production url> npx prisma db seed
```

The seed script uses `upsert` so it's safe to re-run if needed (e.g. after adding new questions).

---

## Step 4 — Custom Domain (optional)

1. Buy a domain (Namecheap, Cloudflare, etc.)
2. Add it in the Vercel dashboard under Project → Domains
3. Update `NEXTAUTH_URL` in Vercel env vars to match the new domain
4. Redeploy

---

## Gotchas

| Issue | Fix |
|---|---|
| `NEXTAUTH_URL` must exactly match the deployed domain | Set it before the first deploy; update it if the domain changes |
| `prisma db push` not `prisma migrate` | You've been using `db push` throughout — keep using it for schema changes |
| Questions live in the DB, not in code | Seed step is required before anyone can play |
| Stone background image | Already in `/public/stone-bg.jpg` — Vercel serves it automatically |

---

## Estimated Time

The whole thing should be live in under 15 minutes once the GitHub repo and Neon account are ready.
