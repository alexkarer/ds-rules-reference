import DSEquipment from '@/views/DSEquipment.vue'
import DSSpells from '@/views/DSSpells.vue'
import DSTalents from '@/views/DSTalents.vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/talents',
      name: 'talents',
      component: DSTalents,
    },
    {
      path: '/equipment',
      name: 'equipment',
      component: DSEquipment,
    },
    {
      path: '/spells',
      name: 'spells',
      component: DSSpells,
    },
  ],
})

export default router
