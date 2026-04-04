<?php
declare(strict_types=1);

require __DIR__ . "/db.php";
require __DIR__ . "/helpers.php";

requirePostMethod();

$data = getRequestData();
$email = trim((string)($data["email"] ?? ""));
$password = (string)($data["password"] ?? "");

if ($email === "" || $password === "") {
    jsonResponse(422, [
        "success" => false,
        "message" => "Email and password are required.",
    ]);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(422, [
        "success" => false,
        "message" => "Invalid email format.",
    ]);
}

try {
    $pdo = getDbConnection();

    $stmt = $pdo->prepare("SELECT id, name, email, password_hash FROM users WHERE email = :email LIMIT 1");
    $stmt->execute(["email" => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user["password_hash"])) {
        jsonResponse(401, [
            "success" => false,
            "message" => "Invalid email or password.",
        ]);
    }

    jsonResponse(200, [
        "success" => true,
        "message" => "Login successful.",
        "data" => [
            "user_id" => (int)$user["id"],
            "name" => $user["name"],
            "email" => $user["email"],
        ],
    ]);
} catch (Throwable $e) {
    jsonResponse(500, [
        "success" => false,
        "message" => "Server error while logging in.",
    ]);
}
