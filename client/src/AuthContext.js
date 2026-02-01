import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; 

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
 
    const [user, setUser] = useState(null);
  
    const [token, setToken] = useState(localStorage.getItem('adminToken') || localStorage.getItem('volunteerToken'));
    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token); // Decode the token to extract user data.

                if (decoded.exp * 1000 < Date.now()) {
                    console.log("Token expired. Logging out.");
                    logout(); // If expired, log the user out.
                } else {
                  
                    if (decoded.admin) {
                        setUser({ ...decoded.admin, role: 'admin' });
                    } else if (decoded.id && decoded.role === 'volunteer') {
                       
                        setUser({ id: decoded.id, name: decoded.name, role: decoded.role });
                    } else {
                      
                        setUser({ id: decoded.id, role: decoded.role || 'user' });
                    }
                }
            } catch (error) {
                console.error('Failed to decode token:', error);
                logout(); // If decoding fails, log out.
            }
        } else {
            
            setUser(null);
        }
    }, [token]);
    // Login function
    const login = (newToken, role) => {
       
        if (role === 'admin') {
            localStorage.setItem('adminToken', newToken);
            localStorage.removeItem('volunteerToken'); 
        } else if (role === 'volunteer') {
            localStorage.setItem('volunteerToken', newToken);
            localStorage.removeItem('adminToken'); 
        } else {
         
            localStorage.setItem('token', newToken);
        }
        setToken(newToken);
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('volunteerToken');
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
