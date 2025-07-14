/** ベーステーマ描画関数
 * @callback BaseThemeRenderer
 * @param {HTMLElement} appContainer - SPA全体のコンテナ要素
 * @param {AssetLoader} assetLoader - コンテンツ読み込みクラスのインスタンス
 * @param {DeviceDetector} deviceDetector - デバイス判定クラスのインスタンス
 * @returns {Promise<{ pageContainer: HTMLElement }>} - 各ページ用のコンテナ要素
 */

/** ルート登録関数
 * @callback RouteRegisterer
 * @param {Router} router - ルート登録対象のRouterインスタンス
 * @returns {Promise<void>}
 */

/** SPAアプリケーション全体を司るクラス */
export class SpaApp {
    /** アセット置き場のベースURL
     * @type {string}
     */
    #assetsBaseUrl;

    /** SPA全体のコンテナ要素のID
     * @type {string}
     */
    #appContainerId;

    /** アプリケーションのベースタイトル
     * @type {string|null}
     */
    #baseTitle;

    /** ルート登録関数
     * @type {RouteRegisterer}
     */
    #routeRegisterer;

    /** ベーステーマ描画関数
     * @type {BaseThemeRenderer|null}
     */
    #baseThemeRenderer;

    /** デバイス判定クラスのインスタンス
     * @type {DeviceDetector|null}
     */
    #deviceDetector = null;

    /** コンテンツ読み込みクラスのインスタンス
     * @type {AssetLoader|null}
     */
    #assetLoader = null;

    /** SPA全体のコンテナ要素
     * @type {HTMLElement|null}
     */
    #appContainer = null;

    /** 各ページ用のコンテナ要素
     * @type {HTMLElement|null}
     */
    #pageContainer = null;

    /** ルータクラスのインスタンス
     * @type {Router|null}
     */
    #router = null;

    /** ナビゲータクラスのインスタンス
     * @type {Navigator|null}
     */
    #navigator = null;

    /**
     * @param {Object} options
     * @param {string} options.assetsBaseUrl - アセット置き場のベースURL
     * @param {string} options.appContainerId - SPAコンテナ要素のID
     * @param {string|null} [options.baseTitle] - アプリケーションのベースタイトル
     * @param {BaseThemeRenderer|null} [options.baseThemeRenderer] - ベーステーマ描画関数
     * @param {RouteRegisterer} options.routeRegisterer - ルート登録関数
     */
    constructor(options) {
        if (!options?.assetsBaseUrl || !options?.appContainerId || !options?.routeRegisterer) {
            throw new Error('Required options are missing');
        }

        this.#assetsBaseUrl = options.assetsBaseUrl;
        this.#appContainerId = options.appContainerId;
        this.#baseTitle = options.baseTitle || null;
        this.#baseThemeRenderer = options.baseThemeRenderer || null;
        this.#routeRegisterer = options.routeRegisterer;
    }

    /** アプリケーションを初期化し描画開始
     * @returns {Promise<void>} - 初期化完了時
     */
    async start() {
        try {
            // 基本コンポーネントの初期化
            this.#deviceDetector = new DeviceDetector();
            this.#assetLoader = new AssetLoader(this.#assetsBaseUrl, this.#deviceDetector);

            // DOMコンテナの取得
            this.#appContainer = document.getElementById(this.#appContainerId);
            if (!this.#appContainer) {
                throw new Error(`Element with ID '${this.#appContainerId}' not found`);
            }

            // ページコンテナの設定
            await this.#setupPageContainer();

            // ルータの設定
            this.#router = new Router();
            await this.#routeRegisterer(this.#router);

            // ナビゲータの初期化と開始
            this.#navigator = new Navigator({
                pageContainer: this.#pageContainer,
                assetLoader: this.#assetLoader,
                deviceDetector: this.#deviceDetector,
                router: this.#router,
                baseTitle: this.#baseTitle
            });

            await this.#navigator.start();
        } catch (error) {
            console.error('SPA application startup failed:', error);
            throw error;
        }
    }

    /** ページコンテナを設定
     * @returns {Promise<void>}
     */
    async #setupPageContainer() {
        this.#pageContainer = this.#appContainer;

        if (this.#baseThemeRenderer) {
            try {
                const result = await this.#baseThemeRenderer(
                    this.#appContainer,
                    this.#assetLoader,
                    this.#deviceDetector
                );

                if (result?.pageContainer && result.pageContainer instanceof HTMLElement) {
                    this.#pageContainer = result.pageContainer;
                } else {
                    console.warn('Base theme renderer did not return valid pageContainer, using appContainer');
                }
            } catch (error) {
                console.error('Base theme rendering failed:', error);
                console.warn('Fallback to appContainer as pageContainer');
            }
        }
    }
}

/** デバイスタイプを判定するクラス */
export class DeviceDetector {
    /** モバイルデバイスかどうかを判定(画面の縦横比で判定)
     * @returns {boolean} - モバイルデバイスならtrue、PCならfalse
     */
    isMobile() {
        return window.innerWidth < window.innerHeight;
    }
}

/** コンテンツの読み込みを司るクラス */
export class AssetLoader {
    /** アセット置き場のベースURL
     * @type {string}
     */
    #assetsBaseUrl;

    /** デバイス判定クラスのインスタンス
     * @type {DeviceDetector}
     */
    #deviceDetector;

    /**
     * @param {string} assetsBaseUrl - アセット置き場のベースURL
     * @param {DeviceDetector} deviceDetector - デバイス判定クラスのインスタンス
     */
    constructor(assetsBaseUrl, deviceDetector) {
        this.#assetsBaseUrl = assetsBaseUrl || '';
        this.#deviceDetector = deviceDetector;
    }

    /** URLを正規化してフルパスを生成
     * @param {string} assetPath - アセットのパス(ベースを除く)
     * @returns {string} - 正規化されたフルURL
     */
    #buildAssetUrl(assetPath) {
        const baseUrl = this.#assetsBaseUrl.replace(/\/+$/, '');
        const normalizedPath = assetPath.replace(/^\/+/, '');
        return `${baseUrl}/${normalizedPath}`;
    }

    /** アセットを取得して返す(バイナリ)
     * @param {string} assetPath - アセットのパス(ベースを除く)
     * @returns {Promise<Blob>} - アセットのバイナリデータ
     */
    async fetchAsset(assetPath) {
        try {
            const url = this.#buildAssetUrl(assetPath);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch asset: ${response.status} ${response.statusText}`);
            }
            return await response.blob();
        } catch (error) {
            console.error('Error loading asset:', error);
            throw error;
        }
    }

    /** テンプレートを取得して返す(テキスト)
     * @param {string} templatePath - テンプレートのパス(ベースを除く)
     * @returns {Promise<string>} - テンプレートのテキストデータ
     */
    async fetchTemplate(templatePath) {
        try {
            const blob = await this.fetchAsset(templatePath);
            return await blob.text();
        } catch (error) {
            console.error('Error loading template:', error);
            throw error;
        }
    }

    /** HTMLを読み込んで指定要素に表示する
     * @param {HTMLElement} container - HTMLを表示するコンテナ要素
     * @param {string} htmlPath - HTMLのパス(ベースを除く)
     * @returns {Promise<void>}
     */
    async loadHtml(container, htmlPath) {
        if (!container) {
            throw new Error('Container element is required');
        }
        try {
            const html = await this.fetchTemplate(htmlPath);
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading HTML:', error);
            throw error;
        }
    }

    /** ページを読み込んで指定要素に表示する
     * @param {HTMLElement} container - HTMLを表示するコンテナ要素
     * @param {string|null} htmlPath - HTMLのパス(ベースを除く)
     * @param {string|null} cssPath - CSSのパス(ベースを除く)
     * @returns {Promise<void>}
     */
    async loadPage(container, htmlPath, cssPath) {
        if (!container) {
            throw new Error('Container element is required');
        }
        try {
            const [html, css] = await Promise.all([
                htmlPath ? this.fetchTemplate(htmlPath) : Promise.resolve(''),
                cssPath ? this.fetchTemplate(cssPath) : Promise.resolve('')
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
        const deviceSuffix = this.#deviceDetector.isMobile() ? 'mobi' : 'pc';
        return `${path}/${deviceSuffix}.${ext}`;
    }

    /** デバイスに応じたアセットを取得
     * @param {string} path - アセットのディレクトリパス(ベースを除く)
     * @param {string} ext - 拡張子
     * @returns {Promise<Blob>} - アセットのバイナリデータ
     */
    async fetchAssetWithDevice(path, ext) {
        return await this.fetchAsset(this.#buildDeviceSpecificPath(path, ext));
    }

    /** デバイスに応じたテンプレートを取得
     * @param {string} path - テンプレートのディレクトリパス(ベースを除く)
     * @param {string} ext - 拡張子
     * @returns {Promise<string>} - テンプレートのテキストデータ
     */
    async fetchTemplateWithDevice(path, ext) {
        return await this.fetchTemplate(this.#buildDeviceSpecificPath(path, ext));
    }

    /** デバイスに応じたHTMLを読み込んで指定要素に表示
     * @param {HTMLElement} container - HTMLを表示するコンテナ要素
     * @param {string} htmlPath - HTMLのパス(ベースを除く)
     * @returns {Promise<void>}
     */
    async loadHtmlWithDevice(container, htmlPath) {
        return await this.loadHtml(container, this.#buildDeviceSpecificPath(htmlPath, 'html'));
    }

    /** デバイスに応じたページを読み込んで指定要素に表示
     * @param {HTMLElement} container - HTMLを表示するコンテナ要素
     * @param {string|null} htmlPath - HTMLのパス(ベースを除く)
     * @param {string|null} cssPath - CSSのパス(ベースを除く)
     * @returns {Promise<void>}
     */
    async loadPageWithDevice(container, htmlPath, cssPath) {
        return await this.loadPage(
            container,
            htmlPath ? this.#buildDeviceSpecificPath(htmlPath, 'html') : null,
            cssPath ? this.#buildDeviceSpecificPath(cssPath, 'css') : null
        );
    }
}

/** ルート情報
 * @typedef {Object} RouteNode
 * @property {HandlerFactoryInterface|null} handlerFactory - ハンドラファクトリ
 * @property {string|null} paramName - パラメータ名(:で始まるルートの場合)
 * @property {RouteNode|null} wildcardChild - ワイルドカード子ルート(*)
 * @property {RouteNode|null} paramChild - パラメータ子ルート(:param)
 * @property {Object<string, RouteNode>} staticChildren - 静的子ルート
 */

/** ルーティングのみを行う純粋なルータクラス
 * パスの分解も行う
 * 登録するのはHandlerFactoryでレンダリング時にHandlerを生成する
 * コロンを1階層のパラメータ、アスタリスクを複数階層のワイルドカードとして扱う
 */
export class Router {
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
            handlerFactory: null,
            paramName: null,
            wildcardChild: null,
            paramChild: null,
            staticChildren: {}
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
                if (!current.wildcardChild) {
                    current.wildcardChild = this.#createRouteNode();
                }
                current = current.wildcardChild;
                break; // ワイルドカードは末端なのでここで終了
            } else if (segment.startsWith(':')) {
                if (!current.paramChild) {
                    current.paramChild = this.#createRouteNode();
                }
                current.paramChild.paramName = segment.slice(1);
                current = current.paramChild;
            } else {
                if (!current.staticChildren[segment]) {
                    current.staticChildren[segment] = this.#createRouteNode();
                }
                current = current.staticChildren[segment];
            }
        }
        current.handlerFactory = handlerFactory;

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
                return null;
            }
        }

        if (!current.handlerFactory) {
            return null;
        }

        if (wildcardCapture) {
            params['*'] = wildcardCapture.join('/');
        }

        return {
            handlerFactory: current.handlerFactory,
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
    /** 色々な操作を司るエンティティを集めた型
     * @typedef {Object} HandlerFactoryEntities
     * @property {HTMLElement} pageContainer - 各ページ表示用のコンテナ要素
     * @property {AssetLoader} assetLoader - コンテンツ読み込みクラスのインスタンス
     * @property {DeviceDetector} deviceDetector - デバイス判定クラスのインスタンス
     * @property {Navigator} navigator - ナビゲータクラスのインスタンス
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
    async getHtmlAssetPath() {
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
    async getHtmlAssetPath() {
        return null;
    }

    /** DOM全書き換え遷移時用レンダリング
     * @returns {Promise<void>}
     */
    async renderingFull() {
        throw new Error('renderingFull must be implemented');
    }
}
/** 前のページ情報
 * @typedef {Object} PrevPageInfo
 * @property {string} rawPath - 前のパス
 * @property {string} fixedPath - 前の固定パス
 * @property {Object<string, string>} params - 前のパラメータ
 */

/** ナビゲーションを司るクラス */
export class Navigator {
    /** 各ページ用のコンテナ要素
     * @type {HTMLElement}
     */
    #pageContainer;

    /** コンテンツ読み込みクラスのインスタンス
     * @type {AssetLoader}
     */
    #assetLoader;

    /** デバイス判定クラスのインスタンス
     * @type {DeviceDetector}
     */
    #deviceDetector;

    /** ルータクラスのインスタンス
     * @type {Router}
     */
    #router;

    /** アプリケーションのベースタイトル
     * @type {string|null}
     */
    #baseTitle;

    /** 前の情報
     * @type {PrevPageInfo|null}
     */
    #prevInfo = null;

    /** 前のハンドラ
     * @type {HandlerInterface|SpecialHandlerInterface|null}
     */
    #prevHandler = null;

    /** パスがスコープから抜けたときに発火するイベントのリスト
     * @type {PathUnmatchIgniter[]}
     */
    #pathUnmatchIgniters = [];

    /** DOMクリア時に発火するイベントのリスト
     * @type {DomClearCallback[]}
     */
    #domClearIgniters = [];

    /**
     * @param {Object} options - オプションオブジェクト
     * @param {HTMLElement} options.pageContainer - 各ページ用のコンテナ要素
     * @param {AssetLoader} options.assetLoader - コンテンツ読み込みクラスのインスタンス
     * @param {DeviceDetector} options.deviceDetector - デバイス判定クラス
     * @param {Router} options.router - ルータクラスのインスタンス
     * @param {string|null} options.baseTitle - アプリケーションのベースタイトル
     */
    constructor(options) {
        this.#pageContainer = options.pageContainer;
        this.#assetLoader = options.assetLoader;
        this.#deviceDetector = options.deviceDetector;
        this.#router = options.router;
        this.#baseTitle = options.baseTitle;
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
        const routeMatch = this.#router.findHandlerFactory(normalizedPath);

        if (!routeMatch) {
            await this.#performSpecialTransition('notfound');
            return;
        }

        const nextInfo = {
            rawPath: normalizedPath,
            fixedPath: routeMatch.fixedPath,
            params: routeMatch.params
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
        nextHandler = await handlerFactory.create(
            {
                pageContainer: this.#pageContainer,
                assetLoader: this.#assetLoader,
                deviceDetector: this.#deviceDetector,
                navigator: this
            },
            {
                nextRawPath: nextInfo.rawPath,
                nextFixedPath: nextInfo.fixedPath,
                nextParams: nextInfo.params,
                prevRawPath: this.#prevInfo?.rawPath || null,
                prevFixedPath: this.#prevInfo?.fixedPath || null,
                prevParams: this.#prevInfo?.params || null
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

        for (const igniter of this.#pathUnmatchIgniters) {
            const patternSegments = Router.normalizePath(igniter.pattern).split('/').filter(Boolean);

            if (Navigator.#isPatternMatching(patternSegments, nextPathSegments)) {
                remainingIgniters.push(igniter);
            } else {
                try {
                    await igniter.onPathUnmatch();
                } catch (error) {
                    console.error('Path unmatch igniter error:', error);
                }
            }
        }

        this.#pathUnmatchIgniters = remainingIgniters;
    }

    /** 全てのパス監視イベントを実行
     * @returns {Promise<void>} - 処理完了時
     */
    async #executeAllPathUnmatchIgniters() {
        for (const igniter of this.#pathUnmatchIgniters) {
            try {
                await igniter.onPathUnmatch();
            } catch (error) {
                console.error('Path unmatch igniter error:', error);
            }
        }
        this.#pathUnmatchIgniters = [];
    }

    /** 全てのDOMクリアイベントを実行
     * @returns {Promise<void>} - 処理完了時
     */
    async #executeAllDomClearIgniters() {
        for (const igniter of this.#domClearIgniters) {
            try {
                await igniter();
            } catch (error) {
                console.error('DOM clear igniter error:', error);
            }
        }
        this.#domClearIgniters = [];
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
        if (!this.#prevInfo ||
            this.#prevInfo.fixedPath !== nextInfo.fixedPath ||
            !this.#prevHandler?.canInpageTransferTo) {
            return false;
        }

        const canTransfer = await this.#prevHandler.canInpageTransferTo(nextInfo.params);
        if (!canTransfer) {
            return false;
        }

        await this.#prevHandler.renderingInpage(nextInfo.params);
        this.#prevInfo = { ...nextInfo };
        return true;
    }

    /** 部分遷移を行う
     * @param {HandlerInterface} nextHandler - 次のハンドラインスタンス
     * @param {Object} nextInfo - 次のページ情報
     * @returns {Promise<boolean>} - 遷移できた場合はtrue、できなかった場合はfalse
     */
    async #performPartialTransition(nextHandler, nextInfo) {
        if (!this.#prevInfo ||
            !this.#prevHandler?.canPartialTransferToNextPath ||
            !nextHandler?.canPartialReceiveFromPrevPath) {
            return false;
        }

        const [canTransfer, canReceive] = await Promise.all([
            this.#prevHandler.canPartialTransferToNextPath(nextInfo),
            nextHandler.canPartialReceiveFromPrevPath()
        ]);

        if (!canTransfer || !canReceive) {
            return false;
        }

        const preparation = await this.#prevHandler.preparePartialTransfer(nextInfo);

        if (preparation.pathUnmatchIgniters) {
            this.#pathUnmatchIgniters.push(...preparation.pathUnmatchIgniters);
        }
        if (preparation.domClearIgniter) {
            this.#domClearIgniters.push(preparation.domClearIgniter);
        }

        await nextHandler.renderingPartial(preparation.state);

        this.#prevInfo = { ...nextInfo };
        this.#prevHandler = nextHandler;
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

        if (this.#prevHandler?.cleanupFull) {
            try {
                await this.#prevHandler.cleanupFull();
            } catch (error) {
                console.error('Previous handler cleanup failed:', error);
            }
        }

        // タイトル設定
        const title = await nextHandler?.getTitle?.();
        this.#updateDocumentTitle(title);

        // HTML読み込み
        const htmlAssetPath = await nextHandler?.getHtmlAssetPath?.();
        if (htmlAssetPath) {
            await this.#assetLoader.loadHtml(this.#pageContainer, htmlAssetPath);
        } else {
            this.#pageContainer.innerHTML = '';
        }

        // レンダリング
        await nextHandler?.renderingFull?.();

        // 状態更新
        this.#prevInfo = nextInfo ? { ...nextInfo } : null;
        this.#prevHandler = nextHandler;
    }

    /** ドキュメントタイトルを更新
     * @param {string|null} title - ページタイトル
     */
    #updateDocumentTitle(title) {
        const parts = [];
        if (this.#baseTitle) parts.push(this.#baseTitle);
        if (title) parts.push(title);
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
        const specialHandlerFactory = this.#router.findSpecialHandlerFactory(pageName);

        if (!specialHandlerFactory) {
            const errorMessage = `Special page "${pageName}" not found`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }

        const specialHandler = await specialHandlerFactory.create({
            pageContainer: this.#pageContainer,
            assetLoader: this.#assetLoader,
            deviceDetector: this.#deviceDetector,
            navigator: this
        });

        await this.#performFullTransition(specialHandler, null);
    }
}
