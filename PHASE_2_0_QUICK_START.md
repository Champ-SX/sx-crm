# Phase 2.0: Quick Start Guide

**⏱️ Time to complete:** 15-20 minutes  
**🎯 Goal:** Finish setting up Google OAuth in Supabase  
**✅ Status:** All code done, just need Supabase config

---

## 🔥 3 Steps to Go Live

### Step 1: Apply Database Schema (5 min)

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **ujgiaqfuywnrimjjcekb**
3. Go to **SQL Editor** (left sidebar)
4. Click **New query**
5. **Copy this entire SQL block:**

```sql
-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operation', 'sales')) DEFAULT 'sales',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin can read all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update user roles"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can delete users"
  ON public.users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_users_updated_at_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_users_updated_at();
```

6. **Paste into SQL Editor**
7. Click **Run** (green button)
8. ✅ You should see "Query succeeded"

---

### Step 2: Enable Google OAuth (5 min)

1. In Supabase Dashboard, go to **Authentication** (left sidebar)
2. Click **Providers**
3. Find **Google** in the list
4. Click the **Google** row to expand it
5. Toggle **Enabled** to ON
6. You'll see a form asking for:
   - **Client ID**
   - **Client Secret**

#### Get Google OAuth Credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project (or use existing)
3. Search for **"Google+ API"** or **"OAuth 2.0"**
4. Enable it
5. Go to **Credentials** (left sidebar)
6. Click **Create Credentials** → **OAuth 2.0 Client ID**
7. Choose **Web application**
8. Under **Authorized redirect URIs**, add:
   ```
   https://ujgiaqfuywnrimjjcekb.supabase.co/auth/v1/callback
   ```
9. Click **Create**
10. Copy:
    - **Client ID** → Paste in Supabase
    - **Client Secret** → Paste in Supabase
11. Click **Save** in Supabase
12. ✅ Google OAuth is now enabled

---

### Step 3: Create Admin User (5 min)

Choose one of these methods:

#### Method A: Via Google Sign-In (Easiest)

1. Go to http://localhost:3000/login
2. Click **Sign in with Google**
3. Use your email (champ@sixsheet.me)
4. You'll see a loading spinner
5. ✅ Redirected to dashboard with "Sign Out" in sidebar
6. Go back to Supabase SQL Editor
7. Run this SQL to make yourself admin:

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'champ@sixsheet.me';
```

8. ✅ Done! You now have admin access

#### Method B: Via Supabase Dashboard

1. In Supabase → **Authentication** → **Users**
2. Click **Add User**
3. Enter your email: `champ@sixsheet.me`
4. Set temporary password
5. Click **Create User**
6. Go to **SQL Editor**
7. Run:

```sql
INSERT INTO public.users (id, email, name, role, is_active)
SELECT id, email, 'Your Name', 'admin', true
FROM auth.users
WHERE email = 'champ@sixsheet.me'
ON CONFLICT (email) DO NOTHING;
```

8. ✅ Admin user created

---

## ✅ Verify Everything Works

### Local Testing

```bash
# Terminal 1: Dev server should already be running
# If not:
npm run dev

# It will show:
# ✓ Ready in 317ms
# - Local: http://localhost:3000
```

### Browser Testing (http://localhost:3000)

**Test Case 1: Unauthenticated User**
1. Open http://localhost:3000 (or any page)
2. ✅ Auto-redirects to /login
3. ✅ Login page displays with Google button

**Test Case 2: Sign In**
1. Click **Sign in with Google**
2. ✅ Google dialog appears
3. ✅ Select your email
4. ✅ Grant permission
5. ✅ Redirected to /won-ready-op
6. ✅ Sidebar shows your profile with role

**Test Case 3: Admin Panel (if admin)**
1. Click your profile in sidebar (bottom-left)
2. ✅ Dropdown appears
3. ✅ "Admin Panel" link visible
4. Click **Admin Panel**
5. ✅ Goes to /admin/users
6. ✅ See user list
7. Try changing roles, deactivating, etc.

**Test Case 4: Sign Out**
1. Click profile in sidebar
2. Click **Sign Out**
3. ✅ Redirected to /login
4. ✅ Can't access dashboard without signing in again

---

## 🎯 What You Just Enabled

After completing these 3 steps, users can:

✅ Sign in via Google  
✅ Have their profile automatically created  
✅ Get default "sales" role assigned  
✅ Admins can change user roles  
✅ Access is role-based  
✅ Sessions persist  
✅ All routes protected  
✅ Admin panel fully functional  

---

## 🚀 Deploy to Production

Once local testing passes:

```bash
git push origin main
# Vercel auto-deploys
# Check: https://sx-crm.vercel.app
```

---

## 📝 Troubleshooting

### Problem: Login page shows but Google button doesn't work
**Solution:** Make sure Google OAuth is **Enabled** in Supabase dashboard

### Problem: Sign in succeeds but user not in database
**Solution:** Make sure SQL migration ran successfully - check in Supabase → **Tables** → look for "users" table

### Problem: Admin can't see other users
**Solution:** Make sure RLS policies were created - check in Supabase → **Authentication** → **Policies**

### Problem: "Multiple GoTrueClient instances" warning
**Solution:** This is just a development warning, doesn't affect functionality. Can fix in Phase 3.

---

## 📚 Documentation

For detailed info, see:
- **`PHASE_2_0_IMPLEMENTATION.md`** - Complete setup guide
- **`PHASE_2_0_SUMMARY.md`** - Feature overview
- **Code comments** in `lib/supabase/auth.ts`

---

## ⏱️ Timeline

- **Today (June 5):** Code implementation ✅
- **Today (June 5):** Local testing ✅
- **Now:** Supabase setup (15 min)
- **Friday (June 14):** Deploy to production 🚀

---

**Status:** You have the code. Now just need to:  
1. ✅ Apply SQL to Supabase (copy-paste, 1 click)
2. ✅ Enable Google OAuth (flip toggle, paste 2 credentials)
3. ✅ Create admin user (sign in with Google + run SQL)

**Total time:** 15-20 minutes ⏰

Let me know when you've completed these steps! 🎉
