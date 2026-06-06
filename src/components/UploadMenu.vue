<script setup lang="ts">
import Card from 'primevue/card';
import FileUpload from 'primevue/fileupload';
import type {FileUploadSelectEvent} from 'primevue/fileupload';

function onFileSelect(event: FileUploadSelectEvent) {
  console.log('upload', event);
}
</script>

<template>
  <Card>
    <template #title>File Upload</template>
    <template #content>
      <div class="content">
        <p style="margin-bottom: 1vh;">No DS Rules Data yet uploaded. Data needs to be parsed from a DS Rules PDF Document before it can be visualized.</p>
        <FileUpload mode="basic" @select="onFileSelect" customUpload auto severity="secondary" class="p-button-outlined" accept="application/pdf" :maxFileSize="100000000" />
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
</style>