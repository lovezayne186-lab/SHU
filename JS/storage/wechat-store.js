(function () {
    const DB_NAME = 'shubao-phone';
    const STORE_NAME = 'wechat_v2';
    const SNAPSHOT_KEY = 'snapshot';
    const FALLBACK_KEY = '__wechat_v2_snapshot';
    const MIGRATED_KEY = 'wechat_v2_migrated_at';

    const ROLE_MAP_KEYS = [
        'profiles',
        'chats',
        'chatMapData',
        'userPersonas',
        'backgrounds',
        'callLogs',
        'unread',
        'familyCards',
        'memoryArchive'
    ];

    const LEGACY_KEYS = {
        profiles: 'wechat_charProfiles',
        chats: 'wechat_chatData',
        chatMapData: 'wechat_chatMapData',
        userPersonas: 'wechat_userPersonas',
        backgrounds: 'wechat_backgrounds',
        callLogs: 'wechat_callLogs',
        unread: 'wechat_unread',
        familyCards: 'wechat_family_cards',
        favorites: 'wechat_favorites_v2',
        stickerData: 'wechat_sticker_data',
        memoryArchive: 'wechat_memory_archive_v1'
    };

    let storeInstance = null;
    let legacyStoreInstance = null;
    let snapshotCache = null;
    let initPromise = null;

    function withTimeout(promise, ms, label) {
        return new Promise(function (resolve, reject) {
            let done = false;
            const timer = setTimeout(function () {
                if (done) return;
                done = true;
                reject(new Error((label || 'storage operation') + ' timeout'));
            }, ms || 2500);
            Promise.resolve(promise).then(function (value) {
                if (done) return;
                done = true;
                clearTimeout(timer);
                resolve(value);
            }).catch(function (err) {
                if (done) return;
                done = true;
                clearTimeout(timer);
                reject(err);
            });
        });
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function clone(value) {
        if (value === undefined) return undefined;
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (e) {
            return value;
        }
    }

    function parseJson(value, fallback) {
        if (value == null || value === '') return fallback;
        if (typeof value !== 'string') return isObject(value) || Array.isArray(value) ? value : fallback;
        try {
            const parsed = JSON.parse(value);
            return parsed == null ? fallback : parsed;
        } catch (e) {
            return fallback;
        }
    }

    function emptySnapshot() {
        return {
            __shubao_wechat_v2__: 1,
            version: 2,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            profiles: {},
            chats: {},
            chatMapData: {},
            userPersonas: {},
            backgrounds: {},
            callLogs: {},
            unread: {},
            familyCards: {},
            favorites: [],
            stickerData: null,
            memoryArchive: {}
        };
    }

    function normalizeSnapshot(input) {
        const base = emptySnapshot();
        const src = isObject(input) ? input : {};
        const out = Object.assign(base, src);

        ROLE_MAP_KEYS.forEach(function (key) {
            out[key] = isObject(out[key]) ? out[key] : {};
        });
        out.favorites = Array.isArray(out.favorites) ? out.favorites : [];
        out.stickerData = out.stickerData === undefined ? null : out.stickerData;
        out.__shubao_wechat_v2__ = 1;
        out.version = 2;
        out.createdAt = String(out.createdAt || base.createdAt);
        out.updatedAt = String(out.updatedAt || base.updatedAt);
        return out;
    }

    function roleCount(map) {
        return isObject(map) ? Object.keys(map).filter(Boolean).length : 0;
    }

    function chatMessageCount(chats) {
        if (!isObject(chats)) return 0;
        return Object.keys(chats).reduce(function (sum, roleId) {
            const list = chats[roleId];
            return sum + (Array.isArray(list) ? list.length : 0);
        }, 0);
    }

    function hasSnapshotPayload(snapshot) {
        const snap = normalizeSnapshot(snapshot);
        return roleCount(snap.profiles) > 0 ||
            chatMessageCount(snap.chats) > 0 ||
            roleCount(snap.userPersonas) > 0 ||
            roleCount(snap.chatMapData) > 0 ||
            (Array.isArray(snap.favorites) && snap.favorites.length > 0) ||
            roleCount(snap.memoryArchive) > 0;
    }

    function looksLikeAccidentalDataLoss(base, next) {
        const oldSnap = normalizeSnapshot(base);
        const newSnap = normalizeSnapshot(next);
        const oldProfiles = roleCount(oldSnap.profiles);
        const newProfiles = roleCount(newSnap.profiles);
        const oldMessages = chatMessageCount(oldSnap.chats);
        const newMessages = chatMessageCount(newSnap.chats);
        const oldFavorites = Array.isArray(oldSnap.favorites) ? oldSnap.favorites.length : 0;
        const newFavorites = Array.isArray(newSnap.favorites) ? newSnap.favorites.length : 0;
        return (oldProfiles > 0 && newProfiles < oldProfiles) ||
            (oldMessages > 0 && newMessages < oldMessages) ||
            (oldFavorites > 0 && newFavorites < oldFavorites);
    }

    function getStore() {
        if (storeInstance) return storeInstance;
        if (!window.localforage || typeof window.localforage.createInstance !== 'function') return null;
        storeInstance = window.localforage.createInstance({
            name: DB_NAME,
            storeName: STORE_NAME
        });
        try { window.__wechatV2ForageInstance = storeInstance; } catch (e) { }
        return storeInstance;
    }

    function getLegacyStore() {
        if (legacyStoreInstance) return legacyStoreInstance;
        if (!window.localforage || typeof window.localforage.createInstance !== 'function') return null;
        legacyStoreInstance = window.localforage.createInstance({
            name: DB_NAME,
            storeName: 'wechat'
        });
        return legacyStoreInstance;
    }

    async function readStoreSnapshot() {
        let out = emptySnapshot();
        const store = getStore();
        if (store && typeof store.getItem === 'function') {
            try {
                const value = await withTimeout(store.getItem(SNAPSHOT_KEY), 1800, 'wechat_v2 read');
                if (value && typeof value === 'object') out = mergeSnapshot(out, value);
            } catch (e) {
                console.warn('[WechatStore] 读取 wechat_v2 超时或失败，改用轻量回退', e);
            }
        }
        try {
            const fallback = parseJson(localStorage.getItem(FALLBACK_KEY), null);
            if (hasSnapshotPayload(fallback)) out = mergeSnapshot(out, fallback, { preserveExistingObjects: true });
        } catch (e) { }
        return normalizeSnapshot(out);
    }

    function writeLocalStorageMirrors(snapshot) {
        const snap = normalizeSnapshot(snapshot);
        try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(snap)); } catch (e0) { }
        try { localStorage.setItem(LEGACY_KEYS.profiles, JSON.stringify(snap.profiles || {})); } catch (e1) { }
        try { localStorage.setItem(LEGACY_KEYS.chats, JSON.stringify(snap.chats || {})); } catch (e2) { }
        try { localStorage.setItem(LEGACY_KEYS.chatMapData, JSON.stringify(snap.chatMapData || {})); } catch (e3) { }
        try { localStorage.setItem(LEGACY_KEYS.userPersonas, JSON.stringify(snap.userPersonas || {})); } catch (e4) { }
        try { localStorage.setItem(LEGACY_KEYS.backgrounds, JSON.stringify(snap.backgrounds || {})); } catch (e5) { }
        try { localStorage.setItem(LEGACY_KEYS.callLogs, JSON.stringify(snap.callLogs || {})); } catch (e6) { }
        try { localStorage.setItem(LEGACY_KEYS.unread, JSON.stringify(snap.unread || {})); } catch (e7) { }
        try { localStorage.setItem(LEGACY_KEYS.familyCards, JSON.stringify(snap.familyCards || {})); } catch (e8) { }
        try { localStorage.setItem(LEGACY_KEYS.favorites, JSON.stringify(snap.favorites || [])); } catch (e9) { }
        try { localStorage.setItem(LEGACY_KEYS.memoryArchive, JSON.stringify(snap.memoryArchive || {})); } catch (e10) { }
        try { localStorage.setItem(LEGACY_KEYS.stickerData, JSON.stringify(snap.stickerData || null)); } catch (e11) { }
    }

    async function writeLegacyForageSnapshot(snapshot) {
        const legacy = getLegacyStore();
        if (!legacy || typeof legacy.setItem !== 'function') return;
        const snap = normalizeSnapshot(snapshot);
        await withTimeout(Promise.all([
            legacy.setItem(LEGACY_KEYS.profiles, snap.profiles || {}),
            legacy.setItem(LEGACY_KEYS.chats, snap.chats || {}),
            legacy.setItem(LEGACY_KEYS.chatMapData, snap.chatMapData || {}),
            legacy.setItem(LEGACY_KEYS.userPersonas, snap.userPersonas || {}),
            legacy.setItem(LEGACY_KEYS.backgrounds, snap.backgrounds || {}),
            legacy.setItem(LEGACY_KEYS.callLogs, snap.callLogs || {}),
            legacy.setItem(LEGACY_KEYS.unread, snap.unread || {}),
            legacy.setItem(LEGACY_KEYS.familyCards, snap.familyCards || {}),
            legacy.setItem(LEGACY_KEYS.favorites, snap.favorites || []),
            legacy.setItem(LEGACY_KEYS.memoryArchive, snap.memoryArchive || {}),
            legacy.setItem(LEGACY_KEYS.stickerData, snap.stickerData || null)
        ]), 2500, 'legacy wechat mirror write');
    }

    async function writeStoreSnapshot(snapshot, options) {
        const opts = options || {};
        let next = normalizeSnapshot(snapshot);
        const base = normalizeSnapshot(snapshotCache || null);
        if (!opts.allowDataLoss && hasSnapshotPayload(base) && looksLikeAccidentalDataLoss(base, next)) {
            console.warn('[WechatStore] 检测到疑似空快照覆盖，已合并保留现有联系人/聊天记录');
            next = mergeSnapshot(next, base, { preserveExistingObjects: true });
        }
        next.updatedAt = nowIso();
        snapshotCache = next;
        writeLocalStorageMirrors(next);
        const store = getStore();
        if (store && typeof store.setItem === 'function') {
            try {
                await withTimeout(store.setItem(SNAPSHOT_KEY, next), 2500, 'wechat_v2 write');
            } catch (e) {
                console.warn('[WechatStore] 写入 wechat_v2 超时或失败，暂存轻量回退', e);
            }
        } else {
            writeLocalStorageMirrors(next);
        }
        try { await writeLegacyForageSnapshot(next); } catch (e2) { console.warn('[WechatStore] 写入旧存储镜像失败', e2); }
        applySnapshotToWindow(next);
        try {
            window.dispatchEvent(new CustomEvent('wechat-store-updated', {
                detail: { snapshot: clone(next) }
            }));
        } catch (e) { }
        return clone(next);
    }

    function mergeRoleMap(target, incoming, options) {
        const dst = isObject(target) ? target : {};
        const src = isObject(incoming) ? incoming : {};
        const opts = options || {};
        Object.keys(src).forEach(function (roleId) {
            const id = String(roleId || '').trim();
            if (!id) return;
            const value = src[roleId];
            if (opts.arrayByLength) {
                const oldList = Array.isArray(dst[id]) ? dst[id] : [];
                const newList = Array.isArray(value) ? value : [];
                if (newList.length >= oldList.length) dst[id] = clone(newList);
                return;
            }
            if (isObject(dst[id]) && isObject(value)) {
                dst[id] = opts.preserveExistingObjects
                    ? Object.assign({}, clone(value), dst[id])
                    : Object.assign({}, dst[id], clone(value));
                return;
            }
            if (opts.preserveExistingObjects && dst[id] !== undefined && dst[id] !== null) return;
            if (value !== undefined && value !== null) dst[id] = clone(value);
        });
        return dst;
    }

    function mergeSnapshot(base, incoming, options) {
        const opts = options || {};
        const mapOpts = opts.preserveExistingObjects ? { preserveExistingObjects: true } : {};
        const out = normalizeSnapshot(base);
        const src = normalizeSnapshot(incoming);
        out.profiles = mergeRoleMap(out.profiles, src.profiles, mapOpts);
        out.chats = mergeRoleMap(out.chats, src.chats, { arrayByLength: true });
        out.chatMapData = mergeRoleMap(out.chatMapData, src.chatMapData, mapOpts);
        out.userPersonas = mergeRoleMap(out.userPersonas, src.userPersonas, mapOpts);
        out.backgrounds = mergeRoleMap(out.backgrounds, src.backgrounds, mapOpts);
        out.callLogs = mergeRoleMap(out.callLogs, src.callLogs, { arrayByLength: true });
        out.unread = mergeRoleMap(out.unread, src.unread, mapOpts);
        out.familyCards = mergeRoleMap(out.familyCards, src.familyCards, mapOpts);
        out.memoryArchive = mergeRoleMap(out.memoryArchive, src.memoryArchive, mapOpts);
        if (Array.isArray(src.favorites) && src.favorites.length) {
            const currentFavorites = Array.isArray(out.favorites) ? out.favorites : [];
            out.favorites = clone(src.favorites.length >= currentFavorites.length ? src.favorites : currentFavorites);
        }
        if (src.stickerData != null) out.stickerData = clone(src.stickerData);
        out.updatedAt = nowIso();
        return out;
    }

    function snapshotFromLegacyMap(map) {
        const out = emptySnapshot();
        out.profiles = isObject(map.profiles) ? clone(map.profiles) : {};
        out.chats = isObject(map.chats) ? clone(map.chats) : {};
        out.chatMapData = isObject(map.chatMapData) ? clone(map.chatMapData) : {};
        out.userPersonas = isObject(map.userPersonas) ? clone(map.userPersonas) : {};
        out.backgrounds = isObject(map.backgrounds) ? clone(map.backgrounds) : {};
        out.callLogs = isObject(map.callLogs) ? clone(map.callLogs) : {};
        out.unread = isObject(map.unread) ? clone(map.unread) : {};
        out.familyCards = isObject(map.familyCards) ? clone(map.familyCards) : {};
        out.favorites = Array.isArray(map.favorites) ? clone(map.favorites) : [];
        out.memoryArchive = isObject(map.memoryArchive) ? clone(map.memoryArchive) : {};
        out.stickerData = map.stickerData === undefined ? null : clone(map.stickerData);
        return out;
    }

    function readLocalStorageLegacySnapshot() {
        const map = {};
        Object.keys(LEGACY_KEYS).forEach(function (field) {
            try {
                map[field] = parseJson(
                    localStorage.getItem(LEGACY_KEYS[field]),
                    field === 'stickerData' ? null : (field === 'favorites' ? [] : {})
                );
            } catch (e) { }
        });
        try {
            const legacySticker = parseJson(localStorage.getItem('stickerData_v2') || localStorage.getItem('stickerData'), null);
            if (legacySticker) map.stickerData = legacySticker;
        } catch (e2) { }
        return snapshotFromLegacyMap(map);
    }

    async function readLegacyForageSnapshot() {
        const legacy = getLegacyStore();
        if (!legacy || typeof legacy.getItem !== 'function') return emptySnapshot();
        const map = {};
        const fields = Object.keys(LEGACY_KEYS);
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            try {
                map[field] = await withTimeout(legacy.getItem(LEGACY_KEYS[field]), 900, 'legacy wechat read');
            } catch (e) { }
        }
        return snapshotFromLegacyMap(map);
    }

    function includeMomentRoleIds(snapshot) {
        const snap = normalizeSnapshot(snapshot);
        const ids = {};
        function note(id) {
            const rid = String(id || '').trim();
            if (rid && rid !== 'me') ids[rid] = true;
        }

        try {
            const data = window.momentsData || parseJson(localStorage.getItem('wechat_moments_data'), null) || {};
            const posts = Array.isArray(data.posts) ? data.posts : [];
            posts.forEach(function (post) {
                note(post && post.roleId);
                const comments = Array.isArray(post && post.comments) ? post.comments : [];
                comments.forEach(function (comment) { note(comment && comment.roleId); });
                const likes = Array.isArray(post && post.likes) ? post.likes : [];
                likes.forEach(function (item) {
                    if (typeof item === 'string') note(item);
                    else note(item && item.roleId);
                });
            });
        } catch (e) { }

        Object.keys(ids).forEach(function (roleId) {
            if (!snap.profiles[roleId]) {
                snap.profiles[roleId] = {
                    id: roleId,
                    roleId: roleId,
                    nickName: roleId,
                    name: roleId,
                    avatar: 'assets/chushitouxiang.jpg',
                    migratedFromMoments: true
                };
            }
        });
        return snap;
    }

    function applySnapshotToWindow(snapshot) {
        const snap = normalizeSnapshot(snapshot);
        window.charProfiles = snap.profiles;
        window.chatData = snap.chats;
        window.chatMapData = snap.chatMapData;
        window.userPersonas = snap.userPersonas;
        window.chatBackgrounds = snap.backgrounds;
        window.callLogs = snap.callLogs;
        window.chatUnread = snap.unread;
        window.familyCardState = snap.familyCards;
        window.favorites = Array.isArray(snap.favorites) ? snap.favorites : [];
        window.memoryArchiveStore = snap.memoryArchive;
        if (snap.stickerData !== null && snap.stickerData !== undefined) window.stickerData = snap.stickerData;
    }

    function snapshotFromWindow() {
        const out = emptySnapshot();
        out.profiles = isObject(window.charProfiles) ? clone(window.charProfiles) : {};
        out.chats = isObject(window.chatData) ? clone(window.chatData) : {};
        out.chatMapData = isObject(window.chatMapData) ? clone(window.chatMapData) : {};
        out.userPersonas = isObject(window.userPersonas) ? clone(window.userPersonas) : {};
        out.backgrounds = isObject(window.chatBackgrounds) ? clone(window.chatBackgrounds) : {};
        out.callLogs = isObject(window.callLogs) ? clone(window.callLogs) : {};
        out.unread = isObject(window.chatUnread) ? clone(window.chatUnread) : {};
        out.familyCards = isObject(window.familyCardState) ? clone(window.familyCardState) : {};
        out.favorites = Array.isArray(window.favorites) ? clone(window.favorites) : [];
        out.memoryArchive = isObject(window.memoryArchiveStore) ? clone(window.memoryArchiveStore) : {};
        out.stickerData = window.stickerData === undefined ? null : clone(window.stickerData);
        return out;
    }

    async function init(options) {
        const force = !!(options && options.forceReload);
        if (!force && initPromise) return initPromise;
        initPromise = (async function () {
            let snap = await readStoreSnapshot();
            snap = mergeSnapshot(snap, readLocalStorageLegacySnapshot(), { preserveExistingObjects: true });
            snap = mergeSnapshot(snap, await readLegacyForageSnapshot(), { preserveExistingObjects: true });
            snap = includeMomentRoleIds(snap);
            await writeStoreSnapshot(snap, { allowDataLoss: true });
            try { localStorage.setItem(MIGRATED_KEY, nowIso()); } catch (e) { }
            snapshotCache = normalizeSnapshot(snap);
            return clone(snapshotCache);
        })();
        try {
            return await initPromise;
        } catch (e) {
            initPromise = null;
            throw e;
        }
    }

    function currentSnapshot() {
        return normalizeSnapshot(snapshotCache || snapshotFromWindow());
    }

    async function saveSnapshotFromWindow() {
        if (initPromise) {
            try { await initPromise; } catch (e) { }
        }
        const base = currentSnapshot();
        const next = normalizeSnapshot(snapshotFromWindow());
        next.createdAt = base.createdAt || next.createdAt;
        return writeStoreSnapshot(next);
    }

    async function saveProfile(roleId, profile) {
        await init();
        const id = String(roleId || profile && (profile.roleId || profile.id) || '').trim();
        if (!id) throw new Error('缺少联系人 ID');
        const snap = currentSnapshot();
        snap.profiles[id] = Object.assign({}, snap.profiles[id] || {}, clone(profile || {}), { id: id, roleId: id });
        return writeStoreSnapshot(snap);
    }

    async function deleteRole(roleId) {
        await init();
        const id = String(roleId || '').trim();
        if (!id) return currentSnapshot();
        const snap = currentSnapshot();
        ROLE_MAP_KEYS.forEach(function (key) {
            if (snap[key] && typeof snap[key] === 'object') delete snap[key][id];
        });
        return writeStoreSnapshot(snap, { allowDataLoss: true });
    }

    async function appendMessage(roleId, msg) {
        await init();
        const id = String(roleId || '').trim();
        if (!id) throw new Error('缺少聊天 ID');
        const snap = currentSnapshot();
        if (!Array.isArray(snap.chats[id])) snap.chats[id] = [];
        snap.chats[id].push(clone(msg || {}));
        return writeStoreSnapshot(snap);
    }

    async function replaceChat(roleId, messages) {
        await init();
        const id = String(roleId || '').trim();
        if (!id) throw new Error('缺少聊天 ID');
        const snap = currentSnapshot();
        snap.chats[id] = Array.isArray(messages) ? clone(messages) : [];
        return writeStoreSnapshot(snap, { allowDataLoss: true });
    }

    async function importContactBackup(json) {
        await init();
        const data = isObject(json) ? json : {};
        const rawRoleId = String(data.roleId || data.id || '').trim();
        const incomingProfile = isObject(data.profile) ? data.profile : null;
        if (!rawRoleId || !incomingProfile) throw new Error('联系人数据不完整');

        const snap = currentSnapshot();
        let targetId = rawRoleId;
        if (snap.profiles[targetId]) targetId = rawRoleId + '_import_' + Date.now().toString(36);

        const profile = Object.assign({}, clone(incomingProfile), { id: targetId, roleId: targetId });
        snap.profiles[targetId] = profile;
        if (Array.isArray(data.chatData)) snap.chats[targetId] = clone(data.chatData);
        if (isObject(data.chatMapData)) snap.chatMapData[targetId] = clone(data.chatMapData);
        if (isObject(data.userPersona)) snap.userPersonas[targetId] = clone(data.userPersona);
        if (data.chatBackground !== null && data.chatBackground !== undefined) snap.backgrounds[targetId] = clone(data.chatBackground);
        if (Array.isArray(data.callLogs)) snap.callLogs[targetId] = clone(data.callLogs);
        if (data.unread !== null && data.unread !== undefined) snap.unread[targetId] = clone(data.unread);
        if (isObject(data.memoryArchive)) snap.memoryArchive[targetId] = clone(data.memoryArchive);
        await writeStoreSnapshot(snap);
        return { roleId: targetId, originalRoleId: rawRoleId, profile: clone(profile) };
    }

    async function exportContactBackup(roleId) {
        await init();
        const id = String(roleId || '').trim();
        const snap = currentSnapshot();
        const profile = snap.profiles[id];
        if (!id || !profile) throw new Error('找不到该联系人');
        return {
            __shubao_contact_backup__: 1,
            version: 2,
            storage: STORE_NAME,
            createdAt: nowIso(),
            roleId: id,
            profile: clone(profile),
            chatData: Array.isArray(snap.chats[id]) ? clone(snap.chats[id]) : [],
            chatMapData: isObject(snap.chatMapData[id]) ? clone(snap.chatMapData[id]) : null,
            userPersona: isObject(snap.userPersonas[id]) ? clone(snap.userPersonas[id]) : null,
            chatBackground: snap.backgrounds[id] === undefined ? null : clone(snap.backgrounds[id]),
            callLogs: Array.isArray(snap.callLogs[id]) ? clone(snap.callLogs[id]) : [],
            unread: snap.unread[id] === undefined ? null : clone(snap.unread[id]),
            memoryArchive: isObject(snap.memoryArchive[id]) ? clone(snap.memoryArchive[id]) : null
        };
    }

    window.WechatStore = {
        init: init,
        getSnapshot: async function () {
            await init();
            return clone(currentSnapshot());
        },
        saveSnapshotFromWindow: saveSnapshotFromWindow,
        saveProfile: saveProfile,
        deleteRole: deleteRole,
        appendMessage: appendMessage,
        replaceChat: replaceChat,
        importContactBackup: importContactBackup,
        exportContactBackup: exportContactBackup,
        applySnapshotToWindow: applySnapshotToWindow,
        resetRuntime: function () {
            storeInstance = null;
            legacyStoreInstance = null;
            snapshotCache = null;
            initPromise = null;
        },
        _meta: {
            dbName: DB_NAME,
            storeName: STORE_NAME,
            snapshotKey: SNAPSHOT_KEY
        }
    };
})();
