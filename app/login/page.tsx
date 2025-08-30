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
  supabase.auth.onAuthStateChange((event: any, session: any) => {
    if (event === 'SIGNED_IN' && session) {
      router.push('/dashboard')
    }
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Welcome to Your Workout Platform
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to create personalized AI-powered workouts
          </p>
        </header>

        <main className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8" role="main" aria-label="Login form">
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
                button: 'auth-button focus:ring-2 focus:ring-blue-500 focus:outline-none',
                input: 'auth-input focus:ring-2 focus:ring-blue-500 focus:outline-none',
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
        </main>

        <footer className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            By signing in, you agree to our <a href="#" className="underline hover:text-gray-800 dark:hover:text-gray-200">Terms of Service</a> and <a href="#" className="underline hover:text-gray-800 dark:hover:text-gray-200">Privacy Policy</a>
          </p>
        </footer>
      </div>
    </div>
  )
}