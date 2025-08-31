#!/bin/bash

echo "🚀 Atlas AI Workouts - Database Setup Script"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo "Please install it first: brew install supabase/tap/supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"
echo ""

# Step 1: Login to Supabase
echo -e "${YELLOW}Step 1: Logging in to Supabase${NC}"
echo "This will open your browser to authenticate..."
supabase login

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Login failed. Please try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Logged in successfully${NC}"
echo ""

# Step 2: Link to the project
echo -e "${YELLOW}Step 2: Linking to your Supabase project${NC}"
echo "Project ref: lzlrojoaxrqvmhempnkn"
echo ""
echo "You'll need your database password. You can find it in:"
echo "Supabase Dashboard > Settings > Database > Database Password"
echo ""

supabase link --project-ref lzlrojoaxrqvmhempnkn

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to link project. Please check your project ref and password.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Project linked successfully${NC}"
echo ""

# Step 3: Push migrations
echo -e "${YELLOW}Step 3: Pushing database migrations${NC}"
echo "This will create all necessary tables and policies..."
echo ""

supabase db push

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to push migrations.${NC}"
    echo "You can try running the migration manually in the Supabase SQL editor."
    exit 1
fi

echo -e "${GREEN}✅ Migrations pushed successfully${NC}"
echo ""

# Step 4: Verify the setup
echo -e "${YELLOW}Step 4: Verifying database setup${NC}"
echo ""

# Test connection and tables
echo "Testing database connection..."
supabase db dump --schema public --data-only -f /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database connection verified${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify database connection${NC}"
fi

echo ""
echo "============================================"
echo -e "${GREEN}🎉 Database setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update your .env.local with the correct keys (if needed)"
echo "2. Deploy to Vercel: vercel --prod"
echo "3. Test the production app: https://atlas-ai-workouts.vercel.app"
echo ""
echo "To verify everything is working:"
echo "- Check database status: https://atlas-ai-workouts.vercel.app/api/debug/database"
echo "- Create a test workout: https://atlas-ai-workouts.vercel.app/builder"
echo ""
echo -e "${GREEN}Happy coding! 💪${NC}"