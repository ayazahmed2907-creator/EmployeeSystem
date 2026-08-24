<?php
/* ============================================================
   register-employee.php
   Receives the JSON employee record posted by script.js,
   validates + sanitizes every field (shared with update-employee.php
   via employee-validation.php), then inserts one row into
   `employees` using a prepared statement. Prepared statements
   are what actually stops SQL injection here — the values are
   sent to MySQL separately from the query text, so nothing the
   client sends (even something like `'; DROP TABLE employees;--`)
   can be interpreted as SQL.
   ============================================================ */

header('Content-Type: application/json');
require __DIR__ . '/db-connect.php';
require __DIR__ . '/employee-validation.php';
$conn = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Only POST is accepted.']);
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON payload.']);
    exit;
}

/* ---------- shared validation (name, email, phone, department, etc.) ---------- */
$fields = validateEmployeeInput($data);
extract($fields); // -> $name, $email, $phone, $department, $employmentType,
                   //    $officeLocation, $jobTitle, $salary, $isConfidential,
                   //    $startDate, $skills

/* ---------- register-specific: regNo / referenceNo must be present ---------- */
$regNo       = cleanText($data['regNo'] ?? '', 20);
$referenceNo = cleanText($data['ref'] ?? '', 30);
if ($regNo === '' || $referenceNo === '') {
    fail('Missing regNo or ref.');
}

$filedAt = date('Y-m-d H:i:s');

/* ---------- photo: decode the base64 data-URL (if any), save it to disk ---------- */
$photoPath = maybeSaveUploadedPhoto($data['photo'] ?? null);

/* ---------- insert with a prepared statement ---------- */
$sql = "INSERT INTO employees
        (reg_no, reference_no, full_name, email, phone, department,
         employment_type, office_location, job_title, salary,
         is_confidential, start_date, skills, photo_path, filed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
$stmt->bind_param(
    'sssssssssdissss',
    $regNo, $referenceNo, $name, $email, $phone, $department,
    $employmentType, $officeLocation, $jobTitle, $salary,
    $isConfidential, $startDate, $skills, $photoPath, $filedAt
);

try {
    $stmt->execute();
} catch (mysqli_sql_exception $e) {
    if ($conn->errno === 1062) { // duplicate reg_no / reference_no / email
        fail('An employee with that reference number or email already exists.', 409);
    }
    error_log('Insert failed: ' . $e->getMessage());
    fail('Could not save the employee record.', 500);
}

echo json_encode(['status' => 'ok', 'id' => $stmt->insert_id, 'regNo' => $regNo]);

$stmt->close();
$conn->close();
