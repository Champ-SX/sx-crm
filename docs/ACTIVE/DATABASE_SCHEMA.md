# 🗄️ Database Schema & Setup

## Current Status

✅ **Dev Server:** Running on http://localhost:3000/dashboard  
✅ **Supabase Credentials:** Configured in `.env.local`  
✅ **Database:** 9 tables created  
✅ **Backups:** Daily automatic (Supabase)  

---

## Quick Setup (5 minutes)

### Step 1: Access Supabase Dashboard
```
https://app.supabase.com/project/ujgiaqfuywnrimjjcekb
```

### Step 2: Create Schema
1. Click "SQL Editor" → "New Query"
2. Open `lib/supabase/schema.sql`
3. Copy all SQL code → Paste into editor
4. Click "Run"

**Schema file:** `lib/supabase/schema.sql` (5,716 characters)  
**Creates:** 9 tables with foreign keys and indexes  

### Step 3: Seed Data (Optional)
1. "New Query" again
2. Open `lib/supabase/seed-data.sql`
3. Paste → "Run"

**Seed file:** `lib/supabase/seed-data.sql` (8,448 characters)  
**Creates:** Sample data for testing  

---

## Database Tables

### Core Tables

#### `companies`
```sql
- id (UUID) — Primary key
- name (text) — Company name
- type (text) — Customer type
- phone (text) — Contact phone
- email (text) — Contact email
- address (text) — Address
- created_at (timestamp)
- updated_at (timestamp)
```

#### `contact_persons`
```sql
- id (UUID) — Primary key
- company_id (UUID) — Foreign key to companies
- name (text) — Contact name
- email (text) — Email
- phone (text) — Phone
- title (text) — Job title
- created_at (timestamp)
```

#### `lead_opportunities`
```sql
- id (UUID) — Primary key
- company_id (UUID) — Company (nullable)
- contact_person_id (UUID) — Contact person (nullable)
- name (text) — Opportunity name
- status (text) — open|negotiating|won|lost
- estimated_value (decimal) — Expected value
- created_at (timestamp)
```

#### `won_jobs`
```sql
- id (UUID) — Primary key
- company_id (UUID) — Company
- opportunity_id (UUID) — Link to opportunity
- event_display_name (text) — Event name (editable)
- estimated_value (decimal) — Event value (editable)
- product_cat (text) — Product category
- product_name (text) — Product name
- place (text) — Event location
- op_stage (text) — Current stage in pipeline
- position (integer) — Order within stage
- created_at (timestamp)
```

#### `activities`
```sql
- id (UUID) — Primary key
- job_id (UUID) — Related job (nullable)
- type (text) — activity|note|call|email|status_change
- title (text) — Activity title
- description (text) — Details
- user_id (UUID) — Who did it
- timestamp (timestamp) — When
```

#### `tasks`
```sql
- id (UUID) — Primary key
- title (text) — Task name
- description (text) — Details
- due_date (date) — When due
- completed (boolean) — Is done?
- assigned_to (UUID) — Owner
- created_at (timestamp)
```

#### `staff`
```sql
- id (UUID) — Primary key
- name (text) — Staff member name
- email (text) — Email
- phone (text) — Phone
- role (text) — Job title
- is_active (boolean) — Currently available?
- created_at (timestamp)
```

#### `dynamic_op_stages`
```sql
- id (UUID) — Primary key
- name (text) — Stage name (e.g., "Won", "Ready for OP")
- order (integer) — Display order
- color (text) — Tailwind color name
- created_at (timestamp)
```

#### `users` (Phase 2.0+)
```sql
- id (UUID) — References auth.users
- email (text) — Unique email
- name (text) — Display name
- role (text) — admin|operation|sales
- is_active (boolean)
- created_at (timestamp)
```

---

## Row Level Security (RLS)

### Policy: Users see only their data
```sql
-- Example: Users can see leads assigned to them
CREATE POLICY "Users see own leads"
  ON lead_opportunities FOR SELECT
  USING (assigned_to = auth.uid());

-- Admins see everything
CREATE POLICY "Admins see all"
  ON lead_opportunities FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
```

### Verification Checklist
- [ ] RLS enabled on all tables (Settings → Security)
- [ ] Policies tested (try accessing others' data - should fail)
- [ ] Admin role can bypass restrictions
- [ ] Activity logging works across RLS

---

## Indexes (Performance)

### Created Indexes
```sql
CREATE INDEX idx_won_jobs_op_stage ON won_jobs(op_stage);
CREATE INDEX idx_won_jobs_position ON won_jobs(position);
CREATE INDEX idx_won_jobs_company_id ON won_jobs(company_id);
CREATE INDEX idx_activities_job_id ON activities(job_id);
CREATE INDEX idx_lead_opportunities_status ON lead_opportunities(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

---

## Local Supabase Setup

### Prerequisites
- Docker installed and running
- Node.js 18+

### One-Time Setup
```bash
# Start local Supabase
npm run db:start
# Output will show: http://localhost:54321

# Enable local database in .env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### Common Commands
```bash
npm run db:start          # Start local Supabase
npm run db:stop           # Stop Supabase
npm run db:status         # Check if running
npm run db:pull           # Sync schema from production → local
npm run db:push           # Push local changes → production
npm run dev               # Start app (uses .env.local)
```

### Workflow for Feature Development
```bash
# 1. Start local environment
npm run db:start
npm run dev

# 2. Test feature locally (safe, no production impact)
# Create test users, test RLS, try breaking things

# 3. Commit your changes
git add .
git commit -m "feat: add new feature"

# 4. Switch back to production DB for deployment
# Comment out NEXT_PUBLIC_SUPABASE_URL=http://localhost:...
# in .env.local

# 5. Push to GitHub (triggers Vercel deploy)
git push origin main
# Vercel auto-uses production ENV variables

# 6. Stop local Supabase when done
npm run db:stop
```

---

## Project Credentials

```
Project ID:     ujgiaqfuywnrimjjcekb
Database Host:  ujgiaqfuywnrimjjcekb.db.supabase.co
Public API URL: https://ujgiaqfuywnrimjjcekb.supabase.co
Anon Key:       sb_publishable_dw3cU7CuTDOQCf0m3jGqog_L1qe0tlr
```

⚠️ **IMPORTANT:** Never commit `.env.local` with real keys!

---

## Troubleshooting

### "Column already exists" error
→ **Cause:** Tables already created in previous run  
→ **Solution:** Normal, SQL uses `CREATE TABLE IF NOT EXISTS`  

### "Permission denied" error
→ **Cause:** Wrong credentials or wrong user role  
→ **Solution:** Use postgres superuser (not authenticated role)  

### Data not showing in app
→ **Cause:** App still using mock data or stale cache  
→ **Solution:**
  1. Hard refresh: Ctrl+Shift+R (Cmd+Shift+R)
  2. Check browser console: Any errors?
  3. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in .env.local
  4. Check Supabase dashboard: Data actually in tables?

### Local Supabase won't start
→ Check Docker is running: `docker ps`  
→ Restart Docker, then: `npm run db:start`  

### Schema out of sync
→ Pull latest: `npm run db:pull`  
→ Restart dev: `npm run dev`  

---

## Next Steps

1. **Today:** Verify database connection
   ```bash
   npm run dev
   # Check: Dashboard loads? Data showing?
   ```

2. **Before deployment:** Test migrations on staging
   - Apply SQL migrations in Supabase SQL Editor
   - Verify all tables created
   - Test RLS policies

3. **For Phase 2.0:** Add users table
   - Run migration with new schema
   - Set up Google OAuth
   - Configure RLS for role-based access

---

**Last Updated:** June 8, 2026  
**Database:** Supabase PostgreSQL  
**Status:** ✅ Production Ready
