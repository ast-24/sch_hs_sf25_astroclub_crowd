import { TitleComponent } from "../../comp/title/main.mjs";
import { HandlerInterface } from "../../spalib.mjs"

export async function IndexHandlerCreator(entities, apiClient) {
    return new IndexHandler(entities, apiClient);
}

class IndexHandler extends HandlerInterface {
    #entities;
    #apiClient;

    #titleComponent;
    #dashboardBtnHandler;
    #roomBtnHandler;

    constructor(entities, apiClient) {
        super();
        this.#entities = entities;
        this.#apiClient = apiClient;
    }

    async cleanupFull() {
        this.#removeEventListeners();
    }

    #removeEventListeners() {
        const dashboardBtn = this.#entities.pageContainerRef.dom.querySelector('#dashboardBtn');
        const roomBtns = this.#entities.pageContainerRef.dom.querySelectorAll('.room_btn');

        if (dashboardBtn) {
            dashboardBtn.removeEventListener('click', this.#dashboardBtnHandler);
        }

        roomBtns.forEach(btn => {
            btn.removeEventListener('click', this.#roomBtnHandler);
        });
    }

    async getTitle() {
        return "ホーム";
    }

    async getHtmlResourcePath() {
        return null;
        // あとで機種ごとに読み込む
    }

    async renderingFull() {
        for (let i = 0; i < 3; i++) {
            try {
                await this.#entities.resourceLoader.loadPageWithDevice(
                    this.#entities.pageContainerRef.dom,
                    'page/index',
                    'page/index'
                );
                break; // 成功したらループを抜ける
            } catch (error) {
                console.error(`リソース読み込み試行 ${i + 1} 失敗:`, error);
                if (i === 2) {
                    // 3回目の失敗時
                    this.#entities.pageContainerRef.dom.innerHTML = `
                        <div style="text-align: center; padding: 20px;">
                            <h2>エラー</h2>
                            <p>ページの読み込みに失敗しました。</p>
                        </div>
                    `;
                    throw error;
                }
                // 少し待ってから再試行
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // タイトルコンポーネントのレンダリング
        const titleAreaRef = this.#entities.pageContainerRef.dom.querySelector('.title_area');
        this.#titleComponent = new TitleComponent(
            this.#entities.resourceLoader,
            this.#entities.deviceDetector);
        await this.#titleComponent.render(titleAreaRef, {
            desktop: 'ホーム',
            mobile: 'ホーム'
        });

        // 教室リストを取得してレンダリング
        await this.#loadAndRenderRooms();

        // イベントリスナーを設定
        this.#setupEventListeners();
    }

    async #loadAndRenderRooms() {
        let roomsData = {};
        try {
            const roomsMap = await this.#apiClient.getRooms();
            // MapオブジェクトをObjectに変換
            roomsMap.forEach((value, key) => {
                roomsData[key] = value;
            });
        } catch (error) {
            console.error('教室データの取得に失敗:', error);
            throw new Error('教室データの取得に失敗しました');
        }
        this.#renderRoomButtons(roomsData);
    }

    #renderRoomButtons(roomsData) {
        const roomGridElement = this.#entities.pageContainerRef.dom.querySelector('.main_content .navigation_area .enter_section .room_grid');
        if (!roomGridElement) return;

        // 教室をsort_priorityでソート
        const rooms = Object.keys(roomsData).sort((a, b) => {
            const priorityA = roomsData[a].sort_priority || 999;
            const priorityB = roomsData[b].sort_priority || 999;
            return priorityA - priorityB;
        });

        // グリッドのクラスを動的に設定
        this.#updateGridLayout(roomGridElement, rooms.length);

        // 教室ボタンを生成
        roomGridElement.innerHTML = rooms.map(roomId => {
            const room = roomsData[roomId];
            return `
                <button class="room_btn" data-roomid="${roomId}">
                    <span class="room_icon">🏫</span>
                    <span class="room_text">${room.name}</span>
                    <span class="room_desc">${room.desc}</span>
                </button>
            `;
        }).join('');
    }

    #updateGridLayout(gridElement, roomCount) {
        // 既存のグリッドクラスを削除
        gridElement.className = gridElement.className
            .replace(/\bgrid-cols-\d+\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const isDesktop = !this.#entities.deviceDetector.isMobile();

        if (isDesktop) {
            // PC: 基本3列、教室数に応じて調整
            let cols = 3;
            if (roomCount <= 2) cols = roomCount;
            else if (roomCount <= 4) cols = 2;
            else if (roomCount <= 9) cols = 3;
            else cols = Math.min(4, Math.ceil(roomCount / 3));

            gridElement.classList.add(`grid-cols-${cols}`);
        } else {
            // モバイル: 基本2列
            gridElement.classList.add('grid-cols-2');
        }
    }

    #setupEventListeners() {
        // ダッシュボードボタン
        const dashboardBtn = this.#entities.pageContainerRef.dom.querySelector('#dashboardBtn');
        if (dashboardBtn) {
            this.#dashboardBtnHandler = () => {
                this.#entities.navigator.navigate('/dashboard');
            };
            dashboardBtn.addEventListener('click', this.#dashboardBtnHandler);
        }

        // 教室ボタン
        const roomBtns = this.#entities.pageContainerRef.dom.querySelectorAll('.room_btn');
        roomBtns.forEach(btn => {
            this.#roomBtnHandler = (event) => {
                const roomId = event.currentTarget.dataset.roomid;
                this.#entities.navigator.navigate(`/enter/${roomId}`);
            };
            btn.addEventListener('click', this.#roomBtnHandler);
        });
    }

    async canPartialTransferToNextPath(_) {
        return false;
    }

    async canPartialReceiveFromPrevPath() {
        return false;
    }

    async canInpageTransferTo(_) {
        return false;
    }

    async onDeviceOrientationChange() {
        await this.renderingFull();
    }
}
