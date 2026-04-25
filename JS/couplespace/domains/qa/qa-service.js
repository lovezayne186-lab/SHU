(function () {
    'use strict';

    const repository = window.CoupleQaRepository;
    const scene = window.CoupleQaScene;
    const aiUtils = window.CoupleSpaceAiUtils;

    let state = null;
    let initialized = false;
    let initInFlight = null;
    let currentRoleId = '';
    let partnerGenerateInFlight = false;
    let partnerGenerateToken = 0;
    let legacyResetDoneOnce = false;

    function getLinkedRoleId() {
        try {
            if (typeof window.getCoupleLinkState === 'function') {
                const link = window.getCoupleLinkState();
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

    function getQuestionBank() {
        try {
            if (typeof questionBank !== 'undefined' && Array.isArray(questionBank)) {
                return questionBank;
            }
        } catch (e) { }
        try {
            if (Array.isArray(window.questionBank)) return window.questionBank;
        } catch (e2) { }
        return [];
    }

    function buildDefaultState() {
        return {
            currentQuestionIndex: 0,
            isCurrentAnswered: false,
            lastAnsweredTime: 0,
            hasPushed: false,
            myAnswer: '',
            partnerAnswer: '',
            partnerAnswerGenerated: false,
            partnerAnswerGeneratedTime: 0,
            answerHistory: []
        };
    }

    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    function formatDate(ts) {
        const d = ts ? new Date(ts) : new Date();
        if (!Number.isFinite(d.getTime())) return '';
        return d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate());
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

    function normalizeHistoryItem(raw, fallbackQuestionText) {
        const item = raw && typeof raw === 'object' ? raw : {};
        const questionIndex = Number(item.questionIndex);
        const answeredAt = Number(item.answeredAt || item.lastAnsweredTime || 0);
        const partnerAnsweredAt = Number(item.partnerAnsweredAt || item.partnerAnswerGeneratedTime || answeredAt || 0);
        const completedAt = Number(item.completedAt || partnerAnsweredAt || answeredAt || 0);
        return {
            questionIndex: Number.isFinite(questionIndex) && questionIndex >= 0 ? questionIndex : 0,
            questionText: String(item.questionText || fallbackQuestionText || '').trim(),
            myAnswer: String(item.myAnswer || '').trim(),
            partnerAnswer: String(item.partnerAnswer || '').trim(),
            answeredAt: Number.isFinite(answeredAt) ? answeredAt : 0,
            partnerAnsweredAt: Number.isFinite(partnerAnsweredAt) ? partnerAnsweredAt : 0,
            completedAt: Number.isFinite(completedAt) ? completedAt : 0
        };
    }

    function normalizeAnswerHistory(rawHistory, bank) {
        const list = Array.isArray(rawHistory) ? rawHistory : [];
        const items = list
            .map(function (item) {
                const idx = Number(item && item.questionIndex);
                const fallbackQuestionText = Array.isArray(bank) && Number.isFinite(idx) && bank[idx] && bank[idx].text
                    ? String(bank[idx].text || '')
                    : '';
                return normalizeHistoryItem(item, fallbackQuestionText);
            })
            .filter(function (item) {
                return !!(item.questionText || item.myAnswer || item.partnerAnswer);
            });
        items.sort(function (a, b) {
            const aTs = Number(a.completedAt || a.partnerAnsweredAt || a.answeredAt || 0);
            const bTs = Number(b.completedAt || b.partnerAnsweredAt || b.answeredAt || 0);
            return aTs - bTs;
        });
        return items;
    }

    function upsertHistoryItem(history, item) {
        const list = Array.isArray(history) ? history.slice() : [];
        const nextItem = normalizeHistoryItem(item, item && item.questionText);
        const key = String(nextItem.questionIndex) + '::' + String(nextItem.questionText || '');
        const idx = list.findIndex(function (it) {
            return String(it.questionIndex) + '::' + String(it.questionText || '') === key;
        });
        if (idx >= 0) {
            list[idx] = Object.assign({}, list[idx], nextItem);
        } else {
            list.push(nextItem);
        }
        list.sort(function (a, b) {
            const aTs = Number(a.completedAt || a.partnerAnsweredAt || a.answeredAt || 0);
            const bTs = Number(b.completedAt || b.partnerAnsweredAt || b.answeredAt || 0);
            return aTs - bTs;
        });
        return list;
    }

    function removeHistoryItem(history, questionIndex, questionText) {
        const list = Array.isArray(history) ? history.slice() : [];
        const key = String(Number(questionIndex)) + '::' + String(questionText || '');
        return list.filter(function (it) {
            return String(Number(it && it.questionIndex)) + '::' + String(it && it.questionText || '') !== key;
        });
    }

    function removeCurrentQuestionFromHistory(nextState, bank) {
        const snapshot = nextState && typeof nextState === 'object' ? nextState : null;
        if (!snapshot) return snapshot;
        const questionIndex = Number(snapshot.currentQuestionIndex);
        const question = Array.isArray(bank) && Number.isFinite(questionIndex) && bank[questionIndex] ? bank[questionIndex] : null;
        const questionText = question && question.text ? String(question.text) : '';
        if (!questionText) return snapshot;
        snapshot.answerHistory = removeHistoryItem(snapshot.answerHistory, questionIndex, questionText);
        return snapshot;
    }

    function syncCurrentQuestionToHistory(nextState, bank) {
        const snapshot = nextState && typeof nextState === 'object' ? nextState : null;
        if (!snapshot || !snapshot.isCurrentAnswered || !snapshot.partnerAnswerGenerated) return snapshot;
        const questionIndex = Number(snapshot.currentQuestionIndex);
        const question = Array.isArray(bank) && Number.isFinite(questionIndex) && bank[questionIndex] ? bank[questionIndex] : null;
        const questionText = question && question.text ? String(question.text) : '';
        const myAnswer = String(snapshot.myAnswer || '').trim();
        const partnerAnswer = String(snapshot.partnerAnswer || '').trim();
        if (!questionText || !myAnswer || !partnerAnswer) return snapshot;
        snapshot.answerHistory = upsertHistoryItem(snapshot.answerHistory, {
            questionIndex: questionIndex,
            questionText: questionText,
            myAnswer: myAnswer,
            partnerAnswer: partnerAnswer,
            answeredAt: Number(snapshot.lastAnsweredTime || 0),
            partnerAnsweredAt: Number(snapshot.partnerAnswerGeneratedTime || snapshot.lastAnsweredTime || 0),
            completedAt: Number(snapshot.partnerAnswerGeneratedTime || snapshot.lastAnsweredTime || 0)
        });
        return snapshot;
    }

    function normalizeState(raw) {
        const base = buildDefaultState();
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
            base.answerHistory = normalizeAnswerHistory(raw.answerHistory, getQuestionBank());
        }
        if (!base.partnerAnswerGenerated && base.partnerAnswer && base.partnerAnswer.trim()) {
            base.partnerAnswerGenerated = true;
            if (!base.partnerAnswerGeneratedTime) {
                base.partnerAnswerGeneratedTime = base.lastAnsweredTime || Date.now();
            }
        }
        return syncCurrentQuestionToHistory(base, getQuestionBank());
    }

    async function maybeAdvanceByTime() {
        const bank = getQuestionBank();
        if (!state || !Array.isArray(bank) || !bank.length) return;
        if (!state.isCurrentAnswered) return;
        if (!state.partnerAnswerGenerated) return;
        if (!hasPassedNextDayEight(state.lastAnsweredTime)) return;
        if (state.currentQuestionIndex >= bank.length - 1) return;
        syncCurrentQuestionToHistory(state, bank);
        state.currentQuestionIndex += 1;
        state.isCurrentAnswered = false;
        state.lastAnsweredTime = 0;
        state.hasPushed = false;
        state.myAnswer = '';
        state.partnerAnswer = '';
        state.partnerAnswerGenerated = false;
        state.partnerAnswerGeneratedTime = 0;
        await repository.write(currentRoleId, state);
    }

    async function ensureState(roleId) {
        const rid = String(roleId || '').trim();
        if (initialized && state && currentRoleId === rid) return state;
        if (initInFlight) return initInFlight;
        initInFlight = (async function () {
            currentRoleId = rid;
            const bank = getQuestionBank();
            const raw = await repository.read(rid);
            const base = normalizeState(raw);
            if (Array.isArray(bank) && bank.length) {
                base.currentQuestionIndex = Math.min(Math.max(0, base.currentQuestionIndex), bank.length - 1);
            }
            state = base;
            await maybeAdvanceByTime();
            initialized = true;
            initInFlight = null;
            return state;
        })();
        return initInFlight;
    }

    function getState() {
        return state;
    }

    function getCurrentQuestion() {
        const bank = getQuestionBank();
        if (!Array.isArray(bank) || !bank.length) return null;
        const idx = Number(state && state.currentQuestionIndex);
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

    async function resetProgressForTest(roleId) {
        const rid = String(roleId || '').trim();
        if (!rid) return false;
        await ensureState(rid);
        if (!state) return false;
        const keepIndex = Number(state.currentQuestionIndex);
        const next = buildDefaultState();
        next.currentQuestionIndex = Number.isFinite(keepIndex) && keepIndex >= 0 ? keepIndex : 0;
        state = next;
        initialized = true;
        currentRoleId = rid;
        await repository.write(rid, state);
        return true;
    }

    async function resetLegacyMockAnswerIfNeeded(roleId) {
        const rid = String(roleId || '').trim();
        await ensureState(rid);
        if (legacyResetDoneOnce || !state) return false;
        if (!looksLikeLegacyMockPartnerAnswer(state.partnerAnswer)) return false;
        legacyResetDoneOnce = true;
        return resetProgressForTest(rid);
    }

    async function markPrinted() {
        if (!state) return;
        if (state.isCurrentAnswered || state.hasPushed) return;
        state.hasPushed = true;
        await repository.write(currentRoleId, state);
    }

    async function submitMyAnswer(text) {
        if (!state) return;
        const raw = String(text || '').trim();
        if (!raw) throw new Error('请先写下你的想法哦');
        state.isCurrentAnswered = true;
        state.myAnswer = raw;
        state.lastAnsweredTime = Date.now();
        state.partnerAnswer = '';
        state.partnerAnswerGenerated = false;
        state.partnerAnswerGeneratedTime = 0;
        removeCurrentQuestionFromHistory(state, getQuestionBank());
        await repository.write(currentRoleId, state);
    }

    async function generatePartnerAnswer(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const forceRegenerate = !!opts.forceRegenerate;
        if (!state) throw new Error('问答状态未初始化');
        if (!state.isCurrentAnswered) throw new Error('请先回答今日问题');
        if (state.partnerAnswerGenerated && !forceRegenerate) return state.partnerAnswer;
        if (partnerGenerateInFlight) throw new Error('对方正在回答中');
        const roleId = getLinkedRoleId();
        if (!roleId) throw new Error('尚未绑定情侣角色');
        const question = getCurrentQuestion();
        const questionText = question && question.text ? String(question.text) : '';
        const myAnswer = String(state.myAnswer || '').trim();
        if (!questionText || !myAnswer) throw new Error('当前问题或回答为空');

        partnerGenerateInFlight = true;
        const token = ++partnerGenerateToken;
        try {
            const rawText = await scene.generatePartnerAnswer(roleId, questionText, myAnswer);
            if (token !== partnerGenerateToken) return '';
            const clean = aiUtils.normalizeAiReplyText(rawText);
            if (!clean) throw new Error('AI 返回为空');
            state.partnerAnswer = clean;
            state.partnerAnswerGenerated = true;
            state.partnerAnswerGeneratedTime = Date.now();
            syncCurrentQuestionToHistory(state, getQuestionBank());
            await repository.write(currentRoleId, state);
            return clean;
        } finally {
            if (token === partnerGenerateToken) {
                partnerGenerateInFlight = false;
            }
        }
    }

    async function clearProgress() {
        const rid = getLinkedRoleId();
        if (!rid) return false;
        await repository.remove(rid);
        initialized = false;
        initInFlight = null;
        state = null;
        currentRoleId = '';
        partnerGenerateInFlight = false;
        partnerGenerateToken += 1;
        legacyResetDoneOnce = false;
        return true;
    }

    window.CoupleQaService = {
        getLinkedRoleId: getLinkedRoleId,
        getQuestionBank: getQuestionBank,
        buildDefaultState: buildDefaultState,
        formatDate: formatDate,
        ensureState: ensureState,
        getState: getState,
        getCurrentQuestion: getCurrentQuestion,
        getAnswerHistory: function () {
            return state && Array.isArray(state.answerHistory) ? state.answerHistory.slice() : [];
        },
        markPrinted: markPrinted,
        submitMyAnswer: submitMyAnswer,
        generatePartnerAnswer: generatePartnerAnswer,
        regeneratePartnerAnswer: function () {
            return generatePartnerAnswer({ forceRegenerate: true });
        },
        resetLegacyMockAnswerIfNeeded: resetLegacyMockAnswerIfNeeded,
        clearProgress: clearProgress,
        isGenerating: function () { return partnerGenerateInFlight; }
    };
})();
