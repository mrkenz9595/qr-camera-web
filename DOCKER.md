# QR Camera Web - Docker Setup

## Chạy nhanh với Docker Compose

```bash
# Build và khởi động container
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng container
docker-compose down

# Build lại (khi thay đổi dependencies)
docker-compose up -d --build
```

## Truy cập ứng dụng

Sau khi container chạy, mở trình duyệt:

- **Localhost**: `https://localhost:3000`
- **Từ điện thoại trong mạng LAN**: `https://<IP-máy-tính>:3000`

Để lấy IP máy tính:
```bash
# Linux/Mac
ip addr show | grep inet

# Windows
ipconfig
```

## Chứng chỉ SSL

Container tự động tạo chứng chỉ SSL self-signed khi khởi động lần đầu bằng OpenSSL. Chứng chỉ được lưu trong thư mục `./ssl/` và persistent giữa các lần restart.

**Lưu ý trên mobile**: Khi truy cập từ điện thoại, trình duyệt sẽ cảnh báo về chứng chỉ không tin cậy. Chọn **"Nâng cao" → "Tiếp tục truy cập"** để mở ứng dụng.

## Thư mục persistent

- `./uploads/`: Video đã quay được lưu vĩnh viễn
- `./ssl/`: Chứng chỉ SSL
- `./src/`, `./server.ts`: Source code (hot-reload trong dev mode)

## Kiểm tra container

```bash
# Kiểm tra trạng thái
docker-compose ps

# Vào shell container
docker-compose exec qr-camera-web sh

# Xem logs real-time
docker-compose logs -f qr-camera-web
```

## Build production

```bash
# Build image production-ready
docker build -t qr-camera-web:prod .

# Chạy production (cần build trước)
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/ssl:/app/ssl \
  --name qr-camera-web \
  qr-camera-web:prod
```
