# Labour Book

Labour Book is a responsive labour, wage, expense, and payroll PWA built with React, Vite, modern CSS, and Supabase. It supports worker records, attendance, projects, expenses, payroll calculations, payments, advances, printable receipts, reports, authentication, CSV export, and offline application-shell caching.

## Requirements

- Windows 10/11 or another current desktop OS
- Node.js 20 or newer
- npm
- A Supabase project
- GitHub repository and GitHub Pages enabled

## Installation

```bash
cd "C:\Users\NCL PC Shop\Documents\GitHub\lwinminkhant-mvis.github.io"
npm install
cp .env.example .env
npm run dev
```

Open the local URL printed by Vite. For a production build:

```bash
npm run build
npm run preview
```

## Supabase setup

1. Create a project at https://supabase.com.
2. Open **Project Settings > API**.
3. Copy the project URL and the public **publishable** key.
4. Copy those values into `.env`:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Never use or expose the service-role key in frontend code or GitHub Actions secrets.

5. Open the Supabase SQL editor.
6. Run the complete contents of `supabase/schema.sql`.
7. In **Authentication > Providers**, enable Email.
8. In **Authentication > URL Configuration**, add the local and GitHub Pages URLs to the allowed redirect URLs.

The SQL creates all required tables, indexes, relationships, and Row Level Security policies. Every business record is owned by `auth.uid()`, and the frontend cannot bypass these database policies.

## GitHub Pages deployment

1. Initialize the repository and push `main`:

```bash
git init
git add .
git commit -m "Initial Labour Book application"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/Labour-Book.git
git push -u origin main
```

2. In GitHub, open **Settings > Secrets and variables > Actions**.
3. Create repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Open **Settings > Pages**.
5. Set **Source** to **GitHub Actions**.
6. Push or run the deploy workflow. The deployed URL is normally:

```text
https://YOUR_USERNAME.github.io/Labour-Book/
```

The Vite base path in `vite.config.js` matches the repository name `lwinminkhant-mvis.github.io`. Update `base` only if the repository name changes.

## PWA installation

On Chrome or Samsung Internet, open the deployed HTTPS site, open the browser menu, and select **Install app** or **Add to Home screen**. The app supports standalone, portrait, and landscape use.

The service worker caches the application shell only. Supabase database responses are not cached. When offline, pages that were previously loaded may open, but data operations require an internet connection and clearly report the offline state.

## Backups and exports

Use Supabase dashboard backups or create database backups according to the Supabase plan. Reports in the application can be exported to CSV and printed or saved as PDF through the browser print dialog.

## Project structure

```text
index.html
package.json
vite.config.js
public/
  manifest.json
  service-worker.js
  icons/
src/
  main.jsx
  styles/
  components/
  pages/
  services/
  utils/
  config/
supabase/schema.sql
.github/workflows/deploy.yml
```

## Remaining tasks

- Add Supabase credentials and run the SQL schema.
- Configure Supabase authentication redirect URLs.
- Create and configure the GitHub Pages repository.
