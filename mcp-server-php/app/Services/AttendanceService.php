<?php

namespace App\Services;

use PhpMcp\Server\Attributes\{McpTool, McpResource, McpResourceTemplate, McpPrompt};
use Illuminate\Support\Facades\DB;

class AttendanceService
{
  #[McpTool(name: 'GetTablesInfo', description: '取得資料庫中所有資料表的基本資訊')]
  public function getTablesInfo()
  {
    try {
      $rows = DB::select("
        SELECT 
            TABLE_NAME as table_name,
            TABLE_COMMENT as table_comment,
            TABLE_ROWS as estimated_rows
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      ");
      return [
        'content' => [
          [
            'type' => 'text',
            'text' => "資料庫中的資料表：\n" . json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
          ]
        ]
      ];
    } catch (\Exception $e) {
      // 錯誤處理
      return [
        'content' => [
          [
            'type' => 'text',
            'text' => '查詢資料表時發生錯誤：' . $e->getMessage(),
          ]
        ]
      ];
    }
  }
  #[McpTool(name: 'GetTableStructure', description: '取得指定資料表的完整結構，包含欄位資訊和註解')]
  public function getTableStructure(string $tableName): array
  {
    try {
      $rows = DB::select("
            SELECT 
                COLUMN_NAME as column_name,
                DATA_TYPE as data_type,
                IS_NULLABLE as is_nullable,
                COLUMN_DEFAULT as column_default,
                COLUMN_COMMENT as column_comment,
                COLUMN_KEY as column_key
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        ", [$tableName]);

      if (empty($rows)) {
        throw new \Exception("資料表 {$tableName} 不存在");
      }
      return [
        'content' => [
          [
            'type' => 'text',
            'text' => "資料表 {$tableName} 的結構：\n" . json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
          ]
        ]
      ];
    } catch (\Exception $e) {
      return [
        'content' => [
          [
            'type' => 'text',
            'text' => "查詢資料表 {$tableName} 結構時發生錯誤：" . $e->getMessage(),
          ]
        ]
      ];
    }
  }
  #[McpTool(name: 'QueryDatabase', description: '執行 SQL 查詢語句（僅支援 SELECT 查詢）')]
  public function queryDatabase(string $sql, bool $confirmWrite = false): array
  {
    $trimmedSql = trim(strtolower($sql));
    $isWriteOperation = str_starts_with($trimmedSql, 'insert') ||
      str_starts_with($trimmedSql, 'update') ||
      str_starts_with($trimmedSql, 'delete');
    // 寫入操作需要確認
    if ($isWriteOperation && !$confirmWrite) {
      throw new \Exception('執行寫入操作（INSERT/UPDATE/DELETE）需要設定 confirm_write: true');
    }
    try {
      if ($isWriteOperation) {
        // 使用 DB::affectingStatement 執行寫入操作
        $affectedRows = DB::affectingStatement($sql);
        $insertId = DB::getPdo()->lastInsertId() ?: null;
        $operation = strtoupper(explode(' ', $trimmedSql)[0]);
        return [
          'content' => [
            [
              'type' => 'text',
              'text' => "操作完成：\n" . json_encode([
                'affectedRows' => $affectedRows,
                'insertId' => $insertId,
                'message' => "成功執行 {$operation} 操作"
              ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
            ]
          ]
        ];
      } else {
        // 使用 DB::select 執行查詢操作
        $result = DB::select($sql);
        return [
          'content' => [
            [
              'type' => 'text',
              'text' => "查詢結果：\n" . json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
            ]
          ]
        ];
      }
    } catch (\Exception $e) {
      return [
        'content' => [
          [
            'type' => 'text',
            'text' => "執行 SQL 時發生錯誤：" . $e->getMessage(),
          ]
        ]
      ];
    }
  }
}
