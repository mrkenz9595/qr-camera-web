import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, 
  Video, 
  Square, 
  RotateCcw, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  QrCode,
  Clock,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { ScannerStatus } from '../types';
import { playStartBeep, playStopBeep, playErrorBeep, formatDuration } from '../utils/audio';

interface ScannerTabProps {
  onVideoUploaded: () => void;
  onGoToDashboard: () => void;
}

interface RecordingFormat {
  mime: string;
  ext: '.mp4' | '.webm';
}

interface RecordingSession {
  qrText: string;
  chunks: Blob[];
  stopRequested: boolean;
  canceled: boolean;
  uploadStarted: boolean;
}

const getRecordingFormat = (mimeType: string): RecordingFormat | null => {
  const mime = mimeType.trim();
  const container = mime.split(';', 1)[0].trim().toLowerCase();

  if (container === 'video/mp4') {
    return { mime, ext: '.mp4' };
  }
  if (container === 'video/webm') {
    return { mime, ext: '.webm' };
  }

  return null;
};

const resolveRecordedFormat = (
  recorderMimeType: string,
  chunks: Blob[],
): RecordingFormat | null => {
  for (const mimeType of [recorderMimeType, ...chunks.map((chunk) => chunk.type)]) {
    const format = getRecordingFormat(mimeType);
    if (format) return format;
  }

  return null;
};

export const ScannerTab: React.FC<ScannerTabProps> = ({ onVideoUploaded, onGoToDashboard }) => {
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [currentQr, setCurrentQr] = useState<string>('');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [delayRemaining, setDelayRemaining] = useState<number>(0);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [lastUploadedFile, setLastUploadedFile] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Tham chiếu DOM & API
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingSessionRef = useRef<RecordingSession | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const cooldownIntervalRef = useRef<number | null>(null);
  const stopTimeoutRef = useRef<number | null>(null);
  const stopCountdownIntervalRef = useRef<number | null>(null);
  const activeQrRef = useRef<string>('');
  const statusRef = useRef<ScannerStatus>('idle');
  const isCooldownRef = useRef<boolean>(false);
  const mimeTypeRef = useRef<RecordingFormat>({ mime: 'video/webm', ext: '.webm' });

  // Đồng bộ ref với state để tránh stale closure trong callback quét QR
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    activeQrRef.current = currentQr;
  }, [currentQr]);

  // Xác định định dạng video được hỗ trợ tốt nhất trên trình duyệt di động
  useEffect(() => {
    const checkSupportedMime = () => {
      const candidates: RecordingFormat[] = [
        { mime: 'video/mp4;codecs=avc1,mp4a.40.2', ext: '.mp4' },
        { mime: 'video/mp4', ext: '.mp4' },
        { mime: 'video/webm;codecs=vp9,opus', ext: '.webm' },
        { mime: 'video/webm;codecs=vp8,opus', ext: '.webm' },
        { mime: 'video/webm', ext: '.webm' },
      ];
      for (const item of candidates) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(item.mime)) {
          mimeTypeRef.current = item;
          console.log(`Đã chọn định dạng ghi hình: ${item.mime} (${item.ext})`);
          break;
        }
      }
    };
    checkSupportedMime();
  }, []);

  // Khởi tạo máy quét Html5Qrcode
  useEffect(() => {
    let isMounted = true;
    let isStarting = false;

    const startScanner = async () => {
      setCameraError(null);
      isStarting = true;

      // Đợi DOM render hoàn tất và có kích thước clientWidth thực
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (!isMounted) return;

      try {
        const scannerId = 'reader';
        const readerElement = document.getElementById(scannerId);
        if (!readerElement || !isMounted) return;

        // Nếu máy quét cũ đang chạy thì dừng an toàn
        if (html5QrCodeRef.current) {
          try {
            if (html5QrCodeRef.current.isScanning) {
              await html5QrCodeRef.current.stop();
            }
            html5QrCodeRef.current.clear();
          } catch (e) {
            // bỏ qua
          }
          html5QrCodeRef.current = null;
        }

        // Tạo instance mới: CHỈ HỖ TRỢ DUY NHẤT ĐỊNH DẠNG QR_CODE (loại bỏ tất cả Barcode)
        const scanner = new Html5Qrcode(scannerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        html5QrCodeRef.current = scanner;

        // Xác định kích thước qrbox an toàn dựa trên kích thước thực tế của khung
        const boxWidth = readerElement.clientWidth || 300;
        const boxHeight = readerElement.clientHeight || 300;
        const minDim = Math.min(boxWidth, boxHeight);
        const qrSize = Math.max(160, Math.floor(minDim * 0.72));

        const config = {
          fps: 15,
          qrbox: { width: qrSize, height: qrSize },
          aspectRatio: 1.0,
        };

        const onScanSuccess = (decodedText: string) => {
          if (isMounted) {
            handleQrDetected(decodedText);
          }
        };

        const onScanFailure = () => {
          // Bỏ qua frame không có QR
        };

        // Ưu tiên mở camera sau (environment) hoặc camera trước theo state
        try {
          await scanner.start({ facingMode: facingMode }, config, onScanSuccess, onScanFailure);
        } catch (firstErr) {
          console.warn('Lỗi khi mở với facingMode, thử mở camera mặc định bất kỳ:', firstErr);
          const cameras = await Html5Qrcode.getCameras().catch(() => []);
          if (cameras && cameras.length > 0) {
            await scanner.start(cameras[0].id, config, onScanSuccess, onScanFailure);
          } else {
            throw firstErr;
          }
        }

        // Tối ưu video cho iOS Safari & Android
        const vid = readerElement.querySelector('video') as HTMLVideoElement | null;
        if (vid) {
          vid.setAttribute('playsinline', 'true');
          vid.setAttribute('webkit-playsinline', 'true');
          vid.muted = true;
          vid.play().catch(() => {});
        }

        if (isMounted) {
          setIsCameraActive(true);
        }
      } catch (err: any) {
        console.error('Lỗi khởi động camera:', err);
        if (isMounted) {
          setIsCameraActive(false);
          setCameraError(
            err?.message?.includes('NotAllowedError') || err?.name === 'NotAllowedError'
              ? 'Vui lòng cấp quyền truy cập Camera trong cài đặt trình duyệt để quét mã QR và quay video.'
              : 'Không thể kết nối với camera: ' + (err?.message || 'Lỗi không xác định')
          );
        }
      } finally {
        isStarting = false;
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
              try {
                html5QrCodeRef.current?.clear();
              } catch (e) {}
              html5QrCodeRef.current = null;
            });
          } else {
            html5QrCodeRef.current.clear();
            html5QrCodeRef.current = null;
          }
        } catch (e) {
          // bỏ qua
        }
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      if (stopCountdownIntervalRef.current) clearInterval(stopCountdownIntervalRef.current);
    };
  }, [facingMode]);

  /**
   * Bắt đầu ghi hình video từ luồng camera của trình duyệt
   */
  const startRecording = async (qrText: string) => {
    try {
      const videoElement = document.querySelector('#reader video') as HTMLVideoElement | null;
      let stream: MediaStream | null = null;

      if (videoElement && videoElement.srcObject instanceof MediaStream) {
        stream = videoElement.srcObject;
      } else if (videoElement && 'captureStream' in videoElement) {
        // @ts-ignore
        stream = videoElement.captureStream(30);
      }

      // Nếu không lấy được stream từ video element, yêu cầu trực tiếp từ navigator
      if (!stream || stream.getVideoTracks().length === 0) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: true,
        });
      } else {
        // Cố gắng thêm audio track từ microphone nếu người dùng cho phép
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const combinedStream = new MediaStream([
            ...stream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ]);
          stream = combinedStream;
        } catch (e) {
          console.log('Không thể lấy luồng microphone, tiếp tục với video:', e);
        }
      }

      const auxiliaryTracks = stream.getTracks().filter((track) => (
        !videoElement?.srcObject ||
        !(videoElement.srcObject instanceof MediaStream) ||
        !videoElement.srcObject.getTracks().includes(track)
      ));

      const session: RecordingSession = {
        qrText,
        chunks: [],
        stopRequested: false,
        canceled: false,
        uploadStarted: false,
      };

      const requestedMime = mimeTypeRef.current.mime;
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, requestedMime ? { mimeType: requestedMime } : undefined);
      } catch (mimeError) {
        console.warn(`Không thể khởi tạo MediaRecorder với ${requestedMime}, dùng định dạng mặc định:`, mimeError);
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (event) => {
        if (!session.canceled && event.data && event.data.size > 0) {
          session.chunks.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder gặp lỗi:', event);
      };

      recorder.onstop = () => {
        if (mediaRecorderRef.current === recorder) {
          mediaRecorderRef.current = null;
        }

        auxiliaryTracks.forEach((track) => track.stop());

        if (session.canceled || session.uploadStarted) return;
        session.uploadStarted = true;

        const chunks = [...session.chunks];
        const format = resolveRecordedFormat(recorder.mimeType, chunks);
        if (!format) {
          const reportedTypes = [recorder.mimeType, ...chunks.map((chunk) => chunk.type)]
            .filter(Boolean)
            .join(', ');
          handleRecordingFailure(
            new Error(`Không xác định được định dạng video đã ghi${reportedTypes ? ` (${reportedTypes})` : ''}.`),
          );
          return;
        }

        void uploadRecordedVideo(chunks, format, session.qrText);
      };

      recordingSessionRef.current = session;
      mediaRecorderRef.current = recorder;
      recorder.start(); // Để trình duyệt hoàn tất một container duy nhất khi dừng quay

      // Phát âm thanh bíp và cập nhật giao diện
      playStartBeep();
      activeQrRef.current = qrText;
      statusRef.current = 'recording';
      setCurrentQr(qrText);
      setStatus('recording');
      setRecordingSeconds(0);
      setLastUploadedFile(null);

      // Đếm giây quay video
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Thời gian hồi (cooldown) 2.5 giây để tránh quét lặp mã vừa đưa vào
      isCooldownRef.current = true;
      setCooldownRemaining(3);
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = window.setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1) {
            if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
            isCooldownRef.current = false;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error('Lỗi khi kích hoạt MediaRecorder:', err);
      alert('Không thể bắt đầu ghi hình: ' + (err?.message || 'Trình duyệt không hỗ trợ MediaRecorder'));
      setStatus('idle');
    }
  };

  const handleRecordingFailure = (error: Error) => {
    console.error('Lỗi khi hoàn tất video:', error);
    alert('Không thể lưu video: ' + error.message);

    const session = recordingSessionRef.current;
    if (session) {
      const videoElement = document.querySelector('#reader video') as HTMLVideoElement | null;
      const auxiliaryTracks = mediaRecorderRef.current
        ? Array.from(new Set(
            (mediaRecorderRef.current.stream?.getTracks() || []).filter((track) => (
              !videoElement?.srcObject ||
              !(videoElement.srcObject instanceof MediaStream) ||
              !videoElement.srcObject.getTracks().includes(track)
            ))
          ))
        : [];
      auxiliaryTracks.forEach((track) => track.stop());
    }

    recordingSessionRef.current = null;
    mediaRecorderRef.current = null;
    setStatus('idle');
    setCurrentQr('');
    setUploadMessage('');
  };

  /**
   * Dừng ghi hình ngay lập tức và tiến hành tải video lên server
   */
  const executeStop = () => {
    const session = recordingSessionRef.current;
    const recorder = mediaRecorderRef.current;
    if (!session || session.canceled || session.stopRequested || !recorder || recorder.state === 'inactive') {
      return;
    }
    session.stopRequested = true;
    statusRef.current = 'uploading';

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    if (stopCountdownIntervalRef.current) {
      clearInterval(stopCountdownIntervalRef.current);
      stopCountdownIntervalRef.current = null;
    }
    isCooldownRef.current = false;
    setCooldownRemaining(0);
    setDelayRemaining(0);

    playStopBeep();
    setStatus('uploading');
    setUploadMessage('Đang hoàn tất video...');
    try {
      recorder.stop();
    } catch (err: any) {
      handleRecordingFailure(err instanceof Error ? err : new Error(String(err)));
    }
  };

  /**
   * Kích hoạt dừng có độ trễ 2 giây sau khi quét QR lần 2
   */
  const stopRecordingWithDelay = () => {
    const session = recordingSessionRef.current;
    // Nếu đang trong quá trình đếm ngược dừng thì bỏ qua quét lặp
    if (statusRef.current !== 'recording' || !session || session.stopRequested || session.canceled) return;

    statusRef.current = 'stopping';
    setStatus('stopping');
    setDelayRemaining(2);

    let timeLeft = 2;
    if (stopCountdownIntervalRef.current) clearInterval(stopCountdownIntervalRef.current);
    stopCountdownIntervalRef.current = window.setInterval(() => {
      timeLeft -= 1;
      setDelayRemaining(timeLeft);
      if (timeLeft <= 0 && stopCountdownIntervalRef.current) {
        clearInterval(stopCountdownIntervalRef.current);
        stopCountdownIntervalRef.current = null;
      }
    }, 1000);

    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    stopTimeoutRef.current = window.setTimeout(() => {
      executeStop();
    }, 2000);
  };

  /**
   * Dừng ghi hình (cho nút bấm thủ công)
   */
  const stopRecording = () => {
    executeStop();
  };

  /**
   * Hủy bỏ quá trình quay video mà không lưu
   */
  const cancelRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    if (stopCountdownIntervalRef.current) clearInterval(stopCountdownIntervalRef.current);
    timerIntervalRef.current = null;
    cooldownIntervalRef.current = null;
    stopTimeoutRef.current = null;
    stopCountdownIntervalRef.current = null;
    isCooldownRef.current = false;
    setCooldownRemaining(0);
    setDelayRemaining(0);

    const session = recordingSessionRef.current;
    if (session) {
      session.canceled = true;
      session.chunks = [];
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      const videoElement = document.querySelector('#reader video') as HTMLVideoElement | null;
      const auxiliaryTracks = Array.from(new Set(
        (recorder.stream?.getTracks() || []).filter((track) => (
          !videoElement?.srcObject ||
          !(videoElement.srcObject instanceof MediaStream) ||
          !videoElement.srcObject.getTracks().includes(track)
        ))
      ));

      recorder.ondataavailable = null;
      recorder.onstop = null;
      try {
        recorder.stop();
      } catch (err) {
        console.warn('Không thể dừng MediaRecorder khi hủy:', err);
      }

      auxiliaryTracks.forEach((track) => track.stop());
    }

    mediaRecorderRef.current = null;
    recordingSessionRef.current = null;
    statusRef.current = 'idle';
    setStatus('idle');
    setCurrentQr('');
    setUploadMessage('');
  };

  /**
   * Đóng gói Blob đã hoàn tất và gửi qua API POST /api/upload-video
   */
  const uploadRecordedVideo = async (
    chunks: Blob[],
    format: RecordingFormat,
    qrText: string,
  ) => {
    setStatus('uploading');
    setUploadMessage('Đang đóng gói video...');

    try {
      const videoBlob = new Blob(chunks, { type: format.mime });

      if (videoBlob.size === 0) {
        throw new Error('Dung lượng video bằng 0, không có dữ liệu để tải lên.');
      }

      setUploadMessage(`Đang tải video lên server (${(videoBlob.size / 1024 / 1024).toFixed(2)} MB)...`);

      // Chuẩn bị tên file: [Nội dung mã QR].ext
      const qrCodeName = qrText.trim() || 'QR_Video';
      const cleanFileName = `${qrCodeName}${format.ext}`;

      const formData = new FormData();
      formData.append('video', videoBlob, cleanFileName);
      formData.append('qrCode', qrCodeName);

      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Lỗi từ máy chủ khi lưu video');
      }

      setLastUploadedFile(data.video.filename);
      onVideoUploaded();
      statusRef.current = 'idle';
      setStatus('idle');
      setCurrentQr('');
      setUploadMessage('');
    } catch (err: any) {
      console.error('Lỗi khi tải video lên server:', err);
      alert('Tải video thất bại: ' + (err?.message || 'Lỗi mạng hoặc server không phản hồi'));
      statusRef.current = 'idle';
      setStatus('idle');
      setCurrentQr('');
      setUploadMessage('');
    } finally {
      recordingSessionRef.current = null;
    }
  };

  /**
   * Xử lý sự kiện khi thư viện quét thấy mã QR / Barcode
   */
  const handleQrDetected = async (decodedText: string) => {
    const currentStatus = statusRef.current;
    const cleanText = decodedText.trim();
    if (!cleanText) return;

    // Trạng thái 1: Đang chờ quét lần 1 -> Kiểm tra xem mã đã có video trong CSDL chưa
    if (currentStatus === 'idle') {
      console.log(`[QR Lần 1] Phát hiện mã: ${cleanText} -> Kiểm tra trùng lặp trên CSDL...`);

      try {
        const checkRes = await fetch(`/api/check-qr/${encodeURIComponent(cleanText)}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.exists) {
            // ĐÃ TỒN TẠI TRONG CƠ SỞ DỮ LIỆU: Từ chối quay video!
            console.warn(`[Từ chối quay] Mã QR "${cleanText}" đã có trong CSDL (tệp: ${checkData.filename})`);
            playErrorBeep();
            setDuplicateWarning(`Mã "${cleanText}" đã được quay và lưu trước đó (${checkData.filename}). Hệ thống từ chối quay video!`);
            return;
          }
        }
      } catch (checkErr) {
        console.warn('Lỗi khi kiểm tra mã QR với server:', checkErr);
      }

      // Xóa cảnh báo cũ nếu mã hợp lệ
      setDuplicateWarning(null);
      startRecording(cleanText);
      return;
    }

    // Trạng thái 2: Đang ghi hình -> Quét lần 2 để Dừng (chờ 2 giây rồi mới kết thúc ghi hình và tải lên)
    if (currentStatus === 'recording') {
      // Kiểm tra nếu còn trong thời gian hồi (cooldown), bỏ qua để không bị tắt nhầm
      if (isCooldownRef.current) {
        console.log(`[QR Lần 2] Bị bỏ qua do đang trong thời gian hồi (${cooldownRemaining}s)`);
        return;
      }

      console.log(`[QR Lần 2] Phát hiện mã QR: ${cleanText} -> Kích hoạt dừng sau 2 giây...`);
      stopRecordingWithDelay();
    }
  };

  /**
   * Đổi camera trước / sau
   */
  const toggleCamera = () => {
    if (status === 'recording' || status === 'stopping') {
      alert('Vui lòng dừng quay video trước khi đổi camera.');
      return;
    }
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto w-full px-3 py-2 space-y-3">
      {/* THÔNG BÁO TỪ CHỐI QUAY NẾU MÃ QR ĐÃ TỒN TẠI */}
      {duplicateWarning && (
        <div className="bg-rose-950/90 border-2 border-rose-500 rounded-xl p-3 flex items-start space-x-2.5 animate-in fade-in duration-200 shadow-lg shadow-rose-950/50">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-rose-200 font-bold text-xs uppercase tracking-wide">
              Từ chối quay video
            </div>
            <div className="text-slate-200 text-xs mt-0.5 leading-relaxed font-medium">
              {duplicateWarning}
            </div>
          </div>
          <button
            onClick={() => setDuplicateWarning(null)}
            className="text-slate-400 hover:text-white p-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* THANH TRẠNG THÁI TRÊN CÙNG */}
      <div className="flex items-center justify-between bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 backdrop-blur-sm shadow-sm">
        <div className="flex items-center space-x-2">
          {status === 'recording' ? (
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          ) : status === 'stopping' ? (
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          ) : (
            <span className="inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {status === 'recording'
              ? 'ĐANG GHI HÌNH'
              : status === 'stopping'
              ? `KẾT THÚC SAU ${delayRemaining}S`
              : status === 'uploading'
              ? 'ĐANG TẢI LÊN'
              : 'MÁY QUÉT QR SẴN SÀNG'}
          </span>
        </div>

        {(status === 'recording' || status === 'stopping') && (
          <div className="flex items-center space-x-1.5 bg-red-950/80 text-red-300 border border-red-800/60 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>{formatDuration(recordingSeconds)}</span>
          </div>
        )}

        {status === 'idle' && (
          <button
            onClick={toggleCamera}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-700/60 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors border border-slate-600/40"
            title="Đổi camera trước/sau"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{facingMode === 'environment' ? 'Camera sau' : 'Camera trước'}</span>
          </button>
        )}
      </div>

      {/* THÔNG BÁO TIẾN TRÌNH & HƯỚNG DẪN QUÉT */}
      {status === 'idle' && (
        <div className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/40 rounded-xl p-3 text-slate-200 text-xs flex items-start space-x-2.5">
          <div className="bg-blue-600/20 text-blue-400 p-1.5 rounded-lg shrink-0 mt-0.5">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-blue-300 text-sm">Bước 1: Quét mã QR để bắt đầu</div>
            <div className="text-slate-400 mt-0.5 leading-relaxed">
              Hướng camera vào mã QR. Ứng dụng đọc nội dung mã QR làm tên video và tự động kích hoạt quay phim.
            </div>
          </div>
        </div>
      )}

      {(status === 'recording' || status === 'stopping') && (
        <div className={`bg-gradient-to-r rounded-xl p-3 text-slate-100 shadow-lg transition-all duration-300 ${
          status === 'stopping'
            ? 'from-amber-950/90 to-red-950/90 border-2 border-amber-500 shadow-amber-950/50'
            : 'from-red-950/90 to-amber-950/80 border-2 border-red-500/70 shadow-red-950/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {status === 'stopping' ? (
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              ) : (
                <Video className="w-5 h-5 text-red-400 animate-pulse" />
              )}
              <span className="font-bold text-sm text-red-200">
                {status === 'stopping' ? `Đang hoàn tất cảnh quay (còn ${delayRemaining}s)...` : 'Đang quay video'}
              </span>
            </div>
            <span className="text-xs bg-red-900/60 border border-red-700/60 text-red-200 px-2 py-0.5 rounded-full font-mono">
              {formatDuration(recordingSeconds)}
            </span>
          </div>

          <div className="mt-2 bg-slate-900/80 p-2.5 rounded-lg border border-red-900/40">
            <div className="text-xs text-slate-400">Nội dung mã QR (Tên file):</div>
            <div className="text-sm font-mono font-bold text-amber-300 break-all select-all mt-0.5">
              {currentQr}
            </div>
          </div>

          <div className="mt-2.5 text-xs text-slate-300 flex items-center justify-between">
            {status === 'stopping' ? (
              <span className="text-amber-300 font-semibold flex items-center space-x-1.5 animate-pulse">
                <span>⏱️ Đang ghi thêm 2 giây trước khi dừng & tải lên server...</span>
              </span>
            ) : cooldownRemaining > 0 ? (
              <span className="text-amber-400 flex items-center space-x-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang ổn định luồng quay ({cooldownRemaining}s)...</span>
              </span>
            ) : (
              <span className="text-emerald-400 font-medium animate-pulse">
                ⚡ Đưa mã QR vào lần 2 để DỪNG ghi hình
              </span>
            )}
          </div>
        </div>
      )}

      {/* KHUNG CAMERA QUÉT HTML5-QRCODE */}
      <div className="relative w-full aspect-square min-h-[300px] bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl flex items-center justify-center">
        {/* Container render của html5-qrcode */}
        <div id="reader" className="w-full h-full min-h-[300px]"></div>

        {/* Trạng thái đang tải camera */}
        {!isCameraActive && !cameraError && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center z-10">
            <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mb-3"></div>
            <span className="text-slate-300 text-xs font-medium">Đang khởi tạo máy ảnh...</span>
            <span className="text-slate-500 text-[11px] mt-1">Đảm bảo trình duyệt đã cấp quyền Camera</span>
          </div>
        )}

        {/* Khung ngắm quét mã visual targeting */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8 z-10">
          <div className={`w-3/4 h-3/4 border-2 rounded-2xl relative transition-all duration-300 ${
            status === 'stopping'
              ? 'border-amber-400/80 shadow-inner shadow-amber-500/30'
              : status === 'recording'
              ? 'border-red-500/80 shadow-inner shadow-red-500/20'
              : 'border-emerald-400/70 shadow-inner shadow-emerald-500/20'
          }`}>
            {/* 4 góc vuông */}
            <div className={`absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 ${
              status === 'stopping' ? 'border-amber-400' : status === 'recording' ? 'border-red-400' : 'border-emerald-400'
            } rounded-tl`}></div>
            <div className={`absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 ${
              status === 'stopping' ? 'border-amber-400' : status === 'recording' ? 'border-red-400' : 'border-emerald-400'
            } rounded-tr`}></div>
            <div className={`absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 ${
              status === 'stopping' ? 'border-amber-400' : status === 'recording' ? 'border-red-400' : 'border-emerald-400'
            } rounded-bl`}></div>
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 ${
              status === 'stopping' ? 'border-amber-400' : status === 'recording' ? 'border-red-400' : 'border-emerald-400'
            } rounded-br`}></div>

            {/* Tia quét laser chuyển động */}
            <div className={`w-full h-0.5 absolute left-0 opacity-75 animate-bounce ${
              status === 'stopping'
                ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,1)]'
                : status === 'recording'
                ? 'bg-red-400 shadow-[0_0_12px_rgba(239,68,68,1)]'
                : 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,1)]'
            }`} style={{ animationDuration: '2s' }}></div>
          </div>
        </div>

        {/* Lỗi camera nếu bị từ chối */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center z-20">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
            <div className="text-white font-semibold text-base mb-1">Không thể mở Camera</div>
            <p className="text-slate-400 text-xs leading-relaxed mb-4">{cameraError}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow"
            >
              Thử lại & Tải lại trang
            </button>
          </div>
        )}

        {/* Màn hình Loading khi tải video lên server */}
        {status === 'uploading' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30">
            <div className="relative mb-4">
              <UploadCloud className="w-14 h-14 text-indigo-400 animate-bounce" />
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 border-t-indigo-400 animate-spin"></div>
            </div>
            <div className="text-white font-bold text-base mb-1">Đang tải video lên server</div>
            <p className="text-slate-400 text-xs text-center max-w-xs">{uploadMessage}</p>
            <div className="w-48 bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
              <div className="bg-indigo-500 h-full w-2/3 animate-pulse"></div>
            </div>
          </div>
        )}
      </div>

      {/* CÁC NÚT ĐIỀU KHIỂN THỦ CÔNG KHI ĐANG QUAY HOẶC CHỜ DỪNG */}
      {(status === 'recording' || status === 'stopping') && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={executeStop}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-red-900/40 transition active:scale-95"
          >
            <Square className="w-4 h-4 fill-white" />
            <span className="text-sm">{status === 'stopping' ? 'Dừng ngay' : 'Dừng quay & Lưu'}</span>
          </button>

          <button
            onClick={cancelRecording}
            className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 px-4 rounded-xl border border-slate-700 transition active:scale-95 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Hủy bỏ</span>
          </button>
        </div>
      )}

      {/* THÔNG BÁO TẢI LÊN THÀNH CÔNG VÀ NÚT XEM NGAY */}
      {lastUploadedFile && status === 'idle' && (
        <div className="bg-emerald-950/70 border border-emerald-600/50 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="line-clamp-1">Đã lưu: <strong className="text-white">{lastUploadedFile}</strong></span>
          </div>
          <button
            onClick={onGoToDashboard}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1 rounded-lg shrink-0 transition"
          >
            Xem video
          </button>
        </div>
      )}
    </div>
  );
};
