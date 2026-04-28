function resolveChatSettingsRoleId(roleId) {
    const explicit = String(roleId || '').trim();
    if (explicit) return explicit;
    try {
        const modal = document.getElementById('settings-menu-modal');
        const modalRoleId = modal && modal.dataset ? String(modal.dataset.roleId || '').trim() : '';
        if (modalRoleId) return modalRoleId;
    } catch (e) { }
    const current = String(window.currentChatRole || '').trim();
    if (current) return current;
    try {
        const storedCurrent = String(localStorage.getItem('currentChatId') || '').trim();
        if (storedCurrent) return storedCurrent;
    } catch (e1) { }
    try {
        const remembered = String(window.__lastChatSettingsRoleId || localStorage.getItem('lastChatSettingsRoleId') || '').trim();
        if (remembered) return remembered;
    } catch (e2) { }
    try {
        const title = String((document.getElementById('current-chat-name') || {}).textContent || '').trim();
        const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
        const matches = Object.keys(profiles).filter(function (key) {
            const p = profiles[key] || {};
            return title && (String(p.remark || '').trim() === title || String(p.nickName || '').trim() === title || String(p.name || '').trim() === title);
        });
        if (matches.length === 1) return matches[0];
    } catch (e3) { }
    return '';
}

function rememberChatSettingsRoleId(roleId) {
    const id = String(roleId || '').trim();
    if (!id) return '';
    try { window.__lastChatSettingsRoleId = id; } catch (e0) { }
    try { localStorage.setItem('lastChatSettingsRoleId', id); } catch (e1) { }
    return id;
}

const CHAT_BUBBLE_CSS_BY_ROLE_KEY = 'chat_bubble_css_by_role';
const CHAT_BUBBLE_PRESETS_BY_ROLE_KEY = 'chat_bubble_presets_by_role';
const CHAT_BUBBLE_CSS_ROLE_DB_PREFIX = 'chat_bubble_css_role_v2:';
const CHAT_BUBBLE_CSS_ROLE_LS_PREFIX = 'chat_bubble_css_role_v2_';
const chatBubbleCssMemory = {};
const chatBubbleCssHydrating = {};

function getChatBubbleCssRoleKey(roleId) {
    const id = String(roleId || '').trim();
    return id ? CHAT_BUBBLE_CSS_ROLE_DB_PREFIX + id : '';
}

function getChatBubbleCssRoleLsKey(roleId) {
    const id = String(roleId || '').trim();
    return id ? CHAT_BUBBLE_CSS_ROLE_LS_PREFIX + id : '';
}

function readChatBubbleCssByRole() {
    try {
        const parsed = JSON.parse(localStorage.getItem(CHAT_BUBBLE_CSS_BY_ROLE_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function getChatBubbleCssFallback(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return '';
    if (Object.prototype.hasOwnProperty.call(chatBubbleCssMemory, id)) {
        return String(chatBubbleCssMemory[id] || '');
    }
    try {
        const perRoleKey = getChatBubbleCssRoleLsKey(id);
        const perRoleCss = perRoleKey ? localStorage.getItem(perRoleKey) : '';
        if (perRoleCss) {
            chatBubbleCssMemory[id] = perRoleCss;
            return perRoleCss;
        }
    } catch (e0) { }
    const all = readChatBubbleCssByRole();
    const legacyCss = typeof all[id] === 'string' ? all[id] : '';
    if (legacyCss) chatBubbleCssMemory[id] = legacyCss;
    return legacyCss;
}

function saveChatBubbleCssFallback(roleId, cssText) {
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return;
    const text = String(cssText || '');
    if (text) chatBubbleCssMemory[id] = text;
    else delete chatBubbleCssMemory[id];
    if (window.localforage && typeof window.localforage.setItem === 'function') {
        const key = getChatBubbleCssRoleKey(id);
        if (key) {
            const task = text
                ? window.localforage.setItem(key, text)
                : (typeof window.localforage.removeItem === 'function' ? window.localforage.removeItem(key) : window.localforage.setItem(key, ''));
            if (task && typeof task.catch === 'function') task.catch(function () { });
        }
    } else {
        try {
            const perRoleKey = getChatBubbleCssRoleLsKey(id);
            if (perRoleKey) {
                if (text) localStorage.setItem(perRoleKey, text);
                else localStorage.removeItem(perRoleKey);
            }
        } catch (e0) { }
    }
    try {
        const all = readChatBubbleCssByRole();
        delete all[id];
        localStorage.setItem(CHAT_BUBBLE_CSS_BY_ROLE_KEY, JSON.stringify(all));
    } catch (e) { }
}

function hydrateChatBubbleCssForRole(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return Promise.resolve('');
    if (Object.prototype.hasOwnProperty.call(chatBubbleCssMemory, id)) {
        return Promise.resolve(String(chatBubbleCssMemory[id] || ''));
    }
    if (chatBubbleCssHydrating[id]) return chatBubbleCssHydrating[id];
    chatBubbleCssHydrating[id] = (async function () {
        let css = '';
        const key = getChatBubbleCssRoleKey(id);
        if (key && window.localforage && typeof window.localforage.getItem === 'function') {
            try {
                css = await window.localforage.getItem(key) || '';
            } catch (e0) {
                css = '';
            }
        }
        if (!css) {
            css = getChatBubbleCssFallback(id);
        }
        if (!css) {
            try {
                const raw = localStorage.getItem('chat_settings_by_role') || '{}';
                const all = JSON.parse(raw);
                const legacySettings = all && typeof all === 'object' ? all[id] : null;
                css = legacySettings && typeof legacySettings.bubbleCss === 'string' ? legacySettings.bubbleCss : '';
            } catch (e1) {
                css = '';
            }
        }
        if (css) {
            chatBubbleCssMemory[id] = String(css);
            saveChatBubbleCssFallback(id, css);
        }
        delete chatBubbleCssHydrating[id];
        return String(css || '');
    })();
    return chatBubbleCssHydrating[id];
}

function migrateLegacyChatBubbleCssStorage() {
    try {
        const legacyCssByRole = readChatBubbleCssByRole();
        Object.keys(legacyCssByRole).forEach(function (roleId) {
            const css = legacyCssByRole[roleId];
            if (typeof css === 'string' && css) saveChatBubbleCssFallback(roleId, css);
        });
        localStorage.removeItem(CHAT_BUBBLE_CSS_BY_ROLE_KEY);
    } catch (e0) { }

    try {
        const raw = localStorage.getItem('chat_settings_by_role') || '{}';
        const allSettings = JSON.parse(raw);
        if (!allSettings || typeof allSettings !== 'object') return;
        let changed = false;
        Object.keys(allSettings).forEach(function (roleId) {
            const settings = allSettings[roleId];
            if (!settings || typeof settings !== 'object') return;
            if (typeof settings.bubbleCss === 'string' && settings.bubbleCss) {
                saveChatBubbleCssFallback(roleId, settings.bubbleCss);
            }
            if (Object.prototype.hasOwnProperty.call(settings, 'bubbleCss')) {
                delete settings.bubbleCss;
                changed = true;
            }
        });
        if (changed) localStorage.setItem('chat_settings_by_role', JSON.stringify(allSettings));
    } catch (e1) { }
}

setTimeout(migrateLegacyChatBubbleCssStorage, 0);

function readChatBubblePresetsByRole() {
    try {
        const parsed = JSON.parse(localStorage.getItem(CHAT_BUBBLE_PRESETS_BY_ROLE_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function getChatBubblePresets(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return [];
    const all = readChatBubblePresetsByRole();
    return Array.isArray(all[id]) ? all[id].filter(function (item) {
        return item && typeof item === 'object' && typeof item.css === 'string';
    }) : [];
}

function saveChatBubblePresets(roleId, presets) {
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return;
    try {
        const all = readChatBubblePresetsByRole();
        all[id] = Array.isArray(presets) ? presets : [];
        localStorage.setItem(CHAT_BUBBLE_PRESETS_BY_ROLE_KEY, JSON.stringify(all));
    } catch (e) { }
}

function resolveChatSettingsInputRoleId(inputEl) {
    const fromInput = inputEl && inputEl.dataset ? String(inputEl.dataset.roleId || '').trim() : '';
    return resolveChatSettingsRoleId(fromInput);
}

function getCurrentChatSettings(roleId) {
    const allSettingsRaw = localStorage.getItem('chat_settings_by_role') || '{}';
    let allSettings = {};
    try {
        allSettings = JSON.parse(allSettingsRaw);
    } catch (e) {
        allSettings = {};
    }
    const id = resolveChatSettingsRoleId(roleId);
    const settings = allSettings[id] || {};
    if (settings && typeof settings === 'object') {
        const fallbackCss = getChatBubbleCssFallback(id);
        if (fallbackCss) return Object.assign({}, settings, { bubbleCss: fallbackCss });
        if (typeof settings.bubbleCss === 'string' && settings.bubbleCss) return settings;
    }
    return settings;
}

function saveCurrentChatSettings(roleId, settings) {
    const allSettingsRaw = localStorage.getItem('chat_settings_by_role') || '{}';
    let allSettings = {};
    try {
        allSettings = JSON.parse(allSettingsRaw);
    } catch (e) {
        allSettings = {};
    }
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return;
    const nextSettings = Object.assign({}, settings || {});
    if (settings && Object.prototype.hasOwnProperty.call(settings, 'bubbleCss')) {
        saveChatBubbleCssFallback(id, settings.bubbleCss || '');
        delete nextSettings.bubbleCss;
    }
    const merged = Object.assign({}, allSettings[id] || {}, nextSettings);
    if (Object.prototype.hasOwnProperty.call(merged, 'bubbleCss')) {
        delete merged.bubbleCss;
    }
    allSettings[id] = merged;
    Object.keys(allSettings).forEach(function (key) {
        const item = allSettings[key];
        if (!item || typeof item !== 'object') return;
        if (typeof item.bubbleCss === 'string' && item.bubbleCss) {
            saveChatBubbleCssFallback(key, item.bubbleCss);
        }
        if (Object.prototype.hasOwnProperty.call(item, 'bubbleCss')) {
            delete item.bubbleCss;
        }
    });
    localStorage.setItem('chat_settings_by_role', JSON.stringify(allSettings));
}

function persistVisibleChatBubbleCss() {
    const input = document.getElementById('setting-bubble-css');
    if (!input) return false;
    const id = resolveChatSettingsInputRoleId(input);
    if (!id) return false;
    saveCurrentChatSettings(id, { bubbleCss: input.value || '' });
    if (typeof applyChatBubbleCssFromSettings === 'function') {
        applyChatBubbleCssFromSettings(id);
    }
    return true;
}

function notifyChatBubbleAction(text) {
    const message = String(text || '').trim();
    if (!message) return;
    try {
        console.log('[chat-bubble-save]', message);
    } catch (e0) { }
    const status = document.getElementById('chat-bubble-save-status');
    if (status) {
        status.textContent = message;
        status.hidden = false;
        clearTimeout(status.__chatBubbleStatusTimer || 0);
        status.__chatBubbleStatusTimer = setTimeout(function () {
            status.hidden = true;
        }, 1800);
    }
    try {
        if (typeof showTopNotification === 'function') {
            showTopNotification(message);
        }
    } catch (e) { }
}

function getChatBubbleSaveDebugInfo() {
    const input = document.getElementById('setting-bubble-css');
    const menu = document.getElementById('settings-menu-modal');
    const roleId = resolveChatSettingsInputRoleId(input);
    let savedLen = 0;
    let fallbackLen = 0;
    try {
        const settings = roleId ? getCurrentChatSettings(roleId) : {};
        savedLen = settings && typeof settings.bubbleCss === 'string' ? settings.bubbleCss.length : 0;
    } catch (e0) { }
    try {
        fallbackLen = roleId ? String(getChatBubbleCssFallback(roleId) || '').length : 0;
    } catch (e1) { }
    return {
        codeVersion: 'bubble-save-debug-20260426-1',
        hasTextarea: !!input,
        textareaLength: input ? String(input.value || '').length : 0,
        textareaRoleId: input && input.dataset ? String(input.dataset.roleId || '') : '',
        resolvedRoleId: roleId || '',
        currentChatRole: String(window.currentChatRole || ''),
        currentChatId: String(localStorage.getItem('currentChatId') || ''),
        lastChatSettingsRoleId: String(window.__lastChatSettingsRoleId || localStorage.getItem('lastChatSettingsRoleId') || ''),
        modalRoleId: menu && menu.dataset ? String(menu.dataset.roleId || '') : '',
        saveButtonCount: document.querySelectorAll('[data-chat-bubble-action="save"]').length,
        presetButtonCount: document.querySelectorAll('[data-chat-bubble-action="save-preset"]').length,
        savedCssLength: savedLen,
        fallbackCssLength: fallbackLen
    };
}

window.debugChatBubbleSave = function () {
    const info = getChatBubbleSaveDebugInfo();
    try {
        console.table(info);
    } catch (e0) {
        console.log('[chat-bubble-save-debug]', info);
    }
    notifyChatBubbleAction('调试信息已输出到控制台');
    return info;
};

function applyChatBubbleCssFromSettings(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return;
    const settings = getCurrentChatSettings(id);
    const cssText = settings.bubbleCss || '';
    const styleId = `chat-bubble-css-style-${id}`;
    
    const prevActiveId = window._activeChatBubbleStyleId;
    if (prevActiveId && prevActiveId !== styleId) {
        const prevStyleEl = document.getElementById(prevActiveId);
        if (prevStyleEl && prevStyleEl.parentNode) {
            prevStyleEl.parentNode.removeChild(prevStyleEl);
        }
    }
    window._activeChatBubbleStyleId = styleId;

    let styleEl = document.getElementById(styleId);
    const trimmed = String(cssText || '').trim();
    if (!trimmed) {
        if (!chatBubbleCssHydrating[id]) {
            hydrateChatBubbleCssForRole(id).then(function (loadedCss) {
                if (loadedCss) applyChatBubbleCssFromSettings(id);
            });
        }
        if (styleEl && styleEl.parentNode) {
            styleEl.parentNode.removeChild(styleEl);
        }
        return;
    }
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
    }
    document.head.appendChild(styleEl);
    const looksLikeFullCss = /[{}]/.test(trimmed);
    if (looksLikeFullCss) {
        styleEl.textContent = trimmed;
        syncChatBubbleRuntimeFlags(trimmed);
        return;
    }
    styleEl.textContent = `#chat-room-layer .msg-row.msg-plain-bubble .msg-content-wrapper .msg-bubble,
#chat-room-layer .msg-row.msg-plain-bubble .msg-bubble,
.msg-bubble { ${trimmed} }
#chat-room-layer .msg-row.msg-plain-bubble.msg-left .msg-content-wrapper .msg-bubble,
#chat-room-layer .msg-row.msg-plain-bubble.msg-left .msg-bubble,
.msg-left .msg-bubble { ${trimmed} }
#chat-room-layer .msg-row.msg-plain-bubble.msg-right .msg-content-wrapper .msg-bubble,
#chat-room-layer .msg-row.msg-plain-bubble.msg-right .msg-bubble,
.msg-right .msg-bubble { ${trimmed} }`;
    syncChatBubbleRuntimeFlags(trimmed);
}

function syncChatBubbleRuntimeFlags(cssText) {
    const chatRoom = document.getElementById('chat-room-layer');
    if (!chatRoom) return;
    const css = String(cssText || '');
    if (!css.trim()) return;
    const isThemeStudioCss = css.indexOf('--chat-') >= 0 || css.indexOf('msg-plain-bubble') >= 0;
    if (!isThemeStudioCss) return;

    try {
        if (/\.msg-avatar\s*,\s*[\s\S]*?\.msg-avatar-wrap\s*\{[\s\S]*?display\s*:\s*none/i.test(css)) {
            chatRoom.setAttribute('data-chat-avatar', '0');
        } else if (css.indexOf('--chat-avatar-size') >= 0 || css.indexOf('msg-avatar') >= 0) {
            chatRoom.setAttribute('data-chat-avatar', '1');
        }

        if (css.indexOf('[data-chat-ts]') >= 0 || css.indexOf('msg-bubble-time') >= 0) {
            const timestampDisabled = /data-chat-ts[\s\S]*?msg-bubble-time\s*\{[\s\S]*?display\s*:\s*none/i.test(css)
                && css.indexOf('display: block !important') < 0;
            chatRoom.setAttribute('data-chat-ts', timestampDisabled ? '0' : '1');
            if (css.indexOf('right: calc(-46px') >= 0 || css.indexOf('data-chat-tspos') >= 0) {
                chatRoom.setAttribute('data-chat-tspos', 'bubbleRight');
            } else if (css.indexOf('msg-bubble-time') >= 0 && !timestampDisabled) {
                chatRoom.setAttribute('data-chat-tspos', 'bubble');
            } else {
                chatRoom.setAttribute('data-chat-tspos', 'avatar');
            }
        }

        if (css.indexOf('content: "";') >= 0 && css.indexOf('--chat-tail-width') >= 0) {
            chatRoom.setAttribute('data-chat-tail', '1');
        } else if (css.indexOf('--chat-tail-width') >= 0) {
            chatRoom.setAttribute('data-chat-tail', '0');
        }

        if (css.indexOf('msg-status-text') >= 0 || css.indexOf('data-chat-read') >= 0) {
            const readDisabled = /msg-status-text[\s\S]*?\{[\s\S]*?display\s*:\s*none\s*!important/i.test(css);
            chatRoom.setAttribute('data-chat-read', readDisabled ? '0' : '1');
        }

        if (css.indexOf('data-kkt-head') >= 0 || css.indexOf('data-kkt-not-last') >= 0 || css.indexOf('msg-left + .msg-row.msg-left') >= 0) {
            chatRoom.setAttribute('data-chat-kkt', css.indexOf('data-kkt-head') >= 0 ? 'last' : 'first');
        }
    } catch (e) { }
}

function updateBubblePreview() {
    const textarea = document.getElementById('setting-bubble-css');
    const preview = document.getElementById('bubble-preview');
    if (!textarea || !preview) return;
    const cssText = textarea.value || '';
    const trimmed = String(cssText || '').trim();
    if (!trimmed) {
        const left = preview.querySelector('.preview-bubble-left');
        const right = preview.querySelector('.preview-bubble-right');
        if (left) {
            left.setAttribute('style', 'background: #ffffff; padding: 8px 12px; border-radius: 4px; font-size: 14px; max-width: 70%; color: #000;');
        }
        if (right) {
            right.setAttribute('style', 'background: #95ec69; padding: 8px 12px; border-radius: 4px; font-size: 14px; max-width: 70%; color: #000; margin-right:8px;');
        }
        return;
    }
    if (/[{}]/.test(trimmed)) {
        updateFullBubbleCssPreview(preview, trimmed);
        return;
    }
    const temp = document.createElement('div');
    document.body.appendChild(temp);
    temp.setAttribute('style', trimmed);
    const applied = temp.getAttribute('style') || '';
    document.body.removeChild(temp);
    const left = preview.querySelector('.preview-bubble-left');
    const right = preview.querySelector('.preview-bubble-right');
    if (left) left.setAttribute('style', applied);
    if (right) right.setAttribute('style', applied);
}

function readCssVarValue(cssText, name) {
    const escaped = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(cssText || '').match(new RegExp(escaped + '\\s*:\\s*([^;]+);', 'i'));
    return match ? match[1].trim() : '';
}

function updateFullBubbleCssPreview(preview, cssText) {
    const left = preview ? preview.querySelector('.preview-bubble-left') : null;
    const right = preview ? preview.querySelector('.preview-bubble-right') : null;
    if (!left || !right) return;

    const aiBg = readCssVarValue(cssText, '--chat-ai-bubble-bg') || '#ffffff';
    const aiColor = readCssVarValue(cssText, '--chat-ai-bubble-color') || '#000';
    const aiBorder = readCssVarValue(cssText, '--chat-ai-bubble-border') || '1px solid rgba(0,0,0,0.06)';
    const userBg = readCssVarValue(cssText, '--chat-user-bubble-bg') || '#95ec69';
    const userColor = readCssVarValue(cssText, '--chat-user-bubble-color') || '#000';
    const userBorder = readCssVarValue(cssText, '--chat-user-bubble-border') || 'none';
    const padY = readCssVarValue(cssText, '--chat-bubble-pad-y') || '8px';
    const lineHeight = readCssVarValue(cssText, '--chat-bubble-line-height') || '1.4';
    const aiRadius = [
        readCssVarValue(cssText, '--chat-ai-radius-tl') || '12px',
        readCssVarValue(cssText, '--chat-ai-radius-tr') || '12px',
        readCssVarValue(cssText, '--chat-ai-radius-br') || '12px',
        readCssVarValue(cssText, '--chat-ai-radius-bl') || '6px'
    ].join(' ');
    const userRadius = [
        readCssVarValue(cssText, '--chat-user-radius-tl') || '12px',
        readCssVarValue(cssText, '--chat-user-radius-tr') || '12px',
        readCssVarValue(cssText, '--chat-user-radius-br') || '6px',
        readCssVarValue(cssText, '--chat-user-radius-bl') || '12px'
    ].join(' ');

    left.setAttribute('style', 'background: ' + aiBg + '; color: ' + aiColor + '; border: ' + aiBorder + '; padding: ' + padY + ' 12px; border-radius: ' + aiRadius + '; font-size: 14px; max-width: 70%; line-height: ' + lineHeight + '; box-shadow: 0 6px 16px rgba(0,0,0,0.08);');
    right.setAttribute('style', 'background: ' + userBg + '; color: ' + userColor + '; border: ' + userBorder + '; padding: ' + padY + ' 12px; border-radius: ' + userRadius + '; font-size: 14px; max-width: 70%; line-height: ' + lineHeight + '; margin-right:8px; box-shadow: 0 6px 16px rgba(0,0,0,0.08);');
}

function applySavedChatBubbleCss(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return;
    if (window.ThemeStudio && typeof window.ThemeStudio.applyThemeToChat === 'function') {
        const chatRoom = document.getElementById('chat-room-layer');
        if (chatRoom) {
            window.ThemeStudio.applyThemeToChat(id, chatRoom);
        }
    }
    applyChatBubbleCssFromSettings(id);
    if (typeof applyChatFontSizeFromSettings === 'function') {
        applyChatFontSizeFromSettings(id);
    }
}

window.saveChatBubbleStyleFromButton = function () {
    try { console.log('[chat-bubble-save] click save', getChatBubbleSaveDebugInfo()); } catch (e0) { }
    const input = document.getElementById('setting-bubble-css');
    const id = resolveChatSettingsInputRoleId(input);
    if (!input) {
        notifyChatBubbleAction('没有找到气泡 CSS 输入框');
        return;
    }
    if (!id) {
        notifyChatBubbleAction('没有识别到当前角色，请从聊天页重新打开聊天设置');
        return;
    }
    rememberChatSettingsRoleId(id);
    saveCurrentChatSettings(id, { bubbleCss: input.value || '' });
    applySavedChatBubbleCss(id);
    updateBubblePreview();
    renderChatBubblePresetList(id);
    notifyChatBubbleAction('气泡样式已保存');
};

window.saveChatBubblePresetFromButton = function () {
    try { console.log('[chat-bubble-save] click save preset', getChatBubbleSaveDebugInfo()); } catch (e0) { }
    const input = document.getElementById('setting-bubble-css');
    const id = resolveChatSettingsInputRoleId(input);
    if (!input) {
        notifyChatBubbleAction('没有找到气泡 CSS 输入框');
        return;
    }
    if (!id) {
        notifyChatBubbleAction('没有识别到当前角色，请从聊天页重新打开聊天设置');
        return;
    }
    rememberChatSettingsRoleId(id);
    const cssText = String(input.value || '').trim();
    if (!cssText) {
        notifyChatBubbleAction('先粘贴或编辑一段气泡 CSS');
        return;
    }
    let name = '';
    try {
        name = window.prompt('给这个气泡预设取个名字', '气泡预设');
    } catch (e) {
        name = '气泡预设';
    }
    if (name === null) return;
    const presetName = String(name || '').trim() || '气泡预设';
    const presets = getChatBubblePresets(id);
    presets.unshift({
        id: 'bubble_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        name: presetName,
        css: cssText,
        updatedAt: Date.now()
    });
    saveChatBubblePresets(id, presets.slice(0, 30));
    saveCurrentChatSettings(id, { bubbleCss: input.value || '' });
    applySavedChatBubbleCss(id);
    renderChatBubblePresetList(id);
    notifyChatBubbleAction('已保存为预设');
};

window.applyChatBubblePreset = function (presetId) {
    const input = document.getElementById('setting-bubble-css');
    const id = resolveChatSettingsInputRoleId(input);
    if (!input) {
        notifyChatBubbleAction('没有找到气泡 CSS 输入框');
        return;
    }
    if (!id) {
        notifyChatBubbleAction('没有识别到当前角色，请从聊天页重新打开聊天设置');
        return;
    }
    rememberChatSettingsRoleId(id);
    const targetId = String(presetId || '').trim();
    const presets = getChatBubblePresets(id);
    const preset = presets.find(function (item) {
        return String(item && item.id || '') === targetId;
    });
    if (!preset) return;
    input.value = preset.css || '';
    saveCurrentChatSettings(id, { bubbleCss: input.value || '' });
    updateBubblePreview();
    applySavedChatBubbleCss(id);
    renderChatBubblePresetList(id);
};

function bindChatBubbleActionButtonsOnce() {
    if (window.__chatBubbleActionButtonsBound) return;
    window.__chatBubbleActionButtonsBound = true;
    document.addEventListener('click', function (event) {
        const target = event.target && event.target.closest ? event.target.closest('[data-chat-bubble-action]') : null;
        if (!target) return;
        const action = String(target.getAttribute('data-chat-bubble-action') || '').trim();
        if (!action) return;
        event.preventDefault();
        if (action === 'save' && typeof window.saveChatBubbleStyleFromButton === 'function') {
            window.saveChatBubbleStyleFromButton();
            return;
        }
        if (action === 'save-preset' && typeof window.saveChatBubblePresetFromButton === 'function') {
            window.saveChatBubblePresetFromButton();
            return;
        }
        if (action === 'apply-preset' && typeof window.applyChatBubblePreset === 'function') {
            window.applyChatBubblePreset(target.getAttribute('data-preset-id') || '');
        }
    });
}

bindChatBubbleActionButtonsOnce();

function renderChatBubblePresetList(roleId) {
    const box = document.getElementById('chat-bubble-preset-list');
    if (!box) return;
    const id = resolveChatSettingsRoleId(roleId);
    const presets = getChatBubblePresets(id);
    if (!presets.length) {
        box.innerHTML = '<div class="text-[12px] text-gray-400 leading-relaxed">还没有气泡预设。</div>';
        return;
    }
    box.innerHTML = ''
        + '<div class="text-[12px] text-gray-500 mb-2">气泡预设</div>'
        + '<div class="flex flex-wrap gap-2">'
        + presets.map(function (preset) {
            return '<button type="button" class="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-[12px] active:bg-gray-200" data-chat-bubble-action="apply-preset" data-preset-id="' + escapeChatSettingsHtml(String(preset.id || '')) + '">' + escapeChatSettingsHtml(preset.name || '气泡预设') + '</button>';
        }).join('')
        + '</div>';
}

function saveChatSettings() {
    const memoryLimitInput = document.getElementById('setting-memory-limit');
    const momentsPostingSwitch = document.getElementById('setting-moments-posting-enabled');
    const allowOfflineInviteSwitch = document.getElementById('setting-allow-offline-invite');
    const autoTranslateSwitch = document.getElementById('setting-auto-translate-switch');
    const autoSummarySwitch = document.getElementById('setting-auto-summary-switch');
    const memoryArchiveLinesInput = document.getElementById('setting-memory-archive-lines');
    const personalizedSwitch = document.getElementById('setting-personalized-response-switch');
    const replyMaxTokensInput = document.getElementById('setting-reply-max-tokens');
    const busyReplySwitch = document.getElementById('setting-busy-reply-enabled');
    const busyReplyModeInputs = document.querySelectorAll('input[name="setting-busy-reply-mode"]');
    const summaryFreqInput = document.getElementById('setting-summary-freq');
    const fontSizeInput = document.getElementById('setting-font-size');
    const bubbleCssInput = document.getElementById('setting-bubble-css');
    const roleId = resolveChatSettingsInputRoleId(bubbleCssInput);
    const settings = {};
    if (memoryLimitInput) {
        settings.memoryLimit = parseInt(memoryLimitInput.value, 10) || 0;
    }
    if (momentsPostingSwitch) {
        settings.momentsPostingEnabled = !!momentsPostingSwitch.checked;
    }
    if (allowOfflineInviteSwitch) {
        settings.allowOfflineInvite = !!allowOfflineInviteSwitch.checked;
    }
    if (autoTranslateSwitch) {
        settings.autoTranslate = !!autoTranslateSwitch.checked;
    }
    if (autoSummarySwitch) {
        settings.autoSummary = !!autoSummarySwitch.checked;
    }
    if (memoryArchiveLinesInput) {
        settings.memoryArchiveLines = parseInt(memoryArchiveLinesInput.value, 10) || 0;
    }
    if (personalizedSwitch) {
        settings.personalizedResponseEnabled = !!personalizedSwitch.checked;
    }
    if (replyMaxTokensInput) {
        settings.replyMaxTokens = parseInt(replyMaxTokensInput.value, 10) || 0;
    }
    const busyReplyEnabledUi = busyReplySwitch ? !!busyReplySwitch.checked : false;
    if (busyReplySwitch) settings.busyReplyEnabled = busyReplyEnabledUi;
    let busyReplyMode = 'system';
    if (busyReplyModeInputs && busyReplyModeInputs.length) {
        busyReplyModeInputs.forEach(function (input) {
            if (input && input.checked) {
                busyReplyMode = String(input.value || '').trim() === 'auto' ? 'auto' : 'system';
            }
        });
    }
    settings.busyReplyMode = busyReplyMode;
    if (summaryFreqInput) {
        settings.summaryFreq = parseInt(summaryFreqInput.value, 10) || 0;
    }
    if (fontSizeInput) {
        settings.fontSize = parseInt(fontSizeInput.value, 10) || 0;
    }
    if (bubbleCssInput) {
        settings.bubbleCss = bubbleCssInput.value || '';
    }
    saveCurrentChatSettings(roleId, settings);
    if (typeof settings.memoryLimit === 'number' && settings.memoryLimit > 0) {
        localStorage.setItem('chat_memory_limit', String(settings.memoryLimit));
    }
    if (typeof settings.autoSummary === 'boolean') {
        localStorage.setItem('chat_auto_summary', settings.autoSummary ? 'true' : 'false');
    }
    if (typeof settings.summaryFreq === 'number' && settings.summaryFreq > 0) {
        localStorage.setItem('chat_summary_freq', String(settings.summaryFreq));
    }
    if (typeof settings.autoTranslate === 'boolean') {
        localStorage.setItem('chat_auto_translate', settings.autoTranslate ? 'true' : 'false');
    }
    // 先应用基础主题，再注入角色自定义气泡 CSS，避免主题重置清掉导出 CSS 依赖的运行时标记。
    if (window.ThemeStudio && typeof window.ThemeStudio.applyThemeToChat === 'function') {
        const chatRoom = document.getElementById('chat-room-layer');
        if (chatRoom) {
            window.ThemeStudio.applyThemeToChat(roleId, chatRoom);
        }
    }
    applyChatBubbleCssFromSettings(roleId);
    applyChatFontSizeFromSettings(roleId);

    toggleBusyReplyModeBox();
    renderBusyReplyAutoLibraryPanel(roleId);
}

window.__chatSettingsSaveCore = saveChatSettings;
window.__chatSettingsInitCore = initChatSettingsUI;
window.__chatSettingsToggleSummaryCore = toggleSummaryInput;
window.__chatSettingsBubblePreviewCore = updateBubblePreview;

function toggleSummaryInput() {
    const autoSummarySwitch = document.getElementById('setting-auto-summary-switch');
    const box = document.getElementById('setting-summary-freq-box');
    if (!autoSummarySwitch || !box) return;
    if (autoSummarySwitch.checked) {
        box.style.display = 'flex';
    } else {
        box.style.display = 'none';
    }
}

function toggleBusyReplyModeBox() {
    const enabledSwitch = document.getElementById('setting-busy-reply-enabled');
    const box = document.getElementById('setting-busy-reply-mode-box');
    if (!enabledSwitch || !box) return;
    const roleId = resolveChatSettingsRoleId('');
    if (enabledSwitch.checked) {
        box.hidden = false;
    } else {
        box.hidden = true;
    }
    renderBusyReplyAutoLibraryPanel(roleId);
}

function getBusyReplySetting(roleId) {
    const id = roleId || window.currentChatRole || '';
    const settings = getCurrentChatSettings(id);
    const enabled = settings && typeof settings.busyReplyEnabled === 'boolean'
        ? settings.busyReplyEnabled
        : false;
    const mode = settings && String(settings.busyReplyMode || '').trim() === 'auto' ? 'auto' : 'system';
    return {
        enabled: enabled,
        mode: enabled ? mode : 'system'
    };
}

function isBusyReplyEnabled(roleId) {
    return !!getBusyReplySetting(roleId).enabled;
}

function getBusyReplyMode(roleId) {
    return getBusyReplySetting(roleId).mode;
}

function notifyBusyReplyAction(text) {
    const message = String(text || '').trim();
    if (!message) return;
    try {
        if (typeof showTopNotification === 'function') {
            if (showTopNotification.length >= 2) {
                showTopNotification(window.currentChatRole || '', message, 1800);
            } else {
                showTopNotification(message);
            }
            return;
        }
    } catch (e) { }
    try {
        alert(message);
    } catch (e2) { }
}

function setBusyReplyGenerationLoading(isLoading) {
    const loading = !!isLoading;
    const panel = document.getElementById('setting-busy-auto-reply-box');
    const genBtn = document.getElementById('busy-auto-reply-generate-btn');
    const refreshBtn = document.getElementById('busy-auto-reply-refresh-btn');
    if (panel) {
        panel.classList.toggle('busy-auto-reply-loading', loading);
    }
    const setButtonState = function (btn, text, disabled) {
        if (!btn) return;
        if (btn.dataset && !btn.dataset.originalHtml) {
            btn.dataset.originalHtml = btn.innerHTML;
        }
        btn.disabled = !!disabled;
        if (text) {
            btn.innerHTML = text;
        } else if (!disabled && btn.dataset && btn.dataset.originalHtml) {
            btn.innerHTML = btn.dataset.originalHtml;
        }
    };
    if (loading) {
        setButtonState(genBtn, '生成中...', true);
        setButtonState(refreshBtn, '请稍候', true);
    } else {
        if (genBtn && genBtn.dataset && genBtn.dataset.originalHtml) {
            genBtn.innerHTML = genBtn.dataset.originalHtml;
        }
        if (refreshBtn && refreshBtn.dataset && refreshBtn.dataset.originalHtml) {
            refreshBtn.innerHTML = refreshBtn.dataset.originalHtml;
        }
        if (genBtn) genBtn.disabled = false;
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

function getBusyReplyAutoLibrarySetting(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    const settings = getCurrentChatSettings(id);
    const stored = (settings && typeof settings === 'object')
        ? (settings['busyReplyAutoLibrary'] || settings['busyReplyAutoLibrary'.replace('Auto', '')] || null)
        : null;
    return typeof window.normalizeBusyReplyAutoLibrary === 'function'
        ? window.normalizeBusyReplyAutoLibrary(stored)
        : { version: 1, events: {} };
}

function getBusyReplyScheduleEventList(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    const plan = typeof window.getRoleSchedulePlan === 'function'
        ? window.getRoleSchedulePlan(id)
        : null;
    const events = [];
    if (!plan || typeof plan !== 'object') return events;

    if (plan.sleepStart && plan.sleepEnd) {
        events.push({
            eventKey: typeof window.getBusyReplyScheduleEventKey === 'function'
                ? window.getBusyReplyScheduleEventKey('sleep', {
                    sleepStart: plan.sleepStart,
                    sleepEnd: plan.sleepEnd
                })
                : ['sleep', plan.sleepStart, plan.sleepEnd].join('|'),
            kind: 'sleep',
            title: '睡觉时段',
            reason: '睡觉',
            start: String(plan.sleepStart || '').trim(),
            end: String(plan.sleepEnd || '').trim()
        });
    }

    const busyBlocks = Array.isArray(plan.busyBlocks) ? plan.busyBlocks : [];
    busyBlocks.forEach(function (block, index) {
        if (!block || typeof block !== 'object') return;
        const start = String(block.start || '').trim();
        const end = String(block.end || '').trim();
        const reason = String(block.reason || '').trim() || '忙碌';
        events.push({
            eventKey: typeof window.getBusyReplyScheduleEventKey === 'function'
                ? window.getBusyReplyScheduleEventKey('busy', {
                    start: start,
                    end: end,
                    reason: reason
                })
                : ['busy', start, end, reason].join('|'),
            kind: 'busy',
            title: reason || ('忙碌时段 ' + (index + 1)),
            reason: reason,
            start: start,
            end: end
        });
    });

    return events;
}

function getBusyReplyAutoEventList(roleId) {
    const library = getBusyReplyAutoLibrarySetting(roleId);
    const disabledKeys = Array.isArray(library && (library.disabledEventKeys || library.disabledEvents))
        ? (library.disabledEventKeys || library.disabledEvents).map(function (k) { return String(k || '').trim(); }).filter(Boolean)
        : [];
    const disabledMap = {};
    disabledKeys.forEach(function (k) { disabledMap[k] = true; });
    const scheduleEvents = getBusyReplyScheduleEventList(roleId);
    const out = [];
    const seen = {};
    scheduleEvents.forEach(function (event) {
        if (!event || !event.eventKey) return;
        if (disabledMap[String(event.eventKey || '').trim()]) return;
        out.push(event);
        seen[event.eventKey] = true;
    });
    const storedEvents = library && library.events ? library.events : {};
    Object.keys(storedEvents).forEach(function (key) {
        if (seen[key]) return;
        if (disabledMap[String(key || '').trim()]) return;
        const ev = storedEvents[key];
        if (!ev || typeof ev !== 'object') return;
        out.push({
            eventKey: String(key || '').trim(),
            kind: String(ev.kind || '').trim() || 'busy',
            title: String(ev.title || '').trim() || String(ev.reason || '忙碌').trim() || '忙碌',
            reason: String(ev.reason || '').trim() || String(ev.title || '忙碌').trim() || '忙碌',
            start: String(ev.start || '').trim(),
            end: String(ev.end || '').trim()
        });
    });
    return out;
}

function getBusyReplyAutoActiveRoleId(roleId) {
    const explicit = String(roleId || '').trim();
    if (explicit) return resolveChatSettingsRoleId(explicit);
    try {
        const listEl = document.getElementById('setting-busy-auto-reply-list');
        const fromList = listEl && listEl.dataset ? String(listEl.dataset.activeRoleId || '').trim() : '';
        if (fromList) return fromList;
    } catch (e0) { }
    try {
        const panel = document.getElementById('setting-busy-auto-reply-box');
        const fromPanel = panel && panel.dataset ? String(panel.dataset.activeRoleId || '').trim() : '';
        if (fromPanel) return fromPanel;
    } catch (e1) { }
    try {
        const modal = document.getElementById('settings-menu-modal');
        const fromModal = modal && modal.dataset ? String(modal.dataset.roleId || '').trim() : '';
        if (fromModal) return fromModal;
    } catch (e2) { }
    return resolveChatSettingsRoleId('');
}

function buildBusyReplyAutoEntryRowHtml(entry) {
    const src = entry && typeof entry === 'object' ? entry : {};
    const entryId = escapeScheduleParseHtml(String(src.id || ('entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7))));
    const text = escapeScheduleParseHtml(String(src.text || ''));
    const source = escapeScheduleParseHtml(String(src.source || 'user'));
    const createdAt = escapeScheduleParseHtml(String(src.createdAt || Date.now()));
    return [
        '<div class="busy-auto-entry-row" data-entry-id="' + entryId + '" data-entry-source="' + source + '" data-entry-created-at="' + createdAt + '">',
        '<textarea data-busy-auto-entry-text placeholder="请输入自动回复词条">' + text + '</textarea>',
        '<button type="button" class="busy-auto-entry-remove" data-busy-action="remove-entry">删除</button>',
        '</div>'
    ].join('');
}

function findBusyReplyAutoEventCard(eventKey) {
    const key = String(eventKey || '').trim();
    if (!key) return null;
    const listEl = document.getElementById('setting-busy-auto-reply-list');
    if (!listEl) return null;
    const cards = listEl.querySelectorAll('.busy-auto-event-card');
    for (let i = 0; i < cards.length; i += 1) {
        const card = cards[i];
        if (!card) continue;
        if (String(card.dataset.eventKey || '').trim() === key) {
            return card;
        }
    }
    return null;
}

function appendBusyReplyAutoEntryRow(card) {
    if (!card) return null;
    const entryList = card.querySelector('.busy-auto-entry-list');
    if (!entryList) return null;
    const emptyHint = entryList.querySelector('.busy-auto-empty-hint');
    if (emptyHint && emptyHint.parentNode) {
        emptyHint.parentNode.removeChild(emptyHint);
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildBusyReplyAutoEntryRowHtml({
        id: 'entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        text: '',
        source: 'user',
        createdAt: Date.now()
    });
    const row = wrapper.firstElementChild;
    if (!row) return null;
    entryList.appendChild(row);
    const textarea = row.querySelector('textarea[data-busy-auto-entry-text]');
    if (textarea) {
        textarea.focus();
        try { textarea.setSelectionRange(0, 0); } catch (eFocus) { }
    }
    try {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (eScroll) { }
    return row;
}

function addBusyReplyAutoEntry(eventKey, roleId) {
    const activeRoleId = getBusyReplyAutoActiveRoleId(roleId);
    if (!activeRoleId) return false;
    const card = findBusyReplyAutoEventCard(eventKey);
    if (!card) return false;
    appendBusyReplyAutoEntryRow(card);
    return true;
}

function triggerBusyReplyAutoGeneration(eventKey, roleId) {
    const activeRoleId = getBusyReplyAutoActiveRoleId(roleId);
    if (!activeRoleId) return false;
    generateBusyReplyAutoLibrary(activeRoleId, eventKey);
    return true;
}

function removeBusyReplyAutoEvent(eventKey, roleId) {
    const activeRoleId = getBusyReplyAutoActiveRoleId(roleId);
    const key = String(eventKey || '').trim();
    if (!activeRoleId || !key) return false;
    const ok = confirm('确认删除这个自动回复事件，并清空它下面的所有词条？');
    if (!ok) return false;
    const lib = getBusyReplyAutoLibrarySetting(activeRoleId);
    const next = {
        version: 1,
        events: Object.assign({}, (lib && lib.events ? lib.events : {})),
        disabledEventKeys: Array.isArray(lib && (lib.disabledEventKeys || lib.disabledEvents))
            ? (lib.disabledEventKeys || lib.disabledEvents).map(function (k) { return String(k || '').trim(); }).filter(Boolean)
            : []
    };
    if (next.disabledEventKeys.indexOf(key) === -1) {
        next.disabledEventKeys.push(key);
    }
    try { delete next.events[key]; } catch (eDel) { }
    if (typeof window.saveBusyReplyAutoLibrary === 'function') {
        window.saveBusyReplyAutoLibrary(activeRoleId, next);
    } else {
        saveCurrentChatSettings(activeRoleId, { busyReplyAutoLibrary: next });
    }
    renderBusyReplyAutoLibraryPanel(activeRoleId);
    return true;
}

function collectBusyReplyAutoLibraryFromPanel(roleId) {
    const id = getBusyReplyAutoActiveRoleId(roleId);
    const listEl = document.getElementById('setting-busy-auto-reply-list');
    const current = getBusyReplyAutoLibrarySetting(id);
    const preservedDisabled = Array.isArray(current && (current.disabledEventKeys || current.disabledEvents))
        ? (current.disabledEventKeys || current.disabledEvents).map(function (k) { return String(k || '').trim(); }).filter(Boolean)
        : [];
    const next = { version: 1, events: {}, disabledEventKeys: preservedDisabled };
    if (!id || !listEl) return next;
    const cards = listEl.querySelectorAll('.busy-auto-event-card');
    cards.forEach(function (card) {
        if (!card) return;
        const eventKey = String(card.dataset.eventKey || '').trim();
        if (!eventKey) return;
        const kind = String(card.dataset.eventKind || '').trim() || 'busy';
        const title = String(card.dataset.eventTitle || '').trim() || '忙碌';
        const reason = String(card.dataset.eventReason || '').trim() || title;
        const start = String(card.dataset.eventStart || '').trim();
        const end = String(card.dataset.eventEnd || '').trim();
        const rows = card.querySelectorAll('.busy-auto-entry-row');
        const entries = [];
        rows.forEach(function (row) {
            if (!row) return;
            const textarea = row.querySelector('textarea[data-busy-auto-entry-text]');
            const text = textarea ? String(textarea.value || '').trim() : '';
            if (!text) return;
            const entryId = String(row.dataset.entryId || '').trim();
            entries.push({
                id: entryId,
                text: text,
                source: String(row.dataset.entrySource || 'user'),
                createdAt: Number(row.dataset.entryCreatedAt) || Date.now(),
                updatedAt: Date.now()
            });
        });
        next.events[eventKey] = {
            eventKey: eventKey,
            kind: kind,
            title: title,
            reason: reason,
            start: start,
            end: end,
            updatedAt: Date.now(),
            entries: entries
        };
    });
    return next;
}

function saveBusyReplyAutoLibraryFromPanel(roleId) {
    const id = getBusyReplyAutoActiveRoleId(roleId);
    if (!id) return null;
    const next = collectBusyReplyAutoLibraryFromPanel(id);
    if (typeof window.saveBusyReplyAutoLibrary === 'function') {
        return window.saveBusyReplyAutoLibrary(id, next);
    }
    saveCurrentChatSettings(id, { busyReplyAutoLibrary: next });
    return next;
}

function renderBusyReplyAutoLibraryPanel(roleId) {
    const id = getBusyReplyAutoActiveRoleId(roleId);
    const panel = document.getElementById('setting-busy-auto-reply-box');
    const listEl = document.getElementById('setting-busy-auto-reply-list');
    if (!panel || !listEl) return;
    const enabledSwitch = document.getElementById('setting-busy-reply-enabled');
    const modeInputs = document.querySelectorAll('input[name="setting-busy-reply-mode"]');
    const enabledFromUi = enabledSwitch ? !!enabledSwitch.checked : null;
    let modeFromUi = null;
    if (modeInputs && modeInputs.length) {
        modeInputs.forEach(function (input) {
            if (!input || !input.checked) return;
            modeFromUi = String(input.value || '').trim() === 'auto' ? 'auto' : 'system';
        });
    }
    const enabled = enabledFromUi == null ? isBusyReplyEnabled(id) : enabledFromUi;
    const mode = modeFromUi == null ? getBusyReplyMode(id) : modeFromUi;
    const show = enabled && mode === 'auto';
    panel.hidden = !show;
    if (!show) {
        try { panel.dataset.activeRoleId = ''; } catch (e00) { }
        try { listEl.dataset.activeRoleId = ''; } catch (e0) { }
        return;
    }

    if (!id) {
        try { panel.dataset.activeRoleId = ''; } catch (e10) { }
        try { listEl.dataset.activeRoleId = ''; } catch (e0) { }
        listEl.innerHTML = '<div class="busy-auto-empty-hint">当前未绑定聊天对象，无法生成词条。请从聊天页打开设置。</div>';
        return;
    }
    try { panel.dataset.activeRoleId = String(id || '').trim(); } catch (e11) { }
    try { listEl.dataset.activeRoleId = String(id || '').trim(); } catch (e1) { }

    const library = getBusyReplyAutoLibrarySetting(id);
    const events = getBusyReplyAutoEventList(id);
    const eventMap = library && library.events ? library.events : {};
    const mergedEvents = events.map(function (event) {
        const stored = eventMap[event.eventKey] && typeof eventMap[event.eventKey] === 'object'
            ? eventMap[event.eventKey]
            : null;
        return {
            eventKey: event.eventKey,
            kind: event.kind,
            title: event.title,
            reason: event.reason,
            start: event.start,
            end: event.end,
            entries: stored && Array.isArray(stored.entries)
                ? stored.entries
                : []
        };
    });

    listEl.innerHTML = mergedEvents.map(function (event) {
        const title = escapeScheduleParseHtml(event.title || '忙碌');
        const reason = escapeScheduleParseHtml(event.reason || '');
        const timeText = escapeScheduleParseHtml((event.start || event.end) ? ((event.start || '--') + ' - ' + (event.end || '--')) : '');
        const entries = Array.isArray(event.entries) ? event.entries : [];
        const entryHtml = entries.length ? entries.map(function (entry, index) {
            const entryObj = typeof window.normalizeBusyReplyAutoLibrary === 'function'
                ? window.normalizeBusyReplyAutoLibrary({ events: { temp: { entries: [entry] } } }).events.temp.entries[0]
                : null;
            return buildBusyReplyAutoEntryRowHtml(entryObj || {
                id: String(entry && entry.id || ('entry_' + index)),
                text: String(entry && entry.text || ''),
                source: String(entry && entry.source || 'user'),
                createdAt: Number(entry && entry.createdAt) || Date.now()
            });
        }).join('') : '<div class="busy-auto-empty-hint">还没有词条，先点生成或手动添加。</div>';
        return [
            '<div class="busy-auto-event-card" data-event-key="' + escapeScheduleParseHtml(event.eventKey || '') + '" data-event-kind="' + escapeScheduleParseHtml(event.kind || '') + '" data-event-title="' + title + '" data-event-reason="' + reason + '" data-event-start="' + escapeScheduleParseHtml(event.start || '') + '" data-event-end="' + escapeScheduleParseHtml(event.end || '') + '">',
            '<div class="busy-auto-event-head">',
            '<div>',
            '<div class="busy-auto-event-title">' + title + '</div>',
            '<div class="busy-auto-event-meta">' + (timeText || '无时间') + (reason ? (' · ' + reason) : '') + '</div>',
            '</div>',
            '<div class="busy-auto-event-actions">',
            '<button type="button" class="busy-auto-event-btn" data-busy-action="generate-event" onclick="event.stopPropagation(); triggerBusyReplyAutoGeneration(' + JSON.stringify(String(event.eventKey || '')) + ');">重新生成</button>',
            '<button type="button" class="busy-auto-event-btn" data-busy-action="add-entry" onclick="event.stopPropagation(); addBusyReplyAutoEntry(' + JSON.stringify(String(event.eventKey || '')) + ');">+ 添加词条</button>',
            '<button type="button" class="busy-auto-event-btn" data-busy-action="remove-event" onclick="event.stopPropagation(); removeBusyReplyAutoEvent(' + JSON.stringify(String(event.eventKey || '')) + ');">删除事件</button>',
            '</div>',
            '</div>',
            '<div class="busy-auto-entry-list">' + entryHtml + '</div>',
            '</div>'
        ].join('');
    }).join('') || '<div class="busy-auto-empty-hint">当前没有可用的作息事件，请先解析作息表。</div>';

    if (listEl.dataset.bound !== '1') {
        listEl.dataset.bound = '1';
        const readActiveRoleId = function () {
            return getBusyReplyAutoActiveRoleId('');
        };
        listEl.addEventListener('click', function (e) {
            const target = e.target && e.target.closest ? e.target.closest('[data-busy-action]') : null;
            if (!target) return;
            const action = String(target.dataset.busyAction || '').trim();
            const card = target.closest('.busy-auto-event-card');
            const eventKey = card ? String(card.dataset.eventKey || '').trim() : '';
            if (!eventKey) return;
            const activeRoleId = readActiveRoleId();
            if (!activeRoleId) return;
            if (action === 'add-entry') {
                appendBusyReplyAutoEntryRow(card);
                return;
            }
            if (action === 'remove-event') {
                removeBusyReplyAutoEvent(eventKey, activeRoleId);
                return;
            }
            if (action === 'remove-entry') {
                const row = target.closest('.busy-auto-entry-row');
                if (!row) return;
                const next = collectBusyReplyAutoLibraryFromPanel(activeRoleId);
                const event = next.events[eventKey];
                if (!event || !Array.isArray(event.entries)) return;
                const entryId = String(row.dataset.entryId || '').trim();
                event.entries = event.entries.filter(function (entry) {
                    return String(entry && entry.id || '') !== entryId;
                });
                if (typeof window.saveBusyReplyAutoLibrary === 'function') {
                    window.saveBusyReplyAutoLibrary(activeRoleId, next);
                } else {
                    saveCurrentChatSettings(activeRoleId, { busyReplyAutoLibrary: next });
                }
                renderBusyReplyAutoLibraryPanel(activeRoleId);
                return;
            }
            if (action === 'generate-event') {
                generateBusyReplyAutoLibrary(activeRoleId, eventKey);
            }
        });
        listEl.addEventListener('input', function () {
            const activeRoleId = readActiveRoleId();
            if (!activeRoleId) return;
            saveBusyReplyAutoLibraryFromPanel(activeRoleId);
        });
        listEl.addEventListener('change', function () {
            const activeRoleId = readActiveRoleId();
            if (!activeRoleId) return;
            saveBusyReplyAutoLibraryFromPanel(activeRoleId);
        });
    }
}

function renderBusyReplyAutoLibraryVisibility(roleId) {
    renderBusyReplyAutoLibraryPanel(roleId);
}

function getBusyReplyAutoGenerationPrompt(roleId, events, library) {
    const id = resolveChatSettingsRoleId(roleId);
    const profile = (window.charProfiles && window.charProfiles[id] && typeof window.charProfiles[id] === 'object')
        ? window.charProfiles[id]
        : {};
    const plan = typeof window.getRoleSchedulePlan === 'function' ? window.getRoleSchedulePlan(id) : null;
    const worldbookPrompt = typeof window.buildWorldBookPrompt === 'function' && profile.worldbookId
        ? window.buildWorldBookPrompt(profile.worldbookId)
        : '';
    const currentLib = library && library.events ? library.events : {};
    const eventLines = (events || []).map(function (event) {
        return [
            '- eventKey: ' + event.eventKey,
            '  kind: ' + event.kind,
            '  title: ' + event.title,
            '  reason: ' + event.reason,
            '  time: ' + (event.start || '--') + ' - ' + (event.end || '--')
        ].join('\n');
    }).join('\n');
    const existingLines = Object.keys(currentLib).map(function (key) {
        const ev = currentLib[key];
        const entryCount = Array.isArray(ev && ev.entries) ? ev.entries.length : 0;
        return '- ' + key + ' / ' + String(ev && ev.title || '') + ' / existing=' + String(entryCount);
    }).join('\n');
    const busyRows = plan && Array.isArray(plan.busyBlocks) ? plan.busyBlocks.map(function (block, index) {
        if (!block || typeof block !== 'object') return '';
        return (index + 1) + '. ' + String(block.start || '--') + ' - ' + String(block.end || '--') + ' / ' + String(block.reason || '忙碌');
    }).filter(Boolean).join('\n') : '';
    return [
        '你现在要批量生成“忙时自动回复词条”。',
        '要求：',
        '1. 每个事件至少生成 2 条，建议 3 到 5 条。',
        '2. 必须使用第一人称，口吻自然、像角色本人真的在聊天框里临时回消息。',
        '3. 不要输出 [自动回复] 前缀，运行时会自动加。',
        '4. 不要输出 Markdown、解释、编号说明之外的文字，只输出严格 JSON。',
        '5. 如果事件已经有旧词条，请避免重复，尽量生成新的表达。',
        '6. 不要写客服式、机器人式套话，不要只写“我在忙”“稍后回复”“晚点聊”这种空泛句子。',
        '7. 每条都要带出角色口吻、情绪、习惯用语或说话节奏，但不能脱离角色设定。',
        '8. 要让人一眼感觉这是这个角色本人发出来的，不是通用模板。',
        '9. 同一事件里的词条彼此要有明显区别，不能只是换几个近义词。',
        '10. 必须覆盖我给你的每一个 eventKey，一个都不能漏。',
        '输出格式必须固定为：{"events":[{"eventKey":"...","entries":["...","..."]}]}',
        '',
        '【角色信息】',
        '角色名称：' + String(profile.nickName || profile.name || profile.remark || id || 'TA'),
        '角色备注：' + String(profile.remark || ''),
        '角色人设：' + String(profile.desc || ''),
        '聊天风格：' + String(profile.style || ''),
        '作息原文：' + String(profile.schedule || ''),
        '作息解析：' + (plan && plan.summary ? String(plan.summary) : ''),
        '结构化作息：' + (busyRows || '(无)'),
        '世界书：' + String(worldbookPrompt || ''),
        '',
        '【当前要生成的事件列表】',
        eventLines || '(无)',
        '',
        '【已有词条概要】',
        existingLines || '(无)',
        '',
        '请严格根据上面的角色信息、世界书和作息来写，不要脱离角色。',
        '把每一条都当成“用户刚刚发来消息后，角色在当前场景下会顺手回的一句真话”。',
        '宁可更像真人聊天，也不要写成统一模板。'
    ].join('\n');
}

function parseBusyReplyGenerationResult(text) {
    const parsed = parseLooseJsonFromText(text);
    return parsed && typeof parsed === 'object' ? parsed : null;
}

function normalizeBusyReplyAutoEntryLocal(entry) {
    if (entry == null) return null;
    const src = typeof entry === 'string' ? { text: entry } : (typeof entry === 'object' ? entry : null);
    if (!src) return null;
    const text = String(src.text || src.content || src.reply || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    return {
        id: String(src.id || ('entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7))),
        text: text,
        source: String(src.source || 'user'),
        createdAt: Number(src.createdAt) || Date.now(),
        updatedAt: Number(src.updatedAt) || Date.now()
    };
}

function inferBusyReplyFallbackTone(profile) {
    const desc = String(profile && profile.desc || '').trim();
    const style = String(profile && profile.style || '').trim();
    const text = (desc + '\n' + style).toLowerCase();
    if (/傲娇|嘴硬/.test(text)) return 'tsundere';
    if (/高冷|冷淡|冷静|疏离|克制/.test(text)) return 'cool';
    if (/强势|霸道|占有|掌控/.test(text)) return 'assertive';
    if (/温柔|体贴|治愈|软|甜|奶|可爱|黏|乖/.test(text)) return 'gentle';
    return 'natural';
}

function buildBusyReplyAutoFallbackEntries(event, profile) {
    const src = event && typeof event === 'object' ? event : {};
    const tone = inferBusyReplyFallbackTone(profile);
    const kind = String(src.kind || '').trim() === 'sleep' ? 'sleep' : 'busy';
    const reason = String(src.reason || src.title || (kind === 'sleep' ? '睡觉' : '忙碌')).trim() || (kind === 'sleep' ? '睡觉' : '忙碌');
    const returnText = kind === 'sleep'
        ? (typeof window.formatScheduleClockForDisplay === 'function' ? window.formatScheduleClockForDisplay(src.end || '') : String(src.end || '').trim())
        : (typeof window.formatScheduleClockForDisplay === 'function' ? window.formatScheduleClockForDisplay(src.end || '') : String(src.end || '').trim());
    const toneMap = {
        gentle: kind === 'sleep'
            ? [
                '我已经缩进被子里了，等我睡醒再好好回你。',
                '先让我补一觉，醒来第一时间看你的消息。'
            ]
            : [
                '我这会儿正卡在' + reason + '里，等我腾出手就回你。',
                '先让我把' + reason + '处理完，我不想随便敷衍你。'
            ],
        cool: kind === 'sleep'
            ? [
                '我已经睡了，醒来再回。',
                '先放着，等我睡醒再看。'
            ]
            : [
                '我现在在处理' + reason + '，晚点回你。',
                '这会儿抽不开身，等' + (returnText || '忙完') + '再说。'
            ],
        tsundere: kind === 'sleep'
            ? [
                '我都已经躺下了，你还来找我，醒了再说。',
                '先让我睡，等我醒了再回你，也不是不理你。'
            ]
            : [
                '我正被' + reason + '绊住呢，哪有空立刻回你。',
                '先等我把' + reason + '弄完，再来跟你说。'
            ],
        assertive: kind === 'sleep'
            ? [
                '我先睡，等我醒了会找你。',
                '先别催，我睡醒之后自然会回。'
            ]
            : [
                '我现在正忙' + reason + '，等我结束了再回你。',
                '先让我把' + reason + '收尾，处理完我就来找你。'
            ],
        natural: kind === 'sleep'
            ? [
                '我这会儿已经睡下了，醒来再慢慢回你。',
                '先让我补个觉，等我醒了就看消息。'
            ]
            : [
                '我现在正卡在' + reason + '里，等我缓过来就回你。',
                '先让我把' + reason + '处理完，我一会儿再认真跟你聊。'
            ]
    };
    const lines = toneMap[tone] || toneMap.natural;
    if (returnText && kind === 'busy') {
        lines.push('我大概' + returnText + '之后能看手机，到时候回你。');
    }
    return lines.map(function (text) {
        return normalizeBusyReplyAutoText(text);
    }).filter(Boolean);
}

function generateBusyReplyAutoLibrary(roleId, targetEventKey) {
    const id = getBusyReplyAutoActiveRoleId(roleId);
    if (!id) return;
    const events = getBusyReplyAutoEventList(id);
    const eventList = targetEventKey ? events.filter(function (event) {
        return String(event.eventKey || '') === String(targetEventKey || '');
    }) : events;
    if (!eventList.length) {
        notifyBusyReplyAction('先解析作息后再生成词条。');
        return;
    }
    if (typeof window.callAI !== 'function') {
        notifyBusyReplyAction('当前没有可用的大模型接口。');
        return;
    }
    const library = getBusyReplyAutoLibrarySetting(id);
    const systemPrompt = typeof window.buildToolJsonPrompt === 'function'
        ? window.buildToolJsonPrompt('busy_auto_reply_generation', {
            sceneIntro: '当前任务是根据角色设定、世界书和作息事件，生成忙时自动回复词条。',
            taskGuidance: [
                '你不是客服模板生成器，也不是通知文案生成器。',
                '你要写的是角色本人在聊天界面里会发出来的简短回复。',
                '必须让每个事件的词条都带有鲜明角色口吻，不要写空泛套话。'
            ].join('\n'),
            outputInstructions: '只输出严格 JSON：{"events":[{"eventKey":"...","entries":["...","..."]}]}，不要输出解释、Markdown 或额外文字。'
        })
        : '你是一个自动回复词条生成器。你不是客服模板生成器。只输出严格 JSON，不要输出任何解释或 Markdown。';
    const userPrompt = getBusyReplyAutoGenerationPrompt(id, eventList, library);
    setBusyReplyGenerationLoading(true);
    const prevRoleId = window.currentChatRole;
    window.currentChatRole = id;
    try {
        window.callAI(systemPrompt, [], userPrompt, function (resultText) {
            try {
                const parsed = parseBusyReplyGenerationResult(resultText);
                const produced = parsed && Array.isArray(parsed.events) ? parsed.events : [];
                const next = getBusyReplyAutoLibrarySetting(id);
                const profile = (window.charProfiles && window.charProfiles[id] && typeof window.charProfiles[id] === 'object')
                    ? window.charProfiles[id]
                    : {};
                eventList.forEach(function (event) {
                    if (!event || !event.eventKey) return;
                    const existing = next.events[event.eventKey] && Array.isArray(next.events[event.eventKey].entries)
                        ? next.events[event.eventKey].entries.slice()
                        : [];
                    const hit = produced.find(function (item) {
                        return String(item && item.eventKey || '') === String(event.eventKey || '');
                    });
                    const generatedTexts = Array.isArray(hit && (hit.entries || hit.replies || hit.items))
                        ? (hit.entries || hit.replies || hit.items)
                        : [];
                    const merged = [];
                    const seen = {};
                    existing.forEach(function (item) {
                        const normalized = normalizeBusyReplyAutoEntryLocal(item);
                        const text = normalized ? normalized.text : normalizeBusyReplyAutoText(item && item.text ? item.text : item);
                        if (!text || seen[text]) return;
                        seen[text] = true;
                        merged.push(normalized || {
                            id: 'entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
                            text: text,
                            source: String(item && item.source || 'user'),
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        });
                    });
                    generatedTexts.forEach(function (item) {
                        const normalized = normalizeBusyReplyAutoEntryLocal(item);
                        const text = normalized ? normalized.text : normalizeBusyReplyAutoText(item && item.text ? item.text : item);
                        if (!text || seen[text]) return;
                        seen[text] = true;
                        merged.push(normalized || {
                            id: 'entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
                            text: text,
                            source: 'ai',
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        });
                    });
                    if (!merged.length) {
                        buildBusyReplyAutoFallbackEntries(event, profile).forEach(function (text) {
                            if (!text || seen[text]) return;
                            seen[text] = true;
                            merged.push({
                                id: 'entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
                                text: text,
                                source: 'ai_fallback',
                                createdAt: Date.now(),
                                updatedAt: Date.now()
                            });
                        });
                    }
                    next.events[event.eventKey] = {
                        eventKey: event.eventKey,
                        kind: event.kind,
                        title: event.title,
                        reason: event.reason,
                        start: event.start,
                        end: event.end,
                        updatedAt: Date.now(),
                        entries: merged
                    };
                });
                if (typeof window.saveBusyReplyAutoLibrary === 'function') {
                    window.saveBusyReplyAutoLibrary(id, next);
                } else {
                    saveCurrentChatSettings(id, { busyReplyAutoLibrary: next });
                }
                renderBusyReplyAutoLibraryPanel(id);
                notifyBusyReplyAction(produced.length ? '自动回复词条已生成。' : 'AI 返回格式不完整，已用角色化后备词条补齐。');
            } finally {
                setBusyReplyGenerationLoading(false);
            }
        }, function () {
            setBusyReplyGenerationLoading(false);
            notifyBusyReplyAction('生成失败，请检查 API 配置。');
        });
    } catch (e) {
        setBusyReplyGenerationLoading(false);
        notifyBusyReplyAction('生成失败，请检查 API 配置。');
    } finally {
        window.currentChatRole = prevRoleId;
    }
}

function escapeScheduleParseHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getScheduleParserConfig(prefix) {
    const safe = String(prefix || 'creator').trim() === 'editor' ? 'editor' : 'creator';
    return safe === 'editor'
        ? { prefix: 'editor', textareaId: 'edit-ai-schedule', panelId: 'edit-schedule-parse-panel' }
        : { prefix: 'creator', textareaId: 'ai-schedule', panelId: 'creator-schedule-parse-panel' };
}

function ensureScheduleParsePlan(plan, rawText) {
    const src = plan && typeof plan === 'object' ? plan : {};
    const sleep = src.sleep && typeof src.sleep === 'object' ? src.sleep : {};
    const resolvedSleepStart = String(
        (src.sleepStart != null ? src.sleepStart : (sleep.start != null ? sleep.start : sleep.sleepStart))
        || src.sleepBegin
        || src.sleepFrom
        || ''
    ).trim();
    const resolvedSleepEnd = String(
        (src.sleepEnd != null ? src.sleepEnd : (sleep.end != null ? sleep.end : sleep.sleepEnd))
        || src.sleepFinish
        || src.sleepTo
        || ''
    ).trim();
    const busyBlocks = Array.isArray(src.busyBlocks)
        ? src.busyBlocks
        : (Array.isArray(src.blocks) ? src.blocks : []);
    return {
        rawText: String(src.rawText || rawText || ''),
        sleepStart: resolvedSleepStart,
        sleepEnd: resolvedSleepEnd,
        busyBlocks: busyBlocks.map(function (block) {
            if (!block || typeof block !== 'object') return null;
            const start = String(block.start || block.startTime || block.startText || block.from || block.begin || '').trim();
            const end = String(block.end || block.endTime || block.endText || block.to || block.finish || '').trim();
            const reason = String(block.reason || block.title || block.label || block.name || '').trim();
            const source = String(block.source || 'explicit').trim() || 'explicit';
            const isUiPlaceholder = source === 'ui';
            if (!start && !end && !reason && !isUiPlaceholder) return null;
            return {
                start: start,
                end: end,
                reason: reason,
                source: source,
                sourceText: String(block.sourceText || block.rawText || block.raw || '').trim()
            };
        }).filter(Boolean),
        notes: String(src.notes || '').trim(),
        confidence: Number.isFinite(Number(src.confidence)) ? Math.max(0, Math.min(1, Number(src.confidence))) : 0,
        summary: String(src.summary || '').trim(),
        updatedAt: Number(src.updatedAt) || Date.now()
    };
}

function getScheduleParseEmptyPlan(rawText) {
    return ensureScheduleParsePlan({
        rawText: String(rawText || ''),
        sleepStart: '',
        sleepEnd: '',
        busyBlocks: [],
        notes: '',
        confidence: 0,
        summary: String(rawText || '').trim() ? '先选择 AI 解析或自动解析，再在这里继续调整。' : '先输入作息文本，再选择解析方式。',
        updatedAt: Date.now()
    }, rawText);
}

function notifyScheduleParseAction(text) {
    const message = String(text || '').trim();
    if (!message) return;
    try {
        if (typeof showTopNotification === 'function') {
            if (showTopNotification.length >= 2) {
                showTopNotification(window.currentChatRole || '', message, 1800);
            } else {
                showTopNotification(message);
            }
            return;
        }
    } catch (e) { }
    try {
        alert(message);
    } catch (e2) { }
}

function setScheduleParseLoading(prefix, mode, loading) {
    const cfg = getScheduleParserConfig(prefix);
    const panel = document.getElementById(cfg.panelId);
    if (!panel) return;
    const generateBtn = panel.querySelector('[data-schedule-click="generate-schedule"]');
    const aiBtn = panel.querySelector('[data-schedule-click="ai-parse"]');
    const autoBtn = panel.querySelector('[data-schedule-click="auto-parse"]');
    const statusEl = panel.querySelector('[data-schedule-parse-status]');
    const isLoading = !!loading;
    panel.classList.toggle('is-loading', isLoading);
    const setBtn = function (btn, text, disabled) {
        if (!btn) return;
        btn.disabled = !!disabled;
        if (text) {
            const label = btn.querySelector('.schedule-parse-action-btn-title');
            const sub = btn.querySelector('.schedule-parse-action-btn-sub');
            if (label) label.textContent = text;
            if (sub) sub.textContent = disabled ? '请稍候...' : sub.textContent;
        }
    };
    if (isLoading) {
        if (statusEl) {
            statusEl.textContent = mode === 'generate'
                ? 'AI 正在生成人设作息...'
                : (mode === 'ai' ? 'AI 正在解析作息...' : '正在自动解析作息...');
            statusEl.hidden = false;
        }
        setBtn(generateBtn, '生成中', true);
        setBtn(aiBtn, 'AI解析中', true);
        setBtn(autoBtn, '自动解析中', true);
    } else {
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.hidden = true;
        }
        if (generateBtn) {
            generateBtn.disabled = false;
            const label = generateBtn.querySelector('.schedule-parse-action-btn-title');
            const sub = generateBtn.querySelector('.schedule-parse-action-btn-sub');
            if (label) label.textContent = '生成作息表';
            if (sub) sub.textContent = '消耗一次API，按人设生成并解析';
        }
        if (aiBtn) {
            aiBtn.disabled = false;
            const label = aiBtn.querySelector('.schedule-parse-action-btn-title');
            const sub = aiBtn.querySelector('.schedule-parse-action-btn-sub');
            if (label) label.textContent = 'AI解析';
            if (sub) sub.textContent = '消耗一次API，解析更精准';
        }
        if (autoBtn) {
            autoBtn.disabled = false;
            const label = autoBtn.querySelector('.schedule-parse-action-btn-title');
            const sub = autoBtn.querySelector('.schedule-parse-action-btn-sub');
            if (label) label.textContent = '自动解析';
            if (sub) sub.textContent = '不消耗API，准确度较低';
        }
    }
}

function parseSchedulePlanFromAiText(text, rawText) {
    const parsed = parseLooseJsonFromText(text);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed.plan && typeof parsed.plan === 'object'
        ? parsed.plan
        : (parsed.result && typeof parsed.result === 'object' ? parsed.result : parsed);
    return ensureScheduleParsePlan(candidate, rawText);
}

function parseLooseJsonFromText(text) {
    let raw = String(text || '').replace(/^\uFEFF/, '').trim();
    if (!raw) return null;
    raw = raw.replace(/```[a-z0-9]*\s*/gi, '').trim();
    let candidate = raw;
    const firstObj = candidate.indexOf('{');
    const lastObj = candidate.lastIndexOf('}');
    const firstArr = candidate.indexOf('[');
    const lastArr = candidate.lastIndexOf(']');
    if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr && (firstObj === -1 || firstArr < firstObj)) {
        candidate = candidate.slice(firstArr, lastArr + 1);
    } else if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
        candidate = candidate.slice(firstObj, lastObj + 1);
    }
    candidate = candidate.replace(/,\s*([}\]])/g, '$1').trim();
    try {
        return JSON.parse(candidate);
    } catch (e) {
        return null;
    }
}

function getScheduleParseAiPrompt(roleId, rawText) {
    return [
        '你是一个作息表解析器，只输出严格 JSON，不要输出任何解释、Markdown 或代码块。',
        '请从用户给出的作息文本里解析出睡眠时间和忙碌时段。',
        '输出结构必须固定为：{"sleepStart":"HH:MM","sleepEnd":"HH:MM","busyBlocks":[{"start":"HH:MM","end":"HH:MM","reason":"事件名称"}],"notes":"可选备注","confidence":0.0,"summary":"一句话概括"}',
        '规则：',
        '1. busyBlocks 至少尽量找出能明确识别的时段，无法识别时就留空数组。',
        '2. 时间统一用 24 小时制 HH:MM。',
        '3. reason 请写成事件名称，例如 上班、开会、上课、通勤、健身。',
        '4. 如果只知道大概时间，也请尽量给出最合理的结果。',
        '5. 不要输出多余字段，不要输出说明文字。',
        '',
        '【需要解析的作息文本】',
        String(rawText || '').trim() || '(空)',
        '',
        '请直接输出 JSON。'
    ].join('\n');
}

function collectScheduleGeneratorWorldBookIds(prefix) {
    const safePrefix = String(prefix || 'creator').trim() === 'editor' ? 'editor' : 'creator';
    const containerId = safePrefix === 'editor' ? 'edit-ai-worldbook-container' : 'ai-worldbook-container';
    const container = document.getElementById(containerId);
    if (!container) return [];
    const checked = container.querySelectorAll('input[name="wb-checkbox"]:checked');
    return Array.from(checked).map(function (input) {
        return String(input && input.value || '').trim();
    }).filter(Boolean);
}

function readScheduleGeneratorContext(prefix) {
    const safePrefix = String(prefix || 'creator').trim() === 'editor' ? 'editor' : 'creator';
    const roleId = safePrefix === 'editor' ? String(window.currentChatRole || '').trim() : '';
    const profile = roleId && window.charProfiles && window.charProfiles[roleId] && typeof window.charProfiles[roleId] === 'object'
        ? window.charProfiles[roleId]
        : {};
    const textareaId = safePrefix === 'editor' ? 'edit-ai-schedule' : 'ai-schedule';
    const nameId = safePrefix === 'editor' ? 'edit-ai-name' : 'ai-name';
    const remarkId = safePrefix === 'editor' ? 'edit-ai-remark' : '';
    const descId = safePrefix === 'editor' ? 'edit-ai-personality' : 'ai-personality';
    const styleId = safePrefix === 'editor' ? 'edit-ai-style' : 'ai-style';
    const textarea = document.getElementById(textareaId);
    const nameEl = document.getElementById(nameId);
    const remarkEl = remarkId ? document.getElementById(remarkId) : null;
    const descEl = document.getElementById(descId);
    const styleEl = document.getElementById(styleId);
    const worldbookIds = collectScheduleGeneratorWorldBookIds(safePrefix);
    const worldbookPrompt = typeof window.buildWorldBookPrompt === 'function'
        ? window.buildWorldBookPrompt(worldbookIds)
        : '';
    return {
        prefix: safePrefix,
        roleId: roleId,
        textarea: textarea,
        name: String(nameEl && nameEl.value || profile.nickName || profile.name || roleId || 'TA').trim(),
        remark: String(remarkEl && remarkEl.value || profile.remark || '').trim(),
        desc: String(descEl && descEl.value || profile.desc || '').trim(),
        style: String(styleEl && styleEl.value || profile.style || '').trim(),
        scheduleText: String(textarea && textarea.value || profile.schedule || '').trim(),
        worldbookPrompt: String(worldbookPrompt || '').trim(),
        worldbookIds: worldbookIds
    };
}

function getScheduleDraftGenerationPrompt(prefix) {
    const ctx = readScheduleGeneratorContext(prefix);
    return [
        '你现在要为一个聊天角色生成“日常作息表”，并同时给出结构化解析结果。',
        '要求：',
        '1. 作息必须贴合角色人设、聊天风格和世界书，不要写成普通学生/普通上班族通用模板。',
        '2. 时间安排要自然可信，必须包含睡眠时段，并且 busyBlocks 至少输出 5 个不重叠的事件块（覆盖早/中/晚不同阶段，不要把“上课/上班”整段写成一个大块）。',
        '3. busyBlocks 的 reason 必须是简短事件名，例如 上课、练琴、开会、通勤、兼职、训练、排练。',
        '4. scheduleText 要写成人类能直接读懂的作息表原文，建议按行列出每个时段（例如 “07:30 起床洗漱”“08:10 早餐”“08:40 通勤/到校”…）。',
        '5. 时间统一使用 24 小时制 HH:MM。',
        '6. 只输出严格 JSON，不要输出解释、Markdown、代码块或额外文字。',
        '输出结构固定为：{"scheduleText":"...","sleepStart":"HH:MM","sleepEnd":"HH:MM","busyBlocks":[{"start":"HH:MM","end":"HH:MM","reason":"事件名称"}],"notes":"可选备注","confidence":0.0,"summary":"一句话概括"}',
        '',
        '【角色名称】' + (ctx.name || 'TA'),
        '【角色备注】' + (ctx.remark || ''),
        '【角色人设】' + (ctx.desc || ''),
        '【聊天风格】' + (ctx.style || ''),
        '【世界书】' + (ctx.worldbookPrompt || ''),
        '【现有作息】' + (ctx.scheduleText || '(空)'),
        '',
        '请直接输出 JSON。'
    ].join('\n');
}

function parseScheduleDraftGenerationResult(text) {
    const parsed = parseLooseJsonFromText(text);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed.result && typeof parsed.result === 'object' ? parsed.result : parsed;
    const scheduleText = String(candidate.scheduleText || candidate.schedule || candidate.rawText || '').trim();
    const plan = ensureScheduleParsePlan(candidate, scheduleText);
    return {
        scheduleText: scheduleText,
        plan: plan
    };
}

function runScheduleDraftGeneration(prefix) {
    const cfg = getScheduleParserConfig(prefix);
    const ctx = readScheduleGeneratorContext(cfg.prefix);
    if (typeof window.callAI !== 'function') {
        notifyScheduleParseAction('当前没有可用的大模型接口。');
        return;
    }
    if (!ctx.name && !ctx.desc && !ctx.style && !ctx.worldbookPrompt) {
        notifyScheduleParseAction('先填一点人设或世界书，再生成作息会更准。');
        return;
    }
    const panel = document.getElementById(cfg.panelId);
    if (panel) panel.classList.add('is-loading');
    setScheduleParseLoading(cfg.prefix, 'generate', true);
    const systemPrompt = typeof window.buildToolJsonPrompt === 'function'
        ? window.buildToolJsonPrompt('schedule_generation', {
            sceneIntro: '当前任务是为角色生成日常作息，并同时给出结构化解析结果。',
            taskGuidance: '你必须让作息贴合角色设定与世界观，不能写成通用模板。',
            outputInstructions: '只输出严格 JSON，不要解释、Markdown 或额外文字。'
        })
        : '你是一个角色作息生成器，只输出严格 JSON，不要输出任何解释、Markdown 或代码块。';
    const userPrompt = getScheduleDraftGenerationPrompt(cfg.prefix);
    try {
        window.callAI(systemPrompt, [], userPrompt, function (resultText) {
            try {
                const parsed = parseScheduleDraftGenerationResult(resultText);
                if (!parsed || !parsed.plan) {
                    notifyScheduleParseAction('AI 生成失败，返回内容无法识别。');
                    return;
                }
                const nextText = String(parsed.scheduleText || '').trim();
                if (ctx.textarea && nextText) {
                    ctx.textarea.value = nextText;
                }
                const rawText = nextText || ctx.scheduleText || '';
                renderScheduleParsePanel(cfg.prefix, parsed.plan, rawText, {
                    mode: 'generate',
                    statusText: 'AI 已生成并解析作息'
                });
                notifyScheduleParseAction('已生成作息表，并自动解析到下面的时段。');
            } finally {
                setScheduleParseLoading(cfg.prefix, 'generate', false);
                if (panel) panel.classList.remove('is-loading');
            }
        }, function () {
            setScheduleParseLoading(cfg.prefix, 'generate', false);
            if (panel) panel.classList.remove('is-loading');
            notifyScheduleParseAction('生成失败，请检查 API 配置。');
        });
    } catch (e) {
        setScheduleParseLoading(cfg.prefix, 'generate', false);
        if (panel) panel.classList.remove('is-loading');
        notifyScheduleParseAction('生成失败，请检查 API 配置。');
    }
}

function buildScheduleParsePanelHtml(prefix, plan, options) {
    const safePrefix = String(prefix || 'creator').trim() === 'editor' ? 'editor' : 'creator';
    const normalized = ensureScheduleParsePlan(plan, plan && plan.rawText ? plan.rawText : '');
    const busyBlocks = Array.isArray(normalized.busyBlocks) && normalized.busyBlocks.length
        ? normalized.busyBlocks
        : [{ start: '', end: '', reason: '', source: 'explicit', sourceText: '' }];
    const summaryText = normalized.summary || '未识别到明确作息，可以手动补充。';
    const confidenceText = normalized.confidence ? Math.round(normalized.confidence * 100) + '%' : '--';
    const opts = options && typeof options === 'object' ? options : {};
    const emptyHint = normalized.rawText ? '' : '先输入作息文本，再点上面的解析按钮。';
    const busyRows = busyBlocks.map(function (block, index) {
        const start = escapeScheduleParseHtml(block.start || '');
        const end = escapeScheduleParseHtml(block.end || '');
        const reason = escapeScheduleParseHtml(block.reason || '');
        return [
            '<div class="schedule-parse-busy-item" data-busy-index="' + index + '">',
            '<input type="time" data-schedule-field="busy-start" value="' + start + '" aria-label="忙碌开始时间">',
            '<input type="time" data-schedule-field="busy-end" value="' + end + '" aria-label="忙碌结束时间">',
            '<input type="text" data-schedule-field="busy-reason" value="' + reason + '" placeholder="事件名称" aria-label="事件名称">',
            '<button type="button" class="schedule-parse-busy-remove" data-schedule-click="remove-busy-row" data-busy-index="' + index + '">×</button>',
            '</div>'
        ].join('');
    }).join('');

    return [
        '<div class="schedule-parse-panel-header">',
        '  <div class="schedule-parse-panel-copy">',
        '    <div class="schedule-parse-panel-title">解析结果</div>',
        '    <div class="schedule-parse-panel-subtitle">可以先生成作息，也可以直接解析现有文本。解析后能继续手动改下面的时间和事件名称。</div>',
        '  </div>',
        '  <div class="schedule-parse-panel-actions">',
        '    <button type="button" class="schedule-parse-action-btn" data-schedule-click="generate-schedule">',
        '      <span class="schedule-parse-action-btn-title">生成作息表</span>',
        '      <span class="schedule-parse-action-btn-sub">消耗一次API，按人设生成并解析</span>',
        '    </button>',
        '    <button type="button" class="schedule-parse-action-btn primary" data-schedule-click="ai-parse">',
        '      <span class="schedule-parse-action-btn-title">AI解析</span>',
        '      <span class="schedule-parse-action-btn-sub">消耗一次API，解析更精准</span>',
        '    </button>',
        '    <button type="button" class="schedule-parse-action-btn" data-schedule-click="auto-parse">',
        '      <span class="schedule-parse-action-btn-title">自动解析</span>',
        '      <span class="schedule-parse-action-btn-sub">不消耗API，准确度较低</span>',
        '    </button>',
        '  </div>',
        '</div>',
        '<div class="schedule-parse-status" data-schedule-parse-status' + (opts.loading ? '' : ' hidden') + '>' + escapeScheduleParseHtml(String(opts.statusText || '')) + '</div>',
        emptyHint ? '<div class="schedule-parse-empty-hint">' + escapeScheduleParseHtml(emptyHint) + '</div>' : '',
        '<div class="schedule-parse-summary">',
        '  <div class="schedule-parse-summary-top">',
        '    <div class="schedule-parse-summary-label">当前解析</div>',
        '    <div class="schedule-parse-summary-score">置信度 ' + confidenceText + '</div>',
        '  </div>',
        '  <div class="schedule-parse-summary-text">' + escapeScheduleParseHtml(summaryText) + '</div>',
        '</div>',
        '<div class="schedule-parse-grid">',
        '  <div class="schedule-parse-field">',
        '    <label>睡眠开始</label>',
        '    <input type="time" data-schedule-field="sleep-start" value="' + escapeScheduleParseHtml(normalized.sleepStart || '') + '">',
        '  </div>',
        '  <div class="schedule-parse-field">',
        '    <label>睡眠结束</label>',
        '    <input type="time" data-schedule-field="sleep-end" value="' + escapeScheduleParseHtml(normalized.sleepEnd || '') + '">',
        '  </div>',
        '</div>',
        '<div class="schedule-parse-section-title">忙碌时段</div>',
        '<div class="schedule-parse-busy-list" data-schedule-field="busy-list">',
        busyRows,
        '</div>',
        '<button type="button" class="schedule-parse-add-btn" data-schedule-click="add-busy-row">+ 添加忙碌时段</button>',
        '<div class="schedule-parse-field" style="margin-top: 12px;">',
        '  <label>备注</label>',
        '  <textarea data-schedule-field="notes" placeholder="可写上未能自动识别的说明，保存时会一并记录。">' + escapeScheduleParseHtml(normalized.notes || '') + '</textarea>',
        '</div>',
        '<div class="schedule-parse-footnote">修改后记得点底部的保存按钮。这个面板会把结果存成结构化作息，供忙时不回消息或自动回复使用。</div>'
    ].join('');
}

function bindScheduleParsePanelEvents(panel, prefix) {
    if (!panel || panel.dataset.scheduleBound === '1') return;
    panel.dataset.scheduleBound = '1';
    panel.addEventListener('click', function (e) {
        const target = e.target && e.target.closest ? e.target.closest('[data-schedule-click]') : null;
        if (!target) return;
        const action = String(target.dataset.scheduleClick || '').trim();
        if (!action) return;
        if (action === 'generate-schedule') {
            runScheduleDraftGeneration(prefix);
            return;
        }
        if (action === 'ai-parse') {
            runScheduleParse(prefix, 'ai');
            return;
        }
        if (action === 'auto-parse') {
            runScheduleParse(prefix, 'auto');
            return;
        }
        if (action === 'add-busy-row') {
            addScheduleParseBusyRow(prefix);
            return;
        }
        if (action === 'remove-busy-row') {
            const index = parseInt(String(target.dataset.busyIndex || ''), 10);
            if (!Number.isFinite(index)) return;
            removeScheduleParseBusyRow(prefix, index);
        }
    });
}

function renderScheduleParsePanel(prefix, plan, rawText, options) {
    const cfg = getScheduleParserConfig(prefix);
    const panel = document.getElementById(cfg.panelId);
    if (!panel) return null;
    const normalized = ensureScheduleParsePlan(plan, rawText != null ? rawText : (plan && plan.rawText ? plan.rawText : ''));
    panel.dataset.schedulePrefix = cfg.prefix;
    panel.dataset.scheduleRaw = String(rawText != null ? rawText : normalized.rawText || '');
    panel.dataset.scheduleMode = String(options && options.mode ? options.mode : '');
    panel.innerHTML = buildScheduleParsePanelHtml(cfg.prefix, normalized, options);
    bindScheduleParsePanelEvents(panel, cfg.prefix);
    panel.hidden = false;
    return normalized;
}

function collectScheduleParsePanelState(prefix) {
    const cfg = getScheduleParserConfig(prefix);
    const panel = document.getElementById(cfg.panelId);
    if (!panel || panel.hidden) return null;
    const sleepStartInput = panel.querySelector('[data-schedule-field="sleep-start"]');
    const sleepEndInput = panel.querySelector('[data-schedule-field="sleep-end"]');
    const notesInput = panel.querySelector('[data-schedule-field="notes"]');
    const rawText = String(panel.dataset.scheduleRaw || '').trim();
    const busyList = Array.from(panel.querySelectorAll('.schedule-parse-busy-item')).map(function (row) {
        if (!row) return null;
        const startInput = row.querySelector('[data-schedule-field="busy-start"]');
        const endInput = row.querySelector('[data-schedule-field="busy-end"]');
        const reasonInput = row.querySelector('[data-schedule-field="busy-reason"]');
        const start = String(startInput && startInput.value || '').trim();
        const end = String(endInput && endInput.value || '').trim();
        const reason = String(reasonInput && reasonInput.value || '').trim();
        if (!start && !end && !reason) return null;
        return { start: start, end: end, reason: reason, source: 'explicit' };
    }).filter(Boolean);

    const payload = {
        rawText: rawText,
        sleepStart: String(sleepStartInput && sleepStartInput.value || '').trim(),
        sleepEnd: String(sleepEndInput && sleepEndInput.value || '').trim(),
        busyBlocks: busyList,
        notes: String(notesInput && notesInput.value || '').trim(),
        confidence: 0,
        summary: '',
        updatedAt: Date.now()
    };
    if (!payload.sleepStart && !payload.sleepEnd && !payload.busyBlocks.length && !payload.notes) {
        return null;
    }
    if (typeof window.parseRoleSchedulePlan === 'function') {
        const parsed = window.parseRoleSchedulePlan(rawText);
        if (parsed && typeof parsed === 'object') {
            payload.confidence = parsed.confidence || 0;
            payload.summary = parsed.summary || '';
        }
    }
    return ensureScheduleParsePlan(payload, rawText);
}

function collectScheduleParseBusyRowsFromPanel(prefix) {
    const cfg = getScheduleParserConfig(prefix);
    const panel = document.getElementById(cfg.panelId);
    if (!panel || panel.hidden) return [];
    return Array.from(panel.querySelectorAll('.schedule-parse-busy-item')).map(function (row) {
        if (!row) return null;
        const startInput = row.querySelector('[data-schedule-field="busy-start"]');
        const endInput = row.querySelector('[data-schedule-field="busy-end"]');
        const reasonInput = row.querySelector('[data-schedule-field="busy-reason"]');
        const start = String(startInput && startInput.value || '').trim();
        const end = String(endInput && endInput.value || '').trim();
        const reason = String(reasonInput && reasonInput.value || '').trim();
        if (!start && !end && !reason) return null;
        return { start: start, end: end, reason: reason, source: 'explicit' };
    }).filter(Boolean);
}

function openScheduleParsePanel(prefix) {
    const cfg = getScheduleParserConfig(prefix);
    const textarea = document.getElementById(cfg.textareaId);
    const panel = document.getElementById(cfg.panelId);
    if (!panel || !textarea) return null;
    const rawText = String(textarea.value || '').trim();
    const current = collectScheduleParsePanelState(cfg.prefix);
    const fallback = current || (typeof window.parseRoleSchedulePlan === 'function'
        ? window.parseRoleSchedulePlan(rawText)
        : getScheduleParseEmptyPlan(rawText));
    const normalized = renderScheduleParsePanel(cfg.prefix, fallback || getScheduleParseEmptyPlan(rawText), rawText);
    panel.hidden = false;
    return normalized;
}

function runScheduleParse(prefix, mode) {
    const cfg = getScheduleParserConfig(prefix);
    const textarea = document.getElementById(cfg.textareaId);
    const rawText = String(textarea && textarea.value || '').trim();
    if (!rawText) {
        notifyScheduleParseAction('请先输入作息文本。');
        return;
    }
    const hasParsedAnyScheduleField = function (plan) {
        const src = plan && typeof plan === 'object' ? plan : {};
        const blocks = Array.isArray(src.busyBlocks) ? src.busyBlocks : [];
        const hasSleep = !!(String(src.sleepStart || '').trim() && String(src.sleepEnd || '').trim());
        const hasBlocks = blocks.some(function (b) {
            if (!b || typeof b !== 'object') return false;
            return !!(String(b.start || '').trim() || String(b.end || '').trim() || String(b.reason || '').trim());
        });
        const hasNotes = !!String(src.notes || '').trim();
        return hasSleep || hasBlocks || hasNotes;
    };
    const safeMode = String(mode || '').trim() === 'ai' ? 'ai' : 'auto';
    if (safeMode === 'auto') {
        const parsed = typeof window.parseRoleSchedulePlan === 'function'
            ? window.parseRoleSchedulePlan(rawText)
            : null;
        const statusText = hasParsedAnyScheduleField(parsed) ? '自动解析完成' : '自动解析完成（未识别到时段）';
        const normalized = renderScheduleParsePanel(cfg.prefix, parsed || getScheduleParseEmptyPlan(rawText), rawText, {
            mode: 'auto',
            statusText: statusText
        });
        if (!normalized) {
            notifyScheduleParseAction('自动解析失败。');
            return;
        }
        notifyScheduleParseAction(hasParsedAnyScheduleField(normalized) ? '自动解析完成。' : '解析完成，但没有识别到任何时段。');
        return normalized;
    }
    if (typeof window.callAI !== 'function') {
        notifyScheduleParseAction('当前没有可用的大模型接口。');
        return;
    }
    const panel = document.getElementById(cfg.panelId);
    if (panel) panel.classList.add('is-loading');
    setScheduleParseLoading(cfg.prefix, 'ai', true);
    try {
        const systemPrompt = '你是一个作息表解析器，只输出严格 JSON，不要输出解释、Markdown 或代码块。';
        const userPrompt = getScheduleParseAiPrompt('', rawText);
        window.callAI(systemPrompt, [], userPrompt, function (resultText) {
            try {
                const parsed = parseSchedulePlanFromAiText(resultText, rawText);
                if (!parsed) {
                    notifyScheduleParseAction('AI 解析失败，返回内容无法识别。');
                    return;
                }
                const statusText = hasParsedAnyScheduleField(parsed) ? 'AI 解析完成' : 'AI 解析完成（未识别到时段）';
                const normalized = renderScheduleParsePanel(cfg.prefix, parsed, rawText, {
                    mode: 'ai',
                    statusText: statusText
                });
                if (!normalized) {
                    notifyScheduleParseAction('AI 解析失败。');
                    return;
                }
                notifyScheduleParseAction(hasParsedAnyScheduleField(normalized) ? 'AI 解析完成。' : '解析完成，但没有识别到任何时段。');
            } finally {
                setScheduleParseLoading(cfg.prefix, 'ai', false);
                if (panel) panel.classList.remove('is-loading');
            }
        }, function () {
            setScheduleParseLoading(cfg.prefix, 'ai', false);
            if (panel) panel.classList.remove('is-loading');
            notifyScheduleParseAction('AI 解析失败，请检查 API 配置。');
        });
    } catch (e) {
        setScheduleParseLoading(cfg.prefix, 'ai', false);
        if (panel) panel.classList.remove('is-loading');
        notifyScheduleParseAction('AI 解析失败。');
    }
}

function addScheduleParseBusyRow(prefix) {
    const cfg = getScheduleParserConfig(prefix);
    const panel = document.getElementById(cfg.panelId);
    if (!panel) return;
    const state = collectScheduleParsePanelState(cfg.prefix) || {
        rawText: String(panel.dataset.scheduleRaw || ''),
        sleepStart: '',
        sleepEnd: '',
        busyBlocks: [],
        notes: '',
        confidence: 0,
        summary: ''
    };
    const visibleRows = collectScheduleParseBusyRowsFromPanel(cfg.prefix);
    state.busyBlocks = visibleRows.length
        ? visibleRows.slice()
        : (Array.isArray(state.busyBlocks) ? state.busyBlocks.slice() : []);
    state.busyBlocks.push({ start: '', end: '', reason: '', source: 'ui' });
    renderScheduleParsePanel(cfg.prefix, state, state.rawText);
    setTimeout(function () {
        const nextPanel = document.getElementById(cfg.panelId);
        if (!nextPanel) return;
        const rows = nextPanel.querySelectorAll('.schedule-parse-busy-item');
        if (!rows || !rows.length) return;
        const lastRow = rows[rows.length - 1];
        const focusTarget = lastRow.querySelector('[data-schedule-field="busy-reason"]')
            || lastRow.querySelector('[data-schedule-field="busy-start"]');
        if (focusTarget) focusTarget.focus();
        try {
            lastRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (eScroll) { }
    }, 0);
}

function removeScheduleParseBusyRow(prefix, index) {
    const cfg = getScheduleParserConfig(prefix);
    const panel = document.getElementById(cfg.panelId);
    if (!panel) return;
    const state = collectScheduleParsePanelState(cfg.prefix) || {
        rawText: String(panel.dataset.scheduleRaw || ''),
        sleepStart: '',
        sleepEnd: '',
        busyBlocks: [],
        notes: '',
        confidence: 0,
        summary: ''
    };
    const nextBlocks = Array.isArray(state.busyBlocks) ? state.busyBlocks.slice() : [];
    nextBlocks.splice(index, 1);
    state.busyBlocks = nextBlocks;
    renderScheduleParsePanel(cfg.prefix, state, state.rawText);
}

function isAutoTranslateEnabled(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return false;
    const settings = getCurrentChatSettings(id);
    if (settings && typeof settings.autoTranslate === 'boolean') {
        return settings.autoTranslate;
    }
    return localStorage.getItem('chat_auto_translate') === 'true';
}

function readApiPresetListForRoleBinding() {
    try {
        const raw = localStorage.getItem('api_settings_presets_v1') || '[]';
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function getRoleBoundApiPresetId(roleId) {
    const id = roleId || window.currentChatRole || '';
    if (!id) return '';
    const settings = getCurrentChatSettings(id);
    return String(settings && settings.apiPresetId ? settings.apiPresetId : '').trim();
}

function resolveApiPresetNameById(presetId) {
    const id = String(presetId || '').trim();
    if (!id) return '';
    const presets = readApiPresetListForRoleBinding();
    const hit = presets.find(function (p) { return p && String(p.id || '').trim() === id; });
    return hit ? String(hit.name || '').trim() : '';
}

function updateRoleApiPresetValueUI(roleId) {
    const valueEl = document.getElementById('setting-role-api-preset-value');
    if (!valueEl) return;
    const id = roleId || window.currentChatRole || '';
    const presetId = getRoleBoundApiPresetId(id);
    if (!presetId) {
        valueEl.textContent = '全局';
        return;
    }
    const name = resolveApiPresetNameById(presetId);
    valueEl.textContent = name || '预设已删除';
}

function openRoleApiPresetModal() {
    const modal = document.getElementById('role-api-preset-modal');
    if (!modal) return;
    renderRoleApiPresetList();
    modal.style.display = 'flex';
}

function closeRoleApiPresetModal() {
    const modal = document.getElementById('role-api-preset-modal');
    if (!modal) return;
    modal.style.display = 'none';
}

function clearRoleApiPresetBinding() {
    const roleId = window.currentChatRole || '';
    if (!roleId) return;
    saveCurrentChatSettings(roleId, { apiPresetId: '' });
    updateRoleApiPresetValueUI(roleId);
    closeRoleApiPresetModal();
}

function renderRoleApiPresetList() {
    const listEl = document.getElementById('role-api-preset-list');
    if (!listEl) return;
    const roleId = window.currentChatRole || '';
    const currentPresetId = getRoleBoundApiPresetId(roleId);
    const presets = readApiPresetListForRoleBinding();
    listEl.innerHTML = '';

    function addRow(label, sub, presetId) {
        const row = document.createElement('div');
        row.className = 'settings-item';
        row.style.marginLeft = '15px';
        row.style.paddingLeft = '0';

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.flexDirection = 'column';
        left.style.gap = '4px';

        const title = document.createElement('div');
        title.className = 'item-label';
        title.textContent = label;

        left.appendChild(title);
        if (sub) {
            const desc = document.createElement('div');
            desc.className = 'item-value';
            desc.textContent = sub;
            left.appendChild(desc);
        }

        const right = document.createElement('div');
        right.className = 'settings-item-right';

        const selected = String(currentPresetId || '') === String(presetId || '');
        if (selected) {
            const check = document.createElement('div');
            check.className = 'item-check';
            check.textContent = '✓';
            right.appendChild(check);
        }

        row.appendChild(left);
        row.appendChild(right);
        row.addEventListener('click', function () {
            if (!roleId) return;
            saveCurrentChatSettings(roleId, { apiPresetId: String(presetId || '') });
            updateRoleApiPresetValueUI(roleId);
            closeRoleApiPresetModal();
        });
        listEl.appendChild(row);
    }

    addRow('跟随系统全局', '使用系统设置里的全局 API', '');
    presets.forEach(function (p) {
        if (!p) return;
        const pid = String(p.id || '').trim();
        if (!pid) return;
        const name = String(p.name || '').trim() || '未命名预设';
        const model = String(p.model || '').trim();
        const baseUrl = String(p.baseUrl || '').trim();
        const sub = [model, baseUrl ? baseUrl.replace(/^https?:\/\//i, '') : ''].filter(Boolean).join(' · ');
        addRow(name, sub, pid);
    });
}

function initChatSettingsUI(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    if (!id) return;
    rememberChatSettingsRoleId(id);
    try {
        const modal = document.getElementById('settings-menu-modal');
        if (modal && modal.dataset) modal.dataset.roleId = id;
    } catch (e) { }
    const settings = getCurrentChatSettings(id);
    const memoryLimitInput = document.getElementById('setting-memory-limit');
    const momentsPostingSwitch = document.getElementById('setting-moments-posting-enabled');
    const allowOfflineInviteSwitch = document.getElementById('setting-allow-offline-invite');
    const autoTranslateSwitch = document.getElementById('setting-auto-translate-switch');
    const autoSummarySwitch = document.getElementById('setting-auto-summary-switch');
    const memoryArchiveLinesInput = document.getElementById('setting-memory-archive-lines');
    const personalizedSwitch = document.getElementById('setting-personalized-response-switch');
    const replyMaxTokensInput = document.getElementById('setting-reply-max-tokens');
    const busyReplySwitch = document.getElementById('setting-busy-reply-enabled');
    const busyReplyModeBox = document.getElementById('setting-busy-reply-mode-box');
    const busyReplyModeInputs = document.querySelectorAll('input[name="setting-busy-reply-mode"]');
    const summaryFreqInput = document.getElementById('setting-summary-freq');
    const fontSizeInput = document.getElementById('setting-font-size');
    const bubbleCssInput = document.getElementById('setting-bubble-css');
    if (memoryLimitInput && typeof settings.memoryLimit === 'number' && settings.memoryLimit > 0) {
        memoryLimitInput.value = String(settings.memoryLimit);
    }
    if (momentsPostingSwitch) {
        momentsPostingSwitch.checked = settings.momentsPostingEnabled === true;
    }
    if (allowOfflineInviteSwitch) {
        allowOfflineInviteSwitch.checked = settings.allowOfflineInvite !== false;
    }
    if (autoTranslateSwitch) {
        autoTranslateSwitch.checked = typeof settings.autoTranslate === 'boolean'
            ? settings.autoTranslate
            : localStorage.getItem('chat_auto_translate') === 'true';
    }
    if (autoSummarySwitch && typeof settings.autoSummary === 'boolean') {
        autoSummarySwitch.checked = settings.autoSummary;
    }
    if (memoryArchiveLinesInput) {
        const raw = typeof settings.memoryArchiveLines === 'number' ? settings.memoryArchiveLines : 0;
        memoryArchiveLinesInput.value = raw > 0 ? String(raw) : '';
    }
    if (personalizedSwitch) {
        personalizedSwitch.checked = settings.personalizedResponseEnabled !== false;
    }
    if (replyMaxTokensInput) {
        const raw = typeof settings.replyMaxTokens === 'number' ? settings.replyMaxTokens : 0;
        replyMaxTokensInput.value = raw > 0 ? String(raw) : '';
    }
    if (busyReplySwitch) {
        busyReplySwitch.checked = settings.busyReplyEnabled === true;
    }
    if (busyReplyModeInputs && busyReplyModeInputs.length) {
        const mode = String(settings.busyReplyMode || 'system').trim() === 'auto' ? 'auto' : 'system';
        busyReplyModeInputs.forEach(function (input) {
            if (!input) return;
            input.checked = String(input.value || '').trim() === mode;
        });
    }
    if (summaryFreqInput && typeof settings.summaryFreq === 'number' && settings.summaryFreq > 0) {
        summaryFreqInput.value = String(settings.summaryFreq);
    }
    if (fontSizeInput) {
        const raw = typeof settings.fontSize === 'number' ? settings.fontSize : 15;
        fontSizeInput.value = String(clampChatFontSize(raw));
    }
    if (bubbleCssInput) {
        if (bubbleCssInput.dataset) bubbleCssInput.dataset.roleId = id;
        bubbleCssInput.value = typeof settings.bubbleCss === 'string' ? settings.bubbleCss : '';
        hydrateChatBubbleCssForRole(id).then(function (loadedCss) {
            if (!loadedCss || !bubbleCssInput || !bubbleCssInput.dataset || String(bubbleCssInput.dataset.roleId || '') !== id) return;
            if (bubbleCssInput.value !== loadedCss) {
                bubbleCssInput.value = loadedCss;
                updateBubblePreview();
                renderChatBubblePresetList(id);
            }
        });
    }
    toggleSummaryInput();
    if (busyReplyModeBox) {
        busyReplyModeBox.hidden = !(busyReplySwitch && busyReplySwitch.checked);
    }
    renderBusyReplyAutoLibraryPanel(id);
    updateChatFontSizePreview();
    applyChatFontSizeFromSettings(id);
    updateBubblePreview();
    renderChatBubblePresetList(id);
    updateRoleApiPresetValueUI(id);
}

function clampChatFontSize(value) {
    const n = parseInt(String(value || ''), 10);
    if (!n || !isFinite(n)) return 15;
    return Math.max(12, Math.min(20, n));
}

function applyChatFontSizeFromSettings(roleId) {
    const id = resolveChatSettingsRoleId(roleId);
    const chatRoom = document.getElementById('chat-room-layer');
    if (!chatRoom) return;
    const settings = id ? getCurrentChatSettings(id) : {};
    const size = clampChatFontSize(settings && typeof settings.fontSize === 'number' ? settings.fontSize : 15);
    const scale = size / 15;
    chatRoom.style.setProperty('--chat-font-scale', String(scale));
    chatRoom.style.setProperty('--chat-font-size', size + 'px');
    chatRoom.style.fontSize = size + 'px';
    const historyBox = document.getElementById('chat-history');
    if (historyBox) {
        historyBox.style.setProperty('--chat-font-scale', String(scale));
        historyBox.style.setProperty('--chat-font-size', size + 'px');
        historyBox.style.fontSize = size + 'px';
    }
    try {
        if (!chatRoom.hasAttribute('data-chat-avatar')) chatRoom.setAttribute('data-chat-avatar', '1');
        if (!chatRoom.hasAttribute('data-chat-kkt')) chatRoom.setAttribute('data-chat-kkt', '0');
        if (!chatRoom.hasAttribute('data-chat-tail')) chatRoom.setAttribute('data-chat-tail', '0');
        if (!chatRoom.hasAttribute('data-chat-ts')) chatRoom.setAttribute('data-chat-ts', '1');
        if (!chatRoom.hasAttribute('data-chat-tspos')) chatRoom.setAttribute('data-chat-tspos', 'avatar');
        if (!chatRoom.hasAttribute('data-chat-read')) chatRoom.setAttribute('data-chat-read', '1');
    } catch (e) { }
}

function updateChatFontSizePreview() {
    const input = document.getElementById('setting-font-size');
    const label = document.getElementById('setting-font-size-value');
    if (!input || !label) return;
    const size = clampChatFontSize(input.value);
    label.textContent = size + 'px';
}

function parsePositiveInt(value) {
    const n = parseInt(String(value == null ? '' : value), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function clampInt(value, min, max, fallback) {
    const n = parsePositiveInt(value);
    if (!n) return fallback;
    return Math.max(min, Math.min(max, n));
}

function getEffectiveChatMemoryLimit(roleId) {
    const id = roleId || window.currentChatRole || '';
    const settings = getCurrentChatSettings(id);
    const settingsLimit = settings && typeof settings.memoryLimit === 'number' ? settings.memoryLimit : 0;
    const legacyLimit = parsePositiveInt(localStorage.getItem('chat_memory_limit'));
    return clampInt(settingsLimit || legacyLimit, 6, 300, 50);
}

function getEffectiveChatSummaryFreq(roleId) {
    const id = roleId || window.currentChatRole || '';
    const settings = getCurrentChatSettings(id);
    const settingsFreq = settings && typeof settings.summaryFreq === 'number' ? settings.summaryFreq : 0;
    const legacyFreq = parsePositiveInt(localStorage.getItem('chat_summary_freq'));
    return clampInt(settingsFreq || legacyFreq, 5, 500, 20);
}

function getEffectiveChatReplyMaxTokens(roleId) {
    const id = roleId || window.currentChatRole || '';
    const settings = getCurrentChatSettings(id);
    const n = settings && typeof settings.replyMaxTokens === 'number' ? settings.replyMaxTokens : 0;
    return clampInt(n, 64, 32768, 0);
}

function isChatAutoSummaryEnabled(roleId) {
    const id = roleId || window.currentChatRole || '';
    const settings = getCurrentChatSettings(id);
    if (settings && typeof settings.autoSummary === 'boolean') return settings.autoSummary;
    return localStorage.getItem('chat_auto_summary') === 'true';
}

window.getCurrentChatSettings = getCurrentChatSettings;
window.saveCurrentChatSettings = saveCurrentChatSettings;
window.applyChatBubbleCssFromSettings = applyChatBubbleCssFromSettings;
window.updateBubblePreview = updateBubblePreview;
window.saveChatSettings = saveChatSettings;
window.toggleSummaryInput = toggleSummaryInput;
window.isAutoTranslateEnabled = isAutoTranslateEnabled;
window.initChatSettingsUI = initChatSettingsUI;
window.applyChatFontSizeFromSettings = applyChatFontSizeFromSettings;
window.updateChatFontSizePreview = updateChatFontSizePreview;
window.openRoleApiPresetModal = openRoleApiPresetModal;
window.closeRoleApiPresetModal = closeRoleApiPresetModal;
window.clearRoleApiPresetBinding = clearRoleApiPresetBinding;
window.getEffectiveChatMemoryLimit = getEffectiveChatMemoryLimit;
window.getEffectiveChatSummaryFreq = getEffectiveChatSummaryFreq;
window.getEffectiveChatReplyMaxTokens = getEffectiveChatReplyMaxTokens;
window.isChatAutoSummaryEnabled = isChatAutoSummaryEnabled;
window.toggleBusyReplyModeBox = toggleBusyReplyModeBox;
window.getBusyReplySetting = getBusyReplySetting;
window.isBusyReplyEnabled = isBusyReplyEnabled;
window.getBusyReplyMode = getBusyReplyMode;
window.getBusyReplyAutoLibrarySetting = getBusyReplyAutoLibrarySetting;
window.getBusyReplyScheduleEventList = getBusyReplyScheduleEventList;
window.getBusyReplyAutoEventList = getBusyReplyAutoEventList;
window.collectBusyReplyAutoLibraryFromPanel = collectBusyReplyAutoLibraryFromPanel;
window.saveBusyReplyAutoLibraryFromPanel = saveBusyReplyAutoLibraryFromPanel;
window.renderBusyReplyAutoLibraryPanel = renderBusyReplyAutoLibraryPanel;
window.renderBusyReplyAutoLibraryVisibility = renderBusyReplyAutoLibraryVisibility;
window.addBusyReplyAutoEntry = addBusyReplyAutoEntry;
window.triggerBusyReplyAutoGeneration = triggerBusyReplyAutoGeneration;
window.removeBusyReplyAutoEvent = removeBusyReplyAutoEvent;
window.generateBusyReplyAutoLibrary = generateBusyReplyAutoLibrary;
window.renderScheduleParsePanel = renderScheduleParsePanel;
window.collectScheduleParsePanelState = collectScheduleParsePanelState;
window.openScheduleParsePanel = openScheduleParsePanel;
window.runScheduleDraftGeneration = runScheduleDraftGeneration;
window.runScheduleParse = runScheduleParse;
window.addScheduleParseBusyRow = addScheduleParseBusyRow;
window.removeScheduleParseBusyRow = removeScheduleParseBusyRow;

function escapeChatSettingsHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getChatSettingsProfile(roleId) {
    const id = String(roleId || '').trim();
    const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
    return id && profiles[id] ? profiles[id] : {};
}

function isGroupChatRoleId(roleId) {
    const id = String(roleId || '').trim();
    if (!id) return false;
    try {
        const api = window.GroupChat;
        if (api && typeof api.isGroupChatRole === 'function' && api.isGroupChatRole(id)) return true;
    } catch (e) { }
    const p = getChatSettingsProfile(id);
    return !!p.isGroup;
}

function getRoleDisplayName(profile, roleId) {
    const p = profile && typeof profile === 'object' ? profile : {};
    const id = String(roleId || '').trim();
    return String(p.remark || p.nickName || p.name || id || '未知').trim() || '未知';
}

function getRoleDescText(profile) {
    const p = profile && typeof profile === 'object' ? profile : {};
    const raw = String(p.desc || p.persona || p.description || '').trim();
    return raw || '点击查看档案...';
}

function buildIosSwitchHtml(inputId, onChangeJs) {
    const safeId = escapeChatSettingsHtml(inputId);
    const safeOnChange = escapeChatSettingsHtml(onChangeJs);
    return ''
        + '<label class="relative inline-flex items-center cursor-pointer select-none">'
        + '  <input id="' + safeId + '" type="checkbox" class="sr-only peer" onchange="' + safeOnChange + '">'
        + '  <div class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#34C759] transition-colors after:content-[\'\'] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow after:transition-transform peer-checked:after:translate-x-5"></div>'
        + '</label>';
}

function getNonGroupCharacters() {
    const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
    return Object.keys(profiles)
        .map(function (id) {
            const p = profiles[id];
            return { roleId: id, profile: p };
        })
        .filter(function (item) { return item.roleId && item.profile && item.profile.isGroup !== true; })
        .map(function (item) {
            return {
                roleId: String(item.roleId),
                name: getRoleDisplayName(item.profile, item.roleId),
                avatar: item.profile.avatar || 'assets/chushitouxiang.jpg'
            };
        })
        .sort(function (a, b) { return a.name.localeCompare(b.name, 'zh-Hans-CN'); });
}

function normalizeMemberIds(memberIds) {
    const ids = Array.isArray(memberIds) ? memberIds : [];
    const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
    const seen = new Set();
    const out = [];
    for (let i = 0; i < ids.length; i++) {
        const id = String(ids[i] || '').trim();
        if (!id) continue;
        if (seen.has(id)) continue;
        const p = profiles[id];
        if (!p || p.isGroup) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

function getGroupMemberIds(roleId) {
    const p = getChatSettingsProfile(roleId);
    return normalizeMemberIds(p.memberIds || p.members || []);
}

function getGroupSelfDisplay(roleId) {
    const rid = String(roleId || '').trim();
    const api = window.GroupChat;
    if (api && typeof api.getUserDisplayMember === 'function') {
        try {
            const member = api.getUserDisplayMember(rid);
            if (member && typeof member === 'object') return member;
        } catch (e) { }
    }
    const scoped = window.userPersonas && typeof window.userPersonas === 'object'
        ? (window.userPersonas[rid] || {})
        : {};
    const name = String(scoped.groupNickname || scoped.nickname || scoped.name || '我').trim() || '我';
    return {
        roleId: 'me',
        name: name,
        avatar: scoped.avatar || 'assets/chushitouxiang.jpg'
    };
}

function getGroupDisplayMembersForSettings(roleId) {
    const rid = String(roleId || '').trim();
    const api = window.GroupChat;
    if (api && typeof api.getGroupDisplayMembers === 'function') {
        try {
            const members = api.getGroupDisplayMembers(rid);
            if (Array.isArray(members) && members.length) return members;
        } catch (e) { }
    }
    const me = getGroupSelfDisplay(rid);
    const memberIds = getGroupMemberIds(rid);
    const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
    return [me].concat(memberIds.map(function (id) {
        const p = profiles[id] || {};
        return {
            roleId: id,
            name: getRoleDisplayName(p, id),
            avatar: p.avatar || 'assets/chushitouxiang.jpg'
        };
    }));
}

function normalizeGroupMuteAllState(profile) {
    const source = profile && typeof profile === 'object' ? profile : {};
    if (typeof source.groupMuteAll === 'boolean') {
        return { enabled: source.groupMuteAll, until: null };
    }
    const row = source.groupMuteAll && typeof source.groupMuteAll === 'object' ? source.groupMuteAll : {};
    const until = Number(row.until);
    return {
        enabled: row.enabled === true || row.active === true,
        until: Number.isFinite(until) && until > 0 ? until : null
    };
}

function normalizeGroupMutedMembersState(profile) {
    const source = profile && typeof profile === 'object' ? profile : {};
    const out = {};
    const legacyIds = Array.isArray(source.groupMutedMemberIds) ? source.groupMutedMemberIds : [];
    legacyIds.forEach(function (id) {
        const key = String(id || '').trim();
        if (!key) return;
        out[key] = { until: null };
    });
    const rows = source.groupMutedMembers && typeof source.groupMutedMembers === 'object' ? source.groupMutedMembers : {};
    Object.keys(rows).forEach(function (id) {
        const key = String(id || '').trim();
        const row = rows[id] && typeof rows[id] === 'object' ? rows[id] : {};
        const until = Number(row.until);
        if (!key) return;
        out[key] = {
            until: Number.isFinite(until) && until > 0 ? until : null
        };
    });
    return out;
}

function isGroupMuteRecordActive(record) {
    const row = record && typeof record === 'object' ? record : {};
    const hasEnabled = typeof row.enabled === 'boolean' || typeof row.active === 'boolean';
    const enabled = row.enabled === true || row.active === true;
    const until = Number(row.until);
    if (Number.isFinite(until) && until > 0) {
        return until > Date.now() && (hasEnabled ? enabled : true);
    }
    return hasEnabled ? enabled : Object.keys(row).length > 0;
}

function getActiveGroupMuteAllRecord(profile) {
    const row = normalizeGroupMuteAllState(profile);
    return isGroupMuteRecordActive(row) ? row : null;
}

function getActiveGroupMemberMuteRecord(profile, memberId) {
    const rows = normalizeGroupMutedMembersState(profile);
    const record = rows[String(memberId || '').trim()];
    return isGroupMuteRecordActive(record) ? record : null;
}

function getGroupMuteDurationPresets() {
    return [
        { label: '10分钟', durationMs: 10 * 60 * 1000 },
        { label: '1小时', durationMs: 60 * 60 * 1000 },
        { label: '12小时', durationMs: 12 * 60 * 60 * 1000 },
        { label: '1天', durationMs: 24 * 60 * 60 * 1000 },
        { label: '永久禁言', durationMs: null }
    ];
}

function formatMuteRemaining(until) {
    const end = Number(until);
    if (!Number.isFinite(end) || end <= 0) return '永久禁言';
    const diff = Math.max(0, end - Date.now());
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff >= day) return Math.ceil(diff / day) + '天';
    if (diff >= hour) return Math.ceil(diff / hour) + '小时';
    return Math.max(1, Math.ceil(diff / minute)) + '分钟';
}

function ensureGroupMuteStateProfile(profile) {
    const source = profile && typeof profile === 'object' ? profile : {};
    const muteAll = normalizeGroupMuteAllState(source);
    const mutedMembers = normalizeGroupMutedMembersState(source);
    source.groupOwnerId = String(source.groupOwnerId || 'me').trim() || 'me';
    source.groupMuteAll = { enabled: !!muteAll.enabled, until: muteAll.until };
    source.groupMutedMembers = mutedMembers;
    if (source.groupMutedMemberIds) delete source.groupMutedMemberIds;
    return source;
}

async function pushGroupManagementSystemMessage(roleId, text) {
    const rid = String(roleId || '').trim();
    const content = String(text || '').trim();
    if (!rid || !content) return;
    const api = window.GroupChat;
    if (api && typeof api.pushSystemEvent === 'function') {
        try {
            await api.pushSystemEvent(rid, content);
            return;
        } catch (e) { }
    }
    const msgObj = {
        role: 'system',
        type: 'system_event',
        content: content,
        timestamp: Date.now(),
        status: 'sent'
    };
    if (typeof window.pushRoleMessageToDataAndActiveView === 'function') {
        window.pushRoleMessageToDataAndActiveView(rid, msgObj);
    } else {
        if (!window.chatData || typeof window.chatData !== 'object') window.chatData = {};
        if (!Array.isArray(window.chatData[rid])) window.chatData[rid] = [];
        window.chatData[rid].push(msgObj);
    }
    if (typeof window.saveData === 'function') await window.saveData();
    if (typeof window.loadWechatChatList === 'function') window.loadWechatChatList(true);
}

function ensureGroupMemberPickerModal() {
    let modal = document.getElementById('group-member-picker-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'group-member-picker-modal';
    modal.className = 'fixed inset-0 z-[10050] hidden';
    modal.innerHTML = ''
        + '<div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>'
        + '<div class="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl max-h-[85vh] overflow-hidden">'
        + '  <div class="flex items-center justify-between px-4 h-12 border-b border-gray-200">'
        + '    <button type="button" class="text-[#007AFF] text-[16px]" id="group-member-picker-cancel">取消</button>'
        + '    <div class="font-semibold text-[17px] text-gray-900" id="group-member-picker-title">选择成员</div>'
        + '    <button type="button" class="text-[#007AFF] text-[16px] font-semibold" id="group-member-picker-confirm">完成</button>'
        + '  </div>'
        + '  <div class="overflow-y-auto p-3" id="group-member-picker-list"></div>'
        + '</div>';
    document.body.appendChild(modal);

    const cancelBtn = modal.querySelector('#group-member-picker-cancel');
    const confirmBtn = modal.querySelector('#group-member-picker-confirm');
    const mask = modal.firstElementChild;
    const close = function () {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };
    if (mask) mask.addEventListener('click', close);
    if (cancelBtn) cancelBtn.addEventListener('click', close);
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function () {
            const state = window.__groupMemberPickerState;
            if (!state || typeof state !== 'object') {
                close();
                return;
            }
            const selected = Array.isArray(state.selected) ? state.selected.slice() : [];
            close();
            try { state.onConfirm && state.onConfirm(selected); } catch (e) { }
        });
    }
    return modal;
}

function openGroupMemberPicker(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const modal = ensureGroupMemberPickerModal();
    const titleEl = modal.querySelector('#group-member-picker-title');
    const confirmBtn = modal.querySelector('#group-member-picker-confirm');
    const listEl = modal.querySelector('#group-member-picker-list');
    const items = Array.isArray(opts.items) ? opts.items : [];
    const selected = new Set(Array.isArray(opts.initialSelected) ? opts.initialSelected.map(function (x) { return String(x || '').trim(); }).filter(Boolean) : []);

    window.__groupMemberPickerState = {
        selected: Array.from(selected),
        onConfirm: typeof opts.onConfirm === 'function' ? opts.onConfirm : null
    };

    if (titleEl) titleEl.textContent = String(opts.title || '选择成员');
    if (confirmBtn) confirmBtn.textContent = String(opts.confirmText || '完成');
    if (listEl) {
        if (!items.length) {
            listEl.innerHTML = '<div class="py-10 text-center text-gray-400 text-[13px]">暂无可选成员</div>';
        } else {
            listEl.innerHTML = items.map(function (item) {
                const id = escapeChatSettingsHtml(item.roleId);
                const name = escapeChatSettingsHtml(item.name);
                const avatar = escapeChatSettingsHtml(item.avatar || 'assets/chushitouxiang.jpg');
                const checked = selected.has(String(item.roleId)) ? 'true' : 'false';
                return ''
                    + '<div class="flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-gray-50 cursor-pointer" data-pick-id="' + id + '" data-picked="' + checked + '">'
                    + '  <img src="' + avatar + '" class="w-10 h-10 rounded-full object-cover bg-gray-100">'
                    + '  <div class="flex-1 min-w-0">'
                    + '    <div class="text-[15px] text-gray-900 truncate">' + name + '</div>'
                    + '  </div>'
                    + '  <div class="w-6 text-right text-[#007AFF] text-[18px]" data-pick-check>' + (checked === 'true' ? '✓' : '') + '</div>'
                    + '</div>';
            }).join('');
            listEl.querySelectorAll('[data-pick-id]').forEach(function (row) {
                row.addEventListener('click', function () {
                    const rid = String(row.getAttribute('data-pick-id') || '').trim();
                    if (!rid) return;
                    const now = row.getAttribute('data-picked') === 'true';
                    const next = !now;
                    row.setAttribute('data-picked', next ? 'true' : 'false');
                    const checkEl = row.querySelector('[data-pick-check]');
                    if (checkEl) checkEl.textContent = next ? '✓' : '';
                    if (next) selected.add(rid);
                    else selected.delete(rid);
                    if (window.__groupMemberPickerState) {
                        window.__groupMemberPickerState.selected = Array.from(selected);
                    }
                });
            });
        }
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

const chatSettingsPageState = {
    stack: [],
    currentTitle: '聊天信息'
};

function setChatSettingsHeaderTitle(text) {
    chatSettingsPageState.currentTitle = String(text || '聊天信息');
    const titleEl = document.getElementById('chat-settings-title');
    if (titleEl) titleEl.textContent = chatSettingsPageState.currentTitle;
}

function openChatSettingsInlineInput(options) {
    const opts = options && typeof options === 'object' ? options : {};
    return new Promise(function (resolve) {
        const old = document.getElementById('chat-settings-inline-input-modal');
        if (old) old.remove();
        const title = escapeChatSettingsHtml(opts.title || '请输入');
        const placeholder = escapeChatSettingsHtml(opts.placeholder || '');
        const value = escapeChatSettingsHtml(opts.value || '');
        const multiline = !!opts.multiline;
        const modal = document.createElement('div');
        modal.id = 'chat-settings-inline-input-modal';
        modal.className = 'fixed inset-0 z-[10060] flex items-center justify-center bg-black/35 p-6';
        modal.innerHTML = ''
            + '<div class="w-full max-w-[460px] bg-white rounded-2xl overflow-hidden shadow-2xl">'
            + '  <div class="px-4 py-3 border-b border-gray-100 text-[16px] font-semibold text-gray-900">' + title + '</div>'
            + '  <div class="px-4 py-3">'
            + (multiline
                ? '<textarea id="chat-settings-inline-input" class="w-full h-28 rounded-xl border border-gray-200 px-3 py-2 text-[14px] text-gray-900 outline-none resize-none" placeholder="' + placeholder + '">' + value + '</textarea>'
                : '<input id="chat-settings-inline-input" class="w-full h-11 rounded-xl border border-gray-200 px-3 text-[14px] text-gray-900 outline-none" value="' + value + '" placeholder="' + placeholder + '">')
            + '  </div>'
            + '  <div class="flex border-t border-gray-100">'
            + '    <button type="button" class="flex-1 h-11 text-[15px] text-gray-500 active:bg-gray-50" data-act="cancel">取消</button>'
            + '    <button type="button" class="flex-1 h-11 text-[15px] text-[#007AFF] font-semibold active:bg-blue-50 border-l border-gray-100" data-act="ok">确定</button>'
            + '  </div>'
            + '</div>';
        document.body.appendChild(modal);
        const input = modal.querySelector('#chat-settings-inline-input');
        if (input) {
            setTimeout(function () {
                try { input.focus(); } catch (e) { }
            }, 16);
        }
        const close = function (result) {
            try { modal.remove(); } catch (e) { }
            resolve(result);
        };
        modal.addEventListener('click', function (e) {
            if (e.target === modal) close(null);
        });
        const cancelBtn = modal.querySelector('[data-act="cancel"]');
        const okBtn = modal.querySelector('[data-act="ok"]');
        if (cancelBtn) cancelBtn.addEventListener('click', function () { close(null); });
        if (okBtn) okBtn.addEventListener('click', function () {
            const v = input ? String(input.value || '') : '';
            close(v);
        });
    });
}

function openChatSettingsInlineConfirm(options) {
    const opts = options && typeof options === 'object' ? options : {};
    return new Promise(function (resolve) {
        const old = document.getElementById('chat-settings-inline-confirm-modal');
        if (old) old.remove();
        const title = escapeChatSettingsHtml(opts.title || '提示');
        const message = escapeChatSettingsHtml(opts.message || '');
        const okText = escapeChatSettingsHtml(opts.okText || '确定');
        const cancelText = escapeChatSettingsHtml(opts.cancelText || '取消');
        const modal = document.createElement('div');
        modal.id = 'chat-settings-inline-confirm-modal';
        modal.className = 'fixed inset-0 z-[10060] flex items-center justify-center bg-black/35 p-6';
        modal.innerHTML = ''
            + '<div class="w-full max-w-[420px] bg-white rounded-2xl overflow-hidden shadow-2xl">'
            + '  <div class="px-4 py-3 border-b border-gray-100 text-[16px] font-semibold text-gray-900">' + title + '</div>'
            + '  <div class="px-4 py-4 text-[14px] text-gray-700 leading-relaxed">' + message + '</div>'
            + '  <div class="flex border-t border-gray-100">'
            + '    <button type="button" class="flex-1 h-11 text-[15px] text-gray-500 active:bg-gray-50" data-act="cancel">' + cancelText + '</button>'
            + '    <button type="button" class="flex-1 h-11 text-[15px] text-[#007AFF] font-semibold active:bg-blue-50 border-l border-gray-100" data-act="ok">' + okText + '</button>'
            + '  </div>'
            + '</div>';
        document.body.appendChild(modal);
        const close = function (result) {
            try { modal.remove(); } catch (e) { }
            resolve(!!result);
        };
        modal.addEventListener('click', function (e) {
            if (e.target === modal) close(false);
        });
        const cancelBtn = modal.querySelector('[data-act="cancel"]');
        const okBtn = modal.querySelector('[data-act="ok"]');
        if (cancelBtn) cancelBtn.addEventListener('click', function () { close(false); });
        if (okBtn) okBtn.addEventListener('click', function () { close(true); });
    });
}

async function chatSettingsPromptText(title, defaultValue, placeholder, multiline) {
    const t = String(title || '').trim() || '请输入';
    const d = defaultValue == null ? '' : String(defaultValue);
    if (typeof window.chatUiPrompt === 'function') {
        try {
            return await window.chatUiPrompt(t, d, { title: t, placeholder: String(placeholder || '') });
        } catch (e) { }
    }
    return openChatSettingsInlineInput({
        title: t,
        value: d,
        placeholder: String(placeholder || ''),
        multiline: !!multiline
    });
}

async function chatSettingsAlert(message, title) {
    const t = String(title || '提示').trim() || '提示';
    const m = String(message || '').trim();
    if (typeof window.chatUiAlert === 'function') {
        try {
            await window.chatUiAlert(m, { title: t });
            return;
        } catch (e) { }
    }
    await openChatSettingsInlineConfirm({ title: t, message: m, okText: '我知道了', cancelText: '关闭' });
}

async function chatSettingsConfirm(message, title, okText) {
    const t = String(title || '请确认').trim() || '请确认';
    const m = String(message || '').trim();
    if (typeof window.chatUiConfirm === 'function') {
        try {
            return await window.chatUiConfirm(m, { title: t, okText: String(okText || '确定'), cancelText: '取消' });
        } catch (e) { }
    }
    return openChatSettingsInlineConfirm({ title: t, message: m, okText: String(okText || '确定'), cancelText: '取消' });
}

window.chatSettingsEditGroupName = async function () {
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    const p = getChatSettingsProfile(roleId);
    const next = await chatSettingsPromptText('群名称', p.nickName || p.name || '');
    if (next == null) return;
    const value = String(next).trim();
    if (!value) return;
    p.name = value;
    p.nickName = value;
    if (typeof window.saveData === 'function') window.saveData();
    if (typeof window.loadWechatChatList === 'function') window.loadWechatChatList(true);
    if (typeof window.GroupChat === 'object' && window.GroupChat) {
        try {
            const members = typeof window.GroupChat.getGroupDisplayMembers === 'function'
                ? (window.GroupChat.getGroupDisplayMembers(roleId) || [])
                : (window.GroupChat.getGroupMembers(roleId) || []);
            const titleEl = document.getElementById('current-chat-name');
            if (titleEl) titleEl.textContent = value + ' (' + members.length + ')';
        } catch (e) { }
    }
    if (typeof window.renderChatSettingsPanel === 'function') window.renderChatSettingsPanel(roleId);
};

window.chatSettingsEditGroupRemark = async function () {
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    const p = getChatSettingsProfile(roleId);
    const next = await chatSettingsPromptText('群备注', p.groupRemark || '');
    if (next == null) return;
    p.groupRemark = String(next).trim();
    if (typeof window.saveData === 'function') window.saveData();
    if (typeof window.renderChatSettingsPanel === 'function') window.renderChatSettingsPanel(roleId);
};

window.chatSettingsEditGroupAnnouncement = async function () {
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    const p = getChatSettingsProfile(roleId);
    const next = await chatSettingsPromptText('群公告', p.groupAnnouncement || '', '请输入群公告', true);
    if (next == null) return;
    p.groupAnnouncement = String(next).trim();
    if (typeof window.saveData === 'function') window.saveData();
    if (typeof window.renderChatSettingsPanel === 'function') window.renderChatSettingsPanel(roleId);
};

window.chatSettingsEditMyGroupNickname = async function () {
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    if (!window.userPersonas || typeof window.userPersonas !== 'object') window.userPersonas = {};
    const me = window.userPersonas[roleId] && typeof window.userPersonas[roleId] === 'object' ? window.userPersonas[roleId] : {};
    const next = await chatSettingsPromptText('我在本群昵称', me.groupNickname || me.nickname || me.name || '');
    if (next == null) return;
    const v = String(next).trim();
    me.groupNickname = v;
    window.userPersonas[roleId] = me;
    if (typeof window.saveData === 'function') window.saveData();
    if (typeof window.renderChatSettingsPanel === 'function') window.renderChatSettingsPanel(roleId);
};

window.chatSettingsOpenMemberInvite = function () {
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    const memberIds = getGroupMemberIds(roleId);
    const candidates = getNonGroupCharacters().filter(function (c) { return memberIds.indexOf(c.roleId) === -1; });
    openGroupMemberPicker({
        title: '邀请成员',
        confirmText: '邀请',
        items: candidates,
        initialSelected: [],
        onConfirm: function (selectedIds) {
            const next = normalizeMemberIds(memberIds.concat(selectedIds || []));
            if (next.length < 2) {
                chatSettingsAlert('群聊至少需要 2 位成员。', '无法邀请');
                return;
            }
            const p = getChatSettingsProfile(roleId);
            p.memberIds = next;
            if (!p.avatar && next.length) {
                const first = getChatSettingsProfile(next[0]);
                if (first && first.avatar) p.avatar = first.avatar;
            }
            if (typeof window.saveData === 'function') window.saveData();
            if (typeof window.loadWechatChatList === 'function') window.loadWechatChatList(true);
            if (typeof window.renderChatSettingsPanel === 'function') window.renderChatSettingsPanel(roleId);
        }
    });
};

window.chatSettingsOpenMemberRemove = function () {
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    const memberIds = getGroupMemberIds(roleId);
    const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
    const current = memberIds.map(function (id) {
        const p = profiles[id] || {};
        return { roleId: id, name: getRoleDisplayName(p, id), avatar: p.avatar || 'assets/chushitouxiang.jpg' };
    });
    openGroupMemberPicker({
        title: '移除成员',
        confirmText: '移除',
        items: current,
        initialSelected: [],
        onConfirm: function (selectedIds) {
            const removeSet = new Set((selectedIds || []).map(function (x) { return String(x || '').trim(); }).filter(Boolean));
            const next = memberIds.filter(function (id) { return !removeSet.has(id); });
            if (next.length < 2) {
                chatSettingsAlert('群聊至少需要保留 2 位成员。', '无法移除');
                return;
            }
            const p = getChatSettingsProfile(roleId);
            p.memberIds = next;
            if (typeof window.saveData === 'function') window.saveData();
            if (typeof window.loadWechatChatList === 'function') window.loadWechatChatList(true);
            if (typeof window.renderChatSettingsPanel === 'function') window.renderChatSettingsPanel(roleId);
        }
    });
};

window.chatSettingsToggleGroupDnd = function (checked) {
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    const p = getChatSettingsProfile(roleId);
    p.doNotDisturb = !!checked;
    if (typeof window.saveData === 'function') window.saveData();
    if (typeof window.loadWechatChatList === 'function') window.loadWechatChatList(true);
};

window.chatSettingsToggleGroupPin = function (checked) {
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    const p = getChatSettingsProfile(roleId);
    p.isPinned = !!checked;
    if (typeof window.saveData === 'function') window.saveData();
    if (typeof window.loadWechatChatList === 'function') window.loadWechatChatList(true);
};

function collectWorldbookSelection(container) {
    if (!container) return [];
    const selected = Array.from(container.querySelectorAll('input[name="wb-checkbox"]:checked'))
        .map(function (cb) { return String(cb.value || '').trim(); })
        .filter(Boolean);
    return selected;
}

function pushChatSettingsPage(renderer) {
    if (typeof renderer !== 'function') return;
    chatSettingsPageState.stack.push(renderer);
}

function popChatSettingsPage() {
    if (!chatSettingsPageState.stack.length) return false;
    chatSettingsPageState.stack.pop();
    const top = chatSettingsPageState.stack[chatSettingsPageState.stack.length - 1];
    if (typeof top === 'function') top();
    return true;
}

window.chatSettingsHandleBack = function () {
    if (popChatSettingsPage()) return;
    if (typeof window.closeSettingsMenu === 'function') {
        window.closeSettingsMenu();
    } else {
        const menu = document.getElementById('settings-menu-modal');
        if (menu) menu.style.display = 'none';
    }
};

window.chatSettingsPickGroupAvatar = function () {
    const input = document.getElementById('group-avatar-upload-input');
    if (input) input.click();
};

window.chatSettingsHandleGroupAvatarUpload = function (inputEl) {
    const input = inputEl;
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    const profile = getChatSettingsProfile(roleId);
    const reader = new FileReader();
    reader.onload = function (e) {
        const dataUrl = e && e.target ? String(e.target.result || '') : '';
        if (!dataUrl) return;
        profile.avatar = dataUrl;
        if (typeof window.saveData === 'function') window.saveData();
        if (typeof window.loadWechatChatList === 'function') window.loadWechatChatList(true);
        if (typeof window.renderChatSettingsPanel === 'function') window.renderChatSettingsPanel(roleId);
    };
    reader.readAsDataURL(file);
    try { input.value = ''; } catch (e) { }
};

window.chatSettingsToggleGroupTitleEnabled = function (checked) {
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    const profile = getChatSettingsProfile(roleId);
    profile.groupTitleEnabled = !!checked;
    if (typeof window.saveData === 'function') window.saveData();
    if (typeof window.renderChatSettingsGroupManagePage === 'function') window.renderChatSettingsGroupManagePage();
};

window.chatSettingsSetGroupTitle = async function () {
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    pushChatSettingsPage(window.renderChatSettingsGroupTitlePage);
    window.renderChatSettingsGroupTitlePage();
};

window.renderChatSettingsGroupTitlePage = function () {
    const rid = String(window.currentChatRole || '').trim();
    const body = document.getElementById('chat-settings-body');
    if (!body || !rid) return;
    const profile = getChatSettingsProfile(rid);
    const memberIds = getGroupMemberIds(rid);
    const meDisplay = getGroupSelfDisplay(rid);
    const allMembers = ['me'].concat(memberIds);
    const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
    
    const ownerId = String(profile.groupOwnerId || 'me').trim() || 'me';
    const adminIds = Array.isArray(profile.groupAdminIds) ? profile.groupAdminIds : [];
    const memberTitles = profile.groupMemberTitles || {};

    setChatSettingsHeaderTitle('设置群头衔');
    
    const list = allMembers.map(function (id) {
        let name, avatar, roleText, roleColor;
        if (id === 'me') {
            name = escapeChatSettingsHtml(meDisplay.name || '我');
            avatar = escapeChatSettingsHtml(meDisplay.avatar || 'assets/chushitouxiang.jpg');
        } else {
            const p = profiles[id] || {};
            name = escapeChatSettingsHtml(getRoleDisplayName(p, id));
            avatar = escapeChatSettingsHtml(p.avatar || 'assets/chushitouxiang.jpg');
        }
        
        if (id === ownerId) {
            roleText = '群主';
            roleColor = 'text-[#F5A623] bg-[#F5A623]/10 border-[#F5A623]/20'; // 金色
        } else if (adminIds.includes(id)) {
            roleText = '管理员';
            roleColor = 'text-[#34C759] bg-[#34C759]/10 border-[#34C759]/20'; // 绿色
        } else {
            roleText = '成员';
            roleColor = 'text-[#AF52DE] bg-[#AF52DE]/10 border-[#AF52DE]/20'; // 紫色
        }

        const currentTitle = escapeChatSettingsHtml(memberTitles[id] || '');

        return ''
            + '<div class="flex flex-col px-4 py-3 border-b border-gray-100 last:border-0">'
            + '  <div class="flex justify-between items-center mb-2">'
            + '    <div class="flex items-center gap-3 min-w-0">'
            + '      <img src="' + avatar + '" class="w-10 h-10 rounded-full object-cover bg-gray-100">'
            + '      <div class="text-[15px] text-gray-900 truncate font-medium">' + name + '</div>'
            + '      <div class="px-1.5 py-0.5 text-[10px] rounded border ' + roleColor + '">' + roleText + '</div>'
            + '    </div>'
            + '    <button type="button" class="text-[13px] text-[#007AFF] bg-[#007AFF]/10 px-3 py-1.5 rounded-full active:bg-[#007AFF]/20" onclick="chatSettingsEditMemberTitle(\'' + escapeChatSettingsHtml(id) + '\')">修改</button>'
            + '  </div>'
            + '  <div class="text-[13px] text-gray-500 flex items-center gap-2">'
            + '    <span class="text-gray-400">当前头衔：</span>'
            + '    <span class="' + (currentTitle ? 'text-gray-800' : 'text-gray-300') + '">' + (currentTitle || '未设置') + '</span>'
            + '  </div>'
            + '</div>';
    }).join('');

    body.innerHTML = ''
        + '<div class="space-y-4 pb-10">'
        + '  <div class="text-[13px] text-gray-500 px-4 mt-2 mb-1">修改后会立即插入系统消息，群成员不会自动回复，需手动点击回复按钮。</div>'
        + '  <div class="bg-white rounded-xl overflow-hidden shadow-sm">'
        + list
        + '  </div>'
        + '</div>';
};

window.chatSettingsEditMemberTitle = async function (memberId) {
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    const profile = getChatSettingsProfile(roleId);
    if (!profile.groupMemberTitles) profile.groupMemberTitles = {};
    
    let name = '我';
    if (memberId !== 'me') {
        const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
        const p = profiles[memberId] || {};
        name = getRoleDisplayName(p, memberId);
    }
    
    const current = String(profile.groupMemberTitles[memberId] || '').trim();
    const next = await chatSettingsPromptText('设置群头衔', current, '为「' + name + '」设置专属头衔（留空为取消）');
    if (next == null) return;
    
    const newTitle = String(next).trim();
    if (newTitle === current) return;
    
    if (newTitle) {
        profile.groupMemberTitles[memberId] = newTitle;
    } else {
        delete profile.groupMemberTitles[memberId];
    }
    
    if (typeof window.saveData === 'function') window.saveData();
    if (typeof window.renderChatSettingsGroupTitlePage === 'function') window.renderChatSettingsGroupTitlePage();
    
    // 发送系统消息
    const actionText = newTitle ? ('将「' + name + '」的头衔设置为：' + newTitle) : ('取消了「' + name + '」的头衔');
    const myName = getGroupSelfDisplay(roleId).name || '我';
    await pushGroupManagementSystemMessage(roleId, '系统提示：' + myName + ' ' + actionText);
};

window.chatSettingsSetGroupAdmins = function () {
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    const memberIds = getGroupMemberIds(roleId);
    const profile = getChatSettingsProfile(roleId);
    const ownerId = String(profile.groupOwnerId || 'me').trim() || 'me';
    const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
    const candidates = memberIds.filter(function (id) { return id !== ownerId; }).map(function (id) {
        const p = profiles[id] || {};
        return { roleId: id, name: getRoleDisplayName(p, id), avatar: p.avatar || 'assets/chushitouxiang.jpg' };
    });
    const currentAdmins = Array.isArray(profile.groupAdminIds) ? profile.groupAdminIds.map(function (id) { return String(id || '').trim(); }).filter(Boolean) : [];
    openGroupMemberPicker({
        title: '设置管理员',
        confirmText: '保存',
        items: candidates,
        initialSelected: currentAdmins,
        onConfirm: function (selectedIds) {
            profile.groupAdminIds = Array.from(new Set((selectedIds || []).map(function (id) { return String(id || '').trim(); }).filter(Boolean)));
            if (typeof window.saveData === 'function') window.saveData();
            if (typeof window.renderChatSettingsGroupManagePage === 'function') window.renderChatSettingsGroupManagePage();
        }
    });
};

window.chatSettingsTransferOwner = function () {
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    const memberIds = getGroupMemberIds(roleId);
    const profile = getChatSettingsProfile(roleId);
    const ownerId = String(profile.groupOwnerId || 'me').trim() || 'me';
    const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
    const candidates = memberIds.filter(function (id) { return id !== ownerId; }).map(function (id) {
        const p = profiles[id] || {};
        return { roleId: id, name: getRoleDisplayName(p, id), avatar: p.avatar || 'assets/chushitouxiang.jpg' };
    });
    openGroupMemberPicker({
        title: '转让群主',
        confirmText: '转让',
        items: candidates,
        initialSelected: [],
        onConfirm: async function (selectedIds) {
            const target = Array.isArray(selectedIds) && selectedIds.length ? String(selectedIds[0] || '').trim() : '';
            if (!target) return;
            const targetName = getRoleDisplayName(profiles[target] || {}, target);
            const ok = await chatSettingsConfirm('确认将群主转让给「' + targetName + '」吗？', '转让群主', '确认转让');
            if (!ok) return;
            profile.groupOwnerId = target;
            if (typeof window.saveData === 'function') window.saveData();
            if (typeof window.renderChatSettingsGroupManagePage === 'function') window.renderChatSettingsGroupManagePage();
        }
    });
};

window.chatSettingsToggleMuteAll = async function (checked) {
    const roleId = String(window.currentChatRole || '').trim();
    if (!roleId) return;
    const profile = ensureGroupMuteStateProfile(getChatSettingsProfile(roleId));
    profile.groupMuteAll = { enabled: !!checked, until: null };
    if (typeof window.saveData === 'function') await window.saveData();
    if (typeof window.renderChatSettingsGroupMutePage === 'function') window.renderChatSettingsGroupMutePage();
    await pushGroupManagementSystemMessage(roleId, checked ? '你开启了全员禁言' : '你关闭了全员禁言');
};

window.chatSettingsClearMuteMember = async function (memberId) {
    const roleId = String(window.currentChatRole || '').trim();
    const mid = String(memberId || '').trim();
    if (!roleId || !mid) return;
    const profile = ensureGroupMuteStateProfile(getChatSettingsProfile(roleId));
    const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
    const name = getRoleDisplayName(profiles[mid] || {}, mid);
    if (profile.groupMutedMembers && profile.groupMutedMembers[mid]) {
        delete profile.groupMutedMembers[mid];
    }
    if (typeof window.saveData === 'function') await window.saveData();
    if (!popChatSettingsPage() && typeof window.renderChatSettingsGroupMuteMembersPage === 'function') {
        window.renderChatSettingsGroupMuteMembersPage();
    }
    await pushGroupManagementSystemMessage(roleId, '你解除了' + name + '的禁言');
};

window.chatSettingsSetMuteMemberDuration = async function (memberId, durationMs, durationLabel) {
    const roleId = String(window.currentChatRole || '').trim();
    const mid = String(memberId || '').trim();
    if (!roleId || !mid) return;
    const profile = ensureGroupMuteStateProfile(getChatSettingsProfile(roleId));
    const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
    const name = getRoleDisplayName(profiles[mid] || {}, mid);
    profile.groupMutedMembers[mid] = {
        until: durationMs == null ? null : (Date.now() + Number(durationMs))
    };
    if (typeof window.saveData === 'function') await window.saveData();
    if (!popChatSettingsPage() && typeof window.renderChatSettingsGroupMuteMembersPage === 'function') {
        window.renderChatSettingsGroupMuteMembersPage();
    }
    await pushGroupManagementSystemMessage(roleId, '你将' + name + '禁言' + String(durationLabel || '').trim());
};

window.renderChatSettingsGroupMuteDurationPage = function (memberId) {
    const rid = String(window.currentChatRole || '').trim();
    const mid = String(memberId || '').trim();
    const body = document.getElementById('chat-settings-body');
    if (!body || !rid || !mid) return;
    const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
    const memberProfile = profiles[mid] || {};
    const name = escapeChatSettingsHtml(getRoleDisplayName(memberProfile, mid));
    const avatar = escapeChatSettingsHtml(memberProfile.avatar || 'assets/chushitouxiang.jpg');
    const muteRecord = getActiveGroupMemberMuteRecord(getChatSettingsProfile(rid), mid);
    const currentText = muteRecord ? formatMuteRemaining(muteRecord.until) : '未禁言';
    const presetRows = getGroupMuteDurationPresets().map(function (item) {
        const label = escapeChatSettingsHtml(item.label);
        return ''
            + '<button type="button" class="w-full flex justify-between items-center px-4 py-3 active:bg-gray-50" onclick="chatSettingsSetMuteMemberDuration(\'' + escapeChatSettingsHtml(mid) + '\',' + (item.durationMs == null ? 'null' : String(item.durationMs)) + ',\'' + label + '\')">'
            + '  <span class="text-[15px] text-gray-900">' + label + '</span>'
            + '  <span class="text-gray-300 text-[20px] leading-none">›</span>'
            + '</button>';
    }).join('');
    setChatSettingsHeaderTitle('设置禁言时长');
    body.innerHTML = ''
        + '<div class="space-y-4">'
        + '  <div class="bg-white rounded-xl overflow-hidden shadow-sm">'
        + '    <div class="flex items-center gap-3 px-4 py-4 border-b border-gray-100">'
        + '      <img src="' + avatar + '" class="w-11 h-11 rounded-full object-cover bg-gray-100">'
        + '      <div class="min-w-0 flex-1">'
        + '        <div class="text-[15px] text-gray-900 font-medium truncate">' + name + '</div>'
        + '        <div class="text-[13px] text-gray-400 mt-1">当前状态：' + escapeChatSettingsHtml(currentText) + '</div>'
        + '      </div>'
        + '    </div>'
        + presetRows
        + (muteRecord
            ? '<button type="button" class="w-full flex justify-between items-center px-4 py-3 active:bg-gray-50" onclick="chatSettingsClearMuteMember(\'' + escapeChatSettingsHtml(mid) + '\')"><span class="text-[15px] text-[#FF3B30]">解除禁言</span><span class="text-gray-300 text-[20px] leading-none">›</span></button>'
            : '')
        + '  </div>'
        + '</div>';
};

window.renderChatSettingsGroupMuteMembersPage = function () {
    const rid = String(window.currentChatRole || '').trim();
    const body = document.getElementById('chat-settings-body');
    if (!body || !rid) return;
    const profile = ensureGroupMuteStateProfile(getChatSettingsProfile(rid));
    const memberIds = getGroupMemberIds(rid);
    const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
    setChatSettingsHeaderTitle('选择要禁言的人');
    const list = memberIds.map(function (id) {
        const p = profiles[id] || {};
        const name = escapeChatSettingsHtml(getRoleDisplayName(p, id));
        const avatar = escapeChatSettingsHtml(p.avatar || 'assets/chushitouxiang.jpg');
        const muteRecord = getActiveGroupMemberMuteRecord(profile, id);
        const statusText = muteRecord ? formatMuteRemaining(muteRecord.until) : '未禁言';
        const statusClass = muteRecord ? 'text-[#FF3B30]' : 'text-gray-400';
        return ''
            + '<button type="button" class="w-full flex justify-between items-center px-4 py-3 active:bg-gray-50" onclick="(function(){pushChatSettingsPage(function(){window.renderChatSettingsGroupMuteDurationPage(\'' + escapeChatSettingsHtml(id) + '\');});window.renderChatSettingsGroupMuteDurationPage(\'' + escapeChatSettingsHtml(id) + '\');})();">'
            + '  <div class="flex items-center gap-3 min-w-0">'
            + '    <img src="' + avatar + '" class="w-10 h-10 rounded-full object-cover bg-gray-100">'
            + '    <div class="text-[15px] text-gray-900 truncate">' + name + '</div>'
            + '  </div>'
            + '  <div class="flex items-center gap-2">'
            + '    <span class="text-[13px] ' + statusClass + '">' + escapeChatSettingsHtml(statusText) + '</span>'
            + '    <span class="text-gray-300 text-[20px] leading-none">›</span>'
            + '  </div>'
            + '</button>';
    }).join('');
    body.innerHTML = ''
        + '<div class="space-y-4">'
        + '  <div class="bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-gray-200">'
        + (list || '<div class="px-4 py-8 text-center text-[13px] text-gray-400">暂无群成员</div>')
        + '  </div>'
        + '</div>';
};

window.renderChatSettingsGroupMutePage = function () {
    const rid = String(window.currentChatRole || '').trim();
    const body = document.getElementById('chat-settings-body');
    if (!body || !rid) return;
    const profile = ensureGroupMuteStateProfile(getChatSettingsProfile(rid));
    const muteAllRecord = getActiveGroupMuteAllRecord(profile);
    setChatSettingsHeaderTitle('群内禁言');
    body.innerHTML = ''
        + '<div class="space-y-4">'
        + '  <div class="bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-gray-200">'
        + '    <div class="flex justify-between items-center px-4 py-3">'
        + '      <div class="min-w-0 pr-4">'
        + '        <div class="text-[15px] text-gray-900">始终禁言</div>'
        + '        <div class="text-[12px] text-gray-400 mt-1">开启后，本群所有 AI 成员都只能等你手动解除。</div>'
        + '      </div>'
        + '      <label class="relative inline-flex items-center cursor-pointer">'
        + '        <input id="group-mute-all-switch" type="checkbox" class="sr-only peer" onchange="chatSettingsToggleMuteAll(this.checked)">'
        + '        <div class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#34C759] transition-colors after:content-[\'\'] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow after:transition-transform peer-checked:after:translate-x-5"></div>'
        + '      </label>'
        + '    </div>'
        + '    <button type="button" class="w-full flex justify-between items-center px-4 py-3 active:bg-gray-50" onclick="(function(){pushChatSettingsPage(window.renderChatSettingsGroupMuteMembersPage);window.renderChatSettingsGroupMuteMembersPage();})();">'
        + '      <div class="text-left">'
        + '        <div class="text-[15px] text-gray-900">选择要禁言的人</div>'
        + '        <div class="text-[12px] text-gray-400 mt-1">支持 10 分钟、1 小时、12 小时、1 天或永久禁言。</div>'
        + '      </div>'
        + '      <span class="text-gray-300 text-[20px] leading-none">›</span>'
        + '    </button>'
        + '  </div>'
        + '</div>';
    const allSwitch = document.getElementById('group-mute-all-switch');
    if (allSwitch) allSwitch.checked = !!muteAllRecord;
};

window.renderChatSettingsGroupManagePage = function () {
    const rid = String(window.currentChatRole || '').trim();
    const body = document.getElementById('chat-settings-body');
    if (!body || !rid) return;
    const profile = getChatSettingsProfile(rid);
    const memberIds = getGroupMemberIds(rid);
    if (!profile.groupOwnerId) profile.groupOwnerId = 'me';
    const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
    const ownerName = profile.groupOwnerId === 'me'
        ? escapeChatSettingsHtml(getGroupSelfDisplay(rid).name || '我')
        : escapeChatSettingsHtml(getRoleDisplayName(profiles[profile.groupOwnerId] || {}, profile.groupOwnerId || '群主'));
    setChatSettingsHeaderTitle('群管理');
    const titleSettingRow = profile.groupTitleEnabled
        ? '<button type="button" class="w-full flex justify-between items-center px-4 py-3 active:bg-gray-50" onclick="chatSettingsSetGroupTitle()"><span class="text-[15px] text-gray-900">设置群头衔</span><span class="text-gray-300 text-[20px] leading-none">›</span></button>'
        : '';
    body.innerHTML = ''
        + '<div class="space-y-4">'
        + '  <div class="bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-gray-200">'
        + '    <div class="flex justify-between items-center px-4 py-3">'
        + '      <div class="text-[15px] text-gray-900">群头衔</div>'
        + '      <label class="relative inline-flex items-center cursor-pointer">'
        + '        <input id="group-title-switch" type="checkbox" class="sr-only peer" onchange="chatSettingsToggleGroupTitleEnabled(this.checked)">'
        + '        <div class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#34C759] transition-colors after:content-[\'\'] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow after:transition-transform peer-checked:after:translate-x-5"></div>'
        + '      </label>'
        + '    </div>'
        + titleSettingRow
        + '    <button type="button" class="w-full flex justify-between items-center px-4 py-3 active:bg-gray-50" onclick="chatSettingsSetGroupAdmins()">'
        + '      <span class="text-[15px] text-gray-900">设置管理员</span>'
        + '      <span class="text-gray-300 text-[20px] leading-none">›</span>'
        + '    </button>'
        + '    <button type="button" class="w-full flex justify-between items-center px-4 py-3 active:bg-gray-50" onclick="(function(){pushChatSettingsPage(window.renderChatSettingsGroupMutePage);window.renderChatSettingsGroupMutePage();})();">'
        + '      <span class="text-[15px] text-gray-900">群内禁言</span>'
        + '      <span class="text-gray-300 text-[20px] leading-none">›</span>'
        + '    </button>'
        + '    <button type="button" class="w-full flex justify-between items-center px-4 py-3 active:bg-gray-50" onclick="chatSettingsTransferOwner()">'
        + '      <span class="text-[15px] text-gray-900">转让群主</span>'
        + '      <span class="text-[14px] text-gray-400 max-w-[170px] truncate">当前：' + ownerName + '</span>'
        + '    </button>'
        + '  </div>'
        + '</div>';
    const titleSwitch = document.getElementById('group-title-switch');
    if (titleSwitch) titleSwitch.checked = profile.groupTitleEnabled === true;
};

window.renderChatSettingsGroupPersonalizationPage = function () {
    const rid = String(window.currentChatRole || '').trim();
    const body = document.getElementById('chat-settings-body');
    if (!body || !rid) return;
    rememberChatSettingsRoleId(rid);
    const profile = getChatSettingsProfile(rid);
    const groupAvatar = escapeChatSettingsHtml(profile.avatar || 'assets/chushitouxiang.jpg');
    const meDisplay = getGroupSelfDisplay(rid);
    const myAvatar = escapeChatSettingsHtml(meDisplay.avatar || 'assets/chushitouxiang.jpg');
    setChatSettingsHeaderTitle('群个性化');
    body.innerHTML = ''
        + '<div class="space-y-4">'
        + '  <div class="bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-gray-200">'
        + '    <button type="button" class="w-full flex justify-between items-center px-4 py-3 active:bg-gray-50" onclick="openBgSettingModal()">'
        + '      <div class="text-left">'
        + '        <div class="text-[15px] text-gray-900">聊天背景</div>'
        + '        <div class="text-[12px] text-gray-400 mt-1">仅对当前群聊生效。</div>'
        + '      </div>'
        + '      <span class="text-gray-300 text-[20px] leading-none">›</span>'
        + '    </button>'
        + '  </div>'
        + '  <div class="bg-white rounded-xl overflow-hidden shadow-sm px-4 py-4">'
        + '    <div class="text-[15px] text-gray-900 mb-2">自定义气泡 CSS</div>'
        + '    <div class="text-[12px] text-gray-400 leading-relaxed mb-3">保存后仅当前群的左右气泡会套用这段样式。</div>'
        + '    <div class="bg-[#f2f2f7] rounded-xl p-3 mb-3" id="bubble-preview">'
        + '      <div class="flex items-start gap-2 mb-2">'
        + '        <img src="' + groupAvatar + '" class="w-7 h-7 rounded-lg object-cover bg-gray-200">'
        + '        <div class="preview-bubble-left bg-white px-3 py-2 rounded-lg text-[14px] text-gray-900">群成员：收到，今晚见。</div>'
        + '      </div>'
        + '      <div class="flex items-start justify-end gap-2">'
        + '        <div class="preview-bubble-right bg-[#95EC69] px-3 py-2 rounded-lg text-[14px] text-gray-900">我：那我到时候点回复。</div>'
        + '        <img src="' + myAvatar + '" class="w-7 h-7 rounded-lg object-cover bg-gray-200">'
        + '      </div>'
        + '    </div>'
        + '    <textarea id="setting-bubble-css" class="w-full h-24 rounded-xl border border-gray-200 px-3 py-2 text-[13px] text-gray-900 outline-none" placeholder="输入 CSS（例如：background: #111827; color: #fff; border-radius: 18px;）" oninput="updateBubblePreview();"></textarea>'
        + '    <div class="flex gap-2 mt-3">'
        + '      <button type="button" class="flex-1 h-9 rounded-xl bg-black text-white text-[13px] font-semibold active:opacity-80" data-chat-bubble-action="save">保存</button>'
        + '      <button type="button" class="flex-1 h-9 rounded-xl bg-gray-100 text-gray-800 text-[13px] font-semibold active:bg-gray-200" data-chat-bubble-action="save-preset">保存为预设</button>'
        + '    </div>'
        + '    <button type="button" class="mt-2 text-[12px] text-gray-500 underline" onclick="debugChatBubbleSave()">查看保存诊断</button>'
        + '    <div id="chat-bubble-save-status" class="mt-2 text-[12px] text-[#34C759]" hidden></div>'
        + '    <div id="chat-bubble-preset-list" class="mt-3"></div>'
        + '  </div>'
        + '</div>';
    if (typeof window.initChatSettingsUI === 'function') window.initChatSettingsUI(rid);
    if (typeof window.updateBubblePreview === 'function') window.updateBubblePreview();
};

window.renderChatSettingsPanel = function (roleId) {
    const rid = String(roleId || window.currentChatRole || '').trim();
    const body = document.getElementById('chat-settings-body');
    if (!body || !rid) return;
    rememberChatSettingsRoleId(rid);
    const isGroup = isGroupChatRoleId(rid);
    const profile = getChatSettingsProfile(rid);
    setChatSettingsHeaderTitle('聊天信息');

    const sectionWrapStart = '<div class="bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-gray-200">';
    const sectionWrapEnd = '</div>';

    const row = function (leftHtml, rightHtml, attrs) {
        const extra = attrs ? (' ' + attrs) : '';
        return '<div class="flex justify-between items-center px-4 py-3"' + extra + '>' + leftHtml + rightHtml + '</div>';
    };

    const chevron = '<span class="text-gray-300 text-[20px] leading-none">›</span>';

    if (!isGroup) {
        const name = escapeChatSettingsHtml(getRoleDisplayName(profile, rid));
        const desc = escapeChatSettingsHtml(getRoleDescText(profile));
        const avatar = escapeChatSettingsHtml(profile.avatar || 'assets/chushitouxiang.jpg');

        const group1 = ''
            + sectionWrapStart
            + '<div class="px-4 py-3 cursor-pointer active:bg-gray-50" onclick="openCharacterEditor()">'
            + '  <div class="flex items-center gap-3">'
            + '    <img id="menu-role-avatar" src="' + avatar + '" class="w-14 h-14 rounded-full object-cover bg-gray-100">'
            + '    <div class="flex-1 min-w-0">'
            + '      <div id="menu-role-name" class="text-[16px] font-semibold text-gray-900 truncate">' + name + '</div>'
            + '      <div id="menu-role-desc" class="text-[13px] text-gray-500 truncate">' + desc + '</div>'
            + '    </div>'
            + '    <div class="text-gray-300 text-[20px] leading-none">›</div>'
            + '  </div>'
            + '</div>'
            + row('<div class="text-[15px] text-gray-900">我的当前身份</div>', '<div class="flex items-center gap-2">' + chevron + '</div>', 'onclick="openUserPersonaModal()" class="cursor-pointer active:bg-gray-50"')
            + sectionWrapEnd;

        const group2 = ''
            + sectionWrapStart
            + row(
                '<div class="text-[15px] text-gray-900">单独API</div>',
                '<div class="flex items-center gap-2"><div id="setting-role-api-preset-value" class="text-[14px] text-gray-400">全局</div>' + chevron + '</div>',
                'onclick="openRoleApiPresetModal()" class="cursor-pointer active:bg-gray-50"'
            )
            + row(
                '<div class="text-[15px] text-gray-900">允许角色发朋友圈</div>',
                '<div>' + buildIosSwitchHtml('setting-moments-posting-enabled', 'saveChatSettings()') + '</div>'
            )
            + row(
                '<div class="text-[15px] text-gray-900">允许角色发起线下邀请</div>',
                '<div>' + buildIosSwitchHtml('setting-allow-offline-invite', 'saveChatSettings()') + '</div>'
            )
            + row(
                '<div class="text-[15px] text-gray-900">自动翻译</div>',
                '<div>' + buildIosSwitchHtml('setting-auto-translate-switch', 'saveChatSettings()') + '</div>'
            )
            + row(
                '<div class="text-[15px] text-gray-900">忙时不回消息</div>',
                '<div>' + buildIosSwitchHtml('setting-busy-reply-enabled', 'toggleBusyReplyModeBox(); saveChatSettings();') + '</div>',
                ''
            )
            + '<div class="px-4 py-3" id="setting-busy-reply-mode-box" hidden>'
            + '  <div class="text-[12px] text-gray-500 leading-relaxed mb-2">忙碌或睡觉时，选择角色用系统提示框提醒，还是直接自动回复一句。</div>'
            + '  <div class="flex gap-4 text-[14px] text-gray-800">'
            + '    <label class="flex items-center gap-2"><input type="radio" name="setting-busy-reply-mode" value="system" onchange="saveChatSettings()"><span>系统提示框</span></label>'
            + '    <label class="flex items-center gap-2"><input type="radio" name="setting-busy-reply-mode" value="auto" onchange="saveChatSettings()"><span>自动回复</span></label>'
            + '  </div>'
            + '  <div id="setting-busy-auto-reply-box" class="mt-3" hidden>'
            + '    <div class="flex gap-2 mb-2">'
            + '      <button type="button" class="flex-1 h-10 rounded-xl bg-black text-white text-[14px] font-semibold active:opacity-80" onclick="generateBusyReplyAutoLibrary()">生成自动回复词条</button>'
            + '      <button type="button" class="flex-1 h-10 rounded-xl bg-gray-100 text-gray-800 text-[14px] font-semibold active:opacity-80" onclick="renderBusyReplyAutoLibraryPanel()">刷新词条库</button>'
            + '    </div>'
            + '    <div id="setting-busy-auto-reply-list"></div>'
            + '  </div>'
            + '</div>'
            + sectionWrapEnd;

        const group3 = ''
            + sectionWrapStart
            + row(
                '<div class="text-[15px] text-gray-900">短期记忆条数</div>',
                '<div class="flex items-center gap-2"><input id="setting-memory-limit" type="number" inputmode="numeric" class="w-20 text-right text-[15px] text-gray-900 bg-transparent outline-none" onchange="saveChatSettings()" /></div>'
            )
            + row(
                '<div class="text-[15px] text-gray-900">自动总结</div>',
                '<div>' + buildIosSwitchHtml('setting-auto-summary-switch', 'toggleSummaryInput(); saveChatSettings();') + '</div>'
            )
            + '<div id="setting-summary-freq-box" class="chat-summary-config-box px-4 py-3 hidden" style="display:none;">'
            + '  <div class="chat-summary-frequency-row">'
            + '    <div class="text-[14px] text-gray-600">每多少条总结一次</div>'
            + '    <input id="setting-summary-freq" type="number" inputmode="numeric" class="chat-summary-frequency-input" onchange="saveChatSettings()" oninput="saveChatSettings()" />'
            + '  </div>'
            + '</div>'
            + row('<div class="text-[15px] text-gray-900">记忆档案</div>', '<div class="flex items-center gap-2">' + chevron + '</div>', 'onclick="openMemoryArchiveModal()" class="cursor-pointer active:bg-gray-50"')
            + sectionWrapEnd;

        const group4 = ''
            + sectionWrapStart
            + row('<div class="text-[15px] text-gray-900">长叙事存档</div>', '<div class="flex items-center gap-2">' + chevron + '</div>', 'onclick="openOfflineArchiveModal()" class="cursor-pointer active:bg-gray-50"')
            + row('<div class="text-[15px] text-gray-900">通话记录</div>', '<div class="flex items-center gap-2">' + chevron + '</div>', 'onclick="openCallLogModal()" class="cursor-pointer active:bg-gray-50"')
            + sectionWrapEnd;

        const group5 = ''
            + sectionWrapStart
            + row('<div class="text-[15px] text-gray-900">聊天背景</div>', '<div class="flex items-center gap-2">' + chevron + '</div>', 'onclick="openBgSettingModal()" class="cursor-pointer active:bg-gray-50"')
            + '<div class="px-4 py-3">'
            + '  <div class="text-[15px] text-gray-900 mb-2">定义字体大小</div>'
            + '  <div class="flex items-center gap-3">'
            + '    <input type="range" id="setting-font-size" min="12" max="20" value="15" class="flex-1" oninput="updateChatFontSizePreview(); saveChatSettings();">'
            + '    <div id="setting-font-size-value" class="w-14 text-right text-[13px] text-gray-500">15px</div>'
            + '  </div>'
            + '</div>'
            + '<div class="px-4 py-3">'
            + '  <div class="text-[15px] text-gray-900 mb-2">自定义气泡样式</div>'
            + '  <div class="bg-[#f2f2f7] rounded-xl p-3 mb-3" id="bubble-preview">'
            + '    <div class="flex items-start gap-2 mb-2">'
            + '      <img src="' + avatar + '" class="w-7 h-7 rounded-lg object-cover bg-gray-200">'
            + '      <div class="preview-bubble-left bg-white px-3 py-2 rounded-lg text-[14px] text-gray-900">AI：Hello</div>'
            + '    </div>'
            + '    <div class="flex items-start justify-end gap-2">'
            + '      <div class="preview-bubble-right bg-[#95EC69] px-3 py-2 rounded-lg text-[14px] text-gray-900">我：Hello</div>'
            + '      <img src="assets/chushitouxiang.jpg" class="w-7 h-7 rounded-lg object-cover bg-gray-200">'
            + '    </div>'
            + '  </div>'
            + '  <textarea id="setting-bubble-css" class="w-full h-20 rounded-xl border border-gray-200 px-3 py-2 text-[13px] text-gray-900 outline-none" placeholder="输入 CSS（例如：background: pink; color: white;）" oninput="updateBubblePreview();"></textarea>'
            + '  <div class="flex gap-2 mt-3">'
            + '    <button type="button" class="flex-1 h-9 rounded-xl bg-black text-white text-[13px] font-semibold active:opacity-80" data-chat-bubble-action="save">保存</button>'
            + '    <button type="button" class="flex-1 h-9 rounded-xl bg-gray-100 text-gray-800 text-[13px] font-semibold active:bg-gray-200" data-chat-bubble-action="save-preset">保存为预设</button>'
            + '  </div>'
            + '  <button type="button" class="mt-2 text-[12px] text-gray-500 underline" onclick="debugChatBubbleSave()">查看保存诊断</button>'
            + '  <div id="chat-bubble-save-status" class="mt-2 text-[12px] text-[#34C759]" hidden></div>'
            + '  <div id="chat-bubble-preset-list" class="mt-3"></div>'
            + '</div>'
            + sectionWrapEnd;

        const footer = ''
            + '<div class="bg-white rounded-xl overflow-hidden shadow-sm">'
            + '  <button type="button" class="w-full px-4 py-3 text-left text-[15px] text-[#FF3B30] active:bg-gray-50" onclick="clearChatHistory()">清空聊天记录</button>'
            + '</div>';

        body.innerHTML = ''
            + '<div class="space-y-4">'
            + group1
            + group2
            + group3
            + group4
            + group5
            + footer
            + '</div>';

        const settings = getCurrentChatSettings(rid);
        const apiValueEl = document.getElementById('setting-role-api-preset-value');
        if (apiValueEl && typeof window.getCurrentRoleApiPresetValueText === 'function') {
            try { apiValueEl.textContent = window.getCurrentRoleApiPresetValueText(rid); } catch (e) { }
        }
        if (typeof window.initChatSettingsUI === 'function') window.initChatSettingsUI(rid);
        if (typeof window.updateBubblePreview === 'function') window.updateBubblePreview();
        if (typeof window.updateChatFontSizePreview === 'function') window.updateChatFontSizePreview();
        if (settings && typeof settings.busyReplyEnabled === 'boolean') {
            try { window.toggleBusyReplyModeBox(); } catch (e) { }
        }
        return;
    }

    const groupName = escapeChatSettingsHtml(String(profile.nickName || profile.name || '群聊').trim() || '群聊');
    const groupAvatar = escapeChatSettingsHtml(profile.avatar || 'assets/chushitouxiang.jpg');
    const members = getGroupDisplayMembersForSettings(rid).map(function (member) {
        return {
            roleId: String(member.roleId || '').trim(),
            name: escapeChatSettingsHtml(String(member.name || '').trim() || (String(member.roleId || '') === 'me' ? '我' : '未命名成员')),
            avatar: escapeChatSettingsHtml(member.avatar || 'assets/chushitouxiang.jpg')
        };
    });
    const me = getGroupSelfDisplay(rid);
    const myNick = escapeChatSettingsHtml(String((window.userPersonas && window.userPersonas[rid] && window.userPersonas[rid].groupNickname) || '').trim());
    const msgCount = window.chatData && Array.isArray(window.chatData[rid]) ? window.chatData[rid].length : 0;

    const memberGrid = ''
        + '<div class="grid grid-cols-5 gap-3 px-4 pt-3 pb-4">'
        + members.map(function (m) {
            return ''
                + '<div class="flex flex-col items-center gap-1">'
                + '  <img src="' + m.avatar + '" class="w-12 h-12 rounded-full object-cover bg-gray-100">'
                + '  <div class="w-full text-center text-[11px] text-gray-700 truncate">' + m.name + '</div>'
                + '</div>';
        }).join('')
        + '<button type="button" class="flex flex-col items-center gap-1 active:opacity-70" onclick="chatSettingsOpenMemberInvite()">'
        + '  <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-[26px] text-gray-500">+</div>'
        + '  <div class="w-full text-center text-[11px] text-gray-500 truncate">邀请</div>'
        + '</button>'
        + '<button type="button" class="flex flex-col items-center gap-1 active:opacity-70" onclick="chatSettingsOpenMemberRemove()">'
        + '  <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-[26px] text-gray-500">−</div>'
        + '  <div class="w-full text-center text-[11px] text-gray-500 truncate">移除</div>'
        + '</button>'
        + '</div>';

    const group1 = ''
        + sectionWrapStart
        + '<div class="px-4 pt-5 pb-2">'
        + '  <div class="flex flex-col items-center text-center">'
        + '    <button type="button" class="p-0 border-0 bg-transparent active:opacity-80" onclick="chatSettingsPickGroupAvatar()">'
        + '      <img src="' + groupAvatar + '" class="w-24 h-24 rounded-full object-cover bg-gray-100">'
        + '    </button>'
        + '    <input id="group-avatar-upload-input" type="file" accept="image/*" class="hidden" onchange="chatSettingsHandleGroupAvatarUpload(this)">'
        + '    <div class="mt-3 text-[18px] font-semibold text-gray-900">' + groupName + '</div>'
        + '  </div>'
        + '</div>'
        + memberGrid
        + '<div class="px-4 pb-4">'
        + '  <div class="flex items-center justify-between mb-2">'
        + '    <div class="font-semibold text-[15px] text-gray-900 flex items-center gap-2">'
        + '      <span>关联世界书</span>'
        + '      <button type="button" data-wb-target="group-worldbook-container" aria-expanded="false" onclick="toggleWorldBookAssociatePanel(this)" class="text-gray-500 text-[14px]">▸</button>'
        + '    </div>'
        + '  </div>'
        + '  <div id="group-worldbook-container" class="text-left outline-none border-none bg-transparent text-gray-800 w-full" style="max-height:180px; overflow-y:auto; padding:10px 12px; border:1px solid rgba(0,0,0,0.12); border-radius:14px; background:rgba(0,0,0,0.02);"></div>'
        + '</div>'
        + sectionWrapEnd;

    const group2 = ''
        + sectionWrapStart
        + row(
            '<div class="text-[15px] text-gray-900">群名称</div>',
            '<div class="flex items-center gap-2"><div class="text-[14px] text-gray-400 max-w-[160px] truncate">' + groupName + '</div>' + chevron + '</div>',
            'onclick="chatSettingsEditGroupName()" class="cursor-pointer active:bg-gray-50"'
        )
        + row(
            '<div class="text-[15px] text-gray-900">群备注</div>',
            '<div class="flex items-center gap-2"><div class="text-[14px] text-gray-400 max-w-[160px] truncate">' + escapeChatSettingsHtml(String(profile.groupRemark || '').trim()) + '</div>' + chevron + '</div>',
            'onclick="chatSettingsEditGroupRemark()" class="cursor-pointer active:bg-gray-50"'
        )
        + '<div class="px-4 py-3 cursor-pointer active:bg-gray-50" onclick="chatSettingsEditGroupAnnouncement()">'
        + '  <div class="flex justify-between items-start gap-3">'
        + '    <div class="text-[15px] text-gray-900">群公告</div>'
        + '    <div class="flex items-start gap-2">'
        + '      <div class="text-[13px] text-gray-400 leading-relaxed max-w-[220px] whitespace-pre-line line-clamp-3">' + escapeChatSettingsHtml(String(profile.groupAnnouncement || '').trim()) + '</div>'
        + '      ' + chevron
        + '    </div>'
        + '  </div>'
        + '</div>'
        + row(
            '<div class="text-[15px] text-gray-900">群管理</div>',
            '<div class="flex items-center gap-2">' + chevron + '</div>',
            'onclick="(function(){pushChatSettingsPage(window.renderChatSettingsGroupManagePage);window.renderChatSettingsGroupManagePage();})();" class="cursor-pointer active:bg-gray-50"'
        )
        + sectionWrapEnd;

    const group3 = ''
        + sectionWrapStart
        + row('<div class="text-[15px] text-gray-900">我的身份</div>', '<div class="flex items-center gap-2">' + chevron + '</div>', 'onclick="openUserPersonaModal()" class="cursor-pointer active:bg-gray-50"')
        + row(
            '<div class="text-[15px] text-gray-900">我在本群的昵称</div>',
            '<div class="flex items-center gap-2"><div class="text-[14px] text-gray-400 max-w-[160px] truncate">' + (myNick || escapeChatSettingsHtml(me.name || '未设置')) + '</div>' + chevron + '</div>',
            'onclick="chatSettingsEditMyGroupNickname()" class="cursor-pointer active:bg-gray-50"'
        )
        + sectionWrapEnd;

    const group4 = ''
        + sectionWrapStart
        + row(
            '<div class="text-[15px] text-gray-900">短期记忆条数</div>',
            '<div class="flex items-center gap-2"><input id="setting-memory-limit" type="number" inputmode="numeric" class="w-20 text-right text-[15px] text-gray-900 bg-transparent outline-none" onchange="saveChatSettings()" /></div>'
        )
        + row(
            '<div class="text-[15px] text-gray-900">跨窗口记忆条数</div>',
            '<div class="flex items-center gap-2"><input id="setting-memory-archive-lines" type="number" inputmode="numeric" class="w-20 text-right text-[15px] text-gray-900 bg-transparent outline-none" onchange="saveChatSettings()" /></div>'
        )
        + row(
            '<div class="text-[15px] text-gray-900">当前对话总条数</div>',
            '<div class="text-[14px] text-gray-400">' + escapeChatSettingsHtml(String(msgCount)) + '</div>'
        )
        + sectionWrapEnd;

    const group5 = ''
        + sectionWrapStart
        + row(
            '<div class="text-[15px] text-gray-900">设为置顶</div>',
            '<div>' + buildIosSwitchHtml('setting-pin-switch', 'chatSettingsToggleGroupPin(this.checked)') + '</div>'
        )
        + row(
            '<div class="text-[15px] text-gray-900">个性化</div>',
            '<div class="flex items-center gap-2">' + chevron + '</div>',
            'onclick="(function(){pushChatSettingsPage(window.renderChatSettingsGroupPersonalizationPage);window.renderChatSettingsGroupPersonalizationPage();})();" class="cursor-pointer active:bg-gray-50"'
        )
        + sectionWrapEnd;

    const footer = ''
        + '<div class="bg-white rounded-xl overflow-hidden shadow-sm">'
        + '  <button type="button" class="w-full px-4 py-3 text-left text-[15px] text-[#FF3B30] active:bg-gray-50" onclick="clearChatHistory()">清空聊天记录</button>'
        + '</div>';

    body.innerHTML = ''
        + '<div class="space-y-4">'
        + group1
        + group2
        + group3
        + group4
        + group5
        + footer
        + '</div>';

    if (typeof window.initChatSettingsUI === 'function') window.initChatSettingsUI(rid);

    const pin = document.getElementById('setting-pin-switch');
    if (pin) pin.checked = profile.isPinned === true;

    const wbContainer = document.getElementById('group-worldbook-container');
    if (wbContainer && typeof window.getWorldBookCheckboxListHTML === 'function') {
        const selected = Array.isArray(profile.worldbookId) ? profile.worldbookId : (profile.worldbookId ? [profile.worldbookId] : []);
        wbContainer.innerHTML = window.getWorldBookCheckboxListHTML(selected);
        if (typeof window.bindWorldBookCheckboxList === 'function') {
            try { window.bindWorldBookCheckboxList(wbContainer); } catch (e) { }
        }
        wbContainer.addEventListener('change', function () {
            profile.worldbookId = collectWorldbookSelection(wbContainer);
            if (typeof window.saveData === 'function') window.saveData();
        });
    }
};

window.openChatSettings = function () {
    const roleId = String(window.currentChatRole || '').trim();
    const menu = document.getElementById('settings-menu-modal');
    if (!menu || !roleId) return;
    rememberChatSettingsRoleId(roleId);
    if (menu.dataset) menu.dataset.roleId = roleId;
    chatSettingsPageState.stack = [
        function () {
            window.renderChatSettingsPanel(roleId);
        }
    ];
    if (typeof window.renderChatSettingsPanel === 'function') window.renderChatSettingsPanel(roleId);
    menu.style.display = 'flex';
};
