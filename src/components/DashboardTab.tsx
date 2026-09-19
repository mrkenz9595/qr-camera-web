import React, { useState } from 'react';
import { 
  Search, 
  Play, 
  Download, 
  Trash2, 
  RefreshCw, 
  Film, 
  Calendar, 
  HardDrive, 
  QrCode, 
  X, 
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react';
import { VideoItem } from '../types';
import { formatBytes } from '../utils/audio';

interface DashboardTabProps {
  videos: VideoItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onGoToScanner: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  videos,
  isLoading,
  onRefresh,
  onGoToScanner,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<VideoItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lọc video theo nội dung mã QR hoặc tên tệp
  const filteredVideos = videos.filter((video) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (video.originalQr && video.originalQr.toLowerCase().includes(q)) ||
      video.filename.toLowerCase().includes(q)
    );
  });

  // Xóa video khỏi server
  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/videos/${encodeURIComponent(videoToDelete.filename)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Lỗi khi xóa video');
      }
      setVideoToDelete(null);
      onRefresh();
    } catch (err: any) {
      alert('Không thể xóa video: ' + (err?.message || 'Lỗi không xác định'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Tải video về máy điện thoại (Hỗ trợ mạng nội bộ HTTPS & Self-signed certs)
  const handleDownload = async (video: VideoItem) => {
    const downloadUrl = `/api/videos/${encodeURIComponent(video.filename)}/download`;

    try {
      // Thử dùng fetch lấy Blob trước để tránh trình duyệt báo lỗi mạng khi click direct link trên HTTPS self-signed
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Không thể tải tệp từ máy chủ');

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = video.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 2000);
    } catch (e) {
      // Fallback: Mở link tải trực tiếp nếu fetch blob gặp giới hạn bộ nhớ
      console.warn('Fallback tải file qua thẻ link:', e);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = video.filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Sao chép nội dung mã QR vào clipboard
  const handleCopyQr = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Định dạng ngày giờ thân thiện theo múi giờ Việt Nam
  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full px-3 py-2 space-y-3 pb-24">
      {/* THANH CÔNG CỤ TÌM KIẾM & LÀM MỚI */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo nội dung mã QR..."
            className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 p-2.5 rounded-xl transition flex items-center justify-center shrink-0"
          title="Làm mới danh sách"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* THỐNG KÊ NHANH */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Tổng số: <strong className="text-slate-200">{videos.length} video</strong>
          {searchQuery && ` (Khớp ${filteredVideos.length})`}
        </span>
      </div>

      {/* DANH SÁCH LƯỚI VIDEO (GRID) */}
      {filteredVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-800/40 border border-slate-700/60 rounded-2xl">
          <Film className="w-12 h-12 text-slate-600 mb-3" />
          <div className="text-slate-300 font-semibold text-sm mb-1">
            {searchQuery ? 'Không tìm thấy video phù hợp' : 'Chưa có video nào trên server'}
          </div>
          <p className="text-slate-400 text-xs max-w-xs mb-4">
            {searchQuery
              ? 'Hãy thử tìm bằng từ khóa khác hoặc xóa nội dung ô tìm kiếm.'
              : 'Hãy chuyển sang tab Máy quét để ghi hình video đầu tiên.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onGoToScanner}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-900/40 transition flex items-center space-x-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span>Quét mã và ghi hình ngay</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredVideos.map((video) => (
            <div
              key={video.filename}
              className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-sm hover:border-slate-600 transition flex flex-col group"
            >
              {/* PHẦN PREVIEW VIDEO / THUMBNAIL */}
              <div 
                className="relative aspect-video bg-black cursor-pointer overflow-hidden flex items-center justify-center group/thumb"
                onClick={() => setPlayingVideo(video)}
              >
                <video
                  src={video.url}
                  preload="metadata"
                  className="w-full h-full object-cover opacity-85 group-hover/thumb:opacity-95 transition"
                />
                
                {/* Nút Play nổi bật */}
                <div className="absolute inset-0 bg-black/40 group-hover/thumb:bg-black/20 flex items-center justify-center transition">
                  <div className="w-11 h-11 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Badge dung lượng */}
                <div className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-sm text-slate-200 text-[10px] font-mono px-2 py-0.5 rounded-md">
                  {formatBytes(video.size)}
                </div>
              </div>

              {/* THÔNG TIN CHI TIẾT */}
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                <div>
                  {/* Badge nội dung QR */}
                  <div className="flex items-start justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center space-x-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-lg line-clamp-1 break-all">
                      <QrCode className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{video.originalQr || 'Mã QR'}</span>
                    </div>

                    <button
                      onClick={() => handleCopyQr(video.originalQr, video.filename)}
                      className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-700/60 transition shrink-0"
                      title="Sao chép nội dung mã QR"
                    >
                      {copiedId === video.filename ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Tên tệp lưu trữ */}
                  <div className="text-xs text-slate-300 font-mono line-clamp-1" title={video.filename}>
                    {video.filename}
                  </div>

                  {/* Ngày giờ tạo */}
                  <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{formatDate(video.createdAt)}</span>
                  </div>
                </div>

                {/* CÁC NÚT HÀNH ĐỘNG (XEM, TẢI VỀ, XÓA) */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-700/60">
                  <button
                    onClick={() => setPlayingVideo(video)}
                    className="flex items-center justify-center space-x-1 bg-slate-700/60 hover:bg-indigo-600 text-slate-200 hover:text-white py-1.5 rounded-lg text-xs font-medium transition"
                    title="Xem trực tiếp trên trình duyệt"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Xem</span>
                  </button>

                  <button
                    onClick={() => handleDownload(video)}
                    className="flex items-center justify-center space-x-1 bg-slate-700/60 hover:bg-emerald-600 text-slate-200 hover:text-white py-1.5 rounded-lg text-xs font-medium transition"
                    title="Tải về bộ nhớ điện thoại"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải về</span>
                  </button>

                  <button
                    onClick={() => setVideoToDelete(video)}
                    className="flex items-center justify-center space-x-1 bg-slate-700/60 hover:bg-rose-600 text-rose-300 hover:text-white py-1.5 rounded-lg text-xs font-medium transition"
                    title="Xóa video khỏi server"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL XEM TRỰC TIẾP VIDEO (PLAY MODAL) */}
      {playingVideo && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-3.5 bg-slate-800/90 border-b border-slate-700">
              <div className="flex items-center space-x-2 truncate pr-2">
                <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate font-mono">
                  {playingVideo.originalQr}
                </span>
              </div>
              <button
                onClick={() => setPlayingVideo(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden">
              <video
                src={playingVideo.url}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[60vh] object-contain"
              />
            </div>

            {/* Footer Modal với nút Tải xuống */}
            <div className="p-3 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                <span>{formatBytes(playingVideo.size)}</span>
                <span className="mx-1.5">•</span>
                <span>{formatDate(playingVideo.createdAt)}</span>
              </div>

              <button
                onClick={() => handleDownload(playingVideo)}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải về điện thoại</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA VIDEO (DELETE CONFIRMATION) */}
      {videoToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3">
            <div className="w-11 h-11 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/60 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <div className="text-base font-bold text-white mb-1">Xác nhận xóa video?</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tệp video <strong className="text-slate-200 font-mono">"{videoToDelete.filename}"</strong> sẽ bị xóa vĩnh viễn khỏi thư mục /uploads của server.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setVideoToDelete(null)}
                disabled={isDeleting}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2.5 rounded-xl border border-slate-700 transition"
              >
                Hủy bỏ
              </button>

              <button
                onClick={handleDeleteVideo}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2.5 rounded-xl shadow-lg shadow-rose-900/40 transition flex items-center justify-center space-x-1"
              >
                {isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
