import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import warnings
warnings.filterwarnings('ignore')

# ─────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────
df = pd.read_csv('race_data_features.csv')
print(f"Loaded {len(df)} rows")

# ─────────────────────────────────────────
# CLEAN — handle missing values
# ─────────────────────────────────────────

# Grid position: fill 3 missing with 20 (back of grid)
df['GridPosition'] = df['GridPosition'].fillna(20)

# Driver form: fill with 10.5 (midfield average)
df['DriverForm'] = df['DriverForm'].fillna(10.5)

# Team form: fill with 5 (average points for a midfield team)
df['TeamForm'] = df['TeamForm'].fillna(5)

# Circuit history: fill with 10.5 (midfield — no history = unknown)
df['CircuitHistory'] = df['CircuitHistory'].fillna(10.5)

# ─────────────────────────────────────────
# CREATE TARGET VARIABLE
# ─────────────────────────────────────────

# What we're predicting: did this driver finish on the podium (top 3)?
# 1 = podium, 0 = didn't podium
df['Podium'] = (df['Position'] <= 3).astype(int)

print(f"\nPodium distribution:")
print(df['Podium'].value_counts())
print(f"Podium rate: {df['Podium'].mean():.1%}")

# ─────────────────────────────────────────
# DEFINE FEATURES
# ─────────────────────────────────────────

# These are the columns the model learns from
features = [
    'GridPosition',    # where they started
    'DriverForm',      # recent finishing positions (last 3 races)
    'TeamForm',        # recent team points (last 5 races)
    'CircuitHistory',  # historical avg finish at this circuit
]

X = df[features]   # inputs
y = df['Podium']   # output we want to predict

print(f"\nFeature matrix shape: {X.shape}")
print(f"Features used: {features}")

# ─────────────────────────────────────────
# SPLIT DATA
# ─────────────────────────────────────────

# 80% of data trains the model, 20% tests it
# random_state=42 means the split is the same every time we run
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"\nTraining rows: {len(X_train)}")
print(f"Testing rows:  {len(X_test)}")

# ─────────────────────────────────────────
# TRAIN THE MODEL
# ─────────────────────────────────────────

print("\nTraining Random Forest...")

model = RandomForestClassifier(
    n_estimators=200,    # 200 decision trees
    max_depth=6,         # each tree can be at most 6 levels deep
    min_samples_leaf=5,  # each leaf needs at least 5 samples
    random_state=42      # reproducible results
)

model.fit(X_train, y_train)
print("Training complete!")

# ─────────────────────────────────────────
# EVALUATE
# ─────────────────────────────────────────

y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n--- Model Performance ---")
print(f"Overall accuracy: {accuracy:.1%}")
print(f"\nDetailed report:")
print(classification_report(y_test, y_pred, target_names=['No podium', 'Podium']))

# Feature importance — what did the model learn matters most?
print(f"\n--- Feature Importance ---")
importance = pd.Series(
    model.feature_importances_,
    index=features
).sort_values(ascending=False)

for feat, imp in importance.items():
    bar = '█' * int(imp * 40)
    print(f"  {feat:20s} {bar} {imp:.1%}")

# ─────────────────────────────────────────
# SAVE THE MODEL
# ─────────────────────────────────────────

joblib.dump(model, 'pitwall_model.pkl')
print(f"\nModel saved to pitwall_model.pkl")