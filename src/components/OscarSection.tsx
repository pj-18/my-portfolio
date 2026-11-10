import React, { useState } from 'react'
import { Trophy, CheckSquare, Award } from 'lucide-react'
import { OscarTracker } from './OscarTracker'
import { OscarPredictions } from './OscarPredictions'
import { portfolioConfig } from '../config/portfolio.config'

export const OscarSection: React.FC = () => {
  const { oscarSeason } = portfolioConfig
  const [activeTab, setActiveTab] = useState<'tracker' | 'predictions'>('tracker')

  if (!oscarSeason.isActive) {
    return null
  }

  return (
    <section id="oscars" className="px-4 py-4 mb-4">
      {/* Oscar Header Banner */}
      <div className="relative rounded-2xl p-4 mb-3 border border-[#e5a93c]/30 bg-gradient-to-r from-amber-950/40 via-[#181510] to-[#12151c] overflow-hidden shadow-lg">
        {/* Ambient golden aura */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#e5a93c]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e5a93c] to-amber-600 p-0.5 shadow-md shadow-amber-500/20 flex items-center justify-center text-black">
              <Award className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#e5a93c]">
                  Oscar Season Special
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#e5a93c] animate-ping" />
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                {oscarSeason.seasonTitle}
              </h2>
            </div>
          </div>

          <div className="hidden sm:block text-right font-mono text-[11px] text-amber-200/60">
            {oscarSeason.ceremonyDate}
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 p-1 bg-black/60 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('tracker')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'tracker'
                ? 'bg-gradient-to-r from-[#e5a93c] to-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
              }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Nominees Watched</span>
          </button>

          <button
            onClick={() => setActiveTab('predictions')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'predictions'
                ? 'bg-gradient-to-r from-[#e5a93c] to-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
              }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Predictions</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300">
        {activeTab === 'tracker' ? <OscarTracker /> : <OscarPredictions />}
      </div>
    </section>
  )
}
