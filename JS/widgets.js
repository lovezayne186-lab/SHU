/* =========================================================
   文件路径：JS脚本文件夹/widgets.js
   作用：管理组件逻辑（相册组件、音乐播放器），含大容量存储支持
   ========================================================= */

/* --- 1. 通用图片上传逻辑 --- */
window.activeImgId = '';
window.activeHintId = '';

// HTML中组件点击时调用此函数
function triggerUpload(imgId, hintId) {
    // 1. 标记当前正在编辑组件
    window.activeImgId = imgId;
    window.activeHintId = hintId;
    
    // 【新增这一行！】 强制清空 App 选中状态，防止冲突
    window.currentEditingAppIndex = -1;

    // 2. 打开文件选择框
    const uploader = document.getElementById('global-uploader');
    if(uploader) {
        uploader.value = ''; 
        uploader.click();
    }
}


// ✨✨✨ 新增：初始化组件状态 (恢复图片) ✨✨✨
async function initWidgetState() {
    try {
        if (window.localforage && window.DB && typeof DB.configLargeStore === 'function') {
            DB.configLargeStore();
        }
    } catch (e) { }

    // 获取页面上所有的图片标签
    const allImages = document.querySelectorAll('img');

    allImages.forEach(async (img) => {
        // 只处理有 ID 的图片（因为我们需要 ID 作为存取的钥匙）
        if (img.id) {
            let savedImg = null;
            if (window.localforage && typeof window.localforage.getItem === 'function') {
                savedImg = await window.localforage.getItem('widget_img_' + img.id);
            } else {
                savedImg = localStorage.getItem('widget_save_' + img.id);
            }

            if (!savedImg) return;

            img.src = savedImg;
            img.style.display = 'block';
            img.style.opacity = '1';

            if (img.previousElementSibling && img.previousElementSibling.classList) {
                if (img.previousElementSibling.classList.contains('main-widget-placeholder')) {
                    img.previousElementSibling.style.display = 'none';
                }
            }

            if (img.nextElementSibling && img.nextElementSibling.classList) {
                if (img.nextElementSibling.classList.contains('upload-hint')) {
                    img.nextElementSibling.style.display = 'none';
                }
                if (img.nextElementSibling.classList.contains('upload-hint-text')) {
                    img.nextElementSibling.style.display = 'none';
                }
            }
        }
    });
    
    console.log("小组件图片已恢复");
    
    // 初始化桌面日历
    initMiniCalendar();

    await restoreLargeWidgetTexts();
    restoreCountdownWidgetState();
}

function initMiniCalendar() {
    const calendarDates = document.getElementById('mini-calendar-dates');
    if (!calendarDates) return;
    
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
    
    // 找到本周日的日期
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek);
    
    let html = '';
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const dateNum = currentDate.getDate();
        const isToday = i === dayOfWeek;
        
        html += `<span class="cal-num ${isToday ? 'today' : ''}">${dateNum}</span>`;
    }
    
    calendarDates.innerHTML = html;
}

async function restoreLargeWidgetTexts() {
    const map = [
        { key: 'widget_save_large_widget_title', elId: 'large-widget-title' },
        { key: 'widget_save_large_widget_subtitle', elId: 'large-widget-subtitle' },
        { key: 'widget_save_large_widget_sig', elId: 'large-widget-sig' },
        { key: 'widget_save_large_widget_location', elId: 'large-widget-location-text' }
    ];
    for (const item of map) {
        let v = null;
        try {
            v = localStorage.getItem(item.key);
        } catch (e) {
            v = null;
        }
        if (v == null && window.localforage && typeof window.localforage.getItem === 'function') {
            try {
                v = await window.localforage.getItem(item.key);
            } catch (e2) {
                v = null;
            }
        }
        if (v == null) continue;
        const el = document.getElementById(item.elId);
        if (!el) continue;
        el.innerText = String(v);
    }
}

function getCountdownWidgetStorageKeys() {
    return {
        name: 'widget_save_countdown_name',
        datetime: 'widget_save_countdown_datetime',
        color: 'widget_save_countdown_color'
    };
}

function normalizeCountdownDateString(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const date = new Date(raw);
    if (!date || isNaN(date.getTime())) return '';
    const pad = function (num) {
        return String(num).padStart(2, '0');
    };
    return [
        date.getFullYear(),
        '-',
        pad(date.getMonth() + 1),
        '-',
        pad(date.getDate())
    ].join('');
}

function parseCountdownDate(value) {
    const raw = normalizeCountdownDateString(value);
    if (!raw) return null;
    const parts = raw.split('-').map(function (s) { return parseInt(s, 10); });
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
    const date = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    if (!date || isNaN(date.getTime())) return null;
    return date;
}

function normalizeCountdownColor(value) {
    const fallback = '#FBCFE8';
    const color = String(value || '').trim();
    if (!color) return fallback;
    return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function getCountdownWidgetState() {
    const keys = getCountdownWidgetStorageKeys();
    const name = String(localStorage.getItem(keys.name) || '和宝宝一起').trim() || '和宝宝一起';
    const datetime = normalizeCountdownDateString(localStorage.getItem(keys.datetime));
    const color = normalizeCountdownColor(localStorage.getItem(keys.color));
    return {
        name: name,
        datetime: datetime,
        color: color
    };
}

function formatCountdownDatetimeForInput(value) {
    return normalizeCountdownDateString(value);
}

function formatCountdownDisplayDatetime(value) {
    const date = parseCountdownDate(value);
    if (!date) return '点击设置日期';
    const pad = function (num) {
        return String(num).padStart(2, '0');
    };
    return [
        date.getFullYear(),
        '.',
        pad(date.getMonth() + 1),
        '.',
        pad(date.getDate())
    ].join('');
}

function getCountdownDiffInfo(value) {
    const target = parseCountdownDate(value);
    if (!target) {
        return {
            label: '点击设置日期',
            number: '--'
        };
    }
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const diffMs = target.getTime() - todayStart.getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const absDays = Math.abs(Math.round(diffMs / dayMs));
    if (diffMs > 0) {
        return {
            label: '还有',
            number: String(absDays)
        };
    }
    if (diffMs < 0) {
        return {
            label: '已过',
            number: String(absDays)
        };
    }
    return {
        label: '今天',
        number: '0'
    };
}

function applyCountdownWidgetState() {
    const state = getCountdownWidgetState();
    const nameEl = document.getElementById('countdown-event-name');
    const dateEl = document.getElementById('countdown-event-datetime');
    const labelEl = document.getElementById('countdown-status-label');
    const numberEl = document.getElementById('countdown-days');
    const topEl = document.querySelector('.countdown-widget');
    const heartEl = document.querySelector('.countdown-widget .heart-icon');
    const diff = getCountdownDiffInfo(state.datetime);

    if (nameEl) nameEl.innerText = state.name;
    if (dateEl) dateEl.innerText = formatCountdownDisplayDatetime(state.datetime);
    if (labelEl) labelEl.innerText = diff.label;
    if (numberEl) numberEl.innerText = diff.number;
    if (numberEl) numberEl.style.display = 'block';
    if (labelEl) labelEl.style.display = 'inline';

    const color = state.color;
    if (topEl) topEl.style.color = color;
    if (nameEl) nameEl.style.color = color;
    if (dateEl) dateEl.style.color = color;
    if (labelEl) labelEl.style.color = color;
    if (numberEl) numberEl.style.color = color;
    if (heartEl) heartEl.style.color = color;
}

function restoreCountdownWidgetState() {
    applyCountdownWidgetState();
}

function saveCountdownWidgetState(nextState) {
    const keys = getCountdownWidgetStorageKeys();
    const state = nextState && typeof nextState === 'object' ? nextState : getCountdownWidgetState();
    const name = String(state.name || '').trim() || '和宝宝一起';
    const datetime = normalizeCountdownDateString(state.datetime);
    const color = normalizeCountdownColor(state.color);
    try {
        localStorage.setItem(keys.name, name);
        if (datetime) localStorage.setItem(keys.datetime, datetime);
        else localStorage.removeItem(keys.datetime);
        localStorage.setItem(keys.color, color);
    } catch (e) { }
    applyCountdownWidgetState();
}

function openCountdownWidgetSettings() {
    const modal = document.getElementById('countdown-settings-modal');
    const nameInput = document.getElementById('countdown-settings-name');
    const datetimeInput = document.getElementById('countdown-settings-datetime');
    const colorInput = document.getElementById('countdown-settings-color');
    if (!modal || !nameInput || !datetimeInput || !colorInput) {
        const current = getCountdownWidgetState();
        const name = prompt('事件名字：', current.name || '');
        if (name === null) return;
        const datetime = prompt('日期（建议格式：2026-03-30）：', current.datetime || '');
        if (datetime === null) return;
        const color = prompt('文字颜色（例如 #FBCFE8）：', current.color || '#FBCFE8');
        if (color === null) return;
        const nextDatetime = normalizeCountdownDateString(datetime);
        saveCountdownWidgetState({
            name: name,
            datetime: nextDatetime,
            color: color
        });
        return;
    }

    const current = getCountdownWidgetState();
    nameInput.value = current.name || '';
    datetimeInput.value = formatCountdownDatetimeForInput(current.datetime);
    colorInput.value = normalizeCountdownColor(current.color);

    const close = function () {
        modal.style.display = 'none';
    };

    const save = function () {
        const nextState = {
            name: nameInput.value,
            datetime: datetimeInput.value,
            color: colorInput.value
        };
        saveCountdownWidgetState(nextState);
        close();
        setTimeout(function () {
            try { applyCountdownWidgetState(); } catch (e) { }
        }, 0);
    };

    if (!modal.dataset.bound) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) close();
        });
        modal.dataset.bound = '1';
    }

    const cancelBtn = document.getElementById('countdown-settings-cancel');
    const saveBtn = document.getElementById('countdown-settings-save');
    if (cancelBtn) cancelBtn.onclick = close;
    if (saveBtn) saveBtn.onclick = save;

    modal.style.display = 'flex';
}

function editLargeWidgetText(field) {
    const fieldKey = String(field || '').trim();
    const config = {
        title: { key: 'widget_save_large_widget_title', elId: 'large-widget-title' },
        subtitle: { key: 'widget_save_large_widget_subtitle', elId: 'large-widget-subtitle' },
        sig: { key: 'widget_save_large_widget_sig', elId: 'large-widget-sig' },
        location: { key: 'widget_save_large_widget_location', elId: 'large-widget-location-text' }
    }[fieldKey];
    if (!config) return;

    const el = document.getElementById(config.elId);
    if (!el) return;

    const current = el.innerText || '';
    openTextEditModal({
        value: current,
        onSave: function (next) {
            const text = String(next);
            el.innerText = text;
            try {
                localStorage.setItem(config.key, text);
            } catch (e) { }
            if (window.localforage && typeof window.localforage.setItem === 'function') {
                window.localforage.setItem(config.key, text).catch(function () {});
            }
        }
    });
}

function openTextEditModal(options) {
    const modal = document.getElementById('text-edit-modal');
    const input = document.getElementById('text-edit-input');
    const cancelBtn = document.getElementById('text-edit-cancel');
    const saveBtn = document.getElementById('text-edit-save');
    if (!modal || !input || !cancelBtn || !saveBtn) {
        const next = prompt('修改文案：', String(options && options.value != null ? options.value : ''));
        if (next === null) return;
        if (options && typeof options.onSave === 'function') options.onSave(next);
        return;
    }

    const value = options && options.value != null ? String(options.value) : '';
    input.value = value;

    const close = function () {
        modal.style.display = 'none';
    };

    const save = function () {
        const v = input.value;
        const currentOptions = modal._currentOptions;
        if (currentOptions && typeof currentOptions.onSave === 'function') currentOptions.onSave(v);
        close();
    };

    if (!modal.dataset.bound) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) close();
        });
        cancelBtn.addEventListener('click', function () {
            close();
        });
        saveBtn.addEventListener('click', function () {
            save();
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                save();
            }
        });
        modal.dataset.bound = '1';
    }

    modal._currentOptions = options;

    modal.style.display = 'flex';
    setTimeout(function () {
        try { input.focus(); } catch (e) { }
        try { input.select(); } catch (e) { }
    }, 0);
}

/* --- 2. 音乐播放器逻辑 (保持不变) --- */
const audio = document.getElementById('audio-player');
const playIcon = document.getElementById('play-icon');
let isPlaying = false;

function togglePlay() {
    if (!audio || !playIcon) return;

    if (!audio.src || audio.src === window.location.href) {
        alert("请先点击标题加载音乐文件！");
        return;
    }
    
    if (isPlaying) {
        audio.pause();
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
    } else {
        audio.play();
        playIcon.classList.remove('fa-play');
        playIcon.classList.add('fa-pause');
    }
    isPlaying = !isPlaying;
}

// 对应 HTML 中的 type="file" onchange="loadSong(this)"
function loadSong(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const url = URL.createObjectURL(file);
        
        if (audio) {
            audio.src = url;
            audio.play();
            isPlaying = true;
            
            if (playIcon) {
                playIcon.classList.remove('fa-play');
                playIcon.classList.add('fa-pause');
            }
            
            // 可选：把歌名显示在界面上
            const titleEl = document.querySelector('.music-title');
            if(titleEl) titleEl.innerText = file.name.replace(/\.[^/.]+$/, ""); // 去掉后缀名
        }
    }
}

// 挂载全局
window.triggerUpload = triggerUpload;
window.initWidgetState = initWidgetState; // 暴露给主程序调用
window.togglePlay = togglePlay;
window.loadSong = loadSong;
window.editLargeWidgetText = editLargeWidgetText;
window.openCountdownWidgetSettings = openCountdownWidgetSettings;
window.restoreCountdownWidgetState = restoreCountdownWidgetState;


/* --- 自动加载组件并在有图时隐藏文字 (修复版) --- */
document.addEventListener('DOMContentLoaded', () => {
    // 这里列出了可能用到的组件 ID (第一页和第二页的所有组件)
    // 多写几个没关系，系统找不到的会自动忽略，不会报错
    const widgetConfig = [
        { imgId: 'img-widget', hintId: 'hint-widget' },        // 第一页大组件
        { imgId: 'music-cover-img', hintId: 'music-hint' },    // 第二页音乐封面
        { imgId: 'id-card-img', hintId: 'id-hint' },           // 第二页左侧图片组件
        { imgId: 'polaroid-img', hintId: 'polaroid-hint' },    // 第二页拍立得
        { imgId: 'w5-img', hintId: 'w5-hint' },
        { imgId: 'w6-img', hintId: 'w6-hint' }
    ];

    widgetConfig.forEach(widget => {
        // 尝试从数据库获取图片
        if(typeof localforage !== 'undefined') {
            localforage.getItem('widget_img_' + widget.imgId).then(function(imgSrc) {
                if (imgSrc) {
                    const imgEl = document.getElementById(widget.imgId);
                    const hintEl = document.getElementById(widget.hintId);

                    // 1. 恢复图片
                    if (imgEl) {
                        imgEl.src = imgSrc;
                        imgEl.style.display = 'block';
                    }

                    // 2. ★★★ 关键修复：如果有图，必须强制隐藏文字 ★★★
                    if (hintEl) {
                        hintEl.style.display = 'none'; 
                    }
                }
            });
        }
    });
});
