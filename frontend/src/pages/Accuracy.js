import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { useAccuracy } from '../hooks/useAPI';

export default function Accuracy() {
  const { data, loading, error } = useAccuracy();

  if (loading) return <div className="loading">LOADING ACCURACY DATA...</div>;
  if (error)   return <div className="page"><div className="error-msg">Error: {error}</div></div>;
  if (!data)   return <div className="page"><div className="error-msg">No accuracy data. Run backfill.py first.</div></div>;

  const { summary, races } = data;

  const chartData = (races || []).map(r => ({
    name:    (r.Race || '').replace(' Grand Prix', '').replace(' GP', ''),
    overlap: Number(r.PodiumOverlap) || 0,
    correct: r.WinnerCorrect === 1 || r.WinnerCorrect === 'True' || r.WinnerCorrect === true ? 1 : 0,
  }));

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-eyebrow">MODEL PERFORMANCE</div>
        <h1 className="page-title">Accuracy Report</h1>
        <p className="page-subtitle">
          How our predictions compare to actual race results
        </p>
      </div>

      {/* Summary stats */}
      <motion.div
        className="accuracy-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="stat-box">
          <div className="stat-box-value">{summary?.winnerAccuracy || '--'}</div>
          <div className="stat-box-label">WINNER ACCURACY</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-value">{summary?.avgPodiumOverlap || '--'}/3</div>
          <div className="stat-box-label">AVG PODIUM OVERLAP</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-value">{summary?.totalRaces || '--'}</div>
          <div className="stat-box-label">RACES TRACKED</div>
        </div>
      </motion.div>

      {/* Podium overlap chart */}
      <div className="card">
        <div className="card-label">Podium Overlap Per Race (out of 3)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            />
            <YAxis
              domain={[0, 3]}
              ticks={[0, 1, 2, 3]}
              tick={{ fill: '#666', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: '#141414',
                border: '1px solid #2A2A2A',
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#C8C8C8' }}
              itemStyle={{ color: '#E10600' }}
            />
            <Bar dataKey="overlap" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.overlap === 3 ? '#4CAF50' : entry.overlap === 2 ? '#E10600' : entry.overlap === 1 ? '#FF8000' : '#333'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Race-by-race breakdown */}
      <div className="card">
        <div className="card-label">Race-by-Race Breakdown</div>
        <table className="race-table">
          <thead>
            <tr>
              <th>RND</th>
              <th>RACE</th>
              <th>PREDICTED</th>
              <th>ACTUAL</th>
              <th>WINNER</th>
              <th>PODIUM</th>
            </tr>
          </thead>
          <tbody>
            {(races || []).map((race, i) => {
              const correct = race.WinnerCorrect === 1 ||
                              race.WinnerCorrect === 'True' ||
                              race.WinnerCorrect === true;
              return (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <td style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--muted)',
                  }}>
                    {String(race.Round || i + 1).padStart(2, '0')}
                  </td>
                  <td>{(race.Race || '').replace(' Grand Prix', ' GP')}</td>
                  <td style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontSize: '16px',
                    fontWeight: 700,
                  }}>
                    {race.PredictedWinner || '--'}
                  </td>
                  <td style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: correct ? '#4CAF50' : 'var(--text)',
                  }}>
                    {race.ActualWinner || '--'}
                  </td>
                  <td>
                    <span className={`badge ${correct ? 'badge-correct' : 'badge-wrong'}`}>
                      {correct ? '✓ YES' : '✗ NO'}
                    </span>
                  </td>
                  <td style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                  }}>
                    {race.PodiumOverlap || 0}/3
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}