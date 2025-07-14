import { statusNumToTextLong, statusNumToTextShort } from "../../../cmn/utils.mjs";

export class Render {
    constructor(container, deviceDetector, navigator, assetLoader, apiClient) {
        this.container = container;
        this.deviceDetector = deviceDetector;
        this.navigator = navigator;
        this.assetLoader = assetLoader;
        this.apiClient = apiClient;
    }

    async handler(params) {
        document.title = "混雑状況 - 天文部 文化祭 混雑状況管理システム";
        this.#backgroundStarRender();
        window.addEventListener('resize', () => {
            this.#backgroundStarRender();
        });

        await this.#dataRefresher();
        this.interval_dataRefresher = setInterval(async () => {
            await this.#dataRefresher();
        }, 30000);
    }

    async cleaner() {
        window.removeEventListener('resize', this.#backgroundStarRender);

        if (this.interval_dataRefresher) {
            clearInterval(this.interval_dataRefresher);
            this.interval_dataRefresher = null;
        }
    }

    #backgroundStarRender() {
        let canvas = document.getElementsByClassName('background-star');
        if (canvas.length == 0) {
            throw new Error('背景の星描画用のキャンバスが見つかりません。');
        }
        canvas = canvas[0];
        const ctx = canvas.getContext('2d');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const baseDensity = 0.0015;
        const count = Math.floor(canvas.width * canvas.height * baseDensity);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < count; i++) {
            const params = this.#backgroundStarRenderGenParams({
                width: canvas.width,
                height: canvas.height
            });

            ctx.beginPath();
            ctx.arc(params.x, params.y, params.radius, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(${params.r}, ${params.g}, ${params.b}, ${params.opacity})`;
            ctx.shadowColor = 'white';
            ctx.shadowBlur = params.shadowBlur;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // -> { x, y, radius, opacity , r , g, b , shadowBlur }
    #backgroundStarRenderGenParams(canvas_size) {
        let ret = {
            x: 0,
            y: 0,
            radius: 0,
            opacity: 0,
            shadowBlur: 0,
            r: 255,
            g: 255,
            b: 255
        };

        ret.x = Math.random() * canvas_size.width;
        ret.y = Math.random() * canvas_size.height;

        ret.radius = Math.random() * 0.5 + 0.5;
        ret.opacity = Math.random() * 0.5 + 0.2;
        if (Math.random() < 0.1) {
            ret.radius *= 2;
            ret.opacity *= 2;
        }
        if (Math.random() < 0.005) {
            ret.radius *= 4;
            ret.opacity *= 4;
        }
        if (Math.random() < 0.0001) {
            ret.radius *= 8;
            ret.opacity *= 8;
        }

        if (Math.random() < 0.5) {
            ret.r = Math.random() * 155 + 100;
            ret.g = Math.random() * 155 + 100;
            ret.b = Math.random() * 155 + 100;
        }

        ret.shadowBlur = Math.random() * 1.5;

        return ret;
    }

    async #dataRefresher() {
        const lastUpdated = document.getElementById('lastUpdated');
        lastUpdated.textContent = new Date().toLocaleString();

        const rooms_info = await this.apiClient.getRooms();
        const crowd_status = await this.apiClient.getCrowdStatus();

        const tableBody = document.getElementById('dataTableBody');
        tableBody.innerHTML = '';
        for (const [room_id, room] of rooms_info.entries()) {
            const crowd = crowd_status.get(room_id);
            const statusText = crowd ? (
                this.deviceDetector.isMobi() ?
                    statusNumToTextShort(crowd.status) :
                    statusNumToTextLong(crowd.status)
            ) : '?';
            const roomName = `${room.name} (${room.floor}F)`;
            const desc = room.desc || '-';
            const updated = crowd && crowd.updated_at ? new Date(crowd.updated_at).toLocaleTimeString() : '-';
            const tr = document.createElement('tr');

            // 混雑状況に応じた背景色クラスを追加
            if (crowd && crowd.status) {
                tr.classList.add(`crowd-status-${crowd.status}`);
            }

            tr.innerHTML = `
                <td>${statusText}</td>
                <td>${roomName}</td>
                <td>${desc}</td>
                <td>${updated}</td>
            `;
            tableBody.appendChild(tr);
        }
    }
}