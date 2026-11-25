import type { Brief, Candidate, ModelInfo } from './types'
import { loadDirect, callDirect } from './direct'
import { buildPrompt, parseContent } from './prompt'

export interface GeneratePayload {
  brief: Brief
  modelIds: string[]
  imageCount: number
  avoidList?: string[]
}

export async function fetchModels(): Promise<{ models: ModelInfo[]; demo: boolean }> {
  const cfg = loadDirect()

  if (cfg.enabled) {
    return {
      models: cfg.apiKey
        ? [{ id: 'direct', name: cfg.name || '直连模型', tag: '浏览器直连', model: cfg.model }]
        : [],
      demo: !cfg.apiKey
    }
  }

  const res = await fetch('/api/models')
  if (!res.ok) throw new Error('无法连接后端服务，请确认已运行 npm run dev')
  return res.json()
}

export async function generate(payload: GeneratePayload): Promise<{ demo: boolean; candidates: Candidate[] }> {
  const cfg = loadDirect()

  if (cfg.enabled) {
    const prompt = buildPrompt(payload.brief, payload.imageCount)
    try {
      const raw = await callDirect(cfg, prompt)
      return {
        demo: false,
        candidates: [{
          id: `direct-${Date.now()}`,
          model: cfg.name || '直连模型',
          data: parseContent(raw),
          ok: true
        }]
      }
    } catch (e) {
      return {
        demo: false,
        candidates: [{
          id: 'direct-error',
          model: cfg.name || '直连模型',
          ok: false,
          error: e instanceof Error ? e.message : '直连调用失败'
        }]
      }
    }
  }

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('生成失败，请检查后端日志')
  return res.json()
}
