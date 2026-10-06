# Esanj File Browser

This is a package that connects to the Esanj Multi-Media system after installation, allowing users to select files and add them to the editor. It functions as a file browser, similar to a file manager.

## Support

This package supports:
- PHP 8.2+ (Laravel 13 requires PHP 8.3+)
- Laravel 12.x
- Laravel 13.x

Laravel 10 and 11 are not supported because `esanj/auth-bridge` 1.x requires Laravel 12 or newer.

## Installation

### Via Composer (VCS Repository)

Add the repository to your `composer.json` file:

```json
"repositories": [
    {
        "type": "vcs",
        "url": "GIT_REPOSITORY_URL"
    }
]
```

Then run the following command to install the package (using `master` branch):

```bash
composer require esanj/file-browser:dev-master
```

### Post-Installation

After installing the package, publish the assets and configuration:

```bash
# Publish assets
php artisan vendor:publish --tag=file-browser-assets --force

# Publish configuration file
php artisan vendor:publish --tag=file-browser-config
```

## Security Configuration

After publishing the configuration file, it is **highly recommended** to edit `config/esanj/file-browser.php` and customize the `middleware` setting.

Please ensure you add appropriate middleware (e.g., `web`, `auth`, or a custom admin middleware) to restrict access to the file browser, preventing unauthorized users from accessing or managing files. The ticket does not identify your user: everyone who passes this middleware works with every permission granted to your service in the Multi-Media service (upload, delete, move, and so on). With the default `['web', 'auth']`, that is every signed-in user of your application.

```php
'route' => [
    'middleware' => ['web', 'auth', 'can:manage-media'],
],
```

The package reads this file under the `esanj.file-browser` key. Run `php artisan config:clear` (or `config:cache` again) after changing it on a server that caches its configuration.

## Environment Configuration

After installation, please add the following variables to your `.env` file:

```env
ACCOUNTING_BRIDGE_CLIENT_ID=
ACCOUNTING_BRIDGE_CLIENT_SECRET=
ACCOUNTING_BRIDGE_BASE_URL=https://auth.esanj.io
FILE_BROWSER_URL=http://media.app.test:8000
```

> **Note:** The `ACCOUNTING_BRIDGE_*` variables are required for the `esanj/auth-bridge` authentication package.

`FILE_BROWSER_URL` is the base URL of the Esanj Multi-Media service. Use the exact scheme, host and port the service is served from: the server requests tickets from it with a `POST`, which fails when the URL redirects (for example from `http` to `https`), and the browser script only accepts messages from that origin.

## Media Service Setup

Opening the file browser works in three steps:

1. Your backend gets a service token with the `ACCOUNTING_BRIDGE_*` client credentials.
2. It exchanges that token for a single-use ticket at `POST {FILE_BROWSER_URL}/api/v1/file-browser/tickets`.
3. The modal loads `{FILE_BROWSER_URL}/file-browser/auth/handshake?ticket=...`, which starts the file browser session.

The service token never reaches the browser. A ticket works once and expires after one minute by default. A page requests a new ticket the first time it opens the file browser and again after the file browser session expires.

An administrator of the Multi-Media service must configure the service that represents your application:

| Setting | Where | Value |
|---|---|---|
| Client | Services | The `client_id` must equal `ACCOUNTING_BRIDGE_CLIENT_ID`, and the service must be **active**. |
| `access` permission | Service permissions | Required to receive tickets and open the file browser. |
| Operation permissions | Service permissions | What your users may do: `files.search`, `files.download`, `files.upload`, `files.delete`, `files.move`, `files.copy`, `folders.create`, `folders.delete`, `folders.move`, `folders.copy`. Grant `share.create` to insert selected files into your forms and editors. |
| Node Permissions | Service page | At least one node with a base path (`/` for the whole node) and an access type: `read_only` or `read_write`. Writes, uploads and moving files require `read_write`. |
| Allowed Embed Origins | Service page | The exact origin of your application, one per line: `scheme://host[:port]` without a path or trailing slash. Wildcards are not supported. Only these origins can embed the file browser and receive selected files. |

The file browser runs inside an iframe and keeps its session in cookies, so your application and the Multi-Media service must be on the same site, which means the same registrable domain, such as `admin.example.com` and `media.example.com`. `localhost` and `127.0.0.1` are different sites. Avoid running both on `localhost` with two ports: cookies ignore the port, so the two applications overwrite each other's session and `XSRF-TOKEN` cookies. Embedding across sites only works over HTTPS with the service running as `APP_ENV=production` (which makes its file browser cookie `SameSite=None; Secure`) and with `SESSION_SAME_SITE=none` and `SESSION_SECURE_COOKIE=true`, and browsers that block third-party cookies may still refuse it.

Example for local development, with your application at `http://app.test:8080` and the Multi-Media service at `http://media.app.test:8000` (point both names at `127.0.0.1` in your hosts file):

```env
FILE_BROWSER_URL=http://media.app.test:8000
```

```text
Allowed Embed Origins: http://app.test:8080
```

Example for production, with your application at `https://admin.example.com` and the Multi-Media service at `https://media.example.com`:

```env
FILE_BROWSER_URL=https://media.example.com
```

```text
Allowed Embed Origins: https://admin.example.com
```

### Troubleshooting

| Symptom | Cause |
|---|---|
| The modal stays blank or the browser reports that the page refused to connect | The origin of your application is missing from **Allowed Embed Origins** or differs in scheme, host or port. The service answers with `Content-Security-Policy: frame-ancestors`. |
| A message says your session has expired or you do not have permission | `/esanj-file-browser/api/init` answered 401 or 403: the user is not signed in to your application or is blocked by the route middleware. |
| "Failed to load file browser" and the server log shows the reason | `/esanj-file-browser/api/init` answered 502 because the ticket could not be issued. Check that `ACCOUNTING_BRIDGE_BASE_URL`, `ACCOUNTING_BRIDGE_CLIENT_ID` and `ACCOUNTING_BRIDGE_CLIENT_SECRET` are set and valid (run `php artisan config:clear` after changing them), that `FILE_BROWSER_URL` is reachable from your server without redirects, and that the service is active and has the `access` permission. |
| The file browser shows "No storage node is available for this service" | The service has no node permission. |
| A file is selected but nothing is inserted | Your origin is missing from **Allowed Embed Origins**, `share.create` is not granted, or `FILE_BROWSER_URL` does not match the origin the file browser is served from. |
| The file browser session expires while the modal is open | The modal reconnects with a fresh ticket by itself. If it was hidden, a fresh ticket is requested the next time it opens. |
| "The file browser could not keep its session" | The service cookies do not reach the iframe: your application and the service are on different sites (for example `localhost` and `127.0.0.1`), or both run on `localhost` and overwrite each other's cookies. Serve them from two hosts of the same site. |

## Usage

This package supports multiple editors (Summernote, TinyMCE, CKEditor) and a standalone button mode.

The script calls `/esanj-file-browser/api/init` on your application. If your application is served under a sub-path, point it to the right URL after loading `file-browser.js`:

```html
<script>
    FileBrowserSDK.initUrl = @json(route('file-browser.init'));
</script>
```

Press `Escape` or click outside the modal to close it.

### Standalone Button

To use the file browser with a simple button (e.g., for a featured image), follow these steps:

1. Include the main script and the button adapter:

```html
<script src="{{ asset('vendor/file-browser/js/file-browser.js') }}"></script>
<script src="{{ asset('vendor/file-browser/js/adapters/button.js') }}"></script>
```

2.  Add the HTML markup. You need an input field for the value, an optional image tag for preview, and the button itself.
    -   Add the class `fb-trigger` to the button.
    -   Use `data-input` to specify the selector of the input field.
    -   Use `data-preview` to specify the selector of the preview image.

```html
<div class="form-group">
    <label>Featured Image</label>

    <!-- Input to store the selected file URL -->
    <input type="text" id="featured-image" name="image" class="form-control">

    <!-- Preview image -->
    <img id="preview-box" src="" style="display:none; width: 100px; margin-top: 10px;">

    <!-- Trigger button -->
    <button type="button"
            class="btn btn-primary fb-trigger"
            data-input="#featured-image"
            data-preview="#preview-box">
        Select File
    </button>
</div>
```

3. Initialize the button adapter:

```html
<script>
    window.addEventListener('DOMContentLoaded', () => {
        if (window.FileBrowserAdapters && window.FileBrowserAdapters.Button) {
            window.FileBrowserAdapters.Button.init();
        }
    });
</script>
```

#### Using a Custom Callback

You can also specify a custom JavaScript function to handle the selected files using the `data-callback` attribute.

1.  Define your callback function:

```javascript
// This function will be called when files are selected
function myCustomCallback(files) {
    if (!files || files.length === 0) return;
    
    console.log('Selected files:', files);
    alert('Selected file URL: ' + files[0].url);
}
```

2.  Add the `data-callback` attribute to your button:

```html
<button type="button"
        class="btn btn-info fb-trigger"
        data-callback="myCustomCallback">
    Select File (Custom Handler)
</button>
```

### TinyMCE Integration

First, include the adapter script after the main file browser script:

```html
<script src="{{ asset('vendor/file-browser/js/file-browser.js') }}"></script>
<script src="{{ asset('vendor/file-browser/js/adapters/tinymce.js') }}"></script>
```

#### TinyMCE 5, 6, 7, 8

For modern versions of TinyMCE, use the `file_picker_callback` option.

```javascript
tinymce.init({
    selector: '#mytextarea',
    plugins: 'image link media table',
    // Add 'filebrowser' to toolbar if you want the custom button
    toolbar: 'undo redo | link image media | filebrowser',

    // Use this callback for file selection
    file_picker_callback: FileBrowserAdapters.TinyMCE.v5,

    // Optional: Add a custom button to the toolbar
    setup: function (editor) {
        editor.ui.registry.addButton('filebrowser', {
            text: 'File Browser',
            icon: 'gallery',
            onAction: function () {
                FileBrowserAdapters.TinyMCE.openManager(editor);
            }
        });
    }
});
```

#### TinyMCE 4

For older versions (v4), use `file_browser_callback`.

```javascript
tinymce.init({
    selector: '#mytextarea',
    plugins: 'image link media table',
    toolbar: 'undo redo | link image media | filebrowser',

    // Use this callback for file selection
    file_browser_callback: FileBrowserAdapters.TinyMCE.v4,

    // Optional: Add a custom button to the toolbar
    setup: function (editor) {
        editor.addButton('filebrowser', {
            text: 'File Browser',
            icon: 'image',
            onclick: function () {
                FileBrowserAdapters.TinyMCE.openManager(editor);
            }
        });
    }
});
```

### CKEditor Integration

First, include the adapter script after the main file browser script:

```html
<script src="{{ asset('vendor/file-browser/js/file-browser.js') }}"></script>
<script src="{{ asset('vendor/file-browser/js/adapters/ckeditor.js') }}"></script>
```

#### CKEditor 4

For CKEditor 4, call the `initV4` method before creating the editor.

```html
<textarea name="editor1" id="editor1"></textarea>

<script src="https://cdn.ckeditor.com/4.22.1/standard/ckeditor.js"></script>
<script>
    // Initialize the adapter before creating the editor.
    // It shows the Browse button of the image, image2 and link dialogs and opens the file browser from it.
    FileBrowserAdapters.CKEditor.initV4();

    CKEDITOR.replace('editor1');
</script>
```

#### CKEditor 5

For CKEditor 5, add the adapter plugin to your editor configuration.

```html
<div id="editor5"></div>

<!-- Include CKEditor 5 (e.g., from CDN) -->
<link rel="stylesheet" href="https://cdn.ckeditor.com/ckeditor5/47.4.0/ckeditor5.css">
<script src="https://cdn.ckeditor.com/ckeditor5/47.4.0/ckeditor5.umd.js"></script>

<script>
    const { ClassicEditor, Essentials, Paragraph, Bold, Italic, Image, Link } = CKEDITOR;

    ClassicEditor
        .create(document.querySelector('#editor5'), {
            // CKEditor 5 v44+ requires a license key; the CDN build does not accept 'GPL'
            licenseKey: '<YOUR_LICENSE_KEY>',

             // 1. Add the adapter plugin
            extraPlugins: [FileBrowserAdapters.CKEditor.v5.create],

            // 2. Add 'fileBrowser' to the toolbar
            toolbar: [
                'undo', 'redo', '|', 'bold', 'italic', '|',
                'fileBrowser' // <--- Adds the button
            ],
            
            plugins: [ Essentials, Paragraph, Bold, Italic, Image, Link, /* ... other plugins */ ],
        })
        .then(editor => {
            console.log('Editor initialized');
        })
        .catch(error => {
            console.error(error);
        });
</script>
```

When CKEditor 5 comes from npm (for example with Vite), there is no global `CKEDITOR`. Pass the `ButtonView` class to the adapter before creating the editor:

```javascript
import { ButtonView } from 'ckeditor5';

FileBrowserAdapters.CKEditor.configure({ ButtonView });
```

### Summernote Integration

First, include the adapter script after the main file browser script:

```html
<script src="{{ asset('vendor/file-browser/js/file-browser.js') }}"></script>
<script src="{{ asset('vendor/file-browser/js/adapters/summernote.js') }}"></script>
```

Then, configure Summernote to include the custom button in the toolbar and register it in the `buttons` option.

```javascript
$('#summernote').summernote({
    placeholder: 'Hello Standalone',
    tabsize: 2,
    height: 300,
    toolbar: [
        ['style', ['style']],
        ['font', ['bold', 'underline', 'clear']],
        ['color', ['color']],
        ['para', ['ul', 'ol', 'paragraph']],
        ['table', ['table']],
        
        // Add 'fm-button' to the toolbar
        ['insert', ['link', 'picture', 'fm-button']],
        
        ['view', ['fullscreen', 'codeview', 'help']]
    ],
    buttons: {
        // Register the file browser button
        'fm-button': FileBrowserAdapters.Summernote.createButton
    }
});
```

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
