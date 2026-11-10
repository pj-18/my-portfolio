import React, { useState, useEffect } from 'react'
import { User, Film, Trophy, Link as LinkIcon, Heart } from 'lucide-react'

export const BottomNav: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('top')

  const navItems = [
    { id: 'top', label: 'About', icon: User },
    { id: 'top4', label: 'Top 4', icon: Heart },
    { id: 'diary', label: 'Diary', icon: Film },
    { id: 'oscars', label: 'Oscars', icon: Trophy },
    { id: 'links', label: 'Links', icon: LinkIcon },
  ]

  const scrollTo = (id: string) => {
    setActiveSection(id)
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Update active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200
      const diaryEl = document.getElementById('diary')
      const oscarEl = document.getElementById('oscars')
      const linksEl = document.getElementById('links')
      const top4El = document.getElementById('top4')

      if (linksEl && scrollPos >= linksEl.offsetTop) {
        setActiveSection('links')
      } else if (oscarEl && scrollPos >= oscarEl.offsetTop) {
        setActiveSection('oscars')
      } else if (diaryEl && scrollPos >= diaryEl.offsetTop) {
        setActiveSection('diary')
      } else if (top4El && scrollPos >= top4El.offsetTop) {
        setActiveSection('top4')
      } else {
        setActiveSection('top')
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto bg-[#12151c]/90 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 shadow-2xl shadow-black/80 flex items-center gap-1 sm:gap-2 max-w-sm mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id

          return (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={`px-3 py-1.5 rounded-full flex flex-col items-center gap-0.5 transition-all duration-200 relative ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute inset-0 bg-white/10 rounded-full -z-10" />
              )}
              <Icon
                className={`w-4 h-4 transition-transform ${
                  isActive
                    ? item.id === 'oscars'
                      ? 'text-[#e5a93c] scale-110'
                      : item.id === 'diary'
                      ? 'text-[#00e054] scale-110'
                      : item.id === 'top4'
                      ? 'text-[#ff8000] scale-110'
                      : 'text-[#40bcf4] scale-110'
                    : ''
                }`}
              />
              <span className={`text-[10px] font-medium tracking-tight ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

