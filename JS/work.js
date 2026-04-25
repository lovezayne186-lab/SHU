(function () {
    const STORE_KEY = 'wechat_workData_v1';
    const STORY_KEY = 'wechat_workStories_v1';
    const LAST_AUTO_KEY = 'wechat_workLastAutoJob_v1';

    const jobs = [
        { id: 'coffee', name: '咖啡店员', baseReward: 200, duration: 7200000, tags: ['开朗', '服务', '细心', '社交'], emoji: '☕' },
        { id: 'barista', name: '手冲咖啡师', baseReward: 240, duration: 7200000, tags: ['专注', '细节', '审美', '手作'], emoji: '🫘' },
        { id: 'bakery', name: '面包房学徒', baseReward: 210, duration: 9000000, tags: ['手作', '耐心', '温柔', '香味'], emoji: '🥐' },
        { id: 'dessert', name: '甜品店助手', baseReward: 220, duration: 7200000, tags: ['细心', '审美', '温柔', '服务'], emoji: '🍰' },
        { id: 'bookstore', name: '书店整理', baseReward: 180, duration: 5400000, tags: ['安静', '细致', '喜欢书', '条理'], emoji: '📚' },
        { id: 'library', name: '图书馆助理', baseReward: 200, duration: 7200000, tags: ['安静', '条理', '认真', '喜欢书'], emoji: '🏛️' },
        { id: 'flower', name: '花店帮手', baseReward: 220, duration: 7200000, tags: ['温柔', '审美', '耐心', '手作'], emoji: '🌿' },
        { id: 'plant', name: '植物店养护', baseReward: 230, duration: 7200000, tags: ['耐心', '细致', '安静', '治愈'], emoji: '🪴' },
        { id: 'studio', name: '摄影棚助理', baseReward: 260, duration: 7200000, tags: ['审美', '行动力', '社交', '表达'], emoji: '📷' },
        { id: 'photo_edit', name: '修图师', baseReward: 300, duration: 7200000, tags: ['审美', '专注', '细节', '技术'], emoji: '🖥️' },
        { id: 'video_cut', name: '剪辑助理', baseReward: 280, duration: 7200000, tags: ['专注', '节奏', '审美', '技术'], emoji: '🎞️' },
        { id: 'podcast', name: '播客剪辑', baseReward: 260, duration: 5400000, tags: ['安静', '节奏', '专注', '文字'], emoji: '🎧' },
        { id: 'pet', name: '宠物店护理', baseReward: 240, duration: 7200000, tags: ['喜欢动物', '温柔', '耐心', '细心'], emoji: '🐾' },
        { id: 'dog_walk', name: '遛狗员', baseReward: 190, duration: 3600000, tags: ['喜欢动物', '行动力', '户外', '体力'], emoji: '🦮' },
        { id: 'cat_sitter', name: '猫咪看护', baseReward: 220, duration: 5400000, tags: ['安静', '温柔', '喜欢动物', '细心'], emoji: '🐈' },
        { id: 'office', name: '资料整理', baseReward: 210, duration: 5400000, tags: ['理性', '条理', '认真', '细心'], emoji: '🗂️' },
        { id: 'data_entry', name: '数据录入', baseReward: 200, duration: 5400000, tags: ['细心', '耐心', '条理', '安静'], emoji: '⌨️' },
        { id: 'reception', name: '前台接待', baseReward: 230, duration: 7200000, tags: ['礼貌', '社交', '服务', '开朗'], emoji: '🛎️' },
        { id: 'event_staff', name: '活动执行', baseReward: 280, duration: 7200000, tags: ['行动力', '社交', '抗压', '沟通'], emoji: '🎪' },
        { id: 'store_clerk', name: '便利店店员', baseReward: 200, duration: 7200000, tags: ['服务', '细心', '耐心', '夜班'], emoji: '🏪' },
        { id: 'supermarket', name: '超市理货', baseReward: 210, duration: 7200000, tags: ['体力', '条理', '认真', '行动力'], emoji: '🛒' },
        { id: 'warehouse', name: '仓库拣货', baseReward: 240, duration: 7200000, tags: ['体力', '条理', '行动力', '认真'], emoji: '📦' },
        { id: 'courier', name: '同城跑腿', baseReward: 260, duration: 5400000, tags: ['行动力', '户外', '抗压', '路线'], emoji: '🛵' },
        { id: 'driver', name: '代驾', baseReward: 300, duration: 7200000, tags: ['稳重', '夜晚', '抗压', '可靠'], emoji: '🚗' },
        { id: 'cleaning', name: '整理收纳', baseReward: 260, duration: 7200000, tags: ['条理', '细致', '认真', '强迫症'], emoji: '🧺' },
        { id: 'laundry', name: '洗衣店助手', baseReward: 210, duration: 5400000, tags: ['细心', '耐心', '条理', '安静'], emoji: '🧼' },
        { id: 'tailor', name: '裁缝助理', baseReward: 260, duration: 7200000, tags: ['手作', '细节', '耐心', '审美'], emoji: '🧵' },
        { id: 'jewelry', name: '饰品手作', baseReward: 280, duration: 7200000, tags: ['手作', '审美', '细节', '安静'], emoji: '💍' },
        { id: 'calligraphy', name: '字帖抄写', baseReward: 200, duration: 5400000, tags: ['安静', '专注', '耐心', '细致'], emoji: '✍️' },
        { id: 'translator', name: '翻译校对', baseReward: 320, duration: 7200000, tags: ['理性', '语言', '细心', '安静'], emoji: '🌐' },
        { id: 'copywriter', name: '文案写作', baseReward: 300, duration: 5400000, tags: ['文字', '表达', '想象力', '安静'], emoji: '📝' },
        { id: 'editor', name: '内容编辑', baseReward: 310, duration: 7200000, tags: ['文字', '条理', '细心', '审美'], emoji: '🗞️' },
        { id: 'illustrator', name: '插画助理', baseReward: 320, duration: 7200000, tags: ['审美', '想象力', '安静', '手作'], emoji: '🎨' },
        { id: 'designer', name: '平面设计助理', baseReward: 330, duration: 7200000, tags: ['审美', '技术', '专注', '表达'], emoji: '🖋️' },
        { id: 'ui', name: 'UI 走查', baseReward: 280, duration: 5400000, tags: ['细节', '审美', '理性', '专注'], emoji: '📐' },
        { id: 'qa', name: '测试助理', baseReward: 270, duration: 5400000, tags: ['理性', '细心', '专注', '条理'], emoji: '🧪' },
        { id: 'dev_helper', name: '脚本整理', baseReward: 290, duration: 5400000, tags: ['技术', '理性', '条理', '安静'], emoji: '🧩' },
        { id: 'it_support', name: 'IT 值班', baseReward: 300, duration: 7200000, tags: ['技术', '可靠', '冷静', '抗压'], emoji: '🛠️' },
        { id: 'teacher', name: '助教', baseReward: 280, duration: 5400000, tags: ['耐心', '表达', '温柔', '条理'], emoji: '📘' },
        { id: 'tutor', name: '家教', baseReward: 340, duration: 5400000, tags: ['耐心', '表达', '认真', '条理'], emoji: '🏫' },
        { id: 'coach', name: '健身房私教助理', baseReward: 320, duration: 5400000, tags: ['体力', '行动力', '自律', '社交'], emoji: '🏋️' },
        { id: 'yoga', name: '瑜伽馆助理', baseReward: 260, duration: 5400000, tags: ['温柔', '安静', '治愈', '耐心'], emoji: '🧘' },
        { id: 'runner', name: '赛事志愿者', baseReward: 220, duration: 5400000, tags: ['行动力', '社交', '热心', '体力'], emoji: '🏁' },
        { id: 'nurse_aide', name: '护理助理', baseReward: 320, duration: 7200000, tags: ['温柔', '细心', '耐心', '可靠'], emoji: '🩺' },
        { id: 'clinic', name: '诊所前台', baseReward: 260, duration: 7200000, tags: ['礼貌', '条理', '耐心', '服务'], emoji: '🏥' },
        { id: 'pharmacy', name: '药店助手', baseReward: 280, duration: 7200000, tags: ['认真', '细心', '可靠', '条理'], emoji: '💊' },
        { id: 'lab', name: '实验室助理', baseReward: 340, duration: 7200000, tags: ['理性', '专注', '细心', '安静'], emoji: '🔬' },
        { id: 'museum', name: '展馆讲解', baseReward: 280, duration: 5400000, tags: ['表达', '审美', '社交', '礼貌'], emoji: '🖼️' },
        { id: 'gallery', name: '画廊值班', baseReward: 260, duration: 7200000, tags: ['安静', '审美', '礼貌', '细心'], emoji: '🧑‍🎨' },
        { id: 'cinema', name: '影院检票', baseReward: 220, duration: 5400000, tags: ['服务', '礼貌', '夜晚', '耐心'], emoji: '🎟️' },
        { id: 'theatre', name: '剧场场务', baseReward: 260, duration: 7200000, tags: ['行动力', '抗压', '夜晚', '认真'], emoji: '🎭' },
        { id: 'band', name: 'Livehouse 场控', baseReward: 300, duration: 7200000, tags: ['夜晚', '抗压', '社交', '行动力'], emoji: '🎸' },
        { id: 'makeup', name: '化妆助理', baseReward: 320, duration: 7200000, tags: ['审美', '细心', '手作', '社交'], emoji: '💄' },
        { id: 'hair', name: '发型助理', baseReward: 280, duration: 7200000, tags: ['社交', '手作', '耐心', '审美'], emoji: '💇' },
        { id: 'stylist', name: '造型助理', baseReward: 330, duration: 7200000, tags: ['审美', '社交', '行动力', '表达'], emoji: '🧥' },
        { id: 'model', name: '平面模特', baseReward: 360, duration: 5400000, tags: ['自信', '表达', '审美', '镜头'], emoji: '📸' },
        { id: 'actor', name: '短剧演员', baseReward: 380, duration: 7200000, tags: ['表达', '社交', '情绪', '镜头'], emoji: '🎬' },
        { id: 'voice', name: '配音试音', baseReward: 320, duration: 5400000, tags: ['表达', '情绪', '声音', '安静'], emoji: '🎙️' },
        { id: 'idol', name: '练习生排练', baseReward: 300, duration: 7200000, tags: ['自律', '体力', '表达', '舞台'], emoji: '🕺' },
        { id: 'dance', name: '舞蹈助教', baseReward: 320, duration: 5400000, tags: ['体力', '表达', '耐心', '行动力'], emoji: '💃' },
        { id: 'baker_night', name: '夜间烘焙', baseReward: 260, duration: 7200000, tags: ['夜晚', '专注', '手作', '耐心'], emoji: '🌙' },
        { id: 'security', name: '夜班巡查', baseReward: 280, duration: 7200000, tags: ['夜晚', '稳重', '可靠', '抗压'], emoji: '🕯️' },
        { id: 'studio_runner', name: '片场跑腿', baseReward: 300, duration: 5400000, tags: ['行动力', '抗压', '社交', '体力'], emoji: '🏃' },
        { id: 'catering', name: '外烩帮厨', baseReward: 260, duration: 7200000, tags: ['体力', '手作', '抗压', '团队'], emoji: '🍳' },
        { id: 'kitchen_prep', name: '后厨备料', baseReward: 240, duration: 7200000, tags: ['体力', '细心', '节奏', '抗压'], emoji: '🥕' },
        { id: 'tea', name: '茶馆侍应', baseReward: 220, duration: 7200000, tags: ['安静', '礼貌', '服务', '温柔'], emoji: '🍵' },
        { id: 'hotel', name: '酒店客房服务', baseReward: 260, duration: 7200000, tags: ['细心', '耐心', '服务', '体力'], emoji: '🛏️' },
        { id: 'bellhop', name: '行李员', baseReward: 240, duration: 5400000, tags: ['体力', '礼貌', '行动力', '服务'], emoji: '🧳' },
        { id: 'tour', name: '城市导览', baseReward: 340, duration: 7200000, tags: ['表达', '社交', '户外', '路线'], emoji: '🧭' },
        { id: 'map_maker', name: '地图标注', baseReward: 260, duration: 5400000, tags: ['理性', '条理', '安静', '路线'], emoji: '🗺️' },
        { id: 'detective', name: '调查助理', baseReward: 360, duration: 7200000, tags: ['理性', '观察', '冷静', '专注'], emoji: '🔎' },
        { id: 'wizard_scribe', name: '魔法书抄写员', baseReward: 340, duration: 7200000, tags: ['魔法', '安静', '专注', '细致'], emoji: '📜' },
        { id: 'apothecary', name: '炼金药师学徒', baseReward: 360, duration: 7200000, tags: ['魔法', '理性', '细心', '实验'], emoji: '⚗️' },
        { id: 'knight_squire', name: '骑士侍从', baseReward: 320, duration: 7200000, tags: ['骑士', '忠诚', '体力', '行动力'], emoji: '🛡️' },
        { id: 'maid', name: '宅邸管家助理', baseReward: 300, duration: 7200000, tags: ['礼貌', '条理', '服务', '可靠'], emoji: '🕊️' },
    ];

    let store = null;
    const runtime = {
        activeTab: 'home',
        isLeaderboardView: false,
        sheetRoleId: '',
        sheetRecoJobId: '',
        noteRoleId: '',
        noteReqToken: 0,
        noteReportSnapshot: null,
        cabinetRoleId: '',
        giftCabinetOpen: false,
        prevTabBeforeCabinet: 'home',
        giftDetail: null,
        detailRoleId: '',
        detailFxToken: 0,
        detailLastAction: '',
        confirmCb: null,
        confirmForRoleId: '',
        tickerId: null,
        lastRenderAt: 0,
        workReportReqByRole: {},
        familyPickerSelectedRoleId: '',
        familyAmountRoleId: '',
        giftPoolLoadingRoleId: '',
        giftPoolModalCallback: null,
        giftPoolModalMode: '',
        giftPoolPageOpen: false,
        giftPoolPrevWalletVisible: false,
    };

    function safeParse(text, fallback) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return fallback;
        }
    }

    function clampNumber(v, min, max, fallback) {
        const n = Number(v);
        if (!Number.isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    }

    function loadLastAutoMap() {
        const raw = localStorage.getItem(LAST_AUTO_KEY);
        const parsed = raw ? safeParse(raw, {}) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    }

    function getLastAutoJobId(roleId) {
        const id = String(roleId || '').trim();
        if (!id) return '';
        const map = loadLastAutoMap();
        return typeof map[id] === 'string' ? map[id] : '';
    }

    function setLastAutoJobId(roleId, jobId) {
        const rid = String(roleId || '').trim();
        const jid = String(jobId || '').trim();
        if (!rid || !jid) return;
        const map = loadLastAutoMap();
        map[rid] = jid;
        try { localStorage.setItem(LAST_AUTO_KEY, JSON.stringify(map)); } catch (e) { }
    }

    function pickVariedJobForAuto(roleId, excludedJobId) {
        const text = contextTextForRole(roleId);
        const exclude = String(excludedJobId || '').trim();
        const list = jobs.map(function (job) {
            const s = scoreJobAgainstPersona(job, text);
            return { job: job, score: s, reward: clampNumber(job.baseReward, 0, 999999999, 0) };
        }).filter(function (x) {
            return x && x.job && (!exclude || x.job.id !== exclude);
        });
        if (!list.length) return null;
        list.sort(function (a, b) {
            if (b.score !== a.score) return b.score - a.score;
            if (b.reward !== a.reward) return b.reward - a.reward;
            return 0;
        });

        const top = list.slice(0, Math.min(8, list.length));
        const idx = Math.floor(Math.random() * top.length);
        return top[idx] && top[idx].job ? top[idx].job : top[0].job;
    }

    function loadStore() {
        const raw = localStorage.getItem(STORE_KEY);
        const parsed = raw ? safeParse(raw, {}) : {};
        store = parsed && typeof parsed === 'object' ? parsed : {};
        if (!store.roles || typeof store.roles !== 'object') store.roles = {};
        return store;
    }

    function saveStore() {
        if (!store) return;
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(store));
        } catch (e) { }
    }

    function ensureStore() {
        if (!store) loadStore();
        return store;
    }

    function getProfiles() {
        if (window.charProfiles && typeof window.charProfiles === 'object') return window.charProfiles;
        try {
            const raw = localStorage.getItem('wechat_charProfiles');
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                window.charProfiles = parsed;
                return parsed;
            }
        } catch (e) { }
        return {};
    }

    function saveProfiles(profiles) {
        window.charProfiles = profiles;
        try {
            localStorage.setItem('wechat_charProfiles', JSON.stringify(profiles || {}));
        } catch (e) { }
    }

    function getRoleJobHistory(roleId) {
        const profiles = getProfiles();
        const p = profiles[roleId] || {};
        const arr = Array.isArray(p.job_history) ? p.job_history : [];
        return arr.map(function (x) { return String(x || '').trim(); }).filter(Boolean);
    }

    function pushRoleJobHistory(roleId, jobName) {
        const name = String(jobName || '').trim();
        if (!roleId || !name) return;
        const profiles = getProfiles();
        const p = profiles[roleId] && typeof profiles[roleId] === 'object' ? profiles[roleId] : {};
        const arr = Array.isArray(p.job_history) ? p.job_history : [];
        arr.push(name);
        p.job_history = arr.slice(-200);
        profiles[roleId] = p;
        saveProfiles(profiles);
    }

    function pushRoleGift(roleId, gift) {
        if (!roleId || !gift || typeof gift !== 'object') return;
        const name = typeof gift.name === 'string' ? gift.name.trim() : '';
        if (!name) return;
        const profiles = getProfiles();
        const p = profiles[roleId] && typeof profiles[roleId] === 'object' ? profiles[roleId] : {};
        const arr = Array.isArray(p.gift_cabinet) ? p.gift_cabinet : [];
        arr.push({
            name: name,
            icon: (typeof gift.icon === 'string' && gift.icon.trim()) ? gift.icon.trim() : '🎁',
            description: (typeof gift.description === 'string') ? gift.description.trim() : ''
        });
        p.gift_cabinet = arr.slice(-500);
        profiles[roleId] = p;
        saveProfiles(profiles);
    }

    function getRoleRecentGiftNames(roleId, limit) {
        const profiles = getProfiles();
        const p = profiles[roleId] || {};
        const gifts = Array.isArray(p.gift_cabinet) ? p.gift_cabinet : [];
        const n = clampNumber(limit, 1, 60, 12);
        const out = [];
        for (let i = Math.max(0, gifts.length - n); i < gifts.length; i++) {
            const g = gifts[i] && typeof gifts[i] === 'object' ? gifts[i] : null;
            const name = g && typeof g.name === 'string' ? g.name.trim() : '';
            if (name) out.push(name);
        }
        return out;
    }

    function normalizeGiftPoolRarity(rarity, fallbackRarity) {
        const raw = String(rarity || fallbackRarity || 'R').trim().toUpperCase();
        if (raw === 'SSR') return 'SSR';
        if (raw === 'SR') return 'SR';
        return 'R';
    }

    function createEmptyGiftPoolState() {
        return {
            tickets: 20,
            progress: 0,
            chatTrackingStarted: false,
            generatedAt: 0,
            updatedAt: 0,
            totalGenerated: 0,
            pool: { SSR: [], SR: [], R: [] },
            history: { SSR: [], SR: [], R: [] }
        };
    }

    function getRoleGiftPoolState(roleId) {
        const id = String(roleId || '').trim();
        if (!id) return createEmptyGiftPoolState();
        const profiles = getProfiles();
        const p = profiles[id] && typeof profiles[id] === 'object' ? profiles[id] : {};
        let pool = p.gift_pool && typeof p.gift_pool === 'object' ? p.gift_pool : null;
        if (!pool) {
            pool = createEmptyGiftPoolState();
            p.gift_pool = pool;
            profiles[id] = p;
            saveProfiles(profiles);
            return pool;
        }
        const next = createEmptyGiftPoolState();
        next.tickets = clampNumber(pool.tickets, 0, 999999, 20);
        next.progress = clampNumber(pool.progress, 0, 9, 0);
        next.chatTrackingStarted = !!pool.chatTrackingStarted;
        next.generatedAt = clampNumber(pool.generatedAt, 0, Number.MAX_SAFE_INTEGER, 0);
        next.updatedAt = clampNumber(pool.updatedAt, 0, Number.MAX_SAFE_INTEGER, 0);
        next.totalGenerated = clampNumber(pool.totalGenerated, 0, 999999, 0);
        const rawPool = pool.pool && typeof pool.pool === 'object' ? pool.pool : {};
        const rawHistory = pool.history && typeof pool.history === 'object' ? pool.history : {};
        ['SSR', 'SR', 'R'].forEach(function (rarity) {
            next.pool[rarity] = Array.isArray(rawPool[rarity]) ? rawPool[rarity].slice() : [];
            next.history[rarity] = Array.isArray(rawHistory[rarity]) ? rawHistory[rarity].slice() : [];
        });
        if (JSON.stringify(pool) !== JSON.stringify(next)) {
            p.gift_pool = next;
            profiles[id] = p;
            saveProfiles(profiles);
        }
        return next;
    }

    function saveRoleGiftPoolState(roleId, state) {
        const id = String(roleId || '').trim();
        if (!id) return createEmptyGiftPoolState();
        const next = state && typeof state === 'object' ? state : createEmptyGiftPoolState();
        next.tickets = clampNumber(next.tickets, 0, 999999, 20);
        next.progress = clampNumber(next.progress, 0, 9, 0);
        next.chatTrackingStarted = next.chatTrackingStarted === true;
        next.generatedAt = clampNumber(next.generatedAt, 0, Number.MAX_SAFE_INTEGER, 0);
        next.updatedAt = Date.now();
        next.totalGenerated = clampNumber(next.totalGenerated, 0, 999999, 0);
        if (!next.pool || typeof next.pool !== 'object') next.pool = { SSR: [], SR: [], R: [] };
        if (!next.history || typeof next.history !== 'object') next.history = { SSR: [], SR: [], R: [] };
        ['SSR', 'SR', 'R'].forEach(function (rarity) {
            if (!Array.isArray(next.pool[rarity])) next.pool[rarity] = [];
            if (!Array.isArray(next.history[rarity])) next.history[rarity] = [];
        });
        const profiles = getProfiles();
        const p = profiles[id] && typeof profiles[id] === 'object' ? profiles[id] : {};
        p.gift_pool = next;
        profiles[id] = p;
        saveProfiles(profiles);
        refreshGiftViews(id);
        return next;
    }

    function refreshGiftViews(roleId) {
        const id = String(roleId || '').trim();
        const activeId = String(runtime.cabinetRoleId || window.currentCharacterId || '').trim();
        if (runtime.activeTab === 'records' && (!id || !activeId || activeId === id)) {
            renderGiftCabinet(id || activeId);
        }
        if (runtime.giftPoolPageOpen && (!id || !activeId || activeId === id)) {
            renderGiftPoolPage(id || activeId);
        }
    }

    function flattenGiftPoolCards(poolState) {
        const state = poolState && typeof poolState === 'object' ? poolState : createEmptyGiftPoolState();
        const out = [];
        ['SSR', 'SR', 'R'].forEach(function (rarity) {
            const list = Array.isArray(state.pool && state.pool[rarity]) ? state.pool[rarity] : [];
            list.forEach(function (card) {
                if (!card || typeof card !== 'object') return;
                out.push(card);
            });
        });
        return out;
    }

    function stripGiftPoolText(text) {
        return String(text || '')
            .replace(/\r/g, '\n')
            .replace(/```(?:json)?/gi, '```')
            .replace(/```[\s\S]*?```/g, function (match) {
                return String(match || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
            })
            .trim();
    }

    function extractJsonLikeText(text) {
        const raw = stripGiftPoolText(text);
        
        // 尝试匹配 markdown 代码块中的 JSON
        const markdownMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (markdownMatch && markdownMatch[1]) {
            try { return JSON.parse(markdownMatch[1]); } catch (e) { }
        }
        
        const firstObj = raw.indexOf('{');
        const lastObj = raw.lastIndexOf('}');
        if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
            const obj = raw.slice(firstObj, lastObj + 1);
            try { return JSON.parse(obj); } catch (e) { }
        }
        const firstArr = raw.indexOf('[');
        const lastArr = raw.lastIndexOf(']');
        if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
            const arr = raw.slice(firstArr, lastArr + 1);
            try { return JSON.parse(arr); } catch (e2) { }
        }
        try {
            return JSON.parse(raw);
        } catch (e3) {
            return null;
        }
    }

    function extractGiftPoolCardsFromLooseText(text) {
        const raw = stripGiftPoolText(text);
        if (!raw) return [];

        function collectObjects(segment) {
            const out = [];
            let depth = 0;
            let start = -1;
            let inString = false;
            let escape = false;
            for (let i = 0; i < segment.length; i++) {
                const ch = segment.charAt(i);
                if (inString) {
                    if (escape) {
                        escape = false;
                    } else if (ch === '\\') {
                        escape = true;
                    } else if (ch === '"') {
                        inString = false;
                    }
                    continue;
                }
                if (ch === '"') {
                    inString = true;
                    continue;
                }
                if (ch === '{') {
                    if (depth === 0) start = i;
                    depth += 1;
                    continue;
                }
                if (ch === '}' && depth > 0) {
                    depth -= 1;
                    if (depth === 0 && start !== -1) {
                        const piece = segment.slice(start, i + 1);
                        try {
                            const parsed = JSON.parse(piece);
                            if (parsed && typeof parsed === 'object') out.push(parsed);
                        } catch (e) { }
                        start = -1;
                    }
                }
            }
            return out;
        }

        const candidates = [];
        const cardsKeyIndex = raw.indexOf('"cards"');
        if (cardsKeyIndex !== -1) {
            const arrStart = raw.indexOf('[', cardsKeyIndex);
            if (arrStart !== -1) {
                candidates.push.apply(candidates, collectObjects(raw.slice(arrStart + 1)));
            }
        }
        if (!candidates.length) {
            candidates.push.apply(candidates, collectObjects(raw));
        }
        return candidates;
    }

    function normalizeGiftPoolCard(raw, fallbackRarity, index, roleId) {
        const item = raw && typeof raw === 'object' ? raw : {};
        const rarity = normalizeGiftPoolRarity(item.rarity || item.grade || item.level || item.rank || fallbackRarity, fallbackRarity);
        const title = String(item.title || item.name || item.label || item.heading || '').trim();
        const content = String(item.content || item.text || item.description || item.desc || item.line || item.body || '').trim();
        const note = String(item.note || item.tag || item.tags || '').trim();
        const icon = String(item.icon || '🎁').trim();
        const finalContent = content || title || '未命名词条';
        return {
            id: String(item.id || (roleId ? roleId + '_' : '') + rarity + '_' + index + '_' + Date.now() + '_' + Math.random().toString(16).slice(2)).trim(),
            rarity: rarity,
            title: title || finalContent.slice(0, 24),
            content: finalContent,
            note: note,
            icon: icon,
            tags: Array.isArray(item.tags) ? item.tags.map(function (x) { return String(x || '').trim(); }).filter(Boolean) : [],
            createdAt: clampNumber(item.createdAt, 0, Number.MAX_SAFE_INTEGER, Date.now())
        };
    }

    function normalizeGiftPoolPayload(payload, roleId) {
        const rawText = typeof payload === 'string' ? payload : '';
        let raw = payload;
        if (typeof raw === 'string') raw = extractJsonLikeText(raw);
        if (!raw || typeof raw !== 'object') {
            const looseCards = rawText ? extractGiftPoolCardsFromLooseText(rawText) : [];
            if (!looseCards.length) return null;
            raw = { cards: looseCards };
        }

        if (raw && typeof raw === 'object') {
            const nestedKeys = ['gift_pool', 'giftPool', 'giftpool', 'data', 'result', 'payload'];
            for (let i = 0; i < nestedKeys.length; i++) {
                const k = nestedKeys[i];
                if (raw[k] && typeof raw[k] === 'object') {
                    const nested = normalizeGiftPoolPayload(raw[k], roleId);
                    if (nested) return nested;
                }
            }
        }

        let cards = [];
        if (Array.isArray(raw)) {
            cards = raw.slice();
        } else if (Array.isArray(raw.cards)) {
            cards = raw.cards.slice();
        } else if (raw.cards_by_rarity && typeof raw.cards_by_rarity === 'object') {
            ['SSR', 'SR', 'R'].forEach(function (rarity) {
                const list = Array.isArray(raw.cards_by_rarity[rarity]) ? raw.cards_by_rarity[rarity] : [];
                list.forEach(function (card) {
                    cards.push(Object.assign({}, card, { rarity: card && card.rarity ? card.rarity : rarity }));
                });
            });
        } else if (raw.cardsByRarity && typeof raw.cardsByRarity === 'object') {
            ['SSR', 'SR', 'R'].forEach(function (rarity) {
                const list = Array.isArray(raw.cardsByRarity[rarity]) ? raw.cardsByRarity[rarity] : [];
                list.forEach(function (card) {
                    cards.push(Object.assign({}, card, { rarity: card && card.rarity ? card.rarity : rarity }));
                });
            });
        } else if (raw.pool && typeof raw.pool === 'object') {
            ['SSR', 'SR', 'R'].forEach(function (rarity) {
                const list = Array.isArray(raw.pool[rarity]) ? raw.pool[rarity] : [];
                list.forEach(function (card) {
                    cards.push(Object.assign({}, card, { rarity: card && card.rarity ? card.rarity : rarity }));
                });
            });
        } else {
            const maybeArrays = ['SSR', 'SR', 'R'].some(function (rarity) {
                return Array.isArray(raw[rarity]);
            });
            if (maybeArrays) {
                ['SSR', 'SR', 'R'].forEach(function (rarity) {
                    const list = Array.isArray(raw[rarity]) ? raw[rarity] : [];
                    list.forEach(function (card) {
                        cards.push(Object.assign({}, card, { rarity: card && card.rarity ? card.rarity : rarity }));
                    });
                });
            }
        }

        if (!cards.length) {
            const isCardLike = function (item) {
                if (!item || typeof item !== 'object') return false;
                const t = String(item.title || item.name || item.label || item.heading || '').trim();
                const c = String(item.content || item.text || item.description || item.desc || item.line || item.body || '').trim();
                return !!(t || c);
            };

            const queue = [{ node: raw, depth: 0 }];
            const maxDepth = 4;
            while (queue.length) {
                const cur = queue.shift();
                if (!cur || !cur.node || cur.depth > maxDepth) continue;
                const node = cur.node;
                if (Array.isArray(node)) {
                    const arr = node.filter(function (x) { return x && typeof x === 'object'; });
                    if (arr.length >= 6 && arr.some(isCardLike)) {
                        cards = node.slice();
                        break;
                    }
                    if (cur.depth < maxDepth) {
                        for (let i = 0; i < node.length; i++) {
                            const v = node[i];
                            if (v && typeof v === 'object') queue.push({ node: v, depth: cur.depth + 1 });
                        }
                    }
                    continue;
                }
                if (node && typeof node === 'object') {
                    if (cur.depth < maxDepth) {
                        const keys = Object.keys(node);
                        for (let i = 0; i < keys.length; i++) {
                            const v = node[keys[i]];
                            if (v && typeof v === 'object') queue.push({ node: v, depth: cur.depth + 1 });
                        }
                    }
                }
            }
        }
        if (!cards.length) return null;

        const bucket = { SSR: [], SR: [], R: [] };
        cards.forEach(function (card, index) {
            const normalized = normalizeGiftPoolCard(card, card && card.rarity, index, roleId);
            bucket[normalized.rarity].push(normalized);
        });
        return bucket;
    }

    function getGiftPoolContextText(roleId) {
        const id = String(roleId || '').trim();
        if (!id) return '';
        const profiles = getProfiles();
        const profile = profiles[id] && typeof profiles[id] === 'object' ? profiles[id] : {};
        const roleName = String(profile.remark || profile.nickName || profile.name || id || 'TA').trim() || 'TA';
        const roleDesc = String(profile.desc || '').trim();
        const roleStyle = String(profile.style || '').trim();
        const worldBookPrompt = typeof buildWorldBookPrompt === 'function'
            ? String(buildWorldBookPrompt(profile.worldbookId || '') || '').trim()
            : '';
        let shortTerm = '';
        try {
            const history = Array.isArray(window.chatData && window.chatData[id]) ? window.chatData[id] : [];
            if (typeof buildShortTermMemoryTextFromHistory === 'function') {
                shortTerm = String(buildShortTermMemoryTextFromHistory(history, 12) || '').trim();
            }
        } catch (e) { }
        let longTerm = '';
        try {
            const store = window.memoryArchiveStore || {};
            const archive = store && store[id] ? store[id] : null;
            if (archive && typeof archive === 'object') {
                const parts = [];
                if (archive.likesText) parts.push('【喜好/厌恶】\n' + String(archive.likesText || '').trim());
                if (archive.habitsText) parts.push('【行为习惯】\n' + String(archive.habitsText || '').trim());
                if (archive.eventsText) parts.push('【关系记忆】\n' + String(archive.eventsText || '').trim());
                longTerm = parts.join('\n\n');
            }
        } catch (e2) { }
        return [
            `【角色备注】${roleName}`,
            roleDesc ? `【角色人设】\n${roleDesc}` : '',
            roleStyle ? `【聊天风格】\n${roleStyle}` : '',
            shortTerm ? `【短期记忆】\n${shortTerm}` : '',
            longTerm ? `【长期记忆】\n${longTerm}` : '',
            worldBookPrompt ? `【世界书】\n${worldBookPrompt}` : ''
        ].filter(Boolean).join('\n\n');
    }

    function makeGiftTaskId(roleId) {
        const rid = String(roleId || '').trim();
        return 'gift_task_' + (rid ? (rid + '_') : '') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    }

    function makeGiftDrawId(roleId) {
        const rid = String(roleId || '').trim();
        return 'gift_draw_' + (rid ? (rid + '_') : '') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    }

    function normalizeGiftTaskState(rawState) {
        const state = rawState && typeof rawState === 'object' ? rawState : {};
        const next = {
            activeDraw: state.activeDraw && typeof state.activeDraw === 'object' ? state.activeDraw : null,
            pending: Array.isArray(state.pending) ? state.pending.slice() : []
        };
        if (next.activeDraw) {
            const draw = next.activeDraw;
            draw.drawId = String(draw.drawId || '').trim();
            draw.createdAt = clampNumber(draw.createdAt, 0, Number.MAX_SAFE_INTEGER, Date.now());
            draw.updatedAt = clampNumber(draw.updatedAt, 0, Number.MAX_SAFE_INTEGER, draw.createdAt);
            draw.cards = Array.isArray(draw.cards) ? draw.cards.map(function (card) {
                return card && typeof card === 'object' ? card : null;
            }).filter(Boolean) : [];
        }
        next.pending = next.pending.map(function (task) {
            if (!task || typeof task !== 'object') return null;
            const cardId = String(task.cardId || '').trim();
            const cardTitle = String(task.cardTitle || task.title || '').trim();
            const rarity = normalizeGiftPoolRarity(task.rarity, task.rarity);
            if (!cardId && !cardTitle) return null;
            return {
                id: String(task.id || makeGiftTaskId('task')).trim(),
                cardId: cardId,
                cardTitle: cardTitle || '礼物',
                rarity: rarity,
                content: String(task.content || '').trim(),
                note: String(task.note || '').trim(),
                executeAt: String(task.executeAt || '').trim(),
                executeAtText: String(task.executeAtText || '').trim(),
                sourceDrawId: String(task.sourceDrawId || '').trim(),
                status: String(task.status || 'pending').trim() || 'pending',
                createdAt: clampNumber(task.createdAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
                updatedAt: clampNumber(task.updatedAt, 0, Number.MAX_SAFE_INTEGER, Date.now())
            };
        }).filter(Boolean);
        return next;
    }

    function getRoleGiftTaskState(roleId) {
        const id = String(roleId || '').trim();
        if (!id) return normalizeGiftTaskState(null);
        const profiles = getProfiles();
        const profile = profiles[id] && typeof profiles[id] === 'object' ? profiles[id] : {};
        const raw = profile.gift_task_state && typeof profile.gift_task_state === 'object'
            ? profile.gift_task_state
            : null;
        const next = normalizeGiftTaskState(raw);
        profile.gift_task_state = next;
        profiles[id] = profile;
        saveProfiles(profiles);
        return next;
    }

    function saveRoleGiftTaskState(roleId, state) {
        const id = String(roleId || '').trim();
        if (!id) return normalizeGiftTaskState(null);
        const profiles = getProfiles();
        const profile = profiles[id] && typeof profiles[id] === 'object' ? profiles[id] : {};
        const next = normalizeGiftTaskState(state);
        profile.gift_task_state = next;
        profiles[id] = profile;
        saveProfiles(profiles);
        try {
            if (typeof window.saveData === 'function') window.saveData();
        } catch (e) { }
        return next;
    }

    function buildGiftTodoPromptText(roleId) {
        const id = String(roleId || '').trim();
        if (!id) return '';
        const state = getRoleGiftTaskState(id);
        const parts = [];
        const getRecipientName = function () {
            try {
                if (typeof window.getCurrentUserProfile === 'function') {
                    const profile = window.getCurrentUserProfile() || {};
                    const name = String(profile.name || '').trim();
                    if (name) return name;
                }
            } catch (e) { }
            try {
                const fallback = String(localStorage.getItem('user_name') || '').trim();
                if (fallback) return fallback;
            } catch (e2) { }
            return '你';
        };
        const formatDrawCardsText = function (cards) {
            const list = Array.isArray(cards) ? cards.filter(function (card) {
                return card && typeof card === 'object';
            }) : [];
            if (!list.length) return '';
            const rarityOrder = { SSR: 0, SR: 1, R: 2 };
            const summary = { SSR: 0, SR: 0, R: 0 };
            const detailed = list.map(function (card, index) {
                const rarity = normalizeGiftPoolRarity(card && card.rarity, card && card.rarity);
                const title = String(card && card.title || '').trim() || '未命名礼物';
                summary[rarity] = (summary[rarity] || 0) + 1;
                return {
                    index: index,
                    rarity: rarity,
                    title: title
                };
            }).sort(function (a, b) {
                const orderDiff = (rarityOrder[a.rarity] != null ? rarityOrder[a.rarity] : 99) - (rarityOrder[b.rarity] != null ? rarityOrder[b.rarity] : 99);
                return orderDiff !== 0 ? orderDiff : a.index - b.index;
            });
            const summaryText = ['SSR', 'SR', 'R']
                .filter(function (rarity) { return summary[rarity] > 0; })
                .map(function (rarity) { return `${rarity} ${summary[rarity]} 张`; })
                .join('、');
            const detailText = detailed.map(function (item) {
                return `${item.rarity}「${item.title}」`;
            }).join('、');
            return {
                summaryText: summaryText,
                detailText: detailText,
                total: list.length
            };
        };
        const recipientName = getRecipientName();
        if (state.activeDraw && Array.isArray(state.activeDraw.cards) && state.activeDraw.cards.length) {
            const draw = state.activeDraw;
            const drawText = formatDrawCardsText(draw.cards);
            if (drawText) {
                parts.push(`【当前待确认的抽卡结果】\n- 这些都是你给【${recipientName}】准备的礼物卡片，用户这次从你的礼物池里抽走了共 ${drawText.total} 张：${drawText.summaryText || '未分类'}。`);
                parts.push(`- 具体候选顺序：${drawText.detailText}。`);
            }
            parts.push('- 下一次轮到你回复时，要用符合人设的自然口吻带到这次抽卡，不要照搬固定句式。可以像真人一样轻轻催一下、调侃一下、或者温柔地追问：这么多礼物里先执行哪一个。');
            parts.push('- 如果用户还没决定，就继续引导他从这些候选里选一个；如果用户说“就这个”“先执行这个”“这个放到明天”，再把它转成待执行待办。');
        }
        if (Array.isArray(state.pending) && state.pending.length) {
            const pendingText = state.pending.slice(-8).map(function (task) {
                const title = String(task.cardTitle || '礼物').trim();
                const rarity = String(task.rarity || '').trim();
                const when = String(task.executeAtText || task.executeAt || '').trim();
                const note = String(task.note || '').trim();
                const whenText = when ? `｜约定时间：${when}` : '';
                const noteText = note ? `｜备注：${note}` : '';
                const rarityText = rarity ? `${rarity} ` : '';
                return `- ${task.id}：${rarityText}「${title}」${whenText}${noteText}`;
            }).join('\n');
            parts.push(`【礼物待办】\n${pendingText}`);
            parts.push('- 这些待办必须持续记住，直到完成或取消才从记忆里移除。');
        }
        return parts.length ? parts.join('\n\n') : '';
    }

    function findGiftTaskBySpec(state, spec) {
        const s = spec && typeof spec === 'object' ? spec : {};
        const taskId = String(s.taskId || s.id || '').trim();
        const cardId = String(s.cardId || '').trim();
        const cardTitle = String(s.cardTitle || s.title || '').trim();
        const rarity = normalizeGiftPoolRarity(s.rarity, s.rarity);
        const pending = Array.isArray(state && state.pending) ? state.pending : [];
        for (let i = 0; i < pending.length; i++) {
            const task = pending[i];
            if (!task || typeof task !== 'object') continue;
            if (taskId && String(task.id || '') === taskId) return { task: task, index: i };
            if (cardId && String(task.cardId || '') === cardId) return { task: task, index: i };
            if (cardTitle && String(task.cardTitle || '') === cardTitle) return { task: task, index: i };
            if (rarity && String(task.rarity || '') === rarity && cardTitle && String(task.cardTitle || '') === cardTitle) {
                return { task: task, index: i };
            }
        }
        return null;
    }

    function setGiftDrawOffer(roleId, drawnCards) {
        const id = String(roleId || '').trim();
        if (!id) return null;
        const state = getRoleGiftTaskState(id);
        const cards = Array.isArray(drawnCards) ? drawnCards.filter(function (card) {
            return card && typeof card === 'object';
        }).map(function (card) {
            return {
                id: String(card.id || '').trim(),
                rarity: normalizeGiftPoolRarity(card.rarity, card.rarity),
                title: String(card.title || '').trim(),
                content: String(card.content || '').trim(),
                icon: String(card.icon || '🎁').trim(),
                note: String(card.note || '').trim()
            };
        }) : [];
        const draw = {
            drawId: makeGiftDrawId(id),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            cards: cards
        };
        state.activeDraw = draw;
        saveRoleGiftTaskState(id, state);
        return draw;
    }

    function clearGiftDrawOffer(roleId) {
        const id = String(roleId || '').trim();
        if (!id) return;
        const state = getRoleGiftTaskState(id);
        state.activeDraw = null;
        saveRoleGiftTaskState(id, state);
    }

    function queueGiftDrawReaction(roleId, drawnCards) {
        const id = String(roleId || '').trim();
        const cards = Array.isArray(drawnCards) ? drawnCards.filter(function (card) {
            return card && typeof card === 'object';
        }) : [];
        if (!id || !cards.length) return;
        setGiftDrawOffer(id, cards);
        try {
            if (typeof window.saveData === 'function') window.saveData();
        } catch (e) { }
    }

    function applyGiftTodoAction(roleId, spec) {
        const id = String(roleId || '').trim();
        const action = spec && typeof spec === 'object' ? spec : {};
        if (!id) return { changed: false, task: null, state: null };
        const state = getRoleGiftTaskState(id);
        const op = String(action.op || action.action || action.mode || 'schedule').trim().toLowerCase();
        const now = Date.now();
        const activeDraw = state.activeDraw && typeof state.activeDraw === 'object' ? state.activeDraw : null;
        const pending = Array.isArray(state.pending) ? state.pending : [];

        const match = findGiftTaskBySpec(state, action);
        const matchedActiveCard = (function () {
            if (!activeDraw || !Array.isArray(activeDraw.cards)) return null;
            const cardId = String(action.cardId || '').trim();
            const cardTitle = String(action.cardTitle || action.title || '').trim();
            const rarity = normalizeGiftPoolRarity(action.rarity, action.rarity);
            for (let i = 0; i < activeDraw.cards.length; i++) {
                const card = activeDraw.cards[i];
                if (!card || typeof card !== 'object') continue;
                if (cardId && String(card.id || '') === cardId) return card;
                if (cardTitle && String(card.title || '') === cardTitle) return card;
                if (rarity && String(card.rarity || '') === rarity && cardTitle && String(card.title || '') === cardTitle) return card;
            }
            return null;
        })();

        if (op === 'complete' || op === 'done' || op === 'finish' || op === 'clear' || op === 'cancel') {
            let removed = false;
            if (match) {
                pending.splice(match.index, 1);
                removed = true;
            } else if (action.taskId || action.id || action.cardId || action.cardTitle) {
                const lookup = findGiftTaskBySpec(state, action);
                if (lookup) {
                    pending.splice(lookup.index, 1);
                    removed = true;
                }
            }
            if (activeDraw && (action.clearDraw === true || action.cardId || action.cardTitle || action.taskId || action.id)) {
                state.activeDraw = null;
                removed = true;
            }
            if (removed) {
                state.pending = pending;
                saveRoleGiftTaskState(id, state);
                return { changed: true, task: match ? match.task : null, state: state };
            }
            return { changed: false, task: null, state: state };
        }

        const baseTask = match ? match.task : null;
        const task = baseTask || {
            id: String(action.taskId || action.id || makeGiftTaskId(id)).trim(),
            cardId: '',
            cardTitle: '',
            rarity: '',
            content: '',
            note: '',
            executeAt: '',
            executeAtText: '',
            sourceDrawId: '',
            status: 'pending',
            createdAt: now,
            updatedAt: now
        };

        if (matchedActiveCard) {
            task.cardId = String(matchedActiveCard.id || task.cardId || '').trim();
            task.cardTitle = String(matchedActiveCard.title || task.cardTitle || '').trim();
            task.rarity = normalizeGiftPoolRarity(matchedActiveCard.rarity, matchedActiveCard.rarity);
            task.content = String(matchedActiveCard.content || task.content || '').trim();
        }
        if (action.cardId) task.cardId = String(action.cardId).trim();
        if (action.cardTitle || action.title) task.cardTitle = String(action.cardTitle || action.title).trim();
        if (action.rarity) task.rarity = normalizeGiftPoolRarity(action.rarity, action.rarity);
        if (action.content) task.content = String(action.content || '').trim();
        if (action.note) task.note = String(action.note || '').trim();
        if (action.executeAt) task.executeAt = String(action.executeAt || '').trim();
        if (action.executeAtText) task.executeAtText = String(action.executeAtText || '').trim();
        if (action.executeAtText && !task.executeAt) task.executeAtText = String(action.executeAtText || '').trim();
        if (activeDraw) task.sourceDrawId = String(action.drawId || activeDraw.drawId || task.sourceDrawId || '').trim();
        if (action.status) task.status = String(action.status || 'pending').trim() || 'pending';
        task.updatedAt = now;
        task.status = 'pending';

        let changed = false;
        if (match) {
            pending[match.index] = task;
            changed = true;
        } else {
            pending.push(task);
            changed = true;
        }
        if (activeDraw && action.keepActiveDraw !== true) {
            state.activeDraw = null;
            changed = true;
        }
        state.pending = pending;
        if (changed) {
            saveRoleGiftTaskState(id, state);
            return { changed: true, task: task, state: state };
        }
        return { changed: false, task: task, state: state };
    }

    function getGiftPoolPrompt(roleId) {
        const contextText = getGiftPoolContextText(roleId);
        return {
            systemPrompt: [
                '你是一个专属的伴侣互动卡池生成器。请基于给出的角色人设、世界书和近期聊天记忆，生成 50 条充满亲密感和互动性的抽取词条（卡片）。',
                '【核心内容要求】：',
                '1. 必须是具有极强【互动性】和【亲密感】的服务、奖励、特权或浪漫事件（例如：“一百个亲亲”、“帮忙批改试卷一次”、“晚安哄睡”）。',
                '2. 以【互动、服务、特权、行为】为主（占比80%以上），可以包含极少量的特殊【实体物品】（如：沾着他气味的衬衫、手写小纸条、一枚专属戒指）。',
                '3. 词条的 title（标题）必须简短有力，控制在 2~6 个字，绝对不能是一整句话。',
                '4. 固定稀有度比例为：SSR 6 条、SR 14 条、R 30 条，总计必须严格等于 50 条。',
                '',
                '【稀有度与文案要求】：',
                '【SSR】：极致的亲密、占有欲或特殊特权，极其撩人。例如：领带游戏、独占一整晚、绝对支配。',
                '【SR】：温馨、浪漫、深情的互动服务。例如：深吻不松开、抱紧不放、专属按摩、角色扮演。',
                '【R】：日常的甜蜜小特权与宠溺。例如：摸头券、亲额头、一起懒觉、牵手券、深夜聊天。',
                '',
                '每条词条必须且只能包含以下四个字段：',
                '- rarity: 稀有度（SSR / SR / R）',
                '- icon: 1个符合该词条氛围的 Emoji',
                '- title: 词条名称（2~6个字，如“专属按摩”、“晚安哄睡”）',
                '- content: 词条的详细描述（10~20字，描述具体互动场景或角色的反应）',
                '',
                '【极为重要的输出限制】',
                '你只能输出合法的 JSON，不能包含任何 Markdown 格式，不要包含 ```json 和 ``` 标记，不要输出任何其他文本！不要解释！',
                '你的输出必须严格符合以下 JSON 格式：',
                '{"cards": [',
                '  {"rarity": "SSR", "icon": "🎀", "title": "领带游戏", "content": "他用领带为你制造专属的黑暗，彻底掌控你的感官"},',
                '  {"rarity": "SR", "icon": "💆", "title": "专属按摩", "content": "他会一边嫌弃你笨，一边温柔地帮你揉开酸痛的肩膀"},',
                '  {"rarity": "R", "icon": "🤗", "title": "摸头券", "content": "你可以随时兑换一次他认认真真的摸头杀"}',
                ']}'
            ].join('\n'),
            userMessage: [
                '请结合以下角色的具体人设与近期记忆，生成专门为“我”准备的专属互动礼物池（总共 50 条卡片）：',
                contextText,
                '请严格只输出纯 JSON，不要包含 Markdown 标记（```json 等）。'
            ].join('\n\n')
        };
    }

    function getGiftPoolRepairPrompt(roleId, rawText) {
        return {
            systemPrompt: [
                '你是一个礼物池 JSON 修复器。',
                '你的唯一任务：把输入内容修复成严格可解析的 JSON。',
                '只允许输出如下格式：{"cards":[...]}',
                '不要输出 Markdown，不要解释，不要加前后缀文字。',
                '每张卡尽量保留 rarity、icon、title、content 四个字段。',
                '如果输入完全无法识别，就输出 {"cards": []}'
            ].join('\n'),
            userMessage: [
                '请把下面的原始内容修复成严格 JSON。',
                `[原始内容]\n${String(rawText || '')}`,
                '只输出 JSON。'
            ].join('\n\n')
        };
    }

    function formatGiftPoolTime(ts) {
        const n = Number(ts);
        if (!Number.isFinite(n) || n <= 0) return '';
        const d = new Date(n);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    }

    function escapeGiftPoolHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function setGiftPoolModalCallback(cb) {
        runtime.giftPoolModalCallback = typeof cb === 'function' ? cb : null;
    }

    function ensureGiftPoolModal() {
        let mask = document.getElementById('gift-pool-modal-mask');
        if (mask) {
            if (!mask.__giftMaskBound) {
                mask.__giftMaskBound = true;
                mask.addEventListener('click', function (e) {
                    if (e && e.target === mask) closeGiftPoolModal();
                });
            }
            return mask;
        }
        const root = document.getElementById('wallet-view') || document.body;
        if (!root) return null;
        mask = document.createElement('div');
        mask.id = 'gift-pool-modal-mask';
        mask.className = 'gift-pool-modal-mask';
        mask.style.display = 'none';
        mask.innerHTML = `
            <div class="gift-pool-modal-card" role="dialog" aria-modal="true">
                <button type="button" class="gift-pool-modal-close" aria-label="关闭">✕</button>
                <div class="gift-pool-modal-icon"><i class='bx bx-heart'></i></div>
                <div class="gift-pool-modal-title"></div>
                <div class="gift-pool-modal-desc"></div>
                <button type="button" class="gift-pool-modal-ok">知道了</button>
            </div>
        `;
        root.appendChild(mask);
        mask.__giftMaskBound = true;
        mask.addEventListener('click', function (e) {
            if (e && e.target === mask) closeGiftPoolModal();
        });
        return mask;
    }

    function openGiftPoolModal(options) {
        const mask = ensureGiftPoolModal();
        if (!mask) return;
        const opts = options && typeof options === 'object' ? options : {};
        const titleEl = mask.querySelector('.gift-pool-modal-title');
        const descEl = mask.querySelector('.gift-pool-modal-desc');
        const okBtn = mask.querySelector('.gift-pool-modal-ok');
        const closeBtn = mask.querySelector('.gift-pool-modal-close');
        const iconEl = mask.querySelector('.gift-pool-modal-icon');
        if (titleEl) titleEl.textContent = String(opts.title || '');
        if (descEl) descEl.textContent = String(opts.desc || '');
        if (okBtn) okBtn.textContent = String(opts.okText || '知道了');
        if (iconEl) {
            iconEl.innerHTML = opts.iconHtml || "<i class='bx bx-heart'></i>";
        }
        setGiftPoolModalCallback(opts.onOk);
        mask.style.display = 'flex';
        if (okBtn && !okBtn.__giftBound) {
            okBtn.__giftBound = true;
            okBtn.addEventListener('click', function () {
                const cb = runtime.giftPoolModalCallback;
                closeGiftPoolModal();
                if (typeof cb === 'function') cb();
            });
        }
        if (closeBtn && !closeBtn.__giftBound) {
            closeBtn.__giftBound = true;
            closeBtn.addEventListener('click', closeGiftPoolModal);
        }
    }

    function closeGiftPoolModal() {
        const mask = document.getElementById('gift-pool-modal-mask');
        setGiftPoolModalCallback(null);
        runtime.giftPoolModalMode = '';
        if (mask) mask.style.display = 'none';
    }

    function setGiftPoolLoading(roleId, loading) {
        const rid = String(roleId || '').trim();
        runtime.giftPoolLoadingRoleId = loading ? rid : '';
        refreshGiftViews(rid);
    }

    function showGiftPoolAskModal(roleId) {
        const rid = String(roleId || '').trim();
        const display = rid ? getDisplayName(rid) : 'TA';
        openGiftPoolModal({
            title: '去获得',
            desc: `要与【${display}】聊天才能继续获得哦~ 每聊天十句获得一抽`,
            okText: '知道了',
            iconHtml: "<i class='bx bx-heart'></i>"
        });
    }

    function showGiftPoolSuccessModal(roleId, count) {
        const rid = String(roleId || '').trim();
        const display = rid ? getDisplayName(rid) : '礼物池';
        const total = clampNumber(count, 1, 999, 50);
        openGiftPoolModal({
            title: '生成成功',
            desc: `${display} 的礼物池已经生成完成，${String(total)} 个卡片已静静躺好，可以开始抽取了。`,
            okText: '开始抽取',
            iconHtml: "<i class='bx bx-check-circle'></i>"
        });
    }

    function renderGiftPoolHistorySection(title, rarity, items) {
        const list = Array.isArray(items) ? items : [];
        const rendered = list.slice().reverse().map(function (item) {
            const rarityText = normalizeGiftPoolRarity(item && item.rarity, rarity);
            const itemTitle = String(item && item.title || '').trim() || '未命名词条';
            const itemContent = String(item && item.content || '').trim();
            const note = String(item && item.note || '').trim();
            const timeText = formatGiftPoolTime(item && item.drawnAt);
            const iconText = String(item && item.icon || '🎁').trim();
            return `
                <div class="history-item ${rarityText.toLowerCase()}-item gift-pool-owned-card" data-gift-card-id="${escapeGiftPoolHtml(String(item && item.id || ''))}" data-gift-rarity="${escapeGiftPoolHtml(rarityText)}" style="cursor: pointer; text-align: left; width: 100%; border: none;">
                    <div class="history-icon" style="font-size: 20px;">${escapeGiftPoolHtml(iconText)}</div>
                    <div class="history-info" style="flex: 1;">
                        <div class="history-name" style="font-size: 13px; color: var(--parchment); margin-bottom: 2px;">${escapeGiftPoolHtml(itemTitle)}</div>
                        <div class="history-rarity" style="font-size: 10px;">${escapeGiftPoolHtml(rarityText)}</div>
                    </div>
                    ${timeText ? `<div class="history-time" style="font-size: 10px; color: rgba(253,245,232,.25);">${escapeGiftPoolHtml(timeText)}</div>` : ''}
                </div>
            `;
        }).join('');
        return rendered;
    }

    function renderGiftPoolShell(roleId, state) {
        const display = roleId ? getDisplayName(roleId) : '礼物池';
        const loading = runtime.giftPoolLoadingRoleId && String(runtime.giftPoolLoadingRoleId).trim() === String(roleId || '').trim();
        const debugMode = giftPoolDebugEnabled();
        const hasCards = flattenGiftPoolCards(state).length > 0;
        const generationState = state.generatedAt ? `已生成 ${String(clampNumber(state.totalGenerated, 0, 999, 0) || flattenGiftPoolCards(state).length)} 条` : '还没有生成礼物池';
        const askText = `要与【${display}】聊天才能继续获得哦~ 每聊天十句获得一抽`;
        const history = state.history || { SSR: [], SR: [], R: [] };
        return `
            <div class="gift-pool-shell container">
                <div class="header">
                    <div class="header-subtitle">Limited Card Pool</div>
                    <div class="header-title">${escapeGiftPoolHtml(display)}的<span>礼物</span>池</div>
                    <div class="header-desc">每一张，都是他给你的</div>
                </div>
                <div class="currency-bar">
                    <div class="currency-left">
                        <div class="currency-icon">🌸</div>
                        <div class="currency-info">
                            <div class="currency-label">心动券</div>
                            <div class="currency-amount">${giftPoolDebugEnabled() ? '∞' : String(clampNumber(state.tickets, 0, 999999, 20))}</div>
                        </div>
                    </div>
                    <button type="button" class="ask-btn" data-gift-action="ask">向${escapeGiftPoolHtml(display)}要 →</button>
                </div>
                <div class="rates">
                    <div class="rate-badge ssr"><div class="rate-name">SSR</div><div class="rate-pct">1.5%</div></div>
                    <div class="rate-badge sr"><div class="rate-name">SR</div><div class="rate-pct">13.5%</div></div>
                    <div class="rate-badge r"><div class="rate-name">R</div><div class="rate-pct">85%</div></div>
                </div>
                <div class="pull-section">
                    <button type="button" class="pull-btn single ${loading ? 'is-loading' : ''}" data-gift-action="generate" ${loading ? 'disabled' : ''}>
                        <div class="pull-btn-title">${loading ? '生成中…' : '生成卡片'}</div>
                        <div class="pull-btn-cost"><span>${escapeGiftPoolHtml(generationState)}</span></div>
                    </button>
                    <button type="button" class="pull-btn single" data-gift-action="draw-one" ${(!hasCards || loading || (!debugMode && state.tickets <= 0)) ? 'disabled' : ''}>
                        <div class="pull-btn-title">单抽</div>
                        <div class="pull-btn-cost">消耗 <span>1</span> 券</div>
                    </button>
                    <button type="button" class="pull-btn ten" data-gift-action="draw-ten" ${(!hasCards || loading || (!debugMode && state.tickets <= 10)) ? 'disabled' : ''}>
                        <div class="pull-btn-title">十连抽</div>
                        <div class="pull-btn-cost">消耗 <span>10</span> 券</div>
                    </button>
                </div>
                <div class="history-section">
                    <div class="section-title">已抽到的卡片</div>
                    <div class="gift-pool-history-list">
                        ${renderGiftPoolHistorySection('SSR', 'SSR', history.SSR || [])}
                        ${renderGiftPoolHistorySection('SR', 'SR', history.SR || [])}
                        ${renderGiftPoolHistorySection('R', 'R', history.R || [])}
                    </div>
                </div>
            </div>
        `;
    }

    function getRoleGiftCabinetItems(roleId) {
        const id = String(roleId || '').trim();
        if (!id) return [];
        const profiles = getProfiles();
        const p = profiles[id] && typeof profiles[id] === 'object' ? profiles[id] : {};
        return Array.isArray(p.gift_cabinet) ? p.gift_cabinet.slice() : [];
    }

    function renderGiftCabinetCards(roleId) {
        const gifts = getRoleGiftCabinetItems(roleId);
        if (!gifts.length) return '';
        return gifts.slice().reverse().map(function (gift, reverseIndex) {
            const item = gift && typeof gift === 'object' ? gift : {};
            const icon = String(item.icon || '🎁').trim() || '🎁';
            const desc = String(item.description || item.name || '').trim();
            const sourceIndex = gifts.length - 1 - reverseIndex;
            return `
                <button type="button" class="gift-cabinet-card" data-gift-index="${String(sourceIndex)}">
                    <div class="gift-cabinet-card-icon">${escapeGiftPoolHtml(icon)}</div>
                    <div class="gift-cabinet-card-desc">${escapeGiftPoolHtml(desc || '一份小礼物')}</div>
                </button>
            `;
        }).join('');
    }

    function ensureGiftPoolPageUI() {
        let page = document.getElementById('gift-pool-page');
        if (page) return page;
        const walletView = document.getElementById('wallet-view');
        if (!walletView) return null;
        page = document.createElement('div');
        page.id = 'gift-pool-page';
        page.className = 'gift-cabinet-fs gift-pool-page';
        page.style.display = 'none';
        page.innerHTML = `
            <div class="gift-cabinet-fs-header gift-pool-page-header">
                <button id="gift-pool-page-profile" type="button" class="gift-cabinet-profile-btn gift-pool-page-profile" aria-label="选择角色">
                    <img id="gift-pool-page-avatar" class="gift-cabinet-fs-avatar gift-pool-page-avatar" alt="">
                    <span class="gift-cabinet-fs-switch gift-pool-page-switch" aria-hidden="true">▾</span>
                </button>
                <div id="gift-pool-page-title" class="gift-cabinet-fs-title gift-pool-page-title">礼物池</div>
                <button id="gift-pool-page-close" type="button" class="gift-cabinet-fs-close gift-pool-page-close" aria-label="关闭">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div class="gift-cabinet-fs-body gift-pool-page-body">
                <div id="gift-pool-page-content" class="gift-pool-page-content"></div>
            </div>
        `;
        walletView.appendChild(page);
        page.addEventListener('click', function (e) {
            const target = e && e.target ? e.target : null;
            if (!target) return;
            const closeBtn = target.closest ? target.closest('#gift-pool-page-close') : null;
            if (closeBtn) {
                closeGiftPoolPage();
                return;
            }
            const profileBtn = target.closest ? target.closest('#gift-pool-page-profile') : null;
            if (profileBtn) {
                openGiftRolePicker();
                return;
            }
            const card = target.closest ? target.closest('.gift-pool-owned-card') : null;
            if (card) {
                const cardId = card.getAttribute('data-gift-card-id') || '';
                const roleId = String(runtime.cabinetRoleId || window.currentCharacterId || window.currentChatRole || '').trim();
                const item = findGiftPoolHistoryCard(roleId, cardId);
                if (item) {
                    openGiftDetail({
                        icon: item.rarity || '🎁',
                        name: item.title || '词条',
                        description: item.content || ''
                    });
                }
                return;
            }
            const actionBtn = target.closest ? target.closest('[data-gift-action]') : null;
            if (!actionBtn) return;
            const action = actionBtn.getAttribute('data-gift-action') || '';
            if (!action) return;
            handleGiftPoolAction(action);
        });
        return page;
    }

    function renderGiftPoolPage(roleId) {
        const page = ensureGiftPoolPageUI();
        if (!page) return;
        const id = getCabinetRoleId(roleId);
        setCabinetRoleId(id);
        const avatarEl = document.getElementById('gift-pool-page-avatar');
        const titleEl = document.getElementById('gift-pool-page-title');
        const contentEl = document.getElementById('gift-pool-page-content');
        const profiles = getProfiles();
        const p = profiles[id] && typeof profiles[id] === 'object' ? profiles[id] : {};
        const bg = typeof p.gift_cabinet_bg === 'string' ? p.gift_cabinet_bg.trim() : '';
        const bgLayer = bg
            ? `linear-gradient(180deg, rgba(26, 8, 14, 0.84), rgba(12, 4, 9, 0.94)), url("${bg}")`
            : 'linear-gradient(180deg, rgba(44, 10, 24, 0.98), rgba(12, 4, 8, 1))';
        page.style.backgroundImage = bgLayer;
        if (avatarEl) avatarEl.src = id ? getAvatar(id) : 'assets/chushitouxiang.jpg';
        if (titleEl) titleEl.textContent = id ? `【${getDisplayName(id)}】的礼物池` : '礼物池';
        if (contentEl) {
            const pool = getRoleGiftPoolState(id);
            if (!pool.totalGenerated) {
                const maybeFlat = flattenGiftPoolCards(pool);
                pool.totalGenerated = maybeFlat.length;
            }
            contentEl.innerHTML = renderGiftPoolShell(id, pool);
        }
    }

    function openGiftPoolPage(preferredRoleId) {
        const wasWalletVisible = getWalletVisible();
        try {
            if (window.Wallet && typeof window.Wallet.open === 'function') {
                window.Wallet.open();
            }
        } catch (e) { }
        const page = ensureGiftPoolPageUI();
        if (!page) return;
        runtime.giftPoolPrevWalletVisible = wasWalletVisible;
        runtime.giftPoolPageOpen = true;
        const roleId = getCabinetRoleId(preferredRoleId || window.currentChatRole || window.currentCharacterId || '');
        try {
            const pool = getRoleGiftPoolState(roleId);
            if (pool && pool.chatTrackingStarted !== true) {
                pool.chatTrackingStarted = true;
                saveRoleGiftPoolState(roleId, pool);
            }
        } catch (e) { }
        renderGiftPoolPage(roleId);
        page.style.display = 'flex';
        requestAnimationFrame(function () {
            page.classList.add('show');
        });
    }

    function closeGiftPoolPage() {
        const page = document.getElementById('gift-pool-page');
        runtime.giftPoolPageOpen = false;
        if (page) {
            page.classList.remove('show');
            window.setTimeout(function () {
                if (!runtime.giftPoolPageOpen && page) page.style.display = 'none';
            }, 180);
        }
        const shouldCloseWallet = !runtime.giftPoolPrevWalletVisible;
        runtime.giftPoolPrevWalletVisible = false;
        if (shouldCloseWallet) {
            try {
                if (window.Wallet && typeof window.Wallet.close === 'function') {
                    window.Wallet.close();
                }
            } catch (e) { }
        }
    }

    function getRoleWorkReportHistory(roleId) {
        const profiles = getProfiles();
        const p = profiles[roleId] || {};
        const arr = Array.isArray(p.work_report_history) ? p.work_report_history : [];
        const out = [];
        for (let i = 0; i < arr.length; i++) {
            const r = arr[i] && typeof arr[i] === 'object' ? arr[i] : null;
            if (!r) continue;
            const jobName = typeof r.job_name === 'string' ? r.job_name.trim() : '';
            const diary = typeof r.diary === 'string' ? r.diary.trim() : '';
            const giftRaw = r.gift && typeof r.gift === 'object' ? r.gift : {};
            const giftName = typeof giftRaw.name === 'string' ? giftRaw.name.trim() : '';
            const giftIcon = typeof giftRaw.icon === 'string' ? giftRaw.icon.trim() : '';
            const giftDesc = typeof giftRaw.description === 'string' ? giftRaw.description.trim() : '';
            if (!jobName || !diary || !giftName) continue;
            out.push({
                job_name: jobName,
                diary: diary,
                gift: { name: giftName, icon: giftIcon || '🎁', description: giftDesc || '' },
                at: clampNumber(r.at, 0, Number.MAX_SAFE_INTEGER, 0)
            });
        }
        return out;
    }

    function pushRoleWorkReportHistory(roleId, report) {
        if (!roleId || !report || typeof report !== 'object') return;
        const jobName = typeof report.job_name === 'string' ? report.job_name.trim() : '';
        const diary = typeof report.diary === 'string' ? report.diary.trim() : '';
        const giftRaw = report.gift && typeof report.gift === 'object' ? report.gift : null;
        const giftName = giftRaw && typeof giftRaw.name === 'string' ? giftRaw.name.trim() : '';
        if (!jobName || !diary || !giftName) return;
        const profiles = getProfiles();
        const p = profiles[roleId] && typeof profiles[roleId] === 'object' ? profiles[roleId] : {};
        const arr = Array.isArray(p.work_report_history) ? p.work_report_history : [];
        arr.push({
            at: Date.now(),
            job_name: jobName,
            diary: diary,
            gift: {
                name: giftName,
                icon: (giftRaw && typeof giftRaw.icon === 'string' && giftRaw.icon.trim()) ? giftRaw.icon.trim() : '🎁',
                description: (giftRaw && typeof giftRaw.description === 'string') ? giftRaw.description.trim() : ''
            }
        });
        p.work_report_history = arr.slice(-120);
        profiles[roleId] = p;
        saveProfiles(profiles);
    }

    function getRoleIds() {
        const profiles = getProfiles();
        return Object.keys(profiles).filter(function (id) {
            const p = profiles[id];
            if (!p || typeof p !== 'object') return false;
            if (p.isGroup) return false;
            return true;
        });
    }

    function getDisplayName(roleId) {
        const profiles = getProfiles();
        const p = profiles[roleId] || {};
        return (p.remark || p.nickName || p.name || roleId || '').toString();
    }

    function getAvatar(roleId) {
        const profiles = getProfiles();
        const p = profiles[roleId] || {};
        return (p.avatar || 'assets/chushitouxiang.jpg').toString();
    }

    function normalizeWorkData(raw) {
        const d = raw && typeof raw === 'object' ? raw : {};
        const status = (d.status === 'idle' || d.status === 'working' || d.status === 'finished') ? d.status : 'idle';
        const stamina = clampNumber(d.stamina, 0, 100, 100);
        const mood = clampNumber(d.mood, 0, 100, 100);
        const goodLuck = clampNumber(d.goodLuck, 0, 100, 0);
        const luckMultiplierPending = clampNumber(d.luckMultiplierPending, 1, 3, 1);
        const luckBoostTextPending = typeof d.luckBoostTextPending === 'string' ? d.luckBoostTextPending : '';
        const startTime = clampNumber(d.startTime, 0, Number.MAX_SAFE_INTEGER, 0);
        const duration = clampNumber(d.duration, 0, Number.MAX_SAFE_INTEGER, 0);
        const currentJob = d.currentJob && typeof d.currentJob === 'object' ? d.currentJob : null;
        const workReportStatus = (d.workReportStatus === 'idle' || d.workReportStatus === 'loading' || d.workReportStatus === 'ready' || d.workReportStatus === 'error') ? d.workReportStatus : 'idle';
        const workAssignedJob = typeof d.workAssignedJob === 'string' ? d.workAssignedJob : '';
        const workReportAt = clampNumber(d.workReportAt, 0, Number.MAX_SAFE_INTEGER, 0);
        const workReport = d.workReport && typeof d.workReport === 'object' ? d.workReport : null;
        const totalEarned = clampNumber(d.totalEarned, 0, Number.MAX_SAFE_INTEGER, 0);
        return { status, stamina, mood, goodLuck, luckMultiplierPending, luckBoostTextPending, currentJob, startTime, duration, totalEarned, workReportStatus, workAssignedJob, workReportAt, workReport };
    }

    function ensureRoleWorkData(roleId) {
        const s = ensureStore();
        if (!s.roles[roleId]) {
            s.roles[roleId] = normalizeWorkData(null);
            saveStore();
        } else {
            s.roles[roleId] = normalizeWorkData(s.roles[roleId]);
        }
        return s.roles[roleId];
    }

    function personaTextForRole(roleId) {
        const profiles = getProfiles();
        const p = profiles[roleId] || {};
        const parts = [];
        if (typeof p.desc === 'string' && p.desc.trim()) parts.push(p.desc.trim());
        if (typeof p.style === 'string' && p.style.trim()) parts.push(p.style.trim());
        if (typeof p.schedule === 'string' && p.schedule.trim()) parts.push(p.schedule.trim());
        return parts.join('\n');
    }

    function readWorldBooksSnapshot() {
        const wb = window.worldBooks && typeof window.worldBooks === 'object' ? window.worldBooks : null;
        if (wb && Object.keys(wb).length > 0) return wb;
        const raw = localStorage.getItem('wechat_worldbooks');
        const parsed = raw ? safeParse(raw, {}) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    }

    function worldbookTextForRole(roleId) {
        const profiles = getProfiles();
        const p = profiles[roleId] || {};
        let wbIds = p.worldbookId || [];
        if (typeof wbIds === 'string') {
            wbIds = wbIds ? [wbIds] : [];
        }
        if (!wbIds.length) return '';
        
        const books = readWorldBooksSnapshot();
        const parts = [];
        
        wbIds.forEach(id => {
            const worldbookId = String(id || '').trim();
            if (!worldbookId) return;

            if (worldbookId.indexOf('CATEGORY:') === 0 || worldbookId.indexOf('cat:') === 0) {
                const cat = worldbookId.includes(':') ? worldbookId.split(':')[1].trim() : worldbookId;
                if (!cat) return;
                Object.keys(books).forEach(function (bid) {
                    const b = books[bid];
                    if (!b || typeof b !== 'object') return;
                    if (String(b.category || '').trim() !== cat) return;
                    const title = typeof b.title === 'string' ? b.title.trim() : '';
                    const content = typeof b.content === 'string' ? b.content.trim() : '';
                    if (title) parts.push(title);
                    if (content) parts.push(content);
                });
            } else {
                const book = books[worldbookId];
                if (!book || typeof book !== 'object') return;
                const title = typeof book.title === 'string' ? book.title.trim() : '';
                const content = typeof book.content === 'string' ? book.content.trim() : '';
                if (title) parts.push(title);
                if (content) parts.push(content);
            }
        });
        
        return parts.join('\n');
    }

    function contextTextForRole(roleId) {
        const persona = personaTextForRole(roleId);
        const wb = worldbookTextForRole(roleId);
        if (persona && wb) return persona + '\n' + wb;
        return persona || wb || '';
    }

    function scoreJobAgainstPersona(job, personaText) {
        const text = (personaText || '').toString();
        if (!text) return 0;
        const tags = Array.isArray(job.tags) ? job.tags : [];
        let score = 0;
        tags.forEach(function (tag) {
            if (!tag) return;
            const t = String(tag);
            if (!t) return;
            if (text.indexOf(t) !== -1) score += 1;
        });
        return score;
    }

    function hashToPositiveInt(text) {
        const s = String(text || '');
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return Math.abs(h >>> 0);
    }

    function pickStableJob(roleId, contextText) {
        if (!jobs || jobs.length === 0) return null;
        const seed = hashToPositiveInt(String(roleId || '') + '|' + String(contextText || ''));
        return jobs[seed % jobs.length] || jobs[0];
    }

    function findBestJob(roleId) {
        const text = contextTextForRole(roleId);
        const kwJob = pickJobByKeywords(text);
        if (kwJob) return { job: kwJob, score: 999 };
        let best = null;
        let bestScore = -1;
        jobs.forEach(function (job) {
            const s = scoreJobAgainstPersona(job, text);
            if (s > bestScore) {
                bestScore = s;
                best = job;
                return;
            }
            if (s > 0 && s === bestScore && best && job.baseReward > best.baseReward) {
                best = job;
            }
        });
        if (!best || bestScore <= 0) {
            const fallback = pickStableJob(roleId, text);
            return { job: fallback || jobs[0], score: 0 };
        }
        return { job: best, score: Math.max(0, bestScore) };
    }

    function getJobById(jobId) {
        if (!jobId) return null;
        for (let i = 0; i < jobs.length; i++) {
            const j = jobs[i];
            if (j && j.id === jobId) return j;
        }
        return null;
    }

    function pickJobByKeywords(contextText) {
        const text = (contextText || '').toString();
        if (!text) return null;
        const rules = [
            { keys: ['魔法', '法术', '巫师', '魔女', '咒文'], jobId: 'apothecary' },
            { keys: ['炼金', '药剂', '药水'], jobId: 'apothecary' },
            { keys: ['骑士', '王国', '侍从', '誓约'], jobId: 'knight_squire' },
            { keys: ['管家', '宅邸', '女仆', '礼仪'], jobId: 'maid' },
            { keys: ['偶像', '舞台', '应援', '练习生'], jobId: 'idol' },
            { keys: ['配音', '声优', '旁白'], jobId: 'voice' },
            { keys: ['摄影', '镜头', '棚拍', '修图'], jobId: 'studio' },
            { keys: ['剪辑', '后期'], jobId: 'video_cut' },
            { keys: ['插画', '画画', '绘画', '美术'], jobId: 'illustrator' },
            { keys: ['设计', '排版', '海报', '字体'], jobId: 'designer' },
            { keys: ['程序', '代码', '开发', '脚本'], jobId: 'dev_helper' },
            { keys: ['测试', 'Bug', '缺陷'], jobId: 'qa' },
            { keys: ['护士', '护理'], jobId: 'nurse_aide' },
            { keys: ['医生', '医院', '诊所'], jobId: 'clinic' },
            { keys: ['实验', '研究', '论文', '科研'], jobId: 'lab' },
            { keys: ['猫', '喵'], jobId: 'cat_sitter' },
            { keys: ['狗', '汪'], jobId: 'dog_walk' },
            { keys: ['花', '植物', '园艺'], jobId: 'flower' },
            { keys: ['咖啡', '手冲', '拉花'], jobId: 'barista' },
            { keys: ['烘焙', '面包', '甜品'], jobId: 'bakery' },
            { keys: ['文字', '写作', '文案'], jobId: 'copywriter' },
            { keys: ['翻译', '校对'], jobId: 'translator' },
            { keys: ['整理', '收纳', '强迫症'], jobId: 'cleaning' },
            { keys: ['导览', '旅行', '路线'], jobId: 'tour' },
        ];

        for (let i = 0; i < rules.length; i++) {
            const r = rules[i];
            const keys = Array.isArray(r.keys) ? r.keys : [];
            for (let k = 0; k < keys.length; k++) {
                const kw = String(keys[k] || '').trim();
                if (!kw) continue;
                if (text.indexOf(kw) !== -1) {
                    return getJobById(r.jobId);
                }
            }
        }
        return null;
    }

    async function requestAICustomJob(roleId, contextText) {
        const baseUrlRaw = localStorage.getItem('api_base_url');
        const apiKey = localStorage.getItem('user_api_key');
        if (!baseUrlRaw || !apiKey) return null;
        const model = localStorage.getItem('selected_model') || "deepseek-chat";
        const temperature = parseFloat(localStorage.getItem('model_temperature')) || 0.7;

        let endpoint = baseUrlRaw.trim();
        if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
        if (!endpoint.includes('/chat/completions')) {
            if (!endpoint.includes('/v1')) endpoint += '/v1';
            endpoint += '/chat/completions';
        }

        const profile = getProfiles()[roleId] || {};
        const roleName = getDisplayName(roleId);
        const persona = personaTextForRole(roleId);
        const wb = worldbookTextForRole(roleId);
        const ctx = String(contextText || '').trim() || [persona, wb].filter(Boolean).join('\n');
        if (!ctx) return null;

        const systemPrompt = [
            '你是一个“角色经营/打工系统”的工作生成器。',
            '目标：为指定角色生成一个符合其人设、世界观的兼职/副业/短期任务。',
            '要求：不要从任何既有职业列表里挑选；请原创一个具体的工作名称。',
            '输出：只输出严格 JSON，不要包含多余文本，不要代码块。',
            '字段：',
            'name: string (工作名称，中文，10字以内)',
            'emoji: string (一个emoji)',
            'tags: string[] (3-6个，中文关键词)',
            'durationHours: number (1-12)',
            'baseReward: number (50-800)'
        ].join('\n');

        const userPrompt = [
            `角色名：${roleName}`,
            '角色设定与世界观：',
            ctx
        ].join('\n');

        let resp;
        try {
            resp = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: model,
                    temperature: temperature,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                })
            });
        } catch (e) {
            return null;
        }
        if (!resp || !resp.ok) return null;

        let json;
        try {
            json = await resp.json();
        } catch (e) {
            return null;
        }
        const content = json && json.choices && json.choices[0] && json.choices[0].message ? json.choices[0].message.content : '';
        let parsed = content ? safeParse(content, null) : null;
        if (!parsed && content) {
            const m = String(content).match(/\{[\s\S]*\}/);
            if (m && m[0]) parsed = safeParse(m[0], null);
        }
        if (!parsed || typeof parsed !== 'object') return null;

        const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
        const emoji = typeof parsed.emoji === 'string' ? parsed.emoji.trim() : '';
        const tags = Array.isArray(parsed.tags) ? parsed.tags.map(function (t) { return String(t || '').trim(); }).filter(Boolean).slice(0, 6) : [];
        const durationHours = clampNumber(parsed.durationHours, 1, 12, 6);
        const baseReward = clampNumber(parsed.baseReward, 50, 800, 260);
        if (!name) return null;

        return {
            id: 'ai_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
            name: name,
            emoji: emoji || '🧾',
            tags: tags.length ? tags : ['临时', '兼职', '任务'],
            duration: Math.round(durationHours * 60 * 60 * 1000),
            baseReward: Math.round(baseReward)
        };
    }

    function getWorkReportApiConfig() {
        const baseUrlRaw = localStorage.getItem('api_base_url');
        const apiKey = localStorage.getItem('user_api_key');
        if (!baseUrlRaw || !apiKey) return null;
        const model = localStorage.getItem('selected_model') || "deepseek-chat";
        const temperature = parseFloat(localStorage.getItem('model_temperature')) || 0.7;
        let endpoint = baseUrlRaw.trim();
        if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
        if (!endpoint.includes('/chat/completions')) {
            if (!endpoint.includes('/v1')) endpoint += '/v1';
            endpoint += '/chat/completions';
        }
        return { endpoint, apiKey, model, temperature };
    }

    function buildCharacterSettings(roleId) {
        const profiles = getProfiles();
        const p = profiles[roleId] || {};
        const roleName = getDisplayName(roleId);
        const persona = typeof p.persona === 'string' ? p.persona.trim() : '';
        const desc = typeof p.desc === 'string' ? p.desc.trim() : '';
        const style = typeof p.style === 'string' ? p.style.trim() : '';
        const speakingStyle = typeof p.speakingStyle === 'string' ? p.speakingStyle.trim() : '';
        const schedule = typeof p.schedule === 'string' ? p.schedule.trim() : '';
        return [
            `角色名：${roleName}`,
            persona ? `角色设定：${persona}` : '',
            desc ? `补充描述：${desc}` : '',
            style ? `性格/风格标签：${style}` : '',
            speakingStyle ? `口吻与说话方式：${speakingStyle}` : '',
            schedule ? `作息与习惯：${schedule}` : ''
        ].filter(Boolean).join('\n');
    }

    function buildWorldbookOrDefault(roleId) {
        const wb = worldbookTextForRole(roleId);
        return wb && wb.trim() ? wb.trim() : '现代日常';
    }

    function extractFirstJsonObject(text) {
        const raw = String(text || '').trim();
        if (!raw) return '';
        let s = raw;
        if (s.includes('```')) {
            s = s.replace(/```json/gi, '').replace(/```/g, '').trim();
        }
        const first = s.indexOf('{');
        const last = s.lastIndexOf('}');
        if (first >= 0 && last > first) return s.slice(first, last + 1);
        return s;
    }

    function normalizeJobFit(value) {
        const t = String(value || '').trim();
        if (t === '喜欢' || t === '一般' || t === '讨厌') return t;
        if (t.indexOf('喜') !== -1) return '喜欢';
        if (t.indexOf('厌') !== -1) return '讨厌';
        return '一般';
    }

    function normalizeWorkReport(obj) {
        if (!obj || typeof obj !== 'object') return null;
        const jobName = typeof obj.job_name === 'string' ? obj.job_name.trim() : '';
        const diary = typeof obj.diary === 'string' ? obj.diary.trim() : '';
        const jobFit = normalizeJobFit(obj.job_fit);
        const giftRaw = obj.gift && typeof obj.gift === 'object' ? obj.gift : {};
        const giftName = typeof giftRaw.name === 'string' ? giftRaw.name.trim() : '';
        const giftIcon = typeof giftRaw.icon === 'string' ? giftRaw.icon.trim() : '';
        const giftDesc = typeof giftRaw.description === 'string' ? giftRaw.description.trim() : '';
        if (!jobName || !diary || !giftName) return null;
        return {
            job_name: jobName,
            job_fit: jobFit,
            diary: diary,
            gift: {
                name: giftName,
                icon: giftIcon || '🎁',
                description: giftDesc || ''
            }
        };
    }

    function normalizeJobNameForCompare(name) {
        return String(name || '')
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[【】\[\]（）(){}<>《》"'“”‘’`·•\-_—=+|\\/:;；,，.。!?！？、]/g, '')
            .trim();
    }

    function isJobNameInHistory(jobName, jobHistory) {
        const n = normalizeJobNameForCompare(jobName);
        if (!n) return false;
        const arr = Array.isArray(jobHistory) ? jobHistory : [];
        for (let i = 0; i < arr.length; i++) {
            const h = normalizeJobNameForCompare(arr[i]);
            if (h && h === n) return true;
        }
        return false;
    }

    function buildWorkReportSystemPrompt(characterSettings, worldbook, jobHistory, assignedJob) {
        const args = Array.prototype.slice.call(arguments, 4);
        const recentGiftNames = Array.isArray(args[0]) ? args[0].filter(Boolean).slice(-18) : [];
        const recentDiarySnippets = Array.isArray(args[1]) ? args[1].filter(Boolean).slice(-10) : [];
        const inspiration = typeof args[2] === 'string' ? args[2].trim() : '';
        if (typeof window.buildRoleJsonTaskPrompt === 'function') {
            return window.buildRoleJsonTaskPrompt('work_report_generation', '', {
                sceneIntro: '当前场景是角色打工日报与伴手礼生成。',
                taskGuidance: [
                    '请根据【角色设定】、【世界书】和【历史兼职】，决定今天的打工内容，并生成日记与伴手礼。',
                    '',
                    '【输入信息】',
                    `- 角色设定（包含性格、本职、爱好）：${characterSettings}`,
                    `- 世界书：${worldbook}`,
                    `- 历史兼职记录：${JSON.stringify(jobHistory || [])}`,
                    `- 安排的职业：${assignedJob}`,
                    recentGiftNames.length ? `- 最近带回的伴手礼名（必须避开重复）：${JSON.stringify(recentGiftNames)}` : '',
                    recentDiarySnippets.length ? `- 最近打工小记片段（必须避开重复）：${JSON.stringify(recentDiarySnippets)}` : '',
                    inspiration ? `- 今日灵感词（请融入具体细节）：${inspiration}` : '',
                    '',
                    '【推演规则（当安排的职业为空时必须遵守）】',
                    '1. 必须是现实中合理的兼职/打工/零工，绝对不能是长期全职工作。',
                    '2. 选择依据优先级：角色的爱好相关兼职 > 角色的本职业降级或周边兼职。',
                    '3. 绝对禁止生成与最近10条历史兼职记录中重复的职业。',
                    '4. 即使被安排同一种职业，也必须生成全新的打工小记与全新的伴手礼。',
                    '5. 若安排的职业不为空：job_name 必须与安排职业一致（允许少量修饰，但核心职业必须相同）。',
                    '',
                    '【任务要求】',
                    '1. 打工日记（100字）：第一人称，包含具体工作内容和遇到的插曲。语气必须符合人设。',
                    '2. 专属伴手礼：下班带回的礼物，必须与今天的职业强相关。',
                    '3. 伴手礼 name 不能与最近带回的伴手礼重复；日记要出现新的细节。'
                ].filter(Boolean).join('\n'),
                outputInstructions: '只输出当前任务要求的 JSON：{"job_name":"","job_fit":"","diary":"","gift":{"name":"","icon":"","description":""}}'
            });
        }
        return [
            '你是一个生活在特定世界观下的角色。请根据【角色设定】、【世界书】和【历史兼职】，决定今天的打工内容，并生成日记与伴手礼。',
            '',
            '【输入信息】',
            `- 角色设定（包含性格、本职、爱好）：${characterSettings}`,
            `- 世界书：${worldbook}`,
            `- 历史兼职记录：${JSON.stringify(jobHistory || [])}`,
            `- 安排的职业：${assignedJob}`,
            recentGiftNames.length ? `- 最近带回的伴手礼名（必须避开重复）：${JSON.stringify(recentGiftNames)}` : '',
            recentDiarySnippets.length ? `- 最近打工小记片段（必须避开重复）：${JSON.stringify(recentDiarySnippets)}` : '',
            inspiration ? `- 今日灵感词（请融入具体细节）：${inspiration}` : '',
            '',
            '【推演规则（当安排的职业为空时必须遵守）】',
            '1. 必须是现实中合理的【兼职/打工/零工】（如：家教、发传单、便利店代班、插画接单），绝对不能是需要长期就职的正式全职工作（如：CEO、全职医生、国防部长）。',
            '2. 选择依据优先级：角色的【爱好】相关兼职 > 角色的【本职业】降级或周边兼职。',
            '3. 绝对禁止生成与【最近10条历史兼职记录】中重复的职业。',
            '4. 重要：即使被安排同一种职业，也必须生成“全新的”打工小记与“全新的”伴手礼，避免与最近内容重复。',
            '5. 若【安排的职业】不为空：job_name 必须与安排职业一致（允许少量修饰，但核心职业必须相同）。',
            '',
            '【任务要求】',
            '1. 打工日记（100字）：第一人称，包含具体工作内容和遇到的插曲。语气必须符合人设。',
            '2. 专属伴手礼：下班带回的礼物，必须与今天的职业强相关。',
            '3. 伴手礼的 name 不能与“最近带回的伴手礼名”重复；日记必须出现一个新的插曲/小物件/场景细节，不要复用“最近打工小记片段”的核心意象。',
            '',
            '【输出 JSON 格式】',
            '{',
            '  "job_name": "最终确认的兼职名称",',
            '  "job_fit": "喜欢/一般/讨厌（可选）",',
            '  "diary": "日记正文...",',
            '  "gift": {',
            '    "name": "礼物名",',
            '    "icon": "相关的1个Emoji",',
            '    "description": "第一人称送礼文案"',
            '  }',
            '}'
        ].join('\n');
    }

    async function requestAIWorkReport(roleId, assignedJobName) {
        const cfg = getWorkReportApiConfig();
        if (!cfg) return null;
        const characterSettings = buildCharacterSettings(roleId);
        const worldbook = buildWorldbookOrDefault(roleId);
        const assignedJob = String(assignedJobName || '').trim();
        const jobHistory = getRoleJobHistory(roleId).slice(-10);
        const recentGiftNames = getRoleRecentGiftNames(roleId, 18);
        const reportHistory = getRoleWorkReportHistory(roleId).slice(-20);
        const recentDiarySnippets = reportHistory.map(function (r) {
            const d = String(r.diary || '').replace(/\s+/g, ' ').trim();
            return d ? d.slice(0, 36) : '';
        }).filter(Boolean).slice(-10);
        const inspirationPool = ['雨声', '霓虹', '纸袋', '薄荷', '票根', '围裙', '风铃', '碎光', '玻璃杯', '热蒸汽', '冰块', '橘子汽水', '旧纸张', '路口的风', '手套', '楼梯间的回声'];
        const inspiration = inspirationPool[Math.floor(Math.random() * inspirationPool.length)];
        const systemPrompt = buildWorkReportSystemPrompt(characterSettings, worldbook, jobHistory, assignedJob, recentGiftNames, recentDiarySnippets, inspiration);

        const doFetch = async function (withJobHistoryParam, userContent) {
            const body = {
                model: cfg.model,
                temperature: cfg.temperature,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent }
                ]
            };
            if (withJobHistoryParam) body.job_history = jobHistory;
            try {
                return await fetch(cfg.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + cfg.apiKey
                    },
                    body: JSON.stringify(body)
                });
            } catch (e) {
                return null;
            }
        };

        function normalizeNameForCompare(name) {
            return String(name || '')
                .toLowerCase()
                .replace(/\s+/g, '')
                .replace(/[【】\[\]（）(){}<>《》"'“”‘’`·•\-_—=+|\\/:;；,，.。!?！？、]/g, '')
                .trim();
        }

        function jobNameMatchesAssigned(jobName, assigned) {
            const j = normalizeNameForCompare(jobName);
            const a = normalizeNameForCompare(assigned);
            if (!a) return true;
            if (!j) return false;
            if (j === a) return true;
            if (j.indexOf(a) !== -1) return true;
            if (a.indexOf(j) !== -1) return true;
            return false;
        }

        const avoidGiftSet = (function () {
            const s = new Set();
            recentGiftNames.forEach(function (x) {
                const n = normalizeNameForCompare(x);
                if (n) s.add(n);
            });
            reportHistory.forEach(function (r) {
                const n = normalizeNameForCompare(r && r.gift ? r.gift.name : '');
                if (n) s.add(n);
            });
            return s;
        })();

        const avoidDiarySet = (function () {
            const s = new Set();
            reportHistory.forEach(function (r) {
                const n = normalizeNameForCompare(r && r.diary ? r.diary : '');
                if (n) s.add(n);
            });
            return s;
        })();

        const attemptMax = 3;
        for (let attempt = 0; attempt < attemptMax; attempt++) {
            const userContent = attempt === 0
                ? '请严格输出 JSON，不要包含任何多余文本。注意：就算职业一样，也要生成全新的日记与全新的礼物，避开最近的重复。'
                : '请重新生成：只输出 JSON；日记必须不同、礼物名必须不同；若安排职业不为空则 job_name 必须一致；安排为空时 job_name 不能与最近10条历史兼职重复。';

            let resp = await doFetch(true, userContent);
            if (!resp || !resp.ok) resp = await doFetch(false, userContent);
            if (!resp || !resp.ok) continue;

            let json;
            try {
                json = await resp.json();
            } catch (e) {
                continue;
            }
            const content = json && json.choices && json.choices[0] && json.choices[0].message ? json.choices[0].message.content : '';
            const jsonText = extractFirstJsonObject(content);
            const parsed = jsonText ? safeParse(jsonText, null) : null;
            const out = normalizeWorkReport(parsed);
            if (!out) continue;
            if (!assignedJob && isJobNameInHistory(out.job_name, jobHistory)) continue;
            if (!jobNameMatchesAssigned(out.job_name, assignedJob)) continue;
            const giftKey = normalizeNameForCompare(out && out.gift ? out.gift.name : '');
            if (giftKey && avoidGiftSet.has(giftKey)) continue;
            const diaryKey = normalizeNameForCompare(out.diary);
            if (diaryKey && avoidDiarySet.has(diaryKey)) continue;
            return out;
        }

        return null;
    }

    function pickUniqueGiftFromPool(pool, avoidSet) {
        const list = Array.isArray(pool) ? pool.filter(Boolean) : [];
        if (!list.length) return null;
        const shuffled = list.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = t;
        }
        for (let k = 0; k < shuffled.length; k++) {
            const g = shuffled[k];
            const nameKey = String(g && g.name ? g.name : '').toLowerCase().replace(/\s+/g, '').replace(/[【】\[\]（）(){}<>《》"'“”‘’`·•\-_—=+|\\/:;；,，.。!?！？、]/g, '').trim();
            if (!nameKey) continue;
            if (avoidSet && avoidSet.has(nameKey)) continue;
            return g;
        }
        return null;
    }

    function fallbackGiftForJob(roleId, jobName, currentJob) {
        const jobId = currentJob && typeof currentJob.id === 'string' ? currentJob.id : '';
        const tone = pickTone(getRolePromptMeta(roleId));
        const avoidSet = new Set();
        getRoleRecentGiftNames(roleId, 24).forEach(function (x) {
            const k = String(x || '').toLowerCase().replace(/\s+/g, '').replace(/[【】\[\]（）(){}<>《》"'“”‘’`·•\-_—=+|\\/:;；,，.。!?！？、]/g, '').trim();
            if (k) avoidSet.add(k);
        });
        getRoleWorkReportHistory(roleId).slice(-30).forEach(function (r) {
            const n = r && r.gift ? r.gift.name : '';
            const k = String(n || '').toLowerCase().replace(/\s+/g, '').replace(/[【】\[\]（）(){}<>《》"'“”‘’`·•\-_—=+|\\/:;；,，.。!?！？、]/g, '').trim();
            if (k) avoidSet.add(k);
        });

        const categories = [
            { keys: ['coffee', 'barista', 'tea'], icon: '☕', items: ['一小包试烘豆', '拉花练习小纸杯', '冷萃试喝瓶', '带着余温的纸袋点心', '吧台边的香气便签'] },
            { keys: ['bakery', 'dessert', 'catering', 'kitchen_prep', 'baker_night'], icon: '🥐', items: ['刚出炉的小面包', '一块边角料小蛋糕', '一小包糖霜饼干', '一张写着配方的便签', '带回来的香甜纸袋'] },
            { keys: ['bookstore', 'library', 'editor', 'copywriter', 'translator', 'calligraphy'], icon: '🔖', items: ['一枚纸质书签', '一张借书小票', '夹着半截干花的卡片', '一页折角的旧纸', '一张写满字的便签'] },
            { keys: ['flower', 'plant'], icon: '🌿', items: ['一束小雏菊', '一片叶脉书签', '一枚干花小卡片', '一小盆迷你多肉', '带着泥土气息的纸袋'] },
            { keys: ['studio', 'photo_edit', 'video_cut', 'podcast', 'model', 'actor', 'voice'], icon: '📷', items: ['一张试拍的小照片', '一段被剪下来的磁带标签', '写着镜头号的贴纸', '一张调色灵感卡', '一枚小小的夹子'] },
            { keys: ['pet', 'dog_walk', 'cat_sitter'], icon: '🐾', items: ['爪印贴纸一张', '一枚小铃铛', '宠物零食试吃包', '一小束毛绒绒的心情', '写着名字的小挂牌'] },
            { keys: ['cleaning', 'laundry', 'hotel'], icon: '🧼', items: ['衣物香氛小袋', '一小块清香皂片', '折得很整齐的手帕', '一枚干净的纽扣', '带回来的柔软气味'] },
            { keys: ['courier', 'driver', 'tour', 'map_maker', 'runner', 'studio_runner'], icon: '🧭', items: ['一张皱巴巴的票根', '路边热饮的杯套', '随手画的路线涂鸦', '一枚小小的反光贴', '带着风味的纸袋'] },
            { keys: ['it_support', 'dev_helper', 'qa', 'lab'], icon: '🧩', items: ['一枚理线扣', '一张小贴纸', '一颗多出来的小螺丝', '写着流程的小卡片', '一截用过的彩色胶带'] },
            { keys: ['teacher', 'tutor', 'coach', 'yoga'], icon: '✏️', items: ['一支顺手的笔', '一张画满圈圈的草稿纸', '一页练习清单', '一枚小小的贴纸', '一张写着鼓励的纸条'] }
        ];

        let picked = null;
        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const hit = cat.keys.some(function (k) { return (jobId && jobId.indexOf(k) !== -1) || (jobName && jobName.indexOf(k) !== -1); });
            if (!hit) continue;
            const pool = cat.items.map(function (x) {
                return { name: x, icon: cat.icon };
            });
            picked = pickUniqueGiftFromPool(pool, avoidSet);
            if (picked) break;
        }
        if (!picked) {
            const generic = ['一枚小徽章', '一块小点心', '一张折好的纸星星', '一段路过的香气', '一张随手写的便签'].map(function (x) {
                return { name: x, icon: (currentJob && currentJob.emoji) ? String(currentJob.emoji) : '🎁' };
            });
            picked = pickUniqueGiftFromPool(generic, avoidSet) || generic[0];
        }

        const reasonPool = {
            calm: [
                `收工时顺手留了下来，想着你会喜欢，就带回来了。`,
                `不是刻意挑的，只是刚好碰见了它，便收好了给你。`
            ],
            gentle: [
                `它看起来很温柔，像今天忙完后的那口气。我想把它带给你。`,
                `想着你看到会开心一点，就把它小心放进袋子里带回来了。`
            ],
            lively: [
                `我一眼就觉得这东西超适合你！所以立刻带回来啦。`,
                `嘿嘿，今天的收获！看到它的时候我就忍不住笑了。`
            ],
            tsundere: [
                `……别多想，我只是顺手带回来的。你收着就行。`,
                `哼，这种小东西放着也是放着，给你也不是不行。`
            ],
            snarky: [
                `实用的小玩意，带回来了。别问为什么。`,
                `刚好有一份，多带一份也不麻烦。`
            ]
        };
        const reasonArr = reasonPool[tone] || reasonPool.calm;
        const desc = reasonArr[Math.floor(Math.random() * reasonArr.length)];
        return { name: picked.name, icon: picked.icon || ((currentJob && currentJob.emoji) ? String(currentJob.emoji) : '🎁'), description: desc };
    }

    function fallbackDiaryForJob(roleId, jobName, currentJob) {
        const jobId = currentJob && typeof currentJob.id === 'string' ? currentJob.id : '';
        const history = getRoleWorkReportHistory(roleId).slice(-20);
        const avoid = new Set(history.map(function (r) { return String(r.diary || '').trim(); }).filter(Boolean));
        for (let i = 0; i < 6; i++) {
            const s = mockWorkStory(roleId, jobName, jobId).story;
            const t = String(s || '').trim();
            if (!t) continue;
            if (avoid.has(t)) continue;
            return t;
        }
        return mockWorkStory(roleId, jobName, jobId).story;
    }

    function fallbackWorkReport(roleId, assignedJobName, currentJob) {
        const jobName = String(assignedJobName || (currentJob && currentJob.name) || '打工').trim() || '打工';
        const diary = fallbackDiaryForJob(roleId, jobName, currentJob);
        const gift = fallbackGiftForJob(roleId, jobName, currentJob);
        return {
            job_name: jobName,
            job_fit: '一般',
            diary: diary,
            gift: gift
        };
    }

    function beginGenerateWorkReport(roleId, assignedJobName) {
        if (!roleId) return Promise.resolve(null);
        const d = ensureRoleWorkData(roleId);
        const jobName = String(assignedJobName || '').trim();
        const prevReq = runtime.workReportReqByRole[roleId];
        if (prevReq && prevReq.inflight && prevReq.jobName === jobName && prevReq.promise) return prevReq.promise;

        d.workReportStatus = 'loading';
        d.workAssignedJob = jobName;
        d.workReportAt = Date.now();
        d.workReport = null;
        ensureStore().roles[roleId] = d;
        saveStore();

        const p = (async function () {
            const out = await requestAIWorkReport(roleId, jobName);
            const latest = ensureRoleWorkData(roleId);
            if (out) {
                latest.workReportStatus = 'ready';
                latest.workReport = out;
                latest.workReportAt = Date.now();
            } else {
                latest.workReportStatus = 'error';
                latest.workReport = null;
                latest.workReportAt = Date.now();
            }
            ensureStore().roles[roleId] = latest;
            saveStore();
            return out;
        })();

        runtime.workReportReqByRole[roleId] = { jobName: jobName, promise: p, inflight: true, at: Date.now() };
        try {
            p.finally(function () {
                const req = runtime.workReportReqByRole[roleId];
                if (req && req.promise === p) req.inflight = false;
            });
        } catch (e) { }
        return p;
    }

    function pickJobForAuto(roleId, suggestedJobName) {
        const ctx = contextTextForRole(roleId);
        const hint = String(suggestedJobName || '').trim();
        const kwJob = pickJobByKeywords([hint, ctx].filter(Boolean).join('\n'));
        if (kwJob) return kwJob;
        const reco = findBestJob(roleId);
        return (reco && reco.job) ? reco.job : pickStableJob(roleId, ctx) || jobs[0];
    }

    function fallbackCustomJob(roleId, contextText) {
        const text = String(contextText || '');
        const roleName = getDisplayName(roleId) || '';
        const seeds = [
            { keys: ['医生', '医院', '诊所', '急诊', '手术'], name: '急诊代班', emoji: '🏥', tags: ['医疗', '冷静', '责任', '救治'], reward: 520, hours: 6 },
            { keys: ['护士', '护理'], name: '护理协助', emoji: '🩺', tags: ['护理', '细心', '耐心', '可靠'], reward: 420, hours: 6 },
            { keys: ['摄影', '镜头', '棚拍', '修图'], name: '外景跟拍', emoji: '📷', tags: ['摄影', '审美', '行动力', '沟通'], reward: 460, hours: 5 },
            { keys: ['配音', '声优', '旁白', '声音'], name: '广告试音', emoji: '🎙️', tags: ['配音', '表达', '情绪', '声音'], reward: 380, hours: 4 },
            { keys: ['写作', '文案', '文字', '小说'], name: '短文代写', emoji: '📝', tags: ['写作', '表达', '想象力', '文字'], reward: 360, hours: 4 },
            { keys: ['健身', '训练', '跑步'], name: '训练陪跑', emoji: '🏃', tags: ['体力', '自律', '行动力', '陪伴'], reward: 340, hours: 3 },
            { keys: ['猫', '狗', '宠物'], name: '上门看护', emoji: '🐾', tags: ['动物', '温柔', '耐心', '细心'], reward: 320, hours: 3 },
            { keys: ['魔法', '法术', '巫师', '魔女', '咒文'], name: '符文抄写', emoji: '📜', tags: ['魔法', '专注', '细致', '安静'], reward: 480, hours: 5 },
        ];
        for (let i = 0; i < seeds.length; i++) {
            const s = seeds[i];
            for (let k = 0; k < s.keys.length; k++) {
                const kw = String(s.keys[k] || '').trim();
                if (!kw) continue;
                if (text.indexOf(kw) !== -1) {
                    return {
                        id: 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
                        name: s.name,
                        emoji: s.emoji,
                        tags: s.tags.slice(),
                        duration: Math.round(s.hours * 60 * 60 * 1000),
                        baseReward: Math.round(s.reward)
                    };
                }
            }
        }
        const seed = hashToPositiveInt(roleName + '|' + text);
        const generic = [
            { name: '临时跑腿', emoji: '🛵', tags: ['行动力', '路线', '抗压', '沟通'], reward: 300, hours: 4 },
            { name: '资料整理', emoji: '🗂️', tags: ['条理', '细心', '认真', '安静'], reward: 280, hours: 5 },
            { name: '活动协助', emoji: '🎪', tags: ['行动力', '社交', '沟通', '抗压'], reward: 340, hours: 5 },
            { name: '店铺帮工', emoji: '🏪', tags: ['服务', '耐心', '细心', '体力'], reward: 260, hours: 6 },
        ];
        const g = generic[seed % generic.length];
        return {
            id: 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
            name: g.name,
            emoji: g.emoji,
            tags: g.tags.slice(),
            duration: Math.round(g.hours * 60 * 60 * 1000),
            baseReward: Math.round(g.reward)
        };
    }

    function formatCountdown(ms) {
        const v = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(v / 3600).toString().padStart(2, '0');
        const m = Math.floor((v % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(v % 60).toString().padStart(2, '0');
        return h + ':' + m + ':' + s;
    }

    function setWalletTabActive(tab) {
        const t = String(tab || '').trim();
        const tabs = document.querySelectorAll('.wallet-tab-item');
        tabs.forEach(function (el) {
            const key = el.getAttribute('data-wallet-tab') || '';
            if (key === t) el.classList.add('active');
            else el.classList.remove('active');
        });
    }

    function renderFamilyCards() {
        const receivedList = document.getElementById('wallet-family-received-list');
        const sentList = document.getElementById('wallet-family-sent-list');
        if (!receivedList || !sentList) return;

        const state = (window.FamilyCard && typeof window.FamilyCard.getState === 'function')
            ? window.FamilyCard.getState()
            : (window.familyCardState && typeof window.familyCardState === 'object'
                ? window.familyCardState
                : { receivedCards: [], sentCards: [] });

        const receivedCards = Array.isArray(state.receivedCards) ? state.receivedCards : [];
        const sentCards = Array.isArray(state.sentCards) ? state.sentCards : [];

        function makeEmpty() {
            const el = document.createElement('div');
            el.className = 'wallet-family-empty';
            el.textContent = '当前暂无';
            return el;
        }

        receivedList.innerHTML = '';
        if (!receivedCards.length) {
            receivedList.appendChild(makeEmpty());
        } else {
            receivedCards.slice().reverse().forEach(function (card) {
                const fromRoleId = card && (typeof card.fromRoleId === 'string' ? card.fromRoleId.trim() : '');
                const senderFallback = card && typeof card.sender === 'string' ? card.sender.trim() : '';
                const senderName = fromRoleId ? getDisplayName(fromRoleId) : senderFallback;
                const amount = card && (typeof card.amount === 'string' || typeof card.amount === 'number') ? String(card.amount) : '0.00';

                const root = document.createElement('div');
                root.className = 'wallet-family-received-card';

                const top = document.createElement('div');
                top.className = 'wallet-family-received-top';

                const icon = document.createElement('div');
                icon.className = 'wallet-family-received-icon';

                const title = document.createElement('div');
                title.className = 'wallet-family-received-title';
                title.textContent = (senderName || '亲属') + '送的亲属卡';

                top.appendChild(icon);
                top.appendChild(title);

                const bottom = document.createElement('div');
                bottom.className = 'wallet-family-received-bottom';

                const label = document.createElement('div');
                label.className = 'wallet-family-received-label';
                label.textContent = '剩余额度';

                const amountRow = document.createElement('div');
                amountRow.className = 'wallet-family-received-amount';

                const currency = document.createElement('span');
                currency.className = 'wallet-family-received-currency';
                currency.textContent = '¥';

                const value = document.createElement('span');
                value.className = 'wallet-family-received-value';
                value.textContent = amount;

                amountRow.appendChild(currency);
                amountRow.appendChild(value);
                bottom.appendChild(label);
                bottom.appendChild(amountRow);

                root.appendChild(top);
                root.appendChild(bottom);
                receivedList.appendChild(root);
            });
        }

        sentList.innerHTML = '';
        if (!sentCards.length) {
            sentList.appendChild(makeEmpty());
        } else {
            sentCards.slice().reverse().forEach(function (card) {
                const toRoleId = card && (typeof card.toRoleId === 'string' ? card.toRoleId.trim() : '');
                const receiverName = toRoleId ? getDisplayName(toRoleId) : '';
                const amount = card && (typeof card.amount === 'string' || typeof card.amount === 'number') ? String(card.amount) : '0.00';

                const root = document.createElement('div');
                root.className = 'wallet-family-sent-card';

                const left = document.createElement('div');
                left.className = 'wallet-family-sent-left';

                const title = document.createElement('div');
                title.className = 'wallet-family-sent-title';
                title.textContent = receiverName ? ('送给' + receiverName + '的亲属卡') : '赠送的亲属卡';

                const subtitle = document.createElement('div');
                subtitle.className = 'wallet-family-sent-subtitle';
                subtitle.textContent = '额度';

                left.appendChild(title);
                left.appendChild(subtitle);

                const amt = document.createElement('div');
                amt.className = 'wallet-family-sent-amount';
                amt.textContent = '¥' + amount;

                root.appendChild(left);
                root.appendChild(amt);
                sentList.appendChild(root);
            });
        }
    }

    function ensureFamilyCardUI() {
        const walletView = document.getElementById('wallet-view');
        if (!walletView) return;

        let pickerMask = document.getElementById('wallet-family-picker-mask');
        if (!pickerMask) {
            pickerMask = document.createElement('div');
            pickerMask.id = 'wallet-family-picker-mask';
            pickerMask.className = 'wallet-family-picker-mask';
            pickerMask.innerHTML = `
                <div class="wallet-family-picker-sheet" role="dialog" aria-modal="true">
                    <div class="wallet-family-picker-title">选择赠予对象</div>
                    <div id="wallet-family-picker-list" class="wallet-family-picker-list"></div>
                    <button id="wallet-family-picker-send" type="button" class="wallet-family-picker-action" disabled>赠送</button>
                </div>
            `;
            walletView.appendChild(pickerMask);
        }

        let amountMask = document.getElementById('wallet-family-amount-mask');
        if (!amountMask) {
            amountMask = document.createElement('div');
            amountMask.id = 'wallet-family-amount-mask';
            amountMask.className = 'wallet-family-amount-mask';
            amountMask.innerHTML = `
                <div class="wallet-family-amount-card" role="dialog" aria-modal="true">
                    <div class="wallet-family-amount-title">输入金额</div>
                    <input id="wallet-family-amount-input" class="wallet-family-amount-input" inputmode="decimal" placeholder="0.00" />
                    <div id="wallet-family-amount-hint" class="wallet-family-amount-hint"></div>
                    <div class="wallet-family-amount-actions">
                        <button id="wallet-family-amount-cancel" type="button" class="wallet-family-amount-btn ghost">取消</button>
                        <button id="wallet-family-amount-ok" type="button" class="wallet-family-amount-btn primary">确定</button>
                    </div>
                </div>
            `;
            walletView.appendChild(amountMask);
        }
    }

    function closeFamilyCardPicker() {
        const mask = document.getElementById('wallet-family-picker-mask');
        if (mask) mask.style.display = 'none';
    }

    function closeFamilyCardAmount() {
        const mask = document.getElementById('wallet-family-amount-mask');
        if (mask) mask.style.display = 'none';
        runtime.familyAmountRoleId = '';
    }

    function openFamilyCardAmount(roleId) {
        ensureFamilyCardUI();
        const mask = document.getElementById('wallet-family-amount-mask');
        if (!mask) return;
        runtime.familyAmountRoleId = String(roleId || '').trim();
        const input = document.getElementById('wallet-family-amount-input');
        const hint = document.getElementById('wallet-family-amount-hint');
        if (hint) hint.textContent = '';
        if (input) {
            input.value = '';
            try { input.focus(); } catch (e) { }
        }
        mask.style.display = 'flex';
    }

    function confirmFamilyCardSend() {
        const roleId = String(runtime.familyAmountRoleId || '').trim();
        const input = document.getElementById('wallet-family-amount-input');
        const hint = document.getElementById('wallet-family-amount-hint');
        const raw = input ? String(input.value || '').trim() : '';
        const n = parseFloat(raw);
        if (!roleId) return;
        if (!raw || isNaN(n) || !isFinite(n) || n <= 0) {
            if (hint) hint.textContent = '请输入正确金额';
            return;
        }
        const amount = n.toFixed(2);
        let sent = null;
        if (window.FamilyCard && typeof window.FamilyCard.sendToRole === 'function') {
            sent = window.FamilyCard.sendToRole(roleId, amount);
        }
        if (!sent) {
            return;
        }

        closeFamilyCardAmount();
        closeFamilyCardPicker();

        renderFamilyCards();

        if (window.Wallet && typeof window.Wallet.close === 'function') {
            try { window.Wallet.close(); } catch (e) { }
        }
        if (typeof window.enterChatRoom === 'function') {
            try { window.enterChatRoom(roleId); } catch (e) { }
        }
    }

    function renderFamilyCardPickerList() {
        const listEl = document.getElementById('wallet-family-picker-list');
        const sendBtn = document.getElementById('wallet-family-picker-send');
        if (!listEl || !sendBtn) return;

        listEl.innerHTML = '';
        const roleIds = getRoleIds();
        const selected = String(runtime.familyPickerSelectedRoleId || '').trim();

        roleIds.forEach(function (roleId) {
            const id = String(roleId || '').trim();
            if (!id) return;
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'wallet-family-picker-item' + (selected === id ? ' is-selected' : '');

            const left = document.createElement('div');
            left.className = 'wallet-family-picker-item-left';

            const avatar = document.createElement('img');
            avatar.className = 'wallet-family-picker-avatar';
            avatar.alt = '';
            avatar.src = getAvatar(id);

            const name = document.createElement('div');
            name.className = 'wallet-family-picker-name';
            name.textContent = getDisplayName(id);

            left.appendChild(avatar);
            left.appendChild(name);
            item.appendChild(left);

            item.addEventListener('click', function () {
                runtime.familyPickerSelectedRoleId = id;
                renderFamilyCardPickerList();
            });

            listEl.appendChild(item);
        });

        sendBtn.disabled = !runtime.familyPickerSelectedRoleId;
    }

    function openFamilyCardPicker() {
        ensureFamilyCardUI();
        const mask = document.getElementById('wallet-family-picker-mask');
        if (!mask) return;
        runtime.familyPickerSelectedRoleId = '';
        renderFamilyCardPickerList();
        mask.style.display = 'flex';
    }

    function setWalletTab(tab) {
        const t = String(tab || '').trim();
        runtime.activeTab = t || 'home';
        setWalletTabActive(runtime.activeTab);

        const homePage = document.getElementById('wallet-home-page');
        const familyPage = document.getElementById('wallet-family-page');
        const workPage = document.getElementById('wallet-work-page');
        const recordsPage = document.getElementById('wallet-records-page');
        const content = document.querySelector('.wallet-content');

        if (content) {
            if (runtime.activeTab === 'records') content.classList.add('records-mode');
            else content.classList.remove('records-mode');
            if (runtime.activeTab === 'family') content.classList.add('family-mode');
            else content.classList.remove('family-mode');
        }

        if (homePage) homePage.style.display = (runtime.activeTab === 'home') ? 'block' : 'none';
        if (familyPage) familyPage.style.display = (runtime.activeTab === 'family') ? 'block' : 'none';
        if (workPage) workPage.style.display = (runtime.activeTab === 'work') ? 'block' : 'none';
        if (recordsPage) recordsPage.style.display = (runtime.activeTab === 'records') ? 'block' : 'none';

        if (runtime.activeTab === 'family') {
            renderFamilyCards();
            return;
        }

        if (runtime.activeTab === 'work') {
            renderWorkGrid();
            return;
        }

        if (runtime.activeTab === 'records') {
            const roleIds = getRoleIds();
            renderGiftCabinet(runtime.cabinetRoleId || window.currentCharacterId || (roleIds[0] || ''));
            return;
        }
    }

    function getCabinetRoleId(preferredId) {
        const roleIds = getRoleIds();
        if (!roleIds.length) return '';
        const stored = (function () {
            try { return localStorage.getItem('wechat_gift_cabinet_role') || ''; } catch (e) { return ''; }
        })();
        const candidates = [
            preferredId,
            runtime.cabinetRoleId,
            window.currentCharacterId,
            stored
        ].map(function (x) { return String(x || '').trim(); }).filter(Boolean);
        for (let i = 0; i < candidates.length; i++) {
            if (roleIds.indexOf(candidates[i]) !== -1) return candidates[i];
        }
        return roleIds[0];
    }

    function setCabinetRoleId(roleId) {
        const id = String(roleId || '').trim();
        runtime.cabinetRoleId = id;
        window.currentCharacterId = id;
        try { localStorage.setItem('wechat_gift_cabinet_role', id); } catch (e) { }
    }

    function renderGiftCabinet(characterId) {
        const root = document.getElementById('gift-cabinet-page');
        if (!root) return;
        const roleIds = getRoleIds();
        const id = getCabinetRoleId(characterId);
        setCabinetRoleId(id);

        const avatarEl = document.getElementById('gift-cabinet-avatar');
        const titleEl = document.getElementById('gift-cabinet-title');
        const emptyEl = document.getElementById('gift-cabinet-empty');
        const gridEl = document.getElementById('gift-cabinet-grid');

        const profiles = getProfiles();
        const p = profiles[id] && typeof profiles[id] === 'object' ? profiles[id] : {};
        const bg = typeof p.gift_cabinet_bg === 'string' ? p.gift_cabinet_bg.trim() : '';
        const bgLayer = bg
            ? `linear-gradient(180deg, rgba(255, 255, 255, 0.32), rgba(240, 240, 240, 0.88)), url("${bg}")`
            : '';
        root.style.backgroundImage = bgLayer;
        root.__bgAutoSet = true;

        if (avatarEl) avatarEl.src = id ? getAvatar(id) : 'assets/chushitouxiang.jpg';
        if (titleEl) titleEl.textContent = id ? (getDisplayName(id) + ' 给你的礼物') : '礼物柜';
        if (!gridEl) return;
        const gifts = getRoleGiftCabinetItems(id);
        const hasGifts = gifts.length > 0;
        if (emptyEl) emptyEl.style.display = hasGifts ? 'none' : 'block';
        gridEl.innerHTML = hasGifts ? renderGiftCabinetCards(id) : '';
    }

    window.renderGiftCabinet = renderGiftCabinet;

    function openGiftCabinet(preferredRoleId) {
        try {
            if (window.Wallet && typeof window.Wallet.open === 'function') {
                window.Wallet.open();
            }
        } catch (e) { }
        const roleId = getCabinetRoleId(preferredRoleId || window.currentChatRole || window.currentCharacterId || '');
        setCabinetRoleId(roleId);
        if (typeof setWalletTab === 'function') {
            setWalletTab('records');
        } else {
            renderGiftCabinet(roleId);
        }
        renderGiftCabinet(roleId);
    }

    function handleGiftPoolAction(action) {
        const roleId = String(runtime.cabinetRoleId || window.currentCharacterId || window.currentChatRole || '').trim();
        if (!roleId) return;
        if (action === 'ask') {
            showGiftPoolAskModal(roleId);
            return;
        }
        if (action === 'generate') {
            generateGiftPool(roleId);
            return;
        }
        if (action === 'draw-one') {
            drawGiftPool(roleId, 1);
            return;
        }
        if (action === 'draw-ten') {
            drawGiftPool(roleId, 10);
            return;
        }
    }

    function recordGiftPoolChatTurn(roleId, turns) {
        const id = String(roleId || '').trim();
        if (!id) return createEmptyGiftPoolState();
        const increment = clampNumber(turns, 1, 999, 1);
        const pool = getRoleGiftPoolState(id);
        pool.progress = clampNumber(pool.progress, 0, 9, 0) + increment;
        let gained = 0;
        while (pool.progress >= 10) {
            pool.progress -= 10;
            pool.tickets = clampNumber(pool.tickets, 0, 999999, 20) + 1;
            gained += 1;
        }
        saveRoleGiftPoolState(id, pool);
        if (gained > 0) {
            try {
                if (typeof showCenterToast === 'function') {
                    showCenterToast(`心动券 +${gained}`);
                }
            } catch (e) { }
        }
        return pool;
    }

    function findGiftPoolHistoryCard(roleId, cardId) {
        const id = String(roleId || '').trim();
        const targetId = String(cardId || '').trim();
        if (!id || !targetId) return null;
        const pool = getRoleGiftPoolState(id);
        const history = pool.history || {};
        const rarities = ['SSR', 'SR', 'R'];
        for (let i = 0; i < rarities.length; i++) {
            const rarity = rarities[i];
            const list = Array.isArray(history[rarity]) ? history[rarity] : [];
            for (let j = list.length - 1; j >= 0; j--) {
                const item = list[j];
                if (item && String(item.id || '') === targetId) {
                    return item;
                }
            }
        }
        return null;
    }

    function ensureGiftPoolResultOverlay() {
        let overlay = document.getElementById('gachaResultOverlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'gachaResultOverlay';
        overlay.className = 'gacha-overlay';
        overlay.innerHTML = `
            <div class="gacha-result-cards" id="gachaResultCards"></div>
            <button type="button" class="gacha-close-btn" id="gachaCloseBtn">收下了 ♡</button>
        `;
        document.body.appendChild(overlay);
        
        const closeBtn = document.getElementById('gachaCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                overlay.classList.remove('show');
                refreshGiftViews(runtime.cabinetRoleId || window.currentCharacterId || window.currentChatRole);
            });
        }
        return overlay;
    }

    function showGiftPoolResults(results, isSingle) {
        const overlay = ensureGiftPoolResultOverlay();
        const container = document.getElementById('gachaResultCards');
        if (!overlay || !container) return;
        
        container.innerHTML = '';
        for (let i = 0; i < results.length; i++) {
            const card = results[i];
            const el = document.createElement('div');
            const rarityClass = card.rarity ? card.rarity.toLowerCase() + '-card' : 'r-card';
            el.className = 'gacha-card ' + rarityClass + (isSingle ? ' single-card' : '');
            el.innerHTML = (card.rarity === 'SSR' ? '<div class="gacha-ssr-glow"></div>' : '') +
                           '<div class="gacha-card-rarity">' + escapeGiftPoolHtml(card.rarity) + '</div>' +
                           '<div class="gacha-card-icon">' + escapeGiftPoolHtml(card.icon) + '</div>' +
                           '<div class="gacha-card-name">' + escapeGiftPoolHtml(card.title) + '</div>' +
                           '<div class="gacha-card-desc">' + escapeGiftPoolHtml(card.content) + '</div>';
            container.appendChild(el);
            setTimeout(function() {
                el.classList.add('revealed');
            }, i * 120 + 100);
        }
        
        overlay.style.display = 'flex';
        // 强制重绘
        overlay.offsetHeight;
        overlay.classList.add('show');
        
        let hasSSR = false;
        for (let k = 0; k < results.length; k++) {
            if (results[k].rarity === 'SSR') hasSSR = true;
        }
        if (hasSSR) {
            setTimeout(function() {
                try {
                    if (typeof showCenterToast === 'function') {
                        showCenterToast('✨ 恭喜获得 SSR！');
                    }
                } catch (e) {}
            }, 800);
        }
    }

    function drawGiftPool(roleId, count) {
        const id = String(roleId || '').trim();
        if (!id) return;
        const debugMode = giftPoolDebugEnabled();
        const pool = getRoleGiftPoolState(id);
        const drawCount = clampNumber(count, 1, debugMode ? 999999 : 10, 1);
        if (!flattenGiftPoolCards(pool).length) {
            openGiftPoolModal({
                title: '还没生成哦',
                desc: '先生成礼物池，再来抽取词条吧。',
                okText: '知道了',
                iconHtml: "<i class='bx bx-info-circle'></i>"
            });
            return;
        }
        if (!debugMode && pool.tickets < drawCount) {
            openGiftPoolModal({
                title: '心动券不够',
                desc: `当前只有 ${String(pool.tickets)} 张心动券，先继续聊天攒一攒吧。`,
                okText: '知道了',
                iconHtml: "<i class='bx bx-heart-circle'></i>"
            });
            return;
        }

        const flat = flattenGiftPoolCards(pool);
        const drawn = [];
        for (let i = 0; i < drawCount; i++) {
            const card = flat[Math.floor(Math.random() * flat.length)];
            if (!card) continue;
            const copy = Object.assign({}, card, {
                drawnAt: Date.now(),
                drawIndex: (pool.history && pool.history[card.rarity] ? pool.history[card.rarity].length : 0) + 1
            });
            drawn.push(copy);
            if (!pool.history[copy.rarity]) pool.history[copy.rarity] = [];
            pool.history[copy.rarity].push(copy);
        }
        if (!debugMode) {
            pool.tickets = clampNumber(pool.tickets - drawCount, 0, 999999, 20);
        }
        saveRoleGiftPoolState(id, pool);
        if (drawn.length) {
            showGiftPoolResults(drawn, drawn.length === 1);
            queueGiftDrawReaction(id, drawn);
        }
    }

    function giftPoolDebugEnabled() {
        try {
            return typeof localStorage !== 'undefined' && localStorage.getItem('gift_pool_debug') === '1';
        } catch (e) {
            return false;
        }
    }

    function buildGiftPoolDebugSummary(detail) {
        const d = detail && typeof detail === 'object' ? detail : {};
        const apiMeta = d.apiMeta && typeof d.apiMeta === 'object' ? d.apiMeta : null;
        const requestMeta = d.requestMeta && typeof d.requestMeta === 'object' ? d.requestMeta : null;
        const roleId = String(d.roleId || (requestMeta && requestMeta.roleId) || '').trim();
        const requestId = String((apiMeta && apiMeta.requestId) || (requestMeta && requestMeta.requestId) || '').trim();
        const status = apiMeta && Number.isFinite(Number(apiMeta.status)) ? Number(apiMeta.status) : null;
        const rawText = String(d.rawText || d.apiRawText || '').trim();
        const cleanedText = String(d.cleanedText || '').trim();
        const rawLen = rawText.length;
        const cleanedLen = cleanedText.length;
        const message = String(d.message || '').trim() || '未知错误';
        let reason = '礼物池生成失败。';
        if (message.indexOf('无法解析') !== -1 || message.indexOf('parse') !== -1) {
            reason = 'API 已经返回了内容，但这份内容不是可直接解析的礼物池 JSON。';
        } else if (message.indexOf('失败') !== -1) {
            reason = message;
        }
        const lines = [
            reason,
            requestId ? `请求号：${requestId}` : '',
            roleId ? `角色：${roleId}` : '',
            status != null ? `HTTP 状态：${status}` : '',
            rawLen ? `原文长度：${rawLen}` : '',
            cleanedLen ? `清洗后长度：${cleanedLen}` : '',
            '你现在该看的是 __giftPoolLastAIResponse.rawText，不是 __lastCallAIResponse。'
        ].filter(Boolean);
        return {
            kind: 'giftPoolDebugSummary',
            requestId: requestId,
            roleId: roleId,
            status: status,
            message: message,
            summaryText: lines.join('\n'),
            hint: '在 Eruda Console 里输入 __giftPoolLastAIResponse.rawText 查看原文'
        };
    }

    window.getGiftPoolDebugSummary = function () {
        try {
            return window.__giftPoolDebugSummary || null;
        } catch (e) {
            return null;
        }
    };

    async function generateGiftPool(roleId) {
        const id = String(roleId || '').trim();
        if (!id) return;
        if (runtime.giftPoolLoadingRoleId) return;
        if (typeof window.callAI !== 'function') {
            openGiftPoolModal({
                title: '无法生成',
                desc: '当前 AI 模块还没有加载完成，请刷新页面后再试。',
                okText: '知道了',
                iconHtml: "<i class='bx bx-error-circle'></i>"
            });
            return;
        }

        const previousRole = String(window.currentChatRole || '').trim();
        const loadingRoleId = id;
        setGiftPoolLoading(id, true);
        openGiftPoolModal({
            title: '正在生成',
            desc: '【角色备注】正在给你准备礼物当中，请稍等',
            okText: '知道了',
            iconHtml: "<i class='bx bx-loader-alt bx-spin'></i>"
        });

        const prompt = getGiftPoolPrompt(id);
        const prevChatRole = window.currentChatRole;
        try {
            const requestMeta = {
                kind: 'giftPoolGenerate',
                roleId: id,
                at: Date.now(),
                prompt: prompt,
                systemPromptLen: String(prompt && prompt.systemPrompt ? prompt.systemPrompt : '').length,
                userMessageLen: String(prompt && prompt.userMessage ? prompt.userMessage : '').length
            };
            window.__giftPoolLastRequest = requestMeta;
            window.currentChatRole = id;
            if (typeof localStorage !== 'undefined') {
                try { localStorage.setItem('currentChatId', id); } catch (e) { }
            }
            const text = await new Promise(function (resolve, reject) {
                window.callAI(
                    prompt.systemPrompt,
                    [],
                    prompt.userMessage,
                    function (res) { resolve(res); },
                    function (err) { reject(new Error(String(err || '生成失败'))); },
                    {
                        softTimeoutNoAbort: true,
                        maxTokens: 8192,
                        temperature: 0.15,
                        frequencyPenalty: 0,
                        presencePenalty: 0,
                        disableTimePerceptionForThisCall: true,
                        disableLatestWrapper: true
                    }
                );
            });

            const rawText = String(text || '');
            const cleanedText = stripGiftPoolText(rawText);
            const lastApiText = String(window.__lastCallAIResponseText || '');
            const lastApiMeta = window.__lastCallAIResponseMeta && typeof window.__lastCallAIResponseMeta === 'object'
                ? window.__lastCallAIResponseMeta
                : null;
            window.__giftPoolLastAIResponse = {
                roleId: id,
                at: Date.now(),
                requestMeta: requestMeta,
                apiMeta: lastApiMeta,
                rawText: rawText,
                cleanedText: cleanedText,
                apiRawText: lastApiText
            };
            try {
                console.groupCollapsed('[GiftPool] AI raw response');
                console.log(window.__giftPoolLastAIResponse);
                console.groupEnd();
            } catch (e) { }

            let parsed = normalizeGiftPoolPayload(text, id);
            if (!parsed) {
                const repairPrompt = getGiftPoolRepairPrompt(id, rawText);
                const repairedText = await new Promise(function (resolve, reject) {
                    window.callAI(
                        repairPrompt.systemPrompt,
                        [],
                        repairPrompt.userMessage,
                        function (res) { resolve(res); },
                        function (err) { reject(new Error(String(err || '修复失败'))); },
                        {
                            softTimeoutNoAbort: true,
                            maxTokens: 4096,
                            temperature: 0.05,
                            frequencyPenalty: 0,
                            presencePenalty: 0,
                            disableTimePerceptionForThisCall: true,
                            disableLatestWrapper: true
                        }
                    );
                });
                const repairedRawText = String(repairedText || '');
                const repairedParsed = normalizeGiftPoolPayload(repairedRawText, id);
                window.__giftPoolLastRepair = {
                    roleId: id,
                    at: Date.now(),
                    rawText: rawText,
                    repairedText: repairedRawText,
                    parsed: repairedParsed
                };
                try {
                    console.groupCollapsed('[GiftPool] repair response');
                    console.log(window.__giftPoolLastRepair);
                    console.groupEnd();
                } catch (e) { }
                parsed = repairedParsed;
            }
            if (!parsed) {
                const failure = {
                    kind: 'giftPoolGenerate',
                    roleId: id,
                    at: Date.now(),
                    message: 'AI 返回的内容无法解析为礼物池 JSON',
                    requestMeta: requestMeta,
                    apiMeta: lastApiMeta,
                    rawText: rawText,
                    cleanedText: cleanedText,
                    apiRawText: lastApiText,
                    repair: window.__giftPoolLastRepair || null
                };
                window.__giftPoolLastError = failure;
                window.__giftPoolDebugSummary = buildGiftPoolDebugSummary(failure);
                try {
                    console.warn('[GiftPool] ' + window.__giftPoolDebugSummary.summaryText);
                    console.error('[GiftPool] parse failed', failure);
                } catch (e0) { }
                throw new Error(failure.message);
            }
            const next = getRoleGiftPoolState(id);
            next.pool = parsed;
            next.generatedAt = Date.now();
            next.totalGenerated = flattenGiftPoolCards({ pool: parsed }).length;
            saveRoleGiftPoolState(id, next);
            window.__giftPoolLastParsed = {
                roleId: id,
                at: Date.now(),
                totalGenerated: next.totalGenerated,
                parsed: parsed
            };
            window.__giftPoolDebugSummary = {
                kind: 'giftPoolDebugSummary',
                requestId: requestMeta.requestId || '',
                roleId: id,
                status: 200,
                message: '礼物池生成成功。',
                summaryText: `礼物池生成成功。\n角色：${id}\n卡片数量：${next.totalGenerated || 0}`,
                hint: '可以继续抽卡了'
            };
            try {
                console.log('[GiftPool] parsed result', window.__giftPoolLastParsed);
            } catch (e1) { }
            showGiftPoolSuccessModal(id, next.totalGenerated || 50);
        } catch (err) {
            const failure = {
                kind: 'giftPoolGenerate',
                roleId: id,
                at: Date.now(),
                message: String(err && err.message ? err.message : err || '礼物池生成失败，请稍后重试。'),
                requestMeta: window.__giftPoolLastRequest || null,
                apiMeta: window.__lastCallAIResponseMeta || null,
                apiRawText: String(window.__lastCallAIResponseText || ''),
                apiResponse: window.__lastCallAIResponse || null,
                apiError: window.__lastCallAIResponseError || null,
                lastAIResponse: window.__giftPoolLastAIResponse || null
            };
            window.__giftPoolLastError = failure;
            window.__giftPoolDebugSummary = buildGiftPoolDebugSummary(failure);
            try {
                console.warn('[GiftPool] ' + window.__giftPoolDebugSummary.summaryText);
                console.error('[GiftPool] generate failed', failure);
            } catch (e0) { }
            openGiftPoolModal({
                title: '生成失败',
                desc: String(err && err.message ? err.message : err || '礼物池生成失败，请稍后重试。'),
                okText: '知道了',
                iconHtml: "<i class='bx bx-error-circle'></i>"
            });
        } finally {
            setGiftPoolLoading('', false);
            refreshGiftViews(loadingRoleId);
            try {
                window.currentChatRole = String(prevChatRole || '').trim();
                if (previousRole) localStorage.setItem('currentChatId', previousRole);
            } catch (e) { }
        }
    }

    function openGiftRolePicker(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const mask = document.getElementById('gift-role-mask');
        const list = document.getElementById('gift-role-list');
        if (!mask || !list) return;
        const roleIds = getRoleIds();
        list.innerHTML = '';
        roleIds.forEach(function (roleId) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'gift-role-item';
            btn.setAttribute('data-role-id', roleId);

            const avatar = document.createElement('img');
            avatar.className = 'gift-role-item-avatar';
            avatar.alt = '';
            avatar.src = getAvatar(roleId);

            const name = document.createElement('div');
            name.className = 'gift-role-item-name';
            name.textContent = getDisplayName(roleId);

            btn.appendChild(avatar);
            btn.appendChild(name);
            btn.addEventListener('click', function () {
                if (typeof opts.onPick === 'function') {
                    try {
                        opts.onPick(roleId);
                    } catch (e) { }
                    closeGiftRolePicker();
                    return;
                }
                if (runtime.giftPoolPageOpen) {
                    renderGiftPoolPage(roleId);
                } else {
                    renderGiftCabinet(roleId);
                }
                closeGiftRolePicker();
            });
            list.appendChild(btn);
        });
        mask.style.display = 'flex';
    }

    function closeGiftRolePicker() {
        const mask = document.getElementById('gift-role-mask');
        if (mask) mask.style.display = 'none';
    }

    window.openGiftRolePicker = openGiftRolePicker;
    window.closeGiftRolePicker = closeGiftRolePicker;

    function openGiftSettings() {
        const mask = document.getElementById('gift-settings-mask');
        if (mask) mask.style.display = 'flex';
    }

    function closeGiftSettings() {
        const mask = document.getElementById('gift-settings-mask');
        if (mask) mask.style.display = 'none';
    }

    function applyGiftCabinetBackground(roleId, dataUrl) {
        const id = String(roleId || '').trim();
        if (!id) return;
        const profiles = getProfiles();
        const p = profiles[id] && typeof profiles[id] === 'object' ? profiles[id] : {};
        p.gift_cabinet_bg = String(dataUrl || '').trim();
        profiles[id] = p;
        saveProfiles(profiles);
    }

    function clearGiftCabinetBackground(roleId) {
        const id = String(roleId || '').trim();
        if (!id) return;
        const profiles = getProfiles();
        const p = profiles[id] && typeof profiles[id] === 'object' ? profiles[id] : {};
        p.gift_cabinet_bg = '';
        profiles[id] = p;
        saveProfiles(profiles);
    }

    function openGiftDetail(gift) {
        const g = gift && typeof gift === 'object' ? gift : null;
        if (!g) return;
        runtime.giftDetail = g;
        const mask = document.getElementById('gift-detail-mask');
        const iconEl = document.getElementById('gift-detail-icon');
        const nameEl = document.getElementById('gift-detail-name');
        const descEl = document.getElementById('gift-detail-desc');
        if (iconEl) iconEl.textContent = String(g.icon || '🎁');
        if (nameEl) nameEl.textContent = String(g.name || '').trim();
        if (descEl) descEl.textContent = String(g.description || '').trim();
        if (mask) mask.style.display = 'flex';
    }

    function closeGiftDetail() {
        runtime.giftDetail = null;
        const mask = document.getElementById('gift-detail-mask');
        if (mask) mask.style.display = 'none';
    }

    function getWalletVisible() {
        const view = document.getElementById('wallet-view');
        if (!view) return false;
        const d = view.style && view.style.display ? view.style.display : '';
        if (d === 'none') return false;
        return true;
    }

    function getStatusText(workData) {
        if (!workData || workData.status === 'idle') return '空闲中';
        if (workData.status === 'working' && workData.currentJob && workData.currentJob.name) {
            const emoji = workData.currentJob.emoji ? String(workData.currentJob.emoji) + ' ' : '';
            return emoji + String(workData.currentJob.name) + '兼职中';
        }
        if (workData.status === 'finished') return '待结算';
        return '空闲中';
    }

    function toggleLeaderboard() {
        runtime.isLeaderboardView = !runtime.isLeaderboardView;
        const grid = document.getElementById('work-role-grid');
        const view = document.getElementById('work-leaderboard-view');
        const btn = document.getElementById('work-leaderboard-toggle');
        
        if (runtime.isLeaderboardView) {
            if (grid) grid.style.display = 'none';
            if (view) view.style.display = 'flex';
            if (btn) btn.classList.add('active');
            renderLeaderboard();
        } else {
            if (grid) grid.style.display = 'grid';
            if (view) view.style.display = 'none';
            if (btn) btn.classList.remove('active');
            renderWorkGrid();
        }
    }

    function renderLeaderboard() {
        const view = document.getElementById('work-leaderboard-view');
        if (!view || view.style.display === 'none') return;
        
        let podium = document.getElementById('leaderboard-podium');
        let list = document.getElementById('leaderboard-list');
        
        if (!podium) {
             const p = document.createElement('div');
             p.id = 'leaderboard-podium';
             p.className = 'leaderboard-podium';
             view.appendChild(p);
             podium = p;
        }
        if (!list) {
             const l = document.createElement('div');
             l.id = 'leaderboard-list';
             l.className = 'leaderboard-list';
             view.appendChild(l);
             list = l;
        }

        podium.innerHTML = '';
        list.innerHTML = '';

        const roleIds = getRoleIds();
        const data = roleIds.map(function(id) {
            const d = ensureRoleWorkData(id);
            return {
                id: id,
                name: getDisplayName(id),
                avatar: getAvatar(id),
                earned: clampNumber(d.totalEarned, 0, Number.MAX_SAFE_INTEGER, 0)
            };
        });

        // Sort by earned desc
        data.sort(function(a, b) { return b.earned - a.earned; });

        const top3 = data.slice(0, 3);
        const rest = data.slice(3);

        // Render Podium (2, 1, 3 order)
        if (top3.length > 0) {
            // Rank 2 (Left)
            if (top3[1]) renderPodiumBar(podium, top3[1], 2);
            // Rank 1 (Center)
            if (top3[0]) renderPodiumBar(podium, top3[0], 1);
            // Rank 3 (Right)
            if (top3[2]) renderPodiumBar(podium, top3[2], 3);
        } else {
             podium.innerHTML = '<div style="width:100%;text-align:center;color:#999;font-size:13px;padding-bottom:20px;">暂无数据</div>';
        }

        // Render List
        rest.forEach(function(item, idx) {
            const rank = idx + 4;
            const row = document.createElement('div');
            row.className = 'leaderboard-item';
            row.style.animationDelay = (idx * 0.05) + 's';
            row.innerHTML = 
                '<div class="leaderboard-item-left">' +
                    '<div class="leaderboard-rank">' + rank + '</div>' +
                    '<img class="leaderboard-item-avatar" src="' + item.avatar + '">' +
                    '<div class="leaderboard-item-name">' + item.name + '</div>' +
                '</div>' +
                '<div class="leaderboard-item-amount">¥ ' + item.earned.toLocaleString() + '</div>';
            list.appendChild(row);
        });
    }

    function renderPodiumBar(container, item, rank) {
        const bar = document.createElement('div');
        bar.className = 'leaderboard-bar-card rank-' + rank;
        
        const avatarHtml = 
            '<div class="leaderboard-avatar-wrap">' +
                (rank === 1 ? '<div class="leaderboard-crown">👑</div>' : '') +
                '<img class="leaderboard-avatar" src="' + item.avatar + '">' +
            '</div>';

        bar.innerHTML = 
            avatarHtml +
            '<div class="leaderboard-name">' + item.name + '</div>' +
            '<div class="leaderboard-amount">¥ ' + item.earned.toLocaleString() + '</div>';
        container.appendChild(bar);
    }

    function renderWorkGrid() {
        if (runtime.isLeaderboardView) {
            renderLeaderboard();
            return;
        }
        const grid = document.getElementById('work-role-grid');
        if (!grid) return;

        const roleIds = getRoleIds();
        if (roleIds.length === 0) {
            grid.innerHTML = '<div class="work-empty">还没有角色。先去微信里创建一个聊天对象。</div>';
            return;
        }

        grid.innerHTML = '';
        roleIds.forEach(function (roleId) {
            const data = ensureRoleWorkData(roleId);
            const card = document.createElement('div');
            card.className = 'work-role-card';
            card.setAttribute('data-role-id', roleId);
            card.addEventListener('click', function () {
                openDetail(roleId);
            });

            const avatar = document.createElement('img');
            avatar.className = 'work-role-avatar';
            avatar.alt = '';
            avatar.src = getAvatar(roleId);

            const name = document.createElement('div');
            name.className = 'work-role-name';
            name.textContent = getDisplayName(roleId);

            const status = document.createElement('div');
            status.className = 'work-role-status';
            status.textContent = getStatusText(data);

            const footer = document.createElement('div');
            footer.className = 'work-role-footer';

            if (data.status === 'idle') {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'work-btn work-btn-primary';
                btn.textContent = '安排工作';
                btn.addEventListener('click', function (e) {
                    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                    openSheet(roleId);
                });
                footer.appendChild(btn);
            } else if (data.status === 'working') {
                const prog = document.createElement('div');
                prog.className = 'work-progress';
                const fill = document.createElement('div');
                fill.className = 'work-progress-fill';
                fill.id = 'work-progress-fill-' + roleId;
                prog.appendChild(fill);

                const countdown = document.createElement('div');
                countdown.className = 'work-countdown';
                countdown.id = 'work-countdown-' + roleId;
                const row = document.createElement('div');
                row.className = 'work-countdown-row';
                row.appendChild(countdown);
                const fastBtn = document.createElement('button');
                fastBtn.type = 'button';
                fastBtn.className = 'work-fast-btn';
                fastBtn.textContent = '加速';
                fastBtn.addEventListener('click', function (e) {
                    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                    accelerateToFinish(roleId, true);
                });
                row.appendChild(fastBtn);
                footer.appendChild(prog);
                footer.appendChild(row);
            } else if (data.status === 'finished') {
                const env = document.createElement('button');
                env.type = 'button';
                env.className = 'work-envelope-btn';
                env.textContent = '✉️';
                env.addEventListener('click', function (e) {
                    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                    openNote(roleId);
                });
                footer.appendChild(env);
            }

            card.appendChild(avatar);
            card.appendChild(name);
            card.appendChild(status);
            card.appendChild(footer);
            grid.appendChild(card);
        });

        tickWorkTimers();
    }

    const feedTypes = {
        main: { id: 'main', name: '主食类', cost: 15, baseStamina: 25, baseMood: 6 },
        veg: { id: 'veg', name: '蔬菜类', cost: 5, baseStamina: 12, baseMood: 3 },
        fast: { id: 'fast', name: '速食类', cost: 10, baseStamina: 18, baseMood: 4 },
        dessert: { id: 'dessert', name: '甜品类', cost: 30, baseStamina: 16, baseMood: 18 }
    };

    function escapeRegExp(text) {
        return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function hasLikeFood(text, food) {
        const f = escapeRegExp(food);
        const t = String(text || '');
        const r1 = new RegExp('(喜欢吃|爱吃|最爱吃|偏爱|喜欢).{0,6}' + f);
        const r2 = new RegExp(f + '.{0,6}(喜欢吃|爱吃|最爱吃|偏爱|喜欢)');
        return r1.test(t) || r2.test(t);
    }

    function hasDislikeFood(text, food) {
        const f = escapeRegExp(food);
        const t = String(text || '');
        const r1 = new RegExp('(不喜欢吃|讨厌|不爱吃|不吃).{0,6}' + f);
        const r2 = new RegExp(f + '.{0,6}(不喜欢吃|讨厌|不爱吃|不吃)');
        return r1.test(t) || r2.test(t);
    }

    function foodKeywordsForType(type) {
        if (type === 'dessert') return ['甜品', '蛋糕', '布丁', '巧克力', '冰淇淋', '奶茶', '甜甜圈'];
        if (type === 'veg') return ['蔬菜', '青菜', '西兰花', '胡萝卜', '生菜', '黄瓜', '番茄'];
        if (type === 'fast') return ['速食', '泡面', '方便面', '汉堡', '薯条', '披萨', '炸鸡'];
        return ['主食', '米饭', '面条', '拉面', '饺子', '包子', '馒头', '粥'];
    }

    function analyzeFeedPreference(roleId, type) {
        const text = (personaTextForRole(roleId) + '\n' + worldbookTextForRole(roleId)).toString();
        const keywords = foodKeywordsForType(type);
        let liked = '';
        let disliked = '';
        for (let i = 0; i < keywords.length; i++) {
            const k = keywords[i];
            if (!liked && hasLikeFood(text, k)) liked = k;
            if (!disliked && hasDislikeFood(text, k)) disliked = k;
            if (liked && disliked) break;
        }
        return { liked, disliked };
    }

    function getFeedMenuVisible() {
        const el = document.getElementById('work-feed-menu');
        if (!el) return false;
        const d = el.style && el.style.display ? el.style.display : '';
        return d !== 'none';
    }

    function setFeedMenuVisible(visible) {
        const el = document.getElementById('work-feed-menu');
        if (!el) return;
        el.style.display = visible ? 'grid' : 'none';
    }

    function updateFeedMenuState() {
        const roleId = runtime.detailRoleId;
        if (!roleId) return;
        const gold = getGold();
        const items = document.querySelectorAll('.work-feed-item');
        if (!items || !items.length) return;
        items.forEach(function (btn) {
            if (!btn) return;
            const type = btn.getAttribute('data-feed-type') || '';
            const cfg = feedTypes[type];
            if (!cfg) return;
            btn.disabled = gold < cfg.cost;
        });
    }

    function toggleFeedMenu() {
        const visible = getFeedMenuVisible();
        setFeedMenuVisible(!visible);
        if (!visible) updateFeedMenuState();
    }

    function getWalletSnapshot() {
        const raw = localStorage.getItem('wechat_wallet');
        const parsed = raw ? safeParse(raw, {}) : {};
        const d = parsed && typeof parsed === 'object' ? parsed : {};
        const totalAssets = clampNumber(d.totalAssets, 0, Number.MAX_SAFE_INTEGER, 0);
        return { totalAssets };
    }

    function getGold() {
        const w = getWalletSnapshot();
        return clampNumber(w.totalAssets, 0, Number.MAX_SAFE_INTEGER, 0);
    }

    function addWalletExpense(title, amount, roleId, kind) {
        const amt = clampNumber(amount, 0, Number.MAX_SAFE_INTEGER, 0);
        if (amt <= 0) return;

        if (window.Wallet && typeof window.Wallet.addTransaction === 'function') {
            try {
                window.Wallet.addTransaction('expense', title, amt, 'work', { peerName: getDisplayName(roleId), peerRoleId: roleId, kind: kind });
            } catch (e) { }
            return;
        }

        const raw = localStorage.getItem('wechat_wallet');
        const parsed = raw ? safeParse(raw, {}) : {};
        const data = parsed && typeof parsed === 'object' ? parsed : {};
        if (typeof data.totalAssets !== 'number') data.totalAssets = 0;
        if (!Array.isArray(data.transactions)) data.transactions = [];
        data.totalAssets = Math.max(0, Number(data.totalAssets) - amt);
        data.transactions.unshift({
            id: Date.now() + Math.random().toString(36).slice(2, 9),
            type: 'expense',
            title: title,
            amount: amt,
            date: Date.now(),
            category: 'work',
            peerName: getDisplayName(roleId),
            peerRoleId: roleId,
            kind: kind || ''
        });
        try { localStorage.setItem('wechat_wallet', JSON.stringify(data)); } catch (e) { }
    }

    function moodDesc(value) {
        const v = clampNumber(value, 0, 100, 0);
        if (v >= 90) return '愉悦';
        if (v >= 70) return '开心';
        if (v >= 35) return '平静';
        return '难过';
    }

    function staminaDesc(value) {
        const v = clampNumber(value, 0, 100, 0);
        if (v >= 85) return '精力充沛';
        if (v >= 55) return '还行';
        if (v >= 25) return '有点累';
        return '虚弱';
    }

    function setBar(fillEl, value) {
        if (!fillEl) return;
        const v = clampNumber(value, 0, 100, 0);
        fillEl.style.width = String(v) + '%';
    }

    function boostGoodLuck(roleId) {
        const id = String(roleId || '').trim();
        if (!id) return;
        
        // 触发头像 Q 弹动画
        const avatar = document.getElementById('work-detail-avatar');
        if (avatar) {
            avatar.classList.remove('is-poking');
            void avatar.offsetWidth; // 触发重绘
            avatar.classList.add('is-poking');
            setTimeout(function() {
                if (avatar) avatar.classList.remove('is-poking');
            }, 300);
        }

        const d = ensureRoleWorkData(id);
        d.goodLuck = clampNumber(d.goodLuck, 0, 100, 0);
        if (d.goodLuck >= 100) {
            spawnDetailFloat('好运已满载✨');
            return;
        }
        d.goodLuck = Math.min(100, d.goodLuck + 5);
        ensureStore().roles[id] = d;
        saveStore();
        spawnDetailFloat('+5% 好运');
        if (d.goodLuck >= 100) spawnDetailFloat('好运已满载✨');
        renderDetail();
    }

    function renderDetail() {
        const roleId = runtime.detailRoleId;
        if (!roleId) return;

        const d = ensureRoleWorkData(roleId);
        const avatar = document.getElementById('work-detail-avatar');
        const name = document.getElementById('work-detail-name');
        const status = document.getElementById('work-detail-status');
        const gold = document.getElementById('work-detail-gold');

        const moodText = document.getElementById('work-detail-mood-text');
        const staminaText = document.getElementById('work-detail-stamina-text');
        const moodFill = document.getElementById('work-detail-mood-fill');
        const staminaFill = document.getElementById('work-detail-stamina-fill');
        const luckText = document.getElementById('work-detail-luck-text');
        const luckFill = document.getElementById('work-detail-luck-fill');
        const luckBar = document.getElementById('work-detail-luck-bar');

        const avatarWrap = document.getElementById('work-detail-avatar-wrap');

        if (avatar) avatar.src = getAvatar(roleId);
        if (name) name.textContent = getDisplayName(roleId);
        if (status) status.textContent = getStatusText(d);
        if (gold) gold.textContent = '总赚取：' + String(clampNumber(d.totalEarned, 0, Number.MAX_SAFE_INTEGER, 0)) + '元';

        const moodVal = clampNumber(d.mood, 0, 100, 100);
        const staminaVal = clampNumber(d.stamina, 0, 100, 100);
        const luckVal = clampNumber(d.goodLuck, 0, 100, 0);
        if (moodText) moodText.textContent = moodDesc(moodVal) + ' · ' + String(moodVal) + '/100';
        if (staminaText) staminaText.textContent = staminaDesc(staminaVal) + ' · ' + String(staminaVal) + '/100';
        if (luckText) luckText.textContent = '好运 · ' + String(luckVal) + '/100';
        setBar(moodFill, moodVal);
        setBar(staminaFill, staminaVal);
        setBar(luckFill, luckVal);
        if (luckBar) {
            if (luckVal >= 100) luckBar.classList.add('full');
            else luckBar.classList.remove('full');
        }

        if (avatarWrap) {
            const shouldBlush = moodVal >= 90;
            if (shouldBlush) avatarWrap.classList.add('blush');
            else avatarWrap.classList.remove('blush');
        }

        updateFeedMenuState();
    }

    function openDetail(roleId) {
        runtime.detailRoleId = roleId;
        runtime.detailFxToken += 1;
        runtime.detailLastAction = '';
        const mask = document.getElementById('work-detail-mask');
        if (mask) mask.style.display = 'flex';
        setFeedMenuVisible(false);
        clearDetailFx();
        renderDetail();
    }

    function closeDetail() {
        runtime.detailRoleId = '';
        runtime.detailFxToken += 1;
        runtime.detailLastAction = '';
        closeConfirm();
        setFeedMenuVisible(false);
        clearDetailFx();
        const mask = document.getElementById('work-detail-mask');
        if (mask) mask.style.display = 'none';
        renderWorkGrid();
    }

    function clearDetailFx() {
        const layer = document.getElementById('work-detail-fx-layer');
        if (layer) layer.innerHTML = '';
    }

    function spawnDetailFloat(text) {
        const layer = document.getElementById('work-detail-fx-layer');
        if (!layer) return;
        const el = document.createElement('div');
        el.className = 'work-detail-float';
        el.textContent = String(text || '');
        el.style.left = String(50 + Math.round((Math.random() - 0.5) * 18)) + '%';
        el.style.top = String(58 + Math.round((Math.random() - 0.5) * 10)) + '%';
        layer.appendChild(el);
        setTimeout(function () {
            try { el.remove(); } catch (e) { }
        }, 1100);
    }

    function openConfirm(title, desc, onOk) {
        runtime.confirmCb = typeof onOk === 'function' ? onOk : null;
        runtime.confirmForRoleId = runtime.detailRoleId || '';
        const titleEl = document.getElementById('work-confirm-title');
        const descEl = document.getElementById('work-confirm-desc');
        if (titleEl) titleEl.textContent = String(title || '');
        if (descEl) descEl.textContent = String(desc || '');
        const mask = document.getElementById('work-confirm-mask');
        if (mask) mask.style.display = 'flex';
    }

    function closeConfirm() {
        runtime.confirmCb = null;
        runtime.confirmForRoleId = '';
        const mask = document.getElementById('work-confirm-mask');
        if (mask) mask.style.display = 'none';
    }

    function applyFeedType(feedType) {
        const roleId = runtime.detailRoleId;
        if (!roleId) return;
        const cfg = feedTypes[feedType];
        if (!cfg) return;

        const cost = cfg.cost;
        if (getGold() < cost) {
            spawnDetailFloat('金币不够');
            updateFeedMenuState();
            return;
        }

        openConfirm(
            '确认投喂',
            '投喂「' + cfg.name + '」将花费 ' + String(cost) + ' 元，确定投喂吗？',
            function () {
                if (!runtime.detailRoleId || runtime.detailRoleId !== roleId) return;
                if (getGold() < cost) {
                    spawnDetailFloat('金币不够');
                    renderDetail();
                    return;
                }

                const pref = analyzeFeedPreference(roleId, cfg.id);
                const nd = ensureRoleWorkData(roleId);
                addWalletExpense(getDisplayName(roleId) + ' · 投喂(' + cfg.name + ')', cost, roleId, 'feed_' + cfg.id);

                nd.stamina = clampNumber(nd.stamina, 0, 100, 100);
                nd.mood = clampNumber(nd.mood, 0, 100, 100);

                let staminaGain = cfg.baseStamina;
                let moodGain = cfg.baseMood;
                let moodPenalty = 0;

                if (pref.liked) {
                    staminaGain += 10;
                    moodGain += 12;
                }

                if (pref.disliked) {
                    const p = Math.random();
                    if (p < 0.55) {
                        moodPenalty = 10;
                        staminaGain = Math.max(3, Math.round(staminaGain * 0.35));
                        moodGain = Math.max(0, Math.round(moodGain * 0.25));
                    }
                }

                nd.stamina = clampNumber(nd.stamina + staminaGain, 0, 100, 100);
                nd.mood = clampNumber(nd.mood + moodGain - moodPenalty, 0, 100, 100);

                ensureStore().roles[roleId] = nd;
                saveStore();

                if (moodPenalty > 0) {
                    spawnDetailFloat(cfg.name + '…有点抗拒 ' + (pref.disliked ? pref.disliked : '') + ' (-' + String(moodPenalty) + ' 心情)');
                } else if (pref.liked) {
                    spawnDetailFloat(cfg.name + ' 超合口味 +' + String(staminaGain) + ' 体力 · +' + String(moodGain) + ' 心情');
                } else {
                    spawnDetailFloat(cfg.name + ' +' + String(staminaGain) + ' 体力 · +' + String(moodGain) + ' 心情');
                }

                renderDetail();
                updateFeedMenuState();
            }
        );
    }

    function applyInteraction(action) {
        const roleId = runtime.detailRoleId;
        if (!roleId) return;
        const d = ensureRoleWorkData(roleId);
        if (!d) return;

        if (action === 'hug') {
            d.stamina = clampNumber(d.stamina, 0, 100, 100);
            d.mood = clampNumber(d.mood, 0, 100, 100);
            d.stamina = clampNumber(d.stamina + 5, 0, 100, 100);
            d.mood = clampNumber(d.mood + 10, 0, 100, 100);
            runtime.detailLastAction = 'hug';
            spawnDetailFloat('🤍 +5 体力 · +10 心情');
        } else if (action === 'kiss') {
            d.stamina = clampNumber(d.stamina, 0, 100, 100);
            d.mood = clampNumber(d.mood, 0, 100, 100);
            d.stamina = clampNumber(d.stamina + 20, 0, 100, 100);
            d.mood = clampNumber(d.mood + 30, 0, 100, 100);
            runtime.detailLastAction = 'kiss';
            spawnDetailFloat('💋 +20 体力 · +30 心情');
        } else {
            return;
        }

        ensureStore().roles[roleId] = d;
        saveStore();
        renderDetail();
    }

    function moodFace(mood) {
        const v = clampNumber(mood, 0, 100, 100);
        if (v >= 80) return '🙂';
        if (v >= 50) return '😐';
        if (v >= 20) return '😕';
        return '😞';
    }

    function openSheet(roleId) {
        runtime.sheetRoleId = roleId;
        const mask = document.getElementById('work-sheet-mask');
        const sheetAvatar = document.getElementById('work-sheet-avatar');
        const sheetName = document.getElementById('work-sheet-name');
        const sheetStatus = document.getElementById('work-sheet-status');
        const staminaFill = document.getElementById('work-sheet-stamina-fill');
        const staminaText = document.getElementById('work-sheet-stamina-text');
        const moodText = document.getElementById('work-sheet-mood-text');
        const jobListWrap = document.getElementById('work-job-list-wrap');

        const d = ensureRoleWorkData(roleId);
        const reco = findBestJob(roleId);
        runtime.sheetRecoJobId = reco && reco.job ? reco.job.id : '';

        if (sheetAvatar) sheetAvatar.src = getAvatar(roleId);
        if (sheetName) sheetName.textContent = getDisplayName(roleId);
        if (sheetStatus) sheetStatus.textContent = getStatusText(d);
        if (staminaFill) staminaFill.style.width = String(clampNumber(d.stamina, 0, 100, 100)) + '%';
        if (staminaText) staminaText.textContent = String(clampNumber(d.stamina, 0, 100, 100));
        if (moodText) moodText.textContent = moodFace(d.mood) + ' ' + String(clampNumber(d.mood, 0, 100, 100));
        if (jobListWrap) jobListWrap.style.display = 'none';

        if (mask) mask.style.display = 'flex';
        renderSheetJobList(false);
    }

    function closeSheet() {
        runtime.sheetRoleId = '';
        runtime.sheetRecoJobId = '';
        const mask = document.getElementById('work-sheet-mask');
        const jobListWrap = document.getElementById('work-job-list-wrap');
        if (jobListWrap) jobListWrap.style.display = 'none';
        if (mask) mask.style.display = 'none';
    }

    function renderSheetJobList(show) {
        const wrap = document.getElementById('work-job-list-wrap');
        const list = document.getElementById('work-job-list');
        if (!wrap || !list) return;
        if (!show) {
            list.innerHTML = '';
            return;
        }
        wrap.style.display = 'block';
        list.innerHTML = '';
        jobs.forEach(function (job) {
            const item = document.createElement('div');
            item.className = 'work-job-item';
            item.setAttribute('data-job-id', job.id);

            const left = document.createElement('div');
            left.className = 'work-job-left';
            const name = document.createElement('div');
            name.className = 'work-job-name';
            name.textContent = (job.emoji ? job.emoji + ' ' : '') + job.name;
            const meta = document.createElement('div');
            meta.className = 'work-job-meta';
            meta.textContent = '¥' + String(job.baseReward) + ' · ' + formatCountdown(job.duration);
            left.appendChild(name);
            left.appendChild(meta);

            const right = document.createElement('div');
            if (runtime.sheetRecoJobId && job.id === runtime.sheetRecoJobId) {
                const reco = document.createElement('div');
                reco.className = 'work-job-reco';
                reco.textContent = '推荐';
                right.appendChild(reco);
            }

            item.appendChild(left);
            item.appendChild(right);
            item.addEventListener('click', function () {
                startWorking(runtime.sheetRoleId, job);
            });
            list.appendChild(item);
        });
    }

    function buildJobPayload(job, roleId) {
        const reco = findBestJob(roleId);
        const score = reco && reco.job && reco.job.id === job.id ? reco.score : scoreJobAgainstPersona(job, contextTextForRole(roleId));
        const matched = score > 0;
        const reward = clampNumber(job.baseReward, 0, 999999999, 0);
        return {
            id: job.id,
            name: job.name,
            baseReward: job.baseReward,
            duration: job.duration,
            tags: Array.isArray(job.tags) ? job.tags.slice() : [],
            emoji: job.emoji || '',
            matchScore: score,
            matched: matched,
            reward: reward
        };
    }

    function startWorking(roleId, job, initialReport) {
        if (!roleId || !job) return;
        const d = ensureRoleWorkData(roleId);
        const now = Date.now();
        d.status = 'working';
        d.startTime = now;
        d.duration = clampNumber(job.duration, 0, Number.MAX_SAFE_INTEGER, 0);
        d.currentJob = buildJobPayload(job, roleId);
        d.workAssignedJob = d.currentJob && d.currentJob.name ? String(d.currentJob.name) : '';
        d.workReportAt = Date.now();
        if (initialReport) {
            d.workReportStatus = 'ready';
            d.workReport = initialReport;
        } else {
            d.workReportStatus = 'idle';
            d.workReport = null;
        }
        ensureStore().roles[roleId] = d;
        saveStore();
        closeSheet();
        renderWorkGrid();
        if (!initialReport) {
            beginGenerateWorkReport(roleId, d.workAssignedJob);
        }
    }

    async function autoPickAndStart(roleId) {
        const btn = document.getElementById('work-btn-auto');
        const oldText = btn ? String(btn.textContent || '') : '';
        if (btn) {
            btn.disabled = true;
            btn.textContent = '正在工作中...';
        }

        const ctx = contextTextForRole(roleId);
        let report = null;
        try {
            report = await beginGenerateWorkReport(roleId, '');
        } catch (e) {
            report = null;
        }
        let job = pickJobForAuto(roleId, report && report.job_name ? report.job_name : '');
        if (!job) job = fallbackCustomJob(roleId, ctx);
        if (!report && job) {
            const last = getLastAutoJobId(roleId);
            if (last && job.id === last) {
                const alt = pickVariedJobForAuto(roleId, last);
                if (alt) job = alt;
            }
        }

        let reportToUse = report;
        if (!reportToUse) {
            const fakeJob = buildJobPayload(job, roleId);
            reportToUse = fallbackWorkReport(roleId, fakeJob && fakeJob.name ? fakeJob.name : '', fakeJob);
        }
        if (reportToUse && reportToUse.job_name) {
            job = Object.assign({}, job, { name: reportToUse.job_name });
        }

        if (btn) {
            btn.disabled = false;
            btn.textContent = oldText || '让 TA 自己选';
        }
        if (job && job.id) setLastAutoJobId(roleId, job.id);
        startWorking(roleId, job, reportToUse);
    }

    function accelerateToFinish(roleId, openNoteAfter) {
        if (!roleId) return;
        const d = ensureRoleWorkData(roleId);
        if (!d || d.status !== 'working') return;
        const dur = clampNumber(d.duration, 0, Number.MAX_SAFE_INTEGER, 0);
        d.startTime = Date.now() - dur;
        d.status = 'finished';
        ensureStore().roles[roleId] = d;
        saveStore();
        renderWorkGrid();
        if (openNoteAfter) {
            openNote(roleId);
        }
    }

    function tickWorkTimers() {
        const grid = document.getElementById('work-role-grid');
        if (!grid) return;
        const roleIds = getRoleIds();
        const now = Date.now();
        let changed = false;

        roleIds.forEach(function (roleId) {
            const d = ensureRoleWorkData(roleId);
            if (d.status !== 'working') return;
            const start = clampNumber(d.startTime, 0, Number.MAX_SAFE_INTEGER, 0);
            const dur = clampNumber(d.duration, 0, Number.MAX_SAFE_INTEGER, 0);
            if (!start || !dur) return;
            const elapsed = now - start;
            const remain = dur - elapsed;
            if (remain <= 0) {
                d.status = 'finished';
                ensureStore().roles[roleId] = d;
                changed = true;
            }

            const fill = document.getElementById('work-progress-fill-' + roleId);
            if (fill) {
                const pct = dur > 0 ? Math.min(1, Math.max(0, elapsed / dur)) : 0;
                fill.style.width = String(Math.floor(pct * 1000) / 10) + '%';
            }
            const cd = document.getElementById('work-countdown-' + roleId);
            if (cd) {
                cd.textContent = formatCountdown(Math.max(0, remain));
            }
        });

        if (changed) {
            saveStore();
            renderWorkGrid();
        }
    }

    function noteTextForJob(currentJob) {
        const matched = !!(currentJob && currentJob.matched);
        const jobName = currentJob && currentJob.name ? String(currentJob.name) : '打工';
        
        // 预设一些更具生活气息的模板作为 AI 失败时的后备
        const calmLines = [
            `刚才${jobName}收尾时，阳光正好斜斜地打在台面上，空气里浮动着细小的尘埃。我把最后一件工具归位，指尖触碰到冰冷的金属，那种真实的触感让心跳都慢了下来。这种不需要言语的时刻，总让人觉得踏实。`,
            `街道上的霓虹灯亮起时，我才意识到${jobName}已经结束了。风里带着一点湿润的泥土气息，远处传来的鸣笛声显得有些遥远。我整理好领口，看着水洼里破碎的倒影，安静地享受这一刻的独处。`
        ];
        const gentleLines = [
            `忙完${jobName}后，我坐在窗边听了一会儿落雨的声音。空气里弥漫着淡淡的草木香气，那种温热的、潮湿的感觉，像是一层轻柔的薄纱。我想起刚才帮过的一位老人，他道谢时的笑容很暖，像冬日里的炉火。`,
            `刚才最后一位客人离开时，带起了一阵细微的风，吹乱了桌上的书页。我把它们一一抚平，感受着纸张在指腹下的纹理。世界在那一刻仿佛静止了，只有光影在墙上缓慢地挪动，温柔得让人想落泪。`
        ];
        const livelyLines = [
            `嘿！刚才做${jobName}的时候简直太有趣了！我盯着那个不停旋转的小风车看了好久，直到它被一阵突如其来的强风吹得快要飞起来。空气里都是自由的味道，连路边的小猫似乎都在跟我打招呼，心情简直好到飞起！`,
            `呼——总算忙完啦！刚才看到路边有个小朋友在吹泡泡，那些五彩斑斓的圆球在夕阳下闪闪发光，啪的一声碎掉时，带出了一股甜甜的香气。这种充满活力的瞬间，真的怎么看都不会腻呢！`
        ];
        const tsundereLines = [
            `别误会，我只是刚好忙完${jobName}，顺便在这个转角停了一下。风吹得有点冷，我把手插进兜里，指尖碰到一张被揉皱的纸条。哼，这种无聊的小插曲……我才没有特意记在心里，只是还没忘记罢了。`,
            `啧，${jobName}这种事也就那样吧。收工时刚好看到天边的云变成了奇怪的形状，像个滑稽的鬼脸。我只是觉得那个颜色还算凑合，才没有盯着看了整整五分钟呢。笨蛋，这只是巧合而已。`
        ];

        let pool = calmLines;
        const meta = getRolePromptMeta(runtime.noteRoleId);
        const tone = pickTone(meta);
        if (tone === 'gentle') pool = gentleLines;
        else if (tone === 'lively') pool = livelyLines;
        else if (tone === 'tsundere') pool = tsundereLines;
        else if (tone === 'snarky') pool = calmLines; // 毒舌暂用沉稳，可后续扩充

        return pool[Math.floor(Math.random() * pool.length)];
    }

    function loadStoryDb() {
        const raw = localStorage.getItem(STORY_KEY);
        const parsed = raw ? safeParse(raw, {}) : {};
        const db = parsed && typeof parsed === 'object' ? parsed : {};
        if (!db.roles || typeof db.roles !== 'object') db.roles = {};
        return db;
    }

    function saveStoryDb(db) {
        try {
            localStorage.setItem(STORY_KEY, JSON.stringify(db));
        } catch (e) { }
    }

    function ensureStoryBucket(db, roleId, jobId) {
        if (!db.roles[roleId]) db.roles[roleId] = { jobs: {} };
        const r = db.roles[roleId];
        if (!r.jobs || typeof r.jobs !== 'object') r.jobs = {};
        if (!Array.isArray(r.allHashes)) r.allHashes = [];
        if (!r.jobs[jobId]) r.jobs[jobId] = { hashes: [], recent: [] };
        const b = r.jobs[jobId];
        if (!Array.isArray(b.hashes)) b.hashes = [];
        if (!Array.isArray(b.recent)) b.recent = [];
        return b;
    }

    function getRolePromptMeta(roleId) {
        const profiles = getProfiles();
        const p = profiles[roleId] || {};
        const persona = typeof p.persona === 'string' ? p.persona.trim() : '';
        const speakingStyle = typeof p.speakingStyle === 'string' ? p.speakingStyle.trim() : '';
        const fallbackPersona = personaTextForRole(roleId);
        const fallbackStyle = typeof p.style === 'string' ? p.style.trim() : '';
        return {
            roleName: getDisplayName(roleId),
            persona: persona || fallbackPersona || '',
            speakingStyle: speakingStyle || fallbackStyle || ''
        };
    }

    function buildWorkStoryPrompt(meta, jobName, avoidTexts) {
        const avoid = Array.isArray(avoidTexts) ? avoidTexts.filter(Boolean).slice(0, 12) : [];
        const avoidBlock = avoid.length ? ('\n请不要与以下内容重复：\n- ' + avoid.join('\n- ')) : '';
        const base = [
            `你现在是${meta.roleName}，人设为${meta.persona || '（未提供）'}。`,
            meta.speakingStyle ? `说话方式/口吻：${meta.speakingStyle}` : '',
            `你刚刚完成了${jobName}的工作。`,
            '请以你的口吻写一段 80-120 字左右的长文案（纸条感内容）。',
            '核心要求：',
            '1. 视角切换：你不是在向用户汇报，你是在自言自语或记录生活瞬间。',
            '2. 严禁指代：禁止提到“你”、“用户”、“主人”或任何指代玩家的词汇。',
            '3. 沉浸感细节：描写一个具体的感官瞬间（光影、气味、路人的背影、声音、温度或手心的触感）。',
            '4. 性格化表达：严格遵守你的性格习惯。沉稳的人要有内敛的观察，活泼的人要有跳跃的情绪，傲娇的人要有别扭的温柔。',
            '5. 禁止术语：不要说“工作很顺利”之类的客套话，直接进入场景描写。',
            '6. 输出格式：长文案 | [画面描述：对应的视觉特写镜头]',
            '示例风格学习：刚才最后一位客人留下的空杯旁，有一枚被遗落的领带夹。我把它收进失物招领盒的时候，指尖蹭到一点还没干透的咖啡渍，苦味散开的速度比想象中要慢。雨快要落下来了，街道两旁的霓虹倒映在水洼里，显得有些支离破碎。这种安静的时刻，倒也不错。 | [画面描述：一张深褐色的木质吧台，边缘放着一个半空的陶瓷杯，背景是模糊的雨夜街道。]',
            avoidBlock
        ].filter(Boolean).join('\n');
        return base;
    }

    function normalizeStoryOutput(raw) {
        const text = String(raw || '').replace(/\r?\n+/g, ' ').trim();
        if (!text) return { story: '', visual: '' };
        const parts = text.split('|');
        const story = (parts[0] || '').trim();
        const visualRaw = parts.slice(1).join('|').trim();
        let visual = visualRaw;
        if (visual && visual.indexOf('画面描述') === -1) {
            visual = '[画面描述：' + visual.replace(/^\[|\]$/g, '').trim() + ']';
        }
        return { story: story, visual: visual };
    }

    function truncateByCodePoints(text, maxLen) {
        const s = String(text || '');
        const arr = Array.from(s);
        if (arr.length <= maxLen) return s;
        return arr.slice(0, maxLen).join('');
    }

    function hashStory(story, visual) {
        const key = String(story || '').trim() + '|' + String(visual || '').trim();
        return hashToPositiveInt(key).toString(36);
    }

    function hasBlockedPhrases(text) {
        const t = String(text || '');
        const blocked = ['诊室糖果', '书架书籍', '超人斗篷', '用户', '主人', '您', '您好'];
        for (let i = 0; i < blocked.length; i++) {
            if (t.indexOf(blocked[i]) !== -1) return true;
        }
        return false;
    }

    function getWorkStoryApiConfig() {
        const baseUrlRaw = localStorage.getItem('api_base_url');
        const apiKey = localStorage.getItem('user_api_key');
        if (!baseUrlRaw || !apiKey) return null;
        const model = localStorage.getItem('selected_model') || "deepseek-chat";
        const temperature = parseFloat(localStorage.getItem('model_temperature')) || 0.9;
        let endpoint = baseUrlRaw.trim();
        if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
        if (!endpoint.includes('/chat/completions')) {
            if (!endpoint.includes('/v1')) endpoint += '/v1';
            endpoint += '/chat/completions';
        }
        return { endpoint, apiKey, model, temperature };
    }

    async function requestAIWorkStory(roleId, jobName, avoidTexts) {
        const cfg = getWorkStoryApiConfig();
        if (!cfg) return null;
        const meta = getRolePromptMeta(roleId);
        const systemPrompt = typeof window.buildRoleJsonTaskPrompt === 'function'
            ? window.buildRoleJsonTaskPrompt('work_story_generation', roleId, {
                maxSummaryLines: 6,
                sceneIntro: '当前场景是角色打工生活便签生成。',
                taskGuidance: '你要生成一段像角色写给自己看的生活感便签，带一点画面特写镜头。',
                outputInstructions: '只输出一行纯文本，不要代码块或解释，格式必须严格是：长文案 | [画面描述：...]'
            })
            : [
                '你是一个“打工生活感便签”生成器。',
                '只输出一行纯文本，不要代码块，不要多余解释。',
                '必须严格遵守：一段话|[画面描述：...] 的格式。',
                '内容要充满呼吸感，描写具体的感官瞬间，字数在 100 字左右。'
            ].join('\n');
        const userPrompt = buildWorkStoryPrompt(meta, jobName, avoidTexts);
        let resp;
        try {
            resp = await fetch(cfg.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + cfg.apiKey
                },
                body: JSON.stringify({
                    model: cfg.model,
                    temperature: 0.9, // 提高随机性
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                })
            });
        } catch (e) {
            return null;
        }
        if (!resp || !resp.ok) return null;
        let json;
        try {
            json = await resp.json();
        } catch (e) {
            return null;
        }
        const content = json && json.choices && json.choices[0] && json.choices[0].message ? json.choices[0].message.content : '';
        return content ? String(content).trim() : null;
    }

    function pickTone(meta) {
        const t = (meta.speakingStyle || meta.persona || '').toString();
        const rules = [
            { keys: ['傲娇', '别扭', '嘴硬'], tone: 'tsundere' },
            { keys: ['活泼', '元气', '开朗', '爱笑'], tone: 'lively' },
            { keys: ['温柔', '治愈', '软', '安抚'], tone: 'gentle' },
            { keys: ['沉稳', '冷静', '理性', '克制'], tone: 'calm' },
            { keys: ['毒舌', '刻薄', '吐槽'], tone: 'snarky' }
        ];
        for (let i = 0; i < rules.length; i++) {
            const r = rules[i];
            for (let k = 0; k < r.keys.length; k++) {
                if (t.indexOf(r.keys[k]) !== -1) return r.tone;
            }
        }
        return 'calm';
    }

    function mockWorkStory(roleId, jobName, jobId) {
        const meta = getRolePromptMeta(roleId);
        const tone = pickTone(meta);
        const seed = hashToPositiveInt(roleId + '|' + jobId + '|' + Date.now().toString(36) + '|' + Math.random().toString(36).slice(2));
        const rand = function (arr) { return arr[seed % arr.length]; };
        const timeList = ['清晨', '午后', '傍晚', '深夜'];
        const time = timeList[seed % timeList.length];

        const sensoryByJob = {
            coffee: { place: '吧台', sensory: ['指尖蹭到的一点咖啡渍', '机器排出的温热蒸汽', '冰块碰撞杯壁的清脆声'], details: ['一个被遗落的领带夹', '窗外渐渐落下的细雨', '还没擦干的木质纹理'] },
            barista: { place: '手冲台', sensory: ['热水穿透粉层时的闷响', '鼻端萦绕的浓郁焦香', '滤纸边缘渗出的水痕'], details: ['水流拉出的纤细白线', '计时器跳动的红色数字', '手冲壶柄上传来的余温'] },
            bakery: { place: '烤炉旁', sensory: ['刚出炉面包那股微甜的麦香', '面粉落在围裙上的轻盈', '烤箱门打开时扑面的热浪'], details: ['面团表面细微的裂纹', '托盘在台面上滑过的声响', '最后一只还没卖掉的羊角包'] },
            dessert: { place: '展示柜前', sensory: ['奶油打发时的绵密触感', '草莓顶端渗出的透明糖浆', '冷柜门缝里漏出的一丝凉气'], details: ['裱花袋挤出的一个小尖角', '勺子在瓷碟上轻敲的声音', '橱窗玻璃上被哈出的雾气'] },
            bookstore: { place: '书架间', sensory: ['旧书页翻动时陈旧的木浆味', '纸张边缘划过指尖的轻微痛感', '阳光穿透落地窗的静谧'], details: ['书架角落积落的一层薄灰', '一本被插反了位置的杂志', '夹在诗集里的半截干花'] }
        };

        const def = { place: '现场', sensory: ['忙碌后手心的微微汗水', '空气里尘埃舞动的轨迹', '远处街道隐约的嘈杂'], details: ['一件被整理好的杂物', '一盏昏黄的灯在角落亮着', '笔尖在纸上滑过的触感'] };
        const scene = sensoryByJob[jobId] || def;

        const sensory = rand(scene.sensory);
        const detail = rand(scene.details);
        const place = scene.place;

        const toneTpl = {
            calm: [
                `${time}${jobName}收工时，${place}只剩下${sensory}。我看着${detail}，那一瞬间的安静让时间都慢了下来。空气里的味道逐渐淡去，这种无需言语的时刻，总让人觉得踏实。`,
                `忙完${jobName}，窗外的天色已经完全暗了。${sensory}还残留在记忆里，而${detail}就在手边。我没急着走，只是在那儿多站了一会儿，听着外面的风声，觉得这种平淡也挺好。`
            ],
            gentle: [
                `${time}的${place}，${sensory}真的很温柔。我轻轻收起${detail}，想起刚才忙碌时的点点滴滴。这种被细小瞬间填满的感觉，像是一股温热的暖流，静静地流过心底。`,
                `做完${jobName}，空气里还留着${sensory}。我把${detail}抚平，动作慢得连自己都觉得不可思议。世界好像突然变得很轻，连呼吸都带着一点甜甜的、安心的味道。`
            ],
            lively: [
                `嘿！${time}${jobName}真的太有意思啦！${sensory}突然蹦了出来，我盯着${detail}发了好久的呆，直到自己笑出声来。这种充满生命力的感觉，真的让人想在${place}转个圈呢！`,
                `收工啦收工啦！刚才在${place}，${sensory}简直是神来之笔。我看到${detail}的时候，脑子里全是奇妙的念头。空气里都是自由的气息，简直太棒了！`
            ],
            tsundere: [
                `哼，别多想，我只是忙完${jobName}刚好看到${sensory}而已。${place}的${detail}也太显眼了，我只是顺手把它弄好，才没有觉得这种感觉还不错。真的是，这种事有什么好记的。`,
                `啧，收工时的${sensory}真是多余。我盯着${detail}看了半天，只是在想怎么处理这种无聊的琐事。哼，这种安静的时刻……虽然不讨厌，但也别指望我夸它。`
            ]
        };

        const pool = toneTpl[tone] || toneTpl.calm;
        const story = rand(pool);
        const visual = `[画面描述：${time}的${place}，${sensory}的细节特写，背景是模糊的${detail}]`;
        return { story: truncateByCodePoints(story, 150), visual: visual };
    }

    async function generateWorkStory(roleId, jobId) {
        const d = ensureRoleWorkData(roleId);
        const jobName = (d && d.currentJob && d.currentJob.name) ? String(d.currentJob.name) : (function () {
            const j = getJobById(jobId);
            return j && j.name ? String(j.name) : '打工';
        })();

        const db = loadStoryDb();
        const bucket = ensureStoryBucket(db, roleId, jobId);
        const roleHashes = db.roles[roleId] && Array.isArray(db.roles[roleId].allHashes) ? db.roles[roleId].allHashes : [];
        const avoidTexts = bucket.recent.slice(-10);

        const attemptMax = 8;
        for (let attempt = 0; attempt < attemptMax; attempt++) {
            let raw = await requestAIWorkStory(roleId, jobName, avoidTexts);
            let out = raw ? normalizeStoryOutput(raw) : null;
            if (!out || !out.story) out = mockWorkStory(roleId, jobName, jobId);

            const story = truncateByCodePoints(String(out.story || '').trim(), 150);
            const visual = String(out.visual || '').trim() || '[画面描述：一张模糊但温柔的瞬间]';
            const packed = story + '|' + visual;
            if (!story || hasBlockedPhrases(packed)) continue;

            const h = hashStory(story, visual);
            if (bucket.hashes.indexOf(h) !== -1) continue;
            if (roleHashes.indexOf(h) !== -1) continue;

            bucket.hashes.push(h);
            roleHashes.push(h);
            bucket.recent.push(packed);
            bucket.hashes = bucket.hashes.slice(-200);
            bucket.recent = bucket.recent.slice(-12);
            db.roles[roleId].allHashes = roleHashes.slice(-400);
            saveStoryDb(db);
            return { story: story, visual: visual };
        }

        const fallback = mockWorkStory(roleId, jobName, jobId);
        const finalHash = hashStory(fallback.story, fallback.visual);
        bucket.hashes.push(finalHash);
        if (db.roles[roleId] && Array.isArray(db.roles[roleId].allHashes)) db.roles[roleId].allHashes.push(finalHash);
        bucket.recent.push(fallback.story + '|' + fallback.visual);
        bucket.hashes = bucket.hashes.slice(-200);
        bucket.recent = bucket.recent.slice(-12);
        if (db.roles[roleId] && Array.isArray(db.roles[roleId].allHashes)) db.roles[roleId].allHashes = db.roles[roleId].allHashes.slice(-400);
        saveStoryDb(db);
        return fallback;
    }

    function setNoteLoading(loading) {
        const loadingEl = document.getElementById('work-note-loading');
        const acceptBtn = document.getElementById('work-note-accept');
        if (loadingEl) loadingEl.style.display = loading ? 'flex' : 'none';
        if (acceptBtn) acceptBtn.disabled = !!loading;
    }

    function pickLuckMultiplier() {
        const r = Math.random();
        if (r < 0.6) return 1.5;
        if (r < 0.9) return 2;
        return 3;
    }

    async function openNote(roleId) {
        const d = ensureRoleWorkData(roleId);
        if (!d || d.status !== 'finished' || !d.currentJob) return;
        runtime.noteRoleId = roleId;
        const reqToken = ++runtime.noteReqToken;
        const jobEl = document.getElementById('work-note-job');
        const diaryEl = document.getElementById('work-note-diary');
        const giftCardEl = document.getElementById('work-note-gift');
        const giftIconEl = document.getElementById('work-note-gift-icon');
        const giftNameEl = document.getElementById('work-note-gift-name');
        const giftDescEl = document.getElementById('work-note-gift-desc');
        const luckEl = document.getElementById('work-note-luck');
        const amountEl = document.getElementById('work-note-amount');
        const mask = document.getElementById('work-note-mask');
        const baseReward = clampNumber(d.currentJob.reward, 0, 999999999, 0);
        if (jobEl) jobEl.textContent = '';
        if (diaryEl) diaryEl.textContent = '';
        if (giftNameEl) giftNameEl.textContent = '';
        if (giftIconEl) giftIconEl.textContent = '';
        if (giftDescEl) giftDescEl.textContent = '';
        if (giftCardEl) giftCardEl.style.display = 'none';
        if (luckEl) {
            luckEl.textContent = '';
            luckEl.style.display = 'none';
        }
        let mult = 1;
        const luckVal = clampNumber(d.goodLuck, 0, 100, 0);
        if (luckVal >= 100) {
            const pending = clampNumber(d.luckMultiplierPending, 1, 3, 1);
            mult = pending > 1 ? pending : pickLuckMultiplier();
            d.luckMultiplierPending = mult;
            d.luckBoostTextPending = '🎉 触发好运加持！获得 ' + String(mult) + ' 倍薪资！';
            ensureStore().roles[roleId] = d;
            saveStore();
            if (luckEl) {
                luckEl.textContent = d.luckBoostTextPending;
                luckEl.style.display = 'block';
            }
        } else {
            if (d.luckMultiplierPending > 1 || d.luckBoostTextPending) {
                d.luckMultiplierPending = 1;
                d.luckBoostTextPending = '';
                ensureStore().roles[roleId] = d;
                saveStore();
            }
        }
        const shown = Math.floor(baseReward * mult);
        if (amountEl) amountEl.textContent = '+ ¥' + String(shown);
        if (mask) mask.style.display = 'flex';
        setNoteLoading(true);

        let report = d.workReportStatus === 'ready' ? d.workReport : null;
        if (!report) {
            const nameHint = d.workAssignedJob || (d.currentJob && d.currentJob.name) || '';
            try {
                report = await beginGenerateWorkReport(roleId, nameHint);
            } catch (e) {
                report = null;
            }
        }
        if (runtime.noteReqToken !== reqToken) return;

        const finalReport = report || fallbackWorkReport(roleId, d.workAssignedJob, d.currentJob);
        runtime.noteReportSnapshot = finalReport && typeof finalReport === 'object' ? finalReport : null;

        if (jobEl) jobEl.textContent = String(finalReport.job_name || d.workAssignedJob || '').trim();
        if (diaryEl) diaryEl.textContent = String(finalReport.diary || '').trim();
        const gift = finalReport && finalReport.gift ? finalReport.gift : null;
        if (gift && giftCardEl) {
            if (giftIconEl) giftIconEl.textContent = String(gift.icon || '🎁');
            if (giftNameEl) giftNameEl.textContent = String(gift.name || '').trim();
            if (giftDescEl) giftDescEl.textContent = String(gift.description || '').trim();
            giftCardEl.style.display = 'flex';
        }
        setNoteLoading(false);
    }

    function closeNote() {
        runtime.noteRoleId = '';
        runtime.noteReqToken += 1;
        runtime.noteReportSnapshot = null;
        const mask = document.getElementById('work-note-mask');
        if (mask) mask.style.display = 'none';
    }

    function appendChatMessage(roleId, text) {
        if (!roleId || !text) return;
        if (!window.chatData || typeof window.chatData !== 'object') window.chatData = {};
        if (!Array.isArray(window.chatData[roleId])) window.chatData[roleId] = [];
        const msg = {
            role: 'ai',
            content: String(text),
            type: 'text',
            timestamp: Date.now()
        };
        window.chatData[roleId].push(msg);
        if (window.currentChatRole === roleId && typeof window.appendMessageToDOM === 'function') {
            try { window.appendMessageToDOM(msg); } catch (e) { }
        }
        if (typeof window.saveData === 'function') {
            try { window.saveData(); } catch (e) { }
        }
    }

    function acceptNote() {
        const roleId = runtime.noteRoleId;
        if (!roleId) return;
        const d = ensureRoleWorkData(roleId);
        if (!d || d.status !== 'finished' || !d.currentJob) {
            closeNote();
            return;
        }
        const job = d.currentJob;
        const baseReward = clampNumber(job.reward, 0, 999999999, 0);
        const fit = d.workReport && typeof d.workReport === 'object' ? normalizeJobFit(d.workReport.job_fit) : '';
        const snap = runtime.noteReportSnapshot && typeof runtime.noteReportSnapshot === 'object' ? runtime.noteReportSnapshot : null;
        const snapJobName = snap && typeof snap.job_name === 'string' ? snap.job_name.trim() : '';
        const snapGift = snap && snap.gift && typeof snap.gift === 'object' ? snap.gift : null;

        let mult = 1;
        const luckVal = clampNumber(d.goodLuck, 0, 100, 0);
        if (luckVal >= 100) {
            mult = clampNumber(d.luckMultiplierPending, 1, 3, 1);
            if (mult <= 1) mult = pickLuckMultiplier();
        }
        const reward = Math.floor(baseReward * mult);
        const boostText = (luckVal >= 100)
            ? ('🎉 触发好运加持！获得 ' + String(mult) + ' 倍薪资！')
            : '';

        closeNote();

        if (snapJobName) pushRoleJobHistory(roleId, snapJobName);
        if (snapGift) pushRoleGift(roleId, snapGift);
        if (snap) pushRoleWorkReportHistory(roleId, snap);
        if (runtime.activeTab === 'records') renderGiftCabinet(roleId);

        d.totalEarned = clampNumber(d.totalEarned, 0, Number.MAX_SAFE_INTEGER, 0);
        d.totalEarned = clampNumber(d.totalEarned + reward, 0, Number.MAX_SAFE_INTEGER, 0);

        d.status = 'idle';
        d.currentJob = null;
        d.startTime = 0;
        d.duration = 0;
        d.stamina = clampNumber(d.stamina, 0, 100, 100);
        d.stamina = Math.max(0, d.stamina - 20);
        d.goodLuck = 0;
        d.luckMultiplierPending = 1;
        d.luckBoostTextPending = '';
        if (fit === '讨厌') {
            d.mood = clampNumber(d.mood - 5, 0, 100, 100);
        } else if (fit === '喜欢') {
            d.mood = clampNumber(d.mood + 10, 0, 100, 100);
            spawnWorkToast('心情 +10');
        }
        d.workReportStatus = 'idle';
        d.workReport = null;
        d.workAssignedJob = '';
        d.workReportAt = 0;
        ensureStore().roles[roleId] = d;
        saveStore();

        if (boostText) spawnWorkToast(boostText);

        if (window.Wallet && typeof window.Wallet.addTransaction === 'function') {
            const title = getDisplayName(roleId) + ' · ' + (job.name || '打工') + '收入';
            try { window.Wallet.addTransaction('income', title, reward, 'work'); } catch (e) { }
        }

        renderWorkGrid();
    }

    function spawnWorkToast(text) {
        const el = document.createElement('div');
        el.className = 'work-toast';
        el.textContent = String(text || '');
        document.body.appendChild(el);
        setTimeout(function () {
            try { el.remove(); } catch (e) { }
        }, 1800);
    }

    function ensureEventBindings() {
        const leaderboardToggle = document.getElementById('work-leaderboard-toggle');
        if (leaderboardToggle && !leaderboardToggle.__workBound) {
            leaderboardToggle.__workBound = true;
            leaderboardToggle.addEventListener('click', toggleLeaderboard);
        }

        const mask = document.getElementById('work-sheet-mask');
        if (mask && !mask.__workBound) {
            mask.__workBound = true;
            mask.addEventListener('click', function (e) {
                if (e && e.target === mask) closeSheet();
            });
        }

        const detailMask = document.getElementById('work-detail-mask');
        if (detailMask && !detailMask.__workBound) {
            detailMask.__workBound = true;
            detailMask.addEventListener('click', function (e) {
                if (e && e.target === detailMask) closeDetail();
            });
        }

        const detailClose = document.getElementById('work-detail-close');
        if (detailClose && !detailClose.__workBound) {
            detailClose.__workBound = true;
            detailClose.addEventListener('click', function () {
                closeDetail();
            });
        }

        const detailAvatar = document.getElementById('work-detail-avatar');
        if (detailAvatar && !detailAvatar.__workBound) {
            detailAvatar.__workBound = true;
            detailAvatar.addEventListener('click', function () {
                const roleId = runtime.detailRoleId;
                if (!roleId) return;
                boostGoodLuck(roleId);
            });
        }

        const detailActions = document.querySelectorAll('.work-detail-action');
        if (detailActions && detailActions.length) {
            detailActions.forEach(function (btn) {
                if (!btn || btn.__workBound) return;
                btn.__workBound = true;
                btn.addEventListener('click', function () {
                    const action = btn.getAttribute('data-action') || '';
                    if (!action) return;
                    if (action === 'feed') {
                        toggleFeedMenu();
                        return;
                    }
                    setFeedMenuVisible(false);
                    applyInteraction(action);
                });
            });
        }

        const feedItems = document.querySelectorAll('.work-feed-item');
        if (feedItems && feedItems.length) {
            feedItems.forEach(function (btn) {
                if (!btn || btn.__workBound) return;
                btn.__workBound = true;
                btn.addEventListener('click', function () {
                    if (btn.disabled) return;
                    const type = btn.getAttribute('data-feed-type') || '';
                    setFeedMenuVisible(false);
                    applyFeedType(type);
                });
            });
        }

        const confirmMask = document.getElementById('work-confirm-mask');
        if (confirmMask && !confirmMask.__workBound) {
            confirmMask.__workBound = true;
            confirmMask.addEventListener('click', function (e) {
                if (e && e.target === confirmMask) closeConfirm();
            });
        }

        const confirmCancel = document.getElementById('work-confirm-cancel');
        if (confirmCancel && !confirmCancel.__workBound) {
            confirmCancel.__workBound = true;
            confirmCancel.addEventListener('click', function () {
                closeConfirm();
            });
        }

        const confirmOk = document.getElementById('work-confirm-ok');
        if (confirmOk && !confirmOk.__workBound) {
            confirmOk.__workBound = true;
            confirmOk.addEventListener('click', function () {
                const cb = runtime.confirmCb;
                closeConfirm();
                if (typeof cb === 'function') cb();
            });
        }

        const autoBtn = document.getElementById('work-btn-auto');
        if (autoBtn && !autoBtn.__workBound) {
            autoBtn.__workBound = true;
            autoBtn.addEventListener('click', function () {
                const roleId = runtime.sheetRoleId;
                if (!roleId) return;
                autoPickAndStart(roleId);
            });
        }

        const manualBtn = document.getElementById('work-btn-manual');
        if (manualBtn && !manualBtn.__workBound) {
            manualBtn.__workBound = true;
            manualBtn.addEventListener('click', function () {
                renderSheetJobList(true);
                const wrap = document.getElementById('work-job-list-wrap');
                if (wrap) wrap.style.display = 'block';
            });
        }

        const noteMask = document.getElementById('work-note-mask');
        if (noteMask && !noteMask.__workBound) {
            noteMask.__workBound = true;
            noteMask.addEventListener('click', function (e) {
                if (e && e.target === noteMask) closeNote();
            });
        }

        const acceptBtn = document.getElementById('work-note-accept');
        if (acceptBtn && !acceptBtn.__workBound) {
            acceptBtn.__workBound = true;
            acceptBtn.addEventListener('click', acceptNote);
        }

        const cabinetProfileBtn = document.getElementById('gift-cabinet-profile-btn');
        if (cabinetProfileBtn && !cabinetProfileBtn.__workBound) {
            cabinetProfileBtn.__workBound = true;
            cabinetProfileBtn.addEventListener('click', function () {
                openGiftRolePicker();
            });
        }

        const cabinetSettings = document.getElementById('gift-cabinet-settings');
        if (cabinetSettings && !cabinetSettings.__workBound) {
            cabinetSettings.__workBound = true;
            cabinetSettings.addEventListener('click', function () {
                openGiftSettings();
            });
        }

        const cabinetRoot = document.getElementById('gift-cabinet-page');
        if (cabinetRoot && !cabinetRoot.__giftPoolBound) {
            cabinetRoot.__giftPoolBound = true;
            cabinetRoot.addEventListener('click', function (e) {
                const target = e && e.target ? e.target : null;
                if (!target) return;
                const cabinetCard = target.closest ? target.closest('.gift-cabinet-card') : null;
                if (cabinetCard) {
                    const roleId = String(runtime.cabinetRoleId || window.currentCharacterId || '').trim();
                    const gifts = getRoleGiftCabinetItems(roleId);
                    const index = parseInt(cabinetCard.getAttribute('data-gift-index') || '-1', 10);
                    const item = Number.isInteger(index) && index >= 0 ? gifts[index] : null;
                    if (item) {
                        openGiftDetail({
                            icon: item.icon || '🎁',
                            name: item.name || '礼物',
                            description: item.description || ''
                        });
                    }
                    return;
                }
                const card = target.closest ? target.closest('.gift-pool-owned-card') : null;
                if (card) {
                    const cardId = card.getAttribute('data-gift-card-id') || '';
                    const roleId = String(runtime.cabinetRoleId || window.currentCharacterId || window.currentChatRole || '').trim();
                    const item = findGiftPoolHistoryCard(roleId, cardId);
                    if (item) {
                        openGiftDetail({
                            icon: item.rarity || '🎁',
                            name: item.title || '词条',
                            description: item.content || ''
                        });
                    }
                    return;
                }
                const btn = target.closest ? target.closest('[data-gift-action]') : null;
                if (!btn) return;
                const action = btn.getAttribute('data-gift-action') || '';
                if (!action) return;
                handleGiftPoolAction(action);
            });
        }

        const roleMask = document.getElementById('gift-role-mask');
        if (roleMask && !roleMask.__workBound) {
            roleMask.__workBound = true;
            roleMask.addEventListener('click', function (e) {
                if (e && e.target === roleMask) closeGiftRolePicker();
            });
        }

        const settingsMask = document.getElementById('gift-settings-mask');
        if (settingsMask && !settingsMask.__workBound) {
            settingsMask.__workBound = true;
            settingsMask.addEventListener('click', function (e) {
                if (e && e.target === settingsMask) closeGiftSettings();
            });
        }

        const settingsUpload = document.getElementById('gift-settings-upload');
        if (settingsUpload && !settingsUpload.__workBound) {
            settingsUpload.__workBound = true;
            settingsUpload.addEventListener('click', function () {
                const input = document.getElementById('gift-bg-input');
                if (!input) return;
                input.value = '';
                input.click();
            });
        }

        const settingsReset = document.getElementById('gift-settings-reset');
        if (settingsReset && !settingsReset.__workBound) {
            settingsReset.__workBound = true;
            settingsReset.addEventListener('click', function () {
                clearGiftCabinetBackground(runtime.cabinetRoleId || window.currentCharacterId || '');
                renderGiftCabinet(runtime.cabinetRoleId || window.currentCharacterId || '');
                closeGiftSettings();
            });
        }

        const bgInput = document.getElementById('gift-bg-input');
        if (bgInput && !bgInput.__workBound) {
            bgInput.__workBound = true;
            bgInput.addEventListener('change', function () {
                const file = bgInput.files && bgInput.files[0] ? bgInput.files[0] : null;
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function () {
                    const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                    if (!dataUrl) return;
                    const roleId = runtime.cabinetRoleId || window.currentCharacterId || '';
                    if (!roleId) return;
                    applyGiftCabinetBackground(roleId, dataUrl);
                    renderGiftCabinet(roleId);
                    closeGiftSettings();
                };
                try { reader.readAsDataURL(file); } catch (e) { }
            });
        }

        const giftMask = document.getElementById('gift-detail-mask');
        if (giftMask && !giftMask.__workBound) {
            giftMask.__workBound = true;
            giftMask.addEventListener('click', function (e) {
                if (e && e.target === giftMask) closeGiftDetail();
            });
        }

        const giftClose = document.getElementById('gift-detail-close');
        if (giftClose && !giftClose.__workBound) {
            giftClose.__workBound = true;
            giftClose.addEventListener('click', closeGiftDetail);
        }

        ensureFamilyCardUI();

        const familySendBtn = document.getElementById('wallet-family-send-btn');
        if (familySendBtn && !familySendBtn.__workBound) {
            familySendBtn.__workBound = true;
            familySendBtn.addEventListener('click', function () {
                openFamilyCardPicker();
            });
        }

        const familyPickerMask = document.getElementById('wallet-family-picker-mask');
        if (familyPickerMask && !familyPickerMask.__workBound) {
            familyPickerMask.__workBound = true;
            familyPickerMask.addEventListener('click', function (e) {
                if (e && e.target === familyPickerMask) closeFamilyCardPicker();
            });
        }

        const familyPickerSend = document.getElementById('wallet-family-picker-send');
        if (familyPickerSend && !familyPickerSend.__workBound) {
            familyPickerSend.__workBound = true;
            familyPickerSend.addEventListener('click', function () {
                const id = String(runtime.familyPickerSelectedRoleId || '').trim();
                if (!id) return;
                openFamilyCardAmount(id);
            });
        }

        const familyAmountMask = document.getElementById('wallet-family-amount-mask');
        if (familyAmountMask && !familyAmountMask.__workBound) {
            familyAmountMask.__workBound = true;
            familyAmountMask.addEventListener('click', function (e) {
                if (e && e.target === familyAmountMask) closeFamilyCardAmount();
            });
        }

        const familyAmountCancel = document.getElementById('wallet-family-amount-cancel');
        if (familyAmountCancel && !familyAmountCancel.__workBound) {
            familyAmountCancel.__workBound = true;
            familyAmountCancel.addEventListener('click', function () {
                closeFamilyCardAmount();
            });
        }

        const familyAmountOk = document.getElementById('wallet-family-amount-ok');
        if (familyAmountOk && !familyAmountOk.__workBound) {
            familyAmountOk.__workBound = true;
            familyAmountOk.addEventListener('click', function () {
                confirmFamilyCardSend();
            });
        }

        const tabBar = document.querySelector('.wallet-tab-bar');
        if (tabBar && !tabBar.__workBound) {
            tabBar.__workBound = true;
            tabBar.addEventListener('click', function (e) {
                const target = e && e.target ? e.target : null;
                if (!target) return;
                const item = target.closest ? target.closest('.wallet-tab-item') : null;
                if (!item) return;
                const tab = item.getAttribute('data-wallet-tab') || '';
                if (!tab) return;
                setWalletTab(tab);
            });
        }
    }

    function startTicker() {
        if (runtime.tickerId) return;
        runtime.tickerId = setInterval(function () {
            if (!getWalletVisible()) return;
            if (runtime.activeTab !== 'work') return;
            tickWorkTimers();
        }, 1000);
    }

    function init() {
        ensureStore();
        ensureEventBindings();
        startTicker();
        setWalletTab('home');
        try {
            const roleIds = getRoleIds();
            roleIds.forEach(function (id) { ensureRoleWorkData(id); });
            saveStore();
        } catch (e) { }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.WorkSystem = {
        render: renderWorkGrid,
        openSheet: openSheet,
        openGiftCabinet: openGiftCabinet
    };
    window.openGiftCabinet = openGiftCabinet;
    window.openGiftPoolPage = openGiftPoolPage;
    window.GiftPoolSystem = {
        open: openGiftPoolPage,
        openCabinet: openGiftCabinet,
        render: renderGiftPoolPage,
        recordChatTurn: recordGiftPoolChatTurn,
        generate: generateGiftPool,
        draw: drawGiftPool,
        showModal: openGiftPoolModal,
        closeModal: closeGiftPoolModal,
        ask: showGiftPoolAskModal,
        getState: getRoleGiftPoolState,
        close: closeGiftPoolPage
    };
    window.recordGiftPoolChatTurn = recordGiftPoolChatTurn;
    window.getGiftTodoState = getRoleGiftTaskState;
    window.saveGiftTodoState = saveRoleGiftTaskState;
    window.buildGiftTodoPromptText = buildGiftTodoPromptText;
    window.setGiftDrawOffer = setGiftDrawOffer;
    window.clearGiftDrawOffer = clearGiftDrawOffer;
    window.applyGiftTodoAction = applyGiftTodoAction;
    window.queueGiftDrawReaction = queueGiftDrawReaction;
})();
