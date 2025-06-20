// src/components/Navbar/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx'; 
import './navbar.css';

const Navbar = () => {
  const { isAuthenticated, logoutAction, userTier, user } = useAuth(); // Added user to get user.id for profile link
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutAction(); 
    navigate('/login'); 
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <img 
            src="/Images/Logo_Image-removebg-preview.png" 
            alt="BudgetBackpack Logo" 
            className="logo-image" // I'll add hover effects to this class
          />
          BudgetBackpack {/* text infront of logo */}
        </Link>
        
        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/pricing" className="nav-links">
              Pricing
            </Link>
          </li>
          {isAuthenticated ? (
            <>
              <li className="nav-item">
                <Link to="/dashboard" className="nav-links">
                  Dashboard 
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/feed" className="nav-links">
                  Feed
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/groups" className="nav-links">
                  Groups
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/search" className="nav-links">
                  Search
                </Link>
              </li>
              {user && ( // Check if user object is loaded
                <li className="nav-item">
                  <Link to={`/profile/${user.id}`} className="nav-links">
                    My Profile
                  </Link>
                </li>
              )}
              <li className="nav-item user-tier-display">
                <span className={`tier-badge-nav tier-${userTier}`}>{userTier}</span>
              </li>
              <li className="nav-item">
                <button onClick={handleLogout} className="nav-links nav-button-logout">
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-links">
                  Login
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/register" className="nav-links">
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;