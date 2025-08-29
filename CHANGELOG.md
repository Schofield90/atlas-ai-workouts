# Changelog

All notable changes to the Atlas AI Workouts project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-08-29

### Added
- **SOPs & Context Management**: New `/context` page for adding Standard Operating Procedures and training methods
- **Enhanced Excel Import**: Increased sheet limit from 50 to 500 sheets per Excel file (commit 1a71433)
- **Dark Mode UI**: Complete dark theme implementation across the entire application (commit a4773fe)
- **AI Context Integration**: SOPs are used by AI when generating workouts and recommendations
- **Prominent Dashboard Link**: Easy access to SOPs & Context from main dashboard
- **Multi-category SOPs**: Support for training, nutrition, assessment, and general categories
- **Context Extraction API**: `/api/context/extract` endpoint for processing SOP data
- **AI Assistant Chat**: New `/api/assistant/chat` endpoint for conversational AI
- **Feedback Learning**: `/api/feedback/learn` endpoint for AI improvement from user feedback

### Changed
- **BREAKING**: Completely migrated from localStorage to Supabase cloud storage
- **Excel Import Capacity**: Increased MAX_SHEETS_PER_REQUEST from 50 to 500 sheets
- **UI/UX Overhaul**: Modern dark theme with improved contrast and accessibility
- **Dashboard Enhancement**: Added prominent SOPs & Context link with purple border highlight
- **Client Management**: Enhanced client pages with better dark mode support
- Removed all localStorage-dependent code and debugging pages
- Refactored client management to use cloud storage exclusively

### Fixed
- **UUID Error in Excel Import**: Removed invalid 'default-user' string causing database errors (commit a4773fe)
- **Duplicate className**: Fixed React warning in clients page (commit bd4b163)
- **RLS Policies**: Enhanced Row Level Security to handle missing tables safely (commit a871c9d)
- Database insert issues caused by RLS policies blocking imports
- Excel import now properly extracts client data from sheet tabs
- Improved error handling and user feedback during imports
- Memory optimization for processing large Excel files

### Removed
- All localStorage storage pages and utilities
- Debug pages for local storage management
- Sync functionality for localStorage to cloud migration
- Legacy backup/restore functionality

### Security
- Moved all credentials to environment variables
- Enhanced RLS policies documentation with safe table handling
- Added secure database access patterns
- Implemented service role key requirements
- Comprehensive RLS fix scripts and verification tools

## Migration Impact

### For Existing Users
- **Data Safety**: All existing data in Supabase remains intact
- **No Action Required**: Cloud data continues to work normally
- **Enhanced Performance**: Faster data access with cloud-only architecture

### For Developers
- **Environment Setup Required**: Must configure `.env.local` with proper credentials
- **RLS Management**: May need to run RLS fix scripts for import functionality
- **Testing Required**: Excel import features need database access to function

## Technical Details

### Architecture Changes
- Eliminated dual storage system complexity
- Streamlined data flow to single source of truth (Supabase)
- Improved error handling and user experience
- Added robust Excel processing with multiple sheet support

### Database Requirements
- PostgreSQL via Supabase with proper RLS configuration
- Service role key for administrative operations
- Proper table permissions for import functionality

### Performance Improvements
- Reduced bundle size by removing localStorage utilities
- Faster page loads without storage synchronization
- Optimized database queries for client management
- Chunked processing for large file imports (up to 500 sheets)
- Improved memory management for large Excel file processing

## New Feature Details

### SOPs & Context Management System
The new `/context` page introduces a comprehensive Standard Operating Procedures management system:

#### Features
- **Multi-Category Support**: Organize SOPs by Training, Nutrition, Assessment, or General categories
- **AI Integration**: All SOPs are automatically used by the AI when generating workouts
- **Rich Text Storage**: Detailed SOP content with full context preservation  
- **Visual Categories**: Color-coded categories with distinct UI styling
- **Easy Management**: Add, edit, and delete SOPs with simple interface
- **Dashboard Integration**: Prominent link from dashboard with purple border highlighting

#### Technical Implementation
- **Storage**: Currently uses localStorage for rapid prototyping (will migrate to Supabase)
- **Context Extraction**: `/api/context/extract` endpoint processes SOP data for AI consumption
- **AI Integration**: SOPs are injected into workout generation prompts for context-aware recommendations
- **Categories**: Enumerated types for consistent categorization (training, nutrition, assessment, general)

#### Usage Instructions
1. Navigate to `/context` from the dashboard
2. Add SOPs using the form with title, category, and detailed content
3. SOPs are automatically available to the AI for workout generation
4. Manage existing SOPs with edit/delete functionality
5. Use tips section for guidance on writing effective SOPs

### Enhanced Excel Import System
Major improvements to Excel import capabilities:

#### Capacity Increases  
- **Sheet Limit**: Increased from 50 to 500 sheets per Excel file
- **File Size**: Support for files up to 4MB with automatic chunking for larger files
- **Client Detection**: Automatic client detection from sheet tab names
- **Batch Processing**: Process 10 sheets at a time for optimal performance

#### Technical Improvements
- **Chunked Processing**: Automatic file chunking for files over 4MB
- **Memory Optimization**: Improved memory management for large file processing
- **Error Handling**: Enhanced error messages and recovery mechanisms
- **Progress Tracking**: Better user feedback during import process

### UI/UX Enhancements
- **Complete Dark Mode**: Modern dark theme across all pages and components
- **Improved Contrast**: Enhanced accessibility with better color contrast ratios
- **Component Updates**: All UI components updated for dark mode compatibility
- **Consistent Theming**: Unified color palette and styling throughout application