# 🏎️ PitWall 2026 – Formula 1 Race Prediction Platform

PitWall is a full-stack Formula 1 analytics and race prediction platform that automatically predicts upcoming race outcomes using machine learning, live Formula 1 data, and automated deployment pipelines.

The platform generates race predictions, tracks model accuracy, visualizes historical performance, and updates itself automatically before every Grand Prix.

---

## 🚀 Features

- 🏁 Predicts podium finishers for upcoming Formula 1 races
- 📊 Driver win and podium probability analysis
- 📈 Model accuracy tracking after each completed race
- 🏆 Championship standings
- 🧠 Machine Learning powered race predictions
- 🌦️ Weather-aware prediction pipeline
- ⚡ Automated GitHub Actions workflow
- 🔄 Automatic deployment to Render
- 📱 Responsive React frontend
- 🌐 REST API backend using Express.js

---

## 🛠️ Tech Stack

### Frontend
- React.js
- JavaScript
- CSS

### Backend
- Node.js
- Express.js

### Machine Learning
- Python
- XGBoost
- Pandas
- NumPy
- Scikit-learn

### Data Sources
- FastF1 API
- Open-Meteo Weather API

### DevOps
- GitHub Actions
- Render
- Git

---

# 📂 Project Structure

```
PitWall2026/
│
├── backend/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   └── public/
│
├── predictions/
├── results/
├── cache/
│
├── pipeline.py
├── backfill.py
├── check_accuracy.py
├── train_model.py
│
├── all_predictions_log.csv
├── model_accuracy_log.csv
│
└── requirements.txt
```

---

# ⚙️ How It Works

## Prediction Pipeline

Every scheduled run:

1. Fetches the latest Formula 1 calendar.
2. Identifies the upcoming race.
3. Downloads qualifying and historical data.
4. Retrieves live weather forecasts.
5. Generates ML-based race predictions.
6. Saves prediction CSVs.
7. Updates prediction history.

---

## Backfill Pipeline

After a race:

- Fetches official race results
- Compares predictions with actual outcomes
- Calculates prediction accuracy
- Updates historical logs
- Refreshes model statistics

---

## Automation

The project is fully automated using **GitHub Actions**.

Every 6 hours:

- Generates predictions
- Updates completed races
- Commits generated files
- Pushes updates to GitHub
- Automatically triggers Render deployment

No manual intervention is required.

---

# 📡 API Endpoints

## Next Race Prediction

```
GET /api/predictions/next
```

Returns prediction for the upcoming Grand Prix.

---

## Prediction by Round

```
GET /api/predictions/:round
```

Returns predictions for a specific race.

---

## Driver Statistics

```
GET /api/drivers/:abbreviation
```

Returns driver-specific statistics.

---

## Championship Schedule

```
GET /api/races
```

Returns the Formula 1 calendar.

---

## Model Accuracy

```
GET /api/accuracy
```

Returns prediction accuracy across completed races.

---

# 🧠 Machine Learning

The prediction model considers multiple factors including:

- Driver form
- Team performance
- Grid position
- Recent qualifying performance
- Historical circuit performance
- Team momentum
- Weather conditions
- Win rate
- Podium rate
- DNF risk
- Experience
- Consistency

The model predicts:

- Win Probability
- Podium Probability
- Predicted Finishing Order

---

# 📈 Model Evaluation

The platform continuously evaluates prediction performance after each completed race by comparing:

- Predicted podium
- Actual podium
- Winner accuracy
- Overall prediction accuracy

Results are stored automatically in:

```
model_accuracy_log.csv
```

---

# 🚀 Installation

Clone the repository

```bash
git clone https://github.com/Raina-Mangat/Pitwall2026.git
```

Install frontend dependencies

```bash
cd frontend
npm install
```

Install backend dependencies

```bash
cd ../backend
npm install
```

Install Python dependencies

```bash
pip install -r requirements.txt
```

Run the backend

```bash
cd backend
npm start
```

Run the frontend

```bash
cd frontend
npm start
```

Generate predictions

```bash
python pipeline.py
```

Update completed races

```bash
python backfill.py
```

---

# 🔄 Continuous Integration

GitHub Actions automatically:

- Generates predictions
- Updates race results
- Tracks model accuracy
- Pushes generated files
- Deploys the latest version to Render

---

# 📊 Future Improvements

- Driver comparison dashboard
- Constructor prediction model
- Safety Car probability prediction
- Tyre strategy simulation
- Interactive circuit analytics
- Historical race simulator
- AI-powered race insights
- Live telemetry integration

---

# 👨‍💻 Author

**Raina Mangat**

Computer Science Engineering Student

Full Stack Web Developer

GitHub: https://github.com/Raina-Mangat

LinkedIn:www.linkedin.com/in/raina-mangat

---

# ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub!
