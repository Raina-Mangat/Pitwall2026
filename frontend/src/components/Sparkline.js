import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

export default function Sparkline({ data = [], color = '#E10600' }) {
  if (!data || data.length === 0) {
    return <div style={{ width: 60, height: 24 }} />;
  }

  const chartData = data.map(d => ({ pos: d.position }));
  const trend = data.length >= 2
    ? data[data.length-1].position - data[0].position
    : 0;

  // trend < 0 means improving (lower position number = better)
  const lineColor = trend < 0 ? '#4CAF50' : trend > 0 ? '#E10600' : '#666';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <ResponsiveContainer width={60} height={24}>
        <LineChart data={chartData}>
          <YAxis domain={[1, 20]} reversed hide />
          <Line
            type="monotone"
            dataKey="pos"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '9px',
        color: lineColor,
      }}>
        {trend < 0 ? '↑' : trend > 0 ? '↓' : '→'}
      </span>
    </div>
  );
}