/**
 * TranslateButton — language selector + translate action
 * Used in NewsOpen and optionally in other pages.
 */
import { useState } from 'react'
import { useTranslate, LANGUAGES } from '../context/TranslateContext'

// ── Language picker dropdown ──────────────────────────────────────
export function LanguagePicker({ onClose }) {
  const { lang, setLang } = useTranslate()
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:600, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:480, background:'var(--surface)', borderRadius:'20px 20px 0 0', maxHeight:'70dvh', overflow:'hidden', display:'flex', flexDirection:'column', border:'1px solid var(--border)' }}>
        <div style={{ padding:'16px 16px 10px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ width:40, height:4, background:'var(--border)', borderRadius:99, position:'absolute', left:'50%', top:8, transform:'translateX(-50%)' }}/>
          <span style={{ fontSize:16, fontWeight:700, color:'var(--ink)' }}>Select Language</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:18, cursor:'pointer' }}>
            <i className="fas fa-times"/>
          </button>
        </div>
        <div style={{ overflowY:'auto', flex:1, padding:'8px 0' }}>
          {LANGUAGES.map(l => (
            <div key={l.code} onClick={() => { setLang(l.code); onClose() }}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 20px', cursor:'pointer', borderBottom:'1px solid var(--border2)', background: lang === l.code ? 'rgba(26,115,232,.06)' : 'transparent', transition:'background .15s' }}
              onMouseOver={e => e.currentTarget.style.background='var(--surface2)'}
              onMouseOut={e => e.currentTarget.style.background = lang === l.code ? 'rgba(26,115,232,.06)' : 'transparent'}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{l.native}</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>{l.name}</div>
              </div>
              {lang === l.code && <i className="fas fa-check" style={{ color:'#1a73e8', fontSize:14 }}/>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Translate article text ────────────────────────────────────────
export function TranslateArticleButton({ text, onTranslated }) {
  const { lang, translate, currentLang } = useTranslate()
  const [loading, setLoading] = useState(false)
  const [translated, setTranslated] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const doTranslate = async () => {
    if (lang === 'en') { setShowPicker(true); return }
    if (translated) { onTranslated(null); setTranslated(false); return }  // show original
    if (!text) return
    setLoading(true)
    try {
      // Split by sentences and translate in one call
      const result = await translate(text, lang)
      onTranslated(result)
      setTranslated(true)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  return (
    <>
      <button onClick={doTranslate} disabled={loading}
        style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, background: translated ? 'rgba(26,115,232,.1)' : 'var(--surface)', border:`1.5px solid ${translated ? '#1a73e8' : 'var(--border)'}`, fontSize:12, fontWeight:700, color: translated ? '#1a73e8' : 'var(--ink)', cursor: loading ? 'wait' : 'pointer', flexShrink:0 }}>
        {loading ? (
          <><i className="fas fa-spinner fa-spin" style={{ fontSize:11 }}/> Translating...</>
        ) : translated ? (
          <><i className="fas fa-language" style={{ fontSize:13 }}/> Original</>
        ) : (
          <><i className="fas fa-language" style={{ fontSize:13 }}/> {currentLang.native}</>
        )}
      </button>
      {lang === 'en' && showPicker && <LanguagePicker onClose={() => setShowPicker(false)}/>}
    </>
  )
}

// ── Global language selector button ──────────────────────────────
export default function TranslateButton() {
  const { currentLang } = useTranslate()
  const [showPicker, setShowPicker] = useState(false)

  return (
    <>
      <button onClick={() => setShowPicker(true)}
        style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, background:'var(--surface2)', border:'1px solid var(--border)', fontSize:12, fontWeight:600, color:'var(--muted)', cursor:'pointer' }}>
        <i className="fas fa-globe" style={{ fontSize:12, color:'#1a73e8' }}/>
        {currentLang.native}
      </button>
      {showPicker && <LanguagePicker onClose={() => setShowPicker(false)}/>}
    </>
  )
}
