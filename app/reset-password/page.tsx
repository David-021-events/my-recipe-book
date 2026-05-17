'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const res = await fetch('/api/account/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    })

    if (res.ok) {
      setSuccess(true)
      return
    }

    const data = await res.json()
    setError(data.error ?? 'Something went wrong. Please try again.')
    setLoading(false)
  }

  if (!token) {
    return (
      <p className="font-sans text-sm text-red-600">
        Invalid or expired reset link. Please request a new one.
      </p>
    )
  }

  if (success) {
    return (
      <div className="space-y-4">
        <p className="font-sans text-sm text-neutral-600">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <a
          href="/admin/login"
          className="block w-full text-center bg-brand-500 hover:bg-brand-600 text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors min-h-[44px] leading-[44px]"
        >
          Sign in
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password"
        required
        minLength={8}
        autoComplete="new-password"
        className="w-full border border-neutral-200 rounded-md px-3 py-2.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-sans text-sm text-neutral-900 placeholder:text-neutral-400"
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
        required
        minLength={8}
        autoComplete="new-password"
        className="w-full border border-neutral-200 rounded-md px-3 py-2.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-sans text-sm text-neutral-900 placeholder:text-neutral-400"
      />
      {error && <p className="font-sans text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-500 hover:bg-brand-600 text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors min-h-[44px] disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg border border-neutral-200 p-8 w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">Set new password</h1>
        <Suspense fallback={<p className="font-sans text-sm text-neutral-400">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
