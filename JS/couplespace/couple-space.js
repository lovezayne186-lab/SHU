/* ==========================================================================
           逻辑控制 (Logic Control)
           ========================================================================== */

        const ANNIVERSARY_STORAGE_KEY = 'couple_space_anniversary_date_v1';
        const DEFAULT_ANNIVERSARY_ISO = '2026-01-01';
        let anniversaryStartDate = new Date(`${DEFAULT_ANNIVERSARY_ISO}T00:00:00`);
        
        const MOOD_STORAGE_KEY = 'couple_space_mood_entries_v1';
        const ROLE_MOOD_STORAGE_KEY = 'couple_space_role_mood_entries_v1';
        const AI_MISS_STORAGE_KEY = 'couple_space_ai_miss_counts_v1';
        const COUPLE_SPACE_LAST_EXIT_KEY = 'couple_space_last_exit_time_v1_';
        const COUPLE_SPACE_DIARY_SYNC_LOCK_KEY = 'couple_space_diary_sync_lock_v1';
        const ACTIVITY_LOG_STORAGE_KEY = 'app_activity_logs';
        const COUPLE_SPACE_AI_ACTIVITY_STATE_PREFIX = 'couple_space_ai_activity_state_v1_';
        const COUPLE_SPACE_LOW_BATTERY_ALERT_STATE_PREFIX = 'couple_space_low_battery_alert_state_v1_';
        const SECRET_SPACE_MESSAGES_KEY = 'couple_space_secret_messages_v1';
        const SECRET_HEART_ACTIVITY_CURSOR_PREFIX = 'couple_secret_heart_activity_cursor_v1_';
        const SECRET_SPACE_PEER_ACTIVITY_KEY = 'couple_space_secret_peer_activity_v1';
        const SECRET_SPACE_PEER_CHAT_HISTORY_KEY = 'couple_space_secret_peer_chat_history_v1';
        const SECRET_SPACE_UI_STATE_KEY = 'couple_space_secret_ui_state_v1';
        const COUPLE_LINKED_ROLES_KEY = 'couple_linked_roles_v1';
        const COUPLE_ACTIVE_ROLE_KEY = 'couple_linked_role_id_v1';
        const COUPLE_HAS_LINKED_KEY = 'couple_has_linked_v1';
        const COUPLE_PENDING_INVITE_KEY = 'couple_pending_invite_v1';
        const COUPLE_ROLE_SELECT_AUTO_ENTER_KEY = 'couple_space_auto_enter_role_once_v1';
        const COUPLE_SPACE_ROLE_KEY_SEP = '__roleId__';
        const SECRET_USAGE_SETTING_KEYS = {
            master: 'secretUsageMonitorEnabled',
            wallet: 'secretUsageWalletEnabled',
            music: 'secretUsageMusicEnabled',
            period: 'secretUsagePeriodEnabled',
            battery: 'secretUsageBatteryEnabled'
        };

        const MOOD_OPTIONS = [
            { id: 'happy', label: '开心', icon: '../assets/images/mood-happy.png' },
            { id: 'excited', label: '兴奋', icon: '../assets/images/mood-excited.png' },
            { id: 'heartbeat', label: '心动', icon: '../assets/images/mood-heart.png' },
            { id: 'calm', label: '平静', icon: '../assets/images/mood-calm.png' },
            { id: 'sad', label: '伤心', icon: '../assets/images/mood-sad.png' },
            { id: 'angry', label: '生气', icon: '../assets/images/mood-angry.png' },
            { id: 'annoyed', label: '烦躁', icon: '../assets/images/mood-annoyed.png' },
            { id: 'tired', label: '心累', icon: '../assets/images/mood-tired.png' },
        ];

        let state = {
            missCountUser: 0,
            missCountRole: 0,
            activeTab: 'home',
            mood: {
                selectedDateKey: toDateKey(new Date()),
                entries: {},
                roleEntries: {},
                modalOpen: false,
                modalStep: 'pick',
                modalDateKey: toDateKey(new Date()),
                pickedMood: null,
                diaryDraft: '',
                diaryImagesDraft: [],
                isGridView: false,
                isEditing: false,
                editingDateKey: '',
            },
        };

        let monthGridClickTimer = null;
        let monthGridLastClickTime = 0;
        let monthGridLastDateKey = '';
        const MONTH_GRID_CLICK_DELAY = 220;
        let diaryEditPendingDateKey = '';
        let coupleSpaceAppVisible = false;
        let coupleSpaceEnterTask = null;
        let coupleSpaceLastEnterAt = 0;
        let roleDiarySyncInFlight = false;
        let roleDiarySyncToastMessage = '';
        let diaryNoteLongPressTimer = null;
        let diaryNoteSuppressNextClick = false;
        let diaryNoteLongPressActive = false;
        const DIARY_NOTE_LONG_PRESS_MS = 520;
        let roleDiaryManualConfirmHandler = null;
        let roleMissCountTarget = 0;
        let coupleRoleSelectSuppressUntil = 0;
        const jealousyDominationState = {
            monitorStarted: false,
            timer: null,
            activeOtherRoleId: '',
            since: 0,
            inFlight: false,
            flooding: false,
            popupTimer: null,
            snoozeUntil: 0
        };
        const DEFAULT_COUPLE_SPACE_CONFIRM_TITLE = '今日心情日记';
        const DEFAULT_COUPLE_SPACE_CONFIRM_TEXT = '是否要让角色撰写今日心情日记？';

        function safeJsonParse(text, fallback) {
            try {
                return JSON.parse(text);
            } catch (e) {
                return fallback;
            }
        }

        const DEV_AI_PARSE_FAILURE_LOG_KEY = 'dev_ai_parse_failures_v1';

        function isDevModeUnlocked() {
            try {
                return localStorage.getItem('dev_mode_unlocked') === 'true';
            } catch (e) {
                return false;
            }
        }

        function appendDevAiParseFailureLog(entry) {
            try {
                if (!isDevModeUnlocked()) return false;
                const listRaw = localStorage.getItem(DEV_AI_PARSE_FAILURE_LOG_KEY) || '[]';
                const list = safeJsonParse(listRaw, []);
                const arr = Array.isArray(list) ? list : [];
                const now = Date.now();
                const clean = entry && typeof entry === 'object' ? entry : {};
                const rawText = typeof clean.rawText === 'string' ? clean.rawText : '';
                const promptText = typeof clean.prompt === 'string' ? clean.prompt : '';
                arr.push({
                    at: now,
                    scene: String(clean.scene || ''),
                    roleId: String(clean.roleId || ''),
                    reason: String(clean.reason || ''),
                    prompt: promptText.length > 2200 ? promptText.slice(0, 2200) : promptText,
                    rawText: rawText.length > 4200 ? rawText.slice(0, 4200) : rawText
                });
                while (arr.length > 50) arr.shift();
                localStorage.setItem(DEV_AI_PARSE_FAILURE_LOG_KEY, JSON.stringify(arr));
                return true;
            } catch (e) {
                return false;
            }
        }

        function getCoupleSpaceForage() {
            try {
                const pw = window.parent && window.parent !== window ? window.parent : null;
                const inst = (pw && pw.__coupleSpaceForageInstance) || window.__coupleSpaceForageInstance;
                if (inst && typeof inst.getItem === 'function') return inst;
            } catch (e) { }
            try {
                const pw = window.parent && window.parent !== window ? window.parent : null;
                const lib =
                    (pw && pw.localforage && typeof pw.localforage.createInstance === 'function')
                        ? pw.localforage
                        : (window.localforage && typeof window.localforage.createInstance === 'function')
                            ? window.localforage
                            : null;
                if (!lib) return null;
                const inst = lib.createInstance({ name: 'shubao_large_store_v1', storeName: 'couple_space' });
                try {
                    window.__coupleSpaceForageInstance = inst;
                } catch (e1) { }
                try {
                    if (pw) pw.__coupleSpaceForageInstance = inst;
                } catch (e2) { }
                return inst;
            } catch (e3) {
                return null;
            }
        }

        let wechatForage = null;
        function getWechatForage() {
            try {
                if (wechatForage) return wechatForage;
                const pw = window.parent && window.parent !== window ? window.parent : null;
                const lib =
                    (pw && pw.localforage && typeof pw.localforage.createInstance === 'function')
                        ? pw.localforage
                        : (window.localforage && typeof window.localforage.createInstance === 'function')
                            ? window.localforage
                            : null;
                if (!lib) return null;
                wechatForage = lib.createInstance({ name: 'shubao-phone', storeName: 'wechat' });
                return wechatForage;
            } catch (e) {
                return null;
            }
        }

        const COUPLE_SPACE_FORAGE_BASE_KEYS = [
            'couple_space_data',
            'couple_bg',
            'couple_avatar_user',
            'couple_avatar_role',
            ANNIVERSARY_STORAGE_KEY,
            MOOD_STORAGE_KEY,
            ROLE_MOOD_STORAGE_KEY,
            SECRET_SPACE_MESSAGES_KEY,
            SECRET_SPACE_PEER_CHAT_HISTORY_KEY,
        ];
        const COUPLE_SPACE_FORAGE_BASE_KEY_SET = new Set(COUPLE_SPACE_FORAGE_BASE_KEYS);

        function buildCoupleSpaceRoleKey(baseKey, roleId) {
            const k = String(baseKey || '').trim();
            const rid = String(roleId || '').trim();
            if (!k) return '';
            if (!rid) return k;
            if (k.indexOf(COUPLE_SPACE_ROLE_KEY_SEP) !== -1) return k;
            return k + COUPLE_SPACE_ROLE_KEY_SEP + rid;
        }

        function isCoupleSpaceForageKey(key) {
            const k = String(key || '').trim();
            if (!k) return false;
            if (COUPLE_SPACE_FORAGE_BASE_KEY_SET.has(k)) return true;
            for (let i = 0; i < COUPLE_SPACE_FORAGE_BASE_KEYS.length; i++) {
                const base = COUPLE_SPACE_FORAGE_BASE_KEYS[i];
                if (k.indexOf(base + COUPLE_SPACE_ROLE_KEY_SEP) === 0) return true;
            }
            return false;
        }

        function isCoupleSpaceSmallStateKey(key) {
            const k = String(key || '').trim();
            if (!k) return false;
            return k === 'couple_space_data' || k.indexOf('couple_space_data' + COUPLE_SPACE_ROLE_KEY_SEP) === 0;
        }

        async function coupleSpaceGetRoleItem(baseKey, roleId) {
            const rid = String(roleId || '').trim();
            const k = String(baseKey || '').trim();
            if (!k) return null;
            if (!rid) return coupleSpaceGetItem(k);
            const nsKey = buildCoupleSpaceRoleKey(k, rid);
            const v = await coupleSpaceGetItem(nsKey);
            if (v !== null && v !== undefined) return v;
            const legacy = await coupleSpaceGetItem(k);
            if (legacy === null || legacy === undefined) return null;
            await coupleSpaceSetItem(nsKey, legacy);
            await coupleSpaceRemoveItem(k);
            return legacy;
        }

        async function coupleSpaceSetRoleItem(baseKey, roleId, value) {
            const rid = String(roleId || '').trim();
            const k = String(baseKey || '').trim();
            if (!k) return false;
            if (!rid) return coupleSpaceSetItem(k, value);
            const nsKey = buildCoupleSpaceRoleKey(k, rid);
            return coupleSpaceSetItem(nsKey, value);
        }

        async function coupleSpaceRemoveRoleItem(baseKey, roleId) {
            const rid = String(roleId || '').trim();
            const k = String(baseKey || '').trim();
            if (!k) return;
            if (!rid) return coupleSpaceRemoveItem(k);
            const nsKey = buildCoupleSpaceRoleKey(k, rid);
            await coupleSpaceRemoveItem(nsKey);
        }

        async function migrateLocalStorageKeyToForage(key) {
            const k = String(key || '').trim();
            if (!k || !isCoupleSpaceForageKey(k)) return null;
            const forage = getCoupleSpaceForage();
            if (!forage) return null;

            let raw = null;
            try {
                raw = localStorage.getItem(k);
            } catch (e) {
                raw = null;
            }
            if (raw === null || raw === undefined || raw === '') return null;

            let toStore = raw;
            if (
                k === 'couple_space_data' ||
                k === MOOD_STORAGE_KEY ||
                k === ROLE_MOOD_STORAGE_KEY ||
                k.indexOf('couple_space_data' + COUPLE_SPACE_ROLE_KEY_SEP) === 0 ||
                k.indexOf(MOOD_STORAGE_KEY + COUPLE_SPACE_ROLE_KEY_SEP) === 0 ||
                k.indexOf(ROLE_MOOD_STORAGE_KEY + COUPLE_SPACE_ROLE_KEY_SEP) === 0
            ) {
                const parsed = safeJsonParse(raw, null);
                if (parsed && typeof parsed === 'object') {
                    toStore = parsed;
                }
            }

            try {
                await forage.setItem(k, toStore);
                try {
                    localStorage.removeItem(k);
                } catch (e2) { }
                return toStore;
            } catch (e3) {
                return null;
            }
        }

        async function coupleSpaceGetItem(key) {
            const k = String(key || '').trim();
            if (!k) return null;
            const isSmall = isCoupleSpaceSmallStateKey(k);
            if (isSmall) {
                try {
                    const v = localStorage.getItem(k);
                    if (v !== null && v !== undefined) return v;
                } catch(e) {}
            }
            const forage = getCoupleSpaceForage();
            if (forage) {
                try {
                    const v = await forage.getItem(k);
                    if (v !== null && v !== undefined) return v;
                } catch (e) { }
            }
            const migrated = await migrateLocalStorageKeyToForage(k);
            if (migrated !== null && migrated !== undefined) return migrated;
            try {
                return localStorage.getItem(k);
            } catch (e2) {
                return null;
            }
        }

        async function coupleSpaceSetItem(key, value) {
            const k = String(key || '').trim();
            if (!k) return false;
            const isSmall = isCoupleSpaceSmallStateKey(k);
            if (isSmall) {
                try {
                    localStorage.setItem(k, typeof value === 'string' ? value : JSON.stringify(value));
                } catch(e) {}
            }
            const forage = getCoupleSpaceForage();
            if (forage) {
                try {
                    await forage.setItem(k, value);
                    try {
                        if (!isSmall && isCoupleSpaceForageKey(k)) localStorage.removeItem(k);
                    } catch (e1) { }
                    return true;
                } catch (e2) { }
            }
            try {
                if (!isSmall) {
                    localStorage.setItem(k, typeof value === 'string' ? value : JSON.stringify(value));
                }
                return true;
            } catch (e3) {
                return false;
            }
        }

        async function coupleSpaceRemoveItem(key) {
            const k = String(key || '').trim();
            if (!k) return;
            const forage = getCoupleSpaceForage();
            if (forage) {
                try {
                    await forage.removeItem(k);
                } catch (e) { }
            }
            try {
                localStorage.removeItem(k);
            } catch (e2) { }
        }

        function readActivityLogs() {
            try {
                const raw = localStorage.getItem(ACTIVITY_LOG_STORAGE_KEY) || '';
                if (!raw) return [];
                const parsed = safeJsonParse(raw, []);
                if (!Array.isArray(parsed)) return [];
                return parsed
                    .filter((it) => it && typeof it === 'object')
                    .sort((a, b) => (Number(a.ts || 0) - Number(b.ts || 0)));
            } catch (e) {
                return [];
            }
        }

        const ACTIVITY_ICON_SVGS = {
            home: '<svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2.5"></rect><line x1="11" y1="18" x2="13" y2="18"></line></svg>',
            wechat: '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H9l-6 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg>',
            chat: '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H9l-6 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg>',
            music: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"></path><circle cx="9" cy="18" r="3"></circle><circle cx="21" cy="16" r="3"></circle></svg>',
            moments: '<svg viewBox="0 0 24 24"><path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"></path><circle cx="12" cy="14" r="3"></circle></svg>',
            space: '<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>',
            wallet: '<svg viewBox="0 0 24 24"><path d="M3 7h18v12H3z"></path><path d="M3 7V6a3 3 0 0 1 3-3h12"></path><path d="M16 12h5"></path><circle cx="14" cy="12" r="1"></circle></svg>',
            period: '<svg viewBox="0 0 24 24"><path d="M12 2s-6 7-6 12a6 6 0 0 0 12 0c0-5-6-12-6-12z"></path></svg>',
            system: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M7 11V8a5 5 0 0 1 10 0v3"></path></svg>',
            battery: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="18" height="10" rx="2"></rect><line x1="22" y1="10" x2="22" y2="14"></line><line x1="6" y1="12" x2="10" y2="12"></line></svg>',
            other: '<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.2L5.5 20l2-7L2 9h7z"></path></svg>',
        };

        function getActivityIconKey(it) {
            const kind = String(it && it.kind || '').trim();
            if (kind === 'music_play' || kind === 'music_open') return 'music';
            if (kind === 'wechat_open' || kind === 'wechat_chat') return 'wechat';
            if (kind === 'moments_open') return 'moments';
            if (kind === 'wallet_open') return 'wallet';
            if (kind === 'period_open') return 'period';
            if (kind === 'system_exit') return 'system';
            if (kind === 'battery_low') return 'battery';
            const app = String(it && (it.app || it.targetApp) || '').trim();
            if (app && ACTIVITY_ICON_SVGS[app]) return app;
            const text = String(it && it.text || '').trim();
            if (text.includes('朋友圈')) return 'moments';
            if (text.includes('微信') || text.includes('聊天')) return 'wechat';
            if (text.includes('歌曲') || text.includes('听') || text.includes('音乐')) return 'music';
            if (text.includes('情侣空间') || text.includes('私密空间')) return 'space';
            if (text.includes('钱包')) return 'wallet';
            if (text.includes('经期')) return 'period';
            if (text.includes('电量')) return 'battery';
            if (text.includes('锁定') || text.includes('关闭')) return 'system';
            if (text.includes('手机')) return 'home';
            return 'other';
        }

        function buildActivityIconEl(iconKey) {
            const span = document.createElement('span');
            span.className = 'activity-log-icon';
            const svg = ACTIVITY_ICON_SVGS[iconKey] || ACTIVITY_ICON_SVGS.other;
            span.innerHTML = svg;
            return span;
        }

        function renderActivityLogs() {
            const main = document.getElementById('secret-space-main');
            if (!main) return;
            const list = readActivityLogs();
            const wrapper = document.createElement('div');
            wrapper.className = 'activity-log-list';
            for (let i = 0; i < list.length; i++) {
                const it = list[i];
                const time = String(it.time || '').trim();
                const text = String(it.text || '').trim();
                if (!time && !text) continue;

                const row = document.createElement('div');
                row.className = 'activity-log-item';

                const timeEl = document.createElement('div');
                timeEl.className = 'activity-log-time';
                timeEl.textContent = time || '';

                const pill = document.createElement('div');
                pill.className = 'activity-log-pill';

                const iconKey = getActivityIconKey(it);
                const iconEl = buildActivityIconEl(iconKey);

                const textEl = document.createElement('span');
                textEl.className = 'activity-log-text';
                textEl.textContent = text || '';

                pill.appendChild(iconEl);
                pill.appendChild(textEl);
                row.appendChild(timeEl);
                row.appendChild(pill);
                wrapper.appendChild(row);
            }

            main.innerHTML = '';
            main.appendChild(wrapper);
            try {
                main.scrollTop = main.scrollHeight;
            } catch (e) { }
        }

        window.renderActivityLogs = function () {
            try {
                if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.render === 'function') {
                    window.secretSpaceTimeline.render();
                    return;
                }
            } catch (e) { }
            renderActivityLogs();
        };

        window.addEventListener('storage', function (e) {
            if (!e || e.key !== ACTIVITY_LOG_STORAGE_KEY) return;
            const modal = document.getElementById('secret-space-modal');
            if (!modal || modal.hidden) return;
            try {
                if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.render === 'function') {
                    window.secretSpaceTimeline.render();
                    return;
                }
            } catch (e) { }
            renderActivityLogs();
        });

        (function () {
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            const secretSpaceMessagesStorageKey = buildCoupleSpaceRoleKey(SECRET_SPACE_MESSAGES_KEY, rid);
            const secretSpaceLegacyMessagesKey = SECRET_SPACE_MESSAGES_KEY;
            const secretSpacePeerActivityStorageKey = buildCoupleSpaceRoleKey(SECRET_SPACE_PEER_ACTIVITY_KEY, rid);
            const secretSpacePeerChatStorageKey = buildCoupleSpaceRoleKey(SECRET_SPACE_PEER_CHAT_HISTORY_KEY, rid);
            const secretSpaceLegacyPeerChatStorageKey = SECRET_SPACE_PEER_CHAT_HISTORY_KEY;
            const secretSpaceUiStateStorageKey = buildCoupleSpaceRoleKey(SECRET_SPACE_UI_STATE_KEY, rid);
            const secretSpaceMessagesMaxItems = 300;
            const secretSpaceDefaultAvatar =
                'data:image/svg+xml;charset=utf-8,' +
                encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><rect width="72" height="72" rx="36" fill="#e5e7eb"/><circle cx="36" cy="30" r="14" fill="#cbd5e1"/><path d="M12 66c6-16 18-22 24-22s18 6 24 22" fill="#cbd5e1"/></svg>'
                );

            const secretSpaceGetForage = () => {
                try {
                    const pw = window.parent && window.parent !== window ? window.parent : null;
                    const inst = pw && pw.__coupleSpaceForageInstance;
                    if (inst && typeof inst.getItem === 'function') return inst;
                } catch (e) { }
                try {
                    const cached = window.__coupleSpaceForageInstance;
                    if (cached && typeof cached.getItem === 'function') return cached;
                } catch (e2) { }
                try {
                    const pw = window.parent && window.parent !== window ? window.parent : null;
                    const lib =
                        (pw && pw.localforage && typeof pw.localforage.createInstance === 'function')
                            ? pw.localforage
                            : (window.localforage && typeof window.localforage.createInstance === 'function')
                                ? window.localforage
                                : null;
                    if (!lib) return null;
                    const inst = lib.createInstance({ name: 'shubao_large_store_v1', storeName: 'couple_space' });
                    try {
                        window.__coupleSpaceForageInstance = inst;
                    } catch (e3) { }
                    try {
                        if (pw) pw.__coupleSpaceForageInstance = inst;
                    } catch (e4) { }
                    return inst;
                } catch (e2) {
                    return null;
                }
            };

            let secretSpaceForageCache = null;
            let secretSpacePeerChatCache = null;
            let secretSpaceForageLoaded = false;
            let secretSpaceForageLoadInFlight = null;
            let secretSpaceAiTyping = false;
            let secretSpaceViewMode = 'normal';
            let secretSpaceMessageLongPressTimer = null;
            let secretSpaceMessageLongPressActive = false;

            function secretSpaceReadUiState() {
                try {
                    const raw = secretSpaceSafeReadRaw(secretSpaceUiStateStorageKey);
                    if (!raw) return { viewMode: 'normal' };
                    const parsed = safeJsonParse(raw, {});
                    const mode = parsed && parsed.viewMode === 'peer_usage' ? 'peer_usage' : 'normal';
                    return { viewMode: mode };
                } catch (e) {
                    return { viewMode: 'normal' };
                }
            }

            function secretSpaceWriteUiState(stateObj) {
                const st = stateObj && typeof stateObj === 'object' ? stateObj : { viewMode: 'normal' };
                const mode = st.viewMode === 'peer_usage' ? 'peer_usage' : 'normal';
                try {
                    localStorage.setItem(secretSpaceUiStateStorageKey, JSON.stringify({ viewMode: mode }));
                } catch (e) { }
            }

            secretSpaceViewMode = secretSpaceReadUiState().viewMode;

            function secretSpacePad2(n) {
                return String(n).padStart(2, '0');
            }

            function secretSpaceFormatActivityTimeCn(ts) {
                const t = Number(ts || 0);
                if (!t) return '';
                const d = new Date(t);
                const mo = secretSpacePad2(d.getMonth() + 1);
                const da = secretSpacePad2(d.getDate());
                const hh = secretSpacePad2(d.getHours());
                const mm = secretSpacePad2(d.getMinutes());
                return `${mo}月${da}日 ${hh}:${mm}`;
            }

            function secretSpaceSafeReadRaw(key) {
                try {
                    return localStorage.getItem(key) || '';
                } catch (e) {
                    return '';
                }
            }

            function secretSpaceNormalizeMessageItem(it) {
                if (!it || typeof it !== 'object') return null;
                const ts = Number(it.ts || it.timestamp || it.createdAt || 0) || 0;
                const rawType = String(it.type || it.messageType || '').trim();
                const type =
                    rawType === 'ai_message' || rawType === 'ai' || rawType === 'assistant' || rawType === 'role'
                        ? 'ai_message'
                        : 'message';
                let messageType = String(it.messageType || '').trim().toLowerCase();
                if (!messageType && rawType === 'transfer_card') messageType = 'transfer_card';
                if (!messageType && (rawType === 'translated_text' || rawType === 'translated')) messageType = 'translated_text';
                if (!messageType) messageType = 'text';
                const text = String(it.text || it.content || it.msg || '').trim();
                if (!ts) return null;
                if (messageType === 'transfer_card') {
                    const amount = Number(it.amount || 0) || 0;
                    if (!(amount > 0)) return null;
                    const content = String(it.content || text || '拿去花').trim() || '拿去花';
                    return {
                        type: 'ai_message',
                        messageType: 'transfer_card',
                        ts,
                        text: text || content,
                        amount: Math.round(amount * 100) / 100,
                        color: String(it.color || 'pink').trim() || 'pink',
                        content: content,
                        status: String(it.status || 'pending').trim() || 'pending'
                    };
                }
                if (!text) return null;
                return { type, messageType, ts, text };
            }

            function secretSpaceSerializeTranslatedPayload(payload) {
                if (!payload || typeof payload !== 'object' || typeof window.parseTranslatedTextPayload !== 'function') return '';
                const parsed = window.parseTranslatedTextPayload(payload);
                const foreignText = String(parsed && (parsed.foreignText || parsed.bodyText) || '').trim();
                const translationText = String(parsed && (parsed.translationText || parsed.foreignText || parsed.bodyText) || '').trim();
                if (!(foreignText || translationText)) return '';
                return JSON.stringify({
                    foreign: foreignText || translationText,
                    translation: translationText || foreignText
                });
            }

            function secretSpaceNormalizeStructuredPayload(rawValue) {
                const normalizeCandidate = typeof window.normalizeStructuredTranslatedCandidate === 'function'
                    ? window.normalizeStructuredTranslatedCandidate
                    : null;
                const parseBubble = typeof window.parseTranslatedBubbleText === 'function'
                    ? window.parseTranslatedBubbleText
                    : null;

                if (rawValue && typeof rawValue === 'object') {
                    if (String(rawValue.type || rawValue.kind || '').trim() === 'transfer_card') {
                        return { mode: 'transfer_card', payload: rawValue };
                    }
                    const serialized = secretSpaceSerializeTranslatedPayload(rawValue);
                    if (serialized) return { mode: 'translated_text', text: serialized };
                    const objectText = String(rawValue.text != null ? rawValue.text : rawValue.content || '').trim();
                    if (!objectText) return null;
                    const objectCandidate = normalizeCandidate ? normalizeCandidate(objectText) : null;
                    if (objectCandidate && objectCandidate.mode === 'translated_text') {
                        return {
                            mode: 'translated_text',
                            text: JSON.stringify({
                                foreign: String(objectCandidate.foreign || '').trim(),
                                translation: String(objectCandidate.translation || '').trim()
                            })
                        };
                    }
                    const objectBubble = parseBubble ? parseBubble(objectText) : null;
                    if (objectBubble && objectBubble.hasTranslation) {
                        return {
                            mode: 'translated_text',
                            text: JSON.stringify({
                                foreign: String(objectBubble.foreignText || objectBubble.bodyText || '').trim(),
                                translation: String(objectBubble.translationText || objectBubble.foreignText || '').trim()
                            })
                        };
                    }
                    return objectText ? { mode: 'text', text: objectText } : null;
                }

                const rawText = String(rawValue == null ? '' : rawValue).trim();
                if (!rawText) return null;
                const candidate = normalizeCandidate ? normalizeCandidate(rawText) : null;
                if (candidate && candidate.mode === 'translated_text') {
                    return {
                        mode: 'translated_text',
                        text: JSON.stringify({
                            foreign: String(candidate.foreign || '').trim(),
                            translation: String(candidate.translation || '').trim()
                        })
                    };
                }
                const bubble = parseBubble ? parseBubble(rawText) : null;
                if (bubble && bubble.hasTranslation) {
                    return {
                        mode: 'translated_text',
                        text: JSON.stringify({
                            foreign: String(bubble.foreignText || bubble.bodyText || '').trim(),
                            translation: String(bubble.translationText || bubble.foreignText || '').trim()
                        })
                    };
                }
                return { mode: 'text', text: rawText };
            }

            function secretSpaceReadMessagesFromLocal() {
                const rawOwn = secretSpaceSafeReadRaw(secretSpaceMessagesStorageKey);
                const rawLegacy =
                    !rawOwn && secretSpaceMessagesStorageKey !== secretSpaceLegacyMessagesKey
                        ? secretSpaceSafeReadRaw(secretSpaceLegacyMessagesKey)
                        : '';
                const raw = rawOwn || rawLegacy;
                if (!raw) return [];
                const parsed = safeJsonParse(raw, []);
                if (!Array.isArray(parsed)) return [];
                const list = parsed
                    .map(secretSpaceNormalizeMessageItem)
                    .filter(Boolean)
                    .sort((a, b) => Number(a.ts) - Number(b.ts));
                if (!rawOwn && rawLegacy && list.length && secretSpaceMessagesStorageKey !== secretSpaceLegacyMessagesKey) {
                    try {
                        localStorage.setItem(secretSpaceMessagesStorageKey, JSON.stringify(list));
                        localStorage.removeItem(secretSpaceLegacyMessagesKey);
                    } catch (e) { }
                }
                return list;
            }

            function secretSpaceMergeMessageLists(a, b) {
                const out = [];
                const seen = new Set();
                const push = (it) => {
                    const item = secretSpaceNormalizeMessageItem(it);
                    if (!item) return;
                    const key = `${item.type}|${item.messageType || 'text'}|${item.ts}|${item.text}|${item.amount || 0}|${item.status || ''}`;
                    if (seen.has(key)) return;
                    seen.add(key);
                    out.push(item);
                };
                (Array.isArray(a) ? a : []).forEach(push);
                (Array.isArray(b) ? b : []).forEach(push);
                out.sort((x, y) => Number(x.ts) - Number(y.ts));
                return out;
            }

            function secretSpaceReadMessages() {
                const local = secretSpaceReadMessagesFromLocal();
                if (Array.isArray(secretSpaceForageCache) && secretSpaceForageCache.length) {
                    return secretSpaceMergeMessageLists(local, secretSpaceForageCache);
                }
                return local;
            }

            function secretSpaceWriteMessages(list) {
                const normalized = (Array.isArray(list) ? list : [])
                    .map(secretSpaceNormalizeMessageItem)
                    .filter(Boolean)
                    .sort((a, b) => Number(a.ts) - Number(b.ts));

                const messages = normalized.filter((it) => it.type === 'message');
                const aiMessages = normalized.filter((it) => it.type === 'ai_message');

                const max = secretSpaceMessagesMaxItems;
                const half = Math.floor(max / 2);

                let keepMsg = Math.min(messages.length, half);
                let keepAi = Math.min(aiMessages.length, half);

                let remain = max - (keepMsg + keepAi);
                if (remain > 0) {
                    const extraMsg = Math.min(messages.length - keepMsg, remain);
                    keepMsg += extraMsg;
                    remain -= extraMsg;
                }
                if (remain > 0) {
                    const extraAi = Math.min(aiMessages.length - keepAi, remain);
                    keepAi += extraAi;
                    remain -= extraAi;
                }

                const clean = messages.slice(-keepMsg).concat(aiMessages.slice(-keepAi));
                clean.sort((a, b) => Number(a.ts) - Number(b.ts));

                secretSpaceForageCache = clean;
                secretSpaceForageLoaded = true;
                try {
                    // Mirror once in localStorage so context builders can read it synchronously.
                    localStorage.setItem(secretSpaceMessagesStorageKey, JSON.stringify(clean));
                } catch (e0) { }
                try {
                    window.__secretSpaceMessagesByRole = window.__secretSpaceMessagesByRole || {};
                    if (rid) window.__secretSpaceMessagesByRole[rid] = clean.slice();
                } catch (e00) { }
                try {
                    coupleSpaceSetItem(secretSpaceMessagesStorageKey, clean);
                } catch (e) { }
                try {
                    window.dispatchEvent(new Event('couple_space_secret_messages_updated'));
                } catch (e2) { }
            }

            function secretSpaceAppendMessage(text) {
                const msg = String(text || '').trim();
                if (!msg) return false;
                const list = secretSpaceReadMessages();
                list.push({ type: 'message', ts: Date.now(), text: msg });
                secretSpaceWriteMessages(list);
                return true;
            }

            function secretSpaceAppendAiMessage(payload) {
                const normalizedPayload = secretSpaceNormalizeStructuredPayload(payload);
                if (!normalizedPayload) return false;
                const list = secretSpaceReadMessages();
                if (normalizedPayload.mode === 'transfer_card') {
                    const transferPayload = normalizedPayload.payload || {};
                    const amount = Number(transferPayload.amount || 0) || 0;
                    if (!(amount > 0)) return false;
                    const content = String(transferPayload.content || '拿去花').trim() || '拿去花';
                    list.push({
                        type: 'ai_message',
                        messageType: 'transfer_card',
                        ts: Date.now(),
                        text: content,
                        amount: Math.round(amount * 100) / 100,
                        color: String(transferPayload.color || 'pink').trim() || 'pink',
                        content: content,
                        status: String(transferPayload.status || 'pending').trim() || 'pending'
                    });
                } else {
                    list.push({
                        type: 'ai_message',
                        messageType: normalizedPayload.mode === 'translated_text' ? 'translated_text' : 'text',
                        ts: Date.now(),
                        text: String(normalizedPayload.text || '').trim()
                    });
                }
                secretSpaceWriteMessages(list);
                return true;
            }

            function secretSpaceLoadForageCache() {
                if (secretSpaceForageLoaded) return Promise.resolve(true);
                if (secretSpaceForageLoadInFlight) return secretSpaceForageLoadInFlight;
                const forage = secretSpaceGetForage();
                if (!forage) {
                    secretSpaceForageLoaded = true;
                    return Promise.resolve(false);
                }
                const readLegacy = secretSpaceMessagesStorageKey !== secretSpaceLegacyMessagesKey;
                const readPeerLegacy = secretSpacePeerChatStorageKey !== secretSpaceLegacyPeerChatStorageKey;
                secretSpaceForageLoadInFlight = Promise.all([
                    forage.getItem(secretSpaceMessagesStorageKey),
                    readLegacy ? forage.getItem(secretSpaceLegacyMessagesKey) : Promise.resolve(null),
                    forage.getItem(secretSpacePeerChatStorageKey),
                    readPeerLegacy ? forage.getItem(secretSpaceLegacyPeerChatStorageKey) : Promise.resolve(null),
                ])
                    .then((vals) => {
                        const val = vals && vals.length ? vals[0] : null;
                        const legacyVal = vals && vals.length > 1 ? vals[1] : null;
                        const peerVal = vals && vals.length > 2 ? vals[2] : null;
                        const peerLegacyVal = vals && vals.length > 3 ? vals[3] : null;
                        let list = [];
                        if (Array.isArray(val)) {
                            list = val;
                        } else if (typeof val === 'string') {
                            const parsed = safeJsonParse(val, []);
                            if (Array.isArray(parsed)) list = parsed;
                        }
                        if (!list.length && legacyVal) {
                            if (Array.isArray(legacyVal)) {
                                list = legacyVal;
                            } else if (typeof legacyVal === 'string') {
                                const parsedLegacy = safeJsonParse(legacyVal, []);
                                if (Array.isArray(parsedLegacy)) list = parsedLegacy;
                            }
                        }
                        const normalized = (Array.isArray(list) ? list : [])
                            .map(secretSpaceNormalizeMessageItem)
                            .filter(Boolean)
                            .sort((a, b) => Number(a.ts) - Number(b.ts));
                        const local = secretSpaceReadMessagesFromLocal();
                        const merged = secretSpaceMergeMessageLists(local, normalized);
                        secretSpaceWriteMessages(merged);

                        let peerList = [];
                        if (Array.isArray(peerVal)) {
                            peerList = peerVal;
                        } else if (typeof peerVal === 'string') {
                            const parsedPeer = safeJsonParse(peerVal, []);
                            if (Array.isArray(parsedPeer)) peerList = parsedPeer;
                        }
                        if (!peerList.length && peerLegacyVal) {
                            if (Array.isArray(peerLegacyVal)) {
                                peerList = peerLegacyVal;
                            } else if (typeof peerLegacyVal === 'string') {
                                const parsedPeerLegacy = safeJsonParse(peerLegacyVal, []);
                                if (Array.isArray(parsedPeerLegacy)) peerList = parsedPeerLegacy;
                            }
                        }
                        const peerNormalized = (Array.isArray(peerList) ? peerList : [])
                            .map(secretSpaceNormalizePeerChatHistoryItem)
                            .filter(Boolean)
                            .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
                        const localPeer = secretSpaceReadPeerChatHistoryFromLocal();
                        const peerMerged = secretSpaceMergePeerChatHistory(localPeer, peerNormalized);
                        secretSpaceWritePeerChatHistory(peerMerged);

                        if (readLegacy) {
                            try { forage.removeItem(secretSpaceLegacyMessagesKey).catch(() => { }); } catch (e0) { }
                        }
                        if (readPeerLegacy) {
                            try { forage.removeItem(secretSpaceLegacyPeerChatStorageKey).catch(() => { }); } catch (e1) { }
                        }
                        return true;
                    })
                    .catch(() => {
                        secretSpaceForageLoaded = true;
                        return false;
                    })
                    .finally(() => {
                        secretSpaceForageLoadInFlight = null;
                    });
                return secretSpaceForageLoadInFlight;
            }

            function secretSpaceReadActivityLogsFromSource() {
                let legacy = [];
                try {
                    const pw = window.parent && window.parent !== window ? window.parent : null;
                    if (pw && pw.ActivityTracker && typeof pw.ActivityTracker.read === 'function') {
                        legacy = pw.ActivityTracker.read();
                    }
                } catch (e) { }
                if (!Array.isArray(legacy) || !legacy.length) {
                    legacy = readActivityLogs();
                }
                if (!Array.isArray(legacy)) return [];

                const baseTs = Date.now() - legacy.length * 1000;
                return legacy
                    .filter((it) => it && typeof it === 'object')
                    .map((it, idx) => {
                        let ts = Number(it.ts || 0) || 0;
                        if (!ts) ts = baseTs + idx * 1000;
                        const time = String(it.time || '').trim() || secretSpaceFormatActivityTimeCn(ts);
                        const text = String(it.text || '').trim();
                        const kind = String(it.kind || '').trim();
                        const app = String(it.app || it.targetApp || '').trim();
                        return { type: 'log', ts, time, text, kind, app };
                    })
                    .filter((it) => it.text);
            }

            function secretSpaceNormalizePeerActivityItem(it, fallbackTs) {
                if (!it || typeof it !== 'object') return null;
                const tsRaw = Number(it.ts || it.timestamp || 0) || 0;
                const ts = tsRaw > 0 ? tsRaw : (Number(fallbackTs || 0) || Date.now());
                const text = String(it.text || it.event || '').trim();
                if (!text) return null;
                const time = String(it.time || '').trim() || secretSpaceFormatActivityTimeCn(ts);
                const kind = String(it.kind || '').trim() || 'other';
                const app = String(it.app || '').trim() || 'other';
                return { type: 'log', ts, time, text, kind, app };
            }

            function secretSpaceReadPeerActivityLogs() {
                try {
                    const raw = secretSpaceSafeReadRaw(secretSpacePeerActivityStorageKey);
                    if (!raw) return [];
                    const parsed = safeJsonParse(raw, []);
                    const arr = Array.isArray(parsed) ? parsed : [];
                    const base = Date.now() - arr.length * 60000;
                    const list = arr
                        .map((it, idx) => secretSpaceNormalizePeerActivityItem(it, base + idx * 60000))
                        .filter(Boolean)
                        .sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
                    return list;
                } catch (e) {
                    return [];
                }
            }

            function secretSpaceWritePeerActivityLogs(list) {
                const arr = Array.isArray(list) ? list : [];
                const clean = arr
                    .map((it) => secretSpaceNormalizePeerActivityItem(it, Date.now()))
                    .filter(Boolean)
                    .sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0))
                    .slice(-160);
                try {
                    localStorage.setItem(secretSpacePeerActivityStorageKey, JSON.stringify(clean));
                } catch (e) { }
                return clean;
            }

            function secretSpaceNormalizePeerChatHistoryItem(it) {
                if (!it || typeof it !== 'object') return null;
                const rawRole = String(it.role || it.type || '').trim().toLowerCase();
                const role = rawRole === 'ai' || rawRole === 'assistant' || rawRole === 'role' ? 'ai' : 'me';
                const timestamp = Number(it.timestamp || it.ts || it.createdAt || 0) || 0;
                const content = String(it.content || it.text || '').trim();
                if (!timestamp || !content) return null;
                const display = String(it.display || it.displayText || content).trim() || content;
                const messageType = String(it.messageType || '').trim().toLowerCase();
                return { role, content, display, timestamp, messageType: messageType === 'translated_text' ? 'translated_text' : 'text' };
            }

            function secretSpaceReadPeerChatHistoryFromLocal() {
                const rawOwn = secretSpaceSafeReadRaw(secretSpacePeerChatStorageKey);
                const rawLegacy =
                    !rawOwn && secretSpacePeerChatStorageKey !== secretSpaceLegacyPeerChatStorageKey
                        ? secretSpaceSafeReadRaw(secretSpaceLegacyPeerChatStorageKey)
                        : '';
                const raw = rawOwn || rawLegacy;
                if (!raw) return [];
                const parsed = safeJsonParse(raw, []);
                if (!Array.isArray(parsed)) return [];
                const list = parsed
                    .map(secretSpaceNormalizePeerChatHistoryItem)
                    .filter(Boolean)
                    .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
                if (!rawOwn && rawLegacy && list.length && secretSpacePeerChatStorageKey !== secretSpaceLegacyPeerChatStorageKey) {
                    try {
                        localStorage.setItem(secretSpacePeerChatStorageKey, JSON.stringify(list));
                        localStorage.removeItem(secretSpaceLegacyPeerChatStorageKey);
                    } catch (e) { }
                }
                return list;
            }

            function secretSpaceMergePeerChatHistory(a, b) {
                const out = [];
                const seen = new Set();
                const push = (it) => {
                    const item = secretSpaceNormalizePeerChatHistoryItem(it);
                    if (!item) return;
                    const key = `${item.role}|${item.timestamp}|${item.content}|${item.display}`;
                    if (seen.has(key)) return;
                    seen.add(key);
                    out.push(item);
                };
                (Array.isArray(a) ? a : []).forEach(push);
                (Array.isArray(b) ? b : []).forEach(push);
                out.sort((x, y) => Number(x.timestamp || 0) - Number(y.timestamp || 0));
                return out;
            }

            function secretSpaceReadPeerChatHistory() {
                const local = secretSpaceReadPeerChatHistoryFromLocal();
                if (Array.isArray(secretSpacePeerChatCache) && secretSpacePeerChatCache.length) {
                    return secretSpaceMergePeerChatHistory(local, secretSpacePeerChatCache);
                }
                return local;
            }

            function secretSpaceWritePeerChatHistory(list) {
                const normalized = (Array.isArray(list) ? list : [])
                    .map(secretSpaceNormalizePeerChatHistoryItem)
                    .filter(Boolean)
                    .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0))
                    .slice(-220);
                secretSpacePeerChatCache = normalized;
                try {
                    localStorage.setItem(secretSpacePeerChatStorageKey, JSON.stringify(normalized));
                } catch (e) { }
                try {
                    coupleSpaceSetItem(secretSpacePeerChatStorageKey, normalized);
                } catch (e2) { }
                return normalized;
            }

            function secretSpaceClearPeerChatHistory() {
                secretSpacePeerChatCache = [];
                try {
                    localStorage.removeItem(secretSpacePeerChatStorageKey);
                } catch (e) { }
                try {
                    localStorage.removeItem(secretSpaceLegacyPeerChatStorageKey);
                } catch (e2) { }
                try {
                    coupleSpaceRemoveItem(secretSpacePeerChatStorageKey);
                } catch (e3) { }
                secretSpaceRender();
            }

            function secretSpaceAppendPeerUsageUserMessage(displayText, apiContent) {
                const display = String(displayText || '').trim();
                const content = String(apiContent || '').trim() || display;
                if (!display || !content) return false;
                const list = secretSpaceReadPeerChatHistory();
                list.push({ role: 'me', content, display, timestamp: Date.now() });
                secretSpaceWritePeerChatHistory(list);
                secretSpaceRender();
                return true;
            }

            function secretSpaceAppendPeerUsageAiMessage(text) {
                const normalizedPayload = secretSpaceNormalizeStructuredPayload(text);
                if (!normalizedPayload || normalizedPayload.mode === 'transfer_card') return false;
                const msg = String(normalizedPayload.text || '').trim();
                if (!msg) return false;
                const list = secretSpaceReadPeerChatHistory();
                list.push({
                    role: 'ai',
                    content: msg,
                    display: normalizedPayload.mode === 'translated_text'
                        ? String((resolveCoupleSpaceTranslatedPayload(msg) || {}).translation || '').trim() || msg
                        : msg,
                    timestamp: Date.now(),
                    messageType: normalizedPayload.mode === 'translated_text' ? 'translated_text' : 'text'
                });
                secretSpaceWritePeerChatHistory(list);
                secretSpaceRender();
                return true;
            }

            function secretSpaceBuildPeerUsagePromptLogText(maxItems) {
                const n = Math.max(1, Number(maxItems) || 20);
                const logs = secretSpaceReadPeerActivityLogs().slice(-n);
                if (!logs.length) return '（暂无行为记录）';
                return logs
                    .map((it) => {
                        const t = String(it && it.time ? it.time : '').trim() || formatHm(it && it.ts || 0);
                        const txt = String(it && it.text ? it.text : '').trim();
                        if (!txt) return '';
                        return t ? `- [${t}] ${txt}` : `- ${txt}`;
                    })
                    .filter(Boolean)
                    .join('\n');
            }

            function secretSpaceBuildPeerUsageDialogueList() {
                const history = secretSpaceReadPeerChatHistory();
                const list = [];
                for (let i = 0; i < history.length; i++) {
                    const it = history[i];
                    if (!it || typeof it !== 'object') continue;
                    const role = String(it.role || '').trim();
                    const text = String(it.display || it.content || '').trim();
                    const messageType = String(it.messageType || '').trim().toLowerCase() === 'translated_text' ? 'translated_text' : 'text';
                    const ts = Number(it.timestamp || 0) || 0;
                    if (!text || !ts) continue;
                    if (role === 'ai') {
                        list.push({ type: 'ai_message', messageType, ts, text: messageType === 'translated_text' ? String(it.content || text).trim() : text });
                    } else {
                        list.push({ type: 'message', ts, text });
                    }
                }
                return list;
            }

            function secretSpaceSetViewMode(mode) {
                const m = String(mode || '').trim() === 'peer_usage' ? 'peer_usage' : 'normal';
                secretSpaceViewMode = m;
                secretSpaceWriteUiState({ viewMode: m });
                secretSpaceRender();
                return secretSpaceViewMode;
            }

            function secretSpaceGetMainEl() {
                return document.getElementById('secret-space-main');
            }

            function secretSpaceGetContainerEl() {
                const main = secretSpaceGetMainEl();
                if (!main) return null;
                let container = main.querySelector('#secret-timeline-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'secret-timeline-container';
                    main.appendChild(container);
                }
                return container;
            }

            function secretSpaceGetUserAvatarSrc() {
                const img = document.getElementById('avatar-user');
                const src = img ? String(img.getAttribute('src') || img.src || '').trim() : '';
                return src || secretSpaceDefaultAvatar;
            }

            function secretSpaceGetRoleAvatarSrc() {
                const img = document.getElementById('avatar-role');
                const src = img ? String(img.getAttribute('src') || img.src || '').trim() : '';
                return src || secretSpaceDefaultAvatar;
            }

            function secretSpaceScrollToBottom() {
                const main = secretSpaceGetMainEl();
                if (!main) return;
                try {
                    main.scrollTop = main.scrollHeight;
                } catch (e) { }
            }

            function secretSpaceFormatMoney(value) {
                const n = Number(value || 0);
                if (!Number.isFinite(n)) return '0.00';
                return (Math.round(n * 100) / 100).toFixed(2);
            }

            function secretSpaceOpenWalletFromCard() {
                const pw = getParentWindow();
                if (!pw) return;
                try {
                    if (typeof pw.openChatApp === 'function') pw.openChatApp();
                } catch (e) { }
                setTimeout(() => {
                    try {
                        if (pw.Wallet && typeof pw.Wallet.open === 'function') {
                            pw.Wallet.open();
                            return;
                        }
                    } catch (e3) { }
                    try {
                        if (typeof pw.switchWechatTab === 'function') pw.switchWechatTab('me');
                    } catch (e4) { }
                    try {
                        if (pw.MineCore && typeof pw.MineCore.show === 'function') pw.MineCore.show();
                    } catch (e5) { }
                    try {
                        if (pw.Wallet && typeof pw.Wallet.open === 'function') pw.Wallet.open();
                    } catch (e6) { }
                }, 40);
            }

            function secretSpaceResolveTranslatedPayload(item) {
                const it = item && typeof item === 'object' ? item : null;
                if (!it) return null;
                const rawText = String(it.text || '').trim();
                if (!rawText) return null;
                const parsePayload = typeof window.parseTranslatedTextPayload === 'function'
                    ? window.parseTranslatedTextPayload
                    : null;
                const normalizeCandidate = typeof window.normalizeStructuredTranslatedCandidate === 'function'
                    ? window.normalizeStructuredTranslatedCandidate
                    : null;
                const parseBubble = typeof window.parseTranslatedBubbleText === 'function'
                    ? window.parseTranslatedBubbleText
                    : null;

                if (String(it.messageType || '').trim() === 'translated_text' && parsePayload) {
                    const directPayload = parsePayload(rawText);
                    if (directPayload && directPayload.hasTranslation) return directPayload;
                }

                if (normalizeCandidate && parsePayload) {
                    const candidate = normalizeCandidate(rawText);
                    if (candidate && candidate.mode === 'translated_text') {
                        const structuredPayload = parsePayload({
                            foreign: candidate.foreign,
                            translation: candidate.translation
                        });
                        if (structuredPayload && structuredPayload.hasTranslation) return structuredPayload;
                    }
                }

                if (parseBubble) {
                    const plainPayload = parseBubble(rawText);
                    if (plainPayload && plainPayload.hasTranslation) return plainPayload;
                }

                return null;
            }

            function secretSpaceCreditWallet(amount) {
                const n = Number(amount || 0) || 0;
                if (!(n > 0)) return;
                const pw = getParentWindow();
                if (!pw) return;
                try {
                    if (pw.Wallet && typeof pw.Wallet.addTransaction === 'function') {
                        const roleName = typeof getRoleDisplayName === 'function' ? getRoleDisplayName() : 'Ta';
                        const roleId = rid || '';
                        pw.Wallet.addTransaction('income', `收到${roleName}的转账`, n, 'transfer', {
                            peerName: roleName,
                            peerRoleId: roleId,
                            kind: 'transfer'
                        });
                    }
                } catch (e) { }
            }

            function secretSpaceClaimTransferCard(ts) {
                const targetTs = Number(ts || 0) || 0;
                if (!targetTs) return false;
                const list = secretSpaceReadMessages();
                let changed = false;
                let amount = 0;
                for (let i = 0; i < list.length; i++) {
                    const it = list[i];
                    if (!it || it.type !== 'ai_message') continue;
                    if (String(it.messageType || 'text') !== 'transfer_card') continue;
                    if (Number(it.ts || 0) !== targetTs) continue;
                    if (String(it.status || '').trim() === 'claimed') return false;
                    it.status = 'claimed';
                    it.claimedAt = Date.now();
                    amount = Number(it.amount || 0) || 0;
                    changed = true;
                    break;
                }
                if (!changed) return false;
                secretSpaceWriteMessages(list);
                secretSpaceCreditWallet(amount);
                return true;
            }

            function secretSpaceBuildCombinedList() {
                if (secretSpaceViewMode === 'peer_usage') {
                    const peerLogs = secretSpaceReadPeerActivityLogs();
                    const peerDialogue = secretSpaceBuildPeerUsageDialogueList();
                    const combined = peerLogs.concat(peerDialogue).sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
                    if (combined.length) return combined;
                    return [{
                        type: 'log',
                        ts: Date.now(),
                        time: '',
                        text: '还没有他的使用记录，点击“查看他在干嘛”试试',
                        kind: 'other',
                        app: 'other'
                    }];
                }
                const logs = secretSpaceReadActivityLogsFromSource();
                const msgs = secretSpaceReadMessages();
                const list = logs.concat(msgs);
                list.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
                return list;
            }

            function secretSpaceApplyLogOverflowTicker(rootEl) {
                const root = rootEl && rootEl.querySelectorAll ? rootEl : null;
                if (!root) return;
                const textEls = root.querySelectorAll('.activity-log-text');
                for (let i = 0; i < textEls.length; i++) {
                    const el = textEls[i];
                    if (!el) continue;
                    el.classList.remove('is-overflow');
                    const fullText = String(el.getAttribute('data-full-text') || el.textContent || '').trim();
                    if (!fullText) continue;
                    el.textContent = fullText;
                    try {
                        el.style.removeProperty('--scroll-distance');
                    } catch (e0) { }
                    const overflow = Number(el.scrollWidth || 0) - Number(el.clientWidth || 0);
                    if (overflow <= 8) continue;
                    const track = document.createElement('span');
                    track.className = 'activity-log-text-track';
                    const main = document.createElement('span');
                    main.className = 'activity-log-text-main';
                    main.textContent = fullText;
                    const copy = document.createElement('span');
                    copy.className = 'activity-log-text-copy';
                    copy.setAttribute('aria-hidden', 'true');
                    copy.textContent = fullText;
                    track.appendChild(main);
                    track.appendChild(copy);
                    el.textContent = '';
                    el.appendChild(track);
                    el.classList.add('is-overflow');
                    try {
                        el.style.setProperty('--scroll-distance', `${Math.ceil(overflow + 18)}px`);
                    } catch (e1) { }
                }
            }

            function secretSpaceRender() {
                const container = secretSpaceGetContainerEl();
                if (!container) return;
                const list = secretSpaceBuildCombinedList();
                const wrapper = document.createElement('div');
                wrapper.className = 'activity-log-list';

                for (let i = 0; i < list.length; i++) {
                    const it = list[i];
                    if (it.type === 'message') {
                        const row = document.createElement('div');
                        row.className = 'secret-message-row';
                        row.setAttribute('data-message-type', 'message');
                        row.setAttribute('data-message-ts', String(Number(it.ts || 0) || 0));

                        const bubble = document.createElement('div');
                        bubble.className = 'secret-message-bubble';
                        bubble.textContent = it.text || '';

                        const avatar = document.createElement('img');
                        avatar.className = 'secret-message-avatar';
                        avatar.alt = '';
                        avatar.src = secretSpaceGetUserAvatarSrc();

                        row.appendChild(bubble);
                        row.appendChild(avatar);
                        wrapper.appendChild(row);
                        continue;
                    }

                    if (it.type === 'ai_message') {
                        const row = document.createElement('div');
                        row.className = 'secret-ai-message-row';
                        row.setAttribute('data-message-type', 'ai_message');
                        row.setAttribute('data-message-ts', String(Number(it.ts || 0) || 0));

                        const avatar = document.createElement('img');
                        avatar.className = 'secret-message-avatar';
                        avatar.alt = '';
                        avatar.src = secretSpaceGetRoleAvatarSrc();

                        let bubble = null;
                        if (String(it.messageType || 'text') === 'transfer_card') {
                            bubble = document.createElement('div');
                            bubble.className = 'secret-transfer-card' + (String(it.status || '').trim() === 'claimed' ? ' is-claimed' : '');

                            const amount = Number(it.amount || 0) || 0;
                            const content = String(it.content || it.text || '拿去花').trim() || '拿去花';

                            const title = document.createElement('div');
                            title.className = 'secret-transfer-card-title';
                            title.textContent = content;

                            const amountEl = document.createElement('div');
                            amountEl.className = 'secret-transfer-card-amount';
                            amountEl.textContent = '¥' + secretSpaceFormatMoney(amount);

                            const actionEl = document.createElement('div');
                            actionEl.className = 'secret-transfer-card-action';
                            const claimed = String(it.status || '').trim() === 'claimed';
                            actionEl.textContent = claimed ? '已领取，点击查看钱包' : '点击领取并查看钱包';

                            bubble.appendChild(title);
                            bubble.appendChild(amountEl);
                            bubble.appendChild(actionEl);
                            bubble.addEventListener('click', function () {
                                const nowClaimed = String(it.status || '').trim() === 'claimed';
                                if (!nowClaimed) secretSpaceClaimTransferCard(it.ts);
                                secretSpaceOpenWalletFromCard();
                                secretSpaceRender();
                            });
                        } else {
                            bubble = document.createElement('div');
                            bubble.className = 'secret-ai-message-bubble';
                            const translatedPayload = secretSpaceResolveTranslatedPayload(it);
                            if (translatedPayload && typeof window.buildTranslatedBubbleInnerHtml === 'function') {
                                bubble.classList.add('translated-message-shell', 'secret-translated-message-shell');
                                bubble.innerHTML = window.buildTranslatedBubbleInnerHtml(translatedPayload, {
                                    baseClass: 'translated-message-bubble secret-translated-message-bubble',
                                    foreignClass: 'translated-message-foreign secret-translated-message-foreign',
                                    dividerClass: 'translated-message-divider secret-translated-message-divider',
                                    translationClass: 'translated-message-translation secret-translated-message-translation',
                                    title: '点击收起或展开翻译'
                                });
                                const translatedBubble = bubble.querySelector('[data-translation-bubble="1"]');
                                if (translatedBubble && typeof window.bindTranslatedBubbleToggle === 'function') {
                                    window.bindTranslatedBubbleToggle(translatedBubble);
                                }
                            } else {
                                bubble.textContent = it.text || '';
                            }
                        }

                        row.appendChild(avatar);
                        row.appendChild(bubble);
                        wrapper.appendChild(row);
                        continue;
                    }

                    const time = String(it.time || '').trim();
                    const text = String(it.text || '').trim();
                    if (!time && !text) continue;

                    const row = document.createElement('div');
                    row.className = 'activity-log-item';

                    const timeEl = document.createElement('div');
                    timeEl.className = 'activity-log-time';
                    timeEl.textContent = time || '';

                    const pill = document.createElement('div');
                    pill.className = 'activity-log-pill';

                    const iconKey = getActivityIconKey(it);
                    const iconEl = buildActivityIconEl(iconKey);

                    const textEl = document.createElement('span');
                    textEl.className = 'activity-log-text';
                    textEl.setAttribute('data-full-text', text || '');
                    textEl.textContent = text || '';

                    pill.appendChild(iconEl);
                    pill.appendChild(textEl);
                    row.appendChild(timeEl);
                    row.appendChild(pill);
                    wrapper.appendChild(row);
                }

                if (secretSpaceAiTyping) {
                    const row = document.createElement('div');
                    row.className = 'secret-ai-message-row';

                    const avatar = document.createElement('img');
                    avatar.className = 'secret-message-avatar';
                    avatar.alt = '';
                    avatar.src = secretSpaceGetRoleAvatarSrc();

                    const bubble = document.createElement('div');
                    bubble.className = 'secret-ai-message-bubble secret-ai-typing-bubble';

                    const dots = document.createElement('span');
                    dots.className = 'secret-ai-typing-dots';
                    dots.innerHTML = '<i></i><i></i><i></i>';

                    bubble.appendChild(dots);
                    row.appendChild(avatar);
                    row.appendChild(bubble);
                    wrapper.appendChild(row);
                }

                container.innerHTML = '';
                container.appendChild(wrapper);
                secretSpaceApplyLogOverflowTicker(wrapper);
                secretSpaceScrollToBottom();
            }

            function secretSpaceSendMessage(text) {
                const msg = String(text || '').trim();
                if (!msg) return false;
                if (secretSpaceViewMode === 'peer_usage') {
                    return secretSpaceAppendPeerUsageUserMessage(msg, msg);
                }
                const ok = secretSpaceAppendMessage(msg);
                if (ok) secretSpaceRender();
                return ok;
            }

            function secretSpaceReceiveAiMessage(text) {
                const ok = secretSpaceAppendAiMessage(text);
                if (ok) secretSpaceRender();
                return ok;
            }

            function secretSpaceSetAiTyping(isTyping) {
                secretSpaceAiTyping = !!isTyping;
                secretSpaceRender();
                return secretSpaceAiTyping;
            }

            function secretSpaceBindInputEvents() {
                const input = document.getElementById('secret-space-input');
                if (input && input.dataset.secretBound !== '1') {
                    input.dataset.secretBound = '1';
                    input.addEventListener('keydown', (e) => {
                        if (!e || e.key !== 'Enter') return;
                        e.preventDefault();
                        const panel = document.getElementById('secret-space-modal');
                        const sendBtn = panel && panel.querySelector
                            ? panel.querySelector('[data-action="send-secret"]')
                            : null;
                        if (sendBtn && typeof sendBtn.click === 'function') {
                            sendBtn.click();
                            return;
                        }
                        if (secretSpaceSendMessage(input.value)) {
                            input.value = '';
                        }
                    });
                }

                const main = document.getElementById('secret-space-main');
                if (!main || main.dataset.secretMessageBound === '1') return;
                main.dataset.secretMessageBound = '1';

                const resolveLongPressTarget = function (target) {
                    const row = target && target.closest
                        ? target.closest('.secret-message-row[data-message-ts], .secret-ai-message-row[data-message-ts]')
                        : null;
                    if (!row) return null;
                    const ts = Number(row.getAttribute('data-message-ts') || 0) || 0;
                    const type = String(row.getAttribute('data-message-type') || '').trim();
                    if (!ts || (type !== 'message' && type !== 'ai_message')) return null;
                    return { ts, type };
                };

                const deleteMessageAt = function (meta) {
                    if (!meta || !meta.ts || !meta.type) return false;
                    if (!confirm('确定删除这条秘密空间消息吗？')) return false;
                    if (secretSpaceViewMode === 'peer_usage') {
                        const history = secretSpaceReadPeerChatHistory();
                        const next = history.filter(function (item) {
                            if (!item || typeof item !== 'object') return false;
                            const role = String(item.role || '').trim();
                            const ts = Number(item.timestamp || 0) || 0;
                            const matchesRole = meta.type === 'ai_message' ? role === 'ai' : role !== 'ai';
                            return !(matchesRole && ts === meta.ts);
                        });
                        if (next.length === history.length) return false;
                        secretSpaceWritePeerChatHistory(next);
                        secretSpaceRender();
                        return true;
                    }
                    const list = secretSpaceReadMessages();
                    const next = list.filter(function (item) {
                        if (!item || typeof item !== 'object') return false;
                        return !(Number(item.ts || 0) === meta.ts && String(item.type || '') === meta.type);
                    });
                    if (next.length === list.length) return false;
                    secretSpaceWriteMessages(next);
                    secretSpaceRender();
                    return true;
                };

                const startLongPress = function (e) {
                    const meta = resolveLongPressTarget(e && e.target ? e.target : null);
                    if (!meta) return;
                    secretSpaceMessageLongPressActive = true;
                    if (secretSpaceMessageLongPressTimer) {
                        clearTimeout(secretSpaceMessageLongPressTimer);
                        secretSpaceMessageLongPressTimer = null;
                    }
                    secretSpaceMessageLongPressTimer = setTimeout(function () {
                        secretSpaceMessageLongPressTimer = null;
                        if (!secretSpaceMessageLongPressActive) return;
                        deleteMessageAt(meta);
                    }, 520);
                };

                const cancelLongPress = function () {
                    secretSpaceMessageLongPressActive = false;
                    if (secretSpaceMessageLongPressTimer) {
                        clearTimeout(secretSpaceMessageLongPressTimer);
                        secretSpaceMessageLongPressTimer = null;
                    }
                };

                main.addEventListener('touchstart', startLongPress, { passive: true });
                main.addEventListener('touchend', cancelLongPress, { passive: true });
                main.addEventListener('touchcancel', cancelLongPress, { passive: true });
                main.addEventListener('touchmove', cancelLongPress, { passive: true });
                main.addEventListener('mousedown', function (e) {
                    if (e && e.button !== 0) return;
                    startLongPress(e);
                });
                main.addEventListener('mouseup', cancelLongPress);
                main.addEventListener('mouseleave', cancelLongPress);
                main.addEventListener('contextmenu', function (e) {
                    const meta = resolveLongPressTarget(e && e.target ? e.target : null);
                    if (!meta) return;
                    e.preventDefault();
                    deleteMessageAt(meta);
                });
            }

            window.secretSpaceTimeline = {
                render: secretSpaceRender,
                sendMessage: secretSpaceSendMessage,
                receiveAiMessage: secretSpaceReceiveAiMessage,
                setAiTyping: secretSpaceSetAiTyping,
                setViewMode: secretSpaceSetViewMode,
                getViewMode: () => secretSpaceViewMode,
                readPeerActivityLogs: secretSpaceReadPeerActivityLogs,
                writePeerActivityLogs: secretSpaceWritePeerActivityLogs,
                readPeerUsageChatHistory: secretSpaceReadPeerChatHistory,
                writePeerUsageChatHistory: secretSpaceWritePeerChatHistory,
                clearPeerUsageChatHistory: secretSpaceClearPeerChatHistory,
                appendPeerUsageUserMessage: secretSpaceAppendPeerUsageUserMessage,
                appendPeerUsageAiMessage: secretSpaceAppendPeerUsageAiMessage,
                buildPeerUsagePromptLogText: secretSpaceBuildPeerUsagePromptLogText,
                bindInputEvents: secretSpaceBindInputEvents,
                loadForageCache: secretSpaceLoadForageCache,
                normalizeIncomingPayload: secretSpaceNormalizeStructuredPayload,
                storageKey: secretSpaceMessagesStorageKey,
            };

            window.addEventListener('couple_space_secret_messages_updated', function () {
                const modal = document.getElementById('secret-space-modal');
                if (modal && !modal.hidden) {
                    secretSpaceRender();
                }
            });
        })();

        function getCoupleLinkState() {
            const linkedMap = readCoupleLinkedRoleMap();
            const linkedIds = Object.keys(linkedMap);
            let hasLegacy = false;
            let roleId = '';
            try {
                hasLegacy = localStorage.getItem(COUPLE_HAS_LINKED_KEY) === 'true';
                roleId = String(localStorage.getItem(COUPLE_ACTIVE_ROLE_KEY) || '').trim();
            } catch (e) { }
            if (!roleId && linkedIds.length) {
                roleId = linkedIds[0];
                try {
                    localStorage.setItem(COUPLE_HAS_LINKED_KEY, 'true');
                    localStorage.setItem(COUPLE_ACTIVE_ROLE_KEY, roleId);
                } catch (e2) { }
            }
            if (!roleId) return { hasCoupleLinked: false, roleId: '' };
            if (!hasLegacy && !linkedMap[roleId]) return { hasCoupleLinked: false, roleId: '' };
            return { hasCoupleLinked: true, roleId: roleId };
        }

        function readCoupleLinkedRoleMap() {
            const map = {};
            try {
                const raw = localStorage.getItem(COUPLE_LINKED_ROLES_KEY) || '';
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        parsed.forEach((id) => {
                            const rid = String(id || '').trim();
                            if (rid) map[rid] = { linkedAt: 0 };
                        });
                    } else if (parsed && typeof parsed === 'object') {
                        Object.keys(parsed).forEach((id) => {
                            const rid = String(id || '').trim();
                            if (!rid) return;
                            const val = parsed[id];
                            if (val === false || val == null) return;
                            map[rid] = (val && typeof val === 'object')
                                ? Object.assign({}, val)
                                : { linkedAt: 0 };
                        });
                    }
                }
            } catch (e) { }
            try {
                const legacyRoleId = String(localStorage.getItem(COUPLE_ACTIVE_ROLE_KEY) || '').trim();
                const hasLegacy = localStorage.getItem(COUPLE_HAS_LINKED_KEY) === 'true';
                if (hasLegacy && legacyRoleId && !map[legacyRoleId]) {
                    map[legacyRoleId] = { linkedAt: 0, legacy: true };
                }
            } catch (e2) { }
            return map;
        }

        function writeCoupleLinkedRoleMap(map) {
            try {
                localStorage.setItem(COUPLE_LINKED_ROLES_KEY, JSON.stringify(map && typeof map === 'object' ? map : {}));
            } catch (e) { }
        }

        function markCoupleRoleLinked(roleId) {
            const rid = String(roleId || '').trim();
            if (!rid) return;
            const map = readCoupleLinkedRoleMap();
            const prev = map[rid] && typeof map[rid] === 'object' ? map[rid] : {};
            map[rid] = Object.assign({}, prev, {
                roleId: rid,
                linkedAt: prev.linkedAt || Date.now()
            });
            writeCoupleLinkedRoleMap(map);
            try {
                localStorage.setItem(COUPLE_HAS_LINKED_KEY, 'true');
                localStorage.setItem(COUPLE_ACTIVE_ROLE_KEY, rid);
            } catch (e) { }
        }

        function unmarkCoupleRoleLinked(roleId) {
            const rid = String(roleId || '').trim();
            const map = readCoupleLinkedRoleMap();
            if (rid && map[rid]) delete map[rid];
            writeCoupleLinkedRoleMap(map);
            const nextId = Object.keys(map)[0] || '';
            try {
                if (nextId) {
                    localStorage.setItem(COUPLE_HAS_LINKED_KEY, 'true');
                    localStorage.setItem(COUPLE_ACTIVE_ROLE_KEY, nextId);
                } else {
                    localStorage.removeItem(COUPLE_HAS_LINKED_KEY);
                    localStorage.removeItem(COUPLE_ACTIVE_ROLE_KEY);
                }
                localStorage.removeItem(COUPLE_PENDING_INVITE_KEY);
            } catch (e) { }
        }

        function escapeHtml(text) {
            return String(text == null ? '' : text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        let coupleWechatRuntimeReadyPromise = null;

        function ensureCoupleWechatRuntimeReady() {
            if (coupleWechatRuntimeReadyPromise) return coupleWechatRuntimeReadyPromise;
            try {
                const pw = getParentWindow();
                const target = pw || window;
                if (!target || typeof target.initData !== 'function') {
                    coupleWechatRuntimeReadyPromise = Promise.resolve();
                } else {
                    const ret = target.initData();
                    coupleWechatRuntimeReadyPromise = (ret && typeof ret.then === 'function') ? ret : Promise.resolve(ret);
                }
            } catch (e) {
                coupleWechatRuntimeReadyPromise = Promise.reject(e);
            }
            return coupleWechatRuntimeReadyPromise.catch((e) => {
                coupleWechatRuntimeReadyPromise = null;
                throw e;
            });
        }

        function readCoupleSelectableRoles() {
            const pw = getParentWindow();
            let profiles = {};
            let chatData = {};
            try {
                profiles = pw && pw.charProfiles && typeof pw.charProfiles === 'object' ? pw.charProfiles : {};
                chatData = pw && pw.chatData && typeof pw.chatData === 'object' ? pw.chatData : {};
            } catch (e) { }
            try {
                if (!Object.keys(profiles || {}).length) {
                    const rawProfiles = localStorage.getItem('wechat_charProfiles') || '';
                    profiles = rawProfiles ? JSON.parse(rawProfiles) : {};
                }
            } catch (e2) {
                profiles = {};
            }
            try {
                if (!Object.keys(chatData || {}).length) {
                    const rawChat = localStorage.getItem('wechat_chatData') || '';
                    chatData = rawChat ? JSON.parse(rawChat) : {};
                }
            } catch (e3) {
                chatData = {};
            }
            const ids = Object.keys(profiles || {});
            const roles = ids.map((id) => {
                const p = profiles[id] && typeof profiles[id] === 'object' ? profiles[id] : {};
                const history = Array.isArray(chatData[id]) ? chatData[id] : [];
                const last = history.length ? history[history.length - 1] : null;
                const ts = last && Number.isFinite(Number(last.timestamp)) ? Number(last.timestamp) : 0;
                const desc = String(p.desc || p.description || p.personality || p.style || '还没有留下介绍。').trim();
                return {
                    id: String(id),
                    name: String(p.remark || p.nickName || p.name || id),
                    avatar: String(p.avatar || '../assets/chushitouxiang.jpg'),
                    desc: desc,
                    lastTs: ts
                };
            });
            roles.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
            return roles;
        }

        function hideCoupleRoleSelectOverlay(overlay) {
            if (!overlay) return;
            overlay.classList.add('is-hidden');
            const root = document.querySelector('.couple-app-root');
            if (root) root.style.display = '';
            window.setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }

        window.openCoupleSubpage = function(url) {
            let container = document.getElementById('couple-subpage-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'couple-subpage-container';
                container.style.position = 'fixed';
                container.style.top = '0';
                container.style.left = '0';
                container.style.width = '100vw';
                container.style.height = '100vh';
                container.style.zIndex = '99999';
                container.style.transform = 'translateX(100%)';
                container.style.transition = 'transform 0.3s ease-in-out';
                container.style.backgroundColor = '#fff';
                document.body.appendChild(container);
            }
            container.innerHTML = `<iframe src="${url}" style="width:100%; height:100%; border:none; display:block;"></iframe>`;
            
            // trigger animation
            setTimeout(() => {
                container.style.transform = 'translateX(0)';
            }, 10);
        };

        window.closeCoupleSubpage = function() {
            const container = document.getElementById('couple-subpage-container');
            if (container) {
                container.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    container.innerHTML = '';
                }, 300);
            }
        };

        function enterLinkedCoupleRole(roleId, overlay) {
            const rid = String(roleId || '').trim();
            if (!rid) return;
            const current = getCoupleLinkState();
            markCoupleRoleLinked(rid);
            if (current.hasCoupleLinked && String(current.roleId || '') === rid) {
                hideCoupleRoleSelectOverlay(overlay);
                return;
            }
            try {
                sessionStorage.setItem(COUPLE_ROLE_SELECT_AUTO_ENTER_KEY, rid);
            } catch (e) { }
            window.location.reload();
        }

        function sendCoupleInviteToRole(roleId) {
            const rid = String(roleId || '').trim();
            if (!rid) return false;
            const inviteId = 'couple_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
            const pw = getParentWindow();
            if (pw && typeof pw.startCoupleInviteFlow === 'function') {
                try {
                    pw.startCoupleInviteFlow(rid, inviteId);
                    return true;
                } catch (e) { }
            }
            try {
                localStorage.setItem(COUPLE_PENDING_INVITE_KEY, JSON.stringify({ roleId: rid, inviteId: inviteId }));
                return true;
            } catch (e2) {
                return false;
            }
        }

        async function initCoupleRoleSelectOverlay(options) {
            const opts = options && typeof options === 'object' ? options : {};
            const overlay = document.getElementById('roleSelectOverlay');
            const gridEl = document.getElementById('krRoleGrid') || document.getElementById('rsRoleGrid');
            const confirmBtn = document.getElementById('krConfirmBtn') || document.getElementById('rsConfirmBtn');
            const selectedCountEl = document.getElementById('krSelectedCount') || document.getElementById('rsSelectedCount');
            const backBtn = document.getElementById('krBackBtn');
            if (!overlay || !gridEl || !confirmBtn) return;
            if (backBtn && backBtn.dataset.bound !== '1') {
                backBtn.dataset.bound = '1';
                backBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    goBack();
                });
            }

            const link = getCoupleLinkState();
            if (opts.suppressIfLinked && link.hasCoupleLinked && link.roleId) {
                coupleRoleSelectSuppressUntil = Date.now() + 1200;
                hideCoupleRoleSelectOverlay(overlay);
                return;
            }
            try {
                const autoEnterRoleId = String(sessionStorage.getItem(COUPLE_ROLE_SELECT_AUTO_ENTER_KEY) || '').trim();
                if (autoEnterRoleId && link.hasCoupleLinked && String(link.roleId || '') === autoEnterRoleId) {
                    sessionStorage.removeItem(COUPLE_ROLE_SELECT_AUTO_ENTER_KEY);
                    coupleRoleSelectSuppressUntil = Date.now() + 1200;
                    hideCoupleRoleSelectOverlay(overlay);
                    return;
                }
            } catch (e) { }
            if (Date.now() < coupleRoleSelectSuppressUntil) return;
            overlay.style.display = 'flex';
            overlay.classList.remove('is-hidden');
            gridEl.innerHTML = `
                <div class="kr-empty">
                    <div class="kr-empty-title">正在读取联系人</div>
                    <div class="kr-empty-text">稍等一下，正在恢复聊天数据。</div>
                </div>
            `;
            confirmBtn.disabled = true;
            try {
                await ensureCoupleWechatRuntimeReady();
            } catch (e3) {
                console.error('情侣空间恢复微信数据失败', e3);
            }

            const selectedRoles = new Set();
            const linkedMap = readCoupleLinkedRoleMap();
            let roles = readCoupleSelectableRoles();
            if (link.hasCoupleLinked && link.roleId && !roles.some((r) => String(r.id) === String(link.roleId))) {
                const info = readAvatarsAndNamesFromChat(link.roleId);
                roles = [{
                    id: link.roleId,
                    name: info && info.roleName ? info.roleName : link.roleId,
                    avatar: info && info.roleAvatar ? info.roleAvatar : '../assets/chushitouxiang.jpg',
                    desc: '已建立情侣空间',
                    lastTs: Date.now()
                }].concat(roles);
            }

            function isLinkedRole(roleId) {
                const rid = String(roleId || '').trim();
                if (!rid) return false;
                return !!linkedMap[rid] || (link.hasCoupleLinked && String(link.roleId || '') === rid);
            }

            function updateConfirmButton() {
                const count = selectedRoles.size;
                confirmBtn.disabled = count <= 0;
                const countId = selectedCountEl && selectedCountEl.id ? selectedCountEl.id : 'krSelectedCount';
                confirmBtn.innerHTML = count > 0
                    ? `发送邀请 <span id="${countId}">(${count})</span>`
                    : `确认选择 <span id="${countId}" hidden>(0)</span>`;
            }

            function renderRoles() {
                selectedRoles.clear();
                if (!roles.length) {
                    gridEl.innerHTML = `
                        <div class="kr-empty">
                            <div class="kr-empty-title">还没有可邀请的角色</div>
                            <div class="kr-empty-text">先去微信创建角色，再回来开启专属空间。</div>
                        </div>
                    `;
                    confirmBtn.disabled = true;
                    if (selectedCountEl) selectedCountEl.hidden = true;
                    return;
                }
                gridEl.innerHTML = roles.map((role) => {
                    const linked = isLinkedRole(role.id);
                    const active = link.hasCoupleLinked && String(link.roleId || '') === String(role.id || '');
                    const cls = ['kr-item'];
                    if (linked) cls.push('is-active');
                    if (active) cls.push('is-current');
                    const statusIcon = linked ? '♥' : '+';
                    const statusText = active ? '当前空间' : (linked ? '已连接' : '待邀请');
                    return `
                        <button class="${cls.join(' ')}" type="button" data-id="${escapeHtml(role.id)}">
                            <div class="kr-avatar-wrapper">
                                <img src="${escapeHtml(role.avatar)}" alt="${escapeHtml(role.name)}">
                                <div class="kr-status-icon">${statusIcon}</div>
                            </div>
                            <div class="kr-role-info">
                                <span class="kr-name">${escapeHtml(role.name)}</span>
                                <span class="kr-tag">${statusText}</span>
                            </div>
                        </button>
                    `;
                }).join('') + '<div class="kr-spacer"></div>';
                updateConfirmButton();
            }

            gridEl.onclick = (e) => {
                const card = e.target && e.target.closest ? e.target.closest('.kr-item, .rs-card') : null;
                if (!card) return;
                const rid = String(card.getAttribute('data-id') || '').trim();
                if (!rid) return;
                if (isLinkedRole(rid)) {
                    enterLinkedCoupleRole(rid, overlay);
                    return;
                }
                if (selectedRoles.has(rid)) {
                    selectedRoles.delete(rid);
                    card.classList.remove('is-selected');
                    const icon = card.querySelector('.kr-status-icon');
                    const tag = card.querySelector('.kr-tag');
                    if (icon) icon.textContent = '+';
                    if (tag) tag.textContent = '待邀请';
                } else {
                    selectedRoles.add(rid);
                    card.classList.add('is-selected');
                    const icon = card.querySelector('.kr-status-icon');
                    const tag = card.querySelector('.kr-tag');
                    if (icon) icon.textContent = '♥';
                    if (tag) tag.textContent = '已选择';
                }
                updateConfirmButton();
            };

            confirmBtn.onclick = () => {
                const selectedArr = Array.from(selectedRoles);
                if (!selectedArr.length) return;
                selectedArr.forEach((rid) => sendCoupleInviteToRole(rid));
                const firstId = selectedArr[0];
                const pw = getParentWindow();
                if (pw && typeof pw.showCenterToast === 'function') {
                    pw.showCenterToast('情侣空间邀请已发送');
                }
                if (pw && typeof pw.enterChatRoom === 'function') {
                    pw.enterChatRoom(firstId);
                }
                hideCoupleRoleSelectOverlay(overlay);
            };

            renderRoles();
        }

        function readAvatarsAndNamesFromChat(roleId) {
            const id = String(roleId || '').trim();
            if (!id) return null;
            try {
                const pw = window.parent && window.parent !== window ? window.parent : null;
                if (!pw) return null;
                const profiles = pw.charProfiles && typeof pw.charProfiles === 'object' ? pw.charProfiles : {};
                const personas = pw.userPersonas && typeof pw.userPersonas === 'object' ? pw.userPersonas : {};
                const roleProfile = profiles[id] && typeof profiles[id] === 'object' ? profiles[id] : {};
                const userPersona = personas[id] && typeof personas[id] === 'object' ? personas[id] : {};

                const roleName = String(roleProfile.remark || roleProfile.nickName || roleProfile.name || id || 'Ta');
                const roleAvatar = String(roleProfile.avatar || '');
                const userName = String(userPersona.name || localStorage.getItem('user_name') || '我');
                const userAvatar = String(userPersona.avatar || '');

                return { roleName, roleAvatar, userName, userAvatar };
            } catch (e) {
                return null;
            }
        }

        function lockCoupleAvatars() {
            const userAvatarEl = document.getElementById('avatar-user');
            const roleAvatarEl = document.getElementById('avatar-role');
            [userAvatarEl, roleAvatarEl].forEach((el) => {
                if (!el) return;
                el.onclick = null;
                try { el.removeAttribute('onclick'); } catch (e) { }
                el.style.pointerEvents = 'none';
            });
            const userInput = document.getElementById('avatar-user-input');
            const roleInput = document.getElementById('avatar-role-input');
            if (userInput) userInput.disabled = true;
            if (roleInput) roleInput.disabled = true;
        }

        let coupleMenuState = {
            open: false,
            step: 'menu'
        };

        function openCoupleMoreMenu() {
            // 打开新的设置页面
            if (window.qlkjSetting && typeof window.qlkjSetting.open === 'function') {
                window.qlkjSetting.open();
            }
        }

        function closeCoupleMoreMenu() {
            coupleMenuState.open = false;
            const modal = document.getElementById('couple-menu-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
            setTimeout(() => {
                modal.hidden = true;
            }, 180);
        }

        function renderCoupleMenuModal() {
            const modal = document.getElementById('couple-menu-modal');
            const content = document.getElementById('couple-menu-content');
            if (!modal || !content) return;

            modal.hidden = false;
            requestAnimationFrame(() => modal.classList.add('is-open'));

            if (coupleMenuState.step === 'confirmClear') {
                content.innerHTML = `
                    <div class="couple-menu-title">确认解除</div>
                    <div class="couple-menu-desc">解除之后的空间记录将全部清除，是否确认？</div>
                    <div class="couple-menu-actions">
                        <button class="couple-menu-btn" type="button" data-action="close">取消</button>
                        <button class="couple-menu-btn couple-menu-btn-danger" type="button" data-action="confirm-clear">确认解除</button>
                    </div>
                `;
                return;
            }

            if (coupleMenuState.step === 'notify') {
                content.innerHTML = `
                    <div class="couple-menu-title">通知对方</div>
                    <div class="couple-menu-desc">是否通知对方你已解除情侣关系？</div>
                    <div class="couple-menu-actions">
                        <button class="couple-menu-btn" type="button" data-action="unlink-no-notify">不通知</button>
                        <button class="couple-menu-btn couple-menu-btn-danger" type="button" data-action="unlink-notify">通知对方</button>
                    </div>
                `;
                return;
            }

            content.innerHTML = `
                <div class="couple-menu-title">更多</div>
                <div class="couple-menu-actions">
                    <button class="couple-menu-btn couple-menu-btn-danger" type="button" data-action="unlink">解除情侣空间</button>
                </div>
                <div class="couple-menu-actions">
                    <button class="couple-menu-btn" type="button" data-action="close">取消</button>
                </div>
            `;
        }

        async function clearCoupleSpaceStorage(roleId) {
            const rid = String(roleId || '').trim();
            const baseKeys = [
                'couple_space_data',
                'couple_bg',
                'couple_avatar_user',
                'couple_avatar_role',
                'couple_space_qa_progress_v1',
                ANNIVERSARY_STORAGE_KEY,
                MOOD_STORAGE_KEY,
                ROLE_MOOD_STORAGE_KEY,
                SECRET_SPACE_MESSAGES_KEY,
            ];
            const allKeys = baseKeys
                .map((k) => [String(k), buildCoupleSpaceRoleKey(k, rid)])
                .flat()
                .filter((k) => !!String(k || '').trim());
            await Promise.all(allKeys.map((k) => coupleSpaceRemoveItem(k)));
            try {
                const qaKey = 'couple_space_qa_progress_v1';
                const qaScopedKey = qaKey + '__roleId__' + rid;
                const pw = window.parent && window.parent !== window ? window.parent : null;
                const lib =
                    (pw && pw.localforage && typeof pw.localforage.createInstance === 'function')
                        ? pw.localforage
                        : (window.localforage && typeof window.localforage.createInstance === 'function')
                            ? window.localforage
                            : null;
                if (lib) {
                    const qaForage = lib.createInstance({ name: 'shubao_large_store_v1', storeName: 'couple_space_qa' });
                    await Promise.all([
                        qaForage.removeItem(qaKey),
                        qaForage.removeItem(qaScopedKey),
                    ]);
                }
                try { localStorage.removeItem(qaKey); } catch (e0) { }
                try { localStorage.removeItem(qaScopedKey); } catch (e1) { }
            } catch (e3) { }
            try {
                const missKey = buildCoupleSpaceRoleKey(AI_MISS_STORAGE_KEY, rid);
                if (missKey) localStorage.removeItem(missKey);
            } catch (e) { }
            try {
                const lockKey = buildCoupleSpaceRoleKey(COUPLE_SPACE_DIARY_SYNC_LOCK_KEY, rid);
                if (lockKey) localStorage.removeItem(lockKey);
                if (COUPLE_SPACE_DIARY_SYNC_LOCK_KEY) localStorage.removeItem(COUPLE_SPACE_DIARY_SYNC_LOCK_KEY);
            } catch (e2) { }
        }

        function notifyUnlinkToChat(roleId) {
            const id = String(roleId || '').trim();
            if (!id) return;
            const pw = window.parent && window.parent !== window ? window.parent : null;
            if (!pw) return;
            pw.chatData = pw.chatData || {};
            if (!pw.chatData[id]) pw.chatData[id] = [];
            const msg = { role: 'me', type: 'couple_unlink', content: '', timestamp: Date.now(), status: 'sent' };
            pw.chatData[id].push(msg);
            if (typeof pw.saveData === 'function') {
                try { pw.saveData(); } catch (e) { }
            }
        }

        async function unlinkCoupleSpace(notify) {
            const link = getCoupleLinkState();
            await clearCoupleSpaceStorage(link && link.hasCoupleLinked ? link.roleId : '');
            try {
                localStorage.removeItem(COUPLE_PENDING_INVITE_KEY);
            } catch (e) { }
            if (notify && link.hasCoupleLinked && link.roleId) {
                notifyUnlinkToChat(link.roleId);
            }
            if (link.hasCoupleLinked && link.roleId) {
                unmarkCoupleRoleLinked(link.roleId);
            }
        }

        document.addEventListener('DOMContentLoaded', async () => {
            try {
                await ensureCoupleWechatRuntimeReady();
            } catch (e0) {
                console.error('情侣空间初始化微信数据失败', e0);
            }
            await initAnniversary();
            await loadState();
            await loadMoodState();
            await loadRoleMoodState();
            bindEvents();

            // 监听设置页面的解除情侣空间请求
            window.addEventListener('qlkj-unlink-request', async () => {
                coupleMenuState.open = true;
                coupleMenuState.step = 'confirmClear';
                renderCoupleMenuModal();
            });

            const link = getCoupleLinkState();
            const fromChat = link.hasCoupleLinked ? readAvatarsAndNamesFromChat(link.roleId) : null;

            const userName = fromChat && fromChat.userName ? fromChat.userName : (localStorage.getItem('user_name') || '我');
            const roleName = fromChat && fromChat.roleName ? fromChat.roleName : 'Ta';

            document.getElementById('name-user').innerText = userName;
            document.getElementById('name-role').innerText = roleName;

            if (link.hasCoupleLinked && link.roleId) {
                updateStatsUI();
            }

            if (fromChat) {
                const au = document.getElementById('avatar-user');
                const ar = document.getElementById('avatar-role');
                const customUserAvatar = await coupleSpaceGetRoleItem('couple_avatar_user', link.roleId);
                const customRoleAvatar = await coupleSpaceGetRoleItem('couple_avatar_role', link.roleId);
                if (au && fromChat.userAvatar && !customUserAvatar) au.src = fromChat.userAvatar;
                if (ar && fromChat.roleAvatar && !customRoleAvatar) ar.src = fromChat.roleAvatar;
            }

            const initialTab = readInitialActiveTab();
            if (initialTab) state.activeTab = initialTab;
            initCoupleRoleSelectOverlay({
                suppressIfLinked: !!initialTab
            });
            render();
            initSecretSpaceAiActivityWatcher();
            initSecretSpaceBatteryWatcher();
            try {
                const pw = getParentWindow();
                coupleSpaceAppVisible = !pw || String(pw.__foregroundAppId || '') === 'couple-space';
            } catch (e0) { }
            if (coupleSpaceAppVisible) {
                try {
                    await handleCoupleSpaceAppEnter('dom_ready');
                } catch (e) {
                    const pw = getParentWindow();
                    const msg = e && e.message ? String(e.message) : String(e || '生成失败');
                    if (pw && typeof pw.showCenterToast === 'function') {
                        pw.showCenterToast(msg);
                    } else if (pw && pw.GlobalModal && typeof pw.GlobalModal.showError === 'function') {
                        pw.GlobalModal.showError(msg);
                    } else {
                        alert(msg);
                    }
                }
            }
        });

        function safeJsonParse(text, fallback) {
            try {
                return JSON.parse(text);
            } catch (e) {
                return fallback;
            }
        }

        function readLastExitTime(roleId) {
            const rid = String(roleId || '').trim();
            if (!rid) return 0;
            try {
                const raw = localStorage.getItem(COUPLE_SPACE_LAST_EXIT_KEY + rid);
                const n = Number(raw);
                return Number.isFinite(n) && n > 0 ? n : 0;
            } catch (e) {
                return 0;
            }
        }

        function writeLastExitTime(roleId, ts) {
            const rid = String(roleId || '').trim();
            if (!rid) return;
            const n = Number(ts);
            if (!Number.isFinite(n) || n <= 0) return;
            try { localStorage.setItem(COUPLE_SPACE_LAST_EXIT_KEY + rid, String(n)); } catch (e) { }
        }

        function startOfDayTs(ts) {
            const d = new Date(ts);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        }

        function crossedHourSameDay(lastTs, enterTs, hour) {
            const h = Number(hour);
            if (!Number.isFinite(h) || h < 0 || h > 23) return false;
            if (!isSameDay(new Date(lastTs), new Date(enterTs))) return false;
            const dayStart = startOfDayTs(lastTs);
            const gate = dayStart + h * 60 * 60 * 1000;
            return lastTs < gate && enterTs >= gate;
        }

        function diffDaysInclusive(lastTs, enterTs) {
            const a = startOfDayTs(lastTs);
            const b = startOfDayTs(enterTs);
            const dayMs = 24 * 60 * 60 * 1000;
            const diff = Math.floor((b - a) / dayMs);
            if (diff <= 0) return 0;
            return diff + 1;
        }

        function buildDateKeysForCatchUp(enterTs, diffDaysCap) {
            const cap = Math.max(1, Math.min(7, Number(diffDaysCap) || 1));
            const dayMs = 24 * 60 * 60 * 1000;
            const enterStart = startOfDayTs(enterTs);
            const keys = [];
            for (let i = cap - 1; i >= 0; i--) {
                keys.push(toDateKey(new Date(enterStart - i * dayMs)));
            }
            return keys;
        }

        function getParentWindow() {
            return window.parent && window.parent !== window ? window.parent : null;
        }

        function getRoleDisplayName() {
            const el = document.getElementById('name-role');
            const text = el ? String(el.textContent || '').trim() : '';
            return text || 'Ta';
        }

        function readCoupleRoleProfile(roleId) {
            const rid = String(roleId || '').trim();
            if (!rid) return {};
            const pw = getParentWindow();
            try {
                const profiles = pw && pw.charProfiles && typeof pw.charProfiles === 'object' ? pw.charProfiles : null;
                if (profiles && profiles[rid] && typeof profiles[rid] === 'object') {
                    return profiles[rid];
                }
            } catch (e) { }
            try {
                const raw = localStorage.getItem('wechat_charProfiles') || '{}';
                const parsed = safeJsonParse(raw, {});
                return parsed && parsed[rid] && typeof parsed[rid] === 'object' ? parsed[rid] : {};
            } catch (e2) {
                return {};
            }
        }

        function isLikelyForeignLanguageHint(text) {
            const raw = String(text || '').trim();
            if (!raw) return false;
            const lower = raw.toLowerCase();
            if (/(中文|汉语|漢語|普通话|普通話|国语|國語|mandarin|simplified chinese|简体|簡體|zh[-_ ]?(cn|hans)?)/i.test(lower)) {
                return false;
            }
            return /(英语|英語|英文|日语|日語|韩语|韓語|韩文|韓文|法语|法語|德语|德語|西班牙语|西班牙語|俄语|俄語|阿拉伯语|阿拉伯語|葡萄牙语|葡萄牙語|意大利语|意大利語|粤语|粵語|繁体|繁體|文言|english|japanese|korean|french|german|spanish|russian|arabic|portuguese|italian|thai|vietnamese|traditional chinese|cantonese|classical chinese|zh[-_ ]?(tw|hk|hant)|ja[-_ ]?jp|ko[-_ ]?kr|en[-_ ]?(us|gb))/i.test(lower);
        }

        function isLikelyForeignLocaleHint(text) {
            const raw = String(text || '').trim();
            if (!raw) return false;
            const lower = raw.toLowerCase();
            return /(日本|日本人|韩国|韓國|韩国人|韓國人|美国|美國|美国人|美國人|英国|英國|法国|法國|德国|德國|西班牙|意大利|義大利|俄罗斯|俄羅斯|阿拉伯|葡萄牙|荷兰|荷蘭|泰国|泰國|越南|japan|japanese|korea|korean|america|american|britain|british|france|french|germany|german|spain|spanish|italy|italian|russia|russian|arab|arabic|portugal|portuguese|netherlands|dutch|thailand|thai|vietnam|vietnamese)/i.test(lower);
        }

        function isLikelyNonSimplifiedChineseHint(text) {
            const raw = String(text || '').trim();
            if (!raw) return false;
            if (/(繁體|繁体|正體|正体|traditional chinese|cantonese|粤语|粵語|文言|classical chinese|zh[-_ ]?(tw|hk|hant))/i.test(raw)) {
                return true;
            }
            const hits = (raw.match(/[這個們為來時後會說話讓還愛歡學習覺應實體點開關於與臺灣廣東電腦網頁貓車鐘鍾門裡見聽買麼嗎係嘅咗喺冇唔佢哋啲咩]/g) || []).length;
            return hits >= 2;
        }

        function isCoupleSpaceBilingualRole(roleId) {
            const profile = readCoupleRoleProfile(roleId);
            const explicit = [
                { value: profile.language, kind: 'language' },
                { value: profile.lang, kind: 'language' },
                { value: profile.nativeLanguage, kind: 'language' },
                { value: profile.native_language, kind: 'language' },
                { value: profile.spokenLanguage, kind: 'language' },
                { value: profile.spoken_language, kind: 'language' },
                { value: profile.locale, kind: 'locale' },
                { value: profile.nationality, kind: 'locale' }
            ];
            for (let i = 0; i < explicit.length; i++) {
                const item = explicit[i] || {};
                const value = String(item.value || '').trim();
                if (!value) continue;
                if (item.kind === 'locale') {
                    if (isLikelyForeignLocaleHint(value) || isLikelyForeignLanguageHint(value)) return true;
                } else if (isLikelyForeignLanguageHint(value) || isLikelyNonSimplifiedChineseHint(value)) {
                    return true;
                }
            }
            const sampleText = [
                profile.realName,
                profile.real_name,
                profile.nickName,
                profile.name,
                profile.character_name,
                profile.characterName,
                profile.title,
                profile.desc,
                profile.description,
                profile.persona,
                profile.prompt,
                profile.system_prompt,
                profile.systemPrompt,
                profile.scenario,
                profile.first_mes,
                profile.mes_example,
                profile.creator_notes,
                profile.post_history_instructions,
                Array.isArray(profile.tags) ? profile.tags.join(' ') : String(profile.tags || '')
            ];
            for (let i = 0; i < sampleText.length; i++) {
                if (isLikelyForeignLanguageHint(sampleText[i]) || isLikelyNonSimplifiedChineseHint(sampleText[i])) {
                    return true;
                }
            }
            return false;
        }

        function resolveCoupleSpaceTranslatedPayload(rawValue) {
            if (rawValue == null) return null;
            if (typeof window.normalizeStructuredTranslatedCandidate === 'function') {
                try {
                    const structured = window.normalizeStructuredTranslatedCandidate(rawValue);
                    if (structured && structured.mode === 'translated_text') {
                        return {
                            foreign: String(structured.foreign || '').trim(),
                            translation: String(structured.translation || '').trim()
                        };
                    }
                } catch (e0) { }
            }
            if (typeof window.parseTranslatedTextPayload === 'function' && rawValue && typeof rawValue === 'object') {
                try {
                    const parsedObj = window.parseTranslatedTextPayload(rawValue);
                    if (parsedObj && parsedObj.hasTranslation) {
                        return {
                            foreign: String(parsedObj.foreignText || parsedObj.bodyText || '').trim(),
                            translation: String(parsedObj.translationText || parsedObj.foreignText || '').trim()
                        };
                    }
                } catch (e1) { }
            }
            if (typeof window.parseTranslatedBubbleText === 'function') {
                try {
                    const parsedText = window.parseTranslatedBubbleText(String(rawValue == null ? '' : rawValue));
                    if (parsedText && parsedText.hasTranslation) {
                        return {
                            foreign: String(parsedText.foreignText || parsedText.bodyText || '').trim(),
                            translation: String(parsedText.translationText || parsedText.foreignText || '').trim()
                        };
                    }
                } catch (e2) { }
            }
            return null;
        }

        function extractCoupleSpaceBilingualPairs(rawText) {
            const direct = resolveCoupleSpaceTranslatedPayload(rawText);
            if (direct && direct.foreign && direct.translation) {
                return [direct];
            }
            const raw = String(rawText == null ? '' : rawText).trim();
            if (!raw) return [];

            const blocks = raw
                .split(/\n{2,}/)
                .map((item) => String(item || '').trim())
                .filter(Boolean);
            const units = blocks.length >= 2
                ? blocks
                : raw.split(/\r?\n+/).map((item) => String(item || '').trim()).filter(Boolean);
            if (units.length < 2) return [];

            const pairs = [];
            for (let i = 0; i < units.length; i++) {
                const current = units[i];
                const single = resolveCoupleSpaceTranslatedPayload(current);
                if (single && single.foreign && single.translation) {
                    pairs.push(single);
                    continue;
                }
                if (i + 1 >= units.length) continue;
                const pair = resolveCoupleSpaceTranslatedPayload(current + '\n' + units[i + 1]);
                if (pair && pair.foreign && pair.translation) {
                    pairs.push(pair);
                    i++;
                }
            }
            return pairs;
        }

        function normalizeCoupleSpaceDiaryContent(roleId, rawText) {
            const text = String(rawText == null ? '' : rawText).trim();
            if (!text || !isCoupleSpaceBilingualRole(roleId)) return text;
            const pairs = extractCoupleSpaceBilingualPairs(text);
            if (!pairs.length) return text;
            return pairs.map((pair) => {
                return `${String(pair.foreign || '').trim()}\n\n${String(pair.translation || '').trim()}`;
            }).join('\n\n');
        }

        function renderCoupleSpaceDiaryContentHtml(roleId, rawText) {
            const text = String(rawText == null ? '' : rawText).trim();
            if (!text) return '';
            const pairs = isCoupleSpaceBilingualRole(roleId) ? extractCoupleSpaceBilingualPairs(text) : [];
            if (!pairs.length) return escapeHtml(text);
            return pairs.map((pair) => {
                const foreign = escapeHtml(String(pair.foreign || '').trim());
                const translation = escapeHtml(String(pair.translation || '').trim());
                return (
                    '<div class="note-translation-pair">' +
                    `<div class="note-translation-foreign">${foreign}</div>` +
                    `<div class="note-translation-translation">${translation}</div>` +
                    '</div>'
                );
            }).join('');
        }

        function buildCoupleSpaceDiaryLanguageRule(roleId) {
            if (!isCoupleSpaceBilingualRole(roleId)) return '';
            return [
                '当前角色是外语或非简体中文角色。',
                '你写出的日记 content 必须保持“双语段落配对”格式。',
                '严格使用“上一段写角色真正会说的原文，下一段单独写对应的简体中文翻译”的顺序。',
                '原文段和翻译段必须分成两个独立段落，绝对不要放在同一行、同一段、同一对括号里。',
                '即使整篇日记很短，也至少要保留 1 组“原文段 + 中文翻译段”。',
                'mood 字段仍然只允许输出中文心情词。'
            ].join('\n');
        }

        function isCoupleSpaceAppNowVisible() {
            if (coupleSpaceAppVisible) return true;
            try {
                const pw = getParentWindow();
                return !!(pw && String(pw.__foregroundAppId || '') === 'couple-space');
            } catch (e) {
                return false;
            }
        }

        function buildRoleDiaryGeneratingToastText() {
            const roleName = getRoleDisplayName();
            return (
                roleName +
                ' 正在写今日的心情日记，被你抓到了！ 再等一会儿就可以看到他的日记了（支持后台等待但请不要退出小手机~）'
            );
        }

        function getCoupleSpaceSettingsSnapshot() {
            try {
                if (window.CoupleSpaceSettings && typeof window.CoupleSpaceSettings.loadSettings === 'function') {
                    return window.CoupleSpaceSettings.loadSettings() || {};
                }
            } catch (e) { }
            try {
                const raw = localStorage.getItem('qlkj_settings_v1') || '';
                return raw ? safeJsonParse(raw, {}) : {};
            } catch (e2) {
                return {};
            }
        }

        function getSecretUsageMonitorSettings() {
            const s = getCoupleSpaceSettingsSnapshot();
            return {
                enabled: s[SECRET_USAGE_SETTING_KEYS.master] === true,
                wallet: s[SECRET_USAGE_SETTING_KEYS.wallet] === true,
                music: s[SECRET_USAGE_SETTING_KEYS.music] === true,
                period: s[SECRET_USAGE_SETTING_KEYS.period] === true,
                battery: s[SECRET_USAGE_SETTING_KEYS.battery] === true
            };
        }

        function saveSecretUsageMonitorSettings(patch) {
            const p = patch && typeof patch === 'object' ? patch : {};
            const prev = getCoupleSpaceSettingsSnapshot();
            const next = Object.assign({}, prev);
            if (Object.prototype.hasOwnProperty.call(p, 'enabled')) next[SECRET_USAGE_SETTING_KEYS.master] = p.enabled === true;
            if (Object.prototype.hasOwnProperty.call(p, 'wallet')) next[SECRET_USAGE_SETTING_KEYS.wallet] = p.wallet === true;
            if (Object.prototype.hasOwnProperty.call(p, 'music')) next[SECRET_USAGE_SETTING_KEYS.music] = p.music === true;
            if (Object.prototype.hasOwnProperty.call(p, 'period')) next[SECRET_USAGE_SETTING_KEYS.period] = p.period === true;
            if (Object.prototype.hasOwnProperty.call(p, 'battery')) next[SECRET_USAGE_SETTING_KEYS.battery] = p.battery === true;
            try {
                localStorage.setItem('qlkj_settings_v1', JSON.stringify(next));
            } catch (e) { }
            try {
                Object.keys(p).forEach((key) => {
                    const storageKey = SECRET_USAGE_SETTING_KEYS[key] || key;
                    window.dispatchEvent(new CustomEvent('qlkj-setting-changed', {
                        detail: { key: storageKey, value: next[storageKey] }
                    }));
                });
            } catch (e2) { }
            return getSecretUsageMonitorSettings();
        }

        function isSecretUsageTriggerEnabled(trigger) {
            const t = String(trigger || '').trim();
            const s = getSecretUsageMonitorSettings();
            if (!s.enabled) return false;
            if (t === 'wallet') return s.wallet;
            if (t === 'music') return s.music;
            if (t === 'period') return s.period;
            if (t === 'battery') return s.battery;
            return false;
        }

        function normalizeUserBatteryLevel(value) {
            if (value === null || value === undefined || value === '') return null;
            const n = Number(value);
            if (!Number.isFinite(n)) return null;
            return Math.max(0, Math.min(100, n));
        }

        function readCurrentUserBatteryLevel() {
            const pw = getParentWindow();
            const candidates = [
                pw && pw.currentBatteryLevel,
                window.currentBatteryLevel
            ];
            for (let i = 0; i < candidates.length; i++) {
                const level = normalizeUserBatteryLevel(candidates[i]);
                if (level !== null) return level;
            }
            return null;
        }

        function readLowBatteryAlertState(roleId) {
            const rid = String(roleId || '').trim();
            if (!rid) return {};
            try {
                return safeJsonParse(localStorage.getItem(COUPLE_SPACE_LOW_BATTERY_ALERT_STATE_PREFIX + rid) || '{}', {}) || {};
            } catch (e) {
                return {};
            }
        }

        function writeLowBatteryAlertState(roleId, state) {
            const rid = String(roleId || '').trim();
            if (!rid) return;
            try {
                localStorage.setItem(
                    COUPLE_SPACE_LOW_BATTERY_ALERT_STATE_PREFIX + rid,
                    JSON.stringify(state && typeof state === 'object' ? state : {})
                );
            } catch (e) { }
        }

        function refreshLowBatteryAlertState(roleId, level) {
            const normalized = normalizeUserBatteryLevel(level);
            if (normalized === null || normalized < 30) return;
            const state = readLowBatteryAlertState(roleId);
            if (state && state.active === true) {
                state.active = false;
                state.recoveredAt = Date.now();
                state.recoveredLevel = Math.round(normalized);
                writeLowBatteryAlertState(roleId, state);
            }
        }

        function claimLowBatteryAlert(roleId, level, source) {
            if (!isSecretUsageTriggerEnabled('battery')) return false;
            const normalized = normalizeUserBatteryLevel(level);
            if (normalized === null || normalized >= 30) {
                refreshLowBatteryAlertState(roleId, normalized);
                return false;
            }
            const state = readLowBatteryAlertState(roleId);
            if (state && state.active === true) return false;
            writeLowBatteryAlertState(roleId, {
                active: true,
                lastAlertAt: Date.now(),
                lastLevel: Math.floor(normalized),
                source: String(source || '').trim() || 'unknown'
            });
            return true;
        }

        function isAutoRoleMoodDiaryEnabled() {
            const settings = getCoupleSpaceSettingsSnapshot();
            return settings.autoRoleMoodDiaryEnabled !== false;
        }

        function isRoleCommentOnUserDiaryEnabled() {
            const settings = getCoupleSpaceSettingsSnapshot();
            return settings.roleCommentOnUserDiaryEnabled !== false;
        }

        function getXiuluoDominationSettings() {
            const s = getCoupleSpaceSettingsSnapshot();
            const minutesRaw = Math.floor(Number(s.xiuluoScreenFloodMinutes));
            const minutes = Number.isFinite(minutesRaw) ? Math.max(1, Math.min(15, minutesRaw)) : 5;
            return {
                enabled: s.xiuluoEnabled === true,
                screenFloodEnabled: s.xiuluoScreenFloodEnabled === true,
                minutes: minutes,
                limitMs: minutes * 60 * 1000
            };
        }

        function isParentWechatChatVisible(pw) {
            try {
                return !!(pw && pw.document && pw.document.body && pw.document.body.classList.contains('chat-view-active'));
            } catch (e) {
                return false;
            }
        }

        function getParentCurrentChatRoleId(pw) {
            try {
                return String(pw && pw.currentChatRole ? pw.currentChatRole : '').trim();
            } catch (e) {
                return '';
            }
        }

        function getRoleNameFromParent(roleId) {
            const rid = String(roleId || '').trim();
            if (!rid) return '';
            try {
                const pw = getParentWindow();
                const profiles = pw && pw.charProfiles && typeof pw.charProfiles === 'object' ? pw.charProfiles : {};
                const profile = profiles[rid] && typeof profiles[rid] === 'object' ? profiles[rid] : {};
                return String(profile.remark || profile.nickName || profile.name || rid).trim();
            } catch (e) {
                return rid;
            }
        }

        function ensureJealousyOverlayDocument(doc) {
            const d = doc || document;
            let overlay = d.getElementById('jealousyOverlay');
            if (!overlay) {
                overlay = d.createElement('div');
                overlay.id = 'jealousyOverlay';
                overlay.className = 'jealousy-overlay';
                d.body.appendChild(overlay);
            }
            if (!d.getElementById('jealousyCardTemplate')) {
                const tpl = d.createElement('template');
                tpl.id = 'jealousyCardTemplate';
                tpl.innerHTML =
                    '<div class="korean-window">' +
                    '  <div class="kw-header">' +
                    '    <span class="kw-dot red"></span>' +
                    '    <span class="kw-dot yellow"></span>' +
                    '    <span class="kw-dot green"></span>' +
                    '    <span class="kw-title">SYSTEM ALERT</span>' +
                    '  </div>' +
                    '  <div class="kw-body">' +
                    '    <p class="kw-msg"></p>' +
                    '    <div class="kw-footer">' +
                    '      <button class="kw-btn primary" type="button">回到我身边</button>' +
                    '      <button class="kw-btn secondary" type="button">晚点再说</button>' +
                    '    </div>' +
                    '  </div>' +
                    '</div>';
                d.body.appendChild(tpl);
            }
            if (!d.getElementById('jealousyPopupStyles')) {
                const style = d.createElement('style');
                style.id = 'jealousyPopupStyles';
                style.textContent =
                    '.jealousy-overlay{position:fixed;inset:0;z-index:100000;pointer-events:none;overflow:hidden;}' +
                    '.korean-window{position:absolute;width:min(260px,calc(100vw - 24px));background:rgba(245,245,245,.9);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);border-radius:8px;box-shadow:0 15px 35px rgba(0,0,0,.1),0 5px 10px rgba(0,0,0,.05);border:1px solid rgba(255,255,255,.6);pointer-events:auto;animation:windowAppear .4s cubic-bezier(.175,.885,.32,1.275) forwards;user-select:none;}' +
                    '@keyframes windowAppear{from{opacity:0;transform:scale(.8) translateY(20px);}to{opacity:1;transform:scale(1) translateY(0);}}' +
                    '.kw-header{display:flex;align-items:center;padding:12px 15px;border-bottom:1px solid rgba(0,0,0,.03);}.kw-dot{width:8px;height:8px;border-radius:50%;margin-right:6px;}.kw-dot.red{background:#e8a5a5;}.kw-dot.yellow{background:#ebd4a0;}.kw-dot.green{background:#a8ccba;}.kw-title{font-size:10px;font-weight:700;color:#aaa;letter-spacing:1px;margin-left:auto;text-transform:uppercase;}' +
                    '.kw-body{padding:20px;text-align:center;}.kw-msg{font-size:14px;color:#555;line-height:1.6;margin-bottom:20px;font-weight:500;}.kw-msg-translated{display:flex;flex-direction:column;gap:6px;}.kw-msg-foreign{font-size:14px;color:#4b5563;font-weight:700;white-space:pre-wrap;word-break:break-word;}.kw-msg-translation{font-size:12px;color:#8b8b95;line-height:1.6;white-space:pre-wrap;word-break:break-word;}.kw-footer{display:flex;gap:10px;justify-content:center;}.kw-btn{padding:8px 16px;border-radius:8px;font-size:12px;border:none;transition:all .2s;font-weight:600;cursor:pointer;}.kw-btn.primary{background:#555;color:#fff;}.kw-btn.secondary{background:rgba(0,0,0,.05);color:#888;}.kw-btn:active{transform:scale(.95);opacity:.8;}';
                d.head.appendChild(style);
            }
            return overlay;
        }

        function sanitizeJealousyLine(text) {
            let s = normalizeAiReplyText(text);
            s = s.replace(/^[\-\d\.\)\s]+/, '').trim();
            s = s.replace(/^["“”'‘’]+|["“”'‘’]+$/g, '').trim();
            if (s.length > 42) s = s.slice(0, 42).trim();
            return s;
        }

        function normalizeJealousyLinePayload(rawValue) {
            if (rawValue == null) return null;
            const translated = resolveCoupleSpaceTranslatedPayload(rawValue);
            if (translated && translated.foreign && translated.translation) {
                return {
                    foreign: sanitizeJealousyLine(translated.foreign),
                    translation: sanitizeJealousyLine(translated.translation)
                };
            }
            const text = sanitizeJealousyLine(typeof rawValue === 'string' ? rawValue : (rawValue && rawValue.text ? rawValue.text : ''));
            return text ? { text } : null;
        }

        function getJealousyLineDisplayText(item) {
            const entry = item && typeof item === 'object' ? item : null;
            if (!entry) return '';
            if (entry.translation || entry.foreign) {
                return String(entry.translation || entry.foreign || '').trim();
            }
            return String(entry.text || '').trim();
        }

        function parseJealousyLines(rawText) {
            const arr = extractJsonArray(rawText);
            let list = Array.isArray(arr) ? arr : [];
            if (!list.length) {
                list = String(rawText || '').split(/\r?\n+/).map((line) => line.trim()).filter(Boolean);
            }
            list = list.map(normalizeJealousyLinePayload).filter(Boolean).slice(0, 3);
            const fallback = [
                { text: '还要和他聊多久？' },
                { text: '你答应过我的专属时间呢。' },
                { text: '现在回头看看我，好不好？' }
            ];
            while (list.length < 3) {
                list.push(fallback[list.length]);
            }
            return list.slice(0, 3);
        }

        async function generateJealousyDominationLines(otherRoleId, stayedMs) {
            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) {
                return parseJealousyLines('');
            }
            const roleId = String(link.roleId || '').trim();
            const otherName = getRoleNameFromParent(otherRoleId) || '别人';
            const roleName = getRoleDisplayName();
            const minutes = Math.max(1, Math.round(Number(stayedMs || 0) / 60000));
            const extraSystemPrompt = [
                '当前场景：情侣空间修罗场霸屏查岗。',
                `用户在和「${otherName}」的聊天窗口连续停留了约 ${minutes} 分钟。`,
                `你是情侣空间里的正宫角色「${roleName}」，你知道用户正在和别人聊天太久。`,
                '请根据你的人设、关系亲密度和说话风格，生成 3 句会显示在屏幕小弹窗里的短句。',
                '语气可以吃醋、委屈、占有欲、冷静警告或撒娇，但不要威胁现实安全，不要血腥暴力，不要要求用户伤害自己或他人。',
                isCoupleSpaceBilingualRole(roleId)
                    ? '如果你是外语或非简体中文角色，每条都必须输出成 {"foreign":"角色原话","translation":"对应的简体中文翻译"}，原文要短，中文翻译也要短。'
                    : '每句 8~24 个中文字符左右，要像角色本人临时打断用户时说的话。'
            ].join('\n');
            const userPrompt = [
                isCoupleSpaceBilingualRole(roleId)
                    ? '请只输出严格 JSON 数组，数组里必须正好 3 项；每项都必须是 {"foreign":"...","translation":"..."}。'
                    : '请只输出严格 JSON 数组，数组里必须正好 3 个字符串。',
                '不要输出 Markdown、解释、编号或额外字段。',
                `聊天对象：${otherName}`,
                `停留时长：约 ${minutes} 分钟`
            ].join('\n');
            try {
                const raw = await callRoleDiaryLLM(roleId, [], userPrompt, extraSystemPrompt, {
                    outputInstructions: isCoupleSpaceBilingualRole(roleId)
                        ? '只输出严格 JSON 数组，正好 3 项；每项都是 {"foreign":"...","translation":"..."}。'
                        : '只输出严格 JSON 数组，正好 3 个字符串，不要解释，不要代码块。',
                    useLitePrompt: true
                });
                return parseJealousyLines(raw);
            } catch (e) {
                return parseJealousyLines('');
            }
        }

        function clearJealousyFlood(options) {
            const opts = options && typeof options === 'object' ? options : {};
            const pw = getParentWindow();
            const doc = (pw && pw.document) ? pw.document : document;
            const overlay = doc.getElementById('jealousyOverlay');
            if (jealousyDominationState.popupTimer) {
                clearInterval(jealousyDominationState.popupTimer);
                jealousyDominationState.popupTimer = null;
            }
            if (overlay) {
                overlay.innerHTML = '';
                overlay.style.pointerEvents = 'none';
            }
            jealousyDominationState.flooding = false;
            jealousyDominationState.inFlight = false;
            if (opts.snoozeMs) {
                jealousyDominationState.snoozeUntil = Date.now() + Number(opts.snoozeMs || 0);
            }
            jealousyDominationState.activeOtherRoleId = '';
            jealousyDominationState.since = 0;
        }

        function createJealousyPopup(doc, overlay, message, index, total) {
            const tpl = doc.getElementById('jealousyCardTemplate');
            const clone = tpl && tpl.content ? tpl.content.cloneNode(true) : null;
            const card = clone ? clone.querySelector('.korean-window') : doc.createElement('div');
            if (!clone) {
                card.className = 'korean-window';
                card.innerHTML =
                    '<div class="kw-header"><span class="kw-dot red"></span><span class="kw-dot yellow"></span><span class="kw-dot green"></span><span class="kw-title">SYSTEM ALERT</span></div>' +
                    '<div class="kw-body"><p class="kw-msg"></p><div class="kw-footer"><button class="kw-btn primary" type="button">回到我身边</button><button class="kw-btn secondary" type="button">晚点再说</button></div></div>';
            }
            const msgEl = card.querySelector('.kw-msg');
            if (msgEl) {
                if (message && typeof message === 'object' && message.translation && message.foreign) {
                    msgEl.classList.add('kw-msg-translated');
                    msgEl.innerHTML =
                        `<div class="kw-msg-foreign">${escapeHtml(message.foreign)}</div>` +
                        `<div class="kw-msg-translation">${escapeHtml(message.translation)}</div>`;
                } else {
                    msgEl.classList.remove('kw-msg-translated');
                    msgEl.textContent = getJealousyLineDisplayText(message);
                }
            }
            const width = Math.max(320, Number(doc.documentElement && doc.documentElement.clientWidth || 0));
            const height = Math.max(480, Number(doc.documentElement && doc.documentElement.clientHeight || 0));
            const cardW = Math.min(260, width - 24);
            const maxX = Math.max(12, width - cardW - 12);
            const topMin = 46;
            const topMax = Math.max(topMin, Math.min(height * 0.58, height - 188));
            const spread = total > 1 ? index / (total - 1) : 0;
            const x = 12 + Math.random() * (maxX - 12);
            const y = topMin + Math.random() * (topMax - topMin) * 0.7 + spread * 22;
            card.style.left = Math.round(x) + 'px';
            card.style.top = Math.round(y) + 'px';
            card.style.zIndex = String(100000 + index);
            const primary = card.querySelector('.kw-btn.primary');
            if (primary) {
                primary.onclick = () => {
                    const link = getCoupleLinkState();
                    clearJealousyFlood({ snoozeMs: getXiuluoDominationSettings().limitMs });
                    const pw = getParentWindow();
                    if (pw && link && link.hasCoupleLinked && link.roleId && typeof pw.enterChatRoom === 'function') {
                        pw.enterChatRoom(link.roleId);
                    }
                };
            }
            const secondary = card.querySelector('.kw-btn.secondary');
            if (secondary) {
                secondary.onclick = () => {
                    clearJealousyFlood({ snoozeMs: getXiuluoDominationSettings().limitMs });
                };
            }
            overlay.appendChild(card);
            try {
                const nav = doc.defaultView && doc.defaultView.navigator ? doc.defaultView.navigator : window.navigator;
                if (nav && typeof nav.vibrate === 'function') nav.vibrate(35);
            } catch (e) { }
        }

        function startJealousyFlood(messages, otherRoleId) {
            const pw = getParentWindow();
            const doc = (pw && pw.document) ? pw.document : document;
            const overlay = ensureJealousyOverlayDocument(doc);
            overlay.innerHTML = '';
            overlay.style.pointerEvents = 'auto';
            jealousyDominationState.flooding = true;
            const lines = Array.isArray(messages) && messages.length ? messages.slice(0, 3) : parseJealousyLines('');
            const total = 9;
            let count = 0;
            if (jealousyDominationState.popupTimer) clearInterval(jealousyDominationState.popupTimer);
            jealousyDominationState.popupTimer = setInterval(() => {
                if (count >= total) {
                    clearInterval(jealousyDominationState.popupTimer);
                    jealousyDominationState.popupTimer = null;
                    return;
                }
                createJealousyPopup(doc, overlay, lines[count % lines.length], count, total);
                count++;
            }, 360);
        }

        function resetJealousyMonitorTimer() {
            jealousyDominationState.activeOtherRoleId = '';
            jealousyDominationState.since = 0;
            jealousyDominationState.inFlight = false;
        }

        function checkJealousyDomination() {
            const settings = getXiuluoDominationSettings();
            if (!settings.enabled || !settings.screenFloodEnabled) {
                resetJealousyMonitorTimer();
                clearJealousyFlood();
                return;
            }
            if (Date.now() < jealousyDominationState.snoozeUntil || jealousyDominationState.inFlight || jealousyDominationState.flooding) {
                return;
            }
            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) {
                resetJealousyMonitorTimer();
                return;
            }
            const pw = getParentWindow();
            if (!pw || !isParentWechatChatVisible(pw)) {
                jealousyDominationState.activeOtherRoleId = '';
                jealousyDominationState.since = 0;
                return;
            }
            const otherRoleId = getParentCurrentChatRoleId(pw);
            if (!otherRoleId || String(otherRoleId) === String(link.roleId)) {
                jealousyDominationState.activeOtherRoleId = '';
                jealousyDominationState.since = 0;
                return;
            }
            if (jealousyDominationState.activeOtherRoleId !== otherRoleId) {
                jealousyDominationState.activeOtherRoleId = otherRoleId;
                jealousyDominationState.since = Date.now();
                return;
            }
            const stayedMs = Date.now() - Number(jealousyDominationState.since || Date.now());
            if (stayedMs < settings.limitMs) return;
            jealousyDominationState.inFlight = true;
            generateJealousyDominationLines(otherRoleId, stayedMs).then((lines) => {
                startJealousyFlood(lines, otherRoleId);
            }).catch(() => {
                startJealousyFlood(parseJealousyLines(''), otherRoleId);
            }).finally(() => {
                jealousyDominationState.inFlight = false;
            });
        }

        function initJealousyDominationWatcher() {
            if (jealousyDominationState.monitorStarted) return;
            jealousyDominationState.monitorStarted = true;
            jealousyDominationState.timer = setInterval(checkJealousyDomination, 1000);
            window.addEventListener('qlkj-setting-changed', function () {
                const settings = getXiuluoDominationSettings();
                if (!settings.enabled || !settings.screenFloodEnabled) {
                    resetJealousyMonitorTimer();
                    clearJealousyFlood();
                }
            });
            window.addEventListener('beforeunload', function () {
                clearJealousyFlood();
                resetJealousyMonitorTimer();
                if (jealousyDominationState.timer) {
                    clearInterval(jealousyDominationState.timer);
                    jealousyDominationState.timer = null;
                }
            });
            checkJealousyDomination();
        }

        function showCoupleSpaceInfo(msg) {
            const pw = getParentWindow();
            const text = String(msg || '').trim();
            if (!text) return;
            if (pw && typeof pw.showCenterToast === 'function') {
                pw.showCenterToast(text);
            } else if (pw && pw.GlobalModal && typeof pw.GlobalModal.showInfo === 'function') {
                pw.GlobalModal.showInfo(text);
            } else {
                alert(text);
            }
        }

        function ensureRoleDiaryConfirmModal() {
            let modal = document.getElementById('role-diary-confirm-modal');
            if (modal) return modal;

            modal = document.createElement('div');
            modal.id = 'role-diary-confirm-modal';
            modal.hidden = true;
            modal.innerHTML =
                '<div class="role-diary-confirm-mask" data-action="cancel-role-diary-confirm"></div>' +
                '<div class="role-diary-confirm-card" role="dialog" aria-modal="true">' +
                '  <div class="role-diary-confirm-title">今日心情日记</div>' +
                '  <div class="role-diary-confirm-text">是否要让角色撰写今日心情日记？</div>' +
                '  <div class="role-diary-confirm-actions">' +
                '    <button type="button" class="role-diary-confirm-btn" data-action="cancel-role-diary-confirm">取消</button>' +
                '    <button type="button" class="role-diary-confirm-btn primary" data-action="confirm-role-diary-confirm">确定</button>' +
                '  </div>' +
                '</div>';
            document.body.appendChild(modal);

            if (!document.getElementById('role-diary-confirm-styles')) {
                const style = document.createElement('style');
                style.id = 'role-diary-confirm-styles';
                style.textContent =
                    '#role-diary-confirm-modal{position:fixed;inset:0;z-index:100010;display:flex;align-items:center;justify-content:center;}' +
                    '#role-diary-confirm-modal[hidden]{display:none;}' +
                    '#role-diary-confirm-modal .role-diary-confirm-mask{position:absolute;inset:0;background:rgba(0,0,0,0.32);}' +
                    '#role-diary-confirm-modal .role-diary-confirm-card{position:relative;width:min(86vw,320px);background:#fff;border-radius:18px;padding:20px 18px 16px;box-shadow:0 18px 40px rgba(0,0,0,0.16);display:flex;flex-direction:column;gap:10px;}' +
                    '#role-diary-confirm-modal .role-diary-confirm-title{font-size:17px;font-weight:700;color:#111;text-align:center;}' +
                    '#role-diary-confirm-modal .role-diary-confirm-text{font-size:14px;line-height:1.6;color:#555;text-align:center;}' +
                    '#role-diary-confirm-modal .role-diary-confirm-actions{display:flex;gap:10px;margin-top:6px;}' +
                    '#role-diary-confirm-modal .role-diary-confirm-btn{flex:1;height:40px;border:none;border-radius:12px;background:#f3f4f6;color:#333;font-size:14px;font-weight:600;}' +
                    '#role-diary-confirm-modal .role-diary-confirm-btn.primary{background:#111;color:#fff;}';
                document.head.appendChild(style);
            }

            modal.addEventListener('click', function (e) {
                const btn = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
                if (!btn) return;
                const action = String(btn.getAttribute('data-action') || '').trim();
                if (action === 'cancel-role-diary-confirm') {
                    closeRoleDiaryConfirmModal();
                    return;
                }
                if (action === 'confirm-role-diary-confirm') {
                    const handler = roleDiaryManualConfirmHandler;
                    closeRoleDiaryConfirmModal();
                    if (typeof handler === 'function') handler();
                }
            });

            return modal;
        }

        function closeRoleDiaryConfirmModal() {
            const modal = document.getElementById('role-diary-confirm-modal');
            roleDiaryManualConfirmHandler = null;
            if (!modal) return;
            modal.hidden = true;
        }

        function openRoleDiaryConfirmModal(onConfirm, options) {
            const modal = ensureRoleDiaryConfirmModal();
            const opts = options && typeof options === 'object' ? options : {};
            const titleEl = modal.querySelector('.role-diary-confirm-title');
            const textEl = modal.querySelector('.role-diary-confirm-text');
            if (titleEl) titleEl.textContent = String(opts.title || DEFAULT_COUPLE_SPACE_CONFIRM_TITLE);
            if (textEl) textEl.textContent = String(opts.text || DEFAULT_COUPLE_SPACE_CONFIRM_TEXT);
            roleDiaryManualConfirmHandler = typeof onConfirm === 'function' ? onConfirm : null;
            modal.hidden = false;
        }

        function setGlobalCharacterReplying(isReplying, message, forceShow) {
            const pw = getParentWindow();
            if (!pw || typeof pw.setCharacterReplying !== 'function') return;
            if (!forceShow && !isCoupleSpaceAppNowVisible()) return;
            pw.setCharacterReplying(!!isReplying, String(message || ''));
        }

        function showAiError(err) {
            const pw = getParentWindow();
            const msg = err && err.message ? String(err.message) : String(err || '生成失败');
            if (pw && typeof pw.showCenterToast === 'function') {
                pw.showCenterToast(msg);
            } else if (pw && pw.GlobalModal && typeof pw.GlobalModal.showError === 'function') {
                pw.GlobalModal.showError(msg);
            } else {
                alert(msg);
            }
        }

        function showSecretSpaceReplyError(err) {
            const msg = err && err.message ? String(err.message) : String(err || '生成失败');
            const text = `秘密空间回复失败：${msg}`;
            const pw = getParentWindow();
            if (pw && pw.GlobalModal && typeof pw.GlobalModal.showError === 'function') {
                pw.GlobalModal.showError(text);
                return;
            }
            alert(text);
        }

        function readWechatChatHistory(roleId) {
            const rid = String(roleId || '').trim();
            if (!rid) return [];
            const pw = getParentWindow();
            if (pw && pw.chatData && Array.isArray(pw.chatData[rid])) return pw.chatData[rid].slice();
            try {
                const raw = localStorage.getItem('wechat_chatData');
                const parsed = raw ? safeJsonParse(raw, {}) : {};
                const list = parsed && typeof parsed === 'object' && Array.isArray(parsed[rid]) ? parsed[rid] : [];
                return list.slice();
            } catch (e) {
                return [];
            }
        }

        function cleanChatHistoryForMemory(history) {
            const list = Array.isArray(history) ? history : [];
            const out = [];
            for (let i = 0; i < list.length; i++) {
                const msg = list[i];
                if (!msg || typeof msg !== 'object') continue;
                if (msg.hidden === true) continue;
                if (msg.type === 'call_memory' || msg.type === 'system_event') {
                    if (msg.includeInAI !== true) continue;
                }
                if (!msg.content) continue;
                out.push({ ...msg });
            }
            return out;
        }

        function buildHistoryForApi(roleId, cleanHistory) {
            const pw = getParentWindow();
            if (pw && typeof pw.buildApiMemoryHistory === 'function') {
                try {
                    return pw.buildApiMemoryHistory(roleId, cleanHistory);
                } catch (e) { }
            }
            return cleanHistory.slice(-50);
        }

        function buildWechatMemoryForSecretSpace(cleanHistory, maxItems) {
            const list = Array.isArray(cleanHistory) ? cleanHistory : [];
            const n = Math.max(1, Number(maxItems) || 30);
            const picked = [];
            for (let i = 0; i < list.length; i++) {
                const msg = list[i];
                if (!msg || typeof msg !== 'object') continue;
                const role = String(msg.role || '').trim();
                if (role !== 'me' && role !== 'ai') continue;
                const content = String(msg.content || '').replace(/\s+/g, ' ').trim();
                if (!content) continue;
                const who = role === 'me' ? '我' : '你';
                const stamp = formatChatMemoryTimestamp(msg.timestamp);
                picked.push(stamp ? `[${stamp}] ${who}：${content}` : `${who}：${content}`);
            }
            return picked.slice(-n);
        }

        function buildRecentActivityLinesForSecretSpace(maxItems, sinceTs) {
            const logs = readActivityLogs();
            const n = Math.max(1, Number(maxItems) || 30);
            const lowerBoundTs = Number(sinceTs || 0) || 0;
            const lines = [];
            for (let i = 0; i < logs.length; i++) {
                const it = logs[i];
                if (!it || typeof it !== 'object') continue;
                const ts = Number(it.ts || 0) || 0;
                if (lowerBoundTs > 0 && ts > 0 && ts <= lowerBoundTs) continue;
                const text = String(it.text || '').replace(/\s+/g, ' ').trim();
                if (!text) continue;
                const app = String(it.app || '').trim();
                if (app === 'space') continue;
                const time = String(it.time || '').trim();
                lines.push(time ? `[${time}] ${text}` : text);
            }
            return lines.slice(-n);
        }

        function getSecretHeartActivityCursor(roleId) {
            const rid = String(roleId || '').trim();
            if (!rid) return 0;
            try {
                return Number(localStorage.getItem(SECRET_HEART_ACTIVITY_CURSOR_PREFIX + rid) || 0) || 0;
            } catch (e) {
                return 0;
            }
        }

        function setSecretHeartActivityCursor(roleId, ts) {
            const rid = String(roleId || '').trim();
            if (!rid) return;
            const n = Number(ts || Date.now()) || Date.now();
            try {
                localStorage.setItem(SECRET_HEART_ACTIVITY_CURSOR_PREFIX + rid, String(n));
            } catch (e) { }
        }

        function buildRecentSecretAiLines(roleId, maxItems) {
            return buildRecentSecretLinesByType(roleId, maxItems, 'ai');
        }

        function buildRecentSecretUserLines(roleId, maxItems) {
            return buildRecentSecretLinesByType(roleId, maxItems, 'user');
        }

        function buildLatestSecretUserLine(roleId) {
            const lines = buildRecentSecretUserLines(roleId, 1);
            return lines.length ? String(lines[lines.length - 1] || '').trim() : '';
        }

        function buildRecentSecretDialogueLines(roleId, maxItems) {
            const rid = String(roleId || '').trim();
            if (!rid) return [];
            let list = [];
            try {
                const map = window.__secretSpaceMessagesByRole;
                if (map && Array.isArray(map[rid])) list = map[rid].slice();
            } catch (e0) { }
            if (!list.length) {
                const key = buildCoupleSpaceRoleKey(SECRET_SPACE_MESSAGES_KEY, rid);
                const fallbackRaw = key === SECRET_SPACE_MESSAGES_KEY ? '' : String(localStorage.getItem(SECRET_SPACE_MESSAGES_KEY) || '');
                const raw = String(localStorage.getItem(key) || '') || fallbackRaw;
                const parsed = raw ? safeJsonParse(raw, []) : [];
                list = Array.isArray(parsed) ? parsed : [];
            }
            const n = Math.max(1, Number(maxItems) || 50);
            const lines = [];
            for (let i = 0; i < list.length; i++) {
                const it = list[i];
                if (!it || typeof it !== 'object') continue;
                const rawType = String(it.type || it.messageType || '').trim();
                const isAi = rawType === 'ai_message' || rawType === 'ai' || rawType === 'assistant' || rawType === 'role';
                const isUser = rawType === 'message' || rawType === 'user' || rawType === 'me';
                if (!isAi && !isUser) continue;
                const text = String(it.text || it.content || it.msg || '').replace(/\s+/g, ' ').trim();
                if (!text) continue;
                const who = isUser ? '我' : '你';
                const stamp = formatChatMemoryTimestamp(it.ts || it.timestamp);
                lines.push(stamp ? `[${stamp}] ${who}：${text}` : `${who}：${text}`);
            }
            return lines.slice(-n);
        }

        function buildRecentSecretLinesByType(roleId, maxItems, targetType) {
            const rid = String(roleId || '').trim();
            if (!rid) return [];
            let list = [];
            try {
                const map = window.__secretSpaceMessagesByRole;
                if (map && Array.isArray(map[rid])) list = map[rid].slice();
            } catch (e0) { }
            if (!list.length) {
                const key = buildCoupleSpaceRoleKey(SECRET_SPACE_MESSAGES_KEY, rid);
                const fallbackRaw = key === SECRET_SPACE_MESSAGES_KEY ? '' : String(localStorage.getItem(SECRET_SPACE_MESSAGES_KEY) || '');
                const raw = String(localStorage.getItem(key) || '') || fallbackRaw;
                const parsed = raw ? safeJsonParse(raw, []) : [];
                list = Array.isArray(parsed) ? parsed : [];
            }
            const n = Math.max(1, Number(maxItems) || 20);
            const lines = [];
            for (let i = 0; i < list.length; i++) {
                const it = list[i];
                if (!it || typeof it !== 'object') continue;
                const type = String(it.type || it.messageType || '').trim();
                const isAi = type === 'ai_message' || type === 'ai' || type === 'assistant' || type === 'role';
                const isUser = type === 'message' || type === 'user' || type === 'me';
                if (targetType === 'ai' && !isAi) continue;
                if (targetType === 'user' && !isUser) continue;
                const text = String(it.text || it.content || it.msg || '').replace(/\s+/g, ' ').trim();
                if (!text) continue;
                lines.push(text);
            }
            return lines.slice(-n);
        }

        function formatChatMemoryTimestamp(ts) {
            const num = Number(ts);
            if (!Number.isFinite(num) || num <= 0) return '';
            const d = new Date(num);
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${toDateKey(d)} ${hh}:${mm}`;
        }

        function buildShortTermMemoryText(historyForApi, maxLines) {
            const list = Array.isArray(historyForApi) ? historyForApi : [];
            const lines = [];
            for (let i = 0; i < list.length; i++) {
                const msg = list[i];
                if (!msg || typeof msg !== 'object') continue;
                const role = String(msg.role || '').trim();
                if (role !== 'me' && role !== 'ai') continue;
                const content = String(msg.content || '').replace(/\s+/g, ' ').trim();
                if (!content) continue;
                const who = role === 'me' ? '我' : 'TA';
                const stamp = formatChatMemoryTimestamp(msg.timestamp);
                lines.push(stamp ? `[${stamp}] ${who}：${content}` : `${who}：${content}`);
            }
            const n = Math.max(6, Math.min(80, Number(maxLines) || 24));
            if (lines.length <= n) return lines.join('\n');
            return lines.slice(lines.length - n).join('\n');
        }

        function buildTodayChatMemoryContext(roleId, dateKey, maxLines) {
            const dk = String(dateKey || '').trim();
            const rid = String(roleId || '').trim();
            const list = cleanChatHistoryForMemory(readWechatChatHistory(rid));
            const lines = [];
            for (let i = 0; i < list.length; i++) {
                const msg = list[i];
                if (!msg || typeof msg !== 'object') continue;
                const role = String(msg.role || '').trim();
                if (role !== 'me' && role !== 'ai') continue;
                const content = String(msg.content || '').replace(/\s+/g, ' ').trim();
                if (!content) continue;
                const ts = Number(msg.timestamp);
                if (!Number.isFinite(ts) || ts <= 0) continue;
                if (toDateKey(new Date(ts)) !== dk) continue;
                const who = role === 'me' ? '我' : 'TA';
                const stamp = formatChatMemoryTimestamp(ts);
                lines.push(stamp ? `[${stamp}] ${who}：${content}` : `${who}：${content}`);
            }
            const n = Math.max(4, Math.min(40, Number(maxLines) || 18));
            const finalLines = lines.length <= n ? lines : lines.slice(lines.length - n);
            return {
                dateKey: dk,
                count: lines.length,
                hasChat: lines.length > 0,
                text: finalLines.length ? finalLines.join('\n') : '（今天暂无和用户的微信聊天记录）'
            };
        }

        function countChatsForDate(roleId, dateKey) {
            const dk = String(dateKey || '').trim();
            if (!dk) return 0;
            const list = readWechatChatHistory(roleId);
            let count = 0;
            for (let i = 0; i < list.length; i++) {
                const msg = list[i];
                if (!msg || typeof msg !== 'object') continue;
                if (msg.hidden === true) continue;
                if (msg.type === 'system_event' || msg.type === 'call_memory' || msg.type === 'call_end') continue;
                const ts = Number(msg.timestamp);
                if (!Number.isFinite(ts) || ts <= 0) continue;
                if (toDateKey(new Date(ts)) !== dk) continue;
                if (!msg.content) continue;
                const role = String(msg.role || '').trim();
                if (role !== 'me' && role !== 'ai') continue;
                count++;
            }
            return count;
        }

        function buildRoleSystemPrompt(roleId) {
            const pw = getParentWindow();
            const rid = String(roleId || '').trim();
            const profile = pw && pw.charProfiles && pw.charProfiles[rid] ? pw.charProfiles[rid] : {};
            const userPersona = pw && pw.userPersonas && pw.userPersonas[rid] ? pw.userPersonas[rid] : {};
            const roleNameForAI = profile.nickName || rid || 'TA';
            let systemPrompt = `【角色名称】${roleNameForAI}\n` + (profile.desc || '你是一个友好的AI助手');
            if (profile.style && String(profile.style).trim()) {
                systemPrompt += `\n\n【聊天风格】\n${String(profile.style).trim()}`;
            }
            if (userPersona.name || userPersona.setting) {
                systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
                if (userPersona.name) systemPrompt += `用户名字：${userPersona.name}\n`;
                if (userPersona.setting) systemPrompt += `用户背景：${userPersona.setting}\n`;
            }
            if (pw && typeof pw.buildWorldBookPrompt === 'function' && profile.worldbookId) {
                try {
                    const wb = pw.buildWorldBookPrompt(profile.worldbookId);
                    if (wb) systemPrompt += wb;
                } catch (e) { }
            }
            return systemPrompt;
        }

        function extractJsonObject(text) {
            const raw = String(text || '').trim();
            if (!raw) return null;
            const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
            const candidate = fenced && fenced[1] ? String(fenced[1]).trim() : raw;
            const first = candidate.indexOf('{');
            const last = candidate.lastIndexOf('}');
            if (first === -1 || last === -1 || last <= first) return null;
            const slice = candidate.slice(first, last + 1);
            try {
                return JSON.parse(slice);
            } catch (e) {
                return null;
            }
        }

        function normalizeAiReplyText(text) {
            const raw = String(text || '').trim();
            if (!raw) return '';
            const obj = extractJsonObject(raw);
            let normalized = raw;
            if (obj && typeof obj === 'object') {
                if (typeof obj.reply === 'string') normalized = obj.reply.trim();
                else if (typeof obj.text === 'string') normalized = obj.text.trim();
                else if (typeof obj.content === 'string') normalized = obj.content.trim();
            }
            const fenced = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
            if (fenced && fenced[1]) {
                const inner = String(fenced[1]).trim();
                if (inner) normalized = inner;
            }
            if (normalized.indexOf('|||') !== -1) {
                const parts = normalized.split('|||').map(function (part) {
                    return String(part || '').trim();
                }).filter(Boolean);
                if (parts.length) normalized = parts[parts.length - 1];
            }
            normalized = normalized.replace(/<thinking[\s\S]*?<\/thinking>/gi, '').trim();
            if (normalized.includes('<thinking>')) {
                normalized = normalized.split('<thinking>')[0].trim();
            }
            normalized = normalized.replace(/\s*\|\|\|\s*/g, ' ').trim();
            normalized = normalized.replace(/^\[\[[^\]]+\]\]\s*/g, '').trim();
            return normalized;
        }

        function extractJsonArray(text) {
            const raw = String(text || '').trim();
            if (!raw) return null;
            const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
            const candidate = fenced && fenced[1] ? String(fenced[1]).trim() : raw;
            const first = candidate.indexOf('[');
            const last = candidate.lastIndexOf(']');
            if (first === -1 || last === -1 || last <= first) return null;
            const slice = candidate.slice(first, last + 1);
            try {
                const arr = JSON.parse(slice);
                return Array.isArray(arr) ? arr : null;
            } catch (e) {
                return null;
            }
        }

        function parsePeerUsageEvents(rawText) {
            const list = extractJsonArray(rawText);
            if (Array.isArray(list) && list.length) return list;
            const obj = extractJsonObject(rawText);
            if (obj && Array.isArray(obj.events)) return obj.events;
            const lines = String(rawText || '').split(/\r?\n+/).map((s) => String(s || '').trim()).filter(Boolean);
            const out = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const m = line.match(/^(\d{1,2}:\d{2})\s*[-：:]\s*(.+)$/);
                if (m) {
                    out.push({ time: m[1], event: m[2] });
                } else {
                    out.push({ time: '', event: line.replace(/^[\-\d\.\)\s]+/, '').trim() });
                }
            }
            return out;
        }

        function parseTodayTsByHm(hm, fallbackTs) {
            const text = String(hm || '').trim();
            const m = text.match(/^(\d{1,2}):(\d{2})$/);
            if (!m) return Number(fallbackTs || Date.now()) || Date.now();
            const hh = Math.max(0, Math.min(23, Number(m[1]) || 0));
            const mm = Math.max(0, Math.min(59, Number(m[2]) || 0));
            const d = new Date();
            d.setSeconds(0, 0);
            d.setHours(hh, mm, 0, 0);
            return d.getTime();
        }

        function formatHm(ts) {
            const n = Number(ts || 0);
            if (!Number.isFinite(n) || n <= 0) return '';
            const d = new Date(n);
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${hh}:${mm}`;
        }

        function normalizePeerUsageLogTimeline(list) {
            const src = Array.isArray(list) ? list.slice() : [];
            if (!src.length) return [];
            src.sort((a, b) => Number(a && a.ts || 0) - Number(b && b.ts || 0));
            const out = new Array(src.length);
            let nextLimit = Date.now() - 1000;
            const minGapSec = 20;
            const maxGapSec = 75;
            for (let i = src.length - 1; i >= 0; i--) {
                const it = src[i] && typeof src[i] === 'object' ? src[i] : {};
                let ts = Number(it.ts || 0);
                if (!Number.isFinite(ts) || ts <= 0) ts = nextLimit;
                if (ts > nextLimit) ts = nextLimit;
                if (i < src.length - 1) {
                    const nextItem = out[i + 1];
                    const nextTs = Number(nextItem && nextItem.ts || nextLimit);
                    if (ts >= nextTs) ts = nextTs - randomIntInclusive(minGapSec, maxGapSec) * 1000;
                }
                if (!(ts > 0)) ts = Math.max(1, nextLimit - 60000);
                out[i] = Object.assign({}, it, {
                    ts: ts,
                    time: formatHm(ts) || String(it.time || '').trim() || formatChatMemoryTimestamp(ts)
                });
                nextLimit = ts - randomIntInclusive(minGapSec, maxGapSec) * 1000;
            }
            return out;
        }

        function normalizeCoupleSpaceNameKey(name) {
            return String(name || '')
                .replace(/\s+/g, '')
                .replace(/[·•・]/g, '')
                .trim()
                .toLowerCase();
        }

        function getCoupleSpaceUserName() {
            const el = document.getElementById('name-user');
            const text = el ? String(el.textContent || '').trim() : '';
            return text || String(localStorage.getItem('user_name') || '').trim() || '我';
        }

        function getCoupleSpaceRoleAvatarSrc() {
            const img = document.getElementById('avatar-role');
            const src = img ? String(img.getAttribute('src') || img.src || '').trim() : '';
            return src || '';
        }

        function randomIntInclusive(min, max) {
            const lo = Math.floor(Number(min || 0));
            const hi = Math.floor(Number(max || 0));
            if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0;
            if (hi <= lo) return lo;
            return Math.floor(Math.random() * (hi - lo + 1)) + lo;
        }

        function buildInitialRoleMissCount() {
            return randomIntInclusive(3, 27);
        }

        function computeRoleMissLead(userCount) {
            const n = Math.max(0, Math.floor(Number(userCount || 0)));
            if (n <= 6) return randomIntInclusive(1, 3);
            if (n <= 20) return randomIntInclusive(2, 4);
            if (n <= 50) return randomIntInclusive(3, 6);
            return randomIntInclusive(4, 8);
        }

        async function refreshRoleMissCountOnAppEnter() {
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            if (!rid) return;
            let target = Math.max(0, Math.floor(Number(roleMissCountTarget || state.missCountRole || 0)));
            if (!target) {
                const legacyCount = loadAiMissCountForToday(rid);
                target = legacyCount > 0 ? Math.floor(legacyCount) : buildInitialRoleMissCount();
                roleMissCountTarget = target;
                state.missCountRole = target;
                await saveState();
            }
            state.missCountRole = target;
            updateStatsUI();
        }

        async function syncRoleMissCountAfterUserClick() {
            const displayCurrent = Math.max(0, Math.floor(Number(state.missCountRole || 0)));
            const current = Math.max(0, Math.floor(Number(roleMissCountTarget || displayCurrent || 0)));
            const lead = computeRoleMissLead(state.missCountUser);
            const step = randomIntInclusive(1, 3);
            const target = Math.max(current + step, state.missCountUser + lead);
            if (target <= current) {
                return;
            }
            roleMissCountTarget = target;
            await saveState();
        }

        function showCoupleSpaceIosNotification(avatar, name, message) {
            const pw = getParentWindow();
            if (pw && typeof pw.showIosNotification === 'function') {
                try {
                    pw.showIosNotification(avatar, name, message, { durationMs: 4200 });
                    return;
                } catch (e) { }
            }
            if (pw && typeof pw.dispatchEvent === 'function') {
                try {
                    const ev = new CustomEvent('ios-notification', {
                        detail: { avatar, name, message, durationMs: 4200 },
                    });
                    pw.dispatchEvent(ev);
                    return;
                } catch (e) { }
            }
        }

        function appendSecretSpaceAiMessage(text) {
            try {
                if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.receiveAiMessage === 'function') {
                    return !!window.secretSpaceTimeline.receiveAiMessage(text);
                }
            } catch (e) { }
            const normalizedPayload = window.secretSpaceTimeline && typeof window.secretSpaceTimeline.normalizeIncomingPayload === 'function'
                ? window.secretSpaceTimeline.normalizeIncomingPayload(text)
                : null;
            if (!normalizedPayload || normalizedPayload.mode === 'transfer_card') return false;
            const msg = String(normalizedPayload.text || '').trim();
            if (!msg) return false;
            try {
                const link = getCoupleLinkState();
                const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
                const key = buildCoupleSpaceRoleKey(SECRET_SPACE_MESSAGES_KEY, rid);
                const raw = (localStorage.getItem(key) || '') || (key !== SECRET_SPACE_MESSAGES_KEY ? (localStorage.getItem(SECRET_SPACE_MESSAGES_KEY) || '') : '');
                const parsed = raw ? safeJsonParse(raw, []) : [];
                const rawList = Array.isArray(parsed) ? parsed : [];

                const normalize = (it) => {
                    if (!it || typeof it !== 'object') return null;
                    const ts = Number(it.ts || it.timestamp || it.createdAt || 0) || 0;
                    const rawType = String(it.type || it.messageType || '').trim();
                    const type =
                        rawType === 'ai_message' || rawType === 'ai' || rawType === 'assistant' || rawType === 'role'
                            ? 'ai_message'
                            : 'message';
                    let messageType = String(it.messageType || '').trim().toLowerCase();
                    if (!messageType && rawType === 'transfer_card') messageType = 'transfer_card';
                    if (!messageType && (rawType === 'translated_text' || rawType === 'translated')) messageType = 'translated_text';
                    if (!messageType) messageType = 'text';
                    const text = String(it.text || it.content || it.msg || '').trim();
                    if (!ts) return null;
                    if (messageType === 'transfer_card') {
                        const amount = Number(it.amount || 0) || 0;
                        if (!(amount > 0)) return null;
                        const content = String(it.content || text || '拿去花').trim() || '拿去花';
                        return {
                            type: 'ai_message',
                            messageType: 'transfer_card',
                            ts,
                            text: text || content,
                            amount: Math.round(amount * 100) / 100,
                            color: String(it.color || 'pink').trim() || 'pink',
                            content: content,
                            status: String(it.status || 'pending').trim() || 'pending'
                        };
                    }
                    if (!text) return null;
                    return { type, messageType, ts, text };
                };

                const normalized = rawList.map(normalize).filter(Boolean);
                normalized.push({
                    type: 'ai_message',
                    messageType: normalizedPayload.mode === 'translated_text' ? 'translated_text' : 'text',
                    ts: Date.now(),
                    text: msg
                });
                normalized.sort((a, b) => Number(a.ts) - Number(b.ts));

                const messages = normalized.filter((it) => it.type === 'message');
                const aiMessages = normalized.filter((it) => it.type === 'ai_message');

                const max = 300;
                const half = Math.floor(max / 2);

                let keepMsg = Math.min(messages.length, half);
                let keepAi = Math.min(aiMessages.length, half);

                let remain = max - (keepMsg + keepAi);
                if (remain > 0) {
                    const extraMsg = Math.min(messages.length - keepMsg, remain);
                    keepMsg += extraMsg;
                    remain -= extraMsg;
                }
                if (remain > 0) {
                    const extraAi = Math.min(aiMessages.length - keepAi, remain);
                    keepAi += extraAi;
                    remain -= extraAi;
                }

                const clean = messages.slice(-keepMsg).concat(aiMessages.slice(-keepAi));
                clean.sort((a, b) => Number(a.ts) - Number(b.ts));

                localStorage.setItem(key, JSON.stringify(clean));
                return true;
            } catch (e) {
                return false;
            }
        }

        let secretPeerUsageChatInFlight = false;

        async function triggerSecretPeerUsageDialogue(userText) {
            const msg = String(userText || '').trim();
            if (!msg) return false;
            if (secretPeerUsageChatInFlight) return false;
            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) return false;
            const roleId = String(link.roleId || '').trim();
            if (!roleId) return false;
            const timeline = window.secretSpaceTimeline && typeof window.secretSpaceTimeline === 'object'
                ? window.secretSpaceTimeline
                : null;
            if (!timeline) return false;
            const readHistory = typeof timeline.readPeerUsageChatHistory === 'function'
                ? timeline.readPeerUsageChatHistory
                : null;
            const appendUser = typeof timeline.appendPeerUsageUserMessage === 'function'
                ? timeline.appendPeerUsageUserMessage
                : null;
            const appendAi = typeof timeline.appendPeerUsageAiMessage === 'function'
                ? timeline.appendPeerUsageAiMessage
                : null;
            const buildLogs = typeof timeline.buildPeerUsagePromptLogText === 'function'
                ? timeline.buildPeerUsagePromptLogText
                : null;
            if (!readHistory || !appendUser || !appendAi || !buildLogs) return false;

            const oldHistoryRaw = readHistory();
            const oldHistory = Array.isArray(oldHistoryRaw) ? oldHistoryRaw : [];
            const isFirstRound = oldHistory.length === 0;
            const logsText = buildLogs(36);
            const apiUserPrompt = isFirstRound
                ? buildSecretPeerUsageFirstTurnUserPrompt(logsText, msg)
                : msg;
            if (!appendUser(msg, apiUserPrompt)) return false;

            secretPeerUsageChatInFlight = true;
            const requestStartedAt = Date.now();
            try {
                if (typeof timeline.setAiTyping === 'function') timeline.setAiTyping(true);
            } catch (e0) { }
            try {
                const historyForApi = oldHistory
                    .map((it) => {
                        if (!it || typeof it !== 'object') return null;
                        const role = String(it.role || '').trim() === 'ai' ? 'ai' : 'me';
                        const content = String(it.content || '').trim();
                        const timestamp = Number(it.timestamp || 0) || Date.now();
                        if (!content) return null;
                        return { role, content, timestamp };
                    })
                    .filter(Boolean);
                const extraSystemPrompt = buildSecretPeerUsageSceneExtraPrompt(roleId);
                const outputInstructions =
                    isCoupleSpaceBilingualRole(roleId)
                        ? '输出 4~10 个微信气泡。每个气泡如果是外语或非简体中文，都必须写成 {"type":"translated_text","foreign":"角色原话","translation":"对应的简体中文翻译"}；如果本句本来就是简体中文，才允许直接输出普通文本。先回应用户说的话，再回应你刚才的行为记录。'
                        : '输出 4~10 行微信短句，每行一句。先回应用户说的话，再回应你刚才的行为记录。第一句要明显表现出你已经读到了角色刚才的行为记录。只输出台词，不要解释。';
                const raw = await callRoleDiaryLLM(roleId, historyForApi, apiUserPrompt, extraSystemPrompt, {
                    outputInstructions
                });
                const trimmed = normalizeAiReplyText(raw);
                if (!trimmed) return false;
                const lines = splitSecretSpaceReplyLines(trimmed, 10);
                if (!lines.length) return false;
                const minThinkingMs = randomIntInclusive(650, 1550);
                const elapsed = Date.now() - requestStartedAt;
                if (elapsed < minThinkingMs) {
                    await new Promise((resolve) => setTimeout(resolve, minThinkingMs - elapsed));
                }
                try {
                    if (typeof timeline.setAiTyping === 'function') timeline.setAiTyping(false);
                } catch (eHide) { }
                const avatar = getCoupleSpaceRoleAvatarSrc();
                const roleName = getRoleDisplayName();
                showCoupleSpaceIosNotification(avatar, roleName, getSecretSpaceSegmentDisplayText(lines[0]));
                for (let i = 0; i < lines.length; i++) {
                    appendAi(lines[i]);
                    if (i < lines.length - 1) {
                        const line = getSecretSpaceSegmentDisplayText(lines[i]);
                        const rhythm = Math.max(260, Math.min(1200, 280 + line.length * 26 + randomIntInclusive(80, 260)));
                        await new Promise((resolve) => setTimeout(resolve, rhythm));
                    }
                }
                return true;
            } catch (e) {
                showSecretSpaceReplyError(e);
                return false;
            } finally {
                try {
                    if (typeof timeline.setAiTyping === 'function') timeline.setAiTyping(false);
                } catch (e1) { }
                secretPeerUsageChatInFlight = false;
            }
        }

        function readCoupleSpaceAiActivityState(roleId) {
            const rid = String(roleId || '').trim();
            if (!rid) return { lastSeenTs: 0, normalCount: 0, buffer: [] };
            try {
                const raw = localStorage.getItem(COUPLE_SPACE_AI_ACTIVITY_STATE_PREFIX + rid) || '';
                if (!raw) return { lastSeenTs: 0, normalCount: 0, buffer: [] };
                const parsed = safeJsonParse(raw, null);
                const obj = parsed && typeof parsed === 'object' ? parsed : null;
                if (!obj) return { lastSeenTs: 0, normalCount: 0, buffer: [] };
                const lastSeenTs = Number(obj.lastSeenTs || 0) || 0;
                const normalCount = Number(obj.normalCount || 0) || 0;
                const buffer = Array.isArray(obj.buffer) ? obj.buffer.filter((it) => it && typeof it === 'object') : [];
                return { lastSeenTs, normalCount, buffer };
            } catch (e) {
                return { lastSeenTs: 0, normalCount: 0, buffer: [] };
            }
        }

        function writeCoupleSpaceAiActivityState(roleId, next) {
            const rid = String(roleId || '').trim();
            if (!rid) return;
            const obj = next && typeof next === 'object' ? next : {};
            const lastSeenTs = Number(obj.lastSeenTs || 0) || 0;
            const normalCount = Number(obj.normalCount || 0) || 0;
            const buffer = Array.isArray(obj.buffer) ? obj.buffer.slice(-30) : [];
            try {
                localStorage.setItem(
                    COUPLE_SPACE_AI_ACTIVITY_STATE_PREFIX + rid,
                    JSON.stringify({ lastSeenTs, normalCount, buffer })
                );
            } catch (e) { }
        }

        function pickActivityPeerName(activity) {
            try {
                const data = activity && typeof activity === 'object' ? activity.data : null;
                const fromData = data && typeof data === 'object' ? String(data.peerName || '').trim() : '';
                if (fromData) return fromData;
            } catch (e) { }
            const text = String(activity && activity.text ? activity.text : '').trim();
            const m = text.match(/与\s*([^，。]+?)\s*的聊天/);
            if (m && m[1]) return String(m[1]).trim();
            return '';
        }

        function detectSensitiveActivity(activity, coupleRoleName, monitorSettings) {
            const it = activity && typeof activity === 'object' ? activity : null;
            if (!it) return null;
            const kind = String(it.kind || '').trim();
            const text = String(it.text || '').trim();
            const ms = monitorSettings && typeof monitorSettings === 'object' ? monitorSettings : getSecretUsageMonitorSettings();
            const monitorOn = ms.enabled === true;
            if (monitorOn && ms.wallet && (kind === 'wallet_open' || text.includes('钱包'))) {
                return { trigger: 'wallet', activity: it };
            }
            if (monitorOn && ms.period && (kind === 'period_open' || text.includes('经期'))) {
                return { trigger: 'period', activity: it };
            }
            if (monitorOn && ms.music && (kind === 'music_open' || text.includes('音乐APP') || text.includes('打开了音乐'))) {
                return { trigger: 'music', activity: it };
            }
            if (monitorOn && ms.battery && (kind === 'battery_low' || text.includes('电量'))) {
                const data = it.data && typeof it.data === 'object' ? it.data : {};
                return { trigger: 'battery', activity: it, level: normalizeUserBatteryLevel(data.level) };
            }
            if (kind === 'wechat_chat') {
                const peer = pickActivityPeerName(it);
                const peerKey = normalizeCoupleSpaceNameKey(peer);
                const roleKey = normalizeCoupleSpaceNameKey(coupleRoleName);
                if (peerKey && roleKey && peerKey !== roleKey) {
                    return { trigger: 'wechat_other', activity: it, peerName: peer };
                }
            }
            return null;
        }

        function buildSecretSpaceExtraSystemPrompt(roleId) {
            const pw = getParentWindow();
            const rid = String(roleId || '').trim();
            const profile = pw && pw.charProfiles && pw.charProfiles[rid] ? pw.charProfiles[rid] : {};
            const roleName = String(profile.remark || profile.nickName || profile.name || getRoleDisplayName() || rid || 'Ta').trim() || 'Ta';
            const userName = getCoupleSpaceUserName();
            return (
                `你现在是${roleName}。你和${userName}处于情侣空间关系中。\n` +
                `此刻是“情侣空间-秘密空间”的场景，不是普通微信聊天窗口。你要明确区分这两个场景。\n` +
                `你可以看到${userName}在项目内的操作记录，并根据这些记录作出反应。\n` +
                `回复时第一句必须自然表现出“我已经看到了刚刚的记录/操作”，不要像普通微信闲聊一样直接接话。\n` +
                `禁止把普通微信聊天页的近聊内容当成当前场景主依据；这里只能优先承接情侣空间里的记录、秘密空间里的对话和人设。\n` +
                `以下是需要特殊反应的规则：\n` +
                `1. 如果识别到用户在看钱包，可能是她钱不够用了，你需要表达出对此的关心，并凭借自身实力给她一定金额的钱。\n` +
                `2. 如果识别到用户打开经期记录，要第一时间表达体贴和关心。\n` +
                `3. 如果识别到用户打开音乐，要自然关心她在听什么，保持恋人语气。\n` +
                `4. 如果识别到用户手机电量低于30%，要第一时间提醒她充电，语气要像恋人日常关心，不要像系统通知。\n` +
                `5. 如果用户在和别人聊天，你会吃醋，并产生想要打断她当前聊天的欲望，试图阻止她。\n` +
                `6. 平时你要综合“情侣空间操作记录 + 用户在秘密空间里最近说过的话 + 你在秘密空间里最近说过的话”来续接。\n` +
                `7. 你的回复必须是微信风格短句，至少 3 行，每行一句，分开输出，只输出台词，不要解释。`
            );
        }

        function buildSecretSpaceUserPrompt(trigger, payload, context) {
            const userName = getCoupleSpaceUserName();
            const roleName = getRoleDisplayName();
            const ctx = context && typeof context === 'object' ? context : {};
            const wechatLines = Array.isArray(ctx.wechatLines) ? ctx.wechatLines : [];
            const activityLines = Array.isArray(ctx.activityLines) ? ctx.activityLines : [];
            const userLines = Array.isArray(ctx.userLines) ? ctx.userLines : [];
            const aiLines = Array.isArray(ctx.aiLines) ? ctx.aiLines : [];
            const dialogueLines = Array.isArray(ctx.dialogueLines) ? ctx.dialogueLines : [];
            const latestUserLine = String(ctx.latestUserLine || '').trim();
            const wechatBlock = wechatLines.length ? wechatLines.map((line) => `- ${line}`).join('\n') : '（暂无）';
            const activityBlock = activityLines.length ? activityLines.map((line) => `- ${line}`).join('\n') : '（暂无）';
            const userBlock = userLines.length ? userLines.map((line) => `- ${line}`).join('\n') : '（暂无）';
            const aiBlock = aiLines.length ? aiLines.map((line) => `- ${line}`).join('\n') : '（暂无）';
            const justSaid = latestUserLine || '（暂无）';
            const contextBlock =
                `你当前可见上下文：\n` +
                `【场景】你当前正在 情侣空间 > 秘密空间（不是微信聊天页） 当中，你们现在是恋人关系。${userName}刚刚说 ${justSaid}\n` +
                `接下来请你对她的操作记录【情侣空间内最近操作记录】和她说的话进行回复。以下是你需要参考的背景信息：\n` +
                `【普通微信聊天记忆（本轮默认不使用）】\n${wechatBlock}\n\n` +
                `【情侣空间内最近操作记录】\n${activityBlock}\n\n` +
                `【${userName}在秘密空间里最近说过的话】\n${userBlock}\n\n` +
                `【你在秘密空间内最近说过的话】\n${aiBlock}\n`;
            if (trigger === 'wallet') {
                return (
                    `${contextBlock}\n` +
                    `场景：你在情侣空间里偷看到${userName}刚刚查看了钱包。\n` +
                    `请你立刻用恋人的口吻回复，第一句要让人看出你已经看到她在看钱包这件事。\n` +
                    `输出要求：3~6行，每行一句，短句，像微信在线聊天。`
                );
            }
            if (trigger === 'period') {
                return (
                    `${contextBlock}\n` +
                    `场景：你在情侣空间里看到${userName}刚刚打开了经期记录页面。\n` +
                    `请你立刻用恋人的口吻给出关心和体贴，不要太机械，第一句要让人看出你已经看到了这件事。\n` +
                    `输出要求：3~6行，每行一句，短句，像微信在线聊天。`
                );
            }
            if (trigger === 'music') {
                return (
                    `${contextBlock}\n` +
                    `场景：你在情侣空间里看到${userName}刚刚打开了音乐APP。\n` +
                    `请你立刻用恋人的口吻回复，可以自然追问她在听什么，第一句要让人看出你已经看到她在听歌。\n` +
                    `输出要求：3~6行，每行一句，短句，像微信在线聊天。`
                );
            }
            if (trigger === 'battery') {
                const level = normalizeUserBatteryLevel(payload && payload.level);
                const levelText = level === null ? '低于30%' : `${Math.floor(level)}%`;
                return (
                    `${contextBlock}\n` +
                    `场景：你在情侣空间里看到${userName}当前手机电量只有 ${levelText}，已经低于 30%。\n` +
                    `请你立刻用恋人的口吻提醒她充电，第一句要让人看出你已经看到她手机快没电了。\n` +
                    `不要像系统弹窗，不要责备她，要自然、亲近、短句。\n` +
                    `输出要求：3~6行，每行一句，短句，像微信在线聊天。`
                );
            }
            if (trigger === 'wechat_other') {
                const peerName = String(payload && payload.peerName ? payload.peerName : '').trim() || '某个人';
                return (
                    `${contextBlock}\n` +
                    `场景：你在情侣空间里看到${userName}打开了微信里和「${peerName}」的聊天。\n` +
                    `注意：情侣空间里与你绑定的对象是「${roleName}」，而${peerName}不是你。\n` +
                    `请你立刻用吃醋、想打断她的口吻回复，第一句要让人看出你已经看到她在和别人聊。\n` +
                    `输出要求：3~6行，每行一句，短句，像微信在线聊天。`
                );
            }
            if (trigger === 'secret_heart') {
                const justSaidBlock = latestUserLine ? `- ${latestUserLine}` : '（当前轮无新的秘密空间用户发言）';
                const dialogueBlock = dialogueLines.length ? dialogueLines.map((line) => `- ${line}`).join('\n') : '（暂无）';
                const hasActivityNow = activityLines.length > 0;
                const activitySection = hasActivityNow ? `【3. 用户刚刚的操作记录】\n${activityBlock}\n\n` : '';
                const replyRule = hasActivityNow
                    ? '回复规则：必须先针对【1. 用户说话内容】回复，再针对【3. 用户刚刚的操作记录】回复；第一句要先表现出你已经看过记录，整段回复必须符合你的角色人设。'
                    : '回复规则：当前轮没有新增操作记录，不要提操作记录；先基于【1】和【2】自然续接回复，整段回复必须符合你的角色人设。';
                return (
                    `你当前可见输入（按顺序）：\n` +
                    `【1. 用户说话内容】\n${justSaidBlock}\n\n` +
                    `【2. 双方在秘密空间里的近50条对话记录】\n${dialogueBlock}\n\n` +
                    `${activitySection}` +
                    `场景：${userName}在情侣空间秘密空间里点了爱心按钮，主动想和你说话。\n` +
                    `${replyRule}\n` +
                    `输出要求：4~10行，每行一句，短句，像微信在线聊天。`
                );
            }
            const ops = Array.isArray(payload && payload.ops ? payload.ops : []) ? payload.ops : [];
            const lines = ops
                .map((it) => {
                    const t = String(it && it.text ? it.text : '').trim();
                    return t ? `- ${t}` : '';
                })
                .filter(Boolean)
                .join('\n');
            return (
                `${contextBlock}\n` +
                `场景：你在情侣空间里看到了${userName}最近的操作记录。\n` +
                `操作记录如下：\n${lines}\n\n` +
                `请你根据人设作出反应。\n` +
                `输出要求：2~4行，每行一句，短句，像微信在线聊天。`
            );
        }

        function buildSecretPeerUsageSceneExtraPrompt(roleId) {
            const userName = getCoupleSpaceUserName();
            return (
                `你的角色人设与世界书已经由系统注入，请直接遵守，不要重复自我介绍。\n` +
                `现在你正处于和【${userName}】的情侣空间当中，你们是伴侣关系。\n` +
                `这里不是普通微信聊天页，而是“查看角色记录”的秘密空间。\n` +
                `用户已被授权查看你的手机使用记录。\n` +
                `首条用户消息会包含“角色刚才的行为记录”，后续消息不再重复，你要基于历史持续记住它。\n` +
                `回复规则：先回应用户这句话，再回应你刚才的行为记录；第一句必须自然点明你已经看到记录，语气必须符合人设。\n` +
                (
                    isCoupleSpaceBilingualRole(roleId)
                        ? `输出规则：如果你是外语或非简体中文角色，每个回复气泡都必须保持“原文 + 简体中文翻译”的结构化双语格式。`
                        : `输出规则：像微信消息一样简短，输出4~10行，每行一句，只输出台词。`
                )
            );
        }

        function buildSecretPeerUsageFirstTurnUserPrompt(logText, userText) {
            const logs = String(logText || '').trim() || '（暂无行为记录）';
            const text = String(userText || '').trim();
            return `场景：情侣空间 > 查看角色记录。\n角色刚才的行为记录：\n${logs}\n\n用户说：${text}`;
        }

        function buildRealUserEvidenceForPeerUsage(maxItems) {
            const limit = Math.max(1, Math.min(16, Number(maxItems || 10) || 10));
            const momentLines = [];
            const activityLines = [];
            try {
                const rawMoments = localStorage.getItem('wechat_moments_data') || '';
                const moments = rawMoments ? safeJsonParse(rawMoments, null) : null;
                const posts = moments && Array.isArray(moments.posts) ? moments.posts : [];
                posts
                    .filter((post) => String(post && post.roleId ? post.roleId : 'me') === 'me')
                    .sort((a, b) => (Number(b && b.timestamp) || 0) - (Number(a && a.timestamp) || 0))
                    .slice(0, limit)
                    .forEach((post) => {
                        const ts = Number(post && post.timestamp) || 0;
                        const time = ts ? formatChatMemoryTimestamp(ts) : '';
                        const content = String(post && post.content ? post.content : '').replace(/\s+/g, ' ').trim();
                        const imageCount = Array.isArray(post && post.images) ? post.images.length : 0;
                        const text = content || (imageCount ? `发布了${imageCount}张图片` : '');
                        if (text) momentLines.push(`${time ? '[' + time + '] ' : ''}${getCoupleSpaceUserName()}发了朋友圈：${text}${imageCount ? `（${imageCount}张图）` : ''}`);
                    });
            } catch (e) { }
            try {
                const rawLogs = localStorage.getItem(ACTIVITY_LOG_STORAGE_KEY) || '';
                const logs = rawLogs ? safeJsonParse(rawLogs, []) : [];
                (Array.isArray(logs) ? logs : [])
                    .slice(-limit)
                    .forEach((it) => {
                        const time = String(it && it.time ? it.time : '').trim();
                        const text = String(it && it.text ? it.text : '').replace(/\s+/g, ' ').trim();
                        if (text) activityLines.push(`${time ? '[' + time + '] ' : ''}${text}`);
                    });
            } catch (e2) { }
            const sections = [];
            if (momentLines.length) sections.push('【用户真实朋友圈】\n' + momentLines.join('\n'));
            if (activityLines.length) sections.push('【用户真实操作】\n' + activityLines.join('\n'));
            return sections.length ? sections.join('\n') : '（暂无可引用的真实用户动态或操作记录）';
        }

        function getSecretSpaceSegmentDisplayText(segment) {
            const seg = segment && typeof segment === 'object' ? segment : null;
            if (!seg) return '';
            if (seg.kind === 'translated_text') {
                return String(seg.translation || seg.foreign || '').trim();
            }
            return String(seg.text || '').trim();
        }

        function splitSecretSpaceReplyLines(text, maxItems) {
            const raw = String(text == null ? '' : text).trim();
            if (!raw) return [];
            const normalized = typeof window.normalizeStructuredReplySegments === 'function'
                ? window.normalizeStructuredReplySegments(raw, { offlineMode: false })
                : [];
            const structured = Array.isArray(normalized)
                ? normalized.filter((seg) => {
                    return seg && (seg.kind === 'text' || seg.kind === 'translated_text');
                }).map((seg) => {
                    if (seg.kind === 'translated_text') {
                        return {
                            kind: 'translated_text',
                            foreign: String(seg.foreign || '').trim(),
                            translation: String(seg.translation || '').trim()
                        };
                    }
                    return {
                        kind: 'text',
                        text: String(seg.text || '').trim()
                    };
                }).filter((seg) => !!getSecretSpaceSegmentDisplayText(seg))
                : [];
            if (structured.length) {
                const mergedStructured = [];
                for (let i = 0; i < structured.length; i++) {
                    const current = structured[i];
                    if (!current) continue;
                    if (current.kind === 'translated_text') {
                        mergedStructured.push(current);
                        continue;
                    }
                    const directPair = resolveCoupleSpaceTranslatedPayload(current.text || '');
                    if (directPair && directPair.foreign && directPair.translation) {
                        mergedStructured.push({ kind: 'translated_text', foreign: directPair.foreign, translation: directPair.translation });
                        continue;
                    }
                    const next = structured[i + 1];
                    if (next && next.kind === 'text') {
                        const mergedPair = resolveCoupleSpaceTranslatedPayload(String(current.text || '') + '\n' + String(next.text || ''));
                        if (mergedPair && mergedPair.foreign && mergedPair.translation) {
                            mergedStructured.push({ kind: 'translated_text', foreign: mergedPair.foreign, translation: mergedPair.translation });
                            i++;
                            continue;
                        }
                    }
                    mergedStructured.push(current);
                }
                return mergedStructured.slice(0, Math.max(1, Number(maxItems) || 4));
            }

            const preset = raw
                .split(/\r?\n+/)
                .map((line) => String(line || '').replace(/^[\-\d\.\)\s]+/, '').trim())
                .filter(Boolean);
            const grouped = [];
            for (let i = 0; i < preset.length; i++) {
                const current = preset[i];
                const directPair = resolveCoupleSpaceTranslatedPayload(current);
                if (directPair && directPair.foreign && directPair.translation) {
                    grouped.push({ kind: 'translated_text', foreign: directPair.foreign, translation: directPair.translation });
                    continue;
                }
                if (i + 1 < preset.length) {
                    const pair = resolveCoupleSpaceTranslatedPayload(current + '\n' + preset[i + 1]);
                    if (pair && pair.foreign && pair.translation) {
                        grouped.push({ kind: 'translated_text', foreign: pair.foreign, translation: pair.translation });
                        i++;
                        continue;
                    }
                }
                grouped.push({ kind: 'text', text: current });
            }
            if (grouped.length > 1) {
                return grouped.slice(0, Math.max(1, Number(maxItems) || 4));
            }

            const flatLines = raw
                .split(/(?<=[。！？!?；;，,~…])/)
                .map((line) => String(line || '').trim())
                .filter(Boolean)
                .map((line) => ({ kind: 'text', text: line }));
            return flatLines.slice(0, Math.max(1, Number(maxItems) || 4));
        }

        async function generateSecretPeerUsageRecords() {
            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) {
                throw new Error('尚未绑定情侣角色');
            }
            const roleId = String(link.roleId || '').trim();
            const roleName = getRoleDisplayName();
            const userName = getCoupleSpaceUserName();
            const nowText = formatHm(Date.now()) || '00:00';
            const realUserEvidence = buildRealUserEvidenceForPeerUsage(12);
            const extraSystemPrompt =
                '你将以角色日常习惯来模拟行为记录，事件必须自然、生活化，并符合你的人设与世界书。';
            const userPrompt =
                '场景：这是情侣空间 > 秘密空间中的“查看他在干嘛”。\n' +
                '请一次性生成一批“角色使用手机”的事件记录，供时间线渲染。\n' +
                '事件方向：打开手机、关闭手机、打开App（微信/钱包/经期/音乐/朋友圈/情侣空间）、播放歌曲、查看电量、点开与某个联系人的聊天框。\n' +
                '每条事件要简短、具体、像真实发生过；必须符合角色人设。\n' +
                `用户是${userName}，角色是${roleName}。\n` +
                `【真实用户动态与操作证据】\n${realUserEvidence}\n` +
                '严格约束：如果生成的记录提到用户、用户朋友圈、用户发了什么、用户照片、用户和谁聊天、用户刚做了什么，必须能在上面的真实证据里找到依据；没有证据就禁止脑补。\n' +
                '如果没有用户发朋友圈的真实记录，可以写角色打开朋友圈/刷朋友圈，但禁止写“看到了用户刚发的朋友圈/给用户朋友圈点赞/评论用户朋友圈”。\n' +
                '可以自由生成角色自己的手机行为，但只要和用户有关，就必须真实发生过。\n' +
                `当前时间是 ${nowText}，你生成的 time 必须不晚于这个时间（都在这之前）。\n` +
                '请严格输出 JSON 数组，每项格式为 {"time":"HH:mm","event":"..."}。\n' +
                '数组长度 8~16，time 递增。不要输出解释和代码块。';
            const outputInstructions = '只输出 JSON 数组，不要输出任何额外文本。';
            const raw = await callRoleDiaryLLM(roleId, [], userPrompt, extraSystemPrompt, { outputInstructions });
            const parsed = parsePeerUsageEvents(raw);
            if (!Array.isArray(parsed) || !parsed.length) {
                throw new Error('未生成有效事件');
            }
            const now = Date.now();
            const base = now - parsed.length * 60000;
            const logs = [];
            for (let i = 0; i < parsed.length; i++) {
                const it = parsed[i] && typeof parsed[i] === 'object' ? parsed[i] : {};
                const eventRaw = String(it.event || it.text || it.content || '').trim();
                if (!eventRaw) continue;
                const timeRaw = String(it.time || '').trim();
                const ts = parseTodayTsByHm(timeRaw, base + i * 60000);
                const line = eventRaw.indexOf(roleName) === 0 ? eventRaw : (roleName + eventRaw);
                let kind = 'other';
                let app = 'other';
                if (line.includes('钱包')) { kind = 'wallet_open'; app = 'wallet'; }
                else if (line.includes('经期')) { kind = 'period_open'; app = 'period'; }
                else if (line.includes('音乐') || line.includes('歌曲') || line.includes('听歌')) { kind = 'music_play'; app = 'music'; }
                else if (line.includes('朋友圈')) { kind = 'moments_open'; app = 'moments'; }
                else if (line.includes('微信') || line.includes('聊天')) { kind = 'wechat_chat'; app = 'wechat'; }
                else if (line.includes('情侣空间')) { kind = 'space_open'; app = 'space'; }
                else if (line.includes('电量')) { kind = 'battery_low'; app = 'system'; }
                else if (line.includes('关闭手机') || line.includes('锁屏')) { kind = 'system_exit'; app = 'system'; }
                else if (line.includes('打开手机') || line.includes('点亮')) { kind = 'home_open'; app = 'home'; }
                logs.push({
                    ts,
                    time: timeRaw || formatChatMemoryTimestamp(ts),
                    text: line,
                    kind,
                    app
                });
            }
            if (!logs.length) throw new Error('生成结果为空');
            const normalized = normalizePeerUsageLogTimeline(logs).slice(-120);
            return normalized;
        }

        function showSecretSpaceBarrageForWechatOther(peerName) {
            const pw = getParentWindow();
            if (!pw) return;
            const roleName = getRoleDisplayName();
            const peer = String(peerName || '').trim() || 'Ta';
            const lines = [
                `${roleName}发现你正在和「${peer}」聊天...`,
                `${roleName}正在暗中观察...`,
                `情绪正在酝酿中...`,
                `正在生成吃醋反应...`
            ];
            try {
                if (typeof pw.showBarrage === 'function') {
                    pw.showBarrage(lines);
                    return;
                }
            } catch (e) { }
            try {
                if (typeof pw.dispatchEvent === 'function') {
                    pw.dispatchEvent(new CustomEvent('ai-barrage:show', { detail: { textArray: lines } }));
                }
            } catch (e2) { }
        }

        function hideSecretSpaceBarrage() {
            const pw = getParentWindow();
            if (!pw) return;
            try {
                if (typeof pw.hideBarrage === 'function') {
                    pw.hideBarrage();
                    return;
                }
            } catch (e) { }
            try {
                if (typeof pw.dispatchEvent === 'function') {
                    pw.dispatchEvent(new CustomEvent('ai-barrage:hide', { detail: {} }));
                }
            } catch (e2) { }
        }

        let coupleSpaceAiActivityInFlight = false;
        let coupleSpaceAiActivityPending = null;

        function isHighPrioritySecretTrigger(trigger) {
            const t = String(trigger || '').trim();
            return t === 'wallet' || t === 'wechat_other' || t === 'period' || t === 'music' || t === 'battery';
        }

        async function triggerSecretSpaceAiReaction(trigger, payload) {
            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) return;
            const roleId = String(link.roleId || '').trim();
            if (!roleId) return;

            if ((trigger === 'wallet' || trigger === 'music' || trigger === 'period' || trigger === 'battery') && !isSecretUsageTriggerEnabled(trigger)) {
                return;
            }
            if (trigger === 'battery') {
                const payloadLevel = payload && typeof payload === 'object' ? payload.level : null;
                const level = normalizeUserBatteryLevel(payloadLevel);
                const resolvedLevel = level === null ? readCurrentUserBatteryLevel() : level;
                if (!(payload && payload.__batteryClaimed === true)) {
                    if (!claimLowBatteryAlert(roleId, resolvedLevel, payload && payload.source)) return;
                }
                payload = Object.assign({}, payload || {}, { level: resolvedLevel, __batteryClaimed: true });
            }

            // 修罗场开关检查：wechat_other 触发类型需要检查开关
            if (trigger === 'wechat_other') {
                // 直接从 localStorage 读取设置，避免模块加载问题
                let xiuluoEnabled = false;
                try {
                    const settingsRaw = localStorage.getItem('qlkj_settings_v1');
                    if (settingsRaw) {
                        const settings = JSON.parse(settingsRaw);
                        xiuluoEnabled = settings.xiuluoEnabled === true;
                    }
                } catch (e) {
                    xiuluoEnabled = false;
                }
                // 如果设置不存在或关闭，直接返回
                if (!xiuluoEnabled) {
                    console.log('[修罗场] 开关关闭，跳过触发');
                    return;
                }
                console.log('[修罗场] 开关开启，触发反应');
            }

            if (coupleSpaceAiActivityInFlight) {
                const next = { trigger, payload };
                if (!coupleSpaceAiActivityPending) {
                    coupleSpaceAiActivityPending = next;
                } else {
                    const prevTrig = String(coupleSpaceAiActivityPending.trigger || '');
                    const prevIsHigh = isHighPrioritySecretTrigger(prevTrig);
                    const nextIsHigh = isHighPrioritySecretTrigger(trigger);
                    if (nextIsHigh || !prevIsHigh) {
                        coupleSpaceAiActivityPending = next;
                    }
                }
                return;
            }

            coupleSpaceAiActivityInFlight = true;
            const shouldBarrage = trigger === 'wechat_other';
            if (shouldBarrage) {
                showSecretSpaceBarrageForWechatOther(payload && payload.peerName ? payload.peerName : '');
            }
            try {
                if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.setAiTyping === 'function') {
                    window.secretSpaceTimeline.setAiTyping(true);
                }
            } catch (e0) { }
            try {
                const historyForApi = [];
                const nowTs = Date.now();
                const secretHeartCursorTs = trigger === 'secret_heart' ? getSecretHeartActivityCursor(roleId) : 0;
                const activityLinesForPrompt = trigger === 'secret_heart'
                    ? (secretHeartCursorTs > 0 ? buildRecentActivityLinesForSecretSpace(30, secretHeartCursorTs) : [])
                    : buildRecentActivityLinesForSecretSpace(30);
                const promptContext = {
                    wechatLines: [],
                    activityLines: activityLinesForPrompt,
                    userLines: buildRecentSecretUserLines(roleId, 20),
                    latestUserLine: buildLatestSecretUserLine(roleId),
                    aiLines: buildRecentSecretAiLines(roleId, 20),
                    dialogueLines: buildRecentSecretDialogueLines(roleId, 50)
                };
                if (trigger === 'secret_heart') {
                    setSecretHeartActivityCursor(roleId, nowTs);
                }
                const extraSystemPrompt = buildSecretSpaceExtraSystemPrompt(roleId);
                const userPrompt = buildSecretSpaceUserPrompt(trigger, payload, promptContext);
                const outputInstructions = trigger === 'secret_heart'
                    ? (
                        isCoupleSpaceBilingualRole(roleId)
                            ? '输出 4~10 个微信气泡。每个气泡如果是外语或非简体中文，都必须写成 {"type":"translated_text","foreign":"角色原话","translation":"对应的简体中文翻译"}；简体中文句子才允许直接输出普通文本。先回复用户说的话，再回复用户操作记录。'
                            : '输出 4~10 行微信短句，每行一句。先回复用户说的话，再回复用户操作记录。第一句要先让人看出你已经看到了记录。只输出台词，不要解释，不要前缀。'
                    )
                    : (
                        isCoupleSpaceBilingualRole(roleId)
                            ? '输出 3~6 个微信气泡。每个气泡如果是外语或非简体中文，都必须写成 {"type":"translated_text","foreign":"角色原话","translation":"对应的简体中文翻译"}；简体中文句子才允许直接输出普通文本。'
                            : '输出 3~6 行简短自然的微信式中文消息，第一句要让人看出你已经看到了刚刚的操作记录。不要解释，不要输出 JSON、代码块或前缀。'
                    );
                const text = await callRoleDiaryLLM(roleId, historyForApi, userPrompt, extraSystemPrompt, { outputInstructions });
                const trimmed = normalizeAiReplyText(text);
                if (!trimmed) return;

                const avatar = getCoupleSpaceRoleAvatarSrc();
                const roleName = getRoleDisplayName();
                const maxLines = trigger === 'secret_heart' ? 10 : 4;
                const lines = splitSecretSpaceReplyLines(trimmed, maxLines);
                if (!lines.length) return;
                if (shouldBarrage) hideSecretSpaceBarrage();
                showCoupleSpaceIosNotification(avatar, roleName, getSecretSpaceSegmentDisplayText(lines[0]));
                for (let i = 0; i < lines.length; i++) {
                    appendSecretSpaceAiMessage(lines[i]);
                }
            } catch (e) {
                showSecretSpaceReplyError(e);
            } finally {
                if (shouldBarrage) hideSecretSpaceBarrage();
                try {
                    if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.setAiTyping === 'function') {
                        window.secretSpaceTimeline.setAiTyping(false);
                    }
                } catch (e1) { }
                coupleSpaceAiActivityInFlight = false;
                const pending = coupleSpaceAiActivityPending;
                coupleSpaceAiActivityPending = null;
                if (pending && pending.trigger) {
                    await triggerSecretSpaceAiReaction(pending.trigger, pending.payload);
                }
            }
        }

        function initSecretSpaceBatteryWatcher() {
            if (window.__coupleSpaceBatteryWatcherBound === true) return;
            window.__coupleSpaceBatteryWatcherBound = true;

            function checkBattery(source, rawLevel) {
                const link = getCoupleLinkState();
                if (!link || !link.hasCoupleLinked || !link.roleId) return;
                const roleId = String(link.roleId || '').trim();
                if (!roleId) return;
                const directLevel = normalizeUserBatteryLevel(rawLevel);
                const level = directLevel === null ? readCurrentUserBatteryLevel() : directLevel;
                refreshLowBatteryAlertState(roleId, level);
                if (level === null || level >= 30) return;
                if (!isSecretUsageTriggerEnabled('battery')) return;
                triggerSecretSpaceAiReaction('battery', {
                    level: level,
                    source: String(source || '').trim() || 'battery_watcher'
                });
            }

            const pw = getParentWindow();
            if (pw && typeof pw.addEventListener === 'function') {
                try {
                    pw.addEventListener('phone-battery-level-changed', function (e) {
                        const detail = e && e.detail && typeof e.detail === 'object' ? e.detail : {};
                        checkBattery('parent_event', detail.level);
                    });
                } catch (e) { }
            }
            try {
                window.addEventListener('qlkj-setting-changed', function (e) {
                    const detail = e && e.detail && typeof e.detail === 'object' ? e.detail : {};
                    if (String(detail.key || '') === SECRET_USAGE_SETTING_KEYS.battery || String(detail.key || '') === SECRET_USAGE_SETTING_KEYS.master) {
                        checkBattery('setting_changed');
                    }
                });
            } catch (e2) { }
            try {
                document.addEventListener('visibilitychange', function () {
                    if (!document.hidden) checkBattery('visibility');
                });
            } catch (e3) { }
            window.setTimeout(function () { checkBattery('init'); }, 600);
        }

        function initSecretSpaceAiActivityWatcher() {
            if (window.__coupleSpaceAiActivityWatcherBound === true) return;
            window.__coupleSpaceAiActivityWatcherBound = true;

            const pw = getParentWindow();
            if (pw && pw.__coupleSpaceGlobalAiWatcherStarted) return;

            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) return;
            const roleId = String(link.roleId || '').trim();
            if (!roleId) return;

            const initLogs = readActivityLogs();
            const lastLogTs = initLogs.length ? Number(initLogs[initLogs.length - 1].ts || 0) || 0 : 0;
            const st = readCoupleSpaceAiActivityState(roleId);
            if (!st.lastSeenTs && lastLogTs) {
                st.lastSeenTs = lastLogTs;
                writeCoupleSpaceAiActivityState(roleId, st);
            }

            window.addEventListener('storage', function (e) {
                if (!e || e.key !== ACTIVITY_LOG_STORAGE_KEY) return;
                const linkNow = getCoupleLinkState();
                if (!linkNow || !linkNow.hasCoupleLinked || !linkNow.roleId) return;
                const roleIdNow = String(linkNow.roleId || '').trim();
                if (!roleIdNow) return;

                const roleName = getRoleDisplayName();
                const monitorSettings = getSecretUsageMonitorSettings();
                const stateNow = readCoupleSpaceAiActivityState(roleIdNow);
                const logs = readActivityLogs();
                const fresh = logs.filter((it) => it && typeof it === 'object' && Number(it.ts || 0) > Number(stateNow.lastSeenTs || 0));
                if (!fresh.length) return;
                fresh.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));

                let localState = stateNow;
                for (let i = 0; i < fresh.length; i++) {
                    const it = fresh[i];
                    const ts = Number(it.ts || 0) || 0;
                    if (ts && ts > localState.lastSeenTs) localState.lastSeenTs = ts;

                    const kind = String(it.kind || '').trim();
                    const app = String(it.app || '').trim();
                    if (app === 'space' || kind === 'space_open') {
                        continue;
                    }

                    const sensitive = detectSensitiveActivity(it, roleName, monitorSettings);
                    if (sensitive) {
                        localState.normalCount = 0;
                        localState.buffer = [];
                        writeCoupleSpaceAiActivityState(roleIdNow, localState);
                        // 触发反应（修罗场开关检查在 triggerSecretSpaceAiReaction 函数内部处理）
                        if (sensitive.trigger === 'wechat_other') {
                            triggerSecretSpaceAiReaction('wechat_other', { peerName: sensitive.peerName || '' });
                        } else if (sensitive.trigger === 'wallet') {
                            triggerSecretSpaceAiReaction('wallet', {});
                        } else if (sensitive.trigger === 'period') {
                            triggerSecretSpaceAiReaction('period', {});
                        } else if (sensitive.trigger === 'music') {
                            triggerSecretSpaceAiReaction('music', {});
                        } else if (sensitive.trigger === 'battery') {
                            triggerSecretSpaceAiReaction('battery', { level: sensitive.level, source: 'activity_log' });
                        }
                        continue;
                    }

                    const text = String(it.text || '').trim();
                    if (!text) continue;

                    localState.normalCount = (Number(localState.normalCount || 0) || 0) + 1;
                    if (!Array.isArray(localState.buffer)) localState.buffer = [];
                    localState.buffer.push({ ts, text, kind, app });
                    if (localState.buffer.length > 30) localState.buffer = localState.buffer.slice(-30);

                    // if (localState.normalCount >= 10) {
                    //     const ops = localState.buffer.slice(-10);
                    //     localState.normalCount = 0;
                    //     localState.buffer = [];
                    //     writeCoupleSpaceAiActivityState(roleIdNow, localState);
                    //     triggerSecretSpaceAiReaction('normal_batch', { ops });
                    //     continue;
                    // }
                }

                writeCoupleSpaceAiActivityState(roleIdNow, localState);
            });
        }

        async function callRoleDiaryLLM(roleId, historyForApi, userPrompt, extraSystemPrompt, options) {
            const pw = getParentWindow();
            if (!pw || typeof pw.callAI !== 'function') throw new Error('AI 接口未初始化');
            const rid = String(roleId || '').trim();
            const opts = options && typeof options === 'object' ? options : {};
            const prevRole = pw.currentChatRole;
            pw.__offlineSyncInProgress = true;
            pw.currentChatRole = rid;
            try {
                const baseSystemPrompt = buildRoleSystemPrompt(rid);
                let mergedSystemPrompt = extraSystemPrompt
                    ? baseSystemPrompt + '\n\n' + String(extraSystemPrompt)
                    : baseSystemPrompt;
                if (extraSystemPrompt && typeof pw.buildRoleLitePrompt === 'function' && opts.useLitePrompt !== false) {
                    mergedSystemPrompt = pw.buildRoleLitePrompt('couple_space_secret_reaction', rid, {
                        history: Array.isArray(historyForApi) ? historyForApi : [],
                        includeContinuity: true,
                        maxSummaryLines: 12,
                        sceneIntro: '当前场景是情侣空间秘密互动中的即时角色反应。',
                        taskGuidance: String(extraSystemPrompt || '').trim(),
                        outputInstructions: String(opts.outputInstructions || '只输出简短自然的微信式中文消息，不要解释，不要输出 JSON、代码块或前缀。')
                    });
                } else if (!extraSystemPrompt && typeof pw.buildFullChatPrompt === 'function' && String(userPrompt || '').indexOf('心情日记') !== -1) {
                    mergedSystemPrompt = pw.buildFullChatPrompt('couple_space_diary', rid, {
                        outputMode: 'plain_json_task',
                        history: Array.isArray(historyForApi) ? historyForApi : [],
                        maxSummaryLines: 20,
                        extraCurrentContext: '当前场景是情侣空间应用中的角色心情日记生成。',
                        extraTaskRules: [
                            '这是秘密空间里的关系日记，不是发给用户的即时消息。',
                            '最近微信聊天摘要、关系进展和近期系统事件必须高优先级影响你的日记内容。',
                            '你只需要遵守用户消息里要求的 JSON 结构，不要输出主聊天协议字段。'
                        ].join('\n')
                    });
                }
                if (opts.useLitePrompt === false && opts.outputInstructions) {
                    mergedSystemPrompt += '\n\n【当前输出规则】\n' + String(opts.outputInstructions || '').trim();
                }
                const text = await new Promise((resolve, reject) => {
                    pw.callAI(
                        mergedSystemPrompt,
                        Array.isArray(historyForApi) ? historyForApi : [],
                        userPrompt,
                        (t) => resolve(t),
                        (err) => reject(new Error(String(err || '请求失败')))
                    );
                });
                return String(text || '');
            } finally {
                pw.__offlineSyncInProgress = false;
                pw.currentChatRole = prevRole;
            }
        }

        async function callCharacterDiaryCommentAPI(payload) {
            const scene = String(payload && payload.scene ? payload.scene : '').trim();
            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) {
                throw new Error('尚未绑定情侣角色');
            }
            const roleId = String(link.roleId || '').trim();
            if (!roleId) {
                throw new Error('尚未绑定情侣角色');
            }
            const historyForApi = [];
            const roleName = getRoleDisplayName();
            const diaryText = String(payload && payload.diaryText ? payload.diaryText : '').trim();
            const roleDiaryText = String(payload && payload.roleDiaryText ? payload.roleDiaryText : '').trim();
            const userComment = String(payload && payload.userComment ? payload.userComment : '').trim();
            const commentThread = String(payload && payload.commentThread ? payload.commentThread : '').trim();
            const diaryImages = Array.isArray(payload && payload.diaryImages ? payload.diaryImages : [])
                ? payload.diaryImages.filter(Boolean)
                : [];

            let userPrompt = '';

            if (scene === 'user_diary') {
                if (!diaryText) {
                    throw new Error('日记内容为空');
                }
                let imageText = '';
                if (diaryImages.length) {
                    imageText =
                        '\n\n日记图片：\n' +
                        diaryImages
                            .map((src, idx) => `图片${idx + 1}: ${String(src).slice(0, 200)}`)
                            .join('\n');
                }
                userPrompt =
                    '场景：你在情侣空间中阅读我今天写的一篇心情日记。\n' +
                    '请从恋人视角，用第一人称简短评论这篇日记，语气温柔自然，可以结合图片内容。\n' +
                    '回复时直接输出你的台词，不要加任何解释或前缀，长度不超过80字。\n\n' +
                    '我的日记内容：\n' +
                    diaryText +
                    imageText;
            } else if (scene === 'comment_on_role_diary') {
                if (!roleDiaryText || !userComment) {
                    throw new Error('评论内容缺失');
                }
                userPrompt =
                    '场景：我在情侣空间里给你留下了一条评论，回复的是你写的一篇日记。\n' +
                    '请根据你的人设和原始日记内容，用第一人称回复我的这条评论。\n' +
                    '回复时只输出你的台词，不要加前缀说明，长度不超过80字。\n\n' +
                    '你的原始日记：\n' +
                    roleDiaryText +
                    '\n\n' +
                    (commentThread
                        ? '这篇日记评论区目前的完整对话：\n' + commentThread + '\n\n'
                        : '') +
                    '我刚刚的最新评论：\n' +
                    userComment +
                    '\n\n' +
                    '请优先回应我这条最新评论，同时承接评论区前面的对话，不要像第一次评论一样重新开始。';
            } else {
                throw new Error('未知的评论场景');
            }

            const extraSystemPrompt =
                '你现在是' +
                roleName +
                '，这里是情侣空间里的心情日记评论场景，不是普通微信聊天窗口。请完全根据上面的人设、日记内容和评论内容，以第一人称和亲密恋人的语气回复对方的日记或评论，使用自然流畅的中文。回复时第一句要自然表现出你已经读完了这篇日记/评论。';

            const text = await callRoleDiaryLLM(roleId, historyForApi, userPrompt, extraSystemPrompt, {
                outputInstructions: '输出 3~6 行微信短句，每行一句，只输出台词，不要解释，不要前缀。'
            });
            return String(text || '');
        }

        function normalizeDiaryMoodByLabel(label) {
            const raw = String(label || '').trim();
            if (!raw) return null;
            const exact = getMoodOptionByLabel(raw);
            if (exact) return exact;

            const byId = getMoodOptionById(raw);
            if (byId) return byId;

            const compact = raw.replace(/[^\u4e00-\u9fa5a-zA-Z]+/g, '').trim();
            if (!compact) return null;

            const labels = MOOD_OPTIONS.map((m) => m.label).filter(Boolean);
            for (let i = 0; i < labels.length; i++) {
                const k = labels[i];
                if (compact.includes(k)) {
                    const hit = getMoodOptionByLabel(k);
                    if (hit) return hit;
                }
            }

            const aliasPairs = [
                ['开心', ['高兴', '快乐', '愉快', '开森', '喜悦']],
                ['兴奋', ['激动', '亢奋', '振奋', '热血']],
                ['心动', ['甜蜜', '心跳', '怦然', '喜欢', '爱', '浪漫']],
                ['平静', ['淡定', '安静', '宁静', '安心', '放松', '平和']],
                ['伤心', ['难过', '委屈', '失落', '沮丧', '心酸', '哭']],
                ['生气', ['愤怒', '恼火', '火大', '气死', '暴躁']],
                ['烦躁', ['烦', '焦躁', '焦虑', '不耐烦']],
                ['心累', ['累', '疲惫', '疲倦', '倦', '撑不住']],
            ];

            for (let i = 0; i < aliasPairs.length; i++) {
                const target = aliasPairs[i][0];
                const aliases = aliasPairs[i][1] || [];
                for (let j = 0; j < aliases.length; j++) {
                    const a = String(aliases[j] || '').trim();
                    if (!a) continue;
                    if (compact.includes(a)) {
                        const hit = getMoodOptionByLabel(target);
                        if (hit) return hit;
                    }
                }
            }

            return null;
        }

        async function upsertRoleDiaryEntryByLabel(roleId, dateKey, moodLabel, content, updatedAtTs) {
            const rid = String(roleId || '').trim();
            const dk = String(dateKey || '').trim();
            const text = normalizeCoupleSpaceDiaryContent(rid, content);
            if (!rid || !dk || !text) return false;
            let opt = normalizeDiaryMoodByLabel(moodLabel);
            if (!opt) {
                opt = normalizeDiaryMoodByLabel(text);
            }
            if (!opt) {
                opt = getMoodOptionByLabel('平静');
            }
            if (!opt) return false;
            const ts = Number(updatedAtTs);
            const finalTs = Number.isFinite(ts) && ts > 0 ? ts : Date.now();
            state.mood.roleEntries[dk] = {
                id: opt.id,
                mood: opt.id,
                label: opt.label,
                icon: opt.icon,
                text: text,
                content: text,
                images: [],
                date: dk,
                updatedAt: finalTs,
            };
            await saveRoleMoodState();
            return true;
        }

        async function generateTodayRoleDiaryEntry(roleId, historyForApi, shortTermMemory, nowTs) {
            roleDiarySyncInFlight = true;
            roleDiarySyncToastMessage = buildRoleDiaryGeneratingToastText();
            setGlobalCharacterReplying(true, roleDiarySyncToastMessage);
            const todayKey = toDateKey(new Date(nowTs));
            const diaryLanguageRule = buildCoupleSpaceDiaryLanguageRule(roleId);
            const diaryLengthRule = diaryLanguageRule ? '双语总字数尽量控制在 160 字以内。' : '字数严格控制在 100 字以内。';
            const todayChatContext = buildTodayChatMemoryContext(roleId, todayKey, 18);
            const todayTimingPrompt = todayChatContext.hasChat
                ? `今天的日期是 ${todayKey}。你今天和我有聊天记录，日记内容必须优先围绕今天的聊天、今天的情绪余温和当下关系状态展开。\n【今日聊天记录（带日期时间）】\n${todayChatContext.text}\n\n请把上面这些 ${todayKey} 的聊天当作今天刚发生的事情来参考，不要把更早之前的旧聊天伪装成今天发生。`
                : `今天的日期是 ${todayKey}。你今天没有和我聊天。\n今天这篇日记请更像你在记录自己的生活、状态、见闻或日常感受，不要硬提几天前的旧聊天，也不要把旧对话写成今天刚发生。`;
            const promptA =
                `你现在是我的伴侣，请根据你的人设，写一篇今天当下的【心情日记】。\n` +
                `${todayTimingPrompt}\n\n` +
                `【带日期的近期聊天参考】\n${shortTermMemory || '（暂无近期聊天记录）'}\n\n` +
                `写作要求：\n` +
                `如果今天有聊天，优先结合今天的聊天内容来选择一个符合当前情境的【心情词】；如果今天没有聊天，就根据你今天自己的生活状态来选择。\n` +
                `心情词必须和今天这一天的状态匹配，不能因为旧聊天记录而写偏时间线。\n` +
                `心情词只能从以下列表中选择一个：开心、兴奋、心动、平静、伤心、生气、烦躁、心累。\n` +
                `写一段日记，要符合你选择的心情。如果今天有聊天，可以自然提及今天聊了什么；如果今天没有聊天，就以分享自己生活为主，自然一点，必须符合人设！\n` +
                (diaryLanguageRule ? (diaryLanguageRule + '\n') : '') +
                (diaryLengthRule + '\n') +
                `必须输出 JSON 格式：{ "mood": "心情词", "content": "日记内容" }\n` +
                `输出要求：只输出 JSON，不要输出代码块，不要输出解释文字，不要输出任何多余字符。`;

            try {
                let text = await callRoleDiaryLLM(roleId, historyForApi, promptA);
                let obj = extractJsonObject(text);
                let mood = obj && typeof obj === 'object' && typeof obj.mood === 'string' ? obj.mood.trim() : '';
                let content = obj && typeof obj === 'object' && typeof obj.content === 'string' ? obj.content.trim() : '';
                if (!content && isDevModeUnlocked()) {
                    appendDevAiParseFailureLog({ scene: 'couple_space_diary_A', roleId: roleId, reason: 'parse_failed_or_empty_content', prompt: promptA, rawText: String(text || '') });
                    const retry = confirm('心情日记解析失败（未得到 JSON content）。是否重试一次？');
                    if (retry) {
                        text = await callRoleDiaryLLM(roleId, historyForApi, promptA + '\n再次强调：只输出 JSON。');
                        obj = extractJsonObject(text);
                        mood = obj && typeof obj === 'object' && typeof obj.mood === 'string' ? obj.mood.trim() : mood;
                        content = obj && typeof obj === 'object' && typeof obj.content === 'string' ? obj.content.trim() : '';
                        if (!content) {
                            appendDevAiParseFailureLog({ scene: 'couple_space_diary_A', roleId: roleId, reason: 'retry_parse_failed_or_empty_content', prompt: promptA, rawText: String(text || '') });
                        }
                    }
                }
                if (!content) {
                    content = normalizeAiReplyText(text);
                }
                if (!content) return false;
                await upsertRoleDiaryEntryByLabel(roleId, toDateKey(new Date(nowTs)), mood, content, nowTs);
                if (state.activeTab === 'mood') renderMoodPage();
                return true;
            } catch (e) {
                const pw = getParentWindow();
                const msg = e && e.message ? String(e.message) : String(e || '生成失败');
                if (pw && typeof pw.showCenterToast === 'function') pw.showCenterToast(msg);
                throw e;
            } finally {
                roleDiarySyncInFlight = false;
                roleDiarySyncToastMessage = '';
                setGlobalCharacterReplying(false, '');
            }
        }

        async function generateCatchupRoleDiaryEntries(roleId, historyForApi, shortTermMemory, rawDiffDays, nowTs) {
            const cap = Math.max(1, Math.min(7, rawDiffDays));
            const dateKeys = buildDateKeysForCatchUp(nowTs, cap);
            const diaryLanguageRule = buildCoupleSpaceDiaryLanguageRule(roleId);
            const diaryLengthRule = diaryLanguageRule ? '每篇日记的双语总字数尽量控制在 160 字以内。' : '每天的日记字数严格控制在 100 字以内，并选择一个【心情词】。';
            const chatStats = dateKeys.map((dk) => {
                return { date: dk, chatCount: countChatsForDate(roleId, dk) };
            });
            const todayKey = toDateKey(new Date(nowTs));
            const todayChatContext = buildTodayChatMemoryContext(roleId, todayKey, 18);
            const todayDiaryRule = todayChatContext.hasChat
                ? `今天（${todayKey}）和我有聊天记录，所以今天这篇日记必须优先围绕今天的聊天氛围、今天的互动感和今天的情绪变化来写。\n【今天聊天记录（带日期时间）】\n${todayChatContext.text}`
                : `今天（${todayKey}）没有和我聊天，所以今天这篇日记要更像你自己的生活分享或心情记录，不要硬提几天前的聊天，也不要把旧对话写成今天刚发生。`;

            const promptB =
                `你现在是我的伴侣，请根据你的人设，批量补写过去几天以及今天的【心情日记】。\n` +
                `当前情况： 我有 ${cap} 天没有回到『情侣空间』这个秘密基地了，现在终于回来了。\n` +
                `请严格参考以下这几天的微信互动状态： ${JSON.stringify(chatStats)}\n` +
                `${todayDiaryRule}\n\n` +
                `【带日期的近期聊天参考】\n${shortTermMemory || '（暂无近期聊天记录）'}\n\n` +
                `写作要求：\n\n` +
                `如果某天 chatCount > 0（我们在微信聊天了），日记要表现出聊天的日常感，不要说完全失联；如果 chatCount == 0，才可以表现出没收到消息的想念或孤独。\n` +
                `今天的日记，必须表达出看到我回到空间的喜悦。如果今天有聊天，优先结合今天的聊天内容；如果今天没有聊天，就以你自己的生活和状态为主，不要把旧聊天误写成今天发生。\n` +
                `所有日期都要遵守时间线，看到带日期的旧聊天时，不要把它们写成今天刚发生。\n` +
                (diaryLengthRule + '\n') +
                `心情词只能从以下列表中选择一个：开心、兴奋、心动、平静、伤心、生气、烦躁、心累。\n` +
                (diaryLanguageRule ? (diaryLanguageRule + '\n') : '') +
                `必须输出 JSON 格式的数组：\n` +
                `{ "diaries": [ { "date": "YYYY-MM-DD", "mood": "心情词", "content": "日记内容" } ] }\n` +
                `输出要求：只输出 JSON，不要输出代码块，不要输出解释文字，不要输出任何多余字符。`;

            roleDiarySyncInFlight = true;
            roleDiarySyncToastMessage = buildRoleDiaryGeneratingToastText();
            setGlobalCharacterReplying(true, roleDiarySyncToastMessage);
            try {
                let text = await callRoleDiaryLLM(roleId, historyForApi, promptB);
                let obj = extractJsonObject(text);
                let diaries = obj && typeof obj === 'object' && Array.isArray(obj.diaries) ? obj.diaries : [];
                if (!diaries.length && isDevModeUnlocked()) {
                    appendDevAiParseFailureLog({ scene: 'couple_space_diary_B', roleId: roleId, reason: 'parse_failed_or_empty_diaries', prompt: promptB, rawText: String(text || '') });
                    const retry = confirm('批量心情日记解析失败（未得到 diaries）。是否重试一次？');
                    if (retry) {
                        text = await callRoleDiaryLLM(roleId, historyForApi, promptB + '\n再次强调：只输出 JSON。');
                        obj = extractJsonObject(text);
                        diaries = obj && typeof obj === 'object' && Array.isArray(obj.diaries) ? obj.diaries : [];
                        if (!diaries.length) {
                            appendDevAiParseFailureLog({ scene: 'couple_space_diary_B', roleId: roleId, reason: 'retry_parse_failed_or_empty_diaries', prompt: promptB, rawText: String(text || '') });
                        }
                    }
                }
                if (!diaries.length) return false;

                for (let i = 0; i < diaries.length; i++) {
                    const item = diaries[i] && typeof diaries[i] === 'object' ? diaries[i] : null;
                    if (!item) continue;
                    const date = String(item.date || '').trim();
                    const mood = String(item.mood || '').trim();
                    const content = String(item.content || '').trim();
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
                    if (!content) continue;
                    const dt = new Date(`${date}T21:00:00`);
                    const ts = Number.isNaN(dt.getTime()) ? Date.now() : dt.getTime();
                    await upsertRoleDiaryEntryByLabel(roleId, date, mood, content, ts);
                }

                if (state.activeTab === 'mood') renderMoodPage();
                return true;
            } catch (e) {
                const pw = getParentWindow();
                const msg = e && e.message ? String(e.message) : String(e || '生成失败');
                if (pw && typeof pw.showCenterToast === 'function') pw.showCenterToast(msg);
                throw e;
            } finally {
                roleDiarySyncInFlight = false;
                roleDiarySyncToastMessage = '';
                setGlobalCharacterReplying(false, '');
            }
        }

        async function requestRoleDiaryForTodayFromCalendar() {
            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) {
                showCoupleSpaceInfo('尚未绑定情侣角色');
                return;
            }
            if (roleDiarySyncInFlight) {
                showCoupleSpaceInfo('角色正在写日记中，请稍候');
                return;
            }
            const roleId = String(link.roleId || '').trim();
            const todayKey = toDateKey(new Date());
            const existingTodayRoleEntry = normalizeMoodEntry(state.mood.roleEntries[todayKey]);
            const existingTodayRoleText = existingTodayRoleEntry
                ? String(existingTodayRoleEntry.text || existingTodayRoleEntry.content || '').trim()
                : '';
            if (existingTodayRoleText) {
                showCoupleSpaceInfo('今天的角色心情日记已经写过啦');
                return;
            }

            openRoleDiaryConfirmModal(async function () {
                try {
                    const history = readWechatChatHistory(roleId);
                    const clean = cleanChatHistoryForMemory(history);
                    const historyForApi = buildHistoryForApi(roleId, clean);
                    const memoryLimit = typeof window.getEffectiveChatMemoryLimit === 'function'
                        ? window.getEffectiveChatMemoryLimit(roleId)
                        : (parseInt(localStorage.getItem('chat_memory_limit'), 10) || 30);
                    const shortTermMemory = buildShortTermMemoryText(clean, memoryLimit);
                    await generateTodayRoleDiaryEntry(roleId, historyForApi, shortTermMemory, Date.now());
                } catch (err) {
                    showAiError(err);
                }
            });
        }

        async function maybeGenerateRoleDiariesOnEnter() {
            if (!isAutoRoleMoodDiaryEnabled()) return;
            const link = getCoupleLinkState();
            if (!link.hasCoupleLinked || !link.roleId) return;
            const roleId = String(link.roleId || '').trim();
            if (!roleId) return;

            const nowTs = Date.now();
            const lastExitTs = readLastExitTime(roleId);
            if (!lastExitTs || lastExitTs > nowTs) return;

            const todayKey = toDateKey(new Date(nowTs));
            const existingTodayRoleEntry = normalizeMoodEntry(state.mood.roleEntries[todayKey]);
            const existingTodayRoleText = existingTodayRoleEntry
                ? String(existingTodayRoleEntry.text || existingTodayRoleEntry.content || '').trim()
                : '';
            if (existingTodayRoleText) return;

            const lockNow = Date.now();
            try {
                const lockKey = buildCoupleSpaceRoleKey(COUPLE_SPACE_DIARY_SYNC_LOCK_KEY, roleId);
                const lockRaw =
                    (lockKey ? localStorage.getItem(lockKey) : '') ||
                    localStorage.getItem(COUPLE_SPACE_DIARY_SYNC_LOCK_KEY);
                const lock = lockRaw ? safeJsonParse(lockRaw, null) : null;
                if (lock && typeof lock === 'object' && String(lock.roleId || '') === roleId) {
                    const until = Number(lock.until);
                    if (Number.isFinite(until) && until > lockNow) return;
                }
                if (lockKey) {
                    localStorage.setItem(lockKey, JSON.stringify({ roleId, until: lockNow + 90 * 1000 }));
                    try { localStorage.removeItem(COUPLE_SPACE_DIARY_SYNC_LOCK_KEY); } catch (e2) { }
                } else {
                    localStorage.setItem(COUPLE_SPACE_DIARY_SYNC_LOCK_KEY, JSON.stringify({ roleId, until: lockNow + 90 * 1000 }));
                }
            } catch (e) { }

            const sameDay = isSameDay(new Date(lastExitTs), new Date(nowTs));
            const diffMs = nowTs - lastExitTs;
            const cross18 = crossedHourSameDay(lastExitTs, nowTs, 18);
            const triggerA = sameDay && (diffMs > 3 * 60 * 60 * 1000 || cross18);
            const rawDiffDays = !sameDay ? diffDaysInclusive(lastExitTs, nowTs) : 0;
            const triggerB = !sameDay && rawDiffDays > 0;

            if (!triggerA && !triggerB) return;

            const history = readWechatChatHistory(roleId);
            const clean = cleanChatHistoryForMemory(history);
            const historyForApi = buildHistoryForApi(roleId, clean);
            const memoryLimit = typeof window.getEffectiveChatMemoryLimit === 'function'
                ? window.getEffectiveChatMemoryLimit(roleId)
                : (parseInt(localStorage.getItem('chat_memory_limit'), 10) || 30);
            const shortTermMemory = buildShortTermMemoryText(clean, memoryLimit);

            if (triggerA) {
                await generateTodayRoleDiaryEntry(roleId, historyForApi, shortTermMemory, nowTs);
                return;
            }
            await generateCatchupRoleDiaryEntries(roleId, historyForApi, shortTermMemory, rawDiffDays, nowTs);
        }

        async function handleCoupleSpaceAppEnter(source) {
            const now = Date.now();
            if (coupleSpaceEnterTask) return coupleSpaceEnterTask;
            if (now - coupleSpaceLastEnterAt < 1200) return;
            coupleSpaceLastEnterAt = now;
            coupleSpaceAppVisible = true;
            coupleSpaceEnterTask = (async () => {
                if (roleDiarySyncInFlight && roleDiarySyncToastMessage) {
                    setGlobalCharacterReplying(true, roleDiarySyncToastMessage);
                }
                updateStatsUI();
                await refreshRoleMissCountOnAppEnter();
                await loadRoleMoodState();
                if (state.activeTab === 'mood') renderMoodPage();
                await maybeGenerateRoleDiariesOnEnter();
                return String(source || '').trim() || 'unknown';
            })();
            try {
                return await coupleSpaceEnterTask;
            } finally {
                coupleSpaceEnterTask = null;
            }
        }

        async function initAnniversary() {
            const savedIso = await readAnniversaryIso();
            const iso = savedIso || DEFAULT_ANNIVERSARY_ISO;
            const parsed = parseIsoDate(iso);
            if (parsed) anniversaryStartDate = parsed;
            updateAnniversaryUI();
        }

        function bindEvents() {
            const bgInput = document.getElementById('bg-input');
            if (bgInput && bgInput.dataset.bound !== '1') {
                bgInput.dataset.bound = '1';
                bgInput.addEventListener('change', (e) => handleFileSelect(e, 'header-bg-img', 'couple_bg'));
            }

            const avatarUserInput = document.getElementById('avatar-user-input');
            if (avatarUserInput && avatarUserInput.dataset.bound !== '1') {
                avatarUserInput.dataset.bound = '1';
                avatarUserInput.addEventListener('change', (e) => handleFileSelect(e, 'avatar-user', 'couple_avatar_user'));
            }

            const avatarRoleInput = document.getElementById('avatar-role-input');
            if (avatarRoleInput && avatarRoleInput.dataset.bound !== '1') {
                avatarRoleInput.dataset.bound = '1';
                avatarRoleInput.addEventListener('change', (e) => handleFileSelect(e, 'avatar-role', 'couple_avatar_role'));
            }

            const missBtn = document.getElementById('miss-btn');
            missBtn.addEventListener('click', handleMissClick);

            const annLabel = document.getElementById('anniversary-label');
            const annInput = document.getElementById('anniversary-input');
            if (annLabel && annInput) {
                annLabel.addEventListener('click', () => openAnniversaryPicker());
                annLabel.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openAnniversaryPicker();
                    }
                });
                annInput.addEventListener('change', async () => {
                    const iso = String(annInput.value || '').trim();
                    const parsed = parseIsoDate(iso);
                    if (!parsed) return;
                    anniversaryStartDate = parsed;
                    await persistAnniversaryIso(iso);
                    updateAnniversaryUI();
                });
            }

            document.querySelectorAll('.dock-item[data-tab]').forEach((el) => {
                el.addEventListener('click', () => {
                    const tab = el.getAttribute('data-tab');
                    setActiveTab(tab);
                });
            });
            const center = document.querySelector('.dock-item-center[data-tab]');
            if (center) {
                center.addEventListener('click', () => {
                    const tab = center.getAttribute('data-tab');
                    setActiveTab(tab);
                });
            }

            const heartBtn = document.querySelector('#heart-btn') || document.querySelector('.heart-button') || document.querySelector('.dock-item-center');
            const secretModal = document.getElementById('secret-space-modal');
            const secretSettingsPanel = document.getElementById('secret-space-settings');
            const secretMain = document.getElementById('secret-space-main');
            const secretFooter = secretModal ? secretModal.querySelector('.secret-space-footer') : null;
            const secretMoreBtn = secretModal ? secretModal.querySelector('[data-action="open-secret-settings"]') : null;
            const secretViewPeerBtn = document.querySelector('[data-action="view-peer-usage"]');
            const secretPeekPeerBtn = document.querySelector('[data-action="peek-peer-usage"]');
            let secretSettingsOpen = false;
            let secretPeerUsageLoading = false;

            function getSecretSettingsSwitchEls() {
                return {
                    master: document.getElementById('secret-usage-master-switch'),
                    wallet: document.getElementById('secret-usage-wallet-switch'),
                    music: document.getElementById('secret-usage-music-switch'),
                    period: document.getElementById('secret-usage-period-switch'),
                    battery: document.getElementById('secret-usage-battery-switch')
                };
            }

            function refreshSecretSpaceUiTexts() {
                const mode = window.secretSpaceTimeline && typeof window.secretSpaceTimeline.getViewMode === 'function'
                    ? window.secretSpaceTimeline.getViewMode()
                    : 'normal';
                if (secretViewPeerBtn) {
                    secretViewPeerBtn.textContent = mode === 'peer_usage' ? '返回秘密空间对话' : '查看他的使用记录';
                }
                if (secretPeekPeerBtn) {
                    const canPeek = mode === 'peer_usage';
                    secretPeekPeerBtn.hidden = !canPeek;
                    secretPeekPeerBtn.textContent = secretPeerUsageLoading ? '生成中...' : '查看他在干嘛';
                    secretPeekPeerBtn.disabled = !canPeek || secretPeerUsageLoading;
                }
            }

            function refreshSecretSettingsPanel() {
                const settings = getSecretUsageMonitorSettings();
                const els = getSecretSettingsSwitchEls();
                if (els.master) els.master.checked = settings.enabled;
                if (els.wallet) {
                    els.wallet.checked = settings.wallet;
                    els.wallet.disabled = !settings.enabled;
                }
                if (els.music) {
                    els.music.checked = settings.music;
                    els.music.disabled = !settings.enabled;
                }
                if (els.period) {
                    els.period.checked = settings.period;
                    els.period.disabled = !settings.enabled;
                }
                if (els.battery) {
                    els.battery.checked = settings.battery;
                    els.battery.disabled = !settings.enabled;
                }
                refreshSecretSpaceUiTexts();
            }

            function setSecretSettingsOpen(isOpen) {
                secretSettingsOpen = !!isOpen;
                if (secretSettingsPanel) secretSettingsPanel.hidden = !secretSettingsOpen;
                if (secretMain) secretMain.hidden = secretSettingsOpen;
                if (secretFooter) secretFooter.hidden = secretSettingsOpen;
                if (secretMoreBtn) secretMoreBtn.style.visibility = secretSettingsOpen ? 'hidden' : 'visible';
                if (secretSettingsOpen) refreshSecretSettingsPanel();
            }

            async function handlePeekPeerUsageGenerate() {
                if (secretPeerUsageLoading) return;
                secretPeerUsageLoading = true;
                refreshSecretSpaceUiTexts();
                try {
                    const logs = await generateSecretPeerUsageRecords();
                    if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.writePeerActivityLogs === 'function') {
                        window.secretSpaceTimeline.writePeerActivityLogs(logs);
                    }
                    if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.clearPeerUsageChatHistory === 'function') {
                        window.secretSpaceTimeline.clearPeerUsageChatHistory();
                    }
                    if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.setViewMode === 'function') {
                        window.secretSpaceTimeline.setViewMode('peer_usage');
                    }
                    refreshSecretSpaceUiTexts();
                } catch (e) {
                    showSecretSpaceReplyError(e);
                } finally {
                    secretPeerUsageLoading = false;
                    refreshSecretSpaceUiTexts();
                }
            }

            function openSecretSpace() {
                if (!secretModal) return;
                secretModal.hidden = false;
                setSecretSettingsOpen(false);
                requestAnimationFrame(() => {
                    secretModal.classList.add('is-open');
                });
                try {
                    if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.bindInputEvents === 'function') {
                        window.secretSpaceTimeline.bindInputEvents();
                    }
                    if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.loadForageCache === 'function') {
                        window.secretSpaceTimeline.loadForageCache().then(() => {
                            try {
                                if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.render === 'function') {
                                    window.secretSpaceTimeline.render();
                                }
                            } catch (e2) { }
                        });
                    }
                    if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.render === 'function') {
                        window.secretSpaceTimeline.render();
                    }
                } catch (e) { }
                refreshSecretSettingsPanel();
                window.setTimeout(() => {
                    const input = document.getElementById('secret-space-input');
                    if (input && typeof input.focus === 'function') input.focus();
                }, 260);
            }
            window.openCoupleSecretSpace = openSecretSpace;

            function closeSecretSpace() {
                if (!secretModal || secretModal.hidden) return;
                setSecretSettingsOpen(false);
                secretModal.classList.remove('is-open');
                window.setTimeout(() => {
                    secretModal.hidden = true;
                }, 260);
            }

            if (heartBtn) {
                heartBtn.addEventListener('click', () => {
                    openSecretSpace();
                });
            }

            if (secretModal) {
                secretModal.addEventListener('click', (e) => {
                    const openSecretSettingBtn = e.target && e.target.closest ? e.target.closest('[data-action="open-secret-settings"]') : null;
                    if (openSecretSettingBtn) {
                        setSecretSettingsOpen(true);
                        return;
                    }
                    const closeSecretSettingBtn = e.target && e.target.closest ? e.target.closest('[data-action="close-secret-settings"]') : null;
                    if (closeSecretSettingBtn) {
                        setSecretSettingsOpen(false);
                        return;
                    }
                    const viewPeerBtn = e.target && e.target.closest ? e.target.closest('[data-action="view-peer-usage"]') : null;
                    if (viewPeerBtn) {
                        const modeNow = window.secretSpaceTimeline && typeof window.secretSpaceTimeline.getViewMode === 'function'
                            ? window.secretSpaceTimeline.getViewMode()
                            : 'normal';
                        const nextMode = modeNow === 'peer_usage' ? 'normal' : 'peer_usage';
                        if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.setViewMode === 'function') {
                            window.secretSpaceTimeline.setViewMode(nextMode);
                        }
                        setSecretSettingsOpen(false);
                        refreshSecretSpaceUiTexts();
                        return;
                    }
                    const peekPeerBtn = e.target && e.target.closest ? e.target.closest('[data-action="peek-peer-usage"]') : null;
                    if (peekPeerBtn) {
                        handlePeekPeerUsageGenerate();
                        return;
                    }
                    const closeBtn = e.target && e.target.closest ? e.target.closest('[data-action="close-secret"]') : null;
                    if (closeBtn) {
                        if (secretSettingsOpen) {
                            setSecretSettingsOpen(false);
                            return;
                        }
                        closeSecretSpace();
                        return;
                    }
                    const sendBtn = e.target && e.target.closest ? e.target.closest('[data-action="send-secret"]') : null;
                    if (sendBtn) {
                        const input = document.getElementById('secret-space-input');
                        if (!input) return;
                        const modeNow = window.secretSpaceTimeline && typeof window.secretSpaceTimeline.getViewMode === 'function'
                            ? window.secretSpaceTimeline.getViewMode()
                            : 'normal';
                        if (modeNow === 'peer_usage') {
                            if (secretPeerUsageChatInFlight) return;
                            const text = String(input.value || '').trim();
                            if (!text) return;
                            input.value = '';
                            triggerSecretPeerUsageDialogue(text);
                            refreshSecretSpaceUiTexts();
                            return;
                        }
                        if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.sendMessage === 'function') {
                            const ok = window.secretSpaceTimeline.sendMessage(input.value);
                            if (ok) input.value = '';
                        }
                        refreshSecretSpaceUiTexts();
                        return;
                    }
                    const recvBtn = e.target && e.target.closest ? e.target.closest('[data-action="receive-secret"]') : null;
                    if (recvBtn) {
                        if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.setViewMode === 'function') {
                            window.secretSpaceTimeline.setViewMode('normal');
                        }
                        const input = document.getElementById('secret-space-input');
                        if (input && typeof input.focus === 'function') input.focus();
                        triggerSecretSpaceAiReaction('secret_heart', { source: 'heart_button' });
                        refreshSecretSpaceUiTexts();
                        return;
                    }
                });
                if (secretModal.dataset.secretUsageSwitchBound !== '1') {
                    secretModal.dataset.secretUsageSwitchBound = '1';
                    secretModal.addEventListener('change', (e) => {
                        const target = e && e.target ? e.target : null;
                        if (!target || target.tagName !== 'INPUT') return;
                        const id = String(target.id || '').trim();
                        if (!id) return;
                        if (id === 'secret-usage-master-switch') {
                            saveSecretUsageMonitorSettings({ enabled: !!target.checked });
                            refreshSecretSettingsPanel();
                            return;
                        }
                        if (id === 'secret-usage-wallet-switch') {
                            saveSecretUsageMonitorSettings({ wallet: !!target.checked });
                            refreshSecretSettingsPanel();
                            return;
                        }
                        if (id === 'secret-usage-music-switch') {
                            saveSecretUsageMonitorSettings({ music: !!target.checked });
                            refreshSecretSettingsPanel();
                            return;
                        }
                        if (id === 'secret-usage-period-switch') {
                            saveSecretUsageMonitorSettings({ period: !!target.checked });
                            refreshSecretSettingsPanel();
                            return;
                        }
                        if (id === 'secret-usage-battery-switch') {
                            saveSecretUsageMonitorSettings({ battery: !!target.checked });
                            refreshSecretSettingsPanel();
                        }
                    });
                }
            }

            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape') return;
                closeSecretSpace();
            });

            const moodCalendar = document.getElementById('mood-calendar');
            moodCalendar.addEventListener('click', (e) => {
                const toggle = e.target.closest('[data-action="toggle-view"]');
                if (toggle) {
                    e.stopPropagation();
                    state.mood.isGridView = !state.mood.isGridView;
                    renderMoodPage();
                    return;
                }
                const promptRoleDiaryBtn = e.target.closest('[data-action="prompt-role-diary"]');
                if (promptRoleDiaryBtn) {
                    e.stopPropagation();
                    requestRoleDiaryForTodayFromCalendar();
                    return;
                }
                const navArrow = e.target.closest('[data-action="week-prev"], [data-action="week-next"], [data-action="month-prev"], [data-action="month-next"]');
                if (navArrow) {
                    e.stopPropagation();
                    const act = String(navArrow.getAttribute('data-action') || '').trim();
                    const selected = dateFromKey(state.mood.selectedDateKey);
                    if (act === 'week-prev') {
                        const newDate = addDays(selected, -7);
                        state.mood.selectedDateKey = toDateKey(newDate);
                        renderMoodPage();
                        return;
                    }
                    if (act === 'week-next') {
                        const newDate = addDays(selected, 7);
                        state.mood.selectedDateKey = toDateKey(newDate);
                        renderMoodPage();
                        return;
                    }
                    if (act === 'month-prev' || act === 'month-next') {
                        const delta = act === 'month-prev' ? -1 : 1;
                        const year = selected.getFullYear();
                        const month = selected.getMonth() + delta;
                        const newDate = new Date(year, month, 1);
                        state.mood.selectedDateKey = toDateKey(newDate);
                        renderMoodPage();
                        return;
                    }
                }
                const openBtn = e.target.closest('[data-action="open-mood"]');
                if (openBtn) {
                    e.stopPropagation();
                    const dateKey = openBtn.getAttribute('data-date-key');
                    const existingEntry = normalizeMoodEntry(state.mood.entries[dateKey]);
                    if (existingEntry) {
                        const pw = getParentWindow();
                        const msg = '这一天已经写过心情日记啦';
                        if (pw && typeof pw.showCenterToast === 'function') {
                            pw.showCenterToast(msg);
                        } else if (pw && pw.GlobalModal && typeof pw.GlobalModal.showInfo === 'function') {
                            pw.GlobalModal.showInfo(msg);
                        } else {
                            alert(msg);
                        }
                        return;
                    }
                    if (isFutureDateKey(dateKey)) {
                        alert('暂不支持未来心情的记录');
                        return;
                    }
                    openMoodModal(dateKey);
                    return;
                }
                const day = e.target.closest('.mood-day');
                if (day && day.getAttribute('data-date-key')) {
                    const dateKey = day.getAttribute('data-date-key');
                    if (state.mood.isGridView) {
                        handleMonthGridDayClick(dateKey);
                        return;
                    }
                    state.mood.selectedDateKey = dateKey;
                    renderMoodPage();
                }
            });

            const mask = document.getElementById('mood-modal-mask');
            mask.addEventListener('click', () => closeMoodModal());

            const coupleMask = document.getElementById('couple-menu-mask');
            if (coupleMask) {
                coupleMask.addEventListener('click', function () {
                    closeCoupleMoreMenu();
                });
            }
            const coupleContent = document.getElementById('couple-menu-content');
            if (coupleContent) {
                coupleContent.addEventListener('click', async function (e) {
                    const btn = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
                    if (!btn) return;
                    const act = String(btn.getAttribute('data-action') || '');
                    if (act === 'close') {
                        closeCoupleMoreMenu();
                        return;
                    }
                    if (act === 'unlink') {
                        coupleMenuState.step = 'confirmClear';
                        renderCoupleMenuModal();
                        return;
                    }
                    if (act === 'confirm-clear') {
                        coupleMenuState.step = 'notify';
                        renderCoupleMenuModal();
                        return;
                    }
                    if (act === 'unlink-notify') {
                        closeCoupleMoreMenu();
                        await unlinkCoupleSpace(true);
                        goBack();
                        return;
                    }
                    if (act === 'unlink-no-notify') {
                        closeCoupleMoreMenu();
                        await unlinkCoupleSpace(false);
                        goBack();
                        return;
                    }
                });
            }

            document.getElementById('mood-modal-content').addEventListener('click', (e) => {
                const imageBtn = e.target.closest('[data-action="open-image-picker"]');
                if (imageBtn) {
                    const input = document.getElementById('diary-image-input');
                    if (input) input.click();
                    return;
                }
                const pickBtn = e.target.closest('[data-action="pick-mood"]');
                if (pickBtn) {
                    const id = pickBtn.getAttribute('data-id');
                    const label = pickBtn.getAttribute('data-label');
                    const icon = pickBtn.getAttribute('data-icon');
                    state.mood.pickedMood = { id, label, icon };
                    state.mood.modalStep = 'diary';
                    renderMoodModal();
                    return;
                }
                const saveBtn = e.target.closest('[data-action="save-diary"]');
                if (saveBtn) {
                    saveDiaryEntry();
                }
            });

            const diaryNoteContainer = document.getElementById('diary-note-container');
            if (diaryNoteContainer) {
                diaryNoteContainer.addEventListener('click', handleDiaryNoteContainerClick);
                diaryNoteContainer.addEventListener('keydown', handleDiaryCommentKeydown);
                diaryNoteContainer.addEventListener('touchstart', startDiaryNoteLongPress, { passive: true });
                diaryNoteContainer.addEventListener('touchend', cancelDiaryNoteLongPress, { passive: true });
                diaryNoteContainer.addEventListener('touchcancel', cancelDiaryNoteLongPress, { passive: true });
                diaryNoteContainer.addEventListener('touchmove', cancelDiaryNoteLongPress, { passive: true });
                diaryNoteContainer.addEventListener('mousedown', (e) => {
                    if (e && e.button !== 0) return;
                    startDiaryNoteLongPress(e);
                });
                diaryNoteContainer.addEventListener('mouseup', cancelDiaryNoteLongPress);
                diaryNoteContainer.addEventListener('mouseleave', cancelDiaryNoteLongPress);
            }

            document.addEventListener('input', (e) => {
                if (e.target && e.target.id === 'diary-textarea') {
                    state.mood.diaryDraft = e.target.value;
                    updateDiarySaveButtonState();
                }
            });

            const diaryImageInput = document.getElementById('diary-image-input');
            if (diaryImageInput) {
                diaryImageInput.addEventListener('change', handleDiaryImagesSelected);
            }

            const diaryEditMask = document.getElementById('diary-edit-mask');
            if (diaryEditMask) {
                diaryEditMask.addEventListener('click', () => {
                    closeDiaryEditConfirmModal();
                });
            }
            const diaryEditModal = document.getElementById('diary-edit-modal');
            if (diaryEditModal) {
                diaryEditModal.addEventListener('click', (e) => {
                    const btn = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
                    if (!btn) return;
                    const act = String(btn.getAttribute('data-action') || '');
                    if (act === 'cancel-edit-diary') {
                        closeDiaryEditConfirmModal();
                        return;
                    }
                    if (act === 'confirm-edit-diary') {
                        const key = String(diaryEditPendingDateKey || '').trim();
                        closeDiaryEditConfirmModal();
                        if (key) {
                            enterDiaryEditModeForDate(key);
                        }
                    }
                });
            }
        }

        async function handleMissClick(e) {
            state.missCountUser++;
            updateStatsUI();
            await syncRoleMissCountAfterUserClick();
            await saveState();
            
            const btn = document.getElementById('miss-btn');
            const ripple = document.createElement('div');
            ripple.classList.add('ripple');
            btn.appendChild(ripple);
            setTimeout(() => { ripple.remove(); }, 600);
            if (navigator.vibrate) navigator.vibrate(50);
        }

        async function loadState() {
            const todayStr = new Date().toDateString();
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            const saved = await coupleSpaceGetRoleItem('couple_space_data', rid);

            let parsed = null;
            if (saved && typeof saved === 'object') {
                parsed = saved;
            } else if (typeof saved === 'string' && saved) {
                parsed = safeJsonParse(saved, null);
            }

            if (parsed && typeof parsed === 'object') {
                if (String(parsed.date || '') === todayStr) {
                    const n = Number(parsed.count);
                    state.missCountUser = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
                    const roleN = Number(parsed.roleCount);
                    state.missCountRole = Number.isFinite(roleN) && roleN >= 0 ? Math.floor(roleN) : 0;
                    const roleTargetN = Number(parsed.roleCountTarget);
                    roleMissCountTarget = Number.isFinite(roleTargetN) && roleTargetN >= 0
                        ? Math.floor(roleTargetN)
                        : state.missCountRole;
                } else {
                    state.missCountUser = 0;
                    state.missCountRole = 0;
                    roleMissCountTarget = 0;
                }
            }

            updateStatsUI();

            await loadImage('couple_bg', 'header-bg-img');
            await loadImage('couple_avatar_user', 'avatar-user');
            await loadImage('couple_avatar_role', 'avatar-role');
        }

        async function saveState() {
            const todayStr = new Date().toDateString();
            const dataToSave = {
                date: todayStr,
                count: state.missCountUser,
                roleCount: Math.max(0, Math.floor(Number(state.missCountRole || 0))),
                roleCountTarget: Math.max(0, Math.floor(Number(roleMissCountTarget || state.missCountRole || 0))),
            };
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            await coupleSpaceSetRoleItem('couple_space_data', rid, dataToSave);
        }

        function updateStatsUI() {
            const userName = getCoupleSpaceUserName();
            const roleName = getRoleDisplayName();
            const userPrefix = document.getElementById('miss-user-prefix');
            const rolePrefix = document.getElementById('miss-role-prefix');
            const userCountEl = document.getElementById('miss-count-user');
            const roleCountEl = document.getElementById('miss-count-role');
            if (userPrefix) userPrefix.innerText = '今天' + userName + '想' + roleName;
            if (rolePrefix) rolePrefix.innerText = roleName + '想' + userName;
            if (userCountEl) userCountEl.innerText = state.missCountUser;
            if (roleCountEl) roleCountEl.innerText = state.missCountRole;
        }

        function setActiveTab(tab) {
            state.activeTab = tab || 'home';
            render();
        }

        function readInitialActiveTab() {
            const allowed = new Set(['home', 'mood', 'record', 'letter']);
            let tab = '';
            try {
                const params = new URLSearchParams(window.location.search || '');
                tab = String(params.get('tab') || '').trim();
            } catch (e) { }
            if (!tab) {
                try {
                    tab = String(window.location.hash || '').replace(/^#/, '').trim();
                } catch (e2) { }
            }
            return allowed.has(tab) ? tab : '';
        }

        function render() {
            renderDock();
            renderPages();
            if (state.activeTab === 'mood') {
                renderMoodPage();
            }
        }

        function renderDock() {
            document.querySelectorAll('.dock-item[data-tab]').forEach((el) => {
                el.classList.toggle('active', el.getAttribute('data-tab') === state.activeTab);
            });
        }

        function renderPages() {
            document.querySelectorAll('.page[data-page]').forEach((page) => {
                page.hidden = page.getAttribute('data-page') !== state.activeTab;
            });
        }

        function toDateKey(date) {
            const d = new Date(date);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }

        function dateFromKey(key) {
            const safe = String(key || '').trim();
            return new Date(`${safe}T00:00:00`);
        }

        function startOfToday() {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            return d;
        }

        function isSameDay(a, b) {
            return (
                a &&
                b &&
                a.getFullYear() === b.getFullYear() &&
                a.getMonth() === b.getMonth() &&
                a.getDate() === b.getDate()
            );
        }

        function isFutureDateKey(key) {
            const d = dateFromKey(key);
            const today = startOfToday();
            return d.getTime() > today.getTime();
        }

        function parseIsoDate(iso) {
            const safe = String(iso || '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(safe)) return null;
            const d = new Date(`${safe}T00:00:00`);
            if (Number.isNaN(d.getTime())) return null;
            return d;
        }

        async function readAnniversaryIso() {
            try {
                const link = getCoupleLinkState();
                const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
                const raw = await coupleSpaceGetRoleItem(ANNIVERSARY_STORAGE_KEY, rid);
                const safe = String(raw || '').trim();
                if (!safe) return '';
                return safe;
            } catch (e) {
                return '';
            }
        }

        async function persistAnniversaryIso(iso) {
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            await coupleSpaceSetRoleItem(ANNIVERSARY_STORAGE_KEY, rid, String(iso || '').trim());
        }

        function formatAnniversaryDot(date) {
            const d = new Date(date);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}.${m}.${day}`;
        }

        function computeDaysTogether(startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const today = startOfToday();
            const diff = today.getTime() - start.getTime();
            if (diff < 0) return 0;
            const dayMs = 1000 * 60 * 60 * 24;
            return Math.floor(diff / dayMs) + 1;
        }

        function updateAnniversaryUI() {
            const daysEl = document.getElementById('days-count');
            if (daysEl) daysEl.innerText = String(computeDaysTogether(anniversaryStartDate));

            const labelEl = document.getElementById('anniversary-label');
            if (labelEl) labelEl.innerText = `${formatAnniversaryDot(anniversaryStartDate)} 相遇`;

            const inputEl = document.getElementById('anniversary-input');
            if (inputEl) inputEl.value = toDateKey(anniversaryStartDate);
        }

        function openAnniversaryPicker() {
            const inputEl = document.getElementById('anniversary-input');
            if (!inputEl) return;
            inputEl.value = toDateKey(anniversaryStartDate);
            if (typeof inputEl.showPicker === 'function') {
                try {
                    inputEl.showPicker();
                    return;
                } catch (e) { }
            }
            inputEl.click();
        }

        function startOfWeek(date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const delta = d.getDay();
            d.setDate(d.getDate() - delta);
            return d;
        }

        function addDays(date, amount) {
            const d = new Date(date);
            d.setDate(d.getDate() + amount);
            return d;
        }

        function formatMonthDot(date) {
            const months = [
                'January',
                'February',
                'March',
                'April',
                'May',
                'June',
                'July',
                'August',
                'September',
                'October',
                'November',
                'December',
            ];
            return `${months[date.getMonth()]}.`;
        }

        function escapeHtml(str) {
            return String(str)
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#039;');
        }

        function handleBrokenMoodImage(imgEl, fallbackText) {
            if (!imgEl) return;
            const parent = imgEl.parentElement;
            if (!parent) return;
            imgEl.remove();
            const span = document.createElement('span');
            span.textContent = fallbackText || '+';
            parent.appendChild(span);
        }

        function updateDiarySaveButtonState() {
            const btn = document.querySelector('#mood-modal-content [data-action="save-diary"]');
            if (!btn) return;
            btn.disabled = String(state.mood.diaryDraft || '').trim().length === 0;
        }

        function handleDiaryImagesSelected(event) {
            const input = event.target;
            const files = Array.from(input.files || []);
            if (!files.length) return;
            const maxTotal = 9;
            if (!Array.isArray(state.mood.diaryImagesDraft)) {
                state.mood.diaryImagesDraft = [];
            }
            const remain = maxTotal - state.mood.diaryImagesDraft.length;
            if (remain <= 0) {
                input.value = '';
                return;
            }
            const slice = files.slice(0, remain);
            slice.forEach((file) => {
                if (!file || !file.type || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = function (e) {
                    const result = e.target && e.target.result ? String(e.target.result) : '';
                    if (!result) return;
                    if (!Array.isArray(state.mood.diaryImagesDraft)) {
                        state.mood.diaryImagesDraft = [];
                    }
                    if (state.mood.diaryImagesDraft.length >= maxTotal) return;
                    state.mood.diaryImagesDraft.push(result);
                };
                reader.readAsDataURL(file);
            });
            input.value = '';
        }

        function getMoodOptionById(id) {
            return MOOD_OPTIONS.find((m) => m.id === id) || null;
        }

        function getMoodOptionByLabel(label) {
            return MOOD_OPTIONS.find((m) => m.label === label) || null;
        }

        function normalizeMoodEntry(entry) {
            if (!entry || typeof entry !== 'object') return null;
            const next = { ...entry };

            if (!next.id && typeof next.mood === 'string' && next.mood) {
                next.id = next.mood;
            }

            if (!next.text && typeof next.content === 'string') {
                next.text = next.content;
            }
            if (!next.content && typeof next.text === 'string') {
                next.content = next.text;
            }

            if (next.id) {
                const opt = getMoodOptionById(next.id);
                if (opt) {
                    next.label = next.label || opt.label;
                    next.icon = next.icon || opt.icon;
                }
                if (!next.mood) {
                    next.mood = next.id;
                }
            } else if (next.label) {
                const opt = getMoodOptionByLabel(next.label);
                if (opt) {
                    next.id = opt.id;
                    next.icon = opt.icon;
                    next.label = opt.label;
                    if (!next.mood) {
                        next.mood = opt.id;
                    }
                }
            }

            if (!Array.isArray(next.images)) {
                next.images = [];
            }

            if (!Array.isArray(next.comments)) {
                next.comments = [];
            }

            return next;
        }

        function formatTime(ts) {
            const d = new Date(ts || Date.now());
            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }

        async function loadMoodState() {
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            const saved = await coupleSpaceGetRoleItem(MOOD_STORAGE_KEY, rid);
            if (!saved) return;
            try {
                const parsed = typeof saved === 'string' ? safeJsonParse(saved, null) : saved;
                if (parsed && typeof parsed === 'object') {
                    const rawEntries = parsed.entries || {};
                    const normalized = {};
                    Object.keys(rawEntries).forEach((key) => {
                        const next = normalizeMoodEntry(rawEntries[key]);
                        if (next) {
                            if (!next.date) next.date = key;
                            if (Array.isArray(next.images) && next.images.length > 9) {
                                next.images = next.images.slice(0, 9);
                            }
                            normalized[key] = next;
                        }
                    });
                    state.mood.entries = normalized;
                }
            } catch (e) { }
        }

        async function saveMoodState() {
            const payload = { entries: state.mood.entries };
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            await coupleSpaceSetRoleItem(MOOD_STORAGE_KEY, rid, payload);
        }

        async function loadRoleMoodState() {
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            if (!rid) return;
            const nsKey = buildCoupleSpaceRoleKey(ROLE_MOOD_STORAGE_KEY, rid);
            let saved = await coupleSpaceGetItem(nsKey);
            if (!saved) {
                const legacy = await coupleSpaceGetItem(ROLE_MOOD_STORAGE_KEY);
                if (legacy) {
                    const parsedLegacy = typeof legacy === 'string' ? safeJsonParse(legacy, null) : legacy;
                    const extracted = { entries: {} };
                    if (parsedLegacy && typeof parsedLegacy === 'object' && parsedLegacy.entries && typeof parsedLegacy.entries === 'object') {
                        Object.keys(parsedLegacy.entries).forEach((key) => {
                            let raw = parsedLegacy.entries[key];
                            if (raw && typeof raw === 'object' && raw[rid] && typeof raw[rid] === 'object') raw = raw[rid];
                            if (raw && typeof raw === 'object') extracted.entries[key] = raw;
                        });
                    }
                    if (Object.keys(extracted.entries).length) {
                        await coupleSpaceSetItem(nsKey, extracted);
                        saved = extracted;
                    }
                }
            }
            if (!saved) {
                try {
                    const wf = getWechatForage();
                    if (wf && typeof wf.getItem === 'function') {
                        const val = await wf.getItem(nsKey);
                        let toStore = val;
                        if (typeof val === 'string') {
                            const parsed = safeJsonParse(val, null);
                            if (parsed && typeof parsed === 'object') toStore = parsed;
                        }
                        if (toStore && typeof toStore === 'object') {
                            await coupleSpaceSetItem(nsKey, toStore);
                            saved = toStore;
                        }
                    }
                } catch (e0) { }
            }
            if (!saved) return;
            try {
                const parsed = typeof saved === 'string' ? safeJsonParse(saved, null) : saved;
                if (parsed && typeof parsed === 'object') {
                    const rawEntries =
                        parsed.entries && typeof parsed.entries === 'object'
                            ? parsed.entries
                            : Object.keys(parsed).some((k) => /^\d{4}-\d{2}-\d{2}$/.test(String(k)))
                                ? parsed
                                : {};
                    const normalized = {};
                    const cleanedRawEntries = {};
                    let needsRewrite = !(parsed.entries && typeof parsed.entries === 'object');
                    Object.keys(rawEntries).forEach((key) => {
                        let raw = rawEntries[key];
                        if (raw && typeof raw === 'object') {
                            const hasShape =
                                typeof raw.label === 'string' ||
                                typeof raw.id === 'string' ||
                                typeof raw.mood === 'string' ||
                                typeof raw.text === 'string' ||
                                typeof raw.content === 'string';
                            if (!hasShape && raw[rid] && typeof raw[rid] === 'object') {
                                raw = raw[rid];
                                needsRewrite = true;
                            }
                        }
                        if (raw && typeof raw === 'object') cleanedRawEntries[key] = raw;
                        const next = normalizeMoodEntry(raw);
                        if (next) {
                            if (!next.date) next.date = key;
                            if (Array.isArray(next.images) && next.images.length > 9) {
                                next.images = next.images.slice(0, 9);
                            }
                            normalized[key] = next;
                        }
                    });
                    state.mood.roleEntries = normalized;
                    if (needsRewrite) {
                        try {
                            await coupleSpaceSetItem(nsKey, { entries: cleanedRawEntries });
                        } catch (e2) { }
                    }
                }
            } catch (e) { }
        }

        async function saveRoleMoodState() {
            const payload = { entries: state.mood.roleEntries };
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            if (!rid) return;
            const nsKey = buildCoupleSpaceRoleKey(ROLE_MOOD_STORAGE_KEY, rid);
            await coupleSpaceSetItem(nsKey, payload);
        }

        window.__debugCoupleSpaceRoleDiaryStore = async function () {
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            const nsKey = buildCoupleSpaceRoleKey(ROLE_MOOD_STORAGE_KEY, rid);
            const out = { rid, nsKey, coupleSpace: {}, wechat: {} };
            try {
                out.coupleSpace.localStorage = localStorage.getItem(nsKey);
            } catch (e0) {
                out.coupleSpace.localStorage = null;
            }
            try {
                const forage = getCoupleSpaceForage();
                out.coupleSpace.hasForage = !!forage;
                out.coupleSpace.forageValue = forage ? await forage.getItem(nsKey) : null;
            } catch (e1) {
                out.coupleSpace.hasForage = false;
                out.coupleSpace.forageValue = null;
            }
            try {
                const wf = getWechatForage();
                out.wechat.hasForage = !!wf;
                out.wechat.forageValue = wf ? await wf.getItem(nsKey) : null;
            } catch (e2) {
                out.wechat.hasForage = false;
                out.wechat.forageValue = null;
            }
            try {
                const raw = out.coupleSpace.localStorage || out.coupleSpace.forageValue;
                const parsed = typeof raw === 'string' ? safeJsonParse(raw, null) : raw;
                const entries =
                    parsed && typeof parsed === 'object'
                        ? (parsed.entries && typeof parsed.entries === 'object'
                            ? parsed.entries
                            : parsed)
                        : {};
                out.summary = {
                    entryDates: Object.keys(entries || {}).slice(0, 50),
                    entryCount: Object.keys(entries || {}).length,
                };
            } catch (e3) { }
            return out;
        };
        try {
            const pw = window.parent && window.parent !== window ? window.parent : null;
            if (pw) pw.__debugCoupleSpaceRoleDiaryStore = window.__debugCoupleSpaceRoleDiaryStore;
        } catch (e) { }

        function loadAiMissCountForToday(roleId) {
            const rid = String(roleId || '').trim();
            if (!rid) return 0;
            const todayKey = toDateKey(new Date());
            try {
                const nsKey = buildCoupleSpaceRoleKey(AI_MISS_STORAGE_KEY, rid);
                let row = null;
                const raw = nsKey ? (localStorage.getItem(nsKey) || '') : '';
                row = raw ? safeJsonParse(raw, null) : null;
                if (!row || typeof row !== 'object') {
                    const legacyRaw = localStorage.getItem(AI_MISS_STORAGE_KEY) || '';
                    const legacy = legacyRaw ? safeJsonParse(legacyRaw, null) : null;
                    row = legacy && typeof legacy === 'object' ? legacy[rid] : null;
                    if (row && typeof row === 'object' && nsKey) {
                        try { localStorage.setItem(nsKey, JSON.stringify(row)); } catch (e0) { }
                    }
                }
                if (!row || typeof row !== 'object') return 0;
                const dateKey = String(row.dateKey || '');
                const count = Number(row.count);
                if (dateKey !== todayKey) return 0;
                return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
            } catch (e) {
                return 0;
            }
        }

        function renderMoodPage() {
            const calendarEl = document.getElementById('mood-calendar');
            const selectedKey = state.mood.selectedDateKey;
            const selectedDate = dateFromKey(selectedKey);
            const today = startOfToday();
            const metaText = `${formatMonthDot(selectedDate)}${selectedDate.getFullYear()}`;

            if (calendarEl) {
                if (state.mood.isGridView) {
                    calendarEl.classList.add('photo-mode');
                } else {
                    calendarEl.classList.remove('photo-mode');
                }
            }

            const bodyHtml = state.mood.isGridView
                ? buildMoodMonthGrid(selectedDate, today)
                : buildMoodWeekView(selectedKey, selectedDate, today);

            calendarEl.innerHTML = `
                <div class="mood-calendar-header">
                    <div class="mood-calendar-month" data-action="toggle-view">切换视图</div>
                    <div class="mood-calendar-meta" data-action="prompt-role-diary">${metaText}</div>
                </div>
                ${bodyHtml}
            `;

            renderDiaryNote();
        }

        function handleMonthGridDayClick(dateKey) {
            const key = String(dateKey || '').trim();
            if (!key) return;
            const now = Date.now();
            if (
                monthGridClickTimer &&
                monthGridLastDateKey === key &&
                now - monthGridLastClickTime < MONTH_GRID_CLICK_DELAY
            ) {
                clearTimeout(monthGridClickTimer);
                monthGridClickTimer = null;
                monthGridLastClickTime = 0;
                monthGridLastDateKey = '';
                handleMonthGridDoubleClick(key);
                return;
            }
            if (monthGridClickTimer) {
                clearTimeout(monthGridClickTimer);
                monthGridClickTimer = null;
            }
            monthGridLastDateKey = key;
            monthGridLastClickTime = now;
            monthGridClickTimer = setTimeout(() => {
                monthGridClickTimer = null;
                monthGridLastClickTime = 0;
                monthGridLastDateKey = '';
                handleMonthGridSingleClick(key);
            }, MONTH_GRID_CLICK_DELAY);
        }

        function handleMonthGridSingleClick(dateKey) {
            const key = String(dateKey || '').trim();
            if (!key) return;
            state.mood.selectedDateKey = key;
            renderMoodPage();
        }

        function handleMonthGridDoubleClick(dateKey) {
            const key = String(dateKey || '').trim();
            if (!key) return;
            if (isFutureDateKey(key)) {
                alert('暂不支持未来心情的记录');
                return;
            }
            const existingEntry = normalizeMoodEntry(state.mood.entries[key]);
            if (existingEntry) {
                const pw = getParentWindow();
                const msg = '这一天已经写过心情日记啦';
                if (pw && typeof pw.showCenterToast === 'function') {
                    pw.showCenterToast(msg);
                } else if (pw && pw.GlobalModal && typeof pw.GlobalModal.showInfo === 'function') {
                    pw.GlobalModal.showInfo(msg);
                } else {
                    alert(msg);
                }
                return;
            }
            openMoodModal(key);
        }

        function buildMoodWeekView(selectedKey, selectedDate, today) {
            const weekStart = startOfWeek(selectedDate);
            const weekDates = Array.from({ length: 7 }, (_, idx) => addDays(weekStart, idx));
            const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const navHtml = `
                <div class="mood-nav-row">
                    <button class="mood-nav-arrow" type="button" data-action="week-prev">◀</button>
                    <div class="mood-nav-spacer"></div>
                    <button class="mood-nav-arrow" type="button" data-action="week-next">▶</button>
                </div>
            `;

            const daysHtml = weekDates
                .map((d, idx) => {
                    const key = toDateKey(d);
                    const isSelected = key === selectedKey;
                    const isToday = isSameDay(d, today);
                    const entry = normalizeMoodEntry(state.mood.entries[key]);
                    const roleEntry = normalizeMoodEntry(state.mood.roleEntries[key]);
                    const userSlotClass = entry ? 'filled' : 'plus';
                    const userSlotInner = entry
                        ? (entry.icon
                            ? `<img class="mood-slot-img" src="${escapeHtml(entry.icon)}" alt="${escapeHtml(entry.label || '')}" onerror="handleBrokenMoodImage(this, '${escapeHtml((entry.label || '').slice(0, 1))}')">`
                            : escapeHtml(entry.emoji || ''))
                        : '+';
                    const roleSlotClass = roleEntry ? 'filled' : '';
                    const roleSlotInner = roleEntry
                        ? (roleEntry.icon
                            ? `<img class="mood-slot-img" src="${escapeHtml(roleEntry.icon)}" alt="${escapeHtml(roleEntry.label || '')}" onerror="handleBrokenMoodImage(this, '${escapeHtml((roleEntry.label || '').slice(0, 1))}')">`
                            : escapeHtml(roleEntry.emoji || ''))
                        : '';
                    return `
                        <div class="mood-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" data-date-key="${key}">
                            <div class="mood-weekday">${weekLabels[idx]}</div>
                            <div class="mood-date">${d.getDate()}</div>
                            <div class="mood-slots">
                                <button class="mood-slot mood-slot-user ${userSlotClass}" type="button" data-action="open-mood" data-date-key="${key}">${userSlotInner}</button>
                                <div class="mood-slot mood-slot-role ${roleSlotClass}" aria-hidden="true">${roleSlotInner}</div>
                            </div>
                        </div>
                    `;
                })
                .join('');

            return `${navHtml}<div class="mood-week">${daysHtml}</div>`;
        }

        function buildMoodMonthGrid(selectedDate, today) {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const firstDay = new Date(year, month, 1);
            const firstWeekday = firstDay.getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

            const weekLabels = ['日', '一', '二', '三', '四', '五', '六'];
            const headerHtml = weekLabels
                .map((label, idx) => {
                    const leftArrow =
                        idx === 0
                            ? `<button class="mood-nav-arrow mood-month-arrow" type="button" data-action="month-prev">◀</button>`
                            : '';
                    const rightArrow =
                        idx === 6
                            ? `<button class="mood-nav-arrow mood-month-arrow" type="button" data-action="month-next">▶</button>`
                            : '';
                    return `<div class="mood-month-weekday mood-month-weekday-nav">${leftArrow}<span class="mood-month-weekday-text">${label}</span>${rightArrow}</div>`;
                })
                .join('');

            const cells = [];
            for (let i = 0; i < totalCells; i++) {
                const dayIndex = i - firstWeekday;
                const date = new Date(year, month, dayIndex + 1);
                const inCurrentMonth = date.getMonth() === month;
                const key = toDateKey(date);
                const isSelected = key === state.mood.selectedDateKey;
                const isToday = isSameDay(date, today);

                const entry = normalizeMoodEntry(state.mood.entries[key]);
                const roleEntry = normalizeMoodEntry(state.mood.roleEntries[key]);

                let hasImage = false;
                let hasEntryNoImage = false;
                let bgImage = '';

                const userImages = entry && Array.isArray(entry.images) ? entry.images.filter(Boolean) : [];
                const roleImages = roleEntry && Array.isArray(roleEntry.images) ? roleEntry.images.filter(Boolean) : [];

                if (userImages.length) {
                    hasImage = true;
                    bgImage = userImages[0];
                } else if (roleImages.length) {
                    hasImage = true;
                    bgImage = roleImages[0];
                } else if (entry || roleEntry) {
                    hasEntryNoImage = true;
                }

                const classes = ['mood-day'];
                if (isSelected) classes.push('selected');
                if (isToday) classes.push('today');
                if (hasImage) {
                    classes.push('has-image');
                } else if (hasEntryNoImage) {
                    classes.push('has-record');
                }
                if (!inCurrentMonth) classes.push('outside-month');

                const style = hasImage ? `style="background-image:url('${escapeHtml(bgImage)}');"` : '';

                cells.push(`
                    <div class="${classes.join(' ')}" data-date-key="${key}" ${style}>
                        <div class="mood-date-number">${date.getDate()}</div>
                    </div>
                `);
            }

            return `<div class="mood-month-grid">${headerHtml}${cells.join('')}</div>`;
        }

        function buildPencilIconSvg() {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"></path><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>';
        }

        function buildNoteImagesHtml(images) {
            const list = Array.isArray(images) ? images.filter((src) => typeof src === 'string' && src.trim()) : [];
            if (!list.length) return '';
            const count = Math.min(list.length, 9);
            let cols = 3;
            if (count === 1) cols = 1;
            else if (count === 2 || count === 4) cols = 2;
            const colsClass = cols === 1 ? 'cols-1' : cols === 2 ? 'cols-2' : 'cols-3';
            const itemsHtml = list.slice(0, 9).map((src, idx) => {
                return `
                    <div class="note-image-item">
                        <img src="${escapeHtml(src)}" alt="diary image ${idx + 1}">
                    </div>
                `;
            }).join('');
            return `<div class="note-images ${colsClass}">${itemsHtml}</div>`;
        }

        function buildDiaryCommentsHtml(entry, userName, roleName, owner, dateKey) {
            if (!entry || typeof entry !== 'object') {
                return '';
            }
            const comments = Array.isArray(entry.comments) ? entry.comments : [];
            const itemsHtml = comments
                .map((c) => {
                    if (!c || typeof c !== 'object') return '';
                    const senderRaw = String(c.sender || '').trim();
                    const displayName = senderRaw === 'character' ? roleName : userName;
                    const text = String(c.text || '').trim();
                    if (!text) return '';
                    const time = String(c.time || '').trim();
                    const nameHtml = `<span class="diary-comment-sender">${escapeHtml(displayName || '')}：</span>`;
                    const textHtml = `<span class="diary-comment-text">${escapeHtml(text)}</span>`;
                    const timeHtml = time ? `<span class="diary-comment-time">· ${escapeHtml(time)}</span>` : '';
                    return `<div class="diary-comment-item">${nameHtml}${textHtml}${timeHtml}</div>`;
                })
                .filter(Boolean)
                .join('');
            const listHtml = `<div class="diary-comment-list">${itemsHtml}</div>`;
            const placeholder = owner === 'character' ? '对TA说点什么...' : '写一句悄悄话...';
            const ownerAttr = escapeHtml(owner || '');
            const dateAttr = escapeHtml(dateKey || '');
            const inputHtml =
                '<div class="diary-comment-input-row">' +
                `<input class="diary-comment-input" type="text" maxlength="120" placeholder="${escapeHtml(placeholder)}" data-owner="${ownerAttr}" data-date-key="${dateAttr}">` +
                `<button class="diary-comment-submit" type="button" data-action="request-character-comment" data-owner="${ownerAttr}" data-date-key="${dateAttr}" aria-label="让角色回复">` +
                buildPencilIconSvg() +
                '</button>' +
                '</div>';
            return `<div class="diary-comments">${listHtml}${inputHtml}</div>`;
        }

        function renderDiaryNote() {
            const container = document.getElementById('diary-note-container');
            const entry = normalizeMoodEntry(state.mood.entries[state.mood.selectedDateKey]);
            const roleEntry = normalizeMoodEntry(state.mood.roleEntries[state.mood.selectedDateKey]);
            if (!entry && !roleEntry) {
                container.innerHTML = '';
                return;
            }
            const userNameEl = document.getElementById('name-user');
            const roleNameEl = document.getElementById('name-role');
            const userName = userNameEl ? String(userNameEl.textContent || '').trim() : '我';
            const roleName = roleNameEl ? String(roleNameEl.textContent || '').trim() : 'Ta';

            const blocks = [];
            if (entry) {
                const iconHtml = entry.icon
                    ? `<img class="note-mood-icon" src="${escapeHtml(entry.icon)}" alt="${escapeHtml(entry.label || '')}" onerror="handleBrokenMoodImage(this, '${escapeHtml((entry.label || '').slice(0, 1))}')">`
                    : '';
                const timeText = formatTime(entry.updatedAt);
                const imagesHtml = buildNoteImagesHtml(entry.images);
                const commentsHtml = buildDiaryCommentsHtml(entry, userName, roleName, 'user', entry.date || state.mood.selectedDateKey);
                blocks.push(`
                    <div class="diary-note-card" data-owner="user" data-date-key="${escapeHtml(entry.date || state.mood.selectedDateKey)}">
                        <div class="note-header">
                            <div class="note-left">
                                ${iconHtml}
                                <div class="note-mood-label">${escapeHtml(entry.label || '')} · ${escapeHtml(userName || '我')}</div>
                            </div>
                            <div class="note-time">${escapeHtml(timeText)}</div>
                        </div>
                        <div class="note-content">${escapeHtml(entry.text || entry.content || '')}</div>
                        ${imagesHtml}
                        ${commentsHtml}
                    </div>
                `);
            }
            if (roleEntry) {
                const iconHtml = roleEntry.icon
                    ? `<img class="note-mood-icon" src="${escapeHtml(roleEntry.icon)}" alt="${escapeHtml(roleEntry.label || '')}" onerror="handleBrokenMoodImage(this, '${escapeHtml((roleEntry.label || '').slice(0, 1))}')">`
                    : '';
                const timeText = formatTime(roleEntry.updatedAt);
                const imagesHtml = buildNoteImagesHtml(roleEntry.images);
                const commentsHtml = buildDiaryCommentsHtml(roleEntry, userName, roleName, 'character', roleEntry.date || state.mood.selectedDateKey);
                blocks.push(`
                    <div class="diary-note-card" data-owner="character" data-date-key="${escapeHtml(roleEntry.date || state.mood.selectedDateKey)}">
                        <div class="note-header">
                            <div class="note-left">
                                ${iconHtml}
                                <div class="note-mood-label">${escapeHtml(roleEntry.label || '')} · ${escapeHtml(roleName || 'Ta')}</div>
                            </div>
                            <div class="note-time">${escapeHtml(timeText)}</div>
                        </div>
                        <div class="note-content">${renderCoupleSpaceDiaryContentHtml(getCoupleLinkState().roleId, roleEntry.text || roleEntry.content || '')}</div>
                        ${imagesHtml}
                        ${commentsHtml}
                    </div>
                `);
            }
            container.innerHTML = blocks.join('');
        }

        function handleDiaryNoteContainerClick(e) {
            if (diaryNoteSuppressNextClick) {
                diaryNoteSuppressNextClick = false;
                return;
            }
            const btn = e.target && e.target.closest ? e.target.closest('[data-action="request-character-comment"]') : null;
            if (btn) {
                const owner = String(btn.getAttribute('data-owner') || '').trim();
                const dateKey = String(btn.getAttribute('data-date-key') || '').trim();
                requestCharacterReplyFromDiaryComment(dateKey, owner);
                return;
            }
            const inCommentRow = e.target && e.target.closest ? e.target.closest('.diary-comment-input-row') : null;
            if (inCommentRow) return;
            const card = e.target && e.target.closest ? e.target.closest('.diary-note-card[data-owner="user"]') : null;
            if (!card) return;
            const key = String(card.getAttribute('data-date-key') || state.mood.selectedDateKey || '').trim();
            if (!key) return;
            openDiaryEditConfirmModal(key);
        }

        async function deleteDiaryEntry(dateKey, owner) {
            const key = String(dateKey || '').trim();
            if (!key) return false;
            const ownerType = owner === 'character' ? 'character' : 'user';

            if (ownerType === 'user') {
                const entry = normalizeMoodEntry(state.mood.entries[key]);
                if (!entry) return false;
                delete state.mood.entries[key];
                await saveMoodState();
                if (state.activeTab === 'mood') renderMoodPage();
                return true;
            }

            const roleEntry = normalizeMoodEntry(state.mood.roleEntries[key]);
            if (!roleEntry) return false;
            delete state.mood.roleEntries[key];
            await saveRoleMoodState();
            if (state.activeTab === 'mood') renderMoodPage();
            return true;
        }

        function startDiaryNoteLongPress(e) {
            const container = document.getElementById('diary-note-container');
            if (!container) return;
            const target = e && e.target ? e.target : null;
            const card = target && target.closest ? target.closest('.diary-note-card[data-owner][data-date-key]') : null;
            if (!card) return;
            if (target && target.closest && target.closest('.diary-comment-input-row')) return;
            if (target && target.closest && target.closest('[data-action="request-character-comment"]')) return;

            const owner = String(card.getAttribute('data-owner') || '').trim();
            const dateKey = String(card.getAttribute('data-date-key') || '').trim();
            if (!dateKey) return;

            diaryNoteLongPressActive = true;
            if (diaryNoteLongPressTimer) {
                clearTimeout(diaryNoteLongPressTimer);
                diaryNoteLongPressTimer = null;
            }
            diaryNoteLongPressTimer = setTimeout(async () => {
                diaryNoteLongPressTimer = null;
                if (!diaryNoteLongPressActive) return;
                diaryNoteSuppressNextClick = true;
                const confirmText = owner === 'character'
                    ? '要删除 Ta 的这篇心情日记吗？删除后，本地没有记录时才会在合适时机重新触发离线生成。'
                    : '要删除这一天的心情日记吗？删除后可以重新写。';
                const ok = confirm(confirmText);
                if (!ok) return;
                await deleteDiaryEntry(dateKey, owner);
            }, DIARY_NOTE_LONG_PRESS_MS);
        }

        function cancelDiaryNoteLongPress() {
            diaryNoteLongPressActive = false;
            if (diaryNoteLongPressTimer) {
                clearTimeout(diaryNoteLongPressTimer);
                diaryNoteLongPressTimer = null;
            }
        }

        function handleDiaryCommentKeydown(e) {
            const target = e && e.target ? e.target : null;
            if (!target || !target.classList || !target.classList.contains('diary-comment-input')) return;
            if (!e || e.key !== 'Enter') return;
            e.preventDefault();
            const owner = String(target.getAttribute('data-owner') || '').trim();
            const dateKey = String(target.getAttribute('data-date-key') || '').trim();
            submitDiaryComment(dateKey, owner);
        }

        function getLatestUserDiaryComment(entry) {
            const comments = entry && Array.isArray(entry.comments) ? entry.comments : [];
            for (let i = comments.length - 1; i >= 0; i--) {
                const c = comments[i];
                if (!c || String(c.sender || '').trim() !== 'user') continue;
                const text = String(c.text || '').trim();
                if (text) return text;
            }
            return '';
        }

        function buildDiaryCommentThreadText(entry, userName, roleName) {
            const comments = entry && Array.isArray(entry.comments) ? entry.comments : [];
            const lines = [];
            for (let i = 0; i < comments.length; i++) {
                const c = comments[i];
                if (!c || typeof c !== 'object') continue;
                const text = String(c.text || '').replace(/\s+/g, ' ').trim();
                if (!text) continue;
                const sender = String(c.sender || '').trim() === 'character'
                    ? (roleName || '你')
                    : (userName || '用户');
                const time = String(c.time || '').trim();
                lines.push(`${time ? '[' + time + '] ' : ''}${sender}：${text}`);
            }
            return lines.slice(-12).join('\n');
        }

        function requestCharacterReplyFromDiaryComment(dateKey, owner) {
            const key = String(dateKey || state.mood.selectedDateKey || '').trim();
            const ownerType = owner === 'character' ? 'character' : 'user';
            if (!key) return;
            if (ownerType === 'user') {
                requestManualCharacterReplyForUserDiary(key);
                return;
            }
            const roleEntry = normalizeMoodEntry(state.mood.roleEntries[key]);
            if (!roleEntry) {
                showCoupleSpaceInfo('还没有可回复的角色日记');
                return;
            }
            const container = document.getElementById('diary-note-container');
            const input = container && container.querySelector
                ? container.querySelector('.diary-comment-input[data-owner="character"][data-date-key="' + key + '"]')
                : null;
            if (input && String(input.value || '').trim()) {
                showCoupleSpaceInfo('先用键盘发送这条评论，再让角色回复');
                return;
            }
            const userComment = getLatestUserDiaryComment(roleEntry);
            if (!userComment) {
                showCoupleSpaceInfo('先用键盘发送你的评论，再让角色回复');
                return;
            }
            triggerCharacterReplyForRoleDiary(key, roleEntry, userComment);
        }

        async function submitDiaryComment(dateKey, owner) {
            const key = String(dateKey || state.mood.selectedDateKey || '').trim();
            const ownerType = owner === 'character' ? 'character' : 'user';
            const container = document.getElementById('diary-note-container');
            if (!container || !key) return;
            const input = container.querySelector(
                '.diary-comment-input[data-owner="' + ownerType + '"][data-date-key="' + key + '"]'
            );
            if (!input) return;
            const raw = input.value;
            const text = String(raw || '').trim();
            if (!text) {
                return;
            }
            input.value = '';
            const nowTs = Date.now();

            if (ownerType === 'user') {
                const entry = normalizeMoodEntry(state.mood.entries[key]);
                if (!entry) return;
                if (!Array.isArray(entry.comments)) entry.comments = [];
                entry.comments.push({
                    sender: 'user',
                    text,
                    time: formatTime(nowTs),
                });
                state.mood.entries[key] = entry;
                await saveMoodState();
                renderMoodPage();
                return;
            }

            const roleEntry = normalizeMoodEntry(state.mood.roleEntries[key]);
            if (!roleEntry) return;
            if (!Array.isArray(roleEntry.comments)) roleEntry.comments = [];
            roleEntry.comments.push({
                sender: 'user',
                text,
                time: formatTime(nowTs),
            });
            state.mood.roleEntries[key] = roleEntry;
            await saveRoleMoodState();
            renderMoodPage();
        }

        async function triggerCharacterReplyForRoleDiary(dateKey, entry, userComment) {
            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) return;
            const roleName = getRoleDisplayName();
            const userName = getCoupleSpaceUserName();
            const toastText = roleName + ' 收到了你的评论，正在回复中……';
            setGlobalCharacterReplying(true, toastText);
            try {
                const reply = await callCharacterDiaryCommentAPI({
                    scene: 'comment_on_role_diary',
                    roleDiaryText: entry && (entry.text || entry.content || ''),
                    userComment: userComment || '',
                    commentThread: buildDiaryCommentThreadText(entry, userName, roleName),
                });
                const trimmed = normalizeAiReplyText(reply);
                if (!trimmed) return;
                const key = String(dateKey || '').trim();
                const latest = normalizeMoodEntry(state.mood.roleEntries[key]);
                if (!latest) return;
                if (!Array.isArray(latest.comments)) latest.comments = [];
                latest.comments.push({
                    sender: 'character',
                    text: trimmed,
                    time: formatTime(Date.now()),
                });
                state.mood.roleEntries[key] = latest;
                await saveRoleMoodState();
                if (state.activeTab === 'mood') {
                    renderMoodPage();
                }
            } catch (err) {
                showAiError(err);
            } finally {
                setGlobalCharacterReplying(false, '');
            }
        }

        function requestManualCharacterReplyForUserDiary(dateKey) {
            const key = String(dateKey || state.mood.selectedDateKey || '').trim();
            if (!key) return;
            const todayKey = toDateKey(new Date());
            if (key !== todayKey) {
                showCoupleSpaceInfo('目前只能手动触发今天这篇心情日记的角色评论');
                return;
            }
            const entry = normalizeMoodEntry(state.mood.entries[key]);
            if (!entry) {
                showCoupleSpaceInfo('今天还没有写心情日记');
                return;
            }
            const text = String(entry.text || entry.content || '').trim();
            if (!text) {
                showCoupleSpaceInfo('今天的心情日记内容为空');
                return;
            }
            openRoleDiaryConfirmModal(function () {
                scheduleCharacterReplyForUserDiary(key, { forceManual: true });
            }, {
                title: '手动触发评论',
                text: '是否要让角色评论今天这篇心情日记？'
            });
        }

        function openDiaryEditConfirmModal(dateKey) {
            const key = String(dateKey || state.mood.selectedDateKey || '').trim();
            if (!key) return;
            const entry = normalizeMoodEntry(state.mood.entries[key]);
            if (!entry) return;
            diaryEditPendingDateKey = key;
            const modal = document.getElementById('diary-edit-modal');
            if (!modal) return;
            modal.hidden = false;
            requestAnimationFrame(() => {
                modal.classList.add('is-open');
            });
        }

        function closeDiaryEditConfirmModal() {
            const modal = document.getElementById('diary-edit-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
            diaryEditPendingDateKey = '';
            setTimeout(() => {
                modal.hidden = true;
            }, 160);
        }

        function enterDiaryEditModeForDate(dateKey) {
            const key = String(dateKey || state.mood.selectedDateKey || '').trim();
            if (!key) return;
            const entry = normalizeMoodEntry(state.mood.entries[key]);
            if (!entry) return;
            state.mood.selectedDateKey = key;
            state.mood.modalDateKey = key;
            state.mood.modalOpen = true;
            state.mood.modalStep = 'pick';
            state.mood.pickedMood = null;
            state.mood.diaryDraft = '';
            state.mood.diaryImagesDraft = [];
            state.mood.isEditing = true;
            state.mood.editingDateKey = key;
            renderMoodModal();
        }

        function scheduleCharacterReplyForUserDiary(dateKey, options) {
            const opts = options && typeof options === 'object' ? options : {};
            if (!opts.forceManual && !isRoleCommentOnUserDiaryEnabled()) return;
            const key = String(dateKey || '').trim();
            if (!key) return;
            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) return;
            const entry = normalizeMoodEntry(state.mood.entries[key]);
            if (!entry) return;
            const text = String(entry.text || entry.content || '').trim();
            if (!text) return;
            const images = Array.isArray(entry.images) ? entry.images.slice(0, 9) : [];
            const roleName = getRoleDisplayName();
            const toastText = opts.forceManual
                ? (roleName + ' 正在看你今天的日记，准备给你留言……')
                : (roleName + ' 正在查看你的日记，请稍候（支持后台生成但请不要退出小手机）');
            setGlobalCharacterReplying(true, toastText);
            (async function () {
                try {
                    const reply = await callCharacterDiaryCommentAPI({
                        scene: 'user_diary',
                        diaryText: text,
                        diaryImages: images,
                    });
                    const trimmed = normalizeAiReplyText(reply);
                    if (!trimmed) return;
                    const latest = normalizeMoodEntry(state.mood.entries[key]);
                    if (!latest) return;
                    if (!Array.isArray(latest.comments)) latest.comments = [];
                    latest.comments.push({
                        sender: 'character',
                        text: trimmed,
                        time: formatTime(Date.now()),
                    });
                    state.mood.entries[key] = latest;
                    await saveMoodState();
                    if (state.activeTab === 'mood') {
                        renderMoodPage();
                    }
                } catch (err) {
                    showAiError(err);
                } finally {
                    setGlobalCharacterReplying(false, '');
                }
            })();
        }

        function openMoodModal(dateKey) {
            state.mood.modalDateKey = dateKey || state.mood.selectedDateKey;
            state.mood.selectedDateKey = state.mood.modalDateKey;
            state.mood.modalOpen = true;
            state.mood.modalStep = 'pick';
            state.mood.pickedMood = null;
            state.mood.diaryDraft = '';
            state.mood.diaryImagesDraft = [];
            state.mood.isEditing = false;
            state.mood.editingDateKey = '';
            renderMoodModal();
        }

        function closeMoodModal() {
            state.mood.modalOpen = false;
            state.mood.isEditing = false;
            state.mood.editingDateKey = '';
            renderMoodModal();
        }

        function renderMoodModal() {
            const modal = document.getElementById('mood-modal');
            const content = document.getElementById('mood-modal-content');
            if (!state.mood.modalOpen) {
                modal.hidden = true;
                modal.classList.remove('open');
                content.innerHTML = '';
                return;
            }
            modal.hidden = false;
            requestAnimationFrame(() => modal.classList.add('open'));

            if (state.mood.modalStep === 'pick') {
                const grid = MOOD_OPTIONS
                    .map((opt) => {
                        return `
                            <button class="mood-option" type="button" data-action="pick-mood" data-id="${escapeHtml(opt.id)}" data-label="${escapeHtml(opt.label)}" data-icon="${escapeHtml(opt.icon)}">
                                <img src="${escapeHtml(opt.icon)}" alt="${escapeHtml(opt.label)}" onerror="handleBrokenMoodImage(this, '${escapeHtml((opt.label || '').slice(0, 1))}')">
                                <div class="mood-label">${escapeHtml(opt.label)}</div>
                            </button>
                        `;
                    })
                    .join('');
                content.innerHTML = `
                    <div class="mood-modal-title">请选择今天的心情</div>
                    <div class="mood-grid">${grid}</div>
                `;
                return;
            }

            const picked = state.mood.pickedMood || { label: '心情', icon: '' };
            const headerIcon = picked.icon
                ? `<img class="note-mood-icon" src="${escapeHtml(picked.icon)}" alt="${escapeHtml(picked.label || '')}" onerror="handleBrokenMoodImage(this, '${escapeHtml((picked.label || '').slice(0, 1))}')">`
                : '';
            const canSave = String(state.mood.diaryDraft || '').trim().length > 0;
            content.innerHTML = `
                <div class="mood-modal-title">${headerIcon}${escapeHtml(picked.label)}</div>
                <div class="diary-input-wrapper">
                    <textarea class="diary-input" id="diary-textarea" placeholder="写下此刻的心情...">${escapeHtml(state.mood.diaryDraft || '')}</textarea>
                    <div class="diary-image-picker" data-action="open-image-picker">📷</div>
                </div>
                <button class="diary-save" type="button" data-action="save-diary" ${canSave ? '' : 'disabled'}>确认/保存</button>
            `;
        }

        async function saveDiaryEntry() {
            const picked = state.mood.pickedMood;
            if (!picked) return;
            const key = state.mood.modalDateKey || state.mood.selectedDateKey;
            const text = (state.mood.diaryDraft || '').trim();
            if (!text) {
                updateDiarySaveButtonState();
                return;
            }
            const now = Date.now();
            const images = Array.isArray(state.mood.diaryImagesDraft) ? state.mood.diaryImagesDraft.slice(0, 9) : [];
            const prevEntry = normalizeMoodEntry(state.mood.entries[key]) || null;
            const prevComments = prevEntry && Array.isArray(prevEntry.comments) ? prevEntry.comments.slice() : [];
            state.mood.entries[key] = {
                id: picked.id,
                mood: picked.id,
                label: picked.label,
                icon: picked.icon,
                text,
                content: text,
                images,
                date: key,
                updatedAt: now,
                comments: prevComments,
            };
            state.mood.diaryImagesDraft = [];
            state.mood.isEditing = false;
            state.mood.editingDateKey = '';
            await saveMoodState();
            closeMoodModal();
            renderMoodPage();
            scheduleCharacterReplyForUserDiary(key);
        }

        function triggerBgChange() {
            document.getElementById('bg-input').click();
        }

        function triggerAvatarChange(type) {
            if (type === 'user') {
                const input = document.getElementById('avatar-user-input');
                if (input) {
                    input.disabled = false;
                    input.click();
                }
            } else {
                const input = document.getElementById('avatar-role-input');
                if (input) {
                    input.disabled = false;
                    input.click();
                }
            }
        }

        function handleFileSelect(event, imgId, storageKey) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 1200;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    
                    document.getElementById(imgId).src = dataUrl;
                    
                    const link = getCoupleLinkState();
                    const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
                    coupleSpaceSetRoleItem(storageKey, rid, dataUrl).then((ok) => {
                        if (!ok) {
                            alert('存储空间不足');
                        }
                    });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        }

        async function loadImage(key, imgId) {
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            const data = await coupleSpaceGetRoleItem(key, rid);
            if (data) {
                document.getElementById(imgId).src = data;
                return true;
            }
            return false;
        }

        function goBack() {
            try {
                const link = getCoupleLinkState();
                if (link && link.hasCoupleLinked && link.roleId) {
                    writeLastExitTime(link.roleId, Date.now());
                }
            } catch (e) { }
            if (window.parent && window.parent.closeApp) {
                window.parent.closeApp();
            } else {
                console.log('No parent window detected');
            }
        }

        try {
            window.addEventListener('pagehide', function () {
                const link = getCoupleLinkState();
                if (link && link.hasCoupleLinked && link.roleId) {
                    writeLastExitTime(link.roleId, Date.now());
                }
            });
        } catch (e) { }

        try {
            window.addEventListener('message', async function (ev) {
                const data = ev && ev.data ? ev.data : null;
                if (!data || typeof data !== 'object') return;
                const type = String(data.type || '');
                if (type === 'COUPLE_SPACE_SECRET_REFRESH') {
                    try {
                        const modal = document.getElementById('secret-space-modal');
                        if (modal && !modal.hidden && window.secretSpaceTimeline && typeof window.secretSpaceTimeline.render === 'function') {
                            window.secretSpaceTimeline.render();
                        }
                    } catch (e0) { }
                    return;
                }
                if (type === 'COUPLE_SPACE_ACTIVITY_REFRESH') {
                    try {
                        const modal = document.getElementById('secret-space-modal');
                        if (modal && !modal.hidden && window.secretSpaceTimeline && typeof window.secretSpaceTimeline.render === 'function') {
                            window.secretSpaceTimeline.render();
                        }
                    } catch (e00) { }
                    return;
                }
                if (type === 'COUPLE_SPACE_OPEN_SECRET') {
                    try {
                        if (typeof window.openCoupleSecretSpace === 'function') {
                            window.openCoupleSecretSpace();
                        } else {
                            setTimeout(function () {
                                if (typeof window.openCoupleSecretSpace === 'function') window.openCoupleSecretSpace();
                            }, 260);
                        }
                    } catch (e01) { }
                    return;
                }
                if (type !== 'COUPLE_SPACE_APP_ENTER' && type !== 'COUPLE_SPACE_APP_EXIT') return;
                if (type === 'COUPLE_SPACE_APP_ENTER') {
                    initCoupleRoleSelectOverlay();
                }
                const link = getCoupleLinkState();
                if (!link || !link.hasCoupleLinked || !link.roleId) return;
                if (type === 'COUPLE_SPACE_APP_EXIT') {
                    setGlobalCharacterReplying(false, '', true);
                    coupleSpaceAppVisible = false;
                    writeLastExitTime(link.roleId, Date.now());
                    return;
                }

                try {
                    await handleCoupleSpaceAppEnter('message_enter');
                } catch (e2) {
                    const pw = getParentWindow();
                    const msg = e2 && e2.message ? String(e2.message) : String(e2 || '生成失败');
                    if (pw && typeof pw.showCenterToast === 'function') {
                        pw.showCenterToast(msg);
                    } else if (pw && pw.GlobalModal && typeof pw.GlobalModal.showError === 'function') {
                        pw.GlobalModal.showError(msg);
                    } else {
                        alert(msg);
                    }
                }
            });
        } catch (e) { }
