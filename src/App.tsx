import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Search, ExternalLink, ArrowLeft, Sun, Moon, Filter, ListRestart } from 'lucide-react';
import { StatsFile, PlayerStats, TournamentData } from './types';
import './App.css';

const API_BASE = (import.meta.env.BASE_URL || '/') + 'data';

// ... COMPONENTS ...

const Navigation = ({ 
  players, 
  category, 
  setCategory,
  theme,
  toggleTheme 
}: { 
  players: { username: string; title?: string }[], 
  category: string, 
  setCategory: (c: string) => void,
  theme: string,
  toggleTheme: () => void
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setSearchTerm('');
  }, [category]);

  const filteredPlayers = searchTerm 
    ? players.filter(p => p.username.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10)
    : [];

  return (
    <header className="app-container">
      <Link to="/" className="logo">Lichess<span>Elite</span>Archive</Link>
      
      <div className="search-bar">
        <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-color)' }} />
        <input 
          type="text" 
          placeholder="Search players..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {filteredPlayers.length > 0 && (
          <div className="search-results">
            {filteredPlayers.map(p => (
              <div key={p.username} className="search-item" onClick={() => {
                navigate(`/player/${category}/${p.username}`);
                setSearchTerm('');
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {p.title && <span className="player-title">{p.title}</span>}
                  {p.username}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button 
            className={`tab ${category === 'bullet' ? 'active' : ''}`} 
            onClick={() => {
              setCategory('bullet');
              navigate('/');
            }}
          >
            Bullet
          </button>
          <button 
            className={`tab ${category === 'superblitz' ? 'active' : ''}`} 
            onClick={() => {
              setCategory('superblitz');
              navigate('/');
            }}
          >
            SuperBlitz
          </button>
        </div>
        
        <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </nav>
    </header>
  );
};

const ViewTabs = () => {
  const location = useLocation();
  const isTournaments = location.pathname.includes('/tournaments');
  
  return (
    <div className="app-container">
      <div className="tabs" style={{ borderBottom: '1px solid var(--border-color)', borderRadius: 0, paddingBottom: '1rem' }}>
        <Link to="/" className={`tab ${!isTournaments ? 'active' : ''}`}>Records</Link>
        <Link to="/tournaments" className={`tab ${isTournaments ? 'active' : ''}`}>Tournaments</Link>
      </div>
    </div>
  );
};

// --- VIEWS ---

const RecordsView = ({ stats, category }: { stats: StatsFile | null, category: string }) => {
  const [collapsed, setCollapsed] = useState(true);
  
  if (!stats || !stats[category as keyof StatsFile]?.records) {
    return <div className="app-container">Loading {category} stats...</div>;
  }

  const currentRecords = stats[category as keyof StatsFile].records;
  const formatKey = (key: string) => key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const getDisplayEntries = (key: string, entries: any[]) => {
    if (!collapsed || !['highest_score', 'longest_win_streak'].includes(key)) {
      return entries.slice(0, 10).map(e => ({ ...e, extra: [] }));
    }

    const seen = new Map<string, any>();
    const result: any[] = [];

    for (const entry of entries) {
      if (!seen.has(entry.player)) {
        if (result.length < 10) {
          const newEntry = { ...entry, extra: [] };
          seen.set(entry.player, newEntry);
          result.push(newEntry);
        }
      } else {
        seen.get(entry.player).extra.push(entry);
      }
    }
    return result;
  };

  return (
    <main className="app-container">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button 
          className={`tab ${collapsed ? 'active' : ''}`} 
          onClick={() => setCollapsed(!collapsed)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
        >
          {collapsed ? <Filter size={16} /> : <ListRestart size={16} />}
          {collapsed ? 'Unique Players Only' : 'Show All Entries'}
        </button>
      </div>
      <div className="stats-grid">
        {Object.entries(currentRecords).map(([key, rawEntries]) => {
          const entries = getDisplayEntries(key, rawEntries);
          return (
            <div key={key} className="card">
              <h2>{formatKey(key)}</h2>
              <table>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={i}>
                      <td className={`rank rank-${i+1}`}>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                          {entry.title && <span className="player-title">{entry.title}</span>}
                          <Link to={`/player/${category}/${entry.player}`} className="username">{entry.player}</Link>
                          {entry.extra && entry.extra.length > 0 && (

                            <span 
                              className="badge" 
                              title={`Other records: ${entry.extra.map((e: any) => `${e.value} (@${e.tournament})`).join(', ')}`}
                              style={{ fontSize: '0.7rem', opacity: 0.6, cursor: 'help' }}
                            >
                              +{entry.extra.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="value">
                        {entry.value.toLocaleString()}
                        {entry.tournament && (
                          <Link to={`/tournament/${category}/${entry.tournament}`} title="View Tournament" style={{ marginLeft: '0.5rem', opacity: 0.5, display: 'inline-flex' }}>
                            <ExternalLink size={12} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </main>
  );
};

const TournamentListView = ({ stats, category }: { stats: StatsFile | null, category: string }) => {
  if (!stats || !stats[category as keyof StatsFile]?.tournament_list) {
    return <div className="app-container">Loading {category} tournaments...</div>;
  }
  const list = stats[category as keyof StatsFile].tournament_list;

  return (
    <main className="app-container">
      <div className="card">
        <h2>Recent {category.charAt(0).toUpperCase() + category.slice(1)} Tournaments</h2>
        <table>
          <thead>
            <tr>
              <th>Tournament Name</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id}>
                <td className="username">{t.name}</td>
                <td>{t.date ? new Date(t.date).toLocaleDateString() : 'N/A'}</td>
                <td>
                  <Link to={`/tournament/${category}/${t.id}`} className="tab" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>View Stats</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
};

const PlayerView = ({ category: defaultCategory }: { category: string }) => {
  const { cat, username } = useParams();
  const [data, setData] = useState<PlayerStats | null>(null);
  const activeCat = cat || defaultCategory;

  useEffect(() => {
    fetch(`${API_BASE}/${activeCat}/players/${username}.json`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [username, activeCat]);

  if (!data) return <div className="app-container">Loading player profile...</div>;

  return (
    <main className="app-container">
      <div className="player-header">
        <div className="player-name">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            {data.title && <span className="player-title large">{data.title}</span>}
            <h1>{username}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ color: 'var(--gold)', fontWeight: 600 }}>{activeCat.toUpperCase()} ELITE PLAYER</div>
            <a href={`https://lichess.org/@/${username}`} target="_blank" rel="noopener noreferrer" className="tab" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              Lichess Profile <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      <div className="player-meta-grid">
        <div className="meta-item">
          <span className="meta-label">Total Tournaments</span>
          <span className="meta-value">{data.total_tournaments}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Tournament Wins</span>
          <span className="meta-value" style={{ color: 'var(--gold)' }}>{data.tournament_wins}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Best Streak</span>
          <span className="meta-value">{data.highest_win_streak}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Total Games</span>
          <span className="meta-value">{data.total_games}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Total Moves</span>
          <span className="meta-value">{data.total_moves}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Avg Berserk</span>
          <span className="meta-value">{(data.berserk_rate * 100).toFixed(1)}%</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card">
          <h2>Personal Bests</h2>
          <table>
            <tbody>
              <tr><td>Highest Score</td><td className="value">{data.highest_score}</td></tr>
              <tr><td>Highest Rank</td><td className="value">#{data.highest_rank}</td></tr>
              <tr><td>Best Performance</td><td className="value">{data.highest_performance}</td></tr>
              <tr><td>Total Score</td><td className="value">{data.total_score}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

const TournamentView = () => {
  const { cat, id } = useParams();
  const [data, setData] = useState<TournamentData | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/${cat}/tournaments/${id}.json`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [id, cat]);

  if (!data) return <div className="app-container">Loading tournament data...</div>;

  return (
    <main className="app-container">
      <Link to="/tournaments" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--gold)' }}>
        <ArrowLeft size={16} /> Back to Tournaments
      </Link>
      
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h1>{data.meta.fullName}</h1>
          <a href={`https://lichess.org/tournament/${id}`} target="_blank" rel="noopener noreferrer" className="tab" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            View on Lichess <ExternalLink size={14} />
          </a>
        </div>
        <div className="tournament-stats-summary">
          <div className="stat-box"><label>Players:</label><span>{data.meta.nbPlayers}</span></div>
          <div className="stat-box"><label>Games:</label><span>{data.meta.stats.games}</span></div>
          <div className="stat-box"><label>Longest Game:</label><span>{data.longest_game_moves} moves</span></div>
        </div>
        
        {data.biggest_upset && data.biggest_upset.diff > 0 && (
          <div className="card" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-color)' }}>
            <h3 style={{ color: 'var(--text-bright)', marginBottom: '0.5rem' }}>Biggest Upset</h3>
            <div>
              <strong>{data.biggest_upset.winner}</strong> won against <strong>{data.biggest_upset.loser}</strong> 
              <span style={{ marginLeft: '1rem', color: 'var(--gold)' }}>+{data.biggest_upset.diff} rating diff</span>
            </div>
          </div>
        )}

        <h2>Standings</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Rating</th>
              <th>Score</th>
              <th>Performance</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((r) => (
              <tr key={r.username}>
                <td className={`rank rank-${r.rank}`}>{r.rank}</td>
                <td className="username">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                    {r.title && <span className="player-title">{r.title}</span>}
                    <Link to={`/player/${data.meta.fullName.includes('Bullet') ? 'bullet' : 'superblitz'}/${r.username}`} className="username">{r.username}</Link>
                  </div>
                </td>
                <td>{r.rating}</td>
                <td className="value">{r.score.toLocaleString()}</td>
                <td>{r.performance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
};

// --- MAIN APP ---

const App = () => {
  const [stats, setStats] = useState<StatsFile | null>(null);
  const [category, setCategory] = useState('bullet');
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    fetch(`${API_BASE}/${category}/stats.json`)
      .then(res => res.json())
      .then(data => {
        setStats(prev => ({
          ...(prev || { bullet: {} as any, superblitz: {} as any }),
          [category]: data
        }));
      })
      .catch(console.error);
  }, [category]);

  const playerList = stats && stats[category as keyof StatsFile] ? stats[category as keyof StatsFile].player_list : [];

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Navigation 
        players={playerList} 
        category={category} 
        setCategory={setCategory} 
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <ViewTabs />
      <Routes>
        <Route path="/" element={<RecordsView stats={stats} category={category} />} />
        <Route path="/tournaments" element={<TournamentListView stats={stats} category={category} />} />
        <Route path="/player/:cat/:username" element={<PlayerView category={category} />} />
        <Route path="/tournament/:cat/:id" element={<TournamentView />} />
      </Routes>
    </Router>
  );
};

export default App;
