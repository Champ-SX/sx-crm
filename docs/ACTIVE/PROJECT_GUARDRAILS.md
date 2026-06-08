# 🛡️ Project Guardrails

## Three Agent Roles (Quick Reference)

### 🛠️ **Senior Engineer**
**Authority:** Code quality, architecture, implementation  
**Decides:** How to build, testing approach, code patterns  
**Owns:** Feature implementation, technical debt, production safeguards

**Key Skills:** Next.js, TypeScript, Zustand, Supabase, mobile-responsive design

**Workflow:**
1. Read PM spec → Plan architecture → Build database
2. Implement components → Wire store → Test locally
3. Ask FG for independent review → Deploy

**Success:** 0 console errors, features work on mobile, changes persist

---

### 📋 **Product Manager**
**Authority:** Feature scope, requirements, prioritization  
**Decides:** What to build, acceptance criteria, timeline  
**Owns:** Requirements gathering, stakeholder alignment, success metrics

**Key Thinking:** "Can an operations manager use this on a phone in 15 seconds?"

**Workflow:**
1. Talk to Operations → Define workflow → Write acceptance criteria
2. Mock it → Get stakeholder approval → Break into tasks
3. Estimate timeline → Track progress → Measure adoption

**Success:** Clear requirements, stakeholder approval, feature adoption

---

### 🛡️ **Feature Guardian** (QA/Release)
**Authority:** Release readiness, go/no-go, rollback decisions  
**Decides:** When to ship, severity of issues, when to rollback  
**Owns:** Feature verification, testing, production deployment

**Key Skills:** Testing strategy, edge case discovery, risk assessment, QA reporting

**Workflow:**
1. Test locally (happy path + edge cases) → Verify persistence
2. Test on mobile → Check console clean → Get stakeholder approval
3. Verify production deployment → Monitor 2 hours post-deploy

**Success:** All acceptance criteria verified, zero rollbacks, production stable

---

## Development Patterns

### ✅ DO - Best Practices

#### Code Quality
✅ Atomic commits with clear messages  
✅ Feature branches (never push broken code to main)  
✅ Zero TypeScript errors (strict mode)  
✅ Semantic HTML structure (don't break Dialog components)  
✅ Proper null handling (null coalescing operators)  

#### Testing
✅ Test locally before pushing (mobile + desktop)  
✅ Test happy path + 3 edge cases  
✅ Verify data persists after refresh  
✅ Check console: 0 errors, 0 warnings  
✅ Have FG test independently before shipping  

#### Mobile-First
✅ Design mobile first (375px)  
✅ Test on actual device, not just emulation  
✅ No horizontal scrolling  
✅ Touch targets ≥44px  
✅ Works at 375px, 768px, 1280px  

#### Null Handling
✅ Use null coalescing: `value || fallback`  
✅ Use fallback chains: `name || product_name || '—'`  
✅ Don't render "null" strings  
✅ Show "—" for missing data  
✅ Test with NULL values in database  

#### Data Persistence
✅ Edit → Click save → Refresh page → Value still there  
✅ Verify in Supabase (actual database change)  
✅ Activity timeline logs all changes  
✅ No data loss on network timeout  

#### Supabase Integration
✅ All changes update database immediately  
✅ RLS policies restrict access correctly  
✅ Activity logs all changes  
✅ No unhandled promise rejections  
✅ Graceful error messages if API fails  

---

### ❌ DON'T - Anti-Patterns

❌ Push half-done code to main (use feature branches)  
❌ Hardcode values in code (use null coalescing + fallbacks)  
❌ Render "null" strings (it's confusing)  
❌ Break Dialog component structure (semantic HTML matters)  
❌ Forget mobile until implementation (too late to fix layout)  
❌ Ship without testing on actual mobile device  
❌ Assume data exists (always handle NULL)  
❌ Swallow errors in catch blocks (log and re-throw)  
❌ Deploy without Feature Guardian approval  
❌ Merge broken code to main  

---

## Production Safeguards

### Before Every Deploy

```bash
# 1. Fresh install
rm -rf node_modules package-lock.json
npm install

# 2. Type checking (MUST pass)
npx tsc --noEmit

# 3. Linting (MUST pass)
npm run lint

# 4. Production build (MUST pass, no warnings)
npm run build

# 5. Verify environment variables
# Check .env.local has real credentials
# Check Vercel Settings has production ENV variables

# 6. Database migrations
# Test migrations on staging first
# Verify all tables created

# 7. Git tags
# Create tag for this version
git tag -a v1.0.1 -m "Description"
git push origin --tags

# 8. FG review
# Get Feature Guardian sign-off before deploying
```

### If Production Issue Found

```
CRITICAL (data loss, auth broken)
└─ Rollback immediately
   git revert <commit-hash>
   git push origin main
   # Vercel auto-deploys in 30-60 sec

MAJOR (feature doesn't work)
└─ Revert + debug offline
   git revert <commit-hash>
   git push origin main
   # Fix locally, commit separately

MINOR (typo, small UI bug)
└─ Fix in next release
   No need to rollback
```

---

## Feature Implementation Checklist

When starting a new feature:

### Planning Phase
- [ ] Read PM's requirements spec
- [ ] Understand user workflow (not just accept criteria)
- [ ] Identify risks (performance, security, complexity)
- [ ] Ask PM if anything unclear
- [ ] Plan architecture (components, store, database)

### Database Phase (if needed)
- [ ] Add schema to `lib/supabase/schema.sql`
- [ ] Test migration locally (`npm run db:start`)
- [ ] Verify RLS policies (who can read/write?)
- [ ] Create indexes for performance

### Component Phase
- [ ] Start with simple version (don't over-engineer)
- [ ] Use existing patterns (see FEATURES.md)
- [ ] Test locally on desktop + mobile (375px, 768px, 1280px)
- [ ] No horizontal scrolling on mobile
- [ ] Verify semantic HTML structure

### Store Phase
- [ ] Add store methods in `store/crm-store.ts`
- [ ] Test: edit → save → refresh → value persists
- [ ] Verify Supabase changes
- [ ] Log activity for all changes

### Testing Phase
- [ ] Test happy path + 3 edge cases
- [ ] Test on actual mobile device
- [ ] Check console: 0 errors, 0 warnings
- [ ] Verify database: changes saved?
- [ ] Ask FG to test independently

### Code Review Phase
- [ ] Create PR to main
- [ ] Ask SE for code review (if pair not programming)
- [ ] Ask FG for QA approval
- [ ] Address feedback
- [ ] Get sign-offs before merging

### Deployment Phase
- [ ] All tests passed ✓
- [ ] Code reviewed ✓
- [ ] Feature Guardian approved ✓
- [ ] PM confirmed ✓
- [ ] Operations tested ✓
- [ ] Commit to main
- [ ] Monitor Vercel logs 2 hours post-deploy

---

## Code Style Guidelines

### Commits
```bash
# Format: [type]: [description]
# Types: feat, fix, docs, refactor, test, chore

git commit -m "feat: add payment status badge

- Display badge on job cards (unpaid|partial|paid|overdue)
- Color-coded red/yellow/green
- Editable in JobDetail modal
- Persist to database
- Activity logging integrated

Tested on mobile (375px, 768px, 1280px)"
```

### Null Handling
```typescript
// ✅ GOOD - Fallback chain
const name = job.product_name || job.product_cat || '—'
const value = job.estimated_value || 0
const place = job.place || 'TBA'

// ❌ BAD - Renders "null" string
const name = `${job.product_cat} - ${job.product_name}`
// Renders: "null - null" or "null - Photo"
```

### Component Structure
```tsx
// ✅ GOOD - Semantic HTML
<Dialog>
  <DialogTitle>Edit Payment</DialogTitle>
  <DialogContent>
    <Form fields... />
  </DialogContent>
</Dialog>

// ❌ BAD - Breaks semantic structure
<div className="dialog">
  <InlineEdit value={title} />  // Replaces DialogTitle
</div>
```

### Mobile Responsive
```tsx
// ✅ GOOD - Mobile-first
export function Card() {
  return (
    <div className="
      flex flex-col           // Mobile: vertical
      md:flex-row             // Tablet: horizontal
      lg:grid lg:grid-cols-3  // Desktop: grid
    ">
      {/* content */}
    </div>
  )
}

// ❌ BAD - Desktop-first
export function Card() {
  return (
    <div className="flex flex-row">  // Always horizontal
      {/* Mobile will have horizontal scroll */}
    </div>
  )
}
```

---

## Feature Patterns (Reference)

### Adding a Status Badge
1. Create component: `components/StatusBadge.tsx`
2. Add to card: `<StatusBadge status={job.payment_status} />`
3. Add store method: `updatePaymentStatus(jobId, status)`
4. Wire to modal: `<StatusBadge onClick={handleEdit} />`
5. Test: happy path + NULL value

**Reference:** See `docs/FEATURES.md` for payment/staff/doc status examples

### Adding an Editable Field
1. Use `<InlineEdit>` component or modal editor
2. Add store method: `update...Field(id, newValue)`
3. Persist to database
4. Show activity log entry
5. Test: edit → refresh → value persists

**Reference:** See Won board editable title/value fields

### Adding a Modal Form
1. Create component with validation
2. Add submit handler (calls store method)
3. Show success/error toast
4. Keep Dialog structure semantic
5. Test mobile (no overflow at 375px)

**Reference:** See StaffSheet, JobDetail modals

---

## Decision Authority

| Decision | PM | SE | FG |
|----------|----|----|-----|
| What to build | ✅ | — | — |
| How to build it | — | ✅ | — |
| Is it ready to ship | — | — | ✅ |
| Code patterns | — | ✅ | — |
| Testing strategy | ⚠️ | ⚠️ | ✅ |
| When to rollback | — | — | ✅ |
| Performance optimizations | — | ✅ | ⚠️ |
| Feature adoption measurement | ✅ | — | — |

Legend: ✅ = Final decision | ⚠️ = Collaborative | — = Not involved

---

## Communication

### Daily
- Slack #dev for blockers
- Code reviews on PRs (24-hour response)

### Weekly
- Monday: PM shares requirements
- Wednesday: SE + PM sync
- Friday: FG presents QA results

### Per Feature
- PM: Writes spec
- SE: Commits with clear messages
- FG: Writes test report
- All: Review together

---

## Success Criteria

**How to know this is working:**

✅ Features ship on time (PM estimates match reality)  
✅ Zero production rollbacks (FG catches issues)  
✅ Operations uses features (adoption, not shelf-ware)  
✅ Code quality high (no technical debt creep)  
✅ Communication clear (no surprises between roles)  
✅ Each role trusted (others respect expertise)  

---

**Last Updated:** June 8, 2026  
**Applies to:** All SX-CRM development  
**Questions?** See AGENTS.md for detailed role descriptions
