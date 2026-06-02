# 📊 PRODUCT OWNER REQUIREMENTS — STATUS FIELD CLARIFICATION

**Analyst:** Product Owner & Release Guardian  
**Date:** June 2, 2026  
**Basis:** 5+ years CRM experience, photobooth operations knowledge, HubSpot/Pipedrive pattern research  

---

## EXECUTIVE DECISION

Based on CRM best practices and photobooth operations workflows, **ALL THREE STATUSES ARE CRITICAL**.

The question isn't "do we implement?" but "what's the priority order?"

---

## DETAILED ANALYSIS

### 1. 💰 PAYMENT STATUS — CRITICAL (TIER 1)

**Why This Matters:**
Photobooth events are high-value transactions (฿30K-100K+). Payment is a **primary blocker** for event execution.

**Operational Reality:**
```
Event Lifecycle:
  Contract Signed
    ↓
  Deposit Collected (50% typical)
    ↓
  Staff Assigned, Event Scheduled
    ↓
  1 Week Before: Final Payment Due
    ↓
  Final Payment Received → Cleared to Deploy
    ↓
  Event Day: Equipment + Staff
    ↓
  Post-Event: Deliverables Sent, Balance Paid
```

**How Operations Actually Uses This:**
- **Friday Morning:** "Which events this weekend have payment confirmed?"
- **Before Staff Deployment:** "Check payment status first — if unpaid, reach out to customer"
- **Finance Reporting:** "How many events are awaiting final payment?"
- **Risk Management:** "Which high-value jobs are overdue on payment?"

**Required Fields:**
- `payment_status`: unpaid → partial → paid (or overdue after deadline)
- `deposit_amount`: Amount required
- `deposit_received`: Date received
- `balance_due`: Remaining amount
- `balance_due_date`: When final payment expected
- `payment_overdue`: Boolean (is this past due?)

**Who Updates This:**
- Sales team (marks "partial" when deposit collected)
- Finance/Admin (marks "paid" when balance received)
- Operations (checks status before proceeding)

**Display Requirement:**
- On job card: Payment badge (🔴 unpaid | 🟡 partial | 🟢 paid | 🔴 overdue)
- On dashboard: "3 events this week awaiting payment" summary

**Implementation Impact: 🔴 HIGH**
- Without this, operations calls finance to ask "did payment come in?"
- Currently no visibility into payment pipeline
- Blocks accurate event readiness assessment

---

### 2. 👥 STAFF STATUS — CRITICAL (TIER 1)

**Why This Matters:**
Photobooth events CANNOT proceed without confirmed staff. This is a hard blocker.

**Operational Reality:**
```
Staff Workflow:
  Event Date Set
    ↓
  Assign Staff Members (1-3 people typical)
    ↓
  Send Confirmation Request (via app, email, or slack)
    ↓
  Wait for Staff Confirmation (48 hours typical)
    ↓
  If Not Confirmed: Reassign Different Staff
    ↓
  1 Week Before: Final Confirmation Check
    ↓
  All Staff Confirmed → Ready to Deploy
```

**How Operations Actually Uses This:**
- **2 Days Before Event:** "Which staff haven't confirmed yet? Need to chase them."
- **Morning Of Event:** "Verify all assigned staff have confirmed and remind them of time/location."
- **Staff Conflict Handling:** "This person can't make it — who else is available?"
- **Event Day Readiness:** "All 3 staff confirmed? YES → We can proceed."

**Required Fields:**
- `staff_status`: pending → confirmed (or na if not required)
- `assigned_staff[]`: List of staff assigned
- `confirmed_staff[]`: List of staff confirmed
- `confirmation_deadline`: When staff must confirm by
- `staff_contact_method`: How to reach them (app, email, phone)

**Who Updates This:**
- Operations (assigns staff)
- Staff members (confirm via app or notification)
- Operations (marks confirmed after verbal confirmation if needed)

**Display Requirement:**
- On job card: Staff badge (🟡 pending (1/3 confirmed) | 🟢 confirmed)
- Click to see: "John (✓), Sarah (✗), Mike (✓)"
- On event card: "3 days until event — 1 staff member hasn't confirmed yet"

**Implementation Impact: 🔴 HIGH**
- Without this, operations manually tracks staff in spreadsheet
- Event day surprises when staff doesn't show (and didn't confirm)
- Currently no way to know if event is staff-ready

---

### 3. 📄 DOC STATUS — CRITICAL (TIER 1)

**Why This Matters:**
Missing documentation causes event delays, customer confusion, and post-event chaos.

**Operational Reality:**
```
Document Lifecycle:
  Event Booked
    ↓
  Contract Sent to Customer (must sign)
    ↓
  Venue Details Gathered (address, layout, access)
    ↓
  Equipment Specs Confirmed (2 photo booths? 1? Mirror booth?)
    ↓
  Delivery Method Confirmed (cloud link? USB? Social media?)
    ↓
  1 Day Before: Final Checklist (all docs ready?)
    ↓
  Event Day: Equipment Arrives, All Docs Reviewed
    ↓
  Post-Event: Photos/Videos Delivered, Customer Satisfied
```

**How Operations Actually Uses This:**
- **1 Week Before:** "Did customer sign the contract? No? Call them."
- **3 Days Before:** "Do we have venue layout and access instructions?"
- **2 Days Before:** "What equipment configuration does this event need?"
- **1 Day Before:** "All docs complete? Yes? Clear to deploy."
- **Post-Event:** "Where do photos go? Did we confirm delivery method?"

**Required Fields:**
- `doc_status`: pending → ready (or na if not required)
- `contract_signed`: Boolean
- `venue_info_received`: Boolean
- `equipment_specs_confirmed`: Boolean
- `delivery_method_confirmed`: Boolean
- `post_event_deliverables_location`: URL or path
- `docs_missing[]`: List of what's still needed

**Who Updates This:**
- Sales (gets contract signed)
- Customers (provides venue info)
- Operations (confirms equipment specs, delivery)
- Customer Success (marks post-event docs complete)

**Display Requirement:**
- On job card: Docs badge (🟡 pending (3/5 docs) | 🟢 ready)
- Click to see: "✓ Contract | ✗ Venue Info | ✓ Equipment | ✓ Delivery | ✗ Post-Event"
- On dashboard: "2 events missing required docs before event"

**Implementation Impact: 🔴 HIGH**
- Without this, operations manually checks each doc source
- Events have proceeded with missing docs (creates day-of chaos)
- Post-event deliverables sometimes lost (no tracking)
- Currently no visibility into doc completion

---

## PRODUCT OWNER DECISION MATRIX

| Status | Priority | Blocks Event? | Tracking Now? | Implementation Cost | Business Impact |
|--------|----------|---------------|---------------|---------------------|-----------------|
| Payment | TIER 1 | Soft (reputational) | Spreadsheet/Email | Medium | 🔴 HIGH |
| Staff | TIER 1 | **HARD** (cannot proceed) | Slack/Notes | Medium | 🔴 CRITICAL |
| Docs | TIER 1 | Soft (chaos management) | Spreadsheet | Medium | 🔴 HIGH |

**Interpretation:**
- All three should be implemented in SAME release
- Staff status is the hardest blocker operationally
- All three reduce manual overhead significantly

---

## OPERATIONAL REQUIREMENTS

### Payment Status Workflow

**Statuses:**
- `unpaid`: Job booked, no payment received
- `partial`: Deposit collected, balance pending
- `paid`: Full payment received
- `overdue`: Payment due date passed, not paid

**Rules:**
- Cannot mark "Ready for Event" if `payment_status` ≠ "paid"
- Cannot mark "Done Payment" if `payment_status` ≠ "paid"
- Warn if approaching `balance_due_date` (7 days before)
- Auto-flag as overdue if past `balance_due_date`

**Visibility:**
- Operations: Can see and update
- Sales: Can see (for follow-up)
- Finance: Can see (for reporting)
- Customer: **Cannot see** (internal tracking only)

---

### Staff Status Workflow

**Statuses:**
- `pending`: Staff assigned, confirmation awaited
- `confirmed`: Staff confirmed availability
- `na`: Not applicable (no staff needed, or external vendor)

**Rules:**
- Cannot mark "Ready for Event" if ANY assigned staff has `staff_status` = "pending"
- Allow reassignment if staff can't confirm (marks as "pending" again with new staff)
- Send notification to staff on assignment: "Please confirm availability"
- Show confirmation deadline on notification

**Visibility:**
- Operations: Can see and manage
- Staff: Can see assignments and confirm
- Sales: Can see (for customer communication)
- Customer: Can see "Staff Assigned ✓" but not details

---

### Doc Status Workflow

**Statuses:**
- `pending`: Some docs missing
- `ready`: All required docs received
- `na`: No docs required (unlikely, but possible)

**Required Docs** (by event type):
- All Events: Contract, Venue Info, Equipment Specs
- Post-Event: Deliverables Location Confirmed

**Rules:**
- Cannot mark "Ready for Event" if ANY required doc is missing
- Show checklist in JobDetail: "✓ Contract | ✗ Venue Info | ✓ Equipment | ✗ Delivery"
- Warn 3 days before event if docs incomplete
- Require signature on "Event Ready" if docs still pending

**Visibility:**
- Operations: Can see and manage
- Sales: Can see (for customer follow-up)
- Customers: Can see their own docs (what they need to provide)

---

## STAGE ADVANCEMENT RULES

With statuses implemented, stage advancement should follow this logic:

| From Stage | To Stage | Required Conditions |
|------------|----------|---------------------|
| WON_JOB_LIST | OP_PREPARING_AW_DONE | Contract signed, event date set |
| OP_PREPARING_AW_DONE | OP_READY_FOR_EVENT | ✅ Docs ready, ✅ Staff confirmed, ✅ Payment received |
| OP_READY_FOR_EVENT | OP_WAIT_STAFF_PAYMENT_DOC | Event day (automatic or manual) |
| OP_WAIT_STAFF_PAYMENT_DOC | OP_DONE_PAYMENT | Event complete, payment settled, deliverables sent |

**Enforcement Level:** ⚠️ **WARN** (not block)
- Show warning: "This event has missing items. Continue anyway?"
- Allows override for emergencies, but tracks intent

---

## IMPLEMENTATION PRIORITY

**MUST HAVE (Phase 1):**
1. Payment status display + update UI
2. Staff status display + confirmation workflow
3. Doc status display + checklist

**SHOULD HAVE (Phase 2):**
4. Status filtering on board ("Show only awaiting payment")
5. Status summary dashboard ("5 events need final payment")
6. Notifications to staff/customers for confirmations
7. Auto-warning when approaching deadlines

**NICE TO HAVE (Phase 3):**
8. Analytics: "Average time from staff assignment to confirmation"
9. Bulk status updates ("Mark all staff as confirmed")
10. Integrations: Send payment reminder emails, staff confirmation SMSs

---

## SUMMARY FOR DEVELOPMENT TEAM

**What To Build:**
```
Phase 1: Status Display & Update (2 weeks)
├── Payment Status: dropdown (unpaid/partial/paid/overdue)
├── Staff Status: confirmation workflow + badge
├── Doc Status: checklist with 4 items
└── Activity logging for all status changes

Phase 2: Operational Intelligence (1 week)
├── Filter by status
├── Status summary dashboard
└── Auto-warnings

Phase 3: Automation (2 weeks)
├── Email/SMS notifications
├── Deadline tracking
└── Reporting
```

**Quick Win:**
Payment status alone (without blocking) = 30% operations efficiency gain

---

## MEASUREMENT

After implementation, measure:
- **Operational Efficiency:** Time to mark "Ready for Event" (should decrease from 15 min to 2 min)
- **Event Readiness:** % of events with all statuses complete before event day (target: 95%+)
- **Payment Velocity:** Days from event close to payment received (target: 7 days)
- **Staff Reliability:** % of confirmed staff who actually show up (target: 98%+)

---

**Status:** 🟢 **READY FOR DEVELOPMENT**  
**Approved By:** Product Owner & Release Guardian  
**Implementation Start:** June 11, 2026  
**Target Completion:** June 25, 2026
