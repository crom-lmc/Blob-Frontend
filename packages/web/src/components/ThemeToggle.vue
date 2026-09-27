<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import type { ThemeMode } from '@/theme/bootstrap'

const theme = useThemeStore()
const modes: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' }
]

const current = computed(() => theme.mode)

function set(mode: ThemeMode) {
  theme.setMode(mode)
}
</script>

<template>
  <div class="theme-toggle" role="group" aria-label="主题模式切换">
    <button
      v-for="m in modes"
      :key="m.value"
      class="toggle-item"
      :class="{ active: current === m.value }"
      :title="m.label"
      :aria-label="m.label"
      @click="set(m.value)"
    >
      <!-- 浅色 -->
      <svg v-if="m.value === 'light'" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <g stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </g>
      </svg>
      <!-- 深色 -->
      <svg v-else-if="m.value === 'dark'" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path
          d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"
          fill="currentColor"
        />
      </svg>
      <!-- 跟随系统 -->
      <svg v-else viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
        <path d="M9 20h6M12 16v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.toggle-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-muted);
  transition: all 0.15s ease;
}

.toggle-item:hover {
  color: var(--color-primary);
  background: var(--color-primary-subtle);
}

.toggle-item.active {
  background: var(--color-primary);
  color: var(--color-on-primary);
}
</style>
