import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, ChevronLeft, Clock3, Code2, KeyRound, LogOut, MapPin, Menu, Moon, QrCode, Search, Sun, Ticket, Trophy, Users, X } from 'lucide-react';
import { api, eventDate } from './api.js';

function useSession() {
  const [token, setToken] = useState(() => localStorage.getItem('pua-token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  const signOut = useCallback(() => {
    localStorage.removeItem('pua-token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api('/auth/me', { token })
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(signOut)
      .finally(() => setLoading(false));
  }, [token, signOut]);

  const acceptSession = (data) => {
    localStorage.setItem('pua-token', data.token);
    setToken(data.token);
    setUser(data.user);
    setLoading(false);
  };
  const updateUser = (currentUser) => setUser(currentUser);
  return { token, user, loading, acceptSession, updateUser, signOut };
}

function Header({ user, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!accountOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) setAccountOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountOpen]);

  useEffect(() => {
    setAccountOpen(false);
  }, [location.pathname]);

  const isActive = (path) => path === '/'
    ? location.pathname === '/' || location.pathname.startsWith('/events/') || location.pathname.startsWith('/check-in/')
    : location.pathname === path || location.pathname.startsWith(`${path}/`);
  const profilePath = user?.role === 'user' ? `/users/${user.id}` : null;
  const accountActive = location.pathname === '/settings' || (profilePath && location.pathname === profilePath);

  const navLink = (path, label) => (
    <Link className={isActive(path) ? 'nav-link active' : 'nav-link'} to={path} aria-current={isActive(path) ? 'page' : undefined}>{label}</Link>
  );

  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="PUA ICPC Community home" onClick={() => { setMenuOpen(false); setAccountOpen(false); }}>
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 136 136" focusable="false">
            <path d="M12 12h114v114H12z" fill="#171714" />
            <rect x="2" y="2" width="114" height="114" rx="3" fill="#fff4df" stroke="#171714" strokeWidth="2" />
            <path d="M2 48 68 76l48-28M2 53l66 28 48-28" fill="none" stroke="#171714" strokeWidth="2.5" />
            <path d="M3 50 68 78l46-28M3 54l65 28 47-28" fill="none" stroke="#00d9dc" strokeWidth="2" />
            <path d="M3 68h111" fill="none" stroke="#ffda00" strokeWidth="2" />
            <path d="M37 2 57 36h22L97 2" fill="#ffda00" stroke="#171714" strokeWidth="2" />
            <path d="m42 2 18 34M92 2 76 36" fill="none" stroke="#00d9dc" strokeWidth="2" />
            <circle cx="68" cy="34" r="14" fill="#ffda00" stroke="#171714" strokeWidth="2" />
            <circle cx="63" cy="29" r="4" fill="#fffdf5" />
            <path d="M52 46h32v7H52z" fill="#8124ce" stroke="#171714" strokeWidth="2" />
            <path d="m54 53-4 40h36l-4-40z" fill="#8124ce" stroke="#171714" strokeWidth="2" />
            <path d="M52 61h32M51 70h34M50 79h36" fill="none" stroke="#ff3c81" strokeWidth="2" />
            <path d="M63 93V80a5 5 0 0 1 10 0v13" fill="#171714" />
            <path d="M45 94h46v6H45z" fill="#8124ce" stroke="#171714" strokeWidth="2" />
            <path d="m21 29 7 2-2 7-7-2zM97 61l7 2-2 7-7-2zM33 99l7 2-2 7-7-2z" fill="#8124ce" stroke="#171714" strokeWidth="2" />
            <text x="18" y="81" fill="#171714" fontFamily="monospace" fontSize="15" fontWeight="700">{'{'}</text>
          </svg>
        </span>
        <span className="brand-copy"><b>PUA ICPC</b><small>TRAINING COMMUNITY</small></span>
      </Link>
      <button className="icon-button menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav className={menuOpen ? 'main-nav open' : 'main-nav'} onClick={(event) => { if (event.target.closest('a')) setMenuOpen(false); }}>
        {navLink('/', 'Events')}
        {user && navLink('/my-events', 'My Events')}
        {navLink('/resources', 'Resources')}
        {navLink('/leaderboard', 'Leaderboard')}
        {user?.role === 'admin' && navLink('/admin', 'Admin')}
        {user ? (
          <div className="account-menu" ref={accountMenuRef}>
            <button className={accountActive ? 'account-trigger active' : 'account-trigger'} type="button" aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => setAccountOpen((open) => !open)}>
              <span className="account-avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span>
              <span className="account-name">{user.name}</span>
              <ChevronDown className={accountOpen ? 'account-chevron open' : 'account-chevron'} size={15} aria-hidden="true" />
            </button>
            {accountOpen && <div className="account-dropdown" role="menu" aria-label="Account menu">
              {profilePath && <Link className={location.pathname === profilePath ? 'active' : ''} to={profilePath} role="menuitem" aria-current={location.pathname === profilePath ? 'page' : undefined} onClick={() => setAccountOpen(false)}>My Profile</Link>}
              <Link className={location.pathname === '/settings' ? 'active' : ''} to="/settings" role="menuitem" aria-current={location.pathname === '/settings' ? 'page' : undefined} onClick={() => setAccountOpen(false)}>Settings</Link>
              <div className="account-menu-divider" role="separator" />
              <button className="account-signout" type="button" role="menuitem" onClick={() => { setAccountOpen(false); setMenuOpen(false); onSignOut(); navigate('/login', { replace: true }); }}>
                <LogOut size={15} aria-hidden="true" /> Sign Out
              </button>
            </div>}
          </div>
        ) : (
          <Link className="button button-dark nav-join" to="/login">Join the community <ArrowRight size={16} /></Link>
        )}
      </nav>
    </header>
  );
}

function EventCard({ event, index }) {
  return (
    <article className={`event-card accent-${index % 4}`}>
      <div className="card-topline">
        <span className="category-label">{event.category}</span>
        <span className="event-mode">{event.mode === 'offline' ? 'IN PERSON' : 'ONLINE'}</span>
      </div>
      <Link className="card-title-link" to={`/events/${event.slug}`}>
        <h3>{event.title}</h3>
      </Link>
      <p className="card-description">{event.description}</p>
      <div className="event-meta"><CalendarDays size={16} /><span>{eventDate(event.startsAt)}</span></div>
      <div className="event-meta"><MapPin size={16} /><span>{event.mode === 'offline' ? event.location : 'Online'}</span></div>
      <div className="card-footer">
        <span>{event.capacity ? `${Math.max(event.capacity - event.registrationCount, 0)} spots left` : 'Open registration'}</span>
        <Link className="round-arrow" to={`/events/${event.slug}`} aria-label={`View ${event.title}`}><ArrowRight size={18} /></Link>
      </div>
    </article>
  );
}

function EventsPage() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('upcoming');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (status === 'past') params.set('status', 'past');
    if (query.trim()) params.set('q', query.trim());
    if (category) params.set('category', category);
    api(`/events?${params}`)
      .then(({ events: result }) => {
        if (!active) return;
        setEvents(result);
        setCategories((current) => [...new Set([...current, ...result.map((event) => event.category)])].sort());
      })
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [status, query, category]);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> PUA ICPC COMMUNITY</span>
          <h1>Learn together.<br /><span>Compete together.</span></h1>
          <p>Build your problem-solving skills, meet your people, and get ready for the next big contest.</p>
          <Link className="button button-dark" to="/login">Join the community <ArrowRight size={17} /></Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-sticker sticker-cyan"><Code2 size={34} /></div>
          <div className="hero-sticker sticker-purple">IC<span>×</span>PC</div>
          <div className="hero-sticker sticker-yellow">?</div>
          <span className="hero-caption">PUA · ALEXANDRIA · 2024</span>
        </div>
      </section>
      <section className="events-section" id="events">
        <div className="section-heading">
          <div><span className="eyebrow">WHAT'S HAPPENING</span><h2>Find your next <span>challenge.</span></h2></div>
          <div className="event-tabs" role="tablist">
            <button className={status === 'upcoming' ? 'tab active' : 'tab'} onClick={() => setStatus('upcoming')}>Upcoming</button>
            <button className={status === 'past' ? 'tab active' : 'tab'} onClick={() => setStatus('past')}>Past events</button>
          </div>
        </div>
        <div className="filter-row">
          <label className="search-box"><Search size={18} /><input aria-label="Search events" placeholder="Search events..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        {error && <div className="notice error-notice">{error}</div>}
        {loading ? <div className="empty-state"><span className="loader" /> Loading events...</div> :
          events.length ? <div className="event-grid">{events.map((event, index) => <EventCard key={event.id} event={event} index={index} />)}</div> :
            <div className="empty-state"><span className="empty-icon"><CalendarDays size={24} /></span><h3>No events found</h3><p>Try a different search or check back soon for new events.</p></div>}
      </section>
      <section className="community-strip"><div className="strip-icon"><Users size={21} /></div><div><b>Better together.</b><span>New to competitive programming? This is your place to start.</span></div><Link to="/login">Meet the community <ArrowRight size={16} /></Link></section>
    </>
  );
}

function EventDetail({ token, user }) {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const [{ event: current }, mine] = await Promise.all([
      api(`/events/${encodeURIComponent(eventId)}`),
      token ? api('/events/my', { token }) : Promise.resolve({ events: [] }),
    ]);
    setEvent(current);
    setRegistered(mine.events.some((item) => item.event.id === current.id));
  }, [eventId, token]);

  useEffect(() => {
    load().catch((error) => setMessage(error.message)).finally(() => setLoading(false));
  }, [load]);

  const register = async () => {
    if (!token) return navigate('/login', { state: { from: `/events/${eventId}` } });
    setBusy(true);
    setMessage('');
    try {
      await api(`/events/${event.id}/registrations`, { method: 'POST', token });
      setRegistered(true);
      await load();
      setMessage('You’re registered! Your event is waiting in My events.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const cancel = async () => {
    setBusy(true);
    setMessage('');
    try {
      await api(`/events/${event.id}/registrations`, { method: 'DELETE', token });
      setRegistered(false);
      await load();
      setMessage('Your registration has been cancelled.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="page-wrap"><div className="empty-state"><span className="loader" /> Loading event...</div></div>;
  if (!event) return <div className="page-wrap"><div className="notice error-notice">{message || 'Event not found.'}</div><Link className="text-link" to="/">Back to events</Link></div>;
  const closed = event.status !== 'published' || new Date(event.startsAt) <= new Date() ||
    (event.registrationDeadline && new Date(event.registrationDeadline) <= new Date()) ||
    (event.capacity && event.registrationCount >= event.capacity);

  return (
    <main className="page-wrap">
      <Link className="back-link" to="/"><ChevronLeft size={16} /> All events</Link>
      <article className="detail-card">
        <div className={`detail-banner accent-${event.category.length % 4}`}>
          <span className="category-label">{event.category}</span>
          <span className="detail-decoration"><Code2 size={54} /></span>
        </div>
        <div className="detail-content">
          <div className="card-topline"><span className="event-mode">{event.mode === 'offline' ? 'IN PERSON' : 'ONLINE'}</span><span className={closed ? 'availability closed' : 'availability'}>{closed ? 'REGISTRATION CLOSED' : 'REGISTRATION OPEN'}</span></div>
          <h1>{event.title}</h1>
          <div className="detail-meta">
            <div><CalendarDays size={18} /><span><b>{eventDate(event.startsAt)}</b><small>Event date</small></span></div>
            <div><Clock3 size={18} /><span><b>{eventDate(event.endsAt, { hour: 'numeric', minute: '2-digit' })}</b><small>Ends</small></span></div>
            <div><MapPin size={18} /><span><b>{event.mode === 'offline' ? event.location : 'Online'}</b><small>Location</small></span></div>
          </div>
          <p className="detail-description">{event.description}</p>
          {event.capacity && <p className="spots-note">{event.registrationCount} of {event.capacity} spots taken</p>}
          <p className="points-note"><Trophy size={16} /> {event.attendancePoints ?? 0} attendance points</p>
          {message && <div className={`notice ${message.includes('registered') || message.includes('cancelled') ? 'success-notice' : 'error-notice'}`}>{message}</div>}
          <div className="detail-actions">
            {registered ? <><span className="registered-badge"><Check size={17} /> You’re registered</span><button className="button button-outline" disabled={busy || closed} onClick={cancel}>Cancel registration</button></> :
              <button className="button button-dark" disabled={busy || closed} onClick={register}>{busy ? 'Please wait...' : closed ? 'Registration closed' : 'Register for this event'} <ArrowRight size={17} /></button>}
            {user && <Link className="text-link" to="/my-events">My events</Link>}
          </div>
        </div>
      </article>
    </main>
  );
}

function AuthPage({ session }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', studentId: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/my-events';

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) });
      session.acceptSession(result);
      navigate(from, { replace: true });
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };
  if (session.user) return <Navigate to="/my-events" replace />;

  return (
    <main className="auth-layout">
      <div className="auth-art"><span className="eyebrow">GOOD PEOPLE. HARD PROBLEMS.</span><h1>Your next<br />breakthrough<br /><span>starts here.</span></h1><div className="auth-symbol">{'{ }'}</div></div>
      <form className="auth-form" onSubmit={submit}>
        <span className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'JOIN THE CREW'}</span>
        <h2>{mode === 'login' ? 'Log in' : 'Create your account'}</h2>
        <p>{mode === 'login' ? 'Pick up where you left off.' : 'Get into events, training, and everything ICPC.'}</p>
        {mode === 'register' && <label>Your name<input autoComplete="name" required maxLength="80" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>}
        <label>{mode === 'register' ? 'University email address' : 'Email address'}<input autoComplete="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        {mode === 'register' && <label>Student ID<input autoComplete="off" inputMode="numeric" pattern="[0-9]{4,20}" title="Enter 4–20 digits. The first 4 digits determine your academic year." required maxLength="20" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} /></label>}
        <label>Password<input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" minLength="8" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        {error && <div className="notice error-notice">{error}</div>}
        <button className="button button-dark auth-submit" disabled={busy}>{busy ? 'One moment...' : mode === 'login' ? 'Log in' : 'Create account'} <ArrowRight size={17} /></button>
        <p className="auth-switch">{mode === 'login' ? 'New around here?' : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}> {mode === 'login' ? 'Create an account' : 'Log in'}</button></p>
      </form>
    </main>
  );
}

function SettingsPage({ session, theme, onThemeChange }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [studentId, setStudentId] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setBusy(true);
    try {
      const result = await api('/auth/password', {
        method: 'PUT',
        token: session.token,
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      setSuccess(result.message);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };

  const saveStudentId = async (event) => {
    event.preventDefault();
    setProfileError('');
    setProfileBusy(true);
    try {
      const result = await api('/auth/student-id', {
        method: 'PUT',
        token: session.token,
        body: JSON.stringify({ studentId }),
      });
      session.updateUser(result.user);
      setStudentId('');
    } catch (reason) {
      setProfileError(reason.message);
    } finally {
      setProfileBusy(false);
    }
  };

  const logout = () => {
    session.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <main className="page-wrap settings-page">
      <div className="page-heading"><span className="eyebrow">YOUR ACCOUNT</span><h1>Account <span>settings.</span></h1><p>Manage your profile, appearance, and account security.</p></div>
      <section className="settings-card settings-profile-card" aria-labelledby="settings-profile-title">
        <div className="settings-card-heading">
          <div className="profile-avatar settings-avatar" aria-hidden="true">{session.user.name.trim().charAt(0).toUpperCase()}</div>
          <div><span className="eyebrow">PROFILE INFORMATION</span><h2 id="settings-profile-title">{session.user.name}</h2></div>
        </div>
        <dl className="settings-profile-details">
          <div><dt>University email</dt><dd>{session.user.email}</dd></div>
          <div><dt>Student ID</dt><dd>{session.user.studentId || 'Not provided yet'}</dd></div>
          <div><dt>Academic year</dt><dd>{session.user.studentId ? session.user.studentId.slice(0, 4) : 'Not available'}</dd></div>
        </dl>
        {!session.user.studentId && <form className="student-id-form" onSubmit={saveStudentId}>
          <label htmlFor="settings-student-id">Add your student ID<input id="settings-student-id" autoComplete="off" inputMode="numeric" pattern="[0-9]{4,20}" title="Enter 4–20 digits. The first 4 digits determine your academic year." required maxLength="20" value={studentId} onChange={(event) => setStudentId(event.target.value)} /></label>
          <p>Your academic year is read from the first four digits. Student ID can only be added once.</p>
          {profileError && <div className="notice error-notice" role="alert">{profileError}</div>}
          <button className="button button-dark" type="submit" disabled={profileBusy}>{profileBusy ? 'Saving...' : 'Save student ID'} <ArrowRight size={16} /></button>
        </form>}
      </section>
      <section className="settings-card settings-theme-card" aria-labelledby="settings-theme-title">
        <div><span className="eyebrow">APPEARANCE</span><h2 id="settings-theme-title">Theme</h2><p>Choose how the community looks on this device.</p></div>
        <div className="theme-options" role="group" aria-label="Color theme">
          <button type="button" className={theme === 'light' ? 'theme-option selected' : 'theme-option'} aria-pressed={theme === 'light'} onClick={() => onThemeChange('light')}><Sun size={18} /> Light Mode</button>
          <button type="button" className={theme === 'dark' ? 'theme-option selected' : 'theme-option'} aria-pressed={theme === 'dark'} onClick={() => onThemeChange('dark')}><Moon size={18} /> Dark Mode</button>
        </div>
      </section>
      <form className="settings-card" onSubmit={submit}>
        <span className="settings-icon"><KeyRound size={21} /></span>
        <span className="eyebrow">ACCOUNT SECURITY</span>
        <h2>Change password</h2>
        <p>Enter your current password, then choose a new one with at least 8 characters.</p>
        <label>Current password<input type="password" autoComplete="current-password" required value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} /></label>
        <label>New password<input type="password" autoComplete="new-password" minLength="8" required value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" minLength="8" required value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /></label>
        {error && <div className="notice error-notice" role="alert">{error}</div>}
        {success && <div className="notice success-notice" role="status">{success}</div>}
        <button className="button button-dark" type="submit" disabled={busy}>{busy ? 'Updating password...' : 'Change password'} <ArrowRight size={16} /></button>
        <div className="settings-signout-divider">
          <button className="button button-outline settings-logout" type="button" onClick={logout}><LogOut size={16} /> Logout</button>
        </div>
      </form>
    </main>
  );
}

function MyEvents({ token }) {
  const [items, setItems] = useState([]);
  const [standing, setStanding] = useState({ rank: null, points: 0, eventsAttended: 0 });
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api('/events/my', { token }), api('/events/leaderboard/me', { token })])
      .then(([{ events }, personal]) => {
        setItems(events);
        setStanding(personal.standing);
        setAttendanceHistory(personal.attendanceHistory);
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <main className="page-wrap">
      <div className="page-heading"><span className="eyebrow">YOUR LINEUP</span><h1>My <span>events.</span></h1><p>Everything you’re signed up for, all in one place.</p></div>
      {error && <div className="notice error-notice">{error}</div>}
      {loading ? <div className="empty-state"><span className="loader" /> Loading your events...</div> : <>
        <section className="personal-leaderboard">
          <div className="personal-leaderboard-heading"><span className="eyebrow"><Trophy size={15} /> YOUR LEADERBOARD</span><Link to="/leaderboard">Global rankings <ArrowRight size={15} /></Link></div>
          <div className="personal-leaderboard-stats">
            <div><small>CURRENT RANK</small><strong>{standing.rank ? `#${standing.rank}` : '—'}</strong></div>
            <div><small>TOTAL POINTS</small><strong>{standing.points}</strong></div>
            <div><small>EVENTS ATTENDED</small><strong>{standing.eventsAttended}</strong></div>
          </div>
          <div className="personal-history">
            <h2>Attendance history</h2>
            {attendanceHistory.length ? attendanceHistory.map((entry) => <div className="personal-history-row" key={`${entry.event.id}-${entry.checkedInAt}`}>
              <span><b>{entry.event.title}</b><small>{eventDate(entry.checkedInAt)}</small></span>
              <strong>+{entry.pointsAwarded} pts</strong>
            </div>) : <p>You’ll see attended events and earned points here.</p>}
          </div>
        </section>
        {items.length ?
        <div className="my-event-list">{items.map((item, index) =>
          <article className="my-event-card" key={item.registrationId}>
            <div className={`my-event-date accent-${index % 4}`}><b>{new Date(item.event.startsAt).toLocaleDateString(undefined, { day: '2-digit' })}</b><span>{new Date(item.event.startsAt).toLocaleDateString(undefined, { month: 'short' })}</span></div>
            <div className="my-event-info"><span className="category-label">{item.event.category}</span><h3><Link to={`/events/${item.event.slug}`}>{item.event.title}</Link></h3><span>{eventDate(item.event.startsAt, { weekday: 'short', year: undefined })} · {item.event.mode === 'offline' ? item.event.location : 'Online'}</span></div>
            <div className="ticket-list-action">
              {item.checkedInAt
                ? <span className="registered-badge"><Check size={16} /> Checked in · +{item.pointsAwarded} pts</span>
                : <span className="check-status">Not checked in</span>}
              <Link className="button button-outline" to={`/events/${item.event.slug}`}><Ticket size={16} /> Event details</Link>
            </div>
          </article>,
        )}</div> :
        <div className="empty-state"><span className="empty-icon"><Ticket size={24} /></span><h3>Your next adventure is waiting.</h3><p>You haven’t registered for an event yet.</p><Link className="button button-dark" to="/">Explore events <ArrowRight size={16} /></Link></div>}
      </>}
    </main>
  );
}

function CheckInPage({ token, user }) {
  const { eventId } = useParams();
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [checkInWindow, setCheckInWindow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const qrToken = new URLSearchParams(location.search).get('token') || '';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api(`/events/${encodeURIComponent(eventId)}`)
      .then(({ event: current }) => {
        if (active) setEvent(current);
        if (!token) return null;
        if (!qrToken) throw new Error('This check-in link is missing its event QR token.');
        return api(`/events/${encodeURIComponent(eventId)}/check-in?token=${encodeURIComponent(qrToken)}`, { token });
      })
      .then((result) => {
        if (!active || !result) return;
        setEvent(result.event);
        setAttendance(result.attendance);
        setCheckInWindow(result.checkInWindow);
      })
      .catch((reason) => setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [eventId, qrToken, token]);

  const checkIn = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await api(`/events/${encodeURIComponent(eventId)}/check-in`, {
        method: 'POST',
        token,
        body: JSON.stringify({ token: qrToken }),
      });
      setAttendance(result.attendance);
      setSuccess(`${result.message} You earned ${result.attendance.pointsAwarded} points.`);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page-wrap checkin-page">
      <Link className="back-link" to={user ? '/my-events' : '/'}><ChevronLeft size={16} /> {user ? 'Back to my events' : 'All events'}</Link>
      {loading && <div className="empty-state"><span className="loader" /> Checking your event...</div>}
      {!loading && event && <article className="checkin-card">
        <div className="checkin-card-heading"><span className="eyebrow"><QrCode size={16} /> EVENT CHECK-IN</span><span className="category-label">{event.category}</span></div>
        <div className="checkin-card-content">
          <h1>{event.title}</h1>
          <div className="ticket-detail-grid">
            <div><CalendarDays size={18} /><span><b>{eventDate(event.startsAt)}</b><small>Event date</small></span></div>
            <div><MapPin size={18} /><span><b>{event.location || 'Online'}</b><small>Location</small></span></div>
          </div>
          {error && <div className="notice error-notice" role="alert">{error}</div>}
          {success && <div className="notice success-notice" role="status">{success}</div>}
          {!user && <div className="notice checkin-login-notice">Sign in with your registered account to verify your eligibility and check in.</div>}
          {user && attendance?.checkedInAt && <div className="attendance-confirmed" role="status"><Check size={20} /><span><b>You’re checked in!</b><small>Attendance recorded · {attendance.pointsAwarded} points earned</small></span></div>}
          {user && attendance && !attendance.checkedInAt && <div className="checkin-window-note">
            {checkInWindow?.isOpen
              ? 'Your registration is confirmed. Check in now to record your attendance.'
              : `Check-in opens ${eventDate(checkInWindow.opensAt)} and closes ${eventDate(checkInWindow.closesAt)}.`}
          </div>}
          <div className="checkin-actions">
            {!user
              ? <Link className="button button-dark" to="/login" state={{ from: `${location.pathname}${location.search}` }}>Sign in to check in <ArrowRight size={17} /></Link>
              : attendance && !attendance.checkedInAt && <button className="button button-dark" disabled={busy || !checkInWindow?.isOpen} onClick={checkIn}>{busy ? 'Checking in...' : 'Confirm check-in'} <Check size={17} /></button>}
            <Link className="button button-outline" to={user ? '/my-events' : `/events/${event.slug}`}>{user ? 'My events' : 'Event details'}</Link>
          </div>
        </div>
      </article>}
      {!loading && !event && <div className="notice error-notice" role="alert">{error || 'Event not found.'}</div>}
    </main>
  );
}

function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/events/leaderboard')
      .then(({ leaderboard: results }) => setLeaderboard(results))
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  return <main className="page-wrap leaderboard-page">
    <div className="page-heading"><span className="eyebrow">SHOW UP. LEVEL UP.</span><h1>Community <span>leaderboard.</span></h1><p>Points are awarded for verified event attendance.</p></div>
    {error && <div className="notice error-notice">{error}</div>}
    {loading ? <div className="empty-state"><span className="loader" /> Loading the leaderboard...</div> : leaderboard.length
      ? <section className="leaderboard-card"><div className="leaderboard-head"><span>RANK</span><span>MEMBER</span><span>EVENTS</span><span>POINTS</span></div>
        {leaderboard.map((member) => <div className="leaderboard-row" key={member.userId}><span className="leaderboard-rank">{String(member.rank).padStart(2, '0')}</span><Link className="leaderboard-member-link" to={`/users/${member.userId}`}>{member.name}</Link><span>{member.eventsAttended}</span><strong><Trophy size={16} /> {member.points}</strong></div>)}
      </section>
      : <div className="empty-state"><span className="empty-icon"><Trophy size={24} /></span><h3>The first points are up for grabs.</h3><p>Check in at an event to get on the leaderboard.</p></div>}
  </main>;
}

function ResourcesPage() {
  return (
    <main className="page-wrap resources-page">
      <div className="resources-card">
        <span className="resources-icon"><BookOpen size={30} /></span>
        <span className="eyebrow">LEARN. PRACTICE. LEVEL UP.</span>
        <h1>Resources <span>are coming soon.</span></h1>
        <p>We’re putting together helpful materials for your competitive programming journey. Check back soon.</p>
        <Link className="button button-dark" to="/">Explore events <ArrowRight size={16} /></Link>
        <span className="resources-decoration" aria-hidden="true">{'{ }'}</span>
      </div>
    </main>
  );
}

function UserProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api(`/events/${encodeURIComponent(userId)}/profile`)
      .then(({ profile: result }) => active && setProfile(result))
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [userId]);

  if (loading) return <main className="page-wrap"><div className="empty-state"><span className="loader" /> Loading member profile...</div></main>;
  if (error || !profile) return <main className="page-wrap"><div className="notice error-notice">{error || 'Member profile not found.'}</div><Link className="back-link" to="/leaderboard"><ChevronLeft size={16} /> Back to leaderboard</Link></main>;

  return (
    <main className="page-wrap profile-page">
      <Link className="back-link" to="/leaderboard"><ChevronLeft size={16} /> Back to leaderboard</Link>
      <section className="profile-card">
        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden="true">{profile.name.trim().charAt(0).toUpperCase()}</div>
          <div><span className="eyebrow">PUA ICPC COMMUNITY MEMBER</span><h1>{profile.name}</h1><p>Member since {new Date(profile.joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p></div>
        </div>
        <div className="profile-stats">
          <div><small>LEADERBOARD RANK</small><strong>{profile.standing.rank ? `#${profile.standing.rank}` : '—'}</strong></div>
          <div><small>TOTAL POINTS</small><strong>{profile.standing.points}</strong></div>
          <div><small>EVENTS ATTENDED</small><strong>{profile.standing.eventsAttended}</strong></div>
        </div>
      </section>
      <section className="profile-history">
        <div className="profile-history-heading"><span className="eyebrow"><CalendarDays size={15} /> ATTENDANCE HISTORY</span></div>
        {profile.attendanceHistory.length ? profile.attendanceHistory.map((entry) => (
          <article className="profile-history-row" key={`${entry.event.id}-${entry.checkedInAt}`}>
            <div><span className="category-label">{entry.event.category}</span><h2><Link to={`/events/${entry.event.slug}`}>{entry.event.title}</Link></h2><small>{eventDate(entry.checkedInAt)} · {entry.event.location || 'Online'}</small></div>
            <strong><Trophy size={15} /> +{entry.pointsAwarded} pts</strong>
          </article>
        )) : <div className="profile-empty-history"><p>No event attendance recorded yet.</p><Link className="button button-dark" to="/">Explore events <ArrowRight size={16} /></Link></div>}
      </section>
    </main>
  );
}

function EventForm({ token, event, onSaved, onCancel }) {
  const [form, setForm] = useState(event ? {
    title: event.title, description: event.description, category: event.category,
    startsAt: dateTimeLocal(event.startsAt), endsAt: dateTimeLocal(event.endsAt),
    registrationDeadline: dateTimeLocal(event.registrationDeadline),
    attendancePoints: event.attendancePoints ?? 0,
    mode: event.mode, location: event.location || '', capacity: event.capacity ?? '', status: event.status,
  } : { title: '', description: '', category: 'Training', startsAt: '', endsAt: '', registrationDeadline: '', attendancePoints: 0, mode: 'online', location: '', capacity: '', status: 'draft' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = {
      ...form,
      capacity: form.capacity === '' ? null : Number(form.capacity),
      registrationDeadline: form.registrationDeadline || null,
      attendancePoints: Number(form.attendancePoints),
    };
    try {
      await api(event ? `/admin/events/${event.id}` : '/admin/events', { method: event ? 'PUT' : 'POST', token, body: JSON.stringify(body) });
      onSaved();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };

  return <form className="admin-form" onSubmit={submit}>
    <h2>{event ? 'Edit event' : 'Create an event'}</h2>
    <div className="form-grid">
      <label className="span-two">Event title<input required maxLength="140" value={form.title} onChange={(e) => update('title', e.target.value)} /></label>
      <label>Category<input required value={form.category} onChange={(e) => update('category', e.target.value)} /></label>
      <label>Format<select value={form.mode} onChange={(e) => update('mode', e.target.value)}><option value="online">Online</option><option value="offline">In person</option></select></label>
      <label>Starts<input type="datetime-local" required value={form.startsAt} onChange={(e) => update('startsAt', e.target.value)} /></label>
      <label>Ends<input type="datetime-local" required value={form.endsAt} onChange={(e) => update('endsAt', e.target.value)} /></label>
      <label>Attendance points<input type="number" min="0" step="any" required value={form.attendancePoints} onChange={(e) => update('attendancePoints', e.target.value)} /><small>Earned once after a verified check-in; past awards stay unchanged.</small></label>
      {form.mode === 'offline' && <label className="span-two">Location<input required value={form.location} onChange={(e) => update('location', e.target.value)} /></label>}
      <label>Registration deadline (optional)<input type="datetime-local" value={form.registrationDeadline} onChange={(e) => update('registrationDeadline', e.target.value)} /></label>
      <label>Capacity (optional)<input type="number" min="1" value={form.capacity} onChange={(e) => update('capacity', e.target.value)} /></label>
      <label>Status<select value={form.status} onChange={(e) => update('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></label>
      <label className="span-two">Description<textarea required rows="4" value={form.description} onChange={(e) => update('description', e.target.value)} /></label>
    </div>
    {error && <div className="notice error-notice">{error}</div>}
    <div className="form-actions"><button className="button button-dark" disabled={busy}>{busy ? 'Saving...' : event ? 'Save changes' : 'Create event'}</button><button type="button" className="button button-outline" onClick={onCancel}>Cancel</button></div>
  </form>;
}

function dateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function Admin({ token }) {
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(undefined);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [confirmationName, setConfirmationName] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [qrDisplay, setQrDisplay] = useState(null);
  const [qrLoadingId, setQrLoadingId] = useState('');
  const [qrError, setQrError] = useState('');
  const [error, setError] = useState('');

  const loadEvents = useCallback(() => api('/admin/events', { token }).then(({ events: result }) => setEvents(result)).catch((reason) => setError(reason.message)), [token]);
  useEffect(() => { loadEvents(); }, [loadEvents]);
  const loadAttendees = async (event) => {
    setSelected(event);
    try {
      const { registrations } = await api(`/admin/events/${event.id}/registrations`, { token });
      setAttendees(registrations);
    } catch (reason) { setError(reason.message); }
  };
  const generateEventQr = async (event) => {
    setQrLoadingId(event.id);
    setQrError('');
    try {
      const result = await api(`/admin/events/${event.id}/check-in-qr`, { method: 'POST', token });
      setQrDisplay(result);
    } catch (reason) {
      setQrError(reason.message);
    } finally {
      setQrLoadingId('');
    }
  };
  const deleteEvent = async (event) => {
    setDeleting(true);
    setDeleteError('');
    try {
      await api(`/admin/events/${event.id}`, {
        method: 'DELETE',
        token,
        body: JSON.stringify({ confirmationName }),
      });
      setEventToDelete(null);
      setConfirmationName('');
      setQrDisplay((current) => current?.event.id === event.id ? null : current);
      if (selected?.id === event.id) setSelected(event.status === 'deleted' ? null : event);
      await loadEvents();
    } catch (reason) {
      setDeleteError(reason.message);
    } finally {
      setDeleting(false);
    }
  };
  const closeDeleteDialog = () => {
    if (deleting) return;
    setEventToDelete(null);
    setConfirmationName('');
    setDeleteError('');
  };

  if (editing !== undefined) return <main className="page-wrap"><EventForm token={token} event={editing} onSaved={() => { setEditing(undefined); loadEvents(); }} onCancel={() => setEditing(undefined)} /></main>;

  return (
    <main className="page-wrap admin-page">
      <div className="page-heading admin-heading"><div><span className="eyebrow">THE CONTROL ROOM</span><h1>Event <span>admin.</span></h1><p>Make good things happen.</p></div><button className="button button-dark" onClick={() => setEditing(null)}>+ Create event</button></div>
      {error && <div className="notice error-notice">{error}</div>}
      <div className="admin-grid">
        <section className="admin-panel"><h2>All events <span>{events.length}</span></h2>
          {events.map((event) => <div className="admin-event-row" key={event.id}><div><b>{event.title}</b><span>{eventDate(event.startsAt)} · {event.attendanceCount || 0}/{event.registrationCount} attended · {event.totalPointsAwarded || 0} pts awarded · {event.attendancePoints ?? 0} pts per attendee</span></div><span className={`status-pill status-${event.status}`}>{event.status}</span><div className="admin-row-actions"><button className="small-button" disabled={event.status === 'deleted'} onClick={() => setEditing(event)}>Edit</button><button className="small-button" onClick={() => loadAttendees(event)}>Attendees</button><button className="small-button" disabled={event.status !== 'published' || qrLoadingId === event.id} onClick={() => generateEventQr(event)}>{qrLoadingId === event.id ? 'Generating...' : 'Event QR'}</button><button className="small-button delete-event-button" disabled={event.status === 'deleted'} onClick={() => { setEventToDelete(event); setConfirmationName(''); setDeleteError(''); }}>Delete</button></div></div>)}
          {!events.length && <p className="muted">No events yet. Create your first event.</p>}
          {qrError && <div className="notice error-notice">{qrError}</div>}
        </section>
        <section className="admin-panel">
          <h2>Attendance <Users size={18} /></h2>
          {!selected && <p className="muted">Choose attendees on an event to review attendance and points.</p>}
          {selected && <div className="attendee-list"><h3>{selected.title} <span>{attendees.length} people</span></h3><p className="attendance-summary">{attendees.filter((item) => item.checkedInAt).length} attended · {attendees.reduce((total, item) => total + (item.pointsAwarded || 0), 0)} total points awarded</p>{attendees.map((attendee) => <div className="attendee-row" key={attendee.id}><div><b>{attendee.user.name}</b><span>{attendee.user.email}</span></div><span className={attendee.checkedInAt ? 'check-status done' : 'check-status'}>{attendee.checkedInAt ? `${eventDate(attendee.checkedInAt)} · ${attendee.pointsAwarded} pts` : 'Registered'}</span></div>)}</div>}
        </section>
      </div>
      {qrDisplay && <div className="qr-display-overlay" role="dialog" aria-modal="true" aria-labelledby="qr-display-title">
        <div className="qr-display">
          <button className="qr-display-close" aria-label="Close event QR" onClick={() => setQrDisplay(null)}><X size={22} /></button>
          <span className="eyebrow"><QrCode size={17} /> STUDENT CHECK-IN</span>
          <h2 id="qr-display-title">{qrDisplay.event.title}</h2>
          <img src={qrDisplay.qrCodeDataUrl} alt={`Event check-in QR code for ${qrDisplay.event.title}`} />
          <p>Students scan this code with their phones and sign in to record attendance.</p>
          <span className="qr-display-window">Check-in: {eventDate(qrDisplay.checkInWindow.opensAt)} – {eventDate(qrDisplay.checkInWindow.closesAt)}</span>
          <button className="button button-outline" onClick={() => generateEventQr(qrDisplay.event)}>Replace QR code</button>
        </div>
      </div>}
      {eventToDelete && <div className="qr-display-overlay delete-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
        <form className="delete-event-dialog" onSubmit={(e) => { e.preventDefault(); deleteEvent(eventToDelete); }}>
          <button type="button" className="qr-display-close" aria-label="Cancel event deletion" disabled={deleting} onClick={closeDeleteDialog}><X size={22} /></button>
          <span className="eyebrow">CONFIRM EVENT DELETION</span>
          <h2 id="delete-dialog-title">Delete this event?</h2>
          <p><b>{eventToDelete.title}</b> will be removed from public events and its check-in QR will stop working. Existing attendance and awarded points will be preserved.</p>
          <label htmlFor="delete-event-confirmation">Type the event name to continue</label>
          <input id="delete-event-confirmation" autoComplete="off" value={confirmationName} onChange={(e) => setConfirmationName(e.target.value)} placeholder={eventToDelete.title} required />
          {deleteError && <div className="notice error-notice" role="alert">{deleteError}</div>}
          <div className="delete-dialog-actions"><button type="button" className="button button-outline" disabled={deleting} onClick={closeDeleteDialog}>Cancel</button><button className="button delete-confirm-button" disabled={deleting || confirmationName !== eventToDelete.title}>{deleting ? 'Deleting...' : 'Delete event'}</button></div>
        </form>
      </div>}
    </main>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-main">
          <div className="footer-about">
            <Link className="footer-brand" to="/">PUA ICPC <span>COMMUNITY</span></Link>
            <p>Made for the love of the problem. Learn, practice, and compete together.</p>
            <span className="footer-location">Alexandria, Egypt · Est. 2024</span>
          </div>
          <nav className="footer-links" aria-label="Footer navigation">
            <b>Explore</b>
            <Link to="/">Events</Link>
            <Link to="/resources">Resources</Link>
            <Link to="/leaderboard">Leaderboard</Link>
            <Link to="/login">Join the community</Link>
          </nav>
          <div className="footer-community">
            <b>Stay connected</b>
            <p>Join the community chat for event updates and announcements.</p>
            <a href="https://chat.whatsapp.com/DYx4tz7Y2xnE8GJ1D8S6xn" target="_blank" rel="noopener noreferrer">
              Join us on WhatsApp <ArrowRight size={15} />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} PUA ICPC Community</span>
          <span>Built for curious minds and problem solvers.</span>
        </div>
      </div>
    </footer>
  );
}

function WhatsAppButton() {
  return (
    <a
      className="whatsapp-float"
      href="https://chat.whatsapp.com/DYx4tz7Y2xnE8GJ1D8S6xn"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join the PUA ICPC Community WhatsApp group"
      title="Join our WhatsApp community"
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d="M16.04 3.2A12.72 12.72 0 0 0 5.1 22.4L3.4 28.6l6.35-1.67A12.72 12.72 0 1 0 16.04 3.2Zm0 23.2c-2 0-3.96-.54-5.68-1.57l-.4-.24-3.77.99 1-3.67-.26-.42a10.45 10.45 0 1 1 9.1 4.91Zm5.74-7.83c-.31-.16-1.83-.9-2.11-1-.28-.1-.49-.15-.7.16-.2.31-.8 1-.98 1.2-.18.2-.36.23-.67.08-.31-.16-1.31-.49-2.49-1.54-.92-.82-1.54-1.83-1.72-2.14-.18-.31-.02-.48.14-.64.14-.14.31-.36.46-.54.15-.18.2-.31.3-.51.1-.2.05-.39-.03-.54-.08-.16-.7-1.69-.96-2.31-.25-.6-.51-.52-.7-.53l-.6-.01c-.2 0-.54.08-.82.39-.28.31-1.07 1.05-1.07 2.56 0 1.51 1.1 2.97 1.25 3.18.15.2 2.16 3.3 5.23 4.62.73.31 1.3.5 1.75.64.74.24 1.41.2 1.94.12.59-.09 1.83-.75 2.09-1.48.26-.73.26-1.36.18-1.49-.08-.13-.28-.2-.59-.36Z" fill="currentColor" />
      </svg>
    </a>
  );
}

export default function App() {
  const session = useSession();
  const [theme, setTheme] = useState(() => localStorage.getItem('pua-theme') === 'dark' ? 'dark' : 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('pua-theme', theme);
  }, [theme]);
  return (
    <div className="app-shell">
      <Header user={session.user} onSignOut={session.signOut} />
      <Routes>
        <Route path="/" element={<EventsPage />} />
        <Route path="/events/:eventId" element={<EventDetail token={session.token} user={session.user} />} />
        <Route path="/check-in/:eventId" element={session.loading ? <div className="empty-state"><span className="loader" /> Loading your account...</div> : <CheckInPage token={session.token} user={session.user} />} />
        <Route path="/login" element={<AuthPage session={session} />} />
        <Route path="/my-events" element={session.loading ? <div className="empty-state"><span className="loader" /> Loading your account...</div> : session.user ? <MyEvents token={session.token} /> : <Navigate to="/login" replace />} />
        <Route path="/settings" element={session.loading ? <div className="empty-state"><span className="loader" /> Loading your account...</div> : session.user ? <SettingsPage session={session} theme={theme} onThemeChange={setTheme} /> : <Navigate to="/login" replace />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/users/:userId" element={<UserProfilePage />} />
        <Route path="/admin" element={session.loading ? <div className="empty-state"><span className="loader" /> Loading your account...</div> : session.user?.role === 'admin' ? <Admin token={session.token} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<main className="page-wrap"><div className="empty-state"><h3>That page wandered off.</h3><Link className="button button-dark" to="/">Back to events</Link></div></main>} />
      </Routes>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
