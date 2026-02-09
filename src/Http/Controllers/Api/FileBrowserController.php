<?php
/*
 * @author      MOHAMMAD Ali Heidari
 * @email       h.mohammad026@gmail.com
 * @date        2026-02-08
 */

namespace Esanj\FileBrowser\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Esanj\FileBrowser\Services\FileBrowserService;

class FileBrowserController extends Controller
{
    public function init(Request $request, FileBrowserService $tokenService)
    {
        return response()
            ->json([
                'url' => $tokenService->getUrl()
            ]);
    }
}
