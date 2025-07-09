import { CrowdAPI } from '../../cmn/api.mjs';
import { TemplateLoader } from '../../cmn/utils.mjs';

/**
 * 入力ページモジュール（教室選択）
 */
export class PagesEnter {
    /**
     * @param {CrowdAPI} api - APIクライアント
     * @param {Object} router - ルーター
     * @param {DeviceDetector} deviceDetector - デバイス判定ユーティリティ
     */
    constructor(api, router, deviceDetector) {
        this.api = api;
        this.router = router;
        this.deviceDetector = deviceDetector;
        this.selectedRoom = null;
    }

    /**
     * ページを表示
     * @param {HTMLElement} container - コンテナ要素
     * @param {Object} params - パラメータ
     */
    async render(container, params) {
        try {
            // デバイス対応テンプレートを読み込み
            const template = await TemplateLoader.loadTemplate(this.deviceDetector.getDeviceSpecificPath('./templates/enter'));
            container.innerHTML = template;

            // 教室選択肢を読み込み
            await this.loadRoomOptions();

            // イベントリスナーを設定
            this.setupEventListeners();

        } catch (error) {
            console.error('EnterPage render error:', error);
            throw new Error(`ページのレンダリングに失敗しました: ${error.message}`);
        }
    }

    /**
     * 教室選択肢を読み込み
     */
    async loadRoomOptions() {
        try {
            const rooms = await this.api.getRooms();
            const roomSelect = document.getElementById('roomSelect');

            if (roomSelect) {
                // 既存の選択肢をクリア（デフォルト選択肢は残す）
                const defaultOption = roomSelect.querySelector('option[value=""]');
                roomSelect.innerHTML = '';
                if (defaultOption) {
                    roomSelect.appendChild(defaultOption);
                }

                // 教室選択肢を追加
                rooms.forEach(room => {
                    const option = document.createElement('option');
                    option.value = room.room_id;
                    option.textContent = room.name;
                    roomSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Room options loading error:', error);
            throw new Error(`教室選択肢の読み込みに失敗しました: ${error.message}`);
        }
    }

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // 教室選択時
        const roomSelect = document.getElementById('roomSelect');
        if (roomSelect) {
            roomSelect.addEventListener('change', (e) => {
                this.selectedRoom = e.target.value;
                this.toggleStatusButtons(!!this.selectedRoom);
            });
        }

        // 混雑状況ボタン
        const statusButtons = document.querySelectorAll('.status-btn');
        statusButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = parseInt(e.currentTarget.dataset.status);
                this.updateStatus(status);
            });
        });

        // 混雑状況を見るボタン
        const viewBtn = document.getElementById('viewBtn');
        if (viewBtn) {
            viewBtn.addEventListener('click', () => this.router.navigateTo('/view/list'));
        }

        // 教室入力ページへ遷移ボタン
        const enterRoomBtn = document.getElementById('enterRoomBtn');
        if (enterRoomBtn) {
            enterRoomBtn.addEventListener('click', () => {
                if (this.selectedRoom) {
                    this.router.navigateTo(`/enter/${this.selectedRoom}`);
                }
            });
        }
    }

    /**
     * 混雑状況ボタンと教室入力ボタンの表示/非表示を切り替え
     * @param {boolean} show - 表示するかどうか
     */
    toggleStatusButtons(show) {
        const statusButtons = document.getElementById('statusButtons');
        const enterRoomBtn = document.getElementById('enterRoomBtn');

        if (statusButtons) {
            statusButtons.style.display = show ? 'block' : 'none';
        }

        if (enterRoomBtn) {
            enterRoomBtn.style.display = show ? 'inline-block' : 'none';
        }
    }

    /**
     * 混雑状況を更新
     * @param {number} status - 混雑状況 (1-5)
     */
    async updateStatus(status) {
        if (!this.selectedRoom) {
            alert('教室を選択してください');
            return;
        }

        try {
            await this.api.updateCrowdStatus(this.selectedRoom, status);
            alert('入力ありがとうございます。\n混雑状況を更新しました！');
        } catch (error) {
            console.error('Status update error:', error);
            alert('更新に失敗しました。もう一度お試しください。');
        }
    }
}
