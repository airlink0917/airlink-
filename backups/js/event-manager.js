/**
 * イベント管理クラス
 */

class EventManager {
    constructor(scheduleManager) {
        this.scheduleManager = scheduleManager;
    }

    // イベント追加（クイック入力）
    async addQuickEvent(date, person, title) {
        const tempId = 'temp_' + Date.now();
        const event = {
            id: tempId,
            title: title,
            date: date,
            time: '',
            person: person,
            description: '',
            color: 'transparent',
            note: ''
        };

        // 先にローカルに追加
        this.scheduleManager.events.push(event);
        this.scheduleManager.saveEvents();

        // Supabaseに保存（非同期で実行）
        if (typeof supabaseSync !== 'undefined' && supabaseSync.syncEnabled) {
            const savedEvent = await supabaseSync.saveEvent(event);
            if (savedEvent && savedEvent.id) {
                // Supabaseから返されたIDで更新
                const index = this.scheduleManager.events.findIndex(e => e.id === tempId);
                if (index !== -1) {
                    this.scheduleManager.events[index].id = savedEvent.id;
                    this.scheduleManager.saveEvents();
                }
            }
        }
        this.scheduleManager.renderCalendar();
        UIUtils.showNotification('予定が追加されました');
    }

    // イベント削除
    async deleteEvent(eventId) {
        // IDを文字列に変換して比較
        const eventToDelete = this.scheduleManager.events.find(e => String(e.id) === String(eventId));

        if (eventToDelete) {
            this.scheduleManager.events = this.scheduleManager.events.filter(e => String(e.id) !== String(eventId));
            this.scheduleManager.saveEvents();

            // Supabaseから削除（simpleSyncを使用）
            if (typeof window.simpleSync !== 'undefined' && window.simpleSync.deleteEvent) {
                await window.simpleSync.deleteEvent(eventToDelete.id);
            }

            this.scheduleManager.renderCalendar();
            UIUtils.showNotification('予定が削除されました');
        } else {
            console.error('削除対象が見つかりません:', eventId);
        }
    }

    // 日程編集モーダルを開く
    openScheduleEditModal(eventId) {
        // IDを文字列に変換して比較
        const event = this.scheduleManager.events.find(e => String(e.id) === String(eventId));
        if (!event || event.isCampaign) return;

        // IDを保存（元の型を維持）
        this.scheduleManager.editingScheduleId = event.id;

        // 現在の値をセット
        document.getElementById('editTitle').value = event.title || '';
        document.getElementById('editTime').value = event.time || '';
        document.getElementById('editNote').value = event.note || '';

        // 色選択ボタンの初期状態を設定
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('selected');
            const btnColor = btn.dataset.color;
            if ((event.color === btnColor) || (!event.color && btnColor === 'transparent')) {
                btn.classList.add('selected');
            }
        });

        // モーダルを表示
        document.getElementById('scheduleEditModal').style.display = 'block';
    }

    // 日程編集を保存
    async saveScheduleEdit() {
        const event = this.scheduleManager.events.find(e => e.id === this.scheduleManager.editingScheduleId);
        if (!event) return;

        const title = document.getElementById('editTitle').value.trim();
        const time = document.getElementById('editTime').value.trim();
        const note = document.getElementById('editNote').value.trim();
        const selectedColorBtn = document.querySelector('.color-btn.selected');
        const color = selectedColorBtn ? selectedColorBtn.dataset.color : 'transparent';

        if (!title) {
            UIUtils.showNotification('タイトルを入力してください', 'error');
            return;
        }

        this.scheduleManager.saveUndoState();
        event.title = title;
        event.time = time;
        event.note = note;
        event.color = color;

        this.scheduleManager.saveEvents();

        // Supabaseに保存（simpleSyncを使用）
        if (typeof window.simpleSync !== 'undefined' && window.simpleSync.saveEvent) {
            await window.simpleSync.saveEvent(event);
        }

        this.scheduleManager.renderCalendar();
        UIUtils.showNotification('日程が更新されました');
    }

    // 日程を削除
    async deleteSchedule() {
        console.log('削除開始 - editingScheduleId:', this.scheduleManager.editingScheduleId, 'Type:', typeof this.scheduleManager.editingScheduleId);

        if (confirm('この日程を削除してもよろしいですか？')) {
            this.scheduleManager.saveUndoState();

            // IDの比較を最適化 - 文字列と数値の両方に対応
            const eventToDelete = this.scheduleManager.events.find(e => {
                // IDを文字列に変換して比較
                return String(e.id) === String(this.scheduleManager.editingScheduleId);
            });

            console.log('削除対象イベント:', eventToDelete);
            console.log('削除前のイベント数:', this.scheduleManager.events.length);

            if (eventToDelete) {
                // イベントをフィルタリング
                this.scheduleManager.events = this.scheduleManager.events.filter(e => {
                    // IDを文字列に変換して比較
                    return String(e.id) !== String(this.scheduleManager.editingScheduleId);
                });

                console.log('削除後のイベント数:', this.scheduleManager.events.length);
                this.scheduleManager.saveEvents();

                // Supabaseから削除（simpleSyncを使用）
                if (typeof window.simpleSync !== 'undefined' && window.simpleSync.deleteEvent) {
                    console.log('Supabaseから削除:', eventToDelete.id);
                    await window.simpleSync.deleteEvent(eventToDelete.id);
                }

                UIUtils.showNotification('日程が削除されました');
            } else {
                console.error('削除対象が見つかりません');
                UIUtils.showNotification('エラー: 削除対象が見つかりません', 'error');
            }

            // モーダルを閉じる
            document.getElementById('scheduleEditModal').style.display = 'none';
            this.scheduleManager.renderCalendar();
        }
    }

    // イベントモーダル表示
    showEventModal(eventId) {
        const event = this.scheduleManager.events.find(e => e.id === eventId);
        if (!event) return;

        this.scheduleManager.selectedEvent = eventId;
        const modal = document.getElementById('eventModal');
        document.getElementById('modalTitle').textContent = event.title;

        let bodyHtml = `
            <p><strong>日付:</strong> ${event.date}</p>
            ${event.time ? `<p><strong>時刻:</strong> ${event.time}</p>` : ''}
            ${event.person ? `<p><strong>担当者:</strong> ${event.person}</p>` : ''}
            ${event.description ? `<p><strong>詳細:</strong><br>${event.description.replace(/\n/g, '<br>')}</p>` : ''}
        `;

        document.getElementById('modalBody').innerHTML = bodyHtml;
        modal.style.display = 'block';
    }

    // フィルタリングされたイベントを取得
    getFilteredEvents(dateStr) {
        return this.scheduleManager.events.filter(event => {
            const dateMatch = event.date === dateStr;

            // スタッフフィルターの処理
            let personMatch = true;
            if (this.scheduleManager.selectedStaffFilter && this.scheduleManager.selectedStaffFilter !== 'all') {
                // 特拡イベントの場合はcampaignMembersをチェック
                if (event.isCampaign) {
                    personMatch = event.campaignMembers &&
                                  event.campaignMembers.includes(this.scheduleManager.selectedStaffFilter);
                } else {
                    // 通常イベントの場合はpersonをチェック
                    personMatch = event.person === this.scheduleManager.selectedStaffFilter;
                }
            }

            return dateMatch && personMatch;
        });
    }
}