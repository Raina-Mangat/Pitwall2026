import React, { useState, useEffect } from 'react';
import axios from 'axios';

const COMPOUND_COLORS = {
  SOFT:         { bg: '#E8002D', label: '#fff', name: 'S' },
  MEDIUM:       { bg: '#FFD700', label: '#000', name: 'M' },
  HARD:         { bg: '#FFFFFF', label: '#000', name: 'H' },
  INTERMEDIATE: { bg: '#39B54A', label: '#fff', name: 'I' },
  WET:          { bg: '#0067FF', label: '#fff', name: 'W' },
  UNKNOWN:      { bg: '#333',    label: '#fff', name: '?' },
};

const TEAM_COLORS = {
  'Mercedes':        '#00D2BE',
  'Ferrari':         '#E8002D',
  'McLaren':         '#FF8000',
  'Red Bull Racing': '#3671C6',
  'Alpine':          '#0090FF',
  'Racing Bulls':    '#6692FF',
  'Haas F1 Team':    '#B6BABD',
  'Williams':        '#64C4FF',
  'Audi':            '#C0392B',
  'Aston Martin':    '#358C75',
  'Cadillac':        '#DDDDDD',
};

export default function TyreStrategy({ year, round, raceName }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!year || !round) return;
    setLoading(true);
    axios.get(`http://localhost:5000/api/strategy/${year}/${round}`)
      .then(r  => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [year, round]);

  if (loading) return (
    <div className="card">
      <div className="card-label">TYRE STRATEGY</div>
      <div className="loading">LOADING STRATEGY DATA...</div>
    </div>
  );

  if (error) return (
    <div className="card">
      <div className="card-label">TYRE STRATEGY</div>
      <div className="error-msg">Strategy data not available: {error}</div>
    </div>
  );

  if (!data?.drivers) return null;

  const totalLaps = data.totalLaps || 70;

  return (
    <div className="card">
      <div className="card-label">
        TYRE STRATEGY — {data.raceName || raceName}
      </div>

      {/* Compound legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(COMPOUND_COLORS).filter(([k]) => k !== 'UNKNOWN').map(([compound, style]) => (
          <div key={compound} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 14, height: 14,
              borderRadius: '50%',
              background: style.bg,
              border: compound === 'HARD' ? '1px solid #333' : 'none',
            }} />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px', color: '#444',
              letterSpacing: '1px',
            }}>
              {compound}
            </span>
          </div>
        ))}
      </div>

      {/* Lap number ruler */}
      <div style={{
        display: 'flex',
        marginBottom: 8,
        paddingLeft: 80,
      }}>
        {[1, Math.round(totalLaps/4), Math.round(totalLaps/2),
          Math.round(totalLaps*3/4), totalLaps].map(lap => (
          <div key={lap} style={{
            position: 'absolute',
            left: `${80 + ((lap-1)/totalLaps)*100}%`,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '8px', color: '#2a2a2a',
          }}>
            {lap}
          </div>
        ))}
      </div>

      {/* Strategy rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 16 }}>
        {data.drivers.slice(0, 15).map(driver => {
          const teamColor = TEAM_COLORS[driver.team] || '#444';
          return (
            <div key={driver.driver} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 22,
            }}>
              {/* Driver label */}
              <div style={{
                width: 72,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '10px',
                fontWeight: '700',
                color: teamColor,
                flexShrink: 0,
                textAlign: 'right',
              }}>
                {driver.driver}
                <span style={{ color: '#2a2a2a', fontWeight: 400, marginLeft: 4 }}>
                  P{driver.finish}
                </span>
              </div>

              {/* Stint bars */}
              <div style={{
                flex: 1,
                height: 16,
                background: '#0a0a0c',
                borderRadius: 4,
                position: 'relative',
                overflow: 'hidden',
              }}>
                {driver.stints.map((stint, i) => {
                  const style = COMPOUND_COLORS[stint.compound] || COMPOUND_COLORS.UNKNOWN;
                  const left  = ((stint.startLap - 1) / totalLaps) * 100;
                  const width = (stint.laps / totalLaps) * 100;
                  return (
                    <div
                      key={i}
                      title={`${stint.compound}: Laps ${stint.startLap}–${stint.endLap} (${stint.laps} laps)`}
                      style={{
                        position:  'absolute',
                        left:      `${left}%`,
                        width:     `${width}%`,
                        height:    '100%',
                        background: style.bg,
                        borderRight: '1px solid #060608',
                        display:   'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {width > 8 && (
                        <span style={{
                          fontSize: '8px',
                          fontWeight: '800',
                          color: style.label,
                          fontFamily: 'JetBrains Mono, monospace',
                          pointerEvents: 'none',
                        }}>
                          {style.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}