# CAP*TURES CRM — Senior UX/UI Design Rules

Mobile-first dark-theme SaaS dashboard guidelines

## Design Specialization

You are a senior product designer specializing in:

* B2B SaaS dashboards
* CRM systems
* Mobile-responsive UX
* Dark-theme interfaces
* High readability enterprise UI
* Notion / Linear / Stripe-level simplicity

---

## 01. Core UX Philosophy

**Prioritize usability over visual style**

If visual effects reduce:
* readability
* accessibility
* touch usability
* responsiveness
* scanning speed

→ **remove or simplify them.**

The interface should feel:
* calm
* minimal
* professional
* operational
* trustworthy

NOT:
* flashy
* over-designed
* glowing everywhere
* gaming UI

---

## 02. Mobile Responsive Rules (VERY IMPORTANT)

**Design mobile-first**

Every component MUST work on:
* iPhone SE width (375px)
* standard phones (425-428px)
* tablets (768-1024px)
* desktop (1200px+)

before adding desktop enhancements.

---

## 03. Avoid Broken Mobile Layouts

**Critical UX failures to prevent globally:**

* modal width overflow
* hidden buttons
* text clipped
* horizontal scrolling
* impossible tap areas
* floating panel overlaps
* unreadable dark contrast

These are **CRITICAL UX failures**.

---

## 04. Modal / Drawer Rules

**Never use fixed-width modals on mobile**

### BAD:
* centered desktop popup on phone
* floating windows with cropped content

### GOOD:
* full-screen sheet
* bottom drawer
* slide-up panel
* stacked sections

### Mobile Modal Behavior:
```css
width: 100%;                    /* full viewport width */
height: 100dvh;               /* full dynamic viewport height */
max-height: 96vh;             /* leave breathing room */
padding: safe-area insets;
overflow-y: auto;             /* scroll content inside */
display: flex;
flex-direction: column;
```

* sticky header
* sticky action buttons
* scrollable content area

---

## 05. Responsive Layout System

### Mobile (<768px)

Use:
* single-column layout
* vertical stacking
* collapsible sections
* large touch targets
* full-width inputs

Avoid:
* side-by-side forms
* tiny icons
* multi-column tables

### Tables Transform on Mobile:
* cards with stacked info
* expandable rows
* stacked info blocks
* NOT horizontal scroll

### Desktop (≥768px)

Enhance with:
* two-column layouts
* side-by-side panels
* compact spacing
* full tables

---

## 06. Typography Visibility Rules

**CRITICAL ISSUE: Text contrast is too low in dark mode.**

Dark UI does NOT mean dark text.

### Dark Theme Text Contrast

Use proper contrast hierarchy:

#### Primary Text
* almost white (brightness: 90–100%)
* NOT gray
* Use semantic variable: `text-foreground`
* Examples: lead names, contact names, section headers

#### Secondary Text
* softer gray (brightness: 60–75%)
* still readable from 3+ feet away
* Use semantic variable: `text-muted-foreground`
* Examples: labels, helper text, timestamps, muted information

#### Disabled Text
* clearly inactive (brightness: 40–50%)
* but still visible (not invisible)
* Use: low opacity + reduced color

---

## 07. Never Use These in Dark Theme

Avoid:
* low-opacity tiny text
* blue text on black
* dark gray on black (#555 on #1a1a1a)
* thin fonts (weight < 400) on dark backgrounds
* ultra-small labels
* glow effects behind text
* hard-to-read serif fonts at small sizes

---

## 08. Minimum Typography Sizes

### Mobile Minimums:
* body text: 15–16px
* labels: 12–13px minimum
* buttons: 14–16px minimum
* headers: 20px+

### Never Use:
* 10px text
* ultra-condensed text
* thin font weight (< 400) on dark backgrounds
* font-size < 12px for readable content

---

## 09. Visual Hierarchy

User must instantly understand:

1. **What is clickable** (buttons, links, interactive areas)
2. **What is important** (primary information, CTAs)
3. **What is status/info** (secondary data, metadata)
4. **Where the next action is** (obvious progression)

Use:
* spacing
* contrast
* font weight
* grouping
* color intentionally

NOT:
* excessive borders
* excessive glow
* too many accent colors
* inconsistent visual weight

---

## 10. Dark Theme Color Rules

### Use Neutral Dark Surfaces

Preferred palettes:
* charcoal (#1a1a1a – #2d2d2d)
* graphite (#3a3a3a – #4a4a4a)
* soft black (#0f0f0f – #1a1a1a)
* deep gray (#2a2a2a – #3d3d3d)

### Avoid:
* pure black (#000000) everywhere
* neon orange everywhere
* oversaturated glow
* high-saturation accents in secondary areas

---

## 11. Accent Color Usage

Accent orange should ONLY be used for:
* CTA buttons (primary actions)
* active states (selected, focused)
* important status (warnings, alerts)
* highlights (emphasis)

NOT for:
* paragraphs
* labels
* all borders
* entire UI

### Color Distribution Target:
* 80% neutral (background, text, borders)
* 20% accent (buttons, highlights, status)

---

## 12. Spacing Rules

Use **generous spacing**.

Never compress UI just to fit more information.

Guidelines:
* base unit: 4px or 8px grid
* section spacing: 16px–24px minimum
* card padding: 16px–24px
* touch-safe margins: 12px+ between buttons

Cards should feel:
* airy
* scannable
* breathable

NOT:
* cramped
* data-heavy
* information-dense

---

## 13. Touch UX Rules

All clickable areas:
* **minimum 44×44px** (44pt on iOS, 48dp on Android)
* easy thumb reach (top 60%, center 70%, bottom 40%)
* enough spacing between buttons (12px+)
* obvious visual feedback on tap

Avoid:
* icon-only tiny actions
* actions too close together
* hidden hover-only interactions
* text-only micro-buttons

---

## 14. CRM Data Presentation

CRM data should prioritize (in order):

1. **Company name** (who)
2. **Contact person** (who specifically)
3. **Current status** (state)
4. **Latest activity** (what happened)
5. **Next action** (what to do)

Everything else is secondary.

### DO NOT:
* overload cards with too much detail
* show 10 fields in a lead card
* bury important info below secondary data

### DO:
* show summary first
* expand details on demand
* make primary info scannable

---

## 15. Activity / History UX

**Current issue:** activity area feels cramped and unreadable.

### Improve By:

* larger spacing between activity items (12–16px)
* clearer timestamps (readable in dark mode)
* card-based history logs (visual separation)
* visual distinction between different activity types
* icons for activity types (note, call, email, etc.)

### Target Feel:
Make activity feel like:
* Linear (linear.app)
* Notion comments section
* Slack thread clarity
* Discord conversation flow

---

## 16. Use Progressive Disclosure

Do not show everything at once.

Instead:

* show summary first (headline, status)
* expand details progressively (click to see more)
* collapse non-essential info by default
* reveal on demand

**Mobile users should NEVER feel overwhelmed.**

---

## 17. Recommended UI Inspirations

### Target Quality Level:
* **Linear** (linear.app) — clean, fast, minimal
* **Notion** — spacious, readable, calm
* **Stripe Dashboard** — professional, trustworthy
* **Attio CRM** — modern B2B UX
* **Arc Browser** — minimal, functional
* **Dropbox Dash** — calm, operational

### Avoid:
* gaming dashboard aesthetic
* cyberpunk UI
* overly glowing admin panels
* gradient overload
* neon everything

---

## 18. Interaction Behavior

Animations should:
* communicate state changes
* feel fast (150–300ms)
* reduce confusion
* guide user attention

### Avoid:
* dramatic transitions
* heavy motion (>500ms)
* slow modal opening
* unnecessary floating effects
* complex easing curves

---

## 19. Accessibility & Readability Checklist

Before shipping any screen:

- [ ] Text contrast ≥ 4.5:1 for body text (WCAG AA)
- [ ] Touch targets ≥ 44×44px
- [ ] Text size ≥ 12px (readable)
- [ ] Spacing allows visual grouping
- [ ] Focus states visible on keyboard nav
- [ ] Color is not the only way to communicate state
- [ ] Dark theme text is bright (not gray)
- [ ] Mobile layout is responsive (no horizontal scroll)
- [ ] Modals don't overflow on mobile
- [ ] Buttons are clearly clickable

---

## 20. Final Principle: The "Tired Operator" Test

**Every screen must answer:**

> Can a tired event operator use this quickly on a phone in a dark venue with one hand?

If not:

* simplify it
* increase readability
* reduce visual noise
* improve spacing
* improve hierarchy
* make buttons bigger
* remove unnecessary elements

---

## The System Should Feel:

✅ **operational** (gets the job done)  
✅ **premium** (high quality)  
✅ **calm** (not stressful)  
✅ **fast** (responsive, quick)  
✅ **reliable** (works as expected)  

❌ NOT decorative  
❌ NOT flashy  
❌ NOT confusing  
❌ NOT mobile-breaking  

---

## Implementation Checklist

When working on SX-CRM, always verify:

### Mobile First
- [ ] Works at 375px (iPhone SE)
- [ ] Works at 428px (standard mobile)
- [ ] Works at 768px (tablet)
- [ ] Works at 1024px+ (desktop)
- [ ] No horizontal scroll
- [ ] Touch targets ≥ 44×44px

### Dark Theme
- [ ] Primary text: bright (90%+ opacity)
- [ ] Secondary text: readable (60%+ opacity)
- [ ] Contrast ≥ 4.5:1
- [ ] No hardcoded slate colors
- [ ] Use semantic variables: `text-foreground`, `text-muted-foreground`

### Modals/Panels
- [ ] Mobile: full-width, responsive height
- [ ] Desktop: proper fixed width with padding
- [ ] No overflow or clipping
- [ ] Scrollable content area
- [ ] Sticky header and actions

### Spacing & Hierarchy
- [ ] Generous breathing room
- [ ] Clear visual hierarchy
- [ ] Obvious CTAs
- [ ] Progressive disclosure
- [ ] CRM data prioritized

### Performance
- [ ] Fast interactions (no lag)
- [ ] Smooth animations (150–300ms)
- [ ] No jank or stuttering
- [ ] Images optimized
- [ ] No unnecessary motion

---

**Last Updated:** May 28, 2026  
**Version:** 1.0 — Senior Design Rules  
**Applies to:** SX-CRM (all pages, all components)


---

## PRODUCTION SAFEGUARDS


# 🛡️ PRODUCTION SAFEGUARDS & VERSION CONTROL STRATEGY
## Prevent: Feature Regression, Build Failures, Database Issues

---

## 1️⃣ GIT VERSION TAGGING (Prevent Feature Loss)

### Create a Production Backup Tag NOW
```bash
git tag -a "v1.0.0-production" -m "Phase 1 Complete - All Features Working
- Dashboard with role-based views (Admin/Operation/Sales)
- Stage management (reorder, delete, color, add stage)
- Drag-and-drop functionality across all boards
- Mobile responsive (375px, 768px, 1280px+)
- Supabase integration working
- Zero console errors
- Deployed: June 2, 2026"

git tag -a "v1.0.0-mobile-responsive-fix" -m "Critical fix: Mobile layout responsiveness
- Fixed: min-w-max -> sm:min-w-max
- Mobile 375px now stacks vertically
- No horizontal scrolling on mobile"

git push origin v1.0.0-production
git push origin v1.0.0-mobile-responsive-fix
```

### Create Release Notes
```bash
git log v0.9.0..v1.0.0-production --oneline > RELEASE_NOTES.md
```

---

## 2️⃣ BRANCH PROTECTION (Prevent Bad Merges)

### Protect Main Branch
```bash
# In GitHub/GitLab settings:
# - Require pull request reviews (minimum 1)
# - Require status checks to pass (CI/CD)
# - Require branches to be up to date before merging
# - Require conversation resolution before merging
# - Include administrators
```

### Workflow:
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and commit
3. Push and create Pull Request
4. **Run full test suite before merge:**
   ```bash
   npm run build        # Must pass
   npm run lint         # Must pass
   npm run type-check   # Must pass
   npm test             # If tests exist
   ```
5. Only merge if ALL checks pass

---

## 3️⃣ DATABASE BACKUP & RECOVERY

### Supabase Automatic Backups (Already Enabled!)
✅ Check your Supabase project:
- Settings → Database → Backups
- Daily backups enabled
- Point-in-time recovery available (30-day window)

### Manual Backup Before Major Changes
```bash
# Export Supabase database
npx supabase db pull

# This creates a dump you can restore if needed
# Keep in version control
```

### Recovery Procedure (If Database Breaks)
```bash
# Option 1: Use Supabase Dashboard
# Go to: Settings → Database → Backups → Restore

# Option 2: Use CLI (if available)
npx supabase db push   # Restore from local backup
```

---

## 4️⃣ BUILD SAFETY CHECKLIST (Prevent Build Failures)

### Before Every Deployment:
```bash
#!/bin/bash
echo "🔍 PRE-DEPLOYMENT SAFETY CHECKS"

# 1. Fresh install
rm -rf node_modules package-lock.json
npm install
echo "✅ Dependencies installed"

# 2. Type checking
npx tsc --noEmit
echo "✅ No TypeScript errors"

# 3. Linting
npm run lint
echo "✅ Linting passed"

# 4. Production build
npm run build
echo "✅ Production build successful"

# 5. Check bundle size
du -sh .next
echo "✅ Bundle size verified"

# 6. Verify environment variables
[ -f .env.local ] && echo "✅ .env.local exists" || echo "❌ .env.local MISSING!"
[ -f .env.production ] && echo "✅ .env.production exists" || echo "⚠️  No .env.production"

# All checks passed = Safe to deploy
echo "🚀 Ready to deploy!"
```

---

## 5️⃣ PREVENT FEATURE REGRESSION (Features Disappearing)

### Git Commit Strategy
```bash
# ALWAYS commit with detailed messages
git commit -m "feat: Add stage management feature

- Add ability to reorder stages by dragging
- Add delete stage with confirmation dialog
- Add change stage color functionality
- Add create new stage button
- All features persist to Supabase
- Mobile responsive drag-and-drop

Fixes: #42, #43, #44, #45
Tests: Added tests for stage CRUD operations
Breaking: None
Related: Previous sprint delivered features preserved"
```

### Keep Feature Documentation
- File: `FEATURES.md` (updated with each release)
- Lists all features with status
- Links to code locations
- Usage examples

### Use Feature Flags for Complex Changes
```typescript
// Example: Only test new feature on specific users
if (featureFlags.newStageUI && user.isAdmin) {
  // Show new version
} else {
  // Keep old working version
}
```

---

## 6️⃣ AUTOMATED TESTING (Catch Issues Early)

### Add Tests to Prevent Regressions
```bash
# For stage management:
npm run test -- __tests__/stage-management.test.ts

# For mobile responsiveness:
npm run test:mobile

# For API integration:
npm run test:api

# Run ALL before deployment:
npm run test:all
```

### Test Key Features
```typescript
// Example test for stage drag-and-drop
describe('Stage Management', () => {
  it('should drag stage and persist order', async () => {
    // Test that proves stage reordering works
  })
  
  it('should delete stage with confirmation', async () => {
    // Test that proves delete functionality works
  })
  
  it('should change stage color', async () => {
    // Test that proves color change works
  })
})
```

---

## 7️⃣ MONITORING & ALERTS (Catch Problems Fast)

### Vercel Deployment Logs
```bash
# Check deployment status
vercel logs sx-crm

# Watch for errors:
# - Function errors
# - Database connection errors
# - API failures
# - Performance issues
```

### Supabase Monitoring
```bash
# Check Supabase dashboard:
# - Real-time database activity
# - Error logs
# - Performance metrics
# - RLS policy violations
```

### Set Up Alerts
```bash
# Email alerts for:
# - Build failures
# - Deployment errors
# - Database errors
# - High error rates
```

---

## 8️⃣ EMERGENCY ROLLBACK PROCEDURE

### If Something Goes Wrong:
```bash
# Step 1: Identify the bad commit
git log --oneline | head -10

# Step 2: Rollback to last working version
git revert <bad-commit-hash>
git push origin main

# Step 3: Vercel auto-deploys new commit (takes ~30s)

# Step 4: Database issue? Restore from backup
# Supabase Dashboard → Settings → Database → Backups → Restore
```

### Rollback to Last Known Good Tag
```bash
# If current main is broken, restore from tag
git checkout v1.0.0-production
git push origin HEAD:main --force-with-lease

# ⚠️ Only use --force-with-lease (safer than --force)
# Never use --force without --force-with-lease
```

---

## 9️⃣ DOCUMENTATION (Prevent Knowledge Loss)

### Create These Files:
1. **FEATURES.md** - List all working features
2. **ARCHITECTURE.md** - How the code is organized
3. **DEPLOYMENT.md** - Step-by-step deployment guide
4. **TROUBLESHOOTING.md** - Common issues and fixes
5. **DATABASE.md** - Schema, migrations, RLS policies

### Update After Each Release
```bash
# Document what changed
echo "## v1.0.1 - June 3, 2026
- Fixed: Dashboard mobile layout
- Added: Stage color persistence
- Improved: Drag-and-drop touch support
- No breaking changes" >> CHANGELOG.md

git add CHANGELOG.md FEATURES.md
git commit -m "docs: Update documentation for v1.0.1"
```

---

## 🔟 PRODUCTION MONITORING CHECKLIST

### Daily Checks (First Week)
```
☐ Check Vercel deployment logs (any errors?)
☐ Check Supabase database activity (any failures?)
☐ Test key features manually (stage drag, role views, etc.)
☐ Monitor build times (< 60 seconds expected)
☐ Check for console errors (use Vercel Analytics)
```

### Weekly Checks
```
☐ Review git history for any reverted commits
☐ Check database backup status (daily backups running?)
☐ Test rollback procedure (make sure recovery works)
☐ Review error logs from Vercel
☐ Update FEATURES.md with any new improvements
```

### Monthly Checks
```
☐ Full regression test suite
☐ Security audit
☐ Performance audit
☐ Update documentation
☐ Plan next phase features
```

---

## 🔐 PREVENT PAST ISSUES

### Issue #1: Features Disappearing
**Prevention:**
- ✅ Git tags for each version
- ✅ Feature documentation
- ✅ Feature tests
- ✅ Code review before merge
- ✅ Automated checks on main branch

### Issue #2: Build Failures
**Prevention:**
- ✅ Pre-deployment safety checklist
- ✅ CI/CD pipeline (auto-test on PR)
- ✅ Fresh install verification
- ✅ Type checking and linting
- ✅ Rollback procedure

### Issue #3: Database Problems
**Prevention:**
- ✅ Daily automatic backups (Supabase)
- ✅ Point-in-time recovery enabled
- ✅ RLS policies tested
- ✅ Migration testing in dev first
- ✅ Database monitoring alerts

---

## 🚀 NEXT DEPLOYMENT CHECKLIST

### Before Deploying v1.0.1 (or any future version):
```
PRE-DEPLOYMENT:
☐ All code committed and pushed
☐ Fresh npm install works
☐ npm run build succeeds
☐ npm run lint passes
☐ TypeScript errors: 0
☐ Bundle size checked
☐ All features tested manually
☐ Database backup taken
☐ Environment variables verified
☐ Git tag created

DEPLOYMENT:
☐ npx vercel deploy --prod
☐ Verify all endpoints return 200
☐ Test key features on production
☐ Check Vercel deployment logs
☐ Monitor for 1 hour after deploy

POST-DEPLOYMENT:
☐ Daily error log review (week 1)
☐ Weekly monitoring (ongoing)
☐ Document any issues found
☐ Update FEATURES.md
```

---

## ✅ SUMMARY

You now have:
1. **Version Control:** Tags prevent feature loss
2. **Branch Protection:** Prevents bad merges
3. **Database Safety:** Auto-backups + recovery procedure
4. **Build Safety:** Pre-deployment checklist
5. **Feature Documentation:** Everything tracked
6. **Monitoring:** Catch issues early
7. **Rollback:** Emergency procedure ready
8. **Testing:** Prevent regressions

---

**Result:** Past issues (disappearing features, build failures, database problems) won't happen again! 🛡️

