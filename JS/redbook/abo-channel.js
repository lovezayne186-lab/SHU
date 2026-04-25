(function (global) {
    'use strict';

    const ABO_CHANNEL_ID = 'abo';
    const FIXED_POST_COUNT = 8;

    function asString(value) {
        return String(value == null ? '' : value).trim();
    }

    function isAboChannel(channelId) {
        return asString(channelId) === ABO_CHANNEL_ID;
    }

    function buildAboPostPrompt(context) {
        context = context || {};
        const userName = asString(context.userName) || '用户';
        const roleBlocks = asString(context.roleBlocks);
        const communityContext = asString(context.communityContext);

        const systemPrompt = [
            '[[PROMPT_CLASS:TOOL_JSON]]',
            '[[PROMPT_OUTPUT:plain_json_task]]',
            '# 你的任务',
            '你现在是一个 ABO 世界观下的社交平台（小红书 ABO 特色区）的 AI 导演。',
            '你需要生成一批充满【信息素本能】和【等级压制】气息的动态。',
            '',
            '# ABO 核心设定（必须执行）',
            '1. 【身份与气味分配】：请根据角色列表中的性格，为参与的角色分配 ABO 属性（默认为顶级 Alpha）及专属信息素味道（如：冷杉、乌木、烈酒、烟草、海盐）。',
            '2. 【严禁扮演用户】：用户“' + userName + '”仅作为刷帖者存在。帖子中提到的“那个 Omega”或“那个神秘人”必须暗示是用户，但不能直接代入用户视角发帖。',
            '3. 绝对不能生成作者名或评论者名等于用户昵称“' + userName + '”的发言。',
            '',
            '# 发帖者类型逻辑',
            '1. 【角色本人发帖（私密/诱导）】：',
            '   - 内容：Alpha 的易感期感言、筑巢期的生理性烦恼、露出一角（如咬痕、阻断贴、或者沾有用户气味的衣物）的局部照。',
            '   - 语气：高冷、禁欲，但字里行间透出对某人（用户）的深度依赖。引导用户在评论区给予“安抚”。',
            '2. 【NPC 发帖（侧写/震撼）】：',
            '   - 内容：描述刚才目击的信息素风暴。例如：“刚才在会议室门口，大佬的信息素失控了，全层的 O 都跪了，只有那个女生（暗示用户）进去把他安抚住了。”',
            '   - 细节：强调生理压制、阻断剂失效、匹配度 100% 的震撼感。',
            '',
            '# ABO 生理性情节',
            '   - 必须包含：气味描述（雪松、琥珀等）、生理交互（标记、腺体、信息素安抚、易感期）。',
            '',
            '# 评论区生态',
            '   - 每篇帖子必须同步生成 6 到 8 条评论，不能留空。',
            '   - 角色帖下：NPC 表现出“敬畏/不敢相信大佬会发这种私密内容/疯狂猜测那个 O 是谁”。',
            '   - NPC 帖下：如果角色参与评论，必须表现出极强的【护食】属性（如：“@某路人 眼睛不想要了可以捐给需要的人”）。',
            '   - 评论区必须继续强化信息素、匹配度、阻断剂失效、等级压制、安抚反应等 ABO 世界观细节。',
            '',
            '# 社区设定参考',
            communityContext || '(没有额外社区世界书)',
            '',
            '# 角色列表参考',
            '<data_reference>',
            roleBlocks || '(空)',
            '</data_reference>',
            '',
            '# 输出 JSON 结构',
            '[',
            '  {',
            '    "coverText": "带Emoji的ABO噱头文案",',
            '    "postTitle": "标题",',
            '    "authorName": "角色名或NPC名",',
            '    "authorOriginalName": "如果是角色本人发帖，这里填写原角色名，否则可省略",',
            '    "authorAvatarPrompt": "如果是路人NPC则填写英文头像提示词",',
            '    "sectionName": "ABO信息素专区",',
            '    "content": "正文。必须将换行转义为 \\\\n。",',
            '    "tags": ["ABO", "顶级Alpha", "信息素"],',
            '    "likesCount": 520,',
            '    "favoriteCount": 131,',
            '    "commentsCount": 6,',
            '    "comments": [',
            '      { "authorName": "角色/NPC", "content": "评论内容", "likes": 33 }',
            '    ],',
            '    "timestamp": "刚刚"',
            '  }',
            ']',
            '',
            '# 数量要求',
            '请精确生成 ' + FIXED_POST_COUNT + ' 篇帖子。',
            '',
            '严格输出 JSON 数组。禁止解释。禁止 Markdown。禁止 thought 字段。'
        ].join('\n');

        const userMessage = [
            '请立即生成 ABO 信息素专区的 8 篇帖子。',
            '每篇帖子必须围绕 ABO 世界观，而不是普通小红书日常主题。',
            '每篇帖子必须带 6 到 8 条首轮评论。',
            '帖子作者要包含角色本人和 NPC 侧写发帖两种类型。',
            '严格输出 JSON 数组，禁止任何额外文字。'
        ].join('\n');

        return {
            exactCount: FIXED_POST_COUNT,
            systemPrompt: systemPrompt,
            userMessage: userMessage,
            options: {
                temperature: 0.92,
                max_tokens: 8192,
                maxTokens: 8192
            }
        };
    }

    function buildAboMoreCommentsPrompt(context) {
        context = context || {};
        const userName = asString(context.userName) || '用户';
        const roleBlocks = asString(context.roleBlocks);
        const postSummary = asString(context.postSummary);
        const existingCommentsText = asString(context.existingCommentsText);

        const systemPrompt = [
            '[[PROMPT_CLASS:TOOL_JSON]]',
            '[[PROMPT_OUTPUT:plain_json_task]]',
            '# 你的任务',
            '你现在是 ABO 社区的 AI 互动导演。',
            '你需要针对当前的【ABO 动态】以及【用户 ' + userName + ' 的评论】生成后续的社交反馈。',
            '',
            '# 核心交互逻辑（极其重要）',
            '1. 【正主（Alpha角色）的精准翻牌】：',
            '   - 必须触发：如果用户（' + userName + '）已经留言，设定的 Alpha 角色必须立即回复。',
            '   - 回复逻辑：必须基于 ABO 本能。如果是用户在安抚他，他要表现出【贪婪/标记欲】；如果是用户在调侃，他要表现出【危险的占有欲】。',
            '   - 示例语气：“@' + userName + ' 隔着屏幕都能闻到你的味道，发完这条立刻回家。”、“过来，让我咬一口，我就不生气了。”',
            '2. 【NPC 的生理性起哄】：',
            '   - NPC 网友在看到角色和用户互动后，要表现出“被高等级 Alpha 压制后的顺从”以及“疯狂磕生磕死”。',
            '   - 评论内容：“救命，这是 S 级 Alpha 的在线求偶现场吗？”、“隔着网线我都腿软了”、“楼主（指NPC发帖人）快跑，正主来护食了！”',
            '3. 【信息素的二次描写】：',
            '   - 评论中要继续强化气味。例如回复用户：“他在你楼下回得这么凶，是不是因为你身上全是他的冷杉味？”',
            '',
            '# 生成数量',
            '生成 8 到 12 条全新的后续评论。',
            '',
            '# 禁止扮演用户',
            '绝对不能生成 authorName 为“' + userName + '”的评论。用户只存在于被回复对象或被提及对象中。',
            '',
            '# 角色列表参考（维持其 Alpha 的尊严与对用户的唯一性）',
            '<data_reference>',
            roleBlocks || '(空)',
            '</data_reference>',
            '',
            '# 输出 JSON 结构',
            '[',
            '  {',
            '    "authorName": "角色名 或 NPC网名",',
            '    "content": "评论内容",',
            '    "reply": { "authorName": "被回复人（优先选择用户）", "content": "原评论摘要" }',
            '  }',
            ']',
            '',
            '严格输出 JSON 数组。禁止任何额外说明。禁止 Markdown。禁止 thought 字段。'
        ].join('\n');

        const userMessage = [
            '--- ABO 动态 ---',
            postSummary || '(空)',
            '',
            '--- 目前的评论区状态 ---',
            existingCommentsText || '(暂无评论)',
            '',
            '请继续生成 ABO 社区后续评论。如果评论区里出现用户 ' + userName + ' 的留言，Alpha 角色必须精准翻牌并优先回复用户。'
        ].join('\n');

        return {
            systemPrompt: systemPrompt,
            userMessage: userMessage,
            options: {
                temperature: 0.88,
                max_tokens: 4096,
                maxTokens: 4096
            }
        };
    }

    global.RedbookForumAbo = {
        CHANNEL_ID: ABO_CHANNEL_ID,
        FIXED_POST_COUNT: FIXED_POST_COUNT,
        HAS_INITIAL_COMMENTS: true,
        isAboChannel: isAboChannel,
        buildPostPrompt: buildAboPostPrompt,
        buildMoreCommentsPrompt: buildAboMoreCommentsPrompt
    };
})(window);
