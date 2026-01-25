export default function MemberListPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Member Management</h1>
                <button className="bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-bold shadow-card">Add Member</button>
            </div>

            <div className="bg-surface rounded-2xl border border-border shadow-card overflow-hidden">
                <div className="p-4 border-b border-border bg-surface2/50 flex gap-4">
                    <input type="text" placeholder="Search members..." className="flex-1 bg-surface border border-border px-4 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                    <select className="bg-surface border border-border px-4 py-2 rounded-lg text-sm outline-none">
                        <option>All Tiers</option>
                        <option>Gold</option>
                        <option>Silver</option>
                    </select>
                </div>
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="bg-surface2/30 text-muted font-medium border-b border-border">
                            <th className="p-4">Name</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Join Date</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {[1, 2, 3].map((i) => (
                            <tr key={i} className="hover:bg-surface2/20 transition-colors">
                                <td className="p-4 font-medium">Member #{i}00</td>
                                <td className="p-4 text-success text-xs font-bold uppercase">Active</td>
                                <td className="p-4 text-muted">2026-01-01</td>
                                <td className="p-4 text-primary text-xs font-bold cursor-pointer">View Details</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
