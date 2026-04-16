import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'

export interface GithubAccount {
  user: string
  name: string
  token: string
  avatar: string
}

export interface TimelineEntry {
  role: string
  org: string
  start: string
  end: string
  skills: string[]
}

export interface Project {
  name: string
  description: string
  tech: string[]
  start: string
  end: string
  matchesRole: string
  complexity: string
}

export interface AnalysisResult {
  name: string
  skills: string[]
  timeline: TimelineEntry[]
  projects: Project[]
}

export interface KinetixIdentity {
  id: string
  name: string
  headshot: string | null
  maxOljVerificationScore: number | null
  maxLinkedinVerificationScore: number | null
  isActive: boolean
  isRecommended: boolean
}

export interface KinetixIdentityDetail extends KinetixIdentity {
  firstName: string | null
  lastName: string | null
  textCv: {
    collegeCourse: string | null
    graduationYear: number | null
    companies: Array<{ name: string; startDate: string; endDate: string }>
  }
  activeCvs: Array<{ title: string; url: string; validationScore: number | null }>
}

export type ProjectStatus = 'idle' | 'generating' | 'building' | 'done' | 'error'

export interface LogEntry {
  message: string
  type: 'info' | 'success' | 'error'
  jobId?: string
}

const API_BASE = '/api'

export function useForge() {
  const webSearch = ref(false)

  // Multiple GitHub accounts
  const githubAccounts = ref<GithubAccount[]>([])
  const activeGithubIndex = ref(0)

  const activeGithub = computed(() => githubAccounts.value[activeGithubIndex.value] || null)
  const githubUser = computed(() => activeGithub.value?.user || null)
  const githubToken = computed(() => activeGithub.value?.token || null)
  const githubName = computed(() => activeGithub.value?.name || null)
  const githubAvatar = computed(() => activeGithub.value?.avatar || null)

  const resume = ref('')
  const analysis = ref<AnalysisResult | null>(null)
  const analyzing = ref(false)
  const generating = ref(false)
  const projectStatuses = reactive<Record<number, { status: ProjectStatus; message: string }>>({})
  const logs = ref<LogEntry[]>([])
  const currentStep = ref(1)

  // Kinetix identity selection
  const identities = ref<KinetixIdentity[]>([])
  const identitiesLoading = ref(false)
  const identitiesError = ref<string | null>(null)
  const selectedIdentity = ref<KinetixIdentityDetail | null>(null)

  // Restore GitHub accounts from localStorage
  onMounted(() => {
    const saved = localStorage.getItem('pf-github-accounts')
    if (saved) {
      try {
        githubAccounts.value = JSON.parse(saved)
      } catch { /* ignore */ }
    }
    const idx = localStorage.getItem('pf-github-active')
    if (idx) activeGithubIndex.value = parseInt(idx) || 0
  })

  function saveAccounts() {
    localStorage.setItem('pf-github-accounts', JSON.stringify(githubAccounts.value))
    localStorage.setItem('pf-github-active', String(activeGithubIndex.value))
  }

  // Listen for OAuth popup postMessage
  function handleAuthMessage(event: MessageEvent) {
    if (event.data?.type === 'github-auth') {
      const account: GithubAccount = {
        user: event.data.user,
        name: event.data.name,
        token: event.data.token,
        avatar: event.data.avatar,
      }

      // Replace if same username already exists, otherwise add
      const existing = githubAccounts.value.findIndex(a => a.user === account.user)
      if (existing >= 0) {
        githubAccounts.value[existing] = account
        activeGithubIndex.value = existing
      } else {
        githubAccounts.value.push(account)
        activeGithubIndex.value = githubAccounts.value.length - 1
      }
      saveAccounts()
    }
  }

  onMounted(() => window.addEventListener('message', handleAuthMessage))
  onUnmounted(() => window.removeEventListener('message', handleAuthMessage))

  function addGithubAccount() {
    const width = 600
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    window.open(
      `${API_BASE}/auth/github`,
      'github-login',
      `width=${width},height=${height},left=${left},top=${top}`,
    )
  }

  function selectGithubAccount(index: number) {
    activeGithubIndex.value = index
    saveAccounts()
  }

  function removeGithubAccount(index: number) {
    githubAccounts.value.splice(index, 1)
    if (activeGithubIndex.value >= githubAccounts.value.length) {
      activeGithubIndex.value = Math.max(0, githubAccounts.value.length - 1)
    }
    saveAccounts()
  }

  async function loadIdentities(search?: string) {
    identitiesLoading.value = true
    identitiesError.value = null
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : ''
      const resp = await fetch(`${API_BASE}/identities${qs}`)
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.message || `Failed to load identities (${resp.status})`)
      }
      const body = await resp.json()
      identities.value = body.data || []
    } catch (err: any) {
      identitiesError.value = err.message || 'Failed to load identities'
      identities.value = []
    } finally {
      identitiesLoading.value = false
    }
  }

  async function selectIdentity(id: string | null) {
    if (!id) {
      selectedIdentity.value = null
      return
    }
    try {
      const resp = await fetch(`${API_BASE}/identities/${encodeURIComponent(id)}`)
      if (!resp.ok) throw new Error(`Failed to load identity (${resp.status})`)
      const body = await resp.json()
      selectedIdentity.value = body.data

      // Pre-fill resume text from the identity's textCv profile so the existing
      // analyze flow can work without the user pasting anything.
      const detail = body.data as KinetixIdentityDetail
      if (detail?.textCv?.companies?.length) {
        const full = `${detail.firstName || ''} ${detail.lastName || ''}`.trim() || detail.name
        const course = detail.textCv.collegeCourse
          ? `\nEducation: ${detail.textCv.collegeCourse}${detail.textCv.graduationYear ? ` (${detail.textCv.graduationYear})` : ''}`
          : ''
        const companies = detail.textCv.companies
          .map((c) => `- ${c.name} (${c.startDate} → ${c.endDate})`)
          .join('\n')
        resume.value = `${full}${course}\n\nWork history:\n${companies}`
      }
    } catch (err: any) {
      identitiesError.value = err.message || 'Failed to load identity'
    }
  }

  async function analyzeResume() {
    analyzing.value = true
    try {
      const resp = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resume.value, webSearch: webSearch.value }),
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.message || err.error || 'Analysis failed')
      }
      analysis.value = await resp.json()
      currentStep.value = 3
    } finally {
      analyzing.value = false
    }
  }

  async function analyzeResumeFile(file: { data: string; mediaType: string; fileName: string }) {
    analyzing.value = true
    try {
      const resp = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: { data: file.data, mediaType: file.mediaType },
          webSearch: webSearch.value,
        }),
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.message || err.error || 'Analysis failed')
      }
      analysis.value = await resp.json()
      currentStep.value = 3
    } finally {
      analyzing.value = false
    }
  }

  function addCustomProject(project: {
    name: string
    description: string
    tech: string[]
    start: string
    end: string
    complexity: string
  }) {
    if (!analysis.value) {
      analysis.value = { name: '', skills: [], timeline: [], projects: [] }
    }
    analysis.value.projects.push({
      ...project,
      matchesRole: 'Custom',
    })
    currentStep.value = 3
  }

  function removeProject(index: number) {
    if (analysis.value) {
      analysis.value.projects.splice(index, 1)
    }
  }

  async function generateOne(index: number) {
    if (!analysis.value || !githubUser.value || !githubToken.value) return
    generating.value = true
    currentStep.value = 4

    const project = analysis.value.projects[index]
    projectStatuses[index] = { status: 'generating', message: 'Generating code...' }

    try {
      addLog(`Generating code for ${project.name}...`)

      // Start generation job
      const genResp = await fetch(`${API_BASE}/generate-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, webSearch: webSearch.value }),
      })
      if (!genResp.ok) {
        const err = await genResp.json().catch(() => ({ message: 'Generation request failed' }))
        throw new Error(err.message || err.error)
      }

      const { jobId: genJobId } = await genResp.json()

      // Poll generation job
      let generated: any = null
      while (!generated) {
        await sleep(2000)
        const pollResp = await fetch(`${API_BASE}/generate-project/job/${genJobId}`)
        const genJob = await pollResp.json()

        if (genJob.status === 'done') {
          generated = { files: genJob.result }
          const fileCount = Object.keys(generated.files.files).length
          addLog(`Generated ${fileCount} files in ${generated.files.commitOrder.length} phases`, 'success')
        } else if (genJob.status === 'error') {
          throw new Error(genJob.error || 'Code generation failed')
        }
        // still running — keep polling
      }

      // Build repo
      projectStatuses[index] = { status: 'building', message: 'Creating repo & committing...' }
      addLog('Building repo with backdated commits...')

      const buildResp = await fetch(`${API_BASE}/build-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project,
          files: generated.files,
          timeline: { start: project.start, end: project.end },
          githubUser: githubUser.value,
          githubName: githubName.value || githubUser.value,
          githubToken: githubToken.value,
        }),
      })
      if (!buildResp.ok) {
        const err = await buildResp.json()
        throw new Error(err.message || err.error)
      }

      const { jobId } = await buildResp.json()

      // Poll job
      let done = false
      let lastLogCount = 0
      while (!done) {
        await sleep(1500)
        const jobResp = await fetch(`${API_BASE}/build-repo/job/${jobId}`)
        const job = await jobResp.json()

        for (let l = lastLogCount; l < job.log.length; l++) {
          const isErr = job.log[l].startsWith('ERROR')
          addLog(job.log[l], isErr ? 'error' : 'info', jobId)
        }
        lastLogCount = job.log.length

        if (job.status === 'done') {
          done = true
          projectStatuses[index] = {
            status: 'done',
            message: `Pushed to github.com/${githubUser.value}/${project.name}`,
          }
          addLog(`${project.name} complete!`, 'success')
        } else if (job.status === 'error') {
          done = true
          throw new Error('Repo build failed - check log')
        }
      }
    } catch (err: any) {
      addLog(`${project.name} failed: ${err.message}`, 'error')
      projectStatuses[index] = { status: 'error', message: err.message }
    }

    generating.value = false
  }

  async function generateAll() {
    if (!analysis.value || !githubUser.value || !githubToken.value) return

    for (let i = 0; i < analysis.value.projects.length; i++) {
      const status = projectStatuses[i]
      if (status && (status.status === 'done' || status.status === 'generating' || status.status === 'building')) continue
      await generateOne(i)
    }
  }

  function addLog(message: string, type: LogEntry['type'] = 'info', jobId?: string) {
    logs.value.push({ message, type, jobId })
  }

  return {
    webSearch,
    githubAccounts,
    activeGithubIndex,
    activeGithub,
    githubUser,
    githubToken,
    githubName,
    githubAvatar,
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
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
