# Local Testing Guide - Phase 2.0

**Status:** ✅ Ready for local testing  
**No Docker Required:** Use mock authentication instead  
**Time to Test:** 2 minutes  

---

## 🧪 Local Testing Mode

Phase 2.0 includes a **local testing mode** that lets you test the complete authentication flow without needing Supabase or Google OAuth setup.

### What's Included

✅ **Mock Authentication** - 3 test users built-in  
✅ **Test Login Page** - Role-based sign-in  
✅ **Session Management** - localStorage persistence  
✅ **Admin Panel** - Fully functional with mock data  
✅ **Real Auth Flow** - Tests complete redirect/middleware logic  

---

## 🚀 Quick Start - 2 Minutes

### Step 1: Start Dev Server

```bash
npm run dev
```

You should see:
```
✓ Ready in 317ms
- Local: http://localhost:3000
```

### Step 2: Go to Test Login Page

Open in browser:
```
http://localhost:3000/login-test
```

You should see:
- **SX CRM** title
- **Testing Mode (Mock Auth)** badge (yellow)
- **3 role cards:**
  - Admin User (purple)
  - Operations User (blue)
  - Sales User (green)

### Step 3: Sign In as Admin

Click the **Admin User** card's "Sign In" button

You'll see:
- "Signing in..." loading state
- ~500ms delay (simulating network)
- Redirect to `/won-ready-op` dashboard
- **User profile appears in sidebar** (bottom-left)
  - Avatar with initials
  - Name: "Admin User"
  - Role: "admin"

### Step 4: Test Admin Panel

1. Click your **profile in sidebar** (bottom-left corner)
2. **Dropdown menu appears:**
   - Admin Panel link (only for admins!)
   - Sign Out button
3. Click **Admin Panel**
4. You'll see `/admin/users` page with:
   - User list (3 mock users)
   - Role dropdowns
   - Active/inactive toggles
   - Delete buttons (with confirmation)

### Step 5: Test Sign Out

1. Click profile in sidebar
2. Click **Sign Out**
3. Redirected to `/login`
4. Session cleared

### Step 6: Test Session Persistence

1. Sign in again as Admin
2. **Refresh the page** (Cmd+R or F5)
3. Session persists - still signed in!
4. Profile still visible in sidebar

---

## 📋 Test Users

### Admin User
- **Email:** champ@sixsheet.me
- **Role:** admin
- **Access:** Full app + /admin/users panel
- **Use for:** Testing admin features

### Operations User
- **Email:** operation@sixsheet.me
- **Role:** operation
- **Access:** Full app (no admin panel)
- **Use for:** Testing non-admin access

### Sales User
- **Email:** sales@sixsheet.me
- **Role:** sales
- **Access:** Full app (no admin panel)
- **Use for:** Testing basic user access

---

## 🔄 How Mock Auth Works

### Under the Hood

```
User clicks "Sign In"
  ↓
mockSignIn(role) called
  ↓
Mock user data created
  ↓
Stored in localStorage
  ↓
Auth provider reads from localStorage
  ↓
User profile appears in sidebar
  ↓
Can access app features
```

### Session Storage

Sessions stored in **localStorage** as JSON:
```javascript
localStorage.getItem('mock_auth_session')

// Returns:
{
  "id": "mock-admin-id",
  "email": "champ@sixsheet.me",
  "name": "Admin User",
  "role": "admin",
  "is_active": true,
  "created_at": "2026-06-05T..."
}
```

### Real Auth Integration

Mock auth integrates with real auth utilities:
- `getCurrentUser()` checks mock session first
- `signOut()` clears mock session
- `useAuth()` hook works with mock data
- Middleware respects mock sessions

---

## 🧪 Testing Checklist

Run through this checklist to verify everything works:

### Authentication Flow
- [ ] Go to `/login-test`
- [ ] Admin card displayed with sign-in button
- [ ] Click sign-in, see loading state
- [ ] Redirected to `/won-ready-op` dashboard
- [ ] User profile visible in sidebar

### User Profile Display
- [ ] Profile shows in bottom-left of sidebar
- [ ] Avatar with initials displayed
- [ ] Name shows correctly
- [ ] Role shows correctly
- [ ] Profile clickable (opens dropdown)

### Admin Dropdown Menu
- [ ] Click profile → dropdown appears
- [ ] "Admin Panel" link visible (admin only!)
- [ ] "Sign Out" button visible
- [ ] Click Admin Panel → goes to `/admin/users`
- [ ] Click Sign Out → goes to `/login`

### Admin Panel
- [ ] `/admin/users` page loads
- [ ] User list shows 3 test users
- [ ] Can search by email
- [ ] Can change role dropdown
- [ ] Can toggle active/inactive
- [ ] Can delete with confirmation
- [ ] Deletions update mock data

### Non-Admin Access
- [ ] Sign in as Sales user
- [ ] No "Admin Panel" link in dropdown
- [ ] Cannot access `/admin/users` directly
  - Redirected if try to go to `/admin/users`
- [ ] Can sign out normally

### Session Persistence
- [ ] Sign in as Admin
- [ ] Refresh page (Cmd+R)
- [ ] Still signed in
- [ ] Profile still visible
- [ ] Can still access admin panel

### Sign Out
- [ ] Click profile → dropdown
- [ ] Click "Sign Out"
- [ ] Redirected to `/login`
- [ ] Session cleared
- [ ] Must sign in again to access app

### Route Protection
- [ ] Try accessing `/won-ready-op` while logged out
- [ ] Redirected to `/login`
- [ ] Can only access unprotected routes:
  - `/login` ✓
  - `/login-test` ✓
  - `/auth/callback` ✓
- [ ] All other routes require auth

---

## 🔍 Debugging Tips

### Check Mock Session
Open browser **DevTools** → **Console**:
```javascript
// See current session
localStorage.getItem('mock_auth_session')

// Clear session (simulates sign out)
localStorage.removeItem('mock_auth_session')

// Manually set admin session
localStorage.setItem('mock_auth_session', JSON.stringify({
  id: 'mock-admin-id',
  email: 'champ@sixsheet.me',
  name: 'Admin User',
  role: 'admin',
  is_active: true,
  created_at: new Date().toISOString()
}))
```

### Check Auth State
In React DevTools:
```
Components tab
→ Look for AuthProvider
→ Check `user` prop
→ Should show current user object
```

### Verify Routes
Test route protection:
```
/login → ✓ Always accessible
/login-test → ✓ Always accessible
/won-ready-op → ❌ Redirects to /login if not authed
/admin/users → ❌ Redirects if not admin
/customers → ❌ Redirects to /login if not authed
```

---

## ⚙️ Mock Auth Files

### Main Files

**`lib/supabase/mock-auth.ts`** (118 lines)
- `mockSignIn(role)` - Sign in as test user
- `getMockSession()` - Get current session
- `mockSignOut()` - Clear session
- `getMockUsers()` - Get all test users
- `updateMockUserRole()` - Change user role
- `toggleMockUserActive()` - Toggle active status

**`app/login-test/page.tsx`** (150+ lines)
- Test login page with 3 role cards
- "How This Works" info box
- "Testing Checklist" reference
- Sign-in flow with loading states

### Integration Points

**`lib/supabase/auth.ts`** (Updated)
- `getCurrentUser()` - Checks mock session first
- `signOut()` - Clears mock session
- `onAuthStateChange()` - Watches mock sessions

**`app/admin/users/page.tsx`** (Updated)
- `loadUsers()` - Uses mock users when in test mode
- `handleRoleChange()` - Updates mock role
- `handleToggleActive()` - Toggles mock active status
- `handleDeleteUser()` - Deletes mock user

**`middleware.ts`** (Updated)
- `/login-test` whitelisted from auth

---

## 🎯 When to Use Local Testing

Use **mock auth** for:
- ✅ Testing auth flow locally
- ✅ Testing UI/UX of login pages
- ✅ Testing admin panel features
- ✅ Testing route protection
- ✅ Testing middleware
- ✅ Testing without Supabase/Google
- ✅ CI/CD testing in pipelines

Use **real auth** for:
- ✅ Testing with real Google OAuth
- ✅ Testing email verification
- ✅ Testing password reset
- ✅ Testing multi-tenant scenarios
- ✅ Production testing

---

## 📊 Comparison: Mock vs Real Auth

| Feature | Mock Auth | Real Auth |
|---------|-----------|-----------|
| **Setup Required** | None | Supabase + Google |
| **Speed** | Instant | ~500ms |
| **Persistence** | localStorage | Supabase |
| **Multi-user** | No | Yes |
| **Email Verification** | No | Yes |
| **Role Persistence** | Session only | Database |
| **Good for** | Local testing | Production |

---

## 🚀 Moving to Real Auth

When ready to test with real Supabase:

### 1. Create Supabase Account
- Go to [supabase.com](https://supabase.com)
- Create project
- Get URL and API key

### 2. Configure Google OAuth
- Get Google OAuth credentials
- Add to Supabase
- Configure redirect URI

### 3. Update .env.local
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### 4. Apply Database Schema
Run SQL in Supabase to create `users` table

### 5. Switch to Real Login
- Go to `/login` (not `/login-test`)
- Click "Sign in with Google"
- Complete Google OAuth flow

### Fallback to Mock Auth
If real auth fails, you can always fall back to `/login-test` for testing

---

## 📚 Related Documentation

- **`PHASE_2_0_IMPLEMENTATION.md`** - Full auth implementation details
- **`PHASE_2_0_SUMMARY.md`** - Feature overview
- **`PHASE_2_0_QUICK_START.md`** - Real auth setup guide

---

## ✅ Summary

**Local testing with mock auth:**
1. ✅ No Docker required
2. ✅ No Supabase setup needed
3. ✅ No Google OAuth needed
4. ✅ Complete auth flow testing
5. ✅ Admin panel fully functional
6. ✅ Route protection working
7. ✅ Session persistence working
8. ✅ Ready for development

**Get started in 2 minutes:**
```bash
npm run dev
# Then open: http://localhost:3000/login-test
```

Happy testing! 🎉
