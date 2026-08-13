import { useState, useEffect } from 'react';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pingCountdown, setPingCountdown] = useState(0);

  // Keep-warm ping system
  useEffect(() => {
    if (!stats || !stats.isHackathonActive) {
      setPingCountdown(0);
      return;
    }

    setPingCountdown(300);
    
    const interval = setInterval(() => {
      setPingCountdown(prev => {
        if (prev <= 1) {
          fetch('/api/ping').catch(console.error);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stats?.isHackathonActive]);

  // Check session storage on mount
  useEffect(() => {
    const savedPassword = sessionStorage.getItem('admin_pass');
    if (savedPassword) {
      setPassword(savedPassword);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch stats when authenticated
  useEffect(() => {
    if (isAuthenticated && password) {
      fetchStats();
    }
  }, [isAuthenticated]);

  const fetchStats = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin-stats', {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });
      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false);
          sessionStorage.removeItem('admin_pass');
          setError('Invalid password');
        } else {
          setError('Failed to fetch stats');
        }
        return;
      }
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password) {
      sessionStorage.setItem('admin_pass', password);
      setIsAuthenticated(true);
    }
  };

  const handleToggle = async () => {
    if (!stats) return;
    
    const newActiveState = !stats.isHackathonActive;
    
    // Optimistic UI update
    setStats(prev => ({ ...prev, isHackathonActive: newActiveState }));
    
    try {
      const res = await fetch('/api/admin-toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`
        },
        body: JSON.stringify({ active: newActiveState })
      });
      
      if (!res.ok) {
        // Revert on failure
        setStats(prev => ({ ...prev, isHackathonActive: !newActiveState }));
        setError('Failed to toggle state');
      }
    } catch (err) {
      setStats(prev => ({ ...prev, isHackathonActive: !newActiveState }));
      setError('Network error');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-hh-green flex flex-col items-center justify-center p-6 text-white font-mono relative overflow-hidden">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,222,23,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,222,23,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

        <div className="w-full max-w-sm border border-white/20 p-8 rounded-lg bg-black/20 backdrop-blur-xl shadow-[0_0_25px_rgba(255,222,23,0.15)] relative overflow-hidden z-10">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-hh-pink to-hh-yellow"></div>
          
          <h1 className="text-2xl font-bold mb-6 tracking-widest text-center text-hh-yellow">SYSTEM_AUTH</h1>
          
          {error && <div className="text-hh-pink text-sm mb-4 text-center animate-pulse">{error}</div>}
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs uppercase text-white/80 mb-1">Passkey</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded p-2 text-white placeholder-white/50 focus:outline-none focus:border-hh-yellow focus:shadow-[0_0_10px_rgba(255,222,23,0.3)] transition-all"
                autoFocus
              />
            </div>
            <button 
              type="submit"
              className="mt-2 w-full bg-hh-pink text-white hover:bg-hh-yellow hover:text-black py-2 uppercase tracking-widest font-bold transition-colors"
            >
              Initiate Access
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hh-green text-white font-mono p-6 lg:p-12 relative overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,222,23,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,222,23,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <header className="flex justify-between items-end mb-12 border-b border-white/20 pb-4">
          <div>
            <h1 className="text-3xl lg:text-5xl font-black tracking-tighter uppercase text-hh-yellow drop-shadow-[0_0_10px_rgba(255,222,23,0.3)]">
              Nexus_Command
            </h1>
            <p className="text-white/80 text-sm mt-2">Active connection established.</p>
          </div>
          
          <button 
            onClick={() => {
              sessionStorage.removeItem('admin_pass');
              setIsAuthenticated(false);
              setPassword('');
            }}
            className="text-xs uppercase text-white/60 hover:text-white border-b border-transparent hover:border-white transition-all"
          >
            Disconnect [x]
          </button>
        </header>

        {error && <div className="bg-hh-pink/20 border border-hh-pink text-white p-3 mb-8 rounded">{error}</div>}

        {isLoading && !stats ? (
          <div className="animate-pulse flex space-x-4 items-center">
            <div className="w-4 h-4 bg-hh-yellow rounded-full"></div>
            <div className="text-hh-yellow uppercase tracking-widest">Decrypting telemetry...</div>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Stats Card */}
            <div className="border border-white/20 bg-black/20 backdrop-blur-xl p-8 rounded-xl shadow-[0_0_25px_rgba(249,22,129,0.1)] relative group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-hh-pink to-hh-yellow opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <h2 className="text-sm uppercase tracking-widest text-white/80 mb-2">Total Generations</h2>
              <div className="text-6xl font-black text-hh-yellow drop-shadow-[0_0_15px_rgba(255,222,23,0.4)]">
                {stats.totalGenerations.toLocaleString()}
              </div>
              <p className="text-xs text-white/60 mt-4">&gt; Live accumulation across edge nodes</p>
            </div>

            {/* Controls Card */}
            <div className="border border-white/20 bg-black/20 backdrop-blur-xl p-8 rounded-xl shadow-[0_0_25px_rgba(255,222,23,0.1)] relative group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-hh-yellow to-hh-pink opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <h2 className="text-sm uppercase tracking-widest text-hh-yellow mb-6">System Directives</h2>
              
              <div className="flex items-center justify-between p-4 border border-white/10 rounded bg-black/40">
                <div>
                  <div className="font-bold text-white uppercase">Hackathon Mode</div>
                  <div className="text-xs text-white/60 mt-1">Allows incoming submissions.</div>
                </div>
                
                {/* Toggle Switch */}
                <button 
                  onClick={handleToggle}
                  className={`w-16 h-8 rounded-full transition-colors relative focus:outline-none border border-white/20 ${stats.isHackathonActive ? 'bg-hh-pink/20' : 'bg-black/60'}`}
                >
                  <div className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(249,22,129,0.5)] ${stats.isHackathonActive ? 'left-[34px] bg-hh-pink' : 'left-1 bg-white/40 shadow-none'}`}></div>
                </button>
              </div>
              <div className="mt-4 p-2 bg-black/60 rounded border border-white/5 font-mono text-[10px] md:text-xs">
                {stats.isHackathonActive ? (
                  <span className="text-hh-yellow flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-hh-yellow animate-pulse"></span>
                    &gt; System Heartbeat Active: Next keep-warm ping in {pingCountdown}s...
                  </span>
                ) : (
                  <span className="text-white/40">
                    &gt; System Standby: Keep-warm disabled.
                  </span>
                )}
              </div>
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}
