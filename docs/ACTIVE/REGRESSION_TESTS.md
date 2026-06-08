# ✅ Regression Testing & QA Procedures

## Quick QA Checklist (Before Every Deploy)

```
FUNCTIONALITY (15 min)
□ Dashboard loads and displays stats
□ Won board: Can view all stages and cards
□ Can drag cards between stages
□ Can reorder stages by dragging
□ Changes persist after page refresh
□ Activity timeline shows all changes

MOBILE (10 min)
□ Test at 375px (iPhone SE)
□ No horizontal scrolling
□ All buttons clickable (44px+)
□ Cards readable on small screen
□ Forms input easily

QUALITY (5 min)
□ Open DevTools (F12)
□ Console: 0 errors, 0 warnings
□ Network: All requests successful (200/201)
□ Performance: Page load <2s

PRODUCTION (5 min)
□ Test live URL: https://sx-crm.vercel.app
□ Features work same as local
□ Data correct and up-to-date
```

---

## Phase 1 Feature Verification

### ✅ Dashboard
- [ ] Admin/Operation/Sales view toggle works
- [ ] Stat cards show correct numbers
- [ ] OP Pipeline section displays all stages
- [ ] Recent activity section scrollable
- [ ] Mobile responsive (tabs below 768px)

### ✅ Won & Ready OP Board
- [ ] Kanban grid loads with all stages
- [ ] Stage headers show colored dots
- [ ] Job cards display: number, title, date, value, owner
- [ ] Drag card from one stage to another → persists
- [ ] Reorder stages by dragging → persists
- [ ] Mobile: Cards stack vertically at 375px (no scroll)

### ✅ Stage Management
- [ ] Click stage dropdown menu
- [ ] Options: Sort, Delete, Change Color, Add Stage
- [ ] Sort options work (Order, Date, Value, Alphabetically)
- [ ] Delete with confirmation dialog
- [ ] Change color: 8 colors available
- [ ] Add stage: Create new stage with name + color
- [ ] All changes persist

### ✅ Customers Page
- [ ] List displays all 998+ customers
- [ ] Search filters in real-time
- [ ] Can create new customer
- [ ] Can edit customer details
- [ ] Changes persist
- [ ] Mobile responsive

### ✅ Leads & Opportunities
- [ ] List displays all leads
- [ ] Filter tabs: All, Open, Won, Lost
- [ ] Can create new lead
- [ ] Can change lead status
- [ ] Activity timeline shows changes
- [ ] Mobile responsive

### ✅ Mobile Experience
- [ ] At 375px: Single column layout
- [ ] At 768px: Multi-column layout
- [ ] At 1280px+: Full desktop layout
- [ ] No horizontal scrolling at any width
- [ ] Touch targets ≥44px
- [ ] Forms easy to fill on mobile

### ✅ Dark Theme
- [ ] Background: Dark charcoal
- [ ] Text: Bright, readable (not gray)
- [ ] Buttons: Colored with good contrast
- [ ] Disabled state: Clearly grayed
- [ ] Accent colors consistent (orange)

### ✅ Data Persistence
- [ ] Edit field → Click save → Refresh page → Value still there
- [ ] Drag card to new stage → Refresh → Card still in new stage
- [ ] Change stage color → Refresh → Color persists
- [ ] All edits appear in Supabase (verify in dashboard)

### ✅ Activity Timeline
- [ ] All changes logged (status, stage, edits)
- [ ] Timeline entries show user + timestamp
- [ ] Activity visible immediately after change
- [ ] Activity persists after page refresh
- [ ] Entries ordered chronologically (newest first)

### ✅ Console & Performance
- [ ] Open DevTools: 0 JavaScript errors
- [ ] 0 TypeScript compilation warnings
- [ ] All network requests successful
- [ ] Page load time <2 seconds
- [ ] State changes <500ms response time

---

## Testing for New Features (Template)

When implementing a new feature, follow this test plan:

### 1. **Happy Path (Must Pass)**
```
Feature: [Feature Name]
GIVEN: [Starting condition]
WHEN: [User action]
THEN: [Expected result]
  ✓ [Specific assertion 1]
  ✓ [Specific assertion 2]
  ✓ [Specific assertion 3]
```

### 2. **Edge Cases (Must Pass)**
- NULL/empty values → graceful handling
- Missing related data → doesn't crash
- Rapid repeated actions → debounced
- Network timeout → shows error, retry option
- Browser back button → state consistent

### 3. **Mobile Testing (Must Pass)**
- Works at 375px (iPhone SE)
- Works at 768px (Tablet)
- No horizontal scrolling
- Touch targets ≥44px
- Modals don't overflow

### 4. **Persistence (Must Pass)**
- Edit → Save → Refresh → Change still there
- Close browser → Reopen → Data persists
- Verify in Supabase (data actually in DB)

### 5. **Console Clean (Must Pass)**
- 0 errors
- 0 warnings
- All network requests 200/201

---

## Regression Test Matrix

| Area | Test | Desktop | Mobile | Result |
|------|------|---------|--------|--------|
| **Dashboard** | Load & display stats | ✅ | ✅ | PASS |
| | Role selector works | ✅ | ✅ | PASS |
| **Won Board** | View all stages | ✅ | ✅ | PASS |
| | Drag card to stage | ✅ | ✅ | PASS |
| | Reorder stages | ✅ | ✅ | PASS |
| | Change stage color | ✅ | ✅ | PASS |
| **Data** | Persist after refresh | ✅ | ✅ | PASS |
| | Activity logged | ✅ | ✅ | PASS |
| **Mobile** | 375px layout | — | ✅ | PASS |
| | 768px layout | — | ✅ | PASS |
| **Quality** | Console errors | ✅ | ✅ | 0 ✅ |
| | Build warnings | ✅ | ✅ | 0 ✅ |

---

## Production Verification (Post-Deploy)

After deploying to production:

### First Hour
- [ ] URL loads: https://sx-crm.vercel.app
- [ ] Dashboard displays (no 500 errors)
- [ ] Data loads from database
- [ ] Can interact with UI
- [ ] Watch Vercel logs for errors

### First 2 Hours
- [ ] Test 3 critical workflows end-to-end
- [ ] Monitor Supabase for query errors
- [ ] Check user feedback (is anyone reporting issues?)
- [ ] Performance acceptable (page load, response time)

### First 24 Hours
- [ ] No major issues reported
- [ ] Supabase error logs clean
- [ ] Vercel build status green
- [ ] Early adopters using new feature

### If Issues Found
```
Severity Assessment:
├─ CRITICAL (data loss, auth broken)
│  └─ Action: Rollback immediately
├─ MAJOR (feature doesn't work)
│  └─ Action: Revert + debug offline
└─ MINOR (typo, small UI bug)
   └─ Action: Fix in next release
```

---

## Automated Testing (Setup Instructions)

### Unit Tests
```bash
npm test -- --watch
```
Tests for individual functions:
- Store methods (updateWonJob, updateOpStage, etc.)
- Utility functions (formatting, filtering)
- Component rendering (basic functionality)

### Integration Tests
```bash
npm test:integration
```
Tests across components:
- Edit field → Store updates → UI refreshes
- Card moves → Database persists → Activity logged
- Role change → Dashboard refreshes → Different data shown

### E2E Tests (Coming Soon)
```bash
npm test:e2e
```
Full user workflows:
- Open app → Log in → View board → Drag card → Close
- Create new lead → Fill form → Submit → Verify in list
- Edit payment status → Refresh → Status persists

### Performance Tests
```bash
npm run lighthouse
```
Checks:
- Page load time <2s
- Largest Contentful Paint <1.5s
- Cumulative Layout Shift <0.1
- Mobile performance score ≥80

---

## Known Test Gaps (Phase 2+)

- [ ] Authentication flow (Phase 2.0)
- [ ] Role-based access (Phase 2.1)
- [ ] Mobile tabs (Phase 2.2)
- [ ] @Mentions system (Phase 2.3)
- [ ] Bulk operations
- [ ] Concurrent user updates
- [ ] Offline mode + sync

---

## QA Sign-Off Template

```
FEATURE: [Feature Name]
TESTED: [Date & Time]
TESTER: [Your Name]
DEVICES: [List devices tested]

PASSED:
✓ [Acceptance criteria 1]
✓ [Acceptance criteria 2]
✓ [Acceptance criteria 3]

FAILED:
✗ [Issue 1 - with repro steps]
✗ [Issue 2 - with repro steps]

ISSUES FOUND: [Count]
RECOMMENDATION: ⏳ Hold | 🚀 Ship | ⚠️ Monitor

SIGNED OFF BY: [Name] — [Approval/Rejection]
```

---

## Quick Reference

**"Tests must pass before shipping":**
- ✅ Feature works on mobile (375px, 768px, 1280px)
- ✅ Data persists (edit → refresh → still there)
- ✅ Console clean (0 errors, 0 warnings)
- ✅ Activity logs changes
- ✅ All acceptance criteria verified
- ✅ Stakeholder tested & approved

**"If production breaks":**
1. Assess severity (Critical? Major? Minor?)
2. If critical → Rollback immediately
3. If major → Revert + debug offline
4. If minor → Fix in next release
5. Document what went wrong

---

**Last Updated:** June 8, 2026  
**Test Coverage:** Phase 1 Complete  
**Next Phase:** Phase 2.0 (Auth) — Add auth flow testing
