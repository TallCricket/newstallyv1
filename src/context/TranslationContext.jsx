import { createContext, useContext, useState } from 'react'

export const INDIAN_LANGS = [
  { code: 'en',  name: 'English',    native: 'English'        },
  { code: 'hi',  name: 'Hindi',      native: 'हिन्दी'          },
  { code: 'bn',  name: 'Bengali',    native: 'বাংলা'           },
  { code: 'te',  name: 'Telugu',     native: 'తెలుగు'          },
  { code: 'mr',  name: 'Marathi',    native: 'मराठी'           },
  { code: 'ta',  name: 'Tamil',      native: 'தமிழ்'           },
  { code: 'ur',  name: 'Urdu',       native: 'اردو'            },
  { code: 'gu',  name: 'Gujarati',   native: 'ગુજરાતી'         },
  { code: 'ml',  name: 'Malayalam',  native: 'മലയാളം'          },
  { code: 'kn',  name: 'Kannada',    native: 'ಕನ್ನಡ'           },
  { code: 'or',  name: 'Odia',       native: 'ଓଡ଼ିଆ'           },
  { code: 'pa',  name: 'Punjabi',    native: 'ਪੰਜਾਬੀ'          },
  { code: 'as',  name: 'Assamese',   native: 'অসমীয়া'         },
  { code: 'sd',  name: 'Sindhi',     native: 'سنڌي'            },
  { code: 'ne',  name: 'Nepali',     native: 'नेपाली'          },
  { code: 'sa',  name: 'Sanskrit',   native: 'संस्कृतम्'       },
]

function getBrowserLang() {
  const bl = (navigator.language || navigator.languages?.[0] || 'en').split('-')[0].toLowerCase()
  return INDIAN_LANGS.find(l => l.code === bl)?.code || 'en'
}

const TranslationContext = createContext({
  lang: 'en', setLang: () => {}, langs: INDIAN_LANGS,
  translate: async t => t, getLangName: () => 'English',
})

export function TranslationProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('nt_lang')
    return (saved && INDIAN_LANGS.find(l => l.code === saved)) ? saved : getBrowserLang()
  })

  const setLang = code => {
    localStorage.setItem('nt_lang', code)
    setLangState(code)
  }

  // Free Google Translate (unofficial public endpoint – no key needed)
  const translate = async (text, targetLang = lang) => {
    if (!text || !text.trim() || targetLang === 'en') return text
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
      const res  = await fetch(url)
      const data = await res.json()
      return (data[0] || []).map(item => item?.[0] || '').join('') || text
    } catch {
      return text  // fallback to original on error
    }
  }

  const getLangName = (code = lang) => {
    const l = INDIAN_LANGS.find(x => x.code === code)
    return l ? `${l.native} (${l.name})` : 'English'
  }

  return (
    <TranslationContext.Provider value={{ lang, setLang, langs: INDIAN_LANGS, translate, getLangName }}>
      {children}
    </TranslationContext.Provider>
  )
}

export const useTranslation = () => useContext(TranslationContext)
