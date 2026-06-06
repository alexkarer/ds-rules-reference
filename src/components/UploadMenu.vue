<script setup lang="ts">
import Card from 'primevue/card';
import FileUpload from 'primevue/fileupload';
import type {FileUploadSelectEvent} from 'primevue/fileupload';
import ProgressBar from 'primevue/progressbar';
import Message from 'primevue/message';
import { ref } from 'vue';
import { useRulesStore } from '@/store/rules-store';
import { extractLines } from '@/dungeonslayers/parsing/pdf-text';
import { parseTalents } from '@/dungeonslayers/parsing/parse-talents';

const store = useRulesStore();

const isParsing = ref(false);
const progress = ref(0);
const error = ref<string | null>(null);

async function onFileSelect(event: FileUploadSelectEvent) {
  console.log(event)
  const file = event.files?.[0] as File | undefined;
  if (!file) return;

  isParsing.value = true;
  progress.value = 0;
  error.value = null;

  try {
    const buffer = await file.arrayBuffer();
    const lines = await extractLines(buffer, (fraction) => {
      progress.value = Math.round(fraction * 100);
    });
    const talents = parseTalents(lines);
    if (talents.length === 0) {
      throw new Error('No talents could be parsed. Is this the Dungeonslayers rules PDF?');
    }
    store.resetStore();
    store.addTalents(talents);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to parse the PDF.';
  } finally {
    isParsing.value = false;
  }
}
</script>

<template>
  <Card>
    <template #title>File Upload</template>
    <template #content>
      <div class="content">
        <p style="margin-bottom: 1vh;">No DS Rules Data yet uploaded. Data needs to be parsed from a DS Rules PDF Document before it can be visualized.</p>
        <div v-if="isParsing" class="progress">
          <p>Parsing PDF…</p>
          <ProgressBar :value="progress" />
        </div>
        <template v-else>
          <Message v-if="error" severity="error" style="margin-bottom: 1vh;">{{ error }}</Message>
          <FileUpload mode="basic" @select="onFileSelect" customUpload auto severity="secondary" class="p-button-outlined" accept="application/pdf" :maxFileSize="100000000" />
        </template>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.content {
    display: flex;
    align-items: center;
    flex-direction: column;
}
.progress {
    width: 100%;
}
</style>
