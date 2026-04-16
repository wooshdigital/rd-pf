<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { Users, Check, RefreshCw, X } from 'lucide-vue-next'
import type { KinetixIdentity, KinetixIdentityDetail } from '@/composables/useForge'

const props = defineProps<{
  identities: KinetixIdentity[]
  loading: boolean
  error: string | null
  selected: KinetixIdentityDetail | null
}>()

const emit = defineEmits<{
  load: [search?: string]
  select: [id: string | null]
}>()

const open = ref(false)
const search = ref('')

onMounted(() => {
  if (!props.identities.length) emit('load')
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => emit('load', q || undefined), 250)
})

const sorted = computed(() => props.identities)

function gradeLabel(i: KinetixIdentity): string {
  const olj = i.maxOljVerificationScore ?? 0
  const li = i.maxLinkedinVerificationScore ?? 0
  const score = Math.max(olj, li)
  if (score >= 90) return 'S+'
  if (score >= 80) return 'S'
  if (score >= 70) return 'A+'
  if (score >= 60) return 'A'
  if (score >= 50) return 'B+'
  if (score >= 40) return 'B'
  return 'C'
}

function gradeColor(label: string): string {
  if (label.startsWith('S')) return 'bg-amber-400 text-amber-900'
  if (label.startsWith('A')) return 'bg-green-500 text-white'
  if (label.startsWith('B')) return 'bg-blue-500 text-white'
  return 'bg-purple-500 text-white'
}

function choose(id: string) {
  emit('select', id)
  open.value = false
}

function clear() {
  emit('select', null)
}
</script>

<template>
  <div data-tour="identity" class="space-y-2">
    <label class="text-sm font-medium text-muted-foreground">Kinetix Identity (optional)</label>

    <!-- Nothing selected yet -->
    <div v-if="!selected">
      <button
        @click="open = !open"
        type="button"
        class="flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 hover:bg-accent/50 transition-colors"
      >
        <div class="flex items-center gap-2">
          <Users class="h-4 w-4 text-muted-foreground" />
          <span class="text-sm text-muted-foreground">
            Pick an identity to pre-fill the resume
          </span>
        </div>
      </button>
    </div>

    <!-- Selected -->
    <div v-else class="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
      <div class="flex items-center gap-3">
        <img
          v-if="selected.headshot"
          :src="selected.headshot"
          :alt="selected.name"
          class="h-9 w-9 rounded-full object-cover"
        />
        <div class="text-left">
          <p class="text-sm font-medium">{{ selected.name }}</p>
          <p class="text-xs text-muted-foreground">
            {{ selected.textCv?.companies?.length || 0 }} company entries · {{ selected.activeCvs?.length || 0 }} CV{{ (selected.activeCvs?.length || 0) === 1 ? '' : 's' }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button
          @click="open = true"
          type="button"
          class="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent"
        >
          Change
        </button>
        <button
          @click="clear"
          type="button"
          class="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          title="Clear selection"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- Picker modal -->
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="open = false"
    >
      <div class="bg-background border border-input rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between p-4 border-b border-input">
          <h3 class="font-medium">Select Identity</h3>
          <button @click="open = false" class="text-muted-foreground hover:text-foreground">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="p-3 border-b border-input">
          <input
            v-model="search"
            type="text"
            placeholder="Search by name…"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div class="flex-1 overflow-y-auto p-2">
          <div v-if="loading" class="flex items-center justify-center py-8 text-muted-foreground text-sm">
            <RefreshCw class="h-4 w-4 mr-2 animate-spin" />
            Loading…
          </div>
          <div v-else-if="error" class="p-4 text-sm text-destructive">
            {{ error }}
          </div>
          <div v-else-if="!sorted.length" class="p-4 text-sm text-muted-foreground text-center">
            No identities found.
          </div>
          <button
            v-else
            v-for="i in sorted"
            :key="i.id"
            @click="choose(i.id)"
            type="button"
            class="flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-accent transition-colors text-left"
          >
            <img
              v-if="i.headshot"
              :src="i.headshot"
              :alt="i.name"
              class="h-10 w-10 rounded-full object-cover shrink-0"
            />
            <div v-else class="h-10 w-10 rounded-full bg-muted shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span
                  :class="['inline-flex items-center justify-center min-w-5 h-5 px-1 rounded text-xs font-bold', gradeColor(gradeLabel(i))]"
                >
                  {{ gradeLabel(i) }}
                </span>
                <p class="text-sm font-medium truncate">{{ i.name }}</p>
              </div>
              <p class="text-xs text-muted-foreground">
                OLJ {{ i.maxOljVerificationScore ?? '—' }} · LinkedIn {{ i.maxLinkedinVerificationScore ?? '—' }}
              </p>
            </div>
            <Check
              v-if="selected && (selected as KinetixIdentity).id === i.id"
              class="h-4 w-4 text-primary"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
