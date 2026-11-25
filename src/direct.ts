export interface DirectConfig {
  enabled: boolean
  name: string
  baseUrl: string
  model: string
  apiKey: string
}

const STORAGE_KEY = 'tanjiu_direct_config_v1'

export const defaultDirectConfig: DirectConfig = {
  enabled: false,
  name: 'OpenRouter 免费模型',
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'meta-llama/llama-3.1-8b-instruct:free',
  apiKey: ''
}

export function loadDirect(): DirectConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaultDirectConfig, ...JSON.parse(raw) }
  } catch {
    // ignore
  }
  return { ...defaultDirectConfig, enabled: false }
}

export function saveDirect(cfg: DirectConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

export async function callDirect(cfg: DirectConfig, prompt: string): Promise<string> {
  if (!cfg.apiKey.trim()) throw new Error('请先填写 API Key')
  if (!cfg.baseUrl.trim() || !cfg.model.trim()) throw new Error('请填写接口地址和模型名')

  const url = `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey.trim()}`
    },
    body: JSON.stringify({
      model: cfg.model.trim(),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      top_p: 0.95
    })
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`模型请求失败（${res.status}）：${text.slice(0, 160) || '可能是 Key 错误或该平台不允许浏览器跨域'}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('模型未返回内容')
  return content
}
