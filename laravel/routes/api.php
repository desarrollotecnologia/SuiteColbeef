<?php

use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\ChatProxyController;
use App\Http\Controllers\SsoController;
use Illuminate\Support\Facades\Route;

Route::post('/admin/login', [AdminAuthController::class, 'login']);
Route::get('/admin/session', [AdminAuthController::class, 'session']);
Route::post('/admin/logout', [AdminAuthController::class, 'logout']);

Route::post('/chat', [ChatProxyController::class, 'chat']);

Route::middleware('admin.jwt')->group(function () {
    Route::get('/admin/ping', fn () => response()->json([
        'ok' => true,
        'status' => 'authenticated',
    ]));
    Route::post('/admin/sso/gh', [SsoController::class, 'issueGestionHumana']);
});

