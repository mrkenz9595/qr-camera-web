import React, { useState, useEffect } from 'react';
import { QrCode, Film, FileCode, CheckCircle, ExternalLink, HelpCircle, X, Wifi } from 'lucide-react';
import { ScannerTab } from './components/ScannerTab';
import { DashboardTab } from './components/DashboardTab';
import { LanHttpsGuideModal } from './components/LanHttpsGuideModal';
import { VideoItem } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'dashboard'>('scanner');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [showLanModal, setShowLanModal] = useState<boolean>(false);

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
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800/80 backdrop-blur-md px-3.5 py-2.5 sm:px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-bold">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">QR Video Recorder</h1>
                <span className="text-[10px] bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 px-1.5 py-0.2 rounded font-mono font-medium">
                  Full-Stack
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400">Quét lần 1: Bắt đầu • Quét lần 2: Dừng & Tải lên</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowLanModal(true)}
              className="text-emerald-400 hover:text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/80 px-2.5 py-1.5 rounded-xl transition border border-emerald-700/60 flex items-center space-x-1 text-xs font-semibold"
              title="Xem IP Mạng LAN & Hướng dẫn HTTPS Local"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>Mạng LAN & HTTPS</span>
            </button>
            <button
              onClick={() => setShowGuideModal(true)}
              className="text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition border border-slate-700/60"
              title="Hướng dẫn & Sơ đồ kiến trúc"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <a
              href="/vanilla.html"
              target="_blank"
              rel="noreferrer"
              className="text-xs bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-700 transition flex items-center space-x-1"
              title="Mở bản Vanilla JS thuần"
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Bản Vanilla JS</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
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

      {/* MODAL HƯỚNG DẪN & CẤU TRÚC HỆ THỐNG */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Quy trình vận hành ứng dụng</h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                <div className="font-bold text-indigo-400 text-sm mb-1">1. Quét mã QR lần 1</div>
                <p className="text-slate-400">
                  Camera tự động phát hiện mã QR. Ứng dụng đọc chuỗi String của mã, lưu làm tên file và phát tiếng bíp kích hoạt <code>MediaRecorder API</code> để bắt đầu quay phim kèm âm thanh.
                </p>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                <div className="font-bold text-red-400 text-sm mb-1">2. Quét mã QR lần 2</div>
                <p className="text-slate-400">
                  Khi đưa mã QR vào lần 2, hệ thống ngay lập tức phát 2 tiếng bíp, đóng gói video thành Blob dạng <code>[NoiDung_Ma_QR].mp4/.webm</code>.
                </p>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                <div className="font-bold text-emerald-400 text-sm mb-1">3. Tải lên và Quản lý trên Server</div>
                <p className="text-slate-400">
                  Đẩy file qua API <code>POST /api/upload-video</code> bằng <code>FormData</code>. Server Express lưu vào thư mục <code>/uploads</code> với timestamp tránh trùng lặp. Bạn có thể Xem trực tiếp, Tải về hoặc Xóa video trong Tab "Quản lý Video".
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL HƯỚNG DẪN MẠNG LAN VÀ HTTPS LOCAL */}
      <LanHttpsGuideModal
        isOpen={showLanModal}
        onClose={() => setShowLanModal(false)}
      />
    </div>
  );
}
