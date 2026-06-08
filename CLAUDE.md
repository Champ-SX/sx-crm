# 🗺️ SX-CRM Documentation Hub

**Production:** https://sx-crm.vercel.app | **Status:** ✅ Phase 1 Complete | **Phase:** 🚀 Phase 2.0 Active  
**Last Updated:** June 8, 2026

---

## 📚 7 Core Documents

| Doc | What | For Whom | When |
|-----|------|----------|------|
| **PRODUCT.md** | Requirements & workflows | Everyone | Understanding user needs |
| **CURRENT_STATE.md** | Project status & sprint | Everyone | Weekly check-in |
| **ARCHITECTURE.md** | Tech stack & design | Developers | Building features |
| **DATABASE_SCHEMA.md** | Database & setup | Developers | Database work |
| **REGRESSION_TESTS.md** | QA & testing | QA/Devs | Testing & deployment |
| **PROJECT_GUARDRAILS.md** | Rules & patterns | All devs | Development decisions |
| **AGENTS.md** | Role definitions | Everyone | Understanding roles |

All in: `docs/ACTIVE/` + `AGENTS.md` (root)

---

## 🎯 By Role

### 👨‍💻 **Developers**
1. **First Time:** ARCHITECTURE.md → PROJECT_GUARDRAILS.md → DATABASE_SCHEMA.md
2. **Before Feature:** Read requirement in PRODUCT.md → Follow checklist in PROJECT_GUARDRAILS.md
3. **Before Deploy:** Check PROJECT_GUARDRAILS.md (Production Safeguards)

### 📋 **Product Managers**
1. **First Time:** PRODUCT.md → CURRENT_STATE.md → PROJECT_GUARDRAILS.md (dev workflow)
2. **Defining Features:** Write clear requirements → Get stakeholder approval → Break into <1 day tasks
3. **Tracking:** Check CURRENT_STATE.md weekly → Identify blockers → Gather feedback

### 🛡️ **QA / Feature Guardian**
1. **First Time:** PROJECT_GUARDRAILS.md → REGRESSION_TESTS.md → CURRENT_STATE.md
2. **Before Testing:** Get acceptance criteria → Plan test cases → Test independently
3. **Before Deploy:** Complete REGRESSION_TESTS.md checklist → Get approval → Prepare rollback

---

## ⚡ Quick Reference

**I need to...**
| Task | → See |
|------|-------|
| Understand feature requirements | PRODUCT.md |
| Know project status | CURRENT_STATE.md |
| Build a new feature | ARCHITECTURE.md + PROJECT_GUARDRAILS.md |
| Set up database | DATABASE_SCHEMA.md |
| Do QA testing | REGRESSION_TESTS.md |
| Understand design rules | ARCHITECTURE.md |
| Learn about roles | AGENTS.md |
| Find historical info | docs/ARCHIVE/ |

---

## 📊 Project Status

- **Build Time:** ~27 seconds ✅
- **Console Errors:** 0 ✅
- **Mobile Responsive:** 375px, 768px, 1280px ✅
- **Phase 2 Timeline:** 4 weekly deployments (6/14, 6/21, 6/28, 7/5)

---

## 📁 Structure

```
docs/ACTIVE/                 ← 7 working docs (CLAUDE.md, PRODUCT.md, ...)
docs/ARCHIVE/               ← Historical: CHANGELOG/, RELEASE_REPORTS/, etc.
AGENTS.md                   ← Detailed role definitions (root)
```

---

**See AGENTS.md for detailed role workflows. Archive docs in docs/ARCHIVE/README.md**
