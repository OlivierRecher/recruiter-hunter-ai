<template>
  <div class="min-h-screen bg-gray-50">
    <!-- API Keys Sidebar -->
    <div class="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-10 overflow-y-auto">
      <div class="p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-6">🔑 Configuration</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              OpenAI API Key
            </label>
            <input
              v-model="openaiApiKey"
              type="password"
              placeholder="sk-..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              @input="saveOpenAiKey"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Serper.dev API Key
            </label>
            <input
              v-model="serperApiKey"
              type="password"
              placeholder="Your Serper key"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              @input="saveSerperKey"
            />
          </div>
        </div>
        
        <div class="mt-6 p-3 bg-blue-50 rounded-md">
          <p class="text-xs text-blue-800">
            Required to scan the web and analyze profiles.
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="ml-64">
      <div class="max-w-7xl mx-auto px-8 py-12">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-4xl font-bold text-gray-900 mb-3">
            🎯 Recruiter Hunter AI: Find Your Future Boss
          </h1>
          <p class="text-gray-600 text-lg">
            This application uses AI to identify key contacts in a target company 
            and draft your outreach messages.
          </p>
        </div>

        <!-- Search Form -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <!-- Left Column -->
          <div class="space-y-6">
            <div>
              <h2 class="text-2xl font-semibold text-gray-800 mb-4">1. Define Your Target</h2>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Target Position
                  </label>
                  <input
                    v-model="targetRole"
                    type="text"
                    placeholder="Digital Project Manager"
                    class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Target Company
                  </label>
                  <input
                    v-model="targetCompany"
                    type="text"
                    placeholder="Google"
                    class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Job Description (optional)
                  </label>
                  <textarea
                    v-model="jobDescription"
                    rows="4"
                    placeholder="Copy/Paste the job description..."
                    class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 class="text-2xl font-semibold text-gray-800 mb-4">2. Your Profile (for AI Message)</h2>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Your Strengths / CV Summary
                </label>
                <textarea
                  v-model="userContext"
                  rows="3"
                  placeholder="5 years of experience, Software Engineer, Agile expert, bilingual English."
                  class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              @click="handleSearch"
              :disabled="isLoading || isFindingEmails || !canSearch"
              class="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <span v-if="isLoading || isFindingEmails" class="animate-spin">⏳</span>
              <span v-else>🔍</span>
              {{ isFindingEmails ? emailSearchProgress : isLoading ? 'Searching...' : 'Launch Search' }}
            </button>

            <div v-if="error" class="p-4 rounded-md" :class="error.includes('⏱️') ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'">
              <p class="text-sm font-medium" :class="error.includes('⏱️') ? 'text-yellow-800' : 'text-red-800'">
                {{ error }}
              </p>
              <p v-if="error.includes('⏱️')" class="text-xs text-yellow-700 mt-2">
                💡 Tip: Rate limits are based on your OpenAI plan. You can wait a few moments or upgrade your plan.
              </p>
            </div>
          </div>

          <!-- Right Column - Results -->
          <div v-if="contacts.length > 0" class="space-y-6">
            <div>
              <h2 class="text-2xl font-semibold text-gray-800 mb-4">3. Identified Contacts</h2>
              
              <div class="space-y-4 max-h-[600px] overflow-y-auto">
                <div
                  v-for="contact in filteredContacts"
                  :key="contact.id"
                  class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                      <h3 class="text-xl font-semibold text-gray-900 mb-1">
                        {{ contact.name }}
                      </h3>
                      <p class="text-gray-600 font-medium mb-2">{{ contact.role }}</p>
                      <p class="text-gray-500 text-sm italic mb-3">{{ contact.reason }}</p>
                      <div class="space-y-1">
                        <a
                          :href="contact.link"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-blue-600 hover:text-blue-800 text-sm font-medium block"
                        >
                          View LinkedIn Profile →
                        </a>
                        <p class="text-sm text-gray-600">
                            <span class="font-medium">Email:</span>
                            <a
                            v-if="contact.email && contact.email.trim() !== ''"
                            :href="`mailto:${contact.email}`"
                            class="text-blue-600 hover:underline"
                            >
                            {{ contact.email }}
                            </a>
                            <span v-else class="text-gray-400 italic">
                            email not provided
                            </span>
                        </p>
                      </div>
                    </div>
                    
                    <div class="flex flex-col items-end gap-2 ml-4">
                      <div class="text-right">
                        <div class="text-2xl font-bold text-blue-600">{{ contact.score }}</div>
                        <div class="text-xs text-gray-500">/100</div>
                      </div>
                      <span
                        :class="getBadgeClass(contact.type)"
                        class="px-3 py-1 rounded-full text-xs font-semibold"
                      >
                        {{ contact.type }}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    @click="generateMessage(contact)"
                    :disabled="isGenerating"
                    class="w-full mt-4 bg-gray-100 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
                  >
                    ✉️ Draft Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Message Generation -->
        <div v-if="selectedContact && draftMessage" class="mt-8">
          <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 class="text-2xl font-semibold text-gray-800 mb-4">
              4. Draft for {{ selectedContact.name }}
            </h2>
            
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Suggested Message (Copyable)
              </label>
              <textarea
                :value="draftMessage"
                rows="10"
                readonly
                class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 font-mono text-sm"
              />
            </div>
            
            <button
              @click="copyToClipboard"
              class="bg-green-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-green-700 transition-colors"
            >
              📋 Copy to Clipboard
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApiKeys } from '~/composables/useApiKeys'
import { useSerper } from '~/composables/useSerper'
import { useOpenAI, OpenAIError } from '~/composables/useOpenAI'
import { useEmailFinder } from '~/composables/useEmailFinder'

interface AnalyzedContact {
  id: number
  name: string
  role: string
  score: number
  type: 'Hiring Manager' | 'Recruiter' | 'Peer' | 'Irrelevant'
  reason: string
  link: string
  email?: string
}

const { getOpenAiKey, getSerperKey, setOpenAiKey, setSerperKey } = useApiKeys()
const { searchProfiles } = useSerper()
const { analyzeProfiles, draftMessage: generateDraftMessage } = useOpenAI()
const { findEmail } = useEmailFinder()

const openaiApiKey = ref('')
const serperApiKey = ref('')
const targetRole = ref('')
const targetCompany = ref('')
const jobDescription = ref('')
const userContext = ref('')
const contacts = ref<AnalyzedContact[]>([])
const selectedContact = ref<AnalyzedContact | null>(null)
const draftMessage = ref('')
const isLoading = ref(false)
const isGenerating = ref(false)
const isFindingEmails = ref(false)
const emailSearchProgress = ref('')
const error = ref('')

const canSearch = computed(() => {
  return openaiApiKey.value && serperApiKey.value && targetRole.value && targetCompany.value
})

const filteredContacts = computed(() => {
  return contacts.value
    .filter(c => c.score > 40)
    .sort((a, b) => b.score - a.score)
})

const getBadgeClass = (type: string) => {
  const classes: Record<string, string> = {
    'Hiring Manager': 'bg-purple-100 text-purple-800',
    'Recruiter': 'bg-blue-100 text-blue-800',
    'Peer': 'bg-green-100 text-green-800',
    'Irrelevant': 'bg-gray-100 text-gray-800'
  }
  return classes[type] || classes.Irrelevant
}

const saveOpenAiKey = () => {
  setOpenAiKey(openaiApiKey.value)
}

const saveSerperKey = () => {
  setSerperKey(serperApiKey.value)
}

const handleSearch = async () => {
  if (!canSearch.value) {
    error.value = 'Please enter your API keys in the sidebar to begin.'
    return
  }

  error.value = ''
  isLoading.value = true
  contacts.value = []
  selectedContact.value = null
  draftMessage.value = ''

  try {
    // 1. Search profiles
    const rawResults = await searchProfiles(targetCompany.value, targetRole.value, serperApiKey.value)
    
    if (!rawResults || rawResults.length === 0) {
      error.value = 'No results found. Try changing the company name.'
      isLoading.value = false
      return
    }

    // 2. AI Analysis
    const analyzed = await analyzeProfiles(
      rawResults,
      targetRole.value,
      jobDescription.value,
      openaiApiKey.value
    )

    contacts.value = analyzed

    // 3. Find emails for contacts that don't have one
    try {
      isFindingEmails.value = true
      emailSearchProgress.value = 'Searching for emails...'
      
      const contactsWithEmails = await Promise.all(
        analyzed.map(async (contact, index) => {
          // If email already found by AI, keep it
          if (contact.email && contact.email.trim() !== '') {
            return contact
          }

          // Otherwise, search for email
          emailSearchProgress.value = `Finding email for ${contact.name} (${index + 1}/${analyzed.length})...`
          
          try {
            const foundEmail = await findEmail(
              contact.name,
              targetCompany.value,
              contact.role,
              serperApiKey.value
            )

            return {
              ...contact,
              email: foundEmail || contact.email || ''
            }
          } catch (emailError) {
            // If email search fails, keep the contact without email
            console.warn(`Failed to find email for ${contact.name}:`, emailError)
            return contact
          }
        })
      )

      contacts.value = contactsWithEmails
    } catch (emailSearchError) {
      // If email search fails completely, keep contacts without emails
      console.warn('Email search failed:', emailSearchError)
    } finally {
      isFindingEmails.value = false
      emailSearchProgress.value = ''
    }
  } catch (err: any) {
    if (err instanceof OpenAIError) {
      if (err.statusCode === 429 && err.retryAfter) {
        error.value = `⏱️ Rate limit reached. Please wait ${err.retryAfter} seconds before trying again.`
      } else {
        error.value = `❌ ${err.message}`
      }
    } else {
      error.value = err.message || 'An error occurred during the search.'
    }
    console.error(err)
  } finally {
    isLoading.value = false
    isFindingEmails.value = false
    emailSearchProgress.value = ''
  }
}

const generateMessage = async (contact: AnalyzedContact) => {
  selectedContact.value = contact
  isGenerating.value = true
  draftMessage.value = ''

  try {
    const message = await generateDraftMessage(
      contact,
      targetRole.value,
      userContext.value,
      openaiApiKey.value
    )
    draftMessage.value = message
  } catch (err: any) {
    if (err instanceof OpenAIError) {
      if (err.statusCode === 429 && err.retryAfter) {
        error.value = `⏱️ Rate limit reached. Please wait ${err.retryAfter} seconds before trying again.`
      } else {
        error.value = `❌ ${err.message}`
      }
    } else {
      error.value = err.message || 'An error occurred while generating the message.'
    }
    console.error(err)
  } finally {
    isGenerating.value = false
  }
}

const copyToClipboard = async () => {
  if (draftMessage.value) {
    try {
      await navigator.clipboard.writeText(draftMessage.value)
      alert('Message copied to clipboard!')
    } catch (err) {
      console.error('Error copying to clipboard:', err)
    }
  }
}

onMounted(() => {
  openaiApiKey.value = getOpenAiKey()
  serperApiKey.value = getSerperKey()
})
</script>

