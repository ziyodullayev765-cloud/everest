import React from 'react';

export const Dashboard = ({ studentName = "Aziza", homeworks = [] }) => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <section className="glass-panel" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <span className="badge badge-in-progress" style={{ marginBottom: '12px' }}>
            ⛰️ EVEREST PATH
          </span>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            Xayrli kech, {studentName} 👋
          </h1>
          <p style={{ color: '#94A3B8', maxWidth: '480px', fontSize: '15px', lineHeight: '1.5' }}>
            Cho'qqi sari harakatda davom eting. Keyingi natijangiz kutilganidan ham yaqinroq.
          </p>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {[
          { icon: '🔥', value: '12 kun', label: 'Streak' },
          { icon: '📚', value: '8 ta', label: 'Active Homework' },
          { icon: '✓', value: '24 ta', label: 'Completed' },
          { icon: '⭐', value: '1,240', label: 'Points' },
        ].map((stat, idx) => (
          <div key={idx} className="glass-panel glass-panel-hover" style={{ padding: '20px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#F8FAFC' }}>{stat.value}</div>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Uy vazifalari</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {homeworks.length > 0 ? (
            homeworks.map((item) => (
              <div key={item.id} className="glass-panel glass-panel-hover" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span className="badge badge-in-progress">{item.category || 'English'}</span>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>{item.dueDate || 'Sep 24'}</span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '20px' }}>{item.description}</p>
                <button className="btn-primary" style={{ width: '100%' }}>Open Homework →</button>
              </div>
            ))
          ) : (
            <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>⛰️</div>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>No homework yet</h3>
              <p style={{ color: '#64748B', fontSize: '14px' }}>Your Everest journey starts here.</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};