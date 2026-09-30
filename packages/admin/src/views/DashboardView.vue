<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import * as echarts from 'echarts'
import type { DashboardStats } from '@blog/shared'
import { fetchStats } from '@/api/system'

const stats = ref<DashboardStats | null>(null)
const loading = ref(true)
const chartEl = ref<HTMLDivElement | null>(null)
const chart = shallowRef<echarts.ECharts | null>(null)

const cards = computed(() => [
  { label: '文章总数', value: stats.value?.articleCount ?? 0, icon: 'Document', color: 'var(--el-color-primary)' },
  { label: '全站阅读', value: stats.value?.viewCount ?? 0, icon: 'View', color: 'var(--el-color-success)' },
  { label: '评论总数', value: stats.value?.commentCount ?? 0, icon: 'ChatDotRound', color: 'var(--el-color-warning)' },
  { label: '待审评论', value: stats.value?.pendingCommentCount ?? 0, icon: 'Bell', color: 'var(--el-color-danger)' }
])

/** 与后端 DashboardStatsVO 对齐：articleTrend / commentTrend（{date, count}） */
function renderChart() {
  if (!chartEl.value || !stats.value) return
  chart.value = chart.value || echarts.init(chartEl.value)
  chart.value.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['文章发布', '评论数'] },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: stats.value.articleTrend.map((t) => t.date.slice(5)), boundaryGap: false },
    yAxis: { type: 'value' },
    series: [
      {
        name: '文章发布',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.15 },
        data: stats.value.articleTrend.map((t) => t.count)
      },
      {
        name: '评论数',
        type: 'line',
        smooth: true,
        data: stats.value.commentTrend.map((t) => t.count)
      }
    ]
  })
}

function resize() {
  chart.value?.resize()
}

/** 前台访问地址：后台 dev 在 5174、前台在 5173，两者不同源，必须拼绝对地址 */
const webOrigin = (import.meta.env.VITE_WEB_ORIGIN as string) || 'http://localhost:5173'

/** 在前台新窗口打开文章；用绝对地址，否则会打开后台自己的 /posts/:slug（后台无此路由，被 catch-all 重定向回仪表盘） */
function openPost(slug: string) {
  if (!slug) return
  window.open(`${webOrigin}/posts/${slug}`, '_blank', 'noopener')
}

onMounted(async () => {
  try {
    stats.value = await fetchStats()
    await Promise.resolve()
    renderChart()
  } finally {
    loading.value = false
  }
  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  chart.value?.dispose()
})
</script>

<template>
  <div class="admin-page dashboard-page">
    <el-row :gutter="12">
      <el-col v-for="c in cards" :key="c.label" :xs="12" :sm="12" :md="6">
        <el-card class="stat-card" shadow="never" style="margin-bottom: 12px">
          <div class="card-inner">
            <el-icon :size="22" :style="{ color: c.color }"><component :is="c.icon" /></el-icon>
            <div>
              <p class="card-value">{{ c.value }}</p>
              <p class="card-label text-muted">{{ c.label }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" v-loading="loading" class="trend-card">
      <template #header>
        <span>近 30 天趋势（文章发布 / 评论）1</span>
      </template>
      <div ref="chartEl" class="chart" />
    </el-card>

    <el-row :gutter="12" class="bottom-row">
      <el-col :xs="24" :md="14">
        <el-card shadow="never">
          <template #header>热门文章 TOP10</template>
          <el-table :data="stats?.topArticles || []" size="small">
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="viewCount" label="阅读" width="90" align="right" />
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ row }">
                <el-button link type="primary" @click="openPost(row.slug)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="10">
        <el-card shadow="never">
          <template #header>
            <div class="card-head">
              <span>待审评论</span>
              <el-button link type="primary" @click="$router.push('/comments')">去审核</el-button>
            </div>
          </template>
          <el-empty v-if="!stats?.pendingComments?.length" description="暂无待审评论" :image-size="60" />
          <ul v-else class="pending-list">
            <li v-for="c in stats.pendingComments" :key="c.id">
              <p class="pending-meta">
                <strong>{{ c.authorName }}</strong>
                <span v-if="c.articleTitle" class="text-muted"> · {{ c.articleTitle }}</span>
                <span class="text-muted"> · {{ c.createdAt }}</span>
              </p>
              <p class="pending-content">{{ c.content }}</p>
            </li>
          </ul>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
/* 页面至少填满主区域：正常高度无滚动条；窗口过矮内容放不下时自然出现页面滚动 */
.dashboard-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.trend-card {
  flex: none;
}

.bottom-row {
  flex: 1;
  min-height: 0;
  margin-top: 12px;
}

.bottom-row :deep(.el-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bottom-row :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

@media (max-width: 991px) {
  /* 窄屏纵向堆叠 */
  .bottom-row {
    flex: none;
  }
  .bottom-row :deep(.el-card) {
    height: auto;
  }
}

.card-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-value {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.card-label {
  margin: 2px 0 0;
  font-size: 12px;
}

.chart {
  height: 240px;
  width: 100%;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pending-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.pending-list li {
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.pending-meta {
  margin: 0;
  font-size: 12px;
}

.pending-content {
  margin: 4px 0 0;
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
