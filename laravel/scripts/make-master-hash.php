<?php

/**
 * Genera hash bcrypt y Base64 para el .env (sin caracteres $ en la linea B64).
 * Uso: php scripts/make-master-hash.php "TuClaveSegura"
 */

$plain = $argv[1] ?? 'Colbeef2026*';
$h = password_hash($plain, PASSWORD_BCRYPT, ['cost' => 12]);
$b64 = base64_encode($h);

echo PHP_EOL;
echo '=== Copia ESTO al final de laravel/.env (una linea, sin espacios al inicio) ===' . PHP_EOL;
echo PHP_EOL;
echo 'MASTER_PASSWORD_HASH_B64=' . $b64 . PHP_EOL;
echo PHP_EOL;
echo '=== Luego en la carpeta laravel ejecuta: php artisan config:clear ===' . PHP_EOL;
echo PHP_EOL;

echo '(Opcional, con $) MASTER_PASSWORD_HASH=' . "'" . $h . "'" . PHP_EOL;
echo 'Verify local: ' . (password_verify($plain, $h) ? 'OK' : 'FAIL') . ' | len(hash)=' . strlen($h) . PHP_EOL;
