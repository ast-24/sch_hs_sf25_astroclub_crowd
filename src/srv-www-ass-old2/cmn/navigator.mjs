export class Navigator {
    // notfound_contはRouter.registerRenderの第2,3引数と同じ
    constructor(container, assetLoader, router, notfound_cont) {
        this.container = container;
        this.assetLoader = assetLoader;
        this.router = router;
        this.notfound_cont = notfound_cont;
        this.prevRender = null;
    }

    async start() {
        window.addEventListener('popstate', async () => {
            let path = window.location.pathname;
            await this.#transition(path);
        });
        await this.navigate(window.location.pathname);
    }

    async navigate(path) {
        history.pushState(null, '', path);
        await this.#transition(path);
    }

    async #transition(path) {
        // reset

        if (this.prevRender != null && this.prevRender.cleaner) {
            await this.prevRender.cleaner();
        }
        this.prevRender = null;

        document.title = "天文部 文化祭 混雑状況管理システム"

        this.container.setContent("");

        // apply

        let { found, render, assetPath, params } = this.router.findRender(path);
        if (!found) {
            render = this.notfound_cont.render;
            assetPath = this.notfound_cont.assetPath;
        }

        if (assetPath) {
            await this.assetLoader.loadPage2Container(assetPath, [assetPath]);
        }
        if (render && render.handler) {
            await render.handler(params);
        }

        this.prevRender = render;
    }
}