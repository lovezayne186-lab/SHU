/* === 韩系沉浸式语音通话控制器 === */

(function () {
    'use strict';

    var callOverlay = null;
    var callBgBlur = null;
    var callUserAvatar = null;
    var callUserName = null;
    var callStatusText = null;
    var callTimer = null;
    var callMinimize = null;
    var callMute = null;
    var callHangup = null;
    var callSpeaker = null;
    var ripples = null;
    var callFloatWindow = null;

    var timerInterval = null;
    var seconds = 0;
    var isMuted = false;
    var isSpeakerOn = false;
    var waveInterval = null;
    var isActive = false;
    var callMode = 'idle';
    var incomingAcceptHandler = null;
    var incomingRejectHandler = null;
    var floatSuppressClick = false;
    var floatDragState = {
        active: false,
        moved: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0
    };
    var chatVisibilityObserverBound = false;
    var FLOAT_PREF_KEY = 'korean_call_float_position_v1';

    function setButtonIconAndText(btn, iconClass, text) {
        if (!btn) return;
        var iconEl = btn.querySelector('i');
        if (iconEl && iconClass) {
            iconEl.className = iconClass;
        }
        var textEl = btn.querySelector('span');
        if (textEl && typeof text === 'string') {
            textEl.textContent = text;
        }
    }

    function ensureButtonText(btn, text) {
        if (!btn) return;
        var textEl = btn.querySelector('span');
        if (!textEl) {
            textEl = document.createElement('span');
            textEl.className = 'call-btn-label';
            btn.appendChild(textEl);
        }
        textEl.textContent = text || '';
    }

    function ensureIncomingPrompt() {
        var main = callOverlay ? callOverlay.querySelector('.call-main') : document.querySelector('.call-main');
        if (!main) return null;
        var prompt = document.getElementById('koreanIncomingCallPrompt');
        if (!prompt) {
            prompt = document.createElement('p');
            prompt.id = 'koreanIncomingCallPrompt';
            prompt.className = 'call-incoming-prompt';
            var avatar = main.querySelector('.avatar-ripple-wrapper');
            if (avatar) main.insertBefore(prompt, avatar);
            else main.insertBefore(prompt, main.firstChild);
        }
        return prompt;
    }

    function setIncomingPrompt(text) {
        var prompt = ensureIncomingPrompt();
        if (!prompt) return;
        prompt.textContent = text || '';
        prompt.style.display = text ? 'block' : 'none';
    }

    function setCallChatVisible(visible) {
        var wrapper = callOverlay ? callOverlay.querySelector('.voice-call-chat-wrapper') : document.querySelector('.voice-call-chat-wrapper');
        if (wrapper) wrapper.style.display = visible ? '' : 'none';
    }

    function setCallInputVisible(visible) {
        var inputRow = document.getElementById('call-input-row');
        if (inputRow) inputRow.style.display = visible ? 'flex' : 'none';
    }

    function formatFloatDuration(value) {
        var n = Math.max(0, Math.floor(Number(value) || 0));
        var m = Math.floor(n / 60);
        var s = n % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function ensureCallFloatWindow() {
        var el = document.getElementById('call-float-window');
        if (!el && document.body) {
            el = document.createElement('div');
            el.id = 'call-float-window';
            document.body.appendChild(el);
        }
        if (!el) return null;
        callFloatWindow = el;
        if (document.body && el.parentNode !== document.body) {
            document.body.appendChild(el);
        }
        if (el.dataset.kFloatReady !== '1') {
            el.dataset.kFloatReady = '1';
            el.className = 'call-float-window k-float-call';
            el.setAttribute('aria-label', '返回语音通话');
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.innerHTML =
                '<div class="k-status-dot"></div>' +
                '<svg class="k-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
                '<path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l1.98-1.98c.3-.3.74-.4 1.13-.27 1.24.41 2.57.63 3.93.63.62 0 1.12.5 1.12 1.12V20c0 .62-.5 1.12-1.12 1.12C10.62 21.12 2.88 13.38 2.88 3.75c0-.62.5-1.12 1.12-1.12h3.12c.62 0 1.12.5 1.12 1.12 0 1.36.22 2.69.63 3.93.12.39.03.82-.28 1.13l-1.97 1.98Z" stroke="#555" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
                '</svg>' +
                '<span class="k-timer">00:00</span>';
        }
        bindFloatWindowDrag(el);
        return el;
    }

    function readFloatPositionPref() {
        try {
            var raw = localStorage.getItem(FLOAT_PREF_KEY) || '';
            var obj = raw ? JSON.parse(raw) : null;
            if (!obj || typeof obj !== 'object') return null;
            var x = Number(obj.x);
            var y = Number(obj.y);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
            return { x: x, y: y };
        } catch (e) {
            return null;
        }
    }

    function saveFloatPositionPref(x, y) {
        try {
            localStorage.setItem(FLOAT_PREF_KEY, JSON.stringify({ x: Math.round(x), y: Math.round(y) }));
        } catch (e) { }
    }

    function getFloatBounds(el) {
        var box = el || ensureCallFloatWindow();
        var width = window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || 375;
        var height = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 667;
        var safe = 8;
        var w = box ? (box.offsetWidth || 92) : 92;
        var h = box ? (box.offsetHeight || 36) : 36;
        return {
            minX: safe,
            minY: safe,
            maxX: Math.max(safe, width - w - safe),
            maxY: Math.max(safe, height - h - safe)
        };
    }

    function clampFloatPosition(x, y, el) {
        var bounds = getFloatBounds(el);
        return {
            x: Math.max(bounds.minX, Math.min(bounds.maxX, Number(x) || bounds.minX)),
            y: Math.max(bounds.minY, Math.min(bounds.maxY, Number(y) || bounds.minY))
        };
    }

    function applyFloatPosition(el) {
        var box = el || ensureCallFloatWindow();
        if (!box) return;
        var pref = readFloatPositionPref();
        if (!pref) {
            box.style.left = '';
            box.style.right = window.innerWidth <= 768 ? '12px' : '16px';
            box.style.top = '60px';
            box.style.bottom = 'auto';
            return;
        }
        var pos = clampFloatPosition(pref.x, pref.y, box);
        box.style.left = pos.x + 'px';
        box.style.top = pos.y + 'px';
        box.style.right = 'auto';
        box.style.bottom = 'auto';
    }

    function updateCallFloatTimer() {
        var box = callFloatWindow || document.getElementById('call-float-window');
        if (!box) return;
        var timer = box.querySelector('.k-timer');
        if (!timer) return;
        var state = window.voiceCallState && typeof window.voiceCallState === 'object' ? window.voiceCallState : null;
        var text = '';
        if (state && Number(state.seconds) > 0) {
            text = formatFloatDuration(state.seconds);
        } else if (callTimer && callTimer.textContent) {
            text = callTimer.textContent;
        }
        timer.textContent = String(text || '00:00').trim();
    }

    function showCallFloatWindow() {
        var box = ensureCallFloatWindow();
        if (!box) return;
        updateCallFloatTimer();
        applyFloatPosition(box);
        box.style.display = 'flex';
        box.setAttribute('aria-hidden', 'false');
    }

    function hideCallFloatWindow() {
        var box = callFloatWindow || document.getElementById('call-float-window');
        if (!box) return;
        box.style.display = 'none';
        box.setAttribute('aria-hidden', 'true');
        box.classList.remove('is-dragging');
    }

    function restoreCallFromFloat() {
        if (floatSuppressClick) return;
        if (!isActive) {
            hideCallFloatWindow();
            return;
        }
        var state = window.voiceCallState && typeof window.voiceCallState === 'object' ? window.voiceCallState : {};
        var roleId = state.roleId || window.currentChatRole || '';
        try {
            if (!roleId) roleId = localStorage.getItem('currentChatId') || '';
        } catch (e) { }
        var chatView = document.getElementById('chat-view');
        var chatHidden = !chatView || chatView.style.display === 'none' || !document.body.classList.contains('chat-view-active');
        var shouldEnterChat = chatHidden || (roleId && String(window.currentChatRole || '') !== String(roleId));
        if (roleId && shouldEnterChat && typeof window.enterChatRoom === 'function') {
            try {
                window.enterChatRoom(roleId);
            } catch (e2) { }
        }
        setTimeout(function () {
            getElements();
            hideCallFloatWindow();
            if (callOverlay) {
                callOverlay.classList.add('active');
                callOverlay.classList.remove('closing');
            }
        }, shouldEnterChat ? 80 : 0);
    }

    function bindFloatWindowDrag(floatWindow) {
        if (!floatWindow || floatWindow.dataset.dragBound === '1') return;
        floatWindow.dataset.dragBound = '1';

        floatWindow.addEventListener('pointerdown', function (event) {
            if (event.button != null && event.button !== 0) return;
            var rect = floatWindow.getBoundingClientRect();
            floatDragState.active = true;
            floatDragState.moved = false;
            floatDragState.pointerId = event.pointerId;
            floatDragState.startX = event.clientX;
            floatDragState.startY = event.clientY;
            floatDragState.originX = rect.left;
            floatDragState.originY = rect.top;
            floatWindow.classList.add('is-dragging');
            try {
                floatWindow.setPointerCapture(event.pointerId);
            } catch (e) { }
        });

        floatWindow.addEventListener('pointermove', function (event) {
            if (!floatDragState.active || event.pointerId !== floatDragState.pointerId) return;
            var dx = event.clientX - floatDragState.startX;
            var dy = event.clientY - floatDragState.startY;
            if (!floatDragState.moved && Math.abs(dx) + Math.abs(dy) > 6) {
                floatDragState.moved = true;
            }
            if (!floatDragState.moved) return;
            event.preventDefault();
            var pos = clampFloatPosition(floatDragState.originX + dx, floatDragState.originY + dy, floatWindow);
            floatWindow.style.left = pos.x + 'px';
            floatWindow.style.top = pos.y + 'px';
            floatWindow.style.right = 'auto';
            floatWindow.style.bottom = 'auto';
        });

        function finishDrag(event) {
            if (!floatDragState.active) return;
            if (event && typeof event.pointerId === 'number' && floatDragState.pointerId !== null && event.pointerId !== floatDragState.pointerId) return;
            var moved = !!floatDragState.moved;
            if (moved) {
                var rect = floatWindow.getBoundingClientRect();
                var pos = clampFloatPosition(rect.left, rect.top, floatWindow);
                saveFloatPositionPref(pos.x, pos.y);
                applyFloatPosition(floatWindow);
                floatSuppressClick = true;
                setTimeout(function () {
                    floatSuppressClick = false;
                }, 80);
            }
            try {
                if (floatDragState.pointerId !== null) {
                    floatWindow.releasePointerCapture(floatDragState.pointerId);
                }
            } catch (e) { }
            floatWindow.classList.remove('is-dragging');
            floatDragState.active = false;
            floatDragState.moved = false;
            floatDragState.pointerId = null;
        }

        floatWindow.addEventListener('pointerup', finishDrag);
        floatWindow.addEventListener('pointercancel', finishDrag);
        floatWindow.addEventListener('lostpointercapture', finishDrag);
        floatWindow.addEventListener('click', restoreCallFromFloat);
        floatWindow.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                restoreCallFromFloat();
            }
        });
        window.addEventListener('resize', function () {
            if (floatWindow.style.display !== 'none') applyFloatPosition(floatWindow);
        });
    }

    function syncFloatWithChatVisibility() {
        if (!isActive) return;
        getElements();
        if (!callOverlay || !callOverlay.classList.contains('active')) return;
        var chatView = document.getElementById('chat-view');
        var chatHidden = !chatView || chatView.style.display === 'none' || !document.body.classList.contains('chat-view-active');
        if (chatHidden) {
            minimize();
        }
    }

    function bindChatVisibilityWatcher() {
        if (chatVisibilityObserverBound || !document.body || typeof MutationObserver !== 'function') return;
        chatVisibilityObserverBound = true;
        var observer = new MutationObserver(function () {
            setTimeout(syncFloatWithChatVisibility, 0);
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        var chatView = document.getElementById('chat-view');
        if (chatView) observer.observe(chatView, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    function configureNormalButtons() {
        if (callMinimize) callMinimize.style.display = '';
        if (callMute) {
            callMute.style.display = '';
            callMute.className = 'call-btn btn-mute';
            callMute.classList.remove('input-open', 'muted');
            setButtonIconAndText(callMute, callMode === 'connected' ? 'bx bx-microphone' : 'bx bx-microphone-off', callMode === 'connected' ? '说话' : '静音');
        }
        if (callHangup) {
            callHangup.style.display = '';
            callHangup.className = 'call-btn btn-hangup';
            setButtonIconAndText(callHangup, 'bx bxs-phone-off', '');
            var dynamicLabel = callHangup.querySelector('.call-btn-label');
            if (dynamicLabel) dynamicLabel.remove();
        }
        if (callSpeaker) {
            callSpeaker.style.display = '';
            callSpeaker.className = 'call-btn btn-speaker';
            setButtonIconAndText(callSpeaker, 'bx bx-volume-full', '免提');
        }
    }

    function configureIncomingButtons(isVideo) {
        if (callMinimize) callMinimize.style.display = 'none';
        if (callMute) {
            callMute.style.display = '';
            callMute.className = 'call-btn btn-mute call-accept';
            setButtonIconAndText(callMute, isVideo ? 'bx bx-video' : 'bx bxs-phone-call', '接听');
        }
        if (callHangup) {
            callHangup.style.display = '';
            callHangup.className = 'call-btn btn-hangup call-reject';
            setButtonIconAndText(callHangup, 'bx bxs-phone-off', '');
            ensureButtonText(callHangup, '挂断');
        }
        if (callSpeaker) callSpeaker.style.display = 'none';
    }

    function setMode(mode, options) {
        getElements();
        callMode = mode || 'idle';
        var opts = options || {};
        if (!callOverlay) return;
        callOverlay.classList.toggle('is-incoming', callMode === 'incoming');
        callOverlay.classList.toggle('is-connected', callMode === 'connected');
        callOverlay.classList.toggle('is-video-call', !!opts.isVideo);
    }

    function getElements() {
        callOverlay = document.getElementById('callOverlay');
        callBgBlur = document.getElementById('callBgBlur');
        callUserAvatar = document.getElementById('callUserAvatar');
        callUserName = document.getElementById('callUserName');
        callStatusText = document.getElementById('callStatusText');
        callTimer = document.getElementById('callTimer');
        callMinimize = document.getElementById('callMinimize');
        callMute = document.getElementById('callMute');
        callHangup = document.getElementById('callHangup');
        callSpeaker = document.getElementById('callSpeaker');
        ripples = document.querySelectorAll('.ripple');
    }

    function showKoreanVoiceCallUI(userData) {
        if (!userData || typeof userData !== 'object') {
            console.error('[韩系通话] 缺少用户数据');
            return;
        }

        getElements();
        if (!callOverlay) {
            console.error('[韩系通话] 找不到通话界面元素');
            return;
        }

        var name = userData.name || userData.nickName || '未知';
        var avatar = userData.avatar || '../assets/images/touxiang.jpg';

        if (callUserName) callUserName.textContent = name;
        if (callUserAvatar) callUserAvatar.src = avatar;
        if (callBgBlur) callBgBlur.style.backgroundImage = "url('" + avatar + "')";
        if (callStatusText) callStatusText.textContent = '正在呼叫...';
        if (callTimer) callTimer.textContent = '00:00';
        seconds = 0;
        isMuted = false;
        isSpeakerOn = false;
        incomingAcceptHandler = null;
        incomingRejectHandler = null;
        setMode('ringing', { isVideo: !!userData.isVideo });
        setIncomingPrompt('');
        setCallChatVisible(false);
        setCallInputVisible(false);
        configureNormalButtons();
        hideCallFloatWindow();

        if (callMute) {
            callMute.classList.remove('muted');
            setButtonIconAndText(callMute, 'bx bx-microphone-off', '静音');
        }

        if (callSpeaker) callSpeaker.classList.remove('speaker-on');

        callOverlay.classList.remove('closing');
        callOverlay.classList.add('active');
        isActive = true;

        startWaveSimulation();
    };

    function showKoreanIncomingCallUI(userData, handlers) {
        if (!userData || typeof userData !== 'object') {
            console.error('[韩系通话] 缺少来电数据');
            return;
        }

        getElements();
        if (!callOverlay) {
            console.error('[韩系通话] 找不到通话界面元素');
            return;
        }

        var isVideo = !!userData.isVideo;
        var name = userData.name || userData.nickName || '未知';
        var avatar = userData.avatar || '../assets/images/touxiang.jpg';
        incomingAcceptHandler = handlers && typeof handlers.onAccept === 'function' ? handlers.onAccept : null;
        incomingRejectHandler = handlers && typeof handlers.onReject === 'function' ? handlers.onReject : null;

        if (callUserName) callUserName.textContent = name;
        if (callUserAvatar) callUserAvatar.src = avatar;
        if (callBgBlur) callBgBlur.style.backgroundImage = "url('" + avatar + "')";
        if (callStatusText) callStatusText.textContent = '来电中...';
        if (callTimer) callTimer.textContent = '';
        setMode('incoming', { isVideo: isVideo });
        setIncomingPrompt(userData.promptText || (isVideo ? '对方邀请你视频通话' : '对方邀请你语音通话'));
        setCallChatVisible(false);
        setCallInputVisible(false);
        configureIncomingButtons(isVideo);
        hideCallFloatWindow();

        seconds = 0;
        isMuted = false;
        isSpeakerOn = false;
        callOverlay.classList.remove('closing');
        callOverlay.classList.add('active');
        isActive = true;
        startWaveSimulation();
    }

    window.setKoreanCallStatus = function (text) {
        if (callStatusText) {
            callStatusText.textContent = text;
        }
    };

    window.startKoreanCallTimer = function () {
        if (isActive) {
            setMode('connected', { isVideo: callOverlay && callOverlay.classList.contains('is-video-call') });
            incomingAcceptHandler = null;
            incomingRejectHandler = null;
            setIncomingPrompt('');
            setCallChatVisible(true);
            setCallInputVisible(false);
            configureNormalButtons();
            if (callStatusText) callStatusText.textContent = '正在通话中...';
            startTimer();
        }
    };

    function startTimer() {
        stopTimer();
        seconds = 0;
        timerInterval = setInterval(function () {
            seconds++;
            var m = Math.floor(seconds / 60);
            var s = seconds % 60;
            if (callTimer) {
                callTimer.textContent =
                    String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
            }
            updateCallFloatTimer();
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function startWaveSimulation() {
        stopWaveSimulation();
        waveInterval = setInterval(function () {
            if (!ripples || !isActive) return;
            ripples.forEach(function (ripple, index) {
                var baseDuration = 3 + (index * 0.5);
                var randomOffset = (Math.random() - 0.5) * 1.2;
                var newDuration = baseDuration + randomOffset;
                ripple.style.animationDuration = newDuration + 's';

                var randomScale = 1.6 + Math.random() * 0.4;
                ripple.style.setProperty('--ripple-scale', randomScale);

                var randomOpacity = 0.35 + Math.random() * 0.15;
                ripple.style.opacity = randomOpacity;
            });
        }, 500);
    }

    function stopWaveSimulation() {
        if (waveInterval) {
            clearInterval(waveInterval);
            waveInterval = null;
        }
    }

    function hideCallOnly() {
        if (!isActive) return;
        isActive = false;

        stopTimer();
        stopWaveSimulation();
        incomingAcceptHandler = null;
        incomingRejectHandler = null;
        if (typeof window.showCallAILoading === 'function') {
            window.showCallAILoading(false);
        }
        hideCallFloatWindow();

        if (callOverlay) callOverlay.classList.add('closing');

        setTimeout(function () {
            if (callOverlay) callOverlay.classList.remove('active', 'closing', 'is-incoming', 'is-connected', 'is-video-call');
            setMode('idle');
        }, 450);
    }

    function endCall() {
        if (!isActive) return;
        hideCallOnly();

        // 如果用户主动挂断，也要通知底层的业务逻辑 (如存在)
        if (typeof window.endVoiceCall === 'function') {
            window.endVoiceCall(true); // true 表示 userHangup
        }
    }

    function toggleMute() {
        isMuted = !isMuted;
        if (!callMute) return;
        if (isMuted) {
            callMute.classList.add('muted');
            setButtonIconAndText(callMute, 'bx bx-microphone', '取消');
        } else {
            callMute.classList.remove('muted');
            setButtonIconAndText(callMute, 'bx bx-microphone-off', '静音');
        }
    }

    function toggleCallInput() {
        var inputRow = document.getElementById('call-input-row');
        var inputEl = document.getElementById('voice-call-input');
        if (!inputRow) return;
        var willOpen = inputRow.style.display === 'none' || !inputRow.style.display;
        inputRow.style.display = willOpen ? 'flex' : 'none';
        if (callMute) {
            callMute.classList.toggle('input-open', willOpen);
            setButtonIconAndText(callMute, willOpen ? 'bx bx-chevron-down' : 'bx bx-microphone', willOpen ? '收起' : '说话');
        }
        if (willOpen && inputEl) {
            setTimeout(function () {
                inputEl.focus();
            }, 20);
        }
    }

    function toggleSpeaker() {
        isSpeakerOn = !isSpeakerOn;
        if (isSpeakerOn) {
            callSpeaker.classList.add('speaker-on');
        } else {
            callSpeaker.classList.remove('speaker-on');
        }
    }

    function minimize() {
        if (!isActive) return;
        showCallFloatWindow();
        if (callOverlay) callOverlay.classList.remove('active');
    }

    function bindEvents() {
        getElements();
        ensureCallFloatWindow();
        bindChatVisibilityWatcher();

        if (callMinimize) {
            callMinimize.addEventListener('click', minimize);
        }

        if (callMute) {
            callMute.addEventListener('click', function () {
                if (callMode === 'incoming') {
                    var handler = incomingAcceptHandler;
                    if (handler) handler();
                    return;
                }
                if (callMode === 'connected') {
                    toggleCallInput();
                    return;
                }
                toggleMute();
            });
        }

        if (callHangup) {
            callHangup.addEventListener('click', function () {
                if (callMode === 'incoming') {
                    var handler = incomingRejectHandler;
                    hideCallOnly();
                    if (handler) handler();
                    return;
                }
                endCall();
            });
        }

        if (callSpeaker) {
            callSpeaker.addEventListener('click', toggleSpeaker);
        }

        applyFloatPosition(callFloatWindow);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindEvents);
    } else {
        bindEvents();
    }

    window.showKoreanVoiceCallUI = showKoreanVoiceCallUI;
    window.showKoreanIncomingCallUI = showKoreanIncomingCallUI;
    if (typeof window.startVoiceCall !== 'function') {
        window.startVoiceCall = showKoreanVoiceCallUI;
    }
    window.endKoreanVoiceCall = endCall;
    window.hideKoreanCallUIOnly = hideCallOnly;
    window.toggleKoreanCallInput = toggleCallInput;
    window.minimizeKoreanCallUI = minimize;
    window.isKoreanCallActive = function () { return isActive; };
})();
