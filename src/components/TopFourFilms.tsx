import React from 'react'
import { Heart, ExternalLink } from 'lucide-react'
import { portfolioConfig } from '../config/portfolio.config'

export const TopFourFilms: React.FC = () => {
  const { topFourFilms } = portfolioConfig

  return (
    <section className="px-4 py-4 mb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 items-center">
            <span className="w-2 h-2 rounded-full bg-[#ff8000]" />
            <span className="w-2 h-2 rounded-full bg-[#00e054]" />
            <span className="w-2 h-2 rounded-full bg-[#40bcf4]" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Top 4 Favorites
          </h2>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Heart className="w-3 h-3 text-[#ff8000] fill-current" />
          <span>Criterion & Letterboxd</span>
        </div>
      </div>

      {/* Grid of 4 Films */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {topFourFilms.map((film, index) => (
          <a
            key={index}
            href={film.letterboxdUrl || `https://letterboxd.com/search/${encodeURIComponent(film.title)}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative rounded-xl overflow-hidden glass-panel border border-white/5 bg-[#14171d] flex flex-col transition-all duration-300 hover:scale-[1.02] hover:border-[#00e054]/40"
          >
            {/* Poster image container */}
            <div className="aspect-[2/3] w-full overflow-hidden bg-slate-900 relative">
              <img
                src={film.posterUrl}
                alt={film.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f12] via-transparent to-transparent opacity-80" />
              
              {/* Rank badge */}
              <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-md rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-300 border border-white/10">
                #{index + 1}
              </div>

              {/* External link icon on hover/active */}
              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-1 text-white">
                <ExternalLink className="w-2.5 h-2.5" />
              </div>
            </div>

            {/* Film Info */}
            <div className="p-2 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-semibold text-white truncate group-hover:text-[#00e054] transition-colors">
                  {film.title}
                </h3>
                <p className="text-[10px] text-slate-400 truncate">
                  {film.director}
                </p>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>{film.year}</span>
                <span className="text-[#00e054]">★★★★★</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

