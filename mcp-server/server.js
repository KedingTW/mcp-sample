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
          {
            name: "add_employee",
            description: "新增員工資料",
            inputSchema: {
              type: "object",
              properties: {
                employee_id: {
                  type: "string",
                  description: "員工編號",
                },
                employee_name: {
                  type: "string",
                  description: "員工姓名",
                },
                department: {
                  type: "string",
                  description: "部門",
                },
                position: {
                  type: "string",
                  description: "職位",
                },
                hire_date: {
                  type: "string",
                  description: "到職日期 (YYYY-MM-DD)",
                },
                email: {
                  type: "string",
                  description: "電子郵件（可選）",
                },
                phone: {
                  type: "string",
                  description: "電話號碼（可選）",
                },
              },
              required: ["employee_id", "employee_name", "department", "position", "hire_date"],
            },
          },
          {
            name: "update_employee",
            description: "更新員工資料",
            inputSchema: {
              type: "object",
              properties: {
                employee_id: {
                  type: "string",
                  description: "員工編號",
                },
                employee_name: {
                  type: "string",
                  description: "員工姓名（可選）",
                },
                department: {
                  type: "string",
                  description: "部門（可選）",
                },
                position: {
                  type: "string",
                  description: "職位（可選）",
                },
                email: {
                  type: "string",
                  description: "電子郵件（可選）",
                },
                phone: {
                  type: "string",
                  description: "電話號碼（可選）",
                },
                status: {
                  type: "string",
                  description: "員工狀態（可選）",
                  enum: ["active", "inactive"],
                },
              },
              required: ["employee_id"],
            },
          },
          {
            name: "deactivate_employee",
            description: "停用員工（設為離職狀態）",
            inputSchema: {
              type: "object",
              properties: {
                employee_id: {
                  type: "string",
                  description: "員工編號",
                },
              },
              required: ["employee_id"],
            },
          },
          {
            name: "submit_leave_request",
            description: "提交請假申請",
            inputSchema: {
              type: "object",
              properties: {
                employee_id: {
                  type: "string",
                  description: "員工編號",
                },
                leave_type_code: {
                  type: "string",
                  description: "假別代碼",
                },
                start_date: {
                  type: "string",
                  description: "請假開始日期 (YYYY-MM-DD)",
                },
                end_date: {
                  type: "string",
                  description: "請假結束日期 (YYYY-MM-DD)",
                },
                days_requested: {
                  type: "number",
                  description: "請假天數",
                },
                reason: {
                  type: "string",
                  description: "請假原因（可選）",
                },
              },
              required: ["employee_id", "leave_type_code", "start_date", "end_date", "days_requested"],
            },
          },
          {
            name: "approve_leave_request",
            description: "審核請假申請",
            inputSchema: {
              type: "object",
              properties: {
                request_id: {
                  type: "integer",
                  description: "請假申請ID",
                },
                action: {
                  type: "string",
                  description: "審核動作：approved/rejected",
                  enum: ["approved", "rejected"],
                },
                approved_by: {
                  type: "string",
                  description: "審核者員工編號",
                },
              },
              required: ["request_id", "action", "approved_by"],
            },
          },
          {
            name: "cancel_leave_request",
            description: "取消請假申請",
            inputSchema: {
              type: "object",
              properties: {
                request_id: {
                  type: "integer",
                  description: "請假申請ID",
                },
              },
              required: ["request_id"],
            },
          },
          {
            name: "update_leave_balance",
            description: "更新員工假期額度",
            inputSchema: {
              type: "object",
              properties: {
                employee_id: {
                  type: "string",
                  description: "員工編號",
                },
                leave_type_code: {
                  type: "string",
                  description: "假別代碼",
                },
                year: {
                  type: "integer",
                  description: "年度",
                },
                total_days: {
                  type: "number",
                  description: "總天數（可選）",
                },
                used_days: {
                  type: "number",
                  description: "已使用天數（可選）",
                },
              },
              required: ["employee_id", "leave_type_code", "year"],
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
          
          case "add_employee":
            return await this.addEmployee(args);
          
          case "update_employee":
            return await this.updateEmployee(args);
          
          case "deactivate_employee":
            return await this.deactivateEmployee(args.employee_id);
          
          case "submit_leave_request":
            return await this.submitLeaveRequest(args);
          
          case "approve_leave_request":
            return await this.approveLeaveRequest(args);
          
          case "cancel_leave_request":
            return await this.cancelLeaveRequest(args.request_id);
          
          case "update_leave_balance":
            return await this.updateLeaveBalance(args);
          
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

  async queryDatabase(sql, confirmWrite = false) {
    const trimmedSql = sql.trim().toLowerCase();
    const isWriteOperation = trimmedSql.startsWith('insert') || 
                           trimmedSql.startsWith('update') || 
                           trimmedSql.startsWith('delete');

    // 寫入操作需要確認
    if (isWriteOperation && !confirmWrite) {
      throw new Error('執行寫入操作（INSERT/UPDATE/DELETE）需要設定 confirm_write: true');
    }

    const connection = await this.getConnection();
    try {
      const [result] = await connection.execute(sql);
      
      if (isWriteOperation) {
        return {
          content: [
            {
              type: "text",
              text: `操作完成：\n${JSON.stringify({
                affectedRows: result.affectedRows,
                insertId: result.insertId || null,
                message: `成功執行 ${trimmedSql.split(' ')[0].toUpperCase()} 操作`
              }, null, 2)}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `查詢結果：\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }
    } finally {
      await connection.end();
    }
  }

  // === 員工管理方法 ===
  async addEmployee(employeeData) {
    const connection = await this.getConnection();
    try {
      const [result] = await connection.execute(`
        INSERT INTO employees (
          employee_id, employee_name, department, position, 
          hire_date, email, phone, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
      `, [
        employeeData.employee_id,
        employeeData.employee_name,
        employeeData.department,
        employeeData.position,
        employeeData.hire_date,
        employeeData.email || null,
        employeeData.phone || null
      ]);

      return {
        content: [
          {
            type: "text",
            text: `員工新增成功：\n${JSON.stringify({
              employee_id: employeeData.employee_id,
              employee_name: employeeData.employee_name,
              message: "員工資料已建立",
              affectedRows: result.affectedRows
            }, null, 2)}`,
          },
        ],
      };
    } finally {
      await connection.end();
    }
  }

  async updateEmployee(employeeData) {
    const connection = await this.getConnection();
    try {
      const updateFields = [];
      const updateValues = [];

      // 動態建立更新欄位
      if (employeeData.employee_name) {
        updateFields.push('employee_name = ?');
        updateValues.push(employeeData.employee_name);
      }
      if (employeeData.department) {
        updateFields.push('department = ?');
        updateValues.push(employeeData.department);
      }
      if (employeeData.position) {
        updateFields.push('position = ?');
        updateValues.push(employeeData.position);
      }
      if (employeeData.email) {
        updateFields.push('email = ?');
        updateValues.push(employeeData.email);
      }
      if (employeeData.phone) {
        updateFields.push('phone = ?');
        updateValues.push(employeeData.phone);
      }
      if (employeeData.status) {
        updateFields.push('status = ?');
        updateValues.push(employeeData.status);
      }

      if (updateFields.length === 0) {
        throw new Error('沒有提供要更新的欄位');
      }

      updateValues.push(employeeData.employee_id);

      const [result] = await connection.execute(`
        UPDATE employees 
        SET ${updateFields.join(', ')}
        WHERE employee_id = ?
      `, updateValues);

      if (result.affectedRows === 0) {
        throw new Error('找不到指定的員工');
      }

      return {
        content: [
          {
            type: "text",
            text: `員工資料更新成功：\n${JSON.stringify({
              employee_id: employeeData.employee_id,
              updated_fields: Object.keys(employeeData).filter(key => key !== 'employee_id'),
              affectedRows: result.affectedRows
            }, null, 2)}`,
          },
        ],
      };
    } finally {
      await connection.end();
    }
  }

  async deactivateEmployee(employeeId) {
    const connection = await this.getConnection();
    try {
      const [result] = await connection.execute(`
        UPDATE employees 
        SET status = 'inactive'
        WHERE employee_id = ? AND status = 'active'
      `, [employeeId]);

      if (result.affectedRows === 0) {
        throw new Error('找不到指定的在職員工');
      }

      return {
        content: [
          {
            type: "text",
            text: `員工 ${employeeId} 已設為離職狀態`,
          },
        ],
      };
    } finally {
      await connection.end();
    }
  }

  // === 請假管理方法 ===
  async submitLeaveRequest(requestData) {
    const connection = await this.getConnection();
    try {
      // 先取得假別ID
      const [leaveTypes] = await connection.execute(`
        SELECT leave_type_id FROM leave_types WHERE leave_type_code = ?
      `, [requestData.leave_type_code]);

      if (leaveTypes.length === 0) {
        throw new Error(`無效的假別代碼: ${requestData.leave_type_code}`);
      }

      const leaveTypeId = leaveTypes[0].leave_type_id;

      const [result] = await connection.execute(`
        INSERT INTO leave_requests (
          employee_id, leave_type_id, start_date, end_date, 
          days_requested, reason, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `, [
        requestData.employee_id,
        leaveTypeId,
        requestData.start_date,
        requestData.end_date,
        requestData.days_requested,
        requestData.reason || null
      ]);

      return {
        content: [
          {
            type: "text",
            text: `請假申請提交成功：\n${JSON.stringify({
              request_id: result.insertId,
              employee_id: requestData.employee_id,
              leave_type: requestData.leave_type_code,
              period: `${requestData.start_date} 至 ${requestData.end_date}`,
              days: requestData.days_requested,
              status: "待審核"
            }, null, 2)}`,
          },
        ],
      };
    } finally {
      await connection.end();
    }
  }

  async approveLeaveRequest(approvalData) {
    const connection = await this.getConnection();
    try {
      await connection.beginTransaction();

      // 更新請假申請狀態
      const [result] = await connection.execute(`
        UPDATE leave_requests 
        SET status = ?, approved_by = ?, approved_at = NOW()
        WHERE request_id = ? AND status = 'pending'
      `, [approvalData.action, approvalData.approved_by, approvalData.request_id]);

      if (result.affectedRows === 0) {
        throw new Error('找不到待審核的請假申請');
      }

      // 如果核准，更新假期使用量
      if (approvalData.action === 'approved') {
        const [requestInfo] = await connection.execute(`
          SELECT lr.employee_id, lr.days_requested, lr.start_date, lt.leave_type_id
          FROM leave_requests lr
          JOIN leave_types lt ON lr.leave_type_id = lt.leave_type_id
          WHERE lr.request_id = ?
        `, [approvalData.request_id]);

        if (requestInfo.length > 0) {
          const { employee_id, days_requested, start_date, leave_type_id } = requestInfo[0];
          const year = new Date(start_date).getFullYear();

          await connection.execute(`
            UPDATE employee_leave_balances 
            SET used_days = used_days + ?
            WHERE employee_id = ? AND leave_type_id = ? AND year = ?
          `, [days_requested, employee_id, leave_type_id, year]);
        }
      }

      await connection.commit();

      return {
        content: [
          {
            type: "text",
            text: `請假申請處理完成：\n${JSON.stringify({
              request_id: approvalData.request_id,
              action: approvalData.action === 'approved' ? '已核准' : '已拒絕',
              approved_by: approvalData.approved_by
            }, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.end();
    }
  }

  async cancelLeaveRequest(requestId) {
    const connection = await this.getConnection();
    try {
      const [result] = await connection.execute(`
        UPDATE leave_requests 
        SET status = 'cancelled'
        WHERE request_id = ? AND status IN ('pending', 'approved')
      `, [requestId]);

      if (result.affectedRows === 0) {
        throw new Error('找不到可取消的請假申請');
      }

      return {
        content: [
          {
            type: "text",
            text: `請假申請 ${requestId} 已取消`,
          },
        ],
      };
    } finally {
      await connection.end();
    }
  }

  // === 假期額度管理方法 ===
  async updateLeaveBalance(balanceData) {
    const connection = await this.getConnection();
    try {
      // 先取得假別ID
      const [leaveTypes] = await connection.execute(`
        SELECT leave_type_id FROM leave_types WHERE leave_type_code = ?
      `, [balanceData.leave_type_code]);

      if (leaveTypes.length === 0) {
        throw new Error(`無效的假別代碼: ${balanceData.leave_type_code}`);
      }

      const leaveTypeId = leaveTypes[0].leave_type_id;

      // 檢查記錄是否存在
      const [existing] = await connection.execute(`
        SELECT balance_id FROM employee_leave_balances 
        WHERE employee_id = ? AND leave_type_id = ? AND year = ?
      `, [balanceData.employee_id, leaveTypeId, balanceData.year]);

      let result;
      if (existing.length > 0) {
        // 更新現有記錄
        const updateFields = [];
        const updateValues = [];

        if (balanceData.total_days !== undefined) {
          updateFields.push('total_days = ?');
          updateValues.push(balanceData.total_days);
        }
        if (balanceData.used_days !== undefined) {
          updateFields.push('used_days = ?');
          updateValues.push(balanceData.used_days);
        }

        if (updateFields.length === 0) {
          throw new Error('沒有提供要更新的額度資料');
        }

        updateValues.push(balanceData.employee_id, leaveTypeId, balanceData.year);

        [result] = await connection.execute(`
          UPDATE employee_leave_balances 
          SET ${updateFields.join(', ')}
          WHERE employee_id = ? AND leave_type_id = ? AND year = ?
        `, updateValues);
      } else {
        // 建立新記錄
        [result] = await connection.execute(`
          INSERT INTO employee_leave_balances 
          (employee_id, leave_type_id, year, total_days, used_days)
          VALUES (?, ?, ?, ?, ?)
        `, [
          balanceData.employee_id,
          leaveTypeId,
          balanceData.year,
          balanceData.total_days || 0,
          balanceData.used_days || 0
        ]);
      }

      return {
        content: [
          {
            type: "text",
            text: `假期額度更新成功：\n${JSON.stringify({
              employee_id: balanceData.employee_id,
              leave_type: balanceData.leave_type_code,
              year: balanceData.year,
              operation: existing.length > 0 ? '更新' : '建立',
              affectedRows: result.affectedRows
            }, null, 2)}`,
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
    // console.log("MySQL MCP 伺服器已啟動");
  }
}

const server = new MySQLMCPServer();
server.run().catch(console.error);