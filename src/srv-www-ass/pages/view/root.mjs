import { TemplateLoader } from '../../cmn/utils.mjs';

/**
 * 表示ページルートモジュール（表示モード選択）
 */
export class PagesView {
    /**
     * @param {CrowdAPI} api - APIクライアント
     * @param {Object} router - ルーター
     * @param {DeviceDetector} deviceDetector - デバイス判定ユーティリティ
     */
    constructor(api, router, deviceDetector) {
        this.api = api;
        this.router = router;
        this.deviceDetector = deviceDetector;
        this.viewModes = {
            list: {
                label: 'リスト表示',
                icon: '📋',
                description: '教室の混雑状況を一覧で表示',
                path: '/view/list'
            },
            grid: {
                label: 'グリッド表示',
                icon: '⚏',
                description: 'カード形式で混雑状況を表示',
                path: '/view/grid',
                disabled: true
            },
            map: {
                label: 'マップ表示',
                icon: '🗺️',
                description: 'フロアマップで混雑状況を表示',
                path: '/view/map',
                disabled: true
            }
        };
    }

    /**
     * ページを表示
     * @param {HTMLElement} container - コンテナ要素
     * @param {Object} params - パラメータ
     */
    async render(container, params) {
        try {
            // デバイス対応テンプレートを読み込み
            const template = await TemplateLoader.loadTemplate(this.deviceDetector.getDeviceSpecificPath('./templates/view'));
            container.innerHTML = template;

            // 表示モード選択ボタンを表示
            this.renderViewModeButtons();

            // イベントリスナーを設定
            this.setupEventListeners();

        } catch (error) {
            console.error('ViewPage render error:', error);
            container.innerHTML = '<div class="error">ページの読み込みに失敗しました</div>';
        }
    }

    /**
     * 表示モード選択ボタンを表示
     */
    renderViewModeButtons() {
        const selectorContainer = document.getElementById('viewModeSelector');
        if (!selectorContainer) return;

        const isMobile = window.innerWidth < 768;

        selectorContainer.innerHTML = `
            <div class="view-mode-buttons ${isMobile ? 'mobile' : 'pc'}">
                ${Object.keys(this.viewModes).map(mode => {
            const viewMode = this.viewModes[mode];
            return `
                        <button 
                            class="view-mode-btn ${isMobile ? 'btn-large' : ''}"
                            data-path="${viewMode.path}"
                            ${viewMode.disabled ? 'disabled title="準備中"' : ''}
                        >
                            <span class="btn-icon">${viewMode.icon}</span>
                            <span class="btn-label">${viewMode.label}</span>
                            <span class="btn-description">${viewMode.description}</span>
                            ${viewMode.disabled ? '<span class="btn-status">（準備中）</span>' : ''}
                        </button>
                    `;
        }).join('')}
            </div>
        `;
    }

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // 表示モードボタンクリック
        const buttons = document.querySelectorAll('.view-mode-btn');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const path = e.currentTarget.dataset.path;
                if (path && !e.currentTarget.disabled) {
                    this.router.navigateTo(path);
                }
            });
        });

        // ウィンドウリサイズ対応
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.renderViewModeButtons();
            }, 250);
        });

        // 入力画面への遷移ボタン
        const enterBtn = document.getElementById('enterBtn');
        if (enterBtn) {
            enterBtn.addEventListener('click', () => {
                this.router.navigateTo('/enter');
            });
        }
    }
}