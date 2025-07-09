/**
 * デバイス判定ユーティリティ
 */
export class DeviceDetector {
    /**
     * @param {string} baseUrl - アセットのベースURL
     */
    constructor(baseUrl = 'https://api-sf25-astroclub.ast24.dev') {
        this.baseUrl = baseUrl;
    }

    /**
     * デバイスタイプを判定
     * @returns {'pc'|'mobile'} デバイスタイプ
     */
    static getDeviceType() {
        // 768px以下をモバイルとして判定（一般的なブレークポイント）
        return window.innerWidth <= 768 ? 'mobile' : 'pc';
    }

    /**
     * デバイスタイプに応じたファイルパスを取得
     * @param {string} subPath - サブパス（空文字列の場合はルート）
     * @returns {string} デバイス対応ファイルパス
     */
    getDeviceSpecificPath(subPath = '') {
        const deviceType = DeviceDetector.getDeviceType();
        const fullPath = subPath ? `${this.baseUrl}${subPath}/` : this.baseUrl;
        return `${fullPath}${deviceType}.html`;
    }
}

/**
 * HTMLテンプレートローダー
 */
export class TemplateLoader {
    /**
     * HTMLテンプレートを読み込み
     * @param {string} templatePath - テンプレートファイルパス
     * @returns {Promise<string>} HTMLテンプレート文字列
     */
    static async loadTemplate(templatePath) {
        try {
            const response = await fetch(templatePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Template loading failed:', error);
            throw new Error(`テンプレートの読み込みに失敗しました: ${error.message}`);
        }
    }
}
