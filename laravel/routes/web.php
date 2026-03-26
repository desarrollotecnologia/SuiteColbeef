<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/site.html');
});

Route::middleware('admin.jwt')->group(function () {
    Route::get('/admin', function () {
        return response()->json([
            'ok' => true,
            'message' => 'Ruta privada admin habilitada.',
        ]);
    });
});
