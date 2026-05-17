import type { ReactNode } from 'react'
import Link from 'next/link'

/**
 * Admin layout — wraps all /admin/* pages with the dark nav bar and neutral background.
 * Visually distinct from the public site to signal "you are in admin mode".
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="bg-neutral-900 text-white h-14">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-6 h-full">
          <Link
            href="/"
            className="font-display italic font-semibold text-sm text-white hover:text-neutral-300 transition-colors"
          >
            My Recipe Book
          </Link>
          <span className="font-sans text-sm font-semibold text-white">Admin</span>
          <a
            href="/admin"
            className="font-sans text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Recipes
          </a>
          <div className="ml-auto flex items-center gap-4">
            <a
              href="/admin/account"
              className="font-sans text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Account
            </a>
            <form action="/api/admin/logout" method="POST">
              <button
                type="submit"
                className="font-sans text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
