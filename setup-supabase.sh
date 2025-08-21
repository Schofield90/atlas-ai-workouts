#!/bin/bash

# Setup script for Supabase project
set -e

echo "🚀 Setting up Supabase for AI Workout Generator"
echo "================================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    brew install supabase/tap/supabase
else
    echo "✅ Supabase CLI is installed"
fi

# Function to create project via API
create_remote_project() {
    echo ""
    echo "📦 Creating a new Supabase project..."
    echo ""
    echo "Please follow these steps:"
    echo ""
    echo "1. Go to: https://supabase.com/dashboard"
    echo "2. Click 'New Project'"
    echo "3. Fill in:"
    echo "   - Project name: ai-workout-generator"
    echo "   - Database Password: (save this securely!)"
    echo "   - Region: Choose closest to you"
    echo "4. Click 'Create new project'"
    echo ""
    echo "⏳ Wait for project to be ready (takes ~2 minutes)"
    echo ""
    read -p "Press Enter when your project is ready..."
    
    echo ""
    read -p "Enter your project reference ID (e.g., lzlrojoaxrqvmhempnkn): " PROJECT_REF
    read -p "Enter your project URL (e.g., https://lzlrojoaxrqvmhempnkn.supabase.co): " SUPABASE_URL
    read -p "Enter your anon/public key: " ANON_KEY
    read -p "Enter your service_role key: " SERVICE_KEY
    
    # Update .env.local
    cat > .env.local << EOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY

# AI Providers (add your keys)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
    
    echo "✅ Environment variables saved to .env.local"
    
    # Link the project
    echo ""
    echo "🔗 Linking to Supabase project..."
    supabase link --project-ref $PROJECT_REF
    
    echo "✅ Project linked successfully!"
}

# Function to run migrations
run_migrations() {
    echo ""
    echo "🗄️ Running database migrations..."
    
    # Push the migration
    supabase db push
    
    echo "✅ Migrations applied successfully!"
}

# Function to seed exercises
seed_database() {
    echo ""
    echo "🌱 Seeding exercise database..."
    
    # Create seed file if it doesn't exist
    if [ ! -f "supabase/seed.sql" ]; then
        cat > supabase/seed.sql << 'EOF'
-- Seed exercises table with common exercises
INSERT INTO public.exercises (name, modality, body_part, equipment, level, canonical_cues) VALUES
-- Chest exercises
('Push-up', 'strength', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['bodyweight'], 'beginner', ARRAY['Keep core tight', 'Lower chest to floor', 'Push through palms']),
('Bench Press', 'strength', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['barbell', 'bench'], 'intermediate', ARRAY['Grip slightly wider than shoulders', 'Lower to chest', 'Press up explosively']),
('Dumbbell Flyes', 'strength', ARRAY['chest'], ARRAY['dumbbells', 'bench'], 'intermediate', ARRAY['Slight bend in elbows', 'Wide arc motion', 'Squeeze at top']),

-- Back exercises  
('Pull-up', 'strength', ARRAY['back', 'biceps'], ARRAY['pull-up bar'], 'intermediate', ARRAY['Full hang start', 'Pull chin over bar', 'Control descent']),
('Bent-over Row', 'strength', ARRAY['back', 'biceps'], ARRAY['barbell'], 'intermediate', ARRAY['Hinge at hips', 'Pull to stomach', 'Squeeze shoulder blades']),
('Lat Pulldown', 'strength', ARRAY['back', 'biceps'], ARRAY['cable machine'], 'beginner', ARRAY['Lean back slightly', 'Pull to upper chest', 'Control the weight']),

-- Leg exercises
('Squat', 'strength', ARRAY['quads', 'glutes', 'hamstrings'], ARRAY['bodyweight'], 'beginner', ARRAY['Feet shoulder-width', 'Hips back and down', 'Drive through heels']),
('Deadlift', 'strength', ARRAY['hamstrings', 'glutes', 'back'], ARRAY['barbell'], 'intermediate', ARRAY['Feet hip-width', 'Neutral spine', 'Drive hips forward']),
('Lunges', 'strength', ARRAY['quads', 'glutes', 'hamstrings'], ARRAY['bodyweight'], 'beginner', ARRAY['Step forward', 'Lower back knee', 'Push through front heel']),
('Leg Press', 'strength', ARRAY['quads', 'glutes'], ARRAY['leg press machine'], 'beginner', ARRAY['Feet shoulder-width', 'Lower to 90 degrees', 'Press through heels']),

-- Shoulder exercises
('Overhead Press', 'strength', ARRAY['shoulders', 'triceps'], ARRAY['barbell'], 'intermediate', ARRAY['Core tight', 'Press straight up', 'Lock out at top']),
('Lateral Raises', 'strength', ARRAY['shoulders'], ARRAY['dumbbells'], 'beginner', ARRAY['Slight bend in elbows', 'Raise to shoulder height', 'Control descent']),

-- Core exercises
('Plank', 'strength', ARRAY['core'], ARRAY['bodyweight'], 'beginner', ARRAY['Straight line from head to heels', 'Engage core', 'Breathe normally']),
('Crunches', 'strength', ARRAY['abs'], ARRAY['bodyweight'], 'beginner', ARRAY['Hands behind head', 'Lift shoulder blades', 'Don''t pull neck']),
('Russian Twists', 'strength', ARRAY['core', 'obliques'], ARRAY['bodyweight'], 'intermediate', ARRAY['Lean back slightly', 'Rotate side to side', 'Keep chest up']),

-- Cardio exercises
('Running', 'cardio', ARRAY['full body'], ARRAY['treadmill'], 'beginner', ARRAY['Land on midfoot', 'Slight forward lean', 'Relaxed shoulders']),
('Rowing', 'cardio', ARRAY['full body'], ARRAY['rowing machine'], 'beginner', ARRAY['Drive with legs', 'Lean back slightly', 'Pull to chest']),
('Burpees', 'cardio', ARRAY['full body'], ARRAY['bodyweight'], 'intermediate', ARRAY['Jump feet back', 'Push-up position', 'Jump feet forward and up']),

-- Mobility exercises
('Cat-Cow Stretch', 'mobility', ARRAY['spine'], ARRAY['bodyweight'], 'beginner', ARRAY['On hands and knees', 'Arch and round spine', 'Move slowly']),
('Hip Circles', 'mobility', ARRAY['hips'], ARRAY['bodyweight'], 'beginner', ARRAY['Hands on hips', 'Circle hips slowly', 'Both directions']),
('Arm Circles', 'mobility', ARRAY['shoulders'], ARRAY['bodyweight'], 'beginner', ARRAY['Arms extended', 'Small to large circles', 'Both directions']);

-- Insert a sample organization (will be updated when user signs up)
INSERT INTO public.organizations (name, slug, settings) VALUES
('Your Gym', 'your-gym', '{"branding": {"name": "Your Gym", "logo": "", "colors": {}}, "preferences": {"default_duration": 60, "default_intensity": "moderate"}}'::jsonb);
EOF
    fi
    
    supabase db push --include-seed
    
    echo "✅ Database seeded successfully!"
}

# Function to enable pgvector
enable_pgvector() {
    echo ""
    echo "🔧 Enabling pgvector extension..."
    echo ""
    echo "Please follow these steps in your Supabase dashboard:"
    echo ""
    echo "1. Go to your project dashboard"
    echo "2. Navigate to Database → Extensions"
    echo "3. Search for 'vector'"
    echo "4. Click 'Enable' on the vector extension"
    echo ""
    read -p "Press Enter when you've enabled pgvector..."
    
    echo "✅ pgvector enabled!"
}

# Main setup flow
main() {
    echo ""
    echo "This script will help you set up Supabase for the AI Workout Generator."
    echo ""
    echo "Choose an option:"
    echo "1) Create a new Supabase project (recommended)"
    echo "2) Link to existing Supabase project"
    echo "3) Setup local development (requires Docker)"
    echo ""
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            create_remote_project
            enable_pgvector
            run_migrations
            seed_database
            ;;
        2)
            echo ""
            read -p "Enter your project reference ID: " PROJECT_REF
            supabase link --project-ref $PROJECT_REF
            
            echo ""
            echo "Please update your .env.local with your Supabase credentials"
            run_migrations
            seed_database
            ;;
        3)
            echo ""
            echo "Starting local Supabase (requires Docker)..."
            supabase start
            
            # Get local credentials
            echo ""
            echo "Local Supabase credentials:"
            supabase status
            
            # Update .env.local with local values
            echo ""
            echo "Updating .env.local with local credentials..."
            cat > .env.local << EOF
# Supabase (local)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(supabase status -o json | jq -r .api.anon_key)
SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | jq -r .api.service_key)

# AI Providers (add your keys)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
            
            run_migrations
            seed_database
            ;;
        *)
            echo "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    echo "✨ Setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Add your AI API keys to .env.local"
    echo "   - Get Anthropic API key: https://console.anthropic.com"
    echo "   - Get OpenAI API key: https://platform.openai.com"
    echo ""
    echo "2. Start the development server:"
    echo "   npm run dev"
    echo ""
    echo "3. Visit http://localhost:3000"
    echo ""
    echo "Happy building! 💪"
}

# Run main function
main