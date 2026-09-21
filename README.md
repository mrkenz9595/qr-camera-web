# QR Camera Web

Ứng dụng quay video tự động khi quét mã QR, lưu trữ và quản lý video trên server.

## Tính năng

- ✅ Quét mã QR bằng camera điện thoại/máy tính
- ✅ Tự động bắt đầu quay video khi phát hiện QR
- ✅ Quét QR lần 2 để dừng quay (sau cooldown 3 giây)
- ✅ Kiểm tra trùng lặp: từ chối quay nếu mã QR đã có trong CSDL
- ✅ Upload tự động lên server qua HTTPS
- ✅ Dashboard quản lý: xem, tải về, xóa video
- ✅ Hỗ trợ HTTPS cho camera trên mobile (iOS Safari, Chrome Android)
- ✅ Hoạt động trong mạng LAN không cần internet

## Cài đặt và chạy

### Cách 1: Docker (Khuyến nghị - Tự động 100%)

```bash
# Clone repo
git clone <repo-url>
cd qr-camera-web

# Khởi động bằng Docker Compose
docker-compose up -d

# Xem logs
docker-compose logs -f
```

Truy cập: `https://localhost:3000` hoặc `https://<IP-máy-tính>:3000` từ điện thoại.

Chi tiết: [DOCKER.md](DOCKER.md)

### Cách 2: Chạy trực tiếp (Node.js)

**Yêu cầu**: Node.js 20+ và OpenSSL hoặc mkcert

```bash
# Cài đặt dependencies
npm install

# Tạo chứng chỉ SSL (cần cho camera mobile)
npm run ssl

# Chạy development server
npm run dev
```

Server sẽ hiển thị địa chỉ truy cập từ LAN trong console.

## Sử dụng

### Quét và quay video

1. Mở ứng dụng trên điện thoại, cho phép truy cập Camera
2. Đưa mã QR vào khung quét
3. Ứng dụng tự động bắt đầu quay video (có âm thanh bíp)
4. Đưa mã QR khác (hoặc cùng mã) vào khung để dừng
5. Video tự động upload lên server

### Quản lý video

- Tab **Dashboard**: xem danh sách video đã quay
- Tìm kiếm theo nội dung mã QR
- Xem trực tiếp, tải về hoặc xóa video
- Sao chép nội dung mã QR vào clipboard

## Cấu trúc thư mục

```
qr-camera-web/
├── src/
│   ├── components/
│   │   ├── ScannerTab.tsx    # Tab quét QR và quay video
│   │   └── DashboardTab.tsx  # Tab quản lý video
│   ├── types.ts              # TypeScript interfaces
│   └── utils/                # Helper functions
├── server.ts                 # Express server + Vite dev
├── uploads/                  # Thư mục lưu video (persistent)
├── ssl/                      # Chứng chỉ HTTPS
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## API Endpoints

- `GET /api/check-qr/:code` - Kiểm tra mã QR đã tồn tại
- `POST /api/upload-video` - Upload video (multipart/form-data)
- `GET /api/videos` - Lấy danh sách video
- `DELETE /api/videos/:filename` - Xóa video
- `GET /api/videos/:filename/download` - Tải video về
- `GET /api/server-info` - Thông tin server (IP LAN, HTTPS status)

## Scripts

```bash
npm run dev        # Chạy development server
npm run ssl        # Tạo chứng chỉ SSL
npm run build      # Build production
npm run start      # Chạy production build
npm run lint       # TypeScript type checking
npm run clean      # Xóa dist, uploads
```

## Ghi chú kỹ thuật

### MediaRecorder

- Sử dụng `recorder.start()` không timeslice để tạo container hoàn chỉnh
- Ưu tiên MP4 (H.264/AAC) cho Safari iOS
- Fallback WebM (VP9/Opus) cho Chrome Android
- Resolve MIME từ `recorder.mimeType` thực tế thay vì MIME yêu cầu

### Xử lý video

- Tên file = nội dung mã QR (sanitized) + extension
- Metadata lưu trong `<filename>.meta.json`
- Giới hạn upload: 200 MB mỗi video
- Hỗ trợ HTTP byte-range cho streaming/seeking

### HTTPS và Camera

iOS Safari và Chrome Android yêu cầu HTTPS để truy cập camera. Script `generate-ssl.cjs` tự động tạo chứng chỉ self-signed với SAN cho tất cả IP LAN.

## License

MIT
