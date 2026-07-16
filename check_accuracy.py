import pandas as pd

df = pd.read_csv('model_accuracy_log.csv')
correct = df['WinnerCorrect'].sum()
total = len(df)
avg_overlap = df['PodiumOverlap'].mean()

print(f'Winner accuracy: {correct}/{total} = {correct/total:.1%}')
print(f'Avg podium overlap: {avg_overlap:.2f}/3')

print('\nRace by race:')
for _, row in df.iterrows():
    status = 'WIN' if row['WinnerCorrect'] else 'MISS'
    print(f"  R{int(row['Round']):02d} {str(row['Race'])[:20]:<20} [{status}] podium: {row['PodiumOverlap']}/3")