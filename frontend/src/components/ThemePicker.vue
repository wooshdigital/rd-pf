<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import type { ThemeMeta } from '@/composables/usePortfolio'

const props = defineProps<{
  themes: ThemeMeta[]
  selected: string
}>()

const emit = defineEmits<{
  select: [name: string]
}>()

function themeSwatch(name: string) {
  if (name === 'minimal') return 'bg-stone-100 border-stone-300'
  if (name === 'terminal') return 'bg-zinc-900 border-green-500'
  if (name === 'card-grid') return 'bg-gradient-to-br from-indigo-500 to-pink-500 border-transparent'
  return 'bg-muted border-border'
}
</script>

<template>
  <div class="space-y-2">
    <label class="text-sm font-medium text-muted-foreground">Theme</label>
    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="t in themes"
        :key="t.name"
        @click="emit('select', t.name)"
        type="button"
        :class="[
          'rounded-md border p-3 text-left transition-colors relative',
          selected === t.name
            ? 'border-primary bg-primary/5'
            : 'border-input bg-background hover:bg-accent',
        ]"
      >
        <div :class="['h-16 rounded border mb-2', themeSwatch(t.name)]"></div>
        <p class="text-sm font-medium">{{ t.label }}</p>
        <p class="text-xs text-muted-foreground mt-1 line-clamp-2">{{ t.description }}</p>
        <Check v-if="selected === t.name" class="absolute top-2 right-2 h-4 w-4 text-primary" />
      </button>
    </div>
  </div>
</template>
