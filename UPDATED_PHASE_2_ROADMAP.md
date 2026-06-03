# Phase 2 Roadmap - UPDATED WITH NEW FEATURES

**Status:** Ready for Development  
**Timeline:** 3-4 weeks (increased from 2-4 weeks due to new features)  
**Priority:** High Impact on Mobile Experience & User Management

---

## 🎯 Phase 2 Overview

Phase 2 focuses on three major areas:
1. **Authentication & Authorization** - Google login + role management
2. **Role-Based Dashboards** - Different metrics for each role
3. **Mobile UX Improvements** - Tab-based redesign for mobile
4. **Advanced Features** - Search, analytics, integrations

---

## 📅 WEEK 1: Authentication & Authorization

### Mon-Tue: Supabase Google OAuth Setup
**Duration:** 1.5 hours
- Enable Google OAuth in Supabase
- Create Supabase auth client
- Add environment variables
- Auth provider context setup

### Wed-Thu: Users Table & Admin Panel
**Duration:** 4-5 hours
- Create `users` table in Supabase with RLS
- Create admin user management page (`app/admin/users/page.tsx`)
- Role assignment UI (Operation, Sales, Admin)
- User listing with search and filters

### Fri: Login Page & Route Protection
**Duration:** 2-3 hours
- Create login page (`app/auth/login/page.tsx`)
- OAuth callback handler
- Middleware for route protection
- Testing & deploy

**Week 1 Total:** 7-8 hours
**Deploy:** Phase 2.0 (Authentication & Authorization)

---

## 📅 WEEK 2: Role-Based Dashboards

### Mon-Tue: Dashboard Architecture & Admin View
**Duration:** 3-4 hours
- Refactor `app/dashboard/page.tsx`
- Create `components/dashboard/admin-dashboard.tsx`
- System health metrics
- Team performance matrix
- User activity log

### Wed-Thu: Operation & Sales Dashboards
**Duration:** 5-6 hours
- Create `components/dashboard/operation-dashboard.tsx`
  - Pipeline health by stage
  - Job throughput metrics
  - Team workload distribution
- Create `components/dashboard/sales-dashboard.tsx`
  - Personal pipeline view
  - Target progress gauge
  - Win rate metrics

### Fri: Testing & Deploy
**Duration:** 2 hours
- Role-specific metric queries
- Testing across all dashboards
- Mobile responsiveness check
- Deploy Phase 2.1

**Week 2 Total:** 10-12 hours
**Deploy:** Phase 2.1 (Role-Based Dashboards)

---

## 📅 WEEK 2-3: Add "Negotiating" Lead State (Concurrent)

Can be done alongside Week 2 work.

**Duration:** 1.5-2 hours total
- Update leads table in Supabase (add negotiating status)
- Update Leads page UI with new filter tab
- Add status badge colors
- Deploy with 2.1 checkpoint

**Files:**
- `app/leads-opportunities/page.tsx` (modify filters & status selector)
- `store/crm-store.ts` (add updateLeadStatus method)

---

## 📅 WEEK 3: Mobile Tab-Based Redesign

**Originally Phase 2.0, now Phase 2.2**

### Mon-Tue: Tab Component Development
**Duration:** 3-4 hours
- Create `components/shared/detail-tabs.tsx`
- Mobile horizontal tabs
- Desktop sidebar unchanged
- Animation & transitions

### Wed-Thu: Integration on Pages
**Duration:** 2-3 hours
- Integrate TabContainer on Customers page
- Integrate TabContainer on Leads page
- Test on mobile devices
- Polish responsive behavior

### Fri: Testing & Deploy
**Duration:** 1-2 hours
- Mobile verification (375px, 480px, 640px)
- Desktop regression testing
- Deploy Phase 2.2

**Week 3 Total:** 6-9 hours
**Deploy:** Phase 2.2 (Mobile Tab-Based Interface)

---

## 📅 WEEK 4: Advanced Features (Phase 2.3+)

### Mon-Tue: Enhanced Search & Filtering (Phase 2.3)
**Duration:** 6-8 hours
- Global search across all data
- Custom filter saving
- Quick filters UI
- Search history

### Wed-Thu: Advanced Analytics (Phase 2.4)
**Duration:** 4-6 hours
- Revenue trend charts
- Win rate analytics
- Pipeline health charts
- Custom report builder (basic)

### Fri: Polish & Deploy
**Duration:** 2 hours
- Testing
- Deploy Phase 2.3 & 2.4

---

## 🗂️ Complete Phase 2 Feature List

### Phase 2.0: Authentication & Authorization ✨ NEW
- [x] Google OAuth login
- [x] Admin user management
- [x] Role assignment (Operation, Sales, Admin)
- [x] Route protection
- [x] Session management

### Phase 2.1: Role-Based Dashboards ✨ NEW
- [x] Admin dashboard (system health, user activity)
- [x] Operation dashboard (pipeline, throughput, workload)
- [x] Sales dashboard (personal pipeline, targets, win rate)
- [x] Role-specific metrics queries

### Phase 2.2: Mobile Tab-Based Interface
- [x] Horizontal tabs on mobile
- [x] Details | Activity | History tabs
- [x] Desktop sidebar layout preserved
- [x] Smooth transitions

### Phase 2.3: Enhanced Search & Filtering
- [ ] Global search
- [ ] Custom filter builder
- [ ] Save filter preferences
- [ ] Search history

### Phase 2.4: Advanced Analytics
- [ ] Revenue charts
- [ ] Win rate by stage
- [ ] Pipeline health metrics
- [ ] Team performance breakdown

### Phase 2.5: Batch Operations
- [ ] Bulk reassign
- [ ] Batch status updates
- [ ] Bulk export (CSV, PDF)

### Phase 2.6: External Integrations
- [ ] Slack (notifications)
- [ ] Google Calendar (sync)
- [ ] Email (thread history)

### Phase 2.7: Role Management UI
- [ ] Advanced permissions
- [ ] Activity logging
- [ ] 2FA setup

### Phase 2.8: Custom Fields
- [ ] User-defined fields
- [ ] Field types (text, number, select, date)
- [ ] Validation rules

---

## ✨ NEW FEATURE: Negotiating Lead State

Added as concurrent feature during Week 2-3:
- [x] New status: "Negotiating"
- [x] Filter tab in Leads page
- [x] Status badge colors
- [x] Status dropdown in lead detail
- [x] Activity logging for status changes

**Timeline:** 1.5-2 hours (concurrent with Week 2)
**Deploy:** With Phase 2.1 checkpoint

---

## 📊 Updated Implementation Timeline

```
Week 1 (Mon-Fri)     │ Auth & Authorization        │ Deploy 2.0 ✅
Week 2 (Mon-Fri)     │ Role-Based Dashboards       │ Deploy 2.1 ✅
Week 2-3 (Concurrent)│ Negotiating Lead State      │ Deploy 2.1 ✅
Week 3 (Mon-Fri)     │ Mobile Tab-Based Interface  │ Deploy 2.2 ✅
Week 4 (Mon-Fri)     │ Search, Analytics, Batch    │ Deploy 2.3 & 2.4 ✅
```

**Total Phase 2 Duration:** 3-4 weeks (vs original 2-4 weeks)

---

## 🎯 Success Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| **Authentication** | Login success rate | 100% |
| **Role Assignment** | Users assigned correct roles | 100% |
| **Admin Panel** | User management time | < 1 min per user |
| **Dashboards** | Load time (each role) | < 2 seconds |
| **Mobile Tabs** | Click rate to Activity/History | +40% |
| **Negotiating State** | Adoption rate | +30% lead transitions |

---

## 🔐 Security Checklist

- [ ] Google OAuth properly configured
- [ ] RLS policies on users table
- [ ] Admin can only be changed by admin
- [ ] Route middleware protects admin pages
- [ ] Session tokens refreshed automatically
- [ ] No sensitive data in URLs
- [ ] CORS properly configured

---

## 📝 Database Changes

### Create Tables
```sql
-- Users table with roles
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operation', 'sales')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_is_active ON public.users(is_active);
```

### Update Tables
```sql
-- Leads table: Add negotiating status
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT 
  CHECK (status IN ('open', 'negotiating', 'won', 'lost'));

-- Update existing leads
UPDATE leads SET status = 'open' WHERE status IS NULL;

-- Add index
CREATE INDEX idx_leads_status ON leads(status);
```

---

## 📁 Files Summary

### New Files (Phase 2.0-2.2)
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

components/shared/
└── detail-tabs.tsx

utils/supabase/
├── client.ts
└── server.ts

middleware.ts
```

### Modified Files (Phase 2.0-2.2)
```
app/layout.tsx
app/dashboard/page.tsx
app/leads-opportunities/page.tsx
app/customers/page.tsx
store/crm-store.ts
.env.local
```

---

## 🚀 Deployment Strategy

### Phase 2.0 Deployment (Week 1 Friday)
- **Feature Flag:** `ENABLE_GOOGLE_AUTH`
- **Rollback:** OAuth disable, revert to previous login
- **Testing:** Real Google account login test
- **Risk Level:** Medium (auth changes)

### Phase 2.1 Deployment (Week 2 Friday)
- **Feature Flag:** `ENABLE_ROLE_DASHBOARDS`
- **Rollback:** Show original dashboard to all
- **Risk Level:** Low (no data changes)

### Phase 2.2 Deployment (Week 3 Friday)
- **Feature Flag:** `ENABLE_MOBILE_TABS`
- **Rollback:** Toggle tabs off, use original layout
- **Risk Level:** Low (mobile-only feature)

### Phase 2.3+ Deployments (Week 4)
- Rolling deployment approach
- 10% → 50% → 100% traffic
- Monitor error rates continuously

---

## ✅ Ready for Implementation

All three new features have been:
- ✅ Fully scoped and planned
- ✅ Integrated into Phase 2 timeline
- ✅ Security considerations addressed
- ✅ Success criteria defined
- ✅ Database schema designed

**Next Step:** Begin Phase 2.0 - Authentication & Authorization Implementation

---

**Last Updated:** June 3, 2026  
**Status:** Ready for Development  
**Prepared by:** Claude

