<?php

return [
    // trim: evita fallos si el .env tiene espacios; el hash bcrypt debe ir entre comillas si contiene $
    'password_hash' => trim((string) env('MASTER_PASSWORD_HASH', '')),
    'jwt_secret' => trim((string) env('ADMIN_JWT_SECRET', '')),
    'jwt_ttl_minutes' => (int) env('ADMIN_JWT_TTL_MINUTES', 480),
    'cookie_name' => env('ADMIN_COOKIE_NAME', 'workbeef_admin_token'),
];

