export class Render {
    constructor(container, deviceDetector, navigator, assetLoader, apiClient) {
        this.container = container;
        this.deviceDetector = deviceDetector;
        this.assetLoader = assetLoader;
        this.apiClient = apiClient;
        this.navigator = navigator;
    }

    async handler(params) {
        document.title = "天文部 文化祭 混雑状況管理システム"
        this.#setupEventListeners();
    }

    #setupEventListeners() {
        // @表示のデザインを先にやってから戻ってくる
    }

    async cleaner() {
        this.#removeEventListeners();
    }

    #removeEventListeners() {
    }
}


/*
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


 */