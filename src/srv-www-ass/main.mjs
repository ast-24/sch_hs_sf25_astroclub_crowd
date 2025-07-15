import { ApiClient, ApiClientStub } from './cmn.mjs';
import { SpaCore, HandlerFactoryInterfaceImpl } from './spalib.mjs';
import { themeRenderer } from './theme/main.mjs'

// デプロイ時に文字列置換
const ORIGIN_ASS_BASE_URL = "{{ASS_ORIGIN}}";
const ORIGIN_API_BASE_URL = "{{API_ORIGIN}}";

async function run() {
    // アプリケーション初期化
    document.addEventListener('DOMContentLoaded', async () => {
        const spaCore = new SpaCore({
            resourcesBaseUrl: ORIGIN_ASS_BASE_URL,
            containerId: "app_container",
            title: "天文部 文化祭 混雑状況表示システム",
            themeRenderer: themeRenderer,
            themeRendererOnResize: themeRenderer,// 同じものでよい
            routeConfigurer: routeConfigurer
        });
        await spaCore.start();
    });
}

const appClient =
    ORIGIN_API_BASE_URL
        ? new ApiClient(ORIGIN_API_BASE_URL)
        : new ApiClientStub(ORIGIN_API_BASE_URL);

async function routeConfigurer(router) {
    router
        .registerHandlerFactory(
            '',
            new HandlerFactoryInterfaceImpl(
                async (entities, context) => {
                    const { IndexHandlerCreator } = await import('./page/index/main.mjs');
                    return await IndexHandlerCreator(entities, appClient);
                })
        )
        .registerHandlerFactory(
            'dashboard',
            new HandlerFactoryInterfaceImpl(
                async (entities, context) => {
                    const { DashboardHandlerCreator } = await import('./page/dashboard/main.mjs');
                    return await DashboardHandlerCreator(entities, appClient, context);
                })
        )
        .registerHandlerFactory(
            'enter/:roomid',
            new HandlerFactoryInterfaceImpl(
                async (entities, context) => {
                    const { EnterHandlerCreator } = await import('./page/enter/main.mjs');
                    return await EnterHandlerCreator(entities, appClient, context);
                })
        );
    // >! error / notfound
}

run();
