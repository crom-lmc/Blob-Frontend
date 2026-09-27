<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { storeToRefs } from 'pinia'
import { useThemeEditorStore } from '@/stores/themeEditor'
import { isNotified } from '@/api/http'
import PanelColor from './theme/PanelColor.vue'
import PanelFont from './theme/PanelFont.vue'
import PanelRadiusSpace from './theme/PanelRadiusSpace.vue'
import PanelLayout from './theme/PanelLayout.vue'
import PanelHomeBlocks from './theme/PanelHomeBlocks.vue'
import PanelDark from './theme/PanelDark.vue'
import PanelCustom from './theme/PanelCustom.vue'

/**
 * 可视化主题编辑器（三栏）：
 * 左：配置面板（预设/颜色/字体/圆角间距/布局/首页区块/深色/自定义代码）
 * 中：iframe 加载真实前台页面，实时预览
 * 右：主题列表 + 操作（撤销重做/草稿/发布/预览令牌/导入导出）
 */
const store = useThemeEditorStore()
const { config, themes, presets, name, dirty, version, canUndo, canRedo, activePresetKey } = storeToRefs(store)

const activeTab = ref('preset')
const iframeEl = ref<HTMLIFrameElement | null>(null)
const previewTarget = ref<'home' | 'post'>('home')
const previewSlug = ref('')
const importInput = ref<HTMLInputElement | null>(null)

/** 预览 iframe 地址：带 token 时前台先拉取后端快照 */
const iframeSrc = ref('')

function rebuildIframeSrc() {
  const origin = (import.meta.env.VITE_WEB_ORIGIN as string) || 'http://localhost:5173'
  const token = store.previewToken
  const params = new URLSearchParams({ preview: '1', target: previewTarget.value })
  if (previewTarget.value === 'post' && previewSlug.value) params.set('slug', previewSlug.value)
  if (token) params.set('token', token)
  iframeSrc.value = `${origin}/preview?${params.toString()}`
}

function refreshPreviewTarget() {
  store.newPreviewToken().finally(rebuildIframeSrc)
}

/** 把最新配置实时下发给 iframe（输入即生效，无需刷新） */
function sendPreview() {
  // 必须发「纯对象快照」：config.value 是 Vue 响应式代理，直接 postMessage 在部分浏览器
  // 会因 structured clone 失败抛 DataCloneError，导致消息静默丢失——表现为「初始预览正常、
  // 但点预设/改任何配置预览都没反应」。转成纯 JSON 快照即可消除该问题。
  const snapshot = JSON.parse(JSON.stringify(config.value))
  iframeEl.value?.contentWindow?.postMessage({ type: 'blog:theme:preview', config: snapshot }, '*')
}

let commitTimer: ReturnType<typeof setTimeout> | undefined

// 配置变化：立即下发预览；撤销重做快照做防抖（避免滑块拖动产生几十步历史）
watch(
  config,
  () => {
    sendPreview()
    clearTimeout(commitTimer)
    commitTimer = setTimeout(() => store.commit(), 800)
  },
  { deep: true }
)

// 主色变化时同步 Element Plus 主色，保持后台与前台一致
watch(
  () => config.value.color.primary,
  (primary) => {
    document.documentElement.style.setProperty('--el-color-primary', primary)
  },
  { immediate: true }
)

async function onSaveDraft() {
  await store.saveDraft()
  ElMessage.success('草稿已保存（未发布，前台不受影响）')
}

async function onPublish() {
  try {
    await ElMessageBox.confirm('发布后立即覆盖线上样式（version +1），确认发布？', '发布确认', { type: 'warning' })
  } catch {
    return
  }
  const vo = await store.publish()
  ElMessage.success(`已发布，版本号：v${vo?.version ?? version.value}`)
  refreshPreviewTarget()
}

async function onReset() {
  try {
    await ElMessageBox.confirm('将配置重置为内置默认主题，当前修改丢弃（可用撤销恢复）？', '重置确认', { type: 'warning' })
  } catch {
    return
  }
  await store.reset()
}

function onExport() {
  store.downloadJson()
}

function onImportClick() {
  importInput.value?.click()
}

async function onImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    await store.importFromFile(file)
    ElMessage.success('导入成功，已创建新主题')
    rebuildIframeSrc()
  } catch (err: any) {
    if (!isNotified(err)) ElMessage.error(err?.message || '导入失败，请检查 JSON 格式')
  } finally {
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function onSelectTheme(id: number) {
  await store.select(id)
  rebuildIframeSrc()
}

async function onCreateTheme() {
  try {
    const { value } = await ElMessageBox.prompt('新主题名称', '新建主题', { inputValue: `主题 ${themes.value.length + 1}` })
    if (!value) return
    await store.create(value)
    ElMessage.success('已创建')
    rebuildIframeSrc()
  } catch {
    /* 取消 */
  }
}

/** 非内置主题才可删除（内置主题由后端 2008 兜底拦截） */
function isBuiltin(t: { isBuiltin?: number | boolean }) {
  return Number(t.isBuiltin) === 1 || t.isBuiltin === true
}

/** 生效中的主题不可删除（后端 2007 兜底拦截） */
function isActiveTheme(t: { isActive: number | boolean }) {
  return Number(t.isActive) === 1 || t.isActive === true
}

async function onDeleteTheme(t: { id: number; name: string; isActive: number | boolean }) {
  if (isBuiltin(t)) {
    ElMessage.warning('默认主题不支持删除')
    return
  }
  if (Number(t.isActive) === 1 || t.isActive === true) {
    ElMessage.warning('生效中的主题不能删除，请先把其他主题发布上线')
    return
  }
  try {
    await ElMessageBox.confirm(`确定删除主题「${t.name}」吗？删除后不可恢复。`, '删除主题', { type: 'warning' })
  } catch {
    return
  }
  try {
    await store.remove(t.id)
    ElMessage.success('已删除')
    rebuildIframeSrc()
  } catch (err: any) {
    if (!isNotified(err)) ElMessage.error(err?.message || '删除失败')
  }
}

/** iframe 就绪后立即下发一次配置 */
function onMessage(e: MessageEvent) {
  const data = e.data
  if (data && data.type === 'blog:theme:ready') sendPreview()
}

onMounted(async () => {
  window.addEventListener('message', onMessage)
  await store.load()
  await nextTick()
  refreshPreviewTarget()
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  clearTimeout(commitTimer)
})
</script>

<template>
  <div class="theme-editor" v-loading="store.loading">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <el-select :model-value="store.themeId" style="width: 180px" @change="onSelectTheme">
        <el-option v-for="t in themes" :key="t.id" :label="`${t.name}${Number(t.isActive) === 1 ? '（生效中）' : ''}`" :value="t.id">
          <div class="theme-option">
            <span class="theme-option-name">
              {{ t.name }}{{ Number(t.isActive) === 1 ? '（生效中）' : '' }}
            </span>
            <el-icon
              v-if="!isBuiltin(t) && !isActiveTheme(t)"
              class="theme-option-del"
              title="删除主题"
              @click.stop="onDeleteTheme(t)"
            >
              <Delete />
            </el-icon>
          </div>
        </el-option>
      </el-select>
      <el-button @click="onCreateTheme">新建</el-button>
      <el-divider direction="vertical" />
      <el-tooltip content="撤销（最多 20 步）">
        <el-button :disabled="!canUndo" @click="store.undo()">
          <el-icon><RefreshLeft /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="重做">
        <el-button :disabled="!canRedo" @click="store.redo()">
          <el-icon><RefreshRight /></el-icon>
        </el-button>
      </el-tooltip>
      <el-button @click="onReset">重置默认</el-button>
      <div class="spacer" />
      <span class="text-muted meta">
        {{ name }} · v{{ version }}{{ dirty ? ' · 有未保存修改' : '' }}
      </span>
      <el-button @click="onImportClick">导入</el-button>
      <input ref="importInput" type="file" accept="application/json" style="display: none" @change="onImportFile" />
      <el-button @click="onExport">导出</el-button>
      <el-button :disabled="!store.themeId" @click="onSaveDraft">保存草稿</el-button>
      <el-button type="primary" :disabled="!store.themeId" @click="onPublish">发布上线</el-button>
    </div>

    <div class="editor-body">
      <!-- 左：配置面板 -->
      <div class="panel-col">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="预设" name="preset">
            <div class="preset-list">
              <div
                v-for="p in presets"
                :key="p.key"
                class="preset-card"
                :class="{ active: p.key === activePresetKey }"
                role="button"
                tabindex="0"
                :aria-pressed="p.key === activePresetKey"
                @click="store.applyPreset(p)"
                @keydown.enter.prevent="store.applyPreset(p)"
                @keydown.space.prevent="store.applyPreset(p)"
              >
                <span class="preset-dot" :style="{ background: p.config?.color?.primary || '#4f46e5' }" />
                <div class="preset-info">
                  <p class="preset-name">{{ p.name }}</p>
                  <p class="preset-desc text-muted">{{ p.description }}</p>
                </div>
                <svg class="preset-check" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path
                    d="M20 6 9 17l-5-5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="颜色" name="color"><PanelColor :config="config" /></el-tab-pane>
          <el-tab-pane label="字体" name="font"><PanelFont :config="config" /></el-tab-pane>
          <el-tab-pane label="间距" name="space"><PanelRadiusSpace :config="config" /></el-tab-pane>
          <el-tab-pane label="布局" name="layout"><PanelLayout :config="config" /></el-tab-pane>
          <el-tab-pane label="首页" name="home"><PanelHomeBlocks :config="config" /></el-tab-pane>
          <el-tab-pane label="深色" name="dark"><PanelDark :config="config" /></el-tab-pane>
          <el-tab-pane label="自定义" name="custom"><PanelCustom :config="config" /></el-tab-pane>
        </el-tabs>
      </div>

      <!-- 中：真实前台预览 -->
      <div class="preview-col">
        <div class="preview-toolbar">
          <el-radio-group v-model="previewTarget" size="small" @change="refreshPreviewTarget">
            <el-radio-button label="home">首页</el-radio-button>
            <el-radio-button label="post">文章页</el-radio-button>
          </el-radio-group>
          <el-input
            v-if="previewTarget === 'post'"
            v-model="previewSlug"
            placeholder="文章 slug，如 frontend-1-从零"
            size="small"
            style="width: 240px"
            @change="refreshPreviewTarget"
          />
          <span class="text-muted">实时预览（真实前台页面）</span>
        </div>
        <div class="iframe-wrap">
          <iframe ref="iframeEl" :src="iframeSrc" class="preview-iframe" title="前台预览" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.theme-editor {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--admin-header-height));
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  flex-wrap: wrap;
}

.toolbar .spacer,
.meta {
  flex: 0 1 auto;
}

.meta {
  margin-left: auto;
  margin-right: 12px;
  font-size: 12px;
}

.editor-body {
  flex: 1;
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  min-height: 0;
}

.panel-col {
  overflow-y: auto;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 8px 12px;
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.preset-card:hover {
  border-color: var(--el-color-primary);
}

.preset-card:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
}

/* 当前配置与该预设完全一致：高亮选中态 */
.preset-card.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.preset-card.active .preset-dot {
  box-shadow: 0 0 0 2px var(--el-bg-color), 0 0 0 3px var(--el-color-primary);
}

.preset-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
}

.preset-info {
  flex: 1;
  min-width: 0;
}

.preset-name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.preset-desc {
  margin: 2px 0 0;
  font-size: 12px;
}

.preset-check {
  flex-shrink: 0;
  color: var(--el-color-primary);
  opacity: 0;
  transform: scale(0.7);
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.preset-card.active .preset-check {
  opacity: 1;
  transform: scale(1);
}

.preview-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 主题下拉项：名称 + 删除按钮（仅非内置主题显示） */
.theme-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.theme-option-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-option-del {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
  transition: color 0.15s ease;
}

.theme-option-del:hover {
  color: var(--el-color-danger);
}

.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.iframe-wrap {
  flex: 1;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  overflow: hidden;
  background: var(--el-bg-color);
  min-height: 0;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

@media (max-width: 1024px) {
  .editor-body {
    grid-template-columns: 1fr;
  }
  .iframe-wrap {
    min-height: 480px;
  }
}
</style>
