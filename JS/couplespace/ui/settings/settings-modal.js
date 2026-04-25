(function () {
    'use strict';

    const settingsService = window.CoupleSpaceSettings;

    function createModal() {
        const existing = document.getElementById('qlkj-setting-modal');
        if (existing) return existing;

        const modal = document.createElement('div');
        modal.id = 'qlkj-setting-modal';
        modal.className = 'qlkj-setting-modal';
        modal.hidden = true;

        const settings = settingsService.loadSettings();
        const xiuluoChecked = settings.xiuluoEnabled ? 'checked' : '';
        const xiuluoDetailHidden = settings.xiuluoEnabled ? '' : ' hidden';
        const xiuluoFloodChecked = settings.xiuluoScreenFloodEnabled ? 'checked' : '';
        const xiuluoFloodDisabled = settings.xiuluoEnabled ? '' : ' disabled';
        const xiuluoFloodMinutes = normalizeFloodMinutes(settings.xiuluoScreenFloodMinutes);
        const autoRoleMoodDiaryChecked = settings.autoRoleMoodDiaryEnabled !== false ? 'checked' : '';
        const roleCommentOnUserDiaryChecked = settings.roleCommentOnUserDiaryEnabled !== false ? 'checked' : '';
        modal.innerHTML =
            '<div class="qlkj-setting-mask" id="qlkj-setting-mask"></div>' +
            '<div class="qlkj-setting-card" role="dialog" aria-modal="true">' +
            '  <div class="qlkj-setting-header">' +
            '    <button class="qlkj-setting-back" id="qlkj-setting-back" type="button">&lt;</button>' +
            '    <div class="qlkj-setting-title">情侣空间设置</div>' +
            '    <div class="qlkj-setting-placeholder"></div>' +
            '  </div>' +
            '  <div class="qlkj-setting-content">' +
            '    <div class="qlkj-setting-item">' +
            '      <div class="qlkj-setting-item-left">' +
            '        <div class="qlkj-setting-item-title">修罗场模式</div>' +
            '        <div class="qlkj-setting-item-desc">打开后角色可以主动打断你和其他人的微信聊天</div>' +
            '      </div>' +
            '      <label class="qlkj-setting-switch">' +
            '        <input type="checkbox" id="xiuluo-switch" ' + xiuluoChecked + '>' +
            '        <span class="qlkj-setting-slider"></span>' +
            '      </label>' +
            '    </div>' +
            '    <div class="qlkj-setting-subgroup" id="xiuluo-detail-panel"' + xiuluoDetailHidden + '>' +
            '      <div class="qlkj-setting-item qlkj-setting-item-sub">' +
            '        <div class="qlkj-setting-item-left">' +
            '          <div class="qlkj-setting-item-title">允许角色霸屏</div>' +
            '          <div class="qlkj-setting-item-desc">你在其他角色聊天窗口停留太久时，正宫可以用小弹窗查岗</div>' +
            '        </div>' +
            '        <label class="qlkj-setting-switch">' +
            '          <input type="checkbox" id="xiuluo-flood-switch" ' + xiuluoFloodChecked + xiuluoFloodDisabled + '>' +
            '          <span class="qlkj-setting-slider"></span>' +
            '        </label>' +
            '      </div>' +
            '      <div class="qlkj-setting-item qlkj-setting-item-sub">' +
            '        <div class="qlkj-setting-item-left">' +
            '          <div class="qlkj-setting-item-title">霸屏触发时间</div>' +
            '          <div class="qlkj-setting-item-desc">连续停留达到这个时间后触发，最多 15 分钟</div>' +
            '        </div>' +
            '        <div class="qlkj-setting-number-wrap">' +
            '          <input class="qlkj-setting-number" id="xiuluo-flood-minutes" type="number" min="1" max="15" step="1" value="' + xiuluoFloodMinutes + '"' + xiuluoFloodDisabled + '>' +
            '          <span class="qlkj-setting-number-unit">分钟</span>' +
            '        </div>' +
            '      </div>' +
            '    </div>' +
            '    <div class="qlkj-setting-item">' +
            '      <div class="qlkj-setting-item-left">' +
            '        <div class="qlkj-setting-item-title">角色自动写心情日记</div>' +
            '        <div class="qlkj-setting-item-desc">关闭后，不会再因久未返回或隔天进入而自动生成角色心情日记</div>' +
            '      </div>' +
            '      <label class="qlkj-setting-switch">' +
            '        <input type="checkbox" id="auto-role-mood-diary-switch" ' + autoRoleMoodDiaryChecked + '>' +
            '        <span class="qlkj-setting-slider"></span>' +
            '      </label>' +
            '    </div>' +
            '    <div class="qlkj-setting-item">' +
            '      <div class="qlkj-setting-item-left">' +
            '        <div class="qlkj-setting-item-title">允许角色评论你的日记</div>' +
            '        <div class="qlkj-setting-item-desc">关闭后，你写完心情日记将不会再自动触发角色回复</div>' +
            '      </div>' +
            '      <label class="qlkj-setting-switch">' +
            '        <input type="checkbox" id="role-comment-user-diary-switch" ' + roleCommentOnUserDiaryChecked + '>' +
            '        <span class="qlkj-setting-slider"></span>' +
            '      </label>' +
            '    </div>' +
            '    <div class="qlkj-setting-divider"></div>' +
            '    <div class="qlkj-setting-item qlkj-setting-item-danger" id="qlkj-unlink-btn">' +
            '      <div class="qlkj-setting-item-left">' +
            '        <div class="qlkj-setting-item-title">解除情侣空间</div>' +
            '        <div class="qlkj-setting-item-desc">解除后所有记录将被清除</div>' +
            '      </div>' +
            '      <div class="qlkj-setting-arrow">&gt;</div>' +
            '    </div>' +
            '  </div>' +
            '</div>';

        document.body.appendChild(modal);
        bindEvents();
        return modal;
    }

    function closeModal() {
        const modal = document.getElementById('qlkj-setting-modal');
        if (!modal) return;
        modal.classList.remove('is-open');
        setTimeout(function () {
            modal.hidden = true;
        }, 300);
    }

    function normalizeFloodMinutes(value) {
        if (settingsService.normalizeXiuluoScreenFloodMinutes) {
            return settingsService.normalizeXiuluoScreenFloodMinutes(value);
        }
        const n = Math.floor(Number(value));
        if (!Number.isFinite(n)) return 5;
        return Math.max(1, Math.min(15, n));
    }

    function refreshXiuluoDetailPanel() {
        const xiuluoSwitch = document.getElementById('xiuluo-switch');
        const floodSwitch = document.getElementById('xiuluo-flood-switch');
        const floodMinutes = document.getElementById('xiuluo-flood-minutes');
        const panel = document.getElementById('xiuluo-detail-panel');
        const enabled = !!(xiuluoSwitch && xiuluoSwitch.checked);
        const floodEnabled = enabled && !!(floodSwitch && floodSwitch.checked);
        if (panel) panel.hidden = !enabled;
        if (floodSwitch) floodSwitch.disabled = !enabled;
        if (floodMinutes) {
            floodMinutes.disabled = !floodEnabled;
            floodMinutes.value = String(normalizeFloodMinutes(floodMinutes.value || settingsService.getSetting('xiuluoScreenFloodMinutes')));
        }
    }

    function bindEvents() {
        const modal = document.getElementById('qlkj-setting-modal');
        if (!modal) return;

        const mask = document.getElementById('qlkj-setting-mask');
        if (mask && mask.dataset.bound !== '1') {
            mask.dataset.bound = '1';
            mask.addEventListener('click', closeModal);
        }

        const backBtn = document.getElementById('qlkj-setting-back');
        if (backBtn && backBtn.dataset.bound !== '1') {
            backBtn.dataset.bound = '1';
            backBtn.addEventListener('click', closeModal);
        }

        const xiuluoSwitch = document.getElementById('xiuluo-switch');
        if (xiuluoSwitch && xiuluoSwitch.dataset.bound !== '1') {
            xiuluoSwitch.dataset.bound = '1';
            xiuluoSwitch.addEventListener('change', function (e) {
                settingsService.setSetting('xiuluoEnabled', !!(e.target && e.target.checked));
                refreshXiuluoDetailPanel();
                window.dispatchEvent(new CustomEvent('qlkj-setting-changed', {
                    detail: { key: 'xiuluoEnabled', value: !!(e.target && e.target.checked) }
                }));
            });
        }

        const xiuluoFloodSwitch = document.getElementById('xiuluo-flood-switch');
        if (xiuluoFloodSwitch && xiuluoFloodSwitch.dataset.bound !== '1') {
            xiuluoFloodSwitch.dataset.bound = '1';
            xiuluoFloodSwitch.addEventListener('change', function (e) {
                settingsService.setSetting('xiuluoScreenFloodEnabled', !!(e.target && e.target.checked));
                refreshXiuluoDetailPanel();
                window.dispatchEvent(new CustomEvent('qlkj-setting-changed', {
                    detail: { key: 'xiuluoScreenFloodEnabled', value: !!(e.target && e.target.checked) }
                }));
            });
        }

        const xiuluoFloodMinutes = document.getElementById('xiuluo-flood-minutes');
        if (xiuluoFloodMinutes && xiuluoFloodMinutes.dataset.bound !== '1') {
            xiuluoFloodMinutes.dataset.bound = '1';
            xiuluoFloodMinutes.addEventListener('change', function (e) {
                const value = normalizeFloodMinutes(e.target && e.target.value);
                if (e.target) e.target.value = String(value);
                settingsService.setSetting('xiuluoScreenFloodMinutes', value);
                window.dispatchEvent(new CustomEvent('qlkj-setting-changed', {
                    detail: { key: 'xiuluoScreenFloodMinutes', value: value }
                }));
            });
            xiuluoFloodMinutes.addEventListener('input', function (e) {
                settingsService.setSetting('xiuluoScreenFloodMinutes', normalizeFloodMinutes(e.target && e.target.value));
            });
        }

        const autoRoleMoodDiarySwitch = document.getElementById('auto-role-mood-diary-switch');
        if (autoRoleMoodDiarySwitch && autoRoleMoodDiarySwitch.dataset.bound !== '1') {
            autoRoleMoodDiarySwitch.dataset.bound = '1';
            autoRoleMoodDiarySwitch.addEventListener('change', function (e) {
                settingsService.setSetting('autoRoleMoodDiaryEnabled', !!(e.target && e.target.checked));
                window.dispatchEvent(new CustomEvent('qlkj-setting-changed', {
                    detail: { key: 'autoRoleMoodDiaryEnabled', value: !!(e.target && e.target.checked) }
                }));
            });
        }

        const roleCommentSwitch = document.getElementById('role-comment-user-diary-switch');
        if (roleCommentSwitch && roleCommentSwitch.dataset.bound !== '1') {
            roleCommentSwitch.dataset.bound = '1';
            roleCommentSwitch.addEventListener('change', function (e) {
                settingsService.setSetting('roleCommentOnUserDiaryEnabled', !!(e.target && e.target.checked));
                window.dispatchEvent(new CustomEvent('qlkj-setting-changed', {
                    detail: { key: 'roleCommentOnUserDiaryEnabled', value: !!(e.target && e.target.checked) }
                }));
            });
        }

        const unlinkBtn = document.getElementById('qlkj-unlink-btn');
        if (unlinkBtn && unlinkBtn.dataset.bound !== '1') {
            unlinkBtn.dataset.bound = '1';
            unlinkBtn.addEventListener('click', function () {
                closeModal();
                window.dispatchEvent(new CustomEvent('qlkj-unlink-request'));
            });
        }
    }

    function openModal() {
        createModal();
        const modal = document.getElementById('qlkj-setting-modal');
        if (!modal) return;
        const xiuluoSwitch = document.getElementById('xiuluo-switch');
        if (xiuluoSwitch) {
            xiuluoSwitch.checked = settingsService.isXiuluoEnabled();
        }
        const xiuluoFloodSwitch = document.getElementById('xiuluo-flood-switch');
        if (xiuluoFloodSwitch) {
            xiuluoFloodSwitch.checked = settingsService.getSetting('xiuluoScreenFloodEnabled') === true;
        }
        const xiuluoFloodMinutes = document.getElementById('xiuluo-flood-minutes');
        if (xiuluoFloodMinutes) {
            xiuluoFloodMinutes.value = String(settingsService.getXiuluoScreenFloodMinutes
                ? settingsService.getXiuluoScreenFloodMinutes()
                : normalizeFloodMinutes(settingsService.getSetting('xiuluoScreenFloodMinutes')));
        }
        refreshXiuluoDetailPanel();
        const autoRoleMoodDiarySwitch = document.getElementById('auto-role-mood-diary-switch');
        if (autoRoleMoodDiarySwitch) {
            autoRoleMoodDiarySwitch.checked = settingsService.isAutoRoleMoodDiaryEnabled();
        }
        const roleCommentSwitch = document.getElementById('role-comment-user-diary-switch');
        if (roleCommentSwitch) {
            roleCommentSwitch.checked = settingsService.isRoleCommentOnUserDiaryEnabled();
        }
        modal.hidden = false;
        requestAnimationFrame(function () {
            modal.classList.add('is-open');
        });
    }

    function addStyles() {
        if (document.getElementById('qlkj-setting-styles')) return;
        const style = document.createElement('style');
        style.id = 'qlkj-setting-styles';
        style.textContent =
            '.qlkj-setting-modal{position:fixed;inset:0;z-index:100001;display:flex;align-items:flex-end;justify-content:center;}' +
            '.qlkj-setting-modal[hidden]{display:none;}' +
            '.qlkj-setting-mask{position:absolute;inset:0;background:rgba(0,0,0,0.4);opacity:0;transition:opacity 300ms ease;}' +
            '.qlkj-setting-modal.is-open .qlkj-setting-mask{opacity:1;}' +
            '.qlkj-setting-card{width:100%;max-width:480px;height:70vh;max-height:560px;border-radius:20px 20px 0 0;background:#fff;position:relative;display:flex;flex-direction:column;transform:translateY(100%);transition:transform 300ms cubic-bezier(0.16,1,0.3,1);}' +
            '.qlkj-setting-modal.is-open .qlkj-setting-card{transform:translateY(0);}' +
            '.qlkj-setting-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(0,0,0,0.06);}' +
            '.qlkj-setting-back{width:32px;height:32px;border:none;background:transparent;color:#333;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:8px;}' +
            '.qlkj-setting-back:active{background:rgba(0,0,0,0.05);}' +
            '.qlkj-setting-title{font-size:17px;font-weight:600;color:#111;}' +
            '.qlkj-setting-placeholder{width:32px;}' +
            '.qlkj-setting-content{flex:1;overflow-y:auto;padding:8px 0;}' +
            '.qlkj-setting-item{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;cursor:pointer;transition:background 150ms ease;}' +
            '.qlkj-setting-subgroup{background:#f8f8f8;border-top:1px solid rgba(0,0,0,0.04);border-bottom:1px solid rgba(0,0,0,0.04);}' +
            '.qlkj-setting-subgroup[hidden]{display:none;}' +
            '.qlkj-setting-item-sub{padding-left:32px;}' +
            '.qlkj-setting-item:active{background:rgba(0,0,0,0.03);}' +
            '.qlkj-setting-item-left{flex:1;min-width:0;}' +
            '.qlkj-setting-item-title{font-size:16px;font-weight:500;color:#111;margin-bottom:4px;}' +
            '.qlkj-setting-item-desc{font-size:13px;color:#888;line-height:1.4;}' +
            '.qlkj-setting-item-danger .qlkj-setting-item-title{color:#dc2626;}' +
            '.qlkj-setting-arrow{font-size:14px;color:#999;margin-left:8px;}' +
            '.qlkj-setting-divider{height:8px;background:#f5f5f5;margin:8px 0;}' +
            '.qlkj-setting-switch{position:relative;display:inline-block;width:50px;height:30px;flex-shrink:0;margin-left:12px;}' +
            '.qlkj-setting-switch input{opacity:0;width:0;height:0;}' +
            '.qlkj-setting-number-wrap{display:flex;align-items:center;gap:6px;margin-left:12px;flex-shrink:0;}' +
            '.qlkj-setting-number{width:58px;height:32px;border:1px solid rgba(0,0,0,0.12);border-radius:8px;text-align:center;font-size:14px;color:#222;background:#fff;}' +
            '.qlkj-setting-number:disabled{background:#eee;color:#aaa;}' +
            '.qlkj-setting-number-unit{font-size:13px;color:#888;}' +
            '.qlkj-setting-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#e5e5e5;transition:250ms;border-radius:30px;}' +
            '.qlkj-setting-slider:before{position:absolute;content:"";height:26px;width:26px;left:2px;bottom:2px;background-color:#fff;transition:250ms;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.15);}' +
            '.qlkj-setting-switch input:checked + .qlkj-setting-slider{background-color:#10b981;}' +
            '.qlkj-setting-switch input:checked + .qlkj-setting-slider:before{transform:translateX(20px);}' +
            '@media (min-width: 480px){.qlkj-setting-modal{align-items:center;}.qlkj-setting-card{border-radius:20px;height:auto;max-height:80vh;transform:translateY(20px);opacity:0;}.qlkj-setting-modal.is-open .qlkj-setting-card{transform:translateY(0);opacity:1;}}';
        document.head.appendChild(style);
    }

    function init() {
        addStyles();
    }

    window.qlkjSetting = {
        init: init,
        open: openModal,
        close: closeModal,
        get: settingsService.getSetting,
        set: settingsService.setSetting,
        isXiuluoEnabled: settingsService.isXiuluoEnabled,
        isXiuluoScreenFloodEnabled: settingsService.isXiuluoScreenFloodEnabled,
        getXiuluoScreenFloodMinutes: settingsService.getXiuluoScreenFloodMinutes,
        isAutoRoleMoodDiaryEnabled: settingsService.isAutoRoleMoodDiaryEnabled,
        isRoleCommentOnUserDiaryEnabled: settingsService.isRoleCommentOnUserDiaryEnabled,
        loadSettings: settingsService.loadSettings
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
