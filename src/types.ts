export interface ModelInfo {
  id: string
  name: string
  tag: string
  model: string
}

export interface Section {
  heading: string
  text: string
  image_index: number | null
}

export interface DraftContent {
  title_variants: string[]
  opening_hook: string
  sections: Section[]
  cta: string
  tags: string[]
  plain: string
}

export interface Candidate {
  id: string
  model: string
  ok?: boolean
  error?: string
  data?: DraftContent
}

export interface Note {
  id: string
  store: string
  platform: string
  style: string
  title: string
  createdAt: string
  imageCount: number
  content: DraftContent
  favorited: boolean
}

export interface Brief {
  store: string
  highlights: string
  style: string
  platform: string
  audience: string
  wordCount: string
  titleStyle: string
  keywords: string
  avoid: string
}
