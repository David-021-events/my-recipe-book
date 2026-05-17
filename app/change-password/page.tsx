import { redirect } from 'next/navigation'
import { getAdminSessionServer } from '@/lib/auth'
import ChangePasswordForm from './ChangePasswordForm'

export default async function ChangePasswordPage() {
  const session = await getAdminSessionServer()

  // Not logged in → login page
  if (!session.valid) redirect('/admin/login')

  // Already changed → no reason to be here
  if (!session.mustChangePassword) redirect('/admin')

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg border border-neutral-200 p-8 w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-neutral-900 mb-2">Set your password</h1>
        <p className="font-sans text-sm text-neutral-500 mb-6">
          Please set a personal password to continue. Your temporary password will no longer work after this step.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
