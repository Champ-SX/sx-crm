# 📊 Current State - SX-CRM June 13, 2026

## 🎯 Project Status

**Production URL:** https://sx-crm.vercel.app  
**Build Status:** ✅ Passing  
**Last Update:** June 13, 2026  
**Current Phase:** Phase 2.3 Complete ✅ — Phase 2.4 Planning

### Deployment History
- **v1.0.0** (June 2, 2026) — Phase 1 Complete ✅
- **v2.0** (June 9, 2026) — Google OAuth + Role Dashboards ✅
- **v2.1** (June 13, 2026) — Phase 2.3 @Mentions + Notifications ✅
- **v2.1.1** (June 13, 2026) — Fix: activity log author uses signed-in user ✅

---

## ✅ Completed Phases

### Phase 2.0 — Google OAuth + Admin
- Google OAuth login (PKCE flow via `@supabase/ssr`)
- Admin user management panel (`/admin/users`)
- Role assignment (Admin / Operation / Sales)
- Mock mode for local dev (env-var gated, never reaches prod)

### Phase 2.1 — Role-Based Dashboards
- Auto-detect role from auth, admin gets override dropdown
- Admin / Operation / Sales dashboards
- Negotiating lead status + clickable status pill

### Phase 2.2 — Mobile Trello Cards
- Trello-style single-scroll mobile card (all 3 entity types)
- Sticky comment composer with `100dvh` fix
- "Log activity" label above composer

### Phase 2.3 — @Mentions & In-App Notifications
- `@mention` autocomplete in note textarea (desktop)
- In-app notification bell (sidebar) with unread badge
- Click notification → navigate to entity + mark read
- Reply on notes (inline box pre-filled with `@author`)
- Delete notes (confirm dialog + optimistic update + rollback)
- History restyle: content-first bubbles, subtext metadata
- Activity log saves actual user text (not `[Note]` placeholder)
- Activity author = signed-in user (not card owner)
- Team/owner dropdowns driven by real Supabase users

---

## 🚀 Phase 2.4 — Real Notifications (Planned)

**Goal:** Make @mention notifications actually reach teammates across sessions and devices.

### What's missing from Phase 2.3
| Gap | Impact |
|-----|--------|
| Notifications in-memory only | Lost on page reload |
| Email is a stub (`console.log`) | No emails sent |
| No mobile push | No alert when away from browser |

### Phase 2.4 Scope

#### 2.4.1 — Persist Notifications (Supabase)
- Create `notifications` table with RLS (each user reads only their own)
- `notifyMentions()` writes to DB + Zustand
- `initializeData()` loads unread notifications on login
- Mark read persists to DB

#### 2.4.2 — Email via Resend
- Sign up resend.com (free: 3,000 emails/month)
- Verify domain `sixsheet.me` (2 DNS records)
- Add `RESEND_API_KEY` to Vercel env vars
- Replace `notifyByEmail()` stub in `lib/mentions.ts` with real API call
- Email template: who mentioned you, in which record, message preview

#### 2.4.3 — Web Push (PWA)
- Add `manifest.json` + service worker → installable PWA
- Generate VAPID keys, store in Vercel env vars
- Subscribe users on login, save `push_subscriptions` table
- Send push on @mention (works on Android Chrome natively; iOS requires "Add to Home Screen")
- Works even when browser tab is closed

### Estimated Effort
| Task | Hours |
|------|-------|
| Supabase notifications table + RLS | 2h |
| Resend email integration | 2h |
| Web Push / PWA setup | 4h |
| Testing end-to-end | 2h |
| **Total** | **~10h** |

### Cost
| Service | Free Tier | Paid |
|---------|-----------|------|
| Resend | 3,000 emails/month ✅ | $20/mo for 50k |
| Web Push | Free (browser native) ✅ | — |
| Supabase (notifications table) | Within existing free tier ✅ | — |

**Phase 2.4 is free to run at current team size.**

---

## 🚨 Known Issues

### Medium Priority
- [ ] Notifications not persisted — lost on reload (Phase 2.4)
- [ ] Email notifications not sent — stub only (Phase 2.4)
- [ ] Mobile @mention autocomplete — mobile composer uses plain `<input>`, not `MentionTextarea`
- [ ] `activity_id` column name — verify Supabase `activities` table uses `activity_id` not `id` before delete is exercised in prod

---

## 📈 Quality Metrics

### Code Quality
- **TypeScript Errors:** 0 ✅
- **Console Errors:** 0 ✅
- **Build Time:** ~27 seconds ✅

### Test Coverage
- **Desktop (1280px+):** ✅ All features working
- **Tablet (768px):** ✅ All features responsive
- **Mobile (375px):** ✅ Trello cards, sticky composer, dvh fix

---

## 📊 Database Status

### Schema
- **Tables:** 9 created + `users` table (Phase 2.0)
- **Migrations:** All applied ✅
- **RLS Policies:** In place ✅
- **Pending (Phase 2.4):** `notifications`, `push_subscriptions` tables

### Data
- **Customers:** 998 records
- **Leads:** Active
- **Jobs (Won):** Active
- **Users:** Populated from Google sign-ins

---

## 🔗 Key Resources

- **Requirements:** `PRODUCT.md`
- **Architecture:** `ARCHITECTURE.md`
- **Database:** `DATABASE_SCHEMA.md`
- **Testing:** `REGRESSION_TESTS.md`
- **Dev patterns:** `PROJECT_GUARDRAILS.md`

---

**Last Updated:** June 13, 2026  
**Next Phase:** 2.4 — Real notifications (Resend email + Web Push PWA)
