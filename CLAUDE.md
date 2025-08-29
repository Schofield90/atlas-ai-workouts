# Atlas AI Workouts - Claude Code Memory

## Project Overview
**Name**: Atlas AI Workouts (Unbranded Fitness Platform)
**Stack**: Next.js 15.5.0, React 19.1.0, TypeScript, Tailwind CSS 4, shadcn/ui, Supabase (Auth, DB, Storage), Anthropic Claude / OpenAI
**Architecture**: Multi-tenant SaaS with organization-based isolation and cloud-only storage

## Key Features
- **Personalized Workouts**: AI generates workouts based on client history, goals, injuries, equipment
- **SOPs & Context Management**: Coaches can add Standard Operating Procedures to train the AI on their methods
- **RAG System**: Uses pgvector for semantic search on client messages and history
- **Continuous Learning**: Feedback loop improves recommendations over time
- **Multi-Provider AI**: Supports both Anthropic Claude and OpenAI
- **Enhanced Excel Import**: Multi-sheet Excel import supporting up to 500 sheets per file
- **Dark Mode UI**: Modern dark theme throughout the application
- **Accessibility First**: Zero axe violations, keyboard navigation, semantic HTML
- **Export Options**: PDF, CSV, and shareable workout links
- **Cloud-Only Architecture**: Complete migration from localStorage to secure Supabase storage

## Routes
- `/login` - Magic link authentication (unbranded)
- `/dashboard` - Client list, recent workouts, quick actions with SOPs link
- `/clients` - Client management with Excel import capabilities
- `/clients/[id]` - Client profile, history, messages
- `/clients/new` - Add new client manually
- `/clients/bulk` - Excel import page with multi-sheet support
- `/builder` - Single-input AI workout generator
- `/workouts/[id]` - Editable workout with version history
- `/context` - **NEW**: SOPs & Context management for AI training
- `/feedback` - Rating and preference collection
- `/settings` - Gym branding, coach details, preferences

## Definition of Done
- Small PRs (<300 lines)
- Tests added (unit + e2e)
- Zero accessibility violations
- CI/CD passes
- Follows established patterns

## Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

## Development Commands
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm test                 # Run tests (placeholder)
npm run test:e2e         # Run Playwright tests
npm run test:a11y        # Run accessibility tests
npm run supabase:push    # Push database migrations
npm run supabase:seed    # Seed exercises database
```

## Design Principles
1. **Unbranded by Default**: No hardcoded gym names or branding
2. **Progressive Enhancement**: Works without JavaScript
3. **Mobile First**: Responsive design for all devices
4. **Privacy First**: Client data isolation with RLS
5. **Performance**: Sub-second response times
6. **Cloud-Only Security**: No local storage, all data in Supabase
7. **AI-Powered Intelligence**: Context-aware workout generation

## Latest Updates (August 29, 2025)

### New Features
- **SOPs & Context Management**: `/context` page allows coaches to add Standard Operating Procedures and training methods that the AI uses for workout generation
- **Enhanced Excel Import**: Increased capacity from 50 to 500 sheets per Excel file for large client databases
- **Dark Mode UI**: Complete dark theme implementation across all pages
- **Cloud Storage Migration**: Fully migrated from localStorage to Supabase cloud storage

### Technical Improvements
- **Next.js 15.5.0**: Latest Next.js with React 19.1.0
- **Tailwind CSS 4**: Updated to latest Tailwind version
- **RLS Security**: Enhanced Row Level Security policies and management tools
- **Performance Optimization**: Chunked processing for large Excel imports
- **Error Handling**: Improved error boundaries and user feedback

### API Updates
- `/api/context/extract` - Extract context from SOPs for AI processing
- `/api/clients/import-multi-sheet` - Enhanced multi-sheet Excel import with 500 sheet limit
- `/api/clients/import-chunked` - Chunked processing for large files (4MB+)
- `/api/feedback/learn` - AI learning from user feedback
- `/api/assistant/chat` - AI assistant chat interface