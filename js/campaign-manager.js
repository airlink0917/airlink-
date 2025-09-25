/**
 * 特拡管理クラス
 */

class CampaignManager {
    constructor(scheduleManager) {
        this.scheduleManager = scheduleManager;
    }

    // 特拡追加
    async addCampaign() {
        const campaignType = document.getElementById('campaignType').value;
        const customCampaign = document.getElementById('campaignCustom').value;
        const campaignDate = document.getElementById('campaignDate').value;
        const campaignNote = document.getElementById('campaignNote').value;

        // 特拡名の決定
        let campaignName = campaignType;
        if (campaignType === 'その他') {
            if (!customCampaign) {
                UIUtils.showNotification('特拡名を入力してください', 'error');
                return;
            }
            campaignName = customCampaign;
        } else if (!campaignType) {
            UIUtils.showNotification('特拡を選択してください', 'error');
            return;
        }

        if (!campaignDate) {
            UIUtils.showNotification('日付を選択してください', 'error');
            return;
        }

        // 選択されたメンバーを取得
        const selectedMembers = [];

        // 白木・境野
        if (document.getElementById('member-shiraki') && document.getElementById('member-shiraki').checked) {
            selectedMembers.push('白木');
        }
        if (document.getElementById('member-sakaino') && document.getElementById('member-sakaino').checked) {
            selectedMembers.push('境野');
        }

        // 担当者リストから
        document.querySelectorAll('#memberCheckboxes input[type="checkbox"]:checked').forEach(checkbox => {
            selectedMembers.push(checkbox.value);
        });

        // その他
        const otherMemberCheck = document.getElementById('member-other');
        const otherMemberText = document.getElementById('otherMemberText');
        if (otherMemberCheck && otherMemberCheck.checked) {
            const otherName = otherMemberText ? otherMemberText.value.trim() : '';
            if (otherName) {
                selectedMembers.push(otherName);
            }
        }

        if (selectedMembers.length === 0) {
            UIUtils.showNotification('参加メンバーを選択してください', 'error');
            return;
        }

        // 特拡の色を取得
        const campaignColor = UIUtils.getCampaignColor(campaignName);

        // 特拡イベントを作成（全メンバー共通）
        let description = `参加者: ${selectedMembers.join(', ')}`;
        if (campaignNote) {
            description += `\n備考: ${campaignNote}`;
        }

        this.scheduleManager.saveUndoState();

        const campaignEvent = {
            id: Date.now(),
            title: `${campaignName} (${selectedMembers.length}人)`,
            date: campaignDate,
            time: '',
            person: 'CAMPAIGN',  // 特拡用の特別な識別子
            description: description,
            color: campaignColor,
            campaignMembers: selectedMembers,
            note: campaignNote,
            isCampaign: true
        };

        // 先にローカルに追加
        this.scheduleManager.events.push(campaignEvent);
        this.scheduleManager.saveEvents();

        // Supabaseに保存（非同期で実行）
        if (typeof supabaseSync !== 'undefined' && supabaseSync.syncEnabled) {
            const savedEvent = await supabaseSync.saveEvent(campaignEvent);
            if (savedEvent && savedEvent.id) {
                // Supabaseから生成されたIDに更新
                const tempId = campaignEvent.id;
                const index = this.scheduleManager.events.findIndex(e => e.id === tempId);
                if (index !== -1) {
                    this.scheduleManager.events[index].id = savedEvent.id;
                    this.scheduleManager.saveEvents();
                }
            }
        }

        this.scheduleManager.renderCalendar();

        // フォームをリセット
        this.resetCampaignForm();

        UIUtils.showNotification(`${campaignName} を${selectedMembers.length}人に登録しました`);

        // フォームを閉じる
        this.closeCampaignForm();
    }

    // 特拡編集
    editCampaign(eventId) {
        const event = this.scheduleManager.events.find(e => e.id === eventId);
        if (!event || !event.isCampaign) return;

        this.scheduleManager.editingCampaignId = eventId;
        const campaignName = event.title.split(' (')[0];

        document.getElementById('editCampaignName').value = campaignName;
        document.getElementById('editCampaignDate').value = event.date;
        document.getElementById('editCampaignMembers').value = event.campaignMembers ? event.campaignMembers.join(', ') : '';
        document.getElementById('editCampaignNote').value = event.note || '';

        document.getElementById('campaignEditModal').style.display = 'block';
    }

    // 特拡編集保存
    async saveCampaignEdit() {
        const event = this.scheduleManager.events.find(e => e.id === this.scheduleManager.editingCampaignId);
        if (!event) return;

        const membersText = document.getElementById('editCampaignMembers').value;
        const members = membersText.split(',').map(m => m.trim()).filter(m => m);
        const note = document.getElementById('editCampaignNote').value;

        // メンバー数を更新
        const campaignName = event.title.split(' (')[0];
        event.title = `${campaignName} (${members.length}人)`;
        event.campaignMembers = members;
        event.note = note;

        // 説明を更新
        let description = `参加者: ${members.join(', ')}`;
        if (note) {
            description += `\n備考: ${note}`;
        }
        event.description = description;

        this.scheduleManager.saveEvents();

        // Supabaseに保存（simpleSyncを使用）
        if (typeof window.simpleSync !== 'undefined' && window.simpleSync.saveEvent) {
            await window.simpleSync.saveEvent(event);
        }

        this.scheduleManager.renderCalendar();
        UIUtils.showNotification('特拡が更新されました');
    }

    // 特拡フォームを閉じる
    closeCampaignForm() {
        document.getElementById('campaignForm').style.display = 'none';
        document.getElementById('showCampaignFormBtn').style.display = 'block';
        this.resetCampaignForm();
    }

    // 特拡フォームをリセット
    resetCampaignForm() {
        document.getElementById('campaignType').value = '';
        document.getElementById('campaignCustom').value = '';
        document.getElementById('campaignCustom').style.display = 'none';
        document.getElementById('campaignDate').value = '';
        document.getElementById('campaignNote').value = '';

        // チェックボックスをリセット
        const memberShiraki = document.getElementById('member-shiraki');
        const memberSakaino = document.getElementById('member-sakaino');
        const memberOther = document.getElementById('member-other');
        const otherMemberText = document.getElementById('otherMemberText');

        if (memberShiraki) memberShiraki.checked = false;
        if (memberSakaino) memberSakaino.checked = false;
        if (memberOther) memberOther.checked = false;
        if (otherMemberText) {
            otherMemberText.value = '';
            otherMemberText.style.display = 'none';
        }

        document.querySelectorAll('#memberCheckboxes input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    // 全メンバーを選択
    selectAllMembers() {
        const checkboxes = document.querySelectorAll('.member-checkbox, .staff-member-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);

        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });

        // その他は選択しない
        const otherMemberCheck = document.getElementById('member-other');
        const otherMemberText = document.getElementById('otherMemberText');
        if (otherMemberCheck) otherMemberCheck.checked = false;
        if (otherMemberText) {
            otherMemberText.style.display = 'none';
            otherMemberText.value = '';
        }
    }

    // メンバーチェックボックスを更新
    updateMemberCheckboxes() {
        const container = document.getElementById('memberCheckboxes');
        if (!container) return;

        let html = '';

        this.scheduleManager.staffMembers.forEach((member, index) => {
            if (member) {
                html += `
                    <label class="checkbox-label">
                        <input type="checkbox" value="${member}" data-index="${index}" class="member-checkbox staff-member-checkbox">
                        <span>${member}</span>
                    </label>
                `;
            }
        });

        if (html === '') {
            html = '<p class="no-members">担当者を先に登録してください</p>';
        }

        container.innerHTML = html;
    }
}