import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip
} from 'recharts';
import { getCircuitProfile } from '../utils/circuitProfiles';

export default function CircuitDNA({ location }) {
  const profile = getCircuitProfile(location);

  const data = [
    { axis: 'POWER',    value: profile.power },
    { axis: 'QUALI',    value: profile.qualifying },
    { axis: 'OVERTAKE', value: profile.overtaking },
    { axis: 'TYRE DEG', value: profile.tyreDeg },
    { axis: 'WET',      value: profile.wetSensitivity },
  ];

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="card-label">CIRCUIT DNA — {location?.toUpperCase()}</div>

      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="#1a1a1a" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{
              fill: '#444',
              fontSize: 9,
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '1px',
            }}
          />
          <Radar
            name="Circuit"
            dataKey="value"
            stroke="#E10600"
            fill="#E10600"
            fillOpacity={0.15}
            strokeWidth={1.5}
          />
          <Tooltip
            contentStyle={{
              background: '#141414',
              border: '1px solid #2A2A2A',
              borderRadius: '6px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
            }}
            formatter={(value) => [`${value}/100`, '']}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {(profile.characteristics || []).map(c => (
          <div key={c} style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9px',
            color: '#444',
            border: '1px solid #1a1a1a',
            borderRadius: '3px',
            padding: '2px 7px',
          }}>
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}