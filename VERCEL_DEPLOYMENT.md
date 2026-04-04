# Deploy on Vercel

## 1) Push project to GitHub
- Commit your project and push it to a GitHub repository.

## 2) Import project in Vercel
- Go to Vercel dashboard.
- Click **Add New... > Project**.
- Import your GitHub repository.
- Framework preset should be **Next.js**.

## 3) Configure environment variables
Set these in **Project Settings > Environment Variables**.

Use one of the two methods below:

### Method A (recommended)
- `DATABASE_URL` = `mysql://USER:PASSWORD@HOST:PORT/DATABASE`

### Method B
- `DB_HOST`
- `DB_PORT` (default `3306`)
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_CONNECTION_LIMIT` (optional, default `10`)
- `DB_SSL` (optional, `true` for managed DB SSL)
- `DB_SSL_REJECT_UNAUTHORIZED` (optional, default `true`)

## 3.1) Install database schema
- Run `database.nextjs.sql` on your production database.
- This creates all required tables for lessons, quiz, progress, and auth sessions.

## 4) Deploy
- Click **Deploy**.
- Vercel will build and deploy your Next.js app.

## 5) Verify API routes
After deployment, test:
- `/api/lessons`
- `/api/questions?lesson_id=1`
- `/api/progress`
- `/api/auth/register`
- `/api/auth/login`

## Notes
- This app uses MySQL connection pooling from `lib/db.js`.
- Make sure your MySQL server allows connections from Vercel.
- For production, use strong DB credentials and SSL-enabled DB service when possible.
- Ensure the repository includes `package.json`, `app/layout.js`, and `jsconfig.json` for proper Next.js build + alias support.
