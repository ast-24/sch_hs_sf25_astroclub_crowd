import { Router } from './router.mjs';
import { CrowdAPI } from './api.mjs';
import { DeviceDetector } from './utils.mjs';

import { Pages } from '../pages/root.mjs';
import { PagesEnter } from '../pages/enter/root.mjs'
import { PagesEnterRoom } from '../pages/enter/room.mjs'
import { PagesView } from '../pages/view/root.mjs'
import { PagesViewList } from '../pages/view/list.mjs';

/**
 * アプリケーションメインクラス
 */
export class App {
    constructor(
        url_base_ass,
        url_base_api
    ) {
        this.router = new Router();
        this.api = new CrowdAPI();
        // 本番用
        //this.deviceDetector = new DeviceDetector();
        // ローカルテスト用
        this.deviceDetector = new DeviceDetector("http://localhost:8080/");
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

        this.router.handleRoute(); // 初期ルート処理
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
