import { useEffect, useState } from 'react'
import Compose from './Compose'
import Notes from './Notes'
import { fetchModels } from './api'
import { loadDirect, saveDirect, defaultDirectConfig, type DirectConfig } from './direct'
import type { ModelInfo, Note } from './types'

type Tab = 'compose' | 'notes' | 'settings'

const STORAGE_KEY = 'tanjiu_notes_v1'

const directPresets = [
  { name: 'Llama 3.1 8B', model: 'meta-llama/llama-3.1-8b-instruct:free' },
  { name: 'Gemini 2.0 Flash', model: 'google/gemini-2.0-flash-exp:free' },
  { name: 'DeepSeek R1', model: 'deepseek/deepseek-r1:free' },
  { name: 'Qwen 2.5 7B', model: 'qwen/qwen-2.5-7b-instruct:free' }
]

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('compose')
  const [models, setModels] = useState<ModelInfo[]>([])
  const [demo, setDemo] = useState(true)
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [toast, setToast] = useState('')
  const [directCfg, setDirectCfg] = useState<DirectConfig>(() => loadDirect())

  const refreshModels = () => {
    fetchModels()
      .then((res) => { setModels(res.models); setDemo(res.demo) })
      .catch(() => {
        if (!loadDirect().enabled) setToast('后端未连接，当前为演示模式')
      })
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  useEffect(() => { refreshModels() }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const updateDirect = (patch: Partial<DirectConfig>) => {
    const next = { ...directCfg, ...patch }
    setDirectCfg(next)
    saveDirect(next)
    refreshModels()
  }

  const resetDirect = () => {
    setDirectCfg({ ...defaultDirectConfig })
    saveDirect({ ...defaultDirectConfig })
    refreshModels()
  }

  const saveNote = (note: Note) => {
    setNotes((prev) => [note, ...prev])
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">探店笔记工坊</div>
        <div className="topbar-sub">批量写稿 · 多模型对比 · 笔记沉淀</div>
      </header>

      <main>
        {tab === 'compose' && <Compose models={models} demo={demo} onSave={saveNote} />}
        {tab === 'notes' && <Notes notes={notes} setNotes={setNotes} notify={setToast} />}
        {tab === 'settings' && (
          <div className="page">
            <section className="card">
              <div className="card-title">当前状态</div>
              <p className="hint">
                {demo
                  ? '演示模式：使用内置示例文案，无需任何 Key。'
                  : directCfg.enabled
                    ? `浏览器直连模式：已连接 ${models[0]?.name || '模型'}。`
                    : `后端代理模式：已接入 ${models.length} 个模型。`}
              </p>
              {models.map((m) => (
                <div className="setting-row" key={m.id}>
                  <strong>{m.name}</strong>
                  <span>{m.model}</span>
                </div>
              ))}
            </section>

            <section className="card">
              <div className="card-title">方式一：免后端直连（备用）</div>
              <p className="hint">没有部署后端时，开启后网页直接调用模型，Key 只存在你自己手机的浏览器里。电脑不用开机，手机随时能用。</p>
              <label className="switch-row">
                <span>启用直连模式</span>
                <input type="checkbox" checked={directCfg.enabled} onChange={(e) => updateDirect({ enabled: e.target.checked })} />
              </label>
              {directCfg.enabled && (
                <>
                  <label className="field"><span>显示名称</span><input value={directCfg.name} onChange={(e) => updateDirect({ name: e.target.value })} /></label>
                  <label className="field"><span>接口地址（OpenAI 兼容，通常含 /v1）</span><input value={directCfg.baseUrl} onChange={(e) => updateDirect({ baseUrl: e.target.value })} /></label>
                  <label className="field"><span>模型名</span><input value={directCfg.model} onChange={(e) => updateDirect({ model: e.target.value })} /></label>
                  <div className="presets">
                    <span>一键换模型（同店写多篇时换着用，避免雷同）：</span>
                    <div className="preset-buttons">
                      {directPresets.map((p) => (
                        <button key={p.model} className={`preset-chip ${directCfg.model === p.model ? 'active' : ''}`} onClick={() => updateDirect({ model: p.model, name: p.name })}>{p.name}</button>
                      ))}
                    </div>
                  </div>
                  <label className="field"><span>API Key</span><input type="password" value={directCfg.apiKey} placeholder="粘贴你的密钥" onChange={(e) => updateDirect({ apiKey: e.target.value })} /></label>
                  <p className="hint">默认填的是 OpenRouter 免费模型，可直接申请。国内模型大多不允许浏览器跨域调用，若报 CORS 错误请改用方式二或部署后端。</p>
                  <button className="btn btn-outline" onClick={resetDirect}>恢复默认</button>
                </>
              )}
            </section>

            <section className="card">
              <div className="card-title">方式二：服务器版（推荐）</div>
              <p className="hint">Key 保存在服务器上，浏览器拿不到，支持国内模型和多个模型并行生成对比。部署一次，你和家人打开同一个网址就能用，电脑完全不用开。</p>
              <ol className="steps">
                <li>把项目部署到 Vercel（免费）</li>
                <li>在 Vercel 项目设置里添加环境变量 `ZHIPU_API_KEY` 等，填入 Key</li>
                <li>重新部署完成，打开网址即可使用，无需在手机上填任何东西</li>
              </ol>
            </section>

            <section className="card">
              <div className="card-title">免费 / 低成本模型申请入口</div>
              <div className="setting-row"><strong>OpenRouter</strong><span>openrouter.ai · 推荐直连用，明确支持浏览器跨域</span></div>
              <div className="setting-row"><strong>Google Gemini</strong><span>aistudio.google.com · 免费额度，支持跨域，需网络条件</span></div>
              <div className="setting-row"><strong>智谱 GLM-4-Flash</strong><span>open.bigmodel.cn · 长期免费，国内直连，建议走后端代理</span></div>
              <div className="setting-row"><strong>硅基流动</strong><span>siliconflow.cn · 注册送额度，建议走后端代理</span></div>
              <div className="setting-row"><strong>通义千问</strong><span>bailian.console.aliyun.com · 有免费额度</span></div>
              <div className="setting-row"><strong>DeepSeek</strong><span>platform.deepseek.com · 极低成本</span></div>
            </section>

            <section className="card">
              <div className="card-title">装到手机上</div>
              <p className="hint">部署完成后，手机浏览器打开你的网址 → 菜单 → 「添加到主屏幕」，就像 App 一样全屏使用。你和家人各自添加即可，笔记存在各自手机上互不影响。</p>
            </section>
          </div>
        )}
      </main>

      <nav className="tabbar">
        <button className={tab === 'compose' ? 'active' : ''} onClick={() => setTab('compose')}><span>✎</span>写稿</button>
        <button className={tab === 'notes' ? 'active' : ''} onClick={() => setTab('notes')}><span>▤</span>笔记库</button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><span>⚙</span>设置</button>
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
