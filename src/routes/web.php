<?php
/*
 * @author      MOHAMMAD Ali Heidari
 * @email       h.mohammad026@gmail.com
 * @date        2026-02-08
 */


use Illuminate\Support\Facades\Route;
use Esanj\FileBrowser\Http\Controllers\Api\FileBrowserController;

Route::get('/api/init', [FileBrowserController::class, 'init'])->name('file-browser.init');
