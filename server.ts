import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini client to prevent crashes if key is initially absent
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === '') {
      console.warn('⚠️ GEMINI_API_KEY is not configured or holds a placeholder. Falling back to default script generation.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || 'DUMMY_KEY',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// API: Generate graduation memory script (Kesan, Pesan, Motivasi) for student Teleprompter
app.post('/api/generate-motivation', async (req, res) => {
  try {
    const { studentName, vibe, teacherName, memory } = req.body;

    const nameToUse = studentName?.trim() || 'Siswa Berbakat';
    const vibeName = vibe || 'semangat';
    const teacherToUse = teacherName?.trim() || 'Bapak/Ibu Guru';
    const memoryToUse = memory?.trim() || 'belajar dan bermain bersama teman-teman';

    // Verify API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === '') {
      // Return a highly beautiful Indonesian default template script if API key is not configured yet
      let defaultScript = '';
      if (vibeName === 'haru') {
        defaultScript = `Halo semuanya, saya ${nameToUse}. Hari ini, rasa haru menyelimuti hati saya saat melepas kebersamaan di SDN Karang Anyar 01 Pagi. Terima kasih banyak untuk ${teacherToUse} yang telah membimbing kami sabar dari tidak tahu apa-apa menjadi mengerti banyak hal. Kenangan manis saat ${memoryToUse} tidak akan pernah saya lupakan. Semoga bimbingan Bapak dan Ibu Guru menjadi berkah, dan kami semua bisa sukses di jenjang SMP nanti. Terima kasih SDN Karang Anyar 01 Pagi, kami akan selalu mencintaimu!`;
      } else if (vibeName === 'ceria') {
        defaultScript = `Hai! Saya ${nameToUse}! Yeeey, akhirnya kita lulus dari SDN Karang Anyar 01 Pagi! Rasanya seru sekali selama 6 tahun di sini, terutama waktu kita ${memoryToUse}. Oh ya, terima kasih yang luar biasa untuk ${teacherToUse} yang selalu sabar dan asyik mengajar kami! Buat teman-teman semua: terus semangat, jangan malas belajar di SMP nanti, ya! Kita pasti bisa meraih mimpi kita berkibar tinggi! Sukses selalu untuk angkatan kelulusan kita!`;
      } else if (vibeName === 'santai') {
        defaultScript = `Halo teman-teman dan guru-guru hebat SDN Karang Anyar 01 Pagi. Saya ${nameToUse}. Kelulusan ini adalah awal dari petualangan baru kita. Terima kasih untuk ${teacherToUse} atas petuah dan ilmunya selama ini. Ingat tidak waktu kita ${memoryToUse}? Itu santai dan seru sekali. Pesan saya untuk kita semua: jadilah versi terbaik dirimu sendiri, nikmati setiap langkah perjalanan ke SMP, dan jangan lupa bahagia. Sampai jumpa di masa depan!`;
      } else {
        // Semangat
        defaultScript = `Merdeka! Halo semuanya, saya ${nameToUse} dari Angkatan Kelulusan SDN Karang Anyar 01 Pagi! Hari ini kami resmi lulus! Terima kasih setinggi-tingginya kepada seluruh pahlawan tanpa jasa, terutama ${teacherToUse} yang mendidik kami tanpa lelah. Kenangan terbaik saya adalah sewaktu ${memoryToUse}, membakar semangat juang kami! Teman-teman, ayo kita gantungkan cita-cita setinggi langit! Jangan pernah takut gagal, terus berkarya dan jadikan SDN Karang Anyar 01 Pagi bangga pada kita semua! Semangaat!`;
      }

      return res.json({ 
        success: true, 
        script: defaultScript,
        fallback: true,
        message: "Menggunakan naskah templat default karena kunci API belum diatur di Settings."
      });
    }

    const ai = getGeminiClient();

    let vibeInstruction = '';
    if (vibeName === 'haru') {
      vibeInstruction = 'sedih, menyentuh hati, penuh rasa syukur, berlinang air mata kebahagiaan, dan puitis.';
    } else if (vibeName === 'ceria') {
      vibeInstruction = 'sangat ceria, penuh humor yang sopan, ekspresif, berenergi tinggi, banyak kata-kata seru.';
    } else if (vibeName === 'santai') {
      vibeInstruction = 'santai, keren (cool), aesthetic, mengalir tenang, ramah dan bijak.';
    } else {
      vibeInstruction = 'membakar semangat, patriotik/penuh motivasi tinggi, optimis, penuh pekikan cita-cita sukses.';
    }

    const prompt = `Anda adalah penulis naskah kelulusan sekolah dasar yang sangat mahir berbahasa Indonesia.
Buatkan satu naskah pidato kesan, pesan, dan motivasi kelulusan singkat untuk siswa bernama "${nameToUse}" dari sekolah "SDN Karang Anyar 01 Pagi".
Naskah ini akan dibacakan langsung di depan kamera smartphone oleh siswa tersebut, jadi harus sangat natural, mudah diucapkan, dan pas dibacakan dalam durasi kurang dari 1,5 menit (sekitar 120-170 kata).

Ketentuan Detail Naskah:
1. Nada bicara/vibe harus: ${vibeInstruction}
2. Harus menyebutkan terima kasih yang tulus khusus untuk guru bernama: "${teacherToUse}"
3. Harus mengaitkan kenangan indah atau lucu di sekolah ini, yaitu tentang: "${memoryToUse}"
4. Harus menyebutkan nama sekolah "SDN Karang Anyar 01 Pagi" dengan bangga.
5. Akhiri dengan baris pembakar semangat atau motivasi masa depan untuk teman-teman seangkatannya.
6. Berikan HANYA teks pidatonya saja tanpa instruksi panggung, tanda kurung tindakan (seperti *tersenyum*), atau teks pembuka/penutup tambahan agar bisa langsung dibaca di layar teleprompter.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah penulis naskah pidato kelulusan sekolah dasar SDN Karang Anyar 01 Pagi yang kreatif, menyentuh, dan inspiratif.",
        temperature: 0.8,
      }
    });

    const generatedText = response.text || '';
    if (!generatedText) {
      throw new Error('Model returned an empty response.');
    }

    return res.json({
      success: true,
      script: generatedText.trim(),
      fallback: false
    });

  } catch (error: any) {
    console.error('API Error in script generator:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gagal menghasilkan naskah pidato.'
    });
  }
});

// Configure Vite middleware in development or serve built bundle in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server loaded as Express middleware.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static asset serving enabled.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Dedicated server running on http://localhost:${PORT}`);
  });
}

startServer();
