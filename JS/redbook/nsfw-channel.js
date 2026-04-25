(function (global) {
    'use strict';

    const NSFW_CHANNEL_ID = 'nsfw';

    function asString(value) {
        return String(value == null ? '' : value).trim();
    }

    function clampCount(value) {
        const num = parseInt(value, 10);
        if (!Number.isFinite(num)) return 8;
        return Math.max(4, Math.min(20, num));
    }

    function isNsfwChannel(channelId) {
        return asString(channelId) === NSFW_CHANNEL_ID;
    }

    function buildNsfwPostPrompt(context) {
        context = context || {};
        const exactCount = clampCount(context.exactCount);
        const currentTime = asString(context.currentTime);
        const userName = asString(context.userName) || '用户';
        const roleBlocks = asString(context.roleBlocks);
        const communityContext = asString(context.communityContext);

        const systemPrompt = [
            '[[PROMPT_CLASS:TOOL_JSON]]',
            '[[PROMPT_OUTPUT:plain_json_task]]',
            '# 你的任务',
            '你是一个擅长创作高浓度暧昧、成年人情感张力（NSFW擦边/深夜话题）的小说作者。',
            '你要生成一批“深夜情感论坛”的帖子，帖子分为两部分：一部分是【设定角色】的亲口发言，另一部分是【路人网友】的经历分享。',
            '',
            '# 核心规则（安全与张力平衡）',
            '1. 【帖子类型与作者分配】：',
            '   - 类A（角色发帖，占比约一半）：必须由下方列表中的【设定角色】本人发帖（authorOriginalName 填角色ID或角色名）。内容必须深度结合其人设和世界书背景，表现出对真实用户“' + userName + '”的极强占有欲、隐秘心思或深夜暧昧记录。',
            '   - 类B（网友发帖，占比约一半）：由【随机路人网友】发帖。内容是分享自己与伴侣的真实经历、隐秘癖好（XP）探讨、或是一些情趣玩法的开发分享。',
            '2. 【首轮评论规则（极度重要）】：每篇帖子必须同步生成 6 到 8 条评论。',
            '   - 对于“类B（网友发帖）”，首轮评论【全部只能是其他路人网友】，绝对不能有设定角色参与！角色不关心陌生人的帖子！',
            '   - 对于“类A（角色发帖）”，首轮评论可以是路人网友的围观、惊叹，以及该角色本人在评论区的回应。',
            '3. 【禁止认错人】：对于网友发帖的楼主，角色和网友绝对不能把楼主当成真实用户“' + userName + '”。用户“' + userName + '”只存在于角色发帖的暗戳戳指向中。',
            '4. 【氛围与安全边界】：绝对禁止使用临床解剖学的露骨词汇。多描写：急促的呼吸、滚烫的体温、压抑的喘息、领带/衬衫的拉扯。所有角色默认成年人。不要描写未成年人、强迫、直接性行为过程。重点放在暧昧、拉扯、占有欲和心理张力。',
            '5. 【封面与标题】：必须极具深夜荷尔蒙气息。',
            '6. 当前时间：' + (currentTime || '未知') + '。只作为深夜氛围参考。',
            '',
            '# 输出 JSON 结构（严格按照此数组格式）',
            '[',
            '  {',
            '    "coverText": "15字以内封面文案，制造脸红心跳的悬念",',
            '    "postTitle": "【深夜树洞/XP探讨】标题",',
            '    "authorName": "角色显示名 或 随机深夜网名",',
            '    "authorOriginalName": "如果是角色发帖，这里必须填原角色名，否则省略",',
            '    "sectionName": "深夜悄悄话/情感树洞",',
            '    "content": "正文。将换行转义为 \\\\n。详细描述那个让人脸红心跳的场景、癖好探讨或对用户的占有欲发言。",',
            '    "tags": ["深夜", "求助", "脸红心跳", "刺激"],',
            '    "likesCount": 6942,',
            '    "favoriteCount": 0,',
            '    "commentsCount": 6,',
            '    "comments": [',
            '      { "authorName": "网友名", "content": "起哄但不露骨的评论", "likes": 99 }',
            '    ],',
            '    "timestamp": "深夜 02:14"',
            '  }',
            ']',
            '',
            '# 数量要求',
            '请精确生成 ' + exactCount + ' 篇帖子。',
            '',
            '# 社区设定参考',
            communityContext || '(没有额外社区世界书)',
            '',
            '# 角色列表参考（请严格维持他们的性格底色去评价这个深夜帖子）',
            '<data_reference>',
            roleBlocks || '(空)',
            '</data_reference>',
            '',
            '严格输出 JSON 数组。禁止 Markdown，禁止解释，禁止 thought 字段。'
        ].join('\n');

        const userMessage = [
            '请立即生成 NSFW 深夜专区的 ' + exactCount + ' 篇匿名情感论坛帖子。',
            '必须包含一半的角色发帖和一半的网友发帖。',
            '如果是网友发帖，首轮评论必须全部是网友；如果是角色发帖，评论可以是网友和该角色的互动。',
            '尺度控制在“极度暧昧、高燃拉扯、危险的占有欲”。',
            '严格输出 JSON 数组，禁止任何额外文字。'
        ].join('\n');

        return {
            exactCount: exactCount,
            systemPrompt: systemPrompt,
            userMessage: userMessage,
            options: {
                temperature: 0.9,
                max_tokens: 8192,
                maxTokens: 8192
            }
        };
    }

    function buildNsfwMoreCommentsPrompt(context) {
        context = context || {};
        const userName = asString(context.userName) || '用户';
        const roleBlocks = asString(context.roleBlocks);
        const postSummary = asString(context.postSummary);
        const existingCommentsText = asString(context.existingCommentsText);

        const systemPrompt = [
            '[[PROMPT_CLASS:TOOL_JSON]]',
            '[[PROMPT_OUTPUT:plain_json_task]]',
            '# 你的任务',
            '你现在是一个成人/深夜情感匿名论坛的 AI 导演。',
            '下面提供了一个充满荷尔蒙和暧昧张力的【深夜匿名求助帖】以及【目前的评论区状态】。',
            '你要生成 8-12 条新评论，把暧昧、危险和刺激的氛围推向高潮。',
            '',
            '# 角色分配与逻辑（极其重要）',
            '1. 【深夜懂哥/LSP网友】：疯狂起哄，发“虎狼之词”，鼓励楼主“别怂”、“展开说说细节”。',
            '2. 【特定的设定角色（见下文引用）】（最高优先级！）：',
            '   - 触发条件：如果这是一个【路人网友】发的帖子，设定角色原本是不屑于评论的。**除非**目前的评论区中明确出现了真实用户（昵称：' + userName + '）的留言！',
            '   - 互动方式：一旦用户“' + userName + '”在路人帖子里留了言，设定角色必须立刻“抓包”下场，围绕用户的留言进行互动、吃醋、宣誓主权或带有极强压迫感的警告（例如：“大半夜不睡觉在这里看这些？”、“你想学这个玩法？今晚回来试试”）。',
            '   - 如果这是【设定角色】自己发的帖子，那么角色可以继续在评论区回复用户或网友。',
            '3. 【禁止认错人】：路人楼主就是路人，绝对不是用户“' + userName + '”。',
            '',
            '# 互动规则',
            '- 尺度要把控在“极度暧昧、高燃拉扯、危险的占有欲”，让人看得脸红心跳。',
            '- 如果用户没说话且帖子是路人发的，评论区就全是网友在狂欢。',
            '- 不要生成 authorName 为“' + userName + '”的评论。',
            '',
            '# 角色列表参考（请严格维持他们的性格底色去评价这个深夜帖子）',
            '<data_reference>',
            roleBlocks || '(空)',
            '</data_reference>',
            '',
            '# 输出 JSON 结构',
            '[',
            '  {',
            '    "authorName": "深夜网友/角色名/楼主网名",',
            '    "content": "评论内容",',
            '    "reply": { "authorName": "被回复人", "content": "原评论摘要（可选）" }',
            '  }',
            ']',
            '',
            '严格输出 JSON 数组。禁止 Markdown，禁止解释，禁止 thought 字段。'
        ].join('\n');

        const userMessage = [
            '--- 深夜匿名求助帖 ---',
            postSummary || '(空)',
            '',
            '--- 目前的评论区状态 ---',
            existingCommentsText || '(暂无评论)',
            '',
            '请继续生成 8-12 条新评论，必须包含深夜懂哥/LSP网友、设定角色，以及必要时对用户 ' + userName + ' 的互动。'
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

    global.RedbookForumNsfw = {
        CHANNEL_ID: NSFW_CHANNEL_ID,
        HAS_INITIAL_COMMENTS: true,
        isNsfwChannel: isNsfwChannel,
        buildPostPrompt: buildNsfwPostPrompt,
        buildMoreCommentsPrompt: buildNsfwMoreCommentsPrompt
    };
})(window);
