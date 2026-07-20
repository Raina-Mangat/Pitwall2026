import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const BASE = "https://pitwall2026.onrender.com";

const TEAM_COLORS = {
  'Mercedes':        '#00D2BE',
  'Ferrari':         '#E8002D',
  'McLaren':         '#FF8000',
  'Red Bull Racing': '#3671C6',
  'Alpine':          '#0090FF',
  'Aston Martin':    '#358C75',
  'Williams':        '#64C4FF',
  'Haas F1 Team':    '#B6BABD',
  'Audi':            '#C0392B',
  'Cadillac':        '#DDDDDD',
  'Racing Bulls':    '#6692FF',
};

const RACE_CALENDAR = {
  1:  { date: 'Mar 08', city: 'Melbourne' },
  2:  { date: 'Mar 15', city: 'Shanghai' },
  3:  { date: 'Mar 29', city: 'Suzuka' },
  4:  { date: 'May 03', city: 'Miami' },
  5:  { date: 'May 18', city: 'Montréal' },
  6:  { date: 'May 25', city: 'Monte Carlo' },
  7:  { date: 'Jun 01', city: 'Barcelona' },
  8:  { date: 'Jun 28', city: 'Spielberg' },
  9:  { date: 'Jul 05', city: 'Silverstone' },
  10: { date: 'Jul 27', city: 'Spa-Francorchamps' },
  11: { date: 'Aug 02', city: 'Budapest' },
  12: { date: 'Aug 30', city: 'Zandvoort' },
  13: { date: 'Sep 06', city: 'Monza' },
  14: { date: 'Sep 21', city: 'Baku' },
  15: { date: 'Oct 05', city: 'Marina Bay' },
  16: { date: 'Oct 19', city: 'Austin' },
  17: { date: 'Oct 26', city: 'Mexico City' },
  18: { date: 'Nov 08', city: 'São Paulo' },
  19: { date: 'Nov 22', city: 'Las Vegas' },
  20: { date: 'Nov 29', city: 'Lusail' },
  21: { date: 'Dec 07', city: 'Yas Island' },
};

const CIRCUIT_PATHS = {
  'Melbourne':         'M20 40 Q20 20 40 20 L80 20 Q95 20 100 30 L100 45 Q100 55 90 60 L60 65 Q45 70 40 60 L30 50 Q20 55 20 40Z',
  'Shanghai':          'M15 50 L15 30 Q15 15 30 15 L70 15 Q90 15 105 25 L105 40 L90 40 L90 55 Q90 65 75 65 L40 65 Q25 65 15 50Z',
  'Suzuka':            'M20 25 Q20 10 35 10 L55 10 Q65 10 70 20 L70 35 Q75 45 85 45 L95 45 Q105 45 105 55 L105 65 Q105 72 95 72 L25 72 Q15 72 15 65 L15 40 Q15 30 20 25Z',
  'Miami':             'M20 55 L20 35 Q20 20 35 20 L85 20 Q100 20 105 30 L105 50 Q100 65 85 65 L50 65 Q35 65 30 72 L20 72Z',
  'Montréal':          'M25 65 L25 20 Q25 10 40 10 L80 10 Q95 10 95 25 L95 50 Q95 60 85 65 Q75 70 60 65 L45 60 Q30 65 25 65Z',
  'Monte Carlo':       'M15 50 L15 25 Q15 10 30 10 L60 10 Q80 10 100 20 L105 35 L90 40 L75 35 L60 45 Q55 55 65 62 L85 65 L85 72 L20 72 L15 60Z',
  'Barcelona':         'M20 40 L20 20 Q20 10 35 10 L85 10 Q100 10 105 22 L105 38 Q100 48 88 48 L65 48 Q55 48 55 58 L55 70 L20 70 Q10 70 10 60 L10 50 Q10 40 20 40Z',
  'Spielberg':         'M30 65 L30 20 Q30 10 45 10 L75 10 Q90 10 95 22 L95 50 Q95 65 80 65 L60 65 Q45 65 40 72 L30 72Z',
  'Silverstone':       'M15 45 Q10 30 20 20 L45 10 Q65 5 80 15 L100 25 Q112 35 108 50 L95 60 Q80 70 65 65 L40 65 Q20 65 15 55Z',
  'Spa-Francorchamps': 'M15 60 L15 30 Q15 10 35 10 L55 10 Q65 10 72 20 L85 35 Q95 42 105 38 L105 50 Q105 62 95 65 L60 68 Q40 72 25 65Z',
  'Budapest':          'M20 50 Q15 35 25 22 L50 10 Q70 5 85 15 L100 30 Q110 45 100 58 L80 68 Q60 75 40 68 L25 60Z',
  'Zandvoort':         'M25 55 Q15 42 20 28 L35 12 Q50 5 70 8 L88 15 Q100 25 102 42 L98 58 Q88 70 70 72 L45 70 Q28 68 25 55Z',
  'Monza':             'M20 35 L20 15 Q20 5 35 5 L85 5 Q100 5 105 15 L105 65 Q105 75 90 75 L30 75 Q15 75 15 65 L15 45 Q15 35 20 35Z',
  'Baku':              'M15 70 L15 10 Q15 2 25 2 L95 2 Q105 2 105 12 L105 30 L75 30 L75 55 Q75 65 65 68 L30 72Z',
  'Marina Bay':        'M20 65 L20 15 Q20 5 32 5 L70 5 Q82 5 88 15 L95 30 Q95 42 85 48 L65 52 Q55 55 55 65 L55 75 L20 75Z',
  'Austin':            'M20 55 L20 20 Q20 8 35 8 L80 8 Q95 8 100 20 L100 38 Q95 48 82 48 L60 48 Q50 48 50 58 L50 72 L20 72Z',
  'Mexico City':       'M15 55 L15 25 Q15 10 30 10 L85 10 Q100 10 108 22 L108 40 Q105 55 90 58 L55 62 Q40 65 35 72 L15 72Z',
  'São Paulo':         'M25 60 L20 25 Q18 10 35 8 L70 8 Q88 8 95 22 L98 42 Q95 58 80 65 L50 70 Q30 72 25 60Z',
  'Las Vegas':         'M15 65 L15 10 Q15 2 28 2 L92 2 Q105 2 105 15 L105 30 L85 30 L85 52 Q85 65 72 68 L28 68Z',
  'Lusail':            'M20 55 Q12 38 22 22 L45 8 Q65 2 82 10 L98 22 Q108 38 102 55 L88 68 Q70 76 50 72 L28 65Z',
  'Yas Island':        'M18 50 Q12 35 22 20 L48 8 Q68 2 85 12 L100 28 Q108 42 104 58 L88 70 Q70 78 48 74 L25 65Z',
};

function CircuitDiagram({ location, size = 70 }) {
  const path = CIRCUIT_PATHS[location];
  if (!path) return <div style={{ width: size, height: size * 0.65 }} />;
  return (
    <svg width={size} height={size * 0.65} viewBox="0 0 120 80">
      <path d={path} fill="none" stroke="#E10600"
        strokeWidth="3.5" strokeLinecap="round"
        strokeLinejoin="round" opacity="0.6" />
    </svg>
  );
}


  


export default function Season() {
  const [races,   setRaces]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    axios.get(`${BASE}/api/calendar`)
      .then(r => setRaces(r.data.races || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">LOADING SEASON...</div>;
  if (error)   return <div className="page"><div className="error-msg">{error}</div></div>;

  const completed = races.filter(r => r.hasResult).length;
  

  return (
    <div className="page">
      <div className="page-header">
  <div className="page-eyebrow">2026 FORMULA 1 SEASON</div>
  <h1 className="page-title">Season Calendar</h1>

  
</div>

      

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(188px, 1fr))',
        gap: 12,
      }}>
        {races.map((race, i) => {
          const round    = Number(race.round) || i + 1;
          const cal      = RACE_CALENDAR[round] || {};
          const name     = (race.raceName || race.name || 'Unknown Race')
                           .replace(' Grand Prix', ' GP');
          const location = cal.city || '';
          const isCorrect  = race.winnerCorrect === true;
          const isWrong    = race.hasResult && !race.winnerCorrect;
      

          const borderColor = isCorrect  ? '#4CAF5033'
                            : isWrong    ? '#E1060033'
                            : '#141416';
          const dotColor    = isCorrect  ? '#4CAF50'
                            : isWrong    ? '#E10600'
                            : '#1a1a1a';

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              style={{
                background: '#0a0a0c',
                border: `1px solid ${borderColor}`,
                borderRadius: 10,
                padding: '14px 14px 12px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Circuit diagram — faded background */}
              <div style={{
                position: 'absolute',
                top: 6, right: 6,
                opacity: 0.45,
                pointerEvents: 'none',
              }}>
                <CircuitDiagram location={location} size={72} />
              </div>

              {/* Round + date */}
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9, color: '#2a2a2a',
                letterSpacing: '1.5px', marginBottom: 6,
              }}>
                R{String(round).padStart(2, '0')} · {cal.date || 'TBD'}
              </div>

              {/* Race name */}
              <div style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: 16, fontWeight: 800,
                color: '#fff', letterSpacing: 0.5,
                lineHeight: 1.1, marginBottom: 4,
                paddingRight: 56,
              }}>
                {name}
              </div>

              {/* City */}
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9, color: '#222',
                letterSpacing: '1px', marginBottom: 12,
              }}>
                {location.toUpperCase()}
              </div>

              {/* Status row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: dotColor, flexShrink: 0,
                }} />
                {race.hasResult ? (
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                    color: isCorrect ? '#4CAF50' : '#E10600',
                    letterSpacing: '0.5px',
                  }}>
                    {race.actualWinner} WON
                    {isCorrect ? ' ✓' : ' ✗'}
                  </div>
                ) : (
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10, color: '#1e1e1e',
                  }}>
                    PRED: {race.predictedWinner || 'TBD'}
                  </div>
                )}
              </div>

              {/* Podium overlap */}
              {race.hasResult && (
                <div style={{
                  marginTop: 5,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9, color: '#1e1e1e',
                }}>
                  {race.podiumOverlap || 0}/3 PODIUM
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}