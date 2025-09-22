// Supabase クライアント設定とデータ同期

class SupabaseSync {
    constructor() {
        // Supabaseの設定
        this.SUPABASE_URL = 'https://igjkroqjhwhewtrprhds.supabase.co';
        this.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnamtyb3FqaHdoZXd0cnByaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTQ5ODEsImV4cCI6MjA3MzgzMDk4MX0.7pD4mWSbr8FvGKIjkNSrQuLdUPISxayZGANZ27TuqzI';

        this.supabase = null;
        this.subscriptions = [];
        this.syncEnabled = false;
        this.lastSync = null;
    }

    // Supabaseの初期化
    async init() {
        try {
            // Supabase URLとキーが設定されているか確認
            if (this.SUPABASE_URL === 'YOUR_SUPABASE_URL' || this.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
                console.log('Supabase: ローカルストレージモードで動作します（データベース未設定）');
                this.updateSyncStatus('ローカルのみ', 'gray');
                return false;
            }

            // Supabaseクライアントを作成
            const { createClient } = window.supabase;
            this.supabase = createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true
                },
                realtime: {
                    params: {
                        eventsPerSecond: 10
                    }
                }
            });

            console.log('Supabase: 接続しました');
            this.syncEnabled = true;
            this.updateSyncStatus('オンライン 🔴', 'green');

            // 初期データを読み込み
            await this.loadInitialData();

            // リアルタイム同期を設定
            this.setupRealtimeSync();

            return true;
        } catch (error) {
            console.error('Supabase初期化エラー:', error);
            this.updateSyncStatus('オフライン', 'gray');
            return false;
        }
    }

    // 初期データの読み込み
    async loadInitialData() {
        try {
            // スタッフメンバーを読み込み
            const { data: staffData, error: staffError } = await this.supabase
                .from('staff_members')
                .select('*')
                .order('position');

            if (staffError) throw staffError;

            if (staffData && staffData.length > 0) {
                const maxPosition = Math.max(...staffData.map(s => s.position));
                const minLength = 9; // 最低9人分の枠を確保
                const staffArray = new Array(Math.max(maxPosition + 1, minLength)).fill('');
                staffData.forEach(staff => {
                    staffArray[staff.position] = staff.name || '';
                });
                scheduleManager.staffMembers = staffArray;
                scheduleManager.saveStaffMembers();
            } else {
                // データがない場合は9人分の空枠を作成
                if (!scheduleManager.staffMembers || scheduleManager.staffMembers.length < 9) {
                    scheduleManager.staffMembers = new Array(9).fill('');
                    scheduleManager.saveStaffMembers();
                }
            }

            // イベントを読み込み
            const { data: eventsData, error: eventsError } = await this.supabase
                .from('events')
                .select('*')
                .order('date');

            if (eventsError) throw eventsError;

            if (eventsData && eventsData.length > 0) {
                scheduleManager.events = eventsData.map(event => ({
                    ...event,
                    campaignMembers: event.campaign_members || []
                }));
                scheduleManager.saveEvents();
            } else {
                // Supabaseにデータがない場合は、ローカルのデータを保持
                console.log('Supabase: イベントデータがありません。ローカルデータを使用します。');
            }

            // 特拡メモを読み込み
            const { data: memoData, error: memoError } = await this.supabase
                .from('campaign_memos')
                .select('*')
                .single();

            if (!memoError && memoData) {
                scheduleManager.campaignMemo = memoData.memo || '';
                scheduleManager.saveCampaignMemo(scheduleManager.campaignMemo);
            }

            console.log('Supabase: 初期データを読み込みました');
            scheduleManager.renderStaffHeader();
            scheduleManager.renderCalendar();
        } catch (error) {
            console.error('初期データ読み込みエラー:', error);
        }
    }

    // リアルタイム同期の設定
    setupRealtimeSync() {
        // すべてのテーブルの変更を監視する単一チャンネル
        const channel = this.supabase
            .channel('db-changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'events' },
                async (payload) => {
                    console.log('イベント追加:', payload);
                    await this.handleEventChange({ ...payload, eventType: 'INSERT' });
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'events' },
                async (payload) => {
                    console.log('イベント更新:', payload);
                    await this.handleEventChange({ ...payload, eventType: 'UPDATE' });
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'events' },
                async (payload) => {
                    console.log('イベント削除:', payload);
                    await this.handleEventChange({ ...payload, eventType: 'DELETE' });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'staff_members' },
                async (payload) => {
                    console.log('スタッフ変更:', payload);
                    await this.handleStaffChange(payload);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'campaign_memos' },
                async (payload) => {
                    console.log('メモ変更:', payload);
                    await this.handleMemoChange(payload);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Supabase: リアルタイム同期を開始しました');
                    this.updateSyncStatus('同期中 🔄', 'green');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('Supabase: チャンネルエラーが発生しました');
                    this.updateSyncStatus('エラー ⚠️', 'red');
                    // 再接続を試みる
                    setTimeout(() => {
                        this.cleanup();
                        this.setupRealtimeSync();
                    }, 5000);
                } else if (status === 'TIMED_OUT') {
                    console.error('Supabase: 接続がタイムアウトしました');
                    this.updateSyncStatus('タイムアウト', 'orange');
                }
            });

        this.subscriptions.push(channel);
    }

    // イベント変更の処理
    async handleEventChange(payload) {
        // 自分自身の変更の場合はスキップ（無限ループ防止）
        const timestamp = Date.now();
        if (this.lastSync && timestamp - this.lastSync < 1000) {
            console.log('自分自身の変更をスキップ');
            return;
        }

        if (payload.eventType === 'INSERT') {
            // 既に同じIDのイベントが存在する場合はスキップ
            const exists = scheduleManager.events.find(e => e.id === payload.new.id);
            if (!exists) {
                const newEvent = {
                    ...payload.new,
                    isCampaign: payload.new.is_campaign,
                    campaignMembers: payload.new.campaign_members || []
                };
                scheduleManager.events.push(newEvent);
                console.log('新しいイベントを追加:', newEvent);
            }
        } else if (payload.eventType === 'UPDATE') {
            const index = scheduleManager.events.findIndex(e => e.id === payload.new.id);
            if (index !== -1) {
                scheduleManager.events[index] = {
                    ...payload.new,
                    isCampaign: payload.new.is_campaign,
                    campaignMembers: payload.new.campaign_members || []
                };
                console.log('イベントを更新:', scheduleManager.events[index]);
            }
        } else if (payload.eventType === 'DELETE') {
            const beforeLength = scheduleManager.events.length;
            scheduleManager.events = scheduleManager.events.filter(e => e.id !== payload.old.id);
            if (scheduleManager.events.length < beforeLength) {
                console.log('イベントを削除:', payload.old.id);
            }
        }

        // LocalStorageに保存（Supabaseには送信しない）
        localStorage.setItem('scheduleEvents', JSON.stringify(scheduleManager.events));
        scheduleManager.renderCalendar();
    }

    // スタッフ変更の処理
    async handleStaffChange(payload) {
        await this.loadInitialData();
    }

    // メモ変更の処理
    async handleMemoChange(payload) {
        if (payload.new && payload.new.memo !== undefined) {
            scheduleManager.campaignMemo = payload.new.memo;
            scheduleManager.saveCampaignMemo(scheduleManager.campaignMemo);
            const memoInput = document.getElementById('campaignMemo');
            if (memoInput) {
                memoInput.value = scheduleManager.campaignMemo;
            }
        }
    }

    // イベントの保存
    async saveEvent(event) {
        if (!this.syncEnabled) return null;

        try {
            // 同期タイムスタンプを更新
            this.lastSync = Date.now();

            const eventData = {
                title: event.title,
                date: event.date,
                time: event.time || null,
                person: event.person || null,
                description: event.description || null,
                color: event.color || null,
                note: event.note || null,
                is_campaign: event.isCampaign || false,
                campaign_members: event.campaignMembers || []
            };

            // IDが数値型の場合は更新
            if (event.id && typeof event.id === 'number') {
                // 既存イベントの更新
                console.log('Supabase: イベントを更新します', event.id, eventData);
                const { data, error } = await this.supabase
                    .from('events')
                    .update(eventData)
                    .eq('id', event.id)
                    .select()
                    .single();

                if (error) {
                    console.error('更新エラー:', error);
                    throw error;
                }
                console.log('Supabase: イベント更新完了', data);
                return data;
            } else {
                // 新規イベントの作成
                console.log('Supabase: 新規イベントを作成します', eventData);
                const { data, error } = await this.supabase
                    .from('events')
                    .insert([eventData])
                    .select()
                    .single();

                if (error) {
                    console.error('作成エラー:', error);
                    throw error;
                }
                console.log('Supabase: イベント作成完了', data);
                return data;
            }
        } catch (error) {
            console.error('イベント保存エラー:', error.message || error);
            alert('データ同期エラーが発生しました。ページを再読み込みしてください。');
            return null;
        }
    }

    // イベントの削除
    async deleteEvent(eventId) {
        if (!this.syncEnabled || !eventId || typeof eventId !== 'number') return;

        try {
            const { error } = await this.supabase
                .from('events')
                .delete()
                .eq('id', eventId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('イベント削除エラー:', error);
            return false;
        }
    }

    // スタッフメンバーの保存
    async saveStaffMembers(staffMembers) {
        if (!this.syncEnabled) return false;

        try {
            // 同期タイムスタンプを更新
            this.lastSync = Date.now();

            // 既存のスタッフメンバーを削除
            const { error: deleteError } = await this.supabase
                .from('staff_members')
                .delete()
                .gte('position', 0);

            if (deleteError) {
                console.error('削除エラー:', deleteError);
                throw deleteError;
            }

            // 新しいスタッフメンバーを挿入（空文字も含めて全ポジションを保存）
            const staffData = staffMembers
                .map((name, position) => ({
                    position,
                    name: name || ''
                }));

            if (staffData.length > 0) {
                const { error } = await this.supabase
                    .from('staff_members')
                    .insert(staffData);

                if (error) {
                    console.error('挿入エラー:', error);
                    throw error;
                }
            }

            console.log('Supabase: スタッフメンバー保存完了');
            return true;
        } catch (error) {
            console.error('スタッフ保存エラー:', error.message || error);
            return false;
        }
    }

    // 特拡メモの保存
    async saveCampaignMemo(memo) {
        if (!this.syncEnabled) return;

        try {
            // 既存のメモを確認
            const { data: existing, error: selectError } = await this.supabase
                .from('campaign_memos')
                .select('id')
                .limit(1)
                .single();

            if (existing) {
                // 更新
                const { error } = await this.supabase
                    .from('campaign_memos')
                    .update({ memo })
                    .eq('id', existing.id);

                if (error) throw error;
            } else {
                // 新規作成
                const { error } = await this.supabase
                    .from('campaign_memos')
                    .insert([{ memo }]);

                if (error) throw error;
            }

            return true;
        } catch (error) {
            console.error('メモ保存エラー:', error);
            return false;
        }
    }

    // 同期ステータスの更新
    updateSyncStatus(message, color = 'gray') {
        const statusElement = document.getElementById('syncStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.style.color = color;
        }
    }

    // クリーンアップ
    cleanup() {
        this.subscriptions.forEach(subscription => {
            subscription.unsubscribe();
        });
        this.subscriptions = [];
        this.updateSyncStatus('オフライン', 'gray');
    }
}

// グローバルインスタンスを作成
const supabaseSync = new SupabaseSync();

// ページ読み込み時に初期化
window.addEventListener('DOMContentLoaded', async () => {
    await supabaseSync.init();
});