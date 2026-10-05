/**
 * File Browser Adapter for TinyMCE
 * Supports: TinyMCE 5, 6, 7 (Modern) & TinyMCE 4 (Legacy)
 */
(function(window) {
    window.FileBrowserAdapters = window.FileBrowserAdapters || {};

    const defaultConfig = {};

    window.FileBrowserAdapters.TinyMCE = {

        configure: function(config) {
            Object.assign(defaultConfig, config);
        },

        /**
         * TinyMCE 5, 6, 7, 8
         * Usage: file_picker_callback: FileBrowserAdapters.TinyMCE.v5
         */
        v5: function(callback, value, meta) {
            let fileType = meta.filetype || 'file';

            const picker = new window.FileBrowserSDK({
                callback: (files) => {
                    if (!files || files.length === 0) return;

                    const file = files[0];

                    if (fileType === 'image' && file.fileCategory !== 'image') {
                        alert('Selected file is not an image');
                        return;
                    }

                    if (fileType === 'media' && file.fileCategory !== 'video' && file.fileCategory !== 'audio') {
                        alert('Selected file is not a video or audio');
                        return;
                    }

                    const metaData = {};

                    if (fileType === 'image') {
                        metaData.alt = file.alt || file.name || '';
                        if (file.width) metaData.width = String(file.width);
                        if (file.height) metaData.height = String(file.height);
                    } else if (fileType === 'media') {
                        // For media (video/audio), only source is needed
                    } else {
                        metaData.text = file.name || '';
                        metaData.title = file.name || '';
                    }

                    callback(file.url, metaData);
                }
            });

            picker.open();
        },

        /**
         * TinyMCE 4 (Legacy)
         * Usage: file_browser_callback: FileBrowserAdapters.TinyMCE.v4
         */
        v4: function(field_name, url, type, win) {
            const picker = new window.FileBrowserSDK({
                callback: (files) => {
                    if (!files || files.length === 0) return;
                    const file = files[0];

                    if (type === 'image' && file.fileCategory !== 'image') {
                        alert('Selected file is not an image');
                        return;
                    }

                    if (type === 'media' && file.fileCategory !== 'video' && file.fileCategory !== 'audio') {
                        alert('Selected file is not a video or audio');
                        return;
                    }

                    win.document.getElementById(field_name).value = file.url;

                    if (type === 'image') {
                        try {
                            const input = win.document.getElementById(field_name);
                            if (input.onchange) input.onchange();
                        } catch(e) {}
                    }
                }
            });

            picker.open();
        },

        openManager: function(editor) {
            const picker = new window.FileBrowserSDK({
                callback: (files) => {
                    if (!files || files.length === 0) return;

                    let htmlToInsert = '';

                    files.forEach(file => {
                        if ((file.mime && file.mime.startsWith('image/')) || (file.fileCategory && file.fileCategory === 'image')) {
                            htmlToInsert += window.FileBrowserSDK.imageHtml(file.url, file.alt || file.name || '') + '<br>';
                        } else {
                            htmlToInsert += window.FileBrowserSDK.linkHtml(file.url, file.name || '') + '<br>';
                        }
                    });

                    editor.insertContent(htmlToInsert);
                }
            });
            picker.open();
        }
    };

})(window);
