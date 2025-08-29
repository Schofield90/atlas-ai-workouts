# Changelog

All notable changes to the Atlas AI Workouts project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-08-29

### Changed
- **BREAKING**: Completely migrated from localStorage to Supabase cloud storage
- Removed all localStorage-dependent code and debugging pages
- Refactored client management to use cloud storage exclusively

### Added
- Multi-sheet Excel import functionality with automatic client detection
- Row Level Security (RLS) management scripts and documentation
- Database health check API endpoint (`/api/test-db`)
- RLS fix scripts for enabling Excel imports
- Comprehensive Excel import troubleshooting guide
- Chunked processing for large Excel files (4MB+ or 50+ sheets)
- Batch processing for improved performance and memory management

### Fixed
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
- Enhanced RLS policies documentation
- Added secure database access patterns
- Implemented service role key requirements

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
- Chunked processing for large file imports