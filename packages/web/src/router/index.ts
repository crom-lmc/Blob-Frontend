import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: '首页' } },
  { path: '/posts', name: 'posts', component: () => import('@/views/PostsView.vue'), meta: { title: '文章' } },
  { path: '/posts/:page(\\d+)', name: 'posts-page', component: () => import('@/views/PostsView.vue'), meta: { title: '文章' } },
  { path: '/posts/:slug', name: 'post', component: () => import('@/views/PostView.vue') },
  { path: '/categories', name: 'categories', component: () => import('@/views/CategoriesView.vue'), meta: { title: '分类' } },
  { path: '/categories/:slug', name: 'category', component: () => import('@/views/CategoryView.vue') },
  { path: '/tags', name: 'tags', component: () => import('@/views/TagsView.vue'), meta: { title: '标签' } },
  { path: '/tags/:slug', name: 'tag', component: () => import('@/views/TagView.vue') },
  { path: '/archives', name: 'archives', component: () => import('@/views/ArchivesView.vue'), meta: { title: '归档' } },
  { path: '/search', name: 'search', component: () => import('@/views/SearchView.vue'), meta: { title: '搜索' } },
  { path: '/page/:slug', name: 'page', component: () => import('@/views/PageView.vue') },
  { path: '/preview', name: 'preview', component: () => import('@/views/PreviewView.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue'), meta: { title: '页面不存在' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    if (saved) return saved
    return { top: 0 }
  }
})

export default router
