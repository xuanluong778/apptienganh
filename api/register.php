<?php
declare(strict_types=1);

require __DIR__ . "/db.php";
require __DIR__ . "/helpers.php";

requirePostMethod();

$data = getRequestData();
$name = trim((string)($data["name"] ?? ""));
$email = trim((string)($data["email"] ?? ""));
$password = (string)($data["password"] ?? "");

if ($name === "" || $email === "" || $password === "") {
    jsonResponse(422, [
        "success" => false,
        "message" => "Name, email and password are required.",
    ]);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(422, [
        "success" => false,
        "message" => "Invalid email format.",
    ]);
}

if (strlen($password) < 6) {
    jsonResponse(422, [
        "success" => false,
        "message" => "Password must be at least 6 characters.",
    ]);
}

try {
    $pdo = getDbConnection();

    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
    $checkStmt->execute(["email" => $email]);
    if ($checkStmt->fetch()) {
        jsonResponse(409, [
            "success" => false,
            "message" => "Email already registered.",
        ]);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $insertStmt = $pdo->prepare(
        "INSERT INTO users (name, email, password_hash, created_at) VALUES (:name, :email, :password_hash, NOW())"
    );
    $insertStmt->execute([
        "name" => $name,
        "email" => $email,
        "password_hash" => $hash,
    ]);

    jsonResponse(201, [
        "success" => true,
        "message" => "Register successful.",
        "data" => [
            "user_id" => (int)$pdo->lastInsertId(),
            "name" => $name,
            "email" => $email,
        ],
    ]);
} catch (Throwable $e) {
    jsonResponse(500, [
        "success" => false,
        "message" => "Server error while registering.",
    ]);
}
