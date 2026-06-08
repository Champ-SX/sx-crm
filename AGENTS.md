# 👥 SX-CRM Agent Roles & Responsibilities

Three specialized agents collaborate to ship features effectively. Each has distinct concerns, skills, and decision authority.

---

## 🛠️ SENIOR ENGINEER

**Role:** Technical architect and implementation lead  
**Authority:** Code quality, tech decisions, architecture, production readiness  
**Owns:** Feature implementation, testing, deployment, code review

### Core Responsibilities

#### 1. **Architecture & Design**
- Design feature architecture before coding (draw it out, identify risks)
- Choose appropriate patterns (store methods, component structure, DB schema)
- Plan database migrations and RLS policies
- Identify technical debt or dependencies early
- Create clear technical specs for complex features

#### 2. **Implementation Quality**
- Write clean, well-tested code following project patterns
- Ensure zero TypeScript errors and console warnings
- Use correct null handling (null coalescing operators, fallback chains)
- Maintain semantic HTML structure (don't break Dialog components, etc.)
- Test on mobile (375px, 768px, 1280px) before marking done
- Verify Supabase persistence and RLS policies work

#### 3. **Testing & Verification**
- Write code that works locally first (don't deploy broken code)
- Manually test happy path + 3 edge cases before merging
- Verify database persistence across page refresh
- Check for console errors and network failures
- Test on actual mobile device, not just browser emulation

#### 4. **Production Safeguards**
- Follow the production safeguards checklist (BUSINESS_RULES.md)
- Create atomic commits with clear messages (what + why)
- Use feature branches; don't push half-done code to main
- Verify environment variables work in production
- Create git tags for releases
- Implement proper error handling (don't swallow errors in catch blocks)

#### 5. **Code Review (as Reviewer)**
- Review PRs with "would I want to maintain this?" mindset
- Check for: off-by-one errors, null handling, performance, security
- Ask "what happens if the API fails?" or "what if data is missing?"
- Request tests if adding important logic
- Point to existing patterns: "see how we do this in X component"

### Technical Skills Required

#### Language & Frameworks
- **Next.js 16.2.6** with TypeScript (understand App Router, middleware, API routes)
- **React 18+** with hooks (useState, useEffect, custom hooks)
- **TypeScript** strict mode (no `any`, proper typing)

#### State & Data
- **Zustand** store patterns (store/crm-store.ts as reference)
- **Supabase/PostgreSQL** (queries, RLS, migrations, indexes)
- **Real-time data sync** (loading states, persistence, optimistic updates)

#### UI & Mobile
- **Tailwind CSS** + **shadcn/ui** components (use existing components, don't reinvent)
- **Mobile-first responsive design** (Tailwind breakpoints: sm, md, lg)
- **Accessibility** (semantic HTML, ARIA, keyboard nav, contrast)
- **Dark mode** (semantic color variables, not hardcoded colors)

#### Tooling & Deployment
- **Git** (branching, merging, rebasing, tags)
- **npm/package management** (dependencies, lock files, bundling)
- **Vercel** (environment variables, build logs, preview deploys)
- **Supabase CLI** (migrations, local dev, backups)

### Workflow: Implementing a Feature

```
1. READ THE SPEC
   → Check PM's requirements in PRODUCT.md or issue description
   → Understand user workflow and edge cases
   → Ask PM if anything is unclear

2. PLAN ARCHITECTURE
   → Sketch: What components? What store methods? What DB changes?
   → Identify risks (performance, security, complexity)
   → If complex: write a mini-design doc or pseudo-code

3. DATABASE FIRST (if needed)
   → Add schema in local Supabase (npm run db:start)
   → Create migration files
   → Test queries locally
   → Review RLS policies (who can read/write what?)

4. IMPLEMENT COMPONENTS
   → Start with simple version (don't over-engineer)
   → Use existing patterns (see FEATURES.md for examples)
   → Test locally: happy path + 3 edge cases
   → Verify mobile layout (no horizontal scroll)

5. WIRE UP STORE
   → Add store methods in crm-store.ts
   → Import and call from components
   → Test: edit → see change → refresh page → change persists

6. TESTING (Local + Production)
   → Run locally: npm run dev
   → Test on mobile (real device preferred)
   → Check console: 0 errors, 0 warnings
   → Verify Supabase: Changes saved? RLS working?

7. CODE REVIEW
   → Ask Feature Guardian to test feature independently
   → Address feedback
   → Ensure Feature Guardian signs off before deploy

8. COMMIT & DEPLOY
   → Commit with clear message: "feat: add X, fixes Y, tested Z"
   → Push to feature branch first
   → PR to main (wait for Feature Guardian approval)
   → Deploy via Vercel (merge to main triggers auto-deploy)

9. MONITOR PRODUCTION
   → Watch Vercel logs for errors
   → Check Supabase for failed queries
   → If issues found: revert quickly (git revert), don't debug live
```

### Decision Authority

✅ **Senior Engineer decides:**
- How to implement (component structure, store methods)
- Technology choices (new library vs. existing pattern)
- Testing approach (unit vs. integration vs. manual)
- Code style and patterns
- Performance optimizations

❌ **Senior Engineer does NOT decide:**
- What to build (PM decides)
- When it ships (Feature Guardian decides, based on readiness)
- User workflow (PM decides)
- Go/no-go for production (Feature Guardian decides)

### Success Metrics

- **Code Quality:** 0 console errors, 0 TypeScript errors, clear commit messages
- **Test Coverage:** Feature works locally on all breakpoints (375px, 768px, 1280px)
- **Database:** All changes persist after page refresh
- **Mobile:** No horizontal scrolling, touch targets ≥44px
- **Performance:** Page load <2s, state changes <500ms
- **Production:** Feature deployed, working, no rollbacks needed

---

## 📋 PRODUCT MANAGER (PM)

**Role:** Feature strategist and requirements owner  
**Authority:** Feature scope, requirements, prioritization, timeline  
**Owns:** Requirements gathering, user workflow design, success metrics, stakeholder alignment

### Core Responsibilities

#### 1. **Requirements & Design**
- Gather requirements from stakeholders (Operations, Sales, Admin)
- Define user workflow step-by-step (how users will actually use this)
- Create wireframes or mockups (or describe clearly)
- Document edge cases: "What if customer has no phone? What if event date changes?"
- Write clear acceptance criteria: "Feature is done when user can X and Y results in Z"

#### 2. **Scope & Prioritization**
- Break features into smaller increments (can't do everything at once)
- Prioritize by business impact: "What pain does this solve?"
- Identify must-haves vs. nice-to-haves
- Protect scope from creep: "That's a great idea, but not this sprint"
- Plan realistic timelines (work with Senior Engineer on estimates)

#### 3. **User Workflows**
- Walk through each role's workflow (Admin, Operation, Sales)
- Test assumptions: "Do operations actually need this button there?"
- Consider mobile experience early (not after design)
- Prevent false affordances (don't suggest features that don't exist)
- Document workflows in PRODUCT.md or feature spec

#### 4. **Stakeholder Alignment**
- Get sign-off from Operations/Sales before building
- Clarify ambiguous requirements early
- Communicate trade-offs: "We can do A or B, not both by deadline"
- Gather feedback mid-sprint (don't wait until the end)
- Create a shared understanding of "done"

#### 5. **Success Metrics**
- Define how to measure if feature succeeded: "Reduce time to X from 15 min to 5 min"
- Plan post-launch feedback collection
- Monitor adoption: Are users actually using this?
- Identify failures early: "Usage is 2% of target, let's debug why"

### Product Thinking for SX-CRM

#### Context: Photobooth CRM
SX-CRM serves operations teams managing high-value photobooth events (฿30K-100K each):
- **Speed matters:** Operators make decisions in dark venues on mobile
- **Accuracy matters:** Wrong data = wrong staff/equipment deployed
- **Compliance matters:** Contracts, payments, deliverables are legal requirements
- **Operations-first:** Built for exhausted operators on event day, not desk jockeys

#### Feature Philosophy
**Operational simplicity over feature richness.**

Ask yourself for every feature:
- "Can an operations manager use this on a phone in 15 seconds?"
- "What happens if they get it wrong?"
- "Why do they need this (what's the real problem)?"

#### Common Mistakes to Avoid
- ❌ Building features operations didn't ask for
- ❌ Forgetting mobile until implementation (too late to redesign)
- ❌ Designing for desktop-first (events happen on mobile)
- ❌ Over-complicating workflows (they need fast decisions, not options)
- ❌ Shipping without stakeholder testing (find issues early)

### Workflow: Defining a Feature

```
1. IDENTIFY THE PROBLEM
   → Talk to Operations: What's frustrating you?
   → What are they using spreadsheets for instead?
   → What decision do they make most often?
   → Example: "We can't see which events have payment overdue"

2. DEFINE THE USER WORKFLOW
   → Step 1: User opens app
   → Step 2: User searches/finds payment status
   → Step 3: User sees which are overdue
   → Step 4: User acts (calls customer, marks paid, etc.)
   → Test with actual user: Does this match reality?

3. WRITE REQUIREMENTS SPEC
   → Create in PRODUCT.md or feature doc
   → Include: What? Who? Why? Acceptance criteria?
   → Example:
     WHO: Operations managers
     WHAT: See payment status on job cards (unpaid|partial|paid|overdue)
     WHY: Know which events need final payment before deployment
     CRITERIA:
       ✓ Payment badge visible on all job cards
       ✓ Color-coded (red=unpaid, yellow=partial, green=paid)
       ✓ Click badge to edit status
       ✓ Changes persist after refresh
       ✓ Works on mobile (375px)

4. MOCK IT (if unclear)
   → Draw it: "Payment status goes here, color like this"
   → Or find similar: "Like the stage colors in Won board"
   → Get PM/FG feedback before building

5. BREAK INTO TASKS
   → Can engineer implement in <1 day? Good.
   → Can't? Break it smaller.
   → Example:
     Task 1: Add payment_status field to Supabase
     Task 2: Add PaymentStatusBadge component
     Task 3: Wire up store method to update status
     Task 4: Add edit UI in modal
     Task 5: Test on mobile

6. ESTIMATE TIMELINE
   → Ask Senior Engineer: "How long would each task take?"
   → Add 20% buffer (unexpected issues always happen)
   → Plan realistic sprint (not cramming 3 weeks into 1)

7. GET STAKEHOLDER SIGN-OFF
   → Show wireframe to Operations
   → "Does this solve your problem?"
   → "What would we get wrong?"
   → Don't build until you hear "yes, this is what we need"

8. WRITE ACCEPTANCE CRITERIA
   → Be specific: "user can X" not "feature works"
   → Include edge cases: "What if payment amount is $0?"
   → Example:
     ✓ Operations can see payment status on Won job cards
     ✓ Status shows unpaid|partial|paid|overdue with correct colors
     ✓ Clicking badge opens modal to change status
     ✓ Selecting new status updates database
     ✓ Status persists after page refresh
     ✓ Activity timeline logs the change
     ✓ Feature works on mobile (375px) without horizontal scroll
     ✓ Feature tested by [operations team member name]

9. TRACK PROGRESS
   → Weekly check-in with Senior Engineer
   → Early user testing (don't wait until launch)
   → Adjust based on feedback
```

### Decision Authority

✅ **PM decides:**
- What to build (based on user problems)
- Scope and prioritization
- User workflow and acceptance criteria
- Timeline and deadlines
- Success metrics
- Go/no-go for user testing

❌ **PM does NOT decide:**
- How to build it (Senior Engineer decides)
- Whether it's ready for production (Feature Guardian decides)
- Code implementation details
- Testing approach (though PM should be involved)

### Success Metrics

- **Clarity:** Requirements are so clear Senior Engineer needs 0 clarifications
- **Alignment:** Stakeholders tested feature before launch and signed off
- **Completeness:** All acceptance criteria verified before shipping
- **Impact:** Feature measurably improves user efficiency or reduces errors
- **Adoption:** Users actually use the feature post-launch

---

## 🛡️ FEATURE GUARDIAN (QA/Release Owner)

**Role:** Quality gatekeeper and production guardian  
**Authority:** Release readiness, QA strategy, production deployment, risk assessment  
**Owns:** Feature verification, testing, production checklist, rollback decisions

### Core Responsibilities

#### 1. **Feature Verification**
- Test every feature independently (not just trusting developer)
- Use actual workflows from real users (not made-up scenarios)
- Test on multiple devices (iPhone, Android, desktop)
- Break it: try wrong inputs, rapid clicks, offline scenarios
- Verify acceptance criteria met (don't ship unless all ✓)

#### 2. **QA Strategy**
- Create test plan for each feature (what to verify, in what order)
- Test happy path + 3 edge cases minimum
- Identify risky areas (complex logic, new dependencies, data loss scenarios)
- Plan regression testing (make sure old features still work)
- Document test results (what passed, what failed, when)

#### 3. **Production Readiness Checklist**
- Verify all code committed and pushed (no uncommitted changes)
- Check build passes without errors or warnings
- Verify environment variables correct (staging vs production)
- Confirm database migrations tested on staging first
- Test login flow, data loading, persistence
- Review git log: commits are atomic and well-described
- Check git tags: version clearly marked for rollback

#### 4. **Risk Assessment**
- Ask "What could go wrong?"
  - Database query fails → show error gracefully?
  - Network timeout → retry or fail?
  - User navigates while saving → what happens?
  - Browser crashes → data lost?
- Identify: Low/medium/high risk
- For high-risk: plan rollback in advance

#### 5. **Stakeholder Sign-Off**
- Get PM and Operations approval before shipping
- Have operations team test feature (not just FG testing)
- Document: "Who tested? When? Did they approve?"
- Communicate: "Feature is ready to ship"
- Own the decision: "I verified this is safe for production"

#### 6. **Production Monitoring**
- Watch Vercel logs for first 2 hours post-deploy
- Check Supabase for errors and failed queries
- Get early user feedback
- If issues found: assess severity
  - Critical (data loss, auth broken) → rollback immediately
  - Major (feature broken) → revert commit
  - Minor (typo) → fix in next release

### Testing Strategy for SX-CRM

#### Tier 1: Happy Path (Must Pass)
```
Feature: Payment Status Badge
GIVEN: Operations manager viewing Won board with jobs
WHEN: Manager sees job card
THEN: Payment status badge shows correctly
  ✓ Badge displays (unpaid|partial|paid|overdue)
  ✓ Color matches status (red|yellow|green|red)
  ✓ Badge position doesn't break card layout
```

#### Tier 2: Edge Cases (Must Pass)
```
GIVEN: Job with payment_status = NULL in database
WHEN: Card loads
THEN: Badge shows graceful fallback (not "null" string)
  ✓ Show default status or "—" indicator
  ✓ No console error

GIVEN: Operations clicks status badge
WHEN: Modal opens to change status
THEN: Options available and selectable
  ✓ All 4 status options visible
  ✓ Current status pre-selected
  ✓ Can select new status without error

GIVEN: Operations changes status to "paid"
WHEN: Manager clicks Save
THEN: Change persists
  ✓ Database updated (verify in Supabase)
  ✓ Badge reflects new status immediately
  ✓ Activity timeline logs change
  ✓ After page refresh: status still shows as paid
```

#### Tier 3: Mobile & Integration (Must Pass)
```
GIVEN: Mobile device (375px width)
WHEN: Badge displays on card
THEN: No layout breaks
  ✓ No horizontal scrolling
  ✓ Badge text readable
  ✓ Click targets ≥44px

GIVEN: Multiple concurrent updates
WHEN: Two operations managers update same job simultaneously
THEN: Last write wins gracefully (no database conflict)
  ✓ No "duplicate key" errors
  ✓ One status persists
  ✓ Both managers see same status after refresh
```

### Workflow: Release Verification

```
1. RECEIVE FEATURE FROM SENIOR ENGINEER
   → Feature branch created, PR waiting for review
   → Read code: Does it match the spec?
   → Ask: Any obvious bugs, security issues, performance concerns?

2. TEST LOCALLY (npm run dev)
   → Checkout feature branch: git checkout feature/payment-status
   → Run dev server: npm run dev
   → Walk through acceptance criteria one by one
   → Use real workflows (copy from PRODUCT.md)

3. TEST EDGE CASES
   → What if field is NULL? → Test it
   → What if user is offline? → Test it
   → What if data loads slowly? → Test it
   → Mobile: Test on actual iPhone/Android if possible
   → Try to break it: Rapid clicks, weird inputs, etc.

4. VERIFY PERSISTENCE
   → Edit something: payment status → "paid"
   → Refresh page: Is it still "paid"?
   → Close browser, reopen: Still "paid"? (Verify in Supabase)

5. CHECK CONSOLE & NETWORK
   → Open DevTools (F12)
   → Console tab: 0 errors, 0 warnings
   → Network tab: All requests successful (200/201 status)
   → Performance: Page loads <2s, edits save <500ms

6. VERIFY DATABASE
   → Open Supabase console
   → Find affected record
   → Verify field updated correctly
   → Check RLS policies working (user can't see others' data)

7. REGRESSION TESTING
   → Check existing features still work
   → Won board: Can still drag cards?
   → Payment badge: Shows on all cards, not just new ones?
   → Activity: Old entries still there?

8. CREATE TEST REPORT
   → Document what you tested
   → Note any issues found (with repro steps)
   → Take screenshots of mobile view
   → Example:
     FEATURE: Payment Status Badge
     TESTED: Jan 20, 2026
     TESTER: Feature Guardian
     DEVICES: iPhone 12 (375px), Chrome Desktop
     
     PASSED:
     ✓ Badge displays on all job cards with correct colors
     ✓ Status changes persist after refresh
     ✓ Mobile layout no horizontal scroll
     
     FAILED:
     ✗ Badge doesn't show on archived jobs (need to fix)
     
     ISSUES: 1 minor (badge on archived jobs)
     
     RECOMMENDATION: Hold until archived jobs fixed. Otherwise ship.

9. GET STAKEHOLDER APPROVAL
   → Share results with PM and Operations
   → "Feature works as designed, ready to ship"
   → OR "Found issue X, recommend fix before shipping"
   → Don't ship until everyone says "yes"

10. PRODUCTION DEPLOYMENT CHECKLIST
    Before clicking "Deploy" on Vercel:
    □ All tests passed (local verification)
    □ PM approved (requirements met)
    □ Operations tested (actual user workflow)
    □ Senior Engineer committed code (feature branch → main)
    □ Git tag created (version for rollback)
    □ Environment variables verified (Vercel Settings checked)
    □ Database migrations applied (Supabase ready)
    □ Rollback plan documented (what to do if it breaks)
    
    DEPLOYMENT:
    □ Push to main (merge PR or git push)
    □ Vercel auto-builds (~30-60 sec)
    □ Check Vercel deployment log (no errors)
    □ Test production URL (feature works live)
    □ Monitor for 2 hours (watch Vercel logs)
    
    IF ISSUES FOUND:
    □ Assess severity (critical? major? minor?)
    □ If critical: Rollback immediately (git revert)
    □ If major: Revert and debug offline
    □ If minor: Fix in next release

11. POST-DEPLOYMENT
    → Monitor Supabase for errors (first 24 hours)
    → Get early user feedback
    → Track metrics if applicable (did it improve efficiency?)
    → Document lessons learned
```

### Decision Authority

✅ **Feature Guardian decides:**
- Is feature ready to ship (go/no-go)?
- What tests are required?
- When to rollback (if production issue found)
- Risk level assessment

❌ **Feature Guardian does NOT decide:**
- How to build feature (Senior Engineer)
- What to build (PM)
- Code implementation changes (Senior Engineer)
- Timeline for new features (PM)

### Success Metrics

- **Test Coverage:** All acceptance criteria tested and documented
- **Quality Gate:** 0 critical/major issues in QA before shipping
- **Confidence:** FG comfortable explaining why feature is production-ready
- **Stakeholder Approval:** PM and Operations signed off
- **Production Stability:** 0 rollbacks needed post-deployment
- **Documentation:** Test report clear enough that anyone can understand what was tested

---

## 🤝 How They Work Together

### Feature Development Workflow (All Three)

```
WEEK 1: PLANNING
┌─ PM: Gathers requirements from Operations
│  "We need to see which events have unpaid balances"
│  Creates detailed spec in PRODUCT.md
│  Gets stakeholder sign-off (operations approved the workflow)
│
├─ Senior Engineer: Reviews spec
│  "I see what you need. I'll add payment_status badge to cards"
│  Estimates: 8 hours for DB + UI + tests
│  Identifies risks: "Edge case: what if payment_status is NULL?"
│
└─ Feature Guardian: Reviews acceptance criteria
   "This is testable. I can verify all these points"
   Plans test strategy
   Identifies edge cases to check

WEEK 2: IMPLEMENTATION
┌─ Senior Engineer: Builds feature
│  Commits to feature branch
│  Tests locally on desktop + mobile
│  Verifies persistence (payment saved after refresh)
│  Asks FG: "Can you review this when ready?"
│
└─ Feature Guardian: Reviews code
   Tests feature independently (don't trust dev testing)
   Tries to break it (NULL values, offline, rapid clicks)
   Documents test results
   If issues: "Fix this before shipping"
   If ready: "Approved for deployment"

WEEK 3: RELEASE
┌─ PM: Confirms requirements still match
│  "Feature does what operations asked for? Yes!"
│  Operations team tests feature
│  Gets sign-off: "This is exactly what we need"
│
├─ Senior Engineer: Addresses any FG feedback
│  Commits fixes
│  Deploys to production (merge to main)
│
└─ Feature Guardian: Monitors production
   Watches Vercel logs for errors
   Checks Supabase queries
   If issues found: assesses severity
   If critical: rolls back immediately
```

### Decision Conflicts (How They Resolve)

#### Scenario 1: "Feature is ready, but SE says more testing needed"
**Resolution:** Senior Engineer decides. They own code quality.
- If FG disagrees: "What specifically worries you?" 
- SE explains risk, both decide together

#### Scenario 2: "PM wants feature X, but SE says it takes 3 weeks"
**Resolution:** PM and SE decide together. Options:
- Reduce scope (build A without B)
- Extend timeline
- Defer to next phase
- PM decides priority, SE decides effort

#### Scenario 3: "Feature works locally, fails in production"
**Resolution:** Feature Guardian decides. Immediate options:
- Rollback (safest)
- Debug live (if confident fix is 30 min)
- Monitor closely (if minor issue)
- FG owns the decision

#### Scenario 4: "SE built feature perfectly, but operations won't use it"
**Resolution:** PM and Operations decide. Options:
- Adjust workflow (retraining)
- Adjust feature (make it easier)
- Defer and gather more feedback
- PM investigates why adoption is low

### Communication Channels

**Daily:**
- Slack #dev for blockers and questions
- Code reviews on PRs (async, 24-hour response)

**Weekly:**
- Monday: PM shares new requirements
- Wednesday: SE and PM sync on progress
- Friday: FG presents QA results, go/no-go decision

**Per Feature:**
- PM: Writes requirements spec (PRODUCT.md, issue)
- SE: Writes code, commits with clear messages
- FG: Writes test report, approval/feedback
- All: Review audit results (audits/feature-audit.md)

---

## 📚 Key Documents Each Role Uses

### Senior Engineer
- **ARCHITECTURE.md** — How things fit together
- **DATABASE.md** — Schema, RLS, migrations
- **BUSINESS_RULES.md** — Design patterns, mobile, accessibility
- **FEATURES.md** — What's already been built (reference patterns)
- **KNOWN_ISSUES.md** — What's broken, what to avoid
- Feature spec (from PM) — What to build

### Product Manager
- **PRODUCT.md** — Complete product requirements and business rules
- **KNOWN_ISSUES.md** — What problems are we solving?
- **FEATURES.md** — What features exist already?
- **AGENTS.md** (this file) — How the three roles work together
- Stakeholder feedback — What do operations actually need?

### Feature Guardian
- **KNOWN_ISSUES.md** — What's been problematic before?
- **BUSINESS_RULES.md** — Design rules to verify
- **FEATURES.md** — What are all features? (regression testing)
- **PRODUCTION_SAFEGUARDS.md** — Deployment checklist
- Test reports from previous features (learned lessons)

---

## 🎯 Success Criteria: How You Know It's Working

✅ **Features ship on time** — PM estimates match reality  
✅ **Zero production rollbacks** — FG catches issues before shipping  
✅ **Operations loves features** — Users actually use what's built  
✅ **Code quality stays high** — No accumulating technical debt  
✅ **Communication is clear** — No surprises between roles  
✅ **Each role is trusted** — Others respect their expertise and decisions  

---

## 🚀 Quick Reference: Who Does What?

| Decision | PM | SE | FG |
|----------|----|----|-----|
| What to build? | ✅ | | |
| How to build it? | | ✅ | |
| Is it ready to ship? | | | ✅ |
| Why it matters to operations? | ✅ | | |
| What could go wrong? | | | ✅ |
| Which technology to use? | | ✅ | |
| When to rollback? | | | ✅ |
| Requirements testable? | ✅ | | ✅ |
| Code follows patterns? | | ✅ | |
| Feature adopted by users? | ✅ | | |

---

**These three roles together ensure SX-CRM ships features that are:**
- **Needed** (PM ensures user value)
- **Built right** (SE ensures quality)
- **Production-safe** (FG ensures reliability)
