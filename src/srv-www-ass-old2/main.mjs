import { App } from './cmn/app.mjs';

new App();

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App(
        "https://ass-sf25-astroclub.ast24.dev",
        "https://api-sf25-astroclub.ast24.dev",
        "app"
    );
    await app.start();
});