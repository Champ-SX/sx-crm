# 🎯 PRIORITIZED FIX LIST — Release Guardian Priority Matrix

**Generated:** June 2, 2026  
**Owner:** Product Owner & Release Guardian  
**Status:** Ready for Development Sprint Planning

---

## PRIORITY MATRIX

### 🔴 CRITICAL (Blocks Release or Breaks Existing Features)

#### CRITICAL-1: Verify Position Field NULLs in Production
**Issue:** Jobs with NULL position values default to first position in column  
**Impact:** User frustration, unpredictable UI behavior, data integrity risk  
**Effort:** 1 hour  
**Status:** BLOCKING — Must complete before any release

**Action Items:**
```sql
-- Run in production database immediately
SELECT id, op_stage, position, created_at 
FROM won_jobs 
WHERE position IS NULL 
LIMIT 10;
```

**If NULLs Found:**
```sql
-- Migration required
UPDATE won_jobs 
SET position = row_number() OVER (PARTITION BY op_stage ORDER BY created_at)
WHERE position IS NULL;
```

**If No NULLs:**
- Document that position field is clean
- Add NOT NULL constraint to schema for future

**Acceptance Criteria:**
- [ ] No NULL position values in production
- [ ] Position field behavior is consistent
- [ ] Database constraint prevents future NULLs

---

#### CRITICAL-2: Remove Non-Functional "Add Stage" Button
**Issue:** Button suggests feature that doesn't exist (clicks console.log only)  
**Impact:** User confusion, false affordance, breaks design integrity  
**Effort:** 15 minutes  
**Status:** BLOCKING — Remove immediately

**Action Items:**
- [ ] Delete "Add Stage" button from `app/won-ready-op/page.tsx` (lines ~970-985)
- [ ] OR: Replace with disabled button + tooltip "Coming soon" if you want to keep placeholder
- [ ] Test board layout after deletion
- [ ] Verify no UI breakage

**Acceptance Criteria:**
- [ ] Button is removed OR disabled with explanation
- [ ] Board layout remains clean
- [ ] No console errors

---

#### CRITICAL-3: Correct Task #4 Status in Backlog
**Issue:** Task says "Edit color for each stage column" (marked ✓ complete) but feature NOT implemented  
**Impact:** False confidence in feature completion, misaligned team understanding  
**Effort:** 5 minutes  
**Status:** BLOCKING — Fix tracking immediately

**Action Items:**
- [ ] Change task status from ✓ COMPLETE to ⏳ BACKLOG/NOT STARTED
- [ ] Add note: "Feature not yet implemented. Infrastructure exists (DynamicOPStage), needs hook-up"
- [ ] Re-estimate effort (likely 4-6 hours if actually needed)

**Acceptance Criteria:**
- [ ] Task backlog reflects true status
- [ ] No more false positives

---

### 🟡 HIGH (Core Features Missing, Workarounds Exist)

#### HIGH-1: Implement Status Fields (Payment/Staff/Docs)
**Issue:** Status fields defined in schema but completely absent from UI  
**Impact:** Operations team cannot track job readiness, uses external spreadsheets  
**Effort:** 12-16 hours  
**Status:** BLOCKING — Core CRM feature  
**Priority:** Phase 1 (Weeks 1-2 of dev)

**Breakdown:**
- Payment status display: 3 hours
- Staff confirmation workflow: 5 hours
- Doc checklist: 3 hours
- Activity logging integration: 3 hours
- Testing: 2 hours

**Acceptance Criteria:**
- [ ] Payment status visible on cards (badge: red/yellow/green)
- [ ] Payment status editable in JobDetail
- [ ] Staff confirmation workflow functional (send request, staff confirms)
- [ ] Doc checklist visible (4-item checklist)
- [ ] All status changes logged to activity timeline
- [ ] Mobile layout works with new badges
- [ ] No UI regression

---

#### HIGH-2: Implement Status Filtering
**Issue:** No way to filter board by status (e.g., "show awaiting payment")  
**Impact:** Operations can't quickly find jobs needing action  
**Effort:** 6-8 hours  
**Status:** Phase 2 (Week 3 of dev)

**Breakdown:**
- Filter UI component: 2 hours
- Filter logic: 2 hours
- Multiple filters (stack): 2 hours
- Mobile responsive: 1 hour
- Testing: 1 hour

**Acceptance Criteria:**
- [ ] Can filter by payment status
- [ ] Can filter by staff status
- [ ] Can filter by doc status
- [ ] Multiple filters can be applied
- [ ] Filters work on mobile
- [ ] Filter state persists on page refresh

---

#### HIGH-3: Implement Status Summary Dashboard
**Issue:** No overview of pipeline health ("5 jobs awaiting payment")  
**Impact:** Operations has no quick health check of operational readiness  
**Effort:** 4-6 hours  
**Status:** Phase 2 (Week 3 of dev)

**Breakdown:**
- Summary UI component: 2 hours
- Status aggregation logic: 1 hour
- Real-time updates: 1 hour
- Click to filter integration: 1 hour
- Testing: 1 hour

**Acceptance Criteria:**
- [ ] Dashboard shows counts: "X awaiting payment | Y staff pending | Z docs missing"
- [ ] Counts update real-time
- [ ] Clicking count filters board to that status
- [ ] Works on mobile
- [ ] Matches design system

---

### 🟠 MEDIUM (Enhancements, Nice-to-Have)

#### MEDIUM-1: Wire Up Activity Auto-Logging for Status Changes
**Issue:** Activity timeline exists but status changes don't auto-log  
**Impact:** Audit trail incomplete, can't track who changed what when  
**Effort:** 2-3 hours  
**Status:** Phase 1 (include with status implementation)

**Breakdown:**
- Hook status updates to activity creation: 1 hour
- Format activity messages: 0.5 hours
- Test activity logging: 1 hour
- Verify timestamp accuracy: 0.5 hours

**Acceptance Criteria:**
- [ ] Every status change creates activity entry
- [ ] Activity shows: "Payment status changed from unpaid → paid"
- [ ] Timestamp is accurate
- [ ] User name is recorded
- [ ] Activity appears immediately in timeline

---

#### MEDIUM-2: Implement Position Field Database Migration
**Issue:** Some existing jobs might have NULL position values  
**Impact:** Reordering unpredictable until migration runs  
**Effort:** 1 hour  
**Status:** Pre-release (before Phase 1)

**Breakdown:**
- Write migration script: 0.5 hours
- Test on staging database: 0.5 hours

**Acceptance Criteria:**
- [ ] Migration script sets position for all NULL rows
- [ ] Order is logical (by created_at within each stage)
- [ ] No data loss
- [ ] Tested on staging

---

#### MEDIUM-3: Remove Tasks Menu (Completed)
**Issue:** Tasks menu removed from sidebar (commit 5b9d226)  
**Status:** ✅ DONE

---

### 🟢 LOW (Nice-to-Have, Later Phases)

#### LOW-1: Implement Dynamic Stages
**Issue:** DynamicOPStage infrastructure exists but unused  
**Impact:** Stages are hardcoded, can't adapt without code change  
**Effort:** 8-12 hours  
**Status:** Backlog (Phase 3+)

**Breakdown:**
- Create DynamicOPStage table in Supabase: 0.5 hours
- Load stages dynamically on page load: 1 hour
- Add stage management UI: 3 hours
- Handle stage reordering: 2 hours
- Migrate existing jobs to new system: 2 hours
- Testing: 2 hours

**Note:** Only implement if operations needs custom stages

---

#### LOW-2: Implement Bulk Actions
**Issue:** No way to batch-update jobs (e.g., mark all as payment complete)  
**Impact:** Saves time on large batches but risky without proper safeguards  
**Effort:** 4-6 hours  
**Status:** Backlog (Phase 3+)

**Acceptance Criteria:**
- [ ] Can select multiple jobs via checkboxes
- [ ] Can apply status change to all selected
- [ ] Shows confirmation before proceeding
- [ ] Works only with filtered views (safer)

---

#### LOW-3: Add Notification System
**Issue:** No notifications for staff confirmations, payment reminders, doc deadlines  
**Impact:** Operations manually follows up instead of system-triggered alerts  
**Effort:** 6-10 hours  
**Status:** Backlog (Phase 3+)

---

---

## RELEASE READINESS CHECKLIST

**BEFORE RELEASING TO PRODUCTION:**

- [ ] Position field NULLs verified or migrated
- [ ] "Add Stage" button removed
- [ ] Task #4 status corrected in backlog
- [ ] Status fields displayed and editable
- [ ] Status changes logged to activity
- [ ] All 8 QA tests pass
- [ ] Mobile/tablet/desktop all work
- [ ] Drag-drop persists on refresh
- [ ] No console errors
- [ ] No formula or database errors
- [ ] Operations team approval obtained

---

## SPRINT PLANNING RECOMMENDATION

### Sprint 1: Critical Fixes (June 3-6, 2 days)
1. CRITICAL-1: Verify/fix position field NULLs
2. CRITICAL-2: Remove "Add Stage" button
3. CRITICAL-3: Correct task tracking
4. Run full QA test suite

**Effort:** 2-3 hours  
**Blocker:** None if position field is clean

---

### Sprint 2: Phase 1 — Status Implementation (June 10-20, 2 weeks)
1. HIGH-1: Payment status (display + update + activity logging)
2. HIGH-1: Staff status (confirmation workflow + activity logging)
3. HIGH-1: Doc status (checklist + activity logging)
4. MEDIUM-1: Auto activity logging integration
5. MEDIUM-2: Position field migration (if needed)

**Effort:** 14-18 hours  
**Deliverable:** Fully functional status tracking in all three dimensions

---

### Sprint 3: Phase 2 — Operational Intelligence (June 21-27, 1 week)
1. HIGH-2: Status filtering
2. HIGH-3: Status summary dashboard
3. Full operations team testing

**Effort:** 10-14 hours  
**Deliverable:** Operations team can filter and dashboard shows health metrics

---

### Sprint 4: Phase 3 — Automation & Scale (July 1+)
1. LOW-1: Dynamic stages (if needed)
2. LOW-2: Bulk actions (if needed)
3. LOW-3: Notification system (if needed)
4. Analytics and reporting

**Effort:** 20+ hours  
**Deliverable:** Advanced operational workflows

---

## RISK ASSESSMENT

### Green Lights (Low Risk)
- ✅ Status field schema already exists
- ✅ Activity timeline component already built
- ✅ Drag-drop and sorting already working
- ✅ Mobile optimization already done

### Yellow Lights (Medium Risk)
- ⚠️ Position field NULL behavior needs verification
- ⚠️ Staff confirmation workflow requires new UI pattern
- ⚠️ Integration with payment system unclear (external or in-app?)

### Red Lights (High Risk)
- 🔴 If payment tracking integrates with external system, scope expands significantly
- 🔴 If operations already has established workflows we're not aware of, we might miss requirements
- 🔴 If staff needs SMS/email confirmation, notification system is prerequisite

**Mitigation:**
- Get operations team sign-off on requirements BEFORE Sprint 2
- Prototype staff confirmation workflow with 1-2 test users in Sprint 1
- Clarify payment integration scope with Finance team

---

## SUCCESS METRICS

After Phase 1 Complete (June 25):
- [ ] Operations team can see job readiness at a glance
- [ ] 95%+ of jobs marked with correct status
- [ ] Activity timeline shows all status changes
- [ ] No manual spreadsheet for status tracking

After Phase 2 Complete (June 27):
- [ ] Operations can filter to find specific job patterns
- [ ] Dashboard shows "health" of operations pipeline
- [ ] Reduced time to identify blocked jobs

---

**Final Status:** 🟢 **READY FOR SPRINT PLANNING**  
**Next Step:** Get operations team input, begin Sprint 1 on June 3

