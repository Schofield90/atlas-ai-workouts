# Atlas AI Workouts

A fully personalized gym workout generator powered by AI that learns continuously from client feedback. Built with Next.js, Supabase, and AI providers (Anthropic Claude / OpenAI).

## Features

- 🤖 **AI-Powered Workouts**: Generate personalized workouts based on client history, goals, injuries, and equipment
- 📚 **RAG System**: Semantic search through client messages and history for context-aware recommendations
- 🔄 **Continuous Learning**: Feedback loop improves recommendations over time
- 🏢 **Multi-Tenant**: Complete organization isolation with row-level security
- 📊 **Excel Import**: Import clients from Excel files with multiple sheets
- ♿ **Accessibility First**: Zero axe violations, keyboard navigation, semantic HTML
- 📤 **Export Options**: PDF, CSV, and shareable workout links
- 🎨 **Unbranded**: Fully customizable branding for your gym or coaching business
- ☁️ **Cloud-Only**: Secure Supabase storage with no localStorage dependency

## Recent Updates (August 29, 2025)

### Major Changes
- **Complete Migration**: Moved from localStorage to cloud-only storage
- **Enhanced Excel Import**: Multi-sheet Excel import with automatic client detection
- **Security Improvements**: All credentials now in environment variables
- **RLS Management**: Tools for managing Row Level Security policies
- **Performance Optimizations**: Chunked processing for large files

### Breaking Changes
- localStorage support completely removed
- Environment variables now required for all functionality
- Database permissions may need adjustment (see [RLS Fix Instructions](RLS_FIX_INSTRUCTIONS.md))

## Documentation

### Setup and Migration
- 📋 [Quick Start Guide](QUICK_START_GUIDE.md) - Get up and running in minutes
- 🔄 [Migration Guide](MIGRATION_GUIDE.md) - localStorage to cloud migration details
- 🛠️ [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions

### Features and Usage  
- 📊 [Excel Import Guide](EXCEL_IMPORT_GUIDE.md) - Detailed import instructions
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
