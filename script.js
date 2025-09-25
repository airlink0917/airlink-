// ===================================
// 日程管理システム - メインJavaScript
// ===================================

// Supabase設定
const SUPABASE_URL = 'https://igjkroqjhwhewtrprhds.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnamtyb3FqaHdoZXd0cnByaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTQ5ODEsImV4cCI6MjA3MzgzMDk4MX0.7pD4mWSbr8FvGKIjkNSrQuLdUPISxayZGANZ27TuqzI';
const USER_ID = 'global_user';

// グローバル変数
let supabase = null;
let currentDate = new Date();
let events = [];
let staffMembers = [];
let editingEventId = null;

// ===================================
// モバイルデバイス検出
// ===================================
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
}

// ===================================
// 初期化
// ===================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('アプリケーション初期化中...');

    // Supabase初期化
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // 初期データ読み込み（まずLocalStorageから）
    loadStaffMembers();
    loadEvents();

    // UI初期化
    initializeUI();

    // Supabaseから最新データを取得
    await syncData();

    // 定期同期（モバイルは10秒、デスクトップは5秒）
    const syncInterval = isMobileDevice() ? 10000 : 5000;
    setInterval(syncData, syncInterval);

    // ページ表示時に強制同期
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('ページが表示されました。同期を開始します。');
            syncData();
        }
    });

    console.log('初期化完了');
});

// ===================================
// UI初期化
// ===================================
function initializeUI() {
    // 現在月表示
    updateMonthDisplay();

    // スタッフ入力欄生成
    renderStaffInputs();

    // モバイルデバイスの場合、viewport設定
    if (isMobileDevice()) {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        }
    }

    // カレンダー生成
    renderCalendar();

    // イベントリスナー設定
    setupEventListeners();
}

// ===================================
// イベントリスナー
// ===================================
function setupEventListeners() {
    // 月移動ボタン
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateMonthDisplay();
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateMonthDisplay();
        renderCalendar();
    });

    // 担当者追加ボタン
    document.getElementById('addStaff').addEventListener('click', addStaff);

    // 特拡登録ボタン
    document.getElementById('showCampaignForm').addEventListener('click', () => {
        // 新規作成モード
        window.editingCampaignId = null;

        // フォームをリセット
        document.getElementById('campaignForm').reset();
        document.getElementById('campaignDate').valueAsDate = new Date();
        document.getElementById('otherMemberName').style.display = 'none';
        document.getElementById('deleteCampaign').style.display = 'none';

        document.getElementById('campaignModal').style.display = 'block';
    });

    // モーダル関連
    setupModalListeners();
}

// ===================================
// スタッフ管理
// ===================================
function renderStaffInputs() {
    const container = document.getElementById('staffInputs');
    container.innerHTML = '';

    // デフォルト9人、最大20人
    if (staffMembers.length === 0) {
        staffMembers = new Array(9).fill('');
    }

    staffMembers.forEach((name, index) => {
        const div = document.createElement('div');
        div.className = 'staff-input-group';
        div.innerHTML = `
            <input type="text"
                   class="staff-input"
                   placeholder="担当者${index + 1}"
                   value="${name}"
                   data-index="${index}">
            ${staffMembers.length > 1 ? `
                <button class="btn-delete-staff" data-index="${index}">×</button>
            ` : ''}
        `;
        container.appendChild(div);
    });

    // イベントリスナー設定
    container.querySelectorAll('.staff-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            staffMembers[index] = e.target.value;
            saveStaffMembers();
            renderCalendar();
        });
    });

    container.querySelectorAll('.btn-delete-staff').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            removeStaff(index);
        });
    });
}

function addStaff() {
    if (staffMembers.length < 20) {
        staffMembers.push('');
        saveStaffMembers();
        renderStaffInputs();
        renderCalendar();
    } else {
        alert('担当者は最大20人までです');
    }
}

function removeStaff(index) {
    if (staffMembers.length > 1) {
        if (confirm('この担当者を削除しますか？')) {
            staffMembers.splice(index, 1);
            // 関連するイベントも削除
            events = events.filter(e => e.person !== `staff-${index}`);
            saveStaffMembers();
            saveEvents();
            renderStaffInputs();
            renderCalendar();
        }
    }
}

// ===================================
// 祝日データ
// ===================================
function getHolidays(year) {
    // 2025年の日本の祝日（固定）
    const holidays = {
        '2025-01-01': '元日',
        '2025-01-13': '成人の日',
        '2025-02-11': '建国記念の日',
        '2025-02-23': '天皇誕生日',
        '2025-02-24': '振替休日',
        '2025-03-20': '春分の日',
        '2025-04-29': '昭和の日',
        '2025-05-03': '憲法記念日',
        '2025-05-04': 'みどりの日',
        '2025-05-05': 'こどもの日',
        '2025-05-06': '振替休日',
        '2025-07-21': '海の日',
        '2025-08-11': '山の日',
        '2025-09-15': '敬老の日',
        '2025-09-23': '秋分の日',
        '2025-10-13': 'スポーツの日',
        '2025-11-03': '文化の日',
        '2025-11-23': '勤労感謝の日',
        '2025-11-24': '振替休日',
        // 2024年の祝日
        '2024-01-01': '元日',
        '2024-01-08': '成人の日',
        '2024-02-11': '建国記念の日',
        '2024-02-12': '振替休日',
        '2024-02-23': '天皇誕生日',
        '2024-03-20': '春分の日',
        '2024-04-29': '昭和の日',
        '2024-05-03': '憲法記念日',
        '2024-05-04': 'みどりの日',
        '2024-05-05': 'こどもの日',
        '2024-05-06': '振替休日',
        '2024-07-15': '海の日',
        '2024-08-11': '山の日',
        '2024-08-12': '振替休日',
        '2024-09-16': '敬老の日',
        '2024-09-22': '秋分の日',
        '2024-09-23': '振替休日',
        '2024-10-14': 'スポーツの日',
        '2024-11-03': '文化の日',
        '2024-11-04': '振替休日',
        '2024-11-23': '勤労感謝の日'
    };

    return holidays;
}

// ===================================
// カレンダー表示
// ===================================
function renderCalendar() {
    const container = document.getElementById('calendar');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // CSS変数でスタッフ数を設定
    document.documentElement.style.setProperty('--staff-count', staffMembers.length);

    // 祝日データを取得
    const holidays = getHolidays(year);

    // 月の日数を取得
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = '<div class="calendar-grid">';

    // ヘッダー行（日付と担当者名）
    html += '<div class="calendar-header">';
    html += '<div class="calendar-cell header-cell">日付</div>';
    staffMembers.forEach((name, index) => {
        html += `<div class="calendar-cell header-cell">${name || `担当者${index + 1}`}</div>`;
    });
    html += '</div>';

    // 各日のデータ
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayOfWeek = new Date(year, month, day).getDay();
        const isHoliday = holidays[date];
        const isCampaign = events.find(e => e.date === date && e.isCampaign);

        html += '<div class="calendar-row">';

        // 日付セルのクラスを決定
        let dateCellClass = 'calendar-cell date-cell';
        if (isHoliday) {
            dateCellClass += ' holiday';
        } else if (dayOfWeek === 0) {
            dateCellClass += ' sunday';
        } else if (dayOfWeek === 6) {
            dateCellClass += ' saturday';
        }

        // 日付セル
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const holidayName = isHoliday ? `<span class="holiday-name">${isHoliday}</span>` : '';
        html += `
            <div class="${dateCellClass}">
                ${month + 1}/${day}(${dayNames[dayOfWeek]})
                ${holidayName}
            </div>
        `;

        if (isCampaign) {
            // 作戦名を取得
            const campaignTypeNames = {
                '#E1BEE7': '東販連',
                '#81D4FA': '東部作戦',
                '#FFF9C4': '中央作戦',
                '#F8BBD0': '城南作戦',
                '#FFCC80': '城北作戦',
                '#FFCDD2': '多摩作戦',
                '#C8E6C9': 'その他'
            };
            const campaignTypeName = campaignTypeNames[isCampaign.color] || '特拡';

            // 特拡の日は全体で1枠として表示（クリックで編集可能）
            html += `
                <div class="calendar-cell event-cell campaign-cell-wide"
                     style="background-color: ${isCampaign.color || '#E1BEE7'}; grid-column: span ${staffMembers.length}; cursor: pointer;"
                     data-campaign-id="${isCampaign.id}">
                    <div class="campaign-info">
                        <div class="campaign-type">${campaignTypeName}</div>
                        <div class="campaign-members">${isCampaign.campaignMembers?.join('、') || ''}</div>
                        ${isCampaign.note ? `<div class="campaign-note">${isCampaign.note}</div>` : ''}
                    </div>
                </div>
            `;
        } else {
            // 通常の日は各担当者のイベントセル
            staffMembers.forEach((name, index) => {
                const event = events.find(e => e.date === date && e.person === `staff-${index}`);

                if (event) {
                    // 通常のイベント
                    html += `
                        <div class="calendar-cell event-cell has-event"
                             style="background-color: ${event.color || 'transparent'};"
                             data-event-id="${event.id}">
                            <div class="event-title">${event.title}</div>
                            ${event.time ? `<div class="event-time">${event.time}</div>` : ''}
                            ${event.note ? `<div class="event-note">${event.note}</div>` : ''}
                        </div>
                    `;
                } else {
                    // 空のセル（クリックで新規作成）
                    html += `
                        <div class="calendar-cell event-cell empty-cell"
                             data-date="${date}"
                             data-person-index="${index}">
                        </div>
                    `;
                }
            });
        }

        html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;

    // タッチイベントとクリックイベントを設定
    setupCalendarEventHandlers();
}

// カレンダーのイベントハンドラー設定
function setupCalendarEventHandlers() {
    // キャンペーンセルのハンドラー
    document.querySelectorAll('.campaign-cell-wide[data-campaign-id]').forEach(cell => {
        const campaignId = cell.dataset.campaignId;
        const handleInteraction = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.editCampaign(campaignId);
        };

        // モバイル用タッチイベント
        cell.addEventListener('touchend', handleInteraction, { passive: false });
        // デスクトップ用クリックイベント
        cell.addEventListener('click', handleInteraction);
    });

    // 既存イベントセルのハンドラー
    document.querySelectorAll('.has-event[data-event-id]').forEach(cell => {
        const eventId = cell.dataset.eventId;
        const handleInteraction = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.editEvent(eventId);
        };

        cell.addEventListener('touchend', handleInteraction, { passive: false });
        cell.addEventListener('click', handleInteraction);
    });

    // 空のセルのハンドラー
    document.querySelectorAll('.empty-cell[data-date][data-person-index]').forEach(cell => {
        const date = cell.dataset.date;
        const personIndex = parseInt(cell.dataset.personIndex);
        const handleInteraction = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.createEvent(date, personIndex);
        };

        cell.addEventListener('touchend', handleInteraction, { passive: false });
        cell.addEventListener('click', handleInteraction);
    });
}

function updateMonthDisplay() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    document.getElementById('currentMonth').textContent = `${year}年${month}月`;
}

// ===================================
// イベント管理
// ===================================
function createEvent(date, staffIndex) {
    if (!staffMembers[staffIndex]) {
        alert('担当者名を入力してください');
        return;
    }

    editingEventId = null;
    document.getElementById('eventDate').value = date;
    document.getElementById('eventPerson').value = `staff-${staffIndex}`;
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventTime').value = '';
    document.getElementById('eventColor').value = '';
    document.getElementById('eventNote').value = '';
    document.getElementById('deleteEvent').style.display = 'none';
    document.getElementById('eventModal').style.display = 'block';
}

function editEvent(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    editingEventId = eventId;
    document.getElementById('eventDate').value = event.date;
    document.getElementById('eventPerson').value = event.person;
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventTime').value = event.time || '';
    document.getElementById('eventColor').value = event.color || '';
    document.getElementById('eventNote').value = event.note || '';
    document.getElementById('deleteEvent').style.display = 'inline-block';
    document.getElementById('eventModal').style.display = 'block';
}

// 特拡編集関数
function editCampaign(campaignId) {
    const campaign = events.find(e => e.id === campaignId);
    if (!campaign) return;

    // 編集用にIDを保持
    window.editingCampaignId = campaignId;

    // フォームに値を設定
    document.getElementById('campaignDate').value = campaign.date;
    document.getElementById('campaignType').value = campaign.color || '';
    document.getElementById('campaignNote').value = campaign.note || '';

    // メンバー選択をリセット
    document.querySelectorAll('#campaignMembers input').forEach(cb => {
        cb.checked = false;
    });
    document.getElementById('otherMemberName').style.display = 'none';
    document.getElementById('otherMemberName').value = '';

    // 保存されているメンバーをチェック
    if (campaign.campaignMembers) {
        campaign.campaignMembers.forEach(member => {
            const checkbox = document.querySelector(`#campaignMembers input[value="${member}"]`);
            if (checkbox) {
                checkbox.checked = true;
            } else if (member && member !== '') {
                // その他のメンバー
                document.getElementById('otherCheckbox').checked = true;
                document.getElementById('otherMemberName').style.display = 'block';
                document.getElementById('otherMemberName').value = member;
            }
        });
    }

    // 削除ボタンを表示
    document.getElementById('deleteCampaign').style.display = 'inline-block';

    // モーダルを表示
    document.getElementById('campaignModal').style.display = 'block';
}

// ===================================
// モーダル処理
// ===================================
function setupModalListeners() {
    // モーダルを閉じる
    document.querySelectorAll('.modal .close, .btn-cancel').forEach(element => {
        element.addEventListener('click', () => {
            document.getElementById('eventModal').style.display = 'none';
            document.getElementById('campaignModal').style.display = 'none';
        });
    });

    // イベントフォーム送信
    document.getElementById('eventForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const eventData = {
            date: document.getElementById('eventDate').value,
            person: document.getElementById('eventPerson').value,
            title: document.getElementById('eventTitle').value,
            time: document.getElementById('eventTime').value,
            color: document.getElementById('eventColor').value,
            note: document.getElementById('eventNote').value,
            isCampaign: false
        };

        if (editingEventId) {
            // 更新
            const index = events.findIndex(e => e.id === editingEventId);
            if (index !== -1) {
                events[index] = { ...events[index], ...eventData };
                await updateEventInSupabase(events[index]);
            }
        } else {
            // 新規作成
            eventData.id = Date.now().toString();
            events.push(eventData);
            await saveEventToSupabase(eventData);
        }

        saveEvents();
        renderCalendar();
        document.getElementById('eventModal').style.display = 'none';
    });

    // イベント削除
    document.getElementById('deleteEvent').addEventListener('click', async () => {
        if (confirm('このイベントを削除しますか？')) {
            events = events.filter(e => e.id !== editingEventId);
            await deleteEventFromSupabase(editingEventId);
            saveEvents();
            renderCalendar();
            document.getElementById('eventModal').style.display = 'none';
        }
    });

    // 特拡フォーム送信
    document.getElementById('campaignForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const members = [];
        document.querySelectorAll('#campaignMembers input:checked').forEach(cb => {
            if (cb.value === 'その他') {
                const otherName = document.getElementById('otherMemberName').value;
                if (otherName) {
                    members.push(otherName);
                }
            } else {
                members.push(cb.value);
            }
        });

        const date = document.getElementById('campaignDate').value;

        if (window.editingCampaignId) {
            // 編集モード
            const index = events.findIndex(e => e.id === window.editingCampaignId);
            if (index !== -1) {
                events[index] = {
                    ...events[index],
                    date: date,
                    color: document.getElementById('campaignType').value,
                    campaignMembers: members,
                    note: document.getElementById('campaignNote').value
                };
                await updateEventInSupabase(events[index]);
            }
            window.editingCampaignId = null;
        } else {
            // 新規作成モード
            const campaignData = {
                id: 'campaign_' + Date.now().toString(),
                date: date,
                title: '特拡',
                color: document.getElementById('campaignType').value,
                campaignMembers: members,
                note: document.getElementById('campaignNote').value,
                isCampaign: true,
                person: 'campaign'
            };

            // 既存の特拡を削除
            events = events.filter(e => !(e.date === date && e.isCampaign));

            events.push(campaignData);
            await saveEventToSupabase(campaignData);
        }

        saveEvents();
        renderCalendar();

        // フォームをリセット
        document.getElementById('campaignForm').reset();
        document.getElementById('otherMemberName').style.display = 'none';
        document.getElementById('campaignModal').style.display = 'none';
    });

    // その他チェックボックスの処理
    document.getElementById('otherCheckbox').addEventListener('change', (e) => {
        const otherInput = document.getElementById('otherMemberName');
        if (e.target.checked) {
            otherInput.style.display = 'block';
            otherInput.required = true;
        } else {
            otherInput.style.display = 'none';
            otherInput.required = false;
            otherInput.value = '';
        }
    });

    // 全員選択ボタン（その他以外）
    document.getElementById('selectAllMembers').addEventListener('click', () => {
        document.querySelectorAll('#campaignMembers input').forEach(cb => {
            if (cb.value !== 'その他') {
                cb.checked = true;
            }
        });
    });

    // 特拡削除ボタン
    document.getElementById('deleteCampaign').addEventListener('click', async () => {
        if (confirm('この特拡を削除しますか？')) {
            if (window.editingCampaignId) {
                events = events.filter(e => e.id !== window.editingCampaignId);
                await deleteEventFromSupabase(window.editingCampaignId);
                saveEvents();
                renderCalendar();
                window.editingCampaignId = null;
                document.getElementById('campaignModal').style.display = 'none';
            }
        }
    });
}

// ===================================
// データ保存・読み込み（LocalStorage）
// ===================================
function saveEvents() {
    localStorage.setItem('scheduleEvents', JSON.stringify(events));
}

function loadEvents() {
    const saved = localStorage.getItem('scheduleEvents');
    if (saved) {
        events = JSON.parse(saved);
    }
}

function saveStaffMembers() {
    localStorage.setItem('staffMembers', JSON.stringify(staffMembers));
    saveStaffToSupabase();
}

function loadStaffMembers() {
    const saved = localStorage.getItem('staffMembers');
    if (saved) {
        staffMembers = JSON.parse(saved);
    } else {
        staffMembers = new Array(9).fill('');
    }
}

// ===================================
// Supabase同期
// ===================================
async function syncData() {
    try {
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) syncStatus.textContent = '同期中...';

        // イベントデータを取得
        const { data: eventData, error: eventError } = await supabase
            .from('schedule_events')
            .select('*')
            .eq('user_id', USER_ID);

        if (!eventError && eventData && eventData.length > 0) {
            // Supabaseのデータを優先（完全置き換え）
            events = eventData.map(e => ({
                id: e.event_id || e.id.toString(),
                date: e.date,
                person: e.person,
                title: e.title,
                time: e.time,
                color: e.color,
                note: e.note,
                isCampaign: e.is_campaign,
                campaignMembers: e.campaign_members
            }));

            saveEvents();
            renderCalendar();
        }

        // スタッフデータを取得
        const { data: staffData, error: staffError } = await supabase
            .from('staff_members')
            .select('*')
            .eq('user_id', USER_ID)
            .order('staff_index');

        if (!staffError && staffData && staffData.length > 0) {
            const maxIndex = Math.max(...staffData.map(s => s.staff_index));
            const newStaff = new Array(Math.max(maxIndex + 1, 9)).fill('');

            staffData.forEach(s => {
                if (s.staff_index >= 0 && s.staff_index < newStaff.length) {
                    newStaff[s.staff_index] = s.name || '';
                }
            });

            // スタッフデータを更新
            staffMembers = newStaff;
            localStorage.setItem('staffMembers', JSON.stringify(staffMembers));
            renderStaffInputs();
            renderCalendar();
        }

        if (syncStatus) {
            syncStatus.textContent = '同期完了';
            setTimeout(() => {
                syncStatus.textContent = '';
            }, 2000);
        }

    } catch (error) {
        console.error('同期エラー:', error);
        document.getElementById('syncStatus').textContent = '同期エラー';
    }
}

async function saveEventToSupabase(event) {
    if (!supabase) return;

    try {
        const eventData = {
            user_id: USER_ID,
            event_id: event.id,
            title: event.title,
            date: event.date,
            time: event.time || null,
            person: event.person || null,
            color: event.color || null,
            note: event.note || null,
            is_campaign: event.isCampaign || false,
            campaign_members: event.campaignMembers || []
        };

        await supabase
            .from('schedule_events')
            .upsert(eventData, { onConflict: 'event_id,user_id' });

    } catch (error) {
        console.error('イベント保存エラー:', error);
    }
}

async function updateEventInSupabase(event) {
    if (!supabase) return;

    try {
        await supabase
            .from('schedule_events')
            .update({
                title: event.title,
                time: event.time,
                color: event.color,
                note: event.note
            })
            .eq('event_id', event.id)
            .eq('user_id', USER_ID);

    } catch (error) {
        console.error('イベント更新エラー:', error);
    }
}

async function deleteEventFromSupabase(eventId) {
    if (!supabase) return;

    try {
        await supabase
            .from('schedule_events')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', USER_ID);

    } catch (error) {
        console.error('イベント削除エラー:', error);
    }
}

async function saveStaffToSupabase() {
    if (!supabase) return;

    try {
        // 既存データを削除
        await supabase
            .from('staff_members')
            .delete()
            .eq('user_id', USER_ID);

        // 新規データを挿入
        const staffData = staffMembers.map((name, index) => ({
            user_id: USER_ID,
            staff_index: index,
            name: name || ''
        }));

        await supabase
            .from('staff_members')
            .insert(staffData);

    } catch (error) {
        console.error('スタッフ保存エラー:', error);
    }
}

// グローバル関数として公開（HTMLから呼び出し用）
window.createEvent = createEvent;
window.editEvent = editEvent;
window.editCampaign = editCampaign;

// デバッグ用
console.log('アプリケーション準備完了');