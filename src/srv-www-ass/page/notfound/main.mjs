import { HandlerInterface } from "../../spalib.mjs"

export async function NotFoundHandlerCreator(entities) {
    return new NotFoundHandler(entities);
}

class NotFoundHandler extends HandlerInterface {
    #entities;

    constructor(entities) {
        super();
        this.#entities = entities;
    }

    async cleanupFull() {
        // 特にクリーンアップすることはない
    }

    async getTitle() {
        return "ページが見つかりません";
    }

    async getHtmlResourcePath() {
        return null;
    }

    async renderingFull() {
        // HTML/CSSをmjs内に直接書き込む
        const html = `
            <div id="notfound_container">
                <div class="notfound_content">
                    <div class="notfound_icon">🔍</div>
                    <div class="notfound_title">ページが見つかりませんでした</div>
                    <div class="notfound_message">5秒後にホームページに戻ります</div>
                    <div class="countdown">5</div>
                </div>
            </div>
        `;

        const css = `
            <style>
                #notfound_container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                    z-index: 9999;
                }

                .notfound_content {
                    text-align: center;
                    padding: 4vh 4vw;
                    background-color: #ffffff20;
                    border: 0.4vh solid #ff9800;
                    border-radius: 2vh;
                    box-shadow: 0.5vw 1vh 2vw #000c,
                        -0.25vw -0.4vh 0.5vw #0008;
                    max-width: 80vw;
                }

                .notfound_icon {
                    font-size: 8vh;
                    margin-bottom: 2vh;
                }

                .notfound_title {
                    font-size: 4vh;
                    font-weight: bold;
                    color: #ff9800;
                    margin-bottom: 2vh;
                    text-shadow: 0.1vw 0.2vh 0.3vw #000;
                }

                .notfound_message {
                    font-size: 2.5vh;
                    color: #b3e0ff;
                    margin-bottom: 3vh;
                }

                .countdown {
                    font-size: 6vh;
                    font-weight: bold;
                    color: #4fc3f7;
                    text-shadow: 0.1vw 0.2vh 0.3vw #000;
                }

                @media (max-width: 768px) {
                    .notfound_content {
                        padding: 3vh 3vw;
                        max-width: 90vw;
                    }

                    .notfound_icon {
                        font-size: 6vh;
                    }

                    .notfound_title {
                        font-size: 3vh;
                    }

                    .notfound_message {
                        font-size: 2vh;
                    }

                    .countdown {
                        font-size: 4vh;
                    }
                }
            </style>
        `;

        // CSSとHTMLを挿入
        this.#entities.pageContainerRef.dom.innerHTML = css + html;

        // カウントダウンを開始
        this.#startCountdown();
    }

    #startCountdown() {
        let count = 5;
        const countdownElement = this.#entities.pageContainerRef.dom.querySelector('.countdown');

        const interval = setInterval(() => {
            count--;
            if (countdownElement) {
                countdownElement.textContent = count;
            }

            if (count <= 0) {
                clearInterval(interval);
                // SPAのnavigateでホームページに戻る
                this.#entities.navigator.navigate('/');
            }
        }, 1000);
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
        // NotFoundページでは特に何もしない
    }
}
