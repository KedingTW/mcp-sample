-- 員工考勤系統資料庫
-- MySQL 版本

-- 建立資料庫
CREATE DATABASE IF NOT EXISTS attendance_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE attendance_system;

-- 1. 員工基本資料表
CREATE TABLE employees (
    employee_id VARCHAR(10) PRIMARY KEY COMMENT '員工編號',
    employee_name VARCHAR(50) NOT NULL COMMENT '員工姓名',
    department VARCHAR(30) NOT NULL COMMENT '部門',
    position VARCHAR(30) NOT NULL COMMENT '職位',
    hire_date DATE NOT NULL COMMENT '到職日期',
    email VARCHAR(100) UNIQUE COMMENT '電子郵件',
    phone VARCHAR(20) COMMENT '聯絡電話',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '員工狀態：active=在職, inactive=離職',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間'
) COMMENT='員工基本資料表';

-- 2. 假別類型表
CREATE TABLE leave_types (
    leave_type_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '假別ID',
    leave_type_code VARCHAR(10) UNIQUE NOT NULL COMMENT '假別代碼',
    leave_type_name VARCHAR(20) NOT NULL COMMENT '假別名稱',
    description TEXT COMMENT '假別說明',
    is_paid BOOLEAN DEFAULT TRUE COMMENT '是否為有薪假',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間'
) COMMENT='假別類型定義表';

-- 3. 員工年度假期額度表
CREATE TABLE employee_leave_balances (
    balance_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '額度記錄ID',
    employee_id VARCHAR(10) NOT NULL COMMENT '員工編號',
    leave_type_id INT NOT NULL COMMENT '假別ID',
    year YEAR NOT NULL COMMENT '年度',
    total_days DECIMAL(4,1) NOT NULL DEFAULT 0 COMMENT '年度總額度天數',
    used_days DECIMAL(4,1) NOT NULL DEFAULT 0 COMMENT '已使用天數',
    remaining_days DECIMAL(4,1) GENERATED ALWAYS AS (total_days - used_days) STORED COMMENT '剩餘天數',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(leave_type_id),
    UNIQUE KEY uk_employee_leave_year (employee_id, leave_type_id, year)
) COMMENT='員工年度假期額度表';

-- 4. 員工請假紀錄表
CREATE TABLE leave_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '請假申請ID',
    employee_id VARCHAR(10) NOT NULL COMMENT '申請員工編號',
    leave_type_id INT NOT NULL COMMENT '假別ID',
    start_date DATE NOT NULL COMMENT '請假開始日期',
    end_date DATE NOT NULL COMMENT '請假結束日期',
    days_requested DECIMAL(4,1) NOT NULL COMMENT '申請天數',
    reason TEXT COMMENT '請假原因',
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending' COMMENT '申請狀態：pending=待審核, approved=已核准, rejected=已拒絕, cancelled=已取消',
    approved_by VARCHAR(10) COMMENT '核准人員工編號',
    approved_at TIMESTAMP NULL COMMENT '核准時間',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '申請時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(leave_type_id),
    FOREIGN KEY (approved_by) REFERENCES employees(employee_id),
    INDEX idx_employee_date (employee_id, start_date),
    INDEX idx_status (status),
    INDEX idx_leave_type (leave_type_id)
) COMMENT='員工請假申請紀錄表';

-- 插入基礎資料

-- 假別類型資料
INSERT INTO leave_types (leave_type_code, leave_type_name, description, is_paid) VALUES
('SL', '事假', '因私人事務需要請假', FALSE),
('ML', '病假', '因疾病或健康因素請假', TRUE),
('AL', '特休', '年度特別休假', TRUE),
('CL', '補休', '加班換取之補休假', TRUE),
('FL', '喪假', '直系親屬喪事假', TRUE);

-- 員工基本資料
INSERT INTO employees (employee_id, employee_name, department, position, hire_date, email, phone, status) VALUES
('EMP001', '王小明', '資訊部', '軟體工程師', '2022-03-15', 'wang.xiaoming@company.com', '0912-345-678', 'active'),
('EMP002', '李美華', '人事部', '人事專員', '2021-07-01', 'li.meihua@company.com', '0923-456-789', 'active'),
('EMP003', '陳志強', '業務部', '業務主管', '2020-01-20', 'chen.zhiqiang@company.com', '0934-567-890', 'active'),
('EMP004', '張淑芬', '財務部', '會計師', '2019-05-10', 'zhang.shufen@company.com', '0945-678-901', 'active'),
('EMP005', '林大偉', '資訊部', '系統管理員', '2023-02-01', 'lin.dawei@company.com', '0956-789-012', 'active');

-- 員工年度假期額度 (2024年度)
INSERT INTO employee_leave_balances (employee_id, leave_type_id, year, total_days, used_days) VALUES
-- 王小明的假期額度
('EMP001', 1, 2024, 30.0, 5.0),   -- 事假
('EMP001', 2, 2024, 30.0, 8.0),   -- 病假  
('EMP001', 3, 2024, 14.0, 6.0),   -- 特休

-- 李美華的假期額度
('EMP002', 1, 2024, 30.0, 3.0),   -- 事假
('EMP002', 2, 2024, 30.0, 2.0),   -- 病假
('EMP002', 3, 2024, 21.0, 12.0),  -- 特休

-- 陳志強的假期額度
('EMP003', 1, 2024, 30.0, 8.0),   -- 事假
('EMP003', 2, 2024, 30.0, 5.0),   -- 病假
('EMP003', 3, 2024, 28.0, 15.0),  -- 特休

-- 張淑芬的假期額度
('EMP004', 1, 2024, 30.0, 2.0),   -- 事假
('EMP004', 2, 2024, 30.0, 1.0),   -- 病假
('EMP004', 3, 2024, 28.0, 20.0),  -- 特休

-- 林大偉的假期額度
('EMP005', 1, 2024, 30.0, 1.0),   -- 事假
('EMP005', 2, 2024, 30.0, 0.0),   -- 病假
('EMP005', 3, 2024, 7.0, 3.0);    -- 特休

-- 員工請假紀錄 (模擬資料)
INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days_requested, reason, status, approved_by, approved_at) VALUES
-- 王小明的請假紀錄
('EMP001', 3, '2024-01-15', '2024-01-17', 3.0, '家庭旅遊', 'approved', 'EMP003', '2024-01-10 10:30:00'),
('EMP001', 2, '2024-02-20', '2024-02-22', 3.0, '感冒就醫', 'approved', 'EMP003', '2024-02-19 14:20:00'),
('EMP001', 3, '2024-03-25', '2024-03-27', 3.0, '個人事務', 'approved', 'EMP003', '2024-03-20 09:15:00'),
('EMP001', 1, '2024-06-10', '2024-06-12', 3.0, '處理房屋事務', 'approved', 'EMP003', '2024-06-05 16:45:00'),

-- 李美華的請假紀錄
('EMP002', 3, '2024-04-01', '2024-04-05', 5.0, '清明連假延長', 'approved', 'EMP004', '2024-03-25 11:00:00'),
('EMP002', 2, '2024-05-15', '2024-05-16', 2.0, '健康檢查', 'approved', 'EMP004', '2024-05-10 13:30:00'),
('EMP002', 3, '2024-07-20', '2024-07-26', 7.0, '暑假旅遊', 'approved', 'EMP004', '2024-07-01 10:00:00'),

-- 陳志強的請假紀錄
('EMP003', 3, '2024-02-10', '2024-02-16', 7.0, '春節假期延長', 'approved', 'EMP004', '2024-01-25 15:20:00'),
('EMP003', 1, '2024-04-18', '2024-04-19', 2.0, '子女學校活動', 'approved', 'EMP004', '2024-04-15 12:10:00'),
('EMP003', 3, '2024-08-05', '2024-08-12', 8.0, '家庭度假', 'approved', 'EMP004', '2024-07-20 14:30:00'),

-- 張淑芬的請假紀錄
('EMP004', 3, '2024-01-20', '2024-01-31', 12.0, '年底長假', 'approved', 'EMP003', '2024-01-05 16:00:00'),
('EMP004', 3, '2024-06-15', '2024-06-22', 8.0, '出國旅遊', 'approved', 'EMP003', '2024-06-01 11:30:00'),
('EMP004', 1, '2024-09-03', '2024-09-04', 2.0, '搬家事務', 'pending', NULL, NULL),

-- 林大偉的請假紀錄
('EMP005', 3, '2024-05-01', '2024-05-03', 3.0, '勞動節連假', 'approved', 'EMP001', '2024-04-25 09:45:00'),
('EMP005', 1, '2024-08-20', '2024-08-20', 1.0, '銀行辦事', 'approved', 'EMP001', '2024-08-18 15:00:00');

-- 建立檢視表：員工假期統計
CREATE VIEW employee_leave_summary AS
SELECT 
    e.employee_id,
    e.employee_name,
    e.department,
    lt.leave_type_name,
    elb.year,
    elb.total_days,
    elb.used_days,
    elb.remaining_days,
    ROUND((elb.used_days / elb.total_days) * 100, 2) AS usage_percentage
FROM employees e
JOIN employee_leave_balances elb ON e.employee_id = elb.employee_id
JOIN leave_types lt ON elb.leave_type_id = lt.leave_type_id
WHERE e.status = 'active'
ORDER BY e.employee_id, lt.leave_type_id;

-- 建立檢視表：請假申請統計
CREATE VIEW leave_requests_summary AS
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
    approver.employee_name AS approved_by_name,
    lr.approved_at,
    lr.created_at
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.employee_id
JOIN leave_types lt ON lr.leave_type_id = lt.leave_type_id
LEFT JOIN employees approver ON lr.approved_by = approver.employee_id
ORDER BY lr.created_at DESC;

-- 查詢範例
-- 1. 查看所有員工的假期餘額
-- SELECT * FROM employee_leave_summary WHERE year = 2024;

-- 2. 查看特定員工的請假紀錄
-- SELECT * FROM leave_requests_summary WHERE employee_name = '王小明';

-- 3. 查看待審核的請假申請
-- SELECT * FROM leave_requests_summary WHERE status = 'pending';

-- 4. 統計各部門的請假使用率
-- SELECT 
--     department,
--     leave_type_name,
--     AVG(usage_percentage) AS avg_usage_rate
-- FROM employee_leave_summary 
-- WHERE year = 2024 
-- GROUP BY department, leave_type_name;