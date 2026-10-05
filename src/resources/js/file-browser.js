(function (window, document) {
    const INIT_URL = '/esanj-file-browser/api/init';
    const STYLE_ID = 'fb-styles';
    const GENERIC_ERROR = 'Failed to load file browser. Please try again later.';
    const TEXT_FIELDS = ['name', 'mime', 'fileCategory', 'alt'];
    const NUMBER_FIELDS = ['size', 'width', 'height'];

    const state = {
        modal: null,
        frame: null,
        origin: null,
        expired: false,
        loading: null,
        owner: null,
    };

    class FileBrowserSDK {
        constructor(config = {}) {
            this.callback = typeof config.callback === 'function' ? config.callback : null;
            injectStyles();
        }

        open() {
            state.owner = this;

            if (state.loading) {
                return state.loading;
            }

            if (state.modal && !state.expired) {
                state.modal.style.display = 'flex';

                return Promise.resolve();
            }

            destroy();

            state.loading = load().finally(() => {
                state.loading = null;
            });

            return state.loading;
        }

        close() {
            close();
        }

        static imageHtml(url, alt = '') {
            const image = document.createElement('img');
            image.setAttribute('src', url);
            image.setAttribute('alt', alt);
            image.style.maxWidth = '100%';

            return image.outerHTML;
        }

        static linkHtml(url, text = '') {
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.textContent = text || url;

            return link.outerHTML;
        }
    }

    function load() {
        return fetch(INIT_URL, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' },
        })
            .then(response => response.json().catch(() => null).then(data => ({ response, data })))
            .then(({ response, data }) => {
                const url = response.ok && data ? trustedUrl(data.url) : null;

                if (!url) {
                    fail(errorMessage(response.status), data);

                    return;
                }

                render(url);
            })
            .catch(error => fail(GENERIC_ERROR, error));
    }

    function render(url) {
        const modal = document.createElement('div');
        modal.id = 'fb-modal-root';
        modal.innerHTML = `
            <div class="fb-overlay"></div>
            <div class="fb-container">
                <div class="fb-header">
                    <span>File Browser</span>
                    <button type="button" class="fb-close-btn">&times;</button>
                </div>
                <div class="fb-body"></div>
            </div>
        `;

        const frame = document.createElement('iframe');
        frame.id = 'fb-iframe';
        frame.setAttribute('allow', 'clipboard-write');
        frame.src = url.href;

        modal.querySelector('.fb-body').appendChild(frame);
        modal.querySelector('.fb-close-btn').addEventListener('click', close);
        modal.querySelector('.fb-overlay').addEventListener('click', close);
        document.body.appendChild(modal);

        state.modal = modal;
        state.frame = frame;
        state.origin = url.origin;
        state.expired = false;

        window.addEventListener('message', receive);
    }

    function close() {
        if (!state.modal) {
            return;
        }

        if (state.expired) {
            destroy();

            return;
        }

        state.modal.style.display = 'none';
    }

    function destroy() {
        window.removeEventListener('message', receive);

        if (state.modal) {
            state.modal.remove();
        }

        state.modal = null;
        state.frame = null;
        state.origin = null;
        state.expired = false;
    }

    function receive(event) {
        if (!state.frame || event.source !== state.frame.contentWindow || event.origin !== state.origin) {
            return;
        }

        const message = event.data;

        if (!message || typeof message !== 'object') {
            return;
        }

        if (message.type === 'FM_SESSION_EXPIRED') {
            state.expired = true;
        } else if (message.type === 'FM_CLOSE_MODAL') {
            close();
        } else if (message.type === 'FM_SELECTED_ITEMS') {
            select(message.data);
        }
    }

    function select(data) {
        const owner = state.owner;

        if (state.expired || !isOpen() || !isValidSelection(data)) {
            return;
        }

        close();

        if (owner && owner.callback) {
            owner.callback(data);
        }
    }

    function isOpen() {
        return state.modal !== null && state.modal.style.display !== 'none';
    }

    function isValidSelection(data) {
        return Array.isArray(data) && data.length > 0 && data.every(isValidFile);
    }

    function isValidFile(file) {
        return file !== null
            && typeof file === 'object'
            && trustedUrl(file.url) !== null
            && TEXT_FIELDS.every(field => file[field] == null || typeof file[field] === 'string')
            && NUMBER_FIELDS.every(field => file[field] == null || typeof file[field] === 'number');
    }

    function trustedUrl(value) {
        if (typeof value !== 'string') {
            return null;
        }

        try {
            const url = new URL(value);

            return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
        } catch (error) {
            return null;
        }
    }

    function errorMessage(status) {
        if (status === 401 || status === 419) {
            return 'Your session has expired. Please sign in again and retry.';
        }

        if (status === 403) {
            return 'You do not have permission to use the file browser.';
        }

        return GENERIC_ERROR;
    }

    function fail(message, detail) {
        alert(message);
        console.error('File browser could not be opened:', detail);
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #fb-modal-root {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                z-index: 999999; display: flex; align-items: center; justify-content: center;
                font-family: sans-serif;
            }
            .fb-overlay {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(2px);
            }
            .fb-container {
                position: relative; width: 90%; height: 90%; max-width: 1200px;
                background: #fff; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                display: flex; flex-direction: column; overflow: hidden;
                animation: fb-fade-in 0.2s ease-out;
            }
            .fb-header {
                padding: 10px 15px; border-bottom: 1px solid #eee; display: flex;
                justify-content: space-between; align-items: center; background: #f8f9fa;
            }
            .fb-close-btn {
                background: none; border: none; font-size: 24px; cursor: pointer; color: #666;
            }
            .fb-body { flex: 1; position: relative; }
            #fb-iframe { width: 100%; height: 100%; border: none; }
            @keyframes fb-fade-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        `;
        document.head.appendChild(style);
    }

    window.FileBrowserSDK = FileBrowserSDK;
})(window, document);
