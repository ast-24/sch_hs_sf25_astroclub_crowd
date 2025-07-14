// @ROOMの実装を先にやってから戻ってくる

export class Render {
    constructor(container, deviceDetector, assetLoader, apiClient, navigator) {
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
    }

    async cleaner() {
        this.#removeEventListeners();
    }

    #removeEventListeners() {
    }
}