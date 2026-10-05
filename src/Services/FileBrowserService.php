<?php
/*
 * @author      MOHAMMAD Ali Heidari
 * @email       h.mohammad026@gmail.com
 * @date        2026-02-08
 */

namespace Esanj\FileBrowser\Services;

use Esanj\AuthBridge\Contracts\ClientCredentialsServiceInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class FileBrowserService
{
    public function __construct(
        private ClientCredentialsServiceInterface $clientCredentials
    ) {}

    public function generateToken(): string
    {
        $tokenData = $this->clientCredentials->getAccessToken(
            clientId: config('esanj.auth_bridge.client_id'),
            clientSecret: config('esanj.auth_bridge.client_secret'),
            scope: '*'
        );
        return $tokenData->accessToken;
    }

    public function getUrl(array $payload = []): string
    {
        $baseUrl = config('esanj.file-browser.url');
        throw_if(empty($baseUrl), \Exception::class, 'File Browser URL is not configured.');

        $baseUrl = Str::finish($baseUrl, '/');

        return $baseUrl . 'file-browser/auth/handshake?' . http_build_query(array_merge($payload, ['ticket' => $this->issueTicket($baseUrl)]));
    }

    protected function issueTicket(string $baseUrl): string
    {
        $ticket = Http::withToken($this->generateToken())
            ->acceptJson()
            ->timeout(10)
            ->post($baseUrl . 'api/v1/file-browser/tickets')
            ->throw()
            ->json('ticket');

        throw_if(! is_string($ticket) || $ticket === '', \RuntimeException::class, 'The file browser did not issue a ticket.');

        return $ticket;
    }
}
