<script setup lang="ts">
import Card from 'primevue/card';
import FileUpload from 'primevue/fileupload';
import type {FileUploadSelectEvent} from 'primevue/fileupload';
import ProgressBar from 'primevue/progressbar';
import Message from 'primevue/message';
import { ref } from 'vue';
import { useRulesStore } from '@/store/rules-store';
import { extractLines, extractEquipmentRegions } from '@/dungeonslayers/parsing/pdf-text';
import { parseTalents } from '@/dungeonslayers/parsing/parse-talents';
import { parseEquipment } from '@/dungeonslayers/parsing/parse-equipment';

const store = useRulesStore();

const isParsing = ref(false);
const progress = ref(0);
const statusMessage = ref('extracing text from pdf...');
const error = ref<string | null>(null);

async function onFileSelect(event: FileUploadSelectEvent) {
  const file = event.files?.[0] as File | undefined;
  if (!file) return;

  isParsing.value = true;
  progress.value = 0;
  error.value = null;

  try {
    const buffer = await file.arrayBuffer();
    statusMessage.value = 'extracing text from pdf...'
    // pdfjs transfers (detaches) the buffer it is given, so pass a fresh clone to
    // each pass and keep the original `buffer` intact for the next clone.
    const lines = await extractLines(buffer.slice(0));
    statusMessage.value = 'parsing talents...'
    const talents = parseTalents(lines);
    if (talents.length === 0) {
      throw new Error('No talents could be parsed. Is this the Dungeonslayers rules PDF?');
    }
    statusMessage.value = 'parsing equipment...'
    const equipmentRegions = await extractEquipmentRegions(buffer.slice(0));
    const equipment = parseEquipment(equipmentRegions);
    store.resetStore();
    store.addTalents(talents);
    store.setEquipment(equipment);
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
          <p>{{ statusMessage }}</p>
          <ProgressBar mode="indeterminate" style="height: 6px"></ProgressBar>
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
