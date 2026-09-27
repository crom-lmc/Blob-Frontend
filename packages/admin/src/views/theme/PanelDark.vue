<script setup lang="ts">
import type { ColorTokens, ThemeConfig } from '@blog/shared'

const props = defineProps<{ config: ThemeConfig }>()

const fields: { key: keyof ColorTokens; label: string }[] = [
  { key: 'primary', label: '主色' },
  { key: 'bg', label: '页面背景' },
  { key: 'bgSubtle', label: '次级背景' },
  { key: 'surface', label: '卡片背景' },
  { key: 'text', label: '正文文字' },
  { key: 'textMuted', label: '次要文字' },
  { key: 'border', label: '边框' }
]

const modes = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' }
]

/** 未配置的深色令牌按主色派生一个基础值 */
function ensureToken(key: keyof ColorTokens) {
  if (!props.config.dark.tokens[key]) {
    ;(props.config.dark.tokens as any)[key] = props.config.color[key]
  }
}

fields.forEach((f) => ensureToken(f.key))
</script>

<template>
  <div class="panel">
    <el-form label-position="top" size="small">
      <el-form-item label="启用深色模式">
        <el-switch v-model="props.config.dark.enabled" />
      </el-form-item>

      <el-form-item label="默认模式">
        <el-radio-group v-model="props.config.dark.defaultMode" size="small">
          <el-radio-button v-for="m in modes" :key="m.value" :label="m.value">{{ m.label }}</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="深色令牌覆盖">
        <div class="color-grid">
          <div v-for="f in fields" :key="f.key" class="color-item">
            <span class="color-label">{{ f.label }}</span>
            <el-color-picker v-model="(props.config.dark.tokens as any)[f.key]" show-alpha size="small" />
          </div>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.panel {
  font-size: 13px;
}

.color-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.color-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-label {
  width: 88px;
}
</style>
