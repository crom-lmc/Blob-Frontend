<script setup lang="ts">
/**
 * 统一的「找不到内容 / 空状态」提示：一个友好的浮空小插画 + 文案 + 操作区。
 * - 颜色全部引用主题变量，自动跟随深浅色；
 * - 动画尊重 prefers-reduced-motion（弱动效系统下自动静止）；
 * - 插画为纯 SVG 内联，无外部资源，可离线渲染。
 */
defineProps<{
  /** 角标文案，如 404（不传则不显示） */
  code?: string
  title?: string
  description?: string
  /** 紧凑模式：内嵌于页面区块时使用，减少上下留白 */
  compact?: boolean
}>()
</script>

<template>
  <div class="empty-state" :class="{ compact }" role="status">
    <svg class="illustration" viewBox="0 0 220 168" aria-hidden="true" focusable="false">
      <!-- 地面阴影 -->
      <ellipse class="es-shadow" cx="106" cy="140" rx="44" ry="8" />

      <!-- 纸张主体：轻轻浮动 + 眨眼 -->
      <g class="es-paper">
        <rect class="es-paper-body" x="66" y="28" width="80" height="100" rx="12" />
        <path class="es-paper-fold" d="M132 28 L146 42 L132 42 Z" />
        <rect class="es-line" x="82" y="100" width="48" height="7" rx="3.5" />
        <rect class="es-line" x="82" y="113" width="32" height="7" rx="3.5" />
        <g class="es-face">
          <circle class="es-eye" cx="96" cy="72" r="5.5" />
          <circle class="es-eye" cx="118" cy="72" r="5.5" />
          <path class="es-mouth" d="M100 88 q8 7 16 0" />
        </g>
      </g>

      <!-- 放大镜：缓慢漂移 -->
      <g class="es-glass">
        <circle class="es-lens" cx="160" cy="116" r="17" />
        <line class="es-handle" x1="172" y1="128" x2="184" y2="140" />
      </g>

      <!-- 问号气泡 -->
      <g class="es-bubble">
        <circle class="es-bubble-bg" cx="48" cy="48" r="17" />
        <text class="es-bubble-text" x="48" y="56">?</text>
      </g>
    </svg>

    <p v-if="code" class="es-code">{{ code }}</p>
    <h2 v-if="title" class="es-title">{{ title }}</h2>
    <p v-if="description" class="es-desc text-sm muted">{{ description }}</p>
    <div v-if="$slots.default" class="es-actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: calc(var(--section-gap) * 2) var(--space-5);
  text-align: center;
  animation: es-enter 0.45s ease-out both;
}

.empty-state.compact {
  padding: var(--section-gap) var(--space-4);
}

/* ---------------- 插画 ---------------- */

.illustration {
  width: min(220px, 60vw);
  height: auto;
  margin-bottom: var(--space-3);
  overflow: visible;
}

.es-shadow {
  fill: var(--color-border);
  transform-box: fill-box;
  transform-origin: center;
  animation: es-shadow 3.4s ease-in-out infinite;
}

.es-paper {
  transform-box: fill-box;
  transform-origin: center;
  animation: es-float 3.4s ease-in-out infinite;
}

.es-paper-body {
  fill: var(--color-surface);
  stroke: var(--color-border);
  stroke-width: 3;
}

.es-paper-fold {
  fill: var(--color-bg-subtle);
  stroke: var(--color-border);
  stroke-width: 3;
  stroke-linejoin: round;
}

.es-line {
  fill: var(--color-border);
}

.es-eye {
  fill: var(--color-text-muted);
  transform-box: fill-box;
  transform-origin: center;
  animation: es-blink 5s ease-in-out infinite;
}

.es-mouth {
  fill: none;
  stroke: var(--color-text-muted);
  stroke-width: 3;
  stroke-linecap: round;
}

.es-glass {
  transform-box: view-box;
  transform-origin: 160px 116px;
  animation: es-drift 4.6s ease-in-out infinite;
}

.es-lens {
  fill: var(--color-primary-a12);
  stroke: var(--color-primary);
  stroke-width: 3;
}

.es-handle {
  stroke: var(--color-primary);
  stroke-width: 4;
  stroke-linecap: round;
}

.es-bubble {
  transform-box: view-box;
  transform-origin: 48px 48px;
  animation: es-bob 2.8s ease-in-out infinite;
}

.es-bubble-bg {
  fill: var(--color-primary-subtle);
  stroke: var(--color-primary-a24);
  stroke-width: 2;
}

.es-bubble-text {
  fill: var(--color-primary);
  font-size: 18px;
  font-weight: var(--heading-weight);
  text-anchor: middle;
}

/* ---------------- 文案 / 操作 ---------------- */

.es-code {
  display: inline-flex;
  align-items: center;
  margin: 0;
  padding: 2px var(--space-3);
  border-radius: var(--radius-full);
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--heading-weight);
  letter-spacing: 0.08em;
}

.es-title {
  margin: 0;
  font-size: var(--font-size-h3);
}

.es-desc {
  margin: 0;
  max-width: 34em;
}

.es-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

/* ---------------- 动画 ---------------- */

@keyframes es-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes es-float {
  0%,
  100% {
    transform: translateY(0) rotate(-1.6deg);
  }
  50% {
    transform: translateY(-8px) rotate(1.6deg);
  }
}

@keyframes es-shadow {
  0%,
  100% {
    transform: scaleX(1);
    opacity: 0.7;
  }
  50% {
    transform: scaleX(0.84);
    opacity: 0.45;
  }
}

@keyframes es-blink {
  0%,
  92%,
  100% {
    transform: scaleY(1);
  }
  95%,
  97% {
    transform: scaleY(0.12);
  }
}

@keyframes es-drift {
  0%,
  100% {
    transform: translate(0, 0) rotate(-8deg);
  }
  50% {
    transform: translate(-9px, -6px) rotate(5deg);
  }
}

@keyframes es-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .empty-state,
  .illustration * {
    animation: none !important;
  }
}
</style>
