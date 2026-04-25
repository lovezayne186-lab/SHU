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
        normalizeAiReplyText: normalizeAiReplyText
    };
})();
