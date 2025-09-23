// シンプルで確実な同期システム
// このファイルをindex.htmlに追加して使用

const SYNC_CONFIG = {
    SUPABASE_URL: 'https://igjkroqjhwhewtrprhds.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnamtyb3FqaHdoZXd0cnByaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTQ5ODEsImV4cCI6MjA3MzgzMDk4MX0.7pD4mWSbr8FvGKIjkNSrQuLdUPISxayZGANZ27TuqzI',
    USER_ID: 'global_user' // 全デバイス共通ID
};

// グローバル変数
let simpleSupabase = null;
let syncInterval = null;

// 初期化
async function initSimpleSync() {
    console.log('=== シンプル同期システム起動 ===');

    // Supabaseクライアント作成
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase SDKが読み込まれていません');
        return false;
    }

    simpleSupabase = window.supabase.createClient(
        SYNC_CONFIG.SUPABASE_URL,
        SYNC_CONFIG.SUPABASE_KEY
    );

    console.log('Supabase接続完了');

    // 初回データ読み込み
    await loadAllDataFromSupabase();

    // 定期同期（5秒ごと）
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(async () => {
        await loadAllDataFromSupabase();
    }, 5000);

    // データ変更時の自動保存を設定
    setupAutoSave();

    return true;
}

// Supabaseから全データを読み込み
async function loadAllDataFromSupabase() {
    console.log('--- データ読み込み開始 ---');

    try {
        // イベントデータを読み込み
        const { data: events, error: eventsError } = await simpleSupabase
            .from('schedule_events')
            .select('*')
            .eq('user_id', SYNC_CONFIG.USER_ID)
            .order('date');

        if (eventsError) {
            console.error('イベント読み込みエラー:', eventsError);
        } else if (events && events.length > 0) {
            console.log(`${events.length}件のイベントを取得`);

            // ローカルストレージに保存
            const formattedEvents = events.map(e => ({
                id: e.id,
                title: e.title || '',
                date: e.date || '',
                time: e.time || '',
                person: e.person || '',
                description: e.description || '',
                color: e.color || 'transparent',
                note: e.note || '',
                isCampaign: e.is_campaign || false,
                campaignMembers: e.campaign_members || []
            }));

            localStorage.setItem('scheduleEvents', JSON.stringify(formattedEvents));

            // 画面を更新（既存の関数を呼び出し）
            if (typeof scheduleManager !== 'undefined' && scheduleManager.renderCalendar) {
                scheduleManager.events = formattedEvents;
                scheduleManager.renderCalendar();
            }
        }

        // スタッフデータを読み込み
        const { data: staff, error: staffError } = await simpleSupabase
            .from('staff_members')
            .select('*')
            .eq('user_id', SYNC_CONFIG.USER_ID)
            .order('staff_index');

        if (staffError) {
            console.error('スタッフ読み込みエラー:', staffError);
        } else if (staff && staff.length > 0) {
            console.log(`${staff.length}人のスタッフを取得`);

            // 配列形式に変換
            const maxIndex = Math.max(...staff.map(s => s.staff_index));
            const staffArray = new Array(Math.max(maxIndex + 1, 9)).fill('');

            staff.forEach(s => {
                if (s.staff_index >= 0 && s.staff_index < staffArray.length) {
                    staffArray[s.staff_index] = s.name || '';
                }
            });

            localStorage.setItem('staffMembers', JSON.stringify(staffArray));

            // 画面を更新
            if (typeof scheduleManager !== 'undefined' && scheduleManager.renderStaffHeader) {
                scheduleManager.staffMembers = staffArray;
                scheduleManager.renderStaffHeader();
            }
        }

        console.log('--- データ読み込み完了 ---');

    } catch (error) {
        console.error('データ読み込みエラー:', error);
    }
}

// イベントを保存
async function saveEventToSupabase(event) {
    if (!simpleSupabase) {
        console.error('Supabase未初期化');
        return false;
    }

    console.log('イベント保存:', event);

    const eventData = {
        user_id: SYNC_CONFIG.USER_ID,
        event_id: event.id || 'evt_' + Date.now(),
        title: event.title || '',
        date: event.date || '',
        time: event.time || null,
        person: event.person || null,
        description: event.description || null,
        color: event.color || null,
        note: event.note || null,
        is_campaign: event.isCampaign || false,
        campaign_members: event.campaignMembers || []
    };

    try {
        if (typeof event.id === 'number') {
            // 更新
            const { error } = await simpleSupabase
                .from('schedule_events')
                .update(eventData)
                .eq('id', event.id)
                .eq('user_id', SYNC_CONFIG.USER_ID);

            if (error) throw error;
            console.log('イベント更新成功');
        } else {
            // 新規作成
            const { error } = await simpleSupabase
                .from('schedule_events')
                .insert(eventData);

            if (error) throw error;
            console.log('イベント作成成功');
        }

        // 他デバイスの更新を反映するため、少し待ってから再読み込み
        setTimeout(() => loadAllDataFromSupabase(), 1000);
        return true;

    } catch (error) {
        console.error('イベント保存エラー:', error);
        return false;
    }
}

// スタッフを保存
async function saveStaffToSupabase(staffArray) {
    if (!simpleSupabase) {
        console.error('Supabase未初期化');
        return false;
    }

    console.log('スタッフ保存:', staffArray);

    try {
        // 既存データを削除
        await simpleSupabase
            .from('staff_members')
            .delete()
            .eq('user_id', SYNC_CONFIG.USER_ID);

        // 新規データを挿入
        const staffData = staffArray.map((name, index) => ({
            user_id: SYNC_CONFIG.USER_ID,
            staff_index: index,
            name: name || ''
        }));

        const { error } = await simpleSupabase
            .from('staff_members')
            .insert(staffData);

        if (error) throw error;
        console.log('スタッフ保存成功');

        // 他デバイスの更新を反映
        setTimeout(() => loadAllDataFromSupabase(), 1000);
        return true;

    } catch (error) {
        console.error('スタッフ保存エラー:', error);
        return false;
    }
}

// イベントを削除
async function deleteEventFromSupabase(eventId) {
    if (!simpleSupabase || !eventId) return false;

    console.log('イベント削除:', eventId);

    try {
        const { error } = await simpleSupabase
            .from('schedule_events')
            .delete()
            .eq('id', eventId)
            .eq('user_id', SYNC_CONFIG.USER_ID);

        if (error) throw error;
        console.log('イベント削除成功');

        setTimeout(() => loadAllDataFromSupabase(), 1000);
        return true;

    } catch (error) {
        console.error('イベント削除エラー:', error);
        return false;
    }
}

// 自動保存の設定
function setupAutoSave() {
    // 既存のscheduleManagerの保存関数を上書き
    if (typeof scheduleManager !== 'undefined') {
        const originalSaveEvents = scheduleManager.saveEvents;
        const originalSaveStaff = scheduleManager.saveStaffMembers;

        // イベント保存時
        scheduleManager.saveEvents = function() {
            originalSaveEvents.call(this);

            // Supabaseに全イベントを保存
            const events = this.events || [];
            events.forEach(event => {
                saveEventToSupabase(event);
            });
        };

        // スタッフ保存時
        scheduleManager.saveStaffMembers = function() {
            originalSaveStaff.call(this);

            // Supabaseにスタッフを保存
            saveStaffToSupabase(this.staffMembers || []);
        };

        console.log('自動保存設定完了');
    }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('ページ読み込み完了 - 同期システム初期化');

    // 既存のSupabase初期化を無効化
    if (typeof supabaseSync !== 'undefined') {
        supabaseSync.syncEnabled = false;
    }

    // シンプル同期システムを初期化
    await initSimpleSync();
});

// グローバルに公開
window.simpleSync = {
    init: initSimpleSync,
    loadData: loadAllDataFromSupabase,
    saveEvent: saveEventToSupabase,
    saveStaff: saveStaffToSupabase,
    deleteEvent: deleteEventFromSupabase
};