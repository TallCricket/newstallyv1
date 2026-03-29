import { createContext, useContext, useState, useCallback, useRef } from 'react'

export const INDIAN_LANGS = [
  { code: 'en',  name: 'English',    native: 'English'                               },
  { code: 'hi',  name: 'Hindi',      native: '\u0939\u093f\u0928\u094d\u0926\u0940'  },
  { code: 'bn',  name: 'Bengali',    native: '\u09ac\u09be\u0982\u09b2\u09be'         },
  { code: 'te',  name: 'Telugu',     native: '\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41'  },
  { code: 'mr',  name: 'Marathi',    native: '\u092e\u0930\u093e\u0920\u0940'         },
  { code: 'ta',  name: 'Tamil',      native: '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd'         },
  { code: 'ur',  name: 'Urdu',       native: '\u0627\u0631\u062f\u0648'               },
  { code: 'gu',  name: 'Gujarati',   native: '\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0' },
  { code: 'ml',  name: 'Malayalam',  native: '\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02' },
  { code: 'kn',  name: 'Kannada',    native: '\u0c95\u0ca8\u0ccd\u0ca8\u0ca1'         },
  { code: 'or',  name: 'Odia',       native: '\u0b13\u0b21\u0bc3\u0b06'               },
  { code: 'pa',  name: 'Punjabi',    native: '\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40'  },
  { code: 'as',  name: 'Assamese',   native: '\u0985\u09b8\u09ae\u09c0\u09af\u09bc\u09be' },
  { code: 'ne',  name: 'Nepali',     native: '\u0928\u0947\u092a\u093e\u0932\u0940'   },
  { code: 'mai', name: 'Maithili',   native: '\u092e\u0948\u0925\u093f\u0932\u0940'   },
  { code: 'sa',  name: 'Sanskrit',   native: '\u0938\u0902\u0938\u094d\u0915\u0943\u0924\u092e\u094d' },
]

// ---------- UI strings: en + hi only ----------
export const UI = {
  en: {
    home: 'Home', news: 'News', shorts: 'Shorts', search: 'Search', profile: 'Profile',
    save: 'Save', saved: 'Saved', repost: 'Repost', share: 'Share',
    readFull: 'Read Full Story', readArticle: 'Read Full Article',
    loading: 'Loading...', noNews: 'No news found', seeAll: 'See all',
    latestUpdates: 'Latest Updates', trending: 'Trending',
    translate: 'Translate', showOriginal: 'Show Original', translating: 'Translating...',
    settings: 'Settings', signIn: 'Sign In', signOut: 'Sign Out',
    editProfile: 'Edit Profile', darkMode: 'Dark Mode',
    language: 'Language', contentLang: 'News Language', uiLang: 'App Language',
    posts: 'Posts', followers: 'Followers', following: 'Following',
    appearance: 'Appearance & Language', information: 'Information', account: 'Account',
    app: 'App', browseNews: 'Browse News', noPostsYet: 'No posts yet',
    noSavedArticles: 'No saved articles', backToNews: 'Back to News',
    articleNotFound: 'Article not found', morelikethis: 'More like this',
    minRead: 'min read', cancel: 'Cancel', update: 'Update',
    addNews: 'Add News', manager: 'News Manager', delete: 'Delete',
    currentlyDark: 'Currently Dark', currentlyLight: 'Currently Light',
    followsDevice: 'Follows device if not set',
    uiLangDesc: 'Controls buttons, labels and navigation language',
    contentLangDesc: 'News headlines and articles will be translated to this language',
    autoTranslated: 'Auto-translated',
    bookmarkArticles: 'Bookmark articles in NewsTally \u2014 they\'ll appear here',
    shareFirst: 'Share your first thought on Socialgati!',
    joinSocialgati: 'Join Socialgati to post, follow and connect',
    signInView: 'Sign in to view your profile',
    justNow: 'Just now',
  },
  hi: {
    home: '\u0939\u094b\u092e', news: '\u0938\u092e\u093e\u091a\u093e\u0930', shorts: '\u0936\u0949\u0930\u094d\u091f\u094d\u0938', search: '\u0916\u094b\u091c\u0947\u0902', profile: '\u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932',
    save: '\u0938\u0939\u0947\u091c\u0947\u0902', saved: '\u0938\u0939\u0947\u091c\u093e', repost: '\u0930\u093f\u092a\u094b\u0938\u094d\u091f', share: '\u0936\u0947\u092f\u0930',
    readFull: '\u092a\u0942\u0930\u0940 \u0916\u092c\u0930 \u092a\u0922\u093c\u0947\u0902', readArticle: '\u092a\u0942\u0930\u093e \u0932\u0947\u0916 \u092a\u0922\u093c\u0947\u0902',
    loading: '\u0932\u094b\u0921 \u0939\u094b \u0930\u0939\u093e \u0939\u0948...', noNews: '\u0915\u094b\u0908 \u0938\u092e\u093e\u091a\u093e\u0930 \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u093e', seeAll: '\u0938\u092d\u0940 \u0926\u0947\u0916\u0947\u0902',
    latestUpdates: '\u0924\u093e\u091c\u093c\u093e \u0905\u092a\u0921\u0947\u091f', trending: '\u091f\u094d\u0930\u0947\u0902\u0921\u093f\u0902\u0917',
    translate: '\u0905\u0928\u0941\u0935\u093e\u0926', showOriginal: '\u092e\u0942\u0932 \u0926\u093f\u0916\u093e\u090f\u0902', translating: '\u0905\u0928\u0941\u0935\u093e\u0926 \u0939\u094b \u0930\u0939\u093e \u0939\u0948...',
    settings: '\u0938\u0947\u091f\u093f\u0902\u0917', signIn: '\u0938\u093e\u0907\u0928 \u0907\u0928', signOut: '\u0938\u093e\u0907\u0928 \u0906\u0909\u091f',
    editProfile: '\u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932 \u0938\u0902\u092a\u093e\u0926\u093f\u0924 \u0915\u0930\u0947\u0902', darkMode: '\u0921\u093e\u0930\u094d\u0915 \u092e\u094b\u0921',
    language: '\u092d\u093e\u0937\u093e', contentLang: '\u0938\u092e\u093e\u091a\u093e\u0930 \u092d\u093e\u0937\u093e', uiLang: '\u090f\u092a \u092d\u093e\u0937\u093e',
    posts: '\u092a\u094b\u0938\u094d\u091f', followers: '\u092b\u0949\u0932\u094b\u0905\u0930\u094d\u0938', following: '\u092b\u0949\u0932\u094b\u0907\u0902\u0917',
    appearance: '\u0926\u093f\u0916\u093e\u0935\u091f \u0914\u0930 \u092d\u093e\u0937\u093e', information: '\u091c\u093e\u0928\u0915\u093e\u0930\u0940', account: '\u0916\u093e\u0924\u093e',
    app: '\u090f\u092a', browseNews: '\u0938\u092e\u093e\u091a\u093e\u0930 \u0926\u0947\u0916\u0947\u0902', noPostsYet: '\u0905\u092d\u0940 \u0915\u094b\u0908 \u092a\u094b\u0938\u094d\u091f \u0928\u0939\u0940\u0902',
    noSavedArticles: '\u0915\u094b\u0908 \u0938\u0939\u0947\u091c\u0947 \u0917\u090f \u0932\u0947\u0916 \u0928\u0939\u0940\u0902', backToNews: '\u0938\u092e\u093e\u091a\u093e\u0930 \u092a\u0930 \u0935\u093e\u092a\u0938',
    articleNotFound: '\u0932\u0947\u0916 \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u093e', morelikethis: '\u0907\u0938 \u0924\u0930\u0939 \u0914\u0930',
    minRead: '\u092e\u093f\u0928\u091f \u092a\u0922\u093c\u0947\u0902', cancel: '\u0930\u0926\u094d\u0926 \u0915\u0930\u0947\u0902', update: '\u0905\u092a\u0921\u0947\u091f',
    addNews: '\u0938\u092e\u093e\u091a\u093e\u0930 \u091c\u094b\u0921\u093c\u0947\u0902', manager: '\u0928\u094d\u092f\u0942\u091c \u092e\u0948\u0928\u0947\u091c\u0930', delete: '\u0939\u091f\u093e\u090f\u0902',
    currentlyDark: '\u0905\u092d\u0940 \u0921\u093e\u0930\u094d\u0915', currentlyLight: '\u0905\u092d\u0940 \u0932\u093e\u0907\u091f',
    followsDevice: '\u0938\u0947\u091f \u0928 \u0939\u094b\u0928\u0947 \u092a\u0930 \u0921\u093f\u0935\u093e\u0907\u0938 \u0938\u0947\u091f\u093f\u0902\u0917 \u092b\u0949\u0932\u094b \u0915\u0930\u0947',
    uiLangDesc: '\u092c\u091f\u0928, \u0932\u0947\u092c\u0932 \u0914\u0930 \u0928\u0947\u0935\u093f\u0917\u0947\u0936\u0928 \u092d\u093e\u0937\u093e \u0928\u093f\u092f\u0902\u0924\u094d\u0930\u093f\u0924 \u0915\u0930\u0924\u093e \u0939\u0948',
    contentLangDesc: '\u0938\u092e\u093e\u091a\u093e\u0930 \u0939\u0947\u0921\u0932\u093e\u0907\u0928 \u0914\u0930 \u0932\u0947\u0916 \u0907\u0938 \u092d\u093e\u0937\u093e \u092e\u0947\u0902 \u0905\u0928\u0941\u0935\u093e\u0926\u093f\u0924 \u0939\u094b\u0902\u0917\u0947',
    autoTranslated: '\u0938\u094d\u0935\u0924: \u0905\u0928\u0941\u0935\u093e\u0926\u093f\u0924',
    bookmarkArticles: 'NewsTally \u092e\u0947\u0902 \u0906\u0930\u094d\u091f\u093f\u0915\u0932 \u092c\u0941\u0915\u092e\u093e\u0930\u094d\u0915 \u0915\u0930\u0947\u0902',
    shareFirst: 'Socialgati \u092a\u0930 \u0905\u092a\u0928\u093e \u092a\u0939\u0932\u093e \u0935\u093f\u091a\u093e\u0930 \u0936\u0947\u092f\u0930 \u0915\u0930\u0947\u0902!',
    joinSocialgati: '\u092a\u094b\u0938\u094d\u091f, \u092b\u0949\u0932\u094b \u0914\u0930 \u091c\u0941\u0921\u093c\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f Socialgati \u091c\u0949\u0907\u0928 \u0915\u0930\u0947\u0902',
    signInView: '\u0905\u092a\u0928\u093e \u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932 \u0926\u0947\u0916\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0938\u093e\u0907\u0928 \u0907\u0928 \u0915\u0930\u0947\u0902',
    justNow: '\u0905\u092d\u0940',
  }
}

function getBrowserLang() {
  const langs = navigator.languages || [navigator.language || 'en']
  for (const l of langs) {
    const code = l.split('-')[0].toLowerCase()
    if (INDIAN_LANGS.find(x => x.code === code)) return code
  }
  return 'en'
}

// Persistent translation cache in localStorage
const CACHE_KEY = 'nt_tcache_v2'
function loadCache() {
  try { return new Map(JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')) } catch { return new Map() }
}
function saveCache(map) {
  try {
    // Keep only most recent 2000 entries
    const entries = [...map.entries()]
    const trimmed = entries.slice(-2000)
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed))
  } catch {}
}
const translationCache = loadCache()

const TranslationContext = createContext({
  lang: 'en', uiLang: 'en', setLang: () => {}, langs: INDIAN_LANGS,
  translate: async t => t, translateMany: async arr => arr,
  getLangName: () => 'English', isNonEnglish: false,
  t: key => key,
})

export function TranslationProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('nt_lang')
    if (saved && INDIAN_LANGS.find(l => l.code === saved)) return saved
    return getBrowserLang()
  })

  // uiLang: only en or hi. If user picked hi -> hi UI, else -> en UI
  const uiLang = lang === 'hi' ? 'hi' : 'en'

  const setLang = code => {
    localStorage.setItem('nt_lang', code)
    setLangState(code)
  }

  // t(key) - get UI string
  const t = useCallback((key) => {
    return UI[uiLang]?.[key] || UI.en[key] || key
  }, [uiLang])

  // Rate limiter ref - max 5 concurrent requests
  const activeRequests = useRef(0)
  const requestQueue = useRef([])

  const executeTranslate = async (text, tl) => {
    const key = `${tl}:${text.substring(0, 200)}`
    if (translationCache.has(key)) return translationCache.get(key)
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`
      const res = await fetch(url)
      const data = await res.json()
      const result = (data[0] || []).map(item => item?.[0] || '').join('') || text
      translationCache.set(key, result)
      saveCache(translationCache)
      return result
    } catch {
      return text
    }
  }

  const translate = useCallback(async (text, targetLang) => {
    const tl = targetLang || lang
    if (!text || !text.trim() || tl === 'en') return text
    return executeTranslate(text, tl)
  }, [lang])

  const translateMany = useCallback(async (texts, targetLang) => {
    const tl = targetLang || lang
    if (tl === 'en') return texts
    // Process in batches of 5
    const results = []
    for (let i = 0; i < texts.length; i += 5) {
      const batch = texts.slice(i, i + 5)
      const translated = await Promise.all(batch.map(txt => executeTranslate(txt, tl)))
      results.push(...translated)
    }
    return results
  }, [lang])

  const getLangName = (code) => {
    const l = INDIAN_LANGS.find(x => x.code === (code || lang))
    return l ? l.native : 'English'
  }

  return (
    <TranslationContext.Provider value={{
      lang, uiLang, setLang, langs: INDIAN_LANGS,
      translate, translateMany, getLangName,
      isNonEnglish: lang !== 'en',
      t,
    }}>
      {children}
    </TranslationContext.Provider>
  )
}

export const useTranslation = () => useContext(TranslationContext)
