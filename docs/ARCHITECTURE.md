# 🗺️ IMPLEMENTATION ROADMAP — Status Tracking Features

**Product Owner:** Release Guardian  
**Timeline:** June 10 - June 27, 2026  
**Target:** Production Deployment: June 28, 2026

---

## MASTER TIMELINE

```
Week 1 (June 3-6):     Critical Fixes & Verification
Week 2 (June 10-20):   Phase 1 — Core Status Features  
Week 3 (June 21-27):   Phase 2 — Operational Intelligence
June 28:               Production Release
```

---

## PHASE 1: CORE STATUS FEATURES (Weeks 2-3)

### Feature 1A: Payment Status (Priority: TIER 1)

#### 1A1: Add Payment Status Display to Job Cards
**File:** `app/won-ready-op/page.tsx`  
**Component:** `JobCard` (currently renders in grid)

**What to Add:**
```tsx
// Add payment status badge to JobCard
// Show: "🔴 Unpaid" | "🟡 Partial" | "🟢 Paid" | "🔴 Overdue"
// Position: Below job value, above owner name
// Size: Small badge (like status indicators in CRM)
```

**Design:**
- Badge color: Matches status (red/yellow/green/red)
- Icon: Payment icon (💳) for clarity
- Tooltip on hover: "Click to edit payment status"

**Testing:**
- [ ] Badge appears on all job cards
- [ ] Colors match design spec
- [ ] Works on mobile (doesn't overflow)
- [ ] Tooltip works on hover
- [ ] Multiple jobs show different statuses correctly

---

#### 1A2: Add Payment Status Editor to JobDetail Modal
**File:** `app/won-ready-op/page.tsx`  
**Component:** `JobDetail` modal (section C or new section)

**What to Add:**
```tsx
// Add "Payment" section in JobDetail modal
// Section content:
//   - Status dropdown: unpaid / partial / paid / overdue
//   - Deposit amount: input field
//   - Balance due: calculated (estimated_value - deposit)
//   - Balance due date: date picker
//   - Notes: text field for payment notes
```

**Placement:**
- Add new section between "Company Account" and "OP Stage"
- Or add to existing "OP Stage" section as subsection
- Include expand/collapse for cleaner UI

**Interaction:**
- User selects status from dropdown
- On change: Call `updateWonJob` in store
- Show success message "Payment status updated"
- Auto-refresh badge on card

**Testing:**
- [ ] All status options selectable
- [ ] Changes persist to database
- [ ] Card badge updates immediately
- [ ] Activity log records change

---

#### 1A3: Wire Up Payment Status to Activity Logging
**File:** `store/crm-store.ts`  
**Function:** `updateWonJob`

**What to Add:**
```typescript
// In updateWonJob function, detect when payment_status changes
if (oldJob.payment_status !== newJob.payment_status) {
  createActivity({
    job_id: jobId,
    type: 'status_change',
    title: `Payment status changed`,
    description: `${oldJob.payment_status} → ${newJob.payment_status}`,
    user_id: currentUser.id,
    timestamp: new Date()
  })
}
```

**Testing:**
- [ ] Activity created when status changes
- [ ] Old and new values shown correctly
- [ ] Timestamp accurate
- [ ] Activity visible in JobDetail timeline immediately

---

### Feature 1B: Staff Status (Priority: TIER 1)

#### 1B1: Add Staff Status Display to Job Cards
**File:** `app/won-ready-op/page.tsx`  
**Component:** `JobCard`

**What to Add:**
```tsx
// Add staff confirmation badge to JobCard
// Show: "🟡 Pending (1/3)" if some staff not confirmed
//       "🟢 Confirmed" if all staff confirmed
//       "⚪ N/A" if no staff assigned
// Position: Below payment status
```

**Design:**
- Badge shows count: "Pending (1/3)" = 1 of 3 staff confirmed
- Click badge to open staff confirmation modal
- Tooltip: "Click to manage staff confirmations"

**Testing:**
- [ ] Badge shows correct count
- [ ] Clicking opens staff panel
- [ ] Works with 1-5 staff members
- [ ] Mobile layout doesn't break

---

#### 1B2: Implement Staff Confirmation Workflow
**File:** `app/won-ready-op/page.tsx`  
**Component:** New `StaffConfirmationPanel`

**What to Add:**
```tsx
// In JobDetail modal, replace or enhance StaffSheet
// New workflow:
//   1. List assigned staff
//   2. Show confirmation status for each
//   3. Send confirmation request (if not confirmed)
//   4. Staff can confirm via app or link
//   5. Mark as confirmed when ready

// For each staff member:
//   [John Smith]  ✓ Confirmed (June 1)
//   [Sarah Lee]   ✗ Pending (Request sent 5/31)
//   [Mike Jones]  ⚪ Not assigned yet

// Button: "Send Confirmation Request"
// Link: "Copy shareable confirmation link"
```

**Interaction:**
1. Operations assigns staff (already works via StaffSheet)
2. Confirmation status = "pending"
3. Operations clicks "Send Confirmation Request"
4. Staff gets notification (in-app or email)
5. Staff clicks confirmation link or confirms in app
6. Status changes to "confirmed"
7. Badge updates on card
8. Activity logs the confirmation

**Testing:**
- [ ] Can assign multiple staff
- [ ] Confirmation requests sent/received
- [ ] Staff can confirm via link or app
- [ ] Status updates reflect confirmations
- [ ] Activity logged for each confirmation

---

#### 1B3: Wire Up Staff Status to Activity Logging
**File:** `store/crm-store.ts`

**What to Add:**
```typescript
// Log staff assignments and confirmations
// Activity types:
//   - "staff_assigned": New staff member added
//   - "staff_confirmed": Staff member confirmed availability
//   - "staff_removed": Staff member removed

// Example:
// "John Smith assigned to this event"
// "Sarah Lee confirmed availability"
```

**Testing:**
- [ ] Staff assignment logged
- [ ] Confirmation logged
- [ ] All staff actions appear in timeline
- [ ] Timestamps accurate

---

### Feature 1C: Doc Status (Priority: TIER 1)

#### 1C1: Add Doc Status Display to Job Cards
**File:** `app/won-ready-op/page.tsx`  
**Component:** `JobCard`

**What to Add:**
```tsx
// Add docs badge to JobCard
// Show: "🟡 Pending (3/5)" if some docs missing
//       "🟢 Ready" if all docs collected
// Position: Below staff status
```

**Design:**
- Badge shows: "Pending (3/5)" = 3 of 5 required docs collected
- Click to open doc checklist
- Tooltip: "Click to manage documentation"

**Testing:**
- [ ] Badge shows correct count
- [ ] Updates when docs added
- [ ] Works with 2-6 docs per event
- [ ] Mobile layout preserves

---

#### 1C2: Implement Doc Checklist in JobDetail
**File:** `app/won-ready-op/page.tsx`  
**Component:** New `DocChecklistPanel`

**What to Add:**
```tsx
// In JobDetail modal, add "Documentation" section
// Checklist items (with dates, who's responsible):
//   ☑ Contract Signed (Sales responsibility)
//   ☑ Venue Info Received (Customer provides)
//   ☑ Equipment Specs Confirmed (Operations confirms)
//   ☐ Delivery Method Confirmed (Customer specifies)

// For each item:
//   [✓/☐] Item Name
//   Status: "Done (June 1)" or "Pending (Due June 5)"
//   Owner: "Sales" or "Customer" or "Operations"
//   Button: "Mark Complete" or "Upload Document" or "Review"

// Summary badge: "3/4 docs ready (75%)"
```

**Interaction:**
1. Show all required docs in checklist format
2. Operations marks docs complete as they arrive
3. Can upload documents directly (or link to external storage)
4. Show deadline for each doc
5. Auto-warn if deadline approaching
6. Prevent stage advancement if docs incomplete

**Testing:**
- [ ] All 4 docs appear in checklist
- [ ] Can mark items complete
- [ ] Can upload documents
- [ ] Badge updates when all complete
- [ ] Prevents stage advancement if incomplete

---

#### 1C3: Wire Up Doc Status to Activity Logging
**File:** `store/crm-store.ts`

**What to Add:**
```typescript
// Log documentation progress
// Activity types:
//   - "doc_received": Document uploaded or marked complete
//   - "doc_missing_warning": Deadline approaching
//   - "doc_status_complete": All docs ready

// Example:
// "Contract signed (uploaded by customer)"
// "Venue info received"
```

**Testing:**
- [ ] Each doc change logged
- [ ] Document name included in activity
- [ ] Timestamps accurate
- [ ] Timeline shows doc progression

---

### Feature 1D: Activity Logging Integration
**File:** `store/crm-store.ts`

**What to Do:**
- Hook all status changes (payment, staff, docs) to activity creation
- Format messages clearly: "Status changed from X → Y"
- Include user who made change
- Timestamp automatically set
- Visible immediately in JobDetail timeline

**Testing:**
- [ ] Every status change creates activity entry
- [ ] Activities appear in correct order
- [ ] Timeline shows all changes
- [ ] No duplicate entries

---

---

## PHASE 2: OPERATIONAL INTELLIGENCE (Week 3)

### Feature 2A: Status Filtering on Kanban Board

#### 2A1: Add Filter UI to Board Header
**File:** `app/won-ready-op/page.tsx`

**What to Add:**
```tsx
// Add filter dropdowns to board header (below "Won & Ready for OP")
// Filters:
//   1. Payment Status: [All] [Unpaid] [Partial] [Paid] [Overdue]
//   2. Staff Status:   [All] [Pending] [Confirmed] [N/A]
//   3. Doc Status:     [All] [Pending] [Ready] [N/A]

// Layout: Horizontal filter bar, right-align with sort dropdown
// Responsive: Stack vertically on mobile
```

**Interaction:**
- Click dropdown to select filter value
- Multiple filters can be active simultaneously
- Shows count: "3 jobs match filter"
- Save filter preference to localStorage
- "Clear all filters" button

**Testing:**
- [ ] Can filter by each status dimension
- [ ] Multiple filters work together
- [ ] Job count updates correctly
- [ ] Filters persist on page refresh
- [ ] Mobile layout responsive

---

#### 2A2: Implement Filter Logic
**File:** `app/won-ready-op/page.tsx`

**What to Do:**
```typescript
// Update wonJobs.filter() to include status filters
// Logic:
//   const filtered = wonJobs.filter(job => {
//     if (paymentFilter && job.payment_status !== paymentFilter) return false
//     if (staffFilter && job.staff_status !== staffFilter) return false
//     if (docFilter && job.doc_status !== docFilter) return false
//     return true
//   })
```

**Testing:**
- [ ] Each filter reduces job count correctly
- [ ] Combining filters intersects correctly
- [ ] "All" option shows unfiltered list
- [ ] No performance degradation

---

#### 2A3: Add "No Results" State
**File:** `app/won-ready-op/page.tsx`

**What to Add:**
```tsx
// If filtered list is empty, show message:
// "No jobs match this filter"
// "Try removing one of the filters"
// Button: "Clear all filters"
```

**Testing:**
- [ ] Message appears when no matches
- [ ] Clear button removes filters
- [ ] Doesn't break layout

---

### Feature 2B: Status Summary Dashboard

#### 2B1: Add Summary Panel Above Kanban Board
**File:** `app/won-ready-op/page.tsx`

**What to Add:**
```tsx
// Summary cards at top of page:
//   ┌─────────────────────────────────┐
//   │ 🔴 Awaiting Payment: 5 jobs     │
//   │ 🟡 Partial Payment: 3 jobs      │
//   │ 🟢 Payment Complete: 12 jobs    │
//   │                                  │
//   │ 🟡 Staff Pending: 2 jobs        │
//   │ 🟢 Staff Confirmed: 18 jobs     │
//   │                                  │
//   │ 🟡 Docs Pending: 4 jobs         │
//   │ 🟢 Docs Ready: 16 jobs          │
//   └─────────────────────────────────┘

// Layout:
//   3 columns: Payment | Staff | Docs
//   Each card shows statuses
//   Cards clickable (filter board to that status)
```

**Interaction:**
- Click any card to filter board to that status
- Cards update real-time when status changes
- Show trending indicator (up/down from yesterday?)
- Hover tooltip: "[5] jobs awaiting payment - click to view"

**Testing:**
- [ ] Counts accurate
- [ ] Updates when status changes
- [ ] Clicking filters board correctly
- [ ] Mobile layout readable
- [ ] Performance acceptable (no lag)

---

#### 2B2: Implement Summary Calculation Logic
**File:** `app/won-ready-op/page.tsx`

**What to Do:**
```typescript
// Calculate counts for each status
const paymentCounts = {
  unpaid: wonJobs.filter(j => j.payment_status === 'unpaid').length,
  partial: wonJobs.filter(j => j.payment_status === 'partial').length,
  paid: wonJobs.filter(j => j.payment_status === 'paid').length,
  overdue: wonJobs.filter(j => j.payment_status === 'overdue').length,
}
// Similar for staff and docs
```

**Testing:**
- [ ] Counts match filtered views
- [ ] No counting errors
- [ ] Updates on status change

---

#### 2B3: Real-Time Updates
**File:** `store/crm-store.ts`

**What to Do:**
- When any job status changes, re-calculate summary counts
- Dashboard updates immediately
- No page refresh needed

**Testing:**
- [ ] Status change in one job updates summary
- [ ] Counts stay synchronized with actual data
- [ ] No lag or delays

---

---

## DATABASE SCHEMA UPDATES

### Add to `won_jobs` table (if not already present):

```sql
ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS (
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue')),
  staff_status TEXT DEFAULT 'pending' CHECK (staff_status IN ('pending', 'confirmed', 'na')),
  doc_status TEXT DEFAULT 'pending' CHECK (doc_status IN ('pending', 'ready', 'na')),
  balance_due DECIMAL(10, 2),
  balance_due_date DATE,
  deposit_amount DECIMAL(10, 2),
  deposit_received_date DATE
);

-- Add NOT NULL constraint to position field
ALTER TABLE won_jobs ALTER COLUMN position SET NOT NULL;
```

### Create `job_documents` table (for tracking docs):

```sql
CREATE TABLE IF NOT EXISTS job_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES won_jobs(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- 'contract', 'venue_info', 'equipment_specs', 'delivery_method'
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ready')),
  due_date DATE,
  uploaded_by TEXT,
  uploaded_date TIMESTAMP,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_job_documents_job_id ON job_documents(job_id);
```

### Create `staff_confirmations` table (for tracking confirmations):

```sql
CREATE TABLE IF NOT EXISTS staff_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES won_jobs(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  confirmation_requested_date TIMESTAMP,
  confirmation_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_staff_confirmations_job_id ON staff_confirmations(job_id);
```

---

## TYPE UPDATES

### Update `types/index.ts`:

```typescript
export interface WonJob {
  // ... existing fields ...
  
  // New status fields
  payment_status: PaymentStatus
  staff_status: StaffStatus
  doc_status: DocStatus
  
  // Payment tracking
  deposit_amount?: number
  deposit_received_date?: string
  balance_due?: number
  balance_due_date?: string
  
  // Relationships
  documents?: JobDocument[]
  staff_confirmations?: StaffConfirmation[]
}

export interface JobDocument {
  id: string
  job_id: string
  doc_type: 'contract' | 'venue_info' | 'equipment_specs' | 'delivery_method'
  status: 'pending' | 'ready'
  due_date?: string
  uploaded_by?: string
  uploaded_date?: string
  document_url?: string
  notes?: string
}

export interface StaffConfirmation {
  id: string
  job_id: string
  staff_id: string
  status: 'pending' | 'confirmed' | 'declined'
  confirmation_requested_date?: string
  confirmation_date?: string
  notes?: string
}
```

---

## STORE UPDATES

### Update `store/crm-store.ts`:

```typescript
// Add methods:
updatePaymentStatus(jobId, status, details)
updateStaffStatus(jobId, status)
updateDocStatus(jobId, status)
confirmStaffMember(jobId, staffId)
requestStaffConfirmation(jobId, staffId)
uploadJobDocument(jobId, docType, url)
getStatusSummary() // returns counts by status
```

---

## TESTING CHECKLIST

### Unit Tests:
- [ ] Status getters/setters
- [ ] Validation (payment_status is valid enum)
- [ ] Activity creation on change
- [ ] Summary calculation logic
- [ ] Filter logic

### Integration Tests:
- [ ] Status change in store → UI updates
- [ ] Store update → database persistence
- [ ] Page refresh → data persists
- [ ] Multiple jobs behave independently

### E2E Tests (with Operations Team):
- [ ] Assign staff → request confirmation → staff confirms → status updates
- [ ] Upload doc → status changes pending → ready
- [ ] Change payment status → activity logged → card badge updates
- [ ] Filter by status → board shows only matching jobs
- [ ] Summary cards show accurate counts

### Mobile Tests:
- [ ] All new elements responsive
- [ ] Badges don't overflow
- [ ] Filters accessible on small screen
- [ ] Touch interactions work
- [ ] No horizontal scroll

### Performance Tests:
- [ ] Board load time < 2s (50+ jobs)
- [ ] Status change propagates < 500ms
- [ ] Summary calculation < 100ms
- [ ] Filter application < 300ms

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment:
- [ ] All tests passing
- [ ] Code review approved
- [ ] Operations team has tested and approved
- [ ] Database migrations tested on staging
- [ ] Rollback plan documented
- [ ] Backup taken

### Deployment:
- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Get operations team sign-off
- [ ] Deploy to production
- [ ] Monitor error rates and performance
- [ ] Gather feedback from operations team

### Post-Deployment:
- [ ] Monitor system for 24 hours
- [ ] Check activity logs for any errors
- [ ] Gather operations team feedback
- [ ] Document any issues
- [ ] Plan Phase 3 (if proceeding)

---

## SUCCESS CRITERIA

**After Phase 1 (June 20):**
- ✅ All three statuses visible and editable
- ✅ Activity timeline shows all changes
- ✅ Operations team can manage statuses
- ✅ No UI regressions
- ✅ All tests passing

**After Phase 2 (June 27):**
- ✅ Filtering works smoothly
- ✅ Summary dashboard shows real-time counts
- ✅ Operations team using filters to prioritize work
- ✅ Reduced time to find "awaiting payment" jobs (5 min → 10 sec)
- ✅ No spreadsheet workarounds needed

---

## RISK MITIGATION

**Risk:** Database constraints too restrictive (rejected valid values)  
**Mitigation:** Use CHECK constraints instead of ENUM, more flexible

**Risk:** Performance degradation with many jobs  
**Mitigation:** Add database indexes on status columns, test with 500+ jobs

**Risk:** Operations team doesn't use new features  
**Mitigation:** Get sign-off on requirements, provide training, make obvious/intuitive

**Risk:** Data migration from old system breaks  
**Mitigation:** Test migration on staging with real data before production

---

## HANDOFF TO OPERATIONS

**June 27 - Release Day:**
1. Demo new features (10 min)
2. Show how to use filters (5 min)
3. Explain status meanings (5 min)
4. Answer questions (10 min)
5. "You're clear to use this in production"

---

**Status:** 🟢 **READY FOR DEVELOPMENT**  
**Product Owner Signature:** _______________  
**Release Guardian Approval:** _______________  
**Date:** June 2, 2026
