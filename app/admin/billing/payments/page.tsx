export default function AdminBillingPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Billing & Payments</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface p-4 rounded-xl border border-border">
                    <p className="text-xs text-muted uppercase font-bold">Total Sales</p>
                    <p className="text-xl font-bold">$12,450</p>
                </div>
            </div>

            <div className="bg-surface rounded-2xl border border-border shadow-card overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="bg-surface2/30 text-muted font-medium border-b border-border">
                            <th className="p-4">Transaction ID</th>
                            <th className="p-4">Member</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        <tr className="hover:bg-surface2/20">
                            <td className="p-4 font-mono text-xs">TX_982348</td>
                            <td className="p-4">Alice Kim</td>
                            <td className="p-4 font-bold text-success">$99.00</td>
                            <td className="p-4 uppercase text-[10px] font-bold">Completed</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
