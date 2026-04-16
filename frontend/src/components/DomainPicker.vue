<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Search, Loader2, ShoppingCart, X } from 'lucide-vue-next'
import type { DomainAvailability, WhoisContact } from '@/composables/usePortfolio'

const props = defineProps<{
  suggestFn: (query: string) => Promise<DomainAvailability[]>
  initialContact: Partial<WhoisContact>
  buying: boolean
}>()

const emit = defineEmits<{
  buy: [domain: string, years: number, contact: WhoisContact]
}>()

const query = ref('')
const results = ref<DomainAvailability[]>([])
const loading = ref(false)

let timer: ReturnType<typeof setTimeout> | null = null
watch(query, (q) => {
  if (timer) clearTimeout(timer)
  if (!q.trim()) {
    results.value = []
    return
  }
  loading.value = true
  timer = setTimeout(async () => {
    try {
      results.value = await props.suggestFn(q.trim())
    } finally {
      loading.value = false
    }
  }, 500)
})

// Purchase modal state
const selectedDomain = ref<string | null>(null)
const years = ref(1)
const contact = ref<WhoisContact>({
  FirstName: '',
  LastName: '',
  Address1: '',
  City: '',
  StateProvince: '',
  PostalCode: '',
  Country: 'PH',
  Phone: '',
  EmailAddress: '',
})
const confirmText = ref('')

function openPurchase(domain: string) {
  selectedDomain.value = domain
  contact.value = {
    FirstName: props.initialContact.FirstName || '',
    LastName: props.initialContact.LastName || '',
    Address1: props.initialContact.Address1 || '',
    City: props.initialContact.City || '',
    StateProvince: props.initialContact.StateProvince || '',
    PostalCode: props.initialContact.PostalCode || '',
    Country: props.initialContact.Country || 'PH',
    Phone: props.initialContact.Phone || '',
    EmailAddress: props.initialContact.EmailAddress || '',
  }
  confirmText.value = ''
}

function closePurchase() {
  selectedDomain.value = null
}

const canSubmit = computed(() => {
  if (!selectedDomain.value) return false
  if (confirmText.value.trim() !== selectedDomain.value) return false
  const c = contact.value
  return !!(c.FirstName && c.LastName && c.Address1 && c.City && c.StateProvince && c.PostalCode && c.Country && c.Phone && c.EmailAddress)
})

function submitBuy() {
  if (!selectedDomain.value || !canSubmit.value) return
  emit('buy', selectedDomain.value, years.value, contact.value)
  selectedDomain.value = null
}
</script>

<template>
  <div class="space-y-3">
    <label class="text-sm font-medium text-muted-foreground">Domain</label>

    <div class="flex gap-2">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          v-model="query"
          placeholder="yourname"
          class="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>

    <div v-if="loading" class="text-sm text-muted-foreground flex items-center gap-2">
      <Loader2 class="h-4 w-4 animate-spin" /> Checking availability...
    </div>

    <div v-if="!loading && results.length" class="space-y-1">
      <div
        v-for="r in results"
        :key="r.domain"
        class="flex items-center justify-between px-3 py-2 rounded-md border border-input bg-background"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">{{ r.domain }}</span>
          <span v-if="r.isPremium" class="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">Premium</span>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="r.premiumRegistrationPrice" class="text-xs text-muted-foreground">
            ${{ r.premiumRegistrationPrice.toFixed(2) }}/yr
          </span>
          <Button
            v-if="r.available"
            size="sm"
            @click="openPurchase(r.domain)"
            :disabled="props.buying"
            class="h-7 text-xs"
          >
            <ShoppingCart class="h-3 w-3 mr-1" /> Buy
          </Button>
          <span v-else class="text-xs text-muted-foreground">Taken</span>
        </div>
      </div>
    </div>

    <!-- Purchase confirmation modal -->
    <div
      v-if="selectedDomain"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="closePurchase"
    >
      <div class="bg-background border border-input rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between p-4 border-b border-input">
          <h3 class="font-medium">Confirm purchase: {{ selectedDomain }}</h3>
          <button @click="closePurchase" class="text-muted-foreground hover:text-foreground">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="p-4 overflow-y-auto space-y-3">
          <div>
            <label class="text-xs text-muted-foreground">Years</label>
            <input
              v-model.number="years"
              type="number" min="1" max="10"
              class="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm mt-1 block"
            />
          </div>

          <div class="border-t border-input pt-3">
            <p class="text-xs text-muted-foreground mb-2">
              WHOIS contact (pre-filled from identity where available). All fields required by Namecheap.
            </p>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs text-muted-foreground">First name</label>
                <input v-model="contact.FirstName" class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm mt-1" />
              </div>
              <div>
                <label class="text-xs text-muted-foreground">Last name</label>
                <input v-model="contact.LastName" class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm mt-1" />
              </div>
              <div class="col-span-2">
                <label class="text-xs text-muted-foreground">Address</label>
                <input v-model="contact.Address1" class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm mt-1" />
              </div>
              <div>
                <label class="text-xs text-muted-foreground">City</label>
                <input v-model="contact.City" class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm mt-1" />
              </div>
              <div>
                <label class="text-xs text-muted-foreground">State / Province</label>
                <input v-model="contact.StateProvince" class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm mt-1" />
              </div>
              <div>
                <label class="text-xs text-muted-foreground">Postal code</label>
                <input v-model="contact.PostalCode" class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm mt-1" />
              </div>
              <div>
                <label class="text-xs text-muted-foreground">Country (2-letter)</label>
                <input v-model="contact.Country" maxlength="2" class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm mt-1 uppercase" />
              </div>
              <div>
                <label class="text-xs text-muted-foreground">Phone (+CC.NNN)</label>
                <input v-model="contact.Phone" placeholder="+63.9171234567" class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm mt-1" />
              </div>
              <div>
                <label class="text-xs text-muted-foreground">Email</label>
                <input v-model="contact.EmailAddress" type="email" class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm mt-1" />
              </div>
            </div>
          </div>

          <div class="border-t border-input pt-3">
            <label class="text-xs text-muted-foreground">
              Type <span class="font-mono font-semibold">{{ selectedDomain }}</span> to confirm
            </label>
            <input
              v-model="confirmText"
              class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm mt-1 font-mono"
              :placeholder="selectedDomain"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 p-4 border-t border-input bg-muted/30">
          <Button variant="outline" @click="closePurchase">Cancel</Button>
          <Button :disabled="!canSubmit" @click="submitBuy">
            Buy {{ selectedDomain }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
