import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

df = pd.read_csv('race_data.csv')
print(f"Loaded {len(df)} rows")

# Active 2026 drivers only
ACTIVE = [
    'ANT','RUS','HAM','LEC','NOR','PIA','VER','HAD','GAS','COL',
    'OCO','BEA','LAW','LIN','ALB','SAI','HUL','BOR','ALO','STR',
    'PER','BOT','TSU','RIC','MAG','ZHO','DOO',
]
df = df[df['Abbreviation'].isin(ACTIVE)].copy()
print(f"After filtering: {len(df)} rows")

# Sort chronologically
df = df.sort_values(['Year','Abbreviation']).reset_index(drop=True)

# ─────────────────────────────────────────
# TARGET COLUMNS
# ─────────────────────────────────────────
df['Podium'] = (df['Position'] <= 3).astype(int)
df['Win']    = (df['Position'] == 1).astype(int)
df['DNF']    = df['Position'].isna().astype(int)

# ─────────────────────────────────────────
# GROUP BY DRIVER for rolling features
# ─────────────────────────────────────────
driver = df.groupby('Abbreviation', group_keys=False)

# Driver form — rolling avg finish position last 3 and 5 races
df['DriverForm3'] = (
    driver['Position']
    .transform(lambda x: x.shift(1).rolling(3, min_periods=1).mean())
).fillna(10.5)

df['DriverForm5'] = (
    driver['Position']
    .transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean())
).fillna(10.5)

# Qualifying form — rolling avg grid position last 3 races
df['QualifyingForm3'] = (
    driver['GridPosition']
    .transform(lambda x: x.shift(1).rolling(3, min_periods=1).mean())
).fillna(10.5)

df['QualifyingForm5'] = (
    driver['GridPosition']
    .transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean())
).fillna(10.5)

# Average finish and grid positions all time
df['AverageFinish'] = (
    driver['Position']
    .transform(lambda x: x.shift(1).expanding().mean())
).fillna(10.5)

df['AverageGrid'] = (
    driver['GridPosition']
    .transform(lambda x: x.shift(1).expanding().mean())
).fillna(10.5)

# Grid gain (positions gained from grid to finish)
df['GridGain'] = df['GridPosition'] - df['Position']

df['AverageGridGain'] = (
    driver['GridGain']
    .transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean())
).fillna(0)

# ─────────────────────────────────────────
# PODIUM RATE and WIN RATE — last 15 races
# Recency weighted to avoid career avg bias
# ─────────────────────────────────────────
df['PodiumRate'] = (
    driver['Podium']
    .transform(lambda x: x.shift(1).rolling(15, min_periods=1).mean())
).fillna(0)

df['WinRate'] = (
    driver['Win']
    .transform(lambda x: x.shift(1).rolling(15, min_periods=1).mean())
).fillna(0)

# ─────────────────────────────────────────
# POINTS MOMENTUM — rolling 5 race avg
# ─────────────────────────────────────────
df['PointsMomentum'] = (
    driver['Points']
    .transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean())
).fillna(0)

# ─────────────────────────────────────────
# TEAM FORM — rolling avg team points last 5
# ─────────────────────────────────────────
team = df.groupby('TeamName', group_keys=False)

df['TeamForm'] = (
    team['Points']
    .transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean())
).fillna(5)

# ─────────────────────────────────────────
# CIRCUIT HISTORY — expanding mean per driver/circuit
# ─────────────────────────────────────────
df['CircuitHistory'] = (
    df.groupby(['Abbreviation','Circuit'])['Position']
    .transform(lambda x: x.shift(1).expanding().mean())
).fillna(10.5)

# ─────────────────────────────────────────
# DNF RISK — rolling DNF rate last 10 races
# ─────────────────────────────────────────
df['DNFRisk'] = (
    driver['DNF']
    .transform(lambda x: x.shift(1).rolling(10, min_periods=1).mean())
).fillna(0.1)

# ─────────────────────────────────────────
# CONSISTENCY — rolling std of finish position
# Lower = more consistent
# ─────────────────────────────────────────
df['Consistency'] = (
    driver['Position']
    .transform(lambda x: x.shift(1).rolling(5, min_periods=3).std())
).fillna(10.5)

# ─────────────────────────────────────────
# EXPERIENCE — total races in dataset
# ─────────────────────────────────────────
df['Experience'] = (
    driver['Position']
    .transform(lambda x: x.shift(1).expanding().count())
).fillna(0)

# ─────────────────────────────────────────
# DERIVED FEATURES
# ─────────────────────────────────────────
df['FrontRow']            = (df['GridPosition'] <= 2).astype(int)
df['TopFive']             = (df['GridPosition'] <= 5).astype(int)
df['TeamGridInteraction'] = df['TeamForm'] / (df['GridPosition'] + 1)

# ─────────────────────────────────────────
# SAVE
# ─────────────────────────────────────────
print(f"\nFinal dataset: {len(df)} rows, {len(df.columns)} columns")
print(f"Columns: {list(df.columns)}")
df.to_csv('race_data_features.csv', index=False)
print("Saved to race_data_features.csv")