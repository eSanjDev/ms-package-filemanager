class FileBrowserSDK {
    constructor(config) {
        this.url = config.url || null;
        this.callback = config.callback || null;
        this._injectStyles();
    }

    open() {
        window._fileBrowserInstance = this;

        const existingModal = document.getElementById('fb-modal-root');
        if (existingModal) {
            existingModal.style.display = 'flex';
            return;
        }
        this._createModalDOM();
        window.addEventListener('message', this._handleMessage.bind(this));
    }

    close() {
        const modal = document.getElementById('fb-modal-root');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    _createModalDOM() {

        fetch('/esanj-file-browser/api/init', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        })
            .then(response => response.json())
            .then(data => {
                this.url = data.url;
                this._renderModal();
            })
            .catch(error => {
                alert('Failed to load file browser. Please try again later.');
                console.error('Error fetching iframe URL:', error);
            });
    }

    _renderModal(){
        const modalHTML = `
            <div id="fb-modal-root">
                <div class="fb-overlay"></div>
                <div class="fb-container">
                    <div class="fb-header">
                        <span>File Browser</span>
                        <button class="fb-close-btn">&times;</button>
                    </div>
                    <div class="fb-body">
                        <iframe
                            src="${this.url}"
                            id="fb-iframe"
                            allow="clipboard-write"
                            style="width: 100%; height: 100%; border: none;">
                        </iframe>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        this._bindEvents();
    }

    _bindEvents() {
        const modalRoot = document.getElementById('fb-modal-root');
        if (!modalRoot) return;

        const closeBtn = modalRoot.querySelector('.fb-close-btn');
        const overlay = modalRoot.querySelector('.fb-overlay');

        const closeAction = () => this.close();

        if (closeBtn) closeBtn.addEventListener('click', closeAction);
        if (overlay) overlay.addEventListener('click', closeAction);
    }

    _injectStyles() {
        const css = `
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
        const style = document.createElement('style');
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    _handleMessage(event) {
        const currentInstance = window._fileBrowserInstance || this;

        if (event.data.type === 'FM_SELECTED_ITEMS') {
            if (currentInstance.callback) {
                currentInstance.callback(event.data.data);
            }
            currentInstance.close();
        }

        if (event.data.type === 'FM_CLOSE_MODAL') {
            currentInstance.close();
        }
    }
}

window.FileBrowserSDK = FileBrowserSDK;
