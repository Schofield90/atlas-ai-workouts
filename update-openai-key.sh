#!/bin/bash

echo "OpenAI API Key Updater"
echo "====================="
echo ""
echo "Please enter your OpenAI API key (it should start with 'sk-'):"
echo "Get your key from: https://platform.openai.com/api-keys"
echo ""
read -p "Enter OpenAI API Key: " OPENAI_KEY

# Validate the key format
if [[ ! "$OPENAI_KEY" =~ ^sk- ]]; then
    echo "❌ Error: OpenAI keys should start with 'sk-'"
    echo "Please check your key and try again."
    exit 1
fi

# Check key length (should be around 50+ characters)
if [ ${#OPENAI_KEY} -lt 40 ]; then
    echo "❌ Error: Key seems too short. OpenAI keys are typically 50+ characters."
    echo "Please check your key and try again."
    exit 1
fi

# Update the .env.local file
if [ -f .env.local ]; then
    # Backup current file
    cp .env.local .env.local.backup
    
    # Update the OpenAI key
    sed -i '' "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$OPENAI_KEY/" .env.local
    
    echo "✅ OpenAI API key updated successfully!"
    echo ""
    echo "Key details:"
    echo "- Length: ${#OPENAI_KEY} characters"
    echo "- Prefix: ${OPENAI_KEY:0:7}..."
    echo ""
    echo "The server will use this key when restarted."
    echo "Run 'npm run dev' to test it."
else
    echo "❌ Error: .env.local file not found!"
    exit 1
fi