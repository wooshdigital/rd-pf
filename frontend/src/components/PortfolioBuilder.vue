<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-vue-next'
import { useForge } from '@/composables/useForge'
import { usePortfolio } from '@/composables/usePortfolio'
import IdentityPicker from '@/components/IdentityPicker.vue'
import CvPicker from '@/components/CvPicker.vue'
import ThemePicker from '@/components/ThemePicker.vue'
import PortfolioPreview from '@/components/PortfolioPreview.vue'
import DomainPicker from '@/components/DomainPicker.vue'
import DeployStatus from '@/components/DeployStatus.vue'

// Reuse identity state from the forge composable so the picker is shared
const {
  identities,
  identitiesLoading,
  identitiesError,
  selectedIdentity,
  loadIdentities,
  selectIdentity,
  githubUser,
} = useForge()

const {
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
  suggestDomains,
  buyAndDeploy,
} = usePortfolio()

onMounted(() => {
  loadThemes()
})

watch(selectedTheme, () => {
  if (content.value) refreshPreview()
})

async function handleGenerate() {
  if (!selectedIdentity.value || !selectedCvUrl.value) return
  await generate(
    selectedIdentity.value.id,
    selectedCvUrl.value,
    githubUser.value || undefined,
  )
}

const initialContact = computed(() => {
  const c = selectedIdentity.value?.contact
  if (!c) return {}
  return {
    FirstName: c.firstName || '',
    LastName: c.lastName || '',
    Address1: c.address || '',
    StateProvince: c.province || '',
    Phone: c.phone || '',
  }
})

const buying = computed(() =>
  ['checking-domain', 'buying', 'waiting-dns', 'deploying'].includes(deployStep.value),
)

function handleBuy(domain: string, years: number, contact: any) {
  buyAndDeploy(domain, years, contact)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Step 1: Identity -->
    <Card>
      <CardHeader>
        <CardTitle class="text-xl">1. Select Identity</CardTitle>
        <CardDescription>Pick the person this portfolio is for.</CardDescription>
      </CardHeader>
      <CardContent>
        <IdentityPicker
          :identities="identities"
          :loading="identitiesLoading"
          :error="identitiesError"
          :selected="selectedIdentity"
          @load="(q?: string) => loadIdentities(q)"
          @select="(id: string | null) => selectIdentity(id)"
        />
      </CardContent>
    </Card>

    <!-- Step 2: CV + Theme -->
    <Card v-if="selectedIdentity">
      <CardHeader>
        <CardTitle class="text-xl">2. Pick Resume &amp; Theme</CardTitle>
        <CardDescription>The resume drives content; the theme drives look.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <CvPicker
          :cvs="selectedIdentity.activeCvs || []"
          :selectedUrl="selectedCvUrl"
          @select="(url: string) => (selectedCvUrl = url)"
        />
        <ThemePicker
          :themes="themes"
          :selected="selectedTheme"
          @select="(name: string) => (selectedTheme = name)"
        />
        <Button
          @click="handleGenerate"
          :disabled="!selectedCvUrl || generating"
          class="w-full"
        >
          <Loader2 v-if="generating" class="h-4 w-4 mr-2 animate-spin" />
          <Sparkles v-else class="h-4 w-4 mr-2" />
          {{ generating ? 'Generating...' : 'Generate Portfolio' }}
        </Button>
        <div v-if="generationError" class="text-sm text-destructive">{{ generationError }}</div>
      </CardContent>
    </Card>

    <!-- Step 3: Preview -->
    <Card v-if="content || previewHtml">
      <CardHeader>
        <CardTitle class="text-xl">3. Preview</CardTitle>
        <CardDescription>Switch themes to see different looks.</CardDescription>
      </CardHeader>
      <CardContent>
        <PortfolioPreview :html="previewHtml" :loading="previewLoading" />
      </CardContent>
    </Card>

    <!-- Step 4: Deploy -->
    <Card v-if="content">
      <CardHeader>
        <CardTitle class="text-xl">4. Buy Domain &amp; Deploy</CardTitle>
        <CardDescription>Purchase a domain via Namecheap and host on this server.</CardDescription>
      </CardHeader>
      <CardContent>
        <DomainPicker
          :suggestFn="suggestDomains"
          :initialContact="initialContact"
          :buying="buying"
          @buy="handleBuy"
        />
      </CardContent>
    </Card>

    <!-- Deploy status -->
    <DeployStatus
      :step="deployStep"
      :log="deployLog"
      :url="deployUrl"
      :error="deployError"
    />
  </div>
</template>
