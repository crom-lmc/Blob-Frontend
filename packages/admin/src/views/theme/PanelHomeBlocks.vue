<script setup lang="ts">
import type { HomeBlock, ThemeConfig } from '@blog/shared'
import draggable from 'vuedraggable'

const props = defineProps<{ config: ThemeConfig }>()

const blockNames: Record<string, string> = {
  hero: '头部横幅',
  featured: '精选文章',
  latest: '最新文章',
  tagCloud: '标签云',
  newsletter: '订阅区'
}

/** 拖拽排序后同步 order 字段（前台按 order 渲染） */
function onSort() {
  props.config.homeBlocks.forEach((b: HomeBlock, i: number) => (b.order = i + 1))
}
</script>

<template>
  <div class="panel">
    <p class="text-muted tip">拖拽调整顺序，前台首页会同步变化。</p>

    <draggable v-model="props.config.homeBlocks" item-key="type" handle=".drag-handle" @end="onSort">
      <template #item="{ element }">
        <div class="block-item">
          <div class="block-head">
            <span class="drag-handle" title="拖拽排序">⋮⋮</span>
            <span class="block-name">{{ blockNames[element.type] || element.type }}</span>
            <el-switch v-model="element.enabled" size="small" />
          </div>

          <!-- 每个区块的 props 子表单 -->
          <div v-if="element.enabled" class="block-props">
            <template v-if="element.type === 'hero'">
              <el-input v-model="element.props.title" placeholder="标题（留空用站点标题）" size="small" />
              <el-input v-model="element.props.subtitle" placeholder="副标题" size="small" />
              <el-radio-group v-model="element.props.align" size="small">
                <el-radio-button label="left">左对齐</el-radio-button>
                <el-radio-button label="center">居中</el-radio-button>
              </el-radio-group>
            </template>

            <template v-else-if="element.type === 'featured' || element.type === 'latest'">
              <el-input-number v-model="element.props.count" :min="1" :max="30" size="small" />
              <span class="text-muted">显示条数</span>
            </template>

            <template v-else-if="element.type === 'tagCloud'">
              <el-input-number v-model="element.props.count" :min="5" :max="60" size="small" />
              <span class="text-muted">标签数量</span>
            </template>

            <template v-else-if="element.type === 'newsletter'">
              <span class="text-muted">订阅区块无需额外配置</span>
            </template>
          </div>
        </div>
      </template>
    </draggable>
  </div>
</template>

<style scoped>
.panel {
  font-size: 13px;
}

.tip {
  margin: 0 0 8px;
  font-size: 12px;
}

.block-item {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
  background: var(--el-bg-color);
}

.block-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drag-handle {
  cursor: move;
  color: var(--el-text-color-secondary);
}

.block-name {
  flex: 1;
  font-size: 13px;
}

.block-props {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}
</style>
