'use client'

import { useState } from 'react'
import { Star, MessageSquare, User, Users, Check, AlertCircle } from 'lucide-react'

interface WorkoutFeedbackProps {
  workoutId: string
  workoutTitle: string
  clientId?: string | null
  clientName?: string
  onFeedbackSubmitted?: () => void
}

export default function WorkoutFeedback({ 
  workoutId, 
  workoutTitle, 
  clientId, 
  clientName,
  onFeedbackSubmitted 
}: WorkoutFeedbackProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [feedbackScope, setFeedbackScope] = useState<'client' | 'general'>('client')
  const [category, setCategory] = useState<string>('general')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const categories = [
    { value: 'general', label: 'General', icon: '💭' },
    { value: 'difficulty', label: 'Difficulty', icon: '💪' },
    { value: 'exercises', label: 'Exercise Selection', icon: '🏋️' },
    { value: 'duration', label: 'Duration', icon: '⏱️' },
    { value: 'progression', label: 'Progression', icon: '📈' },
    { value: 'equipment', label: 'Equipment', icon: '🎯' }
  ]

  async function handleSubmit() {
    if (rating === 0) {
      setError('Please select a rating')
      return
    }
    
    if (!feedback.trim()) {
      setError('Please provide feedback')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: workoutId,
          workout_title: workoutTitle,
          rating,
          feedback,
          category,
          scope: feedbackScope,
          client_id: feedbackScope === 'client' ? clientId : null,
          client_name: feedbackScope === 'client' ? clientName : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setSubmitted(true)
      
      // Also send to learning endpoint for AI improvement
      await fetch('/api/feedback/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: workoutId,
          rating,
          feedback,
          category,
          scope: feedbackScope,
          client_id: feedbackScope === 'client' ? clientId : null
        })
      })

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mt-6 border border-gray-700">
        <div className="flex items-center space-x-3 text-green-400 mb-4">
          <Check className="w-6 h-6" />
          <div>
            <h3 className="text-lg font-semibold">Thank you for your feedback!</h3>
            <p className="text-gray-400 text-sm mt-1">
              Your feedback helps us create better workouts{' '}
              {feedbackScope === 'client' ? `for ${clientName || 'this client'}` : 'for everyone'}.
            </p>
          </div>
        </div>
        
        {/* Regenerate with Feedback Button */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-3">
            Want to see an improved version of this workout based on your feedback?
          </p>
          <button
            onClick={async () => {
              // Store feedback data in session storage for the regeneration
              sessionStorage.setItem('regenerate-with-feedback', JSON.stringify({
                workoutId,
                workoutTitle,
                clientId,
                clientName,
                rating,
                feedback,
                category,
                scope: feedbackScope
              }))
              // Navigate to builder with the feedback
              window.location.href = `/builder?regenerate=${workoutId}&client=${clientId || ''}`
            }}
            className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
          >
            🔄 Regenerate Workout with Feedback
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 mt-6 border border-gray-700">
      <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center">
        <MessageSquare className="w-5 h-5 mr-2 text-purple-400" />
        Workout Feedback
      </h3>

      {/* Rating */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          How was this workout?
        </label>
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-colors"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-600'
                }`}
              />
            </button>
          ))}
          <span className="text-gray-400 ml-3 self-center">
            {rating > 0 && (
              <span className="text-yellow-400 font-semibold">
                {rating === 1 && 'Too Easy'}
                {rating === 2 && 'Easy'}
                {rating === 3 && 'Just Right'}
                {rating === 4 && 'Challenging'}
                {rating === 5 && 'Too Hard'}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Feedback Scope */}
      {clientId && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Apply feedback to:
          </label>
          <div className="flex space-x-4">
            <button
              onClick={() => setFeedbackScope('client')}
              className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                feedbackScope === 'client'
                  ? 'bg-purple-900/30 border-purple-500 text-purple-300'
                  : 'border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              <User className="w-4 h-4 mr-2" />
              {clientName || 'This Client'} Only
            </button>
            <button
              onClick={() => setFeedbackScope('general')}
              className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                feedbackScope === 'general'
                  ? 'bg-purple-900/30 border-purple-500 text-purple-300'
                  : 'border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              All Workouts
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {feedbackScope === 'client' 
              ? `This feedback will only affect future workouts for ${clientName || 'this client'}`
              : 'This feedback will improve workouts for all clients'
            }
          </p>
        </div>
      )}

      {/* Category */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Feedback Category
        </label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                category === cat.value
                  ? 'bg-purple-900/30 border-purple-500 text-purple-300'
                  : 'border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Feedback */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Detailed Feedback
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={`Tell us what you ${rating <= 2 ? "didn't like" : rating >= 4 ? "liked" : "think"} about this workout. Be specific - this helps the AI create better workouts!`}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:border-purple-500 focus:outline-none resize-none"
          rows={4}
        />
        <p className="text-xs text-gray-500 mt-1">
          Examples: "Too many push exercises", "Perfect difficulty for my level", "Need more rest between sets"
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg flex items-center text-red-400">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0 || !feedback.trim()}
        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
          submitting || rating === 0 || !feedback.trim()
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-purple-600 text-white hover:bg-purple-700'
        }`}
      >
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </div>
  )
}