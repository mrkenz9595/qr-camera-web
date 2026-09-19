import React, { useState, useEffect } from 'react';
import { Wifi, ShieldCheck, ShieldAlert, Copy, Check, Terminal, Smartphone, Laptop } from 'lucide-react';
import { ServerInfo } from '../types';

interface LanHttpsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LanHttpsGuideModal({ isOpen, onClose }: LanHttpsGuideModalProps) {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [selectedOs, setSelectedOs] = useState<'windows' | 'mac' | 'linux'>('windows');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/server-info')
        .then((res) => res.json())
        .then((data) => setServerInfo(data))
        .catch((err) => console.warn('Không lấy được server-info:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const port = serverInfo?.port || 3000;
  const isHttps = serverInfo?.isHttps || false;
  const lanIps = serverInfo?.lanIps || [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">Hướng dẫn Mạng LAN & Cài đặt HTTPS Local</h3>
              <p className="text-[11px] text-slate-400">Kết nối điện thoại với máy tính để quét QR & mở Camera</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* PHẦN 1: TRẠNG THÁI HIỆN TẠI & ĐỊA CHỈ TRUY CẬP */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              <span>1. Địa chỉ truy cập từ điện thoại di động</span>
            </h4>
            {isHttps ? (
              <span className="flex items-center space-x-1 text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>HTTPS đã bật</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-[11px] bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded-full">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Chế độ HTTP (Cần HTTPS để mở Camera)</span>
              </span>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
            <p className="text-xs text-slate-400">
              Đảm bảo điện thoại và máy tính kết nối <strong>cùng một mạng Wi-Fi</strong>. Sau đó mở trình duyệt trên điện thoại và nhập:
            </p>
            {lanIps.length > 0 ? (
              lanIps.map((ip) => {
                const url = `${isHttps ? 'https' : 'http'}://${ip}:${port}`;
                return (
                  <div key={ip} className="flex items-center justify-between bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-2">
                    <span className="font-mono text-sm font-bold text-emerald-400 select-all">{url}</span>
                    <button
                      onClick={() => copyToClipboard(url)}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-md border border-slate-700 flex items-center space-x-1"
                    >
                      {copiedText === url ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === url ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-slate-400 italic">
                Sử dụng lệnh <code>ipconfig</code> (Windows) hoặc <code>ifconfig</code> (Mac/Linux) trên máy tính để tìm địa chỉ IPv4 nội bộ (ví dụ: <code>192.168.1.15:{port}</code>).
              </div>
            )}
          </div>
        </div>

        {/* PHẦN 2: TẠI SAO CẦN HTTPS VÀ HƯỚNG DẪN CÀI ĐẶT BẰNG MKCERT */}
        <div className="space-y-2.5 pt-1">
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>2. Cài đặt chứng chỉ HTTPS Local bằng công cụ chuẩn `mkcert`</span>
          </h4>

          <div className="bg-amber-950/25 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-200/90 leading-relaxed">
            <strong>⚠️ Lưu ý về Camera trên Di động:</strong> Trình duyệt di động (Safari iOS, Chrome Android) <strong>chặn quyền Camera</strong> (<code>navigator.mediaDevices.getUserMedia</code>) nếu trang web không sử dụng kết nối bảo mật <code>https://</code> hoặc <code>localhost</code>. Để điện thoại quét được QR qua LAN, máy chủ cần chứng chỉ SSL/TLS cục bộ.
          </div>

          {/* CHỌN HỆ ĐIỀU HÀNH */}
          <div className="flex space-x-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setSelectedOs('windows')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                selectedOs === 'windows'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              Windows (Choco / Scoop)
            </button>
            <button
              onClick={() => setSelectedOs('mac')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                selectedOs === 'mac'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              macOS (Homebrew)
            </button>
            <button
              onClick={() => setSelectedOs('linux')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                selectedOs === 'linux'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              Linux (Ubuntu / Debian)
            </button>
          </div>

          {/* LỆNH CÀI ĐẶT TƯƠNG ỨNG */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-3 font-mono text-xs">
            <div>
              <p className="text-slate-400 mb-1 font-sans text-[11px] font-semibold">
                Bước A: Cài đặt công cụ tạo chứng chỉ `mkcert` trên máy tính:
              </p>
              <div className="bg-slate-900 p-2.5 rounded-lg text-indigo-300 border border-slate-800 select-all">
                {selectedOs === 'windows' && '# Dùng Chocolatey hoặc Scoop:\nchoco install mkcert\n# hoặc: scoop install mkcert'}
                {selectedOs === 'mac' && '# Dùng Homebrew:\nbrew install mkcert\nbrew install nss # nếu dùng Firefox'}
                {selectedOs === 'linux' && 'sudo apt update && sudo apt install libnss3-tools\nsudo apt install mkcert # hoặc tải binary từ github'}
              </div>
            </div>

            <div>
              <p className="text-slate-400 mb-1 font-sans text-[11px] font-semibold">
                Bước B: Cài đặt Root CA vào máy tính và tạo thư mục chứng chỉ:
              </p>
              <div className="bg-slate-900 p-2.5 rounded-lg text-emerald-300 border border-slate-800 select-all">
                mkcert -install
              </div>
            </div>

            <div>
              <p className="text-slate-400 mb-1 font-sans text-[11px] font-semibold">
                Bước C: Tạo chứng chỉ SSL cho Localhost & IP mạng LAN của máy bạn:
              </p>
              <div className="bg-slate-900 p-2.5 rounded-lg text-yellow-300 border border-slate-800 select-all">
                mkdir -p ssl<br />
                {`mkcert -key-file ssl/key.pem -cert-file ssl/cert.pem localhost 127.0.0.1 ${lanIps[0] || '192.168.1.X'}`}
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-1">
                👉 Server đã cấu hình sẵn tự động nhận diện file <code>ssl/key.pem</code> và <code>ssl/cert.pem</code> khi khởi động lại!
              </p>
            </div>

            <div>
              <p className="text-slate-400 mb-1 font-sans text-[11px] font-semibold">
                Bước D: Cài Root CA lên điện thoại (để không bị cảnh báo chứng chỉ):
              </p>
              <p className="text-slate-400 font-sans text-[11px] leading-relaxed">
                Chạy lệnh <code>mkcert -CAROOT</code> trên máy tính để biết vị trí file <code>rootCA.pem</code>. Gửi file này sang điện thoại (qua AirDrop, Email hoặc Zalo/Telegram) và nhấn Cài đặt chứng chỉ tin cậy.
              </p>
            </div>
          </div>
        </div>

        {/* PHẦN 3: GIẢI PHÁP THAY THẾ NHANH KHÔNG CẦN CÀI ĐẶT SSL (NGROK / CLOUDFLARE TUNNEL) */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
            <Laptop className="w-3.5 h-3.5 text-indigo-400" />
            <span>3. Giải pháp siêu tốc thay thế: Sử dụng Cloudflare Tunnel hoặc Ngrok</span>
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Nếu bạn không muốn cài đặt CA lên điện thoại, chỉ cần mở terminal và chạy lệnh sau để nhận ngay một đường link HTTPS công khai trỏ về máy tính:
          </p>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-indigo-300 select-all">
            npx cloudflared tunnel --url http://localhost:{port}
          </div>
          <p className="text-[11px] text-slate-400">
            Cloudflare sẽ cấp một đường link dạng <code>https://xxx-xxx.trycloudflare.com</code>. Bạn chỉ cần mở link đó trên điện thoại là có ngay HTTPS chính chủ, camera mở mượt mà 100%!
          </p>
        </div>

        {/* FOOTER */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          <span className="text-[11px] text-slate-400">
            Server Express: Lắng nghe tại <code>0.0.0.0:{port}</code>
          </span>
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-600/30"
          >
            Đóng hướng dẫn
          </button>
        </div>
      </div>
    </div>
  );
}
