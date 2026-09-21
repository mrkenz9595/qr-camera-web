#!/bin/sh
set -eu

# Tự tạo chứng chỉ SSL khi volume chưa có chứng chỉ.
if [ ! -s "$SSL_KEY_PATH" ] || [ ! -s "$SSL_CERT_PATH" ]; then
  echo "Chưa có chứng chỉ SSL, đang tạo tự động..."
  node generate-ssl.cjs
  # Sửa quyền owner về appuser để Node.js có thể đọc
  chown appuser:appgroup "$SSL_KEY_PATH" "$SSL_CERT_PATH" 2>/dev/null || true
fi

# Đảm bảo uploads có quyền ghi cho appuser
chown -R appuser:appgroup /app/uploads /app/ssl 2>/dev/null || true

# Switch sang appuser và chạy CMD
exec su-exec appuser "$@"
