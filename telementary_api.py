import sys
import json
import fastf1
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

fastf1.Cache.enable_cache('cache')

def get_strategy(year, round_num):
    try:
        session = fastf1.get_session(int(year), int(round_num), 'R')
        session.load(telemetry=False, weather=False, messages=False)
        laps = session.laps

        drivers = session.results['Abbreviation'].tolist()
        strategy = []

        for drv in drivers:
            drv_laps = laps.pick_drivers(drv).copy()
            if len(drv_laps) == 0:
                continue

            stints = []
            current_compound = None
            stint_start = None
            stint_num = 0

            for _, lap in drv_laps.iterrows():
                compound = lap.get('Compound', 'UNKNOWN')
                if compound != current_compound:
                    if current_compound is not None:
                        stints.append({
                            'compound': current_compound,
                            'startLap': int(stint_start),
                            'endLap':   int(lap['LapNumber']) - 1,
                            'laps':     int(lap['LapNumber']) - int(stint_start),
                            'stint':    stint_num,
                        })
                        stint_num += 1
                    current_compound = compound
                    stint_start = lap['LapNumber']

            if current_compound and stint_start:
                stints.append({
                    'compound': current_compound,
                    'startLap': int(stint_start),
                    'endLap':   int(drv_laps['LapNumber'].max()),
                    'laps':     int(drv_laps['LapNumber'].max()) - int(stint_start) + 1,
                    'stint':    stint_num,
                })

            team = session.results[
                session.results['Abbreviation'] == drv
            ]['TeamName'].values
            team = team[0] if len(team) > 0 else 'Unknown'

            finish = session.results[
                session.results['Abbreviation'] == drv
            ]['Position'].values
            finish = int(finish[0]) if len(finish) > 0 else 99

            strategy.append({
                'driver':  drv,
                'team':    team,
                'finish':  finish,
                'stints':  stints,
                'totalLaps': int(drv_laps['LapNumber'].max()),
            })

        strategy.sort(key=lambda x: x['finish'])

        print(json.dumps({
            'year':       int(year),
            'round':      int(round_num),
            'raceName':   session.event['EventName'],
            'totalLaps':  int(laps['LapNumber'].max()) if len(laps) > 0 else 0,
            'drivers':    strategy,
        }))

    except Exception as e:
        print(json.dumps({'error': str(e)}))

def get_telemetry(year, round_num, driver):
    try:
        session = fastf1.get_session(int(year), int(round_num), 'R')
        session.load(telemetry=True, weather=False, messages=False)

        drv_laps = session.laps.pick_drivers(driver.upper())
        fastest  = drv_laps.pick_fastest()
        tel      = fastest.get_car_data().add_distance()

        # Downsample to max 500 points for performance
        step = max(1, len(tel) // 500)
        tel  = tel.iloc[::step]

        print(json.dumps({
            'driver': driver.upper(),
            'lap':    int(fastest['LapNumber']),
            'lapTime': str(fastest['LapTime']),
            'data': {
                'distance': tel['Distance'].round(1).tolist(),
                'speed':    tel['Speed'].round(1).tolist(),
                'throttle': tel['Throttle'].round(1).tolist(),
                'brake':    tel['Brake'].astype(int).tolist(),
                'gear':     tel['nGear'].astype(int).tolist(),
            }
        }))

    except Exception as e:
        print(json.dumps({'error': str(e)}))

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'strategy':
        get_strategy(sys.argv[2], sys.argv[3])
    elif cmd == 'telemetry':
        get_telemetry(sys.argv[2], sys.argv[3], sys.argv[4])