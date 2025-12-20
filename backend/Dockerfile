# 使用轻量级的 alpine 镜像作为运行环境
FROM alpine:latest

# 安装 ca-certificates，用于 HTTPS 请求
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# 复制预编译的二进制文件（从构建目录）
COPY bin/main .

# 暴露端口（通过环境变量设置）
ARG SERVER_PORT
EXPOSE ${SERVER_PORT}

# 运行应用
CMD ["./main"]