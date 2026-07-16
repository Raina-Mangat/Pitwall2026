import pandas as pd

df = pd.read_csv('race_data_features.csv')

for drv in ['RUS', 'PIA', 'ANT', 'HAM']:
    d = df[df['Abbreviation'] == drv].sort_values('Year')
    last = d.iloc[-1]
    print(f"{drv}: races={len(d)}, "
          f"PodiumRate={last['PodiumRate']:.3f}, "
          f"WinRate={last['WinRate']:.3f}, "
          f"Consistency={last['Consistency']:.2f}, "
          f"PointsMomentum={last['PointsMomentum']:.2f}")