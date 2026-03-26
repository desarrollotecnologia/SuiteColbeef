<?php

namespace App\Http\Controllers;

use Firebase\JWT\JWT;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class SsoController extends Controller
{
    /**
     * Emite un JWT corto para que app_ghv (Flask) abra sesión como ADMIN.
     * Requiere cookie de admin de Suite ya válida.
     */
    public function issueGestionHumana(): JsonResponse
    {
        $secret = (string) config('sso.gh.secret');
        $adminUserId = (string) config('sso.gh.admin_user_id');
        $audience = (string) config('sso.gh.audience');
        $ttlSeconds = (int) config('sso.gh.ttl_seconds', 120);

        if ($secret === '' || $adminUserId === '') {
            return response()->json([
                'ok' => false,
                'error' => 'SSO no configurado: SSO_GH_SECRET y GH_SSO_ADMIN_USER_ID en .env',
            ], 503);
        }

        $now = time();
        $payload = [
            'iss' => (string) config('app.url'),
            'aud' => $audience,
            'sub' => $adminUserId,
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + $ttlSeconds,
            'jti' => (string) Str::uuid(),
        ];

        $token = JWT::encode($payload, $secret, 'HS256');
        $base = rtrim((string) config('sso.gh.app_base_url'), '/');
        $url = $base.'/auth/sso?token='.rawurlencode($token).'&next=/departamentos';

        return response()->json(['ok' => true, 'url' => $url]);
    }
}
