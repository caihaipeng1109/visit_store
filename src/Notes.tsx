import { useMemo, useState } from 'react'
import type { Note } from './types'

export default function Notes({
  notes,
  setNotes,
  notify
}: {
  notes: Note[]
  setNotes: (updater: (prev: Note[]) => Note[]) => void
  notify: (msg: string) => void
}) {
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [onlyFav, setOnlyFav] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes
      .filter((n) => !onlyFav || n.favorited)
      .filter((n) => !q || `${n.store} ${n.title} ${n.content.plain}`.toLowerCase().includes(q))
      .sort((a, b) => b.id.localeCompare(a.id))
  }, [notes, query, onlyFav])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    notify('文案已复制')
  }

  const download = (note: Note) => {
    const blob = new Blob([note.content.plain], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${note.store}-${note.title.slice(0, 12)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleFav = (id: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, favorited: !n.favorited } : n)))
  }

  const remove = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (openId === id) setOpenId(null)
    notify('已删除')
  }

  return (
    <div className="page notes-page">
      <section className="card">
        <div className="card-title">我的笔记库</div>
        <p className="hint">像微信笔记一样保存、搜索、收藏，随时复制去各平台发布。</p>
        <div className="search-row">
          <input value={query} placeholder="搜索店铺或文案内容" onChange={(e) => setQuery(e.target.value)} />
          <button className={`btn btn-mini ${onlyFav ? 'btn-primary' : 'btn-outline'}`} onClick={() => setOnlyFav(!onlyFav)}>
            {onlyFav ? '★ 收藏' : '☆ 收藏'}
          </button>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">✎</div>
          <p>{notes.length === 0 ? '还没有笔记，去写稿页生成第一篇吧' : '没有匹配的笔记'}</p>
        </div>
      ) : (
        filtered.map((note) => (
          <section className="card note-card" key={note.id}>
            <div className="note-head" onClick={() => setOpenId(openId === note.id ? null : note.id)}>
              <div>
                <h3>{note.title}</h3>
                <p className="note-meta">{note.store} · {note.platform} · {note.createdAt} · {note.imageCount} 张图</p>
              </div>
              <span className="arrow">{openId === note.id ? '▴' : '▾'}</span>
            </div>
            {openId === note.id && (
              <div className="note-detail">
                <pre>{note.content.plain}</pre>
                <div className="note-actions">
                  <button className="btn btn-mini" onClick={() => copy(note.content.plain)}>复制文案</button>
                  <button className="btn btn-mini" onClick={() => download(note)}>下载 TXT</button>
                  <button className="btn btn-mini" onClick={() => toggleFav(note.id)}>{note.favorited ? '★ 已收藏' : '☆ 收藏'}</button>
                  <button className="btn btn-mini danger-text" onClick={() => remove(note.id)}>删除</button>
                </div>
              </div>
            )}
          </section>
        ))
      )}
    </div>
  )
}
