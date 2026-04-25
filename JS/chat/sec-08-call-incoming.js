/* === [SEC-08] AI 主动来电与接听逻辑 === */

function rejectIncomingCall(roleId, isVideo) {
    const rid = roleId || window.currentChatRole;
    const callType = isVideo ? "视频通话" : "语音通话";
    const now = Date.now();
    if (rid) {
        if (!window.chatData) window.chatData = {};
        if (!Array.isArray(window.chatData[rid])) window.chatData[rid] = [];
        const missedMsg = {
            role: 'ai',
            type: 'text',
            content: isVideo ? '📹 [未接视频通话]' : '📞 [未接来电]',
            timestamp: now
        };
        window.chatData[rid].push(missedMsg);
        appendMessageToDOM(missedMsg);
        saveData();
    } else {
        appendMessageToDOM({
            role: 'ai',
            type: 'text',
            content: isVideo ? '📹 [未接视频通话]' : '📞 [未接来电]',
            timestamp: now
        });
        saveData();
        return;
    }

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

    const userMessage = `[系统通知：你发起了${callType}，但对方没有接听，显示为未接来电。请根据你的人设，表现出委屈、失落或关心的反应，询问用户为什么没有接听电话，语气要符合你的性格特点，表现出更多让人有好感的情绪，不要过于生气或愤怒。]`;
    invokeAIWithCommonHandlers(systemPrompt, cleanHistory, userMessage, rid, headerTitle, oldTitle);
}

function showIncomingCallUI(roleId, isVideo) {
    // 移除可能存在的旧弹窗
    const old = document.getElementById('incoming-call-layer');
    if (old) old.remove();

    const profile = window.charProfiles[roleId] || {};
    const avatarUrl = profile.avatar || "assets/chushitouxiang.jpg";
    const name = profile.nickName || "未知角色";
    const isVideoCall = !!isVideo;

    if (typeof window.showKoreanIncomingCallUI === 'function') {
        window.showKoreanIncomingCallUI({
            name: name,
            avatar: avatarUrl,
            nickName: profile.nickName,
            isVideo: isVideoCall,
            promptText: isVideoCall ? '对方邀请你视频通话' : '对方邀请你语音通话'
        }, {
            onAccept: function () {
                acceptIncomingCall(roleId, isVideoCall);
            },
            onReject: function () {
                rejectIncomingCall(roleId, isVideoCall);
            }
        });
        return;
    }

    // 创建全屏遮罩
    const layer = document.createElement('div');
    layer.id = 'incoming-call-layer';
    layer.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); z-index: 9999;
        display: flex; flex-direction: column; align-items: center; justify-content: space-between;
        padding: 60px 0; color: #fff; backdrop-filter: blur(10px);
    `;

    // 上半部分：头像和名字
    const subtitleText = isVideoCall ? "邀请你进行视频通话..." : "邀请你进行语音通话...";
    const iconHtml = isVideoCall
        ? "<i class='bx bx-video' style=\"font-size:32px;\"></i>"
        : "<i class='bx bxs-phone-call' style=\"font-size:32px;\"></i>";
    const topHtml = `
        <div style="display:flex; flex-direction:column; align-items:center; margin-top: 40px;">
            <img src="${avatarUrl}" style="width:100px; height:100px; border-radius:10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); margin-bottom: 20px;">
            <div style="font-size:24px; font-weight:bold; margin-bottom:10px;">${name}</div>
            <div style="font-size:14px; color:rgba(255,255,255,0.7);">${subtitleText}</div>
        </div>
    `;

    // 下半部分：接听/挂断按钮 (左红右绿)
    const bottomHtml = `
        <div style="width: 80%; display:flex; justify-content: space-between; margin-bottom: 60px;">
            <!-- 挂断 -->
            <div id="btn-reject-call" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                <div style="width:64px; height:64px; background:#ff3b30; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">
                    <i class='bx bxs-phone-off' style="font-size:32px;"></i>
                </div>
                <span style="font-size:12px;">挂断</span>
            </div>
            
            <!-- 接听 -->
            <div id="btn-accept-call" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                <div style="width:64px; height:64px; background:#30d158; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">
                    ${iconHtml}
                </div>
                <span style="font-size:12px;">接听</span>
            </div>
        </div>
    `;

    layer.innerHTML = topHtml + bottomHtml;
    document.body.appendChild(layer);

    // 绑定事件
    document.getElementById('btn-reject-call').addEventListener('click', function () {
        layer.remove();
        // 写入一条“未接来电”记录
        const now = Date.now();
        appendMessageToDOM({
            role: 'ai',
            type: 'text',
            content: '📞 [未接来电]',
            timestamp: now
        });
        saveData();

        // 触发AI对未接来电的反应
        if (roleId) {
            const profile = window.charProfiles[roleId] || {};
            let systemPrompt = profile.desc || "你是一个友好的AI助手";

            if (profile.schedule && profile.schedule.trim()) {
                systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
            }
            if (profile.style && profile.style.trim()) {
                systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
            }
            const userPersona = window.userPersonas[roleId] || {};
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

            const history = window.chatData[roleId] || [];
            const cleanHistory = history.map(msg => ensureMessageContent({ ...msg })).filter(m => m.content);

            const headerTitle = document.getElementById('current-chat-name');
            const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
            if (headerTitle) {
                headerTitle.innerText = "对方正在输入...";
            }

            const callType = isVideo ? "视频通话" : "语音通话";
            const userMessage = `[系统通知：你发起了${callType}，但对方没有接听，显示为未接来电。请根据你的人设，表现出委屈、失落或关心的反应，询问用户为什么没有接听电话，语气要符合你的性格特点，表现出更多让人有好感的情绪，不要过于生气或愤怒。]`;
            invokeAIWithCommonHandlers(systemPrompt, cleanHistory, userMessage, roleId, headerTitle, oldTitle);
        }
    });

    document.getElementById('btn-accept-call').addEventListener('click', function () {
        layer.remove();
        acceptIncomingCall(roleId, isVideoCall);
    });
}

// 2. 接听电话：初始化状态并唤起通话界面
function acceptIncomingCall(roleId, isVideo) {
    const isVideoCall = !!isVideo;

    const profile = window.charProfiles[roleId] || {};

    if (!isVideoCall && typeof window.showKoreanVoiceCallUI === 'function' &&
        !(typeof window.isKoreanCallActive === 'function' && window.isKoreanCallActive())) {
        window.showKoreanVoiceCallUI({
            name: profile.nickName || '未知',
            avatar: profile.avatar || 'assets/chushitouxiang.jpg',
            nickName: profile.nickName,
            isVideo: false
        });
    } else if (isVideoCall && typeof window.hideKoreanCallUIOnly === 'function') {
        window.hideKoreanCallUIOnly();
    }

    // 2. 初始化状态 (直接 Connected，不需要握手)
    const state = window.voiceCallState || {};
    // 清理旧定时器
    if (state.timerId) clearInterval(state.timerId);
    if (state.chatSyncIntervalId) clearInterval(state.chatSyncIntervalId);
    if (state.connectTimeoutId) clearTimeout(state.connectTimeoutId);

    state.active = true;
    state.connected = true;
    state.seconds = 0;
    state.roleId = roleId;
    state.isVideo = isVideoCall;
    state.connectedAt = Date.now();
    state.sessionId = makeVoiceCallSessionId();
    state.requestToken = 0;
    state.userHangup = false;
    window.voiceCallState = state;
    window.isVoiceCallActive = true;
    resetVoiceCallHistory();

    // 4. 启动计时器（语音和视频都计时）
    const newStatusEl = document.getElementById('callStatusText');
    const newTimerEl = document.getElementById('callTimer');
    if (newStatusEl) newStatusEl.innerText = '正在通话中...';
    if (newTimerEl) newTimerEl.innerText = '00:00';
    if (!isVideoCall && typeof window.startKoreanCallTimer === 'function') {
        window.startKoreanCallTimer();
    }

    if (state.timerId) clearInterval(state.timerId);
    state.timerId = setInterval(function () {
        const s = (window.voiceCallState && window.voiceCallState.seconds) || 0;
        const next = s + 1;
        window.voiceCallState.seconds = next;
        if (newTimerEl && !isVideoCall) {
            newTimerEl.innerText = formatCallDuration(next);
        }
    }, 1000);

    // 5. 视频通话：直接进入视频界面
    if (isVideoCall) {
        startActiveVideoSession(roleId);
    }

    // 6. 🔥 关键：因为是AI打来的，接通后AI要先说话
    triggerAIFirstSpeakInCall(roleId);
}

// 3. 触发 AI 通话第一句 (修复版：带记忆功能)
// 🔍 搜索 function triggerAIFirstSpeakInCall 并替换为：
function triggerAIFirstSpeakInCall(roleId) {
    const state = ensureVoiceCallState();
    const systemPrompt = buildVoiceCallTalkPrompt(roleId, !!state.isVideo);

    const history = window.chatData[roleId] || [];
    const cleanHistory = history.map(msg => {
        if (!msg.content) return null;
        if (msg.type === 'call_end' || msg.type === 'call_memory') return null;
        return {
            role: msg.role === 'me' ? 'me' : 'ai',
            content: msg.content
        };
    }).filter(Boolean);

    const userMessage = "[系统通知：用户接听了你的电话。请你立刻进入通话状态，先给出一条居中描写，再连续说出 4 到 7 条自然短句，像真的刚接通一样。]";
    const requestMeta = beginVoiceCallAIRequest(roleId);

    if (typeof window.showCallAILoading === 'function') window.showCallAILoading(true);
    window.callAI(
        systemPrompt,
        cleanHistory,
        userMessage,
        function (aiResponseText) {
            if (typeof window.showCallAILoading === 'function') window.showCallAILoading(false);
            if (!isVoiceCallAIRequestValid(requestMeta, true)) return;
            const payload = parseVoiceCallAIReply(aiResponseText, !!state.isVideo);
            appendVoiceCallHistoryEntries(buildVoiceCallHistoryEntries(payload, 'ai'));
            syncCallChatMessages();
        },
        function () {
            if (typeof window.showCallAILoading === 'function') window.showCallAILoading(false);
            console.error("AI 接通后发言失败");
        }
    );
}




document.addEventListener('DOMContentLoaded', function () {
    console.log('[通话UI] 旧的事件绑定已禁用，使用韩系通话界面 (korean-call-ui.js)');
});





// =========================================================
// === 2. 菜单与弹窗体系 (完整功能) ===
// =========================================================

// 打开主设置菜单

