export const useSerper = () => {
  const searchProfiles = async (company: string, role: string, apiKey: string) => {
    const url = 'https://google.serper.dev/search'
    
    const query = `site:linkedin.com/in/ "${company}" ("${role}" OR "Talent Acquisition" OR "Recruiter" OR "Head of" OR "Manager")`
    
    const payload = {
      q: query,
      num: 10
    }

    try {
      const response = await $fetch(url, {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: payload
      })

      return (response as any).organic || []
    } catch (error) {
      console.error('Serper search error:', error)
      throw error
    }
  }

  return {
    searchProfiles
  }
}

