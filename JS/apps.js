/* =========================================================
   文件路径：JS脚本文件夹/apps.js
   作用：管理App的数据、图标渲染、打开窗口、以及微信列表逻辑
   ========================================================= */

// 1. 定义所有 App 的核心数据
window.appList = [
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
    { name: "外观", id: "appearance", iconClass: "fas fa-palette" },
];

function isImageSource(src) {
    if (!src) return false;
    return src.includes('/') || src.includes('.') || src.startsWith('data:image');
}

// 2. 初始化渲染：把图标画到桌面上
function renderApps() {
    const apps = window.appList || [];

    for (let i = 0; i < 8 && i < apps.length; i++) {
        const appData = apps[i];
        const itemEl = document.getElementById(`app-item-${i}`);
        const nameEl = document.getElementById(`app-name-${i}`);
        const iconEl = document.getElementById(`app-icon-${i}`);
        if (!appData || !itemEl || !nameEl) continue;

        const useImage = appData.icon && isImageSource(appData.icon);

        if (useImage) {
            let imgEl = iconEl;
            if (!imgEl || imgEl.tagName !== 'IMG') {
                const newImg = document.createElement('img');
                newImg.id = `app-icon-${i}`;
                newImg.className = imgEl ? imgEl.className : '';
                if (imgEl) {
                    imgEl.replaceWith(newImg);
                } else {
                    itemEl.insertBefore(newImg, nameEl);
                }
                imgEl = newImg;
            }
            imgEl.src = appData.icon;
            imgEl.alt = appData.name || '';
            imgEl.removeAttribute('style');
        } else {
            let iconNode = iconEl;
            if (!iconNode || iconNode.tagName !== 'I') {
                const newIcon = document.createElement('i');
                newIcon.id = `app-icon-${i}`;
                if (iconNode) {
                    iconNode.replaceWith(newIcon);
                } else {
                    itemEl.insertBefore(newIcon, nameEl);
                }
                iconNode = newIcon;
            }
            iconNode.className = appData.iconClass || '';
            iconNode.removeAttribute('style');
        }

        nameEl.innerText = appData.name || '';
    }

    const allAppItems = document.querySelectorAll('.app-item, .app-item-small');
    let appIndex = 0;

    allAppItems.forEach(item => {
        let iconBox = item.querySelector('.app-icon-box') || item.querySelector('img') || item.querySelector('i');
        const nameSpan = item.querySelector('.app-name') || item.querySelector('.app-icon-text');
        
        // We will match the app by index or by a specific ID.
        // It's better to match by finding the correct app data if possible.
        // If it has an onclick that opens an app, we can use that to find the right appData.
        const onclickAttr = item.getAttribute('onclick') || '';
        let appData = null;
        if (onclickAttr.includes("openAppByIndex(")) {
            const match = onclickAttr.match(/openAppByIndex\((\d+)\)/);
            if (match) {
                const idx = parseInt(match[1], 10);
                appData = apps[idx];
            }
        } else if (onclickAttr.includes("openApp(")) {
            const match = onclickAttr.match(/openApp\(['"]([^'"]+)['"]\)/);
            if (match) {
                const id = match[1];
                appData = apps.find(a => a.id === id);
            }
        } else if (onclickAttr.includes("openChatApp()")) {
            appData = apps.find(a => a.id === 'wechat');
        } else if (onclickAttr.includes("openWorldBookApp()")) {
            appData = apps.find(a => a.id === 'worldbook');
        } else {
            // fallback to original behavior for .app-item
            appData = apps[appIndex];
            appIndex++;
        }

        if (!iconBox || !nameSpan || !appData) return;

        if (appData) {
            if (appData.icon && isImageSource(appData.icon)) {
                if (iconBox.tagName === 'IMG') {
                    iconBox.src = appData.icon;
                    iconBox.style.objectFit = 'cover';
                    iconBox.style.display = 'block';
                    iconBox.style.borderRadius = iconBox.style.borderRadius || '10px';
                } else if (iconBox.tagName === 'I') {
                    const img = document.createElement('img');
                    img.src = appData.icon;
                    img.alt = appData.name || '';
                    img.style.borderRadius = '8px';
                    img.style.objectFit = 'cover';
                    img.style.display = 'block';
                    iconBox.replaceWith(img);
                    iconBox = img;
                } else if (iconBox.classList.contains('app-icon-box')) {
                    iconBox.innerHTML = `<img src="${appData.icon}" style="width:100%; height:100%; border-radius:10px; object-fit:cover; display:block;">`;
                    iconBox.style.fontSize = '0';
                    iconBox.style.display = 'flex';
                    iconBox.style.alignItems = 'center';
                    iconBox.style.justifyContent = 'center';
                    iconBox.style.overflow = 'hidden';
                } else {
                    iconBox.innerHTML = `<img src="${appData.icon}" style="width:100%; height:100%; border-radius:10px; object-fit:cover; display:block;">`;
                }
            } else if (appData.iconClass) {
                if (iconBox.tagName === 'IMG') {
                    const icon = document.createElement('i');
                    icon.className = appData.iconClass;
                    iconBox.replaceWith(icon);
                    iconBox = icon;
                } else if (iconBox.tagName === 'I') {
                    iconBox.className = appData.iconClass;
                    iconBox.innerHTML = '';
                    iconBox.removeAttribute('style');
                } else {
                    iconBox.innerHTML = `<i class="${appData.iconClass}"></i>`;
                    iconBox.style.fontSize = '';
                }
            }
            nameSpan.innerText = appData.name || '';
        }
    });

    renderDock();
}

// 2.5 新增：渲染DOCK栏
function renderDock() {
    const dockItems = document.querySelectorAll('.dock-item');
    dockItems.forEach(item => {
        const iconBox = item.querySelector('.dock-icon-img');
        const nameSpan = item.querySelector('span');
        
        if (!iconBox || !nameSpan) return;
        
        // 通过onclick属性判断是哪个APP
        const onclickAttr = item.getAttribute('onclick');
        let appId = null;
        
        if (onclickAttr) {
            if (onclickAttr.includes("'settings'")) {
                appId = 'settings';
            } else if (onclickAttr.includes("'todo'")) {
                appId = 'todo';
            } else if (onclickAttr.includes("'appearance'")) {
                appId = 'appearance';
            } else if (onclickAttr.includes("openChatApp()")) {
                appId = 'wechat';
            } else if (onclickAttr.includes("openWorldBookApp()")) {
                appId = 'worldbook';
            } else if (onclickAttr.includes("openMusicApp()")) {
                appId = 'music';
            } else if (onclickAttr.includes("openCoupleSpace()")) {
                appId = 'couple-space';
            }
        }
        
        if (appId) {
            const appData = window.appList.find(a => a.id === appId);
            if (appData) {
                // 更新图标
                if (appData.icon && (appData.icon.includes('/') || appData.icon.includes('.') || appData.icon.startsWith('data:image'))) {
                    // For dock items, we replace the icon with an image
                    if (appData.id === 'couple-space' && item.classList.contains('dock-item-center')) {
                        const centerIcon = item.querySelector('.center-icon');
                        if (centerIcon) {
                            centerIcon.innerHTML = `<img src="${appData.icon}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;">`;
                            centerIcon.style.background = 'transparent';
                        }
                    } else {
                        iconBox.innerHTML = `<img src="${appData.icon}" style="width:100%; height:100%; border-radius:15px; object-fit:cover; display:block;">`;
                        iconBox.style.fontSize = '0';
                        iconBox.style.background = 'transparent';
                        iconBox.style.boxShadow = 'none';
                        iconBox.style.border = 'none';
                        iconBox.style.padding = '0';
                        iconBox.style.overflow = 'hidden';
                    }
                } else if (appData.iconClass) {
                    if (appData.id === 'couple-space' && item.classList.contains('dock-item-center')) {
                        const centerIcon = item.querySelector('.center-icon');
                        if (centerIcon) {
                            centerIcon.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
                            centerIcon.style.background = 'var(--gradient-primary)';
                        }
                    } else {
                        iconBox.innerHTML = `<i class="${appData.iconClass}"></i>`;
                        iconBox.style.fontSize = '24px';
                        iconBox.style.background = 'transparent';
                        iconBox.style.border = '';
                        iconBox.style.boxShadow = '';
                        iconBox.style.padding = '';
                        iconBox.style.overflow = '';
                    }
                }
                
                // 更新名称
                nameSpan.innerText = appData.name || '';
            }
        }
    });
}
document.addEventListener('DOMContentLoaded', renderApps);

// 3. 打开 App 的窗口逻辑
const appWindow = document.getElementById('app-window');
const appTitle = document.getElementById('app-title-text');
const appContent = document.getElementById('app-content-area');

// 定义普通 App 内容
const appContentData = {
    'todo': { title: '储存', content: '' }, // 储存页内容将通过函数动态生成
};

function getCoupleLinkState() {
    let has = false;
    let roleId = '';
    try {
        has = localStorage.getItem('couple_has_linked_v1') === 'true';
        roleId = String(localStorage.getItem('couple_linked_role_id_v1') || '').trim();
    } catch (e) { }
    if (!has) return { hasCoupleLinked: false, roleId: '' };
    if (!roleId) return { hasCoupleLinked: false, roleId: '' };
    return { hasCoupleLinked: true, roleId: roleId };
}

function markCoupleSpaceExitNow() {
    try {
        const link = getCoupleLinkState();
        if (!link.hasCoupleLinked || !link.roleId) return;
        const key = 'couple_space_last_exit_time_v1_' + String(link.roleId || '').trim();
        localStorage.setItem(key, String(Date.now()));
    } catch (e) { }
}

const CoupleJealousyDomination = (function () {
    const state = {
        timer: null,
        activeOtherRoleId: '',
        since: 0,
        inFlight: false,
        flooding: false,
        popupTimer: null,
        snoozeUntil: 0,
        currentLines: [],
        lastReason: '',
        lastStayedMs: 0,
        lastTriggerAt: 0,
        lastApiAt: 0,
        lastFloodAt: 0,
        lastLines: [],
        preparedKey: '',
        preparedLines: [],
        pendingLinesPromise: null
    };

    function log(message, detail) {
        try {
            console.info('[修罗场霸屏] ' + message, detail || '');
        } catch (e) { }
    }

    function safeParse(text, fallback) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return fallback;
        }
    }

    function readSettings() {
        let raw = '';
        try { raw = localStorage.getItem('qlkj_settings_v1') || ''; } catch (e) { }
        const s = raw ? safeParse(raw, {}) : {};
        const minutesRaw = Math.floor(Number(s.xiuluoScreenFloodMinutes));
        const minutes = Number.isFinite(minutesRaw) ? Math.max(1, Math.min(15, minutesRaw)) : 5;
        return {
            enabled: s.xiuluoEnabled === true,
            floodEnabled: s.xiuluoScreenFloodEnabled === true,
            minutes: minutes,
            limitMs: minutes * 60 * 1000
        };
    }

    function getRoleName(roleId) {
        const rid = String(roleId || '').trim();
        if (!rid) return 'Ta';
        const profiles = readWechatProfilesFromMemoryOrStorage();
        const profile = profiles && profiles[rid] && typeof profiles[rid] === 'object' ? profiles[rid] : {};
        return String(profile.remark || profile.nickName || profile.name || rid).trim() || rid;
    }

    function normalizeReplyLine(text) {
        let s = String(text || '').trim();
        s = s.replace(/```(?:json)?/ig, '').replace(/```/g, '').trim();
        s = s.replace(/^[\-\d\.\)\s]+/, '').trim();
        s = s.replace(/^["“”'‘’]+|["“”'‘’]+$/g, '').trim();
        if (s.length > 42) s = s.slice(0, 42).trim();
        return s;
    }

    function extractJsonArray(text) {
        const raw = String(text || '').trim();
        if (!raw) return null;
        const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
        const candidate = fenced && fenced[1] ? String(fenced[1]).trim() : raw;
        const first = candidate.indexOf('[');
        const last = candidate.lastIndexOf(']');
        if (first < 0 || last <= first) return null;
        const parsed = safeParse(candidate.slice(first, last + 1), null);
        return Array.isArray(parsed) ? parsed : null;
    }

    function parseLines(rawText, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const allowFallback = opts.fallback !== false;
        let lines = extractJsonArray(rawText);
        if (!Array.isArray(lines) || !lines.length) {
            lines = String(rawText || '').split(/\r?\n+/);
        }
        lines = lines.map(normalizeReplyLine).filter(Boolean).slice(0, 3);
        if (!allowFallback) return lines;
        const fallback = ['还要和他聊多久？', '你答应过我的专属时间呢。', '现在回头看看我，好不好？'];
        while (lines.length < 3) lines.push(fallback[lines.length]);
        return lines.slice(0, 3);
    }

    function generateLines(coupleRoleId, otherRoleId, stayedMs) {
        return new Promise((resolve) => {
            if (typeof window.callAI !== 'function') {
                resolve([]);
                return;
            }
            const coupleName = getRoleName(coupleRoleId);
            const otherName = getRoleName(otherRoleId);
            const minutes = Math.max(1, Math.round(Number(stayedMs || 0) / 60000));
            const taskGuidance = [
                `用户在和「${otherName}」的聊天窗口连续停留了约 ${minutes} 分钟。`,
                `你是情侣空间里的正宫角色「${coupleName}」，你知道用户正在和别人聊天太久。`,
                '请根据你的人设、关系亲密度和说话风格，生成 3 句会显示在屏幕小弹窗里的短句。',
                '语气可以吃醋、委屈、占有欲、冷静警告或撒娇，但不要威胁现实安全，不要血腥暴力。',
                '每句 8~24 个中文字符左右，要像角色本人临时打断用户时说的话。'
            ].join('\n');
            const outputInstructions = '只输出严格 JSON 数组，数组里必须正好 3 个字符串，不要解释，不要代码块。';
            let systemPrompt = '当前场景：情侣空间修罗场霸屏查岗。\n' + taskGuidance + '\n\n' + outputInstructions;
            try {
                if (typeof window.buildRoleLitePrompt === 'function') {
                    systemPrompt = window.buildRoleLitePrompt('couple_space_jealousy_domination', coupleRoleId, {
                        includeContinuity: true,
                        maxSummaryLines: 8,
                        sceneIntro: '当前场景是情侣空间修罗场霸屏查岗。',
                        taskGuidance: taskGuidance,
                        outputInstructions: outputInstructions
                    });
                }
            } catch (e) { }
            const userPrompt = [
                outputInstructions,
                `聊天对象：${otherName}`,
                `停留时长：约 ${minutes} 分钟`
            ].join('\n');
            window.callAI(
                systemPrompt,
                [],
                userPrompt,
                (text) => resolve(parseLines(text, { fallback: false })),
                () => resolve([])
            );
        });
    }

    function prepareLines(coupleRoleId, otherRoleId, stayedMs) {
        const coupleId = String(coupleRoleId || '').trim();
        const otherId = String(otherRoleId || '').trim();
        if (!coupleId || !otherId) return Promise.resolve([]);
        const key = coupleId + '|' + otherId;
        if (state.preparedKey === key) {
            if (state.preparedLines && state.preparedLines.length) return Promise.resolve(state.preparedLines.slice());
            if (state.pendingLinesPromise) return state.pendingLinesPromise;
        }
        state.preparedKey = key;
        state.preparedLines = [];
        state.pendingLinesPromise = generateLines(coupleId, otherId, stayedMs).then(function (lines) {
            const clean = Array.isArray(lines) ? lines.slice(0, 3).filter(Boolean) : [];
            if (state.preparedKey === key) {
                state.preparedLines = clean;
                state.lastLines = clean.slice();
                state.lastApiAt = Date.now();
                log(clean.length ? '角色霸屏文案预生成完成' : '角色霸屏文案预生成失败', {
                    coupleRoleId: coupleId,
                    otherRoleId: otherId,
                    lines: clean
                });
            }
            return clean;
        }).catch(function () {
            if (state.preparedKey === key) {
                state.preparedLines = [];
                state.lastApiAt = Date.now();
                log('角色霸屏文案预生成失败', { coupleRoleId: coupleId, otherRoleId: otherId });
            }
            return [];
        }).finally(function () {
            if (state.preparedKey === key) state.pendingLinesPromise = null;
        });
        log('开始预生成角色霸屏文案', { coupleRoleId: coupleId, otherRoleId: otherId });
        return state.pendingLinesPromise;
    }

    function ensureOverlay() {
        let overlay = document.getElementById('jealousyOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'jealousyOverlay';
            overlay.className = 'jealousy-overlay';
            document.body.appendChild(overlay);
        }
        if (!document.getElementById('jealousyPopupStyles')) {
            const style = document.createElement('style');
            style.id = 'jealousyPopupStyles';
            style.textContent =
                '.jealousy-overlay{position:fixed;inset:0;z-index:1000000;pointer-events:none;overflow:hidden;}' +
                '.korean-window{position:absolute;width:min(260px,calc(100vw - 24px));background:rgba(245,245,245,.9);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);border-radius:8px;box-shadow:0 15px 35px rgba(0,0,0,.1),0 5px 10px rgba(0,0,0,.05);border:1px solid rgba(255,255,255,.6);pointer-events:auto;animation:windowAppear .4s cubic-bezier(.175,.885,.32,1.275) forwards;user-select:none;}' +
                '@keyframes windowAppear{from{opacity:0;transform:scale(.8) translateY(20px);}to{opacity:1;transform:scale(1) translateY(0);}}' +
                '.kw-header{display:flex;align-items:center;padding:12px 15px;border-bottom:1px solid rgba(0,0,0,.03);}.kw-dot{width:8px;height:8px;border-radius:50%;margin-right:6px;}.kw-dot.red{background:#e8a5a5;}.kw-dot.yellow{background:#ebd4a0;}.kw-dot.green{background:#a8ccba;}.kw-title{font-size:10px;font-weight:700;color:#aaa;letter-spacing:1px;margin-left:auto;text-transform:uppercase;}' +
                '.kw-body{padding:20px;text-align:center;}.kw-msg{font-size:14px;color:#555;line-height:1.6;margin-bottom:20px;font-weight:500;}.kw-footer{display:flex;gap:10px;justify-content:center;}.kw-btn{padding:8px 16px;border-radius:8px;font-size:12px;border:none;transition:all .2s;font-weight:600;cursor:pointer;}.kw-btn.primary{background:#555;color:#fff;}.kw-btn.secondary{background:rgba(0,0,0,.05);color:#888;}.kw-btn:active{transform:scale(.95);opacity:.8;}';
            document.head.appendChild(style);
        }
        return overlay;
    }

    function clear(options) {
        const opts = options && typeof options === 'object' ? options : {};
        if (state.popupTimer) {
            clearInterval(state.popupTimer);
            state.popupTimer = null;
        }
        const overlay = document.getElementById('jealousyOverlay');
        if (overlay) {
            overlay.innerHTML = '';
            overlay.style.pointerEvents = 'none';
        }
        state.flooding = false;
        state.inFlight = false;
        state.currentLines = [];
        state.preparedKey = '';
        state.preparedLines = [];
        state.pendingLinesPromise = null;
        state.activeOtherRoleId = '';
        state.since = 0;
        if (opts.snoozeMs) state.snoozeUntil = Date.now() + Number(opts.snoozeMs || 0);
        if (opts.reason) state.lastReason = String(opts.reason || '');
    }

    function createPopup(overlay, message, index, total, coupleRoleId) {
        const card = document.createElement('div');
        card.className = 'korean-window';
        card.innerHTML =
            '<div class="kw-header"><span class="kw-dot red"></span><span class="kw-dot yellow"></span><span class="kw-dot green"></span><span class="kw-title">SYSTEM ALERT</span></div>' +
            '<div class="kw-body"><p class="kw-msg"></p><div class="kw-footer"><button class="kw-btn primary" type="button">回到我身边</button><button class="kw-btn secondary" type="button">晚点再说</button></div></div>';
        const msgEl = card.querySelector('.kw-msg');
        if (msgEl) msgEl.textContent = message;
        const width = Math.max(320, document.documentElement.clientWidth || window.innerWidth || 320);
        const height = Math.max(480, document.documentElement.clientHeight || window.innerHeight || 480);
        const cardW = Math.min(260, width - 24);
        const maxX = Math.max(12, width - cardW - 12);
        const topMin = 46;
        const topMax = Math.max(topMin, Math.min(height * 0.58, height - 188));
        card.style.left = Math.round(12 + Math.random() * (maxX - 12)) + 'px';
        card.style.top = Math.round(topMin + Math.random() * (topMax - topMin) * 0.7 + (total > 1 ? index / (total - 1) : 0) * 22) + 'px';
        card.style.zIndex = String(100000 + index);
        const primary = card.querySelector('.kw-btn.primary');
        if (primary) {
            primary.onclick = function () {
                clear({ snoozeMs: readSettings().limitMs });
                openCoupleSecretSpace(coupleRoleId);
            };
        }
        const secondary = card.querySelector('.kw-btn.secondary');
        if (secondary) {
            secondary.onclick = function () {
                clear({ snoozeMs: readSettings().limitMs });
            };
        }
        overlay.appendChild(card);
        try { if (window.navigator && typeof window.navigator.vibrate === 'function') window.navigator.vibrate(35); } catch (e) { }
    }

    function flood(lines, coupleRoleId) {
        const overlay = ensureOverlay();
        overlay.innerHTML = '';
        overlay.style.pointerEvents = 'auto';
        state.flooding = true;
        state.lastFloodAt = Date.now();
        state.currentLines = Array.isArray(lines) && lines.length ? lines.slice(0, 3).filter(Boolean) : [];
        if (!state.currentLines.length) {
            state.flooding = false;
            state.lastReason = 'no_generated_lines';
            overlay.style.pointerEvents = 'none';
            log('没有角色生成文案，不弹默认霸屏窗');
            return;
        }
        state.lastLines = state.currentLines.slice();
        log('开始霸屏弹窗', { coupleRoleId: coupleRoleId, lines: state.currentLines });
        const total = 9;
        let count = 0;
        if (state.popupTimer) clearInterval(state.popupTimer);
        createPopup(overlay, state.currentLines[count % state.currentLines.length], count, total, coupleRoleId);
        count++;
        state.popupTimer = setInterval(function () {
            if (count >= total) {
                clearInterval(state.popupTimer);
                state.popupTimer = null;
                return;
            }
            const messages = state.currentLines && state.currentLines.length ? state.currentLines : [];
            if (!messages.length) return;
            createPopup(overlay, messages[count % messages.length], count, total, coupleRoleId);
            count++;
        }, 360);
    }

    function updateFloodLines(lines) {
        const next = Array.isArray(lines) && lines.length ? lines.slice(0, 3) : parseLines('');
        state.currentLines = next;
        state.lastLines = next.slice();
        const overlay = document.getElementById('jealousyOverlay');
        if (!overlay) return;
        const msgEls = overlay.querySelectorAll('.kw-msg');
        msgEls.forEach(function (el, index) {
            el.textContent = next[index % next.length];
        });
        log('已更新霸屏文案', { lines: next });
    }

    function resetCounting() {
        state.activeOtherRoleId = '';
        state.since = 0;
        state.inFlight = false;
        state.preparedKey = '';
        state.preparedLines = [];
        state.pendingLinesPromise = null;
    }

    function openCoupleSecretSpace(coupleRoleId) {
        const rid = String(coupleRoleId || '').trim();
        if (!rid) return;
        try {
            sessionStorage.setItem('couple_space_auto_enter_role_once_v1', rid);
        } catch (e) { }
        try {
            const chatView = document.getElementById('chat-view');
            const desktopView = document.getElementById('desktop-view');
            if (chatView) chatView.style.display = 'none';
            if (desktopView) desktopView.style.display = 'block';
            if (document.body && document.body.classList) document.body.classList.remove('chat-view-active');
            if (typeof window.openApp === 'function') window.openApp('couple-space');
        } catch (e2) { }
        const sendOpenSecret = function () {
            try {
                const iframe = appContent && appContent.querySelector ? appContent.querySelector('iframe') : null;
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({ type: 'COUPLE_SPACE_OPEN_SECRET', at: Date.now() }, '*');
                }
            } catch (e3) { }
        };
        setTimeout(sendOpenSecret, 260);
        setTimeout(sendOpenSecret, 760);
        setTimeout(sendOpenSecret, 1300);
    }

    function check() {
        const settings = readSettings();
        if (!settings.enabled || !settings.floodEnabled) {
            resetCounting();
            clear({ reason: 'settings_off' });
            return;
        }
        if (Date.now() < state.snoozeUntil) {
            state.lastReason = 'snoozing';
            return;
        }
        if (state.inFlight || state.flooding) return;
        const link = getCoupleLinkState();
        if (!link.hasCoupleLinked || !link.roleId) {
            resetCounting();
            state.lastReason = 'no_couple_role';
            return;
        }
        const currentRole = String(window.currentChatRole || '').trim();
        const inChat = !!(document.body && document.body.classList.contains('chat-view-active'));
        if (!inChat || !currentRole || currentRole === String(link.roleId)) {
            resetCounting();
            state.lastReason = !inChat ? 'not_in_chat' : (!currentRole ? 'no_current_chat_role' : 'chatting_with_couple_role');
            return;
        }
        if (state.activeOtherRoleId !== currentRole) {
            state.activeOtherRoleId = currentRole;
            state.since = Date.now();
            state.lastReason = 'counting_started';
            prepareLines(link.roleId, currentRole, settings.limitMs);
            log('开始计时', {
                coupleRoleId: link.roleId,
                otherRoleId: currentRole,
                limitMs: settings.limitMs
            });
            return;
        }
        const stayedMs = Date.now() - Number(state.since || Date.now());
        state.lastStayedMs = stayedMs;
        state.lastReason = stayedMs < settings.limitMs ? 'counting' : 'threshold_reached';
        if (stayedMs < settings.limitMs) return;
        state.lastTriggerAt = Date.now();
        log('达到触发时间，准备展示角色生成文案', {
            coupleRoleId: link.roleId,
            otherRoleId: currentRole,
            stayedMs: stayedMs,
            limitMs: settings.limitMs
        });
        if (state.preparedLines && state.preparedLines.length) {
            flood(state.preparedLines, link.roleId);
            return;
        }
        state.inFlight = true;
        state.lastReason = 'waiting_generated_lines';
        const pending = state.pendingLinesPromise || prepareLines(link.roleId, currentRole, stayedMs);
        pending.then(function (lines) {
            const clean = Array.isArray(lines) ? lines.filter(Boolean).slice(0, 3) : [];
            if (clean.length) {
                flood(clean, link.roleId);
            } else {
                state.lastReason = 'api_no_generated_lines';
                state.snoozeUntil = Date.now() + 30000;
                log('角色文案没有生成成功，本轮不弹默认霸屏窗，30 秒后可重试');
            }
        }).finally(function () {
            state.inFlight = false;
        });
    }

    function start() {
        if (state.timer) return;
        state.timer = setInterval(check, 1000);
        check();
    }

    function noteChatEnter(roleId) {
        const current = String(roleId || '').trim();
        if (state.activeOtherRoleId !== current) {
            state.activeOtherRoleId = '';
            state.since = 0;
            clear();
        }
        setTimeout(check, 80);
    }

    return {
        start: start,
        check: check,
        clear: clear,
        noteChatEnter: noteChatEnter,
        forceNow: function () {
            const link = getCoupleLinkState();
            const currentRole = String(window.currentChatRole || '').trim();
            if (!link.hasCoupleLinked || !link.roleId || !currentRole || currentRole === String(link.roleId)) {
                log('forceNow 未触发：状态不满足', {
                    coupleRoleId: link.roleId || '',
                    currentChatRole: currentRole
                });
                return false;
            }
            state.since = Date.now() - readSettings().limitMs - 1000;
            state.activeOtherRoleId = currentRole;
            check();
            return true;
        },
        getDebugState: function () {
            const overlay = document.getElementById('jealousyOverlay');
            return Object.assign({}, state, readSettings(), {
                currentChatRole: String(window.currentChatRole || ''),
                coupleRoleId: getCoupleLinkState().roleId || '',
                inChat: !!(document.body && document.body.classList.contains('chat-view-active')),
                overlayExists: !!overlay,
                overlayChildren: overlay ? overlay.children.length : 0
            });
        }
    };
})();

window.CoupleJealousyDomination = CoupleJealousyDomination;

let wechatDataReadyPromise = null;

function ensureWechatDataReady(options) {
    if (typeof window.initData !== 'function') return Promise.resolve();
    if (wechatDataReadyPromise) return wechatDataReadyPromise;
    try {
        const ret = window.initData(options && options.forceReload ? { forceReload: true } : undefined);
        wechatDataReadyPromise = (ret && typeof ret.then === 'function') ? ret : Promise.resolve(ret);
    } catch (e) {
        wechatDataReadyPromise = Promise.reject(e);
    }
    return wechatDataReadyPromise.catch(function (e) {
        wechatDataReadyPromise = null;
        throw e;
    });
}

function readWechatProfilesFromMemoryOrStorage() {
    const fromMem = (window.charProfiles && typeof window.charProfiles === 'object') ? window.charProfiles : null;
    if (fromMem && Object.keys(fromMem).length) return fromMem;
    try {
        const raw = localStorage.getItem('wechat_charProfiles');
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function readWechatChatDataFromMemoryOrStorage() {
    const fromMem = (window.chatData && typeof window.chatData === 'object') ? window.chatData : null;
    if (fromMem && Object.keys(fromMem).length) return fromMem;
    try {
        const raw = localStorage.getItem('wechat_chatData');
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function readWechatUnreadFromMemoryOrStorage() {
    const fromMem = (window.chatUnread && typeof window.chatUnread === 'object') ? window.chatUnread : null;
    if (fromMem && Object.keys(fromMem).length) return fromMem;
    try {
        const raw = localStorage.getItem('wechat_unread');
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function buildEligibleCoupleRoles(profiles, chatData) {
    const ids = Object.keys(profiles || {});
    const list = [];
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const p = profiles[id];
        if (!p || typeof p !== 'object') continue;
        const history = Array.isArray(chatData[id]) ? chatData[id] : [];
        const last = history.length ? history[history.length - 1] : null;
        const ts = last && typeof last.timestamp === 'number' ? last.timestamp : 0;
        list.push({
            id: id,
            name: String(p.remark || p.nickName || p.name || id),
            avatar: String(p.avatar || 'assets/chushitouxiang.jpg'),
            lastTs: ts
        });
    }
    list.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
    return list;
}

async function getEligibleCoupleRoles() {
    try {
        await ensureWechatDataReady();
    } catch (e) {
        console.error(e);
    }
    return buildEligibleCoupleRoles(
        readWechatProfilesFromMemoryOrStorage(),
        readWechatChatDataFromMemoryOrStorage()
    );
}

async function showCoupleRoleSelector() {
    const existing = document.getElementById('couple-role-sheet-mask');
    if (existing) return;

    const mask = document.createElement('div');
    mask.id = 'couple-role-sheet-mask';
    mask.className = 'couple-sheet-mask';

    const sheet = document.createElement('div');
    sheet.className = 'couple-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.innerHTML = `
        <button class="couple-sheet-exit" id="couple-sheet-exit" type="button" aria-label="退出情侣空间">×</button>
        <div class="couple-sheet-handle" aria-hidden="true"></div>
        <div class="couple-sheet-title">选择要邀请的角色</div>
        <div class="couple-sheet-subtitle">请选择一个通讯录里的 AI 角色</div>
        <div class="couple-sheet-list" id="couple-sheet-list"></div>
        <div class="couple-sheet-actions">
            <button class="couple-sheet-btn couple-sheet-btn-primary" id="couple-sheet-confirm" type="button" disabled>确认</button>
        </div>
    `;
    mask.appendChild(sheet);
    document.body.appendChild(mask);

    function closeCoupleRoleSelector() {
        if (!mask.parentNode) return;
        sheet.classList.remove('open');
        sheet.classList.add('closing');
        setTimeout(() => {
            try { mask.remove(); } catch (e) { }
        }, 220);
    }

    function exitCoupleSpaceFromSelector() {
        try { mask.remove(); } catch (e) { }
        if (typeof window.closeApp === 'function') {
            window.closeApp();
        }
    }

    mask.addEventListener('click', function (e) {
        if (e.target !== mask) return;
        closeCoupleRoleSelector();
    });

    let selectedId = '';
    const listEl = sheet.querySelector('#couple-sheet-list');
    const confirmBtn = sheet.querySelector('#couple-sheet-confirm');
    const exitBtn = sheet.querySelector('#couple-sheet-exit');

    if (exitBtn) {
        exitBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            exitCoupleSpaceFromSelector();
        });
    }

    if (listEl) {
        listEl.innerHTML = '<div style="padding:24px; text-align:center; color:#999;">正在读取联系人...</div>';
    }

    let roles = [];
    try {
        roles = await getEligibleCoupleRoles();
    } catch (e3) {
        console.error(e3);
        roles = [];
    }
    if (!roles.length) {
        if (listEl) {
            listEl.innerHTML = `
                <div class="couple-sheet-empty">
                    <div class="couple-sheet-empty-title">还没有可邀请的联系人</div>
                    <div class="couple-sheet-empty-subtitle">先去微信创建角色并聊几句，再回来绑定</div>
                    <button class="couple-sheet-btn couple-sheet-btn-ghost" type="button" id="couple-sheet-go-wechat">去微信</button>
                </div>
            `;
            const go = listEl.querySelector('#couple-sheet-go-wechat');
            if (go) {
                go.addEventListener('click', function () {
                    closeCoupleRoleSelector();
                    if (typeof window.openChatApp === 'function') {
                        window.openChatApp();
                        const plusBtn = document.getElementById('top-plus-btn');
                        if (plusBtn) plusBtn.style.display = 'block';
                    }
                });
            }
        }
        requestAnimationFrame(() => sheet.classList.add('open'));
        return;
    }

    if (listEl) {
        listEl.innerHTML = roles.map(r => {
            const safeName = String(r.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const safeAvatar = String(r.avatar || '');
            return `
                <button class="couple-sheet-item" type="button" data-role-id="${String(r.id).replace(/"/g, '&quot;')}">
                    <img class="couple-sheet-avatar" src="${safeAvatar}" alt="">
                    <div class="couple-sheet-name">${safeName}</div>
                </button>
            `;
        }).join('');
    }

    if (listEl) {
        listEl.addEventListener('click', function (e) {
            const btn = e.target && e.target.closest ? e.target.closest('.couple-sheet-item') : null;
            if (!btn) return;
            const rid = String(btn.getAttribute('data-role-id') || '').trim();
            if (!rid) return;
            selectedId = rid;
            try {
                listEl.querySelectorAll('.couple-sheet-item').forEach(el => el.classList.remove('selected'));
            } catch (e2) { }
            btn.classList.add('selected');
            if (confirmBtn) confirmBtn.disabled = false;
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', function () {
            if (!selectedId) return;
            const payload = { roleId: selectedId, inviteId: 'couple_' + Date.now().toString(36) };
            try {
                localStorage.setItem('couple_pending_invite_v1', JSON.stringify(payload));
            } catch (e) { }

            closeCoupleRoleSelector();
            setTimeout(() => {
                if (typeof window.enterChatRoom === 'function') {
                    window.enterChatRoom(selectedId);
                }
            }, 220);
        });
    }

    requestAnimationFrame(() => sheet.classList.add('open'));
}
function setMusicAppFullscreenChrome(hidden) {
    const appHeader = document.querySelector('.app-header');
    if (appHeader) appHeader.style.display = hidden ? 'none' : 'flex';
    try {
        document.body.classList.toggle('music-app-fullscreen', !!hidden);
    } catch (e) { }
}

  // 打开 App 主函数
function openApp(appId) {
    try {
        const prev = String(window.__foregroundAppId || '');
        const next = String(appId || '');
        if (prev === 'couple-space' && next !== 'couple-space') {
            markCoupleSpaceExitNow();
        }
    } catch (e) {}
    try {
        window.__foregroundAppId = String(appId || '');
        if (window.GlobalMusicPlayer && typeof window.GlobalMusicPlayer.setForegroundApp === 'function') {
            window.GlobalMusicPlayer.setForegroundApp(window.__foregroundAppId);
        }
    } catch (e) {}

    // 【核心修复】防止样式残留 - 清除容器上的所有内联样式
    if (appContent) appContent.setAttribute('style', ''); 

    setMusicAppFullscreenChrome(false);
    try {
        document.body.classList.add('app-view-active');
    } catch (e) { }

    // 处理世界书应用
    if (appId === 'worldbook') {
        if(typeof window.openWorldBookApp === 'function') {
            window.openWorldBookApp();
        } else {
            console.error("未找到 openWorldBookApp，请检查 worldbook.js 是否引入");
        }
        return;
    }

    // 处理外观应用（改为走通用 app-window，与其他 App 动画一致）
    if (appId === 'appearance') {
        if (!appWindow || !appTitle || !appContent) return;
        appTitle.innerText = '外观设置';
        appContent.setAttribute('style', 'padding: 0;');
        appContent.innerHTML = '<div id="appearance-app"></div>';
        const appearanceRoot = document.getElementById('appearance-app');
        if (appearanceRoot && typeof window.openAppearanceApp === 'function') {
            window.openAppearanceApp();
        }
        appWindow.classList.add('active');
        return;
    }

    if (appId === 'beautify') {
        try {
            if (typeof window.recordActivity === 'function') window.recordActivity('打开了美化APP');
        } catch (e) { }
        if (!appWindow || !appTitle || !appContent) return;
        const appHeader = document.querySelector('.app-header');
        if (appHeader) appHeader.style.display = 'none';
        appTitle.innerText = '美化';
        appContent.setAttribute('style', 'padding: 0; overflow: hidden; background: #faf9f8;');
        appContent.innerHTML = '<div id="beautify-app" class="beautify-app-root"></div>';
        const beautifyRoot = document.getElementById('beautify-app');
        if (beautifyRoot && window.MineCore && typeof window.MineCore.openThemeStudioApp === 'function') {
            window.MineCore.openThemeStudioApp(beautifyRoot);
        } else if (beautifyRoot) {
            beautifyRoot.innerHTML = '<div style="padding:24px; color:#666; text-align:center;">美化模块未加载</div>';
        }
        appWindow.classList.add('active');
        return;
    }

    // 处理设置应用
    if (appId === 'settings') {
        if (typeof window.openSettingsApp === 'function') {
            window.openSettingsApp(); 
        } else {
            alert("请确保 settings.js 文件已创建并引入！");
        }
        return;
    }
    
    // 储存应用特殊处理
    if (appId === 'todo') {
        if (typeof window.openStorageApp === 'function') {
            window.openStorageApp();
        } else {
            alert("储存模块还没有加载完成，请刷新页面后重试");
        }
        return;
    }

    // 情侣空间应用
    if (appId === 'couple-space') {
        try {
            if (typeof window.recordActivity === 'function') window.recordActivity('打开了情侣空间APP');
        } catch (e) { }
        if (!appWindow || !appTitle || !appContent) return;
        
        // 隐藏默认头部，实现全屏沉浸
        const appHeader = document.querySelector('.app-header');
        if (appHeader) appHeader.style.display = 'none';
        
        appTitle.innerText = '情侣空间';
        appContent.setAttribute('style', 'padding: 0; overflow: hidden; background: #fff;');
        const existingIframe = appContent.querySelector('iframe');
        const existingSrc = existingIframe && existingIframe.getAttribute('src') ? String(existingIframe.getAttribute('src')) : '';
        if (existingIframe && existingSrc.indexOf('apps/couple-space.html') !== -1) {
            try {
                existingIframe.contentWindow && existingIframe.contentWindow.postMessage({ type: 'COUPLE_SPACE_APP_ENTER', at: Date.now() }, '*');
            } catch (e) { }
        } else {
            appContent.innerHTML =
                '<iframe src="apps/couple-space.html" title="情侣空间" style="width:100%;height:100%;border:0;display:block;"></iframe>';
            try {
                const iframe = appContent.querySelector('iframe');
                if (iframe) {
                    iframe.addEventListener('load', function () {
                        try {
                            iframe.contentWindow && iframe.contentWindow.postMessage({ type: 'COUPLE_SPACE_APP_ENTER', at: Date.now() }, '*');
                        } catch (e) { }
                    }, { once: true });
                }
            } catch (e) { }
        }
        appWindow.classList.add('active');
        return;
    }

    if (appId === 'secret') {
        try {
            window.__foregroundAppId = 'secret';
            if (window.GlobalMusicPlayer && typeof window.GlobalMusicPlayer.setForegroundApp === 'function') {
                window.GlobalMusicPlayer.setForegroundApp('secret');
            }
        } catch (e) { }
        try {
            if (typeof window.recordActivity === 'function') window.recordActivity('打开了侧影APP');
        } catch (e) { }
        if (!appWindow || !appTitle || !appContent) return;
        
        // 隐藏默认头部，实现全屏沉浸
        const appHeader = document.querySelector('.app-header');
        if (appHeader) appHeader.style.display = 'none';

        appTitle.innerText = '侧影';
        appContent.setAttribute('style', 'padding: 0; overflow: hidden; background: #F0F0F3;');
        appContent.innerHTML =
            '<iframe src="private-gallery/pages/SelectRole.html" title="侧影" style="width:100%;height:100%;border:0;display:block;"></iframe>';
        appWindow.classList.add('active');
        return;
    }

    if (appId === 'music') {
        try {
            if (typeof window.recordActivity === 'function') window.recordActivity('打开了音乐APP');
        } catch (e) { }
        if (!appWindow || !appTitle || !appContent) return;
        setMusicAppFullscreenChrome(true);
        appTitle.innerText = '音乐';
        appContent.setAttribute('style', 'padding: 0; overflow: hidden; background: #fff;');
        appContent.innerHTML =
            '<iframe src="apps/music.html" title="音乐" style="width:100%;height:100%;border:0;display:block;" allow="autoplay"></iframe>';
        appWindow.classList.add('active');
        return;
    }

    if (appId === 'games') {
        try {
            if (typeof window.recordActivity === 'function') window.recordActivity('打开了游戏APP');
        } catch (e) { }
        if (!appWindow || !appTitle || !appContent) return;

        const appHeader = document.querySelector('.app-header');
        if (appHeader) appHeader.style.display = 'none';

        appTitle.innerText = '游戏';
        appContent.setAttribute('style', 'padding: 0; overflow: hidden; background: #fff;');
        appContent.innerHTML =
            '<iframe src="apps/game.html" title="游戏" style="width:100%;height:100%;border:0;display:block;"></iframe>';
        appWindow.classList.add('active');
        return;
    }

    if (appId === 'redbook') {
        try {
            if (typeof window.recordActivity === 'function') window.recordActivity('打开了小红书APP');
        } catch (e) { }
        
        if (!appWindow || !appTitle || !appContent) return;
        
        // 隐藏主框架的系统顶部栏，让小红书实现沉浸式全屏
        const appHeader = document.querySelector('.app-header');
        if (appHeader) appHeader.style.display = 'none';

        if (appTitle) appTitle.innerText = '小红书';
        if (appContent) {
            appContent.setAttribute('style', 'padding: 0; overflow: hidden; background: #f7f7f8; position: relative;');
            appContent.innerHTML = '<div id="redbook-forum-root" style="width:100%;height:100%;"></div>';
        }
        const headerBtn = document.getElementById('top-plus-btn');
        if (headerBtn) {
            headerBtn.style.display = 'none';
        }
        if (window.RedbookForumApp && typeof window.RedbookForumApp.open === 'function') {
            window.RedbookForumApp.open();
        } else if (appContent) {
            appContent.innerHTML = '<div style="padding:24px; text-align:center; color:#666;">小红书模块未加载</div>';
        }
        if (appWindow) appWindow.classList.add('active');
        return;
    }
    const data = appContentData[appId] || { title: '应用', content: '<div style="padding:20px; text-align:center;">开发中...</div>' };

    if (appTitle) appTitle.innerText = data.title;
    if (appContent) appContent.innerHTML = data.content;

    if(appWindow) appWindow.classList.add('active');
}

function closeApp() {
    try {
        if (String(window.__foregroundAppId || '') === 'couple-space') {
            markCoupleSpaceExitNow();
            try {
                const iframe = appContent && appContent.querySelector ? appContent.querySelector('iframe') : null;
                const src = iframe && iframe.getAttribute('src') ? String(iframe.getAttribute('src')) : '';
                if (iframe && src.indexOf('apps/couple-space.html') !== -1) {
                    iframe.contentWindow && iframe.contentWindow.postMessage({ type: 'COUPLE_SPACE_APP_EXIT', at: Date.now() }, '*');
                }
            } catch (e2) { }
        }
    } catch (e) {}
    if(appWindow) appWindow.classList.remove('active');
    setMusicAppFullscreenChrome(false);
    try {
        document.body.classList.remove('app-view-active');
    } catch (e0) { }
    try {
        window.__foregroundAppId = '';
        if (window.GlobalMusicPlayer && typeof window.GlobalMusicPlayer.setForegroundApp === 'function') {
            window.GlobalMusicPlayer.setForegroundApp('');
        }
    } catch (e) {}

    if (window.__resumeChatViewAfterClose) {
        window.__resumeChatViewAfterClose = false;
        const desktopView = document.getElementById('desktop-view');
        const chatView = document.getElementById('chat-view');
        if (desktopView && desktopView.style) desktopView.style.display = 'none';
        if (chatView && chatView.style) chatView.style.display = 'block';
        const plusBtn = document.getElementById('top-plus-btn');
        if (plusBtn) plusBtn.style.display = 'none';
        try {
            window.__foregroundAppId = 'chat';
            if (window.GlobalMusicPlayer && typeof window.GlobalMusicPlayer.setForegroundApp === 'function') {
                window.GlobalMusicPlayer.setForegroundApp('chat');
            }
        } catch (e) {}
    }
}

// 暴露给全局
window.openApp = openApp;
window.openAppByIndex = function(index) {
    const apps = window.appList || [];
    if (apps[index]) {
        openApp(apps[index].id);
    }
};
window.closeApp = closeApp;
window.renderApps = renderApps;
window.renderDock = renderDock;

function escapeStorageHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatStoragePageSize(bytes) {
    try {
        if (typeof window.formatBackupSize === 'function') {
            return window.formatBackupSize(bytes);
        }
    } catch (e) { }
    const n = Number(bytes || 0);
    if (!Number.isFinite(n) || n <= 0) return '0 B';
    if (n < 1024) return Math.round(n) + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
    return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function getStoragePagePercent(part, total) {
    const base = Number(total || 0);
    const value = Number(part || 0);
    if (!base || !value) return '0%';
    return ((value / base) * 100).toFixed(1) + '%';
}

function triggerStorageImportInput() {
    const input = document.getElementById('storage-import-json');
    if (!input) {
        alert('找不到导入控件，请重新打开储存页面');
        return;
    }
    input.value = '';
    input.click();
}

async function refreshStorageDashboard() {
    const root = document.getElementById('storage-center-root');
    if (!root) return;

    const totalEl = document.getElementById('storage-total-size');
    const mainEl = document.getElementById('storage-main-size');
    const secondaryEl = document.getElementById('storage-secondary-size');
    const listEl = document.getElementById('storage-analysis-list');
    const statusTitleEl = document.getElementById('storage-persist-status-title');
    const statusDescEl = document.getElementById('storage-persist-status-desc');
    const persistBtn = document.getElementById('storage-persist-btn');

    if (listEl) {
        listEl.innerHTML = '<div style="padding:24px; border-radius:20px; background:#fff; color:#9ca3af; text-align:center; font-size:13px; box-shadow:0 4px 16px rgba(149,157,165,0.08);">正在分析当前储存占用...</div>';
    }
    if (totalEl) totalEl.innerText = '--';
    if (mainEl) mainEl.innerText = '--';
    if (secondaryEl) secondaryEl.innerText = '--';

    try {
        if (typeof window.getStorageDashboardData !== 'function') {
            throw new Error('储存分析模块未加载');
        }

        const data = await window.getStorageDashboardData();
        const totalSize = Number(data && data.totalSize || 0);
        const mainSize = Number(data && data.mainSize || 0);
        const secondarySize = Number(data && data.secondarySize || 0);
        const categories = Array.isArray(data && data.categories) ? data.categories : [];
        const persistence = data && data.persistence ? data.persistence : { supported: false, persisted: false };

        if (totalEl) totalEl.innerText = formatStoragePageSize(totalSize);
        if (mainEl) mainEl.innerText = formatStoragePageSize(mainSize);
        if (secondaryEl) secondaryEl.innerText = formatStoragePageSize(secondarySize);

        if (listEl) {
            const rows = categories.filter(function (item) {
                return item && Number(item.size || 0) > 0;
            }).map(function (item) {
                const size = Number(item.size || 0);
                const percent = totalSize > 0 ? Math.max(3, Math.round((size / totalSize) * 100)) : 0;
                return `
                    <div style="padding:16px 18px; border-radius:20px; background:#fff; box-shadow:0 4px 16px rgba(149,157,165,0.08);">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                            <div style="flex:1; min-width:0;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <div style="width:8px; height:8px; border-radius:50%; background:${item.color || '#4f46e5'};"></div>
                                    <div style="font-size:15px; font-weight:700; color:#111827;">${escapeStorageHtml(item.label)}</div>
                                </div>
                                <div style="font-size:12px; color:#6b7280; margin-top:6px; padding-left:16px; line-height:1.5;">${escapeStorageHtml(item.description || '')}</div>
                            </div>
                            <div style="text-align:right; flex-shrink:0;">
                                <div style="font-size:15px; font-weight:800; color:#111827;">${formatStoragePageSize(size)}</div>
                                <div style="font-size:12px; color:#6b7280; margin-top:4px;">${getStoragePagePercent(size, totalSize)}</div>
                            </div>
                        </div>
                        <div style="margin-top:14px; height:6px; border-radius:999px; background:#f3f4f6; overflow:hidden; margin-left:16px;">
                            <div style="width:${percent}%; height:100%; border-radius:999px; background:${item.color || '#4f46e5'};"></div>
                        </div>
                    </div>
                `;
            }).join('');

            listEl.innerHTML = rows || '<div style="padding:24px; border-radius:20px; background:#fff; color:#9ca3af; text-align:center; font-size:13px; box-shadow:0 4px 16px rgba(149,157,165,0.08);">当前没有检测到可分析的本地数据</div>';
        }

        if (statusTitleEl) {
            statusTitleEl.innerText = persistence.persisted ? '持久化储存已开启' : '持久化储存未开启';
            statusTitleEl.style.color = persistence.persisted ? '#059669' : '#b45309';
        }
        if (statusDescEl) {
            if (!persistence.supported) {
                statusDescEl.innerText = '当前浏览器不支持持久化储存接口，建议定期导出备份。';
            } else if (persistence.persisted) {
                statusDescEl.innerText = '浏览器已授予防清理保护，聊天和图片数据会更安全。';
            } else {
                statusDescEl.innerText = '需要你点击开启后才会向浏览器申请；失败通常是浏览器策略限制，不代表数据已丢失。';
            }
        }
        if (persistBtn) {
            persistBtn.disabled = !persistence.supported || persistence.persisted;
            persistBtn.innerText = !persistence.supported ? '不支持' : (persistence.persisted ? '已保护' : '开启保护');
            persistBtn.style.background = persistence.persisted ? '#ecfdf5' : (persistence.supported ? '#10b981' : '#f3f4f6');
            persistBtn.style.color = persistence.persisted ? '#059669' : (persistence.supported ? '#fff' : '#9ca3af');
            persistBtn.style.boxShadow = persistence.supported && !persistence.persisted ? '0 4px 12px rgba(16,185,129,0.2)' : 'none';

            persistBtn.onclick = async function () {
                if (persistBtn.disabled || typeof window.requestStoragePersistence !== 'function') return;
                persistBtn.disabled = true;
                persistBtn.innerText = '正在开启...';
                try {
                    const ok = await window.requestStoragePersistence();
                    alert(ok
                        ? '✅ 已成功开启持久化储存保护'
                        : '⚠️ 开启失败：浏览器没有授予持久化储存权限。这通常是浏览器策略、空间状态或机型限制导致的，不代表数据已经丢失。建议先导出备份并保留多个浏览器备份。');
                } catch (e) {
                    alert('❌ 开启失败：' + (e && e.message ? e.message : '未知错误'));
                }
                refreshStorageDashboard();
            };
        }
    } catch (e) {
        console.error(e);
        if (listEl) {
            listEl.innerHTML = '<div style="padding:24px; border-radius:20px; background:#fef2f2; color:#ef4444; text-align:center; font-size:13px; box-shadow:0 4px 16px rgba(149,157,165,0.08);">储存分析失败：' + escapeStorageHtml(e && e.message ? e.message : '未知错误') + '</div>';
        }
        if (statusTitleEl) statusTitleEl.innerText = '暂时无法读取持久化状态';
        if (statusDescEl) statusDescEl.innerText = '可以稍后重新打开储存页面再试。';
    }
}

function openStorageApp() {
    const appWindow = document.getElementById('app-window');
    const appTitle = document.getElementById('app-title-text');
    const appContent = document.getElementById('app-content-area');
    if (!appWindow || !appTitle || !appContent) return;

    appTitle.innerText = '储存';
    appContent.setAttribute('style', 'padding:0; background:#f2f2f7; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;');
    appContent.innerHTML = `
        <div id="storage-center-root" style="height:100%; overflow-y:auto; padding:20px 16px 46px; box-sizing:border-box;">
            <div style="padding:24px 20px; border-radius:24px; background:#fff; box-shadow:0 8px 24px rgba(149,157,165,0.1);">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                    <div style="width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#60a5fa 0%,#3b82f6 100%); display:flex; align-items:center; justify-content:center; color:#fff; font-size:20px;">📊</div>
                    <div>
                        <div style="font-size:20px; font-weight:800; color:#111827;">储存中心</div>
                        <div style="font-size:13px; color:#6b7280; margin-top:2px;">管理本地数据、备份和浏览器防清理保护</div>
                    </div>
                </div>
                <div style="display:flex; gap:12px; margin-top:24px;">
                    <div style="flex:1; padding:16px 10px; border-radius:16px; background:#f8fafc; border:1px solid #f1f5f9; text-align:center;">
                        <div style="font-size:12px; color:#64748b; font-weight:700;">总占用</div>
                        <div id="storage-total-size" style="margin-top:8px; font-size:18px; font-weight:900; color:#0f172a;">--</div>
                    </div>
                    <div style="flex:1; padding:16px 10px; border-radius:16px; background:#f0fdf4; border:1px solid #dcfce7; text-align:center;">
                        <div style="font-size:12px; color:#166534; font-weight:700;">主备份</div>
                        <div id="storage-main-size" style="margin-top:8px; font-size:18px; font-weight:900; color:#15803d;">--</div>
                    </div>
                    <div style="flex:1; padding:16px 10px; border-radius:16px; background:#fdf4ff; border:1px solid #fae8ff; text-align:center;">
                        <div style="font-size:12px; color:#86198f; font-weight:700;">副备份</div>
                        <div id="storage-secondary-size" style="margin-top:8px; font-size:18px; font-weight:900; color:#a21caf;">--</div>
                    </div>
                </div>
            </div>

            <div style="margin-top:20px; padding:16px 20px; border-radius:20px; background:#fff; box-shadow:0 4px 16px rgba(149,157,165,0.08); display:flex; align-items:center; justify-content:space-between; gap:16px;">
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:18px;">🛡️</span>
                        <span id="storage-persist-status-title" style="font-size:16px; font-weight:800; color:#111827;">检测保护状态...</span>
                    </div>
                    <div id="storage-persist-status-desc" style="margin-top:6px; font-size:12px; line-height:1.5; color:#6b7280;">正在读取浏览器防清理保护状态</div>
                </div>
                <button id="storage-persist-btn" type="button" style="padding:8px 16px; border:none; border-radius:20px; background:#f3f4f6; color:#374151; font-size:13px; font-weight:800; cursor:pointer;">开启保护</button>
            </div>

            <div style="margin-top:24px;">
                <div style="font-size:15px; font-weight:800; color:#6b7280; margin-bottom:12px; padding-left:4px;">备份与恢复</div>
                <div style="display:flex; flex-direction:column; gap:16px; padding:20px; border-radius:24px; background:#fff; box-shadow:0 4px 16px rgba(149,157,165,0.08);">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; padding-bottom:16px; border-bottom:1px solid #f3f4f6;">
                        <div style="flex:1;">
                            <div style="font-size:16px; font-weight:800; color:#111827;">📦 导出主备份</div>
                            <div style="font-size:12px; color:#6b7280; margin-top:4px; line-height:1.5;">微信聊天、角色、记忆、朋友圈、世界书和 API 设置等核心数据</div>
                        </div>
                        <button type="button" onclick="exportAppData('main')" style="padding:10px 18px; border:none; border-radius:20px; background:#2563eb; color:#fff; font-size:13px; font-weight:800; cursor:pointer; box-shadow:0 4px 12px rgba(37,99,235,0.2);">导出</button>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; padding-bottom:16px; border-bottom:1px solid #f3f4f6;">
                        <div style="flex:1;">
                            <div style="font-size:16px; font-weight:800; color:#111827;">🧩 导出副备份</div>
                            <div style="font-size:12px; color:#6b7280; margin-top:4px; line-height:1.5;">情侣空间、小红书、外观、桌面壁纸等附属数据</div>
                        </div>
                        <button type="button" onclick="exportAppData('secondary')" style="padding:10px 18px; border:none; border-radius:20px; background:#7c3aed; color:#fff; font-size:13px; font-weight:800; cursor:pointer; box-shadow:0 4px 12px rgba(124,58,237,0.2);">导出</button>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
                        <div style="flex:1;">
                            <div style="font-size:16px; font-weight:800; color:#111827;">📥 导入备份</div>
                            <div style="font-size:12px; color:#6b7280; margin-top:4px; line-height:1.5;">支持新的 .shubaobak 单文件，也兼容旧 ZIP、part JSON 和普通 JSON</div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button type="button" onclick="refreshStorageDashboard()" style="padding:10px; border:none; border-radius:50%; background:#f3f4f6; color:#4b5563; cursor:pointer;">🔄</button>
                            <button type="button" onclick="triggerStorageImportInput()" style="padding:10px 18px; border:none; border-radius:20px; background:#0d9488; color:#fff; font-size:13px; font-weight:800; cursor:pointer; box-shadow:0 4px 12px rgba(13,148,136,0.2);">选择文件</button>
                        </div>
                        <input type="file" id="storage-import-json" accept="application/json,.json,application/zip,.zip,.shubaobak,.shubao-backup,application/x-ndjson,application/jsonl" multiple style="display:none;">
                    </div>
                </div>
            </div>

            <div style="margin-top:24px;">
                <div style="font-size:15px; font-weight:800; color:#6b7280; margin-bottom:12px; padding-left:4px;">详细分析</div>
                <div id="storage-analysis-list" style="display:flex; flex-direction:column; gap:12px;"></div>
            </div>
        </div>
    `;

    try {
        const input = document.getElementById('storage-import-json');
        if (input && !input._bound) {
            input._bound = true;
            input.addEventListener('change', function () {
                if (typeof window.importAppDataFromInput === 'function') {
                    window.importAppDataFromInput(this);
                }
            });
        }
    } catch (e) { }

    appWindow.classList.add('active');
    refreshStorageDashboard();
}

window.openStorageApp = openStorageApp;
window.refreshStorageDashboard = refreshStorageDashboard;
window.triggerStorageImportInput = triggerStorageImportInput;

window.addEventListener('message', function (ev) {
    const data = ev && ev.data ? ev.data : null;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'MUSIC_PARENT_FULLSCREEN') {
        if (String(window.__foregroundAppId || '') !== 'music') return;
        setMusicAppFullscreenChrome(true);
        return;
    }

    if (data.type === 'SECRET_CENTER_NAVIGATE') {
        if (String(window.__foregroundAppId || '') !== 'secret') return;
        const target = String(data.target || '').trim();
        const appContent = document.getElementById('app-content-area');
        if (!appContent) return;
        const iframe = appContent.querySelector('iframe');
        if (!iframe) return;
        if (target === 'home') {
            iframe.setAttribute('src', 'private-gallery/private.html');
        } else if (target === 'fangcun') {
            iframe.setAttribute('src', 'private-gallery/pages/FangCun.html');
        } else if (target === 'role_picker') {
            iframe.setAttribute('src', 'private-gallery/pages/SelectRole.html');
        }
        return;
    }
});

/* =========================================================
   === 4. 微信 (WeChat) 专用逻辑 (核心部分) ===
   ========================================================= */

// 打开微信App窗口
function openChatApp() {
    try {
        window.__foregroundAppId = 'wechat';
        if (window.GlobalMusicPlayer && typeof window.GlobalMusicPlayer.setForegroundApp === 'function') {
            window.GlobalMusicPlayer.setForegroundApp('wechat');
        }
    } catch (e) {}

    try {
        if (typeof window.recordActivity === 'function') window.recordActivity('打开了微信APP');
    } catch (e) { }

    const appWindow = document.getElementById('app-window');
    const appTitle = document.getElementById('app-title-text');
    const appContent = document.getElementById('app-content-area');
    
    if (!appWindow || !appTitle || !appContent) return;
    try {
        document.body.classList.add('app-view-active');
    } catch (e0) { }
    
    // 1. 【核心修复】强制清除容器上的残留样式，并移除 padding 防止遮挡
    appContent.setAttribute('style', 'padding: 0; overflow: hidden;'); 

    // 2. 隐藏原有的顶部加号（因为我们现在有了自定义Header）
    const topPlusBtn = document.getElementById('top-plus-btn');
    if (topPlusBtn) {
        topPlusBtn.style.display = 'none'; 
    }
    
    // 隐藏默认标题栏（因为我们有自定义Header）
    // appTitle.parentElement is .app-header
    if (appTitle && appTitle.parentElement) {
        appTitle.parentElement.style.display = 'none';
    }
    
    // 渲染 Kawaii Soft UI 结构
    appContent.innerHTML = `
        <div class="w-full h-full bg-gray-50 flex flex-col relative overflow-hidden font-sans">
            
            <!-- Tab Pages Container -->
            <div class="w-full h-full pb-16 relative">
                
                <!-- Tab: Chat (Home) -->
                <div id="tab-chat" class="chat-tab-page w-full h-full flex flex-col relative">
                    <!-- 1. Custom Header -->
                    <div class="flex flex-row justify-between items-center px-4 pt-6 pb-2 bg-gray-50 z-10">
                        <div class="text-2xl text-gray-600 cursor-pointer w-10" onclick="closeApp(); document.querySelector('.app-header').style.display='flex'"><i class='bx bx-chevron-left'></i></div>
                        <div id="wechat-header-kaomoji" class="text-xl font-bold text-gray-800 tracking-wider flex-1 text-center">Weixin</div>
                        <div class="flex items-center justify-end gap-3 w-16">
                            <div class="text-2xl text-gray-600 cursor-pointer text-center" onclick="triggerWechatContactImport()"><i class='bx bx-import'></i></div>
                            <div class="text-2xl text-gray-600 cursor-pointer text-right" onclick="window.openChatCreationMenu && window.openChatCreationMenu()"><i class='bx bx-plus'></i></div>
                        </div>
                    </div>
                    <input type="file" id="wechat-contact-import-input" accept="application/json,.json" style="display:none;">
                    <div id="wechat-import-chooser" class="fixed inset-0 z-[9999] hidden flex items-end justify-center pb-8">
                        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick="closeWechatImportChooser()"></div>
                        <div class="relative w-[90vw] max-w-[400px] flex flex-col gap-2">
                            <div class="rounded-2xl bg-white/95 backdrop-blur-xl overflow-hidden shadow-xl">
                                <div class="px-5 py-4 text-center border-b border-gray-200/50">
                                    <div class="text-[13px] font-medium text-gray-500">选择导入类型</div>
                                </div>
                                <div class="flex flex-col">
                                    <div class="px-5 py-4 cursor-pointer active:bg-gray-100 transition-colors border-b border-gray-200/50 text-center" onclick="startWechatImport('backup')">
                                        <div class="text-[18px] text-[#007aff]">导入角色备份</div>
                                    </div>
                                    <div class="px-5 py-4 cursor-pointer active:bg-gray-100 transition-colors text-center" onclick="startWechatImport('role')">
                                        <div class="text-[18px] text-[#007aff]">导入角色</div>
                                    </div>
                                </div>
                            </div>
                            <div class="rounded-2xl bg-white/95 backdrop-blur-xl overflow-hidden shadow-xl">
                                <div class="w-full text-center py-4 text-[18px] font-semibold text-[#007aff] cursor-pointer active:bg-gray-100 transition-colors" onclick="closeWechatImportChooser()">
                                    取消
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Scrollable Content Area -->
                    <div class="flex-1 overflow-y-auto px-4 no-scrollbar">
                        
                        <!-- 2. Search Bar -->
                        <div class="mt-2 mb-4">
                            <div class="w-full h-10 bg-gray-200 rounded-full flex items-center px-4 text-gray-500">
                                <i class='bx bx-search-alt-2 text-lg mr-2'></i>
                                <input type="text" placeholder="搜索" class="bg-transparent border-none outline-none text-sm w-full text-gray-600 placeholder-gray-400" oninput="filterChatList(this.value)">
                            </div>
                        </div>

                        <!-- 4. Group Filter Bar (Dynamic) -->
                        <div id="chat-filter-bar" class="w-full py-3 flex items-center gap-4 mb-2 overflow-x-auto no-scrollbar">
                             <!-- Will be populated by renderFilterBar() -->
                        </div>

                        <!-- 5. Chat Lists -->
                        <!-- Area A: Pinned -->
                        <div id="pinned-section" class="mb-4 hidden">
                             <div id="pinned-chat-list-container" class="flex flex-col bg-white rounded-[24px] overflow-hidden shadow-sm">
                                 <!-- Pinned items will be injected here -->
                             </div>
                        </div>

                        <!-- Area B: Normal -->
                        <div id="normal-section" class="mb-4">
                             <div id="kawaii-chat-list-container" class="flex flex-col bg-white rounded-[24px] overflow-hidden shadow-sm">
                                 <!-- Normal items will be injected here -->
                             </div>
                        </div>

                        <!-- Area C: Group -->
                        <div id="group-section" class="mb-4">
                             <div id="group-chat-list-container" class="flex flex-col bg-white rounded-[24px] overflow-hidden shadow-sm">
                                 <!-- Group items will be injected here -->
                             </div>
                        </div>
                    </div>
                </div>

                <!-- Tab: Moments (Discover) -->
                <div id="moments-view" class="chat-tab-page w-full h-full hidden bg-white overflow-y-auto relative">
                    <!-- Moments content will be rendered here -->
                </div>

                <!-- Tab: Me -->
                <div id="mine-view" class="chat-tab-page w-full h-full hidden bg-white overflow-y-auto">
                    <!-- Profile content -->
                </div>

            </div>
            
            <!-- Bottom Bar -->
            <div class="absolute bottom-0 w-full h-16 bg-white/90 backdrop-blur-md border-t border-gray-100 flex items-center justify-around z-20 pb-2">
                 <div class="chat-nav-btn active text-black flex flex-col items-center gap-1 cursor-pointer" onclick="switchWechatTab('chat', this)">
                     <i class='bx bxs-message-rounded-dots text-2xl'></i>
                     <span class="text-[10px] font-medium">Chats</span>
                 </div>
                 <div class="chat-nav-btn text-gray-300 flex flex-col items-center gap-1 cursor-pointer" onclick="switchWechatTab('discover', this)">
                     <i class='bx bx-compass text-2xl'></i>
                     <span class="text-[10px] font-medium">Moments</span>
                 </div>
                 <div class="chat-nav-btn text-gray-300 flex flex-col items-center gap-1 cursor-pointer" onclick="switchWechatTab('me', this)">
                     <i class='bx bx-user text-2xl'></i>
                     <span class="text-[10px] font-medium">Me</span>
                 </div>
            </div>
        </div>
    `;
    
    // 显示窗口
    appWindow.classList.add('active');

    (function () {
        const el = document.getElementById('wechat-header-kaomoji');
        if (!el) return;
        // 移除了颜文字相关的可编辑逻辑，保持固定的 Weixin 标题
    })();

    (function () {
        const input = document.getElementById('wechat-contact-import-input');
        if (!input) return;
        input.onchange = function () {
            if (window.importWechatContactFromInput) window.importWechatContactFromInput(this);
        };
    })();
    
    // 渲染列表
    loadWechatChatList();
}

// 【核心逻辑】读取 localStorage 并生成列表 HTML (适配 Kawaii Soft UI)
function loadWechatChatList(forceRender) {
    const pinnedContainer = document.getElementById('pinned-chat-list-container');
    const normalContainer = document.getElementById('kawaii-chat-list-container');
    const groupContainer = document.getElementById('group-chat-list-container');
    const pinnedSection = document.getElementById('pinned-section');
    const normalSection = document.getElementById('normal-section');
    const groupSection = document.getElementById('group-section');
    
    if (!normalContainer) return;

    const hasMemProfiles = !!(window.charProfiles && typeof window.charProfiles === 'object' && Object.keys(window.charProfiles).length);
    const hasMemChat = !!(window.chatData && typeof window.chatData === 'object' && Object.keys(window.chatData).length);
    let hasLegacyProfiles = false;
    let hasLegacyChat = false;
    try { hasLegacyProfiles = !!localStorage.getItem('wechat_charProfiles'); } catch (e0) { }
    try { hasLegacyChat = !!localStorage.getItem('wechat_chatData'); } catch (e1) { }
    const shouldWaitForInit =
        typeof window.initData === 'function' &&
        (!forceRender || ((!hasMemProfiles || !hasMemChat) && !hasLegacyProfiles && !hasLegacyChat));

    // 如果有 initData 且当前仍处于恢复窗口，则先完成恢复
    if (shouldWaitForInit) {
        try {
            const p = ensureWechatDataReady();
            if (p && typeof p.then === 'function') {
                normalContainer.innerHTML = '<div style="padding:40px; text-align:center; color:#999;">加载中...</div>';
                p.then(function () {
                    loadWechatChatList(true);
                }).catch(function (e) {
                    console.error(e);
                    loadWechatChatList(true);
                });
                return;
            }
        } catch (e) { console.error(e); }
    }

    if (pinnedContainer) pinnedContainer.innerHTML = '';
    if (groupContainer) groupContainer.innerHTML = '';
    normalContainer.innerHTML = '';

    // 1. 获取角色列表
    const profiles = readWechatProfilesFromMemoryOrStorage();

    const ids = Object.keys(profiles);

    if (ids.length === 0) {
        normalContainer.innerHTML = '<div style="padding:40px; text-align:center; color:#999;">暂无消息<br>点击右上角 + 号添加角色</div>';
        if (pinnedSection) pinnedSection.classList.add('hidden');
        return;
    }

    // 2. 获取聊天记录和未读数
    const chatData = readWechatChatDataFromMemoryOrStorage();
    const unreadMap = readWechatUnreadFromMemoryOrStorage();

    function isSuppressedMusicSystemMsg(m) {
        return (
            m &&
            (m.type === 'system' || m.type === 'system_event' || m.role === 'system') &&
            typeof m.content === 'string' &&
            m.content.indexOf('[系统]') === 0 &&
            (m.content.indexOf('一起听') !== -1 || m.content.indexOf('歌曲切换为') !== -1)
        );
    }

    function pickLastVisibleMessage(history) {
        if (!Array.isArray(history) || history.length === 0) return null;
        for (let i = history.length - 1; i >= 0; i--) {
            const m = history[i];
            if (!m) continue;
            if (m.hidden) continue;
            if (isSuppressedMusicSystemMsg(m)) continue;
            return m;
        }
        return null;
    }

    function getLastVisibleTimestamp(history) {
        const m = pickLastVisibleMessage(history);
        return m && m.timestamp ? (m.timestamp || 0) : 0;
    }

    function isRoleTyping(roleId) {
        try {
            return typeof window.isTrackedChatResponsePending === 'function'
                ? window.isTrackedChatResponsePending(roleId)
                : false;
        } catch (e) {
            return false;
        }
    }

    // 3. 排序 (按最后一条消息时间倒序)
    const sortedIds = ids.slice().sort((a, b) => {
        const ha = Array.isArray(chatData[a]) ? chatData[a] : [];
        const hb = Array.isArray(chatData[b]) ? chatData[b] : [];
        const lastTa = getLastVisibleTimestamp(ha);
        const lastTb = getLastVisibleTimestamp(hb);
        return lastTb - lastTa; // Descending
    });

    let hasPinned = false;
    let maxMsgCount = -1;
    let mostChattedId = null;

    // 4. 遍历并渲染
    sortedIds.forEach(id => {
        const p = profiles[id];
        if (!p) return;

        const history = Array.isArray(chatData[id]) ? chatData[id] : [];
        
        // 统计最常联系人 (Relationship Stats)
        if (history.length > maxMsgCount) {
            maxMsgCount = history.length;
            mostChattedId = id;
        }

        // 获取最后一条消息
        let lastMsgObj = {};
        let lastTimeDisplay = "";
        if (history.length > 0) {
            const lastVisible = pickLastVisibleMessage(history);
            if (lastVisible) lastMsgObj = lastVisible;
        }
        
        // 时间格式化
        if (lastMsgObj.timestamp) {
            const d = new Date(lastMsgObj.timestamp);
            const now = new Date();
            if (d.toDateString() === now.toDateString()) {
                lastTimeDisplay = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            } else {
                lastTimeDisplay = `${d.getMonth()+1}/${d.getDate()}`;
            }
        }

        // 消息内容预览
        let msgPreview = "暂无消息";
        if (isRoleTyping(id)) {
            msgPreview = "对方正在输入...";
        } else if (lastMsgObj.content) {
            if (lastMsgObj.content.includes('data:image') || lastMsgObj.content.includes('<img')) {
                msgPreview = "[图片]";
            } else {
                msgPreview = lastMsgObj.content;
            }
        } else if (p.desc) {
            msgPreview = p.desc;
        }

        // 计算未读数
        let unreadCount = 0;
        const info = unreadMap[id] || {};
        const lastReadTs = info.lastReadTs || 0;
        history.forEach(m => {
             if (m.role === 'ai' && (m.timestamp || 0) > lastReadTs) unreadCount++;
        });
        if (document.body && document.body.classList && document.body.classList.contains('chat-view-active') && String(window.currentChatRole || '') === String(id)) {
            unreadCount = 0;
        }

        const displayName = p.remark || p.nickName || p.name || id;

        // 渲染 HTML
        const isPinned = p.isPinned === true;
        if (isPinned) hasPinned = true;

        const unreadBadge = unreadCount > 0 && p.doNotDisturb !== true
            ? `<div class="bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center ml-2 shadow-sm border border-white" data-unread="true">${unreadCount > 99 ? '99+' : unreadCount}</div>`
            : '';

        const html = `
            <div class="chat-item bg-white p-3.5 flex items-center gap-3 active:scale-95 transition-transform duration-100 cursor-pointer border-b border-gray-100/50 last:border-0 select-none" 
                     onmousedown="startChatPress('${id}')" 
                     onmouseup="cancelChatPress()" 
                     onmouseleave="cancelChatPress()"
                     ontouchstart="startChatPress('${id}')" 
                     ontouchend="cancelChatPress()"
                     onclick="tryEnterChat('${id}')"
                     oncontextmenu="event.preventDefault(); handleChatLongPress('${id}')"
                     data-id="${id}"
                     data-pinned="${isPinned}"
                     data-unread="${unreadCount > 0}"
                     data-is-group="${!!p.isGroup}"
                     data-groups="${(p.groups || []).join(',')}">
                <div class="w-14 h-14 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 relative">
                   <img src="${p.avatar || 'assets/icons/icon-placeholder.png'}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0 ml-1">
                    <div class="flex justify-between items-center mb-1">
                       <div class="font-bold text-gray-900 text-[16px] truncate pr-2">${displayName}</div>
                       <div class="flex items-center">
                           <div class="text-[12px] text-gray-400 flex-shrink-0">${lastTimeDisplay}</div>
                           ${unreadBadge}
                       </div>
                    </div>
                    <div class="text-[13px] text-gray-500 truncate flex items-center">
                        ${msgPreview}
                    </div>
                </div>
            </div>
        `;

        if (isPinned && pinnedContainer) {
            pinnedContainer.insertAdjacentHTML('beforeend', html);
        } else if (p.isGroup && groupContainer) {
            groupContainer.insertAdjacentHTML('beforeend', html);
        } else {
            normalContainer.insertAdjacentHTML('beforeend', html);
        }
    });

    // 控制置顶区域显示
    if (hasPinned && pinnedSection) {
        pinnedSection.classList.remove('hidden');
    } else if (pinnedSection) {
        pinnedSection.classList.add('hidden');
    }
    
    // 控制普通消息区域显示
    let hasNormal = Array.from(normalContainer?.children || []).length > 0;
    if (hasNormal && normalSection) {
        normalSection.classList.remove('hidden');
    } else if (normalSection) {
        normalSection.classList.add('hidden');
    }
    
    // 控制群聊区域显示
    let hasGroup = Array.from(groupContainer?.children || []).length > 0;
    if (hasGroup && groupSection) {
        groupSection.classList.remove('hidden');
    } else if (groupSection) {
        groupSection.classList.add('hidden');
    }

    // 更新 Relationship Stats
    updateRelationshipStats(mostChattedId, profiles, chatData);
    
    // 渲染动态过滤栏
    renderFilterBar();
}

// 辅助：更新关系卡片 (支持手动选择)
function updateRelationshipStats(defaultId, profiles, chatData) {
    // 优先使用用户手动选择的角色 (支持 LocalStorage 持久化)
    let charId = window.currentStatsPartnerId;
    if (!charId) {
        charId = localStorage.getItem('wechat_stats_partner_id');
        if (charId && profiles[charId]) {
            window.currentStatsPartnerId = charId;
        } else {
            charId = null; // Reset if invalid
        }
    }
    if (!charId) charId = defaultId;
    
    if (!charId || !profiles[charId]) return;

    const p = profiles[charId];
    const history = chatData[charId] || [];
    const count = history.length;
    
    // 计算认识天数 (第一条消息的时间)
    let days = 0;
    if (count > 0) {
        const dayMs = 1000 * 60 * 60 * 24;
        let firstTs = 0;
        for (let i = 0; i < history.length; i++) {
            const m = history[i];
            const ts = m && typeof m.timestamp === 'number' ? m.timestamp : 0;
            if (ts > 0) {
                firstTs = ts;
                break;
            }
        }
        if (firstTs > 0) {
            const diff = Date.now() - firstTs;
            days = Math.max(1, Math.ceil(diff / dayMs));
        } else {
            days = 1;
        }
    }

    // 更新 DOM
    const userAvatarEl = document.getElementById('stats-user-avatar');
    const partnerAvatarEl = document.getElementById('stats-partner-avatar');
    const daysEl = document.getElementById('stats-days');
    const countEl = document.getElementById('stats-count');

    const personas = window.userPersonas || {};
    const userPersona = personas[charId] || {};
    const userAvatar = userPersona.avatar || localStorage.getItem('user_avatar') || 'assets/chushitouxiang.jpg';
    if (userAvatarEl) userAvatarEl.src = userAvatar;

    if (partnerAvatarEl) partnerAvatarEl.src = p.avatar || 'assets/icons/icon-placeholder.png';
    if (daysEl) daysEl.innerText = days;
    if (countEl) countEl.innerText = count;
}

// 辅助：分类过滤
window.filterChatListByCategory = function(category, btnEl) {
    // 1. 更新按钮样式
    const pills = document.querySelectorAll('.filter-pill');
    pills.forEach(p => {
        // Remove active styles
        p.classList.remove('bg-gray-200', 'text-gray-800', 'border', 'border-gray-300');
        // Add inactive styles
        p.classList.add('bg-gray-100', 'text-gray-500');
    });
    if (btnEl) {
        // Add active styles
        btnEl.classList.remove('bg-gray-100', 'text-gray-500');
        btnEl.classList.add('bg-gray-200', 'text-gray-800', 'border', 'border-gray-300');
    }

    // 2. 执行过滤
    const allItems = document.querySelectorAll('.chat-item');
    allItems.forEach(item => {
        let show = false;
        if (category === 'all') {
            show = true;
        } else if (category === 'group') {
            show = item.getAttribute('data-is-group') === 'true';
        } else {
            // Check custom group
            const groupsStr = item.getAttribute('data-groups') || '';
            const groups = groupsStr.split(',');
            show = groups.includes(category);
        }
        
        item.style.display = show ? 'flex' : 'none';
    });
}

// 简单的搜索过滤功能 (保留)
window.filterChatList = function(keyword) {
    keyword = keyword.toLowerCase();
    const allItems = document.querySelectorAll('.chat-item');
    allItems.forEach(item => {
        const nameEl = item.querySelector('.font-bold');
        const msgEl = item.querySelector('.text-xs.text-gray-400'); // Note: class selector might need to be precise
        if (nameEl) {
            const text = (nameEl.innerText + " " + (msgEl ? msgEl.innerText : "")).toLowerCase();
            item.style.display = text.includes(keyword) ? 'flex' : 'none';
        }
    });
};

/* === 把 apps.js 里的 switchWechatTab 函数替换成这个 === */

// 【关键补丁】Tab 切换功能 + 自动渲染朋友圈
function switchWechatTab(tabName, btnElement) {
    const pages = Array.from(document.querySelectorAll('.chat-tab-page'));
    pages.forEach(el => {
        el.style.display = '';
        el.classList.add('hidden');
    });
    
    // 2. 显示目标页面
    const tabMap = {
        'chat': 'tab-chat',
        'discover': 'moments-view',
        'me': 'mine-view'
    };
    const targetId = tabMap[tabName];
    const targetPage = document.getElementById(targetId);
    if (targetPage) targetPage.classList.remove('hidden');
    
    // 3. 更新底部按钮样式
    document.querySelectorAll('.chat-nav-btn').forEach(btn => {
        btn.classList.remove('active', 'text-black');
        btn.classList.add('text-gray-300');
    });
    if(btnElement) {
        btnElement.classList.add('active', 'text-black');
        btnElement.classList.remove('text-gray-300');
    }

    // 🔥【新增逻辑】如果用户点了“发现”页，且朋友圈渲染函数存在，就立即执行渲染
    if (tabName === 'discover') {
        try {
            if (typeof window.recordActivity === 'function') window.recordActivity('进入了微信朋友圈');
        } catch (e) { }
        const appWindow = document.getElementById('app-window');
        if (appWindow) {
            appWindow.classList.add('moments-fullscreen');
        }
        document.body.classList.add('moments-hide-status');
        if (typeof window.renderMoments === 'function') {
            window.renderMoments();
        } else {
            console.warn("注意：window.renderMoments 未找到。请检查 moments.js 是否已引入");
        }
    } else {
        const appWindow = document.getElementById('app-window');
        if (appWindow) {
            appWindow.classList.remove('moments-fullscreen');
        }
        document.body.classList.remove('moments-hide-status');
    }

    if (tabName === 'me' && window.MineCore && typeof window.MineCore.show === 'function') {
        window.MineCore.show();
    }
}

// 【关键补丁】进入聊天室（不跳转页面，切换到全屏聊天层）
async function enterChatRoom(characterId) {
    try {
        await ensureWechatDataReady();
    } catch (e) {
        console.error(e);
    }
    try {
        window.__foregroundAppId = 'chat';
        if (window.GlobalMusicPlayer && typeof window.GlobalMusicPlayer.setForegroundApp === 'function') {
            window.GlobalMusicPlayer.setForegroundApp('chat');
        }
    } catch (e) {}

    try {
        const profiles = (window.charProfiles && typeof window.charProfiles === 'object') ? window.charProfiles : readWechatProfilesFromMemoryOrStorage();
        const p = profiles && profiles[characterId] && typeof profiles[characterId] === 'object' ? profiles[characterId] : {};
        const name = String(p.remark || p.nickName || p.name || characterId || 'Ta').trim() || 'Ta';
        if (typeof window.recordActivity === 'function') {
            window.recordActivity('进入了与 ' + name + ' 的聊天');
        }
    } catch (e) { }

    // 1. 保存当前聊谁
    window.currentChatRole = characterId;
    localStorage.setItem('currentChatId', characterId);

    // 2. 关闭列表窗口 (App Window)
    closeApp(); 
    // 同时隐藏右上角的加号（因为进入聊天室不需要那个加号了）
    const plusBtn = document.getElementById('top-plus-btn');
    if(plusBtn) plusBtn.style.display = 'none';

    // 3. 打开全屏聊天大盒子
    document.getElementById('desktop-view').style.display = 'none'; // 隐藏桌面
    document.getElementById('chat-view').style.display = 'block';   // 显示聊天室容器
    document.body.classList.add('chat-view-active');

    // 4. 调用 chat.js 里的 enterChat 函数来渲染聊天内容
    if (typeof window.enterChat === 'function') {
        window.enterChat(characterId);
    } else {
        console.error("未找到 enterChat 函数，请检查 chat.js 是否引入");
    }
    try {
        if (window.CoupleJealousyDomination && typeof window.CoupleJealousyDomination.noteChatEnter === 'function') {
            window.CoupleJealousyDomination.noteChatEnter(characterId);
        }
    } catch (e) { }
}

// 暴露给全局
window.openChatApp = openChatApp;
window.loadWechatChatList = loadWechatChatList;
window.switchWechatTab = switchWechatTab;
window.enterChatRoom = enterChatRoom;
try {
    if (window.CoupleJealousyDomination && typeof window.CoupleJealousyDomination.start === 'function') {
        window.CoupleJealousyDomination.start();
    }
} catch (e) { }

/* =========================================================
   === 4.1 新增功能：长按菜单、自定义分组、角色选择 ===
   ========================================================= */

// --- A. 长按交互逻辑 ---
let chatPressTimer = null;
let isLongPress = false;
let longPressHandled = false; // Prevent click after long press

window.startChatPress = function(id) {
    isLongPress = false;
    longPressHandled = false;
    chatPressTimer = setTimeout(() => {
        isLongPress = true;
        longPressHandled = true;
        handleChatLongPress(id);
    }, 600); // 600ms 长按触发
}

window.cancelChatPress = function() {
    if (chatPressTimer) {
        clearTimeout(chatPressTimer);
        chatPressTimer = null;
    }
}

window.tryEnterChat = function(id) {
    // 如果刚刚触发了长按，就不进入聊天
    if (longPressHandled) {
        longPressHandled = false;
        return;
    }
    enterChatRoom(id);
}

// 长按菜单
window.handleChatLongPress = function(id) {
    // 震动反馈 (如果有 API)
    if (navigator.vibrate) navigator.vibrate(50);

    const profiles = window.charProfiles || {};
    const p = profiles[id];
    if (!p) return;

    const displayName = p.remark || p.nickName || p.name || id;

    // 创建菜单 DOM
    const existingMenu = document.getElementById('chat-long-press-menu');
    if (existingMenu) existingMenu.remove();

    const isPinned = p.isPinned === true;
    
    // 获取当前分组
    const currentGroups = p.groups || [];
    
    const menuHtml = `
        <div id="chat-long-press-menu" class="fixed inset-0 z-[10050] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" style="z-index:10050;" onclick="this.remove()">
            <div class="bg-white w-64 rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100" onclick="event.stopPropagation()">
                <div class="p-4 border-b border-gray-100 flex items-center gap-3">
                    <img src="${p.avatar}" class="w-10 h-10 rounded-full object-cover">
                    <div class="font-bold text-gray-800">${displayName}</div>
                </div>
                
                <div class="flex flex-col p-2">
                    <!-- 置顶/取消置顶 -->
                    <div class="p-3 hover:bg-gray-50 rounded-xl cursor-pointer flex items-center gap-3 text-gray-700" onclick="togglePin('${id}')">
                        <i class='bx ${isPinned ? 'bxs-pin-off' : 'bxs-pin'} text-xl'></i>
                        <span>${isPinned ? '取消置顶' : '置顶聊天'}</span>
                    </div>
                    
                    <!-- 设置分组 -->
                    <div class="p-3 hover:bg-gray-50 rounded-xl cursor-pointer flex items-center gap-3 text-gray-700" onclick="openGroupSelector('${id}')">
                        <i class='bx bx-purchase-tag-alt text-xl'></i>
                        <span>设置分组</span>
                    </div>

                    <div class="p-3 hover:bg-gray-50 rounded-xl cursor-pointer flex items-center gap-3 text-gray-700" onclick="exportWechatContactBackup('${id}')">
                        <i class='bx bx-download text-xl'></i>
                        <span>导出该联系人</span>
                    </div>

                    <div class="p-3 hover:bg-red-50 rounded-xl cursor-pointer flex items-center gap-3 text-red-500" onclick="requestDeleteRole('${id}')">
                        <i class='bx bx-trash text-xl'></i>
                        <span>删除角色</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', menuHtml);
}

window.togglePin = function(id) {
    const profiles = window.charProfiles || {};
    if (profiles[id]) {
        profiles[id].isPinned = !profiles[id].isPinned;
        saveProfiles(profiles);
        loadWechatChatList(); // 重新渲染
    }
    // 关闭菜单
    const menu = document.getElementById('chat-long-press-menu');
    if (menu) menu.remove();
}

window.requestDeleteRole = function (id) {
    const profiles = (window.charProfiles && typeof window.charProfiles === 'object')
        ? window.charProfiles
        : readWechatProfilesFromMemoryOrStorage();
    const p = profiles && profiles[id] ? profiles[id] : null;
    if (!p) return;

    const displayName = p.remark || p.nickName || p.name || id;

    const menu = document.getElementById('chat-long-press-menu');
    if (menu) menu.remove();

    const existing = document.getElementById('wechat-confirm-modal');
    if (existing) existing.remove();

    const modalHtml = `
        <div id="wechat-confirm-modal" class="fixed inset-0 z-[10060] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" style="z-index:10060;" onclick="closeWechatConfirmModal()">
            <div class="bg-white w-72 rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100" onclick="event.stopPropagation()">
                <div class="p-5 text-center">
                    <div class="text-[16px] font-semibold text-gray-900">删除角色</div>
                    <div class="mt-2 text-[13px] text-gray-500 leading-relaxed">删除后无法恢复，确定删除「${displayName}」吗？</div>
                </div>
                <div class="flex border-t border-gray-100">
                    <button class="flex-1 py-3 text-[15px] text-gray-600 hover:bg-gray-50" onclick="closeWechatConfirmModal()">取消</button>
                    <button class="flex-1 py-3 text-[15px] text-red-500 hover:bg-red-50" onclick="confirmDeleteRole('${id}')">确定</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeWechatConfirmModal = function () {
    const modal = document.getElementById('wechat-confirm-modal');
    if (modal) modal.remove();
};

window.confirmDeleteRole = function (id) {
    window.closeWechatConfirmModal();
    window.deleteRole(id);
};

window.deleteRole = async function (id) {
    const profiles = (window.charProfiles && typeof window.charProfiles === 'object')
        ? window.charProfiles
        : readWechatProfilesFromMemoryOrStorage();

    try {
        if (window.WechatStore && typeof window.WechatStore.deleteRole === 'function') {
            await window.WechatStore.deleteRole(id);
        } else {
            if (profiles && profiles[id]) {
                delete profiles[id];
                const saveResult = saveProfiles(profiles);
                if (saveResult && typeof saveResult.then === 'function') {
                    await saveResult;
                }
            }
            if (window.chatData && window.chatData[id]) delete window.chatData[id];
            if (window.userPersonas && window.userPersonas[id]) delete window.userPersonas[id];
            if (window.chatUnread && window.chatUnread[id] != null) delete window.chatUnread[id];
        }
    } catch (e0) {
        console.error('删除角色失败', e0);
        alert('❌ 删除失败：' + (e0 && e0.message ? e0.message : '未知错误'));
        return;
    }

    if (!window.WechatStore) {
        try {
            if (window.chatData) localStorage.setItem('wechat_chatData', JSON.stringify(window.chatData));
            if (window.chatUnread) localStorage.setItem('wechat_unread', JSON.stringify(window.chatUnread));
        } catch (e) { }
    }

    try {
        if (String(window.currentChatRole || '') === String(id)) {
            window.currentChatRole = '';
            localStorage.removeItem('currentChatId');
        }
    } catch (e) {}

    if (typeof loadWechatChatList === 'function') {
        loadWechatChatList(true);
    }
    if (typeof window.saveData === 'function') {
        try {
            const ret = window.saveData();
            if (ret && typeof ret.catch === 'function') ret.catch(function () {});
        } catch (e) {}
    }
};

// 辅助：保存 Profiles
function saveProfiles(profiles) {
    window.charProfiles = profiles;
    if (window.WechatStore && typeof window.WechatStore.saveSnapshotFromWindow === 'function') {
        return window.WechatStore.saveSnapshotFromWindow().catch(function (err) {
            console.error('保存角色资料到 wechat_v2 失败', err);
        });
    }
    const key = 'wechat_charProfiles';
    try {
        if (window.DB && typeof window.DB.configLargeStore === 'function') {
            window.DB.configLargeStore();
        }
    } catch (e) { }

    if (window.localforage && typeof window.localforage.setItem === 'function') {
        try {
            if (window.DB && typeof window.DB.isLargeStoreReady === 'function' && window.DB.isLargeStoreReady()) {
                try { localStorage.setItem(key, JSON.stringify(profiles || {})); } catch (e0) { }
                return window.localforage.setItem(key, profiles || {}).catch(function (err) {
                    console.error('保存角色资料到 localforage 失败', err);
                });
            }
        } catch (e) { }
    }

    try {
        localStorage.setItem(key, JSON.stringify(profiles || {}));
    } catch (e) {
        console.warn('localStorage 保存角色资料失败，尝试切换到 localforage', e);
        if (window.localforage && typeof window.localforage.setItem === 'function') {
            return window.localforage.setItem(key, profiles || {}).catch(function (err) {
                console.error('保存角色资料到 localforage 失败', err);
            });
        }
        throw e;
    }
}

window.openWechatImportChooser = function () {
    const modal = document.getElementById('wechat-import-chooser');
    if (modal) modal.classList.remove('hidden');
};

window.closeWechatImportChooser = function () {
    const modal = document.getElementById('wechat-import-chooser');
    if (modal) modal.classList.add('hidden');
};

window.startWechatImport = function (mode) {
    const input = document.getElementById('wechat-contact-import-input');
    if (!input) {
        alert('找不到导入控件，请重新打开微信页面');
        return;
    }
    window.__wechatImportMode = mode === 'role' ? 'role' : 'backup';
    window.closeWechatImportChooser && window.closeWechatImportChooser();
    input.value = '';
    input.click();
};

window.triggerWechatContactImport = function () {
    window.openWechatImportChooser && window.openWechatImportChooser();
};

window.exportWechatContactBackup = async function (roleId) {
    const closeMenu = function () {
        const menu = document.getElementById('chat-long-press-menu');
        if (menu) menu.remove();
    };

    const ensureReady = async function () {
        if (typeof window.initData !== 'function') return;
        try {
            const ret = window.initData();
            if (ret && typeof ret.then === 'function') await ret;
        } catch (e) { }
    };

    const safeFileName = function (name) {
        return String(name || '')
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 40) || 'contact';
    };

    const downloadText = function (filename, text) {
        const blob = new Blob([String(text || '')], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    try {
        await ensureReady();
        const id = String(roleId || '');
        let payload = null;
        if (window.WechatStore && typeof window.WechatStore.exportContactBackup === 'function') {
            payload = await window.WechatStore.exportContactBackup(id);
        } else {
            const profiles = window.charProfiles || {};
            const p = profiles[id];
            if (!p) {
                alert('导出失败：找不到该联系人');
                closeMenu();
                return;
            }
            payload = {
                __shubao_contact_backup__: 1,
                version: 1,
                createdAt: new Date().toISOString(),
                roleId: id,
                profile: p,
                chatData: (window.chatData && window.chatData[id]) ? window.chatData[id] : [],
                chatMapData: (window.chatMapData && window.chatMapData[id]) ? window.chatMapData[id] : null,
                userPersona: (window.userPersonas && window.userPersonas[id]) ? window.userPersonas[id] : null,
                chatBackground: (window.chatBackgrounds && window.chatBackgrounds[id]) ? window.chatBackgrounds[id] : null,
                callLogs: (window.callLogs && window.callLogs[id]) ? window.callLogs[id] : [],
                unread: (window.chatUnread && window.chatUnread[id]) ? window.chatUnread[id] : null,
                memoryArchive: (window.memoryArchiveStore && window.memoryArchiveStore[id]) ? window.memoryArchiveStore[id] : null
            };
        }

        const p = payload.profile || {};
        const displayName = p.remark || p.nickName || p.name || id;
        const stamp = payload.createdAt.replace(/[:.]/g, '-');
        const filename = 'shubao-contact-' + safeFileName(displayName) + '-' + stamp + '.json';
        downloadText(filename, JSON.stringify(payload));
        closeMenu();
        alert('✅ 已导出该联系人');
    } catch (e) {
        console.error(e);
        closeMenu();
        alert('❌ 导出失败：' + (e && e.message ? e.message : '未知错误'));
    }
};

window.importWechatContactFromInput = async function (fileInput) {
    const safeParse = function (text) {
        try {
            return JSON.parse(String(text || ''));
        } catch (e) {
            return null;
        }
    };

    const isObject = function (value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    };

    const toTrimmedString = function (value) {
        return String(value == null ? '' : value).trim();
    };

    const normalizeWorldBookIdList = function (value) {
        if (!value) return [];
        if (Array.isArray(value)) {
            return value.map(v => toTrimmedString(v)).filter(Boolean);
        }
        if (typeof value === 'string') {
            const text = toTrimmedString(value);
            if (!text) return [];
            if (text.indexOf(',') !== -1) {
                return text.split(',').map(v => toTrimmedString(v)).filter(Boolean);
            }
            return [text];
        }
        return [];
    };

    const normalizeRoleProfile = function (rawProfile, fallbackName) {
        const src = isObject(rawProfile) ? rawProfile : {};
        const profile = Object.assign({}, src);
        const resolvedName = toTrimmedString(
            profile.nickName ||
            profile.name ||
            profile.character_name ||
            profile.characterName ||
            profile.title ||
            profile.alias ||
            fallbackName ||
            'TA'
        ) || 'TA';

        profile.nickName = resolvedName;
        if (!profile.name) profile.name = resolvedName;
        profile.realName = toTrimmedString(profile.realName || profile.real_name || profile.character_name || profile.characterName || resolvedName);
        profile.remark = toTrimmedString(profile.remark);
        profile.desc = toTrimmedString(profile.desc || profile.description || profile.persona || profile.prompt || profile.system_prompt || profile.systemPrompt);
        profile.style = toTrimmedString(profile.style);
        profile.schedule = toTrimmedString(profile.schedule);
        profile.avatar = toTrimmedString(profile.avatar || profile.image || profile.portrait || profile.avatar_url || profile.avatarUrl);
        profile.gender = toTrimmedString(profile.gender);
        profile.language = toTrimmedString(profile.language || profile.lang || profile.nativeLanguage || profile.native_language || profile.spokenLanguage || profile.spoken_language || profile.locale || profile.languageName);
        profile.worldbookId = normalizeWorldBookIdList(profile.worldbookId);
        const aliasWorldBookIds = normalizeWorldBookIdList(profile.worldbookIds || profile.worldBookIds || profile.world_book_ids);
        if (aliasWorldBookIds.length) {
            const merged = profile.worldbookId.concat(aliasWorldBookIds);
            profile.worldbookId = Array.from(new Set(merged));
        }
        return profile;
    };

    const ensureWorldBookStore = function () {
        if (!window.worldBooks || typeof window.worldBooks !== 'object' || Array.isArray(window.worldBooks)) {
            window.worldBooks = {};
        }
        return window.worldBooks;
    };

    const saveWorldBooksIfNeeded = async function () {
        try {
            if (typeof saveWorldBooks === 'function') {
                const ret = saveWorldBooks();
                if (ret && typeof ret.then === 'function') await ret;
                return;
            }
            localStorage.setItem('wechat_worldbooks', JSON.stringify(window.worldBooks || {}));
        } catch (e) { }
    };

    const normalizeWorldBooksIfNeeded = async function () {
        try {
            if (typeof normalizeWorldBookCategories === 'function') {
                const ret = normalizeWorldBookCategories();
                if (ret && typeof ret.then === 'function') await ret;
                return;
            }
            const categories = [];
            const seen = new Set();
            Object.keys(window.worldBooks || {}).forEach(id => {
                const book = window.worldBooks[id];
                const category = toTrimmedString(book && book.category);
                if (!category || category === '全部' || seen.has(category)) return;
                seen.add(category);
                categories.push(category);
            });
            window.worldBookCategories = categories;
            localStorage.setItem('wechat_worldbook_categories', JSON.stringify(categories));
        } catch (e) { }
    };

    const getWorldBookTitle = function (book) {
        if (!isObject(book)) return '';
        return toTrimmedString(book.title || book.name || book.comment || book.label || '');
    };

    const getWorldBookContent = function (book) {
        if (!isObject(book)) return '';
        return toTrimmedString(book.content || book.text || book.value || '');
    };

    const findWorldBookIdByTitleAndContent = function (title, content) {
        const books = ensureWorldBookStore();
        const targetTitle = toTrimmedString(title).toLowerCase();
        const targetContent = toTrimmedString(content);
        const ids = Object.keys(books);
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const book = books[id];
            if (!book) continue;
            const existingTitle = getWorldBookTitle(book).toLowerCase();
            const existingContent = getWorldBookContent(book);
            if (existingTitle === targetTitle && existingContent === targetContent) {
                return id;
            }
        }
        return '';
    };

    const findWorldBookIdByTitle = function (title) {
        const books = ensureWorldBookStore();
        const targetTitle = toTrimmedString(title).toLowerCase();
        const ids = Object.keys(books);
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const book = books[id];
            if (!book) continue;
            if (getWorldBookTitle(book).toLowerCase() === targetTitle) {
                return id;
            }
        }
        return '';
    };

    const pushUnique = function (list, value) {
        const id = toTrimmedString(value);
        if (!id) return;
        if (list.indexOf(id) === -1) list.push(id);
    };

    const collectEmbeddedWorldBooks = function (json, fallbackName) {
        const importedIds = [];
        const books = ensureWorldBookStore();
        const sourceName = toTrimmedString(fallbackName) || '导入的角色设定';

        const addBook = function (title, content, categoryName) {
            const normalizedTitle = toTrimmedString(title);
            const normalizedContent = toTrimmedString(content);
            if (!normalizedTitle || !normalizedContent) return;

            const exactId = findWorldBookIdByTitleAndContent(normalizedTitle, normalizedContent);
            if (exactId) {
                pushUnique(importedIds, exactId);
                return;
            }

            let finalTitle = normalizedTitle;
            const categoryLabel = toTrimmedString(categoryName) || sourceName;
            if (findWorldBookIdByTitle(finalTitle)) {
                finalTitle = `${finalTitle} (${sourceName})`;
                if (findWorldBookIdByTitle(finalTitle)) {
                    finalTitle = `${finalTitle}_${Math.random().toString(36).slice(2, 6)}`;
                }
            }

            const newId = `wb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            books[newId] = {
                title: finalTitle,
                content: normalizedContent,
                category: categoryLabel
            };
            pushUnique(importedIds, newId);
        };

        const containers = [
            json,
            isObject(json.data && json.data.data) ? json.data.data : null,
            isObject(json.data) ? json.data : null,
            isObject(json.profile) ? json.profile : null,
            isObject(json.charProfile) ? json.charProfile : null,
            isObject(json.character) ? json.character : null,
            isObject(json.characterData) ? json.characterData : null,
            isObject(json.character_data) ? json.character_data : null,
            isObject(json.card) ? json.card : null
        ].filter(Boolean);

        containers.forEach(container => {
            const worldBookSource = isObject(container.character_book) ? container.character_book : null;
            if (worldBookSource && Array.isArray(worldBookSource.entries)) {
                worldBookSource.entries.forEach(entry => {
                    if (!isObject(entry)) return;
                    const entryTitle = toTrimmedString(
                        entry.comment ||
                        entry.name ||
                        entry.title ||
                        entry.key ||
                        (Array.isArray(entry.keys) ? entry.keys.join(', ') : '')
                    );
                    const entryContent = toTrimmedString(entry.content || entry.text || entry.value || '');
                    if (entryTitle && entryContent) {
                        addBook(entryTitle, entryContent, sourceName);
                    }
                });
            }

            const worldInfoSource = container.world_info != null ? container.world_info : container.wi;
            if (typeof worldInfoSource === 'string') {
                const blocks = worldInfoSource.split(/\n\s*\n/).map(v => toTrimmedString(v)).filter(Boolean);
                blocks.forEach(block => {
                    const lines = block.split('\n').map(v => toTrimmedString(v));
                    if (!lines.length) return;
                    const title = lines[0];
                    const content = lines.slice(1).join('\n').trim();
                    if (title && content) {
                        addBook(title, content, sourceName);
                    }
                });
            } else if (isObject(worldInfoSource) && Array.isArray(worldInfoSource.entries)) {
                worldInfoSource.entries.forEach(entry => {
                    if (!isObject(entry)) return;
                    const entryTitle = toTrimmedString(entry.comment || entry.name || entry.title || '');
                    const entryContent = toTrimmedString(entry.content || entry.text || entry.value || '');
                    if (entryTitle && entryContent) {
                        addBook(entryTitle, entryContent, sourceName);
                    }
                });
            } else if (Array.isArray(worldInfoSource)) {
                worldInfoSource.forEach(entry => {
                    if (!isObject(entry)) return;
                    const entryTitle = toTrimmedString(entry.comment || entry.name || entry.title || '');
                    const entryContent = toTrimmedString(entry.content || entry.text || entry.value || '');
                    if (entryTitle && entryContent) {
                        addBook(entryTitle, entryContent, sourceName);
                    }
                });
            }
        });

        const topEntries = isObject(json.entries)
            ? Object.values(json.entries).filter(isObject)
            : (Array.isArray(json.entries) ? json.entries.filter(isObject) : []);
        topEntries.forEach(entry => {
            const entryTitle = toTrimmedString(
                entry.comment ||
                entry.name ||
                entry.title ||
                entry.key ||
                (Array.isArray(entry.keys) ? entry.keys.join(', ') : '')
            );
            const entryContent = toTrimmedString(entry.content || entry.text || entry.value || '');
            if (entryTitle && entryContent) {
                addBook(entryTitle, entryContent, sourceName);
            }
        });

        return importedIds;
    };

    const ensureRoleStores = function (targetId) {
        if (!window.chatData) window.chatData = {};
        if (!window.chatMapData) window.chatMapData = {};
        if (!window.userPersonas) window.userPersonas = {};
        if (!window.chatBackgrounds) window.chatBackgrounds = {};
        if (!window.callLogs) window.callLogs = {};
        if (!window.chatUnread) window.chatUnread = {};
        if (!window.memoryArchiveStore) window.memoryArchiveStore = {};

        if (!Array.isArray(window.chatData[targetId])) window.chatData[targetId] = [];
        if (!isObject(window.chatMapData[targetId])) window.chatMapData[targetId] = {};
        if (!isObject(window.userPersonas[targetId])) {
            window.userPersonas[targetId] = {
                name: '',
                setting: '',
                avatar: 'assets/chushitouxiang.jpg',
                gender: '',
                birthday: '',
                birthdayType: 'solar'
            };
        }
    };

    const importRoleCardFromJson = async function (json) {
        const sourceTop = isObject(json) ? json : {};
        const sourceData = isObject(json.data && json.data.data) ? json.data.data : (isObject(json.data) ? json.data : null);
        const sourceProfile = isObject(json.profile)
            ? json.profile
            : (isObject(json.charProfile) ? json.charProfile : null);
        const sourceCharacter = isObject(json.character)
            ? json.character
            : (isObject(json.characterData) ? json.characterData : (isObject(json.character_data) ? json.character_data : (isObject(json.card) ? json.card : null)));
        const source = Object.assign({}, sourceData || {}, sourceProfile || {}, sourceCharacter || {}, sourceTop || {});
        const fallbackImportName = String(
            source.nickName ||
            source.name ||
            source.character_name ||
            source.characterName ||
            source.title ||
            source.alias ||
            sourceTop.name ||
            sourceTop.title ||
            sourceData && sourceData.name ||
            sourceCharacter && sourceCharacter.name ||
            '导入的设定集'
        ).trim() || '导入的设定集';
        const cardSpec = String(sourceTop.spec || sourceData && sourceData.spec || source.spec || '').trim();
        const hasCharaCardShape = cardSpec === 'chara_card_v3'
            || Array.isArray(sourceTop.alternate_greetings)
            || Array.isArray(sourceData && sourceData.alternate_greetings)
            || Array.isArray(sourceCharacter && sourceCharacter.alternate_greetings)
            || (typeof sourceTop.description === 'string' && /<character>|<writing_rule>|<info>/i.test(sourceTop.description))
            || (typeof (sourceData && sourceData.description) === 'string' && /<character>|<writing_rule>|<info>/i.test(sourceData.description))
            || (typeof (sourceCharacter && sourceCharacter.description) === 'string' && /<character>|<writing_rule>|<info>/i.test(sourceCharacter.description));
        const hasProfileShape = hasCharaCardShape || (
            source && (
                Object.prototype.hasOwnProperty.call(source, 'nickName') ||
                Object.prototype.hasOwnProperty.call(source, 'name') ||
                Object.prototype.hasOwnProperty.call(source, 'character_name') ||
                Object.prototype.hasOwnProperty.call(source, 'characterName') ||
                Object.prototype.hasOwnProperty.call(source, 'desc') ||
                Object.prototype.hasOwnProperty.call(source, 'description') ||
                Object.prototype.hasOwnProperty.call(source, 'style') ||
                Object.prototype.hasOwnProperty.call(source, 'schedule') ||
                Object.prototype.hasOwnProperty.call(source, 'avatar') ||
                Object.prototype.hasOwnProperty.call(source, 'remark') ||
                Object.prototype.hasOwnProperty.call(source, 'gender') ||
                Object.prototype.hasOwnProperty.call(source, 'personality') ||
                Object.prototype.hasOwnProperty.call(source, 'scenario') ||
                Object.prototype.hasOwnProperty.call(source, 'character_book') ||
                Object.prototype.hasOwnProperty.call(source, 'world_info') ||
                Object.prototype.hasOwnProperty.call(source, 'wi')
            )
        );

        if (!hasProfileShape) {
            const looseImportedWorldBookIds = collectEmbeddedWorldBooks(json, fallbackImportName);
            if (looseImportedWorldBookIds.length > 0) {
                await saveWorldBooksIfNeeded();
                await normalizeWorldBooksIfNeeded();
                loadWechatChatList(true);
                alert('✅ 文件里没有标准角色卡字段，已将其中 ' + looseImportedWorldBookIds.length + ' 条设定导入为世界书');
                return;
            }
            if (isObject(json.charProfiles)) {
                const keys = Object.keys(json.charProfiles);
                if (keys.length === 1 && isObject(json.charProfiles[keys[0]])) {
                    return importRoleCardFromJson({
                        roleId: String(json.roleId || keys[0] || '').trim(),
                        profile: json.charProfiles[keys[0]]
                    });
                }
            }
            throw new Error('文件里没有识别到角色卡信息');
        }

        const candidateId = String(
            sourceTop.roleId ||
            sourceTop.id ||
            sourceTop.characterId ||
            sourceTop.charId ||
            sourceCharacter && (sourceCharacter.id || sourceCharacter.roleId || sourceCharacter.charId) ||
            (source && (source.id || source.roleId)) ||
            ''
        ).trim();
        const displayName = String(
            source.nickName ||
            source.name ||
            source.character_name ||
            source.characterName ||
            source.title ||
            source.alias ||
            sourceTop.name ||
            sourceData && sourceData.name ||
            sourceCharacter && sourceCharacter.name ||
            candidateId ||
            'TA'
        ).trim() || 'TA';

        await ensureReady();

        const profiles = window.charProfiles || {};
        let targetId = candidateId || ('role_import_' + Date.now().toString(36));
        if (profiles[targetId]) {
            targetId = targetId + '_import_' + Date.now().toString(36);
        }

        const profileCopy = normalizeRoleProfile(source, displayName);
        profileCopy.id = targetId;
        profileCopy.roleId = targetId;
        profileCopy.spec = sourceTop.spec || sourceData && sourceData.spec || profileCopy.spec || '';
        profileCopy.spec_version = sourceTop.spec_version || sourceData && sourceData.spec_version || profileCopy.spec_version || '';
        const avatarRaw = String(sourceTop.avatar || sourceData && sourceData.avatar || profileCopy.avatar || '').trim();
        profileCopy.avatar = avatarRaw && avatarRaw.toLowerCase() !== 'none' && avatarRaw.toLowerCase() !== 'null'
            ? avatarRaw
            : (profileCopy.avatar && String(profileCopy.avatar).toLowerCase() !== 'none' ? profileCopy.avatar : 'assets/icons/icon-placeholder.png');
        const descText = String(sourceTop.description || sourceData && sourceData.description || profileCopy.description || '').trim();
        profileCopy.description = descText || profileCopy.description || '';
        profileCopy.desc = descText || profileCopy.desc || profileCopy.description || '';
        profileCopy.personality = String(sourceTop.personality || sourceData && sourceData.personality || profileCopy.personality || '').trim() || profileCopy.personality || '';
        profileCopy.scenario = String(sourceTop.scenario || sourceData && sourceData.scenario || profileCopy.scenario || '').trim() || profileCopy.scenario || '';
        profileCopy.alternate_greetings = Array.isArray(sourceTop.alternate_greetings)
            ? sourceTop.alternate_greetings.slice()
            : (Array.isArray(sourceData && sourceData.alternate_greetings) ? sourceData.alternate_greetings.slice() : (Array.isArray(profileCopy.alternate_greetings) ? profileCopy.alternate_greetings.slice() : []));
        profileCopy.first_mes = String(sourceTop.first_mes || sourceData && sourceData.first_mes || profileCopy.first_mes || '').trim();
        profileCopy.mes_example = String(sourceTop.mes_example || sourceData && sourceData.mes_example || profileCopy.mes_example || '').trim();
        profileCopy.creator_notes = String(sourceTop.creator_notes || sourceData && sourceData.creator_notes || profileCopy.creator_notes || '').trim();
        profileCopy.post_history_instructions = String(sourceTop.post_history_instructions || sourceData && sourceData.post_history_instructions || profileCopy.post_history_instructions || '').trim();
        profileCopy.tags = Array.isArray(sourceTop.tags)
            ? sourceTop.tags.slice()
            : (Array.isArray(sourceData && sourceData.tags) ? sourceData.tags.slice() : (Array.isArray(profileCopy.tags) ? profileCopy.tags.slice() : []));
        profileCopy.talkativeness = sourceTop.talkativeness || sourceData && sourceData.talkativeness || profileCopy.talkativeness || '';
        profileCopy.sourceCardType = cardSpec || (hasCharaCardShape ? 'chara_card_v3' : '');

        const importedWorldBookIds = collectEmbeddedWorldBooks(json, displayName);
        const sourceWorldBookIds = normalizeWorldBookIdList(source.worldbookId)
            .concat(normalizeWorldBookIdList(source.worldbookIds))
            .concat(normalizeWorldBookIdList(source.worldBookIds));
        const mergedWorldBookIds = Array.from(new Set(importedWorldBookIds.concat(sourceWorldBookIds).filter(Boolean)));
        if (mergedWorldBookIds.length > 0) {
            profileCopy.worldbookId = mergedWorldBookIds;
            profileCopy.worldBookIds = mergedWorldBookIds.slice();
        }

        profiles[targetId] = profileCopy;
        if (importedWorldBookIds.length > 0) {
            await saveWorldBooksIfNeeded();
            await normalizeWorldBooksIfNeeded();
        }
        await saveProfiles(profiles);
        ensureRoleStores(targetId);

        if (typeof window.saveData === 'function') {
            try {
                const ret = window.saveData();
                if (ret && typeof ret.then === 'function') await ret;
            } catch (e) { }
        }

        loadWechatChatList(true);
        const worldBookTip = importedWorldBookIds.length > 0 ? `，同时导入了 ${importedWorldBookIds.length} 条世界书` : '';
        alert('✅ 已导入角色' + (targetId !== candidateId ? '（ID 冲突已自动改名）' : '') + worldBookTip);
    };

    const ensureReady = async function () {
        if (typeof window.initData !== 'function') return;
        try {
            const ret = window.initData();
            if (ret && typeof ret.then === 'function') await ret;
        } catch (e) { }
    };

    const closeMenu = function () {
        const menu = document.getElementById('chat-long-press-menu');
        if (menu) menu.remove();
    };

    try {
        const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        if (!file) return;
        const text = await file.text();
        const json = safeParse(text);
        if (!json || typeof json !== 'object') {
            alert('❌ 导入失败：文件不是有效 JSON');
            return;
        }
        const importMode = String(window.__wechatImportMode || 'backup');
        window.__wechatImportMode = '';

        if (importMode === 'role') {
            await importRoleCardFromJson(json);
            return;
        }

        if (json.__shubao_contact_backup__ !== 1) {
            alert('❌ 导入失败：不是导出的角色备份文件');
            return;
        }

        const ok = confirm('⚠️ 将导入该联系人及其聊天记录。\n\n建议先在系统设置导出一次全量备份。\n\n确定继续吗？');
        if (!ok) return;

        await ensureReady();

        const rawRoleId = String(json.roleId || '');
        const incomingProfile = (json.profile && typeof json.profile === 'object') ? json.profile : null;
        if (!rawRoleId || !incomingProfile) {
            alert('❌ 导入失败：联系人数据不完整');
            return;
        }

        let targetId = rawRoleId;
        if (window.WechatStore && typeof window.WechatStore.importContactBackup === 'function') {
            const result = await window.WechatStore.importContactBackup(json);
            targetId = result && result.roleId ? result.roleId : rawRoleId;
        } else {
            const profiles = window.charProfiles || {};
            if (profiles[targetId]) {
                targetId = rawRoleId + '_import_' + Date.now().toString(36);
            }

            const profileCopy = Object.assign({}, incomingProfile);
            if (profileCopy.id) profileCopy.id = targetId;
            profileCopy.roleId = targetId;

            profiles[targetId] = profileCopy;
            await saveProfiles(profiles);

            if (!window.chatData) window.chatData = {};
            if (!window.chatMapData) window.chatMapData = {};
            if (!window.userPersonas) window.userPersonas = {};
            if (!window.chatBackgrounds) window.chatBackgrounds = {};
            if (!window.callLogs) window.callLogs = {};
            if (!window.chatUnread) window.chatUnread = {};
            if (!window.memoryArchiveStore) window.memoryArchiveStore = {};

            if (Array.isArray(json.chatData)) window.chatData[targetId] = json.chatData;
            if (json.chatMapData && typeof json.chatMapData === 'object') window.chatMapData[targetId] = json.chatMapData;
            if (json.userPersona && typeof json.userPersona === 'object') window.userPersonas[targetId] = json.userPersona;
            if (json.chatBackground !== null && json.chatBackground !== undefined) window.chatBackgrounds[targetId] = json.chatBackground;
            if (Array.isArray(json.callLogs)) window.callLogs[targetId] = json.callLogs;
            if (json.unread !== null && json.unread !== undefined) window.chatUnread[targetId] = json.unread;
            if (json.memoryArchive && typeof json.memoryArchive === 'object') window.memoryArchiveStore[targetId] = json.memoryArchive;

            if (typeof window.saveData === 'function') {
                try {
                    const ret = window.saveData();
                    if (ret && typeof ret.then === 'function') await ret;
                } catch (e) { }
            }
        }

        closeMenu();
        loadWechatChatList(true);
        alert('✅ 已导入联系人' + (targetId !== rawRoleId ? '（ID 冲突已自动改名）' : ''));
    } catch (e) {
        console.error(e);
        alert('❌ 导入失败：' + (e && e.message ? e.message : '未知错误'));
    } finally {
        window.__wechatImportMode = '';
        try {
            if (fileInput) fileInput.value = '';
        } catch (e) { }
    }
};

// --- B. 分组逻辑 ---

window.openGroupSelector = function(id) {
    // 关闭上一级菜单
    const menu = document.getElementById('chat-long-press-menu');
    if (menu) menu.remove();

    const profiles = window.charProfiles || {};
    const p = profiles[id];
    if (!p) return;

    const currentGroups = p.groups || [];
    const allCustomGroups = JSON.parse(localStorage.getItem('wechat_custom_groups') || '[]');

    let groupsHtml = allCustomGroups.map(g => {
        const isSelected = currentGroups.includes(g);
        return `
            <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl cursor-pointer" onclick="toggleGroupForUser('${id}', '${g}')">
                <span>${g}</span>
                ${isSelected ? "<i class='bx bx-check text-green-500 text-xl'></i>" : ""}
            </div>
        `;
    }).join('');

    if (allCustomGroups.length === 0) {
        groupsHtml = `<div class="p-4 text-center text-gray-400 text-sm">暂无自定义分组<br>请在首页列表上方添加</div>`;
    }

    const modalHtml = `
        <div id="group-selector-modal" class="fixed inset-0 z-[10060] flex items-center justify-center bg-black/40 backdrop-blur-sm" style="z-index:10060;" onclick="this.remove()">
            <div class="bg-white w-64 rounded-2xl shadow-xl overflow-hidden" onclick="event.stopPropagation()">
                <div class="p-4 border-b border-gray-100 font-bold text-center">设置分组</div>
                <div class="p-2 max-h-[50vh] overflow-y-auto">
                    ${groupsHtml}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.toggleGroupForUser = function(id, groupName) {
    const profiles = window.charProfiles || {};
    if (!profiles[id]) return;

    if (!profiles[id].groups) profiles[id].groups = [];
    
    const idx = profiles[id].groups.indexOf(groupName);
    if (idx > -1) {
        profiles[id].groups.splice(idx, 1);
    } else {
        profiles[id].groups.push(groupName);
    }
    
    saveProfiles(profiles);
    
    // 刷新选择器
    const modal = document.getElementById('group-selector-modal');
    if (modal) modal.remove();
    openGroupSelector(id); // 重新打开以显示更新后的状态
    
    // 刷新列表（如果当前正在过滤该分组，可能需要移除）
    loadWechatChatList();
}


window.renderFilterBar = function() {
    const container = document.getElementById('chat-filter-bar');
    if (!container) return;

    // Load custom groups
    let customGroups = [];
    try {
        customGroups = JSON.parse(localStorage.getItem('wechat_custom_groups') || '[]');
    } catch (e) {}

    let html = `
        <div class="filter-pill px-3 py-1 rounded-full bg-gray-200 text-gray-800 border border-gray-300 text-xs font-medium cursor-pointer whitespace-nowrap" onclick="filterChatListByCategory('all', this)">全部</div>
        <div class="filter-pill px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium cursor-pointer whitespace-nowrap" onclick="filterChatListByCategory('group', this)">群聊</div>
    `;

    customGroups.forEach(g => {
        html += `<div class="filter-pill px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium cursor-pointer whitespace-nowrap" onclick="filterChatListByCategory('${g}', this)" oncontextmenu="deleteCustomGroup('${g}'); return false;">${g}</div>`;
    });

    html += `
        <div class="px-3 py-1 rounded-full bg-gray-50 text-xs font-medium text-gray-400 cursor-pointer whitespace-nowrap border border-dashed border-gray-300 flex items-center" onclick="addCustomGroup()">
            <i class='bx bx-plus'></i>
        </div>
    `;

    container.innerHTML = html;
}

window.addCustomGroup = function() {
    const name = prompt("请输入新分组名称：");
    if (!name) return;
    
    let customGroups = JSON.parse(localStorage.getItem('wechat_custom_groups') || '[]');
    if (!customGroups.includes(name)) {
        customGroups.push(name);
        localStorage.setItem('wechat_custom_groups', JSON.stringify(customGroups));
        renderFilterBar();
    }
}

window.deleteCustomGroup = function(name) {
    if (!confirm(`确定要删除分组 "${name}" 吗？`)) return;
    
    let customGroups = JSON.parse(localStorage.getItem('wechat_custom_groups') || '[]');
    customGroups = customGroups.filter(g => g !== name);
    localStorage.setItem('wechat_custom_groups', JSON.stringify(customGroups));
    renderFilterBar();
}

// --- C. 关系数据显示逻辑 ---

window.openStatsPartnerSelector = function() {
    const profiles = window.charProfiles || {};
    const ids = Object.keys(profiles);
    
    if (ids.length === 0) return;

    let listHtml = ids.map(id => {
        const p = profiles[id];
        const displayName = (p && (p.remark || p.nickName || p.name)) ? (p.remark || p.nickName || p.name) : id;
        return `
            <div class="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors" onclick="selectStatsPartner('${id}')">
                <div class="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                    <img src="${p.avatar || 'assets/icons/icon-placeholder.png'}" class="w-full h-full object-cover">
                </div>
                <div class="text-sm font-bold text-gray-700">${displayName}</div>
            </div>
        `;
    }).join('');
    
    const modalHtml = `
        <div id="stats-selector-modal" class="fixed inset-0 z-[10070] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" style="z-index:10070;" onclick="this.remove()">
            <div class="bg-white w-72 rounded-3xl shadow-2xl p-4 max-h-[60vh] flex flex-col" onclick="event.stopPropagation()">
                <div class="text-center font-bold text-gray-800 mb-4 text-lg">选择展示角色</div>
                <div class="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
                    ${listHtml}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.selectStatsPartner = function(id) {
    window.currentStatsPartnerId = id;
    localStorage.setItem('wechat_stats_partner_id', id);
    
    const modal = document.getElementById('stats-selector-modal');
    if (modal) modal.remove();
    
    // 刷新数据
    let chatData = window.chatData || {};
    if (!chatData || Object.keys(chatData).length === 0) {
         try { chatData = JSON.parse(localStorage.getItem('wechat_chatData') || '{}'); } catch(e){}
    }
    updateRelationshipStats(null, window.charProfiles, chatData);
}

/* =========================================================
   === 5. TODO 应用逻辑 ===
   ========================================================= */

// 打开TODO应用
function openTodoApp() {
    const appWindow = document.getElementById('app-window');
    const appTitle = document.getElementById('app-title-text');
    const appContent = document.getElementById('app-content-area');
    
    if (!appWindow || !appTitle || !appContent) return;
    
    // 设置标题
    appTitle.innerText = 'TODO';
    
    // 渲染TODO界面
    appContent.innerHTML = `
        <div style="height: 100%; display: flex; flex-direction: column; background: #f5f5f5;">
            <!-- 顶部添加区域 -->
            <div style="background: white; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="todo-input" placeholder="添加新的待办事项..." 
                        style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                    <button onclick="addTodoItem()" 
                        style="background: #007aff; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        添加
                    </button>
                </div>
            </div>
            
            <!-- 分类标签 -->
            <div style="background: white; padding: 10px 15px; display: flex; gap: 10px; border-bottom: 1px solid #eee;">
                <button class="todo-filter-btn active" data-filter="all" onclick="filterTodos('all', this)"
                    style="padding: 6px 15px; border: none; background: #007aff; color: white; border-radius: 15px; cursor: pointer; font-size: 13px;">
                    全部
                </button>
                <button class="todo-filter-btn" data-filter="active" onclick="filterTodos('active', this)"
                    style="padding: 6px 15px; border: none; background: #e5e5ea; color: #333; border-radius: 15px; cursor: pointer; font-size: 13px;">
                    进行中
                </button>
                <button class="todo-filter-btn" data-filter="completed" onclick="filterTodos('completed', this)"
                    style="padding: 6px 15px; border: none; background: #e5e5ea; color: #333; border-radius: 15px; cursor: pointer; font-size: 13px;">
                    已完成
                </button>
            </div>
            
            <!-- TODO列表区域 -->
            <div id="todo-list-container" style="flex: 1; overflow-y: auto; padding: 15px;">
                <!-- 列表项将通过JS动态生成 -->
            </div>
            
            <!-- 底部统计 -->
            <div style="background: white; padding: 12px 15px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <span id="todo-count" style="color: #666; font-size: 13px;">0 个待办事项</span>
                <button onclick="clearCompletedTodos()" 
                    style="background: none; border: none; color: #ff3b30; cursor: pointer; font-size: 13px;">
                    清除已完成
                </button>
            </div>
        </div>
    `;
    
    // 显示窗口
    appWindow.classList.add('active');
    
    // 加载TODO列表
    loadTodoList();
}

// 加载TODO列表
function loadTodoList(filter = 'all') {
    const container = document.getElementById('todo-list-container');
    if (!container) return;
    
    // 从localStorage读取数据
    let todos = [];
    try {
        const saved = localStorage.getItem('todo_list');
        if (saved) todos = JSON.parse(saved);
    } catch(e) { console.error(e); }
    
    // 过滤
    let filteredTodos = todos;
    if (filter === 'active') {
        filteredTodos = todos.filter(t => !t.completed);
    } else if (filter === 'completed') {
        filteredTodos = todos.filter(t => t.completed);
    }
    
    // 清空容器
    container.innerHTML = '';
    
    // 如果没有数据
    if (filteredTodos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">✓</div>
                <div style="font-size: 16px;">暂无待办事项</div>
                <div style="font-size: 13px; margin-top: 8px;">在上方输入框添加新的目标吧！</div>
            </div>
        `;
        updateTodoCount();
        return;
    }
    
    // 生成列表项
    filteredTodos.forEach((todo, index) => {
        const realIndex = todos.findIndex(t => t.id === todo.id);
        const itemHtml = `
            <div class="todo-item" style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 10px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                    onchange="toggleTodo(${realIndex})"
                    style="width: 20px; height: 20px; cursor: pointer;">
                <div style="flex: 1; ${todo.completed ? 'text-decoration: line-through; color: #999;' : 'color: #333;'}">
                    ${todo.text}
                </div>
                <button onclick="deleteTodo(${realIndex})" 
                    style="background: none; border: none; color: #ff3b30; cursor: pointer; font-size: 18px; padding: 5px;">
                    🗑️
                </button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHtml);
    });
    
    updateTodoCount();
}

// 添加TODO项
function addTodoItem() {
    const input = document.getElementById('todo-input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) {
        alert('请输入待办事项内容');
        return;
    }
    
    // 读取现有数据
    let todos = [];
    try {
        const saved = localStorage.getItem('todo_list');
        if (saved) todos = JSON.parse(saved);
    } catch(e) { console.error(e); }
    
    // 添加新项
    todos.push({
        id: Date.now(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    });
    
    // 保存
    localStorage.setItem('todo_list', JSON.stringify(todos));
    
    // 清空输入框
    input.value = '';
    
    // 重新加载列表
    loadTodoList();
}

// 切换完成状态
function toggleTodo(index) {
    let todos = [];
    try {
        const saved = localStorage.getItem('todo_list');
        if (saved) todos = JSON.parse(saved);
    } catch(e) { console.error(e); }
    
    if (todos[index]) {
        todos[index].completed = !todos[index].completed;
        localStorage.setItem('todo_list', JSON.stringify(todos));
        loadTodoList();
    }
}

// 删除TODO项
function deleteTodo(index) {
    if (!confirm('确定要删除这个待办事项吗？')) return;
    
    let todos = [];
    try {
        const saved = localStorage.getItem('todo_list');
        if (saved) todos = JSON.parse(saved);
    } catch(e) { console.error(e); }
    
    todos.splice(index, 1);
    localStorage.setItem('todo_list', JSON.stringify(todos));
    loadTodoList();
}

// 清除已完成的TODO
function clearCompletedTodos() {
    let todos = [];
    try {
        const saved = localStorage.getItem('todo_list');
        if (saved) todos = JSON.parse(saved);
    } catch(e) { console.error(e); }
    
    const activeTodos = todos.filter(t => !t.completed);
    
    if (activeTodos.length === todos.length) {
        alert('没有已完成的待办事项');
        return;
    }
    
    if (!confirm('确定要清除所有已完成的待办事项吗？')) return;
    
    localStorage.setItem('todo_list', JSON.stringify(activeTodos));
    loadTodoList();
}

// 过滤TODO
function filterTodos(filter, btnElement) {
    // 更新按钮样式
    document.querySelectorAll('.todo-filter-btn').forEach(btn => {
        btn.style.background = '#e5e5ea';
        btn.style.color = '#333';
        btn.classList.remove('active');
    });
    
    if (btnElement) {
        btnElement.style.background = '#007aff';
        btnElement.style.color = 'white';
        btnElement.classList.add('active');
    }
    
    // 重新加载列表
    loadTodoList(filter);
}

// 更新统计数字
function updateTodoCount() {
    const countEl = document.getElementById('todo-count');
    if (!countEl) return;
    
    let todos = [];
    try {
        const saved = localStorage.getItem('todo_list');
        if (saved) todos = JSON.parse(saved);
    } catch(e) { console.error(e); }
    
    const activeCount = todos.filter(t => !t.completed).length;
    countEl.innerText = `${activeCount} 个待办事项`;
}

// 暴露给全局
window.openTodoApp = openTodoApp;
window.loadTodoList = loadTodoList;
window.addTodoItem = addTodoItem;
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
window.clearCompletedTodos = clearCompletedTodos;
window.filterTodos = filterTodos;
