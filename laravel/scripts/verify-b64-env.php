<?php

/**
 * Diagnóstico: compara el hash del .env con lo que ve Laravel (config).
 * Si ves "BAD" o MISMATCH_CONFIG: ejecuta `php artisan config:clear`
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$envPath = dirname(__DIR__) . '/.env';
$rawB64 = '';
if (is_readable($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (str_starts_with($line, 'MASTER_PASSWORD_HASH_B64=')) {
            $rawB64 = trim(substr($line, strlen('MASTER_PASSWORD_HASH_B64=')));
            break;
        }
    }
}

$fromFile = '';
if ($rawB64 !== '') {
    $d = base64_decode($rawB64, true);
    if ($d !== false && strlen($d) >= 50) {
        $fromFile = $d;
    }
}

$fromConfig = (string) config('admin.password_hash');
$cachedFile = dirname(__DIR__) . '/bootstrap/cache/config.php';

echo '--- Workbeef: verificación contraseña maestra ---' . PHP_EOL;
echo 'archivo_cache_config: ' . (is_file($cachedFile) ? 'SI (puede estar desactualizado)' : 'no') . PHP_EOL;
echo 'len(hash_desde_.env): ' . strlen($fromFile) . PHP_EOL;
echo 'len(hash_config_laravel): ' . strlen($fromConfig) . PHP_EOL;

if ($fromFile !== '' && $fromConfig !== '' && $fromFile !== $fromConfig) {
    echo '>>> MISMATCH_CONFIG: el .env y config() no coinciden. Ejecuta: php artisan config:clear' . PHP_EOL;
}

$plain = 'Colbeef2026*';
$okFile = $fromFile !== '' && password_verify($plain, $fromFile);
$okConfig = $fromConfig !== '' && password_verify($plain, $fromConfig);

echo 'password_verify_desde_.env: ' . ($okFile ? 'OK' : 'BAD') . PHP_EOL;
echo 'password_verify_desde_config: ' . ($okConfig ? 'OK' : 'BAD') . PHP_EOL;

if (is_file($cachedFile)) {
    echo PHP_EOL . 'Si sigue BAD: borra o regenera caché:' . PHP_EOL;
    echo '  php artisan config:clear' . PHP_EOL;
    echo '  (o elimina bootstrap/cache/config.php si existe)' . PHP_EOL;
}
