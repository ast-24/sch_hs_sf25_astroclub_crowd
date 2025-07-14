export class Container {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    setContent(html) {
        this.container.innerHTML = html;
    }
}
