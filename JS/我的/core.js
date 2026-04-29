var MineCore = (function () {
    var initialized = false;
    var themeStudioInitialized = false;
    var themeStudioRuntime = {
        config: null,
        editingPresetId: '',
        globalCssPreviewPresetId: ''
    };
    var THEME_STUDIO_KEYS = {
        presets: 'theme_studio_userPresets_v1',
        global: 'theme_studio_global_v1',
        previewFloat: 'theme_studio_previewFloat_v1'
    };
    var GLOBAL_BEAUTIFY_CSS_KEY = 'theme_studio_globalBeautifyCss_v1';
    var GLOBAL_BEAUTIFY_CSS_PRESETS_KEY = 'theme_studio_globalBeautifyCssPresets_v1';
    var GLOBAL_BEAUTIFY_STYLE_ID = 'theme-studio-global-beautify-style';

    function compressImageDataUrl(dataUrl, maxSide, done) {
        if (!dataUrl) return done('');
        var img = new Image();
        img.onload = function () {
            var w = img.naturalWidth || img.width || 0;
            var h = img.naturalHeight || img.height || 0;
            if (!w || !h) return done(dataUrl);
            var maxDim = Math.max(w, h);
            var scale = maxDim > maxSide ? (maxSide / maxDim) : 1;
            var outW = Math.max(1, Math.round(w * scale));
            var outH = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            var ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, outW, outH);
                ctx.drawImage(img, 0, 0, outW, outH);
            }
            var out = '';
            try {
                out = canvas.toDataURL('image/jpeg', 0.86);
            } catch (e) {
                out = dataUrl;
            }
            done(out || dataUrl);
        };
        img.onerror = function () {
            done(dataUrl);
        };
        img.src = dataUrl;
    }

    function readImageFileAsAvatar(file, done) {
        if (!file) return done('');
        var reader = new FileReader();
        reader.onload = function (e) {
            var dataUrl = e && e.target ? e.target.result : '';
            dataUrl = typeof dataUrl === 'string' ? dataUrl : '';
            if (!dataUrl) return done('');
            compressImageDataUrl(dataUrl, 512, done);
        };
        reader.onerror = function () {
            done('');
        };
        try {
            reader.readAsDataURL(file);
        } catch (e) {
            done('');
        }
    }

    function buildHtml() {
        var html = '';
        html += '<div class="mine-root">';
        html += '  <div class="mine-header">';
        html += '    <div class="mine-header-avatar" data-mine-action="change-avatar">';
        html += '      <img data-mine-role="avatar" src="" alt="">';
        html += '    </div>';
        html += '    <div class="mine-header-info">';
        html += '      <div class="mine-header-name" data-mine-role="name" data-mine-action="edit-name"></div>';
        html += '      <div class="mine-header-signature" data-mine-role="signature" data-mine-action="edit-signature"></div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <input type="file" id="mine-avatar-input" class="mine-avatar-input" accept="image/*">';
        html += '  <div class="mine-list-section">';
        html += '    <div class="mine-list-item" data-mine-item="wallet">';
        html += '      <div class="mine-item-icon"><i class="bx bx-wallet"></i></div>';
        html += '      <div class="mine-item-text">钱包</div>';
        html += '      <div class="mine-item-arrow">›</div>';
        html += '    </div>';
        html += '    <div class="mine-list-item" data-mine-item="favorites">';
        html += '      <div class="mine-item-icon"><i class="bx bx-bookmark-heart"></i></div>';
        html += '      <div class="mine-item-text">收藏</div>';
        html += '      <div class="mine-item-arrow">›</div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="mine-list-section">';
        html += '    <div class="mine-list-item" data-mine-item="sports">';
        html += '      <div class="mine-item-icon"><i class="bx bx-run"></i></div>';
        html += '      <div class="mine-item-text">运动</div>';
        html += '      <div class="mine-item-arrow">›</div>';
        html += '    </div>';
        html += '    <div class="mine-list-item" data-mine-item="period">';
        html += '      <div class="mine-item-icon"><i class="bx bx-droplet"></i></div>';
        html += '      <div class="mine-item-text">经期</div>';
        html += '      <div class="mine-item-arrow">›</div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="mine-favorites-panel" id="mine-favorites-panel" style="display:none;">';
        html += '    <div class="mine-favorites-header">';
        html += '      <div class="mine-favorites-back" data-fav-action="back">‹</div>';
        html += '      <div class="mine-favorites-title">收藏</div>';
        html += '      <div class="mine-favorites-spacer"></div>';
        html += '    </div>';
        html += '    <div class="mine-favorites-body">';
        html += '      <div class="mine-favorites-quick-grid" id="mine-favorites-quick-grid"></div>';
        html += '      <div class="mine-favorites-section-title">最近收藏</div>';
        html += '      <div class="mine-favorites-list" id="mine-favorites-list"></div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="mine-edit-overlay" id="mine-edit-overlay" style="display:none;" aria-hidden="true">';
        html += '    <div class="mine-edit-card" role="dialog" aria-modal="true">';
        html += '      <div class="mine-edit-title" id="mine-edit-title"></div>';
        html += '      <input id="mine-edit-input" class="mine-edit-input" type="text" autocomplete="off">';
        html += '      <textarea id="mine-edit-textarea" class="mine-edit-textarea" rows="3"></textarea>';
        html += '      <div class="mine-edit-actions">';
        html += '        <button type="button" class="mine-edit-btn mine-edit-cancel" data-mine-edit="cancel">取消</button>';
        html += '        <button type="button" class="mine-edit-btn mine-edit-save" data-mine-edit="save">保存</button>';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
        return html;
    }

    function buildThemeStudioHtml() {
        var html = '';
        html += '  <div class="theme-studio-panel" id="theme-studio-panel" style="display:none;" aria-hidden="true">';
        html += '    <div class="theme-studio-header">';
        html += '      <div class="theme-studio-back" data-theme-action="back">‹</div>';
        html += '      <div class="theme-studio-title">美化中心</div>';
        html += '      <button type="button" class="theme-studio-save" data-theme-action="save">保存为预设</button>';
        html += '    </div>';
        html += '    <div class="theme-studio-main">';
        html += '      <div class="theme-studio-scroll">';
        html += '      <div class="theme-studio-home" data-theme-page="home">';
        html += '        <button type="button" class="theme-home-card" data-theme-nav="global">';
        html += '          <span class="theme-home-icon"><i class="fas fa-wand-magic-sparkles"></i></span>';
        html += '          <span class="theme-home-main">';
        html += '            <span class="theme-home-title">全局美化</span>';
        html += '            <span class="theme-home-desc">管理全局 CSS、导入文件和全局美化预设。</span>';
        html += '          </span>';
        html += '          <span class="theme-home-arrow">›</span>';
        html += '        </button>';
        html += '        <button type="button" class="theme-home-card" data-theme-nav="bubble">';
        html += '          <span class="theme-home-icon"><i class="fas fa-comment-dots"></i></span>';
        html += '          <span class="theme-home-main">';
        html += '            <span class="theme-home-title">自定义气泡</span>';
        html += '            <span class="theme-home-desc">调整聊天气泡、头像、时间戳、预设和预览。</span>';
        html += '          </span>';
        html += '          <span class="theme-home-arrow">›</span>';
        html += '        </button>';
        html += '      </div>';
        html += '      <div class="theme-studio-page" data-theme-page="global" hidden>';
        html += '      <div class="theme-card theme-card-global-css">';
        html += '        <div class="theme-card-title">全局美化 CSS</div>';
        html += '        <textarea id="theme-global-css" class="theme-css-textarea" placeholder="这里的 CSS 会直接作用于全局（聊天室顶部栏、底部栏等都可以写）。"></textarea>';
        html += '        <div class="theme-global-css-actions">';
        html += '          <button type="button" class="theme-mini-btn" data-theme-action="save-global-css-preset">保存 CSS 为预设</button>';
        html += '          <button type="button" class="theme-mini-btn" data-theme-action="import-global-css-file">导入文件</button>';
        html += '        </div>';
        html += '        <input type="file" id="theme-global-css-file" class="theme-css-file-input" accept=".txt,.css,.doc,.docx,text/plain,text/css,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document">';
        html += '        <div class="theme-css-file-note">支持 txt/css 直接导入；doc/docx 会尝试读取其中的文本内容。</div>';
        html += '        <div class="theme-global-css-presets">';
        html += '          <div class="theme-card-title theme-card-title-row theme-css-preset-title">';
        html += '            <span>全局 CSS 预设</span>';
        html += '            <span class="theme-subtle" id="theme-global-css-preset-count">0</span>';
        html += '          </div>';
        html += '          <div id="theme-global-css-preset-list" class="theme-css-preset-list"></div>';
        html += '        </div>';
        html += '      </div>';
        html += '      </div>';
        html += '      <div class="theme-studio-page" data-theme-page="bubble" hidden>';
        html += '      <div class="theme-card theme-card-top">';
        html += '        <div class="theme-card-title">气泡设置</div>';
        html += '        <div class="theme-row">';
        html += '          <div class="theme-label">AI 气泡颜色</div>';
        html += '          <input type="color" id="theme-ai-color" class="theme-color-input" value="#ffffff">';
        html += '        </div>';
        html += '        <div class="theme-row">';
        html += '          <div class="theme-label">用户气泡颜色</div>';
        html += '          <input type="color" id="theme-user-color" class="theme-color-input" value="#c49c99">';
        html += '        </div>';
        html += '        <div class="theme-row">';
        html += '          <div class="theme-label">气泡小尾巴</div>';
        html += '          <label class="theme-switch"><input type="checkbox" id="theme-tail-visible"><span class="theme-switch-ui"></span></label>';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">小尾巴上下</div>';
        html += '          <input type="range" id="theme-tail-top" class="theme-range" min="0" max="28" value="14">';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">小尾巴细长程度</div>';
        html += '          <input type="range" id="theme-tail-slim" class="theme-range" min="0" max="100" value="0">';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">气泡高度</div>';
        html += '          <input type="range" id="theme-bubble-compact" class="theme-range" min="0" max="100" value="0">';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">质感</div>';
        html += '          <div class="theme-seg" id="theme-texture-seg">';
        html += '            <button type="button" class="theme-seg-btn is-active" data-texture="solid">实色</button>';
        html += '            <button type="button" class="theme-seg-btn" data-texture="outline">线框</button>';
        html += '            <button type="button" class="theme-seg-btn" data-texture="matte">磨砂</button>';
        html += '            <button type="button" class="theme-seg-btn" data-texture="glass">毛玻璃</button>';
        html += '            <button type="button" class="theme-seg-btn" data-texture="transparent">透明</button>';
        html += '            <button type="button" class="theme-seg-btn" data-texture="gradient">渐变</button>';
        html += '          </div>';
        html += '        </div>';
        html += '        <div class="theme-row">';
        html += '          <div class="theme-label"> 合并气泡</div>';
        html += '          <label class="theme-switch"><input type="checkbox" id="theme-kkt-merge"><span class="theme-switch-ui"></span></label>';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col" id="theme-kkt-merge-mode-row" style="display:none;">';
        html += '          <div class="theme-label">合并模式</div>';
        html += '          <div class="theme-seg" id="theme-kkt-merge-mode-seg">';
        html += '            <button type="button" class="theme-seg-btn is-active" data-merge-mode="first">头像在第一条</button>';
        html += '            <button type="button" class="theme-seg-btn" data-merge-mode="last">头像在最后一条</button>';
        html += '          </div>';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">阴影强度</div>';
        html += '          <input type="range" id="theme-shadow" class="theme-range" min="0" max="24" value="8">';
        html += '        </div>';
        html += '        <div class="theme-radius-block">';
        html += '          <div class="theme-radius-head">';
        html += '            <div class="theme-label">AI 圆角</div>';
        html += '            <button type="button" class="theme-mini-btn" id="theme-copy-to-user">复制到自己</button>';
        html += '          </div>';
        html += '          <div class="theme-radius-grid">';
        html += '            <div class="theme-radius-item"><div class="theme-radius-name">左上</div><input type="range" min="0" max="30" value="12" class="theme-range theme-radius-range" data-radius-target="ai" data-corner="tl"></div>';
        html += '            <div class="theme-radius-item"><div class="theme-radius-name">右上</div><input type="range" min="0" max="30" value="12" class="theme-range theme-radius-range" data-radius-target="ai" data-corner="tr"></div>';
        html += '            <div class="theme-radius-item"><div class="theme-radius-name">左下</div><input type="range" min="0" max="30" value="6" class="theme-range theme-radius-range" data-radius-target="ai" data-corner="bl"></div>';
        html += '            <div class="theme-radius-item"><div class="theme-radius-name">右下</div><input type="range" min="0" max="30" value="12" class="theme-range theme-radius-range" data-radius-target="ai" data-corner="br"></div>';
        html += '          </div>';
        html += '          <div class="theme-user-radius" id="theme-user-radius" style="display:none;">';
        html += '            <div class="theme-label">User 圆角</div>';
        html += '            <div class="theme-radius-grid">';
        html += '              <div class="theme-radius-item"><div class="theme-radius-name">左上</div><input type="range" min="0" max="30" value="12" class="theme-range theme-radius-range" data-radius-target="user" data-corner="tl"></div>';
        html += '              <div class="theme-radius-item"><div class="theme-radius-name">右上</div><input type="range" min="0" max="30" value="12" class="theme-range theme-radius-range" data-radius-target="user" data-corner="tr"></div>';
        html += '              <div class="theme-radius-item"><div class="theme-radius-name">左下</div><input type="range" min="0" max="30" value="12" class="theme-range theme-radius-range" data-radius-target="user" data-corner="bl"></div>';
        html += '              <div class="theme-radius-item"><div class="theme-radius-name">右下</div><input type="range" min="0" max="30" value="6" class="theme-range theme-radius-range" data-radius-target="user" data-corner="br"></div>';
        html += '            </div>';
        html += '          </div>';
        html += '        </div>';
        html += '      </div>';
        html += '      <div class="theme-card theme-card-bottom">';
        html += '        <div class="theme-card-title">头像设置</div>';
        html += '        <div class="theme-row">';
        html += '          <div class="theme-label">显示头像</div>';
        html += '          <label class="theme-switch"><input type="checkbox" id="theme-avatar-visible" checked><span class="theme-switch-ui"></span></label>';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">头像形状</div>';
        html += '          <div class="theme-seg" id="theme-avatar-shape-seg">';
        html += '            <button type="button" class="theme-seg-btn is-active" data-shape="circle">圆形</button>';
        html += '            <button type="button" class="theme-seg-btn" data-shape="squircle">方圆</button>';
        html += '            <button type="button" class="theme-seg-btn" data-shape="square">方形</button>';
        html += '          </div>';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">头像大小</div>';
        html += '          <input type="range" id="theme-avatar-size" class="theme-range" min="24" max="50" value="40">';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">头像与气泡间距</div>';
        html += '          <input type="range" id="theme-avatar-gap" class="theme-range" min="0" max="24" value="4">';
        html += '        </div>';
        html += '        <div class="theme-row">';
        html += '          <div class="theme-label">显示时间戳</div>';
        html += '          <label class="theme-switch"><input type="checkbox" id="theme-timestamp-visible" checked><span class="theme-switch-ui"></span></label>';
        html += '        </div>';
        html += '        <div class="theme-row theme-row-col">';
        html += '          <div class="theme-label">时间戳位置</div>';
        html += '          <div class="theme-seg" id="theme-timestamp-pos">';
        html += '            <button type="button" class="theme-seg-btn is-active" data-tspos="avatar">头像下</button>';
        html += '            <button type="button" class="theme-seg-btn" data-tspos="bubbleRight">气泡右边</button>';
        html += '            <button type="button" class="theme-seg-btn" data-tspos="off">关闭</button>';
        html += '          </div>';
        html += '        </div>';
        html += '        <div class="theme-row">';
        html += '          <div class="theme-label">显示已读</div>';
        html += '          <label class="theme-switch"><input type="checkbox" id="theme-read-visible" checked><span class="theme-switch-ui"></span></label>';
        html += '        </div>';
        html += '      </div>';
        html += '      <div class="theme-card theme-card-presets">';
        html += '        <div class="theme-card-title theme-card-title-row">';
        html += '          <span>我的预设</span>';
        html += '          <span class="theme-subtle" id="theme-preset-count">0</span>';
        html += '        </div>';
        html += '        <div id="theme-preset-list" class="theme-preset-list"></div>';
        html += '      </div>';
        html += '      <div class="theme-card theme-card-bubble-css">';
        html += '        <div class="theme-card-title theme-card-title-row">';
        html += '          <span>气泡 CSS 代码</span>';
        html += '          <button type="button" class="theme-mini-btn" data-theme-action="copy-bubble-css">复制代码</button>';
        html += '        </div>';
        html += '        <textarea id="theme-bubble-css-output" class="theme-css-textarea theme-bubble-css-output" readonly spellcheck="false"></textarea>';
        html += '        <div class="theme-css-file-note">这段代码只接管聊天气泡、头像、时间戳和已读样式，不会写入全局美化。</div>';
        html += '      </div>';
        html += '      <div class="theme-card theme-card-reset">';
        html += '        <div class="theme-card-title">恢复系统默认</div>';
        html += '        <button type="button" class="theme-danger-btn" data-theme-action="reset">恢复系统初始外观</button>';
        html += '      </div>';
        html += '      </div>';
        html += '      </div>';
        html += '      <div class="theme-preview-dock" data-theme-preview-dock>';
        html += '        <div class="theme-preview-float-handle" data-theme-preview-drag>';
        html += '          <span id="theme-preview-title">预览</span>';
        html += '          <span class="theme-preview-float-tip">拖动</span>';
        html += '        </div>';
        html += '        <div class="theme-preview-shell">';
        html += '          <div class="theme-global-preview-box" id="theme-global-preview-box">';
        html += '            <iframe id="theme-global-preview-frame" class="theme-global-preview-frame" title="全局美化预览"></iframe>';
        html += '          </div>';
        html += '          <div class="theme-preview-box theme-bubble-preview-box" id="theme-preview-box" data-preview-avatar="1" data-kkt="0" data-tail="0" data-ts="1" data-tspos="avatar" data-read="1">';
        html += '            <div class="theme-preview-inner">';
        html += '              <div class="msg-row msg-left">';
        html += '                <div class="msg-avatar-wrap">';
        html += '                  <div class="msg-avatar"><img id="theme-preview-ai-avatar" src="assets/chushitouxiang.jpg" alt=""></div>';
        html += '                  <div class="msg-avatar-time">12:34</div>';
        html += '                </div>';
        html += '                <div class="msg-content-wrapper">';
        html += '                  <div class="msg-bubble">';
        html += '                    <span class="msg-text">今天也想把聊天气泡弄得更温柔一点。</span>';
        html += '                    <div class="msg-bubble-time">12:34</div>';
        html += '                  </div>';
        html += '                </div>';
        html += '              </div>';
        html += '              <div class="msg-row msg-left">';
        html += '                <div class="msg-avatar-wrap">';
        html += '                  <div class="msg-avatar"><img src="assets/chushitouxiang.jpg" alt=""></div>';
        html += '                  <div class="msg-avatar-time">12:35</div>';
        html += '                </div>';
        html += '                <div class="msg-content-wrapper">';
        html += '                  <div class="msg-bubble">';
        html += '                    <span class="msg-text">你喜欢韩系简约还是更偏奶油感？</span>';
        html += '                    <div class="msg-bubble-time">12:35</div>';
        html += '                  </div>';
        html += '                </div>';
        html += '              </div>';
        html += '              <div class="msg-row msg-right">';
        html += '                <div class="msg-avatar-wrap">';
        html += '                  <div class="msg-avatar"><img id="theme-preview-user-avatar" src="assets/chushitouxiang.jpg" alt=""></div>';
        html += '                  <div class="msg-avatar-time">12:36</div>';
        html += '                </div>';
        html += '                <div class="msg-content-wrapper">';
        html += '                  <div class="msg-bubble">';
        html += '                    <span class="msg-text">就要低饱和、很干净那种。</span>';
        html += '                    <div class="msg-bubble-time">12:36</div>';
        html += '                  </div>';
        html += '                  <div class="msg-status-text">已读</div>';
        html += '                </div>';
        html += '              </div>';
        html += '            </div>';
        html += '          </div>';
        html += '        </div>';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';
        html += '';
        return html;
    }

    function readGlobalBeautifyCss() {
        try {
            return String(localStorage.getItem(GLOBAL_BEAUTIFY_CSS_KEY) || '');
        } catch (e) {
            return '';
        }
    }

    function applyGlobalBeautifyCss(cssText) {
        var trimmed = String(cssText || '').trim();
        var el = document.getElementById(GLOBAL_BEAUTIFY_STYLE_ID);
        if (!trimmed) {
            if (el && el.parentNode) el.parentNode.removeChild(el);
            return;
        }
        if (!el) {
            el = document.createElement('style');
            el.id = GLOBAL_BEAUTIFY_STYLE_ID;
            document.head.appendChild(el);
        }
        el.textContent = trimmed;
    }

    function writeGlobalBeautifyCss(cssText) {
        try {
            localStorage.setItem(GLOBAL_BEAUTIFY_CSS_KEY, String(cssText || ''));
        } catch (e) { }
        applyGlobalBeautifyCss(cssText);
    }

    function escapeStyleText(cssText) {
        return String(cssText || '').replace(/<\/style/gi, '<\\/style');
    }

    function buildGlobalPreviewDoc(cssText) {
        var baseCss = [
            'html,body{margin:0;width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f4f1ee;color:#1b1b1b;}',
            '.preview-root{width:100%;height:100%;box-sizing:border-box;padding:10px;background:linear-gradient(135deg,#f8f7f5,#ece8e4);}',
            '#chat-room-layer,.chat-room-layer{height:100%;display:flex;flex-direction:column;overflow:hidden;border-radius:8px;background:#f7f7f7;border:1px solid rgba(0,0,0,.08);box-shadow:0 8px 20px rgba(0,0,0,.08);}',
            '.chat-room-header{height:36px;display:flex;align-items:center;gap:8px;padding:0 10px;background:rgba(255,255,255,.86);border-bottom:1px solid rgba(0,0,0,.06);box-sizing:border-box;}',
            '.chat-back{font-size:20px;color:#333;line-height:1;}',
            '.chat-title{font-size:13px;font-weight:750;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '#chat-history,.chat-history,.chat-room-body{flex:1;min-height:0;padding:10px;box-sizing:border-box;overflow:hidden;background:rgba(255,255,255,.34);}',
            '.msg-row{display:flex;align-items:flex-start;gap:6px;margin-bottom:8px;}',
            '.msg-row.msg-right{flex-direction:row-reverse;}',
            '.msg-avatar{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#dad5cf,#aaa19a);flex:0 0 auto;}',
            '.msg-content-wrapper{max-width:68%;display:flex;flex-direction:column;align-items:flex-start;}',
            '.msg-right .msg-content-wrapper{align-items:flex-end;}',
            '.msg-bubble{font-size:11px;line-height:1.35;padding:6px 8px;border-radius:10px;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.06);box-sizing:border-box;}',
            '.msg-right .msg-bubble{background:#c49c99;color:#fff;}',
            '.chat-input-area,.chat-room-input{height:38px;display:flex;align-items:center;gap:7px;padding:6px 10px;background:rgba(255,255,255,.9);border-top:1px solid rgba(0,0,0,.06);box-sizing:border-box;}',
            '.chat-input{height:24px;flex:1;border-radius:999px;background:#f1efed;}',
            '.chat-tool{width:20px;height:20px;border-radius:50%;background:#d7d2cd;}'
        ].join('\n');
        return '<!doctype html><html><head><meta charset="utf-8"><style>' + baseCss + '</style><style id="global-preview-css">' + escapeStyleText(cssText) + '</style></head><body>' +
            '<div class="preview-root">' +
            '<div id="chat-room-layer" class="chat-room-layer">' +
            '<div class="chat-room-header"><div class="chat-back">‹</div><div class="chat-title">全局美化预览</div></div>' +
            '<div id="chat-history" class="chat-history chat-room-body">' +
            '<div class="msg-row msg-left"><div class="msg-avatar"></div><div class="msg-content-wrapper"><div class="msg-bubble">顶部栏、背景、底部栏都会在这里看一眼。</div></div></div>' +
            '<div class="msg-row msg-right"><div class="msg-avatar"></div><div class="msg-content-wrapper"><div class="msg-bubble">点击预设会立刻换预览。</div></div></div>' +
            '</div>' +
            '<div class="chat-input-area chat-room-input"><div class="chat-tool"></div><div class="chat-input"></div><div class="chat-tool"></div></div>' +
            '</div>' +
            '</div>' +
            '</body></html>';
    }

    function syncGlobalCssPreview(container, cssText) {
        var frame = container ? container.querySelector('#theme-global-preview-frame') : null;
        if (!frame) return;
        frame.srcdoc = buildGlobalPreviewDoc(cssText);
    }

    function showThemeNotice(text) {
        var msg = String(text || '').trim();
        if (!msg) return;
        if (window.GlobalModal && typeof window.GlobalModal.showError === 'function') {
            window.GlobalModal.showError(msg);
        } else {
            alert(msg);
        }
    }

    function readGlobalCssPresets() {
        var list = safeParseJson(localStorage.getItem(GLOBAL_BEAUTIFY_CSS_PRESETS_KEY), []);
        if (!Array.isArray(list)) return [];
        return list.map(function (item) {
            if (!item || typeof item !== 'object') return null;
            var css = String(item.css || '');
            if (!css.trim()) return null;
            return {
                id: String(item.id || ('css_' + Date.now())),
                name: String(item.name || '未命名 CSS'),
                css: css,
                createdAt: item.createdAt || Date.now(),
                updatedAt: item.updatedAt || item.createdAt || Date.now()
            };
        }).filter(Boolean);
    }

    function findGlobalCssPresetById(presetId) {
        var pid = String(presetId || '').trim();
        if (!pid) return null;
        var presets = readGlobalCssPresets();
        for (var i = 0; i < presets.length; i++) {
            var preset = presets[i];
            if (preset && String(preset.id || '') === pid) return preset;
        }
        return null;
    }

    function writeGlobalCssPresets(list) {
        try {
            localStorage.setItem(GLOBAL_BEAUTIFY_CSS_PRESETS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
        } catch (e) { }
    }

    function renderGlobalCssPresetList(container) {
        var listEl = container.querySelector('#theme-global-css-preset-list');
        var countEl = container.querySelector('#theme-global-css-preset-count');
        if (!listEl) return;
        var presets = readGlobalCssPresets();
        var previewId = String(themeStudioRuntime.globalCssPreviewPresetId || '').trim();
        if (countEl) countEl.textContent = String(presets.length);
        if (!presets.length) {
            listEl.innerHTML = '<div class="theme-empty">暂无 CSS 预设。</div>';
            return;
        }
        var html = '';
        presets.forEach(function (preset) {
            var css = String(preset.css || '').replace(/\s+/g, ' ').trim();
            if (css.length > 88) css = css.slice(0, 88) + '...';
            var previewingClass = previewId && previewId === String(preset.id || '') ? ' is-previewing' : '';
            html += '<div class="theme-css-preset-card' + previewingClass + '" data-css-preset-id="' + escapeHtml(preset.id) + '">';
            html += '  <div class="theme-preset-main">';
            html += '    <div class="theme-preset-name">' + escapeHtml(preset.name) + '</div>';
            html += '    <div class="theme-preset-meta">' + escapeHtml(css || '空 CSS') + '</div>';
            html += '  </div>';
            html += '  <button type="button" class="theme-preset-apply" data-css-preset-action="apply">应用</button>';
            html += '  <button type="button" class="theme-preset-apply danger" data-css-preset-action="delete">删除</button>';
            html += '</div>';
        });
        listEl.innerHTML = html;
    }

    function syncGlobalCssPreviewFromInput(container) {
        var input = container ? container.querySelector('#theme-global-css') : null;
        var hadPreviewPreset = !!String(themeStudioRuntime.globalCssPreviewPresetId || '').trim();
        themeStudioRuntime.globalCssPreviewPresetId = '';
        syncGlobalCssPreview(container, input ? String(input.value || '') : '');
        if (hadPreviewPreset) renderGlobalCssPresetList(container);
    }

    function previewGlobalCssPreset(container, presetId) {
        var target = findGlobalCssPresetById(presetId);
        if (!target) return;
        themeStudioRuntime.globalCssPreviewPresetId = String(target.id || '');
        syncGlobalCssPreview(container, target.css || '');
        renderGlobalCssPresetList(container);
    }

    function saveGlobalCssAsPreset(container) {
        var input = container.querySelector('#theme-global-css');
        var css = input ? String(input.value || '') : '';
        if (!css.trim()) {
            showThemeNotice('请先输入全局 CSS');
            return;
        }
        var defaultName = '全局 CSS ' + new Date().toLocaleString('zh-CN', { hour12: false });
        var name = '';
        try {
            name = window.prompt('给这个全局 CSS 预设起个名字：', defaultName);
        } catch (e) {
            name = defaultName;
        }
        if (name === null) return;
        name = String(name || '').trim();
        if (!name) {
            showThemeNotice('预设名称不能为空');
            return;
        }
        var presets = readGlobalCssPresets();
        presets.unshift({
            id: 'css_' + Date.now().toString(36),
            name: name,
            css: css,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        writeGlobalCssPresets(presets);
        renderGlobalCssPresetList(container);
        showThemeNotice('全局 CSS 预设已保存');
    }

    function applyGlobalCssPreset(container, presetId) {
        var target = findGlobalCssPresetById(presetId);
        if (!target) return;
        var input = container.querySelector('#theme-global-css');
        if (input) input.value = String(target.css || '');
        writeGlobalBeautifyCss(target.css || '');
        themeStudioRuntime.globalCssPreviewPresetId = String(target.id || '');
        syncGlobalCssPreview(container, target.css || '');
        renderGlobalCssPresetList(container);
        showThemeNotice('全局 CSS 预设已应用');
    }

    function deleteGlobalCssPreset(container, presetId) {
        var pid = String(presetId || '').trim();
        if (!pid) return;
        var ok = true;
        try { ok = window.confirm('删除这个全局 CSS 预设？'); } catch (e) { }
        if (!ok) return;
        var next = readGlobalCssPresets().filter(function (preset) {
            return String(preset && preset.id || '') !== pid;
        });
        writeGlobalCssPresets(next);
        if (String(themeStudioRuntime.globalCssPreviewPresetId || '') === pid) {
            syncGlobalCssPreviewFromInput(container);
            return;
        }
        renderGlobalCssPresetList(container);
    }

    function decodeHtmlEntities(text) {
        return String(text || '')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
    }

    function cleanImportedCssText(text) {
        return String(text || '')
            .replace(/\u0000/g, '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .trim();
    }

    function decodeArrayBuffer(buffer, encoding) {
        try {
            return new TextDecoder(encoding || 'utf-8').decode(buffer);
        } catch (e) {
            return '';
        }
    }

    async function inflateRawBytes(bytes) {
        if (!window.DecompressionStream) return null;
        try {
            var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
            var inflated = await new Response(stream).arrayBuffer();
            return new Uint8Array(inflated);
        } catch (e) {
            return null;
        }
    }

    function readUint16(view, offset) {
        return view.getUint16(offset, true);
    }

    function readUint32(view, offset) {
        return view.getUint32(offset, true);
    }

    async function extractDocxText(buffer) {
        var bytes = new Uint8Array(buffer);
        var view = new DataView(buffer);
        var eocd = -1;
        for (var i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
            if (readUint32(view, i) === 0x06054b50) {
                eocd = i;
                break;
            }
        }
        if (eocd < 0) return '';
        var entries = readUint16(view, eocd + 10);
        var cdOffset = readUint32(view, eocd + 16);
        var decoder = new TextDecoder('utf-8');
        var found = null;
        var ptr = cdOffset;
        for (var n = 0; n < entries && ptr < bytes.length; n++) {
            if (readUint32(view, ptr) !== 0x02014b50) break;
            var method = readUint16(view, ptr + 10);
            var compSize = readUint32(view, ptr + 20);
            var nameLen = readUint16(view, ptr + 28);
            var extraLen = readUint16(view, ptr + 30);
            var commentLen = readUint16(view, ptr + 32);
            var localOffset = readUint32(view, ptr + 42);
            var name = decoder.decode(bytes.slice(ptr + 46, ptr + 46 + nameLen));
            if (name === 'word/document.xml') {
                found = { method: method, compSize: compSize, localOffset: localOffset };
                break;
            }
            ptr += 46 + nameLen + extraLen + commentLen;
        }
        if (!found) return '';
        var lp = found.localOffset;
        if (readUint32(view, lp) !== 0x04034b50) return '';
        var localNameLen = readUint16(view, lp + 26);
        var localExtraLen = readUint16(view, lp + 28);
        var dataStart = lp + 30 + localNameLen + localExtraLen;
        var compressed = bytes.slice(dataStart, dataStart + found.compSize);
        var contentBytes = compressed;
        if (found.method === 8) {
            var inflated = await inflateRawBytes(compressed);
            if (!inflated) return '';
            contentBytes = inflated;
        } else if (found.method !== 0) {
            return '';
        }
        var xml = decoder.decode(contentBytes);
        return decodeHtmlEntities(xml
            .replace(/<w:tab\/>/g, '    ')
            .replace(/<\/w:p>/g, '\n')
            .replace(/<[^>]+>/g, ''));
    }

    async function readCssImportFile(file) {
        if (!file) return '';
        var name = String(file.name || '').toLowerCase();
        var buffer = await file.arrayBuffer();
        if (/\.docx$/.test(name)) {
            var docxText = await extractDocxText(buffer);
            return cleanImportedCssText(docxText);
        }
        var utf8 = cleanImportedCssText(decodeArrayBuffer(buffer, 'utf-8'));
        if (/\.doc$/.test(name)) {
            var utf16 = cleanImportedCssText(decodeArrayBuffer(buffer, 'utf-16le'));
            var pick = utf16.length > utf8.length ? utf16 : utf8;
            pick = pick.replace(/[^\S\n]+/g, ' ');
            return cleanImportedCssText(pick);
        }
        return utf8;
    }

    async function importGlobalCssFile(container, file) {
        try {
            var text = await readCssImportFile(file);
            if (!String(text || '').trim()) {
                showThemeNotice('没有读取到可用的 CSS 文本');
                return;
            }
            var input = container.querySelector('#theme-global-css');
            if (input) input.value = text;
            writeGlobalBeautifyCss(text);
            syncGlobalCssPreviewFromInput(container);
            showThemeNotice('全局 CSS 已导入并应用');
        } catch (e) {
            console.error(e);
            showThemeNotice('导入失败：这个文件暂时无法读取');
        }
    }

    function formatTime(ts) {
        var t = typeof ts === 'number' ? ts : parseInt(String(ts || ''), 10);
        if (!t || isNaN(t)) return '';
        var d = new Date(t);
        var now = new Date();
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        if (d.toDateString() === now.toDateString()) {
            return hh + ':' + mm;
        }
        return (d.getMonth() + 1) + '/' + d.getDate();
    }

    var FAVORITES_FILTER_ITEMS = [
        { key: 'all', label: '全部', icon: '★' },
        { key: 'image', label: '图片', icon: '图' },
        { key: 'history', label: '聊天记录', icon: '聊' },
        { key: 'voice', label: '语音', icon: '声' }
    ];

    function escapeHtml(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeFavoritesFilter(filter) {
        var val = String(filter || 'all').trim();
        return /^(all|image|history|voice)$/.test(val) ? val : 'all';
    }

    function getFavoriteTypeLabel(fav) {
        var type = fav && fav.type ? String(fav.type) : 'text';
        if (type === 'image' || type === 'sticker') return '图片';
        if (type === 'history') return '聊天记录';
        if (type === 'voice') return '语音';
        if (type === 'location') return '位置';
        if (type === 'translated_text') return '聊天记录';
        if (type === 'redpacket') return '红包';
        if (type === 'transfer') return '转账';
        if (type === 'family_card') return '亲属卡';
        return '消息';
    }

    function getFavoritePreviewText(fav) {
        var content = fav && fav.content ? String(fav.content) : '';
        content = content.replace(/\s+/g, ' ').trim();
        if (!content) content = '[' + getFavoriteTypeLabel(fav) + ']';
        if (content.length > 88) content = content.slice(0, 88) + '...';
        return content;
    }

    function isFavoriteMatchedByFilter(fav, filter) {
        var current = normalizeFavoritesFilter(filter);
        if (current === 'all') return true;
        var type = fav && fav.type ? String(fav.type) : 'text';
        if (current === 'image') return type === 'image' || type === 'sticker';
        if (current === 'history') return type === 'history' || type === 'text' || type === 'translated_text';
        if (current === 'voice') return type === 'voice';
        return true;
    }

    function getFavoritesList() {
        if (window.getFavorites && typeof window.getFavorites === 'function') {
            return window.getFavorites();
        }
        try {
            var raw = localStorage.getItem('wechat_favorites_v2');
            var parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function toggleFavoritesPanel(container, visible) {
        var panel = container.querySelector('#mine-favorites-panel');
        if (panel) panel.style.display = visible ? 'block' : 'none';
        if (panel && visible && !panel.getAttribute('data-active-filter')) {
            panel.setAttribute('data-active-filter', 'all');
        }
        var header = container.querySelector('.mine-header');
        if (header) header.style.display = visible ? 'none' : '';
        var sections = container.querySelectorAll('.mine-list-section');
        sections.forEach(function (el) {
            el.style.display = visible ? 'none' : '';
        });
    }

    function toggleThemeStudioPanel(container, visible) {
        var panel = container.querySelector('#theme-studio-panel');
        if (panel) panel.style.display = visible ? 'flex' : 'none';
        if (panel) panel.setAttribute('aria-hidden', visible ? 'false' : 'true');
        if (visible) setThemeStudioPage(container, 'home');
        var header = container.querySelector('.mine-header');
        if (header) header.style.display = visible ? 'none' : '';
        var favPanel = container.querySelector('#mine-favorites-panel');
        if (favPanel && visible) favPanel.style.display = 'none';
        var sections = container.querySelectorAll('.mine-list-section');
        sections.forEach(function (el) {
            el.style.display = visible ? 'none' : '';
        });
    }

    function setThemeStudioPage(container, page) {
        var panel = container ? container.querySelector('#theme-studio-panel') : null;
        if (!panel) return;
        var next = String(page || 'home');
        if (next !== 'global' && next !== 'bubble') next = 'home';
        panel.setAttribute('data-theme-current', next);

        var title = panel.querySelector('.theme-studio-title');
        if (title) {
            if (next === 'global') title.textContent = '全局美化';
            else if (next === 'bubble') title.textContent = '自定义气泡';
            else title.textContent = '美化中心';
        }

        var saveBtn = panel.querySelector('.theme-studio-save');
        if (saveBtn) saveBtn.hidden = next !== 'bubble';

        var previewTitle = panel.querySelector('#theme-preview-title');
        if (previewTitle) {
            if (next === 'global') previewTitle.textContent = '全局预览';
            else if (next === 'bubble') previewTitle.textContent = '气泡预览';
            else previewTitle.textContent = '预览';
        }

        var pages = panel.querySelectorAll('[data-theme-page]');
        pages.forEach(function (el) {
            var name = el.getAttribute('data-theme-page') || '';
            el.hidden = name !== next;
        });

        var scroll = panel.querySelector('.theme-studio-scroll');
        if (scroll) {
            try { scroll.scrollTop = 0; } catch (e) { }
        }
        if (next === 'global') {
            if (themeStudioRuntime.globalCssPreviewPresetId) {
                previewGlobalCssPreset(container, themeStudioRuntime.globalCssPreviewPresetId);
            } else {
                syncGlobalCssPreviewFromInput(container);
            }
        }
        syncThemeStudioDockLayout(container);
        syncThemePreviewFloatPosition(container);
    }

    function safeParseJson(raw, fallback) {
        try {
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function clampNumber(v, min, max, fallback) {
        var n = typeof v === 'number' ? v : parseFloat(String(v || ''));
        if (!isFinite(n)) n = fallback;
        n = Math.max(min, Math.min(max, n));
        return n;
    }

    function normalizeHexColor(value, fallback) {
        var s = String(value || '').trim();
        if (!s) return fallback;
        if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
        return fallback;
    }

    function hexToRgb(hex) {
        var h = String(hex || '').replace('#', '');
        if (h.length !== 6) return null;
        var r = parseInt(h.slice(0, 2), 16);
        var g = parseInt(h.slice(2, 4), 16);
        var b = parseInt(h.slice(4, 6), 16);
        if (!isFinite(r) || !isFinite(g) || !isFinite(b)) return null;
        return { r: r, g: g, b: b };
    }

    function mixRgb(a, b, t) {
        var tt = Math.max(0, Math.min(1, t));
        return {
            r: Math.round(a.r + (b.r - a.r) * tt),
            g: Math.round(a.g + (b.g - a.g) * tt),
            b: Math.round(a.b + (b.b - a.b) * tt)
        };
    }

    function rgbToRgba(rgb, a) {
        var alpha = Math.max(0, Math.min(1, a));
        return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
    }

    function setCssVar(el, name, value) {
        try {
            el.style.setProperty(name, String(value || ''));
        } catch (e) { }
    }

    function getDefaultThemeConfig() {
        return {
            aiColor: '#ffffff',
            userColor: '#c49c99',
            texture: 'solid',
            tailEnabled: false,
            tailTop: 14,
            tailSlim: 0,
            tailWidth: 6,
            tailHeight: 6,
            bubbleCompact: 0,
            avatarBubbleGap: 4,
            timestampEnabled: true,
            timestampPos: 'avatar',
            readEnabled: true,
            kktMerge: false,
            kktMergeMode: 'first',
            shadow: 8,
            aiRadius: { tl: 12, tr: 12, bl: 6, br: 12 },
            userRadius: { tl: 12, tr: 12, bl: 12, br: 6 },
            avatarVisible: true,
            avatarShape: 'circle',
            avatarSize: 40
        };
    }

    function normalizeThemeConfig(raw) {
        var base = getDefaultThemeConfig();
        var c = raw && typeof raw === 'object' ? raw : {};

        var legacyAccent = normalizeHexColor(c.accentColor, '');
        base.aiColor = normalizeHexColor(c.aiColor, '') || '#ffffff';
        base.userColor = normalizeHexColor(c.userColor, '') || legacyAccent || base.userColor;

        base.texture = String(c.texture || base.texture);
        if (!/^(solid|outline|matte|glass|transparent|gradient)$/.test(base.texture)) base.texture = 'solid';

        base.tailEnabled = c.tailEnabled === true;
        base.tailTop = clampNumber(c.tailTop, 0, 28, base.tailTop);
        base.tailSlim = clampNumber(c.tailSlim, 0, 100, base.tailSlim);
        base.tailWidth = clampNumber(c.tailWidth, 2, 16, base.tailWidth);
        base.tailHeight = clampNumber(c.tailHeight, 2, 14, base.tailHeight);

        base.bubbleCompact = clampNumber(c.bubbleCompact, 0, 100, base.bubbleCompact);

        base.avatarBubbleGap = clampNumber(c.avatarBubbleGap, 0, 24, base.avatarBubbleGap);

        base.timestampEnabled = c.timestampEnabled !== false;
        base.timestampPos = String(c.timestampPos || base.timestampPos);
        if (base.timestampPos !== 'avatar' && base.timestampPos !== 'bubble' && base.timestampPos !== 'bubbleRight') base.timestampPos = 'avatar';

        base.readEnabled = c.readEnabled !== false;

        base.kktMerge = !!c.kktMerge;
        base.kktMergeMode = String(c.kktMergeMode || 'first');
        if (base.kktMergeMode !== 'first' && base.kktMergeMode !== 'last') base.kktMergeMode = 'first';
        base.shadow = clampNumber(c.shadow, 0, 24, base.shadow);

        base.avatarVisible = c.avatarVisible !== false;
        var shapeVal = String(c.avatarShape || 'circle');
        if (shapeVal === 'squircle' || shapeVal === 'square' || shapeVal === 'circle') {
            base.avatarShape = shapeVal;
        } else {
            base.avatarShape = 'circle';
        }
        base.avatarSize = clampNumber(c.avatarSize, 24, 50, base.avatarSize);

        base.aiRadius = {
            tl: clampNumber(c.aiRadius && c.aiRadius.tl, 0, 30, base.aiRadius.tl),
            tr: clampNumber(c.aiRadius && c.aiRadius.tr, 0, 30, base.aiRadius.tr),
            bl: clampNumber(c.aiRadius && c.aiRadius.bl, 0, 30, base.aiRadius.bl),
            br: clampNumber(c.aiRadius && c.aiRadius.br, 0, 30, base.aiRadius.br)
        };
        base.userRadius = {
            tl: clampNumber(c.userRadius && c.userRadius.tl, 0, 30, base.userRadius.tl),
            tr: clampNumber(c.userRadius && c.userRadius.tr, 0, 30, base.userRadius.tr),
            bl: clampNumber(c.userRadius && c.userRadius.bl, 0, 30, base.userRadius.bl),
            br: clampNumber(c.userRadius && c.userRadius.br, 0, 30, base.userRadius.br)
        };

        return base;
    }

    function readThemePresets() {
        var list = safeParseJson(localStorage.getItem(THEME_STUDIO_KEYS.presets), []);
        return Array.isArray(list) ? list : [];
    }

    function writeThemePresets(list) {
        try {
            localStorage.setItem(THEME_STUDIO_KEYS.presets, JSON.stringify(list || []));
        } catch (e) { }
    }

    function buildBubbleMaterial(texture, rgb, shadowStrength, isAi) {
        var s = clampNumber(shadowStrength, 0, 24, 8);
        var shadowAlpha = Math.max(0, Math.min(0.22, s / 24 * 0.22));
        var shadow = shadowAlpha > 0 ? ('0 10px 26px rgba(0,0,0,' + shadowAlpha.toFixed(3) + ')') : 'none';

        var bg = rgbToRgba(rgb, 1);
        var border = isAi ? '1px solid rgba(0,0,0,0.06)' : 'none';
        var backdrop = 'none';
        var arrow = bg;

        if (texture === 'outline') {
            bg = 'transparent';
            border = '2px solid ' + rgbToRgba(rgb, 0.75);
            arrow = rgbToRgba(rgb, 0.75);
            shadow = 'none';
        } else if (texture === 'matte') {
            bg = rgbToRgba(rgb, 0.22);
            border = '1px solid rgba(255,255,255,0.35)';
            backdrop = 'blur(6px)';
            arrow = bg;
        } else if (texture === 'glass') {
            bg = 'linear-gradient(135deg,' + rgbToRgba(rgb, 0.28) + ',' + rgbToRgba({ r: 255, g: 255, b: 255 }, 0.18) + ')';
            border = '1px solid rgba(255,255,255,0.26)';
            backdrop = 'blur(14px) saturate(1.12)';
            arrow = rgbToRgba(rgb, 0.22);
        } else if (texture === 'transparent') {
            bg = rgbToRgba(rgb, 0.08);
            border = '1px solid rgba(0,0,0,0.06)';
            shadow = 'none';
            arrow = bg;
        } else if (texture === 'gradient') {
            var d1 = rgbToRgba(rgb, 0.95);
            var d2 = rgbToRgba(mixRgb(rgb, { r: 0, g: 0, b: 0 }, 0.08), 0.92);
            bg = 'linear-gradient(135deg,' + d1 + ',' + d2 + ')';
            border = 'none';
            arrow = rgbToRgba(rgb, 0.92);
        }

        return { bg: bg, border: border, backdrop: backdrop, shadow: shadow, arrow: arrow };
    }

    function computeTextColor(rgb) {
        var r = rgb && typeof rgb.r === 'number' ? rgb.r : 0;
        var g = rgb && typeof rgb.g === 'number' ? rgb.g : 0;
        var b = rgb && typeof rgb.b === 'number' ? rgb.b : 0;
        var l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return l < 0.56 ? '#ffffff' : '#000000';
    }

    function buildBubbleCssFromConfig(config) {
        var c = normalizeThemeConfig(config || getDefaultThemeConfig());
        var aiRgb = hexToRgb(normalizeHexColor(c.aiColor, '#ffffff')) || { r: 255, g: 255, b: 255 };
        var userRgb = hexToRgb(normalizeHexColor(c.userColor, '#c49c99')) || { r: 196, g: 156, b: 153 };
        var texture = String(c.texture || 'solid');
        var ai = buildBubbleMaterial(texture, aiRgb, c.shadow, true);
        var user = buildBubbleMaterial(texture, userRgb, c.shadow, false);
        var aiTailFill = texture === 'outline' ? 'var(--chat-bubble-tail-mask, #ededed)' : ai.bg;
        var userTailFill = texture === 'outline' ? 'var(--chat-bubble-tail-mask, #ededed)' : user.bg;
        var avatarSize = clampNumber(c.avatarSize, 24, 50, 40);
        var avatarRadius = '50%';
        if (c.avatarShape === 'squircle') {
            avatarRadius = '35%';
        } else if (c.avatarShape === 'square') {
            avatarRadius = '6px';
        }
        var avatarGap = clampNumber(c.avatarBubbleGap, 0, 24, 4);
        var slim = clampNumber(c.tailSlim, 0, 100, 0);
        var tailWidth = clampNumber(6 + (slim / 100) * 10, 2, 16, 6);
        var tailHeight = 6;
        var compact = clampNumber(c.bubbleCompact, 0, 100, 0);
        var padY = clampNumber(9 - (compact / 100) * 5, 4, 9, 9);
        var lineHeight = Math.max(1.18, 1.5 - (compact / 100) * 0.28);
        var out = [];

        out.push('/* 自定义气泡 CSS */');
        out.push('#chat-room-layer {');
        out.push('  --chat-ai-bubble-bg: ' + ai.bg + ';');
        out.push('  --chat-ai-bubble-border: ' + ai.border + ';');
        out.push('  --chat-ai-bubble-backdrop: ' + ai.backdrop + ';');
        out.push('  --chat-ai-bubble-shadow: ' + ai.shadow + ';');
        out.push('  --chat-ai-bubble-arrow: ' + ai.arrow + ';');
        out.push('  --chat-ai-tail-fill: ' + aiTailFill + ';');
        out.push('  --chat-ai-bubble-color: ' + computeTextColor(aiRgb) + ';');
        out.push('  --chat-user-bubble-bg: ' + user.bg + ';');
        out.push('  --chat-user-bubble-border: ' + user.border + ';');
        out.push('  --chat-user-bubble-backdrop: ' + user.backdrop + ';');
        out.push('  --chat-user-bubble-shadow: ' + user.shadow + ';');
        out.push('  --chat-user-bubble-arrow: ' + user.arrow + ';');
        out.push('  --chat-user-tail-fill: ' + userTailFill + ';');
        out.push('  --chat-user-bubble-color: ' + computeTextColor(userRgb) + ';');
        out.push('  --chat-ai-radius-tl: ' + clampNumber(c.aiRadius && c.aiRadius.tl, 0, 30, 12) + 'px;');
        out.push('  --chat-ai-radius-tr: ' + clampNumber(c.aiRadius && c.aiRadius.tr, 0, 30, 12) + 'px;');
        out.push('  --chat-ai-radius-bl: ' + clampNumber(c.aiRadius && c.aiRadius.bl, 0, 30, 6) + 'px;');
        out.push('  --chat-ai-radius-br: ' + clampNumber(c.aiRadius && c.aiRadius.br, 0, 30, 12) + 'px;');
        out.push('  --chat-user-radius-tl: ' + clampNumber(c.userRadius && c.userRadius.tl, 0, 30, 12) + 'px;');
        out.push('  --chat-user-radius-tr: ' + clampNumber(c.userRadius && c.userRadius.tr, 0, 30, 12) + 'px;');
        out.push('  --chat-user-radius-bl: ' + clampNumber(c.userRadius && c.userRadius.bl, 0, 30, 12) + 'px;');
        out.push('  --chat-user-radius-br: ' + clampNumber(c.userRadius && c.userRadius.br, 0, 30, 6) + 'px;');
        out.push('  --chat-avatar-size: ' + avatarSize + 'px;');
        out.push('  --chat-avatar-radius: ' + avatarRadius + ';');
        out.push('  --chat-avatar-bubble-gap: ' + avatarGap + 'px;');
        out.push('  --chat-tail-top: ' + clampNumber(c.tailTop, 0, 28, 14) + 'px;');
        out.push('  --chat-tail-width: ' + tailWidth + 'px;');
        out.push('  --chat-tail-height: ' + tailHeight + 'px;');
        out.push('  --chat-bubble-pad-y: ' + padY.toFixed(2) + 'px;');
        out.push('  --chat-bubble-line-height: ' + lineHeight.toFixed(3) + ';');
        out.push('}');
        out.push('');
        out.push('#chat-room-layer .msg-row.msg-plain-bubble .msg-content-wrapper .msg-bubble,');
        out.push('#chat-room-layer .msg-row.msg-plain-bubble .msg-bubble {');
        out.push('  padding: calc(var(--chat-bubble-pad-y) * var(--chat-font-scale, 1)) calc(12px * var(--chat-font-scale, 1)) !important;');
        out.push('  line-height: var(--chat-bubble-line-height) !important;');
        out.push('  overflow: visible !important;');
        out.push('}');
        out.push('');
        out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-left .msg-content-wrapper .msg-bubble,');
        out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-left .msg-bubble {');
        out.push('  background: var(--chat-ai-bubble-bg) !important;');
        out.push('  color: var(--chat-ai-bubble-color) !important;');
        out.push('  border: var(--chat-ai-bubble-border) !important;');
        out.push('  box-shadow: var(--chat-ai-bubble-shadow) !important;');
        out.push('  backdrop-filter: var(--chat-ai-bubble-backdrop) !important;');
        out.push('  -webkit-backdrop-filter: var(--chat-ai-bubble-backdrop) !important;');
        out.push('  border-top-left-radius: calc(var(--chat-ai-radius-tl) * var(--chat-font-scale, 1)) !important;');
        out.push('  border-top-right-radius: calc(var(--chat-ai-radius-tr) * var(--chat-font-scale, 1)) !important;');
        out.push('  border-bottom-left-radius: calc(var(--chat-ai-radius-bl) * var(--chat-font-scale, 1)) !important;');
        out.push('  border-bottom-right-radius: calc(var(--chat-ai-radius-br) * var(--chat-font-scale, 1)) !important;');
        out.push('  margin-left: var(--chat-avatar-bubble-gap) !important;');
        out.push('}');
        out.push('');
        out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-right .msg-content-wrapper .msg-bubble,');
        out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-right .msg-bubble {');
        out.push('  background: var(--chat-user-bubble-bg) !important;');
        out.push('  color: var(--chat-user-bubble-color) !important;');
        out.push('  border: var(--chat-user-bubble-border) !important;');
        out.push('  box-shadow: var(--chat-user-bubble-shadow) !important;');
        out.push('  backdrop-filter: var(--chat-user-bubble-backdrop) !important;');
        out.push('  -webkit-backdrop-filter: var(--chat-user-bubble-backdrop) !important;');
        out.push('  border-top-left-radius: calc(var(--chat-user-radius-tl) * var(--chat-font-scale, 1)) !important;');
        out.push('  border-top-right-radius: calc(var(--chat-user-radius-tr) * var(--chat-font-scale, 1)) !important;');
        out.push('  border-bottom-left-radius: calc(var(--chat-user-radius-bl) * var(--chat-font-scale, 1)) !important;');
        out.push('  border-bottom-right-radius: calc(var(--chat-user-radius-br) * var(--chat-font-scale, 1)) !important;');
        out.push('  margin-right: var(--chat-avatar-bubble-gap) !important;');
        out.push('}');
        out.push('');
        out.push('#chat-room-layer .msg-avatar {');
        out.push('  width: calc(var(--chat-avatar-size) * var(--chat-font-scale, 1)) !important;');
        out.push('  height: calc(var(--chat-avatar-size) * var(--chat-font-scale, 1)) !important;');
        out.push('  border-radius: var(--chat-avatar-radius) !important;');
        out.push('}');
        if (!c.avatarVisible) {
            out.push('');
            out.push('#chat-room-layer .msg-avatar,');
            out.push('#chat-room-layer .msg-avatar-wrap {');
            out.push('  display: none;');
            out.push('}');
            out.push('');
            out.push('#chat-room-layer .msg-row.msg-plain-bubble .msg-content-wrapper {');
            out.push('  margin-left: 0;');
            out.push('  margin-right: 0;');
            out.push('}');
        }
        out.push('');
        out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-left .msg-content-wrapper .msg-bubble::before,');
        out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-left .msg-bubble::before,');
        out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-right .msg-content-wrapper .msg-bubble::after,');
        out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-right .msg-bubble::after {');
        out.push('  display: none;');
        out.push('  content: none;');
        out.push('}');
        if (c.tailEnabled) {
            out.push('');
            out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-left .msg-content-wrapper .msg-bubble::before,');
            out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-left .msg-bubble::before,');
            out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-right .msg-content-wrapper .msg-bubble::after,');
            out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-right .msg-bubble::after {');
            out.push('  content: "";');
            out.push('  display: block;');
            out.push('  position: absolute;');
            out.push('  top: var(--chat-tail-top);');
            out.push('  width: var(--chat-tail-width);');
            out.push('  height: var(--chat-tail-width);');
            out.push('  transform: rotate(45deg);');
            out.push('  z-index: 1;');
            out.push('}');
            out.push('');
            out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-left .msg-content-wrapper .msg-bubble::before,');
            out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-left .msg-bubble::before {');
            out.push('  left: calc(var(--chat-tail-width) / -2);');
            out.push('  background: var(--chat-ai-tail-fill, var(--chat-ai-bubble-bg));');
            out.push('  border-left: var(--chat-ai-bubble-border);');
            out.push('  border-bottom: var(--chat-ai-bubble-border);');
            out.push('  clip-path: polygon(0 0, 0 100%, 100% 100%);');
            out.push('}');
            out.push('');
            out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-right .msg-content-wrapper .msg-bubble::after,');
            out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-right .msg-bubble::after {');
            out.push('  right: calc(var(--chat-tail-width) / -2);');
            out.push('  background: var(--chat-user-tail-fill, var(--chat-user-bubble-bg));');
            out.push('  border-right: var(--chat-user-bubble-border);');
            out.push('  border-top: var(--chat-user-bubble-border);');
            out.push('  clip-path: polygon(0 0, 100% 0, 100% 100%);');
            out.push('}');
        }
        if (c.kktMerge) {
            out.push('');
            if (c.kktMergeMode === 'last') {
                out.push('body #chat-room-layer .msg-row.msg-left:not(:has(+ .msg-row.msg-left)) .msg-avatar-wrap,');
                out.push('body #chat-room-layer .msg-row.msg-right:not(:has(+ .msg-row.msg-right)) .msg-avatar-wrap {');
                out.push('  opacity: 1 !important;');
                out.push('  visibility: visible !important;');
                out.push('}');
                out.push('body #chat-room-layer .msg-row.msg-left:has(+ .msg-row.msg-left) .msg-avatar-wrap,');
                out.push('body #chat-room-layer .msg-row.msg-right:has(+ .msg-row.msg-right) .msg-avatar-wrap {');
                out.push('  opacity: 0 !important;');
                out.push('  visibility: hidden !important;');
                out.push('}');
                out.push('body #chat-room-layer .msg-row.msg-plain-bubble.msg-left[data-kkt-head="0"] .msg-bubble::before,');
                out.push('body #chat-room-layer .msg-row.msg-plain-bubble.msg-right[data-kkt-head="0"] .msg-bubble::after {');
                out.push('  display: none !important;');
                out.push('}');
            } else {
                out.push('body #chat-room-layer .msg-row.msg-left + .msg-row.msg-left .msg-avatar-wrap,');
                out.push('body #chat-room-layer .msg-row.msg-right + .msg-row.msg-right .msg-avatar-wrap {');
                out.push('  opacity: 0 !important;');
                out.push('  visibility: hidden !important;');
                out.push('}');
                out.push('body #chat-room-layer .msg-row.msg-plain-bubble.msg-left + .msg-row.msg-left .msg-bubble::before,');
                out.push('body #chat-room-layer .msg-row.msg-plain-bubble.msg-right + .msg-row.msg-right .msg-bubble::after {');
                out.push('  display: none !important;');
                out.push('}');
                out.push('body #chat-room-layer .msg-row.msg-left:not(.msg-row.msg-left + .msg-row.msg-left) .msg-avatar-wrap,');
                out.push('body #chat-room-layer .msg-row.msg-right:not(.msg-row.msg-right + .msg-row.msg-right) .msg-avatar-wrap {');
                out.push('  opacity: 1 !important;');
                out.push('  visibility: visible !important;');
                out.push('}');
            }
        }
        if (!c.timestampEnabled) {
            out.push('');
            out.push('body #chat-room-layer[data-chat-ts] .msg-row .msg-avatar-time,');
            out.push('body #chat-room-layer[data-chat-ts] .msg-row .msg-bubble-time {');
            out.push('  display: none !important;');
            out.push('}');
        } else if (c.timestampPos === 'bubble') {
            out.push('');
            out.push('body #chat-room-layer[data-chat-ts] .msg-row.msg-plain-bubble .msg-content-wrapper .msg-bubble-time,');
            out.push('body #chat-room-layer[data-chat-ts] .msg-row.msg-plain-bubble .msg-bubble-time {');
            out.push('  display: block !important;');
            out.push('}');
        } else if (c.timestampPos === 'bubbleRight') {
            out.push('');
            out.push('body #chat-room-layer[data-chat-ts] .msg-row .msg-avatar-time,');
            out.push('body #chat-room-layer[data-chat-tspos] .msg-row .msg-avatar-time {');
            out.push('  display: none !important;');
            out.push('}');
            out.push('body #chat-room-layer[data-chat-ts] .msg-row.msg-plain-bubble .msg-content-wrapper .msg-bubble-time,');
            out.push('body #chat-room-layer[data-chat-ts] .msg-row.msg-plain-bubble .msg-bubble-time {');
            out.push('  display: block !important;');
            out.push('  position: absolute !important;');
            out.push('  right: calc(-46px * var(--chat-font-scale, 1)) !important;');
            out.push('  left: auto !important;');
            out.push('  bottom: calc(2px * var(--chat-font-scale, 1)) !important;');
            out.push('  font-size: calc(10px * var(--chat-font-scale, 1)) !important;');
            out.push('  color: rgba(153, 153, 153, 0.96) !important;');
            out.push('  white-space: nowrap !important;');
            out.push('  animation: chatThemeTimestampSlide 0.6s ease-out both;');
            out.push('}');
            out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-right .msg-content-wrapper .msg-bubble-time,');
            out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-right .msg-bubble-time {');
            out.push('  right: auto !important;');
            out.push('  left: calc(-46px * var(--chat-font-scale, 1)) !important;');
            out.push('  text-align: right !important;');
            out.push('}');
            out.push('#chat-room-layer .msg-row.msg-plain-bubble.msg-right:has(+ .msg-row.msg-right) .msg-bubble-time {');
            out.push('  display: block !important;');
            out.push('}');
            out.push('@keyframes chatThemeTimestampSlide {');
            out.push('  from { opacity: 0; transform: translateY(6px); }');
            out.push('  to { opacity: 1; transform: translateY(0); }');
            out.push('}');
        }
        if (!c.readEnabled) {
            out.push('');
            out.push('body #chat-room-layer .msg-status-text,');
            out.push('body #chat-room-layer .msg-row.msg-plain-bubble .msg-status-text,');
            out.push('body #chat-room-layer .msg-row.msg-plain-bubble.msg-right:has(+ .msg-row.msg-right) .msg-status-text {');
            out.push('  display: none !important;');
            out.push('}');
        }
        if (c.kktMerge) {
            out.push('');
            out.push('body #chat-room-layer .msg-row.msg-left.msg-plain-bubble[data-kkt-not-last="1"] .msg-bubble-time,');
            out.push('body #chat-room-layer .msg-row.msg-right.msg-plain-bubble[data-kkt-not-last="1"] .msg-bubble-time {');
            out.push('  display: none !important;');
            out.push('}');
        }
        return out.join('\n');
    }

    function syncBubbleCssOutput(container) {
        var output = container ? container.querySelector('#theme-bubble-css-output') : null;
        if (!output) return;
        output.value = buildBubbleCssFromConfig(themeStudioRuntime.config || getDefaultThemeConfig());
    }

    function copyBubbleCssOutput(container) {
        var output = container ? container.querySelector('#theme-bubble-css-output') : null;
        if (!output) return;
        syncBubbleCssOutput(container);
        var text = String(output.value || '');
        var fallbackCopy = function () {
            try {
                output.focus();
                output.select();
                document.execCommand('copy');
                showThemeNotice('气泡 CSS 已复制');
            } catch (e) {
                showThemeNotice('复制失败，请手动选择代码');
            }
        };
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(text).then(function () {
                showThemeNotice('气泡 CSS 已复制');
            }).catch(fallbackCopy);
        } else {
            fallbackCopy();
        }
    }

    function applyPreviewThemeConfig(container, config) {
        var box = container.querySelector('#theme-preview-box');
        if (!box) return;

        var aiRgb = hexToRgb(normalizeHexColor(config.aiColor, '#ffffff')) || { r: 255, g: 255, b: 255 };
        var userRgb = hexToRgb(normalizeHexColor(config.userColor, '#c49c99')) || { r: 196, g: 156, b: 153 };

        var texture = String(config.texture || 'solid');
        var ai = buildBubbleMaterial(texture, aiRgb, config.shadow, true);
        var user = buildBubbleMaterial(texture, userRgb, config.shadow, false);
        var aiTailFill = texture === 'outline' ? '#ffffff' : ai.bg;
        var userTailFill = texture === 'outline' ? '#ffffff' : user.bg;

        setCssVar(box, '--preview-ai-bg', ai.bg);
        setCssVar(box, '--preview-ai-border', ai.border);
        setCssVar(box, '--preview-ai-backdrop', ai.backdrop);
        setCssVar(box, '--preview-ai-shadow', ai.shadow);
        setCssVar(box, '--preview-ai-arrow', ai.arrow);
        setCssVar(box, '--preview-ai-tail-fill', aiTailFill);
        setCssVar(box, '--preview-ai-color', computeTextColor(aiRgb));

        setCssVar(box, '--preview-user-bg', user.bg);
        setCssVar(box, '--preview-user-border', user.border);
        setCssVar(box, '--preview-user-backdrop', user.backdrop);
        setCssVar(box, '--preview-user-shadow', user.shadow);
        setCssVar(box, '--preview-user-arrow', user.arrow);
        setCssVar(box, '--preview-user-tail-fill', userTailFill);
        setCssVar(box, '--preview-user-color', computeTextColor(userRgb));

        setCssVar(box, '--preview-ai-radius-tl', clampNumber(config.aiRadius && config.aiRadius.tl, 0, 30, 12) + 'px');
        setCssVar(box, '--preview-ai-radius-tr', clampNumber(config.aiRadius && config.aiRadius.tr, 0, 30, 12) + 'px');
        setCssVar(box, '--preview-ai-radius-bl', clampNumber(config.aiRadius && config.aiRadius.bl, 0, 30, 6) + 'px');
        setCssVar(box, '--preview-ai-radius-br', clampNumber(config.aiRadius && config.aiRadius.br, 0, 30, 12) + 'px');
        setCssVar(box, '--preview-user-radius-tl', clampNumber(config.userRadius && config.userRadius.tl, 0, 30, 12) + 'px');
        setCssVar(box, '--preview-user-radius-tr', clampNumber(config.userRadius && config.userRadius.tr, 0, 30, 12) + 'px');
        setCssVar(box, '--preview-user-radius-bl', clampNumber(config.userRadius && config.userRadius.bl, 0, 30, 12) + 'px');
        setCssVar(box, '--preview-user-radius-br', clampNumber(config.userRadius && config.userRadius.br, 0, 30, 6) + 'px');

        var avatarSize = clampNumber(config.avatarSize, 24, 50, 40);
        setCssVar(box, '--preview-avatar-size', avatarSize + 'px');
        var avatarRadius = '50%';
        if (config.avatarShape === 'squircle') {
            avatarRadius = '35%';
        } else if (config.avatarShape === 'square') {
            avatarRadius = '6px';
        }
        setCssVar(box, '--preview-avatar-radius', avatarRadius);
        setCssVar(box, '--preview-avatar-gap', clampNumber(config.avatarBubbleGap, 0, 24, 4) + 'px');

        var slim = clampNumber(config.tailSlim, 0, 100, 0);
        var w = clampNumber(6 + (slim / 100) * 10, 2, 16, 6);
        var h = 6;
        config.tailWidth = w;
        config.tailHeight = h;

        setCssVar(box, '--preview-tail-top', clampNumber(config.tailTop, 0, 28, 14) + 'px');
        setCssVar(box, '--preview-tail-width', clampNumber(config.tailWidth, 2, 16, 6) + 'px');
        setCssVar(box, '--preview-tail-height', clampNumber(config.tailHeight, 2, 14, 6) + 'px');

        var compact = clampNumber(config.bubbleCompact, 0, 100, 0);
        var padY = clampNumber(9 - (compact / 100) * 5, 4, 9, 9);
        var lh = Math.max(1.18, 1.5 - (compact / 100) * 0.28);
        setCssVar(box, '--preview-bubble-pad-y', padY.toFixed(2) + 'px');
        setCssVar(box, '--preview-bubble-line-height', lh.toFixed(3));

        box.setAttribute('data-preview-avatar', config.avatarVisible ? '1' : '0');
        box.setAttribute('data-kkt', config.kktMerge ? String(config.kktMergeMode || 'first') : '0');
        box.setAttribute('data-tail', config.tailEnabled ? '1' : '0');
        box.setAttribute('data-ts', config.timestampEnabled ? '1' : '0');
        box.setAttribute('data-tspos', String(config.timestampPos || 'avatar'));
        box.setAttribute('data-read', config.readEnabled ? '1' : '0');
        syncBubbleCssOutput(container);
    }

    function initThemeStudio(container) {
        if (themeStudioInitialized) return;
        themeStudioInitialized = true;

        themeStudioRuntime.config = normalizeThemeConfig(getDefaultThemeConfig());

        var userAvatar = 'assets/chushitouxiang.jpg';
        try {
            if (window.MineProfile && typeof window.MineProfile.getProfile === 'function') {
                var p = window.MineProfile.getProfile();
                if (p && p.avatar) userAvatar = String(p.avatar);
            }
        } catch (e) { }
        var userAvatarEl = container.querySelector('#theme-preview-user-avatar');
        if (userAvatarEl) userAvatarEl.src = userAvatar;

        var aiColorInput = container.querySelector('#theme-ai-color');
        if (aiColorInput) aiColorInput.value = themeStudioRuntime.config.aiColor;

        var userColorInput = container.querySelector('#theme-user-color');
        if (userColorInput) userColorInput.value = themeStudioRuntime.config.userColor;

        var tailVisibleInput = container.querySelector('#theme-tail-visible');
        if (tailVisibleInput) tailVisibleInput.checked = !!themeStudioRuntime.config.tailEnabled;

        var tailTopInput = container.querySelector('#theme-tail-top');
        if (tailTopInput) tailTopInput.value = String(themeStudioRuntime.config.tailTop);

        var tailSlimInput = container.querySelector('#theme-tail-slim');
        if (tailSlimInput) tailSlimInput.value = String(themeStudioRuntime.config.tailSlim || 0);

        var bubbleCompactInput = container.querySelector('#theme-bubble-compact');
        if (bubbleCompactInput) bubbleCompactInput.value = String(themeStudioRuntime.config.bubbleCompact || 0);

        var kktInput = container.querySelector('#theme-kkt-merge');
        if (kktInput) kktInput.checked = !!themeStudioRuntime.config.kktMerge;

        var kktModeRow = container.querySelector('#theme-kkt-merge-mode-row');
        if (kktModeRow) kktModeRow.style.display = themeStudioRuntime.config.kktMerge ? '' : 'none';
        syncKktMergeModeUI(container, themeStudioRuntime.config.kktMergeMode || 'first');

        var shadowInput = container.querySelector('#theme-shadow');
        if (shadowInput) shadowInput.value = String(themeStudioRuntime.config.shadow);

        var avatarVisibleInput = container.querySelector('#theme-avatar-visible');
        if (avatarVisibleInput) avatarVisibleInput.checked = !!themeStudioRuntime.config.avatarVisible;

        var avatarSizeInput = container.querySelector('#theme-avatar-size');
        if (avatarSizeInput) avatarSizeInput.value = String(themeStudioRuntime.config.avatarSize);

        var avatarGapInput = container.querySelector('#theme-avatar-gap');
        if (avatarGapInput) avatarGapInput.value = String(themeStudioRuntime.config.avatarBubbleGap || 4);

        var tsVisibleInput = container.querySelector('#theme-timestamp-visible');
        if (tsVisibleInput) tsVisibleInput.checked = themeStudioRuntime.config.timestampEnabled !== false;

        syncTimestampPosUI(container, themeStudioRuntime.config.timestampEnabled !== false ? (themeStudioRuntime.config.timestampPos || 'avatar') : 'off');

        var readVisibleInput = container.querySelector('#theme-read-visible');
        if (readVisibleInput) readVisibleInput.checked = themeStudioRuntime.config.readEnabled !== false;

        var globalCssInput = container.querySelector('#theme-global-css');
        if (globalCssInput) {
            globalCssInput.value = readGlobalBeautifyCss();
        }

        applyPreviewThemeConfig(container, themeStudioRuntime.config);
        syncGlobalCssPreview(container, globalCssInput ? String(globalCssInput.value || '') : '');
        renderGlobalCssPresetList(container);
        renderPresetList(container);
        bindThemeStudioEvents(container);
        initThemePreviewFloat(container);
        syncThemeStudioDockLayout(container);
    }

    function syncThemeStudioDockLayout(container) {
        var scroll = container.querySelector('.theme-studio-scroll');
        var dock = container.querySelector('.theme-preview-dock');
        if (!scroll || !dock) return;

        var apply = function () {
            scroll.style.paddingBottom = '';
            syncThemePreviewFloatPosition(container);
        };

        try {
            requestAnimationFrame(function () {
                apply();
                try {
                    setTimeout(apply, 80);
                } catch (e2) { }
            });
        } catch (e) {
            apply();
        }

        if (!container.__themeDockResizeBound) {
            container.__themeDockResizeBound = true;
            try {
                window.addEventListener('resize', apply);
            } catch (e3) { }
        }
    }

    function getThemePreviewViewport() {
        return {
            w: Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1),
            h: Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1)
        };
    }

    function clampThemePreviewFloat(dock, left, top) {
        var vp = getThemePreviewViewport();
        var rect = dock && dock.getBoundingClientRect ? dock.getBoundingClientRect() : null;
        var w = rect && rect.width ? rect.width : (dock ? dock.offsetWidth : 180);
        var h = rect && rect.height ? rect.height : (dock ? dock.offsetHeight : 170);
        var margin = 8;
        var maxLeft = Math.max(margin, vp.w - w - margin);
        var maxTop = Math.max(margin, vp.h - h - margin);
        return {
            left: clampNumber(left, margin, maxLeft, maxLeft),
            top: clampNumber(top, margin, maxTop, maxTop)
        };
    }

    function readThemePreviewFloatPosition() {
        var pos = safeParseJson(localStorage.getItem(THEME_STUDIO_KEYS.previewFloat), null);
        if (!pos || typeof pos !== 'object') return null;
        var left = parseFloat(pos.left);
        var top = parseFloat(pos.top);
        if (!isFinite(left) || !isFinite(top)) return null;
        return { left: left, top: top };
    }

    function writeThemePreviewFloatPosition(pos) {
        if (!pos) return;
        try {
            localStorage.setItem(THEME_STUDIO_KEYS.previewFloat, JSON.stringify({
                left: Math.round(pos.left),
                top: Math.round(pos.top)
            }));
        } catch (e) { }
    }

    function applyThemePreviewFloatPosition(dock, pos) {
        if (!dock || !pos) return;
        var next = clampThemePreviewFloat(dock, pos.left, pos.top);
        dock.style.left = next.left + 'px';
        dock.style.top = next.top + 'px';
        dock.style.right = 'auto';
        dock.style.bottom = 'auto';
    }

    function syncThemePreviewFloatPosition(container) {
        var panel = container ? container.querySelector('#theme-studio-panel') : null;
        var dock = container ? container.querySelector('.theme-preview-dock') : null;
        if (!panel || !dock) return;
        var current = String(panel.getAttribute('data-theme-current') || 'home');
        if (current === 'home') return;

        var apply = function () {
            var saved = readThemePreviewFloatPosition();
            if (saved) {
                applyThemePreviewFloatPosition(dock, saved);
                return;
            }
            if (dock.style.left && dock.style.top) {
                var rect = dock.getBoundingClientRect ? dock.getBoundingClientRect() : null;
                if (rect) applyThemePreviewFloatPosition(dock, { left: rect.left, top: rect.top });
            }
        };

        try {
            requestAnimationFrame(apply);
        } catch (e) {
            apply();
        }
    }

    function initThemePreviewFloat(container) {
        var dock = container ? container.querySelector('.theme-preview-dock') : null;
        if (!dock || dock.__themePreviewFloatBound) return;
        dock.__themePreviewFloatBound = true;

        var active = null;
        var beginDrag = function (e) {
            if (!e) return;
            if (typeof e.button === 'number' && e.button !== 0) return;
            var panel = container.querySelector('#theme-studio-panel');
            if (panel && String(panel.getAttribute('data-theme-current') || 'home') === 'home') return;
            var rect = dock.getBoundingClientRect ? dock.getBoundingClientRect() : null;
            if (!rect || !rect.width || !rect.height) return;
            active = {
                id: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                left: rect.left,
                top: rect.top
            };
            dock.classList.add('is-dragging');
            try { dock.setPointerCapture(e.pointerId); } catch (captureErr) { }
            if (e.preventDefault) e.preventDefault();
        };
        var moveDrag = function (e) {
            if (!active || (typeof e.pointerId !== 'undefined' && e.pointerId !== active.id)) return;
            var next = clampThemePreviewFloat(
                dock,
                active.left + (e.clientX - active.startX),
                active.top + (e.clientY - active.startY)
            );
            dock.style.left = next.left + 'px';
            dock.style.top = next.top + 'px';
            dock.style.right = 'auto';
            dock.style.bottom = 'auto';
            if (e.preventDefault) e.preventDefault();
        };
        var endDrag = function (e) {
            if (!active || (e && typeof e.pointerId !== 'undefined' && e.pointerId !== active.id)) return;
            dock.classList.remove('is-dragging');
            var rect = dock.getBoundingClientRect ? dock.getBoundingClientRect() : null;
            if (rect) writeThemePreviewFloatPosition({ left: rect.left, top: rect.top });
            try { dock.releasePointerCapture(active.id); } catch (releaseErr) { }
            active = null;
        };

        dock.addEventListener('pointerdown', beginDrag);
        dock.addEventListener('pointermove', moveDrag);
        dock.addEventListener('pointerup', endDrag);
        dock.addEventListener('pointercancel', endDrag);
    }

    function bindThemeStudioEvents(container) {
        var panel = container.querySelector('#theme-studio-panel');
        if (!panel || panel.__themeBound) return;
        panel.__themeBound = true;

        panel.addEventListener('click', function (e) {
            var t = e && e.target ? e.target : null;
            if (!t) return;
            var act = t.getAttribute && t.getAttribute('data-theme-action');
            if (act === 'back') {
                var currentPage = panel.getAttribute('data-theme-current') || 'home';
                if (currentPage !== 'home') {
                    setThemeStudioPage(container, 'home');
                } else if (container.__themeStudioStandalone && typeof window.closeApp === 'function') {
                    window.closeApp();
                } else {
                    toggleThemeStudioPanel(container, false);
                }
                return;
            }
            if (act === 'save') {
                saveCurrentConfigAsPreset(container);
                return;
            }
            if (act === 'reset') {
                resetThemeStudioToDefault(container);
                return;
            }
            if (act === 'save-global-css-preset') {
                saveGlobalCssAsPreset(container);
                return;
            }
            if (act === 'import-global-css-file') {
                var fileInput = panel.querySelector('#theme-global-css-file');
                if (fileInput) {
                    fileInput.value = '';
                    fileInput.click();
                }
                return;
            }
            if (act === 'copy-bubble-css') {
                copyBubbleCssOutput(container);
                return;
            }
            var nav = t.getAttribute && t.getAttribute('data-theme-nav');
            if (!nav && t.closest) {
                var navEl = t.closest('[data-theme-nav]');
                nav = navEl ? (navEl.getAttribute('data-theme-nav') || '') : '';
            }
            if (nav) {
                setThemeStudioPage(container, nav);
                return;
            }
            var tex = t.getAttribute && t.getAttribute('data-texture');
            if (tex) {
                setTexture(container, tex);
                return;
            }
            var shape = t.getAttribute && t.getAttribute('data-shape');
            if (shape) {
                setAvatarShape(container, shape);
                return;
            }
            var tspos = t.getAttribute && t.getAttribute('data-tspos');
            if (tspos) {
                setTimestampPos(container, tspos);
                return;
            }
            var mergeMode = t.getAttribute && t.getAttribute('data-merge-mode');
            if (mergeMode) {
                setKktMergeMode(container, mergeMode);
                return;
            }
            var cssPresetActionEl = t.closest && t.closest('[data-css-preset-action]');
            if (cssPresetActionEl) {
                var cssCard = cssPresetActionEl.closest('.theme-css-preset-card');
                var cssPresetId = cssCard ? (cssCard.getAttribute('data-css-preset-id') || '') : '';
                var cssAction = cssPresetActionEl.getAttribute('data-css-preset-action') || '';
                if (cssAction === 'apply') applyGlobalCssPreset(container, cssPresetId);
                if (cssAction === 'delete') deleteGlobalCssPreset(container, cssPresetId);
                return;
            }

            var cssCardForPreview = t.closest && t.closest('.theme-css-preset-card');
            if (cssCardForPreview) {
                previewGlobalCssPreset(container, cssCardForPreview.getAttribute('data-css-preset-id') || '');
                return;
            }

            if (t.closest && t.closest('.theme-preset-card')) {
                var card = t.closest('.theme-preset-card');
                var pid = card ? (card.getAttribute('data-preset-id') || '') : '';
                if (pid) {
                    loadPresetForEdit(container, String(pid));
                }
                return;
            }
        });

        var aiColorInput = panel.querySelector('#theme-ai-color');
        if (aiColorInput) {
            aiColorInput.addEventListener('input', function () {
                themeStudioRuntime.config.aiColor = normalizeHexColor(aiColorInput.value, themeStudioRuntime.config.aiColor);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var globalCssInput = panel.querySelector('#theme-global-css');
        if (globalCssInput) {
            globalCssInput.addEventListener('input', function () {
                writeGlobalBeautifyCss(globalCssInput.value || '');
                syncGlobalCssPreviewFromInput(container);
            });
        }

        var globalCssFileInput = panel.querySelector('#theme-global-css-file');
        if (globalCssFileInput) {
            globalCssFileInput.addEventListener('change', function () {
                var file = globalCssFileInput.files && globalCssFileInput.files[0] ? globalCssFileInput.files[0] : null;
                importGlobalCssFile(container, file).finally(function () {
                    globalCssFileInput.value = '';
                });
            });
        }

        var userColorInput = panel.querySelector('#theme-user-color');
        if (userColorInput) {
            userColorInput.addEventListener('input', function () {
                themeStudioRuntime.config.userColor = normalizeHexColor(userColorInput.value, themeStudioRuntime.config.userColor);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var tailVisibleInput = panel.querySelector('#theme-tail-visible');
        if (tailVisibleInput) {
            tailVisibleInput.addEventListener('change', function () {
                themeStudioRuntime.config.tailEnabled = !!tailVisibleInput.checked;
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var tailTopInput = panel.querySelector('#theme-tail-top');
        if (tailTopInput) {
            tailTopInput.addEventListener('input', function () {
                themeStudioRuntime.config.tailTop = clampNumber(tailTopInput.value, 0, 28, 14);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var tailSlimInput = panel.querySelector('#theme-tail-slim');
        if (tailSlimInput) {
            tailSlimInput.addEventListener('input', function () {
                themeStudioRuntime.config.tailSlim = clampNumber(tailSlimInput.value, 0, 100, 0);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var bubbleCompactInput = panel.querySelector('#theme-bubble-compact');
        if (bubbleCompactInput) {
            bubbleCompactInput.addEventListener('input', function () {
                themeStudioRuntime.config.bubbleCompact = clampNumber(bubbleCompactInput.value, 0, 100, 0);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var avatarGapInput = panel.querySelector('#theme-avatar-gap');
        if (avatarGapInput) {
            avatarGapInput.addEventListener('input', function () {
                themeStudioRuntime.config.avatarBubbleGap = clampNumber(avatarGapInput.value, 0, 24, 4);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var tsVisibleInput = panel.querySelector('#theme-timestamp-visible');
        if (tsVisibleInput) {
            tsVisibleInput.addEventListener('change', function () {
                themeStudioRuntime.config.timestampEnabled = !!tsVisibleInput.checked;
                if (themeStudioRuntime.config.timestampEnabled && !themeStudioRuntime.config.timestampPos) {
                    themeStudioRuntime.config.timestampPos = 'avatar';
                }
                syncTimestampPosUI(container, themeStudioRuntime.config.timestampEnabled ? (themeStudioRuntime.config.timestampPos || 'avatar') : 'off');
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var readVisibleInput = panel.querySelector('#theme-read-visible');
        if (readVisibleInput) {
            readVisibleInput.addEventListener('change', function () {
                themeStudioRuntime.config.readEnabled = !!readVisibleInput.checked;
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var kktInput = panel.querySelector('#theme-kkt-merge');
        if (kktInput) {
            kktInput.addEventListener('change', function () {
                themeStudioRuntime.config.kktMerge = !!kktInput.checked;
                var modeRow = panel.querySelector('#theme-kkt-merge-mode-row');
                if (modeRow) modeRow.style.display = themeStudioRuntime.config.kktMerge ? '' : 'none';
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var shadowInput = panel.querySelector('#theme-shadow');
        if (shadowInput) {
            shadowInput.addEventListener('input', function () {
                themeStudioRuntime.config.shadow = clampNumber(shadowInput.value, 0, 24, 8);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var avatarVisibleInput = panel.querySelector('#theme-avatar-visible');
        if (avatarVisibleInput) {
            avatarVisibleInput.addEventListener('change', function () {
                themeStudioRuntime.config.avatarVisible = !!avatarVisibleInput.checked;
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var avatarSizeInput = panel.querySelector('#theme-avatar-size');
        if (avatarSizeInput) {
            avatarSizeInput.addEventListener('input', function () {
                themeStudioRuntime.config.avatarSize = clampNumber(avatarSizeInput.value, 24, 50, 40);
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        }

        var radiusRanges = panel.querySelectorAll('.theme-radius-range');
        radiusRanges.forEach(function (range) {
            range.addEventListener('input', function () {
                var target = range.getAttribute('data-radius-target') || '';
                var corner = range.getAttribute('data-corner') || '';
                var v = clampNumber(range.value, 0, 30, 12);
                if (target === 'ai' && themeStudioRuntime.config.aiRadius && corner) {
                    themeStudioRuntime.config.aiRadius[corner] = v;
                }
                if (target === 'user' && themeStudioRuntime.config.userRadius && corner) {
                    themeStudioRuntime.config.userRadius[corner] = v;
                }
                applyPreviewThemeConfig(container, themeStudioRuntime.config);
            });
        });

        var copyBtn = panel.querySelector('#theme-copy-to-user');
        if (copyBtn) {
            copyBtn.addEventListener('click', function () {
                mirrorRadiusToUser(container);
            });
        }

        var presetList = panel.querySelector('#theme-preset-list');
        if (presetList && !presetList.__themeLongPressBound) {
            presetList.__themeLongPressBound = true;
            var longPressTimer = 0;
            var startX = 0;
            var startY = 0;
            var activePresetId = '';

            var cancelLongPress = function () {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = 0;
                }
                activePresetId = '';
            };

            presetList.addEventListener('pointerdown', function (e) {
                var t = e && e.target ? e.target : null;
                if (!t) return;
                if (t.closest && t.closest('.theme-preset-apply')) return;
                var card = t.closest ? t.closest('.theme-preset-card') : null;
                if (!card) return;
                var pid = card.getAttribute('data-preset-id') || '';
                if (!pid) return;
                cancelLongPress();
                startX = typeof e.clientX === 'number' ? e.clientX : 0;
                startY = typeof e.clientY === 'number' ? e.clientY : 0;
                activePresetId = String(pid);
                longPressTimer = setTimeout(function () {
                    longPressTimer = 0;
                    var presetName = '';
                    var presets = readThemePresets();
                    presets.forEach(function (p) {
                        if (p && String(p.id || '') === activePresetId) presetName = String(p.name || '');
                    });
                    try {
                        var nextName = window.prompt('修改预设名称（留空将删除）', presetName || '预设');
                        if (nextName === null) {
                            activePresetId = '';
                            return;
                        }
                        var trimmed = String(nextName || '').trim();
                        if (!trimmed) {
                            var okDel = window.confirm('删除该预设？');
                            if (okDel) deletePresetById(container, activePresetId);
                            activePresetId = '';
                            return;
                        }
                        renamePresetById(container, activePresetId, trimmed);
                    } catch (err) { }
                    activePresetId = '';
                }, 560);
            });

            presetList.addEventListener('pointermove', function (e) {
                if (!longPressTimer) return;
                var x = typeof e.clientX === 'number' ? e.clientX : 0;
                var y = typeof e.clientY === 'number' ? e.clientY : 0;
                if (Math.abs(x - startX) > 10 || Math.abs(y - startY) > 10) cancelLongPress();
            });

            presetList.addEventListener('pointerup', cancelLongPress);
            presetList.addEventListener('pointercancel', cancelLongPress);
            presetList.addEventListener('pointerleave', cancelLongPress);
        }

    }

    function resetThemeStudioToDefault(container) {
        try {
            var ok = window.confirm('确定恢复系统初始外观？不会删除预设。');
            if (!ok) return;
        } catch (e) { }

        themeStudioRuntime.editingPresetId = '';
        themeStudioRuntime.globalCssPreviewPresetId = '';
        themeStudioRuntime.config = normalizeThemeConfig(getDefaultThemeConfig());

        writeGlobalBeautifyCss('');
        try { localStorage.removeItem(THEME_STUDIO_KEYS.global); } catch (e0) { }
        try { localStorage.removeItem('chat_bubble_css'); } catch (e1) { }
        try {
            var bubbleStyle1 = document.getElementById('user-custom-css');
            if (bubbleStyle1 && bubbleStyle1.parentNode) bubbleStyle1.parentNode.removeChild(bubbleStyle1);
        } catch (e2) { }
        try {
            var bubbleStyle2 = document.getElementById('chat-bubble-css-style');
            if (bubbleStyle2 && bubbleStyle2.parentNode) bubbleStyle2.parentNode.removeChild(bubbleStyle2);
        } catch (e3) { }
        try {
            var raw = localStorage.getItem('chat_settings_by_role') || '{}';
            var all = safeParseJson(raw, {});
            var changed = false;
            Object.keys(all || {}).forEach(function (k) {
                var item = all[k];
                if (!item || typeof item !== 'object') return;
                if ('bubbleCss' in item) { delete item.bubbleCss; changed = true; }
                if ('fontSize' in item) { delete item.fontSize; changed = true; }
            });
            if (changed) localStorage.setItem('chat_settings_by_role', JSON.stringify(all || {}));
        } catch (e4) { }

        var globalCssInput = container.querySelector('#theme-global-css');
        if (globalCssInput) globalCssInput.value = '';
        syncGlobalCssPreview(container, '');

        var aiColorInput = container.querySelector('#theme-ai-color');
        if (aiColorInput) aiColorInput.value = themeStudioRuntime.config.aiColor;

        var userColorInput = container.querySelector('#theme-user-color');
        if (userColorInput) userColorInput.value = themeStudioRuntime.config.userColor;

        var tailVisibleInput = container.querySelector('#theme-tail-visible');
        if (tailVisibleInput) tailVisibleInput.checked = !!themeStudioRuntime.config.tailEnabled;

        var tailTopInput = container.querySelector('#theme-tail-top');
        if (tailTopInput) tailTopInput.value = String(themeStudioRuntime.config.tailTop);

        var tailSlimInput = container.querySelector('#theme-tail-slim');
        if (tailSlimInput) tailSlimInput.value = String(themeStudioRuntime.config.tailSlim || 0);

        var bubbleCompactInput = container.querySelector('#theme-bubble-compact');
        if (bubbleCompactInput) bubbleCompactInput.value = String(themeStudioRuntime.config.bubbleCompact || 0);

        var kktInput = container.querySelector('#theme-kkt-merge');
        if (kktInput) kktInput.checked = !!themeStudioRuntime.config.kktMerge;
        var kktModeRow = container.querySelector('#theme-kkt-merge-mode-row');
        if (kktModeRow) kktModeRow.style.display = themeStudioRuntime.config.kktMerge ? '' : 'none';
        syncKktMergeModeUI(container, themeStudioRuntime.config.kktMergeMode || 'first');

        var shadowInput = container.querySelector('#theme-shadow');
        if (shadowInput) shadowInput.value = String(themeStudioRuntime.config.shadow);

        var avatarVisibleInput = container.querySelector('#theme-avatar-visible');
        if (avatarVisibleInput) avatarVisibleInput.checked = !!themeStudioRuntime.config.avatarVisible;

        var avatarSizeInput = container.querySelector('#theme-avatar-size');
        if (avatarSizeInput) avatarSizeInput.value = String(themeStudioRuntime.config.avatarSize);

        var avatarGapInput = container.querySelector('#theme-avatar-gap');
        if (avatarGapInput) avatarGapInput.value = String(themeStudioRuntime.config.avatarBubbleGap || 4);

        var tsVisibleInput = container.querySelector('#theme-timestamp-visible');
        if (tsVisibleInput) tsVisibleInput.checked = themeStudioRuntime.config.timestampEnabled !== false;

        syncTimestampPosUI(container, themeStudioRuntime.config.timestampEnabled !== false ? (themeStudioRuntime.config.timestampPos || 'avatar') : 'off');

        var readVisibleInput = container.querySelector('#theme-read-visible');
        if (readVisibleInput) readVisibleInput.checked = themeStudioRuntime.config.readEnabled !== false;

        setTexture(container, themeStudioRuntime.config.texture || 'solid');
        setAvatarShape(container, themeStudioRuntime.config.avatarShape || 'circle');

        var box = container.querySelector('#theme-user-radius');
        if (box) box.style.display = 'none';
        var ranges = container.querySelectorAll('.theme-radius-range');
        ranges.forEach(function (r) {
            var target = r.getAttribute('data-radius-target') || '';
            var corner = r.getAttribute('data-corner') || '';
            if (target === 'ai' && corner) r.value = String(themeStudioRuntime.config.aiRadius[corner]);
            if (target === 'user' && corner) r.value = String(themeStudioRuntime.config.userRadius[corner]);
        });

        applyPreviewThemeConfig(container, themeStudioRuntime.config);

        try {
            if (window.ThemeStudio && typeof window.ThemeStudio.resetGlobalThemeToSystemDefault === 'function') {
                window.ThemeStudio.resetGlobalThemeToSystemDefault();
            }
        } catch (e2) { }

        try {
            if (typeof window.applyChatBubbleCssFromSettings === 'function') {
                window.applyChatBubbleCssFromSettings(String(window.currentChatRole || ''));
            }
            if (typeof window.applyChatFontSizeFromSettings === 'function') {
                window.applyChatFontSizeFromSettings(String(window.currentChatRole || ''));
            }
        } catch (e3) { }
    }

    function setTexture(container, texture) {
        var seg = container.querySelector('#theme-texture-seg');
        if (!seg) return;
        var btns = seg.querySelectorAll('.theme-seg-btn');
        btns.forEach(function (b) {
            var t = b.getAttribute('data-texture') || '';
            if (t === texture) b.classList.add('is-active');
            else b.classList.remove('is-active');
        });
        themeStudioRuntime.config.texture = String(texture || 'solid');
        applyPreviewThemeConfig(container, themeStudioRuntime.config);
    }

    function setAvatarShape(container, shape) {
        var seg = container.querySelector('#theme-avatar-shape-seg');
        if (!seg) return;
        var btns = seg.querySelectorAll('.theme-seg-btn');
        btns.forEach(function (b) {
            var t = b.getAttribute('data-shape') || '';
            if (t === shape) b.classList.add('is-active');
            else b.classList.remove('is-active');
        });
        if (shape === 'squircle' || shape === 'square' || shape === 'circle') {
            themeStudioRuntime.config.avatarShape = shape;
        } else {
            themeStudioRuntime.config.avatarShape = 'circle';
        }
        applyPreviewThemeConfig(container, themeStudioRuntime.config);
    }

    function syncTimestampPosUI(container, tspos) {
        var seg = container.querySelector('#theme-timestamp-pos');
        if (!seg) return;
        var btns = seg.querySelectorAll('.theme-seg-btn');
        btns.forEach(function (b) {
            var v = b.getAttribute('data-tspos') || '';
            if (v === tspos) b.classList.add('is-active');
            else b.classList.remove('is-active');
        });
    }

    function setTimestampPos(container, tspos) {
        var v = String(tspos || '').trim();
        if (!v) return;
        var enabled = v !== 'off';
        themeStudioRuntime.config.timestampEnabled = enabled;
        if (enabled) {
            if (v === 'bubble') {
                themeStudioRuntime.config.timestampPos = 'bubble';
            } else if (v === 'bubbleRight') {
                themeStudioRuntime.config.timestampPos = 'bubbleRight';
            } else {
                themeStudioRuntime.config.timestampPos = 'avatar';
            }
        }
        var checkbox = container.querySelector('#theme-timestamp-visible');
        if (checkbox) checkbox.checked = enabled;
        syncTimestampPosUI(container, enabled ? (themeStudioRuntime.config.timestampPos || 'avatar') : 'off');
        applyPreviewThemeConfig(container, themeStudioRuntime.config);
    }

    function syncKktMergeModeUI(container, mode) {
        var seg = container.querySelector('#theme-kkt-merge-mode-seg');
        if (!seg) return;
        var btns = seg.querySelectorAll('.theme-seg-btn');
        btns.forEach(function (b) {
            var m = b.getAttribute('data-merge-mode') || '';
            if (m === mode) b.classList.add('is-active');
            else b.classList.remove('is-active');
        });
    }

    function setKktMergeMode(container, mode) {
        var v = String(mode || '').trim();
        if (v !== 'first' && v !== 'last') v = 'first';
        themeStudioRuntime.config.kktMergeMode = v;
        syncKktMergeModeUI(container, v);
        applyPreviewThemeConfig(container, themeStudioRuntime.config);
    }

    function mirrorRadiusToUser(container) {
        var ai = themeStudioRuntime.config.aiRadius || { tl: 12, tr: 12, bl: 6, br: 12 };
        themeStudioRuntime.config.userRadius = {
            tl: ai.tr,
            tr: ai.tl,
            bl: ai.br,
            br: ai.bl
        };
        var box = container.querySelector('#theme-user-radius');
        if (box) box.style.display = '';
        var ranges = container.querySelectorAll('.theme-radius-range[data-radius-target="user"]');
        ranges.forEach(function (r) {
            var c = r.getAttribute('data-corner') || '';
            if (!c) return;
            r.value = String(themeStudioRuntime.config.userRadius[c]);
        });
        applyPreviewThemeConfig(container, themeStudioRuntime.config);
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function saveCurrentConfigAsPreset(container, onSuccess) {
        var presets = readThemePresets();
        var editingId = String(themeStudioRuntime.editingPresetId || '').trim();
        if (editingId) {
            var changed = false;
            presets.forEach(function (p) {
                if (p && String(p.id || '') === editingId) {
                    p.config = JSON.parse(JSON.stringify(themeStudioRuntime.config || getDefaultThemeConfig()));
                    p.updatedAt = Date.now();
                    changed = true;
                }
            });
            if (changed) writeThemePresets(presets);
            renderPresetList(container);
            if (window.GlobalModal && typeof window.GlobalModal.showError === 'function') {
                window.GlobalModal.showError('已保存修改');
            } else {
                alert('已保存修改');
            }
            if (typeof onSuccess === 'function') onSuccess(editingId);
            return;
        }

        var idx = presets.length + 1;
        var defaultName = '预设 ' + idx;
        var name = defaultName;
        try {
            var inputName = window.prompt('预设名称', defaultName);
            if (inputName === null) return;
            name = String(inputName || '').trim() || defaultName;
        } catch (e) {
            name = defaultName;
        }
        var id = 'preset_' + Date.now() + '_' + Math.random().toString(16).slice(2);
        var item = {
            id: id,
            name: name,
            createdAt: Date.now(),
            config: JSON.parse(JSON.stringify(themeStudioRuntime.config || getDefaultThemeConfig()))
        };
        presets.unshift(item);
        writeThemePresets(presets);
        renderPresetList(container);
        if (window.GlobalModal && typeof window.GlobalModal.showError === 'function') {
            window.GlobalModal.showError('已保存为预设');
        } else if (!onSuccess) {
            alert('已保存为预设');
        }
        if (typeof onSuccess === 'function') onSuccess(id);
    }

    function renderPresetList(container) {
        var listEl = container.querySelector('#theme-preset-list');
        var countEl = container.querySelector('#theme-preset-count');
        if (!listEl) return;
        var presets = readThemePresets();
        if (countEl) countEl.textContent = String(presets.length);
        var editingId = String(themeStudioRuntime.editingPresetId || '').trim();
        if (!presets.length) {
            listEl.innerHTML = '<div class="theme-empty">暂无预设，先调一套再保存吧。</div>';
            return;
        }
        var html = '';
        presets.forEach(function (p) {
            var name = p && p.name ? String(p.name) : '未命名';
            var pid = p && p.id ? String(p.id) : '';
            var editingClass = editingId && pid === editingId ? ' is-editing' : '';
            html += '<div class="theme-preset-card' + editingClass + '" data-preset-id="' + escapeHtml(pid) + '">';
            html += '  <div class="theme-preset-main">';
            html += '    <div class="theme-preset-name">' + escapeHtml(name) + '</div>';
            html += '    <div class="theme-preset-meta">' + formatTime(p && p.createdAt) + '</div>';
            html += '  </div>';
            html += '</div>';
        });
        listEl.innerHTML = html;
    }

    function deletePresetById(container, presetId) {
        var pid = String(presetId || '').trim();
        if (!pid) return;
        var presets = readThemePresets();
        var next = [];
        presets.forEach(function (p) {
            if (p && String(p.id || '') !== pid) next.push(p);
        });
        writeThemePresets(next);
        renderPresetList(container);
    }

    function renamePresetById(container, presetId, nextName) {
        var pid = String(presetId || '').trim();
        var name = String(nextName || '').trim();
        if (!pid || !name) return;
        var presets = readThemePresets();
        var changed = false;
        presets.forEach(function (p) {
            if (p && String(p.id || '') === pid) {
                p.name = name;
                changed = true;
            }
        });
        if (changed) writeThemePresets(presets);
        renderPresetList(container);
    }

    function loadPresetForEdit(container, presetId) {
        var pid = String(presetId || '').trim();
        if (!pid) return;
        var presets = readThemePresets();
        var target = null;
        presets.forEach(function (p) {
            if (!target && p && String(p.id || '') === pid) target = p;
        });
        if (!target || !target.config) return;
        themeStudioRuntime.editingPresetId = pid;
        themeStudioRuntime.config = normalizeThemeConfig(target.config);
        syncEditorUiFromConfig(container, themeStudioRuntime.config);
        applyPreviewThemeConfig(container, themeStudioRuntime.config);
        renderPresetList(container);
        syncThemeStudioDockLayout(container);
    }

    function syncEditorUiFromConfig(container, config) {
        var c = config || getDefaultThemeConfig();
        var aiColorInput = container.querySelector('#theme-ai-color');
        if (aiColorInput) aiColorInput.value = c.aiColor;
        var userColorInput = container.querySelector('#theme-user-color');
        if (userColorInput) userColorInput.value = c.userColor;

        var tailVisibleInput = container.querySelector('#theme-tail-visible');
        if (tailVisibleInput) tailVisibleInput.checked = !!c.tailEnabled;
        var tailTopInput = container.querySelector('#theme-tail-top');
        if (tailTopInput) tailTopInput.value = String(c.tailTop);
        var tailSlimInput = container.querySelector('#theme-tail-slim');
        if (tailSlimInput) tailSlimInput.value = String(c.tailSlim || 0);
        var bubbleCompactInput = container.querySelector('#theme-bubble-compact');
        if (bubbleCompactInput) bubbleCompactInput.value = String(c.bubbleCompact || 0);

        var kktInput = container.querySelector('#theme-kkt-merge');
        if (kktInput) kktInput.checked = !!c.kktMerge;
        var kktModeRow = container.querySelector('#theme-kkt-merge-mode-row');
        if (kktModeRow) kktModeRow.style.display = c.kktMerge ? '' : 'none';
        syncKktMergeModeUI(container, c.kktMergeMode || 'first');
        var shadowInput = container.querySelector('#theme-shadow');
        if (shadowInput) shadowInput.value = String(c.shadow);

        var avatarVisibleInput = container.querySelector('#theme-avatar-visible');
        if (avatarVisibleInput) avatarVisibleInput.checked = !!c.avatarVisible;
        var avatarSizeInput = container.querySelector('#theme-avatar-size');
        if (avatarSizeInput) avatarSizeInput.value = String(c.avatarSize);
        var avatarGapInput = container.querySelector('#theme-avatar-gap');
        if (avatarGapInput) avatarGapInput.value = String(c.avatarBubbleGap || 4);

        var tsVisibleInput = container.querySelector('#theme-timestamp-visible');
        if (tsVisibleInput) tsVisibleInput.checked = c.timestampEnabled !== false;
        syncTimestampPosUI(container, c.timestampEnabled !== false ? (c.timestampPos || 'avatar') : 'off');

        var readVisibleInput = container.querySelector('#theme-read-visible');
        if (readVisibleInput) readVisibleInput.checked = c.readEnabled !== false;

        setTexture(container, c.texture || 'solid');
        setAvatarShape(container, c.avatarShape || 'circle');

        var aiRanges = container.querySelectorAll('.theme-radius-range[data-radius-target="ai"]');
        aiRanges.forEach(function (r) {
            var corner = r.getAttribute('data-corner') || '';
            if (corner && c.aiRadius && typeof c.aiRadius[corner] === 'number') r.value = String(c.aiRadius[corner]);
        });

        var userRanges = container.querySelectorAll('.theme-radius-range[data-radius-target="user"]');
        userRanges.forEach(function (r) {
            var corner = r.getAttribute('data-corner') || '';
            if (corner && c.userRadius && typeof c.userRadius[corner] === 'number') r.value = String(c.userRadius[corner]);
        });
        var userBox = container.querySelector('#theme-user-radius');
        if (userBox) userBox.style.display = '';
    }

    function renderFavorites(container) {
        var listEl = container.querySelector('#mine-favorites-list');
        var quickEl = container.querySelector('#mine-favorites-quick-grid');
        var panel = container.querySelector('#mine-favorites-panel');
        if (!listEl || !quickEl || !panel) return;
        var list = getFavoritesList();
        list = list.slice().sort(function (a, b) {
            var ta = a && typeof a.timestamp === 'number' ? a.timestamp : 0;
            var tb = b && typeof b.timestamp === 'number' ? b.timestamp : 0;
            return tb - ta;
        });
        var activeFilter = normalizeFavoritesFilter(panel.getAttribute('data-active-filter') || 'all');
        var quickHtml = '';
        FAVORITES_FILTER_ITEMS.forEach(function (item) {
            var count = list.filter(function (fav) {
                return isFavoriteMatchedByFilter(fav, item.key);
            }).length;
            var activeClass = item.key === activeFilter ? ' is-active' : '';
            quickHtml += '<button type="button" class="mine-favorites-quick-btn' + activeClass + '" data-fav-filter="' + item.key + '">';
            quickHtml += '  <span class="mine-favorites-quick-icon">' + escapeHtml(item.icon) + '</span>';
            quickHtml += '  <span class="mine-favorites-quick-label">' + escapeHtml(item.label) + '</span>';
            quickHtml += '  <span class="mine-favorites-quick-count">' + String(count) + '</span>';
            quickHtml += '</button>';
        });
        quickEl.innerHTML = quickHtml;

        var filtered = list.filter(function (fav) {
            return isFavoriteMatchedByFilter(fav, activeFilter);
        });
        if (!filtered.length) {
            listEl.innerHTML = '<div class="mine-favorites-empty">暂无收藏</div>';
        } else {
            var html = '';
            filtered.forEach(function (fav) {
            var id = fav && fav.id ? String(fav.id) : '';
            var name = fav && fav.senderName ? String(fav.senderName) : 'TA';
            var timeText = formatTime(fav && fav.timestamp);
            var typeLabel = getFavoriteTypeLabel(fav);
            var content = getFavoritePreviewText(fav);
            var previewUrl = fav && fav.previewUrl ? String(fav.previewUrl) : '';
            html += '<div class="mine-favorites-item" data-fav-id="' + escapeHtml(id) + '">';
            html += '  <div class="mine-favorites-item-main">';
            html += '    <div class="mine-favorites-item-title">' + escapeHtml(content) + '</div>';
            html += '    <div class="mine-favorites-item-subtitle">' + escapeHtml(typeLabel) + '</div>';
            html += '    <div class="mine-favorites-item-meta">';
            html += '      <div class="mine-favorites-item-role">' + escapeHtml(name) + '</div>';
            html += '      <div class="mine-favorites-item-date">' + escapeHtml(timeText) + '</div>';
            html += '    </div>';
            html += '  </div>';
            if (previewUrl && (fav.type === 'image' || fav.type === 'sticker')) {
                html += '  <div class="mine-favorites-item-side"><img class="mine-favorites-item-thumb" src="' + escapeHtml(previewUrl) + '" alt=""></div>';
            } else {
                html += '  <div class="mine-favorites-item-side"><div class="mine-favorites-item-badge">' + escapeHtml(typeLabel) + '</div></div>';
            }
            html += '</div>';
        });
            listEl.innerHTML = html;
        }

        var filterBtns = quickEl.querySelectorAll('[data-fav-filter]');
        filterBtns.forEach(function (btn) {
            btn.onclick = function () {
                var nextFilter = normalizeFavoritesFilter(btn.getAttribute('data-fav-filter') || 'all');
                panel.setAttribute('data-active-filter', nextFilter);
                renderFavorites(container);
            };
        });

        var items = listEl.querySelectorAll('.mine-favorites-item');
        items.forEach(function (el) {
            var longPressTimer = null;
            var isLongPress = false;
            var startX = 0;
            var startY = 0;

            function clearLongPressTimer() {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }

            function handleLongPress() {
                isLongPress = true;
                var id = el.getAttribute('data-fav-id') || '';
                var picked = null;
                for (var i = 0; i < filtered.length; i++) {
                    if (String(filtered[i] && filtered[i].id || '') === String(id)) {
                        picked = filtered[i];
                        break;
                    }
                }
                if (!picked) return;
                showFavoriteDeleteConfirm(el, picked, container);
            }

            el.addEventListener('touchstart', function (e) {
                isLongPress = false;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                longPressTimer = setTimeout(handleLongPress, 500);
            }, { passive: true });

            el.addEventListener('touchmove', function (e) {
                if (!longPressTimer) return;
                var moveX = Math.abs(e.touches[0].clientX - startX);
                var moveY = Math.abs(e.touches[0].clientY - startY);
                if (moveX > 10 || moveY > 10) {
                    clearLongPressTimer();
                }
            }, { passive: true });

            el.addEventListener('touchend', function (e) {
                clearLongPressTimer();
                if (isLongPress) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, { passive: false });

            el.addEventListener('touchcancel', clearLongPressTimer);

            el.addEventListener('mousedown', function (e) {
                isLongPress = false;
                startX = e.clientX;
                startY = e.clientY;
                longPressTimer = setTimeout(handleLongPress, 500);
            });

            el.addEventListener('mousemove', function (e) {
                if (!longPressTimer) return;
                var moveX = Math.abs(e.clientX - startX);
                var moveY = Math.abs(e.clientY - startY);
                if (moveX > 10 || moveY > 10) {
                    clearLongPressTimer();
                }
            });

            el.addEventListener('mouseup', function (e) {
                clearLongPressTimer();
                if (isLongPress) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });

            el.addEventListener('mouseleave', clearLongPressTimer);

            el.onclick = function (e) {
                if (isLongPress) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                var id = el.getAttribute('data-fav-id') || '';
                var picked = null;
                for (var i = 0; i < filtered.length; i++) {
                    if (String(filtered[i] && filtered[i].id || '') === String(id)) {
                        picked = filtered[i];
                        break;
                    }
                }
                if (!picked) return;
                if (picked.roleId && window.enterChatRoom && typeof window.enterChatRoom === 'function') {
                    window.enterChatRoom(String(picked.roleId));
                    setTimeout(function () {
                        if (picked.messageId && window.scrollToChatMessageById && typeof window.scrollToChatMessageById === 'function') {
                            window.scrollToChatMessageById(String(picked.messageId));
                        }
                    }, 380);
                }
            };
        });
    }

    function showFavoriteDeleteConfirm(el, fav, container) {
        var existingConfirm = document.getElementById('fav-delete-confirm-modal');
        if (existingConfirm) existingConfirm.remove();

        var content = getFavoritePreviewText(fav);
        if (content.length > 30) content = content.substring(0, 30) + '...';

        var modal = document.createElement('div');
        modal.id = 'fav-delete-confirm-modal';
        modal.innerHTML = '<div class="fav-delete-confirm-mask"></div>' +
            '<div class="fav-delete-confirm-dialog">' +
            '  <div class="fav-delete-confirm-title">删除收藏</div>' +
            '  <div class="fav-delete-confirm-content">确定要删除这条收藏吗？</div>' +
            '  <div class="fav-delete-confirm-preview">"' + escapeHtml(content) + '"</div>' +
            '  <div class="fav-delete-confirm-actions">' +
            '    <button type="button" class="fav-delete-confirm-btn fav-delete-confirm-cancel">取消</button>' +
            '    <button type="button" class="fav-delete-confirm-btn fav-delete-confirm-ok">删除</button>' +
            '  </div>' +
            '</div>';
        document.body.appendChild(modal);

        var mask = modal.querySelector('.fav-delete-confirm-mask');
        var cancelBtn = modal.querySelector('.fav-delete-confirm-cancel');
        var okBtn = modal.querySelector('.fav-delete-confirm-ok');

        function closeModal() {
            modal.remove();
        }

        mask.onclick = closeModal;
        cancelBtn.onclick = closeModal;

        okBtn.onclick = function () {
            var favId = fav && fav.id ? String(fav.id) : '';
            if (favId && window.removeFavoriteById && typeof window.removeFavoriteById === 'function') {
                window.removeFavoriteById(favId);
            } else {
                try {
                    var raw = localStorage.getItem('wechat_favorites_v2');
                    var list = raw ? JSON.parse(raw) : [];
                    if (Array.isArray(list)) {
                        list = list.filter(function (item) {
                            return String(item && item.id || '') !== favId;
                        });
                        localStorage.setItem('wechat_favorites_v2', JSON.stringify(list));
                    }
                } catch (e) { }
            }
            closeModal();
            renderFavorites(container);
        };
    }

    function closeEditOverlay(container) {
        var overlay = container.querySelector('#mine-edit-overlay');
        if (!overlay) return;
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('data-field', '');
    }

    function saveEditOverlay(container) {
        var overlay = container.querySelector('#mine-edit-overlay');
        if (!overlay) return;
        var field = overlay.getAttribute('data-field') || '';
        var input = container.querySelector('#mine-edit-input');
        var textarea = container.querySelector('#mine-edit-textarea');
        if (!field) return closeEditOverlay(container);

        if (field === 'name') {
            var nameVal = input ? String(input.value || '').trim() : '';
            if (window.MineProfile && typeof window.MineProfile.setName === 'function') {
                window.MineProfile.setName(nameVal);
            }
        } else if (field === 'signature') {
            var signVal = textarea ? String(textarea.value || '') : '';
            if (window.MineProfile && typeof window.MineProfile.setSignature === 'function') {
                window.MineProfile.setSignature(signVal);
            }
        }
        closeEditOverlay(container);
    }

    function openEditOverlay(container, field) {
        var overlay = container.querySelector('#mine-edit-overlay');
        if (!overlay) return;
        var title = container.querySelector('#mine-edit-title');
        var input = container.querySelector('#mine-edit-input');
        var textarea = container.querySelector('#mine-edit-textarea');

        var profile = null;
        if (window.MineProfile && typeof window.MineProfile.getProfile === 'function') {
            profile = window.MineProfile.getProfile();
        }
        profile = profile || { name: '', signature: '' };

        overlay.setAttribute('data-field', field || '');
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');

        if (field === 'name') {
            if (title) title.textContent = '修改昵称';
            if (input) {
                input.style.display = '';
                input.value = profile.name || '';
            }
            if (textarea) textarea.style.display = 'none';
            setTimeout(function () {
                try { input && input.focus(); } catch (e) { }
                try { input && input.select && input.select(); } catch (e2) { }
            }, 0);
        } else if (field === 'signature') {
            if (title) title.textContent = '修改个性签名';
            if (textarea) {
                textarea.style.display = '';
                textarea.value = profile.signature || '';
            }
            if (input) input.style.display = 'none';
            setTimeout(function () {
                try { textarea && textarea.focus(); } catch (e) { }
            }, 0);
        }
    }

    function bindEvents(container) {
        var avatarBox = container.querySelector('[data-mine-action="change-avatar"]');
        var avatarInput = container.querySelector('#mine-avatar-input');
        if (avatarInput) avatarInput.value = '';
        if (avatarBox && avatarInput) {
            avatarBox.onclick = function () {
                try { avatarInput.click(); } catch (e) { }
            };
        }
        if (avatarInput) {
            avatarInput.onchange = function () {
                var file = avatarInput.files && avatarInput.files[0] ? avatarInput.files[0] : null;
                readImageFileAsAvatar(file, function (avatarDataUrl) {
                    if (avatarDataUrl && window.MineProfile && typeof window.MineProfile.setAvatar === 'function') {
                        window.MineProfile.setAvatar(avatarDataUrl);
                    }
                });
                avatarInput.value = '';
            };
        }

        var nameEl = container.querySelector('[data-mine-action="edit-name"]');
        if (nameEl) {
            nameEl.onclick = function (e) {
                if (e && e.stopPropagation) e.stopPropagation();
                openEditOverlay(container, 'name');
            };
        }
        var signEl = container.querySelector('[data-mine-action="edit-signature"]');
        if (signEl) {
            signEl.onclick = function (e) {
                if (e && e.stopPropagation) e.stopPropagation();
                openEditOverlay(container, 'signature');
            };
        }

        var editOverlay = container.querySelector('#mine-edit-overlay');
        if (editOverlay) {
            editOverlay.onclick = function (e) {
                if (e && e.target === editOverlay) closeEditOverlay(container);
            };
            var cancelBtn = editOverlay.querySelector('[data-mine-edit="cancel"]');
            if (cancelBtn) cancelBtn.onclick = function () { closeEditOverlay(container); };
            var saveBtn = editOverlay.querySelector('[data-mine-edit="save"]');
            if (saveBtn) saveBtn.onclick = function () { saveEditOverlay(container); };

            var editInput = container.querySelector('#mine-edit-input');
            if (editInput) {
                editInput.onkeydown = function (e) {
                    if (!e) return;
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        closeEditOverlay(container);
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        saveEditOverlay(container);
                    }
                };
            }
            var editTextarea = container.querySelector('#mine-edit-textarea');
            if (editTextarea) {
                editTextarea.onkeydown = function (e) {
                    if (!e) return;
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        closeEditOverlay(container);
                    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        saveEditOverlay(container);
                    }
                };
            }
        }

        var panelBack = container.querySelector('[data-fav-action="back"]');
        if (panelBack) {
            panelBack.onclick = function () {
                toggleFavoritesPanel(container, false);
            };
        }
        var items = container.querySelectorAll('.mine-list-item');
        items.forEach(function (item) {
            item.addEventListener('click', function () {
                var type = item.getAttribute('data-mine-item');
                if (type === 'wallet') {
                    try {
                        if (typeof window.recordActivity === 'function') window.recordActivity('进入了微信-我的-钱包');
                    } catch (e) { }
                    if (window.Wallet && typeof window.Wallet.open === 'function') {
                        window.Wallet.open();
                    }
                } else if (type === 'favorites') {
                    toggleFavoritesPanel(container, true);
                    renderFavorites(container);
                } else if (type === 'sports') {
                    if (window.SportsLeaderboard && typeof window.SportsLeaderboard.show === 'function') {
                        window.SportsLeaderboard.show();
                    }
                } else if (type === 'period') {
                    try {
                        if (typeof window.recordActivity === 'function') window.recordActivity('进入了经期');
                    } catch (e) { }
                    if (window.PeriodApp && typeof window.PeriodApp.show === 'function') {
                        window.PeriodApp.show();
                    }
                }
            });
        });
    }

    function render() {
        var container = document.getElementById('mine-view');
        if (!container) return;
        themeStudioInitialized = false;
        themeStudioRuntime.config = null;
        themeStudioRuntime.editingPresetId = '';
        themeStudioRuntime.globalCssPreviewPresetId = '';
        container.innerHTML = buildHtml();
        bindEvents(container);
        if (window.MineProfile && typeof window.MineProfile.applyToView === 'function') {
            window.MineProfile.applyToView();
        }
        initialized = true;
    }

    function show() {
        var container = document.getElementById('mine-view');
        if (!container) return;
        if (!initialized || !container.querySelector || !container.querySelector('.mine-root')) {
            render();
        } else if (window.MineProfile && typeof window.MineProfile.applyToView === 'function') {
            window.MineProfile.applyToView();
        }
    }

    function openThemeStudioApp(target) {
        var container = typeof target === 'string' ? document.getElementById(target) : target;
        if (!container) return;
        themeStudioInitialized = false;
        themeStudioRuntime.config = null;
        themeStudioRuntime.editingPresetId = '';
        themeStudioRuntime.globalCssPreviewPresetId = '';
        container.__themeStudioStandalone = true;
        container.innerHTML = '<div class="mine-root beautify-standalone-root">' + buildThemeStudioHtml() + '</div>';
        toggleThemeStudioPanel(container, true);
        initThemeStudio(container);
    }

    function refreshProfile() {
        if (window.MineProfile && typeof window.MineProfile.applyToView === 'function') {
            window.MineProfile.applyToView();
        }
    }

    try {
        applyGlobalBeautifyCss(readGlobalBeautifyCss());
    } catch (e) { }

    return {
        show: show,
        render: render,
        refreshProfile: refreshProfile,
        openThemeStudioApp: openThemeStudioApp
    };
})();

window.MineCore = MineCore;
