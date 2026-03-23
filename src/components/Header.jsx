import { useNavigate } from 'react-router-dom'

export default function Header({ onSearchClick, title = 'NewsTally' }) {
  const navigate = useNavigate()

  return (
    <header className="header">
      <div className="logo" onClick={() => navigate('/')}>
        <img
          className="logo-img"
          src="https://i.postimg.cc/dLTgRxbL/cropped-circle-image.png"
          alt="NewsTally"
        />
        <span className="logo-text">{title}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            style={{
              width: 36, height: 36, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6b7280', fontSize: 16
            }}
          >
            <i className="fas fa-magnifying-glass" />
          </button>
        )}
      </div>
    </header>
  )
}
