(function () {
    'use strict';

    function safeJsonParse(text, fallback) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return fallback;
        }
    }

    function extractJsonObject(text) {
        const raw = String(text || '').trim();
        if (!raw) return null;
        const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
        const candidate = fenced && fenced[1] ? String(fenced[1]).trim() : raw;
        const first = candidate.indexOf('{');
        const last = candidate.lastIndexOf('}');
        if (first === -1 || last === -1 || last <= first) return null;
        return safeJsonParse(candidate.slice(first, last + 1), null);
    }

    function getParentWindow() {
        try {
            return window.parent && window.parent !== window ? window.parent : window;
        } catch (e) {
            return window;
        }
    }

    function getRoleProfile(roleId) {
        const rid = String(roleId || '').trim();
        if (!rid) return {};
        try {
            const pw = getParentWindow();
            const profiles = (pw && pw.charProfiles) || window.charProfiles || {};
            const profile = profiles && profiles[rid] && typeof profiles[rid] === 'object' ? profiles[rid] : {};
            return profile || {};
        } catch (e) {
            return {};
        }
    }

    function isAutoTranslateEnabled(roleId) {
        const rid = String(roleId || '').trim();
        if (!rid) return false;
        try {
            const pw = getParentWindow();
            if (pw && typeof pw.isAutoTranslateEnabled === 'function') return !!pw.isAutoTranslateEnabled(rid);
        } catch (e) { }
        try {
            const pw = getParentWindow();
            if (pw && typeof pw.getCurrentChatSettings === 'function') {
                const settings = pw.getCurrentChatSettings(rid);
                if (settings && typeof settings.autoTranslate === 'boolean') return settings.autoTranslate;
            }
        } catch (e2) { }
        try {
            return localStorage.getItem('chat_auto_translate') === 'true';
        } catch (e3) {
            return false;
        }
    }

    function isLikelyForeignLanguageText(text) {
        const raw = String(text || '').trim();
        if (!raw) return false;
        const lower = raw.toLowerCase();
        if (/(中文|汉语|普通话|国语|chinese|mandarin|zh[-_ ]?(cn|hans)?)/i.test(lower)) return false;
        if (/(english|en[-_ ]?us|en[-_ ]?gb|japanese|日本語|日语|korean|한국어|韩语|french|français|法语|german|deutsch|德语|spanish|español|西班牙语|italian|italiano|意大利语|russian|русский|俄语|arabic|العربية|阿拉伯语|thai|ไทย|泰语|vietnamese|tiếng việt|越南语|portuguese|português|葡萄牙语|cantonese|粤语|廣東話|繁體|繁体|traditional chinese)/i.test(lower)) return true;
        const kanaCount = (raw.match(/[\u3040-\u30ff]/g) || []).length;
        const hangulCount = (raw.match(/[\uac00-\ud7af]/g) || []).length;
        const cyrillicCount = (raw.match(/[\u0400-\u04ff]/g) || []).length;
        const arabicCount = (raw.match(/[\u0600-\u06ff]/g) || []).length;
        if (kanaCount || hangulCount || cyrillicCount || arabicCount) return true;
        const cjkCount = (raw.match(/[\u4e00-\u9fff]/g) || []).length;
        const latinCount = (raw.match(/[A-Za-z]/g) || []).length;
        return latinCount >= 18 && latinCount > cjkCount * 2;
    }

    function isLikelyForeignRole(roleId) {
        const p = getRoleProfile(roleId);
        const candidates = [
            p.language,
            p.lang,
            p.nativeLanguage,
            p.native_language,
            p.spokenLanguage,
            p.spoken_language,
            p.locale,
            p.nationality,
            p.desc,
            p.description,
            p.persona,
            p.prompt,
            p.system_prompt,
            p.systemPrompt,
            p.scenario,
            p.first_mes,
            p.mes_example,
            p.creator_notes,
            p.post_history_instructions,
            Array.isArray(p.tags) ? p.tags.join(' ') : String(p.tags || '')
        ];
        for (let i = 0; i < candidates.length; i++) {
            if (isLikelyForeignLanguageText(candidates[i])) return true;
        }
        return false;
    }

    function buildInlineBilingualOutputPrompt(roleId, options) {
        const rid = String(roleId || '').trim();
        if (!rid) return '';
        if (!isAutoTranslateEnabled(rid) && !isLikelyForeignRole(rid)) return '';
        const opts = options && typeof options === 'object' ? options : {};
        const lineBreakMode = opts.format === 'line_break' || opts.lineBreak === true;
        const fieldText = opts.jsonField
            ? '如果当前任务要求 JSON，只有 `' + opts.jsonField + '` 这类正文显示字段使用这个格式；其他枚举字段仍按任务要求输出。'
            : lineBreakMode
                ? '如果当前任务要求纯文本，先完整输出角色真正写出的外语原文；空一行或另起一行后，紧接着输出完整的简体中文译文。'
                : '如果当前任务要求纯文本，整段可见正文都按这个格式输出。';
        const formatRule = lineBreakMode
            ? '如果你按角色设定要说外语、繁体、粤语、日语、韩语等非简体中文表达，必须直接写成：外语原文换行简体中文翻译。不要使用括号翻译。'
            : '如果你按角色设定要说外语、繁体、粤语、日语、韩语等非简体中文表达，必须直接写成：外语原文（简体中文翻译）。';
        const splitRule = lineBreakMode
            ? '不要只写外语，也不要只写中文译文；不要加“原文/翻译/中文翻译”标题；不要把每句话都拆成解释，保持书信体完整。'
            : '不要只写外语，也不要只写中文译文；不要把原文和翻译拆成两条；不要加“原文/翻译/中文翻译”标题。';
        return [
            '【情侣空间外语角色显示规则】',
            '当前页面不是微信聊天气泡，不能渲染 `translated_text`、`foreign`、`translation` 这类对象。',
            formatRule,
            splitRule,
            '如果这句话按人设本来就是简体中文，就直接写简体中文，不要硬翻译。',
            fieldText
        ].join('\n');
    }

    function normalizeTranslatedPayload(value, options) {
        if (!value || typeof value !== 'object') return '';
        const opts = options && typeof options === 'object' ? options : {};
        const foreign = value.foreign != null
            ? value.foreign
            : (value.original != null ? value.original : value.source);
        const translation = value.translation != null
            ? value.translation
            : (value.zh != null ? value.zh : value.cn);
        const foreignText = String(foreign || '').trim();
        const translationText = String(translation || '').trim();
        if (foreignText && translationText && foreignText !== translationText) {
            if (opts.format === 'line_break' || opts.lineBreak === true) {
                return foreignText + '\n\n' + translationText;
            }
            return foreignText + '（' + translationText + '）';
        }
        if (foreignText || translationText) return foreignText || translationText;
        if (typeof value.content === 'string') return value.content.trim();
        if (typeof value.text === 'string') return value.text.trim();
        if (typeof value.reply === 'string') return value.reply.trim();
        return '';
    }

    function normalizeAiReplyText(text) {
        try {
            if (typeof window.normalizeAiReplyText === 'function') {
                return String(window.normalizeAiReplyText(text) || '').trim();
            }
        } catch (e) { }
        const raw = String(text || '').trim();
        if (!raw) return '';
        const obj = extractJsonObject(raw);
        if (obj && typeof obj === 'object') {
            const translated = normalizeTranslatedPayload(obj);
            if (translated) return translated.trim();
            if (typeof obj.reply === 'string') return obj.reply.trim();
            if (typeof obj.text === 'string') return obj.text.trim();
            if (typeof obj.content === 'string') return obj.content.trim();
        }
        const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenced && fenced[1]) {
            const inner = String(fenced[1]).trim();
            if (inner) return inner;
        }
        return raw;
    }

    window.CoupleSpaceAiUtils = {
        safeJsonParse: safeJsonParse,
        extractJsonObject: extractJsonObject,
        isAutoTranslateEnabled: isAutoTranslateEnabled,
        isLikelyForeignRole: isLikelyForeignRole,
        buildInlineBilingualOutputPrompt: buildInlineBilingualOutputPrompt,
        normalizeTranslatedPayload: normalizeTranslatedPayload,
        normalizeAiReplyText: normalizeAiReplyText
    };
})();
