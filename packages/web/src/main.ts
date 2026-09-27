import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/base.css'
import 'katex/dist/katex.min.css'
import { useThemeStore } from './stores/theme'
import { useSiteStore } from './stores/site'
import { setupPreviewBridge } from './theme/preview'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 预览态（后台 iframe）：注册 postMessage 桥接，跳过主动拉取主题
setupPreviewBridge()

const themeStore = useThemeStore()
const siteStore = useSiteStore()

// 主题先行（保证首屏不闪烁），随后加载站点设置
themeStore.init().finally(() => {
  siteStore.load()
})

app.mount('#app')
