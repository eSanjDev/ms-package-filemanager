<?php
/*
 * @author      MOHAMMAD Ali Heidari
 * @email       h.mohammad026@gmail.com
 * @date        2026-02-08
 */

return [
    'url' => env('FILE_BROWSER_URL'),
    'route' => [
        'middleware' => ['web', 'auth'],
    ],
];
