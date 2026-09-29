<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { resolveAssetUrl } from '@/utils/asset'

/**
 * 轮播项：
 * - image    图片地址（必填）
 * - isAd     是否广告位（广告位才可配跳转链接；非广告位展示默认按钮）
 * - link     点击跳转地址（可空，留空则不可点击）
 * - title    显示在图片上的标题（可空）
 * - subtitle 显示在图片上的副标题（可空）
 */
interface CarouselItem {
  image: string
  isAd?: boolean
  link?: string
  title?: string
  subtitle?: string
}

const props = defineProps<{
  /** 每项为 { image, link, title, subtitle }；兼容旧配置中直接是图片地址字符串的情况 */
  items: (CarouselItem | string)[]
  interval?: number
  /** 图上标题/副标题的对齐方式，跟随主题「对齐方式」配置：left | center */
  align?: 'left' | 'center'
}>()

const current = ref(0)
let timer: number | undefined

const slides = computed(() =>
  (props.items || [])
    .map((item) => {
      const obj = typeof item === 'string' ? undefined : item
      const raw = typeof item === 'string' ? item : item?.image
      return {
        image: resolveAssetUrl(raw),
        isAd: !!obj?.isAd,
        link: obj?.link || '',
        title: obj?.title || '',
        subtitle: obj?.subtitle || ''
      }
    })
    .filter((s) => !!s.image)
)

const count = computed(() => slides.value.length)
const intervalMs = computed(() => props.interval ?? 4000)
/** 文字浮层对齐：跟随主题配置（居中 / 左对齐） */
const alignClass = computed(() => (props.align === 'center' ? 'center' : 'left'))

function go(i: number) {
  if (count.value === 0) return
  current.value = (i + count.value) % count.value
}
function next() {
  go(current.value + 1)
}
function prev() {
  go(current.value - 1)
}
function stop() {
  if (timer !== undefined) {
    window.clearInterval(timer)
    timer = undefined
  }
}
function start() {
  stop()
  if (count.value > 1) timer = window.setInterval(next, intervalMs.value)
}

watch(
  () => props.items,
  () => {
    current.value = 0
    start()
  },
  { deep: true }
)

onMounted(start)
onBeforeUnmount(stop)
</script>

<template>
  <div class="carousel" @mouseenter="stop" @mouseleave="start">
    <div class="track" :style="{ transform: `translateX(-${current * 100}%)` }">
      <!-- 广告位且有链接 → <a> 可点击；其余用 <div>，非广告位展示默认按钮 -->
      <template v-for="(s, i) in slides" :key="i">
        <a v-if="s.isAd && s.link" class="slide" :href="s.link" target="_blank" rel="noopener">
          <img :src="s.image" :alt="s.title || '轮播图'" loading="lazy" />
          <div v-if="s.title || s.subtitle" class="caption" :class="alignClass">
            <strong v-if="s.title" class="caption-title">{{ s.title }}</strong>
            <span v-if="s.subtitle" class="caption-sub">{{ s.subtitle }}</span>
          </div>
        </a>
        <div v-else class="slide">
          <img :src="s.image" :alt="s.title || '轮播图'" loading="lazy" />
          <div v-if="s.title || s.subtitle || !s.isAd" class="caption" :class="alignClass">
            <strong v-if="s.title" class="caption-title">{{ s.title }}</strong>
            <span v-if="s.subtitle" class="caption-sub">{{ s.subtitle }}</span>
            <!-- 非广告位：默认展示与首页 hero 一致的两个按钮 -->
            <div v-if="!s.isAd" class="caption-actions">
              <RouterLink to="/posts" class="btn btn-primary">开始阅读</RouterLink>
              <RouterLink to="/archives" class="btn">浏览归档</RouterLink>
            </div>
          </div>
        </div>
      </template>
    </div>

    <template v-if="count > 1">
      <button class="nav prev" type="button" aria-label="上一张" @click="prev">‹</button>
      <button class="nav next" type="button" aria-label="下一张" @click="next">›</button>
      <div class="dots">
        <button
          v-for="(_, i) in slides"
          :key="i"
          class="dot"
          :class="{ active: i === current }"
          type="button"
          :aria-label="`第 ${i + 1} 张`"
          @click="go(i)"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.carousel {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-bg-subtle);
  height: clamp(160px, 28vw, 400px);
}

.track {
  display: flex;
  height: 100%;
  transition: transform 0.5s ease;
}

.slide {
  position: relative;
  flex: 0 0 100%;
  height: 100%;
  display: block;
  overflow: hidden;
}

.slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 图片上的标题 / 副标题浮层：垂直居中，水平方向跟随「对齐方式」 */
.caption {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-3);
  padding: 24px;
  /* 轻微遮罩，保证文字在任意图片上都可读 */
  background: rgba(0, 0, 0, 0.28);
  color: #fff;
}

.caption.left {
  align-items: flex-start;
  text-align: left;
}

.caption.center {
  align-items: center;
  text-align: center;
}

.caption-title {
  margin: 0;
  font-size: var(--font-size-h1);
  font-weight: var(--heading-weight);
  line-height: 1.2;
}

.caption-sub {
  margin: 0;
  font-size: var(--font-size-h5);
  opacity: 0.85;
}

/* 非广告位默认按钮，与首页 hero 的按钮布局一致 */
.caption-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-2);
  flex-wrap: wrap;
}

.nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease;
}

.carousel:hover .nav {
  opacity: 1;
}

.nav:hover {
  background: rgba(0, 0, 0, 0.55);
}

.prev {
  left: 12px;
}

.next {
  right: 12px;
}

.dots {
  position: absolute;
  right: 16px;
  bottom: 12px;
  display: flex;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border: none;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: width 0.2s ease, background 0.2s ease;
}

.dot.active {
  width: 20px;
  background: #fff;
}
</style>
