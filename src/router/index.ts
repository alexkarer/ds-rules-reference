import { createRouter, createWebHistory } from 'vue-router'
import FileUpload from '@/views/FileUpload.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'file-uplaod',
      component: FileUpload,
    },
  ],
})

export default router
