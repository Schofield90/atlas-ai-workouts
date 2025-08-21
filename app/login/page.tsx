'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/db/client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Check auth state
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      router.push('/dashboard')
    }
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Your Workout Platform
          </h1>
          <p className="text-gray-600">
            Sign in to create personalized AI-powered workouts
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-lg p-8">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#3b82f6',
                    brandAccent: '#2563eb',
                  },
                },
              },
              className: {
                container: 'auth-container',
                button: 'auth-button',
                input: 'auth-input',
              },
            }}
            providers={[]}
            redirectTo={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
            magicLink={true}
            showLinks={false}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email',
                  email_input_placeholder: 'your@email.com',
                  button_label: 'Send Magic Link',
                  loading_button_label: 'Sending Magic Link...',
                  link_text: '',
                },
                magic_link: {
                  button_label: 'Send Magic Link',
                  loading_button_label: 'Sending Magic Link...',
                  link_text: 'Send a magic link email',
                  confirmation_text: 'Check your email for the magic link',
                },
              },
            }}
          />
        </div>

        <div className="text-center text-sm text-gray-600">
          <p>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}