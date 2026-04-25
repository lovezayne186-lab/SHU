var MineProfile = (function () {
    var AVATAR_KEY = 'user_avatar';
    var NAME_KEY = 'user_name';
    var SIGN_KEY = 'user_signature';
    var PROFILE_DB_KEY = 'mine_profile_v2';
    var profileCache = null;
    var hydratePromise = null;

    function safeGet(key) {
        try {
            var value = localStorage.getItem(key);
            return value || '';
        } catch (e) {
            return '';
        }
    }

    function safeSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
        }
    }

    function normalizeProfileObject(profile) {
        var src = profile && typeof profile === 'object' ? profile : {};
        return {
            avatar: String(src.avatar || '').trim(),
            name: String(src.name || '').trim(),
            signature: String(src.signature || '')
        };
    }

    function writeProfileMirror(profile) {
        var normalized = normalizeProfileObject(profile);
        safeSet(AVATAR_KEY, normalized.avatar);
        safeSet(NAME_KEY, normalized.name);
        safeSet(SIGN_KEY, normalized.signature);
        if (window.localforage && typeof window.localforage.setItem === 'function') {
            window.localforage.setItem(PROFILE_DB_KEY, normalized).catch(function () {});
        }
        return normalized;
    }

    function getMomentsProfile() {
        var data = null;
        if (typeof window.initMomentsData === 'function') {
            data = window.initMomentsData();
        } else if (window.momentsData && typeof window.momentsData === 'object') {
            data = window.momentsData;
        }
        if (!data) {
            return { avatar: '', name: '' };
        }
        return {
            avatar: data.userAvatar || '',
            name: data.userName || ''
        };
    }

    function syncToMoments(profile) {
        if (!profile) return;
        if (typeof window.initMomentsData !== 'function') return;
        var data = window.initMomentsData();
        if (!data || typeof data !== 'object') return;
        if (profile.avatar) data.userAvatar = profile.avatar;
        if (profile.name) data.userName = profile.name;
        window.momentsData = data;
        if (typeof window.saveMomentsData === 'function') {
            window.saveMomentsData();
        }
    }

    function normalizeProfile() {
        var current = normalizeProfileObject(profileCache);
        var avatar = current.avatar || safeGet(AVATAR_KEY);
        var name = current.name || safeGet(NAME_KEY);
        var signature = current.signature || safeGet(SIGN_KEY);
        var fromMoments = null;
        if (!avatar || !name) {
            fromMoments = getMomentsProfile();
        }
        if (!avatar && fromMoments && fromMoments.avatar) {
            avatar = fromMoments.avatar;
        }
        if (!name && fromMoments && fromMoments.name) {
            name = fromMoments.name;
        }
        if (!avatar) {
            if (typeof DEFAULT_MOMENTS_AVATAR !== 'undefined') {
                avatar = DEFAULT_MOMENTS_AVATAR;
            } else {
                avatar = 'assets/images/touxiang.jpg';
            }
        }
        if (!name) {
            if (typeof DEFAULT_MOMENTS_NAME !== 'undefined') {
                name = DEFAULT_MOMENTS_NAME;
            } else {
                name = '我';
            }
        }
        if (!signature) {
            signature = '';
        }
        profileCache = {
            avatar: avatar,
            name: name,
            signature: signature
        };
        writeProfileMirror(profileCache);
        return profileCache;
    }

    function persistProfile(profile) {
        profileCache = normalizeProfileObject(profile);
        writeProfileMirror(profileCache);
        return profileCache;
    }

    function hydrateProfileFromIndexedDb() {
        if (hydratePromise) return hydratePromise;
        hydratePromise = (async function () {
            if (!(window.localforage && typeof window.localforage.getItem === 'function')) {
                return normalizeProfile();
            }
            try {
                var stored = await window.localforage.getItem(PROFILE_DB_KEY);
                if (stored && typeof stored === 'object') {
                    var merged = normalizeProfileObject(stored);
                    if (!merged.avatar || !merged.name) {
                        var current = normalizeProfile();
                        if (!merged.avatar) merged.avatar = current.avatar;
                        if (!merged.name) merged.name = current.name;
                        if (!merged.signature) merged.signature = current.signature;
                    }
                    persistProfile(merged);
                    if (window.MineCore && typeof window.MineCore.refreshProfile === 'function') {
                        window.MineCore.refreshProfile();
                    }
                    return profileCache;
                }
            } catch (e) {
            }
            return normalizeProfile();
        })();
        return hydratePromise;
    }

    function getProfile() {
        return normalizeProfile();
    }

    function setName(name) {
        var value = String(name || '').trim();
        if (!value) return;
        var profile = normalizeProfile();
        profile.name = value;
        persistProfile(profile);
        syncToMoments(profile);
        if (window.MineCore && typeof window.MineCore.refreshProfile === 'function') {
            window.MineCore.refreshProfile();
        }
    }

    function setSignature(signature) {
        var value = String(signature || '');
        var profile = normalizeProfile();
        profile.signature = value;
        persistProfile(profile);
        if (window.MineCore && typeof window.MineCore.refreshProfile === 'function') {
            window.MineCore.refreshProfile();
        }
    }

    function setAvatar(avatar) {
        var value = String(avatar || '').trim();
        if (!value) return;
        var profile = normalizeProfile();
        profile.avatar = value;
        persistProfile(profile);
        syncToMoments(profile);
        if (window.MineCore && typeof window.MineCore.refreshProfile === 'function') {
            window.MineCore.refreshProfile();
        }
    }

    function applyToView() {
        var root = document.getElementById('mine-view');
        if (!root) return;
        var profile = normalizeProfile();
        var avatarEl = root.querySelector('[data-mine-role="avatar"]');
        var nameEl = root.querySelector('[data-mine-role="name"]');
        var signEl = root.querySelector('[data-mine-role="signature"]');
        if (avatarEl) {
            avatarEl.src = profile.avatar;
        }
        if (nameEl) {
            nameEl.textContent = profile.name || '';
        }
        if (signEl) {
            if (profile.signature) {
                signEl.textContent = profile.signature;
            } else {
                signEl.textContent = '点击设置个性签名';
            }
        }
    }

    function handleHeaderClick() {
        var current = normalizeProfile();
        var newName = prompt('修改昵称', current.name || '');
        if (newName != null) {
            newName = String(newName).trim();
            if (newName) {
                setName(newName);
            }
        }
        var newSign = prompt('修改个性签名', current.signature || '');
        if (newSign != null) {
            setSignature(newSign);
        }
        var newAvatar = prompt('更换头像图片链接', current.avatar || '');
        if (newAvatar != null) {
            newAvatar = String(newAvatar).trim();
            if (newAvatar) {
                setAvatar(newAvatar);
            }
        }
        applyToView();
    }

    function handleAvatarFromMoments(avatar) {
        if (!avatar) return;
        var profile = normalizeProfile();
        profile.avatar = String(avatar || '').trim();
        persistProfile(profile);
        if (window.MineCore && typeof window.MineCore.refreshProfile === 'function') {
            window.MineCore.refreshProfile();
        }
    }

    hydrateProfileFromIndexedDb();

    return {
        getProfile: getProfile,
        setName: setName,
        setSignature: setSignature,
        setAvatar: setAvatar,
        applyToView: applyToView,
        handleHeaderClick: handleHeaderClick,
        handleAvatarFromMoments: handleAvatarFromMoments
    };
})();

window.MineProfile = MineProfile;

