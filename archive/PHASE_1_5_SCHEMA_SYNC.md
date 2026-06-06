# Phase 1.5: Schema Synchronization & Type Safety
**Priority:** CRITICAL (Must complete BEFORE Phase 2.0 Google Auth)  
**Duration:** 2-3 hours  
**Reason:** RLS policies and auth features depend on correct schema

---

## Problem Statement

**What happened June 5, 2026:**
- Cards disappeared from Won board after refresh
- Root cause: TypeScript types included `staff_list` field that doesn't exist in database
- Result: 400 Bad Request errors when inserting wonJobs
- Current workaround: Manual filtering of non-existent fields

**Why this matters:**
- Google Auth (Phase 2.0) will add users table, roles, permissions
- RLS policies depend on correct column names
- Schema mismatch causes runtime 400/404 errors (worst UX)
- No compile-time safety - errors only appear in production

**Impact if not fixed:**
- Auth features will have same schema mismatch issues
- Unpredictable 400 errors with RLS enabled
- Difficult to debug (requires network tab inspection)
- TypeScript types become "aspirational" rather than "actual"

---

## Solution: Schema-First Approach

### Option A: Auto-Generate Types (Recommended)

**Tool:** Supabase CLI or Prisma

```bash
# Supabase CLI - auto-generates types from your database
npx supabase gen types typescript --linked

# Output: lib/database.types.ts (auto-generated, never edit manually)
```

**Advantages:**
- ✅ Types ALWAYS match database schema
- ✅ Single source of truth (database)
- ✅ Compile-time errors catch mismatches
- ✅ Works with RLS policies automatically

**Implementation:**
1. Install Supabase CLI: `npm install -g @supabase/cli`
2. Link local project: `supabase link --project-id=xxx`
3. Generate types: `supabase gen types typescript --linked > lib/database.types.ts`
4. Replace manual types with generated types
5. Update crm-store.ts to use database.types.ts

### Option B: Prisma (If switching to ORM)

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model WonJob {
  id            String   @id @default(cuid())
  jobId         String   @unique
  jobNumber     String
  eventDate     DateTime?
  productType   String?
  // ... other fields (auto-synced with database)
}
```

**Advantages:**
- ✅ Type-safe queries
- ✅ Automatic migrations
- ✅ Schema versioning
- ❌ Requires bigger refactor

### Option C: Manual Audit (Quick, Less Reliable)

```typescript
// Audit checklist
✓ WonJob type
✓ LeadOpportunity type
✓ Activity type
✓ Task type
✓ Remove non-existent fields
✓ Add missing fields
```

---

## Implementation Plan

### Phase 1.5.1: Audit Current Schema (30 min)

**Task:** Document actual database schema

```sql
-- Run in Supabase SQL Editor
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('won_jobs', 'lead_opportunities', 'activities', 'tasks', 'users')
ORDER BY table_name, ordinal_position;
```

**Output:** Create `SCHEMA_AUDIT.md` documenting:
- All tables
- All columns
- Data types
- Nullable status

### Phase 1.5.2: Clean Up Existing Types (45 min)

**Remove:**
- ❌ `staff_list` from WonJob (doesn't exist in table)
- ❌ Any other non-existent fields
- ❌ Mismatched data types

**Verify:**
- ✅ All fields in types.ts exist in database
- ✅ Data types match (string vs number, etc.)
- ✅ Nullable fields match schema

### Phase 1.5.3: Setup Auto-Generation (45 min)

**Choose Option A (Supabase CLI):**

```bash
# 1. Install Supabase CLI
npm install -D @supabase/cli

# 2. Link to your project
supabase link --project-id=your-project-id

# 3. Generate types
supabase gen types typescript --linked > lib/database.types.ts

# 4. Update imports in crm-store.ts
import type { WonJob, LeadOpportunity } from '@/lib/database.types'

# 5. Remove manual type definitions that are now auto-generated
```

**CI/CD Integration:**

Add to `package.json`:
```json
{
  "scripts": {
    "generate:types": "supabase gen types typescript --linked > lib/database.types.ts",
    "prebuild": "npm run generate:types"
  }
}
```

Now types are auto-generated before every build.

---

## Deployment Checklist

- [ ] Audit complete - SCHEMA_AUDIT.md created
- [ ] Manual type cleanup done
- [ ] Supabase CLI installed and configured
- [ ] Auto-generation working locally
- [ ] Types imported from lib/database.types.ts
- [ ] All tests passing
- [ ] CI/CD integration added
- [ ] Deploy to Vercel
- [ ] Verify no 400 errors in production

---

## Success Criteria

✅ TypeScript types always match database schema  
✅ Compile-time errors catch schema mismatches  
✅ No more manual field filtering before Supabase INSERT  
✅ CI/CD ensures types stay in sync  
✅ Ready for RLS policies in Phase 2.0  

---

## Follow-Up: Phase 2.0 Google Auth

Once Phase 1.5 is complete:
- Add `users` table (auto-generated types)
- Add RLS policies (safe now - schema is correct)
- Add role-based dashboards
- Add email notifications

---

## Files to Update

1. **lib/database.types.ts** (new - auto-generated)
2. **types/index.ts** (remove redundant definitions)
3. **store/crm-store.ts** (import from database.types.ts)
4. **package.json** (add generate:types script)
5. **.gitignore** (ignore auto-generated files? optional)
6. **SCHEMA_AUDIT.md** (new - document actual schema)

---

## Estimated Timeline

| Task | Duration | Blocker |
|------|----------|---------|
| Audit schema | 30 min | No |
| Clean types | 45 min | No |
| Setup auto-gen | 45 min | No |
| Testing | 30 min | No |
| **Total** | **2.5 hours** | No |

**Schedule:** June 6-7, 2026 (1-2 hours before Phase 2.0 kickoff)

---

## Questions Before Implementation?

1. Prefer Option A (Supabase CLI) or Option B (Prisma)?
2. Want full schema audit first?
3. Ready to start Phase 1.5 after this merge?
