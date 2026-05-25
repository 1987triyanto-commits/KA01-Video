import { useState, useRef, useEffect } from 'react';
import { VideoTemplate, RecordedVideo } from '../types';
import { 
  Camera, 
  Video, 
  Square, 
  RotateCcw, 
  Download, 
  SwitchCamera, 
  Volume2, 
  Play, 
  Pause, 
  Scroll, 
  AlertCircle, 
  HelpCircle,
  Clock,
  Mic,
  Sparkles
} from 'lucide-react';

interface VideoRecorderProps {
  selectedTemplate: VideoTemplate;
  teleprompterText: string;
  onVideoAvailable: (video: RecordedVideo | null) => void;
}

export default function VideoRecorder({
  selectedTemplate,
  teleprompterText,
  onVideoAvailable
}: VideoRecorderProps) {
  // Mode Selection: 'bake' bakes frame directly to video via Canvas recording; 'direct' does normal video recording
  const [recordingMode, setRecordingMode] = useState<'bake' | 'direct'>('direct');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<RecordedVideo | null>(null);
  
  // Timer and countdowns
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0); // For mic feedback

  // Teleprompter Controls
  const [enableTeleprompter, setEnableTeleprompter] = useState(true);
  const [teleprompterSpeed, setTeleprompterSpeed] = useState<number>(3); // 1-5 speed
  const [isTeleprompterScrolling, setIsTeleprompterScrolling] = useState(false);

  // HTML Element Refs
  const videoInputRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const teleprompterContainerRef = useRef<HTMLDivElement>(null);

  // Stream & Recording Refs
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const micAnalyzerRef = useRef<{ context: AudioContext; source: MediaStreamAudioSourceNode; analyser: AnalyserNode; javascriptNode: ScriptProcessorNode } | null>(null);

  // Confetti particles state for live Canvas Draw
  const confettiParticles = useRef<any[]>([]);

  // Teleprompter scrolling loop
  const scrollTimerRef = useRef<any>(null);

  // Trigger init camera
  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    }
    return () => {
      stopCameraAndCanvas();
    };
  }, [facingMode]);

  // Handle Teleprompter auto-scroll
  useEffect(() => {
    if (isTeleprompterScrolling && teleprompterContainerRef.current) {
      if (scrollTimerRef.current) clearInterval(scrollTimerRef.current);
      
      scrollTimerRef.current = setInterval(() => {
        const el = teleprompterContainerRef.current;
        if (el) {
          // If scrolled to bottom, stop
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
            setIsTeleprompterScrolling(false);
            clearInterval(scrollTimerRef.current);
          } else {
            el.scrollTop += 1;
          }
        }
      }, 70 - teleprompterSpeed * 10); // Speed scale
    } else {
      if (scrollTimerRef.current) clearInterval(scrollTimerRef.current);
    }

    return () => {
      if (scrollTimerRef.current) clearInterval(scrollTimerRef.current);
    };
  }, [isTeleprompterScrolling, teleprompterSpeed]);

  // Automatically reset teleprompter scroll on text change
  useEffect(() => {
    if (teleprompterContainerRef.current) {
      teleprompterContainerRef.current.scrollTop = 0;
    }
    setIsTeleprompterScrolling(false);
  }, [teleprompterText]);

  // Record Duration ticker
  useEffect(() => {
    let ticker: any = null;
    if (isRecording) {
      ticker = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 180) { // Limit duration to 3 minutes max
            handleStopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordDuration(0);
    }
    return () => {
      if (ticker) clearInterval(ticker);
    };
  }, [isRecording]);

  // Draw overlay frames onto transparent canvas for live stream baking
  const initializeConfetti = () => {
    const list = [];
    for (let i = 0; i < 40; i++) {
      list.push({
        x: Math.random() * 640,
        y: Math.random() * -480,
        color: ['#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6'][Math.floor(Math.random() * 6)],
        size: Math.random() * 6 + 4,
        speedY: Math.random() * 2 + 1.5,
        speedX: Math.random() * 1 - 0.5,
        rotation: Math.random() * 360,
        rotSpeed: Math.random() * 2 - 1
      });
    }
    confettiParticles.current = list;
  };

  const drawCanvasOverlay = () => {
    const canvas = canvasRef.current;
    const video = videoInputRef.current;
    if (!canvas || !video || video.paused || video.ended) {
      animationFrameRef.current = requestAnimationFrame(drawCanvasOverlay);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw Mirror image of webcam (natural for front camera)
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 1. Draw Template Borders
    const padding = 16;
    ctx.lineWidth = 10;
    
    // Choose theme colors
    const primary = selectedTemplate.primaryColor; // hex e.g. #1E3A8A
    const secondary = selectedTemplate.secondaryColor; // gold e.g. #F59E0B

    // Draw outer golden frame border
    ctx.strokeStyle = secondary;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    // Draw inner accent frame border
    ctx.strokeStyle = primary;
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    // Draw decorative corner triangles
    ctx.fillStyle = secondary;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(14, 14);
    ctx.lineTo(40, 14);
    ctx.lineTo(14, 40);
    ctx.fill();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(canvas.width - 14, 14);
    ctx.lineTo(canvas.width - 40, 14);
    ctx.lineTo(canvas.width - 14, 40);
    ctx.fill();

    // 2. Draw Bottom Banner Box
    const bannerHeight = 55;
    const bannerY = canvas.height - bannerHeight - 14;
    ctx.fillStyle = primary;
    ctx.fillRect(14, bannerY, canvas.width - 28, bannerHeight);

    // Banner border accents
    ctx.fillStyle = secondary;
    ctx.fillRect(14, bannerY, canvas.width - 28, 4); // Banner top stripe

    // 3. Draw Bottom Banner Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px "Inter", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      selectedTemplate.bottomText, 
      canvas.width / 2, 
      bannerY + (bannerHeight / 2) + 2
    );

    // 4. Draw Badge/Lencana on Top Right
    const badgeW = 160;
    const badgeH = 25;
    const badgeX = canvas.width - badgeW - 20;
    const badgeY = 20;
    
    ctx.fillStyle = secondary;
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(badgeX + 2, badgeY + 2, badgeW - 4, badgeH - 4);

    ctx.fillStyle = '#1E3B8A'; // Contrast color text
    ctx.font = 'bold 9px "JetBrains Mono", Courier, monospace';
    ctx.fillText(
      selectedTemplate.badgeText.toUpperCase(), 
      badgeX + (badgeW / 2), 
      badgeY + (badgeH / 2) + 1
    );

    // 5. Draw animated falling confetti
    confettiParticles.current.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();

      // Update position
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;

      // Recyle particles
      if (p.y > canvas.height) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
    });

    animationFrameRef.current = requestAnimationFrame(drawCanvasOverlay);
  };

  const startCamera = async () => {
    stopCameraAndCanvas();
    setIsCameraActive(false);
    
    try {
      // Setup constraints
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
          aspectRatio: { ideal: 1.3333 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;

      if (videoInputRef.current) {
        videoInputRef.current.srcObject = mediaStream;
      }

      // Initialize audio level analyser
      startMicMonitoring(mediaStream);

      setIsCameraActive(true);
      setRecordedVideo(null);

      // Start animation loop to feed canvas if in "Bake" mode
      initializeConfetti();
      if (canvasRef.current && videoInputRef.current) {
        // Trigger drawing loop
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(drawCanvasOverlay);
      }

    } catch (err) {
      console.error('Failed to open camera/mic:', err);
      alert('Gagal membuka kamera atau mikrofon. Pastikan Anda telah memberikan izin kamera di Google Chrome/Safari handphone Anda.');
    }
  };

  const startMicMonitoring = (stream: MediaStream) => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const audioContext = new AudioCtxClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 256;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
      source.connect(analyser);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);

      javascriptNode.onaudioprocess = () => {
        analyser.getByteFrequencyData(dataArray);
        let values = 0;
        for (let i = 0; i < bufferLength; i++) {
          values += dataArray[i];
        }
        const average = values / bufferLength;
        setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
      };

      micAnalyzerRef.current = {
        context: audioContext,
        source,
        analyser,
        javascriptNode
      };
    } catch (e) {
      console.warn('Mic feedback analyser could not be initialized:', e);
    }
  };

  const stopCameraAndCanvas = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clean up Audio Analyser
    if (micAnalyzerRef.current) {
      try {
        micAnalyzerRef.current.javascriptNode.disconnect();
        micAnalyzerRef.current.source.disconnect();
        micAnalyzerRef.current.context.close();
      } catch (e) {
        // ignore
      }
      micAnalyzerRef.current = null;
    }

    setAudioLevel(0);
  };

  // Handles starting the record after 3, 2, 1 countdown
  const triggerRecordFlow = () => {
    if (!isCameraActive || isRecording) return;
    
    // Auto start teleprompter if enabled
    if (enableTeleprompter && teleprompterContainerRef.current) {
      teleprompterContainerRef.current.scrollTop = 0;
    }

    setCountdown(3);
    const countTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) {
          clearInterval(countTimer);
          return null;
        }
        if (prev <= 1) {
          clearInterval(countTimer);
          // Start actual MediaRecorder!
          startActualRecording();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startActualRecording = () => {
    chunksRef.current = [];
    let recordStream: MediaStream | null = null;

    if (recordingMode === 'bake') {
      // CANVAS ENGINE: captures frames directly from canvas + audio track from microphone
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      
      const canvasStream = canvasEl.captureStream(24);
      
      // Extract audio track from camera stream
      if (streamRef.current && streamRef.current.getAudioTracks().length > 0) {
        const audioTrack = streamRef.current.getAudioTracks()[0];
        canvasStream.addTrack(audioTrack);
      }
      recordStream = canvasStream;
    } else {
      // SAFE ENGINE: Records raw direct webcam stream
      recordStream = streamRef.current;
    }

    if (!recordStream) {
      console.error('No capture stream found to record.');
      return;
    }

    // Detect browser supported codecs
    let selectedMimeType = '';
    const possibleMimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4'
    ];

    for (const mime of possibleMimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMimeType = mime;
        break;
      }
    }

    try {
      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      const mediaRecorder = new MediaRecorder(recordStream, options);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: selectedMimeType || 'video/webm' });
        const videoUrl = URL.createObjectURL(finalBlob);
        
        const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
        const fileExt = (selectedMimeType && selectedMimeType.includes('mp4')) ? 'mp4' : 'webm';
        
        const recordedObj: RecordedVideo = {
          blob: finalBlob,
          url: videoUrl,
          duration: recordDuration,
          timestamp: new Date().toLocaleTimeString(),
          templateId: selectedTemplate.id,
          fileName: `LulusSDN_KarangAnyar01Pagi_${timestampStr}.${fileExt}`,
          mimeType: finalBlob.type
        };

        setRecordedVideo(recordedObj);
        onVideoAvailable(recordedObj);
        
        // Stop camera tracks to release lens
        stopCameraAndCanvas();
        setIsCameraActive(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Get chunks every 250ms
      setIsRecording(true);

      // Start Teleprompter scroll if enabled
      if (enableTeleprompter && teleprompterText.trim()) {
        setIsTeleprompterScrolling(true);
      }

    } catch (e) {
      console.error('Failed to start MediaRecorder:', e);
      alert('Jenis format media perekaman video tidak didukung oleh browser Anda.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTeleprompterScrolling(false);
    }
  };

  const handleReset = () => {
    setRecordedVideo(null);
    onVideoAvailable(null);
    setIsCameraActive(true);
    startCamera();
  };

  const downloadVideo = () => {
    if (!recordedVideo) return;
    const a = document.createElement('a');
    a.href = recordedVideo.url;
    a.download = recordedVideo.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-5 shadow-lg mb-6 text-slate-100" id="video_recorder_card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-lg">
            <Camera className="w-5 h-5 text-amber-400" />
          </span>
          <h2 className="text-base font-bold text-white">
            Studio Rekam Kamera
          </h2>
        </div>
        
        {/* Toggle recording engine */}
        {isCameraActive && !isRecording && (
          <div className="flex bg-slate-950/45 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setRecordingMode('direct')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                recordingMode === 'direct'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mode Stabil (iOS/Android)
            </button>
            <button
              onClick={() => setRecordingMode('bake')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                recordingMode === 'bake'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bake Bingkai
            </button>
          </div>
        )}
      </div>

      {/* Main Viewport Container */}
      <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden shadow-inner border border-white/10" id="media_viewport_container">
        {/* Mirror Mode CSS classes for selfie feed if Direct mode */}
        {isCameraActive && (
          <div className="absolute inset-0 z-0">
            {/* Direct Mirror Video element */}
            <video
              ref={videoInputRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${recordingMode === 'direct' ? 'scale-x-[-1]' : 'hidden'}`}
            />
            
            {/* Invisible Canvas used to bake frames if Canvas Mode is active */}
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className={`w-full h-full object-cover ${recordingMode === 'bake' ? 'block' : 'hidden'}`}
            />
          </div>
        )}

        {/* Dynamic visual overlay only visible on the viewfinder in "Direct" Mode */}
        {isCameraActive && recordingMode === 'direct' && (
          <div className="absolute inset-0 pointer-events-none z-10 border-[5px] flex flex-col justify-between" style={{ borderColor: selectedTemplate.secondaryColor }}>
            {/* Fine Inner Border Accent */}
            <div className="absolute inset-1.5 border-2 pointer-events-none" style={{ borderColor: selectedTemplate.primaryColor }}></div>
            
            {/* Top Lencana Badge Overlay */}
            <div className="absolute top-4 right-4 bg-amber-500 border border-white text-blue-950 font-bold px-3 py-1 text-[9px] font-mono shadow-md uppercase tracking-wide">
              {selectedTemplate.badgeText}
            </div>

            {/* Bottom Plaque Banner Overlay */}
            <div className="w-full absolute bottom-4 left-0 px-4">
              <div className="w-full text-center py-2.5 text-white font-bold text-xs md:text-sm shadow-md rounded border-t-2" style={{ backgroundColor: selectedTemplate.primaryColor, borderColor: selectedTemplate.secondaryColor }}>
                {selectedTemplate.bottomText}
              </div>
            </div>
          </div>
        )}

        {/* Visual Playback Preview Mode (When recording is complete) */}
        {recordedVideo && (
          <div className="absolute inset-0 z-20 bg-slate-950 flex items-center justify-center">
            {/* Embedded playback video */}
            <video
              ref={playbackRef}
              src={recordedVideo.url}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Player Overlay Border mirroring the template design */}
            <div className="absolute inset-0 pointer-events-none border-[5px]" style={{ borderColor: selectedTemplate.secondaryColor }}>
              <div className="absolute inset-1.5 border-2" style={{ borderColor: selectedTemplate.primaryColor }}></div>
              <div className="absolute top-4 right-4 bg-amber-500 border border-white text-blue-950 font-bold px-3 py-1 text-[9px] font-mono uppercase tracking-wide">
                {selectedTemplate.badgeText}
              </div>
              <div className="w-full absolute bottom-4 left-0 px-4">
                <div className="w-full text-center py-2 text-white font-bold text-xs md:text-sm rounded border-t-2" style={{ backgroundColor: selectedTemplate.primaryColor, borderColor: selectedTemplate.secondaryColor }}>
                  {selectedTemplate.bottomText}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3..2..1.. CountDown Panel */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-slate-950/80 z-20 flex flex-col items-center justify-center text-white" id="countdown_overlay_panel">
            <span className="text-7xl font-bold text-amber-400 animate-ping duration-1000">
              {countdown}
            </span>
            <span className="text-xs uppercase tracking-widest font-mono text-slate-300 mt-4">
              Senyum! Bersiap Rekam...
            </span>
          </div>
        )}

        {/* Teleprompter Scrolling Sheet Overlay */}
        {isCameraActive && enableTeleprompter && teleprompterText.trim() && (
          <div className="absolute top-0 inset-x-0 h-1/2 bg-slate-950/75 border-b border-white/10 p-3 z-15 flex flex-col justify-between" id="teleprompter_overlay_sheet">
            <div 
              ref={teleprompterContainerRef}
              className="w-full h-full overflow-y-auto pr-1 text-center font-semibold text-xs md:text-sm text-yellow-300 leading-relaxed font-sans scroll-smooth"
              style={{ maxHeight: '100px' }}
            >
              <p className="py-2">{teleprompterText}</p>
            </div>
            
            {/* Teleprompter scrolling controls row */}
            <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-1 pointer-events-auto">
              <span className="text-[9px] tracking-wide text-white/50 font-semibold uppercase flex items-center gap-1 font-mono">
                <Scroll className="w-3 h-3 text-amber-400 shrink-0" /> Alat Bantu Baca
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTeleprompterScrolling(!isTeleprompterScrolling)}
                  className="bg-white/15 hover:bg-white/20 text-white rounded p-1 text-[10px] font-bold flex items-center gap-0.5 transition"
                >
                  {isTeleprompterScrolling ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                  {isTeleprompterScrolling ? 'Jeda' : 'Jalan'}
                </button>
                
                <div className="flex items-center gap-1 bg-white/10 rounded px-1.5 py-0.5">
                  <span className="text-[8px] text-white/60 font-mono">Speed</span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={teleprompterSpeed}
                    onChange={(e) => setTeleprompterSpeed(Number(e.target.value))}
                    className="w-12 h-1 accent-amber-500 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Audio Indicator and record duration if active */}
        {isCameraActive && (
          <div className="absolute bottom-16 right-4 z-15 flex flex-col gap-1.5" id="rec_indicators">
            {isRecording && (
              <div className="bg-rose-600 border border-rose-500 animate-pulse text-white flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase font-mono shadow-md">
                <Clock className="w-3 h-3" /> {formatTime(recordDuration)} / 03:00
              </div>
            )}
            
            <div className="bg-slate-900/80 p-1.5 rounded-full border border-slate-750 flex items-center gap-2 justify-center shadow">
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-400 h-1.5 rounded-full transition-all duration-75"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Idle Camera Placeholder */}
        {!isCameraActive && !recordedVideo && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6" id="idle_camera_block">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow animate-pulse">
              <Camera className="w-8 h-8" />
            </div>
            
            <h3 className="text-white font-bold text-sm md:text-base mb-1.5">
              Siap Merekam Pesan Kelulusanmu!
            </h3>
            <p className="text-slate-400 text-xs max-w-sm leading-relaxed mb-5">
              Untuk memulai, klik tombol aktifkan kamera di bawah ini terlebih dahulu. Pastikan kamu memperbolehkan izin kamera &amp; mikrofon di HP-mu!
            </p>

            <button
              onClick={startCamera}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center gap-2 active:scale-95 duration-100 cursor-pointer"
              id="btn_enable_camera"
            >
              <Video className="w-4 h-4 shrink-0" /> Aktifkan Kamera &amp; Mic
            </button>
          </div>
        )}
      </div>

      {/* Control Tools under the viewfinder */}
      <div className="mt-4 flex flex-col gap-3">
        {/* Helper Instructions / Warnings */}
        {isCameraActive && !isRecording && (
          <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-xl p-3 flex gap-2 text-[11px] text-slate-300 leading-normal" id="overlay_mode_info">
            <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-indigo-400">Info Mode:</span> Menggunakan 
              {recordingMode === 'bake' 
                ? ' "Bake Bingkai". Bingkai merah/emas dan tulisan nama akan dimasukkan permanen langsung di dalam file video! Cocok untuk Laptop/HP modern.' 
                : ' "Mode Stabil". Sangat aman dan lancar untuk segala merek HP (termasuk iPhone/iPad). Desain kelulusan ditampilkan live di layar kamu saat rekam.'}
            </div>
          </div>
        )}

        {/* Buttons Action Bar */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Change Camera (front/back camera - user/environment) */}
          {isCameraActive && !isRecording && (
            <button
              onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs rounded-xl transition duration-100 flex items-center gap-1.5 border border-white/10 cursor-pointer"
              id="btn_switch_lens"
              title="Ganti Lensa (Depan/Belakang)"
            >
              <SwitchCamera className="w-4 h-4" />
              Depan/Belakang
            </button>
          )}

          {/* Record Start Button */}
          {isCameraActive && !isRecording && (
            <button
              onClick={triggerRecordFlow}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition duration-150 flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 cursor-pointer"
              id="btn_start_record"
            >
              <span className="w-3.5 h-3.5 bg-white rounded-full animate-pulse mr-0.5 shrink-0"></span>
              Mulai Rekam
            </button>
          )}

          {/* Recording stop button */}
          {isCameraActive && isRecording && (
            <button
              onClick={handleStopRecording}
              className="px-6 py-2.5 bg-slate-950 border border-white/10 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 cursor-pointer animate-pulse"
              id="btn_stop_record"
            >
              <Square className="w-4 h-4 text-rose-500 shrink-0 fill-rose-500" />
              Selesai &amp; Simpan
            </button>
          )}

          {/* playback options */}
          {recordedVideo && (
            <>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs rounded-xl transition duration-100 flex items-center gap-1.5 border border-white/10 cursor-pointer"
                id="btn_record_again"
              >
                <RotateCcw className="w-4 h-4 text-slate-500 shrink-0" />
                Rekam Ulang
              </button>

              <button
                onClick={downloadVideo}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wider uppercase rounded-xl transition-all flex items-center gap-1.5 shadow-lg hover:scale-[1.02] active:scale-95 cursor-pointer"
                id="btn_download_local"
              >
                <Download className="w-4 h-4 shrink-0 text-slate-950" />
                Unduh Video ke HP
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
