import { createContext, useContext, useState, useCallback } from 'react'

export const INDIAN_LANGS = [
  { code: 'en',  name: 'English',    native: 'English'        },
  { code: 'hi',  name: 'Hindi',      native: '\u0939\u093f\u0928\u094d\u0926\u0940'          },
  { code: 'bn',  name: 'Bengali',    native: '\u09ac\u09be\u0982\u09b2\u09be'           },
  { code: 'te',  name: 'Telugu',     native: '\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41'          },
  { code: 'mr',  name: 'Marathi',    native: '\u092e\u0930\u093e\u0920\u0940'           },
  { code: 'ta',  name: 'Tamil',      native: '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd'           },
  { code: 'ur',  name: 'Urdu',       native: '\u0627\u0631\u062f\u0648'            },
  { code: 'gu',  name: 'Gujarati',   native: '\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0'         },
  { code: 'ml',  name: 'Malayalam',  native: '\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02'          },
  { code: 'kn',  name: 'Kannada',    native: '\u0c95\u0ca8\u0ccd\u0ca8\u0ca1'           },
  { code: 'or',  name: 'Odia',       native: '\u0b13\u0b21\u0b3c\u0b3f\u0b06'           },
  { code: 'pa',  name: 'Punjabi',    native: '\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40'          },
  { code: 'as',  name: 'Assamese',   native: '\u0985\u09b8\u09ae\u09c0\u09af\u09bc\u09be'         },
  { code: 'sd',  name: 'Sindhi',     native: '\u0633\u0646\u068c\u064a'            },
  { code: 'ne',  name: 'Nepali',     native: '\u0928\u0947\u092a\u093e\u0932\u0940'          },
  { code: 'sa',  name: 'Sanskrit',   native: '\u0938\u0902\u0938\u094d\u0915\u0943\u0924\u092e\u094d'       },
]

// Detect browser language, map to supported Indian lang or 'en'
function getBrowserLang() {
  const langs = navigator.languages || [navigator.language || 'en']
  for (const l of langs) {
    const code = l.split('-')[0].toLowerCase()
    if (INDIAN_LANGS.find(x => x.code === code)) return code
  }
  return 'en'
}

// In-memory translation cache: Map<`${lang}:${text}`, translatedText>
const translationCache = new Map()

const TranslationContext = createContext({
  lang: 'en', setLang: () => {}, langs: INDIAN_LANGS,
  translate: async t => t, translateMany: async arr => arr,
  getLangName: () => 'English', isNonEnglish: false,
})

export function TranslationProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('nt_lang')
    // If user explicitly set 'en', respect it; otherwise auto-detect
    if (saved && INDIAN_LANGS.find(l => l.code === saved)) return saved
    return getBrowserLang()
  })

  const setLang = code => {
    localStorage.setItem('nt_lang', code)
    setLangState(code)
    // Clear cache when language changes
    translationCache.clear()
  }

  // Translate a single string \u2014 with cache
  const translate = useCallback(async (text, targetLang) => {
    const tl = targetLang || lang
    if (!text || !text.trim() || tl === 'en') return text
    const key = `${tl}:${text}`
    if (translationCache.has(key)) return translationCache.get(key)
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`
      const res  = await fetch(url)
      const data = await res.json()
      const result = (data[0] || []).map(item => item?.[0] || '').join('') || text
      translationCache.set(key, result)
      return result
    } catch {
      return text
    }
  }, [lang])

  // Translate many strings at once \u2014 returns array in same order
  const translateMany = useCallback(async (texts, targetLang) => {
    const tl = targetLang || lang
    if (tl === 'en') return texts
    return Promise.all(texts.map(t => translate(t, tl)))
  }, [lang, translate])

  const getLangName = (code) => {
    const l = INDIAN_LANGS.find(x => x.code === (code || lang))
    return l ? `${l.native} (${l.name})` : 'English'
  }

  return (
    <TranslationContext.Provider value={{
      lang, setLang, langs: INDIAN_LANGS,
      translate, translateMany, getLangName,
      isNonEnglish: lang !== 'en'
    }}>
      {children}
    </TranslationContext.Provider>
  )
}

export const useTranslation = () => useContext(TranslationContext)
