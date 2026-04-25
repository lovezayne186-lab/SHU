(function () {
    'use strict';

    function getParentWindow() {
        try {
            const pw = window.parent && window.parent !== window ? window.parent : null;
            return pw || window;
        } catch (e) {
            return window;
        }
    }

    function getCurrentWindow() {
        return window;
    }

    function pickFunction(name) {
        const cw = getCurrentWindow();
        const pw = getParentWindow();
        if (cw && typeof cw[name] === 'function') return cw[name].bind(cw);
        if (pw && typeof pw[name] === 'function') return pw[name].bind(pw);
        return null;
    }

    function readWechatHistory(roleId) {
        const fn = pickFunction('readWechatChatHistory');
        if (!fn) return [];
        try {
            const list = fn(roleId);
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function cleanHistory(history) {
        const fn = pickFunction('cleanChatHistoryForMemory');
        if (!fn) return Array.isArray(history) ? history.slice() : [];
        try {
            const list = fn(history);
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return Array.isArray(history) ? history.slice() : [];
        }
    }

    function buildHistoryForApi(roleId, cleanHistory) {
        const fn = pickFunction('buildHistoryForApi');
        if (!fn) return [];
        try {
            const list = fn(roleId, cleanHistory);
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function buildRoleLitePrompt(scene, roleId, options) {
        const pw = getParentWindow();
        if (!pw || typeof pw.buildRoleLitePrompt !== 'function') return '';
        try {
            return String(pw.buildRoleLitePrompt(scene, roleId, options || {}) || '').trim();
        } catch (e) {
            return '';
        }
    }

    function buildRoleSystemPrompt(roleId) {
        const fn = pickFunction('buildRoleSystemPrompt');
        if (!fn) return '';
        try {
            return String(fn(roleId) || '').trim();
        } catch (e) {
            return '';
        }
    }

    function callAI(systemPrompt, history, userPrompt) {
        const pw = getParentWindow();
        return new Promise(function (resolve, reject) {
            if (!pw || typeof pw.callAI !== 'function') {
                reject(new Error('AI 接口未初始化'));
                return;
            }
            try {
                pw.callAI(
                    String(systemPrompt || ''),
                    Array.isArray(history) ? history : [],
                    String(userPrompt || ''),
                    function (text) { resolve(String(text || '')); },
                    function (err) { reject(new Error(String(err || '请求失败'))); }
                );
            } catch (e) {
                reject(e);
            }
        });
    }

    window.CoupleSpaceParentBridge = {
        getParentWindow: getParentWindow,
        getCurrentWindow: getCurrentWindow,
        pickFunction: pickFunction,
        readWechatHistory: readWechatHistory,
        cleanHistory: cleanHistory,
        buildHistoryForApi: buildHistoryForApi,
        buildRoleLitePrompt: buildRoleLitePrompt,
        buildRoleSystemPrompt: buildRoleSystemPrompt,
        callAI: callAI
    };
})();
