import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import WorkflowCanvas from '../components/WorkflowCanvas';
import './Login.css'; // Reusing your clean login styling classes

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

   const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      if (name && email && password) {
        // Fetch existing users or initialize empty array
        const existingUsers = JSON.parse(localStorage.getItem('nodeflow_users') || '[]');
        
        // Check if email already exists
        const userExists = existingUsers.some(user => user.email === email);
        if (userExists) {
          setError('An account with this email already exists.');
          setLoading(false);
          return;
        }

        // Save new user
        const newUser = { name, email, password };
        existingUsers.push(newUser);
        localStorage.setItem('nodeflow_users', JSON.stringify(existingUsers));
        
        // Set current active session
        localStorage.setItem('nodeflow_current_user', JSON.stringify(newUser));

        setLoading(false);
        navigate('/dashboard');
      } else {
        setError('Please fill in all fields to create your account.');
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
            <h2>Create Account</h2>
            <p>Start mapping your architecture with NodeFlow</p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Jude Harish"
                required 
              />
            </div>

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
              {loading ? 'Creating Workspace...' : 'Sign Up'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#64748B' }}>
            Already have an account? <Link to="/login" style={{ color: '#2196F3', textDecoration: 'none', fontWeight: '600' }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
