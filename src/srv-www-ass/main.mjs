import { Router } from './cmn/router.mjs';
import { CrowdAPI } from './cmn/api.mjs';
import { DeviceDetector } from './cmn/utils.mjs';

import { Pages } from './pages/root.mjs';
import { PagesEnter } from './pages/enter/root.mjs'
import { PagesEnterRoom } from './pages/enter/room.mjs'
import { PagesView } from './pages/view/root.mjs'
import { PagesViewList } from './pages/view/list.mjs';

/**
 * アプリケーションメインクラス
 */
class App {
    constructor() {
        this.router = new Router();
        this.api = new CrowdAPI();
        this.deviceDetector = new DeviceDetector();
        this.pages = {
            root: new Pages(this.api, this.router, this.deviceDetector),
            enter: {
                root: new PagesEnter(this.api, this.router, this.deviceDetector),
                room: new PagesEnterRoom(this.api, this.router, this.deviceDetector)
            },
            view: {
                root: new PagesView(this.api, this.router, this.deviceDetector),
                list: new PagesViewList(this.api, this.router, this.deviceDetector)
            }
        };

        this.setupRoutes();
    }

    /**
     * ルーティングを設定
     */
    setupRoutes() {
        this.router.addRoute('/', (container, params) => {
            this.pages.root.render(container, params);
        });

        this.router.addRoute('/enter', (container, params) => {
            this.pages.enter.root.render(container, params);
        });

        this.router.addRoute('/enter/:room_id', (container, params) => {
            this.pages.enter.room.render(container, params);
        });

        this.router.addRoute('/view', (container, params) => {
            this.pages.view.root.render(container, params);
        });

        // 混雑状況表示ページ(リスト形式)
        this.router.addRoute('/view/list', (container, params) => {
            this.pages.view.list.render(container, params);
        });
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new App();
});