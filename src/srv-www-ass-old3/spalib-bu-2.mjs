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
        this.assetLoader = new AssetLoader(this.assetsBaseUrl, this.deviceDetector);

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

    /** デバイス判定クラスのインスタンス
     * @type {DeviceDetector}
     */
    deviceDetector;

    /**
     * @param {string} assetsBaseUrl - アセット置き場のベースURL
     * @param {DeviceDetector} deviceDetector - デバイス判定クラスのインスタンス
     */
    constructor(assetsBaseUrl, deviceDetector) {
        this.assetsBaseUrl = assetsBaseUrl;
        this.deviceDetector = deviceDetector;
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
     * @param {string} path - ディレクトリパス(ベースを除く)
     * @param {string} ext - 拡張子
     * @returns {string} - デバイスに応じたパス
     */
    #pathWithDevice(path, ext) {
        return this.deviceDetector.isMobi() ? `${path}/mobi.${ext}` : `${path}/pc.${ext}`;
    }

    /** デバイスに応じたアセットを取得
     * @param {string} path - アセットのディレクトリパス(ベースを除く)
     * @param {string} ext - 拡張子
     * @returns {Promise<Blob>} - アセットのバイナリデータ
     */
    async fetchAssetWithDevice(path, ext) {
        return await this.fetchAsset(`${this.#pathWithDevice(path, ext)}`);
    }

    /** デバイスに応じたテンプレートを取得
     * @param {string} path - テンプレートのディレクトリパス(ベースを除く)
     * @param {string} ext - 拡張子
     * @returns {Promise<string>} - テンプレートのテキストデータ
     */
    async fetchTemplateWithDevice(path, ext) {
        return await this.fetchTemplate(`${this.#pathWithDevice(path, ext)}`);
    }

    /** デバイスに応じたHTMLを読み込んで指定要素に表示
     * @param {HTMLElement} container - HTMLを表示するコンテナ要素
     * @param {string} htmlPath - HTMLのパス(ベースを除く)
     * @returns {Promise<void>}
     */
    async loadHtmlWithDevice(container, htmlPath) {
        return await this.loadHtml(
            container,
            this.#pathWithDevice(htmlPath, 'html'),
        );
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
            htmlPath ? this.#pathWithDevice(htmlPath, 'html') : null,
            cssPath ? this.#pathWithDevice(cssPath, 'css') : null
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
     * @property {HandlerFactoryInterface|null} currentHandlerFactory - 現在のハンドラファクトリ
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
     * @type {Object<string, SpecialHandlerFactoryInterface>}
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
     * @param {string} fixedPath - 固定パス
     * @param {HandlerFactoryInterface} handlerFactory - ハンドラファクトリ
     * @returns {Router} - 自身のインスタンス
     */
    registerHandlerFactory(fixedPath, handlerFactory) {
        fixedPath = Router.pathNormalize(fixedPath);
        let current = this.routes;
        for (const elm of fixedPath.split('/').filter(e => e)) {
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

    /** ハンドラファクトリ検索関数の戻り値
     * @typedef {Object} RouterFindHandlerFactoryRet
     * @property {HandlerFactoryInterface} handlerFactory - 見つかったハンドラファクトリ
     * @property {string} fixedPath - 固定パス(パラメータはコロン)
     * @property {Object} params - パラメータ
     */

    /** パスに対応するハンドラファクトリを検索
     * @param {string} path - 検索するパス
     * @returns {RouterFindHandlerFactoryRet|null} - ハンドラファクトリ検索関数の戻り値
     */
    findHandlerFactory(path) {
        path = Router.pathNormalize(path);
        let fixedPath = [];
        let params = {};
        let current = this.routes;
        let afWcCapture = null;
        for (const elm of path.split('/').filter(e => e)) {
            if (afWcCapture) {
                afWcCapture.push(elm);
            } else if (current.children[elm]) {
                fixedPath.push(elm);
                current = current.children[elm];
            } else if (current.childPh) {
                fixedPath.push(`:${current.childPh.currentPhName}`);
                params[current.childPh.currentPhName] = elm;
                current = current.childPh;
            } else if (current.childWc) {
                fixedPath.push('*');
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
            fixedPath: fixedPath.join('/'),
            params
        };
    }

    /** 特殊ルートを登録する  
     * errorとnotfoundは用意しておく必要がある
     * @param {string} name - 特殊ルート名
     * @param {SpecialHandlerFactoryInterface} handlerFactory - ハンドラファクトリ
     * @return {Router} - 自身のインスタンス
     */
    registerSpecialRoute(name, handlerFactory) {
        this.specialRoutes[name] = handlerFactory;
        return this;
    }

    /** パスに対応するハンドラファクトリを検索(特殊ルート)
     * @param {string} name - ルートの登録名
     * @return {SpecialHandlerFactoryInterface|null} - ハンドラファクトリ
     */
    findSpecialHandlerFactory(name) {
        if (this.specialRoutes[name]) {
            return this.specialRoutes[name];
        }
        return null;
    }
}

/** ハンドラインスタンスの生成を司るインターフェース */
class HandlerFactoryInterface {
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
     * @property {Object} nextParams - 次のパラメータ
     * @property {string|null} prevRawPath - 前のパス
     * @property {string|null} prevFixedPath - 前の固定パス(パラメータはコロンで指定)
     * @property {Object|null} prevParams - 前のパラメータ
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

/** ハンドラのインターフェース */
class HandlerInterface {
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
        // オーバーライドして使用(thisによる状態管理が必要なため)
        throw new Error('renderingFull must be implemented');
    }

    /** 遷移先のパス情報
     * @typedef {Object} HandlerNextPathInfo
     * @property {string} raw - 次のパス
     * @property {string} fixed - 次の固定パス
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

/** 特殊ハンドラインスタンスの生成を司るインターフェース */
class SpecialHandlerFactoryInterface {
    /** ハンドラインスタンスを生成
     * @param {HandlerFactoryEntities} entities - ハンドラインスタンス生成に必要なエンティティ
     * @returns {Promise<SpecialHandlerInterface>} - 生成された特殊ハンドラ
     */
    async create(entities) {
        throw new Error('create must be implemented');
    }
}

/** 特殊ハンドラインスタンスのインターフェース */
class SpecialHandlerInterface {
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
        // オーバーライドして使用(thisによる状態管理が必要なため)
        throw new Error('renderingFull must be implemented');
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
     * @property {string} rawPath - 前のパス
     * @property {string} fixedPath - 前の固定パス
     * @property {Object} params - 前のパラメータ
     */
    prevInfo = null;

    /** 前のハンドラ
     * @type {HandlerBase|null}
     */
    prevHandler = null;

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
            await this.#transitionerWithErrorHandling(path);
        });
        await this.navigate(window.location.pathname);
    }

    /** 指定されたパスに遷移
     * @param {string} path - 遷移先のパス
     * @returns {Promise<void>} - 遷移完了時
     */
    async navigate(path) {
        history.pushState(null, '', path);
        await this.#transitionerWithErrorHandling(path);
    }

    /** 特殊ページに遷移
     * @param {string} target - 遷移先の特殊ページ名
     * @returns {Promise<void>} - 遷移完了時
     */
    async navigateSpecial(target) {
        await this.#transitionerToSpecialWithErrorHandling(target);
    }

    /** エラーハンドリング付きでパス遷移を行う
     * @param {string} nextPath - 遷移先のパス
     * @returns {Promise<void>} - 遷移完了時
     */
    async #transitionerWithErrorHandling(nextPath) {
        try {
            await this.#transitioner(nextPath);
        } catch (error) {
            console.error(`Error occurred during transition: ${error}`);
            await this.#transitionerToSpecialWithErrorHandling('error');
        }
    }

    /** 指定されたパスに遷移
     * @param {string} nextPath - 遷移先のパス
     * @returns {Promise<void>} - 遷移完了時
     */
    async #transitioner(nextPath) {
        const nextInfo = {};
        let nextHandlerFactory;
        {
            nextPath = Router.pathNormalize(nextPath);
            const foundHandler = this.router.findHandlerFactory(nextPath);
            if (!foundHandler) {
                await this.#transitionToSpecial('notfound');
                return;
            }
            nextHandlerFactory = foundHandler.handlerFactory;
            nextInfo.rawPath = nextPath;
            nextInfo.fixedPath = foundHandler.fixedPath;
            nextInfo.params = foundHandler.params;
        }

        await this.#igniteIgniterOnPathUnmatch(nextInfo.rawPath);

        {
            let transitioned = false;
            let transitionFailed = false;
            let nextHandler = null;

            // まずページ内遷移を試す
            try {
                transitioned = await this.#transitionerInpage(nextInfo);
            } catch (error) {
                transitionFailed = true;
            }

            if (!transitioned || transitionFailed) {
                nextHandler = await nextHandlerFactory.create(
                    {
                        pageContainer: this.pageContainer,
                        assetLoader: this.assetLoader,
                        deviceDetector: this.deviceDetector,
                        navigator: this
                    },
                    {
                        nextRawPath: nextInfo.rawPath,
                        nextFixedPath: nextInfo.fixedPath,
                        nextParams: nextInfo.params,
                        prevRawPath: this.prevInfo?.rawPath,
                        prevFixedPath: this.prevInfo?.fixedPath,
                        prevParams: this.prevInfo?.params
                    }
                );
            }

            // ページ内遷移ができなかった場合、部分遷移を試す
            if (!transitioned && !transitionFailed) {
                try {
                    transitioned = await this.#transitionerPartial(nextHandler, nextInfo);
                } catch (error) {
                    transitionFailed = true;
                }
            }

            // ページ内遷移も部分遷移もできなかったか失敗した場合、全体遷移を行う
            if (!transitioned) {
                try {
                    await this.#transitionerFull(nextHandler, nextInfo);
                } catch (error) {
                    console.error(`Error occurred during full transition: ${error}`);
                    throw error;
                }
            }
        }
    }

    /** パス監視を発火させる
     * @param {string} nextPath - 次のパス
     * @returns {Promise<void>} - 処理完了時
     */
    async #igniteIgniterOnPathUnmatch(nextPath) {
        const nextPathSplited = nextPath?.split('/').filter(Boolean) || [];
        let newIgnitersOnPathUnmatch = [];
        for (const igniter of this.ignitersOnPathUnmatch) {
            const igniterPatternSplited =
                Router.pathNormalize(igniter.pattern)?.split('/').filter(Boolean) || [];
            if (Navigator.#patternMatchChecker(igniterPatternSplited, nextPathSplited)) {
                newIgnitersOnPathUnmatch.push(igniter);
                continue;
            } else {
                try {
                    await igniter.onPathUnmatchFn();
                } catch (error) {
                    console.error(`igniterOnPathUnmatch error: ${error}`);
                    // クリーンアップが失敗しても致命的にはなりにくいためthrowしない
                }
            }
        }
        this.ignitersOnPathUnmatch = newIgnitersOnPathUnmatch;
    }

    /** パス監視を全て発火させる
     * @returns {Promise<void>} - 処理完了時
     */
    async #igniteIgnitersOnPathUnmatchAll() {
        for (const igniter of this.ignitersOnPathUnmatch) {
            try {
                await igniter.onPathUnmatchFn();
            } catch (error) {
                console.error(`igniterOnPathUnmatch error: ${error}`);
                // クリーンアップが失敗しても致命的にはなりにくいためthrowしない
            }
        }
        this.ignitersOnPathUnmatch = [];
    }

    /** DOMクリア時を全て発火させる
     * @returns {Promise<void>} - 処理完了時
     */
    async #igniteIgnitersOnDomClearAll() {
        for (const igniter of this.ignitersOnDomClear) {
            try {
                await igniter();
            } catch (error) {
                console.error(`igniterOnDomClear error: ${error}`);
                // クリーンアップが失敗しても致命的にはなりにくいためthrowしない
            }
        }
        this.ignitersOnDomClear = [];
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

    /** ページ内遷移を行う
     * 条件不適合でfalse、成功でtrue、失敗でthrow
     * @param {Object} nextInfo - 次のページ情報
     * @returns {Promise<boolean>} - 遷移できた場合はtrue、できなかった場合はfalse
     */
    async #transitionerInpage(nextInfo) {
        if (!this.prevInfo
            || this.prevInfo.fixedPath !== nextInfo.fixedPath
            || !(await this.prevHandler.canInpageTransferTo(nextInfo.params))
        ) {
            return false;
        }

        try {
            await this.prevHandler.renderingInpage(nextInfo.params);
        } catch (error) {
            console.error(`Error occurred while rendering inpage: ${error}`);
            throw error;
        }

        this.prevInfo = {
            rawPath: nextInfo.rawPath,
            fixedPath: nextInfo.fixedPath,
            params: nextInfo.params
        }
        // ハンドラはそのまま

        return true;
    }

    /** 部分遷移を行う
     * 条件不適合でfalse、成功でtrue、失敗でthrow
     * @param {HandlerInterface} nextHandler - 次のハンドラインスタンス
     * @param {Object} nextInfo - 次のページ情報
     * @returns {Promise<boolean>} - 遷移できた場合はtrue、できなかった場合はfalse
     */
    async #transitionerPartial(nextHandler, nextInfo) {
        if (!this.prevInfo
            || !(await this.prevHandler.canPartialTransferToNextPath(nextInfo))
            || !(await nextHandler.canPartialReceiveFromPrevPath())
        ) {
            return false;
        }

        let prevHandlerState = null;
        try {
            const preparePartialTransferRet =
                await this.prevHandler.preparePartialTransfer({
                    raw: nextInfo.rawPath,
                    fixed: nextInfo.fixedPath,
                    params: nextInfo.params
                });
            prevHandlerState = preparePartialTransferRet.state;
            this.ignitersOnPathUnmatch.push(...(preparePartialTransferRet.ignitersOnPathUnmatch || []));
            if (preparePartialTransferRet.igniterOnDomClear) {
                this.ignitersOnDomClear.push(preparePartialTransferRet.igniterOnDomClear);
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

        this.prevInfo = {
            rawPath: nextInfo.rawPath,
            fixedPath: nextInfo.fixedPath,
            params: nextInfo.params
        };
        this.prevHandler = nextHandler;

        return true;
    }

    /** 全体遷移を行う
     * @param {HandlerInterface|SpecialHandlerInterface} nextHandler - 次のハンドラインスタンス
     * @param {Object|null} nextInfo - 次のページ情報
     * @returns {Promise<void>} - 遷移完了時
     */
    async #transitionerFull(nextHandler, nextInfo) {
        await this.#igniteIgnitersOnPathUnmatchAll();
        await this.#igniteIgnitersOnDomClearAll();
        try {
            await this.prevHandler?.cleanupFull();
        } catch (error) {
            console.error(`Error occurred while cleaning up previous handler: ${error}`);
            // クリーンアップが失敗しても致命的にはなりにくいためthrowしない
        }

        const title = await nextHandler?.getTitle?.();
        document.title = `${this.baseTitle || ''}${(this.baseTitle && title) ? ' - ' : ''}${title || ''}`;

        const htmlAssetPath = await nextHandler?.getHtmlAssetPath?.();
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
            await nextHandler?.renderingFull();
        } catch (error) {
            console.error(`Error occurred while rendering full: ${error}`);
            throw error;
        }

        this.prevInfo = nextInfo ? {
            rawPath: nextInfo.rawPath,
            fixedPath: nextInfo.fixedPath,
            params: nextInfo.params
        } : null;
        this.prevHandler = nextHandler;
    }

    /** エラーハンドリング付きで特殊ページに遷移
     * @param {string} pageName - 特殊ページ名
     * @returns {Promise<void>} - 遷移完了時
     */
    async #transitionerToSpecialWithErrorHandling(pageName) {
        try {
            await this.#transitionToSpecial(pageName);
        } catch (error) {
            if (pageName !== 'error') {
                console.error(`Error occurred during transition to special page: ${error}`);
                await this.#transitionToSpecial('error');
            }
            throw error;
        }
    }

    /** 指定された特殊ページに遷移
     *  特殊ページは相互に一切の状態を共有しない
     * @param {string} pageName - ページ名
     * @returns {Promise<void>} - 遷移完了時
     */
    async #transitionToSpecial(pageName) {
        const specialHandlerFactory = this.router.findSpecialHandlerFactory(pageName);
        if (specialHandlerFactory) {
            const specialHandler = await specialHandlerFactory.create({
                pageContainer: this.pageContainer,
                assetLoader: this.assetLoader,
                deviceDetector: this.deviceDetector,
                navigator: this
            });

            await this.#transitionerFull(specialHandler, null);
        } else {
            this.prevHandler = null;
            this.prevInfo = null;

            console.error(`Special page "${pageName}" not found.`);
            throw new Error(`Special page "${pageName}" not found.`);
        }
    }
}
