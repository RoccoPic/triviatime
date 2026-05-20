#!/usr/bin/env bash
# Create the trivia_time database for local Postgres.
# Run from project root. Ensure Postgres is running and 'createdb' is on your PATH.
# If you use Postgres.app, run: export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"
set -e
createdb trivia_time 2>/dev/null || echo "Database trivia_time already exists or createdb failed (is Postgres running and on PATH?)."
echo "Done. Run: npx prisma db push && npx prisma db seed"
