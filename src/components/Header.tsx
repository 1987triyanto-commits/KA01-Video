import { GraduationCap, Landmark, Award } from 'lucide-react';

export default function Header() {
  return (
    <header className="relative z-10 flex flex-col md:flex-row md:items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-5 mb-6 gap-4" id="app_header">
      {/* Subtle glass background glow */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-white/2 rounded-full -translate-x-12 -translate-y-12 pointer-events-none"></div>
      
      <div className="flex items-center gap-4 z-10">
        <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20 animate-pulse shrink-0">
          <GraduationCap className="w-6 h-6 md:w-8 md:h-8 text-white" />
        </div>
        <div>
          <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-indigo-400 uppercase font-mono">
            <Award className="w-3.5 h-3.5 text-indigo-400" /> Memorial Digital Hub
          </span>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-white leading-tight">
            SDN Karang Anyar 01 Pagi
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Karya Kreatif Siswa - Rekam Pesan &amp; Kesan Kelulusanmu!
          </p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-3 z-10">
        <div className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-xs font-semibold text-slate-300">Sistem Kamera Siap</span>
        </div>
        <div className="px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold tracking-wider uppercase font-mono">
          🎓 Angkatan 2026
        </div>
      </div>
    </header>
  );
}
