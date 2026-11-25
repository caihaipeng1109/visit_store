import type { Brief, DraftContent } from './types'

export function buildPrompt(brief: Brief, imageCount: number): string {
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
${brief.avoid || '无夸张虚假宣传'}

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

export function parseContent(raw: unknown): DraftContent {
  let json: any = null

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
    const text = String((raw as any)?.choices?.[0]?.message?.content || raw || '')
    return {
      title_variants: ['（模型返回格式异常，请重试）'],
      opening_hook: '',
      sections: [{ heading: '原文', text, image_index: null }],
      cta: '',
      tags: [],
      plain: text
    }
  }

  const sections: any[] = Array.isArray(json.sections) ? json.sections : []
  const normalized = sections.map((s, i) => ({
    heading: String(s.heading || `第 ${i + 1} 段`),
    text: String(s.text || ''),
    image_index: Number.isInteger(s.image_index) ? s.image_index : null
  }))

  const titles = Array.isArray(json.title_variants)
    ? json.title_variants.map(String).filter(Boolean)
    : []
  const tags = Array.isArray(json.tags) ? json.tags.map(String).filter(Boolean) : []

  const parts: string[] = []
  parts.push(titles[0] || '探店笔记')
  if (json.opening_hook) parts.push('', String(json.opening_hook))
  normalized.forEach((s) => parts.push('', `【${s.heading}】`, s.text))
  if (json.cta) parts.push('', String(json.cta))
  if (tags.length) parts.push('', tags.join(' '))

  return {
    title_variants: titles,
    opening_hook: String(json.opening_hook || ''),
    sections: normalized,
    cta: String(json.cta || ''),
    tags,
    plain: parts.join('\n')
  }
}
