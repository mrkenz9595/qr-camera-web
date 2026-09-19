import React, { useState, useEffect } from 'react';
import { QrCode, Film } from 'lucide-react';
import { ScannerTab } from './components/ScannerTab';
import { DashboardTab } from './components/DashboardTab';
import { VideoItem } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'dashboard'>('scanner');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);

  // Tải danh sách video từ backend GET /api/videos
  const fetchVideos = async () => {
    setIsLoadingVideos(true);
    try {
      const response = await fetch('/api/videos');
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.videos)) {
          setVideos(data.videos);
        }
      }
    } catch (err) {
      console.warn('Lỗi khi tải danh sách video:', err);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* HEADER TOP BAR */}
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800/80 backdrop-blur-md px-3.5 py-3 sm:px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-bold">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">QR Video Recorder</h1>
            </div>
          </div>
        </div>
      </header>

      {/* KHÔNG GIAN NỘI DUNG CHÍNH (MAIN BODY) */}
      <main className="flex-1 flex flex-col pt-2 pb-20">
        {activeTab === 'scanner' ? (
          <ScannerTab
            onVideoUploaded={fetchVideos}
            onGoToDashboard={() => {
              setActiveTab('dashboard');
              fetchVideos();
            }}
          />
        ) : (
          <DashboardTab
            videos={videos}
            isLoading={isLoadingVideos}
            onRefresh={fetchVideos}
            onGoToScanner={() => setActiveTab('scanner')}
          />
        )}
      </main>

      {/* THANH ĐIỀU HƯỚNG DƯỚI (BOTTOM NAVIGATION BAR CHO DI ĐỘNG) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800/80 backdrop-blur-lg">
        <div className="max-w-md mx-auto grid grid-cols-2 p-1.5 gap-2">
          {/* Nút Tab 1 */}
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all ${
              activeTab === 'scanner'
                ? 'bg-indigo-600/15 text-indigo-400 font-bold border border-indigo-500/30 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
            }`}
          >
            <div className="relative">
              <QrCode className="w-5 h-5 mb-0.5" />
            </div>
            <span className="text-[11px] tracking-tight">Máy quét & Ghi hình</span>
          </button>

          {/* Nút Tab 2 */}
          <button
            onClick={() => {
              setActiveTab('dashboard');
              fetchVideos();
            }}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600/15 text-indigo-400 font-bold border border-indigo-500/30 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
            }`}
          >
            <div className="relative">
              <Film className="w-5 h-5 mb-0.5" />
              {videos.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-indigo-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full leading-tight">
                  {videos.length}
                </span>
              )}
            </div>
            <span className="text-[11px] tracking-tight">Quản lý Video</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
