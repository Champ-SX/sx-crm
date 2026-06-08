# 🗺️ SX-CRM Documentation Navigation

**Production:** https://sx-crm.vercel.app  
**Status:** ✅ Phase 1 Complete | 🚀 Phase 2.0 Active  
**Last Updated:** June 8, 2026

---

## 📚 Core Documentation (7 Files)

### 🎯 **PRODUCT.md**
**What we're building & why**

For: Everyone  
Topics: Feature requirements, business rules, operations workflows, photobooth CRM context  
Use when: Understanding user needs, defining acceptance criteria, making product decisions

---

### 📊 **CURRENT_STATE.md**
**Where we are now**

For: Everyone  
Topics: Project status, active sprint, known issues, blockers, quality metrics  
Use when: Need current status, understanding sprint progress, identifying blockers

---

### 🏗️ **ARCHITECTURE.md**
**How it's built & designed**

For: Developers, Designers  
Topics: System architecture, tech stack, design patterns, UI/UX rules, mobile-first responsive design  
Use when: Building features, making technical decisions, understanding code organization

---

### 🗄️ **DATABASE_SCHEMA.md**
**Database structure & setup**

For: Developers, DevOps  
Topics: Database tables, RLS policies, indexes, local Supabase setup, troubleshooting  
Use when: Doing database work, setting up local dev, understanding schema

---

### ✅ **REGRESSION_TESTS.md**
**QA procedures & testing checklists**

For: QA/Feature Guardian, Developers  
Topics: Testing templates, feature verification, production deployment checklist, quality gates  
Use when: Testing features, preparing to deploy, doing QA sign-off

---

### 🛡️ **PROJECT_GUARDRAILS.md**
**Development patterns & rules**

For: All developers  
Topics: Agent roles, do's/don'ts, production safeguards, code patterns, feature checklist  
Use when: Starting development, making code decisions, understanding project rules

---

### 🤝 **AGENTS.md** (root directory)
**Detailed role definitions**

For: All team members  
Topics: Senior Engineer, PM, Feature Guardian responsibilities, workflows, success metrics  
Use when: Understanding roles, learning workflows, resolving conflicts

---

## 🎯 For Each Role

### 👨‍💻 **For Developers**

**Start here:**
1. `ARCHITECTURE.md` — Understand tech stack and patterns
2. `PROJECT_GUARDRAILS.md` — Learn the rules
3. `DATABASE_SCHEMA.md` — Understand database

**Before each feature:**
- Read PM's requirements in `PRODUCT.md`
- Follow checklist in `PROJECT_GUARDRAILS.md`
- Test using `REGRESSION_TESTS.md`

**When deploying:**
- Follow checklist in `PROJECT_GUARDRAILS.md` (Production Safeguards)
- Coordinate with Feature Guardian

---

### 📋 **For Product Managers**

**Start here:**
1. `PRODUCT.md` — Complete requirements
2. `CURRENT_STATE.md` — What's happening now
3. `PROJECT_GUARDRAILS.md` — Understand developer workflow

**When defining features:**
- Write clear acceptance criteria
- Get operations stakeholder approval
- Break into tasks that fit <1 day each
- Estimate with developers

**When tracking progress:**
- Check `CURRENT_STATE.md` weekly
- Communicate blockers early
- Gather user feedback

---

### 🛡️ **For QA/Feature Guardian**

**Start here:**
1. `PROJECT_GUARDRAILS.md` — Understand your role
2. `REGRESSION_TESTS.md` — Testing procedures
3. `CURRENT_STATE.md` — Current issues

**Before each feature:**
- Get PM's acceptance criteria
- Plan test cases in `REGRESSION_TESTS.md` template
- Test independently (don't trust developer testing)

**Before deploying:**
- Complete checklist in `REGRESSION_TESTS.md`
- Get stakeholder approval
- Prepare rollback procedure

---

## 📖 How to Use This Documentation

### If you need to...

**Understand feature requirements:**
→ See `PRODUCT.md` (complete specifications)

**Know current project status:**
→ See `CURRENT_STATE.md` (sprint, issues, metrics)

**Build a new feature:**
1. Read requirement in `PRODUCT.md`
2. Plan architecture from `ARCHITECTURE.md`
3. Check patterns in `PROJECT_GUARDRAILS.md`
4. Follow checklist in `PROJECT_GUARDRAILS.md`
5. Test using `REGRESSION_TESTS.md`

**Set up database:**
→ See `DATABASE_SCHEMA.md` (tables, RLS, local setup)

**Do QA testing:**
→ See `REGRESSION_TESTS.md` (testing templates, checklists)

**Understand design rules:**
→ See `ARCHITECTURE.md` (mobile-first, dark theme, accessibility)

**Learn about roles:**
→ See `PROJECT_GUARDRAILS.md` (quick reference) or `AGENTS.md` (detailed)

**Find historical information:**
→ See `../ARCHIVE/` folder (past decisions, old roadmaps, release reports)

---

## 🚀 Quick Links

**Phase 2 Timeline:**
```
WEEK 1 (6/8-14):  Google Auth        → Deploy Friday 6/14
WEEK 2 (6/17-21): Role Dashboards    → Deploy Friday 6/21
WEEK 3 (6/24-28): Mobile Tabs        → Deploy Friday 6/28
WEEK 4 (7/1-5):   @Mentions & Email  → Deploy Friday 7/5
```

**Key Metrics:**
- Build time: ~27 seconds ✅
- Console errors: 0 ✅
- Mobile responsive: 375px, 768px, 1280px ✅
- Data persistence: Working ✅

**Production URL:** https://sx-crm.vercel.app

---

## 📁 Documentation Structure

```
docs/ACTIVE/                    ← Live, working documents
├── PRODUCT.md                  ← Requirements & workflows
├── CURRENT_STATE.md            ← Status, sprint, issues
├── ARCHITECTURE.md             ← Tech, design, patterns
├── DATABASE_SCHEMA.md          ← Database structure
├── REGRESSION_TESTS.md         ← QA procedures
├── PROJECT_GUARDRAILS.md       ← Rules, roles, patterns
└── CLAUDE.md                   ← This file

docs/ARCHIVE/                   ← Historical reference
├── CHANGELOG/                  ← Release notes
├── RELEASE_REPORTS/            ← Deployment records
├── COMPLETED_FEATURES/         ← Old feature specs
├── OLD_ROADMAPS/               ← Past timelines
├── OLD_SPRINTS/                ← Past sprint plans
└── HISTORICAL_DECISIONS/       ← Why we chose things

AGENTS.md (root)               ← Detailed role definitions
```

---

## ⚡ Pro Tips

1. **Keep docs concise:** Link to archive for detailed history
2. **One decision per doc:** Know where each type of info lives
3. **Update during sprint:** Don't wait until end to document
4. **Archive old docs:** Keeps ACTIVE lean and focused
5. **Link between docs:** Cross-references make navigation easy

---

**Questions?** 
- Technical: See `ARCHITECTURE.md` or ask Senior Engineer
- Product: See `PRODUCT.md` or ask PM
- QA: See `REGRESSION_TESTS.md` or ask Feature Guardian
- Process: See `PROJECT_GUARDRAILS.md` or ask your role lead

---

**Last Updated:** June 8, 2026  
**Maintained by:** Development Team  
**Next review:** June 15, 2026 (end of Phase 2.0)
