import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-logo">
        PIT<span>WALL</span>
      </NavLink>
      <ul className="navbar-links">
        <li><NavLink to="/"          className={({isActive}) => isActive ? 'active' : ''}>Predictor</NavLink></li>
        <li><NavLink to="/battle"    className={({isActive}) => isActive ? 'active' : ''}>Battle</NavLink></li>
        <li><NavLink to="/accuracy"  className={({isActive}) => isActive ? 'active' : ''}>Accuracy</NavLink></li>
        <li><NavLink to="/races"     className={({isActive}) => isActive ? 'active' : ''}>Races</NavLink></li>
      </ul>
    </nav>
  );
}