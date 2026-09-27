<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { CommentItem } from '@blog/shared'
import { fetchComments, submitComment } from '@/api/public'
import { useSiteStore } from '@/stores/site'
import { formatDate } from '@/utils/format'

const props = defineProps<{ articleId: number | string }>()
const site = useSiteStore()

const list = ref<CommentItem[]>([])
const loading = ref(false)
const error = ref('')
const submitting = ref(false)
const notice = ref('')

const form = ref({ authorName: '', authorEmail: '', authorSite: '', content: '' })
const replyTo = ref<number>(0)

const total = computed(() => countAll(list.value))

function countAll(items: CommentItem[]): number {
  return items.reduce((sum, c) => sum + 1 + countAll(c.children || []), 0)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    list.value = await fetchComments(props.articleId)
  } catch (e: any) {
    error.value = e?.message || '评论加载失败'
  } finally {
    loading.value = false
  }
}

async function submit(parentId = 0) {
  if (!form.value.authorName.trim() || !form.value.content.trim()) {
    notice.value = '昵称与内容不能为空'
    return
  }
  submitting.value = true
  notice.value = ''
  try {
    await submitComment({
      articleIdOrSlug: props.articleId,
      parentId,
      authorName: form.value.authorName,
      authorEmail: form.value.authorEmail,
      authorSite: form.value.authorSite,
      content: form.value.content
    })
    form.value.content = ''
    replyTo.value = 0
    notice.value = site.commentReviewOn ? '评论已提交，等待审核后展示' : '评论已发布'
    await load()
  } catch (e: any) {
    notice.value = e?.message || '提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

function setReply(id: number, name: string) {
  replyTo.value = id
  form.value.content = `回复 @${name}：`
}

function initials(name: string) {
  return (name || '匿').slice(0, 1).toUpperCase()
}

watch(() => props.articleId, load)
onMounted(load)
</script>

<template>
  <section class="comments" id="comments">
    <h3 class="comments-title">评论（{{ total }}）</h3>

    <div v-if="loading" class="skeleton" style="height: 80px" />
    <p v-else-if="error" class="muted text-sm">{{ error }}</p>

    <ul v-else class="comment-list">
      <li v-for="c in list" :key="c.id" class="comment-item">
        <div class="avatar">{{ initials(c.authorName) }}</div>
        <div class="comment-main">
          <div class="comment-head">
            <span class="author">{{ c.authorName }}</span>
            <span v-if="c.isAdmin" class="chip">作者</span>
            <span class="muted text-xs">{{ formatDate(c.createdAt, true) }}</span>
          </div>
          <p class="comment-content">{{ c.content }}</p>
          <button class="reply-btn text-xs" @click="setReply(c.id, c.authorName)">回复</button>

          <ul v-if="c.children?.length" class="comment-children">
            <li v-for="child in c.children" :key="child.id" class="comment-item">
              <div class="avatar small">{{ initials(child.authorName) }}</div>
              <div class="comment-main">
                <div class="comment-head">
                  <span class="author">{{ child.authorName }}</span>
                  <span v-if="child.isAdmin" class="chip">作者</span>
                  <span class="muted text-xs">{{ formatDate(child.createdAt, true) }}</span>
                </div>
                <p class="comment-content">{{ child.content }}</p>
              </div>
            </li>
          </ul>
        </div>
      </li>
      <li v-if="!list.length" class="muted text-sm">还没有评论，来说两句吧～</li>
    </ul>

    <form class="comment-form" @submit.prevent="submit(replyTo)">
      <div class="form-row">
        <input v-model="form.authorName" class="input" placeholder="昵称 *" aria-label="昵称" />
        <input v-model="form.authorEmail" class="input" placeholder="邮箱（不公开）" aria-label="邮箱" />
        <input v-model="form.authorSite" class="input" placeholder="网站（可选）" aria-label="网站" />
      </div>
      <textarea v-model="form.content" class="textarea" placeholder="友善地写下你的想法…" aria-label="评论内容" />
      <div class="form-foot">
        <span class="muted text-xs">
          {{ site.commentReviewOn ? '评论默认需审核后展示' : '评论即时展示' }}
        </span>
        <div class="form-actions">
          <button v-if="replyTo" type="button" class="btn btn-ghost" @click="replyTo = 0">取消回复</button>
          <button class="btn btn-primary" type="submit" :disabled="submitting">
            {{ submitting ? '提交中…' : '发表评论' }}
          </button>
        </div>
      </div>
      <p v-if="notice" class="notice text-sm">{{ notice }}</p>
    </form>
  </section>
</template>

<style scoped>
.comments {
  margin-top: calc(var(--section-gap) * 1.5);
  padding-top: var(--section-gap);
  border-top: 1px solid var(--color-border);
}

.comments-title {
  font-size: var(--font-size-h5);
  margin: 0 0 var(--space-4);
}

.comment-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.comment-item {
  display: flex;
  gap: var(--space-3);
}

.avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--heading-weight);
}

.avatar.small {
  width: 30px;
  height: 30px;
  font-size: var(--font-size-xs);
}

.comment-main {
  flex: 1;
  min-width: 0;
}

.comment-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.author {
  font-weight: var(--heading-weight);
  font-size: var(--font-size-sm);
}

.comment-content {
  margin: var(--space-1) 0;
  font-size: var(--font-size-sm);
  white-space: pre-wrap;
}

.reply-btn {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  padding: 0;
}

.reply-btn:hover {
  color: var(--color-primary);
}

.comment-children {
  list-style: none;
  margin: var(--space-3) 0 0;
  padding-left: var(--space-4);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--card-padding);
  border-radius: var(--radius-lg);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

.form-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.form-actions {
  display: flex;
  gap: var(--space-2);
}

.notice {
  color: var(--color-primary);
  margin: 0;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
