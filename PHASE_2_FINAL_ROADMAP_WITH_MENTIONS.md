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

