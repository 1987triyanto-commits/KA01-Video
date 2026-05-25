export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  textColor: string;
  bottomText: string;
  badgeText: string;
  visualTheme: 'graduation' | 'teacher' | 'future' | 'friends';
}

export interface ScriptSuggestion {
  vibe: 'semangat' | 'haru' | 'ceria' | 'santai';
  teacherName: string;
  memory: string;
  generatedText: string;
}

export interface RecordedVideo {
  blob: Blob;
  url: string;
  duration: number; // in seconds
  timestamp: string;
  templateId: string;
  fileName: string;
  mimeType: string;
}

export interface DriveUploadStatus {
  status: 'idle' | 'auth_checking' | 'uploading' | 'success' | 'failed';
  progress: number;
  fileId?: string;
  shareUrl?: string;
  error?: string;
}
