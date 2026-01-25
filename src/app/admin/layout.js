import '../globals.css';

export const metadata = {
    title: 'BCL Portal Admin',
    description: 'Management Portal for BCL Portal',
};

export default function AdminLayout({ children }) {
    return (
        <div className="admin-container">
            <aside className="sidebar">
                <div className="logo">BCL Admin</div>
                <nav>
                    <ul>
                        <li><a href="/admin/dashboard">Dashboard</a></li>
                        <li><a href="/admin/members">Members</a></li>
                        <li><a href="/admin/sessions/schedule">Schedule</a></li>
                        <li><a href="/admin/settings/facility">Settings</a></li>
                    </ul>
                </nav>
                <div className="footer">
                    <a href="/auth/logout">Logout</a>
                </div>
            </aside>
            <main className="content">
                {children}
            </main>
            <style jsx>{`
        .admin-container {
          display: flex;
          min-height: 100vh;
        }
        .sidebar {
          width: var(--sidebar-width);
          background: var(--sidebar-bg);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          position: fixed;
          height: 100vh;
        }
        .logo {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 2rem;
          color: var(--primary);
        }
        nav ul {
          list-style: none;
        }
        nav li {
          margin-bottom: 0.5rem;
        }
        nav a {
          display: block;
          padding: 0.75rem 1rem;
          border-radius: var(--radius);
          transition: background 0.2s;
        }
        nav a:hover {
          background: var(--accent);
          color: var(--primary);
        }
        .footer {
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }
        .content {
          margin-left: var(--sidebar-width);
          flex: 1;
          padding: 2rem;
        }
      `}</style>
        </div>
    );
}
