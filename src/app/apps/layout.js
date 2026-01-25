import '../globals.css';

export const metadata = {
    title: 'BCL Portal',
    description: 'Experience the best facilities',
};

export default function UserLayout({ children }) {
    return (
        <div className="apps-container">
            <header className="apps-header">
                <div className="app-title">BCL Portal</div>
            </header>
            <main className="apps-content">
                {children}
            </main>
            <nav className="bottom-nav">
                <a href="/apps/dashboard" className="nav-item">
                    <span className="icon">🏠</span>
                    <span className="label">Home</span>
                </a>
                <a href="/apps/schedule" className="nav-item">
                    <span className="icon">📅</span>
                    <span className="label">Schedule</span>
                </a>
                <a href="/apps/checkin" className="nav-item">
                    <span className="icon">QR</span>
                    <span className="label">Check-in</span>
                </a>
                <a href="/apps/facilities" className="nav-item">
                    <span className="icon">🏢</span>
                    <span className="label">Facilities</span>
                </a>
                <a href="/apps/profile" className="nav-item">
                    <span className="icon">👤</span>
                    <span className="label">Profile</span>
                </a>
            </nav>
            <style jsx>{`
        .apps-container {
          padding-bottom: var(--bottom-nav-height);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .apps-header {
          height: var(--header-height);
          background: var(--card-bg);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          padding: 0 1rem;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .app-title {
          font-weight: bold;
          font-size: 1.25rem;
        }
        .apps-content {
          flex: 1;
          padding: 1rem;
        }
        .bottom-nav {
          height: var(--bottom-nav-height);
          background: var(--card-bg);
          border-top: 1px solid var(--border-color);
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-around;
          align-items: center;
          z-index: 10;
        }
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 0.75rem;
          color: var(--text-dim);
          flex: 1;
        }
        .nav-item .icon {
          font-size: 1.5rem;
          margin-bottom: 2px;
        }
        .nav-item:hover {
          color: var(--primary);
        }
      `}</style>
        </div>
    );
}
