# Atlas AI Workouts - Production Setup Instructions

## Quick Setup (Recommended)

Run the automated setup script:
```bash
./setup-database.sh
```

This will:
1. Login to Supabase
2. Link your project
3. Push all migrations
4. Verify the setup

## Manual Setup (Alternative)

If the automated setup doesn't work, follow these manual steps:

### Step 1: Login to Supabase CLI
```bash
supabase login
```

### Step 2: Link your project
```bash
supabase link --project-ref lzlrojoaxrqvmhempnkn
```
You'll need your database password from: Supabase Dashboard > Settings > Database

### Step 3: Push migrations
```bash
supabase db push
```

### Step 4: Alternative - Run SQL directly in Supabase

If the above doesn't work, you can run the migration manually:

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql)
2. Copy the contents of `supabase/migrations/20250831_complete_setup.sql`
3. Paste and run in the SQL editor

## Verify Setup

After setup, check if everything is working:

### 1. Check Database Status
```bash
curl https://atlas-ai-workouts.vercel.app/api/debug/database
```

Should return:
- `connected: true`
- Tables exist for: workout_sessions, workout_clients, workout_sops, etc.

### 2. Test Locally
```bash
npm run dev
# Then visit http://localhost:3000/api/debug/database
```

### 3. Create a Test Workout
Visit https://atlas-ai-workouts.vercel.app/builder and create a workout

## Environment Variables

Make sure these are set in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://lzlrojoaxrqvmhempnkn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## Troubleshooting

### Issue: Tables don't exist
Run the migration SQL directly in Supabase SQL editor

### Issue: Can't save workouts
Check RLS policies are enabled and public access is allowed

### Issue: Authentication errors
Make sure the anon key matches your project

### Issue: Rate limited on Vercel
Wait 10-15 minutes and try again, or use GitHub auto-deployment

## Support

For issues, check:
- Database status: `/api/debug/database`
- Migration status: `/api/debug/migrate`
- Console logs in browser DevTools
- Vercel function logs