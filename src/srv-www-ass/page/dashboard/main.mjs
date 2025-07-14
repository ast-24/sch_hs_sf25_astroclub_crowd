import { statusNumToTextLong, statusNumToTextShort } from "../../cmn.mjs";
import { TitleComponent } from "../../comp/title/main.mjs";
import { HandlerInterface } from "../../spalib.mjs"

export async function DashboardHandlerCreator(entities, apiClient, context) {
    return new DashboardHandler(entities, apiClient);
}

class DashboardHandler extends HandlerInterface {
    static #REFRESH_INTERVAL = 30000; // 30秒
    #refreshIntervalId = null;

    #entities;
    #apiClient;

    #titleComponent;

    constructor(entities, apiClient) {
        super();
        this.#entities = entities;
        this.#apiClient = apiClient;
    }

    async cleanupFull() {
        if (this.#refreshIntervalId) {
            clearInterval(this.#refreshIntervalId);
            this.#refreshIntervalId = null;
        }
    }

    async getTitle() {
        return "ダッシュボード";
    }

    async getHtmlResourcePath() {
        return null;
        // あとで機種ごとに読み込む
    }

    async renderingFull() {
        await this.#entities.resourceLoader.loadPageWithDevice(
            this.#entities.pageContainerRef.dom,
            'page/dashboard',
            'page/dashboard'
        );

        this.#titleComponent = new TitleComponent(
            this.#entities.resourceLoader,
            this.#entities.deviceDetector
        );
        await this.#titleComponent.render(
            this.#entities.pageContainerRef.dom.querySelector('.title_area'),
            {
                desktop: '📊 混雑状況ダッシュボード&nbsp;&nbsp;&nbsp;',
                mobile: '混雑状況<br>📊 ダッシュボード'
            }
        );

        this.#refreshIntervalId = setInterval(() => {
            this.#fetchAndApplyData();
        }, DashboardHandler.#REFRESH_INTERVAL);
        await this.#fetchAndApplyData();
    }

    async #fetchAndApplyData() {
        // 最終更新時刻表示
        this
            .#entities
            .pageContainerRef
            .dom
            .querySelector('.data_state_area .last_updated #lastUpdated')
            .textContent
            = new Date().toLocaleTimeString();

        const [rooms_info, crowd_info] = await Promise.all([
            this.#apiClient.getRooms(),
            this.#apiClient.getCrowdStatus()
        ]);

        // sort_priorityで昇順ソート
        const rooms = Array.from(rooms_info.entries())
            .sort((a, b) => {
                const pa = a[1].sort_priority ?? 0;
                const pb = b[1].sort_priority ?? 0;
                return pa - pb;
            });

        // テーブル描画
        const tableBody =
            this
                .#entities
                .pageContainerRef
                .dom
                .querySelector('.data_table_area .data_table #dataTableBody');

        let oldElements = [];
        for (const row of tableBody.querySelectorAll('tr')) {
            const cells = Array.from(row.querySelectorAll('td'));
            oldElements.push({
                roomid: row.dataset.roomid,
                status: cells[0].textContent,
                roomName: cells[1].textContent,
                desc: cells[2].textContent,
                updated: cells[3].textContent
            });
        }

        let newElements = [];
        for (const [roomId, room] of rooms) {
            const crowd = crowd_info.get(roomId);
            // 混雑状況テキスト
            let statusText = '?';
            if (crowd && typeof crowd.status === 'number') {
                // デバイス判定
                statusText = this.#entities.deviceDetector.isMobile()
                    ? statusNumToTextShort(crowd.status)
                    : statusNumToTextLong(crowd.status);
            }
            const roomName = `${room.name} (${room.floor}F)`;
            const desc = room.desc || '-';
            const updated = crowd && crowd.updated_at ? crowd.updated_at.toLocaleTimeString() : '-';

            newElements.push({
                roomid: roomId,
                status: statusText,
                roomName: roomName,
                desc: desc,
                updated: updated,
                statusClass: `crowd-status-${crowd ? crowd.status : 0}`
            });
        }

        let procRowIndex = 0;
        let oldElementsIndex = 0;
        let newElementsIndex = 0;
        while (oldElementsIndex < oldElements.length || newElementsIndex < newElements.length) {
            const oldElement = oldElements[oldElementsIndex];
            const newElement = newElements[newElementsIndex];

            if (!oldElement || (newElement && oldElement.roomid != newElement.roomid)) {
                // 新しい要素を追加
                const tr = document.createElement('tr');
                tr.dataset.roomid = newElement.roomid;
                tr.innerHTML = `
                    <td>${newElement.status}</td>
                    <td>${newElement.roomName}</td>
                    <td>${newElement.desc}</td>
                    <td>${newElement.updated}</td>
                `;
                tr.className = newElement.statusClass;
                tableBody.insertBefore(tr, tableBody.children[procRowIndex]);
                newElementsIndex++;
                procRowIndex++;// 新しい行を追加したので、インデックスは進める
            } else if (!newElement || (oldElement && oldElement.roomid != newElement.roomid)) {
                // 古い要素を削除
                tableBody.removeChild(tableBody.children[procRowIndex]);
                oldElementsIndex++;
                procRowIndex = procRowIndex;// 既存の行を削除したので、インデックスは変わらない
            } else {
                // 既存の要素を更新
                const tr = tableBody.children[procRowIndex];
                tr.innerHTML = `
                    <td>${newElement.status}</td>
                    <td>${newElement.roomName}</td>
                    <td>${newElement.desc}</td>
                    <td>${newElement.updated}</td>
                `;
                tr.className = newElement.statusClass;
                oldElementsIndex++;
                newElementsIndex++;
                procRowIndex++; // 更新したので、インデックスは進める
            }
        }
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