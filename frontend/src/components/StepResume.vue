<script setup lang="ts">
import { ref } from 'vue'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, X } from 'lucide-vue-next'

const resume = defineModel<string>('resume', { required: true })

defineProps<{
  analyzing: boolean
}>()

const emit = defineEmits<{
  analyze: []
  uploadAnalyze: [file: { data: string; mediaType: string; fileName: string }]
  addCustom: [project: {
    name: string
    description: string
    tech: string[]
    start: string
    end: string
    complexity: string
  }]
}>()

const tab = ref<'resume' | 'custom'>('resume')
const resumeMode = ref<'paste' | 'upload'>('paste')
const uploadedFile = ref<{ data: string; mediaType: string; fileName: string } | null>(null)
const dragging = ref(false)

function handleFileDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) processFile(file)
}

function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) processFile(file)
}

function processFile(file: File) {
  const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!validTypes.includes(file.type)) {
    alert('Only PDF and DOCX files are supported.')
    return
  }
  if (file.size > 50 * 1024 * 1024) {
    alert('File must be under 50MB.')
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const base64 = (reader.result as string).split(',')[1]
    uploadedFile.value = {
      data: base64,
      mediaType: file.type,
      fileName: file.name,
    }
  }
  reader.readAsDataURL(file)
}

function removeFile() {
  uploadedFile.value = null
}

const presets = [
  'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Java', 'C#', 'PHP', 'Ruby', 'Swift',
  'React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte',
  'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Laravel', 'Spring Boot', 'Rails',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite',
  'Docker', 'AWS', 'Tailwind CSS', 'GraphQL', 'REST API',
]

// Custom fields
const customName = ref('')
const customDesc = ref('')
const customTechInput = ref('')
const customTech = ref<string[]>([])
const customStart = ref('')
const customEnd = ref('')
const customComplexity = ref<'small' | 'medium' | 'large'>('medium')

function toggleTech(tech: string) {
  const idx = customTech.value.indexOf(tech)
  if (idx >= 0) {
    customTech.value.splice(idx, 1)
  } else {
    customTech.value.push(tech)
  }
}

function addTech() {
  const t = customTechInput.value.trim()
  if (t && !customTech.value.includes(t)) {
    customTech.value.push(t)
  }
  customTechInput.value = ''
}

function removeTech(index: number) {
  customTech.value.splice(index, 1)
}

function handleTechKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTech()
  }
}

function submitCustom() {
  if (!customName.value.trim() || !customDesc.value.trim() || !customTech.value.length || !customStart.value || !customEnd.value) return

  emit('addCustom', {
    name: customName.value.trim().toLowerCase().replace(/\s+/g, '-'),
    description: customDesc.value.trim(),
    tech: [...customTech.value],
    start: customStart.value,
    end: customEnd.value,
    complexity: customComplexity.value,
  })

  // Reset
  customName.value = ''
  customDesc.value = ''
  customTech.value = []
  customStart.value = ''
  customEnd.value = ''
  customComplexity.value = 'medium'
}

const resumePlaceholder = `Paste the full resume text here...

Example:
John Doe
Full Stack Developer

Experience:
Software Engineer @ TechCorp — Jan 2022 - Dec 2023
- Built React dashboards with TypeScript
- Designed REST APIs with Node.js and PostgreSQL

Junior Developer @ StartupXYZ — Jun 2020 - Dec 2021
- Python Flask microservices
- MongoDB, Redis caching`
</script>

<template>
  <Card data-tour="define-projects">
    <CardHeader>
      <CardTitle class="text-lg">2. Define Projects</CardTitle>
      <CardDescription>Analyze a resume or add projects manually</CardDescription>

      <!-- Tab switcher -->
      <div class="flex gap-1 mt-3 p-1 rounded-lg bg-muted w-fit">
        <button
          data-tour="tab-resume"
          @click="tab = 'resume'"
          :class="[
            'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
            tab === 'resume'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          ]"
        >
          From Resume
        </button>
        <button
          data-tour="tab-custom"
          @click="tab = 'custom'"
          :class="[
            'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
            tab === 'custom'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          ]"
        >
          Custom Fields
        </button>
      </div>
    </CardHeader>

    <CardContent>
      <!-- Resume tab -->
      <div v-if="tab === 'resume'" data-tour="resume-content" class="space-y-3">
        <!-- Paste / Upload toggle -->
        <div class="flex gap-1 p-1 rounded-lg bg-muted w-fit">
          <button
            @click="resumeMode = 'paste'"
            :class="[
              'px-3 py-1 rounded-md text-xs font-medium transition-colors',
              resumeMode === 'paste'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            ]"
          >
            Paste Text
          </button>
          <button
            @click="resumeMode = 'upload'"
            :class="[
              'px-3 py-1 rounded-md text-xs font-medium transition-colors',
              resumeMode === 'upload'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            ]"
          >
            Upload File
          </button>
        </div>

        <!-- Paste mode -->
        <Textarea
          v-if="resumeMode === 'paste'"
          v-model="resume"
          :rows="14"
          :placeholder="resumePlaceholder"
          class="font-mono text-sm"
        />

        <!-- Upload mode -->
        <div v-else>
          <!-- File uploaded -->
          <div v-if="uploadedFile" class="flex items-center justify-between rounded-md border border-input px-4 py-3">
            <div class="flex items-center gap-3">
              <svg class="h-8 w-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <div>
                <p class="text-sm font-medium">{{ uploadedFile.fileName }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ uploadedFile.mediaType === 'application/pdf' ? 'PDF' : 'DOCX' }} document
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" @click="removeFile">
              <X class="h-4 w-4" />
            </Button>
          </div>

          <!-- Drop zone -->
          <div
            v-else
            @dragover.prevent="dragging = true"
            @dragleave="dragging = false"
            @drop.prevent="handleFileDrop"
            :class="[
              'flex flex-col items-center justify-center rounded-md border-2 border-dashed py-12 px-4 transition-colors cursor-pointer',
              dragging
                ? 'border-primary bg-primary/5'
                : 'border-input hover:border-muted-foreground'
            ]"
            @click="($refs.fileInput as HTMLInputElement)?.click()"
          >
            <svg class="h-10 w-10 text-muted-foreground mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p class="text-sm text-muted-foreground">
              Drop a resume here or <span class="text-primary font-medium">browse</span>
            </p>
            <p class="text-xs text-muted-foreground mt-1">PDF or DOCX, up to 50MB</p>
            <input
              ref="fileInput"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              class="hidden"
              @change="handleFileSelect"
            />
          </div>
        </div>
      </div>

      <!-- Custom tab -->
      <div v-else data-tour="custom-content" class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-muted-foreground">Project Name</label>
          <Input v-model="customName" placeholder="my-awesome-tool" />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-muted-foreground">Description</label>
          <Textarea v-model="customDesc" :rows="3" placeholder="A CLI tool that..." />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-muted-foreground">Tech Stack</label>
          <div class="flex flex-wrap gap-1.5 mb-2">
            <button
              v-for="s in presets"
              :key="s"
              @click="toggleTech(s)"
              :class="[
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                customTech.includes(s)
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-input text-muted-foreground hover:text-foreground hover:border-foreground/30'
              ]"
            >
              {{ s }}
            </button>
          </div>
          <div class="flex gap-2">
            <Input
              v-model="customTechInput"
              placeholder="Or type custom and press Enter"
              @keydown="handleTechKeydown"
              class="flex-1"
            />
            <Button variant="outline" size="icon" @click="addTech" type="button">
              <Plus class="h-4 w-4" />
            </Button>
          </div>
          <div v-if="customTech.filter(t => !presets.includes(t)).length" class="flex flex-wrap gap-1.5 mt-2">
            <Badge v-for="(t, i) in customTech.filter(t => !presets.includes(t))" :key="t" variant="secondary" class="gap-1 pr-1">
              {{ t }}
              <button @click="removeTech(customTech.indexOf(t))" class="ml-1 hover:text-destructive">
                <X class="h-3 w-3" />
              </button>
            </Badge>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-muted-foreground">Start Date</label>
            <Input v-model="customStart" type="month" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-muted-foreground">End Date</label>
            <Input v-model="customEnd" type="month" />
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-muted-foreground">Complexity</label>
          <div class="flex gap-2">
            <button
              v-for="level in (['small', 'medium', 'large'] as const)"
              :key="level"
              @click="customComplexity = level"
              :class="[
                'flex-1 py-2 rounded-md border text-sm font-medium transition-colors',
                customComplexity === level
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input text-muted-foreground hover:text-foreground'
              ]"
            >
              {{ level.charAt(0).toUpperCase() + level.slice(1) }}
            </button>
          </div>
          <p class="text-xs text-muted-foreground">
            Small: 5-8 files · Medium: 8-15 files · Large: 15-25 files
          </p>
        </div>
      </div>
    </CardContent>

    <CardFooter>
      <Button
        v-if="tab === 'resume'"
        @click="resumeMode === 'upload' && uploadedFile ? emit('uploadAnalyze', uploadedFile) : emit('analyze')"
        :disabled="analyzing || (resumeMode === 'upload' && !uploadedFile) || (resumeMode === 'paste' && !resume.trim())"
      >
        <Loader2 v-if="analyzing" class="mr-2 h-4 w-4 animate-spin" />
        {{ analyzing ? 'Analyzing...' : 'Analyze Resume' }}
      </Button>
      <Button v-else @click="submitCustom">
        <Plus class="mr-2 h-4 w-4" />
        Add Project
      </Button>
    </CardFooter>
  </Card>
</template>
