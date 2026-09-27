<script setup lang="ts">
import type { ThemeConfig } from '@blog/shared'
import { DENSITY_UNIT } from '@blog/shared'

const props = defineProps<{ config: ThemeConfig }>()

const densities = [
  { value: 'compact', label: '紧凑', unit: DENSITY_UNIT.compact },
  { value: 'comfortable', label: '适中', unit: DENSITY_UNIT.comfortable },
  { value: 'spacious', label: '宽松', unit: DENSITY_UNIT.spacious }
]
</script>

<template>
  <div class="panel">
    <el-form label-position="top" size="small">
      <el-form-item label="圆角">
        <div class="slider-row">
          <span class="slider-label">小</span>
          <el-slider v-model="props.config.radius.sm" :min="0" :max="20" show-input :show-input-controls="false" />
        </div>
        <div class="slider-row">
          <span class="slider-label">中</span>
          <el-slider v-model="props.config.radius.md" :min="0" :max="28" show-input :show-input-controls="false" />
        </div>
        <div class="slider-row">
          <span class="slider-label">大</span>
          <el-slider v-model="props.config.radius.lg" :min="0" :max="40" show-input :show-input-controls="false" />
        </div>
      </el-form-item>

      <el-form-item label="布局密度（覆盖间距单元）">
        <el-radio-group v-model="props.config.layout.density" size="small">
          <el-radio-button v-for="d in densities" :key="d.value" :label="d.value">
            {{ d.label }}·{{ d.unit }}px
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item :label="`间距单元：${DENSITY_UNIT[props.config.layout.density] ?? props.config.space.unit}px`">
        <el-slider v-model="props.config.space.unit" :min="2" :max="8" :step="1" disabled />
      </el-form-item>

      <el-form-item :label="`正文宽度：${props.config.space.contentWidth}px`">
        <el-slider v-model="props.config.space.contentWidth" :min="600" :max="1000" :step="20" show-input :show-input-controls="false" />
      </el-form-item>

      <el-form-item :label="`容器宽度：${props.config.space.containerWidth}px`">
        <el-slider v-model="props.config.space.containerWidth" :min="960" :max="1600" :step="20" show-input :show-input-controls="false" />
      </el-form-item>

      <el-form-item :label="`区块间距：${props.config.space.sectionGap}px`">
        <el-slider v-model="props.config.space.sectionGap" :min="8" :max="80" :step="4" show-input :show-input-controls="false" />
      </el-form-item>

      <el-form-item :label="`卡片内边距：${props.config.space.cardPadding}px`">
        <el-slider v-model="props.config.space.cardPadding" :min="8" :max="48" :step="2" show-input :show-input-controls="false" />
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.panel {
  font-size: 13px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.slider-label {
  width: 20px;
  flex-shrink: 0;
}
</style>
