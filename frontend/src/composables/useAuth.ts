import { ref, computed, onMounted } from 'vue'

const API_BASE = '/api'

export interface CetUser {
  email: string
  name: string
  picture: string
}

const user = ref<CetUser | null>(null)
const loading = ref(true)

function getToken() {
  return localStorage.getItem('pf-session-token')
}

function setToken(token: string) {
  localStorage.setItem('pf-session-token', token)
}

function clearToken() {
  localStorage.removeItem('pf-session-token')
}

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)

  async function checkSession() {
    // Check URL for session_token (from Google OAuth redirect)
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('session_token')
    if (urlToken) {
      setToken(urlToken)
      window.history.replaceState({}, '', window.location.pathname)
    }

    const token = getToken()
    if (!token) {
      loading.value = false
      return
    }

    try {
      const resp = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (resp.ok) {
        const data = await resp.json()
        if (data.success && data.user) {
          user.value = data.user
        } else {
          clearToken()
        }
      } else {
        clearToken()
      }
    } catch {
      clearToken()
    } finally {
      loading.value = false
    }
  }

  function loginWithGoogle() {
    window.location.href = `${API_BASE}/auth/google/login`
  }

  async function logout() {
    const token = getToken()
    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    clearToken()
    user.value = null
  }

  onMounted(() => {
    if (!user.value && loading.value) {
      checkSession()
    }
  })

  return {
    user,
    loading,
    isAuthenticated,
    loginWithGoogle,
    logout,
    checkSession,
  }
}
