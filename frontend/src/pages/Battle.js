import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import axios from 'axios';

const BASE = 'http://localhost:5000';

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



const DRIVERS_2026 = [
  'ANT','RUS','HAM','LEC','NOR','PIA',
  'VER','HAD','GAS','COL','OCO','BEA',
  'LAW','LIN','ALB','SAI','HUL','BOR',
  'ALO','STR','PER','BOT',
];

function StatRow({ label, valA, valB, lowerBetter = false }) {
  const a = parseFloat(valA) || 0;
  const b = parseFloat(valB) || 0;
  const aWins = lowerBetter ? a < b : a > b;
  const bWins = lowerBetter ? b < a : b > a;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 110px 1fr',
      alignItems: 'center',
      gap: 10,
      padding: '9px 0',
      borderBottom: '1px solid #0a0a0a',
    }}>
      <div style={{
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: 18, fontWeight: 700,
        color: aWins ? '#4CAF50' : '#fff',
        textAlign: 'right',
      }}>
        {valA}
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9, color: '#2a2a2a',
        letterSpacing: '1px', textAlign: 'center',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: 18, fontWeight: 700,
        color: bWins ? '#4CAF50' : '#fff',
        textAlign: 'left',
      }}>
        {valB}
      </div>
    </div>
  );
}

export default function Battle() {
  const [driverA,    setDriverA]    = useState('ANT');
  const [driverB,    setDriverB]    = useState('VER');
  const [battleData, setBattleData] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    if (!driverA || !driverB || driverA === driverB) return;
    setLoading(true);
    setError(null);
    axios.get(`${BASE}/api/battle/${driverA}/${driverB}`)
      .then(r  => setBattleData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [driverA, driverB]);

  const d1Stats = battleData?.d1Stats;
  const d2Stats = battleData?.d2Stats;
  const h2h     = battleData?.h2h || [];
  const summary = battleData?.h2hSummary || {};

  // Chart data — recent form comparison
  const chartData = (d1Stats?.recentForm || []).map((row, i) => ({
    race:    (row.circuit || '').substring(0, 4),
    [driverA]: row.finish,
    [driverB]: d2Stats?.recentForm?.[i]?.finish || null,
  }));

  // Team colors from recent form
  const colorA = '#00D2BE'; // will be overridden by actual team later
  const colorB = '#E8002D';

  const selectStyle = {
    background: '#0e0e10',
    border: '1px solid #1a1a1a',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: 8,
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    width: '100%',
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-eyebrow">HEAD TO HEAD</div>
        <h1 className="page-title">Battle Analyser</h1>
        <p className="page-subtitle">
          Compare any two drivers — form, stats, and head-to-head history
        </p>
      </div>

      {/* Driver selectors */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: 16, alignItems: 'center',
        marginBottom: 20,
      }}>
        <div>
          <div className="card-label" style={{ marginBottom: 6 }}>DRIVER A</div>
          <select style={selectStyle} value={driverA}
            onChange={e => setDriverA(e.target.value)}>
            {DRIVERS_2026.filter(d => d !== driverB).map(d =>
              <option key={d}>{d}</option>
            )}
          </select>
        </div>

        <div style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 24, fontWeight: 800,
          color: '#2a2a2a', letterSpacing: 2,
          textAlign: 'center',
        }}>
          VS
        </div>

        <div>
          <div className="card-label" style={{ marginBottom: 6 }}>DRIVER B</div>
          <select style={selectStyle} value={driverB}
            onChange={e => setDriverB(e.target.value)}>
            {DRIVERS_2026.filter(d => d !== driverA).map(d =>
              <option key={d}>{d}</option>
            )}
          </select>
        </div>
      </div>

      {loading && <div className="loading">LOADING BATTLE DATA...</div>}
      {error   && <div className="error-msg">Error: {error}</div>}

      {!loading && battleData && (
        <>
          {/* Driver header cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12, marginBottom: 16,
          }}>
            {[
              { drv: driverA, stats: d1Stats },
              { drv: driverB, stats: d2Stats },
            ].map(({ drv, stats }) => (
              <motion.div
                key={drv}
                className="card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontSize: 52, fontWeight: 900,
                  letterSpacing: 4,
                  color: drv === driverA ? colorA : colorB,
                  lineHeight: 1,
                }}>
                  {drv}
                </div>
                <div style={{
                  display: 'flex', gap: 16, marginTop: 10,
                  flexWrap: 'wrap',
                }}>
                  {[
                    { label: 'RACES',   value: stats?.races || 0 },
                    { label: 'WINS',    value: stats?.wins || 0 },
                    { label: 'PODIUMS', value: stats?.podiums || 0 },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{
                        fontFamily: 'Barlow Condensed, sans-serif',
                        fontSize: 24, fontWeight: 800, color: '#fff',
                      }}>
                        {value}
                      </div>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 8, color: '#2a2a2a', letterSpacing: '1px',
                      }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Stats comparison */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-label">HEAD-TO-HEAD STATS</div>
            <StatRow label="TOTAL WINS"   valA={d1Stats?.wins || 0}       valB={d2Stats?.wins || 0} />
            <StatRow label="PODIUMS"      valA={d1Stats?.podiums || 0}    valB={d2Stats?.podiums || 0} />
            <StatRow label="WIN RATE"     valA={d1Stats?.winRate || '0%'} valB={d2Stats?.winRate || '0%'} />
            <StatRow label="PODIUM RATE"  valA={d1Stats?.podiumRate||'0%'} valB={d2Stats?.podiumRate||'0%'} />
            <StatRow label="AVG FINISH"   valA={d1Stats?.avgFinish || '--'} valB={d2Stats?.avgFinish || '--'} lowerBetter />
            <StatRow label="TOTAL RACES"  valA={d1Stats?.races || 0}      valB={d2Stats?.races || 0} />
          </div>

          {/* H2H win ratio */}
          {summary.total > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-label">
                HEAD TO HEAD — {summary.d1Wins}W {driverA} vs {driverB} {summary.d2Wins}W
                <span style={{ color: '#333', marginLeft: 8 }}>
                  ({summary.total} races together)
                </span>
              </div>

              <div style={{
                height: 8, background: '#0a0a0c',
                borderRadius: 4, overflow: 'hidden',
                display: 'flex', marginBottom: 6,
              }}>
                <div style={{
                  width: `${(summary.d1Wins / summary.total) * 100}%`,
                  background: colorA,
                  transition: 'width 0.8s ease',
                }} />
                <div style={{
                  flex: 1, background: colorB, opacity: 0.7,
                }} />
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9, color: '#333',
              }}>
                <span style={{ color: colorA }}>
                  {driverA} {Math.round((summary.d1Wins/summary.total)*100)}%
                </span>
                <span style={{ color: colorB }}>
                  {driverB} {Math.round((summary.d2Wins/summary.total)*100)}%
                </span>
              </div>

              {/* Race by race H2H */}
              <div style={{
                maxHeight: 280, overflowY: 'auto',
                marginTop: 14,
              }}>
                {[...h2h].reverse().map((race, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 0',
                    borderBottom: '1px solid #0a0a0a',
                  }}>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9, color: '#222', width: 32,
                    }}>
                      {race.year}
                    </div>
                    <div style={{ fontSize: 11, color: '#444', flex: 1 }}>
                      {race.race}
                    </div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12, fontWeight: 700,
                      color: race.d1Won ? '#4CAF50' : '#E10600',
                      width: 28, textAlign: 'center',
                    }}>
                      P{race.d1Pos}
                    </div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9, color: '#222',
                    }}>
                      vs
                    </div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12, fontWeight: 700,
                      color: race.d1Won ? '#E10600' : '#4CAF50',
                      width: 28, textAlign: 'center',
                    }}>
                      P{race.d2Pos}
                    </div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9,
                      color: race.d1Won ? '#4CAF50' : '#E10600',
                      width: 70, textAlign: 'right',
                    }}>
                      {race.d1Won ? `${driverA} ↑` : `${driverB} ↑`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent form chart */}
          {chartData.length > 1 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-label">
                RECENT FINISHING POSITIONS (lower = better)
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}
                  margin={{ top: 8, right: 16, bottom: 8, left: -20 }}>
                  <XAxis
                    dataKey="race"
                    tick={{ fill: '#444', fontSize: 9,
                           fontFamily: 'JetBrains Mono, monospace' }}
                  />
                  <YAxis reversed domain={[1, 22]}
                    tick={{ fill: '#444', fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#141414',
                      border: '1px solid #2A2A2A',
                      borderRadius: 8,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 11,
                    }}
                    formatter={(v, name) => [`P${v}`, name]}
                  />
                  <Legend
                    wrapperStyle={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                    }}
                  />
                  <Line type="monotone" dataKey={driverA}
                    stroke={colorA} strokeWidth={2}
                    dot={{ fill: colorA, r: 3 }} connectNulls />
                  <Line type="monotone" dataKey={driverB}
                    stroke={colorB} strokeWidth={2}
                    dot={{ fill: colorB, r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent form tables side by side */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}>
            {[
              { drv: driverA, stats: d1Stats, color: colorA },
              { drv: driverB, stats: d2Stats, color: colorB },
            ].map(({ drv, stats, color }) => (
              <div key={drv} className="card">
                <div className="card-label">{drv} — LAST 10 RACES</div>
                <table className="race-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>CIRCUIT</th>
                      <th>GRID</th>
                      <th>FINISH</th>
                      <th>PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.recentForm || []).map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 11, color: '#555' }}>
                          {(row.circuit || '').substring(0, 8)}
                        </td>
                        <td style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          color: '#444',
                        }}>
                          P{row.grid}
                        </td>
                        <td style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          color: row.finish <= 3 ? '#4CAF50' : '#fff',
                          fontWeight: row.finish <= 3 ? 700 : 400,
                        }}>
                          P{row.finish}
                        </td>
                        <td style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          color: '#555',
                        }}>
                          {row.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}