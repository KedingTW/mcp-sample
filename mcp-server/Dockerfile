# 使用官方 Node.js 18 LTS 版本
FROM node:18-alpine

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json (如果存在)
COPY package*.json ./

# 安裝依賴
RUN npm i

# 複製應用程式碼
COPY . .

# 建立 logs 目錄
RUN mkdir -p logs

# 設定檔案權限
RUN chmod +x server.js

# 暴露端口 (雖然 MCP 主要使用 stdio，但保留此端口供未來擴展)
EXPOSE 3001

# 執行應用程式
CMD ["npm", "start"]