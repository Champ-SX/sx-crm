# 📋 SX CRM KANBAN BOARD AUDIT — OPERATIONS TEAM INPUT NEEDED

**TO:** Operations Team  
**FROM:** Product Owner & Release Guardian  
**DATE:** June 2, 2026  
**SUBJECT:** Clarifying Job Status Requirements Before Implementation  
**PRIORITY:** 🔴 HIGH — Blocking Feature Development

---

## EXECUTIVE SUMMARY

We've completed a comprehensive audit of the Won & Ready for OP Kanban Board. The system is functionally solid for basic job movement, but **we need your input** before we add critical status tracking features.

**The Question:** How do you actually manage jobs operationally?

---

## WHAT WE FOUND

The CRM has three status fields ready to be implemented:
- **Payment Status** (unpaid/partial/paid/overdue)
- **Staff Status** (pending/confirmed/na)  
- **Doc Status** (pending/ready/na)

These fields exist in the database but are **completely hidden from the UI**. Before we add them to the system, we need to understand:

**Are these statuses essential for running photobooth events?**

If yes → we implement them immediately  
If no → we document them as "future capability"  
If unclear → we need to discuss your workflow

---

## THE AUDIT CHECKLIST: YOUR INPUT NEEDED

### 1. 💰 PAYMENT STATUS — How Is Payment Tracked?

**Current System:**
- Jobs show estimated value (e.g., "฿50,000")
- No visibility into payment progress
- No way to see "awaiting payment" jobs

**Questions for Operations:**
- [ ] Do you need to see which jobs have deposits collected?
- [ ] Do you track partial payments (50% deposit, 50% balance)?
- [ ] Do you have payment deadlines tied to event dates?
- [ ] Do overdue payments block job progression?
- [ ] Who updates payment status (Sales, Operations, Finance)?
- [ ] How often is payment checked (daily, weekly, event-day)?

**Example Use Case:**
"Before deploying staff to an event, I need to confirm payment is complete. Right now I have to manually check a separate system."

---

### 2. 👥 STAFF STATUS — How Do You Confirm Staff Availability?

**Current System:**
- You can assign staff members to jobs in the app
- No way to see "pending staff confirmation"
- No way to block event if staff isn't available

**Questions for Operations:**
- [ ] Do staff members need to confirm they're available?
- [ ] Can you book staff who haven't confirmed yet?
- [ ] How far in advance do staff need to confirm (1 week? 1 month?)?
- [ ] Do you need multiple staff per event?
- [ ] Is staff unavailability a blocker (can't proceed without confirmation)?
- [ ] Do you have a separate staff scheduling system we're replacing?

**Example Use Case:**
"I assign staff to an event, but I need to track whether they've confirmed availability. Right now I track this in a separate spreadsheet."

---

### 3. 📄 DOC STATUS — What Documents Are Required?

**Current System:**
- Jobs have customer/company info
- No way to track document completion
- No checklist of required docs

**Questions for Operations:**
- [ ] What documents are required before each event?
  - [ ] Signed contract
  - [ ] Venue details/setup info
  - [ ] Equipment list/specifications
  - [ ] Post-event deliverables (photos/video links)
  - [ ] Other: ________________
- [ ] Are missing documents a blocker (can't proceed without them)?
- [ ] Who uploads documents (customer, sales, you)?
- [ ] What's the deadline for each document?

**Example Use Case:**
"Before the event, I need to verify all documents are ready. Missing docs have caused events to be delayed. I want a checklist in the app."

---

## THE STAKES

**If these statuses are critical:**
- You're currently managing them outside the CRM (spreadsheets, emails, slack)
- Adding them to the CRM saves significant manual work
- We prioritize implementation immediately

**If these statuses aren't used:**
- We don't build them (avoid complexity)
- System stays focused on what matters

**If we get it wrong:**
- You'll ignore the status fields because they don't match your workflow
- We'll have wasted development time
- You'll keep using external spreadsheets (we want to eliminate that)

---

## WHAT WE NEED FROM YOU

### Please Answer These 5 Questions:

1. **Of the three statuses (payment/staff/docs), which are ESSENTIAL for your daily work?**
   - [ ] Payment Status — YES, CRITICAL
   - [ ] Payment Status — NICE TO HAVE
   - [ ] Payment Status — NOT NEEDED
   - [ ] Staff Status — YES, CRITICAL
   - [ ] Staff Status — NICE TO HAVE
   - [ ] Staff Status — NOT NEEDED
   - [ ] Doc Status — YES, CRITICAL
   - [ ] Doc Status — NICE TO HAVE
   - [ ] Doc Status — NOT NEEDED

2. **For each "CRITICAL" status, how often do you check it?**
   - Daily / Weekly / Before each event / Other: ___

3. **What system do you currently use to track these?**
   - CRM (other system name): ___
   - Spreadsheet: ___
   - Email chain: ___
   - Handwritten notes: ___
   - Other: ___

4. **Should status changes block job progression?**
   - Example: "Can't mark job 'Ready for Event' unless payment is confirmed"
   - Your answer: ___

5. **Who needs access to see statuses?**
   - [ ] Operations team only
   - [ ] Sales team
   - [ ] Finance team
   - [ ] Customers (they see their job status)
   - [ ] Other: ___

---

## TIMELINE

**June 2-9:** Operations team provides feedback  
**June 10:** Product Owner synthesizes requirements  
**June 11-20:** Development implements approved features  
**June 21:** Feature testing with operations team  
**June 25:** Production deployment  

---

## FULL AUDIT REPORT

A comprehensive technical audit has been completed. See: `KANBAN_BOARD_AUDIT_REPORT.md`

**Key Findings:**
- ✅ Drag-and-drop works (recently fixed)
- ✅ Job reordering works (recently fixed)
- ✅ Sort by date/value works (recently fixed)
- ❌ Status tracking completely absent from UI
- ❌ No filtering by customer/owner/date
- ❌ "Add Stage" button is non-functional

---

## NEXT STEPS

1. **Operations Team:** Complete the checklist above and send responses to product owner
2. **Product Owner:** Analyze feedback and create implementation roadmap
3. **Development:** Implement approved features in priority order
4. **Operations Team (Again):** Test features and provide feedback

---

**Contact:** champ@sixsheet.me  
**Questions?** Reply to this memo or schedule a sync  
**Urgency:** We need your input by June 9 to stay on schedule

---

**Appendix:** Full technical audit available in KANBAN_BOARD_AUDIT_REPORT.md
