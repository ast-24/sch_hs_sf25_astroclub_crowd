/** APIリクエストのラップとキャッシュ */
export class ApiClient {
    /** APIのベースURL
     * @type {string}
     */
    apiBaseUrl;

    /** キャッシュ用のマップ */
    #roomsCache = null;

    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
    }

    /**
     * 教室一覧を取得
     * @returns {Promise<Map>} 教室データのMap
     */
    async getRooms() {
        // 永続キャッシュ - 一度取得したら再取得しない
        if (this.#roomsCache) {
            return this.#roomsCache;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/rooms`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // データをMapに変換
            const roomsMap = new Map();
            for (const [roomId, roomData] of Object.entries(data)) {
                roomsMap.set(roomId, roomData);
            }

            // キャッシュに保存
            this.#roomsCache = roomsMap;

            return roomsMap;
        } catch (error) {
            console.error('教室データの取得に失敗:', error);
            throw new Error('教室データの取得に失敗しました');
        }
    }

    /**
     * 全教室の混雑状況を取得
     * @returns {Promise<Map>} 混雑状況データのMap
     */
    async getCrowdStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/crowd`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // データをMapに変換（updated_atをDateオブジェクトに変換）
            const crowdMap = new Map();
            for (const [roomId, crowdData] of Object.entries(data)) {
                crowdMap.set(roomId, {
                    status: crowdData.status,
                    updated_at: new Date(crowdData.updated_at)
                });
            }

            return crowdMap;
        } catch (error) {
            console.error('混雑状況データの取得に失敗:', error);
            throw new Error('混雑状況データの取得に失敗しました');
        }
    }

    /**
     * 特定教室の混雑状況を取得
     * @param {string} roomid 教室ID
     * @returns {Promise<{status: number, updated_at: Date}>} 混雑状況データ
     */
    async getCrowdStatusRoom(roomid) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/crowd/${encodeURIComponent(roomid)}`);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`教室 ${roomid} が見つかりません`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // updated_atをDateオブジェクトに変換
            const roomData = {
                status: data.status,
                updated_at: new Date(data.updated_at)
            };

            return roomData;
        } catch (error) {
            console.error(`教室 ${roomid} の混雑状況取得に失敗:`, error);
            throw error;
        }
    }

    /**
     * 混雑状況を更新
     * @param {string} roomid 教室ID
     * @param {number} status 混雑状況（1-5）
     */
    async updateCrowdStatus(roomid, status) {
        // バリデーション
        if (!Number.isInteger(status) || status < 1 || status > 5) {
            throw new Error('混雑状況は1-5の整数で指定してください');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/crowd/${encodeURIComponent(roomid)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`教室 ${roomid} が見つかりません`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

        } catch (error) {
            console.error(`教室 ${roomid} の混雑状況更新に失敗:`, error);
            throw error;
        }
    }

    /**
     * キャッシュをクリア
     */
    clearCache() {
        this.#roomsCache = null;
    }
}

/** APIクライアントのスタブ */
export class ApiClientStub {
    /** APIのベースURL
     * @type {string}
     */
    apiBaseUrl;

    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;// 使わない

        this.mockRooms = new Map([
            ['darkroom', { name: '暗室', desc: 'プラネタリウム', floor: "3", sort_priority: 4 }],
            ['earth-lab', { name: '地学実験室', desc: '展示(岩石班)', floor: "3", sort_priority: 2 }],
            ['physics-lab', { name: '物理実験室', desc: '展示(附属中)', floor: "3", sort_priority: 3 }],
            ['s33', { name: 'S33', desc: '受付', floor: "3", sort_priority: 6 }],
            ['info-room3', { name: '情報教室3', desc: 'Mitaka/ミニ講義', floor: "2", sort_priority: 5 }],
            ['dome', { name: 'ドーム', desc: '天体望遠鏡', floor: "R", sort_priority: 1 }]
        ]);

        this.mockCrowdData = new Map([
            ['darkroom', { status: 2, updated_at: new Date(Date.now() - 5 * 60 * 1000) }],
            ['earth-lab', { status: 4, updated_at: new Date(Date.now() - 2 * 60 * 1000) }],
            ['physics-lab', { status: 1, updated_at: new Date(Date.now() - 8 * 60 * 1000) }],
            ['s33', { status: 3, updated_at: new Date(Date.now() - 1 * 60 * 1000) }],
            ['info-room3', { status: 5, updated_at: new Date(Date.now() - 3 * 60 * 1000) }],
            ['dome', { status: 2, updated_at: new Date(Date.now() - 4 * 60 * 1000) }]
        ]);

        this.lastMockUpdate = new Date();
    }

    async getRooms() {
        if (this.rooms_fetched) {
            return this.mockRooms
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // APIの動作を模擬
        this.rooms_fetched = true;
        return this.mockRooms;
    }

    async getCrowdStatus() {
        await new Promise(resolve => setTimeout(resolve, 1000)); // APIの動作を模擬
        // 0.5の確率でどれか1つの部屋のステータスを書き換える
        if (Math.random() < 0.5) {
            const roomIds = Array.from(this.mockCrowdData.keys());
            if (roomIds.length > 0) {
                const idx = Math.floor(Math.random() * roomIds.length);
                const roomId = roomIds[idx];
                // 1〜5のランダムなステータス
                const newStatus = Math.floor(Math.random() * 5) + 1;
                this.mockCrowdData.set(roomId, {
                    status: newStatus,
                    updated_at: new Date()
                });
            }
        }
        return this.mockCrowdData;
    }

    async getCrowdStatusRoom(roomid) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // APIの動作を模擬

        const data = this.mockCrowdData.get(roomid);
        if (!data) {
            throw new Error(`教室 ${roomid} が見つかりません`);
        }

        return {
            status: data.status,
            updated_at: data.updated_at
        };
    }

    async updateCrowdStatus(roomid, status) {
        if (status < 1 || 5 < status) {
            throw new Error('混雑状況は1-5の範囲で指定してください');
        }

        await new Promise(resolve => setTimeout(resolve, 1500)); // APIの動作を模擬

        if (!this.mockCrowdData.has(roomid)) {
            throw new Error(`教室 ${roomid} が見つかりません`);
        }

        this.mockCrowdData.set(roomid, {
            status: status,
            updated_at: new Date()
        });

        return;
    }
}

export function statusNumToTextShort(statusNum) {
    switch (statusNum) {
        case 1:
            return '空';
        case 2:
            return '少';
        case 3:
            return '中';
        case 4:
            return '多';
        case 5:
            return '満';
        default:
            return '不明';
    }
}

export function statusNumToTextLong(statusNum) {
    switch (statusNum) {
        case 1:
            return '空いています';
        case 2:
            return '少し混雑しています';
        case 3:
            return '中程度の混雑です';
        case 4:
            return 'かなり混雑しています';
        case 5:
            return '満員です';
        default:
            return '不明な状態です';
    }
}