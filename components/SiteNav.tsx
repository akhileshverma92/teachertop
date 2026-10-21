'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Home' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/search', label: 'Discover' },
  { href: '/profile', label: 'Profile' },
]

export function SiteNav() {
  const pathname = usePathname()

  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="text-sm font-medium tracking-tight text-stone-500">
        TeacherTop
      </Link>
      <nav className="flex flex-wrap items-center gap-1">
        {links.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                active
                  ? 'bg-white text-[#1c1c1c] shadow-sm'
                  : 'text-stone-500 hover:bg-white/70 hover:text-[#1c1c1c]'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
