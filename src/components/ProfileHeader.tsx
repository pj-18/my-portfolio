import React from 'react'
import { Film, Sparkles, MapPin, Play, Award, Eye } from 'lucide-react'
import { portfolioConfig } from '../config/portfolio.config'

export const ProfileHeader: React.FC = () => {
  const { profile, letterboxd } = portfolioConfig

  return (
    <header className="relative pt-6 pb-6 px-4 text-center overflow-hidden">
      {/* Subtle cinematic background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#00e054]/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-12 left-1/3 w-48 h-48 bg-[#e5a93c]/10 rounded-full blur-2xl pointer-events-none -z-10" />

      {/* Avatar with Film Reel border aesthetic */}
      <div className="relative inline-block mx-auto mb-4 group">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-[3px] bg-gradient-to-tr from-[#00e054] via-[#40bcf4] to-[#ff8000] shadow-xl shadow-black/60">
          <img
            src={profile.avatarUrl}
            alt={profile.name}
            className="w-full h-full object-cover rounded-full border-2 border-[#0d0f12] group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Live indicator / Film badge */}
        <div className="absolute -bottom-1 -right-1 bg-[#14171d] border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-1 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#00e054] animate-pulse" />
          <span className="text-[10px] font-mono tracking-wider uppercase text-slate-300 font-semibold">Cinephile</span>
        </div>
      </div>

      {/* Name & Tagline */}
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1.5 flex items-center justify-center gap-2">
        <span>{profile.name}</span>
        <span title="Letterboxd Enthusiast" className="inline-flex text-[#00e054]">
          <Film className="w-5 h-5" />
        </span>
      </h1>

      <p className="text-xs sm:text-sm font-medium text-slate-400 max-w-sm mx-auto mb-3 flex items-center justify-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-[#e5a93c]" />
        <span>{profile.tagline}</span>
      </p>

      {/* Location & Status */}
      <div className="flex items-center justify-center gap-3 text-xs text-slate-400 mb-4">
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-500" />
          {profile.location}
        </span>
        <span className="text-slate-600">•</span>
        <a
          href={letterboxd.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00e054] hover:underline font-mono text-[11px] flex items-center gap-1"
        >
          letterboxd.com/{letterboxd.username}
        </a>
      </div>

      {/* Bio Card */}
      <div className="glass-panel rounded-2xl p-4 text-left mb-5 shadow-lg border border-white/5">
        <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
          {profile.bio}
        </p>

        {/* Currently Watching / Obsessed With */}
        {profile.currentlyWatching && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2.5 text-xs">
            <span className="p-1 rounded-md bg-[#00e054]/15 text-[#00e054]">
              <Play className="w-3.5 h-3.5 fill-current" />
            </span>
            <div className="truncate text-slate-400">
              <span className="text-slate-500 mr-1.5 text-[11px] uppercase tracking-wider font-semibold">Currently Watching:</span>
              <span className="text-white font-medium">{profile.currentlyWatching}</span>
            </div>
          </div>
        )}
      </div>

      {/* Film Stats Strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-panel rounded-xl py-2.5 px-2 text-center border border-white/5">
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
            <Eye className="w-3 h-3 text-[#40bcf4]" />
            <span>All Time</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            {profile.filmStats.allTimeFilms}+
          </div>
        </div>

        <div className="glass-panel rounded-xl py-2.5 px-2 text-center border border-white/5">
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
            <Film className="w-3 h-3 text-[#00e054]" />
            <span>This Year</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-[#00e054] font-mono">
            {profile.filmStats.filmsWatchedThisYear}
          </div>
        </div>

        <div className="glass-panel rounded-xl py-2.5 px-2 text-center border border-white/5">
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-0.5">
            <Award className="w-3 h-3 text-[#e5a93c]" />
            <span>Avg Rating</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-[#e5a93c] font-mono">
            {profile.filmStats.avgRating} ★
          </div>
        </div>
      </div>
    </header>
  )
}

