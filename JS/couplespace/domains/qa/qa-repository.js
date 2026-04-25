(function () {
    'use strict';

    const STORAGE_KEY = 'couple_space_qa_progress_v1';
    const ROLE_KEY_SEP = '__roleId__';
    let storeInstance = null;

    function getStore() {
        if (storeInstance) return storeInstance;
        try {
            const pw = window.parent && window.parent !== window ? window.parent : null;
            const lib =
                (pw && pw.localforage && typeof pw.localforage.createInstance === 'function')
                    ? pw.localforage
                    : (window.localforage && typeof window.localforage.createInstance === 'function')
                        ? window.localforage
                        : null;
            if (!lib) return null;
            storeInstance = lib.createInstance({ name: 'shubao_large_store_v1', storeName: 'couple_space_qa' });
            return storeInstance;
        } catch (e) {
            return null;
        }
    }

    function buildRoleKey(baseKey, roleId) {
        const key = String(baseKey || '').trim();
        const rid = String(roleId || '').trim();
        if (!key) return '';
        if (!rid) return key;
        if (key.indexOf(ROLE_KEY_SEP) !== -1) return key;
        return key + ROLE_KEY_SEP + rid;
    }

    function safeJsonParse(text, fallback) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return fallback;
        }
    }

    async function read(roleId) {
        const rid = String(roleId || '').trim();
        const scopedKey = buildRoleKey(STORAGE_KEY, rid);
        const store = getStore();
        if (store) {
            try {
                const value = await store.getItem(scopedKey);
                if (value !== null && value !== undefined) return value;
            } catch (e) { }
            if (rid && scopedKey !== STORAGE_KEY) {
                try {
                    const legacy = await store.getItem(STORAGE_KEY);
                    if (legacy !== null && legacy !== undefined) {
                        await store.setItem(scopedKey, legacy);
                        await store.removeItem(STORAGE_KEY);
                        return legacy;
                    }
                } catch (e2) { }
            }
        }
        try {
            const raw = localStorage.getItem(scopedKey);
            if (!raw && rid && scopedKey !== STORAGE_KEY) {
                const legacyRaw = localStorage.getItem(STORAGE_KEY);
                if (legacyRaw) {
                    const legacyParsed = safeJsonParse(legacyRaw, null);
                    if (legacyParsed && typeof legacyParsed === 'object') {
                        try { localStorage.setItem(scopedKey, JSON.stringify(legacyParsed)); } catch (e3) { }
                        try { localStorage.removeItem(STORAGE_KEY); } catch (e4) { }
                        return legacyParsed;
                    }
                }
            }
            if (!raw) return null;
            const parsed = safeJsonParse(raw, null);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (e5) {
            return null;
        }
    }

    async function write(roleId, value) {
        const rid = String(roleId || '').trim();
        const scopedKey = buildRoleKey(STORAGE_KEY, rid);
        const store = getStore();
        if (store) {
            try {
                await store.setItem(scopedKey, value);
            } catch (e) { }
        }
        try {
            localStorage.setItem(scopedKey, JSON.stringify(value));
        } catch (e2) { }
    }

    async function remove(roleId) {
        const rid = String(roleId || '').trim();
        const scopedKey = buildRoleKey(STORAGE_KEY, rid);
        const store = getStore();
        if (store) {
            try { await store.removeItem(STORAGE_KEY); } catch (e0) { }
            try { await store.removeItem(scopedKey); } catch (e1) { }
        }
        try { localStorage.removeItem(STORAGE_KEY); } catch (e2) { }
        try { localStorage.removeItem(scopedKey); } catch (e3) { }
    }

    window.CoupleQaRepository = {
        STORAGE_KEY: STORAGE_KEY,
        ROLE_KEY_SEP: ROLE_KEY_SEP,
        buildRoleKey: buildRoleKey,
        read: read,
        write: write,
        remove: remove
    };
})();
