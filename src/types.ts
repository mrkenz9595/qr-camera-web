export interface VideoItem {
  filename: string;
  originalQr: string;
  size: number;
  createdAt: string;
  url: string;
}

export type ScannerStatus = 'idle' | 'recording' | 'stopping' | 'uploading';

export interface CameraDevice {
  id: string;
  label: string;
}

export interface ServerInfo {
  port: number;
  isHttps: boolean;
  lanIps: string[];
  sslCertFound: boolean;
}
