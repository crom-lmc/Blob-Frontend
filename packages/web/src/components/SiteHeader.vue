<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSiteStore } from '@/stores/site'
import { useThemeStore } from '@/stores/theme'
import ThemeToggle from './ThemeToggle.vue'

const site = useSiteStore()
const theme = useThemeStore()
const router = useRouter()

const keyword = ref('')
const scrolled = ref(false)
const menuOpen = ref(false)

const navItems = [
  { to: '/', label: '首页' },
  { to: '/posts', label: '文章' },
  { to: '/categories', label: '分类' },
  { to: '/tags', label: '标签' },
  { to: '/archives', label: '归档' },
  { to: '/page/about', label: '关于' }
]

const headerStyle = computed(() => theme.layout.headerStyle)

function onScroll() {
  scrolled.value = window.scrollY > 8
}

function submitSearch() {
  const q = keyword.value.trim()
  if (!q) return
  menuOpen.value = false
  router.push({ name: 'search', query: { q } })
}

watch(
  () => router.currentRoute.value.fullPath,
  () => (menuOpen.value = false)
)

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="site-header" :class="[`header-${headerStyle}`, { 'is-scrolled': scrolled }]">
    <div class="container header-inner">
      <button class="menu-btn" aria-label="打开菜单" @click="menuOpen = !menuOpen">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </button>

      <RouterLink to="/" class="brand">
        <img v-if="site.settings.site_logo" :src="site.settings.site_logo" class="brand-logo" alt="logo" />
        <span class="brand-title">{{ site.title }}</span>
      </RouterLink>

      <nav class="nav">
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="nav-link">
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="actions">
        <form class="search" role="search" @submit.prevent="submitSearch">
          <svg viewBox="0 0 24 24" width="15" height="15" class="search-icon" aria-hidden="true">
            <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <input v-model="keyword" class="search-input" type="search" placeholder="搜索文章…" aria-label="搜索文章" />
        </form>
        <ThemeToggle />
      </div>
    </div>

    <!-- 移动端抽屉 -->
    <div v-if="menuOpen" class="drawer-mask" @click="menuOpen = false" />
    <aside class="drawer" :class="{ open: menuOpen }">
      <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="drawer-link">
        {{ item.label }}
      </RouterLink>
    </aside>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

/* 透明头部：未滚动时融入背景 */
.header-transparent {
  background: transparent;
  border-bottom-color: transparent;
}

.header-transparent.is-scrolled {
  background: var(--color-surface);
  border-bottom-color: var(--color-border);
}

.header-static {
  position: static;
}

.header-fixed {
  position: fixed;
  left: 0;
  right: 0;
}

.header-inner {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  height: var(--header-height);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text);
  font-weight: var(--heading-weight);
  font-size: var(--font-size-h5);
  white-space: nowrap;
}

.brand-logo {
  height: 26px;
  width: auto;
  border-radius: var(--radius-sm);
}

.nav {
  display: flex;
  gap: var(--space-4);
  margin-left: var(--space-3);
  flex: 1;
}

.nav-link {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  padding: var(--space-1) 0;
  border-bottom: 2px solid transparent;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.search {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: var(--space-2);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  width: 180px;
  padding: var(--space-1) var(--space-3) var(--space-1) var(--space-6);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-bg-subtle);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  outline: none;
  transition: all 0.15s ease;
}

.search-input:focus {
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 3px var(--color-primary-a12);
}

.menu-btn {
  display: none;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-md);
  padding: var(--space-1);
}

.drawer-mask {
  position: fixed;
  inset: 0;
  background: var(--color-shadow);
  opacity: 0.35;
  z-index: 40;
}

.drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 240px;
  z-index: 60;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: calc(var(--header-height) + var(--space-3)) var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  transform: translateX(-100%);
  transition: transform 0.22s ease;
}

.drawer.open {
  transform: translateX(0);
}

.drawer-link {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.drawer-link.router-link-active {
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

/* 手机：隐藏导航与搜索，改为抽屉 */
@media (max-width: 640px) {
  .nav,
  .search {
    display: none;
  }
  .menu-btn {
    display: inline-flex;
  }
  .actions {
    margin-left: auto;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .search-input {
    width: 140px;
  }
}

@media (min-width: 641px) {
  .drawer,
  .drawer-mask {
    display: none;
  }
}
</style>
