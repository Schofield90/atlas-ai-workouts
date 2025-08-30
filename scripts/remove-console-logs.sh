#!/bin/bash

# Remove console.log, console.error, console.warn statements from Excel import endpoints
echo "Removing console statements from Excel import endpoints..."

# List of files to clean
files=(
  "/Users/samschofield/atlas-ai-workouts/app/api/clients/import-large-excel/route.ts"
  "/Users/samschofield/atlas-ai-workouts/app/api/clients/import-excel-base64/route.ts"
  "/Users/samschofield/atlas-ai-workouts/app/api/clients/import-simple/route.ts"
  "/Users/samschofield/atlas-ai-workouts/app/api/clients/import-excel-chunked/route.ts"
  "/Users/samschofield/atlas-ai-workouts/app/api/clients/convert-excel/route.ts"
  "/Users/samschofield/atlas-ai-workouts/app/api/clients/import-multi-sheet/route.ts"
  "/Users/samschofield/atlas-ai-workouts/app/api/clients/import-excel/route.ts"
  "/Users/samschofield/atlas-ai-workouts/app/api/clients/analyze-excel/route.ts"
  "/Users/samschofield/atlas-ai-workouts/app/api/clients/import-processed/route.ts"
  "/Users/samschofield/atlas-ai-workouts/app/api/clients/import/route.ts"
  "/Users/samschofield/atlas-ai-workouts/app/api/clients/import-chunked/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Cleaning $file..."
    # Remove console.log, console.error, console.warn lines
    sed -i '' '/console\.\(log\|error\|warn\)/d' "$file"
  fi
done

echo "Console statements removed successfully!"