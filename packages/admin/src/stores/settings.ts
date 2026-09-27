import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchSettings } from '@/api/system'

/**
 * 后台站点设置：仅取分页所需的「默认每页条数」。
 * 后台各列表在无显式 size 时以此作为初始每页条数；用户也可在列表上临时切换。
 */
export const useSettingsStore = defineStore('admin-settings', () => {
  const defaultPageSize = ref(10)
  let loaded = false

  async function load() {
    if (loaded) return
    try {
      const data = (await fetchSettings()) as Record<string, any>
      const ps = Number(data?.page_size)
      if (ps > 0) defaultPageSize.value = ps
    } catch {
      /* 接口失败时保持默认 10 */
    }
    loaded = true
  }

  return { defaultPageSize, load }
})
