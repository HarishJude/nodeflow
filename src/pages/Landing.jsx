import { Link } from 'react-router-dom';
import { Network, Sparkles, ArrowRight, StickyNote, StickyNotePlus } from 'lucide-react';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing-container">
      
      {/* Navbar */}
      <header className="landing-header">
        <div className="logo-area">
          <div className="logo-icon">
            <Network size={24} />
          </div>
          <span className="logo-text">NodeFlow</span>
        </div>
        <div className="nav-links">
          <Link to="/login" className="signin-btn">Sign In</Link>
          <Link to="/dashboard" className="get-started-btn">Get Started Free</Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="landing-hero">
        <div className="hero-badge">
          <StickyNotePlus size={14} />
          <span>A Smarter Way to Organize Your Ideas</span>
        </div>

        <h1>
          Map your ideas with <br />
          <span className="gradient-text">absolute clarity.</span>
        </h1>

        <p className="hero-desc">
          NodeFlow is a lightning-fast, highly interactive visual workspace designed for developers, architects, and thinkers to map workflows, brainstorm, and connect thoughts effortlessly.
        </p>

        <div className="hero-actions">
          <Link to="/dashboard" className="primary-action-btn">
            <span>Launch Workspace</span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/login" className="secondary-action-btn">
            Explore Demo
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 NodeFlow.</p>
      </footer>
    </div>
  );
}
