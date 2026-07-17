import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from 'recharts';
import axios from 'axios';

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

export default function ChampionshipRace() {
  const [timeline, setTimeline]   = useState([]);
  const [teams, setTeams]         = useState([]);
  const [frame, setFrame]         = useState(0);
  const [playing, setPlaying]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const intervalRef               = useRef(null);

  useEffect(() => {
    (axios.get('https://pitwall2026.onrender.com/api/constructors/timeline'))
      .then(r => {
        setTimeline(r.data.timeline || []);
        setTeams(r.data.teams || []);
        setFrame((r.data.timeline || []).length - 1);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (playing) {
      setFrame(0);
      intervalRef.current = setInterval(() => {
        setFrame(f => {
          if (f >= timeline.length - 1) {
            setPlaying(false);
            clearInterval(intervalRef.current);
            return timeline.length - 1;
          }
          return f + 1;
        });
      }, 600);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, timeline.length]);

  if (loading) return (
    <div className="card">
      <div className="card-label">CONSTRUCTOR CHAMPIONSHIP</div>
      <div className="loading">LOADING...</div>
    </div>
  );

  if (timeline.length === 0) return null;

  const currentFrame = timeline[frame] || {};
  const chartData    = teams
    .map(team => ({ team, points: Number(currentFrame[team] || 0) }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 8);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="card-label" style={{ marginBottom: 0 }}>
          CONSTRUCTOR CHAMPIONSHIP RACE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px', color: '#E10600',
          }}>
            {currentFrame.race || `R${frame + 1}`}
          </div>
          <button
            onClick={() => setPlaying(p => !p)}
            style={{
              background: playing ? '#1a0000' : '#E10600',
              border: 'none', color: '#fff',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px', letterSpacing: '1px',
              padding: '4px 12px', borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {playing ? '⏸ PAUSE' : '▶ PLAY'}
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 60, right: 40, top: 0, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="team"
            tick={{
              fill: '#555',
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
            }}
            width={55}
          />
          <Tooltip
            contentStyle={{
              background: '#141414',
              border: '1px solid #2A2A2A',
              borderRadius: '6px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
            }}
            formatter={(v) => [`${v} pts`, '']}
          />
          <Bar dataKey="points" radius={[0,4,4,0]} isAnimationActive={true}>
            {chartData.map((entry) => (
              <Cell
                key={entry.team}
                fill={TEAM_COLORS[entry.team] || '#444'}
              />
            ))}
            <LabelList
              dataKey="points"
              position="right"
              style={{
                fill: '#666',
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Progress scrubber */}
      <input
        type="range"
        min={0}
        max={timeline.length - 1}
        value={frame}
        onChange={e => setFrame(Number(e.target.value))}
        style={{
          width: '100%',
          marginTop: 12,
          accentColor: '#E10600',
        }}
      />
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '9px',
        color: '#333',
        marginTop: 4,
      }}>
        <span>R1</span>
        <span>R{timeline.length}</span>
      </div>
    </div>
  );
}