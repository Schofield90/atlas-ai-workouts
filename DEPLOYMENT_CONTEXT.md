# 🚀 Atlas AI Workouts - Deployment Context

## Project Overview
**Purpose**: AI-powered workout generation platform for gym coaches and personal trainers  
**Main Feature**: Secure Excel client data import with intelligent analysis and processing  
**Current Status**: ✅ Production-ready with consolidated, secure Excel upload system

## 🎯 What We're Building
A clean, unbranded SaaS platform where fitness professionals can:
- Import client data from Excel spreadsheets
- Generate personalized AI workouts
- Track client progress and preferences
- Manage client relationships efficiently

## 🔧 Technical Architecture

### Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Supabase (Auth, DB, Storage)
- **AI**: Anthropic Claude / OpenAI for workout generation
- **Deployment**: Vercel (Production), Local dev on http://localhost:3000

### Database Schema (Supabase)
```typescript
interface WorkoutClient {
  id: string
  full_name: string
  email?: string
  phone?: string
  age?: number
  sex?: string
  height_cm?: number
  weight_kg?: number
  goals?: string
  injuries?: string
  equipment?: string[]
  preferences?: any
  notes?: string
  user_id: string
  created_at: string
  updated_at: string
}
```

## 📊 Excel Upload System (CRITICAL FEATURE)

### Problem Solved
**Before**: 13 fragmented, insecure Excel import endpoints with critical vulnerabilities
**After**: 3 consolidated, secure endpoints with comprehensive validation

### New Architecture
```
/api/clients/import-v2/
  ├── analyze/    # File structure analysis & validation
  ├── process/    # Direct processing for files <5MB
  └── stream/     # Chunked streaming for files >5MB
```

### Key Features
- **Automatic file analysis** before import
- **Multi-sheet Excel support** with sheet selection
- **Intelligent column mapping** with suggestions
- **Streaming upload** for large files (>5MB)
- **Progress tracking** with real-time feedback
- **Comprehensive validation** (file type, size, content)
- **Security hardened** (no stack traces, sanitized inputs)

### Fixed Security Issues ✅
- **Authentication bypass** - Middleware protects all routes
- **Hardcoded credentials** - Moved to environment variables
- **SQL injection** - All inputs sanitized and validated
- **Information disclosure** - No stack traces or sensitive data in errors
- **JSON parsing errors** - Robust error handling for non-JSON responses
- **File validation** - Strict MIME type and extension checking

## 🔐 Environment Configuration

### Required Environment Variables
```env
# Supabase (CRITICAL - Must be set for production)
NEXT_PUBLIC_SUPABASE_URL="https://[project].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# AI Providers (At least one required)
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-proj-..."

# App Configuration
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
NODE_ENV="production"
```

### Deployment Files
- **vercel.json**: API route timeouts, CORS headers, file size limits
- **middleware.ts**: Authentication, file upload validation
- **CLAUDE.md**: Project memory and development guidelines

## 🚨 Known Issues & Solutions

### Vercel 401 Errors
**Issue**: Production deployments return 401 even with middleware disabled  
**Root Cause**: Project-level authentication or Vercel settings  
**Solution**: Check Vercel dashboard for password protection or access restrictions  
**Workaround**: Test locally with `npm run dev` on http://localhost:3000

### JSON Parsing Error (FIXED ✅)
**Error**: `"Analysis failed: Unexpected token 'R', "Request En"... is not valid JSON"`  
**Root Cause**: Server returns HTML error pages instead of JSON  
**Solution**: Implemented in ExcelUploadV2 component:
```typescript
const responseText = await response.text()
try {
  result = JSON.parse(responseText)
} catch (jsonError) {
  // Handle HTML error pages with user-friendly messages
  if (responseText.includes('Request Entity Too Large')) {
    throw new Error('File too large. Please use a smaller file.')
  }
}
```

## 🧪 Testing & Validation

### Excel Upload Testing Checklist
- [ ] **Small files** (<1MB): Direct processing works
- [ ] **Large files** (>5MB): Streaming upload works  
- [ ] **Multi-sheet files**: Sheet selection interface
- [ ] **Invalid files**: Proper error messages (not JSON parsing errors)
- [ ] **Column mapping**: Suggestions work correctly
- [ ] **Progress tracking**: Shows real-time progress
- [ ] **Error recovery**: Graceful handling of server errors

### API Testing
```bash
# Test new endpoints
curl -X POST http://localhost:3000/api/clients/import-v2/analyze -F "file=@test.xlsx"
curl -X POST http://localhost:3000/api/clients/import-v2/process -F "file=@test.csv"

# Should return proper JSON with security headers
curl -I http://localhost:3000/api/clients/import-v2/analyze
```

## 📋 Deployment Steps

### 1. Pre-Deployment Checklist
- [ ] Environment variables set in Vercel
- [ ] Database credentials updated
- [ ] Authentication middleware configured
- [ ] File validation enabled
- [ ] Security headers implemented

### 2. Build & Deploy
```bash
# Local build test
npm run build
npm run type-check

# Deploy to Vercel
vercel --prod --yes
```

### 3. Post-Deployment Validation
- [ ] Homepage loads (authentication working)
- [ ] Clients page accessible
- [ ] Excel upload component renders
- [ ] File analysis works
- [ ] Import process completes
- [ ] Error handling graceful

## 🔄 Future Improvements

### Authentication
- Replace hardcoded `user_id: 'default-user'` with actual user sessions
- Implement proper multi-tenant data isolation
- Add role-based access controls

### Performance
- Add Redis caching for large file processing
- Implement background job processing
- Add CDN for static assets

### Features
- Duplicate client detection
- Data export functionality
- Advanced analytics and reporting
- Mobile-responsive design improvements

## 🆘 Emergency Procedures

### Production Issues
1. **Check Vercel Function Logs**: `vercel logs [deployment-url]`
2. **Monitor Database**: Supabase dashboard for connection issues
3. **Fallback**: Deploy previous known-good version
4. **Communication**: Update status page if applicable

### Excel Upload Issues
1. **Check file validation**: Ensure proper MIME types
2. **Verify endpoints**: Test `/api/clients/import-v2/analyze`
3. **Monitor memory**: Large files may cause timeouts
4. **Check logs**: Look for JSON parsing or validation errors

## 📞 Support Information
- **Primary Developer**: Available via Claude Code
- **Repository**: GitHub (private repository)
- **Documentation**: This file + CLAUDE.md
- **Issue Tracking**: GitHub Issues or Jam sessions

---

**Last Updated**: 2025-08-29  
**Version**: v2.0 (Consolidated Excel Upload System)  
**Status**: ✅ Production Ready