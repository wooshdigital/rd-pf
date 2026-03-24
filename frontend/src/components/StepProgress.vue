<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { LogEntry } from '@/composables/useForge'

const props = defineProps<{
  logs: LogEntry[]
}>()

const scrollRef = ref<HTMLElement | null>(null)

watch(
  () => props.logs.length,
  async () => {
    await nextTick()
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  },
)
</script>

<template>
  <Card data-tour="progress">
    <CardHeader>
      <CardTitle class="text-lg">4. Building Repos</CardTitle>
    </CardHeader>
    <CardContent>
      <ScrollArea ref="scrollRef" class="h-[400px] rounded-md border bg-background p-4 font-mono text-sm">
        <div
          v-for="(entry, i) in logs"
          :key="i"
          :class="{
            'text-muted-foreground': entry.type === 'info',
            'text-green-500': entry.type === 'success',
            'text-red-500': entry.type === 'error',
          }"
          class="leading-relaxed"
        >
          {{ entry.message }}
        </div>
        <div v-if="!logs.length" class="text-muted-foreground">Waiting for logs...</div>
      </ScrollArea>
    </CardContent>
  </Card>
</template>
