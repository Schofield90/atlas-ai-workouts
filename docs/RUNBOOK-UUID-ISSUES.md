# UUID Issues Runbook

## Problem Description
Client detail pages return 404 errors due to malformed UUIDs in the database (37+ characters instead of 36).

## Symptoms
- 404 errors when clicking on client links
- Console errors showing UUID with extra characters (e.g., `a3b7d016-350f-443e-8ccb-f751ac4f9a9c1`)
- Client pages not loading despite data existing in database

## Root Cause
UUID corruption during data import or creation, resulting in IDs longer than the standard 36 characters.

## Immediate Fix (Production Hotfix)

### Step 1: Run Database Fix
1. Open Supabase SQL Editor
2. Run the emergency fix script:
```sql
-- Check for invalid UUIDs
SELECT id, full_name, LENGTH(id) as id_length
FROM workout_clients
WHERE LENGTH(id) != 36
ORDER BY created_at DESC;

-- Fix the IDs (backup first!)
UPDATE workout_clients
SET id = SUBSTRING(id, 1, 36)
WHERE LENGTH(id) > 36;

-- Fix related tables
UPDATE workout_sessions
SET client_id = SUBSTRING(client_id, 1, 36)
WHERE client_id IS NOT NULL AND LENGTH(client_id) > 36;

UPDATE workout_feedback
SET client_id = SUBSTRING(client_id, 1, 36)
WHERE client_id IS NOT NULL AND LENGTH(client_id) > 36;
```

### Step 2: Clear Caches
1. Vercel CDN: Deploy a new version or purge cache
2. Browser: Clear browser cache or test in incognito
3. Local storage: Clear if any client data is cached

### Step 3: Verify Fix
1. Visit `/api/monitoring/uuid-health` to check UUID status
2. Test affected client pages
3. Check console for any UUID warnings

## Prevention Measures

### Database Constraints (Already Implemented)
```sql
ALTER TABLE workout_clients 
ADD CONSTRAINT check_uuid_format 
CHECK (id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
```

### Application-Level Validation
- Middleware redirects for malformed URLs
- UUID validator utility in `/lib/utils/uuid-validator.ts`
- Client-side and server-side validation

### Monitoring
- Health check endpoint: `/api/monitoring/uuid-health`
- Console logging for UUID issues
- Error tracking in production

## Testing

### Manual Testing
1. Navigate to `/clients/[malformed-uuid]` - should redirect to cleaned UUID
2. Navigate to `/p/clients/[id]` - should redirect to `/clients/[id]`
3. Click client links from list page - should work without 404

### Automated Testing
Run E2E tests:
```bash
npm run test:e2e -- client-routes.spec.ts
```

## Code Locations

### Key Files Modified
- `/middleware.ts` - URL cleaning and redirects
- `/lib/utils/uuid-validator.ts` - UUID validation utilities
- `/lib/services/workout-data-simple.ts` - Service layer validation
- `/app/clients/[id]/page.tsx` - Client page UUID handling
- `/scripts/emergency-uuid-fix.sql` - Database fix script
- `/supabase/migrations/20250829_fix_invalid_uuids.sql` - Migration with constraints

### API Endpoints
- `/api/monitoring/uuid-health` - UUID health check
- `/api/clients/[id]` - Client API with validation

## Rollback Plan

If issues persist after fix:
1. Revert to previous deployment in Vercel
2. Restore database from backup (if available)
3. Contact team for assistance

## Contact

For escalation or questions:
- Check deployment status: https://vercel.com/schofield90s-projects/atlas-ai-workouts
- Database dashboard: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn

## Verification Checklist

- [ ] Database UUIDs are all 36 characters
- [ ] No 404 errors on client pages
- [ ] Middleware redirects working
- [ ] Health check shows "healthy" status
- [ ] E2E tests passing
- [ ] No UUID errors in console logs
- [ ] Production deployment successful

## Long-term Solutions

1. **Input Validation**: Strengthen validation at data entry points
2. **Import Process**: Review and fix Excel import to prevent UUID corruption
3. **Database Triggers**: Add triggers to validate UUIDs on insert/update
4. **Monitoring Dashboard**: Create dashboard for UUID health metrics
5. **Automated Cleanup**: Schedule job to detect and fix invalid UUIDs

## Lessons Learned

- Always validate UUIDs at multiple levels (database, API, UI)
- Implement comprehensive error handling for dynamic routes
- Monitor data integrity continuously
- Have database constraints as last line of defense
- Test with malformed data during development

---

Last Updated: August 29, 2025
Version: 1.0