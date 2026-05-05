import type { ReactNode } from 'react'

/**
 * Admin layout — wraps all /admin/* pages with the dark nav bar and neutral background.
 * Visually distinct from the public site to signal "you are in admin mode".
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="bg-neutral-900 text-white h-14">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-6 h-full">
          <span className="font-sans text-sm font-semibold text-white">Admin</span>
          <a
            href="/admin"
            className="font-sans text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Recipes
          </a>
          <form action="/api/admin/logout" method="POST" className="ml-auto">
            <button
              type="submit"
              className="font-sans text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Log out
            </button>
          </form>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
