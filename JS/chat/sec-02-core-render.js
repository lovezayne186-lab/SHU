/* === [SEC-02] 核心引擎与聊天渲染 === */

// =========================================================
// === 1. 核心引擎：启动与聊天渲染 ===
// =========================================================

document.addEventListener('DOMContentLoaded', async function () {
    injectDiceStyles();
    try {
        await initData();
    } catch (e) {
        console.error(e);
    }
    try {
        bindChatViewportLayoutSyncOnce();
        bindChatSendButtonTouchGuardOnce();
    } catch (e) { }
    try {
        bindOfflineDiaryDebugUIOnce();
    } catch (e) { }

    // 🛑 紧急修复：防死循环逻辑
    // 如果没有当前角色ID，说明用户刚打开网页，应该显示"桌面/列表"，而不是报错
    if (!window.currentChatRole) {
        console.log("当前无角色，停留在桌面");

        // 确保显示桌面，隐藏聊天室
        const desktop = document.getElementById('desktop-view');
        const chatView = document.getElementById('chat-view');

        if (desktop) desktop.style.display = 'block';
        if (chatView) chatView.style.display = 'none';

        return; // 直接结束，不弹窗，不刷新！
    }

    // 只有当"真的有角色ID"（比如用户刷新了聊天页面）时，才自动进入聊天
    enterChat(window.currentChatRole);
});


function isShowSystemPromptInChatEnabled() {
    try {
        const devUnlocked = localStorage.getItem('dev_mode_unlocked') === 'true';
        if (!devUnlocked) return false;
        return localStorage.getItem('show_system_prompt_in_chat') === 'true';
    } catch (e) {
        return false;
    }
}

function getLastSystemPromptForRole(roleId) {
    const rid = String(roleId || window.currentChatRole || '').trim();
    try {
        const map = window.__lastCallAISystemPromptByRole;
        if (map && rid && typeof map === 'object' && typeof map[rid] === 'string' && map[rid]) {
            return map[rid];
        }
    } catch (e) { }
    try {
        if (typeof window.__lastCallAISystemPrompt === 'string' && window.__lastCallAISystemPrompt) {
            return window.__lastCallAISystemPrompt;
        }
    } catch (e2) { }
    return '';
}

function getLastSystemExtraForRole(roleId) {
    const rid = String(roleId || window.currentChatRole || '').trim();
    try {
        const map = window.__lastCallAISystemExtraByRole;
        if (map && rid && typeof map === 'object' && typeof map[rid] === 'string') {
            return map[rid] || '';
        }
    } catch (e) { }
    return '';
}

function buildMergedSystemPromptForDebug(roleId, prompt) {
    const rid = String(roleId || window.currentChatRole || '').trim();
    const main = typeof prompt === 'string' ? prompt : (getLastSystemPromptForRole(rid) || '');
    const extra = getLastSystemExtraForRole(rid);
    if (!extra) return main;
    return (main ? (main + '\n\n') : '') + '=== 一次性系统上下文(额外 system message) ===\n' + extra;
}

function ensureOfflineDiaryDebugModal() {
    if (window.OfflineDiaryDebugModal) return window.OfflineDiaryDebugModal;
    const modal = document.getElementById('offline-diary-debug-modal');
    const textEl = document.getElementById('offline-diary-debug-modal-text');
    const closeBtn = document.getElementById('offline-diary-debug-modal-close');
    const api = {
        show: function (text) {
            if (!modal) return;
            if (textEl) textEl.textContent = String(text || '');
            modal.style.display = 'flex';
        },
        setText: function (text) {
            if (textEl) textEl.textContent = String(text || '');
        },
        hide: function () {
            if (!modal) return;
            modal.style.display = 'none';
        }
    };
    if (closeBtn && !closeBtn._offlineDiaryBound) {
        closeBtn._offlineDiaryBound = true;
        closeBtn.addEventListener('click', function () {
            api.hide();
        });
    }
    if (modal && !modal._offlineDiaryMaskBound) {
        modal._offlineDiaryMaskBound = true;
        modal.addEventListener('click', function (e) {
            if (e && e.target === modal) api.hide();
        });
    }
    window.OfflineDiaryDebugModal = api;
    return api;
}

function readWechatChatHistoryFromAny(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return [];
    try {
        if (window.chatData && typeof window.chatData === 'object' && Array.isArray(window.chatData[rid])) {
            return window.chatData[rid].slice();
        }
    } catch (e) { }
    try {
        const raw = localStorage.getItem('wechat_chatData');
        const parsed = raw ? safeJsonParse(raw, {}) : {};
        const list = parsed && typeof parsed === 'object' && Array.isArray(parsed[rid]) ? parsed[rid] : [];
        return list.slice();
    } catch (e2) {
        return [];
    }
}

function buildShortTermMemoryTextFromHistory(historyForApi, maxLines) {
    const list = Array.isArray(historyForApi) ? historyForApi : [];
    const lines = [];
    for (let i = 0; i < list.length; i++) {
        const msg = list[i];
        if (!msg || typeof msg !== 'object') continue;
        const role = String(msg.role || '').trim();
        if (role !== 'me' && role !== 'ai') continue;
        const content = String(msg.content || '').replace(/\s+/g, ' ').trim();
        if (!content) continue;
        lines.push((role === 'me' ? '我：' : 'TA：') + content);
    }
    const n = Math.max(6, Math.min(300, Number(maxLines) || 24));
    if (lines.length <= n) return lines.join('\n');
    return lines.slice(lines.length - n).join('\n');
}

function countChatsForDate(roleId, dateKey) {
    const dk = String(dateKey || '').trim();
    if (!dk) return 0;
    const list = readWechatChatHistoryFromAny(roleId);
    let count = 0;
    for (let i = 0; i < list.length; i++) {
        const msg = list[i];
        if (!msg || typeof msg !== 'object') continue;
        if (msg.hidden === true) continue;
        const t = String(msg.type || '').trim();
        if (t === 'system_event' || t === 'call_memory' || t === 'call_end') continue;
        const ts = Number(msg.timestamp);
        if (!Number.isFinite(ts) || ts <= 0) continue;
        if (toDateKey(ts) !== dk) continue;
        const role = String(msg.role || '').trim();
        if (role !== 'me' && role !== 'ai') continue;
        if (!msg.content) continue;
        count++;
    }
    return count;
}

function buildCoupleSpaceDiarySystemPrompt(roleId, options) {
    const rid = String(roleId || '').trim();
    const profile = window.charProfiles && window.charProfiles[rid] ? window.charProfiles[rid] : {};
    const userPersona = window.userPersonas && window.userPersonas[rid] ? window.userPersonas[rid] : {};
    const opts = options && typeof options === 'object' ? options : {};
    if (typeof window.buildFullChatPrompt === 'function') {
        return window.buildFullChatPrompt('couple_space_diary', rid, {
            outputMode: 'plain_json_task',
            history: Array.isArray(opts.historyForApi) ? opts.historyForApi : [],
            maxSummaryLines: 20,
            extraCurrentContext: String(opts.extraCurrentContext || '').trim(),
            extraTaskRules: [
                '你写的是秘密空间里的心情日记，不是发给用户的即时聊天消息。',
                '最近微信聊天记录、关系气氛和近期系统事件必须高优先级影响你的日记内容。',
                '如果最近发生过让角色在意的互动，日记应该体现那种余温，而不是重新空想一个无关场景。'
            ].join('\n')
        });
    }
    const roleNameForAI = profile.nickName || rid || 'TA';
    let systemPrompt = `【角色名称】${roleNameForAI}\n` + (profile.desc || '你是一个友好的AI助手');
    if (profile.style && String(profile.style).trim()) {
        systemPrompt += `\n\n【聊天风格】\n${String(profile.style).trim()}`;
    }
    if (userPersona.name || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) systemPrompt += `用户名字：${userPersona.name}\n`;
        if (userPersona.setting) systemPrompt += `用户背景：${userPersona.setting}\n`;
    }
    try {
        if (typeof window.buildWorldBookPrompt === 'function' && profile.worldbookId) {
            const wb = window.buildWorldBookPrompt(profile.worldbookId);
            if (wb) systemPrompt += wb;
        }
    } catch (e) { }
    return systemPrompt;
}

function startOfDayTs(ts) {
    const d = new Date(Number(ts) || Date.now());
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

function isSameDayTs(a, b) {
    return toDateKey(a) === toDateKey(b);
}

function crossedHourSameDay(lastTs, enterTs, hour) {
    const h = Number(hour);
    if (!Number.isFinite(h) || h < 0 || h > 23) return false;
    if (!isSameDayTs(lastTs, enterTs)) return false;
    const gate = startOfDayTs(lastTs) + h * 60 * 60 * 1000;
    return lastTs < gate && enterTs >= gate;
}

function buildDateKeysForCatchUp(nowTs, capDays) {
    const cap = Math.max(1, Math.min(7, Number(capDays) || 1));
    const dayMs = 24 * 60 * 60 * 1000;
    const todayStart = startOfDayTs(nowTs);
    const keys = [];
    for (let i = cap - 1; i >= 0; i--) {
        keys.push(toDateKey(todayStart - i * dayMs));
    }
    return keys;
}

async function generateCoupleSpaceDiariesForRole(roleId, lastExitTs, nowTs) {
    const rid = String(roleId || '').trim();
    if (!rid) return 0;
    if (typeof window.callAI !== 'function') throw new Error('AI 接口未初始化');

    const moodLabels = ['开心', '兴奋', '心动', '平静', '伤心', '生气', '烦躁', '心累'];

    const sameDay = isSameDayTs(lastExitTs, nowTs);
    const diffMs = nowTs - lastExitTs;
    const cross18 = crossedHourSameDay(lastExitTs, nowTs, 18);
    const triggerA = sameDay && (diffMs > 3 * 60 * 60 * 1000 || cross18);

    let triggerB = false;
    let cap = 0;
    if (!sameDay) {
        const diffDaysRaw = Math.floor((startOfDayTs(nowTs) - startOfDayTs(lastExitTs)) / (24 * 60 * 60 * 1000));
        if (diffDaysRaw > 0) {
            triggerB = true;
            cap = Math.max(1, Math.min(7, diffDaysRaw + 1));
        }
    }

    if (!triggerA && !triggerB) return 0;

    const history = readWechatChatHistoryFromAny(rid);
    const clean = (Array.isArray(history) ? history : []).filter(function (m) {
        if (!m || typeof m !== 'object') return false;
        if (m.hidden === true) return false;
        if (m.type === 'call_memory') return m.includeInAI === true;
        if (m.type === 'system_event') return m.includeInAI === true;
        return !!m.content;
    });

    let historyForApi = clean.slice(-50);
    try {
        if (typeof window.buildApiMemoryHistory === 'function') {
            historyForApi = window.buildApiMemoryHistory(rid, clean);
        }
    } catch (e0) { }
    if (!Array.isArray(historyForApi)) historyForApi = [];

    const memoryLimit = typeof window.getEffectiveChatMemoryLimit === 'function'
        ? window.getEffectiveChatMemoryLimit(rid)
        : (parseInt(localStorage.getItem('chat_memory_limit'), 10) || 30);
    const shortTermMemory = buildShortTermMemoryTextFromHistory(historyForApi, memoryLimit);

    const prevRole = window.currentChatRole;
    window.__offlineSyncInProgress = true;
    window.currentChatRole = rid;

    try {
        const diarySystemContext = [
            `【当前时间】${new Date(nowTs).toLocaleString('zh-CN', { hour12: false })}`,
            `【当前触发类型】${triggerA ? '当天心情日记补写' : '多日补写'}`,
            shortTermMemory ? `【短期聊天摘要（高优先级素材）】\n${shortTermMemory}` : ''
        ].filter(Boolean).join('\n\n');
        const systemPrompt = buildCoupleSpaceDiarySystemPrompt(rid, {
            historyForApi: historyForApi,
            extraCurrentContext: diarySystemContext
        });

        if (triggerA) {
            const promptA =
                `你现在是我的伴侣，请根据你的人设，写一篇今天当下的【心情日记】。\n` +
                `请参考我们刚刚在微信上的聊天（短期记忆）：\n${shortTermMemory}\n\n` +
                `写作要求：\n` +
                `结合短期记忆中的聊天内容，选择一个符合当前情境的【心情词】（必须是心情库里面有的，选择完之后要把他的选择渲染在日历组件上）。\n` +
                `心情词只能从以下列表中选择一个：${moodLabels.join('、')}。\n` +
                `写一段日记，要符合你选择的心情，可以写你想写的感受，或者是自然地提及我们刚才聊了什么，自由发挥，必须符合人设！\n` +
                `字数严格控制在 100 字以内。\n` +
                `必须输出 JSON 格式：{ "mood": "心情词", "content": "日记内容" }\n` +
                `输出要求：只输出 JSON，不要输出代码块，不要输出解释文字，不要输出任何多余字符。`;

            let aiText = await new Promise(function (resolve, reject) {
                window.callAI(systemPrompt, historyForApi, promptA, resolve, function (err) {
                    reject(new Error(String(err || '请求失败')));
                });
            });
            const obj = extractFirstJsonObject(aiText);
            let mood = obj && typeof obj.mood === 'string' ? obj.mood.trim() : '';
            let content = obj && typeof obj.content === 'string' ? obj.content.trim() : '';
            if (!content && isDevModeUnlocked()) {
                appendDevAiParseFailureLog({ scene: 'offline_diary_A', roleId: rid, reason: 'parse_failed_or_empty_content', prompt: promptA, rawText: String(aiText || '') });
                const retry = confirm('心情日记解析失败（未得到 JSON content）。是否重试一次？');
                if (retry) {
                    aiText = await new Promise(function (resolve, reject) {
                        window.callAI(systemPrompt, historyForApi, promptA + '\n再次强调：只输出 JSON。', resolve, function (err) {
                            reject(new Error(String(err || '请求失败')));
                        });
                    });
                    const obj2 = extractFirstJsonObject(aiText);
                    mood = obj2 && typeof obj2.mood === 'string' ? obj2.mood.trim() : mood;
                    content = obj2 && typeof obj2.content === 'string' ? obj2.content.trim() : '';
                    if (!content) {
                        appendDevAiParseFailureLog({ scene: 'offline_diary_A', roleId: rid, reason: 'retry_parse_failed_or_empty_content', prompt: promptA, rawText: String(aiText || '') });
                    }
                }
            }
            if (!content) {
                const raw = String(aiText || '').trim();
                const foundMood = moodLabels.find(function (m) { return raw.indexOf(m) >= 0; }) || '';
                mood = mood || foundMood;
                content = raw
                    .replace(/```[\s\S]*?```/g, '')
                    .replace(/^\s*[\{\[][\s\S]*?[\}\]]\s*$/g, '')
                    .trim();
                if (content.length > 140) content = content.slice(0, 140);
            }
            if (!content) return 0;
            const finalMood = moodLabels.indexOf(mood) !== -1 ? mood : '平静';
            const store = readRoleMoodStore(rid);
            const dk = toDateKey(nowTs);
            store.entries[dk] = { label: finalMood, text: content, updatedAt: nowTs };
            writeRoleMoodStore(rid, store);
            return 1;
        }

        const dateKeys = buildDateKeysForCatchUp(nowTs, cap);
        const chatStats = dateKeys.map(function (dk) {
            return { date: dk, chatCount: countChatsForDate(rid, dk) };
        });

        const promptB =
            `你现在是我的伴侣，请根据你的人设，批量补写过去几天以及今天的【心情日记】。\n` +
            `当前情况： 我有 ${cap} 天没有回到『情侣空间』这个秘密基地了，现在终于回来了。\n` +
            `请严格参考以下这几天的微信互动状态： ${JSON.stringify(chatStats)}\n` +
            `请参考我们最近一次的聊天（短期记忆）：\n${shortTermMemory}\n\n` +
            `写作要求：\n\n` +
            `如果某天 chatCount > 0（我们在微信聊天了），日记要表现出聊天的日常感，不要说完全失联；如果 chatCount == 0，才可以表现出没收到消息的想念或孤独。\n` +
            `今天的日记，必须表达出看到我回到空间的喜悦，并结合『短期记忆』的内容。\n` +
            `每天的日记字数严格控制在 100 字以内，并选择一个【心情词】。\n` +
            `心情词只能从以下列表中选择一个：${moodLabels.join('、')}。\n` +
            `必须输出 JSON 格式的数组：\n` +
            `{ "diaries": [ { "date": "YYYY-MM-DD", "mood": "心情词", "content": "日记内容" } ] }\n` +
            `输出要求：只输出 JSON，不要输出代码块，不要输出解释文字，不要输出任何多余字符。`;

        let aiText = await new Promise(function (resolve, reject) {
            window.callAI(systemPrompt, historyForApi, promptB, resolve, function (err) {
                reject(new Error(String(err || '请求失败')));
            });
        });
        const obj = extractFirstJsonObject(aiText);
        const diaries = obj && typeof obj === 'object' && Array.isArray(obj.diaries) ? obj.diaries : [];
        if (!diaries.length && isDevModeUnlocked()) {
            appendDevAiParseFailureLog({ scene: 'offline_diary_B', roleId: rid, reason: 'parse_failed_or_empty_diaries', prompt: promptB, rawText: String(aiText || '') });
            const retry = confirm('批量心情日记解析失败（未得到 diaries）。是否重试一次？');
            if (retry) {
                aiText = await new Promise(function (resolve, reject) {
                    window.callAI(systemPrompt, historyForApi, promptB + '\n再次强调：只输出 JSON。', resolve, function (err) {
                        reject(new Error(String(err || '请求失败')));
                    });
                });
                const obj2 = extractFirstJsonObject(aiText);
                const diaries2 = obj2 && typeof obj2 === 'object' && Array.isArray(obj2.diaries) ? obj2.diaries : [];
                if (diaries2.length) {
                    diaries2.forEach(function (d) { diaries.push(d); });
                } else {
                    appendDevAiParseFailureLog({ scene: 'offline_diary_B', roleId: rid, reason: 'retry_parse_failed_or_empty_diaries', prompt: promptB, rawText: String(aiText || '') });
                }
            }
        }
        if (!diaries.length) return 0;

        const store = readRoleMoodStore(rid);
        let written = 0;
        for (let i = 0; i < diaries.length; i++) {
            const d = diaries[i] && typeof diaries[i] === 'object' ? diaries[i] : null;
            if (!d) continue;
            const date = String(d.date || '').trim();
            const mood = String(d.mood || '').trim();
            const content = String(d.content || '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
            if (!content) continue;
            const finalMood = moodLabels.indexOf(mood) !== -1 ? mood : '平静';
            const dt = new Date(date + 'T21:00:00');
            const ts = Number.isNaN(dt.getTime()) ? nowTs : dt.getTime();
            store.entries[date] = { label: finalMood, text: content, updatedAt: ts };
            written++;
        }
        writeRoleMoodStore(rid, store);
        return written;
    } finally {
        window.__offlineSyncInProgress = false;
        window.currentChatRole = prevRole;
    }
}

function bindOfflineDiaryDebugUIOnce() {
    const btn3h = document.getElementById('offline-diary-debug-3h');
    const daysInput = document.getElementById('offline-diary-debug-days');
    const daysBtn = document.getElementById('offline-diary-debug-days-btn');
    if (!btn3h && !daysBtn) return;

    function isDevUnlocked() {
        try {
            return localStorage.getItem('dev_mode_unlocked') === 'true';
        } catch (e) {
            return false;
        }
    }

    function getLinkedRoleId() {
        try {
            const has = localStorage.getItem('couple_has_linked_v1') === 'true';
            const rid = String(localStorage.getItem('couple_linked_role_id_v1') || '').trim();
            if (!has || !rid) return '';
            return rid;
        } catch (e) {
            return '';
        }
    }

    function showTip(text) {
        if (typeof window.showCenterToast === 'function') {
            window.showCenterToast(String(text || ''));
            return;
        }
        if (window.GlobalModal && typeof window.GlobalModal.showError === 'function') {
            window.GlobalModal.showError(String(text || ''));
            return;
        }
        alert(String(text || ''));
    }

    function setLastExitTime(roleId, ts) {
        const rid = String(roleId || '').trim();
        const t = Number(ts);
        if (!rid || !Number.isFinite(t) || t <= 0) return false;
        try {
            localStorage.setItem('couple_space_last_exit_time_v1_' + rid, String(Math.floor(t)));
            try {
                localStorage.removeItem(buildCoupleSpaceRoleKey('couple_space_diary_sync_lock_v1', rid));
                localStorage.removeItem('couple_space_diary_sync_lock_v1');
            } catch (e2) { }
            return true;
        } catch (e) {
            return false;
        }
    }

    function simulateOfflineHours(hours) {
        const roleId = getLinkedRoleId();
        if (!roleId) {
            showTip('未绑定情侣空间角色，无法模拟。先在情侣空间里绑定一个角色。');
            return;
        }
        const h = Number(hours);
        const ms = (Number.isFinite(h) ? h : 3) * 60 * 60 * 1000;
        const ts = Date.now() - ms - 2000;
        if (!setLastExitTime(roleId, ts)) {
            showTip('写入离线时间失败。');
            return;
        }
        const modal = ensureOfflineDiaryDebugModal();
        modal.show('正在模拟中，日记正在生成…');
        Promise.resolve()
            .then(function () { return generateCoupleSpaceDiariesForRole(roleId, ts, Date.now()); })
            .then(function (n) {
                modal.setText('已生成完成！' + (Number(n) > 0 ? ('（共 ' + n + ' 条）') : ''));
                setTimeout(function () { modal.hide(); }, 900);
            })
            .catch(function (e) {
                modal.setText('生成失败：' + String(e && e.message ? e.message : e));
            });
    }

    function simulateOfflineDays(days) {
        const roleId = getLinkedRoleId();
        if (!roleId) {
            showTip('未绑定情侣空间角色，无法模拟。先在情侣空间里绑定一个角色。');
            return;
        }
        const nRaw = Number(days);
        const n = Math.max(2, Math.min(365, Number.isFinite(nRaw) ? Math.floor(nRaw) : 3));
        const dayMs = 24 * 60 * 60 * 1000;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const startDay = now.getTime() - (n - 1) * dayMs;
        const ts = startDay + 12 * 60 * 60 * 1000;
        if (!setLastExitTime(roleId, ts)) {
            showTip('写入离线时间失败。');
            return;
        }
        const modal = ensureOfflineDiaryDebugModal();
        modal.show('正在模拟中，日记正在生成…');
        Promise.resolve()
            .then(function () { return generateCoupleSpaceDiariesForRole(roleId, ts, Date.now()); })
            .then(function (n) {
                modal.setText('已生成完成！' + (Number(n) > 0 ? ('（共 ' + n + ' 条）') : ''));
                setTimeout(function () { modal.hide(); }, 900);
            })
            .catch(function (e) {
                modal.setText('生成失败：' + String(e && e.message ? e.message : e));
            });
    }

    if (btn3h && !btn3h._offlineDiaryDebugBound) {
        btn3h._offlineDiaryDebugBound = true;
        btn3h.addEventListener('click', function () {
            if (!isDevUnlocked()) {
                showTip('未解锁开发者模式，无法使用调试功能。');
                return;
            }
            simulateOfflineHours(3);
        });
    }
    if (daysBtn && !daysBtn._offlineDiaryDebugBound) {
        daysBtn._offlineDiaryDebugBound = true;
        daysBtn.addEventListener('click', function () {
            if (!isDevUnlocked()) {
                showTip('未解锁开发者模式，无法使用调试功能。');
                return;
            }
            const v = daysInput ? daysInput.value : '';
            simulateOfflineDays(v);
        });
    }
}

function bindSystemPromptDebugUIOnce() {
    bindOfflineDiaryDebugUIOnce();
}

function updateSystemPromptDebugUIImpl(roleId, prompt) {
    try {
        if (typeof window.refreshDevPromptDebugPanel === 'function') {
            window.refreshDevPromptDebugPanel();
        }
    } catch (e) { }
}

window.updateSystemPromptDebugUI = function () {
    updateSystemPromptDebugUIImpl(window.currentChatRole || '');
};

if (!window.__systemPromptDebugListenerBound) {
    window.__systemPromptDebugListenerBound = true;
    try {
        window.addEventListener('ai:systemPromptUpdated', function (e) {
            const detail = e && e.detail ? e.detail : null;
            const rid = detail && detail.roleId != null ? String(detail.roleId) : '';
            const prompt = detail && typeof detail.prompt === 'string' ? detail.prompt : '';
            const extraSystem = detail && typeof detail.extraSystem === 'string' ? detail.extraSystem : '';
            if (rid && prompt) {
                try {
                    window.__lastCallAISystemPromptByRole = window.__lastCallAISystemPromptByRole || {};
                    window.__lastCallAISystemPromptByRole[rid] = prompt;
                } catch (e2) { }
            }
            if (rid) {
                try {
                    window.__lastCallAISystemExtraByRole = window.__lastCallAISystemExtraByRole || {};
                    window.__lastCallAISystemExtraByRole[rid] = extraSystem || '';
                } catch (e3) { }
            }
            bindSystemPromptDebugUIOnce();
            updateSystemPromptDebugUIImpl(rid || (window.currentChatRole || ''), prompt);
        });
    } catch (e3) { }
}

// 进入聊天室
function enterChat(roleId) {
    const chatRoom = document.getElementById('chat-room-layer');
    const chatTitle = document.getElementById('current-chat-name');
    const historyBox = document.getElementById('chat-history');

    if (chatRoom || historyBox) {
        if (typeof window.ensureChatRuntimeForRole === 'function') {
            roleId = window.ensureChatRuntimeForRole(roleId) || roleId;
        }
        window.currentChatRole = roleId;
        try {
            localStorage.setItem('currentChatId', roleId || '');
        } catch (e) { }
        const profile = window.charProfiles[roleId] || { nickName: "未知角色" };

        // 1. 设置顶部标题
        if (chatTitle) chatTitle.innerText = (profile.remark || profile.nickName || roleId);
        const oldHeaderAvatar = document.getElementById('current-chat-avatar');
        if (oldHeaderAvatar) oldHeaderAvatar.remove();

        applyChatBackground(roleId);
        if (window.ThemeStudio && typeof window.ThemeStudio.applyThemeToChat === 'function') {
            window.ThemeStudio.applyThemeToChat(roleId, chatRoom);
        }
        if (typeof window.applyChatBubbleCssFromSettings === 'function') {
            window.applyChatBubbleCssFromSettings(roleId);
        }
        if (typeof window.applyChatFontSizeFromSettings === 'function') {
            window.applyChatFontSizeFromSettings(roleId);
        }

        bindSystemPromptDebugUIOnce();
        updateSystemPromptDebugUIImpl(roleId);

        // ... 在 enterChat 函数内 ...

        // 3. 渲染历史记录
        historyBox.innerHTML = "";
        window.lastRenderedTime = 0;

        let historyData = window.chatData[roleId];
        if (!Array.isArray(historyData)) {
            historyData = [];
            window.chatData[roleId] = [];
        }

        // === 【核心优化】只渲染最后 N 条，防止卡顿 ===
        const RENDER_LIMIT = 200;
        const totalCount = historyData.length;
        const startIndex = Math.max(0, totalCount - RENDER_LIMIT);
        const renderList = historyData.slice(startIndex);

        // 如果有隐藏的历史记录，显示“查看更多”按钮
        if (startIndex > 0) {
            const loadMoreBtn = document.createElement('div');
            loadMoreBtn.className = 'chat-time-label chat-time-label-loadmore';
            loadMoreBtn.style.cursor = 'pointer';
            loadMoreBtn.style.color = '#576b95'; // 微信蓝
            loadMoreBtn.innerText = `查看更多历史消息 (${startIndex} 条未显示)`;
            loadMoreBtn.onclick = function () {
                // 优化：分批加载历史消息，避免一次性渲染导致的卡顿
                loadMoreBtn.innerText = "加载中...";
                loadMoreBtn.style.pointerEvents = 'none'; // 防止重复点击
                
                // 分批加载历史消息（每次加载20条）
                const BATCH_SIZE = 20;
                let currentBatch = 0;
                const totalBatches = Math.ceil(startIndex / BATCH_SIZE);
                
                function loadNextBatch() {
                    const batchStart = startIndex - (currentBatch + 1) * BATCH_SIZE;
                    const batchEnd = startIndex - currentBatch * BATCH_SIZE;
                    const batchMessages = historyData.slice(Math.max(0, batchStart), batchEnd);
                    
                    // 在顶部插入消息（保持原有顺序）
                    const fragment = document.createDocumentFragment();
                    batchMessages.forEach(msg => {
                        const row = createMessageRow(msg);
                        if (row) {
                            fragment.appendChild(row);
                        }
                    });
                    
                    // 插入到现有消息之前
                    const firstChild = historyBox.firstChild;
                    if (firstChild) {
                        historyBox.insertBefore(fragment, firstChild);
                    } else {
                        historyBox.appendChild(fragment);
                    }
                    
                    currentBatch++;
                    
                    if (currentBatch < totalBatches) {
                        // 继续加载下一批
                        loadMoreBtn.innerText = `加载中... (${currentBatch}/${totalBatches})`;
                        setTimeout(loadNextBatch, 100); // 延迟100ms加载下一批
                    } else {
                        // 全部加载完成，移除按钮
                        loadMoreBtn.remove();
                        if (typeof window.updateMsgRowGroupClasses === 'function') {
                            window.updateMsgRowGroupClasses();
                        }
                    }
                }
                
                // 开始加载第一批
                setTimeout(loadNextBatch, 50);
            };
            historyBox.appendChild(loadMoreBtn);
        }

        // 渲染本次切片的消息
        renderList.forEach(msg => {
            appendMessageToDOM(msg);
        });

        if (typeof window.updateMsgRowGroupClasses === 'function') {
            window.updateMsgRowGroupClasses();
        }
        if (typeof window.applyChatBubbleCssFromSettings === 'function') {
            window.applyChatBubbleCssFromSettings(roleId);
        }
        if (typeof window.applyChatFontSizeFromSettings === 'function') {
            window.applyChatFontSizeFromSettings(roleId);
        }

        try {
            if (typeof window.refreshTrackedChatResponseIndicators === 'function') {
                window.refreshTrackedChatResponseIndicators(roleId);
            }
        } catch (e) { }

        // 滚到底部
        setTimeout(() => {
            historyBox.scrollTop = historyBox.scrollHeight;
        }, 100);

    }

    try {
        const raw = localStorage.getItem('listen_together_pending_ai') || '';
        if (raw) {
            const p = JSON.parse(raw);
            if (p && String(p.roleId || '') === String(roleId || '') && p.inviteId) {
                localStorage.removeItem('listen_together_pending_ai');
                setTimeout(function () {
                    if (String(window.currentChatRole || '') === String(roleId || '')) {
                        triggerAI();
                    }
                }, 180);
            }
        }
    } catch (e) { }

    try {
        const raw = localStorage.getItem('couple_pending_invite_v1') || '';
        if (raw) {
            const p = JSON.parse(raw);
            const pendingRoleId = p && p.roleId != null ? String(p.roleId) : '';
            const inviteId = p && p.inviteId != null ? String(p.inviteId) : '';
            if (pendingRoleId && pendingRoleId === String(roleId || '') && inviteId) {
                localStorage.removeItem('couple_pending_invite_v1');
                setTimeout(function () {
                    if (String(window.currentChatRole || '') === String(roleId || '')) {
                        startCoupleInviteFlow(roleId, inviteId);
                    }
                }, 160);
            }
        }
    } catch (e2) { }

    try {
        if (typeof window.syncChatViewportLayout === 'function') {
            window.syncChatViewportLayout();
        }
    } catch (e3) { }
}

function refreshChatViewportBaseHeight(force) {
    try {
        const vv = window.visualViewport;
        const visualHeight = vv ? Math.round(vv.height + (vv.offsetTop || 0)) : 0;
        const current = Math.max(
            Math.round(window.innerHeight || 0),
            Math.round(document.documentElement ? document.documentElement.clientHeight || 0 : 0),
            visualHeight
        );
        if (current <= 0) return window.__chatViewportBaseHeight || 0;
        if (force || !window.__chatViewportBaseHeight || current > window.__chatViewportBaseHeight) {
            window.__chatViewportBaseHeight = current;
        }
        return window.__chatViewportBaseHeight;
    } catch (e) {
        return window.__chatViewportBaseHeight || 0;
    }
}

function getChatViewportKeyboardOffset() {
    try {
        const vv = window.visualViewport;
        if (!vv) return 0;
        const baseHeight = refreshChatViewportBaseHeight(false);
        const visibleHeight = Math.round(vv.height + (vv.offsetTop || 0));
        const raw = Math.max(0, Math.round(baseHeight - visibleHeight));
        return raw > 72 ? raw : 0;
    } catch (e) {
        return 0;
    }
}

function isEditableElementActive() {
    try {
        const active = document.activeElement;
        if (!active) return false;
        const tag = String(active.tagName || '').toUpperCase();
        if (tag === 'TEXTAREA') return true;
        if (tag === 'INPUT') {
            const type = String(active.type || '').toLowerCase();
            return type !== 'button' && type !== 'submit' && type !== 'checkbox' && type !== 'radio' && type !== 'range' && type !== 'file';
        }
        return active.isContentEditable === true;
    } catch (e) {
        return false;
    }
}

function focusChatInputSafely(input, delayMs) {
    const target = input || document.getElementById('msg-input');
    if (!target) return;
    const run = function () {
        try {
            if (document.activeElement !== target) {
                target.focus({ preventScroll: true });
            }
        } catch (e) {
            try { target.focus(); } catch (e2) { }
        }
        try {
            if (typeof window.syncChatViewportLayout === 'function') {
                window.syncChatViewportLayout();
            }
        } catch (e3) { }
    };
    const wait = Number(delayMs);
    if (Number.isFinite(wait) && wait > 0) {
        setTimeout(run, wait);
    } else {
        run();
    }
}

window.focusChatInputSafely = focusChatInputSafely;

function bindChatSendButtonTouchGuardOnce() {
    if (window.__chatSendButtonTouchGuardBound) return;
    const sendBtn = document.querySelector('.send-arrow-btn');
    if (!sendBtn) return;
    sendBtn.addEventListener('touchstart', function (e) {
        const input = document.getElementById('msg-input');
        if (!input) return;
        if (document.activeElement !== input) return;
        e.preventDefault();
        sendMessage();
    }, { passive: false });
    window.__chatSendButtonTouchGuardBound = true;
}

function bindChatViewportLayoutSyncOnce() {
    if (window.__chatViewportLayoutSyncBound) return;

    const scrollHistoryToBottom = function () {
        const historyBox = document.getElementById('chat-history');
        if (!historyBox) return;
        const run = function () {
            historyBox.scrollTop = historyBox.scrollHeight;
        };
        requestAnimationFrame(run);
        setTimeout(run, 80);
    };

    const syncLayout = function () {
        const historyBox = document.getElementById('chat-history');
        const chatView = document.getElementById('chat-view');
        const input = document.getElementById('msg-input');

        const editableActive = isEditableElementActive();
        if (!editableActive) {
            refreshChatViewportBaseHeight(true);
        }
        const keyboardOffset = editableActive ? getChatViewportKeyboardOffset() : 0;

        if (chatView) {
            chatView.style.height = '';
        }

        document.documentElement.style.setProperty('--chat-keyboard-offset', keyboardOffset + 'px');
        document.documentElement.style.setProperty('--chat-keyboard-padding', keyboardOffset > 0 ? (keyboardOffset + 18) + 'px' : '0px');
        if (historyBox) {
            historyBox.style.scrollPaddingBottom = '';
            if (keyboardOffset > 0 && input && document.activeElement === input) {
                scrollHistoryToBottom();
            }
        }
    };

    window.syncChatViewportLayout = syncLayout;
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', syncLayout);
        window.visualViewport.addEventListener('scroll', syncLayout);
    }
    window.addEventListener('resize', syncLayout);
    window.addEventListener('orientationchange', syncLayout);
    const input = document.getElementById('msg-input');
    if (input && !window.__chatViewportInputSyncBound) {
        const nudgeLayout = function () {
            syncLayout();
            scrollHistoryToBottom();
            setTimeout(syncLayout, 60);
        };
        input.addEventListener('focus', nudgeLayout);
        input.addEventListener('click', nudgeLayout);
        input.addEventListener('input', scrollHistoryToBottom);
        window.__chatViewportInputSyncBound = true;
    }
    window.__chatViewportLayoutSyncBound = true;
    refreshChatViewportBaseHeight(true);
    syncLayout();
}

// =========================================================
// 🔄 替换开始：sendMessage (修复版：发完保持键盘不收起)
// =========================================================
function sendMessage() {
    const roleId = window.currentChatRole;
    const input = document.getElementById('msg-input');
    if (!roleId) return;
    if (!input) return;
    const text = String(input.value || '').trim();
    if (!text) return;

    if (typeof window.noteBusyUserInterruption === 'function') {
        try {
            window.noteBusyUserInterruption(roleId, text);
        } catch (e) {
            console.warn('[BusyGuard] note interruption failed:', e);
        }
    }

    if (typeof window.isLocationShareActive === 'function' && window.isLocationShareActive(roleId)) {
        if (typeof window.handleMainChatInputForLocationShare === 'function') {
            window.handleMainChatInputForLocationShare(text);
            input.value = '';
            focusChatInputSafely(input, document.activeElement === input ? 0 : 10);
            return;
        }
    }

    const historyData = (window.chatData && window.chatData[roleId]) ? window.chatData[roleId] : [];
    const lastMsg = historyData.length > 0 ? historyData[historyData.length - 1] : null;

    // 如果最后一条是系统阻断消息，记录“吵醒”计数，但不要在前端直接硬拦截。
    // 真正是否回复，交给 API 层基于作息/忙碌规则判断，避免把正常聊天误伤成“被拦截”。
    if (lastMsg && lastMsg.type === 'system_event' &&
        (lastMsg.content.includes('睡觉') || lastMsg.content.includes('勿扰') || lastMsg.content.includes('忙'))) {

        const now = Date.now();
        const lastAt = lastMsg.timestamp ? Number(lastMsg.timestamp) : 0;
        const diffMins = lastAt > 0 ? ((now - lastAt) / 1000 / 60) : 9999;

        // 如果距离上次阻断不到 60 分钟，且没有被“吵醒”（可以通过 localStorage 记录计数）
        const wakeUpKey = `wake_up_count_${roleId}`;
        let wakeUpCount = parseInt(localStorage.getItem(wakeUpKey) || "0");

        // 仅记录计数，不再弹窗 return；后端会基于计数和上下文动态决定是否允许“吵醒”。
        if (diffMins < 60) {
            localStorage.setItem(wakeUpKey, String(Math.min(8, wakeUpCount + 1)));
        }
    }

    // 【修改点】记录当前时间戳
    const now = Date.now();
    const userMsg = {
        role: 'me',
        content: text,
        type: 'text',
        timestamp: now, // 👈 加上这行
        status: 'sent'
    };

    ensureChatMessageId(userMsg);

    const quoteInfo = window.currentQuoteInfo && typeof window.currentQuoteInfo === 'object' ? window.currentQuoteInfo : null;
    if (quoteInfo && quoteInfo.quoteId) {
        userMsg.quoteId = String(quoteInfo.quoteId);
        userMsg.quote = {
            name: String(quoteInfo.name || 'TA'),
            text: String(quoteInfo.text || '')
        };
        if (typeof window.cancelQuote === 'function') {
            window.cancelQuote();
        } else {
            window.currentQuoteInfo = null;
        }
    }

    const layer = document.getElementById('location-share-layer');
    const state = layer && layer._locationShareState ? layer._locationShareState : null;
    if (state && state.travelStatus === 'moving' && state.travelDurationMs > 0 && state.travelStartTime > 0) {
        const nowTs = Date.now();
        let remainingMs = state.travelDurationMs - (nowTs - state.travelStartTime);
        if (remainingMs < 0) remainingMs = 0;
        let distanceMeters = null;
        if (state.travelTotalDistanceMeters !== null && state.travelDurationMs > 0) {
            const ratio = remainingMs <= 0 ? 0 : remainingMs / state.travelDurationMs;
            distanceMeters = Math.max(0, Math.round(state.travelTotalDistanceMeters * ratio));
        }
        const sec = Math.ceil(remainingMs / 1000);
        const min = Math.floor(sec / 60);
        const s = sec % 60;
        const minStr = min > 0 ? min + ' 分 ' : '';
        const timeText = minStr + s + ' 秒';
        let distText = '';
        if (distanceMeters !== null) {
            if (distanceMeters >= 1000) {
                distText = (distanceMeters / 1000).toFixed(1).replace(/\.0$/, '') + ' 公里';
            } else {
                distText = distanceMeters + ' 米';
            }
        } else {
            distText = '未知距离';
        }
        const modeLabel = getLocationShareModeLabel(state.travelMode);
        userMsg.aiHint = `[系统提示：你正在${modeLabel}前往用户，距离约 ${distText}，还有 ${timeText}。你必须清晰地意识到自己还在路上，不能说已经到达或马上就在眼前。请结合当前出行方式，自然描写周围环境或身体状态，例如车内环境、脚步声或喘气等。]`;
    }

    // 初始化数组防止报错
    if (!window.chatData || typeof window.chatData !== 'object') window.chatData = {};
    if (!window.chatData[roleId]) window.chatData[roleId] = [];

    // 存入数据
    window.chatData[roleId].push(userMsg);
    // 上屏
    appendMessageToDOM(userMsg);

    input.value = ''; // 清空输入框
    saveData(); // 保存数据

    try {
        const giftPoolSystem = window.GiftPoolSystem && typeof window.GiftPoolSystem === 'object' ? window.GiftPoolSystem : null;
        const giftPoolState = giftPoolSystem && typeof giftPoolSystem.getState === 'function'
            ? giftPoolSystem.getState(roleId)
            : null;
        if (giftPoolState && giftPoolState.chatTrackingStarted === true && typeof giftPoolSystem.recordChatTurn === 'function') {
            giftPoolSystem.recordChatTurn(roleId, 1);
        }
    } catch (e) { }

    focusChatInputSafely(input, document.activeElement === input ? 0 : 10);

    console.log("消息已发送，等待魔法棒触发回复...");
}

function buildWorldBookPrompt(worldbookIds) {
    if (!worldbookIds) return '';
    const ids = Array.isArray(worldbookIds) ? worldbookIds : [String(worldbookIds || '').trim()];
    if (!window.worldBooks) return '';

    let totalPrompt = '';
    ids.forEach(id => {
        const wbId = String(id || '').trim();
        if (!wbId) return;

        if (wbId.startsWith('cat:') || wbId.startsWith('CATEGORY:')) {
            const targetCat = wbId.includes(':') ? wbId.split(':')[1] : wbId;
            const allIds = Object.keys(window.worldBooks || {});
            const catBooks = allIds
                .map(bid => ({ ...window.worldBooks[bid], id: bid }))
                .filter(b => {
                    if (!b) return false;
                    const bCat = b.category ? String(b.category).trim() : '未分类';
                    return bCat === targetCat;
                });

            if (catBooks.length > 0) {
                totalPrompt += `\n\n【🌍 当前世界观设定集分类：${targetCat}】\n`;
                catBooks.forEach((b, index) => {
                    const title = b && b.title ? String(b.title) : `设定 ${index + 1}`;
                    const content = b && b.content ? String(b.content) : '(无内容)';
                    totalPrompt += `\n--- [设定: ${title}] ---\n${content}\n`;
                });
            }
            return;
        }

        const wb = window.worldBooks[wbId];
        if (wb) {
            totalPrompt += `\n\n【🌍 当前场景/世界观设定】\n标题：${wb.title}\n内容：${wb.content}`;
        }
    });

    if (totalPrompt) {
        totalPrompt += `\n请基于以上选中的世界观设定进行叙事。`;
    }
    return totalPrompt;
}

function getCurrentUserProfile() {
    let avatar = '';
    let name = '';
    try {
        if (window.MineProfile && typeof window.MineProfile.getProfile === 'function') {
            const p = window.MineProfile.getProfile() || {};
            avatar = p.avatar || '';
            name = p.name || '';
        }
    } catch (e) { }
    if (!avatar) {
        try { avatar = localStorage.getItem('user_avatar') || ''; } catch (e) { }
    }
    if (!name) {
        try { name = localStorage.getItem('user_name') || ''; } catch (e) { }
    }
    if (!avatar) avatar = 'assets/chushitouxiang.jpg';
    if (!name) name = '我';
    return { avatar: avatar, name: name };
}

function makeInviteId() {
    return 'lt_' + Date.now() + '_' + Math.random().toString(16).slice(2);
}

function findInviteMessage(roleId, inviteId) {
    const list = window.chatData && window.chatData[roleId];
    if (!Array.isArray(list)) return null;
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (m && m.type === 'listen_invite' && String(m.inviteId || '') === String(inviteId || '')) return m;
    }
    return null;
}

function findLatestPendingInviteId(roleId) {
    const list = window.chatData && window.chatData[roleId];
    if (!Array.isArray(list)) return '';
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (!m) continue;
        if (m.type !== 'listen_invite') continue;
        if (String(m.inviteStatus || 'pending') !== 'pending') continue;
        const id = String(m.inviteId || '').trim();
        if (id) return id;
    }
    return '';
}

function sendInvite(payload) {
    const roleId = (payload && payload.roleId) ? String(payload.roleId) : String(window.currentChatRole || '');
    if (!roleId) return;

    let p = getCurrentUserProfile();
    if (payload && typeof payload === 'object') {
        const pvName = payload.userName ? String(payload.userName) : '';
        const pvAvatar = payload.userAvatar ? String(payload.userAvatar) : '';
        if (pvName || pvAvatar) {
            p = { name: pvName || p.name, avatar: pvAvatar || p.avatar };
        }
    }
    const inviteId = makeInviteId();
    const now = Date.now();

    const track = payload && payload.track && typeof payload.track === 'object' ? payload.track : null;
    const msg = {
        role: 'me',
        type: 'listen_invite',
        timestamp: now,
        status: 'sent',
        inviteId: inviteId,
        inviteStatus: 'pending',
        userName: p.name,
        userAvatar: p.avatar,
        track: track
    };

    if (!window.chatData[roleId]) window.chatData[roleId] = [];
    window.chatData[roleId].push(msg);
    saveData();

    try {
        localStorage.setItem('listen_together_pending_ai', JSON.stringify({
            roleId: roleId,
            inviteId: inviteId,
            at: now
        }));
    } catch (e) { }

    if (String(window.currentChatRole || '') === roleId) {
        appendMessageToDOM(msg);
        const historyBox = document.getElementById('chat-history');
        if (historyBox) historyBox.scrollTop = historyBox.scrollHeight;
        try { localStorage.removeItem('listen_together_pending_ai'); } catch (e) { }
        setTimeout(function () {
            if (String(window.currentChatRole || '') === roleId) {
                triggerAI();
            }
        }, 180);
    }
}

function updateInviteStatusInData(roleId, inviteId, nextStatus) {
    const msg = findInviteMessage(roleId, inviteId);
    if (!msg) return null;
    msg.inviteStatus = String(nextStatus || '');
    saveData();
    return msg;
}

function updateInviteCardRow(row, nextStatus) {
    if (!row) return;
    const card = row.querySelector('.listen-invite-card');
    if (!card) return;
    const actions = card.querySelector('.listen-invite-actions');
    if (actions) actions.style.display = 'none';
    card.classList.toggle('is-disabled', nextStatus === 'cancelled' || nextStatus === 'declined');
    card.classList.toggle('is-accepted', nextStatus === 'accepted');
    card.classList.toggle('is-cancelled', nextStatus === 'cancelled');
    const stateEl = card.querySelector('.listen-invite-state');
    if (stateEl) {
        if (nextStatus === 'cancelled') stateEl.textContent = '已取消';
        else if (nextStatus === 'declined') stateEl.textContent = '已拒绝';
        else if (nextStatus === 'accepted') stateEl.textContent = '已接受';
        else stateEl.textContent = '';
    }
}

function handleInviteClick(action, inviteId) {
    const roleId = String(window.currentChatRole || '');
    if (!roleId || !inviteId) return;

    const list = window.chatData && window.chatData[roleId];
    if (!Array.isArray(list)) return;

    const normalized = String(action || '');
    const row = document.querySelector('.msg-row[data-type="listen_invite"] .listen-invite-card[data-invite-id="' + String(inviteId) + '"]');
    const rowEl = row && row.closest ? row.closest('.msg-row') : null;

    if (normalized === 'decline') {
        updateInviteStatusInData(roleId, inviteId, 'declined');
        if (rowEl) updateInviteCardRow(rowEl, 'declined');
        return;
    }

    if (normalized === 'accept') {
        updateInviteStatusInData(roleId, inviteId, 'accepted');
        if (rowEl) updateInviteCardRow(rowEl, 'accepted');
        characterAcceptsInvite(inviteId);
    }
}

function switchMusicToTogetherMode(payload) {
    const session = payload && typeof payload === 'object' ? payload : {};
    if (!('at' in session)) {
        session.at = Date.now();
    }
    try {
        localStorage.setItem('listen_together_session', JSON.stringify(session));
    } catch (e) { }

    try {
        if (window.GlobalMusicPlayer && typeof window.GlobalMusicPlayer.openNowPlaying === 'function') {
            window.GlobalMusicPlayer.openNowPlaying();
        } else if (typeof window.openApp === 'function') {
            window.openApp('music');
        }
    } catch (e) { }

    window.setTimeout(function () {
        const iframe = document.querySelector('#app-content-area iframe');
        if (!iframe) return;
        try {
            iframe.contentWindow.postMessage({ type: 'MUSIC_TOGETHER_START', payload: session }, '*');
        } catch (e) { }
    }, 220);
}

function characterAcceptsInvite(inviteId, forcedRoleId) {
    const roleId = String(forcedRoleId || window.currentChatRole || '');
    if (!roleId || !inviteId) return;

    const inviteMsg = findInviteMessage(roleId, inviteId);
    if (findInviteDecisionMessage(roleId, inviteId)) return;
    let p = getCurrentUserProfile();
    if (inviteMsg && typeof inviteMsg === 'object') {
        const n = inviteMsg.userName ? String(inviteMsg.userName) : '';
        const a = inviteMsg.userAvatar ? String(inviteMsg.userAvatar) : '';
        if (n || a) {
            p = { name: n || p.name, avatar: a || p.avatar };
        }
    }
    const profile = (window.charProfiles && window.charProfiles[roleId]) ? window.charProfiles[roleId] : {};
    const characterName = profile.nickName || profile.name || roleId;
    const characterAvatar = profile.avatar || 'assets/chushitouxiang.jpg';
    const track = inviteMsg && inviteMsg.track ? inviteMsg.track : null;

    const now = Date.now();
    const reply = {
        role: 'ai',
        type: 'listen_invite_accepted',
        timestamp: now,
        inviteId: String(inviteId),
        userName: p.name,
        userAvatar: p.avatar,
        characterName: String(characterName),
        characterAvatar: String(characterAvatar),
        track: track
    };

    let rendered = false;
    if (typeof window.pushRoleMessageToDataAndActiveView === 'function') {
        rendered = window.pushRoleMessageToDataAndActiveView(roleId, reply);
    } else {
        if (!window.chatData[roleId]) window.chatData[roleId] = [];
        window.chatData[roleId].push(reply);
        if (String(window.currentChatRole || '') === String(roleId || '')) {
            appendMessageToDOM(reply);
            rendered = true;
        }
    }
    saveData();
    if (rendered) {
        const historyBox = document.getElementById('chat-history');
        if (historyBox) historyBox.scrollTop = historyBox.scrollHeight;
    } else if (typeof window.loadWechatChatList === 'function') {
        try { window.loadWechatChatList(true); } catch (e) { }
    }
    switchMusicToTogetherMode({
        roleId: roleId,
        inviteId: String(inviteId),
        track: track,
        userName: p.name,
        userAvatar: p.avatar,
        characterName: String(characterName),
        characterAvatar: String(characterAvatar)
    });
}

function findInviteDecisionMessage(roleId, inviteId) {
    const list = window.chatData && window.chatData[roleId];
    if (!Array.isArray(list)) return null;
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (!m) continue;
        if ((m.type === 'listen_invite_accepted' || m.type === 'listen_invite_declined') && String(m.inviteId || '') === String(inviteId || '')) {
            return m;
        }
    }
    return null;
}

function characterDeclinesInvite(inviteId, extraText, forcedRoleId) {
    const roleId = String(forcedRoleId || window.currentChatRole || '');
    if (!roleId || !inviteId) return;
    const inviteMsg = findInviteMessage(roleId, inviteId);
    if (!inviteMsg) return;
    if (String(inviteMsg.inviteStatus || '') === 'declined') return;
    if (findInviteDecisionMessage(roleId, inviteId)) return;

    updateInviteStatusInData(roleId, inviteId, 'declined');
    if (typeof window.isChatRoleViewActive === 'function' ? window.isChatRoleViewActive(roleId) : String(window.currentChatRole || '') === String(roleId || '')) {
        const row = document.querySelector('.msg-row[data-type="listen_invite"] .listen-invite-card[data-invite-id="' + String(inviteId) + '"]');
        const rowEl = row && row.closest ? row.closest('.msg-row') : null;
        if (rowEl) updateInviteCardRow(rowEl, 'declined');
    }

    const p = getCurrentUserProfile();
    const profile = (window.charProfiles && window.charProfiles[roleId]) ? window.charProfiles[roleId] : {};
    const characterName = profile.nickName || profile.name || roleId;
    const characterAvatar = profile.avatar || 'assets/chushitouxiang.jpg';
    const track = inviteMsg && inviteMsg.track ? inviteMsg.track : null;
    const now = Date.now();
    const reply = {
        role: 'ai',
        type: 'listen_invite_declined',
        timestamp: now,
        inviteId: String(inviteId),
        userName: p.name,
        userAvatar: p.avatar,
        characterName: String(characterName),
        characterAvatar: String(characterAvatar),
        track: track,
        extraText: extraText ? String(extraText) : ''
    };
    let rendered = false;
    if (typeof window.pushRoleMessageToDataAndActiveView === 'function') {
        rendered = window.pushRoleMessageToDataAndActiveView(roleId, reply);
    } else {
        if (!window.chatData[roleId]) window.chatData[roleId] = [];
        window.chatData[roleId].push(reply);
        if (String(window.currentChatRole || '') === String(roleId || '')) {
            appendMessageToDOM(reply);
            rendered = true;
        }
    }
    saveData();
    if (rendered) {
        const historyBox = document.getElementById('chat-history');
        if (historyBox) historyBox.scrollTop = historyBox.scrollHeight;
    } else if (typeof window.loadWechatChatList === 'function') {
        try { window.loadWechatChatList(true); } catch (e) { }
    }
}

function applyListenTogetherDecisionFromAI(rawText, forcedRoleId) {
    const roleId = String(forcedRoleId || window.currentChatRole || '');
    if (!roleId || !rawText) return { handled: false, text: rawText, decisions: [] };
    let text = String(rawText);
    const decisions = [];

    const re = /\[\[\s*LISTEN_TOGETHER_(ACCEPT|DECLINE)\s*:\s*([^\]]+?)\s*\]\]/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
        const kind = String(m[1] || '').toUpperCase();
        let inviteId = String(m[2] || '').trim();
        if (!inviteId || inviteId.toLowerCase() === 'invite_id' || inviteId.toLowerCase() === 'inviteid') {
            inviteId = findLatestPendingInviteId(roleId);
        }
        if (!inviteId) continue;
        decisions.push({ kind: kind, inviteId: inviteId });
    }
    text = text.replace(re, '').trim();
    return { handled: decisions.length > 0, text: text, decisions: decisions };
}

window.sendInvite = sendInvite;
window.handleInviteClick = handleInviteClick;
window.characterAcceptsInvite = characterAcceptsInvite;


function normalizeStickerListForAI(list) {
    if (!Array.isArray(list)) return [];
    const result = [];
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item) continue;
        if (typeof item === 'string') {
            result.push({ name: '', src: item });
        } else {
            const src = item.src || item.url || item.href || '';
            if (!src) continue;
            const name = item.name || '';
            result.push({ name: name, src: src });
        }
    }
    return result;
}

function buildAIStickerPromptText() {
    const roleId = window.currentChatRole || '';
    const scope = typeof window.getCombinedStickerScopeForRole === 'function'
        ? window.getCombinedStickerScopeForRole(roleId)
        : (typeof window.getStickerScopeForRole === 'function'
            ? window.getStickerScopeForRole(roleId)
            : { tabs: window.stickerData || {} });
    const tabs = scope && scope.tabs ? scope.tabs : {};
    const hisList = normalizeStickerListForAI(tabs.his);
    const generalList = normalizeStickerListForAI(tabs.general);
    const merged = hisList.concat(generalList);
    if (!merged.length) return '';
    const lines = [];
    lines.push('[可用表情清单]:');
    for (let i = 0; i < merged.length; i++) {
        const item = merged[i];
        const n = item.name || '';
        lines.push('- 表情名: ' + n + ', URL: ' + item.src);
    }
    const tail = '\n\n【表情包发送规则】\n- 表情包不是照片/图片。表情包只能从[可用表情清单]中选择，优先根据“表情名”判断含义。\n- 如果要发送表情包，首选在 reply 数组里使用对象：{"type":"sticker","url":"清单里的完整URL"}。\n- 兼容写法是单独输出：[STICKER:清单里的完整URL]。冒号后必须是完整 URL，不要写表情名、描述、Markdown 图片或普通图片 URL。\n- 真实自拍、风景、饭、房间、物品等画面分享用 {"type":"photo","content":"画面描述"}，不要用 sticker。\n- 只能使用[可用表情清单]里提供的 URL，严禁编造 URL 或使用清单之外的图片。';
    return lines.join('\n') + tail;
}

function calcVoiceDurationSeconds(text) {
    if (!text) return 1;
    const str = String(text);
    const seconds = Math.round(str.length * 0.3);
    if (seconds < 1) return 1;
    if (seconds > 60) return 60;
    return seconds;
}

// 🔥 新增：为转账/图片等特殊消息生成虚拟content，让AI能"看到"
function ensureMessageContent(msg) {
    if (!msg) return msg;

    if ((msg.type === 'text' || msg.type === undefined) && msg.aiHint) {
        const hint = String(msg.aiHint || '').trim();
        if (hint) {
            const base = String(msg.content || '');
            msg.content = base ? (base + ' ' + hint) : hint;
        }
    }

    if (msg.type === 'dice') {
        const raw = msg.content || '';
        const pointText = String(raw || '');
        if (msg.role === 'me') {
            msg.content = `[系统通知：用户掷出了骰子，点数是 ${pointText}]`;
        } else if (msg.role === 'ai') {
            msg.content = `[系统通知：你(AI)掷出了骰子，点数是 ${pointText}]`;
        } else {
            msg.content = `[系统通知：掷出了骰子，点数是 ${pointText}]`;
        }
        return msg;
    }

    // 语音消息在传给 AI 时，统一加上显式前缀
    if (msg.type === 'voice') {
        const raw = msg.content || '';
        msg.content = '[语音消息] ' + raw;
        return msg;
    }

    if (msg.type === 'location') {
        let name = '';
        try {
            const obj = JSON.parse(msg.content || '{}');
            if (obj && typeof obj === 'object') {
                name = String(obj.name || '').trim();
            }
        } catch (e) { }
        if (!name) name = '未知地点';
        if (msg.role === 'me') {
            msg.content = `[系统通知：用户发送了一个位置卡片，地点是：${name}。这只是位置卡片，不代表已经开始实时位置共享，也不代表你们已经线下见面。]`;
        } else if (msg.role === 'ai') {
            msg.content = `[系统通知：你(AI)发送了一个位置卡片，地点是：${name}。这只是位置卡片，不代表已经开始实时位置共享，也不代表你们已经线下见面。]`;
        } else {
            msg.content = `[系统通知：发送了一个位置卡片，地点是：${name}。这只是位置卡片，不代表已经开始实时位置共享，也不代表已经线下见面。]`;
        }
        return msg;
    }

    if (msg.type === 'image') {
        const raw = typeof msg.content === 'string' ? String(msg.content || '').trim() : '';
        const isDataImage = raw && (raw.startsWith('data:image/') || raw.startsWith('blob:') || raw.indexOf('data:image/') !== -1);
        const desc = String(msg.description || '').trim();
        if (isDataImage) {
            if (!msg.base64 && raw) {
                msg.base64 = raw;
            }
            if (msg.role === 'me') {
                msg.content = '[系统通知：用户发送了一张真实照片，请根据视觉画面回复]';
            } else if (msg.role === 'ai') {
                msg.content = '[系统通知：你(AI)发送了一张图片]';
            } else {
                msg.content = '[系统通知：发送了一张图片]';
            }
        } else if (desc) {
            if (msg.role === 'ai') {
                msg.content = `[图片消息：你(AI)发送了一张图片，内容是：${desc}]`;
            } else {
                msg.content = `[图片消息：用户发送了一张图片，内容是：${desc}]`;
            }
        } else {
            if (msg.role === 'ai') {
                msg.content = '[系统通知：你(AI)发送了一个表情包]';
            } else if (msg.role === 'me') {
                msg.content = '[系统通知：用户发送了一个表情包]';
            } else {
                msg.content = '[系统通知：发送了一个表情包]';
            }
        }
        return msg;
    }

    if (msg.type === 'sticker') {
        const stickerText = typeof window.buildStickerSemanticText === 'function'
            ? window.buildStickerSemanticText(window.currentChatRole || msg.roleId || '', msg, {
                actor: msg.role === 'me' ? '用户' : (msg.role === 'ai' ? '你' : '对方')
            })
            : (msg.role === 'me' ? '[系统通知：用户发送了一个表情包]' : '[系统通知：你(AI)发送了一个表情包]');
        msg.content = stickerText;
        return msg;
    }

    if (typeof msg.content === 'string' && msg.content) {
        const c = String(msg.content || '').trim();
        if (c.startsWith('data:image/') || c.startsWith('blob:') || c.indexOf('data:image/') !== -1) {
            msg.content = msg.role === 'me'
                ? '[系统通知：用户发送了一张真实照片，请根据视觉画面回复]'
                : '[系统通知：发送了一张图片]';
            return msg;
        }
    }

    if (msg.type === 'listen_invite') {
        const inviteId = String(msg.inviteId || '').trim();
        const track = msg.track && typeof msg.track === 'object' ? msg.track : {};
        const title = track && track.title ? String(track.title) : '未知歌曲';
        const artist = track && track.artist ? String(track.artist) : '未知歌手';
        const key = track && track.key ? String(track.key) : '';
        const url = track && track.url ? String(track.url) : '';
        msg.content = `[系统通知：用户向你发起一起听邀请。invite_id=${inviteId || '未知'}；当前歌曲=${title}；歌手=${artist}；track_key=${key || '未知'}；audio_url=${url || '未知'}。请先用1-3句自然中文回应（围绕“一起听/歌曲/氛围”，符合你的角色人设），允许用“|||”分段；然后在同一条回复的最后追加且仅追加一个指令：[[LISTEN_TOGETHER_ACCEPT:${inviteId}]] 或 [[LISTEN_TOGETHER_DECLINE:${inviteId}]]（invite_id 必须原样带回，严禁写成字面 invite_id）。]`;
        return msg;
    }

    if (msg.type === 'listen_invite_accepted') {
        const inviteId = String(msg.inviteId || '').trim();
        msg.content = `[系统通知：一起听邀请已被接受。invite_id=${inviteId || '未知'}。]`;
        return msg;
    }

    if (msg.type === 'listen_invite_declined') {
        const inviteId = String(msg.inviteId || '').trim();
        msg.content = `[系统通知：一起听邀请已被拒绝。invite_id=${inviteId || '未知'}。]`;
        return msg;
    }

    if (msg.type === 'couple_invite') {
        const inviteId = String(msg.inviteId || '').trim();
        const userName = String(msg.userName || '用户').trim() || '用户';
        msg.content = `[系统通知：${userName}向你发起建立情侣关系并开启情侣空间的邀请。invite_id=${inviteId || '未知'}。请根据你的人设、关系亲疏、最近互动和真实边界判断是否接受，并自然回复。]`;
        return msg;
    }

    // 如果已有content，直接返回
    if (msg.content) return msg;

    // 根据type生成虚拟content
    if (msg.type === 'transfer') {
        const amount = msg.amount || '未知金额';
        const note = msg.note || '（无备注）';
        if (msg.role === 'me') {
            msg.content = `[系统消息: 用户向你发起了一笔转账，金额：¥${amount}，备注：${note}。请根据当前关系与氛围决定是否收下。]`;
        } else if (msg.role === 'ai') {
            msg.content = `[系统消息: 你向用户发起了一笔转账，金额：¥${amount}，备注：${note}。]`;
        } else {
            msg.content = `[系统消息: 发起了一笔转账，金额：¥${amount}，备注：${note}。]`;
        }
    } else if (msg.type === 'redpacket') {
        const amount = msg.amount;
        const note = msg.note || '恭喜发财';
        const amountText = amount ? `金额约为 ¥${amount}` : '金额未知';
        if (msg.role === 'me') {
            msg.content = `[系统消息: 用户向你发送了一个红包，备注：${note}，${amountText}。请根据你对用户的好感度和当前情境决定是否领取。]`;
        } else if (msg.role === 'ai') {
            msg.content = `[系统消息: 你向用户发送了一个红包，备注：${note}，${amountText}。]`;
        } else {
            msg.content = `[系统消息: 发送了一个红包，备注：${note}，${amountText}。]`;
        }
    } else if (msg.type === 'family_card') {
        const amount = msg.amount || '未知额度';
        if (msg.role === 'me') {
            msg.content = `[系统消息: 用户向你发送了一张亲属卡，额度：¥${amount}。]`;
        } else if (msg.role === 'ai') {
            msg.content = `[系统消息: 你向用户发送了一张亲属卡，额度：¥${amount}。]`;
        } else {
            msg.content = `[系统消息: 发送了一张亲属卡，额度：¥${amount}。]`;
        }
    } else if (msg.type === 'image') {
        if (msg.role === 'ai') {
            msg.content = '[你(AI)发送了一张图片]';
        } else if (msg.role === 'me') {
            msg.content = '[用户发送了一张图片]';
        } else {
            msg.content = '[发送了一张图片]';
        }
    } else if (msg.type === 'sticker') {
        msg.content = typeof window.buildStickerSemanticText === 'function'
            ? window.buildStickerSemanticText(window.currentChatRole || msg.roleId || '', msg, {
                actor: msg.role === 'ai' ? '你' : (msg.role === 'me' ? '用户' : '对方')
            })
            : (msg.role === 'ai'
                ? '[你(AI)发送了一个表情包]'
                : (msg.role === 'me' ? '[用户发送了一个表情包]' : '[发送了一个表情包]'));
    } else if (msg.type === 'history') {
        // 聊天记录：生成预览
        msg.content = '[用户转发了聊天记录]';
    } else if (msg.type === 'takeout_card') {
        let parsed = null;
        try {
            parsed = JSON.parse(msg.content);
        } catch(e) {}
        const shopName = parsed && parsed.shopName ? parsed.shopName : '外卖';
        if (msg.role === 'ai') {
            msg.content = `[你(AI)为用户点了一份${shopName}]`;
        } else if (msg.role === 'me') {
            msg.content = `[用户为你点了一份${shopName}]`;
        } else {
            msg.content = `[系统通知：收到一份${shopName}]`;
        }
    } else {
        // 其他类型：标记为未知
        msg.content = '[消息]';
    }

    return msg;
}
function normalizeMoneyActionKind(kind, remark, fallbackText) {
    const raw = String(kind || '').trim().toLowerCase();
    const compact = raw.replace(/[\s_-]+/g, '');
    if (compact === 'redpacket' || compact === 'hongbao') return 'redpacket';
    if (compact === 'transfer' || compact === 'zhuanzhang' || compact === 'moneytransfer') return 'transfer';
    const haystack = [remark, fallbackText].map(function (item) {
        return String(item || '').trim();
    }).filter(Boolean).join(' ');
    if (/红包|🧧|恭喜发财|大吉大利|压岁钱|利是|开红包|拆红包|hong\s*bao|red\s*packet/i.test(haystack)) {
        return 'redpacket';
    }
    return 'transfer';
}

window.normalizeMoneyActionKind = normalizeMoneyActionKind;

function findLatestPendingUserMoneyKindForAI(roleId) {
    const id = String(roleId || window.currentChatRole || '').trim();
    const list = id && window.chatData && Array.isArray(window.chatData[id]) ? window.chatData[id] : [];
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (!m || m.role !== 'me') continue;
        if (m.type === 'transfer' && m.status !== 'accepted' && m.status !== 'returned') return 'transfer';
        if (m.type === 'redpacket' && m.status !== 'opened' && m.status !== 'returned') return 'redpacket';
        if (m.type !== 'text' && m.type !== undefined) return '';
    }
    return '';
}

function consumeMoneyAcceptDirectiveCodes(rawText, roleId) {
    let text = String(rawText || '');
    const result = { text: text, acceptTransfer: false, openRedpacket: false };
    if (!text) return result;

    const acceptTransferPatterns = [
        /\[\[\s*ACCEPT_TRANSFER\s*\]\]/gi,
        /(?:\[\[?\s*|【\s*)(?:accept|receive|received|collect|take)\s*[-_\s]*(?:transfer|zhuan\s*zhang|money|payment)(?:\s*[:：]\s*[\w.-]+)?\s*(?:\]\]?|】)/gi
    ];
    const openRedpacketPatterns = [
        /\[\[\s*OPEN_REDPACKET\s*\]\]/gi,
        /(?:\[\[?\s*|【\s*)(?:open|accept|receive|received|claim|take)\s*[-_\s]*(?:red\s*packet|redpacket|hong\s*bao|hongbao|red|红包)(?:\s*[:：]\s*[\w.-]+)?\s*(?:\]\]?|】)/gi
    ];
    const inferredKind = findLatestPendingUserMoneyKindForAI(roleId);
    const inferAcceptPatterns = [
        /(?:\[\[?\s*|【\s*)(?:accept|receive|received|claim|take|open)(?:\s*[-_:：]\s*[\w.-]+)?\s*(?:\]\]?|】)/gi
    ];

    for (let i = 0; i < acceptTransferPatterns.length; i++) {
        text = text.replace(acceptTransferPatterns[i], function () {
            result.acceptTransfer = true;
            return ' ';
        });
    }
    for (let i = 0; i < openRedpacketPatterns.length; i++) {
        text = text.replace(openRedpacketPatterns[i], function () {
            result.openRedpacket = true;
            return ' ';
        });
    }
    if (inferredKind && !result.acceptTransfer && !result.openRedpacket) {
        for (let i = 0; i < inferAcceptPatterns.length; i++) {
            text = text.replace(inferAcceptPatterns[i], function () {
                if (inferredKind === 'redpacket') result.openRedpacket = true;
                else result.acceptTransfer = true;
                return ' ';
            });
        }
    }

    result.text = text.trim();
    return result;
}

window.consumeMoneyAcceptDirectiveCodes = consumeMoneyAcceptDirectiveCodes;

// 🔥 必须保留：解析AI回复中的转账标记
function parseAITransferFromContent(rawText, roleId) {
    if (!rawText) {
        return { text: '', transfer: null, acceptTransfer: false, openRedpacket: false };
    }

    let acceptTransfer = false;
    let openRedpacket = false;
    const codeParsed = consumeMoneyAcceptDirectiveCodes(rawText, roleId);
    acceptTransfer = codeParsed.acceptTransfer;
    openRedpacket = codeParsed.openRedpacket;
    rawText = codeParsed.text;

    const acceptUiPatterns = [
        /[\[【]\s*(?:已\s*收\s*款|已\s*收\s*取|已\s*收\s*下|收\s*下\s*转\s*账|已\s*接受\s*转\s*账|转\s*账\s*已\s*收)\s*[：:\s]*[¥￥]?\s*\d*(?:\.\d+)?\s*(?:元)?\s*[\]】]/gi,
        /[\[【]\s*(?:已\s*收\s*款|已\s*收\s*取|已\s*收\s*下)\s*[\]】]\s*[¥￥]?\s*\d+(?:\.\d+)?\s*(?:元)?/gi
    ];
    for (let i = 0; i < acceptUiPatterns.length; i++) {
        rawText = rawText.replace(acceptUiPatterns[i], function () {
            acceptTransfer = true;
            return ' ';
        });
    }

    const openRedpacketUiPatterns = [
        /[\[【]\s*(?:已\s*领\s*取\s*红\s*包|红\s*包\s*已\s*领\s*取|已\s*拆\s*红\s*包|拆\s*开\s*红\s*包)\s*[：:\s]*[¥￥]?\s*\d*(?:\.\d+)?\s*(?:元)?\s*[\]】]/gi,
        /[\[【]\s*(?:已\s*领\s*取|已\s*拆\s*开)\s*[\]】]\s*[¥￥]?\s*\d+(?:\.\d+)?\s*(?:元)?/gi
    ];
    for (let i = 0; i < openRedpacketUiPatterns.length; i++) {
        rawText = rawText.replace(openRedpacketUiPatterns[i], function () {
            openRedpacket = true;
            return ' ';
        });
    }

    const pattern = /:::\s*TRANSFER\s*:(\{[\s\S]*?\})\s*:::/i;
    const match = rawText.match(pattern);

    if (!match) {
        const plainCardPattern = /[\[【]\s*(转账|微信转账|红包|发红包)\s*[\]】]\s*[：:\s]*[¥￥]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:元)?/i;
        const plainCardMatch = rawText.match(plainCardPattern);
        if (plainCardMatch && !acceptTransfer && !openRedpacket) {
            const amount = parseFloat(plainCardMatch[2]);
            if (!isNaN(amount) && amount > 0) {
                const label = String(plainCardMatch[1] || '');
                const cleanedText = rawText.replace(plainCardPattern, '').trim();
                return {
                    text: cleanedText,
                    transfer: {
                        amount: amount.toFixed(2),
                        remark: '',
                        kind: /红包/.test(label) ? 'redpacket' : 'transfer'
                    },
                    acceptTransfer: acceptTransfer,
                    openRedpacket: openRedpacket
                };
            }
        }
        rawText = rawText.replace(/[\[【]\s*(?:转账|微信转账|红包|发红包)\s*[\]】]\s*[：:\s]*[¥￥]?\s*[0-9]+(?:\.[0-9]+)?\s*(?:元)?/gi, ' ');
        rawText = rawText.replace(/[\[【]\s*(?:转账|微信转账|红包|发红包)\s*[\]】]/gi, ' ');
        return { text: rawText.trim(), transfer: null, acceptTransfer: acceptTransfer, openRedpacket: openRedpacket };
    }

    let transfer = null;
    try {
        const obj = JSON.parse(match[1]);
        if (obj && typeof obj === 'object') {
            const amount = typeof obj.amount === 'number' ? obj.amount : parseFloat(obj.amount);
            const remark = typeof obj.remark === 'string' ? obj.remark : '';
            if (!isNaN(amount)) {
                transfer = {
                    amount: amount.toFixed(2),
                    remark: remark
                };
                transfer.kind = normalizeMoneyActionKind(obj.kind, remark, rawText);
            }
        }
    } catch (e) {
        console.error('转账解析失败:', e);
    }

    const cleanedText = rawText.replace(pattern, '').trim();
    return {
        text: cleanedText,
        transfer: transfer,
        acceptTransfer: acceptTransfer,
        openRedpacket: openRedpacket
    };
}

function parseAIFamilyCardFromContent(rawText) {
    const text = String(rawText || '');
    if (!text) return { text: '', amount: '' };
    const patterns = [
        /send_family_card\s*\(\s*([0-9]+(?:\.[0-9]+)?)\s*\)/i,
        /\[\s*FAMILY_CARD\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*\]/i
    ];
    for (let i = 0; i < patterns.length; i++) {
        const re = patterns[i];
        const m = text.match(re);
        if (!m) continue;
        const amt = normalizeFamilyCardAmount(m[1]);
        const cleaned = text.replace(re, '').trim();
        return { text: cleaned, amount: amt };
    }
    return { text: text.trim(), amount: '' };
}

