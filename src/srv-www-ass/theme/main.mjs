/** 共通テーマのレンダラ */
export async function themeRenderer(appContainer, resourceLoader, deviceDetector) {
    let css, html;
    for (let i = 0; i < 3; i++) {
        try {
            [css, html] = await Promise.all([
                resourceLoader.fetchTemplateWithDevice('theme', 'css'),
                resourceLoader.fetchTemplate('theme/main.html')
            ]);
            break; // 成功したらループを抜ける
        } catch (error) {
            console.error(`Error loading theme resources (attempt ${i + 1}/3): ${error}`);
            if (i === 2) {
                // 3回失敗したらエラーを投げる
                throw new Error(`Failed to load theme resources after 3 attempts: ${error}`);
            }
        }
    }
    appContainer.innerHTML = `<style>${css}</style>${html}`;

    const canvas = appContainer.querySelector('.rendering_space .layer_back .star');
    const backgroundStarRenderer = new BackgroundStarRenderer(canvas);
    backgroundStarRenderer.rendering();
    window.addEventListener('resize', () => {
        backgroundStarRenderer.rendering();
    });

    return {
        pageContainer: appContainer.querySelector('.rendering_space .layer_fore .page_frame #page_container')
    };
}

/** 背景の星を描画するクラス */
class BackgroundStarRenderer {
    /**星の数/(1px^2)
     * @type {number}
     */
    static BASE_DENSITY = 0.0015;

    constructor(canvas) {
        this.canvas = canvas;
    }

    /** キャンバスのサイズに合わせて星を描画
     * @returns {void}
     */
    rendering() {
        BackgroundStarRenderer.#resizeCanvas(this.canvas);
        BackgroundStarRenderer.#render(this.canvas);
    }

    /** キャンバスのサイズをウィンドウのサイズに合わせる
     * @param {HTMLCanvasElement} canvas - 描画対象のキャンバス
     * @returns {void}
     */
    static #resizeCanvas(canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    /** キャンバスに星を描画
     * @param {HTMLCanvasElement} canvas - 描画対象のキャンバス
     * @returns {void}
     */
    static #render(canvas) {
        const count = Math.floor(canvas.width * canvas.height * BackgroundStarRenderer.BASE_DENSITY);

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < count; i++) {
            const params = BackgroundStarRenderer.#genParams({
                width: canvas.width,
                height: canvas.height
            });

            ctx.beginPath();
            ctx.arc(params.x, params.y, params.radius, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(${params.r}, ${params.g}, ${params.b}, ${params.opacity})`;
            ctx.shadowColor = 'white';
            ctx.shadowBlur = params.shadowBlur;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    /** ランダムパラメータ生成
     * @param {Object} canvas_size - キャンバスのサイズ
     * @param {number} canvas_size.width - キャンバスの幅
     * @param {number} canvas_size.height - キャンバスの高さ
     * @returns {{
     *  x: number,
     *  y: number,
     *  radius: number,
     *  opacity: number,
     *  r: number,
     *  g: number,
     *  b: number,
     *  shadowBlur: number
     * }}
     */
    static #genParams(canvas_size) {
        let ret = {
            x: Math.random() * canvas_size.width,
            y: Math.random() * canvas_size.height,
            radius: Math.random() * 0.5 + 0.5,
            opacity: Math.random() * 0.5 + 0.2,
            r: 255,
            g: 255,
            b: 255,
            shadowBlur: Math.random() * 1.5
        };

        if (Math.random() < 0.1) {
            ret.radius *= 2;
            ret.opacity *= 2;
        }
        if (Math.random() < 0.005) {
            ret.radius *= 4;
            ret.opacity *= 4;
        }
        if (Math.random() < 0.0001) {
            ret.radius *= 8;
            ret.opacity *= 8;
        }

        if (Math.random() < 0.5) {
            ret.r = Math.random() * 155 + 100;
            ret.g = Math.random() * 155 + 100;
            ret.b = Math.random() * 155 + 100;
        }

        return ret;
    }
}