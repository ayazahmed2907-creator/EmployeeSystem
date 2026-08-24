<?php
/* ============================================================
   update-employee.php
   Receives the JSON employee record posted by script.js when
   editing an existing dossier, validates + sanitizes every
   field (shared with register-employee.php via
   employee-validation.php), then UPDATEs the matching row in
   `employees` using a prepared statement.

   The row is located by `reference_no` (the `ref` field the
   client already has from when the record was first loaded) —
   reg_no / reference_no themselves are never changed here.
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

/* ---------- which record are we updating? ---------- */
$referenceNo = cleanText($data['ref'] ?? '', 30);
if ($referenceNo === '') {
    fail('Missing ref — cannot tell which employee to update.');
}

/* ---------- confirm the record exists, and grab its current photo path
   (so we know whether to delete an old uploaded file below) ---------- */
$lookup = $conn->prepare('SELECT id, photo_path FROM employees WHERE reference_no = ? LIMIT 1');
$lookup->bind_param('s', $referenceNo);
$lookup->execute();
$existing = $lookup->get_result()->fetch_assoc();
$lookup->close();

if (!$existing) {
    fail('No employee found with that reference number.', 404);
}

/* ---------- shared validation (name, email, phone, department, etc.) ---------- */
$fields = validateEmployeeInput($data);
extract($fields); // -> $name, $email, $phone, $department, $employmentType,
                   //    $officeLocation, $jobTitle, $salary, $isConfidential,
                   //    $startDate, $skills

$updatedAt = date('Y-m-d H:i:s');

/* ---------- photo ----------
   The client sends one of three things in `photo`:
   - a brand-new `data:image/...;base64,...` string  -> decode + save, replace old file
   - the SAME relative path it was given on load (e.g. "uploads/abc.png") -> leave untouched
   - null / empty                                     -> the photo was removed, clear it
   ---------------------------------------------------------------- */
$oldPhotoPath  = $existing['photo_path'];
$photoPath     = $oldPhotoPath; // default: unchanged
$photoToDelete = null;

$newPhotoPath = maybeSaveUploadedPhoto($data['photo'] ?? null);
if ($newPhotoPath !== null) {
    $photoPath     = $newPhotoPath;
    $photoToDelete = $oldPhotoPath; // clean up the old file once the update succeeds
} elseif (array_key_exists('photo', $data) && empty($data['photo'])) {
    // Client explicitly cleared the photo (removed it in the UI).
    $photoPath     = null;
    $photoToDelete = $oldPhotoPath;
}
// else: $data['photo'] is the unchanged existing path string -> $photoPath stays as $oldPhotoPath

/* ---------- update with a prepared statement ---------- */
$sql = "UPDATE employees SET
            full_name = ?, email = ?, phone = ?, department = ?,
            employment_type = ?, office_location = ?, job_title = ?, salary = ?,
            is_confidential = ?, start_date = ?, skills = ?, photo_path = ?, updated_at = ?
        WHERE reference_no = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param(
    'sssssssdisssss',
    $name, $email, $phone, $department,
    $employmentType, $officeLocation, $jobTitle, $salary,
    $isConfidential, $startDate, $skills, $photoPath, $updatedAt,
    $referenceNo
);

try {
    $stmt->execute();
} catch (mysqli_sql_exception $e) {
    if ($conn->errno === 1062) { // duplicate email on another row
        fail('Another employee already uses that email address.', 409);
    }
    error_log('Update failed: ' . $e->getMessage());
    fail('Could not update the employee record.', 500);
}

// Only remove the old photo file once the DB write actually succeeded.
if ($photoToDelete) {
    $oldFile = __DIR__ . '/' . $photoToDelete;
    if (is_file($oldFile)) {
        @unlink($oldFile);
    }
}

echo json_encode(['status' => 'ok', 'ref' => $referenceNo]);

$stmt->close();
$conn->close();
