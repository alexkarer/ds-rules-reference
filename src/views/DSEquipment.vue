<script setup lang="ts">
import UploadMenu from '@/components/UploadMenu.vue';
import { useRulesStore } from '@/store/rules-store'
import { storeToRefs } from 'pinia'

const store = useRulesStore()

const { isDataLoaded } = storeToRefs(store)
</script>

<template>
  <main>
    <h1>Ausrüstung</h1>
    <section v-if="isDataLoaded">
        <p>Data is loaded!</p>
    </section>
    <section v-else>
        <UploadMenu></UploadMenu>
    </section>
  </main>
</template>

<style scoped>
main {
    display: flex;
    align-items: center;
    flex-direction: column;
}
</style>