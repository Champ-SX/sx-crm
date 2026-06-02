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

