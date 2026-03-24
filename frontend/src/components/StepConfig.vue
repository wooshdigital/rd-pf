<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Globe, Plus, Trash2, Check, ChevronDown } from 'lucide-vue-next'
import type { GithubAccount } from '@/composables/useForge'

const webSearch = defineModel<boolean>('webSearch', { required: true })

const props = defineProps<{
  accounts: GithubAccount[]
  activeIndex: number
}>()

const emit = defineEmits<{
  addAccount: []
  selectAccount: [index: number]
  removeAccount: [index: number]
}>()

const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement>()

function handleClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    dropdownOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <Card data-tour="config">
    <CardHeader>
      <CardTitle class="text-lg">1. Configuration</CardTitle>
      <CardDescription>Connect GitHub accounts and configure options</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div data-tour="web-search" class="flex items-center justify-between rounded-md border border-input px-3 py-2.5">
        <div class="flex items-center gap-2">
          <Globe class="h-4 w-4 text-muted-foreground" />
          <div>
            <p class="text-sm font-medium">Web Search</p>
            <p class="text-xs text-muted-foreground">Let AI search the web for up-to-date info</p>
          </div>
        </div>
        <button
          @click="webSearch = !webSearch"
          :class="[
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            webSearch ? 'bg-primary' : 'bg-muted'
          ]"
        >
          <span
            :class="[
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
              webSearch ? 'translate-x-5' : 'translate-x-0'
            ]"
          />
        </button>
      </div>

      <div data-tour="github-login" class="space-y-2">
        <label class="text-sm font-medium text-muted-foreground">GitHub Account</label>

        <!-- No accounts yet -->
        <div v-if="!accounts.length">
          <Button @click="emit('addAccount')" variant="outline" class="w-full gap-2">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Login with GitHub
          </Button>
        </div>

        <!-- Account selector -->
        <div v-else class="space-y-2">
          <div ref="dropdownRef" class="relative">
            <button
              @click="dropdownOpen = !dropdownOpen"
              class="flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 hover:bg-accent/50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <img
                  :src="accounts[activeIndex]?.avatar"
                  :alt="accounts[activeIndex]?.user"
                  class="h-8 w-8 rounded-full"
                />
                <div class="text-left">
                  <p class="text-sm font-medium">{{ accounts[activeIndex]?.name }}</p>
                  <p class="text-xs text-muted-foreground">@{{ accounts[activeIndex]?.user }}</p>
                </div>
              </div>
              <ChevronDown :class="['h-4 w-4 text-muted-foreground transition-transform', dropdownOpen && 'rotate-180']" />
            </button>

            <!-- Dropdown -->
            <div
              v-if="dropdownOpen"
              class="absolute z-50 mt-1 w-full rounded-md border border-input bg-popover shadow-lg"
            >
              <div class="py-1">
                <button
                  v-for="(account, i) in accounts"
                  :key="account.user"
                  @click="emit('selectAccount', i); dropdownOpen = false"
                  class="flex items-center justify-between w-full px-3 py-2 hover:bg-accent transition-colors"
                >
                  <div class="flex items-center gap-3">
                    <img :src="account.avatar" :alt="account.user" class="h-7 w-7 rounded-full" />
                    <div class="text-left">
                      <p class="text-sm font-medium">{{ account.name }}</p>
                      <p class="text-xs text-muted-foreground">@{{ account.user }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-1">
                    <Check v-if="i === activeIndex" class="h-4 w-4 text-primary" />
                    <button
                      @click.stop="emit('removeAccount', i); dropdownOpen = false"
                      class="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </button>

                <!-- Add another account -->
                <button
                  @click="emit('addAccount'); dropdownOpen = false"
                  class="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border-t border-input"
                >
                  <Plus class="h-4 w-4" />
                  Add another account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
