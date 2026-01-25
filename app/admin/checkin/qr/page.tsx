"use client";

import { QrCode, Camera, ShieldCheck, RefreshCw, Smartphone, Monitor } from "lucide-react";
import { useState } from "react";

export default function AdminQRScannerPage() {
    const [isScanning, setIsScanning] = useState(false);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-black tracking-tight">Access Control (Scanner)</h1>
                <p className="text-muted text-sm font-medium mt-1">Set up or use the terminal for member check-ins.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Scanner Terminal UI */}
                <div className="bg-fg text-bg rounded-[3rem] p-10 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]">
                    {/* Scan Overlay Effect */}
                    {isScanning && (
                        <div className="absolute inset-0 bg-primary/10 overflow-hidden pointer-events-none">
                            <div className="w-full h-1 bg-primary shadow-[0_0_20px_rgba(var(--primary-rgb),1)] animate-scan"></div>
                        </div>
                    )}

                    <div className="relative z-10 text-center space-y-8">
                        <div className="w-24 h-24 bg-surface2/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-surface2/20">
                            <QrCode size={48} className="text-bg opacity-30" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black tracking-tighter">Ready to Scan</h2>
                            <p className="text-surface2 opacity-50 text-sm font-medium mt-2">Position the member's QR code within the frame</p>
                        </div>

                        <button
                            onClick={() => setIsScanning(!isScanning)}
                            className={`px-10 py-5 rounded-[2rem] font-black text-lg transition-all active:scale-95 ${isScanning ? 'bg-danger text-white' : 'bg-primary text-on-primary shadow-xl shadow-primary/40'
                                }`}
                        >
                            {isScanning ? 'Stop Terminal' : 'Launch Terminal'}
                        </button>
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute bottom-10 left-10 flex items-center gap-3 text-surface2/30">
                        <Monitor size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Kiosk Mode Active</span>
                    </div>
                    <div className="absolute bottom-10 right-10 flex items-center gap-3 text-primary/40">
                        <ShieldCheck size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Encrypted Stream</span>
                    </div>
                </div>

                {/* Configuration & Logs */}
                <div className="space-y-6">
                    <section className="bg-surface p-8 rounded-3xl border border-border shadow-soft">
                        <h3 className="text-sm font-bold flex items-center gap-2 mb-6">
                            <Camera size={18} className="text-primary" />
                            Scanner Settings
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-surface2/50 rounded-2xl">
                                <div>
                                    <p className="text-xs font-bold">Auto-Verify Benefits</p>
                                    <p className="text-[10px] text-muted">Automatically check membership status</p>
                                </div>
                                <div className="w-10 h-6 bg-success rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-surface2/50 rounded-2xl opacity-60">
                                <div>
                                    <p className="text-xs font-bold">External HID Support</p>
                                    <p className="text-[10px] text-muted">Connect physical laser scanners via USB</p>
                                </div>
                                <div className="w-10 h-6 bg-surface border border-border rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-muted rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-surface rounded-3xl border border-border shadow-soft overflow-hidden">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-surface2/30">
                            <h3 className="text-sm font-bold">Recent Entries</h3>
                            <RefreshCw size={14} className="text-muted cursor-pointer hover:rotate-180 transition-transform duration-500" />
                        </div>
                        <div className="divide-y divide-border">
                            {[
                                { name: "Alice Kim", time: "09:12:45 AM", branch: "Central", status: "Access Granted" },
                                { name: "David Park", time: "09:10:12 AM", branch: "Central", status: "Access Granted" },
                                { name: "Susie Lee", time: "08:55:30 AM", branch: "Central", status: "Plan Expired", error: true },
                            ].map((log, i) => (
                                <div key={i} className="p-4 flex items-center justify-between hover:bg-surface2/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-8 rounded-full ${log.error ? 'bg-danger' : 'bg-success'}`}></div>
                                        <div>
                                            <p className="text-xs font-bold tracking-tight">{log.name}</p>
                                            <p className="text-[10px] text-muted font-medium">{log.time} • {log.branch}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase italic ${log.error ? 'text-danger' : 'text-success'}`}>
                                        {log.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
