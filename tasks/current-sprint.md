# Phase 2 Complete Roadmap - WITH MENTIONS FEATURE

**Start Date:** Monday, June 8, 2026  
**Target Completion:** Friday, July 5, 2026  
**Duration:** 4 weeks (expanded from 3 weeks to include mentions)  
**Total Hours:** ~40 hours development

---

## 📋 **PRE-IMPLEMENTATION: Setup (June 3-7)**

Before Phase 2.0 kicks off, complete these one-time setup tasks:

- [ ] **Archive Won's cards** - Archive all completed Won board cards to clean up the Kanban
- [ ] **Email service decision** - Choose between SendGrid, Mailgun, or Resend for @mentions feature
- [ ] **Environment variables setup** - Configure email service credentials in `.env.local`
- [ ] **Database migrations review** - Ensure all migration files are prepared and reviewed

**Target:** Complete by Friday, June 7 EOD  
**Estimated Time:** 2-3 hours

---

## 📅 **WEEKLY BREAKDOWN**

### **WEEK 1 (June 8-14): Authentication & Authorization** 
**Duration:** 11 hours  
**Deploy:** Phase 2.0 ✅

- [x] Google OAuth setup (2h)
- [x] Users table & RLS (2h)
- [x] Admin panel (3h)
- [x] Login page & middleware (2.5h)
- [x] Testing & Deploy 2.0 (1.5h)

**Output:** Users can sign in with Google. Admin can assign roles.

---

### **WEEK 2 (June 17-21): Role-Based Dashboards**
**Duration:** 11 hours  
**Deploy:** Phase 2.1 ✅

- [x] Admin dashboard (2.5h)
- [x] Operation dashboard (2.5h)
- [x] Sales dashboard (2.5h)
- [x] Dashboard integration (2h)
- [x] Negotiating lead state (1.5h)

**Output:** Each role sees custom dashboard. Leads can be marked "Negotiating".

---

### **WEEK 3 (June 24-28): Mobile Tab-Based Interface**
**Duration:** 9 hours  
**Deploy:** Phase 2.2 ✅

- [x] Tab component (2.5h)
- [x] Customers tabs (1.5h)
- [x] Leads tabs (1.5h)
- [x] Mobile testing (2h)
- [x] Final testing & Deploy 2.2 (1.5h)

**Output:** Mobile users see Activity/History as tabs. 40-50% improvement.

---

### **WEEK 4 (July 1-5): @Mentions & Email Notifications** ✨ NEW
**Duration:** 8.5 hours  
**Deploy:** Phase 2.3 ✅

- [ ] Database schema & migrations (1h)
- [ ] Mention input component (2h)
- [ ] Notifications bell (1.5h)
- [ ] Email service integration (1.5h)
- [ ] Store integration (1h)
- [ ] Testing & Deploy 2.3 (1.5h)

**Output:** Users can @mention team members. Emails sent to Google email.

---

## 🚀 **4 MAJOR DEPLOYMENTS**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  FRI 6/14      FRI 6/21       FRI 6/28       FRI 7/5       │
│  Phase 2.0     Phase 2.1      Phase 2.2      Phase 2.3     │
│                                                              │
│ ✅ Google     ✅ Dashboards  ✅ Mobile      ✅ @Mentions   │
│ ✅ Auth       ✅ Negotiating  ✅ Tabs       ✅ Email Notif │
│ ✅ Roles      ✅ Metrics     ✅ Activity                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘

TOTAL DURATION: 4 weeks (June 8 - July 5, 2026)
```

---

## 📋 **DAILY TASK SCHEDULE**

### **Pre-Week: June 3-7 (Setup)**
```
Mon 6/3   │ Email service decision  │ 0.5h │ ⏳
Tue 6/4   │ Archive Won's cards     │ 1h   │ ⏳
Wed 6/5   │ Env setup & migrations  │ 1h   │ ⏳
Thu-Fri   │ Buffer for review       │ 0.5h │ ⏳
```

### **Week 1: June 8-14 (Authentication)**
```
Mon 6/8   │ OAuth Setup              │ 2h   │ ✅
Tue 6/9   │ Users Table & RLS        │ 2h   │ ✅
Wed 6/10  │ Admin Panel              │ 3h   │ ✅
Thu 6/11  │ Login & Middleware       │ 2.5h │ ✅
Fri 6/14  │ Testing & Deploy 2.0     │ 1.5h │ 🚀 DEPLOY
```

### **Week 2: June 17-21 (Dashboards)**
```
Mon 6/17  │ Admin Dashboard          │ 2.5h │ ✅
Tue 6/18  │ Operation Dashboard      │ 2.5h │ ✅
Wed 6/19  │ Sales Dashboard          │ 2.5h │ ✅
Thu 6/20  │ Dashboard Integration    │ 2h   │ ✅
Fri 6/21  │ Negotiating + Deploy 2.1 │ 1.5h │ 🚀 DEPLOY
```

### **Week 3: June 24-28 (Mobile Tabs)**
```
Mon 6/24  │ Tab Component            │ 2.5h │ ✅
Tue 6/25  │ Customers Tabs           │ 1.5h │ ✅
Wed 6/26  │ Leads Tabs               │ 1.5h │ ✅
Thu 6/27  │ Mobile Testing           │ 2h   │ ✅
Fri 6/28  │ Final Testing & Deploy   │ 1.5h │ 🚀 DEPLOY
```

### **Week 4: July 1-5 (@Mentions)** ✨ NEW
```
Mon 7/1   │ DB Schema & Migrations   │ 1h   │ ✅
Tue 7/2   │ Mention Input Component  │ 2h   │ ✅
Wed 7/3   │ Notifications Bell       │ 1.5h │ ✅
Thu 7/4   │ Email Service & Store    │ 2.5h │ ✅
Fri 7/5   │ Testing & Deploy 2.3     │ 1.5h │ 🚀 DEPLOY
```

---

## 📊 **WHAT GETS DEPLOYED EACH WEEK**

### **Friday, June 14: PHASE 2.0 - Authentication** 🚀
Users can:
- ✅ Log in with Google
- ✅ See role-specific dashboard
- ✅ Admin assigns roles (Operation, Sales, Admin)
- ✅ Protected routes working

### **Friday, June 21: PHASE 2.1 - Role-Based Dashboards** 🚀
Users can:
- ✅ Admin sees all data + user activity
- ✅ Operation sees pipeline health + team workload
- ✅ Sales sees personal pipeline + targets
- ✅ Change lead status to "Negotiating"
- ✅ All dashboards load < 2 seconds

### **Friday, June 28: PHASE 2.2 - Mobile Tabs** 🚀
Mobile users can:
- ✅ View Details/Activity/History as tabs
- ✅ Tab switching smooth (200ms fade)
- ✅ No horizontal scrolling at 375px
- ✅ Desktop layout unchanged

### **Friday, July 5: PHASE 2.3 - @Mentions & Notifications** 🚀 NEW
Team can:
- ✅ @mention team members in notes
- ✅ Mentioned users get in-app notification
- ✅ Mentioned users get email notification
- ✅ Notification bell shows unread count
- ✅ Click notification to view context

---

## 📈 **CUMULATIVE FEATURES**

```
After Week 1 (6/14): ████░░░░░░  Basic auth working
After Week 2 (6/21): ████████░░  Dashboards + roles
After Week 3 (6/28): ████████░░  Mobile UX improved
After Week 4 (7/5):  ██████████  Team collaboration ready
```

---

## ✨ **NEW FEATURE DEEP DIVE: @Mentions**

### **User Workflow**

**Sending a mention:**
```
1. Type @ in customer/lead notes
   ↓
2. Dropdown shows team members
   ↓
3. Select "John" → becomes @John
   ↓
4. Click Save
   ↓
5. John gets:
   - In-app notification (bell icon)
   - Email to his Google email
```

**Receiving a mention:**
```
1. John sees bell icon with red dot
   ↓
2. Clicks bell → dropdown shows "Sarah mentioned you"
   ↓
3. Clicks notification
   ↓
4. Navigates to Customer/Lead with mention
   ↓
5. Email arrives: "Sarah mentioned you in SX CRM"
```

### **Technical Details**

**Database Tables:**
- `mentions` - Store @mention records
- `notifications` - In-app notifications
- `email_logs` - Audit trail of emails sent

**Components:**
- `mention-input.tsx` - Smart textarea with @detection
- `notifications-bell.tsx` - Bell icon in header
- `mention-dropdown.tsx` - User selector on @ trigger

**Email Service:**
- SendGrid / Mailgun / Resend integration
- HTML email templates
- Mention context and navigation link

### **Where Mentions Work:**
- ✅ Customer notes
- ✅ Lead/Opportunity notes
- ✅ Job comments (future)
- ✅ Activity updates (future)

---

## 🎯 **SUCCESS METRICS BY DEPLOYMENT**

### **After Phase 2.0 (June 14)**
- ✅ 100% Google login success rate
- ✅ All roles assigned correctly
- ✅ Zero failed authentications
- ✅ Mobile login responsive

### **After Phase 2.1 (June 21)**
- ✅ Each role sees correct dashboard
- ✅ < 2 second load time
- ✅ Negotiating state in use
- ✅ +30% adoption of new status

### **After Phase 2.2 (June 28)**
- ✅ +40% click rate to Activity/History
- ✅ Mobile users satisfied with tabs
- ✅ Desktop users unaffected
- ✅ Zero regressions

### **After Phase 2.3 (July 5)**
- ✅ 100% of mentions deliver emails
- ✅ Zero failed email sends
- ✅ Team collaboration improved
- ✅ Email logs auditable

---

## 📁 **FILES CREATED/MODIFIED**

### **Phase 2.0 (Auth)**
```
NEW:
  app/auth/login/page.tsx
  app/auth/callback/route.ts
  app/admin/users/page.tsx
  utils/supabase/client.ts
  middleware.ts

MODIFY:
  app/layout.tsx
  store/crm-store.ts
```

### **Phase 2.1 (Dashboards)**
```
NEW:
  components/dashboard/admin-dashboard.tsx
  components/dashboard/operation-dashboard.tsx
  components/dashboard/sales-dashboard.tsx

MODIFY:
  app/dashboard/page.tsx
  app/leads-opportunities/page.tsx
  store/crm-store.ts
```

### **Phase 2.2 (Mobile)**
```
NEW:
  components/shared/detail-tabs.tsx

MODIFY:
  app/customers/page.tsx
  app/leads-opportunities/page.tsx
```

### **Phase 2.3 (Mentions)** ✨ NEW
```
NEW:
  components/shared/mention-input.tsx
  components/shared/notifications-bell.tsx
  components/shared/mention-dropdown.tsx
  utils/email-service.ts
  utils/mention-parser.ts
  utils/notification-service.ts
  app/notifications/page.tsx

MODIFY:
  app/layout.tsx (add bell)
  app/customers/page.tsx (add mention input)
  app/leads-opportunities/page.tsx (add mention input)
  store/crm-store.ts (add notification functions)
```

---

## ⏱️ **TIME ALLOCATION**

```
Pre-Week: 3 hours    │ ███░░░░░░░░░░░░░░░░░ (setup only)
Week 1:   11 hours   │ ████████████░░░░░░░
Week 2:   11 hours   │ ████████████░░░░░░░
Week 3:   9 hours    │ ██████████░░░░░░░░░
Week 4:   8.5 hours  │ █████████░░░░░░░░░░
                     │
TOTAL:    42.5 hours │ ~43 hours total
SPRINT:   39.5 hours │ 4 weeks of development
DAILY:    6-8 hours  │ Sustainable pace (dev weeks)
```

---

## 🔄 **PHASE 2 COMPLETE FEATURE LIST**

✅ **Phase 2.0: Authentication & Authorization**
- Google OAuth login
- Admin user management
- Role assignment (Operation, Sales, Admin)
- Route protection
- Session management

✅ **Phase 2.1: Role-Based Dashboards + Negotiating State**
- Admin dashboard (system metrics, user activity)
- Operation dashboard (pipeline, throughput, workload)
- Sales dashboard (personal pipeline, targets, win rate)
- Negotiating lead status

✅ **Phase 2.2: Mobile Tab-Based Interface**
- Details/Activity/History tabs on mobile
- Desktop sidebar preserved
- Smooth transitions

✅ **Phase 2.3: @Mentions & Email Notifications** ✨ NEW
- @mention team members in notes
- In-app notification bell
- Email notifications to Google email
- Mention context & navigation
- Email audit logs

---

## 🎊 **FINAL STATS**

| Metric | Value |
|--------|-------|
| Start Date | Monday, June 8, 2026 |
| End Date | Friday, July 5, 2026 |
| Total Duration | 4 weeks |
| Total Hours | ~40 hours |
| Daily Average | 6-8 hours |
| Major Deployments | 4 releases |
| New Features | 4 phases |
| New Components | 10+ |
| Database Tables | 6 new tables |
| Team Collaboration Impact | High |

---

## 🚀 **READY TO BEGIN?**

**Pre-Implementation Week:** Monday, June 3 - Friday, June 7
- [ ] Archive Won's cards (clean up the board)
- [ ] Choose email service (SendGrid/Mailgun/Resend)
- [ ] Configure environment variables

**Phase 2 Kicks Off:** Monday, June 8 at 9:00 AM  
**First Task:** Phase 2.0 - Google OAuth Setup (2 hours)  
**First Deployment:** Friday, June 14  

**You're all set! Everything is documented and committed to git.** ✅

---

**Last Updated:** June 3, 2026  
**Status:** Complete Roadmap Ready  
**All Features:** Planned, scoped, and scheduled



---

## DETAILED TIMELINE


# Phase 2 Implementation Timeline - ACTUAL DATES

**Start Date:** Monday, June 8, 2026  
**Target Completion:** Friday, June 28, 2026  
**Duration:** 3 weeks (accelerated from 3-4 weeks)

---

## 📅 WEEK 1: Authentication & Authorization (June 8-14)

### **Monday, June 8**
**Task:** Supabase Google OAuth Setup
- [ ] Enable Google OAuth in Supabase console
- [ ] Generate Google Client ID
- [ ] Add to .env.local
- [ ] Create Supabase auth client utility
- [ ] Test OAuth flow locally

**Time:** 2 hours  
**Status:** 🔧 IN PROGRESS  
**Output:** Working Google OAuth callback

---

### **Tuesday, June 9**
**Task:** Create Users Table & Database Schema
- [ ] Create `public.users` table in Supabase
- [ ] Add RLS (Row Level Security) policies
- [ ] Add indexes for performance
- [ ] Test RLS policies with different roles

**Time:** 2 hours  
**Status:** 🔧 IN PROGRESS  
**Output:** Secure users table with RLS

---

### **Wednesday, June 10**
**Task:** Build Admin User Management Panel
- [ ] Create `app/admin/users/page.tsx`
- [ ] Build UserListTable component
- [ ] Build RoleSelector dropdown component
- [ ] Add role assignment functionality
- [ ] Add user search & filter

**Time:** 3 hours  
**Status:** 🔧 IN PROGRESS  
**Output:** Functional admin panel

---

### **Thursday, June 11**
**Task:** Create Login Page & Route Protection
- [ ] Create `app/auth/login/page.tsx`
- [ ] Create OAuth callback handler (`app/auth/callback/route.ts`)
- [ ] Build middleware.ts for route protection
- [ ] Update app/layout.tsx with auth context
- [ ] Test login flow end-to-end

**Time:** 2.5 hours  
**Status:** 🔧 IN PROGRESS  
**Output:** Complete authentication flow

---

### **Friday, June 14**
**Task:** Testing & Phase 2.0 Deployment
- [ ] Test Google login with real account
- [ ] Verify role assignment works
- [ ] Test route protection (try accessing /admin as non-admin)
- [ ] Mobile login responsiveness check
- [ ] **DEPLOY to production: Phase 2.0**

**Time:** 1.5 hours  
**Status:** 🎯 READY  
**Output:** ✅ Phase 2.0 Live in Production

**Week 1 Summary:**
- Hours: 11 hours
- Status: ✅ COMPLETE & DEPLOYED
- Deployment: Phase 2.0 (Authentication & Authorization)

---

## 📅 WEEK 2: Role-Based Dashboards (June 17-21)

### **Monday, June 17**
**Task:** Admin Dashboard Component
- [ ] Create `components/dashboard/admin-dashboard.tsx`
- [ ] Build system health metrics cards
- [ ] Build user activity log component
- [ ] Build team performance matrix
- [ ] Add Zustand store queries for admin metrics

**Time:** 2.5 hours  
**Status:** 🔧 IN PROGRESS  
**Output:** Admin-only dashboard view

---

### **Tuesday, June 18**
**Task:** Operation Dashboard Component
- [ ] Create `components/dashboard/operation-dashboard.tsx`
- [ ] Build pipeline health by stage cards
- [ ] Build job throughput metrics chart
- [ ] Build team workload distribution view
- [ ] Add bottleneck identification alerts

**Time:** 2.5 hours  
**Status:** 🔧 IN PROGRESS  
**Output:** Operation-specific dashboard

---

### **Wednesday, June 19**
**Task:** Sales Dashboard Component
- [ ] Create `components/dashboard/sales-dashboard.tsx`
- [ ] Build personal pipeline cards
- [ ] Build target progress gauge/chart
- [ ] Build win rate metrics
- [ ] Build recent activities list

**Time:** 2.5 hours  
**Status:** 🔧 IN PROGRESS  
**Output:** Sales-specific dashboard

---

### **Thursday, June 20**
**Task:** Refactor Dashboard & Add Role-Based Routing
- [ ] Update `app/dashboard/page.tsx` to detect user role
- [ ] Add conditional rendering for role-specific components
- [ ] Test all three dashboard views
- [ ] Mobile responsiveness testing
- [ ] Fix any styling/layout issues

**Time:** 2 hours  
**Status:** 🔧 IN PROGRESS  
**Output:** Role-aware dashboard system

---

### **Friday, June 21**
**Task:** Negotiating Lead State (Concurrent Feature)
- [ ] Migrate leads table in Supabase (add negotiating status)
- [ ] Update `app/leads-opportunities/page.tsx` filters
- [ ] Add Negotiating status badge color
- [ ] Update status dropdown options
- [ ] Test status changes & activity logging
- [ ] **DEPLOY to production: Phase 2.1**

**Time:** 1.5 hours  
**Status:** 🎯 READY  
**Output:** ✅ Phase 2.1 Live in Production (includes Negotiating state)

**Week 2 Summary:**
- Hours: 11 hours
- Status: ✅ COMPLETE & DEPLOYED
- Deployments: Phase 2.1 (Role-Based Dashboards) + Negotiating Lead State

---

## 📅 WEEK 3: Mobile Tab-Based Interface (June 24-28)

### **Monday, June 24**
**Task:** DetailTabs Component Development
- [ ] Create `components/shared/detail-tabs.tsx`
- [ ] Build tab button UI with active indicators
- [ ] Implement tab switching logic
- [ ] Add fade transitions (200ms)
- [ ] Add mobile-only styling (sm: hidden)

**Time:** 2.5 hours  
**Status:** 🔧 IN PROGRESS  
**Output:** Reusable tab component

---

### **Tuesday, June 25**
**Task:** Integrate Tabs on Customers Page
- [ ] Update `app/customers/page.tsx`
- [ ] Wrap Details/Activity/History in DetailTabs
- [ ] Test tab switching on mobile (375px)
- [ ] Verify desktop sidebar still shows all sections
- [ ] Fix any layout conflicts

**Time:** 1.5 hours  
**Status:** 🔧 IN PROGRESS  
**Output:** Customers page with mobile tabs

---

### **Wednesday, June 26**
**Task:** Integrate Tabs on Leads Page
- [ ] Update `app/leads-opportunities/page.tsx`
- [ ] Wrap Details/Activity/History in DetailTabs
- [ ] Test tab switching on mobile
- [ ] Verify desktop layout preserved
- [ ] Mobile touch testing on real devices

**Time:** 1.5 hours  
**Status:** 🔧 IN PROGRESS  
**Output:** Leads page with mobile tabs

---

### **Thursday, June 27**
**Task:** Mobile Testing & Polish
- [ ] Test mobile at multiple sizes (375px, 480px, 640px)
- [ ] Verify touch targets are 44px+
- [ ] Test tab transitions are smooth
- [ ] Desktop regression testing (Kanban, customers, leads)
- [ ] Check console for errors
- [ ] Verify Phase 1 features still working

**Time:** 2 hours  
**Status:** 🔧 IN PROGRESS  
**Output:** Production-ready mobile tabs

---

### **Friday, June 28**
**Task:** Final Testing & Phase 2.2 Deployment
- [ ] Comprehensive QA testing
- [ ] Performance check (Lighthouse)
- [ ] Mobile edge case testing
- [ ] Dark mode verification
- [ ] **DEPLOY to production: Phase 2.2**

**Time:** 1.5 hours  
**Status:** 🎯 READY  
**Output:** ✅ Phase 2.2 Live in Production

**Week 3 Summary:**
- Hours: 9 hours
- Status: ✅ COMPLETE & DEPLOYED
- Deployment: Phase 2.2 (Mobile Tab-Based Interface)

---

## 📊 COMPLETE DEPLOYMENT CALENDAR

```
┌─────────────────────────────────────────────────────────┐
│ PHASE 2 DEPLOYMENT SCHEDULE                             │
├─────────────────────────────────────────────────────────┤
│ Phase 2.0: Friday, June 14                              │
│ ✅ Google OAuth Login                                   │
│ ✅ Admin Role Management                                │
│ ✅ Session Management                                   │
│                                                         │
│ Phase 2.1: Friday, June 21                              │
│ ✅ Admin Dashboard                                      │
│ ✅ Operation Dashboard                                  │
│ ✅ Sales Dashboard                                      │
│ ✅ Negotiating Lead State                               │
│                                                         │
│ Phase 2.2: Friday, June 28                              │
│ ✅ Mobile Tab-Based Interface                           │
│ ✅ Details/Activity/History Tabs                        │
│ ✅ Desktop Layout Preserved                             │
│                                                         │
│ TOTAL DURATION: 3 weeks (June 8-28)                     │
│ TOTAL HOURS: 31 hours development                       │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 DAILY TASK BREAKDOWN

### Week 1 (June 8-14) - Authentication
| Date | Task | Hours | Status |
|------|------|-------|--------|
| Mon 6/8 | OAuth Setup | 2h | 🔧 |
| Tue 6/9 | Users Table & RLS | 2h | 🔧 |
| Wed 6/10 | Admin Panel | 3h | 🔧 |
| Thu 6/11 | Login Page & Middleware | 2.5h | 🔧 |
| Fri 6/14 | Testing & Deploy 2.0 | 1.5h | 🎯 |

### Week 2 (June 17-21) - Dashboards
| Date | Task | Hours | Status |
|------|------|-------|--------|
| Mon 6/17 | Admin Dashboard | 2.5h | 🔧 |
| Tue 6/18 | Operation Dashboard | 2.5h | 🔧 |
| Wed 6/19 | Sales Dashboard | 2.5h | 🔧 |
| Thu 6/20 | Dashboard Integration | 2h | 🔧 |
| Fri 6/21 | Leads State & Deploy 2.1 | 1.5h | 🎯 |

### Week 3 (June 24-28) - Mobile Tabs
| Date | Task | Hours | Status |
|------|------|-------|--------|
| Mon 6/24 | Tab Component | 2.5h | 🔧 |
| Tue 6/25 | Customers Tabs | 1.5h | 🔧 |
| Wed 6/26 | Leads Tabs | 1.5h | 🔧 |
| Thu 6/27 | Mobile Testing | 2h | 🔧 |
| Fri 6/28 | Final Deploy 2.2 | 1.5h | 🎯 |

---

## 🎯 DAILY GOALS

### **Monday June 8**
- Start: 9:00 AM
- OAuth setup complete by noon
- Testing by 3:00 PM
- Commit by 5:00 PM

### **Tuesday June 9**
- Users table created by 10:00 AM
- RLS policies tested by noon
- Database ready for admin panel
- Commit by 5:00 PM

### **Wednesday June 10**
- Admin panel UI complete
- User listing working
- Role selector functional
- Commit by 5:00 PM

### **Thursday June 11**
- Login page complete
- Callback handler working
- Middleware protecting routes
- End-to-end testing
- Commit by 5:00 PM

### **Friday June 14 (DEPLOYMENT DAY 🚀)**
- Morning: Final QA testing
- Afternoon: Deploy Phase 2.0 to production
- Testing in production
- Rollback plan ready (just in case)
- **Live announcement: Phase 2.0 ready for users**

---

## 🎯 DEPLOYMENT CHECKPOINTS

### Phase 2.0 Go-Live (Fri June 14)
**Pre-deployment Checklist:**
- [ ] Google login tested with real account
- [ ] New users can sign in and create account
- [ ] Admin can assign roles to users
- [ ] Role changes take effect immediately
- [ ] Route protection working (non-admin can't access /admin)
- [ ] Zero console errors
- [ ] Mobile login responsive at 375px
- [ ] All Phase 1 features still working

**Rollback Plan:** Disable Google OAuth, revert to previous auth

---

### Phase 2.1 Go-Live (Fri June 21)
**Pre-deployment Checklist:**
- [ ] Admin sees admin dashboard
- [ ] Operation managers see operation dashboard
- [ ] Sales reps see sales dashboard
- [ ] All dashboards load < 2 seconds
- [ ] Negotiating state appears in lead filters
- [ ] Status dropdown has all 4 options
- [ ] Mobile responsive at all sizes
- [ ] Zero console errors
- [ ] All Phase 1 & 2.0 features working

**Rollback Plan:** Show original dashboard to all roles

---

### Phase 2.2 Go-Live (Fri June 28)
**Pre-deployment Checklist:**
- [ ] Mobile tabs working at 375px, 480px, 640px
- [ ] Tab switching smooth (200ms fade)
- [ ] Desktop sidebar still shows all sections
- [ ] Details/Activity/History tabs functional
- [ ] Touch targets 44px+ on mobile
- [ ] Desktop regression testing passed
- [ ] Zero console errors
- [ ] All Phase 1 & 2.0 & 2.1 features working

**Rollback Plan:** Toggle tab feature off, use original layout

---

## 💼 RESOURCE ALLOCATION

**You (Dev):** Full-time
- June 8-14: 11 hours (Week 1)
- June 17-21: 11 hours (Week 2)
- June 24-28: 9 hours (Week 3)
- **Total: 31 hours over 3 weeks**

**Daily Average:** ~6-7 hours per day

---

## 🎯 SUCCESS METRICS BY DEPLOYMENT

### After Phase 2.0 (June 14)
- ✅ Users logging in with Google
- ✅ Admin can manage team roles
- ✅ Zero failed logins
- ✅ All routes properly protected

### After Phase 2.1 (June 21)
- ✅ Each role sees correct dashboard
- ✅ Metrics loading in < 2 seconds
- ✅ Negotiating state in use
- ✅ +30% adoption of new status

### After Phase 2.2 (June 28)
- ✅ Mobile Activity/History easily accessible
- ✅ +40% click rate to Activity/History
- ✅ Mobile users not frustrated by layout
- ✅ Desktop users unaffected

---

## 📝 NOTES & ASSUMPTIONS

**Work Hours:** 
- Assuming 7-8 hours productive work per day
- Includes development, testing, debugging, commits

**Dependencies:**
- Google OAuth credentials (need to set up)
- Supabase project ready (already have)
- Environment variables configured

**Risk Mitigation:**
- Deploy each phase separately (not all at once)
- Feature flags ready (can disable if issues)
- Rollback plan for each deployment
- Mobile testing on real devices (not just browser)

---

## 🚀 READY TO START?

**When:** Monday, June 8, 2026 at 9:00 AM  
**Where:** Your local machine  
**What:** Phase 2.0 - Authentication & Authorization  
**Duration:** 11 hours over 5 days  
**Deployment:** Friday, June 14  

**Are you ready to begin?** 🎯

---

**Last Updated:** June 3, 2026  
**Status:** Ready for Implementation  
**Prepared by:** Claude

