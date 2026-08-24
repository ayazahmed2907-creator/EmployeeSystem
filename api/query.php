<?php
/* ============================================================
   query.php
   Read-only endpoint for the Records / Search pages.

     GET query.php            -> every employee, newest first
     GET query.php?q=jane     -> employees matching name/email/reference

   Even though this only builds a SELECT, the search term still
   goes through a prepared statement — without that, someone
   typing something like `x' OR '1'='1` into the search box could
   manipulate the query.
   ============================================================ */

header('Content-Type: application/json');
require __DIR__ . '/db-connect.php';
$conn = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Only GET is accepted.']);
    exit;
}

$q = isset($_GET['q']) ? trim($_GET['q']) : '';
$q = mb_substr($q, 0, 150);

$baseSql = "SELECT id, reg_no, reference_no, full_name, email, phone, department,
                   employment_type, office_location, job_title,
                   IF(is_confidential, NULL, salary) AS salary,
                   is_confidential, start_date, skills, photo_path,
                   filed_at, updated_at
            FROM employees";

if ($q !== '') {
    $sql  = $baseSql . " WHERE full_name LIKE ? OR email LIKE ? OR reference_no LIKE ?
                          ORDER BY filed_at DESC";
    $like = '%' . $q . '%';
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('sss', $like, $like, $like);
} else {
    $sql  = $baseSql . " ORDER BY filed_at DESC";
    $stmt = $conn->prepare($sql);
}

$stmt->execute();
$result = $stmt->get_result();

$rows = [];
while ($row = $result->fetch_assoc()) {
    $row['is_confidential'] = (bool) $row['is_confidential'];
    $row['skills'] = $row['skills'] ? array_map('trim', explode(',', $row['skills'])) : [];
    $rows[] = $row;
}

echo json_encode(['status' => 'ok', 'count' => count($rows), 'employees' => $rows]);

$stmt->close();
$conn->close();
