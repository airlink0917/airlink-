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

            // 初期データを読み込み
            await this.loadInitialData();

            // リアルタイム同期を設定
            this.setupRealtimeSync();

            return true;
        } catch (error) {
            console.error('Supabase初期化エラー:', error);
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
        // イベントテーブルの変更を監視
        const eventsChannel = this.supabase
            .channel('events-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'events' },
                async (payload) => {
                    console.log('イベント変更:', payload);
                    await this.handleEventChange(payload);
                }
            )
            .subscribe();

        // スタッフメンバーテーブルの変更を監視
        const staffChannel = this.supabase
            .channel('staff-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'staff_members' },
                async (payload) => {
                    console.log('スタッフ変更:', payload);
                    await this.handleStaffChange(payload);
                }
            )
            .subscribe();

        // 特拡メモテーブルの変更を監視
        const memoChannel = this.supabase
            .channel('memo-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'campaign_memos' },
                async (payload) => {
                    console.log('メモ変更:', payload);
                    await this.handleMemoChange(payload);
                }
            )
            .subscribe();

        this.subscriptions.push(eventsChannel, staffChannel, memoChannel);
    }

    // イベント変更の処理
    async handleEventChange(payload) {
        if (payload.eventType === 'INSERT') {
            const newEvent = {
                ...payload.new,
                campaignMembers: payload.new.campaign_members || []
            };
            scheduleManager.events.push(newEvent);
        } else if (payload.eventType === 'UPDATE') {
            const index = scheduleManager.events.findIndex(e => e.id === payload.new.id);
            if (index !== -1) {
                scheduleManager.events[index] = {
                    ...payload.new,
                    campaignMembers: payload.new.campaign_members || []
                };
            }
        } else if (payload.eventType === 'DELETE') {
            scheduleManager.events = scheduleManager.events.filter(e => e.id !== payload.old.id);
        }

        scheduleManager.saveEvents();
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
        if (!this.syncEnabled) return;

        try {
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

            // IDが数値型、または"temp_"で始まらない文字列の場合は更新
            if (event.id && typeof event.id === 'number') {
                // 既存イベントの更新
                console.log('Supabase: イベントを更新します', event.id, eventData);
                const { data, error } = await this.supabase
                    .from('events')
                    .update(eventData)
                    .eq('id', event.id)
                    .select()
                    .single();

                if (error) throw error;
                console.log('Supabase: イベント更新完了', data);
                return data;
            } else {
                // 新規イベントの作成（temp_で始まるIDまたはIDなしの場合）
                console.log('Supabase: 新規イベントを作成します', eventData);
                const { data, error } = await this.supabase
                    .from('events')
                    .insert([eventData])
                    .select()
                    .single();

                if (error) throw error;
                console.log('Supabase: イベント作成完了', data);
                return data;
            }
        } catch (error) {
            console.error('イベント保存エラー:', error);
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
        if (!this.syncEnabled) return;

        try {
            // 既存のスタッフメンバーを削除
            await this.supabase
                .from('staff_members')
                .delete()
                .gte('position', 0);

            // 新しいスタッフメンバーを挿入
            const staffData = staffMembers
                .map((name, position) => ({
                    position,
                    name: name || null
                }))
                .filter(staff => staff.name !== null);

            if (staffData.length > 0) {
                const { error } = await this.supabase
                    .from('staff_members')
                    .insert(staffData);

                if (error) throw error;
            }

            return true;
        } catch (error) {
            console.error('スタッフ保存エラー:', error);
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

    // クリーンアップ
    cleanup() {
        this.subscriptions.forEach(subscription => {
            subscription.unsubscribe();
        });
        this.subscriptions = [];
    }
}

// グローバルインスタンスを作成
const supabaseSync = new SupabaseSync();

// ページ読み込み時に初期化
window.addEventListener('DOMContentLoaded', async () => {
    await supabaseSync.init();
});