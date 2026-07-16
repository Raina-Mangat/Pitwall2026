export const TEAM_COLORS = {
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

export function getTeamColor(teamName) {
  return TEAM_COLORS[teamName] || '#666666';
}