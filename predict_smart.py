import pandas as pd
import numpy as np
import joblib
import requests
import os
import warnings
warnings.filterwarnings('ignore')

for f in ['pitwall_model_v3.pkl', 'race_data_features.csv',
          'driver_engineered_features.csv']:
    if not os.path.exists(f):
        print(f"ERROR: {f} not found. Run train_model.py first.")
        exit()

model = joblib.load('pitwall_model_v3.pkl')
df    = pd.read_csv('race_data_features.csv')

ACTIVE_2026 = [
    'ANT','RUS','HAM','LEC','NOR','PIA','VER','HAD',
    'GAS','COL','OCO','BEA','LAW','LIN','ALB','SAI',
    'HUL','BOR','ALO','STR','PER','BOT',
]
df = df[df['Abbreviation'].isin(ACTIVE_2026)].copy()
print("Model and data loaded")

# ─────────────────────────────────────────
# WEATHER
# ─────────────────────────────────────────
def get_race_weather():
    try:
        race_date = "2026-07-05"
        url = (
            "https://api.open-meteo.com/v1/forecast"
            "?latitude=52.0786&longitude=-1.0169"
            "&daily=precipitation_sum,temperature_2m_max,windspeed_10m_max"
            f"&start_date={race_date}&end_date={race_date}"
            "&timezone=Europe/London"
        )
        r = requests.get(url, timeout=5)
        data = r.json()['daily']
        rain_mm  = data['precipitation_sum'][0]
        temp_c   = data['temperature_2m_max'][0]
        wind_kmh = data['windspeed_10m_max'][0]
        wet_flag = 1 if rain_mm > 2.0 else 0
        print(f"\nWeather (Silverstone, July 5 2026):")
        print(f"   Rain: {rain_mm}mm | Temp: {temp_c}C | Wind: {wind_kmh}km/h")
        print(f"   Condition: {'WET' if wet_flag else 'DRY'}")
        return wet_flag, rain_mm, temp_c
    except Exception as e:
        print(f"Weather failed ({e}) - DRY 22C fallback")
        return 0, 0.0, 22.0

wet_flag, rain_mm, temp_c = get_race_weather()
import fastf1
fastf1.Cache.enable_cache('cache')

def get_next_race_info():
    schedule = fastf1.get_event_schedule(2026, include_testing=False)
    today = pd.Timestamp.now()
    upcoming = schedule[pd.to_datetime(schedule['EventDate']) >= today - pd.Timedelta(days=1)]
    if len(upcoming) == 0:
        return {'name': 'Season Complete', 'round': 0, 'location': 'Unknown', 'date': today}
    next_event = upcoming.iloc[0]
    return {
        'name':     next_event['EventName'],
        'round':    int(next_event['RoundNumber']),
        'location': next_event['Location'],
        'date':     pd.to_datetime(next_event['EventDate']),
    }

race_info = get_next_race_info()
print(f"\nNext race: {race_info['name']} — Round {race_info['round']}")
print(f"Location: {race_info['location']}")
# ─────────────────────────────────────────
# DRIVER STATS from training data
# ─────────────────────────────────────────
stat_cols = ['DriverForm3','DriverForm5','QualifyingForm3','TeamForm',
             'PodiumRate','WinRate','DNFRisk','PointsMomentum',
             'Consistency','Experience']

latest_stats = (
    df.sort_values('Year')
    .groupby('Abbreviation')[stat_cols]
    .last()
    .reset_index()
)

# NEW — automatic
circuit_history = (
    df[df['Circuit'] == race_info['location']]
    .groupby('Abbreviation')['CircuitHistory']
    .last()
    .reset_index()
)

# ─────────────────────────────────────────
# GRID — update after qualifying
# ─────────────────────────────────────────
grid_positions = pd.DataFrame([
    {'Abbreviation': 'LEC', 'Team': 'Ferrari',         'GridPosition': 1},
    {'Abbreviation': 'RUS', 'Team': 'Mercedes',        'GridPosition': 2},
    {'Abbreviation': 'HAM', 'Team': 'Ferrari',         'GridPosition': 3},
    {'Abbreviation': 'ANT', 'Team': 'Mercedes',        'GridPosition': 4},
    {'Abbreviation': 'NOR', 'Team': 'McLaren',         'GridPosition': 5},
    {'Abbreviation': 'VER', 'Team': 'Red Bull Racing', 'GridPosition': 6},
    {'Abbreviation': 'PIA', 'Team': 'McLaren',         'GridPosition': 7},
    {'Abbreviation': 'HAD', 'Team': 'Red Bull Racing', 'GridPosition': 8},
    {'Abbreviation': 'GAS', 'Team': 'Alpine',          'GridPosition': 9},
    {'Abbreviation': 'LAW', 'Team': 'Racing Bulls',    'GridPosition': 10},
    {'Abbreviation': 'COL', 'Team': 'Alpine',          'GridPosition': 11},
    {'Abbreviation': 'BEA', 'Team': 'Haas F1 Team',    'GridPosition': 12},
    {'Abbreviation': 'OCO', 'Team': 'Haas F1 Team',    'GridPosition': 13},
    {'Abbreviation': 'LIN', 'Team': 'Racing Bulls',    'GridPosition': 14},
    {'Abbreviation': 'ALB', 'Team': 'Williams',        'GridPosition': 15},
    {'Abbreviation': 'HUL', 'Team': 'Audi',            'GridPosition': 16},
    {'Abbreviation': 'SAI', 'Team': 'Williams',        'GridPosition': 17},
    {'Abbreviation': 'BOR', 'Team': 'Audi',            'GridPosition': 18},
    {'Abbreviation': 'ALO', 'Team': 'Aston Martin',    'GridPosition': 19},
    {'Abbreviation': 'STR', 'Team': 'Aston Martin',    'GridPosition': 20},
    {'Abbreviation': 'PER', 'Team': 'Cadillac',        'GridPosition': 21},
    {'Abbreviation': 'BOT', 'Team': 'Cadillac',        'GridPosition': 22},
])

# ─────────────────────────────────────────
# MERGE
# ─────────────────────────────────────────
pred_df = grid_positions.merge(latest_stats, on='Abbreviation', how='left')
pred_df = pred_df.merge(circuit_history, on='Abbreviation', how='left')

fill_defaults = {
    'DriverForm3':10.5,'DriverForm5':10.5,'QualifyingForm3':10.5,
    'TeamForm':5.0,'PodiumRate':0.0,'WinRate':0.0,
    'DNFRisk':0.10,'PointsMomentum':0.0,'Consistency':10.5,
    'Experience':0.0,'CircuitHistory':10.5,
}
for col, val in fill_defaults.items():
    pred_df[col] = pred_df[col].fillna(val)

# Cap Cadillac — historical data irrelevant
# Cap Cadillac — historical data irrelevant
cadillac = ['PER','BOT']
pred_df.loc[pred_df['Abbreviation'].isin(cadillac),
            ['PodiumRate','WinRate','PointsMomentum',
             'CircuitHistory','Consistency']] = [0.0,0.0,0.0,18.0,15.0]

# Cap backmarker teams — Aston Martin/Audi nowhere in 2026
backmarkers = ['ALO','STR','HUL','BOR']
pred_df.loc[pred_df['Abbreviation'].isin(backmarkers),
            ['PodiumRate','WinRate','PointsMomentum']] = [0.0,0.0,0.0]
# Derived features
pred_df['GridPositionSq']      = pred_df['GridPosition'] ** 2
pred_df['FrontRow']            = (pred_df['GridPosition'] <= 2).astype(int)
pred_df['TopFive']             = (pred_df['GridPosition'] <= 5).astype(int)
pred_df['TeamGridInteraction'] = pred_df['TeamForm'] / (pred_df['GridPosition'] + 1)

# ─────────────────────────────────────────
# FEATURE MATRIX
# ─────────────────────────────────────────
# Override 2026 TeamForm with real constructor standings avg pts/car/race
# Mercedes 18.7, Ferrari 15.0, McLaren 10.1, Red Bull 6.4
# Alpine 4.3, Racing Bulls 2.7, Haas 1.5, Williams 0.8
# Audi 0.1, Aston Martin 0.1, Cadillac 0.0
team_form_2026 = {
    'Mercedes': 18.7, 'Ferrari': 15.0, 'McLaren': 10.1,
    'Red Bull Racing': 6.4, 'Alpine': 4.3, 'Racing Bulls': 2.7,
    'Haas F1 Team': 1.5, 'Williams': 0.8,
    'Audi': 0.1, 'Aston Martin': 0.1, 'Cadillac': 0.0,
}
pred_df['TeamForm'] = pred_df['Team'].map(team_form_2026).fillna(1.0)
pred_df['TeamGridInteraction'] = pred_df['TeamForm'] / (pred_df['GridPosition'] + 1)

X_final = pd.DataFrame({
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

# ─────────────────────────────────────────
# PREDICT
# ─────────────────────────────────────────
podium_probs = model.predict_proba(X_final)[:, 1]
# Hard cap backmarker drivers — car is too slow regardless of driver history
# Aston Martin, Audi, Cadillac have 0-0.1 pts/car/race in 2026
hard_cap = {
    'ALO': 0.02, 'STR': 0.01, 'HUL': 0.01,
    'BOR': 0.01, 'PER': 0.01, 'BOT': 0.01,
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

result = pred_df.sort_values('WinProbability', ascending=False).reset_index(drop=True)

# ─────────────────────────────────────────
# DISPLAY
# ─────────────────────────────────────────
condition = "WET" if wet_flag else "DRY"
print(f"\n{'='*68}")
# NEW
print(f"  PitWall - {race_info['name']} {race_info['date'].year}  [{condition}]")
print(f"  {race_info['location']} | Round {race_info['round']}")
print(f"  {temp_c}C | Rain: {rain_mm}mm")
print(f"{'='*68}")
print(f"\n  {'Pos':<4} {'Driver':<6} {'Team':<18} {'Grid':<6} {'Podium%':<9} {'Win%':<7} {'Dry%':<6} {'Wet%'}")
print(f"  {'-'*66}")

for i, row in result.iterrows():
    pos_label = {0:'1.',1:'2.',2:'3.'}.get(i,'  ')
    bar = '#' * int(row['WinProbability'] * 35)
    dnf = ' [DNF risk]' if row['DNFRisk'] > 0.12 else ''
    print(f"  {pos_label} {row['Abbreviation']:<6} "
          f"{row['Team']:<18} "
          f"P{int(row['GridPosition']):<5} "
          f"{row['PodiumProbability']:.0%}      "
          f"{row['WinProbability']:.0%}    "
          f"{row['Dry_Win%']}%  "
          f"{row['Wet_Win%']}%  "
          f"{bar}{dnf}")

print(f"\n  PREDICTED PODIUM:")
for i,(_, row) in enumerate(result.head(3).iterrows()):
    print(f"     {i+1}. {row['Abbreviation']} ({row['Team']}) "
          f"- {row['WinProbability']:.0%} win prob "
          f"[dry: {row['Dry_Win%']}% | wet: {row['Wet_Win%']}%]")

high_dnf = result[result['DNFRisk'] > 0.12]
if len(high_dnf) > 0:
    print(f"\n  DNF RISK (>12%):")
    for _, row in high_dnf.iterrows():
        print(f"     {row['Abbreviation']}: {row['DNFRisk']:.0%}")

# NEW
slug = race_info['name'].replace(' ', '_').replace("'", "")
result.to_csv(f"predictions/{race_info['round']:02d}_{slug}_{race_info['date'].year}.csv", index=False)
print(f"\n  Saved to predictions/{race_info['round']:02d}_{slug}_{race_info['date'].year}.csv")