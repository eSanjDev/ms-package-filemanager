<?php
/*
 * @author      MOHAMMAD Ali Heidari
 * @email       h.mohammad026@gmail.com
 * @date        2026-02-08
 */

namespace Esanj\FileBrowser\Services;

use Esanj\AuthBridge\Contracts\ClientCredentialsServiceInterface;
use Esanj\AuthBridge\Exceptions\ConfigurationException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class FileBrowserService
{
    private const SCOPE = '*';

    public function __construct(
        private ClientCredentialsServiceInterface $clientCredentials
    ) {}

    public function generateToken(): string
    {
        [$clientId, $clientSecret] = $this->credentials();

        return $this->clientCredentials->getAccessToken($clientId, $clientSecret, self::SCOPE)->accessToken;
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
        $response = $this->requestTicket($baseUrl);

        if ($response->status() === 401) {
            [$clientId, $clientSecret] = $this->credentials();
            $this->clientCredentials->invalidateToken($clientId, $clientSecret, self::SCOPE);
            $response = $this->requestTicket($baseUrl);
        }

        $ticket = $response->throw()->json('ticket');

        throw_if(! is_string($ticket) || $ticket === '', \RuntimeException::class, 'The file browser did not issue a ticket.');

        return $ticket;
    }

    protected function requestTicket(string $baseUrl): Response
    {
        return Http::withToken($this->generateToken())
            ->acceptJson()
            ->timeout(10)
            ->post($baseUrl . 'api/v1/file-browser/tickets');
    }

    /**
     * @return array{0: string, 1: string}
     */
    protected function credentials(): array
    {
        $clientId = config('esanj.auth_bridge.client_id');
        $clientSecret = config('esanj.auth_bridge.client_secret');

        if (blank($clientId) || blank($clientSecret)) {
            throw ConfigurationException::missingCredentials();
        }

        return [$clientId, $clientSecret];
    }
}
