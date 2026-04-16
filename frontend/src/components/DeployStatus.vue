<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-vue-next'
import type { DeployStep } from '@/composables/usePortfolio'

defineProps<{
  step: DeployStep
  log: string[]
  url: string | null
  error: string | null
}>()
</script>

<template>
  <div v-if="step !== 'idle'" class="space-y-2">
    <div class="flex items-center gap-2">
      <Loader2 v-if="['checking-domain','buying','waiting-dns','deploying'].includes(step)" class="h-4 w-4 animate-spin text-primary" />
      <CheckCircle2 v-else-if="step === 'done'" class="h-4 w-4 text-green-500" />
      <XCircle v-else-if="step === 'error'" class="h-4 w-4 text-destructive" />
      <span class="text-sm font-medium">
        <template v-if="step === 'buying'">Purchasing domain</template>
        <template v-else-if="step === 'waiting-dns'">Waiting for DNS propagation</template>
        <template v-else-if="step === 'deploying'">Deploying & installing SSL</template>
        <template v-else-if="step === 'done'">Live</template>
        <template v-else-if="step === 'error'">Failed</template>
      </span>
    </div>

    <ScrollArea class="h-48 rounded-md border border-input bg-background p-3 font-mono text-xs">
      <div v-for="(line, i) in log" :key="i" :class="line.startsWith('ERROR') ? 'text-destructive' : 'text-muted-foreground'">
        {{ line }}
      </div>
    </ScrollArea>

    <div v-if="url" class="rounded-md border border-green-500/30 bg-green-500/10 p-3">
      <a :href="url" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-sm font-medium text-green-500 hover:underline">
        <ExternalLink class="h-3.5 w-3.5" />
        {{ url }}
      </a>
    </div>
    <div v-if="error" class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      {{ error }}
    </div>
  </div>
</template>
