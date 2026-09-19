import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import os from 'os';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Khởi tạo thư mục lưu trữ video nếu chưa tồn tại
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cấu hình lưu trữ Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Lấy nội dung QR từ body hoặc từ tên file gửi lên
    const rawQr = req.body?.qrCode || req.body?.title || path.parse(file.originalname).name || 'QR_Code';
    // Làm sạch chuỗi để dùng làm tên file an toàn (loại bỏ ký tự đặc biệt nguy hiểm)
    const sanitizedQr = rawQr
      .toString()
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 80);

    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.webm';
    const finalFilename = `${sanitizedQr}_${timestamp}${ext}`;
    
    cb(null, finalFilename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // Giới hạn kích thước tối đa 200MB cho video
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware CORS: Cho phép truy cập từ mọi origin (rất quan trọng khi chạy mobile hoặc khác port)
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parser cho JSON và urlencoded
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Phục vụ tĩnh thư mục uploads để client có thể xem và tải trực tiếp video
  app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
      // Đặt header hỗ trợ streaming video mượt mà trên Safari iOS và Chrome Android
      res.setHeader('Accept-Ranges', 'bytes');
    }
  }));

  // ==========================================
  // CÁC ENDPOINT API XỬ LÝ VIDEO
  // ==========================================

  /**
   * 1. POST /api/upload-video
   * Nhận tệp tin video từ frontend gửi lên qua multipart/form-data
   */
  app.post('/api/upload-video', upload.single('video'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy tệp tin video trong yêu cầu tải lên.',
        });
      }

      const qrCode = req.body?.qrCode || req.file.originalname;
      const filename = req.file.filename;
      const fileUrl = `/uploads/${encodeURIComponent(filename)}`;

      // Lưu kèm file metadata JSON để giữ nguyên nội dung gốc của QR (kể cả ký tự đặc biệt/tiếng Việt/URL)
      const metadataPath = path.join(uploadsDir, `${filename}.meta.json`);
      const metadata = {
        filename,
        originalQr: qrCode,
        size: req.file.size,
        mimeType: req.file.mimetype,
        createdAt: new Date().toISOString(),
      };
      
      try {
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
      } catch (err) {
        console.error('Lỗi khi ghi metadata:', err);
      }

      console.log(`[Upload Thành Công] Tệp: ${filename} (Mã QR: ${qrCode}) - Kích thước: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);

      return res.status(200).json({
        success: true,
        message: 'Tải video lên server thành công!',
        video: {
          filename,
          originalQr: qrCode,
          size: req.file.size,
          url: fileUrl,
          createdAt: metadata.createdAt,
        },
      });
    } catch (error: any) {
      console.error('Lỗi xử lý upload-video:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải lên video: ' + (error?.message || 'Không xác định'),
      });
    }
  });

  /**
   * 2. GET /api/videos
   * Đọc thư mục /uploads và trả về danh sách toàn bộ các file video
   */
  app.get('/api/videos', (req, res) => {
    try {
      if (!fs.existsSync(uploadsDir)) {
        return res.json({ success: true, videos: [] });
      }

      const files = fs.readdirSync(uploadsDir);
      const videoExtensions = ['.mp4', '.webm', '.mov', '.ogg', '.mkv'];

      const videosList = files
        .filter((file) => {
          const ext = path.extname(file).toLowerCase();
          return videoExtensions.includes(ext) && !file.endsWith('.meta.json');
        })
        .map((file) => {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);

          // Thử đọc metadata nếu có
          let originalQr = '';
          const metaPath = path.join(uploadsDir, `${file}.meta.json`);
          if (fs.existsSync(metaPath)) {
            try {
              const metaContent = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
              originalQr = metaContent.originalQr || '';
            } catch (e) {
              // Bỏ qua lỗi đọc meta
            }
          }

          // Nếu chưa có originalQr, phân tích từ tên file (dạng NoiDungQR_timestamp.ext)
          if (!originalQr) {
            const base = path.parse(file).name;
            const lastUnderscore = base.lastIndexOf('_');
            originalQr = lastUnderscore > 0 ? base.substring(0, lastUnderscore) : base;
          }

          return {
            filename: file,
            originalQr,
            size: stats.size,
            createdAt: stats.birthtime ? stats.birthtime.toISOString() : stats.mtime.toISOString(),
            url: `/uploads/${encodeURIComponent(file)}`,
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Mới nhất lên đầu

      return res.json({
        success: true,
        count: videosList.length,
        videos: videosList,
      });
    } catch (error: any) {
      console.error('Lỗi khi đọc danh sách video:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách video: ' + (error?.message || ''),
      });
    }
  });

  /**
   * 3. DELETE /api/videos/:filename
   * Xóa file video và metadata khỏi thư mục /uploads
   */
  app.delete('/api/videos/:filename', (req, res) => {
    try {
      const filename = path.basename(req.params.filename); // Ngăn chặn Directory Traversal
      const targetFilePath = path.join(uploadsDir, filename);

      if (!fs.existsSync(targetFilePath)) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tệp video cần xóa trên server.',
        });
      }

      // Xóa tệp video
      fs.unlinkSync(targetFilePath);

      // Xóa tệp metadata tương ứng nếu tồn tại
      const metaFilePath = path.join(uploadsDir, `${filename}.meta.json`);
      if (fs.existsSync(metaFilePath)) {
        try {
          fs.unlinkSync(metaFilePath);
        } catch (e) {
          console.warn('Không thể xóa tệp metadata:', e);
        }
      }

      console.log(`[Đã Xóa] Tệp: ${filename}`);

      return res.json({
        success: true,
        message: `Đã xóa video ${filename} thành công khỏi server.`,
      });
    } catch (error: any) {
      console.error('Lỗi khi xóa video:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa video: ' + (error?.message || ''),
      });
    }
  });

  /**
   * Endpoint tải file xuống trình duyệt (hỗ trợ ép tải xuống trên di động)
   */
  app.get('/api/videos/:filename/download', (req, res) => {
    const filename = path.basename(req.params.filename);
    const targetFilePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(targetFilePath)) {
      return res.status(404).send('Tệp video không tồn tại');
    }

    res.download(targetFilePath, filename, (err) => {
      if (err) {
        console.error('Lỗi tải xuống:', err);
      }
    });
  });

  // ==========================================
  // VITE MIDDLEWARE DÀNH CHO CLIENT
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ==========================================
  // HỖ TRỢ TRUY CẬP TRONG MẠNG LAN VÀ HTTPS
  // ==========================================
  // Kiểm tra chứng chỉ SSL/TLS nếu có trong thư mục ssl/ hoặc biến môi trường
  const sslKeyPath = process.env.SSL_KEY_PATH || path.join(process.cwd(), 'ssl', 'key.pem');
  const sslCertPath = process.env.SSL_CERT_PATH || path.join(process.cwd(), 'ssl', 'cert.pem');
  const hasHttpsCert = fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);

  // Lấy danh sách địa chỉ IP trong mạng nội bộ (LAN) của máy
  function getLanIpAddresses(): string[] {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        // Chỉ lấy IPv4 và không phải loopback (127.0.0.1)
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }
    return addresses;
  }

  const lanIps = getLanIpAddresses();

  // Endpoint API cung cấp thông tin IP mạng LAN và trạng thái HTTPS cho Frontend
  app.get('/api/server-info', (req, res) => {
    res.json({
      port: PORT,
      isHttps: hasHttpsCert,
      lanIps,
      sslCertFound: hasHttpsCert,
    });
  });

  if (hasHttpsCert) {
    try {
      const httpsOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      };
      const httpsServer = https.createServer(httpsOptions, app);
      httpsServer.listen(PORT, '0.0.0.0', () => {
        console.log(`\n======================================================`);
        console.log(`🔒 [HTTPS SERVER ĐÃ SẴN SÀNG]`);
        console.log(`- Localhost: https://localhost:${PORT}`);
        if (lanIps.length > 0) {
          console.log(`- Truy cập từ điện thoại trong cùng mạng Wi-Fi (LAN):`);
          lanIps.forEach((ip) => console.log(`  👉 https://${ip}:${PORT}`));
        }
        console.log(`======================================================\n`);
      });
      return;
    } catch (sslErr) {
      console.error('Lỗi khi nạp chứng chỉ SSL, chuyển về HTTP thông thường:', sslErr);
    }
  }

  // Khởi động HTTP Server mặc định (nếu không có chứng chỉ HTTPS hoặc nạp chứng chỉ thất bại)
  const httpServer = http.createServer(app);
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🚀 [HTTP SERVER ĐANG CHẠY]`);
    console.log(`- Localhost: http://localhost:${PORT}`);
    if (lanIps.length > 0) {
      console.log(`- Truy cập từ điện thoại trong cùng mạng Wi-Fi (LAN):`);
      lanIps.forEach((ip) => console.log(`  👉 http://${ip}:${PORT}`));
    }
    console.log(`💡 MẸO: Trình duyệt di động (Chrome/Safari) yêu cầu HTTPS để mở Camera.`);
    console.log(`   Tạo chứng chỉ tại thư mục /ssl (key.pem, cert.pem) để bật HTTPS tự động.`);
    console.log(`======================================================\n`);
  });
}

startServer();
