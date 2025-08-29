# 🚀 Supabase Migration Guide for AI Workout App

## Overview
Your AI Workout app currently stores all data in browser localStorage, which means:
- ❌ Data is only available on the device where it was created
- ❌ No backup if browser data is cleared
- ❌ Can't access workouts from phone/tablet/other computers

This guide will help you migrate to Supabase cloud storage for:
- ✅ Access your data from any device
- ✅ Automatic backups
- ✅ Real-time sync across devices
- ✅ Secure authentication
- ✅ Data persistence

## Setup Steps

### Step 1: Run Database Migration (One-time setup)

1. **Open the migration setup page:**
   http://localhost:3001/setup/migrate

2. **Click "Prepare Migration"** - This will copy the SQL to your clipboard

3. **Open Supabase SQL Editor:**
   https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new

4. **Paste and run the SQL** to create all required tables

The migration creates these tables (all prefixed with `workout_` to keep them separate):
- `workout_organizations` - For multi-tenant support
- `workout_users` - User profiles
- `workout_clients` - Your client information
- `workout_sessions` - Workout templates and history
- `workout_feedback` - Workout ratings and feedback
- `workout_exercises` - Exercise library
- `workout_client_messages` - Notes and context

### Step 2: Sign In (if not already)

1. Go to http://localhost:3001/login
2. Sign in with your existing Supabase account
3. Or create a new account if needed

### Step 3: Sync Your Existing Data

1. **Open the sync page:**
   http://localhost:3001/setup/sync

2. **Review your data:**
   - See how many clients and workouts are in local storage
   - Check what's already in the cloud

3. **Click "Sync Local Data to Cloud"**
   - This imports all your existing clients and workouts
   - Preserves all relationships and data

4. **Optional: Clear local storage** after successful sync

### Step 4: Update Your App Pages (Next Steps)

The app is now ready to use Supabase. The following pages have been prepared:
- `/setup/migrate` - Database migration tool
- `/setup/sync` - Data sync and migration tool
- `/lib/services/workout-data.ts` - Complete data service layer

## What's Been Set Up

### Database Structure
All tables use the prefix `workout_` to avoid conflicts with your other apps using the same Supabase instance:
```
workout_clients       -> Your gym clients
workout_sessions      -> Workout plans and history  
workout_feedback      -> Client feedback on workouts
workout_organizations -> Multi-tenant support (future)
workout_users        -> User profiles
```

### Security
- Row Level Security (RLS) is enabled on all tables
- Users can only see their own data
- Proper authentication required for all operations

### Data Service (`/lib/services/workout-data.ts`)
Ready-to-use functions for:
```typescript
// Client operations
clientService.getClients()
clientService.createClient(data)
clientService.updateClient(id, data)
clientService.deleteClient(id)

// Workout operations
clientService.getWorkouts()
clientService.createWorkout(data)
clientService.updateWorkout(id, data)
clientService.deleteWorkout(id)

// Migration helper
clientService.importFromLocalStorage()
```

## Next Development Steps

To fully complete the migration, update your existing pages to use the new service:

### Example: Update Dashboard Page
```typescript
// Old way (localStorage)
const saved = localStorage.getItem('ai-workout-clients')
const clients = saved ? JSON.parse(saved) : []

// New way (Supabase)
import { clientService } from '@/lib/services/workout-data'
const clients = await clientService.getClients()
```

### Example: Create New Client
```typescript
// Old way
const newClient = { id: uuid(), ...data }
const clients = [...existingClients, newClient]
localStorage.setItem('ai-workout-clients', JSON.stringify(clients))

// New way
const newClient = await clientService.createClient(data)
```

## Testing Across Devices

Once migrated:
1. Sign in on your phone/tablet with same account
2. Your workouts and clients will automatically appear
3. Changes sync in real-time across all devices

## Troubleshooting

### "Tables already exist" error
- This means the migration was already run successfully
- You can proceed to the sync step

### "Not authenticated" error
- Sign in at `/login` first
- Then return to the sync page

### Data not appearing after sync
- Check the Supabase dashboard to verify data was created
- Ensure you're signed in with the same account
- Try refreshing the page

## Benefits of This Migration

1. **Multi-device Access**: Use the app on phone, tablet, and computer
2. **Data Backup**: Never lose your workout history
3. **Collaboration Ready**: Future ability to share workouts with team
4. **Scalability**: Handle thousands of clients and workouts
5. **Real-time Sync**: Changes appear instantly on all devices
6. **Secure**: Enterprise-grade security from Supabase

## Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify your Supabase project is active at: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn
3. Ensure all environment variables are set correctly in `.env.local`

---

*Your workout data is important. This migration ensures it's always available, backed up, and secure.* 🏋️‍♂️