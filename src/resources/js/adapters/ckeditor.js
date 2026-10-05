(function(window) {
    window.FileBrowserAdapters = window.FileBrowserAdapters || {};

    const defaultConfig = {};

    window.FileBrowserAdapters.CKEditor = {
        configure: function(config) {
            Object.assign(defaultConfig, config);
        },

        initV4: function() {
            if (!window.CKEDITOR) return;

            window.CKEDITOR.on('dialogDefinition', function(ev) {
                var dialogName = ev.data.name;
                var dialogDefinition = ev.data.definition;

                if (dialogName === 'image' || dialogName === 'link') {
                    var infoTab = dialogDefinition.getContents('info');
                    var browseBtn = infoTab.get('browse');

                    if (browseBtn) {
                        browseBtn.hidden = false;
                        browseBtn.onClick = function() {
                            window.FileBrowserAdapters.CKEditor.openPicker();
                        };
                    }
                }
            });
        },

        openPicker: function() {
            if (typeof window.FileBrowserSDK === 'undefined') {
                console.error('FileBrowserSDK is not loaded.');
                return;
            }

            const picker = new window.FileBrowserSDK({
                callback: (files) => {
                    if (!files || files.length === 0) return;
                    const file = files[0];

                    if (window.CKEDITOR && window.CKEDITOR.dialog) {
                        const dialog = window.CKEDITOR.dialog.getCurrent();
                        if (dialog) {
                            if (dialog.getName() === 'image') {
                                const element = dialog.getContentElement('info', 'txtUrl');
                                if (element) element.setValue(file.url);
                                const alt = dialog.getContentElement('info', 'txtAlt');
                                if (alt) alt.setValue(file.alt || file.name);
                            } else if (dialog.getName() === 'link') {
                                const element = dialog.getContentElement('info', 'url');
                                if (element) element.setValue(file.url);
                            }
                        }
                    }
                }
            });
            picker.open();
        },

        v5: {
            create: function(editor) {
                // Check for ButtonView availability (handles different UMD bundle structures)
                const ButtonView = window.CKEDITOR.ButtonView || (window.CKEDITOR.ui && window.CKEDITOR.ui.ButtonView);

                if (!ButtonView) {
                    console.warn('FileBrowserAdapter: ButtonView not found. Cannot register toolbar button.');
                    return;
                }

                editor.ui.componentFactory.add('fileBrowser', locale => {
                    const view = new ButtonView(locale);

                    view.set({
                        label: 'Insert Image',
                        icon: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z"/></svg>',
                        tooltip: true
                    });

                    view.on('execute', () => {
                        if (typeof window.FileBrowserSDK === 'undefined') {
                            console.error('FileBrowserSDK is not loaded.');
                            return;
                        }

                        const picker = new window.FileBrowserSDK({
                            callback: (files) => {
                                if (!files || files.length === 0) return;
                                const file = files[0];

                                // Clean way to insert image if Image plugin is active
                                if (editor.commands.get('insertImage')) {
                                    editor.execute('insertImage', { source: file.url });
                                } else {
                                    // Fallback insertion
                                    const content = window.FileBrowserSDK.imageHtml(file.url, file.alt || file.name || '');
                                    const viewFragment = editor.data.processor.toView(content);
                                    const modelFragment = editor.data.toModel(viewFragment);
                                    editor.model.insertContent(modelFragment);
                                }
                            }
                        });
                        picker.open();
                    });

                    return view;
                });
            }
        }
    };

    function getUrlParam(paramName) {
        var reParam = new RegExp('(?:[\?&]|&)' + paramName + '=([^&]+)', 'i');
        var match = window.location.search.match(reParam);
        return (match && match.length > 1) ? match[1] : null;
    }

})(window);
