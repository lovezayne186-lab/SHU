/* =========================================================
   文件路径：JS脚本文件夹/system.js
   作用：处理系统级功能（初始化、时间、电池、全局监听）
   ========================================================= */

(function () {
    if (window.ActivityTracker && typeof window.recordActivity === 'function') return;

    var STORAGE_KEY = 'app_activity_logs';
    var MAX_LOGS = 300;

    function safeJsonParse(text, fallback) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return fallback;
        }
    }

    function pad2(n) {
        var v = Number(n);
        if (!Number.isFinite(v)) v = 0;
        v = Math.floor(v);
        return String(v).padStart(2, '0');
    }

    function formatActivityTime(date) {
        var d = date instanceof Date ? date : new Date();
        return pad2(d.getMonth() + 1) + '月' + pad2(d.getDate()) + '日 ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }

    function readWechatProfilesFromStorage() {
        try {
            var raw = localStorage.getItem('wechat_charProfiles');
            if (!raw) return {};
            var parsed = safeJsonParse(raw, {});
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            return {};
        }
    }

    function getActivityUsername() {
        try {
            var roleId = String(localStorage.getItem('couple_linked_role_id_v1') || '').trim();
            if (roleId) {
                var profiles = (window.charProfiles && typeof window.charProfiles === 'object') ? window.charProfiles : readWechatProfilesFromStorage();
                var p = profiles && profiles[roleId] && typeof profiles[roleId] === 'object' ? profiles[roleId] : null;
                var name = p ? (p.remark || p.nickName || p.name || roleId) : roleId;
                name = String(name || '').trim();
                if (name) return name;
            }
        } catch (e) { }
        return 'Ta';
    }

    function readActivityLogs() {
        try {
            if (!window.localStorage) return [];
            var raw = localStorage.getItem(STORAGE_KEY) || '';
            if (!raw) return [];
            var parsed = safeJsonParse(raw, []);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter(function (it) { return it && typeof it === 'object'; });
        } catch (e) {
            return [];
        }
    }

    function writeActivityLogs(list) {
        try {
            if (!window.localStorage) return;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
        } catch (e) { }
    }

    var activityMemLogs = readActivityLogs();
    if (!Array.isArray(activityMemLogs)) activityMemLogs = [];
    if (activityMemLogs.length > MAX_LOGS) activityMemLogs = activityMemLogs.slice(activityMemLogs.length - MAX_LOGS);

    var activityForage = null;
    var activityForageQueue = Promise.resolve();

    function getActivityForage() {
        try {
            if (activityForage) return activityForage;
            if (!window.localforage || typeof window.localforage.createInstance !== 'function') return null;
            activityForage = window.localforage.createInstance({
                name: 'shubao_large_store_v1',
                storeName: 'activity_logs'
            });
            return activityForage;
        } catch (e) {
            return null;
        }
    }

    function normalizeActivityItem(it) {
        if (!it || typeof it !== 'object') return null;
        var ts = Number(it.ts || 0) || 0;
        if (!ts) return null;
        var time = String(it.time || '').trim();
        var text = String(it.text || '').trim();
        if (!text) return null;
        var app = String(it.app || 'other');
        var kind = String(it.kind || 'other');
        var out = { ts: ts, time: time, text: text, app: app, kind: kind };
        if (it.data && isPlainObject(it.data)) out.data = it.data;
        return out;
    }

    function mergeActivityLists(a, b) {
        var out = [];
        var seen = {};
        function push(it) {
            var n = normalizeActivityItem(it);
            if (!n) return;
            var key = String(n.ts) + '|' + n.kind + '|' + n.app + '|' + n.text;
            if (seen[key]) return;
            seen[key] = 1;
            out.push(n);
        }
        (Array.isArray(a) ? a : []).forEach(push);
        (Array.isArray(b) ? b : []).forEach(push);
        out.sort(function (x, y) { return Number(x.ts || 0) - Number(y.ts || 0); });
        if (out.length > MAX_LOGS) out = out.slice(out.length - MAX_LOGS);
        return out;
    }

    (function loadActivityLogsFromForage() {
        var forage = getActivityForage();
        if (!forage) return;
        forage.getItem(STORAGE_KEY).then(function (val) {
            var list = [];
            if (Array.isArray(val)) {
                list = val;
            } else if (typeof val === 'string') {
                var p = safeJsonParse(val, []);
                if (Array.isArray(p)) list = p;
            }
            activityMemLogs = mergeActivityLists(activityMemLogs, list);
            try {
                forage.setItem(STORAGE_KEY, activityMemLogs.slice(-MAX_LOGS));
            } catch (e2) { }
        }).catch(function () {});
    })();

    // 在函数外部/全局定义一个变量，记住当前所在的 APP，防止重复记录
    window.currentActiveApp = null;

    function isPlainObject(v) {
        return !!v && typeof v === 'object' && !Array.isArray(v);
    }

    function pickOne(list) {
        if (!Array.isArray(list) || !list.length) return '';
        return String(list[Math.floor(Math.random() * list.length)] || '');
    }

    function normalizeText(v) {
        return String(v || '').trim();
    }

    function extractSongNameFromText(actionText) {
        var s = normalizeText(actionText);
        if (!s) return '';
        var m = s.match(/播放了歌曲\s*(?:《([^》]{1,80})》|“([^”]{1,80})”|"([^"]{1,80})"|([^，。！？\n]{1,80}))/);
        if (!m) return '';
        return normalizeText(m[1] || m[2] || m[3] || m[4] || '');
    }

    function normalizeRecordArgs(actionOrType, meta) {
        var payload = isPlainObject(meta) ? meta : null;
        var actionText = '';
        var typeKey = '';

        if (isPlainObject(actionOrType)) {
            payload = payload || actionOrType;
            actionText = normalizeText(payload.actionText || payload.text || '');
            typeKey = normalizeText(payload.type || payload.kind || '');
            return { actionText: actionText, typeKey: typeKey, payload: payload };
        }

        var s = normalizeText(actionOrType);
        var known = {
            home: 1,
            wechat: 1,
            music: 1,
            moments: 1,
            space: 1,
            wallet: 1,
            period: 1,
            battery: 1,
            system: 1,
            other: 1
        };
        if (payload && known[s]) {
            typeKey = s;
        } else {
            actionText = s;
        }

        return { actionText: actionText, typeKey: typeKey, payload: payload };
    }

    function detectActivity(actionText, typeKey, payload) {
        var action = normalizeText(actionText);
        var data = isPlainObject(payload) ? payload : null;

        if (typeKey === 'system' && data && String(data.event || '') === 'exit') {
            return {
                app: 'system',
                kind: 'system_exit',
                text: pickOne(['我关闭了手机', '我锁定了手机屏幕']),
                data: null
            };
        }

        if (typeKey === 'battery' && data && String(data.event || '') === 'low') {
            return {
                app: 'system',
                kind: 'battery_low',
                text: '我的手机电量已不足30%',
                data: { level: Number(data.level) }
            };
        }

        if ((typeKey === 'music' && data && data.songName) || (data && data.songName) || action.indexOf('播放了歌曲') >= 0) {
            var songName = normalizeText(data && data.songName ? data.songName : extractSongNameFromText(action));
            if (!songName) songName = '这首歌';
            return {
                app: 'music',
                kind: 'music_play',
                text: pickOne(['我播放了一首《' + songName + '》', '我正在听《' + songName + '》', '我把音乐切到了《' + songName + '》']),
                data: { songName: songName }
            };
        }

        if (action.indexOf('打开了手机') >= 0) {
            return {
                app: 'home',
                kind: 'home_open',
                text: pickOne(['我点亮了手机屏幕', '我解开了手机锁屏', '我拿起手机看了一眼']),
                data: null
            };
        }

        if (action.indexOf('打开了微信') >= 0) {
            if (window.currentActiveApp === 'wechat') return null;
            return {
                app: 'wechat',
                kind: 'wechat_open',
                text: pickOne(['我刚刚打开了微信', '我切到了微信', '我打开微信看了看有没有新消息']),
                data: null
            };
        }

        if (action.indexOf('进入了与') >= 0) {
            var name = normalizeText(action.replace(/.*?进入了与\s*/, '').replace(/\s*的聊天.*/, ''));
            if (!name) name = getActivityUsername();
            return {
                app: 'wechat',
                kind: 'wechat_chat',
                text: pickOne(['我进入了与 ' + name + ' 的聊天', '我点开了 ' + name + ' 的对话框', '我正在看和 ' + name + ' 的聊天记录']),
                data: { peerName: name }
            };
        }

        if (action.indexOf('朋友圈') >= 0) {
            return {
                app: 'moments',
                kind: 'moments_open',
                text: pickOne(['我刷了刷朋友圈', '我点开了朋友圈', '我在朋友圈看了看动态']),
                data: null
            };
        }

        if (action.indexOf('钱包') >= 0) {
            return {
                app: 'wallet',
                kind: 'wallet_open',
                text: pickOne(['我查看了钱包', '我打开钱包看了一眼']),
                data: null
            };
        }

        if (action.indexOf('经期') >= 0) {
            return {
                app: 'period',
                kind: 'period_open',
                text: pickOne(['我查看了经期状态', '我记录了经期']),
                data: null
            };
        }

        if (action.indexOf('打开了音乐') >= 0 || action.indexOf('音乐APP') >= 0 || action.indexOf('音乐App') >= 0) {
            return {
                app: 'music',
                kind: 'music_open',
                text: pickOne(['我打开了音乐APP', '我准备听会儿歌，打开了音乐', '我切到了音乐播放器']),
                data: null
            };
        }

        if (action.indexOf('情侣空间') >= 0) {
            return {
                app: 'space',
                kind: 'space_open',
                text: pickOne(['我悄悄打开了情侣空间', '我进入了情侣空间', '我回到了我们的私密空间']),
                data: null
            };
        }

        var cleanText = normalizeText(action.replace(/^(Ta|.*?(?=打开|进入|播放|点击|查看|记录|关闭|锁定))/, ''));
        var finalActionText = cleanText.indexOf('我') === 0 ? cleanText : ('我' + cleanText);
        return {
            app: 'other',
            kind: 'other',
            text: finalActionText,
            data: null
        };
    }

    function recordActivity(actionOrType, meta) {
        try {
            var normalized = normalizeRecordArgs(actionOrType, meta);
            var result = detectActivity(normalized.actionText, normalized.typeKey, normalized.payload);
            if (!result) return null;

            if (result.app) {
                window.currentActiveApp = result.app;
            }

            var now = Date.now();
            var item = {
                ts: now,
                time: formatActivityTime(new Date(now)),
                text: normalizeText(result.text),
                app: String(result.app || 'other'),
                kind: String(result.kind || 'other')
            };
            if (result.data && isPlainObject(result.data)) {
                item.data = result.data;
            }
            activityMemLogs.push(item);
            if (activityMemLogs.length > MAX_LOGS) {
                activityMemLogs = activityMemLogs.slice(activityMemLogs.length - MAX_LOGS);
            }
            writeActivityLogs(activityMemLogs);
            var forage = getActivityForage();
            if (forage) {
                activityForageQueue = activityForageQueue
                    .then(function () { return forage.setItem(STORAGE_KEY, activityMemLogs.slice(-MAX_LOGS)); })
                    .catch(function () {});
            }
            try {
                var iframe = document.querySelector('#app-content-area iframe');
                var src = iframe && iframe.getAttribute ? String(iframe.getAttribute('src') || '') : '';
                if (iframe && src.indexOf('apps/couple-space.html') !== -1 && iframe.contentWindow && typeof iframe.contentWindow.postMessage === 'function') {
                    iframe.contentWindow.postMessage({ type: 'COUPLE_SPACE_ACTIVITY_REFRESH', at: Date.now() }, '*');
                }
            } catch (e0) { }
            return item;
        } catch (e) {
            return null;
        }
    }

    window.ActivityTracker = {
        key: STORAGE_KEY,
        getUsername: getActivityUsername,
        formatTime: formatActivityTime,
        read: function () {
            return Array.isArray(activityMemLogs) ? activityMemLogs.slice() : [];
        },
        record: recordActivity
    };
    if (typeof window.recordActivity !== 'function') window.recordActivity = recordActivity;
})();

(function () {
    if (window.__coupleSpaceGlobalAiWatcherStarted) return;
    window.__coupleSpaceGlobalAiWatcherStarted = true;

    var COUPLE_SPACE_AI_ACTIVITY_STATE_PREFIX = 'couple_space_ai_activity_state_v1_';
    var SECRET_SPACE_MESSAGES_KEY = 'couple_space_secret_messages_v1';
    var COUPLE_SPACE_ROLE_KEY_SEP = '__roleId__';
    var COUPLE_SPACE_JEALOUSY_META_PREFIX = 'couple_space_jealousy_meta_v1_';
    var JEALOUSY_COOLDOWN_MS = 10 * 60 * 1000;
    var SECRET_USAGE_MASTER_KEY = 'secretUsageMonitorEnabled';
    var SECRET_USAGE_WALLET_KEY = 'secretUsageWalletEnabled';
    var SECRET_USAGE_MUSIC_KEY = 'secretUsageMusicEnabled';
    var SECRET_USAGE_PERIOD_KEY = 'secretUsagePeriodEnabled';
    var inFlightByRole = {};
    var pendingByRole = {};
    var coupleSpaceForage = null;
    var coupleSpaceForageQueue = Promise.resolve();
    var lastAiErrorAt = 0;

    function safeJsonParse(text, fallback) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return fallback;
        }
    }

    function buildCoupleSpaceRoleKey(baseKey, roleId) {
        var k = String(baseKey || '').trim();
        var rid = String(roleId || '').trim();
        if (!k) return '';
        if (!rid) return k;
        if (k.indexOf(COUPLE_SPACE_ROLE_KEY_SEP) !== -1) return k;
        return k + COUPLE_SPACE_ROLE_KEY_SEP + rid;
    }

    function getCoupleSpaceForage() {
        try {
            if (coupleSpaceForage) return coupleSpaceForage;
            if (!window.localforage || typeof window.localforage.createInstance !== 'function') return null;
            coupleSpaceForage = window.localforage.createInstance({
                name: 'shubao_large_store_v1',
                storeName: 'couple_space'
            });
            window.__coupleSpaceForageInstance = coupleSpaceForage;
            return coupleSpaceForage;
        } catch (e) {
            return null;
        }
    }

    function normalizeNameKey(name) {
        return String(name || '')
            .replace(/\s+/g, '')
            .replace(/[·•・]/g, '')
            .trim()
            .toLowerCase();
    }

    function getCoupleLinkState() {
        var has = false;
        var roleId = '';
        try {
            has = localStorage.getItem('couple_has_linked_v1') === 'true';
            roleId = String(localStorage.getItem('couple_linked_role_id_v1') || '').trim();
        } catch (e) { }
        if (!has || !roleId) return { hasCoupleLinked: false, roleId: '' };
        return { hasCoupleLinked: true, roleId: roleId };
    }

    function getSecretUsageMonitorSettings() {
        var raw = '';
        var parsed = {};
        try {
            raw = localStorage.getItem('qlkj_settings_v1') || '';
            parsed = raw ? safeJsonParse(raw, {}) : {};
        } catch (e) {
            parsed = {};
        }
        parsed = parsed && typeof parsed === 'object' ? parsed : {};
        return {
            enabled: parsed[SECRET_USAGE_MASTER_KEY] === true,
            wallet: parsed[SECRET_USAGE_WALLET_KEY] === true,
            music: parsed[SECRET_USAGE_MUSIC_KEY] === true,
            period: parsed[SECRET_USAGE_PERIOD_KEY] === true
        };
    }

    function isSecretUsageTriggerEnabled(trigger) {
        var t = String(trigger || '').trim();
        var s = getSecretUsageMonitorSettings();
        if (!s.enabled) return false;
        if (t === 'wallet') return s.wallet;
        if (t === 'music') return s.music;
        if (t === 'period') return s.period;
        return false;
    }

    function readRoleProfile(roleId) {
        var rid = String(roleId || '').trim();
        if (!rid) return {};
        try {
            if (window.charProfiles && typeof window.charProfiles === 'object' && window.charProfiles[rid]) {
                return window.charProfiles[rid] || {};
            }
        } catch (e) { }
        try {
            var raw = localStorage.getItem('wechat_charProfiles') || '';
            var parsed = raw ? safeJsonParse(raw, {}) : {};
            return parsed && typeof parsed === 'object' && parsed[rid] ? (parsed[rid] || {}) : {};
        } catch (e2) {
            return {};
        }
    }

    function readUserPersona(roleId) {
        var rid = String(roleId || '').trim();
        if (!rid) return {};
        try {
            if (window.userPersonas && typeof window.userPersonas === 'object' && window.userPersonas[rid]) {
                return window.userPersonas[rid] || {};
            }
        } catch (e) { }
        return {};
    }

    function getRoleNameVariants(roleId) {
        var rid = String(roleId || '').trim();
        var p = readRoleProfile(rid);
        var variants = [];
        variants.push(rid);
        variants.push(p.remark);
        variants.push(p.nickName);
        variants.push(p.name);
        variants.push(p.displayName);
        return variants
            .map(function (v) { return String(v || '').trim(); })
            .filter(function (v) { return !!v; });
    }

    function getRoleNameKeys(roleId) {
        var variants = getRoleNameVariants(roleId);
        var keys = {};
        for (var i = 0; i < variants.length; i++) {
            var k = normalizeNameKey(variants[i]);
            if (k) keys[k] = true;
        }
        return keys;
    }

    function pickPeerName(activity) {
        try {
            var data = activity && typeof activity === 'object' ? activity.data : null;
            var fromData = data && typeof data === 'object' ? String(data.peerName || '').trim() : '';
            if (fromData) return fromData;
        } catch (e) { }
        var text = String(activity && activity.text ? activity.text : '').trim();
        var m = text.match(/与\s*([^，。]+?)\s*的聊天/);
        if (m && m[1]) return String(m[1]).trim();
        return '';
    }

    function readState(roleId) {
        var rid = String(roleId || '').trim();
        if (!rid) return { normalCount: 0, buffer: [] };
        try {
            var raw = localStorage.getItem(COUPLE_SPACE_AI_ACTIVITY_STATE_PREFIX + rid) || '';
            if (!raw) return { normalCount: 0, buffer: [] };
            var parsed = safeJsonParse(raw, null);
            var obj = parsed && typeof parsed === 'object' ? parsed : null;
            if (!obj) return { normalCount: 0, buffer: [] };
            var normalCount = Number(obj.normalCount || 0) || 0;
            var buffer = Array.isArray(obj.buffer) ? obj.buffer.filter(function (it) { return it && typeof it === 'object'; }) : [];
            return { normalCount: normalCount, buffer: buffer };
        } catch (e) {
            return { normalCount: 0, buffer: [] };
        }
    }

    function writeState(roleId, st) {
        var rid = String(roleId || '').trim();
        if (!rid) return;
        var obj = st && typeof st === 'object' ? st : {};
        var normalCount = Number(obj.normalCount || 0) || 0;
        var buffer = Array.isArray(obj.buffer) ? obj.buffer.slice(-30) : [];
        try {
            localStorage.setItem(COUPLE_SPACE_AI_ACTIVITY_STATE_PREFIX + rid, JSON.stringify({ normalCount: normalCount, buffer: buffer }));
        } catch (e) { }
    }

    function readActivityLogsForPrompt() {
        try {
            if (window.ActivityTracker && typeof window.ActivityTracker.read === 'function') {
                var list = window.ActivityTracker.read();
                if (Array.isArray(list)) return list;
            }
        } catch (e) { }
        try {
            var raw = localStorage.getItem('app_activity_logs') || '';
            var parsed = raw ? safeJsonParse(raw, []) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e2) {
            return [];
        }
    }

    function formatTsForPrompt(ts) {
        var n = Number(ts || 0) || 0;
        if (!n) return '';
        var d = new Date(n);
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        return hh + ':' + mm;
    }

    function buildRecentActivityOps(limit) {
        var n = Math.max(3, Math.min(20, Number(limit || 10) || 10));
        var logs = readActivityLogsForPrompt();
        var clean = logs
            .filter(function (it) { return it && typeof it === 'object'; })
            .map(function (it) {
                var text = String(it && it.text ? it.text : '').trim();
                if (!text) return null;
                return {
                    ts: Number(it.ts || Date.now()) || Date.now(),
                    time: formatTsForPrompt(it.ts),
                    app: String(it.app || '').trim(),
                    kind: String(it.kind || '').trim(),
                    text: text
                };
            })
            .filter(function (it) { return !!it; });
        if (!clean.length) return [];
        return clean.slice(clean.length - n);
    }

    function normalizeSecretMessageItem(it) {
        if (!it || typeof it !== 'object') return null;
        var ts = Number(it.ts || it.timestamp || it.createdAt || 0) || 0;
        if (!ts) return null;
        var rawType = String(it.type || it.messageType || '').trim();
        var type =
            rawType === 'ai_message' || rawType === 'ai' || rawType === 'assistant' || rawType === 'role'
                ? 'ai_message'
                : 'message';
        var msgType = String(it.messageType || '').trim().toLowerCase();
        if (!msgType && rawType === 'transfer_card') msgType = 'transfer_card';
        if (!msgType) msgType = 'text';
        var text = String(it.text || it.content || it.msg || '').trim();
        var out = { type: type, ts: ts, messageType: msgType, text: text };
        if (msgType === 'transfer_card') {
            out.type = 'ai_message';
            out.amount = Number(it.amount || 0) || 0;
            out.color = String(it.color || 'pink').trim() || 'pink';
            out.content = String(it.content || text || '').trim();
            out.status = String(it.status || 'pending').trim() || 'pending';
            if (!out.text) out.text = out.content || (out.amount > 0 ? ('给你转了 ¥' + out.amount) : '给你转了一笔钱');
        }
        if (!out.text) return null;
        return out;
    }

    function readSecretSpaceMessages(roleId) {
        var rid = String(roleId || '').trim();
        if (!rid) return [];
        var key = buildCoupleSpaceRoleKey(SECRET_SPACE_MESSAGES_KEY, rid);
        var legacyKey = SECRET_SPACE_MESSAGES_KEY;
        try {
            var raw = (localStorage.getItem(key) || '') || (key !== legacyKey ? (localStorage.getItem(legacyKey) || '') : '');
            if (!raw) return [];
            var parsed = safeJsonParse(raw, []);
            if (!Array.isArray(parsed)) return [];
            return parsed
                .map(normalizeSecretMessageItem)
                .filter(function (it) { return !!it; })
                .sort(function (a, b) { return Number(a.ts || 0) - Number(b.ts || 0); });
        } catch (e) {
            return [];
        }
    }

    function formatTsForPromptFull(ts) {
        var n = Number(ts || 0) || 0;
        if (!n) return '';
        var d = new Date(n);
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        return y + '-' + m + '-' + day + ' ' + hh + ':' + mm;
    }

    function formatAgoMinutes(ts) {
        var n = Number(ts || 0) || 0;
        if (!n) return '';
        var delta = Date.now() - n;
        if (delta < 0) delta = 0;
        var mins = Math.floor(delta / 60000);
        if (mins < 1) return '刚刚';
        if (mins < 60) return mins + '分钟前';
        var hours = Math.floor(mins / 60);
        if (hours < 24) return hours + '小时前';
        var days = Math.floor(hours / 24);
        return days + '天前';
    }

    function buildSecretCurrentRoundUserLines(roleId, maxItems) {
        var rid = String(roleId || '').trim();
        if (!rid) return [];
        var n = Math.max(1, Math.min(10, Number(maxItems || 4) || 4));
        var list = readSecretSpaceMessages(rid);
        if (!list.length) return [];
        var lastAiTs = 0;
        for (var i = list.length - 1; i >= 0; i--) {
            var msg = list[i];
            if (!msg || msg.type !== 'ai_message') continue;
            lastAiTs = Number(msg.ts || 0) || 0;
            if (lastAiTs) break;
        }
        var lines = [];
        for (var j = 0; j < list.length; j++) {
            var it = list[j];
            if (!it || it.type !== 'message') continue;
            var ts = Number(it.ts || 0) || 0;
            if (lastAiTs && ts <= lastAiTs) continue;
            var t = String(it.text || '').replace(/\s+/g, ' ').trim();
            if (!t) continue;
            var stamp = formatTsForPromptFull(ts);
            lines.push(stamp ? ('[' + stamp + '] ' + t) : t);
        }
        if (!lines.length) return [];
        return lines.slice(lines.length - n);
    }

    function buildRecentSecretTimelineLines(roleId, maxItems) {
        var rid = String(roleId || '').trim();
        if (!rid) return [];
        var n = Math.max(10, Math.min(120, Number(maxItems || 50) || 50));
        var list = readSecretSpaceMessages(rid);
        var lines = [];
        for (var i = 0; i < list.length; i++) {
            var it = list[i];
            if (!it || (it.type !== 'message' && it.type !== 'ai_message')) continue;
            var text = String(it.text || '').replace(/\s+/g, ' ').trim();
            if (!text) continue;
            var who = it.type === 'message' ? '我(秘密空间)' : '你(秘密空间)';
            var stamp = formatTsForPromptFull(it.ts);
            lines.push((stamp ? ('[' + stamp + '] ') : '') + who + '：' + text);
        }
        if (!lines.length) return [];
        return lines.slice(lines.length - n);
    }

    function getLatestSecretAiReplyMeta(roleId) {
        var rid = String(roleId || '').trim();
        if (!rid) return { ts: 0, text: '' };
        var list = readSecretSpaceMessages(rid);
        for (var i = list.length - 1; i >= 0; i--) {
            var it = list[i];
            if (!it || it.type !== 'ai_message') continue;
            var txt = String(it.text || '').replace(/\s+/g, ' ').trim();
            if (!txt) continue;
            return { ts: Number(it.ts || 0) || 0, text: txt };
        }
        return { ts: 0, text: '' };
    }

    function readJealousyMeta(roleId) {
        var rid = String(roleId || '').trim();
        if (!rid) return { cooldownByPeer: {}, history: [] };
        try {
            var raw = localStorage.getItem(COUPLE_SPACE_JEALOUSY_META_PREFIX + rid) || '';
            if (!raw) return { cooldownByPeer: {}, history: [] };
            var parsed = safeJsonParse(raw, null);
            var obj = parsed && typeof parsed === 'object' ? parsed : null;
            if (!obj) return { cooldownByPeer: {}, history: [] };
            var cooldownByPeer = obj.cooldownByPeer && typeof obj.cooldownByPeer === 'object' ? obj.cooldownByPeer : {};
            var history = Array.isArray(obj.history) ? obj.history : [];
            return { cooldownByPeer: cooldownByPeer, history: history };
        } catch (e) {
            return { cooldownByPeer: {}, history: [] };
        }
    }

    function writeJealousyMeta(roleId, next) {
        var rid = String(roleId || '').trim();
        if (!rid) return;
        var obj = next && typeof next === 'object' ? next : {};
        var cooldownByPeer = obj.cooldownByPeer && typeof obj.cooldownByPeer === 'object' ? obj.cooldownByPeer : {};
        var history = Array.isArray(obj.history) ? obj.history : [];
        try {
            localStorage.setItem(
                COUPLE_SPACE_JEALOUSY_META_PREFIX + rid,
                JSON.stringify({ cooldownByPeer: cooldownByPeer, history: history.slice(-8) })
            );
        } catch (e) { }
    }

    function shouldThrottleJealousy(roleId, peerName) {
        var rid = String(roleId || '').trim();
        if (!rid) return false;
        var peerKey = normalizeNameKey(peerName || '__unknown_peer__');
        if (!peerKey) peerKey = '__unknown_peer__';
        var meta = readJealousyMeta(rid);
        var ts = Number(meta.cooldownByPeer && meta.cooldownByPeer[peerKey] || 0) || 0;
        if (!ts) return false;
        return Date.now() - ts < JEALOUSY_COOLDOWN_MS;
    }

    function markJealousyTriggered(roleId, peerName) {
        var rid = String(roleId || '').trim();
        if (!rid) return;
        var peerKey = normalizeNameKey(peerName || '__unknown_peer__');
        if (!peerKey) peerKey = '__unknown_peer__';
        var meta = readJealousyMeta(rid);
        meta.cooldownByPeer = meta.cooldownByPeer && typeof meta.cooldownByPeer === 'object' ? meta.cooldownByPeer : {};
        meta.cooldownByPeer[peerKey] = Date.now();
        writeJealousyMeta(rid, meta);
    }

    function rememberJealousyReply(roleId, peerName, items) {
        var rid = String(roleId || '').trim();
        if (!rid) return;
        var list = Array.isArray(items) ? items : [];
        var lines = list
            .map(function (it) {
                if (!it || typeof it !== 'object') return '';
                if (it.type === 'transfer_card') return '';
                return String(it.content || '').replace(/\s+/g, ' ').trim();
            })
            .filter(function (t) { return !!t; });
        if (!lines.length) return;
        var meta = readJealousyMeta(rid);
        if (!Array.isArray(meta.history)) meta.history = [];
        meta.history.push({
            ts: Date.now(),
            peerName: String(peerName || '').trim() || '某个人',
            lines: lines.slice(0, 6)
        });
        if (meta.history.length > 8) meta.history = meta.history.slice(meta.history.length - 8);
        writeJealousyMeta(rid, meta);
    }

    function buildJealousyMemoryLines(roleId, maxItems) {
        var rid = String(roleId || '').trim();
        if (!rid) return [];
        var n = Math.max(1, Math.min(5, Number(maxItems || 3) || 3));
        var meta = readJealousyMeta(rid);
        var history = Array.isArray(meta.history) ? meta.history.slice(meta.history.length - n) : [];
        return history.map(function (it) {
            var peer = String(it && it.peerName ? it.peerName : '某个人').trim() || '某个人';
            var lines = Array.isArray(it && it.lines ? it.lines : []) ? it.lines : [];
            var text = lines.join(' / ').trim();
            var ts = Number(it && it.ts ? it.ts : 0) || 0;
            var tsLabel = ts ? (formatTsForPromptFull(ts) + '（' + formatAgoMinutes(ts) + '）') : '未知时间';
            return text
                ? ('- [' + tsLabel + '] 对「' + peer + '」的上次吃醋话术：' + text)
                : ('- [' + tsLabel + '] 对「' + peer + '」触发过吃醋');
        });
    }

    function extractJsonObject(text) {
        var raw = String(text || '').trim();
        if (!raw) return null;
        var fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
        var candidate = fenced && fenced[1] ? String(fenced[1]).trim() : raw;
        var first = candidate.indexOf('{');
        var last = candidate.lastIndexOf('}');
        if (first === -1 || last === -1 || last <= first) return null;
        var slice = candidate.slice(first, last + 1);
        try {
            return JSON.parse(slice);
        } catch (e) {
            return null;
        }
    }

    function normalizeAiReplyText(text) {
        var raw = String(text || '').trim();
        if (!raw) return '';
        var obj = extractJsonObject(raw);
        if (obj && typeof obj === 'object') {
            if (typeof obj.reply === 'string') return obj.reply.trim();
            if (typeof obj.text === 'string') return obj.text.trim();
            if (typeof obj.content === 'string') return obj.content.trim();
        }
        var fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenced && fenced[1]) {
            var inner = String(fenced[1]).trim();
            if (inner) return inner;
        }
        return raw;
    }

    function readWechatChatHistory(roleId) {
        var rid = String(roleId || '').trim();
        if (!rid) return [];
        try {
            if (window.chatData && Array.isArray(window.chatData[rid])) return window.chatData[rid].slice();
        } catch (e) { }
        try {
            var raw = localStorage.getItem('wechat_chatData');
            var parsed = raw ? safeJsonParse(raw, {}) : {};
            var list = parsed && typeof parsed === 'object' && Array.isArray(parsed[rid]) ? parsed[rid] : [];
            return list.slice();
        } catch (e2) {
            return [];
        }
    }

    function cleanChatHistoryForMemory(history) {
        var list = Array.isArray(history) ? history : [];
        var out = [];
        for (var i = 0; i < list.length; i++) {
            var msg = list[i];
            if (!msg || typeof msg !== 'object') continue;
            if (msg.hidden === true) continue;
            if (msg.type === 'call_memory' || msg.type === 'system_event') {
                if (msg.includeInAI !== true) continue;
            }
            if (!msg.content) continue;
            out.push(Object.assign({}, msg));
        }
        return out;
    }

    function buildHistoryForApi(roleId, cleanHistory) {
        try {
            if (typeof window.buildApiMemoryHistory === 'function') {
                return window.buildApiMemoryHistory(roleId, cleanHistory);
            }
        } catch (e) { }
        return cleanHistory.slice(-50);
    }

    function buildRoleSystemPrompt(roleId) {
        var rid = String(roleId || '').trim();
        var profile = readRoleProfile(rid);
        var userPersona = readUserPersona(rid);
        var roleNameForAI = profile.nickName || rid || 'TA';
        var systemPrompt = '【角色名称】' + String(roleNameForAI || 'TA') + '\n' + String(profile.desc || '你是一个友好的AI助手');
        if (profile.style && String(profile.style).trim()) {
            systemPrompt += '\n\n【聊天风格】\n' + String(profile.style).trim();
        }
        if (userPersona.name || userPersona.setting) {
            systemPrompt += '\n\n【关于对话的另一方（用户）】\n';
            if (userPersona.name) systemPrompt += '用户名字：' + String(userPersona.name) + '\n';
            if (userPersona.setting) systemPrompt += '用户背景：' + String(userPersona.setting) + '\n';
        }
        try {
            if (typeof window.buildWorldBookPrompt === 'function' && profile.worldbookId) {
                var wb = window.buildWorldBookPrompt(profile.worldbookId);
                if (wb) systemPrompt += wb;
            }
        } catch (e2) { }
        return systemPrompt;
    }

    function getUserName(roleId) {
        var persona = readUserPersona(roleId);
        var name = String(persona && persona.name ? persona.name : '').trim();
        if (name) return name;
        name = String(localStorage.getItem('user_name') || '').trim();
        return name || '我';
    }

    function buildExtraSystemPrompt(roleId, trigger, context) {
        var rid = String(roleId || '').trim();
        var profile = readRoleProfile(rid);
        var roleName = String(profile.remark || profile.nickName || profile.name || rid || 'Ta').trim() || 'Ta';
        var userName = getUserName(rid);
        var trig = String(trigger || '').trim();
        var ctx = context && typeof context === 'object' ? context : {};
        var jealousyMemoryLines = Array.isArray(ctx.jealousyMemoryLines) ? ctx.jealousyMemoryLines : [];
        var hasCurrentSecretUserSpeech = Array.isArray(ctx.secretCurrentRoundUserLines) && ctx.secretCurrentRoundUserLines.length > 0;
        var jealousyMemoryBlock = jealousyMemoryLines.length
            ? ('\n【短期吃醋记忆】\n' + jealousyMemoryLines.join('\n') + '\n')
            : '\n【短期吃醋记忆】\n（暂无）\n';
        return (
            '你现在是' + roleName + '。' + userName + '是你的恋人，你处于情侣空间的秘密互动场景。\n' +
            '你必须严格按输入顺序理解上下文，不要改顺序，不要混场景。\n' +
            '你只基于“秘密空间用户发言 + 秘密空间双方历史 + 用户操作记录”回复，禁止引用微信聊天内容。\n' +
            '你必须符合人设说话，语气和行为要和角色设定一致。\n' +
            '回复目标：\n' +
            (hasCurrentSecretUserSpeech
                ? '1) 先对“用户刚刚的秘密空间发言”回复；\n2) 再对“用户刚刚操作记录”回复。\n'
                : '1) 当前轮无新的秘密空间用户发言时，不要捏造新发言；\n2) 先基于双方历史自然续接，再对“用户刚刚操作记录”回复。\n') +
            '输出必须是纯 JSON 数组，长度 3~10 条，禁止 Markdown、禁止解释。\n' +
            '数组元素只允许两种：\n' +
            '1) {"type":"text","content":"..."}；如果自动翻译层要求 translated_text，content 可以是 {"type":"translated_text","foreign":"角色原话","translation":"简体中文翻译"}\n' +
            '2) {"type":"transfer_card","amount":520,"color":"pink","content":"拿去花"}\n' +
            '当决定转账时，要先输出几条 text，再输出 transfer_card；amount 必须符合你的人设财力。\n' +
            '当操作记录数组里出现“钱包/查看钱包/打开钱包”相关行为时，你可以评估是否触发 transfer_card。\n' +
            '如果不是转账场景，不要硬塞 transfer_card。\n' +
            (trig === 'wechat_other'
                ? ('当前触发是“发现恋人和别人聊天”，你要体现递进吃醋，不要和上次说法重复。' + jealousyMemoryBlock)
                : '当前触发不是吃醋主线，优先自然关心与陪伴。')
        );
    }

    function buildUserPrompt(trigger, payload, roleId, context) {
        var userName = getUserName(roleId);
        var roleName = (getRoleNameVariants(roleId)[0] || 'Ta');
        var ctx = context && typeof context === 'object' ? context : {};
        var ops = Array.isArray(ctx.ops) ? ctx.ops : [];
        var secretTimelineLines = Array.isArray(ctx.secretTimelineLines) ? ctx.secretTimelineLines : [];
        var secretCurrentRoundUserLines = Array.isArray(ctx.secretCurrentRoundUserLines) ? ctx.secretCurrentRoundUserLines : [];
        var secretCurrentUserBlock = secretCurrentRoundUserLines.length ? secretCurrentRoundUserLines.map(function (s) { return '- ' + s; }).join('\n') : '（当前轮无新的秘密空间用户发言）';
        var secretTimelineBlock = secretTimelineLines.length ? secretTimelineLines.map(function (s) { return '- ' + s; }).join('\n') : '（暂无）';
        var opsPayload = ops.map(function (it) {
            return {
                time: String(it && it.time ? it.time : '').trim(),
                app: String(it && it.app ? it.app : '').trim(),
                kind: String(it && it.kind ? it.kind : '').trim(),
                text: String(it && it.text ? it.text : '').trim()
            };
        }).filter(function (it) { return !!it.text; });
        var opsJson = opsPayload.length ? JSON.stringify(opsPayload, null, 2) : '[]';
        var commonBlock =
            '你当前可见输入：\n' +
            '【1. 用户说话内容（秘密空间）】\n' + secretCurrentUserBlock + '\n\n' +
            '【2. 双方在秘密空间里的近50条对话记录（含时间）】\n' + secretTimelineBlock + '\n\n' +
            '【3. 用户刚刚的操作记录】\n' + opsJson + '\n\n' +
            '执行要求：\n' +
            (secretCurrentRoundUserLines.length
                ? '1) 先回复“秘密空间当前轮用户新发言”；\n2) 再回复“操作记录”。'
                : '1) 当前轮没有新的秘密空间用户发言，不要硬造“她刚刚说了什么”；\n2) 先基于秘密空间双方历史自然续接，再回复操作记录。');

        if (trigger === 'wallet') {
            return (
                commonBlock + '\n\n' +
                '场景补充：你看到' + userName + '刚刚打开了钱包。\n' +
                '你可以根据人设决定是否发起转账；如果要转账，请在后半段附带 transfer_card。'
            );
        }
        if (trigger === 'period') {
            return (
                commonBlock + '\n\n' +
                '场景补充：你看到' + userName + '刚刚打开了经期记录页面。\n' +
                '请输出体贴且自然的关心，不要机械复读。'
            );
        }
        if (trigger === 'music') {
            return (
                commonBlock + '\n\n' +
                '场景补充：你看到' + userName + '刚刚打开了音乐APP。\n' +
                '请自然回应，可以温柔追问对方在听什么。'
            );
        }
        if (trigger === 'wechat_other') {
            var peerName = String(payload && payload.peerName ? payload.peerName : '').trim() || '某个人';
            var jealousyMemoryLines = Array.isArray(ctx.jealousyMemoryLines) ? ctx.jealousyMemoryLines : [];
            var jealousyBlock = jealousyMemoryLines.length ? jealousyMemoryLines.join('\n') : '（暂无）';
            return (
                commonBlock + '\n\n' +
                '场景：你在情侣空间里看到' + userName + '打开了微信里和「' + peerName + '」的聊天。\n' +
                '注意：情侣空间里与你绑定的对象是「' + roleName + '」，而' + peerName + '不是你。\n' +
                '你要吃醋、想打断她，但要和上一次吃醋话术形成递进。\n' +
                '【你最近的吃醋记录】\n' + jealousyBlock
            );
        }
        return (
            commonBlock + '\n\n' +
            '场景：你在情侣空间里看到了' + userName + '最近的操作记录。\n' +
            '请你根据人设作出恋人式回复。'
        );
    }

    function splitAiReplySegments(text) {
        var raw = String(text || '').replace(/\r\n/g, '\n').trim();
        if (!raw) return [];
        var seps = [
            /\n\s*[-—]{3,}\s*\n/g,
            /\n\s*\*{3,}\s*\n/g,
            /\n\s*#{3,}\s*\n/g,
            /\n\s*={3,}\s*\n/g,
            /\n\s*——+\s*\n/g
        ];
        for (var i = 0; i < seps.length; i++) {
            var parts = raw.split(seps[i]).map(function (s) { return String(s || '').trim(); }).filter(function (s) { return !!s; });
            if (parts.length > 1) return parts;
        }
        if (raw.indexOf('|||') >= 0) {
            var p2 = raw.split(/\s*\|\|\|\s*/g).map(function (s) { return String(s || '').trim(); }).filter(function (s) { return !!s; });
            if (p2.length > 1) return p2;
        }
        return [raw];
    }

    function extractJsonArray(text) {
        var raw = String(text || '').trim();
        if (!raw) return null;
        function parseMaybeJson(candidate) {
            try {
                var parsed = JSON.parse(candidate);
                if (Array.isArray(parsed)) return parsed;
                if (parsed && typeof parsed === 'object' && Array.isArray(parsed.reply)) return parsed.reply;
                if (parsed && typeof parsed === 'object' && Array.isArray(parsed.reply_bubbles)) return parsed.reply_bubbles;
                if (parsed && typeof parsed === 'object' && Array.isArray(parsed.replyBubbles)) return parsed.replyBubbles;
                if (parsed && typeof parsed === 'object' && Array.isArray(parsed.messages)) return parsed.messages;
                if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) return parsed.items;
                if (parsed && typeof parsed === 'object' && Array.isArray(parsed.lines)) return parsed.lines;
                return null;
            } catch (e) {
                return null;
            }
        }
        var direct = parseMaybeJson(raw);
        if (direct) return direct;
        var fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenced && fenced[1]) {
            var inFence = parseMaybeJson(String(fenced[1]).trim());
            if (inFence) return inFence;
        }
        var first = raw.indexOf('[');
        var last = raw.lastIndexOf(']');
        if (first !== -1 && last !== -1 && last > first) {
            var sliced = parseMaybeJson(raw.slice(first, last + 1));
            if (sliced) return sliced;
        }
        return null;
    }

    function extractJsonObject(text) {
        var raw = String(text || '').trim();
        if (!raw) return null;
        function parseMaybeJson(candidate) {
            try {
                var parsed = JSON.parse(candidate);
                return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
            } catch (e) {
                return null;
            }
        }
        var direct = parseMaybeJson(raw);
        if (direct) return direct;
        var fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenced && fenced[1]) {
            var inFence = parseMaybeJson(String(fenced[1]).trim());
            if (inFence) return inFence;
        }
        var first = raw.indexOf('{');
        var last = raw.lastIndexOf('}');
        if (first !== -1 && last !== -1 && last > first) {
            return parseMaybeJson(raw.slice(first, last + 1));
        }
        return null;
    }

    function translatedFieldText(value) {
        if (value == null) return '';
        if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
        if (Array.isArray(value)) {
            return value.map(translatedFieldText).filter(Boolean).join('\n').trim();
        }
        if (typeof value === 'object') {
            return String(value.text || value.content || value.value || value.message || '').trim();
        }
        return '';
    }

    function firstTranslatedField(payload, keys) {
        var source = payload && typeof payload === 'object' ? payload : {};
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (source[key] != null) return source[key];
        }
        return null;
    }

    function formatInlineTranslatedText(value) {
        var payload = value;
        if (typeof payload === 'string') {
            payload = safeJsonParse(payload, null) || extractJsonObject(payload);
        }
        if (!payload || typeof payload !== 'object') return '';
        var rawType = String(payload.type || payload.messageType || payload.kind || '').trim().toLowerCase();
        var hasTranslatedType = rawType === 'translated_text' || rawType === 'translated';
        var foreign = firstTranslatedField(payload, [
            'foreign',
            'original',
            'originalText',
            'original_text',
            'source',
            'sourceText',
            'foreignText',
            'foreign_text',
            'bodyText'
        ]);
        var translation = firstTranslatedField(payload, [
            'translation',
            'chinese',
            'chineseText',
            'translation_text',
            'translationText',
            'zh',
            'cn'
        ]);
        var foreignText = translatedFieldText(foreign);
        var translationText = translatedFieldText(translation);
        if (!hasTranslatedType && !(foreignText && translationText)) return '';
        var bodyText = foreignText || String(payload.text || payload.content || '').trim();
        var finalTranslation = translationText || bodyText;
        if (!bodyText && !finalTranslation) return '';
        return bodyText && finalTranslation && bodyText !== finalTranslation
            ? bodyText + '（' + finalTranslation + '）'
            : (bodyText || finalTranslation);
    }

    function normalizeSecretVisibleText(value) {
        if (value == null) return '';
        var inline = formatInlineTranslatedText(value);
        if (inline) return inline;
        if (typeof value === 'object') {
            return normalizeSecretVisibleText(value.content || value.text || value.reply || value.message || value.value || '');
        }
        var raw = String(value || '').trim();
        if (!raw || raw === '[object Object]') return '';
        inline = formatInlineTranslatedText(raw);
        if (inline) return inline;
        return raw;
    }

    function splitShortLines(text, maxItems) {
        var n = Math.max(1, Math.min(10, Number(maxItems || 6) || 6));
        var raw = String(text || '').replace(/\r\n/g, '\n').trim();
        if (!raw) return [];
        var lines = raw
            .split(/\n+/)
            .map(function (s) { return String(s || '').replace(/^[\-\d\.\)\s]+/, '').trim(); })
            .filter(function (s) { return !!s; });
        if (lines.length <= 1) {
            lines = raw
                .split(/(?<=[。！？!?~…])/)
                .map(function (s) { return String(s || '').trim(); })
                .filter(function (s) { return !!s; });
        }
        return lines.slice(0, n);
    }

    function normalizeReactionMessageItem(it) {
        if (typeof it === 'string') {
            var txt = normalizeSecretVisibleText(it);
            return txt ? { type: 'text', content: txt } : null;
        }
        if (!it || typeof it !== 'object') return null;
        var rawType = String(it.type || '').trim().toLowerCase();
        if (rawType === 'translated_text' || rawType === 'translated') {
            var translatedText = normalizeSecretVisibleText(it);
            return translatedText ? { type: 'text', content: translatedText } : null;
        }
        if (!rawType || rawType === 'text' || rawType === 'message') {
            var content = normalizeSecretVisibleText(it.content || it.text || it.msg || '');
            return content ? { type: 'text', content: content } : null;
        }
        if (rawType === 'transfer_card') {
            var amount = Number(it.amount || 0) || 0;
            if (!(amount > 0)) return null;
            var content2 = normalizeSecretVisibleText(it.content || it.text || '拿去花') || '拿去花';
            var color = String(it.color || 'pink').trim().toLowerCase();
            if (!color) color = 'pink';
            return {
                type: 'transfer_card',
                amount: Math.round(amount * 100) / 100,
                color: color,
                content: content2
            };
        }
        var fallback = normalizeSecretVisibleText(it.content || it.text || it.msg || '');
        return fallback ? { type: 'text', content: fallback } : null;
    }

    function parseReactionMessages(rawText) {
        var array = extractJsonArray(rawText);
        var items = [];
        if (Array.isArray(array)) {
            for (var i = 0; i < array.length; i++) {
                var n = normalizeReactionMessageItem(array[i]);
                if (n) items.push(n);
            }
        }
        if (!items.length) {
            var obj = extractJsonObject(rawText);
            var normalizedObj = normalizeReactionMessageItem(obj);
            if (normalizedObj) items.push(normalizedObj);
        }
        if (!items.length) {
            var lines = splitShortLines(normalizeAiReplyText(rawText), 6);
            for (var j = 0; j < lines.length; j++) {
                items.push({ type: 'text', content: lines[j] });
            }
        }
        if (items.length > 10) items = items.slice(0, 10);
        if (items.length < 3) {
            var lineFill = splitShortLines(normalizeAiReplyText(rawText), 10);
            for (var k = 0; k < lineFill.length && items.length < 3; k++) {
                var exists = items.some(function (it) { return it.type === 'text' && it.content === lineFill[k]; });
                if (!exists) items.push({ type: 'text', content: lineFill[k] });
            }
        }
        return items;
    }

    function getPreviewTextFromReactionItems(items) {
        var list = Array.isArray(items) ? items : [];
        for (var i = 0; i < list.length; i++) {
            var it = list[i];
            if (!it || typeof it !== 'object') continue;
            if (it.type === 'text') {
                var t = String(it.content || '').trim();
                if (t) return t;
            }
        }
        for (var j = 0; j < list.length; j++) {
            var card = list[j];
            if (!card || card.type !== 'transfer_card') continue;
            var amount = Number(card.amount || 0) || 0;
            var c = String(card.content || '').trim();
            if (c) return c;
            if (amount > 0) return '给你转了 ¥' + amount;
        }
        return '';
    }

    function appendSecretSpaceAiMessages(list, baseTs, roleId) {
        var items = Array.isArray(list) ? list : [];
        var clean = items.map(function (it, idx) {
            var ts = (Number(baseTs) || Date.now()) + idx;
            if (typeof it === 'string') {
                var text = normalizeSecretVisibleText(it);
                if (!text) return null;
                return { type: 'ai_message', ts: ts, text: text };
            }
            if (!it || typeof it !== 'object') return null;
            if (String(it.type || '').trim() === 'transfer_card') {
                var amount = Number(it.amount || 0) || 0;
                if (!(amount > 0)) return null;
                var content = normalizeSecretVisibleText(it.content || it.text || '') || '拿去花';
                return {
                    type: 'ai_message',
                    messageType: 'transfer_card',
                    ts: ts,
                    text: content,
                    amount: Math.round(amount * 100) / 100,
                    color: String(it.color || 'pink').trim() || 'pink',
                    content: content,
                    status: 'pending'
                };
            }
            var txt = normalizeSecretVisibleText(it.content || it.text || it);
            if (!txt) return null;
            return { type: 'ai_message', messageType: 'text', ts: ts, text: txt };
        }).filter(function (it) { return !!it; });
        if (!clean.length) return false;
        var ok = false;
        var start = Number(baseTs) || Date.now();
        var key = buildCoupleSpaceRoleKey(SECRET_SPACE_MESSAGES_KEY, roleId);
        var legacyKey = SECRET_SPACE_MESSAGES_KEY;
        try {
            var raw = (localStorage.getItem(key) || '') || (key !== legacyKey ? (localStorage.getItem(legacyKey) || '') : '');
            var parsed = raw ? safeJsonParse(raw, []) : [];
            var localList = Array.isArray(parsed) ? parsed : [];
            for (var i = 0; i < clean.length; i++) {
                var next = clean[i];
                if (!next.ts) next.ts = start + i;
                localList.push(next);
            }
            localStorage.setItem(key, JSON.stringify(localList.slice(-300)));
            if (key !== legacyKey) {
                try { localStorage.removeItem(legacyKey); } catch (e2) { }
            }
            ok = true;
        } catch (e) { }

        var forage = getCoupleSpaceForage();
        if (forage) {
            ok = true;
            coupleSpaceForageQueue = coupleSpaceForageQueue
                .then(function () {
                    return Promise.all([forage.getItem(key), (key !== legacyKey ? forage.getItem(legacyKey) : Promise.resolve(null))]).then(function (vals) {
                        var val = vals && vals.length ? vals[0] : null;
                        var legacyVal = vals && vals.length > 1 ? vals[1] : null;
                        var base = [];
                        if (Array.isArray(val)) {
                            base = val;
                        } else if (typeof val === 'string') {
                            var p = safeJsonParse(val, []);
                            if (Array.isArray(p)) base = p;
                        }
                        if (!base.length && legacyVal) {
                            if (Array.isArray(legacyVal)) {
                                base = legacyVal;
                            } else if (typeof legacyVal === 'string') {
                                var p2 = safeJsonParse(legacyVal, []);
                                if (Array.isArray(p2)) base = p2;
                            }
                        }
                        for (var j = 0; j < clean.length; j++) {
                            var next2 = clean[j];
                            if (!next2.ts) next2.ts = start + j;
                            base.push(next2);
                        }
                        if (base.length > 300) base = base.slice(base.length - 300);
                        return forage.setItem(key, base).then(function () {
                            if (key !== legacyKey) {
                                return forage.removeItem(legacyKey).catch(function () {});
                            }
                        });
                    });
                })
                .catch(function () {});
        }
        return ok;
    }

    function notifyCoupleSpaceSecretRefresh() {
        try {
            var iframe = document.querySelector('#app-content-area iframe');
            var src = iframe && iframe.getAttribute ? String(iframe.getAttribute('src') || '') : '';
            if (!iframe || src.indexOf('apps/couple-space.html') === -1) return;
            if (iframe.contentWindow && typeof iframe.contentWindow.postMessage === 'function') {
                iframe.contentWindow.postMessage({ type: 'COUPLE_SPACE_SECRET_REFRESH', at: Date.now() }, '*');
            }
        } catch (e) { }
    }

    function notifyCoupleSpaceActivityRefresh() {
        try {
            var iframe = document.querySelector('#app-content-area iframe');
            var src = iframe && iframe.getAttribute ? String(iframe.getAttribute('src') || '') : '';
            if (!iframe || src.indexOf('apps/couple-space.html') === -1) return;
            if (iframe.contentWindow && typeof iframe.contentWindow.postMessage === 'function') {
                iframe.contentWindow.postMessage({ type: 'COUPLE_SPACE_ACTIVITY_REFRESH', at: Date.now() }, '*');
            }
        } catch (e) { }
    }

    function showTopNotification(roleId, text, durationMs) {
        var rid = String(roleId || '').trim();
        var profile = readRoleProfile(rid);
        var avatar = String(profile.avatar || '').trim() || 'assets/chushitouxiang.jpg';
        var name = String(profile.remark || profile.nickName || profile.name || rid || 'Ta').trim() || 'Ta';
        try {
            if (typeof window.showIosNotification === 'function') {
                window.showIosNotification(avatar, name, String(text || '').trim(), { durationMs: durationMs });
                return;
            }
        } catch (e) { }
        try {
            var ev = new CustomEvent('ios-notification', { detail: { avatar: avatar, name: name, message: String(text || '').trim(), durationMs: durationMs } });
            window.dispatchEvent(ev);
        } catch (e2) { }
    }

    function showBarrageForWechatOther(roleId, payload) {
        try {
            if (typeof window.showBarrage !== 'function') return;
            var rid = String(roleId || '').trim();
            var profile = readRoleProfile(rid);
            var roleName = String(profile.remark || profile.nickName || profile.name || rid || 'Ta').trim() || 'Ta';
            var peer = String(payload && payload.peerName ? payload.peerName : '').trim() || 'Ta';
            window.showBarrage([
                roleName + '发现你正在和「' + peer + '」聊天...',
                roleName + '正在暗中观察...',
                '情绪正在酝酿中...',
                '正在生成吃醋反应...'
            ]);
        } catch (e) { }
    }

    function hideBarrageNow() {
        try {
            if (typeof window.hideBarrage === 'function') window.hideBarrage();
        } catch (e) { }
    }

    function reportAiError(roleId, err) {
        try {
            var now = Date.now();
            if (now - lastAiErrorAt < 6000) return;
            lastAiErrorAt = now;
            var msg = err && err.message ? String(err.message) : String(err || '请求失败');
            msg = msg.replace(/\s+/g, ' ').trim();
            if (msg.length > 60) msg = msg.slice(0, 60);
            try {
                var k = buildCoupleSpaceRoleKey('couple_space_last_ai_error_v1', roleId);
                localStorage.setItem(k, msg);
            } catch (e1) { }
            try {
                if (typeof window.showIosNotification === 'function') {
                    window.showIosNotification('assets/chushitouxiang.jpg', 'AI 触发失败', msg, { durationMs: 4200 });
                }
            } catch (e2) { }
        } catch (e0) { }
    }

    function callRoleLLM(roleId, userPrompt, extraSystemPrompt, options) {
        if (typeof window.callAI !== 'function') return Promise.reject(new Error('AI 接口未初始化'));
        var rid = String(roleId || '').trim();
        var opts = options && typeof options === 'object' ? options : {};
        var historyForApi = [];
        if (opts.disableWechatHistory === true) {
            historyForApi = [];
        } else {
            var history = readWechatChatHistory(rid);
            var clean = cleanChatHistoryForMemory(history);
            historyForApi = buildHistoryForApi(rid, clean);
            if (Array.isArray(historyForApi) && historyForApi.length > 20) {
                historyForApi = historyForApi.slice(historyForApi.length - 20);
            }
        }
        var baseSystemPrompt = buildRoleSystemPrompt(rid);
        var merged = extraSystemPrompt ? (baseSystemPrompt + '\n\n' + String(extraSystemPrompt)) : baseSystemPrompt;
        if (typeof window.buildRoleLitePrompt === 'function') {
            merged = window.buildRoleLitePrompt('couple_space_activity_reaction', rid, {
                history: Array.isArray(historyForApi) ? historyForApi : [],
                includeContinuity: true,
                maxSummaryLines: 12,
                sceneIntro: '当前场景是情侣空间中的即时吃醋/关心反应。',
                taskGuidance: String(extraSystemPrompt || '').trim(),
                outputInstructions: String(opts.outputInstructions || '只输出一条简短日常的微信式消息，不要解释；若自动翻译层要求 translated_text，请完整输出该结构，不要拆开。')
            });
        }
        return new Promise(function (resolve, reject) {
            try {
                window.callAI(
                    merged,
                    Array.isArray(historyForApi) ? historyForApi : [],
                    String(userPrompt || ''),
                    function (t) {
                        if (typeof t === 'string') {
                            resolve(t);
                            return;
                        }
                        try {
                            resolve(JSON.stringify(t || ''));
                        } catch (eJson) {
                            resolve(String(t || ''));
                        }
                    },
                    function (err) { reject(new Error(String(err || '请求失败'))); }
                );
            } catch (e) {
                reject(e);
            }
        });
    }

    function buildReactionPromptContext(roleId, trigger, payload) {
        var rid = String(roleId || '').trim();
        var trig = String(trigger || '').trim();
        var p = payload && typeof payload === 'object' ? payload : {};
        var ops = Array.isArray(p.ops) ? p.ops : buildRecentActivityOps(10);
        var secretCurrentRoundUserLines = buildSecretCurrentRoundUserLines(rid, 4);
        var secretTimelineLines = buildRecentSecretTimelineLines(rid, 50);
        var jealousyMemoryLines = trig === 'wechat_other' ? buildJealousyMemoryLines(rid, 3) : [];
        return {
            ops: ops,
            secretCurrentRoundUserLines: secretCurrentRoundUserLines,
            secretTimelineLines: secretTimelineLines,
            jealousyMemoryLines: jealousyMemoryLines
        };
    }

    function triggerReaction(roleId, trigger, payload) {
        var rid = String(roleId || '').trim();
        if (!rid) return;
        if ((trigger === 'wallet' || trigger === 'music' || trigger === 'period') && !isSecretUsageTriggerEnabled(trigger)) {
            return;
        }
        if (trigger === 'wechat_other') {
            var xiuluoEnabled = false;
            try {
                var settingsRaw = localStorage.getItem('qlkj_settings_v1');
                if (settingsRaw) {
                    var settings = JSON.parse(settingsRaw);
                    xiuluoEnabled = settings.xiuluoEnabled === true;
                }
            } catch (e) {
                xiuluoEnabled = false;
            }
            if (!xiuluoEnabled) return;
            var peerForCooldown = String(payload && payload.peerName ? payload.peerName : '').trim() || '__unknown_peer__';
            if (shouldThrottleJealousy(rid, peerForCooldown)) return;
        }

        if (inFlightByRole[rid]) {
            var next = { trigger: trigger, payload: payload };
            var prevPending = pendingByRole[rid];
            if (!prevPending) {
                pendingByRole[rid] = next;
            } else {
                var prevTrig = String(prevPending.trigger || '');
                var prevIsHigh = prevTrig === 'wallet' || prevTrig === 'wechat_other' || prevTrig === 'period' || prevTrig === 'music';
                var nextIsHigh = trigger === 'wallet' || trigger === 'wechat_other' || trigger === 'period' || trigger === 'music';
                if (nextIsHigh || !prevIsHigh) pendingByRole[rid] = next;
            }
            return;
        }

        if (String(trigger || '') === 'wechat_other') {
            var peerForMark = String(payload && payload.peerName ? payload.peerName : '').trim() || '__unknown_peer__';
            markJealousyTriggered(rid, peerForMark);
        }
        inFlightByRole[rid] = true;
        var shouldBarrage = String(trigger || '') === 'wechat_other';
        if (shouldBarrage) showBarrageForWechatOther(rid, payload);
        var promptContext = buildReactionPromptContext(rid, trigger, payload);
        var extra = buildExtraSystemPrompt(rid, trigger, promptContext);
        var prompt = buildUserPrompt(trigger, payload, rid, promptContext);
        var hasCurrentSecretSpeech = Array.isArray(promptContext.secretCurrentRoundUserLines) && promptContext.secretCurrentRoundUserLines.length > 0;
        var outputInstructions =
            '严格输出 JSON 数组，长度 3~10。\n' +
            '数组元素只允许两种：{"type":"text","content":"..."} 或 {"type":"transfer_card","amount":数字,"color":"pink","content":"..."}。\n' +
            (hasCurrentSecretSpeech
                ? '先写对“秘密空间当前轮用户发言”的回应，再写对操作记录的回应；'
                : '当前轮没有新的秘密空间用户发言时，不要假装她刚刚在秘密空间说了话；先自然续接双方历史，再写对操作记录的回应；') +
            '必须符合当前角色人设；不要 Markdown，不要解释；不要把同一个 JSON 对象拆成多条。';
        callRoleLLM(rid, prompt, extra, {
            outputInstructions: outputInstructions,
            disableWechatHistory: true
        })
            .then(function (text) {
                var items = parseReactionMessages(text);
                if (!items.length) return;
                var baseTs = Date.now();
                appendSecretSpaceAiMessages(items, baseTs, rid);
                notifyCoupleSpaceSecretRefresh();
                if (shouldBarrage) hideBarrageNow();
                var previewText = getPreviewTextFromReactionItems(items) || '我来找你了。';
                showTopNotification(rid, previewText, 4200);
                if (String(trigger || '') === 'wechat_other') {
                    rememberJealousyReply(rid, payload && payload.peerName ? payload.peerName : '', items);
                }
            })
            .catch(function (err) {
                if (shouldBarrage) hideBarrageNow();
                reportAiError(rid, err);
            })
            .finally(function () {
                if (shouldBarrage) hideBarrageNow();
                inFlightByRole[rid] = false;
                var p = pendingByRole[rid];
                pendingByRole[rid] = null;
                if (p && p.trigger) triggerReaction(rid, p.trigger, p.payload);
            });
    }

    function handleActivityItem(item) {
        var link = getCoupleLinkState();
        if (!link || !link.hasCoupleLinked || !link.roleId) return;
        var boundRoleId = String(link.roleId || '').trim();
        if (!boundRoleId) return;

        var kind = String(item && item.kind ? item.kind : '').trim();
        var app = String(item && item.app ? item.app : '').trim();
        if (app === 'space' || kind === 'space_open') return;

        var st = readState(boundRoleId);
        if (!st || typeof st !== 'object') st = { normalCount: 0, buffer: [] };
        if (!Array.isArray(st.buffer)) st.buffer = [];
        var monitorSettings = getSecretUsageMonitorSettings();

        if (monitorSettings.enabled && monitorSettings.wallet && (kind === 'wallet_open' || String(item && item.text ? item.text : '').indexOf('钱包') >= 0)) {
            st.normalCount = 0;
            st.buffer = [];
            writeState(boundRoleId, st);
            triggerReaction(boundRoleId, 'wallet', { ops: buildRecentActivityOps(10) });
            return;
        }

        if (monitorSettings.enabled && monitorSettings.period && (kind === 'period_open' || String(item && item.text ? item.text : '').indexOf('经期') >= 0)) {
            st.normalCount = 0;
            st.buffer = [];
            writeState(boundRoleId, st);
            triggerReaction(boundRoleId, 'period', { ops: buildRecentActivityOps(10) });
            return;
        }

        if (monitorSettings.enabled && monitorSettings.music && (
            kind === 'music_open' ||
            String(item && item.text ? item.text : '').indexOf('打开了音乐') >= 0 ||
            String(item && item.text ? item.text : '').indexOf('音乐APP') >= 0 ||
            String(item && item.text ? item.text : '').indexOf('音乐App') >= 0
        )) {
            st.normalCount = 0;
            st.buffer = [];
            writeState(boundRoleId, st);
            triggerReaction(boundRoleId, 'music', { ops: buildRecentActivityOps(10) });
            return;
        }

        if (kind === 'wechat_chat') {
            var peer = pickPeerName(item);
            var peerKey = normalizeNameKey(peer);
            var roleKeys = getRoleNameKeys(boundRoleId);
            if (peerKey && !roleKeys[peerKey]) {
                st.normalCount = 0;
                st.buffer = [];
                writeState(boundRoleId, st);
                triggerReaction(boundRoleId, 'wechat_other', { peerName: peer, ops: buildRecentActivityOps(10) });
                return;
            }
        }

        var text = String(item && item.text ? item.text : '').trim();
        if (!text) return;
        st.normalCount = (Number(st.normalCount || 0) || 0) + 1;
        st.buffer.push({ ts: Number(item.ts || Date.now()) || Date.now(), text: text, kind: kind, app: app });
        if (st.buffer.length > 30) st.buffer = st.buffer.slice(-30);

        if (st.normalCount >= 10) {
            st.normalCount = 0;
            st.buffer = [];
            writeState(boundRoleId, st);
            return;
        }

        writeState(boundRoleId, st);
    }

    window.simulateCoupleSpaceCaughtChat = function (peerName) {
        var name = String(peerName || '').trim();
        if (!name) name = '陌生人';
        if (typeof window.recordActivity === 'function') window.recordActivity('进入了与 ' + name + ' 的聊天');
    };

    try {
        if (typeof window.recordActivity === 'function' && !window.__coupleSpaceRecordActivityHooked) {
            window.__coupleSpaceRecordActivityHooked = true;
            var prev = window.recordActivity;
            window.recordActivity = function (actionOrType, meta) {
                var it = prev(actionOrType, meta);
                try {
                    if (it && typeof it === 'object') handleActivityItem(it);
                } catch (e) { }
                return it;
            };
        }
    } catch (e) { }
})();

// --- 0. 系统初始化 (最先执行) ---
document.addEventListener('DOMContentLoaded', function() {

    // =============== 【无感返回：暴力修正版】 ===============
    if (localStorage.getItem('isReturnFromChat') === 'true') {
        localStorage.removeItem('isReturnFromChat');

        // 1. 隐藏锁屏
        const lockScreen = document.getElementById('lock-screen');
        if (lockScreen) lockScreen.style.display = 'none';

        // 2. 找到 App 窗口
        const appWindow = document.getElementById('app-window');
        
        if (appWindow) {
            // ★★★ 关键修改：直接把样式写死，不给浏览器任何动画的机会 ★★★
            appWindow.style.transition = 'none !important'; 
            appWindow.style.transform = 'scale(1)'; // 强制全屏大小
            appWindow.style.opacity = '1';          // 强制完全不透明
            appWindow.style.display = 'flex';       // 强制显示
            
            // 手动加上 active 类 (防止 openChatApp 里的逻辑还没跑完)
            appWindow.classList.add('active');

            // 3. 调用 apps.js 里的函数渲染内容
            if (typeof window.openChatApp === 'function') {
                window.openChatApp(); 
            }

            // 4. 延迟 300ms 再恢复。
            // 就像魔术师，先把东西变出来(无动画)，等观众看清了，再把布盖上(恢复动画属性)
            setTimeout(() => {
                appWindow.style.transition = ''; 
                appWindow.style.transform = ''; 
                appWindow.style.opacity = ''; 
                // display 不要清空，不然窗口会消失
            }, 300);
        }
    }  
    // 检查是否有保存的全屏状态
    const savedMode = localStorage.getItem('is_immersive_mode');
    if (savedMode === 'true') {
        document.body.classList.add('fullscreen-active');
    }

    // 检查状态栏显示设置
    const showStatusInfoSetting = localStorage.getItem('show_status_info');
    if (showStatusInfoSetting === 'false') {
        document.body.classList.add('hide-status-info');
    } else {
        document.body.classList.remove('hide-status-info');
    }

    try {
        if (typeof window.recordActivity === 'function') {
            window.recordActivity('打开了手机');
        }
    } catch (e) { }
});

(function () {
    if (window.__lastActiveTimeListenersBound) return;
    window.__lastActiveTimeListenersBound = true;

    function writeLastActiveTime(ts) {
        try {
            localStorage.setItem('lastActiveTime', String(Number.isFinite(ts) ? ts : Date.now()));
        } catch (e) { }
    }

    function markInactiveNow() {
        writeLastActiveTime(Date.now());
    }

    var hiddenExitRecorded = false;

    function recordExitOnce() {
        if (hiddenExitRecorded) return;
        hiddenExitRecorded = true;
        try {
            if (typeof window.recordActivity === 'function') {
                window.recordActivity('system', { event: 'exit' });
            }
        } catch (e) { }
    }

    try {
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') {
                recordExitOnce();
                markInactiveNow();
            } else if (document.visibilityState === 'visible') {
                hiddenExitRecorded = false;
            }
        });
    } catch (e) { }

    try { window.addEventListener('pagehide', function () { recordExitOnce(); markInactiveNow(); }); } catch (e) { }
    try { window.addEventListener('beforeunload', function () { recordExitOnce(); markInactiveNow(); }); } catch (e) { }
    try {
        window.addEventListener('blur', function () {
            if (document.visibilityState !== 'visible') {
                recordExitOnce();
                markInactiveNow();
            }
        });
    } catch (e) { }
})();

(function () {
    if (!window.AppStore) {
        var state = {
            isGeneratingSportsData: false,
            sportsDataError: null
        };
        var listeners = [];
        window.AppStore = {
            getState: function () { return state; },
            setState: function (patch) {
                if (!patch || typeof patch !== 'object') return state;
                state = Object.assign({}, state, patch);
                for (var i = 0; i < listeners.length; i++) {
                    try { listeners[i](state); } catch (e) { }
                }
                return state;
            },
            subscribe: function (fn) {
                if (typeof fn !== 'function') return function () { };
                listeners.push(fn);
                return function () {
                    var idx = listeners.indexOf(fn);
                    if (idx !== -1) listeners.splice(idx, 1);
                };
            }
        };
    }

    function ensureErrorModal() {
        var existing = document.getElementById('global-error-modal');
        if (existing) return existing;
        var html = ''
            + '<div id="global-error-modal" class="fixed inset-0 z-[10090] flex items-center justify-center bg-black/40 backdrop-blur-sm" style="display:none;" onclick="window.GlobalModal && window.GlobalModal.hideError && window.GlobalModal.hideError()">'
            + '  <div class="bg-white w-[86%] max-w-[340px] rounded-2xl shadow-2xl overflow-hidden" onclick="event.stopPropagation()">'
            + '    <div class="p-4 border-b border-gray-100 font-bold text-center">提示</div>'
            + '    <div class="p-4 text-sm text-gray-700 leading-relaxed" id="global-error-modal-text"></div>'
            + '    <div class="p-3 flex justify-center border-t border-gray-100">'
            + '      <button type="button" class="px-6 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium" onclick="window.GlobalModal && window.GlobalModal.hideError && window.GlobalModal.hideError()">知道了</button>'
            + '    </div>'
            + '  </div>'
            + '</div>';
        document.body.insertAdjacentHTML('beforeend', html);
        return document.getElementById('global-error-modal');
    }

    function showError(text) {
        var modal = ensureErrorModal();
        if (!modal) return;
        var el = document.getElementById('global-error-modal-text');
        if (el) el.textContent = String(text || '发生错误');
        modal.style.display = 'flex';
    }

    function hideError() {
        var modal = document.getElementById('global-error-modal');
        if (modal) modal.style.display = 'none';
    }

    if (!window.GlobalModal) {
        window.GlobalModal = { showError: showError, hideError: hideError };
    } else {
        if (typeof window.GlobalModal.showError !== 'function') window.GlobalModal.showError = showError;
        if (typeof window.GlobalModal.hideError !== 'function') window.GlobalModal.hideError = hideError;
    }
})();

(function () {
    const STORAGE_KEY = 'global_music_state_v1';
    const WIDGET_PREF_KEY = 'global_music_widget_pref_v1';

    function safeJsonParse(text, fallback) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return fallback;
        }
    }

    function pickTrack(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const title = typeof raw.title === 'string' ? raw.title : '';
        const artist = typeof raw.artist === 'string' ? raw.artist : '';
        const cover = typeof raw.cover === 'string' ? raw.cover : '';
        const key = typeof raw.key === 'string' ? raw.key : '';
        const id = typeof raw.id === 'string' ? raw.id : '';
        const sourceType = typeof raw.sourceType === 'string' ? raw.sourceType : '';
        const url = typeof raw.url === 'string' ? raw.url : '';
        return { title, artist, cover, key, id, sourceType, url };
    }

    function loadPersisted() {
        const raw = safeJsonParse(localStorage.getItem(STORAGE_KEY) || '{}', {});
        const track = pickTrack(raw.track);
        const currentTime = Number(raw.currentTime);
        const volume = Number(raw.volume);
        const muted = !!raw.muted;
        return {
            track,
            currentTime: Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0,
            volume: Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : 1,
            muted,
        };
    }

    function loadWidgetPref() {
        const raw = safeJsonParse(localStorage.getItem(WIDGET_PREF_KEY) || '{}', {});
        let mode = raw && raw.mode === 'float' ? 'float' : '';
        if (!mode) {
            const custom = safeJsonParse(localStorage.getItem('music_player_custom_v1') || '{}', {});
            mode = custom && custom.miniPlayerMode === 'float' ? 'float' : 'island';
        }
        const x = Number(raw && raw.x);
        const y = Number(raw && raw.y);
        return {
            mode: mode || 'island',
            x: Number.isFinite(x) ? x : null,
            y: Number.isFinite(y) ? y : null,
        };
    }

    function saveWidgetPref(mode, x, y) {
        try {
            localStorage.setItem(WIDGET_PREF_KEY, JSON.stringify({
                mode: mode === 'float' ? 'float' : 'island',
                x: Number.isFinite(Number(x)) ? Number(x) : null,
                y: Number.isFinite(Number(y)) ? Number(y) : null,
            }));
        } catch (e) {}
    }

    function ensureAudioEl() {
        let audio = document.getElementById('global-music-audio');
        if (audio && audio.tagName === 'AUDIO') return audio;
        audio = document.createElement('audio');
        audio.id = 'global-music-audio';
        audio.preload = 'none';
        audio.playsInline = true;
        audio.style.display = 'none';
        document.body.appendChild(audio);
        return audio;
    }

    function ensureIslandEl() {
        let el = document.getElementById('dynamic-island');
        if (el) return el;
        const screen = document.querySelector('.screen');
        if (!screen) return null;
        el = document.createElement('button');
        el.id = 'dynamic-island';
        el.type = 'button';
        el.className = 'dynamic-island';
        el.setAttribute('aria-label', '正在播放，点击回到音乐');
        el.innerHTML = `
            <span class="dynamic-island-cover">
                <img id="dynamic-island-cover-img" alt="" />
            </span>
            <span class="dynamic-island-waves" aria-hidden="true">
                <span class="di-bar"></span>
                <span class="di-bar"></span>
                <span class="di-bar"></span>
                <span class="di-bar"></span>
            </span>
        `;
        screen.appendChild(el);
        return el;
    }

    function ensureFloatBallEl() {
        let el = document.getElementById('global-music-float-ball');
        if (el) return el;
        const screen = document.querySelector('.screen');
        if (!screen) return null;
        el = document.createElement('button');
        el.id = 'global-music-float-ball';
        el.type = 'button';
        el.className = 'global-music-float-ball';
        el.setAttribute('aria-label', '正在播放，点击回到音乐');
        el.innerHTML = ''
            + '<svg class="global-music-float-progress" viewBox="0 0 64 64" aria-hidden="true">'
            + '  <circle class="global-music-float-ring" cx="32" cy="32" r="30"></circle>'
            + '</svg>'
            + '<span class="global-music-float-cover"><img id="global-music-float-cover-img" alt="" /></span>'
            + '<span class="global-music-float-bars" aria-hidden="true"><span class="gmf-bar"></span><span class="gmf-bar"></span><span class="gmf-bar"></span></span>';
        screen.appendChild(el);
        return el;
    }

    const persisted = loadPersisted();
    const widgetPref = loadWidgetPref();
    const audio = ensureAudioEl();
    audio.volume = persisted.volume;
    audio.muted = persisted.muted;
    if (persisted.track && persisted.track.url) audio.src = persisted.track.url;

    window.__globalAudioEl = audio;

    const state = {
        track: persisted.track,
        currentTime: persisted.currentTime,
        duration: 0,
        isPlaying: false,
        volume: audio.volume,
        muted: audio.muted,
        displayMode: widgetPref.mode,
        floatX: widgetPref.x,
        floatY: widgetPref.y,
    };

    let lastEmitAt = 0;
    let rafPending = false;
    let floatBallSuppressClick = false;
    let floatBallDragState = {
        active: false,
        moved: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0,
    };

    function getForegroundAppId() {
        const v = window.__foregroundAppId;
        return typeof v === 'string' ? v : '';
    }

    function isMusicForeground() {
        const fg = getForegroundAppId();
        if (fg === 'music') return true;
        const appWindow = document.getElementById('app-window');
        if (!appWindow || !appWindow.classList.contains('active')) return false;
        const iframe = document.querySelector('#app-content-area iframe');
        const src = iframe && iframe.getAttribute('src') ? String(iframe.getAttribute('src')) : '';
        return src.indexOf('apps/music.html') !== -1;
    }

    function shouldShowWidget() {
        if (!state.track || !state.track.url) return false;
        if (!state.isPlaying) return false;
        return !isMusicForeground();
    }

    function persist() {
        const payload = {
            track: state.track,
            currentTime: Number.isFinite(state.currentTime) ? state.currentTime : 0,
            volume: Number.isFinite(audio.volume) ? audio.volume : 1,
            muted: !!audio.muted,
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {}
    }

    function emitNow() {
        state.currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        state.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        state.volume = Number.isFinite(audio.volume) ? audio.volume : 1;
        state.muted = !!audio.muted;
        try {
            window.dispatchEvent(new CustomEvent('global-music-state', { detail: getState() }));
        } catch (e) {}
        updateWidgets();
        lastEmitAt = Date.now();
        rafPending = false;
    }

    function emitThrottled() {
        const now = Date.now();
        if (now - lastEmitAt > 120) {
            emitNow();
            return;
        }
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(emitNow);
    }

    function updateWidgets() {
        const show = shouldShowWidget();
        const mode = state.displayMode === 'float' ? 'float' : 'island';
        const cover = state.track && state.track.cover ? state.track.cover : 'assets/images/beijing.jpg';
        const island = ensureIslandEl();
        const floatBall = ensureFloatBallEl();
        const duration = Number.isFinite(state.duration) ? state.duration : 0;
        const currentTime = Number.isFinite(state.currentTime) ? state.currentTime : 0;
        const ratio = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

        if (island) {
            island.classList.toggle('is-visible', show && mode === 'island');
            island.classList.toggle('is-playing', !!state.isPlaying);
            const islandImg = document.getElementById('dynamic-island-cover-img');
            if (islandImg) islandImg.src = cover;
        }

        if (floatBall) {
            floatBall.classList.toggle('is-visible', show && mode === 'float');
            floatBall.classList.toggle('is-playing', !!state.isPlaying);
            const floatImg = document.getElementById('global-music-float-cover-img');
            if (floatImg) floatImg.src = cover;
            const ring = floatBall.querySelector('.global-music-float-ring');
            if (ring) {
                const circumference = 188.5;
                ring.style.strokeDasharray = String(circumference);
                ring.style.strokeDashoffset = String(circumference * (1 - ratio));
            }
            applyFloatBallPosition(floatBall);
        }
    }

    function setForegroundApp(appId) {
        window.__foregroundAppId = typeof appId === 'string' ? appId : '';
        updateWidgets();
    }

    function setDisplayMode(mode) {
        state.displayMode = mode === 'float' ? 'float' : 'island';
        saveWidgetPref(state.displayMode, state.floatX, state.floatY);
        updateWidgets();
    }

    function getFloatBallBounds() {
        const screen = document.querySelector('.screen');
        if (!screen) return null;
        const rect = screen.getBoundingClientRect();
        if (!rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return null;
        return rect;
    }

    function clampFloatBallPosition(x, y) {
        const rect = getFloatBallBounds();
        const size = 64;
        const margin = 8;
        if (!rect) {
            return {
                x: Math.max(margin, Number(x) || margin),
                y: Math.max(margin, Number(y) || margin),
            };
        }
        const maxX = Math.max(margin, rect.width - size - margin);
        const maxY = Math.max(margin, rect.height - size - margin);
        return {
            x: Math.min(Math.max(Number(x) || margin, margin), maxX),
            y: Math.min(Math.max(Number(y) || margin, margin), maxY),
        };
    }

    function applyFloatBallPosition(floatBall) {
        const el = floatBall || ensureFloatBallEl();
        if (!el) return;
        if (!Number.isFinite(Number(state.floatX)) || !Number.isFinite(Number(state.floatY))) {
            el.style.left = '';
            el.style.top = '';
            el.style.right = '';
            el.style.bottom = '';
            return;
        }
        const pos = clampFloatBallPosition(state.floatX, state.floatY);
        state.floatX = pos.x;
        state.floatY = pos.y;
        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
    }

    function persistFloatBallPosition(x, y) {
        const pos = clampFloatBallPosition(x, y);
        state.floatX = pos.x;
        state.floatY = pos.y;
        saveWidgetPref(state.displayMode, state.floatX, state.floatY);
        applyFloatBallPosition();
    }

    function bindFloatBallDrag(floatBall) {
        if (!floatBall || floatBall.dataset.dragBound === '1') return;
        floatBall.dataset.dragBound = '1';

        floatBall.addEventListener('pointerdown', function (event) {
            if (!event || event.button > 0) return;
            const screenRect = getFloatBallBounds();
            const rect = floatBall.getBoundingClientRect();
            floatBallDragState.active = true;
            floatBallDragState.moved = false;
            floatBallDragState.pointerId = event.pointerId;
            floatBallDragState.startX = event.clientX;
            floatBallDragState.startY = event.clientY;
            floatBallDragState.originX = rect.left - (screenRect ? screenRect.left : 0);
            floatBallDragState.originY = rect.top - (screenRect ? screenRect.top : 0);
            floatBall.classList.add('is-dragging');
            try {
                floatBall.setPointerCapture(event.pointerId);
            } catch (e) {}
        });

        floatBall.addEventListener('pointermove', function (event) {
            if (!floatBallDragState.active || event.pointerId !== floatBallDragState.pointerId) return;
            const dx = event.clientX - floatBallDragState.startX;
            const dy = event.clientY - floatBallDragState.startY;
            if (!floatBallDragState.moved && Math.abs(dx) + Math.abs(dy) > 6) {
                floatBallDragState.moved = true;
            }
            if (!floatBallDragState.moved) return;
            const pos = clampFloatBallPosition(floatBallDragState.originX + dx, floatBallDragState.originY + dy);
            floatBall.style.left = pos.x + 'px';
            floatBall.style.top = pos.y + 'px';
            floatBall.style.right = 'auto';
            floatBall.style.bottom = 'auto';
        });

        function finishDrag(event) {
            if (!floatBallDragState.active) return;
            if (event && floatBallDragState.pointerId !== null && event.pointerId !== floatBallDragState.pointerId) return;
            const moved = !!floatBallDragState.moved;
            if (moved) {
                const screenRect = getFloatBallBounds();
                const rect = floatBall.getBoundingClientRect();
                persistFloatBallPosition(rect.left - (screenRect ? screenRect.left : 0), rect.top - (screenRect ? screenRect.top : 0));
                floatBallSuppressClick = true;
                window.setTimeout(function () {
                    floatBallSuppressClick = false;
                }, 140);
            }
            try {
                if (floatBallDragState.pointerId !== null) {
                    floatBall.releasePointerCapture(floatBallDragState.pointerId);
                }
            } catch (e) {}
            floatBall.classList.remove('is-dragging');
            floatBallDragState.active = false;
            floatBallDragState.moved = false;
            floatBallDragState.pointerId = null;
        }

        floatBall.addEventListener('pointerup', finishDrag);
        floatBall.addEventListener('pointercancel', finishDrag);
    }

    function setTrack(nextTrack) {
        const t = pickTrack(nextTrack);
        state.track = t;
        if (t && t.url) {
            if (audio.src !== t.url) audio.src = t.url;
        }
        persist();
        emitNow();
    }

    function play() {
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
            p.catch(function () {});
        }
        return p;
    }

    function pause() {
        audio.pause();
    }

    function toggle() {
        if (audio.paused) play();
        else pause();
    }

    function seek(timeSeconds) {
        const t = Number(timeSeconds);
        if (!Number.isFinite(t)) return;
        try {
            audio.currentTime = Math.max(0, t);
        } catch (e) {}
        emitThrottled();
        persist();
    }

    function getState() {
        return {
            track: state.track,
            isPlaying: !!state.isPlaying,
            currentTime: Number.isFinite(state.currentTime) ? state.currentTime : 0,
            duration: Number.isFinite(state.duration) ? state.duration : 0,
            volume: Number.isFinite(state.volume) ? state.volume : 1,
            muted: !!state.muted,
        };
    }

    function openNowPlaying() {
        window.__musicOpenPlayerOnLoad = true;
        let togetherSession = null;
        try {
            const raw = localStorage.getItem('listen_together_session') || '';
            togetherSession = raw ? JSON.parse(raw) : null;
        } catch (e) {
            togetherSession = null;
        }
        try {
            window.__musicPendingOpenPayload = { togetherSession, at: Date.now() };
        } catch (e) {}
        const desktopView = document.getElementById('desktop-view');
        const chatView = document.getElementById('chat-view');
        const isChatVisible = !!(chatView && chatView.style && chatView.style.display !== 'none');
        if (isChatVisible) {
            window.__resumeChatViewAfterClose = true;
            chatView.style.display = 'none';
            if (desktopView && desktopView.style) desktopView.style.display = 'block';
        }
        if (typeof window.openApp === 'function') {
            window.openApp('music');
            setForegroundApp('music');
        }
        window.setTimeout(function () {
            const iframe = document.querySelector('#app-content-area iframe');
            if (!iframe) return;
            try {
                iframe.contentWindow.postMessage({ type: 'MUSIC_OPEN_PLAYER', payload: { togetherSession } }, '*');
            } catch (e) {}
        }, 180);
    }

    audio.addEventListener('play', function () {
        state.isPlaying = true;
        persist();
        emitNow();
    });

    audio.addEventListener('pause', function () {
        state.isPlaying = false;
        persist();
        emitNow();
    });

    audio.addEventListener('timeupdate', emitThrottled);
    audio.addEventListener('loadedmetadata', emitNow);
    audio.addEventListener('volumechange', function () {
        persist();
        emitNow();
    });

    if (persisted.currentTime > 0) {
        try {
            audio.currentTime = persisted.currentTime;
        } catch (e) {}
    }

    const island = ensureIslandEl();
    if (island) {
        island.addEventListener('click', function () {
            openNowPlaying();
        });
    }
    const floatBall = ensureFloatBallEl();
    if (floatBall) {
        bindFloatBallDrag(floatBall);
        applyFloatBallPosition(floatBall);
        floatBall.addEventListener('click', function () {
            if (floatBallSuppressClick) return;
            openNowPlaying();
        });
    }

    window.GlobalMusicPlayer = {
        audio,
        setTrack,
        play,
        pause,
        toggle,
        seek,
        getState,
        setForegroundApp,
        setDisplayMode,
        openNowPlaying,
    };

    window.addEventListener('message', function (event) {
        const data = event && event.data ? event.data : null;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'MUSIC_WIDGET_MODE') {
            setDisplayMode(data.mode);
        }
    });

    window.addEventListener('resize', function () {
        applyFloatBallPosition();
    });

    emitNow();
})();

(function () {
    let bannerEl = null;
    let hideTimerId = null;

    function ensureBanner() {
        if (bannerEl) return bannerEl;
        const screen = document.querySelector('.screen');
        if (!screen) return null;
        const el = document.createElement('div');
        el.id = 'ios-notification-banner';
        el.className = 'ios-notification-banner';
        el.innerHTML = ''
            + '<div class="ios-notification-avatar">'
            + '  <img id="ios-notification-avatar-img" alt="" />'
            + '</div>'
            + '<div class="ios-notification-text">'
            + '  <div class="ios-notification-name" id="ios-notification-name"></div>'
            + '  <div class="ios-notification-message" id="ios-notification-message"></div>'
            + '</div>';
        el.addEventListener('click', function () {
            hideNow();
        });
        screen.appendChild(el);
        bannerEl = el;
        return bannerEl;
    }

    function hideNow() {
        if (!bannerEl) return;
        bannerEl.classList.remove('is-visible');
    }

    function showInternal(avatar, name, message, durationMs) {
        const el = ensureBanner();
        if (!el) return;
        const avatarImg = document.getElementById('ios-notification-avatar-img');
        const nameEl = document.getElementById('ios-notification-name');
        const msgEl = document.getElementById('ios-notification-message');
        if (avatarImg) {
            avatarImg.src = avatar || 'assets/chushitouxiang.jpg';
        }
        if (nameEl) {
            nameEl.textContent = name || '新消息';
        }
        if (msgEl) {
            msgEl.textContent = message || '';
        }
        if (hideTimerId) {
            clearTimeout(hideTimerId);
            hideTimerId = null;
        }
        void el.offsetHeight;
        el.classList.add('is-visible');
        const duration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 3600;
        hideTimerId = window.setTimeout(function () {
            hideNow();
        }, duration);
    }

    function showIosNotification(avatar, name, message, options) {
        const opts = options && typeof options === 'object' ? options : null;
        const durationMs = opts && Number.isFinite(opts.durationMs) ? opts.durationMs : null;
        showInternal(avatar, name, message, durationMs);
    }

    window.showIosNotification = showIosNotification;

    window.addEventListener('ios-notification', function (event) {
        const detail = event && event.detail ? event.detail : {};
        showInternal(detail.avatar, detail.name, detail.message, detail.durationMs);
    });
})();

(function () {
    const STORAGE_KEY = 'exp_browser_notification_enabled_v1';

    function isSupported() {
        try {
            return typeof Notification !== 'undefined';
        } catch (e) {
            return false;
        }
    }

    function getPermission() {
        if (!isSupported()) return 'unsupported';
        try {
            return String(Notification.permission || 'default');
        } catch (e) {
            return 'default';
        }
    }

    function isEnabled() {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch (e) {
            return false;
        }
    }

    function persistEnabled(enabled) {
        try {
            localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
        } catch (e) { }
    }

    async function requestPermissionAndEnable() {
        if (!isSupported()) {
            return { ok: false, reason: 'unsupported' };
        }
        let permission = getPermission();
        if (permission !== 'granted') {
            try {
                permission = await Notification.requestPermission();
            } catch (e) {
                return { ok: false, reason: String(e && e.message ? e.message : e || 'request failed') };
            }
        }
        if (permission === 'granted') {
            persistEnabled(true);
            return { ok: true, permission: permission };
        }
        persistEnabled(false);
        return { ok: false, permission: permission };
    }

    function disable() {
        persistEnabled(false);
        return { ok: true };
    }

    function canNotify() {
        return isSupported() && isEnabled() && getPermission() === 'granted';
    }

    async function show(title, body, options) {
        if (!canNotify()) return null;
        const opts = options && typeof options === 'object' ? options : {};
        const notifTitle = String(title || '新消息');
        const notifBody = String(body || '').trim();
        const notifIcon = String(opts.icon || 'assets/chushitouxiang.jpg').trim() || 'assets/chushitouxiang.jpg';
        const notifBadge = String(opts.badge || opts.icon || 'assets/chushitouxiang.jpg').trim() || 'assets/chushitouxiang.jpg';
        const notifTag = String(opts.tag || '').trim() || undefined;
        const notifData = {
            roleId: String(opts.roleId || '').trim(),
            url: String(opts.url || location.href || './').trim() || './'
        };
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                if (registration && typeof registration.showNotification === 'function') {
                    await registration.showNotification(notifTitle, {
                        body: notifBody,
                        icon: notifIcon,
                        badge: notifBadge,
                        tag: notifTag,
                        renotify: opts.renotify === true,
                        requireInteraction: opts.requireInteraction === true,
                        silent: opts.silent === true,
                        data: notifData
                    });
                    return { ok: true, channel: 'serviceWorker' };
                }
            }
        } catch (e0) { }
        try {
            const notification = new Notification(notifTitle, {
                body: notifBody,
                icon: notifIcon,
                badge: notifBadge,
                tag: notifTag,
                renotify: opts.renotify === true,
                requireInteraction: opts.requireInteraction === true,
                silent: opts.silent === true
            });
            notification.onclick = function () {
                try { window.focus(); } catch (e0) { }
                try {
                    const roleId = notifData.roleId;
                    if (roleId) {
                        if (typeof window.openChatApp === 'function') {
                            window.openChatApp(roleId);
                        } else if (typeof window.enterChat === 'function') {
                            window.enterChat(roleId);
                        }
                    }
                } catch (e1) { }
                try { notification.close(); } catch (e2) { }
            };
            if (Number.isFinite(opts.durationMs) && opts.durationMs > 0) {
                window.setTimeout(function () {
                    try { notification.close(); } catch (e3) { }
                }, opts.durationMs);
            }
            return notification;
        } catch (e) {
            return null;
        }
    }

    function getState() {
        return {
            supported: isSupported(),
            enabled: isEnabled(),
            permission: getPermission()
        };
    }

    window.BrowserNotificationBridge = {
        getState: getState,
        isEnabled: isEnabled,
        canNotify: canNotify,
        requestPermissionAndEnable: requestPermissionAndEnable,
        disable: disable,
        show: show
    };
})();

(function () {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', function (event) {
        const data = event && event.data && typeof event.data === 'object' ? event.data : null;
        if (!data || data.type !== 'OPEN_CHAT_FROM_NOTIFICATION') return;
        const roleId = String(data.roleId || '').trim();
        try { window.focus(); } catch (e0) { }
        if (!roleId) return;
        try {
            if (typeof window.openChatApp === 'function') {
                window.openChatApp(roleId);
                return;
            }
            if (typeof window.enterChat === 'function') {
                window.enterChat(roleId);
            }
        } catch (e1) { }
    });
})();

(function () {
    const STORAGE_KEY = 'exp_silent_keepalive_enabled_v1';
    const AUDIO_ID = 'silent-keepalive-audio';
    const DURATION_SECONDS = 2;
    let cachedDataUri = '';

    function writeAscii(view, offset, text) {
        for (let i = 0; i < text.length; i++) {
            view.setUint8(offset + i, text.charCodeAt(i) & 0xff);
        }
    }

    function bytesToBase64(bytes) {
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
        }
        return btoa(binary);
    }

    function buildSilentWavDataUri(durationSeconds) {
        const duration = Math.max(1, Math.round(Number(durationSeconds) || 1));
        const sampleRate = 8000;
        const channels = 1;
        const bitsPerSample = 16;
        const bytesPerSample = bitsPerSample / 8;
        const sampleCount = sampleRate * duration;
        const dataSize = sampleCount * channels * bytesPerSample;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        writeAscii(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeAscii(view, 8, 'WAVE');
        writeAscii(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, channels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * channels * bytesPerSample, true);
        view.setUint16(32, channels * bytesPerSample, true);
        view.setUint16(34, bitsPerSample, true);
        writeAscii(view, 36, 'data');
        view.setUint32(40, dataSize, true);
        return 'data:audio/wav;base64,' + bytesToBase64(bytes);
    }

    function getSilentDataUri() {
        if (!cachedDataUri) cachedDataUri = buildSilentWavDataUri(DURATION_SECONDS);
        return cachedDataUri;
    }

    function ensureAudioEl() {
        let audio = document.getElementById(AUDIO_ID);
        if (audio && audio.tagName === 'AUDIO') return audio;
        audio = document.createElement('audio');
        audio.id = AUDIO_ID;
        audio.loop = true;
        audio.preload = 'auto';
        audio.playsInline = true;
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        audio.style.display = 'none';
        audio.src = getSilentDataUri();
        audio.volume = 0.0001;
        audio.muted = false;
        document.body.appendChild(audio);
        return audio;
    }

    function persistEnabled(enabled) {
        try {
            localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
        } catch (e) { }
    }

    function isEnabled() {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch (e) {
            return false;
        }
    }

    async function start(options) {
        const opts = options && typeof options === 'object' ? options : {};
        persistEnabled(true);
        const audio = ensureAudioEl();
        audio.loop = true;
        audio.volume = 0.0001;
        audio.muted = false;
        if (!audio.src) audio.src = getSilentDataUri();
        try {
            const p = audio.play();
            if (p && typeof p.then === 'function') await p;
            if (opts.showTip && typeof window.showIosNotification === 'function') {
                window.showIosNotification('assets/chushitouxiang.jpg', '实验性静音保活', '已尝试开启静音音频循环。', { durationMs: 2800 });
            }
            return { ok: true, playing: !audio.paused };
        } catch (e) {
            if (opts.showTip && typeof window.showIosNotification === 'function') {
                window.showIosNotification('assets/chushitouxiang.jpg', '实验性静音保活', '播放被浏览器拦截，请再点一次或先与页面交互。', { durationMs: 3600 });
            }
            return { ok: false, error: String(e && e.message ? e.message : e || 'play failed') };
        }
    }

    function stop(options) {
        const opts = options && typeof options === 'object' ? options : {};
        persistEnabled(false);
        const audio = ensureAudioEl();
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (e) { }
        if (opts.showTip && typeof window.showIosNotification === 'function') {
            window.showIosNotification('assets/chushitouxiang.jpg', '实验性静音保活', '已关闭静音音频循环。', { durationMs: 2400 });
        }
        return { ok: true, playing: !audio.paused };
    }

    async function toggle(options) {
        if (isEnabled()) return stop(options);
        return start(options);
    }

    function getState() {
        const audio = ensureAudioEl();
        return {
            enabled: isEnabled(),
            playing: !!audio && !audio.paused,
            currentTime: audio && Number.isFinite(audio.currentTime) ? audio.currentTime : 0
        };
    }

    document.addEventListener('visibilitychange', function () {
        if (!isEnabled()) return;
        if (document.hidden) start({ showTip: false });
    });

    window.addEventListener('pageshow', function () {
        if (!isEnabled()) return;
        start({ showTip: false });
    });

    window.SilentKeepAliveHack = {
        start: start,
        stop: stop,
        toggle: toggle,
        getState: getState,
        isEnabled: isEnabled
    };
})();

(function () {
    let layerEl = null;
    let itemEls = [];

    function ensureLayer() {
        if (layerEl) return layerEl;
        const el = document.createElement('div');
        el.id = 'ai-barrage-layer';
        el.className = 'ai-barrage-layer';
        document.body.appendChild(el);
        layerEl = el;
        return layerEl;
    }

    function clearItems() {
        if (!itemEls.length) return;
        for (let i = 0; i < itemEls.length; i++) {
            const el = itemEls[i];
            try {
                if (el && el.parentNode) el.parentNode.removeChild(el);
            } catch (e) { }
        }
        itemEls = [];
    }

    function showBarrage(textArray) {
        const list = Array.isArray(textArray) ? textArray : [textArray];
        const texts = list
            .map(function (t) { return String(t || '').trim(); })
            .filter(Boolean)
            .slice(0, 12);
        if (!texts.length) return;

        const layer = ensureLayer();
        if (!layer) return;

        clearItems();

        const lanes = Math.max(4, Math.min(10, texts.length + 3));
        for (let i = 0; i < texts.length; i++) {
            const t = texts[i];
            const item = document.createElement('div');
            item.className = 'ai-barrage-item';
            item.textContent = t;

            const dur = 10 + Math.random() * 6;
            const delay = i * 1.8;
            const lane = i % lanes;
            const top = lane * 34 + Math.floor(Math.random() * 10);

            item.style.setProperty('--dur', dur.toFixed(2) + 's');
            item.style.setProperty('--delay', delay.toFixed(2) + 's');
            item.style.setProperty('--top', top + 'px');

            layer.appendChild(item);
            itemEls.push(item);
        }

        layer.classList.add('is-visible');
    }

    function hideBarrage() {
        const layer = ensureLayer();
        if (!layer) return;
        layer.classList.remove('is-visible');
        clearItems();
    }

    window.showBarrage = showBarrage;
    window.hideBarrage = hideBarrage;

    window.addEventListener('ai-barrage:show', function (event) {
        const detail = event && event.detail ? event.detail : {};
        showBarrage(detail.textArray || detail.texts || []);
    });
    window.addEventListener('ai-barrage:hide', function () {
        hideBarrage();
    });
})();

// --- 全局变量 ---
window.currentEditingAppIndex = -1;

/* --- 1. 时间与日期逻辑 --- */
function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    // 状态栏
    const statusTimeEl = document.getElementById('status-time-text');
    if (statusTimeEl) statusTimeEl.innerText = `${hours}:${minutes}`;

    // 大时间
    const timeEl = document.getElementById('time-text');
    if (timeEl) timeEl.innerText = `${hours}:${minutes}`;

    // 日期
    const dateEl = document.getElementById('date-text');
    if (dateEl) {
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        dateEl.innerText = `${now.getFullYear()}年${month}月${date}日 ${weekDays[now.getDay()]}`;
    }
}
updateTime();
setInterval(updateTime, 1000);

(function initCharacterReplyToast() {
    function renderCharacterReplyToast() {
        const el = document.getElementById('character-reply-toast');
        const textEl = document.getElementById('character-reply-toast-text');
        if (!el || !textEl) return;
        const state = window.CharacterReplyState || { isReplying: false, message: '' };
        window.isCharacterReplying = !!state.isReplying;
        if (state.isReplying) {
            el.style.display = 'flex';
            textEl.textContent = state.message || '';
        } else {
            el.style.display = 'none';
            textEl.textContent = '';
        }
    }

    window.CharacterReplyState = window.CharacterReplyState || { isReplying: false, message: '' };
    window.setCharacterReplying = function (isReplying, message) {
        window.CharacterReplyState.isReplying = !!isReplying;
        window.CharacterReplyState.message = message || '';
        window.isCharacterReplying = !!window.CharacterReplyState.isReplying;
        renderCharacterReplyToast();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            renderCharacterReplyToast();
        });
    } else {
        renderCharacterReplyToast();
    }
})();

(function () {
    function isSameLocalDay(a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    function clearExpiredUserStepsSystemContexts() {
        const now = new Date();
        const pendingBase = 'wechat_pending_system_context_v1';
        const inflightBase = 'wechat_inflight_system_context_v1';
        try {
            const len = localStorage.length || 0;
            const keys = [];
            for (let i = 0; i < len; i++) {
                const k = localStorage.key(i);
                if (k) keys.push(k);
            }
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                if (!(k === pendingBase || k.startsWith(pendingBase + '_') || k === inflightBase || k.startsWith(inflightBase + '_'))) continue;
                let raw = '';
                try { raw = localStorage.getItem(k) || ''; } catch (e1) { raw = ''; }
                if (!raw) continue;
                let obj = null;
                try { obj = JSON.parse(raw); } catch (e2) { obj = null; }
                if (!obj || typeof obj !== 'object') continue;
                if (String(obj.type || '') !== 'user_steps') continue;
                const createdAt = Number(obj.createdAt);
                if (!Number.isFinite(createdAt)) {
                    try { localStorage.removeItem(k); } catch (e3) { }
                    continue;
                }
                const d = new Date(createdAt);
                if (!isSameLocalDay(d, now)) {
                    try { localStorage.removeItem(k); } catch (e4) { }
                }
            }
        } catch (e) { }
    }

    function scheduleMidnightCleanup() {
        const now = new Date();
        const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
        const ms = Math.max(500, next.getTime() - now.getTime());
        setTimeout(function () {
            clearExpiredUserStepsSystemContexts();
            scheduleMidnightCleanup();
        }, ms);
    }

    clearExpiredUserStepsSystemContexts();
    scheduleMidnightCleanup();
})();

/* --- 2. 电池电量逻辑 --- */
(function initBatteryIndicator() {
    var lowBatteryRecorded = false;

    function maybeRecordLowBattery(level) {
        if (lowBatteryRecorded) return;
        if (!Number.isFinite(level)) return;
        if (level >= 30) return;
        lowBatteryRecorded = true;
        try {
            if (typeof window.recordActivity === 'function') {
                window.recordActivity('battery', { event: 'low', level: Math.floor(level) });
            }
        } catch (e) { }
    }

    function setBatteryText(value) {
        const batteryEl = document.getElementById('battery-num');
        const text = (value === null || value === undefined) ? '--' : String(Math.round(value));
        if (batteryEl) batteryEl.innerText = text;
        window.currentBatteryLevel = (value === null || value === undefined) ? null : Number(value);
        try {
            window.dispatchEvent(new CustomEvent('phone-battery-level-changed', {
                detail: { level: window.currentBatteryLevel }
            }));
        } catch (e) { }
        maybeRecordLowBattery(window.currentBatteryLevel);
    }

    if (navigator.getBattery && typeof navigator.getBattery === 'function') {
        navigator.getBattery().then(function (battery) {
            function updateBattery() {
                const level = battery && typeof battery.level === 'number' ? battery.level * 100 : null;
                setBatteryText(level);
            }
            updateBattery();
            battery.addEventListener('levelchange', updateBattery);
        }).catch(function () {
            setBatteryText(null);
        });
    } else if (navigator.battery || navigator.mozBattery || navigator.msBattery) {
        const legacyBattery = navigator.battery || navigator.mozBattery || navigator.msBattery;
        function updateLegacyBattery() {
            const level = legacyBattery && typeof legacyBattery.level === 'number' ? legacyBattery.level * 100 : null;
            setBatteryText(level);
        }
        updateLegacyBattery();
        if (legacyBattery && typeof legacyBattery.addEventListener === 'function') {
            legacyBattery.addEventListener('levelchange', updateLegacyBattery);
        }
    } else {
        setBatteryText(null);
    }
})();

/* --- 3. API 设置弹窗逻辑 --- */
window.saveApi = function() {
    const key = document.getElementById('api-key-input').value;
    if(key) {
        localStorage.setItem('user_api_key', key);
        document.getElementById('api-modal').classList.remove('show');
        if (window.uiToast) window.uiToast("API Key 已保存！");
    }
}
window.showApiSettings = function() { 
    const modal = document.getElementById('api-modal');
    if(modal) modal.classList.add('show');
}
const apiModal = document.getElementById('api-modal');
if (apiModal) {
    apiModal.addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('show');
    });
}

function readOptimizedDesktopImage(file, options) {
    if (typeof window.readWallpaperFileAsDataUrl === 'function') {
        return window.readWallpaperFileAsDataUrl(file, options);
    }
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onerror = function () {
            reject(reader.error || new Error('读取图片失败'));
        };
        reader.onload = function (evt) {
            resolve(String(evt && evt.target && evt.target.result || ''));
        };
        reader.readAsDataURL(file);
    });
}

function getUploadImageOptimizeOptions(targetId, isAppIcon) {
    const id = String(targetId || '').toLowerCase();
    if (isAppIcon) {
        return { maxSize: 420, quality: 0.9, forceReencode: true };
    }
    if (/avatar|badge/.test(id)) {
        return { maxSize: 420, quality: 0.86, mime: 'image/jpeg', forceReencode: true };
    }
    if (/large-bg|wallpaper/.test(id)) {
        return { maxSize: 1500, quality: 0.84, mime: 'image/jpeg', forceReencode: true };
    }
    if (/top-right-banner|main-widget|aesthetic-bg|aesthetic-photo|sticker/.test(id)) {
        return { maxSize: 900, quality: 0.82, mime: 'image/jpeg', forceReencode: true };
    }
    return { maxSize: 820, quality: 0.82, mime: 'image/jpeg', forceReencode: true };
}

/* --- 4. 全局文件上传监听 --- */
document.addEventListener('DOMContentLoaded', function() {
    
    // (A) 壁纸
    const wallpaperInput = document.getElementById('wallpaper-uploader');
    if (wallpaperInput) {
        wallpaperInput.addEventListener('change', async function(e) {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                try {
                    const screen = document.querySelector('.screen');
                    const wallpaperData = await readOptimizedDesktopImage(file, {
                        maxSize: 1500,
                        quality: 0.84,
                        mime: 'image/jpeg',
                        forceReencode: true
                    });
                    if(screen) {
                        screen.style.backgroundImage = `url('${wallpaperData}')`;
                        screen.style.backgroundSize = 'cover';
                        screen.style.backgroundPosition = 'center';
                        
                        // 【修复】保存壁纸到数据库，防止刷新后丢失
                        if(window.localforage) {
                            localforage.setItem('desktopWallpaper', wallpaperData).then(() => {
                                console.log("壁纸已保存到数据库！");
                                if (window.uiToast) window.uiToast("壁纸更换成功并已保存！");
                            }).catch(err => {
                                console.error("保存壁纸失败：", err);
                                if (window.uiToast) window.uiToast("壁纸更换成功！");
                            });
                        } else {
                            if (window.uiToast) window.uiToast("壁纸更换成功！");
                        }
                        if (typeof window.updateThemeFromWallpaper === 'function') {
                            window.updateThemeFromWallpaper(wallpaperData);
                        }
                    }
                } catch (err) {
                    console.error('壁纸处理失败：', err);
                    if (window.uiToast) window.uiToast('壁纸处理失败，请换一张图片试试');
                }
            }
        });
    }

    // (B) App图标 / 组件图片
    const appIconInput = document.getElementById('global-uploader');
    if (appIconInput) {
        appIconInput.addEventListener('change', async function(e) {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                try {
                    const uploadTargetId = (typeof window.currentUploadTargetId === 'string') ? window.currentUploadTargetId : '';
                    const isAppIconUpload = !uploadTargetId && !window.activeImgId && typeof window.currentEditingAppIndex === 'number' && window.currentEditingAppIndex !== -1;
                    const resultSrc = await readOptimizedDesktopImage(file, getUploadImageOptimizeOptions(uploadTargetId || window.activeImgId || '', isAppIconUpload));

                    if (uploadTargetId) {
                        const imgEl = document.getElementById(uploadTargetId);
                        if (imgEl) {
                            imgEl.decoding = 'async';
                            imgEl.loading = 'lazy';
                            imgEl.src = resultSrc;
                            imgEl.style.opacity = '1';
                            if (imgEl.style.display === 'none') {
                                imgEl.style.display = 'block';
                            }
                            if (imgEl.previousElementSibling && imgEl.previousElementSibling.classList && imgEl.previousElementSibling.classList.contains('main-widget-placeholder')) {
                                imgEl.previousElementSibling.style.display = 'none';
                            }
                            if (imgEl.nextElementSibling && imgEl.nextElementSibling.classList && imgEl.nextElementSibling.classList.contains('upload-hint-text')) {
                                imgEl.nextElementSibling.style.display = 'none';
                            }
                        }

                        try {
                            if (window.localforage) {
                                if (window.DB && typeof DB.configLargeStore === 'function') {
                                    DB.configLargeStore();
                                }
                                localforage.setItem('widget_img_' + uploadTargetId, resultSrc);
                            } else {
                                localStorage.setItem('widget_save_' + uploadTargetId, resultSrc);
                            }
                        } catch (err) {
                            console.error("保存小组件图片失败", err);
                            if (window.uiToast) window.uiToast("图片太大，可能无法保存，建议截个图再传~");
                        }

                        window.currentUploadTargetId = '';
                        window.currentEditingAppIndex = -1;
                        window.activeImgId = null;
                        window.activeHintId = null;
                        appIconInput.value = '';
                        return;
                    }

                    // === 改动点：先判断是不是组件 (Widget) ===
                    if (window.activeImgId) {
                        // 1. 找元素
                        const img = document.getElementById(window.activeImgId);
                        const hint = window.activeHintId ? document.getElementById(window.activeHintId) : null;
                        
                        // 2. 更新视图
                        if (img) {
                            img.decoding = 'async';
                            img.loading = 'lazy';
                            img.src = resultSrc;
                            img.style.display = 'block';
                            
                            // 【新增】保存到数据库 (之前这里缺了这一句，导致刷新就没)
                            if(window.localforage) {
                                localforage.setItem('widget_img_' + window.activeImgId, resultSrc);
                            }
                        }
                        if (hint) { hint.style.display = 'none'; }
                        
                        // 3. 清空状态
                        window.activeImgId = null;
                        window.activeHintId = null;
                        appIconInput.value = '';
                    } 
                    
                    // === 之后再判断是不是 App ===
                    else if (typeof window.currentEditingAppIndex === 'number' && window.currentEditingAppIndex !== -1) {
                        if (typeof window.updateAppIcon === 'function') {
                            window.updateAppIcon(window.currentEditingAppIndex, resultSrc);
                            if (window.uiToast) window.uiToast("App图标修改成功！");
                        }
                        window.currentEditingAppIndex = -1;
                        appIconInput.value = '';
                    }
                } catch (err) {
                    console.error('图片处理失败：', err);
                    if (window.uiToast) window.uiToast('图片处理失败，请换一张图片试试');
                    appIconInput.value = '';
                }
            }
        });
    }
});

(function () {
    if (window.uiToast && window.uiAlert && window.uiConfirm && window.uiPrompt) return;

    var toastTimer = 0;
    function ensureToastEl() {
        var el = document.getElementById('ui-toast');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'ui-toast';
        el.className = 'ui-toast';
        document.body.appendChild(el);
        return el;
    }

    function uiToast(message, opts) {
        var text = String(message == null ? '' : message);
        if (!text) return;
        var el = ensureToastEl();
        el.textContent = text;
        el.classList.add('is-visible');
        try { window.clearTimeout(toastTimer); } catch (e) {}
        var duration = opts && typeof opts === 'object' && Number(opts.duration) > 0 ? Number(opts.duration) : 1600;
        toastTimer = window.setTimeout(function () {
            el.classList.remove('is-visible');
        }, duration);
    }

    var dialogState = { resolve: null, type: '', inputEl: null };
    function ensureDialogEls() {
        var mask = document.getElementById('ui-dialog-mask');
        if (mask) return mask;
        mask = document.createElement('div');
        mask.id = 'ui-dialog-mask';
        mask.className = 'ui-dialog-mask';

        var dialog = document.createElement('div');
        dialog.className = 'ui-dialog';

        var body = document.createElement('div');
        body.className = 'ui-dialog-body';

        var title = document.createElement('div');
        title.className = 'ui-dialog-title';
        title.id = 'ui-dialog-title';

        var msg = document.createElement('div');
        msg.className = 'ui-dialog-message';
        msg.id = 'ui-dialog-message';

        var input = document.createElement('input');
        input.className = 'ui-dialog-input';
        input.id = 'ui-dialog-input';
        input.type = 'text';

        var actions = document.createElement('div');
        actions.className = 'ui-dialog-actions';

        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'ui-dialog-btn';
        cancelBtn.id = 'ui-dialog-cancel';
        cancelBtn.type = 'button';

        var okBtn = document.createElement('button');
        okBtn.className = 'ui-dialog-btn primary';
        okBtn.id = 'ui-dialog-ok';
        okBtn.type = 'button';

        actions.appendChild(cancelBtn);
        actions.appendChild(okBtn);

        body.appendChild(title);
        body.appendChild(msg);
        body.appendChild(input);
        dialog.appendChild(body);
        dialog.appendChild(actions);
        mask.appendChild(dialog);
        document.body.appendChild(mask);

        dialogState.inputEl = input;

        function closeWith(result) {
            if (!dialogState.resolve) return;
            var resolve = dialogState.resolve;
            dialogState.resolve = null;
            mask.classList.remove('is-visible');
            input.value = '';
            resolve(result);
        }

        cancelBtn.addEventListener('click', function () {
            if (dialogState.type === 'confirm') closeWith(false);
            else if (dialogState.type === 'prompt') closeWith(null);
            else closeWith(undefined);
        });

        okBtn.addEventListener('click', function () {
            if (dialogState.type === 'confirm') closeWith(true);
            else if (dialogState.type === 'prompt') closeWith(String(input.value || ''));
            else closeWith(undefined);
        });

        input.addEventListener('keydown', function (e) {
            if (!e) return;
            if (e.key === 'Enter') {
                e.preventDefault();
                okBtn.click();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelBtn.click();
            }
        });

        mask.addEventListener('click', function (e) {
            if (e && e.target !== mask) return;
            cancelBtn.click();
        });

        return mask;
    }

    function openDialog(type, message, opts) {
        var mask = ensureDialogEls();
        var titleEl = document.getElementById('ui-dialog-title');
        var msgEl = document.getElementById('ui-dialog-message');
        var inputEl = document.getElementById('ui-dialog-input');
        var cancelBtn = document.getElementById('ui-dialog-cancel');
        var okBtn = document.getElementById('ui-dialog-ok');
        var actionsEl = okBtn && okBtn.parentNode ? okBtn.parentNode : null;

        dialogState.type = type;
        var title = (opts && typeof opts === 'object' ? String(opts.title || '') : '').trim();
        titleEl.textContent = title || (type === 'confirm' ? '确认' : type === 'prompt' ? '输入' : '提示');
        msgEl.textContent = String(message == null ? '' : message);

        var okText = (opts && typeof opts === 'object' ? String(opts.okText || '') : '').trim();
        var cancelText = (opts && typeof opts === 'object' ? String(opts.cancelText || '') : '').trim();
        okBtn.textContent = okText || (type === 'confirm' || type === 'prompt' ? '确定' : '知道了');
        cancelBtn.textContent = cancelText || '取消';
        if (actionsEl && actionsEl.classList) {
            actionsEl.classList.toggle('is-single', type === 'alert');
        }

        if (type === 'alert') {
            cancelBtn.style.display = 'none';
            inputEl.style.display = 'none';
        } else if (type === 'confirm') {
            cancelBtn.style.display = '';
            inputEl.style.display = 'none';
        } else if (type === 'prompt') {
            cancelBtn.style.display = '';
            inputEl.style.display = '';
            inputEl.value = opts && typeof opts === 'object' && 'defaultValue' in opts ? String(opts.defaultValue || '') : '';
            inputEl.placeholder = opts && typeof opts === 'object' && opts.placeholder ? String(opts.placeholder) : '';
        }

        mask.classList.add('is-visible');
        if (type === 'prompt') {
            window.setTimeout(function () {
                try { inputEl.focus(); inputEl.select(); } catch (e) {}
            }, 20);
        } else {
            window.setTimeout(function () {
                try { okBtn.focus(); } catch (e) {}
            }, 20);
        }

        return new Promise(function (resolve) {
            dialogState.resolve = resolve;
        });
    }

    function uiAlert(message, opts) {
        return openDialog('alert', message, opts);
    }

    function uiConfirm(message, opts) {
        return openDialog('confirm', message, opts);
    }

    function uiPrompt(message, defaultValue, opts) {
        var nextOpts = opts && typeof opts === 'object' ? opts : {};
        if (defaultValue !== undefined) nextOpts = Object.assign({}, nextOpts, { defaultValue: defaultValue });
        return openDialog('prompt', message, nextOpts);
    }

    window.uiToast = uiToast;
    window.uiAlert = uiAlert;
    window.uiConfirm = uiConfirm;
    window.uiPrompt = uiPrompt;

    if (!window.__nativeAlert) {
        window.__nativeAlert = window.alert;
        window.alert = function (message) {
            try {
                uiAlert(message);
            } catch (e) {
                try { window.__nativeAlert(message); } catch (e2) { }
            }
        };
    }
})();
