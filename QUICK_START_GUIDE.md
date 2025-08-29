# Quick Start Guide

## Overview

Get Atlas AI Workouts up and running quickly with this step-by-step setup guide. This guide covers environment setup, database configuration, and testing the Excel import functionality.

## Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Code editor (VS Code recommended)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd atlas-ai-workouts

# Install dependencies
npm install
```

## Step 2: Environment Configuration

### Copy Environment Template
```bash
cp .env.example .env.local
```

### Configure Required Variables

Edit `.env.local` with your actual credentials:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://lzlrojoaxrqvmhempnkn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key

# AI Providers (Required for AI features)
ANTHROPIC_API_KEY=sk-ant-your-actual-key
OPENAI_API_KEY=sk-your-actual-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Embedding Model Configuration
EMBEDDING_MODEL=text-embedding-3-large
GEN_MODEL=claude-3-5-sonnet-20241022
```

### Where to Find Your Credentials

#### Supabase Credentials
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **URL**: Project URL
   - **anon/public key**: NEXT_PUBLIC_SUPABASE_ANON_KEY
   - **service_role key**: SUPABASE_SERVICE_ROLE_KEY

#### AI API Keys
- **Anthropic**: Get from [Anthropic Console](https://console.anthropic.com/)
- **OpenAI**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)

## Step 3: Database Setup

### Test Database Connection
```bash
npm run dev
```

Open browser and visit: `http://localhost:3000/api/test-db`

You should see:
```json
{
  "status": "connected",
  "tables": ["workout_clients", "workout_sessions", ...],
  "canInsert": true
}
```

### If Database Test Fails

#### Check RLS Status
```bash
node scripts/verify-rls-status.js
```

#### Fix RLS if Needed
```bash
node scripts/fix-rls-simple.js
```

Copy the SQL output and run it in Supabase SQL Editor:
1. Go to: `https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new`
2. Paste and execute the SQL
3. Re-test database connection

## Step 4: Test the Application

### Access the Application
Visit: `http://localhost:3000`

### Test Client Management
1. Go to **Clients** page
2. Should load without errors (may be empty initially)
3. Test adding a client manually

### Test Excel Import
1. Prepare a test Excel file with multiple sheets
2. Name each sheet as a client name (e.g., "John Smith")
3. Add content like:
   ```
   Injuries: Knee pain
   Goals: Lose weight
   ```
4. Go to Clients page
5. Click "Import Multi-Sheet Excel"
6. Select your test file
7. Verify clients are imported successfully

## Step 5: Verify Everything Works

### Checklist
- [ ] Environment variables configured
- [ ] Database connection successful (`/api/test-db` returns success)
- [ ] Application starts without errors
- [ ] Clients page loads
- [ ] Excel import functionality works
- [ ] Data persists after page refresh

## Common Setup Issues

### Issue: "Environment variables not found"
**Solution**: 
- Ensure `.env.local` exists in project root
- Restart development server after changes
- Check variable names match exactly

### Issue: "Database connection failed"
**Solution**:
- Verify Supabase credentials are correct
- Check project URL includes `https://`
- Ensure service role key is the secret key, not the public one

### Issue: "Excel import fails"
**Solution**:
- Run RLS verification and fix scripts
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
- Check browser console for detailed errors

### Issue: "AI features not working"
**Solution**:
- Verify API keys are correctly set
- Check API key permissions and credits
- Ensure model names match your available models

## Development Workflow

### Starting Development
```bash
npm run dev
```

### Code Editing
- Main application code in `/app`
- API routes in `/app/api`
- Components in `/app/components`
- Database utilities in `/lib`

### Testing Changes
1. Make code changes
2. Save files (hot reload enabled)
3. Test in browser
4. Check browser console for errors

### Database Changes
- Migrations in `/supabase/migrations`
- Use Supabase dashboard for schema changes
- Test changes with `/api/test-db`

## Production Deployment

### Environment Variables
Set the same environment variables in your deployment platform:
- Vercel: Project settings → Environment Variables
- Netlify: Site settings → Environment variables
- Other platforms: Follow platform documentation

### Database
- Production should use separate Supabase project
- Apply same RLS configuration if needed
- Test import functionality in production

### Testing Production
1. Deploy application
2. Test database connectivity
3. Verify Excel import works
4. Check all features function correctly

## Troubleshooting Resources

### Log Files and Debugging
- Browser console: F12 → Console tab
- Server logs: Terminal running `npm run dev`
- Network tab: F12 → Network tab for API calls

### Useful Endpoints
- `/api/test-db` - Database health check
- `/clients` - Client management interface
- Supabase Dashboard - Database administration

### Scripts
- `node scripts/verify-rls-status.js` - Check RLS configuration
- `node scripts/fix-rls-simple.js` - Generate RLS fix SQL
- `npm run dev` - Start development server
- `npm run build` - Build for production

## Support and Documentation

### Additional Resources
- `CHANGELOG.md` - Recent changes and updates
- `MIGRATION_GUIDE.md` - localStorage to cloud migration details
- `EXCEL_IMPORT_GUIDE.md` - Detailed Excel import instructions
- `SECURITY_UPDATES.md` - Security configuration details

### Getting Help
1. Check error messages in browser console
2. Review relevant documentation files
3. Test individual components (`/api/test-db`, etc.)
4. Verify environment variable configuration

## Next Steps

Once setup is complete:

1. **Import Your Data**: Use Excel import to add your client data
2. **Explore Features**: Test workout generation and AI features
3. **Customize**: Modify the application for your specific needs
4. **Deploy**: Set up production deployment when ready

The application is now ready for development and use. The cloud-only architecture ensures your data is securely stored and accessible from anywhere.