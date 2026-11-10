import React, { useState } from 'react'
import { Smartphone, Monitor, Wifi, Battery, Sparkles } from 'lucide-react'

interface MobileFramePreviewProps {
  children: React.ReactNode
}

export const MobileFramePreview: React.FC<MobileFramePreviewProps> = ({ children }) => {
  const [forceMobileFrame, setForceMobileFrame] = useState(true)

  return (
    <div className="min-h-screen bg-[#07080a] text-slate-100 flex flex-col items-center justify-start relative">
      {/* Desktop Helper Bar: visible only on md+ screens */}
      <div className="hidden md:flex fixed top-4 right-4 z-50 items-center gap-2 bg-[#141720]/90 backdrop-blur-md border border-white/10 rounded-full p-1.5 shadow-2xl text-xs">
        <span className="px-2 text-slate-400 font-mono text-[11px] flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#e5a93c]" />
          <span>Mobile-First View</span>
        </span>
        <button
          onClick={() => setForceMobileFrame(true)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
            forceMobileFrame
              ? 'bg-[#00e054] text-black font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Simulate iPhone / Mobile Frame"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Phone Frame</span>
        </button>
        <button
          onClick={() => setForceMobileFrame(false)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
            !forceMobileFrame
              ? 'bg-[#40bcf4] text-black font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
          title="View Full Width"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Full Width</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div
        className={`w-full transition-all duration-300 ${
          forceMobileFrame
            ? 'md:max-w-[430px] md:my-8 md:rounded-[48px] md:border-[10px] md:border-[#1e222b] md:shadow-[0_0_60px_rgba(0,0,0,0.9)] md:ring-1 md:ring-white/10 overflow-hidden relative bg-[#0b0d10]'
            : 'max-w-2xl mx-auto'
        }`}
      >
        {/* Simulated Mobile Status Bar (Desktop frame only) */}
        {forceMobileFrame && (
          <div className="hidden md:flex items-center justify-between px-6 pt-3 pb-1 text-slate-400 text-[11px] font-mono select-none bg-black/40">
            <span>9:41</span>
            {/* Dynamic Island Pill */}
            <div className="w-20 h-4 bg-black rounded-full border border-white/10 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500/80 mr-1" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            </div>
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Content */}
        <div id="top" className="relative min-h-screen">
          {children}
        </div>
      </div>
    </div>
  )
}

