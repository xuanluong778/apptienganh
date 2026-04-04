<?php
declare(strict_types=1);

function getDbConnection(): PDO
{
    $config = require __DIR__ . "/config.php";

    $dsn = sprintf(
        "mysql:host=%s;dbname=%s;charset=%s",
        $config["db_host"],
        $config["db_name"],
        $config["db_charset"]
    );

    return new PDO(
        $dsn,
        $config["db_user"],
        $config["db_pass"],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
}
