<?php

return [
    'password_hash' => env('MASTER_PASSWORD_HASH', ''),
    'jwt_secret' => env('ADMIN_JWT_SECRET', ''),
    'jwt_ttl_minutes' => (int) env('ADMIN_JWT_TTL_MINUTES', 480),
    'cookie_name' => env('ADMIN_COOKIE_NAME', 'workbeef_admin_token'),
];

