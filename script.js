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
        this.init();
    }

    init() {
        this.initYearSelector();
        this.renderStaffHeader();
        this.renderCalendar();
        this.updateMemberCheckboxes();
        this.attachEventListeners();

        // 備考欄の初期値を設定
        const memoInput = document.getElementById('campaignMemo');
        if (memoInput) {
            memoInput.value = this.campaignMemo;
        }

        // アンドゥボタンの初期状態を設定
        this.updateUndoButton();

        // iOSでのレイアウト修正
        this.fixiOSLayout();
    }

    loadEvents() {
        const stored = localStorage.getItem('scheduleEvents');
        return stored ? JSON.parse(stored) : [];
    }

    saveEvents() {
        localStorage.setItem('scheduleEvents', JSON.stringify(this.events));
        // Supabaseへの保存は個別のメソッド（addEvent、deleteEventなど）で処理
        // ここではLocalStorageのみ更新して、無限ループを防ぐ
    }

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

        this.renderStaffHeader();
        this.renderCalendar();
        this.updateMemberCheckboxes();
        this.updateUndoButton();
    }

    updateUndoButton() {
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.disabled = this.undoHistory.length === 0;
            undoBtn.style.opacity = this.undoHistory.length === 0 ? '0.5' : '1';
        }
    }

    loadStaffMembers() {
        const stored = localStorage.getItem('staffMembers');
        return stored ? JSON.parse(stored) : ['', '', '', '', '', '', '', '', ''];
    }

    async saveStaffMembers() {
        localStorage.setItem('staffMembers', JSON.stringify(this.staffMembers));

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

    renderStaffHeader() {
        const staffInputsDiv = document.getElementById('staffInputs');
        let html = '<div class="date-header-cell">日付</div>'; // 日付ヘッダー

        // CSS変数で担当者数を設定
        document.documentElement.style.setProperty('--staff-count', this.staffMembers.length);

        // iOS用のレイアウト修正を適用
        setTimeout(() => {
            this.fixiOSLayout();
        }, 0);

        // 担当者入力欄を動的に生成
        for (let i = 0; i < this.staffMembers.length; i++) {
            html += `
                <div class="staff-input-cell">
                    <div class="staff-input-wrapper">
                        <input type="text"
                               class="staff-input"
                               id="staff-${i}"
                               placeholder="担当者"
                               value="${this.staffMembers[i] || ''}"
                               data-index="${i}">
                        ${this.staffMembers.length > 1 ? `
                            <button type="button" class="delete-staff-btn" data-index="${i}" title="削除">
                                ×
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // プラスボタンを追加（最大20人まで）
        if (this.staffMembers.length < 20) {
            html += `
                <button type="button" class="add-staff-btn" id="addStaffBtn" title="担当者を追加">
                    +
                </button>
            `;
        }

        staffInputsDiv.innerHTML = html;

        // Add event listeners for staff input changes
        document.querySelectorAll('.staff-input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.saveUndoState();
                const index = parseInt(e.target.dataset.index);
                this.staffMembers[index] = e.target.value;
                this.saveStaffMembers();
                this.updateMemberCheckboxes();
                this.renderCalendar();
            });
        });

        // Add event listener for add staff button
        const addBtn = document.getElementById('addStaffBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addStaffMember();
            });
        }

        // Add event listeners for delete staff buttons
        document.querySelectorAll('.delete-staff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.deleteStaffMember(index);
            });
        });
    }

    initYearSelector() {
        const yearSelect = document.getElementById('yearSelect');
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 5;
        const endYear = currentYear + 5;

        for (let year = startYear; year <= endYear; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}年`;
            if (year === this.currentDate.getFullYear()) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
    }

    attachEventListeners() {
        // アンドゥボタン
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undo();
        });

        // 備考欄のイベントリスナー
        document.getElementById('campaignMemo').addEventListener('input', (e) => {
            this.campaignMemo = e.target.value;
            this.saveCampaignMemo(this.campaignMemo);
        });

        // 印刷ボタン
        document.getElementById('printBtn').addEventListener('click', () => {
            this.printCalendar();
        });

        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.updateYearSelector();
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.updateYearSelector();
            this.renderCalendar();
        });

        document.getElementById('yearSelect').addEventListener('change', (e) => {
            this.currentDate.setFullYear(parseInt(e.target.value));
            this.renderCalendar();
        });

        // ウィンドウリサイズ時のレイアウト修正
        window.addEventListener('resize', () => {
            this.fixiOSLayout();
        });

        // 画面方向変更時のレイアウト修正
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.fixiOSLayout();
            }, 100);
        });

        // 特拡タイプ選択時の処理
        document.getElementById('campaignType').addEventListener('change', (e) => {
            const customInput = document.getElementById('campaignCustom');
            if (e.target.value === 'その他') {
                customInput.style.display = 'inline-block';
                customInput.required = true;
            } else {
                customInput.style.display = 'none';
                customInput.required = false;
                customInput.value = '';
            }
        });

        // 特拡フォームの表示・非表示
        document.getElementById('showCampaignFormBtn').addEventListener('click', () => {
            document.getElementById('campaignForm').style.display = 'block';
            document.getElementById('showCampaignFormBtn').style.display = 'none';
        });

        document.getElementById('closeCampaignFormBtn').addEventListener('click', () => {
            this.closeCampaignForm();
        });

        document.getElementById('cancelCampaignFormBtn').addEventListener('click', () => {
            this.closeCampaignForm();
        });

        // 特拡登録ボタン
        document.getElementById('addCampaignBtn').addEventListener('click', () => {
            this.addCampaign();
        });

        // その他メンバーチェックボックス
        document.getElementById('otherMemberCheck').addEventListener('change', (e) => {
            const otherInput = document.getElementById('otherMemberName');
            if (e.target.checked) {
                otherInput.style.display = 'inline-block';
                otherInput.required = true;
            } else {
                otherInput.style.display = 'none';
                otherInput.required = false;
                otherInput.value = '';
            }
        });

        // 一括選択ボタン
        document.getElementById('selectAllBtn').addEventListener('click', () => {
            this.selectAllMembers();
        });

        const modal = document.getElementById('eventModal');
        const closeBtn = document.querySelector('.close');

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        document.getElementById('deleteEventBtn').addEventListener('click', () => {
            this.deleteEvent(this.selectedEvent);
            modal.style.display = 'none';
        });

        document.getElementById('editEventBtn').addEventListener('click', () => {
            const event = this.events.find(e => e.id === this.selectedEvent);
            if (event && event.isCampaign) {
                this.editCampaign(this.selectedEvent);
            } else {
                this.editEvent(this.selectedEvent);
            }
            modal.style.display = 'none';
        });

        // 特拡編集モーダルのイベント
        const campaignEditModal = document.getElementById('campaignEditModal');
        document.getElementById('campaignEditClose').addEventListener('click', () => {
            campaignEditModal.style.display = 'none';
        });

        document.getElementById('saveCampaignBtn').addEventListener('click', () => {
            this.saveCampaignEdit();
            campaignEditModal.style.display = 'none';
        });

        document.getElementById('cancelCampaignBtn').addEventListener('click', () => {
            campaignEditModal.style.display = 'none';
        });

        // 日程編集モーダルのイベント
        const scheduleEditModal = document.getElementById('scheduleEditModal');
        document.getElementById('scheduleEditClose').addEventListener('click', () => {
            scheduleEditModal.style.display = 'none';
        });

        document.getElementById('saveScheduleBtn').addEventListener('click', () => {
            this.saveScheduleEdit();
            scheduleEditModal.style.display = 'none';
        });

        document.getElementById('deleteScheduleBtn').addEventListener('click', async () => {
            await this.deleteSchedule();
            // モーダルを閉じる処理はdeleteSchedule内で実行
        });

        document.getElementById('cancelScheduleBtn').addEventListener('click', () => {
            scheduleEditModal.style.display = 'none';
        });

        // 色選択ボタンのイベント
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }


    async deleteEvent(eventId) {
        // IDを文字列に変換して比較
        const eventToDelete = this.events.find(e => String(e.id) === String(eventId));

        if (eventToDelete) {
            this.events = this.events.filter(e => String(e.id) !== String(eventId));
            this.saveEvents();

            // Supabaseから削除（simpleSyncを使用）
            if (typeof window.simpleSync !== 'undefined' && window.simpleSync.deleteEvent) {
                await window.simpleSync.deleteEvent(eventToDelete.id);
            }

            this.renderCalendar();
            this.showNotification('予定が削除されました');
        } else {
            console.error('削除対象が見つかりません:', eventId);
        }
    }

    editEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        // 特拡イベントの場合は既存の編集処理
        if (event.isCampaign) {
            this.editCampaign(eventId);
        } else {
            // 通常のスケジュールは新しい編集モーダルを開く
            this.openScheduleEditModal(eventId);
        }
    }

    editCampaign(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event || !event.isCampaign) return;

        this.editingCampaignId = eventId;
        const campaignName = event.title.split(' (')[0];

        document.getElementById('editCampaignName').value = campaignName;
        document.getElementById('editCampaignDate').value = event.date;
        document.getElementById('editCampaignMembers').value = event.campaignMembers ? event.campaignMembers.join(', ') : '';
        document.getElementById('editCampaignNote').value = event.note || '';

        document.getElementById('campaignEditModal').style.display = 'block';
    }

    async saveCampaignEdit() {
        const event = this.events.find(e => e.id === this.editingCampaignId);
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

        this.saveEvents();

        // Supabaseに保存（simpleSyncを使用）
        if (typeof window.simpleSync !== 'undefined' && window.simpleSync.saveEvent) {
            await window.simpleSync.saveEvent(event);
        }

        this.renderCalendar();
        this.showNotification('特拡が更新されました');
    }

    // 日程編集モーダルを開く
    openScheduleEditModal(eventId) {
        // IDを文字列に変換して比較
        const event = this.events.find(e => String(e.id) === String(eventId));
        if (!event || event.isCampaign) return;

        // IDを保存（元の型を維持）
        this.editingScheduleId = event.id;

        // 現在の値をセット
        document.getElementById('editScheduleTitle').value = event.title || '';
        document.getElementById('editScheduleNote').value = event.note || '';

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
        const event = this.events.find(e => e.id === this.editingScheduleId);
        if (!event) return;

        const title = document.getElementById('editScheduleTitle').value.trim();
        const note = document.getElementById('editScheduleNote').value.trim();
        const selectedColorBtn = document.querySelector('.color-btn.selected');
        const color = selectedColorBtn ? selectedColorBtn.dataset.color : 'transparent';

        if (!title) {
            this.showNotification('タイトルを入力してください', 'error');
            return;
        }

        this.saveUndoState();
        event.title = title;
        event.note = note;
        event.color = color;

        this.saveEvents();

        // Supabaseに保存（simpleSyncを使用）
        if (typeof window.simpleSync !== 'undefined' && window.simpleSync.saveEvent) {
            await window.simpleSync.saveEvent(event);
        }

        this.renderCalendar();
        this.showNotification('日程が更新されました');
    }

    // 日程を削除
    async deleteSchedule() {
        console.log('削除開始 - editingScheduleId:', this.editingScheduleId, 'Type:', typeof this.editingScheduleId);

        if (confirm('この日程を削除してもよろしいですか？')) {
            this.saveUndoState();

            // IDの比較を最適化 - 文字列と数値の両方に対応
            const eventToDelete = this.events.find(e => {
                // IDを文字列に変換して比較
                return String(e.id) === String(this.editingScheduleId);
            });

            console.log('削除対象イベント:', eventToDelete);
            console.log('削除前のイベント数:', this.events.length);

            if (eventToDelete) {
                // イベントをフィルタリング
                this.events = this.events.filter(e => {
                    // IDを文字列に変換して比較
                    return String(e.id) !== String(this.editingScheduleId);
                });

                console.log('削除後のイベント数:', this.events.length);
                this.saveEvents();

                // Supabaseから削除（simpleSyncを使用）
                if (typeof window.simpleSync !== 'undefined' && window.simpleSync.deleteEvent) {
                    console.log('Supabaseから削除:', eventToDelete.id);
                    await window.simpleSync.deleteEvent(eventToDelete.id);
                }

                this.showNotification('日程が削除されました');
            } else {
                console.error('削除対象が見つかりません');
                this.showNotification('エラー: 削除対象が見つかりません', 'error');
            }

            // モーダルを閉じる
            document.getElementById('scheduleEditModal').style.display = 'none';
            this.renderCalendar();
        }
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        document.getElementById('currentMonth').textContent = `${month + 1}月`;

        let html = '<div class="vertical-calendar-grid">';

        // 日付を縦1列に表示
        for (let date = 1; date <= lastDate; date++) {
            const dayOfWeek = (firstDay + date - 1) % 7;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
            const dayEvents = this.getFilteredEvents(dateStr);
            const isToday = this.isToday(year, month, date);
            const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
            const dayName = weekDays[dayOfWeek];

            let className = 'date-row';
            if (dayOfWeek === 0) className += ' sunday';
            else if (dayOfWeek === 6) className += ' saturday';
            if (isToday) className += ' today';

            html += `<div class="${className}" data-date="${dateStr}">`;
            html += `<div class="date-cell">`;
            html += `<span class="date-number">${month + 1}/${date}</span>`;
            html += `<span class="day-name">(${dayName})</span>`;
            html += `</div>`;

            // 9分割のセルを作成
            html += `<div class="events-grid">`;

            // 特拡イベントを確認
            const campaignEvents = dayEvents.filter(event => event.isCampaign);
            const hasCampaign = campaignEvents.length > 0;

            if (hasCampaign) {
                // 特拡がある日は特拡情報のみ表示
                html += `<div class="campaign-only">`;
                campaignEvents.forEach(event => {
                    html += `<div class="campaign-event-full"
                            style="background-color: ${event.color};"
                            onclick="event.stopPropagation(); scheduleManager.showEventModal(${event.id})"
                            title="${event.description}">`;
                    html += `<span class="campaign-title">${event.title}</span>`;
                    if (event.note) {
                        html += `<span class="campaign-note">${event.note}</span>`;
                    }
                    html += '</div>';
                });
                html += '</div>';
            } else {
                // 特拡がない日は通常の日程を表示
                for (let i = 0; i < this.staffMembers.length; i++) {
                const staffName = this.staffMembers[i];
                const staffEvents = dayEvents.filter(event =>
                    event.person === staffName && staffName !== '' && !event.isCampaign
                );

                html += `<div class="event-cell" data-staff-index="${i}" data-date="${dateStr}" onclick="scheduleManager.cellClick(event, '${dateStr}', '${staffName}', ${i})">`;

                if (staffEvents.length > 0) {
                    staffEvents.forEach(event => {
                        const bgColor = event.color && event.color !== 'transparent' ? event.color : '';
                        const styleAttr = bgColor ? `style="background-color: ${bgColor};"` : '';
                        const titleText = event.note ? `${event.title}\n備考: ${event.note}` : event.title;

                        // テキストの長さに基づいてクラスを決定
                        const fullText = event.title + (event.note ? ' ' + event.note : '');
                        let textLengthClass = '';
                        if (fullText.length > 15) {
                            textLengthClass = ' text-xs';
                        } else if (fullText.length > 10) {
                            textLengthClass = ' text-sm';
                        }

                        html += `<div class="event-item-plain${textLengthClass}" ${styleAttr}
                                onclick="event.stopPropagation(); scheduleManager.openScheduleEditModal('${event.id}')"
                                title="${titleText}">`;
                        html += '<div class="event-content">';
                        if (event.time) {
                            html += `<span class="event-time-small">${event.time.substring(0, 5)}</span>`;
                        }
                        html += `<div class="event-title-small">${event.title}</div>`;
                        if (event.note) {
                            html += `<div class="event-note-small">${event.note}</div>`;
                        }
                        html += '</div>';
                        html += '</div>';
                    });
                }

                    html += '</div>';
                }
            }

            html += '</div>';
            html += '</div>';
        }

        html += '</div>';
        document.getElementById('calendar').innerHTML = html;
    }

    renderWeekEvents() {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());

        const weekEvents = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dateStr = this.formatDate(date);
            const events = this.getFilteredEvents(dateStr);
            events.forEach(event => {
                weekEvents.push({...event, dayName: this.getDayName(date)});
            });
        }

        let html = '';
        if (weekEvents.length === 0) {
            html = '<p class="no-events">今週の予定はありません</p>';
        } else {
            weekEvents.sort((a, b) => {
                const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
                const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
                return dateA - dateB;
            });

            weekEvents.forEach(event => {
                html += this.createEventCard(event, true);
            });
        }

        document.getElementById('weekEvents').innerHTML = html;
    }

    createEventCard(event, showDay = false) {
        let html = `<div class="event-card" style="border-left: 4px solid ${event.color}"
                    onclick="scheduleManager.showEventModal(${event.id})">`;
        if (showDay) {
            html += `<div class="event-day">${event.dayName}</div>`;
        }
        html += `<div class="event-header">`;
        html += `<strong>${event.title}</strong>`;
        if (event.time) {
            html += ` <span class="event-time">${event.time}</span>`;
        }
        html += `</div>`;
        if (event.person) {
            html += `<div class="event-person">担当: ${event.person}</div>`;
        }
        if (event.description) {
            html += `<div class="event-desc">${event.description}</div>`;
        }
        html += `</div>`;
        return html;
    }

    cellClick(event, date, person, staffIndex) {
        event.stopPropagation();
        const cell = event.currentTarget;

        // すでに入力フィールドがある場合は何もしない
        if (cell.querySelector('input')) return;

        // 担当者が未入力の場合
        if (!person) {
            const staffInput = document.getElementById(`staff-${staffIndex}`);
            staffInput.focus();
            this.showNotification('担当者名を先に入力してください', 'error');
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
                    this.addQuickEvent(date, person, title);
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
                this.addQuickEvent(date, person, title);
            }
            input.remove();
        });

        cell.appendChild(input);
        input.focus();
    }

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
        this.events.push(event);
        this.saveEvents();

        // Supabaseに保存（非同期で実行）
        if (typeof supabaseSync !== 'undefined' && supabaseSync.syncEnabled) {
            const savedEvent = await supabaseSync.saveEvent(event);
            if (savedEvent && savedEvent.id) {
                // Supabaseから返されたIDで更新
                const index = this.events.findIndex(e => e.id === tempId);
                if (index !== -1) {
                    this.events[index].id = savedEvent.id;
                    this.saveEvents();
                }
            }
        }
        this.renderCalendar();
        this.showNotification('予定が追加されました');
    }

    showEventModal(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        this.selectedEvent = eventId;
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

    getFilteredEvents(dateStr) {
        return this.events.filter(event => {
            const dateMatch = event.date === dateStr;
            const personMatch = !this.filterPerson || event.person === this.filterPerson;
            return dateMatch && personMatch;
        });
    }


    exportData() {
        const dataStr = JSON.stringify(this.events, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const exportFileDefaultName = `schedule_${this.formatDate(new Date())}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        this.showNotification('データをエクスポートしました');
    }

    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedEvents = JSON.parse(e.target.result);
                this.events = [...this.events, ...importedEvents];
                this.saveEvents();
                this.renderCalendar();
                this.showNotification('データをインポートしました');
            } catch (error) {
                this.showNotification('インポートに失敗しました', 'error');
            }
        };
        reader.readAsText(file);
    }

    updateMemberCheckboxes() {
        const container = document.getElementById('memberCheckboxes');
        let html = '';

        this.staffMembers.forEach((member, index) => {
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

    getCampaignColor(campaignName) {
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

    async addCampaign() {
        const campaignType = document.getElementById('campaignType').value;
        const customCampaign = document.getElementById('campaignCustom').value;
        const campaignDate = document.getElementById('campaignDate').value;
        const campaignNote = document.getElementById('campaignNote').value;

        // 特拡名の決定
        let campaignName = campaignType;
        if (campaignType === 'その他') {
            if (!customCampaign) {
                this.showNotification('特拡名を入力してください', 'error');
                return;
            }
            campaignName = customCampaign;
        } else if (!campaignType) {
            this.showNotification('特拡を選択してください', 'error');
            return;
        }

        if (!campaignDate) {
            this.showNotification('日付を選択してください', 'error');
            return;
        }

        // 選択されたメンバーを取得
        const selectedMembers = [];

        // 白木・境野
        if (document.getElementById('member-shiraki').checked) {
            selectedMembers.push('白木');
        }
        if (document.getElementById('member-sakaino').checked) {
            selectedMembers.push('境野');
        }

        // 担当者リストから
        document.querySelectorAll('#memberCheckboxes input[type="checkbox"]:checked').forEach(checkbox => {
            selectedMembers.push(checkbox.value);
        });

        // その他
        if (document.getElementById('otherMemberCheck').checked) {
            const otherName = document.getElementById('otherMemberName').value.trim();
            if (otherName) {
                selectedMembers.push(otherName);
            }
        }

        if (selectedMembers.length === 0) {
            this.showNotification('参加メンバーを選択してください', 'error');
            return;
        }

        // 特拡の色を取得
        const campaignColor = this.getCampaignColor(campaignName);

        // 特拡イベントを作成（全メンバー共通）
        let description = `参加者: ${selectedMembers.join(', ')}`;
        if (campaignNote) {
            description += `\n備考: ${campaignNote}`;
        }

        this.saveUndoState();

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
        this.events.push(campaignEvent);
        this.saveEvents();

        // Supabaseに保存（非同期で実行）
        if (typeof supabaseSync !== 'undefined' && supabaseSync.syncEnabled) {
            const savedEvent = await supabaseSync.saveEvent(campaignEvent);
            if (savedEvent && savedEvent.id) {
                // Supabaseから生成されたIDに更新
                const tempId = campaignEvent.id;
                const index = this.events.findIndex(e => e.id === tempId);
                if (index !== -1) {
                    this.events[index].id = savedEvent.id;
                    this.saveEvents();
                }
            }
        }

        this.renderCalendar();

        // フォームをリセット
        document.getElementById('campaignType').value = '';
        document.getElementById('campaignCustom').value = '';
        document.getElementById('campaignCustom').style.display = 'none';
        document.getElementById('campaignDate').value = '';
        document.getElementById('campaignNote').value = '';
        document.getElementById('member-shiraki').checked = false;
        document.getElementById('member-sakaino').checked = false;
        document.getElementById('otherMemberCheck').checked = false;
        document.getElementById('otherMemberName').value = '';
        document.getElementById('otherMemberName').style.display = 'none';
        document.querySelectorAll('#memberCheckboxes input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        this.showNotification(`${campaignName} を${selectedMembers.length}人に登録しました`);

        // フォームを閉じる
        this.closeCampaignForm();
    }

    closeCampaignForm() {
        document.getElementById('campaignForm').style.display = 'none';
        document.getElementById('showCampaignFormBtn').style.display = 'block';

        // フォームをリセット
        document.getElementById('campaignType').value = '';
        document.getElementById('campaignCustom').value = '';
        document.getElementById('campaignCustom').style.display = 'none';
        document.getElementById('campaignDate').value = '';
        document.getElementById('campaignNote').value = '';
        document.getElementById('member-shiraki').checked = false;
        document.getElementById('member-sakaino').checked = false;
        document.getElementById('otherMemberCheck').checked = false;
        document.getElementById('otherMemberName').value = '';
        document.getElementById('otherMemberName').style.display = 'none';
        document.querySelectorAll('#memberCheckboxes input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    selectAllMembers() {
        const checkboxes = document.querySelectorAll('.member-checkbox, .staff-member-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);

        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });

        // その他は選択しない
        document.getElementById('otherMemberCheck').checked = false;
        document.getElementById('otherMemberName').style.display = 'none';
        document.getElementById('otherMemberName').value = '';
    }

    updateYearSelector() {
        const yearSelect = document.getElementById('yearSelect');
        yearSelect.value = this.currentDate.getFullYear();
    }

    printCalendar() {
        // 印刷前の準備
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1;
        const originalTitle = document.title;

        // タイトルを一時的に変更
        document.title = `日程管理_${year}年${month}月`;

        // 印刷ダイアログを開く
        window.print();

        // タイトルを元に戻す
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);

        this.showNotification('印刷ダイアログを開きました');
    }

    showNotification(message, type = 'success') {
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

    // iOSでのレイアウト修正
    fixiOSLayout() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (!isIOS) return;

        // モバイルデバイスの場合のみ処理
        if (window.innerWidth > 768) return;

        // スタッフ数を取得
        const staffCount = this.staffMembers.length;
        const viewportWidth = window.innerWidth;
        const dateColumnWidth = 50; // 日付列の幅
        const availableWidth = viewportWidth - dateColumnWidth;
        const cellWidth = Math.floor(availableWidth / staffCount);

        // CSSカスタムプロパティを設定
        const style = document.createElement('style');
        style.id = 'ios-dynamic-styles';
        style.innerHTML = `
            @media (max-width: 768px) {
                .staff-input-cell,
                .event-cell {
                    width: ${cellWidth}px !important;
                    min-width: ${cellWidth}px !important;
                    max-width: ${cellWidth}px !important;
                    flex: 0 0 ${cellWidth}px !important;
                }

                .staff-inputs {
                    width: ${viewportWidth}px !important;
                }

                .events-grid {
                    width: ${availableWidth}px !important;
                }

                .date-row {
                    width: ${viewportWidth}px !important;
                }
            }
        `;

        // 既存のスタイルを削除
        const existingStyle = document.getElementById('ios-dynamic-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        // 新しいスタイルを追加
        document.head.appendChild(style);
    }

    addStaffMember() {
        if (this.staffMembers.length >= 20) {
            this.showNotification('担当者は最大20人までです', 'error');
            return;
        }

        this.saveUndoState();
        this.staffMembers.push('');
        this.saveStaffMembers();
        this.renderStaffHeader();
        this.renderCalendar();
        this.showNotification('担当者欄を追加しました');
    }

    deleteStaffMember(index) {
        if (this.staffMembers.length <= 1) {
            this.showNotification('最低1人の担当者が必要です', 'error');
            return;
        }

        const staffName = this.staffMembers[index];

        // 確認ダイアログを表示
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
        this.renderStaffHeader();
        this.renderCalendar();
        this.updateMemberCheckboxes();

        this.showNotification('担当者を削除しました');
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    isToday(year, month, date) {
        const today = new Date();
        return year === today.getFullYear() &&
               month === today.getMonth() &&
               date === today.getDate();
    }

    getDayName(date) {
        const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
        return `${date.getMonth() + 1}/${date.getDate()} ${days[date.getDay()]}`;
    }
}

let scheduleManager;
document.addEventListener('DOMContentLoaded', () => {
    scheduleManager = new ScheduleManager();
});