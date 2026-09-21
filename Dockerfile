FROM node:20-alpine

# Cài đặt OpenSSL để tạo chứng chỉ SSL
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci

# Copy toàn bộ source code
COPY . .

# Tạo thư mục ssl và uploads
RUN mkdir -p ssl uploads

# Expose port
EXPOSE 3000

# Script khởi động: tạo SSL nếu chưa có, rồi chạy dev server
CMD ["sh", "-c", "if [ ! -f ssl/key.pem ]; then npm run ssl; fi && npm run dev"]
