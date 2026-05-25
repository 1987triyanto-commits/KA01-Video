import { useState } from 'react';
import { Sparkles, Loader2, Smile, ArrowRight, HeartHandshake, History, FileText } from 'lucide-react';

interface AIScriptHelperProps {
  onScriptSend: (script: string) => void;
  initialName?: string;
}

export default function AIScriptHelper({ onScriptSend, initialName = '' }: AIScriptHelperProps) {
  const [studentName, setStudentName] = useState(initialName);
  const [vibe, setVibe] = useState<'semangat' | 'haru' | 'ceria' | 'santai'>('semangat');
  const [teacherName, setTeacherName] = useState('');
  const [memory, setMemory] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorStatus(null);
    try {
      const response = await fetch('/api/generate-motivation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName: studentName.trim(),
          vibe,
          teacherName: teacherName.trim(),
          memory: memory.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi asisten AI.');
      }

      const data = await response.json();
      if (data.success && data.script) {
        setGeneratedScript(data.script);
      } else {
        throw new Error(data.error || 'Naskah kosong.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Terjadi kesalahan saat menghubungkan ke server.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToRecorder = () => {
    if (!generatedScript.trim()) return;
    onScriptSend(generatedScript);
    // Alert or tell user we updated
    const event = new CustomEvent('toast', { detail: 'Naskah dikirim ke Teleprompter!' });
    window.dispatchEvent(event);
  };

  return (
    <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-2xl p-5 shadow-lg mb-6" id="ai_script_helper">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 p-1.5 rounded-lg shrink-0">
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            Asisten AI Penulis Pidato
            <span className="text-[9px] bg-indigo-600/35 border border-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Gemini AI</span>
          </h2>
          <p className="text-[11px] text-slate-400">
            Bingung mau ngomong apa? Jawab pertanyaan berikut agar AI menuliskan naskah pidato terbaikmu!
          </p>
        </div>
      </div>

      <div className="space-y-3.5 mt-4">
        {/* Name & Vibe */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Siapa Namamu?
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className="w-full text-xs px-3 py-2 bg-slate-950/45 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Gaya Bicara / Vibe
            </label>
            <select
              value={vibe}
              onChange={(e: any) => setVibe(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-950/45 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-400 text-white"
            >
              <option className="bg-slate-900 text-white" value="semangat">🔥 Semangat Membara</option>
              <option className="bg-slate-900 text-white" value="haru">😭 Mengharukan &amp; Syukur</option>
              <option className="bg-slate-900 text-white" value="ceria">🎉 Ceria &amp; Lucu</option>
              <option className="bg-slate-900 text-white" value="santai">☘️ Santai &amp; Aesthetic</option>
            </select>
          </div>
        </div>

        {/* Favorite Teacher & Sweet Memory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <HeartHandshake className="w-3.5 h-3.5 text-rose-400 shrink-0" /> Nama Guru Favorit
            </label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="Contoh: Bu Erna / Wali Kelas 6"
              className="w-full text-xs px-3 py-2 bg-slate-950/45 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Kenangan Terbaikmu
            </label>
            <input
              type="text"
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              placeholder="Contoh: main bola waktu hujan / kemah pramuka"
              className="w-full text-xs px-3 py-2 bg-slate-950/45 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-white placeholder-slate-500"
            />
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !studentName.trim()}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 tracking-wider uppercase transition-all shadow-md ${
            isGenerating || !studentName.trim()
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-blue-950 hover:from-amber-400 hover:to-amber-500'
          }`}
          id="btn_generate_script"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              AI Sedang Menulis Naskah...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Tulis Naskah dengan Gemini AI
            </>
          )}
        </button>

        {errorStatus && (
          <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-2.5 rounded-lg text-xs">
            {errorStatus}
          </div>
        )}

        {/* Generated Area */}
        {generatedScript && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-fadeIn" id="generated_output_section">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> HASIL NASKAH PIDATOMU:
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {generatedScript.split(' ').length} kata
              </span>
            </div>

            <textarea
              className="w-full h-32 bg-slate-950/60 border border-white/10 rounded-xl p-3 text-xs leading-relaxed text-slate-200 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-sans resize-none"
              value={generatedScript}
              onChange={(e) => setGeneratedScript(e.target.value)}
              placeholder="Draf pidato..."
            />

            <button
              onClick={handleSendToRecorder}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98"
              id="btn_send_to_teleprompter"
            >
              Kirim ke Layar Perekam (Teleprompter) <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
