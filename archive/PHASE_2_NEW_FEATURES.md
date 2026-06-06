# Phase 2 Addition: Authentication, Authorization & Lead States

**Status:** Ready for Development  
**Integration Point:** Phase 2.0-2.1 (Before Tab-Based Mobile Redesign)  
**Timeline:** 1-2 weeks  
**Priority:** High - Unlocks role-based features and user management

---

## 🎯 Feature Overview

### Feature 1: Google Login + Admin Role Assignment
- Users sign in via Google OAuth
- Admin (you) assigns roles: Operation, Sales, Admin
- Role persisted in Supabase
- Session management via Supabase auth

### Feature 2: Role-Based Dashboards
- **Operation Role:** Pipeline health, stage metrics, team productivity
- **Sales Role:** Personal targets, opportunity value, conversion rates  
- **Admin Role:** Full analytics + user management

### Feature 3: Negotiating Lead State
- New lead status: Negotiating
- Appears in All/Open/Negotiating/Won/Lost filters
- Color-coded badge
- Workflow integration

---

## 📋 Implementation Plan

### PART 1: Google OAuth + User Management

#### 1.1 Supabase Authentication Setup

**File:** `app/layout.tsx` (update auth provider)

**Steps:**
1. Enable Google OAuth in Supabase project settings
2. Add Google Client ID to environment variables
3. Create Supabase auth client

**New ENV Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
```

**Code Changes:**
```tsx
// app/layout.tsx
import { createClient } from '@/utils/supabase/client'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  
  // Use Supabase auth context for Google login
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

**Estimate:** 1.5 hours

---

#### 1.2 Create Users & Roles Table in Supabase

**Database Schema:**

```sql
-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operation', 'sales')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for role-based queries
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_is_active ON public.users(is_active);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin can read all users"
  ON public.users FOR SELECT
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin can update user roles"
  ON public.users FOR UPDATE
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
```

**Estimate:** 1 hour

---

#### 1.3 Create Admin User Management Page

**File:** `app/admin/users/page.tsx` (NEW)

**Features:**
- List all users with their roles
- Assign/change role: Operation, Sales
- Deactivate/reactivate users
- View last login date
- Search by email/name

**UI Layout:**
```
┌─────────────────────────────────────────┐
│ Admin: User Management                  │
├─────────────────────────────────────────┤
│ [Search by email...]  [+ Invite User]   │
├─────────────────────────────────────────┤
│ Email          | Name    | Role    | ... │
├─────────────────────────────────────────┤
│ user@email.com | John    | [Sales▼] │ ✓ │
│ sales@email.com| Jane    | [Op▼]    │ ✓ │
│ new@email.com  | New     | [Pend..] │ ✗ │
└─────────────────────────────────────────┘
```

**Components:**
- `UserListTable` - Display all users
- `RoleSelector` - Dropdown for role assignment
- `UserActions` - Activate/deactivate buttons
- `InviteUserModal` - Send invites

**Store Updates:** `store/crm-store.ts`
```ts
// Add to Zustand store
interface CRMStore {
  currentUser: {
    id: string
    email: string
    name: string
    role: 'admin' | 'operation' | 'sales'
  }
  users: User[]
  
  // Actions
  setCurrentUser: (user: User) => void
  fetchUsers: () => Promise<void>
  updateUserRole: (userId: string, role: string) => Promise<void>
  deactivateUser: (userId: string) => Promise<void>
}
```

**Estimate:** 3-4 hours

---

#### 1.4 Create Login Page

**File:** `app/auth/login/page.tsx` (NEW)

**Features:**
- Google Sign-In button (Supabase OAuth)
- Redirect to home after login
- Show loading state
- Error handling for failed logins

**UI:**
```
┌─────────────────────────┐
│  SX CRM                 │
│                         │
│  Sign in with Google    │
│  [Google Button]        │
│                         │
│  or                     │
│                         │
│  Email: [____]          │
│  Pass:  [____]          │
│  [Login]                │
└─────────────────────────┘
```

**Code Pattern:**
```tsx
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  
  const handleGoogleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <button onClick={handleGoogleLogin}>
        Sign in with Google
      </button>
    </div>
  )
}
```

**Files to Create:**
- `app/auth/login/page.tsx`
- `app/auth/callback/route.ts` (OAuth callback handler)
- `utils/supabase/client.ts` (Supabase client)

**Estimate:** 2 hours

---

### PART 2: Role-Based Dashboards

#### 2.1 Redesign Dashboard Component

**File:** `app/dashboard/page.tsx` (MODIFIED)

**Current State:**
```
All users see:
- Admin view selector
- Stat cards (all metrics)
- OP Pipeline section
```

**New State:**
```
Admin sees:
├─ Admin View selector
├─ Full metrics (all customers, leads, jobs, ops)
├─ Team performance breakdown
└─ User activity log

Operation sees:
├─ Pipeline health (current stage breakdown)
├─ Open opportunities count
├─ Jobs by stage
├─ Team members' open tasks
└─ Upcoming deadlines

Sales sees:
├─ My pipeline (personal opportunities)
├─ Target progress (YTD sales vs target)
├─ Win rate this month
├─ Upcoming meetings
└─ Recent activities
```

#### 2.2 Create Role-Specific Dashboard Components

**Components to Create:**

1. **AdminDashboard** (`components/dashboard/admin-dashboard.tsx`)
   - System health metrics
   - User activity log
   - Team performance matrix
   - Database statistics
   - System alerts

2. **OperationDashboard** (`components/dashboard/operation-dashboard.tsx`)
   - Pipeline health by stage
   - Bottleneck identification
   - Job throughput metrics
   - Team workload distribution
   - SLA compliance

3. **SalesDashboard** (`components/dashboard/sales-dashboard.tsx`)
   - Personal pipeline
   - Target progress (visual gauge)
   - Monthly/quarterly forecast
   - Deal velocity
   - Top opportunities

**Data Queries:**
```ts
// In store/crm-store.ts, add role-aware queries:

// Operation: Get pipeline metrics by stage
getOperationDashboardMetrics: () => {
  return opStages.map(stage => ({
    name: stage.label,
    count: wonJobs.filter(job => job.stage_id === stage.id).length,
    avgValue: calculateAverage(jobsInStage),
    daysInStage: calculateAverageDaysInStage(stage.id)
  }))
}

// Sales: Get user's personal pipeline
getSalesDashboardMetrics: (userId: string) => {
  return {
    totalPipeline: wonJobs.filter(job => job.owner_id === userId).sum(),
    targetProgress: calculateProgressToTarget(userId),
    winRate: calculateMonthlyWinRate(userId),
    recentActivities: activities.filter(a => a.user_id === userId).slice(0, 10)
  }
}
```

**Styling:** Tailwind, consistent with existing design

**Estimate:** 6-8 hours

---

#### 2.3 Add Role Check to Route Protection

**File:** `middleware.ts` (NEW or UPDATE)

**Purpose:** Prevent unauthorized access to pages

```ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  // Get user role from database
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // Check route permissions
    if (request.pathname.startsWith('/admin') && userData?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
}
```

**Estimate:** 1 hour

---

### PART 3: Add "Negotiating" Lead State

#### 3.1 Update Leads Table in Supabase

**Migration:**
```sql
-- Add negotiating status if not exists
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('open', 'negotiating', 'won', 'lost'));

-- Update existing records to have valid status
UPDATE leads SET status = 'open' WHERE status IS NULL;

-- Add index for filtering
CREATE INDEX idx_leads_status ON leads(status);
```

**Estimate:** 0.5 hours

---

#### 3.2 Update Leads Page UI

**File:** `app/leads-opportunities/page.tsx` (MODIFIED)

**Changes:**

1. **Update filter tabs** (lines ~80-100):
```tsx
const STATUS_FILTERS = {
  all: 'All',
  open: 'Open',
  negotiating: 'Negotiating',
  won: 'Won',
  lost: 'Lost'
}

// Update filter counts
const statusCounts = {
  all: leads.length,
  open: leads.filter(l => l.status === 'open').length,
  negotiating: leads.filter(l => l.status === 'negotiating').length,
  won: leads.filter(l => l.status === 'won').length,
  lost: leads.filter(l => l.status === 'lost').length,
}
```

2. **Update status badge colors** (lines ~200-250):
```tsx
const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  negotiating: 'bg-amber-100 text-amber-800',  // NEW: Orange/amber
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
}
```

3. **Update status selector in lead detail** (lines ~400-450):
```tsx
// Add Negotiating to status dropdown
const statusOptions = ['open', 'negotiating', 'won', 'lost']

<select value={lead.status} onChange={(e) => updateLeadStatus(lead.id, e.target.value)}>
  {statusOptions.map(status => (
    <option key={status} value={status}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </option>
  ))}
</select>
```

**Store Updates:** `store/crm-store.ts`
```ts
updateLeadStatus: async (leadId: string, status: 'open' | 'negotiating' | 'won' | 'lost') => {
  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId)
  
  if (!error) {
    // Update local state
    set(state => ({
      leads: state.leads.map(l => 
        l.id === leadId ? { ...l, status } : l
      )
    }))
  }
}
```

**Activity Logging:**
- Log status changes to activity table automatically

**Estimate:** 1.5 hours

---

## 📊 Integration into Phase 2 Timeline

### Updated Phase 2 Schedule

**Week 1: Authentication & Authorization**
- Mon-Tue: Supabase Google OAuth setup + Users table (1.5 + 1 = 2.5h)
- Wed-Thu: Admin user management page (3-4h)
- Fri: Login page + route protection, testing, **Deploy Phase 2.0** ✅

**Week 2: Role-Based Dashboards**
- Mon-Tue: Redesign dashboard components (6-8h)
- Wed-Thu: Role-specific metrics queries (3-4h)
- Fri: Testing + polish, **Deploy Phase 2.1** ✅

**Week 2-3: Concurrent - Add Negotiating State**
- Can be done anytime alongside 2.0-2.1
- Quick feature (1.5h total)
- Deploy with 2.1 checkpoint

**Week 3+: Continue with original Phase 2.2+ features**

---

## 🗂️ Files to Create/Modify

### Create (NEW)
```
app/auth/
├── login/page.tsx
└── callback/route.ts

app/admin/
└── users/page.tsx

components/dashboard/
├── admin-dashboard.tsx
├── operation-dashboard.tsx
└── sales-dashboard.tsx

utils/supabase/
├── client.ts
└── server.ts

middleware.ts
```

### Modify (EXISTING)
```
app/layout.tsx              (Add auth context)
app/dashboard/page.tsx      (Add role check, show role-specific component)
app/leads-opportunities/page.tsx  (Add negotiating state)
store/crm-store.ts          (Add user & role management)
.env.local                  (Add Google OAuth credentials)
```

### Database (Supabase)
```sql
-- Create users table
-- Create user roles table
-- Add status to leads
-- RLS policies
```

---

## 🔐 Security Considerations

1. **Row Level Security (RLS)**
   - Implement RLS on users table
   - Restrict users from changing their own role
   - Only admin can assign roles

2. **Auth Context**
   - Verify auth on every page load
   - Redirect unauthenticated users to login

3. **Environment Variables**
   - Store Google Client ID securely
   - Never expose Supabase private key

4. **Session Management**
   - Use Supabase sessions (HTTP-only cookies)
   - Auto-logout on token expiration

---

## ✅ Success Criteria

- ✅ Google login working (tested with real Google account)
- ✅ User roles assigned and persisted in Supabase
- ✅ Admin user management page fully functional
- ✅ Role-based dashboard shows correct metrics for each role
- ✅ Negotiating state appears in lead filters and cards
- ✅ Route protection prevents unauthorized access
- ✅ Zero console errors
- ✅ Mobile responsive at 375px+
- ✅ All existing Phase 1 features still working

---

## 📝 Testing Checklist

- [ ] Google login redirects to callback
- [ ] New user created in users table with role
- [ ] Admin can assign/change roles
- [ ] Users see role-appropriate dashboard
- [ ] Operation role sees pipeline health
- [ ] Sales role sees personal metrics
- [ ] Negotiating state shows in lead filters
- [ ] Status change logs to activity
- [ ] Protected routes redirect unauthenticated users
- [ ] Mobile: All dashboards responsive at 375px
- [ ] Mobile: Role selector and status updates work on touch

---

**Last Updated:** June 3, 2026  
**Status:** Ready for Implementation  
**Next Step:** Begin Phase 2.0 - Authentication & Role Management

