# Complete Setup Guide - AI Workout Generator

This guide will walk you through setting up the AI Workout Generator with Supabase.

## Prerequisites

- Node.js 18+ installed
- Supabase CLI installed (`brew install supabase/tap/supabase`)
- A Supabase account (free tier works)
- An AI API key (Anthropic or OpenAI)

## Option 1: Quick Cloud Setup (Recommended)

### Step 1: Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Project name**: `ai-workout-generator`
   - **Database Password**: (save this securely!)
   - **Region**: Choose closest to you
4. Click "Create new project"
5. Wait 2 minutes for project to initialize

### Step 2: Get Your Credentials

1. In your Supabase dashboard, go to Settings → API
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with: `eyJ...`)
   - **Service Role Key** (starts with: `eyJ...`) - Keep this secret!

### Step 3: Configure Environment

Create `.env.local` in the project root:

```env
# Supabase (paste your values here)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Provider (choose one)
ANTHROPIC_API_KEY=sk-ant-api03-...
# OR
OPENAI_API_KEY=sk-proj-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Enable pgvector Extension

1. In Supabase dashboard, go to Database → Extensions
2. Search for "vector"
3. Click "Enable" on the vector extension
4. Wait for it to activate

### Step 5: Run Database Migration

```bash
# Link your project (you'll need the project reference ID from dashboard)
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

### Step 6: Seed the Database (Optional)

Create `supabase/seed.sql`:

```sql
-- Sample exercises
INSERT INTO public.exercises (name, modality, body_part, equipment, level, canonical_cues) VALUES
('Push-up', 'strength', ARRAY['chest', 'triceps'], ARRAY['bodyweight'], 'beginner', 
 ARRAY['Keep core tight', 'Lower chest to floor', 'Push through palms']),
('Squat', 'strength', ARRAY['quads', 'glutes'], ARRAY['bodyweight'], 'beginner',
 ARRAY['Feet shoulder-width', 'Hips back and down', 'Drive through heels']);

-- Sample organization
INSERT INTO public.organizations (name, slug) VALUES
('Demo Gym', 'demo-gym');
```

Then run:
```bash
supabase db push --include-seed
```

### Step 7: Start the App

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Option 2: Local Development (Requires Docker)

### Step 1: Start Local Supabase

```bash
# Start Supabase locally
supabase start
```

This will output local credentials. Update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=[from supabase start output]
SUPABASE_SERVICE_ROLE_KEY=[from supabase start output]
```

### Step 2: Run Migrations

```bash
supabase db reset
```

### Step 3: Start the App

```bash
npm run dev
```

## Option 3: Automated Setup Script

We've provided a setup script that handles everything:

```bash
chmod +x setup-supabase.sh
./setup-supabase.sh
```

Follow the prompts to:
1. Create a new Supabase project
2. Configure environment variables
3. Run migrations
4. Seed the database

## Deployment to Production

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables:
   - All values from `.env.local`
   - Set `NEXT_PUBLIC_APP_URL` to your Vercel URL
5. Deploy

### Deploy Supabase Edge Functions (Optional)

If you want to use edge functions for better performance:

```bash
# Deploy workout generation function
supabase functions deploy generateWorkout

# Deploy message ingestion
supabase functions deploy ingestMessages  

# Deploy feedback training
supabase functions deploy trainFromFeedback
```

## Getting AI API Keys

### Anthropic (Claude)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account
3. Generate an API key
4. Add to `.env.local` as `ANTHROPIC_API_KEY`

### OpenAI (GPT-4)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account
3. Generate an API key
4. Add to `.env.local` as `OPENAI_API_KEY`

## First Time Setup

After logging in for the first time:

1. **Create Your Organization**
   - Go to Settings
   - Enter your gym/business name
   - Customize branding (optional)

2. **Add Your First Client**
   - Go to Dashboard → Add Client
   - Enter client details
   - Add goals, injuries, available equipment

3. **Generate Your First Workout**
   - Click "Create Workout"
   - Enter a workout name (e.g., "Upper Body Strength")
   - Select your client
   - Click Generate

4. **Provide Feedback**
   - After viewing a workout, rate it
   - The AI will learn from your preferences

## Troubleshooting

### "Supabase client error"
- Check your environment variables are set correctly
- Ensure your Supabase project is running
- Verify pgvector extension is enabled

### "AI generation failed"
- Check your AI API key is valid
- Ensure you have credits/quota remaining
- Try the other AI provider if available

### "Cannot connect to database"
- For local: Ensure Docker is running
- For cloud: Check your project is active
- Verify your service role key is correct

### Build errors
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version is 18+
- Clear `.next` folder and rebuild

## Support

For issues or questions:
- Check the [README](README.md)
- Review [CLAUDE.md](CLAUDE.md) for architecture details
- Open an issue on GitHub

## Security Notes

- Never commit `.env.local` to git
- Keep your service role key secret
- Use environment variables in production
- Enable RLS policies (already configured)
- Regularly rotate API keys

---

Ready to build amazing AI-powered workouts! 💪