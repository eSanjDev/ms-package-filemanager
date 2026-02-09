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

                            files.forEach(file => {
                                if ((file.mime && file.mime.startsWith('image/')) || (file.fileCategory && file.fileCategory == 'image')) {
                                    context.invoke('editor.insertImage', file.url, function ($image) {
                                        $image.attr('alt', file.alt || file.name);
                                    });
                                } else {
                                    var linkText = file.name;
                                    var linkUrl = file.url;
                                    var isNewWindow = true;

                                    context.invoke('editor.createLink', {
                                        text: linkText,
                                        url: linkUrl,
                                        isNewWindow: isNewWindow
                                    });
                                }
                            });
                        }
                    });

                    picker.open();
                }
            });

            return button.render();
        }
    };

})(window);
