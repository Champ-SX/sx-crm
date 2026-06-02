# SX CRM Scripts

Scripts for development, verification, and maintenance tasks.

## verify-position

**Purpose:** Verify and fix NULL position values in won_jobs table

**Context:** Jobs are ordered within columns using a `position` field. NULL values cause unpredictable ordering.

### Usage

#### Check without fixing (read-only)
```bash
npm run verify-position
```

Returns:
- `✅ Position field is clean` — No issues found
- Count of NULL positions if any found

#### Check and auto-fix
```bash
npm run verify-position:fix
```

Automatically fixes NULL values by assigning sequential positions within each stage.

### Requirements

- `NEXT_PUBLIC_SUPABASE_URL` env var set
- `SUPABASE_SERVICE_ROLE_KEY` env var set (has database write access)
- Node.js 18+
- `ts-node` installed (npm dev dependency)

### How It Works

1. Queries `won_jobs` table for NULL position values
2. If none found: reports success and exits
3. If found and `--fix` flag: runs migration to populate positions
4. Verifies migration success

### Manual Alternative

Use SQL directly via Supabase dashboard:

See `verify-position-field.sql` for step-by-step SQL queries.

## Other Scripts

(Add more as project grows)
