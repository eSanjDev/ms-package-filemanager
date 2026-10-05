(function(window) {
    window.FileBrowserAdapters = window.FileBrowserAdapters || {};

    window.FileBrowserAdapters.Button = {
        /**
         * @param {string} selector
         */
        init: function(selector = '.fb-trigger') {
            const buttons = document.querySelectorAll(selector);

            buttons.forEach(btn => {
                if (btn.dataset.fbInitialized) return;
                btn.dataset.fbInitialized = 'true';

                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetInputId = this.dataset.input;
                    const targetPreviewId = this.dataset.preview;
                    const callbackName = this.dataset.callback;

                    const picker = new window.FileBrowserSDK({
                        callback: (files) => {
                            if (!files || files.length === 0) return;
                            const file = files[0];
                            if (targetInputId) {
                                const input = document.querySelector(targetInputId);
                                if (input) {
                                    input.value = file.url;
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    input.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            }

                            if (targetPreviewId) {
                                const img = document.querySelector(targetPreviewId);
                                if (img) {
                                    img.src = file.url;
                                    img.style.display = 'block';
                                }
                            }

                            if (callbackName && typeof window[callbackName] === 'function') {
                                window[callbackName](files);
                            }
                        }
                    });

                    picker.open();
                });
            });
        }
    };
})(window);
