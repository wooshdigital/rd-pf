<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { X, ChevronRight, ChevronLeft } from 'lucide-vue-next'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  step: [index: number]
}>()

interface TourStep {
  selector: string
  title: string
  description: string
  position: 'bottom' | 'top' | 'left' | 'right'
  clickBefore?: string
}

const steps: TourStep[] = [
  {
    selector: '[data-tour="config"]',
    title: 'Step 1: Configuration',
    description: 'Toggle Web Search if you want the AI to look up real-world info while generating projects. Connect your GitHub account — this is the account where the fake repos will be pushed to.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="web-search"]',
    title: 'Web Search Toggle',
    description: 'When enabled, the AI can search the web for up-to-date frameworks, libraries, and best practices. Leave it off for faster generation.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="github-login"]',
    title: 'GitHub Login',
    description: 'Click "Login with GitHub" to authorize. This gives the tool permission to create repos and push code on the connected account. The committer name will match the GitHub account\'s display name.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="define-projects"]',
    title: 'Step 2: Define Projects',
    description: 'You have two ways to create projects: analyze a resume (paste text or upload PDF/DOCX), or manually define projects with custom fields.',
    position: 'top',
  },
  {
    selector: '[data-tour="define-projects"]',
    title: 'From Resume',
    description: 'Paste a resume or upload a PDF/DOCX. The AI will extract skills, work history, and suggest 3-5 matching project ideas with realistic timelines that fall within employment periods.',
    position: 'bottom',
    clickBefore: '[data-tour="tab-resume"]',
  },
  {
    selector: '[data-tour="define-projects"]',
    title: 'Custom Fields',
    description: 'Switch to "Custom Fields" to manually define a project: pick a name, description, tech stack (click preset tags or type your own), set start/end dates, and choose complexity.',
    position: 'bottom',
    clickBefore: '[data-tour="tab-custom"]',
  },
  {
    selector: '[data-tour="project-cards"]',
    title: 'Step 3: Review & Generate',
    description: 'Here\'s what it looks like after analysis — each project gets a card showing the repo name, tech stack, timeline, and complexity. Click "Generate & Build" on any card to process it individually. Remove ones you don\'t want with the trash icon.',
    position: 'top',
  },
  {
    selector: '[data-tour="progress"]',
    title: 'Step 4: Progress Log',
    description: 'This is the build log — it shows real-time progress as code is generated, commits are backdated across realistic weekday timestamps, and the repo is pushed to GitHub. Each project typically takes 1-5 minutes.',
    position: 'top',
  },
]

const currentStep = ref(0)
const spotlightRect = ref({ top: 0, left: 0, width: 0, height: 0 })
const tooltipStyle = ref<Record<string, string>>({})
const transitioning = ref(false)

const step = computed(() => steps[currentStep.value])
const isFirst = computed(() => currentStep.value === 0)
const isLast = computed(() => currentStep.value === steps.length - 1)

function updateSpotlight(retries = 3) {
  // Click a trigger element first (e.g. switch tabs) before finding the target
  if (retries === 3 && step.value.clickBefore) {
    const trigger = document.querySelector(step.value.clickBefore) as HTMLElement
    if (trigger) trigger.click()
  }

  const el = document.querySelector(step.value.selector)
  if (!el) {
    // Element not rendered yet — retry after a short delay
    if (retries > 0) {
      setTimeout(() => updateSpotlight(retries - 1), 400)
      return
    }
    // Final fallback — center
    spotlightRect.value = {
      top: window.innerHeight / 2 - 50,
      left: window.innerWidth / 2 - 150,
      width: 300,
      height: 100,
    }
    positionTooltip()
    return
  }

  // Scroll element into view first, then measure
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })

  setTimeout(() => {
    const rect = el.getBoundingClientRect()
    const padding = 8

    spotlightRect.value = {
      top: rect.top - padding + window.scrollY,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    }

    positionTooltip()
  }, 300)
}

function positionTooltip() {
  const r = spotlightRect.value
  const gap = 16
  const tooltipHeight = 220
  const tooltipWidth = 360
  const pos = step.value.position

  let top: number
  let left = Math.max(16, Math.min(r.left + r.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16))

  if (pos === 'bottom') {
    top = r.top + r.height + gap
  } else {
    top = r.top - gap - tooltipHeight
  }

  // If tooltip goes above viewport, flip to bottom
  if (top < window.scrollY + 16) {
    top = r.top + r.height + gap
  }
  // If tooltip goes below viewport, flip to top
  if (top + tooltipHeight > window.scrollY + window.innerHeight - 16) {
    top = r.top - gap - tooltipHeight
  }
  // Final clamp — never go above scroll position
  top = Math.max(window.scrollY + 16, top)

  tooltipStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  }
}

function next() {
  if (isLast.value) {
    emit('close')
    return
  }
  transitioning.value = true
  currentStep.value++
  emit('step', currentStep.value)
  nextTick(() => {
    setTimeout(() => {
      updateSpotlight()
      transitioning.value = false
    }, 500)
  })
}

function prev() {
  if (isFirst.value) return
  transitioning.value = true
  currentStep.value--
  emit('step', currentStep.value)
  nextTick(() => {
    setTimeout(() => {
      updateSpotlight()
      transitioning.value = false
    }, 500)
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.show) return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowRight' || e.key === 'Enter') next()
  if (e.key === 'ArrowLeft') prev()
}

watch(() => props.show, (val) => {
  if (val) {
    currentStep.value = 0
    emit('step', 0)
    nextTick(() => updateSpotlight())
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', updateSpotlight)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', updateSpotlight)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="z-[9999]">
      <!-- Full-page click overlay -->
      <div
        class="fixed inset-0"
        style="pointer-events: all;"
        @click="emit('close')"
      />

      <!-- Spotlight cutout — uses box-shadow as overlay -->
      <div
        class="absolute rounded-xl border-2 border-primary/60 transition-all duration-300 ease-out pointer-events-none"
        :style="{
          top: spotlightRect.top + 'px',
          left: spotlightRect.left + 'px',
          width: spotlightRect.width + 'px',
          height: spotlightRect.height + 'px',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.75), 0 0 20px rgba(34,197,94,0.2)',
          zIndex: 9999,
        }"
      />

      <!-- Tooltip card -->
      <div
        class="absolute w-[360px] rounded-xl border border-border bg-card p-5 shadow-2xl transition-all duration-300 ease-out"
        :style="{ ...tooltipStyle, zIndex: 10000 }"
      >
        <!-- Step counter -->
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-medium text-muted-foreground">
            {{ currentStep + 1 }} / {{ steps.length }}
          </span>
          <button @click="emit('close')" class="text-muted-foreground hover:text-foreground">
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Content -->
        <h3 class="text-sm font-semibold text-foreground mb-2">{{ step.title }}</h3>
        <p class="text-sm text-muted-foreground leading-relaxed">{{ step.description }}</p>

        <!-- Progress dots -->
        <div class="flex justify-center gap-1.5 mt-4 mb-3">
          <div
            v-for="(_, i) in steps"
            :key="i"
            :class="[
              'h-1.5 rounded-full transition-all duration-200',
              i === currentStep ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
            ]"
          />
        </div>

        <!-- Navigation -->
        <div class="flex items-center justify-between">
          <Button
            v-if="!isFirst"
            variant="ghost"
            size="sm"
            @click="prev"
          >
            <ChevronLeft class="h-4 w-4 mr-1" />
            Back
          </Button>
          <div v-else />

          <div class="flex gap-2">
            <Button variant="ghost" size="sm" @click="emit('close')">
              Skip
            </Button>
            <Button size="sm" @click="next">
              {{ isLast ? 'Done' : 'Next' }}
              <ChevronRight v-if="!isLast" class="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
