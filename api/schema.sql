-- ============================================================
-- EmpRegistry Pro — database schema
-- Run this against the `employeesystem` database you already
-- created (database.php / myserver.php / mysqli.php did that
-- part — you don't need those files anymore).
-- ============================================================

USE employeesystem;

CREATE TABLE IF NOT EXISTS employees (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reg_no           VARCHAR(20)   NOT NULL,   -- e.g. REG-000101
    reference_no     VARCHAR(30)   NOT NULL,   -- e.g. ERP-2026-00101
    full_name        VARCHAR(150)  NOT NULL,
    email            VARCHAR(150)  NOT NULL,
    phone            VARCHAR(30)   NOT NULL,
    department       VARCHAR(100)  NOT NULL,
    employment_type  VARCHAR(50)   DEFAULT 'Full-time',
    office_location  VARCHAR(100)  DEFAULT NULL,
    job_title        VARCHAR(150)  DEFAULT NULL,
    salary           DECIMAL(12,2) DEFAULT NULL,
    is_confidential  TINYINT(1)    NOT NULL DEFAULT 0,
    start_date       DATE          DEFAULT NULL,
    skills           TEXT          DEFAULT NULL,   -- comma-separated, e.g. "JavaScript, Leadership"
    photo_path       VARCHAR(255)  DEFAULT NULL,   -- relative path under /uploads, not the raw base64
    filed_at         DATETIME      NOT NULL,
    updated_at       DATETIME      DEFAULT NULL,
    created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_reg_no       (reg_no),
    UNIQUE KEY uq_reference_no (reference_no),
    UNIQUE KEY uq_email        (email),
    INDEX idx_department (department),
    INDEX idx_full_name  (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notes:
-- * uq_email assumes one record per email. Drop that UNIQUE KEY if you
--   want to allow duplicate emails (e.g. rehired employees).
-- * salary is nullable so "Mark confidential" can still store the row
--   without exposing the number through query.php (see query.php).
-- * skills is kept as a simple comma-separated TEXT column to match
--   the front end's `skills.join(', ')` value. If you later need to
--   filter/report by individual skill, normalize this into a separate
--   `employee_skills(employee_id, skill)` table instead.
