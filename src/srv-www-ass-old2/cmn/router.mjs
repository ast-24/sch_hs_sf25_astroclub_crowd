// ルーティングのみを行う純粋なルータ
export class Router {
    constructor() {
        this.routes = {};
    }

    // ルートを登録する
    // renderには以下のシグネチャを持つメソッドを用意(無くても良い)
    // - async hander(params) -> Promise<void>
    // (- async cleaner() -> Promise<void>)
    // assetPathはオプションで、ファイル名は含まない
    registerRender(path, render, assetPath) {
        this.routes[path] = { render, assetPath };
        return this;
    }

    // パスからコンテンツを探す
    // コンテンツとパラメータを返す
    findRender(path) {
        for (const [routePath, routeCont] of Object.entries(this.routes)) {
            const match = this.#matchPath(routePath, path);
            if (match) {
                return {
                    found: true,
                    render: routeCont.render,
                    assetPath: routeCont.assetPath,
                    params: match
                };
            }
        }

        return { found: false };
    }

    // パターンとパスを受け取り、プレースホルダ部を返す
    // マッチしなければnullを返す
    #matchPath(pattern, path) {
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

        return params;
    }
}