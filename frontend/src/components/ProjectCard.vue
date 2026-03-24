<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, CheckCircle, Loader2, XCircle, Play } from 'lucide-vue-next'
import type { Project, ProjectStatus } from '@/composables/useForge'

defineProps<{
  project: Project
  index: number
  status?: { status: ProjectStatus; message: string }
  anyRunning: boolean
}>()

const emit = defineEmits<{
  remove: [index: number]
  generate: [index: number]
}>()
</script>

<template>
  <Card class="relative">
    <CardContent class="p-4 space-y-3">
      <div class="flex items-start justify-between">
        <div>
          <h4 class="font-semibold text-primary">{{ project.name }}</h4>
          <p class="text-xs text-muted-foreground mt-0.5">
            {{ project.start }} &rarr; {{ project.end }} &middot; {{ project.complexity }} &middot; matches: {{ project.matchesRole }}
          </p>
        </div>
        <div class="flex gap-1">
          <Button
            v-if="!status || status.status === 'idle'"
            variant="ghost"
            size="icon"
            class="h-8 w-8 text-destructive hover:text-destructive"
            @click="emit('remove', index)"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p class="text-sm">{{ project.description }}</p>

      <div class="flex flex-wrap gap-1.5">
        <Badge v-for="tech in project.tech" :key="tech" variant="secondary" class="text-xs">
          {{ tech }}
        </Badge>
      </div>

      <!-- Status indicator -->
      <div v-if="status && status.status !== 'idle'" class="flex items-center gap-2 text-sm pt-1">
        <template v-if="status.status === 'generating' || status.status === 'building'">
          <Loader2 class="h-4 w-4 animate-spin text-yellow-500" />
          <span class="text-yellow-500">{{ status.message }}</span>
        </template>
        <template v-else-if="status.status === 'done'">
          <CheckCircle class="h-4 w-4 text-green-500" />
          <span class="text-green-500">{{ status.message }}</span>
        </template>
        <template v-else-if="status.status === 'error'">
          <XCircle class="h-4 w-4 text-red-500" />
          <span class="text-red-500">{{ status.message }}</span>
        </template>
      </div>

      <!-- Generate button per project -->
      <div v-if="!status || status.status === 'idle' || status.status === 'error'" class="pt-1">
        <Button
          size="sm"
          @click="emit('generate', index)"
          :disabled="anyRunning"
          class="w-full"
        >
          <Play class="mr-2 h-3.5 w-3.5" />
          {{ status?.status === 'error' ? 'Retry' : 'Generate & Build' }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
