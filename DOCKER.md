# Docker Deployment Guide

## Tính năng

- **Multi-stage build**: Tối ưu dung lượng image (~200MB vs ~800MB)
- **Production-ready**: Chạy production build với `NODE_ENV=production`
- **Non-root user**: Container chạy với user `appuser` để bảo mật
- **Log rotation**: Giới hạn log 10MB/file, tối đa 3 files
- **Resource limits**: RAM tối đa 1GB, CPU 2 cores
- **Health check**: Tự động kiểm tra container health
- **Auto SSL**: Tự động tạo chứng chỉ SSL self-signed khi chưa có
- **Persistent data**: Video và SSL được lưu qua volumes

## Yêu cầu

- Docker 20.10+
- Docker Compose 2.0+
- Port 5000 khả dụng

## Triển khai

### 1. Build và chạy production

```bash
# Build image và khởi động container
sudo docker-compose up -d --build

# Xem logs
sudo docker-compose logs -f

# Kiểm tra trạng thái
sudo docker-compose ps
```

### 2. Truy cập ứng dụng

- **Localhost**: https://localhost:5000
- **Từ điện thoại trong LAN**: https://<IP-máy-server>:5000

Lấy IP server:
```bash
hostname -I | awk '{print $1}'
```

### 3. Quản lý container

```bash
# Dừng container
sudo docker-compose down

# Dừng và xóa volumes (xóa video đã quay)
sudo docker-compose down -v

# Restart container
sudo docker-compose restart

# Xem resource usage
sudo docker stats qr-camera-web

# Kiểm tra health
sudo docker inspect qr-camera-web | grep -A 10 Health
```

## Cấu trúc

### Multi-stage Dockerfile

**Stage 1 (builder):**
- Cài dependencies
- Build frontend (Vite) và backend (esbuild)
- Prune dev dependencies

**Stage 2 (runtime):**
- Image tối giản chỉ chứa production files
- Non-root user `appuser`
- Entrypoint tự động tạo SSL

### Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'      # Tối đa 2 CPU cores
      memory: 1G       # Tối đa 1GB RAM
    reservations:
      memory: 256M     # Đảm bảo tối thiểu 256MB
```

### Log Rotation

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"    # Mỗi file log tối đa 10MB
    max-file: "3"      # Giữ tối đa 3 files
```

## Volumes

- `./uploads:/app/uploads` - Video đã ghi
- `./ssl:/app/ssl` - Chứng chỉ SSL

## Troubleshooting

### Container không start

```bash
# Xem logs chi tiết
sudo docker-compose logs

# Kiểm tra port conflict
sudo netstat -tlnp | grep 5000
```

### SSL không tạo tự động

```bash
# Exec vào container và tạo thủ công
sudo docker exec -it qr-camera-web sh
node generate-ssl.cjs
exit
```

### RAM quá cao

Giảm limit trong `docker-compose.yml`:
```yaml
limits:
  memory: 512M  # Thay vì 1G
```

### Xóa image cũ

```bash
# Dọn dẹp images không dùng
sudo docker system prune -a
```

## Production Checklist

- [x] Multi-stage build
- [x] Non-root user
- [x] Resource limits
- [x] Log rotation
- [x] Health check
- [x] Production build
- [x] Volume persistence
- [x] Auto SSL generation
