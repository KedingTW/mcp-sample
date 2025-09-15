# MCP Sample

## 事先準備

1. 安裝 Claude Desktop 或其他支援 MCP 的 AI 工具
2. 安裝 Docker

## 啟動流程 - PHP + Laravel 版本

### 開發資源
https://github.com/php-mcp/laravel

1. `docker compose -f docker-compose.php.yml up -d`
2. 開啟 http://localhost:8080，進入 phpMyAdmin，確認資料庫建立完成
3. 修改 claude_desktop_config.json

- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

```
// ./mcp-server-php/claude_desktop_config.json
{
  "mcpServers": {
    "attendance-php": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "attendance_mcp_server_php",
        "php",
        "artisan",
        "mcp:serve",
        "--transport=stdio"
      ]
    }
  }
}
```

修改後，記得重新啟動 Claude Desktop

## 啟動流程 - NodeJs 版本

1. `docker compose -f docker-compose.nodejs.yml up -d`
2. 開啟 http://localhost:8080，進入 phpMyAdmin，確認資料庫建立完成
3. 修改 claude_desktop_config.json

- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

```
// ./mcp-server-nodejs/claude_desktop_config.json
{
  "mcpServers": {
    "attendance-nodejs": {
      "command": "docker",
      "args": ["exec", "-i", "attendance_mcp_server", "node", "server.js"],
      "env": { "NODE_ENV": "production" }
    }
  }
}
```

修改後，記得重新啟動 Claude Desktop


## 開始使用

- 可直接詢問 AI 人事及請假相關資料
- 可直接請 AI 建立請假資料 **AI 能處理複雜的請假方式** (目前僅支持NodeJs版本)