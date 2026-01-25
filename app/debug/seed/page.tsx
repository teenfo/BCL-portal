"use client";

import { useState } from "react";
import { createClient } from "@/assets/theme/hooks/supabase";

export default function SeedPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    const runSeeding = async () => {
        setLoading(true);
        setLogs([]);
        addLog("Starting SDK Seeding...");

        const users = [
            { email: "alice@test.com", password: "123456", name: "Alice Kim" },
            { email: "admin@bcl.com", password: "123456", name: "System Admin" }
        ];

        for (const user of users) {
            addLog(`Creating ${user.email}...`);
            const { data, error } = await supabase.auth.signUp({
                email: user.email,
                password: user.password,
                options: {
                    data: { full_name: user.name }
                }
            });

            if (error) {
                addLog(`❌ Error: ${error.message}`);
                // Continue to next user
            } else if (data.user) {
                addLog(`✅ Created ${user.email} (ID: ${data.user.id})`);
            }
        }

        addLog("SDK operations finished. Verification pending via SQL...");
        setLoading(false);
    };

    return (
        <div className="p-8 font-mono bg-surface min-h-screen text-fg">
            <h1 className="text-xl font-bold mb-4">Auth SDK Seeder</h1>
            <button
                onClick={runSeeding}
                disabled={loading}
                className="bg-primary text-on-primary px-4 py-2 rounded disabled:opacity-50"
            >
                {loading ? "Running..." : "Run Seeding"}
            </button>
            <div className="mt-4 bg-bg border border-border p-4 rounded h-96 overflow-auto">
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    );
}
