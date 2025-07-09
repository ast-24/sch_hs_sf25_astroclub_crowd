/**
 * 簡易SPAルーター
 * 生パスによるルーティングを提供
 */
export class Router {
    /**
     * @param {string} appElementId - アプリケーションのルートエレメントID
     */
    constructor(appElementId = 'app') {
        this.routes = {};
        this.appElementId = appElementId;
        this.currentRoute = null;

        // popstateイベントでブラウザの戻る/進むボタンに対応
        window.addEventListener('popstate', (e) => this.handleRoute());

        // 初期ルート処理
        this.handleRoute();
    }

    /**
     * ルートを登録
     * @param {string} path - パス
     * @param {Function} handler - ハンドラー関数
     */
    addRoute(path, handler) {
        this.routes[path] = handler;
    }

    /**
     * 現在のパスを解析してルーティング処理
     */
    async handleRoute() {
        const path = window.location.pathname;
        const appElement = document.getElementById(this.appElementId);

        if (!appElement) {
            console.error(`Element with id '${this.appElementId}' not found`);
            return;
        }

        console.log(`Handling route for path: ${path}`);

        // パスパラメータを含むルートのマッチング
        const matchedRoute = this.findMatchingRoute(path);

        if (matchedRoute) {
            this.currentRoute = path;
            await matchedRoute.handler(appElement, matchedRoute.params);
        } else {
            this.show404(appElement);
        }
    }

    /**
     * パスにマッチするルートを検索
     * @param {string} path - 現在のパス
     * @returns {Object|null} マッチしたルート情報
     */
    findMatchingRoute(path) {
        for (const [routePath, handler] of Object.entries(this.routes)) {
            console.log(`Checking route: ${routePath} against path: ${path}`);
            const match = this.matchPath(routePath, path);
            if (match) {
                console.log(`Route matched: ${routePath}`);
                return { handler, params: match.params };
            }
        }
        console.log(`No matching route found for path: ${path}`);
        return null;
    }

    /**
     * パスパターンマッチング
     * @param {string} pattern - ルートパターン
     * @param {string} path - 実際のパス
     * @returns {Object|null} マッチ結果
     */
    matchPath(pattern, path) {
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');

        if (patternParts.length !== pathParts.length) {
            return null;
        }

        const params = {};

        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            const pathPart = pathParts[i];

            if (patternPart.startsWith(':')) {
                // パスパラメータ
                const paramName = patternPart.slice(1);
                params[paramName] = pathPart;
            } else if (patternPart !== pathPart) {
                // 固定パスが一致しない
                return null;
            }
        }

        return { params };
    }

    /**
     * プログラムからのナビゲーション
     * @param {string} path - 遷移先パス
     */
    navigateTo(path) {
        window.history.pushState(null, '', path);
        this.handleRoute();
    }

    /**
     * 404ページ表示
     * @param {HTMLElement} container - コンテナ要素
     */
    show404(container) {
        container.innerHTML = `
            <div class="error-page">
                <h2>404 - ページが見つかりません</h2>
                <p>URLを確認してください</p>
                <button onclick="location.href='/'">トップに戻る</button>
            </div>
        `;
    }
}
