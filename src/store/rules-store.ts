import  {defineStore} from 'pinia'
import type {DSTalent} from '../dungeonslayers/model/talent'
import {computed, ref} from 'vue'
import type {Ref} from 'vue'

export const useRulesStore = defineStore('rules', () => {
    const talents: Ref<DSTalent[]> = ref([])
    const spells = ref([])
    const equipment = ref([])

    const isDataLoaded = computed(() => talents.value.length !== 0)

    function resetStore() {
        talents.value = []
        spells.value = []
        equipment.value = []
    }

    function addTalents (newTalents: DSTalent[]) {
        talents.value.push(...newTalents)
    }

    return {talents, spells, equipment, isDataLoaded, resetStore, addTalents}
})
