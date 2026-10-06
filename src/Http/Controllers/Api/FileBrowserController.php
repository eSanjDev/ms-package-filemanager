<?php
/*
 * @author      MOHAMMAD Ali Heidari
 * @email       h.mohammad026@gmail.com
 * @date        2026-02-08
 */

namespace Esanj\FileBrowser\Http\Controllers\Api;

use Esanj\FileBrowser\Services\FileBrowserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

class FileBrowserController extends Controller
{
    public function init(): JsonResponse
    {
        try {
            return response()->json(['url' => app(FileBrowserService::class)->getUrl()]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => 'The file browser is not available right now.'], 502);
        }
    }
}
