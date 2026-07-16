import pandas as pd
import numpy as np
import joblib

# Load the saved model
model = joblib.load('pitwall_model.pkl')
print("Model loaded successfully")

# ─────────────────────────────────────────
# CURRENT 2026 DRIVER DATA
# Update grid positions after qualifying
# ─────────────────────────────────────────

# Based on current 2026 season form
# GridPosition = estimated qualifying order (update Saturday after quali)
# DriverForm = their recent avg finish (last 3 races)
# TeamForm = team's recent avg points (last 5 races)
# CircuitHistory = historical avg finish at Spielberg (Austria)

upcoming_race = pd.DataFrame([
    {'Driver': 'VER', 'GridPosition': 1,  'DriverForm': 8.0,  'TeamForm': 6.0,  'CircuitHistory': 2.0},
    {'Driver': 'ANT', 'GridPosition': 2,  'DriverForm': 2.0,  'TeamForm': 18.0, 'CircuitHistory': 5.0},
    {'Driver': 'RUS', 'GridPosition': 3,  'DriverForm': 3.5,  'TeamForm': 18.0, 'CircuitHistory': 7.0},
    {'Driver': 'NOR', 'GridPosition': 4,  'DriverForm': 3.0,  'TeamForm': 14.0, 'CircuitHistory': 5.0},
    {'Driver': 'PIA', 'GridPosition': 5,  'DriverForm': 4.0,  'TeamForm': 14.0, 'CircuitHistory': 9.0},
    {'Driver': 'LEC', 'GridPosition': 6,  'DriverForm': 5.0,  'TeamForm': 8.0,  'CircuitHistory': 5.0},
    {'Driver': 'HAM', 'GridPosition': 7,  'DriverForm': 6.0,  'TeamForm': 8.0,  'CircuitHistory': 4.0},
    {'Driver': 'HAD', 'GridPosition': 8,  'DriverForm': 10.0, 'TeamForm': 6.0,  'CircuitHistory': 10.5},
    {'Driver': 'ALO', 'GridPosition': 9,  'DriverForm': 13.0, 'TeamForm': 3.0,  'CircuitHistory': 9.0},
    {'Driver': 'STR', 'GridPosition': 10, 'DriverForm': 15.0, 'TeamForm': 3.0,  'CircuitHistory': 12.0},
])

features = ['GridPosition', 'DriverForm', 'TeamForm', 'CircuitHistory']
X_pred = upcoming_race[features]

# Get podium probability for each driver
podium_probs = model.predict_proba(X_pred)[:, 1]
upcoming_race['PodiumProbability'] = podium_probs

# Normalize to get win probability estimate
upcoming_race['WinProbability'] = (
    upcoming_race['PodiumProbability'] /
    upcoming_race['PodiumProbability'].sum()
)

# Sort by win probability
result = upcoming_race.sort_values('WinProbability', ascending=False)

print("\n🏎️  PitWall Prediction — 2026 Austrian GP")
print("=" * 50)
print(f"{'Driver':<8} {'Grid':<6} {'Podium%':<10} {'Win%':<10}")
print("-" * 50)

for _, row in result.iterrows():
    bar = '█' * int(row['WinProbability'] * 30)
    print(f"{row['Driver']:<8} P{int(row['GridPosition']):<5} "
          f"{row['PodiumProbability']:.0%}       "
          f"{row['WinProbability']:.0%}  {bar}")

print("\nTop 3 predicted podium:")
for i, (_, row) in enumerate(result.head(3).iterrows()):
    medals = ['🥇', '🥈', '🥉']
    print(f"  {medals[i]} {row['Driver']} — {row['WinProbability']:.0%} chance")

# Save prediction
result.to_csv('austrian_gp_prediction.csv', index=False)
print("\nSaved to austrian_gp_prediction.csv")