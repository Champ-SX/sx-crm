# Phase 1: Testing & Optimization Strategy
## June 2-10, 2026 (8 Days to Launch)

---

## 📊 Current Issues Found

### 🔴 Critical Issues (Must Fix Before Deployment)
1. **Mobile Responsiveness - Won & Ready OP Board**
   - Issue: Multiple stage columns show side-by-side at 375px
   - Impact: Requires horizontal scrolling on mobile
   - Solution: Implement mobile-specific layout (vertical scrolling or carousel)
   - Effort: 2-3 hours

2. **Mobile Layout - Dashboard**
   - Issue: Need to verify stat cards and sections are responsive
   - Impact: May not display properly on mobile
   - Solution: Test and optimize layout for mobile
   - Effort: 1-2 hours

### 🟡 Important Issues (Should Fix)
1. **Linting Warnings** (400 errors, 4802 warnings)
   - Issue: Minor linting issues in test scripts
   - Impact: Not critical for production but good to clean up
   - Solution: Fix linting errors in prod code only
   - Effort: 1-2 hours

2. **Bundle Size** (596M)
   - Issue: Build output is large
   - Impact: May affect deployment time
   - Solution: Optimize dependencies and code splitting
   - Effort: 1-2 hours

---

## 📋 Timeline & Action Plan

### Day 1-2 (June 2-3): Responsive Design Fixes
**Goal:** Fix mobile responsiveness issues

#### Won & Ready OP Board Mobile Layout
- [ ] Create mobile-specific layout for stage columns
- [ ] Test at 375px: Should show 1-2 columns, scroll horizontally if needed
- [ ] Test at 768px: Should show 2-3 columns
- [ ] Test at 1280px: Full desktop layout
- [ ] Ensure drag-and-drop works on mobile/tablet

**Options to Implement:**
1. **Carousel/Slider approach**: Horizontal scroll with touch swipe
2. **Vertical stacking**: Stack stages vertically on mobile
3. **Column collapse**: Show fewer columns on smaller screens
4. **Responsive grid**: Dynamic column count based on viewport

#### Dashboard Mobile Layout
- [ ] Test stat cards at 375px
- [ ] Test role view selector at 375px
- [ ] Test all sections are readable
- [ ] Ensure no content overflow

#### Navigation Mobile
- [ ] Test hamburger menu on mobile
- [ ] Test navigation links on 375px
- [ ] Verify all pages accessible on mobile
- [ ] Check modal/dialog responsiveness

**Estimated Time:** 4-6 hours

---

### Day 3 (June 4): Cross-Browser Testing
**Goal:** Verify functionality across all major browsers

#### Browsers to Test
- [ ] Chrome/Chromium (primary)
- [ ] Firefox
- [ ] Safari (macOS & iOS if possible)
- [ ] Edge

#### Test Cases for Each Browser
- [ ] All pages load without errors
- [ ] Drag-and-drop works
- [ ] Stage management features work
- [ ] No console errors
- [ ] Layout correct
- [ ] Touch events work (mobile browsers)
- [ ] Forms submit correctly
- [ ] Modals display properly

**Estimated Time:** 3-4 hours

---

### Day 4 (June 5): Performance & Lighthouse Audit
**Goal:** Optimize performance and pass Lighthouse audits

#### Performance Metrics to Target
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Cumulative Layout Shift (CLS): < 0.1
- Time to Interactive (TTI): < 3s
- Total Bundle Size: < 500KB (gzipped)

#### Lighthouse Audits
- [ ] Performance: Target > 80
- [ ] Accessibility: Target > 90
- [ ] Best Practices: Target > 90
- [ ] SEO: Target > 90

#### Optimization Tasks
- [ ] Remove unused dependencies
- [ ] Optimize images (next/image component)
- [ ] Enable code splitting if not already
- [ ] Check for slow third-party scripts
- [ ] Implement lazy loading for components
- [ ] Optimize bundle size

**Estimated Time:** 3-4 hours

---

### Day 5 (June 6): Feature & Data Testing
**Goal:** Comprehensive functional testing

#### Dashboard Features
- [ ] Admin view shows all sections
- [ ] Operation view shows correct sections
- [ ] Sales view shows correct sections
- [ ] View switching works correctly
- [ ] Data updates in real-time

#### Won & Ready OP Features
- [ ] All stages display correctly
- [ ] Drag-and-drop: Single card stage
- [ ] Drag-and-drop: Multi-card stage (2+ cards)
- [ ] Drag-and-drop: Between stages
- [ ] Stage reordering works
- [ ] Delete stage works with confirmation
- [ ] Change color works and persists
- [ ] Add stage works
- [ ] Sort options (Order, Date, Value, Alphabetically)

#### Data Integrity Tests
- [ ] Data persists after page refresh
- [ ] Data syncs correctly from DB
- [ ] Concurrent operations don't conflict
- [ ] No data loss on navigation
- [ ] Error states handled properly

**Estimated Time:** 3-4 hours

---

### Day 6 (June 7): Supabase & Database Verification
**Goal:** Ensure production database is ready

#### Database Checks
- [ ] Supabase project accessible
- [ ] Database schema correct
- [ ] Migrations applied successfully
- [ ] RLS policies configured
- [ ] User authentication working
- [ ] Data persists correctly

#### Connection Testing
- [ ] Connect to production database
- [ ] Test data read operations
- [ ] Test data write operations
- [ ] Test error handling
- [ ] Verify backups enabled
- [ ] Test restore procedure

#### Security Verification
- [ ] RLS policies enforced
- [ ] Sensitive data protected
- [ ] API keys in environment variables only
- [ ] No secrets hardcoded
- [ ] CORS headers correct

**Estimated Time:** 2-3 hours

---

### Day 7 (June 8): Final Integration & Deployment Setup
**Goal:** Prepare Vercel deployment

#### Vercel Setup
- [ ] Connect Vercel to GitHub repo
- [ ] Set environment variables in Vercel:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY (if needed)
- [ ] Configure deployment settings
- [ ] Set up auto-deployment on main branch
- [ ] Configure custom domain (if needed)

#### Pre-Deployment Testing
- [ ] Run production build locally
- [ ] Test production build in browser
- [ ] Smoke test all features
- [ ] Check error handling
- [ ] Verify data flow
- [ ] Test on multiple devices/browsers

#### Documentation
- [ ] Update deployment guide
- [ ] Document environment variables
- [ ] Create rollback procedures
- [ ] Document known issues
- [ ] Prepare launch notes

**Estimated Time:** 2-3 hours

---

### Day 8 (June 9): Final Testing & Approval
**Goal:** Last-minute verification before launch

#### Final Checklist
- [ ] All critical issues fixed
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Mobile responsive
- [ ] Supabase connected
- [ ] Vercel configured
- [ ] Backup procedure tested
- [ ] Team sign-off ready

#### Dry-Run Deployment
- [ ] Deploy to Vercel
- [ ] Test production environment
- [ ] Verify all features work
- [ ] Check error logs
- [ ] Test on real devices
- [ ] Get final team approval

**Estimated Time:** 2-3 hours

---

### Day 9 (June 10): LAUNCH DAY 🚀
- [ ] Final production deployment
- [ ] Monitor error logs
- [ ] User feedback collection
- [ ] Support team ready
- [ ] Post-launch follow-up

---

## 🎯 Success Criteria

Before launching, ensure:
- ✅ All mobile responsiveness issues fixed
- ✅ Cross-browser testing passed
- ✅ Performance scores > 80 (Lighthouse)
- ✅ All features working correctly
- ✅ Supabase connected and verified
- ✅ Vercel deployment ready
- ✅ Team sign-off received
- ✅ Rollback plan documented

---

## 📊 Resource Allocation

| Phase | Time | Priority |
|-------|------|----------|
| Mobile Responsiveness | 4-6 hrs | 🔴 Critical |
| Cross-Browser Testing | 3-4 hrs | 🟡 High |
| Performance Optimization | 3-4 hrs | 🟡 High |
| Feature Testing | 3-4 hrs | 🟡 High |
| Supabase Verification | 2-3 hrs | 🔴 Critical |
| Deployment Setup | 2-3 hrs | 🔴 Critical |
| Final Testing | 2-3 hrs | 🔴 Critical |
| **TOTAL** | **20-30 hrs** | |

**Timeline:** 8 days (June 2-10) ✅ Achievable

---

## 🚀 Deployment Command

When ready to deploy to Vercel:

```bash
# Option 1: Auto-deployment (Recommended)
git push origin main
# Vercel will auto-deploy

# Option 2: Manual deployment
npx vercel deploy --prod
```

---

## 📞 Launch Checklist (June 10)

- [ ] Team notified
- [ ] Backup taken
- [ ] Monitoring configured
- [ ] Support ready
- [ ] Deploy to Vercel
- [ ] Smoke test production
- [ ] Announce launch
- [ ] Monitor for 24 hours

---

## 📝 Notes

- Production URL: https://sx-crm.vercel.app
- All changes tracked in `DEPLOYMENT_PLAN.md`
- Rollback available via Vercel dashboard
- Team support: champ@sixsheet.me

---

**Next Step:** Start Day 1 - Mobile Responsiveness Fixes
