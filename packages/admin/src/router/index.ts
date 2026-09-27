import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/layout/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: '仪表盘' } },
      { path: 'articles', name: 'articles', component: () => import('@/views/ArticlesView.vue'), meta: { title: '文章管理' } },
      { path: 'articles/edit/:id?', name: 'article-edit', component: () => import('@/views/ArticleEditView.vue'), meta: { title: '文章编辑' } },
      { path: 'categories', name: 'categories', component: () => import('@/views/CategoriesView.vue'), meta: { title: '分类管理' } },
      { path: 'tags', name: 'tags', component: () => import('@/views/TagsView.vue'), meta: { title: '标签管理' } },
      { path: 'comments', name: 'comments', component: () => import('@/views/CommentsView.vue'), meta: { title: '评论管理' } },
      { path: 'media', name: 'media', component: () => import('@/views/MediaView.vue'), meta: { title: '媒体库' } },
      { path: 'theme', name: 'theme', component: () => import('@/views/ThemeEditorView.vue'), meta: { title: '主题编辑器' } },
      { path: 'settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { title: '站点设置', admin: true } },
      { path: 'users', name: 'users', component: () => import('@/views/UsersView.vue'), meta: { title: '用户管理', admin: true } },
      { path: 'logs', name: 'logs', component: () => import('@/views/LogsView.vue'), meta: { title: '操作日志', admin: true } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) return true
  if (!auth.isLogin) return { name: 'login', query: { redirect: to.fullPath } }
  if (!auth.user) await auth.loadProfile()
  // RBAC：admin 专属页面
  if (to.meta.admin && !auth.isAdmin) return { name: 'dashboard' }
  return true
})

export default router
