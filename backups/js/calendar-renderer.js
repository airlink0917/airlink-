/**
 * カレンダー描画クラス
 */

class CalendarRenderer {
    constructor(scheduleManager) {
        this.scheduleManager = scheduleManager;
    }

    // カレンダー全体を描画
    renderCalendar() {
        const year = this.scheduleManager.currentDate.getFullYear();
        const month = this.scheduleManager.currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        let html = '<div class="vertical-calendar-grid">';

        // 日付を縦1列に表示
        for (let date = 1; date <= lastDate; date++) {
            const dayOfWeek = (firstDay + date - 1) % 7;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
            const dayEvents = this.scheduleManager.eventManager.getFilteredEvents(dateStr);
            const isToday = UIUtils.isToday(year, month, date);
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
                html += this.renderCampaignRow(campaignEvents);
            } else {
                // 特拡がない日は通常の日程を表示
                html += this.renderNormalScheduleRow(dateStr, dayEvents);
            }

            html += '</div>';
            html += '</div>';
        }

        html += '</div>';
        document.getElementById('calendar').innerHTML = html;
    }

    // 特拡がある日の表示
    renderCampaignRow(campaignEvents) {
        let html = `<div class="campaign-only">`;
        campaignEvents.forEach(event => {
            html += `<div class="campaign-event-full"
                    style="background-color: ${event.color};"
                    onclick="event.stopPropagation(); scheduleManager.eventManager.showEventModal(${event.id})"
                    title="${event.description}">`;
            html += `<span class="campaign-title">${event.title}</span>`;
            if (event.note) {
                html += `<span class="campaign-note">${event.note}</span>`;
            }
            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    // 通常の日程がある日の表示
    renderNormalScheduleRow(dateStr, dayEvents) {
        let html = '';

        // フィルターに応じて表示するスタッフを決定
        let staffToShow = [];
        if (this.scheduleManager.selectedStaffFilter === 'all' || !this.scheduleManager.selectedStaffFilter) {
            // 全担当者を表示
            for (let i = 0; i < this.scheduleManager.staffMembers.length; i++) {
                staffToShow.push({ index: i, name: this.scheduleManager.staffMembers[i] });
            }
        } else {
            // 選択された担当者のみ表示
            const selectedIndex = this.scheduleManager.staffMembers.indexOf(this.scheduleManager.selectedStaffFilter);
            if (selectedIndex !== -1) {
                staffToShow.push({ index: selectedIndex, name: this.scheduleManager.selectedStaffFilter });
            }
        }

        for (let staffInfo of staffToShow) {
            const i = staffInfo.index;
            const staffName = staffInfo.name;
            const staffEvents = dayEvents.filter(event =>
                event.person === staffName && staffName !== '' && !event.isCampaign
            );

            html += `<div class="event-cell" data-staff-index="${i}" data-date="${dateStr}" onclick="scheduleManager.cellClick(event, '${dateStr}', '${staffName}', ${i})">`;

            if (staffEvents.length > 0) {
                staffEvents.forEach(event => {
                    html += this.renderEventItem(event);
                });
            }

            html += '</div>';
        }

        return html;
    }

    // 個別のイベントアイテムを描画
    renderEventItem(event) {
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

        let html = `<div class="event-item-plain${textLengthClass}" ${styleAttr}
                        onclick="event.stopPropagation(); scheduleManager.eventManager.openScheduleEditModal('${event.id}')"
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

        return html;
    }

    // スタッフヘッダーを描画
    renderStaffHeader() {
        const staffInputsDiv = document.getElementById('staffInputs');
        if (!staffInputsDiv) return;

        let html = '<div class="date-header-cell">日付</div>'; // 日付ヘッダー

        // フィルターに応じて表示するスタッフを決定
        let staffToShow = [];
        if (this.scheduleManager.selectedStaffFilter === 'all' || !this.scheduleManager.selectedStaffFilter) {
            // 全担当者を表示
            for (let i = 0; i < this.scheduleManager.staffMembers.length; i++) {
                staffToShow.push({ index: i, name: this.scheduleManager.staffMembers[i] });
            }
        } else {
            // 選択された担当者のみ表示
            const selectedIndex = this.scheduleManager.staffMembers.indexOf(this.scheduleManager.selectedStaffFilter);
            if (selectedIndex !== -1) {
                staffToShow.push({ index: selectedIndex, name: this.scheduleManager.selectedStaffFilter });
            }
        }

        // CSS変数で表示する担当者数を設定
        document.documentElement.style.setProperty('--staff-count', staffToShow.length);

        // iOS用のレイアウト修正を適用
        setTimeout(() => {
            this.fixiOSLayout();
        }, 0);

        // 担当者入力欄を動的に生成
        for (let staffInfo of staffToShow) {
            const i = staffInfo.index;
            html += `
                <div class="staff-input-cell">
                    <div class="staff-input-wrapper">
                        <input type="text"
                               class="staff-input"
                               id="staff-${i}"
                               placeholder="担当者${i + 1}"
                               value="${this.scheduleManager.staffMembers[i] || ''}"
                               data-index="${i}">
                        ${this.scheduleManager.staffMembers.length > 1 ? `
                            <button type="button" class="delete-staff-btn" data-index="${i}" title="削除">
                                ×
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // プラスボタンを追加（全担当者表示時のみ、最大20人まで）
        if ((this.scheduleManager.selectedStaffFilter === 'all' || !this.scheduleManager.selectedStaffFilter) && this.scheduleManager.staffMembers.length < 20) {
            html += `
                <button type="button" class="add-staff-btn" id="addStaffBtn" title="担当者を追加">
                    +
                </button>
            `;
        }

        staffInputsDiv.innerHTML = html;
        this.attachStaffInputListeners();
    }

    // スタッフ入力欄のイベントリスナーを設定
    attachStaffInputListeners() {
        // Add event listeners for staff input changes
        document.querySelectorAll('.staff-input').forEach(input => {
            // 変更イベント
            input.addEventListener('change', (e) => {
                this.scheduleManager.saveUndoState();
                const index = parseInt(e.target.dataset.index);
                this.scheduleManager.staffMembers[index] = e.target.value;
                this.scheduleManager.saveStaffMembers();
                this.scheduleManager.campaignManager.updateMemberCheckboxes();
                this.renderCalendar();
            });

            // モバイル用：タップで編集モーダルを開く
            if (window.innerWidth <= 768) {
                input.addEventListener('click', (e) => {
                    e.preventDefault();
                    const index = parseInt(e.target.dataset.index);
                    this.scheduleManager.openStaffEditModal(index);
                });
                // タッチイベントも追加
                input.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    const index = parseInt(e.target.dataset.index);
                    this.scheduleManager.openStaffEditModal(index);
                });
                // モバイルでは直接編集を無効化
                input.readOnly = true;
                input.style.cursor = 'pointer';
            }
        });

        // Add event listener for add staff button
        const addBtn = document.getElementById('addStaffBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.scheduleManager.addStaffMember();
            });
        }

        // Add event listeners for delete staff buttons
        document.querySelectorAll('.delete-staff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.scheduleManager.deleteStaffMember(index);
            });
        });
    }

    // iOSでのレイアウト修正
    fixiOSLayout() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (!isIOS) return;

        // モバイルデバイスの場合のみ処理
        if (window.innerWidth > 768) return;

        // スタッフ数を取得
        const staffCount = this.scheduleManager.staffMembers.length;
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
}