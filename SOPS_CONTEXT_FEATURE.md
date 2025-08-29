# SOPs & Context Management Feature

## Overview

The SOPs (Standard Operating Procedures) & Context feature is a powerful AI training system that allows fitness coaches to document their methodologies, protocols, and training philosophies. The AI uses this context when generating personalized workouts, ensuring consistency with the coach's approach and expertise.

## Key Features

### 1. Multi-Category Organization
SOPs are organized into four main categories:
- **Training Protocols**: Exercise progressions, workout structures, intensity guidelines
- **Nutrition Guidelines**: Dietary approaches, supplement protocols, meal timing
- **Assessment Methods**: Client evaluation criteria, progress tracking, benchmarking
- **General**: Facility rules, client communication, administrative procedures

### 2. AI-Powered Integration
- All SOPs are automatically fed to the AI during workout generation
- Context-aware recommendations based on documented protocols
- Consistent application of coaching philosophy across all AI interactions
- Personalized workout generation respecting documented constraints and preferences

### 3. Visual Management Interface
- Color-coded categories for easy identification
- Intuitive add/edit/delete functionality  
- Real-time feedback and status messages
- Responsive dark mode design
- Prominent dashboard integration with purple border highlighting

## Technical Architecture

### Frontend Components
- **Page Location**: `/app/context/page.tsx`
- **Route**: `/context`
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with dark mode support
- **Icons**: Lucide React icon library

### Data Structure
```typescript
interface SOP {
  id: string
  title: string
  content: string
  category: 'training' | 'nutrition' | 'assessment' | 'general'
  createdAt: string
}
```

### Storage Implementation
- **Current**: localStorage for rapid prototyping and testing
- **Future**: Migration planned to Supabase for cloud persistence
- **Key**: 'workout-sops' in localStorage
- **Format**: JSON serialized array of SOP objects

### API Integration
- **Context Extraction**: `/api/context/extract` endpoint
- **AI Processing**: SOPs are injected into AI prompts for workout generation
- **Real-time Updates**: Changes immediately available to AI system

## Usage Instructions

### Accessing the Feature
1. Navigate to the main dashboard at `/dashboard`
2. Locate the "SOPs & Context" card (highlighted with purple border)
3. Click to access the SOPs management page at `/context`

### Adding New SOPs
1. Use the "Add New SOP" form at the top of the page
2. Enter a descriptive title (e.g., "Beginner Assessment Protocol")
3. Select appropriate category from dropdown
4. Write detailed content describing your methodology
5. Click "Save SOP" to store the procedure

### Managing Existing SOPs
- **View**: All SOPs are displayed in cards below the form
- **Categories**: Color-coded badges indicate category type
- **Delete**: Use trash icon to remove unwanted SOPs (with confirmation)
- **Timestamps**: Creation date displayed for each SOP

### Best Practices for SOP Content

#### Training Protocols
```
Example Title: "Beginner Strength Training Progression"
Content: 
- Start with bodyweight movements for 2-3 weeks
- Progress to light weights (50% 1RM) focusing on form
- Increase load by 5-10% weekly when client can complete all reps with perfect form
- Always include 5-10 minute warm-up with dynamic movements
- Cool down with 5 minutes static stretching
```

#### Assessment Methods  
```
Example Title: "Initial Client Assessment Checklist"
Content:
- Movement screen: overhead squat, single leg balance, push-up form
- Cardiovascular baseline: 3-minute step test or walk test
- Flexibility assessment: sit-and-reach, shoulder mobility
- Goal setting interview: specific, measurable objectives
- Injury history documentation and contraindications
```

#### Nutrition Guidelines
```
Example Title: "Post-Workout Nutrition Protocol"
Content:
- Consume protein within 30 minutes of training (20-30g)
- Include simple carbohydrates for glycogen replenishment
- Hydration: 16-24oz water per hour of training
- Avoid high-fat foods immediately post-workout
- Full meal within 2 hours containing complex carbs and lean protein
```

## AI Integration Details

### How SOPs Influence AI Behavior
1. **Context Injection**: All SOPs are automatically included in AI prompts
2. **Methodology Consistency**: AI follows documented protocols when making recommendations
3. **Personalization Enhancement**: Client-specific modifications respect SOP constraints
4. **Progressive Application**: AI applies documented progressions and regressions

### Prompt Engineering
The AI system automatically formats SOPs into contextual prompts:
```
Based on these Standard Operating Procedures:

Training Protocols:
- [SOP Title]: [SOP Content]

Assessment Methods:
- [SOP Title]: [SOP Content]

Generate a workout that follows these established protocols...
```

### Quality Improvement Tips
- **Be Specific**: Include exact sets, reps, weights, and timing
- **Include Progressions**: Document how to advance or regress exercises
- **Note Contraindications**: Specify when NOT to use certain approaches
- **Add Context**: Explain the "why" behind your methods
- **Update Regularly**: Keep SOPs current with your evolving methodology

## Dashboard Integration

### Prominent Placement
- Located in the quick actions grid on the dashboard
- Distinguished with purple border styling
- Brain icon for easy visual identification
- Labeled "SOPs & Context" with semibold font weight

### Visual Design
```tsx
<Link
  href="/context"
  className="p-4 bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow text-center border-2 border-purple-600"
>
  <Brain className="w-6 h-6 text-purple-500 mx-auto mb-2" />
  <span className="text-sm text-gray-300 font-semibold">SOPs & Context</span>
</Link>
```

## Future Enhancements

### Planned Features
1. **Supabase Migration**: Move from localStorage to cloud storage
2. **Team Collaboration**: Multiple coaches contributing to SOPs
3. **Version Control**: Track changes and maintain SOP history
4. **Template Library**: Pre-built SOP templates for common scenarios
5. **Export/Import**: Share SOPs between installations
6. **Analytics**: Track which SOPs are most effective

### Technical Improvements
1. **Rich Text Editor**: Enhanced formatting capabilities
2. **File Attachments**: Include images, videos, and documents
3. **Search Functionality**: Quick find across all SOPs
4. **Categorization**: Custom category creation
5. **Approval Workflow**: Review process for team environments

## Troubleshooting

### Common Issues

#### SOPs Not Appearing in AI Generation
- **Check Storage**: Verify SOPs are saved in browser localStorage
- **Clear Cache**: Refresh page and check if SOPs reload
- **Validation**: Ensure SOPs have both title and content

#### Performance Issues with Many SOPs
- **Limit Reached**: Consider archiving unused SOPs
- **Content Length**: Very long SOPs may slow AI processing
- **Browser Storage**: localStorage has size limits (typically 5-10MB)

### Error Messages
- **"Please fill in both title and content"**: Both fields are required
- **SOP deletion confirmation**: Prevents accidental removal
- **Auto-save feedback**: Confirms successful storage

## Migration Considerations

### From localStorage to Supabase
When the planned migration occurs:
1. **Data Preservation**: All existing SOPs will be migrated
2. **Enhanced Features**: Cloud sync, team collaboration
3. **Backup Recommended**: Export current SOPs before migration
4. **No Downtime**: Migration will be seamless for users

### Database Schema (Planned)
```sql
CREATE TABLE sops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('training', 'nutrition', 'assessment', 'general')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Success Metrics

### User Engagement
- Number of SOPs created per coach
- Frequency of SOP updates and modifications
- Time spent on SOPs management page

### AI Improvement  
- Workout generation consistency with documented protocols
- User satisfaction with AI-generated recommendations
- Reduced manual modifications to AI suggestions

### Business Impact
- Improved client outcomes through consistent methodology
- Reduced onboarding time for new coaches
- Enhanced coaching quality and standardization

---

*This feature represents a significant advancement in AI-powered fitness coaching, enabling coaches to scale their expertise while maintaining their unique methodology and approach.*