'use client'

import { useState } from 'react'

interface Props {
  email: string
  usedThisMonth: number
  monthlyLimit: number
  resetDate: string
}

export default function AccountClient({ email, usedThisMonth, monthlyLimit, resetDate }: Props) {
  return (
    <div className="max-w-lg space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 mb-1">Account</h1>
        <p className="font-sans text-sm text-neutral-500">{email}</p>
      </div>

      {/* Usage meter */}
      <section>
        <h2 className="font-sans text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-3">
          Usage
        </h2>
        <p className="font-sans text-sm text-neutral-700">
          {usedThisMonth} of {monthlyLimit} extractions used this month
          <span className="text-neutral-400"> (resets {resetDate})</span>
        </p>
        <div className="mt-2 h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all"
            style={{ width: `${Math.min((usedThisMonth / monthlyLimit) * 100, 100)}%` }}
          />
        </div>
      </section>

      {/* Change password */}
      <section>
        <h2 className="font-sans text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-4">
          Change password
        </h2>
        <ChangePasswordForm />
      </section>

      {/* Legal links */}
      <section>
        <div className="flex gap-4">
          <a href="/privacy" className="font-sans text-xs text-neutral-400 hover:text-neutral-600">
            Privacy Policy
          </a>
          <a href="/terms" className="font-sans text-xs text-neutral-400 hover:text-neutral-600">
            Terms of Service
          </a>
        </div>
      </section>

      {/* Danger zone */}
      <section className="border border-red-200 rounded-lg p-5">
        <h2 className="font-sans text-sm font-semibold text-red-700 mb-2">Danger zone</h2>
        <p className="font-sans text-sm text-neutral-500 mb-4">
          Deleting your account permanently removes all your recipes and cannot be undone.
        </p>
        <DeleteAccountButton />
      </section>
    </div>
  )
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setLoading(true)
    const res = await fetch('/api/account/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    })

    if (res.ok) {
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong.')
    }
    setLoading(false)
  }

  const inputClass =
    'w-full border border-neutral-200 rounded-md px-3 py-2.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-sans text-sm text-neutral-900 placeholder:text-neutral-400'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Current password"
        required
        autoComplete="current-password"
        className={inputClass}
      />
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password"
        required
        minLength={8}
        autoComplete="new-password"
        className={inputClass}
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm new password"
        required
        minLength={8}
        autoComplete="new-password"
        className={inputClass}
      />
      {error && <p className="font-sans text-sm text-red-600">{error}</p>}
      {success && <p className="font-sans text-sm text-green-600">Password updated.</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-brand-500 hover:bg-brand-600 text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Update password'}
      </button>
    </form>
  )
}

function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch('/api/account', { method: 'DELETE' })
    if (res.ok) {
      window.location.href = '/'
    } else {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-sans text-sm text-neutral-600">Are you sure? This cannot be undone.</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white font-sans font-semibold text-sm px-4 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          {loading ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="font-sans text-sm text-neutral-500 hover:text-neutral-700"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="border border-red-300 text-red-600 hover:bg-red-50 font-sans font-semibold text-sm px-4 py-2 rounded-md transition-colors"
    >
      Delete my account
    </button>
  )
}
