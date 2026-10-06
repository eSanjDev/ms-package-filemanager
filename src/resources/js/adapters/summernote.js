(function(window) {
    window.FileBrowserAdapters = window.FileBrowserAdapters || {};

    window.FileBrowserAdapters.Summernote = {
        createButton: function(context) {
            var ui = $.summernote.ui;

            var button = ui.button({
                contents: '<i class="note-icon-picture"/> File Browser',
                tooltip: 'Open File Browser',
                click: function() {
                    const picker = new window.FileBrowserSDK({
                        callback: (files) => {
                            if (!files || files.length === 0) return;

                            files.reduce((previous, file) => previous.then(() => insertFile(context, file)), Promise.resolve());
                        }
                    });

                    picker.open();
                }
            });

            return button.render();
        }
    };

    function insertFile(context, file) {
        if (!window.FileBrowserSDK.isImage(file)) {
            insertLink(context, file);

            return Promise.resolve();
        }

        return Promise.resolve(context.invoke('editor.insertImage', file.url, function ($image) {
            $image.attr('alt', file.alt || file.name || '');
        })).catch(() => insertLink(context, file));
    }

    function insertLink(context, file) {
        const link = document.createElement('a');
        link.href = file.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = file.name || file.url;

        context.invoke('editor.insertNode', link);
        context.invoke('editor.insertText', ' ');
    }

})(window);
