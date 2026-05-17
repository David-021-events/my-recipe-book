'use client'

import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/account/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg border border-neutral-200 p-8 w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-neutral-900 mb-2">Reset password</h1>

        {submitted ? (
          <p className="font-sans text-sm text-neutral-600">
            If that email is registered, you&apos;ll receive a reset link shortly. Check your spam folder if you don&apos;t see it.
          </p>
        ) : (
          <>
            <p className="font-sans text-sm text-neutral-500 mb-6">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                autoComplete="email"
                className="w-full border border-neutral-200 rounded-md px-3 py-2.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-sans text-sm text-neutral-900 placeholder:text-neutral-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors min-h-[44px] disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}

        <div className="mt-4 text-center">
          <a href="/admin/login" className="font-sans text-sm text-brand-500 hover:text-brand-600">
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  )
}
