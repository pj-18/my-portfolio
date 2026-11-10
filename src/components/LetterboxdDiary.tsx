import React, { useState, useEffect } from 'react'
import { Film, RefreshCw, ExternalLink, Repeat, UserCheck, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import type { DiaryEntry } from '../types'
import { fetchLetterboxdDiary, fallbackDiaryEntries } from '../services/letterboxd'
import { portfolioConfig } from '../config/portfolio.config'

export const LetterboxdDiary: React.FC = () => {
  const [username, setUsername] = useState<string>(() => {
    const stored = localStorage.getItem('letterboxd_username')
    if (stored && stored !== 'praveenponduru') return stored
    return portfolioConfig.letterboxd.username
  })
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [tempUsername, setTempUsername] = useState(username)
  const [entries, setEntries] = useState<DiaryEntry[]>(fallbackDiaryEntries)
  const [loading, setLoading] = useState<boolean>(true)
  const [expandedReview, setExpandedReview] = useState<string | null>(null)
  const [isLiveFeed, setIsLiveFeed] = useState<boolean>(false)

  const loadDiary = async (userToFetch: string) => {
    setLoading(true)
    try {
      const data = await fetchLetterboxdDiary(userToFetch)
      setEntries(data)
      setIsLiveFeed(data !== fallbackDiaryEntries)
    } catch {
      setEntries(fallbackDiaryEntries)
      setIsLiveFeed(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDiary(username)
  }, [username])

  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = tempUsername.trim().replace(/^@/, '')
    if (clean) {
      setUsername(clean)
      localStorage.setItem('letterboxd_username', clean)
      setIsEditingUsername(false)
    }
  }

  const toggleReview = (id: string) => {
    setExpandedReview(prev => prev === id ? null : id)
  }

  return (
    <section id="diary" className="px-4 py-4 mb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-[#00e054]/20 text-[#00e054]">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <span>Recent Diary Entries</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/10 text-slate-300">
                5 Latest
              </span>
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span>@{username}</span>
                {isLiveFeed && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e054] inline-block" title="Live RSS Synced" />
                )}
              </span>
              <button
                onClick={() => setIsEditingUsername(!isEditingUsername)}
                className="text-[#40bcf4] hover:underline text-[10px]"
              >
                {isEditingUsername ? 'Cancel' : 'Change'}
              </button>
            </div>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => loadDiary(username)}
          disabled={loading}
          title="Refresh diary from Letterboxd"
          className="p-1.5 rounded-lg glass-panel hover:border-[#00e054]/40 text-slate-400 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00e054]' : ''}`} />
        </button>
      </div>

      {/* Edit Username Bar */}
      {isEditingUsername && (
        <form onSubmit={handleSaveUsername} className="glass-panel rounded-xl p-2.5 mb-3 border border-[#40bcf4]/30 flex gap-2">
          <input
            type="text"
            value={tempUsername}
            onChange={(e) => setTempUsername(e.target.value)}
            placeholder="Letterboxd username..."
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00e054]"
            autoFocus
          />
          <button
            type="submit"
            className="bg-[#00e054] text-black font-semibold px-3 py-1 rounded-lg text-xs hover:bg-[#00e054]/90 flex items-center gap-1"
          >
            <UserCheck className="w-3 h-3" />
            <span>Sync</span>
          </button>
        </form>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-panel rounded-xl p-2.5 flex gap-3 animate-pulse">
              <div className="w-14 h-20 bg-slate-800/80 rounded-lg shrink-0" />
              <div className="flex-1 py-1 space-y-2">
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-850 rounded w-1/3" />
                <div className="h-3 bg-slate-900 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.slice(0, 5).map((entry) => (
            <div
              key={entry.id}
              className="glass-panel rounded-xl p-2.5 transition-all duration-200 border border-white/5 hover:border-[#00e054]/30 bg-[#12151c]/80 flex flex-col group"
            >
              <div className="flex gap-3">
                {/* Poster Thumbnail */}
                <a
                  href={entry.letterboxdUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-16 h-24 rounded-lg overflow-hidden shrink-0 bg-slate-900 relative shadow-md group-hover:scale-105 transition-transform"
                >
                  <img
                    src={entry.posterUrl}
                    alt={entry.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {entry.isRewatch && (
                    <div className="absolute bottom-1 right-1 bg-black/80 rounded-full p-0.5 text-[#00e054]" title="Rewatch">
                      <Repeat className="w-2.5 h-2.5" />
                    </div>
                  )}
                </a>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    {/* Top Row: Title & Link */}
                    <div className="flex items-start justify-between gap-1">
                      <a
                        href={entry.letterboxdUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-white group-hover:text-[#00e054] transition-colors truncate"
                      >
                        {entry.title}
                      </a>
                      <a
                        href={entry.letterboxdUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-white p-0.5 shrink-0"
                        title="Open on Letterboxd"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Year & Watched Date */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                      {entry.year && <span>{entry.year}</span>}
                      {entry.year && <span>•</span>}
                      <span>Logged {entry.watchedDate}</span>
                    </div>

                    {/* Star Rating */}
                    {entry.ratingStars && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[#00e054] text-xs tracking-wider font-mono">
                          {entry.ratingStars}
                        </span>
                        {entry.rating && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({entry.rating.toFixed(1)})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Review snippet toggle if present */}
                  {entry.review && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleReview(entry.id)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 text-left"
                      >
                        <MessageSquare className="w-3 h-3 text-[#40bcf4]" />
                        <span className="truncate max-w-[200px]">
                          {expandedReview === entry.id ? 'Hide review' : 'Read notes/review'}
                        </span>
                        {expandedReview === entry.id ? (
                          <ChevronUp className="w-3 h-3 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3 h-3 shrink-0" />
                        )}
                      </button>

                      {expandedReview === entry.id && (
                        <p className="mt-1.5 text-xs text-slate-300 bg-black/40 p-2.5 rounded-lg border border-white/5 italic leading-relaxed animate-in fade-in duration-200">
                          "{entry.review}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View full Letterboxd profile button */}
      <a
        href={`https://letterboxd.com/${username}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 w-full py-2.5 px-3 rounded-xl glass-panel border border-[#00e054]/30 bg-gradient-to-r from-[#00e054]/10 to-transparent hover:from-[#00e054]/20 flex items-center justify-center gap-2 text-xs font-semibold text-white transition-all shadow-md group"
      >
        <span className="w-2 h-2 rounded-full bg-[#00e054] animate-pulse" />
        <span>View Full Diary & Watchlist on Letterboxd</span>
        <ExternalLink className="w-3.5 h-3.5 text-[#00e054] group-hover:translate-x-0.5 transition-transform" />
      </a>
    </section>
  )
}
