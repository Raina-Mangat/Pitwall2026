import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      background: '#040406',
      borderTop: '1px solid #0a0a0a',
      padding: '16px 32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
    }}>
      <div style={{
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: 14,
        fontWeight: 800,
        letterSpacing: 4,
        color: '#1a1a1a',
      }}>
        PIT<span style={{ color: '#2a0000' }}>WALL</span>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {['FastF1 API', 'Open-Meteo Weather', '2021–2026 Data',
          'ML Model v3', '82.1% Accuracy'].map(item => (
          <div key={item} style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            color: '#1a1a1a',
            letterSpacing: '1px',
          }}>
            {item}
          </div>
        ))}
      </div>

      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9,
        color: '#1a1a1a',
        letterSpacing: '1px',
      }}>
        RAINA © 2026
      </div>
    </footer>
  );
}