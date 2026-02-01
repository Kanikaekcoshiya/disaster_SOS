import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header style={styles.header}>
      <h2 style={styles.logo}>Disaster Relief Platform</h2>
      <nav>
        <ul style={styles.navLinks}>
          <li><Link to="/" style={styles.link}>Home</Link></li>
          <li><Link to="/volunteer-dashboard" style={styles.link}>Volunteer Dashboard</Link></li>
          <li><Link to="/admin-dashboard" style={styles.link}>Admin Dashboard</Link></li>
          <li><Link to="/login" style={styles.link}>Login</Link></li>
          
        </ul>
      </nav>
    </header>
  );
};

const styles = {
  header: {
    backgroundColor: '#004466',
    color: '#fff',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    margin: 0,
  },
  navLinks: {
    listStyle: 'none',
    display: 'flex',
    gap: '20px',
    margin: 0,
  },
  link: {
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 'bold',
  }
};

export default Header;