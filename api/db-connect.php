<?php
/* Database connection. Credentials must live in api/db-secrets.php, which is not committed. */

mysqli_report(MYSQLI_REPORT_OFF);

function getDbConnection(): mysqli {
    static $conn = null;
    if ($conn !== null) return $conn;

    $secretsFile = __DIR__ . '/db-secrets.php';
    if (!is_file($secretsFile)) {
        error_log('DB connection failed: db-secrets.php not found.');
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Database is not configured on this server yet.']);
        exit;
    }

    $secrets = require $secretsFile;
    $host = trim((string) ($secrets['host'] ?? ''));
    $user = trim((string) ($secrets['user'] ?? ''));
    $password = (string) ($secrets['password'] ?? '');
    $dbname = trim((string) ($secrets['name'] ?? ''));

    if ($host === '' || $user === '' || $dbname === '') {
        error_log('DB configuration is incomplete.');
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Database is not configured on this server yet.']);
        exit;
    }

    $conn = mysqli_connect($host, $user, $password, $dbname);
    if (!$conn) {
        error_log('DB connection failed: ' . mysqli_connect_error());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Database connection failed. Check server configuration.']);
        exit;
    }

    $conn->set_charset('utf8mb4');
    return $conn;
}
