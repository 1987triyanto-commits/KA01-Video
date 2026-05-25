import { VideoTemplate } from '../types';
import { Award, Heart, Rocket, Users, Edit3 } from 'lucide-react';

interface TemplateSelectorProps {
  templates: VideoTemplate[];
  selectedTemplate: VideoTemplate;
  onSelect: (template: VideoTemplate) => void;
  onUpdateText: (text: string) => void;
  onUpdateBadge: (text: string) => void;
}

export default function TemplateSelector({
  templates,
  selectedTemplate,
  onSelect,
  onUpdateText,
  onUpdateBadge
}: TemplateSelectorProps) {
  
  const getIcon = (theme: string) => {
    switch (theme) {
      case 'graduation': return <Award className="w-5 h-5 text-amber-500" />;
      case 'teacher': return <Heart className="w-5 h-5 text-rose-500" />;
      case 'future': return <Rocket className="w-5 h-5 text-blue-500" />;
      case 'friends': return <Users className="w-5 h-5 text-emerald-500" />;
      default: return <Award className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-lg mb-6 text-slate-100" id="template_selector_card">
      <div className="flex items-center gap-2 mb-4">
        <span className="p-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded-lg">
          <Edit3 className="w-5 h-5" />
        </span>
        <h2 className="text-base font-bold text-white">
          Pilih &amp; Desain Template Video
        </h2>
      </div>

      <p className="text-xs text-slate-400 mb-4 font-medium">
        Pilih gaya bingkai animasi yang kamu suka untuk merekam video kesan pesannmu.
      </p>

      {/* Grid of Templates */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {templates.map((tpl) => {
          const isSelected = tpl.id === selectedTemplate.id;
          return (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all relative overflow-hidden backdrop-blur-sm ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500/20 ring-1 ring-indigo-500/30'
                  : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/8'
              }`}
              id={`template_btn_${tpl.id}`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                {getIcon(tpl.visualTheme)}
                <span className="font-bold text-xs md:text-sm text-slate-100">{tpl.name}</span>
              </div>
              <p className="text-[10px] md:text-[11px] text-slate-400 leading-tight">
                {tpl.description}
              </p>
              {isSelected && (
                <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 rounded-bl-lg"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Customize Overlay Options */}
      <div className="mt-4 pt-4 border-t border-white/5 bg-white/3 p-3.5 rounded-xl">
        <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wide mb-3 flex items-center gap-1">
          <span>⚙️ Custom Tulisan di Video</span>
        </h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Tulisan Utama (Bawah Bingkai)
            </label>
            <input
              type="text"
              value={selectedTemplate.bottomText}
              onChange={(e) => onUpdateText(e.target.value)}
              placeholder="Contoh: Kelulusan SDN Karang Anyar 01 Pagi"
              maxLength={60}
              className="w-full text-xs px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 bg-slate-950/45 text-slate-100 placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Nama &amp; Gelar Kelas (Lencana Kanan Atas)
            </label>
            <input
              type="text"
              value={selectedTemplate.badgeText}
              onChange={(e) => onUpdateBadge(e.target.value)}
              placeholder="Contoh: Angkatan 2026 - Kelas 6B"
              maxLength={25}
              className="w-full text-xs px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 bg-slate-950/45 text-slate-100 placeholder-slate-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
