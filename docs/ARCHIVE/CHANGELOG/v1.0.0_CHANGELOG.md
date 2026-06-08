# SX CRM Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] - June 2, 2026 🚀 PRODUCTION RELEASE

### Added
- **Dashboard:** Role-based views (Admin, Operation, Sales)
- **Dashboard:** View switching dropdown selector
- **Dashboard:** Stat cards (Customers, Leads, Won Jobs, Pending OP, Revenue)
- **Dashboard:** OP Pipeline section with stage breakdown
- **Dashboard:** Tasks due section
- **Dashboard:** Upcoming events section
- **Dashboard:** Recent activity section
- **Won & Ready OP:** Kanban board layout with multiple stages
- **Won & Ready OP:** Job card details display
- **Won & Ready OP:** Drag-and-drop cards between stages
- **Won & Ready OP:** Drag-and-drop to reorder stages
- **Stage Management:** Delete stage with confirmation
- **Stage Management:** Change stage color (8 color options)
- **Stage Management:** Add new custom stage
- **Stage Management:** Stage sort options (Order, Date, Value, Alphabetically)
- **Mobile:** Responsive layout for 375px (vertical stacking)
- **Mobile:** Responsive layout for 768px (multi-column)
- **Mobile:** Responsive layout for 1280px+ (full layout)
- **Navigation:** Sidebar navigation with collapsible menu
- **Navigation:** Hamburger menu for mobile
- **Integration:** Supabase PostgreSQL integration
- **Deployment:** Vercel deployment with global CDN

### Fixed
- **Mobile Responsiveness:** Fixed stage columns showing side-by-side at 375px
  - Changed `min-w-max` to `sm:min-w-max` in container
  - Mobile now properly stacks stages vertically
  - No horizontal scrolling required on mobile

### Changed
- **Build:** Optimized production build (27 seconds)
- **Performance:** Deployed with Vercel global CDN

### Technical Details
- Framework: Next.js 16.2.6 with Turbopack
- TypeScript: Fully typed, zero errors
- Console: Clean, no errors or warnings
- Network: All API calls successful
- Tests: Responsive design verified at all breakpoints

### Environment
- Production URL: https://sx-crm.vercel.app
- Database: Supabase PostgreSQL
- Deployment: Vercel (Global CDN)
- Build Status: ✅ PASSING

### Quality Assurance
- ✅ Zero TypeScript errors
- ✅ Zero console errors
- ✅ Zero failed network requests
- ✅ Responsive at 375px, 768px, 1280px+
- ✅ Touch-friendly (44px+ targets)
- ✅ HTTPS enabled
- ✅ All 4 key pages returning 200 OK

---

## [0.9.0] - May 29, 2026 (Pre-Production)

### Added
- LINE Friends import feature (completed)
- Initial dashboard layout
- Basic navigation structure

### Status
- Development phase
- Ready for Phase 1 review

---

## Deployment History

| Version | Date | Status | URL |
|---------|------|--------|-----|
| v1.0.0 | June 2, 2026 | ✅ Production | https://sx-crm.vercel.app |
| v0.9.0 | May 29, 2026 | 🔄 Development | Internal |

---

## Version Tags (Git)

Use these tags to restore specific versions:

```bash
# Production version (current)
git checkout v1.0.0-production

# Mobile responsive fix
git checkout v1.0.0-mobile-responsive-fix

# Development version
git checkout v0.9.0
```

---

## Next Release (v1.1.0)

Planned features for next release:
- [ ] Advanced reporting and analytics
- [ ] Batch operations
- [ ] External system integrations
- [ ] Enhanced search and filtering
- [ ] User activity logs
- [ ] Role management UI

---

## Breaking Changes

None in v1.0.0. All APIs are backward compatible.

---

## Documentation

- **FEATURES.md** - Complete feature inventory
- **DEPLOYMENT.md** - Deployment procedures
- **ARCHITECTURE.md** - System architecture
- **TROUBLESHOOTING.md** - Common issues and solutions
- **PRODUCTION_SAFEGUARDS.md** - Prevent regression and issues

---

**Last Updated:** June 2, 2026
**Current Version:** v1.0.0-production ✅ LIVE
