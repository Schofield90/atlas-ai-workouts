# Import Large Excel API - Usage Guide

## Endpoint
`POST /api/clients/import-large-excel`

## Summary
This endpoint is designed to import client data in chunks. The **critical fix** was removing the server-side re-slicing that was causing only the first 20 clients to be imported. The handler now uses the `clients` array directly from the request body.

## Request Format
```typescript
POST /api/clients/import-large-excel?startIndex=0&endIndex=19
Content-Type: application/json

{
  "clients": [
    {
      "full_name": "John Doe",      // REQUIRED
      "email": "john@example.com",  // optional
      "phone": "+1234567890",       // optional
      "goals": "Lose weight",       // optional
      "injuries": "Lower back",     // optional
      "equipment": ["dumbbells"],   // optional array
      "notes": "Prefers morning",   // optional
      "sheetName": "Sheet1"         // optional
    },
    // ... up to 100 clients per request
  ]
}
```

## Response Format
```typescript
{
  "successCount": 20,  // Number successfully imported
  "errors": [          // Array of errors (if any)
    {
      "index": 5,      // Index in the clients array
      "message": "Duplicate client: John Doe"
    }
  ]
}
```

## Key Implementation Details

### The Bug Fix
The original handler was re-slicing the clients array based on `startIndex` and `endIndex`:
```typescript
// OLD BUGGY CODE - DON'T DO THIS!
const clientsToProcess = clients.slice(startIndex, actualEndIndex + 1)
```

The fixed handler uses the clients array directly:
```typescript
// FIXED CODE - USE THE REQUEST BODY DIRECTLY
const clients = body.clients  // Use this array as-is, no slicing!
```

### Query Parameters
- `startIndex` and `endIndex` are **for logging only**
- They help track which chunk is being processed
- They do **NOT** affect which clients are processed

### Environment Variables
```bash
# Required
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Optional
USE_CLIENT_UPSERT=true  # Set to 'true' to update on duplicate names
```

### Database Schema
The handler expects a `workout_clients` table with these columns:
- `id` (uuid, auto-generated)
- `full_name` (text, NOT NULL)
- `email` (text, nullable)
- `phone` (text, nullable)
- `goals` (text, nullable)
- `injuries` (text, nullable)
- `equipment` (text[], nullable)
- `notes` (text, nullable)
- `sheet_name` (text, nullable)
- `created_at` (timestamptz, auto-generated)

## Testing with cURL

### Test with 2 clients
```bash
curl -X POST "http://localhost:3000/api/clients/import-large-excel?startIndex=0&endIndex=1" \
  -H "Content-Type: application/json" \
  -d '{
    "clients": [
      {
        "full_name": "Alice Smith",
        "email": "alice@example.com",
        "goals": "Build muscle",
        "equipment": ["barbell", "pull-up bar"]
      },
      {
        "full_name": "Bob Johnson",
        "phone": "+1234567890",
        "injuries": "Knee injury",
        "notes": "Needs modifications"
      }
    ]
  }'
```

Expected response:
```json
{
  "successCount": 2,
  "errors": []
}
```

### Test with duplicate (when USE_CLIENT_UPSERT=false)
```bash
curl -X POST "http://localhost:3000/api/clients/import-large-excel" \
  -H "Content-Type: application/json" \
  -d '{
    "clients": [
      {
        "full_name": "Alice Smith",
        "email": "alice.new@example.com"
      }
    ]
  }'
```

Expected response:
```json
{
  "successCount": 0,
  "errors": [
    {
      "index": 0,
      "message": "Duplicate client: Alice Smith"
    }
  ]
}
```

## Front-End Integration

The front-end should:
1. Parse the Excel file client-side
2. Chunk clients into arrays of 20
3. Send each chunk sequentially with a small delay
4. Accumulate the total `successCount` across all chunks
5. Display any errors to the user

Example:
```typescript
let totalSuccess = 0;
let allErrors = [];

for (let i = 0; i < allClients.length; i += 20) {
  const chunk = allClients.slice(i, i + 20);
  
  const response = await fetch(`/api/clients/import-large-excel?startIndex=${i}&endIndex=${i + chunk.length - 1}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clients: chunk })
  });
  
  const result = await response.json();
  totalSuccess += result.successCount;
  allErrors.push(...(result.errors || []));
  
  // Small delay between chunks
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log(`Imported ${totalSuccess} out of ${allClients.length} clients`);
if (allErrors.length > 0) {
  console.error('Errors:', allErrors.slice(0, 5)); // Show first 5 errors
}
```

## Acceptance Criteria ✅
- ✅ All 169 clients are imported (not just first 20)
- ✅ Handler accepts POST only (405 for other methods)
- ✅ Uses request body `clients` array directly
- ✅ Returns `{ successCount, errors }` format
- ✅ Handles duplicates gracefully
- ✅ Validates required `full_name` field
- ✅ Sanitizes strings and handles empty values
- ✅ Processes up to 100 clients per request
- ✅ Works within Vercel's 30-second timeout

## Deployment
The fixed endpoint is deployed at:
https://atlas-ai-workouts.vercel.app/api/clients/import-large-excel

Deployed: 2025-08-30T10:57:28.014Z