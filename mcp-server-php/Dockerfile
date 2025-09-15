FROM php:8.2-cli

RUN apt update
RUN apt install -y unzip
# 安裝必要的擴展
RUN docker-php-ext-install pdo pdo_mysql

# 設定工作目錄
WORKDIR /app

# 建立日誌目錄
RUN mkdir -p logs

# Install php comoser
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/bin --filename=composer

# 設定環境變數
ENV DB_HOST=mysql
ENV DB_PORT=3306
ENV DB_NAME=attendance_system
ENV DB_USER=admin
ENV DB_PASSWORD=admin123

EXPOSE 8080

# 暴露標準輸入輸出（用於 MCP 通訊）
# CMD ["php", "server.php"]
# CMD ["sleep", "infinity"]
CMD ["php", "artisan", "mcp:serve", "--transport=http", "--host=0.0.0.0", "--port=8080", "--path-prefix=mcp_api"]