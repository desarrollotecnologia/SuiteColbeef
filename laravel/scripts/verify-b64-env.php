<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$h = (string) config('admin.password_hash');
echo strlen($h) . ' ' . substr($h, 0, 4) . ' ' . (Illuminate\Support\Facades\Hash::check('Colbeef2026*', $h) ? 'OK' : 'BAD') . PHP_EOL;
