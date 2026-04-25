const COUPLE_QA_STORAGE_KEY = 'couple_space_qa_progress_v1';
const COUPLE_QA_ROLE_KEY_SEP = '__roleId__';

let coupleQaState = null;
let coupleQaInitialized = false;
let coupleQaInitInFlight = null;
let coupleQaStoreInstance = null;
let coupleQaRoleId = '';
let coupleQaPartnerGenerateInFlight = false;
let coupleQaPartnerGenerateToken = 0;
let coupleQaTestResetDoneOnce = false;

function getCoupleQaStore() {
    if (coupleQaStoreInstance) return coupleQaStoreInstance;
    try {
        const pw = window.parent && window.parent !== window ? window.parent : null;
        const lib =
            (pw && pw.localforage && typeof pw.localforage.createInstance === 'function')
                ? pw.localforage
                : (window.localforage && typeof window.localforage.createInstance === 'function')
                    ? window.localforage
                    : null;
        if (!lib) return null;
        coupleQaStoreInstance = lib.createInstance({ name: 'shubao_large_store_v1', storeName: 'couple_space_qa' });
        return coupleQaStoreInstance;
    } catch (e) {
        return null;
    }
}

function getCoupleQaLinkedRoleId() {
    try {
        if (typeof getCoupleLinkState === 'function') {
            const link = getCoupleLinkState();
            if (link && link.hasCoupleLinked && link.roleId) return String(link.roleId || '').trim();
        }
    } catch (e) { }
    try {
        const has = localStorage.getItem('couple_has_linked_v1') === 'true';
        const roleId = String(localStorage.getItem('couple_linked_role_id_v1') || '').trim();
        return has && roleId ? roleId : '';
    } catch (e2) {
        return '';
    }
}

function buildCoupleQaRoleKey(baseKey, roleId) {
    const k = String(baseKey || '').trim();
    const rid = String(roleId || '').trim();
    if (!k) return '';
    if (!rid) return k;
    if (k.indexOf(COUPLE_QA_ROLE_KEY_SEP) !== -1) return k;
    return k + COUPLE_QA_ROLE_KEY_SEP + rid;
}

function coupleQaSafeJsonParse(text, fallback) {
    try {
        return JSON.parse(text);
    } catch (e) {
        return fallback;
    }
}

async function coupleQaReadRaw(roleId) {
    const rid = String(roleId || '').trim();
    const scopedKey = buildCoupleQaRoleKey(COUPLE_QA_STORAGE_KEY, rid);
    const store = getCoupleQaStore();
    if (store) {
        try {
            const v = await store.getItem(scopedKey);
            if (v !== null && v !== undefined) return v;
        } catch (e) { }
        if (rid && scopedKey !== COUPLE_QA_STORAGE_KEY) {
            try {
                const legacy = await store.getItem(COUPLE_QA_STORAGE_KEY);
                if (legacy !== null && legacy !== undefined) {
                    await store.setItem(scopedKey, legacy);
                    await store.removeItem(COUPLE_QA_STORAGE_KEY);
                    return legacy;
                }
            } catch (e2) { }
        }
    }
    try {
        const raw = localStorage.getItem(scopedKey);
        if (!raw && rid && scopedKey !== COUPLE_QA_STORAGE_KEY) {
            const legacyRaw = localStorage.getItem(COUPLE_QA_STORAGE_KEY);
            if (legacyRaw) {
                const legacyParsed = coupleQaSafeJsonParse(legacyRaw, null);
                if (legacyParsed && typeof legacyParsed === 'object') {
                    try { localStorage.setItem(scopedKey, JSON.stringify(legacyParsed)); } catch (e3) { }
                    try { localStorage.removeItem(COUPLE_QA_STORAGE_KEY); } catch (e4) { }
                    return legacyParsed;
                }
            }
        }
        if (!raw) return null;
        const parsed = coupleQaSafeJsonParse(raw, null);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch (e2) { }
    return null;
}

async function coupleQaWriteRaw(roleId, value) {
    const rid = String(roleId || '').trim();
    const scopedKey = buildCoupleQaRoleKey(COUPLE_QA_STORAGE_KEY, rid);
    const store = getCoupleQaStore();
    if (store) {
        try {
            await store.setItem(scopedKey, value);
        } catch (e) { }
    }
    try {
        localStorage.setItem(scopedKey, JSON.stringify(value));
    } catch (e2) { }
}

async function coupleQaRemoveRaw(roleId) {
    const rid = String(roleId || '').trim();
    const scopedKey = buildCoupleQaRoleKey(COUPLE_QA_STORAGE_KEY, rid);
    const store = getCoupleQaStore();
    if (store) {
        try { await store.removeItem(COUPLE_QA_STORAGE_KEY); } catch (e0) { }
        try { await store.removeItem(scopedKey); } catch (e1) { }
    }
    try { localStorage.removeItem(COUPLE_QA_STORAGE_KEY); } catch (e2) { }
    try { localStorage.removeItem(scopedKey); } catch (e3) { }
}

function buildDefaultCoupleQaState() {
    return {
        currentQuestionIndex: 0,
        isCurrentAnswered: false,
        lastAnsweredTime: 0,
        hasPushed: false,
        myAnswer: '',
        partnerAnswer: '',
        partnerAnswerGenerated: false,
        partnerAnswerGeneratedTime: 0
    };
}

function getQaBank() {
    try {
        if (typeof questionBank !== 'undefined' && Array.isArray(questionBank)) {
            return questionBank;
        }
    } catch (e) { }
    const bank = typeof window.questionBank !== 'undefined' && Array.isArray(window.questionBank)
        ? window.questionBank
        : [];
    return bank;
}

function coupleQaPad2(n) {
    return String(n).padStart(2, '0');
}

function coupleQaFormatDate(ts) {
    const d = ts ? new Date(ts) : new Date();
    if (!Number.isFinite(d.getTime())) return '';
    const y = d.getFullYear();
    const m = coupleQaPad2(d.getMonth() + 1);
    const da = coupleQaPad2(d.getDate());
    return y + '.' + m + '.' + da;
}

function hasPassedNextDayEight(lastTs) {
    const t = Number(lastTs || 0);
    if (!Number.isFinite(t) || !t) return false;
    const d = new Date(t);
    if (!Number.isFinite(d.getTime())) return false;
    const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const gate = base.getTime() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000;
    return Date.now() >= gate;
}

async function maybeAdvanceCoupleQaByTime() {
    const bank = getQaBank();
    if (!coupleQaState || !Array.isArray(bank) || !bank.length) return;
    if (!coupleQaState.isCurrentAnswered) return;
    if (coupleQaState.currentQuestionIndex === 0) return;
    if (!hasPassedNextDayEight(coupleQaState.lastAnsweredTime)) return;
    if (coupleQaState.currentQuestionIndex >= bank.length - 1) return;
    coupleQaState.currentQuestionIndex += 1;
    coupleQaState.isCurrentAnswered = false;
    coupleQaState.lastAnsweredTime = 0;
    coupleQaState.hasPushed = false;
    coupleQaState.myAnswer = '';
    coupleQaState.partnerAnswer = '';
    coupleQaState.partnerAnswerGenerated = false;
    coupleQaState.partnerAnswerGeneratedTime = 0;
    await coupleQaWriteRaw(coupleQaRoleId, coupleQaState);
}

function normalizeCoupleQaState(raw) {
    const base = buildDefaultCoupleQaState();
    if (raw && typeof raw === 'object') {
        if (typeof raw.currentQuestionIndex === 'number') base.currentQuestionIndex = Math.max(0, raw.currentQuestionIndex);
        if (typeof raw.isCurrentAnswered === 'boolean') base.isCurrentAnswered = raw.isCurrentAnswered;
        if (raw.lastAnsweredTime) {
            const n = Number(raw.lastAnsweredTime);
            base.lastAnsweredTime = Number.isFinite(n) ? n : 0;
        }
        if (typeof raw.hasPushed === 'boolean') base.hasPushed = raw.hasPushed;
        if (typeof raw.myAnswer === 'string') base.myAnswer = raw.myAnswer;
        if (typeof raw.partnerAnswer === 'string') base.partnerAnswer = raw.partnerAnswer;
        if (typeof raw.partnerAnswerGenerated === 'boolean') base.partnerAnswerGenerated = raw.partnerAnswerGenerated;
        if (raw.partnerAnswerGeneratedTime) {
            const n = Number(raw.partnerAnswerGeneratedTime);
            base.partnerAnswerGeneratedTime = Number.isFinite(n) ? n : 0;
        }
    }
    if (!base.partnerAnswerGenerated && base.partnerAnswer && base.partnerAnswer.trim()) {
        base.partnerAnswerGenerated = true;
        if (!base.partnerAnswerGeneratedTime) base.partnerAnswerGeneratedTime = base.lastAnsweredTime || Date.now();
    }
    return base;
}

async function ensureCoupleQaState(roleId) {
    const rid = String(roleId || '').trim();
    if (coupleQaInitialized && coupleQaState && coupleQaRoleId === rid) return coupleQaState;
    if (coupleQaInitInFlight) return coupleQaInitInFlight;
    coupleQaInitInFlight = (async () => {
        coupleQaRoleId = rid;
        const bank = getQaBank();
        const total = Array.isArray(bank) ? bank.length : 0;
        const raw = await coupleQaReadRaw(rid);
        const base = normalizeCoupleQaState(raw);
        if (total > 0) base.currentQuestionIndex = Math.min(Math.max(0, base.currentQuestionIndex), total - 1);
        coupleQaState = base;
        await maybeAdvanceCoupleQaByTime();
        coupleQaInitialized = true;
        coupleQaInitInFlight = null;
        return coupleQaState;
    })();
    return coupleQaInitInFlight;
}

function getCurrentQaQuestion() {
    const bank = getQaBank();
    if (!Array.isArray(bank) || !bank.length) return null;
    const idx = Number(coupleQaState && coupleQaState.currentQuestionIndex);
    const safeIdx = Number.isFinite(idx) && idx >= 0 && idx < bank.length ? idx : 0;
    return bank[safeIdx] || null;
}

function looksLikeLegacyMockPartnerAnswer(text) {
    const t = String(text || '').trim();
    if (!t) return false;
    if (t.indexOf('看到这个问题的时候，我第一时间想到的是你') !== -1) return true;
    if (t.indexOf('题目是「') !== -1 && t.indexOf('以后我想慢慢当面和你聊更多细节') !== -1) return true;
    return false;
}

async function resetCoupleQaProgressForTest(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return false;
    await ensureCoupleQaState(rid);
    if (!coupleQaState) return false;
    const keepIndex = Number(coupleQaState.currentQuestionIndex);
    const next = buildDefaultCoupleQaState();
    next.currentQuestionIndex = Number.isFinite(keepIndex) && keepIndex >= 0 ? keepIndex : 0;
    coupleQaState = next;
    coupleQaInitialized = true;
    coupleQaRoleId = rid;
    await coupleQaWriteRaw(rid, coupleQaState);
    renderCoupleQaUi();
    return true;
}

function getParentWindowForCoupleQa() {
    try {
        const pw = window.parent && window.parent !== window ? window.parent : null;
        return pw || window;
    } catch (e) {
        return window;
    }
}

function getCoupleQaDisplayInfo() {
    const userNameEl = document.getElementById('name-user');
    const roleNameEl = document.getElementById('name-role');
    const userName = userNameEl ? String(userNameEl.textContent || '').trim() : '';
    const roleName = roleNameEl ? String(roleNameEl.textContent || '').trim() : '';
    const userAvatarImg = document.getElementById('avatar-user');
    const roleAvatarImg = document.getElementById('avatar-role');
    const userAvatar = userAvatarImg ? String(userAvatarImg.getAttribute('src') || userAvatarImg.src || '').trim() : '';
    const roleAvatar = roleAvatarImg ? String(roleAvatarImg.getAttribute('src') || roleAvatarImg.src || '').trim() : '';
    const fallbackUserName = String(localStorage.getItem('user_name') || '').trim() || '我';
    return {
        userName: userName || fallbackUserName,
        roleName: roleName || 'Ta',
        userAvatar,
        roleAvatar
    };
}

function syncCoupleQaHeaderInfo() {
    const info = getCoupleQaDisplayInfo();
    const userNameEl = document.getElementById('qa-user-name');
    const userAvatarEl = document.getElementById('qa-user-avatar');
    const roleNameEl = document.getElementById('qa-partner-name');
    const roleAvatarEl = document.getElementById('qa-partner-avatar');
    if (userNameEl) userNameEl.textContent = info.userName;
    if (roleNameEl) roleNameEl.textContent = info.roleName;
    if (userAvatarEl) {
        const src = info.userAvatar || '';
        if (src) userAvatarEl.src = src;
        userAvatarEl.style.visibility = src ? 'visible' : 'hidden';
    }
    if (roleAvatarEl) {
        const src = info.roleAvatar || '';
        if (src) roleAvatarEl.src = src;
        roleAvatarEl.style.visibility = src ? 'visible' : 'hidden';
    }
}

function showCoupleQaToast(text) {
    const el = document.getElementById('qa-mini-toast');
    if (!el) return;
    el.textContent = String(text || '');
    el.hidden = false;
}

function hideCoupleQaToast() {
    const el = document.getElementById('qa-mini-toast');
    if (!el) return;
    el.hidden = true;
}

function normalizeCoupleQaAiText(text) {
    try {
        if (typeof normalizeAiReplyText === 'function') {
            return String(normalizeAiReplyText(text) || '').trim();
        }
    } catch (e) { }
    return String(text || '').trim();
}

async function callCoupleQaLLM(roleId, questionText, userAnswer) {
    const pw = getParentWindowForCoupleQa();
    if (!pw || typeof pw.callAI !== 'function') {
        throw new Error('AI 接口未初始化');
    }
    const rid = String(roleId || '').trim();
    if (!rid) throw new Error('尚未绑定情侣角色');

    const prevRole = pw.currentChatRole;
    pw.__offlineSyncInProgress = true;
    pw.currentChatRole = rid;
    try {
        const extraSystem =
            '场景：你正在进行「情侣问答」。\n' +
            '请你以恋人身份、第一人称，温柔自然地回应我刚刚的回答。\n' +
            '输出时只输出你的回答正文，不要加任何前缀、解释或格式标记。\n' +
            '字数控制在 60~160 字，避免使用列点。';
        let systemPrompt = '';
        if (typeof pw.buildRoleLitePrompt === 'function') {
            systemPrompt = String(pw.buildRoleLitePrompt('couple_qa_answer', rid, {
                includeContinuity: true,
                maxSummaryLines: 10,
                sceneIntro: '当前场景是情侣问答里的角色回答。',
                taskGuidance: extraSystem,
                outputInstructions: '只输出你的回答正文，不要加前缀、解释、JSON、代码块或格式标记。字数控制在 60~160 字。'
            }) || '').trim();
        } else {
            try {
                if (typeof buildRoleSystemPrompt === 'function') {
                    systemPrompt = String(buildRoleSystemPrompt(rid) || '').trim();
                }
            } catch (e0) { }
            systemPrompt = systemPrompt ? (systemPrompt + '\n\n' + extraSystem) : extraSystem;
        }

        let history = [];
        try {
            if (typeof readWechatChatHistory === 'function' && typeof cleanChatHistoryForMemory === 'function' && typeof buildHistoryForApi === 'function') {
                const rawHistory = readWechatChatHistory(rid);
                const clean = cleanChatHistoryForMemory(rawHistory);
                history = buildHistoryForApi(rid, clean);
            }
        } catch (e1) {
            history = [];
        }

        const userPrompt =
            '今日问题：\n' + String(questionText || '').trim() + '\n\n' +
            '我的回答：\n' + String(userAnswer || '').trim();

        const text = await new Promise((resolve, reject) => {
            pw.callAI(
                systemPrompt,
                Array.isArray(history) ? history : [],
                userPrompt,
                (t) => resolve(t),
                (err) => reject(new Error(String(err || '请求失败')))
            );
        });
        return String(text || '');
    } finally {
        pw.__offlineSyncInProgress = false;
        pw.currentChatRole = prevRole;
    }
}

function bindCoupleQaPartnerCardClick() {
    const partnerCard = document.getElementById('qa-partner-card');
    if (!partnerCard || partnerCard.dataset.qaBound === '1') return;
    partnerCard.dataset.qaBound = '1';
    partnerCard.addEventListener('click', async () => {
        if (!coupleQaState) return;
        if (!coupleQaState.isCurrentAnswered) return;
        if (coupleQaState.partnerAnswerGenerated) return;
        if (coupleQaPartnerGenerateInFlight) return;
        const q = getCurrentQaQuestion();
        const questionText = q && q.text ? String(q.text) : '';
        const myAnswer = String(coupleQaState.myAnswer || '').trim();
        if (!questionText || !myAnswer) return;

        const rid = getCoupleQaLinkedRoleId();
        if (!rid) {
            alert('尚未绑定情侣角色');
            return;
        }

        coupleQaPartnerGenerateInFlight = true;
        const token = ++coupleQaPartnerGenerateToken;
        const info = getCoupleQaDisplayInfo();
        showCoupleQaToast((info.roleName || 'Ta') + '正在回答中');
        renderCoupleQaUi();
        try {
            const rawText = await callCoupleQaLLM(rid, questionText, myAnswer);
            if (token !== coupleQaPartnerGenerateToken) return;
            const clean = normalizeCoupleQaAiText(rawText);
            if (!clean) throw new Error('AI 返回为空');
            coupleQaState.partnerAnswer = clean;
            coupleQaState.partnerAnswerGenerated = true;
            coupleQaState.partnerAnswerGeneratedTime = Date.now();
            await coupleQaWriteRaw(coupleQaRoleId, coupleQaState);
            hideCoupleQaToast();
            coupleQaPartnerGenerateInFlight = false;
            renderCoupleQaUi();
        } catch (e) {
            if (token !== coupleQaPartnerGenerateToken) return;
            hideCoupleQaToast();
            coupleQaPartnerGenerateInFlight = false;
            renderCoupleQaUi();
            alert(String(e && e.message ? e.message : e || '请求失败'));
        }
    });
}

function renderCoupleQaUi() {
    const modal = document.getElementById('couple-qa-modal');
    if (!modal || !coupleQaState) return;
    const bank = getQaBank();
    const hasQuestions = Array.isArray(bank) && bank.length > 0;
    const dateEl = document.getElementById('qa-date');
    const textEl = document.getElementById('qa-text');
    const paperEl = document.getElementById('qa-paper');
    const printBtn = document.getElementById('qa-print-btn');
    const interactionArea = document.getElementById('qa-interaction-area');
    const myInput = document.getElementById('qa-my-input');
    const myDisplay = document.getElementById('qa-my-display');
    const submitBtn = document.getElementById('qa-submit-btn');
    const partnerCard = document.getElementById('qa-partner-card');
    const partnerContent = document.getElementById('qa-partner-content');
    const tipText = document.getElementById('qa-tip-text');
    const lockTextEl = document.getElementById('qa-lock-text');

    if (!dateEl || !textEl || !paperEl || !printBtn || !interactionArea || !myInput || !myDisplay || !submitBtn || !partnerCard || !partnerContent || !tipText) {
        return;
    }

    syncCoupleQaHeaderInfo();

    dateEl.textContent = coupleQaFormatDate(coupleQaState.lastAnsweredTime || Date.now());

    if (!hasQuestions) {
        textEl.textContent = '今天还没有准备好新的问题';
        printBtn.textContent = 'WAIT';
        printBtn.classList.add('printed');
        paperEl.classList.add('show');
        interactionArea.classList.add('visible');
        myInput.style.display = 'none';
        myDisplay.style.display = 'none';
        submitBtn.style.display = 'none';
        partnerCard.classList.remove('locked');
        partnerCard.classList.add('unlocked');
        partnerCard.classList.remove('can-generate');
        partnerCard.classList.remove('generating');
        partnerContent.textContent = '题库为空时，这里会显示一个温柔的小提示。';
        tipText.textContent = '';
        if (lockTextEl) lockTextEl.textContent = '';
        return;
    }

    const q = getCurrentQaQuestion();
    textEl.textContent = q && q.text ? String(q.text) : '';

    const isInitialFirstQuestion =
        coupleQaState.currentQuestionIndex === 0 &&
        !coupleQaState.isCurrentAnswered &&
        !coupleQaState.hasPushed &&
        !coupleQaState.lastAnsweredTime;

    if (isInitialFirstQuestion) {
        paperEl.classList.add('show');
        interactionArea.classList.add('visible');
    } else if (coupleQaState.hasPushed || coupleQaState.isCurrentAnswered) {
        paperEl.classList.add('show');
        interactionArea.classList.add('visible');
    } else {
        paperEl.classList.remove('show');
        interactionArea.classList.remove('visible');
    }

    const info = getCoupleQaDisplayInfo();
    if (!coupleQaState.partnerAnswerGenerated) {
        partnerContent.textContent = '';
    } else {
        partnerContent.textContent = String(coupleQaState.partnerAnswer || '').trim();
    }

    if (coupleQaState.isCurrentAnswered) {
        printBtn.textContent = 'WAIT';
        printBtn.classList.add('printed');
        myInput.style.display = 'none';
        submitBtn.style.display = 'none';
        myDisplay.style.display = coupleQaState.myAnswer && coupleQaState.myAnswer.trim() ? 'block' : 'none';
        myDisplay.textContent = coupleQaState.myAnswer || '';
        submitBtn.disabled = true;
        if (coupleQaState.partnerAnswerGenerated) {
            partnerCard.classList.remove('locked');
            partnerCard.classList.add('unlocked');
            partnerCard.classList.remove('can-generate');
            partnerCard.classList.remove('generating');
            tipText.textContent = '今日已完成，明天早上 8:00 来看新问题哦';
            if (lockTextEl) lockTextEl.textContent = '';
        } else {
            partnerCard.classList.add('locked');
            partnerCard.classList.remove('unlocked');
            partnerCard.classList.toggle('generating', coupleQaPartnerGenerateInFlight);
            partnerCard.classList.toggle('can-generate', !coupleQaPartnerGenerateInFlight);
            tipText.textContent = '点一下让 Ta 回答';
            if (lockTextEl) {
                lockTextEl.textContent = coupleQaPartnerGenerateInFlight
                    ? '正在回答中'
                    : ('点击让 ' + (info.roleName || 'Ta') + ' 回答');
            }
        }
    } else {
        if (coupleQaState.hasPushed) {
            printBtn.textContent = 'OK';
            printBtn.classList.add('printed');
        } else {
            printBtn.textContent = 'PUSH';
            printBtn.classList.remove('printed');
        }
        myInput.style.display = 'block';
        myInput.value = coupleQaState.myAnswer || '';
        myDisplay.style.display = 'none';
        submitBtn.style.display = 'block';
        submitBtn.disabled = false;
        partnerCard.classList.add('locked');
        partnerCard.classList.remove('unlocked');
        partnerCard.classList.remove('can-generate');
        partnerCard.classList.remove('generating');
        tipText.textContent = '';
        if (lockTextEl) lockTextEl.textContent = '回答后解锁对方心声';
    }
}

async function openCoupleQAModal() {
    const modal = document.getElementById('couple-qa-modal');
    if (!modal) return;
    const rid = getCoupleQaLinkedRoleId();
    if (!rid) {
        alert('尚未绑定情侣角色');
        return;
    }
    await ensureCoupleQaState(rid);
    if (!coupleQaTestResetDoneOnce && coupleQaState && looksLikeLegacyMockPartnerAnswer(coupleQaState.partnerAnswer)) {
        coupleQaTestResetDoneOnce = true;
        await resetCoupleQaProgressForTest(rid);
    }
    bindCoupleQaPartnerCardClick();
    renderCoupleQaUi();
    requestAnimationFrame(function () {
        modal.classList.add('active');
    });
}

function closeCoupleQAModal() {
    const modal = document.getElementById('couple-qa-modal');
    if (!modal) return;
    modal.classList.remove('active');
    hideCoupleQaToast();
}

async function handleQaPrint() {
    const rid = getCoupleQaLinkedRoleId();
    if (!rid) {
        alert('尚未绑定情侣角色');
        return;
    }
    await ensureCoupleQaState(rid);
    if (!coupleQaState) return;
    if (coupleQaState.isCurrentAnswered) return;
    if (coupleQaState.hasPushed) {
        renderCoupleQaUi();
        return;
    }
    coupleQaState.hasPushed = true;
    await coupleQaWriteRaw(coupleQaRoleId, coupleQaState);
    const paperEl = document.getElementById('qa-paper');
    const interactionArea = document.getElementById('qa-interaction-area');
    const printBtn = document.getElementById('qa-print-btn');
    if (printBtn) {
        printBtn.textContent = 'OK';
        printBtn.classList.add('printed');
    }
    if (paperEl) {
        paperEl.classList.add('show');
    }
    if (interactionArea) {
        interactionArea.classList.remove('visible');
        setTimeout(function () {
            interactionArea.classList.add('visible');
        }, 1500);
    }
    renderCoupleQaUi();
}

async function submitCoupleQaAnswer() {
    const rid = getCoupleQaLinkedRoleId();
    if (!rid) {
        alert('尚未绑定情侣角色');
        return;
    }
    await ensureCoupleQaState(rid);
    if (!coupleQaState) return;
    const input = document.getElementById('qa-my-input');
    if (!input) return;
    const raw = String(input.value || '').trim();
    if (!raw) {
        alert('请先写下你的想法哦');
        return;
    }
    coupleQaState.isCurrentAnswered = true;
    coupleQaState.myAnswer = raw;
    coupleQaState.lastAnsweredTime = Date.now();
    coupleQaState.partnerAnswer = '';
    coupleQaState.partnerAnswerGenerated = false;
    coupleQaState.partnerAnswerGeneratedTime = 0;
    await coupleQaWriteRaw(coupleQaRoleId, coupleQaState);
    renderCoupleQaUi();
}

window.openCoupleQAModal = openCoupleQAModal;
window.closeCoupleQAModal = closeCoupleQAModal;
window.handleQaPrint = handleQaPrint;
window.submitCoupleQaAnswer = submitCoupleQaAnswer;
window.clearCoupleQaProgress = async function () {
    const rid = getCoupleQaLinkedRoleId();
    if (!rid) return false;
    await coupleQaRemoveRaw(rid);
    coupleQaInitialized = false;
    coupleQaInitInFlight = null;
    coupleQaState = null;
    coupleQaRoleId = '';
    coupleQaPartnerGenerateInFlight = false;
    coupleQaPartnerGenerateToken += 1;
    hideCoupleQaToast();
    return true;
};
