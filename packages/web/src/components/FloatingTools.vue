<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const progress = ref(0)
const showTop = ref(false)

function update() {
  const doc = document.documentElement
  const scrollable = doc.scrollHeight - window.innerHeight
  progress.value = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0
  showTop.value = window.scrollY > 400
}

function backTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
})
onUnmounted(() => {
  window.removeEventListener('scroll', update)
  window.removeEventListener('resize', update)
})
</script>

<template>
  <div class="floating-tools">
    <div class="progress" :style="{ transform: `scaleX(${progress})` }" />
    <button v-show="showTop" class="back-top" aria-label="返回顶部" @click="backTop">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M12 19V6M6 12l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  width: 100%;
  transform-origin: left center;
  background: var(--color-primary);
  z-index: 80;
  transition: transform 0.08s linear;
}

.back-top {
  position: fixed;
  right: var(--space-5);
  bottom: var(--space-5);
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  box-shadow: 0 var(--space-1) var(--space-4) -1px var(--color-primary-a24);
  z-index: 40;
  transition: all 0.15s ease;
}

.back-top:hover {
  color: var(--color-on-primary);
  background: var(--color-primary);
  border-color: var(--color-primary);
}

@media (max-width: 640px) {
  .back-top {
    right: var(--space-3);
    bottom: var(--space-3);
  }
}
</style>
