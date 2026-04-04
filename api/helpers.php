<?php
declare(strict_types=1);

function jsonResponse(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function getRequestData(): array
{
    $contentType = $_SERVER["CONTENT_TYPE"] ?? "";
    if (stripos($contentType, "application/json") !== false) {
        $raw = file_get_contents("php://input");
        if (!$raw) {
            return [];
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    return $_POST;
}

function requirePostMethod(): void
{
    if (($_SERVER["REQUEST_METHOD"] ?? "") !== "POST") {
        jsonResponse(405, [
            "success" => false,
            "message" => "Method not allowed. Use POST.",
        ]);
    }
}
