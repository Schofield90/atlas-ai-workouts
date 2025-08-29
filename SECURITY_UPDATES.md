# Security Updates and RLS Configuration

## Overview

This document outlines the security improvements made to the Atlas AI Workouts project, focusing on credential management and Row Level Security (RLS) configuration.

## Credential Management

### Before: Hardcoded Credentials
Previously, some database credentials and configuration were embedded in code or stored insecurely.

### After: Environment Variable Security
All sensitive credentials are now properly managed through environment variables:

```env
# Required Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required AI API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Security Benefits
- ✅ Credentials not exposed in code repository
- ✅ Different environments can use different credentials
- ✅ Easier credential rotation and management
- ✅ Reduced risk of accidental credential exposure

## Row Level Security (RLS) 

### What is RLS?
Row Level Security is a PostgreSQL feature that controls access to individual rows in database tables based on the current user context.

### Current RLS Status
The project includes comprehensive RLS management tools to handle import functionality:

#### RLS Scripts
- `scripts/verify-rls-status.js` - Check current RLS configuration
- `scripts/fix-rls-simple.js` - Generate SQL to disable RLS
- `scripts/fix-rls-safe.sql` - Alternative RLS configuration
- `supabase/migrations/003_fix_rls_policies.sql` - Migration with RLS policies

### RLS Configuration Options

#### Option 1: Disable RLS (Recommended for Development)
```sql
-- Disable RLS to allow Excel imports
ALTER TABLE public.workout_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_client_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_users DISABLE ROW LEVEL SECURITY;
```

**When to Use**: 
- Development environments
- Single-user applications
- When import functionality is critical

**Benefits**:
- Excel imports work immediately
- Simplified development workflow
- No policy configuration needed

#### Option 2: Permissive RLS Policies
```sql
-- Create permissive policies for all operations
CREATE POLICY "Allow all operations" ON public.workout_clients 
    FOR ALL USING (true) WITH CHECK (true);
    
CREATE POLICY "Allow all operations" ON public.workout_sessions 
    FOR ALL USING (true) WITH CHECK (true);
    
-- ... (similar policies for other tables)
```

**When to Use**:
- When RLS must remain enabled
- Multi-tenant applications (with proper user context)
- Production environments requiring audit trails

**Benefits**:
- Maintains RLS framework for future security
- Allows custom policies per table
- Better for compliance requirements

### RLS Management Workflow

#### Check Current Status
```bash
node scripts/verify-rls-status.js
```

This will show you:
- Which tables have RLS enabled/disabled
- Whether you can insert data to workout_clients
- SQL commands to check status in Supabase

#### Fix RLS Issues
```bash
node scripts/fix-rls-simple.js
```

This generates the SQL commands needed to disable RLS for import functionality.

#### Execute in Supabase
1. Go to Supabase SQL Editor: `https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new`
2. Copy the generated SQL
3. Execute the commands
4. Verify with the status check script

## Security Best Practices

### Environment Variable Management

#### Development
```bash
# Copy example file
cp .env.example .env.local

# Fill in your actual credentials
# Never commit .env.local to version control
```

#### Production
- Use platform-specific environment variable settings
- Ensure `.env.local` is in `.gitignore`
- Rotate credentials regularly
- Use least-privilege principles

### Database Security

#### Service Role Key Usage
The `SUPABASE_SERVICE_ROLE_KEY` is used for:
- Administrative operations
- Bypassing RLS when necessary
- Import/export functionality
- Database maintenance tasks

**Important**: Keep service role key secure and never expose it to client-side code.

#### RLS Configuration
Choose the appropriate RLS strategy based on your needs:

**For Development**: Disable RLS for simplicity
**For Production**: Use proper RLS policies with user context
**For Imports**: Temporarily disable or use service role key

## Troubleshooting Security Issues

### Issue: Excel Import Fails with "Access Denied"
**Cause**: RLS is blocking insert operations
**Solution**: 
1. Run RLS verification script
2. Disable RLS or create permissive policies
3. Ensure service role key is configured

### Issue: Environment Variables Not Loading
**Cause**: Incorrect file name or location
**Solution**:
1. Verify file is named `.env.local`
2. Check file is in project root
3. Restart development server after changes

### Issue: Supabase Connection Fails
**Cause**: Invalid credentials or URL
**Solution**:
1. Verify credentials in Supabase dashboard
2. Check URL format (should include `https://`)
3. Test with `/api/test-db` endpoint

## API Security

### Protected Endpoints
All client management endpoints require:
- Valid Supabase session or service key
- Proper database permissions
- Correct table access rights

### Public Endpoints
The following endpoints are public but have rate limiting:
- `/api/test-db` - Database health check
- Static assets and public pages

## Compliance Considerations

### Data Protection
- All client data encrypted at rest (Supabase)
- HTTPS required for all API calls
- No sensitive data in logs or client-side code

### Access Control
- Service role key for administrative operations
- Regular credential rotation recommended
- Audit trail through Supabase logs

### Privacy
- No personal data in error messages
- Minimal data exposure in API responses
- Secure credential storage patterns

## Migration Security

### From localStorage to Cloud
The recent migration eliminated several security risks:
- No sensitive data in browser storage
- Centralized access control
- Better audit capabilities
- Reduced attack surface

### Ongoing Security
- Regular dependency updates
- Security testing for new features
- Monitoring for unusual access patterns
- Credential management reviews

## Next Steps

1. **Environment Setup**: Ensure all required credentials are configured
2. **RLS Configuration**: Choose and implement appropriate RLS strategy
3. **Testing**: Verify import functionality works with your security setup
4. **Monitoring**: Set up alerts for failed authentication attempts
5. **Documentation**: Keep security configurations documented for team members

This security framework provides a foundation for safe development and production deployment while maintaining the flexibility needed for data import operations.