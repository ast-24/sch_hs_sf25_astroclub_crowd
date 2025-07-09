import { CrowdAPI } from '../../cmn/api.mjs';
import { TemplateLoader } from '../../cmn/utils.mjs';

/**
 * 混雑状況表示ページモジュール
 */
export class PagesViewList {
    /**
     * @param {CrowdAPI} api - APIクライアント
     * @param {Object} router - ルーター
     * @param {DeviceDetector} deviceDetector - デバイス判定ユーティリティ
     */
    constructor(api, router, deviceDetector) {
        this.api = api;
        this.router = router;
        this.deviceDetector = deviceDetector;
        this.pollingInterval = null; // ポーリング用のタイマー

        // visibilitychangeハンドラーをバインド（削除時に必要）
        this.handleVisibilityChange = () => {
            if (document.hidden) {
                this.stopPolling();
            } else {
                this.startPolling();
            }
        };

        this.statusMap = {
            1: { icon: '😊', text: '空いている', class: 'status-1' },
            2: { icon: '🙂', text: 'やや空き', class: 'status-2' },
            3: { icon: '😐', text: '普通', class: 'status-3' },
            4: { icon: '😓', text: 'やや混雑', class: 'status-4' },
            5: { icon: '😵', text: '混雑', class: 'status-5' }
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
            const template = await TemplateLoader.loadTemplate(this.deviceDetector.getDeviceSpecificPath('/templates/view/list'));
            container.innerHTML = template;

            // データを取得して表示
            await this.loadAndDisplayData();

            // イベントリスナーを設定
            this.setupEventListeners();

            // 30秒おきのポーリングを開始
            this.startPolling();

        } catch (error) {
            console.error('ViewListPage render error:', error);
            container.innerHTML = '<div class="error">ページの読み込みに失敗しました</div>';
        }
    }

    /**
     * データを取得して表示
     */
    async loadAndDisplayData() {
        try {
            // HEADリクエストで更新チェック
            const hasUpdates = await this.api.hasCrowdStatusUpdated();

            if (!hasUpdates) {
                console.log('データに更新がないため、表示の更新をスキップします');
                return;
            }

            const [rooms, crowdData] = await Promise.all([
                this.api.getRooms(),
                this.api.getCrowdStatus()
            ]);

            const isMobile = this.deviceDetector.constructor.getDeviceType() === 'mobile';
            if (isMobile) {
                this.renderMobileView(rooms, crowdData);
            } else {
                this.renderDesktopView(rooms, crowdData);
            }

            // 最終更新時刻を表示
            const lastUpdated = document.getElementById('lastUpdated');
            if (lastUpdated) {
                lastUpdated.textContent = new Date().toLocaleString('ja-JP');
            }

        } catch (error) {
            console.error('Data loading error:', error);
        }
    }

    /**
     * デスクトップ版表示（テーブル）
     * @param {Array} rooms - 教室データ
     * @param {Array} crowdData - 混雑データ
     */
    renderDesktopView(rooms, crowdData) {
        const tbody = document.getElementById('crowdTableBody');
        if (!tbody) return;

        tbody.innerHTML = rooms.map(room => {
            const crowd = crowdData.find(c => c.room_id === room.room_id);
            const status = crowd ? this.statusMap[crowd.status] : { icon: '?', text: '不明', class: 'status-unknown' };
            const updatedAt = crowd ? new Date(crowd.updated_at).toLocaleTimeString('ja-JP') : '---';

            return `
                <tr class="${status.class}">
                    <td class="room-name">${room.name}</td>
                    <td class="status-cell">
                        <span class="status-icon">${status.icon}</span>
                        <span class="status-text">${status.text}</span>
                    </td>
                    <td class="updated-time">${updatedAt}</td>
                </tr>
            `;
        }).join('');
    }

    /**
     * モバイル版表示（カード）
     * @param {Array} rooms - 教室データ
     * @param {Array} crowdData - 混雑データ
     */
    renderMobileView(rooms, crowdData) {
        const container = document.getElementById('crowdCardsContainer');
        if (!container) return;

        container.innerHTML = rooms.map(room => {
            const crowd = crowdData.find(c => c.room_id === room.room_id);
            const status = crowd ? this.statusMap[crowd.status] : { icon: '?', text: '不明', class: 'status-unknown' };
            const updatedAt = crowd ? new Date(crowd.updated_at).toLocaleTimeString('ja-JP') : '---';

            return `
                <div class="crowd-card ${status.class}">
                    <div class="card-header">
                        <h3 class="room-name">${room.name}</h3>
                        <div class="status-display">
                            <span class="status-icon">${status.icon}</span>
                            <span class="status-text">${status.text}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <span class="updated-time">更新: ${updatedAt}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {

        // 更新ボタン
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadAndDisplayData());
        }

        // ページが非表示になった時にポーリングを停止
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    /**
     * 30秒おきのポーリングを開始
     */
    startPolling() {
        // 既存のタイマーがあれば停止
        this.stopPolling();

        console.log('混雑状況のポーリングを開始します（30秒間隔）');
        this.pollingInterval = setInterval(async () => {
            try {
                await this.loadAndDisplayData();
            } catch (error) {
                console.error('ポーリング中にエラーが発生しました:', error);
            }
        }, 30000); // 30秒間隔
    }

    /**
     * ポーリングを停止
     */
    stopPolling() {
        if (this.pollingInterval) {
            console.log('混雑状況のポーリングを停止します');
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * クリーンアップ処理
     */
    destroy() {
        this.stopPolling();

        // visibilitychangeイベントリスナーを削除
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
}
