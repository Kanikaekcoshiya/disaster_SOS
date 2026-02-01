import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, role }) => {
    const token = localStorage.getItem(`${role}Token`);
    return token ? children : <Navigate to="/login" />;
};

export default PrivateRoute;