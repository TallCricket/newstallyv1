import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../context/TranslationContext'

/**
 * useTranslate(text)
 * Returns { text: translatedText, loading: bool }
 * - Shows original immediately, then swaps to translated
 * - Cancels if component unmounts or lang changes
 */
export function useTranslate(text) {
  const { lang, translate } = useTranslation()
  const [translated, setTranslated] = useState(text)
  const [loading, setLoading] = useState(false)
  const cancelRef = useRef(false)

  useEffect(() => {
    setTranslated(text) // reset to original immediately
    if (!text || lang === 'en') { setLoading(false); return }
    cancelRef.current = false
    setLoading(true)
    translate(text).then(result => {
      if (!cancelRef.current) { setTranslated(result); setLoading(false) }
    }).catch(() => { if (!cancelRef.current) setLoading(false) })
    return () => { cancelRef.current = true }
  }, [text, lang]) // eslint-disable-line

  return { text: translated, loading }
}

/**
 * useTranslateMany(texts)
 * Translates an array of strings, returns { texts: [...], loading }
 */
export function useTranslateMany(texts) {
  const { lang, translateMany } = useTranslation()
  const [translated, setTranslated] = useState(texts)
  const [loading, setLoading] = useState(false)
  const cancelRef = useRef(false)

  useEffect(() => {
    setTranslated(texts)
    if (!texts.length || lang === 'en') { setLoading(false); return }
    cancelRef.current = false
    setLoading(true)
    translateMany(texts).then(results => {
      if (!cancelRef.current) { setTranslated(results); setLoading(false) }
    }).catch(() => { if (!cancelRef.current) setLoading(false) })
    return () => { cancelRef.current = true }
  }, [lang, texts.join('|').substring(0, 500)]) // eslint-disable-line

  return { texts: translated, loading }
}
