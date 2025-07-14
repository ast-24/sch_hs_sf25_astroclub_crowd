import * as index from "../pages/index/main.mjs";
import * as index_view_list from "../pages/view/list/main.mjs";
import * as index_enter from "../pages/enter/index/main.mjs";
import * as index_enter_room from "../pages/enter/room/main.mjs";

export function routeRegister(
    router,
    container,
    deviceDetector,
    navigator,
    assetLoader,
    apiClient
) {
    router
        .registerRender("/", new index.Render(container, deviceDetector, navigator, assetLoader, apiClient), "pages/index")
        .registerRender("/view/list", new index_view_list.Render(container, deviceDetector, navigator, assetLoader, apiClient), "pages/view/list")
        .registerRender("/enter", new index_enter.Render(container, deviceDetector, navigator, assetLoader, apiClient), "pages/enter")
        .registerRender("/enter/:roomId", new index_enter_room.Render(container, deviceDetector, navigator, assetLoader, apiClient), "pages/enter/room");
}