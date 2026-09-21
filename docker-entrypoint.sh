#!/bin/sh
set -eu

# Tự tạo chứng chỉ SSL khi volume chưa có chứng chỉ.
if [ ! -s "$SSL_KEY_PATH" ] || [ ! -s "$SSL_CERT_PATH" ]; then
  echo "Chưa có chứng chỉ SSL, đang tạo tự động..."
  node generate-ssl.cjs
fi

exec "$@"
