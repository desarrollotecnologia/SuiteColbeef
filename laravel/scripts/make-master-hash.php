<?php

/** Genera hash bcrypt y versión base64 (sin $ en el .env). Uso: php scripts/make-master-hash.php */

$plain = $argv[1] ?? 'Colbeef2026*';
$h = password_hash($plain, PASSWORD_BCRYPT, ['cost' => 12]);
$b64 = base64_encode($h);

echo "Plain: {$plain}\n";
echo "MASTER_PASSWORD_HASH='{$h}'\n";
echo "MASTER_PASSWORD_HASH_B64={$b64}\n";
echo "Verify: " . (password_verify($plain, $h) ? "OK\n" : "FAIL\n");
echo "len(hash)=" . strlen($h) . "\n";
