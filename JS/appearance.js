/* =========================================================
   文件路径：JS脚本文件夹/appearance.js
   作用：外观设置逻辑 (含全屏开关记忆功能)
   ========================================================= */

const DEFAULT_APP_LIST = [
    { name: "侧影", id: "secret", iconClass: "fas fa-user-secret" },
    { name: "住所", id: "home", iconClass: "fas fa-home" },
    { name: "推特", id: "twitter", iconClass: "fab fa-x-twitter" },
    { name: "小红书", id: "redbook", iconClass: "fas fa-hashtag" },
    { name: "游戏", id: "games", iconClass: "fas fa-gamepad" },
    { name: "记账", id: "accounting", iconClass: "fas fa-wallet" },
    { name: "美化", id: "beautify", iconClass: "fas fa-wand-magic-sparkles" },
    { name: "驿站", id: "station", iconClass: "fas fa-truck" },
    { name: "微信", id: "wechat", iconClass: "fas fa-comment" },
    { name: "世界书", id: "worldbook", iconClass: "fas fa-book" },
    { name: "音乐", id: "music", iconClass: "fas fa-music" },
    { name: "信箱", id: "mail", iconClass: "fas fa-envelope" },
    { name: "情侣空间", id: "couple-space", iconClass: "fas fa-heart" },
    { name: "设置", id: "settings", iconClass: "fas fa-cog" },
    { name: "储存", id: "todo", iconClass: "fas fa-database" },
    { name: "外观", id: "appearance", iconClass: "fas fa-palette" }
];

const DESKTOP_APPEARANCE_EXPORT_MARKER = '__shubao_desktop_appearance__';
const GLOBAL_CHAT_WALLPAPER_KEY = 'globalChatWallpaper';
const GLOBAL_CHAT_WALLPAPER_FALLBACK_KEY = 'global_chat_wallpaper_fallback_v1';
const APP_GLOBAL_FONT_CURRENT_KEY = 'app_global_font_current_v1';
const APP_GLOBAL_FONT_PRESETS_KEY = 'app_global_font_presets_v1';
const APP_GLOBAL_FONT_FAMILY = 'ShubaoGlobalCustomFont';
const APP_GLOBAL_FONT_STYLE_ID = 'app-global-font-face-style';
const APP_FONT_PREVIEW_STYLE_ID = 'appearance-font-preview-style';

let fontPreviewTimer = null;
let fontPreviewRequestId = 0;

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeCssString(value) {
    return String(value == null ? '' : value)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r?\n/g, '');
}

function normalizeFontUrl(url) {
    return String(url || '').trim();
}

function normalizeFontName(name, url) {
    const n = String(name || '').trim();
    if (n) return n.slice(0, 40);
    const src = String(url || '').trim();
    if (!src) return '自定义字体';
    try {
        const u = new URL(src, window.location.href);
        const file = decodeURIComponent((u.pathname.split('/').pop() || '').replace(/\.(ttf|otf|woff2?|eot)$/i, ''));
        return (file || '自定义字体').slice(0, 40);
    } catch (e) {
        return '自定义字体';
    }
}

function readGlobalFontSetting() {
    try {
        const raw = localStorage.getItem(APP_GLOBAL_FONT_CURRENT_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (!parsed || typeof parsed !== 'object') return null;
        const url = normalizeFontUrl(parsed.url);
        if (!url) return null;
        return {
            id: String(parsed.id || 'direct'),
            name: normalizeFontName(parsed.name, url),
            url: url,
            savedAt: parsed.savedAt || ''
        };
    } catch (e) {
        return null;
    }
}

function writeGlobalFontSetting(setting) {
    const url = normalizeFontUrl(setting && setting.url);
    if (!url) {
        localStorage.removeItem(APP_GLOBAL_FONT_CURRENT_KEY);
        return null;
    }
    const normalized = {
        id: String(setting.id || 'direct'),
        name: normalizeFontName(setting.name, url),
        url: url,
        savedAt: setting.savedAt || new Date().toISOString()
    };
    localStorage.setItem(APP_GLOBAL_FONT_CURRENT_KEY, JSON.stringify(normalized));
    return normalized;
}

function readGlobalFontPresets() {
    try {
        const raw = localStorage.getItem(APP_GLOBAL_FONT_PRESETS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.map(function (item) {
            if (!item || typeof item !== 'object') return null;
            const url = normalizeFontUrl(item.url);
            if (!url) return null;
            return {
                id: String(item.id || ('font_' + Date.now())),
                name: normalizeFontName(item.name, url),
                url: url,
                createdAt: item.createdAt || ''
            };
        }).filter(Boolean);
    } catch (e) {
        return [];
    }
}

function writeGlobalFontPresets(list) {
    const normalized = Array.isArray(list) ? list : [];
    localStorage.setItem(APP_GLOBAL_FONT_PRESETS_KEY, JSON.stringify(normalized));
}

function getGlobalFontCss(url) {
    const escapedUrl = escapeCssString(url);
    return `
@font-face {
    font-family: "${APP_GLOBAL_FONT_FAMILY}";
    src: url("${escapedUrl}") format("truetype");
    font-display: swap;
}
body.app-custom-font,
body.app-custom-font .app-window,
body.app-custom-font .modal-layer,
body.app-custom-font #chat-view,
body.app-custom-font #chat-room-layer,
body.app-custom-font .setting-card,
body.app-custom-font .creator-body,
body.app-custom-font .msg-bubble,
body.app-custom-font .chat-list-item,
body.app-custom-font button,
body.app-custom-font input,
body.app-custom-font textarea,
body.app-custom-font select {
    font-family: "${APP_GLOBAL_FONT_FAMILY}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
}
`;
}

function applyGlobalFontSetting(setting) {
    const activeSetting = setting || readGlobalFontSetting();
    const url = normalizeFontUrl(activeSetting && activeSetting.url);
    let styleEl = document.getElementById(APP_GLOBAL_FONT_STYLE_ID);
    if (!url) {
        if (styleEl) styleEl.remove();
        if (document.body && document.body.classList) document.body.classList.remove('app-custom-font');
        document.documentElement.style.removeProperty('--app-font-family');
        return;
    }
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = APP_GLOBAL_FONT_STYLE_ID;
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = getGlobalFontCss(url);
    document.documentElement.style.setProperty('--app-font-family', `"${APP_GLOBAL_FONT_FAMILY}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`);
    if (document.body && document.body.classList) document.body.classList.add('app-custom-font');
}

function resetGlobalFont() {
    localStorage.removeItem(APP_GLOBAL_FONT_CURRENT_KEY);
    applyGlobalFontSetting(null);
    const container = document.getElementById('appearance-app');
    if (container) renderAppearanceFontSettingsUI(container);
    if (window.uiToast) window.uiToast('已恢复默认字体');
}

function saveGlobalFontDirect() {
    const urlInput = document.getElementById('appearance-font-url');
    const nameInput = document.getElementById('appearance-font-name');
    const url = normalizeFontUrl(urlInput && urlInput.value);
    if (!url) {
        resetGlobalFont();
        return;
    }
    const setting = writeGlobalFontSetting({
        id: 'direct_' + Date.now().toString(36),
        name: nameInput ? nameInput.value : '',
        url: url
    });
    applyGlobalFontSetting(setting);
    if (window.uiToast) window.uiToast('字体已应用');
}

function saveGlobalFontPreset() {
    const urlInput = document.getElementById('appearance-font-url');
    const nameInput = document.getElementById('appearance-font-name');
    const url = normalizeFontUrl(urlInput && urlInput.value);
    if (!url) {
        alert('请先输入字体 URL');
        return;
    }
    const preset = {
        id: 'font_' + Date.now().toString(36),
        name: normalizeFontName(nameInput ? nameInput.value : '', url),
        url: url,
        createdAt: new Date().toISOString()
    };
    const presets = readGlobalFontPresets();
    const existsIndex = presets.findIndex(function (item) { return item.url === preset.url; });
    if (existsIndex >= 0) presets.splice(existsIndex, 1, preset);
    else presets.unshift(preset);
    writeGlobalFontPresets(presets);

    const setting = writeGlobalFontSetting(preset);
    applyGlobalFontSetting(setting);
    const container = document.getElementById('appearance-app');
    if (container) renderAppearanceFontSettingsUI(container);
    if (window.uiToast) window.uiToast('字体预设已保存并应用');
}

function applyGlobalFontPreset(presetId) {
    const presets = readGlobalFontPresets();
    const preset = presets.find(function (item) { return String(item.id) === String(presetId); });
    if (!preset) return;
    const setting = writeGlobalFontSetting(preset);
    applyGlobalFontSetting(setting);
    const container = document.getElementById('appearance-app');
    if (container) renderAppearanceFontSettingsUI(container);
    if (window.uiToast) window.uiToast('字体预设已应用');
}

function deleteGlobalFontPreset(presetId) {
    const presets = readGlobalFontPresets();
    const next = presets.filter(function (item) { return String(item.id) !== String(presetId); });
    writeGlobalFontPresets(next);
    const current = readGlobalFontSetting();
    const deletedCurrent = current && String(current.id) === String(presetId);
    if (deletedCurrent) {
        localStorage.removeItem(APP_GLOBAL_FONT_CURRENT_KEY);
        applyGlobalFontSetting(null);
    }
    const container = document.getElementById('appearance-app');
    if (container) renderAppearanceFontSettingsUI(container);
}

function setFontPreviewStatus(text, type) {
    const el = document.getElementById('appearance-font-preview-status');
    if (!el) return;
    el.textContent = text || '';
    el.dataset.type = type || '';
}

function applyFontPreview(url) {
    const preview = document.getElementById('appearance-font-preview');
    if (!preview) return;
    const cleanUrl = normalizeFontUrl(url);
    let styleEl = document.getElementById(APP_FONT_PREVIEW_STYLE_ID);
    if (!cleanUrl) {
        if (styleEl) styleEl.remove();
        preview.style.fontFamily = '';
        setFontPreviewStatus('输入字体 URL 后会在这里实时预览', '');
        return;
    }

    const requestId = ++fontPreviewRequestId;
    const family = 'ShubaoFontPreview_' + requestId;
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = APP_FONT_PREVIEW_STYLE_ID;
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = '@font-face{font-family:"' + family + '";src:url("' + escapeCssString(cleanUrl) + '") format("truetype");font-display:swap;}';
    preview.style.fontFamily = '"' + family + '", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    setFontPreviewStatus('正在加载字体...', 'loading');

    if (document.fonts && typeof document.fonts.load === 'function') {
        document.fonts.load('16px "' + family + '"').then(function () {
            if (requestId !== fontPreviewRequestId) return;
            setFontPreviewStatus('预览已应用，保存后全局生效', 'ok');
        }).catch(function () {
            if (requestId !== fontPreviewRequestId) return;
            setFontPreviewStatus('字体加载失败，请检查 URL 或跨域权限', 'error');
        });
    } else {
        setFontPreviewStatus('预览已尝试应用，保存后全局生效', 'ok');
    }
}

function onFontUrlInputChanged() {
    clearTimeout(fontPreviewTimer);
    fontPreviewTimer = setTimeout(function () {
        const input = document.getElementById('appearance-font-url');
        applyFontPreview(input ? input.value : '');
    }, 350);
}

function getGlobalChatWallpaper() {
    return normalizeFontUrl(window.globalChatWallpaper);
}

function readWallpaperFileAsDataUrl(file, options) {
    const settings = options && typeof options === 'object' ? options : {};
    const maxSize = Number(settings.maxSize || 2160) || 2160;
    const quality = Math.max(0.8, Math.min(0.98, Number(settings.quality || 0.96)));
    const forceReencode = settings.forceReencode === true;
    const forcedMime = typeof settings.mime === 'string' ? settings.mime.trim().toLowerCase() : '';
    return new Promise(function (resolve, reject) {
        if (!file) {
            resolve('');
            return;
        }
        const reader = new FileReader();
        reader.onerror = function () {
            reject(reader.error || new Error('读取图片失败'));
        };
        reader.onload = function (evt) {
            const originalDataUrl = String(evt && evt.target && evt.target.result || '');
            const img = new Image();
            img.onerror = function () {
                resolve(originalDataUrl);
            };
            img.onload = function () {
                const originalWidth = Number(img.naturalWidth || img.width || 0);
                const originalHeight = Number(img.naturalHeight || img.height || 0);
                const longestEdge = Math.max(originalWidth, originalHeight);
                if (!originalWidth || !originalHeight || (longestEdge <= maxSize && !forceReencode)) {
                    resolve(originalDataUrl);
                    return;
                }

                let width = originalWidth;
                let height = originalHeight;
                if (width > height) {
                    height *= maxSize / width;
                    width = maxSize;
                } else {
                    width *= maxSize / height;
                    height = maxSize;
                }

                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(width));
                canvas.height = Math.max(1, Math.round(height));
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(originalDataUrl);
                    return;
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const mime = String(file.type || '').toLowerCase();
                let exportMime = forcedMime || 'image/jpeg';
                if (!forcedMime) {
                    if (mime === 'image/png') exportMime = 'image/png';
                    else if (mime === 'image/webp') exportMime = 'image/webp';
                    else if (mime === 'image/jpeg' || mime === 'image/jpg') exportMime = 'image/jpeg';
                }

                const output = (exportMime === 'image/jpeg' || exportMime === 'image/webp')
                    ? canvas.toDataURL(exportMime, quality)
                    : canvas.toDataURL(exportMime);
                resolve(output);
            };
            img.src = originalDataUrl;
        };
        reader.readAsDataURL(file);
    });
}

window.readWallpaperFileAsDataUrl = readWallpaperFileAsDataUrl;

function optimizeImageDataUrlForDesktop(src, options) {
    const settings = options && typeof options === 'object' ? options : {};
    const dataUrl = String(src || '').trim();
    if (!/^data:image\//i.test(dataUrl)) return Promise.resolve(dataUrl);
    const maxSize = Number(settings.maxSize || 1200) || 1200;
    const quality = Math.max(0.72, Math.min(0.94, Number(settings.quality || 0.84)));
    const exportMime = String(settings.mime || 'image/jpeg').trim().toLowerCase() || 'image/jpeg';
    return new Promise(function (resolve) {
        const img = new Image();
        img.onerror = function () { resolve(dataUrl); };
        img.onload = function () {
            const originalWidth = Number(img.naturalWidth || img.width || 0);
            const originalHeight = Number(img.naturalHeight || img.height || 0);
            const longestEdge = Math.max(originalWidth, originalHeight);
            if (!originalWidth || !originalHeight || (longestEdge <= maxSize && dataUrl.length < 350000)) {
                resolve(dataUrl);
                return;
            }
            let width = originalWidth;
            let height = originalHeight;
            if (longestEdge > maxSize) {
                if (width > height) {
                    height *= maxSize / width;
                    width = maxSize;
                } else {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(width));
            canvas.height = Math.max(1, Math.round(height));
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(dataUrl);
                return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            try {
                resolve(canvas.toDataURL(exportMime, quality));
            } catch (e) {
                resolve(dataUrl);
            }
        };
        img.src = dataUrl;
    });
}

function getDesktopImageOptimizeOptions(elementId) {
    const id = String(elementId || '').toLowerCase();
    if (/avatar|badge/.test(id)) return { maxSize: 420, quality: 0.86, mime: 'image/jpeg' };
    if (/large-bg|desktopwallpaper|wallpaper/.test(id)) return { maxSize: 1500, quality: 0.84, mime: 'image/jpeg' };
    if (/top-right-banner|main-widget|aesthetic-bg|aesthetic-photo|sticker/.test(id)) {
        return { maxSize: 900, quality: 0.82, mime: 'image/jpeg' };
    }
    return { maxSize: 820, quality: 0.82, mime: 'image/jpeg' };
}

function scheduleDesktopImageOptimization(key, src, options, onOptimized) {
    const raw = String(src || '');
    if (!key || !/^data:image\//i.test(raw) || raw.length < 350000) return;
    const run = function () {
        optimizeImageDataUrlForDesktop(raw, options).then(function (optimized) {
            if (!optimized || optimized === raw || optimized.length >= raw.length * 0.94) return;
            if (typeof onOptimized === 'function') onOptimized(optimized);
        }).catch(function () { });
    };
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(run, { timeout: 1800 });
    } else {
        window.setTimeout(run, 300);
    }
}

async function persistGlobalChatWallpaper(value) {
    const src = String(value || '').trim();
    window.globalChatWallpaper = src;
    try {
        if (src) localStorage.setItem(GLOBAL_CHAT_WALLPAPER_FALLBACK_KEY, src);
        else localStorage.removeItem(GLOBAL_CHAT_WALLPAPER_FALLBACK_KEY);
    } catch (e0) { }

    if (typeof localforage !== 'undefined' && localforage && typeof localforage.setItem === 'function') {
        try {
            if (src) await localforage.setItem(GLOBAL_CHAT_WALLPAPER_KEY, src);
            else await localforage.removeItem(GLOBAL_CHAT_WALLPAPER_KEY);
        } catch (e) { }
    }

    if (typeof window.applyChatBackground === 'function' && window.currentChatRole) {
        try { window.applyChatBackground(window.currentChatRole); } catch (e2) { }
    }
    refreshAppearanceGlobalWallpaperPreview();
}

function refreshAppearanceGlobalWallpaperPreview() {
    const box = document.getElementById('global-chat-wallpaper-preview');
    if (!box) return;
    const src = getGlobalChatWallpaper();
    if (src) {
        box.style.backgroundImage = `url('${src}')`;
        box.textContent = '';
        box.classList.add('has-image');
    } else {
        box.style.backgroundImage = '';
        box.textContent = '未设置全局聊天壁纸';
        box.classList.remove('has-image');
    }
}

function triggerGlobalChatWallpaperUpload() {
    let input = document.getElementById('global-chat-wallpaper-uploader');
    if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'global-chat-wallpaper-uploader';
        input.accept = 'image/*';
        input.style.display = 'none';
        input.addEventListener('change', function (e) {
            const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
            if (!file) return;
            readWallpaperFileAsDataUrl(file, { maxSize: 2160, quality: 0.96 }).then(function (dataUrl) {
                return persistGlobalChatWallpaper(dataUrl);
            }).then(function () {
                if (window.uiToast) window.uiToast('全局聊天壁纸已保存');
            }).catch(function (err) {
                console.error('全局聊天壁纸读取失败：', err);
                if (window.uiToast) window.uiToast('图片读取失败，请重试');
            });
        });
        document.body.appendChild(input);
    }
    input.value = '';
    input.click();
}

function setGlobalChatWallpaperByUrl() {
    const input = document.getElementById('global-chat-wallpaper-url-input');
    const url = String(input && input.value || '').trim();
    if (!url) return;
    persistGlobalChatWallpaper(url).then(function () {
        if (input) input.value = '';
        if (window.uiToast) window.uiToast('全局聊天壁纸已应用');
    });
}

function clearGlobalChatWallpaper() {
    persistGlobalChatWallpaper('').then(function () {
        if (window.uiToast) window.uiToast('已清空全局聊天壁纸');
    });
}

async function initGlobalChatWallpaperState() {
    let src = '';
    if (typeof localforage !== 'undefined' && localforage && typeof localforage.getItem === 'function') {
        try {
            src = await localforage.getItem(GLOBAL_CHAT_WALLPAPER_KEY) || '';
        } catch (e) { src = ''; }
    }
    if (!src) {
        try { src = localStorage.getItem(GLOBAL_CHAT_WALLPAPER_FALLBACK_KEY) || ''; } catch (e2) { src = ''; }
    }
    window.globalChatWallpaper = String(src || '').trim();
    if (typeof window.applyChatBackground === 'function' && window.currentChatRole) {
        try { window.applyChatBackground(window.currentChatRole); } catch (e3) { }
    }
    refreshAppearanceGlobalWallpaperPreview();
}

function collectLocalStorageByPrefix(prefix) {
    const result = {};
    const normalizedPrefix = String(prefix || '');
    if (!normalizedPrefix) return result;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || key.indexOf(normalizedPrefix) !== 0) continue;
            const value = localStorage.getItem(key);
            if (value != null) result[key] = value;
        }
    } catch (e) { }
    return result;
}

async function collectLocalForageByPrefix(prefix) {
    const result = {};
    const normalizedPrefix = String(prefix || '');
    const hasForage = !!(window.localforage && typeof window.localforage.keys === 'function' && typeof window.localforage.getItem === 'function');
    if (!normalizedPrefix || !hasForage) return result;
    try {
        const keys = await window.localforage.keys();
        const matchedKeys = (keys || []).filter(function (key) {
            return key && String(key).indexOf(normalizedPrefix) === 0;
        });
        for (let i = 0; i < matchedKeys.length; i++) {
            const key = String(matchedKeys[i]);
            try {
                const value = await window.localforage.getItem(key);
                if (value !== null && value !== undefined) {
                    result[key] = value;
                }
            } catch (e) { }
        }
    } catch (e) { }
    return result;
}

function applyWidgetImageToElement(elementId, src) {
    const imgEl = document.getElementById(String(elementId || ''));
    if (!imgEl || !src) return;
    imgEl.decoding = 'async';
    imgEl.loading = 'lazy';
    imgEl.src = src;
    imgEl.style.opacity = '1';
    imgEl.style.display = 'block';
    if (imgEl.previousElementSibling && imgEl.previousElementSibling.classList) {
        if (imgEl.previousElementSibling.classList.contains('main-widget-placeholder')) {
            imgEl.previousElementSibling.style.display = 'none';
        }
    }
    if (imgEl.nextElementSibling && imgEl.nextElementSibling.classList) {
        if (imgEl.nextElementSibling.classList.contains('upload-hint')) {
            imgEl.nextElementSibling.style.display = 'none';
        }
        if (imgEl.nextElementSibling.classList.contains('upload-hint-text')) {
            imgEl.nextElementSibling.style.display = 'none';
        }
    }
    scheduleDesktopImageOptimization('widget_img_' + elementId, src, getDesktopImageOptimizeOptions(elementId), function (optimized) {
        imgEl.src = optimized;
        try {
            if (window.localforage && typeof window.localforage.setItem === 'function') {
                window.localforage.setItem('widget_img_' + elementId, optimized);
            } else {
                localStorage.setItem('widget_save_' + elementId, optimized);
            }
        } catch (e) { }
    });
}

window.applyWidgetImageToElement = applyWidgetImageToElement;

async function restoreWidgetImagesToScreen() {
    const widgetImages = await collectLocalForageByPrefix('widget_img_');
    const widgetSaves = collectLocalStorageByPrefix('widget_save_');
    Object.keys(widgetImages).forEach(function (storageKey) {
        const elementId = String(storageKey).slice('widget_img_'.length);
        applyWidgetImageToElement(elementId, widgetImages[storageKey]);
    });
    Object.keys(widgetSaves).forEach(function (storageKey) {
        const elementId = String(storageKey).slice('widget_save_'.length);
        const imgEl = document.getElementById(elementId);
        if (!imgEl || imgEl.getAttribute('src')) return;
        applyWidgetImageToElement(elementId, widgetSaves[storageKey]);
    });
}

function removeLocalStorageByPrefix(prefix) {
    const normalizedPrefix = String(prefix || '');
    if (!normalizedPrefix) return;
    const keysToRemove = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.indexOf(normalizedPrefix) === 0) {
                keysToRemove.push(key);
            }
        }
    } catch (e) { }
    keysToRemove.forEach(function (key) {
        try { localStorage.removeItem(key); } catch (e) { }
    });
}

async function replaceLocalForageByPrefix(prefix, entries) {
    const normalizedPrefix = String(prefix || '');
    const hasForage = !!(window.localforage && typeof window.localforage.keys === 'function');
    if (!normalizedPrefix || !hasForage) return;
    try {
        const keys = await window.localforage.keys();
        const removes = (keys || []).filter(function (key) {
            return key && String(key).indexOf(normalizedPrefix) === 0;
        }).map(function (key) {
            return window.localforage.removeItem(key).catch(function () { });
        });
        await Promise.all(removes);
    } catch (e) { }
    const source = entries && typeof entries === 'object' ? entries : {};
    const writeKeys = Object.keys(source);
    for (let i = 0; i < writeKeys.length; i++) {
        const key = writeKeys[i];
        if (!key || String(key).indexOf(normalizedPrefix) !== 0) continue;
        try {
            await window.localforage.setItem(key, source[key]);
        } catch (e) { }
    }
}

function buildDesktopAppearanceSnapshot() {
    const ls = {
        show_status_info: localStorage.getItem('show_status_info'),
        icon_follow_wallpaper: localStorage.getItem('icon_follow_wallpaper'),
        icon_custom_color: localStorage.getItem('icon_custom_color'),
        widgetSaves: collectLocalStorageByPrefix('widget_save_')
    };
    const apps = Array.isArray(window.appList)
        ? window.appList.map(function (item) {
            if (!item || typeof item !== 'object') return null;
            return Object.assign({}, item);
        }).filter(Boolean)
        : [];
    return Promise.resolve().then(async function () {
        let wallpaper = null;
        if (typeof localforage !== 'undefined' && localforage && typeof localforage.getItem === 'function') {
            try {
                wallpaper = await localforage.getItem('desktopWallpaper');
            } catch (e) { wallpaper = null; }
        }
        const widgetImages = await collectLocalForageByPrefix('widget_img_');
        return {
            ls: ls,
            lf: {
                desktopAppList: apps,
                desktopWallpaper: wallpaper,
                widgetImages: widgetImages
            }
        };
    });
}

function downloadDesktopAppearanceFile(filename, text) {
    const blob = new Blob([String(text || '')], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () {
        try { URL.revokeObjectURL(url); } catch (e) { }
    }, 1000);
}

function syncDesktopStatusBarVisibility() {
    const showStatus = localStorage.getItem('show_status_info') !== 'false';
    if (showStatus) document.body.classList.remove('hide-status-info');
    else document.body.classList.add('hide-status-info');
}

function applyDesktopWallpaperToScreen(wallpaper) {
    const screen = document.querySelector('.screen');
    if (!screen) return;
    const src = String(wallpaper || '').trim();
    if (src) {
        screen.style.backgroundImage = `url('${src}')`;
        screen.style.backgroundSize = 'cover';
        screen.style.backgroundPosition = 'center';
        scheduleDesktopImageOptimization('desktopWallpaper', src, getDesktopImageOptimizeOptions('desktopWallpaper'), function (optimized) {
            screen.style.backgroundImage = `url('${optimized}')`;
            try {
                if (window.localforage && typeof window.localforage.setItem === 'function') {
                    window.localforage.setItem('desktopWallpaper', optimized);
                }
            } catch (e) { }
        });
    } else {
        screen.style.backgroundImage = '';
        screen.style.backgroundSize = '';
        screen.style.backgroundPosition = '';
    }
    if (typeof window.updateThemeFromWallpaper === 'function') {
        window.updateThemeFromWallpaper(src);
    }
}

async function refreshDesktopAppearanceUIAfterImport() {
    syncDesktopStatusBarVisibility();
    if (typeof window.renderApps === 'function') {
        try { window.renderApps(); } catch (e) { }
    }
    let wallpaper = null;
    if (typeof localforage !== 'undefined' && localforage && typeof localforage.getItem === 'function') {
        try {
            wallpaper = await localforage.getItem('desktopWallpaper');
        } catch (e) { wallpaper = null; }
    }
    applyDesktopWallpaperToScreen(wallpaper);
    await restoreWidgetImagesToScreen();
    if (typeof window.initWidgetState === 'function') {
        try { await window.initWidgetState(); } catch (e) { }
    }
    const container = document.getElementById('appearance-app');
    if (container) renderAppearanceUI(container);
}

function safeParseAppearanceJson(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
}

function normalizeDesktopAppList(savedAppList) {
    const base = Array.isArray(DEFAULT_APP_LIST) ? DEFAULT_APP_LIST : [];
    const incoming = Array.isArray(savedAppList) ? savedAppList : [];
    const byId = {};
    for (let i = 0; i < incoming.length; i++) {
        const it = incoming[i];
        if (!it || typeof it !== 'object') continue;
        const id = it.id != null ? String(it.id).trim() : '';
        if (!id) continue;
        byId[id] = it;
    }
    const merged = base.map(function (def) {
        const id = def && def.id != null ? String(def.id).trim() : '';
        const cur = id && byId[id] ? byId[id] : null;
        if (cur) {
            const mergedItem = Object.assign({}, def, cur);
            if (id === 'todo') {
                if (!cur.name || cur.name === 'TODO') mergedItem.name = def.name;
                if (!cur.iconClass || cur.iconClass === 'fas fa-check-square') mergedItem.iconClass = def.iconClass;
            }
            return mergedItem;
        }
        return Object.assign({}, def);
    });
    const extras = incoming.filter(function (it) {
        if (!it || typeof it !== 'object') return false;
        const id = it.id != null ? String(it.id).trim() : '';
        if (!id) return false;
        return !base.some(function (d) { return d && String(d.id || '').trim() === id; });
    }).map(function (it) { return Object.assign({}, it); });
    return merged.concat(extras);
}

// 1. 打开外观 App（现在通过 app-window 统一承载）
function openAppearanceApp() {
    const container = document.getElementById('appearance-app');
    if (!container) return;
    renderAppearanceUI(container);
}

// 2. 关闭外观 App（交给通用 closeApp 处理，这里为空实现以兼容旧代码）
function closeAppearanceApp() {
}

function setAppearanceTitle(text) {
    const title = document.getElementById('app-title-text');
    if (title) title.innerText = text || '外观设置';
}

function renderFontPresetListHTML(current) {
    const presets = readGlobalFontPresets();
    if (!presets.length) {
        return '<div class="appearance-empty-note">还没有保存字体预设</div>';
    }
    return presets.map(function (preset) {
        const active = current && String(current.id || '') === String(preset.id || '');
        return `
            <div class="font-preset-row ${active ? 'active' : ''}">
                <div class="font-preset-main">
                    <div class="font-preset-name">${escapeHtml(preset.name)}</div>
                    <div class="font-preset-url">${escapeHtml(preset.url)}</div>
                </div>
                <button type="button" class="mini-btn" onclick="applyGlobalFontPreset('${escapeHtml(preset.id)}')">应用</button>
                <button type="button" class="mini-btn danger" onclick="deleteGlobalFontPreset('${escapeHtml(preset.id)}')">删除</button>
            </div>
        `;
    }).join('');
}

function renderAppearanceFontSettingsUI(container) {
    if (!container) return;
    setAppearanceTitle('字体设置');
    const current = readGlobalFontSetting();
    const currentUrl = current ? current.url : '';
    const currentName = current ? current.name : '';
    container.innerHTML = `
        <div class="appearance-page">
            <button type="button" class="appearance-sub-back" onclick="renderAppearanceUI(document.getElementById('appearance-app'))">＜ 外观设置</button>

            <div class="setting-card">
                <h3 style="margin-top:0;">字体 URL</h3>
                <input type="text" id="appearance-font-url" class="url-input font-url-input" placeholder="粘贴 .ttf / .otf / .woff2 字体 URL..." value="${escapeHtml(currentUrl)}" oninput="onFontUrlInputChanged()">

                <h3 class="font-field-title">字体名称</h3>
                <input type="text" id="appearance-font-name" class="url-input font-url-input" placeholder="给这个字体起个名字" value="${escapeHtml(currentName)}">

                <div class="font-action-row">
                    <button type="button" class="mini-btn-ok" onclick="saveGlobalFontPreset()">保存为预设</button>
                    <button type="button" class="mini-btn" onclick="saveGlobalFontDirect()">直接保存</button>
                    <button type="button" class="mini-btn danger" onclick="resetGlobalFont()">恢复默认</button>
                </div>
            </div>

            <div class="setting-card">
                <h3 style="margin-top:0;">实时预览</h3>
                <div id="appearance-font-preview" class="font-preview-box">
                    今晚月色很好，消息也要慢慢说。<br>
                    ABC abc 123，猫咪、云朵和一封未读信。
                </div>
                <div id="appearance-font-preview-status" class="font-preview-status">输入有效 URL 后会在这里实时预览</div>
            </div>

            <div class="setting-card">
                <h3 style="margin-top:0;">字体预设</h3>
                <div id="font-preset-list">
                    ${renderFontPresetListHTML(current)}
                </div>
            </div>
        </div>
    `;
    applyFontPreview(currentUrl);
}

function getVisibleDesktopAppEntries() {
    const apps = Array.isArray(window.appList) ? window.appList : [];
    const fallbackIds = ['wechat', 'music', 'worldbook', 'couple-space', 'secret', 'games', 'beautify', 'redbook', 'settings', 'todo', 'appearance'];
    const seen = {};
    const entries = [];

    function addIndex(index) {
        const idx = Number(index);
        if (!Number.isInteger(idx) || idx < 0 || idx >= apps.length) return;
        const app = apps[idx];
        const id = app && app.id != null ? String(app.id).trim() : '';
        if (!id || seen[id]) return;
        seen[id] = true;
        entries.push({ app: app, index: idx });
    }

    function addId(id) {
        const appId = String(id || '').trim();
        if (!appId || seen[appId]) return;
        const index = apps.findIndex(function (item) {
            return item && String(item.id || '').trim() === appId;
        });
        if (index >= 0) addIndex(index);
    }

    const visibleNodes = document.querySelectorAll('.desktop-pages-container .app-item-small, .dock .dock-item');
    visibleNodes.forEach(function (item) {
        const onclickAttr = item && item.getAttribute ? String(item.getAttribute('onclick') || '') : '';
        if (!onclickAttr) return;
        const byIndex = onclickAttr.match(/openAppByIndex\((\d+)\)/);
        if (byIndex) {
            addIndex(parseInt(byIndex[1], 10));
            return;
        }
        const byOpenApp = onclickAttr.match(/openApp\(['"]([^'"]+)['"]\)/);
        if (byOpenApp) {
            addId(byOpenApp[1]);
            return;
        }
        if (onclickAttr.indexOf('openChatApp()') !== -1) {
            addId('wechat');
            return;
        }
        if (onclickAttr.indexOf('openWorldBookApp()') !== -1) {
            addId('worldbook');
        }
    });

    if (!entries.length) {
        fallbackIds.forEach(addId);
    }
    return entries;
}

function buildAppearanceIconListHTML() {
    const entries = getVisibleDesktopAppEntries();
    const resetButtonStyle = 'position:absolute; top:-5px; right:-5px; width:18px; height:18px; background:#ff3b30; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; cursor:pointer; z-index:10; border:none; padding:0;';
    let appListHTML = '';

    entries.forEach(({ app, index }) => {
        const defaultApp = DEFAULT_APP_LIST[index];
        const iconValue = String((app && app.icon) || '');
        const iconClassValue = String((app && app.iconClass) || '');
        const appName = String((app && app.name) || '');
        const hasImageIcon = iconValue && (iconValue.includes('.') || iconValue.includes('/') || iconValue.startsWith('data:'));
        let isModified = false;
        if (defaultApp) {
            if (hasImageIcon) {
                isModified = true;
            } else {
                if (defaultApp.iconClass && iconClassValue !== defaultApp.iconClass) {
                    isModified = true;
                }
                if (defaultApp.icon && iconValue !== defaultApp.icon) {
                    isModified = true;
                }
            }
        }

        let iconDisplay = '';
        if (hasImageIcon) {
            iconDisplay = `<img src="${escapeHtml(iconValue)}" style="width:100%; border-radius:10px;">`;
        } else if (iconClassValue) {
            iconDisplay = `<i class="${escapeHtml(iconClassValue)}"></i>`;
        } else if (iconValue) {
            iconDisplay = escapeHtml(iconValue);
        } else {
            iconDisplay = appName ? escapeHtml(appName.charAt(0)) : '';
        }

        const resetBtnHTML = isModified
            ? `<button type="button" onclick="resetSingleApp(${index})" style="${resetButtonStyle}">×</button>`
            : '';

        appListHTML += `
            <div class="icon-settings-item">
                <div class="setting-item-row">
                    <div class="app-preview">
                        <div class="app-icon-box" style="font-size: 20px; position: relative;">
                            ${iconDisplay}
                            ${resetBtnHTML}
                        </div>
                        <span style="font-size:14px; margin-left:10px; cursor: pointer; color: #007aff;"
                              onclick="editAppName(${index})"
                              title="点击修改名称">${escapeHtml(appName)}</span>
                    </div>
                    <button class="mini-btn" onclick="triggerAppIconUpload(${index})">
                        <i class="fas fa-upload"></i> 上传
                    </button>
                </div>
                <div class="url-input-row">
                    <input type="text" placeholder="或粘贴图标 URL..." id="app-url-${index}" class="url-input">
                    <button class="mini-btn-ok" onclick="saveAppIconByUrl(${index})">确定</button>
                </div>
                <div class="url-input-row" style="margin-top: 5px;">
                    <input type="text" placeholder="点击上方名称或在此输入新名称..." id="app-name-${index}" class="url-input" value="${escapeHtml(appName)}">
                    <button class="mini-btn-ok" onclick="saveAppName(${index})">改名</button>
                </div>
            </div>
        `;
    });

    return appListHTML || '<div class="appearance-empty-note">暂无 App 图标</div>';
}

function renderAppearanceIconSettingsUI(container) {
    if (!container) return;
    setAppearanceTitle('App 图标管理');
    container.innerHTML = `
        <div class="appearance-page" id="appearance-icon-settings-root">
            <button type="button" class="appearance-sub-back" onclick="renderAppearanceUI(document.getElementById('appearance-app'))">＜ 外观设置</button>
            <div class="setting-card">
                <h3 style="margin-top:0;">App 图标管理</h3>
                <p style="font-size:12px; color:#666; margin:0 0 12px 0;">在这里上传图标、粘贴图标 URL，或者修改桌面上的 App 名称。</p>
                <div class="icon-settings-list">
                    ${buildAppearanceIconListHTML()}
                </div>
            </div>
        </div>
    `;
}

function rerenderAppearanceAfterIconChange() {
    const appWindow = document.getElementById('appearance-app');
    if (!appWindow) return;
    if (document.getElementById('appearance-icon-settings-root')) {
        renderAppearanceIconSettingsUI(appWindow);
    } else {
        renderAppearanceUI(appWindow);
    }
}

// 3. 渲染 UI
function renderAppearanceUI(container) {
    setAppearanceTitle('外观设置');

    const showStatus = localStorage.getItem('show_status_info') !== 'false';
    const iconFollowSetting = localStorage.getItem('icon_follow_wallpaper');
    const iconFollow = iconFollowSetting === null ? true : iconFollowSetting === 'true';
    const iconCustomColor = localStorage.getItem('icon_custom_color') || '#555555';

    container.innerHTML = `
        <div style="padding: 20px 20px 50px 20px;">
            <div class="setting-card" style="margin-bottom:20px; border:2px solid #007aff;">
                <div class="setting-row-between">
                    <span style="font-weight:600; color:#007aff;">顶部状态栏显示</span>
                    <label class="switch">
                        <input type="checkbox" id="statusbar-toggle" onchange="toggleStatusBar(this)" ${showStatus ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
                <p style="font-size:12px; color:#666; margin-top:5px;">
                    开启时显示桌面的顶部状态栏。关闭后隐藏顶部时间、电量等信息条。
                </p>
            </div>

            <div class="setting-card" style="margin-bottom:20px;">
                <h3 style="margin-top:0;">桌面壁纸</h3>
                <div class="setting-row-between" style="margin-bottom:10px;">
                    <span>本地相册</span>
                    <button class="mini-btn" onclick="triggerWallpaperUpload()">选择图片</button>
                </div>
                <div class="url-input-row">
                    <input type="text" id="wallpaper-url-input" placeholder="输入图片 URL..." class="url-input">
                    <button class="mini-btn-ok" onclick="setWallpaperByUrl()">应用</button>
                </div>
            </div>

            <div class="setting-card" style="margin-bottom:20px;">
                <h3 style="margin-top:0;">全局聊天壁纸</h3>
                <p style="font-size:12px; color:#666; margin:0 0 12px 0;">设置后会作为所有角色的聊天背景；某个角色单独更换聊天背景时，会优先显示角色自己的背景。</p>
                <div id="global-chat-wallpaper-preview" class="global-chat-wallpaper-preview">未设置全局聊天壁纸</div>
                <div class="setting-row-between" style="margin-bottom:10px;">
                    <span>本地相册</span>
                    <button class="mini-btn" onclick="triggerGlobalChatWallpaperUpload()">选择图片</button>
                </div>
                <div class="url-input-row">
                    <input type="text" id="global-chat-wallpaper-url-input" placeholder="输入图片 URL..." class="url-input">
                    <button class="mini-btn-ok" onclick="setGlobalChatWallpaperByUrl()">应用</button>
                </div>
                <button type="button" class="appearance-text-danger" onclick="clearGlobalChatWallpaper()">清空全局聊天壁纸</button>
            </div>

            <div class="setting-card" style="margin-bottom:20px;">
                <h3 style="margin-top:0;">桌面图标主题色</h3>
                <div class="setting-row-between" style="margin-bottom:10px;">
                    <span>图标随壁纸自动变色</span>
                    <label class="switch">
                        <input type="checkbox" id="icon-follow-toggle" onchange="toggleIconFollow(this)" ${iconFollow ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
                <p style="font-size:12px; color:#666; margin-top:0; margin-bottom:10px;">
                    开启后图标颜色会根据壁纸主色调自动调整；关闭后使用默认或自定义颜色。
                </p>
                <div class="setting-row-between">
                    <span>自定义图标颜色</span>
                    <input type="color" id="icon-color-picker" value="${iconCustomColor}" ${iconFollow ? 'disabled' : ''} onchange="onIconColorChange(this)" style="width:40px; height:24px; padding:0; border:none; background:transparent;">
                </div>
            </div>

            <div class="setting-card appearance-nav-card" style="margin-bottom:20px;" onclick="renderAppearanceFontSettingsUI(document.getElementById('appearance-app'))">
                <div class="setting-row-between">
                    <div>
                        <h3 style="margin:0;">字体设置</h3>
                        <p style="font-size:12px; color:#666; margin:6px 0 0 0;">输入字体 URL、保存预设，并实时预览全局字体。</p>
                    </div>
                    <span style="color:#999; font-size:18px; line-height:1;">▸</span>
                </div>
            </div>

            <div class="setting-card appearance-nav-card" style="margin-bottom:20px;" onclick="renderAppearanceIconSettingsUI(document.getElementById('appearance-app'))">
                <div class="setting-row-between">
                    <div>
                        <h3 style="margin:0;">App 图标管理</h3>
                        <p style="font-size:12px; color:#666; margin:6px 0 0 0;">上传图标、粘贴图标 URL，或修改桌面 App 名称。</p>
                    </div>
                    <span style="color:#999; font-size:18px; line-height:1;">▸</span>
                </div>
            </div>

            <div class="setting-card" style="margin-top:20px;">
                <h3 style="margin-top:0;">桌面外观导出 / 导入 (JSON)</h3>
                <p style="font-size:12px; color:#666; margin:0 0 12px 0;">只包含桌面外观相关内容：顶部状态栏、桌面壁纸、桌面图标名称与图标、图标主题色设置，以及桌面小组件图片与倒数日配置。</p>
                <div style="display:flex; gap:10px;">
                    <button type="button" class="mini-btn" style="flex:1;" onclick="exportDesktopAppearanceJson()">导出 JSON</button>
                    <button type="button" class="mini-btn" style="flex:1;" onclick="triggerImportDesktopAppearanceJson()">导入 JSON</button>
                </div>
                <input type="file" id="appearance-import-json" accept="application/json,.json" style="display:none;" onchange="importDesktopAppearanceFromInput(this)">
            </div>

            <div class="setting-card" style="margin-top:20px; border:1px solid #ff3b30; background:#fff5f5;">
                <h3 style="margin-top:0; color:#ff3b30;">危险操作区</h3>
                <p style="font-size:12px; color:#666; margin-bottom:10px;">将清除所有自定义图标、壁纸、小组件图片缓存、全局聊天壁纸和字体设置，并恢复默认布局。</p>
                <button style="width:100%; padding:10px 0; background:#ff3b30; color:#fff; border:none; border-radius:8px; font-size:14px; cursor:pointer;" onclick="resetFactorySettings()">恢复出厂设置</button>
            </div>
        </div>
    `;
    refreshAppearanceGlobalWallpaperPreview();
}

function toggleAppIconManager() {
    const next = localStorage.getItem('appearance_icon_manager_open') !== 'true';
    localStorage.setItem('appearance_icon_manager_open', next ? 'true' : 'false');
    const appWindow = document.getElementById('appearance-app');
    if (appWindow) renderAppearanceUI(appWindow);
}

function toggleStatusBar(checkbox) {
    const show = !!checkbox.checked;
    localStorage.setItem('show_status_info', show ? 'true' : 'false');
    if (show) {
        document.body.classList.remove('hide-status-info');
    } else {
        document.body.classList.add('hide-status-info');
    }
}

function toggleIconFollow(checkbox) {
    const follow = !!checkbox.checked;
    localStorage.setItem('icon_follow_wallpaper', follow ? 'true' : 'false');
    const picker = document.getElementById('icon-color-picker');
    if (picker) {
        picker.disabled = follow;
    }
    if (typeof localforage !== 'undefined') {
        localforage.getItem('desktopWallpaper').then(savedWallpaper => {
            if (typeof window.updateThemeFromWallpaper === 'function') {
                window.updateThemeFromWallpaper(follow ? (savedWallpaper || '') : '');
            }
        }).catch(() => {
            if (typeof window.updateThemeFromWallpaper === 'function') {
                window.updateThemeFromWallpaper('');
            }
        });
    } else {
        if (typeof window.updateThemeFromWallpaper === 'function') {
            window.updateThemeFromWallpaper('');
        }
    }
}

function onIconColorChange(input) {
    if (!input) return;
    const color = input.value;
    if (!color) return;
    localStorage.setItem('icon_custom_color', color);
    localStorage.setItem('icon_follow_wallpaper', 'false');
    const toggle = document.getElementById('icon-follow-toggle');
    if (toggle) {
        toggle.checked = false;
    }
    const picker = document.getElementById('icon-color-picker');
    if (picker) {
        picker.disabled = false;
    }
    if (typeof window.updateThemeFromWallpaper === 'function') {
        window.updateThemeFromWallpaper('');
    }
}

// 其他辅助函数保持不变...
function triggerAppIconUpload(index) {
    // 1. 标记当前正在编辑 App
    window.currentEditingAppIndex = index;
    
    // 2. 【关键】强制清除组件的标记，防止系统搞混
    window.activeImgId = null; 
    window.activeHintId = null;
    if (typeof window.currentUploadTargetId === 'string') {
        window.currentUploadTargetId = '';
    }

    // 3. 打开文件选择框
    const uploader = document.getElementById('global-uploader');
    if(uploader) { 
        uploader.value = ''; 
        uploader.click(); 
    }
}


function saveAppIconByUrl(index) {
    const input = document.getElementById(`app-url-${index}`);
    const url = input.value.trim();
    if (url) { updateAppIcon(index, url); input.value = ''; }
}

function updateAppIcon(index, newIconSrc) {
    if (window.appList && window.appList[index]) {
        window.appList[index].icon = newIconSrc;
        if (typeof window.renderApps === 'function') window.renderApps();
        rerenderAppearanceAfterIconChange();
        
        // 新增：保存整个 App 列表到数据库
        localforage.setItem('desktopAppList', window.appList).then(() => {
            console.log("App 列表已保存到数据库！");
        }).catch(err => {
            console.error("保存 App 列表失败：", err);
        });
    }
}

function triggerWallpaperUpload() {
    const wpUploader = document.getElementById('wallpaper-uploader');
    if(wpUploader) { wpUploader.value = ''; wpUploader.click(); }
}

function computeThemeFromImage(src, callback) {
    if (!src) {
        callback(null);
        return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h) {
            callback(null);
            return;
        }
        const maxSize = 80;
        if (w > h) {
            if (w > maxSize) {
                h = Math.round(h * (maxSize / w));
                w = maxSize;
            }
        } else {
            if (h > maxSize) {
                w = Math.round(w * (maxSize / h));
                h = maxSize;
            }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        let data;
        try {
            data = ctx.getImageData(0, 0, w, h).data;
        } catch (e) {
            callback(null);
            return;
        }
        let rTotal = 0;
        let gTotal = 0;
        let bTotal = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a < 128) continue;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            rTotal += r;
            gTotal += g;
            bTotal += b;
            count++;
        }
        if (!count) {
            callback(null);
            return;
        }
        let r = Math.round(rTotal / count);
        let g = Math.round(gTotal / count);
        let b = Math.round(bTotal / count);
        const brightnessBase = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightnessBase < 110) {
            r = Math.min(255, r + 60);
            g = Math.min(255, g + 60);
            b = Math.min(255, b + 60);
        } else if (brightnessBase > 200) {
            r = Math.max(0, r - 40);
            g = Math.max(0, g - 40);
            b = Math.max(0, b - 40);
        }
        const gray = (r * 299 + g * 587 + b * 114) / 1000;
        const mixColor = 0.9;
        const mixGray = 0.2;
        const rMuted = Math.round(r * mixColor + gray * mixGray);
        const gMuted = Math.round(g * mixColor + gray * mixGray);
        const bMuted = Math.round(b * mixColor + gray * mixGray);
        const brightness2 = (rMuted * 299 + gMuted * 587 + bMuted * 114) / 1000;

        let iconR = rMuted;
        let iconG = gMuted;
        let iconB = bMuted;
        if (brightness2 < 120) {
            iconR = Math.min(255, Math.round(rMuted * 0.7 + 255 * 0.3));
            iconG = Math.min(255, Math.round(gMuted * 0.7 + 255 * 0.3));
            iconB = Math.min(255, Math.round(bMuted * 0.7 + 255 * 0.3));
        } else if (brightness2 > 200) {
            iconR = Math.max(0, Math.round(rMuted * 0.8));
            iconG = Math.max(0, Math.round(gMuted * 0.8));
            iconB = Math.max(0, Math.round(bMuted * 0.8));
        }

        const primary = 'rgb(' + rMuted + ',' + gMuted + ',' + bMuted + ')';
        const primarySoft = 'rgba(' + rMuted + ',' + gMuted + ',' + bMuted + ',0.9)';
        const foreground = 'rgb(' + iconR + ',' + iconG + ',' + iconB + ')';
        const label = 'rgb(' + iconR + ',' + iconG + ',' + iconB + ')';

        let dockR = Math.max(0, rMuted - 30);
        let dockG = Math.max(0, gMuted - 30);
        let dockB = Math.max(0, bMuted - 30);
        const dockBg = 'rgb(' + dockR + ',' + dockG + ',' + dockB + ')';
        callback({
            primary: primary,
            primarySoft: primarySoft,
            foreground: foreground,
            label: label,
            dockBg: dockBg
        });
    };
    img.onerror = function() {
        callback(null);
    };
    img.src = src;
}

function applyIconThemeFromHex(color, rootStyle) {
    if (!color || !rootStyle) return;
    let c = String(color).trim();
    if (!c) return;
    if (c[0] === '#') c = c.slice(1);
    if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    if (c.length !== 6) return;
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const foreground = 'rgb(' + r + ',' + g + ',' + b + ')';
    const label = foreground;
    const dockR = Math.max(0, r - 30);
    const dockG = Math.max(0, g - 30);
    const dockB = Math.max(0, b - 30);
    const dockBg = 'rgb(' + dockR + ',' + dockG + ',' + dockB + ')';
    rootStyle.setProperty('--theme-foreground', foreground);
    rootStyle.setProperty('--theme-label', label);
    rootStyle.setProperty('--dock-bg', dockBg);
}

function updateThemeFromWallpaper(src) {
    const rootStyle = document.documentElement.style;
    const iconFollowSetting = localStorage.getItem('icon_follow_wallpaper');
    const iconFollow = iconFollowSetting === null ? true : iconFollowSetting === 'true';
    const iconCustomColor = localStorage.getItem('icon_custom_color');

    if (!iconFollow) {
        rootStyle.setProperty('--theme-primary', '#f3f4fb');
        rootStyle.setProperty('--theme-primary-soft', 'rgba(243, 244, 251, 0.9)');
        if (iconCustomColor) {
            applyIconThemeFromHex(iconCustomColor, rootStyle);
        } else {
            rootStyle.setProperty('--theme-foreground', '#555555');
            rootStyle.setProperty('--theme-label', '#333333');
            rootStyle.setProperty('--dock-bg', '#aeb0b2');
        }
        return;
    }

    if (!src) {
        rootStyle.setProperty('--theme-primary', '#f3f4fb');
        rootStyle.setProperty('--theme-primary-soft', 'rgba(243, 244, 251, 0.9)');
        rootStyle.setProperty('--theme-foreground', '#555555');
        rootStyle.setProperty('--theme-label', '#333333');
        rootStyle.setProperty('--dock-bg', '#aeb0b2');
        return;
    }

    computeThemeFromImage(src, function(theme) {
        if (!theme) {
            rootStyle.setProperty('--theme-primary', '#f3f4fb');
            rootStyle.setProperty('--theme-primary-soft', 'rgba(243, 244, 251, 0.9)');
            rootStyle.setProperty('--theme-foreground', '#555555');
            rootStyle.setProperty('--theme-label', '#333333');
            rootStyle.setProperty('--dock-bg', '#aeb0b2');
            return;
        }
        rootStyle.setProperty('--theme-primary', theme.primary);
        rootStyle.setProperty('--theme-primary-soft', theme.primarySoft);
        rootStyle.setProperty('--theme-foreground', theme.foreground);
        rootStyle.setProperty('--theme-label', theme.label);
        rootStyle.setProperty('--dock-bg', theme.dockBg);
    });
}

window.updateThemeFromWallpaper = updateThemeFromWallpaper;

function setWallpaperByUrl() {
    const url = document.getElementById('wallpaper-url-input').value.trim();
    if(url) {
        const screen = document.querySelector('.screen');
        if(screen) {
            screen.style.backgroundImage = `url('${url}')`;
            screen.style.backgroundSize = 'cover';
            screen.style.backgroundPosition = 'center';
            
            // 新增：保存壁纸 URL 到数据库
            localforage.setItem('desktopWallpaper', url).then(() => {
                console.log("壁纸 URL 已保存到数据库！");
                alert('壁纸已应用并保存');
            }).catch(err => {
                console.error("保存壁纸失败：", err);
                alert('壁纸已应用');
            });
            if (typeof window.updateThemeFromWallpaper === 'function') {
                window.updateThemeFromWallpaper(url);
            }
        }
    }
}

async function exportDesktopAppearanceJson() {
    try {
        const snapshot = await buildDesktopAppearanceSnapshot();
        const payload = {
            __shubao_desktop_appearance__: 1,
            createdAt: new Date().toISOString(),
            data: snapshot
        };
        const stamp = payload.createdAt.replace(/[:.]/g, '-');
        downloadDesktopAppearanceFile('shubao-desktop-appearance-' + stamp + '.json', JSON.stringify(payload, null, 2));
        alert('✅ 已导出桌面外观 JSON');
    } catch (e) {
        console.error(e);
        alert('❌ 导出失败：' + (e && e.message ? e.message : '未知错误'));
    }
}

function triggerImportDesktopAppearanceJson() {
    const input = document.getElementById('appearance-import-json');
    if (!input) {
        alert('找不到导入控件，请重新打开外观设置页面');
        return;
    }
    input.value = '';
    input.click();
}

async function importDesktopAppearanceFromInput(fileInput) {
    try {
        const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        if (!file) return;
        const text = await file.text();
        const json = safeParseAppearanceJson(text);
        if (!json || typeof json !== 'object') {
            alert('❌ 导入失败：文件不是有效 JSON');
            return;
        }
        if (json[DESKTOP_APPEARANCE_EXPORT_MARKER] !== 1) {
            alert('❌ 导入失败：不是桌面外观导出文件');
            return;
        }
        const data = json.data && typeof json.data === 'object' ? json.data : null;
        const ls = data && data.ls && typeof data.ls === 'object' ? data.ls : null;
        const lf = data && data.lf && typeof data.lf === 'object' ? data.lf : null;
        if (!ls || !lf) {
            alert('❌ 导入失败：文件结构不正确');
            return;
        }
        const ok = confirm('⚠️ 将覆盖当前桌面外观设置（状态栏、壁纸、图标、主题色、小组件图片、倒数日配置）。\n\n建议先导出一份当前桌面外观备份。\n\n确定继续吗？');
        if (!ok) return;

        const lsKeys = ['show_status_info', 'icon_follow_wallpaper', 'icon_custom_color'];
        for (let i = 0; i < lsKeys.length; i++) {
            const key = lsKeys[i];
            if (Object.prototype.hasOwnProperty.call(ls, key) && ls[key] != null) {
                localStorage.setItem(key, String(ls[key]));
            } else {
                localStorage.removeItem(key);
            }
        }

        removeLocalStorageByPrefix('widget_save_');
        const widgetSaves = ls.widgetSaves && typeof ls.widgetSaves === 'object' ? ls.widgetSaves : {};
        Object.keys(widgetSaves).forEach(function (key) {
            if (!key || String(key).indexOf('widget_save_') !== 0) return;
            try {
                localStorage.setItem(key, String(widgetSaves[key]));
            } catch (e) { }
        });

        if (Array.isArray(lf.desktopAppList)) {
            window.appList = normalizeDesktopAppList(lf.desktopAppList);
            if (typeof localforage !== 'undefined' && localforage && typeof localforage.setItem === 'function') {
                await localforage.setItem('desktopAppList', window.appList);
            }
        }

        const wallpaper = lf.desktopWallpaper != null ? lf.desktopWallpaper : null;
        if (typeof localforage !== 'undefined' && localforage && typeof localforage.setItem === 'function') {
            if (wallpaper) await localforage.setItem('desktopWallpaper', wallpaper);
            else await localforage.removeItem('desktopWallpaper');
            await replaceLocalForageByPrefix('widget_img_', lf.widgetImages);
        }

        await refreshDesktopAppearanceUIAfterImport();
        alert('✅ 桌面外观已导入');
    } catch (e) {
        console.error(e);
        alert('❌ 导入失败：' + (e && e.message ? e.message : '未知错误'));
    } finally {
        try {
            if (fileInput) fileInput.value = '';
        } catch (e) { }
    }
}

// 5. 新增：开机时恢复桌面数据（增强版：带详细日志）
function initDesktopState() {
    console.log("=== 开始恢复桌面数据 ===");
    console.log("localforage 是否可用:", typeof localforage !== 'undefined');
    
    if (typeof localforage === 'undefined') {
        console.error("❌ localforage 未加载！请检查CDN连接");
        return;
    }
    
    // 1. 恢复 App 列表
    localforage.getItem('desktopAppList').then(savedAppList => {
        if (savedAppList && Array.isArray(savedAppList)) {
            window.appList = normalizeDesktopAppList(savedAppList);
            console.log("✅ 已恢复 App 列表，共", savedAppList.length, "个应用");
            // 重新渲染桌面图标
            if (typeof window.renderApps === 'function') {
                window.renderApps();
                console.log("✅ App 图标已重新渲染");
            } else {
                console.warn("⚠️ renderApps 函数不存在");
            }
        } else {
            console.log("ℹ️ 没有找到保存的 App 列表，使用默认配置");
        }
    }).catch(err => {
        console.error("❌ 恢复 App 列表失败：", err);
    });
    
    // 2. 恢复壁纸
    localforage.getItem('desktopWallpaper').then(savedWallpaper => {
        if (savedWallpaper) {
            if (document.querySelector('.screen')) {
                applyDesktopWallpaperToScreen(savedWallpaper);
                console.log("✅ 已恢复桌面壁纸，数据大小:", (savedWallpaper.length / 1024).toFixed(2), "KB");
            } else {
                console.error("❌ 找不到 .screen 元素");
            }
        } else {
            console.log("ℹ️ 没有找到保存的壁纸");
        }
    }).catch(err => {
        console.error("❌ 恢复壁纸失败：", err);
    });
    
    console.log("=== 桌面数据恢复流程已启动 ===");
}

function editAppName(index) {
    const appWindow = document.getElementById('appearance-app');
    if (!appWindow) return;
    const input = appWindow.querySelector(`#app-name-${index}`);
    if (input) {
        input.focus();
        input.select();
    }
}

function saveAppName(index) {
    const appWindow = document.getElementById('appearance-app');
    if (!appWindow) return;
    const input = appWindow.querySelector(`#app-name-${index}`);
    if (!input) return;
    
    const value = typeof input.value === 'string' ? input.value : '';
    const newName = value.trim();
    if (!newName) {
        alert('名称不能为空');
        return;
    }
    
    if (window.appList && window.appList[index]) {
        const oldName = window.appList[index].name;
        window.appList[index].name = newName;
        
        // 重新渲染桌面图标
        if (typeof window.renderApps === 'function') {
            window.renderApps();
        }
        
        // 重新渲染外观设置界面
        rerenderAppearanceAfterIconChange();
        
        // 保存到数据库
        localforage.setItem('desktopAppList', window.appList).then(() => {
            console.log(`App 名称已更新：${oldName} → ${newName}`);
            alert(`已将"${oldName}"改名为"${newName}"`);
        }).catch(err => {
            console.error("保存 App 名称失败：", err);
            alert('名称已更改，但保存失败');
        });
    }
}

function resetSingleApp(index) {
    if (!Array.isArray(DEFAULT_APP_LIST) || !DEFAULT_APP_LIST[index]) return;
    if (!Array.isArray(window.appList)) window.appList = [];
    window.appList[index] = {
        name: DEFAULT_APP_LIST[index].name,
        id: DEFAULT_APP_LIST[index].id,
        iconClass: DEFAULT_APP_LIST[index].iconClass
    };
    delete window.appList[index].icon;
    if (typeof window.renderApps === 'function') {
        window.renderApps();
    }
    rerenderAppearanceAfterIconChange();
    if (typeof localforage !== 'undefined') {
        localforage.setItem('desktopAppList', window.appList).catch(function(err) {
            console.error('重置单个 App 失败：', err);
        });
    }
}

function resetFactorySettings() {
    const confirmed = window.confirm('确定要恢复出厂设置吗？这将清除所有自定义 App 图标、壁纸、小组件图片缓存、全局聊天壁纸和字体设置。');
    if (!confirmed) return;
    const tasks = [];
    if (typeof localforage !== 'undefined') {
        tasks.push(localforage.removeItem('desktopAppList').catch(function() {}));
        tasks.push(localforage.removeItem('desktopWallpaper').catch(function() {}));
        tasks.push(localforage.removeItem(GLOBAL_CHAT_WALLPAPER_KEY).catch(function() {}));
        tasks.push(
            localforage.keys().then(function(keys) {
                const removes = keys.filter(function(k) { return k && k.indexOf('widget_img_') === 0; })
                    .map(function(k) { return localforage.removeItem(k).catch(function() {}); });
                return Promise.all(removes);
            }).catch(function() {})
        );
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.indexOf('widget_save_') === 0) {
            localStorage.removeItem(key);
        }
    }
    localStorage.removeItem('aes_bubble_text');
    localStorage.removeItem(GLOBAL_CHAT_WALLPAPER_FALLBACK_KEY);
    localStorage.removeItem(APP_GLOBAL_FONT_CURRENT_KEY);
    localStorage.removeItem(APP_GLOBAL_FONT_PRESETS_KEY);
    if (tasks.length > 0) {
        Promise.all(tasks).finally(function() {
            window.location.reload();
        });
    } else {
        window.location.reload();
    }
}

// 挂载全局
window.openAppearanceApp = openAppearanceApp;
window.closeAppearanceApp = closeAppearanceApp;
window.triggerAppIconUpload = triggerAppIconUpload;
window.saveAppIconByUrl = saveAppIconByUrl;
window.updateAppIcon = updateAppIcon;
window.triggerWallpaperUpload = triggerWallpaperUpload;
window.setWallpaperByUrl = setWallpaperByUrl;
window.toggleStatusBar = toggleStatusBar;
window.initDesktopState = initDesktopState;
window.editAppName = editAppName;
window.saveAppName = saveAppName;
window.exportDesktopAppearanceJson = exportDesktopAppearanceJson;
window.triggerImportDesktopAppearanceJson = triggerImportDesktopAppearanceJson;
window.importDesktopAppearanceFromInput = importDesktopAppearanceFromInput;
window.resetSingleApp = resetSingleApp;
window.resetFactorySettings = resetFactorySettings;
window.renderAppearanceUI = renderAppearanceUI;
window.renderAppearanceFontSettingsUI = renderAppearanceFontSettingsUI;
window.renderAppearanceIconSettingsUI = renderAppearanceIconSettingsUI;
window.triggerGlobalChatWallpaperUpload = triggerGlobalChatWallpaperUpload;
window.setGlobalChatWallpaperByUrl = setGlobalChatWallpaperByUrl;
window.clearGlobalChatWallpaper = clearGlobalChatWallpaper;
window.initGlobalChatWallpaperState = initGlobalChatWallpaperState;
window.getGlobalChatWallpaper = getGlobalChatWallpaper;
window.applyGlobalFontSetting = applyGlobalFontSetting;
window.saveGlobalFontDirect = saveGlobalFontDirect;
window.saveGlobalFontPreset = saveGlobalFontPreset;
window.applyGlobalFontPreset = applyGlobalFontPreset;
window.deleteGlobalFontPreset = deleteGlobalFontPreset;
window.resetGlobalFont = resetGlobalFont;
window.onFontUrlInputChanged = onFontUrlInputChanged;

applyGlobalFontSetting(readGlobalFontSetting());
initGlobalChatWallpaperState();
