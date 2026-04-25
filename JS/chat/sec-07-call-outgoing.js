/* === [SEC-07] 语音/视频通话（用户发起） === */

function formatCallDuration(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(r).padStart(2, '0');
    return mm + ':' + ss;
}

function makeVoiceCallSessionId() {
    return 'call_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function ensureVoiceCallState() {
    const state = (window.voiceCallState && typeof window.voiceCallState === 'object') ? window.voiceCallState : {};
    if (!Array.isArray(state.history)) {
        state.history = Array.isArray(window.voiceCallHistory) ? window.voiceCallHistory : [];
    }
    window.voiceCallState = state;
    window.voiceCallHistory = state.history;
    return state;
}

function getVoiceCallHistoryList() {
    return ensureVoiceCallState().history;
}

function resetVoiceCallHistory() {
    const state = ensureVoiceCallState();
    state.history = [];
    window.voiceCallState = state;
    window.voiceCallHistory = state.history;
    return state.history;
}

function appendVoiceCallHistoryEntries(entries) {
    if (!Array.isArray(entries) || !entries.length) return;
    const state = ensureVoiceCallState();
    const list = state.history;
    entries.forEach(function (entry) {
        if (!entry || !entry.content) return;
        list.push({
            role: entry.role === 'me' ? 'me' : 'ai',
            type: entry.type || 'speech',
            content: String(entry.content).trim()
        });
    });
    window.voiceCallState = state;
    window.voiceCallHistory = list;
}

window.showCallAILoading = function (visible) {
    const wave1 = document.getElementById('call-ai-loading-wave');
    if (wave1) {
        wave1.style.display = visible ? 'flex' : 'none';
    }
    const wave2 = document.getElementById('video-call-ai-loading-wave');
    if (wave2) {
        wave2.style.display = visible ? 'flex' : 'none';
    }
};

function beginVoiceCallAIRequest(roleId) {
    const state = ensureVoiceCallState();
    state.requestToken = (state.requestToken || 0) + 1;
    window.voiceCallState = state;
    return {
        roleId: roleId,
        sessionId: state.sessionId || '',
        token: state.requestToken
    };
}

function isVoiceCallAIRequestValid(requestMeta, requireConnected) {
    if (!requestMeta) return false;
    const state = ensureVoiceCallState();
    if (!state.active) return false;
    if (state.roleId !== requestMeta.roleId) return false;
    if ((state.sessionId || '') !== (requestMeta.sessionId || '')) return false;
    if ((state.requestToken || 0) !== (requestMeta.token || 0)) return false;
    if (requireConnected && (!state.connected || !window.isVoiceCallActive)) return false;
    return true;
}

function splitVoiceCallSpeechText(text) {
    const raw = String(text || '').trim();
    if (!raw) return [];
    const normalized = raw
        .replace(/\r/g, '\n')
        .replace(/[“”"]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    if (!normalized) return [];
    if (/^\s*[\[【][\s\S]*?的消息：[\s\S]*?[「\(][\s\S]*?[」\)]\s*[\]】]\s*$/.test(normalized) || /^\s*[\[【]?[^\[\]【】\n]{1,80}?的消息：[\s\S]*?[「\(][\s\S]*?[」\)]\s*[\]】]?\s*$/.test(normalized)) {
        return [normalized];
    }
    let pieces = normalized
        .split(/\n+/)
        .map(function (line) { return line.trim(); })
        .filter(Boolean);
    if (pieces.length === 1) {
        const matched = normalized.match(/[^。！？!?；;，,]+[。！？!?；;，,]?/g);
        if (matched && matched.length > 1) {
            pieces = matched.map(function (line) { return line.trim(); }).filter(Boolean);
        }
    }
    if (pieces.length < 4) {
        const expanded = [];
        pieces.forEach(function (line) {
            const chunks = line.match(/.{1,18}(?:[，,。！？!?；;]|$)/g);
            if (chunks && chunks.length > 1) {
                chunks.forEach(function (chunk) {
                    const trimmed = chunk.trim();
                    if (trimmed) expanded.push(trimmed);
                });
            } else if (line) {
                expanded.push(line);
            }
        });
        if (expanded.length > pieces.length) {
            pieces = expanded;
        }
    }
    return pieces
        .map(function (line) {
            return String(line || '')
                .replace(/^[（(][^()（）]{2,80}[）)]\s*/, '')
                .trim();
        })
        .filter(Boolean)
        .slice(0, 7);
}

function normalizeVoiceCallDirection(text, isVideo) {
    let direction = String(text || '')
        .replace(/^[（(]\s*/, '')
        .replace(/\s*[）)]$/, '')
        .replace(/^(?:背景音|动作|描写|环境|场景|镜头|画面)\s*[:：]\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!direction) {
        direction = isVideo
            ? '她朝镜头看过来，目光停在屏幕上，神情柔下来一点。'
            : '电话那头有很轻的环境底噪，她贴着听筒开口，声音低低落下来。';
    }
    return direction;
}

function parseVoiceCallAIReply(text, isVideo) {
    let raw = String(text || '').trim();
    if (!raw) {
        return {
            direction: normalizeVoiceCallDirection('', isVideo),
            lines: []
        };
    }

    raw = raw.replace(/```(?:json)?/gi, '').replace(/```+/g, '').trim();
    raw = raw.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();

    let direction = '';
    let lines = [];

    try {
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start !== -1 && end > start) {
            const obj = JSON.parse(raw.slice(start, end + 1));
            direction = obj.direction || obj.scene || obj.background || obj.visual || obj.action || '';
            if (Array.isArray(obj.lines)) lines = obj.lines;
            else if (Array.isArray(obj.dialogue)) lines = obj.dialogue;
            else if (Array.isArray(obj.reply)) lines = obj.reply;
            else if (Array.isArray(obj.bubbles)) lines = obj.bubbles;
            else if (typeof obj.lines === 'string') lines = splitVoiceCallSpeechText(obj.lines);
            else if (typeof obj.reply === 'string') lines = splitVoiceCallSpeechText(obj.reply);
            else if (typeof obj.content === 'string') lines = splitVoiceCallSpeechText(obj.content);
        }
    } catch (e) { }

    if (!direction || !lines.length) {
        const match = raw.match(/^[（(]([^()（）]{2,120})[）)]\s*([\s\S]+)$/);
        if (match) {
            direction = direction || match[1];
            lines = lines.length ? lines : splitVoiceCallSpeechText(match[2]);
        }
    }

    if (!lines.length) {
        lines = splitVoiceCallSpeechText(raw);
    }

    direction = normalizeVoiceCallDirection(direction, isVideo);
    if (!lines.length) {
        lines = [isVideo ? '先别挂，让我再看你一会儿。' : '先别挂，让我再听你说两句。'];
    }

    return {
        direction: direction,
        lines: lines.slice(0, 7)
    };
}

function cleanVoiceCallHandshakeText(text) {
    return String(text || '')
        .replace(/```(?:json)?/gi, '')
        .replace(/```+/g, '')
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .replace(/\|+/g, '')
        .trim();
}

function stripVoiceCallHandshakeMarker(text) {
    return cleanVoiceCallHandshakeText(text)
        .replace(/^\s*(?:\[\[\s*(?:ACCEPT|REJECT)\s*\]\]|【\s*(?:ACCEPT|REJECT)\s*】|\b(?:ACCEPT|REJECT)\b)\s*[:：-]?\s*/i, '')
        .trim();
}

function parseVoiceCallHandshakeJsonDecision(text) {
    const raw = cleanVoiceCallHandshakeText(text);
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
        const obj = JSON.parse(raw.slice(start, end + 1));
        if (!obj || typeof obj !== 'object') return null;
        const decision = String(obj.decision || obj.status || obj.action || obj.result || obj.answer || '').toLowerCase();
        const rejected = obj.accept === false || obj.accepted === false || obj.reject === true || obj.rejected === true ||
            /reject|refuse|decline|busy|拒绝|不接|不能|不方便/.test(decision);
        if (rejected) {
            const reason = obj.reason || obj.message || obj.content || obj.reply || '';
            return {
                status: 'reject',
                reason: String(reason || '').trim()
            };
        }
        const accepted = obj.accept === true || obj.accepted === true || obj.reject === false || obj.rejected === false ||
            /accept|answer|connect|接听|接受|接通|同意/.test(decision);
        if (accepted || obj.direction || obj.scene || obj.background || obj.visual || obj.action || obj.lines || obj.dialogue || obj.reply || obj.content) {
            return {
                status: 'accept',
                content: raw
            };
        }
    } catch (e) { }
    return null;
}

function parseVoiceCallHandshakeResult(text, isVideo) {
    const raw = cleanVoiceCallHandshakeText(text);
    if (!raw) return { status: 'empty', reason: '', reply: null };

    const jsonDecision = parseVoiceCallHandshakeJsonDecision(raw);
    const rejectMatch = raw.match(/(?:\[\[\s*REJECT\s*\]\]|【\s*REJECT\s*】|\bREJECT\b|拒绝接听|拒绝|不接听|不方便接|不能接|没法接|现在不行|晚点|稍后)/i);
    const acceptMatch = raw.match(/(?:\[\[\s*ACCEPT\s*\]\]|【\s*ACCEPT\s*】|\bACCEPT\b|接听|接受|接通|同意接|可以接|能接)/i);
    const rejectIndex = rejectMatch ? rejectMatch.index : -1;
    const acceptIndex = acceptMatch ? acceptMatch.index : -1;

    if (rejectIndex !== -1 && (acceptIndex === -1 || rejectIndex <= acceptIndex)) {
        const reason = stripVoiceCallHandshakeMarker(raw.slice(rejectIndex + rejectMatch[0].length)) || stripVoiceCallHandshakeMarker(raw);
        return {
            status: 'reject',
            reason: reason || '太晚了，我现在不方便接语音。',
            reply: null
        };
    }

    if (acceptIndex !== -1) {
        const content = stripVoiceCallHandshakeMarker(raw.slice(acceptIndex + acceptMatch[0].length)) || stripVoiceCallHandshakeMarker(raw);
        return {
            status: 'accept',
            reason: '',
            reply: parseVoiceCallAIReply(content, isVideo)
        };
    }

    if (jsonDecision && jsonDecision.status === 'reject') {
        return {
            status: 'reject',
            reason: jsonDecision.reason || '太晚了，我现在不方便接语音。',
            reply: null
        };
    }

    if (jsonDecision && jsonDecision.status === 'accept') {
        return {
            status: 'accept',
            reason: '',
            reply: parseVoiceCallAIReply(jsonDecision.content || raw, isVideo)
        };
    }

    if (/(?:不方便|现在不行|不能接|没法接|不想接|晚点|稍后|在忙|开会|洗澡|睡了)/.test(raw)) {
        return {
            status: 'reject',
            reason: stripVoiceCallHandshakeMarker(raw) || '太晚了，我现在不方便接语音。',
            reply: null
        };
    }

    return {
        status: 'accept',
        reason: '',
        reply: parseVoiceCallAIReply(raw, isVideo)
    };
}

function buildVoiceCallHistoryEntries(payload, role) {
    const entries = [];
    const safeRole = role === 'me' ? 'me' : 'ai';
    const parsed = payload && typeof payload === 'object' ? payload : { direction: '', lines: [] };
    const direction = String(parsed.direction || '').trim();
    const lines = Array.isArray(parsed.lines) ? parsed.lines : [];
    if (direction) {
        entries.push({ role: safeRole, type: 'direction', content: direction });
    }
    lines.forEach(function (line) {
        const trimmed = String(line || '').trim();
        if (!trimmed) return;
        entries.push({ role: safeRole, type: 'speech', content: trimmed });
    });
    return entries;
}

function syncCallChatMessages() {
    const container = document.getElementById('call-chat-container');
    const videoContainer = document.getElementById('video-subtitle-container');
    if (!container && !videoContainer) return;
    const list = getVoiceCallHistoryList();
    function render(target) {
        target.innerHTML = '';
        for (let i = 0; i < list.length; i++) {
            const msg = list[i];
            if (!msg || !msg.content) continue;
            const row = document.createElement('div');
            if (msg.type === 'direction') {
                row.className = 'call-chat-row call-chat-row-direction';
                const direction = document.createElement('div');
                direction.className = 'call-chat-direction';
                direction.innerText = msg.content;
                row.appendChild(direction);
            } else {
                row.className = msg.role === 'me' ? 'call-chat-row call-chat-row-me' : 'call-chat-row call-chat-row-ai';
                const bubble = document.createElement('div');
                const parsed = typeof window.parseTranslatedBubbleText === 'function'
                    ? window.parseTranslatedBubbleText(msg.content)
                    : null;
                if (parsed && parsed.hasTranslation && typeof window.buildTranslatedBubbleInnerHtml === 'function') {
                    bubble.className = 'call-chat-bubble call-chat-bubble-translated';
                    bubble.innerHTML = window.buildTranslatedBubbleInnerHtml(parsed, {
                        baseClass: 'call-chat-bubble-translated',
                        foreignClass: 'call-chat-foreign',
                        dividerClass: 'call-chat-divider',
                        translationClass: 'call-chat-translation',
                        title: '点击收起或展开翻译'
                    });
                    if (msg.translationCollapsed) {
                        bubble.classList.add('is-collapsed');
                    }
                    bubble.addEventListener('click', function (e) {
                        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                        const nextCollapsed = !bubble.classList.contains('is-collapsed');
                        bubble.classList.toggle('is-collapsed', nextCollapsed);
                        msg.translationCollapsed = nextCollapsed;
                    });
                } else {
                    bubble.className = 'call-chat-bubble';
                    bubble.innerText = parsed ? parsed.bodyText : msg.content;
                }
                row.appendChild(bubble);
            }
            target.appendChild(row);
        }
        target.scrollTop = target.scrollHeight;
        const wrapper = target.parentElement;
        if (wrapper && wrapper.scrollHeight > wrapper.clientHeight) {
            wrapper.scrollTop = wrapper.scrollHeight;
        }
    }
    if (container) {
        render(container);
    }
    if (videoContainer) {
        render(videoContainer);
    }
}

function buildVoiceCallHandshakePrompt(roleId, isVideo) {
    const profile = window.charProfiles[roleId] || {};
    const modeText = isVideo ? '视频通话' : '语音通话';
    const acceptPayloadRule = isVideo
        ? '如果接听，必须输出：[[ACCEPT]] {"direction":"此处只写你此刻的动作+视线方向+神态表情，不要写台词，不要加括号","lines":["第1句台词","第2句台词","第3句台词","第4句台词"]}。'
        : '如果接听，必须输出：[[ACCEPT]] {"direction":"此处只写背景音+声音/语气描述，不要写看得见的动作，不要加括号","lines":["第1句台词","第2句台词","第3句台词","第4句台词"]}。';
    if (typeof window.buildRoleLitePrompt === 'function') {
        return window.buildRoleLitePrompt(isVideo ? 'video_call_handshake' : 'voice_call_handshake', roleId, {
            includeContinuity: true,
            maxSummaryLines: 10,
            sceneIntro: `当前场景是${modeText}接听判断。你需要像真实成年人一样决定接不接。`,
            taskGuidance:
                `你现在收到的是一次“${modeText}邀请”，这是独立于普通文字聊天的一次通话。\n` +
                `1. 你需要根据当前时间、你的人设（是否高冷/忙碌/黏人等）和你对用户当前的好感度、关系亲疏，决定是否接听。\n` +
                `2. 如果不方便或不想接，必须拒绝。\n` +
                `3. 如果接听，开场白必须像刚连上通话时自然说出口的话，而且要拆成 4 到 7 条短句。`,
            outputInstructions:
                `只输出一行中文，不要解释、不要代码块。\n` +
                `- 如果拒绝：格式必须是 [[REJECT]] 后面接一句自然理由。\n` +
                `- ${acceptPayloadRule}\n` +
                `- lines 数组必须是 4 到 7 条。`
        });
    }
    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【${modeText}握手协议】\n` +
        `你现在收到的是一次“${modeText}邀请”，这是独立于普通文字聊天的一次通话。\n` +
        `1. 你需要根据当前时间（是否很晚）、你的人设（是否高冷/忙碌/黏人等）和你对用户当前的好感度、关系亲疏，决定是否接听。\n` +
        `2. 如果不方便或不想接，必须拒绝。\n` +
        `3. 输出格式必须严格遵守：\n` +
        `   - 如果拒绝：只输出一行，例如：[[REJECT]] 太晚了，我要睡了。\n` +
        `   - ${acceptPayloadRule}\n` +
        `   - lines 数组必须是 4 到 7 条。\n` +
        `4. 禁止输出任何思考过程、markdown 列表、分隔线或 <thinking> 标签，只能输出上述格式的一行中文。`;

    return systemPrompt;
}

function buildVoiceCallTalkPrompt(roleId, isVideo) {
    const profile = window.charProfiles[roleId] || {};
    const directionRule = isVideo
        ? 'direction 只能写你此刻的动作、视线看向哪里、神态和表情，不要写台词，不要写背景音，不要加括号。'
        : 'direction 只能写电话那头的背景音、环境底噪，以及你开口时的声音质感/语气，不要写任何看得见的动作，不要加括号。';
    const sceneRule = isVideo
        ? '视频通话里，对方能看见你，所以 direction 要有动作、视线方向、神态和表情；但不能胡编镜头外细节。'
        : '语音通话里，对方看不见你，所以不要描写抬手、低头、看窗外这类视觉动作，重点写背景音和声音状态。';
    if (typeof window.buildFullChatPrompt === 'function') {
        return window.buildFullChatPrompt(isVideo ? 'video_call_talk' : 'voice_call_talk', roleId, {
            outputMode: 'plain_json_task',
            maxSummaryLines: 14,
            extraCurrentContext: isVideo ? '当前场景是视频通话，角色可以看到用户画面。' : '当前场景是语音通话，角色正在和用户实时说话。',
            extraTaskRules:
                `你现在处于“${isVideo ? '视频通话' : '语音通话'}中”模式。\n` +
                `- 用户每条消息在内部都会自动加上前缀：[语音通话中]，你要把它理解为正在通话而不是纯打字。\n` +
                `- 你的回复必须是一个 JSON 对象，格式如下：{"direction":"...", "lines":["...","...","...","..."]}\n` +
                `- direction 会单独显示成屏幕居中的小字描写；lines 会拆成多个气泡逐条显示。\n` +
                `- ${directionRule}\n` +
                `- lines 必须是 4 到 7 条自然短句，每条只放真正说出口的话，不要把描写塞进 lines 里。\n` +
                `- 每条 lines 都要像真实通话一样短促、连续、有来有回，不要写成长段独白。\n` +
                `- 如果用户表示要挂断、说再见或说明要去做别的事，你需要理解为对方准备结束通话，用一两句自然的话响应并收尾，不要再主动开启新的话题。` +
                `\n- ${sceneRule}`,
            sceneIntro: `当前场景是${isVideo ? '视频通话中的正式说话' : '语音通话中的正式说话'}，这是持续对话场景。`
        });
    }
    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【${isVideo ? '视频' : '语音'}通话对话模式】\n` +
        `你现在处于“${isVideo ? '视频通话' : '语音通话'}中”模式。\n` +
        `- 用户每条消息在内部都会自动加上前缀：[语音通话中]，你要把它理解为正在语音聊天而不是纯打字。\n` +
        `- 你的回复必须是一个 JSON 对象，格式固定为：{"direction":"...", "lines":["...","...","...","..."]}\n` +
        `- direction 会单独显示成屏幕居中的小字描写；lines 会拆成多个气泡逐条显示。\n` +
        `- ${directionRule}\n` +
        `- lines 必须有 4 到 7 条，每条只写真正说出口的话，不要在 lines 里夹带描写。\n` +
        `- 这些台词要像真实通话一样连续、短促、自然，宁可多句也不要一整段砸下来。\n` +
        `- 如果用户表示要挂断、说再见或说明要去做别的事，你需要理解为对方准备结束通话，用一两句自然的话响应并帮忙收尾，不要再主动开启新的话题。\n` +
        `- ${sceneRule}\n` +
        `- 禁止输出任何 markdown、列表、<thinking> 标签或多余说明，只能输出 JSON。`;

    if (isVideo) {
        systemPrompt += `\n\n【视频通话额外规则】\n` +
            `当前是视频通话，你可以看到用户的画面，你自己的背景来自你相册里的生活照。\n` +
            `- 当用户消息同时附带一张当前画面作为视觉输入时，请像“真的看着对方”一样，根据画面中能看到的姿势、表情、光线、环境，把这些信息自然地融入 direction 里的动作/视线描写中。\n` +
            `- 不能胡编乱造画面中不存在的细节（例如看不到的房间另一侧、手机上的具体内容等），只能基于画面进行合理推断。\n` +
            `- 如果画面模糊或你无法确定细节，可以使用更含糊但自然的描述，比如“看起来有点累”、“大概是在室内”等。`;
    }

    return systemPrompt;
}

function startVoiceCall(isVideo) {
    const roleId = window.currentChatRole;
    if (!roleId) return;

    const profile = window.charProfiles[roleId] || {};

    // UI 替换后，初始化可能因为 DOM 结构变化抛错；这里兜底，避免阻断真实通话流程
    if (typeof window.showKoreanVoiceCallUI === 'function') {
        try {
            window.showKoreanVoiceCallUI({
                name: profile.nickName || '未知',
                avatar: profile.avatar || 'assets/chushitouxiang.jpg',
                nickName: profile.nickName,
                isVideo: !!isVideo
            });
        } catch (uiErr) {
            console.error('[语音通话] UI 初始化失败，继续执行通话流程：', uiErr);
        }
    }

    const state = window.voiceCallState || {};
    if (state.timerId) {
        clearInterval(state.timerId);
    }
    if (state.connectTimeoutId) {
        clearTimeout(state.connectTimeoutId);
    }
    if (state.chatSyncIntervalId) {
        clearInterval(state.chatSyncIntervalId);
    }
    const isVideoCall = !!isVideo;
    state.active = true;
    state.connected = false;
    state.seconds = 0;
    state.roleId = roleId;
    state.timerId = null;
    state.chatSyncIntervalId = null;
    state.connectTimeoutId = null;
    state.isVideo = isVideoCall;
    state.userCameraStream = null;
    state.userCameraOn = false;
    state.facingMode = 'user';
    state.sessionId = makeVoiceCallSessionId();
    state.requestToken = 0;
    window.voiceCallState = state;
    window.isVoiceCallActive = false;
    resetVoiceCallHistory();
    syncCallChatMessages();

    const statusEl = document.getElementById('callStatusText');
    if (statusEl) statusEl.innerText = '等待对方接受邀请...';
    if (typeof window.setKoreanCallStatus === 'function') {
        window.setKoreanCallStatus('等待对方接受邀请...');
    }

    if (typeof window.callAI !== 'function') {
        return;
    }

    const systemPrompt = buildVoiceCallHandshakePrompt(roleId, isVideoCall);
    const now = new Date();
    const timeText = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const callTypeText = isVideoCall ? '视频通话' : '语音通话';
    const userText = `[系统通知：用户发起了${callTypeText}邀请，当前时间是 ${timeText}。请根据你的人设、作息表和当前好感度决定是否接听。]`;

    const handshakeRequest = beginVoiceCallAIRequest(roleId);
    if (typeof window.showCallAILoading === 'function') window.showCallAILoading(true);
    window.callAI(
        systemPrompt,
        [],
        userText,
        function (aiResponseText) {
            if (typeof window.showCallAILoading === 'function') window.showCallAILoading(false);
            if (!isVoiceCallAIRequestValid(handshakeRequest, false)) return;
            const currentState = ensureVoiceCallState();
            const handshakeResult = parseVoiceCallHandshakeResult(aiResponseText, isVideoCall);
            if (!handshakeResult || handshakeResult.status === 'empty') {
                statusEl.innerText = '对方无响应';
                if (typeof window.setKoreanCallStatus === 'function') {
                    window.setKoreanCallStatus('对方无响应');
                }
                setTimeout(function () {
                    endVoiceCall();
                }, 2000);
                return;
            }

            if (handshakeResult.status === 'reject') {
                let reason = String(handshakeResult.reason || '').trim();
                if (!reason) {
                    reason = '太晚了，我现在不方便接语音。';
                }
                statusEl.innerText = '对方已拒绝';
                if (typeof window.setKoreanCallStatus === 'function') {
                    window.setKoreanCallStatus('对方已拒绝');
                }
                appendVoiceCallHistoryEntries([{ role: 'ai', type: 'speech', content: reason }]);
                syncCallChatMessages();

                const ts = Date.now();
                if (!window.chatData[roleId]) window.chatData[roleId] = [];
                const msg = {
                    role: 'ai',
                    content: reason,
                    type: 'text',
                    timestamp: ts,
                    status: 'sent'
                };
                window.chatData[roleId].push(msg);
                appendMessageToDOM(msg);
                saveData();

                window.isVoiceCallActive = false;
                setTimeout(function () {
                    endVoiceCall();
                }, 2000);
                return;
            }

            if (handshakeResult.status === 'accept') {
                const firstTurn = handshakeResult.reply || parseVoiceCallAIReply('', isVideoCall);
                currentState.connected = true;
                currentState.connectedAt = Date.now();
                currentState.seconds = 0;
                window.voiceCallState = currentState;
                window.isVoiceCallActive = true;

                const newStatusEl = document.getElementById('callStatusText');
                const newTimerEl = document.getElementById('callTimer');
                if (newStatusEl) newStatusEl.innerText = '正在通话中...';
                if (typeof window.startKoreanCallTimer === 'function') {
                    window.startKoreanCallTimer();
                }
                
                // 输入框默认收起，由韩系 UI 的话筒按钮展开/收起
                const inputRow = document.getElementById('call-input-row');
                if (inputRow) inputRow.style.display = 'none';

                if (currentState.timerId) {
                    clearInterval(currentState.timerId);
                }
                currentState.timerId = setInterval(function () {
                    const s = (window.voiceCallState && window.voiceCallState.seconds) || 0;
                    const next = s + 1;
                    window.voiceCallState.seconds = next;
                    if (newTimerEl) newTimerEl.innerText = formatCallDuration(next);
                }, 1000);
                resetVoiceCallHistory();
                appendVoiceCallHistoryEntries(buildVoiceCallHistoryEntries(firstTurn, 'ai'));
                syncCallChatMessages();
                if (currentState.isVideo) {
                    if (typeof window.hideKoreanCallUIOnly === 'function') {
                        window.hideKoreanCallUIOnly();
                    }
                    startActiveVideoSession(roleId);
                }
                return;
            }

            const failStatusEl = document.getElementById('callStatusText');
            if (failStatusEl) failStatusEl.innerText = '对方无效回复';
            if (typeof window.setKoreanCallStatus === 'function') {
                window.setKoreanCallStatus('对方无效回复');
            }
            window.isVoiceCallActive = false;
            setTimeout(function () {
                endVoiceCall();
            }, 2000);
        },
        function () {
            const errorStatusEl = document.getElementById('callStatusText');
            if (errorStatusEl) errorStatusEl.innerText = '通话请求失败';
            if (typeof window.setKoreanCallStatus === 'function') {
                window.setKoreanCallStatus('通话请求失败');
            }
            window.isVoiceCallActive = false;
            setTimeout(function () {
                endVoiceCall();
            }, 2000);
        }
    );
}

function startVideoCall() {
    startVoiceCall(true);
}

function endVoiceCall(isUserHangupFromUI) {
    const state = window.voiceCallState || {};
    // 如果是通过韩系UI挂断按钮传过来的，或者本来就有标记
    const userHangup = !!state.userHangup || !!isUserHangupFromUI;
    state.userHangup = userHangup;
    const isVideoCall = !!state.isVideo;
    if (state.userCameraStream) {
        try {
            state.userCameraStream.getTracks().forEach(function (track) { track.stop(); });
        } catch (e) { }
        state.userCameraStream = null;
    }
    state.userCameraOn = false;
    const hadConnected = !!state.connected;
    const durationSec = state.seconds || 0;
    const roleId = state.roleId || window.currentChatRole;
    
    // 隐藏韩系UI底部的输入框并清空内容
    const inputRow = document.getElementById('call-input-row');
    if (inputRow) inputRow.style.display = 'none';
    const inputEl = document.getElementById('voice-call-input');
    if (inputEl) inputEl.value = '';
    const chatContainer = document.getElementById('call-chat-container');
    if (chatContainer) chatContainer.innerHTML = '';
    
    if (typeof window.showCallAILoading === 'function') window.showCallAILoading(false);

    // 如果是底层发起的结束，需要通知韩系 UI 关掉 (为了防止死循环，korean-call-ui.js 里的 endCall 会判断 isActive)
    if (typeof window.endKoreanVoiceCall === 'function') {
        window.endKoreanVoiceCall();
    }
    let callTranscriptText = '';
    try {
        const callHistory = getVoiceCallHistoryList();
        if (Array.isArray(callHistory) && callHistory.length > 0) {
            const userName = (window.userPersonas && window.userPersonas[roleId] && window.userPersonas[roleId].name) ? window.userPersonas[roleId].name : '我';
            const charProfile = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
            const charName = charProfile.nickName || '对方';
            const lines = [];
            for (let i = 0; i < callHistory.length; i++) {
                const item = callHistory[i];
                if (!item || !item.content) continue;
                const prefix = item.role === 'me' ? (userName + ': ') : (charName + ': ');
                const canTranslate = item.role === 'ai' && (
                    typeof window.shouldRenderTranslatedBubble === 'function'
                        ? window.shouldRenderTranslatedBubble(roleId, item)
                        : (typeof window.isAutoTranslateEnabled === 'function'
                            ? !!window.isAutoTranslateEnabled(roleId)
                            : (localStorage.getItem('chat_auto_translate') === 'true'))
                );
                const parsed = canTranslate && typeof window.parseTranslatedBubbleText === 'function'
                    ? window.parseTranslatedBubbleText(item.content)
                    : null;
                const text = parsed
                    ? (parsed.hasTranslation
                        ? (parsed.foreignText + ' / ' + parsed.translationText)
                        : parsed.bodyText)
                    : String(item.content || '');
                lines.push(prefix + text);
            }
            callTranscriptText = lines.join('\n');
        }
    } catch (e) { }
    if (hadConnected && durationSec > 0 && roleId) {
        if (!window.chatData[roleId]) window.chatData[roleId] = [];
        const ts = Date.now();
        const durationText = formatCallDuration(durationSec);
        const content = (isVideoCall ? '视频通话已结束 ' : '语音通话已结束 ') + durationText;
        const msg = {
            role: 'me',
            content: content,
            type: 'call_end',
            timestamp: ts,
            status: 'sent'
        };
        window.chatData[roleId].push(msg);
        appendMessageToDOM(msg);

        const callHistory = getVoiceCallHistoryList();
        if (Array.isArray(callHistory) && callHistory.length > 0) {
            const userName = (window.userPersonas[roleId] && window.userPersonas[roleId].name) || '我';
            const charProfile = window.charProfiles[roleId] || {};
            const charName = charProfile.nickName || '对方';
            const lines = [];
            for (let i = 0; i < callHistory.length; i++) {
                const item = callHistory[i];
                if (!item || !item.content) continue;
                const prefix = item.role === 'me' ? (userName + ': ') : (charName + ': ');
                const canTranslate = item.role === 'ai' && (
                    typeof window.shouldRenderTranslatedBubble === 'function'
                        ? window.shouldRenderTranslatedBubble(roleId, item)
                        : (typeof window.isAutoTranslateEnabled === 'function'
                            ? !!window.isAutoTranslateEnabled(roleId)
                            : (localStorage.getItem('chat_auto_translate') === 'true'))
                );
                const parsed = canTranslate && typeof window.parseTranslatedBubbleText === 'function'
                    ? window.parseTranslatedBubbleText(item.content)
                    : null;
                const text = parsed
                    ? (parsed.hasTranslation
                        ? (parsed.foreignText + ' / ' + parsed.translationText)
                        : parsed.bodyText)
                    : String(item.content || '');
                lines.push(prefix + text);
            }
            const summaryText = lines.join('\n');

            if (!window.callLogs) window.callLogs = {};
            if (!Array.isArray(window.callLogs[roleId])) window.callLogs[roleId] = [];
            window.callLogs[roleId].push({
                type: isVideoCall ? 'video' : 'voice',
                date: ts,
                duration: durationSec,
                content: summaryText
            });

            const startTs = normalizeTs(state.connectedAt) || (ts - durationSec * 1000);
            const kind = isVideoCall ? 'video_call' : 'voice_call';
            const redactionKey = { kind: kind, startTs: startTs, endTs: ts };
            appendRoleApiRedaction(roleId, {
                kind: kind,
                startTs: startTs,
                endTs: ts,
                summaryText: '',
                types: ['call_end', 'call_memory']
            });

            if (typeof window.callAIShortSummary === 'function') {
                try {
                    window.callAIShortSummary(
                        { kindLabel: isVideoCall ? '视频通话' : '语音通话', segmentText: summaryText },
                        function (resultText) {
                            const cleaned = String(resultText || '').replace(/\s+/g, ' ').trim();
                            const clipped = cleaned.length > 120 ? cleaned.slice(0, 120) : cleaned;
                            updateRoleApiRedactionSummary(roleId, redactionKey, clipped);
                        },
                        function () { }
                    );
                } catch (e) { }
            }
        }

        saveData();
    }
    if (state.timerId) {
        clearInterval(state.timerId);
    }
    if (state.connectTimeoutId) {
        clearTimeout(state.connectTimeoutId);
    }
    if (state.chatSyncIntervalId) {
        clearInterval(state.chatSyncIntervalId);
    }
    state.active = false;
    state.connected = false;
    state.seconds = 0;
    state.roleId = '';
    state.timerId = null;
    state.connectTimeoutId = null;
    state.chatSyncIntervalId = null;
    state.sessionId = '';
    state.requestToken = 0;
    window.voiceCallState = state;
    window.isVoiceCallActive = false;
    resetVoiceCallHistory();

    if (typeof window.endKoreanVoiceCall === 'function') {
        window.endKoreanVoiceCall();
    }

    const videoLayer = document.getElementById('video-session-layer');
    if (videoLayer) {
        videoLayer.remove();
    }
    try {
        state.userHangup = false;
        window.voiceCallState = state;
    } catch (e) { }
    if (hadConnected && userHangup && roleId) {
        triggerCallHangupReaction(roleId, { isVideo: isVideoCall, durationSec: durationSec, transcript: callTranscriptText });
    }
}

async function triggerCallHangupReaction(roleId, info) {
    const id = String(roleId || '').trim();
    if (!id) return;
    if (typeof window.callAI !== 'function') return;
    await initData();

    const profile = window.charProfiles && window.charProfiles[id] ? window.charProfiles[id] : {};
    const roleNameForAI = profile.nickName || id || 'TA';
    let systemPrompt = `【角色名称】${roleNameForAI}\n` + (profile.desc || "你是一个友好的AI助手");
    const roleRemarkForUser = typeof profile.remark === 'string' ? profile.remark.trim() : '';
    if (roleRemarkForUser) {
        systemPrompt += `\n\n【用户给你的备注】${roleRemarkForUser}\n注意：这是用户侧的显示名，不等同于你的角色名称。你可以对这个备注做出自然反应。`;
    }
    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }
    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }
    const userPersona = window.userPersonas && window.userPersonas[id] ? window.userPersonas[id] : {};
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

    if (!window.memoryArchiveStore) {
        try {
            const raw = localStorage.getItem('wechat_memory_archive_v1');
            if (raw) window.memoryArchiveStore = JSON.parse(raw);
        } catch (e) { }
    }
    let callArchiveSections = null;
    if (typeof window.getMemoryArchiveSections === 'function') {
        try {
            callArchiveSections = window.getMemoryArchiveSections(id);
        } catch (e) { }
    }
    if (callArchiveSections || (window.memoryArchiveStore && window.memoryArchiveStore[id])) {
        const archive = callArchiveSections && callArchiveSections.archive
            ? callArchiveSections.archive
            : window.memoryArchiveStore[id];
        const likes = callArchiveSections && callArchiveSections.likesText ? callArchiveSections.likesText : (archive && archive.likesText ? archive.likesText : '');
        const habits = callArchiveSections && callArchiveSections.habitsText ? callArchiveSections.habitsText : (archive && archive.habitsText ? archive.habitsText : '');
        const events = callArchiveSections && callArchiveSections.eventsText ? callArchiveSections.eventsText : (archive && archive.eventsText ? archive.eventsText : '');
        if (likes || habits || events) {
            let memText = `\n\n【🧠 核心记忆档案 (Long-term Memory)】\n`;
            memText += `以下是系统自动总结的关于用户的长期记忆，请在对话中自然地体现你知道这些事，不用刻意复述，但要保持记忆连贯性。\n`;
            if (likes) memText += `\n[TA的喜好/厌恶]:\n${likes}`;
            if (habits) memText += `\n[TA的行为习惯]:\n${habits}`;
            if (events) memText += `\n[近期聊天记忆/关系进展]:\n${events}`;
            systemPrompt += memText;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    const history = window.chatData && window.chatData[id] ? window.chatData[id] : [];
    const fullHistory = history.map(msg => ensureMessageContent({ ...msg }));
    const cleanHistory = fullHistory.filter(function (msg) {
        if (!msg) return false;
        if (msg.type === 'call_memory') return msg.includeInAI === true;
        if (msg.type === 'system_event') return msg.includeInAI === true;
        return !!msg.content;
    });
    const lastAiIndex = (function () {
        for (let i = cleanHistory.length - 1; i >= 0; i--) {
            if (cleanHistory[i] && cleanHistory[i].role === 'ai') return i;
        }
        return -1;
    })();
    const baseHistoryForApi = lastAiIndex >= 0 ? cleanHistory.slice(0, lastAiIndex + 1) : [];
    const historyForApi = typeof buildApiMemoryHistory === 'function' ? buildApiMemoryHistory(id, baseHistoryForApi) : baseHistoryForApi;

    const infoObj = info && typeof info === 'object' ? info : {};
    const isVideo = !!infoObj.isVideo;
    const transcript = typeof infoObj.transcript === 'string' ? infoObj.transcript.trim() : '';
    const status = window.roleStatusStore && window.roleStatusStore[id] ? window.roleStatusStore[id] : null;
    const favor = status && status.favorability != null ? String(status.favorability) : '';
    const clippedTranscript = transcript.length > 1200 ? transcript.slice(0, 1200) + '…' : transcript;
    const callLabel = isVideo ? '视频通话' : '语音通话';
    const transcriptBlock = clippedTranscript ? `\n\n【刚才通话内容摘录】\n${clippedTranscript}` : '';
    const favorBlock = favor ? `当前好感度：${favor}/100。` : '';

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    const userMessage = `[系统通知：用户突然挂断了电话（${callLabel}）。请根据你的人设（暴躁、委屈、傲娇等）、${favorBlock}以及你们刚才聊到的内容，立刻按正常微信聊天习惯回应用户的挂断行为。优先拆成 2 到 4 个短气泡，不要把所有内容塞进一个长气泡。]${transcriptBlock}`;
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, userMessage, id, headerTitle, oldTitle);
}

function showIncomingLocationShareUI(roleId) {
    const old = document.getElementById('incoming-location-layer');
    if (old) {
        old.remove();
    }

    const profile = window.charProfiles[roleId] || {};
    const avatarUrl = profile.avatar || 'assets/chushitouxiang.jpg';
    const name = profile.nickName || '未知角色';

    const layer = document.createElement('div');
    layer.id = 'incoming-location-layer';
    layer.style.cssText = [
        'position: fixed',
        'top: 0',
        'left: 0',
        'width: 100%',
        'height: 100%',
        'background: rgba(0,0,0,0.9)',
        'z-index: 9999',
        'display: flex',
        'flex-direction: column',
        'align-items: center',
        'justify-content: space-between',
        'padding: 60px 0',
        'color: #fff',
        'backdrop-filter: blur(10px)'
    ].join(';') + ';';

    const topHtml = [
        '<div style="display:flex; flex-direction:column; align-items:center; margin-top:40px;">',
        '<img src="',
        avatarUrl,
        '" style="width:100px; height:100px; border-radius:10px; box-shadow:0 4px 15px rgba(0,0,0,0.3); margin-bottom:20px;">',
        '<div style="font-size:24px; font-weight:bold; margin-bottom:10px;">',
        name,
        '</div>',
        '<div style="font-size:14px; color:rgba(255,255,255,0.7);">正在向你发起实时位置共享...</div>',
        '</div>'
    ].join('');

    const bottomHtml = [
        '<div style="width:80%; display:flex; justify-content:space-between; margin-bottom:60px;">',
        '<div id="btn-reject-location" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">',
        '<div style="width:64px; height:64px; background:#ff3b30; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">',
        "<i class='bx bxs-x-circle' style=\"font-size:32px;\"></i>",
        '</div>',
        '<span style="font-size:12px;">拒绝</span>',
        '</div>',
        '<div id="btn-accept-location" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">',
        '<div style="width:64px; height:64px; background:#30d158; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">',
        "<i class='bx bx-map-pin' style=\"font-size:32px;\"></i>",
        '</div>',
        '<span style="font-size:12px;">接受</span>',
        '</div>',
        '</div>'
    ].join('');

    layer.innerHTML = topHtml + bottomHtml;
    document.body.appendChild(layer);

    const rejectBtn = document.getElementById('btn-reject-location');
    const acceptBtn = document.getElementById('btn-accept-location');

    if (rejectBtn) {
        rejectBtn.addEventListener('click', function () {
            layer.remove();
            const rid = roleId || window.currentChatRole;
            if (!rid) return;
            const now = Date.now();
            if (!window.chatData[rid]) window.chatData[rid] = [];
            const msg = {
                role: 'ai',
                type: 'text',
                content: '📍 [未接位置共享邀请]',
                timestamp: now
            };
            window.chatData[rid].push(msg);
            appendMessageToDOM(msg);
            saveData();

            // 触发AI对未接位置共享邀请的反应
            const profile = window.charProfiles[rid] || {};
            let systemPrompt = profile.desc || "你是一个友好的AI助手";

            if (profile.schedule && profile.schedule.trim()) {
                systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
            }
            if (profile.style && profile.style.trim()) {
                systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
            }
            const userPersona = window.userPersonas[rid] || {};
            if (userPersona.name || userPersona.setting || userPersona.gender || userPersona.birthday) {
                systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
                if (userPersona.name) {
                    systemPrompt += `用户名字：${userPersona.name}\n`;
                }
                if (userPersona.setting) {
                    systemPrompt += `用户背景：${userPersona.setting}\n`;
                }
                if (userPersona.gender) {
                    systemPrompt += `用户性别：${userPersona.gender}\n`;
                }
                if (userPersona.birthday) {
                    systemPrompt += `用户生日：${userPersona.birthday}\n`;
                }
            }

            const history = window.chatData[rid] || [];
            const cleanHistory = history.map(msg => ensureMessageContent({ ...msg })).filter(m => m.content);

            const headerTitle = document.getElementById('current-chat-name');
            const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
            if (headerTitle) {
                headerTitle.innerText = "对方正在输入...";
            }

            const userMessage = `[系统通知：你发起了实时位置共享邀请，但对方没有接受，显示为未接位置共享邀请。请根据你的人设，表现出委屈、失落或关心的反应，询问用户为什么没有接受位置共享邀请。按正常微信聊天习惯优先拆成 2 到 4 个短气泡，不要把内容塞进一个长气泡里，语气要符合你的性格特点，表现出更多让人有好感的情绪，不要过于生气或愤怒。]`;
            invokeAIWithCommonHandlers(systemPrompt, cleanHistory, userMessage, rid, headerTitle, oldTitle);
        });
    }

    if (acceptBtn) {
        acceptBtn.addEventListener('click', function () {
            layer.remove();
            acceptIncomingLocationShare(roleId);
        });
    }
}

async function acceptIncomingLocationShare(roleId) {
    const rid = roleId || window.currentChatRole;
    if (!rid) return;

    await initData();

    const data = window.chatMapData && window.chatMapData[rid];
    if (!(data && data.isCreated === true)) {
        alert('对方想和你进行实时位置共享，但你还没有为 Ta 设置地图地点。\n\n请先创建地图；创建完成后会自动进入实时位置共享。');
        openMapCreatorModal(rid, {
            afterSave: function (savedRoleId) {
                completeIncomingLocationShareAccept(savedRoleId || rid);
            }
        });
        return;
    }

    completeIncomingLocationShareAccept(rid);
}

function completeIncomingLocationShareAccept(roleId) {
    const rid = roleId || window.currentChatRole;
    if (!rid) return;
    if (!window.chatData[rid]) window.chatData[rid] = [];
    const ts = Date.now();
    const msg = {
        role: 'me',
        type: 'text',
        content: '✅ 我接受了你的实时位置共享邀请。',
        timestamp: ts,
        status: 'sent'
    };
    window.chatData[rid].push(msg);
    appendMessageToDOM(msg);
    saveData();

    startLocationShare(rid);
}

// ========== 绑定韩系 UI 内置输入框发送事件 ==========
document.addEventListener('DOMContentLoaded', function() {
    const inputEl = document.getElementById('voice-call-input');
    const sendBtn = document.getElementById('voice-call-send-btn');
    
    function sendInputText() {
        if (!inputEl) return;
        const text = String(inputEl.value || '').trim();
        if (!text) return;
        inputEl.value = '';
        if (typeof sendTextInVoiceCall === 'function') {
            sendTextInVoiceCall(text);
        }
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof rerollVoiceCallReply === 'function') {
                rerollVoiceCallReply();
            }
        });
    }

    if (inputEl) {
        inputEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendInputText();
            }
        });
    }
});
// ======================================================

function createVideoSessionUI() {
    const old = document.getElementById('video-session-layer');
    if (old) old.remove();
    const layer = document.createElement('div');
    layer.id = 'video-session-layer';
    layer.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:#000; z-index:12000; overflow:hidden;';
    const bgBox = document.createElement('div');
    bgBox.className = 'video-session-bg';
    bgBox.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; overflow:hidden;';
    const bgImg = document.createElement('img');
    bgImg.id = 'video-session-bg-img';
    bgImg.style.cssText = 'width:100%; height:100%; object-fit:cover; transform:scale(1.05);';
    bgBox.appendChild(bgImg);
    layer.appendChild(bgBox);
    const userBox = document.createElement('div');
    userBox.id = 'video-session-user-box';
    userBox.style.cssText = 'position:absolute; top:20px; right:16px; width:26%; max-width:120px; aspect-ratio:9/16; background:#333; border-radius:8px; overflow:hidden; box-shadow:0 0 8px rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center;';
    const userAvatar = document.createElement('img');
    userAvatar.id = 'video-session-user-avatar';
    userAvatar.style.cssText = 'width:100%; height:100%; object-fit:cover; display:none;';
    const userVideo = document.createElement('video');
    userVideo.id = 'video-session-user-video';
    userVideo.autoplay = true;
    userVideo.muted = true;
    userVideo.playsInline = true;
    userVideo.style.cssText = 'width:100%; height:100%; object-fit:cover; background:#000; display:none;';
    userBox.appendChild(userAvatar);
    userBox.appendChild(userVideo);
    layer.appendChild(userBox);
    const subtitleBox = document.createElement('div');
    subtitleBox.id = 'video-subtitle-container';
    subtitleBox.className = 'call-chat-container';
    subtitleBox.style.cssText = 'position:absolute; left:0; bottom:120px; width:100%; max-height:40%; padding:10px 14px; box-sizing:border-box; overflow-y:auto;';
    layer.appendChild(subtitleBox);
    const inputRow = document.createElement('div');
    inputRow.id = 'video-call-input-row';
    inputRow.style.cssText = 'position:absolute; left:0; bottom:80px; width:100%; padding:0 16px; box-sizing:border-box; display:none;';
    const inputEl = document.createElement('input');
    inputEl.id = 'video-call-input';
    inputEl.className = 'voice-call-input';
    inputEl.type = 'text';
    inputEl.placeholder = '在通话中发消息...';
    const sendBtn = document.createElement('button');
    sendBtn.id = 'video-call-send';
    sendBtn.className = 'voice-call-send-btn';
    sendBtn.innerHTML = "<i class='bx bx-refresh'></i>";
    sendBtn.title = '一键重Roll';
    inputRow.appendChild(inputEl);
    inputRow.appendChild(sendBtn);
    layer.appendChild(inputRow);
    const controls = document.createElement('div');
    controls.id = 'video-session-controls';
    controls.style.cssText = 'position:absolute; left:0; bottom:20px; width:100%; display:flex; align-items:center; justify-content:center; gap:24px;';
    const micBtn = document.createElement('button');
    micBtn.id = 'video-call-mic-btn';
    micBtn.className = 'call-btn call-btn-small';
    micBtn.innerHTML = "<i class='bx bx-microphone'></i>";
    const hangupBtn = document.createElement('button');
    hangupBtn.id = 'video-call-hangup-btn';
    hangupBtn.className = 'call-btn call-btn-hangup';
    hangupBtn.innerHTML = "<i class='bx bx-phone-off'></i>";
    const cameraBtn = document.createElement('button');
    cameraBtn.id = 'video-call-camera-btn';
    cameraBtn.className = 'call-btn call-btn-small';
    cameraBtn.innerHTML = "<i class='bx bx-video'></i>";
    controls.appendChild(micBtn);
    controls.appendChild(hangupBtn);
    controls.appendChild(cameraBtn);
    const switchBtn = document.createElement('button');
    switchBtn.id = 'video-call-switch-camera-btn';
    switchBtn.className = 'call-btn call-btn-small';
    switchBtn.innerHTML = "<i class='bx bx-revision'></i>";
    controls.appendChild(switchBtn);

    const waveContainer = document.createElement('div');
    waveContainer.id = 'video-call-ai-loading-wave';
    waveContainer.className = 'call-ai-loading-wave';
    waveContainer.style.cssText = 'position:absolute; left:0; bottom:90px; width:100%; display:none; justify-content:center; align-items:center; gap:4px; height:20px; z-index:12001;';
    waveContainer.innerHTML = `
        <div class="wave-line"></div>
        <div class="wave-line"></div>
        <div class="wave-line"></div>
        <div class="wave-line"></div>
    `;
    layer.appendChild(waveContainer);

    layer.appendChild(controls);
    document.body.appendChild(layer);
}

function startActiveVideoSession(roleId) {
    const profile = window.charProfiles[roleId] || {};
    const album = Array.isArray(profile.videoAlbum) ? profile.videoAlbum : [];
    let bg = '';
    if (album.length > 0) {
        const index = Math.floor(Math.random() * album.length);
        bg = album[index];
    } else {
        bg = profile.avatar || 'assets/chushitouxiang.jpg';
    }
    createVideoSessionUI();
    const bgImg = document.getElementById('video-session-bg-img');
    if (bgImg && bg) {
        bgImg.src = bg;
        if (album.length === 0) {
            bgImg.style.filter = 'blur(10px)';
            bgImg.style.transform = 'scale(1.1)';
        } else {
            bgImg.style.filter = 'blur(5px)';
            bgImg.style.transform = 'scale(1.05)';
        }
    }
    const userAvatarEl = document.getElementById('video-session-user-avatar');
    const userVideoEl = document.getElementById('video-session-user-video');
    const userBox = document.getElementById('video-session-user-box');
    const personas = window.userPersonas || {};
    const persona = personas[roleId] || {};
    const userAvatarUrl = persona.avatar || 'assets/chushitouxiang.jpg';
    if (userAvatarEl) {
        userAvatarEl.src = userAvatarUrl;
        userAvatarEl.style.display = 'block';
    }
    if (userVideoEl) {
        userVideoEl.style.display = 'none';
    }
    if (userBox) {
        userBox.style.background = '#333';
    }
    syncCallChatMessages();
    const hangupBtn = document.getElementById('video-call-hangup-btn');
    const micBtn = document.getElementById('video-call-mic-btn');
    const cameraBtn = document.getElementById('video-call-camera-btn');
    const switchBtn = document.getElementById('video-call-switch-camera-btn');
    const inputRow = document.getElementById('video-call-input-row');
    const inputEl = document.getElementById('video-call-input');
    const sendBtn = document.getElementById('video-call-send');
    if (hangupBtn) {
        hangupBtn.onclick = function () {
            try {
                const s = window.voiceCallState || {};
                s.userHangup = true;
                window.voiceCallState = s;
            } catch (e) { }
            endVideoSession();
        };
    }
    if (micBtn && inputRow) {
        micBtn.onclick = function () {
            micBtn.classList.toggle('off');
            if (inputRow.style.display === 'none' || !inputRow.style.display) {
                inputRow.style.display = 'flex';
                if (inputEl) {
                    setTimeout(function () {
                        inputEl.focus();
                    }, 10);
                }
            } else {
                inputRow.style.display = 'none';
            }
        };
    }
    if (cameraBtn) {
        cameraBtn.onclick = function () {
            toggleUserCamera();
            cameraBtn.classList.toggle('off');
        };
    }
    if (switchBtn) {
        switchBtn.onclick = function () {
            switchCameraFacingMode();
        };
    }
    if (inputEl) {
        const send = function () {
            const raw = inputEl.value.trim();
            if (!raw) return;
            inputEl.value = '';
            sendTextInVoiceCall(raw);
        };
        inputEl.onkeydown = function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                send();
            }
        };
        if (sendBtn) {
            sendBtn.onclick = function (e) {
                e.preventDefault();
                rerollVoiceCallReply();
            };
        }
    }
}

function toggleUserCamera() {
    const videoEl = document.getElementById('video-session-user-video');
    const avatarEl = document.getElementById('video-session-user-avatar');
    const userBox = document.getElementById('video-session-user-box');
    if (!videoEl || !avatarEl || !userBox) return;
    const state = window.voiceCallState || {};
    if (state.userCameraOn && state.userCameraStream) {
        try {
            state.userCameraStream.getTracks().forEach(function (track) { track.stop(); });
        } catch (e) { }
        state.userCameraStream = null;
        state.userCameraOn = false;
        videoEl.srcObject = null;
        videoEl.style.display = 'none';
        avatarEl.style.display = 'block';
        userBox.style.background = '#333';
        window.voiceCallState = state;
        return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return;
    }
    const facing = state.facingMode || 'user';
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } }).then(function (stream) {
        const s = window.voiceCallState || {};
        s.userCameraStream = stream;
        s.userCameraOn = true;
        s.facingMode = facing;
        window.voiceCallState = s;
        videoEl.srcObject = stream;
        videoEl.style.display = 'block';
        avatarEl.style.display = 'none';
        userBox.style.background = '#000';
        const p = videoEl.play();
        if (p && typeof p.catch === 'function') {
            p.catch(function () { });
        }
    }).catch(function () { });
}

function endVideoSession() {
    const state = window.voiceCallState || {};
    if (state.userCameraStream) {
        try {
            state.userCameraStream.getTracks().forEach(function (track) { track.stop(); });
        } catch (e) { }
        state.userCameraStream = null;
    }
    state.userCameraOn = false;
    window.voiceCallState = state;
    const layer = document.getElementById('video-session-layer');
    if (layer) {
        layer.remove();
    }
    endVoiceCall();
}

function switchCameraFacingMode() {
    const videoEl = document.getElementById('video-session-user-video');
    const avatarEl = document.getElementById('video-session-user-avatar');
    const userBox = document.getElementById('video-session-user-box');
    if (!videoEl || !avatarEl || !userBox) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return;
    }
    const state = window.voiceCallState || {};
    const current = state.facingMode === 'environment' ? 'environment' : 'user';
    const next = current === 'user' ? 'environment' : 'user';
    if (state.userCameraStream) {
        try {
            state.userCameraStream.getTracks().forEach(function (track) { track.stop(); });
        } catch (e) { }
        state.userCameraStream = null;
    }
    const wasOn = !!state.userCameraOn;
    state.userCameraOn = false;
    state.facingMode = next;
    window.voiceCallState = state;
    if (!wasOn) {
        return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: next } }).then(function (stream) {
        const s = window.voiceCallState || {};
        s.userCameraStream = stream;
        s.userCameraOn = true;
        s.facingMode = next;
        window.voiceCallState = s;
        videoEl.srcObject = stream;
        videoEl.style.display = 'block';
        avatarEl.style.display = 'none';
        userBox.style.background = '#000';
        const p = videoEl.play();
        if (p && typeof p.catch === 'function') {
            p.catch(function () { });
        }
    }).catch(function () { });
}

function captureUserVideoFrame() {
    const videoEl = document.getElementById('video-session-user-video');
    if (!videoEl || !videoEl.srcObject) return '';
    const w = videoEl.videoWidth || 0;
    const h = videoEl.videoHeight || 0;
    if (!w || !h) return '';
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    try {
        ctx.drawImage(videoEl, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', 0.6);
    } catch (e) {
        return '';
    }
}

// 🔍 搜索 function cleanVoiceCallAIReply 并替换为：
function cleanVoiceCallAIReply(text) {
    let raw = String(text || '').trim();
    if (!raw) return '';

    // === 1. 尝试解析 Markdown/JSON 包裹的内容 ===
    try {
        let jsonStr = raw;
        // 移除 Markdown 代码块标记 (兼容 ```json 和 ``` 纯反引号)
        jsonStr = jsonStr.replace(/```(json)?/gi, '').trim();

        // 尝试提取 JSON 对象
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start !== -1 && end > start) {
            const inner = jsonStr.substring(start, end + 1);
            const obj = JSON.parse(inner);
            // 提取常见字段
            if (obj.reply) return String(obj.reply).trim();
            if (obj.content) return String(obj.content).trim();
            if (obj.text) return String(obj.text).trim();
            if (obj.message) return String(obj.message).trim();
        }
    } catch (e) {
        // 解析失败，说明不是 JSON，继续往下走
    }

    // === 2. 常规文本清洗 ===
    // 去除 <thinking> 标签
    raw = raw.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
    // 暴力去除剩余的所有反引号
    raw = raw.replace(/```+/g, '');

    // 去除 "System:", "Assistant:", "思考过程:" 等前缀行
    const lines = raw.split('\n');
    const cleanedLines = lines.map(l => l.trim()).filter(l => {
        if (!l) return false;
        // 过滤掉技术性前缀
        if (/^(system|assistant|model|user|思考过程|推理过程|解释|分析)\s*[:：]/i.test(l)) return false;
        return true;
    });

    return cleanedLines.join(' ').trim();
}


function sendTextInVoiceCall(text) {
    const state = ensureVoiceCallState();
    const roleId = state.roleId || window.currentChatRole;
    if (!roleId) return;
    if (!state.connected || !window.isVoiceCallActive) {
        return;
    }
    appendVoiceCallHistoryEntries([{ role: 'me', type: 'speech', content: text }]);
    syncCallChatMessages();
    if (typeof window.callAI !== 'function') {
        return;
    }
    const systemPrompt = buildVoiceCallTalkPrompt(roleId, !!state.isVideo);
    const historyForAI = getVoiceCallHistoryList().map(function (m) {
        return {
            role: m.role === 'me' ? 'me' : 'ai',
            content: m.content
        };
    });
    const userMessageText = '[' + (state.isVideo ? '视频通话中' : '语音通话中') + '] ' + text;
    let imageData = '';
    if (state.isVideo && state.userCameraOn) {
        imageData = captureUserVideoFrame();
    }
    let userPayload = userMessageText;
    if (state.isVideo && imageData) {
        userPayload = {
            type: 'image',
            text: userMessageText,
            base64: imageData
        };
    }
    const requestMeta = beginVoiceCallAIRequest(roleId);
    if (typeof window.showCallAILoading === 'function') window.showCallAILoading(true);
    window.callAI(
        systemPrompt,
        historyForAI,
        userPayload,
        function (aiResponseText) {
            if (typeof window.showCallAILoading === 'function') window.showCallAILoading(false);
            if (!isVoiceCallAIRequestValid(requestMeta, true)) {
                return;
            }
            const payload = parseVoiceCallAIReply(aiResponseText, !!state.isVideo);
            appendVoiceCallHistoryEntries(buildVoiceCallHistoryEntries(payload, 'ai'));
            syncCallChatMessages();
        },
        function () {
            if (typeof window.showCallAILoading === 'function') window.showCallAILoading(false);
        }
    );
}

function rerollVoiceCallReply() {
    const state = ensureVoiceCallState();
    const roleId = state.roleId || window.currentChatRole;
    if (!roleId) return;
    if (!state.connected || !window.isVoiceCallActive) {
        return;
    }
    const history = getVoiceCallHistoryList();
    let lastUserIndex = -1;
    for (let i = history.length - 1; i >= 0; i--) {
        const item = history[i];
        if (item && item.role === 'me') {
            lastUserIndex = i;
            break;
        }
    }
    if (lastUserIndex === -1) {
        alert('当前没有可重Roll的用户发言');
        return;
    }
    let removed = false;
    while (history.length > lastUserIndex + 1) {
        const tail = history[history.length - 1];
        if (!tail || tail.role !== 'ai') break;
        history.pop();
        removed = true;
    }
    if (!removed) {
        alert('没有可以重Roll的AI回复');
        return;
    }
    syncCallChatMessages();
    if (typeof window.callAI !== 'function') {
        return;
    }
    const systemPrompt = buildVoiceCallTalkPrompt(roleId, !!state.isVideo);
    const historyForAI = getVoiceCallHistoryList().map(function (m) {
        return {
            role: m.role === 'me' ? 'me' : 'ai',
            content: m.content
        };
    });
    let lastUserMessage = null;
    for (let i = historyForAI.length - 1; i >= 0; i--) {
        const item = historyForAI[i];
        if (item && item.role === 'me') {
            lastUserMessage = item;
            break;
        }
    }
    if (!lastUserMessage || !lastUserMessage.content) {
        return;
    }
    const userMessageText = '[' + (state.isVideo ? '视频通话中' : '语音通话中') + '] ' + lastUserMessage.content;
    if (typeof window !== 'undefined') {
        window.__chatRerollRequested = true;
    }
    const requestMeta = beginVoiceCallAIRequest(roleId);
    let userPayload = userMessageText;
    if (state.isVideo && state.userCameraOn) {
        const imageData = captureUserVideoFrame();
        if (imageData) {
            userPayload = {
                type: 'image',
                text: userMessageText,
                base64: imageData
            };
        }
    }
    if (typeof window.showCallAILoading === 'function') window.showCallAILoading(true);
    window.callAI(
        systemPrompt,
        historyForAI,
        userPayload,
        function (aiResponseText) {
            if (typeof window.showCallAILoading === 'function') window.showCallAILoading(false);
            if (!isVoiceCallAIRequestValid(requestMeta, true)) {
                return;
            }
            const payload = parseVoiceCallAIReply(aiResponseText, !!state.isVideo);
            appendVoiceCallHistoryEntries(buildVoiceCallHistoryEntries(payload, 'ai'));
            syncCallChatMessages();
        },
        function () {
            if (typeof window.showCallAILoading === 'function') window.showCallAILoading(false);
        }
    );
}

// =========================================================
// 🔥 AI 主动来电功能模块
// =========================================================

// 1. 显示来电全屏界面

