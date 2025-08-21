#!/bin/bash

echo "🚀 Setting up Vercel Environment Variables"
echo "========================================="
echo ""
echo "This script will help you configure your Vercel project with Supabase."
echo ""
echo "You'll need:"
echo "1. Your Supabase project URL and keys"
echo "2. AI API keys (Anthropic or OpenAI)"
echo ""

# Function to add env var to Vercel
add_env_var() {
    local key=$1
    local value=$2
    local env=${3:-"production development preview"}
    
    echo "Adding $key to Vercel..."
    vercel env add "$key" "$env" <<< "$value"
}

echo "Please enter your Supabase credentials:"
echo "(Find these in your Supabase dashboard under Settings → API)"
echo ""

read -p "Supabase URL (https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Supabase Anon/Public Key: " SUPABASE_ANON_KEY
read -p "Supabase Service Role Key (keep secret!): " SUPABASE_SERVICE_KEY

echo ""
echo "AI Provider Configuration:"
echo "Enter at least one API key (or both)"
read -p "Anthropic API Key (optional, press Enter to skip): " ANTHROPIC_KEY
read -p "OpenAI API Key (optional, press Enter to skip): " OPENAI_KEY

if [[ -z "$ANTHROPIC_KEY" && -z "$OPENAI_KEY" ]]; then
    echo "⚠️  Warning: No AI API key provided. Workout generation will not work!"
fi

echo ""
echo "Adding environment variables to Vercel..."

# Add Supabase vars
add_env_var "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
add_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
add_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_KEY"

# Add AI vars if provided
if [[ ! -z "$ANTHROPIC_KEY" ]]; then
    add_env_var "ANTHROPIC_API_KEY" "$ANTHROPIC_KEY"
fi

if [[ ! -z "$OPENAI_KEY" ]]; then
    add_env_var "OPENAI_API_KEY" "$OPENAI_KEY"
    add_env_var "EMBEDDING_MODEL" "text-embedding-3-large"
fi

# Add app URL
add_env_var "NEXT_PUBLIC_APP_URL" "https://atlas-ai-workouts.vercel.app"

# Set default AI model
if [[ ! -z "$ANTHROPIC_KEY" ]]; then
    add_env_var "GEN_MODEL" "claude-3-5-sonnet-20241022"
elif [[ ! -z "$OPENAI_KEY" ]]; then
    add_env_var "GEN_MODEL" "gpt-4-turbo-preview"
fi

echo ""
echo "✅ Environment variables added to Vercel!"
echo ""
echo "Now redeploying with the new environment variables..."
vercel --prod

echo ""
echo "✨ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Run the Supabase migrations: ./run-migrations.sh"
echo "2. Visit your app: https://atlas-ai-workouts.vercel.app"