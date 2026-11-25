export function buildPrompt({ brief, imageCount, avoidList = [] }) {
  const avoid = avoidList.length
    ? `\n- 禁止重复使用这些表达（同店其他笔记已用过）：${avoidList.join('、')}`
    : ''

  return `你是一位经验丰富的探店博主，正在为真实店铺撰写一篇可发布的笔记。请严格遵守以下要求：

【店铺信息】
${brief.store || '未提供店名'}

【必写卖点】
${brief.highlights || '请从店铺信息中提取'}

【写作风格】
${brief.style || '轻松自然的安利口吻'}

【目标平台】
${brief.platform || '小红书'}

【受众】
${brief.audience || '喜欢探店的年轻人'}

【字数要求】
${brief.wordCount || '400'} 字左右

【标题偏好】
${brief.titleStyle || '有吸引力、带 digging 感，不超过 20 字'}

【必须包含的关键词】
${brief.keywords || '无'}

【不要写的内容】
${brief.avoid || '无夸张虚假宣传'}${avoid}

【图片情况】
本次有 ${imageCount || 0} 张图片可用。请在 sections 中用 image_index 标明每段配第几张图（从 0 开始，可重复，不需要配图则填 null）。请按「门头/环境 → 菜品特写 → 细节/价格 → 体验感受」的顺序安排图文。

请直接返回合法的 JSON 对象，不要使用 markdown 代码块，不要输出解释文字。格式如下：
{
  "title_variants": ["标题1", "标题2", "标题3"],
  "opening_hook": "开头第一句抓人眼球的话",
  "sections": [
    {"heading": "小标题", "text": "段落正文", "image_index": 0},
    {"heading": "小标题", "text": "段落正文", "image_index": 1}
  ],
  "cta": "结尾引导语",
  "tags": ["#标签1", "#标签2", "#标签3"]
}`
}

export function parseContent(raw) {
  let json = null

  if (typeof raw === 'object' && raw !== null) {
    json = raw
  } else if (typeof raw === 'string') {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const candidate = fenced ? fenced[1] : raw
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try {
        json = JSON.parse(candidate.slice(start, end + 1))
      } catch {
        json = null
      }
    }
  }

  if (!json || typeof json !== 'object') {
    return {
      title_variants: ['（模型返回格式异常，请重试）'],
      opening_hook: '',
      sections: [{ heading: '原文', text: String(raw || ''), image_index: null }],
      cta: '',
      tags: [],
      plain: String(raw || '')
    }
  }

  const sections = Array.isArray(json.sections) ? json.sections : []
  const normalizedSections = sections.map((s, i) => ({
    heading: String(s.heading || `第 ${i + 1} 段`),
    text: String(s.text || ''),
    image_index: Number.isInteger(s.image_index) ? s.image_index : null
  }))

  const titleVariants = Array.isArray(json.title_variants)
    ? json.title_variants.map(String).filter(Boolean)
    : []
  const tags = Array.isArray(json.tags) ? json.tags.map(String).filter(Boolean) : []

  const parts = []
  parts.push(titleVariants[0] || '探店笔记')
  if (json.opening_hook) parts.push('', String(json.opening_hook))
  normalizedSections.forEach((s) => {
    parts.push('', `【${s.heading}】`, s.text)
  })
  if (json.cta) parts.push('', String(json.cta))
  if (tags.length) parts.push('', tags.join(' '))

  return {
    title_variants: titleVariants,
    opening_hook: String(json.opening_hook || ''),
    sections: normalizedSections,
    cta: String(json.cta || ''),
    tags,
    plain: parts.join('\n')
  }
}

export function mockContent(brief) {
  const store = brief.store || '这家店'
  return parseContent({
    title_variants: [
      `${store}｜藏在街角的宝藏小店`,
      `被朋友按头安利的${store}，真的值得来`,
      `${store}实测：这一口让我记了三天`
    ],
    opening_hook: `如果不是朋友反复推荐，我可能真的会错过${store}。`,
    sections: [
      { heading: '第一印象', text: `门店不算起眼，但走进去就被暖色调的环境治愈了。角落的座位很适合拍照，光线对干饭人非常友好。`, image_index: 0 },
      { heading: '必点清单', text: `招牌菜一端上桌就知道没选错：分量足、卖相好，香得让人先拍后吃。建议两个人点两份主食加一个小食，刚刚好。`, image_index: 1 },
      { heading: '真实感受', text: `价格在小店里算实在，人均不吓人。唯一小缺点是饭点要排队，建议错峰来。整体来说，是会想再带朋友来第二次的店。`, image_index: 2 }
    ],
    cta: `想去的话记得先收藏，别到时候找不到啦～`,
    tags: ['#探店', `#${store}`, '#周末去哪儿', '#宝藏小店']
  })
}
