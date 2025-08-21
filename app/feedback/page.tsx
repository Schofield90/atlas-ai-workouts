'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/db/client'
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown,
  Zap,
  Target,
  Clock,
  MessageSquare,
  CheckCircle
} from 'lucide-react'

function FeedbackForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const workoutId = searchParams.get('workout')
  const initialRating = searchParams.get('rating')
  
  const [workout, setWorkout] = useState<any>(null)
  const [rating, setRating] = useState(initialRating === 'low' ? 2 : 4)
  const [intensityRating, setIntensityRating] = useState(5)
  const [volumeRating, setVolumeRating] = useState(5)
  const [duration, setDuration] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (workoutId) {
      loadWorkout()
    }
  }, [workoutId])

  async function loadWorkout() {
    const { data } = await supabase
      .from('workouts')
      .select('*, clients(full_name)')
      .eq('id', workoutId)
      .single()
    
    if (data) {
      setWorkout(data)
      setDuration(data.plan.total_time_minutes)
    }
  }

  async function submitFeedback() {
    if (!workout) return
    
    setSubmitting(true)
    
    try {
      // Submit feedback
      const { error: feedbackError } = await supabase
        .from('feedback')
        .insert({
          workout_id: workout.id,
          client_id: workout.client_id,
          rating,
          intensity_rating: intensityRating,
          volume_rating: volumeRating,
          duration_minutes: duration,
          notes,
          completed_at: new Date().toISOString(),
        })

      if (feedbackError) throw feedbackError

      // Update model preferences based on feedback
      await fetch('/api/feedback/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: workout.client_id,
          workoutId: workout.id,
          rating,
          intensityRating,
          volumeRating,
          notes,
        }),
      })

      setSubmitted(true)
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-gray-600">
            Your feedback helps us create better workouts for you.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/dashboard" className="text-gray-500 hover:text-gray-700 mr-4">
                ← Back
              </a>
              <h1 className="text-xl font-semibold">Workout Feedback</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {workout ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">{workout.title}</h2>
                <p className="text-gray-600">
                  For {workout.clients?.full_name}
                </p>
              </div>

              {/* Overall Rating */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Overall, how was this workout?
                </label>
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`h-10 w-10 ${
                          star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="text-center mt-2 text-sm text-gray-500">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Below Average'}
                  {rating === 3 && 'Average'}
                  {rating === 4 && 'Good'}
                  {rating === 5 && 'Excellent'}
                </div>
              </div>

              {/* Intensity Rating */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Zap className="h-4 w-4 inline mr-1" />
                  Intensity Level
                </label>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">Too Easy</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={intensityRating}
                    onChange={(e) => setIntensityRating(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500">Too Hard</span>
                </div>
                <div className="text-center mt-1 text-sm text-gray-600">
                  {intensityRating <= 3 && 'Could handle more intensity'}
                  {intensityRating >= 4 && intensityRating <= 6 && 'Just right'}
                  {intensityRating >= 7 && 'Too intense'}
                </div>
              </div>

              {/* Volume Rating */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Target className="h-4 w-4 inline mr-1" />
                  Exercise Volume
                </label>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">Too Little</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={volumeRating}
                    onChange={(e) => setVolumeRating(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500">Too Much</span>
                </div>
                <div className="text-center mt-1 text-sm text-gray-600">
                  {volumeRating <= 3 && 'Could do more exercises/sets'}
                  {volumeRating >= 4 && volumeRating <= 6 && 'Perfect amount'}
                  {volumeRating >= 7 && 'Too many exercises/sets'}
                </div>
              </div>

              {/* Duration */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Actual Duration (minutes)
                </label>
                <input
                  type="number"
                  value={duration || ''}
                  onChange={(e) => setDuration(parseInt(e.target.value) || null)}
                  placeholder="How long did it take?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="h-4 w-4 inline mr-1" />
                  Additional Comments (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What worked well? What could be improved? Any exercises you particularly liked or disliked?"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={submitFeedback}
                disabled={submitting}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Your feedback helps our AI create better workouts tailored to your preferences
              </p>
            </>
          ) : workoutId ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading workout...</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold mb-4">Rate Your Recent Workouts</h2>
              <p className="text-gray-600 mb-6">
                Select a workout from your history to provide feedback
              </p>
              <a
                href="/dashboard"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Dashboard
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <FeedbackForm />
    </Suspense>
  )
}