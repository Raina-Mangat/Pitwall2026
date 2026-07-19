import fastf1
import pandas as pd
import numpy as np
import joblib
import requests
import os
import warnings
from datetime import datetime
warnings.filterwarnings('ignore')

fastf1.Cache.enable_cache('cache')

# ─────────────────────────────────────────────────────────────────
# AUTO-DETECT ALL COMPLETED RACES FROM FASTF1 SCHEDULE
# No hardcoded list — finds every race that has already happened
# ─────────────────────────────────────────────────────────────────

def get_completed_races(year=2026):
    print(f"Fetching {year} race schedule...")
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    today    = pd.Timestamp.now()

    completed = []
    for _, event in schedule.iterrows():
        race_date = pd.to_datetime(event['EventDate'])
        # Race is completed if race day has passed
        if race_date < today:
            completed.append({
                'round':    int(event['RoundNumber']),
                'name':     event['EventName'],
                'location': event['Location'],
                'race_day': race_date,
                'year':     year,
            })

    print(f"Found {len(completed)} completed races in {year}")
    for r in completed:
        print(f"  R{r['round']:02d} — {r['name']} ({r['race_day'].strftime('%Y-%m-%d')})")
    return completed

# ─────────────────────────────────────────────────────────────────
# CIRCUIT COORDINATES for weather API
# ─────────────────────────────────────────────────────────────────
CIRCUIT_COORDS = {
    'Spielberg':         (47.2197,  14.7647),
    'Silverstone':       (52.0786,  -1.0169),
    'Spa-Francorchamps': (50.4372,   5.9714),
    'Budapest':          (47.5789,  19.2486),
    'Zandvoort':         (52.3888,   4.5409),
    'Monza':             (45.6156,   9.2811),
    'Baku':              (40.3725,  49.8533),
    'Marina Bay':         (1.2914, 103.8640),
    'Austin':            (30.1328, -97.6411),
    'Mexico City':       (19.4042, -99.0907),
    'Sao Paulo':        (-23.7036, -46.6997),
    'Las Vegas':         (36.1147,-115.1728),
    'Lusail':            (25.4900,  51.4542),
    'Yas Island':        (24.4672,  54.6031),
    'Melbourne':        (-37.8497, 144.9680),
    'Shanghai':          (31.3389, 121.2197),
    'Suzuka':            (34.8431, 136.5410),
    'Miami':             (25.9581, -80.2389),
    'Montreal':          (45.5048, -73.5251),
    'Barcelona':         (41.5700,   2.2611),
    'Monte Carlo':       (43.7347,   7.4206),
}

# ─────────────────────────────────────────────────────────────────
# WEATHER — historical data works for past dates on Open-Meteo
# ─────────────────────────────────────────────────────────────────
def get_historical_weather(race_info):
    try:
        lat, lon  = CIRCUIT_COORDS.get(race_info['location'], (50.0, 10.0))
        race_date = race_info['race_day'].strftime('%Y-%m-%d')
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            "&daily=precipitation_sum,temperature_2m_max,windspeed_10m_max"
            f"&start_date={race_date}&end_date={race_date}"
            "&timezone=auto"
        )
        r    = requests.get(url, timeout=5)
        data = r.json()['daily']
        rain_mm  = data['precipitation_sum'][0]
        temp_c   = data['temperature_2m_max'][0]
        wet_flag = 1 if rain_mm > 2.0 else 0
        return wet_flag, rain_mm, temp_c
    except Exception as e:
        print(f"  Weather fetch failed ({e}) — using dry defaults")
        return 0, 0.0, 22.0

# ─────────────────────────────────────────────────────────────────
# QUALIFYING GRID — fetch real qualifying from FastF1
# ─────────────────────────────────────────────────────────────────
def get_qualifying_grid(race_info, df):
    try:
        quali = fastf1.get_session(
            race_info['year'], race_info['round'], 'Q'
        )
        quali.load(telemetry=False, weather=False, messages=False)
        grid = (
            quali.results[['Abbreviation', 'TeamName', 'Position']]
            .rename(columns={'Position': 'GridPosition', 'TeamName': 'Team'})
            .dropna(subset=['GridPosition'])
            .sort_values('GridPosition')
            .reset_index(drop=True)
        )
        grid['GridPosition'] = grid['GridPosition'].astype(int)
        print(f"  Qualifying grid loaded — pole: {grid.iloc[0]['Abbreviation']}")
        return grid, True
    except Exception as e:
        print(f"  Qualifying not available ({e}) — using last race order")
        last = (
            df[df['Year'] == race_info['year']]
            .sort_values('Year')
            .groupby('Abbreviation')
            .last()
            .reset_index()
            [['Abbreviation', 'TeamName', 'Position']]
            .rename(columns={'Position': 'GridPosition', 'TeamName': 'Team'})
            .sort_values('GridPosition')
            .reset_index(drop=True)
        )
        last['GridPosition'] = range(1, len(last) + 1)
        return last, False

# ─────────────────────────────────────────────────────────────────
# GENERATE PREDICTION
# ─────────────────────────────────────────────────────────────────
def generate_prediction(race_info, grid, df, model, wet_flag, temp_c):
    ACTIVE_2026 = [
        'ANT','RUS','HAM','LEC','NOR','PIA','VER','HAD',
        'GAS','COL','OCO','BEA','LAW','LIN','ALB','SAI',
        'HUL','BOR','ALO','STR','PER','BOT',
    ]
    df_active = df[df['Abbreviation'].isin(ACTIVE_2026)].copy()

    stat_cols = [
        'DriverForm3','DriverForm5','QualifyingForm3','TeamForm',
        'PodiumRate','WinRate','DNFRisk','PointsMomentum',
        'Consistency','Experience'
    ]
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

    fill_defaults = {
        'DriverForm3':10.5,'DriverForm5':10.5,'QualifyingForm3':10.5,
        'TeamForm':5.0,'PodiumRate':0.0,'WinRate':0.0,
        'DNFRisk':0.10,'PointsMomentum':0.0,'Consistency':10.5,
        'Experience':0.0,'CircuitHistory':10.5,
    }
    for col, val in fill_defaults.items():
        pred_df[col] = pred_df[col].fillna(val)

    team_form_2026 = {
        'Mercedes':18.7,'Ferrari':15.0,'McLaren':10.1,
        'Red Bull Racing':6.4,'Alpine':4.3,'Racing Bulls':2.7,
        'Haas F1 Team':1.5,'Williams':0.8,
        'Audi':0.1,'Aston Martin':0.1,'Cadillac':0.0,
    }
    pred_df['TeamForm'] = pred_df['Team'].map(team_form_2026).fillna(1.0)

    cadillac = ['PER','BOT']
    pred_df.loc[pred_df['Abbreviation'].isin(cadillac),
                ['PodiumRate','WinRate','PointsMomentum',
                 'CircuitHistory','Consistency']] = [0.0,0.0,0.0,18.0,15.0]

    pred_df['GridPositionSq']      = pred_df['GridPosition'] ** 2
    pred_df['FrontRow']            = (pred_df['GridPosition'] <= 2).astype(int)
    pred_df['TopFive']             = (pred_df['GridPosition'] <= 5).astype(int)
    pred_df['TeamGridInteraction'] = pred_df['TeamForm'] / (pred_df['GridPosition'] + 1)

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

    hard_cap = {
        'ALO':0.02,'STR':0.01,'HUL':0.01,
        'BOR':0.01,'PER':0.01,'BOT':0.01,
    }
    for i, row in pred_df.reset_index(drop=True).iterrows():
        if row['Abbreviation'] in hard_cap:
            podium_probs[i] = min(podium_probs[i], hard_cap[row['Abbreviation']])

    wet_bonuses = {
        'HAM':+0.08,'ALO':+0.06,'VER':+0.05,'RUS':+0.03,
        'NOR':+0.02,'LEC':+0.02,'ANT':+0.00,'PIA':-0.01,
    }
    dry_probs = podium_probs.copy()
    wet_probs = podium_probs.copy()
    for i, row in pred_df.reset_index(drop=True).iterrows():
        bonus = wet_bonuses.get(row['Abbreviation'], -0.01)
        wet_probs[i] = np.clip(podium_probs[i] + bonus, 0, 1)

    final_probs = wet_probs if wet_flag else dry_probs
    rel_factor  = 1 - pred_df['DNFRisk'].values
    rel_adj     = final_probs * rel_factor

    TEMPERATURE = 0.55
    def sharpen(probs, temp):
        s = np.power(np.clip(probs, 1e-10, 1), 1/temp)
        return s / s.sum()

    pred_df['WinProbability']    = sharpen(rel_adj, TEMPERATURE)
    pred_df['PodiumProbability'] = final_probs
    pred_df['Dry_Win%']          = (sharpen(dry_probs * rel_factor, TEMPERATURE) * 100).round(1)
    pred_df['Wet_Win%']          = (sharpen(wet_probs * rel_factor, TEMPERATURE) * 100).round(1)

    return pred_df.sort_values('WinProbability', ascending=False).reset_index(drop=True)

# ─────────────────────────────────────────────────────────────────
# SAVE PREDICTION
# ─────────────────────────────────────────────────────────────────
def save_prediction(result, race_info, is_real_grid, wet_flag, temp_c, rain_mm):
    os.makedirs('predictions', exist_ok=True)
    slug     = race_info['name'].replace(' ','_').replace("'",'').replace('/','')
    filename = f"predictions/{race_info['round']:02d}_{slug}_{race_info['year']}.csv"

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

    result.to_csv(filename, index=False)
    print(f"  Prediction saved: {filename}")

    master = 'all_predictions_log.csv'
    if os.path.exists(master):
        log.to_csv(master, mode='a', header=False, index=False)
    else:
        log.to_csv(master, mode='w', header=True, index=False)

    return filename

# ─────────────────────────────────────────────────────────────────
# SAVE ACTUAL RESULT
# ─────────────────────────────────────────────────────────────────
def save_actual_result(race_info):
    try:
        session = fastf1.get_session(
            race_info['year'],
            race_info['round'],
            'R'
        )
        session.load(
            telemetry=False,
            weather=False,
            messages=False
        )

        result = session.results[
            ['Abbreviation', 'TeamName', 'GridPosition', 'Position', 'Points']
        ].copy()

        result['Race'] = race_info['name']
        result['Round'] = race_info['round']
        result['Year'] = race_info['year']

        os.makedirs('results', exist_ok=True)

        slug = race_info['name'].replace(' ', '_').replace("'", "")
        filename = (
            f"results/{race_info['round']:02d}_{slug}_{race_info['year']}.csv"
        )

        result.to_csv(filename, index=False)

        # DEBUG
        print(result[['Abbreviation', 'Position']].head(10))

        result["Position"] = pd.to_numeric(
            result["Position"],
            errors="coerce"
        )

        winner_row = result[result["Position"] == 1]

        if winner_row.empty:
            winner = "Unknown"
        else:
            winner = winner_row.iloc[0]["Abbreviation"]
            print("\n===== DEBUG =====")
            print(result[["Abbreviation", "Position"]].head(10))
            print("Winner:", winner)


        print(f"Result saved — Winner: {winner}")

        return result, winner

    except Exception as e:
        print(f"Race result not available ({e})")
        return None, None
# ─────────────────────────────────────────────────────────────────
# LOG ACCURACY — skip if already logged for this round
# ─────────────────────────────────────────────────────────────────
def log_accuracy(race_info, pred_result, actual_winner):
    if actual_winner is None or pred_result is None:
        return

    pred_top3   = set(pred_result.head(3)['Abbreviation'].tolist())
    pred_winner = pred_result.iloc[0]['Abbreviation']

    try:
        actual_result = pd.read_csv(
            f"results/{race_info['round']:02d}_{race_info['name'].replace(' ','_').replace(chr(39),'')}_"
            f"{race_info['year']}.csv"
        )
        actual_top3 = set(
            actual_result[actual_result['Position'] <= 3]['Abbreviation'].tolist()
        )
    except Exception:
        actual_top3 = set()

    winner_correct = pred_winner == actual_winner
    podium_overlap = len(pred_top3 & actual_top3)

    acc_file = 'model_accuracy_log.csv'

    # Check if already logged — don't duplicate
    if os.path.exists(acc_file):
        existing = pd.read_csv(acc_file)
        already  = (
            (existing['Round'].astype(int) == race_info['round']) &
            (existing['Year'].astype(int)  == race_info['year'])
        ).any()
        if already:
            print(f"  Accuracy already logged for Round {race_info['round']} — skipping")
            return

    row = pd.DataFrame([{
        'Race':            race_info['name'],
        'Round':           race_info['round'],
        'Year':            race_info['year'],
        'PredictedWinner': pred_winner,
        'ActualWinner':    actual_winner,
        'WinnerCorrect':   winner_correct,
        'PodiumOverlap':   podium_overlap,
        'PredictedPodium': str(pred_top3),
        'ActualPodium':    str(actual_top3),
    }])

    if os.path.exists(acc_file):
         existing = pd.read_csv(acc_file)
         existing = existing[
              ~(
            (existing["Round"] == race_info["round"]) &
            (existing["Year"] == race_info["year"])
        )
    ]
         updated = pd.concat([existing, row], ignore_index=True)
         updated.to_csv(acc_file, index=False)
    else:
        row.to_csv(acc_file, mode='w', header=True, index=False)

    status = '✓ CORRECT' if winner_correct else '✗ MISSED'
    print(f"  Accuracy logged: {status} | Podium: {podium_overlap}/3")

# ─────────────────────────────────────────────────────────────────
# CHECK IF RACE ALREADY PROCESSED
# Skip races that already have both prediction AND result
# ─────────────────────────────────────────────────────────────────
def is_already_processed(race_info):
    slug         = race_info['name'].replace(' ','_').replace("'",'')
    pred_file    = f"predictions/{race_info['round']:02d}_{slug}_{race_info['year']}.csv"
    result_file  = f"results/{race_info['round']:02d}_{slug}_{race_info['year']}.csv"
    acc_file     = 'model_accuracy_log.csv'

    has_pred   = os.path.exists(pred_file)
    has_result = os.path.exists(result_file)
    has_acc    = False

    if os.path.exists(acc_file):
        existing = pd.read_csv(acc_file)
        has_acc  = (
            (existing['Round'].astype(int) == race_info['round']) &
            (existing['Year'].astype(int)  == race_info['year'])
        ).any()

    return has_pred and has_result and has_acc

# ─────────────────────────────────────────────────────────────────
# MAIN — fully automated backfill
# ─────────────────────────────────────────────────────────────────
def main():
    print("="*60)
    print("  PitWall — Automated Backfill")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("="*60)

    # Load model and data
    if not os.path.exists('pitwall_model_v3.pkl'):
        print("ERROR: pitwall_model_v3.pkl not found. Run train_model.py first.")
        return

    model = joblib.load('pitwall_model_v3.pkl')
    df    = pd.read_csv('race_data_features.csv')
    print(f"Model and data loaded ({len(df)} rows)")

    # Auto-detect all completed races
    completed_races = get_completed_races(year=2026)

    if not completed_races:
        print("No completed races found.")
        return

    summary = []

    for race_info in completed_races:
        print(f"\n{'─'*60}")
        print(f"R{race_info['round']:02d} — {race_info['name']}")
        print(f"{'─'*60}")

        # Skip if fully processed
        if is_already_processed(race_info) and race_info["round"] != 10:
            print(f"  Already fully processed — skipping")
            summary.append({
                'round': race_info['round'],
                'name':  race_info['name'],
                'status': 'SKIPPED'
            })
            continue

        # Weather
        wet_flag, rain_mm, temp_c = get_historical_weather(race_info)
        print(f"  Weather: {'WET' if wet_flag else 'DRY'} {temp_c}°C {rain_mm}mm rain")

        # Qualifying grid
        grid, is_real_grid = get_qualifying_grid(race_info, df)

        # Generate prediction
        try:
            result = generate_prediction(
                race_info, grid, df, model, wet_flag, temp_c
            )
            save_prediction(result, race_info, is_real_grid, wet_flag, temp_c, rain_mm)
        except Exception as e:
            print(f"  Prediction failed: {e}")
            summary.append({
                'round': race_info['round'],
                'name':  race_info['name'],
                'status': f'PRED FAILED: {e}'
            })
            continue

        # Actual result
        actual_result, actual_winner = save_actual_result(race_info)

        # Log accuracy
        if actual_winner:
            log_accuracy(race_info, result, actual_winner)

        summary.append({
            'round':  race_info['round'],
            'name':   race_info['name'],
            'pred':   result.iloc[0]['Abbreviation'],
            'actual': actual_winner or 'N/A',
            'status': 'DONE'
        })

    # Summary
    print(f"\n{'='*60}")
    print("  BACKFILL SUMMARY")
    print(f"{'='*60}")
    for r in summary:
        if r['status'] == 'SKIPPED':
            print(f"  R{r['round']:02d} {r['name'][:25]:<25} [SKIPPED]")
        elif r['status'] == 'DONE':
            correct = '✓' if r['pred'] == r['actual'] else '✗'
            print(f"  R{r['round']:02d} {r['name'][:25]:<25} pred:{r['pred']} actual:{r['actual']} {correct}")
        else:
            print(f"  R{r['round']:02d} {r['name'][:25]:<25} [{r['status']}]")

    print(f"\nDone. Check predictions/ results/ model_accuracy_log.csv")

if __name__ == '__main__':
    main()