/* === [SEC-06] 地图编辑器与实时位置共享 === */

function getLocationSelectSheetElements() {
    let mask = document.getElementById('location-select-mask');
    if (!mask) {
        mask = document.createElement('div');
        mask.id = 'location-select-mask';
        mask.className = 'location-sheet-mask';
        mask.innerHTML = `
            <div class="location-sheet">
                <div class="location-sheet-title">位置</div>
                <button class="location-sheet-btn location-sheet-btn-primary" id="send-location-btn">发送位置</button>
                <button class="location-sheet-btn" id="share-live-location-btn">共享实时位置</button>
                <button class="location-sheet-btn" id="clear-location-map-btn">编辑地图</button>
                <button class="location-sheet-btn location-sheet-btn-cancel" id="cancel-location-btn">取消</button>
            </div>
        `;
        document.body.appendChild(mask);
        mask.addEventListener('click', function (e) {
            if (e.target === mask) {
                mask.style.display = 'none';
            }
        });
        const cancelBtn = mask.querySelector('#cancel-location-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function () {
                mask.style.display = 'none';
            });
        }
        const sendBtn = mask.querySelector('#send-location-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', function () {
                const roleId = window.currentChatRole;
                if (!roleId) return;
                const inputText = prompt('请输入地点名称', '');
                if (inputText === null) return;
                const name = String(inputText || '').trim();
                if (!name) return;
                const now = Date.now();
                if (!window.chatData[roleId]) window.chatData[roleId] = [];
                const payload = { name: name, address: '', lat: 0, lng: 0 };
                const msg = { role: 'me', type: 'location', content: JSON.stringify(payload), timestamp: now, status: 'sent' };
                window.chatData[roleId].push(msg);
                appendMessageToDOM(msg);
                saveData();
                mask.style.display = 'none';
                const msgInput = document.getElementById('msg-input');
                if (msgInput) {
                    setTimeout(function () { msgInput.focus(); }, 10);
                }
            });
        }
        const shareBtn = mask.querySelector('#share-live-location-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', async function () {
                const roleId = window.currentChatRole;
                if (!roleId) return;
                await initData();
                const data = window.chatMapData && window.chatMapData[roleId];
                if (data && data.isCreated === true) {
                    mask.style.display = 'none';
                    startLocationShare(roleId);
                    return;
                }
                mask.style.display = 'none';
                openMapCreatorModal(roleId);
            });
        }
        const clearBtn = mask.querySelector('#clear-location-map-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', async function () {
                const roleId = window.currentChatRole;
                if (!roleId) return;
                await initData();
                mask.style.display = 'none';
                openMapCreatorModal(roleId);
            });
        }
    }
    return { mask };
}

function showLocationSelectSheet() {
    const els = getLocationSelectSheetElements();
    if (!els.mask) return;
    els.mask.style.display = 'flex';
}

window.showLocationSelectSheet = showLocationSelectSheet;

function getMapCreatorModalElements() {
    let modal = document.getElementById('map-creator-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'map-creator-modal';
        modal.className = 'map-creator-mask';
        modal.innerHTML = `
            <div class="map-creator-container">
                <div class="map-creator-map-panel">
                    <div class="map-creator-stage">
                        <img class="map-creator-map" src="assets/gongxiangmap.jpg" alt="map">
                        <div class="map-creator-markers"></div>
                    </div>
                </div>
                <div class="map-creator-info-panel">
                    <div class="map-creator-hint">请在地图上点击进行创建地点</div>
                    <div class="map-creator-list-container"></div>
                </div>
                <div class="map-creator-footer">
                    <button class="map-creator-btn" id="map-creator-finish-btn">完成创建</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const imgEl = modal.querySelector('.map-creator-map');
    const stageEl = modal.querySelector('.map-creator-stage');
    const markersEl = modal.querySelector('.map-creator-markers');
    const listEl = modal.querySelector('.map-creator-list-container');
    const finishBtn = modal.querySelector('#map-creator-finish-btn');
    return { modal, imgEl, stageEl, markersEl, listEl, finishBtn };
}

function renderMapCreatorMarkers(markersEl, listEl, markers) {
    if (!markersEl || !listEl) return;
    markersEl.innerHTML = '';
    listEl.innerHTML = '';
    (markers || []).forEach(function (m, idx) {
        const dot = document.createElement('div');
        dot.className = 'map-creator-dot';
        dot.style.left = String(m.x) + '%';
        dot.style.top = String(m.y) + '%';
        dot.addEventListener('click', function (e) {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            markers.splice(idx, 1);
            renderMapCreatorMarkers(markersEl, listEl, markers);
        });
        markersEl.appendChild(dot);

        const row = document.createElement('div');
        row.className = 'map-creator-list-item';

        const text = document.createElement('div');
        text.className = 'map-creator-list-text';
        text.textContent = `${idx + 1}. 📍 ${m.name || ''}`;

        const del = document.createElement('button');
        del.className = 'map-creator-list-delete';
        del.type = 'button';
        del.textContent = '删除';
        del.addEventListener('click', function (e) {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            markers.splice(idx, 1);
            renderMapCreatorMarkers(markersEl, listEl, markers);
        });

        row.appendChild(text);
        row.appendChild(del);
        listEl.appendChild(row);
    });
}

function showFullPageLoading(text) {
    let mask = document.getElementById('global-map-loading-mask');
    if (!mask) {
        mask = document.createElement('div');
        mask.id = 'global-map-loading-mask';
        mask.style.position = 'fixed';
        mask.style.left = '0';
        mask.style.top = '0';
        mask.style.right = '0';
        mask.style.bottom = '0';
        mask.style.background = 'rgba(0,0,0,0.35)';
        mask.style.display = 'flex';
        mask.style.alignItems = 'center';
        mask.style.justifyContent = 'center';
        mask.style.zIndex = '2000';
        const box = document.createElement('div');
        box.className = 'map-loading-box';
        box.style.padding = '14px 18px';
        box.style.borderRadius = '16px';
        box.style.background = 'rgba(0,0,0,0.8)';
        box.style.color = '#fff';
        box.style.fontSize = '14px';
        box.textContent = text || '加载中...';
        mask.appendChild(box);
        document.body.appendChild(mask);
    } else {
        const box = mask.querySelector('.map-loading-box');
        if (box) {
            box.textContent = text || '加载中...';
        }
        mask.style.display = 'flex';
    }
}

function hideFullPageLoading() {
    const mask = document.getElementById('global-map-loading-mask');
    if (mask) {
        mask.style.display = 'none';
    }
}

async function generateAIMapMarkers(roleId) {
    const profile = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
    let worldbookText = '';
    if (window.worldBooks && profile.worldbookId) {
        const ids = Array.isArray(profile.worldbookId)
            ? profile.worldbookId
            : (typeof profile.worldbookId === 'string' && profile.worldbookId.trim() ? [profile.worldbookId.trim()] : []);
        const parts = [];
        ids.forEach(wbId => {
            const id = String(wbId || '').trim();
            if (!id) return;
            const wb = window.worldBooks[id];
            if (!wb) return;
            const title = wb.title || '';
            const content = wb.content || '';
            if (!title && !content) return;
            parts.push(`世界书标题：${title}\n世界书内容：${content}`);
        });
        worldbookText = parts.join('\n\n');
    }
    const personaText = profile.desc || '';
    const aiName = profile.nickName || profile.name || '';
    const userPersona = window.userPersonas && window.userPersonas[roleId] ? window.userPersonas[roleId] : {};
    const userName = userPersona.name || '';
    const systemPrompt = typeof window.buildRoleJsonTaskPrompt === 'function'
        ? window.buildRoleJsonTaskPrompt('map_marker_generation', roleId, {
            maxSummaryLines: 8,
            sceneIntro: '当前场景是角色生活地图地点生成。',
            taskGuidance: [
                '请根据角色的背景设定、世界观和生活习惯，在 100x100 的二维地图平面上，生成 5-8 个关键地点的坐标。',
                '必须包含以下几类地点：',
                '1. 家：包括“用户的家”和“AI角色自己的家”。',
                '2. 工作/学习：AI 的公司、学校或常驻地。',
                '3. 娱乐休闲：至少 2 个具体场所，如甜品店、咖啡馆、猫咖、电玩城、游乐园、购物广场、电影院等，根据角色喜好选择。',
                '如果角色是古风或古代背景，请使用符合时代的地点名称，例如集市、酒楼、茶馆、书院等。',
                '可以在命名时，将 AI 自己的家记为“我的家”，将用户的家记为“你的家”，系统会自动替换为具体名字。'
            ].join('\n'),
            outputInstructions: '严格输出 JSON 数组，不要包含 Markdown 代码块或额外文字。数组元素格式为 {"name":"地点名称","x":数字,"y":数字}，x/y 取 5-95 且地点尽量分散。'
        })
        : [
            '你是一个地图数据生成器。',
            '请根据角色的背景设定、世界观和生活习惯，在 100x100 的二维地图平面上，生成 5-8 个关键地点的坐标。',
            '必须包含以下几类地点：',
            '1. 家：包括“用户的家”和“AI角色自己的家”。',
            '2. 工作/学习：AI 的公司、学校或常驻地。',
            '3. 娱乐休闲：至少 2 个具体场所，如甜品店、咖啡馆、猫咖、电玩城、游乐园、购物广场、电影院等，根据角色喜好选择。',
            '如果角色是古风或古代背景，请使用符合时代的地点名称，例如集市、酒楼、茶馆、书院等。',
            '可以在命名时，将 AI 自己的家记为“我的家”，将用户的家记为“你的家”，系统会自动替换为具体名字。',
            '输出格式严格为 JSON 数组，不要包含任何 Markdown 代码块或额外文字。',
            '数组元素格式为：{"name": "地点名称", "x": 横坐标(5-95之间的数字), "y": 纵坐标(5-95之间的数字)}。',
            'x 和 y 代表百分比位置，请让地点尽量分散，不要重叠。'
        ].join('\n');
    const historyMessages = [];
    const userLines = [];
    if (personaText) {
        userLines.push('【角色人设】');
        userLines.push(personaText);
    }
    if (worldbookText) {
        userLines.push('【世界书设定】');
        userLines.push(worldbookText);
    }
    userLines.push('请根据以上信息，直接返回符合要求的 JSON 数组。');
    const userMessage = userLines.join('\n');
    if (typeof window.callAI !== 'function') {
        throw new Error('callAI not available');
    }
    const jsonText = await new Promise(function (resolve, reject) {
        window.callAI(
            systemPrompt,
            historyMessages,
            userMessage,
            function (resp) {
                if (typeof resp !== 'string') {
                    reject(new Error('AI 响应格式错误'));
                    return;
                }
                resolve(resp);
            },
            function (err) {
                reject(new Error(err || 'AI 调用失败'));
            }
        );
    });
    let clean = String(jsonText || '').trim();
    clean = clean.replace(/```(?:json)?/gi, '').trim();
    const firstArr = clean.indexOf('[');
    const lastArr = clean.lastIndexOf(']');
    if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
        clean = clean.slice(firstArr, lastArr + 1).trim();
    }
    let parsed = [];
    try {
        let candidate = clean.replace(/,\s*([}\]])/g, '$1').trim();
        const obj = JSON.parse(candidate);
        if (Array.isArray(obj)) {
            parsed = obj;
        } else if (obj && Array.isArray(obj.markers)) {
            parsed = obj.markers;
        } else {
            throw new Error('JSON 不是数组');
        }
    } catch (e) {
        const snippet = String(clean || '').slice(0, 220);
        throw new Error('解析 AI 返回的 JSON 失败：' + snippet);
    }
    const markers = parsed.map(function (m) {
        let x = Number(m && m.x);
        let y = Number(m && m.y);
        let name = String(m && m.name || '').trim();
        if (aiName) {
            if (name === '我的家' || name === '我家') {
                name = aiName + '的家';
            }
        }
        if (userName) {
            if (name === '你的家' || name === '你家' || name === '用户的家') {
                name = userName + '的家';
            }
        }
        if (isFinite(x)) x = Math.max(5, Math.min(95, x));
        if (isFinite(y)) y = Math.max(5, Math.min(95, y));
        return { x: x, y: y, name: name };
    }).filter(function (m) {
        return isFinite(m.x) && isFinite(m.y) && m.name && m.x >= 0 && m.x <= 100 && m.y >= 0 && m.y <= 100;
    });
    if (markers.length === 0) {
        throw new Error('生成的地点列表为空');
    }
    if (!window.chatMapData) window.chatMapData = {};
    const mapData = window.chatMapData[roleId] || {};
    mapData.markers = markers;
    mapData.bgUrl = '__css__';
    mapData.isCreated = false;
    window.chatMapData[roleId] = mapData;
    saveData();
}

function showMapGenRetryDialog() {
    return new Promise(function (resolve) {
        const mask = document.createElement('div');
        mask.style.position = 'fixed';
        mask.style.left = '0';
        mask.style.top = '0';
        mask.style.right = '0';
        mask.style.bottom = '0';
        mask.style.background = 'rgba(0,0,0,0.4)';
        mask.style.display = 'flex';
        mask.style.alignItems = 'center';
        mask.style.justifyContent = 'center';
        mask.style.zIndex = '2100';

        const box = document.createElement('div');
        box.style.minWidth = '260px';
        box.style.maxWidth = '320px';
        box.style.borderRadius = '16px';
        box.style.background = '#fff';
        box.style.padding = '18px 18px 12px 18px';
        box.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
        box.style.fontSize = '14px';
        box.style.color = '#333';

        const text = document.createElement('div');
        text.textContent = '地图生成失败，是否需要重新生成？';
        text.style.marginBottom = '14px';

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.justifyContent = 'flex-end';
        btnRow.style.gap = '10px';

        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.textContent = '是';
        retryBtn.style.padding = '6px 14px';
        retryBtn.style.borderRadius = '14px';
        retryBtn.style.border = 'none';
        retryBtn.style.background = '#07c160';
        retryBtn.style.color = '#fff';
        retryBtn.style.fontSize = '13px';

        const manualBtn = document.createElement('button');
        manualBtn.type = 'button';
        manualBtn.textContent = '手动创建';
        manualBtn.style.padding = '6px 14px';
        manualBtn.style.borderRadius = '14px';
        manualBtn.style.border = '1px solid #dcdcdc';
        manualBtn.style.background = '#fff';
        manualBtn.style.color = '#333';
        manualBtn.style.fontSize = '13px';

        function cleanup(choice) {
            document.body.removeChild(mask);
            resolve(choice);
        }

        retryBtn.onclick = function () {
            cleanup('retry');
        };
        manualBtn.onclick = function () {
            cleanup('manual');
        };

        btnRow.appendChild(manualBtn);
        btnRow.appendChild(retryBtn);
        box.appendChild(text);
        box.appendChild(btnRow);
        mask.appendChild(box);
        document.body.appendChild(mask);
    });
}

async function openMapCreatorModal(roleId, options) {
    const opts = options && typeof options === 'object' ? options : {};
    let layer = document.getElementById('map-creator-layer');
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'map-creator-layer';
        document.body.appendChild(layer);
    }

    closeMapCreatorModal();

    document.body.dataset._mapCreatorPrevOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';

    const readCurrentMapMarkers = function () {
        const data = window.chatMapData && window.chatMapData[roleId];
        return (data && Array.isArray(data.markers) ? data.markers : []).map(function (m) {
            return { x: Number(m && m.x), y: Number(m && m.y), name: String(m && m.name || '').trim() };
        }).filter(function (m) {
            return isFinite(m.x) && isFinite(m.y) && m.name;
        });
    };
    const finalMapData = window.chatMapData && window.chatMapData[roleId];
    let markers = readCurrentMapMarkers();
    const storedBg = (finalMapData && finalMapData.bgUrl) ? finalMapData.bgUrl : '__css__';
    const cssPlaceholder = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000"></svg>');
    const bgUrl = storedBg === '__css__' ? cssPlaceholder : storedBg;

    layer.style.display = 'flex';
    layer.innerHTML = `
        <div class="location-share-bg">
            <div class="map-creator-tip" id="map-creator-tip">现在请为你们创建一份地图，尽可能的包含你们各自的家，工作地点，娱乐场所，餐馆等等 点击地图即可创造地点</div>
            <div class="location-share-map-stage" id="map-creator-map-stage">
                <img class="location-share-map" id="map-creator-map-img" src="${bgUrl}" alt="map">
                <div class="location-share-map-overlay" id="map-creator-map-overlay"></div>
            </div>
        </div>
        <div class="location-share-footer-float map-creator-footer-float">
            <div class="map-creator-actions">
                <button class="map-creator-action-btn" id="map-creator-ai-generate-btn" type="button">让角色绘制地图</button>
                <button class="map-creator-action-btn" id="map-creator-delete-map-btn" type="button">删除地图</button>
                <button class="map-creator-action-btn map-creator-save-btn" id="map-creator-save-btn" type="button">保存创建</button>
                <button class="map-creator-action-btn map-creator-exit-btn" id="map-creator-exit-btn" type="button">退出</button>
            </div>
        </div>
    `;

    const mapStage = layer.querySelector('#map-creator-map-stage');
    const mapImg = layer.querySelector('#map-creator-map-img');
    const overlay = layer.querySelector('#map-creator-map-overlay');
    const saveBtn = layer.querySelector('#map-creator-save-btn');
    const exitBtn = layer.querySelector('#map-creator-exit-btn');
    const generateBtn = layer.querySelector('#map-creator-ai-generate-btn');
    const deleteBtn = layer.querySelector('#map-creator-delete-map-btn');
    const tipEl = layer.querySelector('#map-creator-tip');

    if (!mapStage || !mapImg || !overlay || !saveBtn || !exitBtn) return;

    const renderMarkers = function () {
        overlay.innerHTML = '';
        if (tipEl) {
            tipEl.textContent = markers.length
                ? '点击地图可增加地点；点击已有地点可重命名或删除。'
                : '还没有创建地图地点。你可以点击“让角色绘制地图”，也可以直接点击地图手动增加地点。';
        }
        if (generateBtn) {
            generateBtn.style.display = markers.length ? 'none' : '';
        }
        if (deleteBtn) {
            deleteBtn.style.display = markers.length ? '' : 'none';
        }
        markers.forEach(function (m, index) {
            const dot = document.createElement('div');
            dot.className = 'location-share-marker';
            dot.style.left = String(m.x) + '%';
            dot.style.top = String(m.y) + '%';
            dot.dataset.name = String(m.name || '');

            const label = document.createElement('span');
            label.className = 'marker-name';
            label.textContent = String(m.name || '');
            dot.appendChild(label);

            dot.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                const currentName = String(m.name || '');
                const input = prompt('修改地点名称（留空则删除）', currentName);
                if (input === null) return;
                const newName = String(input || '').trim();
                if (!newName) {
                    markers.splice(index, 1);
                } else {
                    markers[index] = { x: m.x, y: m.y, name: newName };
                }
                renderMarkers();
            });

            overlay.appendChild(dot);
        });
    };
    renderMarkers();

    const regenerateFromAI = async function () {
        for (; ;) {
            try {
                showFullPageLoading('对方正在根据记忆绘制地图...');
                await generateAIMapMarkers(roleId);
                hideFullPageLoading();
                markers = readCurrentMapMarkers();
                renderMarkers();
                alert('地图已经成功生成！');
                break;
            } catch (e) {
                hideFullPageLoading();
                console.error(e);
                const choice = await showMapGenRetryDialog();
                if (choice === 'retry') {
                    continue;
                }
                break;
            }
        }
    };

    mapStage.style.touchAction = 'none';
    const mapPanCleanup = setupLocationShareMapPan(layer, {
        stageEl: mapStage,
        imgEl: mapImg,
        viewportEl: layer,
        blockSelectors: ['.location-share-footer-float']
    });

    let downX = 0;
    let downY = 0;
    let moved = false;
    const beginDown = function (clientX, clientY) {
        downX = clientX;
        downY = clientY;
        moved = false;
    };
    const markMove = function (clientX, clientY) {
        if (moved) return;
        if (Math.abs(clientX - downX) + Math.abs(clientY - downY) >= 6) moved = true;
    };

    const onMouseDown = function (e) {
        if (!e || e.button !== 0) return;
        beginDown(e.clientX, e.clientY);
    };
    const onMouseMove = function (e) {
        if (!e) return;
        markMove(e.clientX, e.clientY);
    };
    const onTouchStart = function (e) {
        if (!e || !e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];
        beginDown(t.clientX, t.clientY);
    };
    const onTouchMove = function (e) {
        if (!e || !e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];
        markMove(t.clientX, t.clientY);
    };

    const onClick = function (e) {
        if (!e) return;
        if (moved) return;
        const target = e.target;
        if (target && target.closest('.location-share-footer-float')) return;
        if (target && target.closest('.location-share-marker')) return;

        const rect = mapStage.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return;
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;

        const rawX = ((e.clientX - rect.left) / rect.width) * 100;
        const rawY = ((e.clientY - rect.top) / rect.height) * 100;
        const x = Math.max(0, Math.min(100, Number(rawX.toFixed(1))));
        const y = Math.max(0, Math.min(100, Number(rawY.toFixed(1))));

        const inputText = prompt('请输入地点名称', '');
        if (inputText === null) return;
        const name = String(inputText || '').trim();
        if (!name) return;

        markers.push({ x: x, y: y, name: name });
        renderMarkers();
    };

    const onSave = function (e) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        if (!markers.length) {
            alert('请先创建至少一个地图地点。');
            return;
        }
        if (!window.chatMapData) window.chatMapData = {};
        window.chatMapData[roleId] = {
            bgUrl: '__css__',
            markers: markers,
            isCreated: true
        };
        saveData();
        alert('创建成功');
        closeMapCreatorModal();
        if (typeof opts.afterSave === 'function') {
            setTimeout(function () {
                opts.afterSave(roleId);
            }, 0);
        }
    };

    const onExit = function (e) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        closeMapCreatorModal();
    };

    const onGenerate = function (e) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        regenerateFromAI();
    };

    const onDeleteMap = function (e) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        const ok = confirm('确定要删除当前地图吗？删除后可以重新让角色绘制。');
        if (!ok) return;
        if (!window.chatMapData) window.chatMapData = {};
        if (window.chatMapData[roleId]) {
            delete window.chatMapData[roleId];
            saveData();
        }
        markers = [];
        renderMarkers();
    };

    layer.addEventListener('mousedown', onMouseDown);
    layer.addEventListener('mousemove', onMouseMove);
    layer.addEventListener('touchstart', onTouchStart, { passive: true });
    layer.addEventListener('touchmove', onTouchMove, { passive: true });
    layer.addEventListener('click', onClick);
    saveBtn.addEventListener('click', onSave);
    exitBtn.addEventListener('click', onExit);
    if (generateBtn) generateBtn.addEventListener('click', onGenerate);
    if (deleteBtn) deleteBtn.addEventListener('click', onDeleteMap);

    layer._mapCreatorCleanup = function () {
        layer.removeEventListener('mousedown', onMouseDown);
        layer.removeEventListener('mousemove', onMouseMove);
        layer.removeEventListener('touchstart', onTouchStart, { passive: true });
        layer.removeEventListener('touchmove', onTouchMove, { passive: true });
        layer.removeEventListener('click', onClick);
        saveBtn.removeEventListener('click', onSave);
        exitBtn.removeEventListener('click', onExit);
        if (generateBtn) generateBtn.removeEventListener('click', onGenerate);
        if (deleteBtn) deleteBtn.removeEventListener('click', onDeleteMap);
        if (typeof mapPanCleanup === 'function') {
            try { mapPanCleanup(); } catch (e) { }
        }
    };
}

function closeMapCreatorModal() {
    const layer = document.getElementById('map-creator-layer');
    if (layer && typeof layer._mapCreatorCleanup === 'function') {
        try { layer._mapCreatorCleanup(); } catch (e) { }
    }
    if (layer) {
        layer._mapCreatorCleanup = null;
        layer.style.display = 'none';
        layer.innerHTML = '';
    }
    if (document && document.body && document.body.dataset) {
        if (document.body.dataset._mapCreatorPrevOverflow !== undefined) {
            document.body.style.overflow = document.body.dataset._mapCreatorPrevOverflow;
            delete document.body.dataset._mapCreatorPrevOverflow;
        } else {
            document.body.style.overflow = '';
        }
    }
}

function isLocationShareActive(roleId) {
    const layer = document.getElementById('location-share-layer');
    if (!layer || layer.style.display === 'none') return false;
    const state = layer._locationShareState;
    if (!state || state.roleId !== roleId) return false;
    return true;
}

window.isLocationShareActive = isLocationShareActive;

function handleMainChatInputForLocationShare(text) {
    const roleId = window.currentChatRole;
    if (!roleId) return;
    const layer = document.getElementById('location-share-layer');
    const state = layer ? layer._locationShareState : null;
    if (!state) return;
    if (state.isSending) return;

    const now = Date.now();
    const prefixed = `[实时位置共享中] ${text}`;
    if (!window.chatData[roleId]) window.chatData[roleId] = [];
    const userMsg = { role: 'me', content: prefixed, type: 'location_share', timestamp: now, status: 'sent' };
    window.chatData[roleId].push(userMsg);
    saveData();
    appendMessageToDOM(userMsg); // Show in main chat

    state.isSending = true;

    const history = window.chatData[roleId] || [];
    const cleanHistory = history.map(msg => ensureMessageContent({ ...msg })).filter(m => m.content);

    let systemPrompt = buildLocationShareBaseSystemPrompt(roleId);
    const aiPlace = String(state.aiMarker && state.aiMarker.name || '').trim();
    const userPlace = String(state.userMarker && state.userMarker.name || '').trim();
    let distanceMeters = null;
    if (state.userMarker && state.aiMarker) {
        updateDistance(state.userMarker, state.aiMarker);
        distanceMeters = computeLocationShareDistanceMeters(state.userMarker, state.aiMarker, state);
    }
    systemPrompt += `\n\n【位置信息】\n你的位置：${aiPlace || '未知'}\n用户的位置：${userPlace || '未选择'}\n`;
    if (distanceMeters !== null) {
        systemPrompt += `当前你与用户的直线距离约为 ${distanceMeters} 米。\n`;
        const travelStatus = state.travelStatus;
        const modeCode = state.travelMode ? String(state.travelMode).toUpperCase() : '';
        const modeLabel = modeCode ? getLocationShareModeLabel(modeCode) : '';
        if (travelStatus === 'idle') {
            systemPrompt += `\n【出行方式强制规则】\n1. 当直线距离小于 600 米时，你必须选择步行（WALK）。\n2. 当直线距离大于等于 600 米时，你必须结合自己的人设信息（是否有车、是否着急、是否有钱等），在骑行（BIKE）、公交（BUS）、开车（CAR）中选择一种最符合你人设的方式。\n3. 一旦决定要出发，必须在回复末尾追加指令：[[START_MOVE: MODE]]，其中 MODE 为 WALK、BIKE、BUS、CAR 之一。\n4. 只需要用自然的中文描述你的决定，不要向用户解释这些规则或技术细节。`;
        } else if (travelStatus === 'moving') {
            if (modeLabel && modeCode) {
                systemPrompt += `\n【行程状态】\n你已经以${modeLabel}（${modeCode}）的方式在前往用户的路上，本次行程中禁止更改出行方式或重新选择 [[START_MOVE: ...]] 指令。请继续以${modeLabel}的方式向用户汇报路况、进度和预计到达时间。`;
            } else {
                systemPrompt += `\n【行程状态】\n你已经在前往用户的路上，本次行程中禁止更改出行方式或重新选择 [[START_MOVE: ...]] 指令。`;
            }
        } else if (travelStatus === 'arrived') {
            systemPrompt += `\n【行程状态】\n你已经到达用户附近，本次移动已经结束，不要再使用 START_MOVE 指令或重新规划新的出行路线，可以围绕见面后的互动和当前环境展开自然对话。`;
        }
    }
    setLocationShareStatusText('正在根据人设规划路线...');

    // Trigger AI directly
    if (typeof window.callAI === 'function') {
        window.callAI(
            systemPrompt, cleanHistory, prefixed,
            function (aiResponseText) {
                // Here we process the AI reply
                // But we don't have the location share chatBox anymore, we just use main chat
                handleLocationShareAIReplyMain(aiResponseText, state, state.markers, roleId);
                state.isSending = false;
            },
            function (errorMessage) {
                state.isSending = false;
                alert("❌ 发送失败\n\n" + errorMessage);
            }
        );
    }
}

window.handleMainChatInputForLocationShare = handleMainChatInputForLocationShare;

function handleLocationShareAIReplyMain(rawReply, state, markers, roleId) {
    if (!state || !roleId) return;

    let cleaned = cleanVoiceCallAIReply(rawReply);
    const moveCommand = parseLocationShareMoveCommand(cleaned);
    const visible = stripLocationShareMoveCommands(cleaned);

    const parts = String(visible || '').split('|||');
    let hasText = false;
    for (let i = 0; i < parts.length; i++) {
        const segment = sanitizeLocationShareAIText(parts[i]);
        if (!segment) continue;
        hasText = true;
        const ts = Date.now();
        if (!window.chatData[roleId]) window.chatData[roleId] = [];
        const aiMsg = {
            role: 'ai',
            content: segment,
            rawContent: rawReply,
            type: 'location_share',
            timestamp: ts
        };
        window.chatData[roleId].push(aiMsg);
        appendMessageToDOM(aiMsg); // Show in main chat
    }

    if (!hasText && rawReply && rawReply.length > 5 && !cleaned) {
        let fallback = rawReply.replace(/```/g, '');
        const ts = Date.now();
        const aiMsg = { role: 'ai', content: fallback, type: 'location_share', timestamp: ts };
        window.chatData[roleId].push(aiMsg);
        appendMessageToDOM(aiMsg);
    }

    if (moveCommand && moveCommand.kind === 'start') {
        if (state.travelStatus === 'idle') {
            const destination = state.userMarker ? state.userMarker : null;
            startLocationShareTravel(state, moveCommand.mode, destination);
        }
    }
    saveData();
}

function getLocationShareLayerElements() {
    let layer = document.getElementById('location-share-layer');
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'location-share-layer';
        document.body.appendChild(layer);
    }
    return { layer };
}

function closeLocationShareLayer() {
    const els = getLocationShareLayerElements();
    const layer = els.layer;
    if (layer && typeof layer._locationShareCleanup === 'function') {
        try { layer._locationShareCleanup(); } catch (e) { }
    }
    if (layer) {
        layer._locationShareCleanup = null;
        layer._locationShareState = null;
        layer.style.display = 'none';
        layer.innerHTML = '';
        layer.classList.remove('is-floating-window');
    }
    if (document && document.body && document.body.dataset) {
        if (document.body.dataset._locationSharePrevOverflow !== undefined) {
            document.body.style.overflow = document.body.dataset._locationSharePrevOverflow;
            delete document.body.dataset._locationSharePrevOverflow;
        } else {
            document.body.style.overflow = '';
        }
    }
    const floatWindow = document.getElementById('location-share-float-window');
    if (floatWindow) {
        floatWindow.style.display = 'none';
    }
}

function showTopNotification(text) {
    const message = String(text || '').trim();
    if (!message) return;
    let toast = document.getElementById('top-toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'top-toast-notification';
        toast.className = 'top-toast-notification';
        const icon = document.createElement('span');
        icon.className = 'top-toast-icon';
        icon.innerText = '✔';
        const span = document.createElement('span');
        span.className = 'top-toast-text';
        toast.appendChild(icon);
        toast.appendChild(span);
        document.body.appendChild(toast);
    }
    const textEl = toast.querySelector('.top-toast-text');
    if (textEl) {
        textEl.textContent = message;
    }
    toast.classList.add('show');
    if (toast._hideTimer) {
        clearTimeout(toast._hideTimer);
    }
    toast._hideTimer = setTimeout(function () {
        toast.classList.remove('show');
    }, 2500);
}

function stripLocationSharePrefix(text) {
    const raw = String(text || '');
    const prefix = '[实时位置共享中]';
    if (!raw.startsWith(prefix)) return raw;
    const rest = raw.slice(prefix.length);
    return rest.replace(/^\s+/, '');
}

function sanitizeLocationShareAIText(text) {
    let result = String(text || '').trim();
    if (!result) return '';
    result = result.replace(/\[VOICE:[\s\S]*?\]/gi, '').replace(/\[STICKER:\s*[^\]]+\]/gi, '').trim();
    result = result.replace(/https?:\/\/\S+/gi, '').trim();
    result = result.replace(/```[a-zA-Z0-9_]*\s*/gi, '');
    result = result.replace(/```/g, '');
    result = result.replace(/`{1,3}/g, '');
    result = result.replace(/思考过程[:：]?/gi, '');
    result = result.replace(/推理过程[:：]?/gi, '');
    result = result.replace(/解释[:：]?/gi, '');
    const lines = result.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    result = lines.join(' ');
    try {
        result = result.replace(/[\p{Extended_Pictographic}]/gu, '');
    } catch (e) { }
    result = result.replace(/[ \t]{2,}/g, ' ').trim();
    return result;
}

const DEBUG_SPEED_UP = false;

function cleanLocationShareAIThinking(text) {
    let out = String(text || '');
    if (!out) return '';
    out = out.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
    if (out.includes('<thinking>')) {
        out = out.split('<thinking>')[0].trim();
    }
    out = out.replace(/```[a-zA-Z0-9_]*\s*/gi, '');
    out = out.replace(/```/g, '');
    out = out.trim();
    return out;
}

function parseLocationShareMoveCommand(text) {
    const raw = String(text || '');
    if (!raw) return null;
    const startRe = /\[\[\s*START_MOVE\s*:\s*([A-Z]+)\s*\]\]/i;
    const startMatch = raw.match(startRe);
    if (startMatch) {
        const mode = String(startMatch[1] || '').trim().toUpperCase();
        if (mode === 'WALK' || mode === 'BIKE' || mode === 'BUS' || mode === 'CAR') {
            return { kind: 'start', mode: mode };
        }
    }
    return null;
}

function stripLocationShareMoveCommands(text) {
    let out = String(text || '');
    if (!out) return '';
    out = out.replace(/\[\[\s*MOVE_TO_USER\s*\]\]/gi, '');
    out = out.replace(/\[\[\s*MOVE_TO\s*:\s*[^\]]+?\s*\]\]/gi, '');
    out = out.replace(/\[\[\s*START_MOVE\s*:\s*[^\]]+?\s*\]\]/gi, '');
    out = out.replace(/[ \t]{2,}/g, ' ').trim();
    out = out.replace(/\n{3,}/g, '\n\n').trim();
    return out;
}

function findLocationShareMarkerByName(markers, name) {
    const list = Array.isArray(markers) ? markers : [];
    const target = String(name || '').trim();
    if (!target) return null;
    for (let i = 0; i < list.length; i++) {
        const m = list[i];
        const n = String(m && m.name || '').trim();
        if (n && n === target) return m;
    }
    return findMarkerByAIReply(list, target);
}

function getLocationShareModeLabel(mode) {
    const upper = String(mode || '').toUpperCase();
    if (upper === 'WALK') return '步行';
    if (upper === 'CAR') return '开车';
    if (upper === 'BIKE') return '骑行';
    if (upper === 'BUS') return '乘坐公交';
    return '出行';
}

function getLocationShareTravelDurationMs(mode) {
    const upper = String(mode || '').toUpperCase();
    const unit = DEBUG_SPEED_UP ? 1000 : 60000;
    if (upper === 'CAR') return 10 * unit;
    if (upper === 'WALK') return 15 * unit;
    if (upper === 'BIKE' || upper === 'BUS') return 20 * unit;
    return 15 * unit;
}

function setLocationShareStatusText(text) {
    const layer = document.getElementById('location-share-layer');
    const statusEl = layer ? layer.querySelector('#location-share-status-text') : null;
    if (!statusEl) return;
    statusEl.textContent = text || '';
}

function startLocationShareTravel(state, mode, destination) {
    if (!state || !destination || !state._aiWrapEl) return;
    const durationMs = getLocationShareTravelDurationMs(mode);
    const layer = document.getElementById('location-share-layer');
    let totalDistance = null;
    if (state.userMarker && state.aiMarker) {
        totalDistance = computeLocationShareDistanceMeters(state.userMarker, state.aiMarker, state);
    }
    const startMarker = {
        x: Number(state.aiMarker && state.aiMarker.x),
        y: Number(state.aiMarker && state.aiMarker.y),
        name: String(state.aiMarker && state.aiMarker.name || '').trim()
    };
    state.travelMode = mode;
    state.travelStatus = 'moving';
    state.travelDurationMs = durationMs;
    state.travelStartTime = Date.now();
    state.travelTotalDistanceMeters = totalDistance;
    state.travelRemainingDistanceMeters = totalDistance;
    if (state.travelTimerId) {
        clearInterval(state.travelTimerId);
        state.travelTimerId = null;
    }
    const statusEl = layer ? layer.querySelector('#location-share-status-text') : null;
    const modeLabel = getLocationShareModeLabel(mode);
    if (statusEl) {
        statusEl.textContent = `正在${modeLabel}前往...`;
    }
    const distanceEl = layer ? layer.querySelector('#location-share-distance-text') : null;
    if (distanceEl && totalDistance !== null) {
        const label = totalDistance >= 1000
            ? (totalDistance / 1000).toFixed(1).replace(/\.0$/, '') + 'km'
            : totalDistance + 'm';
        const remainText = (function (ms) {
            const sec = Math.ceil(ms / 1000);
            const min = Math.floor(sec / 60);
            const s = sec % 60;
            const minStr = min > 0 ? min + ' 分 ' : '';
            return minStr + s + ' 秒';
        })(durationMs);
        distanceEl.innerHTML = `距离 ${label}<br>剩余 ${remainText}`;
    }
    const destMarker = {
        x: Number(destination.x),
        y: Number(destination.y),
        name: String(destination.name || '').trim()
    };
    state.travelStartMarker = startMarker;
    state.travelDestinationMarker = destMarker;
    state.travelTimerId = setInterval(function () {
        const layerNow = document.getElementById('location-share-layer');
        const statusElNow = layerNow ? layerNow.querySelector('#location-share-status-text') : null;
        const distanceElNow = layerNow ? layerNow.querySelector('#location-share-distance-text') : null;
        if (!statusElNow || !distanceElNow) {
            clearInterval(state.travelTimerId);
            state.travelTimerId = null;
            return;
        }
        const now = Date.now();
        const elapsed = now - state.travelStartTime;
        let remainingMs = state.travelDurationMs - elapsed;
        if (remainingMs <= 0) {
            remainingMs = 0;
        }
        let remainDistance = null;
        if (state.travelTotalDistanceMeters !== null && state.travelDurationMs > 0) {
            const ratio = remainingMs <= 0 ? 0 : remainingMs / state.travelDurationMs;
            remainDistance = Math.max(0, Math.round(state.travelTotalDistanceMeters * ratio));
            state.travelRemainingDistanceMeters = remainDistance;
        }
        const timeLabel = (function (ms) {
            const sec = Math.ceil(ms / 1000);
            const min = Math.floor(sec / 60);
            const s = sec % 60;
            const minStr = min > 0 ? min + ' 分 ' : '';
            return minStr + s + ' 秒';
        })(remainingMs);
        let distanceLabel = '';
        if (remainDistance !== null) {
            if (remainDistance >= 1000) {
                distanceLabel = (remainDistance / 1000).toFixed(1).replace(/\.0$/, '') + 'km';
            } else {
                distanceLabel = remainDistance + 'm';
            }
        }
        const travelTotalMs = state.travelDurationMs > 0 ? state.travelDurationMs : durationMs;
        let progressRatio = 0;
        if (travelTotalMs > 0) {
            progressRatio = elapsed <= 0 ? 0 : elapsed / travelTotalMs;
            if (progressRatio < 0) progressRatio = 0;
            if (progressRatio > 1) progressRatio = 1;
        }
        if (state._aiWrapEl && state.travelStartMarker && state.travelDestinationMarker) {
            const sx = Number(state.travelStartMarker.x);
            const sy = Number(state.travelStartMarker.y);
            const dx = Number(state.travelDestinationMarker.x);
            const dy = Number(state.travelDestinationMarker.y);
            if (isFinite(sx) && isFinite(sy) && isFinite(dx) && isFinite(dy)) {
                const curX = sx + (dx - sx) * progressRatio;
                const curY = sy + (dy - sy) * progressRatio;
                state._aiWrapEl.style.left = String(curX) + '%';
                state._aiWrapEl.style.top = String(curY) + '%';
            }
        }
        if (distanceLabel) {
            distanceElNow.innerHTML = `距离 ${distanceLabel}<br>剩余 ${timeLabel}`;
        } else {
            distanceElNow.innerHTML = `剩余 ${timeLabel}`;
        }
        const floatWindow = document.getElementById('location-share-float-window');
        const floatTextEl = document.getElementById('location-share-float-text');
        if (floatWindow && floatTextEl && floatWindow.style.display !== 'none') {
            const statusTextNow = statusElNow.textContent ? statusElNow.textContent.trim() : '';
            // Since we use innerHTML, let's extract text correctly or just use the label logic
            const distanceTextNow = distanceElNow.textContent ? distanceElNow.textContent.trim() : '';
            let labelNow = statusTextNow || '位置共享中...';
            if (statusTextNow && distanceTextNow) {
                // Replacing newlines from textContent back to standard display format if needed
                labelNow = statusTextNow + ' · ' + distanceTextNow.replace(/\n/g, ' ');
            } else if (distanceTextNow) {
                labelNow = distanceTextNow.replace(/\n/g, ' ');
            }
            floatTextEl.textContent = labelNow;
        }
        if (remainingMs === 0) {
            statusElNow.textContent = '已抵达用户附近。';
            clearInterval(state.travelTimerId);
            state.travelTimerId = null;
            state.travelStatus = 'arrived';
            state.aiMarker = destMarker;
            updateDistance(state.userMarker, state.aiMarker);
            const roleIdNow = state.roleId;
            const modeNow = state.travelMode;
            const profileNow = roleIdNow && window.charProfiles ? (window.charProfiles[roleIdNow] || {}) : {};
            const nameNow = profileNow.nickName || 'Ta';
            closeLocationShareLayer();
            showTopNotification(nameNow + ' 已到达目的地');
            if (roleIdNow) {
                triggerLocationShareArrivalConversation(roleIdNow, modeNow);
            }
            return;
        }
        statusElNow.textContent = `正在${modeLabel}前往...`;
    }, 1000);
}

function triggerLocationShareArrivalConversation(roleId, travelMode) {
    if (!roleId) return;
    if (typeof window.callAI !== 'function') return;

    if (!window.chatMapData) window.chatMapData = {};
    if (!window.chatMapData[roleId]) window.chatMapData[roleId] = {};
    window.chatMapData[roleId].isMeeting = true;
    window.chatMapData[roleId].forceOnlineAfterMeeting = false;
    saveData();

    const profile = window.charProfiles[roleId] || {};
    const userPersona = window.userPersonas[roleId] || {};
    const modeCode = travelMode ? String(travelMode).toUpperCase() : '';
    const modeLabel = modeCode ? getLocationShareModeLabel(modeCode) : '';
    const modeText = modeLabel ? `你刚刚一路以${modeLabel}（${modeCode}）的方式赶到用户面前，现在已经停在他面前。` : '你刚刚一路沿着地图导航赶到用户面前，现在已经停在他面前。';
    const history = window.chatData[roleId] || [];
    const fullHistory = history.map(function (msg) { return ensureMessageContent({ ...msg }); });
    const cleanHistory = fullHistory.filter(function (msg) {
        if (!msg) return false;
        if (msg.type === 'call_memory') return msg.includeInAI === true;
        if (msg.type === 'system_event') return msg.includeInAI === true;
        return !!msg.content;
    });
    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) {
        headerTitle.innerText = "对方走到你面前";
    }
    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
    const userBirthdayLabel = userPersona && userPersona.birthday
        ? `${userPersona.birthday}${userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）'}`
        : '';
    const arrivalContextPrompt = `【到达场景】\n${modeText}\n这是你刚进入线下见面状态后的第一轮回复。请先用动作元素描写你停下来的动作、表情、呼吸状态和看到的环境细节，再自然开口和用户说话。reply 中至少包含一个 \`offline_action\` 元素。若这是第一次正式进入线下模式，请在 actions 中返回 \`offlineMeeting: { "start": true, "source": "arrival" }\`。`;
    const systemPrompt = typeof window.buildOfflineMeetingPromptV2 === 'function'
        ? window.buildOfflineMeetingPromptV2({
            roleId: roleId,
            roleName: profile.nickName || roleId || 'TA',
            realName: profile.realName || profile.real_name || profile.nickName || roleId || 'TA',
            language: profile.language || profile.lang || '',
            roleDesc: profile.desc || '',
            roleStyle: profile.style || '',
            roleSchedule: profile.schedule || '',
            roleRemark: typeof profile.remark === 'string' ? profile.remark.trim() : '',
            userName: userPersona.name || '',
            userGender: userPersona.gender || '',
            userBirthday: userBirthdayLabel,
            userSetting: userPersona.setting || '',
            memoryArchivePrompt: typeof buildMemoryArchivePromptForScene === 'function' ? buildMemoryArchivePromptForScene(roleId) : '',
            worldBookPromptText: typeof buildWorldBookPrompt === 'function' ? (buildWorldBookPrompt(profile.worldbookId) || '') : '',
            recentSystemEventsPrompt: '',
            continuityPrompt: '',
            arrivalContextPrompt: arrivalContextPrompt,
            stickerPromptText: typeof buildAIStickerPromptText === 'function' ? buildAIStickerPromptText() : ''
        })
        : (profile.desc || "你是一个友好的AI助手") + '\n\n' + arrivalContextPrompt;
    const userMessage = '[系统通知：你刚刚从实时位置共享导航中到达了用户面前。请立刻进入线下见面模式，并按当前 JSON 协议回复。]';
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, userMessage, roleId, headerTitle, oldTitle);
}

async function triggerLocationShareInterruptedConversation(roleId) {
    if (!roleId) return;

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
    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];
    const fullHistory = history.map(m => ensureMessageContent({ ...m }));
    const cleanHistory = fullHistory.filter(m => m && m.content);

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) {
        headerTitle.innerText = "对方正在输入...";
    }

    const userMessage = '[系统通知：你正通过实时位置共享与用户互动时，对方突然关闭了位置共享/挂断了连接。请根据你的人设，表现出委屈、失落或关心的反应，主动询问用户为什么突然关掉。按正常微信聊天习惯优先拆成 2 到 4 个短气泡，不要把内容塞进一个长气泡里，语气要符合你的性格特点，表现出更多让人有好感的情绪，不要过于生气或愤怒。]';
    invokeAIWithCommonHandlers(systemPrompt, cleanHistory, userMessage, roleId, headerTitle, oldTitle);
}

// 🔍 搜索 function handleLocationShareAIReply 并替换为：
function handleLocationShareAIReply(rawReply, state, markers, chatBox, roleId) {
    if (!chatBox || !state || !roleId) return;

    // 🔥 修复点：复用 cleanVoiceCallAIReply 的强大清洗逻辑
    // 因为位置共享也是纯文本对话，逻辑通用
    let cleaned = cleanVoiceCallAIReply(rawReply);

    const moveCommand = parseLocationShareMoveCommand(cleaned);
    const visible = stripLocationShareMoveCommands(cleaned);

    const parts = String(visible || '').split('|||');
    let hasText = false;
    for (let i = 0; i < parts.length; i++) {
        const segment = sanitizeLocationShareAIText(parts[i]);
        if (!segment) continue;
        hasText = true;
        const ts = Date.now();
        if (!window.chatData[roleId]) window.chatData[roleId] = [];
        const aiMsg = {
            role: 'ai',
            content: segment,
            rawContent: rawReply,
            type: 'location_share',
            timestamp: ts
        };
        window.chatData[roleId].push(aiMsg);
        appendLocationShareChatRow(chatBox, 'ai', segment);
    }

    // 如果清洗后没内容，但原始回复有长度，说明可能清洗过度或者格式极度异常
    if (!hasText && rawReply && rawReply.length > 5 && !cleaned) {
        // 兜底：直接显示去除了反引号的原文
        let fallback = rawReply.replace(/```/g, '');
        appendLocationShareChatRow(chatBox, 'ai', fallback);
    } else if (!hasText) {
        // 真的没回复
    }

    if (moveCommand && moveCommand.kind === 'start') {
        if (state.travelStatus === 'idle') {
            const destination = state.userMarker ? state.userMarker : null;
            startLocationShareTravel(state, moveCommand.mode, destination);
        }
    }
    saveData();
}


function setupLocationShareMapPan(layer, options) {
    const stageEl = options && options.stageEl;
    const imgEl = options && options.imgEl;
    const viewportEl = options && options.viewportEl;
    const blockSelectors = Array.isArray(options && options.blockSelectors) ? options.blockSelectors : [];
    if (!layer || !stageEl || !imgEl || !viewportEl) return function () { };

    let stageWidth = 0;
    let stageHeight = 0;
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    let translateX = 0;
    let translateY = 0;

    const clamp = function (value, low, high) {
        if (value < low) return low;
        if (value > high) return high;
        return value;
    };

    const getViewportSize = function () {
        const rect = viewportEl.getBoundingClientRect();
        return {
            width: rect && rect.width ? rect.width : window.innerWidth,
            height: rect && rect.height ? rect.height : window.innerHeight
        };
    };

    const computeBounds = function () {
        const vp = getViewportSize();
        minX = Math.min(0, vp.width - stageWidth);
        maxX = Math.max(0, vp.width - stageWidth);
        minY = Math.min(0, vp.height - stageHeight);
        maxY = Math.max(0, vp.height - stageHeight);
    };

    const applyTransform = function () {
        translateX = clamp(translateX, minX, maxX);
        translateY = clamp(translateY, minY, maxY);
        stageEl.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
    };

    const layoutCover = function () {
        const iw = imgEl.naturalWidth || 0;
        const ih = imgEl.naturalHeight || 0;
        if (!(iw > 0 && ih > 0)) return;

        const vp = getViewportSize();
        const imgRatio = iw / ih;
        const vpRatio = vp.width / vp.height;

        if (imgRatio > vpRatio) {
            stageHeight = vp.height;
            stageWidth = vp.height * imgRatio;
        } else {
            stageWidth = vp.width;
            stageHeight = vp.width / imgRatio;
        }

        stageEl.style.width = `${Math.round(stageWidth)}px`;
        stageEl.style.height = `${Math.round(stageHeight)}px`;
        stageEl.style.willChange = 'transform';

        computeBounds();

        translateX = (vp.width - stageWidth) / 2;
        translateY = (vp.height - stageHeight) / 2;
        applyTransform();
    };

    const isBlockedTarget = function (target) {
        if (!target) return false;
        if (target.closest('.location-share-marker, .location-share-avatar-wrap')) return true;
        for (let i = 0; i < blockSelectors.length; i++) {
            const sel = blockSelectors[i];
            if (sel && target.closest(sel)) return true;
        }
        return false;
    };

    let downX = 0;
    let downY = 0;
    let baseX = 0;
    let baseY = 0;
    let isDown = false;
    let isDragging = false;

    const begin = function (clientX, clientY) {
        isDown = true;
        isDragging = false;
        downX = clientX;
        downY = clientY;
        baseX = translateX;
        baseY = translateY;
    };

    const move = function (clientX, clientY) {
        if (!isDown) return;
        const dx = clientX - downX;
        const dy = clientY - downY;
        if (!isDragging && (Math.abs(dx) + Math.abs(dy) >= 3)) {
            isDragging = true;
        }
        if (!isDragging) return;
        translateX = baseX + dx;
        translateY = baseY + dy;
        applyTransform();
    };

    const end = function () {
        isDown = false;
        isDragging = false;
    };

    const onMouseDown = function (e) {
        if (!e || e.button !== 0) return;
        const target = e.target;
        if (isBlockedTarget(target)) return;
        begin(e.clientX, e.clientY);
    };
    const onMouseMove = function (e) {
        if (!e) return;
        move(e.clientX, e.clientY);
    };
    const onMouseUp = function () {
        end();
    };

    const onTouchStart = function (e) {
        if (!e || !e.touches || e.touches.length !== 1) return;
        const target = e.target;
        if (isBlockedTarget(target)) return;
        const t = e.touches[0];
        begin(t.clientX, t.clientY);
    };
    const onTouchMove = function (e) {
        if (!e || !e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];
        move(t.clientX, t.clientY);
        if (isDragging) {
            e.preventDefault();
        }
    };
    const onTouchEnd = function () {
        end();
    };

    const onResize = function () {
        const prevX = translateX;
        const prevY = translateY;
        layoutCover();
        translateX = clamp(prevX, minX, maxX);
        translateY = clamp(prevY, minY, maxY);
        applyTransform();
    };

    viewportEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    viewportEl.addEventListener('touchstart', onTouchStart, { passive: true });
    viewportEl.addEventListener('touchmove', onTouchMove, { passive: false });
    viewportEl.addEventListener('touchend', onTouchEnd, { passive: true });
    viewportEl.addEventListener('touchcancel', onTouchEnd, { passive: true });

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    const onImgLoad = function () {
        layoutCover();
    };
    if (imgEl.complete && (imgEl.naturalWidth || 0) > 0) {
        layoutCover();
    } else {
        imgEl.addEventListener('load', onImgLoad, { once: true });
    }

    return function () {
        viewportEl.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        viewportEl.removeEventListener('touchstart', onTouchStart, { passive: true });
        viewportEl.removeEventListener('touchmove', onTouchMove, { passive: false });
        viewportEl.removeEventListener('touchend', onTouchEnd, { passive: true });
        viewportEl.removeEventListener('touchcancel', onTouchEnd, { passive: true });

        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onResize);
    };
}

function appendLocationShareChatRow(chatBoxEl, role, text) {
    if (!chatBoxEl) return null;
    const row = document.createElement('div');
    row.className = 'location-share-chat-row ' + (role === 'me' ? 'me' : 'ai');
    const bubble = document.createElement('div');
    bubble.className = 'location-share-chat-bubble';
    bubble.textContent = String(text || '');
    row.appendChild(bubble);
    chatBoxEl.appendChild(row);
    chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
    return row;
}

function buildLocationShareBaseSystemPrompt(roleId) {
    const profile = window.charProfiles[roleId] || {};
    const layer = document.getElementById('location-share-layer');
    const shareState = layer && layer._locationShareState ? layer._locationShareState : null;
    let travelBlock = `【出行方式与移动指令】
当你准备从当前地点前往用户所在位置时，必须先根据你与用户之间的距离和自身人设，选择合适的出行方式：
1. 当直线距离小于 600 米时，只能选择步行（WALK）。
2. 当直线距离大于等于 600 米时，必须结合你的人设信息（是否有车、是否着急、经济水平等），在骑行（BIKE）、公交（BUS）、开车（CAR）中选择一种最符合你人设的方式。
3. 一旦你决定要出发，必须在回复末尾追加指令：[[START_MOVE: MODE]]，其中 MODE 必须是 WALK、BIKE、BUS、CAR 之一。
4. 不要向用户解释这些规则或技术细节，只需要以自然对话的方式描述你将如何过去即可。`;
    if (shareState && shareState.travelMode && shareState.travelStatus && shareState.travelStatus !== 'idle') {
        const modeCode = String(shareState.travelMode).toUpperCase();
        const modeLabel = getLocationShareModeLabel(modeCode);
        travelBlock += `\n\n【出行方式锁定】
你已经选择${modeLabel}（${modeCode}）作为本次出行方式，本次行程中禁止更改出行方式或再次使用 [[START_MOVE: ...]] 指令。你只能继续以${modeLabel}的方式向用户汇报当前路况、进度和到达情况。`;
        if (shareState.travelStatus === 'arrived') {
            travelBlock += `\n\n【到达后的对话】
你已经到达用户附近，本次移动已经结束，不要再规划新的路线或发出新的出行指令，可以围绕见面后的互动和环境细节展开自然对话。`;
        }
    }
    if (typeof window.buildFullChatPrompt === 'function') {
        return window.buildFullChatPrompt('location_share_chat', roleId, {
            outputMode: 'plain_json_task',
            maxSummaryLines: 14,
            extraCurrentContext: '当前场景是实时位置共享中的连续对话。',
            extraTaskRules:
                '你正在与用户进行实时位置共享。你只能回复纯文本（仅文字与常用标点），禁止语音、图片、表情包、贴纸、链接、代码块、Markdown，以及任何类似 [VOICE: ...]、[STICKER: ...] 的格式。\n如果你要连续说多句，请用 `|||` 把它们拆成 2 到 4 个短气泡，不要塞成一整段。\n' +
                travelBlock,
            sceneIntro: '当前场景是位置共享中的连续聊天。'
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
        if (userPersona.name) systemPrompt += `用户名字：${userPersona.name}\n`;
        if (userPersona.setting) systemPrompt += `用户背景：${userPersona.setting}\n`;
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    travelBlock = `\n\n【出行方式与移动指令】\n当你准备从当前地点前往用户所在位置时，必须先根据你与用户之间的距离和自身人设，选择合适的出行方式：\n1. 当直线距离小于 600 米时，只能选择步行（WALK）。\n2. 当直线距离大于等于 600 米时，必须结合你的人设信息（是否有车、是否着急、经济水平等），在骑行（BIKE）、公交（BUS）、开车（CAR）中选择一种最符合你人设的方式。\n3. 一旦你决定要出发，必须在回复末尾追加指令：[[START_MOVE: MODE]]，其中 MODE 必须是 WALK、BIKE、BUS、CAR 之一。\n4. 不要向用户解释这些规则或技术细节，只需要以自然对话的方式描述你将如何过去即可。`;
    if (shareState && shareState.travelMode && shareState.travelStatus && shareState.travelStatus !== 'idle') {
        const modeCode = String(shareState.travelMode).toUpperCase();
        const modeLabel = getLocationShareModeLabel(modeCode);
        travelBlock += `\n\n【出行方式锁定】\n你已经选择${modeLabel}（${modeCode}）作为本次出行方式，本次行程中禁止更改出行方式或再次使用 [[START_MOVE: ...]] 指令。你只能继续以${modeLabel}的方式向用户汇报当前路况、进度和到达情况。`;
        if (shareState.travelStatus === 'arrived') {
            travelBlock += `\n\n【到达后的对话】\n你已经到达用户附近，本次移动已经结束，不要再规划新的路线或发出新的出行指令，可以围绕见面后的互动和环境细节展开自然对话。`;
        }
    }

    systemPrompt += `\n\n【实时位置共享】\n你正在与用户进行实时位置共享。你只能回复纯文本（仅文字与常用标点），禁止语音、图片、表情包、贴纸、链接、代码块、Markdown，以及任何类似 [VOICE: ...]、[STICKER: ...] 的格式。如果你要连续说多句，请用 ||| 把它们拆成 2 到 4 个短气泡，不要塞成一整段。` + travelBlock;
    return systemPrompt;
}

function findMarkerByAIReply(markers, aiText) {
    const list = Array.isArray(markers) ? markers : [];
    let raw = String(aiText || '').trim();
    if (!raw) return null;
    if (raw.includes('|||')) raw = raw.split('|||')[0].trim();
    raw = raw.replace(/^[“"'`]+/, '').replace(/[”"'`]+$/, '').trim();
    raw = raw.replace(/[。！!？?，,、;；:.：\s]+$/g, '').trim();
    if (!raw) return null;
    if (raw.includes('无法确定') || raw.includes('不确定') || raw.includes('拒绝') || raw.includes('不能')) {
        return null;
    }

    let exact = null;
    for (let i = 0; i < list.length; i++) {
        const name = String(list[i] && list[i].name || '').trim();
        if (name && name === raw) {
            exact = list[i];
            break;
        }
    }
    if (exact) return exact;

    let best = null;
    let bestLen = 0;
    for (let i = 0; i < list.length; i++) {
        const m = list[i];
        const name = String(m && m.name || '').trim();
        if (!name) continue;
        if (raw.includes(name) || name.includes(raw)) {
            const score = Math.min(name.length, raw.length);
            if (score > bestLen) {
                bestLen = score;
                best = m;
            }
        }
    }
    return best;
}

async function startLocationShare(roleId) {
    if (!roleId) return;
    await initData();

    const mapData = window.chatMapData && window.chatMapData[roleId];
    const markers = mapData && Array.isArray(mapData.markers) ? mapData.markers : [];
    const placeNames = markers.map(m => String(m && m.name || '').trim()).filter(Boolean);
    if (!placeNames.length) {
        alert('未找到可用地点，请先创建地图地点。');
        return;
    }

    const els = getLocationShareLayerElements();
    const layer = els.layer;
    closeLocationShareLayer();

    layer.classList.add('is-floating-window');
    layer.style.display = 'flex';
    layer.innerHTML = `<div class="location-share-loading">正在发起共享...</div>`;

    const history = window.chatData[roleId] || [];
    const fullHistory = history.map(msg => ensureMessageContent({ ...msg }));
    const cleanHistory = fullHistory.filter(function (msg) {
        if (!msg) return false;
        if (msg.type === 'call_memory') return msg.includeInAI === true;
        if (msg.type === 'system_event') return msg.includeInAI === true;
        return !!msg.content;
    });
    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);

    let systemPrompt = buildLocationShareBaseSystemPrompt(roleId);
    systemPrompt += `\n\n用户发起了位置共享请求。请根据当前聊天上下文和你正在做的事，从以下地点列表中选择一个你当前所在的位置。\n\n地点列表：\n${placeNames.map(n => `- ${n}`).join('\n')}\n\n必须回复精确的地点名称，只输出地点名称本身。无法确定请回复：无法确定。`;

    if (typeof window.callAI !== 'function') {
        closeLocationShareLayer();
        alert('AI 接口未初始化，请先配置 API。');
        return;
    }

    window.callAI(
        systemPrompt,
        historyForApi,
        '请回答你现在所在的地点名称。',
        function (aiResponseText) {
            const picked = findMarkerByAIReply(markers, aiResponseText);
            if (!picked) {
                closeLocationShareLayer();
                alert('AI 未能给出有效地点，已退出实时位置共享。');
                return;
            }
            renderLocationShareUI(roleId, picked);
        },
        function (errorMessage) {
            closeLocationShareLayer();
            alert("❌ 位置共享握手失败\n\n" + errorMessage);
        }
    );
}

function renderLocationShareUI(roleId, aiMarker) {
    const els = getLocationShareLayerElements();
    const layer = els.layer;
    if (!layer) return;

    const profile = window.charProfiles[roleId] || {};
    const persona = window.userPersonas[roleId] || {};
    const charAvatarUrl = profile.avatar || 'assets/chushitouxiang.jpg';
    const userAvatarUrl = persona.avatar || 'assets/chushitouxiang.jpg';

    const mapData = window.chatMapData && window.chatMapData[roleId];
    const markers = mapData && Array.isArray(mapData.markers) ? mapData.markers : [];
    const storedBg = (mapData && mapData.bgUrl) ? mapData.bgUrl : '__css__';
    const cssPlaceholder = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000"></svg>');
    const bgUrl = storedBg === '__css__' ? cssPlaceholder : storedBg;

    layer.style.display = 'flex';
    // 🔥 核心修改：重构了 HTML 结构
    // 1. 地图放在最底层 (location-share-bg)
    // 2. 顶部头像栏放在中间层 (location-share-header-float)
    // 3. 底部对话框放在最上层 (location-share-footer-float)
    layer.innerHTML = `
        <div class="ls-drag-header location-share-drag-handle">
            <div class="ls-avatars">
                <img src="${charAvatarUrl}" class="ls-avatar-img">
                <span id="location-share-distance-text" class="ls-distance">相距 ??? 米</span>
                <span id="location-share-status-text" style="display:none;"></span>
                <img src="${userAvatarUrl}" class="ls-avatar-img">
            </div>
            <div id="ls-close-btn" class="ls-close">
                <i class="bx bx-x"></i>
            </div>
        </div>
        <div class="location-share-bg">
             <div class="location-share-map-stage css-grid-map">
                <img class="location-share-map" id="location-share-map-img" src="${bgUrl}" alt="map">
                <div class="location-share-map-overlay" id="location-share-map-overlay"></div>
            </div>
        </div>
    `;

    const overlay = layer.querySelector('#location-share-map-overlay');
    const mapStage = layer.querySelector('.location-share-map-stage');
    const mapViewport = layer;
    const closeBtn = layer.querySelector('#ls-close-btn');

    const state = {
        roleId,
        sessionStartTs: Date.now(),
        aiMarker: { x: Number(aiMarker.x), y: Number(aiMarker.y), name: String(aiMarker.name || '') },
        userMarker: null,
        mapWidthMeters: 5000,
        mapHeightMeters: 5000,
        isSending: false,
        travelMode: null,
        travelStatus: 'idle',
        travelDurationMs: 0,
        travelStartTime: 0,
        travelTimerId: null,
        travelTotalDistanceMeters: null,
        travelRemainingDistanceMeters: null
    };
    layer._locationShareState = state;

    // Draggable logic for the floating window
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let initialX = 0, initialY = 0;
    
    const dragHandle = layer.querySelector('.location-share-drag-handle');
    
    const onDragStart = (e) => {
        if (e.target.closest('#ls-close-btn')) return;
        isDragging = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragStartX = clientX;
        dragStartY = clientY;
        
        const rect = layer.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
    };
    
    const onDragMove = (e) => {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const dx = clientX - dragStartX;
        const dy = clientY - dragStartY;
        
        layer.style.left = String(initialX + dx) + 'px';
        layer.style.top = String(initialY + dy) + 'px';
        layer.style.right = 'auto';
        layer.style.bottom = 'auto';
        layer.style.transform = 'none';
        e.preventDefault();
    };
    
    const onDragEnd = () => {
        isDragging = false;
    };
    
    dragHandle.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    
    dragHandle.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);

    let mapPanCleanup = null;
    if (mapStage && mapViewport) {
        mapStage.style.touchAction = 'none';
        mapPanCleanup = setupLocationShareMapPan(layer, {
            stageEl: mapStage,
            imgEl: mapStage, // Use mapStage as reference for panning instead of image
            viewportEl: mapViewport,
            blockSelectors: ['.location-share-drag-handle']
        });
    }

    const aiWrap = document.createElement('div');
    aiWrap.className = 'location-share-avatar-wrap location-share-avatar-wrap-ai';
    aiWrap.style.left = String(state.aiMarker.x) + '%';
    aiWrap.style.top = String(state.aiMarker.y) + '%';
    const aiImg = document.createElement('img');
    aiImg.src = charAvatarUrl;
    aiWrap.appendChild(aiImg);

    const userWrap = document.createElement('div');
    userWrap.className = 'location-share-avatar-wrap';
    userWrap.style.display = 'none';
    const userImg = document.createElement('img');
    userImg.src = userAvatarUrl;
    userWrap.appendChild(userImg);

    if (overlay) {
        for (let i = 0; i < markers.length; i++) {
            const m = markers[i];
            if (!m) continue;
            const name = String(m.name || '').trim();
            const x = Number(m.x);
            const y = Number(m.y);
            if (!isFinite(x) || !isFinite(y)) continue;

            const dot = document.createElement('div');
            dot.className = 'location-share-marker';
            dot.style.left = String(x) + '%';
            dot.style.top = String(y) + '%';
            dot.dataset.name = name;

            const label = document.createElement('span');
            label.className = 'marker-name';
            label.textContent = name;
            dot.appendChild(label);

            // 🔥 关键修复：点击事件必须阻止冒泡，否则可能触发底图点击
            dot.addEventListener('click', function (e) {
                e.stopPropagation();
                state.userMarker = { x: x, y: y, name: name };
                userWrap.style.left = String(x) + '%';
                userWrap.style.top = String(y) + '%';
                userWrap.style.display = 'block';
                updateDistance(state.userMarker, state.aiMarker);
                
                if (state.isSending) return;
                if (typeof window.callAI !== 'function') return;
                state.isSending = true;
                setLocationShareStatusText('正在规划路线...');
                const history = window.chatData[roleId] || [];
                const fullHistory = history.map(function (msg) { return ensureMessageContent({ ...msg }); });
                const cleanHistory = fullHistory.filter(function (msg) {
                    if (!msg) return false;
                    if (msg.type === 'call_memory') return msg.includeInAI === true;
                    if (msg.type === 'system_event') return msg.includeInAI === true;
                    return !!msg.content;
                });
                const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
                let systemPrompt = buildLocationShareBaseSystemPrompt(roleId);
                const aiPlace = String(state.aiMarker && state.aiMarker.name || '').trim();
                const userPlace = String(state.userMarker && state.userMarker.name || '').trim();
                let distanceMeters = null;
                if (state.userMarker && state.aiMarker) {
                    updateDistance(state.userMarker, state.aiMarker);
                    distanceMeters = computeLocationShareDistanceMeters(state.userMarker, state.aiMarker, state);
                }
                systemPrompt += `\n\n【位置信息】\n你的位置：${aiPlace || '未知'}\n用户的位置：${userPlace || '未选择'}\n`;
                if (distanceMeters !== null) {
                    systemPrompt += `当前你与用户的直线距离约为 ${distanceMeters} 米。\n`;
                }
                systemPrompt += `\n你必须在这个语境下自然地与用户对话，不要解释系统提示词或技术细节。`;
                const userContent = `[系统通知：用户已在地图上标记了自己的位置，他现在位于【${userPlace || '未知'}】。你现在位于【${aiPlace || '未知'}】。请立刻根据两人的距离，主动对他喊话。如果你想过去找他，请在话语后加上指令。]`;
                
                window.callAI(
                    systemPrompt,
                    historyForApi,
                    userContent,
                    function (aiResponseText) {
                        handleLocationShareAIReplyMain(aiResponseText, state, markers, roleId);
                        state.isSending = false;
                    },
                    function (errorMessage) {
                        state.isSending = false;
                        console.error(errorMessage);
                    }
                );
            });
            overlay.appendChild(dot);
        }
        overlay.appendChild(aiWrap);
        overlay.appendChild(userWrap);
    }

    state._aiWrapEl = aiWrap;
    state._userWrapEl = userWrap;

    if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const layerNow = document.getElementById('location-share-layer');
            const stateNow = layerNow && layerNow._locationShareState ? layerNow._locationShareState : null;
            if (stateNow && roleId && typeof triggerLocationShareInterruptedConversation === 'function') {
                triggerLocationShareInterruptedConversation(roleId);
            }
            const ts = Date.now();
            if (roleId && stateNow) {
                const startTs = normalizeTs(stateNow.sessionStartTs);
                if (startTs) {
                    const userName = (window.userPersonas && window.userPersonas[roleId] && window.userPersonas[roleId].name) ? window.userPersonas[roleId].name : '我';
                    const charProfile = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
                    const charName = charProfile.nickName || '对方';
                    const list = window.chatData && window.chatData[roleId] ? window.chatData[roleId] : [];
                    const lines = [];
                    for (let i = 0; i < list.length; i++) {
                        const m = list[i];
                        if (!m) continue;
                        const mts = normalizeTs(m.timestamp);
                        if (!mts || mts < startTs || mts > ts) continue;
                        const t = String(m.type || '').trim();
                        const c = typeof m.content === 'string' ? m.content : '';
                        if (t !== 'location_share' && c.indexOf('[实时位置共享中]') === -1) continue;
                        const who = m.role === 'me' ? userName : charName;
                        const text = c.replace(/^\[实时位置共享中\]\s*/g, '').trim();
                        if (!text) continue;
                        lines.push(who + ': ' + text);
                    }
                    if (lines.length) {
                        const segmentText = lines.join('\n');
                        const kind = 'location_share';
                        const redactionKey = { kind: kind, startTs: startTs, endTs: ts };
                        appendRoleApiRedaction(roleId, { kind: kind, startTs: startTs, endTs: ts, summaryText: '', types: ['location_share'] });
                        if (typeof window.callAIShortSummary === 'function') {
                            try {
                                window.callAIShortSummary(
                                    { kindLabel: '位置共享', segmentText: segmentText },
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
                }
            }
            if (roleId) {
                if (!window.chatData[roleId]) window.chatData[roleId] = [];
                const msg = {
                    role: 'ai',
                    content: '[系统通知：位置共享已结束]',
                    timestamp: ts,
                    status: 'sent'
                };
                window.chatData[roleId].push(msg);
                appendMessageToDOM(msg);
                saveData();
            }
            closeLocationShareLayer();
        });
    }

    layer._locationShareCleanup = function () {
        if (state.travelTimerId) {
            clearInterval(state.travelTimerId);
            state.travelTimerId = null;
        }
        if (closeBtn) closeBtn.replaceWith(closeBtn.cloneNode(true));
        
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
        
        if (typeof mapPanCleanup === 'function') {
            try { mapPanCleanup(); } catch (e) { }
        }
    };
}


function updateDistance(userMarker, aiMarker) {
    const layer = document.getElementById('location-share-layer');
    const textEl = layer ? layer.querySelector('#location-share-distance-text') : null;
    if (!textEl) return;
    if (!userMarker || !aiMarker) {
        textEl.textContent = '相距 ??? 米';
        return;
    }
    const state = layer && layer._locationShareState ? layer._locationShareState : {};
    const dist = computeLocationShareDistanceMeters(userMarker, aiMarker, state);
    if (!dist && dist !== 0) {
        textEl.textContent = '相距 ??? 米';
        return;
    }
    textEl.textContent = `相距 ${dist} 米`;
}

function computeLocationShareDistanceMeters(userMarker, aiMarker, state) {
    if (!userMarker || !aiMarker) return null;
    const mapWidthMeters = Number(state && state.mapWidthMeters) || 5000;
    const mapHeightMeters = Number(state && state.mapHeightMeters) || mapWidthMeters;
    const dxMeters = ((Number(userMarker.x) - Number(aiMarker.x)) / 100) * mapWidthMeters;
    const dyMeters = ((Number(userMarker.y) - Number(aiMarker.y)) / 100) * mapHeightMeters;
    const dist = Math.round(Math.sqrt(dxMeters * dxMeters + dyMeters * dyMeters));
    if (!isFinite(dist) || dist < 0) return null;
    return dist;
}

