import { Router } from './cmn/router.mjs';
import { CrowdAPI } from './cmn/api.mjs';
import { RootPage } from './pages/root.mjs';
import { ViewListPage } from './pages/view-list.mjs';
import { EnterPage } from './pages/enter.mjs';
import { EnterRoomPage } from './pages/enter-room.mjs';

/**
 * アプリケーションメインクラス
 */
class App {
    constructor() {
        this.router = new Router();
        this.api = new CrowdAPI();
        this.deviceDetector = new DeviceDetector();
        this.pages = {
            // TODO: 構造整理

            root: new RootPage(this.api, this.router, this.deviceDetector),
            viewList: new ViewListPage(this.api, this.router, this.deviceDetector),
            enter: new EnterPage(this.api, this.router, this.deviceDetector),
            enterRoom: new EnterRoomPage(this.api, this.router, this.deviceDetector)
        };

        this.setupRoutes();
    }

    /**
     * ルーティングを設定
     */
    setupRoutes() {
        // TODO: copilotに消し飛ばされたので注意

        // ルートページ
        this.router.addRoute('/', (container, params) => {
            this.pages.root.render(container, params);
        });

        // 混雑状況表示ページ(リスト形式)
        this.router.addRoute('/view/list', (container, params) => {
            this.pages.viewList.render(container, params);
        });

        // 入力ページ（教室選択付き）
        this.router.addRoute('/enter', (container, params) => {
            this.pages.enter.render(container, params);
        });

        // 入力ページ（特定教室）
        this.router.addRoute('/enter/:room_id', (container, params) => {
            this.pages.enterRoom.render(container, params);
        });
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new App();
});