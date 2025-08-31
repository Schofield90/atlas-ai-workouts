'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, ThumbsUp, ThumbsDown, MessageCircle, X } from 'lucide-react'

interface FeedbackChatProps {
  workoutId: string
  workoutTitle: string
  clientName?: string
  onClose?: () => void
}

export default function FeedbackChat({ workoutId, workoutTitle, clientName, onClose }: FeedbackChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{
    type: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>>([])
  const [input, setInput] = useState('')
  const [rating, setRating] = useState<'good' | 'bad' | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load existing feedback for this workout
    const savedFeedback = localStorage.getItem(`workout-feedback-${workoutId}`)
    if (savedFeedback) {
      const parsed = JSON.parse(savedFeedback)
      setMessages(parsed.messages || [])
      setRating(parsed.rating || null)
    } else {
      // Initial message
      setMessages([{
        type: 'assistant',
        content: `How was the "${workoutTitle}" workout${clientName ? ` for ${clientName}` : ''}? I'd love to hear your feedback!`,
        timestamp: new Date()
      }])
    }
  }, [workoutId, workoutTitle, clientName])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const saveFeedback = (newMessages: typeof messages, newRating: typeof rating) => {
    const feedbackData = {
      workoutId,
      workoutTitle,
      clientName,
      rating: newRating,
      messages: newMessages,
      lastUpdated: new Date().toISOString()
    }
    
    // Save to localStorage
    localStorage.setItem(`workout-feedback-${workoutId}`, JSON.stringify(feedbackData))
    
    // Save to global feedback list
    const allFeedback = JSON.parse(localStorage.getItem('all-workout-feedback') || '[]')
    const existingIndex = allFeedback.findIndex((f: any) => f.workoutId === workoutId)
    
    if (existingIndex >= 0) {
      allFeedback[existingIndex] = feedbackData
    } else {
      allFeedback.push(feedbackData)
    }
    
    localStorage.setItem('all-workout-feedback', JSON.stringify(allFeedback))
    
    // TODO: Send to API for persistence
    // fetch('/api/feedback', { method: 'POST', body: JSON.stringify(feedbackData) })
  }

  const handleRating = (newRating: 'good' | 'bad') => {
    setRating(newRating)
    
    const ratingMessage = {
      type: 'user' as const,
      content: newRating === 'good' ? '👍 This workout was great!' : '👎 This workout needs improvement',
      timestamp: new Date()
    }
    
    const followUpMessage = {
      type: 'assistant' as const,
      content: newRating === 'good' 
        ? 'Excellent! What specifically worked well? Any exercises you particularly enjoyed?'
        : 'Thanks for the feedback. What could be improved? Were any exercises too difficult or not suitable?',
      timestamp: new Date()
    }
    
    const newMessages = [...messages, ratingMessage, followUpMessage]
    setMessages(newMessages)
    saveFeedback(newMessages, newRating)
  }

  const handleSend = () => {
    if (!input.trim()) return
    
    const userMessage = {
      type: 'user' as const,
      content: input,
      timestamp: new Date()
    }
    
    // Determine assistant response based on content
    let assistantResponse = 'Thank you for your feedback! '
    
    if (input.toLowerCase().includes('hard') || input.toLowerCase().includes('difficult')) {
      assistantResponse += "I'll note that the intensity was too high. Would you prefer shorter sets or lighter weights next time?"
    } else if (input.toLowerCase().includes('easy') || input.toLowerCase().includes('simple')) {
      assistantResponse += "I'll increase the challenge next time. Would you like more reps, heavier weights, or more complex movements?"
    } else if (input.toLowerCase().includes('pain') || input.toLowerCase().includes('hurt')) {
      assistantResponse += "I'm sorry to hear that. Which exercise caused discomfort? I'll make sure to avoid it in future workouts."
    } else if (input.toLowerCase().includes('love') || input.toLowerCase().includes('great') || input.toLowerCase().includes('perfect')) {
      assistantResponse += "Wonderful! I'll create more workouts like this. Anything specific you'd like to see more of?"
    } else {
      assistantResponse += "I've noted your comments. Is there anything else about the workout you'd like to share?"
    }
    
    const assistantMessage = {
      type: 'assistant' as const,
      content: assistantResponse,
      timestamp: new Date()
    }
    
    const newMessages = [...messages, userMessage, assistantMessage]
    setMessages(newMessages)
    saveFeedback(newMessages, rating)
    setInput('')
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-all z-50"
        >
          <MessageCircle className="h-6 w-6" />
          {rating && (
            <span className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
              {rating === 'good' ? '👍' : '👎'}
            </span>
          )}
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50 border border-gray-700">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-100">Workout Feedback</h3>
              <p className="text-xs text-gray-400">{workoutTitle}</p>
            </div>
            <button
              onClick={() => {
                setIsOpen(false)
                onClose?.()
              }}
              className="text-gray-400 hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-100'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick rating buttons */}
          {!rating && (
            <div className="p-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-2">Quick rating:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRating('good')}
                  className="flex-1 py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Good
                </button>
                <button
                  onClick={() => handleRating('bad')}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <ThumbsDown className="h-4 w-4" />
                  Needs Work
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your feedback..."
                className="flex-1 px-3 py-2 bg-gray-700 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}