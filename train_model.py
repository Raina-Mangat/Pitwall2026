import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.utils.class_weight import compute_sample_weight
from sklearn.metrics import accuracy_score, classification_report, brier_score_loss
import joblib
import warnings
warnings.filterwarnings('ignore')

# ─────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────
df = pd.read_csv('race_data_features.csv')
print(f"Loaded {len(df)} rows, {df['Year'].min()}–{df['Year'].max()}")

# Active drivers only
ACTIVE = [
    'ANT','RUS','HAM','LEC','NOR','PIA','VER','HAD','GAS','COL',
    'OCO','BEA','LAW','LIN','ALB','SAI','HUL','BOR','ALO','STR',
    'PER','BOT','TSU','RIC','MAG','ZHO','DOO',
]
df = df[df['Abbreviation'].isin(ACTIVE)].copy()
print(f"After filtering retired drivers: {len(df)} rows")

# ─────────────────────────────────────────
# FILL MISSING VALUES
# ─────────────────────────────────────────
df['GridPosition']        = df['GridPosition'].fillna(20)
df['DriverForm3']         = df['DriverForm3'].fillna(10.5)
df['DriverForm5']         = df['DriverForm5'].fillna(10.5)
df['QualifyingForm3']     = df['QualifyingForm3'].fillna(10.5)
df['QualifyingForm5']     = df['QualifyingForm5'].fillna(10.5)
df['AverageFinish']       = df['AverageFinish'].fillna(10.5)
df['AverageGrid']         = df['AverageGrid'].fillna(10.5)
df['GridGain']            = df['GridGain'].fillna(0)
df['AverageGridGain']     = df['AverageGridGain'].fillna(0)
df['PodiumRate']          = df['PodiumRate'].fillna(0)
df['WinRate']             = df['WinRate'].fillna(0)
df['PointsMomentum']      = df['PointsMomentum'].fillna(0)
df['TeamForm']            = df['TeamForm'].fillna(5)
df['CircuitHistory']      = df['CircuitHistory'].fillna(10.5)
df['DNFRisk']             = df['DNFRisk'].fillna(0.1)
df['Consistency']         = df['Consistency'].fillna(10.5)
df['Experience']          = df['Experience'].fillna(0)
df['FrontRow']            = df['FrontRow'].fillna(0)
df['TopFive']             = df['TopFive'].fillna(0)
df['TeamGridInteraction'] = df['TeamGridInteraction'].fillna(1)

# Recompute derived features defensively
df['GridPositionSq']      = df['GridPosition'] ** 2
df['FrontRow']            = (df['GridPosition'] <= 2).astype(int)
df['TopFive']             = (df['GridPosition'] <= 5).astype(int)
df['TeamGridInteraction'] = df['TeamForm'] / (df['GridPosition'] + 1)

# ─────────────────────────────────────────
# TARGET
# ─────────────────────────────────────────
df['Podium'] = (df['Position'] <= 3).astype(int)
print(f"Podium rate: {df['Podium'].mean():.1%}")

# ─────────────────────────────────────────
# FEATURES — exactly 16, confirmed working
# ─────────────────────────────────────────
features = [
    'GridPosition',
    'GridPositionSq',
    'FrontRow',
    'TopFive',
    'TeamGridInteraction',
    'DriverForm3',
    'DriverForm5',
    'QualifyingForm3',
    'TeamForm',
    'CircuitHistory',
    'PodiumRate',
    'WinRate',
    'DNFRisk',
    'PointsMomentum',
    'Consistency',
    'Experience',
]

X = df[features].fillna(0)
y = df['Podium']

print(f"Feature matrix: {X.shape}")

# ─────────────────────────────────────────
# TRAIN/TEST SPLIT — by year, no leakage
# Train on 2021-2024, test on 2025-2026
# ─────────────────────────────────────────
train_mask = df['Year'] <= 2024
X_train, X_test = X[train_mask], X[~train_mask]
y_train, y_test = y[train_mask], y[~train_mask]
print(f"Train: {len(X_train)} | Test: {len(X_test)}")
print(f"Test years: {sorted(df[~train_mask]['Year'].unique())}")

# ─────────────────────────────────────────
# TRAIN
# ─────────────────────────────────────────
print("\nTraining...")
sample_weights = compute_sample_weight(class_weight='balanced', y=y_train)

base_model = GradientBoostingClassifier(
    n_estimators=400,
    max_depth=4,
    learning_rate=0.04,
    min_samples_leaf=4,
    subsample=0.8,
    random_state=42
)
model = CalibratedClassifierCV(base_model, cv=5, method='isotonic')
model.fit(X_train, y_train, sample_weight=sample_weights)
print("Done!")

# ─────────────────────────────────────────
# EVALUATE
# ─────────────────────────────────────────
y_pred  = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]

THRESHOLD = 0.35
y_pred_tuned = (y_proba >= THRESHOLD).astype(int)

print(f"\n--- Model Performance ---")
print(f"Accuracy (0.5 threshold):    {accuracy_score(y_test, y_pred):.1%}")
print(f"Accuracy (0.35 threshold):   {accuracy_score(y_test, y_pred_tuned):.1%}")
print(f"Brier Score: {brier_score_loss(y_test, y_proba):.4f}")
print("\nReport at 0.35 threshold:")
print(classification_report(y_test, y_pred_tuned, target_names=['No podium','Podium']))
print("\nReport at 0.5 threshold:")
print(classification_report(y_test, y_pred, target_names=['No podium','Podium']))

# ─────────────────────────────────────────
# FEATURE IMPORTANCE
# ─────────────────────────────────────────
print("\n--- Feature Importance ---")
try:
    importances = np.mean([
        est.estimator.feature_importances_
        for est in model.calibrated_classifiers_
    ], axis=0)
    for feat, imp in sorted(zip(features, importances), key=lambda x: -x[1]):
        bar = '█' * int(imp * 50)
        print(f"  {feat:<22} {bar} {imp:.1%}")
except Exception as e:
    print(f"  Could not extract importances: {e}")

# ─────────────────────────────────────────
# SAVE
# ─────────────────────────────────────────
joblib.dump(model, 'pitwall_model_v3.pkl')

driver_features = (
    df.groupby('Abbreviation')[[
        'PodiumRate', 'WinRate', 'DNFRisk', 'PointsMomentum',
        'Consistency', 'Experience', 'GridGain', 'AverageGridGain'
    ]]
    .last()
    .reset_index()
)
driver_features.to_csv('driver_engineered_features.csv', index=False)

print("\nSaved: pitwall_model_v3.pkl")
print("Saved: driver_engineered_features.csv")