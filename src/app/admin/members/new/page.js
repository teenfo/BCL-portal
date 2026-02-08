"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewMemberPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "",
        phone: "",
        birthday: "",
        gender: "",
        plan: "Trial",
        credits: 1
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRegister = async () => {
        setLoading(true);
        try {
            // 1. Create a SECONDARY Supabase client for registration
            // This client does NOT persist sessions, preventing the admin from being logged out
            const { createClient } = await import('@supabase/supabase-js');
            const tempSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false, // Critical: do not save this session to local storage
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            // 2. SignUp using the TEMPORARY client
            const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                email: formData.email,
                password: formData.password || "bcl123456!",
                options: {
                    data: {
                        full_name: formData.name,
                        role: "user"
                    }
                }
            });

            if (authError) throw authError;

            // 3. Insert into public.members using the MAIN (Admin) client
            // We use the admin's session to write to the database (RLS allows this now)
            const { error: memberError } = await supabase
                .from("members")
                .upsert({
                    id: authData.user.id,
                    user_id: authData.user.id,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    status: "Active",
                    plan: formData.plan,
                    credits: formData.credits,
                    gender: formData.gender,
                    birthdate: formData.birthday || null,
                    joined_date: new Date().toISOString().split('T')[0]
                }, { onConflict: 'email' });

            if (memberError) {
                // Optional: If DB insert fails, we might want to clean up the auth user
                // but for now we just throw error
                console.error("Member DB Insert Error:", memberError);
                throw memberError;
            }

            alert("회원이 성공적으로 등록되었습니다.");
            router.push("/admin/members");
        } catch (error) {
            console.error("Registration error:", error);
            alert(`등록 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <header style={{ marginBottom: "32px", textAlign: "center" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>신규 회원 등록</h1>
                <p style={{ color: "var(--text-secondary)" }}>새로운 회원을 시스템에 직접 등록합니다.</p>
            </header>

            {/* Stepper UI */}
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "40px" }}>
                {[1, 2, 3].map(s => (
                    <div key={s} style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: step >= s ? "var(--brand-primary)" : "var(--bg-tertiary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "600",
                        transition: "all 0.3s"
                    }}>
                        {s}
                    </div>
                ))}
            </div>

            <div className="premium-card" style={{ padding: "32px" }}>
                {step === 1 && (
                    <div className="animate-fade-in">
                        <h3 style={{ marginBottom: "20px" }}>1. 계정 정보</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>이메일 (ID)</label>
                                <input name="email" type="email" value={formData.email} onChange={handleInputChange} style={inputStyle} placeholder="example@bcl.com" />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>비밀번호 (초기값)</label>
                                <input name="password" type="text" value={formData.password} onChange={handleInputChange} style={inputStyle} placeholder="미입력 시 bcl123456!" />
                            </div>
                            <button className="btn-primary" onClick={() => setStep(2)} style={{ marginTop: "12px" }}>다음 단계</button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fade-in">
                        <h3 style={{ marginBottom: "20px" }}>2. 개인 정보</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>이름</label>
                                <input name="name" value={formData.name} onChange={handleInputChange} style={inputStyle} placeholder="홍길동" />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>연락처</label>
                                <input name="phone" value={formData.phone} onChange={handleInputChange} style={inputStyle} placeholder="010-0000-0000" />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>생년월일</label>
                                    <input name="birthday" type="date" value={formData.birthday} onChange={handleInputChange} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>성별</label>
                                    <select name="gender" value={formData.gender} onChange={handleInputChange} style={inputStyle}>
                                        <option value="">선택 안함</option>
                                        <option value="Male">남성</option>
                                        <option value="Female">여성</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "16px" }}>
                                <button className="btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>이전</button>
                                <button className="btn-primary" onClick={() => setStep(3)} style={{ flex: 1 }}>다음 단계</button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fade-in">
                        <h3 style={{ marginBottom: "20px" }}>3. 멤버십 할당 (초기)</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>수강권 종류</label>
                                <select name="plan" value={formData.plan} onChange={handleInputChange} style={inputStyle}>
                                    <option value="Trial">Trial (1회권)</option>
                                    <option value="Standard 10">Standard 10회</option>
                                    <option value="Premium 30">Premium 30회</option>
                                    <option value="Infinite">Infinite (무제한)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>잔여 횟수 설정</label>
                                <input name="credits" type="number" value={formData.credits} onChange={handleInputChange} style={inputStyle} />
                            </div>
                            <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                                <button className="btn-secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>이전</button>
                                <button className="btn-primary" onClick={handleRegister} disabled={loading} style={{ flex: 1 }}>
                                    {loading ? "등록 중..." : "최종 등록"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-tertiary)",
    color: "white",
    fontSize: "0.95rem",
    outline: "none"
};
