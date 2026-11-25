import axios from 'axios'

const MODEL_SPECS = [
  {
    id: 'zhipu-flash',
    name: '智谱 GLM-4-Flash',
    tag: '免费',
    provider: 'zhipu',
    keyEnv: 'ZHIPU_API_KEY',
    modelEnv: 'ZHIPU_MODEL',
    defaultModel: 'glm-4-flash',
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
  },
  {
    id: 'zhipu-vision',
    name: '智谱 GLM-4V-Flash（识图）',
    tag: '免费',
    provider: 'zhipu',
    keyEnv: 'ZHIPU_API_KEY',
    modelEnv: 'ZHIPU_VISION_MODEL',
    defaultModel: 'glm-4v-flash',
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
  },
  {
    id: 'siliconflow',
    name: '硅基流动 Qwen2.5-7B',
    tag: '免费额度',
    provider: 'siliconflow',
    keyEnv: 'SILICONFLOW_API_KEY',
    modelEnv: 'SILICONFLOW_MODEL',
    defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
    url: 'https://api.siliconflow.cn/v1/chat/completions'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek Chat',
    tag: '低成本',
    provider: 'deepseek',
    keyEnv: 'DEEPSEEK_API_KEY',
    modelEnv: 'DEEPSEEK_MODEL',
    defaultModel: 'deepseek-chat',
    url: 'https://api.deepseek.com/v1/chat/completions'
  },
  {
    id: 'qwen',
    name: '通义千问 Turbo',
    tag: '免费额度',
    provider: 'qwen',
    keyEnv: 'QWEN_API_KEY',
    modelEnv: 'QWEN_MODEL',
    defaultModel: 'qwen-turbo',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter 免费模型',
    tag: '免费',
    provider: 'openrouter',
    keyEnv: 'OPENROUTER_API_KEY',
    modelEnv: 'OPENROUTER_MODEL',
    defaultModel: 'meta-llama/llama-3.1-8b-instruct:free',
    url: 'https://openrouter.ai/api/v1/chat/completions'
  },
  {
    id: 'custom',
    name: '自定义 OpenAI 兼容模型',
    tag: '自建',
    provider: 'custom',
    keyEnv: 'CUSTOM_API_KEY',
    modelEnv: 'CUSTOM_MODEL',
    defaultModel: '',
    url: ''
  }
]

function specById(id) {
  return MODEL_SPECS.find((s) => s.id === id)
}

export function listModels() {
  return MODEL_SPECS
    .filter((spec) => process.env[spec.keyEnv])
    .map((spec) => ({
      id: spec.id,
      name: spec.name,
      tag: spec.tag,
      model: process.env[spec.modelEnv] || spec.defaultModel || '自定义'
    }))
}

export function hasAnyModel() {
  return listModels().length > 0
}

export async function callModel(id, messages) {
  const spec = specById(id)
  if (!spec) throw new Error(`未知模型：${id}`)
  if (!process.env[spec.keyEnv]) throw new Error(`${spec.name} 尚未配置 API Key`)

  const model = process.env[spec.modelEnv] || spec.defaultModel
  const url = spec.id === 'custom' ? process.env.CUSTOM_BASE_URL : spec.url
  if (!model || !url) throw new Error(`${spec.name} 缺少模型名或接口地址`)

  const headers = {
    Authorization: `Bearer ${process.env[spec.keyEnv]}`,
    'Content-Type': 'application/json'
  }
  if (spec.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'http://localhost'
    headers['X-Title'] = '探店笔记工坊'
  }

  const res = await axios.post(url, {
    model,
    messages,
    temperature: 0.9,
    top_p: 0.95,
    stream: false
  }, { headers, timeout: 120000 })

  const content = res.data?.choices?.[0]?.message?.content
  if (!content) throw new Error('模型未返回内容')
  return content
}
