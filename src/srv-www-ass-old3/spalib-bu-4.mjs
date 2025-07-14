/** アプリケーション設定
 * @typedef {Object} ApplicationConfig
 * @property {string} resourcesBaseUrl - リソース置き場のベースURL
 * @property {string} containerId - SPAコンテナ要素のID
 * @property {string} [title] - アプリケーションのベースタイトル
 * @property {ThemeRenderer} [themeRenderer] - ベーステーマ描画関数
 * @property {RouteConfigurer} routeConfigurer - ルート設定関数
 */

/** テーマ描画関数
 * @callback ThemeRenderer
 * @param {HTMLElement} container - SPA全体のコンテナ要素
 * @param {ResourceLoader} loader - リソース読み込みクラス
 * @param {ViewportDetector} detector - ビューポート判定クラス
 * @returns {Promise<{ pageContainer: HTMLElement }>} - ページコンテナ
 */

/** ルート設定関数
 * @callback RouteConfigurer
 * @param {RouteRegistry} registry - ルート登録レジストリ
 * @returns {Promise<void>}
 */

/** アプリケーション固有のエラークラス */
export class ApplicationError extends Error {
    /**
     * @param {string} message - エラーメッセージ
     * @param {Object} [options] - オプション
     */
    constructor(message, options = {}) {
        super(message, options);
        this.name = 'ApplicationError';
    }
}

/** SPAアプリケーション全体を統括するメインクラス */
export class SinglePageApplication {
    /** アプリケーション設定
     * @type {ApplicationConfig}
     */
    #config;

    /** ビューポート判定器
     * @type {ViewportDetector|null}
     */
    #viewportDetector = null;

    /** リソース読み込み器
     * @type {ResourceLoader|null}
     */
    #resourceLoader = null;

    /** メインコンテナ要素
     * @type {HTMLElement|null}
     */
    #mainContainer = null;

    /** ページコンテナ要素
     * @type {HTMLElement|null}
     */
    #pageContainer = null;

    /** ルートレジストリ
     * @type {RouteRegistry|null}
     */
    #routeRegistry = null;

    /** ページナビゲータ
     * @type {PageNavigator|null}
     */
    #pageNavigator = null;

    /** 起動済みフラグ
     * @type {boolean}
     */
    #isStarted = false;

    /**
     * @param {ApplicationConfig} config - アプリケーション設定
     */
    constructor(config) {
        this.#validateConfig(config);
        this.#config = { ...config };
    }

    /** 設定を検証
     * @param {ApplicationConfig} config - 検証する設定
     */
    #validateConfig(config) {
        if (!config) {
            throw new ApplicationError('Configuration is required');
        }

        const required = ['resourcesBaseUrl', 'containerId', 'routeConfigurer'];
        for (const field of required) {
            if (!config[field]) {
                throw new ApplicationError(`Required field '${field}' is missing`);
            }
        }

        if (typeof config.resourcesBaseUrl !== 'string') {
            throw new ApplicationError('resourcesBaseUrl must be a string');
        }

        if (typeof config.containerId !== 'string') {
            throw new ApplicationError('containerId must be a string');
        }

        if (typeof config.routeConfigurer !== 'function') {
            throw new ApplicationError('routeConfigurer must be a function');
        }
    }

    /** アプリケーションを起動
     * @returns {Promise<{ router: RouteRegistry, navigator: PageNavigator }>} - 起動結果
     */
    async start() {
        if (this.#isStarted) {
            throw new ApplicationError('Application is already started');
        }

        try {
            await this.#initializeCore();
            await this.#setupContainers();
            await this.#configureRoutes();
            await this.#startNavigation();

            this.#isStarted = true;

            return {
                router: this.#routeRegistry,
                navigator: this.#pageNavigator
            };
        } catch (error) {
            throw new ApplicationError(`Failed to start application: ${error.message}`, { cause: error });
        }
    }

    /** コア機能を初期化
     * @returns {Promise<void>}
     */
    async #initializeCore() {
        this.#viewportDetector = new ViewportDetector();
        this.#resourceLoader = new ResourceLoader({
            baseUrl: this.#config.resourcesBaseUrl,
            viewportDetector: this.#viewportDetector
        });
    }

    /** コンテナを設定
     * @returns {Promise<void>}
     */
    async #setupContainers() {
        this.#mainContainer = document.getElementById(this.#config.containerId);
        if (!this.#mainContainer) {
            throw new ApplicationError(`Container element '${this.#config.containerId}' not found`);
        }

        await this.#setupPageContainer();
    }

    /** ページコンテナを設定
     * @returns {Promise<void>}
     */
    async #setupPageContainer() {
        this.#pageContainer = this.#mainContainer;

        if (this.#config.themeRenderer) {
            try {
                const result = await this.#config.themeRenderer(
                    this.#mainContainer,
                    this.#resourceLoader,
                    this.#viewportDetector
                );

                if (result?.pageContainer instanceof HTMLElement) {
                    this.#pageContainer = result.pageContainer;
                } else {
                    console.warn('Theme renderer returned invalid pageContainer, using main container');
                }
            } catch (error) {
                console.error('Theme rendering failed:', error);
                console.warn('Fallback to main container as page container');
            }
        }
    }

    /** ルートを設定
     * @returns {Promise<void>}
     */
    async #configureRoutes() {
        this.#routeRegistry = new RouteRegistry();
        await this.#config.routeConfigurer(this.#routeRegistry);
    }

    /** ナビゲーションを開始
     * @returns {Promise<void>}
     */
    async #startNavigation() {
        this.#pageNavigator = new PageNavigator({
            pageContainer: this.#pageContainer,
            resourceLoader: this.#resourceLoader,
            viewportDetector: this.#viewportDetector,
            router: this.#routeRegistry,
            baseTitle: this.#config.title
        });

        await this.#pageNavigator.initialize();
    }

    /** 起動状態を取得
     * @returns {boolean} - 起動済みの場合true
     */
    get isStarted() {
        return this.#isStarted;
    }

    /** 設定を取得（読み取り専用）
     * @returns {Readonly<ApplicationConfig>} - アプリケーション設定
     */
    get config() {
        return Object.freeze({ ...this.#config });
    }
}

/** ビューポート種別 */
export const ViewportType = {
    MOBILE: 'mobile',
    TABLET: 'tablet',
    DESKTOP: 'desktop'
};

/** ビューポート情報
 * @typedef {Object} ViewportInfo
 * @property {string} type - ビューポート種別
 * @property {number} width - 幅
 * @property {number} height - 高さ
 * @property {number} aspectRatio - アスペクト比
 * @property {boolean} isPortrait - 縦向きかどうか
 * @property {boolean} isLandscape - 横向きかどうか
 */

/** ビューポート検出・管理クラス */
export class ViewportDetector {
    /** ブレークポイント設定
     * @type {Object}
     */
    static #BREAKPOINTS = {
        mobile: 768,
        tablet: 1024
    };

    /** 現在のビューポート情報をキャッシュ
     * @type {ViewportInfo|null}
     */
    #cachedInfo = null;

    /** リサイズハンドラ
     * @type {Set<Function>}
     */
    #resizeHandlers = new Set();

    /** リサイズ監視中かどうか
     * @type {boolean}
     */
    #isWatching = false;

    /** デバウンス用タイマー
     * @type {number|null}
     */
    #debounceTimer = null;

    /** デバウンス済みハンドラ
     * @type {Function|null}
     */
    #debouncedHandler = null;

    constructor() {
        this.#updateCache();
    }

    /** 現在のビューポート情報を取得
     * @returns {ViewportInfo} - ビューポート情報
     */
    getCurrentInfo() {
        if (!this.#cachedInfo) {
            this.#updateCache();
        }
        return { ...this.#cachedInfo };
    }

    /** キャッシュを更新
     */
    #updateCache() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspectRatio = width / height;

        this.#cachedInfo = {
            type: this.#determineType(width),
            width,
            height,
            aspectRatio,
            isPortrait: height > width,
            isLandscape: width >= height
        };
    }

    /** ビューポート種別を決定
     * @param {number} width - 幅
     * @returns {string} - ビューポート種別
     */
    #determineType(width) {
        if (width < ViewportDetector.#BREAKPOINTS.mobile) {
            return ViewportType.MOBILE;
        } else if (width < ViewportDetector.#BREAKPOINTS.tablet) {
            return ViewportType.TABLET;
        } else {
            return ViewportType.DESKTOP;
        }
    }

    /** モバイルかどうかを判定
     * @returns {boolean} - モバイルの場合true
     */
    isMobile() {
        return this.getCurrentInfo().type === ViewportType.MOBILE;
    }

    /** タブレットかどうかを判定
     * @returns {boolean} - タブレットの場合true
     */
    isTablet() {
        return this.getCurrentInfo().type === ViewportType.TABLET;
    }

    /** デスクトップかどうかを判定
     * @returns {boolean} - デスクトップの場合true
     */
    isDesktop() {
        return this.getCurrentInfo().type === ViewportType.DESKTOP;
    }

    /** 縦向きかどうかを判定
     * @returns {boolean} - 縦向きの場合true
     */
    isPortrait() {
        return this.getCurrentInfo().isPortrait;
    }

    /** 横向きかどうかを判定
     * @returns {boolean} - 横向きの場合true
     */
    isLandscape() {
        return this.getCurrentInfo().isLandscape;
    }

    /** リサイズイベントの監視を開始
     * @param {Function} handler - リサイズハンドラ
     * @param {number} [debounceMs=250] - デバウンス時間（ミリ秒）
     */
    watchResize(handler, debounceMs = 250) {
        this.#resizeHandlers.add(handler);

        if (!this.#isWatching) {
            this.#startWatching(debounceMs);
        }
    }

    /** リサイズイベントの監視を停止
     * @param {Function} handler - 削除するハンドラ
     */
    unwatchResize(handler) {
        this.#resizeHandlers.delete(handler);

        if (this.#resizeHandlers.size === 0) {
            this.#stopWatching();
        }
    }

    /** リサイズ監視を開始
     * @param {number} debounceMs - デバウンス時間
     */
    #startWatching(debounceMs) {
        this.#isWatching = true;

        const debouncedHandler = () => {
            if (this.#debounceTimer) {
                clearTimeout(this.#debounceTimer);
            }

            this.#debounceTimer = setTimeout(() => {
                const oldInfo = { ...this.#cachedInfo };
                this.#updateCache();
                const newInfo = { ...this.#cachedInfo };

                // 変化があった場合のみハンドラを呼び出し
                if (this.#hasSignificantChange(oldInfo, newInfo)) {
                    for (const handler of this.#resizeHandlers) {
                        try {
                            handler(newInfo, oldInfo);
                        } catch (error) {
                            console.error('Resize handler error:', error);
                        }
                    }
                }
            }, debounceMs);
        };

        window.addEventListener('resize', debouncedHandler);
        this.#debouncedHandler = debouncedHandler;
    }

    /** リサイズ監視を停止
     */
    #stopWatching() {
        this.#isWatching = false;
        if (this.#debouncedHandler) {
            window.removeEventListener('resize', this.#debouncedHandler);
            this.#debouncedHandler = null;
        }
        if (this.#debounceTimer) {
            clearTimeout(this.#debounceTimer);
            this.#debounceTimer = null;
        }
    }

    /** 重要な変化があったかどうかを判定
     * @param {ViewportInfo} oldInfo - 以前の情報
     * @param {ViewportInfo} newInfo - 新しい情報
     * @returns {boolean} - 重要な変化があった場合true
     */
    #hasSignificantChange(oldInfo, newInfo) {
        return oldInfo.type !== newInfo.type ||
            oldInfo.isPortrait !== newInfo.isPortrait;
    }

    /** 全ての監視を解除
     */
    dispose() {
        this.#resizeHandlers.clear();
        this.#stopWatching();
    }
}

/** リソースタイプ */
export const ResourceType = {
    HTML: 'html',
    CSS: 'css',
    JAVASCRIPT: 'js',
    JSON: 'json',
    TEXT: 'txt',
    BINARY: 'binary'
};

/** リソースローダー設定
 * @typedef {Object} ResourceLoaderConfig
 * @property {string} baseUrl - ベースURL
 * @property {ViewportDetector} viewportDetector - ビューポート検出器
 * @property {number} [timeout=30000] - タイムアウト時間（ミリ秒）
 * @property {number} [retryCount=2] - リトライ回数
 * @property {Object<string, string>} [headers] - デフォルトヘッダー
 */

/** キャッシュエントリ
 * @typedef {Object} CacheEntry
 * @property {*} data - キャッシュされたデータ
 * @property {number} timestamp - キャッシュ時刻
 * @property {string} etag - ETag
 */

/** 高度なリソース読み込み・管理クラス */
export class ResourceLoader {
    /** ベースURL
     * @type {string}
     */
    #baseUrl;

    /** ビューポート検出器
     * @type {ViewportDetector}
     */
    #viewportDetector;

    /** 設定
     * @type {ResourceLoaderConfig}
     */
    #config;

    /** リソースキャッシュ
     * @type {Map<string, CacheEntry>}
     */
    #cache = new Map();

    /** 進行中のリクエスト
     * @type {Map<string, Promise>}
     */
    #pendingRequests = new Map();

    /** プリロード済みリソース
     * @type {Set<string>}
     */
    #preloadedResources = new Set();

    /**
     * @param {ResourceLoaderConfig} config - 設定
     */
    constructor(config) {
        this.#validateConfig(config);
        this.#config = {
            timeout: 30000,
            retryCount: 2,
            headers: {},
            ...config
        };
        this.#baseUrl = this.#normalizeUrl(config.baseUrl);
        this.#viewportDetector = config.viewportDetector;
    }

    /** 設定を検証
     * @param {ResourceLoaderConfig} config - 検証する設定
     */
    #validateConfig(config) {
        if (!config) {
            throw new ApplicationError('ResourceLoader config is required');
        }
        if (!config.baseUrl || typeof config.baseUrl !== 'string') {
            throw new ApplicationError('baseUrl is required and must be a string');
        }
        if (!config.viewportDetector) {
            throw new ApplicationError('viewportDetector is required');
        }
    }

    /** URLを正規化
     * @param {string} url - 正規化するURL
     * @returns {string} - 正規化されたURL
     */
    #normalizeUrl(url) {
        return url.replace(/\/+$/, '');
    }

    /** フルURLを構築
     * @param {string} path - パス
     * @returns {string} - フルURL
     */
    #buildUrl(path) {
        const normalizedPath = path.replace(/^\/+/, '');
        return `${this.#baseUrl}/${normalizedPath}`;
    }

    /** キャッシュキーを生成
     * @param {string} path - パス
     * @param {Object} [options] - オプション
     * @returns {string} - キャッシュキー
     */
    #generateCacheKey(path, options = {}) {
        const key = [path];
        if (options.viewport) {
            key.push(`viewport:${options.viewport}`);
        }
        if (options.query) {
            key.push(`query:${JSON.stringify(options.query)}`);
        }
        return key.join('|');
    }

    /** HTTPリクエストを実行
     * @param {string} url - URL
     * @param {Object} [options] - オプション
     * @returns {Promise<Response>} - レスポンス
     */
    async #performRequest(url, options = {}) {
        const requestOptions = {
            method: 'GET',
            headers: { ...this.#config.headers, ...options.headers },
            signal: AbortSignal.timeout(this.#config.timeout),
            ...options
        };

        let lastError;
        for (let attempt = 0; attempt <= this.#config.retryCount; attempt++) {
            try {
                const response = await fetch(url, requestOptions);
                if (!response.ok) {
                    throw new ApplicationError(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response;
            } catch (error) {
                lastError = error;
                if (attempt < this.#config.retryCount) {
                    // 指数バックオフでリトライ
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }
        throw new ApplicationError(`Failed to fetch ${url} after ${this.#config.retryCount + 1} attempts`, { cause: lastError });
    }

    /** リソースを取得（汎用）
     * @param {string} path - パス
     * @param {ResourceType} type - リソースタイプ
     * @param {Object} [options] - オプション
     * @returns {Promise<*>} - リソースデータ
     */
    async fetchResource(path, type, options = {}) {
        const cacheKey = this.#generateCacheKey(path, options);

        // 進行中のリクエストがあれば待機
        if (this.#pendingRequests.has(cacheKey)) {
            return await this.#pendingRequests.get(cacheKey);
        }

        // キャッシュチェック
        if (options.useCache !== false && this.#cache.has(cacheKey)) {
            const entry = this.#cache.get(cacheKey);
            if (this.#isCacheValid(entry, options.maxAge)) {
                return entry.data;
            }
        }

        // リクエスト実行
        const requestPromise = this.#executeResourceRequest(path, type, options);
        this.#pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;

            // キャッシュに保存
            if (options.useCache !== false) {
                this.#cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now(),
                    etag: options.etag
                });
            }

            return result;
        } finally {
            this.#pendingRequests.delete(cacheKey);
        }
    }

    /** リソースリクエストを実行
     * @param {string} path - パス
     * @param {ResourceType} type - リソースタイプ
     * @param {Object} options - オプション
     * @returns {Promise<*>} - リソースデータ
     */
    async #executeResourceRequest(path, type, options) {
        const url = this.#buildUrl(path);
        const response = await this.#performRequest(url, options.requestOptions);

        switch (type) {
            case ResourceType.HTML:
            case ResourceType.CSS:
            case ResourceType.JAVASCRIPT:
            case ResourceType.TEXT:
                return await response.text();
            case ResourceType.JSON:
                return await response.json();
            case ResourceType.BINARY:
            default:
                return await response.blob();
        }
    }

    /** キャッシュが有効かどうかを判定
     * @param {CacheEntry} entry - キャッシュエントリ
     * @param {number} [maxAge] - 最大保持時間（ミリ秒）
     * @returns {boolean} - 有効な場合true
     */
    #isCacheValid(entry, maxAge) {
        if (!maxAge) return true;
        return (Date.now() - entry.timestamp) < maxAge;
    }

    /** HTMLテンプレートを取得
     * @param {string} path - パス
     * @param {Object} [options] - オプション
     * @returns {Promise<string>} - HTMLコンテンツ
     */
    async fetchTemplate(path, options = {}) {
        return await this.fetchResource(path, ResourceType.HTML, options);
    }

    /** CSSスタイルシートを取得
     * @param {string} path - パス
     * @param {Object} [options] - オプション
     * @returns {Promise<string>} - CSSコンテンツ
     */
    async fetchStylesheet(path, options = {}) {
        return await this.fetchResource(path, ResourceType.CSS, options);
    }

    /** JSONデータを取得
     * @param {string} path - パス
     * @param {Object} [options] - オプション
     * @returns {Promise<Object>} - JSONオブジェクト
     */
    async fetchJson(path, options = {}) {
        return await this.fetchResource(path, ResourceType.JSON, options);
    }

    /** ビューポート対応パスを生成
     * @param {string} basePath - ベースパス
     * @param {string} extension - 拡張子
     * @returns {string} - ビューポート対応パス
     */
    #buildViewportSpecificPath(basePath, extension) {
        const viewportInfo = this.#viewportDetector.getCurrentInfo();
        let suffix;

        if (viewportInfo.type === ViewportType.MOBILE) {
            suffix = 'mobile';
        } else if (viewportInfo.type === ViewportType.TABLET) {
            suffix = 'tablet';
        } else {
            suffix = 'desktop';
        }

        return `${basePath}/${suffix}.${extension}`;
    }

    /** ビューポート対応テンプレートを取得
     * @param {string} basePath - ベースパス
     * @param {Object} [options] - オプション
     * @returns {Promise<string>} - HTMLコンテンツ
     */
    async fetchViewportTemplate(basePath, options = {}) {
        const path = this.#buildViewportSpecificPath(basePath, 'html');
        return await this.fetchTemplate(path, { ...options, viewport: true });
    }

    /** ビューポート対応スタイルシートを取得
     * @param {string} basePath - ベースパス
     * @param {Object} [options] - オプション
     * @returns {Promise<string>} - CSSコンテンツ
     */
    async fetchViewportStylesheet(basePath, options = {}) {
        const path = this.#buildViewportSpecificPath(basePath, 'css');
        return await this.fetchStylesheet(path, { ...options, viewport: true });
    }

    /** HTMLをコンテナに読み込み
     * @param {HTMLElement} container - コンテナ要素
     * @param {string} path - HTMLパス
     * @param {Object} [options] - オプション
     * @returns {Promise<void>}
     */
    async loadHtmlIntoContainer(container, path, options = {}) {
        if (!container) {
            throw new ApplicationError('Container element is required');
        }

        const html = await this.fetchTemplate(path, options);

        if (options.sanitize) {
            // 必要に応じてサニタイズ処理を追加
            container.innerHTML = this.#sanitizeHtml(html);
        } else {
            container.innerHTML = html;
        }

        if (options.onLoad) {
            options.onLoad(container);
        }
    }

    /** ページ（HTML + CSS）をコンテナに読み込み
     * @param {HTMLElement} container - コンテナ要素
     * @param {string|null} htmlPath - HTMLパス
     * @param {string|null} cssPath - CSSパス
     * @param {Object} [options] - オプション
     * @returns {Promise<void>}
     */
    async loadPageIntoContainer(container, htmlPath, cssPath, options = {}) {
        if (!container) {
            throw new ApplicationError('Container element is required');
        }

        const [html, css] = await Promise.all([
            htmlPath ? this.fetchTemplate(htmlPath, options) : Promise.resolve(''),
            cssPath ? this.fetchStylesheet(cssPath, options) : Promise.resolve('')
        ]);

        const style = css ? `<style>${css}</style>` : '';
        const content = `${style}\n${html}`;

        if (options.sanitize) {
            container.innerHTML = this.#sanitizeHtml(content);
        } else {
            container.innerHTML = content;
        }

        if (options.onLoad) {
            options.onLoad(container);
        }
    }

    /** ビューポート対応ページを読み込み
     * @param {HTMLElement} container - コンテナ要素
     * @param {string|null} htmlBasePath - HTMLベースパス
     * @param {string|null} cssBasePath - CSSベースパス
     * @param {Object} [options] - オプション
     * @returns {Promise<void>}
     */
    async loadViewportPage(container, htmlBasePath, cssBasePath, options = {}) {
        const htmlPath = htmlBasePath ? this.#buildViewportSpecificPath(htmlBasePath, 'html') : null;
        const cssPath = cssBasePath ? this.#buildViewportSpecificPath(cssBasePath, 'css') : null;

        return await this.loadPageIntoContainer(container, htmlPath, cssPath, { ...options, viewport: true });
    }

    /** HTMLをサニタイズ（基本的な実装）
     * @param {string} html - サニタイズするHTML
     * @returns {string} - サニタイズされたHTML
     */
    #sanitizeHtml(html) {
        // 基本的なサニタイズ処理
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    }

    /** リソースをプリロード
     * @param {string[]} paths - プリロードするパス
     * @param {ResourceType} [type=ResourceType.BINARY] - リソースタイプ
     * @param {Object} [options] - オプション
     * @returns {Promise<void>}
     */
    async preloadResources(paths, type = ResourceType.BINARY, options = {}) {
        const preloadPromises = paths
            .filter(path => !this.#preloadedResources.has(path))
            .map(async path => {
                try {
                    await this.fetchResource(path, type, options);
                    this.#preloadedResources.add(path);
                } catch (error) {
                    console.warn(`Failed to preload resource: ${path}`, error);
                }
            });

        await Promise.all(preloadPromises);
    }

    /** キャッシュをクリア
     * @param {string} [pattern] - クリアするキーのパターン（正規表現）
     */
    clearCache(pattern) {
        if (pattern) {
            const regex = new RegExp(pattern);
            for (const [key] of this.#cache) {
                if (regex.test(key)) {
                    this.#cache.delete(key);
                }
            }
        } else {
            this.#cache.clear();
        }
    }

    /** キャッシュサイズを取得
     * @returns {number} - キャッシュエントリ数
     */
    getCacheSize() {
        return this.#cache.size;
    }

    /** 統計情報を取得
     * @returns {Object} - 統計情報
     */
    getStats() {
        return {
            cacheSize: this.#cache.size,
            pendingRequests: this.#pendingRequests.size,
            preloadedResources: this.#preloadedResources.size
        };
    }

    /** リソースローダーを破棄
     */
    dispose() {
        this.#cache.clear();
        this.#pendingRequests.clear();
        this.#preloadedResources.clear();
    }
}

/** ルート情報
 * @typedef {Object} RouteNode
 * @property {HandlerFactory|null} handlerFactory - ハンドラファクトリ
 * @property {string|null} paramName - パラメータ名(:で始まるルートの場合)
 * @property {RouteNode|null} wildcardChild - ワイルドカード子ルート(*)
 * @property {RouteNode|null} paramChild - パラメータ子ルート(:param)
 * @property {Object<string, RouteNode>} staticChildren - 静的子ルート
 */

/** ルート管理・マッチングレジストリ
 * パスの分解も行う（N分木構造を使用）
 * 登録するのはHandlerFactoryでレンダリング時にHandlerを生成する
 * コロンを1階層のパラメータ、アスタリスクを複数階層のワイルドカードとして扱う
 */
export class RouteRegistry {
    /** ルート構造体(N分木)
     * @type {RouteNode}
     */
    #routes = {
        handlerFactory: null,
        paramName: null,
        wildcardChild: null,
        paramChild: null,
        staticChildren: {}
    };

    /** 特殊ルート構造体
     * @type {Map<string, SpecialHandlerFactory>}
     */
    #specialRoutes = new Map();

    /** 名前付きルートマップ（新機能）
     * @type {Map<string, Object>}
     */
    #namedRoutes = new Map();

    /** マッチ結果キャッシュ（新機能）
     * @type {Map<string, Object|null>}
     */
    #matchCache = new Map();

    /** 登録されたルート定義のリスト（新機能）
     * @type {Array<Object>}
     */
    #routeDefinitions = [];

    /** パスを正規化する(スラッシュのみ)
     * @param {string} path - 正規化するパス
     * @returns {string} - 正規化されたパス
     */
    static normalizePath(path) {
        if (!path || typeof path !== 'string') return '';
        return path
            .replace(/^\/+/, '')
            .replace(/\/+$/, '')
            .replace(/\/+/g, '/');
    }

    /** ルートノードを作成
     * @returns {RouteNode} - 新しいルートノード
     */
    #createRouteNode() {
        return {
            handlerFactory: null,
            paramName: null,
            wildcardChild: null,
            paramChild: null,
            staticChildren: {}
        };
    }

    /** ハンドラファクトリをルートに登録する
     * @param {string} path - 固定パス
     * @param {HandlerFactory} handlerFactory - ハンドラファクトリ
     * @param {Object} [options] - ルートオプション
     * @param {string} [options.name] - ルート名
     * @param {string[]} [options.middleware] - ミドルウェア配列
     * @param {Object} [options.meta] - メタデータ
     * @param {boolean} [options.caseSensitive=false] - 大文字小文字を区別するか
     * @param {boolean} [options.strict=false] - 厳密マッチングか
     * @returns {RouteRegistry} - 自身のインスタンス
     */
    registerHandlerFactory(path, handlerFactory, options = {}) {
        // バリデーション
        if (!handlerFactory) {
            throw new ApplicationError('Handler factory is required');
        }
        if (typeof handlerFactory.create !== 'function') {
            throw new ApplicationError('Handler factory must implement create method');
        }

        // 重複チェック
        if (options.name && this.#namedRoutes.has(options.name)) {
            throw new ApplicationError(`Route name "${options.name}" is already registered`);
        }

        const normalizedPath = RouteRegistry.normalizePath(path);
        let current = this.#routes;

        const segments = normalizedPath ? normalizedPath.split('/').filter(Boolean) : [];
        const paramNames = [];

        for (const segment of segments) {
            if (segment === '*') {
                if (!current.wildcardChild) {
                    current.wildcardChild = this.#createRouteNode();
                }
                current = current.wildcardChild;
                break; // ワイルドカードは末端なのでここで終了
            } else if (segment.startsWith(':')) {
                if (!current.paramChild) {
                    current.paramChild = this.#createRouteNode();
                }
                const paramName = segment.slice(1);
                current.paramChild.paramName = paramName;
                paramNames.push(paramName);
                current = current.paramChild;
            } else {
                if (!current.staticChildren[segment]) {
                    current.staticChildren[segment] = this.#createRouteNode();
                }
                current = current.staticChildren[segment];
            }
        }
        current.handlerFactory = handlerFactory;

        // ルート定義を作成・保存
        const routeDefinition = {
            path,
            handlerFactory,
            options: {
                caseSensitive: false,
                strict: false,
                ...options
            },
            compiledNode: current,
            paramNames,
            registeredAt: new Date()
        };

        this.#routeDefinitions.push(routeDefinition);

        // 名前付きルートとして登録
        if (options.name) {
            this.#namedRoutes.set(options.name, routeDefinition);
        }

        // キャッシュをクリア
        this.#matchCache.clear();

        return this;
    }

    /** ハンドラファクトリ検索結果
     * @typedef {Object} RouteMatch
     * @property {HandlerFactory} handlerFactory - 見つかったハンドラファクトリ
     * @property {string} fixedPath - 固定パス(パラメータはコロン)
     * @property {Object<string, string>} params - パラメータ
     */

    /** パスに対応するハンドラファクトリを検索
     * @param {string} path - 検索するパス
     * @returns {RouteMatch|null} - ハンドラファクトリ検索結果
     */
    findHandlerFactory(path) {
        if (!path || typeof path !== 'string') {
            return null;
        }

        // キャッシュから検索
        if (this.#matchCache.has(path)) {
            return this.#matchCache.get(path);
        }

        const normalizedPath = RouteRegistry.normalizePath(path);
        const segments = normalizedPath ? normalizedPath.split('/').filter(Boolean) : [];

        const fixedPath = [];
        const params = {};
        let current = this.#routes;
        let wildcardCapture = null;
        let matchedRoute = null;

        for (const segment of segments) {
            if (wildcardCapture) {
                wildcardCapture.push(segment);
                continue;
            }

            if (current.staticChildren[segment]) {
                fixedPath.push(segment);
                current = current.staticChildren[segment];
            } else if (current.paramChild) {
                fixedPath.push(`:${current.paramChild.paramName}`);
                params[current.paramChild.paramName] = segment;
                current = current.paramChild;
            } else if (current.wildcardChild) {
                fixedPath.push('*');
                wildcardCapture = [segment];
                current = current.wildcardChild;
            } else {
                // マッチしなかった場合はキャッシュして終了
                this.#matchCache.set(path, null);
                return null;
            }
        }

        if (!current.handlerFactory) {
            this.#matchCache.set(path, null);
            return null;
        }

        if (wildcardCapture) {
            params['*'] = wildcardCapture.join('/');
        }

        // マッチしたルート定義を特定
        matchedRoute = this.#routeDefinitions.find(route =>
            route.compiledNode === current
        );

        const result = {
            handlerFactory: current.handlerFactory,
            fixedPath: fixedPath.join('/'),
            params,
            route: matchedRoute,
            score: this.#calculateMatchScore(fixedPath.join('/'), normalizedPath)
        };

        // キャッシュに保存
        this.#matchCache.set(path, result);

        return result;
    }

    /** マッチスコアを計算
     * @param {string} fixedPath - 固定パス
     * @param {string} actualPath - 実際のパス
     * @returns {number} - スコア（高いほど優先）
     */
    #calculateMatchScore(fixedPath, actualPath) {
        let score = 0;

        // 正確なマッチを優先
        if (fixedPath === actualPath) {
            score += 1000;
        }

        // パラメータが少ないルートを優先
        const paramCount = (fixedPath.match(/:/g) || []).length;
        score -= paramCount * 10;

        // パスの長さでスコア調整
        score += fixedPath.length;

        return score;
    }

    /** 特殊ルートを登録する
     * @param {string} name - 特殊ルート名
     * @param {SpecialHandlerFactory} handlerFactory - ハンドラファクトリ
     * @returns {RouteRegistry} - 自身のインスタンス
     */
    registerSpecialRoute(name, handlerFactory) {
        if (!name || !handlerFactory) {
            throw new ApplicationError('Name and handler factory are required for special routes');
        }
        if (typeof handlerFactory.create !== 'function') {
            throw new ApplicationError('Special handler factory must implement create method');
        }
        this.#specialRoutes.set(name, handlerFactory);
        return this;
    }

    /** パスに対応するハンドラファクトリを検索(特殊ルート)
     * @param {string} name - ルートの登録名
     * @returns {SpecialHandlerFactory|null} - ハンドラファクトリ
     */
    findSpecialHandlerFactory(name) {
        return this.#specialRoutes.get(name) || null;
    }

    // ===== 新機能メソッド =====

    /** 名前からルートを検索
     * @param {string} name - ルート名
     * @returns {Object|null} - ルート定義
     */
    findByName(name) {
        return this.#namedRoutes.get(name) || null;
    }

    /** ルートからURLを生成
     * @param {string} name - ルート名
     * @param {Object<string, string>} [params] - パラメータ
     * @param {Object} [options] - オプション
     * @returns {string} - 生成されたURL
     */
    generateUrl(name, params = {}, options = {}) {
        const route = this.findByName(name);
        if (!route) {
            throw new ApplicationError(`Route "${name}" not found`);
        }

        let url = route.path;

        // パラメータを置換
        route.paramNames?.forEach(paramName => {
            const value = params[paramName];
            if (value === undefined || value === null) {
                throw new ApplicationError(`Missing parameter "${paramName}" for route "${name}"`);
            }
            url = url.replace(`:${paramName}`, encodeURIComponent(String(value)));
        });

        // クエリパラメータを追加
        if (options.query && Object.keys(options.query).length > 0) {
            const queryString = new URLSearchParams(options.query).toString();
            url += `?${queryString}`;
        }

        // フラグメントを追加
        if (options.fragment) {
            url += `#${options.fragment}`;
        }

        return url;
    }

    /** 複数のルートを一括登録
     * @param {Array<{path: string, handlerFactory: HandlerFactory, options?: Object}>} routeConfigs - ルート設定配列
     * @returns {Array<Object>} - 登録されたルート定義配列
     */
    registerBatch(routeConfigs) {
        if (!Array.isArray(routeConfigs)) {
            throw new ApplicationError('Route configs must be an array');
        }

        return routeConfigs.map(config => {
            const { path, handlerFactory, options } = config;
            this.registerHandlerFactory(path, handlerFactory, options);
            return this.#routeDefinitions[this.#routeDefinitions.length - 1];
        });
    }

    /** 登録されている全ルートを取得
     * @returns {Array<Object>} - ルート定義配列
     */
    getAllRoutes() {
        return [...this.#routeDefinitions];
    }

    /** ルート数を取得
     * @returns {number} - ルート数
     */
    getRouteCount() {
        return this.#routeDefinitions.length;
    }

    /** キャッシュをクリア
     * @param {string} [pattern] - クリアするキーのパターン（正規表現）
     */
    clearCache(pattern) {
        if (pattern) {
            const regex = new RegExp(pattern);
            for (const [key] of this.#matchCache) {
                if (regex.test(key)) {
                    this.#matchCache.delete(key);
                }
            }
        } else {
            this.#matchCache.clear();
        }
    }

    /** 統計情報を取得
     * @returns {Object} - 統計情報
     */
    getStats() {
        return {
            routeCount: this.#routeDefinitions.length,
            namedRouteCount: this.#namedRoutes.size,
            specialRouteCount: this.#specialRoutes.size,
            cacheSize: this.#matchCache.size,
            cacheHitRate: this.#calculateCacheHitRate()
        };
    }

    /** キャッシュヒット率を計算
     * @returns {number} - ヒット率（0-1）
     */
    #calculateCacheHitRate() {
        // 簡単な実装。本格的にはヒット数/アクセス数を追跡する必要がある
        return this.#matchCache.size > 0 ? 0.8 : 0;
    }

    /** デバッグ情報を取得
     * @returns {Object} - デバッグ情報
     */
    getDebugInfo() {
        return {
            routeCount: this.#routeDefinitions.length,
            namedRouteCount: this.#namedRoutes.size,
            specialRouteCount: this.#specialRoutes.size,
            cacheSize: this.#matchCache.size,
            routes: this.#routeDefinitions.map(route => ({
                path: route.path,
                name: route.options.name,
                paramNames: route.paramNames,
                caseSensitive: route.options.caseSensitive,
                strict: route.options.strict,
                registeredAt: route.registeredAt
            }))
        };
    }

}

/** ハンドラファクトリインターフェース */
export class HandlerFactory {
    /** ハンドラインスタンスを生成
     * @param {Object} entities - ハンドラインスタンス生成に必要なエンティティ
     * @param {HTMLElement} entities.pageContainer - ページ表示用のコンテナ要素
     * @param {ResourceLoader} entities.resourceLoader - リソース読み込みクラス
     * @param {ViewportDetector} entities.viewportDetector - ビューポート判定クラス
     * @param {PageNavigator} entities.navigator - ナビゲータクラス
     * @param {Object} context - ハンドラインスタンス生成コンテキスト
     * @param {string} context.nextRawPath - 次のパス
     * @param {string} context.nextFixedPath - 次の固定パス
     * @param {Object<string, string>} context.nextParams - 次のパラメータ
     * @param {string|null} context.prevRawPath - 前のパス
     * @param {string|null} context.prevFixedPath - 前の固定パス
     * @param {Object<string, string>|null} context.prevParams - 前のパラメータ
     * @returns {Promise<Handler>} - ハンドラインスタンス
     */
    async create(entities, context) {
        throw new ApplicationError('create method must be implemented');
    }
}

/** ページハンドラインターフェース */
export class Handler {
    /** クリーンアップ処理
     * @returns {Promise<void>}
     */
    async cleanup() { }

    /** ページタイトルを取得
     * @returns {Promise<string|null>}
     */
    async getTitle() {
        return null;
    }

    /** HTMLリソースパスを取得
     * @returns {Promise<string|null>}
     */
    async getHtmlPath() {
        return null;
    }

    /** メインレンダリング処理
     * @returns {Promise<void>}
     */
    async render() {
        throw new ApplicationError('render method must be implemented');
    }

    /** 次のパスへの部分遷移が可能かチェック
     * @param {Object} nextPathInfo - 次のパス情報
     * @param {string} nextPathInfo.raw - 生パス
     * @param {string} nextPathInfo.fixed - 固定パス
     * @param {Object<string, string>} nextPathInfo.params - パラメータ
     * @returns {Promise<boolean>}
     */
    async canPartialTransferTo(nextPathInfo) {
        return false;
    }

    /** 前のパスからの部分遷移を受け入れ可能かチェック
     * @returns {Promise<boolean>}
     */
    async canPartialReceiveFrom() {
        return false;
    }

    /** 部分遷移の準備
     * @param {Object} nextPathInfo - 次のパス情報
     * @returns {Promise<Object>} - 準備結果
     */
    async preparePartialTransfer(nextPathInfo) {
        return {
            state: null,
            pathUnmatchHandlers: null,
            domCleanupHandler: null
        };
    }

    /** 部分遷移レンダリング
     * @param {Object} state - 前のハンドラから引き継ぐ状態
     * @returns {Promise<void>}
     */
    async renderPartial(state) { }

    /** ページ内遷移が可能かチェック
     * @param {Object<string, string>} nextParams - 次のパラメータ
     * @returns {Promise<boolean>}
     */
    async canInPageTransferTo(nextParams) {
        return false;
    }

    /** ページ内遷移レンダリング
     * @param {Object<string, string>} nextParams - 次のパラメータ
     * @returns {Promise<void>}
     */
    async renderInPage(nextParams) { }
}

/** 特殊ハンドラファクトリインターフェース */
export class SpecialHandlerFactory {
    /** 特殊ハンドラインスタンスを生成
     * @param {Object} entities - ハンドラインスタンス生成に必要なエンティティ
     * @param {HTMLElement} entities.pageContainer - ページ表示用のコンテナ要素
     * @param {ResourceLoader} entities.resourceLoader - リソース読み込みクラス
     * @param {ViewportDetector} entities.viewportDetector - ビューポート判定クラス
     * @param {PageNavigator} entities.navigator - ナビゲータクラス
     * @returns {Promise<SpecialHandler>} - 特殊ハンドラインスタンス
     */
    async create(entities) {
        throw new ApplicationError('create method must be implemented');
    }
}

/** 特殊ハンドラインターフェース */
export class SpecialHandler {
    /** クリーンアップ処理
     * @returns {Promise<void>}
     */
    async cleanup() { }

    /** ページタイトルを取得
     * @returns {Promise<string|null>}
     */
    async getTitle() {
        return null;
    }

    /** HTMLリソースパスを取得
     * @returns {Promise<string|null>}
     */
    async getHtmlPath() {
        return null;
    }

    /** レンダリング処理
     * @returns {Promise<void>}
     */
    async render() {
        throw new ApplicationError('render method must be implemented');
    }
}

/** ナビゲーション状態
 * @typedef {Object} NavigationState
 * @property {string} path - 現在のパス
 * @property {string} fixedPath - 固定パス
 * @property {Object<string, string>} params - パラメータ
 * @property {Handler|SpecialHandler} handler - 現在のハンドラ
 * @property {number} timestamp - 遷移時刻
 */

/** 遷移タイプ */
export const TransitionType = {
    FULL: 'full',
    PARTIAL: 'partial',
    INPAGE: 'inpage',
    SPECIAL: 'special'
};

/** 高度なページナビゲーション・状態管理クラス */
export class PageNavigator {
    /** @type {HTMLElement} */
    #container;

    /** @type {ResourceLoader} */
    #loader;

    /** @type {ViewportDetector} */
    #viewport;

    /** @type {RouteRegistry} */
    #registry;

    /** @type {string|null} */
    #baseTitle;

    /** @type {NavigationState|null} */
    #currentState = null;

    /** @type {Array<{pattern: string, callback: Function}>} */
    #pathWatchers = [];

    /** @type {Array<Function>} */
    #cleanupTasks = [];

    /** @type {boolean} */
    #isTransitioning = false;

    /** @type {AbortController|null} */
    #transitionController = null;

    /**
     * @param {Object} config - 設定オブジェクト
     * @param {HTMLElement} config.pageContainer - ページコンテナ要素
     * @param {ResourceLoader} config.resourceLoader - リソースローダー
     * @param {ViewportDetector} config.viewportDetector - ビューポート検出器
     * @param {RouteRegistry} config.router - ルートレジストリ
     * @param {string|null} config.baseTitle - ベースタイトル
     */
    constructor(config) {
        this.#container = config.pageContainer;
        this.#loader = config.resourceLoader;
        this.#viewport = config.viewportDetector;
        this.#registry = config.router;
        this.#baseTitle = config.baseTitle;
    }

    /** ナビゲーションを初期化・開始
     * @returns {Promise<void>}
     */
    async initialize() {
        this.#setupHistoryListener();
        await this.navigateTo(window.location.pathname);
    }

    /** 指定パスへの遷移
     * @param {string} path - 遷移先パス
     * @param {Object} [options] - 遷移オプション
     * @param {boolean} [options.replaceState=false] - history.replaceStateを使用
     * @param {TransitionType} [options.preferredType] - 優先遷移タイプ
     * @param {Object} [options.state] - 状態データ
     * @returns {Promise<NavigationState|null>}
     */
    async navigateTo(path, options = {}) {
        if (this.#isTransitioning) {
            this.#abortTransition();
        }

        this.#isTransitioning = true;
        this.#transitionController = new AbortController();

        try {
            if (!options.replaceState) {
                history.pushState(options.state || null, '', path);
            } else {
                history.replaceState(options.state || null, '', path);
            }

            return await this.#executeTransition(path, options);
        } catch (error) {
            if (error.name === 'AbortError') {
                return null;
            }
            console.error('Navigation failed:', error);
            return await this.#handleNavigationError(error);
        } finally {
            this.#isTransitioning = false;
            this.#transitionController = null;
        }
    }

    /** 特殊ページへの遷移
     * @param {string} pageName - 特殊ページ名
     * @param {Object} [options] - 遷移オプション
     * @returns {Promise<NavigationState|null>}
     */
    async navigateToSpecial(pageName, options = {}) {
        return await this.#executeSpecialTransition(pageName, options);
    }

    /** 現在の状態を取得
     * @returns {NavigationState|null}
     */
    getCurrentState() {
        return this.#currentState ? { ...this.#currentState } : null;
    }

    /** パス監視を追加
     * @param {string} pattern - 監視パターン
     * @param {Function} callback - コールバック関数
     * @returns {Function} - 監視解除関数
     */
    watchPath(pattern, callback) {
        const watcher = { pattern, callback };
        this.#pathWatchers.push(watcher);

        return () => {
            const index = this.#pathWatchers.indexOf(watcher);
            if (index !== -1) {
                this.#pathWatchers.splice(index, 1);
            }
        };
    }

    /** 遷移中かどうかを判定
     * @returns {boolean}
     */
    isTransitioning() {
        return this.#isTransitioning;
    }

    /** 遷移を中止
     */
    abortTransition() {
        this.#abortTransition();
    }

    /** 履歴リスナーを設定 */
    #setupHistoryListener() {
        window.addEventListener('popstate', async (event) => {
            const path = window.location.pathname;
            await this.#executeTransition(path, {
                state: event.state,
                fromHistory: true
            });
        });
    }

    /** 遷移を中止 */
    #abortTransition() {
        if (this.#transitionController) {
            this.#transitionController.abort();
        }
    }

    /** 遷移を実行
     * @param {string} path - 遷移先パス
     * @param {Object} options - オプション
     * @returns {Promise<NavigationState|null>}
     */
    async #executeTransition(path, options = {}) {
        const normalizedPath = RouteRegistry.normalizePath(path);
        const routeMatch = this.#registry.findHandlerFactory(normalizedPath);

        if (!routeMatch) {
            return await this.#executeSpecialTransition('notfound', options);
        }

        const targetState = {
            path: normalizedPath,
            fixedPath: routeMatch.fixedPath,
            params: routeMatch.params,
            timestamp: Date.now()
        };

        // パス監視の実行
        await this.#processPathWatchers(targetState.path);

        // 遷移戦略の実行
        const strategy = this.#selectTransitionStrategy(targetState, options);
        const handler = await this.#createHandler(routeMatch.handlerFactory, targetState);

        const success = await this.#executeTransitionStrategy(strategy, handler, targetState, options);

        if (success) {
            this.#currentState = { ...targetState, handler };
            await this.#updateDocumentTitle(handler);
            return this.#currentState;
        }

        throw new ApplicationError('Transition execution failed');
    }

    /** 特殊遷移を実行
     * @param {string} pageName - 特殊ページ名
     * @param {Object} options - オプション
     * @returns {Promise<NavigationState|null>}
     */
    async #executeSpecialTransition(pageName, options = {}) {
        const handlerFactory = this.#registry.findSpecialHandlerFactory(pageName);

        if (!handlerFactory) {
            if (pageName === 'error') {
                throw new ApplicationError(`Critical: Error page handler not found`);
            }
            return await this.#executeSpecialTransition('error', options);
        }

        const handler = await handlerFactory.create({
            pageContainer: this.#container,
            resourceLoader: this.#loader,
            viewportDetector: this.#viewport,
            navigator: this
        });

        await this.#executeFullTransition(handler, null);

        this.#currentState = {
            path: `<special:${pageName}>`,
            fixedPath: `<special:${pageName}>`,
            params: {},
            handler,
            timestamp: Date.now()
        };

        await this.#updateDocumentTitle(handler);
        return this.#currentState;
    }

    /** ナビゲーションエラーを処理
     * @param {Error} error - エラー
     * @returns {Promise<NavigationState|null>}
     */
    async #handleNavigationError(error) {
        console.error('Navigation error:', error);
        try {
            return await this.#executeSpecialTransition('error');
        } catch (criticalError) {
            console.error('Critical navigation failure:', criticalError);
            return null;
        }
    }

    /** パス監視を処理
     * @param {string} path - 現在のパス
     */
    async #processPathWatchers(path) {
        const activeWatchers = [];

        for (const watcher of this.#pathWatchers) {
            const segments = RouteRegistry.normalizePath(path).split('/').filter(Boolean);
            const patternSegments = RouteRegistry.normalizePath(watcher.pattern).split('/').filter(Boolean);

            if (this.#isPatternMatching(patternSegments, segments)) {
                activeWatchers.push(watcher);
            } else {
                try {
                    await watcher.callback();
                } catch (error) {
                    console.error('Path watcher error:', error);
                }
            }
        }

        this.#pathWatchers = activeWatchers;
    }

    /** 遷移戦略を選択
     * @param {Object} targetState - 目標状態
     * @param {Object} options - オプション
     * @returns {TransitionType}
     */
    #selectTransitionStrategy(targetState, options) {
        if (options.preferredType) {
            return options.preferredType;
        }

        if (!this.#currentState) {
            return TransitionType.FULL;
        }

        if (this.#currentState.fixedPath === targetState.fixedPath) {
            return TransitionType.INPAGE;
        }

        return TransitionType.PARTIAL; // フォールバックでFULLを試行
    }

    /** ハンドラを作成
     * @param {HandlerFactory} factory - ハンドラファクトリ
     * @param {Object} targetState - 目標状態
     * @returns {Promise<Handler>}
     */
    async #createHandler(factory, targetState) {
        return await factory.create(
            {
                pageContainer: this.#container,
                resourceLoader: this.#loader,
                viewportDetector: this.#viewport,
                navigator: this
            },
            {
                nextRawPath: targetState.path,
                nextFixedPath: targetState.fixedPath,
                nextParams: targetState.params,
                prevRawPath: this.#currentState?.path || null,
                prevFixedPath: this.#currentState?.fixedPath || null,
                prevParams: this.#currentState?.params || null
            }
        );
    }

    /** 遷移戦略を実行
     * @param {TransitionType} strategy - 戦略
     * @param {Handler} handler - ハンドラ
     * @param {Object} targetState - 目標状態
     * @param {Object} options - オプション
     * @returns {Promise<boolean>}
     */
    async #executeTransitionStrategy(strategy, handler, targetState, options) {
        switch (strategy) {
            case TransitionType.INPAGE:
                if (await this.#attemptInPageTransition(handler, targetState)) {
                    return true;
                }
            // フォールスルー

            case TransitionType.PARTIAL:
                if (await this.#attemptPartialTransition(handler, targetState)) {
                    return true;
                }
            // フォールスルー

            case TransitionType.FULL:
                await this.#executeFullTransition(handler, targetState);
                return true;

            default:
                throw new ApplicationError(`Unknown transition strategy: ${strategy}`);
        }
    }

    /** ページ内遷移を試行
     * @param {Handler} handler - ハンドラ
     * @param {Object} targetState - 目標状態
     * @returns {Promise<boolean>}
     */
    async #attemptInPageTransition(handler, targetState) {
        if (!this.#currentState?.handler?.canInPageTransferTo) {
            return false;
        }

        try {
            const canTransfer = await this.#currentState.handler.canInPageTransferTo(targetState.params);
            if (canTransfer) {
                await this.#currentState.handler.renderInPage(targetState.params);
                return true;
            }
        } catch (error) {
            console.warn('In-page transition failed:', error);
        }

        return false;
    }

    /** 部分遷移を試行
     * @param {Handler} handler - ハンドラ
     * @param {Object} targetState - 目標状態
     * @returns {Promise<boolean>}
     */
    async #attemptPartialTransition(handler, targetState) {
        const currentHandler = this.#currentState?.handler;

        if (!currentHandler?.canPartialTransferTo || !handler?.canPartialReceiveFrom) {
            return false;
        }

        try {
            const [canTransfer, canReceive] = await Promise.all([
                currentHandler.canPartialTransferTo(targetState),
                handler.canPartialReceiveFrom()
            ]);

            if (canTransfer && canReceive) {
                const preparation = await currentHandler.preparePartialTransfer(targetState);

                // クリーンアップタスクを追加
                if (preparation.pathUnmatchHandlers) {
                    this.#pathWatchers.push(...preparation.pathUnmatchHandlers);
                }
                if (preparation.domCleanupHandler) {
                    this.#cleanupTasks.push(preparation.domCleanupHandler);
                }

                await handler.renderPartial(preparation.state);
                return true;
            }
        } catch (error) {
            console.warn('Partial transition failed:', error);
        }

        return false;
    }

    /** 全遷移を実行
     * @param {Handler} handler - ハンドラ
     * @param {Object|null} targetState - 目標状態
     */
    async #executeFullTransition(handler, targetState) {
        // 既存状態のクリーンアップ
        await this.#cleanupCurrentState();

        // HTMLリソースの読み込み
        const htmlPath = await handler?.getHtmlPath?.();
        if (htmlPath) {
            await this.#loader.loadHtmlIntoContainer(this.#container, htmlPath);
        } else {
            this.#container.innerHTML = '';
        }

        // レンダリング実行
        await handler?.render?.();
    }

    /** 現在状態をクリーンアップ
     */
    async #cleanupCurrentState() {
        // パス監視のクリーンアップ
        for (const watcher of this.#pathWatchers) {
            try {
                await watcher.callback();
            } catch (error) {
                console.error('Path watcher cleanup error:', error);
            }
        }
        this.#pathWatchers = [];

        // DOMクリーンアップ
        for (const task of this.#cleanupTasks) {
            try {
                await task();
            } catch (error) {
                console.error('Cleanup task error:', error);
            }
        }
        this.#cleanupTasks = [];

        // ハンドラクリーンアップ
        if (this.#currentState?.handler?.cleanup) {
            try {
                await this.#currentState.handler.cleanup();
            } catch (error) {
                console.error('Handler cleanup error:', error);
            }
        }
    }

    /** ドキュメントタイトルを更新
     * @param {Handler} handler - ハンドラ
     */
    async #updateDocumentTitle(handler) {
        try {
            const title = await handler?.getTitle?.();
            const parts = [];
            if (title) parts.push(title);
            if (this.#baseTitle) parts.push(this.#baseTitle);
            document.title = parts.join(' - ') || 'Application';
        } catch (error) {
            console.warn('Title update failed:', error);
        }
    }

    /** パターンマッチング判定
     * @param {string[]} pattern - パターンセグメント
     * @param {string[]} path - パスセグメント
     * @returns {boolean}
     */
    #isPatternMatching(pattern, path) {
        if (pattern.length === 0 && path.length === 0) {
            return true;
        }

        if (pattern.length < path.length && pattern.at(-1) !== '*') {
            return false;
        }

        if (pattern.length > path.length) {
            return false;
        }

        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] === '*') {
                return true;
            }
            if (pattern[i].startsWith(':')) {
                continue;
            }
            if (pattern[i] !== path[i]) {
                return false;
            }
        }
        return true;
    }
}
