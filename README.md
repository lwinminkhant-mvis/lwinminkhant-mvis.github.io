# Labour Book

A static, vanilla JavaScript labour management system for GitHub Pages and Supabase.

## Setup

1. In Supabase, open **SQL Editor** and run [sql/setup.sql](sql/setup.sql) once.
2. In Supabase open **Project Settings → API** and copy the **publishable** (anon) key.
3. Paste the key into `js/config.js`:
   `SUPABASE_PUBLISHABLE_KEY: "your_key_here"`
4. In Supabase open **Authentication → URL Configuration** and add the GitHub Pages URL to **Site URL** and **Redirect URLs**.
5. Commit and push the repository. Set GitHub Pages to **Deploy from a branch → main → /(root)**.

Never add a Supabase `service_role` key to this project.
