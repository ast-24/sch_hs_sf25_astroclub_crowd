import { CrowdAPI } from '../cmn/api.mjs';
import { TemplateLoader } from '../cmn/utils.mjs';

/**
 * ルートページモジュール
 * 表示モード及び入力モードを選択するためのUI
 */
export class Pages {
    /**
     * @param {CrowdAPI} api - APIクライアント
     * @param {Object} router - ルーター
     * @param {DeviceDetector} deviceDetector - デバイス判定ユーティリティ
     */
    constructor(api, router, deviceDetector) {
        this.api = api;
        this.router = router;
        this.deviceDetector = deviceDetector;
        this.showingRoomSelection = false;
    }

    /**
     * ページを表示
     * @param {HTMLElement} container - コンテナ要素
     * @param {Object} params - パラメータ
     */
    async render(container, params) {
        try {
            // デバイス対応テンプレートを読み込み
            const template = await TemplateLoader.loadTemplate(this.deviceDetector.getDeviceSpecificPath('/templates'));
            container.innerHTML = template;

            // イベントリスナーを設定
            this.setupEventListeners();

        } catch (error) {
            console.error('RootPage render error:', error);
            throw new Error(`ページのレンダリングに失敗しました: ${error.message}`);
        }
    }

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // 表示モード：混雑状況一覧
        const viewListBtn = document.getElementById('viewListBtn');
        if (viewListBtn) {
            viewListBtn.addEventListener('click', () => {
                this.router.navigateTo('/view/list');
            });
        }

        // 入力モード：教室選択入力
        const enterSelectBtn = document.getElementById('enterSelectBtn');
        if (enterSelectBtn) {
            enterSelectBtn.addEventListener('click', () => {
                this.router.navigateTo('/enter');
            });
        }

        // 入力モード：特定教室入力
        const enterRoomBtn = document.getElementById('enterRoomBtn');
        if (enterRoomBtn) {
            enterRoomBtn.addEventListener('click', () => {
                this.toggleRoomSelection();
            });
        }
    }

    /**
     * 教室選択エリアの表示/非表示を切り替え
     */
    async toggleRoomSelection() {
        const roomQuickAccess = document.getElementById('roomQuickAccess');
        if (!roomQuickAccess) return;

        if (this.showingRoomSelection) {
            // 非表示にする
            roomQuickAccess.style.display = 'none';
            this.showingRoomSelection = false;
        } else {
            // 表示する
            await this.loadRoomButtons();
            roomQuickAccess.style.display = 'block';
            this.showingRoomSelection = true;
        }
    }

    /**
     * 教室ボタンを読み込み
     */
    async loadRoomButtons() {
        try {
            const rooms = await this.api.getRooms();
            const roomButtons = document.getElementById('roomButtons');

            if (roomButtons) {
                roomButtons.innerHTML = rooms.map(room => `
                    <button class="room-btn" data-room-id="${room.room_id}">
                        <span class="room-name">${room.name}</span>
                        <span class="room-desc">${room.description}</span>
                    </button>
                `).join('');

                // 教室ボタンのイベントリスナーを設定
                roomButtons.addEventListener('click', (e) => {
                    const roomBtn = e.target.closest('.room-btn');
                    if (roomBtn) {
                        const roomId = roomBtn.dataset.roomId;
                        this.router.navigateTo(`/enter/${roomId}`);
                    }
                });
            }
        } catch (error) {
            console.error('Room buttons loading error:', error);
        }
    }
}