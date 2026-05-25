/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { VideoTemplate, RecordedVideo } from './types';
import Header from './components/Header';
import TemplateSelector from './components/TemplateSelector';
import AIScriptHelper from './components/AIScriptHelper';
import VideoRecorder from './components/VideoRecorder';
import DriveUploader from './components/DriveUploader';
import { GraduationCap, Sparkles, BookOpen, Smile, Info } from 'lucide-react';

const DEFAULT_TEMPLATES: VideoTemplate[] = [
  {
    id: 'kelulusan_emas',
    name: 'Kelulusan Emas',
    description: 'Frame elegan biru dongker dengan aksen strip emas mewah kelulusan.',
    primaryColor: '#1E3A8A', // Deep blue
    secondaryColor: '#F59E0B', // Amber
    bgColor: '#EFF6FF',
    textColor: '#1E3A8A',
    bottomText: 'Selamat atas Kelulusan SDN Karang Anyar 01 Pagi!',
    badgeText: 'Angkatan 2026',
    visualTheme: 'graduation'
  },
  {
    id: 'kado_guru',
    name: 'Kado untuk Guru',
    description: 'Frame hangat bertema papan tulis dengan motif kapur & cinta.',
    primaryColor: '#059669', // Emerald
    secondaryColor: '#E11D48', // Rose
    bgColor: '#ECFDF5',
    textColor: '#065F46',
    bottomText: 'Terima Kasih Guruku Tercinta - SDN Karang Anyar 01 Pagi',
    badgeText: 'Keluarga Kelas 6',
    visualTheme: 'teacher'
  },
  {
    id: 'gapai_impian',
    name: 'Gapai Impian',
    description: 'Frame kosmik luar angkasa dengan nuansa mimpi melangit tinggi.',
    primaryColor: '#4338CA', // Indigo
    secondaryColor: '#06B6D4', // Cyan
    bgColor: '#EEF2FF',
    textColor: '#312E81',
    bottomText: 'Lulus SD 2026! Gapai Cita-citamu setinggi Langit!',
    badgeText: 'Masa Depan Cerah',
    visualTheme: 'future'
  },
  {
    id: 'memori_ceria',
    name: 'Memori Ceria',
    description: 'Frame pastel ceria dengan corak cerah & stiker kartun lucu.',
    primaryColor: '#D97706', // Amber gold
    secondaryColor: '#10B981', // Emerald
    bgColor: '#FEF3C7',
    textColor: '#92400E',
    bottomText: 'Teman Selamanya - Kenangan Indah Lulus Sekolah Dasar',
    badgeText: 'Kenangan Kita',
    visualTheme: 'friends'
  }
];

export default function App() {
  const [templates, setTemplates] = useState<VideoTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate>(DEFAULT_TEMPLATES[0]);
  const [teleprompterScript, setTeleprompterScript] = useState<string>(
    'Draf Kesan & Pesan Kelulusanmu akan tertera di sini. Gunakan panel asisten AI di kanan bawah untuk menulis naskah pidatomu secara otomatis dengan Gemini AI!'
  );
  
  const [activeVideo, setActiveVideo] = useState<RecordedVideo | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Micro-interaction Toast trigger
  useEffect(() => {
    const handleToastEvent = (e: any) => {
      setToastMessage(e.detail);
      setTimeout(() => setToastMessage(null), 3000);
    };
    window.addEventListener('toast', handleToastEvent);
    return () => window.removeEventListener('toast', handleToastEvent);
  }, []);

  // Update selected template values on text edit inside selectors
  const handleUpdateBottomText = (newText: string) => {
    setSelectedTemplate(prev => ({
      ...prev,
      bottomText: newText
    }));
    setTemplates(current => current.map(t => t.id === selectedTemplate.id ? { ...t, bottomText: newText } : t));
  };

  const handleUpdateBadgeText = (newText: string) => {
    setSelectedTemplate(prev => ({
      ...prev,
      badgeText: newText
    }));
    setTemplates(current => current.map(t => t.id === selectedTemplate.id ? { ...t, badgeText: newText } : t));
  };

  const handleSelectTemplate = (tpl: VideoTemplate) => {
    setSelectedTemplate(tpl);
    const event = new CustomEvent('toast', { detail: `Template "${tpl.name}" terpilih!` });
    window.dispatchEvent(event);
  };

  const handleRecievedAIScript = (scriptText: string) => {
    setTeleprompterScript(scriptText);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 pb-12 font-sans overflow-x-hidden antialiased selection:bg-indigo-600 selection:text-white relative" id="main_app_wrapper">
      {/* Ambient Radial Glass Glow Bubbles */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] left-[-10%] w-[60%] h-[55%] rounded-full bg-blue-600/10 blur-[130px]" />
        <div className="absolute bottom-[5%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-6">
        {/* Custom Header Bar */}
        <Header />

        {/* Bento grid layout: Left for record actions, Right for designs and assist helpers */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          
          {/* LEFT PANEL: Viewfinder recorder and cloud upload */}
          <section className="lg:col-span-7 flex flex-col">
            {/* Live Camera Perekam */}
            <VideoRecorder
              selectedTemplate={selectedTemplate}
              teleprompterText={teleprompterScript}
              onVideoAvailable={setActiveVideo}
            />

            {/* Cloud Drive Uploader (Aligned right underneath video recorder) */}
            <DriveUploader
              videoBlob={activeVideo ? activeVideo.blob : null}
              videoFileName={activeVideo ? activeVideo.fileName : 'kesan_pesan.webm'}
              videoMimeType={activeVideo ? activeVideo.mimeType : 'video/webm'}
            />
          </section>

          {/* RIGHT PANEL: Designing configurations & copywriting tools */}
          <section className="lg:col-span-5 flex flex-col gap-1">
            {/* Template Selector Card */}
            <TemplateSelector
              templates={templates}
              selectedTemplate={selectedTemplate}
              onSelect={handleSelectTemplate}
              onUpdateText={handleUpdateBottomText}
              onUpdateBadge={handleUpdateBadgeText}
            />

            {/* AI Assistant Writer with scroll injection */}
            <AIScriptHelper
              onScriptSend={handleRecievedAIScript}
              initialName=""
            />
          </section>
        </main>

        {/* Tutorial / Panduan Penggunaan block at page bottom */}
        <footer className="mt-8 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-5 shadow-xl relative overflow-hidden" id="app_instructions_footer">
          {/* Subtle decoration inside stats footer */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>

          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mb-3.5">
            <Info className="w-4.5 h-4.5 text-indigo-400" /> Alur Cepat Membuat Video Kelulusan:
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="flex gap-2.5 items-start">
              <span className="w-5.5 h-5.5 bg-indigo-600 text-white font-bold flex items-center justify-center rounded-full shrink-0 font-mono text-[10px]">1</span>
              <div>
                <strong className="text-slate-200 block mb-0.5">Pilih Bingkai</strong>
                <p className="text-slate-400 leading-normal">
                  Pilih draf frame favoritmu di sebelah kanan. Kamu bisa langsung kustomisasi tulisan namanya!
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <span className="w-5.5 h-5.5 bg-indigo-600 text-white font-bold flex items-center justify-center rounded-full shrink-0 font-mono text-[10px]">2</span>
              <div>
                <strong className="text-slate-200 block mb-0.5">Tulis Pidato AI</strong>
                <p className="text-slate-400 leading-normal">
                  Gunakan bantuan asisten pintar Gemini di panel sebelah kanan untuk menulis naskah pidatomu secara otomatis.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <span className="w-5.5 h-5.5 bg-indigo-600 text-white font-bold flex items-center justify-center rounded-full shrink-0 font-mono text-[10px]">3</span>
              <div>
                <strong className="text-slate-200 block mb-0.5">Mulai Rekam</strong>
                <p className="text-slate-400 leading-normal">
                  Aktifkan kamera, baca naskah yang meluncur otomatis di atas kamera (teleprompter) sehingga matamu tetap menatap penonton!
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <span className="w-5.5 h-5.5 bg-indigo-600 text-white font-bold flex items-center justify-center rounded-full shrink-0 font-mono text-[10px]">4</span>
              <div>
                <strong className="text-slate-200 block mb-0.5">Simpan &amp; Bagikan</strong>
                <p className="text-slate-400 leading-normal">
                  Unduh langsung file videomu ke memori HP, atau masuk dengan akun Google untuk mengunggah otomatis ke Drive sekolah.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/5 text-center text-[10px] text-slate-500 font-medium">
            Masa Kelulusan SDN Karang Anyar 01 Pagi © 2026. Tempa Ilmu, Gapai Impian, Ukir Masa Depan Gemilang!
          </div>
        </footer>
      </div>

      {/* Floating alert/notice Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-755 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg z-50 flex items-center gap-1.5 animate-bounce">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
