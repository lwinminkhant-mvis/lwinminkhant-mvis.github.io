# Labour Book

A static, vanilla JavaScript labour management system for GitHub Pages and Supabase.

## Setup

1. In Supabase, open **SQL Editor** and run [sql/setup.sql](sql/setup.sql) once.
2. In Supabase open **Project Settings → API** and copy the **publishable** (anon) key.
3. Paste the key into `js/config.js`:
   `SUPABASE_PUBLISHABLE_KEY: "your_key_here"`
4. In Supabase open **Authentication → URL Configuration** and add the GitHub Pages URL to **Site URL** and **Redirect URLs**.
5. In GitHub, open **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
6. Commit and push the repository to the `main` branch. The workflow at `.github/workflows/deploy.yml` publishes the repository root automatically; it does not install npm packages or run a build.
7. Open the **Actions** tab and wait for **Deploy static site to GitHub Pages** to finish. Your site will be available at `https://lwinminkhant-mvis.github.io/`.

Never add a Supabase `service_role` key to this project.

## Attendance and wages

Attendance has one shared day/month/year selector. Day mode enables quick roster entry; month and year modes show attendance history for that selected period. Saved present days earn one daily wage and half-days earn half a daily wage. The Payments screen calculates each employee's accrued wages from attendance, subtracts paid/partial payment records, and shows the remaining balance. Pending payment records are listed but do not reduce the balance. Advances recorded as paid also reduce the balance.

The dashboard includes a searchable employee information list and daily expense totals/details, with a date picker to view expenses for today or another day.

The Payments page provides monthly payouts per employee or a confirmed bulk payout for all employees with a balance. Its monthly ledger appears at the bottom as individual employee cards, showing attendance days, daily wage, wages earned, paid/advance amounts, prior-period carry, and the signed balance. Positive means the business owes the employee; negative means the employee owes the business and future work can reduce that balance. The wage-balance table can be switched between month and year; selecting an employee name opens the payment form. Monthly wage payments are applied to the selected wage month while retaining the actual payment date. Because the database stores only the current daily wage, historical attendance wages are calculated using that current rate.
