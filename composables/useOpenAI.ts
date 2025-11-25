interface Profile {
  title: string
  snippet: string
  link: string
}

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

export class OpenAIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryAfter?: number
  ) {
    super(message)
    this.name = 'OpenAIError'
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const fetchWithRetry = async (
  url: string,
  options: any,
  maxRetries = 3,
  baseDelay = 1000
): Promise<any> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await $fetch(url, options)
      return response
    } catch (error: any) {
      const statusCode = error?.statusCode || error?.status || error?.response?.status
      
      // Error 429 - Rate limit
      if (statusCode === 429) {
        // Try to extract retry-after in different ways depending on error structure
        let retryAfter: number
        if (error?.response?.headers?.['retry-after']) {
          retryAfter = parseInt(error.response.headers['retry-after'])
        } else if (error?.response?.headers?.['Retry-After']) {
          retryAfter = parseInt(error.response.headers['Retry-After'])
        } else if (error?.headers?.['retry-after']) {
          retryAfter = parseInt(error.headers['retry-after'])
        } else if (error?.headers?.['Retry-After']) {
          retryAfter = parseInt(error.headers['Retry-After'])
        } else {
          // Default exponential backoff
          retryAfter = Math.pow(2, attempt) * baseDelay / 1000
        }
        
        if (attempt < maxRetries - 1) {
          const delayMs = retryAfter * 1000
          console.log(`Rate limit reached. Retrying in ${retryAfter}s...`)
          await sleep(delayMs)
          continue
        } else {
          throw new OpenAIError(
            `Rate limit reached. Please wait ${retryAfter} seconds before trying again.`,
            429,
            retryAfter
          )
        }
      }
      
      // Error 401 - Invalid API key
      if (statusCode === 401) {
        throw new OpenAIError('Invalid OpenAI API key. Please check your key in the configuration.', 401)
      }
      
      // Error 500 - Server error
      if (statusCode >= 500) {
        if (attempt < maxRetries - 1) {
          const delayMs = Math.pow(2, attempt) * baseDelay
          console.log(`Server error. Retrying in ${delayMs}ms...`)
          await sleep(delayMs)
          continue
        } else {
          throw new OpenAIError('OpenAI server error. Please try again later.', statusCode)
        }
      }
      
      // Other errors
      throw new OpenAIError(
        error?.message || error?.data?.message || 'An error occurred with the OpenAI API.',
        statusCode
      )
    }
  }
  
  throw new OpenAIError('Failed after multiple attempts.')
}

export const useOpenAI = () => {
  const analyzeProfiles = async (
    profiles: Profile[],
    targetRole: string,
    jobDesc: string,
    apiKey: string,
    location?: string
  ): Promise<AnalyzedContact[]> => {
    const profilesText = profiles
      .map((p, i) => `ID: ${i}, Titre: ${p.title}, Snippet: ${p.snippet}, Link: ${p.link}`)
      .join('\n')

    const prompt = `
  You are a recruitment expert. Here is a list of LinkedIn search results for someone looking for the position of '${targetRole}'.
  Job description (context): ${jobDesc || 'Not provided'}
  Job location (context): ${location || 'Not provided'}

  Analyze each profile and return a strict JSON list. For each profile, identify:
1. The Name (extracted from the title).
2. The Current Role.
3. The "Potential Score" (0-100): Probability that this person could hire me or get me an interview.
4. The "Type": "Hiring Manager" (potential boss), "Recruiter" (HR), "Peer" (Colleague), or "Irrelevant".
5. A short "Reason" (one sentence) explaining why this contact is relevant.
6. The email address (extract from the snippet if available, look for patterns like "email", "contact", "@company.com", or any visible email format. If not found, leave empty "").
7. The LinkedIn URL.

Here are the profiles:
${profilesText}

Respond ONLY with the JSON array (no markdown, no text before/after).
Format: [{"id": 0, "name": "...", "role": "...", "score": 80, "type": "...", "reason": "...", "link": "...", "email": "..."}]
`

    try {
      const response = await fetchWithRetry(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: {
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: 'You are a helpful JSON assistant.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0
          }
        }
      )

      const content = (response as any).choices[0].message.content
      const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim()
      return JSON.parse(cleanedContent) as AnalyzedContact[]
    } catch (error) {
      console.error('OpenAI analysis error:', error)
      throw error
    }
  }

  const draftMessage = async (
    contactInfo: AnalyzedContact,
    targetRole: string,
    userCvContext: string,
    apiKey: string
  ): Promise<string> => {
    const prompt = `
Role: You are a career coach helping a candidate write a genuine, warm, and professional cold email.

Task: Draft a LinkedIn note (max 300 chars) and a short cold email.

Input Data:
- Target Role: ${targetRole}
- Context: ${userCvContext}
- Contact: ${contactInfo.name} (${contactInfo.role})
- Type: ${contactInfo.type}

Guidelines & Tone:
1. **Tone:** Warm, polite, and humble ("Quiet Confidence").
    - **Be Enterprising:** Don't just ask if they are hiring. Propose a value exchange.
    - **Be Humble yet Ready:** Express a strong desire to learn from the best (e.g., "thrilled to learn"), but assert operational readiness (e.g., "ready to contribute").
    - **No Arrogance:** Avoid comparing yourself to others (e.g., no "unlike other students"). Focus on your own unique path.
    - **DO** be concise and clear.
2. **Structure:**
    - **Opening:** Polite and friendly (e.g., "Hope you're having a good week").
    - **The "Who":** Introduce yourself as a student AND an apprentice (emphasize the dual experience).
    - **The Value:** Mention the specific tech stack (from Context) and the 3+ years of experience as a sign of reliability/autonomy, not superiority.
    - **The Goal:** Express enthusiasm for the company and a desire to contribute to the team's success while learning.
    **The CTA (Call to Action):**
    - **Direct Interview Request:** Ask for a brief chat/call directly.
    - Examples: "Are you open to a 10-min chat?", "I’d love to discuss how I can contribute..."

3. Output Format:
**[LinkedIn Message]**
(Under 300 chars. Friendly and clear.)

**[Cold Email]**
Subject: (Clear and professional)
Body:
- Warm Salutation
- Introduction (Student + Apprentice)
- Connection to the role (Skills + Enthusiasm)
- Soft CTA
- Warm Sign-off
`

    try {
      const response = await fetchWithRetry(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: {
            model: 'gpt-4o',
            messages: [
              { role: 'user', content: prompt }
            ]
          }
        }
      )

      return (response as any).choices[0].message.content
    } catch (error) {
      console.error('Message generation error:', error)
      throw error
    }
  }

  return {
    analyzeProfiles,
    draftMessage
  }
}

