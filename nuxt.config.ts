// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // API keys will be managed client-side via localStorage
    }
  }
  ,
  app: {
    head: {
      title: 'Contact Finder — Recruiter Hunter 🎯',
      meta: [
        { name: 'description', content: "Find recruiter and hiring manager contacts and draft outreach messages using AI." }
      ],
      link: [
        // Favicon using an SVG data URL with the target emoji 🎯
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="48">🎯</text></svg>'
        }
      ]
    }
  }
})

