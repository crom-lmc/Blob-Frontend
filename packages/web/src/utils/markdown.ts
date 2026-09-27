import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/common'
import katex from 'katex'
import type { ThemeConfig } from '@blog/shared'

/**
 * Markdown 兜底渲染：
 * 正常情况下正文使用后端渲染好的 content_html；
 * 当后台未返回 HTML（例如导入的旧数据）时，前台做一次等价渲染（代码高亮 + 数学公式）。
 */
const md: MarkdownIt = new MarkdownIt({
  html: false, // 禁止原始 HTML，降低 XSS 风险
  linkify: true,
  typographer: false,
  highlight(code: string, lang: string) {
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
    const html = hljs.highlight(code, { language, ignoreIllegals: true }).value
    return `<pre class="hljs-wrap"><button class="code-copy" type="button" data-copy>复制</button><code class="hljs language-${language}">${html}</code></pre>`
  }
})

/** 渲染数学公式（跳过代码块内容） */
function renderMath(html: string): string {
  // 先切出 pre/code 区块，避免公式替换破坏代码
  const parts = html.split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/g)
  return parts
    .map((part) => {
      if (part.startsWith('<pre') || part.startsWith('<code')) return part
      // 块级公式 $$...$$
      let out = part.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => {
        try {
          return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })
        } catch {
          return `<code>${tex}</code>`
        }
      })
      // 行内公式 $...$
      out = out.replace(/(^|[^\\])\$([^$\n]+?)\$/g, (_, prefix: string, tex: string) => {
        try {
          return `${prefix}${katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })}`
        } catch {
          return `${prefix}$${tex}$`
        }
      })
      return out
    })
    .join('')
}

/** 按需加载时对外暴露的工具集合类型 */
export interface MarkdownUtils {
  renderMarkdown(src: string): string
  withHeadingIds(html: string): string
  extractToc(html: string): { id: string; text: string; level: number }[]
}

export function renderMarkdown(src: string): string {
  if (!src) return ''
  return renderMath(md.render(src))
}

/** 给正文 HTML 中的标题加锚点 id，供 TOC 使用 */
export function withHeadingIds(html: string): string {
  if (typeof window === 'undefined') return html
  const div = document.createElement('div')
  div.innerHTML = html
  const used = new Set<string>()
  div.querySelectorAll('h1,h2,h3,h4').forEach((el) => {
    const text = (el.textContent || '').trim()
    let id = text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    if (!id) id = 'section'
    let finalId = id
    let i = 1
    while (used.has(finalId)) finalId = `${id}-${i++}`
    used.add(finalId)
    el.setAttribute('id', finalId)
  })
  return div.innerHTML
}

/** 从正文 HTML 中提取目录 */
export function extractToc(html: string): { id: string; text: string; level: number }[] {
  if (typeof window === 'undefined') return []
  const div = document.createElement('div')
  div.innerHTML = html
  return Array.from(div.querySelectorAll('h2,h3')).map((el) => ({
    id: el.id || (el.textContent || '').trim(),
    text: (el.textContent || '').trim(),
    level: Number(el.tagName.replace('H', ''))
  }))
}

/** 正文区域最大宽度受主题 contentWidth 控制 */
export function contentStyle(config: ThemeConfig) {
  return { maxWidth: `${config.space.contentWidth}px` }
}
