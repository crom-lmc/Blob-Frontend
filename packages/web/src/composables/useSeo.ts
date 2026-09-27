import { onMounted, watch } from 'vue'
import { useSiteStore } from '@/stores/site'

interface SeoOptions {
  title?: string
  description?: string
  /** article 页面会补充 og:type 与 JSON-LD */
  type?: 'website' | 'article'
  jsonLd?: Record<string, any> | null
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

let ldEl: HTMLScriptElement | null = null

/**
 * 页面级 SEO：动态设置 title / description / og 标签，文章页追加 JSON-LD。
 * 支持传入 getter，便于数据异步加载后再更新（如文章详情）。
 */
export function useSeo(source: SeoOptions | (() => SeoOptions)) {
  const site = useSiteStore()
  const options = () => (typeof source === 'function' ? source() : source)

  function apply() {
    const opt = options()
    const title = opt.title ? `${opt.title} · ${site.title}` : site.title
    const desc = opt.description || site.seoDesc || site.subtitle
    document.title = title
    upsertMeta('name', 'description', desc)
    upsertMeta('name', 'keywords', site.seoKeywords)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', desc)
    upsertMeta('property', 'og:type', opt.type === 'article' ? 'article' : 'website')
    upsertMeta('property', 'og:site_name', site.title)

    if (opt.jsonLd) {
      if (!ldEl) {
        ldEl = document.createElement('script')
        ldEl.type = 'application/ld+json'
        document.head.appendChild(ldEl)
      }
      ldEl.textContent = JSON.stringify(opt.jsonLd)
    } else if (ldEl) {
      ldEl.remove()
      ldEl = null
    }
  }

  onMounted(apply)
  watch(() => [options().title, options().description, site.title], apply)
}
