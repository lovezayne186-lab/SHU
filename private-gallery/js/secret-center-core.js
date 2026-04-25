(function (global) {
    'use strict';

    const STORAGE_KEYS = {
        roleId: 'SecretCenter_CurrentRoleId',
        roleName: 'SecretCenter_CurrentRoleName',
        fallbackRoleId: 'FangCun_CurrentRoleId',
        fallbackRoleName: 'FangCun_CurrentRole',
        profiles: 'wechat_charProfiles',
        worldBooks: 'wechat_worldbooks',
        promptDebug: 'secret_center_prompt_debug_v1',
        sceneStatus: 'secret_center_scene_status_v1',
        cachePrefix: 'secret_center_v1:',
        batchJobs: 'secret_center_batch_jobs_v1',
        batchEvents: 'secret_center_batch_events_v1'
    };

    const SCENE_META = {
        fangcun: { key: 'fangcun', label: '方寸' },
        ninan: { key: 'ninan', label: '呢喃' },
        chenfeng: { key: 'chenfeng', label: '尘封' },
        shadow_memos: { key: 'shadow_memos', label: '备忘录App' },
        shadow_diary: { key: 'shadow_diary', label: '私密日记' },
        shadow_shopping: { key: 'shadow_shopping', label: '购物记录App' },
        shadow_youtube: { key: 'shadow_youtube', label: 'YouTube' },
        shadow_appstore: { key: 'shadow_appstore', label: 'App Store' },
        shadow_settings: { key: 'shadow_settings', label: '设置' },
        shadow_food: { key: 'shadow_food', label: '外卖App' },
        shadow_game: { key: 'shadow_game', label: '游戏记录' },
        shadow_assets: { key: 'shadow_assets', label: '资产与流水' },
        shadow_health: { key: 'shadow_health', label: '运动与健康' },
        shadow_reading: { key: 'shadow_reading', label: '阅读App' },
        shadow_itinerary: { key: 'shadow_itinerary', label: '出行App' },
        shadow_work: { key: 'shadow_work', label: '工作台' },
        shadow_wechat: { key: 'shadow_wechat', label: '微信子App' },
        shadow_calls: { key: 'shadow_calls', label: '通话记录' },
        shadow_sms: { key: 'shadow_sms', label: '短信记录' },
        shadow_browser: { key: 'shadow_browser', label: '浏览器记录' },
        shadow_photos: { key: 'shadow_photos', label: '相册' }
    };

    const BATCH_ELIGIBLE_SCENES = [
        'shadow_shopping',
        'shadow_youtube',
        'shadow_appstore',
        'shadow_settings',
        'shadow_assets',
        'shadow_health',
        'shadow_food',
        'shadow_game',
        'shadow_calls',
        'shadow_sms',
        'shadow_photos',
        'shadow_memos',
        'shadow_reading',
        'shadow_work'
    ];

    const BATCH_SINGLE_ONLY_SCENES = {
        shadow_wechat: '需要结合真实聊天收藏、订阅号与关系态势做专门拼装，通用批量会降低沉浸感。',
        shadow_itinerary: '依赖世界书地点骨架、关系状态与行程蓝图，需单独推演才能保证出行逻辑稳定。',
        shadow_diary: '需要高强度私密情绪和 <scratch> 结构约束，独立生成更容易保住文风与细节。',
        shadow_browser: '会读取近期记忆并要求可点开详情，单独生成能保证检索动机与内容摘要质量。'
    };

    const QUICK_GENERATE_BUTTON_ID = 'secret-center-quick-generate-btn';
    const LOCALFORAGE_CDN_URL = '../../vendor/localforage/localforage.min.js';
    const LOCALFORAGE_DB_NAME = 'FangCunSecretCenter';
    const LOCALFORAGE_STORE_NAME = 'scene_cache_v1';
    const SCENE_CACHE_FORAGE_PREFIX = 'scene_cache::';

    const sceneCacheForageState = {
        loaderPromise: null,
        initPromise: null,
        store: null,
        memory: {},
        loading: {}
    };

    function safeParse(raw, fallback) {
        try {
            const parsed = JSON.parse(raw);
            return parsed == null ? fallback : parsed;
        } catch (e) {
            return fallback;
        }
    }

    function asObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }

    function asString(value) {
        return String(value == null ? '' : value).trim();
    }

    function clampNumber(value, min, max) {
        const num = Number(value);
        if (!Number.isFinite(num)) return min;
        return Math.min(max, Math.max(min, num));
    }

    function ensureLocalForageScript() {
        if (global.localforage && typeof global.localforage.createInstance === 'function') {
            return Promise.resolve(global.localforage);
        }
        if (!global.document || !global.document.head) return Promise.resolve(null);
        if (sceneCacheForageState.loaderPromise) return sceneCacheForageState.loaderPromise;
        sceneCacheForageState.loaderPromise = new Promise(function (resolve) {
            try {
                const existed = global.document.querySelector('script[data-secret-center-localforage="1"]');
                if (existed) {
                    existed.addEventListener('load', function () { resolve(global.localforage || null); }, { once: true });
                    existed.addEventListener('error', function () { resolve(null); }, { once: true });
                    return;
                }
                const script = global.document.createElement('script');
                script.src = LOCALFORAGE_CDN_URL;
                script.async = true;
                script.dataset.secretCenterLocalforage = '1';
                script.onload = function () { resolve(global.localforage || null); };
                script.onerror = function () { resolve(null); };
                global.document.head.appendChild(script);
            } catch (e) {
                resolve(null);
            }
        });
        return sceneCacheForageState.loaderPromise;
    }

    function ensureSceneCacheForageStore() {
        if (sceneCacheForageState.store) return Promise.resolve(sceneCacheForageState.store);
        if (sceneCacheForageState.initPromise) return sceneCacheForageState.initPromise;
        sceneCacheForageState.initPromise = ensureLocalForageScript().then(function (api) {
            if (!api || typeof api.createInstance !== 'function') return null;
            try {
                sceneCacheForageState.store = api.createInstance({
                    name: LOCALFORAGE_DB_NAME,
                    storeName: LOCALFORAGE_STORE_NAME
                });
                return sceneCacheForageState.store;
            } catch (e) {
                sceneCacheForageState.store = null;
                return null;
            }
        });
        return sceneCacheForageState.initPromise;
    }

    function readLocalStorage(key, fallback) {
        try {
            const value = global.localStorage.getItem(key);
            return value == null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function writeLocalStorage(key, value) {
        try {
            global.localStorage.setItem(key, value);
            return true;
        } catch (e) {
            return false;
        }
    }

    function compactLegacySceneCachesInLocalStorage() {
        if (!global.localStorage) return;
        let touched = 0;
        try {
            const prefix = asString(STORAGE_KEYS.cachePrefix);
            for (let i = 0; i < global.localStorage.length; i++) {
                const key = asString(global.localStorage.key(i));
                if (!key || key.indexOf(prefix) !== 0) continue;
                const raw = asString(global.localStorage.getItem(key));
                if (!raw) continue;
                const parsed = safeParse(raw, null);
                if (!parsed || typeof parsed !== 'object') continue;
                const slim = buildSceneCacheLitePayload(parsed);
                if (asString(parsed.rawResponse).length || asObject(parsed.prompts) && Object.keys(asObject(parsed.prompts)).length) {
                    global.localStorage.setItem(key, JSON.stringify(slim));
                    touched += 1;
                }
            }
        } catch (e) { }
        return touched;
    }

    function readSceneStatusStore() {
        const parsed = safeParse(readLocalStorage(STORAGE_KEYS.sceneStatus, '{}'), {});
        return asObject(parsed);
    }

    function writeSceneStatusStore(store) {
        return writeLocalStorage(STORAGE_KEYS.sceneStatus, JSON.stringify(asObject(store)));
    }

    function markSceneGenerated(roleId, scene, source) {
        const sceneKey = asString(scene);
        const rid = asString(roleId);
        if (!rid || !sceneKey || !SCENE_META[sceneKey]) return false;
        const store = readSceneStatusStore();
        const roleMap = asObject(store[rid]);
        const prev = asObject(roleMap[sceneKey]);
        roleMap[sceneKey] = Object.assign({}, prev, {
            scene: sceneKey,
            completed: true,
            completedAt: Date.now(),
            unread: true,
            source: asString(source || prev.source || 'generate')
        });
        store[rid] = roleMap;
        return writeSceneStatusStore(store);
    }

    function markSceneVisited(roleId, scene) {
        const sceneKey = asString(scene);
        const rid = asString(roleId);
        if (!rid || !sceneKey) return false;
        const store = readSceneStatusStore();
        const roleMap = asObject(store[rid]);
        const prev = asObject(roleMap[sceneKey]);
        if (!Object.keys(prev).length) return false;
        roleMap[sceneKey] = Object.assign({}, prev, {
            unread: false,
            visitedAt: Date.now()
        });
        store[rid] = roleMap;
        return writeSceneStatusStore(store);
    }

    function getSceneGenerationStatusMap(roleId) {
        const rid = asString(roleId || getSelectedRoleId());
        if (!rid) return {};
        const store = readSceneStatusStore();
        return asObject(store[rid]);
    }

    function ensureDialogStyle() {
        if (!global.document || global.document.getElementById('secret-center-dialog-style')) return;
        const style = global.document.createElement('style');
        style.id = 'secret-center-dialog-style';
        style.textContent = [
            '.secret-center-dialog-mask{position:fixed;inset:0;background:rgba(27,25,23,.42);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:24px;z-index:2147483646;}',
            '.secret-center-dialog{width:min(100%,360px);background:rgba(247,246,242,.98);border:1px solid rgba(0,0,0,.06);border-radius:22px;box-shadow:0 18px 40px rgba(30,26,22,.16);padding:22px 20px 18px;color:#33312E;}',
            '.secret-center-dialog-title{font-family:"Noto Serif SC","Songti SC",serif;font-size:18px;line-height:1.4;margin-bottom:8px;}',
            '.secret-center-dialog-message{font-size:13px;line-height:1.75;color:#5A5752;white-space:pre-wrap;word-break:break-word;}',
            '.secret-center-dialog-actions{display:flex;justify-content:flex-end;margin-top:18px;}',
            '.secret-center-dialog-btn{border:none;border-radius:999px;padding:10px 18px;background:#33312E;color:#F7F6F2;font:inherit;cursor:pointer;}'
        ].join('');
        global.document.head.appendChild(style);
    }

    function showDialog(options) {
        if (!global.document || !global.document.body) return false;
        ensureDialogStyle();
        const opts = asObject(options);
        const existing = global.document.getElementById('secret-center-dialog-mask');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        const mask = global.document.createElement('div');
        mask.id = 'secret-center-dialog-mask';
        mask.className = 'secret-center-dialog-mask';

        const dialog = global.document.createElement('div');
        dialog.className = 'secret-center-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');

        const title = global.document.createElement('div');
        title.className = 'secret-center-dialog-title';
        title.textContent = asString(opts.title || '提示');

        const message = global.document.createElement('div');
        message.className = 'secret-center-dialog-message';
        message.textContent = asString(opts.message || '');

        const actions = global.document.createElement('div');
        actions.className = 'secret-center-dialog-actions';

        const confirm = global.document.createElement('button');
        confirm.type = 'button';
        confirm.className = 'secret-center-dialog-btn';
        confirm.textContent = asString(opts.confirmText || '我知道了');

        function close() {
            if (mask.parentNode) mask.parentNode.removeChild(mask);
        }

        confirm.addEventListener('click', close);
        mask.addEventListener('click', function (event) {
            if (event.target === mask) close();
        });

        actions.appendChild(confirm);
        dialog.appendChild(title);
        dialog.appendChild(message);
        dialog.appendChild(actions);
        mask.appendChild(dialog);
        global.document.body.appendChild(mask);
        return true;
    }

    function showGenerationErrorDialog(message, sceneLabel) {
        const reason = asString(message || '');
        const label = asString(sceneLabel || '当前页面');
        return showDialog({
            title: label + '生成失败',
            message: reason || '本次生成没有返回可用内容，请重新尝试。'
        });
    }

    function getParentWindow() {
        try {
            if (global.parent && global.parent !== global) return global.parent;
        } catch (e) { }
        return global;
    }

    function getSceneLabel(scene) {
        const key = asString(scene);
        return asString(SCENE_META[key] && SCENE_META[key].label) || key;
    }

    function readParentLocalStorage(parentWindow, key, fallback) {
        try {
            const value = parentWindow.localStorage.getItem(key);
            return value == null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function writeParentLocalStorage(parentWindow, key, value) {
        try {
            parentWindow.localStorage.setItem(key, value);
            return true;
        } catch (e) {
            return false;
        }
    }

    function readBatchJobsStore(parentWindow) {
        return asObject(safeParse(readParentLocalStorage(parentWindow, STORAGE_KEYS.batchJobs, '{}'), {}));
    }

    function writeBatchJobsStore(parentWindow, jobs) {
        return writeParentLocalStorage(parentWindow, STORAGE_KEYS.batchJobs, JSON.stringify(asObject(jobs)));
    }

    function readBatchEventsStore(parentWindow) {
        const parsed = safeParse(readParentLocalStorage(parentWindow, STORAGE_KEYS.batchEvents, '[]'), []);
        return Array.isArray(parsed) ? parsed : [];
    }

    function writeBatchEventsStore(parentWindow, events) {
        return writeParentLocalStorage(parentWindow, STORAGE_KEYS.batchEvents, JSON.stringify(Array.isArray(events) ? events : []));
    }

    function enqueueBatchEvent(parentWindow, payload) {
        const events = readBatchEventsStore(parentWindow);
        const item = asObject(payload);
        item.id = asString(item.id) || ('evt_' + String(Date.now()) + '_' + Math.random().toString(36).slice(2, 8));
        item.createdAt = Number(item.createdAt) || Date.now();
        events.push(item);
        writeBatchEventsStore(parentWindow, events.slice(-40));
        return item;
    }

    function popBatchEvent() {
        const parentWindow = getParentWindow();
        const events = readBatchEventsStore(parentWindow);
        if (!events.length) return null;
        const event = asObject(events.shift());
        writeBatchEventsStore(parentWindow, events);
        return event;
    }

    function ensureParentBatchHost() {
        const parentWindow = getParentWindow();
        if (!parentWindow || typeof parentWindow.callAI !== 'function') return null;
        if (parentWindow.__SecretCenterBatchHost && typeof parentWindow.__SecretCenterBatchHost.startJob === 'function') {
            return parentWindow.__SecretCenterBatchHost;
        }

        const host = {
            jobs: readBatchJobsStore(parentWindow),
            saveJobs: function () {
                writeBatchJobsStore(parentWindow, this.jobs);
            },
            getJob: function (jobId) {
                return asObject(this.jobs[asString(jobId)]);
            },
            updateJob: function (jobId, patch) {
                const id = asString(jobId);
                if (!id) return null;
                const next = Object.assign({}, asObject(this.jobs[id]), asObject(patch));
                this.jobs[id] = next;
                this.saveJobs();
                return next;
            },
            startJob: function (payload) {
                const req = asObject(payload);
                const roleId = asString(req.roleId);
                const scenes = Array.isArray(req.scenes) ? req.scenes.map(asString).filter(Boolean) : [];
                const systemPrompt = asString(req.systemPrompt);
                const userMessage = asString(req.userMessage);
                if (!roleId) return { ok: false, error: '缺少角色 ID，无法开始批量生成。' };
                if (!scenes.length) return { ok: false, error: '至少需要选择 1 个场景。' };
                if (!systemPrompt) return { ok: false, error: '系统提示词为空，无法开始批量生成。' };

                const jobId = 'sc_batch_' + String(Date.now()) + '_' + Math.random().toString(36).slice(2, 8);
                const prevRoleId = asString(parentWindow.currentChatRole || '');
                const job = {
                    id: jobId,
                    roleId: roleId,
                    roleName: asString(req.roleName),
                    scenes: scenes.slice(0, 32),
                    status: 'running',
                    createdAt: Date.now(),
                    startedAt: Date.now(),
                    source: asString(req.source || 'unknown'),
                    requestOptions: asObject(req.requestOptions),
                    force: req.force === true
                };
                this.jobs[jobId] = job;
                this.saveJobs();
                enqueueBatchEvent(parentWindow, {
                    jobId: jobId,
                    type: 'started',
                    roleId: roleId,
                    scenes: scenes
                });

                try { parentWindow.currentChatRole = roleId; } catch (e) { }
                const self = this;
                function finalizeSuccess(content) {
                    try { parentWindow.currentChatRole = prevRoleId; } catch (e) { }
                    self.updateJob(jobId, {
                        status: 'success',
                        finishedAt: Date.now(),
                        rawResponse: toText(content)
                    });
                    enqueueBatchEvent(parentWindow, {
                        jobId: jobId,
                        type: 'success',
                        roleId: roleId,
                        scenes: scenes
                    });
                }
                function finalizeError(error) {
                    try { parentWindow.currentChatRole = prevRoleId; } catch (e) { }
                    const message = asString(error) || '模型请求失败';
                    self.updateJob(jobId, {
                        status: 'error',
                        finishedAt: Date.now(),
                        error: message
                    });
                    enqueueBatchEvent(parentWindow, {
                        jobId: jobId,
                        type: 'error',
                        roleId: roleId,
                        scenes: scenes,
                        error: message
                    });
                }

                try {
                    parentWindow.callAI(
                        systemPrompt,
                        [],
                        userMessage,
                        function (content) {
                            finalizeSuccess(content);
                        },
                        function (error) {
                            finalizeError(error);
                        },
                        Object.assign({
                            temperature: 0.72,
                            maxTokens: 7200
                        }, asObject(req.requestOptions))
                    );
                } catch (error) {
                    finalizeError(error && error.message ? error.message : error);
                    return { ok: false, error: asString(error && error.message ? error.message : error) || '批量任务启动失败' };
                }
                return { ok: true, jobId: jobId };
            }
        };

        parentWindow.__SecretCenterBatchHost = host;
        return host;
    }

    function readProfiles() {
        const parentWindow = getParentWindow();
        try {
            if (parentWindow.charProfiles && typeof parentWindow.charProfiles === 'object') {
                return parentWindow.charProfiles;
            }
        } catch (e) { }
        return asObject(safeParse(readLocalStorage(STORAGE_KEYS.profiles, '{}'), {}));
    }

    function readWorldBooks() {
        const parentWindow = getParentWindow();
        try {
            if (parentWindow.worldBooks && typeof parentWindow.worldBooks === 'object') {
                return parentWindow.worldBooks;
            }
        } catch (e) { }
        return asObject(safeParse(readLocalStorage(STORAGE_KEYS.worldBooks, '{}'), {}));
    }

    function normalizeWorldBookIds(input) {
        if (input == null) return [];
        const rawList = Array.isArray(input) ? input : [input];
        const result = [];
        for (let i = 0; i < rawList.length; i++) {
            const text = asString(rawList[i]);
            if (!text) continue;
            if (result.indexOf(text) === -1) result.push(text);
        }
        return result;
    }

    function resolveRoleName(profile, fallbackId) {
        const p = asObject(profile);
        return asString(p.remark || p.nickName || p.name || fallbackId || '未知角色');
    }

    function resolvePersonaText(profile) {
        const p = asObject(profile);
        return asString(p.desc || p.persona || p.description || p.prompt || p.personality || p.character || '');
    }

    function buildWorldBookText(profile) {
        const p = asObject(profile);
        const worldbookIds = normalizeWorldBookIds(p.worldbookId || p.worldbookIds || p.worldBookIds || p.world_book_ids);
        if (!worldbookIds.length) return '';

        const parentWindow = getParentWindow();
        try {
            if (typeof parentWindow.buildWorldBookPrompt === 'function') {
                return asString(parentWindow.buildWorldBookPrompt(worldbookIds));
            }
        } catch (e) { }

        const worldBooks = readWorldBooks();
        const chunks = [];
        for (let i = 0; i < worldbookIds.length; i++) {
            const wbId = worldbookIds[i];
            if (!wbId) continue;
            const book = worldBooks[wbId];
            if (!book || typeof book !== 'object') continue;
            const title = asString(book.title || wbId);
            const content = asString(book.content || '');
            if (!content) continue;
            chunks.push('【' + title + '】\n' + content);
        }
        return chunks.join('\n\n');
    }

    function getSelectedRoleId() {
        const primary = asString(readLocalStorage(STORAGE_KEYS.roleId, ''));
        if (primary) return primary;
        return asString(readLocalStorage(STORAGE_KEYS.fallbackRoleId, ''));
    }

    function getSelectedRoleName() {
        const primary = asString(readLocalStorage(STORAGE_KEYS.roleName, ''));
        if (primary) return primary;
        return asString(readLocalStorage(STORAGE_KEYS.fallbackRoleName, ''));
    }

    function writeSelectedRole(roleId, roleName) {
        const rid = asString(roleId);
        const rname = asString(roleName);
        if (!rid) return false;
        writeLocalStorage(STORAGE_KEYS.roleId, rid);
        writeLocalStorage(STORAGE_KEYS.fallbackRoleId, rid);
        if (rname) {
            writeLocalStorage(STORAGE_KEYS.roleName, rname);
            writeLocalStorage(STORAGE_KEYS.fallbackRoleName, rname);
        }
        return true;
    }

    function resolveRoleContext(inputRoleId) {
        const rid = asString(inputRoleId || getSelectedRoleId());
        if (!rid) {
            return { ok: false, error: '请先在「叩门」页面选择角色。', roleId: '' };
        }
        const profiles = readProfiles();
        const profile = asObject(profiles[rid]);
        if (!profile || !Object.keys(profile).length) {
            return { ok: false, error: '未找到该角色资料，请重新选择角色。', roleId: rid };
        }
        const roleName = resolveRoleName(profile, rid) || getSelectedRoleName() || rid;
        const personaText = resolvePersonaText(profile);
        const worldBookText = buildWorldBookText(profile);
        const contextSummary = [
            '【角色ID】' + rid,
            '【角色名】' + roleName,
            personaText ? ('【角色人设】\n' + personaText) : '【角色人设】未填写',
            worldBookText ? ('【世界书背景】\n' + worldBookText) : '【世界书背景】未关联'
        ].join('\n\n');
        return {
            ok: true,
            roleId: rid,
            roleName: roleName,
            profile: profile,
            personaText: personaText,
            worldBookText: worldBookText,
            contextSummary: contextSummary
        };
    }

    function buildBasePrompt(context) {
        return [
            '你是「侧影」APP 的内容导演，不是即时聊天机器人。',
            '你的任务是根据角色人设与世界书背景，生成该角色的内在生活片段。',
            '输出必须是单个 JSON 对象，不要 Markdown，不要代码块，不要解释。',
            '必须与角色长期设定一致，禁止跳出人设，禁止输出系统说明。',
            context.contextSummary
        ].join('\n\n');
    }

    function buildScenePrompt(scene, context) {
        if (scene === 'fangcun') {
            return [
                '场景：方寸（角色手机）。请生成角色手机中的私密内容侧写。',
                '输出 JSON Schema：',
                '{',
                '  "phoneProfile": {"theme":"", "motto":"", "todayFocus":""},',
                '  "apps": [{"name":"", "label":"", "note":""}],',
                '  "notes": ["", "", ""],',
                '  "drafts": ["", ""],',
                '  "albumCaptions": ["", "", ""]',
                '}',
                '要求：apps 4-8 条；文字自然、克制、符合角色气质。'
            ].join('\n');
        }
        if (scene === 'ninan') {
            return [
                '你现在是一个“梦境生成器”。请读取角色的人设、世界书背景、用户信息以及带日期的近期交互记忆，为他生成最近几天的睡眠记录。',
                '要求：',
                '1) dreams 必须覆盖最近 7 天（用 MM-DD），其中 4-6 天 hasDream=true，剩余天数允许无梦。',
                '2) 有梦时，content 必须在 100-200 字之间。文风要诗意、超现实、碎片化，像真实梦境混杂现实记忆和荒诞幻想，不要平铺直叙。',
                '3) 无梦时，content 只写简短状态，如“深潜期。无梦境信号。”或“一片黑色的死寂。”',
                '4) 结合逐日聊天记忆来写当日梦境线索，梦里可映射当天情绪、对话残片、地点或未说出口的执念。',
                '5) 每一天都必须输出一句当日梦话 sleepTalk（放在每个 dreams 项里），简短、呢喃、带脆弱感或执念。',
                '输出 JSON 格式：',
                '{',
                '  "dreams": [',
                '    { "date": "10-24", "hasDream": true, "content": "梦境的具体描述...", "sleepTalk":"别走..." }',
                '  ]',
                '}',
                '必须直接输出 JSON 对象，不要额外解释。'
            ].join('\n');
        }
        if (scene === 'chenfeng') {
            return [
                '你是一个“记忆解密者”与“小说家”。请深度读取角色的人设经历和世界观背景，挖掘出【在遇到User之前】的三个极其重要或充满隐喻的过往事件。',
                '要求：',
                '1. 必须是遇到User之前发生的事，重点展现角色的性格成因、执念、创伤或高光时刻。',
                '2. 格式化时间点：如果背景故事有明确年份，请写明年份；如果没有，请推算并使用“XX岁”作为时间节点。',
                '3. 文风要求：极度文艺、像高质量小说的片段。要有丰富的细节、动作、环境描写和心理活动，不要流水账！要有电影镜头感。',
                '4. 字数要求：由于是长篇回忆，整体字数必须【不少于800字】，每个事件的篇幅要饱满详细。',
                '输出 JSON 格式：',
                '{',
                '  "memories": [',
                '    {',
                '      "time": "17岁 或 2018年秋",',
                '      "title": "事件的文艺化标题(如：雨中的废弃站台)",',
                '      "content": "详细的小说级片段描写，支持换行符\\n..."',
                '    }',
                '  ]',
                '}',
                '必须生成 3 个事件，且只输出 JSON 对象，不要额外解释。'
            ].join('\n');
        }
        if (scene === 'shadow_memos') {
            const pack = buildShadowWechatContextPack(context);
            const extraBlocks = [];
            if (pack.userInfoText) extraBlocks.push('【用户信息】\n' + pack.userInfoText);
            if (pack.memoryText) extraBlocks.push('【近期记忆】\n' + pack.memoryText);
            return [
                '场景：备忘录App（角色私密备忘录）。',
                '你需要结合角色人设、职业及【近期记忆/用户信息】，生成一组像真实手机里会留下的备忘录内容。',
                '优先生成 tasks、userdata、gifts、drafts、reflections 这 5 个分区；如果某个分区信息不足，可以少写，但至少保证 3 个分区有内容。',
                '每个分区尽量写 2-4 条事项；如果某条实在想不到 thought，可以留空，不要为了凑格式乱编。',
                '输出 JSON 格式：',
                '{',
                '  "sections": [',
                '    { "type": "tasks", "title": "待办事项", "items": [{"text": "任务", "isDone": true, "isPriority": false, "thought": "内心OS"}] },',
                '    { "type": "userdata", "title": "关于她的记录", "items": [{"label": "维度", "value": "具体数据或待了解", "thought": "内心OS"}] },',
                '    { "type": "gifts", "title": "礼物计划", "items": [{"name": "礼物名", "thought": "为什么要送这个/准备进度"}] },',
                '    { "type": "drafts", "title": "草稿箱", "items": [{"deletedLines": ["删掉的话"], "finalText": "留下的内容", "thought": "当时的纠结"}] },',
                '    { "type": "reflections", "title": "灵感与感悟", "items": [{"content": "随笔/职业灵感/游戏进度", "thought": "补充想法"}] }',
                '  ]',
                '}',
                '分区逻辑说明：',
                '1) tasks: 优先包含职业相关的已完成工作和与用户相关的待办（isPriority:true）。',
                '2) userdata: 可以包含鞋码、指围、过敏原、身体情况（如生理期、畏寒、低血压）。优先读取记忆；没提到的可以写“待了解...”或“猜测是...”，体现暗中观察。',
                '3) gifts: 针对用户的喜好或近期聊天提到的东西制定的赠送计划。',
                '4) drafts: 那些想发不敢发、反复修改的文字碎片。',
                '5) reflections: 尽量符合职业。总裁写行业看法，学生写选课/论文压力，歌手写乐句灵感。',
                '6) thought 要尽量符合角色性格（傲娇、温柔、冷静、偏执等），但不要为了凑字数写得太满。'
            ].concat(extraBlocks).join('\n');
        }
        if (scene === 'shadow_diary') {
            return [
                '场景：私密日记（角色绝对私密的内心独白，不加掩饰的真实想法）。',
                '结合角色人设、近期记忆/聊天记录，写一篇约 220 到 320 字的日记。',
                '输出 JSON 格式：',
                '{',
                '  "date": "10月24日",',
                '  "weather": "天气(如 阴雨/晴)",',
                '  "mood": "心情(如 烦躁/平静)",',
                '  "content": "日记正文，支持换行符\\n"',
                '}',
                '写作约束：',
                '1) 语气要真实、私密，允许克制、偏执、想念、占有欲、烦躁、不安等情绪，但不要写成夸张小说腔。',
                '2) 如果近期有聊天记忆，要自然结合今天发生的事或聊天内容；如果近期断联或很久没被理，可以表现出失落、烦躁、思念或自我拉扯。',
                '3) 优先在正文里包含 2-3 处 <scratch>涂黑的文字</scratch>，代表写下又不敢承认、或者过于羞耻/黑暗的想法。',
                '4) date、weather、mood 尽量填写；如果拿不准也要给出自然、生活化的写法。',
                '5) 只写角色自己的内心，不要输出系统解释。'
            ].join('\n');
        }
        if (scene === 'shadow_reading') {
            return [
                '场景：阅读App（角色私密阅读记录）。',
                '你需要结合角色人设和世界书，推演出 3-5 本该角色最近正在看、看过或反复翻看的书。',
                '必须输出一个 JSON 对象，不要额外解释。',
                '输出 JSON Schema：',
                '{',
                '  "books": [',
                '    {',
                '      "title":"封面短标题",',
                '      "fullTitle":"完整书名",',
                '      "author":"作者名",',
                '      "color":"#3E4348",',
                '      "progress":"45%",',
                '      "highlights": [',
                '        {"quote":"一句摘录式划线", "note":"角色对这句话的私人感想"}',
                '      ]',
                '    }',
                '  ]',
                '}',
                '硬性约束：',
                '1) books 必须 3-5 本。',
                '2) 所有书名和作者都必须是现实世界中真实存在、已出版过的作品与作者，绝对禁止虚构、拼接、杜撰书名，绝对禁止写“某某手记/随笔集/训练手册/未知作者”这类占位内容。',
                '3) 如果你不确定一本书是否真实存在，就不要生成它；宁可选择更常见、更确定的真实出版物。',
                '4) 书单必须强烈贴合角色身份、阶层、教育程度、职业压力和世界背景，不能是网文式万能书单。',
                '5) 至少 1 本体现专业能力或工作需求，至少 1 本暴露角色的隐秘兴趣或精神状态。',
                '6) 每本书都必须有 progress，格式必须是百分比字符串，如 12%、45%、88%。不同书的进度要拉开差异。',
                '7) 每本书都必须有 2-3 条 highlights；每条包含一句摘录式划线和角色的私人感想。note 要像他真的在书页旁留下的批注，克制、具体、符合人设。',
                '8) note 不要写用户相关内容，不要出现“你/我和你/她看到我”等关系向台词，只围绕角色本人。',
                '9) color 必须是有效的十六进制颜色，适合书封气质。',
                '10) 整体要像真实阅读记录，不要写成推荐书单简介。'
            ].join('\n');
        }
        if (scene === 'shadow_itinerary') {
            return [
                '场景：出行App（角色私密出行档案）。',
                '你需要结合角色人设、世界背景与近期聊天，推演出符合逻辑的近期出行票根/行程单。',
                '必须直接输出 JSON 对象，不要额外解释。',
                '输出 JSON Schema：',
                '{',
                '  "tickets":[',
                '    {',
                '      "type":"flight|train|car|taxi|subway|bus|bike",',
                '      "id":"航班号/高铁号/车牌号(如京A·88888)或行程单号",',
                '      "date":"OCT 24",',
                '      "from":{"city":"城市名/城邦名","time":"06:15","station":"具体区/详细地址/机场车站"},',
                '      "to":{"city":"城市名/城邦名","time":"08:55","station":"具体区/详细地址/机场车站"},',
                '      "duration":"2h 40m 或 45m",',
                '      "class":"舱位/座位等级/车型级别(如 专车/商务车/SUV)",',
                '      "seat":"座位号(如 07A) 或 驾乘位置(如 主驾/副驾/后排)",',
                '      "price":"花费金额(如 ¥1,280 或 ¥45)",',
                '      "vehicleInfo":"具体载具信息(如 波音777、迈巴赫S480、滴滴专车)",',
                '      "status":"Upcoming|Completed",',
                '      "companion":"和谁同行或为谁预留",',
                '      "purpose":"行程目的",',
                '      "note":"乘车/候机时的真实心理活动"',
                '    }',
                '  ]',
                '}',
                '硬性约束：',
                '1) 必须生成 3-4 张票根，其中至少 1 张 Completed，至少 1 张 Upcoming，根据聊天语境灵活分配比例。',
                '2) 长途跨城使用 flight(航班) 或 train(高铁)，短途同城使用 car(开车)、taxi(打车)、subway(地铁)、bus(公交) 或 bike(骑行)，必须符合角色阶层与经济水平。',
                '3) 未来票根优先体现双人行程。如果开车，seat 写“主驾/副驾”；如果打车，seat 写“后排并排”；地铁/公交写“并排站立”；骑行写“并排骑行”或不写。',
                '4) 地点优先使用系统给定的“骨架推荐”。如果骨架不适用或世界书地点不足，必须自行生成合理的生活化地点名（如街区/港口/医院/园区/楼宇等），不要重复使用同一个模板地名。',
                '5) city 只写城市/城邦/区域名；station 才写具体地点。UI 会把同城票的 station 放在上排、city 放在下排，所以同城时 from.city 与 to.city 必须相同，from.station 与 to.station 必须不同。',
                '6) purpose/note 必须和路线吻合：写接人下班，就从角色工作地/学校/医院/片场到用户住处；写送用户回家，就到用户家/公寓楼下；写上班/开会，就从住处到公司/会场；只有接机、送站、赶车、跨城交通时才使用机场/车站。',
                '7) price(金额) 和 vehicleInfo(载具信息) 必须极度符合角色阶层。如果是开车(car)，vehicleInfo 必须写具体的汽车品牌型号(如 迈巴赫S480、保时捷卡宴等)，绝对禁止只写“私人座驾”，同时 id 必须写虚拟车牌号。',
                '8) note 语气 100% 符合人设，不要写成小说。'
            ].join('\n');
        }
        if (scene === 'shadow_shopping') {
            return [
                '场景：购物记录App（展示角色真实消费轨迹）。',
                '请结合角色职业、人设与财力，生成三个分栏数据：购物车、足迹、最近订单。',
                '输出 JSON：',
                '{',
                '  "cart":[{"name":"商品名","price":"金额","category":"分类","note":"为什么想买"}],',
                '  "footprints":[{"name":"浏览过的商品","price":"金额","category":"分类","note":"浏览原因"}],',
                '  "orders":[{"date":"月/日","name":"展示商品名","price":"金额","status":"状态(运输中/已签收)","category":"分类","thought":"购买时的一句真实想法","isSecret":false,"maskedName":"私密时展示名","realName":"解锁后真实商品名"}]',
                '}',
                '要求：',
                '1) cart、footprints、orders 各生成 3-5 条，尽量像真实电商记录，不写空泛文案。',
                '2) 最近订单中至少 1 条和用户有关（礼物、共同生活用品等）。',
                '3) 最近订单中至少 1 条 isSecret:true；私密订单的 maskedName 要克制，realName 必须给出可解锁查看的真实物品名。',
                '4) 不要输出额外解释，只输出 JSON 对象。'
            ].join('\n');
        }
        if (scene === 'shadow_youtube') {
            return [
                '场景：YouTube 播放历史与推荐。',
                '输出 JSON：',
                '{',
                '  "videos":[',
                '    {"title":"视频标题","titleZh":"英文标题对应中文翻译(中文标题可留空)","channel":"频道名","progress":"进度(如 80%)","time":"观看时间","type":"history/recommend","description":"可滚动查看的文字版内容摘要"}',
                '  ]',
                '}',
                '要求：',
                '1) 生成 5-8 条，history 与 recommend 都要有。',
                '2) title 是英文时，titleZh 必须填写中文翻译；title 是中文时 titleZh 可留空字符串。',
                '3) 每条都要给 description，内容像“视频主要观点/内容文字版”，2-4 句即可。',
                '4) 至少包含职业相关学习内容，且至少 1 条体现与用户近期聊天/搜索相关的推荐。',
                '5) 只输出 JSON，不要解释。'
            ].join('\n');
        }
        if (scene === 'shadow_appstore') {
            return [
                '场景：App Store（已购项目）。',
                '输出 JSON：{ "installed": [{"name":"App名","desc":"简介"}], "uninstalled": [{"name":"App名","date":"卸载日期","reason":"角色内心的一句OS(为什么删)"}] }',
                '要求：',
                '1) installed 必须恰好 10 条，uninstalled 3-6 条。',
                '2) 卸载记录是重点，reason 必须像角色的真实内心 OS，不要写成官方解释。',
                '3) App 名称尽量真实生活化，贴合角色职业与习惯。',
                '4) 只输出 JSON，不要解释。'
            ].join('\n');
        }
        if (scene === 'shadow_settings') {
            return [
                '场景：iOS 风格系统设置。',
                '输出 JSON：',
                '{',
                '  "account": { "name": "真实姓名/昵称", "id": "邮箱/ID" },',
                '  "connectivity": {',
                '    "wifi": "WiFi名称",',
                '    "bluetooth": ["已连接设备A","设备B"],',
                '    "devices": {"phone":"手机品牌与型号","computer":"电脑品牌与型号","earphones":"耳机品牌与型号","tv":"电视品牌与型号"}',
                '  },',
                '  "screenTime": {',
                '    "total": "6小时34分钟",',
                '    "compare": "今天比昨天少26分钟",',
                '    "weeklyTotal": "本周总时长",',
                '    "weeklyCompare": "本周与上周对比",',
                '    "topApps": [{"name":"App","time":"时长"}],',
                '    "categories": [{"name":"实用工具","time":"1小时49分钟","color":"#4A8BFF"}],',
                '    "hourly": [12, 18, 0, 0, 5, 0, 10, 0, 22, 38, 31, 25, 29, 34, 20, 15, 18, 32, 40, 36, 30, 22, 10, 6],',
                '    "weekly": [{"day":"周一","minutes":312},{"day":"周二","minutes":285}]',
                '  },',
                '  "storage": {',
                '    "used": "419GB",',
                '    "total": "512GB",',
                '    "details": "占用最多的是什么",',
                '    "breakdown": [{"name":"应用","size":"320GB","color":"#4253FF"},{"name":"图片","size":"22.1GB","color":"#1A8BFF"}],',
                '    "apps": [{"name":"微信","size":"16.2GB"},{"name":"方寸","size":"8.4GB"}],',
                '    "documents": [{"name":"合同终版.pdf","size":"18MB","updatedAt":"昨天 23:18"}]',
                '  },',
                '  "battery": { "level": "百分比", "state": "充电中/使用中" },',
                '  "focusMode": "当前专注模式(如：勿扰/工作/思念中)"',
                '}',
                '要求：',
                '1) WiFi 名称要体现环境和角色身份。',
                '2) 屏幕使用时间里，若角色在意用户，则方寸/微信类 app 占比要明显更高。',
                '3) 设备品牌要具体真实，像 iPhone 15 Pro、MacBook Pro、AirPods Pro、Sony BRAVIA 这样自然。',
                '4) 文档列表可以适度虚构，但要贴合角色职业与日常，不要写成随机乱码文件。',
                '5) 细节要生活化，不要写成模板化参数表。',
                '6) 屏幕使用时间(topApps)和储存空间占用(apps, documents)的数据必须详细丰富，分别至少提供6-8个具体应用或文件，各项时间/空间总和应与total值匹配，展现真实的数字生活细节。',
                '7) 只输出 JSON，不要解释。'
            ].join('\n');
        }
        if (scene === 'shadow_assets') {
            return [
                '场景：角色的手机银行/数字钱包。',
                '输出 JSON 格式：',
                '{',
                '  "totalBalance": "总资产(格式如 1,200,000.00 或 142.50)",',
                '  "cards": [',
                '    {',
                '      "bank": "银行名",',
                '      "type": "卡类型",',
                '      "last4": "尾号",',
                '      "balance": "余额",',
                '      "theme": "black|blue|gold|red",',
                '      "transactions": [',
                '        { "date": "04-10 14:30", "title": "交易方/事由", "amount": "-48.00 或 86000.00", "status": "交易成功/处理中" }',
                '      ]',
                '    }',
                '  ]',
                '  "transactions": [ { "date": "04-10 14:30", "title": "交易方/事由", "amount": "-48.00", "status": "交易成功" } ]',
                '}',
                '要求：',
                '1) 生成 2-3 张银行卡，包含开户行、余额和卡片等级。',
                '2) 每张卡尽量自带 4-6 条对应流水；切换不同卡时，流水风格要明显不同。',
                '3) 流水必须符合角色人设，可以包含工资、分红、网购、外卖、转账、咨询费、订阅扣费等。',
                '4) 某些卡可以偏收入或商务用途，某些卡可以偏日常支出，形成层次。',
                '5) 只输出 JSON，不要解释。'
            ].join('\n');
        }
        if (scene === 'shadow_health') {
            return [
                '场景：角色的健康与运动监测 App（如 Apple Health）。',
                '输出 JSON 格式：',
                '{',
                '  "overview": { "steps": "步数", "calories": "卡路里" },',
                '  "sleep": {',
                '    "duration": "时长(如 3h 15m)",',
                '    "bedTime": "入睡时间",',
                '    "wakeTime": "醒来时间",',
                '    "quality": "质量评价",',
                '    "note": "状态描述或建议",',
                '    "score": "睡眠评分(如 72)",',
                '    "deep": "深睡时长",',
                '    "light": "浅睡时长",',
                '    "rem": "快速眼动时长",',
                '    "awake": "清醒时长或醒来次数"',
                '  },',
                '  "workouts": [ { "type": "运动类型", "time": "发生时间", "duration": "时长", "burn": "消耗" } ],',
                '  "heartRate": { "avg": "平均心率", "max": "最高心率", "anomaly": "心率异常时间及描述" }',
                '}',
                '要求：',
                '1) 必须包含当天的步数和卡路里。',
                '2) 睡眠是重点，要详细到深睡、浅睡、快速眼动、清醒时间，并给出整体评分。',
                '3) 运动记录要符合角色体能和作息，没有运动时也可以自然写成空或极少。',
                '4) 心率异常是重点，给出一条最近的异常描述，能让人感受到情绪或身体波动。',
                '5) 只输出 JSON，不要解释。'
            ].join('\n');
        }
        if (scene === 'shadow_food') {
            return [
                '场景：外卖App订单历史。',
                '输出 JSON：{ "orders": [{"date":"时间","shop":"店名","items":"菜品","price":"金额","thought":"点单时的内心想法","relatedToUser":true}] }',
                '要求：',
                '1) 生成 4-6 条订单，不要生成订单备注 note。',
                '2) 每条都要有 thought，像角色当时下单瞬间的简短心声。',
                '3) 大约 20% 的订单要和用户有关，比如替用户点、给用户带、或用户给角色点过。',
                '4) 店名、菜品、金额都要生活化，不要模板化。',
                '5) 如果近期没理用户，订单里可以自然出现一人食、深夜酒类、烧烤或安静的宵夜。',
                '4) 只输出 JSON，不要解释。'
            ].join('\n');
        }
        if (scene === 'shadow_game') {
            return [
                '场景：角色的游戏应用与游玩记录侧写。',
                '输出 JSON 格式：',
                '{',
                '  "games": [',
                '    {',
                '      "name": "真实游戏名",',
                '      "platform": "平台名称(Mobile / Steam / Switch / PS5)",',
                '      "icon": "可用简短 emoji 或符号表示",',
                '      "totalHours": "总时长(如 1200小时 或 45小时)",',
                '      "lastOnline": "最后上线时间(如 昨天凌晨3点)",',
                '      "recentSessions": [',
                '        { "time": "游玩时间(如 周五 23:00)", "duration": "游玩时长(如 2小时)", "result": "战绩或进度(如 排位3连跪 / 击败XXBoss / 挂机发呆)" }',
                '      ]',
                '    }',
                '  ]',
                '}',
                '要求：',
                '1) 游戏必须是现实中真实存在的知名游戏，绝不能捏造。',
                '2) 必须符合人设与年龄层。高压角色可以很少玩，但不要写成完全空白。',
                '3) 生成 2-3 款游戏；每款尽量附 2-4 条 recentSessions。',
                '4) 只输出 JSON，不要解释。'
            ].join('\n');
        }
        if (scene === 'shadow_calls') {
            return [
                '场景：角色的手机通话记录 (Recents)。',
                '要求：',
                '1. 生成 6-8 条最近的通话记录。',
                '2. 字段：name(联系人或号码)、time(如"昨天 23:14")、type(呼入/呼出/未接/拒接)、duration(时长)、detail(通话内容摘要)。',
                '3. 【核心看点(detail)】：用一段话描述这通电话具体讲了什么、氛围如何，信息量要足。',
                '4. 如果是未接/拒接，type 必须写成“未接(3次)”或“拒接(2次)”这类格式，括号里明确来电次数。',
                '输出 JSON：{ "calls": [ {"name":"联系人","time":"时间","type":"呼入/呼出/未接(2次)/拒接(3次)","duration":"时长","detail":"通话内容摘要及氛围"} ] }',
                '只输出 JSON，不要解释。'
            ].join('\n');
        }
        if (scene === 'shadow_sms') {
            return [
                '场景：角色的短信收件箱 (SMS)。',
                '要求：',
                '1. 生成 5-7 个短信对话线程。',
                '2. 现代人很少用短信聊天，短信通常是：验证码、系统通知、快递、银行流水，或被拉黑后的长篇纠缠。',
                '3. 每个线程包含：sender、time、isUnread、messages。',
                '4. messages 里 from 只能是“对方”或“自己”，并包含 content、time。',
                '5. 【核心看点】：体现人物状态。验证码线程通常只有“对方”；情绪线程可出现“对方连发多条、自己少回或不回”。',
                '输出 JSON：',
                '{',
                '  "threads": [',
                '    {',
                '      "sender":"发件人",',
                '      "time":"最后时间",',
                '      "isUnread": true/false,',
                '      "messages":[ { "from":"对方/自己", "content":"短信内容", "time":"时间" } ]',
                '    }',
                '  ]',
                '}',
                '只输出 JSON，不要解释。'
            ].join('\n');
        }
        if (scene === 'shadow_browser') {
            return [
                '场景：角色的手机浏览器搜索/浏览历史。',
                '要求：',
                '1. 生成 6-8 条最近的浏览器历史记录。',
                '2. 必须包含至少1-2条【无痕浏览 (Incognito)】的记录，用以体现他不想被人知道的秘密。',
                '3. 【核心看点】：搜索记录是最诚实的内心独白。比如傲娇男在搜“怎么自然地向人道歉”；霸道总裁在搜“送XX什么样的礼物不显得刻意”；阴暗冷酷的角色在搜“某些精神类药物的副作用”或者“如何无痛地处理伤口”。',
                '4. 必须参考【近期记忆】与【用户信息】来生成搜索内容，至少 2 条与近期互动直接相关。',
                '输出 JSON 格式：',
                '{',
                '  "history": [',
                '    {',
                '      "time": "时间(如 昨天 03:14)",',
                '      "query": "搜索词或网页标题",',
                '      "isIncognito": true/false (布尔值),',
                '      "detail": "点开后可查看的网页/推文详情文字（40-120字）"',
                '    }',
                '  ]',
                '}',
                '只输出 JSON，不要解释。'
            ].join('\n');
        }
        if (scene === 'shadow_photos') {
            return [
                '场景：角色的手机相册。因为无法显示图片，我们将以【相册分区+文字化影像描述】形式呈现。',
                '要求：',
                '1. 必须输出 3 个主分区：camera(相机)、videos(视频)、screenshots(屏幕截图)。每个分区都生成 4-6 条。',
                '2. 每条字段：date、location、description、isHidden、aboutUser。',
                '3. videos 里的每条必须额外带 duration 和 title，点击后可展示文字版视频描述。',
                '4. 不要单独输出 hidden 分区。隐藏图库通过每个分区里的 isHidden=true 来体现（例如相机 5 条里有 1-2 条隐藏）。',
                '5. 全部生成内容中，至少 40% 需要和用户相关（aboutUser=true）。',
                '6. description 必须非常详细，至少写 2 句，优先包含构图、光线、屏幕停留内容、主体动作、边缘残留细节、环境痕迹等，长度建议 35-90 字，不要只给一句概括。',
                '7. camera 要像真实镜头拍下来的画面说明；videos 要像回看录像时逐段记下的内容；screenshots 要明确截到了哪个界面、哪些字或区域最醒目。',
                '输出 JSON 格式：',
                '{',
                '  "camera":[{"date":"时间","location":"地点/来源","description":"镜头描述","isHidden":false,"aboutUser":false}],',
                '  "videos":[{"title":"视频标题","duration":"00:18","date":"时间","location":"地点/来源","description":"视频文字版描述","isHidden":false,"aboutUser":true}],',
                '  "screenshots":[{"date":"时间","location":"来源App","description":"截图内容描述","isHidden":false,"aboutUser":true}]',
                '}',
                '只输出 JSON，不要解释。'
            ].join('\n');
        }
        if (scene === 'shadow_work') {
            return [
                '场景：工作档案（AI 角色内部工作记录）。',
                '视角是“旁观者/窃取者”翻看角色真实会留下的生活/工作痕迹。',
                '必须输出一个 JSON 对象，不要额外解释。',
                '输出 JSON Schema：',
                '{',
                '  "tabs": {',
                '    "records": [',
                '      {"time":"HH:MM", "content":"具体动作记录1"}',
                '    ],',
                '    "achievements": [',
                '      {"title":"成就维度1", "value":"具体数据或排名"}',
                '    ],',
                '    "plans": [',
                '      {"date":"时间节点", "content":"具体计划或待办事项"}',
                '    ]',
                '  }',
                '}',
                '硬性约束：',
                '1) 所有内容都只围绕角色本人，不要出现用户/你/我和你等关系向内容。',
                '2) records 必须生成 4-6 条，表示角色 24 小时内的节律时间线。',
                '3) records 的每条都必须是“几点几分 + 具体动作”，像门禁、刷卡、到场、提交、归档、离场、练习、复盘这类真实可见痕迹。',
                '4) achievements 必须生成 3-4 条，且必须包含具体数据、名次、金额、次数、连胜、达成率、排名等硬信息，不要写空泛赞美。',
                '5) plans 必须生成 3-4 条，表示未来几天必须面对的行程、会议、活动或个人目标，可以夹 1 条很有人味的私人待办。',
                '6) 必须强烈贴合角色职业、人设、世界书，不能套通用企业模板。学生写选课/论文/导师/社团，拳手写赛事/陪练/医疗/流水，艺人写录音棚/通告/彩排/热搜，管理层写谈判/审批/供应商/预算，其他角色按其真实身份发挥。',
                '7) 至少 4 条内容要能体现角色的专业能力或生存压力，而不是抽象情绪。',
                '8) 文风要像监控日志、荣誉档案、待办清单，不要写成小说，不要写成恋爱日记。',
                '9) records/achievements/plans 三组字段名必须完整存在，只输出合法 JSON。'
            ].join('\n');
        }
        if (scene === 'shadow_wechat') {
            return [
                '场景：微信子App（角色私密社交视角）。',
                '必须输出一个 JSON 对象，不要额外解释。',
                '输出 JSON Schema：',
                '{',
                '  "contacts": {',
                '    "pinnedUser": {',
                '      "remark": "角色给用户的备注",',
                '      "latestMood": "一句话心境说明"',
                '    },',
                '    "generatedContacts": [',
                '      {',
                '        "name": "联系人名",',
                '        "category": "同事/同学|家人|朋友",',
                '        "remark": "角色对该联系人的备注",',
                '        "recentMessages": [',
                '          {"speaker":"我|对方", "text":"聊天内容"}',
                '        ]',
                '      }',
                '    ],',
                '    "drafts": ["没有对用户说出口的话"]',
                '  },',
                '  "subscriptions": {',
                '    "items": [{"title":"推文标题", "summary":"摘要", "source":"来源", "fullText":"推文全文", "isSaved":true, "saveComment":"角色为什么收藏这条推文"}]',
                '  },',
                '  "favorites": {',
                '    "items": [{"type":"tweet", "title":"收藏标题", "excerpt":"收藏片段", "source":"来源", "annotation":"角色批注"}]',
                '  }',
                '}',
                '硬性约束：',
                '1) 联系人总量 3-5（含置顶用户）；非置顶联系人按给定分类生成，可缺某类。',
                '2) 非置顶每个联系人 recentMessages 生成 4-8 条即可，保证像真实对话片段，不必硬凑满 10 条。',
                '3) drafts 2-4 条；subscriptions 2-4 条；favorites 0-2 条。',
                '4) 严禁捏造“用户与角色”的聊天收藏原文；与用户相关的聊天收藏会由系统从真实聊天历史里自动提取。',
                '5) 你只生成角色主动收藏的推文/外部内容，并为每条收藏写一句简短、克制、符合人设的批注。',
                '6) 批注/saveComment/annotation 必须像角色本人留给自己的小备注，用第一人称或极贴近角色口吻的短句来写，不能像系统总结，不能出现“角色”“该内容”“值得收藏”“被收进收藏夹”这类说明腔。',
                '7) 如果某条订阅内容会被角色收藏，请在该条上设置 isSaved=true，并填写 saveComment；如果没有真正会打动他的内容，favorites 可以为空，订阅也可以一条都不收藏。',
                '8) 字段不确定时宁可留空，也不要用“联系人1 / 推文1 / 默认 / 暂无 / 示例”这种占位词凑数。'
            ].join('\n');
        }
        return '场景未定义。';
    }

    function buildUserMessage(scene, context) {
        const sceneLabel = (SCENE_META[scene] && SCENE_META[scene].label) || scene;
        return '请为角色「' + context.roleName + '」生成“' + sceneLabel + '”内容，只输出 JSON。';
    }

    function buildSceneCacheKey(scene, roleId) {
        return STORAGE_KEYS.cachePrefix + String(roleId || '') + ':' + String(scene || '');
    }

    function buildSceneForageKey(scene, roleId) {
        return SCENE_CACHE_FORAGE_PREFIX + String(roleId || '') + '::' + String(scene || '');
    }

    function buildSceneCacheLitePayload(payload) {
        const body = asObject(payload);
        return {
            roleId: asString(body.roleId),
            roleName: asString(body.roleName),
            scene: asString(body.scene),
            cachedAt: Number(body.cachedAt) || Date.now(),
            data: asObject(body.data),
            rawResponse: ''
        };
    }

    function dispatchSceneCacheHydrated(scene, roleId) {
        if (!global || typeof global.dispatchEvent !== 'function' || typeof global.CustomEvent !== 'function') return;
        try {
            global.dispatchEvent(new CustomEvent('SecretCenterSceneCacheHydrated', {
                detail: {
                    scene: asString(scene),
                    roleId: asString(roleId),
                    at: Date.now()
                }
            }));
        } catch (e) { }
    }

    function writeSceneCacheToForage(scene, roleId, payload) {
        const sceneKey = asString(scene);
        const rid = asString(roleId);
        if (!sceneKey || !rid) return Promise.resolve(false);
        const key = buildSceneForageKey(sceneKey, rid);
        const body = asObject(payload);
        sceneCacheForageState.memory[key] = body;
        return ensureSceneCacheForageStore().then(function (store) {
            if (!store || typeof store.setItem !== 'function') return false;
            return store.setItem(key, body).then(function () {
                return true;
            }).catch(function () {
                return false;
            });
        });
    }

    function removeSceneCacheFromForage(scene, roleId) {
        const sceneKey = asString(scene);
        const rid = asString(roleId);
        if (!sceneKey || !rid) return Promise.resolve(false);
        const key = buildSceneForageKey(sceneKey, rid);
        delete sceneCacheForageState.memory[key];
        return ensureSceneCacheForageStore().then(function (store) {
            if (!store || typeof store.removeItem !== 'function') return false;
            return store.removeItem(key).then(function () {
                return true;
            }).catch(function () {
                return false;
            });
        });
    }

    function loadSceneCacheFromForage(scene, roleId) {
        const sceneKey = asString(scene);
        const rid = asString(roleId);
        if (!sceneKey || !rid) return Promise.resolve(null);
        const key = buildSceneForageKey(sceneKey, rid);
        if (Object.prototype.hasOwnProperty.call(sceneCacheForageState.memory, key)) {
            return Promise.resolve(asObject(sceneCacheForageState.memory[key]));
        }
        if (sceneCacheForageState.loading[key]) return sceneCacheForageState.loading[key];
        sceneCacheForageState.loading[key] = ensureSceneCacheForageStore().then(function (store) {
            if (!store || typeof store.getItem !== 'function') return null;
            return store.getItem(key).then(function (raw) {
                const body = raw && typeof raw === 'object' ? raw : null;
                if (!body) return null;
                sceneCacheForageState.memory[key] = body;
                writeLocalStorage(buildSceneCacheKey(sceneKey, rid), JSON.stringify(buildSceneCacheLitePayload(body)));
                dispatchSceneCacheHydrated(sceneKey, rid);
                return body;
            }).catch(function () {
                return null;
            });
        }).finally(function () {
            delete sceneCacheForageState.loading[key];
        });
        return sceneCacheForageState.loading[key];
    }

    function readSceneCache(scene, roleId) {
        const sceneKey = asString(scene);
        const rid = asString(roleId);
        const key = buildSceneCacheKey(sceneKey, rid);
        const raw = readLocalStorage(key, '');
        const parsed = safeParse(raw, null);
        if (parsed && typeof parsed === 'object') return parsed;

        const forageKey = buildSceneForageKey(sceneKey, rid);
        if (Object.prototype.hasOwnProperty.call(sceneCacheForageState.memory, forageKey)) {
            return asObject(sceneCacheForageState.memory[forageKey]);
        }
        loadSceneCacheFromForage(sceneKey, rid);
        return null;
    }

    async function readSceneCacheAsync(scene, roleId) {
        const quick = readSceneCache(scene, roleId);
        if (quick) return quick;
        const loaded = await loadSceneCacheFromForage(scene, roleId);
        return loaded && typeof loaded === 'object' ? loaded : null;
    }

    function writeSceneCache(scene, roleId, payload) {
        const sceneKey = asString(scene);
        const rid = asString(roleId);
        const key = buildSceneCacheKey(sceneKey, rid);
        const body = payload && typeof payload === 'object' ? payload : {};
        const liteBody = buildSceneCacheLitePayload(body);
        const ok = writeLocalStorage(key, JSON.stringify(liteBody));
        writeSceneCacheToForage(sceneKey, rid, body);
        if (ok && /^shadow_/.test(asString(sceneKey))) {
            markSceneGenerated(rid, sceneKey, asString(body.source || body.batchSource || 'cache_write'));
        }
        return ok;
    }

    function clearSceneCache(scene, roleId) {
        const sceneKey = asString(scene);
        const rid = asString(roleId);
        const key = buildSceneCacheKey(sceneKey, rid);
        try {
            global.localStorage.removeItem(key);
            removeSceneCacheFromForage(sceneKey, rid);
            return true;
        } catch (e) {
            removeSceneCacheFromForage(sceneKey, rid);
            return false;
        }
    }

    function readPromptDebugStore() {
        return asObject(safeParse(readLocalStorage(STORAGE_KEYS.promptDebug, '{}'), {}));
    }

    function writePromptDebugRecord(scene, roleId, payload) {
        const store = readPromptDebugStore();
        const key = String(roleId || '') + '::' + String(scene || '');
        const prev = asObject(store[key]);
        const next = Object.assign({}, prev, asObject(payload), {
            scene: String(scene || ''),
            roleId: String(roleId || ''),
            updatedAt: Date.now()
        });
        store[key] = next;
        writeLocalStorage(STORAGE_KEYS.promptDebug, JSON.stringify(store));
        return next;
    }

    function getPromptDebugRecord(scene, roleId) {
        const store = readPromptDebugStore();
        const key = String(roleId || '') + '::' + String(scene || '');
        return asObject(store[key]);
    }

    function toText(value) {
        if (typeof value === 'string') return value;
        if (value == null) return '';
        try { return JSON.stringify(value); } catch (e) { return String(value); }
    }

    function callParentAI(context, systemPrompt, userMessage, requestOptions) {
        return new Promise(function (resolve, reject) {
            const parentWindow = getParentWindow();
            if (!parentWindow || typeof parentWindow.callAI !== 'function') {
                reject(new Error('主窗口 callAI 未初始化，无法生成内容。'));
                return;
            }
            const prevRoleId = asString(parentWindow.currentChatRole || '');
            try { parentWindow.currentChatRole = context.roleId; } catch (e) { }
            let settled = false;
            function finish(fn) {
                if (settled) return;
                settled = true;
                try { parentWindow.currentChatRole = prevRoleId; } catch (e) { }
                fn();
            }
            try {
                parentWindow.callAI(
                    systemPrompt,
                    [],
                    userMessage,
                    function (content) {
                        finish(function () { resolve(toText(content)); });
                    },
                    function (error) {
                        const message = asString(error) || '模型请求失败';
                        finish(function () { reject(new Error(message)); });
                    },
                    Object.assign({
                        temperature: 0.8,
                        maxTokens: 1800
                    }, asObject(requestOptions))
                );
            } catch (e) {
                finish(function () { reject(e); });
            }
        });
    }

    function stripCodeFence(text) {
        const raw = asString(text);
        if (!raw) return '';
        if (raw.indexOf('```') !== 0) return raw;
        return raw
            .replace(/^```[a-zA-Z]*\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
    }

    function parseJsonFromText(rawText) {
        const text = stripCodeFence(rawText);
        if (!text) return null;
        const direct = safeParse(text, null);
        if (direct && typeof direct === 'object') return direct;

        const firstObj = text.indexOf('{');
        const lastObj = text.lastIndexOf('}');
        if (firstObj >= 0 && lastObj > firstObj) {
            const objTry = safeParse(text.slice(firstObj, lastObj + 1), null);
            if (objTry && typeof objTry === 'object') return objTry;
        }

        const firstArr = text.indexOf('[');
        const lastArr = text.lastIndexOf(']');
        if (firstArr >= 0 && lastArr > firstArr) {
            const arrTry = safeParse(text.slice(firstArr, lastArr + 1), null);
            if (arrTry && typeof arrTry === 'object') return arrTry;
        }
        return null;
    }

    function trimList(input, fallback, maxCount) {
        const src = Array.isArray(input) ? input : [];
        const out = [];
        for (let i = 0; i < src.length && out.length < maxCount; i++) {
            const text = asString(src[i]);
            if (!text) continue;
            out.push(text);
        }
        if (out.length) return out;
        return Array.isArray(fallback) ? fallback.slice(0, maxCount) : [];
    }

    function normalizeFangCunData(payload, context) {
        const data = asObject(payload);
        const pp = asObject(data.phoneProfile || data.phone_profile || {});
        const appsRaw = Array.isArray(data.apps) ? data.apps : [];
        const apps = appsRaw.slice(0, 8).map(function (item) {
            const row = asObject(item);
            return {
                name: asString(row.name || row.app || row.title || '应用'),
                label: asString(row.label || row.tag || ''),
                note: asString(row.note || row.desc || '')
            };
        }).filter(function (item) { return !!item.name; });

        return {
            phoneProfile: {
                theme: asString(pp.theme || '简约暖色'),
                motto: asString(pp.motto || (context.roleName + '今天也在认真生活。')),
                todayFocus: asString(pp.todayFocus || '把眼前的小事做好')
            },
            apps: apps.length ? apps : [
                { name: '相册', label: '留影', note: '收藏对自己有意义的画面' },
                { name: '备忘录', label: '随手记', note: '写下不想忘的念头' },
                { name: '日历', label: '日程', note: '提醒重要时刻' },
                { name: '音乐', label: '听歌', note: '用旋律整理情绪' }
            ],
            notes: trimList(data.notes, ['今天也想把心事写清楚。', '别忘了把重要的话讲出口。', '慢一点，没关系。'], 5),
            drafts: trimList(data.drafts, ['有些话想说给你听。', '总有一天会把真心说完整。'], 4),
            albumCaptions: trimList(data.albumCaptions || data.album_captions, ['这天的风很轻。', '想把这刻存下来。', '以后回看也会笑。'], 5)
        };
    }

    function normalizeNiNanDateValue(value, fallback) {
        const text = asString(value)
            .replace(/[年月]/g, '-')
            .replace(/[日号]/g, '')
            .replace(/[./]/g, '-')
            .replace(/\s+/g, '');
        const match = text.match(/(\d{1,2})-(\d{1,2})/);
        if (match) return pad2(match[1]) + '-' + pad2(match[2]);
        return asString(fallback);
    }

    function buildNoDreamText(index) {
        const list = [
            '深潜期。无梦境信号。',
            '一片黑色的死寂。',
            '没有画面，只有沉默的坠落感。',
            '整夜空白，像被按下静音。'
        ];
        return list[Math.abs(Number(index) || 0) % list.length];
    }

    function buildFallbackDreamText(context, index) {
        const roleName = asString(context && context.roleName) || '他';
        const snippets = [
            '梦里是被雨打湿的连廊，灯一盏接一盏熄灭，他把没发出去的话折成纸船，顺着积水推走。',
            '电梯门反复开合，楼层始终停在同一个数字。远处有人喊他名字，声音像隔着厚玻璃。',
            '空旷站台没有列车，只有屏幕不断刷新昨天的对话。他站在风里，迟迟没有按下发送。',
            '夜色像潮水往回退，街角便利店的白光很亮。他醒不过来，只能反复确认口袋里的车票。'
        ];
        return roleName + '的梦境片段：' + snippets[Math.abs(Number(index) || 0) % snippets.length];
    }

    function buildFallbackDreamTalk(context, index, hasDream) {
        const roleName = asString(context && context.roleName) || '他';
        const dreamy = [
            '别走……我马上就到。',
            '等等我，灯还没灭。',
            '我听见你了，别挂断。',
            '再靠近一点……就一点。',
            '别把我留在这层楼。'
        ];
        const noDream = [
            '嗯……今天很安静。',
            '黑的……什么都看不见。',
            '不用叫我，我在这里。',
            '先睡吧……我没事。',
            '别担心，我只是太累了。'
        ];
        const source = hasDream ? dreamy : noDream;
        const line = source[Math.abs(Number(index) || 0) % source.length];
        return line.indexOf(roleName) === -1 && (Math.abs(Number(index) || 0) % 5 === 0) ? (roleName + '：' + line) : line;
    }

    function normalizeDreamContentLength(content, context, index) {
        let text = asString(content).replace(/\r/g, '\n').replace(/\n{2,}/g, '\n');
        if (!text) text = buildFallbackDreamText(context, index);

        const ext = [
            '醒来的瞬间，他还记得掌心发烫，像抓着一句没说出口的话。',
            '所有声音都被拉长成回声，连呼吸都像从旧磁带里漏出来。',
            '他想伸手去碰那道光，可光后面只剩下缓慢坍塌的影子。',
            '梦里没有人回答他，但每一步都像踩在昨晚的对话上。',
            '远处钟声只敲到一半，剩下的一半落在喉咙里，迟迟不肯散。'
        ];

        let guard = 0;
        while (text.length < 100 && guard < 10) {
            text = text + (text.endsWith('。') ? '' : '。') + ext[(index + guard) % ext.length];
            guard += 1;
        }
        if (text.length > 200) {
            text = text.slice(0, 200);
            if (!/[。！？…]$/.test(text)) text = text.slice(0, 199) + '。';
        }
        return text;
    }

    function normalizeNiNanData(payload, context) {
        const data = asObject(payload);
        const source = Array.isArray(data.dreams) ? data.dreams : [];
        const weekDates = buildRecentDateKeys(7);
        const dreamMap = {};
        let cursor = 0;

        for (let i = 0; i < source.length && i < 12; i++) {
            const row = asObject(source[i]);
            const contentRaw = asString(row.content || row.text || row.note);
            const hasDream = row.hasDream === true || (/^(true|1|yes|有梦)$/i.test(asString(row.hasDream)));
            let dateKey = normalizeNiNanDateValue(row.date, '');
            if (weekDates.indexOf(dateKey) === -1) dateKey = '';
            if (!dateKey) {
                while (cursor < weekDates.length && dreamMap[weekDates[cursor]]) cursor += 1;
                if (cursor < weekDates.length) {
                    dateKey = weekDates[cursor];
                    cursor += 1;
                }
            }
            if (!dateKey || dreamMap[dateKey]) continue;
            dreamMap[dateKey] = {
                date: dateKey,
                hasDream: !!hasDream,
                content: contentRaw || (hasDream ? buildFallbackDreamText(context, i) : buildNoDreamText(i)),
                sleepTalk: asString(row.sleepTalk || row.talk || row.whisper || row.murmur || row.nightTalk || row.nightWhisper || data.sleepTalk)
            };
        }

        const dreams = weekDates.map(function (dateKey, index) {
            const row = asObject(dreamMap[dateKey]);
            if (!Object.keys(row).length) {
                return {
                    date: dateKey,
                    hasDream: false,
                    content: buildNoDreamText(index),
                    sleepTalk: buildFallbackDreamTalk(context, index, false)
                };
            }
            let hasDream = !!row.hasDream;
            let content = asString(row.content);
            if (hasDream) content = normalizeDreamContentLength(content, context, index);
            if (!hasDream && !content) content = buildNoDreamText(index);
            const sleepTalk = asString(row.sleepTalk) || buildFallbackDreamTalk(context, index, hasDream);
            return {
                date: dateKey,
                hasDream: hasDream,
                content: content,
                sleepTalk: sleepTalk
            };
        });

        let dreamCount = dreams.filter(function (item) { return item.hasDream; }).length;
        if (dreamCount > 6) {
            for (let i = 0; i < dreams.length && dreamCount > 6; i++) {
                if (!dreams[i].hasDream) continue;
                dreams[i].hasDream = false;
                dreams[i].content = buildNoDreamText(i);
                dreams[i].sleepTalk = asString(dreams[i].sleepTalk) || buildFallbackDreamTalk(context, i, false);
                dreamCount -= 1;
            }
        }
        if (dreamCount < 4) {
            for (let i = dreams.length - 1; i >= 0 && dreamCount < 4; i--) {
                if (dreams[i].hasDream) continue;
                dreams[i].hasDream = true;
                dreams[i].content = normalizeDreamContentLength(buildFallbackDreamText(context, i), context, i);
                dreams[i].sleepTalk = asString(dreams[i].sleepTalk) || buildFallbackDreamTalk(context, i, true);
                dreamCount += 1;
            }
        }

        for (let i = 0; i < dreams.length; i++) {
            if (dreams[i].hasDream) dreams[i].content = normalizeDreamContentLength(dreams[i].content, context, i);
            if (!dreams[i].hasDream && !asString(dreams[i].content)) dreams[i].content = buildNoDreamText(i);
            if (!asString(dreams[i].sleepTalk)) dreams[i].sleepTalk = buildFallbackDreamTalk(context, i, dreams[i].hasDream);
        }

        const sleepTalk = asString(data.sleepTalk || data.whisper || data.nightWhisper || data.monologue || (dreams[0] && dreams[0].sleepTalk))
            || '别走...我其实一直都在...';

        return {
            dreams: dreams,
            sleepTalk: sleepTalk
        };
    }

    function normalizeChenfengMemoryContent(text, context, index) {
        const roleName = asString(context && context.roleName) || '他';
        const ext = [
            '那一刻他没有立刻说话，只是把肩线绷得很直，像在暗处与某种命运无声对峙。街灯被雨丝切成细碎光斑，落在他指节发白的手背上，像一层迟到的雪。',
            '空气里有消毒水、铁锈和旧木头混在一起的味道，时间像被拉长的镜头。他听见自己的心跳隔着胸腔撞了两下，随即又恢复成惯常的冷静，仿佛什么都没发生过。',
            '他明白有些决定并不壮烈，只是沉默地发生，然后在余生不断回响。后来每当夜深，他仍会想起那条走廊、那扇门，以及门后迟迟没有被说出口的那句话。',
            '窗外的风从高楼缝隙穿过，像有人在很远的地方呼喊他的名字。' + roleName + '没有回头，只把情绪折叠进更深处，留给旁人一张几乎无懈可击的侧脸。'
        ];
        let content = asString(text).replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n');
        if (!content) content = ext[Math.abs(Number(index) || 0) % ext.length];
        let guard = 0;
        while (content.length < 280 && guard < 8) {
            content += (content.endsWith('\n') ? '' : '\n\n') + ext[(index + guard) % ext.length];
            guard += 1;
        }
        return content;
    }

    function normalizeChenFengData(payload, context) {
        const data = asObject(payload);
        const source = Array.isArray(data.memories)
            ? data.memories
            : (Array.isArray(data.timeline) ? data.timeline : []);
        const out = source.slice(0, 3).map(function (item, index) {
            const row = asObject(item);
            const title = asString(row.title || row.event || row.topic || ('尘封事件 ' + String(index + 1)));
            const content = normalizeChenfengMemoryContent(row.content || row.detail || row.note || '', context, index);
            return {
                time: asString(row.time || row.date || (String(16 + index * 2) + '岁')),
                title: title,
                content: content
            };
        }).filter(function (item) {
            return !!asString(item.time) && !!asString(item.title) && !!asString(item.content);
        });

        if (!out.length) return { memories: [] };
        return { memories: out };
    }

    function normalizeHexColor(value, fallback) {
        const text = asString(value);
        return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback;
    }

    function normalizeProgressText(value, fallback) {
        const text = asString(value);
        if (!text) return fallback;
        const match = text.match(/(\d{1,3})/);
        if (!match) return fallback;
        const num = Math.max(1, Math.min(100, Number(match[1]) || 0));
        return String(num) + '%';
    }

    function formatReadingCoverTitle(value) {
        const text = asString(value);
        if (!text) return '未命名';
        if (text.indexOf('<br>') !== -1) return text;
        if (text.indexOf(' ') !== -1 && text.length <= 22) {
            return text.split(/\s+/).slice(0, 3).join('<br>');
        }
        if (text.length <= 4) return text;
        if (text.length <= 8) return text.slice(0, 2) + '<br>' + text.slice(2);
        if (text.length <= 12) return text.slice(0, 4) + '<br>' + text.slice(4, 8);
        return text.slice(0, 4) + '<br>' + text.slice(4, 8);
    }

    const SHADOW_MEMO_SECTION_TYPES = ['tasks', 'userdata', 'gifts', 'drafts', 'reflections'];
    const SHADOW_MEMO_SECTION_TITLES = {
        tasks: '待办事项',
        userdata: '关于她的记录',
        gifts: '礼物计划',
        drafts: '草稿箱',
        reflections: '灵感与感悟'
    };

    function normalizeShadowMemoBoolean(value, fallback) {
        if (typeof value === 'boolean') return value;
        const text = asString(value).toLowerCase();
        if (!text) return !!fallback;
        if (/^(true|1|yes|done|完成|已完成|是)$/.test(text)) return true;
        if (/^(false|0|no|todo|未完成|否)$/.test(text)) return false;
        return !!fallback;
    }

    function normalizeShadowMemoThought(value) {
        return asString(value);
    }

    function normalizeShadowMemoTaskItem(item) {
        const row = asObject(item);
        const text = asString(row.text || row.task || row.content || row.name);
        if (!text) return null;
        return {
            text: text,
            isDone: normalizeShadowMemoBoolean(row.isDone || row.done || row.completed, false),
            isPriority: normalizeShadowMemoBoolean(row.isPriority || row.priority || row.important, false),
            thought: normalizeShadowMemoThought(row.thought || row.note || row.memo)
        };
    }

    function normalizeShadowMemoUserDataItem(item) {
        const row = asObject(item);
        const label = asString(row.label || row.key || row.title);
        const value = asString(row.value || row.text || row.content);
        if (!label || !value) return null;
        return {
            label: label,
            value: value,
            thought: normalizeShadowMemoThought(row.thought || row.note || row.memo)
        };
    }

    function normalizeShadowMemoGiftItem(item) {
        const row = asObject(item);
        const name = asString(row.name || row.title || row.text || row.gift);
        if (!name) return null;
        return {
            name: name,
            thought: normalizeShadowMemoThought(row.thought || row.note || row.memo)
        };
    }

    function normalizeShadowMemoDraftItem(item) {
        const row = asObject(item);
        const deletedLines = Array.isArray(row.deletedLines) ? row.deletedLines.map(function (line) {
            return asString(line);
        }).filter(Boolean).slice(0, 5) : [];
        const finalText = asString(row.finalText || row.text || row.content || row.message);
        if (!finalText) return null;
        return {
            deletedLines: deletedLines,
            finalText: finalText,
            thought: normalizeShadowMemoThought(row.thought || row.note || row.memo)
        };
    }

    function normalizeShadowMemoReflectionItem(item) {
        const row = asObject(item);
        const content = asString(row.content || row.text || row.note || row.idea);
        if (!content) return null;
        return {
            content: content,
            thought: normalizeShadowMemoThought(row.thought || row.noteText || row.memo)
        };
    }

    function normalizeShadowMemoSection(section, type) {
        const row = asObject(section);
        const items = Array.isArray(row.items) ? row.items : [];
        let normalizedItems = [];
        if (type === 'tasks') normalizedItems = items.map(normalizeShadowMemoTaskItem).filter(Boolean);
        else if (type === 'userdata') normalizedItems = items.map(normalizeShadowMemoUserDataItem).filter(Boolean);
        else if (type === 'gifts') normalizedItems = items.map(normalizeShadowMemoGiftItem).filter(Boolean);
        else if (type === 'drafts') normalizedItems = items.map(normalizeShadowMemoDraftItem).filter(Boolean);
        else if (type === 'reflections') normalizedItems = items.map(normalizeShadowMemoReflectionItem).filter(Boolean);
        return {
            type: type,
            title: asString(row.title || SHADOW_MEMO_SECTION_TITLES[type]),
            items: normalizedItems.slice(0, 5)
        };
    }

    function normalizeShadowMemosData(payload) {
        const data = asObject(payload);
        const sections = Array.isArray(data.sections) ? data.sections : [];
        const sectionMap = {};
        for (let i = 0; i < sections.length; i++) {
            const row = asObject(sections[i]);
            const type = asString(row.type).toLowerCase();
            if (SHADOW_MEMO_SECTION_TYPES.indexOf(type) === -1 || sectionMap[type]) continue;
            sectionMap[type] = row;
        }

        return {
            sections: SHADOW_MEMO_SECTION_TYPES.map(function (type) {
                return normalizeShadowMemoSection(sectionMap[type], type);
            })
        };
    }

    function normalizeShadowDiaryData(payload) {
        const data = asObject(payload);
        const diary = asObject(data.diary || {});
        return {
            diary: {
                date: asString(data.date || diary.date || '未知日期'),
                weather: asString(data.weather || diary.weather || '未知'),
                mood: asString(data.mood || diary.mood || '未知'),
                content: asString(data.content || diary.content || '')
            }
        };
    }

    function isValidShadowMemosData(payload) {
        const data = asObject(payload);
        const sections = Array.isArray(data.sections) ? data.sections : [];
        const nonEmptySections = sections.filter(function (section) {
            const row = asObject(section);
            return SHADOW_MEMO_SECTION_TYPES.indexOf(asString(row.type).toLowerCase()) !== -1
                && Array.isArray(row.items)
                && row.items.length > 0;
        });
        if (nonEmptySections.length < 3) return false;
        return nonEmptySections.every(function (section) {
            const row = asObject(section);
            const type = asString(row.type).toLowerCase();
            const items = Array.isArray(row.items) ? row.items : [];
            if (items.length < 1 || items.length > 5) return false;
            if (!asString(row.title)) return false;
            return items.every(function (entry) {
                const item = asObject(entry);
                if (type === 'tasks') return !!asString(item.text);
                if (type === 'userdata') return !!asString(item.label) && !!asString(item.value);
                if (type === 'gifts') return !!asString(item.name);
                if (type === 'drafts') return !!asString(item.finalText);
                if (type === 'reflections') return !!asString(item.content);
                return false;
            });
        });
    }

    function isValidShadowDiaryData(payload) {
        const data = asObject(payload);
        const diary = asObject(data.diary || {});
        return !!asString(diary.content);
    }

    function normalizeShadowShoppingPrice(value) {
        const raw = asString(value);
        if (!raw) return '0';
        if (/^\d+(\.\d+)?$/.test(raw)) return raw;
        const cleaned = raw.replace(/[,\s]/g, '');
        const match = cleaned.match(/(\d+(\.\d+)?)/);
        return match ? match[1] : raw.replace(/[￥¥]/g, '') || '0';
    }

    function normalizeShadowShoppingStatus(value, kind) {
        const raw = asString(value);
        if (kind === 'cart') {
            if (/(已下单|已购买|ordered|purchased)/i.test(raw)) return '已下单';
            return '待下单';
        }
        if (kind === 'footprints') {
            if (/(收藏|saved|liked|wish)/i.test(raw)) return '已收藏';
            return '已浏览';
        }
        if (/(运输|在途|派送|shipping|transit|delivery)/i.test(raw)) return '运输中';
        return '已签收';
    }

    function getShadowShoppingDefaultDate(offset) {
        const date = new Date();
        date.setDate(date.getDate() - Math.max(0, Number(offset) || 0));
        return String(date.getMonth() + 1) + '/' + String(date.getDate());
    }

    function buildShadowShoppingFallbackData(context) {
        const roleName = asString(context && context.roleName) || 'TA';
        return {
            cart: [
                { name: '旅行收纳包', price: '199', category: '出行', note: '短途出门更利落' },
                { name: '降噪耳机', price: '899', category: '数码', note: '通勤时想安静一点' },
                { name: roleName + '偏好的精品咖啡豆', price: '168', category: '日用', note: '最近消耗得很快' }
            ],
            footprints: [
                { name: '轻量防风外套', price: '369', category: '服饰', note: '天气反复时会用到' },
                { name: '便携香氛喷雾', price: '129', category: '个护', note: '路上临时补香' },
                { name: '真皮证件夹', price: '288', category: '配件', note: '通勤与出差都能用' }
            ],
            orders: [
                { date: getShadowShoppingDefaultDate(0), name: '冷萃咖啡机滤芯', price: '109', status: '已签收', category: '日用', thought: '看起来不重要，但每天早上都离不开它。', isSecret: false },
                { date: getShadowShoppingDefaultDate(1), maskedName: '评价极高的私人订制', realName: '定制对戒', price: '3280', status: '运输中', category: '礼物', thought: '挑了很久，想把“认真”放进这件东西里。', isSecret: true },
                { date: getShadowShoppingDefaultDate(2), name: '商务短途登机箱', price: '1260', status: '已签收', category: '出行', thought: '下一次临时出门，至少不想再手忙脚乱。', isSecret: false }
            ]
        };
    }

    function normalizeShadowShoppingItem(item, kind, index) {
        const row = asObject(item);
        const isSecret = kind === 'orders' && normalizeShadowMemoBoolean(row.isSecret || row.secret || row.hidden, false);
        const baseName = asString(row.name || row.itemName || row.product || row.title);
        let maskedName = asString(row.maskedName || row.displayName || row.alias);
        let realName = asString(row.realName || row.secretName || row.revealName || row.actualName || row.detailName);
        let name = baseName;

        if (isSecret) {
            if (!name) name = maskedName;
            if (!name) name = '评价极高的私人订制';
            if (!maskedName) maskedName = name;
            if (!realName) {
                realName = (baseName && baseName !== maskedName)
                    ? baseName
                    : (asString(row.detail || row.note) || '未公开的私人订制');
            }
            name = maskedName;
        } else {
            if (!name) {
                name = asString(row.displayName || row.maskedName || row.alias);
            }
            if (!name) {
                name = (kind === 'cart' ? '购物车商品' : (kind === 'footprints' ? '浏览商品' : '订单商品')) + String(index + 1);
            }
            if (!realName) realName = name;
        }

        const thoughtText = asString(row.thought || row.idea || row.innerThought || row.os || '');
        return {
            date: asString(row.date || row.day || row.orderDate || (kind === 'orders' ? getShadowShoppingDefaultDate(index) : '')),
            name: name,
            price: normalizeShadowShoppingPrice(row.price || row.amount || row.cost || row.budget),
            status: normalizeShadowShoppingStatus(row.status || row.state, kind),
            category: asString(row.category || row.tag || row.kind || '日常'),
            note: asString(row.note || row.reason || row.memo || ''),
            thought: (kind === 'orders'
                ? asString(thoughtText || row.note || row.reason || '下单那一刻犹豫过，但还是想把它带回生活里。')
                : thoughtText),
            isSecret: isSecret,
            maskedName: maskedName || '',
            realName: realName || ''
        };
    }

    function normalizeShadowShoppingList(source, kind, fallback) {
        const normalized = (Array.isArray(source) ? source : []).map(function (item, index) {
            return normalizeShadowShoppingItem(item, kind, index);
        }).filter(function (item) {
            return !!asString(item.name);
        }).slice(0, 5);

        const fallbacks = Array.isArray(fallback) ? fallback : [];
        for (let i = normalized.length; i < 3 && i < fallbacks.length; i++) {
            normalized.push(normalizeShadowShoppingItem(fallbacks[i], kind, i));
        }
        return normalized.slice(0, 5);
    }

    function normalizeShadowShoppingData(payload, context) {
        const data = asObject(payload);
        const fallback = buildShadowShoppingFallbackData(context);
        const ordersSource = Array.isArray(data.orders)
            ? data.orders
            : (Array.isArray(data.recentOrders)
                ? data.recentOrders
                : (Array.isArray(data.orderList) ? data.orderList : (Array.isArray(data.items) ? data.items : [])));
        const cartSource = Array.isArray(data.cart)
            ? data.cart
            : (Array.isArray(data.cartItems)
                ? data.cartItems
                : (Array.isArray(data.wishlist) ? data.wishlist : []));
        const footprintsSource = Array.isArray(data.footprints)
            ? data.footprints
            : (Array.isArray(data.browsing)
                ? data.browsing
                : (Array.isArray(data.history) ? data.history : []));

        let orders = normalizeShadowShoppingList(ordersSource, 'orders', fallback.orders);
        if (!orders.length) orders = normalizeShadowShoppingList(fallback.orders, 'orders', fallback.orders);
        if (!orders.some(function (item) { return item.isSecret; }) && orders.length) {
            orders[0].isSecret = true;
            orders[0].realName = asString(orders[0].realName || orders[0].name || '未公开的私人订制');
            orders[0].maskedName = asString(orders[0].maskedName || '评价极高的私人订制');
            orders[0].name = orders[0].maskedName;
        }

        const cartBase = cartSource.length ? cartSource : ordersSource;
        const footprintsBase = footprintsSource.length ? footprintsSource : (cartSource.length ? cartSource : ordersSource);
        const cart = normalizeShadowShoppingList(cartBase, 'cart', fallback.cart);
        const footprints = normalizeShadowShoppingList(footprintsBase, 'footprints', fallback.footprints);

        return { cart: cart, footprints: footprints, orders: orders };
    }

    function isValidShadowShoppingData(payload) {
        const data = asObject(payload);
        const cart = Array.isArray(data.cart) ? data.cart : [];
        const footprints = Array.isArray(data.footprints) ? data.footprints : [];
        const orders = Array.isArray(data.orders) ? data.orders : [];
        if (!cart.length && !footprints.length && !orders.length) return false;
        const hasValidOrder = orders.some(function (item) {
            const row = asObject(item);
            return !!asString(row.name) && !!asString(row.price);
        });
        const hasValidList = cart.concat(footprints).some(function (item) {
            const row = asObject(item);
            return !!asString(row.name);
        });
        return hasValidOrder || hasValidList;
    }

    function normalizeYoutubeProgress(value) {
        const text = asString(value);
        if (!text) return '0%';
        const match = text.match(/(\d{1,3})/);
        if (!match) return '0%';
        const num = clampNumber(match[1], 0, 100);
        return String(num) + '%';
    }

    function buildShadowYoutubeFallbackVideos() {
        return [
            {
                title: 'Morning Routine for Focus',
                titleZh: '提升专注力的晨间流程',
                channel: 'Better Habits Lab',
                progress: '64%',
                time: '今天 07:22',
                type: 'history',
                description: '视频从起床后 30 分钟的节奏管理开始，强调先稳定呼吸和水分补给，再进入轻度运动。后半段讲了如何把待办拆成 25 分钟小块，避免上午被消息流打断。'
            },
            {
                title: '复盘会议沟通失误',
                titleZh: '',
                channel: '职场拆解室',
                progress: '92%',
                time: '昨天',
                type: 'history',
                description: '主讲人用真实案例拆了三种常见沟通误判：信息过量、时点错误、责任边界不清。最后给出一套“会前一页纸”模板，能明显降低协作摩擦。'
            },
            {
                title: 'Cat Videos to Calm Down',
                titleZh: '治愈情绪的猫咪合集',
                channel: 'Tiny Paw Daily',
                progress: '18%',
                time: '昨天',
                type: 'history',
                description: '轻松向内容，主要是猫咪日常互动与慢节奏镜头。没有知识密度，但适合短时间降压和切换情绪。'
            },
            {
                title: 'How to Read People in 5 Minutes',
                titleZh: '5 分钟快速识人框架',
                channel: 'Mind Signals',
                progress: '0%',
                time: '为你推荐',
                type: 'recommend',
                description: '推荐视频主打微表情和语气线索，结构偏实操。前两段讲“观察顺序”，后两段讲“如何避免主观臆断”。'
            },
            {
                title: '你上次提到的城市夜景机位',
                titleZh: '',
                channel: 'City Lens',
                progress: '0%',
                time: '为你推荐',
                type: 'recommend',
                description: '内容集中在夜景拍摄路线和机位选择，附带镜头参数建议。和近期聊天中的“想去看夜景”主题高度相关。'
            }
        ];
    }

    function normalizeShadowYoutubeDescription(value, type, title) {
        const text = asString(value);
        if (text) return text;
        if (type === 'history') {
            return '这条视频《' + title + '》的文字版摘要暂未完整记录。';
        }
        return '这条推荐《' + title + '》暂未同步详细文字版内容。';
    }

    function normalizeShadowYoutubeData(payload) {
        const data = asObject(payload);
        const historySource = Array.isArray(data.history) ? data.history : [];
        const recommendSource = Array.isArray(data.recommend) ? data.recommend : (Array.isArray(data.recommendations) ? data.recommendations : []);
        let source = Array.isArray(data.videos) ? data.videos : (Array.isArray(data.items) ? data.items : []);
        if (!source.length && (historySource.length || recommendSource.length)) {
            source = historySource.map(function (item) {
                return Object.assign({}, asObject(item), { type: 'history' });
            }).concat(recommendSource.map(function (item) {
                return Object.assign({}, asObject(item), { type: 'recommend' });
            }));
        }

        let videos = source.slice(0, 10).map(function (item, index) {
            const row = asObject(item);
            const typeRaw = asString(row.type || row.kind || '').toLowerCase();
            const type = typeRaw === 'recommend' ? 'recommend' : (typeRaw === 'history' ? 'history' : (index < 3 ? 'history' : 'recommend'));
            const title = asString(row.title || row.name || ('视频' + String(index + 1)));
            return {
                title: title,
                titleZh: asString(row.titleZh || row.translation || row.translate || row.cnTitle || row.subtitle || ''),
                channel: asString(row.channel || row.author || '未知频道'),
                progress: normalizeYoutubeProgress(row.progress || row.percent || row.watchProgress),
                time: asString(row.time || row.watchTime || (type === 'history' ? '最近' : '为你推荐')),
                type: type,
                description: normalizeShadowYoutubeDescription(
                    row.description || row.desc || row.summary || row.textVersion || row.transcript || row.content || row.note,
                    type,
                    title
                )
            };
        }).filter(function (item) {
            return !!asString(item.title);
        });

        const fallback = buildShadowYoutubeFallbackVideos();
        if (!videos.length) {
            videos = fallback;
        } else if (videos.length < 5) {
            for (let i = videos.length; i < 5 && i < fallback.length; i++) {
                videos.push(fallback[i]);
            }
        }

        return { videos: videos.slice(0, 10) };
    }

    function isValidShadowYoutubeData(payload) {
        const data = asObject(payload);
        const videos = Array.isArray(data.videos) ? data.videos : [];
        if (!videos.length) return false;
        return videos.some(function (item) {
            const row = asObject(item);
            return !!asString(row.title) && /^(history|recommend)$/.test(asString(row.type));
        });
    }

    function buildShadowAppStoreFallbackData(context) {
        const roleName = asString(context && context.roleName) || 'TA';
        return {
            installed: [
                { name: 'Notion', desc: '项目与资料都堆在这里' },
                { name: '微信', desc: '高频沟通和消息处理' },
                { name: 'QQ音乐', desc: roleName + '最近常循环的歌单在这里' },
                { name: '高德地图', desc: '通勤和约见路线常用' },
                { name: '小红书', desc: '碎片时间会刷的生活流内容' },
                { name: '抖音', desc: '短时间放空时会点开' },
                { name: '淘宝', desc: '日常采购与临时下单' },
                { name: '京东', desc: '数码和急用物品优先' },
                { name: '飞书', desc: '工作协作和消息提醒' },
                { name: 'Keep', desc: '训练记录和状态追踪' },
                { name: '哔哩哔哩', desc: '学习与娱乐混看' },
                { name: '网易邮箱大师', desc: '邮件处理入口' }
            ],
            uninstalled: [
                { name: '恋爱话术大全', date: '上周', reason: '看两页就关了，太刻意，不像我会说的话。' },
                { name: '随机社交', date: '3天前', reason: '热闹太快，空得也快，不如删了。' },
                { name: '外卖软件', date: '昨天', reason: '最近总想自己做点吃的，至少能让脑子慢下来。' },
                { name: '自动记账助手', date: '本周', reason: '提醒太密集，反而更焦虑。' }
            ]
        };
    }

    function normalizeShadowAppStoreItem(item, kind, index) {
        const row = asObject(item);
        const name = asString(row.name || row.app || row.title || ((kind === 'installed' ? '已购 App ' : '已卸载 App ') + String(index + 1)));
        const date = asString(row.date || row.uninstallDate || row.removedAt || '');
        return {
            name: name,
            desc: asString(row.desc || row.description || row.summary || ''),
            date: date,
            reason: asString(row.reason || row.thought || row.note || row.os || '')
        };
    }

    function normalizeShadowAppStoreData(payload, context) {
        const data = asObject(payload);
        const fallback = buildShadowAppStoreFallbackData(context);
        let installed = (Array.isArray(data.installed) ? data.installed : []).map(function (item, index) {
            return normalizeShadowAppStoreItem(item, 'installed', index);
        }).filter(function (item) { return !!asString(item.name); }).slice(0, 16);
        let uninstalled = (Array.isArray(data.uninstalled) ? data.uninstalled : []).map(function (item, index) {
            return normalizeShadowAppStoreItem(item, 'uninstalled', index);
        }).filter(function (item) { return !!asString(item.name); }).slice(0, 10);

        if (!installed.length) {
            installed = fallback.installed.map(function (item, index) {
                return normalizeShadowAppStoreItem(item, 'installed', index);
            });
        }
        if (!uninstalled.length) {
            uninstalled = fallback.uninstalled.map(function (item, index) {
                return normalizeShadowAppStoreItem(item, 'uninstalled', index);
            });
        }

        const installedSeen = {};
        installed = installed.filter(function (item) {
            const key = asString(item.name).toLowerCase();
            if (!key || installedSeen[key]) return false;
            installedSeen[key] = true;
            return true;
        });
        for (let i = 0; i < fallback.installed.length && installed.length < 10; i++) {
            const item = normalizeShadowAppStoreItem(fallback.installed[i], 'installed', i);
            const key = asString(item.name).toLowerCase();
            if (!key || installedSeen[key]) continue;
            installedSeen[key] = true;
            installed.push(item);
        }

        const uninstalledSeen = {};
        uninstalled = uninstalled.filter(function (item) {
            const key = asString(item.name).toLowerCase();
            if (!key || uninstalledSeen[key]) return false;
            uninstalledSeen[key] = true;
            return true;
        });
        for (let j = 0; j < fallback.uninstalled.length && uninstalled.length < 3; j++) {
            const row = normalizeShadowAppStoreItem(fallback.uninstalled[j], 'uninstalled', j);
            const k = asString(row.name).toLowerCase();
            if (!k || uninstalledSeen[k]) continue;
            uninstalledSeen[k] = true;
            uninstalled.push(row);
        }

        if (installed.length < 10) {
            for (let n = installed.length; n < 10; n++) {
                installed.push(normalizeShadowAppStoreItem({
                    name: '已购 App ' + String(n + 1),
                    desc: '近期仍在使用'
                }, 'installed', n));
            }
        }

        uninstalled = uninstalled.map(function (item, index) {
            return Object.assign({}, item, {
                date: asString(item.date || ('本周-' + String(index + 1))),
                reason: asString(item.reason || '当时觉得不适合现在的节奏，就删掉了。')
            });
        });

        return {
            installed: installed.slice(0, 10),
            uninstalled: uninstalled.slice(0, 6)
        };
    }

    function isValidShadowAppStoreData(payload) {
        const data = asObject(payload);
        const installed = Array.isArray(data.installed) ? data.installed : [];
        const uninstalled = Array.isArray(data.uninstalled) ? data.uninstalled : [];
        if (installed.length < 10) return false;
        return installed.concat(uninstalled).some(function (item) {
            return !!asString(asObject(item).name);
        });
    }

    function buildShadowSettingsFallbackData(context) {
        const roleName = asString(context && context.roleName) || 'TA';
        const roleId = asString(context && context.roleId) || 'role';
        return {
            account: {
                name: roleName,
                id: roleId + '@icloud.com'
            },
            connectivity: {
                wifi: roleName + '-Private',
                bluetooth: ['AirPods Pro', 'Watch'],
                devices: {
                    phone: 'iPhone 15 Pro Max',
                    computer: 'MacBook Pro 14"',
                    earphones: 'AirPods Pro 2',
                    tv: 'Sony BRAVIA XR'
                }
            },
            screenTime: {
                total: '6小时34分钟',
                compare: '今天比昨天少26分钟',
                weeklyTotal: '42小时18分钟',
                weeklyCompare: '比上周多1小时12分钟',
                topApps: [
                    { name: '抖音', time: '1小时43分钟' },
                    { name: 'QQ浏览器', time: '1小时9分钟' },
                    { name: '微信', time: '1小时4分钟' },
                    { name: '方寸', time: '57分钟' }
                ],
                categories: [
                    { name: '实用工具', time: '1小时49分钟', color: '#4D8EFF' },
                    { name: '视频播放', time: '1小时43分钟', color: '#9C4EFF' },
                    { name: '社交通讯', time: '1小时30分钟', color: '#F59A2A' }
                ],
                hourly: [18, 0, 0, 0, 0, 0, 0, 6, 0, 12, 38, 31, 25, 19, 14, 11, 20, 34, 40, 36, 33, 18, 10, 6],
                weekly: [
                    { day: '周一', minutes: 312 },
                    { day: '周二', minutes: 356 },
                    { day: '周三', minutes: 298 },
                    { day: '周四', minutes: 421 },
                    { day: '周五', minutes: 387 },
                    { day: '周六', minutes: 444 },
                    { day: '周日', minutes: 320 }
                ]
            },
            storage: {
                used: '419GB',
                total: '512GB',
                details: '应用占用最多',
                breakdown: [
                    { name: '应用', size: '320GB', color: '#4253FF' },
                    { name: '图片', size: '22.1GB', color: '#1A8BFF' },
                    { name: '视频', size: '19.1GB', color: '#7A2CFF' },
                    { name: '音频', size: '801MB', color: '#9A4DFF' },
                    { name: '文档', size: '150MB', color: '#27B45C' },
                    { name: '安装包', size: '2.45GB', color: '#F6B400' },
                    { name: '压缩包', size: '1.25GB', color: '#F28A2D' },
                    { name: '最近删除', size: '51.8MB', color: '#F05A2B' },
                    { name: '其他文件', size: '1.65GB', color: '#2A376A' }
                ],
                apps: [
                    { name: '微信', size: '16.2GB' },
                    { name: '方寸', size: '8.4GB' },
                    { name: '抖音', size: '12.8GB' },
                    { name: 'QQ浏览器', size: '7.2GB' },
                    { name: '哔哩哔哩', size: '6.5GB' },
                    { name: '淘宝', size: '4.1GB' }
                ],
                documents: [
                    { name: '并购会议纪要_终稿.pdf', size: '18MB', updatedAt: '昨天 23:18' },
                    { name: 'Q2预算拆分.xlsx', size: '6MB', updatedAt: '昨天 20:42' },
                    { name: '未发送草稿_删改版.docx', size: '2MB', updatedAt: '周二 01:14' },
                    { name: '旅行待确认清单.pages', size: '860KB', updatedAt: '周一 22:08' }
                ]
            },
            battery: {
                level: '68%',
                state: '使用中'
            },
            focusMode: '工作'
        };
    }

    function normalizeShadowSettingsCategory(item, index) {
        const row = asObject(item);
        const palette = ['#4D8EFF', '#9C4EFF', '#F59A2A', '#36B37E', '#FF6B6B'];
        return {
            name: asString(row.name || ('分类' + String(index + 1))),
            time: asString(row.time || row.duration || '0分钟'),
            color: normalizeHexColor(row.color, palette[index % palette.length])
        };
    }

    function normalizeShadowSettingsStorageItem(item, index) {
        const row = asObject(item);
        const palette = ['#4253FF', '#1A8BFF', '#7A2CFF', '#9A4DFF', '#27B45C', '#F6B400', '#F28A2D', '#F05A2B', '#2A376A'];
        return {
            name: asString(row.name || ('项目' + String(index + 1))),
            size: asString(row.size || row.value || '0GB'),
            color: normalizeHexColor(row.color, palette[index % palette.length])
        };
    }

    function normalizeShadowSettingsWeeklyItem(item, index) {
        const row = asObject(item);
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        return {
            day: asString(row.day || row.label || days[index % days.length]),
            minutes: clampNumber(row.minutes || row.value || row.time || 0, 0, 24 * 60)
        };
    }

    function normalizeShadowSettingsAppItem(item, index) {
        const row = asObject(item);
        return {
            name: asString(row.name || ('应用' + String(index + 1))),
            size: asString(row.size || row.value || '0GB')
        };
    }

    function normalizeShadowSettingsDocumentItem(item, index) {
        const row = asObject(item);
        return {
            name: asString(row.name || ('文档' + String(index + 1))),
            size: asString(row.size || row.value || '0MB'),
            updatedAt: asString(row.updatedAt || row.time || row.modifiedAt || '最近')
        };
    }

    function normalizeShadowSettingsData(payload, context) {
        const data = asObject(payload);
        const fallback = buildShadowSettingsFallbackData(context);
        const accountRaw = asObject(data.account || {});
        const connectivityRaw = asObject(data.connectivity || {});
        const screenTimeRaw = asObject(data.screenTime || {});
        const storageRaw = asObject(data.storage || {});
        const batteryRaw = asObject(data.battery || {});
        const topAppsRaw = Array.isArray(screenTimeRaw.topApps) ? screenTimeRaw.topApps : [];
        const bluetoothRaw = Array.isArray(connectivityRaw.bluetooth) ? connectivityRaw.bluetooth : [];
        const devicesRaw = asObject(connectivityRaw.devices || data.devices || {});
        const categoriesRaw = Array.isArray(screenTimeRaw.categories) ? screenTimeRaw.categories : [];
        const hourlyRaw = Array.isArray(screenTimeRaw.hourly) ? screenTimeRaw.hourly : [];
        const weeklyRaw = Array.isArray(screenTimeRaw.weekly) ? screenTimeRaw.weekly : [];
        const breakdownRaw = Array.isArray(storageRaw.breakdown) ? storageRaw.breakdown : [];
        const appsRaw = Array.isArray(storageRaw.apps) ? storageRaw.apps : [];
        const documentsRaw = Array.isArray(storageRaw.documents) ? storageRaw.documents : [];

        return {
            account: {
                name: asString(accountRaw.name || fallback.account.name),
                id: asString(accountRaw.id || accountRaw.email || fallback.account.id)
            },
            connectivity: {
                wifi: asString(connectivityRaw.wifi || connectivityRaw.wlan || fallback.connectivity.wifi),
                bluetooth: (bluetoothRaw.length ? bluetoothRaw : fallback.connectivity.bluetooth).map(function (item) {
                    return asString(item);
                }).filter(Boolean).slice(0, 8),
                devices: {
                    phone: asString(devicesRaw.phone || devicesRaw.mobile || devicesRaw.mobilePhone || devicesRaw['手机'] || ''),
                    computer: asString(devicesRaw.computer || devicesRaw.laptop || devicesRaw.pc || devicesRaw.notebook || devicesRaw['电脑'] || ''),
                    earphones: asString(devicesRaw.earphones || devicesRaw.headphones || devicesRaw.earbuds || devicesRaw['耳机'] || ''),
                    tv: asString(devicesRaw.tv || devicesRaw.television || devicesRaw.smartTv || devicesRaw['电视'] || '')
                }
            },
            screenTime: {
                total: asString(screenTimeRaw.total || screenTimeRaw.duration || fallback.screenTime.total),
                compare: asString(screenTimeRaw.compare || screenTimeRaw.delta || fallback.screenTime.compare),
                weeklyTotal: asString(screenTimeRaw.weeklyTotal || screenTimeRaw.weekTotal || fallback.screenTime.weeklyTotal),
                weeklyCompare: asString(screenTimeRaw.weeklyCompare || screenTimeRaw.weekDelta || fallback.screenTime.weeklyCompare),
                topApps: (topAppsRaw.length ? topAppsRaw : fallback.screenTime.topApps).map(function (item, index) {
                    const row = asObject(item);
                    return {
                        name: asString(row.name || ('应用' + String(index + 1))),
                        time: asString(row.time || row.duration || '0分钟')
                    };
                }).filter(function (item) { return !!asString(item.name); }).slice(0, 10),
                categories: (categoriesRaw.length ? categoriesRaw : fallback.screenTime.categories).map(function (item, index) {
                    return normalizeShadowSettingsCategory(item, index);
                }).slice(0, 6),
                hourly: (hourlyRaw.length ? hourlyRaw : fallback.screenTime.hourly).map(function (item) {
                    return clampNumber(item, 0, 60);
                }).slice(0, 24),
                weekly: (weeklyRaw.length ? weeklyRaw : fallback.screenTime.weekly).map(function (item, index) {
                    return normalizeShadowSettingsWeeklyItem(item, index);
                }).slice(0, 7)
            },
            storage: {
                used: asString(storageRaw.used || storageRaw.current || fallback.storage.used),
                total: asString(storageRaw.total || storageRaw.max || fallback.storage.total),
                details: asString(storageRaw.details || storageRaw.detail || fallback.storage.details),
                breakdown: (breakdownRaw.length ? breakdownRaw : fallback.storage.breakdown).map(function (item, index) {
                    return normalizeShadowSettingsStorageItem(item, index);
                }).slice(0, 12),
                apps: (appsRaw.length ? appsRaw : fallback.storage.apps).map(function (item, index) {
                    return normalizeShadowSettingsAppItem(item, index);
                }).slice(0, 20),
                documents: (documentsRaw.length ? documentsRaw : fallback.storage.documents).map(function (item, index) {
                    return normalizeShadowSettingsDocumentItem(item, index);
                }).slice(0, 20)
            },
            battery: {
                level: asString(batteryRaw.level || batteryRaw.percent || fallback.battery.level),
                state: asString(batteryRaw.state || batteryRaw.status || fallback.battery.state)
            },
            focusMode: asString(data.focusMode || data.focus || fallback.focusMode)
        };
    }

    function isValidShadowSettingsData(payload) {
        const data = asObject(payload);
        const account = asObject(data.account || {});
        const connectivity = asObject(data.connectivity || {});
        const screenTime = asObject(data.screenTime || {});
        const storage = asObject(data.storage || {});
        return !!asString(account.name)
            && !!asString(connectivity.wifi)
            && Array.isArray(storage.breakdown)
            && storage.breakdown.length > 0
            && !!asString(screenTime.total);
    }

    function normalizeShadowAssetsTheme(value) {
        const raw = asString(value).toLowerCase();
        if (/gold|金/.test(raw)) return 'gold';
        if (/blue|蓝/.test(raw)) return 'blue';
        if (/red|红/.test(raw)) return 'red';
        return 'black';
    }

    function normalizeShadowAssetsAmount(value, fallbackSign) {
        const raw = asString(value);
        if (!raw) return fallbackSign === '-' ? '-0.00' : '0.00';
        const sign = raw.indexOf('-') === 0 || fallbackSign === '-' ? '-' : '';
        const cleaned = raw.replace(/[^\d.]/g, '');
        return sign + (cleaned || '0.00');
    }

    function buildShadowAssetsFallbackData(context) {
        const roleName = asString(context && context.roleName) || 'TA';
        const mode = inferShadowWorkMode(context);
        if (mode === 'student') {
            return {
                totalBalance: '2,481.60',
                cards: [
                    {
                        bank: '招商银行',
                        type: '普通借记卡',
                        last4: '2408',
                        balance: '1,233.48',
                        theme: 'red',
                        transactions: [
                            { date: '04-09 08:14', title: '食堂充值', amount: '-50.00', status: '交易成功' },
                            { date: '04-08 22:36', title: '淘宝', amount: '-89.00', status: '交易成功' },
                            { date: '04-08 18:02', title: '微信转账-给她准备的小东西', amount: '-66.00', status: '交易成功' },
                            { date: '04-07 12:45', title: '美团外卖', amount: '-24.50', status: '交易成功' }
                        ]
                    },
                    {
                        bank: '中国银行',
                        type: '校园卡',
                        last4: '5712',
                        balance: '1,248.12',
                        theme: 'blue',
                        transactions: [
                            { date: '04-07 15:21', title: '兼职结算', amount: '320.00', status: '交易成功' },
                            { date: '04-06 23:08', title: 'QQ音乐会员自动续费', amount: '-15.00', status: '交易成功' },
                            { date: '04-06 13:22', title: '奖学金入账', amount: '600.00', status: '交易成功' },
                            { date: '04-05 20:44', title: '图书资料费', amount: '-128.00', status: '交易成功' }
                        ]
                    }
                ],
                transactions: [
                    { date: '04-09 08:14', title: '食堂充值', amount: '-50.00', status: '交易成功' },
                    { date: '04-08 22:36', title: '淘宝', amount: '-89.00', status: '交易成功' },
                    { date: '04-07 15:21', title: '兼职结算', amount: '320.00', status: '交易成功' },
                    { date: '04-06 13:22', title: '奖学金入账', amount: '600.00', status: '交易成功' }
                ]
            };
        }
        if (mode === 'fighter') {
            return {
                totalBalance: '186,420.00',
                cards: [
                    {
                        bank: '工商银行',
                        type: '白金借记卡',
                        last4: '1688',
                        balance: '92,360.00',
                        theme: 'black',
                        transactions: [
                            { date: '04-08 13:27', title: '赛事分成入账', amount: '45,000.00', status: '交易成功' },
                            { date: '04-06 09:12', title: '固定转账-匿名账户', amount: '-5,000.00', status: '交易成功' },
                            { date: '04-05 18:44', title: '商业代言尾款', amount: '28,000.00', status: '交易成功' },
                            { date: '04-05 10:10', title: '团队差旅报销', amount: '3,260.00', status: '交易成功' }
                        ]
                    },
                    {
                        bank: '建设银行',
                        type: '商务卡',
                        last4: '4421',
                        balance: '94,060.00',
                        theme: 'gold',
                        transactions: [
                            { date: '04-09 10:18', title: '康复治疗中心', amount: '-1,200.00', status: '交易成功' },
                            { date: '04-08 21:05', title: '拳馆器材采购', amount: '-8,600.00', status: '交易成功' },
                            { date: '04-07 23:42', title: '深夜便利店', amount: '-63.00', status: '交易成功' },
                            { date: '04-07 17:16', title: '营养补剂', amount: '-980.00', status: '交易成功' }
                        ]
                    }
                ],
                transactions: [
                    { date: '04-08 13:27', title: '赛事分成入账', amount: '45,000.00', status: '交易成功' },
                    { date: '04-09 10:18', title: '康复治疗中心', amount: '-1,200.00', status: '交易成功' },
                    { date: '04-08 21:05', title: '拳馆器材采购', amount: '-8,600.00', status: '交易成功' },
                    { date: '04-05 18:44', title: '商业代言尾款', amount: '28,000.00', status: '交易成功' }
                ]
            };
        }
        return {
            totalBalance: '1,286,420.00',
            cards: [
                {
                    bank: '招商银行',
                    type: '黑金卡',
                    last4: '8888',
                    balance: '986,420.00',
                    theme: 'black',
                    transactions: [
                        { date: '04-09 09:10', title: '工资入账', amount: '86,000.00', status: '交易成功' },
                        { date: '04-08 14:08', title: '固定转账-保密账户', amount: '-12,000.00', status: '交易成功' },
                        { date: '04-07 16:30', title: '季度分红', amount: '120,000.00', status: '交易成功' },
                        { date: '04-06 10:48', title: '项目回款', amount: '38,800.00', status: '交易成功' }
                    ]
                },
                {
                    bank: '浦发银行',
                    type: '白金卡',
                    last4: '2406',
                    balance: '300,000.00',
                    theme: 'gold',
                    transactions: [
                        { date: '04-09 01:24', title: '美团外卖', amount: '-48.00', status: '交易成功' },
                        { date: '04-08 19:46', title: '京东', amount: '-3,280.00', status: '交易成功' },
                        { date: '04-07 22:11', title: '心理咨询费', amount: '-1,500.00', status: '交易成功' },
                        { date: '04-07 11:02', title: roleName + '的订阅服务', amount: '-98.00', status: '交易成功' }
                    ]
                }
            ],
            transactions: [
                { date: '04-09 09:10', title: '工资入账', amount: '86,000.00', status: '交易成功' },
                { date: '04-09 01:24', title: '美团外卖', amount: '-48.00', status: '交易成功' },
                { date: '04-08 14:08', title: '固定转账-保密账户', amount: '-12,000.00', status: '交易成功' },
                { date: '04-07 16:30', title: '季度分红', amount: '120,000.00', status: '交易成功' }
            ]
        };
    }

    function normalizeShadowAssetsCard(item, index) {
        const row = asObject(item);
        const last4Raw = asString(row.last4 || row.tail || row.cardNo || row.cardNumber || '');
        const digits = last4Raw.replace(/\D/g, '');
        return {
            bank: asString(row.bank || row.bankName || ('账户 ' + String(index + 1))),
            type: asString(row.type || row.level || row.cardType || '普通借记卡'),
            last4: (digits.slice(-4) || '000' + String(index + 1)).slice(-4),
            balance: normalizeShadowAssetsAmount(row.balance || row.amount || row.remaining || '0.00', ''),
            theme: normalizeShadowAssetsTheme(row.theme || row.color),
            transactions: []
        };
    }

    function normalizeShadowAssetsTransaction(item, index) {
        const row = asObject(item);
        const title = asString(row.title || row.name || row.counterparty || row.merchant || ('交易 ' + String(index + 1)));
        const amountRaw = asString(row.amount || row.money || row.value || '0.00');
        const status = asString(row.status || row.state || '交易成功');
        return {
            date: asString(row.date || row.time || row.createdAt || ('04-0' + String((index % 8) + 1) + ' 12:00')),
            title: title,
            amount: normalizeShadowAssetsAmount(amountRaw, /^\s*-/.test(amountRaw) ? '-' : ''),
            status: status
        };
    }

    function normalizeShadowAssetsData(payload, context) {
        const data = asObject(payload);
        const fallback = buildShadowAssetsFallbackData(context);
        const topLevelTransactions = (Array.isArray(data.transactions) ? data.transactions : (Array.isArray(data.records) ? data.records : [])).map(function (item, index) {
            return normalizeShadowAssetsTransaction(item, index);
        }).filter(function (item) {
            return !!asString(item.title);
        }).slice(0, 12);
        let cards = (Array.isArray(data.cards) ? data.cards : []).map(function (item, index) {
            const normalizedCard = normalizeShadowAssetsCard(item, index);
            const row = asObject(item);
            const cardTransactions = (Array.isArray(row.transactions) ? row.transactions : []).map(function (tx, txIndex) {
                return normalizeShadowAssetsTransaction(tx, txIndex);
            }).filter(function (tx) {
                return !!asString(tx.title);
            }).slice(0, 8);
            normalizedCard.transactions = cardTransactions;
            return normalizedCard;
        }).filter(function (item) {
            return !!asString(item.bank);
        }).slice(0, 4);
        let transactions = topLevelTransactions.slice(0, 10);

        if (!cards.length) {
            cards = fallback.cards.map(function (item, index) {
                const normalizedCard = normalizeShadowAssetsCard(item, index);
                normalizedCard.transactions = (Array.isArray(item.transactions) ? item.transactions : []).map(function (tx, txIndex) {
                    return normalizeShadowAssetsTransaction(tx, txIndex);
                });
                return normalizedCard;
            });
        }
        if (!transactions.length) {
            transactions = fallback.transactions.map(function (item, index) {
                return normalizeShadowAssetsTransaction(item, index);
            });
        }

        cards = cards.map(function (card, index) {
            const nextCard = Object.assign({}, card);
            if (Array.isArray(nextCard.transactions) && nextCard.transactions.length) {
                nextCard.transactions = nextCard.transactions.slice(0, 8);
                return nextCard;
            }
            const fallbackCard = asObject(fallback.cards[index] || fallback.cards[0]);
            const fallbackTx = Array.isArray(fallbackCard.transactions) ? fallbackCard.transactions : [];
            nextCard.transactions = (fallbackTx.length ? fallbackTx : transactions).map(function (tx, txIndex) {
                return normalizeShadowAssetsTransaction(tx, txIndex);
            }).slice(0, 8);
            return nextCard;
        });

        return {
            totalBalance: normalizeShadowAssetsAmount(data.totalBalance || data.balance || data.total || fallback.totalBalance, ''),
            cards: cards.slice(0, 4),
            transactions: transactions.slice(0, 10)
        };
    }

    function isValidShadowAssetsData(payload) {
        const data = asObject(payload);
        const cards = Array.isArray(data.cards) ? data.cards : [];
        const transactions = Array.isArray(data.transactions) ? data.transactions : [];
        return !!asString(data.totalBalance) && (cards.length > 0 || transactions.length > 0);
    }

    function buildShadowHealthFallbackData(context) {
        const mode = inferShadowWorkMode(context);
        if (mode === 'student') {
            return {
                overview: { steps: '6214', calories: '314' },
                sleep: { duration: '5h 12m', bedTime: '01:43', wakeTime: '07:08', quality: '睡眠不足', note: '深度睡眠偏少，上午注意补水和减少咖啡因。', score: '71', deep: '58m', light: '2h 49m', rem: '1h 05m', awake: '20m' },
                workouts: [
                    { type: '校园快走', time: '昨天 18:20', duration: '34分钟', burn: '126千卡' }
                ],
                heartRate: { avg: '78 BPM', max: '132 BPM', anomaly: '凌晨 02:14 处于静息状态，但心率短时升至 132 BPM。' }
            };
        }
        if (mode === 'fighter') {
            return {
                overview: { steps: '14288', calories: '934' },
                sleep: { duration: '4h 47m', bedTime: '02:08', wakeTime: '06:55', quality: '恢复不足', note: '高强度训练后睡眠时长仍偏低，建议延长恢复窗口。', score: '64', deep: '46m', light: '2h 34m', rem: '1h 01m', awake: '26m' },
                workouts: [
                    { type: '高强度搏击训练', time: '今天 08:10', duration: '1小时26分钟', burn: '612千卡' },
                    { type: '夜间拉伸恢复', time: '昨天 23:18', duration: '22分钟', burn: '88千卡' }
                ],
                heartRate: { avg: '84 BPM', max: '176 BPM', anomaly: '凌晨 01:57 已停止活动 20 分钟后，心率仍维持在 128 BPM。' }
            };
        }
        return {
            overview: { steps: '8836', calories: '468' },
            sleep: { duration: '3h 48m', bedTime: '02:31', wakeTime: '06:19', quality: '严重失眠', note: '深度睡眠极度不足，全天可能伴随注意力下降和情绪波动。', score: '53', deep: '32m', light: '2h 11m', rem: '49m', awake: '16m' },
            workouts: [
                { type: '夜跑', time: '昨天 22:06', duration: '41分钟', burn: '302千卡' },
                { type: '通勤步行', time: '昨天 18:40', duration: '19分钟', burn: '66千卡' }
            ],
            heartRate: { avg: '76 BPM', max: '130 BPM', anomaly: '凌晨 02:14 处于静息状态，但心率飙升至 130 BPM。' }
        };
    }

    function normalizeShadowHealthWorkout(item, index) {
        const row = asObject(item);
        return {
            type: asString(row.type || row.name || row.workout || ('训练 ' + String(index + 1))),
            time: asString(row.time || row.date || row.when || '最近'),
            duration: asString(row.duration || row.length || '30分钟'),
            burn: asString(row.burn || row.calories || row.energy || '0千卡')
        };
    }

    function normalizeShadowHealthData(payload, context) {
        const data = asObject(payload);
        const fallback = buildShadowHealthFallbackData(context);
        const overviewRaw = asObject(data.overview || {});
        const sleepRaw = asObject(data.sleep || {});
        const heartRaw = asObject(data.heartRate || data.heart || {});
        const workoutsRaw = Array.isArray(data.workouts) ? data.workouts : (Array.isArray(data.training) ? data.training : []);
        let workouts = workoutsRaw.map(function (item, index) {
            return normalizeShadowHealthWorkout(item, index);
        }).filter(function (item) {
            return !!asString(item.type);
        }).slice(0, 6);
        if (!workouts.length && Array.isArray(fallback.workouts)) {
            workouts = fallback.workouts.map(function (item, index) {
                return normalizeShadowHealthWorkout(item, index);
            });
        }

        return {
            overview: {
                steps: asString(overviewRaw.steps || overviewRaw.stepCount || fallback.overview.steps),
                calories: asString(overviewRaw.calories || overviewRaw.energy || fallback.overview.calories)
            },
            sleep: {
                duration: asString(sleepRaw.duration || sleepRaw.total || fallback.sleep.duration),
                bedTime: asString(sleepRaw.bedTime || sleepRaw.sleepAt || fallback.sleep.bedTime),
                wakeTime: asString(sleepRaw.wakeTime || sleepRaw.wakeAt || fallback.sleep.wakeTime),
                quality: asString(sleepRaw.quality || sleepRaw.status || fallback.sleep.quality),
                note: asString(sleepRaw.note || sleepRaw.comment || fallback.sleep.note),
                score: asString(sleepRaw.score || sleepRaw.rating || fallback.sleep.score),
                deep: asString(sleepRaw.deep || sleepRaw.deepSleep || fallback.sleep.deep),
                light: asString(sleepRaw.light || sleepRaw.lightSleep || fallback.sleep.light),
                rem: asString(sleepRaw.rem || sleepRaw.remSleep || fallback.sleep.rem),
                awake: asString(sleepRaw.awake || sleepRaw.awakeTime || sleepRaw.awakenings || fallback.sleep.awake)
            },
            workouts: workouts,
            heartRate: {
                avg: asString(heartRaw.avg || heartRaw.average || fallback.heartRate.avg),
                max: asString(heartRaw.max || heartRaw.peak || fallback.heartRate.max),
                anomaly: asString(heartRaw.anomaly || heartRaw.alert || fallback.heartRate.anomaly)
            }
        };
    }

    function isValidShadowHealthData(payload) {
        const data = asObject(payload);
        const overview = asObject(data.overview || {});
        const sleep = asObject(data.sleep || {});
        const heartRate = asObject(data.heartRate || {});
        return !!asString(overview.steps) && !!asString(overview.calories) && !!asString(sleep.duration) && !!asString(heartRate.avg);
    }

    function normalizeShadowFoodPrice(value) {
        const raw = asString(value);
        if (!raw) return '0';
        const match = raw.replace(/[,\s]/g, '').match(/(\d+(\.\d+)?)/);
        return match ? match[1] : raw.replace(/[￥¥]/g, '') || '0';
    }

    function buildShadowFoodFallbackData(context) {
        const roleName = asString(context && context.roleName) || 'TA';
        return {
            orders: [
                { date: '今天 12:14', shop: '山雨轻食厨房', items: '香煎鸡胸藜麦碗 + 冰美式', price: '39', thought: '下午还有安排，先吃得干净一点，别让脑子更钝。', relatedToUser: false },
                { date: '昨天 21:48', shop: '旧街砂锅粥', items: '鲜虾排骨粥 + 小菜', price: '32', thought: '太晚了，热一点的东西至少能把人安静下来。', relatedToUser: false },
                { date: '周一 18:36', shop: '晚风居酒屋', items: '给你点的玉子烧 + 自己的盐烤鸡皮 + 梅子酒', price: '92', thought: '明明只是顺手加了一份你会喜欢的，但下单的时候还是停了两秒。', relatedToUser: true },
                { date: '周日 13:05', shop: '青禾汤面', items: '番茄肥牛面 + 溏心蛋', price: '27', thought: roleName + '今天没什么胃口，但总得先吃一点。', relatedToUser: false }
            ]
        };
    }

    function normalizeShadowFoodOrder(item, index) {
        const row = asObject(item);
        return {
            date: asString(row.date || row.time || row.orderTime || ('最近-' + String(index + 1))),
            shop: asString(row.shop || row.store || row.restaurant || row.vendor || ('外卖店铺' + String(index + 1))),
            items: asString(row.items || row.item || row.food || row.dishes || row.products || '临时点的单人餐'),
            price: normalizeShadowFoodPrice(row.price || row.amount || row.cost || row.total),
            thought: asString(row.thought || row.idea || row.innerThought || row.note || row.comment || '下单的时候没有多想，只是觉得现在需要这一口。'),
            relatedToUser: normalizeShadowMemoBoolean(row.relatedToUser || row.forUser || row.userOrder || row.isGift, false)
        };
    }

    function normalizeShadowFoodData(payload, context) {
        const data = asObject(payload);
        const fallback = buildShadowFoodFallbackData(context);
        const source = Array.isArray(data.orders)
            ? data.orders
            : (Array.isArray(data.items) ? data.items : (Array.isArray(data.history) ? data.history : []));
        let orders = source.slice(0, 8).map(function (item, index) {
            return normalizeShadowFoodOrder(item, index);
        }).filter(function (item) {
            return !!asString(item.shop) && !!asString(item.items);
        });

        if (!orders.length) {
            orders = fallback.orders.map(function (item, index) {
                return normalizeShadowFoodOrder(item, index);
            });
        } else if (orders.length < 4) {
            for (let i = orders.length; i < 4 && i < fallback.orders.length; i++) {
                orders.push(normalizeShadowFoodOrder(fallback.orders[i], i));
            }
        }

        return { orders: orders.slice(0, 6) };
    }

    function isValidShadowFoodData(payload) {
        const data = asObject(payload);
        const orders = Array.isArray(data.orders) ? data.orders : [];
        return orders.some(function (item) {
            const row = asObject(item);
            return !!asString(row.shop) && !!asString(row.items);
        });
    }

    function buildShadowGameFallbackData(context) {
        const mode = inferShadowWorkMode(context);
        if (mode === 'student') {
            return {
                games: [
                    {
                        name: '王者荣耀',
                        platform: 'Mobile',
                        icon: '⚔',
                        totalHours: '426小时',
                        lastOnline: '昨晚 23:48',
                        recentSessions: [
                            { time: '昨晚 22:10', duration: '1小时12分钟', result: '排位2胜1负，最后一把补位辅助。' },
                            { time: '周二 21:30', duration: '46分钟', result: '和朋友三排，连跪后直接下线。' }
                        ]
                    },
                    {
                        name: '原神',
                        platform: 'Mobile',
                        icon: '✦',
                        totalHours: '188小时',
                        lastOnline: '3天前',
                        recentSessions: [
                            { time: '周日 20:15', duration: '38分钟', result: '清日常，顺手把树脂花掉。' },
                            { time: '上周五 00:08', duration: '1小时', result: '剧情推进到一半，后来被消息打断。' }
                        ]
                    }
                ]
            };
        }
        if (mode === 'fighter') {
            return {
                games: [
                    {
                        name: 'EA SPORTS FC 25',
                        platform: 'PS5',
                        icon: '⚽',
                        totalHours: '71小时',
                        lastOnline: '昨天凌晨 1:12',
                        recentSessions: [
                            { time: '昨天 00:21', duration: '52分钟', result: '在线赛2连胜，最后一局补时绝杀。' },
                            { time: '周一 23:44', duration: '35分钟', result: '友谊赛热手，踢完就关机。' }
                        ]
                    },
                    {
                        name: '极限竞速：地平线 5',
                        platform: 'Steam',
                        icon: '🏁',
                        totalHours: '49小时',
                        lastOnline: '上周',
                        recentSessions: [
                            { time: '上周六 21:10', duration: '44分钟', result: '只跑了两圈山路，更多是在放空。' }
                        ]
                    }
                ]
            };
        }
        return {
            games: [
                {
                    name: 'CS2',
                    platform: 'Steam',
                    icon: '🎯',
                    totalHours: '312小时',
                    lastOnline: '昨晚 01:26',
                    recentSessions: [
                        { time: '昨晚 00:02', duration: '1小时18分钟', result: '竞技模式两连胜，残局 1v2 翻盘。' },
                        { time: '周二 22:40', duration: '54分钟', result: '热身服练枪后打了一把就退。' }
                    ]
                },
                {
                    name: '塞尔达传说 王国之泪',
                    platform: 'Switch',
                    icon: '🗡',
                    totalHours: '96小时',
                    lastOnline: '4天前',
                    recentSessions: [
                        { time: '周日 19:30', duration: '1小时6分钟', result: '清了一个神庙，后来在高处挂机看风景。' },
                        { time: '上周四 23:15', duration: '42分钟', result: '素材采到一半，被工作消息叫走。' }
                    ]
                },
                {
                    name: '王者荣耀',
                    platform: 'Mobile',
                    icon: '👑',
                    totalHours: '128小时',
                    lastOnline: '昨天',
                    recentSessions: [
                        { time: '昨天 21:12', duration: '33分钟', result: '打了两把匹配，输一赢一。' }
                    ]
                }
            ]
        };
    }

    function normalizeShadowGameSession(item, index) {
        const row = asObject(item);
        return {
            time: asString(row.time || row.date || row.when || ('最近-' + String(index + 1))),
            duration: asString(row.duration || row.length || row.hours || '30分钟'),
            result: asString(row.result || row.summary || row.progress || row.status || '挂着看了一会儿就退了。')
        };
    }

    function normalizeShadowGameItem(item, index) {
        const row = asObject(item);
        const sessionsSource = Array.isArray(row.recentSessions)
            ? row.recentSessions
            : (Array.isArray(row.sessions) ? row.sessions : (Array.isArray(row.records) ? row.records : []));
        return {
            name: asString(row.name || row.title || ('游戏' + String(index + 1))),
            platform: asString(row.platform || row.device || 'Mobile'),
            icon: asString(row.icon || row.badge || row.symbol || '🎮'),
            totalHours: asString(row.totalHours || row.hours || row.playTime || '0小时'),
            lastOnline: asString(row.lastOnline || row.lastPlayed || row.onlineAt || '最近'),
            recentSessions: sessionsSource.slice(0, 4).map(function (session, sessionIndex) {
                return normalizeShadowGameSession(session, sessionIndex);
            }).filter(function (session) {
                return !!asString(session.result);
            })
        };
    }

    function normalizeShadowGameData(payload, context) {
        const data = asObject(payload);
        const fallback = buildShadowGameFallbackData(context);
        const source = Array.isArray(data.games)
            ? data.games
            : (Array.isArray(data.items) ? data.items : (Array.isArray(data.records) ? data.records : []));
        let games = source.slice(0, 5).map(function (item, index) {
            return normalizeShadowGameItem(item, index);
        }).filter(function (item) {
            return !!asString(item.name);
        });

        if (!games.length) {
            games = fallback.games.map(function (item, index) {
                return normalizeShadowGameItem(item, index);
            });
        } else if (games.length < 2) {
            for (let i = games.length; i < 2 && i < fallback.games.length; i++) {
                games.push(normalizeShadowGameItem(fallback.games[i], i));
            }
        }

        games = games.map(function (item, index) {
            if (Array.isArray(item.recentSessions) && item.recentSessions.length) return item;
            const fallbackItem = fallback.games[index % fallback.games.length];
            return Object.assign({}, item, {
                recentSessions: fallbackItem && Array.isArray(fallbackItem.recentSessions)
                    ? fallbackItem.recentSessions.map(function (session, sessionIndex) {
                        return normalizeShadowGameSession(session, sessionIndex);
                    })
                    : []
            });
        });

        return { games: games.slice(0, 3) };
    }

    function isValidShadowGameData(payload) {
        const data = asObject(payload);
        const games = Array.isArray(data.games) ? data.games : [];
        return games.some(function (item) {
            const row = asObject(item);
            return !!asString(row.name) && !!asString(row.platform);
        });
    }

    function buildShadowCallsFallbackData(context) {
        const roleName = asString(context && context.roleName) || 'TA';
        return {
            calls: [
                { name: '林总', time: '今天 09:12', type: '呼出', duration: '00:46', detail: '围绕并购方案的风险条款快速确认，对方连问三次执行窗口，他只给了一个明确时间点，语气干净利落。' },
                { name: '未备注号码', time: '昨天 23:41', type: '呼入', duration: '1小时07分', detail: '前半段几乎都在听，对方情绪反复，后半段才慢慢把重点说清。整通电话没有争执，但压抑感很重。' },
                { name: '妈妈', time: '昨天 20:06', type: '拒接', attempts: 3, duration: '未接听', detail: '连续三通来电都被挂断，屏幕亮了又灭，只剩系统提示音在房间里反复响起。' },
                { name: '你', time: '昨天 19:28', type: '未接', attempts: 2, duration: '未接听', detail: '来电在会议中错过，结束后他盯着未接提醒看了很久，最终只把手机扣在桌面上。' },
                { name: '行政前台', time: '昨天 16:50', type: '呼入', duration: '00:12', detail: '仅确认访客到访时间与会议室安排，标准流程对话，没有多余寒暄。' },
                { name: roleName + '的司机', time: '周二 08:03', type: '呼出', duration: '03:18', detail: '快速确认路线与到达时点，强调避开高峰路段，末尾补了一句“提前五分钟到”。' }
            ]
        };
    }

    function normalizeShadowCallType(value) {
        const text = asString(value).toLowerCase();
        if (/拒接|rejected|declined/.test(text)) return '拒接';
        if (/未接|missed|noanswer|miss/.test(text)) return '未接';
        if (/呼出|outgoing|outbound|去电/.test(text)) return '呼出';
        if (/呼入|incoming|inbound|来电/.test(text)) return '呼入';
        return '呼入';
    }

    function normalizeShadowCallAttempts(type, row) {
        if (type !== '未接' && type !== '拒接') return 0;
        const data = asObject(row);
        const typeText = asString(data.type || data.direction || data.status);
        const typeMatched = typeText.match(/([0-9]{1,2})\s*次/);
        let count = clampNumber(typeMatched ? typeMatched[1] : (data.attempts || data.count || data.times || data.missedCount || 0), 0, 99);
        if (count <= 0) count = 1;
        return count;
    }

    function normalizeShadowCallDuration(type, value) {
        const text = asString(value);
        if (type === '未接' || type === '拒接') return text || '未接听';
        return text || '00:00';
    }

    function buildShadowCallDetail(type, row) {
        const detail = asString(row.detail || row.summary || row.note || row.content || row.memo || row.description);
        if (detail) return detail;
        if (type === '未接' || type === '拒接') {
            return '来电在短时间内重复出现，系统记录了连续提示音。最终没有接通，气氛明显带着回避和迟疑。';
        }
        return '通话围绕当下事务推进，信息交换效率很高，但对话里仍能听出隐约的情绪起伏。';
    }

    function normalizeShadowCallItem(item, index) {
        const row = asObject(item);
        const type = normalizeShadowCallType(row.type || row.direction || row.status);
        const attempts = normalizeShadowCallAttempts(type, row);
        const displayType = (type === '未接' || type === '拒接') ? (type + '(' + String(attempts) + '次)') : type;
        return {
            name: asString(row.name || row.contact || row.phone || row.number || ('联系人' + String(index + 1))),
            time: asString(row.time || row.date || row.when || '最近'),
            type: displayType,
            duration: normalizeShadowCallDuration(type, row.duration || row.length || row.talkTime),
            detail: buildShadowCallDetail(type, row)
        };
    }

    function normalizeShadowCallsData(payload, context) {
        const data = asObject(payload);
        const fallback = buildShadowCallsFallbackData(context);
        const source = Array.isArray(data.calls)
            ? data.calls
            : (Array.isArray(data.records) ? data.records : (Array.isArray(data.items) ? data.items : []));
        let calls = source.slice(0, 10).map(function (item, index) {
            return normalizeShadowCallItem(item, index);
        }).filter(function (item) {
            return !!asString(item.name) && !!asString(item.time);
        });

        if (!calls.length) {
            calls = fallback.calls.map(function (item, index) {
                return normalizeShadowCallItem(item, index);
            });
        } else if (calls.length < 6) {
            for (let i = calls.length; i < 6 && i < fallback.calls.length; i++) {
                calls.push(normalizeShadowCallItem(fallback.calls[i], i));
            }
        }
        return { calls: calls.slice(0, 8) };
    }

    function isValidShadowCallsData(payload) {
        const data = asObject(payload);
        const calls = Array.isArray(data.calls) ? data.calls : [];
        return calls.some(function (item) {
            const row = asObject(item);
            return !!asString(row.name) && !!asString(row.time) && !!asString(row.type) && !!asString(row.duration) && !!asString(row.detail);
        });
    }

    function buildShadowSMSFallbackData(context) {
        const roleName = asString(context && context.roleName) || 'TA';
        return {
            threads: [
                {
                    sender: '95588',
                    time: '10:18',
                    isUnread: false,
                    messages: [
                        { from: '对方', content: '您尾号4821账户支出人民币4,800.00元，余额128,430.22元。', time: '10:18' }
                    ]
                },
                {
                    sender: '顺丰速运',
                    time: '昨天 18:42',
                    isUnread: false,
                    messages: [
                        { from: '对方', content: '您的快件已签收，签收人：前台。若非本人签收请及时联系。', time: '昨天 18:42' }
                    ]
                },
                {
                    sender: '某心理健康平台',
                    time: '昨天 02:14',
                    isUnread: true,
                    messages: [
                        { from: '对方', content: '登录验证码 482913，5 分钟内有效。非本人操作请忽略。', time: '昨天 02:14' }
                    ]
                },
                {
                    sender: '妈妈',
                    time: '周二 22:06',
                    isUnread: true,
                    messages: [
                        { from: '对方', content: roleName + '，你很久没回家了。至少回个消息，让我知道你平安。', time: '周二 22:06' },
                        { from: '对方', content: '我不是要管你，只是担心你。', time: '周二 22:14' },
                        { from: '自己', content: '知道了。', time: '周二 23:31' }
                    ]
                },
                {
                    sender: '陌生号码',
                    time: '周一 01:52',
                    isUnread: true,
                    messages: [
                        { from: '对方', content: '你把我拉黑也没用，我只是想把话说完。', time: '周一 01:52' },
                        { from: '对方', content: '那天之后我一直睡不好，你至少回我一句。', time: '周一 01:58' },
                        { from: '自己', content: '不要再发了。', time: '周一 02:11' }
                    ]
                }
            ]
        };
    }

    function normalizeShadowSMSFrom(value) {
        const text = asString(value).toLowerCase();
        if (/^(自己|self|me|我方|mine)$/.test(text)) return '自己';
        return '对方';
    }

    function normalizeShadowSMSMessage(item, index, fallbackTime) {
        const row = asObject(item);
        return {
            from: normalizeShadowSMSFrom(row.from || row.role || row.speaker || row.side),
            content: asString(row.content || row.text || row.message || row.snippet || row.preview || ('短信内容 ' + String(index + 1))),
            time: asString(row.time || row.date || row.when || fallbackTime || '最近')
        };
    }

    function normalizeShadowSMSThread(item, index) {
        const row = asObject(item);
        const sender = asString(row.sender || row.from || row.name || row.number || ('发件人' + String(index + 1)));
        const threadTime = asString(row.time || row.date || row.when || row.lastTime || row.updatedAt || '最近');
        const sourceMessages = Array.isArray(row.messages)
            ? row.messages
            : (Array.isArray(row.chat) ? row.chat : (Array.isArray(row.records) ? row.records : []));
        let messages = sourceMessages.slice(0, 20).map(function (msg, msgIndex) {
            return normalizeShadowSMSMessage(msg, msgIndex, threadTime);
        }).filter(function (msg) {
            return !!asString(msg.content);
        });

        if (!messages.length) {
            const seed = asString(row.snippet || row.content || row.preview || row.text || '（无内容）');
            messages = [normalizeShadowSMSMessage({ from: '对方', content: seed, time: threadTime }, 0, threadTime)];
        }

        const lastMessage = messages[messages.length - 1] || {};
        return {
            sender: sender,
            time: asString(threadTime || lastMessage.time || '最近'),
            isUnread: normalizeShadowMemoBoolean(row.isUnread || row.unread || row.new, false),
            messages: messages
        };
    }

    function normalizeShadowSMSData(payload, context) {
        const data = asObject(payload);
        const fallback = buildShadowSMSFallbackData(context);
        const source = Array.isArray(data.threads)
            ? data.threads
            : (Array.isArray(data.messages) ? data.messages : (Array.isArray(data.items) ? data.items : (Array.isArray(data.inbox) ? data.inbox : [])));
        let threads = source.slice(0, 12).map(function (item, index) {
            return normalizeShadowSMSThread(item, index);
        }).filter(function (item) {
            return !!asString(item.sender) && Array.isArray(item.messages) && item.messages.length > 0;
        });

        if (!threads.length) {
            threads = fallback.threads.map(function (item, index) {
                return normalizeShadowSMSThread(item, index);
            });
        } else if (threads.length < 5) {
            for (let i = threads.length; i < 5 && i < fallback.threads.length; i++) {
                threads.push(normalizeShadowSMSThread(fallback.threads[i], i));
            }
        }
        return { threads: threads.slice(0, 7) };
    }

    function isValidShadowSMSData(payload) {
        const data = asObject(payload);
        const threads = Array.isArray(data.threads) ? data.threads : [];
        return threads.some(function (item) {
            const row = asObject(item);
            const messages = Array.isArray(row.messages) ? row.messages : [];
            return !!asString(row.sender)
                && !!asString(row.time)
                && messages.length > 0
                && messages.every(function (message) {
                    const msg = asObject(message);
                    const from = asString(msg.from);
                    return !!asString(msg.content) && (from === '对方' || from === '自己');
                });
        });
    }

    function buildShadowBrowserFallbackData() {
        return {
            history: [
                { time: '今天 09:08', query: '如何自然地开口道歉 不显得刻意', isIncognito: false, detail: '高赞回答强调先承认情绪，再给出具体行动。示例话术建议把“我怕你误会”改成“我会把这件事补上”。' },
                { time: '今天 00:42', query: '送礼物 怎样表达关心又不过界', isIncognito: true, detail: '帖子总结“轻负担礼物”清单：实用消耗品、对方提过的小偏好、附一张不施压的小卡片。评论区强调别把礼物当成交换。' },
                { time: '昨天 23:11', query: '失眠 心率突然加快 怎么缓解', isIncognito: true, detail: '医学科普页建议先排除咖啡因与情绪触发，尝试4-7-8呼吸法。若连续多晚胸闷心悸，应尽快线下就医。' },
                { time: '昨天 19:26', query: '天气转凉 适合的夜跑路线', isIncognito: false, detail: '本地跑步社区推荐沿江慢跑道，夜间照明完整，20:00后人流减少。提醒携带反光臂带并避开施工路段。' },
                { time: '周三 14:03', query: '高铁改签规则 48小时内', isIncognito: false, detail: '车票服务页列出改签费用分段规则：开车前48小时以上手续费更低，开车后仅限当日车次改签。' },
                { time: '周二 22:50', query: '创口贴 处理浅表划伤 要不要消毒', isIncognito: false, detail: '健康问答建议先清水冲洗，再使用温和消毒剂。若出现红肿热痛持续24小时，应停止自行处理并就诊。' }
            ]
        };
    }

    function buildShadowBrowserDetailText(row, index) {
        const detail = asString(row.detail || row.summary || row.content || row.article || row.fullText || row.note || row.snippet);
        if (detail) return detail;
        const query = asString(row.query || row.title || row.keyword || row.search || row.url || ('浏览记录 ' + String(index + 1)));
        const time = asString(row.time || row.date || row.when || '最近');
        const source = asString(row.source || row.site || row.platform);
        const intro = source ? ('来源：' + source + '。') : '来源：浏览器历史。';
        return [intro, '关键词：' + query + '。', '记录时间：' + time + '。', '这条记录通常和近期聊天、待办或情绪波动相关。'].join('');
    }

    function normalizeShadowBrowserItem(item, index) {
        const row = asObject(item);
        return {
            time: asString(row.time || row.date || row.when || '最近'),
            query: asString(row.query || row.title || row.keyword || row.search || row.url || ('浏览记录 ' + String(index + 1))),
            isIncognito: normalizeShadowMemoBoolean(row.isIncognito || row.incognito || row.private || row.secret, false),
            detail: buildShadowBrowserDetailText(row, index)
        };
    }

    function normalizeShadowBrowserData(payload) {
        const data = asObject(payload);
        const fallback = buildShadowBrowserFallbackData();
        const source = Array.isArray(data.history)
            ? data.history
            : (Array.isArray(data.records) ? data.records : (Array.isArray(data.items) ? data.items : []));
        let history = source.slice(0, 12).map(function (item, index) {
            return normalizeShadowBrowserItem(item, index);
        }).filter(function (item) {
            return !!asString(item.query) && !!asString(item.time);
        });

        if (!history.length) {
            history = fallback.history.map(function (item, index) {
                return normalizeShadowBrowserItem(item, index);
            });
        } else if (history.length < 6) {
            for (let i = history.length; i < 6 && i < fallback.history.length; i++) {
                history.push(normalizeShadowBrowserItem(fallback.history[i], i));
            }
        }

        const hasIncognito = history.some(function (item) { return !!item.isIncognito; });
        if (!hasIncognito && history.length) {
            history[0].isIncognito = true;
        }
        return { history: history.slice(0, 8) };
    }

    function isValidShadowBrowserData(payload) {
        const data = asObject(payload);
        const history = Array.isArray(data.history) ? data.history : [];
        return history.some(function (item) {
            const row = asObject(item);
            return !!asString(row.time) && !!asString(row.query);
        });
    }

    function buildShadowPhotosFallbackData() {
        return {
            camera: [
                { date: '今天 08:14', location: '窗边餐桌', description: '瓷杯边缘残留一圈浅色咖啡痕，旁边摊开的便签写着用户名字缩写。', isHidden: false, aboutUser: true },
                { date: '昨天 21:36', location: '地库出口', description: '车灯在潮湿地面上拉出长反光，镜头边缘有指尖遮挡造成的暗角。', isHidden: false, aboutUser: false },
                { date: '昨天 00:42', location: '玄关镜面', description: '镜面里只拍到半边肩线和手机壳背面，通知栏停着与用户有关的未读提醒。', isHidden: true, aboutUser: true },
                { date: '周三 18:09', location: '办公桌面', description: '会议资料压着一张取件单，右上角手写了“记得给她带过去”。', isHidden: false, aboutUser: true }
            ],
            videos: [
                { title: '夜雨路口', duration: '00:21', date: '今天 00:58', location: '高架匝道', description: '镜头先对准雨刷节奏，随后慢慢移向空荡路口，环境音里能听见导航重复播报。', isHidden: false, aboutUser: false },
                { title: '语音前的犹豫', duration: '00:17', date: '昨天 23:17', location: '聊天页录屏', description: '录屏停留在语音按钮上方数秒，输入框里反复删改，最后还是没发送。', isHidden: true, aboutUser: true },
                { title: '候车站台', duration: '00:26', date: '周二 19:22', location: '城际站台', description: '视频里先是检票口电子屏，再转到并排空座，最后定格在两杯未开封的水上。', isHidden: false, aboutUser: true },
                { title: '办公室空景', duration: '00:13', date: '周一 22:03', location: '工位区域', description: '全程无人物，只有空调和键盘余音，时间戳跳到深夜后画面结束。', isHidden: false, aboutUser: false }
            ],
            screenshots: [
                { date: '今天 10:12', location: '微信保存', description: '截图是用户发来的行程消息，重点位置被标了浅色荧光线。', isHidden: false, aboutUser: true },
                { date: '昨天 15:40', location: '地图App', description: '路线页保存了两处地点之间的最短步行方案，备注栏写着“别迟到”。', isHidden: false, aboutUser: false },
                { date: '昨天 01:09', location: '备忘录', description: '备忘录里只留下一句“先别说重话”，上下文被裁掉。', isHidden: true, aboutUser: true },
                { date: '周三 11:31', location: '浏览器页面', description: '截图停在“如何把道歉说清楚”问题页，收藏图标处于已点亮状态。', isHidden: false, aboutUser: false }
            ]
        };
    }

    function normalizeShadowPhotoType(value, fallbackType) {
        const text = asString(value).toLowerCase();
        if (/video|clip|录像|视频/.test(text)) return 'video';
        if (/screenshot|screen|capture|截图/.test(text)) return 'screenshot';
        if (/camera|photo|相机|拍摄/.test(text)) return 'camera';
        return fallbackType || 'camera';
    }

    function normalizeShadowPhotoDuration(value) {
        const text = asString(value);
        return text || '00:18';
    }

    function normalizeShadowPhotoAboutUser(row) {
        const data = asObject(row);
        if (data.aboutUser === true || data.aboutUser === false) return !!data.aboutUser;
        if (data.isUserRelated === true || data.relatedToUser === true) return true;
        const text = asString(data.description || data.content || data.desc || '');
        return /用户|玩家|与你|你发来|对方|她\(玩家\)/.test(text);
    }

    function normalizeShadowPhotoItem(item, index, defaultType) {
        const row = asObject(item);
        const type = normalizeShadowPhotoType(row.type || row.kind || row.category, defaultType || 'camera');
        let description = asString(row.description || row.desc || row.caption || row.content || '');
        if (!description) {
            description = '画面主体被完整保留下来，边缘还留着环境光影和停顿过的痕迹，不像随手拍，更像反复回看后舍不得删掉的一段记录。';
        }
        if (description.length < 24) {
            if (type === 'video') {
                description += ' 镜头不是一晃而过，而是有明显停顿和转向，能看出拍摄的人在刻意确认画面里的内容。';
            } else if (type === 'screenshot') {
                description += ' 截图范围没有裁干净，状态栏、页面按钮和重点文字都一起留在了画面里。';
            } else {
                description += ' 画面边缘还留着桌面反光、人物动作或环境痕迹，能看出这不是一句话能概括掉的内容。';
            }
        }
        return {
            type: type,
            title: asString(row.title || row.name || (type === 'video' ? ('视频片段 ' + String(index + 1)) : '')),
            date: asString(row.date || row.time || row.day || '最近'),
            location: asString(row.location || row.source || row.from || '未知来源'),
            description: description,
            duration: type === 'video' ? normalizeShadowPhotoDuration(row.duration || row.length || row.videoDuration) : '',
            isHidden: normalizeShadowMemoBoolean(row.isHidden || row.hidden || row.private || row.secret, false),
            aboutUser: normalizeShadowPhotoAboutUser(row)
        };
    }

    function ensureShadowPhotosAboutUserRatio(camera, videos, screenshots) {
        const list = camera.concat(videos).concat(screenshots);
        const target = Math.ceil(list.length * 0.4);
        let current = list.filter(function (item) { return !!item.aboutUser; }).length;
        if (current >= target) return;
        for (let i = 0; i < list.length && current < target; i++) {
            if (list[i].aboutUser) continue;
            list[i].aboutUser = true;
            if (!/用户|玩家|与你/.test(asString(list[i].description))) {
                list[i].description = asString(list[i].description) + ' 画面里有与用户相关的线索。';
            }
            current += 1;
        }
    }

    function ensureShadowPhotosHiddenMix(list) {
        const items = Array.isArray(list) ? list : [];
        if (!items.length) return;
        const desired = Math.max(1, Math.min(2, Math.round(items.length * 0.4)));
        let current = items.filter(function (item) { return !!item.isHidden; }).length;
        for (let i = items.length - 1; i >= 0 && current < desired; i--) {
            if (items[i].isHidden) continue;
            items[i].isHidden = true;
            current += 1;
        }
    }

    function normalizeShadowPhotoSection(source, fallback, sectionType) {
        const input = Array.isArray(source) ? source : [];
        const backup = Array.isArray(fallback) ? fallback : [];
        let list = input.slice(0, 12).map(function (item, index) {
            return normalizeShadowPhotoItem(item, index, sectionType);
        }).filter(function (item) {
            return !!asString(item.date) && !!asString(item.location) && !!asString(item.description);
        });
        if (!list.length) {
            list = backup.map(function (item, index) {
                return normalizeShadowPhotoItem(item, index, sectionType);
            });
        } else if (list.length < 4) {
            for (let i = list.length; i < 4 && i < backup.length; i++) {
                list.push(normalizeShadowPhotoItem(backup[i], i, sectionType));
            }
        }
        return list.slice(0, 6);
    }

    function normalizeShadowPhotosData(payload) {
        const data = asObject(payload);
        const fallback = buildShadowPhotosFallbackData();
        const photosField = data.photos;
        const photosObject = asObject(photosField);
        const cameraRaw = Array.isArray(data.camera)
            ? data.camera
            : (Array.isArray(photosObject.camera) ? photosObject.camera : []);
        const videosRaw = Array.isArray(data.videos)
            ? data.videos
            : (Array.isArray(data.video) ? data.video : (Array.isArray(photosObject.videos) ? photosObject.videos : []));
        const screenshotsRaw = Array.isArray(data.screenshots)
            ? data.screenshots
            : (Array.isArray(data.screenShots) ? data.screenShots : (Array.isArray(photosObject.screenshots) ? photosObject.screenshots : []));

        const legacyRaw = Array.isArray(photosField)
            ? photosField
            : (Array.isArray(data.items) ? data.items : (Array.isArray(data.records) ? data.records : []));

        const cameraMix = cameraRaw.slice();
        const videosMix = videosRaw.slice();
        const screenshotsMix = screenshotsRaw.slice();

        for (let i = 0; i < legacyRaw.length; i++) {
            const rawItem = asObject(legacyRaw[i]);
            const kind = normalizeShadowPhotoType(rawItem.type || rawItem.kind || rawItem.category, 'camera');
            if (kind === 'video') {
                videosMix.push(rawItem);
            } else if (kind === 'screenshot') {
                screenshotsMix.push(rawItem);
            } else {
                cameraMix.push(rawItem);
            }
        }

        const camera = normalizeShadowPhotoSection(cameraMix, fallback.camera, 'camera');
        const videos = normalizeShadowPhotoSection(videosMix, fallback.videos, 'video');
        const screenshots = normalizeShadowPhotoSection(screenshotsMix, fallback.screenshots, 'screenshot');
        ensureShadowPhotosAboutUserRatio(camera, videos, screenshots);
        ensureShadowPhotosHiddenMix(camera);
        ensureShadowPhotosHiddenMix(videos);
        ensureShadowPhotosHiddenMix(screenshots);

        const hiddenRaw = Array.isArray(data.hidden) ? data.hidden : [];
        const hiddenList = [];
        const hiddenSeen = {};
        function pushHidden(item, defaultType) {
            const row = normalizeShadowPhotoItem(item, hiddenList.length, defaultType);
            row.isHidden = true;
            const key = [row.type, row.date, row.location, row.description].join('|');
            if (hiddenSeen[key]) return;
            hiddenSeen[key] = true;
            hiddenList.push(row);
        }

        hiddenRaw.forEach(function (item) {
            pushHidden(item, normalizeShadowPhotoType(asObject(item).type, 'camera'));
        });
        camera.forEach(function (item) { if (item.isHidden) pushHidden(item, 'camera'); });
        videos.forEach(function (item) { if (item.isHidden) pushHidden(item, 'video'); });
        screenshots.forEach(function (item) { if (item.isHidden) pushHidden(item, 'screenshot'); });

        if (hiddenList.length < 4) {
            const pool = camera.concat(videos).concat(screenshots);
            for (let j = 0; j < pool.length && hiddenList.length < 4; j++) {
                pushHidden(pool[j], pool[j].type || 'camera');
            }
        }

        const photos = camera.concat(videos).concat(screenshots);
        return {
            camera: camera,
            videos: videos,
            screenshots: screenshots,
            photos: photos.slice(0, 18)
        };
    }

    function isValidShadowPhotosData(payload) {
        const data = asObject(payload);
        const camera = Array.isArray(data.camera) ? data.camera : [];
        const videos = Array.isArray(data.videos) ? data.videos : [];
        const screenshots = Array.isArray(data.screenshots) ? data.screenshots : [];
        if (camera.length && videos.length && screenshots.length) {
            return camera.length >= 4 && videos.length >= 4 && screenshots.length >= 4;
        }
        const photos = Array.isArray(data.photos) ? data.photos : [];
        return photos.some(function (item) {
            const row = asObject(item);
            return !!asString(row.date) && !!asString(row.location) && !!asString(row.description);
        });
    }

    function buildDefaultShadowReadingBooks(context) {
        const roleName = asString(context && context.roleName) || '角色';
        const mode = inferShadowWorkMode(context);
        if (mode === 'fighter') {
            return [
                {
                    title: '五轮书',
                    fullTitle: '五轮书',
                    author: '宫本武藏',
                    color: '#40342C',
                    progress: '61%',
                    highlights: [
                        { quote: '真正决定胜负的，常常不是爆发，而是你还能不能稳住第二回合。', note: '这句话很像我现在的日子。疼痛不是问题，节奏乱了才是。' },
                        { quote: '习惯比意志更可靠，尤其在你已经很累的时候。', note: '我不喜欢承认自己会疲惫，但身体替我承认了。还好动作训练不会说谎。' }
                    ]
                },
                {
                    title: '太阳与<br>铁',
                    fullTitle: '太阳与铁',
                    author: '三岛由纪夫',
                    color: '#8D725A',
                    progress: '28%',
                    highlights: [
                        { quote: '语言有时是苍白的，肌肉却能直接说明一切。', note: '有些解释说得再多都没有用。上台、出拳、站到最后，别人自然会闭嘴。' },
                        { quote: '身体的边界，常常也是人格的边界。', note: '我确实是靠这些边界活下来的。伤口、体重、出拳距离，没有一样可以放任。' }
                    ]
                },
                {
                    title: '夜航西<br>飞',
                    fullTitle: '夜航西飞',
                    author: '柏瑞尔·马卡姆',
                    color: '#4A5665',
                    progress: '84%',
                    highlights: [
                        { quote: '人并不是不害怕，只是学会带着恐惧继续往前。', note: '这句很准。很多时候我根本不是不怕，我只是没有退路。' },
                        { quote: '孤独有时像高空，冷，却让人看得更远。', note: '一个人待久了以后，安静反而成了必要的东西。至少不会被人轻易看穿。' }
                    ]
                }
            ];
        }
        if (mode === 'student') {
            return [
                {
                    title: '置身事<br>内',
                    fullTitle: '置身事内',
                    author: '兰小欢',
                    color: '#44506A',
                    progress: '46%',
                    highlights: [
                        { quote: '很多选择并不是最优解，只是约束条件下的可行解。', note: '我最近一直在做这种题。课、论文、社团和休息，没有一个能完全顾到。' },
                        { quote: '理解结构，比单点抱怨更重要。', note: '有时候焦虑不是因为不会做，而是没先看清整个盘面。把结构理顺，人也会冷静一点。' }
                    ]
                },
                {
                    title: '局外人',
                    fullTitle: '局外人',
                    author: '阿尔贝·加缪',
                    color: '#C3C0B6',
                    progress: '79%',
                    highlights: [
                        { quote: '人有时只是对世界缺少解释，并不是没有感受。', note: '我突然很能理解这种迟钝。不是麻木，只是不知道该怎么把心里那团东西说清楚。' },
                        { quote: '沉默并不代表空白，它也可能是负荷过重。', note: '我现在的沉默多半就是这样。脑子里太吵，反而说不出来。' }
                    ]
                },
                {
                    title: '如何阅<br>读一本书',
                    fullTitle: '如何阅读一本书',
                    author: '莫提默·J. 艾德勒',
                    color: '#6B5B4B',
                    progress: '33%',
                    highlights: [
                        { quote: '真正的阅读，是让一本书改变你的结构。', note: '我不能再只是把字看过去了。很多东西得进到脑子里，留下痕迹，才能算真的学到。' },
                        { quote: '提问能力，是阅读最重要的副产品。', note: '这句话让我有点愧疚。以前我总急着找答案，倒忘了先把问题问对。' }
                    ]
                }
            ];
        }
        if (mode === 'idol') {
            return [
                {
                    title: '只是孩<br>子',
                    fullTitle: '只是孩子',
                    author: '帕蒂·史密斯',
                    color: '#6B6E74',
                    progress: '64%',
                    highlights: [
                        { quote: '年轻时最珍贵的，不是无畏，而是愿意把自己整块交给热爱。', note: '这句看得我很安静。走到后来才发现，热爱能保住人，也最先掏空人。' },
                        { quote: '舞台之外的生活，才决定一个人会不会崩塌。', note: '我现在很需要记住这个。不是每一次发光都值得拿睡眠和情绪去换。' }
                    ]
                },
                {
                    title: '一个人<br>的朝圣',
                    fullTitle: '一个人的朝圣',
                    author: '蕾秋·乔伊斯',
                    color: '#8E9B8A',
                    progress: '37%',
                    highlights: [
                        { quote: '很多路不是因为准备好了才出发，而是因为再不走就来不及了。', note: '像极了大部分通告和决定。时间不会等我，只能边慌边学着稳住。' },
                        { quote: '人在路上时，才会听见自己真正的声音。', note: '我很少有真正独处的时候，所以这种句子会让我想停一下。' }
                    ]
                },
                {
                    title: '身为职<br>业小说家',
                    fullTitle: '身为职业小说家',
                    author: '村上春树',
                    color: '#4C5060',
                    progress: '82%',
                    highlights: [
                        { quote: '重复不是枯燥，而是让灵感长出骨架。', note: '这句适合贴在录音棚门口。很多人只想看结果，没人看见重复到发麻的那一段。' },
                        { quote: '情绪可以成为燃料，但不能成为方向盘。', note: '我最近太需要这句话了。把自己烧亮很容易，把方向握住更难。' }
                    ]
                }
            ];
        }
        if (mode === 'executive') {
            return [
                {
                    title: '原则',
                    fullTitle: '原则',
                    author: 'Ray Dalio',
                    color: '#2F3D46',
                    progress: '54%',
                    highlights: [
                        { quote: '痛苦加反思，才会形成进步。', note: '这句话很冷，但确实有效。很多决策不是靠直觉赢下来的，是靠复盘把代价吃透。' },
                        { quote: '如果不能面对事实，能力再强也只是更快地做错事。', note: '我每天都在和这件事打交道。好看的汇报不值钱，真实的数据才值钱。' }
                    ]
                },
                {
                    title: '君主论',
                    fullTitle: '君主论',
                    author: 'Niccolò Machiavelli',
                    color: '#352423',
                    progress: '22%',
                    highlights: [
                        { quote: '领导者最危险的，不是被反对，而是看不见真实的反对。', note: '这句让我警觉。沉默从来不是支持，很多时候只是有人在等你犯错。' },
                        { quote: '温和与强硬都只是工具，关键是何时使用。', note: '我不喜欢被迫扮演强硬，但有些时候不硬，局面就会立刻失控。' }
                    ]
                },
                {
                    title: '夜晚的<br>潜水艇',
                    fullTitle: '夜晚的潜水艇',
                    author: '陈春成',
                    color: '#4D5568',
                    progress: '73%',
                    highlights: [
                        { quote: '人总要在庞杂现实里，偷偷替自己保留一块柔软。', note: '这本不适合放在办公室，但我偏偏需要它。不是为了效率，是为了不把自己磨得太硬。' },
                        { quote: '想象力不是逃跑，它有时只是另一种自救。', note: '看到这句时我停了很久。成年人的自救，往往比外人看到的体面得多。' }
                    ]
                }
            ];
        }
        return [
            {
                title: '时间的<br>秩序',
                fullTitle: '时间的秩序',
                author: 'Carlo Rovelli',
                color: '#3E4348',
                progress: '45%',
                highlights: [
                    { quote: '世界不是由过去、现在和未来构成的，而是由事件交织的网络构成。', note: '把这句话记下来以后，今天那些糟糕的小事突然不那么沉了。它们只是节点，不是全部。' },
                    { quote: '所谓现在，不过是我们感官临时搭建出来的桥。', note: '我喜欢这种冷静。很多焦虑也许只是我把一瞬间误当成了永久。' }
                ]
            },
            {
                title: '小王子',
                fullTitle: '小王子',
                author: 'Antoine de Saint-Exupéry',
                color: '#D4E4F7',
                progress: '88%',
                highlights: [
                    { quote: '真正重要的东西，用眼睛是看不见的。', note: '这种句子很容易被说得廉价，但写在这里，反而显得真。很多东西本来就不能只靠表面判断。' },
                    { quote: '你要对你驯养过的一切负责。', note: '责任这个词我一直听得很多，只有看到这里时，才觉得它和温柔其实是绑在一起的。' }
                ]
            },
            {
                title: '月亮与<br>六便士',
                fullTitle: '月亮与六便士',
                author: 'W. Somerset Maugham',
                color: '#5A5D67',
                progress: '17%',
                highlights: [
                    { quote: '夜里读书的人，通常不是为了答案，而是为了安静。', note: '我读到这里就停住了。确实，我更像是在给自己找一个不被打扰的角落。' },
                    { quote: '书页翻过去的时候，情绪也会跟着松一点。', note: '这句很轻，但很准。不是每次都能被治好，至少能暂时喘口气。' }
                ]
            }
        ];
    }

    function normalizeShadowReadingData(payload, context) {
        const data = asObject(payload);
        const source = Array.isArray(data.books) ? data.books : (Array.isArray(data.items) ? data.items : []);
        const palette = ['#3E4348', '#6C5B4C', '#48556A', '#8B7967', '#5F6468'];
        let books = source.slice(0, 5).map(function (item, index) {
            const row = asObject(item);
            const fullTitle = asString(row.fullTitle || row.bookName || row.name || row.title || ('书籍 ' + String(index + 1)));
            const coverTitle = formatReadingCoverTitle(row.title || row.coverTitle || fullTitle);
            const author = asString(row.author || row.writer || '未知作者');
            const progress = normalizeProgressText(row.progress || row.percent || row.readingProgress, '');
            const color = normalizeHexColor(row.color, palette[index % palette.length]);
            const highlightsSource = Array.isArray(row.highlights) ? row.highlights : [];
            const highlights = highlightsSource.slice(0, 3).map(function (entry) {
                const highlight = asObject(entry);
                const quote = asString(highlight.quote || highlight.highlight || highlight.text);
                const note = asString(highlight.note || highlight.comment || highlight.annotation);
                if (!quote || !note) return null;
                return { quote: quote, note: note };
            }).filter(Boolean);
            if (!fullTitle || !author || !progress || highlights.length < 2) return null;
            return {
                title: coverTitle,
                fullTitle: fullTitle,
                author: author,
                color: color,
                progress: progress,
                highlights: highlights
            };
        }).filter(Boolean);

        // 批量生成时阅读场景更容易出现结构缺项：用真实书单补齐到 3 本，避免整段失败。
        if (books.length < 3) {
            const defaults = buildDefaultShadowReadingBooks(context);
            const seen = {};
            for (let i = 0; i < books.length; i++) {
                const key = asString(books[i].fullTitle).toLowerCase();
                if (key) seen[key] = true;
            }
            for (let j = 0; j < defaults.length && books.length < 5; j++) {
                const row = asObject(defaults[j]);
                const key = asString(row.fullTitle).toLowerCase();
                if (!key || seen[key]) continue;
                seen[key] = true;
                books.push(row);
            }
        }

        books = books.slice(0, 5);

        return {
            books: books
        };
    }

    function isValidShadowReadingData(payload) {
        const data = asObject(payload);
        const books = Array.isArray(data.books) ? data.books : [];
        if (books.length < 3 || books.length > 5) return false;
        return books.every(function (item) {
            const row = asObject(item);
            const highlights = Array.isArray(row.highlights) ? row.highlights : [];
            return !!asString(row.fullTitle)
                && !!asString(row.author)
                && /^\d{1,3}%$/.test(asString(row.progress))
                && highlights.length >= 2
                && highlights.length <= 3
                && highlights.every(function (entry) {
                    const value = asObject(entry);
                    return !!asString(value.quote) && !!asString(value.note);
                });
        });
    }

    function buildDefaultShadowWorkTabs(context) {
        const roleName = asString(context && context.roleName) || '角色';
        const base = {
            records: [
                { time: '07:20', content: '门禁打卡：进入办公区前完成今日任务清单初筛' },
                { time: '09:10', content: '系统更新：退回一份信息不完整的流程单并补写审核意见' },
                { time: '13:40', content: '文档归档：重命名旧文件夹，补齐索引与标签映射' },
                { time: '18:55', content: '复盘记录：整理当天异常节点，标注需要明早复核的条目' }
            ],
            achievements: [
                { title: '本周任务准点关闭率', value: '96%' },
                { title: '重点项目推进排名', value: '第 1 名 / 12' },
                { title: '连续稳定输出周期', value: '21 天' },
                { title: '本月归档文档总数', value: '48 份' }
            ],
            plans: [
                { date: '明天 09:30', content: '参加关键流程复盘会，确认上一轮延误原因' },
                { date: '周五 14:00', content: '补完本阶段资料索引，清理失效附件与重复版本' },
                { date: '周末待办', content: '把所有提醒关掉，留半天只做必要的整理和休息' }
            ]
        };
        return adaptShadowWorkTabsByContext(base, context, roleName);
    }

    function buildDefaultShadowWorkRecords(context) {
        const roleName = asString(context && context.roleName) || '角色';
        const base = [
            {
                id: 'r1',
                time: '04-08 21:10',
                type: 'investigation',
                status: '进行中',
                audited: false,
                progress: true,
                title: '正在整理近期任务线索与优先级回收清单',
                note: '已补充触发条件、处理顺序和风险备注。',
                detail: {
                    title: '任务线索整理 / 更新批次 04',
                    intro: roleName + '正在重新整理近期事务线索，重点是把“可见症状”和“根因信号”分层记录，避免误判。',
                    meta: [['处理状态', '进行中'], ['优先级', 'P1 / 私人关注'], ['归属', '观察与回访']],
                    sections: [
                        { heading: '本次更新重点', paragraphs: ['把重复出现的异常信号重新归档，尤其记录了高风险节点前后的语义变化和时间差。', '这份文档用于后续决策，不是情绪笔记。'] },
                        { heading: '后续动作', list: ['补充三条高频触发词对应的回应策略。', '对最近一次沉默时长过长的节点做复盘。', '将观察结果同步到私人备忘，避免公共流转。'] }
                    ]
                }
            },
            {
                id: 'r2',
                time: '04-08 17:42',
                type: 'archive',
                status: '已完成',
                audited: true,
                progress: false,
                title: '已归档一份沟通语气快照与留痕文档',
                note: '归档内容包含称呼变化、停顿长度和回避型表达。',
                detail: {
                    title: '沟通语气快照 / 私密归档',
                    intro: roleName + '把关键语句节律、称呼变化和回应延迟单独封成档案，确保高压阶段仍能保持判断稳定。',
                    meta: [['处理状态', '已完成'], ['敏感级别', '内部可见'], ['归档编号', 'ARC-11']],
                    sections: [
                        { heading: '归档范围', list: ['称呼与称呼前后的停顿。', '情绪下降前的句子长度变化。', '会让角色明显放松下来的表达方式。'] }
                    ]
                }
            },
            {
                id: 'r3',
                time: '04-08 11:35',
                type: 'decision',
                status: '已完成',
                audited: true,
                progress: false,
                title: '已完成一项关键决策：调整公开事务与私人事项的优先顺序',
                note: '角色把外部工作节点压缩了一档，给私人留出缓冲带。',
                detail: {
                    title: '优先级调整决策单',
                    intro: '这份决策单重点处理“高噪音事务”与“关键事项”的冲突，确保节奏可持续。',
                    meta: [['处理状态', '已完成'], ['影响范围', '日程 / 响应 / 风险'], ['审批人', roleName]],
                    sections: [
                        { heading: '执行结果', list: ['把晚间不必要会议后移。', '保留一段不被打扰的私密处理时间。', '把高消耗社交流程改为异步归档。'] }
                    ]
                }
            },
            {
                id: 'r4',
                time: '04-07 22:08',
                type: 'archive',
                status: '已完成',
                audited: true,
                progress: false,
                title: '云文档整理完成，已重命名旧档案并补齐索引',
                note: '专业能力记录：信息结构化和长期留档能力稳定。',
                detail: {
                    title: '云文档索引修订',
                    intro: '角色对冗长、杂乱的信息有很强的驯化能力，最终留下的是可追踪、可回溯的清爽文档结构。',
                    meta: [['处理状态', '已完成'], ['任务性质', '整理 / 归档'], ['文档数', '28 份']],
                    sections: [
                        { heading: '操作说明', paragraphs: ['旧文档被重新分层，补齐了时间索引和事件标签。', '一些容易被忽略的细枝末节被标注为“后续可能影响判断”的观察项。'] }
                    ]
                }
            },
            {
                id: 'r5',
                time: '04-07 15:26',
                type: 'investigation',
                status: '待处理',
                audited: false,
                progress: false,
                title: '待复核一份异常联系人回访记录与风险判断',
                note: '专业能力记录：擅长从零碎反馈里做风险筛查。',
                detail: {
                    title: '联系人风险回访记录',
                    intro: '这是一份看起来普通、实则考验判断力的事务。角色没有急着下结论，而是先把证据链补完整。',
                    meta: [['处理状态', '待处理'], ['任务性质', '调查'], ['风险等级', '中']],
                    sections: [
                        { heading: '待核查项目', list: ['回访时间与反馈内容是否存在矛盾。', '关联联系人是否重复出现同类措辞。', '是否需要升级为人工确认。'] }
                    ]
                }
            },
            {
                id: 'r6',
                time: '04-06 20:44',
                type: 'secret',
                status: '机密 / 已删除',
                audited: true,
                progress: false,
                title: '已删除的敏感记录：私人联络窗口与未提交附件',
                note: '敏感记录：内容已擦除，仅保留审计外壳。',
                detail: {
                    title: '敏感文档 / 擦除完成',
                    intro: '主体内容已经不可见，只剩一层审计外壳，能确认它存在过，却无法还原它本来的样子。',
                    meta: [['处理状态', '机密'], ['擦除方式', '手动覆盖'], ['可见等级', '仅本人']],
                    sections: [
                        { heading: '残留说明', paragraphs: ['可见内容仅剩操作时间、审计标签和空白索引。', '附件与正文均已移除，系统保留的只有一条短暂存在过的痕迹。'], sensitive: true },
                        { heading: '备注', quote: '仅保留删除痕迹，不保留原文内容。', sensitive: true }
                    ]
                }
            },
            {
                id: 'r7',
                time: '04-05 18:10',
                type: 'study',
                status: '进行中',
                audited: false,
                progress: true,
                title: '正在学习一套新的沟通策略与信息压缩方法',
                note: '专业能力记录：持续学习、复盘和自我更新。',
                detail: {
                    title: '沟通策略学习记录',
                    intro: roleName + '并不是靠直觉单打独斗的人，很多细腻的反应，其实来自长期复盘和主动学习。',
                    meta: [['处理状态', '进行中'], ['任务性质', '学习'], ['阶段', '方法校准']],
                    sections: [
                        { heading: '学习重点', list: ['如何减少误判式安慰。', '如何在不冒犯的前提下追问关键信息。', '如何让私人沟通更轻，同时不失真。'] }
                    ]
                }
            }
        ];
        return adaptShadowWorkRecordsByContext(base, context);
    }

    function inferShadowWorkMode(context) {
        const source = [
            asString(context && context.roleName),
            asString(context && context.personaText),
            asString(context && context.worldBookText)
        ].join('\n');
        if (/(黑拳|拳手|格斗|擂台|赛事|地下拳|战损|医疗报告|陪练|盘口)/.test(source)) return 'fighter';
        if (/(学生|校园|学院|论文|导师|选课|宿舍|辅导员|课题)/.test(source)) return 'student';
        if (/(歌手|明星|艺人|偶像|演员|录音棚|巡演|彩排|通告|热搜)/.test(source)) return 'idol';
        if (/(总裁|总监|集团|董事会|商务|投标|供应商|预算|并购|审批)/.test(source)) return 'executive';
        return 'default';
    }

    function adaptShadowWorkTabsByContext(payload, context, roleName) {
        const mode = inferShadowWorkMode(context);
        const base = asObject(payload);
        const tabs = {
            records: Array.isArray(base.records) ? base.records.slice(0, 6) : [],
            achievements: Array.isArray(base.achievements) ? base.achievements.slice(0, 4) : [],
            plans: Array.isArray(base.plans) ? base.plans.slice(0, 4) : []
        };
        if (mode === 'fighter') {
            tabs.records = [
                { time: '06:40', content: '体能记录：完成晨跑与减重称重，数值同步到训练表' },
                { time: '11:15', content: '赛事排期：确认下周擂台顺序与陪练窗口，调整恢复时段' },
                { time: '16:30', content: '医疗归档：上传冰敷照片、伤情评估和本次止痛用量' },
                { time: '23:20', content: '转账流水：核对奖金分成与场馆尾款，锁定异常备注' }
            ];
            tabs.achievements = [
                { title: '当前连胜记录', value: '14 场' },
                { title: '本月有效击中率', value: '63%' },
                { title: '赛事奖金入账', value: '¥128,000' },
                { title: '最近体重控制误差', value: '0.4 kg' }
            ];
            tabs.plans = [
                { date: '明晚 20:00', content: '和新陪练做三回合实战，重点修正左侧防守漏洞' },
                { date: '下周二 09:30', content: '复查旧伤恢复情况，决定是否压缩下一场出场时间' },
                { date: '周末待办', content: '把手机关静音，补足睡眠，再去买新的绷带和冰袋' }
            ];
            return tabs;
        }
        if (mode === 'student') {
            tabs.records = [
                { time: '08:10', content: '校园卡刷卡：进入阶梯教室并签到本日第一节课' },
                { time: '11:45', content: '导师反馈：领取批注版论文初稿，补记三处修改方向' },
                { time: '15:20', content: '教务系统：调整选课顺序，提交一门公共课候补申请' },
                { time: '22:35', content: '学习记录：整理课堂录音与复习提纲，标出明早要背的部分' }
            ];
            tabs.achievements = [
                { title: '期中高数测验排名', value: '专业第 3 名' },
                { title: '论文周进度', value: '78%' },
                { title: '本学期累计绩点', value: '3.86 / 4.0' },
                { title: '连续到馆自习', value: '17 天' }
            ];
            tabs.plans = [
                { date: '明天 14:00', content: '去导师办公室确认论文大纲最后一轮删改意见' },
                { date: '下周四 18:30', content: '参加社团迎新破冰，顺便把宣传稿交给负责人' },
                { date: '周末待办', content: '把洗好的床单收回来，再给自己留两个小时彻底放空' }
            ];
            return tabs;
        }
        if (mode === 'idol') {
            tabs.records = [
                { time: '09:30', content: '抵达录音棚：完成开嗓、麦克风测试和歌词版本确认' },
                { time: '13:15', content: '通告调整：协调品牌拍摄与晚间采访档期，压缩转场时间' },
                { time: '18:50', content: '彩排记录：重走舞台走位并修改一段副歌动作衔接' },
                { time: '23:40', content: '舆情复盘：查看热搜曲线与评论关键词，留下经纪组备注' }
            ];
            tabs.achievements = [
                { title: '新歌试听收藏量', value: '28.4 万' },
                { title: '本周热搜最高位', value: 'TOP 7' },
                { title: '舞台直拍单日播放', value: '312 万' },
                { title: '本月通告准点完成率', value: '100%' }
            ];
            tabs.plans = [
                { date: '明天 11:00', content: '补录一版副歌和声，确认正式上线母带版本' },
                { date: '周五 19:30', content: '参加品牌活动红毯与媒体群访，提前试两套造型' },
                { date: '周末待办', content: '推掉无效饭局，在家睡一整天，再把嗓子养回来' }
            ];
            return tabs;
        }
        if (mode === 'executive') {
            tabs.records = [
                { time: '07:55', content: '门禁打卡：从地下车库进入大厦，路上完成晨间简报批示' },
                { time: '10:30', content: '预算审批：退回第三季度投放方案并要求重算边际收益' },
                { time: '15:05', content: '闭门会议：和核心供应商确认交付节点及违约补偿条款' },
                { time: '21:40', content: '内网批注：整理项目风险摘要，交代法务跟进两项异议' }
            ];
            tabs.achievements = [
                { title: '本月项目达成率', value: '134.5%' },
                { title: '年度业绩排名', value: 'TOP 1' },
                { title: '季度利润提升', value: '+18.2%' },
                { title: '本周审批完成单量', value: '37 项' }
            ];
            tabs.plans = [
                { date: '明天 10:00', content: '与核心供应商进行闭门谈判，压下最后一轮报价' },
                { date: '周五 19:30', content: '出席商会晚宴，顺便敲定下一季度合作名单' },
                { date: '周末待办', content: '推掉不必要应酬，去花店买束洋桔梗再回家休息' }
            ];
            return tabs;
        }
        if (roleName && tabs.achievements[0]) {
            tabs.achievements[0].title = roleName + ' 当前核心指标';
        }
        return tabs;
    }

    function adaptShadowWorkRecordsByContext(records, context) {
        const mode = inferShadowWorkMode(context);
        const list = Array.isArray(records) ? records : [];
        if (mode === 'fighter') {
            if (list[2]) {
                list[2].type = 'battle';
                list[2].title = '已完成本周赛事排期与陪练窗口压缩调整';
                list[2].note = '专业能力记录：在高压排程里维持节奏与风险控制。';
                if (list[2].detail) {
                    list[2].detail.title = '赛事排期调整单';
                    list[2].detail.intro = '角色把赛程、恢复、转场和风险控制节点重新拆排，确保高压期仍可执行。';
                }
            }
            if (list[3] && list[3].detail) {
                list[3].title = '医疗报告与转账流水已归档，伤情节点同步完成';
                list[3].detail.title = '赛后医疗与流水归档';
            }
            if (list[5]) list[5].title = '已删除的敏感记录：盘口风声与私人联络附件';
            if (list[6]) list[6].title = '正在学习对手录像切片与命中率复盘模板';
            return list;
        }
        if (mode === 'student') {
            if (list[2] && list[2].detail) {
                list[2].title = '已完成选课优先级调整与论文阶段拆分';
                list[2].note = '专业能力记录：把复杂任务拆成可执行的小步进。';
                list[2].detail.title = '学业优先级调整单';
            }
            if (list[3] && list[3].detail) {
                list[3].title = '辅导员批复、选课截图与课程笔记已归档';
                list[3].detail.title = '学业文档归档';
            }
            if (list[4]) list[4].title = '待复核一份导师批注与课题方向差异记录';
            if (list[5]) list[5].title = '已删除的敏感记录：未提交草稿与加密聊天附件';
            if (list[6]) list[6].title = '正在学习论文综述压缩法与答辩表达框架';
            return list;
        }
        return list;
    }

    function normalizeShadowWorkSection(item) {
        const row = asObject(item);
        const section = {
            heading: asString(row.heading || row.title || '记录'),
            sensitive: row.sensitive === true
        };
        const paragraphs = Array.isArray(row.paragraphs) ? row.paragraphs.map(asString).filter(Boolean) : [];
        const list = Array.isArray(row.list) ? row.list.map(asString).filter(Boolean) : [];
        const quote = asString(row.quote || '');
        if (paragraphs.length) section.paragraphs = paragraphs;
        if (list.length) section.list = list;
        if (quote) section.quote = quote;
        if (!section.paragraphs && !section.list && !section.quote) {
            section.paragraphs = ['这条记录被系统保留为简述，正文未完整展开。'];
        }
        return section;
    }

    function normalizeShadowWorkTime(value, fallback) {
        const text = asString(value);
        if (!text) return fallback;
        const match = text.match(/(\d{1,2}:\d{2})/);
        return match ? match[1] : fallback;
    }

    function normalizeShadowWorkRecordItem(item, index) {
        const row = asObject(item);
        const text = asString(row.content || row.text || row.note || row.title || row.summary);
        if (!text) return null;
        return {
            time: normalizeShadowWorkTime(row.time || row.timestamp, ('0' + String((index + 8) % 24)).slice(-2) + ':00'),
            content: text
        };
    }

    function normalizeShadowWorkAchievementItem(item, index) {
        const row = asObject(item);
        const title = asString(row.title || row.label || row.name || ('成就维度 ' + String(index + 1)));
        const value = asString(row.value || row.score || row.rank || row.result || row.content);
        if (!title || !value) return null;
        return {
            title: title,
            value: value
        };
    }

    function normalizeShadowWorkPlanItem(item, index) {
        const row = asObject(item);
        const date = asString(row.date || row.time || row.when || ('未来节点 ' + String(index + 1)));
        const content = asString(row.content || row.text || row.note || row.title);
        if (!date || !content) return null;
        return {
            date: date,
            content: content
        };
    }

    function normalizeLegacyShadowWorkRecords(records, fallbackRecords) {
        const list = Array.isArray(records) ? records : [];
        const mapped = list.slice(0, 6).map(function (item, index) {
            const row = asObject(item);
            const text = asString(row.note || row.title || row.summary);
            if (!text) return null;
            return {
                time: normalizeShadowWorkTime(row.time || row.timestamp, fallbackRecords[index] ? fallbackRecords[index].time : '12:00'),
                content: text
            };
        }).filter(Boolean);
        return mapped.length ? mapped : [];
    }

    function normalizeShadowWorkData(payload, context) {
        const data = asObject(payload);
        const tabs = asObject(data.tabs || {});
        const recordsSource = Array.isArray(tabs.records) ? tabs.records : [];
        const achievementsSource = Array.isArray(tabs.achievements) ? tabs.achievements : [];
        const plansSource = Array.isArray(tabs.plans) ? tabs.plans : [];

        const records = recordsSource.map(normalizeShadowWorkRecordItem).filter(Boolean);
        const achievements = achievementsSource.map(normalizeShadowWorkAchievementItem).filter(Boolean);
        const plans = plansSource.map(normalizeShadowWorkPlanItem).filter(Boolean);
        const legacyRecords = normalizeLegacyShadowWorkRecords(data.records, []);
        const finalRecords = records.length ? records : legacyRecords;

        return {
            tabs: {
                records: finalRecords.slice(0, 6),
                achievements: achievements.slice(0, 4),
                plans: plans.slice(0, 4)
            }
        };
    }

    function isValidShadowWorkData(payload) {
        const data = asObject(payload);
        const tabs = asObject(data.tabs || {});
        const records = Array.isArray(tabs.records) ? tabs.records : [];
        const achievements = Array.isArray(tabs.achievements) ? tabs.achievements : [];
        const plans = Array.isArray(tabs.plans) ? tabs.plans : [];
        if (records.length < 4 || achievements.length < 3 || plans.length < 3) return false;
        return records.every(function (item) {
            const row = asObject(item);
            return !!asString(row.time) && !!asString(row.content);
        }) && achievements.every(function (item) {
            const row = asObject(item);
            return !!asString(row.title) && !!asString(row.value);
        }) && plans.every(function (item) {
            const row = asObject(item);
            return !!asString(row.date) && !!asString(row.content);
        });
    }

    function readChatDataMap() {
        const parentWindow = getParentWindow();
        try {
            if (parentWindow.chatData && typeof parentWindow.chatData === 'object') {
                return parentWindow.chatData;
            }
        } catch (e) { }
        return asObject(safeParse(readLocalStorage('wechat_chatData', '{}'), {}));
    }

    function isVisibleChatRecord(record) {
        const msg = record && typeof record === 'object' ? record : null;
        if (!msg) return false;
        if (msg.hidden === true) return false;
        const role = asString(msg.role || '');
        if (role !== 'me' && role !== 'ai') return false;
        const type = asString(msg.type || '');
        if (type === 'system' || type === 'system_event') return false;
        const content = asString(msg.content || '');
        if (!content) return false;
        if (content.indexOf('[系统]') === 0 && (content.indexOf('一起听') !== -1 || content.indexOf('歌曲切换为') !== -1)) {
            return false;
        }
        return true;
    }

    function toChatPreviewText(content) {
        const text = asString(content || '');
        if (!text) return '';
        if (text.indexOf('data:image') !== -1 || text.indexOf('<img') !== -1) return '[图片]';
        if (text.indexOf('[VOICE:') !== -1 || text.indexOf('[语音]') !== -1) return '[语音]';
        if (text.indexOf('[STICKER:') !== -1) return '[表情]';
        return text;
    }

    function detectFavoriteKindFromText(text) {
        const preview = asString(text || '');
        if (!preview) return 'quote';
        if (preview === '[图片]') return 'photo';
        if (preview === '[语音]') return 'voice';
        if (preview === '[表情]') return 'sticker';
        return 'quote';
    }

    function inferFavoriteTone(context) {
        const source = [
            asString(context && context.roleName),
            asString(context && context.personaText),
            asString(context && context.worldBookText)
        ].join('\n').toLowerCase();

        if (!source) return 'default';
        if (/(冷|淡|克制|沉默|寡言|禁欲|理性|疏离|不动声色)/.test(source)) return 'restrained';
        if (/(学生|校园|导师|论文|选课|辅导员|社团)/.test(source)) return 'student';
        if (/(黑拳|拳|格斗|赛事|擂台|地下|危险|佣兵|战斗)/.test(source)) return 'danger';
        if (/(医生|老师|照顾|温柔|治愈|安抚|陪伴)/.test(source)) return 'gentle';
        return 'default';
    }

    function isSystemLikeFavoriteAnnotation(text) {
        const clean = asString(text);
        if (!clean) return true;
        if (clean.length < 4) return true;
        if (/(角色|系统|该内容|这条内容|这段内容|该条|被角色|被单独|收藏夹|收进了收藏夹|保存这条|内容很有意思|值得收藏|外部内容)/.test(clean)) return true;
        if (/^(这条|这段|该条|该段)/.test(clean) && /(被|值得|适合)/.test(clean)) return true;
        if (/^(备注|批注|说明)[:：]/.test(clean)) return true;
        return false;
    }

    function sanitizeFavoriteAnnotationText(text) {
        let clean = asString(text);
        if (!clean) return '';
        clean = clean.replace(/^["'“”]+|["'“”]+$/g, '').trim();
        clean = clean.replace(/^(角色批注|批注|备注|注)[:：]\s*/g, '').trim();
        clean = clean.replace(/\s+/g, ' ').trim();
        if (clean.length > 42) clean = clean.slice(0, 42).trim();
        clean = clean.replace(/[，,；;、]+$/g, '').trim();
        if (isSystemLikeFavoriteAnnotation(clean)) return '';
        return clean;
    }

    function isStrongFavoriteQuote(text) {
        const clean = asString(text);
        if (!clean || clean === '[图片]' || clean === '[语音]' || clean === '[表情]') return false;
        if (clean.length < 8 || clean.length > 72) return false;
        let hits = 0;
        if (/(想|喜欢|爱|抱|亲|陪|等你|见你|晚安|早安|回来|别怕|辛苦|想你|梦见|舍不得|在吗|到了|记得|好想|开心|委屈|难受|不舒服)/.test(clean)) hits += 2;
        if (/(一起|下次|明天|周末|回家|见面|吃饭|礼物|照片|语音|电话|视频|接你|送你|等我)/.test(clean)) hits += 1;
        if (/[!！?？。]/.test(clean)) hits += 1;
        if (/今天|刚刚|现在|昨晚|刚才|已经|终于/.test(clean)) hits += 1;
        if (/哈哈|嗯|哦|好|行|知道了|收到|在忙|先这样/.test(clean) && hits < 2) hits -= 1;
        return hits >= 2;
    }

    function buildFavoriteAnnotation(kind, previewText, context, userName) {
        const tone = inferFavoriteTone(context);
        const quoteText = asString(previewText || '');

        if (kind === 'photo') {
            if (tone === 'danger') return '这张我留着，不想删。';
            if (tone === 'restrained') return '先留一下，过阵子我大概还会回来看看。';
            if (tone === 'student') return '这张得单独放着，看到会心情变好。';
            if (tone === 'gentle') return '这张我想留着，今天的情绪会软一点。';
            return '这张还是想单独留一下。';
        }

        if (kind === 'voice') {
            if (tone === 'danger') return '这段声音我没打算删。';
            if (tone === 'restrained') return '这段我后来又听了一遍。';
            if (tone === 'student') return '这段语音我想留着，像给今天做个标记。';
            if (tone === 'gentle') return '这段声音留着吧，听起来会安心一点。';
            return '这段语音我想留着。';
        }

        const shortened = quoteText.length > 26 ? (quoteText.slice(0, 26) + '…') : quoteText;
        if (/(想|喜欢|爱|抱|等你|见你|陪你|晚安|早安|回来|别怕|辛苦|记得)/.test(quoteText)) {
            if (tone === 'restrained') return '这句我当时没回太多，但后来记了很久。';
            if (tone === 'danger') return '这句不该这么有分量，但我还是留了。';
            if (tone === 'student') return '这句先圈住，怕我之后忘。';
            if (tone === 'gentle') return '这句留下来吧，心乱的时候看一眼会安静一点。';
            return '这句我想留着。';
        }
        if (tone === 'student') return '先做个记号，这句有点重要。';
        if (tone === 'gentle') return '这句我想留一下。';
        if (tone === 'danger') return '留着吧，这句会反复想起来。';
        if (tone === 'restrained') return shortened ? ('“' + shortened + '” 这句还是记下了。') : '这句还是想留着。';
        return '这句我想单独记一下。';
    }

    function scoreFavoriteCandidate(kind, previewText, recencyWeight) {
        let score = 0;
        if (kind === 'photo') score += 96;
        else if (kind === 'voice') score += 88;
        else if (kind === 'quote') score += 62;
        else score += 20;

        const text = asString(previewText || '');
        if (text && text.length >= 6 && text.length <= 48) score += 10;
        else if (text.length > 48 && text.length <= 90) score += 5;
        else if (text.length > 120) score -= 8;

        if (/(想|喜欢|爱|抱|亲|宝|晚安|早安|等你|见你|陪|回来|记得|别怕|辛苦|开心|声音|照片|留给你|想你)/.test(text)) {
            score += 18;
        }
        if (/[!！?？。]/.test(text)) score += 4;
        score += Math.max(0, Math.min(18, Number(recencyWeight) || 0));
        return score;
    }

    function getRecentRealUserMessages(roleId, roleName, userName, maxCount) {
        const rid = asString(roleId);
        const map = readChatDataMap();
        const history = Array.isArray(map[rid]) ? map[rid] : [];
        const out = [];
        const limit = Math.max(1, Number(maxCount) || 10);
        for (let i = history.length - 1; i >= 0; i--) {
            const msg = history[i];
            if (!isVisibleChatRecord(msg)) continue;
            const role = asString(msg.role || '');
            const text = toChatPreviewText(msg.content || '');
            if (!text) continue;
            out.push({
                speaker: role === 'me' ? '我' : (roleName || 'TA'),
                text: text,
                timestamp: Number(msg.timestamp) || 0
            });
            if (out.length >= limit) break;
        }
        out.reverse();
        return out;
    }

    function buildFallbackRecentMemory(roleId, roleName, maxLines) {
        const list = getRecentRealUserMessages(roleId, roleName, '我', Math.max(6, Number(maxLines) || 16));
        if (!list.length) return '';
        const lines = list.map(function (row) {
            const speaker = asString(row.speaker || '');
            const text = asString(row.text || '');
            return speaker + '：' + text;
        });
        return lines.join('\n');
    }

    function buildDatedRecentMemory(roleId, roleName, days, maxPerDay) {
        const dateKeys = buildRecentDateKeys(days || 7);
        const rid = asString(roleId);
        const map = readChatDataMap();
        const history = Array.isArray(map[rid]) ? map[rid] : [];
        const dayMap = {};
        const maxRows = Math.max(1, Number(maxPerDay) || 4);

        for (let i = 0; i < dateKeys.length; i++) {
            dayMap[dateKeys[i]] = [];
        }

        for (let i = history.length - 1; i >= 0; i--) {
            const msg = history[i];
            if (!isVisibleChatRecord(msg)) continue;
            const ts = Number(msg && msg.timestamp) || 0;
            if (!ts) continue;
            const dayKey = formatMonthDay(new Date(ts));
            if (!dayMap[dayKey] || dayMap[dayKey].length >= maxRows) continue;
            const role = asString(msg && msg.role);
            const speaker = role === 'me' ? '我' : (asString(roleName) || 'TA');
            const text = toChatPreviewText(msg && msg.content);
            if (!text) continue;
            dayMap[dayKey].push('[' + formatHourMinute(ts) + '] ' + speaker + '：' + text);
        }

        return dateKeys.map(function (key) {
            const lines = Array.isArray(dayMap[key]) ? dayMap[key].slice().reverse() : [];
            if (!lines.length) return key + '：无可见聊天';
            return key + '：\n' + lines.join('\n');
        }).join('\n\n');
    }

    function buildRealFavoriteItems(context, userName, maxCount) {
        const roleId = asString(context && context.roleId);
        const roleName = asString(context && context.roleName) || 'TA';
        const limit = Math.max(1, Number(maxCount) || 5);
        const map = readChatDataMap();
        const history = Array.isArray(map[roleId]) ? map[roleId] : [];
        if (!history.length) return [];

        const visible = history.filter(isVisibleChatRecord);
        if (visible.length < 12) return [];
        const hasUser = visible.some(function (msg) { return asString(msg && msg.role) === 'me'; });
        const hasRole = visible.some(function (msg) { return asString(msg && msg.role) === 'ai'; });
        if (!hasUser || !hasRole) return [];
        const userMessageCount = visible.filter(function (msg) { return asString(msg && msg.role) === 'me'; }).length;
        const roleMessageCount = visible.filter(function (msg) { return asString(msg && msg.role) === 'ai'; }).length;
        if (userMessageCount < 4 || roleMessageCount < 4) return [];

        const candidates = [];
        const recentWindow = visible.slice(-Math.max(24, limit * 10));
        for (let i = 0; i < recentWindow.length; i++) {
            const msg = recentWindow[i];
            if (asString(msg && msg.role) !== 'me') continue;
            const previewText = toChatPreviewText(msg && msg.content);
            if (!previewText) continue;

            const kind = detectFavoriteKindFromText(previewText);
            if (kind === 'sticker') continue;
            if (kind === 'quote' && !isStrongFavoriteQuote(previewText)) continue;

            const recencyWeight = recentWindow.length - i;
            const title = kind === 'photo'
                ? '收藏的照片'
                : (kind === 'voice' ? '收藏的语音' : '想留下的话');
            const excerpt = kind === 'photo'
                ? '你发来了一张照片'
                : (kind === 'voice' ? '你发来了一段语音' : previewText);

            candidates.push({
                title: title,
                excerpt: excerpt,
                annotation: buildFavoriteAnnotation(kind, previewText, context, userName),
                reason: '来自真实聊天记录',
                source: 'real_chat',
                kind: kind,
                speakerName: asString(userName || '你') || '你',
                rawText: previewText,
                timestamp: Number(msg && msg.timestamp) || 0,
                score: scoreFavoriteCandidate(kind, previewText, recencyWeight)
            });
        }

        if (!candidates.length) return [];

        candidates.sort(function (a, b) {
            if (b.score !== a.score) return b.score - a.score;
            return (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0);
        });

        const seen = {};
        const picked = [];
        for (let i = 0; i < candidates.length; i++) {
            const row = candidates[i];
            if (Number(row.score) < (row.kind === 'quote' ? 78 : 86)) continue;
            const dedupeKey = [row.kind, row.excerpt, row.rawText].join('::');
            if (seen[dedupeKey]) continue;
            seen[dedupeKey] = true;
            picked.push({
                title: row.title,
                excerpt: row.excerpt,
                annotation: row.annotation,
                reason: row.reason,
                source: row.source,
                kind: row.kind,
                speakerName: row.speakerName,
                rawText: row.rawText,
                timestamp: row.timestamp
            });
            if (picked.length >= limit) break;
        }

        if (picked.length < 2 && candidates.every(function (item) { return item.kind === 'quote'; })) {
            return [];
        }

        picked.sort(function (a, b) {
            return (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0);
        });
        return picked;
    }

    function buildSavedTweetFavoriteItems(rawFavorites, subscriptions, maxCount) {
        const merged = [];
        const pushTweet = function (payload) {
            const row = asObject(payload);
            const title = asString(row.title || '');
            const excerpt = asString(row.excerpt || row.summary || row.fullText || row.content || '');
            const annotation = sanitizeFavoriteAnnotationText(row.annotation || row.saveComment || row.reason || '');
            if (!title && !excerpt) return;
            merged.push({
                type: 'tweet',
                title: title || '收藏的推文',
                excerpt: excerpt || '角色把这条内容留了下来。',
                sourceName: asString(row.source || row.account || '订阅号'),
                annotation: annotation,
                source: 'saved_tweet',
                kind: 'tweet',
                timestamp: Number(row.timestamp) || 0
            });
        };

        const favoriteList = Array.isArray(rawFavorites) ? rawFavorites : [];
        for (let i = 0; i < favoriteList.length; i++) pushTweet(favoriteList[i]);

        const subsList = Array.isArray(subscriptions) ? subscriptions : [];
        for (let i = 0; i < subsList.length; i++) {
            const row = asObject(subsList[i]);
            if (row.isSaved !== true && !asString(row.saveComment)) continue;
            pushTweet({
                title: row.title,
                excerpt: row.summary || row.fullText,
                source: row.source,
                annotation: row.saveComment
            });
        }

        const out = [];
        const seen = {};
        for (let i = 0; i < merged.length; i++) {
            const row = merged[i];
            const key = [row.title, row.sourceName, row.excerpt].join('::');
            if (seen[key]) continue;
            seen[key] = true;
            out.push(row);
            if (out.length >= Math.max(1, Number(maxCount) || 3)) break;
        }
        return out;
    }

    function readBundleContext(roleId) {
        const rid = asString(roleId);
        const parentWindow = getParentWindow();
        try {
            if (typeof parentWindow.buildPromptContextBundle === 'function') {
                const bundle = parentWindow.buildPromptContextBundle(rid, { maxSummaryLines: 18 });
                return bundle && typeof bundle === 'object' ? bundle : null;
            }
        } catch (e) { }
        return null;
    }

    function buildShadowWechatContextPack(context) {
        const bundle = readBundleContext(context.roleId);
        const parentWindow = getParentWindow();
        const userPersona = bundle && bundle.userPersona && typeof bundle.userPersona === 'object'
            ? bundle.userPersona
            : {};
        const userName = asString(
            userPersona.name ||
            readLocalStorage('user_name', '') ||
            (parentWindow.momentsData && parentWindow.momentsData.userName) ||
            '你'
        ) || '你';
        const userInfoLines = [];
        if (userName) userInfoLines.push('用户称呼：' + userName);
        if (asString(userPersona.gender)) userInfoLines.push('用户性别：' + asString(userPersona.gender));
        if (asString(userPersona.birthday)) userInfoLines.push('用户生日：' + asString(userPersona.birthday) + (userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）'));
        if (asString(userPersona.setting)) userInfoLines.push('用户设定：' + asString(userPersona.setting));
        const userInfoText = userInfoLines.join('\n');

        const memoryParts = [];
        if (bundle) {
            if (asString(bundle.memoryArchivePrompt)) memoryParts.push('【记忆档案】\n' + asString(bundle.memoryArchivePrompt));
            if (asString(bundle.continuityPrompt)) memoryParts.push('【连续性】\n' + asString(bundle.continuityPrompt));
            if (asString(bundle.recentChatSummary)) memoryParts.push('【近期聊天摘要】\n' + asString(bundle.recentChatSummary));
        }
        if (!memoryParts.length) {
            const fallback = buildFallbackRecentMemory(context.roleId, context.roleName, 18);
            if (fallback) memoryParts.push('【近期可见聊天】\n' + fallback);
        }
        const memoryText = memoryParts.join('\n\n');
        return {
            bundle: bundle,
            userName: userName,
            userInfoText: userInfoText,
            memoryText: memoryText
        };
    }

    function readRelationshipStatus(context, bundle) {
        const parentWindow = getParentWindow();
        const candidates = [
            parentWindow && parentWindow.Relationship_Status,
            parentWindow && parentWindow.relationshipStatus,
            readLocalStorage('Relationship_Status', ''),
            readLocalStorage('relationshipStatus', ''),
            readLocalStorage('relationship_status', ''),
            readLocalStorage('currentRelationshipStatus', ''),
            readLocalStorage('current_relationship_status', '')
        ];
        for (let i = 0; i < candidates.length; i++) {
            const value = asString(candidates[i]);
            if (!value) continue;
            if (/(已婚|婚后|结婚)/.test(value)) return '已婚';
            if (/(同居|一起住|住在一起)/.test(value)) return '同居';
            return value;
        }

        const source = [
            asString(bundle && bundle.continuityPrompt),
            asString(bundle && bundle.recentChatSummary),
            asString(context && context.personaText),
            asString(context && context.worldBookText)
        ].join('\n');
        if (/(已婚|婚后|结婚)/.test(source)) return '已婚';
        if (/(同居|一起住|住在一起)/.test(source)) return '同居';
        return '';
    }

    function formatPromptNow() {
        try {
            return new Date().toLocaleString('zh-CN', {
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return asString(new Date());
        }
    }

    function pad2(num) {
        return String(Math.max(0, Number(num) || 0)).padStart(2, '0');
    }

    function formatMonthDay(date) {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    }

    function buildRecentDateKeys(days) {
        const count = Math.max(1, Number(days) || 7);
        const out = [];
        for (let i = count - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            out.push(formatMonthDay(d));
        }
        return out;
    }

    function formatHourMinute(ts) {
        const d = new Date(Number(ts) || 0);
        if (isNaN(d.getTime())) return '--:--';
        return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }

    function buildShadowItineraryContextPack(context) {
        const pack = buildShadowWechatContextPack(context);
        const bundle = pack.bundle;
        const recentChatText = bundle && asString(bundle.recentChatSummary)
            ? asString(bundle.recentChatSummary)
            : buildFallbackRecentMemory(context.roleId, context.roleName, 16);
        const placeHints = extractWorldBookPlaceHints(context && context.worldBookText);
        const nextPack = {
            bundle: bundle,
            userName: pack.userName,
            relationshipStatus: readRelationshipStatus(context, bundle),
            currentTimeText: formatPromptNow(),
            recentChatText: recentChatText,
            placeHints: placeHints
        };
        return {
            bundle: nextPack.bundle,
            userName: nextPack.userName,
            relationshipStatus: nextPack.relationshipStatus,
            currentTimeText: nextPack.currentTimeText,
            recentChatText: nextPack.recentChatText,
            placeHints: nextPack.placeHints,
            blueprint: buildItineraryBlueprint(context, nextPack)
        };
    }

    function extractWorldBookPlaceHints(worldBookText) {
        const text = asString(worldBookText);
        if (!text) return [];
        const hints = [];
        const patterns = [
            /【([^】]{2,18})】/g,
            /([A-Za-z0-9\u4e00-\u9fa5]{2,18}(?:城|城邦|州|都|镇|港|港口|站|车站|码头|航站|塔|宫|殿|庭|苑|馆|院|楼|区|街|桥|湾|岛|谷|原|河|湖|海|山|关|门|轨道|航道|基地|实验室|神殿|学院|剧院|庭院|哨所|营地))/g
        ];

        function pushHint(value) {
            const hint = asString(value).replace(/^[#*•\-\s]+/, '');
            if (!hint || hint.length > 18) return;
            if (/^(角色|世界|设定|背景|关系|最近|聊天|当前|时间|状态|用户)$/.test(hint)) return;
            if (hints.indexOf(hint) === -1) hints.push(hint);
        }

        for (let p = 0; p < patterns.length; p++) {
            const regex = patterns[p];
            regex.lastIndex = 0;
            let match = regex.exec(text);
            while (match) {
                pushHint(match[1]);
                match = regex.exec(text);
            }
        }

        return hints.slice(0, 10);
    }

    function inferItineraryCompanionLabel(pack) {
        const userName = asString(pack && pack.userName) || '对方';
        const relation = asString(pack && pack.relationshipStatus);
        if (relation === '已婚') return userName + '（伴侣）';
        if (relation === '同居') return userName + '（同住的人）';
        return userName;
    }

    function buildPairedSeatLabel(type, seatSide, index) {
        const side = seatSide === 'Aisle' ? '过道侧' : '窗边';
        const pairFlight = ['07A-07B', '11C-11D', '15A-15B', '19C-19D'];
        const pairTrain = ['02A-02B', '05A-05B', '07C-07D', '11A-11B'];
        const source = type === 'train' ? pairTrain : pairFlight;
        return source[index % source.length] + ' 双人连坐 · ' + side;
    }

    function buildWorldbookTransitName(place, type, roleName) {
        const base = asString(place);
        if (!base) return type === 'train' ? '私域轨道站' : '回响航站';
        if (/[站港口码头航站楼塔苑宫殿庭馆院基地岛湾桥门关]/.test(base)) return base;
        if (type === 'train') return base + '轨道站';
        if (/(城|都|州|港|湾|岛)/.test(base)) return base + '航站';
        return base + (/(艺人|歌手|演员|明星|偶像)/.test(asString(roleName)) ? '通告航站' : '航站');
    }

    function looksLikeTransitDetail(text) {
        const value = asString(text);
        return /(机场|航站|车站|高铁|火车|轨道站|候机|登机|检票|月台|站台|码头|港口)/.test(value);
    }

    function looksLikeDetailedLocalPlace(text) {
        const value = asString(text);
        return /(区|街|路|巷|医院|园区|楼|公寓|小区|学校|学院|图书馆|剧场|会馆|车库|门口|楼下|总部|公司|片场|录音棚|工作室|住处|住所|家|诊室|病房|会场|餐厅|咖啡馆|花店)/.test(value);
    }

    function inferItineraryCityName(value, context, index) {
        const raw = asString(value);
        if (!raw) return pickBySeed(['栖灯市', '暮川市', '镜湾市', '松屿市'], hashStringSeed(asString(context && context.roleName)), index || 0);
        if (/(市|城|城邦|都|州)$/.test(raw)) return raw;
        if (/港$/.test(raw) && !/港口$/.test(raw)) return raw;
        if (!looksLikeDetailedLocalPlace(raw) && !looksLikeTransitDetail(raw) && raw.length <= 5) return raw;
        const cleaned = raw
            .replace(/(机场|航站楼|航站|高铁站|火车站|轨道站|车站|站台|码头|港口)$/g, '')
            .replace(/(街区|园区|公寓区|步行街|剧场区|研发中心|旧仓区|医院|学院|学校|图书馆|会馆|中庭|车库|公寓|小区|总部|大楼|楼下|门口|片场|录音棚|工作室|会场|餐厅|咖啡馆|花店)$/g, '');
        const base = asString(cleaned).slice(0, 4) || raw.slice(0, 2);
        if (/(城|都|州|港|湾|岛)$/.test(base)) return base;
        return base + '市';
    }

    function inferRoleWorkDetail(context) {
        const source = [
            asString(context && context.roleName),
            asString(context && context.personaText),
            asString(context && context.worldBookText)
        ].join('\n');
        if (/(学生|校园|学院|论文|导师|社团)/.test(source)) return '学院图书馆东门';
        if (/(医生|医院|门诊|手术|病房)/.test(source)) return '医院住院部侧门';
        if (/(歌手|艺人|演员|明星|偶像|通告|巡演|录音)/.test(source)) return '录音棚后门';
        if (/(总裁|总监|集团|董事会|商务|审批|并购|投资)/.test(source)) return '集团总部地下车库';
        if (/(律师|律所|法务|法庭)/.test(source)) return '律所楼下';
        return '办公楼下';
    }

    function inferRoleHomeDetail(context) {
        const name = asString(context && context.roleName);
        return name ? (name + '的住处楼下') : '住处楼下';
    }

    function inferUserHomeDetail(options) {
        const name = asString(options && options.userName);
        if (name && name !== '对方' && name !== '你') return name + '的公寓楼下';
        return '用户公寓楼下';
    }

    function shouldReplaceLocalDetail(detail, city) {
        const value = asString(detail);
        return !value || value === asString(city) || looksLikeTransitDetail(value);
    }

    function inferLocalRoutePair(routeText, context, options) {
        const text = asString(routeText);
        const work = inferRoleWorkDetail(context);
        const roleHome = inferRoleHomeDetail(context);
        const userHome = inferUserHomeDetail(options);
        if (/(接|下班|收工|放学)/.test(text) && /(回家|到家|住处|公寓|楼下|送)/.test(text)) {
            return { from: work, to: userHome };
        }
        if (/(送).*(回家|到家|住处|公寓|楼下)/.test(text) || /(回家|到家)/.test(text)) {
            return { from: work, to: userHome };
        }
        if (/(上班|上课|开会|会议|公司|会场|通告|拍摄|录音)/.test(text)) {
            return { from: roleHome, to: work };
        }
        if (/(医院|复诊|看诊|检查|输液)/.test(text)) {
            return { from: roleHome, to: '医院门诊楼入口' };
        }
        if (/(吃饭|餐厅|咖啡|花店|约会)/.test(text)) {
            return { from: roleHome, to: '约好的街角店门口' };
        }
        return { from: roleHome, to: userHome };
    }

    function hashStringSeed(input) {
        const text = asString(input || 'seed') || 'seed';
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
        }
        return Math.abs(h >>> 0);
    }

    function pickBySeed(list, seed, offset) {
        const source = Array.isArray(list) ? list : [];
        if (!source.length) return '';
        const index = Math.abs((Number(seed) || 0) + (Number(offset) || 0)) % source.length;
        return asString(source[index]);
    }

    function mergeUniquePlaces(primary, secondary, maxCount) {
        const out = [];
        const seen = {};
        const source = (Array.isArray(primary) ? primary : []).concat(Array.isArray(secondary) ? secondary : []);
        const limit = Math.max(4, Number(maxCount) || 8);
        for (let i = 0; i < source.length; i++) {
            const value = asString(source[i]);
            if (!value) continue;
            const key = value.toLowerCase();
            if (seen[key]) continue;
            seen[key] = true;
            out.push(value);
            if (out.length >= limit) break;
        }
        return out;
    }

    function buildGeneratedItineraryPlacePool(context, pack) {
        const textSource = [
            asString(context && context.roleId),
            asString(context && context.roleName),
            asString(context && context.personaText),
            asString(context && context.worldBookText),
            asString(pack && pack.recentChatText),
            formatMonthDay(new Date())
        ].join('\n');
        const seed = hashStringSeed(textSource);
        const semantic = (asString(context && context.roleName) + '\n' + asString(context && context.personaText)).toLowerCase();

        const prefixes = /(学生|校园|学院|论文|导师|社团)/.test(semantic)
            ? ['松屿', '岚桥', '雾杉', '南汀', '栖川', '银杏', '鹿鸣', '朝汐']
            : (/(歌手|艺人|演员|明星|偶像|巡演|录音)/.test(semantic)
                ? ['回声', '晚星', '雾港', '光穹', '音岬', '潮幕', '霓湾', '映潮']
                : (/(总裁|集团|董事会|商务|审计|并购|投资)/.test(semantic)
                    ? ['曜庭', '镜湾', '北屿', '云晟', '金榭', '辰港', '远岚', '栖梧']
                    : ['暮川', '北岬', '白榆', '雾桥', '汐岚', '长堤', '晴港', '澄屿']));
        const cores = ['街区', '港口', '园区', '会馆', '码头', '医院', '公寓区', '步行街', '剧场区', '研发中心', '中庭', '旧仓区'];
        const altCores = ['东站', '西站', '南站', '北站', '连廊', '广场', '大剧院', '艺术中心'];
        const out = [];

        for (let i = 0; i < 16 && out.length < 9; i++) {
            const a = pickBySeed(prefixes, seed, i * 13 + 3);
            const b = pickBySeed(cores, seed, i * 17 + 5);
            const c = pickBySeed(altCores, seed, i * 19 + 7);
            const place = i % 3 === 0 ? (a + b) : (a + c);
            if (!place) continue;
            if (out.indexOf(place) === -1) out.push(place);
        }

        return out.slice(0, 8);
    }

    function buildDefaultItineraryPlacePool(context, pack) {
        const hints = Array.isArray(pack && pack.placeHints) ? pack.placeHints.map(asString).filter(Boolean) : [];
        const generated = buildGeneratedItineraryPlacePool(context, pack);
        if (hints.length >= 4) return mergeUniquePlaces(hints, generated, 8);
        return mergeUniquePlaces(hints, generated, 8);
    }

    function buildItineraryBlueprint(context, pack) {
        const placePool = buildDefaultItineraryPlacePool(context, pack);
        const home = placePool[0];
        const destinations = placePool.slice(1);
        const companion = inferItineraryCompanionLabel(pack);
        const seatSide = inferTravelSeatPreference(context);
        const relation = asString(pack && pack.relationshipStatus);
        const recentChat = asString(pack && pack.recentChatText);

        const upcomingThemes = relation === '已婚' || relation === '同居'
            ? [
                '提前留好的双人短途，把答应过的陪伴真正排进日程',
                '一起去和世界书事件有关的地点，像补上迟到很久的约定',
                '替两个人把返程也先订好，避免临时改签打断相处'
            ]
            : [
                '提前准备好的见面行程，让这趟同行显得郑重',
                '为了兑现聊天里提过的目的地，先把双人位置留住',
                '把下一次真正同行的证据先订下来，不再停留在口头上'
            ];

        const chatEcho = recentChat
            ? ('最近聊天里已经出现过的情绪或约定：' + recentChat.slice(0, 120))
            : '最近聊天没有明确地点时，也要让未来票根显得像早就商量好的计划。';

        const items = [];
        items.push({
            status: 'Completed',
            fromPlace: home,
            toPlace: destinations[0] || home,
            companion: companion,
            purpose: '历史记录，像一趟已经发生过的真实同行或探访',
            seat: buildPairedSeatLabel('train', seatSide, 0),
            noteGuide: '克制、平静，像看着旧票根时会想起的那句心事'
        });

        for (let i = 0; i < Math.min(3, Math.max(2, destinations.length)); i++) {
            const toPlace = destinations[(i + 1) % Math.max(1, destinations.length)] || home;
            items.push({
                status: 'Upcoming',
                fromPlace: i % 2 === 0 ? home : (destinations[i - 1] || home),
                toPlace: toPlace,
                companion: companion,
                purpose: upcomingThemes[i % upcomingThemes.length],
                seat: buildPairedSeatLabel(i % 2 === 0 ? 'flight' : 'train', seatSide, i + 1),
                noteGuide: chatEcho
            });
        }

        return items.slice(0, 4);
    }

    function looksLikeRealWorldPlace(text) {
        const value = asString(text);
        if (!value) return false;
        return /(北京|上海|广州|深圳|杭州|南京|苏州|成都|重庆|天津|武汉|西安|长沙|郑州|青岛|厦门|首都|大兴|宝安|白云|虹桥|浦东|朝阳站|广州南|深圳北|东京|大阪|首尔|巴黎|伦敦|纽约)/.test(value);
    }

    function inferItineraryTravelClass(context, type) {
        const source = [
            asString(context && context.roleName),
            asString(context && context.personaText),
            asString(context && context.worldBookText)
        ].join('\n');
        if (type === 'train') {
            if (/(总裁|总监|集团|董事会|商务|审批)/.test(source)) return 'Business';
            return 'Second Class';
        }
        if (/(总裁|总监|集团|董事会|商务|审批)/.test(source)) return 'Business';
        if (/(歌手|明星|艺人|演员|偶像)/.test(source)) return 'Business';
        return 'Economy';
    }

    function maybeAlignItineraryTicketToBlueprint(ticket, blueprintItem, context, options, index) {
        const row = asObject(ticket);
        const plan = asObject(blueprintItem);
        if (!Object.keys(plan).length) return row;

        const out = Object.assign({}, row);
        const status = asString(out.status);
        const type = asString(out.type) || (index % 2 === 0 ? 'flight' : 'train');
        const placeHints = Array.isArray(options && options.placeHints) ? options.placeHints.map(asString).filter(Boolean) : [];
        const searchText = [
            asString(out.from && out.from.city),
            asString(out.from && out.from.station),
            asString(out.to && out.to.city),
            asString(out.to && out.to.station),
            asString(out.purpose)
        ].join(' ');
        const hasHintMatch = placeHints.some(function (hint) { return searchText.indexOf(hint) !== -1; });

        out.type = type;
        out.class = asString(out.class) || inferItineraryTravelClass(context, type);
        if (status === 'Upcoming') {
            out.seat = /双人|连坐|相邻|并排|同舱|邻座/.test(asString(out.seat)) ? asString(out.seat) : asString(plan.seat);
            out.companion = asString(out.companion) || asString(plan.companion);
            out.purpose = asString(out.purpose) || asString(plan.purpose);
        }
        if (!asString(out.from && out.from.station)) {
            out.from = Object.assign({}, asObject(out.from), {
                station: buildWorldbookTransitName(asString(out.from && out.from.city) || asString(plan.fromPlace), type, context && context.roleName)
            });
        }
        if (!asString(out.to && out.to.station)) {
            out.to = Object.assign({}, asObject(out.to), {
                station: buildWorldbookTransitName(asString(out.to && out.to.city) || asString(plan.toPlace), type, context && context.roleName)
            });
        }

        const fromCityText = asString(out.from && out.from.city);
        const toCityText = asString(out.to && out.to.city);
        const isLocalTransport = /car|taxi|subway|bus|bike/i.test(out.type || type);
        const hasValidLocalStations = isLocalTransport && out.from && out.to && out.from.station && out.to.station && out.from.station !== out.to.station;

        const isValidCrossCity = !isLocalTransport && fromCityText && toCityText && fromCityText !== toCityText;

        // 极大放宽拦截规则：只要结构基本合理（同城有不同站点，或跨城有不同城市），就完全信任大模型，不再强制校验世界书 (hasHintMatch)。
        const isFundamentallyBroken = (!fromCityText || !toCityText)
            || (!isLocalTransport && fromCityText === toCityText)
            || (isLocalTransport && !hasValidLocalStations);

        if (isFundamentallyBroken) {
            const forcedType = asString(out.type) || type;
            const fromPlanPlace = asString(plan.fromPlace);
            const toPlanPlace = asString(plan.toPlace);
            if (forcedType === 'car' || forcedType === 'taxi' || forcedType === 'subway' || forcedType === 'bus' || forcedType === 'bike') {
                const cityName = inferItineraryCityName(fromPlanPlace || toPlanPlace, context, index);
                out.from = Object.assign({}, asObject(out.from), {
                    city: cityName,
                    station: fromPlanPlace || asString(out.from && out.from.station) || '出发地'
                });
                out.to = Object.assign({}, asObject(out.to), {
                    city: cityName,
                    station: toPlanPlace || asString(out.to && out.to.station) || '目的地'
                });
                if (status === 'Upcoming') {
                    out.purpose = asString(out.purpose) || asString(plan.purpose);
                }
                return out;
            }

            const fromCityName = inferItineraryCityName(fromPlanPlace, context, index);
            const toCityName = inferItineraryCityName(toPlanPlace, context, index + 1);

            const finalToCityName = fromCityName === toCityName ? (toCityName.replace(/(市|城|都|州|港|湾|岛)$/, '') + '外围区') : toCityName;

            out.from = Object.assign({}, asObject(out.from), {
                city: fromCityName,
                station: buildWorldbookTransitName(fromCityName, forcedType, context && context.roleName)
            });
            out.to = Object.assign({}, asObject(out.to), {
                city: finalToCityName,
                station: buildWorldbookTransitName(finalToCityName, forcedType, context && context.roleName)
            });
            if (status === 'Upcoming') {
                out.purpose = asString(out.purpose) || asString(plan.purpose);
            }
        }

        return out;
    }

    function buildLooseItineraryDate(value) {
        const text = asString(value).toUpperCase();
        if (text) return text;
        const now = new Date();
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        return months[now.getMonth()] + ' ' + String(now.getDate()).padStart(2, '0');
    }

    function buildDefaultItinerarySeat(type, seatSide, status) {
        if (type === 'car') return '主驾驶座 / 副驾驶座';
        if (type === 'taxi') return '后排并排';
        if (type === 'train') return status === 'Upcoming' ? buildPairedSeatLabel('train', seatSide, 0) : ('08A (' + seatSide + ')');
        return status === 'Upcoming' ? buildPairedSeatLabel('flight', seatSide, 0) : ('12A (' + seatSide + ')');
    }

    function buildDefaultItineraryDuration(type) {
        if (type === 'bike') return '20m';
        if (type === 'car' || type === 'taxi') return '35m';
        if (type === 'subway' || type === 'bus') return '40m';
        if (type === 'train') return '1h 20m';
        return '2h 10m';
    }

    function inferTravelSeatPreference(context) {
        const source = [
            asString(context && context.roleName),
            asString(context && context.personaText),
            asString(context && context.worldBookText)
        ].join('\n');
        if (/(清静|安静|安稳|喜欢窗边|怕被打扰|独处|看风景)/.test(source)) return 'Window';
        if (/(工作狂|效率|忙|项目|会议|回消息|不停切换)/.test(source)) return 'Aisle';
        return 'Window';
    }

    function buildDefaultShadowItineraryTickets(context, options) {
        const mode = inferShadowWorkMode(context);
        const seatSide = inferTravelSeatPreference(context);
        const relation = asString(options && options.relationshipStatus);
        if (mode === 'fighter') {
            return {
                tickets: [
                    {
                        type: 'train',
                        id: 'G7311',
                        date: 'APR 10',
                        from: { city: '北京', time: '15:20', station: '朝阳站' },
                        to: { city: '天津', time: '16:04', station: '天津站' },
                        duration: '44m',
                        class: 'Second Class',
                        seat: '05A (' + seatSide + ')',
                        status: 'Upcoming',
                        note: '就一站路，没必要想太多。把手伤处理好，比逞强重要。'
                    },
                    {
                        type: 'flight',
                        id: 'CA1887',
                        date: 'APR 03',
                        from: { city: '北京', time: '06:50', station: '首都 PEK' },
                        to: { city: '广州', time: '10:05', station: '白云 CAN' },
                        duration: '3h 15m',
                        class: 'Economy',
                        seat: '27A (' + seatSide + ')',
                        status: 'Completed',
                        note: '早班机最适合闭嘴。睡不着也好，正好把比赛录像再过一遍。'
                    }
                ]
            };
        }
        if (mode === 'student') {
            return {
                tickets: [
                    {
                        type: 'train',
                        id: 'G108',
                        date: 'APR 12',
                        from: { city: '北京', time: '19:30', station: '朝阳站' },
                        to: { city: '上海', time: '22:45', station: '虹桥站' },
                        duration: '3h 15m',
                        class: 'Second Class',
                        seat: '13A (' + seatSide + ')',
                        status: 'Upcoming',
                        note: '预算有点紧，但这趟还是得去。答应过的事总不能临时装作忘了。'
                    },
                    {
                        type: 'train',
                        id: 'K145',
                        date: 'APR 01',
                        from: { city: '北京', time: '22:14', station: '北京站' },
                        to: { city: '郑州', time: '05:42', station: '郑州站' },
                        duration: '7h 28m',
                        class: 'Hard Seat',
                        seat: '无座 (No Seat)',
                        status: 'Completed',
                        note: '站一路也认了。省下来的钱够多印两份资料，比什么都实在。'
                    }
                ]
            };
        }
        if (mode === 'idol') {
            return {
                tickets: [
                    {
                        type: 'flight',
                        id: 'MU5128',
                        date: 'APR 11',
                        from: { city: '上海', time: '08:20', station: '虹桥 SHA' },
                        to: { city: '深圳', time: '10:50', station: '宝安 SZX' },
                        duration: '2h 30m',
                        class: 'Business',
                        seat: '03A (' + seatSide + ')',
                        status: 'Upcoming',
                        note: '落地之后又是一整天通告。至少在登机前这二十分钟，谁都别来叫我说话。'
                    },
                    {
                        type: 'flight',
                        id: 'CZ3901',
                        date: 'APR 05',
                        from: { city: '北京', time: '06:40', station: '大兴 PKX' },
                        to: { city: '成都', time: '09:55', station: '天府 TFU' },
                        duration: '3h 15m',
                        class: 'Business',
                        seat: '02F (Aisle)',
                        status: 'Completed',
                        note: '妆还没上，人先累了。幸好飞机上的这点安静，足够把情绪压回去。'
                    }
                ]
            };
        }
        if (mode === 'executive') {
            return {
                tickets: [
                    {
                        type: 'flight',
                        id: 'HU7603',
                        date: 'APR 09',
                        from: { city: '北京', time: '07:10', station: '大兴 PKX' },
                        to: { city: '深圳', time: '10:05', station: '宝安 SZX' },
                        duration: '2h 55m',
                        class: 'First Class',
                        seat: '02C (Aisle)',
                        status: 'Upcoming',
                        note: relation === '同居' || relation === '已婚'
                            ? '就离开两天，还是觉得行李箱太空。家里有人等的时候，出差会变得格外漫长。'
                            : '这趟会开完就回，不值得多停。项目比情绪可靠得多。'
                    },
                    {
                        type: 'flight',
                        id: 'MU5183',
                        date: 'APR 02',
                        from: { city: '北京', time: '06:15', station: '大兴 PKX' },
                        to: { city: '深圳', time: '08:55', station: '宝安 SZX' },
                        duration: '2h 40m',
                        class: 'Business',
                        seat: '03C (Aisle)',
                        status: 'Completed',
                        note: '红眼后的晨会最能检验一个团队值不值得继续投资源。困可以忍，失误不行。'
                    }
                ]
            };
        }
        return {
            tickets: [
                {
                    type: 'train',
                    id: 'D2216',
                    date: 'APR 10',
                    from: { city: '杭州', time: '09:12', station: '杭州东' },
                    to: { city: '南京', time: '10:43', station: '南京南' },
                    duration: '1h 31m',
                    class: 'Second Class',
                    seat: '08A (' + seatSide + ')',
                    status: 'Upcoming',
                    note: relation === '同居' || relation === '已婚'
                        ? '只是去一天，还是会下意识算回家的时间。有人等的时候，连短差都像借来的。'
                        : '路不算远，事情却不少。希望回程前能把该说的都说清。'
                },
                {
                    type: 'flight',
                    id: 'CA1692',
                    date: 'APR 04',
                    from: { city: '上海', time: '18:35', station: '虹桥 SHA' },
                    to: { city: '北京', time: '20:50', station: '首都 PEK' },
                    duration: '2h 15m',
                    class: 'Economy',
                    seat: '32A (' + seatSide + ')',
                    status: 'Completed',
                    note: '返程通常比去程安静。事情做完以后，人反而容易在路上突然觉得累。'
                }
            ]
        };
    }

    function normalizeShadowItineraryData(payload, context, options) {
        const source = Array.isArray(payload)
            ? payload
            : (Array.isArray(asObject(payload).tickets) ? asObject(payload).tickets : []);
        const blueprint = Array.isArray(options && options.blueprint) ? options.blueprint : [];
        const tickets = source.slice(0, 4).map(function (item, index) {
            const row = maybeAlignItineraryTicketToBlueprint(asObject(item), blueprint[index], context, options, index);
            const from = asObject(row.from || {});
            const to = asObject(row.to || {});
            const plan = asObject(blueprint[index]);
            const seatSide = inferTravelSeatPreference(context);

            let type = asString(row.type).toLowerCase();
            if (!/^(flight|train|car|taxi|subway|bus|bike)$/.test(type)) {
                type = /taxi|cab/i.test(type) ? 'taxi' : (/car|drive|auto/i.test(type) ? 'car' : (/subway|metro/i.test(type) ? 'subway' : (/bus/i.test(type) ? 'bus' : (/bike|cycle|ride/i.test(type) ? 'bike' : (/train/i.test(type) ? 'train' : 'flight')))));
            }

            const status = /upcoming/i.test(asString(row.status)) ? 'Upcoming' : 'Completed';
            const id = asString(row.id || row.code || row.number || '行程单');
            const date = buildLooseItineraryDate(row.date || row.day || plan.date);
            let seat = asString(row.seat || row.berth || '');
            const note = asString(row.note || row.memo || plan.noteGuide || '这趟路程被记下来了。');
            const companion = asString(row.companion || row.with || row.partner || plan.companion || '同行人');
            const purpose = asString(row.purpose || row.reason || plan.purpose || '出行安排');

            const price = asString(row.price || row.cost || row.amount || '—');
            const vehicleInfo = asString(row.vehicleInfo || row.vehicle || row.model || '');

            if (type === 'car') {
                seat = /主驾|主驾驶|副驾|副驾驶|驾驶位|同行|后座/.test(seat) ? seat : '主驾驶座 / 副驾驶座';
            } else if (type === 'taxi') {
                seat = /后排|并排|后座|同行/.test(seat) ? seat : '后排并排';
            } else if (type === 'subway' || type === 'bus') {
                seat = /站|坐|并排|靠/.test(seat) ? seat : '';
            } else if (type === 'bike') {
                seat = /并排|同行|跟|骑/.test(seat) ? seat : '';
            }

            if (!seat && (type === 'flight' || type === 'train' || type === 'car' || type === 'taxi')) seat = buildDefaultItinerarySeat(type, seatSide, status);

            let fromCity = asString(from.city || plan.fromPlace || '出发地');
            let toCity = asString(to.city || plan.toPlace || '目的地');
            let fromStation = asString(from.station || buildWorldbookTransitName(fromCity, type, context && context.roleName));
            let toStation = asString(to.station || buildWorldbookTransitName(toCity, type, context && context.roleName));
            if (type === 'car' || type === 'taxi' || type === 'subway' || type === 'bus' || type === 'bike') {
                const routeText = [purpose, note, companion].join(' ');
                const sharedCity = inferItineraryCityName(fromCity || toCity || fromStation || toStation, context, index);
                fromCity = inferItineraryCityName(fromCity || sharedCity, context, index);
                toCity = inferItineraryCityName(toCity || sharedCity, context, index + 1);
                if (/(接|送|回家|到家|上班|下班|放学|收工|住处|公寓|公司|会议|会场|医院|复诊|看诊)/.test(routeText)) {
                    const city = fromCity && !looksLikeDetailedLocalPlace(fromCity) && !looksLikeTransitDetail(fromCity) ? fromCity : sharedCity;
                    fromCity = city;
                    toCity = city;
                }
                const localPair = inferLocalRoutePair(routeText, context, options);
                if (shouldReplaceLocalDetail(fromStation, fromCity)) fromStation = localPair.from;
                if (shouldReplaceLocalDetail(toStation, toCity)) toStation = localPair.to;
                if (fromStation === toStation) {
                    toStation = localPair.to && localPair.to !== fromStation ? localPair.to : (toStation + '东门');
                }
            }

            const hourOffset = index * 2;
            const baseHour = status === 'Upcoming' ? 9 : 14;
            const fromHour = (baseHour + hourOffset) % 24;
            const toHour = (fromHour + (type === 'flight' || type === 'train' ? 2 : 0)) % 24;

            const fromTime = asString(from.time || (String(fromHour).padStart(2, '0') + ':10'));
            const toTime = asString(to.time || (String(toHour).padStart(2, '0') + (type === 'flight' || type === 'train' ? ':20' : ':45')));

            if (!id || !date || !fromCity || !toCity) return null;
            return {
                type: type,
                id: id,
                date: date,
                from: {
                    city: fromCity,
                    time: fromTime,
                    station: fromStation
                },
                to: {
                    city: toCity,
                    time: toTime,
                    station: toStation
                },
                duration: asString(row.duration || buildDefaultItineraryDuration(type)),
                class: asString(row.class || inferItineraryTravelClass(context, type)),
                seat: seat,
                price: price,
                vehicleInfo: vehicleInfo,
                status: status,
                companion: companion,
                purpose: purpose,
                note: note
            };
        }).filter(Boolean);

        return {
            tickets: tickets
        };
    }

    function isValidShadowItineraryData(payload, options) {
        const data = asObject(payload);
        const tickets = Array.isArray(data.tickets) ? data.tickets : [];
        if (tickets.length < 2 || tickets.length > 4) return false;
        const upcoming = tickets.filter(function (item) { return asString(item.status) === 'Upcoming'; });
        const completed = tickets.filter(function (item) { return asString(item.status) === 'Completed'; });
        if (!upcoming.length && !completed.length) return false;

        const valid = tickets.every(function (item) {
            const row = asObject(item);
            const from = asObject(row.from || {});
            const to = asObject(row.to || {});
            const seatText = asString(row.seat);
            return !!asString(row.id)
                && !!asString(row.date)
                && !!asString(from.city)
                && !!asString(to.city)
                && !!asString(row.note);
        });

        return valid;
    }

    function ensureMessagesForGeneratedContact(messages, contactName) {
        const src = Array.isArray(messages) ? messages : [];
        const out = [];
        for (let i = 0; i < src.length && out.length < 8; i++) {
            const row = src[i];
            if (typeof row === 'string') {
                const text = asString(row);
                if (!text) continue;
                out.push({ speaker: '对方', text: text, timestamp: 0 });
                continue;
            }
            const obj = asObject(row);
            const speaker = asString(obj.speaker || obj.role || '对方') || '对方';
            const text = asString(obj.text || obj.message || obj.content || '');
            if (!text) continue;
            out.push({ speaker: speaker, text: text, timestamp: Number(obj.timestamp) || 0 });
        }
        return out.slice(0, 8);
    }

    function normalizeShadowWechatData(payload, context, options) {
        const data = asObject(payload);
        const opts = asObject(options);
        const roleName = asString(context.roleName || 'TA');
        const userName = asString(opts.userName || '你') || '你';
        const realUserMessages = Array.isArray(opts.realUserMessages) ? opts.realUserMessages : [];
        const realFavoriteItems = Array.isArray(opts.realFavoriteItems) ? opts.realFavoriteItems : [];

        const contactsData = asObject(data.contacts || {});
        const pinnedData = asObject(contactsData.pinnedUser || {});
        const pinnedRemark = asString(pinnedData.remark || pinnedData.note || '');
        const pinnedUser = {
            contactId: 'user',
            name: userName,
            remark: pinnedRemark,
            latestMood: asString(pinnedData.latestMood || pinnedData.mood || ''),
            recentMessages: realUserMessages.slice(-10)
        };

        const generatedRaw = Array.isArray(contactsData.generatedContacts)
            ? contactsData.generatedContacts
            : (Array.isArray(data.generatedContacts) ? data.generatedContacts : []);
        const generatedContacts = generatedRaw.slice(0, 6).map(function (item, index) {
            const row = asObject(item);
            const name = asString(row.name || row.contactName || '');
            const category = asString(row.category || row.group || '');
            const remark = asString(row.remark || row.note || '');
            const recentMessages = ensureMessagesForGeneratedContact(row.recentMessages || row.messages, name);
            return {
                contactId: 'c_' + String(index + 1),
                name: name,
                category: category,
                remark: remark,
                recentMessages: recentMessages
            };
        }).filter(function (item) {
            return !!asString(item.name) && !!asString(item.category) && item.recentMessages.length >= 4;
        });

        const draftsSource = Array.isArray(contactsData.drafts)
            ? contactsData.drafts
            : (Array.isArray(data.drafts) ? data.drafts : []);
        const drafts = draftsSource.map(asString).filter(Boolean).slice(0, 5);

        const subsData = asObject(data.subscriptions || {});
        const subscriptionsRaw = Array.isArray(subsData.items) ? subsData.items : (Array.isArray(data.subscriptions) ? data.subscriptions : []);
        const subscriptions = subscriptionsRaw.slice(0, 5).map(function (item, idx) {
            if (typeof item === 'string') {
                const titleText = asString(item);
                return {
                    title: titleText,
                    summary: '',
                    source: '',
                    fullText: titleText
                };
            }
            const row = asObject(item);
            return {
                title: asString(row.title || ''),
                summary: asString(row.summary || row.desc || ''),
                source: asString(row.source || row.account || ''),
                fullText: asString(row.fullText || row.content || row.article || row.summary || row.desc || ''),
                isSaved: row.isSaved === true,
                saveComment: asString(row.saveComment || row.annotation || row.reason || '')
            };
        }).filter(function (item) {
            return !!asString(item.title) && !!asString(item.fullText);
        });

        const chatFavorites = realFavoriteItems.slice(0, 5).map(function (item, idx) {
            const row = asObject(item);
            return {
                title: asString(row.title || ('聊天收藏 ' + String(idx + 1))) || ('聊天收藏 ' + String(idx + 1)),
                excerpt: asString(row.excerpt || row.content || ''),
                annotation: asString(row.annotation || row.reason || ''),
                reason: asString(row.reason || '来自真实聊天记录'),
                source: 'real_chat',
                kind: asString(row.kind || 'quote') || 'quote',
                speakerName: asString(row.speakerName || userName) || userName,
                rawText: asString(row.rawText || ''),
                timestamp: Number(row.timestamp) || 0
            };
        }).filter(function (item) { return !!item.excerpt; });

        const favoriteData = asObject(data.favorites || {});
        const externalFavorites = buildSavedTweetFavoriteItems(favoriteData.items, subscriptions, 3);
        const favorites = chatFavorites.concat(externalFavorites).slice(0, 8);

        return {
            contacts: {
                pinnedUser: pinnedUser,
                generatedContacts: generatedContacts.slice(0, 6),
                drafts: drafts.slice(0, 5)
            },
            subscriptions: {
                items: subscriptions.slice(0, 5)
            },
            favorites: {
                items: favorites.slice(0, 5)
            },
            meta: {
                roleId: asString(context.roleId || ''),
                roleName: roleName,
                generatedAt: Date.now()
            }
        };
    }

    function isValidShadowWechatData(payload) {
        const data = asObject(payload);
        const contacts = asObject(data.contacts || {});
        const generatedContacts = Array.isArray(contacts.generatedContacts) ? contacts.generatedContacts : [];
        const drafts = Array.isArray(contacts.drafts) ? contacts.drafts : [];
        const subscriptions = Array.isArray(asObject(data.subscriptions || {}).items) ? asObject(data.subscriptions || {}).items : [];

        if (generatedContacts.length < 2 || generatedContacts.length > 6) return false;
        if (drafts.length < 2 || drafts.length > 5) return false;
        if (subscriptions.length < 2 || subscriptions.length > 5) return false;

        return generatedContacts.every(function (item) {
            const row = asObject(item);
            const recentMessages = Array.isArray(row.recentMessages) ? row.recentMessages : [];
            return !!asString(row.name)
                && !!asString(row.category)
                && recentMessages.length >= 4
                && recentMessages.length <= 8
                && recentMessages.every(function (message) {
                    const msg = asObject(message);
                    return !!asString(msg.speaker) && !!asString(msg.text);
                });
        }) && drafts.every(function (item) {
            return !!asString(item);
        }) && subscriptions.every(function (item) {
            const row = asObject(item);
            return !!asString(row.title)
                && !!asString(row.fullText)
                && !!asString(row.fullText);
        });
    }

    function normalizeSceneData(scene, payload, context) {
        if (scene === 'fangcun') return normalizeFangCunData(payload, context);
        if (scene === 'ninan') return normalizeNiNanData(payload, context);
        if (scene === 'chenfeng') return normalizeChenFengData(payload, context);
        if (scene === 'shadow_memos') return normalizeShadowMemosData(payload, context);
        if (scene === 'shadow_diary') return normalizeShadowDiaryData(payload, context);
        if (scene === 'shadow_shopping') return normalizeShadowShoppingData(payload, context);
        if (scene === 'shadow_youtube') return normalizeShadowYoutubeData(payload, context);
        if (scene === 'shadow_appstore') return normalizeShadowAppStoreData(payload, context);
        if (scene === 'shadow_settings') return normalizeShadowSettingsData(payload, context);
        if (scene === 'shadow_assets') return normalizeShadowAssetsData(payload, context);
        if (scene === 'shadow_health') return normalizeShadowHealthData(payload, context);
        if (scene === 'shadow_food') return normalizeShadowFoodData(payload, context);
        if (scene === 'shadow_game') return normalizeShadowGameData(payload, context);
        if (scene === 'shadow_calls') return normalizeShadowCallsData(payload, context);
        if (scene === 'shadow_sms') return normalizeShadowSMSData(payload, context);
        if (scene === 'shadow_browser') return normalizeShadowBrowserData(payload, context);
        if (scene === 'shadow_photos') return normalizeShadowPhotosData(payload, context);
        if (scene === 'shadow_reading') return normalizeShadowReadingData(payload, context);
        if (scene === 'shadow_itinerary') return normalizeShadowItineraryData(payload, context, {});
        if (scene === 'shadow_work') return normalizeShadowWorkData(payload, context);
        if (scene === 'shadow_wechat') return normalizeShadowWechatData(payload, context, {});
        return asObject(payload);
    }

    function validateSceneData(scene, data, options) {
        if (scene === 'shadow_memos') {
            return isValidShadowMemosData(data) ? '' : '备忘录生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_diary') {
            return isValidShadowDiaryData(data) ? '' : '私密日记生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_shopping') {
            return isValidShadowShoppingData(data) ? '' : '购物记录生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_youtube') {
            return isValidShadowYoutubeData(data) ? '' : 'YouTube记录生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_appstore') {
            return isValidShadowAppStoreData(data) ? '' : 'App Store记录生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_settings') {
            return isValidShadowSettingsData(data) ? '' : '设置页生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_assets') {
            return isValidShadowAssetsData(data) ? '' : '资产与流水生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_health') {
            return isValidShadowHealthData(data) ? '' : '运动与健康生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_food') {
            return isValidShadowFoodData(data) ? '' : '外卖记录生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_game') {
            return isValidShadowGameData(data) ? '' : '游戏记录生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_calls') {
            return isValidShadowCallsData(data) ? '' : '通话记录生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_sms') {
            return isValidShadowSMSData(data) ? '' : '短信记录生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_browser') {
            return isValidShadowBrowserData(data) ? '' : '浏览器记录生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_photos') {
            return isValidShadowPhotosData(data) ? '' : '相册记录生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_reading') {
            return isValidShadowReadingData(data) ? '' : '阅读记录生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_work') {
            return isValidShadowWorkData(data) ? '' : '工作档案生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_wechat') {
            return isValidShadowWechatData(data) ? '' : '微信子App生成结果不完整，请重新生成。';
        }
        if (scene === 'shadow_itinerary') {
            return isValidShadowItineraryData(data, options) ? '' : '出行票根生成结果不完整，请重新生成。';
        }
        return '';
    }

    async function generateSceneContent(scene, options) {
        const opts = asObject(options);
        const sceneKey = asString(scene);
        if (!SCENE_META[sceneKey]) {
            return { ok: false, error: '未知场景：' + sceneKey };
        }

        const context = resolveRoleContext(opts.roleId);
        if (!context.ok) return { ok: false, error: context.error || '角色未准备好' };

        const roleId = context.roleId;
        if (opts.force !== true) {
            const cached = readSceneCache(sceneKey, roleId);
            const cachedError = cached && cached.data ? validateSceneData(sceneKey, cached.data, {}) : '缓存缺失';
            const cachedQualityIssue = cached && cached.data ? getNormalizedBatchSceneIssue(sceneKey, cached.data) : '';
            if (cached && typeof cached === 'object' && cached.data && !cachedError && !cachedQualityIssue) {
                return {
                    ok: true,
                    fromCache: true,
                    scene: sceneKey,
                    context: context,
                    data: cached.data,
                    cachedAt: Number(cached.cachedAt) || 0,
                    rawResponse: asString(cached.rawResponse || '')
                };
            }
        }

        const basePrompt = buildBasePrompt(context);
        const scenePrompt = buildScenePrompt(sceneKey, context);
        const finalSystemPrompt = basePrompt + '\n\n' + scenePrompt;
        const userMessage = buildUserMessage(sceneKey, context);

        writePromptDebugRecord(sceneKey, roleId, {
            roleName: context.roleName,
            contextSummary: context.contextSummary,
            basePrompt: basePrompt,
            scenePrompt: scenePrompt,
            finalSystemPrompt: finalSystemPrompt,
            userMessage: userMessage,
            responseText: '',
            errorMessage: ''
        });

        try {
            const rawResponse = await callParentAI(context, finalSystemPrompt, userMessage, opts.requestOptions);
            const parsed = parseJsonFromText(rawResponse);
            const data = normalizeSceneData(sceneKey, parsed || {}, context);
            const validationError = validateSceneData(sceneKey, data, {});
            if (validationError) throw new Error(validationError);
            writeSceneCache(sceneKey, roleId, {
                roleId: roleId,
                roleName: context.roleName,
                scene: sceneKey,
                cachedAt: Date.now(),
                data: data,
                rawResponse: rawResponse
            });
            writePromptDebugRecord(sceneKey, roleId, {
                roleName: context.roleName,
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: rawResponse,
                errorMessage: ''
            });
            return {
                ok: true,
                fromCache: false,
                scene: sceneKey,
                context: context,
                data: data,
                rawResponse: rawResponse,
                prompts: {
                    basePrompt: basePrompt,
                    scenePrompt: scenePrompt,
                    finalSystemPrompt: finalSystemPrompt,
                    userMessage: userMessage
                }
            };
        } catch (error) {
            const message = asString(error && error.message ? error.message : error) || '生成失败';
            writePromptDebugRecord(sceneKey, roleId, {
                roleName: context.roleName,
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: '',
                errorMessage: message
            });
            return { ok: false, error: message, context: context };
        }
    }

    async function generateShadowDiaryContent(options) {
        const opts = asObject(options);
        const sceneKey = 'shadow_diary';
        const context = resolveRoleContext(opts.roleId);
        if (!context.ok) return { ok: false, error: context.error || '角色未准备好' };

        const roleId = context.roleId;
        if (opts.force !== true) {
            const cached = readSceneCache(sceneKey, roleId);
            const cachedError = cached && cached.data ? validateSceneData(sceneKey, cached.data, {}) : '缓存缺失';
            if (cached && cached.data && !cachedError) {
                return {
                    ok: true,
                    fromCache: true,
                    scene: sceneKey,
                    context: context,
                    data: cached.data,
                    cachedAt: Number(cached.cachedAt) || 0,
                    rawResponse: asString(cached.rawResponse || '')
                };
            }
        }

        const pack = buildShadowWechatContextPack(context);
        const basePrompt = buildBasePrompt(context);
        const scenePrompt = buildScenePrompt(sceneKey, context);
        const extraBlocks = [];
        if (pack.userInfoText) extraBlocks.push('【用户信息】\n' + pack.userInfoText);
        if (pack.memoryText) extraBlocks.push('【近期记忆】\n' + pack.memoryText);
        const finalSystemPrompt = [basePrompt, scenePrompt].concat(extraBlocks).join('\n\n');
        const userMessage = '请开始写今天的日记，总字数 300 字左右，优先包含 <scratch> 标签包裹的涂抹心理，只输出 JSON 对象。';

        writePromptDebugRecord(sceneKey, roleId, {
            roleName: context.roleName,
            contextSummary: context.contextSummary,
            basePrompt: basePrompt,
            scenePrompt: scenePrompt,
            finalSystemPrompt: finalSystemPrompt,
            userMessage: userMessage,
            responseText: '',
            errorMessage: ''
        });

        try {
            const rawResponse = await callParentAI(context, finalSystemPrompt, userMessage, Object.assign({
                temperature: 0.75,
                maxTokens: 2000
            }, asObject(opts.requestOptions)));
            const parsed = parseJsonFromText(rawResponse);
            const data = normalizeSceneData(sceneKey, parsed || {}, context);
            const validationError = validateSceneData(sceneKey, data, {});
            if (validationError) throw new Error(validationError);
            writeSceneCache(sceneKey, roleId, {
                roleId: roleId,
                roleName: context.roleName,
                scene: sceneKey,
                cachedAt: Date.now(),
                data: data,
                rawResponse: rawResponse
            });
            writePromptDebugRecord(sceneKey, roleId, {
                roleName: context.roleName,
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: rawResponse,
                errorMessage: ''
            });
            return {
                ok: true,
                fromCache: false,
                scene: sceneKey,
                context: context,
                data: data,
                rawResponse: rawResponse,
                prompts: {
                    basePrompt: basePrompt,
                    scenePrompt: scenePrompt,
                    finalSystemPrompt: finalSystemPrompt,
                    userMessage: userMessage
                }
            };
        } catch (error) {
            const message = asString(error && error.message ? error.message : error) || '生成失败';
            writePromptDebugRecord(sceneKey, roleId, {
                roleName: context.roleName,
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: '',
                errorMessage: message
            });
            return { ok: false, error: message, context: context };
        }
    }

    async function generateShadowShoppingContent(options) {
        const opts = asObject(options);
        const requestOptions = Object.assign({
            temperature: 0.72,
            maxTokens: 1600
        }, asObject(opts.requestOptions));
        return generateSceneContent('shadow_shopping', Object.assign({}, opts, {
            requestOptions: requestOptions
        }));
    }

    async function generateShadowYoutubeContent(options) {
        const opts = asObject(options);
        const requestOptions = Object.assign({
            temperature: 0.78,
            maxTokens: 1800
        }, asObject(opts.requestOptions));
        return generateSceneContent('shadow_youtube', Object.assign({}, opts, {
            requestOptions: requestOptions
        }));
    }

    async function generateShadowAppStoreContent(options) {
        const opts = asObject(options);
        const requestOptions = Object.assign({
            temperature: 0.76,
            maxTokens: 1800
        }, asObject(opts.requestOptions));
        return generateSceneContent('shadow_appstore', Object.assign({}, opts, {
            requestOptions: requestOptions
        }));
    }

    async function generateShadowSettingsContent(options) {
        const opts = asObject(options);
        const requestOptions = Object.assign({
            temperature: 0.72,
            maxTokens: 1600
        }, asObject(opts.requestOptions));
        return generateSceneContent('shadow_settings', Object.assign({}, opts, {
            requestOptions: requestOptions
        }));
    }

    async function generateShadowAssetsContent(options) {
        const opts = asObject(options);
        const requestOptions = Object.assign({
            temperature: 0.74,
            maxTokens: 1800
        }, asObject(opts.requestOptions));
        return generateSceneContent('shadow_assets', Object.assign({}, opts, {
            requestOptions: requestOptions
        }));
    }

    async function generateShadowHealthContent(options) {
        const opts = asObject(options);
        const requestOptions = Object.assign({
            temperature: 0.76,
            maxTokens: 1700
        }, asObject(opts.requestOptions));
        return generateSceneContent('shadow_health', Object.assign({}, opts, {
            requestOptions: requestOptions
        }));
    }

    async function generateShadowFoodContent(options) {
        const opts = asObject(options);
        const requestOptions = Object.assign({
            temperature: 0.76,
            maxTokens: 1600
        }, asObject(opts.requestOptions));
        return generateSceneContent('shadow_food', Object.assign({}, opts, {
            requestOptions: requestOptions
        }));
    }

    async function generateShadowGameContent(options) {
        const opts = asObject(options);
        const requestOptions = Object.assign({
            temperature: 0.78,
            maxTokens: 1900
        }, asObject(opts.requestOptions));
        return generateSceneContent('shadow_game', Object.assign({}, opts, {
            requestOptions: requestOptions
        }));
    }

    async function generateShadowCallsContent(options) {
        const opts = asObject(options);
        const requestOptions = Object.assign({
            temperature: 0.72,
            maxTokens: 1500
        }, asObject(opts.requestOptions));
        return generateSceneContent('shadow_calls', Object.assign({}, opts, {
            requestOptions: requestOptions
        }));
    }

    async function generateShadowSMSContent(options) {
        const opts = asObject(options);
        const requestOptions = Object.assign({
            temperature: 0.74,
            maxTokens: 1600
        }, asObject(opts.requestOptions));
        return generateSceneContent('shadow_sms', Object.assign({}, opts, {
            requestOptions: requestOptions
        }));
    }

    async function generateNiNanContent(options) {
        const opts = asObject(options);
        const sceneKey = 'ninan';
        const context = resolveRoleContext(opts.roleId);
        if (!context.ok) return { ok: false, error: context.error || '角色未准备好' };

        const roleId = context.roleId;
        if (opts.force !== true) {
            const cached = readSceneCache(sceneKey, roleId);
            if (cached && cached.data && Array.isArray(cached.data.dreams) && cached.data.dreams.length === 7) {
                return {
                    ok: true,
                    fromCache: true,
                    scene: sceneKey,
                    context: context,
                    data: cached.data,
                    cachedAt: Number(cached.cachedAt) || 0,
                    rawResponse: asString(cached.rawResponse || '')
                };
            }
        }

        const pack = buildShadowWechatContextPack(context);
        const datedMemoryText = buildDatedRecentMemory(context.roleId, context.roleName, 7, 4);
        const basePrompt = buildBasePrompt(context);
        const scenePrompt = buildScenePrompt(sceneKey, context);
        const extraBlocks = [];
        if (pack.userInfoText) extraBlocks.push('【用户信息】\n' + pack.userInfoText);
        if (pack.memoryText) extraBlocks.push('【近期记忆】\n' + pack.memoryText);
        if (datedMemoryText) extraBlocks.push('【近7天逐日聊天记忆】\n' + datedMemoryText);
        const finalSystemPrompt = [basePrompt, scenePrompt].concat(extraBlocks).join('\n\n');
        const userMessage = '请基于近7天逐日记忆，输出最近7天 dreams（4-6天有梦，其他天可无梦）；有梦日 content 必须 100-200 字，且每个 dreams 项都要有当日 sleepTalk，只输出 JSON 对象。';
        const requestOptions = Object.assign({
            temperature: 0.82,
            maxTokens: 2600
        }, asObject(opts.requestOptions));

        writePromptDebugRecord(sceneKey, roleId, {
            roleName: context.roleName,
            contextSummary: context.contextSummary,
            basePrompt: basePrompt,
            scenePrompt: scenePrompt,
            finalSystemPrompt: finalSystemPrompt,
            userMessage: userMessage,
            responseText: '',
            errorMessage: ''
        });

        try {
            const rawResponse = await callParentAI(context, finalSystemPrompt, userMessage, requestOptions);
            const parsed = parseJsonFromText(rawResponse);
            const data = normalizeSceneData(sceneKey, parsed || {}, context);
            writeSceneCache(sceneKey, roleId, {
                roleId: roleId,
                roleName: context.roleName,
                scene: sceneKey,
                cachedAt: Date.now(),
                data: data,
                rawResponse: rawResponse
            });
            writePromptDebugRecord(sceneKey, roleId, {
                roleName: context.roleName,
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: rawResponse,
                errorMessage: ''
            });
            return {
                ok: true,
                fromCache: false,
                scene: sceneKey,
                context: context,
                data: data,
                rawResponse: rawResponse,
                prompts: {
                    basePrompt: basePrompt,
                    scenePrompt: scenePrompt,
                    finalSystemPrompt: finalSystemPrompt,
                    userMessage: userMessage
                }
            };
        } catch (error) {
            const message = asString(error && error.message ? error.message : error) || '生成失败';
            writePromptDebugRecord(sceneKey, roleId, {
                roleName: context.roleName,
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: '',
                errorMessage: message
            });
            return { ok: false, error: message, context: context };
        }
    }

    async function generateShadowBrowserContent(options) {
        const opts = asObject(options);
        const sceneKey = 'shadow_browser';
        const context = resolveRoleContext(opts.roleId);
        if (!context.ok) return { ok: false, error: context.error || '角色未准备好' };

        const roleId = context.roleId;
        if (opts.force !== true) {
            const cached = readSceneCache(sceneKey, roleId);
            const cachedError = cached && cached.data ? validateSceneData(sceneKey, cached.data, {}) : '缓存缺失';
            if (cached && cached.data && !cachedError) {
                return {
                    ok: true,
                    fromCache: true,
                    scene: sceneKey,
                    context: context,
                    data: cached.data,
                    cachedAt: Number(cached.cachedAt) || 0,
                    rawResponse: asString(cached.rawResponse || '')
                };
            }
        }

        const pack = buildShadowWechatContextPack(context);
        const basePrompt = buildBasePrompt(context);
        const scenePrompt = buildScenePrompt(sceneKey, context);
        const extraBlocks = [];
        if (pack.userInfoText) extraBlocks.push('【用户信息】\n' + pack.userInfoText);
        if (pack.memoryText) extraBlocks.push('【近期记忆】\n' + pack.memoryText);
        const finalSystemPrompt = [basePrompt, scenePrompt].concat(extraBlocks).join('\n\n');
        const userMessage = '请生成浏览器历史。每条 history 必须包含 detail 字段，并优先参考近期记忆，只输出 JSON 对象。';
        const requestOptions = Object.assign({
            temperature: 0.75,
            maxTokens: 1700
        }, asObject(opts.requestOptions));

        writePromptDebugRecord(sceneKey, roleId, {
            roleName: context.roleName,
            contextSummary: context.contextSummary,
            basePrompt: basePrompt,
            scenePrompt: scenePrompt,
            finalSystemPrompt: finalSystemPrompt,
            userMessage: userMessage,
            responseText: '',
            errorMessage: ''
        });

        try {
            const rawResponse = await callParentAI(context, finalSystemPrompt, userMessage, requestOptions);
            const parsed = parseJsonFromText(rawResponse);
            const data = normalizeSceneData(sceneKey, parsed || {}, context);
            const validationError = validateSceneData(sceneKey, data, {});
            if (validationError) throw new Error(validationError);
            writeSceneCache(sceneKey, roleId, {
                roleId: roleId,
                roleName: context.roleName,
                scene: sceneKey,
                cachedAt: Date.now(),
                data: data,
                rawResponse: rawResponse
            });
            writePromptDebugRecord(sceneKey, roleId, {
                roleName: context.roleName,
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: rawResponse,
                errorMessage: ''
            });
            return {
                ok: true,
                fromCache: false,
                scene: sceneKey,
                context: context,
                data: data,
                rawResponse: rawResponse,
                prompts: {
                    basePrompt: basePrompt,
                    scenePrompt: scenePrompt,
                    finalSystemPrompt: finalSystemPrompt,
                    userMessage: userMessage
                }
            };
        } catch (error) {
            const message = asString(error && error.message ? error.message : error) || '生成失败';
            writePromptDebugRecord(sceneKey, roleId, {
                roleName: context.roleName,
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: '',
                errorMessage: message
            });
            return { ok: false, error: message, context: context };
        }
    }

    async function generateShadowPhotosContent(options) {
        const opts = asObject(options);
        const requestOptions = Object.assign({
            temperature: 0.78,
            maxTokens: 1800
        }, asObject(opts.requestOptions));
        return generateSceneContent('shadow_photos', Object.assign({}, opts, {
            requestOptions: requestOptions
        }));
    }

    async function generateShadowWechatContent(options) {
        const opts = asObject(options);
        const sceneKey = 'shadow_wechat';
        const context = resolveRoleContext(opts.roleId);
        if (!context.ok) return { ok: false, error: context.error || '角色未准备好' };

        const roleId = context.roleId;
        if (opts.force !== true) {
            const cached = readSceneCache(sceneKey, roleId);
            const cachedError = cached && cached.data ? validateSceneData(sceneKey, cached.data, {}) : '缓存缺失';
            if (cached && cached.data && !cachedError) {
                return {
                    ok: true,
                    fromCache: true,
                    scene: sceneKey,
                    context: context,
                    data: cached.data,
                    cachedAt: Number(cached.cachedAt) || 0,
                    rawResponse: asString(cached.rawResponse || '')
                };
            }
        }

        const pack = buildShadowWechatContextPack(context);
        const basePrompt = buildBasePrompt(context);
        const scenePrompt = buildScenePrompt(sceneKey, context);
        const extraBlocks = [];
        if (pack.userInfoText) extraBlocks.push('【用户信息】\n' + pack.userInfoText);
        if (pack.memoryText) extraBlocks.push('【近期记忆】\n' + pack.memoryText);
        const finalSystemPrompt = [basePrompt, scenePrompt].concat(extraBlocks).join('\n\n');
        const userMessage = '请生成该角色的微信子App数据，重点给出较真实的联系人片段、订阅号和外部收藏；不要补模板占位词，不完整宁可少一点。若没有真正想收藏的内容就留空，不要硬挑几条凑收藏。只输出 JSON 对象。';
        const realUserMessages = getRecentRealUserMessages(context.roleId, context.roleName, pack.userName, 8);
        const realFavoriteItems = buildRealFavoriteItems(context, pack.userName, 5);

        writePromptDebugRecord(sceneKey, roleId, {
            roleName: context.roleName,
            contextSummary: context.contextSummary,
            basePrompt: basePrompt,
            scenePrompt: scenePrompt,
            finalSystemPrompt: finalSystemPrompt,
            userMessage: userMessage,
            responseText: '',
            errorMessage: ''
        });

        try {
            const rawResponse = await callParentAI(context, finalSystemPrompt, userMessage, Object.assign({
                temperature: 0.85,
                maxTokens: 3200
            }, asObject(opts.requestOptions)));
            const parsed = parseJsonFromText(rawResponse);
            const normalized = normalizeShadowWechatData(parsed || {}, context, {
                userName: pack.userName,
                realUserMessages: realUserMessages,
                realFavoriteItems: realFavoriteItems
            });
            const promptDebug = {
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: rawResponse,
                errorMessage: ''
            };
            const finalData = Object.assign({}, normalized, { promptDebug: promptDebug });
            const validationError = validateSceneData(sceneKey, finalData, {});
            if (validationError) throw new Error(validationError);
            writeSceneCache(sceneKey, roleId, {
                roleId: roleId,
                roleName: context.roleName,
                scene: sceneKey,
                cachedAt: Date.now(),
                data: finalData,
                rawResponse: rawResponse
            });
            writePromptDebugRecord(sceneKey, roleId, Object.assign({}, promptDebug, {
                roleName: context.roleName
            }));
            return {
                ok: true,
                fromCache: false,
                scene: sceneKey,
                context: context,
                data: finalData,
                rawResponse: rawResponse,
                prompts: {
                    basePrompt: basePrompt,
                    scenePrompt: scenePrompt,
                    finalSystemPrompt: finalSystemPrompt,
                    userMessage: userMessage
                }
            };
        } catch (error) {
            const message = asString(error && error.message ? error.message : error) || '生成失败';
            writePromptDebugRecord(sceneKey, roleId, {
                roleName: context.roleName,
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: '',
                errorMessage: message
            });
            return { ok: false, error: message, context: context };
        }
    }

    async function generateShadowItineraryContent(options) {
        const opts = asObject(options);
        const sceneKey = 'shadow_itinerary';
        const context = resolveRoleContext(opts.roleId);
        if (!context.ok) return { ok: false, error: context.error || '角色未准备好' };

        const roleId = context.roleId;
        if (opts.force !== true) {
            const cached = readSceneCache(sceneKey, roleId);
            const cachedError = cached && cached.data ? validateSceneData(sceneKey, cached.data, {
                placeHints: extractWorldBookPlaceHints(context.worldBookText),
                blueprint: buildItineraryBlueprint(context, buildShadowItineraryContextPack(context))
            }) : '缓存缺失';
            if (cached && cached.data && !cachedError) {
                return {
                    ok: true,
                    fromCache: true,
                    scene: sceneKey,
                    context: context,
                    data: cached.data,
                    cachedAt: Number(cached.cachedAt) || 0,
                    rawResponse: asString(cached.rawResponse || '')
                };
            }
        }

        const pack = buildShadowItineraryContextPack(context);
        const basePrompt = buildBasePrompt(context);
        const scenePrompt = buildScenePrompt(sceneKey, context);
        const extraBlocks = [];
        extraBlocks.push('【当前时间】' + pack.currentTimeText);
        extraBlocks.push('【当前关系状态】' + (pack.relationshipStatus || '未提供'));
        if (pack.placeHints && pack.placeHints.length) extraBlocks.push('【世界书地点候选】' + pack.placeHints.join(' / '));
        if (pack.blueprint && pack.blueprint.length) {
            extraBlocks.push('【推荐票根骨架】\n' + pack.blueprint.map(function (item, index) {
                return [
                    String(index + 1) + '. ' + asString(item.status),
                    'from=' + asString(item.fromPlace),
                    'to=' + asString(item.toPlace),
                    'companion=' + asString(item.companion),
                    'seat=' + asString(item.seat),
                    'purpose=' + asString(item.purpose),
                    'noteGuide=' + asString(item.noteGuide),
                    'fromStation=' + buildWorldbookTransitName(item.fromPlace, index % 2 === 0 ? 'train' : 'flight', context.roleName),
                    'toStation=' + buildWorldbookTransitName(item.toPlace, index % 2 === 0 ? 'flight' : 'train', context.roleName)
                ].join(' | ');
            }).join('\n'));
        }
        if (pack.recentChatText) extraBlocks.push('【最近聊天记录】\n' + pack.recentChatText);
        const finalSystemPrompt = [basePrompt, scenePrompt].concat(extraBlocks).join('\n\n');
        const userMessage = '请生成 1 条历史记录和 2 到 3 条未来已准备预订的出行票根。务必让 purpose/note 与 from/to 地址逻辑一致：同城短途 city 相同、station 写具体地点；跨城交通才使用机场/车站。只输出 JSON 对象。';

        writePromptDebugRecord(sceneKey, roleId, {
            roleName: context.roleName,
            contextSummary: context.contextSummary,
            basePrompt: basePrompt,
            scenePrompt: scenePrompt,
            finalSystemPrompt: finalSystemPrompt,
            userMessage: userMessage,
            responseText: '',
            errorMessage: ''
        });

        try {
            const rawResponse = await callParentAI(context, finalSystemPrompt, userMessage, Object.assign({
                temperature: 0.62,
                maxTokens: 2200
            }, asObject(opts.requestOptions)));
            const parsed = parseJsonFromText(rawResponse);
            const normalized = normalizeShadowItineraryData(parsed || [], context, {
                relationshipStatus: pack.relationshipStatus,
                userName: pack.userName,
                placeHints: pack.placeHints,
                blueprint: pack.blueprint
            });
            const validationError = validateSceneData(sceneKey, normalized, {
                placeHints: pack.placeHints,
                blueprint: pack.blueprint
            });
            if (validationError) throw new Error(validationError);
            writeSceneCache(sceneKey, roleId, {
                roleId: roleId,
                roleName: context.roleName,
                scene: sceneKey,
                cachedAt: Date.now(),
                data: normalized,
                rawResponse: rawResponse
            });
            writePromptDebugRecord(sceneKey, roleId, {
                roleName: context.roleName,
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: rawResponse,
                errorMessage: ''
            });
            return {
                ok: true,
                fromCache: false,
                scene: sceneKey,
                context: context,
                data: normalized,
                rawResponse: rawResponse,
                prompts: {
                    basePrompt: basePrompt,
                    scenePrompt: scenePrompt,
                    finalSystemPrompt: finalSystemPrompt,
                    userMessage: userMessage
                }
            };
        } catch (error) {
            const message = asString(error && error.message ? error.message : error) || '生成失败';
            writePromptDebugRecord(sceneKey, roleId, {
                roleName: context.roleName,
                contextSummary: context.contextSummary,
                basePrompt: basePrompt,
                scenePrompt: scenePrompt,
                finalSystemPrompt: finalSystemPrompt,
                userMessage: userMessage,
                responseText: '',
                errorMessage: message
            });
            return { ok: false, error: message, context: context };
        }
    }

    function getBatchGenerationOptions() {
        return {
            eligible: BATCH_ELIGIBLE_SCENES.map(function (scene) {
                return { scene: scene, label: getSceneLabel(scene) };
            }),
            singleOnly: Object.keys(BATCH_SINGLE_ONLY_SCENES).map(function (scene) {
                return {
                    scene: scene,
                    label: getSceneLabel(scene),
                    reason: asString(BATCH_SINGLE_ONLY_SCENES[scene])
                };
            })
        };
    }

    function normalizeBatchScenes(inputScenes, allowAnyScene) {
        const source = Array.isArray(inputScenes) ? inputScenes : [];
        const map = {};
        const list = [];
        const allowAll = allowAnyScene === true;
        for (let i = 0; i < source.length; i++) {
            const scene = asString(source[i]);
            if (!scene || map[scene]) continue;
            if (!allowAll && BATCH_ELIGIBLE_SCENES.indexOf(scene) === -1) continue;
            if (allowAll && (!SCENE_META[scene] || !/^shadow_/.test(scene))) continue;
            map[scene] = true;
            list.push(scene);
        }
        return list;
    }

    function buildBatchSceneCompactGuide(scene) {
        if (scene === 'shadow_shopping') return '输出 cart/footprints/orders 三组，各 3-5 条，orders 含 thought/isSecret/maskedName/realName。';
        if (scene === 'shadow_youtube') return '输出 videos 5-8 条，含 title/titleZh/channel/progress/time/type/description。';
        if (scene === 'shadow_appstore') return '输出 installed(10 条) + uninstalled(3-6 条, 含 reason)。';
        if (scene === 'shadow_settings') return '输出 account/connectivity/screenTime/storage/battery/focusMode 全结构，设备品牌要真实。';
        if (scene === 'shadow_assets') return '输出 totalBalance/cards(2-3,含transactions)/transactions。';
        if (scene === 'shadow_health') return '输出 overview/sleep(含deep/light/rem/awake/score)/workouts/heartRate。';
        if (scene === 'shadow_food') return '输出 orders 4-6 条，含 thought 与 relatedToUser。';
        if (scene === 'shadow_game') return '输出 games 2-3 条，真实游戏，含 recentSessions。';
        if (scene === 'shadow_calls') return '输出 calls 6-8 条，含 detail；未接/拒接写成 未接(2次)/拒接(3次)。';
        if (scene === 'shadow_sms') return '输出 threads 5-7 条，每条含 sender/time/isUnread/messages；messages.from 仅 对方/自己。';
        if (scene === 'shadow_photos') return '输出 camera/videos/screenshots 各 4-6 条，含 isHidden/aboutUser；videos 含 title/duration。';
        if (scene === 'shadow_memos') return '输出 sections，优先 tasks/userdata/gifts/drafts/reflections，至少 3 个分区有内容。';
        if (scene === 'shadow_reading') return '输出 books 3-5 本，必须真实书名作者，每本含 progress 与 highlights。';
        if (scene === 'shadow_work') return '输出 tabs.records/achievements/plans，结构完整，内容贴合职业。';
        return '按该场景标准输出 JSON。';
    }

    function buildBatchGenerationPrompts(context, scenes) {
        const basePrompt = buildBasePrompt(context);
        const pack = buildShadowWechatContextPack(context);
        const guide = scenes.map(function (scene, index) {
            return [
                String(index + 1) + '. ' + scene + '（' + getSceneLabel(scene) + '）',
                buildBatchSceneCompactGuide(scene)
            ].join('\n');
        }).join('\n\n');
        const sceneBlocks = scenes.map(function (scene, index) {
            return [
                '【场景 ' + String(index + 1) + '】sceneKey=' + scene + '（' + getSceneLabel(scene) + '）',
                '你最终必须把该场景的 JSON 放在 results.' + scene + ' 下。',
                '该场景完整规则如下：',
                buildScenePrompt(scene, context)
            ].join('\n');
        }).join('\n\n');
        const extraBlocks = [];
        if (pack.userInfoText) extraBlocks.push('【用户信息】\n' + pack.userInfoText);
        if (pack.memoryText) extraBlocks.push('【近期记忆】\n' + pack.memoryText);
        const systemPrompt = [
            basePrompt,
            '你要一次性生成多个 App 场景数据，质量必须接近逐个单独生成。',
            '严格只输出合法 JSON，不要解释。',
            '输出格式：{ "results": { "<sceneKey>": { ...对应场景数据... } } }。',
            'results 里必须包含本次请求的全部 sceneKey，字段名要精确一致。',
            '绝对不要使用“应用1 / 视频1 / 书籍1 / 未知 / 暂无 / 默认 / 示例”之类的占位词来凑数。',
            '如果某个 sceneKey 实在无法完整推演，也必须保留该 sceneKey，并输出 { "_error": "失败原因" }，不要拿空数据或模板数据充数。',
            '场景清单与简要约束：\n' + guide,
            '以下是每个场景的完整规则，请逐条遵守：\n' + sceneBlocks
        ].concat(extraBlocks).join('\n\n');
        const userMessage = '请按要求一次性完成这些场景：' + scenes.join(', ') + '。只输出 JSON 对象。';
        return {
            systemPrompt: systemPrompt,
            userMessage: userMessage
        };
    }

    function countValidBatchList(source, predicate) {
        const list = Array.isArray(source) ? source : [];
        let count = 0;
        for (let i = 0; i < list.length; i++) {
            if (predicate(asObject(list[i]), i)) count += 1;
        }
        return count;
    }

    function getRawBatchSceneIssue(scene, raw) {
        const data = asObject(raw);
        if (asString(data._error || data.error || data.reason)) {
            return asString(data._error || data.error || data.reason);
        }
        if (scene === 'shadow_shopping') {
            const orders = Array.isArray(data.orders) ? data.orders : (Array.isArray(data.recentOrders) ? data.recentOrders : []);
            const cart = Array.isArray(data.cart) ? data.cart : (Array.isArray(data.cartItems) ? data.cartItems : []);
            const footprints = Array.isArray(data.footprints) ? data.footprints : (Array.isArray(data.browsing) ? data.browsing : []);
            if (!orders.length && !cart.length && !footprints.length) {
                return '购物记录为空。';
            }
            return '';
        }
        if (scene === 'shadow_youtube') {
            const videos = Array.isArray(data.videos) ? data.videos : [];
            const history = Array.isArray(data.history) ? data.history : [];
            const recommend = Array.isArray(data.recommend) ? data.recommend : (Array.isArray(data.recommendations) ? data.recommendations : []);
            const validVideos = videos.length
                ? countValidBatchList(videos, function (row) { return !!asString(row.title) && !!asString(row.channel) && !!asString(row.description || row.desc || row.summary); })
                : (countValidBatchList(history, function (row) { return !!asString(row.title) && !!asString(row.channel); })
                    + countValidBatchList(recommend, function (row) { return !!asString(row.title) && !!asString(row.channel); }));
            if (validVideos < 2) return 'YouTube 数据过少，至少需要 2 条。';
            return '';
        }
        if (scene === 'shadow_appstore') {
            const installed = Array.isArray(data.installed) ? data.installed : [];
            const uninstalled = Array.isArray(data.uninstalled) ? data.uninstalled : [];
            if (!installed.length && !uninstalled.length) {
                return 'App Store 数据为空。';
            }
            return '';
        }
        if (scene === 'shadow_settings') {
            const connectivity = asObject(data.connectivity || {});
            const screenTime = asObject(data.screenTime || {});
            const storage = asObject(data.storage || {});
            const battery = asObject(data.battery || {});
            if (!asString(connectivity.wifi) && !asString(screenTime.total) && !asString(storage.used) && !asString(battery.level)) {
                return '设置数据为空。';
            }
            return '';
        }
        if (scene === 'shadow_assets') {
            const cards = Array.isArray(data.cards) ? data.cards : [];
            const validTx = countValidBatchList(data.transactions, function (row) {
                return !!asString(row.date) && !!asString(row.title) && !!asString(row.amount);
            });
            if (!cards.length && validTx < 1) return '资产与流水数据为空。';
            return '';
        }
        if (scene === 'shadow_health') {
            const overview = asObject(data.overview || {});
            const sleep = asObject(data.sleep || {});
            const heartRate = asObject(data.heartRate || {});
            if (!asString(overview.steps) && !asString(sleep.duration) && !asString(heartRate.avg)) return '健康数据为空。';
            return '';
        }
        if (scene === 'shadow_food') {
            if (countValidBatchList(data.orders, function (row) {
                return !!asString(row.date) && !!asString(row.shop) && !!asString(row.items) && !!asString(row.price) && !!asString(row.thought || row.note);
            }) < 1) {
                return '外卖记录为空。';
            }
            return '';
        }
        if (scene === 'shadow_game') {
            if (countValidBatchList(data.games, function (row) {
                return !!asString(row.name) && !!asString(row.platform) && !!asString(row.totalHours) && !!asString(row.lastOnline);
            }) < 1) {
                return '游戏记录为空。';
            }
            return '';
        }
        if (scene === 'shadow_calls') {
            if (countValidBatchList(data.calls, function (row) {
                return !!asString(row.name) && !!asString(row.time) && !!asString(row.type) && !!asString(row.duration) && !!asString(row.detail);
            }) < 2) {
                return '通话记录过少。';
            }
            return '';
        }
        if (scene === 'shadow_sms') {
            if (countValidBatchList(data.threads, function (row) {
                return !!asString(row.sender) && !!asString(row.time) && countValidBatchList(row.messages, function (msg) {
                    return /^(对方|自己)$/.test(asString(msg.from)) && !!asString(msg.content);
                }) >= 1;
            }) < 2) {
                return '短信线程过少。';
            }
            return '';
        }
        if (scene === 'shadow_photos') {
            const camera = Array.isArray(data.camera) ? data.camera : [];
            const videos = Array.isArray(data.videos) ? data.videos : [];
            const screenshots = Array.isArray(data.screenshots) ? data.screenshots : [];
            if (!camera.length && !videos.length && !screenshots.length && !(Array.isArray(data.photos) && data.photos.length)) {
                return '相册数据为空。';
            }
            return '';
        }
        if (scene === 'shadow_memos') {
            if (countValidBatchList(data.sections, function (row) {
                return !!asString(row.type) && !!asString(row.title) && Array.isArray(row.items) && row.items.length >= 2;
            }) < 2) {
                return '备忘录分区过少。';
            }
            return '';
        }
        if (scene === 'shadow_reading') {
            const books = Array.isArray(data.books) ? data.books : (Array.isArray(data.items) ? data.items : []);
            if (!books.length) return '阅读记录为空。';
            if (countValidBatchList(books, function (row) {
                return !!asString(row.title || row.fullTitle || row.bookName) && !!asString(row.author || row.writer);
            }) < 1) {
                return '阅读记录缺少有效书名或作者。';
            }
            return '';
        }
        if (scene === 'shadow_work') {
            const tabs = asObject(data.tabs || {});
            if (!Array.isArray(tabs.records) && !Array.isArray(tabs.achievements) && !Array.isArray(tabs.plans)) {
                return '工作档案数据为空。';
            }
            return '';
        }
        return '';
    }

    function isGenericPlaceholderText(value) {
        const text = asString(value);
        if (!text) return true;
        return /^(应用|文档|视频|书籍|联系人|短信|照片|截图|记录|店铺|商品|游戏|频道|标题)\s*\d+$/i.test(text)
            || /^(未知|暂无|默认|示例|未命名|未提供)$/i.test(text);
    }

    function isMostlyPlaceholderList(source, pickText, minSize, ratio) {
        const list = Array.isArray(source) ? source : [];
        if (list.length < (minSize || 4)) return false;
        const placeholderCount = list.reduce(function (sum, item) {
            const text = asString(pickText(asObject(item)));
            return sum + (isGenericPlaceholderText(text) ? 1 : 0);
        }, 0);
        return placeholderCount / list.length >= (ratio || 0.75);
    }

    function hasBasicSceneContent(scene, normalized) {
        const data = asObject(normalized);
        if (scene === 'shadow_shopping') return Array.isArray(data.orders) && data.orders.length > 0;
        if (scene === 'shadow_youtube') return Array.isArray(data.videos) && data.videos.length > 0;
        if (scene === 'shadow_appstore') return (Array.isArray(data.installed) && data.installed.length > 0) || (Array.isArray(data.uninstalled) && data.uninstalled.length > 0);
        if (scene === 'shadow_settings') return !!asString(asObject(data.connectivity || {}).wifi) || !!asString(asObject(data.screenTime || {}).total);
        if (scene === 'shadow_assets') return (Array.isArray(data.cards) && data.cards.length > 0) || (Array.isArray(data.transactions) && data.transactions.length > 0);
        if (scene === 'shadow_health') return !!asString(asObject(data.overview || {}).steps) || !!asString(asObject(data.sleep || {}).duration);
        if (scene === 'shadow_food') return Array.isArray(data.orders) && data.orders.length > 0;
        if (scene === 'shadow_game') return Array.isArray(data.games) && data.games.length > 0;
        if (scene === 'shadow_calls') return Array.isArray(data.calls) && data.calls.length > 0;
        if (scene === 'shadow_sms') return Array.isArray(data.threads) && data.threads.length > 0;
        if (scene === 'shadow_photos') return (Array.isArray(data.photos) && data.photos.length > 0) || (Array.isArray(data.camera) && data.camera.length > 0);
        if (scene === 'shadow_memos') return Array.isArray(data.sections) && data.sections.length > 0;
        if (scene === 'shadow_reading') return Array.isArray(data.books) && data.books.length > 0;
        if (scene === 'shadow_work') {
            const tabs = asObject(data.tabs || {});
            return (Array.isArray(tabs.records) && tabs.records.length > 0)
                || (Array.isArray(tabs.achievements) && tabs.achievements.length > 0)
                || (Array.isArray(tabs.plans) && tabs.plans.length > 0);
        }
        return false;
    }

    function getNormalizedBatchSceneIssue(scene, normalized) {
        const data = asObject(normalized);
        if (scene === 'shadow_appstore') {
            const installed = Array.isArray(data.installed) ? data.installed : [];
            if (isMostlyPlaceholderList(installed, function (row) { return row.name; }, 3, 0.6)) {
                return 'App Store 里占位 App 名称过多。';
            }
            return '';
        }
        if (scene === 'shadow_settings') {
            const storage = asObject(data.storage || {});
            const apps = Array.isArray(storage.apps) ? storage.apps : [];
            const documents = Array.isArray(storage.documents) ? storage.documents : [];
            if (isMostlyPlaceholderList(apps, function (row) { return row.name; }, 4, 0.6)) {
                return '设置页储存明细里占位应用名过多。';
            }
            if (isMostlyPlaceholderList(documents, function (row) { return row.name; }, 4, 0.6)) {
                return '设置页文档明细里占位文档名过多。';
            }
            return '';
        }
        if (scene === 'shadow_youtube') {
            const videos = Array.isArray(data.videos) ? data.videos : [];
            if (videos.length >= 4) {
                const bad = videos.filter(function (row) {
                    const item = asObject(row);
                    return isGenericPlaceholderText(item.title) || isGenericPlaceholderText(item.channel);
                }).length;
                if (bad / videos.length >= 0.6) return 'YouTube 占位标题或频道名过多。';
            }
            return '';
        }
        if (scene === 'shadow_reading') {
            const books = Array.isArray(data.books) ? data.books : [];
            const bad = books.filter(function (row) {
                const item = asObject(row);
                return isGenericPlaceholderText(item.fullTitle || item.title) || /未知作者/.test(asString(item.author));
            }).length;
            if (books.length >= 2 && bad / books.length >= 0.6) {
                return '阅读记录里占位书名或作者过多。';
            }
            return '';
        }
        return '';
    }

    function readBatchJob(jobId) {
        const id = asString(jobId);
        if (!id) return null;
        const parentWindow = getParentWindow();
        const host = ensureParentBatchHost();
        if (host) {
            const fromHost = host.getJob(id);
            if (fromHost && Object.keys(fromHost).length) return fromHost;
        }
        const jobs = readBatchJobsStore(parentWindow);
        return asObject(jobs[id]);
    }

    function patchBatchJob(jobId, patch) {
        const id = asString(jobId);
        if (!id) return null;
        const parentWindow = getParentWindow();
        const host = ensureParentBatchHost();
        if (host && typeof host.updateJob === 'function') {
            return host.updateJob(id, patch);
        }
        const jobs = readBatchJobsStore(parentWindow);
        const next = Object.assign({}, asObject(jobs[id]), asObject(patch));
        jobs[id] = next;
        writeBatchJobsStore(parentWindow, jobs);
        return next;
    }

    function extractBatchResultsMap(parsed, scenes) {
        const payload = asObject(parsed);
        const fromResults = asObject(payload.results);
        if (Object.keys(fromResults).length) return fromResults;
        const map = {};
        const keys = Array.isArray(scenes) ? scenes : [];
        for (let i = 0; i < keys.length; i++) {
            const scene = asString(keys[i]);
            if (!scene) continue;
            if (payload[scene] != null) map[scene] = payload[scene];
        }
        if (!Object.keys(map).length && keys.length === 1) {
            map[keys[0]] = parsed;
        }
        return map;
    }

    function persistBatchSceneData(roleId, context, scenes, resultsMap) {
        const successScenes = [];
        const failedScenes = [];
        function tryPersistNormalized(scene, rawPayload) {
            try {
                let normalized = null;
                let validateOptions = {};
                if (scene === 'shadow_itinerary') {
                    const pack = buildShadowItineraryContextPack(context);
                    normalized = normalizeShadowItineraryData(rawPayload, context, {
                        relationshipStatus: pack.relationshipStatus,
                        userName: pack.userName,
                        placeHints: pack.placeHints,
                        blueprint: pack.blueprint
                    });
                    validateOptions = {
                        placeHints: pack.placeHints,
                        blueprint: pack.blueprint
                    };
                } else {
                    normalized = normalizeSceneData(scene, rawPayload, context);
                }
                const normalizedIssue = getNormalizedBatchSceneIssue(scene, normalized);
                if (normalizedIssue) return { ok: false, reason: normalizedIssue };
                const validationError = validateSceneData(scene, normalized, validateOptions);
                if (validationError) return { ok: false, reason: validationError };
                const cacheOk = writeSceneCache(scene, roleId, {
                    roleId: roleId,
                    roleName: context.roleName,
                    scene: scene,
                    cachedAt: Date.now(),
                    data: normalized,
                    rawResponse: ''
                });
                if (!cacheOk) return { ok: false, reason: '写入场景缓存失败，请检查浏览器存储权限。' };
                return { ok: true };
            } catch (error) {
                return { ok: false, reason: asString(error && error.message ? error.message : error) || '解析失败' };
            }
        }

        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const raw = resultsMap[scene];
            if (raw == null) {
                if (scene === 'shadow_reading') {
                    const repaired = tryPersistNormalized(scene, {});
                    if (repaired.ok) {
                        successScenes.push(scene);
                        continue;
                    }
                }
                failedScenes.push(getSceneLabel(scene) + '：模型返回中缺少该场景。');
                continue;
            }
            try {
                const rawIssue = getRawBatchSceneIssue(scene, raw);
                if (rawIssue) {
                    if (scene === 'shadow_reading') {
                        const repaired = tryPersistNormalized(scene, raw);
                        if (repaired.ok) {
                            successScenes.push(scene);
                            continue;
                        }
                    }
                    failedScenes.push(getSceneLabel(scene) + '：' + rawIssue);
                    continue;
                }
                const persisted = tryPersistNormalized(scene, raw);
                if (persisted.ok) {
                    successScenes.push(scene);
                    continue;
                }
                failedScenes.push(getSceneLabel(scene) + '：' + persisted.reason);
            } catch (error) {
                failedScenes.push(getSceneLabel(scene) + '：' + (asString(error && error.message ? error.message : error) || '解析失败'));
            }
        }
        return {
            successScenes: successScenes,
            failedScenes: failedScenes
        };
    }

    function processBatchJobSuccess(job) {
        const row = asObject(job);
        const jobId = asString(row.id);
        if (!jobId) return;
        if (row.finalizedAt) return;
        const roleId = asString(row.roleId || getSelectedRoleId());
        const scenes = normalizeBatchScenes(row.scenes, row.allowAnyScene === true);
        const context = resolveRoleContext(roleId);
        if (!context.ok) {
            patchBatchJob(jobId, {
                finalizedAt: Date.now(),
                finalizeStatus: 'error',
                finalizeMessage: context.error || '角色上下文缺失'
            });
            showGenerationErrorDialog(context.error || '角色上下文缺失', '批量生成');
            return;
        }
        const rawResponse = asString(row.rawResponse || '');
        const parsed = parseJsonFromText(rawResponse);
        const resultsMap = extractBatchResultsMap(parsed || {}, scenes);
        const summary = persistBatchSceneData(roleId, context, scenes, resultsMap);
        patchBatchJob(jobId, {
            finalizedAt: Date.now(),
            finalizeStatus: summary.failedScenes.length ? 'partial' : 'success',
            finalizeMessage: summary.failedScenes.join('\n'),
            successScenes: summary.successScenes,
            failedScenes: summary.failedScenes
        });

        if (!summary.successScenes.length) {
            const reason = summary.failedScenes.join('\n') || '全部场景写入失败。';
            showGenerationErrorDialog(reason, '批量生成');
            return;
        }
        const okLabels = summary.successScenes.map(getSceneLabel).join('、');
        const failMessage = summary.failedScenes.length ? ('\n\n失败项：\n' + summary.failedScenes.join('\n')) : '';
        showDialog({
            title: '批量生成完成',
            message: '已生成：' + okLabels + failMessage
        });
    }

    function processBatchJobError(job) {
        const row = asObject(job);
        const message = asString(row.error || row.finalizeMessage || '模型请求失败');
        patchBatchJob(asString(row.id), {
            finalizedAt: Number(row.finalizedAt) || Date.now(),
            finalizeStatus: 'error',
            finalizeMessage: message
        });
        showGenerationErrorDialog(message, '批量生成');
    }

    function consumeBatchEvents() {
        let guard = 0;
        while (guard < 3) {
            guard += 1;
            const event = popBatchEvent();
            if (!event) return;
            const type = asString(event.type);
            if (type === 'started') continue;
            const job = readBatchJob(event.jobId);
            if (!job || !job.id) continue;
            if (type === 'success') {
                processBatchJobSuccess(job);
            } else if (type === 'error') {
                processBatchJobError(job);
            }
        }
    }

    function startBatchEventPolling() {
        if (global.__SecretCenterBatchPollingStarted) return;
        global.__SecretCenterBatchPollingStarted = true;
        setTimeout(function () {
            consumeBatchEvents();
        }, 150);
        setInterval(function () {
            consumeBatchEvents();
        }, 1200);
    }

    async function startBatchGeneration(options) {
        const opts = asObject(options);
        const context = resolveRoleContext(opts.roleId);
        if (!context.ok) return { ok: false, error: context.error || '角色未准备好' };
        const scenes = normalizeBatchScenes(opts.scenes, opts.allowAnyScene === true);
        if (!scenes.length) return { ok: false, error: '请选择至少 1 个可批量生成的 App。' };

        const host = ensureParentBatchHost();
        if (!host) {
            return { ok: false, error: '主窗口 callAI 未初始化，暂时无法启动后台生成。' };
        }

        const prompts = buildBatchGenerationPrompts(context, scenes);
        const requestOptions = Object.assign({
            temperature: 0.68,
            maxTokens: Math.max(6800, scenes.length * 1200)
        }, asObject(opts.requestOptions));
        const started = host.startJob({
            roleId: context.roleId,
            roleName: context.roleName,
            scenes: scenes,
            allowAnyScene: opts.allowAnyScene === true,
            force: opts.force === true,
            source: asString(opts.source || 'batch_modal'),
            systemPrompt: prompts.systemPrompt,
            userMessage: prompts.userMessage,
            requestOptions: requestOptions
        });
        if (!started || !started.ok) {
            return {
                ok: false,
                error: asString(started && started.error) || '后台任务启动失败'
            };
        }

        return {
            ok: true,
            jobId: asString(started.jobId),
            roleId: context.roleId,
            roleName: context.roleName,
            scenes: scenes,
            startedAt: Date.now()
        };
    }

    async function generateSceneNow(scene, options) {
        const sceneKey = asString(scene);
        const opts = asObject(options);
        if (sceneKey === 'ninan') return generateNiNanContent(opts);
        if (sceneKey === 'shadow_wechat') return generateShadowWechatContent(opts);
        if (sceneKey === 'shadow_itinerary') return generateShadowItineraryContent(opts);
        if (sceneKey === 'shadow_diary') return generateShadowDiaryContent(opts);
        if (sceneKey === 'shadow_browser') return generateShadowBrowserContent(opts);
        if (sceneKey === 'shadow_shopping') return generateShadowShoppingContent(opts);
        if (sceneKey === 'shadow_youtube') return generateShadowYoutubeContent(opts);
        if (sceneKey === 'shadow_appstore') return generateShadowAppStoreContent(opts);
        if (sceneKey === 'shadow_settings') return generateShadowSettingsContent(opts);
        if (sceneKey === 'shadow_assets') return generateShadowAssetsContent(opts);
        if (sceneKey === 'shadow_health') return generateShadowHealthContent(opts);
        if (sceneKey === 'shadow_food') return generateShadowFoodContent(opts);
        if (sceneKey === 'shadow_game') return generateShadowGameContent(opts);
        if (sceneKey === 'shadow_calls') return generateShadowCallsContent(opts);
        if (sceneKey === 'shadow_sms') return generateShadowSMSContent(opts);
        if (sceneKey === 'shadow_photos') return generateShadowPhotosContent(opts);
        return generateSceneContent(sceneKey, opts);
    }

    function detectSceneByPathname() {
        if (!global.location) return '';
        const path = asString(global.location.pathname || '');
        const file = path.split('/').pop();
        const map = {
            'ShadowWechat.html': 'shadow_wechat',
            'ShadowWork.html': 'shadow_work',
            'ShadowReading.html': 'shadow_reading',
            'ShadowItinerary.html': 'shadow_itinerary',
            'ShadowDiary.html': 'shadow_diary',
            'ShadowMemos.html': 'shadow_memos',
            'ShadowShopping.html': 'shadow_shopping',
            'ShadowYoutube.html': 'shadow_youtube',
            'ShadowAppStore.html': 'shadow_appstore',
            'ShadowSettings.html': 'shadow_settings',
            'ShadowFood.html': 'shadow_food',
            'ShadowGame.html': 'shadow_game',
            'ShadowAssets.html': 'shadow_assets',
            'ShadowHealth.html': 'shadow_health',
            'ShadowCalls.html': 'shadow_calls',
            'ShadowSMS.html': 'shadow_sms',
            'ShadowBrowser.html': 'shadow_browser',
            'ShadowPhotos.html': 'shadow_photos'
        };
        return asString(map[file] || '');
    }

    function shouldUseBatchQuickGenerate(scene) {
        const sceneKey = asString(scene);
        if (!sceneKey) return false;
        if (BATCH_SINGLE_ONLY_SCENES[sceneKey]) return false;
        return /^shadow_/.test(sceneKey);
    }

    async function triggerQuickGenerateForCurrentPage(options) {
        const opts = asObject(options);
        const scene = detectSceneByPathname();
        if (!scene) return { ok: false, error: '当前页面未识别到可生成场景。' };
        const roleId = getSelectedRoleId();
        if (!roleId) {
            showGenerationErrorDialog('请先选择角色，再生成内容。', getSceneLabel(scene));
            return { ok: false, error: '缺少角色' };
        }

        if (!shouldUseBatchQuickGenerate(scene)) {
            const direct = await generateSceneNow(scene, {
                roleId: roleId,
                force: true,
                source: asString(opts.source || 'quick_button_direct')
            });
            if (!direct || !direct.ok) {
                showGenerationErrorDialog(direct && direct.error, getSceneLabel(scene));
                return asObject(direct);
            }
            showDialog({
                title: getSceneLabel(scene) + '生成成功',
                message: '已完成更新，你可以直接查看最新内容。'
            });
            return {
                ok: true,
                mode: 'direct',
                scene: scene
            };
        }

        const started = await startBatchGeneration({
            roleId: roleId,
            scenes: [scene],
            allowAnyScene: true,
            force: true,
            source: asString(opts.source || 'quick_button')
        });
        if (!started.ok) {
            showGenerationErrorDialog(started.error, getSceneLabel(scene));
            return started;
        }
        showDialog({
            title: getSceneLabel(scene) + '后台生成中',
            message: '你可以继续浏览其他页面，完成后会自动弹窗通知。'
        });
        return started;
    }

    function mountQuickGenerateButton(options) {
        if (!global.document || !global.document.body) return false;
        const scene = detectSceneByPathname();
        if (!scene) return false;
        const path = asString(global.location && global.location.pathname);
        if (/FangCun\.html$/i.test(path)) return false;
        if (global.document.getElementById(QUICK_GENERATE_BUTTON_ID)) return true;

        const opts = asObject(options);
        const btn = global.document.createElement('button');
        btn.id = QUICK_GENERATE_BUTTON_ID;
        btn.type = 'button';
        btn.textContent = '✦';
        btn.setAttribute('aria-label', '生成');
        btn.style.position = 'fixed';
        btn.style.top = 'max(20px, env(safe-area-inset-top))';
        btn.style.right = '20px';
        btn.style.width = '44px';
        btn.style.height = '44px';
        btn.style.border = 'none';
        btn.style.borderRadius = '999px';
        btn.style.background = 'rgba(255,255,255,0.56)';
        btn.style.backdropFilter = 'blur(10px)';
        btn.style.webkitBackdropFilter = 'blur(10px)';
        btn.style.color = '#5A5752';
        btn.style.fontSize = '20px';
        btn.style.cursor = 'pointer';
        btn.style.zIndex = '9999';
        btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
        btn.style.transition = 'transform .2s ease, opacity .2s ease';
        btn.addEventListener('click', function () {
            if (btn.disabled) return;
            btn.disabled = true;
            triggerQuickGenerateForCurrentPage().finally(function () {
                btn.disabled = false;
            });
        });
        btn.addEventListener('mousedown', function () {
            btn.style.transform = 'scale(0.92)';
        });
        btn.addEventListener('mouseup', function () {
            btn.style.transform = 'scale(1)';
        });
        btn.addEventListener('mouseleave', function () {
            btn.style.transform = 'scale(1)';
        });

        const parent = opts.mountTarget && opts.mountTarget.appendChild ? opts.mountTarget : global.document.body;
        parent.appendChild(btn);
        return true;
    }

    function initBatchRuntimeFeatures() {
        startBatchEventPolling();
        if (global.document && global.document.body) {
            const path = asString(global.location && global.location.pathname);
            if (!/FangCun\.html$/i.test(path)) {
                setTimeout(function () {
                    const btn = global.document.getElementById('generateBtn');
                    if (!btn || btn.dataset.scBgBound === '1') return;
                    btn.dataset.scBgBound = '1';
                    btn.addEventListener('click', function (event) {
                        const scene = detectSceneByPathname();
                        if (!shouldUseBatchQuickGenerate(scene)) return;
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        if (btn.disabled) return;
                        btn.disabled = true;
                        triggerQuickGenerateForCurrentPage({ source: 'scene_button' }).finally(function () {
                            btn.disabled = false;
                        });
                    }, true);
                }, 0);
            }
        }
    }

    function navigateToRolePicker() {
        try {
            const parentWindow = getParentWindow();
            parentWindow.postMessage({ type: 'SECRET_CENTER_NAVIGATE', target: 'role_picker', at: Date.now() }, '*');
            return true;
        } catch (e) {
            return false;
        }
    }

    function navigateToFangCun(options) {
        const opts = asObject(options);
        const fallbackUrl = asString(opts.fallbackUrl || 'FangCun.html') || 'FangCun.html';
        const preferHistory = opts.preferHistory !== false;
        const referrer = asString(global.document && global.document.referrer || '');
        const fromFangCun = /(?:^|\/)FangCun\.html(?:[?#].*)?$/i.test(referrer);

        if (preferHistory && fromFangCun) {
            try {
                if (global.history && global.history.length > 1) {
                    global.history.back();
                    return true;
                }
            } catch (e) { }
        }

        try {
            const parentWindow = getParentWindow();
            if (parentWindow && typeof parentWindow.postMessage === 'function') {
                parentWindow.postMessage({ type: 'SECRET_CENTER_NAVIGATE', target: 'fangcun', at: Date.now() }, '*');
                return true;
            }
        } catch (e2) { }

        try {
            global.location.replace(fallbackUrl);
        } catch (e3) {
            global.location.href = fallbackUrl;
        }
        return true;
    }

    global.SecretCenterCore = {
        scenes: SCENE_META,
        getSceneLabel: getSceneLabel,
        getSelectedRoleId: getSelectedRoleId,
        getSelectedRoleName: getSelectedRoleName,
        writeSelectedRole: writeSelectedRole,
        resolveRoleContext: resolveRoleContext,
        buildSceneCacheKey: buildSceneCacheKey,
        readSceneCache: readSceneCache,
        readSceneCacheAsync: readSceneCacheAsync,
        writeSceneCache: writeSceneCache,
        clearSceneCache: clearSceneCache,
        markSceneVisited: markSceneVisited,
        getSceneGenerationStatusMap: getSceneGenerationStatusMap,
        readPromptDebugStore: readPromptDebugStore,
        getPromptDebugRecord: getPromptDebugRecord,
        showDialog: showDialog,
        showGenerationErrorDialog: showGenerationErrorDialog,
        getBatchGenerationOptions: getBatchGenerationOptions,
        startBatchGeneration: startBatchGeneration,
        generateSceneNow: generateSceneNow,
        triggerQuickGenerateForCurrentPage: triggerQuickGenerateForCurrentPage,
        mountQuickGenerateButton: mountQuickGenerateButton,
        consumeBatchEvents: consumeBatchEvents,
        generateSceneContent: generateSceneContent,
        generateNiNanContent: generateNiNanContent,
        generateShadowDiaryContent: generateShadowDiaryContent,
        generateShadowShoppingContent: generateShadowShoppingContent,
        generateShadowYoutubeContent: generateShadowYoutubeContent,
        generateShadowAppStoreContent: generateShadowAppStoreContent,
        generateShadowSettingsContent: generateShadowSettingsContent,
        generateShadowAssetsContent: generateShadowAssetsContent,
        generateShadowHealthContent: generateShadowHealthContent,
        generateShadowFoodContent: generateShadowFoodContent,
        generateShadowGameContent: generateShadowGameContent,
        generateShadowCallsContent: generateShadowCallsContent,
        generateShadowSMSContent: generateShadowSMSContent,
        generateShadowBrowserContent: generateShadowBrowserContent,
        generateShadowPhotosContent: generateShadowPhotosContent,
        generateShadowItineraryContent: generateShadowItineraryContent,
        generateShadowWechatContent: generateShadowWechatContent,
        navigateToRolePicker: navigateToRolePicker,
        navigateToFangCun: navigateToFangCun
    };
    compactLegacySceneCachesInLocalStorage();
    ensureSceneCacheForageStore();
    initBatchRuntimeFeatures();
})(window);
