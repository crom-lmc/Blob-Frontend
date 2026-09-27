<script setup lang="ts">
import type { ThemeConfig } from '@blog/shared'
import { FONT_STACKS, SCALE_RATIOS } from '@blog/shared'

const props = defineProps<{ config: ThemeConfig }>()

const weights = [400, 500, 600, 700, 800]
</script>

<template>
  <div class="panel">
    <el-form label-position="top" size="small">
      <el-form-item label="正文字体">
        <el-select v-model="props.config.font.familyBody" style="width: 100%">
          <el-option v-for="f in FONT_STACKS" :key="f.value" :label="f.label" :value="f.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="标题字体">
        <el-select v-model="props.config.font.familyHeading" style="width: 100%">
          <el-option label="继承正文" value="inherit" />
          <el-option v-for="f in FONT_STACKS" :key="f.value" :label="f.label" :value="f.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="代码字体">
        <el-select v-model="props.config.font.familyCode" style="width: 100%">
          <el-option v-for="f in FONT_STACKS" :key="f.value" :label="f.label" :value="f.value" />
        </el-select>
      </el-form-item>

      <el-form-item :label="`基准字号：${props.config.font.sizeBase}px`">
        <el-slider v-model="props.config.font.sizeBase" :min="12" :max="22" :step="1" show-input :show-input-controls="false" />
      </el-form-item>

      <el-form-item label="标题缩放比">
        <el-select v-model="props.config.font.scaleRatio" style="width: 100%">
          <el-option v-for="r in SCALE_RATIOS" :key="r" :label="String(r)" :value="r" />
        </el-select>
      </el-form-item>

      <el-form-item :label="`行高：${props.config.font.lineHeight}`">
        <el-slider v-model="props.config.font.lineHeight" :min="1.3" :max="2.2" :step="0.05" show-input :show-input-controls="false" />
      </el-form-item>

      <el-form-item :label="`字间距：${props.config.font.letterSpacing}px`">
        <el-slider v-model="props.config.font.letterSpacing" :min="-0.5" :max="3" :step="0.1" show-input :show-input-controls="false" />
      </el-form-item>

      <el-form-item label="标题字重">
        <el-select v-model="props.config.font.headingWeight" style="width: 100%">
          <el-option v-for="w in weights" :key="w" :label="String(w)" :value="w" />
        </el-select>
      </el-form-item>
    </el-form>

    <div class="preview-text">
      <p class="preview-title">标题预览 The quick brown fox</p>
      <p class="preview-body">正文预览：这是一段用于观察字号、行高与字间距变化的示例文本。</p>
    </div>
  </div>
</template>

<style scoped>
.panel {
  font-size: 13px;
}

.preview-text {
  margin-top: 8px;
  padding: 10px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.preview-title {
  margin: 0 0 6px;
  font-weight: var(--heading-weight, 700);
  font-size: calc(16px * 1.25);
}

.preview-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
}
</style>
