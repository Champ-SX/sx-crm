# 📊 Current State - SX-CRM July 14, 2026

## 🎯 Project Status

**Production URL:** https://sx-crm.vercel.app  
**Build Status:** ✅ Passing  
**Last Update:** July 14, 2026  
**Current Phase:** Phases 2.6–3.6 + 2.7 shipped ✅ — see backlog for what's left

### Deployment History
- **v1.0.0** (June 2, 2026) — Phase 1 Complete ✅
- **v2.0** (June 9, 2026) — Google OAuth + Role Dashboards ✅
- **v2.1** (June 13, 2026) — Phase 2.3 @Mentions + Notifications ✅
- **v2.1.1** (June 13, 2026) — Fix: activity log author uses signed-in user ✅
- **v2.4** (June 16, 2026) — Web Push PWA + persisted notifications + cross-device sync ✅
- **v2.5** (June 17, 2026) — UI/UX Design System Refresh ✅
- **v2.6–3.3** (July 2026) — Won mobile pager, attachments→Storage, dark theme, admin delete users/staff, Customer Insights, dashboard monthly summary ✅
- **v3.4–3.6** (July 14, 2026) — Won cross-stage drag rework, notification deep-link, default owner = signed-in user ✅
- **v2.7** (July 14, 2026) — Won card due date + scheduled push (pg_cron) ✅
- **+ polish** (July 14, 2026) — SIXSHEET logo/favicon, branded Lottie loader, Noto Sans Thai font ✅

---

## 🗂️ Remaining Backlog (nothing in-flight)

All numbered phases through 2.7 / 3.6 are shipped. What's left:

1. **Mobile @mention autocomplete** — mobile comment box uses a plain `<input>`, not `MentionTextarea`. (Low)
2. **Permanent user lockout ("3.0-B")** — `is_active`/blocklist so a deleted user can't sign back in. (Med)
3. **Server-side customer search/pagination** — client-side today; matters as data grows. (Med)
4. **Unified detail header (UX pass)** — shared `<DetailHeader>` + `<DetailActionsMenu>` across Customers/Leads/Won: top action row (X / title / ⋯ / +), labeled metadata row (owner · OP stage · value, spread & aligned), Delete moved into a ⋯ overflow (consistent everywhere), close-X no longer overlaps content. Mobile: sticky top bar + overflow sheet. *Layout only.* (Med)
5. **Card actions (new features)** — the ⋯/＋ menu items that are net-new logic, not layout: **Duplicate card**, **Copy link** (deep-link URL), **Share link**, **Archive card** (needs an archived state/field). Depends on #4's menu shell. (Med)

Email notifications were **dropped** (Web Push covers it). Full per-phase detail is in the sections below (all now marked ✅ Complete).

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

Email notifications (formerly "Phase 2.4b") are **dropped** — Web Push covers
the mobile-alert need, so email delivery is not planned.

---

## 🎨 Phase 2.5 — UI/UX Design System Refresh ✅ (Complete — June 17, 2026)

**Goal:** Establish a consistent visual design language across all screens — desktop and mobile — so the app feels professional, readable, and easy to use.

**Shipped:**
- **2.5.1 Design tokens** — type scale + `.field-label`/`.field-value`/`.field-placeholder` + `.edit-affordance` (44px tap target) in `app/globals.css`.
- **2.5.2 Card headers** — Won detail header stacks responsively on mobile; breadcrumb duplication bug fixed (`formatJobMeta` = clean "type · category", no empty `—` segments); Leads/Customers headers already responsive.
- **2.5.3 Field & edit UI** — all detail-card labels migrated to `.field-label`; Customers edit pencil `<span>`→`<button>` (keyboard-focusable).
- **2.5.4 Button system** — 4 types (Primary/Secondary/Ghost/Destructive); added `success` variant; Won/Lost + dialogs + inline Reply/Delete all on-system.
- **2.5.5 Mobile audit** — Leads & Customers stacked card lists at 375px; notification dropdown rebuilt on portal Popover (no clipping); drag-drop file attach on mobile composer; `฿` glyph spacing.

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

## 📋 Phase 2.6 — Won Board Mobile Parity ✅ (Complete — Jul 2026)

**Goal:** Make the Won & Ready for OP board behave the same on mobile as on
desktop — **stages arranged horizontally** (swipe left/right between stages),
**cards stacked vertically** inside each stage. Today mobile stacks stages
vertically (`flex-col sm:flex-row`), so the board reads as one long vertical
list instead of a Trello-style horizontal board.

### Scope
- **Layout flip (small):** board container `flex flex-col sm:flex-row` →
  `flex flex-row` (always horizontal); give columns a swipeable mobile width
  (e.g. `w-[80vw] min-w-[80vw] sm:min-w-[240px] sm:max-w-[240px]`); ensure
  `min-w-max` + horizontal scroll apply on mobile. `app/won-ready-op/page.tsx`
  ~lines 319, 1318–1320. Cards already use `verticalListSortingStrategy` — no change.
- **Touch-gesture handling (the real work / main risk):** the whole column is
  currently a drag handle (`cursor-grab` + dnd listeners on the wrapper, line
  319–321). On a horizontal-scrolling mobile board this collides with native
  swipe-to-scroll between stages and with card drags. Needs a **dedicated drag
  handle** on mobile and/or dnd-kit touch-sensor activation constraints
  (press-delay + distance) so scroll vs. drag are distinguishable.
- **Vertical overflow per column:** confirm a tall stage scrolls cleanly inside
  its column at 375px without breaking the board's horizontal scroll.

### Notes
- Deliberately revisits the Phase 2.2 "mobile single-scroll" decision for this board only — Details/Activity drawers keep their current mobile layout.
- **Risk:** Medium — the CSS flip is trivial; the dnd/touch gesture disambiguation is where the effort and regression risk live. Test drag-reorder of stages, drag-move of cards between stages, and horizontal/vertical scroll all on a real touch device at 375px.

---

## ⏰ Phase 2.7 — Won Card Due Date + Scheduled Push ✅ (Complete — Jul 14, 2026)

**Goal:** Add a Due date (date **+ time**) to Won cards. When the due datetime
arrives, send a push notification (and in-app notification) to the users
involved with that card.

### Reuses (already built — Phase 2.4)
- Web Push send pipeline: `app/api/push/send/route.ts` (`recipientId` → `push_subscriptions` → web-push/VAPID).
- In-app notifications: `notifications` table + the `notifyMentions()` pattern in `store/crm-store.ts` (creates notification + fires push together) — the due-date notifier mirrors this.
- User→subscription mapping via `users` table / `TeamMember.id`.

### New work
- **Data:** add `due_at TIMESTAMPTZ` + `due_notified_at TIMESTAMPTZ` to the Won jobs table + `WonJob` type. (`event_date` is date-only; `event_time` is a free string — neither is a real datetime.)
- **UI:** date + time picker on the Won detail card (per the requirement mockup) with inline-edit save.
- **Scheduler (the crux — nothing scheduled exists today):** `app/api/cron/check-due-jobs` that runs every few minutes, selects jobs where `due_at <= now()` AND `due_notified_at IS NULL`, sends push + in-app notification to involved users, then stamps `due_notified_at` (dedup).
- **Involved-users resolution:** map `owner` (a name string) → `TeamMember.id`; `staff_list` are gig workers (no login/push). May need a new `assignee_ids TEXT[]` field to notify more than the owner.

### Open decisions (resolve before building)
1. **Who is "involved"?** Owner only, or add an explicit `assignee_ids` field? (Staff cannot receive push.)
2. **Timing:** fire exactly at `due_at`, or support a lead-time reminder (e.g. 1h / 1 day before)?
3. **Scheduler choice:** Vercel **Hobby crons run only once/day** — insufficient for time-precise alerts. Needs **Vercel Pro** (per-minute cron) OR Supabase `pg_cron` OR an external trigger. This decides feasibility/accuracy.
4. **Timezone:** store `due_at` as UTC timestamptz; ensure the picker and cron comparison agree on the user's timezone.

**Risk:** Medium-High — the scheduler is net-new infrastructure with an external dependency (Vercel plan / pg_cron) and a dedup requirement; push delivery itself is already proven.

---

## 🗄️ Phase 2.8 — Move Attachments to Supabase Storage ✅ (Complete — Jul 2026)

**Goal:** Stop storing file attachments as base64 inside `activities.attachments`
(JSONB) and move the bytes to a Supabase **Storage** bucket, keeping only a
small reference (path / filename / size / type) in the row. This is the durable
fix for the egress overage (19 GB against a 5 GB cap, June 2026).

### Why
Files-as-base64 means file bytes (≈+33% over binary) travel through DB egress on
every activity query. A stop-gap already shipped (commit `9669186`): the frequent
refresh fetches metadata only (`getAllLite`) and the poll was slowed 20s→60s — but
startup (`initializeData`) still pulls all base64 once per session, and the design
is inherently egress-heavy. Storage fixes it permanently: list queries stay tiny;
files download on demand as binary, only when opened.

### Scope
- **Storage bucket** (e.g. `activity-attachments`) with RLS; signed or public URLs as appropriate.
- **Upload path:** on attach, upload the file to Storage; store `{ path, filename, size, type }` in `activities.attachments` instead of `{ data: base64 }`.
- **Render path:** activity feed shows filename/size + a thumbnail/download that fetches from Storage on click (not inline base64).
- **Migration:** one-off script to move existing base64 attachments into the bucket and rewrite rows to references. Keep a fallback render for any legacy base64 rows until migrated.
- **Cleanup:** delete the Storage object when a note/attachment is deleted.

### Notes
- Revisit `initializeData` so it no longer needs `select('*')` with blobs (use `getAllLite` everywhere; attachments load per-open-record).
- Storage has its own egress, but on-demand + binary is far cheaper than base64-on-every-poll.

**Risk:** Medium — touches upload, render, delete, plus a data migration of existing attachments. Worth a branch + careful test of attach/view/delete and the legacy fallback.

---

## 🌗 Phase 2.9 — Dark Theme ✅ (Complete — Jul 2026)

**Goal:** A working, complete dark mode across every screen.

**Current state:** A `theme-provider` (`components/layout/theme-provider.tsx`) and a
"Switch to dark mode" toggle already exist, and CSS color tokens support both
modes — but only ~13 files use `dark:` classes. Most screens were built with
hardcoded light colors (`text-slate-800`, `bg-white`, `bg-rose-50`, etc.), so
toggling dark today leaves large parts of the UI broken or unreadable.

### Scope
- Audit every screen (dashboards, customers, leads, won board + detail drawers, admin, login).
- Replace hardcoded colors with semantic tokens / add `dark:` variants; lean on the design-token vars from Phase 2.5.
- Verify both modes at 375px and desktop; ensure the toggle persists the preference.

**Risk:** Low-medium — CSS only, but broad (touches nearly every component).

---

## 👤 Phase 3.0 — Admin: Manage + Delete Users ✅ (Complete — Jul 2026)

**Goal:** Let an admin remove a user, not just change their role.

**Current state:** `app/admin/users/page.tsx` can change a user's role; there is
**no delete**.

### Scope
- Add delete-user (admin-only) with a confirmation dialog showing impact.
- Guards: can't delete yourself; can't remove the last admin.
- Remove the Supabase auth user + `users` row; decide handling of their assigned leads/jobs/notifications (reassign vs. leave with orphaned owner name).

**Risk:** Medium — destructive + touches auth; must follow the deletion rules (confirm, clear impact).

---

## 🧹 Phase 3.1 — Admin: Delete Staff from Registry ✅ (Complete — Jul 2026)

**Goal:** Let an admin delete a staff member (จ่ายเงินน้องออกงาน) from the registry.

**Current state:** Staff live in the `staff_members` table; the Won board only
**un-assigns** staff from a job (`removeStaff`) — it can't delete from the registry.
A `staffQueries.delete` may need adding.

### Scope
- Admin-only "delete staff" action (likely a manage-staff view) with confirmation.
- Handle staff already referenced in jobs' `staff_list`: leave the per-job snapshot intact (incl. fee_thb), just remove from the pickable registry.

**Risk:** Low-medium — destructive but isolated; admin-gated.

**Note:** 3.0 and 3.1 are both admin-gated destructive actions — both need a role check + the standard confirm-dialog / clear-impact deletion pattern.

---

## ⭐ Phase 3.2 — Customer Insights field ✅ (Complete — Jul 2026)

**Goal:** A multi-line "Customer Insights ⭐" textbox (like the existing `notes`)
that lives on the **customer** and is shown/editable on that customer's **Lead**
and **Won** cards too — one shared insight that follows the customer everywhere.

### Why it's straightforward
Lead and Won detail drawers already resolve the linked customer (`linkedCustomer`
via `customer_id`) and can write to it (`updateCustomer`). So it's a single field
on the customer surfaced in three places — not copied per record.

### Scope
- **Data:** add `customer_insights TEXT` to `customers` (migration + `Customer` type; mirrors `notes`). 1-line prod migration: `ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_insights TEXT;`
- **Customer card:** editable textbox "Customer Insights ⭐" (reuse the notes/inline-edit pattern).
- **Lead + Won cards:** show the linked customer's insights, edit inline → writes back via `updateCustomer` (single source of truth, so edits reflect everywhere instantly).

### Decisions locked
- Shared, not per-record — all leads/jobs for a customer share one insights text (the "keep along" intent).
- Unlinked Lead/Won (no `customer_id`) → hide the field or show a "link a customer" hint.
- Visually distinct from record-level notes (⭐ label) so "this deal's notes" vs "this customer's insight" don't get confused.

**Risk:** Low — one nullable column + a reused textbox in 3 drawers.

---

## 📈 Phase 3.3 — Dashboard: Monthly Won-Job Summary ✅ (Complete — Jul 2026)

**Goal:** A month-scoped won-jobs summary on the dashboard: how many won this
month, revenue this month, and an owner sales ranking (leaderboard).

### Why it's low-risk
`wonJobs` already carry `owner`, `estimated_value`, and dates — this is pure
client-side aggregation + a new UI section. No DB/migration.

### Scope
- New "This Month" section on the **Admin dashboard** (`components/dashboard/admin-dashboard.tsx`), alongside the existing all-time revenue + per-owner matrix.
- Metrics: won-jobs count, revenue (sum of `estimated_value`), owner ranking (deals + revenue, sorted by revenue).
- (Later, optional) Sales dashboard shows the signed-in owner's own rank.

### Decisions to lock
1. "Monthly" = won date (`created_at`, when marked Won) vs `event_date` — recommend **won date** for a sales summary (revenue closed that month); could be a toggle.
2. Rank by revenue, count, or both — recommend show both, sort by revenue.
3. Month navigation — current-month only vs **‹ prev / next ›** pager — recommend the pager to review history.

**Risk:** Low — client-side aggregation over existing data; self-contained section.

---

## 🖱️ Phase 3.4 — Won Board: Cross-Stage Drag UX ✅ (Complete — Jul 14, 2026)

**Goal:** Make dragging a card between stages on the Won board feel solid and
predictable (Trello-quality) on desktop. Today it's struggly — the card only
moves on drop, targeting is imprecise, and off-screen stages are hard to reach.
Mobile already sidesteps this via the paginated board + the card-detail "OP
Stage" picker (Phase 2.6), so this is **desktop-focused**.

### Diagnosis (current friction in `app/won-ready-op/page.tsx`)
- **No `onDragOver`** — only `onDragEnd`. The card never re-parents into the
  hovered stage during the drag; you drag a floating ghost with no "it'll land
  here" feedback.
- **`closestCorners` collision** — erratic across columns of differing heights;
  the drop target doesn't track the cursor.
- **Whole column is the stage-drag handle** — the column wrapper carries the
  drag listeners (`cursor-grab` everywhere) while the grip icon is
  `pointer-events-none` (backwards), so card-drag vs stage-drag compete.
- **Off-screen stages** — 5 fixed-width columns; far stages need edge
  auto-scroll that isn't tuned.
- Handlers are full of `console.log` noise to remove.

### Scope (the "1–4 bundle", in priority order)
1. **Add `onDragOver`** — optimistically re-parent the dragged card into the
   hovered stage live (commit on `onDragEnd`); gives real-time landing preview
   + a natural drop-placeholder gap. *(Biggest win.)*
2. **Switch collision detection** to `pointerWithin` with a `rectIntersection`
   fallback (so empty columns still accept drops) — drop follows the cursor.
3. **Dedicated stage-drag handle** — move the sortable listeners off the column
   wrapper onto just the grip icon in the header; keep the whole card draggable
   (now unambiguous). Drop the blanket `cursor-grab`.
4. **Tune horizontal auto-scroll** (`DndContext autoScroll` threshold/accel) so
   dragging near a board edge reveals off-screen stages.
5. (Falls out of #1) Clear drop-placeholder gap where the card will land.
6. Remove `console.log` spam from the drag handlers.

### Decisions locked
- Keep the **whole card** as the drag handle (no per-card grip) — safe once #3
  removes the column-drag conflict.
- Desktop only; mobile keeps the Phase 2.6 pager + detail-picker flow.

**Risk:** Medium — the `onDragOver` optimistic re-parent + collision swap are
the fiddly parts (state during drag, don't double-commit). No DB/schema change;
purely interaction. Test: reorder within a stage, move across stages (incl.
off-screen), stage reorder via the grip, and that a dropped-nowhere drag is a
clean no-op.

---

## 🔔 Phase 3.5 — Notification Deep-Link to Card ✅ (Complete — Jul 14, 2026)

**Goal:** Clicking/tapping a notification in the bell should open the **exact
card** it refers to, not just land on the list page. Today it navigates to the
entity's list route and leaves the user to find the item themselves.

### Current behavior (`components/shared/notification-bell.tsx`)
`handleClick` marks read + `router.push(ENTITY_ROUTE[n.entity_type])` — routes
to the list page only. The notification already carries **`entity_id`** and
**`entity_type`** (`'customer' | 'lead_opportunity' | 'won_job'`), so the target
is known; it's just not used to open the detail.

### Why it's not trivial
The three entity pages open detail via local React state (`setSelectedId`), not
the URL — there's no deep-link support yet. So navigating can't currently tell a
page "open this record."

### Scope
- **Bell:** push `${ENTITY_ROUTE[type]}?open=${entity_id}` instead of the bare route.
- **Each page** (`won-ready-op`, `leads-opportunities`, `customers`): on mount,
  read `useSearchParams().get('open')` → `setSelectedId(id)`; map the id field
  per type (`won_job`→`job_id`, `lead_opportunity`→`lead_op_id`,
  `customer`→`customer_id`). Then `router.replace` to strip the param so a
  refresh or closing the drawer doesn't re-open it.
- **Timing:** apply after data has hydrated/loaded (the record may not be in the
  store on first paint); guard for a not-found id (stale/deleted entity → no-op,
  land on the list).
- On the Won board, opening the card is enough — no need to also page to its
  stage (detail is a full drawer).

### Decisions to lock
1. Deep-link via **query param** (`?open=`) — simplest, shareable, no router
   schema change. (Alternative: path segment `/won-ready-op/[id]` — bigger refactor, skip.)
2. Strip the param after opening (recommended) vs keep it — recommend strip.

**Risk:** Low–Med — self-contained; main care is the load-timing/not-found guard
and clearing the param. No DB change.

---

## 🙋 Phase 3.6 — Default Owner = Signed-in User ✅ (Complete — Jul 14, 2026)

**Goal:** When creating a new record, the **Owner** field should default to the
**currently signed-in user** (editable — they can pick someone else before/after
saving). Today it's hardcoded to a fixed name.

### Current behavior
- New Lead/Opp form hardcodes `owner: 'Vitta'` (`components/shared/add-lead-op-form.tsx:152`).
- New Task form hardcodes `owner: 'Vitta'` (`app/tasks/page.tsx:92`).
- The signed-in name is readily available via `useAuth()` →
  `user?.user_metadata?.full_name ?? user?.email` (pattern already used in
  `add-activity-form`, `mobile-card-view`).

### Scope
- Initialize the owner in each create form to the signed-in user's name instead
  of the hardcoded string; keep the existing owner `<Select>` so it stays
  changeable. Applies to **New Lead/Opp** and **New Task**.
- **Won jobs** inherit `owner` from the lead on `markAsWon`, so fixing the lead
  default covers them automatically — no separate change.
- **Customers** also carry `owner`; if/where a customer is created without an
  owner picker, default it the same way (verify during build).
- Edge cases: fall back to `email` when `full_name` is missing; if the signed-in
  name isn't in the team `owner` options, still show it (it's a free string
  field, not FK-constrained).

### Decisions to lock
1. Match on **name string** (current model — `owner` is a display name, not a
   user id). Keep as-is; don't refactor to id.
2. Default only affects **new** records; never rewrite existing owners.

**Risk:** Low — a couple of form-init changes using auth context already wired
elsewhere. No DB/schema change.

---

## 🚨 Known Issues

### Medium Priority
- [ ] Mobile @mention autocomplete — mobile composer uses plain `<input>`, not `MentionTextarea`
- [ ] Permanent user lockout ("3.0-B") — add `is_active`/blocklist so a removed user can't sign back in
- [ ] Server-side customer search/pagination — current pagination is client-side (fine now; matters as data grows)
- [ ] `activity_id` column name — verify Supabase `activities` table uses `activity_id` not `id` before delete is exercised in prod
- [x] **Activity log timestamp shifts +7h after refresh** — FIXED via option (b) (normalize on read). Added `parseDbDate()` in `lib/utils.ts`: appends `Z` to zone-less date-time strings so DB timestamps parse as UTC (idempotent — `Z`/offset strings and date-only values pass through untouched). Replaced every `new Date(<db timestamp>)` display/sort site with `parseDbDate(...)`: `activity-timeline.tsx`, `notification-bell.tsx`, `operation-/sales-/admin-dashboard.tsx`, `customers/page.tsx`, `leads-opportunities/page.tsx`. **Root cause (kept for record):** `created_at`/`updated_at` columns are `TIMESTAMP` (timezone-naive) in `lib/supabase/schema.sql`, not `TIMESTAMPTZ`. Client writes `new Date().toISOString()` (UTC, `Z`-suffixed); Postgres drops the zone; PostgREST returns it without a `Z`; `new Date()` then parsed the zone-less string as local (UTC+7). Note: the DB columns remain naive — option (a) (`TIMESTAMPTZ` migration) is still the cleaner long-term fix if writes ever bypass the client.

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

**Last Updated:** July 14, 2026  
**Next Phase:** 2.7 — Won card due date + scheduled push (pending scheduler decision)
