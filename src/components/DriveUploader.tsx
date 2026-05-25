import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout, getAccessToken } from '../firebase';
import { DriveUploadStatus } from '../types';
import { 
  Cloud, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  LogOut, 
  ExternalLink, 
  Copy, 
  Check, 
  FolderHeart
} from 'lucide-react';

interface DriveUploaderProps {
  videoBlob: Blob | null;
  videoFileName: string;
  videoMimeType: string;
}

export default function DriveUploader({ videoBlob, videoFileName, videoMimeType }: DriveUploaderProps) {
  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Upload State
  const [uploadStatus, setUploadStatus] = useState<DriveUploadStatus>({
    status: 'idle',
    progress: 0
  });

  // Share link copy feedback
  const [copied, setCopied] = useState(false);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login to Google failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Apakah Anda yakin ingin keluar dari akun Google?");
    if (confirmLogout) {
      await logout();
      setUploadStatus({ status: 'idle', progress: 0 });
    }
  };

  const uploadToDrive = async () => {
    if (!videoBlob) return;
    
    // Safety token check
    let token = accessToken;
    if (!token) {
      token = await getAccessToken();
    }
    
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setUploadStatus({ status: 'uploading', progress: 20 });
    
    try {
      // 1. Check or Create "Kelulusan_SDN_Karang_Anyar_01_Pagi" folder in Google Drive
      const folderQuery = encodeURIComponent(
        `name = 'Kelulusan_SDN_Karang_Anyar_01_Pagi' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
      );
      
      const folderSearchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${folderQuery}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      let folderId = '';
      if (folderSearchResponse.ok) {
        const folderSearchResult = await folderSearchResponse.json();
        if (folderSearchResult.files && folderSearchResult.files.length > 0) {
          folderId = folderSearchResult.files[0].id;
        } else {
          // Folder doesn't exist yet, create it!
          setUploadStatus({ status: 'uploading', progress: 40 });
          const folderCreateResponse = await fetch(
            'https://www.googleapis.com/drive/v3/files',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: 'Kelulusan_SDN_Karang_Anyar_01_Pagi',
                mimeType: 'application/vnd.google-apps.folder',
                description: 'Berisikan kumpulan rekaman video kesan pesan kelulusan siswa SDN Karang Anyar 01 Pagi.'
              })
            }
          );
          
          if (folderCreateResponse.ok) {
            const newFolder = await folderCreateResponse.json();
            folderId = newFolder.id;
          }
        }
      }

      setUploadStatus({ status: 'uploading', progress: 60 });

      // 2. Perform Multipart/related Upload
      const metadata = {
        name: videoFileName,
        mimeType: videoMimeType,
        parents: folderId ? [folderId] : []
      };

      const boundary = 'SDN_KARANG_ANYAR_BOUNDARY_STRING_XP';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      // Read Blob into Base64 (needed for pure client-side standard Drive REST API calls)
      const reader = new FileReader();
      const readingPromise = new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          if (e.target?.result) {
            const arr = new Uint8Array(e.target.result as ArrayBuffer);
            // Chunk conversion to avoid max stack limits on btoa
            let binary = '';
            const len = arr.byteLength;
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(arr[i]);
            }
            resolve(btoa(binary));
          } else {
            reject(new Error('Reading blob failed'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(videoBlob);
      });

      const base64Data = await readingPromise;

      setUploadStatus({ status: 'uploading', progress: 80 });

      const metadataPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}${delimiter}`;
      const mediaPart = `Content-Type: ${videoMimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64Data}${closeDelim}`;
      const multipartBody = `${delimiter}${metadataPart}${mediaPart}`;

      const uploadResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Gagal mengunggah video ke Drive.');
      }

      const uploadedFile = await uploadResponse.json();
      const fileId = uploadedFile.id;

      setUploadStatus({ status: 'uploading', progress: 90 });

      // 3. Set Web-viewable permissions (anyone with the link can view)
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
          })
        }
      );

      // 4. Retrieve official Web View Link
      const detailsResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let shareUrl = `https://drive.google.com/file/d/${fileId}/view`;
      if (detailsResponse.ok) {
        const fileDetails = await detailsResponse.json();
        if (fileDetails.webViewLink) {
          shareUrl = fileDetails.webViewLink;
        }
      }

      setUploadStatus({
        status: 'success',
        progress: 100,
        fileId,
        shareUrl
      });

    } catch (err: any) {
      console.error(err);
      setUploadStatus({
        status: 'failed',
        progress: 0,
        error: err.message || 'Terjadi gangguan saat mengunggah video Anda.'
      });
    }
  };

  const copyToClipboard = () => {
    if (!uploadStatus.shareUrl) return;
    navigator.clipboard.writeText(uploadStatus.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-lg mb-6 text-slate-100" id="drive_uploader_card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/25 rounded-lg">
            <Cloud className="w-5 h-5" />
          </span>
          <h2 className="text-sm md:text-base font-bold text-white">
            Unggah Kenangan ke Google Drive
          </h2>
        </div>
        
        {user && (
          <button
            onClick={handleLogout}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold transition"
            title="Keluar dari akun Google"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        )}
      </div>

      {needsAuth ? (
        <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-white/10 rounded-xl px-4 bg-white/2 backdrop-blur-sm">
          <FolderHeart className="w-10 h-10 text-indigo-400 mb-2.5 animate-bounce" />
          <p className="text-xs text-white font-semibold mb-1">
            Simpan Karya Kelulusanmu di Cloud!
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed mb-4">
            Masuk dengan Google untuk mengunggah rekaman video langsung ke folder khusus <strong>"Kelulusan_SDN_Karang_Anyar_01_Pagi"</strong> di Drive-mu!
          </p>
          
          {/* Sign In button with exact material styled layout */}
          <button 
            onClick={handleLogin} 
            disabled={isLoggingIn}
            className="flex items-center gap-3.5 px-5 py-2.5 border border-white/10 rounded-xl bg-white/8 hover:bg-white/15 text-white text-xs font-bold shadow-md transition active:scale-95 duration-100 disabled:opacity-50 cursor-pointer"
            id="gsi_signin_button"
          >
            {isLoggingIn ? (
              <Loader2 className="w-4.5 h-4.5 text-slate-300 animate-spin" />
            ) : (
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4.5 h-4.5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            )}
            <span>{isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Linked Account banner */}
          <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3 shadow-md">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Avatar" 
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full border border-white/20 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 bg-indigo-600 text-white font-bold flex items-center justify-center rounded-full text-xs shrink-0 uppercase shadow-sm">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
            )}
            
            <div className="text-left leading-tight">
              <p className="text-xs font-bold text-white">
                {user?.displayName || 'Siswa SDN'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {user?.email}
              </p>
            </div>
          </div>

          {!videoBlob ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-300 text-center text-xs">
              ⚠️ Silakan rekam video kesan pesannmu terlebih dahulu di atas sebelum mengunggah.
            </div>
          ) : (
            <div className="space-y-3.5">
              {uploadStatus.status === 'idle' && (
                <button
                  onClick={uploadToDrive}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl tracking-wider uppercase transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                  id="btn_start_upload"
                >
                  📤 Mulai Unggah Sekarang
                </button>
              )}

              {uploadStatus.status === 'uploading' && (
                <div className="space-y-2 py-2" id="uploading_progress_section">
                  <div className="flex justify-between items-center text-xs text-indigo-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                      Sedang memproses &amp; mengunggah...
                    </span>
                    <span className="font-mono text-indigo-400">{uploadStatus.progress}%</span>
                  </div>
                  
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadStatus.progress}%` }}
                    />
                  </div>
                  
                  <p className="text-[10px] text-slate-405 text-center italic">
                    Jangan tutup atau segarkan halaman ini selama proses berjalan
                  </p>
                </div>
              )}

              {uploadStatus.status === 'success' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-3" id="upload_success_section">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    HOORAY! Video Berhasil Disimpan ke Google Drive!
                  </div>
                  
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Satu salinan videomu telah berhasil dimasukkan ke dalam folder khusus <strong>"Kelulusan_SDN_Karang_Anyar_01_Pagi"</strong>.
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    {/* Share Link Row */}
                    <div className="flex items-center gap-2 bg-slate-950/40 border border-emerald-500/20 p-2 rounded-lg justify-between">
                      <span className="text-[10px] font-mono text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap pr-2 max-w-[200px]">
                        {uploadStatus.shareUrl}
                      </span>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Copy Link button */}
                        <button
                          onClick={copyToClipboard}
                          className="p-1.5 hover:bg-white/5 text-slate-450 rounded-md transition"
                          title="Salin Link Drive"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        {/* Open in Drive button */}
                        <a
                          href={uploadStatus.shareUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 hover:bg-white/5 text-blue-400 rounded-md transition"
                          title="Buka Video di Tab Baru"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                    
                    {copied && (
                      <span className="text-[10px] text-emerald-400 font-bold text-right -mt-1 mr-1">
                        Link berhasil disalin! Kirimkan ke gurumu!
                      </span>
                    )}
                  </div>
                </div>
              )}

              {uploadStatus.status === 'failed' && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 space-y-2 text-xs text-rose-300" id="upload_failed_block">
                  <div className="flex items-center gap-1.5 font-bold text-rose-450">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                    Proses Unggah Gagal
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Alasan: {uploadStatus.error || 'Autentikasi kedaluwarsa atau masalah berkas.'}
                  </p>
                  <button
                    onClick={uploadToDrive}
                    className="mt-1 shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[10px] uppercase tracking-wide transition active:scale-95"
                  >
                    Mencoba Mengunggah Lagi
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
