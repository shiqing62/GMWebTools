import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css' // 引入暗黑主题
import * as ElementPlusIconsVue from '@element-plus/icons-vue' // 引入所有图标
import App from './App.vue'

const app = createApp(App)

// 遍历并全局注册 Element Plus 的所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

// 挂载 Element Plus 和 App 根组件
app.use(ElementPlus)
app.mount('#app')