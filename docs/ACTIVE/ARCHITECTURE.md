# 🏗️ Architecture & Design System

## System Architecture

### Tech Stack
- **Framework:** Next.js 16.2.6 with TypeScript
- **UI:** React 18 + Tailwind CSS + shadcn/ui
- **State:** Zustand (store/crm-store.ts)
- **Database:** Supabase PostgreSQL with RLS
- **Deployment:** Vercel (global CDN)
- **Build:** Turbopack (27 second build time)

### Key Design Patterns

#### 1. **Component Structure**
- Pages in `app/` (Next.js App Router)
- Reusable components in `components/`
- Shared utilities in `lib/`
- Type definitions in `types/`
- Store logic in `store/crm-store.ts`

#### 2. **State Management**
```typescript
// Zustand store pattern
const store = create((set) => ({
  // State
  wonJobs: [],
  // Actions
  updateWonJob: (id, changes) => {
    // Optimistic update
    set((state) => ({ wonJobs: [...] }))
    // Persist to Supabase
    await supabase.from('won_jobs').update(changes).eq('id', id)
  }
}))
```

#### 3. **Database Integration**
- **Real-time data:** Load from Supabase on mount
- **Persistence:** All edits update database immediately
- **RLS policies:** Users can only see/edit their own data
- **Activity logging:** All changes logged to activity timeline

#### 4. **Mobile-First Responsive**
```css
/* Mobile first (320px) */
.card { display: flex; flex-direction: column; }

/* Tablet (768px+) */
@media (min-width: 768px) {
  .card { flex-direction: row; }
}

/* Desktop (1280px+) */
@media (min-width: 1280px) {
  .card { max-width: 1200px; }
}
```

---

## 🎨 Design System

### Dark Theme Colors
- **Background:** Charcoal (#1a1a1a - #2d2d2d)
- **Text (Primary):** Near white (90%+ brightness)
- **Text (Secondary):** Soft gray (60-75% brightness)
- **Accent:** Orange (CTA buttons, highlights)
- **Disabled:** Low opacity + reduced color (40-50% brightness)

### Typography
- **Body text:** 15-16px (minimum)
- **Labels:** 12-13px (readable minimum)
- **Headers:** 20px+ (clear hierarchy)
- **Font weight:** 400+ on dark backgrounds (avoid thin fonts)

### Spacing Grid
- **Base unit:** 4px or 8px
- **Section spacing:** 16-24px minimum
- **Card padding:** 16-24px
- **Touch-safe margins:** 12px+ between buttons

### Touch Targets
- **Minimum size:** 44×44px (iOS) / 48dp (Android)
- **Spacing:** 12px+ between clickable elements
- **Reach zones:** Top 60%, center 70%, bottom 40% on mobile

---

## 📐 UI/UX Guidelines

### Principle: Operational Simplicity

SX-CRM serves exhausted photobooth operators on event day. Design with this question in mind:

**"Can they use this on a phone in a dark venue in 15 seconds?"**

### Core Rules

#### 1. **Mobile-Responsive (CRITICAL)**
✅ Works at 375px (iPhone SE)  
✅ Works at 768px (Tablet)  
✅ Works at 1280px+ (Desktop)  
❌ NO horizontal scrolling  
❌ NO modal overflow  
❌ NO hidden buttons  

#### 2. **Semantic HTML Structure**
- Use proper heading hierarchy (h1, h2, h3)
- Use `<button>` for clickable actions
- Use `<label>` for form fields
- Keep Dialog component structure intact
- Improves accessibility + maintainability

#### 3. **Visual Hierarchy**
User must instantly understand:
1. **What's clickable** (buttons, links, interactive areas)
2. **What's important** (primary info, CTAs)
3. **What's status** (secondary data, metadata)
4. **Where next action is** (obvious progression)

Use: spacing, contrast, font weight, grouping  
NOT: excessive borders, glow effects, too many colors

#### 4. **Data Presentation (CRM-Specific)**
Prioritize in this order:
1. **Company name** (who)
2. **Contact person** (who specifically)
3. **Current status** (state)
4. **Latest activity** (what happened)
5. **Next action** (what to do)

❌ DON'T overload cards with 10 fields  
✅ DO expand details on demand

#### 5. **Activity/History**
Make it clear and scannable like:
- Linear.app (clean, fast)
- Notion comments (spaced, readable)
- Slack threads (clear conversation flow)

Use: larger spacing (12-16px), clear timestamps, card-based entries

#### 6. **Editable Fields**
If data might change, make it editable:
- Click field → becomes input → Enter to save
- OR: Click [Edit] → modal opens → Save/Cancel
- Show which fields are locked (created date, ID, calculated values)
- Preserve edit history if relevant ("Last updated 2h ago by Sarah")

#### 7. **Loading States**
During async operations:
- Show spinner immediately
- Change button text (Saving, Moving, Deleting)
- Disable button during operation
- Success toast on completion
- Error toast with retry on failure

#### 8. **Drag-and-Drop Feedback**
- Semi-transparent drag ghost (follows cursor)
- Target highlights on hover (blue border)
- Card animates into destination
- Brief highlight animation (yellow glow, 1 sec)
- Toast notification with undo option

#### 9. **Confirmation Dialogs**
Always confirm destructive actions:
- Show what's being deleted (name, type, count)
- Explain cascading effects ("removes all related events")
- Provide undo within 5 seconds
- Use warning colors (red/orange)

#### 10. **Empty States**
Never leave users staring at blank screens:
- Show icon + descriptive message
- Explain what would appear here
- Provide direct CTA button
- Tone: helpful/encouraging, not scolding

---

## 🛡️ Production Safeguards

### Before Every Deployment

**Pre-Deploy Checklist:**
- [ ] Fresh `npm install` works
- [ ] `npm run build` succeeds (0 errors)
- [ ] `npm run lint` passes (0 warnings)
- [ ] TypeScript: 0 errors (`npx tsc --noEmit`)
- [ ] Environment variables verified
- [ ] Database migrations tested on staging
- [ ] Git commits are atomic + well-described
- [ ] Git tag created for rollback
- [ ] Rollback procedure documented

**Quality Checks:**
- [ ] Zero console errors on production build
- [ ] All features tested on mobile (375px, 768px, 1280px)
- [ ] Supabase: RLS policies tested
- [ ] Performance: Page load <2s, edits <500ms
- [ ] Security: No secrets in code/URLs

### If Production Issue Found

**Severity Levels:**
- **Critical** (data loss, auth broken): Rollback immediately
- **Major** (feature broken): Revert commit + debug offline
- **Minor** (typo, small UI bug): Fix in next release

**Rollback Procedure:**
```bash
# Option 1: Revert last commit
git revert <commit-hash>
git push origin main
# Vercel auto-deploys (30-60 sec)

# Option 2: Restore from git tag
git checkout v1.0.0-production
git push origin HEAD:main --force-with-lease
# Only use --force-with-lease (safer than --force)
```

### Version Control

**Commit Strategy:**
```bash
# Always atomic commits with clear messages
git commit -m "feat: Add X feature

- Detailed description of changes
- Why this matters
- What was tested

Co-Authored-By: Claude Haiku <noreply@anthropic.com>"
```

**Tag Pattern:**
```bash
git tag -a v1.0.0-production -m "Phase 1 Complete"
git tag -a v1.0.1-mobile-fix -m "Fixed mobile layout"
git push origin --tags
```

---

## 📚 When Adding New Features

### 1. **Plan Architecture First**
- Sketch components and data flow
- Identify risks (performance, security, complexity)
- Check for conflicts with existing patterns

### 2. **Test on Mobile During Development**
- Don't wait until the end
- Test at 375px, 768px, 1280px
- No horizontal scrolling
- Touch targets ≥44px

### 3. **Use Existing Patterns**
- See FEATURES.md for code examples
- Reuse components (don't reinvent)
- Follow Zustand store patterns
- Use semantic HTML (don't break Dialog components)

### 4. **Verify Supabase Integration**
- Changes persist after page refresh
- RLS policies restrict access correctly
- Activity logs all changes
- No data loss on network failure

### 5. **Dark Theme Compliance**
- Use semantic color variables (not hardcoded colors)
- Text contrast ≥4.5:1
- Disabled state clearly visible
- Test in actual dark mode (not just light)

---

## 🔗 Related Documents

- **PRODUCT.md** — Feature requirements and user workflows
- **DATABASE_SCHEMA.md** — Database structure and migrations
- **REGRESSION_TESTS.md** — Testing procedures and checklists
- **PROJECT_GUARDRAILS.md** — Development rules and patterns
- **AGENTS.md** — Role definitions and responsibilities

---

**Last Updated:** June 8, 2026  
**Version:** 1.0  
**Applies to:** All SX-CRM features
