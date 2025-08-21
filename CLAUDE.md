# AI Workout Generator - Claude Code Memory

## Project Overview
**Name**: AI Workout Generator (Unbranded)
**Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase (Auth, DB, Storage, Edge Functions), Anthropic Claude / OpenAI
**Architecture**: Multi-tenant SaaS with organization-based isolation

## Key Features
- **Personalized Workouts**: AI generates workouts based on client history, goals, injuries, equipment
- **RAG System**: Uses pgvector for semantic search on client messages and history
- **Continuous Learning**: Feedback loop improves recommendations over time
- **Multi-Provider AI**: Supports both Anthropic Claude and OpenAI
- **Accessibility First**: Zero axe violations, keyboard navigation, semantic HTML
- **Export Options**: PDF, CSV, and shareable links

## Routes
- `/login` - Magic link authentication (unbranded)
- `/dashboard` - Client list, recent workouts, quick actions
- `/clients/[id]` - Client profile, history, messages
- `/builder` - Single-input workout generator
- `/workouts/[id]` - Editable workout with version history
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
npm run dev          # Start development server
npm run build        # Build for production
npm test            # Run tests
npm run test:e2e    # Run Playwright tests
npm run test:a11y   # Run accessibility tests
```

## Design Principles
1. **Unbranded by Default**: No hardcoded gym names or branding
2. **Progressive Enhancement**: Works without JavaScript
3. **Mobile First**: Responsive design for all devices
4. **Privacy First**: Client data isolation with RLS
5. **Performance**: Sub-second response times