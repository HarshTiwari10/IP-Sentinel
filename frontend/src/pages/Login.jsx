import React, { useState } from 'react';

export default function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    const endpoint = isLogin ? "http://localhost:5000/api/login" : "http://localhost:5000/api/register";
    const payload = isLogin
      ? { username, password }
      : { username, password, role };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || (isLogin ? "Login failed" : "Registration failed"));
      }

      if (isLogin) {
       // Save token
        localStorage.setItem("token", data.token);

        // 🔥 SAVE ROLE (THIS WAS MISSING)
        localStorage.setItem("role", data.role);

        // Redirect based on role
      if (data.role === "ADMIN") {
          window.location.href = "/admin-dashboard";
  } else {
    window.location.href = "/dashboard";
  }
      } else {
        setSuccessMsg("Registration successful! Please log in.");
        setIsLogin(true); // Switch to login view
        setUsername(""); // Clear username for security
        setPassword(""); // Clear password for security
      }

    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-4 sm:p-8 font-sans text-slate-800">
      <div className="w-full max-w-[1100px] flex flex-col md:flex-row bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        
        {/* Left Side - Illustration Frame */}
        <div className="hidden md:flex w-1/2 p-12 items-center justify-center relative bg-[#fafbfc] border-r border-gray-100">
          <div className="w-full max-w-[500px] aspect-[5/4] relative hover:scale-105 transition-transform duration-500">
            {/* Custom Inline SVG Illustration matching the requested style */}
            <svg viewBox="0 0 500 400" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Bookshelves */}
              <rect x="70" y="80" width="160" height="4" fill="#e2e8f0" />
              <rect x="70" y="130" width="160" height="4" fill="#e2e8f0" />
              
              {/* Items on shelves */}
              <path d="M80 60 h15 v20 h-15 z" fill="#cbd5e1" />
              <path d="M100 55 h10 v25 h-10 z" fill="#94a3b8" />
              <path d="M130 65 l10 -10 l10 10 v15 h-20 z" fill="#e2e8f0" />
              
              <path d="M85 110 h8 v20 h-8 z" fill="#94a3b8" />
              <path d="M96 110 h8 v20 h-8 z" fill="#cbd5e1" />
              <path d="M107 110 h8 v20 h-8 z" fill="#94a3b8" />
              
              {/* Clock on shelf */}
              <circle cx="210" cy="115" r="12" fill="white" stroke="#cbd5e1" strokeWidth="3" />
              <path d="M210 108 v7 h5" stroke="#94a3b8" strokeWidth="2" fill="none" />

              {/* Desk */}
              <rect x="30" y="210" width="280" height="6" fill="#e2e8f0" />
              <rect x="50" y="216" width="6" height="84" fill="#cbd5e1" />
              
              {/* Drawer Unit */}
              <rect x="230" y="225" width="70" height="75" fill="#3f3f46" />
              <rect x="230" y="225" width="70" height="23" fill="#4b5563" />
              <rect x="250" y="235" width="30" height="3" fill="#cbd5e1" />
              <rect x="230" y="251" width="70" height="23" fill="#4b5563" />
              <rect x="250" y="261" width="30" height="3" fill="#cbd5e1" />
              <rect x="230" y="277" width="70" height="23" fill="#4b5563" />
              <rect x="250" y="287" width="30" height="3" fill="#cbd5e1" />

              {/* Small Plant on Desk */}
              <rect x="55" y="195" width="16" height="15" fill="#3f3f46" />
              <path d="M55 195 Q 60 180 50 170 Q 60 180 63 195 Z" fill="#6b62ff" />
              <path d="M71 195 Q 66 180 76 170 Q 66 180 63 195 Z" fill="#6b62ff" />

              {/* Monitor */}
              <rect x="120" y="140" width="95" height="65" rx="4" fill="#3f3f46" />
              <rect x="125" y="145" width="85" height="50" rx="2" fill="white" />
              <path d="M150 205 l10 20 h10 l10 -20 z" fill="#cbd5e1" />
              <rect x="140" y="220" width="50" height="5" fill="#94a3b8" />
              
              {/* Monitor Content */}
              <rect x="195" y="145" width="15" height="12" fill="#6b62ff" />
              <circle cx="135" cy="155" r="2" fill="#3f3f46" />
              <rect x="142" y="154" width="30" height="2" fill="#3f3f46" />
              <circle cx="135" cy="162" r="2" fill="#3f3f46" />
              <rect x="142" y="161" width="40" height="2" fill="#6b62ff" />
              <circle cx="135" cy="169" r="2" fill="#3f3f46" />
              <rect x="142" y="168" width="25" height="2" fill="#3f3f46" />

              {/* Clipboard */}
              <rect x="245" y="170" width="30" height="40" rx="2" fill="white" stroke="#e2e8f0" strokeWidth="2" />
              <circle cx="260" cy="175" r="2" fill="#94a3b8" />
              <rect x="250" y="185" width="5" height="2" fill="#94a3b8" />
              <rect x="258" y="185" width="12" height="2" fill="#cbd5e1" />
              <rect x="250" y="192" width="5" height="2" fill="#94a3b8" />
              <rect x="258" y="192" width="12" height="2" fill="#cbd5e1" />
              <rect x="250" y="199" width="5" height="2" fill="#94a3b8" />
              <rect x="258" y="199" width="12" height="2" fill="#cbd5e1" />

              {/* Person & Chair */}
              {/* Legs */}
              <rect x="135" y="240" width="12" height="50" fill="#3f3f46" />
              <rect x="148" y="240" width="12" height="50" fill="#3f3f46" />
              <path d="M130 290 h20 v8 h-20 z" fill="#1e293b" rx="3" />
              <path d="M145 290 h20 v8 h-20 z" fill="#1e293b" rx="3" />
              
              {/* Body */}
              <path d="M100 180 Q 110 160 130 160 L 150 220 C 150 230 140 240 120 240 Z" fill="#4b5563" />
              <path d="M100 180 Q 110 160 130 160 L 140 200 Z" fill="#3f3f46" />
              
              {/* Head & Hair */}
              <circle cx="115" cy="150" r="16" fill="#fca5a5" />
              <path d="M95 150 C 95 130 120 125 125 140 C 130 155 110 170 95 160 Z" fill="#1e293b" />
              <circle cx="100" cy="135" r="8" fill="#1e293b" />
              
              {/* Chair */}
              <path d="M80 220 Q 80 250 110 250 L 145 250 Q 155 250 155 240 L 150 225 Q 145 235 120 235 L 90 235 Z" fill="#6b62ff" />
              <path d="M100 250 L 85 300 m 20 -50 L 115 300" stroke="#4b5563" strokeWidth="3" fill="none" />
              <rect x="105" y="250" width="3" height="40" fill="#4b5563" />

              {/* Tall Plant */}
              <rect x="340" y="270" width="30" height="30" fill="#3f3f46" />
              <rect x="345" y="210" width="2" height="60" fill="#4b5563" />
              <rect x="355" y="200" width="2" height="70" fill="#4b5563" />
              <path d="M345 230 C 320 210 330 180 345 190 C 350 210 345 230 345 230 Z" fill="#6b62ff" />
              <path d="M355 220 C 375 190 365 170 355 180 C 350 200 355 220 355 220 Z" fill="#6b62ff" />
              <path d="M350 240 C 365 220 375 200 350 200 C 340 210 350 240 350 240 Z" fill="#818cf8" opacity="0.8" />
            </svg>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center bg-white">
          <div className="max-w-[420px] w-full mx-auto">
            
            {/* Toggle: Login / Register */}
            <div className="flex justify-center mb-8 bg-gray-100 p-1 rounded-xl">
              <button 
                type="button"
                onClick={() => { setIsLogin(true); setError(""); setSuccessMsg(""); }} 
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${isLogin ? 'bg-white shadow-sm text-[#6b62ff]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Login
              </button>
              <button 
                type="button"
                onClick={() => { setIsLogin(false); setError(""); setSuccessMsg(""); }} 
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${!isLogin ? 'bg-white shadow-sm text-[#6b62ff]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Register
              </button>
            </div>

            <h1 className="text-3xl font-semibold text-gray-800 mb-3 tracking-tight">
              {isLogin ? "Sign In" : "Create Account"}
            </h1>
            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
              {isLogin ? "Sign in to access IP Monitoring System dashboard." : "Register a new account to access the system."}
            </p>

            {/* MESSAGES */}
            {error && (
              <div className="bg-red-100 text-red-600 text-sm p-3 rounded-lg mb-6">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-50 text-emerald-600 text-sm p-3 rounded-lg mb-6 border border-emerald-100">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Input Group */}
              <div className="bg-[#f3f5f8] rounded-xl flex flex-col mb-6 border border-transparent focus-within:border-indigo-200 transition-colors overflow-hidden">
                <input 
                  type="text" 
                  placeholder="Username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-transparent w-full px-5 py-4 text-sm outline-none text-gray-700 placeholder-gray-400"
                />
                <div className="h-px bg-gray-200 mx-5"></div>
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-transparent w-full px-5 py-4 text-sm outline-none text-gray-700 placeholder-gray-400"
                />
                
                {/* Role Dropdown (Visible for both Login and Register) */}
                <div className="h-px bg-gray-200 mx-5"></div>
                <div className="relative">
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="bg-transparent w-full px-5 py-4 text-sm outline-none text-gray-700 appearance-none cursor-pointer"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {/* Custom Dropdown Arrow */}
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Remember Me & Forgot Password (Only on Login) */}
              {isLogin && (
                <div className="flex items-center justify-between mb-8">
                  <label className="flex items-center cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={rememberMe}
                        onChange={() => setRememberMe(!rememberMe)}
                      />
                      <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors shadow-sm ${rememberMe ? 'bg-[#6b62ff]' : 'bg-gray-100 border border-gray-200 group-hover:bg-gray-200'}`}>
                        {rememberMe && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="ml-3 text-sm text-gray-500 font-medium">Remember me</span>
                  </label>

                  <a href="#" className="text-sm text-[#6b62ff] font-medium hover:underline transition-colors">
                    Forgot Password?
                  </a>
                </div>
              )}

              {/* Space replacement for register mode so button doesn't jump too much */}
              {!isLogin && <div className="mb-8"></div>}

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#6b62ff] hover:bg-[#5a52e0] text-white font-medium py-3.5 rounded-xl transition-all mb-6 text-sm shadow-lg shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {loading 
                  ? (isLogin ? "Logging in..." : "Creating account...") 
                  : (isLogin ? "Log In" : "Register")}
              </button>
            </form>

            {/* Switch Link Below */}
            <div className="text-center text-sm text-gray-500 mb-6">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button" 
                onClick={() => { setIsLogin(!isLogin); setError(""); setSuccessMsg(""); }} 
                className="text-[#6b62ff] font-semibold hover:underline transition-colors"
              >
                {isLogin ? "Register here" : "Login here"}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center justify-center text-sm text-gray-400 mb-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <span className="relative px-4 bg-white text-gray-400">or login with</span>
            </div>

            {/* Social Buttons */}
            <div className="flex justify-center items-center space-x-3">
              <button className="w-12 h-12 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}