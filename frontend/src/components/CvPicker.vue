<script setup lang="ts">
import { FileText, Check } from 'lucide-vue-next'

interface Cv {
  title: string
  url: string
  validationScore: number | null
}

const props = defineProps<{
  cvs: Cv[]
  selectedUrl: string | null
}>()

const emit = defineEmits<{
  select: [url: string]
}>()

function scoreColor(score: number | null): string {
  if (score == null) return 'text-muted-foreground'
  if (score >= 80) return 'text-green-500'
  if (score >= 60) return 'text-yellow-500'
  return 'text-red-500'
}
</script>

<template>
  <div class="space-y-2">
    <label class="text-sm font-medium text-muted-foreground">Pick a resume</label>

    <div v-if="!cvs.length" class="p-4 text-sm text-muted-foreground text-center rounded-md border border-input bg-background">
      This identity has no active CVs.
    </div>

    <div v-else class="space-y-1">
      <button
        v-for="cv in cvs"
        :key="cv.url"
        @click="emit('select', cv.url)"
        type="button"
        :class="[
          'flex items-center gap-3 w-full px-3 py-2 rounded-md border transition-colors text-left',
          selectedUrl === cv.url
            ? 'border-primary bg-primary/10'
            : 'border-input bg-background hover:bg-accent',
        ]"
      >
        <FileText class="h-4 w-4 text-muted-foreground shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ cv.title }}</p>
          <p class="text-xs" :class="scoreColor(cv.validationScore)">
            Score: {{ cv.validationScore ?? '—' }}
          </p>
        </div>
        <Check v-if="selectedUrl === cv.url" class="h-4 w-4 text-primary" />
      </button>
    </div>
  </div>
</template>
