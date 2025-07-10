import { CrowdAPI } from '../../cmn/api.mjs';
import { TemplateLoader } from '../../cmn/utils.mjs';

/**
 * 特定教室入力ページモジュール
 */
export class PagesEnterRoom {
    /**
     * @param {CrowdAPI} api - APIクライアント
     * @param {Object} router - ルーター
     * @param {DeviceDetector} deviceDetector - デバイス判定ユーティリティ
     */
    constructor(api, router, deviceDetector) {
        this.api = api;
        this.router = router;
        this.roomId = null;
        this.deviceDetector = deviceDetector;
        this.roomData = null;
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
        this.roomId = params.room_id;

        if (!this.roomId) {
            container.innerHTML = '<div class="error">教室IDが指定されていません</div>';
            setTimeout(() => {
                this.router.navigateTo('/enter');
            }, 1000);
            return;
        }

        try {
            // デバイス対応テンプレートを読み込み
            const template = await TemplateLoader.loadTemplate(this.deviceDetector.getDeviceSpecificPath('./templates/enter/room'));
            container.innerHTML = template;

            // 教室データを取得
            await this.loadRoomData();

            // イベントリスナーを設定
            this.setupEventListeners();

        } catch (error) {
            console.error('EnterRoomPage render error:', error);
            throw new Error(`ページのレンダリングに失敗しました: ${error.message}`);
        }
    }

    /**
     * 教室データを取得
     */
    async loadRoomData() {
        try {
            const rooms = await this.api.getRooms();
            this.roomData = rooms.find(room => room.room_id === this.roomId);

            if (!this.roomData) {
                throw new Error('教室が見つかりません');
            }

            // 教室名を表示
            const roomNameElement = document.getElementById('roomName');
            if (roomNameElement) {
                roomNameElement.textContent = this.roomData.name;
            }

        } catch (error) {
            console.error('Room data loading error:', error);
            throw error;
        }
    }

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // 混雑状況ボタン
        const statusButtons = document.querySelectorAll('.status-btn');
        statusButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = parseInt(e.currentTarget.dataset.status);
                this.updateStatus(status);
            });
        });
    }

    /**
     * 混雑状況を更新
     * @param {number} status - 混雑状況 (1-5)
     */
    async updateStatus(status) {
        try {
            await this.api.updateCrowdStatus(this.roomId, status);
            alert('混雑状況を更新しました！');

        } catch (error) {
            console.error('Status update error:', error);
            alert('更新に失敗しました。もう一度お試しください。');
        }
    }
}
