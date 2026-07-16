import fastf1
import pandas as pd

fastf1.Cache.enable_cache('cache')

years_to_load = [2021, 2022, 2023, 2024, 2025, 2026]
all_results = []

for year in years_to_load:
    print(f"\n=== Loading {year} season schedule ===")
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    
    for _, event in schedule.iterrows():
        race_name = event['EventName']
        round_num = event['RoundNumber']
        
        print(f"Loading {year} Round {round_num}: {race_name}...")
        
        try:
            session = fastf1.get_session(year, round_num, 'R')
            session.load(telemetry=False, weather=False, messages=False)

            results = session.results[['Abbreviation', 'TeamName', 'GridPosition', 'Position', 'Points']].copy()
            results['Year'] = year
            results['Circuit'] = event['Location']
            results['RaceName'] = race_name

            all_results.append(results)
            print(f"  -> Got {len(results)} drivers")

        except Exception as e:
            print(f"  -> FAILED: {e}")

final_df = pd.concat(all_results, ignore_index=True)

print(f"\nTotal rows collected: {len(final_df)}")
print(final_df.head())

final_df.to_csv('race_data.csv', index=False)
print("\nSaved to race_data.csv")