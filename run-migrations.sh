#!/bin/bash

echo "🗄️ Running Supabase Migrations"
echo "=============================="
echo ""
echo "This will create all necessary tables in your existing Supabase project."
echo ""

# Check if we have Supabase credentials
if [ ! -f .env.local ]; then
    echo "Creating .env.local from your input..."
    echo ""
    read -p "Supabase URL: " SUPABASE_URL
    read -p "Supabase Service Role Key: " SERVICE_KEY
    
    cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
EOF
    echo "✅ Created .env.local"
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

echo ""
echo "Running migrations directly via psql connection..."
echo ""

# Extract host from Supabase URL
SUPABASE_HOST=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co||')

# Construct database URL
read -p "Enter your database password (from Supabase dashboard): " DB_PASSWORD
DATABASE_URL="postgresql://postgres:$DB_PASSWORD@db.$SUPABASE_HOST.supabase.co:5432/postgres"

echo ""
echo "Applying migrations..."

# Run the migration using psql
psql "$DATABASE_URL" < supabase/migrations/001_init.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations applied successfully!"
    echo ""
    echo "Now let's seed some initial data..."
    
    # Create seed file if it doesn't exist
    if [ ! -f supabase/seed.sql ]; then
        cat > supabase/seed.sql << 'EOF'
-- Seed exercises table with common exercises
INSERT INTO public.exercises (name, modality, body_part, equipment, level, canonical_cues) VALUES
-- Chest exercises
('Push-up', 'strength', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['bodyweight'], 'beginner', 
 ARRAY['Keep core tight', 'Lower chest to floor', 'Push through palms']),
('Bench Press', 'strength', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['barbell', 'bench'], 'intermediate',
 ARRAY['Grip slightly wider than shoulders', 'Lower to chest', 'Press up explosively']),
('Dumbbell Flyes', 'strength', ARRAY['chest'], ARRAY['dumbbells', 'bench'], 'intermediate',
 ARRAY['Slight bend in elbows', 'Wide arc motion', 'Squeeze at top']),

-- Back exercises  
('Pull-up', 'strength', ARRAY['back', 'biceps'], ARRAY['pull-up bar'], 'intermediate',
 ARRAY['Full hang start', 'Pull chin over bar', 'Control descent']),
('Bent-over Row', 'strength', ARRAY['back', 'biceps'], ARRAY['barbell'], 'intermediate',
 ARRAY['Hinge at hips', 'Pull to stomach', 'Squeeze shoulder blades']),
('Lat Pulldown', 'strength', ARRAY['back', 'biceps'], ARRAY['cable machine'], 'beginner',
 ARRAY['Lean back slightly', 'Pull to upper chest', 'Control the weight']),

-- Leg exercises
('Squat', 'strength', ARRAY['quads', 'glutes', 'hamstrings'], ARRAY['bodyweight'], 'beginner',
 ARRAY['Feet shoulder-width', 'Hips back and down', 'Drive through heels']),
('Deadlift', 'strength', ARRAY['hamstrings', 'glutes', 'back'], ARRAY['barbell'], 'intermediate',
 ARRAY['Feet hip-width', 'Neutral spine', 'Drive hips forward']),
('Lunges', 'strength', ARRAY['quads', 'glutes', 'hamstrings'], ARRAY['bodyweight'], 'beginner',
 ARRAY['Step forward', 'Lower back knee', 'Push through front heel']),
('Leg Press', 'strength', ARRAY['quads', 'glutes'], ARRAY['leg press machine'], 'beginner',
 ARRAY['Feet shoulder-width', 'Lower to 90 degrees', 'Press through heels']),

-- Shoulder exercises
('Overhead Press', 'strength', ARRAY['shoulders', 'triceps'], ARRAY['barbell'], 'intermediate',
 ARRAY['Core tight', 'Press straight up', 'Lock out at top']),
('Lateral Raises', 'strength', ARRAY['shoulders'], ARRAY['dumbbells'], 'beginner',
 ARRAY['Slight bend in elbows', 'Raise to shoulder height', 'Control descent']),

-- Core exercises
('Plank', 'strength', ARRAY['core'], ARRAY['bodyweight'], 'beginner',
 ARRAY['Straight line from head to heels', 'Engage core', 'Breathe normally']),
('Crunches', 'strength', ARRAY['abs'], ARRAY['bodyweight'], 'beginner',
 ARRAY['Hands behind head', 'Lift shoulder blades', 'Don''t pull neck']),
('Russian Twists', 'strength', ARRAY['core', 'obliques'], ARRAY['bodyweight'], 'intermediate',
 ARRAY['Lean back slightly', 'Rotate side to side', 'Keep chest up']),

-- Cardio exercises
('Running', 'cardio', ARRAY['full body'], ARRAY['treadmill'], 'beginner',
 ARRAY['Land on midfoot', 'Slight forward lean', 'Relaxed shoulders']),
('Rowing', 'cardio', ARRAY['full body'], ARRAY['rowing machine'], 'beginner',
 ARRAY['Drive with legs', 'Lean back slightly', 'Pull to chest']),
('Burpees', 'cardio', ARRAY['full body'], ARRAY['bodyweight'], 'intermediate',
 ARRAY['Jump feet back', 'Push-up position', 'Jump feet forward and up']),

-- Mobility exercises
('Cat-Cow Stretch', 'mobility', ARRAY['spine'], ARRAY['bodyweight'], 'beginner',
 ARRAY['On hands and knees', 'Arch and round spine', 'Move slowly']),
('Hip Circles', 'mobility', ARRAY['hips'], ARRAY['bodyweight'], 'beginner',
 ARRAY['Hands on hips', 'Circle hips slowly', 'Both directions']),
('Arm Circles', 'mobility', ARRAY['shoulders'], ARRAY['bodyweight'], 'beginner',
 ARRAY['Arms extended', 'Small to large circles', 'Both directions'])
ON CONFLICT DO NOTHING;

-- Create a default organization
INSERT INTO public.organizations (name, slug, settings) VALUES
('Your Fitness Studio', 'your-fitness-studio', 
 '{"branding": {"name": "Your Fitness Studio", "logo": "", "colors": {"primary": "#3b82f6", "secondary": "#10b981"}}, "preferences": {"default_duration": 60, "default_intensity": "moderate"}}'::jsonb)
ON CONFLICT DO NOTHING;
EOF
    fi
    
    echo ""
    read -p "Would you like to seed the database with sample exercises? (y/n): " SEED_CHOICE
    
    if [[ "$SEED_CHOICE" == "y" || "$SEED_CHOICE" == "Y" ]]; then
        psql "$DATABASE_URL" < supabase/seed.sql
        echo "✅ Database seeded with exercises!"
    fi
else
    echo ""
    echo "❌ Migration failed. Please check your database credentials."
    echo ""
    echo "Common issues:"
    echo "1. Wrong database password"
    echo "2. Database not accessible from your IP"
    echo "3. pgvector extension not enabled"
    echo ""
    echo "To enable pgvector:"
    echo "1. Go to your Supabase dashboard"
    echo "2. Navigate to Database → Extensions"
    echo "3. Search for 'vector' and enable it"
fi

echo ""
echo "Setup complete! Your app should now be fully functional."
echo ""
echo "Test it out:"
echo "1. Visit https://atlas-ai-workouts.vercel.app"
echo "2. Sign up with your email"
echo "3. Create a client"
echo "4. Generate your first AI workout!"