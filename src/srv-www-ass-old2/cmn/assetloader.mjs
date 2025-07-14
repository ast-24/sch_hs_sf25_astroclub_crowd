export class AssetLoader {
    constructor(container, deviceDetector, url_base_assets) {
        this.container = container;
        this.deviceDetector = deviceDetector;
        this.url_base_assets = url_base_assets;
    }

    async start() {
        await this.loadStyle2Global('cmn/global');
        await this.loadHtml2Container('cmn/global');
    }

    async fetchAsset(assetPath) {
        try {
            const resp = await fetch(`${this.url_base_assets}/${assetPath}`);
            if (!resp.ok) {
                throw new Error('Network response was not ok');
            }
            return await resp.blob();
        } catch (error) {
            console.error('Error loading asset:', error);
            throw error;
        }
    }

    async fetchTemplate(templatePath) {
        try {
            const resp = await this.fetchAsset(templatePath);
            return await resp.text();
        } catch (error) {
            console.error('Error loading template:', error);
            throw error;
        }
    }

    // 拡張子を除くパスを受け取りコンテナに適用
    async loadHtml2Container(htmlPath) {
        try {
            const resp = await this.fetchTemplate(`${htmlPath}.html`);
            this.container.setContent(resp);
        } catch (error) {
            console.error('Error loading HTML:', error);
            throw error;
        }
    }

    // 拡張子を除くパスを受け取りグローバルに適用
    async loadStyle2Global(cssPath) {
        try {
            const resp = await this.fetchTemplate(`${cssPath}.css`);
            const styleElement = document.createElement('style');
            styleElement.textContent = resp;
            document.head.appendChild(styleElement);
        } catch (error) {
            console.error('Error loading style:', error);
            throw error;
        }
    }

    #attachDevice2Path(path, extension) {
        const path_device =
            this.deviceDetector.isMobi() ? 'mobi' : 'pc';
        return `${path}/${path_device}.${extension}`;
    }

    // 拡張子を除くHTMLとCSSのパスを受け取り、デバイス名を付加してコンテナに適用
    async loadPage2Container(htmlPath, cssPaths) {
        try {
            let conts = [];
            for (const csselm of cssPaths) {
                const css = await this.fetchTemplate(this.#attachDevice2Path(csselm, 'css'));
                conts.push(`<style>${css}</style>`);
            }
            conts.push(await this.fetchTemplate(this.#attachDevice2Path(htmlPath, 'html')));
            this.container.setContent(`${conts.join('\n')}`);
        } catch (error) {
            console.error('Error loading page:', error);
            throw error;
        }
    }
}
