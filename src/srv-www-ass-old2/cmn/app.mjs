import { Container } from './container.mjs';
import { DeviceDetector } from './devicedetector.mjs';
import { AssetLoader } from './assetloader.mjs';
import { ApiClient } from './api_client.mjs';
import { ApiClientStub } from './api_client_stab.mjs';
import { Router } from './router.mjs';
import { Navigator } from "./navigator.mjs";
import { routeRegister } from './app_route_register.mjs';

export class App {
    constructor(url_base_assets, url_base_api, container_id) {
        this.url_base_assets = url_base_assets;
        this.url_base_api = url_base_api;

        this.container = new Container(container_id);
        this.deviceDetector = new DeviceDetector();
        this.assetLoader = new AssetLoader(
            this.container,
            this.deviceDetector,
            this.url_base_assets
        );
        if (url_base_api != null) {
            this.apiClient = new ApiClient(this.url_base_api);
        } else {
            this.apiClient = new ApiClientStub(this.url_base_api);
        }

        this.router = new Router();

        this.navigator = new Navigator(
            this.container,
            this.assetLoader,
            this.router,
            { render: null, assetPath: "pages/404" },
        );

        routeRegister(
            this.router,
            this.container,
            this.deviceDetector,
            this.navigator,
            this.assetLoader,
            this.apiClient
        );
    }

    async start() {
        await this.assetLoader.start();
        await this.navigator.start();
    }
}

/*

API → エンドポイント呼び出してデータ取得

*/