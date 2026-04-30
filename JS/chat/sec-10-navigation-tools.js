/* === [SEC-10] 闭环导航与图片工具 === */

function backToList() {
    const roleId = window.currentChatRole;
    if (roleId && typeof window.markChatRoleAsRead === 'function') {
        try {
            window.markChatRoleAsRead(roleId, null, { persist: true });
        } catch (e) { }
    }
    // 1. 隐藏聊天室大盒子
    const chatView = document.getElementById('chat-view');
    if (chatView) chatView.style.display = 'none';
    document.body.classList.remove('chat-view-active');

    // 2. 显示桌面 (因为 App Window 是浮在桌面上的)
    const desktopView = document.getElementById('desktop-view');
    if (desktopView) desktopView.style.display = 'block';

    // 3. 直接恢复微信列表。openChatApp 会重新加 active，这里临时关掉过渡，避免列表从底部弹出。
    const appWindow = document.getElementById('app-window');
    const previousTransition = appWindow ? appWindow.style.getPropertyValue('transition') : '';
    const previousTransitionPriority = appWindow ? appWindow.style.getPropertyPriority('transition') : '';
    const previousAnimation = appWindow ? appWindow.style.getPropertyValue('animation') : '';
    const previousAnimationPriority = appWindow ? appWindow.style.getPropertyPriority('animation') : '';

    if (appWindow) {
        appWindow.style.setProperty('transition', 'none', 'important');
        appWindow.style.setProperty('animation', 'none', 'important');
    }

    if (typeof window.openChatApp === 'function') {
        window.openChatApp();
    } else if (appWindow) {
        appWindow.classList.add('active');
        if (typeof window.loadWechatChatList === 'function') window.loadWechatChatList(true);
    }

    const plusBtn = document.getElementById('top-plus-btn');
    if (plusBtn) plusBtn.style.display = 'none';

    if (appWindow) {
        void appWindow.offsetHeight;
        requestAnimationFrame(function () {
            if (previousTransition) {
                appWindow.style.setProperty('transition', previousTransition, previousTransitionPriority);
            } else {
                appWindow.style.removeProperty('transition');
            }
            if (previousAnimation) {
                appWindow.style.setProperty('animation', previousAnimation, previousAnimationPriority);
            } else {
                appWindow.style.removeProperty('animation');
            }
        });
    }
}

function openCoupleSpaceFromChat() {
    document.getElementById('chat-view').style.display = 'none';
    document.body.classList.remove('chat-view-active');
    document.getElementById('desktop-view').style.display = 'block';
    if (typeof window.openApp === 'function') {
        window.openApp('couple-space');
    }
}

function markCoupleRoleLinked(roleId) {
    const id = String(roleId || '').trim();
    if (!id) return;
    const key = 'couple_linked_roles_v1';
    let map = {};
    try {
        const raw = localStorage.getItem(key) || '';
        const parsed = raw ? JSON.parse(raw) : {};
        if (Array.isArray(parsed)) {
            parsed.forEach(function (rid) {
                const clean = String(rid || '').trim();
                if (clean) map[clean] = { linkedAt: 0 };
            });
        } else if (parsed && typeof parsed === 'object') {
            map = parsed;
        }
    } catch (e) {
        map = {};
    }
    const prev = map[id] && typeof map[id] === 'object' ? map[id] : {};
    map[id] = Object.assign({}, prev, {
        roleId: id,
        linkedAt: prev.linkedAt || Date.now()
    });
    try {
        localStorage.setItem(key, JSON.stringify(map));
        localStorage.setItem('couple_has_linked_v1', 'true');
        localStorage.setItem('couple_linked_role_id_v1', id);
    } catch (e2) { }
}

function buildCoupleInviteSystemPrompt(roleId) {
    const id = String(roleId || '');
    const inviteNeedsBilingual = isCoupleInviteBilingualRole(id);
    const outputInstructions = inviteNeedsBilingual
        ? '只输出严格 JSON，不要输出多余文字：{"is_accepted": boolean, "reply_bubbles": ["普通文本" 或 {"type":"translated_text","foreign":"角色原话","translation":"对应的简体中文翻译"}]}。如果你发出的文本是外语或非简体中文，就必须逐条使用 translated_text 对象，绝对不要只写原文。'
        : '只输出严格 JSON，不要输出多余文字：{"is_accepted": boolean, "reply_message": "你的回复文字"}';
    if (typeof window.buildRoleLitePrompt === 'function') {
        return window.buildRoleLitePrompt('couple_invite_decision', id, {
            includeContinuity: true,
            maxSummaryLines: 10,
            sceneIntro: '当前场景是情侣关系邀请判断。',
            taskGuidance: [
                '用户刚刚向你发起了建立情侣关系的邀请。',
                '你必须根据人设、关系亲疏、最近互动和自己的真实边界，自主判断是否接受。',
                '如果不愿意，请委婉拒绝；如果愿意，请真诚回应。',
                inviteNeedsBilingual ? '如果你是外语或非简体中文角色，所有回复气泡都要保持“角色原话 + 简体中文翻译”的结构化双语格式。' : ''
            ].join('\n'),
            outputInstructions: outputInstructions
        });
    }
    const profile = (window.charProfiles && window.charProfiles[id]) ? window.charProfiles[id] : {};
    const roleNameForAI = profile.nickName || id || 'TA';
    let systemPrompt = `【角色名称】${roleNameForAI}\n` + (profile.desc || '你是一个友好的AI助手');
    const roleRemarkForUser = typeof profile.remark === 'string' ? profile.remark.trim() : '';
    if (roleRemarkForUser) {
        systemPrompt += `\n\n【用户给你的备注】${roleRemarkForUser}`;
    }
    if (profile.schedule && String(profile.schedule).trim()) {
        systemPrompt += `\n\n【作息安排】\n${String(profile.schedule).trim()}`;
    }
    if (profile.style && String(profile.style).trim()) {
        systemPrompt += `\n\n【聊天风格】\n${String(profile.style).trim()}`;
    }

    const userPersona = (window.userPersonas && window.userPersonas[id]) ? window.userPersonas[id] : {};
    if (userPersona && (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting)) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) systemPrompt += `用户名字：${userPersona.name}\n`;
        if (userPersona.gender) systemPrompt += `用户性别：${userPersona.gender}\n`;
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) systemPrompt += `用户背景：${userPersona.setting}\n`;
    }
    return systemPrompt;
}

function isCoupleInviteBilingualRole(roleId) {
    const id = String(roleId || '').trim();
    if (!id) return false;
    const profile = window.charProfiles && window.charProfiles[id] ? window.charProfiles[id] : {};
    const explicit = [
        profile.language,
        profile.lang,
        profile.nativeLanguage,
        profile.native_language,
        profile.spokenLanguage,
        profile.spoken_language,
        profile.locale,
        profile.nationality
    ];
    const looksForeign = function (text) {
        const raw = String(text || '').trim();
        if (!raw) return false;
        const lower = raw.toLowerCase();
        if (/(中文|汉语|漢語|普通话|普通話|简体|簡體|mandarin|simplified chinese|zh[-_ ]?(cn|hans)?)/i.test(lower)) {
            return false;
        }
        if (/(英语|英語|英文|日语|日語|韩语|韓語|韩文|韓文|法语|法語|德语|德語|西班牙语|西班牙語|俄语|俄語|葡萄牙语|葡萄牙語|意大利语|意大利語|粤语|粵語|繁体|繁體|文言|english|japanese|korean|french|german|spanish|russian|portuguese|italian|thai|vietnamese|traditional chinese|cantonese|classical chinese|zh[-_ ]?(tw|hk|hant)|ja[-_ ]?jp|ko[-_ ]?kr|en[-_ ]?(us|gb))/i.test(lower)) {
            return true;
        }
        return /[這個們為來時後會說話讓還愛歡學習覺應實體點開關於與臺灣廣東電腦網頁貓車鐘鍾門裡見聽買麼嗎係嘅咗喺冇唔佢哋啲咩]/.test(raw);
    };
    for (let i = 0; i < explicit.length; i++) {
        if (looksForeign(explicit[i])) return true;
    }
    return looksForeign([
        profile.realName,
        profile.real_name,
        profile.nickName,
        profile.name,
        profile.character_name,
        profile.characterName,
        profile.title,
        profile.desc,
        profile.description,
        profile.persona,
        profile.prompt,
        profile.system_prompt,
        profile.systemPrompt,
        profile.scenario,
        profile.first_mes,
        Array.isArray(profile.tags) ? profile.tags.join(' ') : String(profile.tags || '')
    ].join(' '));
}

function buildCoupleInviteReplySegments(rawValue) {
    const normalized = typeof normalizeStructuredReplySegments === 'function'
        ? normalizeStructuredReplySegments(rawValue, { offlineMode: false })
        : [];
    const structured = Array.isArray(normalized) ? normalized : [];
    if (structured.length) {
        const normalizedStructured = structured
            .filter(function (seg) {
                return seg && (seg.kind === 'text' || seg.kind === 'translated_text');
            })
            .map(function (seg) {
                if (seg.kind === 'translated_text') {
                    return {
                        kind: 'translated_text',
                        foreign: String(seg.foreign || '').trim(),
                        translation: String(seg.translation || '').trim()
                    };
                }
                return {
                    kind: 'text',
                    text: String(seg.text || '').trim()
                };
            })
            .filter(function (seg) {
                return seg.kind === 'translated_text'
                    ? !!(seg.foreign || seg.translation)
                    : !!seg.text;
            });
        const mergedStructured = [];
        for (let i = 0; i < normalizedStructured.length; i++) {
            const current = normalizedStructured[i];
            if (!current) continue;
            if (current.kind === 'translated_text') {
                mergedStructured.push(current);
                continue;
            }
            const directPair = typeof window.parseTranslatedBubbleText === 'function'
                ? window.parseTranslatedBubbleText(String(current.text || ''))
                : null;
            if (directPair && directPair.hasTranslation) {
                mergedStructured.push({
                    kind: 'translated_text',
                    foreign: String(directPair.foreignText || directPair.bodyText || '').trim(),
                    translation: String(directPair.translationText || directPair.foreignText || '').trim()
                });
                continue;
            }
            const next = normalizedStructured[i + 1];
            if (next && next.kind === 'text' && typeof window.parseTranslatedBubbleText === 'function') {
                const mergedPair = window.parseTranslatedBubbleText(String(current.text || '') + '\n' + String(next.text || ''));
                if (mergedPair && mergedPair.hasTranslation) {
                    mergedStructured.push({
                        kind: 'translated_text',
                        foreign: String(mergedPair.foreignText || mergedPair.bodyText || '').trim(),
                        translation: String(mergedPair.translationText || mergedPair.foreignText || '').trim()
                    });
                    i++;
                    continue;
                }
            }
            mergedStructured.push(current);
        }
        return mergedStructured;
    }

    const raw = String(rawValue == null ? '' : rawValue).trim();
    if (!raw) return [];
    const chunks = raw
        .split(/\|\|\||\n{2,}|\r?\n+/)
        .map(function (part) { return String(part || '').trim(); })
        .filter(Boolean);
    const segments = [];
    for (let i = 0; i < chunks.length; i++) {
        const current = chunks[i];
        const single = typeof window.parseTranslatedBubbleText === 'function'
            ? window.parseTranslatedBubbleText(current)
            : null;
        if (single && single.hasTranslation) {
            segments.push({
                kind: 'translated_text',
                foreign: String(single.foreignText || single.bodyText || '').trim(),
                translation: String(single.translationText || single.foreignText || '').trim()
            });
            continue;
        }
        if (i + 1 < chunks.length && typeof window.parseTranslatedBubbleText === 'function') {
            const pair = window.parseTranslatedBubbleText(current + '\n' + chunks[i + 1]);
            if (pair && pair.hasTranslation) {
                segments.push({
                    kind: 'translated_text',
                    foreign: String(pair.foreignText || pair.bodyText || '').trim(),
                    translation: String(pair.translationText || pair.foreignText || '').trim()
                });
                i++;
                continue;
            }
        }
        segments.push({ kind: 'text', text: current });
    }
    return segments;
}

function promptOfflineSessionName(defaultName) {
    const fallbackName = String(defaultName || '').trim();
    if (typeof window.chatUiPrompt === 'function') {
        return window.chatUiPrompt('请为当前剧情存档命名：', fallbackName, {
            title: '长叙事存档',
            placeholder: '输入存档名字'
        });
    }
    if (typeof window.uiPrompt === 'function') {
        return window.uiPrompt('请为当前剧情存档命名：', fallbackName, {
            title: '长叙事存档',
            placeholder: '输入存档名字'
        });
    }
    return Promise.resolve(window.prompt('请为当前剧情存档命名：', fallbackName));
}

const OFFLINE_AUTO_RESUME_KEY = 'offline_auto_resume_targets_v1';

function loadOfflineAutoResumeTargets() {
    try {
        const raw = localStorage.getItem(OFFLINE_AUTO_RESUME_KEY) || '';
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
        return {};
    }
}

function saveOfflineAutoResumeTargets(map) {
    try {
        localStorage.setItem(OFFLINE_AUTO_RESUME_KEY, JSON.stringify(map && typeof map === 'object' ? map : {}));
    } catch (e) { }
}

function rememberOfflineAutoResumeTarget(roleId, sessionId) {
    const rid = String(roleId || '').trim();
    const sid = String(sessionId || '').trim();
    if (!rid || !sid) return;
    const map = loadOfflineAutoResumeTargets();
    map[rid] = {
        roleId: rid,
        sessionId: sid,
        updatedAt: Date.now()
    };
    saveOfflineAutoResumeTargets(map);
}

function clearOfflineAutoResumeTarget(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return;
    const map = loadOfflineAutoResumeTargets();
    if (!map[rid]) return;
    delete map[rid];
    saveOfflineAutoResumeTargets(map);
}

function getOfflineAutoResumeTarget(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return null;
    const map = loadOfflineAutoResumeTargets();
    return map[rid] && typeof map[rid] === 'object' ? map[rid] : null;
}

function tryParseCoupleInviteDecision(rawText) {
    const raw = typeof rawText === 'string' ? rawText.trim() : '';
    if (!raw) return null;
    let s = raw;
    if (s.startsWith('```')) {
        s = s.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
    }
    let candidate = s;
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start >= 0 && end > start) {
        candidate = s.slice(start, end + 1);
    }
    try {
        const parsed = JSON.parse(candidate);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
        return parseCoupleInviteDecisionDirective(raw);
    }
}

function parseCoupleInviteDecisionDirective(rawText) {
    let text = String(rawText || '');
    if (!text) return null;
    let accepted = null;
    const re = /(?:\[\[?\s*|【\s*)(accept|accepted|agree|yes|reject|decline|refuse|no)\s*(?:[-_\s]*(?:couple\s*invite|couple\s*space|couplespace|couple|relation|invite|情侣空间|情侣|邀请|[\w.-]+))?(?:\s*[:：]\s*[\w.-]+)?\s*(?:\]\]?|】)/gi;
    text = text.replace(re, function (_, action) {
        const a = String(action || '').toLowerCase();
        if (/^(accept|accepted|agree|yes)$/.test(a)) accepted = true;
        if (/^(reject|decline|refuse|no)$/.test(a)) accepted = false;
        return ' ';
    }).replace(/\s{2,}/g, ' ').trim();
    if (accepted === null) return null;
    return {
        is_accepted: accepted,
        reply_message: text
    };
}

function stripCoupleInviteDecisionDirectives(text) {
    const raw = String(text || '');
    if (!raw) return '';
    return raw.replace(/(?:\[\[?\s*|【\s*)(?:accept|accepted|agree|yes|reject|decline|refuse|no)\s*(?:[-_\s]*(?:couple\s*invite|couple\s*space|couplespace|couple|relation|invite|情侣空间|情侣|邀请|[\w.-]+))?(?:\s*[:：]\s*[\w.-]+)?\s*(?:\]\]?|】)/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function updateCoupleInviteStatusInData(roleId, inviteId, nextStatus) {
    const id = String(roleId || '').trim();
    const key = String(inviteId || '').trim();
    const list = id && window.chatData && Array.isArray(window.chatData[id]) ? window.chatData[id] : [];
    for (let i = list.length - 1; i >= 0; i--) {
        const msg = list[i];
        if (!msg || msg.type !== 'couple_invite') continue;
        if (key && String(msg.inviteId || '').trim() !== key) continue;
        msg.inviteStatus = String(nextStatus || '');
        saveData();
        return msg;
    }
    return null;
}

function requestCoupleInviteDecision(roleId, inviteId) {
    const id = String(roleId || '').trim();
    if (!id) return;
    if (window.__coupleInviteInflightByRole && window.__coupleInviteInflightByRole[id]) return;
    if (!window.__coupleInviteInflightByRole) window.__coupleInviteInflightByRole = {};
    const trackedRequestId = typeof beginTrackedChatResponseRequest === 'function'
        ? beginTrackedChatResponseRequest(id)
        : '';
    const finishTrackedTyping = function () {
        if (trackedRequestId && typeof finishTrackedChatResponseRequest === 'function') {
            finishTrackedChatResponseRequest(id, trackedRequestId);
        } else if (typeof window.refreshTrackedChatResponseIndicators === 'function') {
            window.refreshTrackedChatResponseIndicators(id);
        }
    };

    const baseHistory = (window.chatData && Array.isArray(window.chatData[id])) ? window.chatData[id] : [];
    const historyForApiBase = typeof buildApiMemoryHistory === 'function' ? buildApiMemoryHistory(id, baseHistory) : baseHistory.slice(-50);
    const inviteNeedsBilingual = isCoupleInviteBilingualRole(id);
    const inject = {
        role: 'system',
        content: inviteNeedsBilingual
            ? `[系统插播：用户刚才向你发起了建立情侣关系的邀请。你必须根据人设以及你和用户的关系，自信判断是否同意。\n如果不愿意，请委婉拒绝；如果欣然同意，请真诚回应。\n如果你是外语或非简体中文角色，所有回复气泡都必须写成带简体中文翻译的 structured translated_text 格式。\n你必须只输出严格 JSON，不要输出任何多余文字或 Markdown：{"is_accepted": boolean, "reply_bubbles": ["普通文本" 或 {"type":"translated_text","foreign":"角色原话","translation":"对应的简体中文翻译"}]}]`
            : `[系统插播：用户刚才向你发起了建立情侣关系的邀请。你必须根据人设以及你和用户的关系，自信判断是否同意。\n如果不愿意，请委婉拒绝；如果欣然同意，请真诚回应。\n你必须只输出严格 JSON，不要输出任何多余文字或 Markdown：{"is_accepted": boolean, "reply_message": "你的回复文字"}]`,
        timestamp: Date.now()
    };
    const historyForApi = Array.isArray(historyForApiBase) ? historyForApiBase.concat([inject]) : [inject];

    const sys = buildCoupleInviteSystemPrompt(id);
    const userMsg = '（事件）用户发起情侣关系邀请。请按系统插播提示输出 JSON。';

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : '';
    if (headerTitle) headerTitle.innerText = '对方正在输入...';

    const callOnceReady = function (triesLeft) {
        if (typeof window.callAI !== 'function') {
            if (triesLeft <= 0) {
                finishTrackedTyping();
                if (headerTitle && oldTitle) headerTitle.innerText = oldTitle;
                const msg = { role: 'ai', content: '我这边暂时连不上模型接口，稍后再试试吧。', type: 'text', timestamp: Date.now(), status: 'sent' };
                ensureChatMessageId(msg);
                window.chatData = window.chatData || {};
                if (!window.chatData[id]) window.chatData[id] = [];
                window.chatData[id].push(msg);
                saveData();
                if (String(window.currentChatRole || '') === id) appendMessageToDOM(msg);
                return;
            }
            setTimeout(function () { callOnceReady(triesLeft - 1); }, 60);
            return;
        }

        window.__coupleInviteInflightByRole[id] = true;

        window.callAI(
            sys,
            historyForApi,
            userMsg,
            function (aiResponseText) {
                window.__coupleInviteInflightByRole[id] = false;
                finishTrackedTyping();
                if (headerTitle && oldTitle) headerTitle.innerText = oldTitle;
            const payload = tryParseCoupleInviteDecision(aiResponseText) || {};
            const decisionText = String(payload.decision || payload.status || payload.result || '').trim().toLowerCase();
            const baseAccepted = payload.is_accepted === true || payload.isAccepted === true || payload.accepted === true || /^(accept|accepted|agree|yes|同意|接受|愿意)$/.test(decisionText);
            const replyCandidate = payload.reply_bubbles != null
                ? payload.reply_bubbles
                : (payload.reply_message != null
                    ? payload.reply_message
                    : (payload.replyMessage != null ? payload.replyMessage : (typeof aiResponseText === 'string' ? aiResponseText.trim() : '')));
            const replyTextForDirective = typeof replyCandidate === 'string'
                ? replyCandidate
                : (typeof payload.reply_message === 'string'
                    ? payload.reply_message
                    : (typeof payload.replyMessage === 'string' ? payload.replyMessage : ''));
            const replyDirective = parseCoupleInviteDecisionDirective(replyTextForDirective);
            const stringAccepted = /^(true|accept|accepted|agree|yes|同意|接受|愿意)$/.test(String(payload.is_accepted || payload.isAccepted || payload.accepted || '').trim().toLowerCase());
            const accepted = baseAccepted || stringAccepted || !!(replyDirective && replyDirective.is_accepted === true);

            let cleanReplyCandidate = replyCandidate;
            if (typeof cleanReplyCandidate === 'string') {
                cleanReplyCandidate = stripCoupleInviteDecisionDirectives(String(cleanReplyCandidate || '').trim()) || '我收到了你的邀请。';
            }
            let replySegments = buildCoupleInviteReplySegments(cleanReplyCandidate);
            if (!replySegments.length && typeof cleanReplyCandidate === 'string' && cleanReplyCandidate) {
                replySegments = [{ kind: 'text', text: cleanReplyCandidate }];
            }

            window.chatData = window.chatData || {};
            if (!window.chatData[id]) window.chatData[id] = [];
            const newMessages = replySegments.slice(0, 10).map(function (part, index) {
                const isTranslated = part && part.kind === 'translated_text';
                const aiMsg = {
                    role: 'ai',
                    content: isTranslated
                        ? JSON.stringify({
                            foreign: String(part.foreign || '').trim(),
                            translation: String(part.translation || '').trim()
                        })
                        : String(part && part.text || '').trim(),
                    type: isTranslated ? 'translated_text' : 'text',
                    timestamp: Date.now() + index,
                    status: 'sent'
                };
                ensureChatMessageId(aiMsg);
                return aiMsg;
            }).filter(function (msg) {
                return !!String(msg && msg.content || '').trim();
            });
            if (!newMessages.length) {
                const aiMsg = {
                    role: 'ai',
                    content: typeof cleanReplyCandidate === 'string' ? cleanReplyCandidate : '我收到了你的邀请。',
                    type: 'text',
                    timestamp: Date.now(),
                    status: 'sent'
                };
                ensureChatMessageId(aiMsg);
                newMessages.push(aiMsg);
            }
            newMessages.forEach(function (msg) {
                window.chatData[id].push(msg);
            });
            saveData();
            if (String(window.currentChatRole || '') === id) {
                newMessages.forEach(function (msg) {
                    appendMessageToDOM(msg);
                });
                const historyBox = document.getElementById('chat-history');
                if (historyBox) historyBox.scrollTop = historyBox.scrollHeight;
            }

            if (accepted) {
                updateCoupleInviteStatusInData(id, inviteId, 'accepted');
                markCoupleRoleLinked(id);
                setTimeout(function () {
                    openCoupleSpaceFromChat();
                }, 1500);
            }
            },
            function (errMsg) {
                window.__coupleInviteInflightByRole[id] = false;
                finishTrackedTyping();
                if (headerTitle && oldTitle) headerTitle.innerText = oldTitle;
            const msg = String(errMsg || '').trim() || '邀请发送失败，请稍后再试。';
            window.chatData = window.chatData || {};
            if (!window.chatData[id]) window.chatData[id] = [];
            const aiMsg = { role: 'ai', content: msg, type: 'text', timestamp: Date.now(), status: 'sent' };
            ensureChatMessageId(aiMsg);
            window.chatData[id].push(aiMsg);
            saveData();
            if (String(window.currentChatRole || '') === id) {
                appendMessageToDOM(aiMsg);
            }
            }
        );
    };

    callOnceReady(34);
}

function buildCoupleInviteMessageContent(userName, inviteId) {
    const name = String(userName || '我').trim() || '我';
    const key = String(inviteId || '').trim();
    return `[情侣空间邀请] ${name}向你发起建立情侣关系并开启情侣空间的邀请。${key ? 'invite_id=' + key : ''}`;
}

function findPendingCoupleInviteForRetry(roleId) {
    const id = String(roleId || '').trim();
    const list = window.chatData && Array.isArray(window.chatData[id]) ? window.chatData[id] : [];
    for (let i = list.length - 1; i >= 0; i--) {
        const msg = list[i];
        if (!msg || typeof msg !== 'object') continue;
        if (msg.role === 'ai') {
            const text = String(msg.content || '').trim();
            if (/邀请发送失败|连不上模型接口|稍后再试/.test(text)) continue;
            return null;
        }
        if (msg.type !== 'couple_invite') continue;
        const inviteId = String(msg.inviteId || '').trim();
        if (!inviteId) continue;
        if (!String(msg.content || '').trim()) {
            msg.content = buildCoupleInviteMessageContent(msg.userName, inviteId);
            try { saveData(); } catch (e) { }
        }
        return msg;
    }
    return null;
}

function retryPendingCoupleInviteDecision(roleId) {
    const invite = findPendingCoupleInviteForRetry(roleId);
    if (!invite) return false;
    requestCoupleInviteDecision(roleId, invite.inviteId);
    return true;
}

function startCoupleInviteFlow(roleId, inviteId) {
    const id = String(roleId || '').trim();
    if (!id) return;
    const inviteKey = String(inviteId || '').trim() || ('couple_' + Date.now().toString(36));
    window.chatData = window.chatData || {};
    if (!window.chatData[id]) window.chatData[id] = [];
    const history = window.chatData[id];
    const exists = history.some(m => m && m.type === 'couple_invite' && String(m.inviteId || '') === inviteKey);
    if (!exists) {
        const p = getCurrentUserProfile();
        const userName = p && p.name ? String(p.name) : '我';
        const msg = {
            role: 'me',
            content: buildCoupleInviteMessageContent(userName, inviteKey),
            type: 'couple_invite',
            timestamp: Date.now(),
            status: 'sent',
            inviteId: inviteKey,
            userName: userName
        };
        ensureChatMessageId(msg);
        history.push(msg);
        saveData();
        if (String(window.currentChatRole || '') === id) {
            appendMessageToDOM(msg);
            const historyBox = document.getElementById('chat-history');
            if (historyBox) historyBox.scrollTop = historyBox.scrollHeight;
        }
    }
    requestCoupleInviteDecision(id, inviteKey);
}

/* =========================================================
   === 最终修复版：删除功能 & 逻辑分离 (请替换 chat.js 底部代码) ===
   ========================================================= */

// 1. 【新建】点击桌面加号时触发
function renderCreatorVideoAlbum() {
    const list = document.getElementById('creator-video-album-list');
    if (!list) return;
    list.innerHTML = '';
    const data = Array.isArray(window.creatorVideoAlbumData) ? window.creatorVideoAlbumData : [];
    data.forEach(function (url, i) {
        if (!url) return;
        const item = document.createElement('div');
        item.style.cssText = 'width:64px; height:64px; border-radius:6px; overflow:hidden; position:relative; background:#000;';
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
        const del = document.createElement('div');
        del.innerText = '×';
        del.style.cssText = 'position:absolute; top:0; right:0; width:18px; height:18px; line-height:18px; text-align:center; font-size:14px; color:#fff; background:rgba(0,0,0,0.6); cursor:pointer;';
        del.onclick = function () {
            window.creatorVideoAlbumData.splice(i, 1);
            renderCreatorVideoAlbum();
        };
        item.appendChild(img);
        item.appendChild(del);
        list.appendChild(item);
    });
}

function handleCreatorVideoAlbumFile(input) {
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let width = img.width;
            let height = img.height;
            const maxDim = 1920;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            if (!Array.isArray(window.creatorVideoAlbumData)) {
                window.creatorVideoAlbumData = [];
            }
            window.creatorVideoAlbumData.push(base64);
            renderCreatorVideoAlbum();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    input.value = '';
}

function openCreator() {
    // 重置所有输入框
    document.getElementById('modal-title').innerText = "创建角色";
    document.getElementById('ai-name').value = '';
    document.getElementById('ai-personality').value = '';
    document.getElementById('ai-style').value = '';
    document.getElementById('ai-schedule').value = '';
    document.getElementById('avatar-preview').src = 'assets/chushitouxiang.jpg';

    window.creatorVideoAlbumData = [];
    renderCreatorVideoAlbum();
    if (typeof window.renderScheduleParsePanel === 'function') {
        const panel = document.getElementById('creator-schedule-parse-panel');
        const scheduleInput = document.getElementById('ai-schedule');
        if (panel) {
            const rawText = String(scheduleInput && scheduleInput.value || '').trim();
            window.renderScheduleParsePanel('creator', null, rawText);
        }
    }

    // 🔥 填充世界书多选 (按分类折叠)
    const wbContainer = document.getElementById('ai-worldbook-container');
    if (wbContainer && window.getWorldBookCheckboxListHTML) {
        wbContainer.innerHTML = window.getWorldBookCheckboxListHTML([]);
        if (typeof window.bindWorldBookCheckboxList === 'function') {
            window.bindWorldBookCheckboxList(wbContainer);
        }
    } else if (wbContainer) {
        wbContainer.innerHTML = `<div style="color:#999; font-size:13px;">未加载世界书组件</div>`;
    }

    // 打开桌面的那个弹窗
    document.getElementById('creator-modal').style.display = 'flex';
}



// ⚠️ 注意：这里删除了那个重复的 openCharacterEditor 函数
// 现在程序会自动使用 chat.js 中间部分定义的那个正确的 openCharacterEditor
// 它会打开 #editor-modal (我们刚才修好层级的那个)

async function persistWechatRuntimeNow() {
    if (typeof window.flushSaveDataImmediately === 'function') {
        await window.flushSaveDataImmediately();
        return;
    }
    if (typeof window.saveData === 'function') {
        await window.saveData();
    }
}

function getChatRoleLastSeenTimestamp(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid || !window.chatData || typeof window.chatData !== 'object') return 0;
    const list = Array.isArray(window.chatData[rid]) ? window.chatData[rid] : [];
    for (let i = list.length - 1; i >= 0; i--) {
        const msg = list[i];
        if (!msg || msg.hidden || msg.recalled === true) continue;
        const ts = Number(msg.timestamp || 0);
        if (ts > 0) return ts;
    }
    return 0;
}

function markChatRoleAsRead(roleId, timestamp, options) {
    const rid = String(roleId || '').trim();
    if (!rid) return 0;
    const opts = options && typeof options === 'object' ? options : {};
    if (!window.chatUnread || typeof window.chatUnread !== 'object') window.chatUnread = {};
    if (!window.chatUnread[rid] || typeof window.chatUnread[rid] !== 'object') {
        window.chatUnread[rid] = {};
    }

    const nextTs = Number(timestamp || 0) || getChatRoleLastSeenTimestamp(rid);
    const prevTs = Number(window.chatUnread[rid].lastReadTs || 0);
    if (nextTs > prevTs) {
        window.chatUnread[rid].lastReadTs = nextTs;
    } else if (!window.chatUnread[rid].lastReadTs) {
        window.chatUnread[rid].lastReadTs = prevTs || nextTs;
    }

    if (opts.refreshList !== false && typeof window.loadWechatChatList === 'function') {
        try { window.loadWechatChatList(true); } catch (e) { }
    }

    if (opts.persist === true) {
        persistWechatRuntimeNow().catch(function (e) {
            console.warn('保存已读状态失败', e);
        });
    } else if (opts.save !== false && typeof window.saveData === 'function') {
        try {
            const ret = window.saveData();
            if (ret && typeof ret.catch === 'function') {
                ret.catch(function () { });
            }
        } catch (e) { }
    }

    return Number(window.chatUnread[rid].lastReadTs || nextTs || 0);
}

// 2. 【保存】桌面新建角色的保存逻辑
function saveCharacterData() {
    const name = document.getElementById('ai-name').value;
    const desc = document.getElementById('ai-personality').value;
    const style = document.getElementById('ai-style').value;
    const schedule = document.getElementById('ai-schedule').value;
    const avatar = document.getElementById('avatar-preview').src;

    // 🔥 获取选中的世界书 ID（数组）
    const wbContainer = document.getElementById('ai-worldbook-container');
    let worldBookId = [];
    if (wbContainer) {
        const checkboxes = wbContainer.querySelectorAll('input[name="wb-checkbox"]:checked');
        worldBookId = Array.from(checkboxes).map(cb => cb.value);
    }

    if (!name) return alert("名字不能为空！");

    // 生成新 ID
    const targetId = 'role_' + Date.now();
    alert("创建成功！");

    if (!window.charProfiles || typeof window.charProfiles !== 'object') window.charProfiles = {};
    if (!window.chatData || typeof window.chatData !== 'object') window.chatData = {};
    if (!window.chatMapData || typeof window.chatMapData !== 'object') window.chatMapData = {};
    if (!window.userPersonas || typeof window.userPersonas !== 'object') window.userPersonas = {};
    if (!window.chatUnread || typeof window.chatUnread !== 'object') window.chatUnread = {};

    // 存入数据
    if (!window.charProfiles[targetId]) window.charProfiles[targetId] = {};
    const p = window.charProfiles[targetId];

    p.nickName = name;
    p.desc = desc;
    p.style = style;
    p.schedule = schedule;
    const creatorScheduleParsed = typeof window.collectScheduleParsePanelState === 'function'
        ? window.collectScheduleParsePanelState('creator')
        : null;
    const creatorParsedPlan = creatorScheduleParsed || (typeof window.parseRoleSchedulePlan === 'function' ? window.parseRoleSchedulePlan(schedule) : null);
    if (creatorParsedPlan) {
        p.scheduleParsed = creatorParsedPlan;
    } else {
        delete p.scheduleParsed;
    }
    p.avatar = avatar;
    p.worldbookId = Array.isArray(worldBookId) ? worldBookId : []; // 👈 保存关联ID数组
    p.videoAlbum = Array.isArray(window.creatorVideoAlbumData) ? window.creatorVideoAlbumData.slice() : [];

    if (!Array.isArray(window.chatData[targetId])) window.chatData[targetId] = [];
    if (!window.chatMapData[targetId] || typeof window.chatMapData[targetId] !== 'object') window.chatMapData[targetId] = {};
    if (!window.chatUnread[targetId] || typeof window.chatUnread[targetId] !== 'object') window.chatUnread[targetId] = { lastReadTs: 0 };
    if (!window.userPersonas[targetId] || typeof window.userPersonas[targetId] !== 'object') {
        window.userPersonas[targetId] = {
            name: '',
            setting: '',
            avatar: 'assets/chushitouxiang.jpg',
            gender: '',
            birthday: '',
            birthdayType: 'solar'
        };
    }

    saveData();

    closeCreator(); // 关闭桌面弹窗

    // 刷新微信列表
    if (typeof window.loadWechatChatList === 'function') {
        window.loadWechatChatList();
    }
}



// 3. 【删除】彻底删除当前角色
function deleteCurrentCharacter() {
    const roleId = window.currentChatRole;
    if (!roleId) return;

    if (confirm("⚠️ 警告：\n确定要彻底删除这个角色吗？\n删除后无法恢复！")) {
        // 删除所有关联数据
        delete window.charProfiles[roleId];
        delete window.chatData[roleId];
        delete window.userPersonas[roleId];
        delete window.chatBackgrounds[roleId];

        saveData();

        alert("角色已删除。");

        // 关闭菜单
        closeSettingsMenu();

        // 返回列表
        backToList();
    }
}

// 4. 关闭桌面新建弹窗
function closeCreator() {
    document.getElementById('creator-modal').style.display = 'none';
}

/* =================================
   🔥 核心导出 (确保按钮能找到函数)
   ================================= */

// 导航
window.backToList = backToList;
window.enterChat = enterChat;
window.handleImagesForAI = handleImagesForAI;
window.sendMessage = sendMessage;
window.triggerAI = triggerAI;
window.ensureChatRuntimeForRole = ensureChatRuntimeForRole;
window.handleImageForAI = handleImageForAI;
window.goBackToHome = goBackToHome;
window.requestCoupleInviteDecision = requestCoupleInviteDecision;
window.retryPendingCoupleInviteDecision = retryPendingCoupleInviteDecision;
window.startCoupleInviteFlow = startCoupleInviteFlow;
window.openCoupleSpaceFromChat = openCoupleSpaceFromChat;

window.addEventListener('storage', function (e) {
    try {
        if (!e || e.key !== 'wechat_chatData') return;
        if (typeof window.initData === 'function') {
            Promise.resolve(window.initData({ forceReload: true })).then(function () {
                if (window.currentChatRole) {
                    enterChat(window.currentChatRole);
                } else if (typeof window.loadWechatChatList === 'function') {
                    window.loadWechatChatList(true);
                }
            }).catch(function (reloadErr) {
                console.warn('[WechatStorage] storage 同步刷新失败', reloadErr);
            });
        }
    } catch (err) { }
});

// 桌面新建
window.openCreator = openCreator;
window.saveCharacterData = saveCharacterData; // 桌面保存用
window.closeCreator = closeCreator;

// 聊天室编辑 (复用 chat.js 中间定义的函数)
window.openCharacterEditor = openCharacterEditor; // 👈 这里的 openCharacterEditor 指向的是上面第260行定义的正确版本！
window.saveEditResult = saveEditResult;           // 👈 聊天室保存用
window.closeEditor = closeEditor;

// 删除功能
window.deleteCurrentCharacter = deleteCurrentCharacter;

// 设置菜单
window.openChatSettings = openChatSettings;
window.closeSettingsMenu = closeSettingsMenu;

// 我的身份
window.openUserPersonaModal = openUserPersonaModal;
window.saveUserPersona = saveUserPersona;
window.previewUserAvatar = previewUserAvatar;
window.saveUserPersonaPreset = saveUserPersonaPreset;
window.openUserPersonaPresetSheet = openUserPersonaPresetSheet;
window.closeUserPersonaPresetSheet = closeUserPersonaPresetSheet;
window.applyUserPersonaPreset = applyUserPersonaPreset;

// 背景设置
window.openBgSettingModal = openBgSettingModal;
window.saveChatBg = saveChatBg;
window.resetChatBg = resetChatBg;
window.previewChatBg = previewChatBg;

// 工具函数
window.previewAvatar = previewAvatar;
window.previewEditAvatar = previewEditAvatar;
window.closeSubModal = closeSubModal;
window.clearChatHistory = clearChatHistory;
window.startLocationShare = startLocationShare;
window.renderLocationShareUI = renderLocationShareUI;
window.updateDistance = updateDistance;
window.openStatusMonitorPanel = openStatusMonitorPanel;
window.closeStatusMonitorPanel = closeStatusMonitorPanel;
window.handleStatusMonitorMaskClick = handleStatusMonitorMaskClick;
/* =========================================================
   🔥 补丁：Enter 键发送 & 状态栏同步
   (修复版：删除了收起键盘的逻辑)
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {

    // --- 1. 修复 Enter 键发送消息 ---
    const msgInput = document.getElementById('msg-input');
    if (msgInput) {
        msgInput.addEventListener('keydown', function (e) {
            // 检测是否按下了 Enter (回车键)
            if (e.key === 'Enter') {
                e.preventDefault(); // 防止换行
                sendMessage();      // 调用发送函数

                // ❌ 删除了 msgInput.blur(); 
                // ✅ 现在的逻辑是：发完之后，什么都不做，键盘自然就留在那了
            }
        });
    }

    // --- 2. 修复聊天室顶部的时间和电量显示 ---
    function updateChatStatusBar() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeString = `${hours}:${minutes}`;

        // 更新聊天室的时间 (ID: status-time-text-chat)
        const chatTime = document.getElementById('status-time-text-chat');
        if (chatTime) chatTime.innerText = timeString;

        const chatBattery = document.getElementById('battery-num-chat');
        if (!chatBattery) {
            return;
        }

        if (window.currentBatteryLevel !== null && window.currentBatteryLevel !== undefined) {
            chatBattery.innerText = String(Math.round(window.currentBatteryLevel));
            return;
        }

        if (navigator.getBattery && typeof navigator.getBattery === 'function') {
            navigator.getBattery().then(function (battery) {
                if (!battery || typeof battery.level !== 'number') {
                    chatBattery.innerText = '--';
                    return;
                }
                chatBattery.innerText = String(Math.round(battery.level * 100));
            }).catch(function () {
                chatBattery.innerText = '--';
            });
        } else if (navigator.battery || navigator.mozBattery || navigator.msBattery) {
            const legacyBattery = navigator.battery || navigator.mozBattery || navigator.msBattery;
            const level = legacyBattery && typeof legacyBattery.level === 'number' ? legacyBattery.level * 100 : null;
            chatBattery.innerText = (level === null || level === undefined) ? '--' : String(Math.round(level));
        } else {
            chatBattery.innerText = '--';
        }
    }

    // 立即运行一次
    updateChatStatusBar();
    // 之后每秒刷新一次
    setInterval(updateChatStatusBar, 1000);
});
/* =========================================================
   === 5. 长按菜单功能 (Context Menu) ===
   ========================================================= */

let longPressTimer;
let currentSelectedMsgDiv = null; // 记录当前长按的是哪个气泡元素
const CHAT_HIDDEN_TIME_DIVIDER_KEY = 'wechat_hidden_time_dividers_v1';

function getChatRowKind(row) {
    if (!row || !row.classList) return '';
    if (row.classList.contains('chat-time-label')) return 'time-divider';
    if (row.classList.contains('sys-msg-row')) return 'system-row';
    if (row.classList.contains('msg-row')) return 'message-row';
    return '';
}

function readHiddenTimeDividerMap() {
    try {
        const raw = localStorage.getItem(CHAT_HIDDEN_TIME_DIVIDER_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function writeHiddenTimeDividerMap(map) {
    try {
        localStorage.setItem(CHAT_HIDDEN_TIME_DIVIDER_KEY, JSON.stringify(map || {}));
    } catch (e) { }
}

function isChatTimeDividerHidden(roleId, timestamp) {
    const rid = String(roleId || '').trim();
    const ts = Number(timestamp) || 0;
    if (!rid || !ts) return false;
    const map = readHiddenTimeDividerMap();
    const list = Array.isArray(map[rid]) ? map[rid] : [];
    return list.indexOf(ts) !== -1;
}

function hideChatTimeDivider(roleId, timestamp) {
    const rid = String(roleId || '').trim();
    const ts = Number(timestamp) || 0;
    if (!rid || !ts) return false;
    const map = readHiddenTimeDividerMap();
    const list = Array.isArray(map[rid]) ? map[rid].slice() : [];
    if (list.indexOf(ts) === -1) {
        list.push(ts);
        list.sort(function (a, b) { return a - b; });
        map[rid] = list;
        writeHiddenTimeDividerMap(map);
    }
    return true;
}

function buildSystemMessageRowElement(msg, msgId) {
    const row = document.createElement('div');
    row.className = 'sys-msg-row';
    if (msgId) {
        row.setAttribute('data-msg-id', msgId);
    }
    if (msg && msg.role) {
        row.setAttribute('data-role', String(msg.role));
    }
    if (msg && msg.type) {
        row.setAttribute('data-type', String(msg.type));
    }
    if (msg && msg.timestamp) {
        row.setAttribute('data-timestamp', String(msg.timestamp));
    }
    const text = msg && msg.content !== undefined ? String(msg.content) : '';
    const kind = String(msg && msg.systemEventKind || '').trim();
    if (kind === 'location_share_invite') {
        row.innerHTML = '<span class="sys-msg-text location-share-invite-text"><i class="bx bx-map-pin" aria-hidden="true"></i><span>' + text + '</span></span>';
    } else {
        row.innerHTML = '<span class="sys-msg-text">' + text + '</span>';
    }
    return row;
}

function applyContextMenuAvailability(targetEl) {
    const menu = document.getElementById('msg-context-menu');
    if (!menu) return;
    const row = targetEl && typeof targetEl.closest === 'function'
        ? targetEl.closest('.msg-row, .sys-msg-row, .chat-time-label')
        : targetEl;
    const kind = getChatRowKind(row);
    const availability = {
        edit: kind === 'message-row',
        copy: kind === 'message-row' || kind === 'system-row' || kind === 'time-divider',
        quote: kind === 'message-row',
        recall: kind === 'message-row',
        delete: kind === 'message-row' || kind === 'system-row' || kind === 'time-divider',
        forward: kind === 'message-row' || kind === 'system-row',
        fav: kind === 'message-row' || kind === 'system-row',
        multi: kind === 'message-row' || kind === 'system-row' || kind === 'time-divider'
    };
    const items = menu.querySelectorAll('.menu-item[data-menu-action]');
    items.forEach(function (item) {
        const action = item.getAttribute('data-menu-action') || '';
        item.classList.toggle('is-disabled', !availability[action]);
    });
}

function deleteSingleChatRow(roleId, row) {
    if (!row) return false;
    const kind = getChatRowKind(row);
    if (kind === 'time-divider') {
        const ts = parseInt(row.getAttribute('data-timestamp') || '', 10);
        if (!isNaN(ts)) {
            hideChatTimeDivider(roleId, ts);
        }
        row.remove();
        return true;
    }
    const index = findMessageIndexByRow(row, roleId);
    row.remove();
    if (window.chatData[roleId] && index >= 0) {
        window.chatData[roleId].splice(index, 1);
        return true;
    }
    return kind === 'system-row';
}

window.isChatTimeDividerHidden = isChatTimeDividerHidden;
window.hideChatTimeDivider = hideChatTimeDivider;
window.buildSystemMessageRowElement = buildSystemMessageRowElement;

function findContextMenuTarget(target) {
    const t = target && target.nodeType === 3 ? target.parentElement : target;
    if (!t || !t.closest) return null;
    const bubble = t.closest('.msg-bubble');
    if (bubble) return bubble;
    const timeLabel = t.closest('.chat-time-label:not(.chat-time-label-loadmore)');
    if (timeLabel) return timeLabel;
    const sysText = t.closest('.sys-msg-text');
    if (sysText && sysText.closest('.sys-msg-row')) {
        return sysText;
    }
    return null;
}

function getSelectableChatRows(chatBody) {
    if (!chatBody) return [];
    return Array.from(chatBody.querySelectorAll('.msg-row, .sys-msg-row, .chat-time-label:not(.chat-time-label-loadmore)'));
}

function getRowPlainText(row, roleId) {
    if (!row) return '';
    const index = findMessageIndexByRow(row, roleId);
    const msgObj = (window.chatData && window.chatData[roleId] && index >= 0) ? window.chatData[roleId][index] : null;
    if (msgObj && typeof window.getMessagePlainText === 'function') {
        return window.getMessagePlainText(msgObj);
    }
    if (getChatRowKind(row) === 'time-divider') {
        return String(row.innerText || '').trim();
    }
    const bubble = row.querySelector('.msg-bubble, .sys-msg-text');
    return bubble ? String(bubble.innerText || '').trim() : '';
}

function getContextMenuCopyText(bubble, row, roleId) {
    const rowText = getRowPlainText(row, roleId);
    if (rowText) return rowText;
    return String((bubble && bubble.innerText) || '').trim();
}

function notifyContextMenuAction(text) {
    try {
        if (typeof window.showCenterToast === 'function') {
            window.showCenterToast(text);
            return;
        }
    } catch (e) { }
    console.log(text);
}

async function copyContextMenuText(text) {
    const payload = String(text || '').trim();
    if (!payload) return false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(payload);
            return true;
        } catch (e) { }
    }
    try {
        const ta = document.createElement('textarea');
        ta.value = payload;
        ta.setAttribute('readonly', 'readonly');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return !!ok;
    } catch (e2) {
        return false;
    }
}

// 初始化：给聊天记录容器添加事件监听
document.addEventListener('DOMContentLoaded', function () {
    const historyBox = document.getElementById('chat-history');
    if (!historyBox) return;

    // --- 触摸端 (Mobile) 长按逻辑 ---
    historyBox.addEventListener('touchstart', function (e) {
        handleStart(e);
    }, { passive: false });

    historyBox.addEventListener('touchend', function (e) {
        handleEnd();
    });

    historyBox.addEventListener('touchmove', function (e) {
        // 如果手指移动了，说明是在滑屏，取消长按
        handleEnd();
    });

    // --- 电脑端 (PC) 右键逻辑 ---
    // 方便你在电脑上测试，右键直接触发
    historyBox.addEventListener('contextmenu', function (e) {
        const bubble = findContextMenuTarget(e.target);
        if (bubble) {
            e.preventDefault(); // 阻止浏览器默认右键菜单
            showContextMenu(bubble, e.clientX, e.clientY); // 传入鼠标位置作为参考
        }
    });
});

// 开始按压
function handleStart(e) {
    // 找到被按下的气泡 (closest 处理点击到气泡内部文字的情况)
    const bubble = findContextMenuTarget(e.target);
    if (!bubble) return;

    // 500毫秒后触发菜单
    longPressTimer = setTimeout(() => {
        // 手机端长按触发时，禁止浏览器默认的选中/放大行为
        // e.preventDefault(); 
        // 注意：e.preventDefault() 在 passive listener 里不能用，这里主要靠逻辑控制
        try {
            if (navigator && typeof navigator.vibrate === 'function') {
                navigator.vibrate(12);
            }
        } catch (e2) { }
        showContextMenu(bubble);
    }, 500);
}

// 结束按压 (或移动)
function handleEnd() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

// 显示长按菜单
function showContextMenu(bubbleEl, mouseX, mouseY) {
    // 1. 记录当前选中的气泡 
    // 【修改点】去掉 window. 前缀，直接赋值给上面的 let 变量
    currentSelectedMsgDiv = bubbleEl;
    applyContextMenuAvailability(bubbleEl);

    // 2. 获取菜单和遮罩
    const menu = document.getElementById('msg-context-menu');
    const mask = document.getElementById('context-menu-mask');

    if (!menu || !mask) return;

    mask.style.display = 'block';
    menu.style.display = 'block';
    menu.style.visibility = 'hidden';
    menu.style.left = '0px';
    menu.style.top = '0px';

    const gap = 10;
    const bubbleRect = bubbleEl && typeof bubbleEl.getBoundingClientRect === 'function'
        ? bubbleEl.getBoundingClientRect()
        : null;

    const viewportW = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;

    const menuW = menu.offsetWidth || 260;
    const menuH = menu.offsetHeight || 120;

    let left = gap;
    let top = gap;

    if (bubbleRect) {
        const isRight = !!(bubbleEl.closest && bubbleEl.closest('.msg-right'));
        left = isRight ? (bubbleRect.right - menuW) : bubbleRect.left;

        const preferTop = bubbleRect.top - menuH - gap;
        const preferBottom = bubbleRect.bottom + gap;
        top = preferTop >= gap ? preferTop : preferBottom;

        left = Math.max(gap, Math.min(left, viewportW - menuW - gap));
        top = Math.max(gap, Math.min(top, viewportH - menuH - gap));
    } else if (typeof mouseX === 'number' && typeof mouseY === 'number') {
        left = Math.max(gap, Math.min(mouseX - Math.round(menuW / 2), viewportW - menuW - gap));
        top = Math.max(gap, Math.min(mouseY - Math.round(menuH / 2), viewportH - menuH - gap));
    }

    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.visibility = 'visible';
    menu.classList.add('pop-up-anim');
}



// 关闭菜单
function closeContextMenu() {
    const menu = document.getElementById('msg-context-menu');
    const mask = document.getElementById('context-menu-mask');
    if (menu) menu.style.display = 'none';
    if (mask) mask.style.display = 'none';

    currentSelectedMsgDiv = null;
}

/* =========================================================
   === 6. 菜单功能实现 (编辑、引用、删除、多选) ===
   ========================================================= */

// 全局变量：暂存正在引用的内容
window.currentQuoteInfo = null;

function findMessageIndexByRow(row, roleId) {
    if (!row || !roleId) return -1;
    if (getChatRowKind(row) === 'time-divider') return -1;
    const list = window.chatData[roleId];
    if (!Array.isArray(list)) return -1;
    const msgIdAttr = row.getAttribute('data-msg-id');
    if (msgIdAttr) {
        const id = String(msgIdAttr || '').trim();
        if (id) {
            for (let i = 0; i < list.length; i++) {
                const m = list[i];
                if (!m) continue;
                if (String(m.id || '') === id) return i;
            }
        }
    }
    const tsAttr = row.getAttribute('data-timestamp');
    const typeAttr = row.getAttribute('data-type') || '';
    const roleAttr = row.getAttribute('data-role') || (row.classList.contains('msg-right') ? 'me' : 'ai');
    const ts = tsAttr ? parseInt(tsAttr, 10) : NaN;
    if (!isNaN(ts)) {
        for (let i = 0; i < list.length; i++) {
            const m = list[i];
            if (!m) continue;
            const mt = m.timestamp || 0;
            const mr = m.role || '';
            const ty = m.type || '';
            if (mt === ts && mr === roleAttr && ty === typeAttr) {
                return i;
            }
        }
    }
    const chatBody = document.getElementById('chat-history');
    if (!chatBody) return -1;
    const allRows = Array.from(chatBody.querySelectorAll('.msg-row, .sys-msg-row'));
    return allRows.indexOf(row);
}

// 核心：菜单动作分发
window.menuAction = function (actionType) {
    if (!currentSelectedMsgDiv) return;

    // 1. 获取当前点击的气泡元素 和 文本
    // 🔥 重点：这里用局部变量 bubble 存住了引用
    const bubble = currentSelectedMsgDiv;

    // 2. 获取这行消息的 DOM
    const row = bubble.closest('.msg-row, .sys-msg-row, .chat-time-label');

    const roleId = window.currentChatRole;
    const originalText = getContextMenuCopyText(bubble, row, roleId);

    // 关闭菜单 (这会把 currentSelectedMsgDiv 设为 null，所以下面必须用 bubble 变量)
    closeContextMenu();

    switch (actionType) {
        case 'edit':
            {
                const index = findMessageIndexByRow(row, roleId);
                const msgObj = (window.chatData && window.chatData[roleId] && index >= 0) ? window.chatData[roleId][index] : null;
                if (!msgObj) break;
                const draft = typeof window.getEditableChatMessageDraft === 'function'
                    ? window.getEditableChatMessageDraft(roleId, msgObj)
                    : originalText;
                if (typeof window.openChatMessageEditor !== 'function') break;
                window.openChatMessageEditor({ initialValue: draft }).then(function (newText) {
                    if (newText === null || String(newText).trim() === "") return;
                    const applied = typeof window.applyEditedChatMessageContent === 'function'
                        ? window.applyEditedChatMessageContent(roleId, msgObj, newText, row)
                        : null;
                    if (!applied || !applied.ok) return;
                    try {
                        saveData();
                    } catch (e) { }
                    try {
                        if (typeof window.rebuildMemoryArchive === 'function') {
                            window.rebuildMemoryArchive(roleId);
                        } else if (typeof window.maybeAutoUpdateMemoryArchive === 'function') {
                            window.maybeAutoUpdateMemoryArchive(roleId);
                        }
                    } catch (e2) { }
                });
            }
            break;

        case 'quote':
            const quoteBar = document.getElementById('quote-bar');
            const quoteContent = document.getElementById('quote-content');
            const input = document.getElementById('msg-input');
            const index = findMessageIndexByRow(row, roleId);
            const msgObj = (window.chatData && window.chatData[roleId] && index >= 0) ? window.chatData[roleId][index] : null;
            const quoteId = msgObj ? ensureChatMessageId(msgObj) : '';
            const isMe = row.classList.contains('msg-right');
            const name = isMe ? "我" : (document.getElementById('current-chat-name').innerText || "TA");
            const quoteText = msgObj ? getMessagePlainText(msgObj) : originalText;
            window.currentQuoteInfo = { quoteId: quoteId, name: name, text: quoteText };
            if (quoteBar && quoteContent) {
                quoteBar.style.display = 'flex';
                let shortText = String(quoteText || '').replace(/\s+/g, ' ').trim();
                if (shortText.length > 120) shortText = shortText.substring(0, 120) + '...';
                quoteContent.innerText = `${name}: ${shortText}`;
            }
            if (input) input.focus();
            break;

        case 'delete':
            if (confirm("确定删除这条消息吗？")) {
                const changed = deleteSingleChatRow(roleId, row);
                if (changed) {
                    saveData();
                }
            }
            break;

        case 'copy':
            copyContextMenuText(originalText).then(function (ok) {
                notifyContextMenuAction(ok ? '已复制' : '复制失败');
            });
            break;

        case 'fav':
            (function () {
                const index = findMessageIndexByRow(row, roleId);
                let msgObj = (window.chatData && window.chatData[roleId] && index >= 0) ? window.chatData[roleId][index] : null;
                if (!msgObj) {
                    const ts = row && row.getAttribute ? parseInt(row.getAttribute('data-timestamp') || '', 10) : NaN;
                    msgObj = {
                        role: row && row.classList && row.classList.contains('msg-right') ? 'me' : 'ai',
                        type: row && row.getAttribute ? (row.getAttribute('data-type') || 'text') : 'text',
                        content: originalText,
                        timestamp: !isNaN(ts) ? ts : Date.now()
                    };
                    const rid = row && row.getAttribute ? String(row.getAttribute('data-msg-id') || '').trim() : '';
                    if (rid) msgObj.id = rid;
                }
                if (typeof window.addFavoriteMessage === 'function') {
                    window.addFavoriteMessage(roleId, msgObj);
                    showCenterToast('已添加至收藏');
                }
            })();
            break;

        case 'multi':
            enterMultiSelectMode(row);
            break;

        case 'recall':
            (function () {
                if (!row || !roleId) return;
                const index = findMessageIndexByRow(row, roleId);
                const list = window.chatData && window.chatData[roleId];
                if (!Array.isArray(list) || index < 0 || !list[index]) return;
                const target = list[index];
                const recallResult = typeof window.performChatMessageRecall === 'function'
                    ? window.performChatMessageRecall(roleId, {
                        messageIndex: index,
                        initiator: 'user',
                        includeInAI: true,
                        row: row,
                        animate: true
                    })
                    : null;
                if (!recallResult) return;
            })();
            break;

        case 'forward':
            // 🔥 修复点：这里直接用 bubble，不再判断 currentSelectedMsgDiv
            if (bubble) {
                const text = bubble.innerText;
                openForwardModal(text); // 打开弹窗，传入单条文本
            }
            break;
    }
};


// --- 引用功能的配套函数 ---

// 取消引用
window.cancelQuote = function () {
    const bar = document.getElementById('quote-bar');
    if (bar) bar.style.display = 'none';
    window.currentQuoteInfo = null;
};

window.sendMessage = sendMessage;



// --- 进入多选模式 ---
function enterMultiSelectMode(targetRow) {
    const chatBody = document.getElementById('chat-history');
    const inputArea = document.querySelector('.chat-room-footer').parentNode; // 获取包含输入框和引用条的大容器
    const multiBar = document.getElementById('multi-select-bar');

    if (!chatBody || !multiBar) return;
    const scrollTopBefore = chatBody.scrollTop;

    // 1. 样式切换
    chatBody.classList.add('select-mode');

    // 2. 底部栏切换：隐藏输入框，显示工具栏
    if (inputArea) inputArea.style.display = 'none';
    multiBar.style.display = 'flex';

    // 3. 给聊天区域下的所有直接子元素绑定点击事件，实现“全能多选”
    const rows = getSelectableChatRows(chatBody);
    rows.forEach(el => {
        el.onclick = function (e) {
            if (!chatBody.classList.contains('select-mode')) return;
            e.preventDefault();
            e.stopPropagation();
            this.classList.toggle('selected');
        };
    });
    if (targetRow) {
        targetRow.classList.add('selected');
    }

    window.setTimeout(function () {
        try {
            if (typeof window.syncChatViewportLayout === 'function') {
                window.syncChatViewportLayout();
            }
            if (chatBody) chatBody.scrollTop = scrollTopBefore;
        } catch (e) { }
    }, 0);

    // 4. 修改顶部导航栏 (增加一个"完成"按钮来退出多选)
    const header = document.querySelector('.chat-room-header');
    const menuBtn = header.querySelector('.chat-room-menu');

    // 备份原来的右侧按钮（只在第一次进入多选时备份）
    if (!window.originalHeaderRight) {
        window.originalHeaderRight = menuBtn.innerHTML;
        window.originalHeaderClick = menuBtn.getAttribute('onclick');
    }

    // 清除所有事件监听，避免重复绑定
    const newMenuBtn = menuBtn.cloneNode(true);
    menuBtn.parentNode.replaceChild(newMenuBtn, menuBtn);

    // 设置新内容和事件
    newMenuBtn.innerHTML = '<span style="font-size:16px; color:#07c160; font-weight:bold;">完成</span>';
    newMenuBtn.removeAttribute('onclick');
    newMenuBtn.addEventListener('click', exitMultiSelectMode);
}

// --- 退出多选模式 ---
function exitMultiSelectMode() {
    const inputArea = document.querySelector('.chat-room-footer').parentNode;
    const multiBar = document.getElementById('multi-select-bar');

    // 1. 恢复样式
    const chatBody = document.getElementById('chat-history');
    const scrollTopBefore = chatBody ? chatBody.scrollTop : 0;
    if (chatBody) chatBody.classList.remove('select-mode');

    // 2. 恢复底部栏
    if (multiBar) multiBar.style.display = 'none';
    if (inputArea) inputArea.style.display = 'block';

    // 3. 清除所有选中状态与点击事件
    if (chatBody) {
        const children = getSelectableChatRows(chatBody);
        children.forEach(el => {
            el.classList.remove('selected');
            el.onclick = null;
        });
    }

    window.setTimeout(function () {
        try {
            if (typeof window.syncChatViewportLayout === 'function') {
                window.syncChatViewportLayout();
            }
            if (chatBody) chatBody.scrollTop = scrollTopBefore;
        } catch (e) { }
    }, 0);

    // 4. 恢复顶部导航栏
    const header = document.querySelector('.chat-room-header');
    if (!header) return;

    const menuBtn = header.querySelector('.chat-room-menu');
    if (!menuBtn) return;

    // 使用 cloneNode 清除所有事件监听
    const newMenuBtn = menuBtn.cloneNode(true);
    menuBtn.parentNode.replaceChild(newMenuBtn, menuBtn);

    // 恢复原始内容和事件
    if (window.originalHeaderRight) {
        newMenuBtn.innerHTML = window.originalHeaderRight;
        if (window.originalHeaderClick) {
            newMenuBtn.setAttribute('onclick', window.originalHeaderClick);
        }
    }
}


// 导出关闭函数给 HTML 用
window.closeContextMenu = closeContextMenu;
// --- 执行多选操作 (转发/收藏/删除) ---
window.performMultiAction = function (type) {
    const chatBody = document.getElementById('chat-history');
    if (!chatBody) return;
    // 获取所有被选中的元素（不限于 msg-row）
    const selectedRows = getSelectableChatRows(chatBody).filter(function (row) {
        return row.classList.contains('selected');
    });

    if (selectedRows.length === 0) {
        alert("请先选择消息");
        return;
    }

    if (type === 'delete') {
        if (!confirm(`确定删除这 ${selectedRows.length} 条消息吗？`)) return;

        const roleId = window.currentChatRole;
        let hasChanges = false;
        const timeDividerRows = [];
        if (window.chatData[roleId]) {
            const list = window.chatData[roleId];
            const indicesToDelete = selectedRows.map(function (row) {
                if (getChatRowKind(row) === 'time-divider') {
                    timeDividerRows.push(row);
                    return -1;
                }
                return findMessageIndexByRow(row, roleId);
            }).filter(function (index) {
                return index >= 0 && index < list.length;
            });
            const uniqueSorted = Array.from(new Set(indicesToDelete)).sort((a, b) => b - a);
            uniqueSorted.forEach(index => {
                list.splice(index, 1);
                hasChanges = true;
            });
        }
        timeDividerRows.forEach(function (row) {
            const ts = parseInt(row.getAttribute('data-timestamp') || '', 10);
            if (!isNaN(ts)) {
                hideChatTimeDivider(roleId, ts);
                hasChanges = true;
            }
        });
        if (hasChanges) saveData();

        // 3. 删除界面 DOM
        selectedRows.forEach(row => row.remove());

        // 4. 退出多选模式
        exitMultiSelectMode();

    } else if (type === 'fav') {
        const roleId = window.currentChatRole;
        let added = 0;
        selectedRows.forEach(function (row) {
            const index = findMessageIndexByRow(row, roleId);
            const msgObj = (window.chatData && window.chatData[roleId] && index >= 0) ? window.chatData[roleId][index] : null;
            if (!msgObj) return;
            if (typeof window.addFavoriteMessage === 'function') {
                window.addFavoriteMessage(roleId, msgObj);
                added++;
            }
        });
        if (added > 0) {
            showCenterToast('已添加至收藏');
        } else {
            showCenterToast('未找到可收藏的消息');
        }
        exitMultiSelectMode();
    } else if (type === 'forward') {
        // 1. 收集选中的消息数据
        const historyList = [];
        const roleId = window.currentChatRole;

        selectedRows.forEach(row => {
            // 判断是谁发的
            const rowRole = String(row.getAttribute('data-role') || '').trim();
            const isMe = row.classList.contains('msg-right') || rowRole === 'me';
            // 获取对方名字 (如果不是我)
            let name = "我";
            if (!isMe) {
                const titleEl = document.getElementById('current-chat-name');
                name = titleEl ? titleEl.innerText : "对方";
            }

            historyList.push({
                name: name,
                text: getRowPlainText(row, roleId)
            });
        });

        if (historyList.length > 0) {
            // 🔥 重点：传入数组，而不是字符串
            openForwardModal(historyList);
        }

        exitMultiSelectMode();
    }
};

window.toggleSelectAllMessages = function () {
    const chatBody = document.getElementById('chat-history');
    if (!chatBody || !chatBody.classList.contains('select-mode')) return;
    const rows = getSelectableChatRows(chatBody);
    if (!rows.length) {
        alert('当前没有可选消息');
        return;
    }
    const allSelected = rows.every(function (row) {
        return row.classList.contains('selected');
    });
    rows.forEach(function (row) {
        row.classList.toggle('selected', !allSelected);
    });
};

/* =========================================================
   === 7. 转发功能 ===
   ========================================================= */

// 打开转发弹窗
window.openForwardModal = function (messageText) {
    const modal = document.getElementById('forward-modal');
    const listContainer = document.getElementById('forward-contact-list');

    if (!modal || !listContainer) return;

    const headerTitle = modal.querySelector('.forward-header span:first-child');
    if (headerTitle) {
        headerTitle.textContent = '选择发送给...';
    }

    // 清空列表
    listContainer.innerHTML = '';

    // 获取所有角色（排除当前聊天的角色）
    const allRoles = Object.keys(window.charProfiles);
    const currentRole = window.currentChatRole;

    if (allRoles.length <= 1) {
        listContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">暂无其他联系人</div>';
    } else {
        allRoles.forEach(roleId => {
            // 跳过当前聊天对象
            if (roleId === currentRole) return;

            const profile = window.charProfiles[roleId];
            const item = document.createElement('div');
            item.className = 'forward-item';
            item.onclick = function () {
                forwardMessageTo(roleId, messageText);
            };

            item.innerHTML = `
                <img src="${profile.avatar || 'assets/chushitouxiang.jpg'}" class="forward-avatar">
                <span class="forward-name">${profile.nickName}</span>
            `;

            listContainer.appendChild(item);
        });
    }

    // 显示弹窗
    modal.style.display = 'flex';
};

// 关闭转发弹窗
window.closeForwardModal = function () {
    const modal = document.getElementById('forward-modal');
    if (modal) modal.style.display = 'none';
};

// 执行转发
function forwardMessageTo(targetRoleId, contentData) {
    // 1. 初始化
    if (!window.chatData[targetRoleId]) {
        window.chatData[targetRoleId] = [];
    }

    const now = Date.now();
    let newMsg = {};

    // 2. 判断是 单条文本 还是 聊天记录数组
    if (Array.isArray(contentData)) {
        // === 多条合并 (聊天记录) ===
        // 简略预览图，只取前3条显示在气泡里
        const previewList = contentData.slice(0, 3).map(item => `${item.name}: ${item.text}`);
        if (contentData.length > 3) previewList.push("...");

        newMsg = {
            role: 'me',
            type: 'history', // 🔥 标记为历史记录类型
            content: "[聊天记录]", // 列表页显示的预览文本
            detail: contentData, // 完整数据存这里
            preview: previewList, // 气泡显示的文本数组
            timestamp: now
        };

    } else {
        // === 单条文本 ===
        newMsg = {
            role: 'me',
            type: 'text', // 默认为文本
            content: contentData,
            timestamp: now
        };
    }

    // 3. 存入
    window.chatData[targetRoleId].push(newMsg);
    saveData();

    // 4. 关闭并提示
    closeForwardModal();
    const targetName = window.charProfiles[targetRoleId]?.nickName || '联系人';
    alert(`已转发给 ${targetName}`);
}

// 导出函数
window.forwardMessageTo = forwardMessageTo;


/* =========================================================
   === 5. Settings Logic (Memory, Summary, CSS) ===
   ========================================================= */

window.openChatSettings = function () {
    const roleId = window.currentChatRole;
    const menu = document.getElementById('settings-menu-modal');
    if (!menu || !roleId) return;
    if (menu.dataset) {
        menu.dataset.roleId = String(roleId || '').trim();
    }

    if (typeof window.initChatSettingsUI === 'function') {
        window.initChatSettingsUI(roleId);
    }

    const profiles = (window.charProfiles && typeof window.charProfiles === 'object') ? window.charProfiles : {};
    const profile = profiles[roleId] || {};

    const avatar = document.getElementById('menu-role-avatar');
    if (avatar) avatar.src = profile.avatar || 'assets/chushitouxiang.jpg';

    const name = document.getElementById('menu-role-name');
    if (name) name.innerText = profile.nickName || profile.name || '未知角色';

    const desc = document.getElementById('menu-role-desc');
    if (desc) desc.innerText = profile.desc ? (profile.desc.substring(0, 15) + '...') : '点击查看档案...';

    menu.style.display = 'flex';
}

window.closeSettingsMenu = function () {
    const modal = document.getElementById('settings-menu-modal');
    if (modal) modal.style.display = 'none';
}

window.loadChatSettings = function () {
    const roleId = window.currentChatRole;
    if (typeof window.initChatSettingsUI === 'function') {
        window.initChatSettingsUI(roleId);
    }
}

window.saveChatSettings = function () {
    if (typeof window.__chatSettingsSaveCore === 'function') {
        return window.__chatSettingsSaveCore();
    }
    // 1. Memory Limit
    const limitInput = document.getElementById('setting-memory-limit');
    if (limitInput) localStorage.setItem('chat_memory_limit', limitInput.value);

    // 2. Auto Summary
    const summarySwitch = document.getElementById('setting-auto-summary-switch');
    if (summarySwitch) localStorage.setItem('chat_auto_summary', summarySwitch.checked);

    const freqInput = document.getElementById('setting-summary-freq');
    if (freqInput) localStorage.setItem('chat_summary_freq', freqInput.value);

    // 3. Bubble CSS
    const cssInput = document.getElementById('setting-bubble-css');
    if (cssInput) {
        const css = cssInput.value;
        localStorage.setItem('chat_bubble_css', css);
        window.applyBubbleCSS(css);
    }
}

window.toggleSummaryInput = function () {
    if (typeof window.__chatSettingsToggleSummaryCore === 'function') {
        return window.__chatSettingsToggleSummaryCore();
    }
    const switchEl = document.getElementById('setting-auto-summary-switch');
    const box = document.getElementById('setting-summary-freq-box');
    if (switchEl && box) {
        box.style.display = switchEl.checked ? 'flex' : 'none';
    }
}

window.updateBubblePreview = function () {
    if (typeof window.__chatSettingsBubblePreviewCore === 'function') {
        return window.__chatSettingsBubblePreviewCore();
    }
    const cssInput = document.getElementById('setting-bubble-css');
    const preview = document.getElementById('bubble-preview');
    if (cssInput && preview) {
        const css = cssInput.value || '';
        const trimmed = String(css).trim();
        const hasSelectorSyntax = /[{]/.test(trimmed) || /[}]/.test(trimmed);
        const baseStyle = 'background: #ffffff; padding: 10px; border-radius: 4px; font-size: 15px; position: relative; max-width: 70%; border: 1px solid #ededed; color: #000;';
        preview.style.cssText = hasSelectorSyntax ? baseStyle : baseStyle + ' ' + trimmed;
    }
}

window.applyBubbleCSS = function (css) {
    let styleTag = document.getElementById('user-custom-css');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'user-custom-css';
        document.head.appendChild(styleTag);
    }

    const raw = css || '';
    const trimmed = String(raw).trim();
    if (!trimmed) {
        styleTag.innerHTML = '';
        return;
    }

    // 只允许修改气泡相关样式，强制加上作用域前缀，禁止影响全局布局/点击
    let finalCSS = trimmed;
    const hasBlock = /[{]/.test(trimmed) || /[}]/.test(trimmed);
    const startsWithSelector = /^[.#\w-]+\s*\{/.test(trimmed);

    if (!hasBlock && !startsWithSelector) {
        // 简写：直接当作内联样式应用到自定义气泡内容
        finalCSS = `.custom-bubble-content { ${trimmed} }`;
    } else {
        // 语法包含选择器/花括号时：统一包裹在 .custom-bubble-scope 作用域下
        finalCSS = `
.custom-bubble-scope {
}
.custom-bubble-scope .custom-bubble-content,
.custom-bubble-scope .msg-bubble,
.custom-bubble-scope .msg-text {
${trimmed}
}
`;
    }

    styleTag.innerHTML = finalCSS;
}

// Initialize settings on load
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(window.loadChatSettings, 500);
});

/* =========================================================
   === 记忆档案：UI + 数据 + 自动总结写入 (本地版) ===
   ========================================================= */

(function initMemoryArchiveModule() {
    const STORAGE_KEY = 'wechat_memory_archive_v1';

    // 数据结构：{ [roleId]: { likesText, habitsText, eventsText, meta:{ lastProcessedIndex } } }
    window.memoryArchiveStore = window.memoryArchiveStore || {};

    function loadStore() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) window.memoryArchiveStore = JSON.parse(raw) || {};
        } catch (e) {
            console.error('[MemoryArchive] load failed', e);
            window.memoryArchiveStore = {};
        }
    }

    function saveStore() {
        try {
            const json = JSON.stringify(window.memoryArchiveStore || {});
            localStorage.setItem(STORAGE_KEY, json);
            try {
                localStorage.setItem('ai_memory_archives', json);
            } catch (e2) { }
        } catch (e) {
            console.error('[MemoryArchive] save failed', e);
        }
    }

    function getRoleArchive(roleId) {
        if (!roleId) roleId = window.currentChatRole || '';
        if (!window.memoryArchiveStore[roleId]) {
            window.memoryArchiveStore[roleId] = {
                likesText: "",
                habitsText: "",
                eventsText: "",
                meta: {
                    lastProcessedIndex: 0,
                    updatedAt: Date.now()
                }
            };
            saveStore();
        }

        const archive = window.memoryArchiveStore[roleId];

        if (archive.meta && archive.meta.lastProcessedIndex === 0) {
            const keys = ['likesText', 'habitsText', 'eventsText'];
            let changed = false;
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const val = archive[key];
                if (typeof val === 'string' && (val.indexOf("（示例）") !== -1 || val.indexOf("开启“自动总结”后") !== -1)) {
                    archive[key] = "";
                    changed = true;
                }
            }
            if (changed) saveStore();
        }

        if (!archive.meta) {
            archive.meta = { lastProcessedIndex: 0, updatedAt: Date.now() };
        }
        if (typeof archive.meta.lastProcessedIndex !== 'number') {
            archive.meta.lastProcessedIndex = 0;
        }
        return archive;
    }

    function setActiveTab(tabKey) {
        const modal = document.getElementById('memory-archive-modal');
        if (!modal) return;

        const allTabs = modal.querySelectorAll('.memory-tab-item');
        allTabs.forEach(btn => {
            const key = btn.getAttribute('data-key');
            if (key === tabKey) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    function renderArchive(tabKey) {
        const roleId = window.currentChatRole;
        const archive = getRoleArchive(roleId);

        const textEl = document.getElementById('memory-archive-text');

        const textMap = {
            likes: archive.likesText || '',
            habits: archive.habitsText || '',
            events: archive.eventsText || ''
        };

        const raw = textMap[tabKey] || '';
        const lines = raw
            ? String(raw)
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .filter(line => !line.includes("（示例）") && !line.includes("开启“自动总结”后") && !/<[^>]+>/.test(line))
            : [];

        if (textEl) {
            textEl.innerHTML = '';
            if (!lines.length) {
                textEl.innerHTML = '<div style="text-align:center; color:#999; margin-top:20px;">暂无记忆</div>';
            } else {
                const ul = document.createElement('ul');
                ul.style.listStyle = 'none';
                ul.style.padding = '0';
                ul.style.margin = '0';
                lines.forEach((line, index) => {
                    const li = document.createElement('li');
                    li.innerText = line.replace(/^[-•\s]+/, '');
                    li.setAttribute('data-index', String(index));
                    li.setAttribute('data-key', tabKey);
                    li.style.cursor = 'pointer';
                    li.onclick = function () {
                        handleMemoryArchiveItemClick(tabKey, index);
                    };
                    ul.appendChild(li);
                });
                textEl.appendChild(ul);
            }
        }
    }

    // === UI 交互：打开/关闭/切换 ===
    window.openMemoryArchiveModal = function () {
        loadStore();

        // 先关闭上一级菜单（避免层级遮挡）
        const menu = document.getElementById('settings-menu-modal');
        if (menu) menu.style.display = 'none';

        disableChatStatusBarInteraction();

        const modal = document.getElementById('memory-archive-modal');
        if (modal) modal.style.display = 'flex';

        // Update Identity and Stats
        const roleId = window.currentChatRole;
        if (roleId) {
            let profile = (window.charProfiles && window.charProfiles[roleId]) ? window.charProfiles[roleId] : null;
            if (!profile) {
                try {
                    const raw = localStorage.getItem('wechat_charProfiles');
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && parsed[roleId]) profile = parsed[roleId];
                    }
                } catch (e) { }
            }

            const nameEl = document.getElementById('memory-archive-name');
            const avatarEl = document.getElementById('memory-archive-avatar');

            const displayName = profile ? (profile.nickName || profile.name || profile.title) : '';
            if (nameEl) nameEl.innerText = displayName || '未知角色';
            if (avatarEl) avatarEl.src = (profile && profile.avatar) ? profile.avatar : 'assets/chushitouxiang.jpg';

            // === Stats 统计计算：按实际短期记忆窗口估算 token ===
            const msgs = (window.chatData && window.chatData[roleId]) ? window.chatData[roleId] : [];
            let msgCount = msgs.length;
            let tokenCount = 0;
            let daysCount = 0;

            if (msgs.length > 0) {
                // 相识天数：依然按照用户界面上物理聊天记录的最早时间计算
                const firstMsg = msgs[0];
                if (firstMsg && firstMsg.timestamp) {
                    const diff = Date.now() - firstMsg.timestamp;
                    daysCount = Math.ceil(diff / (1000 * 60 * 60 * 24));
                } else {
                    daysCount = 1;
                }

                    // 消息条数和 Token 数：调用 api.js 中过滤后的实际发送量来计算
                if (typeof window.refreshActiveTokensUI === 'function') {
                    const stats = window.refreshActiveTokensUI(roleId, false);
                    // msgCount 保持 msgs.length 不变，只更新 tokenCount
                    tokenCount = stats.tokenCount;
                } else {
                    // 兜底逻辑
                    msgs.forEach(m => {
                        if (!m) return;
                        if (typeof window.estimateModelTokensFromMessageContent === 'function') {
                            tokenCount += window.estimateModelTokensFromMessageContent(m.content);
                        } else if (typeof m.content === 'string') {
                            tokenCount += Math.ceil(m.content.length / 2);
                        }
                    });
                }
            }

            const daysEl = document.getElementById('stat-days');
            const msgsEl = document.getElementById('stat-messages');
            const tokensEl = document.getElementById('stat-tokens');

            if (daysEl) daysEl.innerText = String(daysCount);
            if (msgsEl) msgsEl.innerText = String(msgCount);
            if (tokensEl) tokensEl.innerText = tokenCount > 10000 ? (tokenCount / 1000).toFixed(1) + 'k' : String(tokenCount);

        }

        // 默认选中第一个标签
        window.currentMemoryArchiveTab = 'likes';
        setActiveTab('likes');
        renderArchive('likes');
    };

    window.closeMemoryArchiveModal = function () {
        const modal = document.getElementById('memory-archive-modal');
        if (modal) modal.style.display = 'none';

        enableChatStatusBarInteraction();

        // 返回上一级：重新显示聊天设置菜单
        const menu = document.getElementById('settings-menu-modal');
        if (menu) menu.style.display = 'flex';
    };

    window.switchMemoryArchiveTab = function (tabKey) {
        window.currentMemoryArchiveTab = tabKey;
        setActiveTab(tabKey);
        renderArchive(tabKey);
    };

    function handleMemoryArchiveItemClick(tabKey, index) {
        const roleId = window.currentChatRole;
        if (!roleId) return;
        const archive = getRoleArchive(roleId);
        const map = {
            likes: 'likesText',
            habits: 'habitsText',
            events: 'eventsText'
        };
        const fieldKey = map[tabKey];
        if (!fieldKey) return;

        const raw = archive[fieldKey] || '';
        const lines = raw
            ? String(raw)
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .filter(line => !line.includes("（示例）") && !line.includes("开启“自动总结”后") && !/<[^>]+>/.test(line))
            : [];

        if (index < 0 || index >= lines.length) return;

        const originalLine = lines[index];
        const visibleText = originalLine.replace(/^[-•\s]+/, '');
        const edited = window.prompt('编辑记忆（留空则删除）', visibleText);
        if (edited === null) return;
        const trimmed = String(edited).trim();

        if (!trimmed) {
            lines.splice(index, 1);
        } else {
            const prefixMatch = originalLine.match(/^(\s*[-•]\s*)/);
            const prefix = prefixMatch ? prefixMatch[1] : '- ';
            lines[index] = prefix + trimmed;
        }

        archive[fieldKey] = lines.join('\n');
        if (!archive.meta) archive.meta = { lastProcessedIndex: 0, updatedAt: Date.now() };
        archive.meta.updatedAt = Date.now();
        window.memoryArchiveStore[roleId] = archive;
        saveStore();

        const currentTab = window.currentMemoryArchiveTab || tabKey;
        setActiveTab(currentTab);
        renderArchive(currentTab);
    }

    window.addMemoryArchiveItem = function () {
        const roleId = window.currentChatRole;
        if (!roleId) return;
        const inputEl = document.getElementById('memory-archive-input');
        if (!inputEl) return;
        const value = String(inputEl.value || '').trim();
        if (!value) return;

        const tabKey = window.currentMemoryArchiveTab || 'likes';
        const map = {
            likes: 'likesText',
            habits: 'habitsText',
            events: 'eventsText'
        };
        const fieldKey = map[tabKey];
        if (!fieldKey) return;

        const archive = getRoleArchive(roleId);
        const linesToAdd = value
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean)
            .map(l => `- ${l}`);

        archive[fieldKey] = uniqueAppend(archive[fieldKey], linesToAdd);
        if (!archive.meta) archive.meta = { lastProcessedIndex: 0, updatedAt: Date.now() };
        archive.meta.updatedAt = Date.now();
        window.memoryArchiveStore[roleId] = archive;
        saveStore();

        inputEl.value = '';
        setActiveTab(tabKey);
        renderArchive(tabKey);
    };

    // === 自动总结：仅使用 API，总结失败时不再写入兜底记忆 ===
    function normalizeText(s) {
        return (s || '')
            .replace(/^「回复：[\s\S]*?」\s*\n-+\s*\n/i, '') // 去掉引用发送的头
            .replace(/\r/g, '')
            .trim();
    }

    function containsAny(text, keywords) {
        const s = String(text || '');
        for (let i = 0; i < keywords.length; i++) {
            if (s.includes(keywords[i])) return true;
        }
        return false;
    }

    function normalizeSummaryLine(s) {
        const text = String(s || '').trim().replace(/^[-•\s]+/, '').trim();
        return text;
    }

    function buildCopiedLineSet(segmentText) {
        const set = new Set();
        String(segmentText || '')
            .split('\n')
            .map(line => line.replace(/^(用户|AI|角色|我|你)\s*[：:]\s*/, '').trim())
            .filter(line => line.length >= 8)
            .forEach(line => set.add(line));
        return set;
    }

    function isLikelyCopiedDialogueLine(text, copiedLineSet) {
        const line = normalizeSummaryLine(text);
        if (!line) return false;
        if (/^(用户|AI|角色|我|你|TA|Ta)\s*[：:]/.test(line)) return true;
        const cleaned = line.replace(/^(喜欢|习惯|事件|我们发生的事)\s*[：:]\s*/, '').trim();
        return copiedLineSet && copiedLineSet.has(cleaned);
    }

    function isEmojiOnlyText(s) {
        const text = String(s || '').trim();
        if (!text) return false;
        const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
        const removed = text.replace(emojiRegex, '').replace(/\s/g, '');
        if (removed.length !== 0) return false;
        return !!text.match(emojiRegex);
    }

    function isEmojiHeavyMessage(m) {
        if (!m) return false;
        if (m.type === 'image' || m.type === 'sticker') return true;
        if (m.type !== 'text') return false;
        const t = normalizeText(m.content);
        if (!t) return false;
        return isEmojiOnlyText(t) || t.length <= 2;
    }

    function uniqueAppend(baseText, linesToAdd) {
        const base = (baseText || '').trim();
        const existing = new Set(
            base
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean)
        );
        const out = [];
        linesToAdd.forEach(l => {
            const line = (l || '').trim();
            if (!line) return;
            if (existing.has(line)) return;
            existing.add(line);
            out.push(line);
        });
        if (!out.length) return baseText || '';
        return (base ? (base + '\n') : '') + out.join('\n');
    }

    // 对外：每次有新消息时调用，按设置频率“累计到阈值再写入”
    window.maybeAutoUpdateMemoryArchive = function (roleId) {
        try {
            if (!roleId) roleId = window.currentChatRole;
            if (!roleId) return;
            const chunkSize = 120;

            let autoOn = false;
            let freq = 20;

            try {
                if (typeof window.getCurrentChatSettings === 'function') {
                    const settings = window.getCurrentChatSettings(roleId) || {};
                    if (typeof settings.autoSummary === 'boolean') {
                        autoOn = settings.autoSummary;
                    }
                    if (typeof settings.summaryFreq === 'number' && settings.summaryFreq > 0) {
                        freq = settings.summaryFreq;
                    }
                }
            } catch (e) { }

            if (!autoOn) {
                autoOn = localStorage.getItem('chat_auto_summary') === 'true';
            }
            if (!freq) {
                const legacyFreq = parseInt(localStorage.getItem('chat_summary_freq'), 10);
                if (!isNaN(legacyFreq) && legacyFreq > 0) {
                    freq = legacyFreq;
                }
            }

            if (!autoOn) return;

            const history = window.chatData[roleId] || [];
            if (!Array.isArray(history)) return;

            loadStore();
            const archive = getRoleArchive(roleId);
            const isArchiveEmpty = !String(archive.likesText || archive.habitsText || archive.eventsText || '').trim();
            let lastIdx = archive.meta.lastProcessedIndex || 0;
            if (isArchiveEmpty && history.length > 0 && lastIdx >= history.length) {
                lastIdx = Math.max(0, history.length - Math.max(chunkSize, freq));
            }
            const pendingCount = history.length - lastIdx;

            if (pendingCount < freq && !(isArchiveEmpty && history.length > 0 && lastIdx === 0)) return; // 未到阈值，不总结

            const endIndex = Math.min(history.length, lastIdx + chunkSize);
            const segment = history.slice(lastIdx, endIndex);

            // 防抖：同一角色同时只跑一个总结请求
            if (!archive.meta) archive.meta = {};
            if (archive.meta.summaryInProgress) return;
            archive.meta.summaryInProgress = true;
            window.memoryArchiveStore[roleId] = archive;
            saveStore();

            const profile = window.charProfiles[roleId] || {};
            const userPersonaObj = (window.userPersonas && window.userPersonas[roleId]) || {};
            const userPersona = userPersonaObj.setting || "";
            const userName = userPersonaObj.name || ""; // 🔥 新增：提取用户名字
            const userGender = userPersonaObj.gender || ""; // 🔥 新增：提取用户性别

            // 把片段整理成可读文本（用户/AI）
            const segmentText = segment
                .filter(m => m && (m.role === 'me' || m.role === 'ai') && m.content)
                .slice(-1000) // 极限兜底，避免太长
                .map(m => {
                    const who = m.role === 'me' ? '用户' : 'AI';
                    if (m.type === 'image') return `${who}: [图片]`;
                    if (m.type === 'sticker') return `${who}: [表情包]`;
                    if (m.type === 'voice') return `${who}: [语音]`;
                    if (m.type === 'location' || m.type === 'location_share') return `${who}: [位置]`;
                    if (m.type === 'translated_text' && typeof window.parseTranslatedTextPayload === 'function') {
                        const parsed = window.parseTranslatedTextPayload(m.content);
                        return `${who}: ${normalizeText(parsed.translationText || parsed.foreignText || parsed.bodyText || '')}`;
                    }
                    return `${who}: ${normalizeText(m.content)}`;
                })
                .filter(Boolean)
                .join('\n');

            const userMsgsForDetect = segment.filter(m => m && m.role === 'me');
            const userTextForDetect = userMsgsForDetect
                .map(m => (m && m.type === 'text') ? normalizeText(m.content) : '')
                .filter(Boolean)
                .join('\n');
            const emojiHeavyRatio = userMsgsForDetect.length
                ? (userMsgsForDetect.filter(isEmojiHeavyMessage).length / userMsgsForDetect.length)
                : 0;
            const copiedLineSet = buildCopiedLineSet(segmentText);

            function filterApiLikes(items) {
                const markers = ['喜欢', '最喜欢', '偏爱', '爱吃', '爱喝', '爱看', '爱玩', '迷上', '沉迷', '讨厌', '不喜欢', '不爱', '不太喜欢', '不想', '不吃', '怕', '过敏', '忌口'];
                return (items || [])
                    .map(normalizeSummaryLine)
                    .filter(Boolean)
                    .filter(s => s.length <= 80)
                    .filter(s => !isLikelyCopiedDialogueLine(s, copiedLineSet))
                    .filter(s => containsAny(s, markers));
            }

            function filterApiHabits(items) {
                const markers = ['习惯', '经常', '总是', '每天', '通常', '一般', '老是', '一直', '熬夜', '晚起', '早起', '失眠', '夜宵', '运动', '健身', '跑步', '喝咖啡', '加班', '通勤', '追剧', '刷手机', '表情', '表情包'];
                return (items || [])
                    .map(normalizeSummaryLine)
                    .filter(Boolean)
                    .filter(s => s.length <= 80)
                    .filter(s => !isLikelyCopiedDialogueLine(s, copiedLineSet))
                    .filter(s => {
                        if (containsAny(s, ['说话', '聊天', '打字', '语气', '口癖', '句尾'])) {
                            return containsAny(s, ['表情', '表情包']);
                        }
                        return true;
                    })
                    .filter(s => containsAny(s, markers) || (emojiHeavyRatio >= 0.6 && containsAny(s, ['表情', '表情包'])));
            }

            function filterApiEvents(items) {
                return (items || [])
                    .map(normalizeSummaryLine)
                    .filter(Boolean)
                    .filter(s => s.length <= 180)
                    .filter(s => !isLikelyCopiedDialogueLine(s, copiedLineSet))
                    .filter(s => /^((?:\d{2,4}年)?\d{1,2}月\d{1,2}日|\d{4}[-/年]\d{1,2}|我们|今天|最近|这次|那天|昨天|明天|后天|下次|未来|月底|周[一二三四五六日天]|星期[一二三四五六日天])/.test(s))
                    .filter(s => !/^(我们|今天|最近)[：:]?\s*(聊了很多|聊得很愉快|聊得很开心|日常闲聊|聊了不少|没什么特别|没有特别|未发生)/.test(s));
            }

            // ✅ 优先用你的 API 总结（api.js 提供 window.callAISummary）
            if (typeof window.callAISummary === 'function') {
                window.callAISummary(
                    {
                        roleId,
                        roleName: profile.nickName || profile.name || 'AI',
                        rolePrompt: profile.desc || '',
                        userPersona,
                        userName,   // 🔥 新增：传入用户名字
                        userGender, // 🔥 新增：传入用户性别
                        segmentText
                    },
                    (res) => {
                        try {
                            // 追加写入（去重）
                            const likesLines = filterApiLikes(res.likes).map(s => `- ${s}`);
                            const habitsLines = filterApiHabits(res.habits).map(s => `- ${s}`);
                            const eventsLines = filterApiEvents(res.events).map(s => `- ${s}`);

                            if (likesLines.length) archive.likesText = uniqueAppend(archive.likesText, likesLines);
                            if (habitsLines.length) archive.habitsText = uniqueAppend(archive.habitsText, habitsLines);
                            if (eventsLines.length) archive.eventsText = uniqueAppend(archive.eventsText, eventsLines);

                            archive.meta.lastProcessedIndex = endIndex;
                            archive.meta.updatedAt = Date.now();
                        } finally {
                            archive.meta.summaryInProgress = false;
                            window.memoryArchiveStore[roleId] = archive;
                            saveStore();

                            // 如果面板正开着，实时刷新当前标签内容
                            const modal = document.getElementById('memory-archive-modal');
                            if (modal && modal.style.display !== 'none') {
                                const tab = window.currentMemoryArchiveTab || 'likes';
                                setActiveTab(tab);
                                renderArchive(tab);
                            }
                            if ((history.length - archive.meta.lastProcessedIndex) >= freq) {
                                window.setTimeout(function () {
                                    try { if (typeof window.maybeAutoUpdateMemoryArchive === 'function') window.maybeAutoUpdateMemoryArchive(roleId); } catch (e) { }
                                }, 60);
                            }
                        }
                    },
                    (_err) => {
                        archive.meta.summaryInProgress = false;
                        archive.meta.updatedAt = Date.now();
                        window.memoryArchiveStore[roleId] = archive;
                        saveStore();
                    }
                );
                return;
            }

            archive.meta.summaryInProgress = false;
            archive.meta.updatedAt = Date.now();
            window.memoryArchiveStore[roleId] = archive;
            saveStore();

            const modal = document.getElementById('memory-archive-modal');
            if (modal && modal.style.display !== 'none') {
                const tab = window.currentMemoryArchiveTab || 'likes';
                setActiveTab(tab);
                renderArchive(tab);
            }
            if ((history.length - archive.meta.lastProcessedIndex) >= freq) {
                window.setTimeout(function () {
                    try { if (typeof window.maybeAutoUpdateMemoryArchive === 'function') window.maybeAutoUpdateMemoryArchive(roleId); } catch (e) { }
                }, 60);
            }
        } catch (e) {
            console.error('[MemoryArchive] auto update failed', e);
        }
    };

    window.rebuildMemoryArchive = function (roleId) {
        try {
            if (!roleId) roleId = window.currentChatRole;
            if (!roleId) return;
            const chunkSize = 120;

            const history = window.chatData[roleId] || [];
            if (!Array.isArray(history)) return;

            loadStore();
            const archive = getRoleArchive(roleId);
            archive.likesText = "";
            archive.habitsText = "";
            archive.eventsText = "";
            if (!archive.meta) archive.meta = { lastProcessedIndex: 0, updatedAt: Date.now() };
            archive.meta.lastProcessedIndex = 0;
            archive.meta.updatedAt = Date.now();
            archive.meta.summaryInProgress = false;
            window.memoryArchiveStore[roleId] = archive;
            saveStore();

            const profile = window.charProfiles[roleId] || {};
            const userPersonaObj = (window.userPersonas && window.userPersonas[roleId]) || {};
            const userPersona = userPersonaObj.setting || "";
            const userName = userPersonaObj.name || "";
            const userGender = userPersonaObj.gender || "";

            const finalize = () => {
                const modal = document.getElementById('memory-archive-modal');
                if (modal && modal.style.display !== 'none') {
                    const tab = window.currentMemoryArchiveTab || 'likes';
                    setActiveTab(tab);
                    renderArchive(tab);
                }
            };

            archive.meta.summaryInProgress = true;
            window.memoryArchiveStore[roleId] = archive;
            saveStore();

            const processChunk = (startIndex) => {
                const start = Math.max(0, Number(startIndex) || 0);
                if (start >= history.length) {
                    archive.meta.summaryInProgress = false;
                    archive.meta.lastProcessedIndex = history.length;
                    archive.meta.updatedAt = Date.now();
                    window.memoryArchiveStore[roleId] = archive;
                    saveStore();
                    finalize();
                    return;
                }
                const end = Math.min(history.length, start + chunkSize);
                const segment = history.slice(start, end);
                const segmentText = segment
                    .filter(m => m && (m.role === 'me' || m.role === 'ai') && m.content)
                    .map(m => {
                        const who = m.role === 'me' ? '用户' : 'AI';
                        if (m.type === 'image') return `${who}: [图片]`;
                        if (m.type === 'sticker') return `${who}: [表情包]`;
                        if (m.type === 'voice') return `${who}: [语音]`;
                        if (m.type === 'location' || m.type === 'location_share') return `${who}: [位置]`;
                        if (m.type === 'translated_text' && typeof window.parseTranslatedTextPayload === 'function') {
                            const parsed = window.parseTranslatedTextPayload(m.content);
                            return `${who}: ${normalizeText(parsed.translationText || parsed.foreignText || parsed.bodyText || '')}`;
                        }
                        return `${who}: ${normalizeText(m.content)}`;
                    })
                    .filter(Boolean)
                    .join('\n');
                const userMsgsForDetect = segment.filter(m => m && m.role === 'me');
                const userTextForDetect = userMsgsForDetect
                    .map(m => (m && m.type === 'text') ? normalizeText(m.content) : '')
                    .filter(Boolean)
                    .join('\n');
                const emojiHeavyRatio = userMsgsForDetect.length
                    ? (userMsgsForDetect.filter(isEmojiHeavyMessage).length / userMsgsForDetect.length)
                    : 0;
                const copiedLineSet = buildCopiedLineSet(segmentText);

                const filterLikes = (items) => {
                    const markers = ['喜欢', '最喜欢', '偏爱', '爱吃', '爱喝', '爱看', '爱玩', '迷上', '沉迷', '讨厌', '不喜欢', '不爱', '不太喜欢', '不想', '不吃', '怕', '过敏', '忌口'];
                    return (items || [])
                        .map(normalizeSummaryLine)
                        .filter(Boolean)
                        .filter(s => s.length <= 80)
                        .filter(s => !isLikelyCopiedDialogueLine(s, copiedLineSet))
                        .filter(s => containsAny(s, markers))
                        .filter(s => containsAny(userTextForDetect, markers) || containsAny(segmentText, markers));
                };

                const filterHabits = (items) => {
                    const markers = ['习惯', '经常', '总是', '每天', '通常', '一般', '老是', '一直', '熬夜', '晚起', '早起', '失眠', '夜宵', '运动', '健身', '跑步', '喝咖啡', '加班', '通勤', '追剧', '刷手机', '表情', '表情包'];
                    return (items || [])
                        .map(normalizeSummaryLine)
                        .filter(Boolean)
                        .filter(s => s.length <= 80)
                        .filter(s => !isLikelyCopiedDialogueLine(s, copiedLineSet))
                        .filter(s => {
                            if (containsAny(s, ['说话', '聊天', '打字', '语气', '口癖', '句尾'])) {
                                return containsAny(s, ['表情', '表情包']);
                            }
                            return true;
                        })
                        .filter(s => containsAny(s, markers) || (emojiHeavyRatio >= 0.6 && containsAny(s, ['表情', '表情包'])));
                };

                const filterEvents = (items) => {
                    const filler = ['我们聊了很多', '对话很愉快', '聊得很愉快', '聊得很开心', '聊了不少', '日常闲聊'];
                    return (items || [])
                        .map(normalizeSummaryLine)
                        .filter(Boolean)
                        .filter(s => s.length <= 180)
                        .filter(s => !isLikelyCopiedDialogueLine(s, copiedLineSet))
                        .filter(s => /^(\d{1,2}月\d{1,2}日|\d{4}[-/年]\d{1,2}|我们|今天|最近|这次|那天|昨天|明天|后天|下次|未来|月底|周[一二三四五六日天]|星期[一二三四五六日天])/.test(s))
                        .filter(s => !containsAny(s, filler))
                        .filter(s => !/^(我们|今天|最近)[：:]?\s*(聊了很多|聊得很愉快|聊得很开心)/.test(s));
                };

                if (typeof window.callAISummary === 'function' && segmentText) {
                    window.callAISummary(
                        {
                            roleId,
                            roleName: profile.nickName || profile.name || 'AI',
                            rolePrompt: profile.desc || '',
                            userPersona,
                            userName,
                            userGender,
                            segmentText
                        },
                        (res) => {
                            const likesLines = filterLikes(res && res.likes).slice(0, 80).map(s => `- ${s}`);
                            const habitsLines = filterHabits(res && res.habits).slice(0, 80).map(s => `- ${s}`);
                            const eventsLines = filterEvents(res && res.events).slice(0, 80).map(s => `- ${s}`);
                            if (likesLines.length) archive.likesText = uniqueAppend(archive.likesText, likesLines);
                            if (habitsLines.length) archive.habitsText = uniqueAppend(archive.habitsText, habitsLines);
                            if (eventsLines.length) archive.eventsText = uniqueAppend(archive.eventsText, eventsLines);
                            archive.meta.lastProcessedIndex = end;
                            archive.meta.updatedAt = Date.now();
                            window.memoryArchiveStore[roleId] = archive;
                            saveStore();
                            processChunk(end);
                        },
                        (_err) => {
                            archive.meta.updatedAt = Date.now();
                            archive.meta.summaryInProgress = false;
                            window.memoryArchiveStore[roleId] = archive;
                            saveStore();
                            finalize();
                        }
                    );
                    return;
                }

                archive.meta.updatedAt = Date.now();
                archive.meta.summaryInProgress = false;
                window.memoryArchiveStore[roleId] = archive;
                saveStore();
                finalize();
            };

            processChunk(0);
        } catch (e) {
            console.error('[MemoryArchive] rebuild failed', e);
        }
    };

    // 初始化加载一次（避免首次打开时空对象）
    loadStore();
})();

// =========================================================
// === Added: Korean Style User Persona Logic ===
// =========================================================

function toggleCalendarType() {
    const input = document.getElementById('user-birthday-type');
    if (!input) return;

    // Toggle value
    input.value = input.value === 'solar' ? 'lunar' : 'solar';

    // Update UI
    syncCalendarToggleUI();
}

function syncCalendarToggleUI() {
    const input = document.getElementById('user-birthday-type');
    const dot = document.getElementById('calendar-toggle-dot');
    const labelSolar = document.getElementById('calendar-label-solar');
    const labelLunar = document.getElementById('calendar-label-lunar');

    // Inputs
    const inputSolar = document.getElementById('user-settings-birthday-solar');
    const inputLunar = document.getElementById('user-settings-birthday-lunar');

    if (!input || !dot || !labelSolar || !labelLunar) return;

    if (input.value === 'lunar') {
        // Move to right (Lunar state)
        dot.style.transform = 'translateX(28px)';
        labelSolar.style.opacity = '1';
        labelLunar.style.opacity = '0';

        // Show Lunar input, hide Solar
        if (inputLunar) inputLunar.classList.remove('hidden');
        if (inputSolar) inputSolar.classList.add('hidden');
    } else {
        // Move to left (Solar state)
        dot.style.transform = 'translateX(0)';
        labelSolar.style.opacity = '0';
        labelLunar.style.opacity = '1';

        // Show Solar input, hide Lunar
        if (inputSolar) inputSolar.classList.remove('hidden');
        if (inputLunar) inputLunar.classList.add('hidden');
    }
}

(function () {
    const OFFLINE_SESSIONS_KEY = 'offline_sessions';
    const OFFLINE_READER_PREFS_KEY = 'offline_reader_prefs_v1';
    const DEFAULT_WB_ID = '';
    const DEFAULT_OFFLINE_LENGTH_SETTINGS = Object.freeze({
        min: 800,
        max: 1200
    });
    const DEFAULT_OFFLINE_READER_SETTINGS = Object.freeze({
        fontSize: 18,
        colorTheme: 'soft-paper',
        backgroundTheme: 'plain',
        pageTurn: 'slide',
        customCss: ''
    });
    const DEFAULT_OFFLINE_NOVEL_SETTINGS = Object.freeze({
        allowAiInitiate: true,
        enableComments: true,
        perspective: 'third',
        summaryAuto: true,
        summaryFrequency: 10
    });

    function safeParseJSON(raw) {
        try { return JSON.parse(raw); } catch (e) { return null; }
    }

    function clampNumber(value, min, max, fallback) {
        const n = Number(value);
        if (!isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    }

    function normalizeOfflineLengthSettings(raw) {
        const src = raw && typeof raw === 'object' ? raw : {};
        let min = clampNumber(src.min, 300, 8000, DEFAULT_OFFLINE_LENGTH_SETTINGS.min);
        let max = clampNumber(src.max, 500, 12000, DEFAULT_OFFLINE_LENGTH_SETTINGS.max);
        if (max < min) {
            const fixed = Math.max(min + 100, DEFAULT_OFFLINE_LENGTH_SETTINGS.max);
            max = Math.min(12000, fixed);
        }
        return { min, max };
    }

    function normalizeOfflineReaderSettings(raw) {
        const src = raw && typeof raw === 'object' ? raw : {};
        const fontSize = clampNumber(src.fontSize, 14, 34, DEFAULT_OFFLINE_READER_SETTINGS.fontSize);
        const colorTheme = ['soft-paper', 'soft-sepia', 'soft-mint', 'soft-blue', 'dark-night', 'dark-ink']
            .includes(String(src.colorTheme || ''))
            ? String(src.colorTheme)
            : DEFAULT_OFFLINE_READER_SETTINGS.colorTheme;
        const backgroundTheme = ['plain', 'paper', 'mist', 'moon', 'night', 'custom']
            .includes(String(src.backgroundTheme || ''))
            ? String(src.backgroundTheme)
            : DEFAULT_OFFLINE_READER_SETTINGS.backgroundTheme;
        const pageTurn = ['realistic', 'cover', 'slide', 'vertical', 'none']
            .includes(String(src.pageTurn || ''))
            ? String(src.pageTurn)
            : DEFAULT_OFFLINE_READER_SETTINGS.pageTurn;
            
        const customBgUrl = src.customBgUrl || '';
        const customBgBlur = clampNumber(src.customBgBlur, 0, 50, 0);
        const customCardOpacity = clampNumber(src.customCardOpacity, 0, 100, 80);
        const customCss = String(src.customCss || '').slice(0, 50000);

        return { fontSize, colorTheme, backgroundTheme, pageTurn, customBgUrl, customBgBlur, customCardOpacity, customCss };
    }

    function normalizeOfflineNovelSettings(raw) {
        const src = raw && typeof raw === 'object' ? raw : {};
        const perspective = ['first', 'second', 'third'].includes(String(src.perspective || ''))
            ? String(src.perspective)
            : DEFAULT_OFFLINE_NOVEL_SETTINGS.perspective;
        const summaryFrequency = clampNumber(src.summaryFrequency, 1, 200, DEFAULT_OFFLINE_NOVEL_SETTINGS.summaryFrequency);
        return {
            allowAiInitiate: src.allowAiInitiate !== false,
            enableComments: src.enableComments !== false,
            perspective: perspective,
            summaryAuto: src.summaryAuto !== false,
            summaryFrequency: summaryFrequency
        };
    }

    function getOfflineSessionNovelSettings(session) {
        return normalizeOfflineNovelSettings(session && session.novelSettings);
    }

    function offlineCommentsEnabled(session) {
        return getOfflineSessionNovelSettings(session).enableComments !== false;
    }

    function loadOfflineReaderPrefs() {
        try {
            const raw = localStorage.getItem(OFFLINE_READER_PREFS_KEY);
            const parsed = raw ? safeParseJSON(raw) : null;
            return {
                lengthSettings: normalizeOfflineLengthSettings(parsed && parsed.lengthSettings),
                readerSettings: normalizeOfflineReaderSettings(parsed && parsed.readerSettings),
                novelSettings: normalizeOfflineNovelSettings(parsed && parsed.novelSettings)
            };
        } catch (e) {
            return {
                lengthSettings: normalizeOfflineLengthSettings(null),
                readerSettings: normalizeOfflineReaderSettings(null),
                novelSettings: normalizeOfflineNovelSettings(null)
            };
        }
    }

    function saveOfflineReaderPrefs(payload) {
        const next = {
            lengthSettings: normalizeOfflineLengthSettings(payload && payload.lengthSettings),
            readerSettings: normalizeOfflineReaderSettings(payload && payload.readerSettings),
            novelSettings: normalizeOfflineNovelSettings(payload && payload.novelSettings)
        };
        try {
            localStorage.setItem(OFFLINE_READER_PREFS_KEY, JSON.stringify(next));
        } catch (e) { }
        return next;
    }

    function loadOfflineSessions() {
        try {
            const raw = localStorage.getItem(OFFLINE_SESSIONS_KEY);
            const parsed = raw ? safeParseJSON(raw) : null;
            if (Array.isArray(parsed)) return parsed;
            return [];
        } catch (e) {
            return [];
        }
    }

    function saveOfflineSessions(list) {
        try {
            localStorage.setItem(OFFLINE_SESSIONS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
        } catch (e) { }
    }

    function upsertOfflineSession(session) {
        if (!session || !session.id) return;
        if (!session.roleId) session.roleId = window.currentChatRole || '';
        ensureOfflineSessionSummaryState(session);
        const list = loadOfflineSessions();
        const idx = list.findIndex(s => s && s.id === session.id);
        if (idx >= 0) list[idx] = session;
        else list.unshift(session);
        saveOfflineSessions(list);
    }

    function getOfflineSessionById(id) {
        if (!id) return null;
        const list = loadOfflineSessions();
        const found = list.find(s => s && s.id === id) || null;
        if (found) ensureOfflineSessionSummaryState(found);
        return found;
    }

    function getLatestOfflineSessionByRole(roleId) {
        const rid = String(roleId || '').trim();
        if (!rid) return null;
        const list = loadOfflineSessions().filter(function (session) {
            return session && String(session.roleId || '').trim() === rid;
        });
        const found = list[0] || null;
        if (found) ensureOfflineSessionSummaryState(found);
        return found;
    }

    function removeOfflineSessionById(id) {
        if (!id) return;
        const list = loadOfflineSessions().filter(s => s && s.id !== id);
        saveOfflineSessions(list);
    }

    function formatDateTime(ts) {
        const t = typeof ts === 'number' ? ts : Date.now();
        const d = new Date(t);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${dd} ${hh}:${mm}`;
    }

    function capText(text, maxLen) {
        const s = String(text || '');
        const n = Math.max(0, maxLen | 0);
        if (!n) return '';
        if (s.length <= n) return s;
        return s.slice(0, n) + '…';
    }

    function sanitizePlainText(text) {
        return String(text || '').replace(/\r/g, '').trim();
    }

    function stripThinkingTags(raw) {
        return String(raw || '')
            .replace(/<thinking[\s\S]*?<\/thinking>/gi, '')
            .replace(/<think[\s\S]*?<\/think>/gi, '')
            .replace(/<analysis[\s\S]*?<\/analysis>/gi, '');
    }

    function stripMarkdownCodeFences(raw) {
        let s = String(raw || '');
        if (!s) return s;
        s = s.replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1');
        s = s.replace(/```/g, '');
        return s;
    }

    function extractJSONObjectText(raw) {
        const s = stripMarkdownCodeFences(stripThinkingTags(raw)).trim();
        const start = s.indexOf('{');
        const end = s.lastIndexOf('}');
        if (start >= 0 && end >= 0 && end > start) return s.slice(start, end + 1);
        if (s.includes('"type"') && !s.trim().startsWith('{')) {
            return '{' + s;
        }
        return s;
    }

    function repairLikelyBrokenJson(jsonText) {
        let s = String(jsonText || '');
        if (!s) return s;
        s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
        const trimmed = s.trim();
        if (trimmed && !trimmed.startsWith('{') && trimmed.includes('"type"')) {
            s = '{' + trimmed;
        }
        if (trimmed && !trimmed.endsWith('}') && trimmed.includes('"content"') && trimmed.includes(']')) {
            const lastBracket = trimmed.lastIndexOf(']');
            if (lastBracket >= 0) {
                s = trimmed.slice(0, lastBracket + 1) + '}';
            }
        }

        let out = '';
        let inString = false;
        let escape = false;
        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (escape) {
                out += ch;
                escape = false;
                continue;
            }
            if (ch === '\\') {
                out += ch;
                escape = true;
                continue;
            }
            if (!inString) {
                if (ch === '"') inString = true;
                out += ch;
                continue;
            }

            if (ch === '\n' || ch === '\r') {
                out += '\\n';
                continue;
            }

            if (ch === '"') {
                let j = i + 1;
                while (j < s.length && /\s/.test(s[j])) j++;
                const next = j < s.length ? s[j] : '';
                if (next === ':' || next === ',' || next === ']' || next === '}' || next === '') {
                    inString = false;
                    out += '"';
                } else {
                    out += '\\"';
                }
                continue;
            }

            out += ch;
        }
        return out.trim();
    }

    function parseLongTextPayload(raw) {
        const jsonText = extractJSONObjectText(raw);
        let obj = safeParseJSON(jsonText);
        if (!obj) {
            const repaired = repairLikelyBrokenJson(jsonText);
            obj = safeParseJSON(repaired);
        }
        if (!obj || typeof obj !== 'object') return null;
        const type = String(obj.type || '').trim();
        const time = obj.time == null ? '' : String(obj.time);
        const location = obj.location == null ? '' : String(obj.location);
        const content = Array.isArray(obj.content) ? obj.content.map(p => String(p || '').trim()).filter(Boolean) : [];
        if (type !== 'long_text') return null;
        if (content.length === 0) return null;
        return { type: 'long_text', time, location, content };
    }

    function parseOfflineCommentPayload(raw) {
        const jsonText = extractJSONObjectText(raw);
        let obj = safeParseJSON(jsonText);
        if (!obj) {
            const repaired = repairLikelyBrokenJson(jsonText);
            obj = safeParseJSON(repaired);
        }
        let comments = [];
        if (obj && typeof obj === 'object') {
            const source = Array.isArray(obj.comments) ? obj.comments : [];
            comments = source.map(function (item) {
                if (!item || typeof item !== 'object') return null;
                const quote = sanitizePlainText(item.quote || '');
                const lines = Array.isArray(item.comments)
                    ? item.comments.map(function (line) { return sanitizePlainText(line || ''); }).filter(Boolean)
                    : [];
                if (!quote || !lines.length) return null;
                return { quote: quote, comments: lines.slice(0, 5) };
            }).filter(Boolean).slice(0, 3);
        }
        if (comments.length) return comments;
        return parseOfflineCommentPayloadFallback(raw);
    }

    function parseOfflineCommentPayloadFallback(raw) {
        const text = stripMarkdownCodeFences(stripThinkingTags(String(raw || ''))).trim();
        if (!text) return null;
        const blockFormat = [];
        const blockRegex = /\[COMMENT\]([\s\S]*?)(?=\[COMMENT\]|$)/gi;
        let blockMatch = null;
        while ((blockMatch = blockRegex.exec(text))) {
            const body = String(blockMatch[1] || '');
            const lines = body.split(/\r?\n+/).map(function (line) {
                return sanitizePlainText(line || '');
            }).filter(Boolean);
            let quote = '';
            const commentLines = [];
            lines.forEach(function (line) {
                if (!quote && /^QUOTE\s*[:：]/i.test(line)) {
                    quote = sanitizePlainText(line.replace(/^QUOTE\s*[:：]\s*/i, ''));
                    return;
                }
                if (/^(?:[1-5]|[一二三四五])[\.\-、]\s*/.test(line)) {
                    commentLines.push(sanitizePlainText(line.replace(/^(?:[1-5]|[一二三四五])[\.\-、]\s*/, '')));
                    return;
                }
                if (/^网友[^:：]*[:：]/.test(line)) {
                    commentLines.push(line);
                }
            });
            if (quote && commentLines.length) {
                blockFormat.push({ quote: quote, comments: commentLines.slice(0, 5) });
            }
        }
        if (blockFormat.length) return blockFormat.slice(0, 3);

        const xmlBlocks = [];
        const xmlRegex = /<comment\b[^>]*quote="([^"]+)"[^>]*>([\s\S]*?)<\/comment>/gi;
        let xmlMatch = null;
        while ((xmlMatch = xmlRegex.exec(text))) {
            const quote = sanitizePlainText(xmlMatch[1] || '');
            const body = String(xmlMatch[2] || '');
            const lines = body.split(/\r?\n+/).map(function (line) {
                return sanitizePlainText(line || '');
            }).filter(function (line) {
                return line && /[:：]/.test(line);
            }).slice(0, 5);
            if (quote && lines.length) {
                xmlBlocks.push({ quote: quote, comments: lines });
            }
        }
        if (xmlBlocks.length) return xmlBlocks.slice(0, 3);

        const blocks = [];
        const parts = text.split(/(?:\n\s*\n)+/).map(function (part) { return String(part || '').trim(); }).filter(Boolean);
        parts.forEach(function (part) {
            const lines = part.split(/\r?\n+/).map(function (line) { return sanitizePlainText(line || ''); }).filter(Boolean);
            if (!lines.length) return;
            let quote = '';
            const commentLines = [];
            lines.forEach(function (line) {
                if (!quote && (/^quote\s*[:：]/i.test(line) || /^原句\s*[:：]/.test(line) || /^引用\s*[:：]/.test(line))) {
                    quote = sanitizePlainText(line.replace(/^[^:：]+[:：]\s*/, ''));
                    return;
                }
                if (!quote && !/[:：]/.test(line)) {
                    quote = line.replace(/^["“]|["”]$/g, '').trim();
                    return;
                }
                if (/[:：]/.test(line)) commentLines.push(line);
            });
            if (quote && commentLines.length) {
                blocks.push({ quote: quote, comments: commentLines.slice(0, 5) });
            }
        });
        return blocks.length ? blocks.slice(0, 3) : null;
    }

    function normalizeOfflineCommentResult(comments) {
        const source = Array.isArray(comments) ? comments : [];
        const out = source.map(function (item) {
            if (!item || typeof item !== 'object') return null;
            const quote = sanitizePlainText(item.quote || '');
            const anchorIndex = item.anchorIndex; // 保留 anchorIndex ！！
            const lines = Array.isArray(item.comments)
                ? item.comments.map(function (line) { return sanitizePlainText(line || ''); }).filter(Boolean)
                : [];
            if (!quote || !lines.length) return null;
            return { quote: quote, anchorIndex: anchorIndex, comments: lines.slice(0, 5) };
        }).filter(Boolean).slice(0, 3);
        return out.length ? out : null;
    }

    function resolveOfflineCommentAnchors(payload, comments) {
        const paragraphs = payload && Array.isArray(payload.content) ? payload.content.map(function (p) { return String(p || '').trim(); }) : [];
        const used = new Set();
        const nextFreeIndex = function () {
            for (let i = 0; i < paragraphs.length; i++) {
                if (!used.has(i)) return i;
            }
            return 0;
        };
        return (Array.isArray(comments) ? comments : []).map(function (item) {
            if (!item) return null;
            const quote = String(item.quote || '').trim();
            let anchorIndex = -1;
            if (quote) {
                anchorIndex = paragraphs.findIndex(function (text, idx) {
                    return !used.has(idx) && text && text.indexOf(quote) >= 0;
                });
                if (anchorIndex < 0) {
                    anchorIndex = paragraphs.findIndex(function (text) {
                        return text && text.indexOf(quote) >= 0;
                    });
                }
            }
            if (anchorIndex < 0) anchorIndex = nextFreeIndex();
            used.add(anchorIndex);
            return Object.assign({}, item, { anchorIndex: anchorIndex });
        }).filter(Boolean);
    }

    function buildOfflinePendingCommentAnchors(payload) {
        const paragraphs = payload && Array.isArray(payload.content) ? payload.content : [];
        const count = Math.min(2, paragraphs.length || 0);
        const indexes = [];
        for (let i = 0; i < count; i++) indexes.push(i);
        return indexes;
    }

    function splitOfflineSentences(text) {
        const s = String(text || '').replace(/\s+/g, ' ').trim();
        if (!s) return [];
        const parts = s.match(/[^。！？!?；;]+[。！？!?；;]?/g) || [s];
        return parts.map(function (part) { return String(part || '').trim(); }).filter(Boolean);
    }

    function scoreOfflineCommentTarget(sentence) {
        const text = String(sentence || '').trim();
        if (!text) return -999;
        let score = 0;
        if (/“[^”]+”|「[^」]+」/.test(text)) score += 5;
        if (/(看|望|抬手|伸手|捏|碰|抱|拉|拽|靠|贴|低头|抬眼|垂眼|笑|掐|按|握|扶|凑近)/.test(text)) score += 3;
        if (/(你|他|她|心口|耳尖|呼吸|唇|脸颊|眼尾|指尖|肩膀)/.test(text)) score += 2;
        const len = text.replace(/\s+/g, '').length;
        if (len >= 10 && len <= 38) score += 3;
        else if (len >= 8 && len <= 50) score += 1;
        if (/\*/.test(text)) score -= 1;
        return score;
    }

    function buildOfflineCommentTargets(payload) {
        const paragraphs = payload && Array.isArray(payload.content) ? payload.content : [];
        const candidates = [];
        paragraphs.forEach(function (paragraph, anchorIndex) {
            splitOfflineSentences(paragraph).forEach(function (sentence) {
                const clean = String(sentence || '').trim();
                if (!clean) return;
                candidates.push({
                    quote: clean,
                    anchorIndex: anchorIndex,
                    score: scoreOfflineCommentTarget(clean)
                });
            });
        });
        candidates.sort(function (a, b) { return b.score - a.score; });
        const picked = [];
        const usedQuote = new Set();
        const usedAnchor = new Set();
        for (let i = 0; i < candidates.length && picked.length < 3; i++) {
            const item = candidates[i];
            const key = item.quote;
            if (!key || usedQuote.has(key)) continue;
            if (picked.length === 0 || !usedAnchor.has(item.anchorIndex) || candidates.length <= 2) {
                picked.push({ quote: item.quote, anchorIndex: item.anchorIndex });
                usedQuote.add(key);
                usedAnchor.add(item.anchorIndex);
            }
        }
        for (let i = 0; i < candidates.length && picked.length < 3; i++) {
            const item = candidates[i];
            const key = item.quote;
            if (!key || usedQuote.has(key)) continue;
            picked.push({ quote: item.quote, anchorIndex: item.anchorIndex });
            usedQuote.add(key);
        }
        if (!picked.length && paragraphs.length) {
            picked.push({ quote: String(paragraphs[0] || '').trim(), anchorIndex: 0 });
        }
        if (picked.length < 2 && paragraphs.length > 1) {
            picked.push({ quote: String(paragraphs[1] || '').trim(), anchorIndex: 1 });
        }
        if (picked.length < 3 && paragraphs.length > 2) {
            picked.push({ quote: String(paragraphs[2] || '').trim(), anchorIndex: 2 });
        }
        return picked.filter(function (item) { return item && item.quote; }).slice(0, 3);
    }

    function parseOfflineCommentLines(raw) {
        const text = stripMarkdownCodeFences(stripThinkingTags(String(raw || ''))).trim();
        console.log('[OfflineNovel] parseOfflineCommentLines input:', raw);
        console.log('[OfflineNovel] parseOfflineCommentLines cleaned:', text);
        if (!text) return [];
        const lines = text.split(/\r?\n+/).map(function (line) {
            return sanitizePlainText(line || '');
        }).filter(Boolean);
        const out = [];
        lines.forEach(function (line) {
            if (/^\[COMMENT\]|^QUOTE\s*[:：]/i.test(line)) return;
            // 匹配并移除前缀，例如 "1. "、"1、"、"一、"
            let normalized = line.replace(/^(?:[0-9]+|[一二三四五六七八九十])[\.\-、]\s*/, '').trim();
            // 移除可能存在的 "网友：" 这种前缀
            if (/^网友[^:：]*[:：]/.test(normalized)) normalized = normalized.replace(/^网友[^:：]*[:：]\s*/, '').trim();
            // 再清理一次可能遗留的 "1: "、"1：" 这种
            if (/^\d+\s*[:：]/.test(normalized)) normalized = normalized.replace(/^\d+\s*[:：]\s*/, '').trim();
            if (!normalized) return;
            if (normalized.length > 80) normalized = normalized.slice(0, 80);
            out.push(normalized);
        });
        const deduped = [];
        const seen = new Set();
        out.forEach(function (line) {
            if (seen.has(line)) return;
            seen.add(line);
            deduped.push(line);
        });
        return deduped.slice(0, 5);
    }

    function buildRolePrompt(roleId) {
        const id = roleId || window.currentChatRole;
        const profile = (window.charProfiles && window.charProfiles[id]) || {};
        const roleNameForAI = profile.nickName || id || 'TA';
        let systemPrompt = `【角色名称】${roleNameForAI}\n` + (profile.desc || '你是一个友好的AI助手');

        const roleRemarkForUser = typeof profile.remark === 'string' ? profile.remark.trim() : '';
        if (roleRemarkForUser) {
            systemPrompt += `\n\n【用户给你的备注】${roleRemarkForUser}\n注意：这是用户侧的显示名，不等同于你的角色名称。你可以对这个备注做出自然反应。`;
        }

        if (profile.schedule && String(profile.schedule).trim()) {
            systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${String(profile.schedule).trim()}`;
        }

        if (profile.style && String(profile.style).trim()) {
            systemPrompt += `\n\n【聊天风格】\n${String(profile.style).trim()}`;
        }

        const userPersona = (window.userPersonas && window.userPersonas[id]) || {};
        if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
            systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
            if (userPersona.name) systemPrompt += `用户名字：${userPersona.name}\n`;
            if (userPersona.gender) systemPrompt += `用户性别：${userPersona.gender}\n`;
            if (userPersona.birthday) {
                const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
                systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
            }
            if (userPersona.setting) systemPrompt += `用户背景：${userPersona.setting}\n`;
        }

        return systemPrompt;
    }

    function buildWorldBookPrompt(worldbookIds) {
        if (!worldbookIds) return '';
        const ids = Array.isArray(worldbookIds) ? worldbookIds : [String(worldbookIds || '').trim()];
        if (!window.worldBooks) return '';

        let totalPrompt = '';
        
        ids.forEach(id => {
            const wbId = String(id || '').trim();
            if (!wbId) return;

            // 处理分类 (兼容 cat: 和 CATEGORY: 前缀)
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
            } else {
                // 处理单本
                const wb = window.worldBooks[wbId];
                if (wb) {
                    totalPrompt += `\n\n【🌍 当前场景/世界观设定】\n标题：${wb.title}\n内容：${wb.content}`;
                }
            }
        });

        if (totalPrompt) {
            totalPrompt += `\n请基于以上选中的世界观设定进行叙事。`;
        }
        return totalPrompt;
    }

    function buildAutumnWaterPrompt() {
        return `\n\n<writing_style:轻盈日常>\n- 以准确、轻盈的日常观察来形成诗意，不要空泛抒情，不要堆砌比喻。\n- 重点写光线、空气、器物、食物、步伐、手势这些生活细节，让普通场景本身显得温柔而清透。\n- 句子可以自然舒展、连贯流动，但不要沉重，不要故作深情，不要把简单相处写得压抑黏腻。\n- 浪漫体现在相邻、照顾、记得、顺手、陪伴这些小动作里，而不是夸张表白或霸总式拉扯。\n- 允许轻松、松弛、带一点玩笑和生活气，不要写成厚重苦情文。\n</writing_style:轻盈日常>`;
    }

    function getOfflineUserDisplayName(roleId) {
        const rid = String(roleId || window.currentChatRole || '').trim();
        try {
            if (typeof window.getCurrentUserProfile === 'function') {
                const current = window.getCurrentUserProfile() || {};
                const currentName = String(current.name || '').trim();
                if (currentName) return currentName;
            }
        } catch (e) { }
        const persona = (window.userPersonas && rid && window.userPersonas[rid] && typeof window.userPersonas[rid] === 'object')
            ? window.userPersonas[rid]
            : {};
        const personaName = String(persona.name || '').trim();
        if (personaName) return personaName;
        const globalName = String(localStorage.getItem('user_name') || '').trim();
        if (globalName) return globalName;
        return '用户';
    }

    function getOfflineRoleDisplayName(roleId) {
        const rid = String(roleId || window.currentChatRole || '').trim();
        const profile = (window.charProfiles && rid && window.charProfiles[rid] && typeof window.charProfiles[rid] === 'object')
            ? window.charProfiles[rid]
            : {};
        return String(profile.realName || profile.real_name || profile.nickName || profile.name || rid || 'AI角色').trim() || 'AI角色';
    }

    function normalizeOfflineRecordDisplayName(roleId, msg) {
        const rawName = String((msg && (msg.name || msg.senderName || msg.displayName)) || '').trim();
        if (rawName && !/^(?:用户|user|ai|AI|assistant|助手)$/i.test(rawName)) return rawName;
        return msg && msg.role === 'me'
            ? getOfflineUserDisplayName(roleId)
            : getOfflineRoleDisplayName(roleId);
    }

    function normalizeOfflineRecordContentValue(value, isAi) {
        if (value == null) return '';
        if (Array.isArray(value)) {
            return value.map(function (item) {
                return normalizeOfflineRecordContentValue(item, isAi);
            }).filter(Boolean).join('\n');
        }
        if (typeof value === 'object') {
            if (isAi && Object.prototype.hasOwnProperty.call(value, 'reply')) {
                return normalizeOfflineRecordContentValue(value.reply, isAi);
            }
            if (typeof value.message === 'string') return value.message;
            if (typeof value.text === 'string') return value.text;
            if (typeof value.content === 'string') return value.content;
            if (Array.isArray(value.content)) return normalizeOfflineRecordContentValue(value.content, isAi);
            return '';
        }
        return String(value || '');
    }

    function stripOfflineHiddenThoughtText(text) {
        let s = stripThinkingTags(String(text || '')).replace(/\r\n?/g, '\n');
        if (!s.trim()) return '';

        const parsed = safeParseJSON(s.trim());
        if (parsed && typeof parsed === 'object') {
            if (Object.prototype.hasOwnProperty.call(parsed, 'reply')) {
                s = normalizeOfflineRecordContentValue(parsed.reply, true);
            } else if (parsed.type === 'long_text' && Array.isArray(parsed.content)) {
                s = parsed.content.map(function (part) { return String(part || '').trim(); }).filter(Boolean).join('\n');
            } else {
                s = normalizeOfflineRecordContentValue(parsed.content || parsed.text || parsed.message || '', true);
            }
        }

        s = String(s || '')
            .replace(/(?:^|\n)\s*[\[【](?:内心独白|思考链|思维链|思考|引用回复|隐藏思维链)[^\]\n】]*[\]】][^\n]*/gi, '\n')
            .replace(/(?:^|\n)\s*(?:"?(?:thought|inner_monologue|reasoning_content|analysis|status|actions|system_event|quoteId|quote_id|reply_to)"?|思考链|思维链|思考|内心独白|状态|动作|系统提示)\s*[:：][^\n]*/gi, '\n');

        return s.split(/\n+/).map(function (line) {
            return String(line || '').replace(/\s+/g, ' ').trim();
        }).filter(function (line) {
            if (!line || /^[-—–_~=.•·|]+$/.test(line)) return false;
            if (/^[\[【](?:内心独白|思考链|思维链|思考|隐藏思维链)/.test(line)) return false;
            if (typeof window.isLikelyLeakedThoughtLine === 'function' && window.isLikelyLeakedThoughtLine(line)) return false;
            return true;
        }).join(' ').trim();
    }

    function buildOfflineVisibleRecordContent(roleId, msg) {
        if (!msg || msg.hidden === true || msg.recalled === true) return '';
        const type = String(msg.type || 'text').trim();
        if (type === 'system' || type === 'system_event' || type === 'call_memory' || type === 'location_share') return '';

        if (typeof window.getMessagePlainText === 'function') {
            const visible = stripOfflineHiddenThoughtText(window.getMessagePlainText(msg));
            if (visible) return visible;
        }

        if (type === 'offline_action') {
            return stripOfflineHiddenThoughtText(`（${String(msg.content || '').trim()}）`);
        }
        if (type === 'voice') {
            const voiceText = stripOfflineHiddenThoughtText(msg.content || '');
            return voiceText ? `[语音] ${voiceText}` : '[语音]';
        }
        if (type === 'sticker') return '[表情包]';
        if (type === 'image' || type === 'ai_secret_photo') {
            const imageText = stripOfflineHiddenThoughtText(msg.content || '');
            return imageText && !/^data:image\//i.test(imageText) ? `[图片] ${imageText}` : '[图片]';
        }
        if (type === 'location') {
            const locationText = stripOfflineHiddenThoughtText(msg.content || '');
            return locationText ? `[位置] ${locationText}` : '[位置]';
        }

        const raw = normalizeOfflineRecordContentValue(msg.content, msg.role === 'ai');
        return stripOfflineHiddenThoughtText(raw);
    }

    function normalizeOfflineSourceRecord(roleId, msg) {
        if (!msg || (msg.role !== 'me' && msg.role !== 'ai')) return null;
        const content = buildOfflineVisibleRecordContent(roleId, msg);
        if (!content) return null;
        return {
            role: msg.role,
            name: normalizeOfflineRecordDisplayName(roleId, msg),
            type: String(msg.type || 'text').trim() || 'text',
            content: content,
            timestamp: msg.timestamp || 0
        };
    }

    function getOfflineSourceRecords(session, limit) {
        const roleId = session && session.roleId ? session.roleId : (window.currentChatRole || '');
        const maxCount = Math.max(1, Number(limit) || 20);
        const source = Array.isArray(session && session.sourceChatRecords) && session.sourceChatRecords.length
            ? session.sourceChatRecords
            : ((session && session.plotMode === 'read_memory') ? buildRecentChatRecordsForOffline(roleId, maxCount) : []);
        return source.map(function (item) {
            return normalizeOfflineSourceRecord(roleId, item);
        }).filter(Boolean).slice(-maxCount);
    }

    function buildOfflinePerspectiveRules(session, userName) {
        const roleName = getOfflineRoleDisplayName(session && session.roleId);
        const perspective = getOfflineSessionNovelSettings(session).perspective;
        if (perspective === 'first') {
            return [
                '[第一人称视角规则]：',
                `- 叙述者：你（AI）就是 ${roleName} 本人。`,
                `- 自我称呼：你必须用“我”来指代自己，绝对不能出现“他”或你的名字作为主语。可以大量加入“我”的私人心理活动。`,
                `- 称呼用户：你必须用“你”来指代用户。`,
                `- 视角限制：你只能知道“我”内心的想法和眼睛看到的东西，不能用上帝视角描写用户没表现出来的心理活动。`,
                `- 示例：“我看着你因生气而微微发红的脸颊，心里闪过一丝无奈，走上前将你拉入怀中，‘别闹了，跟我回家。’”`
            ].join('\n');
        }
        if (perspective === 'second') {
            return [
                '[第二人称视角规则]：',
                `- 叙述者：你是一个旁白，摄像机镜头完全对准用户。`,
                `- 称呼角色：你必须用“他”或者角色的全名 ${roleName} 来指代角色。`,
                `- 称呼用户：你必须用“你”来指代用户，让用户感觉正在经历这一切。`,
                `- 视角侧重：着重描写“你”所感受到的感官刺激（听觉、触觉等）以及 ${roleName} 对“你”做出的动作。`,
                `- 示例：“他深邃的目光紧紧锁着你，你甚至能闻到他风衣上淡淡的烟草味。夏烬泽向前逼近了一步，低声对你说：‘别闹了，跟我回家。’”`
            ].join('\n');
        }
        return [
            '[第三人称视角规则]：',
            `- 叙述者：你是一位全知全能的上帝视角作家。`,
            `- 称呼角色：必须使用角色的全名 ${roleName} 或“他”来指代角色，绝不能用“我”。`,
            `- 称呼用户：必须使用用户的全名 ${userName} 或“她/他”来指代用户，绝不能用“你”。`,
            `- 视角侧重：可以同时描写双方的动作、神态，呈现出一种像看电影一样的客观画面感。`,
            `- 示例：“夏烬泽看着面前赌气的女孩，眉眼间浮现出几分不易察觉的烦躁。他大步流星地走到许落文面前，一把攥住她的手腕：‘别闹了，跟我回家。’”`
        ].join('\n');
    }

    function buildNovelModeRulesPrompt(session) {
        const lengthSettings = normalizeOfflineLengthSettings(session && session.lengthSettings);
        const minLen = lengthSettings.min;
        const maxLen = Math.max(lengthSettings.max, minLen + 100);
        const userName = getOfflineUserDisplayName(session && session.roleId);
        const perspectiveRules = buildOfflinePerspectiveRules(session, userName);
        return `\n\n【NOVEL_MODE_RULES】\n用户已切换到长叙事模式。请在保留“轻盈日常”默认文风的前提下，生成一条 ${minLen}-${maxLen} 字的完整叙述。\n\n【最高格式指令】\n你必须输出一个严格 JSON 对象，不要 Markdown，不要代码块，不要多余解释。\n{"type":"long_text","time":"202X年X月X日 XX:XX","location":"具体的地点","content":["段落1","段落2"]}\n\n【完整性要求】\n- 必须一次性输出完整 JSON，不得输出半截，必须以 } 结尾。\n- 这是长叙事，不是聊天气泡，也不是旁白提纲。\n- 总字数必须尽量稳定控制在 ${minLen}-${maxLen} 字之间；少于 ${minLen} 字视为篇幅不足，超过 ${maxLen} 字视为超长。\n- 请创作“连贯叙事片段”，不要写提纲、总结、说明文或散碎句群。\n\n${perspectiveRules}\n\n【文风约束】\n- “轻盈日常”是默认底色：准确、轻透、自然，不要沉重，不要故作深情，不要网文腔。\n- 诗意来自准确观察和生活细节，不要堆砌比喻，不要空泛抒情。\n- 即使场面亲密，也不要写成低质言情腔、套路霸总腔或自嗨式煽情旁白。\n\n【内容结构】\n- 输出必须包含动作、神态、心理活动、对话，四者都不能缺席。\n- 环境/氛围：描写当下具体的光线、空气、温度、器物、声音等细节。\n- 动作捕捉：描写角色的步伐、手势、视线、停顿、距离变化等细节。\n- 神态与心理：心理活动要落在神态、身体反应和细小动作上，不要空泛说理。\n- 对话规范：对话直接写在 content 字符串内，使用中文双引号“”，严禁使用反斜杠 \\ 或英文双引号 \\"。\n- 内心独白：角色的短促想法必须写成 *想法内容* 这种单星号格式，方便页面渲染；想法要克制，不要滥用。\n\n【承接要求】\n- 如果系统提供了最近聊天记录，你必须真正承接这些记录里的关系和语气余温。\n- 允许吸收最近记录中的事实、气氛和情绪走向，但不能机械复述成聊天流水账。\n- 如果最近记录发生在线下状态，也要自然承接动作余温和现场氛围。\n\n【JSON 强约束】\n- content 必须是数组，至少 4 段。\n- 每个 content 元素内部严禁出现换行符。\n- 严禁在 content 的文本中使用反斜杠 \\ 符号。\n- 除了用于想法标记的 *...* 之外，不要使用其它 Markdown 语法。`;
    }

    // --- 新增：长叙事专属去八股规则 --- 
    function buildAntiBaguPrompt() { 
        return `\n\n【去八股文与去抽象专项禁令（最高优先级）】 
 你绝对不能使用以下词汇或意象： 
 1. 陈旧意象: "投入湖面的石子", "石子", "涟漪", "古井", "深潭", "枯井", "像是被羽毛...了一下", "羽毛", "一丝"(如: 一丝不易察觉的...) 
 2. 疼痛与身体: "骨血", "四肢百骸", "薄茧", "邪火", "肉刃", "低吼", "嘶吼", "灼热", "指节泛白", "眸色", "眼底", "故纸堆" 
 3. 锋利意象: "手术刀"(作比喻), "切开", "铁针", "钢针", "针", "刺入/刺穿"(作比喻) 
 4. 控制与物化: "祭品", "锚点", "钥匙", "锁", "锁链", "项圈", "枷锁", "亲手递给我的", "武器", "珍宝", "稀世", "易碎", "小东西", "东西"(指代人) 
 5. 宗教与权力: "神明", "信徒", "审判", "虔诚", "猎人", "猎物", "狩猎", "猫捉老鼠", "游戏", "不容置疑", "不容置喙", "不容抗拒", "孤注一掷" 
 6. 时间与抽象: "那一句", "那一刻", "彻底输了", "失而复得", "普通男人", "不易察觉", "未曾察觉" 
 7. 咯噔语录: "嘴上说着不要，身体却这么诚实" 
 
 【句式禁令】 
 - 严禁使用比喻或明喻来表达心理、情绪（不要写"像...一样"）。 
 - 严禁抽象句（如"她全然没有察觉"），请用具体动作和画面细节代替。 
 - 严禁桥接句式（"非但...而且...", "那不是...而是...", "好像是..."）。
 - 严禁用“他意识到”“她并未察觉”“那一刻他忽然明白”这种总结句替代具体画面。
 - 每当你想写抽象判断，请改写成一个可被看见或听见的细节。`; 
    }

    function getRoleNovelDefaultWorldbookIds(roleId) {
        const rid = String(roleId || window.currentChatRole || '').trim();
        if (!rid) return [];
        const profile = (window.charProfiles && window.charProfiles[rid]) || {};
        const raw = profile.worldbookId;
        if (Array.isArray(raw)) {
            return raw.map(function (item) { return String(item || '').trim(); }).filter(Boolean);
        }
        const single = String(raw || '').trim();
        return single ? [single] : [];
    }

    function countOfflinePayloadChars(payload) {
        const parts = payload && Array.isArray(payload.content) ? payload.content : [];
        return String(parts.join('')).replace(/\s+/g, '').length;
    }

    function buildRecentChatRecordsForOffline(roleId, limit) {
        const id = roleId || window.currentChatRole;
        const history = (window.chatData && window.chatData[id]) || [];
        const list = Array.isArray(history) ? history : [];
        const maxCount = Math.max(1, Number(limit) || 20);
        const picked = [];
        for (let i = list.length - 1; i >= 0 && picked.length < maxCount; i--) {
            const m = list[i];
            if (!m || (m.role !== 'me' && m.role !== 'ai')) continue;
            const record = normalizeOfflineSourceRecord(id, m);
            if (!record) continue;
            picked.unshift(record);
        }
        return picked;
    }

    function buildChatHistorySummaryFromRecords(records, roleId) {
        const list = Array.isArray(records) ? records : [];
        const lines = list.map(function (m) {
            if (!m) return '';
            const who = normalizeOfflineRecordDisplayName(roleId, m);
            const t = String(m.content || '').replace(/\s+/g, ' ').trim();
            if (!t) return '';
            return `${who}：${t}`;
        }).filter(Boolean);
        return capText(lines.join('\n'), 2200);
    }


    function isOfflineExitCommandText(text) {
        const raw = String(text || '').trim();
        if (!raw) return false;
        const normalized = raw.replace(/\s+/g, '');
        return /[（(](?:结束线下|回线上|回到线上|返回线上|结束见面|退出线下|结束剧情|回微信|切回线上)[)）]/.test(normalized);
    }

    function buildOfflineSystemPrompt(session) {
        const sourceRecords = getOfflineSourceRecords(session, 20);
        const sourceRecordLines = sourceRecords.map(function (m) {
            const who = normalizeOfflineRecordDisplayName(session && session.roleId, m);
            const text = sanitizePlainText(m && m.content ? m.content : '');
            if (!text) return '';
            return `${who}：${text}`;
        }).filter(Boolean);
        const exactRecordsPrompt = sourceRecordLines.length
            ? `【最近20条聊天记录（需要真实承接，不可机械复述）】\n${sourceRecordLines.join('\n')}`
            : '';
        if (typeof window.buildFullChatPrompt === 'function') {
            const rid = session && session.roleId ? session.roleId : '';
            const contextBits = [];
            if (session && session.plotMode === 'read_memory') {
                if (exactRecordsPrompt) {
                    contextBits.push(exactRecordsPrompt);
                } else {
                    const summary = capText(sanitizePlainText(session.chatMemorySummary || ''), 900);
                    if (summary) contextBits.push('【承接记忆】\n' + summary);
                }
            } else if (session && session.plotMode === 'new_plot') {
                const seed = sanitizePlainText(session.newPlotSetting || '');
                if (seed) contextBits.push('【新剧情设定】\n' + seed);
            }
            return window.buildFullChatPrompt('offline_novel', rid, {
                outputMode: 'plain_json_task',
                maxSummaryLines: 20,
                history: sourceRecords,
                includeRecentChatSummary: false,
                includeContinuity: false,
                includeRecentSystemEvents: false,
                worldbookId: session && session.worldbookId ? session.worldbookId : getRoleNovelDefaultWorldbookIds(rid),
                extraCurrentContext: contextBits.join('\n\n'),
                extraTaskRules: joinPromptParts([
                    buildAutumnWaterPrompt(),
                    buildNovelModeRulesPrompt(session),
                    buildAntiBaguPrompt(),
                    '这是长叙事模式，不是普通微信聊天。你要把最近关系余温和聊天记忆消化进长篇叙事，但不要机械复述聊天记录。'
                ]),
                sceneIntro: '当前场景是长叙事模式下的连续关系写作。'
            });
        }
        const base = buildRolePrompt(session && session.roleId);
        const wbId = session && session.worldbookId ? session.worldbookId : DEFAULT_WB_ID;
        const wbPrompt = buildWorldBookPrompt(wbId);
        const stylePrompt = buildAutumnWaterPrompt();
        const rulesPrompt = buildNovelModeRulesPrompt(session);
        
        const antiBaguPrompt = buildAntiBaguPrompt(); // <--- 1. 调用刚才写好的去八股函数

        let contextPrompt = '';
        if (session && session.plotMode === 'read_memory') {
            if (exactRecordsPrompt) {
                contextPrompt += `\n\n${exactRecordsPrompt}`;
            } else {
                const summary = capText(sanitizePlainText(session.chatMemorySummary || ''), 900);
                if (summary) {
                    contextPrompt += `\n\n【承接记忆：此前微信聊天摘要（仅供你在脑内默读，不可在输出中复述/引用/展示）】\n${summary}`;
                }
            }
        } else if (session && session.plotMode === 'new_plot') {
            const seed = sanitizePlainText(session.newPlotSetting || '');
            if (seed) {
                contextPrompt += `\n\n【新剧情设定】\n${seed}`;
            }
        }

        // <--- 2. 在最后拼接上 antiBaguPrompt
        return base + (wbPrompt || '') + stylePrompt + contextPrompt + rulesPrompt + antiBaguPrompt;
    }

    function normalizeOfflineHistoryForAI(messages) {
        const list = Array.isArray(messages) ? messages : [];
        const out = [];
        for (let i = 0; i < list.length; i++) {
            const m = list[i];
            if (!m || !m.role) continue;
            if (m.role !== 'me' && m.role !== 'ai') continue;
            if (m.role === 'me') {
                const content = sanitizePlainText(m.content || '');
                if (!content) continue;
                out.push({ role: 'me', content, timestamp: m.timestamp });
                continue;
            }
            if (m.type === 'long_text' && m.payload && Array.isArray(m.payload.content)) {
                const head = [];
                const time = m.payload.time ? String(m.payload.time) : '';
                const location = m.payload.location ? String(m.payload.location) : '';
                if (time || location) head.push([time, location].filter(Boolean).join(' · '));
                const body = m.payload.content.map(p => String(p || '').trim()).filter(Boolean).join('\n\n');
                const text = (head.length ? (head[0] + '\n') : '') + body;
                if (text.trim()) out.push({ role: 'ai', content: text.trim(), timestamp: m.timestamp });
                continue;
            }
            const content = sanitizePlainText(m.content || m.raw || '');
            if (!content) continue;
            out.push({ role: 'ai', content, timestamp: m.timestamp });
        }
        return out;
    }

    function buildChatHistorySummary(roleId) {
        return buildChatHistorySummaryFromRecords(buildRecentChatRecordsForOffline(roleId, 20), roleId);
    }

    function getOverlayEl() { return document.getElementById('offline-mode-overlay'); }
    function getChatViewEl() { return document.getElementById('chat-view'); }
    function getConfirmModalEl() { return document.getElementById('offline-confirm-modal'); }
    function getSetupModalEl() { return document.getElementById('offline-setup-modal'); }
    function getArchiveModalEl() { return document.getElementById('offline-archive-modal'); }
    function getArchiveListEl() { return document.getElementById('offline-archive-list'); }
    function getHistoryEl() { return document.getElementById('offline-chat-history'); }
    function getMemoryPreviewEl() { return document.getElementById('offline-memory-preview'); }
    function getMemoryPreviewListEl() { return document.getElementById('offline-memory-preview-list'); }
    function getSendBtnEl() { return document.getElementById('offline-send-btn'); }
    function getRewindBtnEl() { return document.getElementById('offline-rewind-btn'); }
    function getInputEl() { return document.getElementById('offline-msg-input'); }
    function getOfflineSettingsBtnEl() { return document.getElementById('offline-settings-btn'); }
    function getOfflineCommentSheetCloseEl() { return document.getElementById('offline-comment-sheet-close'); }
    function getOfflineRewindModalEl() { return document.getElementById('offline-rewind-modal'); }
    function getOfflineRewindConfirmBtnEl() { return document.getElementById('offline-rewind-confirm-btn'); }
    function getOfflineRewindCancelBtnEl() { return document.getElementById('offline-rewind-cancel-btn'); }
    function getOfflineSummaryListEl() { return document.getElementById('offline-summary-list'); }
    function getOfflineSummaryStatusEl() { return document.getElementById('offline-summary-status'); }
    function getOfflineSummaryRangeHintEl() { return document.getElementById('offline-summary-range-hint'); }

    function normalizeOfflineSummaryEntry(entry, index) {
        const src = entry && typeof entry === 'object' ? entry : {};
        const startFloor = clampNumber(src.startFloor, 1, 999999, 1);
        const endFloor = clampNumber(src.endFloor, startFloor, 999999, startFloor);
        const items = Array.isArray(src.items)
            ? src.items.map(function (item) { return String(item || '').trim(); }).filter(Boolean).slice(0, 12)
            : [];
        const memoryLines = Array.isArray(src.memoryLines)
            ? src.memoryLines.map(function (item) { return String(item || '').trim(); }).filter(Boolean).slice(0, 8)
            : [];
        const createdAt = Number(src.createdAt) || Date.now();
        return {
            id: String(src.id || ('offline_summary_' + createdAt + '_' + index)),
            mode: String(src.mode || 'manual') === 'auto' ? 'auto' : 'manual',
            startFloor: startFloor,
            endFloor: endFloor,
            createdAt: createdAt,
            title: String(src.title || '').trim() || `${startFloor}-${endFloor} 楼总结`,
            preview: String(src.preview || '').trim() || capText(items.join('；') || memoryLines.join('；'), 90),
            items: items,
            memoryLines: memoryLines,
            expanded: src.expanded === true,
            injectedAt: Number(src.injectedAt) || 0
        };
    }

    function ensureOfflineSessionSummaryState(session) {
        if (!session || typeof session !== 'object') return session;
        session.novelSettings = normalizeOfflineNovelSettings(session.novelSettings);
        session.summaryEntries = Array.isArray(session.summaryEntries)
            ? session.summaryEntries.map(normalizeOfflineSummaryEntry)
            : [];
        const meta = session.summaryMeta && typeof session.summaryMeta === 'object' ? session.summaryMeta : {};
        session.summaryMeta = {
            autoLastEndFloor: clampNumber(meta.autoLastEndFloor, 0, 999999, 0),
            pending: meta.pending === true
        };
        return session;
    }

    function setOfflineSummaryStatus(text, isVisible) {
        const statusEl = getOfflineSummaryStatusEl();
        if (!statusEl) return;
        const show = isVisible !== false && !!String(text || '').trim();
        statusEl.style.display = show ? 'block' : 'none';
        statusEl.textContent = show ? String(text || '').trim() : '';
    }

    function getOfflineSummaryFloorMessages(session) {
        return (Array.isArray(session && session.messages) ? session.messages : []).filter(function (msg) {
            return msg && (msg.role === 'me' || msg.role === 'ai') && !!getOfflineMemoryMessageText(msg);
        });
    }

    function getOfflineSummaryFloorCount(session) {
        return getOfflineSummaryFloorMessages(session).length;
    }

    function buildOfflineSummaryTranscript(session, startFloor, endFloor) {
        const roleId = session && session.roleId ? session.roleId : window.currentChatRole;
        const userName = getOfflineUserDisplayName(roleId);
        const roleName = getOfflineRoleDisplayName(roleId);
        const list = getOfflineSummaryFloorMessages(session);
        const safeStart = clampNumber(startFloor, 1, Math.max(1, list.length), 1);
        const safeEnd = clampNumber(endFloor, safeStart, Math.max(safeStart, list.length), Math.max(safeStart, list.length));
        return list.slice(safeStart - 1, safeEnd).map(function (msg, idx) {
            const floor = safeStart + idx;
            const speaker = msg.role === 'me' ? userName : roleName;
            return floor + '楼｜' + speaker + '：' + getOfflineMemoryMessageText(msg);
        }).join('\n');
    }

    function buildOfflineSummaryPrompt(session, startFloor, endFloor) {
        const roleId = session && session.roleId ? session.roleId : window.currentChatRole;
        const roleName = getOfflineRoleDisplayName(roleId);
        const userName = getOfflineUserDisplayName(roleId);
        return [
            '你是互动长叙事的总结助手。',
            '请根据给出的楼层范围，只总结这段剧情，不要脑补范围外内容。',
            '输出必须是严格 JSON，不要解释，不要代码块。',
            'JSON 结构如下：',
            '{"title":"一句话标题","preview":"60字内预览","summary_points":["要点1","要点2","要点3"],"memory_lines":["可写入长期记忆的简短事件1","事件2"]}',
            '要求：',
            '- title 要明确当前楼层范围发生了什么。',
            '- preview 是一句短预览。',
            '- summary_points 返回 3 到 6 条。',
            '- memory_lines 返回 0 到 4 条，只有适合写入长期记忆的稳定事实/事件才写。'
        ].join('\n') + '\n\n当前主角：' + userName + '\n互动角色：' + roleName + '\n楼层范围：' + startFloor + '-' + endFloor + '楼';
    }

    function extractOfflineSummaryStringField(text, field) {
        const source = String(text || '');
        if (!source) return '';
        const jsonPattern = new RegExp('"' + field + '"\\s*:\\s*"([^"]*[\\s\\S]*?)"', 'i');
        const jsonMatch = source.match(jsonPattern);
        if (jsonMatch && jsonMatch[1]) return String(jsonMatch[1] || '').trim();
        const linePattern = new RegExp(field + '\\s*[:：]\\s*([^\\n\\r]+)', 'i');
        const lineMatch = source.match(linePattern);
        if (lineMatch && lineMatch[1]) return String(lineMatch[1] || '').trim();
        return '';
    }

    function extractOfflineSummaryArrayItems(block) {
        const source = String(block || '').trim();
        if (!source) return [];
        const quoted = [];
        const quotePattern = /["“]([^"”\n\r]+)["”]/g;
        let match;
        while ((match = quotePattern.exec(source))) {
            const item = String(match[1] || '').trim();
            if (item) quoted.push(item);
        }
        if (quoted.length) return quoted;
        return source
            .replace(/^[\[\s]+|[\]\s]+$/g, '')
            .split(/\n|[,，;；、]/)
            .map(function (item) {
                return String(item || '').replace(/^[-•*\d.\s]+/, '').trim();
            })
            .filter(Boolean);
    }

    function extractOfflineSummaryArrayField(text, field) {
        const source = String(text || '');
        if (!source) return [];
        const jsonPattern = new RegExp('"' + field + '"\\s*:\\s*\\[([\\s\\S]*?)\\]', 'i');
        const jsonMatch = source.match(jsonPattern);
        if (jsonMatch && jsonMatch[1]) {
            const items = extractOfflineSummaryArrayItems(jsonMatch[1]);
            if (items.length) return items;
        }
        const blockPattern = new RegExp(field + '\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\s*(?:title|preview|summary_points|memory_lines)\\s*[:：]|$)', 'i');
        const blockMatch = source.match(blockPattern);
        if (blockMatch && blockMatch[1]) {
            return extractOfflineSummaryArrayItems(blockMatch[1]);
        }
        return [];
    }

    function parseOfflineSummaryPayload(raw, fallbackStartFloor, fallbackEndFloor) {
        const text = String(stripMarkdownCodeFences(stripThinkingTags(raw)) || '').trim();
        let parsed = null;
        let candidate = '';
        if (text) {
            candidate = text;
            const start = candidate.indexOf('{');
            const end = candidate.lastIndexOf('}');
            if (start >= 0 && end > start) candidate = candidate.slice(start, end + 1);
            parsed = safeParseJSON(candidate);
        }
        const src = parsed && typeof parsed === 'object' ? parsed : {};
        const items = Array.isArray(src.summary_points)
            ? src.summary_points.map(function (item) { return String(item || '').trim(); }).filter(Boolean)
            : extractOfflineSummaryArrayField(candidate || text, 'summary_points');
        const memoryLines = Array.isArray(src.memory_lines)
            ? src.memory_lines.map(function (item) { return String(item || '').trim(); }).filter(Boolean)
            : extractOfflineSummaryArrayField(candidate || text, 'memory_lines');
        const title = String(src.title || extractOfflineSummaryStringField(candidate || text, 'title') || '').trim();
        const preview = String(src.preview || extractOfflineSummaryStringField(candidate || text, 'preview') || '').trim();
        if (items.length < 2) return null;
        return normalizeOfflineSummaryEntry({
            id: 'offline_summary_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            mode: 'manual',
            startFloor: fallbackStartFloor,
            endFloor: fallbackEndFloor,
            title: title,
            preview: preview,
            items: items,
            memoryLines: memoryLines
        }, 0);
    }

    function renderOfflineSummaryPanel(session) {
        const listEl = getOfflineSummaryListEl();
        const hintEl = getOfflineSummaryRangeHintEl();
        if (!listEl) return;
        const currentSession = session || getCurrentOfflineSession();
        if (hintEl) {
            const totalFloors = getOfflineSummaryFloorCount(currentSession);
            hintEl.textContent = totalFloors
                ? `当前一共 ${totalFloors} 楼，可以手动总结任意楼层范围。`
                : '进入剧情后，可以按楼层范围手动总结。';
        }
        if (!currentSession) {
            listEl.innerHTML = '<div class="offline-summary-empty">开始互动后，这里会显示自动总结和手动总结的结果。</div>';
            setOfflineSummaryStatus('', false);
            return;
        }
        ensureOfflineSessionSummaryState(currentSession);
        const entries = currentSession.summaryEntries;
        if (!entries.length) {
            listEl.innerHTML = '<div class="offline-summary-empty">还没有总结内容。你可以等自动总结触发，或者手动总结一段楼层后再回来查看。</div>';
            return;
        }
        listEl.innerHTML = '';
        entries.slice().reverse().forEach(function (entry) {
            const card = document.createElement('div');
            card.className = 'offline-summary-card' + (entry.injectedAt ? ' is-injected' : '');

            const header = document.createElement('button');
            header.type = 'button';
            header.className = 'offline-summary-card-header';

            const headerInner = document.createElement('div');
            headerInner.className = 'offline-summary-card-header-inner';

            const left = document.createElement('div');
            left.style.flex = '1 1 auto';
            left.style.minWidth = '0';
            const title = document.createElement('div');
            title.className = 'offline-summary-card-title';
            title.textContent = entry.title;
            const meta = document.createElement('div');
            meta.className = 'offline-summary-card-meta';
            meta.textContent = `${entry.mode === 'auto' ? '自动总结' : '手动总结'} · ${entry.startFloor}-${entry.endFloor}楼 · ${formatDateTime(entry.createdAt)}` + (entry.injectedAt ? ' · 已写入线上记忆' : '');
            const preview = document.createElement('div');
            preview.className = 'offline-summary-card-preview';
            preview.textContent = entry.preview || '点击展开查看详情';
            left.appendChild(title);
            left.appendChild(meta);
            left.appendChild(preview);

            const toggle = document.createElement('div');
            toggle.className = 'offline-summary-card-toggle';
            toggle.textContent = entry.expanded ? '收起' : '展开';

            headerInner.appendChild(left);
            headerInner.appendChild(toggle);
            header.appendChild(headerInner);

            const body = document.createElement('div');
            body.className = 'offline-summary-card-body';
            body.style.display = entry.expanded ? 'block' : 'none';

            const list = document.createElement('ul');
            list.className = 'offline-summary-items';
            (entry.items.length ? entry.items : ['暂无总结条目']).forEach(function (item) {
                const li = document.createElement('li');
                li.textContent = item;
                list.appendChild(li);
            });
            body.appendChild(list);

            if (entry.memoryLines.length) {
                const memory = document.createElement('div');
                memory.className = 'offline-summary-memory';
                memory.innerHTML = '<div class="offline-summary-memory-title">适合写入线上记忆</div>';
                const lines = document.createElement('div');
                lines.className = 'offline-summary-memory-lines';
                entry.memoryLines.forEach(function (line) {
                    const row = document.createElement('div');
                    row.textContent = '• ' + line;
                    lines.appendChild(row);
                });
                memory.appendChild(lines);
                body.appendChild(memory);
            }

            const actions = document.createElement('div');
            actions.className = 'offline-summary-card-actions';
            const injectBtn = document.createElement('button');
            injectBtn.type = 'button';
            injectBtn.className = 'offline-summary-action-btn ' + (entry.injectedAt ? 'secondary' : 'primary');
            injectBtn.textContent = entry.injectedAt ? '已写入线上记忆' : '写入线上记忆';
            injectBtn.disabled = !!entry.injectedAt || !entry.memoryLines.length;
            injectBtn.addEventListener('click', function (e) {
                if (e) e.stopPropagation();
                injectOfflineSummaryEntry(currentSession.id, entry.id);
            });
            actions.appendChild(injectBtn);
            body.appendChild(actions);

            header.addEventListener('click', function () {
                entry.expanded = !entry.expanded;
                currentSession.updatedAt = Date.now();
                upsertOfflineSession(currentSession);
                renderOfflineSummaryPanel(currentSession);
            });

            card.appendChild(header);
            card.appendChild(body);
            listEl.appendChild(card);
        });
    }

    async function injectOfflineSummaryEntry(sessionId, entryId) {
        const session = getOfflineSessionById(sessionId);
        if (!session) return;
        ensureOfflineSessionSummaryState(session);
        const entry = session.summaryEntries.find(function (item) { return item && item.id === entryId; });
        if (!entry || entry.injectedAt || !entry.memoryLines.length) return;
        const added = injectOfflineMemoryLinesToArchive(session.roleId, entry.memoryLines, session);
        if (!added) {
            alert('写入线上记忆失败，请稍后再试。');
            return;
        }
        entry.injectedAt = Date.now();
        session.updatedAt = Date.now();
        upsertOfflineSession(session);
        renderOfflineSummaryPanel(session);
        showOfflineMemoryToast(`已写入 ${added} 条线上记忆`);
    }

    function parseOfflineSummaryRangeInput(raw, maxFloor) {
        const text = String(raw || '').trim();
        if (!text) return null;
        const matched = text.match(/^\s*(\d+)\s*[-~到至]\s*(\d+)\s*$/);
        if (matched) {
            const startFloor = clampNumber(matched[1], 1, maxFloor, 1);
            const endFloor = clampNumber(matched[2], startFloor, maxFloor, maxFloor);
            return { startFloor: Math.min(startFloor, endFloor), endFloor: Math.max(startFloor, endFloor) };
        }
        const single = text.match(/^\s*(\d+)\s*$/);
        if (single) {
            const floor = clampNumber(single[1], 1, maxFloor, maxFloor);
            return { startFloor: floor, endFloor: floor };
        }
        return null;
    }

    function promptOfflineSummaryRange(defaultValue) {
        const fallbackValue = String(defaultValue || '').trim();
        if (typeof window.chatUiPrompt === 'function') {
            return window.chatUiPrompt('请输入要总结的楼层范围，例如 1-10：', fallbackValue, {
                title: '手动总结楼层',
                placeholder: '例如 1-10'
            });
        }
        if (typeof window.uiPrompt === 'function') {
            return window.uiPrompt('请输入要总结的楼层范围，例如 1-10：', fallbackValue, {
                title: '手动总结楼层',
                placeholder: '例如 1-10'
            });
        }
        return Promise.resolve(window.prompt('请输入要总结的楼层范围，例如 1-10：', fallbackValue));
    }

    async function generateOfflineSessionSummary(session, options) {
        if (!session) return null;
        ensureOfflineSessionSummaryState(session);
        const opts = options && typeof options === 'object' ? options : {};
        const mode = String(opts.mode || 'manual') === 'auto' ? 'auto' : 'manual';
        const totalFloors = getOfflineSummaryFloorCount(session);
        if (!totalFloors) {
            setOfflineSummaryStatus('当前还没有可总结的楼层。', true);
            return null;
        }
        const startFloor = clampNumber(opts.startFloor, 1, totalFloors, 1);
        const endFloor = clampNumber(opts.endFloor, startFloor, totalFloors, totalFloors);
        const transcript = buildOfflineSummaryTranscript(session, startFloor, endFloor);
        if (!transcript) {
            setOfflineSummaryStatus('选中的楼层没有可总结内容。', true);
            return null;
        }
        if (session.summaryMeta.pending) {
            setOfflineSummaryStatus('上一段总结还在生成中，稍等一下再试。', true);
            return null;
        }
        session.summaryMeta.pending = true;
        upsertOfflineSession(session);
        setOfflineSummaryStatus(`${mode === 'auto' ? '自动' : '手动'}总结生成中：${startFloor}-${endFloor}楼`, true);
        try {
            const raw = await callNovelApiDirect({
                roleId: session.roleId,
                systemPrompt: buildOfflineSummaryPrompt(session, startFloor, endFloor),
                history: [],
                userText: capText(transcript, 7000),
                maxTokens: 900
            });
            const entry = parseOfflineSummaryPayload(raw, startFloor, endFloor);
            if (!entry) {
                throw new Error('总结格式解析失败，请再试一次');
            }
            entry.mode = mode;
            entry.createdAt = Date.now();
            session.summaryEntries.push(entry);
            if (mode === 'auto') {
                session.summaryMeta.autoLastEndFloor = Math.max(session.summaryMeta.autoLastEndFloor || 0, endFloor);
            }
            session.updatedAt = Date.now();
            upsertOfflineSession(session);
            if (isCurrentOfflineSession(session)) {
                renderOfflineSummaryPanel(session);
                setOfflineSummaryStatus(`${mode === 'auto' ? '自动' : '手动'}总结已生成：${entry.title}`, true);
            }
            return entry;
        } catch (e) {
            const msg = e && e.message ? String(e.message) : '总结失败';
            if (isCurrentOfflineSession(session)) {
                setOfflineSummaryStatus('总结失败：' + msg, true);
            }
            return null;
        } finally {
            session.summaryMeta.pending = false;
            upsertOfflineSession(session);
        }
    }

    async function requestOfflineManualSummary() {
        const session = getCurrentOfflineSession();
        if (!session) {
            setOfflineSummaryStatus('开始剧情后才能手动总结。', true);
            return;
        }
        const totalFloors = getOfflineSummaryFloorCount(session);
        if (!totalFloors) {
            setOfflineSummaryStatus('当前还没有可总结的楼层。', true);
            return;
        }
        ensureOfflineSessionSummaryState(session);
        const lastEnd = clampNumber(session.summaryMeta.autoLastEndFloor || 0, 0, totalFloors, 0);
        const defaultStart = Math.min(totalFloors, Math.max(1, lastEnd + 1));
        const defaultValue = totalFloors > 1 ? `${defaultStart}-${totalFloors}` : '1';
        const input = await promptOfflineSummaryRange(defaultValue);
        if (input === null) return;
        const range = parseOfflineSummaryRangeInput(input, totalFloors);
        if (!range) {
            setOfflineSummaryStatus('楼层范围格式不对，请用“1-10”这样的写法。', true);
            return;
        }
        await generateOfflineSessionSummary(session, {
            mode: 'manual',
            startFloor: range.startFloor,
            endFloor: range.endFloor
        });
    }

    function maybeAutoGenerateOfflineSummary(session, msg) {
        if (!session || !msg || msg.role !== 'ai') return;
        ensureOfflineSessionSummaryState(session);
        const settings = getOfflineSessionNovelSettings(session);
        if (!settings.summaryAuto) return;
        const totalFloors = getOfflineSummaryFloorCount(session);
        const lastEnd = clampNumber(session.summaryMeta.autoLastEndFloor || 0, 0, totalFloors, 0);
        const freq = clampNumber(settings.summaryFrequency, 1, 200, DEFAULT_OFFLINE_NOVEL_SETTINGS.summaryFrequency);
        if ((totalFloors - lastEnd) < freq) return;
        generateOfflineSessionSummary(session, {
            mode: 'auto',
            startFloor: lastEnd + 1,
            endFloor: lastEnd + freq
        }).catch(function (e) {
            console.warn('[OfflineMode] auto summary failed', e);
        });
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildOfflineParagraphHtml(text) {
        let html = escapeHtml(String(text || '').trim());
        if (!html) return '';
        html = html.replace(/\*([^*\n]+)\*/g, function (_, inner) {
            const body = String(inner || '').trim();
            if (!body) return '';
            return '<strong class="offline-novel-thought"><em class="offline-novel-thought">' + body + '</em></strong>';
        });
        html = html.replace(/“([^”]+)”/g, function (_, inner) {
            return '<span class="offline-novel-dialogue">“' + String(inner || '') + '”</span>';
        });
        html = html.replace(/「([^」]+)」/g, function (_, inner) {
            return '<span class="offline-novel-dialogue">「' + String(inner || '') + '」</span>';
        });
        return html;
    }

    function getOfflineCommentSheetMaskEl() { return document.getElementById('offline-comment-sheet-mask'); }
    function getOfflineCommentSheetContentEl() { return document.getElementById('offline-comment-sheet-content'); }
    function getOfflineCommentSheetQuoteEl() { return document.getElementById('offline-comment-sheet-quote'); }
    function getOfflineCommentSheetTitleEl() { return document.getElementById('offline-comment-sheet-title'); }

    function buildOfflineCommentProfiles(lines) {
        const names = ['吃糖一号', '纯爱战神', '嘴角压不住', '深夜嗑学家', '小甜饼雷达', '姨母笑选手', '在线磕疯了'];
        const avatars = ['糖', '嗑', '甜', '磕', '哇', '萌', '嗷'];
        return (Array.isArray(lines) ? lines : []).map(function (line, idx) {
            const text = String(line || '').trim();
            const hash = text.split('').reduce(function (sum, ch) { return sum + ch.charCodeAt(0); }, 0);
            return {
                name: names[(hash + idx) % names.length],
                avatar: avatars[(hash + idx) % avatars.length],
                likeCount: 6 + ((hash + idx * 7) % 17),
                text: text
            };
        });
    }

    function closeOfflineCommentSheet() {
        const state = getOfflineState();
        state.commentSheet = null;
        const mask = getOfflineCommentSheetMaskEl();
        const content = getOfflineCommentSheetContentEl();
        const quote = getOfflineCommentSheetQuoteEl();
        if (content) content.innerHTML = '';
        if (quote) quote.textContent = '';
        if (mask) mask.style.display = 'none';

        if (state.currentSessionId) {
            const session = getOfflineSessionById(state.currentSessionId);
            if (session) renderOfflineHistory(session);
        }
    }

    function closeOfflineRewindModal() {
        const modal = getOfflineRewindModalEl();
        if (modal) modal.style.display = 'none';
    }

    function closeOfflineParagraphEditor() {
        const modal = document.getElementById('offline-paragraph-editor-modal');
        if (modal) modal.remove();
    }

    function reopenOfflineParagraphEditor(sessionId, messageId) {
        closeOfflineParagraphEditor();
        openOfflineParagraphEditor(sessionId, messageId);
    }

    function getOfflineLongTextMessage(sessionId, messageId) {
        const session = getOfflineSessionById(sessionId);
        if (!session || !Array.isArray(session.messages)) return { session: null, message: null };
        const message = session.messages.find(function (item) { return item && item.id === messageId; }) || null;
        return { session: session, message: message };
    }

    function refreshOfflineLongTextAfterEdit(session, message) {
        if (!session || !message || !message.payload) return;
        const enabled = offlineCommentsEnabled(session);
        if (enabled) {
            message.payload.commentStatus = 'pending';
            message.payload.comments = [];
            message.payload.commentTargets = buildOfflineCommentTargets(message.payload);
            message.payload.pendingAnchorIndexes = message.payload.commentTargets.map(function (item) { return item.anchorIndex; });
        } else {
            message.payload.commentStatus = 'disabled';
            message.payload.comments = [];
            message.payload.commentTargets = [];
            message.payload.pendingAnchorIndexes = [];
        }
        session.updatedAt = Date.now();
        updateOfflineSessionSummary(session);
        upsertOfflineSession(session);
        renderOfflineHistory(session);
        renderOfflineSummaryPanel(session);
        if (enabled && message.id) {
            generateOfflineReaderComments(session.id, message.id, message.payload, { retry: true, manualRetry: true });
        }
    }

    async function promptOfflineParagraphText(defaultValue) {
        if (typeof window.chatUiPrompt === 'function') {
            return window.chatUiPrompt('你可以直接改写这一段；如果想删掉它，把内容留空即可。', String(defaultValue || ''), {
                title: '编辑段落',
                placeholder: '输入新的段落内容'
            });
        }
        if (typeof window.uiPrompt === 'function') {
            return window.uiPrompt('你可以直接改写这一段；如果想删掉它，把内容留空即可。', String(defaultValue || ''), {
                title: '编辑段落',
                placeholder: '输入新的段落内容'
            });
        }
        return Promise.resolve(window.prompt('你可以直接改写这一段；如果想删掉它，把内容留空即可。', String(defaultValue || '')));
    }

    async function confirmOfflineParagraphDelete(message) {
        const content = String(message || '确定删除这一段吗？');
        if (typeof window.chatUiConfirm === 'function') {
            return window.chatUiConfirm(content, { title: '删除段落', okText: '删除', cancelText: '取消' });
        }
        if (typeof window.uiConfirm === 'function') {
            return window.uiConfirm(content, { title: '删除段落', okText: '删除', cancelText: '取消' });
        }
        return Promise.resolve(window.confirm(content));
    }

    async function editOfflineParagraph(sessionId, messageId, paraIndex) {
        const found = getOfflineLongTextMessage(sessionId, messageId);
        const session = found.session;
        const message = found.message;
        if (!session || !message || !message.payload || !Array.isArray(message.payload.content) || !message.payload.content[paraIndex]) return;
        const oldText = String(message.payload.content[paraIndex] || '').trim();
        const next = await promptOfflineParagraphText(oldText);
        if (next === null) return;
        const clean = sanitizePlainText(next || '');
        if (!clean) {
            const ok = await confirmOfflineParagraphDelete('这段会被删除。确定继续吗？');
            if (!ok) return;
            await deleteOfflineParagraph(sessionId, messageId, paraIndex);
            return;
        }
        if (clean === oldText) return;
        message.payload.content[paraIndex] = clean;
        closeOfflineCommentSheet();
        refreshOfflineLongTextAfterEdit(session, message);
        reopenOfflineParagraphEditor(sessionId, messageId);
        showOfflineMemoryToast('段落已更新');
    }

    async function deleteOfflineParagraph(sessionId, messageId, paraIndex) {
        const found = getOfflineLongTextMessage(sessionId, messageId);
        const session = found.session;
        const message = found.message;
        if (!session || !message || !message.payload || !Array.isArray(message.payload.content)) return;
        const content = message.payload.content;
        if (!content[paraIndex]) return;
        if (content.length <= 1) {
            const removeWhole = await confirmOfflineParagraphDelete('当前只剩这一段了。确定删除整条长叙事输出吗？');
            if (!removeWhole) return;
            closeOfflineCommentSheet();
            session.messages = session.messages.filter(function (item) { return item && item.id !== messageId; });
            session.updatedAt = Date.now();
            updateOfflineSessionSummary(session);
            upsertOfflineSession(session);
            renderOfflineHistory(session);
            renderOfflineSummaryPanel(session);
            closeOfflineParagraphEditor();
            showOfflineMemoryToast('这一段输出已删除');
            return;
        }
        content.splice(paraIndex, 1);
        closeOfflineCommentSheet();
        refreshOfflineLongTextAfterEdit(session, message);
        reopenOfflineParagraphEditor(sessionId, messageId);
        showOfflineMemoryToast('段落已删除');
    }

    function openOfflineParagraphEditor(sessionId, messageId) {
        const found = getOfflineLongTextMessage(sessionId, messageId);
        const session = found.session;
        const message = found.message;
        if (!session || !message || !message.payload || !Array.isArray(message.payload.content)) {
            showOfflineMemoryToast('没找到这段内容');
            return;
        }
        closeOfflineParagraphEditor();

        const modal = document.createElement('div');
        modal.id = 'offline-paragraph-editor-modal';
        modal.className = 'offline-paragraph-editor-modal';

        const card = document.createElement('div');
        card.className = 'offline-paragraph-editor-card';

        const title = document.createElement('div');
        title.className = 'offline-paragraph-editor-title';
        title.textContent = '编辑本段输出';

        const desc = document.createElement('div');
        desc.className = 'offline-paragraph-editor-desc';
        desc.textContent = '你可以按段修改，或者删掉不喜欢的段落。';

        const list = document.createElement('div');
        list.className = 'offline-paragraph-editor-list';

        message.payload.content.forEach(function (paragraph, index) {
            const item = document.createElement('div');
            item.className = 'offline-paragraph-editor-item';

            const meta = document.createElement('div');
            meta.className = 'offline-paragraph-editor-item-meta';
            meta.textContent = '第 ' + (index + 1) + ' 段';

            const text = document.createElement('div');
            text.className = 'offline-paragraph-editor-item-text';
            text.textContent = String(paragraph || '').trim();

            const actions = document.createElement('div');
            actions.className = 'offline-paragraph-editor-item-actions';

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'offline-paragraph-editor-btn primary';
            editBtn.textContent = '编辑';
            editBtn.addEventListener('click', function () {
                editOfflineParagraph(sessionId, messageId, index);
            });

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'offline-paragraph-editor-btn danger';
            delBtn.textContent = '删除';
            delBtn.addEventListener('click', function () {
                deleteOfflineParagraph(sessionId, messageId, index);
            });

            actions.appendChild(editBtn);
            actions.appendChild(delBtn);
            item.appendChild(meta);
            item.appendChild(text);
            item.appendChild(actions);
            list.appendChild(item);
        });

        const footer = document.createElement('div');
        footer.className = 'offline-paragraph-editor-footer';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'offline-paragraph-editor-btn secondary';
        closeBtn.textContent = '关闭';
        closeBtn.addEventListener('click', function () {
            closeOfflineParagraphEditor();
        });

        footer.appendChild(closeBtn);
        card.appendChild(title);
        card.appendChild(desc);
        card.appendChild(list);
        card.appendChild(footer);
        modal.appendChild(card);
        modal.addEventListener('click', function (e) {
            if (e && e.target === modal) closeOfflineParagraphEditor();
        });
        document.body.appendChild(modal);
    }

    function findLatestEditableOfflineTurn(session) {
        const messages = Array.isArray(session && session.messages) ? session.messages : [];
        for (let i = messages.length - 1; i >= 0; i--) {
            const item = messages[i];
            if (!item || item.role !== 'me') continue;
            const text = sanitizePlainText(item.content || '');
            if (!text) continue;
            return {
                index: i,
                message: item,
                trailingMessages: messages.slice(i + 1)
            };
        }
        return null;
    }

    function syncOfflineInputHeight() {
        const input = getInputEl();
        if (!input) return;
        try {
            input.style.height = 'auto';
            input.style.height = Math.min(160, input.scrollHeight) + 'px';
        } catch (e) { }
    }

    function syncOfflineInputPlaceholder(session) {
        const input = getInputEl();
        if (!input) return;
        const msgs = Array.isArray(session && session.messages) ? session.messages : [];
        const waitsForUserStart = session && !msgs.length && !getOfflineSessionNovelSettings(session).allowAiInitiate;
        input.placeholder = waitsForUserStart ? '由你开始剧情…' : '输入一句话，推动剧情…';
    }

    function restoreOfflineInputText(text) {
        const input = getInputEl();
        if (!input) return;
        input.value = String(text || '');
        syncOfflineInputHeight();
        try {
            input.focus();
            const len = input.value.length;
            if (typeof input.setSelectionRange === 'function') {
                input.setSelectionRange(len, len);
            }
        } catch (e) { }
    }

    function syncOfflineRewindButtonState(session) {
        const btn = getRewindBtnEl();
        if (!btn) return;
        const currentSession = session || getCurrentOfflineSession();
        btn.disabled = !findLatestEditableOfflineTurn(currentSession);
    }

    function openOfflineRewindModal() {
        const session = getCurrentOfflineSession();
        if (!session) return;
        if (!findLatestEditableOfflineTurn(session)) {
            alert('当前还没有可以重回编辑的上一句。');
            return;
        }
        const modal = getOfflineRewindModalEl();
        if (modal) modal.style.display = 'flex';
    }

    function invalidateOfflinePendingRequest(session) {
        if (!session) return;
        session.lastReqId = 'offline_cancel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        session.pendingReqId = '';
        session.pendingStartedAt = 0;
        session.pendingUserText = '';
        session.updatedAt = Date.now();
        upsertOfflineSession(session);
        hideOfflineTyping();
        setAiInFlight(false);
    }

    function rewindOfflineLatestTurn() {
        const session = getCurrentOfflineSession();
        if (!session) {
            closeOfflineRewindModal();
            return;
        }
        const targetTurn = findLatestEditableOfflineTurn(session);
        if (!targetTurn) {
            closeOfflineRewindModal();
            alert('当前还没有可以重回编辑的上一句。');
            return;
        }
        if (getOfflineState().aiInFlight) {
            invalidateOfflinePendingRequest(session);
        }
        closeOfflineCommentSheet();
        closeOfflineRewindModal();
        const restoredText = sanitizePlainText(targetTurn.message && targetTurn.message.content);
        session.messages = Array.isArray(session.messages) ? session.messages.slice(0, targetTurn.index) : [];
        session.updatedAt = Date.now();
        updateOfflineSessionSummary(session);
        upsertOfflineSession(session);
        renderOfflineHistory(session);
        renderOfflineMemoryPreview(session);
        restoreOfflineInputText(restoredText);
    }

    async function retryOfflineReaderCommentsFromSheet() {
        const state = getOfflineState();
        const sheetState = state && state.commentSheet ? state.commentSheet : null;
        if (!sheetState || !sheetState.sessionId || !sheetState.messageId) return;
        const session = getOfflineSessionById(sheetState.sessionId);
        if (!session || !Array.isArray(session.messages)) return;
        if (!offlineCommentsEnabled(session)) return;
        const msg = session.messages.find(function (item) { return item && item.id === sheetState.messageId; });
        if (!msg || !msg.payload || !Array.isArray(msg.payload.content)) return;

        msg.payload.commentStatus = 'pending';
        msg.payload.comments = [];
        msg.payload.commentTargets = buildOfflineCommentTargets(msg.payload);
        msg.payload.pendingAnchorIndexes = msg.payload.commentTargets.map(function (item) { return item.anchorIndex; });
        session.updatedAt = Date.now();
        upsertOfflineSession(session);

        const anchorIndex = Number.isInteger(sheetState.anchorIndex) ? sheetState.anchorIndex : null;
        const fallbackQuote = anchorIndex != null && msg.payload.content[anchorIndex]
            ? String(msg.payload.content[anchorIndex] || '')
            : String((msg.payload.content && msg.payload.content[0]) || '');
        openOfflineCommentSheet([], {
            sessionId: sheetState.sessionId,
            messageId: sheetState.messageId,
            anchorIndex: anchorIndex,
            status: 'pending',
            quote: fallbackQuote
        });

        await generateOfflineReaderComments(sheetState.sessionId, sheetState.messageId, msg.payload, { retry: true, manualRetry: true });
    }

    function openOfflineCommentSheet(commentBlocks, options) {
        const blocks = Array.isArray(commentBlocks) ? commentBlocks : [];
        const opts = options && typeof options === 'object' ? options : {};
        const currentSession = getOfflineSessionById(String(opts.sessionId || getOfflineState().currentSessionId || '').trim());
        if (currentSession && !offlineCommentsEnabled(currentSession)) return;
        const mask = getOfflineCommentSheetMaskEl();
        const content = getOfflineCommentSheetContentEl();
        const quote = getOfflineCommentSheetQuoteEl();
        const title = getOfflineCommentSheetTitleEl();
        if (!mask || !content || !quote || !title) return;
        const state = getOfflineState();
        state.commentSheet = {
            open: true,
            sessionId: String(opts.sessionId || state.currentSessionId || '').trim(),
            messageId: String(opts.messageId || '').trim(),
            anchorIndex: Number.isInteger(opts.anchorIndex) ? opts.anchorIndex : null
        };
        content.innerHTML = '';
        content.scrollTop = 0;
        const status = String(opts.status || '').trim();
        const fallbackQuote = String(opts.quote || '').trim();
        title.textContent = blocks.length > 1 ? '本段段评' : '段评';
        quote.textContent = String((blocks[0] && blocks[0].quote) || fallbackQuote || '');

        if (!blocks.length && status === 'pending') {
            title.textContent = '段评生成中';
            const loading = document.createElement('div');
            loading.style.cssText = 'padding:18px 16px; border-radius:18px; background:#fff; border:1px solid rgba(0,0,0,0.06); box-shadow:0 10px 24px rgba(0,0,0,0.06);';
            loading.innerHTML = '<div style="font-size:15px; font-weight:700; color:#111; margin-bottom:8px;">网友评论正在生成中…</div><div style="font-size:13px; line-height:1.8; color:#777;">这段正文已经在后台生成段评了，通常很快就会出现。你可以先关掉弹窗，等一会儿再点这条角标看。</div>';
            content.appendChild(loading);
            mask.style.display = 'flex';
            return;
        }

        if (!blocks.length && (status === 'error' || status === 'partial')) {
            title.textContent = '段评暂时不可用';
            const failed = document.createElement('div');
            failed.style.cssText = 'padding:18px 16px; border-radius:18px; background:#fff; border:1px solid rgba(0,0,0,0.06); box-shadow:0 10px 24px rgba(0,0,0,0.06);';
            failed.innerHTML = '<div style="font-size:15px; font-weight:700; color:#111; margin-bottom:8px;">这条段评还没有生成出来</div><div style="font-size:13px; line-height:1.8; color:#777;">这次多半是评论接口返回被截断了。你不用重跑正文，直接点下面按钮重新生成这条段评就行。</div>';
            const retryBtn = document.createElement('button');
            retryBtn.type = 'button';
            retryBtn.textContent = '重新生成段评';
            retryBtn.style.cssText = 'margin-top:14px; width:100%; height:42px; border:none; border-radius:14px; background:#111; color:#fff; font-size:14px; font-weight:700; cursor:pointer;';
            retryBtn.addEventListener('click', function () {
                retryOfflineReaderCommentsFromSheet();
            });
            content.appendChild(failed);
            content.appendChild(retryBtn);
            mask.style.display = 'flex';
            return;
        }

        if (!blocks.length) {
            console.log('[OfflineNovel] openOfflineCommentSheet: blocks is empty, status:', status);
            return;
        }

        blocks.forEach(function (block, blockIndex) {
            console.log('[OfflineNovel] openOfflineCommentSheet: block', blockIndex, block);
            if (!block || !Array.isArray(block.comments) || !block.comments.length) return;
            if (blocks.length > 1) {
                const subTitle = document.createElement('div');
                subTitle.textContent = blockIndex === 0 ? '围绕这句话' : '同段其它高光句';
                subTitle.style.cssText = 'font-size:12px; color:#888; margin:0 0 8px;';
                content.appendChild(subTitle);

                const quoteCard = document.createElement('div');
                quoteCard.textContent = '“' + String(block.quote || '') + '”';
                quoteCard.style.cssText = 'margin-bottom:12px; padding:12px 14px; border-radius:14px; background:#f7f7f7; color:#333; font-size:14px; line-height:1.7;';
                content.appendChild(quoteCard);
            }

            buildOfflineCommentProfiles(block.comments).forEach(function (comment) {
                const card = document.createElement('div');
                card.style.cssText = 'padding:14px 14px 12px; border-radius:18px; background:#fff; border:1px solid rgba(0,0,0,0.06); box-shadow:0 10px 24px rgba(0,0,0,0.06); margin-bottom:12px;';

                const top = document.createElement('div');
                top.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:12px;';

                const avatar = document.createElement('div');
                avatar.textContent = comment.avatar;
                avatar.style.cssText = 'width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#ffe9ef,#fff6da); color:#8f6c48; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:700; flex:0 0 auto;';

                const meta = document.createElement('div');
                meta.style.cssText = 'display:flex; flex-direction:column; gap:2px;';

                const name = document.createElement('div');
                name.textContent = comment.name;
                name.style.cssText = 'font-size:14px; font-weight:700; color:#b27a43;';

                const sub = document.createElement('div');
                sub.textContent = '网友';
                sub.style.cssText = 'font-size:11px; color:#999;';

                meta.appendChild(name);
                meta.appendChild(sub);
                top.appendChild(avatar);
                top.appendChild(meta);

                const body = document.createElement('div');
                body.textContent = comment.text;
                body.style.cssText = 'font-size:15px; line-height:1.8; color:#222; padding-bottom:14px; border-bottom:1px solid rgba(0,0,0,0.08);';

                const footer = document.createElement('div');
                footer.style.cssText = 'display:flex; align-items:center; justify-content:space-between; color:#8d8d8d; font-size:13px; padding-top:12px;';
                footer.innerHTML = '<span>♡ ' + comment.likeCount + '</span><span>💬</span>';

                card.appendChild(top);
                card.appendChild(body);
                card.appendChild(footer);
                content.appendChild(card);
            });
        });
        mask.style.display = 'flex';
    }

    function reopenOfflineCommentSheetIfNeeded() {
        const state = getOfflineState();
        const sheetState = state && state.commentSheet ? state.commentSheet : null;
        if (!sheetState || !sheetState.open || !sheetState.messageId) return;
        const session = getOfflineSessionById(sheetState.sessionId || state.currentSessionId);
        if (!session || !Array.isArray(session.messages)) return;
        if (!offlineCommentsEnabled(session)) return;
        const msg = session.messages.find(function (item) { return item && item.id === sheetState.messageId; });
        if (!msg || !msg.payload || !Array.isArray(msg.payload.content)) return;
        const payload = msg.payload;
        const allComments = Array.isArray(payload.comments) ? payload.comments : [];
        const anchorIndex = Number.isInteger(sheetState.anchorIndex) ? sheetState.anchorIndex : null;
        const scopedComments = anchorIndex == null
            ? allComments
            : allComments.filter(function (item) { return item && item.anchorIndex === anchorIndex; });
        const fallbackQuote = anchorIndex != null && payload.content[anchorIndex]
            ? String(payload.content[anchorIndex] || '')
            : String((payload.content && payload.content[0]) || '');
        openOfflineCommentSheet(scopedComments, {
            sessionId: sheetState.sessionId,
            messageId: sheetState.messageId,
            anchorIndex: anchorIndex,
            status: String(payload.commentStatus || '').trim(),
            quote: fallbackQuote
        });
    }

    function buildOfflineCommentPrompt(session, targets) {
    const roleId = session && session.roleId ? session.roleId : '';
    const roleName = (window.charProfiles && roleId && window.charProfiles[roleId] && (window.charProfiles[roleId].nickName || window.charProfiles[roleId].name)) || 'TA';
    const userName = getOfflineUserDisplayName(roleId);
    const wbIds = session && session.worldbookId ? session.worldbookId : getRoleNovelDefaultWorldbookIds(roleId);
    const wbPrompt = buildWorldBookPrompt(wbIds);
    const safeTargets = (Array.isArray(targets) ? targets : []).filter(function (item) {
        return item && String(item.quote || '').trim();
    }).slice(0, 3);
    const quoteBlocks = safeTargets.map(function (item, idx) {
        return [
            'QUOTE_' + (idx + 1) + ':',
            String(item.quote || '').trim()
        ].join('\n');
    }).join('\n\n');
    
    return [
        '[[SCENE:OFFLINE_NOVEL_COMMENTS]]',
        '你是一个沉浸式互动小说的多句段评生成器。你需要围绕给出的高光句，为每一句生成 5 条风格不同的网友评论。',
        '这些评论不是角色本人说的话，而是围观读者的即时反应。口吻要像番茄、晋江、小红书里的真人野生读者。',
        `【重要角色设定】故事主角其实是用户（${userName}），而${roleName}是与用户互动的角色。网友评论可以喜欢两人的互动，但不要把用户（${userName}）和角色（${roleName}）混淆。`,
        wbPrompt,
        
        // --- 下面是大幅优化网感和活人味的评论类型设定 ---
        '【五大固定评论类型】\n针对每一句高光句，请按以下 5 种人设各生成 1 条弹幕式评论。必须刚好 5 条，禁止缺少类型，禁止语气同质化：',
        '1. 嗑生嗑死党（发疯/姨母笑）：重点评价氛围、拉扯和性张力。不要文绉绉，要表现出强烈的生理反应或激动。语料参考：嘴角比AK还难压、kswl、请原地结婚、按头。示例：“救命啊啊啊！这拉扯感绝了，我嘴角直接跟太阳肩并肩！！”',
        '2. 细节显微镜（列文虎克/被刀中）：精准抓取原句里的某个微表情、小动作或停顿，像被戳中了肺管子一样感叹。语料参考：谁懂啊、细品、划重点、反差感。示例：“谁懂他停顿这一秒的含金量啊...细品简直要命，其实慌了吧[捂脸]”',
        `3. 偏心 ${userName} 党（毒唯/闺蜜粉）：无脑偏向 ${userName}，疯狂吹捧 ${userName} 会撩、段位高，把 ${roleName} 当成被钓的鱼。语料参考：钓系、高端局、拿捏。示例：“笑死，根本不在一个段位好吗？${userName} 稍微抛个钩子他就咬死了，太会了我的宝~”`,
        '4. 预言家/脑补党（看热闹不嫌事大）：极其笃定（甚至略带调侃）地预判下一步走向，或拆穿人物伪装。语料参考：盲猜、下一步绝对是、嘴硬心软。示例：“盲猜这哥们现在脑子里已经在过走马灯了，别装了，下一步绝对要急眼[偷笑]”',
        '5. 乐子人吐槽党（阴阳怪气/造梗）：用吃瓜群众视角吐槽，语气接地气、带点损，常用反问句或自嘲。语料参考：单身狗做错了什么、纯爱战神、这是我不花钱能看的吗。示例：“前面嗑的收一收，只有我的关注点是他连呼吸都乱了吗哈哈哈哈，出息！”',
        
        // --- 下面是强力剥离机器味的风格约束 ---
        '【强烈风格约束（核心规则）】',
        '- 杜绝AI机器味：绝对不要用主谓宾齐全的书面语！多用省略号“...”、感叹号“！”、波浪号“~”和网感词（啊、哈、啧、救命、谁懂、笑死）。',
        '- 节奏差异化：5条不能全是尖叫发疯。“细节党”要透着隐秘的激动，“乐子人”要显得又损又清醒。',
        '- 贴脸输出：评论必须死死咬住正文里【真实存在的字词】，严禁无中生有杜撰正文没写出来的动作。',
        '- 字数极简：每条必须控制在 10 到 30 个汉字，像真实弹幕一样，一句话爆言，绝不长篇大论。',
        '- 严禁低俗，但必须有强烈的“活人冲浪感”。',

        `【当前要评论的高光句】\n${quoteBlocks}`,
        
        // --- 保持你原有的严格 JSON 输出约束不变 ---
        '【输出格式】只输出一个 JSON 对象，不要代码块，不要解释：',
        '{',
        '  "comments": [',
        '    {',
        '      "quote": "QUOTE_1 对应的原句全文",',
        '      "comments": ["评论1","评论2","评论3","评论4","评论5"]',
        '    }',
        '  ]',
        '}',
        '【输出要求】',
        '- comments 数组里的每个对象都必须对应一条高光句。',
        '- quote 必须原样填写对应高光句全文，不要写成 QUOTE_1 这种编号。',
        '- 每个 comments 数组必须固定 5 条，且顺序必须严格对应上面的五大类型。'
    ].filter(Boolean).join('\n\n');
}


    async function generateOfflineReaderComments(sessionId, messageId, payload, opts) {
        const options = opts && typeof opts === 'object' ? opts : {};
        if (!sessionId || !messageId || !payload || !Array.isArray(payload.content) || !payload.content.length) return;
        const session = getOfflineSessionById(sessionId);
        if (!session) return;
        if (!offlineCommentsEnabled(session)) return;
        const targets = Array.isArray(payload.commentTargets) && payload.commentTargets.length
            ? payload.commentTargets
            : buildOfflineCommentTargets(payload);
        if (!targets.length) return;
        try {
            const requestUserText = options.retry
                ? '上一版段评格式不完整。请严格重新输出一个可解析的 JSON，对每条高光句都返回 5 条评论，不能缺条，不能解释。'
                : '请围绕下面这些高光句，一次性输出全部段评 JSON。';
            const raw = await callNovelApiDirect({
                roleId: session.roleId,
                systemPrompt: buildOfflineCommentPrompt(session, targets),
                history: [],
                userText: requestUserText,
                maxTokens: 4096
            });
            const rawLog = [{ targets: targets.map(function (item) {
                return { quote: item.quote, anchorIndex: item.anchorIndex };
            }), raw: raw, retry: !!options.retry }];
            let parsed = parseOfflineCommentPayload(raw);
            let results = parsed ? resolveOfflineCommentAnchors(payload, parsed) : [];
            results = normalizeOfflineCommentResult(results) || [];

            if ((!results.length || results.length < targets.length) && !options.retry) {
                console.warn('[OfflineNovel Comments] batch result insufficient, retrying once', raw);
                const retryRaw = await callNovelApiDirect({
                    roleId: session.roleId,
                    systemPrompt: buildOfflineCommentPrompt(session, targets),
                    history: [],
                    userText: '上一版段评缺条、缺块或 JSON 不完整。请重新输出完整 JSON，每条高光句都必须有且仅有 5 条评论。',
                    maxTokens: 4096
                });
                rawLog.push({
                    targets: targets.map(function (item) {
                        return { quote: item.quote, anchorIndex: item.anchorIndex };
                    }),
                    raw: retryRaw,
                    retry: true
                });
                parsed = parseOfflineCommentPayload(retryRaw);
                results = parsed ? resolveOfflineCommentAnchors(payload, parsed) : [];
                results = normalizeOfflineCommentResult(results) || [];
            }

            window.__lastOfflineCommentRaw = JSON.stringify(rawLog, null, 2);
            const cur = getOfflineSessionById(sessionId);
            if (!cur || !Array.isArray(cur.messages)) return;
            if (!offlineCommentsEnabled(cur)) return;
            const msg = cur.messages.find(function (item) { return item && item.id === messageId; });
            if (!msg || !msg.payload || !Array.isArray(msg.payload.content)) return;
            if (!results.length) {
                msg.payload.commentStatus = 'error';
                msg.payload.comments = [];
                msg.payload.commentRaw = window.__lastOfflineCommentRaw;
            } else {
                msg.payload.commentStatus = results.length >= targets.length ? 'done' : 'partial';
                msg.payload.comments = normalizeOfflineCommentResult(results) || [];
                msg.payload.commentRaw = window.__lastOfflineCommentRaw;
            }
            msg.updatedAt = Date.now();
            cur.updatedAt = Date.now();
            upsertOfflineSession(cur);
            const sheetState = getOfflineState().commentSheet;
            if (sheetState && sheetState.open && String(sheetState.messageId || '') === String(messageId) && String(sheetState.sessionId || sessionId) === String(sessionId)) {
                console.log('[OfflineNovel Comments] comment sheet is open, patching sheet content without rerender');
                reopenOfflineCommentSheetIfNeeded();
            } else if (isCurrentOfflineSession(cur)) {
                renderOfflineHistory(cur);
            }
        } catch (e) {
            const cur = getOfflineSessionById(sessionId);
            if (cur && Array.isArray(cur.messages)) {
                if (!offlineCommentsEnabled(cur)) return;
                const msg = cur.messages.find(function (item) { return item && item.id === messageId; });
                if (msg && msg.payload) {
                    msg.payload.commentStatus = 'error';
                    msg.payload.comments = [];
                    msg.payload.commentRaw = String(e && e.message ? e.message : '');
                    upsertOfflineSession(cur);
                    const sheetState = getOfflineState().commentSheet;
                    if (sheetState && sheetState.open && String(sheetState.messageId || '') === String(messageId) && String(sheetState.sessionId || sessionId) === String(sessionId)) {
                        console.log('[OfflineNovel Comments] comment sheet is open, showing error state without rerender');
                        reopenOfflineCommentSheetIfNeeded();
                    } else if (isCurrentOfflineSession(cur)) {
                        renderOfflineHistory(cur);
                    }
                }
            }
            console.warn('[OfflineNovel Comments] failed', e, window.__lastOfflineCommentRaw || '');
        }
    }

    function applyOfflineReaderSettings(rawSettings) {
        const overlay = getOverlayEl();
        if (!overlay) return normalizeOfflineReaderSettings(rawSettings);
        const settings = normalizeOfflineReaderSettings(rawSettings);
        overlay.style.setProperty('--offline-reader-font-size', settings.fontSize + 'px');
        overlay.setAttribute('data-offline-color', settings.colorTheme);
        overlay.setAttribute('data-offline-bg', settings.backgroundTheme);
        overlay.setAttribute('data-offline-page-turn', settings.pageTurn);

        // 应用自定义背景和透明度
        if (settings.backgroundTheme === 'custom' && settings.customBgUrl) {
            overlay.style.setProperty('--offline-custom-bg', `url(${settings.customBgUrl})`);
            overlay.style.setProperty('--offline-custom-blur', `${settings.customBgBlur}px`);
            overlay.style.setProperty('--offline-custom-opacity', `${settings.customCardOpacity / 100}`);
        } else {
            overlay.style.removeProperty('--offline-custom-bg');
            overlay.style.removeProperty('--offline-custom-blur');
            overlay.style.removeProperty('--offline-custom-opacity');
        }

        applyOfflineCustomCss(settings.customCss);

        return settings;
    }

    function applyOfflineCustomCss(cssText) {
        let styleTag = document.getElementById('offline-custom-css-style');
        const trimmed = String(cssText || '').trim();
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'offline-custom-css-style';
            document.head.appendChild(styleTag);
        }
        if (!trimmed) {
            styleTag.textContent = '';
            return;
        }
        const hasRuleSyntax = /[{}]/.test(trimmed);
        styleTag.textContent = hasRuleSyntax
            ? trimmed
            : `#offline-mode-overlay { ${trimmed} }`;
    }

    function syncOfflineFontSizeValue(value) {
        const valueEl = document.getElementById('offline-fontsize-value');
        if (!valueEl) return;
        const size = clampNumber(value, 14, 34, DEFAULT_OFFLINE_READER_SETTINGS.fontSize);
        valueEl.textContent = String(size);
        valueEl.setAttribute('data-font-size', String(size));
    }

    function getSelectedOfflineSetting(containerId, attrName, fallbackValue) {
        const container = document.getElementById(containerId);
        if (!container) return fallbackValue;
        const active = container.querySelector('.is-selected[' + attrName + ']');
        if (active) return String(active.getAttribute(attrName) || '').trim() || fallbackValue;
        const first = container.querySelector('[' + attrName + ']');
        return first ? String(first.getAttribute(attrName) || '').trim() || fallbackValue : fallbackValue;
    }

    function setOfflineChoiceSelection(containerId, attrName, value) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const targetValue = String(value || '').trim();
        const options = Array.from(container.querySelectorAll('[' + attrName + ']'));
        options.forEach(function (el) {
            const active = String(el.getAttribute(attrName) || '').trim() === targetValue;
            el.classList.toggle('is-selected', active);
        });

        if (containerId === 'offline-background-theme-row') {
            const customControls = document.getElementById('offline-custom-bg-controls');
            if (customControls) {
                customControls.style.display = targetValue === 'custom' ? 'block' : 'none';
            }
        }
    }

    function fillOfflineResumeOptions() {
        const resumeSelect = document.getElementById('offline-resume-select');
        if (!resumeSelect) return;
        const roleId = window.currentChatRole || '';
        const list = loadOfflineSessions().filter(s => s && String(s.roleId || '') === String(roleId));
        if (!list.length) {
            resumeSelect.innerHTML = `<option value="">暂无存档</option>`;
            resumeSelect.value = '';
            return;
        }
        resumeSelect.innerHTML = list.map(s => {
            const id = String(s && s.id ? s.id : '');
            const title = String((s && s.plotName) ? s.plotName : '').trim() || '未命名剧情';
            const time = formatDateTime((s && (s.updatedAt || s.createdAt)) || Date.now());
            const safeTitle = title.replace(/"/g, '&quot;');
            return `<option value="${id.replace(/"/g, '&quot;')}">${safeTitle} · ${time}</option>`;
        }).join('');
    }

    function refreshOfflinePlotModeUI() {
        const radios = Array.from(document.querySelectorAll('input[name="offline-plot-mode"]'));
        const checked = radios.find(r => r && r.checked);
        const v = checked ? String(checked.value) : 'read_memory';
        const newPlotRow = document.getElementById('offline-new-plot-row');
        const resumeSelect = document.getElementById('offline-resume-select');
        if (newPlotRow) newPlotRow.style.display = v === 'new_plot' ? 'block' : 'none';
        if (resumeSelect) {
            if (v === 'resume_plot') {
                resumeSelect.style.display = 'block';
                fillOfflineResumeOptions();
            } else {
                resumeSelect.style.display = 'none';
            }
        }
    }

    function applyOfflineSetupForm(values, modalMode) {
        const prefs = loadOfflineReaderPrefs();
        const session = values && typeof values === 'object' ? values : {};
        const roleBoundWorldbookIds = getRoleNovelDefaultWorldbookIds(session.roleId || window.currentChatRole || '');
        const worldbookIds = Array.isArray(session.worldbookId) && session.worldbookId.length
            ? session.worldbookId.map(String)
            : roleBoundWorldbookIds;
        const lengthSettings = normalizeOfflineLengthSettings(session.lengthSettings || prefs.lengthSettings);
        const readerSettings = normalizeOfflineReaderSettings(session.readerSettings || prefs.readerSettings);
        const novelSettings = normalizeOfflineNovelSettings(session.novelSettings || prefs.novelSettings);
        const plotMode = String(session.plotMode || 'read_memory');
        const setupTitle = document.getElementById('offline-setup-title');
        const setupSubtitle = document.getElementById('offline-setup-subtitle');
        const startBtn = document.getElementById('offline-start-btn');
        const isSettingsMode = modalMode === 'settings';

        if (setupTitle) setupTitle.textContent = isSettingsMode ? '长叙事设置' : '开始长叙事互动';
        if (setupSubtitle) {
            setupSubtitle.textContent = isSettingsMode
                ? '这里可以随时调整关联世界书、字数范围和阅读外观。'
                : '先设置承接方式和阅读偏好，再进入剧情。';
        }
        if (startBtn) startBtn.textContent = isSettingsMode ? '保存设置' : '开始互动';

        const minInput = document.getElementById('offline-min-length-input');
        const maxInput = document.getElementById('offline-max-length-input');
        if (minInput) minInput.value = String(lengthSettings.min);
        if (maxInput) maxInput.value = String(lengthSettings.max);

        syncOfflineFontSizeValue(readerSettings.fontSize);
        setOfflineChoiceSelection('offline-color-theme-row', 'data-offline-color', readerSettings.colorTheme);
        setOfflineChoiceSelection('offline-background-theme-row', 'data-offline-bg', readerSettings.backgroundTheme);
        setOfflineChoiceSelection('offline-ai-initiate-row', 'data-offline-ai-initiate', novelSettings.allowAiInitiate ? 'on' : 'off');
        setOfflineChoiceSelection('offline-comments-row', 'data-offline-comments', novelSettings.enableComments ? 'on' : 'off');
        setOfflineChoiceSelection('offline-perspective-row', 'data-offline-perspective', novelSettings.perspective);
        setOfflineChoiceSelection('offline-summary-auto-row', 'data-offline-summary-auto', novelSettings.summaryAuto ? 'on' : 'off');
        const summaryFrequencyInput = document.getElementById('offline-summary-frequency-input');
        if (summaryFrequencyInput) summaryFrequencyInput.value = String(novelSettings.summaryFrequency);

        const customBgUpload = document.getElementById('offline-custom-bg-upload');
        if (customBgUpload) {
            customBgUpload.dataset.base64 = readerSettings.customBgUrl || '';
        }
        const customBgBlurSlider = document.getElementById('offline-bg-blur-slider');
        const customBgBlurVal = document.getElementById('offline-bg-blur-val');
        if (customBgBlurSlider) {
            customBgBlurSlider.value = readerSettings.customBgBlur || 0;
            if (customBgBlurVal) customBgBlurVal.textContent = customBgBlurSlider.value;
        }
        const customCardOpacitySlider = document.getElementById('offline-card-opacity-slider');
        const customCardOpacityVal = document.getElementById('offline-card-opacity-val');
        if (customCardOpacitySlider) {
            customCardOpacitySlider.value = readerSettings.customCardOpacity || 80;
            if (customCardOpacityVal) customCardOpacityVal.textContent = customCardOpacitySlider.value;
        }
        const customSliders = document.getElementById('offline-custom-sliders');
        if (customSliders) {
            customSliders.style.display = readerSettings.customBgUrl ? 'block' : 'none';
        }
        const customCssInput = document.getElementById('offline-custom-css-input');
        if (customCssInput) {
            customCssInput.value = readerSettings.customCss || '';
        }

        const radios = Array.from(document.querySelectorAll('input[name="offline-plot-mode"]'));
        radios.forEach(function (r) {
            if (!r) return;
            r.checked = String(r.value) === plotMode;
            r.disabled = !!isSettingsMode;
        });
        refreshOfflinePlotModeUI();

        const resumeSelect = document.getElementById('offline-resume-select');
        if (resumeSelect) {
            if (session.id) resumeSelect.value = String(session.id);
            resumeSelect.disabled = !!isSettingsMode;
        }

        const seedEl = document.getElementById('offline-new-plot-input');
        if (seedEl) seedEl.value = String(session.newPlotSetting || '');

        const aiInitiateRow = document.getElementById('offline-ai-initiate-row');
        if (aiInitiateRow) {
            aiInitiateRow.querySelectorAll('button').forEach(function (btn) {
                btn.disabled = !!isSettingsMode;
                btn.style.opacity = isSettingsMode ? '0.55' : '';
                btn.style.cursor = isSettingsMode ? 'not-allowed' : '';
            });
        }

        const wbContainer = document.getElementById('offline-worldbook-container');
        if (wbContainer) {
            const boxes = wbContainer.querySelectorAll('input[name="wb-checkbox"]');
            boxes.forEach(function (box) {
                box.checked = worldbookIds.includes(String(box.value || ''));
            });
        }

        const setupMask = getSetupModalEl();
        if (setupMask) {
            setupMask.setAttribute('data-offline-modal-mode', isSettingsMode ? 'settings' : 'setup');
            if (session && session.id) setupMask.setAttribute('data-offline-session-id', String(session.id));
            else setupMask.removeAttribute('data-offline-session-id');
        }
        renderOfflineSummaryPanel(session && session.id ? session : null);
    }

    function getOfflineSetupFormState() {
        const wbContainer = document.getElementById('offline-worldbook-container');
        const checkedBoxes = wbContainer ? Array.from(wbContainer.querySelectorAll('input[name="wb-checkbox"]:checked')) : [];
        const radios = Array.from(document.querySelectorAll('input[name="offline-plot-mode"]'));
        const checked = radios.find(r => r && r.checked);
        const plotMode = checked ? String(checked.value) : 'read_memory';
        const seedEl = document.getElementById('offline-new-plot-input');
        const fontSizeValueEl = document.getElementById('offline-fontsize-value');
        const minInput = document.getElementById('offline-min-length-input');
        const maxInput = document.getElementById('offline-max-length-input');
        const customBgUpload = document.getElementById('offline-custom-bg-upload');
        const customBgBlurSlider = document.getElementById('offline-bg-blur-slider');
        const customCardOpacitySlider = document.getElementById('offline-card-opacity-slider');
        const customCssInput = document.getElementById('offline-custom-css-input');
        const allowAiInitiate = getSelectedOfflineSetting('offline-ai-initiate-row', 'data-offline-ai-initiate', DEFAULT_OFFLINE_NOVEL_SETTINGS.allowAiInitiate ? 'on' : 'off') !== 'off';
        const enableComments = getSelectedOfflineSetting('offline-comments-row', 'data-offline-comments', DEFAULT_OFFLINE_NOVEL_SETTINGS.enableComments ? 'on' : 'off') !== 'off';
        const perspective = getSelectedOfflineSetting('offline-perspective-row', 'data-offline-perspective', DEFAULT_OFFLINE_NOVEL_SETTINGS.perspective);
        const summaryAuto = getSelectedOfflineSetting('offline-summary-auto-row', 'data-offline-summary-auto', DEFAULT_OFFLINE_NOVEL_SETTINGS.summaryAuto ? 'on' : 'off') !== 'off';
        const summaryFrequencyInput = document.getElementById('offline-summary-frequency-input');
        return {
            worldbookId: checkedBoxes.map(cb => String(cb.value || '')),
            plotMode: plotMode,
            newPlotSetting: seedEl ? String(seedEl.value || '').trim() : '',
            novelSettings: normalizeOfflineNovelSettings({
                allowAiInitiate: allowAiInitiate,
                enableComments: enableComments,
                perspective: perspective,
                summaryAuto: summaryAuto,
                summaryFrequency: summaryFrequencyInput ? summaryFrequencyInput.value : DEFAULT_OFFLINE_NOVEL_SETTINGS.summaryFrequency
            }),
            lengthSettings: normalizeOfflineLengthSettings({
                min: minInput ? minInput.value : DEFAULT_OFFLINE_LENGTH_SETTINGS.min,
                max: maxInput ? maxInput.value : DEFAULT_OFFLINE_LENGTH_SETTINGS.max
            }),
            readerSettings: normalizeOfflineReaderSettings({
                fontSize: fontSizeValueEl ? fontSizeValueEl.getAttribute('data-font-size') : DEFAULT_OFFLINE_READER_SETTINGS.fontSize,
                colorTheme: getSelectedOfflineSetting('offline-color-theme-row', 'data-offline-color', DEFAULT_OFFLINE_READER_SETTINGS.colorTheme),
                backgroundTheme: getSelectedOfflineSetting('offline-background-theme-row', 'data-offline-bg', DEFAULT_OFFLINE_READER_SETTINGS.backgroundTheme),
                pageTurn: DEFAULT_OFFLINE_READER_SETTINGS.pageTurn,
                customBgUrl: customBgUpload ? customBgUpload.dataset.base64 || '' : '',
                customBgBlur: customBgBlurSlider ? Number(customBgBlurSlider.value) : 0,
                customCardOpacity: customCardOpacitySlider ? Number(customCardOpacitySlider.value) : 80,
                customCss: customCssInput ? String(customCssInput.value || '') : ''
            })
        };
    }

    function renderOfflineMemoryPreview(session) {
        const wrap = getMemoryPreviewEl();
        const listEl = getMemoryPreviewListEl();
        const countEl = document.getElementById('offline-memory-preview-count');
        if (!wrap || !listEl || !countEl) return;
        const records = getOfflineSourceRecords(session, 20);
        if (!records.length || !(session && session.plotMode === 'read_memory')) {
            wrap.style.display = 'none';
            listEl.innerHTML = '';
            countEl.textContent = '0/20';
            return;
        }
        wrap.style.display = 'block';
        countEl.textContent = `${records.length}/20`;
        listEl.innerHTML = '';
        records.forEach(function (m) {
            if (!m) return;
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; align-items:flex-start; gap:8px; font-size:12px; line-height:1.55; color:#333;';
            const label = document.createElement('div');
            label.style.cssText = 'flex:0 0 auto; min-width:38px; color:#666; font-weight:700;';
            label.textContent = normalizeOfflineRecordDisplayName(session && session.roleId, m);
            const text = document.createElement('div');
            text.style.cssText = 'flex:1 1 auto; white-space:pre-wrap; word-break:break-word;';
            text.textContent = String(m.content || '');
            row.appendChild(label);
            row.appendChild(text);
            listEl.appendChild(row);
        });
    }

    function showOfflineTyping() {
        const box = getHistoryEl();
        if (!box) return;
        const old = document.getElementById('offline-typing-indicator');
        if (old) old.remove();
        const wrap = document.createElement('div');
        wrap.id = 'offline-typing-indicator';
        wrap.className = 'offline-typing';
        wrap.innerHTML = `
            <div class="offline-typing-bubble">
                <span class="offline-typing-text">对方正在输入</span>
                <span class="offline-typing-dots"><i></i><i></i><i></i></span>
            </div>
        `;
        box.appendChild(wrap);
        try {
            const body = document.querySelector('#offline-mode-overlay .offline-body');
            if (body) body.scrollTop = body.scrollHeight;
        } catch (e) { }
    }

    function hideOfflineTyping() {
        const el = document.getElementById('offline-typing-indicator');
        if (el) el.remove();
    }

    function syncOfflinePendingUi(session) {
        const state = getOfflineState();
        const currentId = String(state.currentSessionId || '').trim();
        const sessionId = String(session && session.id || '').trim();
        const isCurrent = !!(state.active && sessionId && currentId === sessionId);
        if (!isCurrent) return;
        const pending = isOfflineSessionPending(session);
        setAiInFlight(pending);
        if (pending) showOfflineTyping();
        else hideOfflineTyping();
    }

    function renderOfflineHistory(session) {
        const box = getHistoryEl();
        syncOfflineRewindButtonState(session);
        syncOfflineInputPlaceholder(session);
        if (!box) return;
        box.innerHTML = '';
        applyOfflineReaderSettings(session && session.readerSettings ? session.readerSettings : loadOfflineReaderPrefs().readerSettings);
        const msgs = Array.isArray(session && session.messages) ? session.messages : [];
        const commentsEnabled = offlineCommentsEnabled(session);

        msgs.forEach(m => {
            if (!m || !m.role) return;
            if (m.role === 'me') {
                const entry = document.createElement('div');
                entry.className = 'offline-novel-entry offline-user-card';
                entry.style.maxWidth = '820px';
                entry.style.marginLeft = 'auto';

                const head = document.createElement('div');
                head.className = 'offline-novel-head';
                head.style.textAlign = 'right';
                head.style.justifyContent = 'flex-end';
                head.textContent = '我 · ' + formatDateTime(m.timestamp || Date.now());

                const parasWrap = document.createElement('div');
                parasWrap.className = 'offline-novel-paragraphs';
                const el = document.createElement('p');
                el.textContent = String(m.content || '');
                parasWrap.appendChild(el);

                entry.appendChild(head);
                entry.appendChild(parasWrap);
                box.appendChild(entry);
                return;
            }

            if (m.type === 'long_text' && m.payload && Array.isArray(m.payload.content)) {
                const entry = document.createElement('div');
                entry.className = 'offline-novel-entry';
                entry.style.position = 'relative';

                const head = document.createElement('div');
                head.className = 'offline-novel-head';
                const time = m.payload.time ? String(m.payload.time) : '';
                const location = m.payload.location ? String(m.payload.location) : '';
                const charCountText = countOfflinePayloadChars(m.payload) + '字';
                const headText = document.createElement('span');
                headText.className = 'offline-novel-head-text';
                headText.textContent = [time, location, charCountText].filter(Boolean).join(' · ') || formatDateTime(m.timestamp);
                head.appendChild(headText);
                if (session && session.id && m.id) {
                    const editBtn = document.createElement('button');
                    editBtn.type = 'button';
                    editBtn.className = 'offline-novel-edit-btn';
                    editBtn.setAttribute('aria-label', '编辑段落');
                    editBtn.title = '编辑或删除段落';
                    editBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20.25V16.75L15.6 5.15C16 4.75 16.63 4.75 17.03 5.15L18.85 6.97C19.25 7.37 19.25 8 18.85 8.4L7.25 20H4.75C4.34 20 4 20.34 4 20.75V20.25Z"></path><path d="M13.47 7.28L16.72 10.53"></path></svg>';
                    editBtn.addEventListener('click', function (e) {
                        if (e) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                        openOfflineParagraphEditor(session.id, m.id);
                    });
                    head.appendChild(editBtn);
                }

                const parasWrap = document.createElement('div');
                parasWrap.className = 'offline-novel-paragraphs';
                const paragraphComments = commentsEnabled && Array.isArray(m.payload.comments) ? m.payload.comments : [];
                const rawPendingAnchorIndexes = Array.isArray(m.payload.pendingAnchorIndexes) ? m.payload.pendingAnchorIndexes : [];
                const rawCommentTargets = Array.isArray(m.payload.commentTargets) ? m.payload.commentTargets : [];
                const commentTargets = commentsEnabled ? (rawCommentTargets.length ? rawCommentTargets : buildOfflineCommentTargets(m.payload)) : [];
                const pendingAnchorIndexes = commentsEnabled ? (rawPendingAnchorIndexes.length ? rawPendingAnchorIndexes : commentTargets.map(function (item) { return item.anchorIndex; })) : [];
                const commentStatus = String(m.payload.commentStatus || '').trim();

                m.payload.content.forEach(p => {
                    const txt = String(p || '').trim();
                    if (!txt) return;
                    const paraIndex = parasWrap.children.length;
                    const block = document.createElement('div');
                    block.style.cssText = 'margin-bottom:14px; position:relative;';

                    const el = document.createElement('p');
                    el.innerHTML = buildOfflineParagraphHtml(txt);
                    block.appendChild(el);

                    const related = paragraphComments.filter(function (item) {
                        return item && item.anchorIndex === paraIndex;
                    });
                    const shouldShowPending = commentStatus === 'pending' && pendingAnchorIndexes.includes(paraIndex);
                    const shouldShowError = (commentStatus === 'error' || commentStatus === 'partial') && pendingAnchorIndexes.includes(paraIndex);
                    const shouldShowTarget = commentTargets.some(function (item) { return item && item.anchorIndex === paraIndex; });
                    if (commentsEnabled && (related.length || shouldShowPending || shouldShowError || shouldShowTarget)) {
                        const trigger = document.createElement('button');
                        trigger.type = 'button';
                        trigger.className = 'offline-para-comment-trigger';

                        const line = document.createElement('div');
                        line.className = 'offline-para-comment-line';

                        const badge = document.createElement('div');
                        badge.className = 'offline-para-comment-badge';
                        let badgeText = '段评';
                        if (shouldShowPending) badgeText = '生成中...';
                        else if (shouldShowError) badgeText = '段评失败';
                        else if (related.length) badgeText = related.length + ' 条段评';

                        badge.textContent = badgeText;

                        trigger.appendChild(line);
                        trigger.appendChild(badge);
                        trigger.addEventListener('click', function (e) {
                            if (e) { e.stopPropagation(); e.preventDefault(); }
                            const latestSession = getOfflineSessionById(getOfflineState().currentSessionId);
                            const latestMsg = latestSession && Array.isArray(latestSession.messages) ? latestSession.messages.find(x => x.id === m.id) : m;
                            const latestComments = latestMsg && latestMsg.payload && Array.isArray(latestMsg.payload.comments) ? latestMsg.payload.comments : [];
                            
                            // 这里需要做数据转换，因为 API 返回的 comments 是扁平的数组，里面带着 anchorIndex
                            // 而 openOfflineCommentSheet 期望的数据结构是 [{ quote: '...', comments: ['line1', 'line2'] }] 这种 blocks 格式
                            const targetComments = latestComments.filter(function (item) {
                                return item && item.anchorIndex === paraIndex;
                            });
                            
                            const currentStatus = latestMsg && latestMsg.payload ? String(latestMsg.payload.commentStatus || '').trim() : commentStatus;
                            const displayStatus = targetComments.length ? 'done' : (currentStatus === 'pending' ? 'pending' : 'error');
                            openOfflineCommentSheet(targetComments, {
                                sessionId: getOfflineState().currentSessionId,
                                messageId: String(m.id || ''),
                                anchorIndex: paraIndex,
                                status: displayStatus,
                                quote: txt
                            });
                        });
                        block.appendChild(trigger);
                    }

                    parasWrap.appendChild(block);
                });

                entry.appendChild(head);
                entry.appendChild(parasWrap);
                box.appendChild(entry);
                return;
            }

            const entry = document.createElement('div');
            entry.className = 'offline-novel-entry';
            const head = document.createElement('div');
            head.className = 'offline-novel-head';
            head.textContent = formatDateTime(m.timestamp);
            const parasWrap = document.createElement('div');
            parasWrap.className = 'offline-novel-paragraphs';
            const el = document.createElement('p');
            el.innerHTML = buildOfflineParagraphHtml(String(m.content || m.raw || ''));
            parasWrap.appendChild(el);
            entry.appendChild(head);
            entry.appendChild(parasWrap);
            box.appendChild(entry);
        });

        syncOfflinePendingUi(session);
        try {
            const body = document.querySelector('#offline-mode-overlay .offline-body');
            if (body) body.scrollTop = body.scrollHeight;
        } catch (e) { }
        reopenOfflineCommentSheetIfNeeded();
    }

    function renderArchiveList() {
        const listEl = getArchiveListEl();
        if (!listEl) return;
        const roleId = window.currentChatRole || '';
        const sessions = loadOfflineSessions().filter(s => s && String(s.roleId || '') === String(roleId));
        if (!sessions.length) {
            listEl.innerHTML = `<div style="padding:18px; color:#666; font-size:14px;">暂无长叙事存档</div>`;
            return;
        }
        listEl.innerHTML = '';
        sessions.forEach(s => {
            if (!s || !s.id) return;
            const item = document.createElement('div');
            item.className = 'offline-archive-item';
            item.style.position = 'relative';

            const profile = (window.charProfiles && s.roleId && window.charProfiles[s.roleId]) || {};
            const roleName = (profile && (profile.remark || profile.nickName)) ? String(profile.remark || profile.nickName) : (s.roleId || 'TA');
            const titleText = String(s.plotName || '').trim() || roleName;

            const title = document.createElement('div');
            title.style.cssText = 'font-size:15px; font-weight:900; color:#111; margin-bottom:6px;';
            title.textContent = titleText;

            const meta = document.createElement('div');
            meta.className = 'offline-archive-meta';
            meta.textContent = `${formatDateTime(s.updatedAt || s.createdAt)} · ${roleName}`;

            const summary = document.createElement('div');
            summary.className = 'offline-archive-summary';
            summary.textContent = String(s.summary || '（无摘要）');

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.textContent = '删除';
            delBtn.style.cssText = 'position:absolute; top:10px; right:10px; border:none; background:rgba(255,59,48,0.10); color:#ff3b30; font-weight:900; border-radius:10px; padding:6px 10px; cursor:pointer;';
            delBtn.addEventListener('click', function (e) {
                if (e) e.stopPropagation();
                const ok = confirm('确定删除这个长叙事存档吗？(不可恢复)');
                if (!ok) return;
                removeOfflineSessionById(s.id);
                renderArchiveList();
            });

            item.appendChild(title);
            item.appendChild(meta);
            item.appendChild(summary);
            item.appendChild(delBtn);
            item.onclick = function () {
                closeOfflineArchiveModal();
                openOfflineSession(s.id);
            };
            listEl.appendChild(item);
        });
    }

    function showChatView() {
        const chatView = getChatViewEl();
        if (chatView) chatView.style.display = 'block';
    }

    function hideChatView() {
        const chatView = getChatViewEl();
        if (chatView) chatView.style.display = 'none';
    }

    function showOfflineOverlay() {
        const overlay = getOverlayEl();
        if (overlay) overlay.style.display = 'flex';
    }

    function hideOfflineOverlay() {
        const overlay = getOverlayEl();
        if (overlay) overlay.style.display = 'none';
        applyOfflineCustomCss('');
    }

    async function openOfflineModeConfirm() {
        if (typeof window.flushSaveDataImmediately === 'function') {
            try {
                await window.flushSaveDataImmediately();
            } catch (e) {
                console.warn('[OfflineMode] 打开前刷新聊天存储失败', e);
            }
        }
        const modal = getConfirmModalEl();
        if (modal) modal.style.display = 'flex';
    }

    function closeOfflineConfirmModal() {
        const modal = getConfirmModalEl();
        if (modal) modal.style.display = 'none';
    }

    function openSetupModal(mode, session) {
        const setup = getSetupModalEl();
        if (!setup) return;
        ensureWorldBookOptions();
        applyOfflineSetupForm(session || {}, mode === 'settings' ? 'settings' : 'setup');
        setup.style.display = 'flex';
    }

    function closeSetupModal() {
        const setup = getSetupModalEl();
        if (setup) setup.style.display = 'none';
    }

    function openOfflineArchiveModal() {
        const modal = getArchiveModalEl();
        if (modal) modal.style.display = 'flex';
        renderArchiveList();
    }

    function closeOfflineArchiveModal() {
        const modal = getArchiveModalEl();
        if (modal) modal.style.display = 'none';
    }

    function getOfflineState() {
        if (!window.__offlineModeState) {
            window.__offlineModeState = {
                active: false,
                currentSessionId: '',
                aiInFlight: false,
                commentSheet: null
            };
        }
        return window.__offlineModeState;
    }

    function setAiInFlight(inFlight) {
        const state = getOfflineState();
        state.aiInFlight = !!inFlight;
        const btn = getSendBtnEl();
        if (btn) btn.disabled = !!inFlight;
        syncOfflineRewindButtonState();
    }

    function ensureWorldBookOptions() {
        const container = document.getElementById('offline-worldbook-container');
        if (!container) return;
        if (typeof window.getWorldBookCheckboxListHTML === 'function') {
            container.innerHTML = window.getWorldBookCheckboxListHTML([]);
            if (typeof window.bindWorldBookCheckboxList === 'function') {
                window.bindWorldBookCheckboxList(container);
            }
        } else {
            container.innerHTML = `<div style="color:#999; font-size:13px;">未加载世界书组件</div>`;
        }
    }

    function ensureSetupBindings() {
        const radios = Array.from(document.querySelectorAll('input[name="offline-plot-mode"]'));
        radios.forEach(r => {
            if (!r || r._offlineBound) return;
            r._offlineBound = true;
            r.addEventListener('change', refreshOfflinePlotModeUI);
        });
        refreshOfflinePlotModeUI();

        const setupMask = getSetupModalEl();
        if (setupMask && !setupMask._offlineMaskBound) {
            setupMask._offlineMaskBound = true;
            setupMask.addEventListener('click', function (e) {
                if (e && e.target === setupMask) {
                    closeSetupModal();
                }
            });
        }

        const setupCloseBtn = document.getElementById('offline-setup-close-btn');
        if (setupCloseBtn && !setupCloseBtn._offlineBound) {
            setupCloseBtn._offlineBound = true;
            setupCloseBtn.addEventListener('click', function () {
                closeSetupModal();
            });
        }

        const minusBtn = document.getElementById('offline-fontsize-decrease');
        if (minusBtn && !minusBtn._offlineBound) {
            minusBtn._offlineBound = true;
            minusBtn.addEventListener('click', function () {
                const valueEl = document.getElementById('offline-fontsize-value');
                const current = valueEl ? Number(valueEl.getAttribute('data-font-size') || valueEl.textContent || DEFAULT_OFFLINE_READER_SETTINGS.fontSize) : DEFAULT_OFFLINE_READER_SETTINGS.fontSize;
                syncOfflineFontSizeValue(clampNumber(current - 1, 14, 34, DEFAULT_OFFLINE_READER_SETTINGS.fontSize));
            });
        }

        const plusBtn = document.getElementById('offline-fontsize-increase');
        if (plusBtn && !plusBtn._offlineBound) {
            plusBtn._offlineBound = true;
            plusBtn.addEventListener('click', function () {
                const valueEl = document.getElementById('offline-fontsize-value');
                const current = valueEl ? Number(valueEl.getAttribute('data-font-size') || valueEl.textContent || DEFAULT_OFFLINE_READER_SETTINGS.fontSize) : DEFAULT_OFFLINE_READER_SETTINGS.fontSize;
                syncOfflineFontSizeValue(clampNumber(current + 1, 14, 34, DEFAULT_OFFLINE_READER_SETTINGS.fontSize));
            });
        }

        [
            { id: 'offline-color-theme-row', attr: 'data-offline-color' },
            { id: 'offline-background-theme-row', attr: 'data-offline-bg' },
            { id: 'offline-ai-initiate-row', attr: 'data-offline-ai-initiate' },
            { id: 'offline-comments-row', attr: 'data-offline-comments' },
            { id: 'offline-perspective-row', attr: 'data-offline-perspective' },
            { id: 'offline-summary-auto-row', attr: 'data-offline-summary-auto' }
        ].forEach(function (cfg) {
            const root = document.getElementById(cfg.id);
            if (!root || root._offlineBound) return;
            root._offlineBound = true;
            root.addEventListener('click', function (e) {
                const target = e && e.target ? e.target.closest('[' + cfg.attr + ']') : null;
                if (!target) return;
                if (target.disabled) return;
                setOfflineChoiceSelection(cfg.id, cfg.attr, target.getAttribute(cfg.attr));
            });
        });

        const customBgUpload = document.getElementById('offline-custom-bg-upload');
        if (customBgUpload && !customBgUpload._offlineBound) {
            customBgUpload._offlineBound = true;
            customBgUpload.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const base64 = evt.target.result;
                    customBgUpload.dataset.base64 = base64;
                    const customSliders = document.getElementById('offline-custom-sliders');
                    if (customSliders) customSliders.style.display = 'block';
                };
                reader.readAsDataURL(file);
            });
        }

        const customBgBlurSlider = document.getElementById('offline-bg-blur-slider');
        if (customBgBlurSlider && !customBgBlurSlider._offlineBound) {
            customBgBlurSlider._offlineBound = true;
            customBgBlurSlider.addEventListener('input', function(e) {
                const valEl = document.getElementById('offline-bg-blur-val');
                if (valEl) valEl.textContent = e.target.value;
            });
        }

        const customCardOpacitySlider = document.getElementById('offline-card-opacity-slider');
        if (customCardOpacitySlider && !customCardOpacitySlider._offlineBound) {
            customCardOpacitySlider._offlineBound = true;
            customCardOpacitySlider.addEventListener('input', function(e) {
                const valEl = document.getElementById('offline-card-opacity-val');
                if (valEl) valEl.textContent = e.target.value;
            });
        }

        const manualSummaryBtn = document.getElementById('offline-summary-manual-btn');
        if (manualSummaryBtn && !manualSummaryBtn._offlineBound) {
            manualSummaryBtn._offlineBound = true;
            manualSummaryBtn.addEventListener('click', function () {
                requestOfflineManualSummary();
            });
        }
    }

    function ensureOverlayBindings() {
        const exitBtn = document.getElementById('offline-exit-btn');
        if (exitBtn && !exitBtn._offlineBound) {
            exitBtn._offlineBound = true;
            exitBtn.addEventListener('click', function () {
                exitOfflineMode({
                    destination: 'list',
                    autoResume: true
                });
            });
        }

        const closeBtn = document.getElementById('offline-close-btn');
        if (closeBtn && !closeBtn._offlineBound) {
            closeBtn._offlineBound = true;
            closeBtn.addEventListener('click', function () {
                exitOfflineMode({
                    destination: 'chat',
                    promptName: true,
                    autoResume: false
                });
            });
        }

        const settingsBtn = getOfflineSettingsBtnEl();
        if (settingsBtn && !settingsBtn._offlineBound) {
            settingsBtn._offlineBound = true;
            settingsBtn.addEventListener('click', function () {
                const session = getCurrentOfflineSession();
                const roleId = String(window.currentChatRole || '').trim();
                const prefs = loadOfflineReaderPrefs();
                openSetupModal('settings', session || {
                    roleId: roleId,
                    worldbookId: getRoleNovelDefaultWorldbookIds(roleId),
                    lengthSettings: prefs.lengthSettings,
                    readerSettings: prefs.readerSettings,
                    novelSettings: prefs.novelSettings,
                    plotMode: 'read_memory'
                });
            });
        }

        const sendBtn = document.getElementById('offline-send-btn');
        if (sendBtn && !sendBtn._offlineBound) {
            sendBtn._offlineBound = true;
            sendBtn.addEventListener('click', function () {
                offlineSendFromInput();
            });
        }

        const rewindBtn = getRewindBtnEl();
        if (rewindBtn && !rewindBtn._offlineBound) {
            rewindBtn._offlineBound = true;
            rewindBtn.addEventListener('click', function () {
                openOfflineRewindModal();
            });
        }

        const input = getInputEl();
        if (input && !input._offlineBound) {
            input._offlineBound = true;
            input.addEventListener('keydown', function (e) {
                if (!e) return;
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    offlineSendFromInput();
                }
            });
            input.addEventListener('input', function () {
                syncOfflineInputHeight();
            });
        }

        const startBtn = document.getElementById('offline-start-btn');
        if (startBtn && !startBtn._offlineBound) {
            startBtn._offlineBound = true;
            startBtn.addEventListener('click', function () {
                const setupMask = getSetupModalEl();
                const mode = setupMask ? String(setupMask.getAttribute('data-offline-modal-mode') || 'setup') : 'setup';
                if (mode === 'settings') {
                    saveOfflineSettingsFromModal();
                } else {
                    startNewOfflineSession();
                }
            });
        }

        const commentMask = getOfflineCommentSheetMaskEl();
        if (commentMask && !commentMask._offlineBound) {
            commentMask._offlineBound = true;
            commentMask.addEventListener('click', function (e) {
                if (e && e.target === commentMask) closeOfflineCommentSheet();
            });
        }

        const commentClose = getOfflineCommentSheetCloseEl();
        if (commentClose && !commentClose._offlineBound) {
            commentClose._offlineBound = true;
            commentClose.addEventListener('click', function () {
                closeOfflineCommentSheet();
            });
        }

        const rewindModal = getOfflineRewindModalEl();
        if (rewindModal && !rewindModal._offlineBound) {
            rewindModal._offlineBound = true;
            rewindModal.addEventListener('click', function (e) {
                if (e && e.target === rewindModal) closeOfflineRewindModal();
            });
        }

        const rewindCancelBtn = getOfflineRewindCancelBtnEl();
        if (rewindCancelBtn && !rewindCancelBtn._offlineBound) {
            rewindCancelBtn._offlineBound = true;
            rewindCancelBtn.addEventListener('click', function () {
                closeOfflineRewindModal();
            });
        }

        const rewindConfirmBtn = getOfflineRewindConfirmBtnEl();
        if (rewindConfirmBtn && !rewindConfirmBtn._offlineBound) {
            rewindConfirmBtn._offlineBound = true;
            rewindConfirmBtn.addEventListener('click', function () {
                rewindOfflineLatestTurn();
            });
        }
    }

    function saveOfflineSettingsFromModal() {
        const session = getCurrentOfflineSession();
        const formState = getOfflineSetupFormState();
        const savedPrefs = saveOfflineReaderPrefs({
            lengthSettings: formState.lengthSettings,
            readerSettings: formState.readerSettings,
            novelSettings: formState.novelSettings
        });
        applyOfflineReaderSettings(savedPrefs.readerSettings);
        if (!session) {
            closeSetupModal();
            renderOfflineSummaryPanel(null);
            return;
        }
        session.worldbookId = formState.worldbookId;
        session.lengthSettings = savedPrefs.lengthSettings;
        session.readerSettings = savedPrefs.readerSettings;
        session.novelSettings = savedPrefs.novelSettings;
        if (!offlineCommentsEnabled(session)) closeOfflineCommentSheet();
        if (session.plotMode === 'new_plot') {
            session.newPlotSetting = formState.newPlotSetting;
        }
        session.updatedAt = Date.now();
        upsertOfflineSession(session);
        renderOfflineHistory(session);
        renderOfflineMemoryPreview(session);
        renderOfflineSummaryPanel(session);
        closeSetupModal();
    }

    function openOfflineOverlayForNewSession() {
        const state = getOfflineState();
        const prefs = loadOfflineReaderPrefs();
        const roleId = String(window.currentChatRole || '').trim();
        const defaultWorldbookIds = getRoleNovelDefaultWorldbookIds(roleId);
        state.active = true;
        state.currentSessionId = '';
        hideChatView();
        showOfflineOverlay();
        applyOfflineReaderSettings(prefs.readerSettings);
        ensureWorldBookOptions();
        ensureSetupBindings();
        ensureOverlayBindings();
        closeOfflineParagraphEditor();
        closeOfflineArchiveModal();
        closeOfflineRewindModal();
        renderOfflineMemoryPreview({ plotMode: 'read_memory', sourceChatRecords: [] });
        renderOfflineHistory({ messages: [] });
        renderOfflineSummaryPanel(null);
        openSetupModal('setup', {
            roleId: roleId,
            plotMode: 'read_memory',
            worldbookId: defaultWorldbookIds,
            lengthSettings: prefs.lengthSettings,
            readerSettings: prefs.readerSettings,
            novelSettings: prefs.novelSettings
        });
        setAiInFlight(false);
        try {
            const input = getInputEl();
            if (input) {
                input.value = '';
                syncOfflineInputHeight();
            }
        } catch (e) { }
        syncOfflineRewindButtonState(null);
    }

    function confirmEnterOfflineMode() {
        closeOfflineConfirmModal();
        openOfflineOverlayForNewSession();
    }

    function showOfflineMemoryToast(text) {
        try {
            if (typeof window.showCenterToast === 'function') {
                window.showCenterToast(text);
                return;
            }
        } catch (e) { }
        try { console.log('[OfflineMemory]', text); } catch (e2) { }
    }

    function getOfflineMemoryMessageText(msg) {
        if (!msg) return '';
        let text = '';
        if (msg.type === 'long_text' && msg.payload && Array.isArray(msg.payload.content)) {
            const time = String(msg.payload.time || '').trim();
            const location = String(msg.payload.location || '').trim();
            const meta = [time, location].filter(Boolean).join('，');
            const content = msg.payload.content.map(function (part) {
                return String(part || '').trim();
            }).filter(Boolean).join('\n');
            text = meta ? `（${meta}）${content}` : content;
        } else {
            text = String(msg.content || msg.raw || '').trim();
        }
        text = stripOfflineHiddenThoughtText(sanitizePlainText(text));
        return text.replace(/\s+/g, ' ').trim();
    }

    function buildOfflineMemoryTranscript(session) {
        const roleId = session && session.roleId ? session.roleId : window.currentChatRole;
        const userName = getOfflineUserDisplayName(roleId);
        const roleName = getOfflineRoleDisplayName(roleId);
        const msgs = Array.isArray(session && session.messages) ? session.messages : [];
        return msgs.map(function (msg) {
            if (!msg || (msg.role !== 'me' && msg.role !== 'ai')) return '';
            const text = getOfflineMemoryMessageText(msg);
            if (!text) return '';
            const who = msg.role === 'me' ? userName : roleName;
            return `${who}：${text}`;
        }).filter(Boolean).join('\n');
    }

    function buildOfflineMemoryInjectPrompt(session) {
        const roleId = session && session.roleId ? session.roleId : window.currentChatRole;
        const userName = getOfflineUserDisplayName(roleId);
        const roleName = getOfflineRoleDisplayName(roleId);
        const plotName = String(session && session.plotName ? session.plotName : '').trim();
        return [
            '你是“我们记忆”的整理器。请把一段长叙事剧情总结成可写入线上记忆的事件条目。',
            `用户当前名字：${userName}`,
            `角色名字：${roleName}`,
            plotName ? `剧情存档名：${plotName}` : '',
            `整理时间：${formatDateTime(Date.now())}`,
            '',
            '只保留真实发生过、角色回到线上后应该记得的内容：地点、行动、承诺、冲突、关系变化、情绪余温。',
            '不要写思维链、推理过程、隐藏内心、系统提示、模型视角，也不要复述长篇原文。',
            `不要使用“用户”“AI”这种代称；需要称呼双方时，用“${userName}”“${roleName}”或“我们”。`,
            '输出 1 到 3 行中文短句，每行就是一条可直接存入记忆的内容。',
            '不要编号，不要 JSON，不要 Markdown，不要解释。'
        ].filter(Boolean).join('\n');
    }

    function normalizeOfflineMemoryLines(text) {
        let raw = stripMarkdownCodeFences(String(text || '').trim());
        const parsed = safeParseJSON(raw);
        if (Array.isArray(parsed)) {
            raw = parsed.map(function (item) {
                if (item && typeof item === 'object') return item.content || item.text || item.memory || '';
                return item;
            }).filter(Boolean).join('\n');
        } else if (parsed && typeof parsed === 'object') {
            const list = Array.isArray(parsed.events) ? parsed.events
                : (Array.isArray(parsed.memories) ? parsed.memories
                    : (Array.isArray(parsed.items) ? parsed.items : []));
            raw = list.map(function (item) {
                if (item && typeof item === 'object') return item.content || item.text || item.memory || '';
                return item;
            }).filter(Boolean).join('\n');
        }
        raw = stripOfflineHiddenThoughtText(raw);
        const banned = /(?:思维链|思考链|内心独白|推理过程|analysis|reasoning|system prompt|系统提示)/i;
        const seen = new Set();
        return String(raw || '')
            .split(/\n+/)
            .map(function (line) {
                return stripOfflineHiddenThoughtText(line)
                    .replace(/^\s*(?:[-*•·]|\d+[.、)]|[一二三四五六七八九十]+[、.])\s*/, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            })
            .filter(function (line) {
                if (!line || banned.test(line)) return false;
                if (/^(?:无|没有|暂无|不需要|无法总结)/.test(line)) return false;
                const key = line.replace(/[，,。.!！？?；;：:、"“”'‘’（）()【】\[\]<>《》\s]/g, '');
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .map(function (line) { return capText(line, 110); })
            .slice(0, 3);
    }

    function addOfflineMemoryArchiveEntriesFallback(roleId, lines, session) {
        const rid = String(roleId || window.currentChatRole || '').trim();
        const clean = (Array.isArray(lines) ? lines : []).map(function (line) {
            return String(line || '').replace(/\s+/g, ' ').trim();
        }).filter(Boolean);
        if (!rid || !clean.length) return 0;
        try {
            const key = 'wechat_memory_archive_v1';
            const rawStore = localStorage.getItem(key);
            const store = rawStore ? (safeParseJSON(rawStore) || {}) : {};
            const archive = store[rid] && typeof store[rid] === 'object' ? store[rid] : {};
            const now = Date.now();
            const startAt = Number(session && session.createdAt) || now;
            const entries = Array.isArray(archive.entries) ? archive.entries : [];
            if (!entries.length && archive.eventsText) {
                String(archive.eventsText || '').split('\n').map(function (line) {
                    return String(line || '').replace(/^[-•\s]+/, '').trim();
                }).filter(Boolean).forEach(function (content) {
                    entries.push({
                        id: 'mem_' + now.toString(36) + '_' + Math.random().toString(36).slice(2, 10),
                        category: 'events',
                        kind: 'event',
                        content: content,
                        source: 'migrated',
                        createdAt: now,
                        updatedAt: now,
                        happenedAt: now,
                        startAt: now,
                        endAt: now,
                        lastMentionedAt: now,
                        lastConfirmedAt: now,
                        importance: 0.8,
                        confidence: 0.68,
                        evidenceCount: 1
                    });
                });
            }
            const seen = new Set(entries.map(function (entry) {
                return String(entry && entry.category || '') + '::' + String(entry && entry.content || '').trim();
            }));
            let added = 0;
            clean.forEach(function (content) {
                const dedupKey = 'events::' + content;
                if (seen.has(dedupKey)) return;
                seen.add(dedupKey);
                added += 1;
                entries.push({
                    id: 'mem_' + now.toString(36) + '_' + Math.random().toString(36).slice(2, 10),
                    category: 'events',
                    kind: 'event',
                    content: content,
                    source: 'auto',
                    createdAt: now,
                    updatedAt: now,
                    happenedAt: now,
                    startAt: startAt,
                    endAt: now,
                    lastMentionedAt: now,
                    lastConfirmedAt: now,
                    importance: 0.84,
                    confidence: 0.78,
                    evidenceCount: 1
                });
            });
            if (!added) return 0;
            archive.entries = entries;
            archive.eventsText = entries.filter(function (entry) {
                return entry && entry.category === 'events' && entry.content;
            }).map(function (entry) {
                return '- ' + String(entry.content || '').trim();
            }).filter(Boolean).join('\n');
            archive.likesText = String(archive.likesText || '');
            archive.habitsText = String(archive.habitsText || '');
            archive.meta = archive.meta && typeof archive.meta === 'object' ? archive.meta : {};
            archive.meta.schemaVersion = 3;
            archive.meta.updatedAt = now;
            store[rid] = archive;
            const json = JSON.stringify(store);
            localStorage.setItem(key, json);
            try { localStorage.setItem('ai_memory_archives', json); } catch (e2) { }
            window.memoryArchiveStore = store;
            return added;
        } catch (e) {
            console.warn('[OfflineMemory] fallback archive write failed', e);
            return 0;
        }
    }

    function injectOfflineMemoryLinesToArchive(roleId, lines, session) {
        const clean = (Array.isArray(lines) ? lines : []).map(function (line) {
            return String(line || '').replace(/\s+/g, ' ').trim();
        }).filter(Boolean);
        if (!clean.length) return 0;
        const now = Date.now();
        const startAt = Number(session && session.createdAt) || now;
        const entries = clean.map(function (content) {
            return {
                category: 'events',
                content: content,
                source: 'auto',
                kind: 'event',
                segmentStartTs: startAt,
                segmentEndTs: now,
                happenedAt: now,
                startAt: startAt,
                endAt: now,
                importance: 0.84,
                confidence: 0.78,
                evidenceCount: 1
            };
        });
        try {
            if (typeof window.addMemoryArchiveEntries === 'function') {
                return window.addMemoryArchiveEntries(roleId, entries, { category: 'events', source: 'auto' }) || 0;
            }
        } catch (e) {
            console.warn('[OfflineMemory] archive API write failed', e);
        }
        return addOfflineMemoryArchiveEntriesFallback(roleId, clean, session);
    }

    async function injectOfflineSessionToOnlineMemory(session) {
        const roleId = session && session.roleId ? session.roleId : window.currentChatRole;
        const transcript = buildOfflineMemoryTranscript(session);
        if (!transcript.trim()) throw new Error('这段长叙事没有可总结的内容');
        const text = await callNovelApiDirect({
            roleId: roleId,
            systemPrompt: buildOfflineMemoryInjectPrompt(session),
            history: [],
            userText: '请总结下面这段长叙事，并只输出可写入“我们记忆”的内容：\n\n' + capText(transcript, 6500),
            maxTokens: 900
        });
        const lines = normalizeOfflineMemoryLines(text);
        if (!lines.length) throw new Error('API 没有返回可写入的记忆条目');
        const added = injectOfflineMemoryLinesToArchive(roleId, lines, session);
        if (!added) throw new Error('记忆档案写入失败');
        return added;
    }

    function showOfflineMemoryInjectConfirm(session) {
        const msgs = Array.isArray(session && session.messages) ? session.messages : [];
        if (msgs.length <= 1 || !buildOfflineMemoryTranscript(session).trim()) {
            return Promise.resolve(false);
        }
        return new Promise(function (resolve) {
            const old = document.getElementById('offline-memory-inject-modal');
            if (old) old.remove();
            const modal = document.createElement('div');
            modal.id = 'offline-memory-inject-modal';
            modal.className = 'modal-layer';
            modal.style.cssText = 'display:flex; position:fixed; inset:0; z-index:99999; align-items:center; justify-content:center; background:rgba(0,0,0,0.42); padding:20px;';

            const card = document.createElement('div');
            card.className = 'offline-modal-card';
            card.style.cssText = 'width:min(420px, calc(100vw - 40px)); background:#fff; border-radius:8px; padding:22px; box-shadow:0 18px 54px rgba(0,0,0,0.22); color:#111;';

            const title = document.createElement('div');
            title.className = 'offline-modal-title';
            title.style.cssText = 'font-size:18px; font-weight:900; margin-bottom:10px;';
            title.textContent = '注入线上记忆？';

            const desc = document.createElement('div');
            desc.className = 'offline-modal-desc';
            desc.style.cssText = 'font-size:14px; line-height:1.7; color:#555; margin-bottom:18px;';
            desc.textContent = '是否把刚刚这段长叙事总结成“我们记忆”？注入后，角色回到线上聊天也会知道刚刚发生了什么。';

            const actions = document.createElement('div');
            actions.className = 'offline-modal-actions';
            actions.style.cssText = 'display:flex; justify-content:flex-end; gap:10px;';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'offline-btn secondary';
            cancelBtn.style.cssText = 'border:1px solid #ddd; background:#fff; color:#333; border-radius:8px; padding:10px 14px; font-weight:800; cursor:pointer;';
            cancelBtn.textContent = '暂不注入';

            const okBtn = document.createElement('button');
            okBtn.type = 'button';
            okBtn.className = 'offline-btn';
            okBtn.style.cssText = 'border:1px solid #111; background:#111; color:#fff; border-radius:8px; padding:10px 14px; font-weight:900; cursor:pointer;';
            okBtn.textContent = '注入线上记忆';

            function done(value) {
                modal.remove();
                resolve(!!value);
            }

            cancelBtn.addEventListener('click', function () { done(false); });
            okBtn.addEventListener('click', function () { done(true); });
            modal.addEventListener('click', function (e) {
                if (e && e.target === modal) done(false);
            });

            actions.appendChild(cancelBtn);
            actions.appendChild(okBtn);
            card.appendChild(title);
            card.appendChild(desc);
            card.appendChild(actions);
            modal.appendChild(card);
            document.body.appendChild(modal);
        });
    }

    function buildOfflineSessionDefaultName(session) {
        const current = session && typeof session === 'object' ? session : {};
        const existing = String(current.plotName || '').trim();
        if (existing) return existing;
        const roleName = getOfflineRoleDisplayName(current.roleId || window.currentChatRole || '');
        const timeText = formatDateTime(current.updatedAt || current.createdAt || Date.now()).replace(':', '-');
        return `${roleName} · ${timeText}`;
    }

    async function promptAndSaveOfflineSessionName(session) {
        if (!session || !session.id) return true;
        const fallbackName = buildOfflineSessionDefaultName(session);
        const input = await promptOfflineSessionName(fallbackName);
        if (input === null) return false;
        const clean = sanitizePlainText(input || '').replace(/\s+/g, ' ').trim() || fallbackName;
        session.plotName = capText(clean, 60);
        session.updatedAt = Date.now();
        upsertOfflineSession(session);
        return true;
    }

    async function exitOfflineMode(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const destination = String(opts.destination || 'chat') === 'list' ? 'list' : 'chat';
        const shouldPromptName = opts.promptName === true;
        const shouldAutoResume = opts.autoResume === true;
        let shouldAbortExit = false;
        const stateForGuard = getOfflineState();
        if (stateForGuard.exiting) return;
        stateForGuard.exiting = true;
        try {
            closeOfflineCommentSheet();
            closeOfflineParagraphEditor();
            closeOfflineRewindModal();
            const session = getCurrentOfflineSession();
            const roleId = String((session && session.roleId) || window.currentChatRole || '').trim();
            if (session && shouldPromptName && Array.isArray(session.messages) && session.messages.length > 0) {
                const named = await promptAndSaveOfflineSessionName(session);
                if (!named) {
                    shouldAbortExit = true;
                    return;
                }
            }
            if (session && Array.isArray(session.messages) && session.messages.length === 0 && !isOfflineSessionPending(session)) {
                removeOfflineSessionById(session.id);
            }
            if (session && Array.isArray(session.messages) && session.messages.length > 0) {
                session.updatedAt = Date.now();
                upsertOfflineSession(session);
            }
            if (shouldAutoResume && roleId && session && session.id) {
                rememberOfflineAutoResumeTarget(roleId, session.id);
            } else if (roleId) {
                clearOfflineAutoResumeTarget(roleId);
            }
        } catch (e) {
            console.warn('[OfflineMode] exit failed', e);
        } finally {
            const state = getOfflineState();
            state.exiting = false;
            if (shouldAbortExit) return;
            state.active = false;
            state.currentSessionId = '';
            closeSetupModal();
            closeOfflineConfirmModal();
            closeOfflineArchiveModal();
            closeOfflineRewindModal();
            hideOfflineOverlay();
            setAiInFlight(false);
            if (destination === 'list') {
                backToList();
            } else {
                showChatView();
            }
        }
    }

    function openOfflineSession(sessionId) {
        const session = getOfflineSessionById(sessionId);
        if (!session) return;
        const state = getOfflineState();
        state.active = true;
        state.currentSessionId = sessionId;
        hideChatView();
        showOfflineOverlay();
        ensureOverlayBindings();
        closeSetupModal();
        closeOfflineParagraphEditor();
        closeOfflineRewindModal();
        applyOfflineReaderSettings(session.readerSettings || loadOfflineReaderPrefs().readerSettings);
        renderOfflineMemoryPreview(session);
        renderOfflineHistory(session);
        renderOfflineSummaryPanel(session);
        syncOfflinePendingUi(session);
    }

    function maybeAutoResumeOfflineOnChatEnter(roleId) {
        const rid = String(roleId || window.currentChatRole || '').trim();
        if (!rid) return false;
        const target = getOfflineAutoResumeTarget(rid);
        if (!target) return false;
        const targetSessionId = String(target.sessionId || '').trim();
        let session = targetSessionId ? getOfflineSessionById(targetSessionId) : null;
        if (!session) {
            session = getLatestOfflineSessionByRole(rid);
        }
        if (!session || String(session.roleId || '').trim() !== rid) {
            clearOfflineAutoResumeTarget(rid);
            return false;
        }
        const currentState = getOfflineState();
        if (currentState.active && String(currentState.currentSessionId || '').trim() === String(session.id || '').trim()) {
            return true;
        }
        requestAnimationFrame(function () {
            openOfflineSession(session.id);
        });
        return true;
    }

    function getCurrentOfflineSession() {
        const state = getOfflineState();
        const id = state.currentSessionId;
        if (!id) return null;
        return getOfflineSessionById(id);
    }

    function isCurrentOfflineSession(session) {
        const state = getOfflineState();
        const currentId = String(state.currentSessionId || '').trim();
        const sessionId = String(session && session.id || '').trim();
        return !!(state.active && currentId && sessionId && currentId === sessionId);
    }

    function isOfflineSessionPending(session) {
        return !!(session && String(session.pendingReqId || '').trim());
    }

    function markOfflineSessionPending(session, reqId, userText) {
        if (!session || !reqId) return;
        session.lastReqId = reqId;
        session.pendingReqId = reqId;
        session.pendingStartedAt = Date.now();
        session.pendingUserText = sanitizePlainText(userText || '');
        session.updatedAt = Date.now();
        upsertOfflineSession(session);
    }

    function clearOfflineSessionPending(session, reqId) {
        if (!session) return false;
        const pendingReqId = String(session.pendingReqId || '').trim();
        if (!pendingReqId) return false;
        if (reqId && pendingReqId !== String(reqId || '').trim()) return false;
        session.pendingReqId = '';
        session.pendingStartedAt = 0;
        session.pendingUserText = '';
        session.updatedAt = Date.now();
        upsertOfflineSession(session);
        return true;
    }

    function updateOfflineSessionSummary(session) {
        if (!session) return;
        ensureOfflineSessionSummaryState(session);
        const msgs = Array.isArray(session.messages) ? session.messages : [];
        for (let i = msgs.length - 1; i >= 0; i--) {
            const m = msgs[i];
            if (!m || m.role !== 'ai') continue;
            if (m.type === 'long_text' && m.payload && Array.isArray(m.payload.content)) {
                session.summary = capText(m.payload.content.join(' ').replace(/\s+/g, ' ').trim(), 80);
                return;
            }
            const txt = sanitizePlainText(m.content || m.raw || '');
            if (txt) {
                session.summary = capText(txt.replace(/\s+/g, ' '), 80);
                return;
            }
        }
        session.summary = '（无摘要）';
    }

    function appendOfflineMessage(session, msg) {
        if (!session || !msg) return;
        ensureOfflineSessionSummaryState(session);
        if (!Array.isArray(session.messages)) session.messages = [];
        session.messages.push(msg);
        session.updatedAt = Date.now();
        updateOfflineSessionSummary(session);
        upsertOfflineSession(session);
        if (isCurrentOfflineSession(session)) {
            renderOfflineHistory(session);
        }
        maybeAutoGenerateOfflineSummary(session, msg);
    }

    function buildInitialUserMessage(session) {
        if (!session) return '开始。';
        if (session.plotMode === 'new_plot') {
            return `请以长叙事模式开始叙事，并给出第一段场景。`;
        }
        return `请先在脑内默读系统提供的聊天承接材料，再直接开始长叙事描写。不要复述这些材料。`;
    }

    function buildOfflineHistoryForRequest(messages, userText) {
        const history = normalizeOfflineHistoryForAI(messages);
        const cleanUserText = sanitizePlainText(userText || '');
        if (!cleanUserText || !history.length) return history;
        const last = history[history.length - 1];
        if (last && last.role === 'me' && sanitizePlainText(last.content || '') === cleanUserText) {
            return history.slice(0, -1);
        }
        return history;
    }

    function splitToParagraphs(text) {
        const cleaned = sanitizePlainText(text);
        if (!cleaned) return [];
        let parts = cleaned
            .split(/\n\s*\n+/)
            .map(s => s.replace(/\s+/g, ' ').trim())
            .filter(Boolean);
        if (parts.length >= 2) return parts;
        const sentences = (function () {
            const out = [];
            let buf = '';
            for (let i = 0; i < cleaned.length; i++) {
                const ch = cleaned[i];
                buf += ch;
                if (/[。！？!?]/.test(ch)) {
                    const s = buf.trim();
                    if (s) out.push(s);
                    buf = '';
                }
            }
            const tail = buf.trim();
            if (tail) out.push(tail);
            return out;
        })();
        if (sentences.length <= 1) return parts.length ? parts : [cleaned];
        const merged = [];
        let buf = '';
        for (let i = 0; i < sentences.length; i++) {
            const seg = sentences[i];
            if (!seg) continue;
            if ((buf + seg).length < 220) {
                buf += (buf ? '' : '') + seg;
                continue;
            }
            if (buf) merged.push(buf);
            buf = seg;
        }
        if (buf) merged.push(buf);
        return merged.length >= 2 ? merged : (parts.length ? parts : [cleaned]);
    }

    function fallbackLongTextPayloadFromRaw(raw) {
        let cleaned = sanitizePlainText(stripMarkdownCodeFences(stripThinkingTags(raw)));
        if (cleaned.includes('"type"') || cleaned.includes('"content"')) {
            cleaned = cleaned
                .replace(/^\s*\{?/g, '')
                .replace(/\}?\s*$/g, '')
                .replace(/"?(type|time|location|content)"?\s*:/g, '')
                .replace(/[\[\]\{\}]/g, ' ')
                .replace(/,\s*/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }
        const content = splitToParagraphs(cleaned);
        if (content.length === 0) return null;
        if (content.length === 1) content.push(' ');
        return { type: 'long_text', time: '', location: '', content };
    }

    function buildApiEndpoint(baseUrl) {
        let endpoint = String(baseUrl || '').trim();
        if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
        if (!endpoint.includes('/chat/completions')) {
            if (!endpoint.includes('/v1')) endpoint += '/v1';
            endpoint += '/chat/completions';
        }
        return endpoint;
    }

    function extractNovelApiResponseText(payload, rawText) {
        const src = payload && typeof payload === 'object' ? payload : null;
        const fallback = String(rawText || '').trim();
        if (!src) return fallback;

        const choice = Array.isArray(src.choices) && src.choices.length ? src.choices[0] : null;
        const msg = choice && choice.message && typeof choice.message === 'object' ? choice.message : null;

        if (msg) {
            if (typeof msg.content === 'string' && msg.content.trim()) return msg.content.trim();
            if (Array.isArray(msg.content)) {
                const merged = msg.content.map(function (item) {
                    if (!item) return '';
                    if (typeof item === 'string') return item;
                    if (typeof item.text === 'string') return item.text;
                    if (item.type === 'text' && typeof item.content === 'string') return item.content;
                    return '';
                }).filter(Boolean).join('\n');
                if (merged.trim()) return merged.trim();
            }
            if (typeof msg.reasoning_content === 'string' && msg.reasoning_content.trim()) {
                return msg.reasoning_content.trim();
            }
        }

        if (typeof src.output_text === 'string' && src.output_text.trim()) return src.output_text.trim();
        if (Array.isArray(src.output)) {
            const mergedOutput = src.output.map(function (item) {
                if (!item) return '';
                if (typeof item === 'string') return item;
                if (typeof item.content === 'string') return item.content;
                if (Array.isArray(item.content)) {
                    return item.content.map(function (block) {
                        if (!block) return '';
                        if (typeof block === 'string') return block;
                        if (typeof block.text === 'string') return block.text;
                        return '';
                    }).filter(Boolean).join('\n');
                }
                return '';
            }).filter(Boolean).join('\n');
            if (mergedOutput.trim()) return mergedOutput.trim();
        }

        return fallback;
    }

    async function callNovelApiDirect(params) {
        const roleId = params && typeof params === 'object' && params.roleId ? String(params.roleId || '') : (window.currentChatRole || '');
        const apiSettings = typeof window.getEffectiveApiSettings === 'function'
            ? window.getEffectiveApiSettings(roleId)
            : {
                baseUrl: localStorage.getItem('api_base_url') || '',
                apiKey: localStorage.getItem('user_api_key') || '',
                model: localStorage.getItem('selected_model') || 'deepseek-chat',
                temperature: parseFloat(localStorage.getItem('model_temperature')) || 0.7
            };
        const baseUrl = apiSettings.baseUrl;
        const apiKey = apiSettings.apiKey;
        const model = apiSettings.model || 'deepseek-chat';
        // 针对长叙事模式优化参数：提升温度以增加想象力和词汇丰富度
        let temperature = typeof apiSettings.temperature === 'number' ? apiSettings.temperature : (parseFloat(localStorage.getItem('model_temperature')) || 0.7);
        if (temperature < 0.8) {
            temperature = 0.9;
        }
        // 增加频率惩罚，防止长文本复读
        const frequency_penalty = 0.4;

        if (!baseUrl || !apiKey) {
            throw new Error('❌ 未配置 API。请去【设置】里填写地址和 Key。');
        }

        const endpoint = buildApiEndpoint(baseUrl);

        const systemPrompt = params && typeof params === 'object' ? String(params.systemPrompt || '') : '';
        const history = params && typeof params === 'object' && Array.isArray(params.history) ? params.history : [];
        const userText = params && typeof params === 'object' ? String(params.userText || '') : '';
        const maxTokens = params && typeof params === 'object' && params.maxTokens ? (params.maxTokens | 0) : 8192;

        const messages = [{ role: 'system', content: systemPrompt }];
        for (let i = 0; i < history.length; i++) {
            const h = history[i];
            if (!h || !h.role) continue;
            if (h.role === 'me') messages.push({ role: 'user', content: String(h.content || '') });
            else if (h.role === 'ai') messages.push({ role: 'assistant', content: String(h.content || '') });
        }
        messages.push({ role: 'user', content: userText });

        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                frequency_penalty,
                max_tokens: maxTokens,
                stream: false
            })
        });

        if (!resp.ok) {
            throw new Error(`API错误: ${resp.status}`);
        }

        const rawResponseText = String(await resp.text() || '').replace(/^\uFEFF/, '').trim();
        const data = safeParseJSON(rawResponseText);
        const extracted = extractNovelApiResponseText(data, rawResponseText);
        if (!String(extracted || '').trim()) {
            throw new Error('API 返回空内容');
        }
        return String(extracted || '').trim();
    }

    function syncOfflinePromptDebug(roleId, systemPrompt, userMessage) {
        try {
            const promptText = String(systemPrompt || '');
            if (!promptText) return;
            const rid = String(roleId || window.currentChatRole || '').trim();
            const meta = typeof detectDevAiPromptMeta === 'function'
                ? detectDevAiPromptMeta(promptText, {
                    roleId: rid,
                    hasSystemPromptMarker: true,
                    usedLegacyPromptStack: false,
                    finalLen: promptText.length,
                    systemPromptType: 'offline_novel'
                })
                : { roleId: rid, sceneCode: 'offline_novel', promptClass: 'full_chat', sceneSubtype: 'continuity_journal' };

            window.__lastOfflineNovelSystemPrompt = promptText;
            window.__lastOfflineNovelPromptByRole = window.__lastOfflineNovelPromptByRole || {};
            if (rid) window.__lastOfflineNovelPromptByRole[rid] = promptText;

            const promptTimestamp = Date.now();
            window.__lastCallAISystemPrompt = promptText;
            window.__lastCallAISystemPromptTimestamp = promptTimestamp;
            window.__lastCallAISystemPromptByRole = window.__lastCallAISystemPromptByRole || {};
            if (rid) window.__lastCallAISystemPromptByRole[rid] = promptText;
            window.__lastCallAISystemPromptTimestampByRole = window.__lastCallAISystemPromptTimestampByRole || {};
            if (rid) window.__lastCallAISystemPromptTimestampByRole[rid] = promptTimestamp;
            window.__lastCallAISystemPromptMeta = meta;

            let record = null;
            if (typeof persistDevAiPromptHistoryRecord === 'function') {
                record = persistDevAiPromptHistoryRecord({
                    roleId: rid,
                    prompt: promptText,
                    extraSystem: '',
                    meta: meta,
                    userMessage: userMessage,
                    timestamp: promptTimestamp
                });
            }

            if (typeof window.dispatchEvent === 'function') {
                try {
                    window.dispatchEvent(new CustomEvent('ai:systemPromptUpdated', {
                        detail: { roleId: rid, prompt: promptText, extraSystem: '', meta: meta, record: record }
                    }));
                } catch (e1) { }
            }

            console.groupCollapsed('[LongNovel Prompt]');
            console.log('roleId:', rid || '(none)');
            console.log('meta:', meta);
            console.log(promptText);
            console.groupEnd();
        } catch (e) {
            console.warn('[LongNovel Prompt] debug sync failed', e);
        }
    }

    window.printOfflineNovelPrompt = function (roleId) {
        const rid = String(roleId || window.currentChatRole || '').trim();
        const map = window.__lastOfflineNovelPromptByRole || {};
        const prompt = (rid && typeof map[rid] === 'string' && map[rid]) || window.__lastOfflineNovelSystemPrompt || '';
        if (!prompt) {
            console.warn('[LongNovel Prompt] 还没有可打印的长叙事 prompt，请先触发一次长叙事生成。');
            return '';
        }
        console.log(prompt);
        return prompt;
    };

    async function callOfflineAI(session, userText, opts) {
        if (!session) return;
        const userMessage = sanitizePlainText(userText);
        const reqId = 'offline_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        const baseSession = getOfflineSessionById(session.id) || session;
        markOfflineSessionPending(baseSession, reqId, userMessage);
        syncOfflinePendingUi(baseSession);
        const systemPrompt = buildOfflineSystemPrompt(baseSession);
        const history = buildOfflineHistoryForRequest(baseSession.messages, userMessage);
        syncOfflinePromptDebug(session && session.roleId, systemPrompt, userMessage);

                try {
            const text = await callNovelApiDirect({
                roleId: baseSession.roleId,
                systemPrompt,
                history,
                userText: userMessage,
                maxTokens: 8192
            });
            const cur = getOfflineSessionById(session.id);
            if (!cur || cur.lastReqId !== reqId) return;
            clearOfflineSessionPending(cur, reqId);

            let raw = String(text || '').trim();

            // --- 【小白专用：清洗斜杠逻辑开始】 ---
            // 很多AI会乱加 \" 来表达引号，我们把它替换成中文引号，这样既美观又不会弄坏 JSON
            if (raw.includes('\\"')) {
                // 把所有的 \" 替换成中文双引号 “
                raw = raw.replace(/\\"/g, '“');
            }
            // 有时候AI会抽风输出 \/ 这种斜杠，也把它清理掉
            raw = raw.replace(/\\\//g, '/');
            // --- 【清洗逻辑结束】 ---

            const payload = parseLongTextPayload(raw);

            if (payload) {
                const limits = normalizeOfflineLengthSettings(cur.lengthSettings || session.lengthSettings);
                const charCount = countOfflinePayloadChars(payload);
                if (!opts?.lengthRetried && (charCount < limits.min || charCount > limits.max)) {
                    await callOfflineAI(
                        cur,
                        `上一版字数不符合要求。请重新输出一份严格可解析的 JSON，并把正文总字数控制在 ${limits.min}-${limits.max} 字之间。少于 ${limits.min} 字就补足，超过 ${limits.max} 字就压缩，但仍要保留动作、神态、心理活动、对话。`,
                        { retried: !!opts?.retried, lengthRetried: true }
                    );
                    return;
                }
                const messageId = 'offline_msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                const commentsEnabled = offlineCommentsEnabled(cur);
                payload.commentStatus = commentsEnabled ? 'pending' : 'disabled';
                payload.comments = [];
                payload.commentTargets = commentsEnabled ? buildOfflineCommentTargets(payload) : [];
                payload.pendingAnchorIndexes = payload.commentTargets.map(function (item) { return item.anchorIndex; });
                appendOfflineMessage(cur, {
                    id: messageId,
                    role: 'ai',
                    type: 'long_text',
                    payload,
                    raw, // 这里保存的是清洗过的文本
                    timestamp: Date.now()
                });
                if (commentsEnabled) generateOfflineReaderComments(cur.id, messageId, payload);
            } else {
                // ... 剩下的逻辑保持不变
                const needRetry = !opts?.retried && raw && raw.includes('"type"') && (!raw.includes('}') || !raw.includes(']'));
                if (needRetry) {
                    await callOfflineAI(cur, '上次输出中断或JSON破损。请重新输出一份完整、可解析的JSON，且仅输出JSON。', { retried: true });
                    return;
                }
                const fallback = fallbackLongTextPayloadFromRaw(raw);
                if (fallback) {
                    const limits = normalizeOfflineLengthSettings(cur.lengthSettings || session.lengthSettings);
                    const charCount = countOfflinePayloadChars(fallback);
                    if (!opts?.lengthRetried && (charCount < limits.min || charCount > limits.max)) {
                        await callOfflineAI(
                            cur,
                            `上一版字数不符合要求。请重新输出一份严格可解析的 JSON，并把正文总字数控制在 ${limits.min}-${limits.max} 字之间。少于 ${limits.min} 字就补足，超过 ${limits.max} 字就压缩，但仍要保留动作、神态、心理活动、对话。`,
                            { retried: true, lengthRetried: true }
                        );
                        return;
                    }
                    const fallbackMessageId = 'offline_msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                    const commentsEnabled = offlineCommentsEnabled(cur);
                    fallback.commentStatus = commentsEnabled ? 'pending' : 'disabled';
                    fallback.comments = [];
                    fallback.commentTargets = commentsEnabled ? buildOfflineCommentTargets(fallback) : [];
                    fallback.pendingAnchorIndexes = fallback.commentTargets.map(function (item) { return item.anchorIndex; });
                    appendOfflineMessage(cur, {
                        id: fallbackMessageId,
                        role: 'ai',
                        type: 'long_text',
                        payload: fallback,
                        raw,
                        timestamp: Date.now()
                    });
                    if (commentsEnabled) generateOfflineReaderComments(cur.id, fallbackMessageId, fallback);
                } else {
                    appendOfflineMessage(cur, {
                        role: 'ai',
                        type: 'text',
                        content: '解析失败：请点“一键重Roll”或重发一次。',
                        raw,
                        timestamp: Date.now()
                    });
                }
            }
        } catch (e) {
            const cur = getOfflineSessionById(session.id);
            if (cur && cur.lastReqId === reqId) {
                clearOfflineSessionPending(cur, reqId);
                appendOfflineMessage(cur, {
                    role: 'ai',
                    type: 'text',
                    content: String(e && e.message ? e.message : '请求失败'),
                    timestamp: Date.now()
                });
            }
        } finally {
            const latest = getOfflineSessionById(session.id);
            if (latest && latest.lastReqId === reqId) {
                clearOfflineSessionPending(latest, reqId);
                syncOfflinePendingUi(latest);
            }
        }
    }

    async function startNewOfflineSession() {
        const roleId = window.currentChatRole;
        if (!roleId) {
            alert('请先进入一个聊天窗口，再开启长叙事模式');
            return;
        }
        if (typeof window.flushSaveDataImmediately === 'function') {
            try {
                await window.flushSaveDataImmediately();
            } catch (e) {
                console.warn('[OfflineMode] 开始前刷新聊天存储失败', e);
            }
        }
        const formState = getOfflineSetupFormState();
        const worldbookId = Array.isArray(formState.worldbookId) ? formState.worldbookId : [];
        const plotMode = String(formState.plotMode || 'read_memory');
        const savedPrefs = saveOfflineReaderPrefs({
            lengthSettings: formState.lengthSettings,
            readerSettings: formState.readerSettings,
            novelSettings: formState.novelSettings
        });

        if (plotMode === 'resume_plot') {
            const resumeSelect = document.getElementById('offline-resume-select');
            const sid = resumeSelect ? String(resumeSelect.value || '').trim() : '';
            if (!sid) {
                alert('请选择要续写的历史存档');
                return;
            }
            openOfflineSession(sid);
            return;
        }
        const newPlotSetting = String(formState.newPlotSetting || '').trim();

        if (plotMode === 'new_plot' && !newPlotSetting) {
            alert('请输入新剧情设定（时间、地点、起因）');
            return;
        }

        const now = Date.now();
        const session = {
            id: 'offline_' + now,
            roleId,
            worldbookId: worldbookId,
            plotMode: plotMode === 'new_plot' ? 'new_plot' : 'read_memory',
            newPlotSetting: plotMode === 'new_plot' ? newPlotSetting : '',
            sourceChatRecords: plotMode === 'read_memory' ? buildRecentChatRecordsForOffline(roleId, 20) : [],
            chatMemorySummary: plotMode === 'read_memory' ? buildChatHistorySummary(roleId) : '',
            lengthSettings: savedPrefs.lengthSettings,
            readerSettings: savedPrefs.readerSettings,
            novelSettings: savedPrefs.novelSettings,
            createdAt: now,
            updatedAt: now,
            summary: '',
            messages: []
        };

        upsertOfflineSession(session);
        const state = getOfflineState();
        state.currentSessionId = session.id;
        closeSetupModal();
        applyOfflineReaderSettings(session.readerSettings);
        renderOfflineMemoryPreview(session);
        renderOfflineHistory(session);

        if (getOfflineSessionNovelSettings(session).allowAiInitiate) {
            const initUserMessage = buildInitialUserMessage(session);
            callOfflineAI(session, initUserMessage);
        } else {
            try {
                const input = getInputEl();
                if (input) {
                    input.placeholder = '由你开始剧情…';
                    input.focus();
                }
            } catch (e) { }
            setAiInFlight(false);
        }
    }

    function offlineSendFromInput() {
        const state = getOfflineState();
        if (!state.active) return;
        if (state.aiInFlight) return;
        const session = getCurrentOfflineSession();
        if (!session) return;
        const input = getInputEl();
        if (!input) return;
        const text = String(input.value || '').trim();
        if (!text) return;
        if (isOfflineExitCommandText(text)) {
            input.value = '';
            syncOfflineInputHeight();
            closeOfflineRewindModal();
            try {
                if (typeof window.showCenterToast === 'function') {
                    window.showCenterToast('已结束线下，返回线上聊天');
                }
            } catch (e) { }
            exitOfflineMode();
            return;
        }
        input.value = '';
        syncOfflineInputHeight();
        closeOfflineRewindModal();
        appendOfflineMessage(session, { role: 'me', type: 'text', content: text, timestamp: Date.now() });
        callOfflineAI(session, text);
    }

    document.addEventListener('DOMContentLoaded', function () {
        ensureOverlayBindings();
        ensureSetupBindings();
        ensureWorldBookOptions();
    });

    window.openOfflineModeConfirm = openOfflineModeConfirm;
    window.closeOfflineConfirmModal = closeOfflineConfirmModal;
    window.confirmEnterOfflineMode = confirmEnterOfflineMode;
    window.openOfflineArchiveModal = openOfflineArchiveModal;
    window.closeOfflineArchiveModal = closeOfflineArchiveModal;
    window.exitOfflineMode = exitOfflineMode;
    window.openOfflineSession = openOfflineSession;
    window.maybeAutoResumeOfflineOnChatEnter = maybeAutoResumeOfflineOnChatEnter;
    window.removeOfflineSessionById = removeOfflineSessionById;
    window.persistWechatRuntimeNow = persistWechatRuntimeNow;
    window.markChatRoleAsRead = markChatRoleAsRead;
})();

// =========================================================
// 创建消息行的辅助函数（用于分批加载历史消息）
// =========================================================
function createMessageRow(msg) {
    if (!msg || msg.hidden || msg.type === 'call_memory') {
        return null;
    }

    const msgId = ensureChatMessageId(msg);

    if (
        (msg.type === 'system' || msg.type === 'system_event' || msg.role === 'system') &&
        typeof msg.content === 'string' &&
        msg.content.indexOf('[系统]') === 0 &&
        (msg.content.indexOf('一起听') !== -1 || msg.content.indexOf('歌曲切换为') !== -1)
    ) {
        return null;
    }

    // 系统消息处理
    if (msg.type === 'system_event' || msg.type === 'system') {
        return buildSystemMessageRowElement(msg, msgId);
    }

    const content = msg && msg.content !== undefined ? msg.content : "";
    const normalizeBubbleText = function (value) {
        if (value == null) return "";
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (Array.isArray(value)) {
            return value.map(normalizeBubbleText).filter(Boolean).join('\n');
        }
        if (typeof value === 'object') {
            const preferred = value.message != null
                ? value.message
                : (value.content != null ? value.content : (value.text != null ? value.text : ''));
            if (preferred && preferred !== value) {
                return normalizeBubbleText(preferred);
            }
            try {
                return JSON.stringify(value);
            } catch (e) {
                return String(value);
            }
        }
        return String(value);
    };
    let displayContent = normalizeBubbleText(content);
    
    // 检查是否是系统消息
    const isSysMsg = detectSystemMessage(msg, displayContent);
    if (isSysMsg && msg.role === 'ai') {
        return buildSystemMessageRowElement({
            role: msg.role,
            type: msg.type || 'text',
            content: displayContent,
            timestamp: msg.timestamp,
            systemEventKind: msg.systemEventKind || ''
        }, msgId);
    }

    // 准备基础数据
    const roleId = window.currentChatRole;
    const isMe = (msg.role === 'me');
    let avatarUrl = "";
    let groupSenderName = "";
    let groupSenderRoleId = "";
    let groupSenderAvatar = "";

    resolveQuoteBlockForMessage(roleId, msg);

    if (isMe) {
        const myPersona = window.userPersonas[roleId] || {};
        avatarUrl = myPersona.avatar || "assets/chushitouxiang.jpg";
    } else {
        const profile = window.charProfiles[roleId] || {};
        const groupApi = window.GroupChat;
        const isGroupChat = !!(groupApi && typeof groupApi.isGroupChatRole === 'function' && groupApi.isGroupChatRole(roleId));
        if (isGroupChat) {
            const sender = typeof groupApi.resolveGroupMessageSender === 'function'
                ? groupApi.resolveGroupMessageSender(roleId, msg)
                : null;
            groupSenderName = typeof groupApi.getSenderLabel === 'function'
                ? String(groupApi.getSenderLabel(roleId, msg) || '').trim()
                : String(msg.senderName || '').trim();
            groupSenderRoleId = String((sender && sender.roleId) || msg.senderRoleId || '').trim();
            groupSenderAvatar = String((sender && sender.avatar) || msg.senderAvatar || '').trim();
        }
        avatarUrl = groupSenderAvatar || profile.avatar || "assets/chushitouxiang.jpg";
    }

    let smallTimeStr = msg.timestamp > 0 ? formatChatTime(msg.timestamp) : "";

    // 构建气泡内容
    let bubbleHtml = "";
    
    if (msg.type === 'image' || msg.type === 'sticker') {
        const imgSrc = msg.type === 'sticker'
            ? String(msg.stickerUrl || content || '').trim()
            : String(content || '').trim();
        const extraClass = msg.type === 'sticker' ? ' custom-sticker' : '';
        bubbleHtml = `
            <div class="msg-bubble msg-bubble-image custom-bubble-content custom-image-message${extraClass}">
                <img src="${imgSrc}">
            </div>
        `;
    } else if (msg.type === 'voice') {
        const safeVoiceText = normalizeBubbleText(content).replace(/\n/g, '<br>');
        const durationSec = msg.duration || calcVoiceDurationSeconds(normalizeBubbleText(content));
        bubbleHtml = `
            <div class="msg-bubble voice-bubble custom-bubble-content">
                <div class="voice-main">
                    <div class="voice-icon">
                        <span class="voice-wave wave1"></span>
                        <span class="voice-wave wave2"></span>
                        <span class="voice-wave wave3"></span>
                    </div>
                    <div class="voice-duration">${durationSec}"</div>
                </div>
                <div class="voice-text" style="display:none;">${safeVoiceText}</div>
            </div>
        `;
    } else if (msg.type === 'location') {
        let name = '';
        let address = '';
        try {
            const obj = JSON.parse(normalizeBubbleText(content) || '{}');
            if (obj && typeof obj === 'object') {
                name = String(obj.name || '').trim();
                address = String(obj.address || '').trim();
            }
        } catch (e) { }
        const nameHtml = name ? `<div class="location-name">${name}</div>` : `<div class="location-name">位置</div>`;
        const addressHtml = address ? `<div class="location-address">${address}</div>` : '';
        bubbleHtml = `
            <div class="msg-bubble location-bubble custom-bubble-content custom-location-card">
                <div class="location-card">
                    <div class="location-map-area">
                        <i class='bx bxs-map location-pin-icon'></i>
                    </div>
                    <div class="location-info">
                        ${nameHtml}
                        ${addressHtml}
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'family_card') {
        const amount = msg.amount || "";
        const status = msg.status === 'accepted' ? 'accepted' : (msg.role === 'ai' ? 'pending' : (msg.status || 'sent'));
        const subtitle = status === 'accepted'
            ? '已领取'
            : (msg.role === 'ai' ? `额度 ¥${amount}，立即领取` : `额度 ¥${amount}`);
        bubbleHtml = `
            <div class="msg-bubble family-card-bubble custom-bubble-content" data-status="${status}">
                <div class="family-card-main">
                    <div class="family-card-icon"></div>
                    <div class="family-card-text">
                        <div class="family-card-title">送你一张亲属卡</div>
                        <div class="family-card-subtitle">${subtitle}</div>
                    </div>
                </div>
                <div class="family-card-divider"></div>
                <div class="family-card-footer">亲属卡</div>
            </div>
        `;
    } else if (msg.type === 'transfer') {
        const amount = msg.amount || "";
        const note = msg.note || "";
        const noteHtml = note ? `<div class="transfer-note">${note}</div>` : '';
        const status = msg.status || 'sent';
        let extraClass = '';
        if (status === 'accepted' || status === 'returned') {
            extraClass = ' transfer-bubble-accepted';
        }
        let footerText = '待领取';
        if (msg.role === 'me') {
            if (status === 'accepted') {
                footerText = '对方已收钱 ✓';
            }
        } else {
            if (status === 'accepted') {
                footerText = '已收钱';
            } else if (status === 'returned') {
                footerText = '已退回';
            }
        }
        bubbleHtml = `
            <div class="msg-bubble transfer-bubble custom-bubble-content custom-transfer-card${extraClass}">
                <div class="chat-transfer-card-surface">
                    <div class="transfer-main">
                        <div class="transfer-icon-circle">
                            <i class="bx bx-transfer"></i>
                        </div>
                        <div class="transfer-info">
                            <div class="transfer-amount">¥${amount}</div>
                            ${noteHtml}
                        </div>
                    </div>
                    <div class="transfer-split"></div>
                    <div class="transfer-footer">${footerText}</div>
                </div>
            </div>
        `;
    } else if (msg.type === 'redpacket') {
        const amount = msg.amount || "";
        let note = msg.note || '';
        if (!note) {
            note = '恭喜发财，大吉大利';
        }
        const status = msg.status || 'unopened';
        const isOpened = status === 'opened';
        const amountHtml = isOpened && amount ? `<div class="redpacket-amount">¥${amount}</div>` : '';
        const statusText = isOpened ? '红包已领取' : '领取红包';
        bubbleHtml = `
            <div class="msg-bubble redpacket-bubble custom-bubble-content" data-status="${status}">
                <div class="chat-redpacket-card-surface">
                    <div class="redpacket-main">
                        <div class="redpacket-icon"></div>
                        <div class="redpacket-info">
                            <div class="redpacket-note">${note}</div>
                            <div class="redpacket-status-text">${statusText}</div>
                        </div>
                        ${amountHtml}
                    </div>
                </div>
            </div>
        `;
    } else {
        const msgType = String(msg.type || 'text').trim();
        const isHtmlBubble = msg.role === 'ai' && msgType === 'html';
        const inlineStructuredCandidate = msgType === 'text' && typeof window.normalizeStructuredTranslatedCandidate === 'function'
            ? window.normalizeStructuredTranslatedCandidate(displayContent)
            : null;
        const isStructuredTranslatedBubble = msgType === 'translated_text' || (inlineStructuredCandidate && inlineStructuredCandidate.mode === 'translated_text');
        const translatedPayload = msgType === 'translated_text' && typeof window.parseTranslatedTextPayload === 'function'
            ? window.parseTranslatedTextPayload(content)
            : (inlineStructuredCandidate && inlineStructuredCandidate.mode === 'translated_text' && typeof window.parseTranslatedTextPayload === 'function'
                ? window.parseTranslatedTextPayload({
                    foreign: inlineStructuredCandidate.foreign,
                    translation: inlineStructuredCandidate.translation
                })
            : (msg.role === 'ai' && !isHtmlBubble && (
                typeof window.shouldRenderTranslatedBubble === 'function'
                    ? window.shouldRenderTranslatedBubble(window.currentChatRole || msg.roleId || '', msg)
                    : (typeof window.isAutoTranslateEnabled === 'function'
                        ? !!window.isAutoTranslateEnabled(window.currentChatRole || msg.roleId || '')
                        : (localStorage.getItem('chat_auto_translate') === 'true'))
            ) && typeof parseTranslatedBubbleText === 'function'
                ? parseTranslatedBubbleText(displayContent)
                : null));
        const bubbleTextForRender = String(translatedPayload
            ? translatedPayload.bodyText
            : (inlineStructuredCandidate && inlineStructuredCandidate.mode === 'text'
                ? inlineStructuredCandidate.text
                : displayContent) || '');
        const safeContent = isHtmlBubble
            ? (typeof sanitizeChatBubbleHtml === 'function' ? sanitizeChatBubbleHtml(bubbleTextForRender) : bubbleTextForRender)
            : (typeof escapeHtmlText === 'function'
                ? escapeHtmlText(bubbleTextForRender)
                : bubbleTextForRender.replace(/[&<>"']/g, function (ch) {
                    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] || ch;
                }));
        let quoteBlockHtml = "";
        if (msg.quote && msg.quote.text) {
            let shortQuote = String(msg.quote.text || '').replace(/\s+/g, ' ').trim();
            if (shortQuote.length > 80) shortQuote = shortQuote.substring(0, 80) + '...';
            const quoteTargetId = msg.quoteId != null ? String(msg.quoteId).trim() : '';
            const quoteIdAttr = quoteTargetId ? ` data-quote-id="${quoteTargetId}"` : '';
            quoteBlockHtml = `
                <div class="quote-block"${quoteIdAttr}>
                    <span class="quote-name">${msg.quote.name || 'TA'}:</span>
                    <span class="quote-preview">${shortQuote}</span>
                </div>
            `;
        }

        if (translatedPayload && translatedPayload.hasTranslation) {
            bubbleHtml = `
            <div class="msg-bubble custom-bubble-content translated-message-shell${msg.role === 'me' ? ' translated-message-shell-me' : ' translated-message-shell-ai'}${msg.translationCollapsed ? ' is-collapsed' : ''}">
                ${quoteBlockHtml}
                ${buildTranslatedBubbleInnerHtml(translatedPayload, {
                    baseClass: 'translated-message-bubble',
                    foreignClass: 'translated-message-foreign',
                    dividerClass: 'translated-message-divider',
                    translationClass: 'translated-message-translation'
                })}
            </div>
        `;
        } else {
            if (isHtmlBubble) {
                bubbleHtml = `
                <div class="msg-bubble custom-bubble-content">
                    ${quoteBlockHtml}
                    <div class="msg-text custom-bubble-text chat-html-bubble">${safeContent}</div>
                </div>
            `;
            } else if (msg.role === 'ai' && msgType === 'text') {
                const dataText = typeof escapeHtmlText === 'function' ? escapeHtmlText(bubbleTextForRender) : safeContent;
                bubbleHtml = `
                <div class="msg-bubble custom-bubble-content">
                    ${quoteBlockHtml}
                    <div class="msg-text custom-bubble-text" data-text="${dataText}" data-render-mode="text"></div>
                </div>
            `;
            } else {
                bubbleHtml = `
                <div class="msg-bubble custom-bubble-content">
                    ${quoteBlockHtml}
                    <div class="msg-text custom-bubble-text">${safeContent}</div>
                </div>
            `;
            }
        }
    }

    // 构建状态文字
    let statusHtml = "";
    if (isMe && msg.type !== 'call_end' && msg.type !== 'couple_invite' && msg.type !== 'couple_unlink') {
        let statusText = "已送达";
        if (msg.status === 'read') statusText = "已读";
        statusHtml = `<div class="msg-status-text">${statusText}</div>`;
    }

    // 组合最终 HTML
    const row = document.createElement('div');
    const isPlainTextMessage = !msg.type || String(msg.type || '') === 'text' || String(msg.type || '') === 'translated_text';
    row.className = isMe
        ? 'msg-row msg-right custom-bubble-container is-me' + (isPlainTextMessage ? ' msg-plain-bubble' : '')
        : 'msg-row msg-left custom-bubble-container is-other' + (isPlainTextMessage ? ' msg-plain-bubble' : '');
    if (msg.role) {
        row.setAttribute('data-role', msg.role);
    }
    if (msg.type) {
        row.setAttribute('data-type', msg.type);
    }
    if (msg.timestamp) {
        row.setAttribute('data-timestamp', String(msg.timestamp));
    }
    if (msgId) {
        row.setAttribute('data-msg-id', msgId);
    }
    if (groupSenderRoleId) {
        row.setAttribute('data-sender-role-id', groupSenderRoleId);
    }
    if (groupSenderName) {
        row.setAttribute('data-sender-name', groupSenderName);
    }

    const safeSenderName = String(groupSenderName || '').replace(/[&<>"']/g, function (ch) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] || ch;
    });
    const senderLabelHtml = (!isMe && safeSenderName)
        ? `<div class="group-sender-label">${safeSenderName}</div>`
        : '';

    const avatarHtml = `
        <div class="msg-avatar-wrap">
            <div class="msg-avatar">
                <img src="${avatarUrl}" alt="">
            </div>
            <div class="msg-avatar-time">${smallTimeStr}</div>
        </div>
    `;

    row.innerHTML = `
        ${avatarHtml}
        <div class="msg-content-wrapper">
            ${senderLabelHtml}
            ${bubbleHtml}
            ${statusHtml}
        </div>
    `;

    const bubbleEl = row.querySelector('.msg-bubble');
    if (bubbleEl && smallTimeStr) {
        const t = document.createElement('div');
        t.className = 'msg-bubble-time';
        t.textContent = smallTimeStr;
        bubbleEl.appendChild(t);
    }

    const quoteBlockEl = row.querySelector('.quote-block');
    if (quoteBlockEl && msg.quoteId) {
        quoteBlockEl.addEventListener('click', function (e) {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            if (typeof window.scrollToChatMessageById === 'function') {
                window.scrollToChatMessageById(String(msg.quoteId));
            }
        });
    }

    const translatedBubbleShell = row.querySelector('.translated-message-shell');
    if (translatedBubbleShell) {
        translatedBubbleShell.addEventListener('click', function (e) {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            const nextCollapsed = !translatedBubbleShell.classList.contains('is-collapsed');
            translatedBubbleShell.classList.toggle('is-collapsed', nextCollapsed);
            msg.translationCollapsed = nextCollapsed;
        });
    }

    if (msg.type === 'voice') {
        const voiceBubble = row.querySelector('.voice-bubble');
        if (voiceBubble) {
            const textEl = voiceBubble.querySelector('.voice-text');
            voiceBubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                if (!textEl) return;
                const visible = textEl.style.display === 'block';
                textEl.style.display = visible ? 'none' : 'block';
                voiceBubble.classList.toggle('voice-bubble-open', !visible);
            });
        }
    }

    if (msg.type === 'family_card' && msg.role === 'ai') {
        const bubble = row.querySelector('.family-card-bubble');
        if (bubble) {
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                const st = msg && typeof msg.status === 'string' ? msg.status : 'pending';
                if (st !== 'pending') return;
                openFamilyCardAcceptModal({
                    msg: msg,
                    row: row,
                    roleId: roleId
                });
            });
        }
    }

    return row;
}

