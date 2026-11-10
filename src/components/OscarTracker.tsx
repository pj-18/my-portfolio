import React, { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Trophy, Sparkles, Filter, RotateCcw } from 'lucide-react'
import confetti from 'canvas-confetti'
import { portfolioConfig } from '../config/portfolio.config'

export const OscarTracker: React.FC = () => {
  const { oscarSeason } = portfolioConfig

  // Load watched state from localStorage or use defaults
  const [watchedIds, setWatchedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('oscar_watched_ids')
      if (saved) return JSON.parse(saved)
    } catch { }
    // default to initial list
    return oscarSeason.nominees.filter(n => n.isWatched).map(n => n.id)
  })

  const [activeFilter, setActiveFilter] = useState<string>('All')

  // Save to localStorage whenever watched state changes
  useEffect(() => {
    try {
      localStorage.setItem('oscar_watched_ids', JSON.stringify(watchedIds))
    } catch { }
  }, [watchedIds])

  const totalCount = oscarSeason.nominees.length
  const watchedCount = oscarSeason.nominees.filter(n => watchedIds.includes(n.id)).length
  const percent = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0

  const toggleWatched = (id: string) => {
    setWatchedIds(prev => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter(item => item !== id) : [...prev, id]

      // If user just completed 100%, trigger confetti celebration!
      if (!exists && next.length === totalCount) {
        triggerConfetti()
      }
      return next
    })
  }

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#e5a93c', '#00e054', '#ffffff', '#40bcf4']
    })
  }

  const handleReset = () => {
    if (confirm('Reset your Oscar watch checklist?')) {
      setWatchedIds([])
    }
  }

  const handleMarkAll = () => {
    setWatchedIds(oscarSeason.nominees.map(n => n.id))
    triggerConfetti()
  }

  // Filter options
  const filterOptions = ['All', 'Best Picture', 'Director', 'Acting', 'Animated']

  const filteredNominees = oscarSeason.nominees.filter(film => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Best Picture') return film.category.includes('Best Picture')
    if (activeFilter === 'Director') return film.category.includes('Director')
    if (activeFilter === 'Acting') return film.category.includes('Actor') || film.category.includes('Actress')
    if (activeFilter === 'Animated') return film.category.includes('Animated')
    return true
  })

  return (
    <div className="space-y-4">
      {/* Progress Card */}
      <div className="glass-panel rounded-2xl p-4 border border-[#e5a93c]/30 relative overflow-hidden bg-gradient-to-br from-[#1a1813] to-[#12151c]">
        {/* Glow ambient */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#e5a93c]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#e5a93c]/20 text-[#e5a93c]">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-slate-300">
                Nominees Watched
              </div>
              <div className="text-[11px] text-slate-400">
                Track your Oscar race viewing marathon
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-extrabold text-[#e5a93c] font-mono">
              {percent}%
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {watchedCount} of {totalCount} films
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/5 my-2">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-[#e5a93c] via-yellow-300 to-[#00e054] shadow-sm"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-[#e5a93c]">
            <Sparkles className="w-3 h-3" />
            {percent === 100
              ? 'All nominees watched! Complete!'
              : `${totalCount - watchedCount} films remaining`}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAll}
              className="hover:text-white transition-colors underline"
            >
              Mark all
            </button>
            <span>•</span>
            <button
              onClick={handleReset}
              className="hover:text-rose-400 transition-colors flex items-center gap-0.5"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <Filter className="w-3 h-3 text-slate-500 shrink-0 mr-0.5" />
        {filterOptions.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-all font-medium ${activeFilter === cat
                ? 'bg-[#e5a93c] text-black font-semibold shadow-md'
                : 'glass-pill text-slate-400 hover:text-slate-200'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Nominees Checklist Cards */}
      <div className="space-y-2">
        {filteredNominees.map(film => {
          const isWatched = watchedIds.includes(film.id)

          return (
            <div
              key={film.id}
              onClick={() => toggleWatched(film.id)}
              className={`p-3 rounded-xl transition-all cursor-pointer flex items-center gap-3 border ${isWatched
                  ? 'glass-panel bg-[#141b16]/70 border-[#00e054]/30'
                  : 'glass-panel bg-[#12151c]/60 border-white/5 hover:border-white/20'
                }`}
            >
              {/* Checkbox Icon */}
              <button
                type="button"
                className="shrink-0 p-1 text-slate-400 focus:outline-none"
              >
                {isWatched ? (
                  <CheckCircle2 className="w-5 h-5 text-[#00e054] fill-[#00e054]/10" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                )}
              </button>

              {/* Poster Thumbnail */}
              <div className="w-12 h-16 rounded-md overflow-hidden bg-slate-900 shrink-0 relative shadow">
                <img
                  src={film.posterUrl}
                  alt={film.title}
                  className={`w-full h-full object-cover transition-all ${isWatched ? 'opacity-90' : 'opacity-60 grayscale-[30%]'
                    }`}
                  loading="lazy"
                />
              </div>

              {/* Film Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4
                    className={`text-xs sm:text-sm font-bold truncate transition-colors ${isWatched ? 'text-white' : 'text-slate-300'
                      }`}
                  >
                    {film.title}
                  </h4>
                  {isWatched && (
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#00e054]/20 text-[#00e054] shrink-0">
                      Watched
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  Dir: {film.director || 'Various'}
                </p>

                <p className="text-[10px] text-[#e5a93c] truncate font-mono mt-0.5">
                  {film.category}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
