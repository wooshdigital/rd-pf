import { ref, reactive } from 'vue'

export interface ThemeMeta {
  name: string
  label: string
  description: string
}

export interface PortfolioContent {
  name: string
  title: string
  headline: string
  bio: string
  aboutParagraph: string
  headshot: string | null
  skills: string[]
  projects: Array<{
    name: string
    description: string
    tech: string[]
    githubUrl: string
  }>
  experience: Array<{ role: string; org: string; start: string; end: string }>
  contact: { email?: string; github?: string; linkedin?: string }
}

export interface DomainAvailability {
  domain: string
  available: boolean
  isPremium: boolean
  premiumRegistrationPrice?: number
}

export interface WhoisContact {
  FirstName: string
  LastName: string
  Address1: string
  City: string
  StateProvince: string
  PostalCode: string
  Country: string
  Phone: string
  EmailAddress: string
}

export type DeployStep =
  | 'idle'
  | 'checking-domain'
  | 'buying'
  | 'waiting-dns'
  | 'deploying'
  | 'done'
  | 'error'

const API_BASE = '/api'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export function usePortfolio() {
  const themes = ref<ThemeMeta[]>([])
  const selectedTheme = ref<string>('minimal')

  const selectedCvUrl = ref<string | null>(null)

  const generating = ref(false)
  const generationError = ref<string | null>(null)
  const content = ref<PortfolioContent | null>(null)

  const previewHtml = ref<string>('')
  const previewLoading = ref(false)

  const deployStep = ref<DeployStep>('idle')
  const deployLog = reactive<string[]>([])
  const deployUrl = ref<string | null>(null)
  const deployError = ref<string | null>(null)

  async function loadThemes() {
    const resp = await fetch(`${API_BASE}/portfolio/themes`)
    const body = await resp.json()
    themes.value = body.themes || []
  }

  async function generate(identityId: string, cvUrl: string, githubUser?: string, email?: string, linkedin?: string) {
    generating.value = true
    generationError.value = null
    content.value = null

    try {
      const resp = await fetch(`${API_BASE}/portfolio/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityId, cvUrl, githubUser, email, linkedin }),
      })
      if (!resp.ok) throw new Error((await resp.json()).message || 'Failed to start generation')
      const { jobId } = await resp.json()

      // Poll
      for (let i = 0; i < 180; i++) {
        await sleep(2000)
        const jr = await fetch(`${API_BASE}/portfolio/generate/job/${jobId}`)
        const job = await jr.json()
        if (job.status === 'done') {
          content.value = job.result
          await refreshPreview()
          return
        }
        if (job.status === 'error') throw new Error(job.error || 'Generation failed')
      }
      throw new Error('Generation timed out')
    } catch (err: any) {
      generationError.value = err.message
    } finally {
      generating.value = false
    }
  }

  async function refreshPreview() {
    if (!content.value) return
    previewLoading.value = true
    try {
      const resp = await fetch(`${API_BASE}/portfolio/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: selectedTheme.value, content: content.value }),
      })
      const body = await resp.json()
      previewHtml.value = body.html || ''
    } finally {
      previewLoading.value = false
    }
  }

  async function checkDomain(name: string): Promise<DomainAvailability | null> {
    const resp = await fetch(`${API_BASE}/portfolio/domains/check?name=${encodeURIComponent(name)}`)
    if (!resp.ok) return null
    const body = await resp.json()
    return body.result
  }

  async function suggestDomains(query: string): Promise<DomainAvailability[]> {
    const resp = await fetch(`${API_BASE}/portfolio/domains/suggest?query=${encodeURIComponent(query)}`)
    if (!resp.ok) return []
    const body = await resp.json()
    return body.results || []
  }

  async function buyAndDeploy(domain: string, years: number, contact: WhoisContact) {
    deployStep.value = 'buying'
    deployLog.length = 0
    deployUrl.value = null
    deployError.value = null
    deployLog.push(`Registering ${domain} for ${years} year(s)...`)

    try {
      const buyResp = await fetch(`${API_BASE}/portfolio/domains/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, years, contact }),
      })
      if (!buyResp.ok) {
        const err = await buyResp.json().catch(() => ({}))
        throw new Error(err.message || 'Domain purchase failed')
      }
      const buyResult = await buyResp.json()
      if (!buyResult.registered) {
        throw new Error('Namecheap did not confirm registration')
      }
      deployLog.push(`Registered. Order #${buyResult.orderId || '?'}`)
      deployLog.push(`DNS configured; waiting for propagation...`)

      deployStep.value = 'waiting-dns'
      await startDeployJob(domain, true)
    } catch (err: any) {
      deployStep.value = 'error'
      deployError.value = err.message
      deployLog.push(`ERROR: ${err.message}`)
    }
  }

  async function deployOnly(domain: string) {
    deployStep.value = 'deploying'
    deployLog.length = 0
    deployUrl.value = null
    deployError.value = null
    try {
      await startDeployJob(domain, false)
    } catch (err: any) {
      deployStep.value = 'error'
      deployError.value = err.message
      deployLog.push(`ERROR: ${err.message}`)
    }
  }

  async function startDeployJob(domain: string, waitForDns: boolean) {
    if (!content.value) throw new Error('No content to deploy')

    const resp = await fetch(`${API_BASE}/portfolio/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain,
        theme: selectedTheme.value,
        content: content.value,
        waitForDns,
      }),
    })
    if (!resp.ok) throw new Error((await resp.json()).message || 'Deploy request failed')
    const { jobId } = await resp.json()

    let lastLogLen = 0
    for (let i = 0; i < 300; i++) {
      await sleep(3000)
      const jr = await fetch(`${API_BASE}/portfolio/deploy/job/${jobId}`)
      const job = await jr.json()

      for (let l = lastLogLen; l < job.log.length; l++) {
        const line = job.log[l]
        deployLog.push(line)
        if (line.includes('certbot') || line.includes('Certbot')) deployStep.value = 'deploying'
      }
      lastLogLen = job.log.length

      if (job.status === 'done') {
        deployStep.value = 'done'
        deployUrl.value = job.url
        return
      }
      if (job.status === 'error') {
        throw new Error(job.error || 'Deploy failed')
      }
    }
    throw new Error('Deploy timed out')
  }

  return {
    themes,
    selectedTheme,
    selectedCvUrl,
    generating,
    generationError,
    content,
    previewHtml,
    previewLoading,
    deployStep,
    deployLog,
    deployUrl,
    deployError,
    loadThemes,
    generate,
    refreshPreview,
    checkDomain,
    suggestDomains,
    buyAndDeploy,
    deployOnly,
  }
}
