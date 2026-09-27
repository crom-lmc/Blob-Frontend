<script setup lang="ts">
import { computed } from 'vue'
import type { ThemeConfig } from '@blog/shared'
import { hasUnsafeCss } from '@blog/shared'

const props = defineProps<{ config: ThemeConfig }>()

/** 危险内容检测：@import 外链 / javascript: 会被后端拦截 */
const unsafe = computed(() => hasUnsafeCss(props.config.customCss) || hasUnsafeCss(props.config.customHeadHtml))
</script>

<template>
  <div class="panel">
    <el-alert
      v-if="unsafe"
      type="error"
      :closable="false"
      title="检测到危险内容"
      description="禁止 @import 外链与 javascript: 伪协议，保存时会被后端拦截。自定义 HTML 仅管理员可编辑。"
      style="margin-bottom: 10px"
    />
    <el-alert
      v-else
      type="warning"
      :closable="false"
      title="自定义代码优先级最高"
      description="自定义 CSS 追加在主题变量之后，会覆盖所有主题配置；请谨慎修改。"
      style="margin-bottom: 10px"
    />

    <el-form label-position="top" size="small">
      <el-form-item label="自定义 CSS">
        <el-input
          v-model="props.config.customCss"
          type="textarea"
          :rows="10"
          placeholder="例如：.post-card { border-left: 3px solid var(--color-primary); }"
          class="code-area"
        />
      </el-form-item>

      <el-form-item label="自定义 head HTML">
        <el-input
          v-model="props.config.customHeadHtml"
          type="textarea"
          :rows="5"
          placeholder="例如统计代码、额外 meta 标签"
          class="code-area"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.panel {
  font-size: 13px;
}

.code-area :deep(textarea) {
  font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 1.6;
}
</style>
