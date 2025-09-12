#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import mysql from 'mysql2/promise';

// 資料庫連線配置 (支援環境變數)
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'attendance_system',
  charset: 'utf8mb4'
};

class MySQLMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "mysql-attendance-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async getConnection() {
    try {
      const connection = await mysql.createConnection(DB_CONFIG);
      return connection;
    } catch (error) {
      throw new Error(`資料庫連線失敗: ${error.message}`);
    }
  }

  setupToolHandlers() {
    // 列出所有可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_tables_info",
            description: "取得資料庫中所有資料表的基本資訊",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "get_table_structure",
            description: "取得指定資料表的完整結構，包含欄位資訊和註解",
            inputSchema: {
              type: "object",
              properties: {
                table_name: {
                  type: "string",
                  description: "資料表名稱",
                },
              },
              required: ["table_name"],
            },
          },
          {
            name: "query_database",
            description: "執行 SQL 查詢語句（僅支援 SELECT 查詢）",
            inputSchema: {
              type: "object",
              properties: {
                sql: {
                  type: "string",
                  description: "要執行的 SQL 查詢語句",
                },
              },
              required: ["sql"],
            },
          },
          {
            name: "get_employee_info",
            description: "取得員工基本資訊",
            inputSchema: {
              type: "object",
              properties: {
                employee_id: {
                  type: "string",
                  description: "員工編號（可選）",
                },
              },
            },
          },
          {
            name: "get_leave_balance",
            description: "查詢員工假期餘額",
            inputSchema: {
              type: "object",
              properties: {
                employee_id: {
                  type: "string",
                  description: "員工編號",
                },
                year: {
                  type: "integer",
                  description: "查詢年度（預設為 2024）",
                  default: 2024,
                },
              },
              required: ["employee_id"],
            },
          },
          {
            name: "get_leave_requests",
            description: "查詢請假申請紀錄",
            inputSchema: {
              type: "object",
              properties: {
                employee_id: {
                  type: "string",
                  description: "員工編號（可選）",
                },
                status: {
                  type: "string",
                  description: "申請狀態：pending/approved/rejected/cancelled",
                  enum: ["pending", "approved", "rejected", "cancelled"],
                },
                start_date: {
                  type: "string",
                  description: "查詢開始日期 (YYYY-MM-DD)",
                },
                end_date: {
                  type: "string",
                  description: "查詢結束日期 (YYYY-MM-DD)",
                },
              },
            },
          },
        ],
      };
    });

    // 處理工具調用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_tables_info":
            return await this.getTablesInfo();
          
          case "get_table_structure":
            return await this.getTableStructure(args.table_name);
          
          case "query_database":
            return await this.queryDatabase(args.sql);
          
          case "get_employee_info":
            return await this.getEmployeeInfo(args.employee_id);
          
          case "get_leave_balance":
            return await this.getLeaveBalance(args.employee_id, args.year || 2024);
          
          case "get_leave_requests":
            return await this.getLeaveRequests(args);
          
          default:
            throw new Error(`未知的工具: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `錯誤: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async getTablesInfo() {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(`
        SELECT 
          TABLE_NAME as table_name,
          TABLE_COMMENT as table_comment,
          TABLE_ROWS as estimated_rows
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `, [DB_CONFIG.database]);

      return {
        content: [
          {
            type: "text",
            text: `資料庫中的資料表：\n${JSON.stringify(rows, null, 2)}`,
          },
        ],
      };
    } finally {
      await connection.end();
    }
  }

  async getTableStructure(tableName) {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(`
        SELECT 
          COLUMN_NAME as column_name,
          DATA_TYPE as data_type,
          IS_NULLABLE as is_nullable,
          COLUMN_DEFAULT as column_default,
          COLUMN_COMMENT as column_comment,
          COLUMN_KEY as column_key
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [DB_CONFIG.database, tableName]);

      if (rows.length === 0) {
        throw new Error(`資料表 ${tableName} 不存在`);
      }

      return {
        content: [
          {
            type: "text",
            text: `資料表 ${tableName} 的結構：\n${JSON.stringify(rows, null, 2)}`,
          },
        ],
      };
    } finally {
      await connection.end();
    }
  }

  async queryDatabase(sql) {
    // 安全檢查：只允許 SELECT 查詢
    const trimmedSql = sql.trim().toLowerCase();
    if (!trimmedSql.startsWith('select')) {
      throw new Error('只允許執行 SELECT 查詢');
    }

    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(sql);
      return {
        content: [
          {
            type: "text",
            text: `查詢結果：\n${JSON.stringify(rows, null, 2)}`,
          },
        ],
      };
    } finally {
      await connection.end();
    }
  }

  async getEmployeeInfo(employeeId) {
    const connection = await this.getConnection();
    try {
      let sql = `
        SELECT 
          employee_id,
          employee_name,
          department,
          position,
          hire_date,
          email,
          phone,
          status
        FROM employees
      `;
      let params = [];

      if (employeeId) {
        sql += ' WHERE employee_id = ?';
        params = [employeeId];
      }

      sql += ' ORDER BY employee_id';

      const [rows] = await connection.execute(sql, params);
      return {
        content: [
          {
            type: "text",
            text: `員工資訊：\n${JSON.stringify(rows, null, 2)}`,
          },
        ],
      };
    } finally {
      await connection.end();
    }
  }

  async getLeaveBalance(employeeId, year) {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(`
        SELECT 
          e.employee_name,
          lt.leave_type_name,
          elb.year,
          elb.total_days,
          elb.used_days,
          elb.remaining_days
        FROM employee_leave_balances elb
        JOIN employees e ON elb.employee_id = e.employee_id
        JOIN leave_types lt ON elb.leave_type_id = lt.leave_type_id
        WHERE elb.employee_id = ? AND elb.year = ?
        ORDER BY lt.leave_type_id
      `, [employeeId, year]);

      return {
        content: [
          {
            type: "text",
            text: `員工 ${employeeId} 在 ${year} 年的假期餘額：\n${JSON.stringify(rows, null, 2)}`,
          },
        ],
      };
    } finally {
      await connection.end();
    }
  }

  async getLeaveRequests(args) {
    const connection = await this.getConnection();
    try {
      let sql = `
        SELECT 
          lr.request_id,
          e.employee_name,
          e.department,
          lt.leave_type_name,
          lr.start_date,
          lr.end_date,
          lr.days_requested,
          lr.reason,
          lr.status,
          approver.employee_name as approved_by_name,
          lr.approved_at,
          lr.created_at
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.employee_id
        JOIN leave_types lt ON lr.leave_type_id = lt.leave_type_id
        LEFT JOIN employees approver ON lr.approved_by = approver.employee_id
        WHERE 1=1
      `;
      
      const params = [];

      if (args.employee_id) {
        sql += ' AND lr.employee_id = ?';
        params.push(args.employee_id);
      }

      if (args.status) {
        sql += ' AND lr.status = ?';
        params.push(args.status);
      }

      if (args.start_date) {
        sql += ' AND lr.start_date >= ?';
        params.push(args.start_date);
      }

      if (args.end_date) {
        sql += ' AND lr.end_date <= ?';
        params.push(args.end_date);
      }

      sql += ' ORDER BY lr.created_at DESC';

      const [rows] = await connection.execute(sql, params);
      return {
        content: [
          {
            type: "text",
            text: `請假申請紀錄：\n${JSON.stringify(rows, null, 2)}`,
          },
        ],
      };
    } finally {
      await connection.end();
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MySQL MCP 伺服器已啟動");
  }
}

const server = new MySQLMCPServer();
server.run().catch(console.error);