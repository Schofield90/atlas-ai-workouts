# Excel Import Guide

## Overview

The Atlas AI Workouts platform supports importing client data from Excel files with multiple sheets. Each sheet tab represents a client, with their injuries and goals stored in the sheet content.

## Supported File Formats

- **Excel Files**: `.xlsx`, `.xls`
- **Multiple Sheets**: Each sheet tab becomes a client
- **File Size**: Up to 4MB (larger files use chunked processing)
- **Sheet Limit**: Up to 50 sheets per request (larger files processed in chunks)

## Excel File Structure

### Sheet Organization
- **Sheet Name**: Used as the client's full name
- **Sheet Content**: Contains injuries and goals information
- **Cell Positions**: System automatically detects injuries and goals

### Data Extraction
The system looks for injuries and goals in these locations:
1. **Specific Cells**: B1, A2 (injuries), B2, A3 (goals)
2. **Label Search**: Searches for "injur" and "goal" keywords
3. **Adjacent Cells**: Checks cells to the right or below labels

### Example Sheet Structure
```
Sheet Name: "John Smith"

A1: Injuries    B1: Knee injury, lower back pain
A2: Goals       B2: Lose weight, build muscle
```

Or:
```
Sheet Name: "Sarah Johnson"

A1: Previous injuries:
A2: Knee surgery in 2022, shoulder impingement
A3: Goals:
A4: Improve flexibility, train for marathon
```

## How to Import

### Step 1: Prepare Your Excel File
1. Create one sheet per client
2. Name each sheet with the client's full name
3. Add injuries and goals information in the sheet
4. Save as `.xlsx` format

### Step 2: Use the Import Feature
1. Go to the **Clients** page
2. Click **"Import Multi-Sheet Excel"**
3. Select your Excel file
4. Wait for processing to complete

### Step 3: Review Results
The system will show:
- Number of clients imported
- Total sheets processed
- Any errors encountered
- List of imported client names

## File Size Handling

### Small Files (Under 4MB)
- Processed immediately
- All sheets imported in one request
- Real-time progress feedback

### Large Files (Over 4MB)
- Automatic chunked processing
- Processed in batches of 10 sheets
- Multiple requests for better reliability

### Many Sheets (Over 50)
- Batch processing recommended
- Prevents timeout errors
- Better memory management

## Common Issues and Solutions

### Issue: "No sheets found in Excel file"
**Cause**: File might be corrupted or not a valid Excel file
**Solution**: 
- Ensure file is `.xlsx` or `.xls` format
- Try opening the file in Excel to verify it's valid
- Re-save the file if necessary

### Issue: "Row Level Security" blocking imports
**Cause**: Database security policies preventing data insertion
**Solution**: Run the RLS fix script
```bash
node scripts/fix-rls-simple.js
```
Then execute the SQL in Supabase dashboard.

### Issue: Clients import but with "No goals specified"
**Cause**: System couldn't find goals in the expected locations
**Solution**: 
- Ensure goals are near the top of the sheet
- Use clear labels like "Goals:" or "Goal:"
- Place goals in cells B1, B2, A2, or A3

### Issue: Import partially succeeds
**Cause**: Some sheets might have issues or be empty
**Solution**: 
- Check the error details in the import results
- Verify problem sheets have proper content
- Skip template or instruction sheets (automatically ignored)

## Best Practices

### Sheet Naming
- Use client's full name as sheet name
- Avoid special characters that might cause issues
- Keep names descriptive and unique

### Content Organization
- Place most important information at the top
- Use clear labels ("Injuries:", "Goals:")
- Keep information concise and readable

### File Management
- Test with a small file first
- Back up your data before importing
- Use descriptive file names

## Advanced Features

### Automatic Sheet Filtering
The system automatically skips sheets with these names:
- "template"
- "example" 
- "instructions"

### Batch Processing
For files with many sheets:
- Processes 10 sheets at a time
- Adds delays to prevent system overload
- Continues processing even if some sheets fail

### Error Recovery
- Individual sheet errors don't stop the entire import
- Detailed error reporting for troubleshooting
- Partial imports are saved (successful clients are kept)

## Data Mapping

### Client Fields Created
- **Full Name**: From sheet name
- **Injuries**: Extracted from sheet content
- **Goals**: Extracted from sheet content
- **Email**: Set to null (not available in sheet format)
- **Phone**: Set to null (not available in sheet format)
- **Equipment**: Empty array
- **Notes**: "Imported from sheet: [sheet name]"

### Default Values
- Goals: "No goals specified" if not found
- Injuries: "No injuries reported" if not found
- User ID: "default-user"

## Troubleshooting Steps

### Before Importing
1. **Check File Format**: Ensure it's a valid Excel file
2. **Verify Content**: Open file and check sheet organization
3. **Test Database**: Use `/api/test-db` to verify connectivity

### If Import Fails
1. **Check RLS Status**: Run `node scripts/verify-rls-status.js`
2. **Fix RLS if Needed**: Run `node scripts/fix-rls-simple.js`
3. **Verify Environment**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
4. **Try Smaller File**: Test with fewer sheets first

### After Import Issues
1. **Check Import Results**: Review error messages carefully
2. **Verify Data**: Check clients page to see what was imported
3. **Fix Problem Sheets**: Adjust sheet content and re-import if needed

## API Endpoints

### Multi-Sheet Import
- **Endpoint**: `POST /api/clients/import-multi-sheet`
- **Content-Type**: `multipart/form-data`
- **Field**: `file` (Excel file)

### Chunked Import
- **Endpoint**: `POST /api/clients/import-multi-sheet?chunked=true&chunkIndex=0&totalChunks=5`
- **Content-Type**: `application/json`
- **Body**: `{ "clients": [...] }`

## Support

For additional help:
1. Check the **Troubleshooting Guide**
2. Verify your **environment setup**
3. Test with the provided **sample Excel files**
4. Review **error logs** in the browser console

The Excel import system is designed to handle various file formats and structures while providing clear feedback about the import process.