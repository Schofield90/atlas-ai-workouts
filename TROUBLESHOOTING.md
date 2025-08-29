# Troubleshooting Guide

## Overview

This guide helps you diagnose and resolve common issues with the Atlas AI Workouts application, particularly focusing on recent changes and Excel import functionality.

## Quick Diagnostic Steps

### 1. Check Database Connection
```bash
# Start the development server
npm run dev

# Test database connectivity
curl http://localhost:3000/api/test-db
# or visit in browser: http://localhost:3000/api/test-db
```

**Expected Response**:
```json
{
  "status": "connected",
  "tables": ["workout_clients", "workout_sessions", ...],
  "canInsert": true
}
```

### 2. Verify RLS Status
```bash
node scripts/verify-rls-status.js
```

### 3. Check Environment Variables
```bash
# Verify .env.local exists
ls -la .env.local

# Check key variables (without exposing values)
node -e "console.log('URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL); console.log('ANON:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); console.log('SERVICE:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);"
```

## Common Issues and Solutions

### Database Connection Issues

#### Issue: "Database connection failed"
**Symptoms**: 
- `/api/test-db` returns connection error
- Clients page shows loading spinner indefinitely
- Console errors about Supabase connection

**Diagnosis**:
```bash
# Check if environment variables are loaded
node -e "require('dotenv').config({path:'.env.local'}); console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0,20)+'...'); console.log('Keys configured:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, !!process.env.SUPABASE_SERVICE_ROLE_KEY);"
```

**Solutions**:
1. **Verify Credentials**: Check Supabase dashboard for correct URL and keys
2. **Environment File**: Ensure `.env.local` exists in project root
3. **Restart Server**: After changing environment variables: `Ctrl+C` then `npm run dev`
4. **Check Project**: Ensure Supabase project is active and accessible

#### Issue: "RLS policies preventing access"
**Symptoms**:
- Database test shows `"canInsert": false`
- Excel imports fail with permission errors
- Console shows "new row violates row-level security policy"

**Diagnosis**:
```bash
node scripts/verify-rls-status.js
```

**Solutions**:
1. **Quick Fix** (Disable RLS):
   ```bash
   node scripts/fix-rls-simple.js
   # Copy output and run in Supabase SQL editor
   ```

2. **Alternative** (Permissive policies): Use the alternative SQL in the RLS_FIX_INSTRUCTIONS.md

### Excel Import Issues

#### Issue: "No file provided" or upload fails
**Symptoms**:
- Upload button doesn't respond
- Error message about file not found
- Import progress never starts

**Diagnosis**:
- Check browser console for JavaScript errors
- Verify file is under 4MB
- Ensure file is proper Excel format (.xlsx, .xls)

**Solutions**:
1. **File Size**: If over 4MB, the system should automatically handle chunking
2. **File Format**: Ensure file is saved as Excel format, not CSV
3. **Browser Refresh**: Try refreshing the page and attempting again
4. **Different Browser**: Test with another browser to rule out browser-specific issues

#### Issue: "Found X clients but couldn't save them"
**Symptoms**:
- Import shows clients found but none saved
- "imported: 0" in response despite finding clients
- RLS or permission errors in console

**Step-by-Step Fix**:
```bash
# 1. Check RLS status
node scripts/verify-rls-status.js

# 2. If RLS is enabled, generate fix SQL
node scripts/fix-rls-simple.js

# 3. Copy the SQL output and run it in Supabase
# Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new
# Paste and execute the SQL

# 4. Verify the fix worked
node scripts/verify-rls-status.js

# 5. Try import again
```

#### Issue: "Import successful but no goals/injuries found"
**Symptoms**:
- Clients import with generic "No goals specified"
- Data from Excel not properly extracted
- Client names correct but details missing

**Solutions**:
1. **Check Excel Format**: Ensure your Excel sheets have:
   ```
   Sheet name: Client Name
   Cell content: 
   A1: Injuries    B1: Actual injuries
   A2: Goals       B2: Actual goals
   ```

2. **Try Different Positions**: The system also checks:
   - B1, B2 for direct values
   - Searches for "injur" and "goal" keywords
   - Looks in first 10 rows and columns

3. **Test with Simple Format**:
   Create a test sheet with:
   ```
   Sheet name: "Test Client"
   A1: Injuries
   A2: Knee pain, back issues
   A3: Goals  
   A4: Weight loss, strength building
   ```

### Application Loading Issues

#### Issue: Page loads but shows empty state
**Symptoms**:
- Clients page loads but shows "0 clients"
- No loading indicators or errors
- Database connection works

**Diagnosis**:
```bash
# Check if clients exist in database
# Visit: http://localhost:3000/api/test-db
# Look for "clientCount" in the response
```

**Solutions**:
1. **Data Migration**: If you had localStorage data, it wasn't migrated (by design)
2. **Fresh Start**: Import your data using Excel import
3. **Manual Add**: Use the "Add Client" button to create test data

#### Issue: AI features not working
**Symptoms**:
- Workout generation fails
- AI-powered features show errors
- "API key not found" messages

**Diagnosis**:
```bash
# Check AI API keys are set
node -e "require('dotenv').config({path:'.env.local'}); console.log('OpenAI:', !!process.env.OPENAI_API_KEY); console.log('Anthropic:', !!process.env.ANTHROPIC_API_KEY);"
```

**Solutions**:
1. **API Keys**: Ensure at least one AI provider key is configured
2. **Key Format**: OpenAI keys start with `sk-`, Anthropic with `sk-ant-`
3. **Credits**: Check your API provider accounts have available credits
4. **Permissions**: Ensure API keys have necessary permissions

## Advanced Troubleshooting

### Browser Console Investigation

#### Enable Detailed Logging
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for error messages during operations
4. Note any network request failures in Network tab

#### Common Console Errors
- `Failed to fetch`: Network connectivity or CORS issues
- `401 Unauthorized`: Authentication problems
- `403 Forbidden`: Permission/RLS issues
- `500 Internal Server Error`: Server-side problems

### Network Request Analysis

#### Check API Calls
1. Open Network tab in developer tools
2. Perform the failing operation
3. Look for failed requests (red status codes)
4. Check request/response details

#### Common Request Issues
- **preflight CORS errors**: Usually indicates configuration problems
- **401 responses**: Authentication failures
- **403 responses**: Permission/RLS issues
- **500 responses**: Server errors (check server console)

### Server-Side Debugging

#### Check Server Logs
```bash
# Start dev server with detailed logging
DEBUG=* npm run dev
```

#### Common Server Errors
- **Supabase connection errors**: Check credentials and project status
- **RLS policy violations**: Run RLS fix scripts
- **Missing environment variables**: Verify .env.local configuration

## Environment-Specific Issues

### Development Environment

#### Issue: "Module not found" errors
**Solutions**:
1. **Clean Install**: `rm -rf node_modules package-lock.json && npm install`
2. **Node Version**: Ensure Node.js 18+ is installed
3. **Path Issues**: Ensure you're in the correct project directory

#### Issue: Port conflicts
**Symptoms**: "Port 3000 is already in use"
**Solutions**:
1. **Kill Process**: Find and kill process using port 3000
2. **Use Different Port**: `npm run dev -- --port 3001`
3. **Check Running Processes**: `lsof -i :3000` (macOS/Linux)

### Production Environment

#### Issue: Build failures
**Common Causes**:
- Missing environment variables
- TypeScript errors
- Import/export issues after migration

**Solutions**:
1. **Local Build Test**: `npm run build` to test locally
2. **Environment Variables**: Ensure all required vars are set in production
3. **TypeScript**: Run `npm run type-check` to identify issues

## Recovery Procedures

### Complete Environment Reset
```bash
# 1. Clean installation
rm -rf node_modules package-lock.json
npm install

# 2. Environment setup
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Database verification
npm run dev
# Test: http://localhost:3000/api/test-db

# 4. RLS fix if needed
node scripts/fix-rls-simple.js
# Run generated SQL in Supabase

# 5. Test functionality
# Visit /clients page and try Excel import
```

### Database Recovery
If database seems corrupted or inaccessible:

1. **Verify Project Status**: Check Supabase dashboard
2. **Check Migrations**: Ensure all migrations are applied
3. **Test Permissions**: Use SQL editor to test direct queries
4. **Backup Check**: Verify recent backups exist if needed

### Data Recovery
If client data is missing:

1. **Check Database**: Use Supabase dashboard to verify data exists
2. **Re-import**: Use Excel import functionality to restore data
3. **Manual Entry**: Add critical clients manually through UI
4. **Backup Restore**: If available, restore from recent backup

## Prevention Tips

### Regular Maintenance
- Monitor error logs regularly
- Test import functionality periodically
- Keep dependencies updated
- Backup important data regularly

### Environment Management
- Document custom environment variables
- Test environment setup on fresh installations
- Keep .env.example updated with new requirements
- Use version control for configuration (except secrets)

### Monitoring
- Set up error tracking if deploying to production
- Monitor database connection health
- Track import success rates
- Watch for RLS policy issues

## Getting Additional Help

### Information to Gather
Before seeking help, collect:
- Error messages (exact text)
- Browser console output
- Network request details
- Server console logs
- Environment configuration (without secrets)
- Steps to reproduce the issue

### Useful Commands for Diagnostics
```bash
# System info
node --version
npm --version

# Project status
git status
git log --oneline -5

# Environment check
ls -la .env*
node scripts/verify-rls-status.js

# Database test
curl -s http://localhost:3000/api/test-db | jq .
```

This troubleshooting guide should help resolve most common issues. If problems persist, the systematic approach here will help identify the root cause and appropriate solution.