<?php
/* ============================================================
   db-connect.php
   One reusable, secure MySQLi connection for the whole project.
   Call getDbConnection() from any file that needs $conn — that
   keeps $conn explicitly declared in the file that uses it,
   instead of relying on it "leaking in" from a require, which
   is what was tripping up your editor's linter.
   ============================================================ */

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function getDbConnection(): mysqli {
    static $conn = null;
    if ($conn !== null) {
        return $conn;
    }

    $DB_HOST = 'localhost';
    $DB_USER = 'root';
    $DB_PASS = '';
    $DB_NAME = 'employeesystem';

    try {
        $conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
        $conn->set_charset('utf8mb4');
    } catch (mysqli_sql_exception $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        // Never echo $e->getMessage() to the client — it can leak
        // credentials or schema details. Log it server-side instead.
        error_log('DB connection failed: ' . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => 'Database connection failed.']);
        exit;
    }

    return $conn;
}
