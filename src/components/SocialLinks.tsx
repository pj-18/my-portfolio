import React, { useState } from 'react'
import { Mail, ExternalLink, Copy, Check, ArrowUp } from 'lucide-react'
import { portfolioConfig } from '../config/portfolio.config'

export const SocialLinks: React.FC = () => {
  const { socials, profile } = portfolioConfig
  const [copiedEmail, setCopiedEmail] = useState(false)

  const handleCopyEmail = () => {
    const email = socials.email?.replace('mailto:', '') || 'praveen@example.com'
    navigator.clipboard.writeText(email)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer id="links" className="px-4 pt-6 pb-24 text-center">
      {/* Section Header */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="h-[1px] w-12 bg-white/10" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Connect & Follow
        </span>
        <div className="h-[1px] w-12 bg-white/10" />
      </div>

      {/* Social Cards Stack */}
      <div className="space-y-2.5 max-w-md mx-auto mb-8 text-left">
        {/* Letterboxd Card */}
        <a
          href={socials.letterboxd}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-panel rounded-2xl p-3.5 border border-[#00e054]/30 bg-gradient-to-r from-[#00e054]/10 via-[#12151c] to-[#12151c] hover:border-[#00e054]/60 transition-all flex items-center justify-between group shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#14171d] border border-white/10 flex items-center justify-center shrink-0">
              <div className="flex gap-1 items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff8000]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#00e054]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#40bcf4]" />
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-[#00e054] transition-colors flex items-center gap-1.5">
                <span>Letterboxd</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#00e054]/20 text-[#00e054]">
                  Primary
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Film diary, ratings, & watchlist
              </div>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-white/5 group-hover:bg-[#00e054] text-slate-400 group-hover:text-black transition-colors">
            <ExternalLink className="w-4 h-4" />
          </div>
        </a>

        {/* Instagram Card */}
        <a
          href={socials.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-panel rounded-2xl p-3.5 border border-pink-500/20 bg-gradient-to-r from-pink-500/10 via-[#12151c] to-[#12151c] hover:border-pink-500/50 transition-all flex items-center justify-between group shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-[#14171d] rounded-[10px] flex items-center justify-center text-pink-400">
                <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-pink-400 transition-colors">
                Instagram
              </div>
              <div className="text-xs text-slate-400">
                Visual stories, frames & life
              </div>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-white/5 group-hover:bg-gradient-to-tr group-hover:from-rose-500 group-hover:to-pink-500 text-slate-400 group-hover:text-white transition-colors">
            <ExternalLink className="w-4 h-4" />
          </div>
        </a>

        {/* LinkedIn Card */}
        <a
          href={socials.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-panel rounded-2xl p-3.5 border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-[#12151c] to-[#12151c] hover:border-blue-500/50 transition-all flex items-center justify-between group shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0077b5]/20 border border-[#0077b5]/40 flex items-center justify-center shrink-0 text-[#0077b5]">
              <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect width="4" height="12" x="2" y="9"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-[#40bcf4] transition-colors">
                LinkedIn
              </div>
              <div className="text-xs text-slate-400">
                Professional journey & network
              </div>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-white/5 group-hover:bg-[#0077b5] text-slate-400 group-hover:text-white transition-colors">
            <ExternalLink className="w-4 h-4" />
          </div>
        </a>

        {/* Email & Contact Card */}
        <div className="glass-panel rounded-2xl p-3.5 border border-white/10 bg-[#12151c] flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-slate-300" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">
                Get In Touch
              </div>
              <div className="text-xs text-slate-400 truncate">
                {socials.email?.replace('mailto:', '')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyEmail}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
              title="Copy email"
            >
              {copiedEmail ? <Check className="w-4 h-4 text-[#00e054]" /> : <Copy className="w-4 h-4" />}
            </button>
            <a
              href={socials.email}
              className="p-2 rounded-xl bg-white/5 hover:bg-[#00e054] text-slate-300 hover:text-black transition-colors"
              title="Send email"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Film Quote */}
      <div className="max-w-xs mx-auto mb-6 text-center">
        <p className="text-xs italic text-slate-500 leading-relaxed">
          "Cinema is a matter of what's in the frame and what's out."
        </p>
        <span className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mt-1 block">
          — Martin Scorsese
        </span>
      </div>

      {/* Back to top button */}
      <button
        onClick={scrollToTop}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors py-1 px-3 rounded-full glass-pill mb-4"
      >
        <ArrowUp className="w-3 h-3" />
        <span>Back to Top</span>
      </button>

      {/* Copyright & Info */}
      <div className="text-[11px] text-slate-600 font-mono">
        © {new Date().getFullYear()} {profile.name} • Mobile Portfolio
      </div>
    </footer>
  )
}
