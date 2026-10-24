import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/common'
import katex from 'katex'

/**
 * Markdown 渲染管线（前后台共用，保证管理端预览与前台展示一致）：
 * 代码高亮 + 数学公式 + 复制按钮结构。
 * 配套样式见 shared/src/styles/markdown.css（.markdown-body）。
 */
/**
 * 生成暗色代码块 HTML（与管理端 md-editor-v3 预览一致）：
 * mac 圆点 + 语言标签 + 复制代码 + 行号槽。
 */
export function codeBlockHtml(code: string, lang: string): string {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const html = hljs.highlight(code, { language, ignoreIllegals: true }).value
  const lineCount = code.replace(/\n$/, '').split('\n').length
  const gutter = Array.from({ length: lineCount }, (_, i) => `<li>${i + 1}</li>`).join('')
  return `<div class="md-code-block"><div class="md-code-block__head"><span class="md-code-block__dots"><i></i><i></i><i></i></span><span class="md-code-block__lang">${language}</span><button class="md-code-block__copy" type="button" data-copy>复制代码</button></div><div class="md-code-block__body"><ul class="md-code-block__gutter">${gutter}</ul><pre class="hljs language-${language}"><code>${html}</code></pre></div></div>`
}

const md: MarkdownIt = new MarkdownIt({
  html: false, // 禁止原始 HTML，降低 XSS 风险
  linkify: true,
  typographer: false,
  highlight(code: string, lang: string) {
    return codeBlockHtml(code, lang)
  }
})

/**
 * 把后端渲染 HTML 中的 <pre><code> 升级为暗色代码块（重新高亮 + 行号 + 复制按钮）。
 * 后端（含 mock）的 content_html 通常是普通 <pre><code>，前台消费前统一走此函数，
 * 保证前台代码块风格与管理端一致。
 */
export function upgradeCodeBlocks(html: string): string {
  if (typeof window === 'undefined' || !html) return html
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('pre > code').forEach((code) => {
    const pre = code.parentElement
    if (!pre || pre.closest('.md-code-block')) return
    const langClass = Array.from(code.classList).find((c) => c.startsWith('language-'))
    const lang = langClass ? langClass.slice('language-'.length) : ''
    const wrap = document.createElement('div')
    wrap.innerHTML = codeBlockHtml(code.textContent || '', lang)
    const block = wrap.firstElementChild
    if (block) pre.replaceWith(block)
  })
  return div.innerHTML
}

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

/** 任务列表：后端渲染的 "- [ ] xxx" 会留成纯文本 li，替换为复选框（与管理端预览一致） */
function renderTaskLists(html: string): string {
  return html.replace(/(<li(?:\s[^>]*)?>)\s*\[([ xX])\]\s+/g, (_, tag: string, mark: string) => {
    const checked = mark.toLowerCase() === 'x'
    return `${tag.replace(/<li/i, '<li class="task-item"')}<input class="task-checkbox" type="checkbox"${checked ? ' checked' : ''} disabled> `
  })
}

/**
 * 增强后端渲染的 content_html，使前台展示与管理端预览一致：
 * 代码块升级（高亮/行号/复制按钮）→ 任务列表 → 数学公式（KaTeX）。
 * 前台消费 contentHtml 前统一调用本函数。
 */
export function enhanceHtml(html: string): string {
  if (!html || typeof window === 'undefined') return html
  return renderMath(renderTaskLists(upgradeCodeBlocks(html)))
}

/** 按需加载时对外暴露的工具集合类型 */
export interface MarkdownUtils {
  renderMarkdown(src: string): string
  enhanceHtml(html: string): string
  upgradeCodeBlocks(html: string): string
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
