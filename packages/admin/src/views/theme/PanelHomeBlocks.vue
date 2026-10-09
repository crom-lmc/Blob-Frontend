<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { HomeBlock, ThemeConfig } from '@blog/shared'
import draggable from 'vuedraggable'
import { uploadMedia } from '@/api/content'

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

// ---------------- 首页轮播图（hero 区块专用） ----------------

/** 轮播项：备注 + 图片 + 是否广告位 + 跳转链接 + 图上标题/副标题（数组顺序即前台展示顺序） */
interface CarouselItem {
  note: string
  image: string
  isAd: boolean
  published: boolean
  link: string
  title: string
  subtitle: string
}

/**
 * 取 hero 的轮播项，并把历史数据规范化为 { image, link } 对象。
 * 注意：字符串元素不能直接绑定 .link —— 会命中 String.prototype.link（老 DOM 方法），
 * 输入框会显示成 "function link() { [native code] }"，必须转成对象。
 */
function itemsOf(block: HomeBlock): CarouselItem[] {
  if (!Array.isArray(block.props.images)) {
    block.props.images = []
    return block.props.images as CarouselItem[]
  }
  const raw = block.props.images as Array<Partial<CarouselItem> | string>
  let changed = false
  const list = raw.map((it) => {
    if (typeof it === 'string') {
      changed = true
      return { note: '', image: it, isAd: false, published: true, link: '', title: '', subtitle: '' }
    }
    if (
      !it ||
      typeof it.note !== 'string' ||
      typeof it.image !== 'string' ||
      typeof it.isAd !== 'boolean' ||
      typeof it.published !== 'boolean' ||
      typeof it.link !== 'string' ||
      typeof it.title !== 'string' ||
      typeof it.subtitle !== 'string'
    ) {
      changed = true
      return {
        note: String(it?.note ?? ''),
        image: String(it?.image ?? ''),
        isAd: !!it?.isAd,
        published: typeof it?.published === 'boolean' ? it.published : true,
        link: String(it?.link ?? ''),
        title: String(it?.title ?? ''),
        subtitle: String(it?.subtitle ?? '')
      }
    }
    return it as CarouselItem
  })
  if (changed) block.props.images = list
  return block.props.images as CarouselItem[]
}

function addImage(block: HomeBlock) {
  itemsOf(block).push({ note: '', image: '', isAd: false, published: true, link: '', title: '', subtitle: '' })
}

function removeImage(block: HomeBlock, index: number) {
  itemsOf(block).splice(index, 1)
}

/** 上移：与前一项交换 */
function moveUp(block: HomeBlock, index: number) {
  const list = itemsOf(block)
  if (index <= 0 || index >= list.length) return
  const [item] = list.splice(index, 1)
  list.splice(index - 1, 0, item)
}

/** 下移：与后一项交换 */
function moveDown(block: HomeBlock, index: number) {
  const list = itemsOf(block)
  if (index < 0 || index >= list.length - 1) return
  const [item] = list.splice(index, 1)
  list.splice(index + 1, 0, item)
}

const uploading = ref(false)

/** 从本机选图并上传到媒体库，成功后把返回地址追加进轮播列表 */
function pickImage(block: HomeBlock) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    uploading.value = true
    try {
      const media = await uploadMedia(file, 'theme')
      itemsOf(block).push({ note: '', image: media.url, isAd: false, published: true, link: '', title: '', subtitle: '' })
      ElMessage.success('上传成功')
    } catch (e: any) {
      ElMessage.error(e?.message || '上传失败')
    } finally {
      uploading.value = false
    }
  }
  input.click()
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

              <!-- 轮播图：配置后将替代上面的文字横幅，前台按此处顺序展示 -->
              <div class="carousel-editor">
                <p class="text-muted row-head">轮播图（可选，配置后替代上方文字横幅；非广告位展示默认按钮）</p>
                <div v-for="(item, i) in itemsOf(element)" :key="i" class="carousel-item">
                  <div class="carousel-row">
                    <el-input v-model="item.note" placeholder="备注（仅后台可见）" size="small" />
                    <el-input v-model="item.image" placeholder="图片地址 /uploads/xxx.png" size="small" />
                  </div>
                  <div class="carousel-row">
                    <el-input v-model="item.title" placeholder="标题（显示在图上，可留空）" size="small" />
                    <el-input v-model="item.subtitle" placeholder="副标题（显示在图上，可留空）" size="small" />
                  </div>
                  <div class="carousel-row">
                    <el-checkbox v-model="item.published" size="small">发布</el-checkbox>
                    <el-checkbox v-model="item.isAd" size="small">广告位</el-checkbox>
                    <el-input v-model="item.link" :disabled="!item.isAd" placeholder="跳转链接（勾选广告位后可填）" size="small" />
                  </div>
                  <div class="carousel-row">
                    <el-button link size="small" title="上移" :disabled="i === 0" @click="moveUp(element, i)">↑ 上移</el-button>
                    <el-button link size="small" title="下移" :disabled="i === itemsOf(element).length - 1" @click="moveDown(element, i)">↓ 下移</el-button>
                    <el-button link type="danger" size="small" @click="removeImage(element, i)">删除</el-button>
                  </div>
                </div>
                <div class="carousel-actions">
                  <el-button size="small" @click="addImage(element)">+ 添加一项</el-button>
                  <el-button size="small" type="primary" plain :loading="uploading" @click="pickImage(element)">上传图片</el-button>
                </div>
              </div>
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

.carousel-editor {
  width: 100%;
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px dashed var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row-head {
  margin: 0;
  font-size: 12px;
}

.carousel-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.carousel-item:last-of-type {
  border-bottom: none;
}

.carousel-row {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
}

.carousel-row :deep(.el-input) {
  flex: 1;
  min-width: 0;
}

.carousel-row :deep(.el-button) {
  flex: 0 0 auto;
}

.carousel-actions {
  display: flex;
  gap: 6px;
}
</style>
