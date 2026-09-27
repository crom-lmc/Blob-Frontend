<script setup lang="ts">
import { useSeo } from '@/composables/useSeo'
import EmptyState from '@/components/EmptyState.vue'

useSeo({ title: '页面不存在' })
</script>

<template>
  <div class="container">
    <EmptyState
      code="404"
      title="这里什么都没有"
      description="你访问的页面可能已被移动或删除，换个入口继续逛逛吧。"
    >
      <RouterLink to="/" class="btn btn-primary">回到首页</RouterLink>
      <RouterLink to="/archives" class="btn">浏览归档</RouterLink>
    </EmptyState>
  </div>
</template>
