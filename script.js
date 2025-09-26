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

// 同期設定（ミリ秒単位）
const SYNC_INTERVAL = 10000; // 10秒ごとの自動同期

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
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabaseクライアント初期化成功');
    } catch (error) {
        console.error('Supabase初期化エラー:', error);
        alert('Supabaseの初期化に失敗しました。ページをリロードしてください。');
    }

    // 初期データ読み込み（まずLocalStorageから）
    loadStaffMembers();
    loadEvents();

    // UI初期化
    initializeUI();

    // Supabaseから最新データを取得
    await syncData();

    // 定期同期を設定（10秒ごと）
    setInterval(() => {
        console.log('定期同期実行 (間隔: 10秒)');
        syncData();
    }, SYNC_INTERVAL);
    console.log('自動同期を10秒間隔で開始');

    // ページ表示時に強制同期
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('ページが表示されました。同期を開始します。');
            syncData();
        }
    });

    // フォーカス時にも同期
    window.addEventListener('focus', () => {
        console.log('ウィンドウがフォーカスされました。同期を開始します。');
        syncData();
    });

    console.log('初期化完了');
});

// ===================================
// UI初期化
// ===================================
function initializeUI() {
    // 現在月表示
    updateMonthDisplay();

    // スタッフ初期化（デフォルト値を設定）
    if (!staffMembers || staffMembers.length === 0) {
        // LocalStorageにデータがない場合はデフォルトのスタッフを設定
        staffMembers = ['大西', '小林', '上田', '北野', '大浜'];
        saveStaffMembers(false);
    }

    // モバイルデバイスの場合、viewport設定
    if (isMobileDevice()) {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        }

        // モバイル用スクロール改善
        document.addEventListener('touchstart', function() {}, { passive: true });
        document.addEventListener('touchmove', function(e) {
            // カレンダー内での縦スクロールを防止
            const calendarWrapper = document.querySelector('.calendar-scroll-wrapper');
            if (calendarWrapper && calendarWrapper.contains(e.target)) {
                // 横スクロールのみ許可
                const touch = e.touches[0];
                const startTouch = e.target.touchStartCoords;
                if (startTouch) {
                    const deltaX = Math.abs(touch.clientX - startTouch.x);
                    const deltaY = Math.abs(touch.clientY - startTouch.y);
                    if (deltaY > deltaX) {
                        e.preventDefault();
                    }
                }
            }
        }, { passive: false });
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

    // 担当者設定ボタン（モーダルを開く）
    const addBtn = document.getElementById('addStaff');
    if (addBtn) {
        addBtn.textContent = '担当者を設定'; // ボタンテキストを変更
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openStaffModal();
        });
    }

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

    // バックアップボタン
    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn) {
        backupBtn.addEventListener('click', () => {
            backupData();
        });
    }

    // 復元ボタン
    const restoreBtn = document.getElementById('restoreBtn');
    if (restoreBtn) {
        restoreBtn.addEventListener('click', () => {
            document.getElementById('restoreFileInput').click();
        });
    }

    // 復元ファイル選択
    const restoreFileInput = document.getElementById('restoreFileInput');
    if (restoreFileInput) {
        restoreFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                restoreData(file);
            }
        });
    }

    // モーダル関連
    setupModalListeners();
}

// ===================================
// スタッフ管理（新方式）
// ===================================
// 事前定義された担当者リスト
const PREDEFINED_STAFF = [
    '大西', '小林', '上田', '北野', '大浜',
    '丹波', '良太', '永見', '富田', '渡辺', '境野'
];

let staffUpdateTimer = null;
let tempStaffList = []; // モーダル内での一時的なリスト

function renderStaffInputs() {
    // 担当者名の表示を完全に削除
    // デフォルトは空の配列
    if (!staffMembers || staffMembers.length === 0) {
        staffMembers = [];
    }
}

function attachStaffInputListeners() {
    const inputs = document.querySelectorAll('.staff-input');
    const deleteButtons = document.querySelectorAll('.btn-delete-staff');

    // 入力欄のイベント
    inputs.forEach(input => {
        if (isMobileDevice()) {
            // モバイル用: inputイベントでリアルタイム更新（レンダリングはしない）
            let mobileInputTimer = null;

            // inputイベント（リアルタイム入力）
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                staffMembers[index] = e.target.value;

                // ローカルに即座保存（再描画なし）
                localStorage.setItem('staffMembers', JSON.stringify(staffMembers));

                // 遅延してSupabase同期（再描画なし）
                clearTimeout(mobileInputTimer);
                mobileInputTimer = setTimeout(() => {
                    console.log(`モバイル: 担当者${index + 1}を保存: ${e.target.value}`);
                    // Supabaseに保存するが、再描画はしない
                    saveStaffToSupabase();
                }, 5000); // 5秒後にSupabase同期
            });

            // blurイベント（フォーカスアウト時）
            input.addEventListener('blur', (e) => {
                clearTimeout(mobileInputTimer);
                const index = parseInt(e.target.dataset.index);
                staffMembers[index] = e.target.value;
                localStorage.setItem('staffMembers', JSON.stringify(staffMembers));

                // 次のフォーカス先を確認
                setTimeout(() => {
                    const activeEl = document.activeElement;
                    // 他の入力欄にフォーカスが移っていない場合のみカレンダー更新
                    if (!activeEl || !activeEl.classList.contains('staff-input')) {
                        renderCalendar();
                    }
                }, 100);
            });

            // フォーカス時の処理
            input.addEventListener('focus', (e) => {
                // ビューポートを固定
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });

        } else {
            // PCではinputイベントを使用
            let inputTimer = null;
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                staffMembers[index] = e.target.value;

                clearTimeout(inputTimer);
                inputTimer = setTimeout(() => {
                    console.log(`PC: 担当者${index + 1}を保存: ${e.target.value}`);
                    saveStaffMembers(false);
                    renderCalendar();
                }, 500);
            });
        }
    });

    // 削除ボタンのイベント
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            if (confirm(`担当者${index + 1}を削除しますか？`)) {
                removeStaff(index);
            }
        });
    });
}

// 担当者設定モーダルを開く
function openStaffModal() {
    const modal = document.getElementById('staffModal');
    if (!modal) return;

    // 一時リストを現在のリストで初期化
    tempStaffList = [...staffMembers];

    // 事前定義リストを表示
    renderPredefinedStaffList();

    // 現在の担当者リストを表示
    renderCurrentStaffList();

    // モーダルを表示
    modal.style.display = 'block';

    // イベントリスナー設定（毎回新しく設定）
    setupStaffModalListeners();
}

// 事前定義スタッフリストを表示
function renderPredefinedStaffList() {
    const container = document.getElementById('predefinedStaffList');
    if (!container) return;

    let html = '';
    PREDEFINED_STAFF.forEach(name => {
        const isChecked = tempStaffList.includes(name);
        html += `
            <label class="staff-checkbox-item">
                <input type="checkbox" value="${name}" ${isChecked ? 'checked' : ''}>
                <span>${name}</span>
            </label>
        `;
    });
    container.innerHTML = html;

    // チェックボックスのイベント
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const name = e.target.value;
            if (e.target.checked) {
                if (!tempStaffList.includes(name)) {
                    tempStaffList.push(name);
                }
            } else {
                const index = tempStaffList.indexOf(name);
                if (index > -1) {
                    tempStaffList.splice(index, 1);
                }
            }
            renderCurrentStaffList();
        });
    });
}

// 現在の担当者リストを表示
function renderCurrentStaffList() {
    const container = document.getElementById('currentStaffList');
    if (!container) return;

    if (tempStaffList.length === 0) {
        container.innerHTML = '<p style="color: #999;">担当者が選択されていません</p>';
        return;
    }

    let html = '';
    tempStaffList.forEach((name, index) => {
        html += `
            <div class="current-staff-item">
                <input type="text" value="${name}" data-index="${index}" class="staff-name-input">
                <div class="staff-item-buttons">
                    <button type="button" class="btn-edit-staff" data-index="${index}">更新</button>
                    <button type="button" class="btn-remove-staff" data-index="${index}">削除</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;

    // 編集・削除ボタンのイベント
    container.querySelectorAll('.btn-edit-staff').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            const input = e.target.parentElement.parentElement.querySelector('.staff-name-input');
            const newName = input.value.trim();
            if (newName) {
                tempStaffList[index] = newName;
                renderPredefinedStaffList();
                renderCurrentStaffList();
            }
        });
    });

    container.querySelectorAll('.btn-remove-staff').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            tempStaffList.splice(index, 1);
            renderPredefinedStaffList();
            renderCurrentStaffList();
        });
    });
}

// モーダルのイベントリスナー
function setupStaffModalListeners() {
    const modal = document.getElementById('staffModal');
    if (!modal) return;

    // その他チェックボックス
    const otherCheckbox = document.getElementById('otherStaffCheckbox');
    const otherNameInput = document.getElementById('otherStaffName');
    const addOtherBtn = document.getElementById('addOtherStaff');

    // 既存のリスナーを削除してから追加
    if (otherCheckbox) {
        const newCheckbox = otherCheckbox.cloneNode(true);
        otherCheckbox.parentNode.replaceChild(newCheckbox, otherCheckbox);
        newCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                otherNameInput.style.display = 'inline-block';
                addOtherBtn.style.display = 'inline-block';
                otherNameInput.focus();
            } else {
                otherNameInput.style.display = 'none';
                addOtherBtn.style.display = 'none';
                otherNameInput.value = '';
            }
        });
    }

    // その他追加ボタン
    if (addOtherBtn) {
        const newBtn = addOtherBtn.cloneNode(true);
        addOtherBtn.parentNode.replaceChild(newBtn, addOtherBtn);
        newBtn.addEventListener('click', () => {
            const name = otherNameInput.value.trim();
            if (name && !tempStaffList.includes(name)) {
                tempStaffList.push(name);
                renderPredefinedStaffList();
                renderCurrentStaffList();
                otherNameInput.value = '';
            }
        });
    }

    // 保存ボタン
    const saveBtn = document.getElementById('saveStaffSettings');
    if (saveBtn) {
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', () => {
            console.log('保存ボタンがクリックされました');
            console.log('保存する担当者:', tempStaffList);

            // 担当者リストを更新
            staffMembers = [...tempStaffList];

            // ローカルストレージに保存
            localStorage.setItem('staffMembers', JSON.stringify(staffMembers));

            // Supabaseに保存
            if (!isMobileDevice()) {
                saveStaffMembers(false);
            }

            // カレンダーを再描画
            renderCalendar();

            // モーダルを閉じる
            modal.style.display = 'none';

            console.log('担当者設定が保存されました');
        });
    }

    // 閉じるボタン
    modal.querySelectorAll('.close, .btn-cancel').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    });
}

// 旧addStaff関数は不要になったため削除
// 旧removeStaff関数もモーダル内で管理するため削除

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
    if (!container) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // チェックされた（選択された）担当者のみをフィルタリング
    const selectedStaff = staffMembers.filter(name => name && name.trim() !== '');

    // 担当者が設定されていない場合はカレンダーを表示しない
    if (!selectedStaff || selectedStaff.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 50px; color: #999;">担当者を設定してください</div>';
        return;
    }

    // CSS変数でスタッフ数を設定（選択された担当者数）
    document.documentElement.style.setProperty('--staff-count', selectedStaff.length);

    // 祝日データを取得
    const holidays = getHolidays(year);

    // 月の日数を取得
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = '<div class="calendar-scroll-wrapper">';
    html += '<div class="calendar-grid">';

    // ヘッダー行（日付と担当者名）
    html += '<div class="calendar-header">';
    html += '<div class="calendar-cell header-cell date-header">日付</div>';

    // 選択された担当者名を表示（優先順位順）
    selectedStaff.forEach(name => {
        html += `<div class="calendar-cell header-cell">${name}</div>`;
    });
    html += '</div>';

    // 各日のデータ
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayOfWeek = new Date(year, month, day).getDay();
        const isHoliday = holidays[date];
        const isCampaign = events.find(e => e.date === date && e.isCampaign);

        // 特拡の行は特別なクラスを追加
        const rowClass = isCampaign ? 'calendar-row has-campaign' : 'calendar-row';
        html += `<div class="${rowClass}">`;

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

            // モバイルの場合は1行表示、PCの場合は複数行表示可
            const memberText = isCampaign.campaignMembers?.join('、') || '';
            const isMobile = isMobileDevice();
            const memberClass = isMobile ? 'campaign-members campaign-members-mobile' :
                               (memberText.length > 20 ? 'campaign-members long-members' : 'campaign-members');

            // 特拡の日は全幅で表示（クリックで編集可能）
            html += `
                <div class="calendar-cell event-cell campaign-cell-wide"
                     style="background-color: ${isCampaign.color || '#E1BEE7'}; cursor: pointer;"
                     data-campaign-id="${isCampaign.id}">
                    <div class="campaign-info">
                        <div class="campaign-type">${campaignTypeName}</div>
                        <div class="${memberClass}">${memberText}</div>
                        ${isCampaign.note ? `<div class="campaign-note">${isCampaign.note}</div>` : ''}
                    </div>
                </div>
            `;
        } else {
            // 通常の日は各担当者のイベントセル
            selectedStaff.forEach(name => {
                // staffMembers配列でのインデックスを取得
                const originalIndex = staffMembers.indexOf(name);
                const event = events.find(e => e.date === date && e.person === `staff-${originalIndex}`);

                if (event) {
                    // 文字数によるサイズ調整クラスを決定
                    const titleLength = event.title ? event.title.length : 0;
                    let titleClass = 'event-title';
                    if (titleLength > 12) {
                        titleClass += ' very-long-text';
                    } else if (titleLength > 6) {
                        titleClass += ' long-text';
                    }

                    // セルのクラスを決定
                    let cellClass = 'calendar-cell event-cell has-event';
                    if (event.time) cellClass += ' has-time';
                    if (event.note) cellClass += ' has-note';

                    console.log('Event title:', event.title, 'Length:', titleLength, 'Class:', titleClass);

                    // 通常のイベント
                    html += `
                        <div class="${cellClass}"
                             style="background-color: ${event.color || 'transparent'};"
                             data-event-id="${event.id}">
                            <div class="${titleClass}">${event.title}</div>
                            ${event.time ? `<div class="event-time">${event.time}</div>` : ''}
                            ${event.note ? `<div class="event-note">${event.note}</div>` : ''}
                        </div>
                    `;
                } else {
                    // 空のセル（クリックで新規作成）
                    html += `
                        <div class="calendar-cell event-cell empty-cell"
                             data-date="${date}"
                             data-person-index="${originalIndex}">
                        </div>
                    `;
                }
            });
        }

        html += '</div>';
    }

    html += '</div>'; // calendar-grid を閉じる
    html += '</div>'; // calendar-scroll-wrapper を閉じる
    container.innerHTML = html;

    // タッチイベントとクリックイベントを設定
    setupCalendarEventHandlers();
}

// タッチ操作とスクロールの状態管理
let isScrolling = false;
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

// カレンダーのイベントハンドラー設定
function setupCalendarEventHandlers() {
    const scrollWrapper = document.querySelector('.calendar-scroll-wrapper');

    // スクロール検出
    if (scrollWrapper) {
        scrollWrapper.addEventListener('scroll', () => {
            isScrolling = true;
            clearTimeout(window.scrollTimeout);
            window.scrollTimeout = setTimeout(() => {
                isScrolling = false;
                console.log('Scroll stopped, isScrolling reset to false');
            }, 200);
        });

        // スクロール終了検出
        scrollWrapper.addEventListener('scrollend', () => {
            setTimeout(() => {
                isScrolling = false;
                console.log('Scroll ended, isScrolling reset to false');
            }, 100);
        });
    }

    // ページタッチ時のスクロール状態リセット
    document.addEventListener('touchstart', () => {
        if (Date.now() - touchStartTime > 1000) {
            isScrolling = false;
        }
    }, { passive: true });

    // キャンペーンセルのハンドラー
    document.querySelectorAll('.campaign-cell-wide[data-campaign-id]').forEach(cell => {
        const campaignId = cell.dataset.campaignId;
        setupCellInteraction(cell, () => window.editCampaign(campaignId));
    });

    // 既存イベントセルのハンドラー
    document.querySelectorAll('.has-event[data-event-id]').forEach(cell => {
        const eventId = cell.dataset.eventId;
        setupCellInteraction(cell, () => window.editEvent(eventId));
    });

    // 空のセルのハンドラー
    document.querySelectorAll('.empty-cell[data-date][data-person-index]').forEach(cell => {
        const date = cell.dataset.date;
        const personIndex = parseInt(cell.dataset.personIndex);
        setupCellInteraction(cell, () => window.createEvent(date, personIndex));
    });
}

// セルのインタラクション設定（シンプル版）
function setupCellInteraction(cell, action) {
    let touchStarted = false;
    let hasMoved = false;

    // タッチ開始
    cell.addEventListener('touchstart', (e) => {
        touchStarted = true;
        hasMoved = false;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        console.log('Touch start on cell');
    }, { passive: true });

    // タッチ移動
    cell.addEventListener('touchmove', (e) => {
        if (!touchStarted) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = Math.abs(touchX - touchStartX);
        const deltaY = Math.abs(touchY - touchStartY);

        if (deltaX > 15 || deltaY > 15) {
            hasMoved = true;
            isScrolling = true;
        }
    }, { passive: true });

    // タッチ終了
    cell.addEventListener('touchend', (e) => {
        if (!touchStarted) return;
        touchStarted = false;

        const touchDuration = Date.now() - touchStartTime;

        console.log('Touch end:', {
            hasMoved,
            isScrolling,
            duration: touchDuration,
            cell: cell.className
        });

        // 移動が少なく、時間が短い場合のみ処理
        if (!hasMoved && !isScrolling && touchDuration < 800) {
            e.preventDefault();
            console.log('タップ処理実行');
            setTimeout(() => action(), 100);
        } else {
            console.log('タップキャンセル: moved=', hasMoved, 'scrolling=', isScrolling);
        }
    }, { passive: false });

    // デスクトップ用クリックイベント
    cell.addEventListener('click', (e) => {
        if (!isMobileDevice()) {
            e.preventDefault();
            e.stopPropagation();
            console.log('デスクトップクリック');
            action();
        }
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

    // 日付を表示用にフォーマット
    const dateObj = new Date(date + 'T00:00:00');
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayName = dayNames[dateObj.getDay()];
    document.getElementById('eventDateDisplay').value = `${month}月${day}日(${dayName})`;

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

    // 日付を表示用にフォーマット
    const dateObj = new Date(event.date + 'T00:00:00');
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayName = dayNames[dateObj.getDay()];
    document.getElementById('eventDateDisplay').value = `${month}月${day}日(${dayName})`;

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
    // モーダルを閉じる共通処理
    const closeAllModals = () => {
        document.getElementById('eventModal').style.display = 'none';
        document.getElementById('campaignModal').style.display = 'none';
        document.getElementById('staffModal').style.display = 'none';

        // 編集中のIDをリセット
        editingEventId = null;
        window.editingCampaignId = null;
    };

    // 閉じるボタンとキャンセルボタン
    document.querySelectorAll('.modal .close, .btn-cancel').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeAllModals();
        });
    });

    // イベントフォーム送信
    document.getElementById('eventForm').addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Event form submit triggered');

        // フォームデータを取得
        const eventDate = document.getElementById('eventDate').value;
        const eventPerson = document.getElementById('eventPerson').value;
        const eventTitle = document.getElementById('eventTitle').value;
        const eventTime = document.getElementById('eventTime').value;
        const eventColor = document.getElementById('eventColor').value;
        const eventNote = document.getElementById('eventNote').value;

        console.log('Form data:', { eventDate, eventPerson, eventTitle });

        // タイトルが入力されているか確認
        if (!eventTitle || eventTitle.trim() === '') {
            alert('タイトルを入力してください');
            return;
        }

        const eventData = {
            date: eventDate,
            person: eventPerson,
            title: eventTitle.trim(),
            time: eventTime || '',
            color: eventColor || 'transparent',
            note: eventNote || '',
            isCampaign: false
        };

        if (editingEventId) {
            // 既存イベントの更新
            const index = events.findIndex(e => e.id === editingEventId);
            if (index !== -1) {
                eventData.id = editingEventId;
                events[index] = eventData;
                console.log('Event updated:', events[index]);
            }
        } else {
            // 新規イベントの作成
            eventData.id = Date.now().toString();
            events.push(eventData);
            console.log('New event created:', eventData);
        }

        // データを保存
        localStorage.setItem('scheduleEvents', JSON.stringify(events));
        console.log('Events saved to localStorage');

        // カレンダーを再描画
        renderCalendar();
        console.log('Calendar rendered');

        // フォームをリセット
        document.getElementById('eventForm').reset();

        // モーダルを閉じる
        document.getElementById('eventModal').style.display = 'none';

        // Supabaseに保存（バックグラウンド）
        const savedEvent = editingEventId ?
            events.find(e => e.id === editingEventId) :
            eventData;

        if (savedEvent) {
            if (editingEventId) {
                updateEventInSupabase(savedEvent).catch(err =>
                    console.error('Supabase更新エラー:', err)
                );
            } else {
                saveEventToSupabase(savedEvent).catch(err =>
                    console.error('Supabase保存エラー:', err)
                );
            }
        }

        editingEventId = null;
        console.log('Modal closed');
    });

    // イベント削除
    document.getElementById('deleteEvent').addEventListener('click', function() {
        console.log('Delete button clicked, editingEventId:', editingEventId);

        if (!editingEventId) {
            console.log('No event to delete');
            return;
        }

        if (confirm('このイベントを削除しますか？')) {
            // 削除実行
            const deletedId = editingEventId;
            events = events.filter(e => e.id !== deletedId);
            console.log('Event deleted, remaining events:', events.length);

            // データを保存
            localStorage.setItem('scheduleEvents', JSON.stringify(events));
            console.log('Events saved after deletion');

            // カレンダーを再描画
            renderCalendar();
            console.log('Calendar rendered after deletion');

            // Supabaseから削除（バックグラウンド）
            deleteEventFromSupabase(deletedId).catch(err =>
                console.error('Supabase削除エラー:', err)
            );

            // モーダルを閉じる
            document.getElementById('eventModal').style.display = 'none';
            editingEventId = null;
            console.log('Modal closed after deletion');
        }
    });

    // 特拡フォーム送信
    document.getElementById('campaignForm').addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Campaign form submit triggered');

        // メンバー収集
        const members = [];
        document.querySelectorAll('#campaignMembers input:checked').forEach(cb => {
            if (cb.value === 'その他') {
                const otherName = document.getElementById('otherMemberName').value;
                if (otherName) members.push(otherName);
            } else {
                members.push(cb.value);
            }
        });

        const date = document.getElementById('campaignDate').value;
        const campaignType = document.getElementById('campaignType').value;
        const campaignNote = document.getElementById('campaignNote').value || '';

        console.log('Campaign data:', { date, campaignType, members });

        if (window.editingCampaignId) {
            // 編集モード
            const index = events.findIndex(e => e.id === window.editingCampaignId);
            if (index !== -1) {
                events[index] = {
                    ...events[index],
                    date: date,
                    color: campaignType,
                    campaignMembers: members,
                    note: campaignNote
                };
                console.log('Campaign updated:', events[index]);
            }
        } else {
            // 新規作成モード
            const campaignData = {
                id: 'campaign_' + Date.now().toString(),
                date: date,
                title: '特拡',
                color: campaignType || '',
                campaignMembers: members,
                note: campaignNote,
                isCampaign: true,
                person: 'campaign'
            };

            // 既存の特拡を削除
            events = events.filter(e => !(e.date === date && e.isCampaign));
            events.push(campaignData);
            console.log('New campaign created:', campaignData);
        }

        // データを保存
        localStorage.setItem('scheduleEvents', JSON.stringify(events));
        console.log('Events saved to localStorage');

        // カレンダーを再描画
        renderCalendar();
        console.log('Calendar rendered');

        // Supabaseに保存（バックグラウンド）
        const savedCampaign = window.editingCampaignId ?
            events.find(e => e.id === window.editingCampaignId) :
            events[events.length - 1];

        if (savedCampaign) {
            if (window.editingCampaignId) {
                updateEventInSupabase(savedCampaign).catch(err =>
                    console.error('Supabase更新エラー:', err)
                );
            } else {
                saveEventToSupabase(savedCampaign).catch(err =>
                    console.error('Supabase保存エラー:', err)
                );
            }
        }

        // フォームをリセット
        document.getElementById('campaignForm').reset();
        document.getElementById('otherMemberName').style.display = 'none';

        // モーダルを閉じる
        document.getElementById('campaignModal').style.display = 'none';
        window.editingCampaignId = null;
        console.log('Campaign modal closed');
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
    document.getElementById('deleteCampaign').addEventListener('click', function() {
        console.log('Delete campaign clicked, editingCampaignId:', window.editingCampaignId);

        if (!window.editingCampaignId) {
            console.log('No campaign to delete');
            return;
        }

        if (confirm('この特拡を削除しますか？')) {
            const deletedId = window.editingCampaignId;

            // 削除実行
            events = events.filter(e => e.id !== deletedId);
            console.log('Campaign deleted, remaining events:', events.length);

            // データを保存
            localStorage.setItem('scheduleEvents', JSON.stringify(events));
            console.log('Events saved after campaign deletion');

            // カレンダーを再描画
            renderCalendar();
            console.log('Calendar rendered after campaign deletion');

            // Supabaseから削除（バックグラウンド）
            deleteEventFromSupabase(deletedId).catch(err =>
                console.error('Supabase削除エラー:', err)
            );

            // モーダルを閉じる
            document.getElementById('campaignModal').style.display = 'none';
            window.editingCampaignId = null;
            console.log('Campaign modal closed after deletion');
        }
    });
}

// ===================================
// データ保存・読み込み（LocalStorage）
// ===================================
function saveEvents() {
    localStorage.setItem('scheduleEvents', JSON.stringify(events));
    // 変更時に自動バックアップも作成
    if (autoBackupInterval) {
        createBackup();
    }
}

function loadEvents() {
    const saved = localStorage.getItem('scheduleEvents');
    if (saved) {
        events = JSON.parse(saved);
    }
}

function saveStaffMembers(skipSupabase = false) {
    localStorage.setItem('staffMembers', JSON.stringify(staffMembers));

    // モバイルの場合、またはスキップ指定の場合はSupabase保存をスキップ
    if (!skipSupabase && !isMobileDevice()) {
        saveStaffToSupabase();
    }

    // 変更時に自動バックアップも作成
    if (autoBackupInterval) {
        createBackup();
    }
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
    if (!supabase) {
        console.error('同期エラー: Supabaseが初期化されていません');
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.textContent = '';
        }
        return;
    }

    try {
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) syncStatus.textContent = '同期中...';

        console.log('Supabase同期開始 - USER_ID:', USER_ID);

        // イベントデータを取得
        const { data: eventData, error: eventError } = await supabase
            .from('schedule_events')
            .select('*')
            .eq('user_id', USER_ID);

        console.log('イベントデータ取得結果:', { eventData, eventError });

        if (eventError) {
            console.error('イベント取得エラー:', eventError);
            if (syncStatus) {
                syncStatus.textContent = '';
            }
        } else if (eventData) {
            // 現在のデータと比較
            const currentEventsJson = JSON.stringify(events.sort((a,b) => a.id.localeCompare(b.id)));

            // Supabaseのデータをマージ
            const newEvents = eventData.map(e => ({
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

            // ローカルのみに存在するイベントも保持
            events.forEach(localEvent => {
                if (!newEvents.find(e => e.id === localEvent.id)) {
                    // ローカルにしかないイベントはSupabaseに保存
                    saveEventToSupabase(localEvent).catch(err =>
                        console.error('ローカルイベントの同期エラー:', err)
                    );
                    newEvents.push(localEvent);
                }
            });

            const newEventsJson = JSON.stringify(newEvents.sort((a,b) => a.id.localeCompare(b.id)));

            // データが変更された場合のみ更新
            if (currentEventsJson !== newEventsJson) {
                console.log('データ変更を検知 - カレンダーを自動更新');
                events = newEvents;
                saveEvents();
                renderCalendar();

                // 変更通知
                const syncStatus = document.getElementById('syncStatus');
                if (syncStatus) {
                    syncStatus.textContent = '📥 更新されました';
                    setTimeout(() => {
                        syncStatus.textContent = '';
                    }, 3000);
                }
            } else {
                console.log('データ変更なし - カレンダー更新不要');
            }
        }

        // スタッフデータを取得
        const { data: staffData, error: staffError } = await supabase
            .from('staff_members')
            .select('*')
            .eq('user_id', USER_ID)
            .order('staff_index');

        if (staffError) {
            console.error('スタッフ取得エラー:', staffError);
            if (syncStatus) {
                syncStatus.textContent = '';
            }
        } else if (staffData && staffData.length > 0) {
            const maxIndex = Math.max(...staffData.map(s => s.staff_index));
            const newStaff = new Array(Math.max(maxIndex + 1, 9)).fill('');

            staffData.forEach(s => {
                if (s.staff_index >= 0 && s.staff_index < newStaff.length) {
                    newStaff[s.staff_index] = s.name || '';
                }
            });

            // スタッフデータを更新（モバイルで入力中は再描画しない）
            staffMembers = newStaff;
            localStorage.setItem('staffMembers', JSON.stringify(staffMembers));

            // 入力中でない場合のみ再描画
            const activeEl = document.activeElement;
            if (!activeEl || !activeEl.classList.contains('staff-input')) {
                renderStaffInputs();
                renderCalendar();
            }
        }

        if (syncStatus) {
            syncStatus.textContent = '同期完了';
            setTimeout(() => {
                syncStatus.textContent = '';
            }, 2000);
        }

    } catch (error) {
        console.error('同期エラー:', error);
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            // エラー表示をクリア
            syncStatus.textContent = '';
        }

        // 最終同期時刻を保存
        localStorage.setItem('lastSyncTime', new Date().toISOString());
    }
}

async function saveEventToSupabase(event) {
    if (!supabase) {
        console.error('Supabaseが初期化されていません');
        // アラートを表示せず、ローカル保存のみで継続
        return;
    }

    try {
        const eventData = {
            user_id: USER_ID,
            event_id: event.id,
            title: event.title || '',
            date: event.date,
            time: event.time || null,
            person: event.person || null,
            color: event.color || null,
            note: event.note || null,
            is_campaign: event.isCampaign || false,
            campaign_members: event.campaignMembers || []
        };

        console.log('保存データ:', eventData);

        // まずデータが存在するかチェック
        const { data: existingData } = await supabase
            .from('schedule_events')
            .select('id')
            .eq('event_id', eventData.event_id)
            .eq('user_id', eventData.user_id)
            .single();

        let data, error;
        if (existingData) {
            // データが存在する場合は更新
            const result = await supabase
                .from('schedule_events')
                .update(eventData)
                .eq('event_id', eventData.event_id)
                .eq('user_id', eventData.user_id);
            data = result.data;
            error = result.error;
        } else {
            // データが存在しない場合は挿入
            const result = await supabase
                .from('schedule_events')
                .insert(eventData);
            data = result.data;
            error = result.error;
        }

        if (error) {
            console.error('Supabase保存エラー:', error);
            // アラートを表示せず、エラーをログのみ
            throw error;
        } else {
            console.log('保存成功:', data);
            // 保存成功後、即座に同期を実行（他端末への反映を早める）
            setTimeout(() => {
                console.log('保存後の同期を実行');
                syncData();
            }, 500);
        }

    } catch (error) {
        console.error('イベント保存エラー:', error);
        // アラートを表示せず、エラーをthrow
        throw error;
    }
}

async function updateEventInSupabase(event) {
    if (!supabase) {
        console.error('Supabaseが初期化されていません');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('schedule_events')
            .update({
                title: event.title || '',
                time: event.time || null,
                color: event.color || null,
                note: event.note || null,
                person: event.person || null,
                is_campaign: event.isCampaign || false,
                campaign_members: event.campaignMembers || []
            })
            .eq('event_id', event.id)
            .eq('user_id', USER_ID);

        if (error) {
            console.error('Supabase更新エラー:', error);
            alert(`データ更新に失敗しました: ${error.message}`);
        } else {
            console.log('更新成功:', data);
            setTimeout(() => syncData(), 500);
        }

    } catch (error) {
        console.error('イベント更新エラー:', error);
    }
}

async function deleteEventFromSupabase(eventId) {
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('schedule_events')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', USER_ID);

        if (error) {
            console.error('Supabase削除エラー:', error);
            alert(`データ削除に失敗しました: ${error.message}`);
        } else {
            console.log('削除成功:', data);
            setTimeout(() => syncData(), 500);
        }

    } catch (error) {
        console.error('イベント削除エラー:', error);
    }
}

async function saveStaffToSupabase() {
    if (!supabase) return;

    try {
        // 既存データを削除
        const { error: deleteError } = await supabase
            .from('staff_members')
            .delete()
            .eq('user_id', USER_ID);

        if (deleteError) {
            console.error('スタッフ削除エラー:', deleteError);
            const syncStatus = document.getElementById('syncStatus');
            if (syncStatus) {
                syncStatus.textContent = '同期エラー';
                setTimeout(() => {
                    syncStatus.textContent = '';
                }, 3000);
            }
            return;
        }

        // 新規データを挿入
        const staffData = staffMembers.map((name, index) => ({
            user_id: USER_ID,
            staff_index: index,
            name: name || ''
        }));

        const { data, error: insertError } = await supabase
            .from('staff_members')
            .insert(staffData);

        if (insertError) {
            console.error('スタッフ挿入エラー:', insertError);
            const syncStatus = document.getElementById('syncStatus');
            if (syncStatus) {
                syncStatus.textContent = '同期エラー';
                setTimeout(() => {
                    syncStatus.textContent = '';
                }, 3000);
            }
        } else {
            console.log('スタッフ保存成功:', data);
            // syncDataの呼び出しを削除（無限ループ防止）
            const syncStatus = document.getElementById('syncStatus');
            if (syncStatus) {
                syncStatus.textContent = '保存完了';
                setTimeout(() => {
                    syncStatus.textContent = '';
                }, 2000);
            }
        }

    } catch (error) {
        console.error('スタッフ保存エラー:', error);
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.textContent = '同期エラー';
            setTimeout(() => {
                syncStatus.textContent = '';
            }, 3000);
        }
    }
}

// グローバル関数として公開（HTMLから呼び出し用）
window.createEvent = createEvent;
window.editEvent = editEvent;
window.editCampaign = editCampaign;

// デバッグ用

// ===================================
// バックアップと復元機能
// ===================================
function backupData() {
    try {
        const backupData = {
            version: '1.0',
            date: new Date().toISOString(),
            events: events,
            staffMembers: staffMembers
        };

        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        // 現在の日時をファイル名に含める
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

        a.href = url;
        a.download = `日程システム_バックアップ_${dateStr}_${timeStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('バックアップファイルをダウンロードしました');
    } catch (error) {
        console.error('バックアップエラー:', error);
        alert('バックアップに失敗しました');
    }
}

function restoreData(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const backupData = JSON.parse(e.target.result);

            // データの妥当性チェック
            if (!backupData.version || !backupData.events || !backupData.staffMembers) {
                alert('無効なバックアップファイルです');
                return;
            }

            if (confirm(`${backupData.date} のバックアップデータを復元しますか？\n現在のデータは上書きされます。`)) {
                // データを復元
                events = backupData.events || [];
                staffMembers = backupData.staffMembers || [];

                // LocalStorageに保存
                saveEvents();
                saveStaffMembers(false);

                // Supabaseに同期
                syncData();

                // カレンダーを再描画
                renderCalendar();

                alert('データを復元しました');
            }
        } catch (error) {
            console.error('復元エラー:', error);
            alert('ファイルの読み込みに失敗しました');
        }
    };

    reader.readAsText(file);
}
console.log('アプリケーション準備完了');