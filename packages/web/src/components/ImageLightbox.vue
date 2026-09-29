<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

/** 图片灯箱：全局委托监听正文图片点击 */
const src = ref('')
const alt = ref('')

function onClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.tagName !== 'IMG') return
  // 图片本身在链接里（如文章卡片封面 → 文章详情、正文里的图片链接）：
  // 不弹预览，交给链接自己跳转
  if (target.closest('a')) return
  const host = target.closest('.markdown-body, .media-grid, .post-card')
  if (!host) return
  src.value = (target as HTMLImageElement).currentSrc || (target as HTMLImageElement).src
  alt.value = (target as HTMLImageElement).alt || ''
  document.body.style.overflow = 'hidden'
}

function close() {
  src.value = ''
  document.body.style.overflow = ''
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', onClick)
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('click', onClick)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="src" class="lightbox" @click="close">
      <button class="lightbox-close" aria-label="关闭" @click.stop="close">×</button>
      <img :src="src" :alt="alt" @click.stop />
      <p v-if="alt" class="lightbox-caption">{{ alt }}</p>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  background: var(--color-shadow);
  padding: var(--space-6);
  cursor: zoom-out;
}

.lightbox img {
  max-width: 100%;
  max-height: 82vh;
  border-radius: var(--radius-md);
  cursor: default;
}

.lightbox-caption {
  color: var(--color-text-invert);
  font-size: var(--font-size-sm);
  margin: 0;
}

.lightbox-close {
  position: absolute;
  top: var(--space-4);
  right: var(--space-5);
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-invert);
  font-size: 20px;
  line-height: 1;
}
</style>
