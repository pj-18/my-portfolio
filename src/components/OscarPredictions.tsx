import React, { useState } from 'react'
import { Trophy, Heart, MessageSquareQuote, ChevronRight } from 'lucide-react'
import { portfolioConfig } from '../config/portfolio.config'

export const OscarPredictions: React.FC = () => {
  const { oscarSeason } = portfolioConfig
  const categories = oscarSeason.categories

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '')

  const currentCategory = categories.find(c => c.id === selectedCategoryId) || categories[0]

  return (
    <div className="space-y-4">
      {/* Category selector pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {categories.map(cat => {
          const isSelected = cat.id === selectedCategoryId
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 font-medium ${
                isSelected
                  ? 'bg-gradient-to-r from-[#e5a93c] to-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                  : 'glass-pill text-slate-300 hover:text-white'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          )
        })}
      </div>

      {/* Selected Category Detail Card */}
      {currentCategory && (
        <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-4 bg-gradient-to-b from-[#141720] to-[#0f1218]">
          {/* Category Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#e5a93c] font-semibold">
                Academy Award Category
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {currentCategory.name}
              </h3>
            </div>
            <div className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
              {currentCategory.nominees.length} Nominees
            </div>
          </div>

          {/* Predictions Highlights: Will Win vs Should Win */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Will Win Card */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-[#e5a93c]/30 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#e5a93c] uppercase tracking-wider">
                  <Trophy className="w-3.5 h-3.5" />
                  Will Win (Prediction)
                </span>
                <span className="w-2 h-2 rounded-full bg-[#e5a93c] animate-pulse" />
              </div>
              <div className="text-sm font-bold text-white">
                {currentCategory.predictedWinner}
              </div>
              <div className="text-[10px] text-amber-200/70 mt-0.5">
                Academy Momentum & Precursor Favorite
              </div>
            </div>

            {/* Should Win Card */}
            <div className="p-3 rounded-xl bg-[#00e054]/10 border border-[#00e054]/30 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#00e054] uppercase tracking-wider">
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  Should Win (Personal Pick)
                </span>
                <span className="w-2 h-2 rounded-full bg-[#00e054]" />
              </div>
              <div className="text-sm font-bold text-white">
                {currentCategory.preferredWinner}
              </div>
              <div className="text-[10px] text-emerald-200/70 mt-0.5">
                Personal Favorite / Artistic Masterpiece
              </div>
            </div>
          </div>

          {/* User Review / Commentary */}
          {currentCategory.userNote && (
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex gap-2.5 items-start">
              <MessageSquareQuote className="w-4 h-4 text-[#40bcf4] shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                  My Verdict & Thoughts:
                </span>
                <p className="text-xs text-slate-200 leading-relaxed italic">
                  "{currentCategory.userNote}"
                </p>
              </div>
            </div>
          )}

          {/* All Nominees In Category */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              All Nominees
            </div>
            <div className="space-y-1">
              {currentCategory.nominees.map((nominee, idx) => {
                const isWillWin = nominee.includes(currentCategory.predictedWinner) || currentCategory.predictedWinner.includes(nominee)
                const isShouldWin = nominee.includes(currentCategory.preferredWinner) || currentCategory.preferredWinner.includes(nominee)

                return (
                  <div
                    key={idx}
                    className={`px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-all ${
                      isWillWin && isShouldWin
                        ? 'bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-[#e5a93c]/40 font-semibold text-white'
                        : isWillWin
                        ? 'bg-amber-500/15 border border-[#e5a93c]/30 font-semibold text-white'
                        : isShouldWin
                        ? 'bg-[#00e054]/15 border border-[#00e054]/30 font-semibold text-white'
                        : 'bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] text-slate-500 w-4">
                        {idx + 1}.
                      </span>
                      <span className="truncate">{nominee}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isWillWin && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e5a93c] text-black">
                          <Trophy className="w-2.5 h-2.5" />
                          <span>Will Win</span>
                        </span>
                      )}
                      {isShouldWin && !isWillWin && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#00e054] text-black">
                          <Heart className="w-2.5 h-2.5 fill-current" />
                          <span>Pick</span>
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick summary strip of other categories */}
      <div className="glass-panel rounded-xl p-3 border border-white/5">
        <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
          Predictions Cheat-Sheet
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategoryId(c.id)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-left transition-colors flex items-center justify-between group"
            >
              <div className="truncate mr-2">
                <div className="text-[10px] text-slate-400 truncate">{c.name}</div>
                <div className="text-white font-medium text-xs truncate flex items-center gap-1">
                  <span className="text-[#e5a93c]">🏆</span>
                  <span>{c.predictedWinner}</span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
