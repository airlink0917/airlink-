// ===================================
// 同期機能改善パッチ
// ===================================

// デバッグモードを有効化
const DEBUG_MODE = true;

// 元のsyncData関数を改善
async function improvedSyncData() {
    if (DEBUG_MODE) console.log('同期処理開始...');

    try {
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) syncStatus.textContent = '同期中...';

        // イベントデータを取得
        const { data: eventData, error: eventError } = await supabase
            .from('schedule_events')
            .select('*')
            .eq('user_id', USER_ID);

        if (eventError) {
            console.error('イベント取得エラー:', eventError);
            if (syncStatus) syncStatus.textContent = '同期エラー';
            return;
        }

        if (DEBUG_MODE) console.log('取得したイベント:', eventData);

        // イベントデータを処理
        if (eventData) {
            // 完全に置き換え
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

            // LocalStorageに保存
            localStorage.setItem('scheduleEvents', JSON.stringify(events));

            // カレンダーを再描画
            if (typeof renderCalendar === 'function') {
                renderCalendar();
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
            return;
        }

        if (DEBUG_MODE) console.log('取得したスタッフ:', staffData);

        // スタッフデータを処理
        if (staffData && staffData.length > 0) {
            const maxIndex = Math.max(...staffData.map(s => s.staff_index), 8);
            const newStaff = new Array(maxIndex + 1).fill('');

            staffData.forEach(s => {
                if (s.staff_index >= 0 && s.staff_index < newStaff.length) {
                    newStaff[s.staff_index] = s.name || '';
                }
            });

            staffMembers = newStaff;
            localStorage.setItem('staffMembers', JSON.stringify(staffMembers));

            if (typeof renderStaffInputs === 'function') {
                renderStaffInputs();
            }
            if (typeof renderCalendar === 'function') {
                renderCalendar();
            }
        } else if (staffMembers.length === 0) {
            // 初回アクセス時のデフォルト値
            staffMembers = new Array(9).fill('');
            localStorage.setItem('staffMembers', JSON.stringify(staffMembers));
            if (typeof renderStaffInputs === 'function') {
                renderStaffInputs();
            }
        }

        if (syncStatus) {
            syncStatus.textContent = '同期完了';
            setTimeout(() => {
                syncStatus.textContent = '';
            }, 2000);
        }

        if (DEBUG_MODE) console.log('同期完了');

    } catch (error) {
        console.error('同期エラー:', error);
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) syncStatus.textContent = '同期エラー';
    }
}

// 保存時のエラーハンドリング改善
async function improvedSaveEventToSupabase(event) {
    if (!supabase) {
        console.error('Supabaseが初期化されていません');
        return;
    }

    if (DEBUG_MODE) console.log('イベント保存:', event);

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

        const { data, error } = await supabase
            .from('schedule_events')
            .upsert(eventData, { onConflict: 'event_id,user_id' });

        if (error) {
            console.error('イベント保存エラー:', error);
            alert('データ保存に失敗しました。もう一度お試しください。');
        } else {
            if (DEBUG_MODE) console.log('イベント保存成功:', data);
            // 保存後すぐに同期
            setTimeout(() => improvedSyncData(), 500);
        }

    } catch (error) {
        console.error('イベント保存エラー:', error);
        alert('データ保存に失敗しました。もう一度お試しください。');
    }
}

// スタッフ保存の改善
async function improvedSaveStaffToSupabase() {
    if (!supabase) {
        console.error('Supabaseが初期化されていません');
        return;
    }

    if (DEBUG_MODE) console.log('スタッフ保存:', staffMembers);

    try {
        // 既存データを削除
        const { error: deleteError } = await supabase
            .from('staff_members')
            .delete()
            .eq('user_id', USER_ID);

        if (deleteError) {
            console.error('スタッフ削除エラー:', deleteError);
            return;
        }

        // 新規データを挿入
        const staffData = staffMembers.map((name, index) => ({
            user_id: USER_ID,
            staff_index: index,
            name: name || ''
        }));

        const { data, error } = await supabase
            .from('staff_members')
            .insert(staffData);

        if (error) {
            console.error('スタッフ保存エラー:', error);
        } else {
            if (DEBUG_MODE) console.log('スタッフ保存成功:', data);
            // 保存後すぐに同期
            setTimeout(() => improvedSyncData(), 500);
        }

    } catch (error) {
        console.error('スタッフ保存エラー:', error);
    }
}

// 初期化時に関数を置き換え
if (typeof window !== 'undefined') {
    console.log('同期機能改善パッチを適用中...');

    // 既存の関数を置き換え
    window.syncData = improvedSyncData;
    window.saveEventToSupabase = improvedSaveEventToSupabase;
    window.saveStaffToSupabase = improvedSaveStaffToSupabase;

    // ページ読み込み後に初期同期
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => {
            improvedSyncData();
        }, 1000);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                improvedSyncData();
            }, 1000);
        });
    }

    console.log('同期機能改善パッチ適用完了');
}