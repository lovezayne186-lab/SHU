/* =========================================================
   文件路径：JS脚本文件夹/chat.js
   作用：聊天室全功能完整版 (修复闭环 + 保留所有原有功能)
   ========================================================= */

/* ================================
   目录:
   [SEC-01] 数据存储与全局状态
   [SEC-02] 核心引擎与聊天渲染
   [SEC-03] AI 触发与系统 Prompt
   [SEC-04] 角色状态监控与心情日志
   [SEC-05] AI 回复解析与消息写入
   [SEC-06] 地图编辑器与实时位置共享
   [SEC-07] 语音/视频通话（用户发起）
   [SEC-08] AI 主动来电与接听逻辑
   [SEC-09] 菜单、角色与用户设置
   [SEC-10] 闭环导航与图片工具
   ================================ */

/* === [SEC-01] 数据存储与全局状态 === */

const DB = {
    keys: {
        chatData: 'wechat_chatData',
        chatMapData: 'wechat_chatMapData',
        charProfiles: 'wechat_charProfiles',
        userPersonas: 'wechat_userPersonas',
        chatBackgrounds: 'wechat_backgrounds',
        callLogs: 'wechat_callLogs',
        chatUnread: 'wechat_unread',
        familyCards: 'wechat_family_cards',
        stickerData: 'wechat_sticker_data'
    },
    isLargeStoreReady: function () {
        return !!(window.localforage && typeof window.localforage.getItem === 'function' && typeof window.localforage.setItem === 'function');
    },
    configLargeStore: function () {
        if (!window.localforage || typeof window.localforage.config !== 'function') return;
        try {
            window.localforage.config({
                name: 'shubao-phone',
                storeName: 'wechat'
            });
        } catch (e) { }
    },
    getLight: function (key) {
        return localStorage.getItem(key);
    },
    setLight: function (key, value) {
        localStorage.setItem(key, String(value));
    },
    removeLight: function (key) {
        localStorage.removeItem(key);
    },
    getCurrentChatRole: function () {
        return localStorage.getItem('currentChatId') || "";
    },
    setCurrentChatRole: function (roleId) {
        localStorage.setItem('currentChatId', roleId || "");
    }
};
window.DB = DB;

function normalizeStoredValue(value, fallback) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') {
        try { return JSON.parse(value); } catch (e) { return fallback; }
    }
    if (typeof value !== 'object') return fallback;
    return value;
}

function isPlainStorageObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getStorageObjectSize(value) {
    if (Array.isArray(value)) return value.length;
    if (isPlainStorageObject(value)) return Object.keys(value).length;
    return value == null ? 0 : 1;
}

function pickStorageRecordValue(key, localValue, forageValue) {
    const localSize = getStorageObjectSize(localValue);
    const forageSize = getStorageObjectSize(forageValue);

    if (localSize === 0 && forageSize > 0) return forageValue;
    if (forageSize === 0 && localSize > 0) return localValue;

    if (key === DB.keys.chatData && isPlainStorageObject(localValue) && isPlainStorageObject(forageValue)) {
        const merged = Object.assign({}, forageValue);
        Object.keys(localValue).forEach(function (roleId) {
            const localList = Array.isArray(localValue[roleId]) ? localValue[roleId] : [];
            const forageList = Array.isArray(forageValue[roleId]) ? forageValue[roleId] : [];
            if (localList.length >= forageList.length) merged[roleId] = localValue[roleId];
        });
        return merged;
    }

    if (isPlainStorageObject(localValue) && isPlainStorageObject(forageValue)) {
        return Object.assign({}, forageValue, localValue);
    }

    return localSize >= forageSize ? localValue : forageValue;
}

function readLocalStorageJsonMirror(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return normalizeStoredValue(raw, fallback);
    } catch (e) {
        return fallback;
    }
}

const OFFLINE_SYNC_KEYS = {
    lastActiveTime: 'lastActiveTime',
    aiMissCounts: 'couple_space_ai_miss_counts_v1',
    roleMoodEntries: 'couple_space_role_mood_entries_v1'
};

const COUPLE_SPACE_ROLE_KEY_SEP = '__roleId__';
const DEV_AI_PARSE_FAILURE_LOG_KEY = 'dev_ai_parse_failures_v1';

function buildCoupleSpaceRoleKey(baseKey, roleId) {
    const k = String(baseKey || '').trim();
    const rid = String(roleId || '').trim();
    if (!k) return '';
    if (!rid) return k;
    if (k.indexOf(COUPLE_SPACE_ROLE_KEY_SEP) !== -1) return k;
    return k + COUPLE_SPACE_ROLE_KEY_SEP + rid;
}

let coupleSpaceForage = null;
function getCoupleSpaceForage() {
    try {
        if (coupleSpaceForage) return coupleSpaceForage;
        if (!window.localforage || typeof window.localforage.createInstance !== 'function') return null;
        coupleSpaceForage = window.localforage.createInstance({ name: 'shubao_large_store_v1', storeName: 'couple_space' });
        try { window.__coupleSpaceForageInstance = coupleSpaceForage; } catch (e1) { }
        return coupleSpaceForage;
    } catch (e) {
        return null;
    }
}

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
        const list = JSON.parse(listRaw);
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

function safeJsonParse(text, fallback) {
    try {
        return JSON.parse(text);
    } catch (e) {
        return fallback;
    }
}

function toDateKey(dateOrTs) {
    const d = dateOrTs instanceof Date ? new Date(dateOrTs) : new Date(Number(dateOrTs) || Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseTimestampMaybe(value) {
    if (value == null) return NaN;
    if (typeof value === 'number') return value;
    const s = String(value || '').trim();
    if (!s) return NaN;
    const n = Number(s);
    if (Number.isFinite(n)) return n;
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : NaN;
}

function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

function readRoleMoodStore(roleId) {
    const rid = String(roleId || '').trim();
    try {
        const key = buildCoupleSpaceRoleKey(OFFLINE_SYNC_KEYS.roleMoodEntries, rid);
        let raw = localStorage.getItem(key);
        if ((!raw || !String(raw).trim()) && rid) {
            const legacyRaw = localStorage.getItem(OFFLINE_SYNC_KEYS.roleMoodEntries) || '';
            const legacy = legacyRaw ? safeJsonParse(legacyRaw, null) : null;
            if (legacy && typeof legacy === 'object' && legacy.entries && typeof legacy.entries === 'object') {
                const extracted = { entries: {} };
                Object.keys(legacy.entries).forEach(dk => {
                    const row = legacy.entries[dk] && typeof legacy.entries[dk] === 'object' ? legacy.entries[dk][rid] : null;
                    if (row && typeof row === 'object') {
                        extracted.entries[dk] = row;
                    }
                });
                if (Object.keys(extracted.entries).length) {
                    try { localStorage.setItem(key, JSON.stringify(extracted)); } catch (e0) { }
                    raw = JSON.stringify(extracted);
                }
            }
        }
        const parsed = raw ? safeJsonParse(raw, null) : null;
        if (!parsed || typeof parsed !== 'object') return { entries: {} };
        if (!parsed.entries || typeof parsed.entries !== 'object') parsed.entries = {};
        if (rid) {
            let changed = false;
            const nextEntries = {};
            Object.keys(parsed.entries).forEach((dk) => {
                const entry = parsed.entries[dk];
                if (!entry || typeof entry !== 'object') return;
                const hasShape =
                    typeof entry.label === 'string' ||
                    typeof entry.id === 'string' ||
                    typeof entry.mood === 'string' ||
                    typeof entry.text === 'string' ||
                    typeof entry.content === 'string';
                if (!hasShape && entry[rid] && typeof entry[rid] === 'object') {
                    nextEntries[dk] = entry[rid];
                    changed = true;
                } else {
                    nextEntries[dk] = entry;
                }
            });
            if (changed) {
                parsed.entries = nextEntries;
                try { localStorage.setItem(key, JSON.stringify(parsed)); } catch (e1) { }
            }
        }
        return parsed;
    } catch (e) {
        return { entries: {} };
    }
}

function writeRoleMoodStore(roleId, store) {
    const rid = String(roleId || '').trim();
    const key = buildCoupleSpaceRoleKey(OFFLINE_SYNC_KEYS.roleMoodEntries, rid);
    const payload = store || { entries: {} };
    try {
        localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) { }
    try {
        if (window.localforage && typeof window.localforage.setItem === 'function') {
            window.localforage.setItem(key, payload).catch(function () { });
        }
    } catch (e2) { }
    try {
        const forage = getCoupleSpaceForage();
        if (forage) forage.setItem(key, payload).catch(function () { });
    } catch (e3) { }
}

function hasRoleDiaryForDate(roleId, dateKey) {
    const rid = String(roleId || '').trim();
    const dk = String(dateKey || '').trim();
    if (!rid || !dk) return false;
    const store = readRoleMoodStore(rid);
    const entry = store && store.entries && store.entries[dk] ? store.entries[dk] : null;
    if (!entry || typeof entry !== 'object') return false;
    return !!(entry.text || entry.content || entry.id || entry.mood || entry.label);
}

function upsertRoleDiary(roleId, payload) {
    const rid = String(roleId || '').trim();
    if (!rid || !payload || typeof payload !== 'object') return;
    const fakeTs = parseTimestampMaybe(payload.fakeTimestamp || payload.fake_timestamp);
    const tsToUse = Number.isFinite(fakeTs) ? fakeTs : Date.now();
    const dateKey = toDateKey(tsToUse);
    const store = readRoleMoodStore(rid);
    store.entries[dateKey] = {
        id: typeof payload.moodId === 'string' ? payload.moodId : (typeof payload.mood_id === 'string' ? payload.mood_id : ''),
        text: typeof payload.content === 'string' ? payload.content : '',
        updatedAt: tsToUse,
        fakeTimestamp: typeof payload.fakeTimestamp === 'string' ? payload.fakeTimestamp : (typeof payload.fake_timestamp === 'string' ? payload.fake_timestamp : '')
    };
    writeRoleMoodStore(rid, store);
}

function readAiMissCountRow(roleId) {
    const rid = String(roleId || '').trim();
    const key = buildCoupleSpaceRoleKey(OFFLINE_SYNC_KEYS.aiMissCounts, rid);
    try {
        const raw = localStorage.getItem(key) || '';
        const parsed = raw ? safeJsonParse(raw, null) : null;
        if (parsed && typeof parsed === 'object') return parsed;
        const legacyRaw = localStorage.getItem(OFFLINE_SYNC_KEYS.aiMissCounts) || '';
        const legacy = legacyRaw ? safeJsonParse(legacyRaw, null) : null;
        const row = legacy && typeof legacy === 'object' ? legacy[rid] : null;
        if (row && typeof row === 'object') {
            try { localStorage.setItem(key, JSON.stringify(row)); } catch (e0) { }
            return row;
        }
        return null;
    } catch (e) {
        return null;
    }
}

function writeAiMissCountRow(roleId, row) {
    const rid = String(roleId || '').trim();
    const key = buildCoupleSpaceRoleKey(OFFLINE_SYNC_KEYS.aiMissCounts, rid);
    try {
        localStorage.setItem(key, JSON.stringify(row || {}));
    } catch (e) { }
    try {
        const forage = getCoupleSpaceForage();
        if (forage) forage.setItem(key, row || {}).catch(function () { });
    } catch (e2) { }
}

function addAiMissCountForToday(roleId, delta) {
    const rid = String(roleId || '').trim();
    if (!rid) return;
    const add = clampNumber(delta, 0, 999999, 0);
    if (!add) return;
    const todayKey = toDateKey(Date.now());
    const existing = readAiMissCountRow(rid) || {};
    const prevDateKey = String(existing && existing.dateKey ? existing.dateKey : '');
    const prevCount = clampNumber(existing && existing.count ? existing.count : 0, 0, 999999, 0);
    const nextCount = prevDateKey === todayKey ? (prevCount + add) : add;
    writeAiMissCountRow(rid, { dateKey: todayKey, count: nextCount });
}

function extractFirstJsonObject(text) {
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

function buildOfflineSyncSystemPrompt(roleId) {
    const profile = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
    const userPersona = window.userPersonas && window.userPersonas[roleId] ? window.userPersonas[roleId] : {};
    if (typeof window.buildRoleLitePrompt === 'function') {
        return window.buildRoleLitePrompt('offline_sync', roleId, {
            includeContinuity: true,
            maxSummaryLines: 10,
            sceneIntro: '当前场景是用户离线回来后的思念同步与补日记。',
            taskGuidance: '你需要根据角色与用户的关系、最近聊天余温和离线时间，生成一个离线思念次数和一篇简短心情日记。',
            outputInstructions: '只输出当前任务要求的 JSON，不要代码块，不要解释，不要多余文字。'
        });
    }
    const roleNameForAI = profile.nickName || roleId || 'TA';
    let systemPrompt = `【角色名称】${roleNameForAI}\n` + (profile.desc || '你是一个友好的AI助手');
    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }
    if (userPersona.name || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) systemPrompt += `用户名字：${userPersona.name}\n`;
        if (userPersona.setting) systemPrompt += `用户背景：${userPersona.setting}\n`;
    }
    return systemPrompt;
}

function buildOfflineSyncUserPrompt(roleId, lastTs, nowTs) {
    const profile = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
    const roleName = String(profile.nickName || roleId || 'TA');
    const offlineText = new Date(lastTs).toLocaleString('zh-CN', { hour12: false });
    const nowText = new Date(nowTs).toLocaleString('zh-CN', { hour12: false });
    return (
        `用户自 ${offlineText} 离开后，现在 ${nowText} 重新回来了。请基于你作为 ${roleName} 的性格设定：\n\n` +
        `1) 估算一下在这段时间里，你大概想念了用户多少次？(30-200 次之间)\n` +
        `2) 为昨天或今天（根据离线时间段判断）补写一篇简短的你的心情日记，字数大概 50 字左右。\n\n` +
        `请严格输出 JSON 格式：{"offline_miss_count": number, "missed_diary": {"mood_id": string, "content": string, "fake_timestamp": string}}。\n` +
        `注意：fake_timestamp 必须伪造一个在离线时间段内的合理时间，并且要落在 [${offlineText}, ${nowText}] 之间，例如半夜 2 点。\n` +
        `只输出 JSON，不要输出代码块，不要输出任何解释文字。`
    );
}

async function syncOfflineAIStatus(roleId, lastTs, nowTs) {
    const rid = String(roleId || '').trim();
    if (!rid) return false;
    if (typeof window.callAI !== 'function') return false;
    window.__offlineSyncGuardByRole = window.__offlineSyncGuardByRole || {};
    if (window.__offlineSyncGuardByRole[rid]) return false;
    window.__offlineSyncGuardByRole[rid] = true;

    const prevRole = window.currentChatRole;
    window.__offlineSyncInProgress = true;
    window.currentChatRole = rid;

    try {
        const systemPrompt = buildOfflineSyncSystemPrompt(rid);
        const userPrompt = buildOfflineSyncUserPrompt(rid, lastTs, nowTs);
        const aiText = await new Promise(function (resolve, reject) {
            window.callAI(
                systemPrompt,
                [],
                userPrompt,
                function (text) { resolve(text); },
                function (err) { reject(new Error(String(err || '请求失败'))); }
            );
        });

        const obj = extractFirstJsonObject(aiText);
        if (!obj || typeof obj !== 'object') return false;

        const missCount = clampNumber(obj.offline_miss_count, 30, 200, 0);
        if (missCount) addAiMissCountForToday(rid, missCount);

        const diary = obj.missed_diary && typeof obj.missed_diary === 'object' ? obj.missed_diary : null;
        if (diary) {
            const moodId = typeof diary.mood_id === 'string' ? diary.mood_id.trim() : '';
            const content = typeof diary.content === 'string' ? diary.content.trim() : '';
            const fakeTimestamp = typeof diary.fake_timestamp === 'string' ? diary.fake_timestamp.trim() : '';
            if (moodId && content) {
                let fakeTs = parseTimestampMaybe(fakeTimestamp);
                if (!Number.isFinite(fakeTs) || fakeTs < lastTs || fakeTs > nowTs) {
                    fakeTs = Math.floor((lastTs + nowTs) / 2);
                }
                upsertRoleDiary(rid, { mood_id: moodId, content: content, fake_timestamp: new Date(fakeTs).toISOString() });
            }
        }

        return true;
    } catch (e) {
        console.warn('syncOfflineAIStatus failed:', e);
        return false;
    } finally {
        window.__offlineSyncInProgress = false;
        window.currentChatRole = prevRole;
        window.__offlineSyncGuardByRole[rid] = false;
    }
}

async function maybeSyncOfflineAIStatusOnInit() {
    const nowTs = Date.now();
    let lastTs = NaN;
    try {
        lastTs = parseTimestampMaybe(localStorage.getItem(OFFLINE_SYNC_KEYS.lastActiveTime));
    } catch (e) { }

    if (!Number.isFinite(lastTs) || lastTs <= 0 || lastTs > nowTs) {
        try { localStorage.setItem(OFFLINE_SYNC_KEYS.lastActiveTime, String(nowTs)); } catch (e) { }
        return;
    }

    const offlineMs = nowTs - lastTs;
    const crossedMidnight = toDateKey(lastTs) !== toDateKey(nowTs);
    const offlineLongEnough = offlineMs >= 2 * 60 * 60 * 1000;

    const ids = [];
    const current = String(window.currentChatRole || '').trim();
    if (current) ids.push(current);
    try {
        const linked = String(localStorage.getItem('couple_linked_role_id_v1') || '').trim();
        const hasLinked = localStorage.getItem('couple_has_linked_v1') === 'true';
        if (hasLinked && linked) ids.push(linked);
    } catch (e) { }

    const unique = Array.from(new Set(ids)).filter(Boolean);
    if (!unique.length) {
        try { localStorage.setItem(OFFLINE_SYNC_KEYS.lastActiveTime, String(nowTs)); } catch (e) { }
        return;
    }

    for (let i = 0; i < unique.length; i++) {
        const rid = unique[i];
        const todayKey = toDateKey(nowTs);
        const needsDiary = crossedMidnight && !hasRoleDiaryForDate(rid, todayKey);
        if (needsDiary || offlineLongEnough) {
            await syncOfflineAIStatus(rid, lastTs, nowTs);
        }
    }

    try { localStorage.setItem(OFFLINE_SYNC_KEYS.lastActiveTime, String(nowTs)); } catch (e) { }
}

(function () {
    if (window.ThemeStudio) return;

    var KEYS = {
        presets: 'theme_studio_userPresets_v1',
        global: 'theme_studio_global_v1'
    };

    function safeParseJson(raw, fallback) {
        try {
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function clampNumber(v, min, max, fallback) {
        var n = typeof v === 'number' ? v : parseFloat(String(v || ''));
        if (!isFinite(n)) n = fallback;
        n = Math.max(min, Math.min(max, n));
        return n;
    }

    function normalizeHexColor(value, fallback) {
        var s = String(value || '').trim();
        if (!s) return fallback;
        if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
        return fallback;
    }

    function hexToRgb(hex) {
        var h = String(hex || '').replace('#', '');
        if (h.length !== 6) return null;
        var r = parseInt(h.slice(0, 2), 16);
        var g = parseInt(h.slice(2, 4), 16);
        var b = parseInt(h.slice(4, 6), 16);
        if (!isFinite(r) || !isFinite(g) || !isFinite(b)) return null;
        return { r: r, g: g, b: b };
    }

    function mixRgb(a, b, t) {
        var tt = Math.max(0, Math.min(1, t));
        return {
            r: Math.round(a.r + (b.r - a.r) * tt),
            g: Math.round(a.g + (b.g - a.g) * tt),
            b: Math.round(a.b + (b.b - a.b) * tt)
        };
    }

    function rgbToRgba(rgb, a) {
        var alpha = Math.max(0, Math.min(1, a));
        return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
    }

    function getDefaultThemeConfig() {
        return {
            aiColor: '#ffffff',
            userColor: '#c49c99',
            texture: 'solid',
            tailEnabled: false,
            tailTop: 14,
            tailSlim: 0,
            tailWidth: 6,
            tailHeight: 6,
            bubbleCompact: 0,
            avatarBubbleGap: 4,
            timestampEnabled: true,
            timestampPos: 'avatar',
            readEnabled: true,
            kktMerge: false,
            shadow: 8,
            aiRadius: { tl: 12, tr: 12, bl: 6, br: 12 },
            userRadius: { tl: 12, tr: 12, bl: 12, br: 6 },
            avatarVisible: true,
            avatarShape: 'circle',
            avatarSize: 40
        };
    }

    function normalizeThemeConfig(raw) {
        var base = getDefaultThemeConfig();
        var c = raw && typeof raw === 'object' ? raw : {};

        var legacyAccent = normalizeHexColor(c.accentColor, '');
        var aiColor = normalizeHexColor(c.aiColor, '');
        var userColor = normalizeHexColor(c.userColor, '');
        base.aiColor = aiColor || '#ffffff';
        base.userColor = userColor || legacyAccent || base.userColor;

        base.texture = String(c.texture || base.texture);
        if (!/^(solid|outline|matte|glass|transparent|gradient)$/.test(base.texture)) base.texture = 'solid';

        base.tailEnabled = c.tailEnabled === true;
        base.tailTop = clampNumber(c.tailTop, 0, 28, base.tailTop);
        base.tailSlim = clampNumber(c.tailSlim, 0, 100, base.tailSlim);
        base.tailWidth = clampNumber(c.tailWidth, 2, 16, base.tailWidth);
        base.tailHeight = clampNumber(c.tailHeight, 2, 14, base.tailHeight);

        base.bubbleCompact = clampNumber(c.bubbleCompact, 0, 100, base.bubbleCompact);

        base.avatarBubbleGap = clampNumber(c.avatarBubbleGap, 0, 24, base.avatarBubbleGap);

        base.timestampEnabled = c.timestampEnabled !== false;
        base.timestampPos = String(c.timestampPos || base.timestampPos);
        if (base.timestampPos !== 'avatar' && base.timestampPos !== 'bubble') base.timestampPos = 'avatar';

        base.readEnabled = c.readEnabled !== false;

        base.kktMerge = !!c.kktMerge;
        base.shadow = clampNumber(c.shadow, 0, 24, base.shadow);

        base.avatarVisible = c.avatarVisible !== false;
        base.avatarShape = c.avatarShape === 'squircle' ? 'squircle' : 'circle';
        base.avatarSize = clampNumber(c.avatarSize, 24, 50, base.avatarSize);

        base.aiRadius = {
            tl: clampNumber(c.aiRadius && c.aiRadius.tl, 0, 30, base.aiRadius.tl),
            tr: clampNumber(c.aiRadius && c.aiRadius.tr, 0, 30, base.aiRadius.tr),
            bl: clampNumber(c.aiRadius && c.aiRadius.bl, 0, 30, base.aiRadius.bl),
            br: clampNumber(c.aiRadius && c.aiRadius.br, 0, 30, base.aiRadius.br)
        };
        base.userRadius = {
            tl: clampNumber(c.userRadius && c.userRadius.tl, 0, 30, base.userRadius.tl),
            tr: clampNumber(c.userRadius && c.userRadius.tr, 0, 30, base.userRadius.tr),
            bl: clampNumber(c.userRadius && c.userRadius.bl, 0, 30, base.userRadius.bl),
            br: clampNumber(c.userRadius && c.userRadius.br, 0, 30, base.userRadius.br)
        };

        return base;
    }

    function buildBubbleMaterial(texture, rgb, shadowStrength, isAi) {
        var s = clampNumber(shadowStrength, 0, 24, 8);
        var shadowAlpha = Math.max(0, Math.min(0.22, s / 24 * 0.22));
        var shadow = shadowAlpha > 0 ? ('0 10px 26px rgba(0,0,0,' + shadowAlpha.toFixed(3) + ')') : 'none';

        var bg = rgbToRgba(rgb, 1);
        var border = isAi ? '1px solid rgba(0,0,0,0.06)' : 'none';
        var backdrop = 'none';
        var arrow = bg;

        if (texture === 'outline') {
            bg = 'transparent';
            border = '1px solid ' + rgbToRgba(rgb, 0.62);
            arrow = 'transparent';
            shadow = 'none';
        } else if (texture === 'matte') {
            bg = rgbToRgba(rgb, 0.22);
            border = '1px solid rgba(255,255,255,0.35)';
            backdrop = 'blur(6px)';
            arrow = bg;
        } else if (texture === 'glass') {
            bg = 'linear-gradient(135deg,' + rgbToRgba(rgb, 0.28) + ',' + rgbToRgba({ r: 255, g: 255, b: 255 }, 0.18) + ')';
            border = '1px solid rgba(255,255,255,0.26)';
            backdrop = 'blur(14px) saturate(1.12)';
            arrow = rgbToRgba(rgb, 0.22);
        } else if (texture === 'transparent') {
            bg = rgbToRgba(rgb, 0.08);
            border = '1px solid rgba(0,0,0,0.06)';
            shadow = 'none';
            arrow = bg;
        } else if (texture === 'gradient') {
            var d1 = rgbToRgba(rgb, 0.95);
            var d2 = rgbToRgba(mixRgb(rgb, { r: 0, g: 0, b: 0 }, 0.08), 0.92);
            bg = 'linear-gradient(135deg,' + d1 + ',' + d2 + ')';
            border = 'none';
            arrow = rgbToRgba(rgb, 0.92);
        }

        return { bg: bg, border: border, backdrop: backdrop, shadow: shadow, arrow: arrow };
    }

    function computeTextColor(rgb) {
        var r = rgb && typeof rgb.r === 'number' ? rgb.r : 0;
        var g = rgb && typeof rgb.g === 'number' ? rgb.g : 0;
        var b = rgb && typeof rgb.b === 'number' ? rgb.b : 0;
        var l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return l < 0.56 ? '#ffffff' : '#000000';
    }

    var THEME_VAR_NAMES = [
        '--chat-ai-bubble-bg', '--chat-ai-bubble-border', '--chat-ai-bubble-backdrop', '--chat-ai-bubble-shadow', '--chat-ai-bubble-arrow', '--chat-ai-bubble-color',
        '--chat-user-bubble-bg', '--chat-user-bubble-border', '--chat-user-bubble-backdrop', '--chat-user-bubble-shadow', '--chat-user-bubble-arrow', '--chat-user-bubble-color',
        '--chat-ai-radius-tl', '--chat-ai-radius-tr', '--chat-ai-radius-bl', '--chat-ai-radius-br',
        '--chat-user-radius-tl', '--chat-user-radius-tr', '--chat-user-radius-bl', '--chat-user-radius-br',
        '--chat-avatar-size', '--chat-avatar-radius', '--chat-avatar-bubble-gap',
        '--chat-tail-top', '--chat-tail-width', '--chat-tail-height',
        '--chat-bubble-pad-y', '--chat-bubble-line-height'
    ];

    function readRoleBubbleCssFromStorage(roleId) {
        var id = String(roleId || '').trim();
        if (!id) return '';
        var raw = localStorage.getItem('chat_settings_by_role') || '{}';
        var all = safeParseJson(raw, {});
        var item = all && typeof all === 'object' ? all[id] : null;
        var css = item && typeof item === 'object' ? (item.bubbleCss || '') : '';
        return String(css || '');
    }

    function readAllBubbleCssText(roleId) {
        var parts = [];
        try {
            parts.push(String(localStorage.getItem('chat_bubble_css') || ''));
        } catch (e0) { }

        try {
            if (window.getCurrentChatSettings && typeof window.getCurrentChatSettings === 'function') {
                var s = window.getCurrentChatSettings(String(roleId || ''));
                if (s && typeof s === 'object' && s.bubbleCss) parts.push(String(s.bubbleCss));
            } else {
                parts.push(readRoleBubbleCssFromStorage(roleId));
            }
        } catch (e1) { }

        try {
            var el1 = document.getElementById('chat-bubble-css-style');
            if (el1 && el1.textContent) parts.push(String(el1.textContent));
        } catch (e2) { }

        try {
            var el2 = document.getElementById('user-custom-css');
            if (el2 && el2.textContent) parts.push(String(el2.textContent));
        } catch (e3) { }

        return parts.join('\n');
    }

    function getThemeVarOverrides(roleId) {
        var css = readAllBubbleCssText(roleId);
        var trimmed = String(css || '').trim();
        var map = {};
        if (!trimmed) return map;
        for (var i = 0; i < THEME_VAR_NAMES.length; i++) {
            var name = THEME_VAR_NAMES[i];
            if (trimmed.indexOf(name) >= 0) map[name] = true;
        }
        return map;
    }

    function setVarIfAllowed(style, name, value, overrides) {
        if (!style) return;
        if (overrides && overrides[name]) return;
        style.setProperty(name, value);
    }

    function applyConfigToStyle(style, config, overrides) {
        if (!style || !config) return;

        var aiRgb = hexToRgb(normalizeHexColor(config.aiColor, '#ffffff')) || { r: 255, g: 255, b: 255 };
        var userRgb = hexToRgb(normalizeHexColor(config.userColor, '#c49c99')) || { r: 196, g: 156, b: 153 };
        var texture = String(config.texture || 'solid');

        var ai = buildBubbleMaterial(texture, aiRgb, config.shadow, true);
        var user = buildBubbleMaterial(texture, userRgb, config.shadow, false);

        try {
            setVarIfAllowed(style, '--chat-ai-bubble-bg', ai.bg, overrides);
            setVarIfAllowed(style, '--chat-ai-bubble-border', ai.border, overrides);
            setVarIfAllowed(style, '--chat-ai-bubble-backdrop', ai.backdrop, overrides);
            setVarIfAllowed(style, '--chat-ai-bubble-shadow', ai.shadow, overrides);
            setVarIfAllowed(style, '--chat-ai-bubble-arrow', ai.arrow, overrides);
            setVarIfAllowed(style, '--chat-ai-bubble-color', computeTextColor(aiRgb), overrides);

            setVarIfAllowed(style, '--chat-user-bubble-bg', user.bg, overrides);
            setVarIfAllowed(style, '--chat-user-bubble-border', user.border, overrides);
            setVarIfAllowed(style, '--chat-user-bubble-backdrop', user.backdrop, overrides);
            setVarIfAllowed(style, '--chat-user-bubble-shadow', user.shadow, overrides);
            setVarIfAllowed(style, '--chat-user-bubble-arrow', user.arrow, overrides);
            setVarIfAllowed(style, '--chat-user-bubble-color', computeTextColor(userRgb), overrides);

            setVarIfAllowed(style, '--chat-ai-radius-tl', clampNumber(config.aiRadius && config.aiRadius.tl, 0, 30, 12) + 'px', overrides);
            setVarIfAllowed(style, '--chat-ai-radius-tr', clampNumber(config.aiRadius && config.aiRadius.tr, 0, 30, 12) + 'px', overrides);
            setVarIfAllowed(style, '--chat-ai-radius-bl', clampNumber(config.aiRadius && config.aiRadius.bl, 0, 30, 6) + 'px', overrides);
            setVarIfAllowed(style, '--chat-ai-radius-br', clampNumber(config.aiRadius && config.aiRadius.br, 0, 30, 12) + 'px', overrides);
            setVarIfAllowed(style, '--chat-user-radius-tl', clampNumber(config.userRadius && config.userRadius.tl, 0, 30, 12) + 'px', overrides);
            setVarIfAllowed(style, '--chat-user-radius-tr', clampNumber(config.userRadius && config.userRadius.tr, 0, 30, 12) + 'px', overrides);
            setVarIfAllowed(style, '--chat-user-radius-bl', clampNumber(config.userRadius && config.userRadius.bl, 0, 30, 12) + 'px', overrides);
            setVarIfAllowed(style, '--chat-user-radius-br', clampNumber(config.userRadius && config.userRadius.br, 0, 30, 6) + 'px', overrides);

            setVarIfAllowed(style, '--chat-avatar-size', clampNumber(config.avatarSize, 24, 50, 40) + 'px', overrides);
            setVarIfAllowed(style, '--chat-avatar-radius', config.avatarShape === 'circle' ? '50%' : '35%', overrides);
            setVarIfAllowed(style, '--chat-avatar-bubble-gap', clampNumber(config.avatarBubbleGap, 0, 24, 4) + 'px', overrides);

            setVarIfAllowed(style, '--chat-tail-top', clampNumber(config.tailTop, 0, 28, 14) + 'px', overrides);
            var slim = clampNumber(config.tailSlim, 0, 100, 0);
            var w = clampNumber(6 + (slim / 100) * 10, 2, 16, 6);
            setVarIfAllowed(style, '--chat-tail-width', w + 'px', overrides);
            setVarIfAllowed(style, '--chat-tail-height', '6px', overrides);

            var compact = clampNumber(config.bubbleCompact, 0, 100, 0);
            var padY = clampNumber(9 - (compact / 100) * 5, 4, 9, 9);
            var lh = Math.max(1.18, 1.5 - (compact / 100) * 0.28);
            setVarIfAllowed(style, '--chat-bubble-pad-y', padY.toFixed(2) + 'px', overrides);
            setVarIfAllowed(style, '--chat-bubble-line-height', lh.toFixed(3), overrides);
        } catch (e) { }
    }

    function readPresets() {
        var list = safeParseJson(localStorage.getItem(KEYS.presets), []);
        return Array.isArray(list) ? list : [];
    }

    function readGlobalConfig() {
        var raw = safeParseJson(localStorage.getItem(KEYS.global), null);
        if (!raw || typeof raw !== 'object') return null;
        return raw;
    }

    function findPresetConfig(presetId) {
        var pid = String(presetId || '');
        if (!pid) return null;
        var list = readPresets();
        for (var i = 0; i < list.length; i++) {
            var p = list[i];
            if (p && String(p.id || '') === pid && p.config && typeof p.config === 'object') {
                return p.config;
            }
        }
        return null;
    }

    function getEffectiveConfig(roleId) {
        // 自定义气泡预设现在只负责保存和预览，不再绑定到角色。
        return null;
    }

    function refreshKktMarkers(chatEl, kktEnabled) {
        var el = chatEl;
        if (!el) return;
        var rows = el.querySelectorAll ? el.querySelectorAll('.msg-row') : [];
        var list = Array.prototype.slice.call(rows || []);
        for (var i = 0; i < list.length; i++) {
            var row = list[i];
            if (!row || !row.classList) continue;
            var isLeft = row.classList.contains('msg-left');
            var isRight = row.classList.contains('msg-right');
            if (!isLeft && !isRight) {
                try { row.removeAttribute('data-kkt-not-last'); } catch (e0) { }
                try { row.removeAttribute('data-kkt-head'); } catch (e1) { }
                continue;
            }
            if (!kktEnabled) {
                try { row.removeAttribute('data-kkt-not-last'); } catch (e2) { }
                try { row.removeAttribute('data-kkt-head'); } catch (e3) { }
                continue;
            }
            var prev = list[i - 1];
            var next = list[i + 1];
            var prevSame = !!(prev && prev.classList && ((isLeft && prev.classList.contains('msg-left')) || (isRight && prev.classList.contains('msg-right'))));
            var nextSame = !!(next && next.classList && ((isLeft && next.classList.contains('msg-left')) || (isRight && next.classList.contains('msg-right'))));
            try { row.setAttribute('data-kkt-head', prevSame ? '0' : '1'); } catch (e4) { }
            try { row.setAttribute('data-kkt-not-last', nextSame ? '1' : '0'); } catch (e5) { }
        }
    }

    function ensureKktObserver(el) {
        if (!el || el.__themeKktObserver) return;
        try {
            var pending = 0;
            var run = function () {
                pending = 0;
                var kkt = false;
                try { kkt = el.getAttribute('data-chat-kkt') === '1'; } catch (e0) { }
                refreshKktMarkers(el, kkt);
            };
            var obs = new MutationObserver(function () {
                if (pending) return;
                pending = 1;
                try { queueMicrotask(run); } catch (e1) { setTimeout(run, 0); }
            });
            obs.observe(el, { childList: true, subtree: true });
            el.__themeKktObserver = obs;
        } catch (e2) { }
    }

    function applyThemeToChat(roleId, chatEl) {
        var el = chatEl || document.getElementById('chat-room-layer');
        if (!el) return;
        var config = getEffectiveConfig(roleId);
        if (!config) {
            resetThemeToSystemDefault(el);
            return;
        }
        var overrides = getThemeVarOverrides(roleId);
        applyConfigToStyle(el.style, config, overrides);
        try {
            el.setAttribute('data-chat-avatar', config.avatarVisible ? '1' : '0');
            el.setAttribute('data-chat-kkt', config.kktMerge ? '1' : '0');
            el.setAttribute('data-chat-tail', config.tailEnabled ? '1' : '0');
            el.setAttribute('data-chat-ts', config.timestampEnabled ? '1' : '0');
            el.setAttribute('data-chat-tspos', String(config.timestampPos || 'avatar'));
            el.setAttribute('data-chat-read', config.readEnabled ? '1' : '0');
        } catch (e) { }
        refreshKktMarkers(el, !!config.kktMerge);
        ensureKktObserver(el);
    }

    function applyGlobalThemeConfig(config) {
        // 旧版全局气泡配置保留空接口，避免自定义气泡影响全局美化 CSS。
    }

    function resetThemeToSystemDefault(chatEl) {
        var el = chatEl || document.getElementById('chat-room-layer');
        if (!el) return;
        try {
            for (var i = 0; i < THEME_VAR_NAMES.length; i++) {
                el.style.removeProperty(THEME_VAR_NAMES[i]);
            }
        } catch (e0) { }
        try {
            el.removeAttribute('data-chat-avatar');
            el.removeAttribute('data-chat-kkt');
            el.removeAttribute('data-chat-tail');
            el.removeAttribute('data-chat-ts');
            el.removeAttribute('data-chat-tspos');
            el.removeAttribute('data-chat-read');
        } catch (e1) { }
        refreshKktMarkers(el, false);
    }

    function resetGlobalThemeToSystemDefault() {
        try {
            for (var i = 0; i < THEME_VAR_NAMES.length; i++) {
                document.documentElement.style.removeProperty(THEME_VAR_NAMES[i]);
            }
        } catch (e0) { }
        resetThemeToSystemDefault(document.getElementById('chat-room-layer'));
    }

    window.ThemeStudio = {
        applyThemeToChat: applyThemeToChat,
        applyGlobalThemeConfig: applyGlobalThemeConfig,
        getEffectiveConfig: getEffectiveConfig,
        resetThemeToSystemDefault: resetThemeToSystemDefault,
        resetGlobalThemeToSystemDefault: resetGlobalThemeToSystemDefault
    };

})();

let initDataPromise = null;
async function initData(options) {
    const forceReload = !!(options && options.forceReload);
    if (!forceReload && initDataPromise) return initDataPromise;

    DB.configLargeStore();

    initDataPromise = (async function () {
        if (window.WechatStore && typeof window.WechatStore.init === 'function') {
            await window.WechatStore.init({ forceReload: forceReload });
            return;
        }

        if (!DB.isLargeStoreReady()) {
            try {
                const savedProfiles = localStorage.getItem(DB.keys.charProfiles);
                const savedChatData = localStorage.getItem(DB.keys.chatData);
                const savedChatMapData = localStorage.getItem(DB.keys.chatMapData);
                const savedPersonas = localStorage.getItem(DB.keys.userPersonas);
                const savedBgs = localStorage.getItem(DB.keys.chatBackgrounds);
                const savedCallLogs = localStorage.getItem(DB.keys.callLogs);
                const savedUnread = localStorage.getItem(DB.keys.chatUnread);
                const savedFamilyCards = localStorage.getItem(DB.keys.familyCards);
                const savedStickerData = localStorage.getItem('stickerData_v2') || localStorage.getItem('stickerData');

                if (savedProfiles) window.charProfiles = normalizeStoredValue(savedProfiles, {});
                if (savedChatData) window.chatData = normalizeStoredValue(savedChatData, {});
                if (savedChatMapData) window.chatMapData = normalizeStoredValue(savedChatMapData, {});
                if (savedPersonas) window.userPersonas = normalizeStoredValue(savedPersonas, {});
                if (savedBgs) window.chatBackgrounds = normalizeStoredValue(savedBgs, {});
                if (savedCallLogs) window.callLogs = normalizeStoredValue(savedCallLogs, {});
                if (savedUnread) window.chatUnread = normalizeStoredValue(savedUnread, {});
                if (savedFamilyCards) window.familyCardState = normalizeStoredValue(savedFamilyCards, {});
                if (savedStickerData) window.stickerData = normalizeStoredValue(savedStickerData, null);
            } catch (e) { console.error("读取存档失败", e); }
            return;
        }

        const keys = Object.values(DB.keys);
        for (const key of keys) {
            let raw = '';
            try { raw = localStorage.getItem(key); } catch (e0) { raw = ''; }
            if (!raw) continue;
            const localValue = normalizeStoredValue(raw, {});
            let forageValue = null;
            try {
                forageValue = await window.localforage.getItem(key);
            } catch (e1) {
                forageValue = null;
            }
            const value = pickStorageRecordValue(key, localValue, forageValue);
            try {
                await window.localforage.setItem(key, value);
            } catch (e) {
                console.error("迁移存档失败", key, e);
            }
        }

        try {
            const legacyStickerRaw = localStorage.getItem('stickerData_v2') || localStorage.getItem('stickerData');
            if (legacyStickerRaw) {
                const legacyStickerValue = normalizeStoredValue(legacyStickerRaw, null);
                if (legacyStickerValue && typeof legacyStickerValue === 'object') {
                    await window.localforage.setItem(DB.keys.stickerData, legacyStickerValue);
                }
            }
        } catch (e) {
            console.error("迁移表情包存档失败", e);
        }

        const values = await Promise.all(keys.map(function (k) {
            return window.localforage.getItem(k).catch(function () {
                return readLocalStorageJsonMirror(k, null);
            });
        }));
        const byKey = {};
        for (let i = 0; i < keys.length; i++) {
            byKey[keys[i]] = values[i];
        }

        window.charProfiles = normalizeStoredValue(byKey[DB.keys.charProfiles], window.charProfiles || {});
        window.chatData = normalizeStoredValue(byKey[DB.keys.chatData], window.chatData || {});
        window.chatMapData = normalizeStoredValue(byKey[DB.keys.chatMapData], window.chatMapData || {});
        window.userPersonas = normalizeStoredValue(byKey[DB.keys.userPersonas], window.userPersonas || {});
        window.chatBackgrounds = normalizeStoredValue(byKey[DB.keys.chatBackgrounds], window.chatBackgrounds || {});
        window.callLogs = normalizeStoredValue(byKey[DB.keys.callLogs], window.callLogs || {});
        window.chatUnread = normalizeStoredValue(byKey[DB.keys.chatUnread], window.chatUnread || {});
        window.familyCardState = normalizeStoredValue(byKey[DB.keys.familyCards], window.familyCardState || {});
        window.stickerData = normalizeStoredValue(await window.localforage.getItem(DB.keys.stickerData), window.stickerData || null);
        syncLegacyWechatMirror();
    })();

    try {
        return await initDataPromise;
    } catch (e) {
        if (!forceReload) initDataPromise = null;
        throw e;
    }
}

let saveDataTimerId = null;
let saveDataWaiters = [];
let saveDataFlushInFlight = null;
let legacyWechatMirrorWarned = false;

function syncLegacyWechatMirror() {
    if (!legacyWechatMirrorWarned) {
        legacyWechatMirrorWarned = true;
        console.info('[WechatStorage] 正式联系人/聊天数据已切换到 wechat_v2，跳过旧 localStorage 镜像写入');
    }
}

async function flushSaveData() {
    DB.configLargeStore();

    if (window.WechatStore && typeof window.WechatStore.saveSnapshotFromWindow === 'function') {
        await window.WechatStore.saveSnapshotFromWindow();
        return;
    }

    if (!DB.isLargeStoreReady()) {
        localStorage.setItem(DB.keys.charProfiles, JSON.stringify(window.charProfiles));
        localStorage.setItem(DB.keys.chatData, JSON.stringify(window.chatData));
        localStorage.setItem(DB.keys.chatMapData, JSON.stringify(window.chatMapData));
        localStorage.setItem(DB.keys.userPersonas, JSON.stringify(window.userPersonas));
        localStorage.setItem(DB.keys.chatBackgrounds, JSON.stringify(window.chatBackgrounds));
        localStorage.setItem(DB.keys.callLogs, JSON.stringify(window.callLogs));
        localStorage.setItem(DB.keys.chatUnread, JSON.stringify(window.chatUnread));
        localStorage.setItem(DB.keys.familyCards, JSON.stringify(window.familyCardState));
        localStorage.setItem('stickerData_v2', JSON.stringify(window.stickerData || null));
        return;
    }

    await Promise.all([
        window.localforage.setItem(DB.keys.charProfiles, window.charProfiles || {}),
        window.localforage.setItem(DB.keys.chatData, window.chatData || {}),
        window.localforage.setItem(DB.keys.chatMapData, window.chatMapData || {}),
        window.localforage.setItem(DB.keys.userPersonas, window.userPersonas || {}),
        window.localforage.setItem(DB.keys.chatBackgrounds, window.chatBackgrounds || {}),
        window.localforage.setItem(DB.keys.callLogs, window.callLogs || {}),
        window.localforage.setItem(DB.keys.chatUnread, window.chatUnread || {}),
        window.localforage.setItem(DB.keys.familyCards, window.familyCardState || {}),
        window.localforage.setItem(DB.keys.stickerData, window.stickerData || null)
    ]);

    syncLegacyWechatMirror();
}

async function drainSaveDataQueue() {
    const waiters = saveDataWaiters.slice();
    saveDataWaiters = [];

    if (saveDataTimerId) {
        clearTimeout(saveDataTimerId);
        saveDataTimerId = null;
    }

    try {
        await flushSaveData();
        waiters.forEach(w => w.resolve());
    } catch (e) {
        waiters.forEach(w => w.reject(e));
        throw e;
    }
}

function flushSaveDataImmediately() {
    if (saveDataFlushInFlight) return saveDataFlushInFlight;
    saveDataFlushInFlight = drainSaveDataQueue().finally(function () {
        saveDataFlushInFlight = null;
    });
    return saveDataFlushInFlight;
}

async function saveData() {
    return new Promise(function (resolve, reject) {
        saveDataWaiters.push({ resolve: resolve, reject: reject });

        if (saveDataTimerId) {
            clearTimeout(saveDataTimerId);
        }

        saveDataTimerId = setTimeout(function () {
            flushSaveDataImmediately().catch(function (e) {
                console.error('延迟保存聊天数据失败', e);
            });
        }, 1000);
    });
}

document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'hidden') return;
    flushSaveDataImmediately().catch(function (e) {
        console.error('页面隐藏时保存聊天数据失败', e);
    });
});

window.addEventListener('pagehide', function () {
    flushSaveDataImmediately().catch(function (e) {
        console.error('页面离开时保存聊天数据失败', e);
    });
});

window.initData = initData;
window.saveData = saveData;
window.flushSaveDataImmediately = flushSaveDataImmediately;
initData().catch(function (e) { console.error(e); });

// --- 全局变量 ---
window.chatData = window.chatData || {};
window.chatMapData = window.chatMapData || {};
window.charProfiles = window.charProfiles || {};
window.userPersonas = window.userPersonas || {};
window.chatBackgrounds = window.chatBackgrounds || {};
window.callLogs = window.callLogs || {};
window.currentChatRole = localStorage.getItem('currentChatId') || "";
const STICKER_STORE_VERSION = 2;
const STICKER_STORE_PRIMARY_KEY = 'stickerData_v2';
const STICKER_STORE_LEGACY_KEY = 'stickerData';
const STICKER_DEFAULT_SCOPE = '__default__';
const STICKER_DEFAULT_CATEGORY_ID = 'default';
const STICKER_DEFAULT_CATEGORY_NAME = '默认';
window.stickerData = window.stickerData || null;
window.voiceCallState = window.voiceCallState || {
    active: false,
    connected: false,
    seconds: 0,
    roleId: "",
    timerId: null,
    connectTimeoutId: null,
    chatSyncIntervalId: null,
    isVideo: false,
    userCameraStream: null,
    userCameraOn: false,
    facingMode: 'user'
};
window.isVoiceCallActive = window.isVoiceCallActive || false;
window.voiceCallHistory = window.voiceCallHistory || [];
window.editVideoAlbumData = window.editVideoAlbumData || [];
window.chatUnread = window.chatUnread || {};
window.familyCardState = window.familyCardState || { receivedCards: [], sentCards: [] };
window.virtualPhotoImagePath = window.virtualPhotoImagePath || 'assets/images/chatphoto.jpg';

function makeStickerEntryId() {
    return 'stk_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function makeStickerCategoryId() {
    return 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function getStickerScopeKey(roleId) {
    const key = String(roleId || '').trim();
    return key || STICKER_DEFAULT_SCOPE;
}

function getStickerRoleSnapshotKey(roleId) {
    const key = getStickerScopeKey(roleId);
    return 'stickerData_role_' + encodeURIComponent(key);
}

function readStickerRoleSnapshot(roleId) {
    try {
        const raw = localStorage.getItem(getStickerRoleSnapshotKey(roleId)) || '';
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return normalizeStickerScope(parsed);
    } catch (e) {
        return null;
    }
}

function writeStickerRoleSnapshot(roleId, scope) {
    try {
        localStorage.setItem(getStickerRoleSnapshotKey(roleId), JSON.stringify(normalizeStickerScope(scope)));
    } catch (e) { }
}

function removeStickerRoleSnapshot(roleId) {
    try {
        localStorage.removeItem(getStickerRoleSnapshotKey(roleId));
    } catch (e) { }
}

function clearLegacyStickerRoleSnapshots(preserveKeys) {
    const keep = preserveKeys && typeof preserveKeys.has === 'function' ? preserveKeys : new Set();
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const rawKey = localStorage.key(i);
            if (!rawKey || rawKey.indexOf('stickerData_role_') !== 0) continue;
            const encodedRoleId = rawKey.slice('stickerData_role_'.length);
            const roleId = decodeURIComponent(encodedRoleId || '');
            const scopeKey = getStickerScopeKey(roleId);
            if (keep.has(scopeKey)) continue;
            keysToRemove.push(rawKey);
        }
        for (let i = 0; i < keysToRemove.length; i++) {
            localStorage.removeItem(keysToRemove[i]);
        }
    } catch (e) { }
}

function readAllStickerRoleSnapshots() {
    const result = {};
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const rawKey = localStorage.key(i);
            if (!rawKey || rawKey.indexOf('stickerData_role_') !== 0) continue;
            const encodedRoleId = rawKey.slice('stickerData_role_'.length);
            const roleId = decodeURIComponent(encodedRoleId || '');
            const scope = readStickerRoleSnapshot(roleId);
            if (!scope) continue;
            result[getStickerScopeKey(roleId)] = normalizeStickerScope(scope);
        }
    } catch (e) { }
    return result;
}

function createEmptyStickerScope() {
    return {
        categories: [
            { id: STICKER_DEFAULT_CATEGORY_ID, name: STICKER_DEFAULT_CATEGORY_NAME }
        ],
        tabs: {
            mine: [],
            his: [],
            general: []
        }
    };
}

function normalizeStickerCategoryEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const id = String(entry.id || '').trim() || makeStickerCategoryId();
    const name = String(entry.name || '').trim();
    if (!name) return null;
    return { id: id, name: name };
}

function normalizeStickerItemEntry(item) {
    if (!item) return null;
    if (typeof item === 'string') {
        const srcText = String(item || '').trim();
        if (!srcText) return null;
        return {
            id: makeStickerEntryId(),
            name: '',
            src: srcText,
            categoryId: STICKER_DEFAULT_CATEGORY_ID
        };
    }
    if (typeof item !== 'object') return null;
    const src = String(item.src || item.url || item.href || '').trim();
    if (!src) return null;
    return {
        id: String(item.id || '').trim() || makeStickerEntryId(),
        name: String(item.name || '').trim(),
        src: src,
        categoryId: String(item.categoryId || '').trim() || STICKER_DEFAULT_CATEGORY_ID
    };
}

function normalizeStickerTabItems(list) {
    if (!Array.isArray(list)) return [];
    const result = [];
    for (let i = 0; i < list.length; i++) {
        const item = normalizeStickerItemEntry(list[i]);
        if (item) result.push(item);
    }
    return result;
}

function getStickerDuplicateUrlKey(rawUrl) {
    const raw = String(rawUrl || '').trim();
    if (!raw) return '';
    try {
        const url = new URL(raw, window.location && window.location.href ? window.location.href : undefined);
        url.hash = '';
        return url.href;
    } catch (e) {
        return raw.replace(/\s+/g, '');
    }
}

function dedupeStickerScopeTabs(tabs) {
    const src = tabs && typeof tabs === 'object' ? tabs : {};
    const seen = new Set();
    ['mine', 'his', 'general'].forEach(function (tabKey) {
        const list = Array.isArray(src[tabKey]) ? src[tabKey] : [];
        src[tabKey] = list.filter(function (item) {
            const key = getStickerDuplicateUrlKey(item && item.src);
            if (!key) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    });
    return src;
}

function normalizeStickerScope(scope) {
    const base = createEmptyStickerScope();
    const src = scope && typeof scope === 'object' ? scope : {};
    const rawTabs = src.tabs && typeof src.tabs === 'object'
        ? src.tabs
        : {
            mine: src.mine,
            his: src.his,
            general: src.general
        };
    base.tabs.mine = normalizeStickerTabItems(rawTabs.mine);
    base.tabs.his = normalizeStickerTabItems(rawTabs.his);
    base.tabs.general = normalizeStickerTabItems(rawTabs.general);
    base.tabs = dedupeStickerScopeTabs(base.tabs);

    const seen = new Set();
    const normalizedCategories = [];
    const rawCategories = Array.isArray(src.categories) ? src.categories : [];
    for (let i = 0; i < rawCategories.length; i++) {
        const item = normalizeStickerCategoryEntry(rawCategories[i]);
        if (!item) continue;
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        normalizedCategories.push(item);
    }
    if (!seen.has(STICKER_DEFAULT_CATEGORY_ID)) {
        normalizedCategories.unshift({
            id: STICKER_DEFAULT_CATEGORY_ID,
            name: STICKER_DEFAULT_CATEGORY_NAME
        });
    }
    base.categories = normalizedCategories;
    return base;
}

function normalizeStickerStore(raw, activeRoleId) {
    const normalized = {
        version: STICKER_STORE_VERSION,
        roleScopes: {}
    };
    const source = raw && typeof raw === 'object' ? raw : {};
    const roleScopes = source.roleScopes && typeof source.roleScopes === 'object' ? source.roleScopes : null;
    if (roleScopes) {
        Object.keys(roleScopes).forEach(function (key) {
            normalized.roleScopes[key] = normalizeStickerScope(roleScopes[key]);
        });
    }
    if (!Object.keys(normalized.roleScopes).length) {
        const legacyHasData = Array.isArray(source.mine) || Array.isArray(source.his) || Array.isArray(source.general);
        const legacyTabs = source.tabs && typeof source.tabs === 'object';
        if (legacyHasData || legacyTabs) {
            normalized.roleScopes[getStickerScopeKey(activeRoleId)] = normalizeStickerScope(source);
        }
    }
    if (!Object.keys(normalized.roleScopes).length) {
        const snapshots = readAllStickerRoleSnapshots();
        Object.keys(snapshots).forEach(function (key) {
            normalized.roleScopes[key] = normalizeStickerScope(snapshots[key]);
        });
    }
    return normalized;
}

function ensureStickerStore(forcePersist) {
    const previous = window.stickerData;
    const normalized = normalizeStickerStore(previous, window.currentChatRole || STICKER_DEFAULT_SCOPE);
    const key = getStickerScopeKey(window.currentChatRole);
    if (!normalized.roleScopes[key]) {
        normalized.roleScopes[key] = createEmptyStickerScope();
    } else {
        normalized.roleScopes[key] = normalizeStickerScope(normalized.roleScopes[key]);
    }
    window.stickerData = normalized;
    window.__lastStickerHydrateDebug = {
        at: Date.now(),
        activeScope: key,
        scopes: Object.keys(normalized.roleScopes || {})
    };
    if (forcePersist || !previous || previous.version !== STICKER_STORE_VERSION) {
        try {
            const serialized = JSON.stringify(window.stickerData);
            localStorage.setItem(STICKER_STORE_PRIMARY_KEY, serialized);
            localStorage.setItem(STICKER_STORE_LEGACY_KEY, serialized);
            clearLegacyStickerRoleSnapshots();
        } catch (e) { }
    }
    return window.stickerData;
}

function getStickerScopeForRole(roleId) {
    const store = ensureStickerStore(false);
    const key = getStickerScopeKey(roleId);
    if (!store.roleScopes[key]) {
        store.roleScopes[key] = createEmptyStickerScope();
    }
    return store.roleScopes[key];
}

function persistStickerData() {
    ensureStickerStore(false);
    try {
        const store = window.stickerData && typeof window.stickerData === 'object' ? window.stickerData : { version: STICKER_STORE_VERSION, roleScopes: {} };
        const roleScopes = store.roleScopes && typeof store.roleScopes === 'object' ? store.roleScopes : {};
        window.stickerData = store;
        const serialized = JSON.stringify(window.stickerData);
        localStorage.setItem(STICKER_STORE_PRIMARY_KEY, serialized);
        localStorage.setItem(STICKER_STORE_LEGACY_KEY, serialized);
        clearLegacyStickerRoleSnapshots();
        window.__lastStickerPersistDebug = {
            at: Date.now(),
            scopes: Object.keys(roleScopes),
            currentRole: getStickerScopeKey(window.currentChatRole),
            scopeSizes: Object.keys(roleScopes).reduce(function (acc, roleKey) {
                const scope = roleScopes[roleKey] || {};
                const tabs = scope.tabs && typeof scope.tabs === 'object' ? scope.tabs : {};
                acc[roleKey] = {
                    categories: Array.isArray(scope.categories) ? scope.categories.length : 0,
                    mine: Array.isArray(tabs.mine) ? tabs.mine.length : 0,
                    his: Array.isArray(tabs.his) ? tabs.his.length : 0,
                    general: Array.isArray(tabs.general) ? tabs.general.length : 0
                };
                return acc;
            }, {})
        };
    } catch (e) { }
    try {
        if (DB.isLargeStoreReady() && window.localforage && typeof window.localforage.setItem === 'function') {
            window.localforage.setItem(DB.keys.stickerData, window.stickerData || null).then(function () {
                try {
                    const info = window.__lastStickerPersistDebug && typeof window.__lastStickerPersistDebug === 'object'
                        ? window.__lastStickerPersistDebug
                        : {};
                    info.largeStoreSavedAt = Date.now();
                    info.largeStore = true;
                    window.__lastStickerPersistDebug = info;
                    window.__lastStickerPersistErrorDebug = null;
                } catch (e1) { }
            }).catch(function (err) {
                try {
                    window.__lastStickerPersistErrorDebug = {
                        at: Date.now(),
                        message: err && err.message ? String(err.message) : String(err || 'unknown error'),
                        stack: err && err.stack ? String(err.stack) : ''
                    };
                } catch (e1) { }
            });
        } else {
            window.__lastStickerPersistErrorDebug = null;
        }
    } catch (e) {
        try {
            window.__lastStickerPersistErrorDebug = {
                at: Date.now(),
                message: e && e.message ? String(e.message) : String(e || 'unknown error'),
                stack: e && e.stack ? String(e.stack) : ''
            };
        } catch (e1) { }
    }
}

function ensureStickerCategory(roleId, name) {
    const scope = getStickerScopeForRole(roleId);
    const cleanName = String(name || '').trim();
    if (!cleanName) return null;
    for (let i = 0; i < scope.categories.length; i++) {
        const item = scope.categories[i];
        if (!item) continue;
        if (String(item.name || '').trim() === cleanName) {
            return item;
        }
    }
    const created = {
        id: makeStickerCategoryId(),
        name: cleanName
    };
    scope.categories.push(created);
    persistStickerData();
    return created;
}

function renameStickerCategory(roleId, categoryId, nextName) {
    const scope = getStickerScopeForRole(roleId);
    const id = String(categoryId || '').trim();
    const cleanName = String(nextName || '').trim();
    if (!id || id === STICKER_DEFAULT_CATEGORY_ID || !cleanName) return null;
    const categories = Array.isArray(scope.categories) ? scope.categories : [];
    let target = null;
    for (let i = 0; i < categories.length; i++) {
        const item = categories[i];
        if (!item) continue;
        if (String(item.id || '').trim() === id) {
            target = item;
            break;
        }
    }
    if (!target) return null;
    target.name = cleanName;
    persistStickerData();
    return target;
}

window.getStickerScopeForRole = getStickerScopeForRole;
window.ensureStickerStore = ensureStickerStore;
window.persistStickerData = persistStickerData;
window.ensureStickerCategory = ensureStickerCategory;
window.renameStickerCategory = renameStickerCategory;
window.getStickerDuplicateUrlKey = getStickerDuplicateUrlKey;
try {
    var storedStickerRaw = localStorage.getItem(STICKER_STORE_PRIMARY_KEY) || localStorage.getItem(STICKER_STORE_LEGACY_KEY);
    if (storedStickerRaw) {
        var parsedSticker = JSON.parse(storedStickerRaw);
        if (parsedSticker && typeof parsedSticker === 'object') {
            window.stickerData = parsedSticker;
        }
    }
} catch (e) { }
ensureStickerStore(true);

function normalizeFamilyCardState(raw) {
    const obj = raw && typeof raw === 'object' ? raw : {};
    const receivedCards = Array.isArray(obj.receivedCards) ? obj.receivedCards : [];
    const sentCards = Array.isArray(obj.sentCards) ? obj.sentCards : [];
    return { receivedCards, sentCards };
}

function ensureFamilyCardState() {
    window.familyCardState = normalizeFamilyCardState(window.familyCardState);
    return window.familyCardState;
}

function normalizeFamilyCardAmount(amount) {
    const n = typeof amount === 'number' ? amount : parseFloat(String(amount || '').trim());
    if (isNaN(n) || !isFinite(n) || n <= 0) return '';
    return n.toFixed(2);
}

function resolveFamilyCardRoleName(roleId) {
    const id = String(roleId || '').trim();
    if (!id) return '未知';
    const profiles = window.charProfiles || {};
    const p = profiles && typeof profiles === 'object' ? profiles[id] : null;
    if (p && typeof p === 'object') {
        const name = p.remark || p.remarkName || p.alias || p.nickName || p.name;
        if (name) return String(name).trim() || id;
    }
    return id;
}

function getFamilyCardWalletBalance() {
    try {
        if (window.Wallet && typeof window.Wallet.getData === 'function') {
            const d = window.Wallet.getData();
            const n = d && typeof d.totalAssets === 'number' ? d.totalAssets : parseFloat(String(d && d.totalAssets !== undefined ? d.totalAssets : '0'));
            if (!isNaN(n) && isFinite(n) && n > 0) return n;
            return 0;
        }
    } catch (e) { }
    try {
        const raw = localStorage.getItem('wechat_wallet');
        if (raw) {
            const parsed = JSON.parse(raw);
            const n = parsed && typeof parsed.totalAssets === 'number' ? parsed.totalAssets : parseFloat(String(parsed && parsed.totalAssets !== undefined ? parsed.totalAssets : '0'));
            if (!isNaN(n) && isFinite(n) && n > 0) return n;
        }
    } catch (e) { }
    return 0;
}

function getFamilyCardReceivedQuotaTotal() {
    const state = ensureFamilyCardState();
    const list = Array.isArray(state.receivedCards) ? state.receivedCards : [];
    let sum = 0;
    for (let i = 0; i < list.length; i++) {
        const card = list[i];
        const n = card && (typeof card.amount === 'number' ? card.amount : parseFloat(String(card.amount || '').trim()));
        if (!isNaN(n) && isFinite(n) && n > 0) sum += n;
    }
    return sum;
}

function showCenterToast(text) {
    const message = String(text || '').trim();
    if (!message) return;
    let el = document.getElementById('center-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'center-toast';
        el.className = 'center-toast';
        document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    if (el._hideTimer) {
        clearTimeout(el._hideTimer);
    }
    el._hideTimer = setTimeout(function () {
        el.classList.remove('show');
    }, 1800);
}

function makeChatMessageId(seedTs) {
    const ts = typeof seedTs === 'number' && isFinite(seedTs) && seedTs > 0 ? seedTs : Date.now();
    return 'm_' + ts.toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function ensureChatMessageId(msg) {
    if (!msg || typeof msg !== 'object') return '';
    const existing = msg.id != null ? String(msg.id).trim() : '';
    if (existing) {
        msg.id = existing;
        return existing;
    }
    const next = makeChatMessageId(typeof msg.timestamp === 'number' ? msg.timestamp : Date.now());
    msg.id = next;
    return next;
}

function isLikelyLeakedThoughtLine(line) {
    const s = String(line || '').replace(/\s+/g, ' ').trim();
    if (!s) return false;
    if (/^(?:理解|气氛|氛围|关系温度|关系状态|策略|动作|分析|判断|回复策略|互动策略|本轮策略)\s*[:：]/.test(s)) return true;
    if (/(?:thought|inner_monologue|system_event|quoteId|quote_id|reply_to|actions|status)\s*[:：]/i.test(s)) return true;
    if (/(?:我(?:该|得|先|需要|应该|必须)|先在)\s*(?:分析|判断|想想|思考|决定|考虑|确认|规划|组织|回复|怎么回复|怎么接|怎么说)/.test(s)) return true;
    if (/(?:当前|现在的)\s*(?:气氛|氛围|关系|关系温度|关系状态)/.test(s)) return true;
    if (/(?:要不要|是否需要)\s*触发(?:引用|语音|位置|通话|金钱|动作)?/.test(s)) return true;
    if (/(?:不能前后打架|严格服从|内部思维链|隐藏思维链|不对用户可见|用户可见内容)/.test(s)) return true;
    return false;
}

function normalizeStickerLookupUrl(rawUrl) {
    let url = String(rawUrl || '').trim();
    if (!url) return '';
    const match = url.match(/^\[STICKER:\s*([^\]]+)\]$/i);
    if (match && match[1]) {
        url = String(match[1]).trim();
    }
    if (url.startsWith('//')) url = 'https:' + url;
    return url.replace(/\s+/g, '');
}

function sanitizeStickerSemanticName(rawName, rawUrl) {
    let name = String(rawName || '').trim();
    const url = normalizeStickerLookupUrl(rawUrl);
    if (!name) return '';
    if (url && normalizeStickerLookupUrl(name) === url) return '';
    name = name.replace(/\s+/g, ' ').trim();
    name = name.replace(/\s*[：:]\s*https?:\/\/\S+$/i, '').trim();
    const urlIndex = name.search(/\s*https?:\/\/\S+/i);
    if (urlIndex > 0) name = name.slice(0, urlIndex).trim();
    return name.replace(/[：:]\s*$/, '').trim();
}

function resolveStickerMetaByUrl(roleId, rawUrl, fallbackName) {
    const normalizedUrl = normalizeStickerLookupUrl(rawUrl);
    const fallback = sanitizeStickerSemanticName(fallbackName, normalizedUrl);
    if (!normalizedUrl) {
        return { url: '', name: fallback };
    }
    const rid = String(roleId || window.currentChatRole || '').trim();
    const scope = typeof window.getStickerScopeForRole === 'function'
        ? window.getStickerScopeForRole(rid)
        : { tabs: window.stickerData || {} };
    const tabs = scope && scope.tabs && typeof scope.tabs === 'object' ? scope.tabs : {};
    const tabKeys = Object.keys(tabs);
    for (let i = 0; i < tabKeys.length; i++) {
        const list = Array.isArray(tabs[tabKeys[i]]) ? tabs[tabKeys[i]] : [];
        for (let j = 0; j < list.length; j++) {
            const item = list[j];
            if (!item) continue;
            const itemUrl = normalizeStickerLookupUrl(item.src || item.url || item.href || '');
            if (!itemUrl || itemUrl !== normalizedUrl) continue;
            const itemName = sanitizeStickerSemanticName(item.name || '', itemUrl);
            return {
                url: itemUrl,
                name: itemName || fallback
            };
        }
    }
    return { url: normalizedUrl, name: fallback };
}

function buildStickerSemanticText(roleId, msg, options) {
    const info = msg && typeof msg === 'object' ? msg : {};
    const meta = resolveStickerMetaByUrl(roleId, info.stickerUrl || info.content || '', info.stickerName || '');
    const actor = options && options.actor ? String(options.actor).trim() : '';
    const actorText = actor || (info.role === 'me' ? '用户' : (info.role === 'ai' ? '你' : '对方'));
    if (meta.name) {
        return `[${actorText}发送了一个表情包：${meta.name}]`;
    }
    return `[${actorText}发送了一个表情包]`;
}

window.resolveStickerMetaByUrl = resolveStickerMetaByUrl;
window.buildStickerSemanticText = buildStickerSemanticText;

function getMessagePlainText(msg) {
    if (!msg) return '';
    if (msg.type === 'text' || !msg.type) {
        let s = String(msg.content || '').replace(/\r\n?/g, '\n');
        s = s.replace(/(?:^|\n)\s*[\[【](?:内心独白|思考链|思考|引用回复)[^\]\n】]*[\]】][^\n]*/gi, '\n');
        s = s.replace(/(?:^|\n)\s*[\[【](?:语音消息|语音|发送照片|发送图片|发送位置|系统提示)[\]】]\s*[:：]?\s*/gi, '\n');
        s = s.split(/\n+/).map(function (line) { return String(line || '').trim(); }).filter(function (line) {
            return line && !/^[-—–_~=.•·|]+$/.test(line) && !isLikelyLeakedThoughtLine(line);
        }).join(' ');
        return s.trim();
    }
    if (msg.type === 'image') return '[图片]';
    if (msg.type === 'sticker') {
        const meta = resolveStickerMetaByUrl(window.currentChatRole || msg.roleId || '', msg.stickerUrl || msg.content || '', msg.stickerName || '');
        return meta.name ? ('[表情包:' + meta.name + ']') : '[表情包]';
    }
    if (msg.type === 'voice') return '[语音]';
    if (msg.type === 'location') return '[位置]';
    if (msg.type === 'offline_action') return '（' + String(msg.content || '') + '）';
    if (msg.type === 'transfer') return '[转账]';
    if (msg.type === 'redpacket') return '[红包]';
    if (msg.type === 'family_card') return '[亲属卡]';
    return String(msg.content || '');
}

function resolveDisplayNameByRoleId(roleId) {
    const profile = (window.charProfiles && window.charProfiles[roleId]) ? window.charProfiles[roleId] : {};
    return String(profile.remark || profile.nickName || profile.name || roleId || 'TA');
}

function resolveMessageSenderName(roleId, msg) {
    if (msg && msg.role === 'me') {
        const p = getCurrentUserProfile();
        return p.name || '我';
    }
    return resolveDisplayNameByRoleId(roleId);
}

function resolveQuoteBlockForMessage(roleId, msg) {
    if (!msg || typeof msg !== 'object') return;
    const quoteId = msg.quoteId != null ? String(msg.quoteId).trim() : '';
    if (msg.quote && msg.quote.text) return;
    const desiredQuoteText = String(msg.quoteSourceText || msg.quoteText || '').replace(/\s+/g, ' ').trim();
    if (!(quoteId || desiredQuoteText)) return;
    const list = window.chatData && window.chatData[roleId];
    if (!Array.isArray(list)) return;
    let quoted = null;
    const token = quoteId.toLowerCase();
    const currentId = msg.id != null ? String(msg.id).trim() : '';
    const scoreQuoteTextMatch = function (candidate) {
        if (!desiredQuoteText || !candidate) return -1;
        const plain = getMessagePlainText(candidate).replace(/\s+/g, ' ').trim();
        if (!plain) return -1;
        if (plain === desiredQuoteText) return 10000 + plain.length;
        if (plain.indexOf(desiredQuoteText) !== -1) return 6000 + desiredQuoteText.length;
        if (desiredQuoteText.indexOf(plain) !== -1) return 4000 + plain.length;
        const desiredCompact = desiredQuoteText.replace(/[，。！？、,.!?;；:：“”"'`~·\-\s]/g, '');
        const plainCompact = plain.replace(/[，。！？、,.!?;；:：“”"'`~·\-\s]/g, '');
        if (!desiredCompact || !plainCompact) return -1;
        if (plainCompact === desiredCompact) return 9000 + plainCompact.length;
        if (plainCompact.indexOf(desiredCompact) !== -1) return 5500 + desiredCompact.length;
        if (desiredCompact.indexOf(plainCompact) !== -1) return 3500 + plainCompact.length;
        return -1;
    };
    const matchesByToken = function (candidate) {
        if (!candidate || candidate.hidden === true || candidate.role === 'system' || candidate.recalled === true) return false;
        if (candidate.type === 'system_event' || candidate.type === 'call_memory') return false;
        if (currentId && String(candidate.id || '').trim() === currentId) return false;
        if (token === 'user_last' || token === 'me_last') return candidate.role === 'me';
        if (token === 'ai_last' || token === 'self_last' || token === 'assistant_last') return candidate.role === 'ai';
        if (token === 'last') return true;
        return false;
    };
    let bestQuoteScore = -1;
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (!m) continue;
        if (m.hidden === true || m.type === 'system_event' || m.type === 'call_memory') continue;
        if (currentId && String(m.id || '').trim() === currentId) continue;
        const quoteScore = scoreQuoteTextMatch(m);
        if (quoteScore > bestQuoteScore) {
            bestQuoteScore = quoteScore;
            quoted = m;
            if (quoteScore >= 10000) break;
        }
    }
    if (!quoted || bestQuoteScore < 0) {
        quoted = null;
    }
    for (let i = list.length - 1; i >= 0 && !quoted; i--) {
        const m = list[i];
        if (!m) continue;
        if (m.hidden === true || m.type === 'system_event' || m.type === 'call_memory') continue;
        if (String(m.id || '') === quoteId) {
            quoted = m;
            break;
        }
        if (!quoted && matchesByToken(m)) {
            quoted = m;
            if (token === 'last' || token === 'user_last' || token === 'me_last' || token === 'ai_last' || token === 'self_last' || token === 'assistant_last') {
                break;
            }
        }
    }
    if (!quoted) return;
    const resolvedId = ensureChatMessageId(quoted);
    if (resolvedId) msg.quoteId = resolvedId;
    msg.quote = {
        name: resolveMessageSenderName(roleId, quoted),
        text: getMessagePlainText(quoted)
    };
}

function buildQuotePromptLine(msg, roleId) {
    if (!msg || !msg.quote || !msg.quote.text) return '';
    const quoteName = String(msg.quote.name || resolveDisplayNameByRoleId(roleId) || 'TA').trim() || 'TA';
    const quoteText = String(msg.quote.text || '').replace(/\s+/g, ' ').trim();
    if (!quoteText) return '';
    return `[引用回复：${quoteName} 说“${quoteText}”]`;
}

function buildRecallAiEventText(msg) {
    if (!msg || !msg.recalled) return '';
    const recalledBy = String(msg.recalledBy || '').trim();
    const targetRole = String(msg.recalledTargetRole || msg.recalledRole || '').trim();
    let preview = String(msg.recalledPreview || '').replace(/\s+/g, ' ').trim();
    if (preview.length > 120) preview = preview.slice(0, 120) + '...';

    if (recalledBy === 'user') {
        if (targetRole === 'me') {
            return preview
                ? `[系统通知：用户刚刚撤回了自己发给你的一条消息。原内容大致是：「${preview}」。请自然接住这个撤回动作，比如追问、打趣或安抚，但不要生硬重复系统通知。]`
                : '[系统通知：用户刚刚撤回了自己发给你的一条消息。请自然接住这个撤回动作，比如追问、打趣或安抚，但不要生硬重复系统通知。]';
        }
        if (targetRole === 'ai') {
            return preview
                ? `[系统通知：用户刚刚撤回了你发给TA的一条消息。被撤回的原话大致是：「${preview}」。请自然对这个动作作出反应。]`
                : '[系统通知：用户刚刚撤回了你发给TA的一条消息。请自然对这个动作作出反应。]';
        }
    }

    if (recalledBy === 'ai') {
        if (targetRole === 'ai') {
            return preview
                ? `[系统通知：你刚刚主动撤回了自己发给用户的一条消息。原内容是：「${preview}」。如果你需要，可以立刻换一种更合适的说法。]`
                : '[系统通知：你刚刚主动撤回了自己发给用户的一条消息。如果你需要，可以立刻换一种更合适的说法。]';
        }
        if (targetRole === 'me') {
            return preview
                ? `[系统通知：你刚刚撤回了用户的一条消息。原内容大致是：「${preview}」。请谨慎处理后续回应。]`
                : '[系统通知：你刚刚撤回了用户的一条消息。请谨慎处理后续回应。]';
        }
    }

    return '';
}
window.buildRecallAiEventText = buildRecallAiEventText;

function resolveRecallTargetIndex(roleId, spec) {
    const id = String(roleId || '').trim();
    const list = window.chatData && Array.isArray(window.chatData[id]) ? window.chatData[id] : null;
    if (!list || !list.length) return -1;
    const opts = spec && typeof spec === 'object' ? spec : {};

    if (typeof opts.messageIndex === 'number' && opts.messageIndex >= 0 && opts.messageIndex < list.length) {
        return opts.messageIndex;
    }

    const messageId = opts.messageId != null ? String(opts.messageId).trim() : '';
    if (messageId) {
        for (let i = list.length - 1; i >= 0; i--) {
            const msg = list[i];
            if (!msg) continue;
            if (String(msg.id || '') === messageId) return i;
        }
    }

    const quotedId = opts.quoteId != null ? String(opts.quoteId).trim() : '';
    if (quotedId) {
        for (let i = list.length - 1; i >= 0; i--) {
            const msg = list[i];
            if (!msg) continue;
            if (String(msg.id || '') === quotedId) return i;
        }
    }

    const target = String(opts.target || '').trim().toLowerCase();
    if (!target) return -1;
    for (let i = list.length - 1; i >= 0; i--) {
        const msg = list[i];
        if (!msg || msg.hidden === true || msg.role === 'system' || msg.recalled === true) continue;
        if (msg.type === 'system_event' || msg.type === 'call_memory') continue;
        if (target === 'self_last' || target === 'ai_last' || target === 'assistant_last') {
            if (msg.role === 'ai') return i;
        } else if (target === 'user_last' || target === 'me_last') {
            if (msg.role === 'me') return i;
        } else if (target === 'last') {
            return i;
        }
    }
    return -1;
}

window.performChatMessageRecall = function (roleId, spec) {
    const id = String(roleId || '').trim();
    const opts = spec && typeof spec === 'object' ? spec : {};
    const list = window.chatData && Array.isArray(window.chatData[id]) ? window.chatData[id] : null;
    if (!id || !list) return null;

    const index = resolveRecallTargetIndex(id, opts);
    if (index < 0 || !list[index]) return null;
    const target = list[index];
    if (!target || target.role === 'system' || target.recalled === true) return null;

    const keepId = ensureChatMessageId(target);
    let preview = getMessagePlainText(target).replace(/\s+/g, ' ').trim();
    if (preview.length > 80) preview = preview.slice(0, 80) + '...';

    const initiator = String(opts.initiator || 'user').trim().toLowerCase() === 'ai' ? 'ai' : 'user';
    let visibleText = '撤回了一条消息';
    if (initiator === 'user') {
        visibleText = target.role === 'me' ? '你撤回了一条消息' : '你撤回了对方的一条消息';
    } else {
        visibleText = target.role === 'ai' ? '对方撤回了一条消息' : '对方撤回了你的一条消息';
    }

    const placeholder = {
        id: keepId,
        role: 'system',
        type: 'system_event',
        content: visibleText,
        timestamp: typeof target.timestamp === 'number' ? target.timestamp : Date.now(),
        recalled: true,
        recalledBy: initiator,
        recalledRole: target.role,
        recalledTargetRole: target.role,
        recalledType: target.type || 'text',
        recalledPreview: preview,
        recalledMessageId: keepId,
        includeInAI: opts.includeInAI !== false
    };

    list.splice(index, 1, placeholder);
    try { saveData(); } catch (e) { }

    let row = opts.row && opts.row.nodeType === 1 ? opts.row : null;
    if (!row && String(window.currentChatRole || '') === id) {
        try {
            const historyBox = document.getElementById('chat-history');
            if (historyBox) {
                row = historyBox.querySelector('.msg-row[data-msg-id="' + keepId + '"]');
                if (!row) {
                    row = historyBox.querySelector('.msg-row[data-timestamp="' + String(target.timestamp || '') + '"][data-role="' + String(target.role || '') + '"]');
                }
            }
        } catch (e) { }
    }
    if (row && row.parentNode && typeof createMessageRow === 'function') {
        const replacement = createMessageRow(placeholder);
        if (replacement) {
            if (opts.animate !== false && typeof row.animate === 'function') {
                try {
                    const anim = row.animate(
                        [
                            { transform: 'scale(1)', opacity: 1 },
                            { transform: 'scale(0.8)', opacity: 0 }
                        ],
                        { duration: 160, easing: 'ease-out', fill: 'forwards' }
                    );
                    anim.onfinish = function () {
                        try { row.parentNode.replaceChild(replacement, row); } catch (e2) { }
                    };
                } catch (e3) {
                    try { row.parentNode.replaceChild(replacement, row); } catch (e4) { }
                }
            } else {
                try { row.parentNode.replaceChild(replacement, row); } catch (e5) { }
            }
        }
    }

    return {
        index: index,
        target: target,
        placeholder: placeholder
    };
};

window.scrollToChatMessageById = function (msgId) {
    const id = String(msgId || '').trim();
    if (!id) return false;
    const historyBox = document.getElementById('chat-history');
    if (!historyBox) return false;
    const nodes = historyBox.querySelectorAll('[data-msg-id]');
    let target = null;
    for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        if (!el) continue;
        if (String(el.getAttribute('data-msg-id') || '') === id) {
            target = el;
            break;
        }
    }
    if (!target) {
        showCenterToast('未找到该引用消息（可能在更早历史）');
        return false;
    }
    try {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
        try {
            target.scrollIntoView();
        } catch (e2) { }
    }
    try {
        target.classList.add('msg-jump-highlight');
        if (target._jumpTimer) clearTimeout(target._jumpTimer);
        target._jumpTimer = setTimeout(function () {
            target.classList.remove('msg-jump-highlight');
        }, 900);
    } catch (e3) { }
    return true;
};

function loadFavoritesState() {
    try {
        const raw = localStorage.getItem('wechat_favorites_v2');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) { }
    try {
        const legacyRaw = localStorage.getItem('wechat_favorites');
        if (legacyRaw) {
            const legacy = JSON.parse(legacyRaw);
            if (Array.isArray(legacy)) {
                const migrated = legacy.map(function (x) {
                    const ts = x && typeof x.date === 'number' ? x.date : Date.now();
                    return {
                        id: makeChatMessageId(ts),
                        roleId: x && x.from ? String(x.from) : '',
                        messageId: '',
                        senderName: '',
                        senderAvatar: '',
                        senderRole: '',
                        content: x && x.text ? String(x.text) : '',
                        type: 'text',
                        timestamp: ts
                    };
                });
                localStorage.setItem('wechat_favorites_v2', JSON.stringify(migrated));
                return migrated;
            }
        }
    } catch (e2) { }
    return [];
}

function saveFavoritesState(list) {
    try {
        localStorage.setItem('wechat_favorites_v2', JSON.stringify(Array.isArray(list) ? list : []));
    } catch (e) { }
}

function buildFavoriteItem(roleId, msg) {
    const rid = String(roleId || '').trim();
    const m = msg && typeof msg === 'object' ? msg : {};
    const ts = typeof m.timestamp === 'number' && isFinite(m.timestamp) ? m.timestamp : Date.now();
    const messageId = ensureChatMessageId(m);
    const senderName = resolveMessageSenderName(rid, m);
    let senderAvatar = '';
    if (m.role === 'me') {
        senderAvatar = getCurrentUserProfile().avatar || 'assets/chushitouxiang.jpg';
    } else {
        const profile = window.charProfiles && window.charProfiles[rid] ? window.charProfiles[rid] : {};
        senderAvatar = profile.avatar || 'assets/chushitouxiang.jpg';
    }
    return {
        id: makeChatMessageId(ts),
        roleId: rid,
        messageId: messageId,
        senderName: senderName,
        senderAvatar: senderAvatar,
        senderRole: String(m.role || ''),
        content: getMessagePlainText(m),
        type: String(m.type || 'text'),
        timestamp: ts
    };
}

window.favorites = loadFavoritesState();
window.getFavorites = function () {
    return Array.isArray(window.favorites) ? window.favorites.slice() : [];
};
window.addFavoriteMessage = function (roleId, msg) {
    if (!roleId || !msg) return null;
    if (!Array.isArray(window.favorites)) window.favorites = [];
    const item = buildFavoriteItem(roleId, msg);
    window.favorites = window.favorites.concat([item]).slice(-800);
    saveFavoritesState(window.favorites);
    return item;
};
window.removeFavoriteById = function (favId) {
    const id = String(favId || '').trim();
    if (!id || !Array.isArray(window.favorites)) return false;
    const next = window.favorites.filter(function (x) { return String(x && x.id || '') !== id; });
    window.favorites = next;
    saveFavoritesState(window.favorites);
    return true;
};

function createFamilyCardMessage(role, amount, timestamp, peerRoleId) {
    const amt = normalizeFamilyCardAmount(amount);
    if (!amt) return null;
    const rid = String(peerRoleId || '').trim();
    return {
        role: role === 'me' ? 'me' : 'ai',
        type: 'family_card',
        amount: amt,
        timestamp: timestamp || Date.now(),
        status: role === 'me' ? 'sent' : 'pending',
        fromRoleId: role === 'me' ? undefined : (rid || undefined),
        toRoleId: role === 'me' ? (rid || undefined) : undefined
    };
}

function addReceivedFamilyCard(fromRoleId, amount, timestamp) {
    const state = ensureFamilyCardState();
    const amt = normalizeFamilyCardAmount(amount);
    if (!fromRoleId || !amt) return null;
    const card = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        fromRoleId: String(fromRoleId || '').trim(),
        amount: amt,
        timestamp: timestamp || Date.now()
    };
    state.receivedCards = state.receivedCards.concat([card]).slice(-500);
    window.familyCardState = state;
    return card;
}

function addSentFamilyCard(toRoleId, amount, timestamp) {
    const state = ensureFamilyCardState();
    const amt = normalizeFamilyCardAmount(amount);
    if (!toRoleId || !amt) return null;
    const card = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        toRoleId: String(toRoleId || '').trim(),
        amount: amt,
        timestamp: timestamp || Date.now()
    };
    state.sentCards = state.sentCards.concat([card]).slice(-500);
    window.familyCardState = state;
    return card;
}

function pushChatMessageToRole(roleId, msg) {
    const id = String(roleId || '').trim();
    if (!id || !msg) return false;
    if (!window.chatData || typeof window.chatData !== 'object') window.chatData = {};
    if (!Array.isArray(window.chatData[id])) window.chatData[id] = [];
    window.chatData[id].push(msg);
    if (String(window.currentChatRole || '') === id) {
        appendMessageToDOM(msg);
    }
    return true;
}

window.FamilyCard = window.FamilyCard || {};
window.FamilyCard.getState = ensureFamilyCardState;
window.FamilyCard.addReceived = addReceivedFamilyCard;
window.FamilyCard.addSent = addSentFamilyCard;
window.FamilyCard.buildMessage = createFamilyCardMessage;
window.FamilyCard.sendToRole = function (roleId, amount) {
    const id = String(roleId || '').trim();
    const msg = createFamilyCardMessage('me', amount, Date.now(), id);
    if (!id || !msg) return null;

    const sendAmountNum = parseFloat(String(msg.amount || '').trim());
    if (isNaN(sendAmountNum) || !isFinite(sendAmountNum) || sendAmountNum <= 0) return null;

    const walletBalance = getFamilyCardWalletBalance();
    const receivedTotal = getFamilyCardReceivedQuotaTotal();
    const maxSendable = walletBalance + receivedTotal;
    if (sendAmountNum - maxSendable > 0.000001) {
        showCenterToast('当前可用总资产不足');
        return null;
    }

    let remaining = sendAmountNum;
    const walletUsed = Math.min(walletBalance, remaining);
    if (walletUsed > 0.000001) {
        const usedRounded = Math.round(walletUsed * 100) / 100;
        try {
            if (window.Wallet && typeof window.Wallet.addTransaction === 'function') {
                window.Wallet.addTransaction('expense', '赠送亲属卡', usedRounded, 'other', {
                    peerName: resolveFamilyCardRoleName(id),
                    peerRoleId: id,
                    kind: 'family_card'
                });
            } else {
                const raw = localStorage.getItem('wechat_wallet');
                const parsed = raw ? JSON.parse(raw) : {};
                const data = parsed && typeof parsed === 'object' ? parsed : {};
                const base = typeof data.totalAssets === 'number' ? data.totalAssets : parseFloat(String(data.totalAssets || '0'));
                const safeBase = !isNaN(base) && isFinite(base) ? base : 0;
                data.totalAssets = Math.max(0, safeBase - usedRounded);
                localStorage.setItem('wechat_wallet', JSON.stringify(data));
            }
        } catch (e) { }
        remaining -= usedRounded;
    }

    if (remaining > 0.000001) {
        const state = ensureFamilyCardState();
        const cards = Array.isArray(state.receivedCards) ? state.receivedCards.slice() : [];
        cards.sort(function (a, b) {
            const ta = a && typeof a.timestamp === 'number' ? a.timestamp : 0;
            const tb = b && typeof b.timestamp === 'number' ? b.timestamp : 0;
            return ta - tb;
        });
        const updated = [];
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            if (!card || typeof card !== 'object') continue;
            const cardAmtNum = typeof card.amount === 'number' ? card.amount : parseFloat(String(card.amount || '').trim());
            const safeAmt = !isNaN(cardAmtNum) && isFinite(cardAmtNum) && cardAmtNum > 0 ? cardAmtNum : 0;
            if (remaining <= 0.000001) {
                if (safeAmt > 0) {
                    updated.push(card);
                }
                continue;
            }
            const used = Math.min(safeAmt, remaining);
            const newAmt = safeAmt - used;
            remaining -= used;
            if (newAmt > 0.000001) {
                const next = Object.assign({}, card, { amount: (Math.round(newAmt * 100) / 100).toFixed(2) });
                updated.push(next);
            }
        }
        state.receivedCards = updated.slice(-500);
        window.familyCardState = state;
    }

    addSentFamilyCard(id, msg.amount, msg.timestamp);
    pushChatMessageToRole(id, msg);
    saveData();
    return msg;
};
window.FamilyCard.receiveFromRole = function (roleId, amount, options) {
    const id = String(roleId || '').trim();
    const msg = createFamilyCardMessage('ai', amount, Date.now(), id);
    if (!id || !msg) return null;
    const shouldAppend = !(options && options.appendToDom === false);
    if (shouldAppend) {
        pushChatMessageToRole(id, msg);
        saveData();
    }
    return msg;
};

window.roleStatusStore = window.roleStatusStore || {};
window.currentRoleStatus = window.currentRoleStatus || null;
window.statusMonitorTimerId = window.statusMonitorTimerId || null;
window.statusHeartBeatBase = window.statusHeartBeatBase || null;
try {
    var storedStatusRaw = localStorage.getItem('wechat_roleStatusStore');
    if (storedStatusRaw) {
        var parsedStatus = JSON.parse(storedStatusRaw);
        if (parsedStatus && typeof parsedStatus === 'object') {
            window.roleStatusStore = parsedStatus;
        }
    }
} catch (e) { }
window.roleStatusHistory = window.roleStatusHistory || {};
try {
    var storedStatusHistoryRaw = localStorage.getItem('wechat_roleStatusHistory');
    if (storedStatusHistoryRaw) {
        var parsedStatusHistory = JSON.parse(storedStatusHistoryRaw);
        if (parsedStatusHistory && typeof parsedStatusHistory === 'object') {
            window.roleStatusHistory = parsedStatusHistory;
        }
    }
} catch (e) { }

function formatChatTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function formatChatDividerTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const sameDay = date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return sameDay ? `${hours}:${minutes}` : `${month}月${day}日 ${hours}:${minutes}`;
}

function createChatTimeDividerElement(timestamp) {
    const divider = document.createElement('div');
    divider.className = 'chat-time-label';
    const text = formatChatDividerTime(timestamp);
    divider.textContent = text;
    divider.setAttribute('data-text', text);
    return divider;
}

function injectDiceStyles() {
    const styleId = 'chat-dice-style';
    const oldStyle = document.getElementById(styleId);
    if (oldStyle) oldStyle.remove();

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* 骰子容器：给它3D空间 */
        .msg-bubble:has(.dice-icon) {
            perspective: 800px; /* 3D透视距离 */
            background: transparent !important;
            box-shadow: none !important;
            padding: 5px !important;
        }

        /* 骰子本体：圆润方块 + 渐变 + 阴影 */
        .dice-icon {
            font-size: 60px;
            display: inline-block;
            transform-style: preserve-3d; /* 启用3D */
            transform-origin: center center;
            
            /* 🎨 立体效果核心：渐变背景 + 多层阴影 */
            background: linear-gradient(145deg, #ffffff, #e8e8e8);
            border-radius: 12px;
            padding: 8px;
            box-shadow: 
                4px 4px 12px rgba(0,0,0,0.2),    /* 主阴影 */
                -2px -2px 6px rgba(255,255,255,0.7), /* 高光 */
                inset 2px 2px 4px rgba(0,0,0,0.1); /* 内凹陷 */
            
            /* 边框增强立体感 */
            border: 1px solid rgba(0,0,0,0.1);
        }

        /* 🎬 动画：3D旋转 + 弹跳 */
        .dice-anim {
            animation: dice-roll-3d 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        @keyframes dice-roll-3d {
            /* 阶段1：飞入 + 狂转（0-50%）*/
            0% {
                transform: scale(0.3) rotateX(720deg) rotateY(720deg);
                opacity: 0;
            }
            
            /* 阶段2：接近落地（60%）*/
            60% {
                transform: scale(1.15) rotateX(360deg) rotateY(360deg);
                opacity: 1;
            }
            
            /* 阶段3：触底反弹（75%）*/
            75% {
                transform: scale(0.95) rotateX(380deg) rotateY(370deg);
            }
            
            /* 阶段4：二次小弹（85%）*/
            85% {
                transform: scale(1.02) rotateX(365deg) rotateY(365deg);
            }
            
            /* 阶段5：停稳（100%）*/
            100% {
                transform: scale(1) rotateX(360deg) rotateY(360deg);
                opacity: 1;
            }
        }

        
    `;
    document.head.appendChild(style);
}

