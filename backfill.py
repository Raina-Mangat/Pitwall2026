import pandas as pd
import numpy as np
import joblib
import fastf1
import os
import requests
import warnings
from datetime import datetime
warnings.filterwarnings('ignore')

fastf1.Cache.enable_cache('cache')

# Import everything from your pipeline
from pipeline import (
    get_qualifying_grid, get_race_weather, generate_prediction,
    save_prediction, save_actual_result, compare_prediction_vs_result,
    display_prediction, CIRCUIT_COORDS
)

# ─────────────────────────────────────────────────────────────────
# 2026 COMPLETED RACES — confirmed from official F1 results
# Source: formula1.com/en/racing/2026
# ─────────────────────────────────────────────────────────────────
COMPLETED_RACES = [
    {'round': 1,  'name': 'Australian Grand Prix',
     'location': 'Melbourne',   'race_day': '2026-03-08', 'year': 2026},
    {'round': 2,  'name': 'Chinese Grand Prix',
     'location': 'Shanghai',    'race_day': '2026-03-15', 'year': 2026},
    {'round': 3,  'name': 'Japanese Grand Prix',
     'location': 'Suzuka',      'race_day': '2026-03-29', 'year': 2026},
    {'round': 4,  'name': 'Miami Grand Prix',
     'location': 'Miami',       'race_day': '2026-05-03', 'year': 2026},
    {'round': 5,  'name': 'Canadian Grand Prix',
     'location': 'Montréal',    'race_day': '2026-05-17', 'year': 2026},
    {'round': 6,  'name': 'Monaco Grand Prix',
     'location': 'Monte Carlo', 'race_day': '2026-05-25', 'year': 2026},
    {'round': 7,  'name': 'Spanish Grand Prix',
     'location': 'Barcelona',   'race_day': '2026-06-01', 'year': 2026},
    {'round': 8,  'name': 'Austrian Grand Prix',
     'location': 'Spielberg',   'race_day': '2026-06-28', 'year': 2026},
]
def main():
    print("="*55)
    print("  PitWall — Backfill Predictions for 2026 Rounds 1-8")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("="*55)

    model = joblib.load('pitwall_model_v3.pkl')
    df    = pd.read_csv('race_data_features.csv')
    print(f"Loaded model and {len(df)} rows of feature data\n")

    accuracy_summary = []

    for race_data in COMPLETED_RACES:
        race_info = race_data.copy()
        race_info['race_day'] = pd.Timestamp(race_data['race_day'])

        print(f"\n{'─'*55}")
        print(f"Round {race_info['round']}: {race_info['name']}")
        print(f"{'─'*55}")

        # Get real qualifying grid — all past races should have data
        grid, is_real_grid = get_qualifying_grid(race_info, df)

        # Weather — historical data (past dates still work with Open-Meteo)
        wet_flag, rain_mm, temp_c = get_race_weather(race_info)

        # Generate prediction
        result = generate_prediction(
            race_info, grid, df, model, wet_flag, temp_c
        )

        # Save prediction file
        save_prediction(
            result, race_info, is_real_grid, wet_flag, temp_c, rain_mm
        )

        # Fetch and save actual result
        actual = save_actual_result(race_info)

        # Compare and log accuracy
        if actual is not None:
            compare_prediction_vs_result(race_info)

        # Collect for summary
        pred_top3 = set(result.head(3)['Abbreviation'].tolist())
        pred_winner = result.iloc[0]['Abbreviation']
        accuracy_summary.append({
            'Round': race_info['round'],
            'Race': race_info['name'],
            'PredictedWinner': pred_winner,
            'PredictedTop3': pred_top3,
        })

    print(f"\n{'='*55}")
    print("  BACKFILL SUMMARY")
    print(f"{'='*55}")
    for r in accuracy_summary:
        print(f"  Round {r['Round']:02d} {r['Race'][:30]:<30} "
              f"Predicted winner: {r['PredictedWinner']}")

    print(f"\nFiles saved to predictions/ and results/")
    print(f"Check model_accuracy_log.csv for full accuracy report")

if __name__ == '__main__':
    main()