# Phase 1 Deployment Plan - June 10, 2026

## 📋 Pre-Deployment Status

### ✅ Completed
- [x] Production build passes (no errors)
- [x] TypeScript validation passes
- [x] Dashboard role-based views (Admin/Operation/Sales) implemented
- [x] Stage management features implemented (reorder, delete, color, add)
- [x] Supabase configuration in place
- [x] Environment variables configured

### 🔄 In Progress
- [ ] Final mobile responsiveness testing
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Supabase database final verification
- [ ] Vercel environment setup

### ⚠️ Known Issues
- Minor linting warnings in test scripts (not critical for production)
- Build size: 596M (typical for Next.js, monitor post-deployment)

---

## 🚀 Deployment Steps (June 10, 2026)

### Step 1: Final Testing (2-3 hours)
```bash
# 1. Run full test suite
npm run build          # ✅ Already passes
npm run dev           # Start dev server
npm run lint          # Check for issues
```

**Manual Tests to Run:**
- [ ] Desktop: All pages load correctly
- [ ] Desktop: Drag-and-drop works (all stages)
- [ ] Mobile (375px): Navigation responsive
- [ ] Mobile: Drag-and-drop works
- [ ] Tablet (768px): Layout correct
- [ ] All CRUD operations working
- [ ] Data persists after refresh
- [ ] Role-based views display correctly (Admin/Operation/Sales)

### Step 2: Supabase Final Verification
- [ ] Database is live and accessible
- [ ] RLS policies are enforced
- [ ] Migrations applied successfully
- [ ] Test user can authenticate
- [ ] Data syncs correctly from UI to database

### Step 3: Vercel Deployment Setup
```bash
# Connect to Vercel (if not already done)
npx vercel link

# Set environment variables on Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY (if needed)
```

### Step 4: Deploy to Vercel
```bash
# Option A: Auto-deploy from GitHub (recommended)
# - Push to main branch
# - Vercel will auto-deploy

# Option B: Manual deployment
npx vercel deploy --prod
```

### Step 5: Post-Deployment Verification
- [ ] Production URL loads without errors
- [ ] All pages accessible
- [ ] Database connection working
- [ ] Features work as expected
- [ ] Mobile responsive on production
- [ ] No console errors in browser DevTools

---

## 📱 Mobile Testing Checklist

### Desktop (1280px+)
- [ ] Dashboard loads correctly
- [ ] All role views work (Admin/Operation/Sales)
- [ ] Won & Ready OP board displays correctly
- [ ] Drag-and-drop cards works
- [ ] Stage management menu works
- [ ] All modals/dialogs display properly

### Tablet (768px)
- [ ] Responsive layout activates
- [ ] Touch-friendly spacing
- [ ] Navigation accessible
- [ ] Drag-and-drop works with touch
- [ ] Forms responsive
- [ ] Tables scroll horizontally

### Mobile (375px)
- [ ] Hamburger menu works
- [ ] Responsive single-column layout
- [ ] Touch targets are 44x44px minimum
- [ ] Drag-and-drop works
- [ ] Modals readable and tappable
- [ ] No horizontal scrolling needed

---

## 🔒 Security Verification

Before deploying to production:
- [ ] No secrets hardcoded in source
- [ ] All API keys in environment variables
- [ ] Supabase RLS policies configured
- [ ] CORS headers correct
- [ ] Authentication/Authorization enforced

---

## 📊 Performance Checklist

- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Time to Interactive < 3s
- [ ] Bundle size < 500KB (gzipped)

---

## 🔄 Rollback Plan

If deployment has critical issues:
```bash
# Option 1: Redeploy previous commit
npx vercel rollback

# Option 2: Disable deployment in Vercel dashboard
# (Go to Project Settings > Deployments > Disable)

# Option 3: Revert to last known good commit
git revert HEAD
git push origin main
```

---

## 📞 Launch Day Checklist

- [ ] Team notified of deployment time
- [ ] Backup of production database taken
- [ ] Monitoring/alerts configured
- [ ] Support team ready for issues
- [ ] Deployment window: 2026-06-10
- [ ] Launch: https://sx-crm.vercel.app

---

## 📈 Post-Launch Monitoring

- [ ] Monitor error logs for 24 hours
- [ ] Check database performance
- [ ] Monitor user login/activity
- [ ] Verify all integrations working
- [ ] Gather user feedback
- [ ] Document any issues found

---

## 🎯 Success Criteria for Phase 1 Launch

- ✅ All pages load without errors
- ✅ Dashboard role views work correctly
- ✅ Stage management features fully functional
- ✅ Mobile responsive on all devices
- ✅ Data persists correctly
- ✅ No critical security issues
- ✅ Performance acceptable (< 3s load time)
- ✅ Team sign-off received

---

## 📝 Notes

- Production URL: https://sx-crm.vercel.app
- Deployment: Next.js on Vercel (auto-scaling, global CDN)
- Database: Supabase PostgreSQL (auto-backup enabled)
- Timeline: Ready for June 10 launch
