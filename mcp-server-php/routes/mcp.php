<?php

use PhpMcp\Laravel\Facades\Mcp;
use App\Services\AttendanceService;

// Register a simple tool
Mcp::tool([AttendanceService::class, 'getTablesInfo'])
  ->name('GetTableInfo')
  ->description('取得資料庫中所有資料表的基本資訊');

Mcp::tool([AttendanceService::class, 'getTableStructure'])
  ->name('GetTableStructure')
  ->description('取得指定資料表的完整結構，包含欄位資訊和註解')
  ->inputSchema([
    'type' => 'object',
    'properties' => [
      'table_name' => [
        'type' => "string",
        'description' => "資料表名稱",
      ],
      'required' => ["table_name"]
    ]
  ]);

Mcp::tool([AttendanceService::class, 'QueryDatabase'])
  ->name('QueryDatabase')
  ->description('執行 SQL 查詢語句（僅支援 SELECT 查詢）')
  ->inputSchema(
    [
      'type' => "object",
      'properties' => [
        'sql' => [
          'type' => "string",
          'description' => "要執行的 SQL 查詢語句",
        ],
      ],
      'required' => ["sql"],
    ],
  );
