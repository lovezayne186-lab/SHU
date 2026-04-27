(function initMemoryArchiveEntriesOverride() {
    const STORAGE_KEY = 'wechat_memory_archive_v1';
    const MEMORY_SCHEMA_VERSION = 3;
    const CATEGORIES = ['likes', 'habits', 'events'];
    const VALID_SOURCES = {
        auto: true,
        manual: true,
        refined: true,
        migrated: true
    };
    const CATEGORY_DEFAULT_META = {
        likes: { kind: 'preference', importance: 0.66, confidence: 0.74, halfLifeDays: 45 },
        habits: { kind: 'habit', importance: 0.72, confidence: 0.74, halfLifeDays: 180 },
        events: { kind: 'event', importance: 0.8, confidence: 0.68, halfLifeDays: 14 }
    };
    const SUMMARY_CHUNK_SIZE = 120;
    const MEMORY_KEYWORD_STOP_WORDS = new Set([
        '今天', '昨天', '最近', '刚刚', '已经', '还是', '就是', '真的', '感觉', '我们',
        '你们', '他们', '这个', '那个', '一个', '因为', '所以', '然后', '但是', '如果',
        '用户', '自己', '一下', '没有', '不是', '可以', '有点', '这次', '那次', '现在'
    ]);

    window.memoryArchiveStore = window.memoryArchiveStore || {};

    function clamp01(value, fallback) {
        const n = Number(value);
        if (!isFinite(n)) return fallback;
        if (n < 0) return 0;
        if (n > 1) return 1;
        return n;
    }

    function normalizeTimestamp(value, fallback) {
        const n = Number(value);
        return isFinite(n) && n > 0 ? n : (fallback || 0);
    }

    function loadStore() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                window.memoryArchiveStore = JSON.parse(raw) || {};
            }
        } catch (e) {
            console.error('[MemoryArchiveV2] load failed', e);
            window.memoryArchiveStore = {};
        }
    }

    function saveStore() {
        try {
            const json = JSON.stringify(window.memoryArchiveStore || {});
            localStorage.setItem(STORAGE_KEY, json);
            try {
                localStorage.setItem('ai_memory_archives', json);
            } catch (e2) { }
        } catch (e) {
            console.error('[MemoryArchiveV2] save failed', e);
        }
    }

    function normalizeCategory(category) {
        const key = String(category || '').trim().toLowerCase();
        return CATEGORIES.indexOf(key) >= 0 ? key : '';
    }

    function normalizeLine(text) {
        let out = String(text == null ? '' : text)
            .replace(/\r/g, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^[-•\s]+/, '')
            .trim();
        if (!out) return '';
        if (out.indexOf('（示例）') !== -1 || out.indexOf('开启“自动总结”后') !== -1) return '';
        return out;
    }

    function normalizeDedupKey(category, content) {
        const cat = normalizeCategory(category);
        const text = normalizeLine(content)
            .replace(/[，,。.!！？?；;：:、"“”'‘’（）()【】\[\]<>《》]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        return cat && text ? (cat + '::' + text) : '';
    }

    function makeEntryId() {
        return 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    }

    function inferEntryKind(category, rawKind) {
        const kind = String(rawKind || '').trim().toLowerCase();
        if (kind) return kind;
        return CATEGORY_DEFAULT_META[category] ? CATEGORY_DEFAULT_META[category].kind : 'memory';
    }

    function parseMonthDayToTimestamp(month, day, baseTimestamp) {
        const base = new Date(normalizeTimestamp(baseTimestamp, Date.now()));
        const year = base.getFullYear();
        const d = new Date(year, Number(month) - 1, Number(day), 12, 0, 0, 0);
        const ts = d.getTime();
        return isFinite(ts) && ts > 0 ? ts : 0;
    }

    function inferEventTemporalMeta(content, fallbackTimestamp) {
        const text = normalizeLine(content);
        const range = text.match(/^(?:(?:\d{2,4}年)?)(\d{1,2})月(\d{1,2})日\s*[-~至到]\s*(?:(?:\d{2,4}年)?)(\d{1,2})月(\d{1,2})日[：:]/);
        if (range) {
            const startAt = parseMonthDayToTimestamp(range[1], range[2], fallbackTimestamp);
            const endAt = parseMonthDayToTimestamp(range[3], range[4], fallbackTimestamp || startAt);
            return {
                happenedAt: endAt || startAt || normalizeTimestamp(fallbackTimestamp, 0),
                startAt: startAt || endAt || normalizeTimestamp(fallbackTimestamp, 0),
                endAt: endAt || startAt || normalizeTimestamp(fallbackTimestamp, 0)
            };
        }
        const single = text.match(/^(?:(?:\d{2,4}年)?)(\d{1,2})月(\d{1,2})日[：:]/);
        if (single) {
            const happenedAt = parseMonthDayToTimestamp(single[1], single[2], fallbackTimestamp);
            return {
                happenedAt: happenedAt || normalizeTimestamp(fallbackTimestamp, 0),
                startAt: happenedAt || normalizeTimestamp(fallbackTimestamp, 0),
                endAt: happenedAt || normalizeTimestamp(fallbackTimestamp, 0)
            };
        }
        const ts = normalizeTimestamp(fallbackTimestamp, 0);
        return { happenedAt: ts, startAt: ts, endAt: ts };
    }

    function inferTemporalMeta(category, content, createdAt, updatedAt, rawEntry) {
        const fallbackTs = normalizeTimestamp(updatedAt, normalizeTimestamp(createdAt, Date.now()));
        const raw = rawEntry && typeof rawEntry === 'object' ? rawEntry : {};
        const happenedAt = normalizeTimestamp(raw.happenedAt, 0);
        const startAt = normalizeTimestamp(raw.startAt, 0);
        const endAt = normalizeTimestamp(raw.endAt, 0);
        if (category === 'events') {
            const inferred = inferEventTemporalMeta(content, fallbackTs);
            return {
                happenedAt: happenedAt || inferred.happenedAt || fallbackTs,
                startAt: startAt || inferred.startAt || fallbackTs,
                endAt: endAt || inferred.endAt || happenedAt || fallbackTs
            };
        }
        return {
            happenedAt: happenedAt || fallbackTs,
            startAt: startAt || 0,
            endAt: endAt || 0
        };
    }

    function buildEntryDraft(category, content, source, options) {
        const cat = normalizeCategory(category);
        const clean = normalizeLine(content);
        if (!cat || !clean) return null;
        const opts = options && typeof options === 'object' ? options : {};
        const now = Date.now();
        const createdAt = normalizeTimestamp(opts.createdAt, normalizeTimestamp(opts.segmentEndTs, now));
        const updatedAt = normalizeTimestamp(opts.updatedAt, createdAt);
        const base = {
            category: cat,
            content: clean,
            source: source,
            kind: inferEntryKind(cat, opts.kind),
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastMentionedAt: normalizeTimestamp(opts.lastMentionedAt, updatedAt),
            lastConfirmedAt: normalizeTimestamp(opts.lastConfirmedAt, updatedAt),
            importance: clamp01(opts.importance, CATEGORY_DEFAULT_META[cat].importance),
            confidence: clamp01(opts.confidence, CATEGORY_DEFAULT_META[cat].confidence),
            evidenceCount: Math.max(1, parseInt(opts.evidenceCount, 10) || 1)
        };
        if (cat === 'events') {
            const inferred = inferEventTemporalMeta(clean, normalizeTimestamp(opts.segmentEndTs, updatedAt));
            base.happenedAt = normalizeTimestamp(opts.happenedAt, inferred.happenedAt || updatedAt);
            base.startAt = normalizeTimestamp(opts.startAt, normalizeTimestamp(opts.segmentStartTs, inferred.startAt || base.happenedAt));
            base.endAt = normalizeTimestamp(opts.endAt, normalizeTimestamp(opts.segmentEndTs, inferred.endAt || base.happenedAt));
        }
        return base;
    }

    function normalizeEntry(rawEntry, fallbackCategory, fallbackSource) {
        if (!rawEntry) return null;
        const category = normalizeCategory(rawEntry.category || fallbackCategory);
        if (!category) return null;
        const content = normalizeLine(rawEntry.content !== undefined ? rawEntry.content : rawEntry);
        if (!content) return null;
        const now = Date.now();
        const createdAt = Number(rawEntry.createdAt);
        const updatedAt = Number(rawEntry.updatedAt);
        const sourceKey = String(rawEntry.source || fallbackSource || 'manual').trim();
        const temporalMeta = inferTemporalMeta(category, content, createdAt, updatedAt, rawEntry);
        return {
            id: String(rawEntry.id || makeEntryId()),
            category: category,
            kind: inferEntryKind(category, rawEntry.kind),
            content: content,
            source: VALID_SOURCES[sourceKey] ? sourceKey : (fallbackSource || 'manual'),
            createdAt: Number.isFinite(createdAt) ? createdAt : now,
            updatedAt: Number.isFinite(updatedAt) ? updatedAt : (Number.isFinite(createdAt) ? createdAt : now),
            happenedAt: temporalMeta.happenedAt,
            startAt: temporalMeta.startAt,
            endAt: temporalMeta.endAt,
            lastMentionedAt: normalizeTimestamp(rawEntry.lastMentionedAt, Number.isFinite(updatedAt) ? updatedAt : (Number.isFinite(createdAt) ? createdAt : now)),
            lastConfirmedAt: normalizeTimestamp(rawEntry.lastConfirmedAt, Number.isFinite(updatedAt) ? updatedAt : (Number.isFinite(createdAt) ? createdAt : now)),
            importance: clamp01(rawEntry.importance, CATEGORY_DEFAULT_META[category].importance),
            confidence: clamp01(rawEntry.confidence, CATEGORY_DEFAULT_META[category].confidence),
            evidenceCount: Math.max(1, parseInt(rawEntry.evidenceCount, 10) || 1)
        };
    }

    function normalizeEntries(entries) {
        const list = Array.isArray(entries) ? entries : [];
        const out = [];
        const keyMap = new Map();
        list.forEach(function (rawEntry) {
            const entry = normalizeEntry(rawEntry, rawEntry && rawEntry.category, rawEntry && rawEntry.source);
            if (!entry) return;
            const dedupKey = normalizeDedupKey(entry.category, entry.content);
            if (!dedupKey) return;
            if (keyMap.has(dedupKey)) {
                const existing = out[keyMap.get(dedupKey)];
                existing.updatedAt = Math.max(Number(existing.updatedAt) || 0, Number(entry.updatedAt) || 0, Date.now());
                existing.createdAt = Math.min(Number(existing.createdAt) || existing.updatedAt, Number(entry.createdAt) || entry.updatedAt);
                existing.lastMentionedAt = Math.max(Number(existing.lastMentionedAt) || 0, Number(entry.lastMentionedAt) || 0, Number(existing.updatedAt) || 0);
                existing.lastConfirmedAt = Math.max(Number(existing.lastConfirmedAt) || 0, Number(entry.lastConfirmedAt) || 0, Number(existing.updatedAt) || 0);
                existing.importance = Math.max(clamp01(existing.importance, 0), clamp01(entry.importance, 0));
                existing.confidence = Math.max(clamp01(existing.confidence, 0), clamp01(entry.confidence, 0));
                existing.evidenceCount = Math.max(1, (parseInt(existing.evidenceCount, 10) || 1) + (parseInt(entry.evidenceCount, 10) || 1));
                if (entry.happenedAt) {
                    existing.happenedAt = existing.happenedAt
                        ? Math.min(Number(existing.happenedAt) || entry.happenedAt, Number(entry.happenedAt) || existing.happenedAt)
                        : entry.happenedAt;
                }
                if (entry.startAt) {
                    existing.startAt = existing.startAt
                        ? Math.min(Number(existing.startAt) || entry.startAt, Number(entry.startAt) || existing.startAt)
                        : entry.startAt;
                }
                if (entry.endAt) existing.endAt = Math.max(Number(existing.endAt) || 0, Number(entry.endAt) || 0);
                if (!existing.kind && entry.kind) existing.kind = entry.kind;
                if (existing.source === 'migrated' && entry.source !== 'migrated') existing.source = entry.source;
                if (String(entry.content || '').length > String(existing.content || '').length) {
                    existing.content = entry.content;
                }
                return;
            }
            keyMap.set(dedupKey, out.length);
            out.push(entry);
        });
        out.sort(function (a, b) {
            const aTime = Number(a.updatedAt) || Number(a.createdAt) || 0;
            const bTime = Number(b.updatedAt) || Number(b.createdAt) || 0;
            if (aTime !== bTime) return aTime - bTime;
            return String(a.id || '').localeCompare(String(b.id || ''));
        });
        return out;
    }

    function parseTextLines(text) {
        return String(text || '')
            .split('\n')
            .map(normalizeLine)
            .filter(Boolean);
    }

    function ensureArchiveMeta(archive) {
        if (!archive.meta || typeof archive.meta !== 'object') archive.meta = {};
        archive.meta.schemaVersion = MEMORY_SCHEMA_VERSION;
        if (typeof archive.meta.lastProcessedIndex !== 'number' || !isFinite(archive.meta.lastProcessedIndex)) archive.meta.lastProcessedIndex = 0;
        if (typeof archive.meta.updatedAt !== 'number' || !isFinite(archive.meta.updatedAt)) archive.meta.updatedAt = Date.now();
        if (typeof archive.meta.summaryInProgress !== 'boolean') archive.meta.summaryInProgress = false;
        if (typeof archive.meta.refineInProgress !== 'boolean') archive.meta.refineInProgress = false;
    }

    function syncArchiveFields(archive) {
        archive.entries = normalizeEntries(archive.entries);
        const grouped = { likes: [], habits: [], events: [] };
        archive.entries.forEach(function (entry) {
            if (!entry || !grouped[entry.category]) return;
            grouped[entry.category].push('- ' + normalizeLine(entry.content));
        });
        archive.likesText = grouped.likes.join('\n');
        archive.habitsText = grouped.habits.join('\n');
        archive.eventsText = grouped.events.join('\n');
        ensureArchiveMeta(archive);
        return archive;
    }

    function ensureArchive(roleId) {
        const rid = String(roleId || window.currentChatRole || '').trim();
        if (!rid) return null;
        if (!window.memoryArchiveStore[rid] || typeof window.memoryArchiveStore[rid] !== 'object') {
            window.memoryArchiveStore[rid] = {
                entries: [],
                likesText: '',
                habitsText: '',
                eventsText: '',
                meta: { lastProcessedIndex: 0, updatedAt: Date.now(), summaryInProgress: false, refineInProgress: false }
            };
        }
        const archive = window.memoryArchiveStore[rid];
        ensureArchiveMeta(archive);
        if (!Array.isArray(archive.entries)) archive.entries = [];
        if (!archive.entries.length) {
            const migrated = [];
            parseTextLines(archive.likesText).forEach(function (content) { migrated.push({ category: 'likes', content: content, source: 'migrated' }); });
            parseTextLines(archive.habitsText).forEach(function (content) { migrated.push({ category: 'habits', content: content, source: 'migrated' }); });
            parseTextLines(archive.eventsText).forEach(function (content) { migrated.push({ category: 'events', content: content, source: 'migrated' }); });
            if (migrated.length) archive.entries = migrated;
        }
        syncArchiveFields(archive);
        window.memoryArchiveStore[rid] = archive;
        return archive;
    }

    function persistArchive(roleId, archive) {
        const rid = String(roleId || window.currentChatRole || '').trim();
        if (!rid || !archive) return;
        window.memoryArchiveStore[rid] = syncArchiveFields(archive);
        saveStore();
    }

    function capLines(text, maxLines) {
        const lines = String(text || '')
            .split('\n')
            .map(function (line) { return line.trim(); })
            .filter(Boolean);
        const limit = Math.max(0, Number(maxLines) || 0);
        if (!limit || lines.length <= limit) return lines.join('\n');
        return lines.slice(lines.length - limit).join('\n');
    }

    function getEntriesByCategory(archive, category) {
        const cat = normalizeCategory(category);
        return normalizeEntries(archive && archive.entries).filter(function (entry) {
            return entry.category === cat;
        });
    }

    function buildArchiveSections(roleId, options) {
        loadStore();
        const archive = ensureArchive(roleId);
        const eventsEntries = archive ? getEntriesByCategory(archive, 'events') : [];
        const sections = {
            archive: archive,
            entries: archive ? normalizeEntries(archive.entries) : [],
            likesEntries: archive ? getEntriesByCategory(archive, 'likes') : [],
            habitsEntries: archive ? getEntriesByCategory(archive, 'habits') : [],
            eventsEntries: eventsEntries,
            likesText: archive ? archive.likesText || '' : '',
            habitsText: archive ? archive.habitsText || '' : '',
            eventsText: eventsEntries.map(formatPromptEventLine).filter(Boolean).join('\n')
        };
        const opts = options && typeof options === 'object' ? options : {};
        const limits = opts.lineLimits && typeof opts.lineLimits === 'object' ? opts.lineLimits : {};
        if (limits.likes) sections.likesText = capLines(sections.likesText, limits.likes);
        if (limits.habits) sections.habitsText = capLines(sections.habitsText, limits.habits);
        if (limits.events) sections.eventsText = capLines(sections.eventsText, limits.events);
        return sections;
    }

    function renderArchive(tabKey) {
        const roleId = window.currentChatRole;
        const textEl = document.getElementById('memory-archive-text');
        if (!textEl) return;
        const sections = buildArchiveSections(roleId);
        const entries = tabKey === 'likes'
            ? sections.likesEntries
            : (tabKey === 'habits' ? sections.habitsEntries : sections.eventsEntries);
        const displayEntries = entries.slice().sort(function (a, b) {
            return getEntryPrimaryTimestamp(b) - getEntryPrimaryTimestamp(a);
        });

        textEl.innerHTML = '';
        if (!displayEntries.length) {
            textEl.innerHTML = '<div style="text-align:center; color:#999; margin-top:20px;">暂无记忆</div>';
            return;
        }

        const ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';
        displayEntries.forEach(function (entry) {
            const li = document.createElement('li');
            li.className = 'memory-archive-entry';
            li.setAttribute('data-entry-id', String(entry.id || ''));
            li.style.cursor = 'pointer';
            const contentEl = document.createElement('div');
            contentEl.className = 'memory-archive-entry-content';
            contentEl.innerText = normalizeLine(entry.content);
            li.appendChild(contentEl);
            if (tabKey === 'events') {
                const dateLabel = formatMemoryEntryDateRange(entry);
                if (dateLabel) {
                    const dateEl = document.createElement('div');
                    dateEl.className = 'memory-archive-entry-date';
                    dateEl.innerText = dateLabel;
                    li.appendChild(dateEl);
                }
            }
            li.onclick = function () {
                editArchiveEntry(tabKey, String(entry.id || ''));
            };
            ul.appendChild(li);
        });
        textEl.appendChild(ul);
    }

    function refreshArchiveModal(tabKey) {
        const modal = document.getElementById('memory-archive-modal');
        if (!modal || modal.style.display === 'none') return;
        const safeTab = normalizeCategory(tabKey) || window.currentMemoryArchiveTab || 'likes';
        window.currentMemoryArchiveTab = safeTab;
        const allTabs = modal.querySelectorAll('.memory-tab-item');
        allTabs.forEach(function (btn) {
            const key = btn.getAttribute('data-key');
            if (key === safeTab) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        renderArchive(safeTab);
    }

    function editArchiveEntry(tabKey, entryId) {
        const roleId = window.currentChatRole;
        if (!roleId) return;
        loadStore();
        const archive = ensureArchive(roleId);
        const entries = getEntriesByCategory(archive, tabKey);
        const target = entries.find(function (entry) {
            return String(entry.id || '') === String(entryId || '');
        });
        if (!target) return;
        const edited = window.prompt('编辑记忆（留空则删除）', normalizeLine(target.content));
        if (edited === null) return;
        const nextContent = normalizeLine(edited);
        archive.entries = normalizeEntries((archive.entries || []).map(function (entry) {
            if (!entry || String(entry.id || '') !== String(target.id || '')) return entry;
            if (!nextContent) return null;
            return Object.assign({}, entry, {
                content: nextContent,
                updatedAt: Date.now()
            });
        }).filter(Boolean));
        archive.meta.updatedAt = Date.now();
        persistArchive(roleId, archive);
        refreshArchiveModal(tabKey);
    }

    function normalizeText(text) {
        return String(text || '')
            .replace(/^「回复：[\s\S]*?」\s*\n-+\s*\n/i, '')
            .replace(/\r/g, '')
            .trim();
    }

    function formatMemoryDateLabel(timestamp) {
        const ts = Number(timestamp);
        if (!isFinite(ts) || ts <= 0) return '';
        const d = new Date(ts);
        return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    function formatMemoryFullDateLabel(timestamp) {
        const ts = Number(timestamp);
        if (!isFinite(ts) || ts <= 0) return '';
        const d = new Date(ts);
        return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    function formatMemoryEntryDateRange(entry) {
        if (!entry || typeof entry !== 'object') return '';
        const primaryTs = normalizeTimestamp(
            entry.happenedAt,
            normalizeTimestamp(entry.startAt, normalizeTimestamp(entry.endAt, 0))
        );
        return formatMemoryFullDateLabel(primaryTs);
    }

    function formatPromptEventLine(entry) {
        if (!entry || typeof entry !== 'object') return '';
        const content = normalizeLine(entry.content);
        if (!content) return '';
        const dateLabel = formatMemoryEntryDateRange(entry);
        return dateLabel
            ? ('- [发生时间：' + dateLabel + '] ' + content)
            : ('- ' + content);
    }

    function buildMemoryDatePrefix(startTimestamp, endTimestamp) {
        const startLabel = formatMemoryDateLabel(startTimestamp);
        const endLabel = formatMemoryDateLabel(endTimestamp);
        if (!startLabel && !endLabel) return '';
        if (!startLabel) return endLabel;
        if (!endLabel || startLabel === endLabel) return startLabel;
        return startLabel + '-' + endLabel;
    }

    function ensureEventDatePrefix(text, fallbackPrefix) {
        const clean = normalizeLine(text);
        if (!clean) return '';
        if (/^(?:(?:\d{2,4}年)?\d{1,2}月\d{1,2}日)(?:\s*[-~至到]\s*(?:(?:\d{2,4}年)?\d{1,2}月\d{1,2}日))?[：:]/.test(clean)) {
            return clean;
        }
        const stripped = clean.replace(/^(我们|今天|最近)[：:]?\s*/, '').trim();
        const prefix = String(fallbackPrefix || '').trim();
        return prefix ? (prefix + '：' + stripped) : stripped;
    }

    function containsAny(text, keywords) {
        const s = String(text || '');
        for (let i = 0; i < keywords.length; i++) {
            if (s.includes(keywords[i])) return true;
        }
        return false;
    }

    function isEmojiOnlyText(text) {
        const raw = String(text || '').trim();
        if (!raw) return false;
        const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
        const removed = raw.replace(emojiRegex, '').replace(/\s/g, '');
        return removed.length === 0 && !!raw.match(emojiRegex);
    }

    function isEmojiHeavyMessage(msg) {
        if (!msg) return false;
        if (msg.type === 'image' || msg.type === 'sticker') return true;
        if (msg.type !== 'text') return false;
        const text = normalizeText(msg.content);
        if (!text) return false;
        return isEmojiOnlyText(text) || text.length <= 2;
    }

    function buildEntriesFromBuckets(buckets, source, options) {
        const out = [];
        const opts = options && typeof options === 'object' ? options : {};
        CATEGORIES.forEach(function (category) {
            const list = buckets && Array.isArray(buckets[category]) ? buckets[category] : [];
            list.forEach(function (item) {
                const draft = buildEntryDraft(category, item, source, opts);
                if (!draft) return;
                out.push(draft);
            });
        });
        return out;
    }

    function appendEntriesToArchive(archive, entries) {
        if (!archive || !Array.isArray(entries) || !entries.length) {
            return { candidateCount: 0, addedCount: 0, updatedCount: 0, categoryCounts: { likes: 0, habits: 0, events: 0 } };
        }
        const beforeEntries = normalizeEntries(archive.entries || []);
        const beforeKeys = new Set(beforeEntries.map(function (entry) {
            return normalizeDedupKey(entry.category, entry.content);
        }).filter(Boolean));
        const candidateEntries = normalizeEntries(entries);
        const candidateKeys = new Set(candidateEntries.map(function (entry) {
            return normalizeDedupKey(entry.category, entry.content);
        }).filter(Boolean));
        archive.entries = normalizeEntries(beforeEntries.concat(candidateEntries));
        const categoryCounts = { likes: 0, habits: 0, events: 0 };
        let addedCount = 0;
        candidateEntries.forEach(function (entry) {
            const key = normalizeDedupKey(entry.category, entry.content);
            if (!key || beforeKeys.has(key)) return;
            beforeKeys.add(key);
            addedCount++;
            if (categoryCounts[entry.category] !== undefined) categoryCounts[entry.category]++;
        });
        return {
            candidateCount: candidateEntries.length,
            addedCount: addedCount,
            updatedCount: Math.max(0, candidateKeys.size - addedCount),
            categoryCounts: categoryCounts
        };
    }

    function buildSegmentText(segment) {
        return (Array.isArray(segment) ? segment : [])
            .filter(function (msg) { return msg && (msg.role === 'me' || msg.role === 'ai') && msg.content; })
            .slice(-1000)
            .map(function (msg) {
                const who = msg.role === 'me' ? '用户' : 'AI';
                if (msg.type === 'image') return who + ': [图片]';
                if (msg.type === 'sticker') return who + ': [表情包]';
                if (msg.type === 'voice') return who + ': [语音]';
                if (msg.type === 'location' || msg.type === 'location_share') return who + ': [位置]';
                return who + ': ' + normalizeText(msg.content);
            })
            .filter(Boolean)
            .join('\n');
    }

    function getArchiveSummaryChunk(history, archive, freq) {
        const list = Array.isArray(history) ? history : [];
        const meta = archive && archive.meta ? archive.meta : {};
        let start = Math.max(0, parseInt(meta.lastProcessedIndex, 10) || 0);
        const hasEntries = !!(archive && Array.isArray(archive.entries) && archive.entries.length);
        if (!hasEntries && list.length > 0 && start >= list.length) {
            start = Math.max(0, list.length - Math.max(SUMMARY_CHUNK_SIZE, Number(freq) || 20));
        }
        if (start > list.length) start = list.length;
        const end = Math.min(list.length, start + SUMMARY_CHUNK_SIZE);
        return {
            start: start,
            end: end,
            segment: list.slice(start, end)
        };
    }

    function scheduleArchiveCatchUp(roleId) {
        const rid = String(roleId || '').trim();
        if (!rid) return;
        window.setTimeout(function () {
            try {
                if (typeof window.maybeAutoUpdateMemoryArchive === 'function') {
                    window.maybeAutoUpdateMemoryArchive(rid);
                }
            } catch (e) { }
        }, 60);
    }

    function buildCopiedLineSet(segmentText) {
        const out = new Set();
        String(segmentText || '')
            .split('\n')
            .map(function (line) {
                return String(line || '')
                    .replace(/^(用户|AI|我|你|TA|Ta|[^:：\n]{1,24})[：:]\s*/, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            })
            .filter(function (line) { return line.length >= 8; })
            .forEach(function (line) {
                out.add(line);
                if (line.length > 18) out.add(line.slice(0, 60));
            });
        return out;
    }

    function isLikelyCopiedDialogueLine(text, copiedLineSet) {
        const raw = normalizeLine(text);
        if (!raw) return false;
        const withoutDate = raw
            .replace(/^(?:(?:\d{2,4}年)?\d{1,2}月\d{1,2}日)(?:\s*[-~至到]\s*(?:(?:\d{2,4}年)?\d{1,2}月\d{1,2}日))?[：:]\s*/, '')
            .trim();
        const body = withoutDate
            .replace(/^(用户|AI|我|你|TA|Ta|[^:：\n]{1,24})[：:]\s*/, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!body) return true;
        if (/^(用户|AI|TA|Ta)[：:]/.test(withoutDate)) return true;
        if (/[“”"「」『』]/.test(body) && body.length > 40) return true;
        if (copiedLineSet && copiedLineSet.has(body)) return true;
        if (copiedLineSet) {
            for (const line of copiedLineSet) {
                if (line.length >= 24) {
                    if (body === line) return true;
                    if (body.length >= 24 && (body.indexOf(line) >= 0 || line.indexOf(body) >= 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function filterApiLikes(items, userTextForDetect, segmentText) {
        return (items || [])
            .map(normalizeLine)
            .filter(Boolean);
    }

    function filterApiHabits(items, emojiHeavyRatio, segmentText) {
        return (items || [])
            .map(normalizeLine)
            .filter(Boolean);
    }

    function filterApiEvents(items, fallbackPrefix, segmentText) {
        const normalizeDatePrefix = function (item) {
            const withPrefix = ensureEventDatePrefix(item, fallbackPrefix);
            if (!withPrefix) return '';
            const prefix = String(fallbackPrefix || '').trim();
            if (!prefix) return withPrefix;
            const m = withPrefix.match(/^(?:(?:\d{2,4}年)?\d{1,2}月\d{1,2}日)(?:\s*[-~至到]\s*(?:(?:\d{2,4}年)?\d{1,2}月\d{1,2}日))?[：:]\s*(.*)$/);
            const body = m ? String(m[1] || '').trim() : String(withPrefix || '').trim();
            if (!body) return '';
            return prefix + '：' + body;
        };
        return (items || [])
            .map(normalizeDatePrefix)
            .filter(Boolean)
            .filter(function (s) { return normalizeLine(s); });
    }

    function getEntryPrimaryTimestamp(entry) {
        return normalizeTimestamp(
            entry && (
                entry.lastConfirmedAt ||
                entry.lastMentionedAt ||
                entry.endAt ||
                entry.happenedAt ||
                entry.updatedAt ||
                entry.createdAt
            ),
            0
        );
    }

    function tokenizeMemoryQueryText(text) {
        const tokens = String(text || '')
            .toLowerCase()
            .match(/[\u4e00-\u9fa5]{2,}|[a-z0-9]{2,}/g) || [];
        const seen = new Set();
        const out = [];
        for (let i = 0; i < tokens.length; i++) {
            const token = String(tokens[i] || '').trim();
            if (!token || MEMORY_KEYWORD_STOP_WORDS.has(token)) continue;
            if (seen.has(token)) continue;
            seen.add(token);
            out.push(token);
        }
        return out;
    }

    function buildPromptQueryKeywords(history) {
        const list = Array.isArray(history) ? history : [];
        const text = list
            .filter(function (msg) {
                return msg && typeof msg === 'object' && (msg.role === 'me' || msg.role === 'ai') && msg.content;
            })
            .slice(-12)
            .map(function (msg) { return normalizeText(msg.content); })
            .filter(Boolean)
            .join(' ');
        return tokenizeMemoryQueryText(text);
    }

    function getEntryRecencyScore(entry, nowTs) {
        const ts = getEntryPrimaryTimestamp(entry);
        if (!ts) return 0.45;
        const ageDays = Math.max(0, (normalizeTimestamp(nowTs, Date.now()) - ts) / 86400000);
        const category = normalizeCategory(entry && entry.category);
        const halfLife = CATEGORY_DEFAULT_META[category] ? CATEGORY_DEFAULT_META[category].halfLifeDays : 30;
        return 1 / (1 + (ageDays / Math.max(1, halfLife)));
    }

    function getEntryRelevanceScore(entry, queryKeywords) {
        const keywords = Array.isArray(queryKeywords) ? queryKeywords : [];
        if (!keywords.length) return 0;
        const content = String(entry && entry.content || '').toLowerCase();
        if (!content) return 0;
        let hits = 0;
        for (let i = 0; i < keywords.length; i++) {
            if (content.indexOf(keywords[i]) !== -1) hits++;
        }
        if (!hits) return 0;
        const cappedBase = Math.min(1, hits / Math.max(1, Math.min(keywords.length, 5)));
        return Math.min(1, cappedBase * 1.35);
    }

    function getEntrySourceBoost(entry) {
        const source = String(entry && entry.source || '').trim();
        if (source === 'manual') return 0.2;
        if (source === 'refined') return 0.18;
        if (source === 'auto') return 0.12;
        if (source === 'migrated') return 0.03;
        return 0;
    }

    function getHabitPersistenceBoost(entry) {
        if (normalizeCategory(entry && entry.category) !== 'habits') return 0;
        const content = normalizeLine(entry && entry.content);
        if (!content) return 0;
        if (/(几点|[0-2]?\d[:：点]|起床|睡觉|入睡|睡前|早睡|早起|晚睡|熬夜|失眠|作息|上班|上课|通勤|午睡|夜宵)/.test(content)) {
            return 0.22;
        }
        if (/(每天|经常|总是|通常|一般|习惯|固定)/.test(content)) {
            return 0.1;
        }
        return 0;
    }

    function scoreEntryForPrompt(entry, context) {
        const ctx = context && typeof context === 'object' ? context : {};
        const nowTs = normalizeTimestamp(ctx.nowTs, Date.now());
        const relevance = getEntryRelevanceScore(entry, ctx.queryKeywords);
        const recency = getEntryRecencyScore(entry, nowTs);
        const importance = clamp01(entry && entry.importance, 0.5);
        const confidence = clamp01(entry && entry.confidence, 0.5);
        const evidenceBoost = Math.min(0.16, Math.max(0, ((parseInt(entry && entry.evidenceCount, 10) || 1) - 1) * 0.03));
        const sourceBoost = getEntrySourceBoost(entry);
        const category = normalizeCategory(entry && entry.category);
        const primaryTs = getEntryPrimaryTimestamp(entry);
        const ageDays = primaryTs ? Math.max(0, (nowTs - primaryTs) / 86400000) : 999;
        let freshnessBoost = 0;
        if (category === 'events') {
            if (ageDays <= 1.2) freshnessBoost = 0.22;
            else if (ageDays <= 3.2) freshnessBoost = 0.14;
            else if (ageDays <= 7.2) freshnessBoost = 0.08;
        } else if (ageDays <= 7.2) {
            freshnessBoost = 0.04;
        }
        let score = importance * 0.34 + confidence * 0.16 + recency * 0.24 + relevance * 0.28 + evidenceBoost + sourceBoost + freshnessBoost;
        score += getHabitPersistenceBoost(entry);
        if (!relevance && category === 'events' && ageDays > 30) score -= 0.12;
        if (!relevance && category !== 'events' && importance < 0.55) score -= 0.05;
        return score;
    }

    function selectEntriesForPrompt(entries, limit, context) {
        const list = Array.isArray(entries) ? entries.slice() : [];
        const max = Math.max(0, Number(limit) || 0);
        if (!max || !list.length) return [];
        return list
            .map(function (entry) {
                return {
                    entry: entry,
                    score: scoreEntryForPrompt(entry, context)
                };
            })
            .sort(function (a, b) {
                if (b.score !== a.score) return b.score - a.score;
                return getEntryPrimaryTimestamp(b.entry) - getEntryPrimaryTimestamp(a.entry);
            })
            .slice(0, max)
            .sort(function (a, b) {
                return getEntryPrimaryTimestamp(a.entry) - getEntryPrimaryTimestamp(b.entry);
            })
            .map(function (item) { return item.entry; });
    }

    function buildPromptArchiveSections(roleId, options) {
        loadStore();
        const archive = ensureArchive(roleId);
        const opts = options && typeof options === 'object' ? options : {};
        const limits = opts.lineLimits && typeof opts.lineLimits === 'object' ? opts.lineLimits : {};
        const queryHistory = Array.isArray(opts.historyForApi)
            ? opts.historyForApi
            : (Array.isArray(opts.history) ? opts.history : []);
        const context = {
            nowTs: normalizeTimestamp(opts.nowTs, Date.now()),
            queryKeywords: buildPromptQueryKeywords(queryHistory)
        };
        const likesEntries = selectEntriesForPrompt(getEntriesByCategory(archive, 'likes'), limits.likes || 18, context);
        const habitsEntries = selectEntriesForPrompt(getEntriesByCategory(archive, 'habits'), limits.habits || 18, context);
        const eventsEntries = selectEntriesForPrompt(getEntriesByCategory(archive, 'events'), limits.events || 24, context);
        return {
            archive: archive,
            entries: likesEntries.concat(habitsEntries).concat(eventsEntries),
            likesEntries: likesEntries,
            habitsEntries: habitsEntries,
            eventsEntries: eventsEntries,
            likesText: likesEntries.map(function (entry) { return '- ' + normalizeLine(entry.content); }).join('\n'),
            habitsText: habitsEntries.map(function (entry) { return '- ' + normalizeLine(entry.content); }).join('\n'),
            eventsText: eventsEntries.map(formatPromptEventLine).filter(Boolean).join('\n')
        };
    }

    window.getMemoryArchiveSections = buildArchiveSections;
    window.getMemoryArchivePromptSections = buildPromptArchiveSections;
    window.getMemoryArchiveForRole = function (roleId) {
        loadStore();
        return ensureArchive(roleId);
    };

    window.openMemoryArchiveModal = function () {
        loadStore();
        const menu = document.getElementById('settings-menu-modal');
        if (menu) menu.style.display = 'none';
        if (typeof disableChatStatusBarInteraction === 'function') disableChatStatusBarInteraction();
        const modal = document.getElementById('memory-archive-modal');
        if (modal) modal.style.display = 'flex';

        const roleId = window.currentChatRole;
        if (roleId) {
            let profile = (window.charProfiles && window.charProfiles[roleId]) ? window.charProfiles[roleId] : null;
            if (!profile) {
                try {
                    const raw = localStorage.getItem('wechat_charProfiles');
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && parsed[roleId]) profile = parsed[roleId];
                    }
                } catch (e) { }
            }

            const nameEl = document.getElementById('memory-archive-name');
            const avatarEl = document.getElementById('memory-archive-avatar');
            const displayName = profile ? (profile.nickName || profile.name || profile.title) : '';
            if (nameEl) nameEl.innerText = displayName || '未知角色';
            if (avatarEl) avatarEl.src = (profile && profile.avatar) ? profile.avatar : 'assets/chushitouxiang.jpg';

            const msgs = (window.chatData && window.chatData[roleId]) ? window.chatData[roleId] : [];
            let msgCount = msgs.length;
            let tokenCount = 0;
            let daysCount = 0;
            if (msgs.length > 0) {
                const firstMsg = msgs[0];
                if (firstMsg && firstMsg.timestamp) {
                    const diff = Date.now() - firstMsg.timestamp;
                    daysCount = Math.ceil(diff / (1000 * 60 * 60 * 24));
                } else {
                    daysCount = 1;
                }
                if (typeof window.refreshActiveTokensUI === 'function') {
                    const stats = window.refreshActiveTokensUI(roleId, false);
                    tokenCount = stats.tokenCount;
                } else {
                    msgs.forEach(function (msg) {
                        if (!msg) return;
                        if (typeof window.estimateModelTokensFromMessageContent === 'function') {
                            tokenCount += window.estimateModelTokensFromMessageContent(msg.content);
                        } else if (typeof msg.content === 'string') {
                            tokenCount += Math.ceil(msg.content.length / 2);
                        }
                    });
                }
            }

            const daysEl = document.getElementById('stat-days');
            const msgsEl = document.getElementById('stat-messages');
            const tokensEl = document.getElementById('stat-tokens');
            if (daysEl) daysEl.innerText = String(daysCount);
            if (msgsEl) msgsEl.innerText = String(msgCount);
            if (tokensEl) tokensEl.innerText = tokenCount > 10000 ? (tokenCount / 1000).toFixed(1) + 'k' : String(tokenCount);
        }

        const initialTab = normalizeCategory(window.currentMemoryArchiveTab) || 'likes';
        window.currentMemoryArchiveTab = initialTab;
        refreshArchiveModal(initialTab);
        if (roleId) {
            window.setTimeout(function () {
                try {
                    if (typeof window.maybeAutoUpdateMemoryArchive === 'function') {
                        window.maybeAutoUpdateMemoryArchive(roleId);
                    }
                } catch (e) { }
            }, 30);
        }
    };

    window.closeMemoryArchiveModal = function () {
        const modal = document.getElementById('memory-archive-modal');
        if (modal) modal.style.display = 'none';
        if (typeof enableChatStatusBarInteraction === 'function') enableChatStatusBarInteraction();
        const menu = document.getElementById('settings-menu-modal');
        if (menu) menu.style.display = 'flex';
    };

    window.switchMemoryArchiveTab = function (tabKey) {
        window.currentMemoryArchiveTab = normalizeCategory(tabKey) || 'likes';
        refreshArchiveModal(window.currentMemoryArchiveTab);
    };

    window.addMemoryArchiveEntries = function (roleId, entries, defaultOptions) {
        const rid = String(roleId || window.currentChatRole || '').trim();
        if (!rid) return 0;
        const list = Array.isArray(entries) ? entries : [];
        if (!list.length) return 0;
        loadStore();
        const archive = ensureArchive(rid);
        if (!archive) return 0;
        const opts = defaultOptions && typeof defaultOptions === 'object' ? defaultOptions : {};
        const additions = list.map(function (rawEntry) {
            const raw = rawEntry && typeof rawEntry === 'object' ? rawEntry : { content: rawEntry };
            const category = normalizeCategory(raw.category || opts.category || 'events');
            const content = normalizeLine(raw.content);
            if (!category || !content) return null;
            const sourceKey = String(raw.source || opts.source || 'auto').trim();
            const entryOptions = Object.assign({}, opts, raw);
            return buildEntryDraft(
                category,
                content,
                VALID_SOURCES[sourceKey] ? sourceKey : 'auto',
                entryOptions
            );
        }).filter(Boolean);
        if (!additions.length) return 0;
        archive.entries = normalizeEntries((archive.entries || []).concat(additions));
        archive.meta.updatedAt = Date.now();
        persistArchive(rid, archive);
        refreshArchiveModal(window.currentMemoryArchiveTab || 'events');
        return additions.length;
    };

    window.addMemoryArchiveItem = function () {
        const roleId = window.currentChatRole;
        if (!roleId) return;
        loadStore();
        const inputEl = document.getElementById('memory-archive-input');
        if (!inputEl) return;
        const value = String(inputEl.value || '').trim();
        if (!value) return;
        const category = normalizeCategory(window.currentMemoryArchiveTab || 'likes');
        if (!category) return;
        const archive = ensureArchive(roleId);
        const additions = value
            .split('\n')
            .map(normalizeLine)
            .filter(Boolean)
            .map(function (content) {
                return { category: category, content: content, source: 'manual' };
            });
        archive.entries = normalizeEntries((archive.entries || []).concat(additions));
        archive.meta.updatedAt = Date.now();
        persistArchive(roleId, archive);
        inputEl.value = '';
        refreshArchiveModal(category);
    };

    function setManualMemorySummaryStatus(text, isError) {
        const statusEl = document.getElementById('manual-memory-summary-status');
        if (!statusEl) return;
        statusEl.innerText = String(text || '');
        statusEl.classList.toggle('is-error', !!isError);
    }

    function setManualMemorySummaryBusy(isBusy) {
        const btn = document.getElementById('manual-memory-summary-start');
        if (!btn) return;
        btn.disabled = !!isBusy;
        btn.innerText = isBusy ? '总结中...' : '开始总结';
    }

    function getManualMemorySummaryRange(total) {
        const startEl = document.getElementById('manual-memory-summary-start-index');
        const endEl = document.getElementById('manual-memory-summary-end-index');
        const max = Math.max(0, Number(total) || 0);
        let start = parseInt(startEl ? startEl.value : '', 10);
        let end = parseInt(endEl ? endEl.value : '', 10);
        if (isNaN(start)) start = 1;
        if (isNaN(end)) end = max;
        if (max <= 0) return null;
        start = Math.max(1, Math.min(max, start));
        end = Math.max(1, Math.min(max, end));
        if (end < start) {
            const tmp = start;
            start = end;
            end = tmp;
        }
        if (startEl) startEl.value = String(start);
        if (endEl) endEl.value = String(end);
        return { startIndex: start - 1, endIndex: end, startDisplay: start, endDisplay: end };
    }

    window.closeManualMemorySummaryModal = function () {
        const modal = document.getElementById('manual-memory-summary-modal');
        if (modal) modal.remove();
    };

    window.openManualMemorySummaryModal = function () {
        const rid = String(window.currentChatRole || '').trim();
        if (!rid) return;
        const history = window.chatData && Array.isArray(window.chatData[rid]) ? window.chatData[rid] : [];
        const total = history.length;
        const old = document.getElementById('manual-memory-summary-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'manual-memory-summary-modal';
        modal.className = 'manual-memory-summary-mask';
        modal.innerHTML = ''
            + '<div class="manual-memory-summary-card">'
            + '  <div class="manual-memory-summary-header">'
            + '    <div>'
            + '      <div class="manual-memory-summary-title">手动总结</div>'
            + '      <div class="manual-memory-summary-subtitle">当前共 ' + total + ' 条聊天，事件优先写入“我们”，习惯/喜好会写入对应档案。</div>'
            + '    </div>'
            + '    <button type="button" class="manual-memory-summary-close" onclick="closeManualMemorySummaryModal()">×</button>'
            + '  </div>'
            + '  <div class="manual-memory-summary-range">'
            + '    <label class="manual-memory-summary-field">'
            + '      <span>起始条数</span>'
            + '      <input id="manual-memory-summary-start-index" type="number" inputmode="numeric" min="1" value="' + (total ? 1 : 0) + '" />'
            + '    </label>'
            + '    <label class="manual-memory-summary-field">'
            + '      <span>结束条数</span>'
            + '      <input id="manual-memory-summary-end-index" type="number" inputmode="numeric" min="1" value="' + total + '" />'
            + '    </label>'
            + '  </div>'
            + '  <div id="manual-memory-summary-status" class="manual-memory-summary-status"></div>'
            + '  <div class="manual-memory-summary-actions">'
            + '    <button type="button" class="manual-memory-summary-btn secondary" onclick="closeManualMemorySummaryModal()">取消</button>'
            + '    <button type="button" id="manual-memory-summary-start" class="manual-memory-summary-btn primary" onclick="startManualMemorySummary()">开始总结</button>'
            + '  </div>'
            + '</div>';
        modal.addEventListener('click', function (e) {
            if (e.target === modal) window.closeManualMemorySummaryModal();
        });
        document.body.appendChild(modal);
        if (!total) setManualMemorySummaryStatus('当前还没有可总结的聊天。', true);
    };

    window.startManualMemorySummary = function () {
        const rid = String(window.currentChatRole || '').trim();
        if (!rid || window.__manualMemorySummaryInProgress) return;
        const history = window.chatData && Array.isArray(window.chatData[rid]) ? window.chatData[rid] : [];
        const range = getManualMemorySummaryRange(history.length);
        if (!range) {
            setManualMemorySummaryStatus('当前还没有可总结的聊天。', true);
            return;
        }
        const segment = history.slice(range.startIndex, range.endIndex);
        const segmentText = buildSegmentText(segment);
        if (!segmentText) {
            setManualMemorySummaryStatus('这个范围里没有可总结的聊天内容。', true);
            return;
        }
        if (typeof window.callAISummary !== 'function') {
            setManualMemorySummaryStatus('当前总结接口不可用，请稍后再试。', true);
            return;
        }

        const profile = (window.charProfiles && window.charProfiles[rid]) || {};
        const userPersonaObj = (window.userPersonas && window.userPersonas[rid]) || {};
        const segmentStartTs = segment.length ? normalizeTimestamp(segment[0].timestamp, 0) : 0;
        const segmentEndTs = segment.length ? normalizeTimestamp(segment[segment.length - 1].timestamp, segmentStartTs) : 0;
        const segmentDatePrefix = buildMemoryDatePrefix(segmentStartTs, segmentEndTs);
        const userMsgsForDetect = segment.filter(function (msg) { return msg && msg.role === 'me'; });
        const userTextForDetect = userMsgsForDetect
            .map(function (msg) { return msg && msg.type === 'text' ? normalizeText(msg.content) : ''; })
            .filter(Boolean)
            .join('\n');
        const emojiHeavyRatio = userMsgsForDetect.length
            ? (userMsgsForDetect.filter(isEmojiHeavyMessage).length / userMsgsForDetect.length)
            : 0;
        window.__manualMemorySummaryInProgress = true;
        setManualMemorySummaryBusy(true);
        setManualMemorySummaryStatus('正在总结第 ' + range.startDisplay + ' 条到第 ' + range.endDisplay + ' 条...', false);

        try {
            window.callAISummary(
                {
                    roleId: rid,
                    roleName: profile.nickName || profile.name || 'AI',
                    rolePrompt: profile.desc || '',
                    userPersona: userPersonaObj.setting || '',
                    userName: userPersonaObj.name || '',
                    userGender: userPersonaObj.gender || '',
                    segmentText: segmentText,
                    segmentStartTs: segmentStartTs,
                    segmentEndTs: segmentEndTs,
                    nowTs: Date.now()
                },
                function (res) {
                    try {
                        loadStore();
                        const archive = ensureArchive(rid);
                        const likes = filterApiLikes((res && res.likes) || [], userTextForDetect, segmentText);
                        const habits = filterApiHabits((res && res.habits) || [], emojiHeavyRatio, segmentText);
                        const events = filterApiEvents((res && res.events) || [], segmentDatePrefix, segmentText);
                        const nextEntries = buildEntriesFromBuckets({
                            likes: likes,
                            habits: habits,
                            events: events
                        }, 'manual', {
                            segmentStartTs: segmentStartTs,
                            segmentEndTs: segmentEndTs,
                            importance: 0.88,
                            confidence: 0.76
                        });
                        if (!nextEntries.length) {
                            setManualMemorySummaryStatus('这段聊天没有提炼出适合写入记忆档案的内容。', true);
                            return;
                        }
                        const writeStats = appendEntriesToArchive(archive, nextEntries);
                        archive.meta.updatedAt = Date.now();
                        persistArchive(rid, archive);
                        const targetTab = events.length ? 'events' : (habits.length ? 'habits' : 'likes');
                        window.currentMemoryArchiveTab = targetTab;
                        refreshArchiveModal(targetTab);
                        if (!writeStats.addedCount) {
                            setManualMemorySummaryStatus('AI 返回了 ' + writeStats.candidateCount + ' 条，但和现有记忆重复，所以没有新增内容。', true);
                            return;
                        }
                        const pieces = [];
                        if (writeStats.categoryCounts.events) pieces.push('我们 ' + writeStats.categoryCounts.events + ' 条');
                        if (writeStats.categoryCounts.habits) pieces.push('习惯 ' + writeStats.categoryCounts.habits + ' 条');
                        if (writeStats.categoryCounts.likes) pieces.push('喜好 ' + writeStats.categoryCounts.likes + ' 条');
                        setManualMemorySummaryStatus('已写入记忆档案：' + pieces.join('，') + '。', false);
                    } finally {
                        window.__manualMemorySummaryInProgress = false;
                        setManualMemorySummaryBusy(false);
                    }
                },
                function (err) {
                    window.__manualMemorySummaryInProgress = false;
                    setManualMemorySummaryBusy(false);
                    setManualMemorySummaryStatus(String(err || '总结失败，请稍后再试。'), true);
                }
            );
        } catch (e) {
            window.__manualMemorySummaryInProgress = false;
            setManualMemorySummaryBusy(false);
            setManualMemorySummaryStatus('总结失败，请稍后再试。', true);
        }
    };

    window.maybeAutoUpdateMemoryArchive = function (roleId) {
        try {
            const rid = String(roleId || window.currentChatRole || '').trim();
            if (!rid) return;
            const history = window.chatData && Array.isArray(window.chatData[rid]) ? window.chatData[rid] : [];
            if (!Array.isArray(history)) return;

            let autoOn = false;
            let freq = 20;
            if (typeof window.isChatAutoSummaryEnabled === 'function') {
                autoOn = window.isChatAutoSummaryEnabled(rid);
            } else {
                try {
                    if (typeof window.getCurrentChatSettings === 'function') {
                        const settings = window.getCurrentChatSettings(rid) || {};
                        if (typeof settings.autoSummary === 'boolean') autoOn = settings.autoSummary;
                    }
                } catch (e) { }
                if (!autoOn) autoOn = localStorage.getItem('chat_auto_summary') === 'true';
            }
            if (typeof window.getEffectiveChatSummaryFreq === 'function') {
                freq = window.getEffectiveChatSummaryFreq(rid);
            } else {
                try {
                    if (typeof window.getCurrentChatSettings === 'function') {
                        const settings = window.getCurrentChatSettings(rid) || {};
                        if (typeof settings.summaryFreq === 'number' && settings.summaryFreq > 0) freq = settings.summaryFreq;
                    }
                } catch (e) { }
                if (!freq) {
                    const legacyFreq = parseInt(localStorage.getItem('chat_summary_freq'), 10);
                    if (!isNaN(legacyFreq) && legacyFreq > 0) freq = legacyFreq;
                }
            }
            if (!autoOn) return;

            loadStore();
            const archive = ensureArchive(rid);
            const chunkInfo = getArchiveSummaryChunk(history, archive, freq);
            if (chunkInfo.end <= chunkInfo.start) return;
            if (chunkInfo.end - chunkInfo.start < freq && !(chunkInfo.start === 0 && !(archive.entries || []).length)) return;
            if (archive.meta.summaryInProgress) return;

            const segment = chunkInfo.segment;
            const processedEndIndex = chunkInfo.end;
            archive.meta.summaryInProgress = true;
            persistArchive(rid, archive);

            const profile = window.charProfiles[rid] || {};
            const userPersonaObj = (window.userPersonas && window.userPersonas[rid]) || {};
            const segmentText = buildSegmentText(segment);
            const segmentStartTs = segment.length ? normalizeTimestamp(segment[0].timestamp, 0) : 0;
            const segmentEndTs = segment.length ? normalizeTimestamp(segment[segment.length - 1].timestamp, segmentStartTs) : 0;
            const segmentDatePrefix = buildMemoryDatePrefix(
                segmentStartTs,
                segmentEndTs
            );
            const userMsgsForDetect = segment.filter(function (msg) { return msg && msg.role === 'me'; });
            const userTextForDetect = userMsgsForDetect
                .map(function (msg) { return msg && msg.type === 'text' ? normalizeText(msg.content) : ''; })
                .filter(Boolean)
                .join('\n');
            const emojiHeavyRatio = userMsgsForDetect.length
                ? (userMsgsForDetect.filter(isEmojiHeavyMessage).length / userMsgsForDetect.length)
                : 0;

            if (typeof window.callAISummary === 'function') {
                window.callAISummary(
                    {
                        roleId: rid,
                        roleName: profile.nickName || profile.name || 'AI',
                        rolePrompt: profile.desc || '',
                        userPersona: userPersonaObj.setting || '',
                        userName: userPersonaObj.name || '',
                        userGender: userPersonaObj.gender || '',
                        segmentText: segmentText,
                        segmentStartTs: segmentStartTs,
                        segmentEndTs: segmentEndTs,
                        nowTs: Date.now()
                    },
                    function (res) {
                        try {
                            const nextEntries = buildEntriesFromBuckets({
                                likes: filterApiLikes(res.likes, userTextForDetect, segmentText),
                                habits: filterApiHabits(res.habits, emojiHeavyRatio, segmentText),
                                events: filterApiEvents(res.events, segmentDatePrefix, segmentText)
                            }, 'auto', { segmentStartTs: segmentStartTs, segmentEndTs: segmentEndTs });
                            const writeStats = appendEntriesToArchive(archive, nextEntries);
                            if (writeStats.candidateCount > 0) {
                                archive.meta.lastProcessedIndex = processedEndIndex;
                            }
                            archive.meta.updatedAt = Date.now();
                        } finally {
                            archive.meta.summaryInProgress = false;
                            persistArchive(rid, archive);
                            refreshArchiveModal(window.currentMemoryArchiveTab || 'likes');
                            if ((history.length - archive.meta.lastProcessedIndex) >= freq) {
                                scheduleArchiveCatchUp(rid);
                            }
                        }
                    },
                    function () {
                        archive.meta.summaryInProgress = false;
                        archive.meta.updatedAt = Date.now();
                        persistArchive(rid, archive);
                        refreshArchiveModal(window.currentMemoryArchiveTab || 'likes');
                    }
                );
                return;
            }

            archive.meta.summaryInProgress = false;
            archive.meta.updatedAt = Date.now();
            persistArchive(rid, archive);
            refreshArchiveModal(window.currentMemoryArchiveTab || 'likes');
        } catch (e) {
            console.error('[MemoryArchiveV2] auto update failed', e);
            try {
                const rid = String(roleId || window.currentChatRole || '').trim();
                const archive = rid ? ensureArchive(rid) : null;
                if (archive && archive.meta) {
                    archive.meta.summaryInProgress = false;
                    persistArchive(rid, archive);
                }
            } catch (e2) { }
        }
    };

    window.rebuildMemoryArchive = function (roleId) {
        try {
            const rid = String(roleId || window.currentChatRole || '').trim();
            if (!rid) return;
            const history = window.chatData && Array.isArray(window.chatData[rid]) ? window.chatData[rid] : [];
            if (!Array.isArray(history)) return;

            loadStore();
            const archive = ensureArchive(rid);
            archive.entries = [];
            archive.likesText = '';
            archive.habitsText = '';
            archive.eventsText = '';
            archive.meta.lastProcessedIndex = 0;
            archive.meta.updatedAt = Date.now();
            archive.meta.summaryInProgress = false;
            persistArchive(rid, archive);

            const profile = window.charProfiles[rid] || {};
            const userPersonaObj = (window.userPersonas && window.userPersonas[rid]) || {};
            const finalize = function () {
                refreshArchiveModal(window.currentMemoryArchiveTab || 'likes');
            };
            const total = history.length;
            const processChunk = function (startIndex) {
                const start = Math.max(0, Number(startIndex) || 0);
                if (start >= total) {
                    archive.meta.lastProcessedIndex = total;
                    archive.meta.updatedAt = Date.now();
                    archive.meta.summaryInProgress = false;
                    persistArchive(rid, archive);
                    finalize();
                    return;
                }

                const end = Math.min(total, start + SUMMARY_CHUNK_SIZE);
                const segment = history.slice(start, end);
                const segmentText = buildSegmentText(segment);
                const segmentStartTs = segment.length ? normalizeTimestamp(segment[0].timestamp, 0) : 0;
                const segmentEndTs = segment.length ? normalizeTimestamp(segment[segment.length - 1].timestamp, segmentStartTs) : 0;
                const segmentDatePrefix = buildMemoryDatePrefix(segmentStartTs, segmentEndTs);
                const userMsgsForDetect = segment.filter(function (msg) { return msg && msg.role === 'me'; });
                const userTextForDetect = userMsgsForDetect
                    .map(function (msg) { return msg && msg.type === 'text' ? normalizeText(msg.content) : ''; })
                    .filter(Boolean)
                    .join('\n');
                const emojiHeavyRatio = userMsgsForDetect.length
                    ? (userMsgsForDetect.filter(isEmojiHeavyMessage).length / userMsgsForDetect.length)
                    : 0;

                if (typeof window.callAISummary === 'function' && segmentText) {
                    window.callAISummary(
                        {
                            roleId: rid,
                            roleName: profile.nickName || profile.name || 'AI',
                            rolePrompt: profile.desc || '',
                            userPersona: userPersonaObj.setting || '',
                            userName: userPersonaObj.name || '',
                            userGender: userPersonaObj.gender || '',
                            segmentText: segmentText,
                            segmentStartTs: segmentStartTs,
                            segmentEndTs: segmentEndTs,
                            nowTs: Date.now()
                        },
                        function (res) {
                            try {
                                const nextEntries = buildEntriesFromBuckets({
                                    likes: filterApiLikes((res && res.likes ? res.likes : []).slice(0, 80), userTextForDetect, segmentText),
                                    habits: filterApiHabits((res && res.habits ? res.habits : []).slice(0, 80), emojiHeavyRatio, segmentText),
                                    events: filterApiEvents((res && res.events ? res.events : []).slice(0, 80), segmentDatePrefix, segmentText)
                                }, 'auto', { segmentStartTs: segmentStartTs, segmentEndTs: segmentEndTs });
                                appendEntriesToArchive(archive, nextEntries);
                                archive.meta.lastProcessedIndex = end;
                                archive.meta.updatedAt = Date.now();
                                persistArchive(rid, archive);
                            } finally {
                                processChunk(end);
                            }
                        },
                        function () {
                            archive.meta.summaryInProgress = false;
                            archive.meta.updatedAt = Date.now();
                            persistArchive(rid, archive);
                            finalize();
                        }
                    );
                    return;
                }

                archive.meta.summaryInProgress = false;
                archive.meta.updatedAt = Date.now();
                persistArchive(rid, archive);
                finalize();
            };

            archive.meta.summaryInProgress = true;
            persistArchive(rid, archive);
            processChunk(0);
        } catch (e) {
            console.error('[MemoryArchiveV2] rebuild failed', e);
        }
    };

    window.refineMemoryArchiveEvents = function () {
        try {
            const rid = String(window.currentChatRole || '').trim();
            if (!rid) return;
            loadStore();
            const archive = ensureArchive(rid);
            const targets = getEntriesByCategory(archive, 'events').slice(-8);
            if (targets.length < 2) {
                alert('近期“我们”记忆太少，暂时不用整理。');
                return;
            }
            if (archive.meta.refineInProgress) return;
            archive.meta.refineInProgress = true;
            persistArchive(rid, archive);

            const targetIds = new Set(targets.map(function (entry) { return String(entry.id || ''); }));
            const targetsDatePrefix = buildMemoryDatePrefix(
                targets.length ? targets[0].updatedAt || targets[0].createdAt : 0,
                targets.length ? targets[targets.length - 1].updatedAt || targets[targets.length - 1].createdAt : 0
            );
            function finalize(refinedText) {
                archive.meta.refineInProgress = false;
                const cleanText = ensureEventDatePrefix(refinedText, targetsDatePrefix);
                if (cleanText) {
                    const survivors = (archive.entries || []).filter(function (entry) {
                        return !targetIds.has(String(entry && entry.id || ''));
                    });
                    survivors.push(buildEntryDraft('events', cleanText, 'refined', {
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        lastMentionedAt: Date.now(),
                        lastConfirmedAt: Date.now(),
                        segmentStartTs: targets.length ? (targets[0].startAt || targets[0].happenedAt || targets[0].updatedAt || targets[0].createdAt) : 0,
                        segmentEndTs: targets.length ? (targets[targets.length - 1].endAt || targets[targets.length - 1].happenedAt || targets[targets.length - 1].updatedAt || targets[targets.length - 1].createdAt) : 0,
                        importance: 0.88,
                        confidence: 0.82,
                        evidenceCount: Math.max(2, targets.length)
                    }));
                    archive.entries = normalizeEntries(survivors);
                    archive.meta.updatedAt = Date.now();
                }
                persistArchive(rid, archive);
                refreshArchiveModal('events');
                alert(cleanText ? '近期关系记忆已整理。' : '这次没有整理出新的关系记忆。');
            }

            function failRefine(message) {
                archive.meta.refineInProgress = false;
                archive.meta.updatedAt = Date.now();
                persistArchive(rid, archive);
                refreshArchiveModal('events');
                alert(message || '整理失败：没有生成可用的关系记忆。');
            }

            if (typeof window.callAISummary === 'function') {
                const profile = window.charProfiles[rid] || {};
                const userPersonaObj = (window.userPersonas && window.userPersonas[rid]) || {};
                const segmentText = targets.map(function (entry, index) {
                    return '最近关系记忆' + String(index + 1) + '：' + normalizeLine(entry.content);
                }).join('\n');
                window.callAISummary(
                    {
                        roleId: rid,
                        roleName: profile.nickName || profile.name || 'AI',
                        rolePrompt: profile.desc || '',
                        userPersona: userPersonaObj.setting || '',
                        userName: userPersonaObj.name || '',
                        userGender: userPersonaObj.gender || '',
                        segmentText: segmentText,
                        segmentStartTs: targets.length ? (targets[0].startAt || targets[0].happenedAt || targets[0].updatedAt || targets[0].createdAt) : 0,
                        segmentEndTs: targets.length ? (targets[targets.length - 1].endAt || targets[targets.length - 1].happenedAt || targets[targets.length - 1].updatedAt || targets[targets.length - 1].createdAt) : 0
                    },
                    function (res) {
                        const candidates = (res && Array.isArray(res.events) ? res.events : [])
                            .map(normalizeLine)
                            .filter(Boolean);
                        if (candidates[0]) finalize(candidates[0]);
                        else failRefine('整理失败：AI 没有返回可用的“我们”记忆。');
                    },
                    function () {
                        failRefine('整理失败：自动总结 API 调用失败，未写入兜底记忆。');
                    }
                );
                return;
            }

            failRefine('整理失败：当前没有可用的自动总结 API，未写入兜底记忆。');
        } catch (e) {
            console.error('[MemoryArchiveV2] refine failed', e);
            try {
                const rid = String(window.currentChatRole || '').trim();
                const archive = rid ? ensureArchive(rid) : null;
                if (archive && archive.meta) {
                    archive.meta.refineInProgress = false;
                    persistArchive(rid, archive);
                }
            } catch (e2) { }
        }
    };

    loadStore();
    Object.keys(window.memoryArchiveStore || {}).forEach(function (roleId) {
        ensureArchive(roleId);
    });
    saveStore();
})();
