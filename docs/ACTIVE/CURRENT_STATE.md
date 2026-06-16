# 📊 Current State - SX-CRM June 13, 2026

## 🎯 Project Status

**Production URL:** https://sx-crm.vercel.app  
**Build Status:** ✅ Passing  
**Last Update:** June 16, 2026  
**Current Phase:** Phase 2.4 Complete ✅ — Phase 2.5 (UI/UX Refresh) Active 🎨

### Deployment History
- **v1.0.0** (June 2, 2026) — Phase 1 Complete ✅
- **v2.0** (June 9, 2026) — Google OAuth + Role Dashboards ✅
- **v2.1** (June 13, 2026) — Phase 2.3 @Mentions + Notifications ✅
- **v2.1.1** (June 13, 2026) — Fix: activity log author uses signed-in user ✅
- **v2.4** (June 16, 2026) — Web Push PWA + persisted notifications + cross-device sync ✅

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

### Phase 2.4 — Web Push PWA + Persisted Notifications ✅
- `notifications` + `push_subscriptions` tables in Supabase (with RLS)
- Notifications persist to DB + load on login (no longer lost on reload)
- Bell syncs across devices: Supabase Realtime + 20s visible-poll + foreground refetch
- Activity feed syncs across devices (same three-layer mechanism)
- Installable PWA (`manifest.json` + service worker + icons)
- Web Push via `web-push` + VAPID — delivers even when tab closed
- iOS-compatible: permission requested via user-gesture button in sidebar banner
- "Send test notification" self-test button (verified working end-to-end)

**Deferred → Phase 2.4b (Email):** Resend email blocked on DNS — `sixsheet.co`
is on Wix (no subdomain MX support) and `sixsheet.me` is reserved for API/payments.
Resolve later with a non-Wix DNS domain (e.g. `crm.sixsheet.me`). Web Push covers
the mobile-alert need in the meantime, so email is low priority.

---

## 🎨 Phase 2.5 — UI/UX Design System Refresh (Planned)

**Goal:** Establish a consistent visual design language across all screens — desktop and mobile — so the app feels professional, readable, and easy to use.

### Issues to Fix (from design audit)

| Area | Problem | Fix |
|------|---------|-----|
| **Typography** | No clear scale — title, label, value, caption all feel ad-hoc | Define 5-level type scale, apply everywhere |
| **Field hierarchy** | Labels and values same weight — hard to scan | Labels muted/small, values bold/dark |
| **Subtitle/breadcrumb** | Wall of dashes, duplicated text bug | Shorten to meaningful info, fix duplication |
| **Edit touch targets** | Pencil icons ~16px — too small on mobile | Minimum 44px tap area on all edit controls |
| **Button system** | Log, Attach, Reply, Delete — all different sizes/styles | Define 4 button types: Primary / Secondary / Ghost / Destructive |
| **Color tokens** | `text-primary`, `text-muted`, `text-placeholder` used inconsistently | Standardize semantic color tokens across all components |
| **Section headers** | Blue A / Green B — decorative but no consistent meaning | Review color coding system, document the pattern |
| **Card header layout** | ID chip, date, title, subtitle, icons, value, dropdown — too crowded | Restructure into clear hierarchy zones |
| **Spacing density** | Field rows packed unevenly | Standardize: 48px row height, 16px section padding, 12px field gap |
| **Value display** | "Value" label disconnected from number top-right | Integrate into card header cleanly |
| **Placeholder text** | Colour too close to real values in some fields | Use consistent `text-muted-foreground` token |
| **Mobile consistency** | Some components untested at 375px after desktop changes | Full mobile audit pass on all 3 entity types |

### Scope by Component

#### 2.5.1 — Design Tokens
- Finalize type scale: `text-2xl` Title / `text-base` Body / `text-sm` Label / `text-xs` Caption
- Semantic color aliases: `text-field-label`, `text-field-value`, `text-placeholder`
- Standardize spacing scale in Tailwind config

#### 2.5.2 — Card Header Redesign
- Clean 2-row structure: [ID + date chip] / [Title large] / [Owner + Value inline right]
- Remove clutter from single row
- Fix breadcrumb duplication bug

#### 2.5.3 — Field & Edit UI
- Label: `text-xs font-medium text-muted-foreground uppercase tracking-wide`
- Value: `text-sm font-medium text-foreground`
- Edit pencil: wrapped in 44px tap target, visible on hover (desktop) / always visible (mobile)

#### 2.5.4 — Button System
- **Primary:** filled, brand color — Log, Save, Confirm
- **Secondary:** outline — Attach, Cancel
- **Ghost:** text only — Reply, Edit
- **Destructive:** red text or filled red — Delete

#### 2.5.5 — Mobile Audit
- All 3 card types (Customer, Lead, Won) at 375px
- Touch targets ≥ 44px verified
- No horizontal scroll
- Sticky composer remains above browser chrome (`100dvh`)

### Estimated Effort
| Task | Hours |
|------|-------|
| Design token audit + Tailwind config | 2h |
| Card header redesign | 2h |
| Field + edit UI standardisation | 3h |
| Button system unification | 2h |
| Mobile audit + fixes | 2h |
| **Total** | **~11h** |

**Risk:** Low — CSS/styling only, no logic or data changes.  
**Deploy:** One Friday release.

---

## 🚨 Known Issues

### Medium Priority
- [ ] Email notifications not sent — deferred to Phase 2.4b (blocked on non-Wix DNS domain)
- [ ] Mobile @mention autocomplete — mobile composer uses plain `<input>`, not `MentionTextarea`
- [ ] `activity_id` column name — verify Supabase `activities` table uses `activity_id` not `id` before delete is exercised in prod

### Resolved (Phase 2.4)
- [x] Notifications now persist to Supabase (survive reload)
- [x] Bell + activity feed sync across devices (Realtime + poll + foreground)
- [x] Web Push delivers to mobile (verified end-to-end on iOS)

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
