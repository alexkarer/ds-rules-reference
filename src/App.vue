<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem';
import { ref } from 'vue';
import type { Ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router'
import Menubar from 'primevue/menubar';


const menuItems: Ref<MenuItem[]> = ref([
  {
    label: 'Talente',
    route: '/talents',
    icon: 'pi pi-user'
  },
  {
    label: 'Ausrüstung',
    route: '/equipment',
    icon: 'pi pi-shopping-bag'
  },
  {
    label: 'Zaubersprüche',
    route: '/spells',
    icon: 'pi pi-sparkles'
  }
])
</script>

<template>
  <header>
    <Menubar :model="menuItems">
      <template #item="{ item, props }">
        <router-link v-slot="{ href, navigate }" :to="item.route" custom>
            <a v-ripple :href="href" v-bind="props.action" @click="navigate">
                <span :class="item.icon" />
                <span>{{ item.label }}</span>
            </a>
        </router-link>
      </template>
    </Menubar>
  </header>
  <RouterView />
</template>

<style scoped>

header {
  margin-left: 1vh;
  margin-right: 1vh;
  margin-bottom: 1vh;
}
</style>
