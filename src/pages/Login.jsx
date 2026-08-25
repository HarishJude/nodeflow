import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import WorkflowCanvas from '../components/WorkflowCanvas';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      const existingUsers = JSON.parse(localStorage.getItem('nodeflow_users') || '[]');
      
      // Find matching user
      const validUser = existingUsers.find(
        (user) => user.email === email && user.password === password
      );

      // Fallback for quick testing if no users registered yet
      const isDefaultMock = email === 'developer@nodeflow.io' && password;

      if (validUser || isDefaultMock) {
        const userData = validUser || { name: 'Jude Harish', email };
        localStorage.setItem('nodeflow_current_user', JSON.stringify(userData));
        setLoading(false);
        navigate('/dashboard');
      } else {
        setError('Invalid credentials or account does not exist. Please sign up first.');
        setLoading(false);
      }
    }, 800);
  };


  return (
    <div className="login-wrapper" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <WorkflowCanvas />
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h2>NodeFlow Access</h2>
            <p>Authenticate via Auth Microservice</p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="developer@nodeflow.io"
                required 
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••••••"
                required 
              />
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#64748B' }}>
            Don't have an account? <Link to="/register" style={{ color: '#2196F3', textDecoration: 'none', fontWeight: '600' }}>Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
