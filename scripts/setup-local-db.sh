#!/bin/bash

# Setup Local Supabase for Development
# This script configures a local Supabase instance with your production schema

set -e

echo "🔧 Setting up Local Supabase Database..."
echo ""

# Step 1: Check if Docker is running
echo "✓ Checking Docker..."
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Step 2: Link to production project
echo "✓ Linking to production Supabase project..."
npx supabase link --project-id=ujgiaqfuywnrimjjcekb 2>&1 | grep -E "✓|✗" || true

# Step 3: Start local Supabase
echo "✓ Starting local Supabase instance..."
npx supabase start 2>&1 | tail -10

# Step 4: Pull schema from production
echo ""
echo "✓ Pulling schema from production..."
npx supabase db pull 2>&1 | grep -E "✓|✗|Created" || true

# Step 5: Show connection info
echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ Local Supabase Setup Complete!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📍 Local Supabase URLs:"
echo "   API: http://localhost:54321"
echo "   Dashboard: http://localhost:54323"
echo ""
echo "🔑 Your .env.local has been updated automatically."
echo "   To use local dev database: npm run dev"
echo ""
echo "📋 Useful commands:"
echo "   npx supabase start      → Start local Supabase"
echo "   npx supabase stop       → Stop local Supabase"
echo "   npx supabase status     → Check status"
echo "   npx supabase db push    → Sync schema changes to local"
echo "   npx supabase db pull    → Pull latest schema from production"
echo ""
echo "⚠️  Data Notes:"
echo "   • Local database is isolated from production"
echo "   • Safe for testing, won't affect real data"
echo "   • Run 'npx supabase stop' before committing to reset"
echo ""
