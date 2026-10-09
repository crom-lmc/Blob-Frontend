<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{ items: { id: string; text: string; level: number }[] }>()
const activeId = ref('')
const collapsed = ref(false)
let observer: IntersectionObserver | null = null

/** 滚动高亮：优先用 IntersectionObserver，降级为滚动监听 */
function bind() {
  unbind()
  if (!props.items.length) return
  const headings = props.items
    .map((i) => document.getElementById(i.id))
    .filter((el): el is HTMLElement => !!el)
  if (!headings.length) return

  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length) activeId.value = visible[0].target.id
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: [0, 1] }
    )
    headings.forEach((h) => observer?.observe(h))
  } else {
    window.addEventListener('scroll', onScroll, { passive: true })
  }
}

function onScroll() {
  const top = window.scrollY + 120
  let current = props.items[0]?.id || ''
  for (const item of props.items) {
    const el = document.getElementById(item.id)
    if (el && el.offsetTop <= top) current = item.id
  }
  activeId.value = current
}

function unbind() {
  observer?.disconnect()
  observer = null
  window.removeEventListener('scroll', onScroll)
}

function go(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const target = el.getBoundingClientRect().top + window.scrollY - 88
  window.scrollTo({ top: target, behavior: 'smooth' })
}

watch(() => props.items, bind, { deep: true })
onMounted(bind)
onUnmounted(unbind)
</script>

<template>
  <aside v-if="items.length" class="toc" :class="{ collapsed }">
    <div class="toc-head">
      <span class="toc-title">目录</span>
      <button class="toc-toggle" :aria-label="collapsed ? '展开目录' : '收起目录'" @click="collapsed = !collapsed">
        {{ collapsed ? '展开' : '收起' }}
      </button>
    </div>
    <ul v-show="!collapsed" class="toc-list">
      <li v-for="item in items" :key="item.id" :class="[`level-${item.level}`, { active: activeId === item.id }]">
        <a :href="`#${item.id}`" @click.prevent="go(item.id)">{{ item.text }}</a>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.toc {
  position: sticky;
  top: calc(var(--header-height) + var(--space-4));
  align-self: start;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  max-height: calc(100vh - var(--header-height) - var(--space-8));
  overflow-y: auto;
}

.toc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.toc-title {
  font-size: var(--font-size-sm);
  font-weight: var(--heading-weight);
}

.toc-toggle {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.toc-list li a {
  display: block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  border-left: 2px solid transparent;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toc-list li.level-3 a {
  padding-left: var(--space-4);
}

.toc-list li.active a {
  color: var(--color-primary);
  background: var(--color-primary-subtle);
  border-left-color: var(--color-primary);
}

/* 手机端：目录收起为悬浮按钮 */
@media (max-width: 640px) {
  .toc {
    position: fixed;
    right: var(--space-3);
    bottom: var(--space-8);
    top: auto;
    z-index: 30;
    max-height: 50vh;
    width: 220px;
    box-shadow: 0 var(--space-2) var(--space-6) -2px var(--color-primary-a24);
  }
}
</style>
