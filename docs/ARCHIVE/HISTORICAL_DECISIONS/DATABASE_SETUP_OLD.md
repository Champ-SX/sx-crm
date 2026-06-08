# Supabase Database Setup Guide

Your SX CRM application is configured to use Supabase for persistent data storage. Follow these steps to initialize your database.

## Current Status

✅ **Dev Server**: Running on http://localhost:3000/dashboard  
✅ **Supabase Credentials**: Configured in `.env.local`  
⏳ **Database Setup**: Pending (needs manual SQL execution)

## Quick Setup (5 minutes)

### Step 1: Access Supabase Dashboard

1. Open your browser and go to:
   ```
   https://app.supabase.com/project/ujgiaqfuywnrimjjcekb
   ```
   Or navigate to https://app.supabase.com and select your project

### Step 2: Create Database Schema

1. In the left sidebar, click **"SQL Editor"**
2. Click **"New Query"** button
3. Open `lib/supabase/schema.sql` and copy **all** the SQL code
4. Paste it into the SQL editor
5. Click **"Run"** button (or press Ctrl+Enter / Cmd+Enter)
6. You should see success messages for creating tables

**SQL File Details:**
- **File**: `lib/supabase/schema.sql`
- **Size**: 5,716 characters
- **Creates**: 9 tables (companies, contacts, opportunities, jobs, activities, tasks, staff, etc.)
- **Includes**: Foreign key relationships and performance indexes

### Step 3: Seed Initial Data (Optional but Recommended)

1. Create a new SQL query (click "New Query" again)
2. Open `lib/supabase/seed-data.sql` and copy all the SQL code
3. Paste it into the new SQL editor
4. Click **"Run"**

**SQL File Details:**
- **File**: `lib/supabase/seed-data.sql`
- **Size**: 8,448 characters
- **Creates**: Sample data for testing the app

## Verifying Your Setup

After running the SQL:

1. **Check in Supabase Dashboard:**
   - Go to "Tables" in the left sidebar
   - You should see all 9 tables listed (companies, contact_persons, lead_opportunities, etc.)
   - Click on each table to verify data was created

2. **Test in the App:**
   - Visit http://localhost:3000/dashboard
   - The app will automatically load data from Supabase
   - Try creating, editing, or deleting a company or lead opportunity
   - Changes should persist (they'll still be there after page reload)

## Troubleshooting

### "Column already exists" error
- **Cause**: Tables were already created in a previous run
- **Solution**: This is fine - the SQL uses `CREATE TABLE IF NOT EXISTS`

### "Permission denied" error
- **Cause**: Using wrong credentials or wrong user role
- **Solution**: Use the `postgres` superuser (not the `authenticated` role)

### Data not showing in the app
- **Cause**: App might still be using mock data from Zustand store
- **Solution**: 
  1. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
  2. Check the browser console (F12) for any errors
  3. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct

## Project Credentials

Your Supabase project configuration (from `.env.local`):

```
Project ID: ujgiaqfuywnrimjjcekb
Database Host: ujgiaqfuywnrimjjcekb.db.supabase.co
Public API URL: https://ujgiaqfuywnrimjjcekb.supabase.co
Anon Key: sb_publishable_dw3cU7CuTDOQCf0m3jGqog_L1qe0tlr
```

## Next Steps

1. Complete the SQL setup above
2. Refresh your app at http://localhost:3000/dashboard
3. Start using the app with persistent Supabase storage



---

## LOCAL SUPABASE SETUP


# 🏠 Local Supabase Setup Guide

**Status:** ✅ Configured and ready to use  
**Created:** June 5, 2026  
**Purpose:** Isolated local development database (safe, separate from production)

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Docker installed and running
- Node.js 18+

### One-Time Setup

```bash
# 1. Start local Supabase instance
npm run db:start

# 2. This will output connection info - save it!
# You'll see something like:
#   API URL: http://localhost:54321
#   DB: postgresql://...@localhost:5432/postgres
#   Anon Key: eyJhbGc...
```

### Enable Local Database

Edit your `.env.local` file:

```bash
# OLD (production - comment out)
# NEXT_PUBLIC_SUPABASE_URL=https://ujgiaqfuywnrimjjcekb.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# NEW (local - uncomment)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (from npm run db:start output)
```

### Start Developing

```bash
npm run dev
# Now you're using local database!
```

---

## 📋 Common Commands

| Command | What it does |
|---------|------------|
| `npm run db:start` | Start local Supabase (Docker required) |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:status` | Check if local Supabase is running |
| `npm run db:pull` | Sync schema from production → local |
| `npm run db:push` | Push local schema changes → production |
| `npm run dev` | Start dev server (uses .env.local) |

---

## 🔄 Typical Workflow

### Testing a New Feature Locally

```bash
# 1. Make sure local Supabase is running
npm run db:status

# 2. Start development server
npm run dev

# 3. Test your feature
# - Create test users
# - Test auth flows
# - Try RLS policies
# - Test email notifications
# - No effect on production! ✅

# 4. When done, commit changes
git add .
git commit -m "feat: new feature"

# 5. Push to GitHub (triggers Vercel deploy)
git push origin main

# 6. Stop local Supabase when done
npm run db:stop
```

### Before Deploying to Production

```bash
# 1. Test locally first
npm run dev
# Verify everything works with local data

# 2. Rebuild for production
npm run build

# 3. Switch back to production DB in .env.local
NEXT_PUBLIC_SUPABASE_URL=https://ujgiaqfuywnrimjjcekb.supabase.co
# (comment out local URLs)

# 4. Git push triggers Vercel deployment
git push origin main
# Vercel uses production ENV variables automatically
```

---

## 📊 Environments Explained

### Local Development
```
┌─────────────────┐
│  Your Computer  │
│  ┌───────────┐  │
│  │ Next.js   │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │  Supabase │  │  ← Runs in Docker
│  │  (Local)  │  │  ← Isolated from prod
│  └───────────┘  │
└─────────────────┘
```

✅ Safe - Local data only  
✅ Fast - No network latency  
✅ Free - Runs on your machine  
✅ Reset-able - Delete and recreate easily  

### Production
```
┌──────────┐     ┌─────────────┐     ┌──────────────┐
│ Vercel   │────▶│  Next.js    │────▶│ Supabase     │
│ (CDN)    │     │  (Server)   │     │ (Cloud)      │
└──────────┘     └─────────────┘     └──────────────┘
                                      Real user data
```

⚠️ Caution - Real user data  
🚀 Fast - CDN distributed  
🔒 Secure - Verified authentication  
💾 Backed up - Nightly snapshots  

---

## 🔐 Data Safety

### What happens locally stays locally
```bash
npm run db:pull   # Copy production schema → local
# Only schema (structure), NOT data!
# Your local data is completely separate
```

### How to Reset Local Data
```bash
npm run db:stop     # Stop Supabase
rm -rf ./supabase/  # Delete local instance
npm run db:start    # Recreate from scratch
```

### Why This Matters for Phase 2.0
- **Auth Testing:** Test Google OAuth without affecting production users
- **RLS Policies:** Verify security rules locally before deploying
- **Email Notifications:** Send test emails only, not real user emails
- **Multiple Users:** Create test users without cluttering production

---

## 🚨 Important Reminders

### DO ✅
- Test locally first
- Use local for Phase 2.0 features (Auth, RLS, emails)
- Commit to `main` to trigger production deployment
- Switch back to prod ENV before pushing

### DON'T ❌
- Use production DB for development
- Commit `.env.local` with real API keys
- Forget to stop local Supabase (stops Docker container)
- Mix local and prod API calls in same session

---

## 📚 Next Steps

1. **Today:** Setup local Supabase
   ```bash
   npm run db:setup
   npm run dev
   ```

2. **Before Phase 2.0:** Test Google Auth locally
   ```bash
   # Create test users
   # Verify RLS policies
   # Test email notifications
   ```

3. **On Deployment Day:** Push to production
   ```bash
   git push origin main
   # Vercel automatically uses production ENV
   ```

---

## 🆘 Troubleshooting

### Local Supabase won't start
```bash
# Check if Docker is running
docker ps

# If Docker needs restart:
docker restart

# Then try again
npm run db:start
```

### Getting "Cannot connect to localhost:54321"
```bash
# Make sure local Supabase is running
npm run db:status

# If not running:
npm run db:start
```

### Schema is out of sync
```bash
# Pull latest schema from production
npm run db:pull

# Restart your dev server
npm run dev
```

---

## 📖 Learn More

- [Supabase Local Dev Guide](https://supabase.com/docs/guides/cli/local-development)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Our Production Setup](https://sx-crm.vercel.app)

---

**Questions?** Check the Phase 2.0 roadmap in `PHASE_1_5_SCHEMA_SYNC.md`
