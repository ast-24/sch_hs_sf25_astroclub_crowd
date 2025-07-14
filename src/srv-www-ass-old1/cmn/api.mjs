/**
 * APIクライアントクラス（スタブ版）
 * 仕様書に基づいたモックデータを提供
 */
export class CrowdAPI {
    /**
     * @param {string} baseUrl - APIのベースURL（スタブでは使用しない）
     */
    constructor(baseUrl = 'https://api-sf25-astroclub.ast24.dev') {
        this.baseUrl = baseUrl;
        this.roomsCache = null;
        this.lastCrowdUpdate = null;
        this.lastRoomUpdates = new Map();

        // スタブ用のモックデータ
        this.mockRooms = [
            { room_id: 'darkroom', name: '3F 暗室', description: 'プラネタリウム', floor: 3 },
            { room_id: 'earth-lab', name: '3F 地学実験室', description: '展示(岩石班)', floor: 3 },
            { room_id: 'physics-lab', name: '3F 物理実験室', description: '展示(附属中)', floor: 3 },
            { room_id: 's33', name: '3F S33', description: '受付', floor: 3 },
            { room_id: 'info-room3', name: '2F 情報教室3', description: 'Mitaka/ミニ講義', floor: 2 },
            { room_id: 'dome', name: 'RF ドーム', description: '天体望遠鏡', floor: 4 }
        ];

        this.mockCrowdData = new Map([
            ['darkroom', { status: 2, updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() }],
            ['earth-lab', { status: 4, updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString() }],
            ['physics-lab', { status: 1, updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString() }],
            ['s33', { status: 3, updated_at: new Date(Date.now() - 1 * 60 * 1000).toISOString() }],
            ['info-room3', { status: 5, updated_at: new Date(Date.now() - 3 * 60 * 1000).toISOString() }],
            ['dome', { status: 2, updated_at: new Date(Date.now() - 4 * 60 * 1000).toISOString() }]
        ]);

        this.lastMockUpdate = new Date().toISOString();
    }

    /**
     * 教室一覧を取得（キャッシュ機能付き）
     * @returns {Promise<Array<{room_id: string, name: string, description: string, floor: number}>>}
     */
    async getRooms() {
        // 少し遅延を入れてAPIの動作を模擬
        await new Promise(resolve => setTimeout(resolve, 100));

        if (this.roomsCache) {
            return this.roomsCache;
        }

        this.roomsCache = [...this.mockRooms];
        return this.roomsCache;
    }

    /**
     * 全教室の混雑状況を取得
     * @returns {Promise<Array<{room_id: string, status: number, updated_at: string}>>}
     */
    async getCrowdStatus() {
        // 少し遅延を入れてAPIの動作を模擬
        await new Promise(resolve => setTimeout(resolve, 150));

        // ランダムに状況を少し変更（動的な感じを演出）
        if (Math.random() < 0.5) { // 50%の確率で更新
            const roomIds = Array.from(this.mockCrowdData.keys());
            const randomRoom = roomIds[Math.floor(Math.random() * roomIds.length)];
            const currentData = this.mockCrowdData.get(randomRoom);
            const newStatus = Math.floor(Math.random() * 5) + 1;
            this.mockCrowdData.set(randomRoom, {
                status: newStatus,
                updated_at: new Date().toISOString()
            });
        }

        this.lastCrowdUpdate = new Date().toISOString();

        return Array.from(this.mockCrowdData.entries()).map(([room_id, data]) => ({
            room_id,
            status: data.status,
            updated_at: data.updated_at
        }));
    }

    /**
     * 特定教室の混雑状況を取得
     * @param {string} roomId - 教室ID
     * @returns {Promise<{status: number, updated_at: string}>}
     */
    async getRoomCrowdStatus(roomId) {
        // 少し遅延を入れてAPIの動作を模擬
        await new Promise(resolve => setTimeout(resolve, 100));

        const data = this.mockCrowdData.get(roomId);
        if (!data) {
            throw new Error(`教室 ${roomId} が見つかりません`);
        }

        this.lastRoomUpdates.set(roomId, new Date().toISOString());

        return {
            status: data.status,
            updated_at: data.updated_at
        };
    }

    /**
     * 混雑状況を更新
     * @param {string} roomId - 教室ID
     * @param {number} status - 混雑状況 (1-5)
     * @returns {Promise<{success: boolean}>}
     */
    async updateCrowdStatus(roomId, status) {
        // 少し遅延を入れてAPIの動作を模擬
        await new Promise(resolve => setTimeout(resolve, 200));

        if (!this.mockCrowdData.has(roomId)) {
            throw new Error(`教室 ${roomId} が見つかりません`);
        }

        if (status < 1 || status > 5) {
            throw new Error('混雑状況は1-5の範囲で指定してください');
        }

        // モックデータを更新
        this.mockCrowdData.set(roomId, {
            status: status,
            updated_at: new Date().toISOString()
        });

        console.log(`[STUB] 教室 ${roomId} の混雑状況を ${status} に更新しました`);

        return { success: true };
    }

    /**
     * 全教室の混雑状況に更新があったかチェック
     * @returns {Promise<boolean>} 更新があった場合はtrue
     */
    async hasCrowdStatusUpdated() {
        // 少し遅延を入れてAPIの動作を模擬
        await new Promise(resolve => setTimeout(resolve, 50));

        if (!this.lastCrowdUpdate) {
            return true;
        }

        // 50%の確率で更新ありと判定（デバッグしやすく）
        return Math.random() < 0.5;
    }

    /**
     * 特定教室の混雑状況に更新があったかチェック
     * @param {string} roomId - 教室ID
     * @returns {Promise<boolean>} 更新があった場合はtrue
     */
    async hasRoomCrowdStatusUpdated(roomId) {
        // 少し遅延を入れてAPIの動作を模擬
        await new Promise(resolve => setTimeout(resolve, 50));

        const lastUpdate = this.lastRoomUpdates.get(roomId);
        if (!lastUpdate) {
            return true;
        }

        // 30%の確率で更新ありと判定（デバッグしやすく）
        return Math.random() < 0.3;
    }
}
