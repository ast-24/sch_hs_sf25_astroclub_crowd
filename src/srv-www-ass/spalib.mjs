/** テーマ描画関数
 * @callback ThemeRenderer
 * @param {HTMLElement} container - SPA全体のコンテナ要素
 * @param {ResourceLoader} resourceLoader - リソース読み込みクラス
 * @param {DeviceDetector} deviceDetector - デバイス判定クラス
 * @returns {Promise<{ pageContainer: HTMLElement }>} - ページコンテナ
 */

/** テーマリサイズ時描画関数
 * @callback ThemeRendererOnResize
 * @param {HTMLElement} container - SPA全体のコンテナ要素
 * @param {ResourceLoader} resourceLoader - リソース読み込みクラス
 * @param {DeviceDetector} deviceDetector - デバイス判定クラス
 * @returns {Promise<{ pageContainer: HTMLElement }>} - ページコンテナ
 */

/** ルート設定関数
 * @callback RouteConfigurer
 * @param {Router} router - ルート登録対象のRouterインスタンス
 * @returns {Promise<void>}
 */

/** アプリケーション設定
 * @typedef {Object} ApplicationConfig
 * @property {string} resourcesBaseUrl - リソース置き場のベースURL
 * @property {string} containerId - SPAコンテナ要素のID
 * @property {string} [title] - アプリケーションのベースタイトル
 * @property {ThemeRenderer} [themeRenderer] - ベーステーマ描画関数
 * @property {ThemeRendererOnResize} [themeRendererOnResize] - リサイズ時テーマ描画関数
 * @property {RouteConfigurer} routeConfigurer - ルート設定関数
 */

/** SPAアプリケーション全体を統括するメインクラス */
export class SpaCore {
    /** アプリケーション設定
     * @type {ApplicationConfig}
     */
    #config;

    /** コア機能
     * @type {Object}
     */
    #core = {
        /** @type {DeviceDetector|null} */
        deviceDetector: null,
        /** @type {ResourceLoader|null} */
        resourceLoader: null
    };

    /** コンテナ要素
     * @type {Object}
     */
    #containers = {
        /** @type {HTMLElement|null} */
        main: null,
        /** @type {{dom: HTMLElement}|null} */
        pageRef: null
    };

    /** ナビゲーション
     * @type {Object}
     */
    #navigation = {
        /** @type {Router|null} */
        router: null,
        /** @type {Navigator|null} */
        navigator: null
    };

    /** 起動済みフラグ
     * @type {boolean}
     */
    #isStarted = false;

    /**
     * @param {ApplicationConfig} config - アプリケーション設定
     */
    constructor(config) {
        if (!config?.resourcesBaseUrl || !config?.containerId || !config?.routeConfigurer) {
            throw new Error('Required configuration is missing');
        }
        this.#config = { ...config };
    }

    /** アプリケーションを起動
     * @returns {Promise<{ router: Router, navigator: Navigator }>} - 起動結果
     */
    async start() {
        if (this.#isStarted) {
            throw new Error('Application is already started');
        }

        try {
            await this.#initializeCore();
            await this.#setupContainers();
            await this.#configureRoutes();
            await this.#startNavigation();

            this.#isStarted = true;

            return {
                router: this.#navigation.router,
                navigator: this.#navigation.navigator
            };
        } catch (error) {
            console.error('SPA application startup failed:', error);
            throw error;
        }
    }

    /** コア機能を初期化
     * @returns {Promise<void>}
     */
    async #initializeCore() {
        this.#core.deviceDetector = new DeviceDetector();
        this.#core.resourceLoader = new ResourceLoader({
            baseUrl: this.#config.resourcesBaseUrl,
            deviceDetector: this.#core.deviceDetector
        });
    }

    /** コンテナを設定
     * @returns {Promise<void>}
     */
    async #setupContainers() {
        this.#containers.main = document.getElementById(this.#config.containerId);
        if (!this.#containers.main) {
            throw new Error(`Container element '${this.#config.containerId}' not found`);
        }

        await this.#setupPageContainer();
    }

    /** ページコンテナを設定
     * @returns {Promise<void>}
     */
    async #setupPageContainer() {
        let pageContainer = this.#containers.main;

        if (this.#config.themeRenderer) {
            try {
                const result = await this.#config.themeRenderer(
                    this.#containers.main,
                    this.#core.resourceLoader,
                    this.#core.deviceDetector
                );

                pageContainer = result.pageContainer;
            } catch (error) {
                console.error('Theme rendering failed:', error);
                console.warn('Fallback to main container as page container');
            }
        }

        this.#containers.pageRef = { dom: pageContainer };
    }

    /** ルートを設定
     * @returns {Promise<void>}
     */
    async #configureRoutes() {
        this.#navigation.router = new Router();
        await this.#config.routeConfigurer(this.#navigation.router);
    }

    /** ナビゲーションを開始
     * @returns {Promise<void>}
     */
    async #startNavigation() {
        this.#navigation.navigator = new Navigator({
            pageContainerRef: this.#containers.pageRef,
            resourceLoader: this.#core.resourceLoader,
            deviceDetector: this.#core.deviceDetector,
            router: this.#navigation.router,
            baseTitle: this.#config.title
        });

        // アプリケーションリサイズハンドラとページリサイズハンドラを設定
        if (this.#config.themeRendererOnResize) {
            this.#core.deviceDetector.setAppResizeHandler(async () => {
                try {
                    const result = await this.#config.themeRendererOnResize(
                        this.#containers.main,
                        this.#core.resourceLoader,
                        this.#core.deviceDetector
                    );

                    // pageContainerRefの中身を書き換え
                    this.#containers.pageRef.dom = result.pageContainer;
                } catch (error) {
                    console.error('Theme renderer on resize failed:', error);
                }
            });
        }

        this.#core.deviceDetector.setPageResizeHandler(async () => {
            await this.#navigation.navigator.handlePageResize();
        });

        await this.#navigation.navigator.start();
    }

    /** 起動状態を取得
     * @returns {boolean} - 起動済みの場合true
     */
    get isStarted() {
        return this.#isStarted;
    }
}

/** リソースローダー設定
 * @typedef {Object} ResourceLoaderConfig
 * @property {string} baseUrl - ベースURL
 * @property {DeviceDetector} deviceDetector - デバイス判定クラス
 * @property {number} [timeout=30000] - タイムアウト時間（ミリ秒）
 * @property {Object<string, string>} [headers] - デフォルトヘッダー
 */

/** デバイスタイプを判定・監視するクラス */
export class DeviceDetector {
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

    /** 現在のデバイスタイプをキャッシュ
     * @type {boolean|null}
     */
    #cachedIsMobile = null;

    /** アプリケーションリサイズハンドラ
     * @type {Function|null}
     */
    #appResizeHandler = null;

    /** ページリサイズハンドラ
     * @type {Function|null}
     */
    #pageResizeHandler = null;

    constructor() {
        this.#updateCache();
    }

    /** モバイルデバイスかどうかを判定(縦向きかどうかで判定)
     * @returns {boolean} - モバイルデバイスならtrue、デスクトップならfalse
     */
    isMobile() {
        if (this.#cachedIsMobile === null) {
            this.#updateCache();
        }
        return this.#cachedIsMobile;
    }

    /** キャッシュを更新 */
    #updateCache() {
        this.#cachedIsMobile = window.innerWidth < window.innerHeight;
    }

    /** アプリケーションリサイズハンドラを設定
     * @param {Function} handler - アプリケーションリサイズハンドラ
     */
    setAppResizeHandler(handler) {
        this.#appResizeHandler = handler;
        this.#startWatchingIfNeeded();
    }

    /** ページリサイズハンドラを設定
     * @param {Function} handler - ページリサイズハンドラ
     */
    setPageResizeHandler(handler) {
        this.#pageResizeHandler = handler;
        this.#startWatchingIfNeeded();
    }

    /** 必要に応じてリサイズ監視を開始
     * @param {number} [debounceMs=250] - デバウンス時間
     */
    #startWatchingIfNeeded(debounceMs = 250) {
        if (!this.#isWatching && this.#hasAnyHandler()) {
            this.#startWatching(debounceMs);
        }
    }

    /** 必要がなければリサイズ監視を停止 */
    #stopWatchingIfNotNeeded() {
        if (this.#isWatching && !this.#hasAnyHandler()) {
            this.#stopWatching();
        }
    }

    /** ハンドラが設定されているかチェック
     * @returns {boolean} - ハンドラが設定されている場合true
     */
    #hasAnyHandler() {
        return this.#appResizeHandler !== null || this.#pageResizeHandler !== null;
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

            this.#debounceTimer = setTimeout(async () => {
                const oldIsMobile = this.#cachedIsMobile;
                this.#updateCache();
                const newIsMobile = this.#cachedIsMobile;

                // 縦横の向きが変わった場合のみハンドラを呼び出し
                if (oldIsMobile !== newIsMobile) {
                    // アプリケーションリサイズハンドラを実行
                    if (this.#appResizeHandler) {
                        try {
                            await this.#appResizeHandler();
                        } catch (error) {
                            console.error('App resize handler error:', error);
                        }
                    }

                    // ページリサイズハンドラを実行
                    if (this.#pageResizeHandler) {
                        try {
                            await this.#pageResizeHandler();
                        } catch (error) {
                            console.error('Page resize handler error:', error);
                        }
                    }
                }
            }, debounceMs);
        };

        window.addEventListener('resize', debouncedHandler);
        this.#debouncedHandler = debouncedHandler;
    }

    /** リサイズ監視を停止 */
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

    /** 全ての監視を解除 */
    dispose() {
        this.#appResizeHandler = null;
        this.#pageResizeHandler = null;
        this.#stopWatching();
    }
}

/** リソースの読み込みを管理するクラス */
export class ResourceLoader {
    /** 設定
     * @type {ResourceLoaderConfig}
     */
    #config;

    /** ベースURL
     * @type {string}
     */
    #baseUrl;

    /** デバイス判定クラス
     * @type {DeviceDetector}
     */
    #deviceDetector;

    /**
     * @param {ResourceLoaderConfig} config - 設定
     */
    constructor(config) {
        this.#config = {
            timeout: 30000,
            headers: {},
            ...config
        };
        this.#baseUrl = this.#normalizeUrl(config.baseUrl);
        this.#deviceDetector = config.deviceDetector;
    }

    /** URLを正規化
     * @param {string} url - 正規化するURL
     * @returns {string} - 正規化されたURL
     */
    #normalizeUrl(url) {
        return url?.replace(/\/+$/, '') || '';
    }

    /** URLを正規化してフルパスを生成
     * @param {string} resourcePath - リソースのパス(ベースを除く)
     * @returns {string} - 正規化されたフルURL
     */
    #buildResourceUrl(resourcePath) {
        const normalizedPath = resourcePath?.replace(/^\/+/, '') || '';
        return `${this.#baseUrl}/${normalizedPath}`;
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

        const response = await fetch(url, requestOptions);
        if (!response.ok) {
            throw new Error(`Failed to fetch resource: ${response.status} ${response.statusText}`);
        }
        return response;
    }

    /** リソースを取得して返す(バイナリ)
     * @param {string} resourcePath - リソースのパス(ベースを除く)
     * @param {Object} [options] - オプション
     * @returns {Promise<Blob>} - リソースのバイナリデータ
     */
    async fetchResource(resourcePath, options = {}) {
        try {
            const url = this.#buildResourceUrl(resourcePath);
            const response = await this.#performRequest(url, options);
            return await response.blob();
        } catch (error) {
            console.error('Error loading resource:', error);
            throw error;
        }
    }

    /** テンプレートを取得して返す(テキスト)
     * @param {string} templatePath - テンプレートのパス(ベースを除く)
     * @param {Object} [options] - オプション
     * @returns {Promise<string>} - テンプレートのテキストデータ
     */
    async fetchTemplate(templatePath, options = {}) {
        try {
            const blob = await this.fetchResource(templatePath, options);
            return await blob.text();
        } catch (error) {
            console.error('Error loading template:', error);
            throw error;
        }
    }

    /** HTMLを読み込んで指定要素に表示する
     * @param {HTMLElement} container - HTMLを表示するコンテナ要素(pageContainerRefの場合は中身のdom)
     * @param {string} htmlPath - HTMLのパス(ベースを除く)
     * @param {Object} [options] - オプション
     * @returns {Promise<void>}
     */
    async loadHtml(container, htmlPath, options = {}) {
        try {
            const html = await this.fetchTemplate(htmlPath, options);
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading HTML:', error);
            throw error;
        }
    }

    /** ページを読み込んで指定要素に表示する
     * @param {HTMLElement} container - HTMLを表示するコンテナ要素(pageContainerRefの場合は中身のdom)
     * @param {string|null} htmlPath - HTMLのパス(ベースを除く)
     * @param {string|null} cssPath - CSSのパス(ベースを除く)
     * @param {Object} [options] - オプション
     * @returns {Promise<void>}
     */
    async loadPage(container, htmlPath, cssPath, options = {}) {
        try {
            const [html, css] = await Promise.all([
                htmlPath ? this.fetchTemplate(htmlPath, options) : Promise.resolve(''),
                cssPath ? this.fetchTemplate(cssPath, options) : Promise.resolve('')
            ]);

            const style = css ? `<style>${css}</style>` : '';
            container.innerHTML = `${style}\n${html}`;
        } catch (error) {
            console.error('Error loading page:', error);
            throw error;
        }
    }

    /** デバイスに応じたパスを生成する
     * @param {string} path - ディレクトリパス(ベースを除く)
     * @param {string} ext - 拡張子
     * @returns {string} - デバイスに応じたパス
     */
    #buildDeviceSpecificPath(path, ext) {
        const deviceSuffix = this.#deviceDetector?.isMobile() ? 'mobile' : 'desktop';
        return `${path}/${deviceSuffix}.${ext}`;
    }

    /** デバイスに応じたリソースを取得
     * @param {string} path - リソースのディレクトリパス(ベースを除く)
     * @param {string} ext - 拡張子
     * @param {Object} [options] - オプション
     * @returns {Promise<Blob>} - リソースのバイナリデータ
     */
    async fetchResourceWithDevice(path, ext, options = {}) {
        return await this.fetchResource(this.#buildDeviceSpecificPath(path, ext), options);
    }

    /** デバイスに応じたテンプレートを取得
     * @param {string} path - テンプレートのディレクトリパス(ベースを除く)
     * @param {string} ext - 拡張子
     * @param {Object} [options] - オプション
     * @returns {Promise<string>} - テンプレートのテキストデータ
     */
    async fetchTemplateWithDevice(path, ext, options = {}) {
        return await this.fetchTemplate(this.#buildDeviceSpecificPath(path, ext), options);
    }

    /** デバイスに応じたHTMLを読み込んで指定要素に表示
     * @param {HTMLElement} container - HTMLを表示するコンテナ要素(pageContainerRefの場合は中身のdom)
     * @param {string} htmlPath - HTMLのパス(ベースを除く)
     * @param {Object} [options] - オプション
     * @returns {Promise<void>}
     */
    async loadHtmlWithDevice(container, htmlPath, options = {}) {
        return await this.loadHtml(container, this.#buildDeviceSpecificPath(htmlPath, 'html'), options);
    }

    /** デバイスに応じたページを読み込んで指定要素に表示
     * @param {HTMLElement} container - HTMLを表示するコンテナ要素(pageContainerRefの場合は中身のdom)
     * @param {string|null} htmlPath - HTMLのパス(ベースを除く)
     * @param {string|null} cssPath - CSSのパス(ベースを除く)
     * @param {Object} [options] - オプション
     * @returns {Promise<void>}
     */
    async loadPageWithDevice(container, htmlPath, cssPath, options = {}) {
        return await this.loadPage(
            container,
            htmlPath ? this.#buildDeviceSpecificPath(htmlPath, 'html') : null,
            cssPath ? this.#buildDeviceSpecificPath(cssPath, 'css') : null,
            options
        );
    }
}

/** ルート情報
 * @typedef {Object} RouteNode
 * @property {HandlerFactoryInterface|null} currentHandlerFactory - ハンドラファクトリ
 * @property {string|null} currentPhName - パラメータ名(:で始まるルートの場合)
 * @property {RouteNode|null} childWc - ワイルドカード子ルート(*)
 * @property {RouteNode|null} childPh - パラメータ子ルート(:param)
 * @property {Object<string, RouteNode>} children - 静的子ルート
 */

/** ルート管理・マッチングクラス
 * パスの分解も行う（N分木構造を使用）
 * 登録するのはHandlerFactoryでレンダリング時にHandlerを生成する
 * コロンを1階層のパラメータ、アスタリスクを複数階層のワイルドカードとして扱う
 */
export class Router {
    /** ルート構造体(N分木)
     * @type {RouteNode}
     */
    #routes = {
        currentHandlerFactory: null,
        currentPhName: null,
        childWc: null,
        childPh: null,
        children: {}
    };

    /** 特殊ルート構造体
     * @type {Map<string, SpecialHandlerFactoryInterface>}
     */
    #specialRoutes = new Map();

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
            currentHandlerFactory: null,
            currentPhName: null,
            childWc: null,
            childPh: null,
            children: {}
        };
    }

    /** ハンドラファクトリをルートに登録する
     * @param {string} path - 固定パス
     * @param {HandlerFactoryInterface} handlerFactory - ハンドラファクトリ
     * @returns {Router} - 自身のインスタンス
     */
    registerHandlerFactory(path, handlerFactory) {
        if (!handlerFactory) {
            throw new Error('Handler factory is required');
        }

        const normalizedPath = Router.normalizePath(path);
        let current = this.#routes;

        const segments = normalizedPath ? normalizedPath.split('/').filter(Boolean) : [];

        for (const segment of segments) {
            if (segment === '*') {
                if (!current.childWc) {
                    current.childWc = this.#createRouteNode();
                }
                current = current.childWc;
                break; // ワイルドカードは末端なのでここで終了
            } else if (segment.startsWith(':')) {
                if (!current.childPh) {
                    current.childPh = this.#createRouteNode();
                }
                current.childPh.currentPhName = segment.slice(1);
                current = current.childPh;
            } else {
                if (!current.children[segment]) {
                    current.children[segment] = this.#createRouteNode();
                }
                current = current.children[segment];
            }
        }
        current.currentHandlerFactory = handlerFactory;

        return this;
    }

    /** ハンドラファクトリ検索結果
     * @typedef {Object} RouteMatch
     * @property {HandlerFactoryInterface} handlerFactory - 見つかったハンドラファクトリ
     * @property {string} fixedPath - 固定パス(パラメータはコロン)
     * @property {Object<string, string>} params - パラメータ
     */

    /** パスに対応するハンドラファクトリを検索
     * @param {string} path - 検索するパス
     * @returns {RouteMatch|null} - ハンドラファクトリ検索結果
     */
    findHandlerFactory(path) {
        const normalizedPath = Router.normalizePath(path);
        const segments = normalizedPath ? normalizedPath.split('/').filter(Boolean) : [];

        const fixedPath = [];
        const params = {};
        let current = this.#routes;
        let wildcardCapture = null;

        for (const segment of segments) {
            if (wildcardCapture) {
                wildcardCapture.push(segment);
                continue;
            }

            if (current.children?.[segment]) {
                fixedPath.push(segment);
                current = current.children[segment];
            } else if (current.childPh) {
                fixedPath.push(`:${current.childPh.currentPhName}`);
                params[current.childPh.currentPhName] = segment;
                current = current.childPh;
            } else if (current.childWc) {
                fixedPath.push('*');
                wildcardCapture = [segment];
                current = current.childWc;
            } else {
                return null;
            }
        }

        if (!current.currentHandlerFactory) {
            return null;
        }

        if (wildcardCapture) {
            params['*'] = wildcardCapture.join('/');
        }

        return {
            handlerFactory: current.currentHandlerFactory,
            fixedPath: fixedPath.join('/'),
            params
        };
    }

    /** 特殊ルートを登録する
     * @param {string} name - 特殊ルート名
     * @param {SpecialHandlerFactoryInterface} handlerFactory - ハンドラファクトリ
     * @returns {Router} - 自身のインスタンス
     */
    registerSpecialRoute(name, handlerFactory) {
        if (!name || !handlerFactory) {
            throw new Error('Name and handler factory are required');
        }
        this.#specialRoutes.set(name, handlerFactory);
        return this;
    }

    /** パスに対応するハンドラファクトリを検索(特殊ルート)
     * @param {string} name - ルートの登録名
     * @returns {SpecialHandlerFactoryInterface|null} - ハンドラファクトリ
     */
    findSpecialHandlerFactory(name) {
        return this.#specialRoutes.get(name) || null;
    }
}

/** ハンドラインスタンスの生成を司るインターフェース */
export class HandlerFactoryInterface {
    /** ハンドラインスタンス生成に必要なエンティティ
     * @typedef {Object} HandlerFactoryEntities
     * @property {{dom: HTMLElement}} pageContainerRef - 各ページ表示用のコンテナ要素参照
     * @property {ResourceLoader} resourceLoader - リソース読み込みクラス
     * @property {DeviceDetector} deviceDetector - デバイス判定クラス
     * @property {Navigator} navigator - ナビゲータクラス
     */

    /** ハンドラインスタンスを生成するためのコンテキスト
     * @typedef {Object} HandlerFactoryContext
     * @property {string} nextRawPath - 次のパス
     * @property {string} nextFixedPath - 次の固定パス(パラメータはコロンで指定)
     * @property {Object<string, string>} nextParams - 次のパラメータ
     * @property {string|null} prevRawPath - 前のパス
     * @property {string|null} prevFixedPath - 前の固定パス(パラメータはコロンで指定)
     * @property {Object<string, string>|null} prevParams - 前のパラメータ
     */

    /** ハンドラインスタンスを生成
     * @param {HandlerFactoryEntities} entities - ハンドラインスタンス生成に必要なエンティティ
     * @param {HandlerFactoryContext} context - ハンドラインスタンス生成に必要なコンテキスト
     * @returns {Promise<HandlerInterface>} - ハンドラインスタンス
     */
    async create(entities, context) {
        throw new Error('create must be implemented');
    }
}

/** ハンドラインスタンスの生成を司るインターフェースの実装 */
export class HandlerFactoryInterfaceImpl extends HandlerFactoryInterface {
    constructor(createFn) {
        super();
        this.createFn = createFn;
    }

    async create(entities, context) {
        return await this.createFn(entities, context);
    }
}

/** 遷移先のパス情報
 * @typedef {Object} NextPathInfo
 * @property {string} raw - 次のパス
 * @property {string} fixed - 次の固定パス
 * @property {Object<string, string>} params - 次のパラメータ
 */

/** パスがスコープに一致するかに応じて発火するイベント
 * @typedef {Object} PathUnmatchIgniter
 * @property {string} pattern - パターン(コロンは1階層のパラメータ、アスタリスクは複数階層のワイルドカード)
 * @property {PathUnmatchCallback} onPathUnmatch - パス不一致時のクリーンアップ関数
 */

/** パスがパターンに一致しなくなったときに呼ばれるクリーンアップ関数
 * @callback PathUnmatchCallback
 * @returns {Promise<void>} - クリーンアップ完了時
 */

/** DOMクリア時に発火する関数
 * @callback DomClearCallback
 * @returns {Promise<void>} - DOMクリア完了時
 */

/** 部分遷移のための準備の戻り値型
 * @typedef {Object} PartialTransferPreparation
 * @property {Object|null} state - 前のハンドラから引き継ぐ状態
 * @property {PathUnmatchIgniter[]|null} pathUnmatchIgniters - パターンとパス不一致時のクリーンアップ関数
 * @property {DomClearCallback|null} domClearIgniter - DOMクリア時に呼ばれる関数(部分遷移時はnull)
 */

/** ハンドラのインターフェース */
export class HandlerInterface {
    /** DOM全書き換え遷移時用クリーンアップ
     * @returns {Promise<void>} - クリーンアップ完了時
     */
    async cleanupFull() { }

    /** タイトルを取得
     * @returns {Promise<string|null>} - タイトル
     */
    async getTitle() {
        return null;
    }

    /** DOM全書き換え遷移時用のHTMLのパスを取得
     * @returns {Promise<string|null>} - HTMLのパス
     */
    async getHtmlResourcePath() {
        return null;
    }

    /** DOM全書き換え遷移時用レンダリング
     * @returns {Promise<void>}
     */
    async renderingFull() {
        throw new Error('renderingFull must be implemented');
    }

    /** 次のパスへ部分遷移可能か
     * @param {NextPathInfo} nextPathInfo - 次のパス情報
     * @returns {Promise<boolean>} - 部分遷移可能な場合はtrue
     */
    async canPartialTransferToNextPath(nextPathInfo) {
        return false;
    }

    /** 前のパスから部分遷移可能か
     * 前のパスの情報はFactoryのcreate時に渡される
     * @returns {Promise<boolean>} - 部分受け取り可能な場合はtrue
     */
    async canPartialReceiveFromPrevPath() {
        return false;
    }

    /** 部分遷移のための準備
     * @param {NextPathInfo} nextPathInfo - 次のパス情報
     * @returns {Promise<PartialTransferPreparation>}
     */
    async preparePartialTransfer(nextPathInfo) {
        return { state: null, pathUnmatchIgniters: null, domClearIgniter: null };
    }

    /** 部分遷移時用レンダリング
     * @param {Object} state - 前のハンドラから引き継ぐ状態
     * @returns {Promise<void>} - レンダリング完了時
     */
    async renderingPartial(state) {
        // canPartialReceiveFromPrevPathがfalseなのでオーバーライドされない限り呼ばれない
    }

    /** ページ内遷移可能か(パラメータのみの変更時)
     * @param {Object<string, string>} nextParams - 次のパラメータ
     * @returns {Promise<boolean>} - ページ内遷移可能な場合はtrue
     */
    async canInpageTransferTo(nextParams) {
        return false;
    }

    /** ページ内遷移時用レンダリング
     * @param {Object<string, string>} nextParams - 次のパラメータ
     * @returns {Promise<void>} - レンダリング完了時
     */
    async renderingInpage(nextParams) {
        // canInpageTransferToがfalseなのでオーバーライドされない限り呼ばれない
    }

    /** デバイス向きの変更ハンドラ (オプション)
     */
    async onDeviceOrientationChange() {
        // オプションメソッド - オーバーライドは任意
    }
}

/** 特殊ハンドラインスタンスの生成を司るインターフェース */
export class SpecialHandlerFactoryInterface {
    /** ハンドラインスタンスを生成
     * @param {HandlerFactoryEntities} entities - ハンドラインスタンス生成に必要なエンティティ
     * @returns {Promise<SpecialHandlerInterface>} - 生成された特殊ハンドラ
     */
    async create(entities) {
        throw new Error('create must be implemented');
    }
}

/** 特殊ハンドラインスタンスの生成を司るインターフェースの実装 */
export class SpecialHandlerFactoryInterfaceImpl extends SpecialHandlerFactoryInterface {
    constructor(createFn) {
        super();
        this.createFn = createFn;
    }
    async create(entities) {
        return await this.createFn(entities);
    }
}

/** 特殊ハンドラインスタンスのインターフェース */
export class SpecialHandlerInterface {
    /** DOM全書き換え遷移時用クリーンアップ
     * @returns {Promise<void>} - クリーンアップ完了時
     */
    async cleanupFull() { }

    /** タイトルを取得
     * @returns {Promise<string|null>} - タイトル
     */
    async getTitle() {
        return null;
    }

    /** DOM全書き換え遷移時用のHTMLのパスを取得
     * @returns {Promise<string|null>} - HTMLのパス
     */
    async getHtmlResourcePath() {
        return null;
    }

    /** DOM全書き換え遷移時用レンダリング
     * @returns {Promise<void>}
     */
    async renderingFull() {
        throw new Error('renderingFull must be implemented');
    }

    /** デバイス向きの変更ハンドラ (オプション)
     */
    async onDeviceOrientationChange() {
        // オプションメソッド - オーバーライドは任意
    }
}

/** 前のページ情報
 * @typedef {Object} PrevPageInfo
 * @property {string} rawPath - 前のパス
 * @property {string} fixedPath - 前の固定パス
 * @property {Object<string, string>} params - 前のパラメータ
 */

/** ナビゲーションを統括するクラス */
export class Navigator {
    /** コンテナ要素
     * @type {Object}
     */
    #containers = {
        /** @type {{dom: HTMLElement}} */
        pageRef: null
    };

    /** コア機能
     * @type {Object}
     */
    #core = {
        /** @type {ResourceLoader} */
        resourceLoader: null,
        /** @type {DeviceDetector} */
        deviceDetector: null,
        /** @type {Router} */
        router: null
    };

    /** 状態
     * @type {Object}
     */
    #state = {
        /** @type {string|null} */
        baseTitle: null,
        /** @type {PrevPageInfo|null} */
        prevInfo: null,
        /** @type {HandlerInterface|SpecialHandlerInterface|null} */
        prevHandler: null
    };

    /** イベント管理
     * @type {Object}
     */
    #events = {
        /** @type {PathUnmatchIgniter[]} */
        pathUnmatchIgniters: [],
        /** @type {DomClearCallback[]} */
        domClearIgniters: []
    };

    /**
     * @param {Object} config - 設定オブジェクト
     * @param {{dom: HTMLElement}} config.pageContainerRef - 各ページ用のコンテナ要素参照
     * @param {ResourceLoader} config.resourceLoader - リソース読み込みクラス
     * @param {DeviceDetector} config.deviceDetector - デバイス判定クラス
     * @param {Router} config.router - ルータクラス
     * @param {string|null} config.baseTitle - アプリケーションのベースタイトル
     */
    constructor(config) {
        if (!config?.pageContainerRef || !config?.resourceLoader || !config?.deviceDetector || !config?.router) {
            throw new Error('Required configuration is missing');
        }

        this.#containers.pageRef = config.pageContainerRef;
        this.#core.resourceLoader = config.resourceLoader;
        this.#core.deviceDetector = config.deviceDetector;
        this.#core.router = config.router;
        this.#state.baseTitle = config.baseTitle || null;
    }

    /** ページリサイズハンドラ
     */
    async handlePageResize() {
        // 現在のハンドラが向き変更に対応している場合は呼び出し
        if (this.#state.prevHandler?.onDeviceOrientationChange) {
            try {
                await this.#state.prevHandler.onDeviceOrientationChange();
            } catch (error) {
                console.error('Device orientation change handler error:', error);
            }
        }
    }

    /** ナビゲーションを開始
     * @returns {Promise<void>} - ナビゲーション開始完了時
     */
    async start() {
        window.addEventListener('popstate', async () => {
            const path = window.location.pathname;
            await this.#performTransitionWithErrorHandling(path);
        });
        await this.navigate(window.location.pathname);
    }

    /** 指定されたパスに遷移
     * @param {string} path - 遷移先のパス
     * @returns {Promise<void>} - 遷移完了時
     */
    async navigate(path) {
        history.pushState(null, '', path);
        await this.#performTransitionWithErrorHandling(path);
    }

    /** 特殊ページに遷移
     * @param {string} target - 遷移先の特殊ページ名
     * @returns {Promise<void>} - 遷移完了時
     */
    async navigateSpecial(target) {
        await this.#performSpecialTransitionWithErrorHandling(target);
    }

    /** エラーハンドリング付きでパス遷移を行う
     * @param {string} nextPath - 遷移先のパス
     * @returns {Promise<void>} - 遷移完了時
     */
    async #performTransitionWithErrorHandling(nextPath) {
        try {
            await this.#performTransition(nextPath);
        } catch (error) {
            console.error(`Error occurred during transition: ${error}`);
            await this.#performSpecialTransitionWithErrorHandling('error');
        }
    }

    /** 指定されたパスに遷移
     * @param {string} nextPath - 遷移先のパス
     * @returns {Promise<void>} - 遷移完了時
     */
    async #performTransition(nextPath) {
        const normalizedPath = Router.normalizePath(nextPath);
        const routeMatch = this.#core.router?.findHandlerFactory(normalizedPath);

        if (!routeMatch) {
            await this.#performSpecialTransition('notfound');
            return;
        }

        const nextInfo = {
            rawPath: normalizedPath,
            fixedPath: routeMatch.fixedPath || '',
            params: routeMatch.params || {}
        };

        await this.#executePathUnmatchIgniters(nextInfo.rawPath);

        // 遷移方式を順番に試行
        const transitionResult = await this.#tryTransitions(nextInfo, routeMatch.handlerFactory);

        if (!transitionResult.success) {
            throw new Error('All transition methods failed');
        }
    }

    /** 複数の遷移方式を順番に試行
     * @param {Object} nextInfo - 次のページ情報
     * @param {HandlerFactoryInterface} handlerFactory - ハンドラファクトリ
     * @returns {Promise<{success: boolean}>} - 遷移結果
     */
    async #tryTransitions(nextInfo, handlerFactory) {
        let transitioned = false;
        let nextHandler = null;

        // 1. ページ内遷移を試行
        try {
            transitioned = await this.#performInpageTransition(nextInfo);
            if (transitioned) {
                return { success: true };
            }
        } catch (error) {
            console.warn('Inpage transition failed:', error);
        }

        // 2. ハンドラを生成
        nextHandler = await handlerFactory?.create(
            {
                pageContainerRef: this.#containers.pageRef,
                resourceLoader: this.#core.resourceLoader,
                deviceDetector: this.#core.deviceDetector,
                navigator: this
            },
            {
                nextRawPath: nextInfo.rawPath,
                nextFixedPath: nextInfo.fixedPath,
                nextParams: nextInfo.params,
                prevRawPath: this.#state.prevInfo?.rawPath || null,
                prevFixedPath: this.#state.prevInfo?.fixedPath || null,
                prevParams: this.#state.prevInfo?.params || null
            }
        );

        // 3. 部分遷移を試行
        try {
            transitioned = await this.#performPartialTransition(nextHandler, nextInfo);
            if (transitioned) {
                return { success: true };
            }
        } catch (error) {
            console.warn('Partial transition failed:', error);
        }

        // 4. 全体遷移
        try {
            await this.#performFullTransition(nextHandler, nextInfo);
            return { success: true };
        } catch (error) {
            console.error('Full transition failed:', error);
            throw error;
        }
    }

    /** パス監視イベントを実行
     * @param {string} nextPath - 次のパス
     * @returns {Promise<void>} - 処理完了時
     */
    async #executePathUnmatchIgniters(nextPath) {
        const nextPathSegments = Router.normalizePath(nextPath).split('/').filter(Boolean);
        const remainingIgniters = [];

        for (const igniter of this.#events.pathUnmatchIgniters) {
            const patternSegments = Router.normalizePath(igniter.pattern).split('/').filter(Boolean);

            if (Navigator.#isPatternMatching(patternSegments, nextPathSegments)) {
                remainingIgniters.push(igniter);
            } else {
                try {
                    await igniter.onPathUnmatch?.();
                } catch (error) {
                    console.error('Path unmatch igniter error:', error);
                }
            }
        }

        this.#events.pathUnmatchIgniters = remainingIgniters;
    }

    /** 全てのパス監視イベントを実行
     * @returns {Promise<void>} - 処理完了時
     */
    async #executeAllPathUnmatchIgniters() {
        for (const igniter of this.#events.pathUnmatchIgniters) {
            try {
                await igniter.onPathUnmatch?.();
            } catch (error) {
                console.error('Path unmatch igniter error:', error);
            }
        }
        this.#events.pathUnmatchIgniters = [];
    }

    /** 全てのDOMクリアイベントを実行
     * @returns {Promise<void>} - 処理完了時
     */
    async #executeAllDomClearIgniters() {
        for (const igniter of this.#events.domClearIgniters) {
            try {
                await igniter();
            } catch (error) {
                console.error('DOM clear igniter error:', error);
            }
        }
        this.#events.domClearIgniters = [];
    }

    /** パターンとパスの一致判定
     * @param {string[]} pattern - パターン(コロンは1階層のパラメータ、アスタリスクは複数階層のワイルドカード)
     * @param {string[]} path - パス
     * @returns {boolean} - 一致するかどうか
     */
    static #isPatternMatching(pattern, path) {
        if (pattern.length === 0 && path.length === 0) {
            // 両方とも空の場合は一致
            return true;
        }

        if (pattern.length < path.length && pattern.at(-1) !== '*') {
            // パターンの方が短く末端がワイルドカードでないため不一致
            return false;
        }

        if (pattern.length > path.length) {
            // パターンの方が長いため不一致
            return false;
        }

        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] === '*') {
                return true; // ワイルドカード出現時点で一致確定
            }
            if (pattern[i].startsWith(':')) {
                continue; // パラメータなので一致
            }
            if (pattern[i] !== path[i]) {
                return false; // 固定値との不一致
            }
        }
        return true;
    }

    /** ページ内遷移を行う
     * @param {Object} nextInfo - 次のページ情報
     * @returns {Promise<boolean>} - 遷移できた場合はtrue、できなかった場合はfalse
     */
    async #performInpageTransition(nextInfo) {
        if (!this.#state.prevInfo ||
            this.#state.prevInfo.fixedPath !== nextInfo.fixedPath ||
            !this.#state.prevHandler?.canInpageTransferTo) {
            return false;
        }

        const canTransfer = await this.#state.prevHandler.canInpageTransferTo(nextInfo.params);
        if (!canTransfer) {
            return false;
        }

        await this.#state.prevHandler.renderingInpage(nextInfo.params);
        this.#state.prevInfo = { ...nextInfo };
        return true;
    }

    /** 部分遷移を行う
     * @param {HandlerInterface} nextHandler - 次のハンドラインスタンス
     * @param {Object} nextInfo - 次のページ情報
     * @returns {Promise<boolean>} - 遷移できた場合はtrue、できなかった場合はfalse
     */
    async #performPartialTransition(nextHandler, nextInfo) {
        if (!this.#state.prevInfo ||
            !this.#state.prevHandler?.canPartialTransferToNextPath ||
            !nextHandler?.canPartialReceiveFromPrevPath) {
            return false;
        }

        const [canTransfer, canReceive] = await Promise.all([
            this.#state.prevHandler.canPartialTransferToNextPath(nextInfo),
            nextHandler.canPartialReceiveFromPrevPath()
        ]);

        if (!canTransfer || !canReceive) {
            return false;
        }

        const preparation = await this.#state.prevHandler.preparePartialTransfer(nextInfo);

        if (preparation.pathUnmatchIgniters) {
            this.#events.pathUnmatchIgniters.push(...preparation.pathUnmatchIgniters);
        }
        if (preparation.domClearIgniter) {
            this.#events.domClearIgniters.push(preparation.domClearIgniter);
        }

        await nextHandler.renderingPartial(preparation.state);

        this.#state.prevInfo = { ...nextInfo };
        this.#state.prevHandler = nextHandler;
        return true;
    }

    /** 全体遷移を行う
     * @param {HandlerInterface|SpecialHandlerInterface} nextHandler - 次のハンドラインスタンス
     * @param {Object|null} nextInfo - 次のページ情報
     * @returns {Promise<void>} - 遷移完了時
     */
    async #performFullTransition(nextHandler, nextInfo) {
        // クリーンアップ処理
        await Promise.all([
            this.#executeAllPathUnmatchIgniters(),
            this.#executeAllDomClearIgniters()
        ]);

        if (this.#state.prevHandler?.cleanupFull) {
            try {
                await this.#state.prevHandler.cleanupFull();
            } catch (error) {
                console.error('Previous handler cleanup failed:', error);
            }
        }

        // タイトル設定
        const title = await nextHandler?.getTitle?.();
        this.#updateDocumentTitle(title);

        // HTML読み込み
        const htmlResourcePath = await nextHandler?.getHtmlResourcePath?.();
        if (htmlResourcePath) {
            await this.#core.resourceLoader.loadHtml(this.#containers.pageRef.dom, htmlResourcePath);
        } else {
            this.#containers.pageRef.dom.innerHTML = '';
        }

        // レンダリング
        await nextHandler?.renderingFull?.();

        // 状態更新
        this.#state.prevInfo = nextInfo ? { ...nextInfo } : null;
        this.#state.prevHandler = nextHandler;
    }

    /** ドキュメントタイトルを更新
     * @param {string|null} title - ページタイトル
     */
    #updateDocumentTitle(title) {
        const parts = [];
        if (title) parts.push(title);
        if (this.#state.baseTitle) parts.push(this.#state.baseTitle);
        document.title = parts.join(' - ');
    }

    /** エラーハンドリング付きで特殊ページに遷移
     * @param {string} pageName - 特殊ページ名
     * @returns {Promise<void>} - 遷移完了時
     */
    async #performSpecialTransitionWithErrorHandling(pageName) {
        try {
            await this.#performSpecialTransition(pageName);
        } catch (error) {
            if (pageName !== 'error') {
                console.error('Special page transition failed:', error);
                await this.#performSpecialTransition('error');
            } else {
                throw error;
            }
        }
    }

    /** 指定された特殊ページに遷移
     * 特殊ページは相互に一切の状態を共有しない
     * @param {string} pageName - ページ名
     * @returns {Promise<void>} - 遷移完了時
     */
    async #performSpecialTransition(pageName) {
        const specialHandlerFactory = this.#core.router?.findSpecialHandlerFactory(pageName);

        if (!specialHandlerFactory) {
            const errorMessage = `Special page "${pageName}" not found`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }

        const specialHandler = await specialHandlerFactory?.create({
            pageContainerRef: this.#containers.pageRef,
            resourceLoader: this.#core.resourceLoader,
            deviceDetector: this.#core.deviceDetector,
            navigator: this
        });

        await this.#performFullTransition(specialHandler, null);
    }
}
