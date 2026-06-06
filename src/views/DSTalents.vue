<script setup lang="ts">
import UploadMenu from '@/components/UploadMenu.vue';
import { useRulesStore } from '@/store/rules-store'
import { storeToRefs } from 'pinia'

const store = useRulesStore()

const { talents, isDataLoaded } = storeToRefs(store)
</script>

<template>
  <main>
    <h1>Talente</h1>
    <section v-if="isDataLoaded" class="talent-list">
        <p class="count">{{ talents.length }} Talente</p>
        <article v-for="talent in talents" :key="talent.name" class="talent">
            <h2>{{ talent.name }}</h2>
            <p v-if="talent.classRequirements.length" class="requirements">
                <span v-for="req in talent.classRequirements" :key="req.dsClass" class="requirement">
                    {{ req.dsClass }} {{ req.classLevel }} ({{ req.maxTalentRank }})
                </span>
            </p>
            <p class="description">{{ talent.description }}</p>
        </article>
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
.talent-list {
    max-width: 60rem;
    width: 100%;
}
.talent {
    margin-bottom: 1.5rem;
}
.talent h2 {
    margin-bottom: 0.25rem;
}
.requirement {
    margin-right: 0.75rem;
    font-weight: 600;
    color: var(--p-primary-color);
}
.description {
    white-space: pre-line;
}
</style>
