<?php

return [
    'gh' => [
        'secret' => env('SSO_GH_SECRET', ''),
        'audience' => env('SSO_GH_AUDIENCE', 'app_ghv'),
        'app_base_url' => env('GH_APP_BASE_URL', 'http://127.0.0.1:5000'),
        'admin_user_id' => env('GH_SSO_ADMIN_USER_ID', ''),
        'ttl_seconds' => (int) env('SSO_GH_TTL_SECONDS', 120),
    ],
];
