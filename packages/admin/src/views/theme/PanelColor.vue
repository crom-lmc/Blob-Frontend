<script setup lang="ts">
import { ref } from 'vue'
import type { ColorTokens, ThemeConfig } from '@blog/shared'
import { derivePrimaryVariants } from '@blog/shared'

const props = defineProps<{ config: ThemeConfig }>()

/** 颜色字段中文名 */
const fields: { key: keyof ColorTokens; label: string }[] = [
  { key: 'primary', label: '主色' },
  { key: 'primaryHover', label: '主色-悬浮' },
  { key: 'primarySubtle', label: '主色-浅底' },
  { key: 'bg', label: '页面背景' },
  { key: 'bgSubtle', label: '次级背景' },
  { key: 'surface', label: '卡片背景' },
  { key: 'text', label: '正文文字' },
  { key: 'textMuted', label: '次要文字' },
  { key: 'textInvert', label: '反色文字' },
  { key: 'border', label: '边框' },
  { key: 'link', label: '链接' },
  { key: 'success', label: '成功' },
  { key: 'warning', label: '警告' },
  { key: 'danger', label: '危险' }
]

/** 主色变体是否自动派生（避免让用户手填三个色值） */
const autoDerive = ref(true)

/**
 * 用户改色后写回配置。
 * 这里刻意用「事件」驱动派生，而不是 watch(config.color.primary)：
 * 预设 / 切换主题 / 撤销重做 / 导入 都会整体替换 config，
 * 而配置里的变体是预设手工调好的（如极简黑白的 primaryHover=#000000），
 * 用 watcher 会在换主色时被派生值覆盖 —— 表现为「点了预设但选中态立刻消失，得再点一次才高亮」。
 */
function onPick(key: keyof ColorTokens, val: string | null) {
  ;(props.config.color as any)[key] = val ?? ''
  if (key !== 'primary' || !autoDerive.value || !val) return
  const v = derivePrimaryVariants(val)
  props.config.color.primaryHover = v.primaryHover
  props.config.color.primarySubtle = v.primarySubtle
  props.config.color.textInvert = v.onPrimary
  props.config.color.link = val
}
</script>

<template>
  <div class="panel">
    <div class="panel-head">
      <span>主色变体自动派生</span>
      <el-switch v-model="autoDerive" size="small" />
    </div>

    <div class="color-grid">
      <div v-for="f in fields" :key="f.key" class="color-item">
        <span class="color-label">{{ f.label }}</span>
        <el-color-picker
          :model-value="(config.color as any)[f.key]"
          show-alpha
          size="small"
          @update:model-value="(v: string | null) => onPick(f.key, v)"
        />
        <span class="color-value text-muted">{{ (config.color as any)[f.key] }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  font-size: 13px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.color-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.color-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-label {
  width: 88px;
  flex-shrink: 0;
}

.color-value {
  font-size: 11px;
  margin-left: auto;
}
</style>
