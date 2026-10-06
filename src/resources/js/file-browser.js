(function (window, document) {
    const STYLE_ID = 'fb-styles';
    const GENERIC_ERROR = 'Failed to load file browser. Please try again later.';
    const SESSION_ERROR = 'Your session has expired. Please sign in again and retry.';
    const COOKIE_ERROR = 'The file browser could not keep its session. Make sure this application and the file browser are served from the same site.';
    const RECONNECT_COOLDOWN_MS = 60000;
    const TEXT_FIELDS = ['name', 'mime', 'fileCategory', 'alt'];
    const NUMBER_FIELDS = ['size', 'width', 'height'];

    const state = {
        modal: null,
        frame: null,
        origin: null,
        ready: false,
        expired: false,
        reconnectedAt: 0,
        returnFocus: null,
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

            if (!isOpen()) {
                state.returnFocus = document.activeElement;
            }

            if (state.loading) {
                return state.loading;
            }

            if (state.modal && !state.expired) {
                show();

                return Promise.resolve();
            }

            return reload();
        }

        close() {
            close();
        }

        static isImage(file) {
            return Boolean(file) && (file.fileCategory === 'image' || (typeof file.mime === 'string' && file.mime.startsWith('image/')));
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

    FileBrowserSDK.initUrl = '/esanj-file-browser/api/init';

    function reload() {
        destroy();

        state.loading = load().finally(() => {
            state.loading = null;
        });

        return state.loading;
    }

    function load() {
        return fetch(FileBrowserSDK.initUrl, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' },
        })
            .then(response => response.json().catch(() => null).then(data => ({ response, data })))
            .then(({ response, data }) => {
                const url = response.ok && !response.redirected && data ? trustedUrl(data.url) : null;

                if (!url) {
                    fail(errorMessage(response), data);

                    return;
                }

                render(url);
            })
            .catch(error => fail(GENERIC_ERROR, error));
    }

    function render(url) {
        const modal = document.createElement('div');
        modal.id = 'fb-modal-root';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'File Browser');
        modal.innerHTML = `
            <div class="fb-overlay"></div>
            <div class="fb-container">
                <div class="fb-header">
                    <span>File Browser</span>
                    <button type="button" class="fb-close-btn" aria-label="Close">&times;</button>
                </div>
                <div class="fb-body"></div>
            </div>
        `;

        const frame = document.createElement('iframe');
        frame.id = 'fb-iframe';
        frame.title = 'File Browser';
        frame.setAttribute('allow', 'clipboard-write');
        frame.src = url.href;

        modal.querySelector('.fb-body').appendChild(frame);
        modal.querySelector('.fb-close-btn').addEventListener('click', close);
        modal.querySelector('.fb-overlay').addEventListener('click', close);
        document.body.appendChild(modal);

        state.modal = modal;
        state.frame = frame;
        state.origin = url.origin;
        state.ready = false;
        state.expired = false;

        window.addEventListener('message', receive);
        document.addEventListener('keydown', escape, true);
        frame.focus();
    }

    function show() {
        state.modal.style.display = 'flex';
        state.frame.focus();
    }

    function close() {
        if (!state.modal) {
            return;
        }

        if (state.expired || !state.ready) {
            destroy();
        } else {
            state.modal.style.display = 'none';
        }

        restoreFocus();
    }

    function restoreFocus() {
        const element = state.returnFocus;
        state.returnFocus = null;

        if (element && element.isConnected && typeof element.focus === 'function') {
            element.focus();
        }
    }

    function destroy() {
        window.removeEventListener('message', receive);
        document.removeEventListener('keydown', escape, true);

        if (state.modal) {
            state.modal.remove();
        }

        state.modal = null;
        state.frame = null;
        state.origin = null;
        state.ready = false;
        state.expired = false;
    }

    function escape(event) {
        if (event.key === 'Escape' && isOpen()) {
            event.stopPropagation();
            close();
        }
    }

    function receive(event) {
        if (!state.frame || event.source !== state.frame.contentWindow || event.origin !== state.origin) {
            return;
        }

        const message = event.data;

        if (!message || typeof message !== 'object') {
            return;
        }

        if (message.type === 'FM_READY') {
            state.ready = true;
        } else if (message.type === 'FM_SESSION_EXPIRED') {
            expire();
        } else if (message.type === 'FM_CLOSE_MODAL') {
            close();
        } else if (message.type === 'FM_SELECTED_ITEMS') {
            select(message.data);
        }
    }

    function expire() {
        state.expired = true;

        if (!isOpen()) {
            return;
        }

        if (!state.ready || Date.now() - state.reconnectedAt < RECONNECT_COOLDOWN_MS) {
            destroy();
            restoreFocus();
            fail(COOKIE_ERROR, null);

            return;
        }

        state.reconnectedAt = Date.now();
        reload();
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

    function errorMessage(response) {
        if (response.status === 401 || response.status === 419 || response.redirected) {
            return SESSION_ERROR;
        }

        if (response.status === 403) {
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
