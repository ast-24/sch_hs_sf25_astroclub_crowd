import { TitleComponent } from "../../comp/title/main.mjs";
import { HandlerInterface } from "../../spalib.mjs"

export async function EnterHandlerCreator(entities, apiClient, context) {
    return new EnterHandler(entities, apiClient, context);
}

class EnterHandler extends HandlerInterface {
    #entities;
    #apiClient;

    #context;
    #roomId;

    #titleComponent;

    constructor(entities, apiClient, context) {
        super();
        this.#entities = entities;
        this.#apiClient = apiClient;
        this.#context = context;
    }

    async cleanupFull() {
        this.#removeEventListeners();
    }

    #removeEventListeners() {
        const btns = this.#entities.pageContainerRef.dom.getElementsByClassName('status_btn');
        Array.from(btns).forEach(btn => {
            btn.removeEventListener('click', this.#statusUpdateHandler);
        });
    }

    async getTitle() {
        return "入力画面";
    }

    async getHtmlResourcePath() {
        return null;
        // あとで機種ごとに読み込む
    }

    async renderingFull() {

        for (let i = 0; i < 3; i++) {
            try {
                await this.#entities.resourceLoader.loadPageWithDevice(
                    this.#entities.pageContainerRef.dom,
                    'page/enter',
                    'page/enter'
                );
                break; // 成功したらループを抜ける
            } catch (error) {
                console.error(`Error loading enter page (attempt ${i + 1}/3): ${error}`);
                if (i === 2) {
                    // 3回失敗したらエラーを投げる
                    throw new Error(`Failed to load enter page after 3 attempts: ${error}`);
                }
            }
        }

        this.#titleComponent = new TitleComponent(
            this.#entities.resourceLoader,
            this.#entities.deviceDetector
        );
        await this.#titleComponent.render(
            this.#entities.pageContainerRef.dom.querySelector('.title_area'),
            {
                desktop: '✏️ 混雑状況入力画面&nbsp;&nbsp;&nbsp&nbsp;',
                mobile: '混雑状況<br>✏️ 入力画面'
            }
        );

        this.#roomId = this.#context.nextParams['roomid'];
        let rooms = null;
        for (let i = 0; i < 3; i++) {
            // 3回までリトライ
            try {
                rooms = await this.#apiClient.getRooms();
                break; // 成功したらループを抜ける
            } catch (error) {
                console.error('教室情報の取得に失敗しました:', error);
                if (i === 2) {
                    // 3回目の失敗ならエラー画面へ遷移
                    await this.#entities.navigator.navigateSpecial('error');
                    return;
                }
            }
        }

        if (!rooms.has(this.#roomId)) {
            // URL直打しない限りこうならないためエラーでいい
            await this.#entities.navigator.navigateSpecial('notfound');
            return;
        }

        this.#entities.pageContainerRef.dom.querySelector('.main_content .room_info .room_name #roomName').textContent
            = rooms.get(this.#roomId).name;

        this.#setupEventListeners();
    }

    #setupEventListeners() {
        const btns = this.#entities.pageContainerRef.dom.getElementsByClassName('status_btn');
        Array.from(btns).forEach(btn => {
            btn.addEventListener('click', async () => {
                const status = Number(btn.getAttribute('data-status'));
                await this.#statusUpdateHandler(status);
            });
        });
    }

    async #statusUpdateHandler(status) {
        const isMobile = this.#entities.deviceDetector.isMobile();

        const statusButtons = this.#entities.pageContainerRef.dom.querySelector('.main_content .buttons_area .select_area');
        const messageOverlay = this.#entities.pageContainerRef.dom.querySelector('.main_content .buttons_area .message_overlay');
        const messageField = messageOverlay.querySelector('.message_overlay_frame .message_overlay_message');

        messageField.style.color = '#4fc3f7';
        messageField.innerHTML =
            !isMobile
                ? '送信中...<br>しばらくお待ちください'
                : '送信中...<br>しばらく<br>お待ちください';

        statusButtons.style.display = 'none';
        messageOverlay.style.display = 'block';

        for (let i = 0; i < 3; i++) {
            try {
                await this.#apiClient.updateCrowdStatus(this.#roomId, status);
                break;
            } catch (error) {
                console.error('混雑状況の更新に失敗しました:', error);
                if (i === 2) {
                    messageField.style.color = '#ff867c';
                    messageField.innerHTML =
                        !isMobile
                            ? '送信に失敗しました<br>再度お試しください'
                            : '送信に<br>失敗しました<br>再度<br>お試しください';

                    setTimeout(() => {
                        statusButtons.style.display = 'block';
                        messageOverlay.style.display = 'none';
                    }, !isMobile ? 5000 : 3000);
                    return;
                }
            }
        }

        messageField.innerHTML =
            !isMobile
                ? '送信が完了しました<br>ご協力ありがとうございます！'
                : '送信が<br>完了しました<br>ご協力<br>ありがとう<br>ございます！';

        setTimeout(() => {
            statusButtons.style.display = 'block';
            messageOverlay.style.display = 'none';
        }, !isMobile ? 5000 : 3000);
    }

    async canPartialTransferToNextPath(_) {
        return false;
    }

    async canPartialReceiveFromPrevPath() {
        return false;
    }

    async canInpageTransferTo(_) {
        return false;
    }

    async onDeviceOrientationChange() {
        await this.renderingFull();
    }
}
