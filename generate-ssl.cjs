#!/usr/bin/env node

/**
 * Script hỗ trợ tạo chứng chỉ SSL cho môi trường Localhost & mạng LAN
 * Cách dùng:
 * 1. Chạy `node generate-ssl.cjs` (sử dụng OpenSSL hoặc mkcert)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const sslDir = path.join(process.cwd(), 'ssl');
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir, { recursive: true });
}

const keyPath = path.join(sslDir, 'key.pem');
const certPath = path.join(sslDir, 'cert.pem');

// Lấy danh sách IP mạng LAN
function getLanIps() {
  const interfaces = os.networkInterfaces();
  const ips = ['127.0.0.1', 'localhost'];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const ips = getLanIps();
console.log('🔍 Danh sách IP máy tính phát hiện được:', ips.join(', '));

// Kiểm tra xem đã có mkcert chưa
let hasMkcert = false;
try {
  execSync('mkcert -version', { stdio: 'ignore' });
  hasMkcert = true;
} catch (e) {
  hasMkcert = false;
}

if (hasMkcert) {
  console.log('✅ Tìm thấy mkcert. Đang tạo chứng chỉ SSL tin cậy...');
  try {
    execSync(`mkcert -install`, { stdio: 'inherit' });
    execSync(`mkcert -key-file "${keyPath}" -cert-file "${certPath}" ${ips.join(' ')}`, { stdio: 'inherit' });
    console.log(`\n🎉 Thành công! Chứng chỉ đã được lưu tại:\n- ${keyPath}\n- ${certPath}\n`);
    console.log('Khởi động lại server (`npm run dev`) để tự động bật HTTPS!');
    process.exit(0);
  } catch (err) {
    console.warn('Lỗi khi chạy mkcert, thử chuyển sang OpenSSL tự ký...', err.message);
  }
}

// Nếu không có mkcert, kiểm tra openssl để tạo chứng chỉ tự ký (self-signed)
let hasOpenssl = false;
try {
  execSync('openssl version', { stdio: 'ignore' });
  hasOpenssl = true;
} catch (e) {
  hasOpenssl = false;
}

if (hasOpenssl) {
  console.log('⚡ Đang dùng OpenSSL để tạo chứng chỉ tự ký (Self-signed certificate)...');
  try {
    // Tạo file cấu hình SAN (Subject Alternative Name) để hỗ trợ cả IP LAN
    const sanConfig = `
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = VN
ST = Hanoi
L = Hanoi
O = LocalDev
OU = Dev
CN = localhost

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
${ips.map((ip, i) => `IP.${i + 1} = ${ip}`).join('\n')}
`;
    const confPath = path.join(sslDir, 'openssl-san.cnf');
    fs.writeFileSync(confPath, sanConfig);

    const cmd = `openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -config "${confPath}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log(`\n🎉 Tạo chứng chỉ tự ký thành công!\n- Key: ${keyPath}\n- Cert: ${certPath}\n`);
    console.log('⚠️ Lưu ý: Với chứng chỉ OpenSSL tự ký, khi truy cập trên điện thoại bạn chọn "Nâng cao (Advanced) -> Tiếp tục truy cập" để mở trang web.');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi dùng OpenSSL:', err.message);
  }
}

console.log('\n❌ Chưa tìm thấy công cụ mkcert hoặc openssl trong biến môi trường PATH.');
console.log('👉 Vui lòng cài đặt mkcert theo hướng dẫn trong ứng dụng:');
console.log('   Windows: choco install mkcert  (hoặc scoop install mkcert)');
console.log('   macOS:   brew install mkcert');
console.log('   Linux:   sudo apt install mkcert');
console.log('Sau đó chạy lại lệnh: node generate-ssl.cjs\n');
