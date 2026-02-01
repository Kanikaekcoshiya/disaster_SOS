import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import PrivateRoute from './components/PrivateRoute';
import UserDashboard from './pages/UserDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import AdminDashboard from './pages/AdminDashboard';

import Login from './pages/Login';
import VolunteerSignUp from './pages/VolunteerSignUp';
import AuthProvider from './AuthContext';

const App = () => {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<UserDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/volunteer-signup" element={<VolunteerSignUp />} />

        {/* Protected Routes */}
        <Route
          path="/volunteer-dashboard"
          element={
            <PrivateRoute role="volunteer">
              <VolunteerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <PrivateRoute role="admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        
      </Routes>
    </Router>
  );
};

export default App;
