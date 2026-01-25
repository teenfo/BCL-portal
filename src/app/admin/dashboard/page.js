export default function AdminDashboard() {
    return (
        <div>
            <h1>Admin Dashboard</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                <div className="card">
                    <h3>Total Members</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>0</p>
                </div>
                <div className="card">
                    <h3>Active Sessions</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>0</p>
                </div>
                <div className="card">
                    <h3>Today's check-ins</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>0</p>
                </div>
            </div>
        </div>
    );
}
