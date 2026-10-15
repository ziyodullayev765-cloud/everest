import React from 'react';

export const Navigation = ({ currentTab, setTab }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: '⛰️' },
    { id: 'homework', label: 'Homework', icon: '📚' },
    { id: 'progress', label: 'Progress', icon: '📈' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <>
      <aside className="desktop-sidebar glass-panel" style={{ width: '260px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563EB, #38BDF8)', display: 'grid', placeItems: 'center', fontSize: '20px' }}>
              ▲
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '1px' }}>EVEREST</div>
              <div style={{ fontSize: '11px', color: '#38BDF8', fontWeight: '600' }}>NO.1 ACADEMY</div>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {navItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: active ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
                    color: active ? '#FFF' : '#94A3B8',
                    borderLeft: active ? '3px solid #38BDF8' : '3px solid transparent',
                    cursor: 'pointer',
                    fontWeight: active ? '600' : '400',
                    textAlign: 'left'
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2563EB', display: 'grid', placeItems: 'center', fontWeight: 'bold' }}>A</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Aziza Yusupova</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Student • 9A</div>
          </div>
        </div>
      </aside>

      <div 
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '400px',
          height: '64px',
          background: 'rgba(8, 20, 43, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '32px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 1000
        }}
        className="mobile-only-nav"
      >
        {navItems.map((item) => {
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                background: 'none',
                border: 'none',
                color: active ? '#38BDF8' : '#64748B',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span style={{ fontWeight: active ? '600' : '400' }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};