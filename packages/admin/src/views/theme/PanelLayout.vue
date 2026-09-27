<script setup lang="ts">
import type { ThemeConfig } from '@blog/shared'

const props = defineProps<{ config: ThemeConfig }>()

/** 单选卡片组：用图标示意不同布局 */
const homeLayouts = [
  { value: 'list', label: '列表', icon: '▤' },
  { value: 'grid', label: '网格', icon: '▦' },
  { value: 'magazine', label: '杂志', icon: '▥' }
]

const sidebars = [
  { value: 'none', label: '无侧栏', icon: '◻' },
  { value: 'left', label: '左侧栏', icon: '◧' },
  { value: 'right', label: '右侧栏', icon: '◨' }
]

const cardStyles = [
  { value: 'flat', label: '扁平' },
  { value: 'bordered', label: '描边' },
  { value: 'elevated', label: '投影' }
]

const headerStyles = [
  { value: 'fixed', label: '吸顶' },
  { value: 'static', label: '静态' },
  { value: 'transparent', label: '透明' }
]

const coverPositions = [
  { value: 'top', label: '顶部' },
  { value: 'left', label: '左侧' },
  { value: 'background', label: '背景' }
]

const metaFields = [
  { value: 'date', label: '日期' },
  { value: 'category', label: '分类' },
  { value: 'tags', label: '标签' },
  { value: 'views', label: '阅读' },
  { value: 'reading', label: '时长' },
  { value: 'comments', label: '评论' }
]

const cardFields = [
  { value: 'cover', label: '封面' },
  { value: 'title', label: '标题' },
  { value: 'excerpt', label: '摘要' },
  { value: 'meta', label: '元信息' },
  { value: 'tags', label: '标签' }
]
</script>

<template>
  <div class="panel">
    <el-form label-position="top" size="small">
      <el-form-item label="首页布局">
        <div class="card-group">
          <button
            v-for="item in homeLayouts"
            :key="item.value"
            class="layout-card"
            :class="{ active: props.config.layout.homeLayout === item.value }"
            type="button"
            @click="props.config.layout.homeLayout = item.value as any"
          >
            <span class="layout-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </el-form-item>

      <el-form-item label="侧边栏">
        <div class="card-group">
          <button
            v-for="item in sidebars"
            :key="item.value"
            class="layout-card"
            :class="{ active: props.config.layout.sidebar === item.value }"
            type="button"
            @click="props.config.layout.sidebar = item.value as any"
          >
            <span class="layout-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </el-form-item>

      <el-form-item label="卡片风格">
        <el-radio-group v-model="props.config.layout.cardStyle" size="small">
          <el-radio-button v-for="c in cardStyles" :key="c.value" :label="c.value">{{ c.label }}</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="头部样式">
        <el-radio-group v-model="props.config.layout.headerStyle" size="small">
          <el-radio-button v-for="h in headerStyles" :key="h.value" :label="h.value">{{ h.label }}</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="封面位置">
        <el-radio-group v-model="props.config.layout.coverPosition" size="small">
          <el-radio-button v-for="c in coverPositions" :key="c.value" :label="c.value">{{ c.label }}</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="显示项">
        <el-checkbox v-model="props.config.layout.showToc">目录 TOC</el-checkbox>
        <el-checkbox v-model="props.config.layout.showBreadcrumb">面包屑</el-checkbox>
        <el-checkbox v-model="props.config.layout.showExcerpt">摘要</el-checkbox>
      </el-form-item>

      <el-form-item label="文章元信息顺序">
        <el-checkbox-group v-model="props.config.layout.articleMetaOrder">
          <el-checkbox v-for="m in metaFields" :key="m.value" :label="m.value">{{ m.label }}</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="卡片字段">
        <el-checkbox-group v-model="props.config.layout.postCardFields">
          <el-checkbox v-for="c in cardFields" :key="c.value" :label="c.value">{{ c.label }}</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.panel {
  font-size: 13px;
}

.card-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.layout-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 76px;
  padding: 8px 4px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  font-size: 12px;
}

.layout-card:hover {
  border-color: var(--el-color-primary);
}

.layout-card.active {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.layout-icon {
  font-size: 20px;
  line-height: 1;
}
</style>
