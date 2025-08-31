#!/bin/bash

echo "🔍 UUID Fix Verification Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if the fix SQL scripts exist
echo "📁 Checking for fix scripts..."
if [ -f "scripts/emergency-uuid-fix.sql" ]; then
    echo -e "${GREEN}✓${NC} emergency-uuid-fix.sql found"
else
    echo -e "${RED}✗${NC} emergency-uuid-fix.sql missing"
fi

if [ -f "supabase/migrations/20250829_fix_invalid_uuids.sql" ]; then
    echo -e "${GREEN}✓${NC} Migration file found"
else
    echo -e "${RED}✗${NC} Migration file missing"
fi

echo ""
echo "📝 Checking code changes..."

# Check if middleware has UUID handling
if grep -q "UUID_REGEX" middleware.ts 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Middleware has UUID validation"
else
    echo -e "${YELLOW}⚠${NC} Middleware may need UUID validation"
fi

# Check if UUID validator exists
if [ -f "lib/utils/uuid-validator.ts" ]; then
    echo -e "${GREEN}✓${NC} UUID validator utility exists"
else
    echo -e "${RED}✗${NC} UUID validator utility missing"
fi

# Check if client page has validation
if grep -q "validateAndCleanUUID" app/clients/\[id\]/page.tsx 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Client page has UUID validation"
else
    echo -e "${YELLOW}⚠${NC} Client page may need UUID validation"
fi

echo ""
echo "🧪 Checking test coverage..."

if [ -f "tests/e2e/client-routes.spec.ts" ]; then
    echo -e "${GREEN}✓${NC} E2E tests for client routes exist"
else
    echo -e "${YELLOW}⚠${NC} E2E tests may be needed"
fi

echo ""
echo "📊 Checking monitoring..."

if [ -f "app/api/monitoring/uuid-health/route.ts" ]; then
    echo -e "${GREEN}✓${NC} UUID health monitoring endpoint exists"
else
    echo -e "${YELLOW}⚠${NC} Consider adding monitoring endpoint"
fi

echo ""
echo "📚 Checking documentation..."

if [ -f "docs/RUNBOOK-UUID-ISSUES.md" ]; then
    echo -e "${GREEN}✓${NC} UUID issues runbook exists"
else
    echo -e "${YELLOW}⚠${NC} Consider adding runbook documentation"
fi

echo ""
echo "================================"
echo "📋 Next Steps:"
echo ""
echo "1. Run the SQL fix script in Supabase:"
echo "   - Go to Supabase SQL Editor"
echo "   - Run: scripts/emergency-uuid-fix.sql"
echo ""
echo "2. Deploy the application:"
echo "   - Run: vercel --prod"
echo ""
echo "3. Test the fix:"
echo "   - Visit: /api/monitoring/uuid-health"
echo "   - Try clicking on client links"
echo ""
echo "4. Monitor for issues:"
echo "   - Check browser console for UUID warnings"
echo "   - Watch application logs"
echo ""

# Make the script executable
chmod +x scripts/verify-uuid-fixes.sh 2>/dev/null

echo "✅ Verification complete!"