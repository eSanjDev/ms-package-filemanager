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

Please ensure you add appropriate middleware (e.g., `web`, `auth`, or a custom admin middleware) to restrict access to the file browser, preventing unauthorized users from accessing or managing files.

## Environment Configuration

After installation, please add the following variables to your `.env` file:

```env
ACCOUNTING_BRIDGE_CLIENT_ID=
ACCOUNTING_BRIDGE_CLIENT_SECRET=
ACCOUNTING_BRIDGE_BASE_URL=https://auth.esanj.io
FILE_BROWSER_URL=http://127.0.0.1:8000
```

> **Note:** The `ACCOUNTING_BRIDGE_*` variables are required for the `esanj/auth-bridge` authentication package.

## Usage

This package supports multiple editors (Summernote, TinyMCE, CKEditor) and a standalone button mode.

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

For CKEditor 4, use the `initV4` method after replacing your textarea.

```html
<textarea name="editor1" id="editor1"></textarea>

<script src="https://cdn.ckeditor.com/4.22.1/standard/ckeditor.js"></script>
<script>
    CKEDITOR.replace('editor1', {
        // Essential: Disable default file browser URLs so the adapter can take over
        filebrowserBrowseUrl: 'javascript:void(0);',
        filebrowserImageBrowseUrl: 'javascript:void(0);'
    });

    // Initialize the adapter for CKEditor 4
    // This hooks into the file browser buttons automatically
    FileBrowserAdapters.CKEditor.initV4();
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
    const { ClassicEditor, Essentials, Image, Link } = CKEDITOR;

    ClassicEditor
        .create(document.querySelector('#editor5'), {
             // 1. Add the adapter plugin
            extraPlugins: [FileBrowserAdapters.CKEditor.v5.create],

            // 2. Add 'fileBrowser' to the toolbar
            toolbar: [
                'undo', 'redo', '|', 'bold', 'italic', '|',
                'fileBrowser' // <--- Adds the button
            ],
            
            plugins: [ Essentials, Image, Link, /* ... other plugins */ ],
        })
        .then(editor => {
            console.log('Editor initialized');
        })
        .catch(error => {
            console.error(error);
        });
</script>
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
