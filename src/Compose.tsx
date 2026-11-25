import { useEffect, useMemo, useRef, useState } from 'react'
import { generate } from './api'
import type { Brief, Candidate, ModelInfo, Note } from './types'

interface Img { id: string; url: string; name: string; selected: boolean }

const initialBrief: Brief = {
  store: '',
  highlights: '',
  style: '轻松自然的安利口吻',
  platform: '小红书',
  audience: '喜欢探店的年轻人',
  wordCount: '400',
  titleStyle: '有吸引力，不超过 20 字',
  keywords: '',
  avoid: ''
}

const styles = ['轻松自然的安利口吻', '专业理性测评', '文艺氛围感', '幽默吐槽', '闺蜜种草']
const platforms = ['小红书', '大众点评', '微信公众号', '抖音图文']

export default function Compose({
  models,
  demo,
  onSave
}: {
  models: ModelInfo[]
  demo: boolean
  onSave: (note: Note) => void
}) {
  const [images, setImages] = useState<Img[]>([])
  const [brief, setBrief] = useState<Brief>(initialBrief)
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const selectedImages = useMemo(() => images.filter((i) => i.selected), [images])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const next: Img[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url: URL.createObjectURL(f),
        name: f.name,
        selected: true
      }))
    setImages((prev) => [...prev, ...next])
  }

  const toggleImage = (id: string) => {
    setImages((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)))
  }

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id))
  }

  const moveImage = (index: number, delta: number) => {
    setImages((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const toggleModel = (id: string) => {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setToast('文案已复制，去平台粘贴吧')
  }

  const handleGenerate = async () => {
    if (!brief.store.trim()) {
      setError('先填写店铺名称')
      return
    }
    setLoading(true)
    setError('')
    setCandidates([])
    try {
      const res = await generate({
        brief,
        modelIds: selectedModels,
        imageCount: selectedImages.length
      })
      setCandidates(res.candidates)
      if (!res.candidates.some((c) => c.ok !== false && c.data)) {
        setError('所有模型都失败了，请检查后端日志或 API Key')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const saveNote = (candidate: Candidate, index: number) => {
    const data = candidate.data
    if (!data) return
    const finalData = { ...data, plain: index === editing && editText ? editText : data.plain }
    onSave({
      id: `${Date.now()}`,
      store: brief.store.trim() || '未命名店铺',
      platform: brief.platform,
      style: brief.style,
      title: finalData.title_variants[0] || '未命名笔记',
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      imageCount: selectedImages.length,
      content: finalData,
      favorited: false
    })
    setToast('已存入笔记库')
  }

  const openEdit = (index: number) => {
    const data = candidates[index]?.data
    if (!data) return
    setEditing(index)
    setEditText(data.plain)
  }

  const saveEdit = () => {
    if (editing === null) return
    setCandidates((prev) =>
      prev.map((c, i) => (i === editing && c.data ? { ...c, data: { ...c.data, plain: editText } } : c))
    )
    setEditing(null)
  }

  return (
    <div className="page compose-page">
      {demo && (
        <div className="demo-banner">
          演示模式：无需 Key 即可体验。到「设置」页开启直连模式或配置后端 Key，即可调用真实模型。
        </div>
      )}

      <section className="card">
        <div className="card-title"><span className="step">1</span>选择素材图片</div>
        <p className="hint">勾选要用的图片，用 ↑ ↓ 调整顺序（对应文案段落）。自动筛图会在下一版加入。</p>
        <button className="btn btn-outline" onClick={() => fileRef.current?.click()}>+ 添加图片</button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
        />
        {images.length > 0 && (
          <>
            <div className="image-grid">
              {images.map((img, idx) => (
                <div key={img.id} className={`image-item ${img.selected ? 'selected' : ''}`}>
                  <img src={img.url} alt={img.name} />
                  <div className="image-bar">
                    <button onClick={() => toggleImage(img.id)}>{img.selected ? '✓ 使用' : '○ 跳过'}</button>
                    <button onClick={() => moveImage(idx, -1)} disabled={idx === 0}>↑</button>
                    <button onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1}>↓</button>
                    <button onClick={() => removeImage(img.id)} className="danger">×</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="hint">已选 {selectedImages.length} / {images.length} 张</p>
          </>
        )}
      </section>

      <section className="card">
        <div className="card-title"><span className="step">2</span>填写创作 Brief</div>
        <label className="field">
          <span>店铺名称 *</span>
          <input value={brief.store} placeholder="例如：巷子口咖啡" onChange={(e) => setBrief({ ...brief, store: e.target.value })} />
        </label>
        <label className="field">
          <span>必写卖点</span>
          <textarea rows={2} value={brief.highlights} placeholder="招牌菜、价格、氛围、位置…" onChange={(e) => setBrief({ ...brief, highlights: e.target.value })} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>目标平台</span>
            <select value={brief.platform} onChange={(e) => setBrief({ ...brief, platform: e.target.value })}>
              {platforms.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="field">
            <span>字数</span>
            <input inputMode="numeric" value={brief.wordCount} onChange={(e) => setBrief({ ...brief, wordCount: e.target.value })} />
          </label>
        </div>
        <label className="field">
          <span>写作风格</span>
          <select value={brief.style} onChange={(e) => setBrief({ ...brief, style: e.target.value })}>
            {styles.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="field">
          <span>目标受众</span>
          <input value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} />
        </label>
        <label className="field">
          <span>标题偏好</span>
          <input value={brief.titleStyle} onChange={(e) => setBrief({ ...brief, titleStyle: e.target.value })} />
        </label>
        <label className="field">
          <span>必须包含的关键词</span>
          <input value={brief.keywords} placeholder="用逗号分隔" onChange={(e) => setBrief({ ...brief, keywords: e.target.value })} />
        </label>
        <label className="field">
          <span>不要写的内容</span>
          <input value={brief.avoid} placeholder="例如：夸大宣传、价格猜测" onChange={(e) => setBrief({ ...brief, avoid: e.target.value })} />
        </label>
      </section>

      <section className="card">
        <div className="card-title"><span className="step">3</span>选择模型并生成</div>
        {models.length === 0 ? (
          <p className="hint">当前没有可用模型，将使用演示数据。去「设置」查看如何申请 Key。</p>
        ) : (
          <div className="model-list">
            {models.map((m) => (
              <button key={m.id} className={`model-chip ${selectedModels.includes(m.id) ? 'active' : ''}`} onClick={() => toggleModel(m.id)}>
                <strong>{m.name}</strong>
                <small>{m.tag} · {m.model}</small>
              </button>
            ))}
          </div>
        )}
        <p className="hint">不选则默认使用全部已配置模型，每个模型生成一版供你对比。</p>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading ? '生成中，请稍候…' : '生成探店笔记'}
        </button>
        {error && <p className="error">{error}</p>}
      </section>

      {candidates.length > 0 && (
        <section className="card">
          <div className="card-title"><span className="step">4</span>对比并采用</div>
          <p className="hint">左右滑动切换不同模型的版本，满意后点「采用」存入笔记库。</p>
          <div className="candidate-scroll">
            {candidates.map((c, idx) => (
              <div className="candidate" key={c.id}>
                <div className="candidate-head">
                  <strong>{c.model}</strong>
                  <span>{idx + 1}/{candidates.length}</span>
                </div>
                {!c.data ? (
                  <p className="error">{c.error || '生成失败'}</p>
                ) : (
                  <>
                    <h3>{c.data.title_variants[0] || '未生成标题'}</h3>
                    <div className="candidate-body">
                      {c.data.sections.map((s, i) => (
                        <div className="draft-section" key={i}>
                          <div className="section-head">
                            <b>{s.heading}</b>
                            {s.image_index !== null && <em>配图 {s.image_index + 1}</em>}
                          </div>
                          <p>{s.text}</p>
                        </div>
                      ))}
                    </div>
                    <div className="tags">{c.data.tags.map((t, i) => <span key={i}>{t}</span>)}</div>
                    <div className="candidate-actions">
                      <button className="btn btn-mini" onClick={() => copyText(c.data!.plain)}>复制</button>
                      <button className="btn btn-mini" onClick={() => openEdit(idx)}>编辑</button>
                      <button className="btn btn-mini btn-primary" onClick={() => saveNote(c, idx)}>采用</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {editing !== null && (
        <div className="modal">
          <div className="modal-head">
            <strong>编辑文案</strong>
            <button onClick={() => setEditing(null)}>关闭</button>
          </div>
          <textarea className="edit-area" value={editText} onChange={(e) => setEditText(e.target.value)} />
          <button className="btn btn-primary" onClick={saveEdit}>保存修改</button>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
