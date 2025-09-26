/**
 * メインのスケジュール管理クラス - リファクタリング版
 */

class ScheduleManager {
    constructor() {
        this.events = this.loadEvents();
        this.currentDate = new Date();
        this.selectedEvent = null;
        this.filterPerson = '';
        this.staffMembers = this.loadStaffMembers();
        this.campaignMemo = this.loadCampaignMemo();
        this.undoHistory = [];
        this.maxUndoSteps = 10;
        this.selectedStaffFilter = 'all';
        this.editingScheduleId = null;
        this.editingCampaignId = null;
        this.editingStaffIndex = null;

        // サブマネージャーを初期化
        this.calendarRenderer = new CalendarRenderer(this);
        this.eventManager = new EventManager(this);
        this.campaignManager = new CampaignManager(this);

        this.init();
    }

    init() {
        this.initYearSelector();
        this.initMonthSelector();
        this.initStaffFilter();
        this.calendarRenderer.renderStaffHeader();
        this.calendarRenderer.renderCalendar();
        this.campaignManager.updateMemberCheckboxes();
        this.attachEventListeners();

        // 備考欄の初期値を設定
        const memoInput = document.getElementById('campaignMemo');
        if (memoInput) {
            memoInput.value = this.campaignMemo;
        }

        // アンドゥボタンの初期状態を設定
        this.updateUndoButton();

        // iOSでのレイアウト修正
        this.calendarRenderer.fixiOSLayout();
    }

    // データ操作メソッド
    loadEvents() {
        const stored = localStorage.getItem('scheduleEvents');
        return stored ? JSON.parse(stored) : [];
    }

    saveEvents() {
        localStorage.setItem('scheduleEvents', JSON.stringify(this.events));
    }

    loadStaffMembers() {
        const stored = localStorage.getItem('staffMembers');
        return stored ? JSON.parse(stored) : ['', '', '', '', '', '', '', '', ''];
    }

    async saveStaffMembers() {
        localStorage.setItem('staffMembers', JSON.stringify(this.staffMembers));
        this.initStaffFilter();

        // Supabaseに保存（リアルタイム同期を有効化）
        if (typeof supabaseSync !== 'undefined' && supabaseSync.syncEnabled) {
            const saved = await supabaseSync.saveStaffMembers(this.staffMembers);
            if (saved) {
                console.log('スタッフメンバーをSupabaseに同期しました');
            }
        }
    }

    loadCampaignMemo() {
        return localStorage.getItem('campaignMemo') || '';
    }

    async saveCampaignMemo(memo) {
        localStorage.setItem('campaignMemo', memo);

        // Supabaseに保存
        if (typeof supabaseSync !== 'undefined' && supabaseSync.syncEnabled) {
            await supabaseSync.saveCampaignMemo(memo);
        }
    }

    // アンドゥ機能
    saveUndoState() {
        const currentState = {
            events: JSON.parse(JSON.stringify(this.events)),
            staffMembers: JSON.parse(JSON.stringify(this.staffMembers)),
            campaignMemo: this.campaignMemo,
            timestamp: Date.now()
        };

        this.undoHistory.push(currentState);

        if (this.undoHistory.length > this.maxUndoSteps) {
            this.undoHistory.shift();
        }

        this.updateUndoButton();
    }

    undo() {
        if (this.undoHistory.length === 0) return;

        const previousState = this.undoHistory.pop();

        this.events = previousState.events;
        this.staffMembers = previousState.staffMembers;
        this.campaignMemo = previousState.campaignMemo;

        this.saveEvents();
        this.saveStaffMembers();
        this.saveCampaignMemo(this.campaignMemo);

        document.documentElement.style.setProperty('--staff-count', this.staffMembers.length);

        const memoInput = document.getElementById('campaignMemo');
        if (memoInput) {
            memoInput.value = this.campaignMemo;
        }

        this.calendarRenderer.renderStaffHeader();
        this.calendarRenderer.renderCalendar();
        this.campaignManager.updateMemberCheckboxes();
        this.updateUndoButton();
    }

    updateUndoButton() {
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.disabled = this.undoHistory.length === 0;
            undoBtn.style.opacity = this.undoHistory.length === 0 ? '0.5' : '1';
        }
    }

    // セレクター初期化
    initYearSelector() {
        const yearSelect = document.getElementById('yearSelect');
        if (!yearSelect) return;

        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 5;
        const endYear = currentYear + 5;

        yearSelect.innerHTML = '';

        for (let year = startYear; year <= endYear; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}`;
            if (year === this.currentDate.getFullYear()) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
    }

    initMonthSelector() {
        const monthSelect = document.getElementById('monthSelect');
        if (!monthSelect) return;

        monthSelect.innerHTML = '';

        for (let month = 1; month <= 12; month++) {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = `${month}`;
            if (month === this.currentDate.getMonth() + 1) {
                option.selected = true;
            }
            monthSelect.appendChild(option);
        }
    }

    initStaffFilter() {
        const filterSelect = document.getElementById('staffFilter');
        if (!filterSelect) return;

        // 既存のオプションをクリア（「全担当者」以外）
        while (filterSelect.options.length > 1) {
            filterSelect.remove(1);
        }

        // 担当者のオプションを追加
        this.staffMembers.forEach((staffName, index) => {
            if (staffName && staffName.trim() !== '') {
                const option = document.createElement('option');
                option.value = staffName;
                option.textContent = staffName;
                filterSelect.appendChild(option);
            }
        });
    }

    // スタッフ管理
    addStaffMember() {
        if (this.staffMembers.length >= 20) {
            UIUtils.showNotification('担当者は最大20人までです', 'error');
            return;
        }

        this.saveUndoState();
        this.staffMembers.push('');
        this.saveStaffMembers();
        this.calendarRenderer.renderStaffHeader();
        this.calendarRenderer.renderCalendar();
        UIUtils.showNotification('担当者欄を追加しました');
    }

    deleteStaffMember(index) {
        if (this.staffMembers.length <= 1) {
            UIUtils.showNotification('最低1人の担当者が必要です', 'error');
            return;
        }

        const staffName = this.staffMembers[index];

        if (staffName && !confirm(`担当者「${staffName}」を削除しますか？\nこの担当者の日程も削除されます。`)) {
            return;
        }

        this.saveUndoState();

        // 該当する担当者のイベントを削除
        if (staffName) {
            this.events = this.events.filter(event => event.person !== staffName);
            this.saveEvents();
        }

        // 担当者リストから削除
        this.staffMembers.splice(index, 1);
        this.saveStaffMembers();

        // 画面を更新
        this.calendarRenderer.renderStaffHeader();
        this.calendarRenderer.renderCalendar();
        this.campaignManager.updateMemberCheckboxes();

        UIUtils.showNotification('担当者を削除しました');
    }

    // セルクリック処理
    cellClick(event, date, person, staffIndex) {
        event.stopPropagation();
        const cell = event.currentTarget;

        // すでに入力フィールドがある場合は何もしない
        if (cell.querySelector('input')) return;

        // 担当者が未入力の場合
        if (!person) {
            const staffInput = document.getElementById(`staff-${staffIndex}`);
            if (staffInput) staffInput.focus();
            UIUtils.showNotification('担当者名を先に入力してください', 'error');
            return;
        }

        // 入力フィールドを作成
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'inline-edit-input';
        input.placeholder = '予定を入力';

        // エンターキーで保存
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const title = input.value.trim();
                if (title) {
                    this.eventManager.addQuickEvent(date, person, title);
                }
                input.remove();
            } else if (e.key === 'Escape') {
                input.remove();
            }
        });

        // フォーカスが外れたら保存
        input.addEventListener('blur', () => {
            const title = input.value.trim();
            if (title) {
                this.eventManager.addQuickEvent(date, person, title);
            }
            input.remove();
        });

        cell.appendChild(input);
        input.focus();
    }

    // 委譲メソッド（サブクラスへの橋渡し）
    renderCalendar() {
        this.calendarRenderer.renderCalendar();
    }

    renderStaffHeader() {
        this.calendarRenderer.renderStaffHeader();
    }

    updateMemberCheckboxes() {
        this.campaignManager.updateMemberCheckboxes();
    }

    // 月移動
    updateYearSelector() {
        const yearSelect = document.getElementById('yearSelect');
        if (yearSelect) {
            yearSelect.value = this.currentDate.getFullYear();
        }
    }

    updateMonthSelector() {
        const monthSelect = document.getElementById('monthSelect');
        if (monthSelect) {
            monthSelect.value = this.currentDate.getMonth() + 1;
        }
    }

    // 印刷機能
    printCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1;
        const originalTitle = document.title;

        document.title = `日程管理_${year}年${month}月`;
        window.print();

        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);

        UIUtils.showNotification('印刷ダイアログを開きました');
    }

    // スタッフ編集モーダル
    openStaffEditModal(index) {
        this.editingStaffIndex = index;
        const staffName = this.staffMembers[index] || '';

        const editStaffNameInput = document.getElementById('editStaffName');
        const staffEditModal = document.getElementById('staffEditModal');
        const deleteBtn = document.getElementById('deleteStaffBtn');

        if (editStaffNameInput) editStaffNameInput.value = staffName;
        if (staffEditModal) staffEditModal.style.display = 'block';

        // 削除ボタンの表示制御
        if (deleteBtn) {
            if (this.staffMembers.length <= 1) {
                deleteBtn.style.display = 'none';
            } else {
                deleteBtn.style.display = 'inline-block';
            }
        }
    }

    saveStaffEdit() {
        const editStaffNameInput = document.getElementById('editStaffName');
        const staffEditModal = document.getElementById('staffEditModal');

        if (!editStaffNameInput) return;

        const newName = editStaffNameInput.value.trim();
        const oldName = this.staffMembers[this.editingStaffIndex];

        if (newName !== oldName) {
            this.saveUndoState();
            this.staffMembers[this.editingStaffIndex] = newName;
            this.saveStaffMembers();
            this.calendarRenderer.renderStaffHeader();
            this.calendarRenderer.renderCalendar();
            this.campaignManager.updateMemberCheckboxes();
            UIUtils.showNotification('担当者名を更新しました');
        }

        if (staffEditModal) staffEditModal.style.display = 'none';
    }

    deleteStaffFromModal() {
        if (this.staffMembers.length <= 1) {
            UIUtils.showNotification('最低1人の担当者が必要です', 'error');
            return;
        }

        const staffName = this.staffMembers[this.editingStaffIndex];

        if (staffName && !confirm(`担当者「${staffName}」を削除しますか？\nこの担当者の日程も削除されます。`)) {
            return;
        }

        this.deleteStaffMember(this.editingStaffIndex);
        const staffEditModal = document.getElementById('staffEditModal');
        if (staffEditModal) staffEditModal.style.display = 'none';
    }

    // イベントリスナー設定
    attachEventListeners() {
        // アンドゥボタン
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                this.undo();
            });
        }

        // 備考欄のイベントリスナー
        const campaignMemo = document.getElementById('campaignMemo');
        if (campaignMemo) {
            campaignMemo.addEventListener('input', (e) => {
                this.campaignMemo = e.target.value;
                this.saveCampaignMemo(this.campaignMemo);
            });
        }

        // 印刷ボタン
        const printBtn = document.getElementById('printBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printCalendar();
            });
        }

        // 月移動ボタン
        const prevMonth = document.getElementById('prevMonth');
        if (prevMonth) {
            prevMonth.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.updateYearSelector();
                this.updateMonthSelector();
                this.calendarRenderer.renderCalendar();
            });
        }

        const nextMonth = document.getElementById('nextMonth');
        if (nextMonth) {
            nextMonth.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.updateYearSelector();
                this.updateMonthSelector();
                this.calendarRenderer.renderCalendar();
            });
        }

        // 年月選択
        const yearSelect = document.getElementById('yearSelect');
        if (yearSelect) {
            yearSelect.addEventListener('change', (e) => {
                this.currentDate.setFullYear(parseInt(e.target.value));
                this.calendarRenderer.renderCalendar();
            });
        }

        const monthSelect = document.getElementById('monthSelect');
        if (monthSelect) {
            monthSelect.addEventListener('change', (e) => {
                this.currentDate.setMonth(parseInt(e.target.value) - 1);
                this.updateYearSelector();
                this.calendarRenderer.renderCalendar();
            });
        }

        // スタッフフィルター
        const staffFilter = document.getElementById('staffFilter');
        if (staffFilter) {
            staffFilter.addEventListener('change', (e) => {
                this.selectedStaffFilter = e.target.value;
                this.calendarRenderer.renderCalendar();
            });
        }

        // ウィンドウリサイズ・方向変更
        window.addEventListener('resize', () => {
            this.calendarRenderer.fixiOSLayout();
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.calendarRenderer.fixiOSLayout();
            }, 100);
        });

        this.attachCampaignFormListeners();
        this.attachModalListeners();
    }

    attachCampaignFormListeners() {
        // 特拡タイプ選択
        const campaignType = document.getElementById('campaignType');
        if (campaignType) {
            campaignType.addEventListener('change', (e) => {
                const customInput = document.getElementById('campaignCustom');
                if (customInput) {
                    if (e.target.value === 'その他') {
                        customInput.style.display = 'inline-block';
                        customInput.required = true;
                    } else {
                        customInput.style.display = 'none';
                        customInput.required = false;
                        customInput.value = '';
                    }
                }
            });
        }

        // 特拡フォーム表示・非表示
        const showCampaignFormBtn = document.getElementById('showCampaignFormBtn');
        if (showCampaignFormBtn) {
            showCampaignFormBtn.addEventListener('click', () => {
                const campaignForm = document.getElementById('campaignForm');
                if (campaignForm) campaignForm.style.display = 'block';
                showCampaignFormBtn.style.display = 'none';
            });
        }

        const closeCampaignBtn = document.getElementById('closeCampaignFormBtn');
        if (closeCampaignBtn) {
            closeCampaignBtn.addEventListener('click', () => {
                this.campaignManager.closeCampaignForm();
            });
        }

        const cancelCampaignBtn = document.getElementById('cancelCampaignBtn');
        if (cancelCampaignBtn) {
            cancelCampaignBtn.addEventListener('click', () => {
                this.campaignManager.closeCampaignForm();
            });
        }

        // 特拡保存ボタン
        const saveCampaignBtn = document.getElementById('saveCampaignBtn');
        if (saveCampaignBtn) {
            saveCampaignBtn.addEventListener('click', () => {
                this.campaignManager.addCampaign();
            });
        }

        // その他メンバー
        const otherMemberCheck = document.getElementById('member-other');
        const otherMemberText = document.getElementById('otherMemberText');
        if (otherMemberCheck && otherMemberText) {
            otherMemberCheck.addEventListener('change', (e) => {
                if (e.target.checked) {
                    otherMemberText.style.display = 'inline-block';
                    otherMemberText.required = true;
                } else {
                    otherMemberText.style.display = 'none';
                    otherMemberText.required = false;
                    otherMemberText.value = '';
                }
            });
        }

        // 一括選択ボタン
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.campaignManager.selectAllMembers();
            });
        }
    }

    attachModalListeners() {
        // イベントモーダル
        const eventModal = document.getElementById('eventModal');
        const closeBtn = eventModal?.querySelector('.close');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                eventModal.style.display = 'none';
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === eventModal) {
                eventModal.style.display = 'none';
            }
        });

        // 日程編集モーダル
        const scheduleEditModal = document.getElementById('scheduleEditModal');
        const scheduleEditClose = scheduleEditModal?.querySelector('.close');

        if (scheduleEditClose) {
            scheduleEditClose.addEventListener('click', () => {
                scheduleEditModal.style.display = 'none';
            });
        }

        const saveEditBtn = document.getElementById('saveEditBtn');
        if (saveEditBtn) {
            saveEditBtn.addEventListener('click', () => {
                this.eventManager.saveScheduleEdit();
                scheduleEditModal.style.display = 'none';
            });
        }

        const deleteEventBtn = document.getElementById('deleteEventBtn');
        if (deleteEventBtn) {
            deleteEventBtn.addEventListener('click', async () => {
                await this.eventManager.deleteSchedule();
            });
        }

        // 色選択ボタン
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // スタッフ編集モーダル
        const staffEditModal = document.getElementById('staffEditModal');
        const staffEditClose = staffEditModal?.querySelector('.close');

        if (staffEditClose) {
            staffEditClose.addEventListener('click', () => {
                staffEditModal.style.display = 'none';
            });
        }

        const saveStaffBtn = document.getElementById('saveStaffBtn');
        if (saveStaffBtn) {
            saveStaffBtn.addEventListener('click', () => {
                this.saveStaffEdit();
            });
        }

        const deleteStaffBtn = document.getElementById('deleteStaffBtn');
        if (deleteStaffBtn) {
            deleteStaffBtn.addEventListener('click', () => {
                this.deleteStaffFromModal();
            });
        }

        const cancelStaffBtn = document.getElementById('cancelStaffBtn');
        if (cancelStaffBtn) {
            cancelStaffBtn.addEventListener('click', () => {
                staffEditModal.style.display = 'none';
            });
        }
    }
}

// 初期化
let scheduleManager;
document.addEventListener('DOMContentLoaded', () => {
    scheduleManager = new ScheduleManager();
});