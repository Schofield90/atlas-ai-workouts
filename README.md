# AI Workout Generator

A fully personalized gym workout generator powered by AI that learns continuously from client feedback. Built with Next.js, Supabase, and AI providers (Anthropic Claude / OpenAI).

## Features

- 🤖 **AI-Powered Workouts**: Generate personalized workouts based on client history, goals, injuries, and equipment
- 📚 **RAG System**: Semantic search through client messages and history for context-aware recommendations
- 🔄 **Continuous Learning**: Feedback loop improves recommendations over time
- 🏢 **Multi-Tenant**: Complete organization isolation with row-level security
- ♿ **Accessibility First**: Zero axe violations, keyboard navigation, semantic HTML
- 📤 **Export Options**: PDF, CSV, and shareable workout links
- 🎨 **Unbranded**: Fully customizable branding for your gym or coaching business

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
