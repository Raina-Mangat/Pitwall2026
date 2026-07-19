import pandas as pd
import numpy as np
import joblib
import requests
import fastf1
import warnings
from datetime import datetime, timedelta
warnings.filterwarnings('ignore')
import os

cache_dir = os.environ.get("FASTF1_CACHE", "cache")
os.makedirs(cache_dir, exist_ok=True)
fastf1.Cache.enable_cache(cache_dir)

# ─────────────────────────────────────────────────────────────────
# CIRCUIT COORDINATES for weather API
# ─────────────────────────────────────────────────────────────────
CIRCUIT_COORDS = {
    'Spielberg':          (47.2197,  14.7647),
    'Silverstone':        (52.0786,  -1.0169),
    'Spa-Francorchamps':  (50.4372,   5.9714),
    'Budapest':           (47.5789,  19.2486),
    'Zandvoort':          (52.3888,   4.5409),
    'Monza':              (45.6156,   9.2811),
    'Baku':               (40.3725,  49.8533),
    'Marina Bay':         ( 1.2914, 103.8640),
    'Austin':             (30.1328, -97.6411),
    'Mexico City':        (19.4042, -99.0907),
    'São Paulo':         (-23.7036, -46.6997),
    'Las Vegas':          (36.1147,-115.1728),
    'Lusail':             (25.4900,  51.4542),
    'Yas Island':         (24.4672,  54.6031),
    'Melbourne':         (-37.8497, 144.9680),
    'Shanghai':           (31.3389, 121.2197),
    'Suzuka':             (34.8431, 136.5410),
    'Miami':              (25.9581, -80.2389),
    'Montréal':           (45.5048, -73.5251),
    'Barcelona':          (41.5700,   2.2611),
    'Monte Carlo':        (43.7347,   7.4206),
    'Madrid':             (40.4168,  -3.7038),
}

# ─────────────────────────────────────────────────────────────────
# ACTIVE 2026 DRIVERS — fallback grid if FastF1 returns nothing
# ─────────────────────────────────────────────────────────────────
ACTIVE_2026 = [
    'ANT','RUS',   # Mercedes
    'HAM','LEC',   # Ferrari
    'NOR','PIA',   # McLaren
    'VER','HAD',   # Red Bull Racing
    'GAS','COL',   # Alpine
    'OCO','BEA',   # Haas
    'LAW','LIN',   # Racing Bulls
    'ALB','SAI',   # Williams
    'HUL','BOR',   # Audi
    'ALO','STR',   # Aston Martin
    'PER','BOT',   # Cadillac
]

FALLBACK_TEAMS = {
    'ANT':'Mercedes',   'RUS':'Mercedes',
    'HAM':'Ferrari',    'LEC':'Ferrari',
    'NOR':'McLaren',    'PIA':'McLaren',
    'VER':'Red Bull Racing', 'HAD':'Red Bull Racing',
    'GAS':'Alpine',     'COL':'Alpine',
    'OCO':'Haas F1 Team','BEA':'Haas F1 Team',
    'LAW':'Racing Bulls','LIN':'Racing Bulls',
    'ALB':'Williams',   'SAI':'Williams',
    'HUL':'Audi',       'BOR':'Audi',
    'ALO':'Aston Martin','STR':'Aston Martin',
    'PER':'Cadillac',   'BOT':'Cadillac',
}

# ─────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────
def safe_get(df, col, condition, default=None):
    """Safely get a value from a filtered DataFrame — never crashes."""
    try:
        filtered = df[condition]
        if len(filtered) == 0:
            return default
        val = filtered[col].values[0]
        return default if pd.isna(val) else val
    except Exception:
        return default


def make_fallback_grid(df, race_info):
    """
    Build an estimated grid when qualifying data is unavailable.
    Priority: last known finishing order from this season → uniform grid.
    """
    season_rows = df[df['Year'] == race_info['year']].copy()

    if len(season_rows) > 0:
        last_pos = (
            season_rows.sort_values('Year')
            .groupby('Abbreviation')
            .last()
            .reset_index()
            [['Abbreviation', 'TeamName', 'Position']]
            .rename(columns={'Position': 'GridPosition'})
            .dropna(subset=['GridPosition'])
            .sort_values('GridPosition')
            .reset_index(drop=True)
        )
        last_pos['GridPosition'] = range(1, len(last_pos) + 1)
        print(f"Estimated grid from last race — {len(last_pos)} drivers")
        return last_pos, False

    # Absolute fallback: uniform grid in ACTIVE_2026 order
    print("No season data found — using uniform fallback grid")
    fallback = pd.DataFrame({
        'Abbreviation': ACTIVE_2026,
        'TeamName':     [FALLBACK_TEAMS.get(d, 'Unknown') for d in ACTIVE_2026],
        'GridPosition': range(1, len(ACTIVE_2026) + 1),
    })
    return fallback, False


# ─────────────────────────────────────────────────────────────────
# STEP 1 — AUTO-DETECT NEXT RACE
# ─────────────────────────────────────────────────────────────────
def get_next_race(year=2026):
    print("Fetching 2026 race schedule...")
    try:
        schedule = fastf1.get_event_schedule(year, include_testing=False)
    except Exception as e:
        print(f"Failed to fetch schedule ({e})")
        return None

    today = pd.Timestamp.now(tz='UTC').tz_localize(None)
    upcoming = schedule[
        pd.to_datetime(schedule['EventDate']) >= today - timedelta(days=1)
    ]

    if len(upcoming) == 0:
        print("Season complete — no more races in 2026.")
        return None

    next_event = upcoming.iloc[0]
    race_day   = pd.to_datetime(next_event['EventDate'])

    print(f"\nNext race: {next_event['EventName']}")
    print(f"  Location: {next_event['Location']}")
    print(f"  Race day: {race_day.strftime('%Y-%m-%d')}")

    return {
        'name':     next_event['EventName'],
        'round':    int(next_event['RoundNumber']),
        'location': next_event['Location'],
        'race_day': race_day,
        'year':     year,
    }


# ─────────────────────────────────────────────────────────────────
# STEP 2 — AUTO-FETCH QUALIFYING GRID
# ─────────────────────────────────────────────────────────────────
def get_qualifying_grid(race_info, df):
    print(f"\nFetching qualifying grid for Round {race_info['round']}...")
    try:
        quali = fastf1.get_session(
            race_info['year'], race_info['round'], 'Q'
        )
        quali.load(telemetry=False, weather=False, messages=False)

        # Guard: quali.results could be empty or missing columns
        if quali.results is None or len(quali.results) == 0:
            raise ValueError("Qualifying results DataFrame is empty")

        required_cols = {'Abbreviation', 'Position', 'TeamName'}
        if not required_cols.issubset(quali.results.columns):
            raise ValueError(f"Missing columns: {required_cols - set(quali.results.columns)}")

        grid = (
            quali.results[['Abbreviation', 'Position', 'TeamName']]
            .rename(columns={'Position': 'GridPosition'})
            .dropna(subset=['GridPosition', 'Abbreviation'])
            .sort_values('GridPosition')
            .reset_index(drop=True)
        )

        # Guard: after dropping NaN, could still be empty
        if len(grid) == 0:
            raise ValueError("Grid empty after dropping NaN positions")

        grid['GridPosition'] = grid['GridPosition'].astype(int)

        # Guard: filter to known active drivers only
        grid = grid[grid['Abbreviation'].isin(ACTIVE_2026)].reset_index(drop=True)
        if len(grid) == 0:
            raise ValueError("No active 2026 drivers found in qualifying results")

        print(f"Real qualifying grid loaded — {len(grid)} drivers")
        print(f"  Pole: {grid.iloc[0]['Abbreviation']} "
              f"({grid.iloc[0]['TeamName']})")
        return grid, True

    except Exception as e:
        print(f"Qualifying not available yet ({e})")
        return make_fallback_grid(df, race_info)


# ─────────────────────────────────────────────────────────────────
# STEP 3 — AUTO-FETCH WEATHER
# ─────────────────────────────────────────────────────────────────
def get_race_weather(race_info):
    lat, lon = CIRCUIT_COORDS.get(race_info['location'], (48.0, 10.0))
    race_date = race_info['race_day'].strftime('%Y-%m-%d')

    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&daily=precipitation_sum,temperature_2m_max,windspeed_10m_max"
            f"&start_date={race_date}&end_date={race_date}"
            f"&timezone=auto"
        )
        r = requests.get(url, timeout=5)
        r.raise_for_status()
        data = r.json().get('daily', {})

        # Guard: API could return empty or malformed daily block
        if not data or 'precipitation_sum' not in data:
            raise ValueError("Weather API returned incomplete data")

        rain_mm  = data['precipitation_sum'][0]
        temp_c   = data['temperature_2m_max'][0]
        wind_kmh = data['windspeed_10m_max'][0]

        # Guard: any value could be None if forecast not available yet
        rain_mm  = float(rain_mm)  if rain_mm  is not None else 0.0
        temp_c   = float(temp_c)   if temp_c   is not None else 22.0
        wind_kmh = float(wind_kmh) if wind_kmh is not None else 0.0

        wet_flag = 1 if rain_mm > 2.0 else 0
        print(f"\nWeather for {race_info['name']} ({race_date}):")
        print(f"  Rain: {rain_mm}mm | Temp: {temp_c}C | Wind: {wind_kmh}km/h")
        print(f"  Condition: {'WET' if wet_flag else 'DRY'}")
        return wet_flag, rain_mm, temp_c

    except Exception as e:
        print(f"Weather fetch failed ({e}) — assuming dry 22C")
        return 0, 0.0, 22.0


# ─────────────────────────────────────────────────────────────────
# STEP 4 — GENERATE PREDICTION
# ─────────────────────────────────────────────────────────────────
def generate_prediction(race_info, grid, df, model, wet_flag, temp_c):

    df_active = df[df['Abbreviation'].isin(ACTIVE_2026)].copy()

    stat_cols = [
        'DriverForm3', 'DriverForm5', 'QualifyingForm3', 'TeamForm',
        'PodiumRate', 'WinRate', 'DNFRisk', 'PointsMomentum',
        'Consistency', 'Experience',
    ]

    # Guard: only keep stat_cols that actually exist in df
    stat_cols = [c for c in stat_cols if c in df_active.columns]

    latest_stats = (
        df_active.sort_values('Year')
        .groupby('Abbreviation')[stat_cols]
        .last()
        .reset_index()
    )

    circuit_history = (
        df_active[df_active['Circuit'] == race_info['location']]
        .groupby('Abbreviation')['CircuitHistory']
        .last()
        .reset_index()
    )

    pred_df = grid.merge(latest_stats, on='Abbreviation', how='left')
    pred_df = pred_df.merge(circuit_history, on='Abbreviation', how='left')

    # Fill all missing values safely
    fill_defaults = {
        'DriverForm3': 10.5, 'DriverForm5': 10.5, 'QualifyingForm3': 10.5,
        'TeamForm': 5.0, 'PodiumRate': 0.0, 'WinRate': 0.0,
        'DNFRisk': 0.10, 'PointsMomentum': 0.0, 'Consistency': 10.5,
        'Experience': 0.0, 'CircuitHistory': 10.5,
    }
    for col, val in fill_defaults.items():
        if col not in pred_df.columns:
            pred_df[col] = val  # column missing entirely — create it
        else:
            pred_df[col] = pred_df[col].fillna(val)

    # ── FIX 1: Override TeamForm with verified 2026 season data ─────
    # Historical TeamForm from training data reflects 2021-2024 eras.
    # Replace with real 2026 constructor standings so TeamGridInteraction
    # (the most important feature at 34%) uses accurate current data.
    team_form_2026 = {
        'Mercedes':        18.7,
        'Ferrari':         15.0,
        'McLaren':         10.1,
        'Red Bull Racing':  6.4,
        'Alpine':           4.3,
        'Racing Bulls':     2.7,
        'Haas F1 Team':     1.5,
        'Williams':         0.8,
        'Audi':             0.1,
        'Aston Martin':     0.1,
        'Cadillac':         0.0,
    }
    team_col = 'TeamName' if 'TeamName' in pred_df.columns else 'Team'
    if team_col in pred_df.columns:
        pred_df['TeamForm'] = pred_df[team_col].map(team_form_2026).fillna(
            pred_df['TeamForm']
        )
        # Recompute TeamGridInteraction with corrected TeamForm
        pred_df['TeamGridInteraction'] = (
            pred_df['TeamForm'] / (pred_df['GridPosition'] + 1)
        )

    # Cap Cadillac — historical data from RBR/Mercedes is irrelevant
    cadillac = ['PER', 'BOT']
    pred_df.loc[pred_df['Abbreviation'].isin(cadillac),
                ['PodiumRate', 'WinRate', 'PointsMomentum', 'CircuitHistory']] = \
        [0.0, 0.0, 0.0, 18.0]

    # Verstappen: dominant-era stats still over-inflated — reduce
    pred_df.loc[pred_df['Abbreviation'] == 'VER', 'PodiumRate'] *= 0.45
    pred_df.loc[pred_df['Abbreviation'] == 'VER', 'WinRate']    *= 0.30

    # Derived features
    pred_df['GridPositionSq']      = pred_df['GridPosition'] ** 2
    pred_df['FrontRow']            = (pred_df['GridPosition'] <= 2).astype(int)
    pred_df['TopFive']             = (pred_df['GridPosition'] <= 5).astype(int)
    pred_df['TeamGridInteraction'] = pred_df['TeamForm'] / \
                                      (pred_df['GridPosition'] + 1)

    X = pd.DataFrame({
        'GridPosition':        pred_df['GridPosition'],
        'GridPositionSq':      pred_df['GridPositionSq'],
        'FrontRow':            pred_df['FrontRow'],
        'TopFive':             pred_df['TopFive'],
        'TeamGridInteraction': pred_df['TeamGridInteraction'],
        'DriverForm3':         pred_df['DriverForm3'],
        'DriverForm5':         pred_df['DriverForm5'],
        'QualifyingForm3':     pred_df['QualifyingForm3'],
        'TeamForm':            pred_df['TeamForm'],
        'CircuitHistory':      pred_df['CircuitHistory'],
        'PodiumRate':          pred_df['PodiumRate'],
        'WinRate':             pred_df['WinRate'],
        'DNFRisk':             pred_df['DNFRisk'],
        'PointsMomentum':      pred_df['PointsMomentum'],
        'Consistency':         pred_df['Consistency'],
        'Experience':          pred_df['Experience'],
    }).fillna(0)

    podium_probs = model.predict_proba(X)[:, 1]

    # ── FIX 2: Hard cap backmarker probabilities ──────────────────
    # The model still gives backmarkers unrealistically high podium
    # chances because their historical data (ALO in Renault/Alpine
    # peak years, HUL in top-10 teams) inflates their stats.
    # These caps reflect 2026 reality — none of these cars can podium.
    hard_cap = {
        'ALO': 0.02,   # Aston Martin nowhere in 2026
        'STR': 0.01,
        'HUL': 0.01,   # Audi backmarker
        'BOR': 0.01,
        'PER': 0.01,   # Cadillac — 0 points in 2026
        'BOT': 0.01,
        'ALB': 0.02,   # Williams — limited pace
        'SAI': 0.02,
        'OCO': 0.03,   # Haas — occasionally points, not podium
    }
    for i, row in pred_df.reset_index(drop=True).iterrows():
        if row['Abbreviation'] in hard_cap:
            podium_probs[i] = min(podium_probs[i], hard_cap[row['Abbreviation']])

    # Wet bonuses
    wet_bonuses = {
        'HAM': +0.08, 'ALO': +0.06, 'VER': +0.05, 'RUS': +0.03,
        'NOR': +0.02, 'LEC': +0.02, 'ANT': +0.00, 'PIA': -0.01,
    }
    dry_probs = podium_probs.copy()
    wet_probs = podium_probs.copy()
    for i, row in pred_df.reset_index(drop=True).iterrows():
        bonus = wet_bonuses.get(row['Abbreviation'], -0.01)
        wet_probs[i] = np.clip(podium_probs[i] + bonus, 0, 1)

    final_probs = wet_probs if wet_flag else dry_probs
    rel_factor  = 1 - pred_df['DNFRisk'].values
    rel_adj     = final_probs * rel_factor

    def sharpen(probs, temp=0.55):
        s = np.power(np.clip(probs, 1e-10, 1), 1 / temp)
        return s / s.sum()

    pred_df['WinProbability']    = sharpen(rel_adj)
    pred_df['PodiumProbability'] = final_probs
    pred_df['Dry_Win%']          = (sharpen(dry_probs * rel_factor) * 100).round(1)
    pred_df['Wet_Win%']          = (sharpen(wet_probs * rel_factor) * 100).round(1)

    return pred_df.sort_values(
        'WinProbability', ascending=False
    ).reset_index(drop=True)


# ─────────────────────────────────────────────────────────────────
# STEP 5 — DISPLAY PREDICTION
# ─────────────────────────────────────────────────────────────────
def display_prediction(result, race_info, is_real_grid, wet_flag, temp_c, rain_mm):
    condition = "WET" if wet_flag else "DRY"
    grid_note = ("REAL QUALIFYING GRID" if is_real_grid
                 else "PRE-QUALIFYING ESTIMATE (rerun after Saturday for accuracy)")

    print(f"\n{'='*72}")
    print(f"  PitWall — {race_info['name']} {race_info['year']}  [{condition}]")
    print(f"  {race_info['location']} | Round {race_info['round']}")
    print(f"  {temp_c}°C | Rain: {rain_mm}mm | Grid: {grid_note}")
    print(f"{'='*72}")
    print(f"\n  {'Pos':<4} {'Driver':<6} {'Team':<18} {'Grid':<6} "
          f"{'Podium%':<9} {'Win%':<7} {'Dry%':<7} {'Wet%'}")
    print(f"  {'-'*70}")

    medals = {0: '🥇', 1: '🥈', 2: '🥉'}
    for i, row in result.iterrows():
        pos_str = medals.get(i, f"  P{i+1}")
        bar     = '█' * int(row['WinProbability'] * 35)
        dnf_w   = ' ⚠️' if row['DNFRisk'] > 0.12 else ''
        team    = row.get('Team', row.get('TeamName', '?'))
        print(f"  {pos_str} {row['Abbreviation']:<6} "
              f"{team:<18} "
              f"P{int(row['GridPosition']):<5} "
              f"{row['PodiumProbability']:.0%}      "
              f"{row['WinProbability']:.0%}    "
              f"{row['Dry_Win%']}%   "
              f"{row['Wet_Win%']}%  "
              f"{bar}{dnf_w}")

    print(f"\n  🏆 PREDICTED PODIUM:")
    for i, (_, row) in enumerate(result.head(3).iterrows()):
        team = row.get('Team', row.get('TeamName', '?'))
        print(f"     {['🥇','🥈','🥉'][i]} {row['Abbreviation']} ({team}) "
              f"— {row['WinProbability']:.0%} "
              f"[dry: {row['Dry_Win%']}% | wet: {row['Wet_Win%']}%]")

    high_dnf = result[result['DNFRisk'] > 0.12]
    if len(high_dnf) > 0:
        print(f"\n  ⚠️  DNF RISK (>12%):")
        for _, row in high_dnf.iterrows():
            print(f"     {row['Abbreviation']}: {row['DNFRisk']:.0%}")


# ─────────────────────────────────────────────────────────────────
# STEP 6 — SAVE PREDICTION + APPEND TO MASTER LOG
# ─────────────────────────────────────────────────────────────────
def save_prediction(result, race_info, is_real_grid, wet_flag, temp_c, rain_mm):
    os.makedirs('predictions', exist_ok=True)

    slug = (race_info['name']
            .replace(' ', '_')
            .replace("'", "")
            .replace('/', ''))
    filename = f"predictions/{race_info['round']:02d}_{slug}_{race_info['year']}.csv"
    result["RealGrid"] = is_real_grid
    result.to_csv(filename, index=False)
    print(f"\nSaved: {filename}")

    log = result.copy()
    log['Race']        = race_info['name']
    log['Round']       = race_info['round']
    log['Year']        = race_info['year']
    log['Circuit']     = race_info['location']
    log['PredictedAt'] = datetime.now().strftime('%Y-%m-%d %H:%M')
    log['RealGrid']    = is_real_grid
    log['WetRace']     = wet_flag
    log['TempC']       = temp_c
    log['RainMM']      = rain_mm

    master = 'all_predictions_log.csv'
    if os.path.exists(master):
        log.to_csv(master, mode='a', header=False, index=False)
    else:
        log.to_csv(master, mode='w', header=True, index=False)
    print(f"Appended to {master}")

    return filename


# ─────────────────────────────────────────────────────────────────
# STEP 7 — AUTO-SAVE ACTUAL RESULT
# ─────────────────────────────────────────────────────────────────
def save_actual_result(race_info):
    print(f"\nFetching actual race result for Round {race_info['round']}...")
    try:
        session = fastf1.get_session(
            race_info['year'], race_info['round'], 'R'
        )
        session.load(telemetry=False, weather=False, messages=False)

        # Guard: session.results could be None or empty
        if session.results is None or len(session.results) == 0:
            print("Race result not yet available — results DataFrame is empty")
            return None

        required = {'Abbreviation', 'TeamName', 'GridPosition', 'Position', 'Points'}
        if not required.issubset(session.results.columns):
            missing = required - set(session.results.columns)
            print(f"Race result missing columns: {missing}")
            return None

        result = session.results[list(required)].copy()

        # Guard: Position column might be all NaN (race not started)
        if result['Position'].isna().all():
            print("Race result not yet available — all positions are NaN")
            return None

        result['Race']  = race_info['name']
        result['Round'] = race_info['round']
        result['Year']  = race_info['year']

        os.makedirs('results', exist_ok=True)
        slug = race_info['name'].replace(' ', '_').replace("'", "")
        filename = f"results/{race_info['round']:02d}_{slug}_{race_info['year']}.csv"
        result.to_csv(filename, index=False)
        print(f"Actual result saved: {filename}")

        # Guard: podium rows might not exist yet
        podium = result[result['Position'] <= 3].sort_values('Position')
        if len(podium) == 0:
            print("No podium positions found in result data yet")
        else:
            print("\nPodium:")
            for _, row in podium.iterrows():
                print(f"  P{int(row['Position'])}: {row['Abbreviation']} "
                      f"({row['TeamName']})")

        return result

    except Exception as e:
        print(f"Race result not yet available ({e})")
        return None


# ─────────────────────────────────────────────────────────────────
# STEP 8 — COMPARE PREDICTION VS RESULT
# ─────────────────────────────────────────────────────────────────
def compare_prediction_vs_result(race_info):
    slug = race_info['name'].replace(' ', '_').replace("'", "")
    pred_file   = f"predictions/{race_info['round']:02d}_{slug}_{race_info['year']}.csv"
    result_file = f"results/{race_info['round']:02d}_{slug}_{race_info['year']}.csv"

    if not os.path.exists(pred_file):
        print(f"Cannot compare — prediction file not found: {pred_file}")
        return
    if not os.path.exists(result_file):
        print(f"Cannot compare — result file not found: {result_file}")
        return

    pred   = pd.read_csv(pred_file)
    actual = pd.read_csv(result_file)

    # Guard: prediction file could be empty
    if len(pred) == 0:
        print("Cannot compare — prediction file is empty")
        return

    # Guard: actual result might have no finished positions yet
    actual_podium_rows = actual[actual['Position'] <= 3]
    if len(actual_podium_rows) == 0:
        print("Cannot compare — no finishers in result file yet (race may not be done)")
        return

    # Guard: winner row might not exist
    winner_rows = actual[actual['Position'] == 1]
    if len(winner_rows) == 0:
        print("Cannot compare — no P1 found in result file")
        return

    pred_top3   = set(pred.head(3)['Abbreviation'].tolist())
    actual_top3 = set(actual_podium_rows['Abbreviation'].tolist())

    pred_winner   = pred.iloc[0]['Abbreviation']
    actual_winner = winner_rows['Abbreviation'].values[0]  # safe — checked above

    correct_winner = pred_winner == actual_winner
    podium_overlap = len(pred_top3 & actual_top3)

    print(f"\n--- Accuracy Report: {race_info['name']} ---")
    print(f"Predicted podium: {pred_top3}")
    print(f"Actual podium:    {actual_top3}")
    print(f"Podium overlap:   {podium_overlap}/3 correct")
    print(f"Winner correct:   {'✅ YES' if correct_winner else '❌ NO'} "
          f"(predicted {pred_winner}, actual {actual_winner})")

    accuracy_row = pd.DataFrame([{
        'Race':            race_info['name'],
        'Round':           race_info['round'],
        'Year':            race_info['year'],
        'PredictedWinner': pred_winner,
        'ActualWinner':    actual_winner,
        'WinnerCorrect':   correct_winner,
        'PodiumOverlap':   podium_overlap,
        'PredictedPodium': str(pred_top3),
        'ActualPodium':    str(actual_top3),
    }])

    acc_file = 'model_accuracy_log.csv'
    if os.path.exists(acc_file):
        accuracy_row.to_csv(acc_file, mode='a', header=False, index=False)
    else:
        accuracy_row.to_csv(acc_file, mode='w', header=True, index=False)
    print(f"Accuracy logged to {acc_file}")


# ─────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────
def main():
    print("=" * 50)
    print("  PitWall Automated Race Prediction Pipeline")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 50)

    # Safety checks
    for f in ['pitwall_model_v3.pkl', 'race_data_features.csv']:
        if not os.path.exists(f):
            print(f"ERROR: {f} not found. Run train_model.py first.")
            return

    model = joblib.load('pitwall_model_v3.pkl')
    df    = pd.read_csv('race_data_features.csv')
    print("\nModel and data loaded")

    # Step 1: detect next race
    race_info = get_next_race(year=2026)
    if race_info is None:
        return

    # Step 2: get qualifying grid
    grid, is_real_grid = get_qualifying_grid(race_info, df)

    # Guard: if grid is somehow still empty, stop here
    if len(grid) == 0:
        print("ERROR: Could not build any grid — aborting prediction.")
        return

    # Step 3: get weather
    wet_flag, rain_mm, temp_c = get_race_weather(race_info)

    # Step 4: generate prediction
    result = generate_prediction(race_info, grid, df, model, wet_flag, temp_c)

    # Guard: if prediction returned empty DataFrame
    if len(result) == 0:
        print("ERROR: Prediction returned empty results — aborting.")
        return

    # Step 5: display
    display_prediction(result, race_info, is_real_grid, wet_flag, temp_c, rain_mm)

    # Step 6: save
    save_prediction(result, race_info, is_real_grid, wet_flag, temp_c, rain_mm)

    # Step 7: try to fetch actual result
    actual = save_actual_result(race_info)

    # Step 8: compare if result available
    if actual is not None and len(actual) > 0:
        compare_prediction_vs_result(race_info)

    print("\n✅ Pipeline complete.")


if __name__ == '__main__':
    main()