import { getAdminSessionServer } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import AccountClient from './AccountClient'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const session = await getAdminSessionServer()
  if (!session.valid) redirect('/admin/login')

  const startOfMonth = new Date()
  startOfMonth.setUTCDate(1)
  startOfMonth.setUTCHours(0, 0, 0, 0)

  const nextMonth = new Date(startOfMonth)
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)
  const resetDate = nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  const [{ data: user }, { count: usedThisMonth }] = await Promise.all([
    supabaseAdmin.from('users').select('email, monthly_limit').eq('id', session.userId).single(),
    supabaseAdmin
      .from('extractions_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.userId)
      .gte('created_at', startOfMonth.toISOString()),
  ])

  const limit = (user as { email: string; monthly_limit: number } | null)?.monthly_limit ?? 30
  const email = (user as { email: string; monthly_limit: number } | null)?.email ?? ''
  const used = usedThisMonth ?? 0

  return (
    <AccountClient
      email={email}
      usedThisMonth={used}
      monthlyLimit={limit}
      resetDate={resetDate}
    />
  )
}
