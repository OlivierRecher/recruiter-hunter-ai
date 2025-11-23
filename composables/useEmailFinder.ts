interface EmailSearchResult {
  email: string
  source: string
  confidence: 'high' | 'medium' | 'low'
}

// Extract email from text using regex
const extractEmails = (text: string): string[] => {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const emails = text.match(emailRegex) || []
  // Filter out common false positives
  return emails.filter(email => 
    !email.includes('example.com') && 
    !email.includes('test.com') &&
    !email.includes('domain.com') &&
    !email.includes('email.com')
  )
}

export const useEmailFinder = () => {
  const searchEmailOnCompanyWebsite = async (
    name: string,
    company: string,
    apiKey: string
  ): Promise<EmailSearchResult[]> => {
    try {
      // Try to find company domain first
      const domainQuery = `"${company}" site:${company.toLowerCase().replace(/\s+/g, '')}.com OR site:${company.toLowerCase().replace(/\s+/g, '-')}.com`
      
      const response = await $fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: {
          q: `"${name}" "${company}" (email OR contact OR "@") site:*.com`,
          num: 5
        }
      })

      const results = (response as any).organic || []
      const emails: EmailSearchResult[] = []

      for (const result of results) {
        const text = `${result.title} ${result.snippet}`.toLowerCase()
        const foundEmails = extractEmails(text)
        
        for (const email of foundEmails) {
          // Check if email matches company domain
          const companyDomain = company.toLowerCase().replace(/\s+/g, '')
          const isCompanyEmail = email.includes(companyDomain) || 
                                 email.includes(company.toLowerCase().replace(/\s+/g, '-'))
          
          emails.push({
            email,
            source: 'Company Website',
            confidence: isCompanyEmail ? 'high' : 'medium'
          })
        }
      }

      return emails
    } catch (error) {
      console.error('Error searching company website:', error)
      return []
    }
  }

  const searchEmailOnGoogle = async (
    name: string,
    company: string,
    role: string,
    apiKey: string
  ): Promise<EmailSearchResult[]> => {
    try {
      // Multiple search strategies
      const queries = [
        `"${name}" "${company}" email`,
        `"${name}" "${company}" contact`,
        `"${name}" "${role}" "${company}" "@"`,
        `"${name}" "${company}" mailto:`
      ]

      const allEmails: EmailSearchResult[] = []

      for (const query of queries) {
        try {
          const response = await $fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
              'X-API-KEY': apiKey,
              'Content-Type': 'application/json'
            },
            body: {
              q: query,
              num: 3
            }
          })

          const results = (response as any).organic || []
          
          for (const result of results) {
            const text = `${result.title} ${result.snippet}`.toLowerCase()
            const foundEmails = extractEmails(text)
            
            for (const email of foundEmails) {
              // Avoid duplicates
              if (!allEmails.some(e => e.email.toLowerCase() === email.toLowerCase())) {
                allEmails.push({
                  email,
                  source: 'Google Search',
                  confidence: 'medium'
                })
              }
            }
          }
        } catch (error) {
          // Continue with next query if one fails
          continue
        }
      }

      return allEmails
    } catch (error) {
      console.error('Error searching Google:', error)
      return []
    }
  }

  const searchEmailOnGitHub = async (
    name: string,
    company: string,
    apiKey: string
  ): Promise<EmailSearchResult[]> => {
    try {
      const response = await $fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: {
          q: `"${name}" "${company}" site:github.com`,
          num: 3
        }
      })

      const results = (response as any).organic || []
      const emails: EmailSearchResult[] = []

      for (const result of results) {
        const text = `${result.title} ${result.snippet}`.toLowerCase()
        const foundEmails = extractEmails(text)
        
        for (const email of foundEmails) {
          emails.push({
            email,
            source: 'GitHub',
            confidence: 'medium'
          })
        }
      }

      return emails
    } catch (error) {
      console.error('Error searching GitHub:', error)
      return []
    }
  }

  const searchEmailOnTwitter = async (
    name: string,
    company: string,
    apiKey: string
  ): Promise<EmailSearchResult[]> => {
    try {
      const response = await $fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: {
          q: `"${name}" "${company}" (email OR contact) site:twitter.com OR site:x.com`,
          num: 3
        }
      })

      const results = (response as any).organic || []
      const emails: EmailSearchResult[] = []

      for (const result of results) {
        const text = `${result.title} ${result.snippet}`.toLowerCase()
        const foundEmails = extractEmails(text)
        
        for (const email of foundEmails) {
          emails.push({
            email,
            source: 'Twitter/X',
            confidence: 'low'
          })
        }
      }

      return emails
    } catch (error) {
      console.error('Error searching Twitter:', error)
      return []
    }
  }

  const findEmail = async (
    name: string,
    company: string,
    role: string,
    apiKey: string
  ): Promise<string> => {
    try {
      // Run all searches in parallel for better performance
      const [companyResults, googleResults, githubResults, twitterResults] = await Promise.all([
        searchEmailOnCompanyWebsite(name, company, apiKey),
        searchEmailOnGoogle(name, company, role, apiKey),
        searchEmailOnGitHub(name, company, apiKey),
        searchEmailOnTwitter(name, company, apiKey)
      ])

      // Combine all results
      const allResults = [
        ...companyResults,
        ...googleResults,
        ...githubResults,
        ...twitterResults
      ]

      if (allResults.length === 0) {
        return ''
      }

      // Sort by confidence and pick the best one
      const confidenceOrder = { high: 3, medium: 2, low: 1 }
      allResults.sort((a, b) => 
        confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
      )

      // Return the highest confidence email
      const bestEmail = allResults[0].email

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (emailRegex.test(bestEmail)) {
        return bestEmail
      }

      return ''
    } catch (error) {
      console.error('Error finding email:', error)
      return ''
    }
  }

  return {
    findEmail,
    searchEmailOnCompanyWebsite,
    searchEmailOnGoogle,
    searchEmailOnGitHub,
    searchEmailOnTwitter
  }
}

