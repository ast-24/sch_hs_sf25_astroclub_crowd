/** SPAアプリケーション全体を司るクラス */
export class SpaApp {
    /** アセット置き場のベースURL
     * @type {string|null}
     */
    assetsBaseUrl;

    /** SPA全体のコンテナ要素のID
     * @type {string}
     */
    appContainerId;

    /** アプリケーションのベースタイトル
     * @type {string|null}
     */
    baseTitle;

    /** ルート登録関数
     * @type {SpaAppRouteRegisterer}
     */
    routeRegisterer;

    /** ベーステーマ描画関数
     * @type {SpaAppBaseThemeRenderer|null}
     */
    baseThemeRenderer;

    /** デバイス判定クラスのインスタンス
     * @type {DeviceDetector}
     */
    deviceDetector;

    /** コンテンツ読み込みクラスのインスタンス
     * @type {AssetLoader}
     */
    assetLoader;

    /** SPA全体のコンテナ要素
     * @type {HTMLElement}
     */
    appContainer;

    /** 各ページ用のコンテナ要素
     * @type {HTMLElement}
     */
    pageContainer;

    /** ルータクラスのインスタンス
     * @type {Router}
     */
    router;

    /** ナビゲータクラスのインスタンス
     * @type {Navigator}
     */
    navigator;

    /** ベーステーマ描画関数
     * @callback SpaAppBaseThemeRenderer
     * @param {HTMLElement} appContainer - SPA全体のコンテナ要素
     * @param {AssetLoader} assetLoader - コンテンツ読み込みクラスのインスタンス
     * @param {DeviceDetector} deviceDetector - デバイス判定クラスのインスタンス
     * @returns {Promise<{ pageContainer: HTMLElement }>} - 各ページ用のコンテナ要素
     */

    /** ルート登録関数
     * @callback SpaAppRouteRegisterer
     * @param {Router} router - ルート登録対象のRouterインスタンス
     * @returns {Promise<void>}
     */

    /**
     * @param {Object} options
     * @param {string} options.assetsBaseUrl - アセット置き場のベースURL
     * @param {string} options.appContainerId - SPAコンテナ要素のID
     * @param {string|null} options.baseTitle - アプリケーションのベースタイトル
     * @param {SpaAppBaseThemeRenderer|null} options.baseThemeRenderer - ベーステーマ描画関数
     * @param {SpaAppRouteRegisterer} options.routeRegisterer - ルート登録関数
     */
    constructor(options) {
        this.assetsBaseUrl = options.assetsBaseUrl;
        this.appContainerId = options.appContainerId;
        this.baseTitle = options.baseTitle;
        this.baseThemeRenderer = options.baseThemeRenderer;
        this.routeRegisterer = options.routeRegisterer;
    }

    /** アプリケーションを初期化し描画開始
     * @returns {Promise<void>} - 初期化完了時
     */
    async start() {
        this.deviceDetector = new DeviceDetector();
        this.assetLoader = new AssetLoader(this.assetsBaseUrl);

        this.appContainer = document.getElementById(this.appContainerId);
        if (!this.appContainer) {
            throw new Error(`Element with ID '${this.appContainerId}' not found`);
        }

        this.pageContainer = this.appContainer;
        if (this.baseThemeRenderer) {
            try {
                const baseThemeRendererRet = await this.baseThemeRenderer(this.appContainer, this.assetLoader, this.deviceDetector);
                this.pageContainer = baseThemeRendererRet.pageContainer;
            } catch (error) {
                this.pageContainer = this.appContainer;
                console.error('Base theme rendering failed:', error);
                console.error('pageContainer was fallback to appContainer');
            }
        }

        this.router = new Router();
        await this.routeRegisterer(this.router);

        this.navigator = new Navigator({
            pageContainer: this.pageContainer,
            assetLoader: this.assetLoader,
            deviceDetector: this.deviceDetector,
            router: this.router,
            baseTitle: this.baseTitle
        });

        await this.navigator.start();
    }
}

/** コンテンツの読み込みを司るクラス */
class AssetLoader {
    /** アセット置き場のベースURL
     * @type {string}
     */
    assetsBaseUrl;

    /**
     * @param {string} assetsBaseUrl - アセット置き場のベースURL
     */
    constructor(assetsBaseUrl) {
        this.assetsBaseUrl = assetsBaseUrl;
    }

    /** アセットを取得して返す(バイナリ)
     * @param {string} assetPath - アセットのパス(ベースを除く)
     * @returns {Promise<Blob>} - アセットのバイナリデータ
     */
    async fetchAsset(assetPath) {
        try {
            const baseUrl = this.assetsBaseUrl.replace(/\/+$/, '');
            const normalizedPath = assetPath.replace(/^\/+/, '');
            const resp = await fetch(`${baseUrl}/${normalizedPath}`);
            if (!resp.ok) {
                throw new Error('Network response was not ok');
            }
            return await resp.blob();
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
            const resp = await this.fetchAsset(templatePath);
            return await resp.text();
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
        try {
            const html = htmlPath ? await this.fetchTemplate(htmlPath) : '';
            const style = cssPath ? `<style>${await this.fetchTemplate(cssPath)}</style>` : '';
            container.innerHTML = `${style}\n${html}`;
        } catch (error) {
            console.error('Error loading page:', error);
            throw error;
        }
    }

    /** デバイスに応じたパスを生成する
     * @param {DeviceDetector} deviceDetector - デバイス判定クラスのインスタンス
     * @param {string} path - ディレクトリパス(ベースを除く)
     * @param {string} ext - 拡張子
     * @returns {string} - デバイスに応じたパス
     */
    static #pathWithDevice(deviceDetector, path, ext) {
        return deviceDetector.isMobi() ? `${path}/mobi.${ext}` : `${path}/pc.${ext}`;
    }

    /** デバイスに応じたアセットを取得
     * @param {DeviceDetector} deviceDetector - デバイス判定クラスのインスタンス
     * @param {string} path - アセットのディレクトリパス(ベースを除く)
     * @param {string} ext - 拡張子
     * @returns {Promise<Blob>} - アセットのバイナリデータ
     */
    async fetchAssetWithDevice(deviceDetector, path, ext) {
        return await this.fetchAsset(`${AssetLoader.#pathWithDevice(deviceDetector, path, ext)}`);
    }

    /** デバイスに応じたテンプレートを取得
     * @param {DeviceDetector} deviceDetector - デバイス判定クラスのインスタンス
     * @param {string} path - テンプレートのディレクトリパス(ベースを除く)
     * @param {string} ext - 拡張子
     * @returns {Promise<string>} - テンプレートのテキストデータ
     */
    async fetchTemplateWithDevice(deviceDetector, path, ext) {
        return await this.fetchTemplate(`${AssetLoader.#pathWithDevice(deviceDetector, path, ext)}`);
    }

    /** デバイスに応じたHTMLを読み込んで指定要素に表示
     * @param {DeviceDetector} deviceDetector - デバイス判定クラスのインスタンス
     * @param {HTMLElement} container - HTMLを表示するコンテナ要素
     * @param {string} htmlPath - HTMLのパス(ベースを除く)
     * @returns {Promise<void>}
     */
    async loadHtmlWithDevice(deviceDetector, container, htmlPath) {
        return await this.loadHtml(
            container,
            AssetLoader.#pathWithDevice(deviceDetector, htmlPath, 'html'),
        );
    }

    /** デバイスに応じたページを読み込んで指定要素に表示
     * @param {DeviceDetector} deviceDetector - デバイス判定クラスのインスタンス
     * @param {HTMLElement} container - HTMLを表示するコンテナ要素
     * @param {string|null} htmlPath - HTMLのパス(ベースを除く)
     * @param {string|null} cssPath - CSSのパス(ベースを除く)
     * @returns {Promise<void>}
     */
    async loadPageWithDevice(deviceDetector, container, htmlPath, cssPath) {
        return await this.loadPage(
            container,
            htmlPath ? AssetLoader.#pathWithDevice(deviceDetector, htmlPath, 'html') : null,
            cssPath ? AssetLoader.#pathWithDevice(deviceDetector, cssPath, 'css') : null
        );
    }
}

/** デバイスタイプを判定するクラス */
class DeviceDetector {
    /** モバイルデバイスかどうかを判定(縦長かどうかで判定)
     * @returns {boolean} - モバイルデバイスならtrue、PCならfalse
     */
    isMobi() {
        return window.innerWidth < window.innerHeight;
    }
}

/** ルーティングのみを行う純粋なルータクラス  
 * パスの分解も行う  
 * 登録するのはHandlerFactoryでレンダリング時にHandlerを生成する
 * コロンを1階層のパラメータ、アスタリスクを複数階層のワイルドカードとして扱う
 */
class Router {
    /** ルート構造体(N分木)
     * @typedef {Object} RouterRoutes
     * @property {HandlerFactory|null} currentHandlerFactory - 現在のハンドラファクトリ
     * @property {string|null} currentPhName - 現在のパラメータ名
     * @property {RouterRoutes|null} childWc - ワイルドカード子ルート
     * @property {RouterRoutes|null} childPh - パラメータ子ルート
     * @property {Object<string, RouterRoutes>} children - 子ルート
     */

    /** ルート構造体
     * @type {RouterRoutes}
     */
    routes = {
        currentHandlerFactory: null,
        currentPhName: null,
        childWc: null,
        childPh: null,
        children: {}
    };

    /** 特殊ルート構造体
     * @type {Object<string, HandlerFactory>}
     */
    specialRoutes = {};

    /** パスを正規化する(スラッシュのみ)
     * @param {string} path - 正規化するパス
     * @returns {string} - 正規化されたパス
     */
    static pathNormalize(path) {
        path = path.replace(/^\/+/, '');
        path = path.replace(/\/+$/, '');
        path = path.replace(/\/+/g, '/');
        return path;
    }

    /** ハンドラファクトリをルートに登録する
     * @param {string} pathFixed - 固定パス
     * @param {HandlerFactory} handlerFactory - ハンドラファクトリ
     * @returns {Router} - 自身のインスタンス
     */
    registerHandlerFactory(pathFixed, handlerFactory) {
        pathFixed = Router.pathNormalize(pathFixed);
        let current = this.routes;
        for (const elm of pathFixed.split('/').filter(e => e)) {
            if (elm === '*') {
                current.childWc = {
                    currentHandlerFactory: null,
                    currentPhName: null,
                    childPh: null,
                    childWc: null,
                    children: {}
                };
                current = current.childWc;
                break; // ワイルドカードは末端なのでここで終了
            } else if (elm.startsWith(':')) {
                current.childPh = {
                    currentHandlerFactory: null,
                    currentPhName: elm.slice(1),
                    childWc: null,
                    childPh: null,
                    children: {}
                };
                current = current.childPh;
            } else {
                if (!current.children[elm]) {
                    current.children[elm] = {
                        currentHandlerFactory: null,
                        currentPhName: null,
                        childPh: null,
                        childWc: null,
                        children: {}
                    };
                }
                current = current.children[elm];
            }
        }
        current.currentHandlerFactory = handlerFactory;

        return this;
    }

    /** 特殊ルートを登録する  
     * errorとnotfoundは用意しておく必要がある
     * @param {string} name - 特殊ルート名
     * @param {HandlerFactory} handlerFactory - ハンドラファクトリ
     * @return {Router} - 自身のインスタンス
     */
    registerSpecialRoute(name, handlerFactory) {
        this.specialRoutes[name] = handlerFactory;
        return this;
    }

    /** ハンドラファクトリ検索関数の戻り値
     * @typedef {Object} RouterFindHandlerFactoryRet
     * @property {HandlerFactory|null} handlerFactory - 見つかったハンドラファクトリ
     * @property {string|null} pathFixed - 固定パス(パラメータはコロン)
     * @property {Object|null} params - パラメータ
     *
     * ルートが見つからなければpathFixedとparamsはnull  
     * NotFoundが登録されていなければhandlerFactoryもnull
     */

    /** パスに対応するハンドラファクトリを検索
     * @param {string} path - 検索するパス
     * @returns {RouterFindHandlerFactoryRet|null} - ハンドラファクトリ検索関数の戻り値
     */
    findHandlerFactory(path) {
        path = Router.pathNormalize(path);
        let pathFixed = [];
        let params = {};
        let current = this.routes;
        let afWcCapture = null;
        for (const elm of path.split('/').filter(e => e)) {
            if (afWcCapture) {
                afWcCapture.push(elm);
            } else if (current.children[elm]) {
                pathFixed.push(elm);
                current = current.children[elm];
            } else if (current.childPh) {
                pathFixed.push(`:${current.childPh.currentPhName}`);
                params[current.childPh.currentPhName] = elm;
                current = current.childPh;
            } else if (current.childWc) {
                pathFixed.push('*');
                afWcCapture = [elm];
                current = current.childWc;
            } else {
                return null;
            }
        }
        if (!current.currentHandlerFactory) {
            return null;
        }
        if (afWcCapture) {
            params['*'] = afWcCapture.join('/');
        }
        return {
            handlerFactory: current.currentHandlerFactory,
            pathFixed: pathFixed.join('/'),
            params
        };
    }

    /** パスに対応するハンドラファクトリを検索(特殊ルート)
     * @param {string} name - ルートの登録名
     * @return {HandlerFactory|null} - ハンドラファクトリ
     */
    findSpecialHandlerFactory(name) {
        if (this.specialRoutes[name]) {
            return this.specialRoutes[name];
        }
        return null;
    }
}

/** ハンドラインスタンスの生成を司るクラス */
class HandlerFactory {
    /** ハンドラインスタンスを生成するファクトリ関数
     * @type {HandlerFactoryCreatorFn}
     */
    creatorFn;

    /** 色々な操作を司るエンティティを集めた型
     * @typedef {Object} HandlerFactoryEntities
     * @property {HTMLElement} pageContainer - 各ページ表示用のコンテナ要素
     * @property {AssetLoader} assetLoader - コンテンツ読み込みクラスのインスタンス
     * @property {DeviceDetector} deviceDetector - デバイス判定クラスのインスタンス
     * @property {Navigator} navigator - ナビゲータクラスのインスタンス
     */

    /** ハンドラインスタンスを生成するためのコンテキスト
     * @typedef {Object} HandlerFactoryContext
     * @property {string} nextPath - 次のパス
     * @property {string} nextPathFixed - 次の固定パス(パラメータはコロンで指定)
     * @property {Object} nextParams - 次のパラメータ
     * @property {string|null} prevPath - 前のパス
     * @property {string|null} prevPathFixed - 前の固定パス(パラメータはコロンで指定)
     * @property {Object|null} prevParams - 前のパラメータ
     */

    /** ハンドラインスタンスを生成するファクトリ関数
     * @callback HandlerFactoryCreatorFn
     * @param {HandlerFactoryEntities} entities - ハンドラインスタンス生成に必要なエンティティ
     * @param {HandlerFactoryContext} context - ハンドラインスタンス生成に必要なコンテキスト
     * @returns {Promise<HandlerBase>} - ハンドラインスタンス
     */

    /** ハンドラインスタンスを生成するファクトリ
     * @param {HandlerFactoryCreatorFn} creatorFn - ハンドラインスタンスを生成する関数
     */
    constructor(creatorFn) {
        this.creatorFn = creatorFn;
    }

    /** ハンドラインスタンスを生成
     * @param {HandlerFactoryEntities} entities - ハンドラインスタンス生成に必要なエンティティ
     * @param {HandlerFactoryContext} context - ハンドラインスタンス生成に必要なコンテキスト
     * @returns {Promise<HandlerBase>} - ハンドラインスタンス
     */
    async create(entities, context) {
        // これ以外に必要な変数はキャプチャで渡す
        return await this.creatorFn(entities, context);
    }
}

/** ハンドラの基底クラス */
class HandlerBase {
    /** DOM全書き換え遷移時用クリーンアップ
     * @returns {Promise<void>} - クリーンアップ完了時
     */
    async cleanupFull() {
        // オーバーライドして使用(thisによる状態管理が必要なため)
    }

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
    async renderingFull() { }

    /** 遷移先のパス情報
     * @typedef {Object} HandlerNextPathInfo
     * @property {string} path - 次のパス
     * @property {string} pathFixed - 次の固定パス
     * @property {Object} params - 次のパラメータ
     */

    /** 次のパスへ部分遷移可能か
     * @param {HandlerNextPathInfo} nextPathInfo - 次のパス情報
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

    /** 部分遷移のための準備の戻り値型
     * @typedef {Object} HandlerPreparePartialTransferRet
     * @property {Object|null} state - 前のハンドラから引き継ぐ状態
     * @property {HandlerIgnitersOnPathUnmatch[]|null} ignitersOnPathUnmatch - パターンとパス不一致時のクリーンアップ関数
     * @property {HandlerIgniterOnDomClearFn|null} igniterOnDomClear - DOMクリア時に呼ばれる関数(部分遷移時はnull)
     */

    /** パスがスコープに一致するかに応じて発火するイベント
     * @typedef {Object} HandlerIgnitersOnPathUnmatch
     * @property {string} pattern - パターン  
     * (コロンは1階層のパラメータ、アスタリスクは複数階層のワイルドカード)
     * @property {HandlerIgniterOnPathUnmatchFn} onPathUnmatchFn - パス不一致時のクリーンアップ関数
     */

    /** パスがパターンに一致しなくなったときに呼ばれるクリーンアップ関数
     * @callback HandlerIgniterOnPathUnmatchFn
     * @returns {Promise<void>} - クリーンアップ完了時
     */

    /** DOMクリア時に発火する関数
     * @callback HandlerIgniterOnDomClearFn
     * @returns {Promise<void>} - DOMクリア完了時
     */

    /** 部分遷移のための準備
     * @param {HandlerNextPathInfo} nextPathInfo - 次のパス情報
     * @returns {Promise<HandlerPreparePartialTransferRet>}
     */
    async preparePartialTransfer(nextPathInfo) {
        // canPartialTransferToNextPathがfalseなのでオーバーライドされない限り呼ばれない
    }

    /** 部分遷移時用レンダリング
     * @param {Object} state - 前のハンドラから引き継ぐ状態
     * @returns {Promise<void>} - レンダリング完了時
     */
    async renderingPartial(state) {
        // canPartialReceiveFromPrevPathがfalseなのでオーバーライドされない限り呼ばれない
    }

    /** ページ内遷移可能か(パラメータのみの変更時)
     * @param {Object} nextParams - 次のパラメータ
     * @returns {Promise<boolean>} - ページ内遷移可能な場合はtrue
     */
    async canInpageTransferTo(nextParams) {
        return false;
    }

    /** ページ内遷移時用レンダリング
     * @param {Object} nextParams - 次のパラメータ
     * @returns {Promise<void>} - レンダリング完了時
     */
    async renderingInpage(nextParams) {
        // canInpageTransferToがfalseなのでオーバーライドされない限り呼ばれない
    }
}

/** ナビゲーションを司るクラス */
class Navigator {
    /** 各ページ用のコンテナ要素
     * @type {HTMLElement}
     */
    pageContainer;

    /** コンテンツ読み込みクラスのインスタンス
     * @type {AssetLoader}
     */
    assetLoader;

    /** デバイス判定クラスのインスタンス
     * @type {DeviceDetector}
     */
    deviceDetector;

    /** ルータクラスのインスタンス
     * @type {Router}
     */
    router;

    /** アプリケーションのベースタイトル
     * @type {string|null}
     */
    baseTitle;

    /** 前の情報
     * @type {Object|null}
     * @property {HandlerBase|null} handler - 前のハンドラ
     * @property {string|null} path - 前のパス
     * @property {string|null} pathFixed - 前の固定パス
     * @property {Object|null} params - 前のパラメータ
     */
    prevInfo = {
        handler: null,
        path: null,
        pathFixed: null,
        params: null
    };

    /** パスがスコープから抜けたときに発火するイベントのリスト
     * @type {HandlerIgnitersOnPathUnmatch[]}
     */
    ignitersOnPathUnmatch = [];

    /** DOMクリア時に発火するイベントのリスト
     * @type {HandlerIgniterOnDomClearFn[]}
     */
    ignitersOnDomClear = [];

    /** ナビゲーションを司るクラス
     * @param {Object} options - オプションオブジェクト
     * @param {HTMLElement} options.pageContainer - 各ページ用のコンテナ要素
     * @param {AssetLoader} options.assetLoader - コンテンツ読み込みクラスのインスタンス
     * @param {DeviceDetector} options.deviceDetector - デバイス判定クラス
     * @param {Router} options.router - ルータクラスのインスタンス
     * @param {string|null} options.baseTitle - アプリケーションのベースタイトル
     * @returns {Navigator} - ナビゲータのインスタンス
     */
    constructor(options) {
        this.pageContainer = options.pageContainer;
        this.assetLoader = options.assetLoader;
        this.deviceDetector = options.deviceDetector;
        this.router = options.router;
        this.baseTitle = options.baseTitle;
    }

    /** ナビゲーションを開始
     * @returns {Promise<void>} - ナビゲーション開始完了時
     */
    async start() {
        window.addEventListener('popstate', async () => {
            let path = window.location.pathname;
            await this.#transition(false, path);
        });
        await this.navigate(window.location.pathname);
    }

    /** 指定されたパスに遷移
     * @param {string} path - 遷移先のパス
     * @returns {Promise<void>} - 遷移完了時
     */
    async navigate(path) {
        history.pushState(null, '', path);
        await this.#transition(false, path);
    }

    /** 特殊ページに遷移
     * @param {string} target - 遷移先の特殊ページ名
     * @returns {Promise<void>} - 遷移完了時
     */
    async navigateSpecial(target) {
        await this.#transition(true, target);
    }

    /** 指定されたターゲットに遷移
     * @param {boolean} is_special - 特殊ページへの遷移か
     * @param {string} target - 遷移先
     * @returns {Promise<void>} - 遷移完了時
     */
    async #transition(is_special, target) {
        try {
            let nextPath;
            let nextPathFixed;
            let nextParams;
            let nextHandlerFactory;
            if (!is_special) {
                nextPath = Router.pathNormalize(target);
                const findHandlerFactoryRet = this.router.findHandlerFactory(target);
                nextHandlerFactory = findHandlerFactoryRet?.handlerFactory;
                nextPathFixed = findHandlerFactoryRet?.pathFixed;
                nextParams = findHandlerFactoryRet?.params;
            } else {
                nextPath = null;
                nextPathFixed = null;
                nextParams = null;
                nextHandlerFactory = this.router.findSpecialHandlerFactory(target);
            }

            if (!nextHandlerFactory) {
                if (is_special && target === 'notfound') {
                    console.error(`Not found handler not registered`);
                    throw new Error('Not found handler not registered');
                } else {
                    await this.#transition(true, 'notfound');
                    return;
                }
            }

            // パスがスコープから抜けたときに発火するイベントの実行
            const nextPathSplited = nextPath?.split('/') || [];
            let newIgnitersOnPathUnmatch = [];
            for (const igniter of this.ignitersOnPathUnmatch) {
                if (!is_special
                    && Navigator.#patternMatchChecker(
                        Router.pathNormalize(igniter.pattern).split('/'), nextPathSplited)
                ) {
                    newIgnitersOnPathUnmatch.push(igniter);
                    continue;
                }
                try {
                    await igniter.onPathUnmatchFn();
                } catch (error) {
                    console.error(`igniterOnPathUnmatch error: ${error}`);
                    // クリーンアップが失敗しても致命的にはなりにくいためthrowしない
                }
            }
            this.ignitersOnPathUnmatch = newIgnitersOnPathUnmatch;

            if (!is_special
                && this.prevInfo.pathFixed !== null
                && this.prevInfo.pathFixed !== undefined
                && nextPathFixed !== null
                && nextPathFixed !== undefined
                && this.prevInfo.pathFixed === nextPathFixed
                && this.prevInfo.handler
                && await this.prevInfo.handler.canInpageTransferTo(nextParams)) {
                // 前のハンドラーがページ内遷移可能な場合
                try {
                    await this.prevInfo.handler.renderingInpage(nextParams);
                } catch (error) {
                    console.error(`Error occurred while rendering inpage: ${error}`);
                    throw error;
                }
            } else {
                const nextHandler = await nextHandlerFactory.create(
                    {
                        pageContainer: this.pageContainer,
                        assetLoader: this.assetLoader,
                        deviceDetector: this.deviceDetector,
                        navigator: this
                    },
                    {
                        nextPath,
                        nextPathFixed,
                        nextParams,
                        prevPath: this.prevInfo.path,
                        prevPathFixed: this.prevInfo.pathFixed,
                        prevParams: this.prevInfo.params
                    }
                );

                const nextPathInfo = {
                    path: nextPath,
                    pathFixed: nextPathFixed,
                    params: nextParams
                };

                if (!is_special
                    && (!this.prevInfo.handler
                        || await this.prevInfo.handler.canPartialTransferToNextPath(nextPathInfo))
                    && await nextHandler.canPartialReceiveFromPrevPath()) {
                    // 前後のハンドラーが部分遷移可能な場合

                    let prevHandlerState = null;

                    try {
                        if (this.prevInfo.handler) {
                            const preparePartialTransferRet =
                                await this.prevInfo.handler.preparePartialTransfer(nextPathInfo);
                            prevHandlerState = preparePartialTransferRet.state;
                            this.ignitersOnPathUnmatch.push(...preparePartialTransferRet.ignitersOnPathUnmatch || []);
                            if (preparePartialTransferRet.igniterOnDomClear) {
                                this.ignitersOnDomClear.push(preparePartialTransferRet.igniterOnDomClear);
                            }
                        }
                    } catch (error) {
                        console.error(`Error occurred while preparing partial transfer: ${error}`);
                        throw error;
                    }

                    try {
                        await nextHandler.renderingPartial(prevHandlerState);
                    } catch (error) {
                        console.error(`Error occurred while rendering partial: ${error}`);
                        throw error;
                    }
                } else {
                    // 完全遷移

                    // 完全遷移では全状態をクリーンアップ
                    {
                        for (const igniter of this.ignitersOnPathUnmatch) {
                            try {
                                await igniter.onPathUnmatchFn();
                            } catch (error) {
                                console.error(`igniterOnPathUnmatch error: ${error}`);
                                // クリーンアップが失敗しても致命的にはなりにくいためthrowしない
                            }
                        }
                        this.ignitersOnPathUnmatch = [];

                        for (const igniterOnDomClear of this.ignitersOnDomClear) {
                            try {
                                await igniterOnDomClear();
                            } catch (error) {
                                console.error(`igniterOnDomClear error: ${error}`);
                                // クリーンアップが失敗しても致命的にはなりにくいためthrowしない
                            }
                        }
                        this.ignitersOnDomClear = [];

                        try {
                            await this.prevInfo.handler?.cleanupFull();
                        } catch (error) {
                            console.error(`Error occurred while cleaning up full: ${error}`);
                            throw error;
                        }
                    }

                    // 新規レンダリング
                    {
                        const title = await nextHandler.getTitle();
                        document.title = `${title || ''}${(title && this.baseTitle) ? ' - ' : ''}${this.baseTitle || ''}`;

                        const htmlAssetPath = await nextHandler.getHtmlAssetPath();
                        if (htmlAssetPath) {
                            try {
                                await this.assetLoader.loadHtml(this.pageContainer, htmlAssetPath);
                            } catch (error) {
                                console.error(`Error loading HTML: ${error}`);
                                throw error;
                            }
                        } else {
                            this.pageContainer.innerHTML = '';
                            // ハンドラでの書き換えを期待
                        }

                        try {
                            await nextHandler.renderingFull();
                        } catch (error) {
                            console.error(`Error occurred while rendering full: ${error}`);
                            throw error;
                        }
                    }
                }

                this.prevInfo.handler = nextHandler;
            }
            // 特殊ページ遷移時でもクリアするために代入
            this.prevInfo.path = nextPath;
            this.prevInfo.pathFixed = nextPathFixed;
            this.prevInfo.params = nextParams;
        } catch (error) {
            console.error(`Error during navigation to ${target}: ${error}`);
            if (is_special && target === 'error') {
                this.pageContainer.innerHTML = '<h1>レンダリングに失敗しました</h1>';
                throw error;
            } else {
                // エラー画面へ遷移
                await this.#transition(true, 'error');
            }
        }
    }

    /** パターンとパスの一致判定
     * @param {string[]} pattern - パターン  
     * (コロンは1階層のパラメータ、アスタリスクは複数階層のワイルドカード)
     * @param {string[]} path - パス
     * @returns {boolean}
     *
     */
    static #patternMatchChecker(pattern, path) {
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
        // 到達時点で、パターンと同じ長さか パターンの方が短く末端がワイルドカードである
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] === '*') {
                // ワイルドカード出現時点で一致確定
                return true;
            }
            if (pattern[i].startsWith(':')) {
                // ワイルドカードではないがパラメータなので一致
                continue;
            }
            if (pattern[i] !== path[i]) {
                // 固定値との不一致があったため不一致
                return false;
            }
        }
        return true;
    }
}
