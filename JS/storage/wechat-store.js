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
        stickerData: 'wechat_sticker_data',
        memoryArchive: 'wechat_memory_archive_v1'
    };

    let storeInstance = null;
    let snapshotCache = null;
    let initPromise = null;

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
        out.stickerData = out.stickerData === undefined ? null : out.stickerData;
        out.__shubao_wechat_v2__ = 1;
        out.version = 2;
        out.createdAt = String(out.createdAt || base.createdAt);
        out.updatedAt = String(out.updatedAt || base.updatedAt);
        return out;
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

    async function readStoreSnapshot() {
        const store = getStore();
        if (store && typeof store.getItem === 'function') {
            const value = await store.getItem(SNAPSHOT_KEY);
            if (value && typeof value === 'object') return normalizeSnapshot(value);
        }
        try {
            return normalizeSnapshot(parseJson(localStorage.getItem(FALLBACK_KEY), null));
        } catch (e) {
            return normalizeSnapshot(null);
        }
    }

    async function writeStoreSnapshot(snapshot) {
        const next = normalizeSnapshot(snapshot);
        next.updatedAt = nowIso();
        snapshotCache = next;
        const store = getStore();
        if (store && typeof store.setItem === 'function') {
            await store.setItem(SNAPSHOT_KEY, next);
        } else {
            localStorage.setItem(FALLBACK_KEY, JSON.stringify(next));
        }
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
                dst[id] = Object.assign({}, dst[id], clone(value));
                return;
            }
            if (value !== undefined && value !== null) dst[id] = clone(value);
        });
        return dst;
    }

    function mergeSnapshot(base, incoming) {
        const out = normalizeSnapshot(base);
        const src = normalizeSnapshot(incoming);
        out.profiles = mergeRoleMap(out.profiles, src.profiles);
        out.chats = mergeRoleMap(out.chats, src.chats, { arrayByLength: true });
        out.chatMapData = mergeRoleMap(out.chatMapData, src.chatMapData);
        out.userPersonas = mergeRoleMap(out.userPersonas, src.userPersonas);
        out.backgrounds = mergeRoleMap(out.backgrounds, src.backgrounds);
        out.callLogs = mergeRoleMap(out.callLogs, src.callLogs, { arrayByLength: true });
        out.unread = mergeRoleMap(out.unread, src.unread);
        out.familyCards = mergeRoleMap(out.familyCards, src.familyCards);
        out.memoryArchive = mergeRoleMap(out.memoryArchive, src.memoryArchive);
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
        out.memoryArchive = isObject(map.memoryArchive) ? clone(map.memoryArchive) : {};
        out.stickerData = map.stickerData === undefined ? null : clone(map.stickerData);
        return out;
    }

    function readLocalStorageLegacySnapshot() {
        const map = {};
        Object.keys(LEGACY_KEYS).forEach(function (field) {
            try {
                map[field] = parseJson(localStorage.getItem(LEGACY_KEYS[field]), field === 'stickerData' ? null : {});
            } catch (e) { }
        });
        try {
            const legacySticker = parseJson(localStorage.getItem('stickerData_v2') || localStorage.getItem('stickerData'), null);
            if (legacySticker) map.stickerData = legacySticker;
        } catch (e2) { }
        return snapshotFromLegacyMap(map);
    }

    async function readLegacyForageSnapshot() {
        if (!window.localforage || typeof window.localforage.createInstance !== 'function') return emptySnapshot();
        const legacy = window.localforage.createInstance({ name: DB_NAME, storeName: 'wechat' });
        const map = {};
        const fields = Object.keys(LEGACY_KEYS);
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            try {
                map[field] = await legacy.getItem(LEGACY_KEYS[field]);
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
        out.memoryArchive = isObject(window.memoryArchiveStore) ? clone(window.memoryArchiveStore) : {};
        out.stickerData = window.stickerData === undefined ? null : clone(window.stickerData);
        return out;
    }

    async function init(options) {
        const force = !!(options && options.forceReload);
        if (!force && initPromise) return initPromise;
        initPromise = (async function () {
            let snap = await readStoreSnapshot();
            const shouldMigrate = force || !localStorage.getItem(MIGRATED_KEY) || !snap || !Object.keys(snap.profiles || {}).length;
            if (shouldMigrate) {
                snap = mergeSnapshot(snap, readLocalStorageLegacySnapshot());
                snap = mergeSnapshot(snap, await readLegacyForageSnapshot());
                snap = includeMomentRoleIds(snap);
                await writeStoreSnapshot(snap);
                try { localStorage.setItem(MIGRATED_KEY, nowIso()); } catch (e) { }
            } else {
                applySnapshotToWindow(snap);
            }
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
        return writeStoreSnapshot(snap);
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
        return writeStoreSnapshot(snap);
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
        _meta: {
            dbName: DB_NAME,
            storeName: STORE_NAME,
            snapshotKey: SNAPSHOT_KEY
        }
    };
})();
