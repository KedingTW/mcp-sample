# MCP Sample

## 事先準備

1. 安裝Claude Desktop或其他支援MCP的AI工具
2. 安裝Docker

## 啟動流程 - NodeJs版本

1. `docker compose -f docker-compose.nodejs.yml up -d`
2. 開啟http://localhost:8080，進入phpMyAdmin，確認資料庫建立完成
3. 修改claude_desktop_config.json
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

```
// ./mcp-server/claude_desktop_config.json
{
  "mcpServers": {
    "mysql-attendance": {
      "command": "docker",
      "args": ["exec", "-i", "attendance_mcp_server", "node", "server.js"],
      "env": { "NODE_ENV": "production" }
    }
  }
}
```
修改後，記得重新啟動Claude Desktop

## 開始使用

- 可直接詢問AI人事及請假相關資料
- 可直接請AI建立請假資料 **AI能處理複雜的請假方式**

