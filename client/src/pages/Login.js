
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const BACKEND_URL = process.env.REACT_APP_API_URL;


const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('volunteer'); 
    const [isSignUpMode, setIsSignUpMode] = useState(false); 

    // Sign-up specific states
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const navigate = useNavigate();

    const loginContainerStyle = {
        maxWidth: '450px',
        width: '90%',
        margin: '2rem auto',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 15px 50px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e0e6ed',
        overflow: 'hidden',
        padding: '2.5rem',
        textAlign: 'center',
        fontFamily: 'Inter, sans-serif',
        color: '#333',
        lineHeight: '1.6',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 4rem)',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: '1',
        background: 'linear-gradient(145deg, #f9f9f9, #f0f2f5)'
    };

    const loginHeaderStyle = {
        marginBottom: '2rem',
        padding: '1.5rem 1rem',
        backgroundColor: '#2c3e50',
        borderRadius: '12px',
        color: '#ecf0f1',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)'
    };

    const loginHeaderH2Style = {
        fontSize: '2.2rem',
        color: '#ecf0f1',
        marginBottom: '0.8rem',
        fontWeight: '700',
        letterSpacing: '-0.04rem',
        textTransform: 'uppercase',
        display: 'inline-block',
        padding: '0',
        position: 'relative',
        zIndex: '1',
    };

    const loginTaglineStyle = {
        fontSize: '0.9rem',
        color: '#ffffff',
        fontStyle: 'italic',
        marginTop: '0.5rem',
        lineHeight: '1.4',
        opacity: '0.9',
        position: 'relative',
        zIndex: '1',
        maxWidth: '100%',
        textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
    };

    // Inline styles for the form
    const loginFormStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.2rem',
        padding: '1.5rem 0',
        width: '100%',
        borderTop: '1px dashed #e9e9e9',
        marginTop: '2rem'
    };

    const formGroupStyle = {
        textAlign: 'left',
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '0.6rem',
        fontWeight: '600',
        color: '#555',
        fontSize: '0.95rem',
    };

    const inputSelectStyle = {
        width: '100%',
        padding: '0.9rem 1.2rem',
        border: '1px solid #d0d0d0',
        borderRadius: '10px',
        fontSize: '1rem',
        color: '#333',
        boxSizing: 'border-box',
    };

    const loginButtonStyle = {
        width: '100%',
        padding: '1.1rem',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1.2rem',
        fontWeight: '700',
        cursor: 'pointer',
        backgroundColor: '#007bff',
        color: 'white',
        backgroundImage: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
        boxShadow: '0 6px 15px rgba(0, 0, 0, 0.15)',
        marginTop: '2rem',
        letterSpacing: '0.03em',
        transition: 'all 0.3s ease',
    };

    const signupButtonStyle = {
        ...loginButtonStyle, //
        backgroundColor: '#2ecc71', 
        backgroundImage: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
    };


    // Style for the toggle link text
    const toggleTextStyle = {
        marginTop: '1.5rem',
        fontSize: '0.9rem',
        color: '#666',
    };

    // Style for the toggle link
    const toggleLinkStyle = {
        color: '#3498db',
        textDecoration: 'none',
        fontWeight: '600',
        marginLeft: '0.3rem',
        cursor: 'pointer',
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const endpoint = role === 'admin' ? '/api/admin/login' : '/api/volunteers/login';
            // const res = await axios.post(`http://localhost:8080${endpoint}`, { email, password });

            const res = await axios.post(`${BACKEND_URL}${endpoint}`, { email, password });

            const { token, admin, volunteer } = res.data;

            if (!token) {
                toast.error("No token received. Login failed.");
                return;
            }

            if (role === 'admin') {
                localStorage.setItem('adminToken', token);
                localStorage.setItem('adminId', admin?.id || '');
                localStorage.setItem('adminName', admin?.name || '');
                toast.success('Admin login successful!');
                navigate('/admin-dashboard');
            } else {
                localStorage.setItem('volunteerToken', token);
                localStorage.setItem('volunteerId', volunteer?.id || '');
                localStorage.setItem('volunteerName', volunteer?.name || '');
                toast.success('Volunteer login successful!');
                navigate('/volunteer-dashboard');
            }

        } catch (err) {
            console.error("Login error:", err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.error || err.response?.data?.msg || 'Login failed. Please check your credentials.';
            toast.error(errorMessage);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (!name || !email || !password || !phone) {
            toast.error("Please fill in all fields");
            return;
        }

        try {
            // const res = await axios.post('http://localhost:8080/api/volunteers/register', { name, email, password, phone });

            const res = await axios.post(`${BACKEND_URL}/api/volunteers/register`, { name, email, password, phone });

         
            const { token, volunteer } = res.data;

            if (token && volunteer?._id) {
               
                localStorage.setItem('volunteerToken', token);
                localStorage.setItem('volunteerId', volunteer._id);
                localStorage.setItem('volunteerName', volunteer.name);
                toast.success("Signup successful! Redirecting to dashboard. 🎉");
                navigate('/volunteer-dashboard');
            } else {
              
                toast.info("Registration successful! Your account is awaiting admin approval. Please wait");
                setIsSignUpMode(false); 
              
                setName('');
                setEmail('');
                setPassword('');
                setPhone('');
            }
        } catch (err) {
            console.error("Signup error:", err?.response?.data?.message || err.message);
            toast.error(err?.response?.data?.message || "Signup failed. Please try again.");
        }
    };

    return (
        <div style={loginContainerStyle}>
            <ToastContainer />
            <div style={loginHeaderStyle}>
                <h2 style={loginHeaderH2Style}>ResQLink {isSignUpMode ? 'Sign Up' : 'Login'} {isSignUpMode ? '🤝' : '🔑'}</h2>
                <p style={loginTaglineStyle}>
                    {isSignUpMode
                        ? "Join us in making a difference! Register here to become a volunteer."
                        : "Access your dashboard to manage crucial disaster relief efforts."
                    }
                </p>
            </div>

            {isSignUpMode ? (
                // Sign Up Form
                <form onSubmit={handleSignUp} style={loginFormStyle}>
                    <div style={formGroupStyle}>
                        <label htmlFor="name-input" style={labelStyle}>Name:</label>
                        <input
                            id="name-input"
                            type="text"
                            placeholder="Your Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            style={inputSelectStyle}
                        />
                    </div>
                    <div style={formGroupStyle}>
                        <label htmlFor="signup-email-input" style={labelStyle}>Email:</label>
                        <input
                            id="signup-email-input"
                            type="email"
                            placeholder="your.email@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={inputSelectStyle}
                        />
                    </div>
                    <div style={formGroupStyle}>
                        <label htmlFor="signup-password-input" style={labelStyle}>Password:</label>
                        <input
                            id="signup-password-input"
                            type="password"
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={inputSelectStyle}
                        />
                    </div>
                    <div style={formGroupStyle}>
                        <label htmlFor="phone-input" style={labelStyle}>Phone:</label>
                        <input
                            id="phone-input"
                            type="text"
                            placeholder="Your Phone Number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            style={inputSelectStyle}
                        />
                    </div>
                    <button type="submit" style={signupButtonStyle}>
                        Sign Up
                    </button>
                </form>
            ) : (
                // Login Form
                <form onSubmit={handleLogin} style={loginFormStyle}>
                    <div style={formGroupStyle}>
                        <label htmlFor="role-select" style={labelStyle}>Login as:</label>
                        <select
                            id="role-select"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            style={inputSelectStyle}
                        >
                            <option value="volunteer">Volunteer</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div style={formGroupStyle}>
                        <label htmlFor="login-email-input" style={labelStyle}>Email:</label>
                        <input
                            id="login-email-input"
                            type="email"
                            placeholder="your.email@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            style={inputSelectStyle}
                        />
                    </div>

                    <div style={formGroupStyle}>
                        <label htmlFor="login-password-input" style={labelStyle}>Password:</label>
                        <input
                            id="login-password-input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            style={inputSelectStyle}
                        />
                    </div>

                    <button type="submit" style={loginButtonStyle}>
                        Login
                    </button>
                </form>
            )}

            <p style={toggleTextStyle}>
                {isSignUpMode ? "Already have an account?" : "Don't have an account?"}
                <span
                    onClick={() => setIsSignUpMode(!isSignUpMode)}
                    style={toggleLinkStyle}
                >
                    {isSignUpMode ? " Log In" : " Sign Up as Volunteer"}
                </span>
            </p>
        </div>
    );
};

export default Login;
