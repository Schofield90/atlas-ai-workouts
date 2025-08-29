# Atlas AI Workouts

A fully personalized gym workout generator powered by AI that learns continuously from client feedback. Built with Next.js, Supabase, and AI providers (Anthropic Claude / OpenAI).

## Features

- 🤖 **AI-Powered Workouts**: Generate personalized workouts based on client history, goals, injuries, and equipment
- 📋 **SOPs & Context Management**: Train the AI with your Standard Operating Procedures and coaching methodology
- 📚 **RAG System**: Semantic search through client messages and history for context-aware recommendations
- 🔄 **Continuous Learning**: Feedback loop improves recommendations over time
- 🏢 **Multi-Tenant**: Complete organization isolation with row-level security
- 📊 **Enhanced Excel Import**: Import up to 500 clients from multi-sheet Excel files
- 🎨 **Modern Dark UI**: Complete dark mode with improved accessibility and contrast
- ♿ **Accessibility First**: Zero axe violations, keyboard navigation, semantic HTML
- 📤 **Export Options**: PDF, CSV, and shareable workout links
- 🎯 **Unbranded**: Fully customizable branding for your gym or coaching business
- ☁️ **Cloud-Only**: Secure Supabase storage with no localStorage dependency

## Recent Updates (August 29, 2025)

### New Features ✨
- **SOPs & Context Management**: New `/context` page for documenting your training methodology and procedures
- **10x Excel Import Capacity**: Increased from 50 to 500 sheets per Excel file for large client databases
- **Complete Dark Mode**: Modern dark theme across all pages with improved contrast and accessibility
- **AI Training Integration**: SOPs automatically feed into AI workout generation for consistent methodology

### Major Changes 🔄
- **Complete Migration**: Moved from localStorage to cloud-only storage
- **Enhanced Excel Import**: Multi-sheet Excel import with automatic client detection and chunked processing
- **Security Improvements**: All credentials now in environment variables
- **RLS Management**: Tools for managing Row Level Security policies
- **Performance Optimizations**: Better memory management and error handling

### Bug Fixes 🐛
- **UUID Error Fix**: Resolved database insertion issues in Excel import
- **UI Improvements**: Fixed duplicate className warnings and React issues
- **RLS Compatibility**: Enhanced Row Level Security handling for imports

### Breaking Changes ⚠️
- localStorage support completely removed
- Environment variables now required for all functionality
- Database permissions may need adjustment (see [RLS Fix Instructions](RLS_FIX_INSTRUCTIONS.md))

## Documentation

### Setup and Migration
- 📋 [Quick Start Guide](QUICK_START_GUIDE.md) - Get up and running in minutes
- 🔄 [Migration Guide](MIGRATION_GUIDE.md) - localStorage to cloud migration details
- 🛠️ [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions

### Features and Usage  
- 📋 [SOPs & Context Feature Guide](SOPS_CONTEXT_FEATURE.md) - Complete guide to AI training with SOPs
- 📊 [Excel Import Guide](EXCEL_IMPORT_GUIDE.md) - Enhanced import instructions (up to 500 sheets)
- 🔒 [Security Updates](SECURITY_UPDATES.md) - RLS configuration and credentials
- 🔌 [API Documentation](API_DOCUMENTATION.md) - Complete API reference

### Project Information
- 📝 [Changelog](CHANGELOG.md) - Recent changes and version history
- 🔧 [RLS Fix Instructions](RLS_FIX_INSTRUCTIONS.md) - Database permission fixes

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/atlas-ai-workouts.git
cd atlas-ai-workouts
npm install
```

### 2. Set Up Supabase

Create a new Supabase project and run the migration:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

### 3. Configure Environment

Copy `.env.example` to `.env.local` and add your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

## License

MIT
