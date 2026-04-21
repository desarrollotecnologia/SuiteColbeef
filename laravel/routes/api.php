<?php

use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\ChatProxyController;
use App\Http\Controllers\PowerBiPinController;
use App\Http\Controllers\SsoController;
use App\Http\Controllers\UsageStatsController;
use Illuminate\Support\Facades\Route;

Route::post('/admin/login', [AdminAuthController::class, 'login']);
Route::get('/admin/session', [AdminAuthController::class, 'session']);
Route::post('/admin/logout', [AdminAuthController::class, 'logout']);

Route::post('/chat', [ChatProxyController::class, 'chat']);

Route::get('/powerbi/pin/session', [PowerBiPinController::class, 'session']);
Route::post('/powerbi/pin', [PowerBiPinController::class, 'verify'])
    ->middleware('throttle:30,1');

Route::post('/stats/event', [UsageStatsController::class, 'record'])
    ->middleware('throttle:120,1');

Route::middleware('admin.jwt')->group(function () {
    Route::get('/admin/ping', fn () => response()->json([
        'ok' => true,
        'status' => 'authenticated',
    ]));
    Route::get('/admin/stats', [UsageStatsController::class, 'summary']);
    Route::post('/admin/sso/gh', [SsoController::class, 'issueGestionHumana']);
});

