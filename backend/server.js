const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = 5000;

// Allow React frontend to call this API
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────
// HELPER — read a CSV file and parse it into JSON
// Node has no built-in CSV parser so we do it manually
// ─────────────────────────────────────────────────────
function readCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw   = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.trim().split('\n');

  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row    = {};
    headers.forEach((header, i) => {
      const val = values[i]?.trim() ?? '';
      // Convert numbers automatically
      row[header] = isNaN(val) || val === '' ? val : Number(val);
    });
    return row;
  });
}

// ─────────────────────────────────────────────────────
// PATHS — where Python saves its files
// ─────────────────────────────────────────────────────
const PITWALL_ROOT = path.join(__dirname, '..');

const paths = {
  predictions:  path.join(PITWALL_ROOT, 'predictions'),
  results:      path.join(PITWALL_ROOT, 'results'),
  accuracyLog:  path.join(PITWALL_ROOT, 'model_accuracy_log.csv'),
  allPredLog:   path.join(PITWALL_ROOT, 'all_predictions_log.csv'),
  raceFeatures: path.join(PITWALL_ROOT, 'race_data_features.csv'),
};

// ─────────────────────────────────────────────────────
// ENDPOINT 1 — GET /api/predictions/next
// Returns the most recent/upcoming race prediction
// ─────────────────────────────────────────────────────
app.get('/api/predictions/next', (req, res) => {
  try {
    if (!fs.existsSync(paths.predictions)) {
      return res.status(404).json({ error: 'No predictions folder found' });
    }

    const files = fs.readdirSync(paths.predictions)
      .filter(f => f.endsWith('.csv'))
      .sort()
      .reverse();  // most recent round first

    if (files.length === 0) {
      return res.status(404).json({ error: 'No prediction files found' });
    }

    const latestFile = path.join(paths.predictions, files[0]);
    const data       = readCSV(latestFile);

    if (!data) {
      return res.status(500).json({ error: 'Failed to read prediction file' });
    }

    // Extract race name and round from filename e.g. "09_British_Grand_Prix_2026.csv"
    const parts     = files[0].replace('.csv', '').split('_');
    const round     = parseInt(parts[0]);
    const year      = parts[parts.length - 1];
    const raceName  = parts.slice(1, -1).join(' ');

    res.json({
      race:   raceName,
      round:  round,
      year:   parseInt(year),
      file:   files[0],
      drivers: data,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────
// ENDPOINT 2 — GET /api/predictions/:round
// Returns prediction for a specific round number
// Example: GET /api/predictions/8
// ─────────────────────────────────────────────────────
app.get('/api/predictions/:round', (req, res) => {
  try {
    const round = parseInt(req.params.round);

    if (isNaN(round)) {
      return res.status(400).json({ error: 'Round must be a number' });
    }

    if (!fs.existsSync(paths.predictions)) {
      return res.status(404).json({ error: 'No predictions folder found' });
    }

    const files = fs.readdirSync(paths.predictions)
      .filter(f => f.endsWith('.csv'));

    // Find file starting with the zero-padded round number e.g. "08_"
    const roundStr  = String(round).padStart(2, '0');
    const matchFile = files.find(f => f.startsWith(roundStr + '_'));

    if (!matchFile) {
      return res.status(404).json({
        error: `No prediction found for round ${round}`
      });
    }

    const data = readCSV(path.join(paths.predictions, matchFile));
    console.log("File:", matchFile);
console.log("Headers:", Object.keys(data[0]));
console.log("First row:", data[0]);

    if (!data) {
      return res.status(500).json({ error: 'Failed to read prediction file' });
    }

    const parts    = matchFile.replace('.csv', '').split('_');
    const year     = parts[parts.length - 1];
    const raceName = parts.slice(1, -1).join(' ');

    res.json({
      race:    raceName,
      round:   round,
      year:    parseInt(year),
      file:    matchFile,
      drivers: data,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────
// ENDPOINT 3 — GET /api/accuracy
// Returns model accuracy history across all logged races
// ─────────────────────────────────────────────────────
app.get('/api/accuracy', (req, res) => {
  try {
    const data = readCSV(paths.accuracyLog);

    if (!data) {
      return res.status(404).json({ error: 'Accuracy log not found' });
    }

    // Calculate summary stats
    const total          = data.length;
    const winnerCorrect  = data.filter(r => r.WinnerCorrect === 1 ||
                                           r.WinnerCorrect === true ||
                                           r.WinnerCorrect === 'True').length;
    const avgOverlap     = data.reduce((sum, r) => sum + Number(r.PodiumOverlap), 0) / total;

    res.json({
      summary: {
        totalRaces:         total,
        winnerCorrect:      winnerCorrect,
        winnerAccuracy:     `${Math.round((winnerCorrect / total) * 100)}%`,
        avgPodiumOverlap:   Math.round(avgOverlap * 100) / 100,
      },
      races: data,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────
// ENDPOINT 4 — GET /api/drivers/:abbreviation
// Returns a specific driver's form and history
// Example: GET /api/drivers/ANT
// ─────────────────────────────────────────────────────
app.get('/api/drivers/:abbreviation', (req, res) => {
  try {
    const drv = req.params.abbreviation.toUpperCase();

    const allData = readCSV(paths.raceFeatures);

    if (!allData) {
      return res.status(500).json({ error: 'Race data not found' });
    }

    const driverData = allData.filter(row => row.Abbreviation === drv);

    if (driverData.length === 0) {
      return res.status(404).json({ error: `Driver ${drv} not found` });
    }

    // Last 10 races for recent form
    const recent = driverData.slice(-10);

    // Career stats
    const podiums = driverData.filter(r => r.Position <= 3).length;
    const wins    = driverData.filter(r => r.Position === 1).length;

    res.json({
      driver:      drv,
      totalRaces:  driverData.length,
      wins:        wins,
      podiums:     podiums,
      winRate:     `${Math.round((wins / driverData.length) * 100)}%`,
      podiumRate:  `${Math.round((podiums / driverData.length) * 100)}%`,
      recentForm:  recent.map(r => ({
        year:     r.Year,
        circuit:  r.Circuit,
        grid:     r.GridPosition,
        finish:   r.Position,
        points:   r.Points,
      })),
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────
// ENDPOINT 5 — GET /api/races
// Returns list of all races with predictions available
// ─────────────────────────────────────────────────────
app.get('/api/races', (req, res) => {
  try {
    const predFiles   = fs.existsSync(paths.predictions)
      ? fs.readdirSync(paths.predictions).filter(f => f.endsWith('.csv')).sort()
      : [];

    const resultFiles = fs.existsSync(paths.results)
      ? fs.readdirSync(paths.results).filter(f => f.endsWith('.csv'))
      : [];

    const races = predFiles.map(f => {
      const parts    = f.replace('.csv', '').split('_');
      const round    = parseInt(parts[0]);
      const year     = parts[parts.length - 1];
      const raceName = parts.slice(1, -1).join(' ');

      const roundStr    = String(round).padStart(2, '0');
      const hasResult   = resultFiles.some(r => r.startsWith(roundStr + '_'));

      return {
        round:      round,
        name:       raceName,
        year:       parseInt(year),
        hasPrediction: true,
        hasResult:  hasResult,
        file:       f,
      };
    });

    res.json({ races });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────
// ROOT — confirms API is running
// ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name:      'PitWall API',
    version:   '1.0.0',
    status:    'running',
    endpoints: [
      'GET /api/predictions/next',
      'GET /api/predictions/:round',
      'GET /api/accuracy',
      'GET /api/drivers/:abbreviation',
      'GET /api/races',
    ],
  });
});
// ─────────────────────────────────────────
// ENDPOINT: GET /api/drivers/:abbreviation/sparkline
// Returns last 5 race finishing positions for a driver
// ─────────────────────────────────────────
app.get('/api/drivers/:abbreviation/sparkline', (req, res) => {
  try {
    const drv  = req.params.abbreviation.toUpperCase();
    const data = readCSV(paths.raceFeatures);

    if (!data) return res.status(500).json({ error: 'Data not found' });

    const driverRaces = data
      .filter(r => r.Abbreviation === drv && r.Position)
      .slice(-5)
      .map(r => ({
        circuit: (r.Circuit || '').substring(0, 3).toUpperCase(),
        position: Number(r.Position),
        year: Number(r.Year),
      }));

    res.json({ driver: drv, form: driverRaces });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// ENDPOINT: GET /api/drivers/all/sparklines
// Returns sparklines for ALL active drivers in one call
// Much faster than 22 individual requests
// ─────────────────────────────────────────
app.get('/api/drivers/all/sparklines', (req, res) => {
  try {
    const data = readCSV(paths.raceFeatures);
    if (!data) return res.status(500).json({ error: 'Data not found' });

    const ACTIVE = [
      'ANT','RUS','HAM','LEC','NOR','PIA','VER','HAD',
      'GAS','COL','OCO','BEA','LAW','LIN','ALB','SAI',
      'HUL','BOR','ALO','STR','PER','BOT',
    ];

    const result = {};
    for (const drv of ACTIVE) {
      result[drv] = data
        .filter(r => r.Abbreviation === drv && r.Position)
        .slice(-5)
        .map(r => ({
          circuit: (r.Circuit || '').substring(0, 3).toUpperCase(),
          position: Number(r.Position),
        }));
    }

    res.json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// ENDPOINT: GET /api/calendar
// Returns full 2026 season with predictions + results merged
// ─────────────────────────────────────────
app.get('/api/calendar', (req, res) => {
  try {
    const predFiles   = fs.existsSync(paths.predictions)
      ? fs.readdirSync(paths.predictions).filter(f => f.endsWith('.csv')).sort()
      : [];
    const resultFiles = fs.existsSync(paths.results)
      ? fs.readdirSync(paths.results).filter(f => f.endsWith('.csv')).sort()
      : [];
    const accData = fs.existsSync(paths.accuracyLog)
      ? readCSV(paths.accuracyLog) : [];

    const races = predFiles.map(f => {
      const parts    = f.replace('.csv','').split('_');
      const round    = parseInt(parts[0]);
      const year     = parseInt(parts[parts.length - 1]);
      const raceName = parts.slice(1,-1).join(' ');
      const roundStr = String(round).padStart(2,'0');

      const resultFile = resultFiles.find(r => r.startsWith(roundStr + '_'));
      const accRow     = (accData || []).find(a => parseInt(a.Round) === round);

      let predictedWinner = null;
      let actualWinner    = null;
      let winnerCorrect   = null;
      let podiumOverlap   = null;

      const predData = readCSV(path.join(paths.predictions, f));
      if (predData && predData.length > 0) {
        const sorted = predData.sort((a,b) =>
          Number(b.WinProbability) - Number(a.WinProbability)
        );
        predictedWinner = sorted[0]?.Abbreviation || null;
      }

      if (accRow) {
        actualWinner  = accRow.ActualWinner;
        winnerCorrect = accRow.WinnerCorrect === 'True' ||
                        accRow.WinnerCorrect === true ||
                        accRow.WinnerCorrect === 1;
        podiumOverlap = Number(accRow.PodiumOverlap);
      }

      return {
        round, raceName, year,
        hasPrediction:   true,
        hasResult:       !!resultFile,
        predictedWinner, actualWinner,
        winnerCorrect,   podiumOverlap,
      };
    });

    res.json({ races, total: races.length });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// ENDPOINT: GET /api/constructors/timeline
// Returns points per team per race for championship animation
// ─────────────────────────────────────────
app.get('/api/constructors/timeline', (req, res) => {
  try {
    const data = readCSV(paths.raceFeatures);
    if (!data) return res.status(500).json({ error: 'Data not found' });

    const data2026 = data.filter(r => Number(r.Year) === 2026);
    const rounds   = [...new Set(data2026.map(r => r.RaceName))];

    const teams = [
      'Mercedes','Ferrari','McLaren','Red Bull Racing',
      'Alpine','Racing Bulls','Haas F1 Team','Williams',
      'Audi','Aston Martin','Cadillac',
    ];

    const timeline = [];
    const cumPoints = {};
    teams.forEach(t => cumPoints[t] = 0);

    for (const raceName of rounds) {
      const raceRows = data2026.filter(r => r.RaceName === raceName);
      for (const row of raceRows) {
        const team = row.TeamName;
        if (teams.includes(team)) {
          cumPoints[team] = (cumPoints[team] || 0) + Number(row.Points || 0);
        }
      }
      timeline.push({
        race: raceName.replace(' Grand Prix','').replace(' GP',''),
        ...JSON.parse(JSON.stringify(cumPoints)),
      });
    }

    res.json({ timeline, teams });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// ENDPOINT: GET /api/strategy/:year/:round
// Returns tyre strategy for all drivers in a race
// Calls Python via child_process
// ─────────────────────────────────────────
const { exec } = require('child_process');

app.get('/api/strategy/:year/:round', (req, res) => {
  const { year, round } = req.params;
  const pythonPath = path.join(__dirname, '..', 'venv', 'Scripts', 'python.exe');
  const scriptPath = path.join(__dirname, '..', 'telemetry_api.py');

  exec(
    `"${pythonPath}" "${scriptPath}" strategy ${year} ${round}`,
    { maxBuffer: 5 * 1024 * 1024 },
    (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: stderr || error.message });
      }
      try {
        const result = JSON.parse(stdout);
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse Python output', raw: stdout });
      }
    }
  );
});

// ─────────────────────────────────────────
// ENDPOINT: GET /api/telemetry/:year/:round/:driver
// Returns lap telemetry for one driver
// ─────────────────────────────────────────
app.get('/api/telemetry/:year/:round/:driver', (req, res) => {
  const { year, round, driver } = req.params;
  const pythonPath = path.join(__dirname, '..', 'venv', 'Scripts', 'python.exe');
  const scriptPath = path.join(__dirname, '..', 'telemetry_api.py');

  exec(
    `"${pythonPath}" "${scriptPath}" telemetry ${year} ${round} ${driver}`,
    { maxBuffer: 10 * 1024 * 1024 },
    (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: stderr || error.message });
      }
      try {
        res.json(JSON.parse(stdout));
      } catch (e) {
        res.status(500).json({ error: 'Parse failed', raw: stdout.substring(0,500) });
      }
    }
  );
});

// ─────────────────────────────────────────
// ENDPOINT: GET /api/battle/:d1/:d2
// Extended with head-to-head race history
// ─────────────────────────────────────────
app.get('/api/battle/:d1/:d2', (req, res) => {
  try {
    const d1  = req.params.d1.toUpperCase();
    const d2  = req.params.d2.toUpperCase();
    const all = readCSV(paths.raceFeatures);
    if (!all) return res.status(500).json({ error: 'Data not found' });

    const d1data = all.filter(r => r.Abbreviation === d1);
    const d2data = all.filter(r => r.Abbreviation === d2);

    // Head to head races where both competed
    const h2h = [];
    for (const r1 of d1data) {
      const r2 = d2data.find(
        r => r.Year === r1.Year && r.RaceName === r1.RaceName
      );
      if (!r2 || !r1.Position || !r2.Position) continue;
      h2h.push({
        year:     Number(r1.Year),
        race:     (r1.RaceName || '').replace(' Grand Prix',' GP'),
        d1Pos:    Number(r1.Position),
        d2Pos:    Number(r2.Position),
        d1Won:    Number(r1.Position) < Number(r2.Position),
        d1Points: Number(r1.Points || 0),
        d2Points: Number(r2.Points || 0),
      });
    }

    const d1Wins = h2h.filter(r => r.d1Won).length;
    const d2Wins = h2h.length - d1Wins;

    // Career stats
    const stat = (arr) => ({
      races:      arr.length,
      wins:       arr.filter(r => Number(r.Position) === 1).length,
      podiums:    arr.filter(r => Number(r.Position) <= 3).length,
      winRate:    arr.length
        ? `${Math.round(arr.filter(r=>Number(r.Position)===1).length/arr.length*100)}%`
        : '0%',
      podiumRate: arr.length
        ? `${Math.round(arr.filter(r=>Number(r.Position)<=3).length/arr.length*100)}%`
        : '0%',
      avgFinish:  arr.length
        ? (arr.reduce((s,r)=>s+Number(r.Position||20),0)/arr.length).toFixed(1)
        : '—',
      recentForm: arr.slice(-10).map(r => ({
        year:    Number(r.Year),
        circuit: r.Circuit,
        grid:    Number(r.GridPosition),
        finish:  Number(r.Position),
        points:  Number(r.Points||0),
      })),
    });

    res.json({
      d1, d2,
      d1Stats:  stat(d1data),
      d2Stats:  stat(d2data),
      h2h:      h2h.slice(-20),
      h2hSummary: { total: h2h.length, d1Wins, d2Wins },
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nPitWall API running on http://localhost:${PORT}`);
});