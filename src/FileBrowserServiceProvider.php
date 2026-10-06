<?php
/*
 * @author      MOHAMMAD Ali Heidari
 * @email       h.mohammad026@gmail.com
 * @date        2026-02-08
 */

namespace Esanj\FileBrowser;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class FileBrowserServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->mergeConfigFrom(__DIR__ . '/config/file-browser.php', 'esanj.file-browser');
    }

    public function boot()
    {
        // Routes
        $this->registerRoutes();

        // Publish config
        $this->publishes([
            __DIR__.'/config/file-browser.php' => config_path('esanj/file-browser.php'),
        ], ['file-browser-config']);

        // Publish assets
        $this->publishes([
            __DIR__.'/resources/js' => public_path('vendor/file-browser/js'),
        ], ['file-browser-assets', 'laravel-assets']);
    }

    protected function registerRoutes()
    {
        Route::group([
            'prefix' => 'esanj-file-browser',
            'middleware' => config('esanj.file-browser.route.middleware', ['web', 'auth']),
        ], function () {
            $this->loadRoutesFrom(__DIR__.'/routes/web.php');
        });
    }
}
