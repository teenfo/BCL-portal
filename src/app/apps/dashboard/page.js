export default function UserDashboard() {
    return (
        <div>
            <div className="card" style={{ marginBottom: '1rem' }}>
                <h2>Welcome back!</h2>
                <p>You have no bookings for today.</p>
            </div>

            <h3>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px' }}>
                    <span>📅</span>
                    <span>Book Class</span>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px' }}>
                    <span>🏢</span>
                    <span>Facilities</span>
                </div>
            </div>
        </div>
    );
}
