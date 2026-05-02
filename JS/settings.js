/* =========================================================
   文件路径：JS脚本文件夹/settings.js
   作用：管理系统设置（API配置、模型拉取、温度控制、保存）
   ========================================================= */

// 1. 打开设置 App
function openSettingsApp() {
    const appWindow = document.getElementById('app-window');
    const title = document.getElementById('app-title-text');
    const content = document.getElementById('app-content-area');

    if (!appWindow) return;

    title.innerText = "系统设置";

    // 绑定返回键自动保存
    const backBtn = document.querySelector('.app-header .back-btn');
    if (backBtn && !backBtn._settingsSaveBound) {
        backBtn._settingsSaveBound = true;
        const oldOnClick = backBtn.onclick;
        backBtn.onclick = function(e) {
            if (title.innerText === "系统设置") {
                if (typeof saveAllSettings === 'function') {
                    saveAllSettings(true); // 传入 true 以静默保存
                }
            }
            if (typeof oldOnClick === 'function') {
                oldOnClick.call(this, e);
            }
        };
    }

    try {
        if (title && !title._devUnlockBound) {
            title._devUnlockBound = true;
            let tapCount = 0;
            let lastTapAt = 0;
            const DEV_UNLOCK_CODE = '2580';
            title.addEventListener('click', function () {
                const now = Date.now();
                if (now - lastTapAt > 1200) tapCount = 0;
                lastTapAt = now;
                tapCount++;
                if (tapCount < 7) return;
                tapCount = 0;

                const cur = localStorage.getItem('dev_mode_unlocked') === 'true';
                if (cur) {
                    const lock = confirm('已解锁开发者模式。是否要锁定并隐藏调试项？');
                    if (lock) {
                        localStorage.setItem('dev_mode_unlocked', 'false');
                        if (window.updateSystemPromptDebugUI) window.updateSystemPromptDebugUI();
                        renderSettingsUI(content);
                    }
                    return;
                }

                const code = prompt('输入开发者口令以解锁调试功能：');
                if (code === null) return;
                if (String(code || '').trim() === DEV_UNLOCK_CODE) {
                    localStorage.setItem('dev_mode_unlocked', 'true');
                    alert('✅ 开发者模式已解锁。');
                    renderSettingsUI(content);
                } else {
                    alert('❌ 口令错误。');
                }
            });
        }
    } catch (e) { }

    renderSettingsUI(content);
    appWindow.classList.add('active');
}

function escapeSettingsHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function readApiPresetList() {
    try {
        const raw = localStorage.getItem('api_settings_presets_v1') || '[]';
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function writeApiPresetList(list) {
    try {
        localStorage.setItem('api_settings_presets_v1', JSON.stringify(Array.isArray(list) ? list : []));
    } catch (e) { }
}

function buildCurrentApiSettingsSnapshot() {
    const urlEl = document.getElementById('setting-api-url');
    const keyEl = document.getElementById('setting-api-key');
    const modelEl = document.getElementById('setting-model-select');
    const tempEl = document.getElementById('setting-temp-slider');
    const summaryUrlEl = document.getElementById('setting-summary-api-url');
    const summaryKeyEl = document.getElementById('setting-summary-api-key');
    const summaryModelEl = document.getElementById('setting-summary-model');
    return {
        baseUrl: urlEl ? String(urlEl.value || '').trim() : '',
        apiKey: keyEl ? String(keyEl.value || '').trim() : '',
        model: modelEl ? String(modelEl.value || '').trim() : '',
        temperature: tempEl ? String(tempEl.value || '').trim() : '0.7',
        summaryBaseUrl: summaryUrlEl ? String(summaryUrlEl.value || '').trim() : '',
        summaryApiKey: summaryKeyEl ? String(summaryKeyEl.value || '').trim() : '',
        summaryModel: summaryModelEl ? String(summaryModelEl.value || '').trim() : ''
    };
}

function rerenderSettingsAppIfOpen() {
    const content = document.getElementById('app-content-area');
    const title = document.getElementById('app-title-text');
    if (!content || !title) return;
    if (String(title.innerText || '').trim() !== '系统设置') return;
    renderSettingsUI(content);
}

const APP_SW_CACHE_PREFIX = 'shubao-phone-dev-';

function parseAppShellVersionFromText(text) {
    const src = String(text || '');
    if (!src) return '';
    const direct = src.match(/APP_SHELL_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (direct && direct[1]) return String(direct[1]).trim();
    const cache = src.match(/CACHE_NAME\s*=\s*['"]shubao-phone-dev-([^'"]+)['"]/);
    return cache && cache[1] ? String(cache[1]).trim() : '';
}

function compareVersionLike(a, b) {
    const left = String(a || '').trim();
    const right = String(b || '').trim();
    if (!left && !right) return 0;
    if (!left) return -1;
    if (!right) return 1;
    const la = left.split(/[^0-9A-Za-z]+/).filter(Boolean);
    const lb = right.split(/[^0-9A-Za-z]+/).filter(Boolean);
    const len = Math.max(la.length, lb.length);
    for (let i = 0; i < len; i++) {
        const aa = la[i] || '';
        const bb = lb[i] || '';
        const na = /^\d+$/.test(aa) ? Number(aa) : NaN;
        const nb = /^\d+$/.test(bb) ? Number(bb) : NaN;
        if (!Number.isNaN(na) && !Number.isNaN(nb)) {
            if (na !== nb) return na > nb ? 1 : -1;
            continue;
        }
        if (aa !== bb) return aa > bb ? 1 : -1;
    }
    return 0;
}

async function fetchLatestAppShellVersion() {
    try {
        const resp = await fetch('./sw.js?ts=' + Date.now(), { cache: 'no-store' });
        if (!resp.ok) return '';
        const text = await resp.text();
        return parseAppShellVersionFromText(text);
    } catch (e) {
        return '';
    }
}

async function detectInstalledAppShellVersion() {
    try {
        if ('caches' in window) {
            const names = await caches.keys();
            const matched = names.filter(function (name) {
                return String(name || '').indexOf(APP_SW_CACHE_PREFIX) === 0;
            }).sort();
            if (matched.length) {
                return String(matched[matched.length - 1]).slice(APP_SW_CACHE_PREFIX.length);
            }
        }
    } catch (e) { }
    try {
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (let i = 0; i < regs.length; i++) {
                const reg = regs[i];
                const worker = reg && (reg.waiting || reg.active || reg.installing);
                const url = worker && worker.scriptURL ? String(worker.scriptURL) : '';
                if (!url) continue;
                const resp = await fetch(url, { cache: 'no-store' });
                if (!resp.ok) continue;
                const text = await resp.text();
                const parsed = parseAppShellVersionFromText(text);
                if (parsed) return parsed;
            }
        }
    } catch (e2) { }
    return '';
}

function setAppVersionStatus(text, tone) {
    const el = document.getElementById('settings-app-version-status');
    if (!el) return;
    const palette = {
        neutral: '#6b7280',
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#2563eb'
    };
    el.style.color = palette[tone] || palette.neutral;
    el.textContent = String(text || '');
}

function fillAppVersionRow(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = String(value || '未检测到');
}

async function refreshSettingsVersionInfo(options) {
    const forceNetwork = !!(options && options.forceNetwork);
    fillAppVersionRow('settings-current-version', '检测中...');
    fillAppVersionRow('settings-latest-version', '检测中...');
    setAppVersionStatus(forceNetwork ? '正在检查更新...' : '正在读取版本信息...', 'neutral');

    const current = await detectInstalledAppShellVersion();
    const latest = await fetchLatestAppShellVersion();

    fillAppVersionRow('settings-current-version', current || '未检测到');
    fillAppVersionRow('settings-latest-version', latest || '未检测到');

    if (!latest && !current) {
        setAppVersionStatus('当前无法识别版本信息，可能是网络不可用或 Service Worker 尚未就绪。', 'warning');
        return { currentVersion: '', latestVersion: '', hasUpdate: false };
    }

    if (latest && current) {
        const cmp = compareVersionLike(latest, current);
        if (cmp > 0) {
            setAppVersionStatus('检测到新版本，可以在这里直接更新。', 'info');
            return { currentVersion: current, latestVersion: latest, hasUpdate: true };
        }
        setAppVersionStatus('当前已经是最新版本。', 'success');
        return { currentVersion: current, latestVersion: latest, hasUpdate: false };
    }

    setAppVersionStatus('已读取到部分版本信息；如果应用表现不对，可以手动点一次更新。', 'warning');
    return { currentVersion: current, latestVersion: latest, hasUpdate: !!latest && !current };
}

async function updateAppToLatestVersion() {
    if (!('serviceWorker' in navigator)) {
        alert('当前环境不支持应用内更新。');
        return;
    }

    const btn = document.getElementById('settings-update-app-btn');
    const oldText = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = '正在更新...';
        btn.style.opacity = '0.7';
    }

    try {
        setAppVersionStatus('正在向服务器检查并拉取最新版本...', 'info');

        let refreshed = false;
        const onControllerChange = function () {
            if (refreshed) return;
            refreshed = true;
            try { navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange); } catch (e0) { }
            window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        const registrations = await navigator.serviceWorker.getRegistrations();
        if (!registrations.length) {
            await navigator.serviceWorker.register('./sw.js');
        }

        const regs = await navigator.serviceWorker.getRegistrations();
        if (!regs.length) throw new Error('没有可用的 Service Worker 注册');

        let waitingWorker = null;
        for (let i = 0; i < regs.length; i++) {
            const reg = regs[i];
            await reg.update().catch(function () { });
            if (reg.waiting) {
                waitingWorker = reg.waiting;
                break;
            }
            if (reg.installing) {
                waitingWorker = await new Promise(function (resolve) {
                    const installing = reg.installing;
                    if (!installing) {
                        resolve(null);
                        return;
                    }
                    const done = function () {
                        if (installing.state === 'installed' && reg.waiting) resolve(reg.waiting);
                        else if (installing.state === 'redundant') resolve(null);
                    };
                    installing.addEventListener('statechange', done);
                    setTimeout(function () {
                        resolve(reg.waiting || null);
                    }, 4000);
                });
                if (waitingWorker) break;
            }
        }

        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            setAppVersionStatus('新版本已接管，正在刷新页面...', 'success');
            setTimeout(function () {
                if (!refreshed) window.location.reload();
            }, 1800);
            return;
        }

        const versionInfo = await refreshSettingsVersionInfo({ forceNetwork: true });
        if (versionInfo.hasUpdate) {
            setAppVersionStatus('已检测到新版本，但浏览器还没完成接管。请再点一次更新。', 'warning');
        } else {
            setAppVersionStatus('已经检查完成，当前就是最新版本。', 'success');
        }
    } catch (error) {
        console.error('应用内更新失败', error);
        setAppVersionStatus('更新失败：' + (error && error.message ? error.message : '未知错误'), 'danger');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = oldText || '立即更新';
            btn.style.opacity = '1';
        }
    }
}

function fillSettingsFormFromPreset(preset) {
    const data = preset && typeof preset === 'object' ? preset : {};
    const urlEl = document.getElementById('setting-api-url');
    const keyEl = document.getElementById('setting-api-key');
    const modelEl = document.getElementById('setting-model-select');
    const tempEl = document.getElementById('setting-temp-slider');
    const tempDisplay = document.getElementById('temp-display');
    const summaryUrlEl = document.getElementById('setting-summary-api-url');
    const summaryKeyEl = document.getElementById('setting-summary-api-key');
    const summaryModelEl = document.getElementById('setting-summary-model');
    if (urlEl) urlEl.value = String(data.baseUrl || '');
    if (keyEl) keyEl.value = String(data.apiKey || '');
    if (modelEl) {
        const nextModel = String(data.model || '').trim();
        if (nextModel) {
            const exists = Array.from(modelEl.options || []).some(function (opt) {
                return String(opt.value || '') === nextModel;
            });
            if (!exists) {
                const option = document.createElement('option');
                option.value = nextModel;
                option.innerText = nextModel + ' (预设)';
                modelEl.appendChild(option);
            }
            modelEl.value = nextModel;
        }
    }
    if (tempEl) tempEl.value = String(data.temperature != null ? data.temperature : '0.7');
    if (tempDisplay) tempDisplay.innerText = String(data.temperature != null ? data.temperature : '0.7');
    if (summaryUrlEl) summaryUrlEl.value = String(data.summaryBaseUrl || '');
    if (summaryKeyEl) summaryKeyEl.value = String(data.summaryApiKey || '');
    if (summaryModelEl) summaryModelEl.value = String(data.summaryModel || '');
}

function getSelectedApiPreset() {
    const select = document.getElementById('setting-preset-select');
    const presetId = select ? String(select.value || '').trim() : '';
    if (!presetId) return null;
    const presets = readApiPresetList();
    for (let i = 0; i < presets.length; i++) {
        const preset = presets[i];
        if (preset && String(preset.id || '') === presetId) return preset;
    }
    return null;
}

function applySelectedApiPreset() {
    const preset = getSelectedApiPreset();
    if (!preset) {
        alert('请先选择一个预设');
        return;
    }
    try { localStorage.setItem('api_settings_last_preset_id', String(preset.id || '')); } catch (e) { }
    fillSettingsFormFromPreset(preset);
    alert(`✅ 已套用预设：${preset.name || '未命名预设'}`);
}

function saveCurrentApiPreset() {
    const snapshot = buildCurrentApiSettingsSnapshot();
    if (!snapshot.baseUrl || !snapshot.model) {
        alert('请先填写 API 地址并选择模型，再保存为预设');
        return;
    }
    const defaultName = snapshot.baseUrl.replace(/^https?:\/\//i, '') + ' / ' + snapshot.model;
    const inputName = prompt('给这个 API 预设起个名字：', defaultName);
    if (inputName === null) return;
    const name = String(inputName || '').trim();
    if (!name) {
        alert('预设名称不能为空');
        return;
    }
    const presets = readApiPresetList();
    const existingIndex = presets.findIndex(function (item) {
        return item && String(item.name || '').trim() === name;
    });
    const record = {
        id: existingIndex >= 0 && presets[existingIndex] && presets[existingIndex].id
            ? presets[existingIndex].id
            : ('preset_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)),
        name: name,
        baseUrl: snapshot.baseUrl,
        apiKey: snapshot.apiKey,
        model: snapshot.model,
        temperature: snapshot.temperature,
        summaryBaseUrl: snapshot.summaryBaseUrl,
        summaryApiKey: snapshot.summaryApiKey,
        summaryModel: snapshot.summaryModel,
        updatedAt: Date.now()
    };
    if (existingIndex >= 0) {
        presets.splice(existingIndex, 1, record);
    } else {
        presets.unshift(record);
    }
    writeApiPresetList(presets.slice(0, 30));
    try { localStorage.setItem('api_settings_last_preset_id', record.id); } catch (e) { }
    rerenderSettingsAppIfOpen();
    setTimeout(function () {
        const select = document.getElementById('setting-preset-select');
        if (select) select.value = record.id;
    }, 0);
    alert(`✅ 预设已保存：${name}`);
}

function deleteSelectedApiPreset() {
    const preset = getSelectedApiPreset();
    if (!preset) {
        alert('请先选择一个预设');
        return;
    }
    if (!confirm(`确定删除预设「${preset.name || '未命名预设'}」吗？`)) return;
    const presets = readApiPresetList().filter(function (item) {
        return !(item && String(item.id || '') === String(preset.id || ''));
    });
    writeApiPresetList(presets);
    try {
        const lastId = localStorage.getItem('api_settings_last_preset_id') || '';
        if (String(lastId) === String(preset.id || '')) {
            localStorage.removeItem('api_settings_last_preset_id');
        }
    } catch (e) { }
    rerenderSettingsAppIfOpen();
    alert('已删除预设');
}

window.applySelectedApiPreset = applySelectedApiPreset;
window.saveCurrentApiPreset = saveCurrentApiPreset;
window.deleteSelectedApiPreset = deleteSelectedApiPreset;
window.refreshSettingsVersionInfo = refreshSettingsVersionInfo;
window.updateAppToLatestVersion = updateAppToLatestVersion;

// 2. 渲染 UI 界面
function renderSettingsUI(container) {
    const savedUrl = localStorage.getItem('api_base_url') || "";
    const savedKey = localStorage.getItem('user_api_key') || "";
    const savedModel = localStorage.getItem('selected_model') || "gpt-3.5-turbo";
    const savedSummaryUrl = localStorage.getItem('summary_api_base_url') || "";
    const savedSummaryKey = localStorage.getItem('summary_user_api_key') || "";
    const savedSummaryModel = localStorage.getItem('summary_selected_model') || "";
    // 新增：读取温度，默认为 0.7
    const savedTemp = localStorage.getItem('model_temperature') || "0.7";
    const presets = readApiPresetList();
    const lastPresetId = localStorage.getItem('api_settings_last_preset_id') || '';
    const presetOptionsHtml = presets.length
        ? presets.map(function (preset) {
            const id = escapeSettingsHtml(preset.id || '');
            const name = escapeSettingsHtml(preset.name || '未命名预设');
            const url = escapeSettingsHtml(preset.baseUrl || '');
            const model = escapeSettingsHtml(preset.model || '');
            const temp = escapeSettingsHtml(String(preset.temperature != null ? preset.temperature : '0.7'));
            const selected = String(preset.id || '') === String(lastPresetId || '') ? ' selected' : '';
            return `<option value="${id}"${selected}>${name} | ${url || '未填地址'} | ${model || '未选模型'} | T=${temp}</option>`;
        }).join('')
        : '<option value="">暂无保存的预设</option>';
    const isDevUnlocked = localStorage.getItem('dev_mode_unlocked') === 'true';
    const promptHistory = isDevUnlocked ? getDevAiPromptHistoryForDisplay() : [];
    let devAiFailCount = 0;
    try {
        if (isDevUnlocked) {
            const raw = localStorage.getItem('dev_ai_parse_failures_v1') || '[]';
            const parsed = JSON.parse(raw);
            devAiFailCount = Array.isArray(parsed) ? parsed.length : 0;
        }
    } catch (e) { devAiFailCount = 0; }

    container.innerHTML = `
        <div class="min-h-full bg-gray-50 pb-28 pt-4 px-4 font-sans">
            <!-- 大标题 -->
            <div class="mb-5 px-1">
                <h2 class="text-2xl font-bold text-gray-800 tracking-tight">系统设置</h2>
                <p class="text-xs text-gray-500 mt-1">配置您的模型与应用偏好</p>
            </div>

            <!-- 核心模型配置 -->
            <div class="mb-6">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">大模型服务</h3>
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <!-- API 地址 -->
                    <div class="p-4 border-b border-gray-50">
                        <label class="block text-sm font-medium text-gray-700 mb-1.5">API 地址 (Base URL)</label>
                        <input type="text" id="setting-api-url" value="${savedUrl}" placeholder="例如 https://api.deepseek.com" 
                            class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
                        <p class="text-[11px] text-gray-400 mt-1.5 flex items-center"><i class='bx bx-info-circle mr-1'></i>会自动检测是否需要加 /v1</p>
                    </div>

                    <!-- API Key -->
                    <div class="p-4 border-b border-gray-50">
                        <label class="block text-sm font-medium text-gray-700 mb-1.5">API Key (密钥)</label>
                        <input type="password" id="setting-api-key" value="${savedKey}" placeholder="sk-..." 
                            class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
                        <div class="mt-2 flex justify-end">
                            <button onclick="testApiConnection('main')" class="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center">
                                <i class='bx bx-check-shield mr-1'></i>测试连接
                            </button>
                        </div>
                    </div>

                    <!-- 选择模型 -->
                    <div class="p-4 border-b border-gray-50">
                        <div class="flex justify-between items-center mb-1.5">
                            <label class="block text-sm font-medium text-gray-700">选择模型</label>
                            <button onclick="fetchModelList('main')" class="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center">
                                <i class='bx bx-refresh mr-1'></i>拉取列表
                            </button>
                        </div>
                        <select id="setting-model-select" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none">
                            <option value="${savedModel}">${savedModel} (当前)</option>
                        </select>
                        <p id="fetch-status" class="text-[11px] text-gray-500 mt-1.5 min-h-[16px]"></p>
                    </div>

                    <!-- 温度控制 -->
                    <div class="p-4">
                        <div class="flex justify-between items-center mb-2">
                            <label class="block text-sm font-medium text-gray-700">模型温度 (Temperature)</label>
                            <span id="temp-display" class="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-sm">${savedTemp}</span>
                        </div>
                        <input type="range" id="setting-temp-slider" min="0" max="2" step="0.1" value="${savedTemp}" 
                            class="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2"
                            oninput="document.getElementById('temp-display').innerText = this.value">
                        <div class="flex justify-between text-[10px] font-medium text-gray-400 mt-2">
                            <span>0.0 (严谨)</span>
                            <span>1.0 (平衡)</span>
                            <span>2.0 (发散)</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 预设管理 -->
            <div class="mb-6">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">预设管理</h3>
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <select id="setting-preset-select" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm mb-3 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none truncate">
                        ${presetOptionsHtml}
                    </select>
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="applySelectedApiPreset()" class="col-span-2 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-200 flex justify-center items-center">
                            <i class='bx bx-check-circle mr-1.5'></i>套用选中预设
                        </button>
                        <button onclick="saveCurrentApiPreset()" class="py-2 bg-green-50 hover:bg-green-100 text-green-600 border border-green-200/50 rounded-xl text-sm font-medium transition-colors">
                            保存当前
                        </button>
                        <button onclick="deleteSelectedApiPreset()" class="py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200/50 rounded-xl text-sm font-medium transition-colors">
                            删除预设
                        </button>
                    </div>
                </div>
            </div>

            <!-- 副 API -->
            <div class="mb-6">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">副 API (总结专用·可选)</h3>
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                    <div>
                        <input type="text" id="setting-summary-api-url" value="${savedSummaryUrl}" placeholder="副 API 地址 (留空则用主API)"
                            class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-gray-300 outline-none transition-all">
                    </div>
                    <div>
                        <input type="password" id="setting-summary-api-key" value="${savedSummaryKey}" placeholder="副 API Key (留空则用主API)"
                            class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-gray-300 outline-none transition-all">
                        <div class="mt-2 flex justify-end">
                            <button onclick="testApiConnection('summary')" class="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center">
                                <i class='bx bx-check-shield mr-1'></i>测试连接
                            </button>
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between items-center mb-1.5">
                            <label class="block text-sm font-medium text-gray-700">副 API 模型 (可选)</label>
                            <button onclick="fetchModelList('summary')" class="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center">
                                <i class='bx bx-refresh mr-1'></i>拉取列表
                            </button>
                        </div>
                        <select id="setting-summary-model" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm mb-2 appearance-none">
                            <option value="${savedSummaryModel}">${savedSummaryModel} (当前)</option>
                        </select>
                        <p id="summary-fetch-status" class="text-[11px] text-gray-500 mt-1.5 min-h-[16px]"></p>
                    </div>
                    <p class="text-[11px] text-gray-400 leading-relaxed">
                        手动总结和自动总结优先走副 API；若未完整配置将自动回退主 API。
                    </p>
                </div>
            </div>

            <!-- 开发者调试区域 -->
            ${isDevUnlocked ? `
            <div class="mb-6">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">开发者选项</h3>
                
                <!-- AI 调用调试中心 -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-medium text-gray-800 text-sm">AI 调用调试中心</h4>
                        <span id="dev-ai-prompt-count" class="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">最近：${promptHistory.length}/10</span>
                    </div>
                    <p class="text-[11px] text-gray-400 leading-relaxed mb-3">最近 10 条经过 callAI 的提示词都会保存在本地，支持直接复制。</p>
                    <div class="grid grid-cols-2 gap-2 mb-3">
                        <button type="button" onclick="copyLatestDevAiPromptRecord()" class="py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-medium transition-colors shadow-sm shadow-blue-200">
                            复制最新记录
                        </button>
                        <button type="button" onclick="clearDevAiPromptHistory()" class="py-2 bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 rounded-xl text-xs font-medium transition-colors">
                            清空记录
                        </button>
                    </div>
                    <button type="button" onclick="extractCurrentRoleThoughtChain()" class="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-medium transition-colors shadow-sm shadow-emerald-200">
                        提取当前角色思考链（最近50轮）
                    </button>
                    <div id="dev-thought-chain-panel" class="mt-3 border border-gray-100 rounded-xl bg-gray-50 overflow-hidden">
                        <div class="px-3 py-2 border-b border-gray-100 text-[11px] font-semibold text-gray-600">思考链提取结果</div>
                        <pre id="dev-thought-chain-output" class="m-0 whitespace-pre-wrap break-words max-h-48 overflow-y-auto text-[10px] leading-relaxed text-gray-700 p-3">点击上方按钮后，这里会显示最近 50 轮的思考链与心声。</pre>
                    </div>
                    <div id="dev-ai-prompt-history-panel" class="mt-3">
                        ${renderDevAiPromptHistoryHtml(promptHistory)}
                    </div>
                </div>

                <!-- 提示词总览 -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-medium text-gray-800 text-sm">提示词总览</h4>
                    </div>
                    <p class="text-[11px] text-gray-400 leading-relaxed">按角色查看各场景完整 prompt，包含侧影快照。</p>
                    <div id="dev-prompt-catalog-panel" class="mt-3"></div>
                </div>

                <!-- 开发者快捷调试 -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-medium text-gray-800 text-sm">快捷调试</h4>
                    </div>
                    <div class="space-y-2 mt-3">
                        <button type="button" onclick="window.showIosNotification && window.showIosNotification('assets/chushitouxiang.jpg', '神秘角色', '你在干嘛？怎么不理我！')" class="w-full py-2.5 bg-rose-400 hover:bg-rose-500 text-white rounded-xl text-xs font-medium transition-colors shadow-sm shadow-rose-200">
                            测试收到新消息
                        </button>
                        <button type="button" onclick="window.simulateCoupleSpaceCaughtChat && window.simulateCoupleSpaceCaughtChat(prompt('输入对方名字', '陌生人') || '陌生人')" class="w-full py-2.5 bg-indigo-400 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-colors shadow-sm shadow-indigo-200">
                            模拟修罗场 (发现和别人聊天)
                        </button>
                        <div class="flex flex-wrap gap-2 pt-1">
                            <button id="offline-diary-debug-3h" type="button" class="flex-1 min-w-[120px] py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-medium">离线 3h 回来</button>
                            <div class="flex items-center gap-2 flex-1 min-w-[150px]">
                                <input id="offline-diary-debug-days" type="number" min="2" max="365" value="3" class="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none text-center">
                                <button id="offline-diary-debug-days-btn" type="button" class="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-medium">模拟 N 天未打开</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- AI 降级追溯 -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-medium text-gray-800 text-sm">AI 降级追溯</h4>
                        <span class="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">记录：${devAiFailCount}</span>
                    </div>
                    <p class="text-[11px] text-gray-400 leading-relaxed mb-3">仅在解析失败触发降级时记录 AI 原始返回。</p>
                    <div class="grid grid-cols-2 gap-2">
                        <button type="button" onclick="openDevAiParseFailureLogs()" class="py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-medium transition-colors shadow-sm shadow-purple-200">
                            查看记录
                        </button>
                        <button type="button" onclick="clearDevAiParseFailureLogs()" class="py-2 bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 rounded-xl text-xs font-medium transition-colors">
                            清空记录
                        </button>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- 实验性功能 -->
            <div class="mb-6">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">实验性功能</h3>
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-medium text-gray-800 text-sm">静音保活</h4>
                    </div>
                    <p class="text-[11px] text-gray-500 mb-3">
                        ${(() => { const s = getSilentKeepAliveHackState(); return `状态：<span class="${s.enabled ? 'text-green-500' : 'text-gray-400'}">${s.enabled ? '已开启' : '已关闭'}</span> ｜ 播放态：${s.playing ? '正在循环' : '未在播放'}`; })()}
                    </p>
                    <button type="button" onclick="toggleExperimentalSilentKeepAlive()" class="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-sky-200 mb-3">
                        ${(() => { const s = getSilentKeepAliveHackState(); return s.enabled ? '关闭静音保活' : '开启静音保活'; })()}
                    </button>
                    <p class="text-[10px] text-gray-400 leading-relaxed pb-3 border-b border-gray-50">通过循环播放内嵌静音音频尝试后台保活。不保证所有机型有效。</p>
                    
                    <div class="pt-3">
                        <p class="text-[11px] text-gray-500 mb-3">
                            ${(() => { const s = getBrowserNotificationState(); return `浏览器通知：${s.supported ? '支持' : '不支持'} ｜ 权限：${s.permission}`; })()}
                        </p>
                        <div class="grid grid-cols-3 gap-2">
                            <button type="button" onclick="enableBrowserNotificationsForExperiment()" class="py-2 bg-green-50 text-green-600 rounded-xl text-xs font-medium">
                                开启通知
                            </button>
                            <button type="button" onclick="testBrowserNotificationForExperiment()" class="py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-medium">
                                测试弹窗
                            </button>
                            <button type="button" onclick="disableBrowserNotificationsForExperiment()" class="py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-medium">
                                关闭通知
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 应用信息 -->
            <div class="mb-6">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">关于应用</h3>
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-medium text-gray-800 text-sm">版本与更新</h4>
                        <button type="button" onclick="refreshSettingsVersionInfo({ forceNetwork: true })" class="text-[11px] text-gray-500 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors">
                            重新检查
                        </button>
                    </div>
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100/50">
                            <div class="text-[10px] text-gray-400 mb-1">当前版本</div>
                            <div id="settings-current-version" class="text-xs font-bold text-gray-700">检测中...</div>
                        </div>
                        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100/50">
                            <div class="text-[10px] text-gray-400 mb-1">最新版本</div>
                            <div id="settings-latest-version" class="text-xs font-bold text-gray-700">检测中...</div>
                        </div>
                    </div>
                    <div id="settings-app-version-status" class="text-[11px] text-gray-500 mb-3 text-center">正在读取版本信息...</div>
                    <button id="settings-update-app-btn" type="button" onclick="updateAppToLatestVersion()" class="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                        立即更新
                    </button>
                </div>
            </div>

            <!-- 底部操作区 -->
            <div class="mt-8 space-y-3">
                <button onclick="saveAllSettings()" class="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-base font-bold transition-all shadow-md shadow-green-200 flex justify-center items-center">
                    <i class='bx bx-save mr-2 text-lg'></i>保存所有配置
                </button>
                <div class="text-center text-[11px] text-gray-400">配置将保存在本地</div>
                
                <div class="pt-6">
                    <button onclick="clearAllData()" class="w-full py-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl text-sm font-bold transition-all border border-red-100 flex justify-center items-center">
                        <i class='bx bx-trash mr-1.5 text-base'></i>清除所有数据
                    </button>
                    <div class="text-center mt-2 text-[10px] text-red-400/80">⚠️ 此操作不可逆</div>
                </div>
            </div>

        </div>
    `;

    try {
        if (typeof bindOfflineDiaryDebugUIOnce === 'function') bindOfflineDiaryDebugUIOnce();
    } catch (e2) { }
    try {
        if (window.refreshDevPromptDebugPanel) window.refreshDevPromptDebugPanel();
    } catch (e3) { }
    setTimeout(function () {
        refreshSettingsVersionInfo().catch(function (err) {
            console.warn('设置页版本信息刷新失败', err);
            setAppVersionStatus('读取版本信息失败，请稍后再试。', 'danger');
        });
    }, 0);
}

// 3. 拉取模型列表逻辑
async function fetchModelList(type = 'main') {
    let urlInput = document.getElementById(type === 'main' ? 'setting-api-url' : 'setting-summary-api-url').value.trim();
    const keyInput = document.getElementById(type === 'main' ? 'setting-api-key' : 'setting-summary-api-key').value.trim();
    const statusText = document.getElementById(type === 'main' ? 'fetch-status' : 'summary-fetch-status');
    const selectBox = document.getElementById(type === 'main' ? 'setting-model-select' : 'setting-summary-model');

    if (!urlInput || !keyInput) {
        statusText.innerText = "❌ 请先填写 API 地址和 Key";
        statusText.style.color = "red";
        return;
    }

    let targetUrl = urlInput;
    if (targetUrl.endsWith('/')) targetUrl = targetUrl.slice(0, -1);
    
    // 智能尝试补全路径
    if (!targetUrl.endsWith('/v1')) {
        targetUrl += '/v1';
    }
    targetUrl += '/models';

    statusText.innerText = "⏳ 正在连接服务器...";
    statusText.style.color = "#007aff";

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${keyInput}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`请求失败: ${response.status}`);
        }

        const data = await response.json();
        
        let models = [];
        if (data.data && Array.isArray(data.data)) {
            models = data.data;
        } else if (Array.isArray(data)) {
            models = data;
        }

        if (models.length > 0) {
            selectBox.innerHTML = '';
            models.forEach(model => {
                const mId = model.id || model.name;
                const option = document.createElement('option');
                option.value = mId;
                option.innerText = mId;
                selectBox.appendChild(option);
            });
            selectBox.value = models[0].id || models[0].name;
            statusText.innerText = `✅ 成功获取 ${models.length} 个模型`;
            statusText.style.color = "green";
        } else {
            statusText.innerText = "⚠️ 连接成功但未找到模型";
            statusText.style.color = "orange";
        }

    } catch (error) {
        console.error(error);
        if (error.message.includes('Failed to fetch')) {
            statusText.innerText = "❌ 网络错误或跨域拦截";
        } else {
            statusText.innerText = `❌ ${error.message}`;
        }
        statusText.style.color = "red";
    }
}

// 测试连接功能
async function testApiConnection(type = 'main') {
    let urlInput = document.getElementById(type === 'main' ? 'setting-api-url' : 'setting-summary-api-url').value.trim();
    const keyInput = document.getElementById(type === 'main' ? 'setting-api-key' : 'setting-summary-api-key').value.trim();
    const statusText = document.getElementById(type === 'main' ? 'fetch-status' : 'summary-fetch-status');

    if (!urlInput || !keyInput) {
        statusText.innerText = "❌ 请先填写 API 地址和 Key";
        statusText.style.color = "red";
        return;
    }

    let targetUrl = urlInput;
    if (targetUrl.endsWith('/')) targetUrl = targetUrl.slice(0, -1);
    
    // 智能尝试补全路径
    if (!targetUrl.endsWith('/v1')) {
        targetUrl += '/v1';
    }
    targetUrl += '/models';

    statusText.innerText = "⏳ 正在测试连接...";
    statusText.style.color = "#007aff";

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${keyInput}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`连接失败: HTTP ${response.status}`);
        }

        statusText.innerText = "✅ 连接成功，API 可用！";
        statusText.style.color = "green";
    } catch (error) {
        console.error(error);
        if (error.message.includes('Failed to fetch')) {
            statusText.innerText = "❌ 网络错误或跨域拦截 (CORS)";
        } else {
            statusText.innerText = `❌ ${error.message}`;
        }
        statusText.style.color = "red";
    }
}
window.testApiConnection = testApiConnection;
window.fetchModelList = fetchModelList;

function readDevAiParseFailureLogs() {
    try {
        const devUnlocked = localStorage.getItem('dev_mode_unlocked') === 'true';
        if (!devUnlocked) return [];
        const raw = localStorage.getItem('dev_ai_parse_failures_v1') || '[]';
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function openDevAiParseFailureLogs() {
    const logs = readDevAiParseFailureLogs();
    try {
        console.log('[dev_ai_parse_failures_v1]', logs);
    } catch (e) { }
    const text = JSON.stringify(logs.slice(-30), null, 2);
    try {
        prompt('最近 30 条解析失败记录（已同步输出到控制台，可复制）：', text);
    } catch (e2) {
        alert(text);
    }
}

function clearDevAiParseFailureLogs() {
    try {
        const devUnlocked = localStorage.getItem('dev_mode_unlocked') === 'true';
        if (!devUnlocked) return;
        const ok = confirm('确认清空解析失败记录？');
        if (!ok) return;
        localStorage.setItem('dev_ai_parse_failures_v1', '[]');
        alert('已清空。');
    } catch (e) { }
    try {
        const content = document.getElementById('app-content-area');
        if (content) renderSettingsUI(content);
    } catch (e2) { }
}

function getSilentKeepAliveHackState() {
    try {
        if (window.SilentKeepAliveHack && typeof window.SilentKeepAliveHack.getState === 'function') {
            return window.SilentKeepAliveHack.getState();
        }
    } catch (e) { }
    try {
        return {
            enabled: localStorage.getItem('exp_silent_keepalive_enabled_v1') === 'true',
            playing: false,
            currentTime: 0
        };
    } catch (e2) {
        return { enabled: false, playing: false, currentTime: 0 };
    }
}

async function toggleExperimentalSilentKeepAlive() {
    try {
        if (!window.SilentKeepAliveHack || typeof window.SilentKeepAliveHack.toggle !== 'function') {
            alert('静音保活模块未加载。请刷新页面后再试。');
            return;
        }
        await window.SilentKeepAliveHack.toggle({ showTip: true });
    } catch (e) {
        alert('切换失败：' + (e && e.message ? e.message : e || '未知错误'));
    }
    try {
        const content = document.getElementById('app-content-area');
        if (content) renderSettingsUI(content);
    } catch (e2) { }
}

window.toggleExperimentalSilentKeepAlive = toggleExperimentalSilentKeepAlive;

function getBrowserNotificationState() {
    try {
        if (window.BrowserNotificationBridge && typeof window.BrowserNotificationBridge.getState === 'function') {
            return window.BrowserNotificationBridge.getState();
        }
    } catch (e) { }
    return {
        supported: typeof Notification !== 'undefined',
        enabled: false,
        permission: typeof Notification !== 'undefined' ? String(Notification.permission || 'default') : 'unsupported'
    };
}

async function enableBrowserNotificationsForExperiment() {
    try {
        if (!window.BrowserNotificationBridge || typeof window.BrowserNotificationBridge.requestPermissionAndEnable !== 'function') {
            alert('浏览器通知模块未加载。请刷新页面后再试。');
            return;
        }
        const result = await window.BrowserNotificationBridge.requestPermissionAndEnable();
        if (!result || !result.ok) {
            alert('通知权限未开启。当前状态：' + String((result && (result.permission || result.reason)) || 'unknown'));
        }
    } catch (e) {
        alert('开启失败：' + (e && e.message ? e.message : e || '未知错误'));
    }
    try {
        const content = document.getElementById('app-content-area');
        if (content) renderSettingsUI(content);
    } catch (e2) { }
}

function disableBrowserNotificationsForExperiment() {
    try {
        if (window.BrowserNotificationBridge && typeof window.BrowserNotificationBridge.disable === 'function') {
            window.BrowserNotificationBridge.disable();
        }
    } catch (e) { }
    try {
        const content = document.getElementById('app-content-area');
        if (content) renderSettingsUI(content);
    } catch (e2) { }
}

async function testBrowserNotificationForExperiment() {
    try {
        if (!window.BrowserNotificationBridge || typeof window.BrowserNotificationBridge.show !== 'function') {
            alert('浏览器通知模块未加载。请刷新页面后再试。');
            return;
        }
        const st = getBrowserNotificationState();
        if (!st.supported) {
            alert('当前环境不支持浏览器通知。');
            return;
        }
        if (!(window.BrowserNotificationBridge.canNotify && window.BrowserNotificationBridge.canNotify())) {
            alert('还没有可用的浏览器通知权限，请先点“开启浏览器通知”。');
            return;
        }
        const result = await window.BrowserNotificationBridge.show('角色消息测试', '这是一条浏览器通知测试消息。你现在切出页面后，也会走这条通知链路。', {
            icon: 'assets/chushitouxiang.jpg',
            tag: 'browser-notification-test',
            renotify: true,
            durationMs: 8000
        });
        if (!result) {
            alert('通知请求已发出，但当前环境没有真正弹出系统通知。手机 Edge 安装到桌面时，通常更依赖系统通知权限和 Service Worker。');
        }
    } catch (e) {
        alert('测试失败：' + (e && e.message ? e.message : e || '未知错误'));
    }
}

window.enableBrowserNotificationsForExperiment = enableBrowserNotificationsForExperiment;
window.disableBrowserNotificationsForExperiment = disableBrowserNotificationsForExperiment;
window.testBrowserNotificationForExperiment = testBrowserNotificationForExperiment;

const SETTINGS_DEV_AI_PROMPT_HISTORY_KEY = 'dev_ai_prompt_history_v1';

function readDevAiPromptHistory() {
    try {
        const devUnlocked = localStorage.getItem('dev_mode_unlocked') === 'true';
        if (!devUnlocked) return [];
        const raw = localStorage.getItem(SETTINGS_DEV_AI_PROMPT_HISTORY_KEY) || '[]';
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function escapeDevPromptHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDevPromptTimestamp(ts) {
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return '未知时间';
    try {
        return new Date(n).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    } catch (e) {
        return '未知时间';
    }
}

function buildDevPromptDisplayText(record) {
    if (!record || typeof record !== 'object') return '';
    if (typeof record.mergedPrompt === 'string' && record.mergedPrompt) return record.mergedPrompt;
    const prompt = typeof record.prompt === 'string' ? record.prompt : '';
    const extra = typeof record.extraSystem === 'string' ? record.extraSystem.trim() : '';
    if (!extra) return prompt;
    return (prompt ? (prompt + '\n\n') : '') + '=== 一次性系统上下文(额外 system message) ===\n' + extra;
}

function buildDevPromptUserPreviewText(record) {
    if (!record || typeof record !== 'object') return '';
    if (typeof record.userPreviewFull === 'string' && record.userPreviewFull.trim()) {
        return record.userPreviewFull.trim();
    }
    if (typeof record.userPreview === 'string' && record.userPreview.trim()) {
        return record.userPreview.trim();
    }
    return '';
}

function getDevPromptMetaBadgeHtml(meta) {
    const m = meta && typeof meta === 'object' ? meta : {};
    const badges = [];
    if (m.promptClass === 'full_chat') {
        badges.push('<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#eef7ee; color:#166534; font-size:11px; font-weight:700;">A类 FullChatPrompt</span>');
    } else if (m.promptClass === 'role_lite') {
        badges.push('<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-size:11px; font-weight:700;">B类 RoleLitePrompt</span>');
    } else if (m.promptClass === 'role_json_task') {
        badges.push('<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#f5f3ff; color:#6d28d9; font-size:11px; font-weight:700;">C类 RoleJsonTask</span>');
    } else if (m.promptClass === 'tool_json') {
        badges.push('<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#f8fafc; color:#475569; font-size:11px; font-weight:700;">D类 ToolJsonPrompt</span>');
    }
    if (m.sceneSubtype === 'dialogue') {
        badges.push('<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#fff7ed; color:#c2410c; font-size:11px; font-weight:700;">dialogue</span>');
    } else if (m.sceneSubtype === 'continuity_journal') {
        badges.push('<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#fff7ed; color:#c2410c; font-size:11px; font-weight:700;">continuity_journal</span>');
    } else if (m.sceneSubtype === 'continuity_decision') {
        badges.push('<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#fff7ed; color:#c2410c; font-size:11px; font-weight:700;">continuity_decision</span>');
    }
    return badges.join('');
}

function buildFallbackDevAiPromptRecord() {
    try {
        const prompt = typeof window.__lastCallAISystemPrompt === 'string' ? window.__lastCallAISystemPrompt : '';
        if (!prompt) return null;
        const meta = window.__lastCallAISystemPromptMeta && typeof window.__lastCallAISystemPromptMeta === 'object'
            ? window.__lastCallAISystemPromptMeta
            : {};
        const roleId = String(meta.roleId || window.currentChatRole || '').trim();
        let roleName = '';
        try {
            const profile = roleId && window.charProfiles ? window.charProfiles[roleId] : null;
            if (profile) roleName = String(profile.remark || profile.nickName || profile.name || roleId);
        } catch (e1) { }
        let extraSystem = '';
        try {
            const map = window.__lastCallAISystemExtraByRole;
            if (map && roleId && typeof map[roleId] === 'string') extraSystem = map[roleId];
        } catch (e2) { }
        let promptTimestamp = 0;
        try {
            const tsMap = window.__lastCallAISystemPromptTimestampByRole;
            if (tsMap && roleId && typeof tsMap[roleId] !== 'undefined') {
                promptTimestamp = Number(tsMap[roleId]) || 0;
            }
            if (!promptTimestamp) {
                promptTimestamp = Number(window.__lastCallAISystemPromptTimestamp) || 0;
            }
        } catch (e3) { }
        return {
            id: 'fallback_latest_call',
            timestamp: promptTimestamp || Date.now(),
            scene: meta.sceneCode === 'couple_space_diary'
                ? 'A类FullChat·情侣空间日记'
                : (meta.sceneCode === 'moments_proactive_post'
                    ? 'A类FullChat·主动朋友圈'
                    : (meta.promptClass === 'full_chat'
                        ? 'A类FullChat'
                        : (meta.promptClass === 'role_lite'
                            ? 'B类RoleLite'
                            : (meta.promptClass === 'role_json_task'
                                ? 'C类RoleJsonTask'
                                : (meta.promptClass === 'tool_json'
                                    ? 'D类ToolJson'
                                    : (meta.hasSystemPromptMarker ? '线上私聊' : '最近一次调用'))))
                    )),
            roleId: roleId,
            roleName: roleName,
            model: localStorage.getItem('selected_model') || '',
            prompt: prompt,
            extraSystem: extraSystem,
            mergedPrompt: buildDevPromptDisplayText({ prompt: prompt, extraSystem: extraSystem }),
            userPreview: '当前页面内存中的最后一次调用',
            meta: meta,
            isFallback: true
        };
    } catch (e) {
        return null;
    }
}

function mergeLivePromptRecordIntoHistory(records) {
    const list = Array.isArray(records) ? records.slice() : [];
    const live = buildFallbackDevAiPromptRecord();
    if (!live) return list;

    const livePrompt = buildDevPromptDisplayText(live);
    const merged = [live];
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item || typeof item !== 'object') continue;
        const sameRole = String(item.roleId || '') === String(live.roleId || '');
        const samePrompt = buildDevPromptDisplayText(item) === livePrompt;
        if (sameRole && samePrompt) continue;
        merged.push(item);
        if (merged.length >= 10) break;
    }
    return merged;
}

function getDevAiPromptHistoryForDisplay() {
    const records = readDevAiPromptHistory();
    return mergeLivePromptRecordIntoHistory(records);
}

const DEV_PROMPT_PREVIEW_ROLE_KEY = 'dev_prompt_preview_role_v1';
const DEV_PROMPT_PREVIEW_SCENE_KEY = 'dev_prompt_preview_scene_v1';

function readDevPromptPreviewRoleId() {
    try {
        return String(localStorage.getItem(DEV_PROMPT_PREVIEW_ROLE_KEY) || '').trim();
    } catch (e) {
        return '';
    }
}

function writeDevPromptPreviewRoleId(roleId) {
    try {
        localStorage.setItem(DEV_PROMPT_PREVIEW_ROLE_KEY, String(roleId || '').trim());
    } catch (e) { }
}

function readDevPromptPreviewSceneKey() {
    try {
        return String(localStorage.getItem(DEV_PROMPT_PREVIEW_SCENE_KEY) || '').trim();
    } catch (e) {
        return '';
    }
}

function writeDevPromptPreviewSceneKey(sceneKey) {
    try {
        localStorage.setItem(DEV_PROMPT_PREVIEW_SCENE_KEY, String(sceneKey || '').trim());
    } catch (e) { }
}

function getDevPromptPreviewRoleOptions() {
    const items = [];
    try {
        const profiles = window.charProfiles && typeof window.charProfiles === 'object' ? window.charProfiles : {};
        Object.keys(profiles).forEach(function (rid) {
            const profile = profiles[rid] || {};
            const name = String(profile.remark || profile.nickName || profile.name || rid).trim() || rid;
            items.push({ roleId: String(rid || '').trim(), roleName: name });
        });
    } catch (e) { }
    return items.sort(function (a, b) {
        return String(a.roleName || '').localeCompare(String(b.roleName || ''), 'zh-CN');
    });
}

function resolveDevPromptPreviewRoleId() {
    const saved = readDevPromptPreviewRoleId();
    if (saved) return saved;
    const current = String(window.currentChatRole || '').trim();
    if (current) return current;
    try {
        const records = getDevAiPromptHistoryForDisplay();
        const rid = records && records[0] ? String(records[0].roleId || '').trim() : '';
        if (rid) return rid;
    } catch (e) { }
    const options = getDevPromptPreviewRoleOptions();
    return options[0] ? options[0].roleId : '';
}

function resolvePromptPreviewUserBirthday(userPersona) {
    const p = userPersona && typeof userPersona === 'object' ? userPersona : {};
    const birthday = String(p.birthday || '').trim();
    if (!birthday) return '';
    return birthday + (p.birthdayType === 'lunar' ? '（农历）' : '（阳历）');
}

function buildDevWechatPrivatePromptPreview(roleId) {
    try {
        if (typeof buildPromptContextBundle !== 'function' || typeof buildWechatPrivatePromptV2 !== 'function') return '';
        const rid = String(roleId || '').trim();
        if (!rid) return '';
        const bundle = buildPromptContextBundle(rid, {});
        return String(buildWechatPrivatePromptV2({
            roleId: rid,
            roleName: bundle.roleName,
            realName: bundle.profile && (bundle.profile.realName || bundle.profile.real_name || bundle.profile.nickName || bundle.roleName) || bundle.roleName,
            language: bundle.profile && (bundle.profile.language || bundle.profile.lang) || '',
            roleDesc: bundle.profile && bundle.profile.desc || '',
            roleStyle: bundle.profile && bundle.profile.style || '',
            roleSchedule: bundle.profile && bundle.profile.schedule || '',
            roleRemark: bundle.roleRemark,
            userName: bundle.userPersona && bundle.userPersona.name || '',
            userGender: bundle.userPersona && bundle.userPersona.gender || '',
            userBirthday: resolvePromptPreviewUserBirthday(bundle.userPersona),
            userSetting: bundle.userPersona && bundle.userPersona.setting || '',
            memoryArchivePrompt: bundle.memoryArchivePrompt,
            worldBookPromptText: bundle.worldBookPromptText,
            timePerceptionPrompt: '',
            recentSystemEventsPrompt: bundle.recentSystemEventsPrompt,
            continuityPrompt: bundle.continuityPrompt,
            justSwitchedToOnline: false,
            allowOfflineInvite: typeof isOfflineInviteAllowed === 'function' ? isOfflineInviteAllowed(rid) : true,
            transferScenePrompt: '',
            stickerPromptText: typeof buildAIStickerPromptText === 'function' ? String(buildAIStickerPromptText() || '').trim() : ''
        }) || '').trim();
    } catch (e) {
        return '';
    }
}

function buildDevOfflineMeetingPromptPreview(roleId) {
    try {
        if (typeof buildPromptContextBundle !== 'function' || typeof buildOfflineMeetingPromptV2 !== 'function') return '';
        const rid = String(roleId || '').trim();
        if (!rid) return '';
        const bundle = buildPromptContextBundle(rid, {});
        return String(buildOfflineMeetingPromptV2({
            roleId: rid,
            roleName: bundle.roleName,
            realName: bundle.profile && (bundle.profile.realName || bundle.profile.real_name || bundle.profile.nickName || bundle.roleName) || bundle.roleName,
            language: bundle.profile && (bundle.profile.language || bundle.profile.lang) || '',
            roleDesc: bundle.profile && bundle.profile.desc || '',
            roleStyle: bundle.profile && bundle.profile.style || '',
            roleSchedule: bundle.profile && bundle.profile.schedule || '',
            roleRemark: bundle.roleRemark,
            userName: bundle.userPersona && bundle.userPersona.name || '',
            userGender: bundle.userPersona && bundle.userPersona.gender || '',
            userBirthday: resolvePromptPreviewUserBirthday(bundle.userPersona),
            userSetting: bundle.userPersona && bundle.userPersona.setting || '',
            memoryArchivePrompt: bundle.memoryArchivePrompt,
            worldBookPromptText: bundle.worldBookPromptText,
            timePerceptionPrompt: '',
            recentSystemEventsPrompt: bundle.recentSystemEventsPrompt,
            continuityPrompt: bundle.continuityPrompt,
            arrivalContextPrompt: '【到达情景】你和用户刚刚在约定地点碰面，线下互动刚刚开始。',
            stickerPromptText: typeof buildAIStickerPromptText === 'function' ? String(buildAIStickerPromptText() || '').trim() : ''
        }) || '').trim();
    } catch (e) {
        return '';
    }
}

function readDevSecretCenterPromptStore() {
    try {
        const raw = localStorage.getItem('secret_center_prompt_debug_v1') || '{}';
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function readDevSecretCenterPromptRecord(roleId, sceneKey) {
    const rid = String(roleId || '').trim();
    const scene = String(sceneKey || '').trim();
    if (!rid || !scene) return null;
    const store = readDevSecretCenterPromptStore();
    const key = rid + '::' + scene;
    const record = store && typeof store === 'object' ? store[key] : null;
    return record && typeof record === 'object' ? record : null;
}

function buildDevSecretCenterPromptPreview(roleId, sceneKey) {
    const record = readDevSecretCenterPromptRecord(roleId, sceneKey);
    if (!record) return '';
    const blocks = [];
    const contextSummary = String(record.contextSummary || '').trim();
    const basePrompt = String(record.basePrompt || '').trim();
    const scenePrompt = String(record.scenePrompt || '').trim();
    const finalSystemPrompt = String(record.finalSystemPrompt || '').trim();
    const userMessage = String(record.userMessage || '').trim();
    const responseText = String(record.responseText || '').trim();
    const errorMessage = String(record.errorMessage || '').trim();

    if (contextSummary) blocks.push('【角色上下文】\n' + contextSummary);
    if (basePrompt) blocks.push('【基底提示词】\n' + basePrompt);
    if (scenePrompt) blocks.push('【场景提示词】\n' + scenePrompt);
    if (finalSystemPrompt) blocks.push('【最终 System Prompt】\n' + finalSystemPrompt);
    if (userMessage) blocks.push('【用户输入】\n' + userMessage);
    if (responseText) blocks.push('【模型返回原文】\n' + responseText);
    if (errorMessage) blocks.push('【错误信息】\n' + errorMessage);
    return blocks.join('\n\n').trim();
}

function appendDevSecretCenterPromptEntries(roleId, pushFn) {
    if (typeof pushFn !== 'function') return;
    const rid = String(roleId || '').trim();
    if (!rid) return;
    const scenes = [
        { key: 'fangcun', label: '侧影·方寸' },
        { key: 'ninan', label: '侧影·呢喃' },
        { key: 'chenfeng', label: '侧影·尘封' }
    ];
    scenes.forEach(function (scene) {
        const preview = buildDevSecretCenterPromptPreview(rid, scene.key);
        if (!preview) return;
        const record = readDevSecretCenterPromptRecord(rid, scene.key) || {};
        const updatedAt = Number(record.updatedAt) || 0;
        const noteTime = updatedAt ? ('最近快照：' + formatDevPromptTimestamp(updatedAt) + '。') : '';
        const note = '来源：侧影分区手动生成时记录的提示词快照（生成前后）。' + noteTime;
        pushFn('secret_center_' + scene.key, scene.label, preview, note);
    });
}

function buildDevPromptCatalogForRole(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return [];
    const list = [];
    function push(key, label, prompt, note) {
        const text = String(prompt || '').trim();
        if (!text) return;
        list.push({ key: key, label: label, prompt: text, note: String(note || '').trim() });
    }

    push('wechat_private_v2', '线上私聊', buildDevWechatPrivatePromptPreview(rid), '主聊天 prompt 预览，按当前角色的人设、记忆和连续性规则生成。');
    push('offline_meeting_v2', '线下见面', buildDevOfflineMeetingPromptPreview(rid), '线下见面采用代表性的到达情景预览。');
    appendDevSecretCenterPromptEntries(rid, push);
    try {
        if (typeof buildFullChatPrompt === 'function') {
            push('location_share_chat', '位置共享', buildFullChatPrompt('location_share_chat', rid, {
                outputMode: 'plain_json_task',
                maxSummaryLines: 14,
                extraCurrentContext: '当前场景是实时位置共享中的连续对话。',
                extraTaskRules: '你正在与用户进行实时位置共享。你只能回复纯文本（仅文字与常用标点），禁止语音、图片、表情包、贴纸、链接、代码块、Markdown，以及任何类似 [VOICE: ...]、[STICKER: ...] 的格式。\n【出行方式锁定】\n你已经选择步行作为本次出行方式，本次行程中禁止更改出行方式或再次使用 [[START_MOVE: ...]] 指令。你只能继续以步行的方式向用户汇报当前路况、进度和到达情况。',
                sceneIntro: '当前场景是位置共享中的连续聊天。'
            }), '位置共享预览使用代表性的出行上下文。');
            push('music_chat', '音乐聊天', buildFullChatPrompt('music_chat', rid, {
                outputMode: 'plain_json_task',
                maxSummaryLines: 12,
                extraCurrentContext: '当前音乐状态：播放中；当前歌曲：《示例歌曲》- 示例歌手；当前歌词：我想把今天轻轻唱给你听。',
                extraTaskRules: [
                    '你正在和用户在手机音乐App里一起听歌并聊天，说话仍然要像微信聊天。',
                    '回复要求：1-2句自然中文；不要输出 markdown、代码块、触发码或指令；不要长篇大论。',
                    '可以自然提及歌曲气氛、歌词余韵和你们此刻的关系温度，但不要机械播报播放状态。'
                ].join('\n'),
                sceneIntro: '当前场景是一起听歌时的连续聊天。'
            }), '音乐聊天预览使用代表性的播放状态和歌词上下文。');
            push('voice_call_talk', '语音通话中', buildFullChatPrompt('voice_call_talk', rid, {
                outputMode: 'plain_json_task',
                maxSummaryLines: 14,
                extraCurrentContext: '当前场景是语音通话，角色正在和用户实时说话。',
                extraTaskRules: '你现在处于“语音通话中”模式。\n- 用户每条消息在内部都会自动加上前缀：[语音通话中]，你要把它理解为正在通话而不是纯打字。\n- 你的回复必须是一个 JSON 对象：{"direction":"...","lines":["...","...","...","..."]}。\n- direction 会单独显示成居中小字，只能写背景音、环境底噪，以及你开口时的声音质感/语气；不要写任何看得见的动作，也不要加括号。\n- lines 会拆成多个气泡，必须有 4 到 7 条，每条只写真正说出口的话。\n- 如果用户表示要挂断、说再见或说明要去做别的事，你需要理解为对方准备结束通话，用一两句自然的话响应并收尾，不要再主动开启新的话题。',
                sceneIntro: '当前场景是语音通话中的正式说话，这是持续对话场景。'
            }), '语音通话中使用实时说话场景预览。');
            push('video_call_talk', '视频通话中', buildFullChatPrompt('video_call_talk', rid, {
                outputMode: 'plain_json_task',
                maxSummaryLines: 14,
                extraCurrentContext: '当前场景是视频通话，角色可以看到用户画面。',
                extraTaskRules: '你现在处于“视频通话中”模式。\n- 用户每条消息在内部都会自动加上前缀：[语音通话中]，你要把它理解为正在通话而不是纯打字。\n- 你的回复必须是一个 JSON 对象：{"direction":"...","lines":["...","...","...","..."]}。\n- direction 会单独显示成居中小字，只能写你此刻的动作、视线方向、神态和表情；不要写台词，不要写背景音，也不要加括号。\n- lines 会拆成多个气泡，必须有 4 到 7 条，每条只写真正说出口的话。\n- 如果用户表示要挂断、说再见或说明要去做别的事，你需要理解为对方准备结束通话，用一两句自然的话响应并收尾，不要再主动开启新的话题。\n- 当前是视频通话，你可以基于用户画面做自然反应，但不能胡编乱造看不到的细节。',
                sceneIntro: '当前场景是视频通话中的正式说话，这是持续对话场景。'
            }), '视频通话中使用可见画面场景预览。');
            push('moments_proactive_post', '主动朋友圈', buildFullChatPrompt('moments_proactive_post', rid, {
                outputMode: 'plain_json_task',
                maxSummaryLines: 20,
                extraCurrentContext: '【当前时间】' + new Date().toLocaleString('zh-CN', { hour12: false }) + '\n【今日已发朋友圈条数】0\n【你上一次主动发朋友圈的时间】今天还没发过\n【今天是否和用户聊天】是\n【今天聊天记录（带日期时间）】\n今天和用户有几轮自然聊天，气氛偏亲近。',
                extraTaskRules: [
                    '你要像真实成年人一样判断表达欲，而不是机械定时发圈。',
                    '最近聊天状态、关系余温、刚发生的互动，优先级高于静态世界书设定。',
                    '如果今天和用户有聊天，朋友圈内容应优先围绕今天的互动、今天引发的情绪和今天的生活片段展开。',
                    '如果不适合发，就明确选择不发，不要为了完成任务硬凑一条朋友圈。'
                ].join('\n')
            }), '主动朋友圈预览使用代表性的当日聊天上下文。');
            push('couple_space_diary', '情侣空间日记', buildFullChatPrompt('couple_space_diary', rid, {
                outputMode: 'plain_json_task',
                maxSummaryLines: 18
            }), '情侣空间日记使用连续关系写作任务预览。');
        }
    } catch (e1) { }

    try {
        if (typeof buildRoleLitePrompt === 'function') {
            push('moments_reaction', '朋友圈互动', buildRoleLitePrompt('moments_reaction', rid, {
                includeContinuity: true,
                maxSummaryLines: 10,
                sceneIntro: '当前场景是角色看到用户新发的朋友圈后，决定要不要互动。',
                taskGuidance: '你可以看到用户刚发的朋友圈，需要基于你们关系、最近互动和角色本身判断是否点赞、评论，或者什么都不做。',
                outputInstructions: '只输出当前任务要求的 JSON 对象，不要解释，不要代码块。'
            }), '朋友圈互动为 RoleLite 决策 prompt。');
            push('moments_comment_reply', '朋友圈评论回复', buildRoleLitePrompt('moments_comment_reply', rid, {
                includeContinuity: true,
                maxSummaryLines: 10,
                sceneIntro: '当前场景是角色回复朋友圈评论。',
                taskGuidance: '你需要对用户在朋友圈下的评论作出自然、简短且符合关系阶段的回复。',
                outputInstructions: '只输出一条自然中文回复，不要解释，不要代码块。'
            }), '朋友圈评论回复为 RoleLite 回复 prompt。');
            push('moments_reply_reply', '朋友圈楼中楼回复', buildRoleLitePrompt('moments_reply_reply', rid, {
                includeContinuity: true,
                maxSummaryLines: 10,
                sceneIntro: '当前场景是角色回复朋友圈楼中楼内容。',
                taskGuidance: '你需要承接上一条楼中楼语气，给出一句自然的继续回复。',
                outputInstructions: '只输出一条自然中文回复，不要解释，不要代码块。'
            }), '朋友圈楼中楼回复为 RoleLite 连续承接 prompt。');
            push('voice_call_handshake', '语音通话接听', buildRoleLitePrompt('voice_call_handshake', rid, {
                includeContinuity: true,
                maxSummaryLines: 10,
                sceneIntro: '当前场景是语音通话接听判断。你需要像真实成年人一样决定接不接。',
                taskGuidance: '你现在收到的是一次“语音通话邀请”，这是独立于普通文字聊天的一次通话。\n1. 你需要根据当前时间、你的人设和你对用户当前的好感度、关系亲疏，决定是否接听。\n2. 如果不方便或不想接，必须拒绝。\n3. 如果接听，开场白要像刚连上通话时自然说出口的话。',
                outputInstructions: '只输出一行中文，不要解释、不要代码块。\n- 如果拒绝：格式必须是 [[REJECT]] 后面接一句自然理由。\n- 如果接听：格式必须是 [[ACCEPT]] 后面接“(场景音或语气描写) 开场白内容”。'
            }), '语音通话接听为 RoleLite 接听判断 prompt。');
            push('video_call_handshake', '视频通话接听', buildRoleLitePrompt('video_call_handshake', rid, {
                includeContinuity: true,
                maxSummaryLines: 10,
                sceneIntro: '当前场景是视频通话接听判断。你需要像真实成年人一样决定接不接。',
                taskGuidance: '你现在收到的是一次“视频通话邀请”，这是独立于普通文字聊天的一次通话。\n1. 你需要根据当前时间、你的人设和你对用户当前的好感度、关系亲疏，决定是否接听。\n2. 如果不方便或不想接，必须拒绝。\n3. 如果接听，开场白要像刚连上通话时自然说出口的话。',
                outputInstructions: '只输出一行中文，不要解释、不要代码块。\n- 如果拒绝：格式必须是 [[REJECT]] 后面接一句自然理由。\n- 如果接听：格式必须是 [[ACCEPT]] 后面接“(场景音或语气描写) 开场白内容”。'
            }), '视频通话接听为 RoleLite 接听判断 prompt。');
        }
    } catch (e2) { }

    return list;
}

function renderDevPromptCatalogHtml() {
    const roleOptions = getDevPromptPreviewRoleOptions();
    if (!roleOptions.length) {
        return '<div style="padding:14px; border-radius:12px; background:#f7f8fa; color:#8a8f99; font-size:12px; line-height:1.7;">当前还没有可用于预览提示词的角色数据。</div>';
    }
    const selectedRoleId = resolveDevPromptPreviewRoleId();
    const validRoleId = roleOptions.some(function (item) { return item.roleId === selectedRoleId; })
        ? selectedRoleId
        : roleOptions[0].roleId;
    writeDevPromptPreviewRoleId(validRoleId);
    const roleName = roleOptions.find(function (item) { return item.roleId === validRoleId; });
    const catalog = buildDevPromptCatalogForRole(validRoleId);
    const selectedSceneKey = readDevPromptPreviewSceneKey();
    const validSceneKey = catalog.some(function (item) { return item.key === selectedSceneKey; })
        ? selectedSceneKey
        : (catalog[0] ? catalog[0].key : '');
    writeDevPromptPreviewSceneKey(validSceneKey);
    const current = catalog.find(function (item) { return item.key === validSceneKey; }) || catalog[0] || null;
    const optionsHtml = roleOptions.map(function (item) {
        return '<option value="' + escapeDevPromptHtml(item.roleId) + '"' + (item.roleId === validRoleId ? ' selected' : '') + '>' + escapeDevPromptHtml(item.roleName) + '</option>';
    }).join('');
    const buttonsHtml = catalog.map(function (item) {
        const active = current && current.key === item.key;
        return '<button type="button" onclick="switchDevPromptPreviewScene(\'' + escapeDevPromptHtml(item.key) + '\')" style="border:none; border-radius:999px; padding:8px 12px; cursor:pointer; font-size:12px; font-weight:700; background:' + (active ? '#2563eb' : 'rgba(37,99,235,0.1)') + '; color:' + (active ? '#fff' : '#1d4ed8') + ';">' + escapeDevPromptHtml(item.label) + '</button>';
    }).join('');
    const promptText = current ? current.prompt : '';
    const noteText = current && current.note ? current.note : '这里显示的是按当前代码生成的场景 prompt 预览。';
    return [
        '<div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">',
        '  <select id="dev-prompt-preview-role-select" onchange="changeDevPromptPreviewRole(this.value)" style="flex:1; min-width:180px; padding:10px; border:1px solid #dbe2ea; border-radius:10px; background:#fff; font-size:13px;">' + optionsHtml + '</select>',
        '  <button type="button" onclick="copyCurrentDevPromptPreview()" style="padding:10px 12px; border:none; background:#2563eb; color:#fff; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer;">复制当前场景</button>',
        '</div>',
        '<div style="margin-top:10px; font-size:12px; color:#475569;">当前角色：' + escapeDevPromptHtml(roleName ? roleName.roleName : validRoleId) + '。这里会把当前代码下该角色可用的主要场景 prompt 直接展开给你看。</div>',
        '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">' + buttonsHtml + '</div>',
        current
            ? '<div style="margin-top:10px; padding:10px 12px; border-radius:10px; background:#f8fafc; color:#475569; font-size:12px; line-height:1.65;">' + escapeDevPromptHtml(noteText) + '</div>'
            : '<div style="margin-top:10px; padding:10px 12px; border-radius:10px; background:#fff7ed; color:#9a3412; font-size:12px;">当前没有生成成功的场景 prompt。</div>',
        '<pre id="dev-prompt-preview-output" style="margin:10px 0 0; white-space:pre-wrap; word-break:break-word; max-height:360px; overflow:auto; font-size:11px; line-height:1.55; color:#111827; background:#f3f5f9; border-radius:12px; padding:12px;">' + escapeDevPromptHtml(promptText) + '</pre>'
    ].join('');
}

function refreshDevPromptCatalogPanel() {
    try {
        const panel = document.getElementById('dev-prompt-catalog-panel');
        if (!panel) return;
        panel.innerHTML = renderDevPromptCatalogHtml();
    } catch (e) { }
}

function changeDevPromptPreviewRole(roleId) {
    writeDevPromptPreviewRoleId(roleId);
    writeDevPromptPreviewSceneKey('');
    refreshDevPromptCatalogPanel();
}

function switchDevPromptPreviewScene(sceneKey) {
    writeDevPromptPreviewSceneKey(sceneKey);
    refreshDevPromptCatalogPanel();
}

async function copyCurrentDevPromptPreview() {
    const roleId = resolveDevPromptPreviewRoleId();
    const catalog = buildDevPromptCatalogForRole(roleId);
    const sceneKey = readDevPromptPreviewSceneKey();
    const current = catalog.find(function (item) { return item.key === sceneKey; }) || catalog[0] || null;
    if (!current || !current.prompt) {
        notifyDevPromptAction('当前没有可复制的场景 prompt。');
        return;
    }
    const ok = await copyTextForDevPrompt(current.prompt);
    notifyDevPromptAction(ok ? ('已复制：' + current.label) : '复制失败，请重试。');
}

function renderDevAiPromptHistoryHtml(records) {
    const list = Array.isArray(records) ? records.slice(0, 10) : [];
    if (!list.length) {
        return `
            <div style="padding: 14px; border-radius: 12px; background: #f7f8fa; color: #8a8f99; font-size: 12px; line-height: 1.7;">
                暂无调用记录。下一次触发 AI 后，这里会自动记录聊天、通话、音乐、情侣空间等经过 <code>callAI</code> 的提示词。若你刚改完代码还没刷新页面，请先刷新一次，让新版记录逻辑生效。
            </div>
        `;
    }

    return list.map(function (record, index) {
        const scene = escapeDevPromptHtml(record && record.scene ? record.scene : '其他调用');
        const time = escapeDevPromptHtml(formatDevPromptTimestamp(record && record.timestamp));
        const roleName = escapeDevPromptHtml(record && (record.roleName || record.roleId) ? (record.roleName || record.roleId) : '未绑定角色');
        const model = escapeDevPromptHtml(record && record.model ? record.model : '未记录模型');
        const previewText = buildDevPromptUserPreviewText(record) || '无用户输入预览';
        const previewShort = escapeDevPromptHtml(previewText.length > 120 ? (previewText.slice(0, 120) + '...') : previewText);
        const previewFull = escapeDevPromptHtml(previewText);
        const metaBadge = getDevPromptMetaBadgeHtml(record && record.meta);
        const fallbackTag = record && record.isFallback
            ? '<span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#fff4db; color:#b45309; font-size:11px; font-weight:700;">当前内存</span>'
            : '';
        const payloadText = buildDevPromptDisplayText(record);
        const payload = escapeDevPromptHtml(payloadText);
        const payloadLen = String(payloadText.length);
        return `
            <details ${index === 0 ? 'open' : ''} style="border: 1px solid rgba(0,0,0,0.06); border-radius: 14px; background: #fafbff; padding: 12px 14px; margin-bottom: 10px;">
                <summary style="cursor: pointer; list-style: none; outline: none;">
                    <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding-right: 6px;">
                        <span style="display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#e8f0ff; color:#315efb; font-size:11px; font-weight:700;">${scene}</span>
                        ${metaBadge}
                        ${fallbackTag}
                        <span style="font-size:12px; color:#444; font-weight:600;">${time}</span>
                        <span style="font-size:12px; color:#666;">${roleName}</span>
                    </div>
                </summary>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.06);">
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 10px; font-size:12px; color:#666; line-height:1.6;">
                        <span>模型：${model}</span>
                        <span>长度：${payloadLen} 字</span>
                        <span>输入预览：${previewShort}</span>
                    </div>
                    <div style="display:flex; gap:8px; margin-bottom: 10px;">
                        <button type="button" onclick="copyDevAiInputPreviewByIndex(${index})" style="border:none; background:#0f766e; color:#fff; font-size:12px; padding:8px 12px; border-radius:10px; cursor:pointer;">复制输入预览</button>
                        <button type="button" onclick="copyDevAiPromptRecordByIndex(${index})" style="border:none; background:#2563eb; color:#fff; font-size:12px; padding:8px 12px; border-radius:10px; cursor:pointer;">复制这条</button>
                    </div>
                    <details style="margin-bottom: 10px; border:1px solid rgba(0,0,0,0.06); border-radius:10px; background:#fff;">
                        <summary style="cursor:pointer; padding:8px 10px; font-size:12px; color:#334155;">展开完整输入预览</summary>
                        <pre style="margin:0; white-space:pre-wrap; word-break:break-word; max-height:160px; overflow:auto; font-size:11px; line-height:1.55; color:#111827; background:#f8fafc; border-top:1px solid rgba(0,0,0,0.06); padding:10px;">${previewFull}</pre>
                    </details>
                    <pre style="margin:0; white-space:pre-wrap; word-break:break-word; max-height:280px; overflow:auto; font-size:11px; line-height:1.55; color:#222; background:#f3f5f9; border-radius:12px; padding:12px;">${payload}</pre>
                </div>
            </details>
        `;
    }).join('');
}

async function copyTextForDevPrompt(text) {
    const payload = String(text || '');
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
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
    } catch (e2) {
        return false;
    }
}

function notifyDevPromptAction(text) {
    try {
        if (typeof window.showCenterToast === 'function') {
            window.showCenterToast(String(text || ''));
            return;
        }
    } catch (e) { }
    alert(String(text || ''));
}

async function copyDevAiPromptRecordByIndex(index) {
    const list = getDevAiPromptHistoryForDisplay();
    const idx = Number(index);
    const record = Number.isFinite(idx) && idx >= 0 ? list[idx] : null;
    if (!record) {
        notifyDevPromptAction('没有找到这条记录。');
        return;
    }
    const ok = await copyTextForDevPrompt(buildDevPromptDisplayText(record));
    notifyDevPromptAction(ok ? '已复制提示词。' : '复制失败，请重试。');
}

async function copyLatestDevAiPromptRecord() {
    return copyDevAiPromptRecordByIndex(0);
}

async function copyDevAiInputPreviewByIndex(index) {
    const list = getDevAiPromptHistoryForDisplay();
    const idx = Number(index);
    const record = Number.isFinite(idx) && idx >= 0 ? list[idx] : null;
    if (!record) {
        notifyDevPromptAction('没有找到这条记录。');
        return;
    }
    const preview = buildDevPromptUserPreviewText(record);
    if (!preview) {
        notifyDevPromptAction('这条记录没有输入预览。');
        return;
    }
    const ok = await copyTextForDevPrompt(preview);
    notifyDevPromptAction(ok ? '已复制输入预览。' : '复制失败，请重试。');
}

function clearDevAiPromptHistory() {
    try {
        const devUnlocked = localStorage.getItem('dev_mode_unlocked') === 'true';
        if (!devUnlocked) return;
        const ok = confirm('确认清空最近 10 条 AI 调用记录？');
        if (!ok) return;
        localStorage.setItem(SETTINGS_DEV_AI_PROMPT_HISTORY_KEY, '[]');
    } catch (e) { }
    if (window.refreshDevPromptDebugPanel) window.refreshDevPromptDebugPanel();
}

window.refreshDevPromptDebugPanel = function () {
    try {
        const panel = document.getElementById('dev-ai-prompt-history-panel');
        const countEl = document.getElementById('dev-ai-prompt-count');
        if (!panel && !countEl) return;
        const records = getDevAiPromptHistoryForDisplay();
        if (countEl) countEl.textContent = '最近记录：' + String(records.length) + '/10';
        if (panel) panel.innerHTML = renderDevAiPromptHistoryHtml(records);
    } catch (e) { }
    try {
        refreshDevPromptCatalogPanel();
    } catch (e2) { }
};

function resolveRoleNameForThoughtChain(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return '未知角色';
    try {
        if (window.charProfiles && window.charProfiles[rid]) {
            const profile = window.charProfiles[rid];
            const name = String(profile.remark || profile.nickName || profile.name || '').trim();
            if (name) return name;
        }
    } catch (e) { }
    return rid;
}

function resolveThoughtChainRoleId() {
    const currentRoleId = String(window.currentChatRole || '').trim();
    if (currentRoleId) return currentRoleId;
    try {
        const records = getDevAiPromptHistoryForDisplay();
        const rid = records && records[0] ? String(records[0].roleId || '').trim() : '';
        if (rid) return rid;
    } catch (e) { }
    return '';
}

function readChatDataForRole(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return [];
    try {
        if (window.chatData && typeof window.chatData === 'object' && Array.isArray(window.chatData[rid])) {
            return window.chatData[rid].slice();
        }
    } catch (e) { }
    try {
        const raw = localStorage.getItem('wechat_chatData') || '{}';
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed[rid])) {
            return parsed[rid].slice();
        }
    } catch (e2) { }
    return [];
}

function readRoleStatusHistoryForRole(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return [];
    try {
        if (window.roleStatusHistory && typeof window.roleStatusHistory === 'object' && Array.isArray(window.roleStatusHistory[rid])) {
            return window.roleStatusHistory[rid].slice();
        }
    } catch (e) { }
    try {
        const raw = localStorage.getItem('wechat_roleStatusHistory') || '{}';
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed[rid])) {
            return parsed[rid].slice();
        }
    } catch (e2) { }
    return [];
}

function normalizeThoughtChainText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

function pickThoughtEntryKind(rawContent) {
    const text = String(rawContent || '').trim();
    if (!text) return null;
    if (text.indexOf('【思考链】') === 0 || text.indexOf('【思考】') === 0) {
        return { kind: 'thought', text: text.replace(/^【思考链】|^【思考】/, '').trim() };
    }
    if (text.indexOf('【内心独白】') === 0) {
        return { kind: 'inner_monologue', text: text.replace(/^【内心独白】/, '').trim() };
    }
    return null;
}

function attachReplySnippetsToThoughtRounds(rounds, history) {
    const list = Array.isArray(rounds) ? rounds : [];
    if (!list.length) return list;
    const visibleAiMessages = (Array.isArray(history) ? history : [])
        .filter(function (msg) {
            if (!msg || typeof msg !== 'object') return false;
            if (msg.role !== 'ai') return false;
            if (msg.hidden === true) return false;
            if (msg.type === 'system_event') return false;
            return typeof msg.content === 'string' && msg.content.trim();
        })
        .map(function (msg) {
            return {
                timestamp: Number(msg.timestamp) || 0,
                text: normalizeThoughtChainText(msg.content)
            };
        })
        .filter(function (item) { return !!item.text; })
        .sort(function (a, b) { return a.timestamp - b.timestamp; });
    if (!visibleAiMessages.length) return list;
    for (let i = 0; i < list.length; i++) {
        const round = list[i];
        if (!round) continue;
        const ts = Number(round.timestamp) || 0;
        let picked = '';
        for (let j = 0; j < visibleAiMessages.length; j++) {
            const msg = visibleAiMessages[j];
            if (msg.timestamp >= ts && msg.timestamp <= ts + 120000) {
                picked = msg.text;
                break;
            }
        }
        if (!picked) {
            for (let j = visibleAiMessages.length - 1; j >= 0; j--) {
                const msg = visibleAiMessages[j];
                if (msg.timestamp <= ts) {
                    picked = msg.text;
                    break;
                }
            }
        }
        if (picked) {
            round.replySnippet = picked.length > 140 ? (picked.slice(0, 140) + '...') : picked;
        }
    }
    return list;
}

function collectThoughtChainRounds(roleId, maxRounds) {
    const history = readChatDataForRole(roleId).sort(function (a, b) {
        return (Number(a && a.timestamp) || 0) - (Number(b && b.timestamp) || 0);
    });
    const hiddenEntries = [];
    for (let i = 0; i < history.length; i++) {
        const msg = history[i];
        if (!msg || typeof msg !== 'object') continue;
        if (msg.role !== 'ai' || msg.hidden !== true) continue;
        const parsed = pickThoughtEntryKind(msg.content);
        if (!parsed || !parsed.text) continue;
        hiddenEntries.push({
            timestamp: Number(msg.timestamp) || 0,
            kind: parsed.kind,
            text: parsed.text
        });
    }
    hiddenEntries.sort(function (a, b) { return a.timestamp - b.timestamp; });
    const rounds = [];
    let currentRound = null;
    for (let i = 0; i < hiddenEntries.length; i++) {
        const entry = hiddenEntries[i];
        const needNewRound = !currentRound
            || Math.abs(entry.timestamp - currentRound._lastTs) > 15000
            || (entry.kind === 'thought' && !!currentRound.thought)
            || (entry.kind === 'inner_monologue' && !!currentRound.innerMonologue);
        if (needNewRound) {
            currentRound = {
                timestamp: entry.timestamp,
                thought: '',
                innerMonologue: '',
                replySnippet: '',
                _lastTs: entry.timestamp
            };
            rounds.push(currentRound);
        }
        if (entry.kind === 'thought' && !currentRound.thought) {
            currentRound.thought = normalizeThoughtChainText(entry.text);
        } else if (entry.kind === 'inner_monologue' && !currentRound.innerMonologue) {
            currentRound.innerMonologue = normalizeThoughtChainText(entry.text);
        }
        currentRound._lastTs = entry.timestamp;
        if (!currentRound.timestamp || entry.timestamp < currentRound.timestamp) {
            currentRound.timestamp = entry.timestamp;
        }
    }

    const statusHistory = readRoleStatusHistoryForRole(roleId).sort(function (a, b) {
        return (Number(a && a.timestamp) || 0) - (Number(b && b.timestamp) || 0);
    });
    for (let i = 0; i < statusHistory.length; i++) {
        const item = statusHistory[i];
        if (!item || typeof item !== 'object') continue;
        const mono = normalizeThoughtChainText(item.inner_monologue);
        if (!mono) continue;
        const ts = Number(item.timestamp) || 0;
        let attached = false;
        for (let j = rounds.length - 1; j >= 0; j--) {
            const round = rounds[j];
            if (!round) continue;
            if (Math.abs(ts - (Number(round.timestamp) || 0)) <= 15000) {
                if (!round.innerMonologue) round.innerMonologue = mono;
                attached = true;
                break;
            }
            if ((Number(round.timestamp) || 0) < ts - 15000) break;
        }
        if (!attached) {
            rounds.push({
                timestamp: ts,
                thought: '',
                innerMonologue: mono,
                replySnippet: ''
            });
        }
    }

    for (let i = 0; i < rounds.length; i++) {
        if (rounds[i] && typeof rounds[i] === 'object') {
            delete rounds[i]._lastTs;
        }
    }
    rounds.sort(function (a, b) { return (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0); });
    const merged = rounds.filter(function (round) {
        return !!(round && (round.thought || round.innerMonologue));
    });
    attachReplySnippetsToThoughtRounds(merged, history);
    const limit = Math.max(1, Number(maxRounds) || 50);
    return merged.slice(Math.max(0, merged.length - limit));
}

function buildThoughtChainExportText(roleId, rounds) {
    const rid = String(roleId || '').trim();
    const roleName = resolveRoleNameForThoughtChain(rid);
    const list = Array.isArray(rounds) ? rounds : [];
    const lines = [];
    lines.push('【角色思考链提取】');
    lines.push('角色：' + roleName + (rid ? '（' + rid + '）' : ''));
    lines.push('提取时间：' + formatDevPromptTimestamp(Date.now()));
    lines.push('轮数：' + String(list.length));
    lines.push('');
    for (let i = 0; i < list.length; i++) {
        const item = list[i] || {};
        const ts = formatDevPromptTimestamp(item.timestamp);
        lines.push('【第' + String(i + 1) + '轮｜' + ts + '】');
        lines.push('思考链：' + (item.thought || '（该轮未记录 thought）'));
        lines.push('内心独白：' + (item.innerMonologue || '（该轮未记录 inner_monologue）'));
        if (item.replySnippet) {
            lines.push('对外回复摘录：' + item.replySnippet);
        }
        lines.push('');
    }
    return lines.join('\n').trim();
}

async function extractCurrentRoleThoughtChain() {
    const devUnlocked = localStorage.getItem('dev_mode_unlocked') === 'true';
    if (!devUnlocked) {
        notifyDevPromptAction('未解锁开发者模式，无法提取思考链。');
        return;
    }
    const roleId = resolveThoughtChainRoleId();
    if (!roleId) {
        notifyDevPromptAction('当前没有可提取的角色，请先进入一个角色聊天。');
        return;
    }
    const rounds = collectThoughtChainRounds(roleId, 50);
    const outputEl = document.getElementById('dev-thought-chain-output');
    if (!rounds.length) {
        const emptyText = '未找到思考链记录。\n请先和该角色对话 1-2 轮后再提取。';
        if (outputEl) outputEl.textContent = emptyText;
        notifyDevPromptAction('未找到思考链记录。');
        return;
    }
    const text = buildThoughtChainExportText(roleId, rounds);
    if (outputEl) {
        outputEl.textContent = text;
    } else {
        try {
            prompt('思考链提取结果：', text);
        } catch (e) {
            alert(text);
        }
    }
    window.__lastExtractedThoughtChainText = text;
    const copied = await copyTextForDevPrompt(text);
    notifyDevPromptAction(copied ? '思考链已提取并复制到剪贴板。' : '思考链已提取。');
}

window.extractCurrentRoleThoughtChain = extractCurrentRoleThoughtChain;

// 4. 保存所有设置
function saveAllSettings(silent = false) {
    let url = document.getElementById('setting-api-url').value.trim();
    const key = document.getElementById('setting-api-key').value.trim();
    const model = document.getElementById('setting-model-select').value;
    const temp = document.getElementById('setting-temp-slider').value;
    let summaryUrl = document.getElementById('setting-summary-api-url').value.trim();
    const summaryKey = document.getElementById('setting-summary-api-key').value.trim();
    const summaryModel = document.getElementById('setting-summary-model').value.trim();

    try {
        if (window.updateSystemPromptDebugUI) window.updateSystemPromptDebugUI();
    } catch (e) { }

    if (url && key) {
        if (url.endsWith('/')) url = url.slice(0, -1);

        localStorage.setItem('api_base_url', url);
        localStorage.setItem('user_api_key', key);
        localStorage.setItem('selected_model', model);
        // 新增：保存温度
        localStorage.setItem('model_temperature', temp);

        if (summaryUrl && summaryUrl.endsWith('/')) summaryUrl = summaryUrl.slice(0, -1);
        if (summaryUrl) localStorage.setItem('summary_api_base_url', summaryUrl);
        else localStorage.removeItem('summary_api_base_url');
        if (summaryKey) localStorage.setItem('summary_user_api_key', summaryKey);
        else localStorage.removeItem('summary_user_api_key');
        if (summaryModel) localStorage.setItem('summary_selected_model', summaryModel);
        else localStorage.removeItem('summary_selected_model');
        
        if (!silent) alert(`✅ 设置已保存！\n\n模型：${model}\n温度：${temp}`);
        if (!silent && window.closeApp) window.closeApp();
    } else {
        if (!silent) alert("地址和 Key 不能为空！");
    }
}

// 5. 清除所有数据（彻底版）
async function clearAllData() {
    // 弹出确认对话框
    const confirmed = confirm("⚠️ 警告：此操作将清除所有保存的数据！\n\n包括：\n• API 配置\n• 聊天记录\n• 角色数据\n• 所有设置\n• 缓存文件\n\n确定要继续吗？");
    
    if (confirmed) {
        // 二次确认
        const doubleConfirm = confirm("🚨 最后确认：\n\n数据清除后无法恢复！\n\n确定要清除所有数据吗？");
        
        if (doubleConfirm) {
            try {
                async function withClearTimeout(promise, ms, label) {
                    return new Promise(function (resolve, reject) {
                        let done = false;
                        const timer = setTimeout(function () {
                            if (done) return;
                            done = true;
                            reject(new Error(String(label || 'clear') + ' timeout'));
                        }, ms || 1800);
                        Promise.resolve(promise).then(function (value) {
                            if (done) return;
                            done = true;
                            clearTimeout(timer);
                            resolve(value);
                        }).catch(function (err) {
                            if (done) return;
                            done = true;
                            clearTimeout(timer);
                            reject(err);
                        });
                    });
                }

                async function clearKnownLocalForageStores() {
                    if (!window.localforage) return;
                    const stores = [
                        { name: 'shubao-phone', storeName: 'wechat_v2' },
                        { name: 'shubao-phone', storeName: 'wechat' },
                        { name: 'shubao_redbook_store_v1', storeName: 'redbook' },
                        { name: 'shubao_large_store_v1', storeName: 'couple_space' },
                        { name: 'shubao_large_store_v1', storeName: 'activity_logs' },
                        { name: 'localforage', storeName: 'keyvaluepairs' }
                    ];
                    for (let i = 0; i < stores.length; i++) {
                        try {
                            const cfg = stores[i];
                            const instance = typeof localforage.createInstance === 'function'
                                ? localforage.createInstance(cfg)
                                : localforage;
                            if (instance && typeof instance.clear === 'function') {
                                await withClearTimeout(instance.clear(), 1800, cfg.name + '/' + cfg.storeName);
                            }
                        } catch (e0) { }
                    }
                }

                async function deleteIndexedDbDatabase(name) {
                    const dbName = String(name || '').trim();
                    if (!dbName || !window.indexedDB || typeof window.indexedDB.deleteDatabase !== 'function') return;
                    await new Promise(function (resolve) {
                        try {
                            const request = window.indexedDB.deleteDatabase(dbName);
                            request.onsuccess = function () { resolve(); };
                            request.onerror = function () { resolve(); };
                            request.onblocked = function () { resolve(); };
                        } catch (e) {
                            resolve();
                        }
                    });
                }

                async function clearKnownIndexedDbDatabases() {
                    const names = new Set([
                        'shubao-phone',
                        'shubao_redbook_store_v1',
                        'shubao_large_store_v1',
                        'localforage'
                    ]);
                    try {
                        if (window.indexedDB && typeof window.indexedDB.databases === 'function') {
                            const dbs = await window.indexedDB.databases();
                            (Array.isArray(dbs) ? dbs : []).forEach(function (item) {
                                const name = String(item && item.name || '').trim();
                                if (name) names.add(name);
                            });
                        }
                    } catch (e) { }
                    const list = Array.from(names);
                    for (let i = 0; i < list.length; i++) {
                        await deleteIndexedDbDatabase(list[i]);
                    }
                }

                function resetInMemoryData() {
                    window.currentChatRole = '';
                    window.chatData = {};
                    window.chatMapData = {};
                    window.charProfiles = {};
                    window.userPersonas = {};
                    window.chatBackgrounds = {};
                    window.callLogs = {};
                    window.chatUnread = {};
                    window.familyCardState = { receivedCards: [], sentCards: [] };
                    window.memoryArchiveStore = {};
                    window.voiceCallHistory = [];
                    window.editVideoAlbumData = [];
                    window.stickerData = null;
                    window.momentsData = { posts: [], hiddenPosts: [], likes: [], comments: [] };
                    window.globalChatWallpaper = '';
                }

                // 1. 清除 localStorage
                if (typeof window.resetWechatDataRuntime === 'function') {
                    window.resetWechatDataRuntime();
                } else if (window.WechatStore && typeof window.WechatStore.resetRuntime === 'function') {
                    window.WechatStore.resetRuntime();
                }
                if (window.WechatStore && typeof window.WechatStore.clearAll === 'function') {
                    try {
                        await window.WechatStore.clearAll();
                    } catch (e0) {
                        console.warn('清空 WechatStore 快照失败', e0);
                    }
                }
                resetInMemoryData();
                localStorage.clear();
                console.log("✅ localStorage 已清除");
                
                // 2. 清除 sessionStorage
                sessionStorage.clear();
                console.log("✅ sessionStorage 已清除");
                
                // 3. 清除 IndexedDB (localForage)
                if (window.localforage) {
                    await clearKnownLocalForageStores();
                    console.log("✅ localForage 已清除");
                }
                await clearKnownIndexedDbDatabases();
                console.log("✅ IndexedDB 已删除");
                
                // 4. 注销 Service Worker（清除缓存控制）
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        await registration.unregister();
                        console.log("✅ Service Worker 已注销");
                    }
                }
                
                // 5. 清除所有缓存
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    for (const cacheName of cacheNames) {
                        await caches.delete(cacheName);
                        console.log("✅ 缓存已删除:", cacheName);
                    }
                }
                
                // 显示成功消息
                alert("✅ 所有数据已彻底清除！\n\n页面将自动刷新...");
                
                // 强制刷新（绕过缓存）
                setTimeout(() => {
                    window.location.reload();
                }, 500);
                
            } catch (error) {
                console.error("清除数据时出错:", error);
                alert("❌ 清除数据时出错: " + error.message + "\n\n请查看控制台了解详情");
            }
        }
    }
}

function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function safeJsonParse(text) {
    try { return JSON.parse(text); } catch (e) { return null; }
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
}

function base64ToUint8Array(base64) {
    const binary = atob(String(base64 || ''));
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function gzipToBase64(text) {
    const input = new TextEncoder().encode(String(text || ''));
    const stream = new Blob([input]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return arrayBufferToBase64(buf);
}

async function gunzipFromBase64(base64) {
    const bytes = base64ToUint8Array(base64);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(buf);
}

const SETTINGS_BACKUP_VERSION = 2;
const SETTINGS_BACKUP_SPLIT_LIMIT = 6 * 1024 * 1024;
const SETTINGS_BACKUP_IMPORT_BUFFER_KEY = '__settingsBackupSplitImportBuffer';
const STORAGE_PERSIST_PROMPT_KEY = 'storage_persist_prompted_v1';
const STORAGE_BUCKET_META = {
    main: {
        label: '主备份',
        description: '微信聊天、角色、记忆、表情、朋友圈、世界书、API 设置和相关零散数据',
        color: '#2563eb',
        group: 'main'
    },
    couple_space: {
        label: '副备份·情侣空间',
        description: '情侣空间、私密空间、问答与情侣联动数据',
        color: '#ec4899',
        group: 'secondary'
    },
    redbook: {
        label: '副备份·小红书',
        description: '小红书内容、频道和互动数据',
        color: '#ef4444',
        group: 'secondary'
    },
    beautify: {
        label: '副备份·美化与 CSS',
        description: '桌面图标、壁纸、小组件、聊天外观和全局 CSS',
        color: '#8b5cf6',
        group: 'secondary'
    },
    other: {
        label: '副备份·其他附属数据',
        description: '活动记录、工具页状态、待办等剩余本地数据',
        color: '#0f766e',
        group: 'secondary'
    }
};
const STORAGE_BUCKET_ORDER = ['main', 'couple_space', 'redbook', 'beautify', 'other'];
const STORAGE_MAIN_EXACT_KEYS = new Set([
    'currentChatId',
    'selected_model',
    'model_temperature',
    'user_api_key',
    'api_base_url',
    'summary_user_api_key',
    'summary_api_base_url',
    'summary_selected_model',
    'user_name',
    'user_avatar',
    'user_nickname',
    'stickerData',
    'stickerData_v2',
    'ai_memory_archives',
    'ai_trace_debug',
    'ai_trace_stack',
    'chat_memory_limit',
    'chat_bubble_delay',
    'show_system_prompt_in_chat',
    'autoOpenWechat',
    'last_active_timestamp',
    'listen_together_invite',
    'listen_together_session',
    'listen_together_pending_ai',
    'api_settings_presets_v1',
    'api_settings_last_preset_v1',
    'chat_summary_freq'
]);
const STORAGE_MAIN_PREFIXES = ['wechat_', 'chat_', 'api_'];
const STORAGE_COUPLE_PREFIXES = ['couple_', 'coupleSpace_', 'couple_space_', 'secret_space_', 'secret_heart_', 'qlkj_'];
const STORAGE_REDBOOK_PREFIXES = ['redbook_'];
const STORAGE_BEAUTIFY_EXACT_KEYS = new Set([
    'desktopWallpaper',
    'desktopAppList',
    'icon_follow_wallpaper',
    'icon_custom_color',
    'show_status_info',
    'aes_bubble_text',
    'chat_bubble_css',
    'globalChatWallpaper',
    'global_chat_wallpaper_fallback_v1'
]);
const STORAGE_BEAUTIFY_PREFIXES = ['appearance_', 'widget_', 'app_global_font_'];

function formatBackupSize(bytes) {
    const n = Number(bytes || 0);
    if (!Number.isFinite(n) || n <= 0) return '0 B';
    if (n < 1024) return Math.round(n) + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function getSettingsBackupSplitImportBuffer() {
    const current = window[SETTINGS_BACKUP_IMPORT_BUFFER_KEY];
    if (current && typeof current === 'object') return current;
    const next = {
        splitId: '',
        total: 0,
        payloadFormat: '',
        summary: null,
        parts: {}
    };
    window[SETTINGS_BACKUP_IMPORT_BUFFER_KEY] = next;
    return next;
}

function clearSettingsBackupSplitImportBuffer() {
    window[SETTINGS_BACKUP_IMPORT_BUFFER_KEY] = {
        splitId: '',
        total: 0,
        payloadFormat: '',
        summary: null,
        parts: {}
    };
}

function listMissingBackupPartIndexes(total, partsMap) {
    const missing = [];
    const safeTotal = Math.max(0, Number(total) || 0);
    const map = partsMap && typeof partsMap === 'object' ? partsMap : {};
    for (let i = 1; i <= safeTotal; i++) {
        if (!map[i]) missing.push(i);
    }
    return missing;
}

function formatBackupPartNumberList(indexes) {
    const list = Array.isArray(indexes) ? indexes : [];
    if (!list.length) return '';
    const preview = list.slice(0, 8).map(function (n) {
        return String(n).padStart(2, '0');
    });
    const suffix = list.length > preview.length ? ' ...' : '';
    return preview.join('、') + suffix;
}

function getTextSize(text) {
    try {
        return new Blob([String(text || '')]).size;
    } catch (e) {
        return String(text || '').length;
    }
}

function sleepSettingsBackup(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms || 0);
    });
}

function getStorageBucketMeta(bucketId) {
    return STORAGE_BUCKET_META[bucketId] || STORAGE_BUCKET_META.other;
}

function getBackupKindLabel(kind) {
    const mode = String(kind || '').trim();
    if (mode === 'main') return '主备份';
    if (mode === 'secondary') return '副备份';
    return '完整备份';
}

function getBackupKindFilePrefix(kind) {
    const mode = String(kind || '').trim();
    if (mode === 'main') return 'shubao-main-backup-';
    if (mode === 'secondary') return 'shubao-secondary-backup-';
    return 'shubao-backup-';
}

function matchStorageKeyRule(key, exactSet, prefixes) {
    const name = String(key || '').trim();
    if (!name) return false;
    if (exactSet && exactSet.has && exactSet.has(name)) return true;
    const list = Array.isArray(prefixes) ? prefixes : [];
    return list.some(function (prefix) {
        return prefix && name.indexOf(prefix) === 0;
    });
}

function classifyStorageBucketByKey(key) {
    const name = String(key || '').trim();
    if (!name) return 'other';
    if (matchStorageKeyRule(name, null, STORAGE_COUPLE_PREFIXES)) return 'couple_space';
    if (matchStorageKeyRule(name, null, STORAGE_REDBOOK_PREFIXES)) return 'redbook';
    if (matchStorageKeyRule(name, STORAGE_BEAUTIFY_EXACT_KEYS, STORAGE_BEAUTIFY_PREFIXES)) return 'beautify';
    if (matchStorageKeyRule(name, STORAGE_MAIN_EXACT_KEYS, STORAGE_MAIN_PREFIXES)) return 'main';
    return 'other';
}

function classifyStorageBucket(options) {
    const cfg = options && typeof options === 'object' ? options : {};
    const storeId = String(cfg.storeId || '').trim();
    const key = String(cfg.key || '').trim();

    if (storeId === 'wechat' || storeId === 'wechat_v2') return 'main';
    if (storeId === 'couple_space') return 'couple_space';
    if (storeId === 'redbook') return 'redbook';
    if (storeId === 'activity_logs') return 'other';
    return classifyStorageBucketByKey(key);
}

function getBackupGroupByBucket(bucketId) {
    return getStorageBucketMeta(bucketId).group || 'secondary';
}

function cloneBackupStoreMeta(store, items) {
    const meta = store && typeof store === 'object' ? store : {};
    return {
        id: String(meta.id || ''),
        label: String(meta.label || meta.id || ''),
        name: String(meta.name || ''),
        storeName: String(meta.storeName || ''),
        items: items || {}
    };
}

function filterWebStorageForBackupKind(source, kind) {
    const data = source && typeof source === 'object' ? source : {};
    const mode = String(kind || 'full').trim();
    if (mode === 'full') return Object.assign({}, data);
    const out = {};
    Object.keys(data).forEach(function (key) {
        const bucket = classifyStorageBucket({ key: key });
        if (getBackupGroupByBucket(bucket) === mode) {
            out[key] = data[key];
        }
    });
    return out;
}

function filterLocalForageStoresForBackupKind(stores, kind) {
    const list = Array.isArray(stores) ? stores : [];
    const mode = String(kind || 'full').trim();
    if (mode === 'full') return list.slice();
    const out = [];
    list.forEach(function (store) {
        const items = store && isObject(store.items) ? store.items : {};
        const filteredItems = {};
        Object.keys(items).forEach(function (key) {
            const bucket = classifyStorageBucket({
                storeId: store && store.id,
                key: key
            });
            if (getBackupGroupByBucket(bucket) === mode) {
                filteredItems[key] = items[key];
            }
        });
        if (Object.keys(filteredItems).length) {
            out.push(cloneBackupStoreMeta(store, filteredItems));
        }
    });
    return out;
}

function filterBackupPayloadByKind(payload, kind) {
    const data = payload && typeof payload === 'object' ? payload : {};
    const mode = String(kind || 'full').trim();
    if (mode === 'full') return Object.assign({}, data, { kind: 'full' });
    return {
        version: data.version || SETTINGS_BACKUP_VERSION,
        kind: mode,
        createdAt: data.createdAt || new Date().toISOString(),
        origin: data.origin || (location.origin || ''),
        href: data.href || (location.href || ''),
        userAgent: data.userAgent || (navigator.userAgent || ''),
        localStorage: filterWebStorageForBackupKind(data.localStorage, mode),
        sessionStorage: filterWebStorageForBackupKind(data.sessionStorage, mode),
        localforage: {
            stores: filterLocalForageStoresForBackupKind(data.localforage && data.localforage.stores, mode)
        }
    };
}

function shouldIncludeBackupBucketForKind(bucketId, kind) {
    const mode = String(kind || 'full').trim() || 'full';
    if (mode === 'full') return true;
    return getBackupGroupByBucket(bucketId) === mode;
}

function shouldIncludeBackupItemForKind(options, kind) {
    const bucket = classifyStorageBucket(options || {});
    return shouldIncludeBackupBucketForKind(bucket, kind);
}

const BACKUP_RESTORE_SKIP_LOCAL_KEYS = new Set([
    'isReturnFromChat',
    'currentChatId',
    'eruda_debug',
    'storage_persist_prompted_v1'
]);

const BACKUP_RESTORE_SKIP_PREFIXES = [
    '__settingsBackup',
    'import_',
    'tmp_',
    'temp_'
];

function shouldRestoreWebStorageKey(key, scope) {
    const name = String(key || '').trim();
    if (!name) return false;
    if (String(scope || '') === 'sessionStorage') return false;
    if (BACKUP_RESTORE_SKIP_LOCAL_KEYS.has(name)) return false;
    return !BACKUP_RESTORE_SKIP_PREFIXES.some(function (prefix) {
        return prefix && name.indexOf(prefix) === 0;
    });
}

function createRestoreSummary() {
    return {
        localStorageCount: 0,
        sessionStorageCount: 0,
        localForageKeyCount: 0,
        skippedCount: 0,
        failedCount: 0,
        failedKeys: []
    };
}

function noteRestoreFailure(summary, scope, key, error) {
    if (!summary || typeof summary !== 'object') return;
    summary.failedCount = Number(summary.failedCount || 0) + 1;
    if (!Array.isArray(summary.failedKeys)) summary.failedKeys = [];
    if (summary.failedKeys.length < 8) {
        summary.failedKeys.push(String(scope || 'storage') + ':' + String(key || '') + (error && error.name ? ' (' + error.name + ')' : ''));
    }
}

function buildCleanReloadUrl() {
    try {
        const url = new URL(window.location.href);
        url.hash = '';
        return url.href;
    } catch (e) {
        return window.location.pathname || './';
    }
}

function clearBackupRestoreRuntimeState() {
    try {
        BACKUP_RESTORE_SKIP_LOCAL_KEYS.forEach(function (key) {
            localStorage.removeItem(key);
        });
    } catch (e) { }
    try {
        sessionStorage.clear();
    } catch (e2) { }
}

function reloadAfterBackupImport() {
    clearBackupRestoreRuntimeState();
    window.setTimeout(function () {
        try {
            const cleanUrl = buildCleanReloadUrl();
            if (cleanUrl && cleanUrl !== window.location.href && window.history && typeof window.history.replaceState === 'function') {
                window.history.replaceState(null, document.title || '', cleanUrl);
            }
            window.location.reload();
        } catch (e) {
            window.location.reload();
        }
    }, 900);
}

function getStorageValueSize(value, preferString) {
    if (preferString === true) {
        return getTextSize(String(value == null ? '' : value));
    }
    try {
        return getTextSize(JSON.stringify(value));
    } catch (e) {
        return getTextSize(String(value == null ? '' : value));
    }
}

function analyzeStoragePayload(payload) {
    const data = payload && typeof payload === 'object' ? payload : {};
    const bucketSizes = {
        main: 0,
        couple_space: 0,
        redbook: 0,
        beautify: 0,
        other: 0
    };

    const addToBucket = function (bucket, size) {
        const key = bucketSizes[bucket] != null ? bucket : 'other';
        bucketSizes[key] += Number(size || 0);
    };

    const ls = isObject(data.localStorage) ? data.localStorage : {};
    Object.keys(ls).forEach(function (key) {
        addToBucket(classifyStorageBucket({ key: key }), getStorageValueSize(ls[key], true));
    });

    const ss = isObject(data.sessionStorage) ? data.sessionStorage : {};
    Object.keys(ss).forEach(function (key) {
        addToBucket(classifyStorageBucket({ key: key }), getStorageValueSize(ss[key], true));
    });

    const stores = Array.isArray(data.localforage && data.localforage.stores) ? data.localforage.stores : [];
    stores.forEach(function (store) {
        const items = store && isObject(store.items) ? store.items : {};
        Object.keys(items).forEach(function (key) {
            addToBucket(classifyStorageBucket({ storeId: store.id, key: key }), getStorageValueSize(items[key], false));
        });
    });

    const categories = STORAGE_BUCKET_ORDER.map(function (bucketId) {
        const meta = getStorageBucketMeta(bucketId);
        return {
            id: bucketId,
            label: meta.label,
            description: meta.description,
            color: meta.color,
            size: bucketSizes[bucketId] || 0,
            group: meta.group
        };
    });

    return {
        totalSize: categories.reduce(function (sum, item) { return sum + Number(item.size || 0); }, 0),
        mainSize: bucketSizes.main || 0,
        secondarySize: (bucketSizes.couple_space || 0) + (bucketSizes.redbook || 0) + (bucketSizes.beautify || 0) + (bucketSizes.other || 0),
        categories: categories
    };
}

async function getStoragePersistenceState() {
    const supported = !!(navigator.storage && typeof navigator.storage.persisted === 'function');
    if (!supported) {
        return {
            supported: false,
            persisted: false
        };
    }
    try {
        return {
            supported: true,
            persisted: !!(await navigator.storage.persisted())
        };
    } catch (e) {
        return {
            supported: true,
            persisted: false
        };
    }
}

async function requestStoragePersistence() {
    if (!navigator.storage || typeof navigator.storage.persist !== 'function') return false;
    try {
        return !!(await navigator.storage.persist());
    } catch (e) {
        return false;
    }
}

function showStoragePersistencePrompt() {
    if (document.getElementById('storage-persistence-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'storage-persistence-modal';
    modal.style.cssText = 'position:fixed; inset:0; z-index:10000; background:rgba(15,23,42,0.45); display:flex; align-items:center; justify-content:center; padding:20px;';
    modal.innerHTML = `
        <div style="width:min(360px, 100%); background:#fff; border-radius:22px; padding:22px; box-shadow:0 22px 60px rgba(15,23,42,0.22);">
            <div style="font-size:20px; font-weight:800; color:#111827;">申请防清理保护</div>
            <div style="font-size:13px; color:#6b7280; line-height:1.8; margin-top:10px;">
                这会向浏览器申请尽量不要自动清理本地数据。浏览器可能拒绝授权，不影响正常使用。
                如果未授予保护，请定期导出备份。
            </div>
            <div style="display:flex; gap:10px; margin-top:18px;">
                <button id="storage-persist-confirm-btn" type="button" style="flex:1; padding:12px; border:none; border-radius:14px; background:linear-gradient(135deg,#16a34a 0%, #22c55e 100%); color:#fff; font-weight:700; cursor:pointer;">立即申请</button>
                <button id="storage-persist-later-btn" type="button" style="flex:1; padding:12px; border:none; border-radius:14px; background:#eef2ff; color:#4338ca; font-weight:700; cursor:pointer;">稍后</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeModal = function () {
        try { modal.remove(); } catch (e) { }
    };

    document.getElementById('storage-persist-confirm-btn').onclick = async function () {
        const ok = await requestStoragePersistence();
        localStorage.setItem(STORAGE_PERSIST_PROMPT_KEY, 'true');
        alert(ok ? '✅ 浏览器已授予防清理保护' : '⚠️ 当前浏览器未授予防清理保护，不影响使用，请定期导出备份。');
        closeModal();
        try {
            if (typeof window.refreshStorageDashboard === 'function') window.refreshStorageDashboard();
        } catch (e) { }
    };

    document.getElementById('storage-persist-later-btn').onclick = function () {
        localStorage.setItem(STORAGE_PERSIST_PROMPT_KEY, 'true');
        closeModal();
    };
}

async function checkAndRequestStoragePersistence() {
    const state = await getStoragePersistenceState();
    if (!state.supported || state.persisted) return;
    if (localStorage.getItem(STORAGE_PERSIST_PROMPT_KEY)) return;
    showStoragePersistencePrompt();
}

function waitForStorageUiPaint(delay) {
    return new Promise(function (resolve) {
        window.setTimeout(resolve, typeof delay === 'number' ? delay : 32);
    });
}

function showStorageExportBusyModal(options) {
    const existing = document.getElementById('storage-export-busy-mask');
    if (existing) {
        try { existing.remove(); } catch (e) { }
    }

    const opts = isObject(options) ? options : {};
    const badgeText = String(opts.badge || '备份').slice(0, 4);
    const mask = document.createElement('div');
    mask.id = 'storage-export-busy-mask';
    mask.className = 'ui-dialog-mask is-visible';
    mask.style.zIndex = '210100';
    mask.innerHTML = `
        <div class="ui-dialog" style="width:min(92vw, 360px);">
            <div class="ui-dialog-body" style="padding:18px 16px 16px;">
                <div style="display:flex; justify-content:center; margin-bottom:4px;">
                    <div style="min-width:52px; height:52px; border-radius:18px; padding:0 12px; background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%); box-shadow:0 10px 24px rgba(37,99,235,0.28); display:flex; align-items:center; justify-content:center; color:#fff; font-size:15px; font-weight:800; letter-spacing:0.06em;">${badgeText}</div>
                </div>
                <div class="ui-dialog-title" id="storage-export-busy-title"></div>
                <div class="ui-dialog-message" id="storage-export-busy-message"></div>
                <div id="storage-export-busy-detail" style="font-size:12px; color:#6b7280; line-height:1.6; text-align:center;"></div>
            </div>
        </div>
    `;
    document.body.appendChild(mask);

    const titleEl = document.getElementById('storage-export-busy-title');
    const messageEl = document.getElementById('storage-export-busy-message');
    const detailEl = document.getElementById('storage-export-busy-detail');

    function setTitle(text) {
        if (titleEl) titleEl.textContent = String(text == null ? '' : text);
    }

    function setMessage(text) {
        if (messageEl) messageEl.textContent = String(text == null ? '' : text);
    }

    function setDetail(text) {
        if (!detailEl) return;
        const nextText = String(text == null ? '' : text);
        detailEl.textContent = nextText;
        detailEl.style.display = nextText ? '' : 'none';
    }

    function close() {
        try { mask.remove(); } catch (e) { }
    }

    setTitle(opts.title || '正在压缩备份');
    setMessage(opts.message || '当前文件较大，正在整理备份文件，请不要退出应用。');
    setDetail(opts.detail || '');

    return {
        setTitle: setTitle,
        setMessage: setMessage,
        setDetail: setDetail,
        close: close
    };
}

function getBackupLocalForageStores() {
    return [
        {
            id: 'wechat_v2',
            label: '微信统一储存',
            name: 'shubao-phone',
            storeName: 'wechat_v2'
        },
        {
            id: 'wechat',
            label: '微信/聊天/桌面大数据',
            name: 'shubao-phone',
            storeName: 'wechat'
        },
        {
            id: 'redbook',
            label: '小红书',
            name: 'shubao_redbook_store_v1',
            storeName: 'redbook'
        },
        {
            id: 'couple_space',
            label: '情侣空间',
            name: 'shubao_large_store_v1',
            storeName: 'couple_space'
        },
        {
            id: 'activity_logs',
            label: '系统活动记录',
            name: 'shubao_large_store_v1',
            storeName: 'activity_logs'
        },
        {
            id: 'localforage_default',
            label: 'localforage 默认仓库',
            name: 'localforage',
            storeName: 'keyvaluepairs'
        }
    ];
}

function createBackupLocalForageInstance(store) {
    if (!window.localforage) return null;
    if (window.localforage.createInstance && store && store.name && store.storeName) {
        return window.localforage.createInstance({
            name: String(store.name),
            storeName: String(store.storeName)
        });
    }
    return window.localforage;
}

async function mirrorWechatLargeStoreToLocalStorageAfterRestore() {
    if (window.WechatStore && typeof window.WechatStore.init === 'function') {
        try {
            await window.WechatStore.init({ forceReload: true });
            return 1;
        } catch (e0) { }
    }

    const instance = createBackupLocalForageInstance({
        id: 'wechat',
        name: 'shubao-phone',
        storeName: 'wechat'
    });
    if (!instance || typeof instance.getItem !== 'function') return 0;
    const keys = [
        'wechat_charProfiles',
        'wechat_chatData',
        'wechat_chatMapData',
        'wechat_userPersonas',
        'wechat_unread',
        'wechat_backgrounds',
        'wechat_callLogs',
        'wechat_family_cards',
        'wechat_sticker_data'
    ];
    let count = 0;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        try {
            const value = await instance.getItem(key);
            if (value === null || value === undefined) continue;
            localStorage.setItem(key, JSON.stringify(value));
            count++;
        } catch (e) { }
    }
    return count;
}

async function readLocalForageStoreForBackup(store) {
    const meta = {
        id: String(store.id || ''),
        label: String(store.label || store.id || ''),
        name: String(store.name || ''),
        storeName: String(store.storeName || ''),
        items: {}
    };
    const instance = createBackupLocalForageInstance(store);
    if (!instance || typeof instance.keys !== 'function' || typeof instance.getItem !== 'function') {
        meta.error = 'localforage unavailable';
        return meta;
    }

    try {
        const keys = await instance.keys();
        const list = Array.isArray(keys) ? keys : [];
        for (let i = 0; i < list.length; i++) {
            const key = String(list[i] || '');
            if (!key) continue;
            try {
                const value = await instance.getItem(key);
                if (value !== null && value !== undefined) meta.items[key] = value;
            } catch (e) {
                if (!meta.readErrors) meta.readErrors = [];
                meta.readErrors.push(key);
            }
        }
    } catch (e2) {
        meta.error = e2 && e2.message ? e2.message : 'read failed';
    }

    return meta;
}

function readAllWebStorage(storage) {
    const out = {};
    if (!storage) return out;
    try {
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (!key) continue;
            const value = storage.getItem(key);
            if (value != null) out[key] = value;
        }
    } catch (e) { }
    return out;
}

async function buildAppBackupPayload(kind) {
    const createdAt = new Date().toISOString();
    const stores = [];
    const storeConfigs = getBackupLocalForageStores();
    for (let i = 0; i < storeConfigs.length; i++) {
        stores.push(await readLocalForageStoreForBackup(storeConfigs[i]));
    }

    const fullPayload = {
        version: SETTINGS_BACKUP_VERSION,
        kind: 'full',
        createdAt: createdAt,
        origin: location.origin || '',
        href: location.href || '',
        userAgent: navigator.userAgent || '',
        localStorage: readAllWebStorage(localStorage),
        sessionStorage: {},
        localforage: {
            stores: stores
        }
    };
    return filterBackupPayloadByKind(fullPayload, kind || 'full');
}

function summarizeBackupPayload(payload) {
    const data = payload && typeof payload === 'object' ? payload : {};
    const ls = isObject(data.localStorage) ? data.localStorage : (isObject(data.ls) ? data.ls : {});
    const ss = isObject(data.sessionStorage) ? data.sessionStorage : {};
    let storeCount = 0;
    let forageKeyCount = 0;
    if (data.localforage && Array.isArray(data.localforage.stores)) {
        storeCount = data.localforage.stores.length;
        data.localforage.stores.forEach(function (store) {
            if (store && isObject(store.items)) forageKeyCount += Object.keys(store.items).length;
        });
    } else if (isObject(data.lf)) {
        storeCount = 1;
        forageKeyCount = Object.keys(data.lf).length;
    }
    return {
        localStorageCount: Object.keys(ls).length,
        sessionStorageCount: Object.keys(ss).length,
        localForageStoreCount: storeCount,
        localForageKeyCount: forageKeyCount
    };
}

async function encodeBackupPayload(payload) {
    const payloadText = JSON.stringify(payload || {});
    const rawBytes = getTextSize(payloadText);
    if (typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined') {
        try {
            return {
                format: 'gzip-base64',
                text: await gzipToBase64(payloadText),
                rawBytes: rawBytes
            };
        } catch (e) { }
    }
    return {
        format: 'plain-json',
        text: payloadText,
        rawBytes: rawBytes
    };
}

async function decodeBackupPayload(format, text) {
    const mode = String(format || '').trim();
    if (mode === 'gzip-base64') {
        if (typeof DecompressionStream === 'undefined') {
            throw new Error('当前环境不支持解压缩，无法导入该备份');
        }
        return safeJsonParse(await gunzipFromBase64(text || ''));
    }
    if (mode === 'plain-json') {
        return safeJsonParse(String(text || ''));
    }
    if (mode === 'plain') {
        return text;
    }
    throw new Error('不支持的备份格式：' + (mode || '未知'));
}

function downloadTextFile(filename, text) {
    const blob = new Blob([String(text || '')], { type: 'application/json;charset=utf-8' });
    downloadBlobFile(filename, blob);
}

function downloadBlobFile(filename, blob) {
    const safeBlob = blob instanceof Blob ? blob : new Blob([blob == null ? '' : blob]);
    const url = URL.createObjectURL(safeBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isZipBackupFile(file) {
    const name = String(file && file.name || '').toLowerCase();
    const type = String(file && file.type || '').toLowerCase();
    return name.endsWith('.zip') || type === 'application/zip' || type === 'application/x-zip-compressed';
}

function isJsonlBackupBundleFile(file) {
    const name = String(file && file.name || '').toLowerCase();
    const type = String(file && file.type || '').toLowerCase();
    return name.endsWith('.jsonl')
        || name.endsWith('.ndjson')
        || name.endsWith('.shubaobak')
        || name.endsWith('.shubao-backup')
        || type === 'application/x-ndjson'
        || type === 'application/jsonl';
}

function ensureJSZipAvailable() {
    if (window.JSZip) return window.JSZip;
    throw new Error('ZIP 模块未加载，请刷新页面后再试');
}

async function buildZipForSplitBackup(files) {
    const JSZipRef = ensureJSZipAvailable();
    const zip = new JSZipRef();
    files.forEach(function (item) {
        if (!item || !item.name) return;
        zip.file(item.name, item.text || '');
    });
    return await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });
}

async function readBackupRecordsFromZipFile(file) {
    const JSZipRef = ensureJSZipAvailable();
    const zip = await JSZipRef.loadAsync(await file.arrayBuffer());
    const names = Object.keys(zip.files || {}).filter(function (name) {
        const entry = zip.files[name];
        return entry && !entry.dir && /\.json$/i.test(name);
    }).sort();

    if (!names.length) {
        throw new Error('ZIP 中没有找到可导入的备份 JSON 文件');
    }

    const records = [];
    for (let i = 0; i < names.length; i++) {
        const entryName = names[i];
        const text = await zip.files[entryName].async('string');
        const json = safeJsonParse(text);
        if (!json || !isObject(json)) {
            throw new Error('ZIP 内文件不是有效 JSON：' + entryName);
        }
        if (json.__shubao_backup__ !== 1) {
            throw new Error('ZIP 内文件不是本系统备份：' + entryName);
        }
        json.__fileName = (file.name || 'backup.zip') + ' > ' + entryName;
        records.push(json);
    }
    return records;
}

async function buildJsonlBundleForSplitBackup(options) {
    const opts = isObject(options) ? options : {};
    const encodedText = String(opts.encodedText || '');
    const limit = Math.max(1, Number(opts.chunkSize || SETTINGS_BACKUP_SPLIT_LIMIT) || SETTINGS_BACKUP_SPLIT_LIMIT);
    const total = Math.ceil(encodedText.length / limit);
    const parts = [];
    const split = {
        id: String(opts.exportId || ''),
        total: total,
        payloadFormat: String(opts.payloadFormat || ''),
        chunkSize: limit
    };

    parts.push(JSON.stringify({
        __shubao_backup_bundle__: 1,
        version: SETTINGS_BACKUP_VERSION,
        createdAt: String(opts.createdAt || ''),
        kind: String(opts.kind || 'full'),
        format: 'jsonl-split',
        split: split,
        summary: opts.summary || null
    }) + '\n');

    for (let i = 0; i < total; i++) {
        const index = i + 1;
        const chunk = encodedText.slice(i * limit, (i + 1) * limit);
        parts.push(JSON.stringify({
            __shubao_backup__: 1,
            version: SETTINGS_BACKUP_VERSION,
            createdAt: String(opts.createdAt || ''),
            kind: String(opts.kind || 'full'),
            format: 'split',
            split: Object.assign({}, split, { index: index }),
            summary: opts.summary || null,
            data: chunk
        }) + '\n');

        if (opts.onProgress && (index === 1 || index === total || index % 4 === 0)) {
            await opts.onProgress(index, total);
        }
    }

    return new Blob(parts, { type: 'application/x-ndjson;charset=utf-8' });
}

function appendStreamingBackupLine(parts, json) {
    const line = JSON.stringify(json) + '\n';
    parts.push(line);
    return getTextSize(line);
}

async function buildStreamingBackupBlobForExport(options) {
    const opts = isObject(options) ? options : {};
    const backupKind = String(opts.kind || 'main').trim() || 'main';
    const createdAt = new Date().toISOString();
    const parts = [];
    const summary = {
        localStorageCount: 0,
        sessionStorageCount: 0,
        localForageStoreCount: 0,
        localForageKeyCount: 0
    };
    let approxBytes = 0;

    const report = async function (message, detail) {
        if (typeof opts.onProgress === 'function') {
            await opts.onProgress(message, detail || '');
        }
    };

    approxBytes += appendStreamingBackupLine(parts, {
        __shubao_backup_stream__: 1,
        version: SETTINGS_BACKUP_VERSION,
        format: 'records-jsonl',
        kind: backupKind,
        createdAt: createdAt,
        origin: location.origin || '',
        href: location.href || '',
        userAgent: navigator.userAgent || ''
    });

    await report('正在读取 localStorage...', '这一步会跳过不属于当前备份类型的数据。');
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !shouldIncludeBackupItemForKind({ key: key }, backupKind)) continue;
            const value = localStorage.getItem(key);
            if (value == null) continue;
            approxBytes += appendStreamingBackupLine(parts, {
                __shubao_backup_record__: 1,
                scope: 'localStorage',
                key: key,
                value: value
            });
            summary.localStorageCount++;
            if (summary.localStorageCount % 25 === 0) {
                await report('正在读取 localStorage...', '已写入 ' + summary.localStorageCount + ' 项');
                await sleepSettingsBackup(0);
            }
        }
    } catch (e) { }

    const storeConfigs = getBackupLocalForageStores();
    for (let s = 0; s < storeConfigs.length; s++) {
        const store = storeConfigs[s];
        const instance = createBackupLocalForageInstance(store);
        if (!instance || typeof instance.keys !== 'function' || typeof instance.getItem !== 'function') continue;

        let wroteStore = false;
        let keys = [];
        try {
            keys = await instance.keys();
        } catch (e3) {
            continue;
        }
        const list = Array.isArray(keys) ? keys : [];
        await report('正在读取 ' + (store.label || store.id || 'localforage') + '...', '0 / ' + list.length);
        for (let i = 0; i < list.length; i++) {
            const key = String(list[i] || '');
            if (!key || !shouldIncludeBackupItemForKind({ storeId: store.id, key: key }, backupKind)) continue;
            try {
                const value = await instance.getItem(key);
                if (value === null || value === undefined) continue;
                approxBytes += appendStreamingBackupLine(parts, {
                    __shubao_backup_record__: 1,
                    scope: 'localforage',
                    store: {
                        id: String(store.id || ''),
                        label: String(store.label || store.id || ''),
                        name: String(store.name || ''),
                        storeName: String(store.storeName || '')
                    },
                    key: key,
                    value: value
                });
                wroteStore = true;
                summary.localForageKeyCount++;
                if (summary.localForageKeyCount % 10 === 0 || i === list.length - 1) {
                    await report(
                        '正在读取 ' + (store.label || store.id || 'localforage') + '...',
                        (i + 1) + ' / ' + list.length + '，已整理约 ' + formatBackupSize(approxBytes)
                    );
                    await sleepSettingsBackup(0);
                }
            } catch (e4) { }
        }
        if (wroteStore) summary.localForageStoreCount++;
    }

    approxBytes += appendStreamingBackupLine(parts, {
        __shubao_backup_stream_end__: 1,
        version: SETTINGS_BACKUP_VERSION,
        kind: backupKind,
        createdAt: createdAt,
        summary: summary
    });

    return {
        blob: new Blob(parts, { type: 'application/x-ndjson;charset=utf-8' }),
        createdAt: createdAt,
        kind: backupKind,
        summary: summary,
        approxBytes: approxBytes
    };
}

async function readLinesFromTextFile(file, onLine) {
    if (!file || typeof onLine !== 'function') return;

    if (file.stream && typeof TextDecoderStream !== 'undefined') {
        const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        while (true) {
            const result = await reader.read();
            if (result.done) break;
            buffer += result.value || '';
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';
            for (let i = 0; i < lines.length; i++) {
                await onLine(lines[i]);
            }
        }
        if (buffer) await onLine(buffer);
        return;
    }

    const text = await file.text();
    const lines = String(text || '').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        await onLine(lines[i]);
    }
}

async function readBackupRecordsFromJsonlBundleFile(file) {
    const records = [];
    let sawBundleHeader = false;
    let streamHeader = null;
    let streamSummary = null;
    let streamRecordCount = 0;
    let lineNo = 0;

    await readLinesFromTextFile(file, async function (line) {
        lineNo++;
        const text = String(line || '').trim();
        if (!text) return;

        const json = safeJsonParse(text);
        if (!json || !isObject(json)) {
            throw new Error('备份包第 ' + lineNo + ' 行不是有效 JSON');
        }

        if (json.__shubao_backup_stream__ === 1) {
            streamHeader = json;
            return;
        }

        if (streamHeader && json.__shubao_backup_stream_end__ === 1) {
            streamSummary = json.summary || null;
            return;
        }

        if (streamHeader && json.__shubao_backup_record__ === 1) {
            streamRecordCount++;
            return;
        }

        if (json.__shubao_backup_bundle__ === 1) {
            sawBundleHeader = true;
            return;
        }

        if (json.__shubao_backup__ !== 1) {
            throw new Error('备份包第 ' + lineNo + ' 行不是本系统备份数据');
        }

        json.__fileName = (file.name || 'backup.jsonl') + ' > line ' + lineNo;
        records.push(json);
    });

    if (streamHeader) {
        return [{
            __shubao_stream_backup__: 1,
            file: file,
            meta: streamHeader,
            summary: streamSummary || null,
            recordCount: streamRecordCount,
            __fileName: file.name || 'backup.shubaobak'
        }];
    }

    if (!sawBundleHeader && !records.length) {
        throw new Error('备份包为空或格式不正确');
    }
    if (!records.length) {
        throw new Error('备份包中没有找到可导入的数据分卷');
    }

    return records;
}

async function exportAppData(kind) {
    try {
        const backupKind = String(kind || 'main').trim() || 'main';
        const kindLabel = getBackupKindLabel(backupKind);
        const filePrefix = getBackupKindFilePrefix(backupKind);
        let busyModal = showStorageExportBusyModal({
            badge: 'BAK',
            title: kindLabel + '正在导出',
            message: '正在按数据项生成单文件备份，不再整包压缩，图片较多也更稳。',
            detail: '正在准备...'
        });
        await waitForStorageUiPaint(48);

        let result = null;
        try {
            result = await buildStreamingBackupBlobForExport({
                kind: backupKind,
                onProgress: async function (message, detail) {
                    if (!busyModal) return;
                    busyModal.setMessage(message || '正在整理备份...');
                    busyModal.setDetail(detail || '');
                    await waitForStorageUiPaint(0);
                }
            });
            if (busyModal) {
                busyModal.setMessage('备份文件已准备好，正在触发下载...');
                busyModal.setDetail('单个文件，大小约 ' + formatBackupSize(result.blob.size || result.approxBytes));
            }
            await waitForStorageUiPaint(36);
            const stamp = String(result.createdAt || new Date().toISOString()).replace(/[:.]/g, '-');
            downloadBlobFile(filePrefix + stamp + '.shubaobak', result.blob);
        } finally {
            if (busyModal) busyModal.close();
        }

        const summary = result && result.summary ? result.summary : {
            localStorageCount: 0,
            localForageStoreCount: 0,
            localForageKeyCount: 0
        };
        alert(
            '✅ 已导出' + kindLabel + '单文件备份\n\n'
            + 'localStorage：' + summary.localStorageCount + ' 项\n'
            + 'localforage：' + summary.localForageStoreCount + ' 个仓库 / ' + summary.localForageKeyCount + ' 项\n'
            + '文件约：' + formatBackupSize(result && result.blob ? result.blob.size : 0) + '\n\n'
            + '导入时选择这个 .shubaobak 文件即可。'
        );
    } catch (e) {
        console.error(e);
        alert('❌ 导出失败：' + (e && e.message ? e.message : '未知错误'));
    }
}

function triggerImportAppData() {
    const input = document.getElementById('storage-import-json') || document.getElementById('settings-import-json');
    if (!input) {
        alert('找不到导入控件，请重新打开储存页面');
        return;
    }
    input.value = '';
    input.click();
}

async function readBackupPayloadFromFiles(filesLike) {
    const files = Array.from(filesLike || []).filter(Boolean);
    if (!files.length) return null;
    const records = [];
    for (let i = 0; i < files.length; i++) {
        if (isZipBackupFile(files[i])) {
            const zipRecords = await readBackupRecordsFromZipFile(files[i]);
            records.push.apply(records, zipRecords);
            continue;
        }
        if (isJsonlBackupBundleFile(files[i])) {
            const bundleRecords = await readBackupRecordsFromJsonlBundleFile(files[i]);
            records.push.apply(records, bundleRecords);
            continue;
        }
        const text = await files[i].text();
        const json = safeJsonParse(text);
        if (!json || !isObject(json)) {
            throw new Error('文件不是有效 JSON：' + (files[i].name || ('第 ' + (i + 1) + ' 个文件')));
        }
        if (json.__shubao_backup__ !== 1) {
            throw new Error('不是本系统导出的备份文件：' + (files[i].name || ('第 ' + (i + 1) + ' 个文件')));
        }
        json.__fileName = files[i].name || ('第 ' + (i + 1) + ' 个文件');
        records.push(json);
    }

    const splitRecords = records.filter(function (item) {
        return item && item.format === 'split' && item.split && isObject(item.split);
    });

    if (splitRecords.length) {
        if (splitRecords.length !== records.length) {
            throw new Error('分卷导入时请只选择同一套 part 文件，不要混入普通备份文件');
        }
        const first = splitRecords[0];
        const splitId = String(first.split.id || '');
        const total = Number(first.split.total || 0);
        const payloadFormat = String(first.split.payloadFormat || '');
        if (!splitId || !total || !payloadFormat) throw new Error('分卷信息不完整');
        splitRecords.forEach(function (item) {
            if (String(item.split.id || '') !== splitId) throw new Error('选择了不同批次的分卷文件');
            if (Number(item.split.total || 0) !== total) throw new Error('分卷总数不一致');
        });
        const buffer = getSettingsBackupSplitImportBuffer();
        if (
            String(buffer.splitId || '') !== splitId
            || Number(buffer.total || 0) !== total
            || String(buffer.payloadFormat || '') !== payloadFormat
        ) {
            clearSettingsBackupSplitImportBuffer();
            buffer.splitId = splitId;
            buffer.total = total;
            buffer.payloadFormat = payloadFormat;
            buffer.summary = first.summary || null;
        }

        splitRecords.forEach(function (item) {
            const index = Number(item.split.index || 0);
            if (!index) return;
            buffer.parts[index] = {
                data: String(item.data || ''),
                fileName: String(item.__fileName || ''),
                createdAt: String(item.createdAt || '')
            };
        });

        const collectedCount = Object.keys(buffer.parts).length;
        if (collectedCount !== total) {
            return {
                pendingSplit: true,
                splitId: splitId,
                total: total,
                collected: collectedCount,
                missingIndexes: listMissingBackupPartIndexes(total, buffer.parts),
                summary: buffer.summary || first.summary || null
            };
        }

        const orderedParts = [];
        for (let i = 1; i <= total; i++) {
            if (!buffer.parts[i]) {
                throw new Error('缺少第 ' + i + ' 个分卷');
            }
            orderedParts.push(buffer.parts[i].data);
        }
        clearSettingsBackupSplitImportBuffer();
        return await decodeBackupPayload(payloadFormat, orderedParts.join(''));
    }

    const streamRecords = records.filter(function (item) {
        return item && item.__shubao_stream_backup__ === 1;
    });
    if (streamRecords.length) {
        if (records.length !== 1 || files.length !== 1) {
            throw new Error('单文件备份导入时，请只选择一个 .shubaobak 文件');
        }
        const item = streamRecords[0];
        return {
            __shubao_stream_backup__: 1,
            file: item.file,
            meta: item.meta || {},
            summary: item.summary || null,
            recordCount: item.recordCount || 0
        };
    }

    clearSettingsBackupSplitImportBuffer();

    if (records.length > 1) {
        throw new Error('请选择一个完整备份文件，或同一套分卷文件');
    }

    const json = records[0];
    if (json.format === 'gzip-base64' || json.format === 'plain-json') {
        return await decodeBackupPayload(json.format, json.data || '');
    }
    if (json.format === 'plain') {
        return json.data;
    }
    if (json.payload) {
        return json.payload;
    }
    if (json.data && isObject(json.data)) {
        return json.data;
    }
    throw new Error('备份结构不正确');
}

async function restoreLocalForageStoreFromBackup(store, summary) {
    if (!store || !isObject(store.items)) return 0;
    const instance = createBackupLocalForageInstance(store);
    if (!instance || typeof instance.setItem !== 'function') {
        noteRestoreFailure(summary, 'localforage', (store && (store.id || store.name || store.storeName)) || 'unknown-store', new Error('store unavailable'));
        return 0;
    }
    const keys = Object.keys(store.items);
    let count = 0;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        try {
            await instance.setItem(key, store.items[key]);
            count++;
        } catch (e) {
            const storeId = (store && (store.id || store.name || store.storeName)) || 'store';
            noteRestoreFailure(summary, 'localforage', storeId + '/' + key, e);
        }
    }
    return count;
}

async function restoreBackupPayload(payload) {
    const data = payload && typeof payload === 'object' ? payload : {};
    const ls = isObject(data.localStorage) ? data.localStorage : (isObject(data.ls) ? data.ls : {});
    const ss = isObject(data.sessionStorage) ? data.sessionStorage : {};
    const restored = createRestoreSummary();

    const lsKeys = Object.keys(ls);
    for (let i = 0; i < lsKeys.length; i++) {
        const key = lsKeys[i];
        if (!shouldRestoreWebStorageKey(key, 'localStorage')) {
            restored.skippedCount++;
            continue;
        }
        try {
            localStorage.setItem(key, String(ls[key]));
            restored.localStorageCount++;
        } catch (e) {
            noteRestoreFailure(restored, 'localStorage', key, e);
        }
    }

    const ssKeys = Object.keys(ss);
    for (let i = 0; i < ssKeys.length; i++) {
        const key = ssKeys[i];
        if (!shouldRestoreWebStorageKey(key, 'sessionStorage')) {
            restored.skippedCount++;
            continue;
        }
        try {
            sessionStorage.setItem(key, String(ss[key]));
            restored.sessionStorageCount++;
        } catch (e) {
            noteRestoreFailure(restored, 'sessionStorage', key, e);
        }
    }

    if (data.localforage && Array.isArray(data.localforage.stores)) {
        for (let i = 0; i < data.localforage.stores.length; i++) {
            restored.localForageKeyCount += await restoreLocalForageStoreFromBackup(data.localforage.stores[i], restored);
        }
    } else if (isObject(data.lf)) {
        restored.localForageKeyCount += await restoreLocalForageStoreFromBackup({
            id: 'wechat',
            name: 'shubao-phone',
            storeName: 'wechat',
            items: data.lf
        }, restored);
    }

    return restored;
}

async function restoreStreamingBackupFile(file, options) {
    const opts = isObject(options) ? options : {};
    const restored = createRestoreSummary();
    let lineNo = 0;
    let sawHeader = false;

    const report = async function () {
        const total = restored.localStorageCount + restored.sessionStorageCount + restored.localForageKeyCount;
        if (typeof opts.onProgress === 'function' && (total === 1 || total % 20 === 0)) {
            await opts.onProgress(total, restored);
        }
    };

    await readLinesFromTextFile(file, async function (line) {
        lineNo++;
        const text = String(line || '').trim();
        if (!text) return;
        const json = safeJsonParse(text);
        if (!json || !isObject(json)) {
            throw new Error('备份文件第 ' + lineNo + ' 行不是有效 JSON');
        }
        if (json.__shubao_backup_stream__ === 1) {
            sawHeader = true;
            return;
        }
        if (json.__shubao_backup_stream_end__ === 1) return;
        if (json.__shubao_backup_record__ !== 1) return;

        const scope = String(json.scope || '').trim();
        const key = String(json.key || '');
        if (!key) return;

        if (scope === 'localStorage') {
            if (!shouldRestoreWebStorageKey(key, scope)) {
                restored.skippedCount++;
                await report();
                return;
            }
            try {
                localStorage.setItem(key, String(json.value == null ? '' : json.value));
                restored.localStorageCount++;
            } catch (e) {
                noteRestoreFailure(restored, scope, key, e);
            }
            await report();
            return;
        }

        if (scope === 'sessionStorage') {
            if (!shouldRestoreWebStorageKey(key, scope)) {
                restored.skippedCount++;
                await report();
                return;
            }
            try {
                sessionStorage.setItem(key, String(json.value == null ? '' : json.value));
                restored.sessionStorageCount++;
            } catch (e2) {
                noteRestoreFailure(restored, scope, key, e2);
            }
            await report();
            return;
        }

        if (scope === 'localforage') {
            const store = json.store && typeof json.store === 'object' ? json.store : {};
            const instance = createBackupLocalForageInstance(store);
            if (instance && typeof instance.setItem === 'function') {
                try {
                    await instance.setItem(key, json.value);
                    restored.localForageKeyCount++;
                } catch (e3) {
                    const storeId = (store && (store.id || store.name || store.storeName)) || 'store';
                    noteRestoreFailure(restored, scope, storeId + '/' + key, e3);
                }
            } else {
                const storeId = (store && (store.id || store.name || store.storeName)) || 'unknown-store';
                noteRestoreFailure(restored, scope, storeId + '/' + key, new Error('store unavailable'));
            }
            await report();
        }
    });

    if (!sawHeader) {
        throw new Error('不是有效的单文件备份');
    }
    return restored;
}

async function importAppDataFromInput(fileInput) {
    try {
        const files = fileInput && fileInput.files ? fileInput.files : null;
        if (!files || !files.length) return;
        const payload = await readBackupPayloadFromFiles(files);
        if (payload && payload.pendingSplit === true) {
            const missingText = formatBackupPartNumberList(payload.missingIndexes);
            alert(
                '已暂存当前分卷，继续选择剩余 part 文件即可。\n\n'
                + '当前进度：' + payload.collected + ' / ' + payload.total + '\n'
                + (missingText ? ('还缺分卷：' + missingText + '\n\n') : '\n')
                + '不用同时多选，下一次继续单选剩余分卷就可以。'
            );
            return;
        }

        if (payload && payload.__shubao_stream_backup__ === 1) {
            const summary = payload.summary || {};
            const backupKindLabel = getBackupKindLabel(payload.meta && payload.meta.kind || '');
            const ok = confirm(
                '⚠️ 导入会覆盖同名本地数据，且操作不可撤销。\n\n'
                + '备份类型：' + backupKindLabel + '\n'
                + '备份文件：' + (payload.file && payload.file.name ? payload.file.name : '.shubaobak') + '\n'
                + '将导入：\n'
                + 'localStorage：' + (summary.localStorageCount != null ? summary.localStorageCount : '若干') + ' 项\n'
                + 'localforage：' + (summary.localForageStoreCount != null ? summary.localForageStoreCount : '若干') + ' 个仓库 / '
                + (summary.localForageKeyCount != null ? summary.localForageKeyCount : '若干') + ' 项\n\n'
                + '为避免刷新后卡在异常页面，本次不会恢复 sessionStorage 临时状态。\n\n'
                + '建议先导出一份当前数据备份。\n\n确定要继续导入吗？'
            );
            if (!ok) return;

            let busyModal = showStorageExportBusyModal({
                badge: '导入',
                title: backupKindLabel + '正在导入',
                message: '正在按行恢复单文件备份，请不要退出应用。',
                detail: '准备恢复...'
            });
            let restored;
            try {
                restored = await restoreStreamingBackupFile(payload.file, {
                    onProgress: async function (count) {
                        if (!busyModal) return;
                        busyModal.setDetail('已恢复 ' + count + ' 项数据...');
                        await waitForStorageUiPaint(0);
                    }
                });
                restored.localStorageCount += await mirrorWechatLargeStoreToLocalStorageAfterRestore();
            } finally {
                if (busyModal) busyModal.close();
            }

            alert(
                '✅ ' + backupKindLabel + '导入完成，页面将刷新以加载新数据\n\n'
                + 'localStorage：' + restored.localStorageCount + ' 项\n'
                + 'localforage：' + restored.localForageKeyCount + ' 项'
                + (restored.skippedCount ? '\n已跳过临时状态：' + restored.skippedCount + ' 项' : '')
                + (restored.failedCount ? '\n写入失败：' + restored.failedCount + ' 项\n' + restored.failedKeys.join('\n') : '')
            );
            if (restored.failedCount) return;
            reloadAfterBackupImport();
            return;
        }

        if (!payload || !isObject(payload)) {
            alert('❌ 导入失败：备份结构不正确');
            return;
        }

        const summary = summarizeBackupPayload(payload);
        const backupKindLabel = getBackupKindLabel(payload.kind || '');
        const ok = confirm(
            '⚠️ 导入会覆盖同名本地数据，且操作不可撤销。\n\n'
            + '备份类型：' + backupKindLabel + '\n'
            + '将导入：\n'
            + 'localStorage：' + summary.localStorageCount + ' 项\n'
            + 'localforage：' + summary.localForageStoreCount + ' 个仓库 / ' + summary.localForageKeyCount + ' 项\n\n'
            + '为避免刷新后卡在异常页面，本次不会恢复 sessionStorage 临时状态。\n\n'
            + '建议先导出一份当前数据备份。\n\n确定要继续导入吗？'
        );
        if (!ok) return;

        const restored = await restoreBackupPayload(payload);
        restored.localStorageCount += await mirrorWechatLargeStoreToLocalStorageAfterRestore();

        alert(
            '✅ ' + backupKindLabel + '导入完成，页面将刷新以加载新数据\n\n'
            + 'localStorage：' + restored.localStorageCount + ' 项\n'
            + 'localforage：' + restored.localForageKeyCount + ' 项'
            + (restored.skippedCount ? '\n已跳过临时状态：' + restored.skippedCount + ' 项' : '')
            + (restored.failedCount ? '\n写入失败：' + restored.failedCount + ' 项\n' + restored.failedKeys.join('\n') : '')
        );
        if (restored.failedCount) return;
        reloadAfterBackupImport();
    } catch (e) {
        console.error(e);
        alert('❌ 导入失败：' + (e && e.message ? e.message : '未知错误'));
    } finally {
        try {
            if (fileInput) fileInput.value = '';
        } catch (e) { }
    }
}

// 挂载
window.openSettingsApp = openSettingsApp;
window.fetchModelList = fetchModelList;
window.saveAllSettings = saveAllSettings;
window.clearAllData = clearAllData;
window.exportAppData = exportAppData;
window.triggerImportAppData = triggerImportAppData;
window.importAppDataFromInput = importAppDataFromInput;
window.getStorageDashboardData = async function () {
    const payload = await buildAppBackupPayload('full');
    const analysis = analyzeStoragePayload(payload);
    const persistence = await getStoragePersistenceState();
    return Object.assign({}, analysis, {
        persistence: persistence
    });
};
window.getStoragePersistenceState = getStoragePersistenceState;
window.requestStoragePersistence = requestStoragePersistence;
window.checkAndRequestStoragePersistence = checkAndRequestStoragePersistence;
