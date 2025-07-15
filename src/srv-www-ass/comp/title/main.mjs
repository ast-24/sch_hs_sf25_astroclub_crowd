export class TitleComponent {

    #resourceLoader;
    #deviceDetector;
    #title;

    constructor(resourceLoader, deviceDetector) {
        this.#resourceLoader = resourceLoader;
        this.#deviceDetector = deviceDetector;
    }

    async render(container, title) {
        if (title) {
            this.#title = title;
        }

        let css, html;
        for (let i = 0; i < 3; i++) {
            try {
                ([css, html]) = await Promise.all([
                    this.#resourceLoader.fetchTemplateWithDevice('comp/title', 'css'),
                    this.#resourceLoader.fetchTemplate('comp/title/main.html')
                ]);
                break; // 成功したらループを抜ける
            } catch (error) {
                console.error(`Error fetching title component resources: ${error}`);
                if (i === 2) {
                    throw new Error('Failed to load title component resources after 3 attempts');
                }
            }
        }

        const innerContainer = document.createElement('div');
        innerContainer.innerHTML = `<style>${css}</style>${html}`;
        innerContainer.querySelector('.title_frame .title').innerHTML =
            this.#deviceDetector.isMobile() ? this.#title.mobile : this.#title.desktop;
        container.innerHTML = '';
        container.appendChild(innerContainer);
    }

    async changeTitle(container, newTitle) {
        this.#title = newTitle;
        container.querySelector('.title_frame .title').innerHTML =
            this.#deviceDetector.isMobile() ? this.#title.mobile : this.#title.desktop;
    }
}