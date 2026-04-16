<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useForge } from '@/composables/useForge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import LoginPage from '@/components/LoginPage.vue'
import StepConfig from '@/components/StepConfig.vue'
import StepResume from '@/components/StepResume.vue'
import StepProjects from '@/components/StepProjects.vue'
import StepProgress from '@/components/StepProgress.vue'
import AppTour from '@/components/AppTour.vue'
import PortfolioBuilder from '@/components/PortfolioBuilder.vue'
import { HelpCircle, LogOut, Hammer, Globe } from 'lucide-vue-next'

const { user, loading: authLoading, isAuthenticated, loginWithGoogle, logout } = useAuth()

const {
  webSearch,
  githubAccounts,
  activeGithubIndex,
  githubUser,
  resume,
  analysis,
  analyzing,
  generating,
  projectStatuses,
  logs,
  currentStep,
  identities,
  identitiesLoading,
  identitiesError,
  selectedIdentity,
  addGithubAccount,
  selectGithubAccount,
  removeGithubAccount,
  analyzeResume,
  analyzeResumeFile,
  addCustomProject,
  removeProject,
  generateOne,
  generateAll,
  loadIdentities,
  selectIdentity,
} = useForge()

const showTour = ref(false)
const hadDataBeforeTour = ref(false)

type View = 'forge' | 'portfolio'
const view = ref<View>((localStorage.getItem('pf-active-view') as View) || 'forge')
watch(view, (v) => localStorage.setItem('pf-active-view', v))

const mockProjects = [
  {
    name: 'inventory-tracker-api',
    description: 'REST API for warehouse inventory management with barcode scanning support and real-time stock updates.',
    tech: ['Node.js', 'Express', 'PostgreSQL', 'Redis'],
    start: '2022-03',
    end: '2022-09',
    matchesRole: 'Backend Engineer @ LogiCorp',
    complexity: 'medium',
  },
  {
    name: 'react-analytics-dashboard',
    description: 'Interactive analytics dashboard with chart visualizations, filters, and CSV export functionality.',
    tech: ['React', 'TypeScript', 'Chart.js', 'Tailwind CSS'],
    start: '2023-01',
    end: '2023-06',
    matchesRole: 'Full Stack Developer @ DataViz Inc',
    complexity: 'large',
  },
  {
    name: 'cli-deploy-tool',
    description: 'Command-line deployment tool for automating Docker builds and pushing to container registries.',
    tech: ['Python', 'Docker', 'Click', 'AWS'],
    start: '2021-06',
    end: '2021-10',
    matchesRole: 'DevOps Engineer @ CloudOps',
    complexity: 'small',
  },
]

const mockLogs = [
  { message: 'Generating code for inventory-tracker-api...', type: 'info' as const },
  { message: 'Generated 12 files in 6 phases', type: 'success' as const },
  { message: 'Building repo with backdated commits...', type: 'info' as const },
  { message: 'Initialized repo: inventory-tracker-api', type: 'info' as const },
  { message: 'GitHub repo created: inventory-tracker-api', type: 'info' as const },
  { message: 'Processing 24 commits...', type: 'info' as const },
  { message: 'Committed 1/24: "Initial commit" (2022-03-07)', type: 'info' as const },
  { message: 'Committed 12/24: "implement barcode scanner module" (2022-06-14)', type: 'info' as const },
  { message: 'Committed 24/24: "fix typo in README.md" (2022-09-02)', type: 'info' as const },
  { message: 'Pushing to GitHub...', type: 'info' as const },
  { message: 'Done! → https://github.com/example/inventory-tracker-api', type: 'success' as const },
  { message: 'inventory-tracker-api complete!', type: 'success' as const },
]

// Auto-show tour on first visit (after auth resolves)
watch(isAuthenticated, (authed) => {
  if (authed && !localStorage.getItem('pf-tour-seen')) {
    showTour.value = true
  }
}, { immediate: true })

function onTourStep(stepIndex: number) {
  // Track if user already had real data
  if (stepIndex === 0) {
    hadDataBeforeTour.value = !!(analysis.value?.projects.length)
  }
  // When tour reaches project cards step, inject mock data if no real data
  if (stepIndex === 6 && !hadDataBeforeTour.value) {
    analysis.value = { name: 'John Doe', skills: [], timeline: [], projects: [...mockProjects] }
    currentStep.value = 3
  }
  // When tour reaches progress step, inject mock logs if no real data
  if (stepIndex === 7 && !hadDataBeforeTour.value) {
    logs.value = [...mockLogs]
    currentStep.value = 4
  }
}

function closeTour() {
  showTour.value = false
  localStorage.setItem('pf-tour-seen', '1')
  // Clean up mock data if user didn't have real data
  if (!hadDataBeforeTour.value && analysis.value?.name === 'John Doe') {
    analysis.value = null
    logs.value = []
    currentStep.value = 1
  }
}

async function handleAnalyze() {
  if (!resume.value.trim()) return alert('Paste a resume first.')
  if (!githubUser.value) return alert('Login with GitHub first.')
  try {
    await analyzeResume()
  } catch (err: any) {
    alert('Analysis failed: ' + err.message)
  }
}

async function handleUploadAnalyze(file: { data: string; mediaType: string; fileName: string }) {
  if (!githubUser.value) return alert('Login with GitHub first.')
  try {
    await analyzeResumeFile(file)
  } catch (err: any) {
    alert('Analysis failed: ' + err.message)
  }
}

function handleGenerateOne(index: number) {
  if (!githubUser.value) return alert('Login with GitHub first.')
  generateOne(index)
}

function handleGenerateAll() {
  if (!githubUser.value) return alert('Login with GitHub first.')
  if (!analysis.value?.projects.length) return alert('No projects to generate.')
  generateAll()
}
</script>

<template>
  <!-- Loading -->
  <div v-if="authLoading" class="min-h-screen flex items-center justify-center bg-background dark">
    <p class="text-muted-foreground">Loading...</p>
  </div>

  <!-- Login page -->
  <LoginPage v-else-if="!isAuthenticated" :loading="authLoading" @login="loginWithGoogle" />

  <!-- Main app -->
  <div v-else class="min-h-screen bg-background dark">
    <div class="mx-auto max-w-3xl px-4 py-8">
      <header class="text-center mb-8 relative">
        <h1 class="text-3xl font-bold text-primary">Portfolio Forge</h1>
        <div class="absolute right-0 top-0 flex items-center gap-1">
          <div v-if="user" class="flex items-center gap-2 mr-2">
            <img v-if="user.picture" :src="user.picture" class="h-7 w-7 rounded-full" />
            <span class="text-xs text-muted-foreground hidden sm:inline">{{ user.name }}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="text-muted-foreground hover:text-foreground"
            @click="showTour = true"
            title="How to use"
          >
            <HelpCircle class="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="text-muted-foreground hover:text-foreground"
            @click="logout"
            title="Sign out"
          >
            <LogOut class="h-4 w-4" />
          </Button>
        </div>
      </header>

      <!-- Tab switcher -->
      <div class="flex justify-center mb-6">
        <div class="inline-flex rounded-md border border-input bg-background p-1">
          <button
            @click="view = 'forge'"
            :class="[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
              view === 'forge' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            <Hammer class="h-3.5 w-3.5" /> Forge
          </button>
          <button
            @click="view = 'portfolio'"
            :class="[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
              view === 'portfolio' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            <Globe class="h-3.5 w-3.5" /> Portfolio Site
          </button>
        </div>
      </div>

      <div v-if="view === 'forge'" class="space-y-6">
        <StepConfig
          v-model:webSearch="webSearch"
          :accounts="githubAccounts"
          :activeIndex="activeGithubIndex"
          :identities="identities"
          :identitiesLoading="identitiesLoading"
          :identitiesError="identitiesError"
          :selectedIdentity="selectedIdentity"
          @addAccount="addGithubAccount"
          @selectAccount="selectGithubAccount"
          @removeAccount="removeGithubAccount"
          @loadIdentities="loadIdentities"
          @selectIdentity="selectIdentity"
        />

        <StepResume
          v-model:resume="resume"
          :analyzing="analyzing"
          @analyze="handleAnalyze"
          @uploadAnalyze="handleUploadAnalyze"
          @addCustom="addCustomProject"
        />

        <Separator v-if="currentStep >= 3" />

        <StepProjects
          v-if="analysis && currentStep >= 3"
          :projects="analysis.projects"
          :generating="generating"
          :statuses="projectStatuses"
          @remove="removeProject"
          @generate="handleGenerateOne"
          @generateAll="handleGenerateAll"
        />

        <Separator v-if="currentStep >= 4" />

        <StepProgress
          v-if="currentStep >= 4"
          :logs="logs"
        />
      </div>

      <PortfolioBuilder v-else-if="view === 'portfolio'" />
    </div>
  </div>

  <AppTour :show="showTour" @close="closeTour" @step="onTourStep" />
</template>
