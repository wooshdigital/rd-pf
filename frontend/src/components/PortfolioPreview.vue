<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

defineProps<{
  html: string
  loading: boolean
}>()
</script>

<template>
  <div class="space-y-2">
    <label class="text-sm font-medium text-muted-foreground">Preview</label>
    <div class="relative rounded-md border border-input bg-white overflow-hidden" style="height: 600px;">
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur z-10">
        <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
      <iframe
        v-if="html"
        :srcdoc="html"
        class="w-full h-full border-0"
        sandbox="allow-same-origin"
        title="Portfolio preview"
      ></iframe>
      <div v-else class="h-full flex items-center justify-center text-sm text-muted-foreground">
        Generate a portfolio to see the preview.
      </div>
    </div>
  </div>
</template>
