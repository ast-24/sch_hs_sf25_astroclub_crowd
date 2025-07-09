/**
 * APIクライアントクラス
 * バックエンドとの通信を担当
 */
export class CrowdAPI {
    /**
     * @param {string} baseUrl - APIのベースURL
     */
    constructor(baseUrl = 'https://api-sf25-astroclub.ast24.dev') {
        this.baseUrl = baseUrl;
        this.roomsCache = null;
        this.lastCrowdUpdate = null;
        this.lastRoomUpdates = new Map();
    }

    /**
     * 教室一覧を取得（キャッシュ機能付き）
     * @returns {Promise<Array<{room_id: string, name: string, description: string, floor: number}>>}
     */
    async getRooms() {
        if (this.roomsCache) {
            return this.roomsCache;
        }

        try {
            const response = await fetch(`${this.baseUrl}/rooms`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.roomsCache = data.rooms;
            return this.roomsCache;
        } catch (error) {
            console.error('API error, falling back to mock data:', error);

            throw new Error('教室情報の取得に失敗しました。APIが利用できない可能性があります。');
        }
    }

    /**
     * 全教室の混雑状況を取得
     * @returns {Promise<Array<{room_id: string, status: number, updated_at: string}>>}
     */
    async getCrowdStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/crowd`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // 最終更新時刻を記録
            this.lastCrowdUpdate = new Date().toISOString();

            return data.crowd;
        } catch (error) {
            console.error('API error, falling back to mock data:', error);
            throw new Error('混雑状況の取得に失敗しました。APIが利用できない可能性があります。');
        }
    }

    /**
     * 特定教室の混雑状況を取得
     * @param {string} roomId - 教室ID
     * @returns {Promise<{status: number, updated_at: string}>}
     */
    async getRoomCrowdStatus(roomId) {
        try {
            const response = await fetch(`${this.baseUrl}/crowd/${roomId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // 最終更新時刻を記録
            this.lastRoomUpdates.set(roomId, new Date().toISOString());

            return data;
        } catch (error) {
            console.error('API error, falling back to mock data:', error);
            throw new Error(`教室 ${roomId} の混雑状況の取得に失敗しました。APIが利用できない可能性があります。`);
        }
    }

    /**
     * 混雑状況を更新
     * @param {string} roomId - 教室ID
     * @param {number} status - 混雑状況 (1-5)
     * @returns {Promise<{success: boolean}>}
     */
    async updateCrowdStatus(roomId, status) {
        try {
            const response = await fetch(`${this.baseUrl}/crowd/${roomId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return { success: true };
        } catch (error) {
            console.error('API error, falling back to mock:', error);
            throw new Error(`教室 ${roomId} の混雑状況の更新に失敗しました。APIが利用できない可能性があります。`);
        }
    }

    /**
     * 全教室の混雑状況に更新があったかチェック
     * @returns {Promise<boolean>} 更新があった場合はtrue
     */
    async hasCrowdStatusUpdated() {
        if (!this.lastCrowdUpdate) {
            return true; // 初回は更新ありとする
        }

        try {
            const response = await fetch(`${this.baseUrl}/crowd`, { method: 'HEAD' });
            if (!response.ok) {
                return true; // エラー時は更新ありとする
            }

            const lastModified = response.headers.get('Last-Modified');
            if (!lastModified) {
                return true; // Last-Modifiedがない場合は更新ありとする
            }

            const serverUpdate = new Date(lastModified).toISOString();
            return serverUpdate > this.lastCrowdUpdate;
        } catch (error) {
            console.error('Update check failed:', error);
            return true; // エラー時は更新ありとする
        }
    }

    /**
     * 特定教室の混雑状況に更新があったかチェック
     * @param {string} roomId - 教室ID
     * @returns {Promise<boolean>} 更新があった場合はtrue
     */
    async hasRoomCrowdStatusUpdated(roomId) {
        const lastUpdate = this.lastRoomUpdates.get(roomId);
        if (!lastUpdate) {
            return true; // 初回は更新ありとする
        }

        try {
            const response = await fetch(`${this.baseUrl}/crowd/${roomId}`, { method: 'HEAD' });
            if (!response.ok) {
                return true; // エラー時は更新ありとする
            }

            const lastModified = response.headers.get('Last-Modified');
            if (!lastModified) {
                return true; // Last-Modifiedがない場合は更新ありとする
            }

            const serverUpdate = new Date(lastModified).toISOString();
            return serverUpdate > lastUpdate;
        } catch (error) {
            console.error('Update check failed:', error);
            return true; // エラー時は更新ありとする
        }
    }
}
