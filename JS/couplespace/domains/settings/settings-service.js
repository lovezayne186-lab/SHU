(function () {
    'use strict';

    const STORAGE_KEY = 'qlkj_settings_v1';
    const defaultSettings = {
        xiuluoEnabled: false,
        xiuluoScreenFloodEnabled: false,
        xiuluoScreenFloodMinutes: 5,
        autoRoleMoodDiaryEnabled: true,
        roleCommentOnUserDiaryEnabled: true,
        secretUsageMonitorEnabled: false,
        secretUsageWalletEnabled: false,
        secretUsageMusicEnabled: false,
        secretUsagePeriodEnabled: false,
        secretUsageBatteryEnabled: false
    };

    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return Object.assign({}, defaultSettings);
            const parsed = JSON.parse(raw);
            return Object.assign({}, defaultSettings, parsed || {});
        } catch (e) {
            return Object.assign({}, defaultSettings);
        }
    }

    function saveSettings(settings) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) { }
    }

    function getSetting(key) {
        return loadSettings()[key];
    }

    function setSetting(key, value) {
        const settings = loadSettings();
        settings[key] = value;
        saveSettings(settings);
        return settings[key];
    }

    function isXiuluoEnabled() {
        return getSetting('xiuluoEnabled') === true;
    }

    function normalizeXiuluoScreenFloodMinutes(value) {
        const n = Math.floor(Number(value));
        if (!Number.isFinite(n)) return 5;
        return Math.max(1, Math.min(15, n));
    }

    function isXiuluoScreenFloodEnabled() {
        const settings = loadSettings();
        return settings.xiuluoEnabled === true && settings.xiuluoScreenFloodEnabled === true;
    }

    function getXiuluoScreenFloodMinutes() {
        return normalizeXiuluoScreenFloodMinutes(getSetting('xiuluoScreenFloodMinutes'));
    }

    function isAutoRoleMoodDiaryEnabled() {
        return getSetting('autoRoleMoodDiaryEnabled') !== false;
    }

    function isRoleCommentOnUserDiaryEnabled() {
        return getSetting('roleCommentOnUserDiaryEnabled') !== false;
    }

    function isSecretUsageBatteryEnabled() {
        const settings = loadSettings();
        return settings.secretUsageMonitorEnabled === true && settings.secretUsageBatteryEnabled === true;
    }

    window.CoupleSpaceSettings = {
        STORAGE_KEY: STORAGE_KEY,
        loadSettings: loadSettings,
        saveSettings: saveSettings,
        getSetting: getSetting,
        setSetting: setSetting,
        isXiuluoEnabled: isXiuluoEnabled,
        isXiuluoScreenFloodEnabled: isXiuluoScreenFloodEnabled,
        getXiuluoScreenFloodMinutes: getXiuluoScreenFloodMinutes,
        normalizeXiuluoScreenFloodMinutes: normalizeXiuluoScreenFloodMinutes,
        isAutoRoleMoodDiaryEnabled: isAutoRoleMoodDiaryEnabled,
        isRoleCommentOnUserDiaryEnabled: isRoleCommentOnUserDiaryEnabled,
        isSecretUsageBatteryEnabled: isSecretUsageBatteryEnabled
    };
})();
