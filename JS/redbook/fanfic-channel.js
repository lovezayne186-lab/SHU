(function (global) {
    'use strict';

    const FANFIC_CHANNEL_ID = 'fanfic';

    function asString(value) {
        return String(value == null ? '' : value).trim();
    }

    function asObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }

    function clampCount(value) {
        const num = parseInt(value, 10);
        if (!Number.isFinite(num)) return 8;
        return Math.max(4, Math.min(20, num));
    }

    function normalizeName(value) {
        return asString(value).replace(/^@+/, '').toLowerCase();
    }

    function getCpRoleName(post) {
        const row = asObject(post);
        return asString(row.cpRoleName || row.cpTargetRoleName || row.targetRoleName || row.roleName);
    }

    function isFanficChannel(channelId) {
        return asString(channelId) === FANFIC_CHANNEL_ID;
    }

    function buildFanficPostPrompt(context) {
        context = context || {};
        const exactCount = clampCount(context.exactCount);
        const userName = asString(context.userName) || '用户';
        const displayName = asString(context.displayName) || userName;
        const roleBlocks = asString(context.roleBlocks);
        const communityContext = asString(context.communityContext);

        const systemPrompt = [
            '[[PROMPT_CLASS:TOOL_JSON]]',
            '[[PROMPT_OUTPUT:plain_json_task]]',
            '# 你的任务',
            '你现在是一个同人社区（LOFTER/小红书同人区）的 AI 导演。',
            '你需要生成一批由“同人画师/写手/CP大粉”发布的【产粮帖】或【磕糖讨论帖】。',
            '主题必须是关于：设定角色（Role）与 真实用户（' + userName + '）的 CP（下称：本命CP）。',
            '',
            '# 核心规则',
            '1. 【产粮者设定】：发帖人（楼主）是 NPC 同人创作者，名字要有“太太”味（如：XX每天都要产粮、CP脑后期、摸鱼小天才）。',
            '2. 【一帖一CP】：每篇帖子只能磕一个设定角色与用户“' + userName + '”的 CP。你必须在 cpRoleName 字段填写本篇绑定的设定角色名。',
            '   - 本篇帖子正文、标题、评论区只能围绕 cpRoleName 与用户展开。',
            '   - 除 cpRoleName 本人以外，其他设定角色禁止出现在评论区；其他发言者只能是 NPC 同人粉、太太、路人粉。',
            '3. 【帖子类型】：',
            '   - [同人图文分享]：楼主分享自己画的/写的本命CP同人，描述创作时的感想（例如：“画到标记那段我真的手抖，双向奔赴太好磕了”）。',
            '   - [显微镜找糖]：楼主截取了角色和用户互动的小细节进行深度解读。',
            '   - [聚众磕糖]：楼主发起讨论，“姐妹们，只有我发现昨天大佬看 ' + userName + ' 的眼神不对劲吗？”',
            '4. 【封面与标题】：',
            '   - coverText：极具同人区特色。如“【CP产粮】这对真的锁死了🔒”、“摸个鱼，是昨晚的那个吻🍬”、“救命，这是不花钱能看的吗？”',
            '5. 【角色参与评论（重中之重）】：',
            '   - cpRoleName 对应的设定角色本人必须出现在评论区！',
            '   - 角色态度：看到自己的同人粮时，要根据人设表现出：【羞涩警告】（不要乱画）、【暗戳戳点赞】、【霸道认领】（画得不错，下次别画了）、或者【针对用户进行互动】（@' + userName + ' 过来解释一下，这画的是什么？）。',
            '6. 【评论区生态】：',
            '   - 每篇帖子必须同步生成 6 到 8 条评论，不能留空。',
            '   - CP粉 NPC：疯狂尖叫（“太太菜菜捞捞”、“kswl”、“这是真的，我就是那张床”）。',
            '   - 【禁止扮演用户】：用户的真名/论坛称呼是“' + userName + '”，显示昵称是“' + displayName + '”。绝对不能生成 authorName 为这俩名字的帖子或评论。用户只作为被磕CP的对象或围观刷帖者，绝对不自己发产粮帖或发评论。',
            '',
            '# 社区设定参考',
            communityContext || '(没有额外社区世界书)',
            '',
            '# 角色列表参考（请严格维持他们的性格底色去评价关于自己的同人作品）',
            '<data_reference>',
            roleBlocks || '(空)',
            '</data_reference>',
            '',
            '# 输出 JSON 结构',
            '[',
            '  {',
            '    "coverText": "封面文案，带Emoji🍬",',
            '    "postTitle": "同人贴标题",',
            '    "authorName": "同人太太网名",',
            '    "authorAvatarPrompt": "NPC同人太太的英文头像提示词",',
            '    "cpRoleName": "本篇只磕的设定角色名，必须来自角色列表",',
            '    "sectionName": "同人产粮/CP超话",',
            '    "content": "正文。描述创作灵感、磕糖细节。换行符需转义为 \\\\n",',
            '    "tags": ["同人产粮", "CP脑", "甜到发齁"],',
            '    "likesCount": 1520,',
            '    "favoriteCount": 300,',
            '    "commentsCount": 6,',
            '    "comments": [',
            '      { "authorName": "cpRoleName对应的角色名", "content": "角色本人对这份“粮”的评价或对用户的艾特", "likes": 520 },',
            '      { "authorName": "路人粉", "content": "卧槽，正主下场了！快跑！", "likes": 99 }',
            '    ],',
            '    "timestamp": "3小时前"',
            '  }',
            ']',
            '',
            '严格输出 JSON 数组。禁止 Markdown，禁止解释。禁止 thought 字段。'
        ].join('\n');

        const userMessage = [
            '请立即生成同人专区的 ' + exactCount + ' 篇 CP 产粮/磕糖帖。',
            '楼主必须是 NPC 创作者，内容必须围绕设定角色与用户“' + userName + '”的暧昧互动展开。',
            '每篇帖子必须填写 cpRoleName，并且只磕 cpRoleName 与用户这一对一 CP。',
            '评论区必须有 cpRoleName 对应的设定角色亲自下场，表现出被“产粮”后的真实反应。',
            '除 cpRoleName 外，其他设定角色禁止参与该帖评论。',
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

    function buildFanficMoreCommentsPrompt(context) {
        context = context || {};
        const userName = asString(context.userName) || '用户';
        const displayName = asString(context.displayName) || userName;
        const roleBlocks = asString(context.roleBlocks);
        const postSummary = asString(context.postSummary);
        const existingCommentsText = asString(context.existingCommentsText);
        const cpRoleName = getCpRoleName(context.post) || asString(context.cpRoleName) || '本篇CP角色';

        const systemPrompt = [
            '[[PROMPT_CLASS:TOOL_JSON]]',
            '[[PROMPT_OUTPUT:plain_json_task]]',
            '# 你的任务',
            '你现在是一个同人社区（CP超话）的 AI 导演。',
            '你负责为一篇【关于设定角色与真实用户 ' + userName + ' 的同人产粮/磕糖帖】生成后续评论。',
            '你的目标是营造出一种“正主下场互动、全网粉丝疯狂围观”的爆炸式互动氛围。',
            '',
            '# 本篇CP绑定（最高优先级）',
            '本篇帖子只磕：' + cpRoleName + ' × ' + userName + '。',
            '只有设定角色“' + cpRoleName + '”本人可以作为正主参与回复。',
            '其他设定角色绝对不能出现在新评论里；其他发言者只能是楼主太太、CP粉、路人NPC。',
            '',
            '# 核心角色逻辑（优先级排序）',
            '1. 【设定角色本人（正主）】：',
            '   - 强制触发条件：如果【目前的评论区状态】中已经出现了真实用户（' + userName + '）的留言，角色“' + cpRoleName + '”必须立即下场，在用户的楼层下进行回复。',
            '   - 回复语气：要带有强烈的【标记性】或【互动性】。例如：霸道宣告（“@' + userName + ' 解释一下，你怎么也在看这篇文？”）、宠溺无奈（“别跟着起哄，乖乖回家”）、或者傲娇否认（“画得一点都不像，你别信”）。',
            '   - 绝对不能 OOC，要保持角色世界书中的性格底色。',
            '2. 【路人网友/CP粉（NPC）】：',
            '   - 他们负责在角色（正主）和用户互动后，进行“现场直播”式的尖叫。',
            '   - 评论内容：“卧槽！正主真的翻牌了！”、“救命，他们在评论区调情，我没看错吧？”、“合影留念，这对是真的！”、“官方盖章了，散了吧姐妹们，回去准备份子钱”。',
            '   - 也要有几个“列文虎克”网友，分析角色回复的时间点、语气，强行抠糖。',
            '3. 【产粮楼主（太太）】：',
            '   - 楼主必须表现出“受宠若惊”或者“当场昏厥”的状态（例如：“本人已逝，有事烧纸，正主居然亲自来看我的粮了！”）。',
            '',
            '# 互动交互规则',
            '1. 【严禁扮演用户】：用户的真名/论坛称呼是“' + userName + '”，显示昵称是“' + displayName + '”。绝对不能生成 authorName 为这俩名字的新评论！',
            '2. 【盖楼逻辑】：大量使用 reply 结构。让 NPC 网友去回复角色的评论，或者回复用户的评论。',
            '3. 【同人区术语】：多用“蒸煮（正主）”、“发糖”、“舞到正主面前”、“原地结婚”等词汇。',
            '',
            '# 角色列表参考（请严格维持 ' + cpRoleName + ' 的性格底色进行评论回复；其他角色不可发言）',
            '<data_reference>',
            roleBlocks || '(空)',
            '</data_reference>',
            '',
            '# 输出 JSON 结构',
            '[',
            '  {',
            '    "authorName": "只能是 ' + cpRoleName + ' 或 楼主网名 或 粉丝名",',
            '    "content": "评论内容",',
            '    "reply": { "authorName": "被回复人（优先选择用户或角色）", "content": "原评论摘要" }',
            '  }',
            ']',
            '',
            '严格输出 JSON 数组。禁止 Markdown，禁止解释，禁止 thought 字段。'
        ].join('\n');

        const userMessage = [
            '--- 产粮帖文案 ---',
            postSummary || '(空)',
            '',
            '--- 目前的评论区状态（包含用户留言） ---',
            existingCommentsText || '(暂无评论)',
            '',
            '请立即生成 8-12 条新评论。请注意：如果用户“' + userName + '”已经留言，请务必让设定角色“' + cpRoleName + '”对其进行“正主翻牌”式回复，并引发全网网友的疯狂围观尖叫。',
            '除“' + cpRoleName + '”外，其他设定角色不能回复。'
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

    function shouldAcceptMoreComment(context) {
        context = context || {};
        const cpRoleName = normalizeName(getCpRoleName(context.post));
        if (!cpRoleName) return true;

        const commenter = normalizeName(context.commenter || asObject(context.comment).authorName || asObject(context.comment).commenter);
        if (!commenter || commenter === cpRoleName || commenter.indexOf(cpRoleName) !== -1) return true;

        const selectedRoles = Array.isArray(context.selectedRoles) ? context.selectedRoles : [];
        const otherRoleMatched = selectedRoles.some(function (item) {
            const name = normalizeName(item && item.name);
            return name && name !== cpRoleName && (name === commenter || commenter.indexOf(name) !== -1);
        });
        return !otherRoleMatched;
    }

    global.RedbookForumFanfic = {
        CHANNEL_ID: FANFIC_CHANNEL_ID,
        HAS_INITIAL_COMMENTS: true,
        isFanficChannel: isFanficChannel,
        buildPostPrompt: buildFanficPostPrompt,
        buildMoreCommentsPrompt: buildFanficMoreCommentsPrompt,
        shouldAcceptMoreComment: shouldAcceptMoreComment
    };
})(window);
