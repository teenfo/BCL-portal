<!DOCTYPE html>
<html lang="ko">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BCL Portal - Gym Management Simplified</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@100;200;300;400;500;600;700;800;900&display=swap"
        rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .text-gradient {
            background: linear-gradient(to right, #EC7A3C, #D35400);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .bg-gradient-primary {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        }
    </style>
</head>

<body class="d-flex flex-column h-100 bg-white text-slate-800">
    <main class="flex-shrink-0">
        <!-- Navigation-->
        <nav class="bg-white py-3 shadow-sm sticky top-0 z-50">
            <div class="container mx-auto px-5 flex justify-between items-center">
                <a class="text-2xl font-bold text-slate-900 hover:text-[#EC7A3C] transition-colors" href="/">
                    BCL Portal
                </a>
                <div class="flex items-center gap-4">
                    <a class="hidden sm:block text-slate-600 hover:text-[#EC7A3C] font-medium"
                        href="#features">Features</a>
                    <a class="hidden sm:block text-slate-600 hover:text-[#EC7A3C] font-medium" href="#about">About</a>
                    <a class="hidden sm:block text-slate-600 hover:text-[#EC7A3C] font-medium"
                        href="#contact">Contact</a>
                    <?php if (auth()->loggedIn()): ?>
                        <a class="px-5 py-2.5 bg-[#EC7A3C] text-white font-semibold rounded-full hover:bg-[#D35400] transition-all shadow-lg hover:shadow-xl"
                            href="/admin/dashboard">
                            Go to Admin
                        </a>
                    <?php else: ?>
                        <a class="px-5 py-2.5 outline outline-1 outline-slate-200 text-slate-700 font-semibold rounded-full hover:bg-slate-50 transition-all"
                            href="/login">
                            Log In
                        </a>
                    <?php endif; ?>
                </div>
            </div>
        </nav>

        <!-- Header-->
        <header class="py-20 lg:py-32 bg-slate-50 relative overflow-hidden">
            <!-- Background Blob -->
            <div class="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-50">
            </div>
            <div class="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-50">
            </div>

            <div class="container mx-auto px-5">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div class="text-center lg:text-left">
                        <div
                            class="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-wider text-[#EC7A3C] uppercase bg-orange-100 rounded-full">
                            Smart Management System
                        </div>
                        <h1
                            class="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
                            <span class="text-gradient">Automate</span> Your Gym Operations
                        </h1>
                        <p class="text-xl text-slate-500 mb-10 font-light leading-relaxed">
                            BCL Portal helps you manage members, sessions, payments, and coaches all in one place. Scale
                            your fitness business with meaningful insights.
                        </p>
                        <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <?php if (auth()->loggedIn()): ?>
                                <a class="px-8 py-4 bg-gradient-to-r from-[#EC7A3C] to-[#D35400] text-white font-bold rounded-full hover:from-[#D35400] hover:to-[#C0392B] transition-all shadow-lg hover:shadow-2xl transform hover:-translate-y-1 text-lg"
                                    href="/admin/dashboard">
                                    Enter Dashboard
                                </a>
                            <?php else: ?>
                                <a class="px-8 py-4 bg-gradient-to-r from-[#EC7A3C] to-[#D35400] text-white font-bold rounded-full hover:from-[#D35400] hover:to-[#C0392B] transition-all shadow-lg hover:shadow-2xl transform hover:-translate-y-1 text-lg"
                                    href="/login">
                                    Admin Login
                                </a>
                                <a class="px-8 py-4 bg-white text-slate-700 border border-slate-200 font-bold rounded-full hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md text-lg"
                                    href="#features">
                                    Explore Features
                                </a>
                            <?php endif; ?>
                        </div>
                    </div>
                    <div class="relative group">
                        <!-- Abstract Shapes -->
                        <div
                            class="absolute -inset-1 bg-gradient-to-r from-[#EC7A3C] to-[#D35400] rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200">
                        </div>
                        <div
                            class="relative bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform group-hover:scale-[1.01] transition duration-500">
                            <!-- Mockup of Dashboard -->
                            <div class="bg-slate-900 p-4 border-b border-slate-800 flex items-center gap-2">
                                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div class="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <div class="p-8 bg-slate-50">
                                <div class="flex gap-4 mb-6">
                                    <div class="w-1/4 h-32 bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                                        <div class="h-8 w-8 bg-orange-100 rounded-lg mb-3"></div>
                                        <div class="h-4 w-16 bg-slate-200 rounded mb-2"></div>
                                        <div class="h-6 w-10 bg-slate-800 rounded"></div>
                                    </div>
                                    <div class="w-1/4 h-32 bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                                        <div class="h-8 w-8 bg-blue-100 rounded-lg mb-3"></div>
                                        <div class="h-4 w-16 bg-slate-200 rounded mb-2"></div>
                                        <div class="h-6 w-10 bg-slate-800 rounded"></div>
                                    </div>
                                    <div
                                        class="w-1/2 h-32 bg-white rounded-xl shadow-sm p-4 border border-slate-100 flex items-center justify-center text-slate-300">
                                        Chart Visualization
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div class="h-12 w-full bg-white rounded-lg border border-slate-100 shadow-sm">
                                    </div>
                                    <div class="h-12 w-full bg-white rounded-lg border border-slate-100 shadow-sm">
                                    </div>
                                    <div class="h-12 w-full bg-white rounded-lg border border-slate-100 shadow-sm">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Features Section-->
        <section class="py-20" id="features">
            <div class="container mx-auto px-5">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-bold text-slate-900 mb-4">Why BCL Portal?</h2>
                    <p class="text-lg text-slate-500 max-w-2xl mx-auto">Everything you need to run your center
                        efficiently, from member tracking to financial reports.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <!-- Feature 1 -->
                    <div
                        class="p-8 bg-white rounded-3xl border border-slate-100 shadow-lg hover:shadow-xl transition-shadow text-center group">
                        <div
                            class="w-16 h-16 mx-auto bg-orange-50 text-[#EC7A3C] rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300">
                            <i class="fas fa-users"></i>
                        </div>
                        <h3 class="text-xl font-bold text-slate-900 mb-3">Member Management</h3>
                        <p class="text-slate-500">Track profiles, memberships, and attendance with ease. Never lose
                            sight of your members.</p>
                    </div>
                    <!-- Feature 2 -->
                    <div
                        class="p-8 bg-white rounded-3xl border border-slate-100 shadow-lg hover:shadow-xl transition-shadow text-center group">
                        <div
                            class="w-16 h-16 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <h3 class="text-xl font-bold text-slate-900 mb-3">Data Analytics</h3>
                        <p class="text-slate-500">Visualize revenue, retention rates, and session popularity with our
                            powerful reports.</p>
                    </div>
                    <!-- Feature 3 -->
                    <div
                        class="p-8 bg-white rounded-3xl border border-slate-100 shadow-lg hover:shadow-xl transition-shadow text-center group">
                        <div
                            class="w-16 h-16 mx-auto bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <h3 class="text-xl font-bold text-slate-900 mb-3">Session Scheduling</h3>
                        <p class="text-slate-500">Organize classes, assign coaches, and manage bookings smoothly and
                            effectively.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- About/Stats Section -->
        <section class="py-20 bg-slate-900 text-white rounded-3xl mx-5 mb-20 relative overflow-hidden" id="about">
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800"></div>
            <!-- Decorative Circles -->
            <div class="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-[#EC7A3C] rounded-full blur-3xl opacity-20">
            </div>
            <div class="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20">
            </div>

            <div class="container mx-auto px-5 relative z-10">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 class="text-3xl md:text-5xl font-bold mb-6">Designed for Growth</h2>
                        <p class="text-slate-300 text-lg mb-8 leading-relaxed">
                            BCL Portal isn't just an admin panel; it's a growth engine. We focus on minimizing
                            administrative friction so you can focus on your members.
                        </p>
                        <ul class="space-y-4">
                            <li class="flex items-center gap-3">
                                <span
                                    class="w-6 h-6 rounded-full bg-[#EC7A3C] flex items-center justify-center text-xs"><i
                                        class="fas fa-check"></i></span>
                                <span class="text-slate-200">Real-time Dashboard</span>
                            </li>
                            <li class="flex items-center gap-3">
                                <span
                                    class="w-6 h-6 rounded-full bg-[#EC7A3C] flex items-center justify-center text-xs"><i
                                        class="fas fa-check"></i></span>
                                <span class="text-slate-200">Responsive Mobile Design</span>
                            </li>
                            <li class="flex items-center gap-3">
                                <span
                                    class="w-6 h-6 rounded-full bg-[#EC7A3C] flex items-center justify-center text-xs"><i
                                        class="fas fa-check"></i></span>
                                <span class="text-slate-200">Secure Role-based Access</span>
                            </li>
                        </ul>
                    </div>
                    <div class="grid grid-cols-2 gap-6">
                        <div class="p-6 bg-slate-800 rounded-2xl border border-slate-700 text-center">
                            <div class="text-4xl font-bold text-[#EC7A3C] mb-2">99%</div>
                            <div class="text-sm text-slate-400 font-medium tracking-wide">Uptime</div>
                        </div>
                        <div class="p-6 bg-slate-800 rounded-2xl border border-slate-700 text-center">
                            <div class="text-4xl font-bold text-blue-400 mb-2">24/7</div>
                            <div class="text-sm text-slate-400 font-medium tracking-wide">Monitoring</div>
                        </div>
                        <div class="p-6 bg-slate-800 rounded-2xl border border-slate-700 text-center col-span-2">
                            <div class="text-4xl font-bold text-white mb-2">Secure</div>
                            <div class="text-sm text-slate-400 font-medium tracking-wide">Encryption & Auth</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Footer-->
        <footer class="bg-white py-10 border-t border-slate-100">
            <div class="container mx-auto px-5 text-center">
                <div class="flex justify-center items-center gap-6 mb-8">
                    <a class="text-slate-400 hover:text-[#EC7A3C] text-2xl transition-colors" href="#"><i
                            class="fab fa-twitter"></i></a>
                    <a class="text-slate-400 hover:text-[#EC7A3C] text-2xl transition-colors" href="#"><i
                            class="fab fa-linkedin-in"></i></a>
                    <a class="text-slate-400 hover:text-[#EC7A3C] text-2xl transition-colors" href="#"><i
                            class="fab fa-github"></i></a>
                </div>
                <div class="text-slate-500 mb-2">
                    &copy; 2026 BCL Portal. All rights reserved.
                </div>
                <div class="text-sm text-slate-400">
                    <a href="#" class="hover:text-slate-600">Privacy Policy</a>
                    <span class="mx-2">&middot;</span>
                    <a href="#" class="hover:text-slate-600">Terms of Service</a>
                </div>
            </div>
        </footer>
    </main>
</body>

</html>