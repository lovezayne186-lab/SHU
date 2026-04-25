var SportsLeaderboard = (function () {
    var toastTimer = null;
    var dateTimer = null;
    var loadSeq = 0;
    var lastRanking = [];
    var currentDetailRole = null;

    var AI_API_URL = '';
    var AI_API_KEY = '';
    var sportsTaskCount = 0;
    var leaderboardInFlight = null;
    var trajectoryInFlight = {};
    var storeUnsub = null;
    var PENDING_SYSTEM_CONTEXT_KEY_BASE = 'wechat_pending_system_context_v1';
    var myStepsInjectTimer = null;
    var DETAIL_WALL_LF_PREFIX = 'sports_detail_wall_lf_v1_';
    var detailWallReqToken = 0;

    function getAppStore() {
        var s = null;
        try { s = window.AppStore; } catch (e) { s = null; }
        if (s && typeof s.getState === 'function' && typeof s.setState === 'function') return s;
        return null;
    }

    function beginSportsTask() {
        sportsTaskCount += 1;
        var store = getAppStore();
        if (store) store.setState({ isGeneratingSportsData: true, sportsDataError: null });
    }

    function endSportsTask() {
        sportsTaskCount -= 1;
        if (sportsTaskCount < 0) sportsTaskCount = 0;
        var store = getAppStore();
        if (store && sportsTaskCount === 0) store.setState({ isGeneratingSportsData: false });
    }

    function reportSportsError(message) {
        var msg = String(message || '生成失败');
        var store = getAppStore();
        if (store) store.setState({ sportsDataError: msg, isGeneratingSportsData: false });
        try {
            if (window.GlobalModal && typeof window.GlobalModal.showError === 'function') {
                window.GlobalModal.showError(msg);
            }
        } catch (e) { }
    }

    function formatSteps(num) {
        var n = Number(num);
        if (!isFinite(n) || n < 0) n = 0;
        return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function escapeHtml(value) {
        var s = value == null ? '' : String(value);
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatCNDate(date) {
        var d = date instanceof Date ? date : new Date();
        return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    function pad2(n) {
        var x = Number(n);
        if (!isFinite(x)) x = 0;
        x = Math.floor(Math.abs(x));
        return x < 10 ? ('0' + x) : String(x);
    }

    function getTodayKey() {
        var d = new Date();
        return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    }

    function updateCoverDate() {
        var el = document.getElementById('sports-cover-date');
        if (!el) return;
        el.textContent = formatCNDate(new Date());
    }

    function getLoadingMaskEls() {
        var mask = document.getElementById('loading-mask');
        var text = document.getElementById('loading-mask-text');
        return { mask: mask, text: text };
    }

    function showLoadingMask() {
        var els = getLoadingMaskEls();
        if (!els.mask) return;
        els.mask.classList.remove('is-hidden');
        els.mask.classList.remove('is-error');
        if (els.text) els.text.textContent = '“正在悄悄获取大家的步数，可以先退出去干点别的...”';
        ensureLoadingMaskBackButton();
    }

    function hideLoadingMask() {
        var els = getLoadingMaskEls();
        if (!els.mask) return;
        els.mask.classList.add('is-hidden');
        els.mask.classList.remove('is-error');
    }

    function showLoadingError(message) {
        var els = getLoadingMaskEls();
        if (!els.mask) return;
        els.mask.classList.remove('is-hidden');
        els.mask.classList.add('is-error');
        if (els.text) els.text.textContent = String(message || '同步失败');
        ensureLoadingMaskBackButton();
    }

    function ensureLoadingMaskBackButton() {
        var els = getLoadingMaskEls();
        var mask = els && els.mask ? els.mask : null;
        if (!mask) return;
        if (mask._sportsBackReady) return;
        mask._sportsBackReady = true;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'sports-loading-back-btn';
        btn.className = 'sports-loading-back-btn';
        btn.textContent = '返回 / 稍后查看';
        btn.addEventListener('click', function () {
            hideLoadingMask();
            try {
                if (window.SportsLeaderboard && typeof window.SportsLeaderboard.hide === 'function') {
                    window.SportsLeaderboard.hide();
                }
            } catch (e) { }
        });
        mask.appendChild(btn);
    }

    function safeGetMyProfile() {
        if (window.MineProfile && typeof window.MineProfile.getProfile === 'function') {
            var p = window.MineProfile.getProfile() || {};
            return {
                name: p.name || '',
                avatar: p.avatar || '',
                persona: p.signature || ''
            };
        }
        if (typeof window.initMomentsData === 'function') {
            var m = window.initMomentsData() || {};
            return { name: m.userName || '', avatar: m.userAvatar || '', persona: '' };
        }
        if (window.momentsData && typeof window.momentsData === 'object') {
            return { name: window.momentsData.userName || '', avatar: window.momentsData.userAvatar || '', persona: '' };
        }
        return { name: '', avatar: '', persona: '' };
    }

    function readProfilesSnapshot() {
        if (window.charProfiles && typeof window.charProfiles === 'object') return window.charProfiles;
        try {
            var raw = localStorage.getItem('wechat_charProfiles');
            if (!raw) return {};
            var parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                window.charProfiles = parsed;
                return parsed;
            }
        } catch (e) { }
        return {};
    }

    function readUserPersonasSnapshot() {
        if (window.userPersonas && typeof window.userPersonas === 'object') return window.userPersonas;
        try {
            var raw = localStorage.getItem('wechat_userPersonas');
            if (!raw) return {};
            var parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                window.userPersonas = parsed;
                return parsed;
            }
        } catch (e) { }
        return {};
    }

    function readWorldBooksSnapshot() {
        var wb = window.worldBooks && typeof window.worldBooks === 'object' ? window.worldBooks : null;
        if (wb && Object.keys(wb).length > 0) return wb;
        try {
            var raw = localStorage.getItem('wechat_worldbooks');
            if (!raw) return {};
            var parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch (e) { }
        return {};
    }

    function buildPersonaText(profile) {
        var p = profile && typeof profile === 'object' ? profile : {};
        var raw = p.persona || p.desc || p.prompt || p.personality || p.character || '';
        var text = typeof raw === 'string' ? raw.trim() : '';
        return text || '未设置人设';
    }

    function buildWorldbookText(profile, books) {
        var p = profile && typeof profile === 'object' ? profile : {};
        var ids = p.worldbookId || [];
        if (typeof ids === 'string') ids = ids ? [ids] : [];
        if (!Array.isArray(ids)) ids = [];

        var wb = books && typeof books === 'object' ? books : {};
        var parts = [];
        for (var i = 0; i < ids.length; i++) {
            var id = String(ids[i] || '').trim();
            if (!id) continue;
            var book = wb[id];
            if (!book || typeof book !== 'object') continue;
            var title = typeof book.title === 'string' ? book.title.trim() : '';
            var content = typeof book.content === 'string' ? book.content.trim() : '';
            if (title) parts.push(title);
            if (content) parts.push(content);
        }
        return parts.join('\n').trim() || '未设置世界书';
    }

    function getDisplayNameForProfile(roleId, profile) {
        var p = profile && typeof profile === 'object' ? profile : {};
        return String(p.remark || p.nickName || p.name || roleId || '').trim();
    }

    function getRecentChatSpeakerNames(roleId) {
        var rid = String(roleId || '').trim();
        var profiles = readProfilesSnapshot();
        var personas = readUserPersonasSnapshot();
        var roleProfile = profiles && profiles[rid] ? profiles[rid] : {};
        var roleName = getDisplayNameForProfile(rid, roleProfile) || 'TA';

        var userPersona = personas && personas[rid] ? personas[rid] : {};
        var userName = String(userPersona && userPersona.name ? userPersona.name : '').trim();
        if (!userName) {
            var myProfile = safeGetMyProfile();
            userName = String(myProfile && myProfile.name ? myProfile.name : '').trim();
        }
        if (!userName) {
            try {
                userName = String(localStorage.getItem('user_name') || '').trim();
            } catch (e) {
                userName = '';
            }
        }

        return {
            userName: userName || '我',
            roleName: roleName
        };
    }

    function getAvatarForProfile(profile) {
        var p = profile && typeof profile === 'object' ? profile : {};
        var a = String(p.avatar || '').trim();
        return a || 'assets/chushitouxiang.jpg';
    }

    function getCharactersData() {
        var profiles = readProfilesSnapshot();
        var books = readWorldBooksSnapshot();
        var contacts = [];

        Object.keys(profiles).forEach(function (id) {
            var p = profiles[id];
            if (!p || typeof p !== 'object') return;
            if (p.isGroup) return;
            var name = getDisplayNameForProfile(id, p);
            if (!name) return;
            contacts.push({
                id: String(id),
                name: name,
                avatar: getAvatarForProfile(p),
                persona: buildPersonaText(p),
                worldbook: buildWorldbookText(p, books)
            });
        });

        return contacts;
    }

    function getDefaultWorldbook(books) {
        var wb = books && typeof books === 'object' ? books : {};
        var ids = Object.keys(wb);
        if (!ids.length) return '未设置世界书';
        var first = wb[ids[0]];
        if (!first || typeof first !== 'object') return '未设置世界书';
        var t = typeof first.title === 'string' ? first.title.trim() : '';
        var c = typeof first.content === 'string' ? first.content.trim() : '';
        return (t || c || '未设置世界书');
    }

    function getMyDataSnapshot() {
        var books = readWorldBooksSnapshot();
        var my = safeGetMyProfile();
        return {
            id: 'me',
            name: my.name || '我(玩家)',
            avatar: my.avatar || 'assets/chushitouxiang.jpg',
            persona: my.persona ? String(my.persona).trim() : '未设置人设',
            worldbook: getDefaultWorldbook(books)
        };
    }

    function getMyStepsStorageKey() {
        return 'sports_my_steps_' + getTodayKey();
    }

    function readMySteps() {
        try {
            var raw = localStorage.getItem(getMyStepsStorageKey());
            if (raw == null || raw === '') return null;
            var n = Number(raw);
            if (!isFinite(n) || n < 0) return null;
            return Math.floor(n);
        } catch (e) {
            return null;
        }
    }

    function writeMySteps(steps) {
        var n = Number(steps);
        if (!isFinite(n) || n < 0) n = 0;
        n = Math.floor(n);
        try { localStorage.setItem(getMyStepsStorageKey(), String(n)); } catch (e) { }
        return n;
    }

    function getPendingSystemContextKey(roleId) {
        var id = String(roleId || '').trim();
        return id ? (PENDING_SYSTEM_CONTEXT_KEY_BASE + '_' + id) : PENDING_SYSTEM_CONTEXT_KEY_BASE;
    }

    function readPendingSystemContext(roleId) {
        try {
            var raw = localStorage.getItem(getPendingSystemContextKey(roleId));
            if (!raw) return null;
            var obj = JSON.parse(raw);
            if (!obj || typeof obj !== 'object') return null;
            var id = typeof obj.id === 'string' ? obj.id : '';
            var content = typeof obj.content === 'string' ? obj.content : '';
            if (!id || !content) return null;
            return { id: id, content: content };
        } catch (e) {
            return null;
        }
    }

    function parseDateKey(key) {
        var parts = String(key || '').split('-');
        var y = Number(parts[0]);
        var m = Number(parts[1]);
        var d = Number(parts[2]);
        if (!isFinite(y) || !isFinite(m) || !isFinite(d)) return null;
        return new Date(y, m - 1, d);
    }

    function addDays(date, days) {
        var d = date instanceof Date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : new Date();
        d.setDate(d.getDate() + (Number(days) || 0));
        return d;
    }

    function diffDays(a, b) {
        var a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
        var b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
        return Math.round((a0.getTime() - b0.getTime()) / 86400000);
    }

    function getPeriodStatusForToday() {
        var STORAGE_KEYS = {
            cycleLength: 'period_cycle_length',
            periodLength: 'period_period_length',
            dailyRecords: 'period_daily_records'
        };
        var todayKey = getTodayKey();
        var today = parseDateKey(todayKey);
        if (!today) return null;

        var periodLength = 5;
        try {
            var rawLen = localStorage.getItem(STORAGE_KEYS.periodLength);
            var n = Number(rawLen);
            if (isFinite(n)) periodLength = Math.max(2, Math.min(10, Math.floor(n)));
        } catch (e1) { }

        var records = {};
        try {
            var raw = localStorage.getItem(STORAGE_KEYS.dailyRecords);
            var obj = raw ? JSON.parse(raw) : {};
            records = obj && typeof obj === 'object' ? obj : {};
        } catch (e2) {
            records = {};
        }

        var keys = Object.keys(records || {}).sort(function (a, b) {
            var da = parseDateKey(a);
            var db = parseDateKey(b);
            var ta = da ? da.getTime() : 0;
            var tb = db ? db.getTime() : 0;
            return ta - tb;
        });

        var openStart = '';
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            var rec = records[k];
            if (!rec || typeof rec !== 'object') continue;
            if (rec.periodStarted) {
                openStart = k;
            }
            if (rec.periodEnded && openStart) {
                openStart = '';
            }
        }

        if (!openStart) return null;
        var start = parseDateKey(openStart);
        if (!start) return null;
        var implicitEnd = addDays(start, periodLength - 1);
        if (today.getTime() < start.getTime() || today.getTime() > implicitEnd.getTime()) return null;
        var dayInPeriod = diffDays(today, start) + 1;
        if (!isFinite(dayInPeriod) || dayInPeriod < 1) dayInPeriod = 1;
        return { startKey: openStart, day: dayInPeriod, total: periodLength };
    }

    function buildUserStepsSystemPrompt(steps, periodStatus) {
        var head = '[系统内部提示：用户刚刚在运动后台更新了ta今天的真实步数为 ' + String(steps) + ' 步。请在你的下一次回复中，自然地提及这件事情。';
        if (periodStatus && periodStatus.day && periodStatus.total) {
            head = '[系统内部提示：用户刚刚在运动后台更新了ta今天的真实步数为 ' + String(steps) + ' 步；并且用户当前处于生理期第 ' + String(periodStatus.day) + '/' + String(periodStatus.total) + ' 天。请结合经期状态与步数，在你的下一次回复中自然地关心TA。';
        }
        return [
            head,
            '互动规则：',
            '1. 结合你当前的【角色人设】以及你刚才生成的【你的步数/运动轨迹】。',
            '2. 如果 ' + String(steps) + ' < 2000 步：判断用户今天很宅、太累或者不舒服。根据人设进行吐槽（如傲娇）、关心或温和催促。',
            '3. 如果 2000 <= ' + String(steps) + ' <= 10000 步：属于正常通勤或散步，可以像日常聊天一样询问去了哪里。',
            '4. 如果 ' + String(steps) + ' > 15000 步：判断用户今天走了非常多路。必须表现出惊讶，并根据人设表达心疼或赞叹。',
            '5. 重要：必须保持人设！语气要自然，可以进行步数对比，绝对不要像机器人一样生硬地播报数字。]'
        ].join('\n');
    }

    function enqueueUserStepsSystemContext(steps) {
        var n = Number(steps);
        if (!isFinite(n) || n < 0) return false;
        n = Math.floor(n);
        var profiles = readProfilesSnapshot() || {};
        var ids = Object.keys(profiles || {});
        if (!ids.length) return false;

        var wrote = false;
        var periodStatus = getPeriodStatusForToday();
        var content = buildUserStepsSystemPrompt(n, periodStatus);
        for (var i = 0; i < ids.length; i++) {
            var roleId = String(ids[i] || '').trim();
            if (!roleId) continue;
            var pending = readPendingSystemContext(roleId);
            if (pending && pending.content && pending.content.indexOf('真实步数为 ' + String(n) + ' 步') !== -1) continue;
            var payload = {
                id: Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10),
                content: content,
                createdAt: Date.now(),
                type: 'user_steps'
            };
            try {
                localStorage.setItem(getPendingSystemContextKey(roleId), JSON.stringify(payload));
                wrote = true;
            } catch (e) { }
        }
        return wrote;
    }

    function scheduleUserStepsSystemContext(steps) {
        if (myStepsInjectTimer) clearTimeout(myStepsInjectTimer);
        myStepsInjectTimer = setTimeout(function () {
            myStepsInjectTimer = null;
            var latest = readMySteps();
            if (latest == null) return;
            var n = Number(steps);
            if (!isFinite(n) || n < 0) return;
            n = Math.floor(n);
            if (latest !== n) return;
            enqueueUserStepsSystemContext(n);
        }, 2000);
    }

    function getLeaderboardCacheKey() {
        return 'sports_leaderboard_cache_' + getTodayKey();
    }

    function readLeaderboardCache() {
        try {
            var raw = localStorage.getItem(getLeaderboardCacheKey());
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            var byId = parsed.stepsById;
            if (!byId || typeof byId !== 'object') return null;
            return { stepsById: byId };
        } catch (e) {
            return null;
        }
    }

    function writeLeaderboardCache(stepsArr) {
        var byId = {};
        (stepsArr || []).forEach(function (x) {
            if (!x || typeof x !== 'object') return;
            var id = String(x.id || '').trim();
            if (!id) return;
            var steps = Number(x.steps);
            if (!isFinite(steps) || steps < 0) return;
            byId[id] = Math.floor(steps);
        });
        try {
            localStorage.setItem(getLeaderboardCacheKey(), JSON.stringify({
                generatedAt: Date.now(),
                stepsById: byId
            }));
        } catch (e) { }
        return byId;
    }

    function resolveChatCompletionsUrl(baseUrlRaw) {
        var base = String(baseUrlRaw || '').trim();
        if (!base) return '';
        if (base.endsWith('/')) base = base.slice(0, -1);
        if (base.indexOf('/chat/completions') !== -1) return base;
        if (base.indexOf('/v1') === -1) base += '/v1';
        return base + '/chat/completions';
    }

    function getAIRequestConfig() {
        var url = AI_API_URL ? String(AI_API_URL).trim() : '';
        var apiKey = AI_API_KEY ? String(AI_API_KEY).trim() : '';
        var baseUrl = '';
        try { baseUrl = localStorage.getItem('api_base_url') || ''; } catch (e) { baseUrl = ''; }
        if (!url && baseUrl) url = resolveChatCompletionsUrl(baseUrl);
        if (!apiKey) {
            try { apiKey = localStorage.getItem('user_api_key') || ''; } catch (e2) { apiKey = ''; }
        }
        var model = '';
        try { model = localStorage.getItem('selected_model') || ''; } catch (e3) { model = ''; }
        model = String(model || '').trim() || 'gpt-3.5-turbo';
        return { url: url, apiKey: apiKey, model: model };
    }

    function extractJsonArray(text) {
        var raw = String(text || '').trim();
        if (!raw) return null;
        var start = raw.indexOf('[');
        var end = raw.lastIndexOf(']');
        if (start === -1 || end === -1 || end <= start) return null;
        var jsonText = raw.slice(start, end + 1);
        try {
            var parsed = JSON.parse(jsonText);
            return Array.isArray(parsed) ? parsed : null;
        } catch (e) {
            return null;
        }
    }

    async function fetchStepsFromAI(contacts) {
        function truncateText(text, maxLen) {
            var s = String(text || '');
            if (s.length <= maxLen) return s;
            return s.slice(0, Math.max(0, maxLen - 1)) + '…';
        }

        var payloadContacts = (contacts || []).slice(0, 30).map(function (c) {
            return {
                id: String(c.id || ''),
                name: String(c.name || ''),
                avatar: String(c.avatar || ''),
                persona: truncateText(String(c.persona || ''), 160),
                worldbook: truncateText(String(c.worldbook || ''), 220)
            };
        });

        var prompt = [
            '你是一个运动数据生成器。请根据以下角色的【人设】和所处的【世界书背景】，为他们合理推断并生成今天的“运动步数”。',
            '要求：运动量大的人设步数极高（可达2-3万），死宅人设步数极低（几百步）。',
            '请只返回一个纯 JSON 数组，格式为 [{"id": "角色id", "steps": 步数数字}]，不要输出任何 Markdown 标记和其他文字。',
            '',
            '角色列表：',
            JSON.stringify(payloadContacts)
        ].join('\n');

        if (typeof window.callAI === 'function') {
            var systemPrompt = typeof window.buildToolJsonPrompt === 'function'
                ? window.buildToolJsonPrompt('sports_steps_generation', {
                    sceneIntro: '当前场景是步数数据生成。',
                    taskGuidance: '请根据输入的人设和世界书，合理推断今天的运动步数。',
                    outputInstructions: '只返回纯 JSON 数组，格式为 [{"id":"角色id","steps":数字}]，不要输出 Markdown 或额外文字。'
                })
                : '你是一个运动数据生成器。';
            var userMessage = prompt;
            return await new Promise(function (resolve, reject) {
                try {
                    window.callAI(
                        systemPrompt,
                        [],
                        userMessage,
                        function (text) {
                            var arr = extractJsonArray(text);
                            if (!arr) {
                                reject(new Error('模型返回内容不是有效 JSON 数组'));
                                return;
                            }
                            resolve(arr);
                        },
                        function (err) {
                            reject(new Error(String(err || '请求失败')));
                        }
                    );
                } catch (e) {
                    reject(e);
                }
            });
        }

        var cfg = getAIRequestConfig();
        if (!cfg.url || !cfg.apiKey) {
            throw new Error('未配置 API 地址或 API Key');
        }

        var controller = new AbortController();
        var timeout = setTimeout(function () {
            try { controller.abort(); } catch (e) { }
        }, 60000);

        try {
            var res = await fetch(cfg.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + cfg.apiKey
                },
                body: JSON.stringify({
                    model: cfg.model,
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7
                }),
                signal: controller.signal
            });

            if (!res.ok) {
                var t = '';
                try { t = await res.text(); } catch (e2) { t = ''; }
                throw new Error('请求失败 (' + res.status + '): ' + (t || res.statusText || ''));
            }

            var data = await res.json();
            var content = '';
            if (data && Array.isArray(data.choices) && data.choices[0]) {
                var c0 = data.choices[0];
                if (c0.message && typeof c0.message.content === 'string') content = c0.message.content;
                else if (typeof c0.text === 'string') content = c0.text;
            }
            var arr = extractJsonArray(content);
            if (!arr) throw new Error('模型返回内容不是有效 JSON 数组');
            return arr;
        } catch (e3) {
            if (e3 && e3.name === 'AbortError') {
                throw new Error('请求超时');
            }
            throw e3;
        } finally {
            clearTimeout(timeout);
        }
    }

    function mergeStepsIntoContacts(contacts, stepsArr) {
        var byId = {};
        (stepsArr || []).forEach(function (x) {
            if (!x || typeof x !== 'object') return;
            var id = String(x.id || '').trim();
            if (!id) return;
            var steps = Number(x.steps);
            if (!isFinite(steps) || steps < 0) return;
            byId[id] = Math.floor(steps);
        });
        return (contacts || []).map(function (c) {
            var id = String(c.id || '').trim();
            var steps = byId.hasOwnProperty(id) ? byId[id] : 0;
            return {
                id: id,
                name: c.name || '',
                avatar: c.avatar || '',
                persona: c.persona || '',
                worldbook: c.worldbook || '',
                steps: steps,
                isMe: id === 'me'
            };
        });
    }

    function getStepsValue(item) {
        var raw = (item && item.steps != null) ? item.steps : (item && item.totalSteps != null ? item.totalSteps : null);
        var n = Number(raw);
        return isFinite(n) ? n : 0;
    }

    function isStepsReady(item) {
        if (!item) return false;
        if (item.steps == null) return false;
        var n = Number(item.steps);
        return isFinite(n) && n >= 0;
    }

    function showToast(text) {
        var toast = document.getElementById('sports-toast');
        if (!toast) return;
        toast.textContent = text;
        toast.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toast.classList.remove('show');
        }, 1800);
    }

    function renderCoverChampion(champion) {
        var avatarEl = document.getElementById('sports-cover-occupy-avatar-img');
        var textEl = document.getElementById('sports-cover-occupy-text');
        if (avatarEl) avatarEl.src = champion && champion.avatar ? champion.avatar : '';
        if (textEl) {
            var nm = champion && champion.name ? champion.name : '';
            textEl.textContent = (nm || '未知') + ' 占领了封面';
        }
        applyLeaderboardCover(champion);
    }

    function applyLeaderboardCover(champion) {
        var cover = document.querySelector('.sports-cover-section');
        if (!cover) return;
        var roleId = champion && champion.id ? String(champion.id).trim() : '';
        var bg = '';
        if (roleId) {
            try { bg = localStorage.getItem(getDetailWallKey(roleId)) || ''; } catch (e) { bg = ''; }
        }
        bg = String(bg || '').trim();
        if (bg) {
            cover.style.backgroundImage = 'url("' + bg.replace(/"/g, '%22') + '")';
            cover.classList.add('has-cover');
        } else {
            cover.style.backgroundImage = '';
            cover.classList.remove('has-cover');
            if (roleId && window.localforage && typeof window.localforage.getItem === 'function') {
                var expected = roleId;
                try {
                    window.localforage.getItem(DETAIL_WALL_LF_PREFIX + expected).then(function (dataUrl) {
                        if (!dataUrl) return;
                        var latestChampion = lastRanking && lastRanking[0] ? String(lastRanking[0].id || '').trim() : '';
                        if (latestChampion !== expected) return;
                        var url = String(dataUrl || '').trim();
                        if (!url) return;
                        cover.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
                        cover.classList.add('has-cover');
                    }).catch(function () { });
                } catch (e2) { }
            }
        }
    }

    function getRankClasses(rank) {
        if (rank === 1) return { rankClass: 'sports-rank-first', stepsClass: 'sports-steps-first' };
        if (rank === 2) return { rankClass: 'sports-rank-second', stepsClass: 'sports-steps-second' };
        if (rank === 3) return { rankClass: 'sports-rank-third', stepsClass: 'sports-steps-third' };
        return { rankClass: 'sports-rank-rest', stepsClass: 'sports-steps-rest' };
    }

    function renderRanking(sorted) {
        var listContainer = document.getElementById('sports-list-container');
        if (!listContainer) return;

        var html = '';
        for (var i = 0; i < sorted.length; i++) {
            var item = sorted[i];
            var rank = i + 1;
            var rankStr = rank < 10 ? ('0' + rank) : String(rank);
            var cls = getRankClasses(rank);
            var safeName = escapeHtml(item.name || '');
            var safeAvatar = escapeHtml(item.avatar || '');
            var safeId = escapeHtml(item.id || '');

            html += '<div class="sports-list-item" data-sports-id="' + safeId + '" data-sports-name="' + safeName + '">';
            html += '  <div class="sports-rank-num ' + cls.rankClass + '">' + rankStr + '</div>';
            html += '  <div class="sports-list-avatar"><img src="' + safeAvatar + '"></div>';
            html += '  <div class="sports-list-info">';
            html += '    <div class="sports-list-name">' + safeName + '</div>';
            html += '  </div>';
            html += '  <div class="sports-list-right">';
            html += '    <div class="sports-list-steps ' + cls.stepsClass + '">' + (isStepsReady(item) ? escapeHtml(formatSteps(getStepsValue(item))) : '…') + '</div>';
            html += '    <div class="sports-list-unit">步</div>';
            html += '  </div>';
            html += '</div>';
        }
        listContainer.innerHTML = html;
    }

    function renderFloatingBar(myData, myRank, isUnsetSteps) {
        var barContainer = document.getElementById('sports-floating-bar');
        if (!barContainer || !myData) return;

        var rankNum = Number(myRank);
        var myRankStr = isFinite(rankNum) && rankNum > 0 ? (rankNum < 10 ? ('0' + rankNum) : String(rankNum)) : '--';
        var safeName = escapeHtml(myData.name || '');
        var safeAvatar = escapeHtml(myData.avatar || '');
        var stepsText = isUnsetSteps ? '点击设置步数' : (formatSteps(getStepsValue(myData)) + ' 步');

        barContainer.innerHTML = ''
            + '<div class="sports-bar-rank">' + myRankStr + '</div>'
            + '<div class="sports-bar-avatar"><img src="' + safeAvatar + '"></div>'
            + '<div class="sports-bar-info">'
            + '  <div class="sports-bar-name">' + safeName + '</div>'
            + '</div>'
            + '<div class="sports-bar-right">'
            + '  <div class="sports-bar-steps sports-bar-steps-editable">' + escapeHtml(stepsText) + '</div>'
            + '</div>';
    }

    function computeRankBySteps(sorted, steps) {
        var s = Number(steps);
        if (!isFinite(s) || s < 0) return null;
        var rank = 1;
        for (var i = 0; i < (sorted || []).length; i++) {
            var v = getStepsValue(sorted[i]);
            if (s >= v) return rank;
            rank += 1;
        }
        return rank;
    }

    function ensureDetailOverlay() {
        if (document.getElementById('sports-detail-overlay')) return;
        var overlay = document.createElement('div');
        overlay.id = 'sports-detail-overlay';
        overlay.className = 'sports-detail-overlay';
        overlay.style.display = 'none';

        overlay.innerHTML = ''
            + '<div class="sports-detail-topbar">'
            + '  <div class="sports-detail-back" id="sports-detail-back"><i class="bx bx-left-arrow-alt"></i></div>'
            + '  <div class="sports-detail-title">步数详情</div>'
            + '  <div class="sports-detail-generate" id="sports-detail-generate-btn" title="生成"><i class="bx bx-loader-alt"></i></div>'
            + '</div>'
            + '<div class="sports-detail-scroll">'
            + '  <div class="sports-detail-wall" id="sports-detail-wall">'
            + '    <input id="sports-detail-wall-input" class="sports-detail-wall-input" type="file" accept="image/*">'
            + '  </div>'
            + '  <div class="sports-detail-avatar-wrap">'
            + '    <img id="sports-detail-avatar" class="sports-detail-avatar" src="assets/chushitouxiang.jpg" alt="">'
            + '  </div>'
            + '  <div class="sports-detail-name" id="sports-detail-name">—</div>'
            + '  <div class="sports-detail-summary" id="sports-detail-summary">暂无数据</div>'
            + '  <div class="sports-detail-track">'
            + '    <div class="sports-detail-track-title">运动轨迹</div>'
            + '    <div class="sports-detail-timeline" id="sports-detail-timeline">'
            + '      <div class="sports-detail-empty">暂无数据</div>'
            + '    </div>'
            + '  </div>'
            + '</div>';

        document.body.appendChild(overlay);

        var back = document.getElementById('sports-detail-back');
        if (back) back.addEventListener('click', function () { hideDetail(); });

        var wall = document.getElementById('sports-detail-wall');
        var wallInput = document.getElementById('sports-detail-wall-input');
        if (wall && wallInput) {
            wall.addEventListener('click', function () {
                try { wallInput.click(); } catch (e) { }
            });
            wallInput.addEventListener('change', function () {
                if (!currentDetailRole || !currentDetailRole.id) return;
                var roleId = String(currentDetailRole.id || '').trim();
                if (!roleId) return;
                var files = wallInput.files;
                if (!files || !files[0]) return;
                var file = files[0];
                var reader = new FileReader();
                reader.onload = function () {
                    var dataUrl = typeof reader.result === 'string' ? reader.result : '';
                    if (!dataUrl) return;
                    storeDetailWall(roleId, dataUrl, function (storedUrl) {
                        applyWallBackground(storedUrl || dataUrl);
                        if (lastRanking && lastRanking[0] && String(lastRanking[0].id || '').trim() === roleId) {
                            applyLeaderboardCover(lastRanking[0]);
                        }
                    });
                };
                reader.readAsDataURL(file);
            });
        }

        var genBtn = document.getElementById('sports-detail-generate-btn');
        if (genBtn) {
            genBtn.addEventListener('click', function () {
                if (!currentDetailRole) return;
                if (String(currentDetailRole.id || '') === 'me') return;
                startGenerateTrajectory(currentDetailRole);
            });
        }
    }

    function getDetailWallKey(roleId) {
        return 'sports_detail_wall_' + String(roleId || '').trim();
    }

    function compressImageDataUrl(dataUrl, cb) {
        var url = String(dataUrl || '').trim();
        if (!url) return cb('');
        var img = new Image();
        img.onload = function () {
            var w = img.naturalWidth || img.width || 0;
            var h = img.naturalHeight || img.height || 0;
            if (!w || !h) return cb(url);
            var maxW = 1080;
            var scale = w > maxW ? (maxW / w) : 1;
            var tw = Math.max(1, Math.round(w * scale));
            var th = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement('canvas');
            canvas.width = tw;
            canvas.height = th;
            var ctx = canvas.getContext('2d');
            if (!ctx) return cb(url);
            try {
                ctx.drawImage(img, 0, 0, tw, th);
                var out = '';
                try { out = canvas.toDataURL('image/jpeg', 0.82); } catch (e2) { out = ''; }
                cb(out || url);
            } catch (e) {
                cb(url);
            }
        };
        img.onerror = function () { cb(url); };
        try { img.src = url; } catch (e) { cb(url); }
    }

    function storeDetailWall(roleId, dataUrl, cb) {
        var id = String(roleId || '').trim();
        if (!id) return cb('');
        compressImageDataUrl(dataUrl, function (finalUrl) {
            var out = String(finalUrl || '').trim();
            if (!out) return cb('');
            if (window.localforage && typeof window.localforage.setItem === 'function') {
                try {
                    window.localforage.setItem(DETAIL_WALL_LF_PREFIX + id, out).then(function () {
                        try { localStorage.setItem(getDetailWallKey(id), out); } catch (e2) { }
                        cb(out);
                    }).catch(function () {
                        try { localStorage.setItem(getDetailWallKey(id), out); } catch (e3) { }
                        cb(out);
                    });
                    return;
                } catch (e4) { }
            }
            try { localStorage.setItem(getDetailWallKey(id), out); } catch (e5) { }
            cb(out);
        });
    }

    function readDetailWall(roleId, cb) {
        var id = String(roleId || '').trim();
        if (!id) return cb('');
        var bg = '';
        try { bg = localStorage.getItem(getDetailWallKey(id)) || ''; } catch (e) { bg = ''; }
        bg = String(bg || '').trim();
        if (bg) return cb(bg);
        if (window.localforage && typeof window.localforage.getItem === 'function') {
            try {
                window.localforage.getItem(DETAIL_WALL_LF_PREFIX + id).then(function (dataUrl) {
                    var url = String(dataUrl || '').trim();
                    if (url) {
                        try { localStorage.setItem(getDetailWallKey(id), url); } catch (e2) { }
                    }
                    cb(url);
                }).catch(function () { cb(''); });
                return;
            } catch (e3) { }
        }
        cb('');
    }

    function getDetailTrajectoryKey(roleId) {
        return 'sports_detail_trajectory_' + String(roleId || '').trim() + '_' + getTodayKey();
    }

    function applyWallBackground(dataUrl) {
        var wall = document.getElementById('sports-detail-wall');
        if (!wall) return;
        var url = String(dataUrl || '').trim();
        if (url) {
            wall.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
            wall.classList.add('has-image');
        } else {
            wall.style.backgroundImage = '';
            wall.classList.remove('has-image');
        }
    }

    function renderDetailBase(role) {
        ensureDetailOverlay();
        var nameEl = document.getElementById('sports-detail-name');
        var avatarEl = document.getElementById('sports-detail-avatar');
        var summaryEl = document.getElementById('sports-detail-summary');
        var timelineEl = document.getElementById('sports-detail-timeline');
        var trackWrap = document.querySelector('.sports-detail-track');
        var trackTitle = document.querySelector('.sports-detail-track-title');
        var genBtn = document.getElementById('sports-detail-generate-btn');

        if (nameEl) nameEl.textContent = role && role.name ? role.name : '—';
        if (avatarEl) avatarEl.src = role && role.avatar ? role.avatar : 'assets/chushitouxiang.jpg';
        if (genBtn) {
            if (String(role && role.id || '') === 'me') {
                genBtn.style.display = 'none';
            } else {
                genBtn.style.display = '';
            }
        }

        if (String(role && role.id || '') === 'me') {
            if (summaryEl) summaryEl.style.display = 'none';
            if (trackTitle) trackTitle.style.display = 'none';
            if (trackWrap) trackWrap.style.marginTop = '12px';
            var mySteps = (function () {
                var t = Number(role && role.totalSteps);
                if (isFinite(t) && t >= 0) return Math.floor(t);
                return getStepsValue(role);
            })();
            if (timelineEl) {
                timelineEl.innerHTML = '<div style="margin:16px; padding:16px; border-radius:16px; background:rgba(255,255,255,0.86); box-shadow:0 6px 18px rgba(0,0,0,0.06); text-align:center; font-size:16px; color:#333;">今日步数 ' + escapeHtml(formatSteps(mySteps)) + ' 步</div>';
            }
        } else {
            if (summaryEl) { summaryEl.style.display = ''; summaryEl.textContent = '暂无数据'; }
            if (trackTitle) trackTitle.style.display = '';
            if (timelineEl) timelineEl.innerHTML = '<div class="sports-detail-empty">暂无数据</div>';
        }

        applyWallBackground('');
        var token = ++detailWallReqToken;
        readDetailWall(role && role.id, function (url) {
            if (token !== detailWallReqToken) return;
            if (!currentDetailRole || String(currentDetailRole.id || '') !== String(role && role.id || '')) return;
            applyWallBackground(url || '');
        });
    }

    function renderTimeline(events) {
        var timelineEl = document.getElementById('sports-detail-timeline');
        if (!timelineEl) return;
        var list = Array.isArray(events) ? events : [];
        if (!list.length) {
            timelineEl.innerHTML = '<div class="sports-detail-empty">暂无数据</div>';
            return;
        }
        var html = '<div class="sports-timeline">';
        for (var i = 0; i < list.length; i++) {
            var ev = list[i] && typeof list[i] === 'object' ? list[i] : {};
            var time = String(ev.time || '').trim() || '--:--';
            var locationText = String(ev.location || ev.place || ev.where || '').trim();
            var actionText = String(ev.action || '').trim();
            var titleRaw = String(ev.title || '').trim();
            if (!locationText && titleRaw) {
                var parts = titleRaw.split(/[·]/);
                if (parts.length >= 2) locationText = String(parts[0] || '').trim();
            }
            if (!actionText && titleRaw) {
                var parts2 = titleRaw.split(/[·]/);
                if (parts2.length >= 2) actionText = String(parts2.slice(1).join('·') || '').trim();
            }
            if (!locationText) locationText = '—';
            if (!actionText) actionText = titleRaw || '—';
            if (locationText && locationText !== '—' && actionText.indexOf(locationText) !== -1) {
                var esc = locationText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                var re = new RegExp(esc, 'g');
                actionText = actionText.replace(re, '').replace(/^在+/, '').replace(/\s+/g, ' ').trim();
            }
            var title = escapeHtml(actionText || '事件');
            var location = escapeHtml(locationText || '—');
            var duration = escapeHtml(String(ev.duration || ev.stay || '').trim() || '—');
            var steps = Number(ev.steps);
            if (!isFinite(steps) || steps < 0) steps = 0;
            var stepsText = escapeHtml(formatSteps(steps));
            html += ''
                + '<div class="sports-timeline-item">'
                + '  <div class="sports-timeline-time">' + escapeHtml(time) + '</div>'
                + '  <div class="sports-timeline-node"><div class="sports-timeline-dot"></div></div>'
                + '  <div class="sports-timeline-card">'
                + '    <div class="sports-timeline-title">' + title + '</div>'
                + '    <div class="sports-timeline-meta">'
                + '      <div class="sports-meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><span>' + duration + '</span></div>'
                + '      <div class="sports-meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.35-7-11a7 7 0 0 1 14 0c0 6.65-7 11-7 11z"></path><circle cx="12" cy="10" r="2.5"></circle></svg><span>' + location + '</span></div>'
                + '      <div class="sports-meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 11 3.8 11 8c0 2.85-1.67 5.71-3 8v6h-4v-6z"></path><path d="M13 22v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C7.63 8 6 9.8 6 14c0 2.85 1.67 5.71 3 8v6h4v-6z" transform="translate(6,0)"></path></svg><span>' + stepsText + '步</span></div>'
                + '    </div>'
                + '  </div>'
                + '</div>';
        }
        html += '</div>';
        timelineEl.innerHTML = html;
    }

    function showDetail(role) {
        if (!role || !role.id) return;
        ensureDetailOverlay();
        currentDetailRole = role;
        renderDetailBase(role);

        if (String(role.id) === 'me') {
            var detailEl0 = document.getElementById('sports-detail-overlay');
            var listEl0 = document.getElementById('sports-leaderboard-overlay');
            if (listEl0) listEl0.style.display = 'none';
            if (detailEl0) detailEl0.style.display = 'flex';
            return;
        }

        var cached = null;
        try {
            var raw = localStorage.getItem(getDetailTrajectoryKey(role.id));
            if (raw) cached = JSON.parse(raw);
        } catch (e) { cached = null; }

        if (cached && typeof cached === 'object') {
            var summaryEl = document.getElementById('sports-detail-summary');
            if (summaryEl) summaryEl.textContent = String(cached.summary || cached.comment || '').trim() || '暂无数据';
            renderTimeline(cached.events || cached.timeline || []);
        }

        var detailEl = document.getElementById('sports-detail-overlay');
        var listEl = document.getElementById('sports-leaderboard-overlay');
        if (listEl) listEl.style.display = 'none';
        if (detailEl) detailEl.style.display = 'flex';
    }

    function hideDetail() {
        var detailEl = document.getElementById('sports-detail-overlay');
        if (detailEl) detailEl.style.display = 'none';
        var listEl = document.getElementById('sports-leaderboard-overlay');
        if (listEl) listEl.style.display = 'flex';
        currentDetailRole = null;
        setGenerateLoading(false);
        if (lastRanking && lastRanking.length) renderCoverChampion(lastRanking[0]);
    }

    function setGenerateLoading(isLoading) {
        var btn = document.getElementById('sports-detail-generate-btn');
        if (!btn) return;
        if (isLoading) btn.classList.add('is-loading');
        else btn.classList.remove('is-loading');
    }

    function extractJsonObject(text) {
        var raw = String(text || '').trim();
        if (!raw) return null;
        var start = raw.indexOf('{');
        var end = raw.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) return null;
        var jsonText = raw.slice(start, end + 1);
        try {
            var parsed = JSON.parse(jsonText);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (e) {
            return null;
        }
    }

    function readChatDataSnapshot() {
        var data = null;
        try {
            if (window.chatData && typeof window.chatData === 'object') data = window.chatData;
        } catch (e) { data = null; }
        if (data && typeof data === 'object') return data;
        try {
            var raw = localStorage.getItem('wechat_chatData') || '{}';
            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e2) {
            return {};
        }
    }

    function getRecentChatHistoryText(roleId, limit) {
        var id = String(roleId || '').trim();
        if (!id) return '';
        var n = Number(limit);
        if (!isFinite(n) || n <= 0) n = 20;
        n = Math.floor(n);

        var chatMap = readChatDataSnapshot();
        var list = Array.isArray(chatMap[id]) ? chatMap[id] : [];
        if (!list.length) return '';
        var speakerNames = getRecentChatSpeakerNames(id);

        var lines = [];
        for (var i = list.length - 1; i >= 0 && lines.length < n; i--) {
            var m = list[i] && typeof list[i] === 'object' ? list[i] : null;
            if (!m) continue;
            if (m.type && String(m.type) !== 'text') continue;
            var content = String(m.content || '').replace(/\s+/g, ' ').trim();
            if (!content) continue;
            if (content.length > 180) content = content.slice(0, 179) + '…';
            var who = String(m.role || '').toLowerCase() === 'me'
                ? speakerNames.userName
                : speakerNames.roleName;
            lines.push(who + '：' + content);
        }
        lines.reverse();
        return lines.join('\n').trim();
    }

    function buildTrajectoryPrompt(role) {
        var id = String(role && role.id || '').trim();
        var name = String(role && role.name || '').trim() || '角色';
        var persona = String(role && role.persona || '').trim() || '未设置人设';
        var worldbook = String(role && role.worldbook || '').trim() || '未设置世界书';
        var totalSteps = Number(role && role.totalSteps);
        if (!isFinite(totalSteps) || totalSteps < 0) totalSteps = 0;
        totalSteps = Math.floor(totalSteps);
        var recent = getRecentChatHistoryText(id, 20);
        return [
            '你要为【角色】生成“基于剧情的动态运动轨迹”。',
            '',
            '【输入参数】',
            '- 角色名：' + name,
            '- 今日总步数：' + totalSteps,
            '',
            '【角色人设 Persona】',
            persona,
            '',
            '【世界书/背景设定 World Book】',
            worldbook,
            '',
            '【最近聊天记录 Recent Chat History（最近20条）】',
            recent ? recent : '（无）',
            '',
            '【生成目标】',
            '结合人设、聊天记录、世界书背景，生成 6-10 条按时间排序的行动轨迹，每条必须包含“时间点 + 地点(location) + 具体行为(action)”。',
            '',
            '【硬性规则】',
            '1) 轨迹内容必须符合世界书设定，禁止出现世界书中不存在/违背设定的地点与科技/社会结构。',
            '2) 如果最近聊天记录里提到了明确的地点/计划/活动（例如“去海边散步”），你必须在轨迹中体现：至少有一条 events.location 必须包含该地点关键词（例如“海边”），且 events.action 与对话意图一致（例如“散步/散心/沿海步行”）。',
            '3) 你需要将角色的行动拆分为『地点(location)』和『具体行为(action)』两个独立字段。',
            '   注意：在『具体行为(action)』的描写中，绝对不要重复出现『地点(location)』的名字。',
            "   ❌ 错误示例：location='星巴克'，action='在星巴克里喝冰美式，看着窗外发呆'。",
            "   ✅ 正确示例：location='星巴克'，action='喝着冰美式，看着窗外发呆，心情似乎很不错'。",
            '4) summary 必须 15 字内，语气必须符合人设。',
            '5) events 的 steps 相加必须完全等于 ' + totalSteps + '，steps 必须为整数。',
            '6) level 用于约束步数区间，且事件内容必须与 level 匹配：',
            '   - static 静态活动（发呆/看书/坐着）：100—500 步',
            '   - light 轻度活动（室内走动/整理东西）：500—1000 步',
            '   - moderate 中度活动（逛街/通勤步行）：1000—5000 步',
            '   - heavy 重度活动（跑腿/送货/代走/追赶）：3000—8000 步',
            '',
            '【只输出 JSON】',
            '不要 Markdown，不要解释，不要多余字段。严格返回一个 JSON 对象：',
            '{"summary":"15字内评价","profile":{"job":"职业","lifestyle":"生活方式简述"},"events":[{"time":"08:30","location":"地点","action":"具体行为","duration":"40分钟","level":"static|light|moderate|heavy","steps":850}]}'
        ].join('\n');
    }

    function getLevelRange(level) {
        var lv = String(level || '').trim().toLowerCase();
        if (lv === 'static') return { min: 100, max: 500 };
        if (lv === 'light') return { min: 500, max: 1000 };
        if (lv === 'moderate') return { min: 1000, max: 5000 };
        if (lv === 'heavy') return { min: 3000, max: 8000 };
        return { min: 1000, max: 5000 };
    }

    function clampInt(n, min, max) {
        var x = Number(n);
        if (!isFinite(x)) x = 0;
        x = Math.floor(x);
        if (x < min) x = min;
        if (x > max) x = max;
        return x;
    }

    function rebalanceStepsByRanges(items, total) {
        var list = Array.isArray(items) ? items : [];
        var t = Number(total);
        if (!isFinite(t) || t < 0) t = 0;
        t = Math.floor(t);
        if (!list.length) return list;

        var minSum = 0;
        var maxSum = 0;
        for (var i = 0; i < list.length; i++) {
            var r = getLevelRange(list[i].level);
            minSum += r.min;
            maxSum += r.max;
        }
        if (t < minSum) t = minSum;
        if (t > maxSum) t = maxSum;

        var sum = 0;
        for (var j = 0; j < list.length; j++) sum += list[j].steps;
        var delta = t - sum;
        if (delta === 0) return list;

        var guard = 0;
        while (delta !== 0 && guard < 8000) {
            guard += 1;
            var changed = false;
            if (delta > 0) {
                for (var k = 0; k < list.length && delta > 0; k++) {
                    var r1 = getLevelRange(list[k].level);
                    var slack = r1.max - list[k].steps;
                    if (slack <= 0) continue;
                    var add = Math.min(slack, delta);
                    list[k].steps += add;
                    delta -= add;
                    changed = true;
                }
            } else {
                for (var k2 = list.length - 1; k2 >= 0 && delta < 0; k2--) {
                    var r2 = getLevelRange(list[k2].level);
                    var reducible = list[k2].steps - r2.min;
                    if (reducible <= 0) continue;
                    var sub = Math.min(reducible, -delta);
                    list[k2].steps -= sub;
                    delta += sub;
                    changed = true;
                }
            }
            if (!changed) break;
        }
        return list;
    }

    function upgradeLevel(level) {
        var lv = String(level || '').trim().toLowerCase();
        if (lv === 'static') return 'light';
        if (lv === 'light') return 'moderate';
        if (lv === 'moderate') return 'heavy';
        return lv;
    }

    function downgradeLevel(level) {
        var lv = String(level || '').trim().toLowerCase();
        if (lv === 'heavy') return 'moderate';
        if (lv === 'moderate') return 'light';
        if (lv === 'light') return 'static';
        return lv;
    }

    function sumSteps(list) {
        var s = 0;
        for (var i = 0; i < (list || []).length; i++) s += Number(list[i] && list[i].steps) || 0;
        return s;
    }

    function ensureTotalWithinRanges(items, total) {
        var list = Array.isArray(items) ? items : [];
        var t = Number(total);
        if (!isFinite(t) || t < 0) t = 0;
        t = Math.floor(t);
        if (!list.length) return list;

        for (var guard = 0; guard < 30; guard++) {
            list = rebalanceStepsByRanges(list, t);
            var cur = sumSteps(list);
            var delta = t - cur;
            if (delta === 0) return list;

            if (delta > 0) {
                var bestIdx = -1;
                var bestGain = 0;
                for (var i = 0; i < list.length; i++) {
                    var curLv = list[i].level;
                    var upLv = upgradeLevel(curLv);
                    if (upLv === curLv) continue;
                    var curR = getLevelRange(curLv);
                    var upR = getLevelRange(upLv);
                    var gain = upR.max - curR.max;
                    if (gain > bestGain) {
                        bestGain = gain;
                        bestIdx = i;
                    }
                }
                if (bestIdx === -1) break;
                list[bestIdx].level = upgradeLevel(list[bestIdx].level);
                var rUp = getLevelRange(list[bestIdx].level);
                list[bestIdx].steps = clampInt(list[bestIdx].steps, rUp.min, rUp.max);
            } else {
                var bestIdx2 = -1;
                var bestDrop = 0;
                for (var j = 0; j < list.length; j++) {
                    var curLv2 = list[j].level;
                    var downLv = downgradeLevel(curLv2);
                    if (downLv === curLv2) continue;
                    var curR2 = getLevelRange(curLv2);
                    var downR = getLevelRange(downLv);
                    var drop = curR2.min - downR.min;
                    if (drop > bestDrop) {
                        bestDrop = drop;
                        bestIdx2 = j;
                    }
                }
                if (bestIdx2 === -1) break;
                list[bestIdx2].level = downgradeLevel(list[bestIdx2].level);
                var rDown = getLevelRange(list[bestIdx2].level);
                list[bestIdx2].steps = clampInt(list[bestIdx2].steps, rDown.min, rDown.max);
            }
        }
        return rebalanceStepsByRanges(list, t);
    }

    function validateAndFixTrajectory(role, traj) {
        var totalSteps = Number(role && role.totalSteps);
        if (!isFinite(totalSteps) || totalSteps < 0) totalSteps = 0;
        totalSteps = Math.floor(totalSteps);

        var obj = traj && typeof traj === 'object' ? traj : {};
        var summary = String(obj.summary || obj.comment || obj.评价 || obj.short || obj.review || '').trim();
        if (summary.length > 15) summary = summary.slice(0, 15);
        var events = [];
        var originalLen = 0;
        if (Array.isArray(traj)) {
            events = traj;
        } else {
            events = obj.events || obj.timeline || obj.items || obj.actions || obj.actionList || obj.activities || obj.activity || obj.list;
            if (!Array.isArray(events) && obj.data && typeof obj.data === 'object') {
                if (Array.isArray(obj.data.events)) events = obj.data.events;
                else if (Array.isArray(obj.data.items)) events = obj.data.items;
            }
            if (!Array.isArray(events) && Array.isArray(obj.data)) events = obj.data;
            if (!Array.isArray(events)) events = [];
        }
        originalLen = Array.isArray(events) ? events.length : 0;

        if (events.length < 6) {
            while (events.length < 6) events.push({ time: '', title: '补全事件', duration: '—', steps: 0 });
        } else if (events.length > 10) {
            events = events.slice(0, 10);
        }

        var n = events.length;
        var fixed = [];
        for (var i = 0; i < n; i++) {
            var ev = events[i] && typeof events[i] === 'object' ? events[i] : {};
            var stepsRaw = ev.steps;
            if (stepsRaw == null) stepsRaw = ev.step;
            if (stepsRaw == null) stepsRaw = ev.stepCount;
            if (stepsRaw == null) stepsRaw = ev.count;
            var rawLevel = ev.level;
            if (rawLevel == null) rawLevel = ev.intensity;
            if (rawLevel == null) rawLevel = ev.type;
            var level = String(rawLevel || 'moderate').trim().toLowerCase();
            var range = getLevelRange(level);
            var steps = clampInt(stepsRaw, range.min, range.max);
            var location = String(ev.location || ev.place || ev.where || ev.scene || '').trim();
            var action = String(ev.action || ev.behavior || ev.do || ev.what || '').trim();
            var title = String(ev.title || ev.desc || ev.description || ev.event || '').trim();
            if (!title) {
                if (location && action) title = location + ' · ' + action;
                else if (location) title = location;
                else if (action) title = action;
            }
            if (location && action && action.indexOf(location) !== -1) {
                var esc = location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                var re = new RegExp(esc, 'g');
                action = action.replace(re, '');
                action = action.replace(/^在+/, '');
                action = action.replace(/\s+/g, ' ').trim();
            }
            fixed.push({
                time: String(ev.time || '').trim(),
                title: title,
                location: location,
                action: action,
                duration: String(ev.duration || ev.stay || ev.cost || ev.spend || '').trim(),
                level: level,
                steps: steps
            });
        }

        fixed = ensureTotalWithinRanges(fixed, totalSteps);

        var timeBaseHour = 8;
        var timeBaseMin = 0;
        for (var t = 0; t < n; t++) {
            if (!fixed[t].time) {
                timeBaseMin += (t === 0 ? 30 : 60);
                while (timeBaseMin >= 60) { timeBaseHour += 1; timeBaseMin -= 60; }
                fixed[t].time = pad2(timeBaseHour) + ':' + pad2(timeBaseMin);
            }
            if (!fixed[t].title) fixed[t].title = '行动';
            if (!fixed[t].location) {
                var tt = String(fixed[t].title || '').trim();
                var parts = tt.split(/[·\-—]/);
                if (parts.length >= 2) {
                    var p0 = String(parts[0] || '').trim();
                    if (p0) fixed[t].location = p0;
                }
            }
            if (!fixed[t].action) {
                var tt2 = String(fixed[t].title || '').trim();
                var parts2 = tt2.split(/[·]/);
                if (parts2.length >= 2) {
                    var a1 = String(parts2.slice(1).join('·') || '').trim();
                    if (a1) fixed[t].action = a1;
                }
            }
            if (fixed[t].location && fixed[t].action && String(fixed[t].action).indexOf(String(fixed[t].location)) !== -1) {
                var loc = String(fixed[t].location);
                var esc2 = loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                var re2 = new RegExp(esc2, 'g');
                fixed[t].action = String(fixed[t].action).replace(re2, '');
                fixed[t].action = String(fixed[t].action).replace(/^在+/, '').replace(/\s+/g, ' ').trim();
            }
            if (!fixed[t].title && fixed[t].location) fixed[t].title = fixed[t].location;
            if (!fixed[t].duration) fixed[t].duration = '—';
            if (!fixed[t].level) fixed[t].level = 'moderate';
        }

        return { summary: summary || '暂无数据', events: fixed, autoFixed: originalLen === 0 };
    }

    function inferProfileFromTexts(persona, worldbook) {
        var p = String(persona || '').toLowerCase();
        var w = String(worldbook || '').toLowerCase();
        var text = (p + '\n' + w);

        var job = '自由职业';
        if (text.indexOf('画') !== -1 || text.indexOf('画家') !== -1 || text.indexOf('插画') !== -1) job = '画家';
        else if (text.indexOf('程序') !== -1 || text.indexOf('开发') !== -1 || text.indexOf('工程师') !== -1) job = '程序员';
        else if (text.indexOf('学生') !== -1 || text.indexOf('校园') !== -1) job = '学生';
        else if (text.indexOf('医生') !== -1 || text.indexOf('医院') !== -1) job = '医生';
        else if (text.indexOf('侦探') !== -1 || text.indexOf('刑警') !== -1 || text.indexOf('警') !== -1) job = '调查人员';
        else if (text.indexOf('外卖') !== -1 || text.indexOf('骑手') !== -1 || text.indexOf('快递') !== -1) job = '跑腿';

        var lifestyle = '作息不定，喜欢独处';
        if (text.indexOf('宅') !== -1 || text.indexOf('社恐') !== -1) lifestyle = '偏宅，活动半径很小';
        else if (text.indexOf('健身') !== -1 || text.indexOf('跑步') !== -1) lifestyle = '自律，喜欢运动';
        else if (text.indexOf('通勤') !== -1 || text.indexOf('上班') !== -1) lifestyle = '规律通勤，白天忙碌';
        else if (text.indexOf('夜') !== -1 || text.indexOf('熬夜') !== -1) lifestyle = '夜行，白天犯困';

        var tone = 'neutral';
        if (text.indexOf('傲娇') !== -1) tone = 'tsundere';
        else if (text.indexOf('毒舌') !== -1) tone = 'sharp';
        else if (text.indexOf('温柔') !== -1) tone = 'soft';
        else if (text.indexOf('高冷') !== -1) tone = 'cold';
        else if (text.indexOf('元气') !== -1) tone = 'energetic';

        var world = 'city';
        if (text.indexOf('赛博') !== -1 || text.indexOf('未来') !== -1) world = 'cyber';
        else if (text.indexOf('古代') !== -1 || text.indexOf('朝') !== -1) world = 'ancient';
        else if (text.indexOf('修仙') !== -1 || text.indexOf('仙') !== -1) world = 'xianxia';
        else if (text.indexOf('末日') !== -1 || text.indexOf('废土') !== -1) world = 'wasteland';
        else if (text.indexOf('校园') !== -1) world = 'campus';

        return { job: job, lifestyle: lifestyle, tone: tone, world: world };
    }

    function buildSummaryByTone(tone, job, totalSteps) {
        var t = String(tone || 'neutral');
        var s = Number(totalSteps);
        if (!isFinite(s) || s < 0) s = 0;
        s = Math.floor(s);
        var high = s >= 18000;
        var low = s <= 5000;

        var line = '还行。';
        if (t === 'tsundere') line = high ? '别夸，我只是顺路。' : (low ? '我才没偷懒。' : '就当散心。');
        else if (t === 'sharp') line = high ? '累？那是你。' : (low ? '今天懒得动。' : '够了，别问。');
        else if (t === 'soft') line = high ? '走了很多，心更稳。' : (low ? '慢慢来，也很好。' : '刚刚好的一天。');
        else if (t === 'cold') line = high ? '完成。' : (low ? '没必要。' : '按计划。');
        else if (t === 'energetic') line = high ? '今天超能走！' : (low ? '明天再冲！' : '状态在线！');
        else line = high ? '走到不想说话。' : (low ? '几步而已。' : '平平无奇。');

        if (job === '画家' && line.length < 12) line = line + ' 灵感还行。';
        if (line.length > 15) line = line.slice(0, 15);
        return line;
    }

    function buildEventTitle(world, job, level) {
        var w = String(world || 'city');
        var j = String(job || '');
        var lv = String(level || 'moderate');

        var places = {
            city: { indoor: '工作室', street: '街区', hub: '地铁口', shop: '便利店', park: '公园' },
            cyber: { indoor: '工作舱', street: '霓虹街', hub: '轨道站', shop: '补给点', park: '空中花园' },
            ancient: { indoor: '书房', street: '坊市', hub: '城门', shop: '铺子', park: '长廊' },
            xianxia: { indoor: '洞府', street: '山道', hub: '山门', shop: '集市', park: '灵泉旁' },
            wasteland: { indoor: '避难所', street: '废街', hub: '哨岗', shop: '交易点', park: '荒坡' },
            campus: { indoor: '图书馆', street: '林荫路', hub: '教学楼', shop: '小卖部', park: '操场' }
        };
        var p = places[w] || places.city;

        if (lv === 'static') {
            if (j === '画家') return '坐着修草图';
            return '短暂发呆';
        }
        if (lv === 'light') {
            if (j === '画家') return '收拾画具与颜料';
            return '在' + p.indoor + '来回走动';
        }
        if (lv === 'moderate') {
            if (j === '画家') return '去' + p.shop + '买画材';
            return '穿过' + p.street + '办事';
        }
        if (lv === 'heavy') {
            if (j === '调查人员') return '追踪线索赶路';
            if (j === '跑腿') return '加急跑腿送达';
            return '赶在' + p.hub + '前冲刺';
        }
        return '行动';
    }

    function pickDurationByLevel(level) {
        var lv = String(level || 'moderate');
        if (lv === 'static') return '30分钟';
        if (lv === 'light') return '40分钟';
        if (lv === 'moderate') return '1小时';
        if (lv === 'heavy') return '50分钟';
        return '1小时';
    }

    function buildLevelsForTotal(totalSteps) {
        var s = Number(totalSteps);
        if (!isFinite(s) || s < 0) s = 0;
        s = Math.floor(s);

        var n = 8;
        if (s <= 4000) n = 6;
        else if (s <= 9000) n = 7;
        else if (s >= 22000) n = 9;

        var levels = [];
        if (s <= 2500) {
            levels = ['static', 'light', 'light', 'moderate', 'light', 'static'];
        } else if (s <= 8000) {
            levels = ['static', 'light', 'moderate', 'moderate', 'light', 'moderate', 'light'];
        } else if (s <= 15000) {
            levels = ['static', 'light', 'moderate', 'moderate', 'heavy', 'moderate', 'light', 'moderate'];
        } else {
            levels = ['light', 'moderate', 'heavy', 'moderate', 'heavy', 'moderate', 'light', 'heavy', 'moderate'];
        }
        levels = levels.slice(0, n);

        var list = levels.map(function (lv) {
            var r = getLevelRange(lv);
            return { level: lv, steps: Math.floor((r.min + r.max) / 2) };
        });
        list = ensureTotalWithinRanges(list, s);
        return list.map(function (x) { return x.level; });
    }

    function mockGenerateTrajectory(role) {
        var totalSteps = Number(role && role.totalSteps);
        if (!isFinite(totalSteps) || totalSteps < 0) totalSteps = 0;
        totalSteps = Math.floor(totalSteps);

        var persona = String(role && role.persona || '').trim();
        var worldbook = String(role && role.worldbook || '').trim();
        var prof = inferProfileFromTexts(persona, worldbook);
        var levels = buildLevelsForTotal(totalSteps);
        var base = [];
        for (var i = 0; i < levels.length; i++) {
            var r = getLevelRange(levels[i]);
            base.push({
                time: '',
                title: buildEventTitle(prof.world, prof.job, levels[i]),
                duration: pickDurationByLevel(levels[i]),
                level: levels[i],
                steps: Math.floor((r.min + r.max) / 2)
            });
        }
        base = ensureTotalWithinRanges(base, totalSteps);

        var events = [];
        var h = 8;
        var m = 30;
        for (var j = 0; j < base.length; j++) {
            events.push({
                time: pad2(h) + ':' + pad2(m),
                title: base[j].title,
                duration: base[j].duration,
                level: base[j].level,
                steps: base[j].steps
            });
            m += 55;
            while (m >= 60) { h += 1; m -= 60; }
        }
        var summary = buildSummaryByTone(prof.tone, prof.job, totalSteps);
        return validateAndFixTrajectory(role, { summary: summary, profile: { job: prof.job, lifestyle: prof.lifestyle }, events: events });
    }


    async function generateTrajectoryAPI(role) {
        var prompt = buildTrajectoryPrompt(role);
        if (typeof window.callAI === 'function') {
            return await new Promise(function (resolve, reject) {
                try {
                    window.callAI(
                        (typeof window.buildToolJsonPrompt === 'function'
                            ? window.buildToolJsonPrompt('sports_trajectory_generation', {
                                sceneIntro: '当前场景是运动轨迹生成。',
                                taskGuidance: '请根据角色资料合理生成当天运动轨迹和摘要。',
                                outputInstructions: '只返回当前任务要求的纯 JSON 对象，不要输出额外文字或代码块。'
                            })
                            : '你是一个运动轨迹生成器。'),
                        [],
                        prompt,
                        function (text) {
                            var obj = extractJsonObject(text);
                            if (!obj) {
                                reject(new Error('模型返回内容不是有效 JSON 对象'));
                                return;
                            }
                            resolve(obj);
                        },
                        function (err) { reject(new Error(String(err || '请求失败'))); }
                    );
                } catch (e) { reject(e); }
            });
        }

        var cfg = getAIRequestConfig();
        if (!cfg.url || !cfg.apiKey) {
            throw new Error('未配置 API 地址或 API Key');
        }

        var controller = new AbortController();
        var timeout = setTimeout(function () {
            try { controller.abort(); } catch (e) { }
        }, 70000);

        try {
            var res = await fetch(cfg.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + cfg.apiKey
                },
                body: JSON.stringify({
                    model: cfg.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7
                }),
                signal: controller.signal
            });
            if (!res.ok) {
                var t = '';
                try { t = await res.text(); } catch (e2) { t = ''; }
                throw new Error('请求失败 (' + res.status + '): ' + (t || res.statusText || ''));
            }
            var data = await res.json();
            var content = '';
            if (data && Array.isArray(data.choices) && data.choices[0]) {
                var c0 = data.choices[0];
                if (c0.message && typeof c0.message.content === 'string') content = c0.message.content;
                else if (typeof c0.text === 'string') content = c0.text;
            }
            var obj = extractJsonObject(content);
            if (!obj) throw new Error('模型返回内容不是有效 JSON 对象');
            return obj;
        } catch (e3) {
            if (e3 && e3.name === 'AbortError') throw new Error('请求超时');
            throw e3;
        } finally {
            clearTimeout(timeout);
        }
    }

    function dispatchGenerateTrajectory(role) {
        var roleId = String(role && role.id || '').trim();
        if (!roleId) return Promise.reject(new Error('缺少角色ID'));
        var key = getDetailTrajectoryKey(roleId);
        if (trajectoryInFlight[key]) return trajectoryInFlight[key];

        beginSportsTask();
        trajectoryInFlight[key] = (async function () {
            try {
                var raw = await generateTrajectoryAPI(role);
                var fixed = validateAndFixTrajectory(role, raw);
                try { localStorage.setItem(key, JSON.stringify(fixed)); } catch (e2) { }
                return fixed;
            } catch (e) {
                var nm = String(role && role.name || '').trim() || '该角色';
                reportSportsError(nm + '的运动数据生成失败，请稍后重试');
                throw e;
            } finally {
                delete trajectoryInFlight[key];
                endSportsTask();
            }
        })();
        return trajectoryInFlight[key];
    }

    function startGenerateTrajectory(role) {
        setGenerateLoading(true);
        var roleId = String(role && role.id || '').trim();
        var summaryEl = document.getElementById('sports-detail-summary');
        if (summaryEl) summaryEl.textContent = '后台生成中...';
        dispatchGenerateTrajectory(role).then(function (fixed) {
            if (!fixed || typeof fixed !== 'object') return;
            if (!currentDetailRole || String(currentDetailRole.id || '') !== roleId) return;
            var summaryEl2 = document.getElementById('sports-detail-summary');
            if (summaryEl2) summaryEl2.textContent = fixed.summary || '暂无数据';
            renderTimeline(fixed.events || []);
            if (fixed && fixed.autoFixed) showToast('模型返回格式不匹配，已自动修正');
        }).catch(function () {
            if (!currentDetailRole || String(currentDetailRole.id || '') !== roleId) return;
            var summaryEl3 = document.getElementById('sports-detail-summary');
            if (summaryEl3) summaryEl3.textContent = '生成失败';
        }).finally(function () {
            if (!currentDetailRole || String(currentDetailRole.id || '') !== roleId) return;
            setGenerateLoading(false);
        });
    }

    function bindEventsOnce() {
        var overlayEl = document.getElementById('sports-leaderboard-overlay');
        if (!overlayEl || overlayEl._sportsBound) return;
        overlayEl._sportsBound = true;

        var navBack = document.getElementById('sports-nav-back');
        if (navBack) {
            navBack.addEventListener('click', function () { hide(); });
        }
        var navRefresh = document.getElementById('sports-nav-refresh');
        if (navRefresh) {
            navRefresh.addEventListener('click', function () {
                try {
                    if (typeof window.generateSportsData === 'function') {
                        window.generateSportsData();
                        showToast('后台同步中...');
                    }
                } catch (e) { }
            });
        }

        var listContainer = document.getElementById('sports-list-container');
        if (listContainer) {
            listContainer.addEventListener('click', function (e) {
                var t = e && e.target ? e.target : null;
                if (!t) return;
                var row = t.closest ? t.closest('.sports-list-item') : null;
                if (!row) return;
                var id = row.getAttribute('data-sports-id') || '';
                if (!id) return;
                var item = null;
                for (var i = 0; i < lastRanking.length; i++) {
                    if (lastRanking[i] && String(lastRanking[i].id) === String(id)) {
                        item = lastRanking[i];
                        break;
                    }
                }
                if (!item) return;
                if (!isStepsReady(item)) {
                    showToast('步数生成中...');
                    return;
                }
                showDetail({
                    id: String(item.id || ''),
                    name: String(item.name || ''),
                    avatar: String(item.avatar || ''),
                    persona: String(item.persona || ''),
                    worldbook: String(item.worldbook || ''),
                    totalSteps: getStepsValue(item)
                });
            });
        }

        var bar = document.getElementById('sports-floating-bar');
        if (bar) {
            bar.addEventListener('click', function (e) {
                var t = e && e.target ? e.target : null;
                if (!t) return;
                var stepEl = t.closest ? t.closest('.sports-bar-steps-editable') : null;
                if (!stepEl) return;
                if (stepEl._stepsEditing) return;
                stepEl._stepsEditing = true;

                var prevSteps = readMySteps();
                var input = document.createElement('input');
                input.type = 'number';
                input.inputMode = 'numeric';
                input.min = '0';
                input.step = '1';
                input.value = prevSteps == null ? '' : String(prevSteps);
                input.style.width = '120px';
                input.style.padding = '6px 10px';
                input.style.borderRadius = '10px';
                input.style.border = '1px solid rgba(0,0,0,0.12)';
                input.style.outline = 'none';
                input.style.fontSize = '14px';
                input.style.background = 'rgba(255,255,255,0.9)';

                var oldText = String(stepEl.textContent || '');
                stepEl.textContent = '';
                stepEl.appendChild(input);
                try { input.focus(); input.select(); } catch (e2) { }

                var canceled = false;
                var commit = function () {
                    if (canceled) return;
                    var rawVal = input.value;
                    try { stepEl.removeChild(input); } catch (e3) { }
                    stepEl._stepsEditing = false;
                    stepEl.textContent = oldText;

                    if (rawVal == null) return;
                    var before = readMySteps();
                    var n = writeMySteps(rawVal);
                    if (before === n) return;
                    showToast('已更新：' + formatSteps(n) + '步');
                    scheduleUserStepsSystemContext(n);
                    loadSeq += 1;
                    var seq = loadSeq;
                    loadAndRender(seq);
                };

                input.addEventListener('keydown', function (ev) {
                    var key = ev && ev.key ? ev.key : '';
                    if (key === 'Enter') {
                        ev.preventDefault();
                        try { input.blur(); } catch (e4) { commit(); }
                        return;
                    }
                    if (key === 'Escape') {
                        ev.preventDefault();
                        canceled = true;
                        try { stepEl.removeChild(input); } catch (e5) { }
                        stepEl._stepsEditing = false;
                        stepEl.textContent = oldText;
                        return;
                    }
                });
                input.addEventListener('blur', commit);
            });
        }
    }

    function dispatchGenerateLeaderboardSteps(contacts, seq, opts) {
        if (leaderboardInFlight) return leaderboardInFlight;
        beginSportsTask();
        leaderboardInFlight = (async function () {
            try {
                var steps = await fetchStepsFromAI(contacts);
                writeLeaderboardCache(steps);
                if (document.getElementById('sports-leaderboard-overlay')) {
                    loadAndRender(loadSeq);
                }
                return steps;
            } catch (e) {
                reportSportsError('步数排行榜同步失败');
                throw e;
            } finally {
                leaderboardInFlight = null;
                endSportsTask();
            }
        })();
        return leaderboardInFlight;
    }

    function loadAndRender(currentSeq, opts) {
        updateCoverDate();
        var contacts = getCharactersData();
        var cached = readLeaderboardCache();
        var merged = null;
        if (cached && cached.stepsById && typeof cached.stepsById === 'object') {
            var steps = Object.keys(cached.stepsById).map(function (id) {
                return { id: id, steps: cached.stepsById[id] };
            });
            merged = mergeStepsIntoContacts(contacts, steps);
        } else {
            showLoadingMask();
            merged = (contacts || []).map(function (c) {
                return {
                    id: String(c.id || '').trim(),
                    name: c.name || '',
                    avatar: c.avatar || '',
                    persona: c.persona || '',
                    worldbook: c.worldbook || '',
                    steps: null,
                    isMe: false
                };
            });
            dispatchGenerateLeaderboardSteps(contacts, currentSeq, opts);
        }
        if (currentSeq !== loadSeq) return;
        var myProfile = getMyDataSnapshot();
        var mySteps = readMySteps();
        var myData = {
            id: 'me',
            name: myProfile.name,
            avatar: myProfile.avatar,
            persona: myProfile.persona,
            worldbook: myProfile.worldbook,
            steps: mySteps == null ? 0 : mySteps,
            isMe: true
        };

        var ranking = merged.slice();
        if (mySteps != null) ranking.push(myData);
        ranking.sort(function (a, b) { return getStepsValue(b) - getStepsValue(a); });
        lastRanking = ranking.slice();

        var champion = ranking[0];
        renderCoverChampion(champion);
        renderRanking(ranking);

        var myRank = null;
        if (mySteps != null) {
            var idx = ranking.findIndex(function (x) { return x && x.id === 'me'; });
            myRank = idx === -1 ? computeRankBySteps(ranking, mySteps) : (idx + 1);
        }
        renderFloatingBar(myData, myRank, mySteps == null);
        hideLoadingMask();
    }

    function show() {
        if (!document.getElementById('sports-leaderboard-overlay')) {
            var overlay = document.createElement('div');
            overlay.id = 'sports-leaderboard-overlay';
            overlay.className = 'sports-fullscreen-overlay';
            overlay.style.display = 'none';

            var html = '';
            html += '<div class="sports-cover-section">';
            html += '  <div class="sports-navbar">';
            html += '    <div class="sports-nav-back" id="sports-nav-back"><i class="bx bx-left-arrow-alt"></i></div>';
            html += '    <div class="sports-nav-title">运动</div>';
            html += '    <div class="sports-nav-refresh" id="sports-nav-refresh" title="刷新"><i class="bx bx-refresh"></i></div>';
            html += '  </div>';
            html += '  <div class="sports-cover-footer">';
            html += '    <div class="sports-cover-date" id="sports-cover-date"></div>';
            html += '    <div class="sports-cover-occupy">';
            html += '      <div class="sports-cover-occupy-avatar"><img id="sports-cover-occupy-avatar-img" src=""></div>';
            html += '      <div class="sports-cover-occupy-text" id="sports-cover-occupy-text"></div>';
            html += '    </div>';
            html += '  </div>';
            html += '</div>';

            html += '<div class="sports-list-section" id="sports-list-container"></div>';
            html += '<div id="sports-floating-bar" class="sports-floating-bar"></div>';
            html += '<div id="sports-toast" class="sports-toast"></div>';

            overlay.innerHTML = html;
            document.body.appendChild(overlay);
        }

        var overlayEl = document.getElementById('sports-leaderboard-overlay');
        overlayEl.style.display = 'flex';
        bindEventsOnce();

        hideLoadingMask();
        loadSeq += 1;
        var seq = loadSeq;
        loadAndRender(seq);

        var store = getAppStore();
        if (store) {
            if (typeof storeUnsub === 'function') {
                try { storeUnsub(); } catch (e0) { }
                storeUnsub = null;
            }
            var apply = function (st) {
                var btn = document.getElementById('sports-nav-refresh');
                if (!btn) return;
                btn.classList.toggle('is-loading', !!(st && st.isGeneratingSportsData));
            };
            try { apply(store.getState()); } catch (e1) { }
            storeUnsub = store.subscribe(apply);
        }

        if (dateTimer) clearInterval(dateTimer);
        dateTimer = setInterval(updateCoverDate, 60 * 1000);
    }

    function hide() {
        var overlayEl = document.getElementById('sports-leaderboard-overlay');
        if (overlayEl) overlayEl.style.display = 'none';
        if (dateTimer) {
            clearInterval(dateTimer);
            dateTimer = null;
        }
        if (typeof storeUnsub === 'function') {
            try { storeUnsub(); } catch (e0) { }
            storeUnsub = null;
        }
        hideLoadingMask();
    }

    (function init() {
        var run = function () { hideLoadingMask(); };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run);
        } else {
            run();
        }
    })();

    try {
        window.SportsDataActions = window.SportsDataActions || {};
        window.SportsDataActions.generateLeaderboardSteps = dispatchGenerateLeaderboardSteps;
        window.SportsDataActions.generateTrajectory = dispatchGenerateTrajectory;
        if (typeof window.generateSportsData !== 'function') {
            window.generateSportsData = function () {
                var contacts = getCharactersData();
                loadSeq += 1;
                var seq = loadSeq;
                return dispatchGenerateLeaderboardSteps(contacts, seq, { force: true, silent: true });
            };
        }
    } catch (e) { }

    return {
        show: show,
        hide: hide
    };
})();
