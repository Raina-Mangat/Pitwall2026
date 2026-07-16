import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Predictor from './pages/Predictor';
import Accuracy from './pages/Accuracy';
import Battle from './pages/Battle';
import Season from './pages/Season';
import './styles.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="main-content" style={{ padding: 0 }}>
          <Routes>
            <Route path="/"         element={<Predictor />} />
            <Route path="/battle"   element={<Battle />} />
            <Route path="/accuracy" element={<Accuracy />} />
            <Route path="/races"    element={<Season />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;