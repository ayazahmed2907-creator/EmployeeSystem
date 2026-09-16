<?php
/* Shared authentication/session helpers. */

define('GOOGLE_CLIENT_ID', 'PUT-YOUR-GOOGLE-CLIENT-ID-HERE.apps.googleusercontent.com');

function isRequestSecure(): bool {
    if (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') return true;
    if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') return true;
    return !empty($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443;
}

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => isRequestSecure(),
    ]);
    session_start();
}

header('Content-Type: application/json');

function jsonFail($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

function requireAuth(): int {
    if (empty($_SESSION['user_id'])) jsonFail('Please sign in to continue.', 401);
    return (int) $_SESSION['user_id'];
}

function currentUser(): ?array {
    if (empty($_SESSION['user_id'])) return null;
    return ['id' => (int) $_SESSION['user_id'], 'name' => $_SESSION['user_name'] ?? '', 'email' => $_SESSION['user_email'] ?? ''];
}

function startSessionFor(array $user): void {
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['user_email'] = $user['email'];
}
