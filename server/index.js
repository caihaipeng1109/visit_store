import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { listModels, hasAnyModel, callModel } from './models.js'
import { buildPrompt, parseContent, mockContent } from './prompts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })
dotenv.config({ path: path.join(__dirname, '../.env') })

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '4mb' }))

app.get('/api/health', (req, res) => res.json({ ok: true, demo: !hasAnyModel() }))

app.get('/api/models', (req, res) => {
  res.json({ models: listModels(), demo: !hasAnyModel() })
})

app.post('/api/generate', async (req, res) => {
  const { brief = {}, modelIds = [], imageCount = 0, avoidList = [] } = req.body || {}

  if (!hasAnyModel()) {
    await new Promise((r) => setTimeout(r, 700))
    return res.json({
      demo: true,
      candidates: [
        { id: 'demo-1', model: '演示模式 A', data: mockContent(brief) },
        { id: 'demo-2', model: '演示模式 B', data: mockContent(brief) }
      ]
    })
  }

  const ids = modelIds.length ? modelIds : listModels().map((m) => m.id)
  const prompt = buildPrompt({ brief, imageCount, avoidList })
  const messages = [{ role: 'user', content: prompt }]

  const candidates = await Promise.all(ids.map(async (id) => {
    try {
      const raw = await callModel(id, messages)
      const spec = listModels().find((m) => m.id === id)
      return { id, model: spec?.name || id, data: parseContent(raw), ok: true }
    } catch (err) {
      return { id, model: id, ok: false, error: err.response?.data?.error?.message || err.message }
    }
  }))

  res.json({ demo: false, candidates })
})

app.use(express.static(path.join(__dirname, '../dist')))
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'), (err) => {
    if (err) res.status(404).send('请先运行 npm run dev，或执行 npm run build')
  })
})

app.listen(PORT, () => {
  console.log(`探店笔记工坊后端已启动：http://localhost:${PORT}`)
  console.log(hasAnyModel() ? `已加载模型：${listModels().map((m) => m.name).join('、')}` : '当前为演示模式，配置 .env 中的 API Key 后即可调用真实模型')
})
