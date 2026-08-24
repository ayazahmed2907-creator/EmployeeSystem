<?php
/* ============================================================
   employee-validation.php
   Shared validation, sanitizing, and photo-upload rules for an
   employee record. Included by both register-employee.php
   (INSERT) and update-employee.php (UPDATE) so the two
   endpoints share one definition of "a valid employee record"
   instead of two copies that can quietly drift apart.

   What stays OUT of here on purpose, because the rules differ
   per endpoint:
     - reg_no / reference_no handling (register-only)
     - deciding whether to delete an old photo file (update-only)
     - the actual INSERT / UPDATE SQL
   ============================================================ */

function cleanText($v, $maxLen = 255) {
    $v = trim((string) $v);
    $v = strip_tags($v);          // defense-in-depth against stored XSS
    return mb_substr($v, 0, $maxLen);
}

function fail($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

function requireFields(array $data, array $fields) {
    foreach ($fields as $field) {
        if (empty($data[$field])) {
            fail("Missing field: $field");
        }
    }
}

/* ---------- validate + sanitize the common employee fields ----------
   Returns an assoc array of cleaned values:
   name, email, phone, department, employmentType, officeLocation,
   jobTitle, salary, isConfidential, startDate, skills
   ---------------------------------------------------------------- */
function validateEmployeeInput(array $data): array {
    requireFields($data, ['name', 'email', 'phone', 'department']);

    $name = cleanText($data['name'], 150);

    $email = trim((string) $data['email']);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fail('Invalid email address.');
    }
    $email = mb_substr($email, 0, 150);

    $phone = cleanText($data['phone'], 30);
    if (!preg_match('/^[0-9+\-\s()]{7,30}$/', $phone)) {
        fail('Invalid phone number.');
    }

    $department     = cleanText($data['department'], 100);
    $employmentType = cleanText($data['employmentType'] ?? 'Full-time', 50);
    $officeLocation = cleanText($data['officeLocation'] ?? '', 100) ?: null;
    $jobTitle       = cleanText($data['jobTitle'] ?? '', 150) ?: null;

    $salary = null;
    if (isset($data['salary']) && $data['salary'] !== '') {
        if (!is_numeric($data['salary']) || $data['salary'] < 0) {
            fail('Salary must be a positive number.');
        }
        $salary = round((float) $data['salary'], 2);
    }

    $isConfidential = !empty($data['confidential']) ? 1 : 0;

    $startDate = null;
    if (!empty($data['startDate'])) {
        $d = DateTime::createFromFormat('Y-m-d', $data['startDate']);
        if (!$d || $d->format('Y-m-d') !== $data['startDate']) {
            fail('Invalid start date, expected YYYY-MM-DD.');
        }
        $startDate = $data['startDate'];
    }

    $skills = '';
    if (!empty($data['skills']) && is_array($data['skills'])) {
        $skills = implode(', ', array_map(fn($s) => cleanText($s, 60), $data['skills']));
    }

    return compact(
        'name', 'email', 'phone', 'department', 'employmentType',
        'officeLocation', 'jobTitle', 'salary', 'isConfidential',
        'startDate', 'skills'
    );
}

/* ---------- decode + save a base64 photo upload, if one was actually sent ----------
   Mirrors the original register-employee.php behavior exactly:
   - not present, or present but not a recognizable data: URL -> returns null,
     no error (caller treats this as "no new photo")
   - present and looks like a data: URL but fails to decode, or is too big
     -> fail() (400), same as before
   - valid -> saved to /uploads with a random filename, relative path returned
   ---------------------------------------------------------------- */
function maybeSaveUploadedPhoto($photoField): ?string {
    if (empty($photoField) || !preg_match('/^data:image\/(png|jpe?g);base64,(.+)$/', $photoField, $m)) {
        return null;
    }

    $ext    = $m[1] === 'jpg' ? 'jpeg' : $m[1];
    $binary = base64_decode($m[2], true);
    if ($binary === false) {
        fail('Invalid photo data.');
    }
    if (strlen($binary) > 5 * 1024 * 1024) { // 5MB cap
        fail('Photo is too large (max 5MB).');
    }

    $uploadsDir = __DIR__ . '/uploads';
    if (!is_dir($uploadsDir)) {
        mkdir($uploadsDir, 0755, true);
    }
    $filename = bin2hex(random_bytes(16)) . '.' . $ext; // random name, never trust client filenames
    file_put_contents($uploadsDir . '/' . $filename, $binary);
    return 'uploads/' . $filename;
}
