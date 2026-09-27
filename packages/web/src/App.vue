<script setup lang="ts">
import { watch } from 'vue'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import FloatingTools from '@/components/FloatingTools.vue'
import ImageLightbox from '@/components/ImageLightbox.vue'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()

/** 注入主题配置里的自定义 head HTML（如统计代码、额外 meta） */
watch(
  () => theme.config.customHeadHtml,
  (html) => {
    let holder = document.getElementById('custom-head') as HTMLDivElement | null
    if (!holder) {
      holder = document.createElement('div')
      holder.id = 'custom-head'
      document.head.appendChild(holder)
    }
    holder.innerHTML = html || ''
  },
  { immediate: true }
)
</script>

<template>
  <div
    class="app-shell"
    :class="[
      `density-${theme.layout.density}`,
      `sidebar-${theme.layout.sidebar}`,
      `header-${theme.layout.headerStyle}`
    ]"
  >
    <a class="skip-link" href="#main">跳到主内容</a>
    <SiteHeader />
    <main id="main" class="app-main">
      <RouterView v-slot="{ Component }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <SiteFooter />
    <FloatingTools />
    <ImageLightbox />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  padding: var(--section-gap) 0;
}

/*
 * headerStyle=fixed 时头部脱离文档流，必须给主内容让出头部高度，
 * 否则首屏区块（hero 的顶部内边距与圆角）会被压在头部下面。
 */
.app-shell.header-fixed > .app-main {
  padding-top: calc(var(--header-height) + var(--section-gap));
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  background: var(--color-primary);
  color: var(--color-on-primary);
  padding: var(--space-2) var(--space-4);
  z-index: 100;
  border-radius: var(--radius-md);
}

.skip-link:focus {
  left: var(--space-3);
  top: var(--space-3);
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
