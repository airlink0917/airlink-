/**
 * UI操作・ユーティリティ関数
 */

class UIUtils {
    static showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    static formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static isToday(year, month, date) {
        const today = new Date();
        return year === today.getFullYear() &&
               month === today.getMonth() &&
               date === today.getDate();
    }

    static getDayName(date) {
        const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
        return `${date.getMonth() + 1}/${date.getDate()} ${days[date.getDay()]}`;
    }

    static getCampaignColor(campaignName) {
        const colors = {
            '東販連': '#E1BEE7',      // 薄い紫
            '東部作戦': '#81D4FA',    // 水色
            '中央作戦': '#FFF9C4',    // 薄い黄色
            '城南作戦': '#F8BBD0',    // ピンク
            '城北作戦': '#FFCC80',    // オレンジ
            '多摩作戦': '#FFCDD2'     // 薄い赤
        };
        return colors[campaignName] || '#C8E6C9';  // その他は黄緑
    }
}