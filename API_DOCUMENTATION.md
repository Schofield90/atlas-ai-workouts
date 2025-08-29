# API Documentation

## Overview

This document provides comprehensive API documentation for the Atlas AI Workouts platform, focusing on the Excel import functionality and database operations added in recent updates.

## Base Configuration

### Environment Requirements
All API endpoints require proper environment configuration:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Authentication
Most endpoints use Supabase authentication with the service role key for administrative operations.

## Client Management APIs

### Get All Clients
Retrieve all workout clients from the database.

**Frontend Usage**: The clients page loads data using the client service.
**Database Access**: Direct Supabase query with error handling.

### Excel Import APIs

#### Multi-Sheet Excel Import
Import clients from an Excel file where each sheet represents a client.

**Endpoint**: `POST /api/clients/import-multi-sheet`

**Content Type**: `multipart/form-data`

**Parameters**:
- `file` (required): Excel file (.xlsx or .xls)

**Request Example**:
```javascript
const formData = new FormData();
formData.append('file', selectedFile);

const response = await fetch('/api/clients/import-multi-sheet', {
  method: 'POST',
  body: formData
});
```

**Response Format**:
```json
{
  "success": true,
  "imported": 15,
  "total": 18,
  "clients": ["John Smith", "Jane Doe", "..."],
  "errors": [
    {
      "client": "Problem Client",
      "error": "Missing required data"
    }
  ],
  "message": "Imported 15 clients from 18 sheets"
}
```

**Error Responses**:

File too large (413):
```json
{
  "error": "File too large",
  "fileSize": 5242880,
  "maxSize": 4194304,
  "needsChunking": true,
  "message": "File exceeds 4MB limit. Please use the chunked upload process."
}
```

Too many sheets (413):
```json
{
  "error": "Too many sheets",
  "sheetCount": 75,
  "maxSheetsPerRequest": 50,
  "needsChunking": true,
  "message": "File has 75 sheets. Maximum 50 sheets per request. Please use chunked processing.",
  "sheetNames": ["Sheet1", "Sheet2", "..."]
}
```

RLS blocking imports (500):
```json
{
  "error": "new row violates row-level security policy for table \"workout_clients\"",
  "suggestion": "Run the RLS fix script to enable imports"
}
```

#### Chunked Excel Import
For large files, import clients in chunks.

**Endpoint**: `POST /api/clients/import-multi-sheet?chunked=true&chunkIndex=0&totalChunks=3`

**Content Type**: `application/json`

**Parameters**:
- `chunked=true` (query): Enable chunked processing
- `chunkIndex` (query): Current chunk index (0-based)
- `totalChunks` (query): Total number of chunks

**Request Body**:
```json
{
  "clients": [
    {
      "full_name": "John Smith",
      "injuries": "Knee pain, back issues",
      "goals": "Weight loss, strength building",
      "sheetName": "John Smith"
    }
  ]
}
```

**Response Format**:
```json
{
  "success": true,
  "chunkIndex": 0,
  "totalChunks": 3,
  "imported": 10,
  "total": 10,
  "clients": ["Client1", "Client2", "..."],
  "errors": []
}
```

### Database Health Check

#### Test Database Connection
Verify database connectivity and permissions.

**Endpoint**: `GET /api/test-db`

**Authentication**: None (public endpoint)

**Response Format**:
```json
{
  "status": "connected",
  "timestamp": "2025-08-29T10:30:00.000Z",
  "tables": [
    "workout_clients",
    "workout_sessions", 
    "workout_feedback",
    "workout_exercises",
    "workout_client_messages",
    "workout_organizations",
    "workout_users"
  ],
  "clientCount": 42,
  "canInsert": true,
  "rlsStatus": {
    "workout_clients": false,
    "workout_sessions": false
  }
}
```

**Error Response** (500):
```json
{
  "status": "error",
  "error": "Connection failed",
  "details": "Invalid API key or project URL"
}
```

## Data Models

### WorkoutClient
The primary client data structure used throughout the application.

```typescript
interface WorkoutClient {
  id: string;                    // Auto-generated UUID
  full_name: string;            // Client's full name (from sheet name)
  email?: string | null;        // Email address (optional)
  phone?: string | null;        // Phone number (optional)
  age?: number;                 // Age (optional)
  sex?: string;                 // Gender (optional)
  height_cm?: number;           // Height in centimeters (optional)
  weight_kg?: number;           // Weight in kilograms (optional)
  goals?: string;               // Fitness goals (extracted from sheet)
  injuries?: string;            // Injuries or limitations (extracted from sheet)
  equipment?: any[];            // Available equipment (array)
  preferences?: any;            // Additional preferences (JSON)
  notes?: string;               // Additional notes
  created_at: string;           // Timestamp (ISO format)
  updated_at: string;           // Last updated timestamp (ISO format)
  user_id: string;              // Associated user ID
}
```

### Excel Import Data Extraction

#### Sheet Processing Logic
1. **Sheet Name**: Used as client's `full_name`
2. **Content Extraction**: Searches for injuries and goals in:
   - Specific cells: B1, A2 (injuries), B2, A3 (goals)
   - Keyword search: "injur", "goal" labels
   - Adjacent cells: Right or below label cells

#### Default Values
```typescript
const defaultClient = {
  full_name: sheetName,
  email: null,
  phone: null,
  goals: goals || 'No goals specified',
  injuries: injuries || 'No injuries reported',
  equipment: [],
  notes: `Imported from sheet: ${sheetName}`,
  user_id: 'default-user'
}
```

## Error Handling

### HTTP Status Codes
- **200**: Success
- **400**: Bad Request (invalid file, missing parameters)
- **413**: Payload Too Large (file size/sheet count exceeded)
- **500**: Internal Server Error (database issues, RLS problems)

### Common Error Types

#### File Upload Errors
```json
{
  "error": "No file provided",
  "status": 400
}
```

#### Database Connection Errors
```json
{
  "error": "Database connection failed",
  "details": "Check Supabase credentials",
  "status": 500
}
```

#### RLS Policy Errors
```json
{
  "error": "new row violates row-level security policy",
  "table": "workout_clients",
  "suggestion": "Run RLS fix script or check permissions",
  "status": 500
}
```

#### Processing Errors
```json
{
  "error": "Failed to process sheet",
  "sheet": "Client Name",
  "details": "Invalid sheet format or corrupted data",
  "status": 500
}
```

## Rate Limiting and Performance

### File Size Limits
- **Standard Processing**: 4MB maximum
- **Chunked Processing**: Automatic for larger files
- **Memory Management**: Batch processing (10 sheets per batch)

### Processing Limits
- **Maximum Sheets**: 50 per request
- **Batch Size**: 10 sheets processed simultaneously
- **Timeout**: 60 seconds maximum per request
- **Delays**: 100ms between batches to prevent overload

### Performance Optimizations
- **Streaming**: Large files processed in chunks
- **Batch Processing**: Multiple clients inserted efficiently
- **Error Isolation**: Individual sheet failures don't stop processing
- **Memory Management**: Buffer cleanup between operations

## Security Considerations

### Authentication
- Service role key required for database operations
- No client-side exposure of sensitive credentials
- Request validation and sanitization

### Data Validation
- File type verification (Excel formats only)
- Size limits to prevent resource exhaustion
- SQL injection prevention through parameterized queries
- Input sanitization for all client data

### RLS (Row Level Security)
- Database-level security policies
- Can be disabled for import operations
- Configurable via management scripts
- Audit trail maintained through Supabase

## Integration Examples

### Frontend Integration

#### Basic Excel Import
```javascript
async function importExcelFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('/api/clients/import-multi-sheet', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Import failed');
    }
    
    const result = await response.json();
    console.log(`Imported ${result.imported} clients`);
    
    if (result.errors?.length > 0) {
      console.warn('Some imports failed:', result.errors);
    }
    
    return result;
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
}
```

#### Database Health Check
```javascript
async function checkDatabaseHealth() {
  try {
    const response = await fetch('/api/test-db');
    const result = await response.json();
    
    if (result.status === 'connected') {
      console.log('Database OK:', result.clientCount, 'clients');
      
      if (!result.canInsert) {
        console.warn('Import functionality disabled (RLS)');
      }
    }
    
    return result;
  } catch (error) {
    console.error('Database check failed:', error);
    return { status: 'error', error: error.message };
  }
}
```

### Backend Integration

#### Custom Client Service
```typescript
import { createClient } from '@/lib/db/client-fixed';

export class ClientService {
  private supabase = createClient();
  
  async importClients(clients: Partial<WorkoutClient>[]) {
    const results = [];
    const errors = [];
    
    for (const client of clients) {
      try {
        const { data, error } = await this.supabase
          .from('workout_clients')
          .insert(client)
          .select()
          .single();
          
        if (error) {
          errors.push({ client: client.full_name, error: error.message });
        } else {
          results.push(data);
        }
      } catch (e) {
        errors.push({ client: client.full_name, error: e.message });
      }
    }
    
    return { results, errors };
  }
}
```

## Testing APIs

### Manual Testing

#### Database Connection
```bash
curl http://localhost:3000/api/test-db
```

#### Excel Import (using curl)
```bash
curl -X POST \
  -F "file=@clients.xlsx" \
  http://localhost:3000/api/clients/import-multi-sheet
```

### Automated Testing

#### Unit Tests
```javascript
describe('Excel Import API', () => {
  test('handles valid Excel file', async () => {
    const formData = new FormData();
    formData.append('file', mockExcelFile);
    
    const response = await request(app)
      .post('/api/clients/import-multi-sheet')
      .send(formData)
      .expect(200);
      
    expect(response.body.success).toBe(true);
    expect(response.body.imported).toBeGreaterThan(0);
  });
  
  test('rejects invalid file', async () => {
    const formData = new FormData();
    formData.append('file', mockTextFile);
    
    await request(app)
      .post('/api/clients/import-multi-sheet')
      .send(formData)
      .expect(400);
  });
});
```

This API documentation provides a comprehensive reference for integrating with the Atlas AI Workouts platform, particularly the enhanced Excel import functionality and database management features.