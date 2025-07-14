export class ApiClientStub {
    constructor(url_base_api) {
        this.url_base_api = url_base_api;// 使わない

        this.mockRooms = new Map([
            ['darkroom', { name: '暗室', desc: 'プラネタリウム', floor: 3 }],
            ['earth-lab', { name: '地学実験室', desc: '展示(岩石班)', floor: 3 }],
            ['physics-lab', { name: '物理実験室', desc: '展示(附属中)', floor: 3 }],
            ['s33', { name: 'S33', desc: '受付', floor: 3 }],
            ['info-room3', { name: '情報教室3', desc: 'Mitaka/ミニ講義', floor: 2 }],
            ['dome', { name: 'ドーム', desc: '天体望遠鏡', floor: 4 }]
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
