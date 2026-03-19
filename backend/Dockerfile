# 阶段 1：在镜像内从源码编译，确保使用最新代码（避免本地未 go build 导致旧二进制）
FROM golang:1.24-alpine AS builder
WORKDIR /app
RUN apk --no-cache add ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags '-w -s' \
    -o /app/main \
    ./cmd/server

# 阶段 2：仅复制二进制与迁移文件
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
COPY migrations ./migrations
ENV MIGRATIONS_PATH=/root/migrations
ARG SERVER_PORT
EXPOSE ${SERVER_PORT}
CMD ["./main"]
