<script setup lang="ts">
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-vue-next'
import ProjectCard from './ProjectCard.vue'
import type { Project, ProjectStatus } from '@/composables/useForge'

defineProps<{
  projects: Project[]
  generating: boolean
  statuses: Record<number, { status: ProjectStatus; message: string }>
}>()

const emit = defineEmits<{
  remove: [index: number]
  generate: [index: number]
  generateAll: []
}>()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">3. Review Generated Projects</CardTitle>
      <CardDescription>Generate each project individually or all at once.</CardDescription>
    </CardHeader>
    <CardContent data-tour="project-cards" class="space-y-3">
      <ProjectCard
        v-for="(project, i) in projects"
        :key="project.name"
        :project="project"
        :index="i"
        :status="statuses[i]"
        :anyRunning="generating"
        @remove="emit('remove', $event)"
        @generate="emit('generate', $event)"
      />
    </CardContent>
    <CardFooter>
      <Button variant="outline" @click="emit('generateAll')" :disabled="generating || !projects.length">
        <Loader2 v-if="generating" class="mr-2 h-4 w-4 animate-spin" />
        {{ generating ? 'Running...' : 'Generate All Remaining' }}
      </Button>
    </CardFooter>
  </Card>
</template>
