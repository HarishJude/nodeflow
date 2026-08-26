import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Plus, FolderKanban, LogOut, ArrowRight } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const [user, setUser] = useState({ name: 'Developer', email: '' });
  const [canvases, setCanvases] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Load current user from localStorage
    const savedUser = JSON.parse(localStorage.getItem('nodeflow_current_user'));
    if (savedUser) {
      setUser(savedUser);
    } else {
      setUser({ name: 'Harish', email: 'developer@nodeflow.io' });
    }

    // Load actual saved workspaces (defaults to empty array if none exist)
    const savedCanvases = JSON.parse(localStorage.getItem('nodeflow_canvases') || '[]');
    setCanvases(savedCanvases);
  }, []);

  const handleCreateCanvas = () => {
    const title = prompt('Enter workspace name:', 'New Architecture Map');
    if (!title) return;

    const newCanvas = {
      id: Date.now().toString(),
      title,
      description: 'Custom system workflow layout.',
      updatedAt: 'Just now'
    };

    const updated = [newCanvas, ...canvases];
    setCanvases(updated);
    localStorage.setItem('nodeflow_canvases', JSON.stringify(updated));
    navigate(`/canvas/${newCanvas.id}`);
  };

  const handleSignOut = () => {
    localStorage.removeItem('nodeflow_current_user');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Top Navbar */}
      <header className="dashboard-header">
        <div className="dashboard-logo">
          <Network size={22} color="#2563EB" />
          <span>NodeFlow Workspace</span>
        </div>
        <div className="dashboard-user-menu">
          <span className="user-badge">{user.name}</span>
          <button onClick={handleSignOut} className="signout-btn">
            <LogOut size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-main">
        <div className="dashboard-intro">
          <div>
            <h1>Welcome back, {user.name.split(' ')[0]} 👋</h1>
            <p>Manage your architecture maps and system flowcharts.</p>
          </div>
          <button onClick={handleCreateCanvas} className="create-canvas-btn">
            <Plus size={16} />
            <span>New Workspace</span>
          </button>
        </div>

        {/* Canvases Grid or Empty State */}
        {canvases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.08)', marginTop: '20px' }}>
            <FolderKanban size={48} color="#64748B" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', color: '#F8FAFC', marginBottom: '8px' }}>No workspaces found</h3>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>Create your first architecture map to start designing workflows.</p>
            <button onClick={handleCreateCanvas} className="create-canvas-btn" style={{ margin: '0 auto' }}>
              <Plus size={16} />
              <span>Create Workspace</span>
            </button>
          </div>
        ) : (
          <div className="canvas-grid">
            {canvases.map((canvas) => (
              <div 
                key={canvas.id} 
                className="canvas-card"
                onClick={() => navigate(`/canvas/${canvas.id}`)}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <FolderKanban size={20} color="#3B82F6" />
                    <ArrowRight size={16} color="#64748B" />
                  </div>
                  <h3>{canvas.title}</h3>
                  <p>{canvas.description}</p>
                </div>
                <div className="canvas-card-footer">
                  <span>Updated {canvas.updatedAt}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
