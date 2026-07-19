import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, ResponsiveContainer, YAxis
} from 'recharts';
import axios from 'axios';
import CircuitDNA from '../components/CircuitDNA';
import ChampionshipRace from '../components/ChampionshipRace';

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
  'Sauber':          '#C0392B',
  'Cadillac':        '#DDDDDD',
  'Racing Bulls':    '#6692FF',
};

function getTeamColor(team) {
  return TEAM_COLORS[team] || '#666';
}

// ── Start lights component ─────────────────────────────────────
function StartLights({ onGo }) {
  const [lit, setLit]   = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setLit(step);
      if (step >= 5) {
        clearInterval(iv);
        setTimeout(() => {
          setGone(true);
          onGo && onGo();
        }, 700);
      }
    }, 320);
    return () => clearInterval(iv);
  }, [onGo]);

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          background: '#0c0c0e',
          border: '1px solid #1a1a1a',
          borderRadius: 6,
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          {[0,1].map(j => (
            <div key={j} style={{
              width: 13, height: 13,
              borderRadius: '50%',
              background: gone ? '#040406' : lit >= i ? '#E10600' : '#0e0000',
              border: `1px solid ${gone ? '#111' : lit >= i ? '#ff2200' : '#1e0000'}`,
              boxShadow: !gone && lit >= i ? '0 0 8px #E10600cc' : 'none',
              transition: 'all 0.1s',
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Countdown timer ────────────────────────────────────────────
function Countdown({ raceDate }) {
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const calc = () => {
      const now  = new Date();
      const race = new Date(raceDate);
      const diff = race - now;
      if (diff <= 0) return setTimeLeft({ done: true });
      setTimeLeft({
        days:    Math.floor(diff / (1000*60*60*24)),
        hours:   Math.floor((diff / (1000*60*60)) % 24),
        minutes: Math.floor((diff / (1000*60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [raceDate]);

  if (timeLeft.done) return (
    <div style={{
      fontFamily: 'Barlow Condensed, sans-serif',
      fontSize: 16, fontWeight: 800,
      color: '#E10600', letterSpacing: 2,
    }}>
      RACE IN PROGRESS
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      {[
        { val: timeLeft.days,    label: 'DAYS' },
        { val: timeLeft.hours,   label: 'HRS'  },
        { val: timeLeft.minutes, label: 'MIN'  },
        { val: timeLeft.seconds, label: 'SEC'  },
      ].map(({ val, label }) => (
        <div key={label} style={{
          background: '#060608',
          border: '1px solid #111',
          borderRadius: 6,
          padding: '6px 10px',
          textAlign: 'center',
          minWidth: 44,
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 20, fontWeight: 800,
            color: '#fff', lineHeight: 1,
          }}>
            {String(val ?? '--').padStart(2, '0')}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 8, color: '#333',
            letterSpacing: '1px', marginTop: 3,
          }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sparkline ──────────────────────────────────────────────────
function Sparkline({ data = [], color = '#666' }) {
  if (!data || data.length < 2) return <div style={{ width: 56, height: 22 }} />;
  const chartData = data.map(d => ({ v: d.position }));
  const trend = data[data.length-1].position - data[0].position;
  const c = trend < 0 ? '#4CAF50' : trend > 0 ? '#E10600' : '#555';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <ResponsiveContainer width={56} height={22}>
        <LineChart data={chartData}>
          <YAxis domain={[1, 20]} reversed hide />
          <Line type="monotone" dataKey="v" stroke={c}
            strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9, color: c,
      }}>
        {trend < 0 ? '▲' : trend > 0 ? '▼' : '—'}
      </span>
    </div>
  );
}

// ── F1 Car SVG ─────────────────────────────────────────────────
function F1Car({ color = '#E10600' }) {
  return (
    <svg width="260" height="72" viewBox="0 0 260 72" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="38" height="5" rx="2" fill={color} opacity="0.8"/>
      <rect x="3" y="11" width="38" height="2" rx="1" fill="#1a1a1a"/>
      <rect x="3" y="4" width="3" height="14" rx="1" fill="#666"/>
      <rect x="38" y="4" width="3" height="14" rx="1" fill="#666"/>
      <path d="M35 52 L46 18 L155 14 L195 22 L220 38 L220 56 L35 56Z" fill={color}/>
      <path d="M35 52 L46 40 L220 42 L220 56 L35 56Z" fill={color} opacity="0.7"/>
      <path d="M55 56 L55 64 L170 64 L170 56Z" fill={color} opacity="0.8"/>
      <path d="M175 24 L248 42 L248 46 L175 46Z" fill={color}/>
      <path d="M243 42 L258 43 L258 45 L243 46Z" fill={color} opacity="0.7"/>
      <path d="M115 16 L128 6 L155 6 L166 16Z" fill="#0a0a0c"/>
      <path d="M118 16 Q141 3 163 16" fill="none" stroke="#555" strokeWidth="3.5" strokeLinecap="round"/>
      <rect x="140" y="5" width="4" height="10" rx="2" fill="#666"/>
      <path d="M118 14 L129 7 L154 7 L164 14Z" fill="#0a1828" opacity="0.85"/>
      <rect x="200" y="52" width="54" height="5" rx="2" fill={color} opacity="0.8"/>
      <rect x="204" y="57" width="46" height="3" rx="1" fill="#1a1a1a"/>
      <rect x="200" y="50" width="3" height="12" rx="1" fill="#666"/>
      <rect x="251" y="50" width="3" height="12" rx="1" fill="#666"/>
      <line x1="178" y1="44" x2="165" y2="56" stroke="#444" strokeWidth="2" strokeLinecap="round"/>
      <line x1="180" y1="48" x2="170" y2="58" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="60" cy="60" r="14" fill="#0a0a0c" stroke="#1a1a1a" strokeWidth="1.5"/>
      <circle cx="60" cy="60" r="9" fill="#141416"/>
      <circle cx="60" cy="60" r="3" fill={color}/>
      <circle cx="60" cy="60" r="12" fill="none" stroke="#1e1e1e" strokeWidth="2" strokeDasharray="4 3"/>
      <circle cx="186" cy="60" r="12" fill="#0a0a0c" stroke="#1a1a1a" strokeWidth="1.5"/>
      <circle cx="186" cy="60" r="8" fill="#141416"/>
      <circle cx="186" cy="60" r="2.5" fill={color}/>
      <circle cx="186" cy="60" r="10" fill="none" stroke="#1e1e1e" strokeWidth="2" strokeDasharray="3 3"/>
      <rect x="130" y="5" width="6" height="3" rx="1" fill="#0088ff" opacity="0.8"/>
    </svg>
  );
}

// ── Hero section ───────────────────────────────────────────────
function HeroSection({ race, round, location, raceDate, topDriver, topTeam, isReal }) {
  const [carGo, setCarGo]     = useState(false);
  const [showAnn, setShowAnn] = useState(false);
  const teamColor = getTeamColor(topTeam);

  const handleGo = useCallback(() => {
    setCarGo(true);
    setShowAnn(true);
    setTimeout(() => setShowAnn(false), 2200);
  }, []);

  return (
    <div style={{
      background: '#060608',
      borderBottom: '1px solid #0e0e0e',
      padding: '32px 32px 0',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Red top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg,transparent,#E10600,transparent)',
      }} />

      {/* ERS badge */}
      <div style={{
        position: 'absolute', top: 14, left: 20,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9, letterSpacing: '1.5px',
        color: '#4CAF50', border: '1px solid #4CAF5033',
        background: '#4CAF5008',
        padding: '3px 8px', borderRadius: 3, zIndex: 5,
      }}>
        ⚡ ERS ACTIVE
      </div>

      {/* Round badge */}
      <div style={{
        position: 'absolute', top: 14, right: 20,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9, color: '#333', letterSpacing: '1px',
        textAlign: 'right', zIndex: 5,
      }}>
        ROUND {round}
        <div style={{ color: '#E10600', fontSize: 13, fontWeight: 500 }}>
          2026
        </div>
      </div>

      {/* Main hero content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: 32,
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Left — logo + lights */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 58, fontWeight: 900,
              letterSpacing: 8, color: '#fff',
              lineHeight: 1,
            }}
          >
            PIT<span style={{ color: '#E10600' }}>WALL</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10, letterSpacing: '3px',
              color: '#2a2a2a', marginTop: 6, marginBottom: 20,
            }}
          >
            F1 RACE INTELLIGENCE · ML PREDICTIONS · LIVE DATA
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <StartLights onGo={handleGo} />
          </motion.div>

          <AnimatePresence>
            {showAnn && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontSize: 18, fontWeight: 800,
                  letterSpacing: 4, color: '#E10600',
                  marginTop: 12,
                }}
              >
                LIGHTS OUT AND AWAY WE GO
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right — race card */}
        <div style={{
          background: '#0e0e10',
          border: '1px solid #1a1a1a',
          borderRadius: 10,
          padding: 16,
          alignSelf: 'start',
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9, color: '#E10600',
            letterSpacing: '2px', marginBottom: 8,
          }}>
            NEXT RACE · ROUND {round}
          </div>
          <div style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 22, fontWeight: 800,
            color: '#fff', letterSpacing: 1,
          }}>
            {race?.toUpperCase() || 'BELGIAN GP'}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, color: '#333', marginTop: 4,
          }}>
            {location?.toUpperCase()}
          </div>
          {raceDate && <Countdown raceDate={raceDate} />}
          <div style={{
            marginTop: 10,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            color: isReal ? '#4CAF50' : '#2a2a2a',
            background: '#060608',
            border: isReal ? '1px solid #4CAF5033' : '1px solid #111',
            borderRadius: 4,
            padding: '3px 8px',
            display: 'inline-block',
          }}>
            {isReal ? '✓ REAL QUALIFYING GRID' : '~ PRE-QUALIFYING ESTIMATE'}
          </div>
        </div>
      </div>

      {/* Car track */}
      <div style={{
        position: 'relative', height: 100,
        marginTop: 12, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', bottom: 28,
          left: 0, right: 0, height: 1,
          background: '#0f0f0f',
        }} />
        <div style={{
          position: 'absolute', bottom: 24,
          left: 0, right: 0, height: 1,
          background: 'repeating-linear-gradient(90deg,transparent,transparent 20px,#111 20px,#111 40px)',
        }} />

        {/* Speed streaks */}
        {carGo && (
          <div style={{
            position: 'absolute', bottom: 35, right: '44%',
            display: 'flex', flexDirection: 'column', gap: 4,
            opacity: 0.6,
          }}>
            {[150, 90, 120, 70].map((w, i) => (
              <div key={i} style={{
                width: w, height: 1,
                marginLeft: i % 2 === 0 ? 0 : 20,
                background: 'linear-gradient(90deg,transparent,#1c1c1e,transparent)',
              }} />
            ))}
          </div>
        )}

        <motion.div
          initial={{ left: '-280px' }}
          animate={carGo ? { left: 'calc(100% + 40px)' } : { left: '-280px' }}
          transition={{ duration: 2.2, ease: [0.15, 0.5, 0.35, 1] }}
          style={{
            position: 'absolute', bottom: 26,
            filter: `drop-shadow(0 4px 12px ${teamColor}33)`,
          }}
        >
          <F1Car color={teamColor} />
        </motion.div>
      </div>

      {/* Info chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6 }}
        style={{
          display: 'flex', gap: 10,
          justifyContent: 'center',
          padding: '14px 0',
          borderTop: '1px solid #0e0e0e',
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: 'ACCURACY',  value: '82.1%' },
          { label: 'RECALL',    value: '93%' },
          { label: 'FEATURES',  value: '16' },
          { label: 'SEASONS',   value: '2021–2026' },
          { label: 'MODEL',     value: 'GBM v3' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, color: '#2a2a2a',
            letterSpacing: '1px',
            border: '1px solid #111',
            borderRadius: 4, padding: '4px 12px',
          }}>
            {label} <span style={{ color: '#E10600' }}>{value}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Driver row ─────────────────────────────────────────────────
function DriverRow({ driver, index, maxWin, sparkline }) {
  const [barW, setBarW] = useState(0);
  const color  = getTeamColor(driver.Team || driver.TeamName);
  const winPct = Math.round((driver.WinProbability || 0) * 100);
  const podPct = Math.round((driver.PodiumProbability || 0) * 100);
  const top3   = index < 3;
  const hasDNF = (driver.DNFRisk || 0) > 0.12;

  useEffect(() => {
    const t = setTimeout(
      () => setBarW((winPct / (maxWin * 100)) * 100),
      80 + index * 55
    );
    return () => clearTimeout(t);
  }, [winPct, maxWin, index]);

  const posColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

  return (
    <motion.div
      className={`driver-row ${top3 ? `podium-${index + 1}` : ''}`}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 44px 56px 1fr 72px 80px',
        alignItems: 'center',
        gap: 10,
        padding: '11px 14px',
        borderRadius: 8,
        background: '#0a0a0c',
        border: `1px solid transparent`,
        borderLeft: top3 ? `2px solid ${posColors[index]}` : '2px solid transparent',
        marginBottom: 2,
      }}
    >
      {/* Position */}
      <div style={{
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: 16, fontWeight: 800,
        color: posColors[index] || '#333',
        textAlign: 'center',
      }}>
        {index < 3 ? ['①','②','③'][index] : index + 1}
      </div>

      {/* Driver code */}
      <div>
        <div style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 18, fontWeight: 800,
          color: color, letterSpacing: 1,
        }}>
          {driver.Abbreviation}
        </div>
        <div style={{ fontSize: 9, color: '#333', marginTop: 1 }}>
          {(driver.Team || driver.TeamName || '').replace(' Racing', '')}
          {hasDNF && (
            <span style={{
              marginLeft: 4,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 8, color: '#FF6B35',
              border: '1px solid #FF6B35',
              padding: '0 3px', borderRadius: 2,
            }}>!</span>
          )}
        </div>
      </div>

      {/* Sparkline */}
      <Sparkline data={sparkline || []} color={color} />

      {/* Probability bar */}
      <div>
        <div style={{
          height: 5, background: '#111',
          borderRadius: 3, overflow: 'hidden',
          marginBottom: 4,
        }}>
          <div style={{
            width: `${barW}%`, height: '100%',
            background: `linear-gradient(90deg,${color}88,${color})`,
            borderRadius: 3,
            transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, color: '#2a2a2a',
        }}>
          Podium {podPct}% · P{driver.GridPosition}
          {' · '}
          <span style={{ color: '#333' }}>
            ☀{driver['Dry_Win%'] || 0}% 🌧{driver['Wet_Win%'] || 0}%
          </span>
        </div>
      </div>

      {/* Win % */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 20, fontWeight: 500, color: '#fff',
        }}>
          {winPct}%
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 8, color: '#2a2a2a',
        }}>
          WIN PROB
        </div>
      </div>

      {/* Grid pos */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, color: '#333',
        }}>
          P{driver.GridPosition}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Predictor page ────────────────────────────────────────
export default function Predictor() {
  const [data,       setData]       = useState(null);
  const [sparklines, setSparklines] = useState({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${BASE}/api/predictions/next`),
      axios.get(`${BASE}/api/drivers/all/sparklines`),
    ])
      .then(([pred, spark]) => {
        setData(pred.data);
        setSparklines(spark.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading">LOADING RACE DATA...</div>
  );
  if (error) return (
    <div className="page">
      <div className="error-msg">
        API Error: {error}. Is your backend running on port 5000?
      </div>
    </div>
  );
  if (!data) return (
    <div className="page">
      <div className="error-msg">
        No prediction data. Run pipeline.py first.
      </div>
    </div>
  );

  const drivers = data.drivers || [];
  const sorted  = [...drivers].sort(
    (a,b) => (b.WinProbability||0) - (a.WinProbability||0)
  );
  const maxWin  = sorted[0]?.WinProbability || 1;
  const top3    = sorted.slice(0, 3);
 console.log(JSON.stringify(drivers[0], null, 2));
console.log("RealGrid:", drivers[0]?.RealGrid);
console.log("Type:", typeof drivers[0]?.RealGrid);
  const isReal = ["true", "1", "yes"].includes(
  String(drivers[0]?.RealGrid).toLowerCase()
);
  const topTeam = sorted[0]?.Team || sorted[0]?.TeamName || '';

  // Detect race date — try to build from available data
  const raceDate = data.raceDate || null;

  return (
    <div style={{ minHeight: '100vh', background: '#060608' }}>

      {/* ── HERO ── */}
      <HeroSection
        race={data.race}
        round={data.round}
        location={drivers[0]?.Circuit || ''}
        raceDate={raceDate}
        topDriver={sorted[0]?.Abbreviation}
        topTeam={topTeam}
        isReal={isReal}
      />

      {/* ── MAIN CONTENT ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: 1,
        background: '#0e0e0e',
      }}>

        {/* ── LEFT: driver list ── */}
        <div style={{ background: '#060608', padding: 24 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9, letterSpacing: '2px', color: '#2a2a2a',
            marginBottom: 14, paddingBottom: 8,
            borderBottom: '1px solid #0e0e0e',
          }}>
            WIN PROBABILITY — {(data.race || '').toUpperCase()} · ALL DRIVERS
          </div>

          <div>
            {sorted.map((driver, i) => (
              <DriverRow
                key={driver.Abbreviation}
                driver={driver}
                index={i}
                maxWin={maxWin}
                sparkline={sparklines[driver.Abbreviation]}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT: sidebar ── */}
        <div style={{ background: '#060608', padding: 24 }}>

          {/* Predicted podium */}
          <div className="card">
            <div className="card-label">PREDICTED PODIUM</div>
            {top3.map((driver, i) => {
              const tc = getTeamColor(driver.Team || driver.TeamName);
              return (
                <motion.div
                  key={driver.Abbreviation}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 + 0.3 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 0',
                    borderBottom: i < 2 ? '1px solid #0e0e0e' : 'none',
                  }}
                >
                  <span style={{ fontSize: 18 }}>
                    {['🥇','🥈','🥉'][i]}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontSize: 22, fontWeight: 800, color: tc,
                    }}>
                      {driver.Abbreviation}
                    </div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9, color: '#333',
                    }}>
                      {driver.Team || driver.TeamName}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontSize: 28, fontWeight: 800, color: '#fff',
                    }}>
                      {Math.round((driver.WinProbability||0)*100)}%
                    </div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 8, color: '#2a2a2a',
                    }}>
                      WIN PROB
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Weather */}
          <div className="card">
            <div className="card-label">RACE DAY FORECAST</div>
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 24, fontWeight: 800, color: '#fff',
              margin: '8px 0',
            }}>
              {(drivers[0]?.WetRace === 1) ? '🌧 WET' : '☀️ DRY'}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8, marginTop: 8,
            }}>
              {[
                { label: 'TEMP',  value: `${drivers[0]?.TempC || '--'}°C` },
                { label: 'RAIN',  value: `${drivers[0]?.RainMM || 0}mm` },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: '#0a0a0c',
                  borderRadius: 6, padding: 10,
                }}>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 9, color: '#2a2a2a', letterSpacing: '1px',
                  }}>
                    {label}
                  </div>
                  <div style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontSize: 22, fontWeight: 800, color: '#fff',
                    marginTop: 4,
                  }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DNF risk */}
          {sorted.some(d => (d.DNFRisk||0) > 0.12) && (
            <div className="card">
              <div className="card-label">DNF RISK FLAGS</div>
              {sorted.filter(d => (d.DNFRisk||0) > 0.12).map(driver => (
                <div key={driver.Abbreviation} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '7px 0',
                  borderBottom: '1px solid #0a0a0a',
                }}>
                  <div style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontSize: 16, fontWeight: 700,
                    color: getTeamColor(driver.Team || driver.TeamName),
                  }}>
                    {driver.Abbreviation}
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 9,
                    color: '#FF6B35',
                    border: '1px solid #FF6B35',
                    padding: '2px 7px', borderRadius: 3,
                  }}>
                    {Math.round((driver.DNFRisk||0)*100)}% DNF
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Model confidence */}
          <div className="card">
            <div className="card-label">MODEL CONFIDENCE</div>
            {[
              { label: 'ACCURACY',      value: '82.1%' },
              { label: 'RECALL',        value: '93%'   },
              { label: 'BRIER SCORE',   value: '0.117' },
              { label: 'TRAINING DATA', value: '2021–2026' },
              { label: 'FEATURES',      value: '16' },
              { label: 'ALGORITHM',     value: 'GBM + CALIBRATION' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 0',
                borderBottom: '1px solid #0a0a0a',
              }}>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9, color: '#2a2a2a', letterSpacing: '1px',
                }}>
                  {label}
                </div>
                <div style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontSize: 16, fontWeight: 700, color: '#fff',
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── CIRCUIT DNA ── */}
      <div style={{ padding: '24px 24px 0' }}>
        <CircuitDNA location={
          data?.drivers?.[0]?.Circuit ||
          'Spa-Francorchamps'
        } />
      </div>

      {/* ── CHAMPIONSHIP RACE ── */}
      <div style={{ padding: '0 24px 24px' }}>
        <ChampionshipRace />
      </div>

    </div>
  );
}