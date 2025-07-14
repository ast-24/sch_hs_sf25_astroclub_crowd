export function statusNumToTextShort(statusNum) {
    switch (statusNum) {
        case 1:
            return '空';
        case 2:
            return '少';
        case 3:
            return '中';
        case 4:
            return '多';
        case 5:
            return '満';
        default:
            return '不明';
    }
}

export function statusNumToTextLong(statusNum) {
    switch (statusNum) {
        case 1:
            return '空いています';
        case 2:
            return '少し混雑しています';
        case 3:
            return '中程度の混雑です';
        case 4:
            return 'かなり混雑しています';
        case 5:
            return '満員です';
        default:
            return '不明な状態です';
    }
}