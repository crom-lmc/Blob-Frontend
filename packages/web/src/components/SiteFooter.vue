<script setup lang="ts">
import { useSiteStore } from '@/stores/site'

const site = useSiteStore()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-main">
        <p class="footer-title">{{ site.title }}</p>
        <p v-if="site.subtitle" class="muted text-sm">{{ site.subtitle }}</p>
        <p v-if="site.footer" class="muted text-xs footer-text">{{ site.footer }}</p>
        <p class="muted text-xs">© {{ year }} · 由动态主题博客系统驱动</p>
      </div>

      <div v-if="site.socialLinks.length" class="footer-col">
        <p class="footer-col-title">关注我</p>
        <div class="footer-links">
          <a v-for="s in site.socialLinks" :key="s.url" :href="s.url" target="_blank" rel="noopener" class="chip chip-outline">
            {{ s.name }}
          </a>
        </div>
      </div>

      <div v-if="site.friendLinks.length" class="footer-col">
        <p class="footer-col-title">友情链接</p>
        <div class="footer-links">
          <a v-for="f in site.friendLinks" :key="f.url" :href="f.url" target="_blank" rel="noopener" class="chip chip-outline">
            {{ f.name }}
          </a>
        </div>
      </div>
    </div>
    <p v-if="site.icp" class="icp muted text-xs">
      <a href="https://beian.miit.gov.cn" target="_blank" rel="noopener">{{ site.icp }}</a>
    </p>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: calc(var(--section-gap) * 2);
  padding: var(--section-gap) 0 var(--space-6);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-subtle);
}

.footer-inner {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--space-6);
}

.footer-title {
  font-weight: var(--heading-weight);
  font-size: var(--font-size-h6);
  margin: 0 0 var(--space-1);
}

.footer-text {
  margin: var(--space-1) 0;
}

.footer-col-title {
  font-size: var(--font-size-sm);
  font-weight: var(--heading-weight);
  margin: 0 0 var(--space-2);
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.icp {
  text-align: center;
  margin: var(--space-5) 0 0;
}

@media (max-width: 640px) {
  .footer-inner {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
}
</style>
