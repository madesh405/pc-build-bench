import React, { useMemo, useState } from "react";
import {
  FaDesktop,
  FaMicrochip,
  FaCheckCircle,
  FaRupeeSign,
  FaBolt,
  FaTools,
  FaMemory,
  FaGamepad
} from "react-icons/fa";
import { components, categories } from "./data";

export default function App() {
  const [page, setPage] = useState("home");
  const [loggedIn, setLoggedIn] = useState(false);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [buildName, setBuildName] = useState("My Gaming PC");
  const [purpose, setPurpose] = useState("Gaming");
  const [budget, setBudget] = useState(100000);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");

  const filteredComponents = useMemo(() => {
    return components.filter(c => {
      const matchesCategory = category === "All" || c.category === category;
      const text = `${c.name} ${c.brand} ${c.category}`.toLowerCase();
      return matchesCategory && text.includes(search.toLowerCase());
    });
  }, [category, search]);

  const totalCost = selected.reduce((sum, c) => sum + c.price, 0);
  const estimatedPower = selected.reduce((sum, c) => sum + (c.power || 0), 0);
  const remainingBudget = Number(budget || 0) - totalCost;

  const checks = useMemo(() => {
    const cpu = selected.find(c => c.category === "CPU");
    const motherboard = selected.find(c => c.category === "Motherboard");
    const ram = selected.find(c => c.category === "RAM");
    const psu = selected.find(c => c.category === "PSU");
    const result = [];

    if (cpu && motherboard) {
      result.push({
        title: "CPU ↔ Motherboard Socket",
        ok: cpu.socket === motherboard.socket,
        detail: `${cpu.socket || "Unknown"} vs ${motherboard.socket || "Unknown"}`
      });
    }
    if (ram && motherboard) {
      result.push({
        title: "RAM ↔ Motherboard Type",
        ok: ram.ramType === motherboard.ramType,
        detail: `${ram.ramType || "Unknown"} vs ${motherboard.ramType || "Unknown"}`
      });
    }
    if (psu) {
      const required = Math.ceil(estimatedPower * 1.2);
      result.push({
        title: "PSU Capacity",
        ok: psu.wattage >= required,
        detail: `${psu.wattage}W available • ${required}W recommended`
      });
    }
    return result;
  }, [selected, estimatedPower]);

  function addComponent(component) {
    const alreadySelected = selected.some(c => c.id === component.id);
    const sameCategory = selected.find(c => c.category === component.category);

    if (alreadySelected) {
      setMessage("This component is already selected.");
      return;
    }
    if (sameCategory) {
      setSelected(prev => prev.map(c => c.category === component.category ? component : c));
      setMessage(`${component.category} replaced successfully.`);
    } else {
      setSelected(prev => [...prev, component]);
      setMessage(`${component.name} added to your build.`);
    }
  }

  function removeComponent(id) {
    setSelected(prev => prev.filter(c => c.id !== id));
  }

  function login() {
    setLoggedIn(true);
    setPage("dashboard");
  }

  function resetBuild() {
    setSelected([]);
    setBuildName("My Gaming PC");
    setPurpose("Gaming");
    setBudget(100000);
    setMessage("Build reset.");
  }

  function Navbar() {
    return (
      <nav className="navbar navbar-expand-lg navbar-dark app-nav">
        <div className="container">
          <button className="navbar-brand fw-bold border-0 bg-transparent text-white" onClick={() => setPage("home")}>
            🖥️ PC Build Bench
          </button>
          <div className="ms-auto d-flex gap-2 align-items-center">
            <button className="btn btn-sm btn-outline-light" onClick={() => setPage("components")}>Components</button>
            {loggedIn ? (
              <>
                <button className="btn btn-sm btn-light" onClick={() => setPage("dashboard")}>Dashboard</button>
                <button className="btn btn-sm btn-outline-warning" onClick={() => {setLoggedIn(false); setPage("home")}}>Logout</button>
              </>
            ) : (
              <button className="btn btn-sm btn-light" onClick={() => setPage("login")}>Login</button>
            )}
          </div>
        </div>
      </nav>
    );
  }

  function Home() {
  return (
    <>
      <section className="hero">

        {/* Decorative graphics */}
        <div className="hero-circle circle-1"></div>
        <div className="hero-circle circle-2"></div>
        <div className="hero-grid"></div>

        <div className="container py-5 text-center hero-content">

          <div className="hero-icon">
            <FaDesktop />
          </div>

          <span className="badge text-bg-primary mb-3">
            PC Configuration Decision Support System
          </span>

          <h1 className="display-5 fw-bold">
            Build Your <span className="highlight">Perfect PC</span>
          </h1>

          <p className="lead text-secondary mx-auto hero-text">
            Select PC components, create custom builds, check compatibility,
            estimate power consumption and stay within your budget.
          </p>

          <div className="d-flex justify-content-center gap-2 flex-wrap">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setPage(loggedIn ? "dashboard" : "login")}
            >
              <FaTools /> Start Building
            </button>

            <button
              className="btn btn-outline-secondary btn-lg"
              onClick={() => setPage("components")}
            >
              <FaMicrochip /> Browse Components
            </button>
          </div>

        </div>
      </section>

      {/* Statistics */}

      <section className="stats-section">
        <div className="container">

          <div className="row text-center g-4">

            <div className="col-md-4">
              <div className="stat-graphic">
                <FaMicrochip />
                <h3>7+</h3>
                <p>Component Categories</p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="stat-graphic">
                <FaCheckCircle />
                <h3>Smart</h3>
                <p>Compatibility Analysis</p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="stat-graphic">
                <FaBolt />
                <h3>Live</h3>
                <p>Power Estimation</p>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* Features */}

      <div className="container py-5">

        <div className="row g-4">

          <Feature
            icon={<FaMicrochip />}
            title="Component Selection"
            text="Browse and select PC components from different categories."
          />

          <Feature
            icon={<FaCheckCircle />}
            title="Compatibility Check"
            text="Check CPU, motherboard, RAM and PSU compatibility."
          />

          <Feature
            icon={<FaRupeeSign />}
            title="Budget Analysis"
            text="Calculate total cost and monitor your remaining budget."
          />

          <Feature
            icon={<FaBolt />}
            title="Power Analysis"
            text="Estimate system power requirements and PSU suitability."
          />

        </div>

      </div>
    </>
  );
}

  function Feature({ icon, title, text }) {
  return (
    <div className="col-md-6 col-lg-3">

      <div className="card feature-card h-100 shadow-sm">

        <div className="card-body">

          <div className="feature-icon">
            {icon}
          </div>

          <h5>{title}</h5>

          <p className="text-secondary mb-0">
            {text}
          </p>

        </div>

      </div>

    </div>
  );
}

  function Login() {
    return (
      <div className="container py-5" style={{maxWidth: "500px"}}>
        <div className="card shadow-sm login-card">
          <div className="card-body p-4">
            <h2 className="mb-1">Welcome</h2>
            <p className="text-secondary">Frontend demo login</p>
            <input className="form-control mb-3" placeholder="Email" defaultValue="student@example.com" />
            <input className="form-control mb-3" type="password" placeholder="Password" defaultValue="password" />
            <button className="btn btn-primary w-100" onClick={login}>Login</button>
            <p className="small text-secondary text-center mt-3 mb-0">
              Authentication will connect to the backend later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  function Components() {
    return (
      <div className="container py-4">
        <div className="d-flex flex-wrap justify-content-between gap-3 mb-4">
          <div>
            <h2 className="mb-0">Component Repository</h2>
            <p className="text-secondary">Browse available PC components.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setPage(loggedIn ? "dashboard" : "login")}>Go to Build</button>
        </div>

        <div className="card p-3 shadow-sm mb-4">
          <div className="row g-2">
            <div className="col-md-7">
              <input className="form-control" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by component name or brand..." />
            </div>
            <div className="col-md-5">
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="row g-3">
          {filteredComponents.map(c => (
            <div className="col-md-6 col-lg-4" key={c.id}>
              <div className="card component-card h-100 shadow-sm">
                <div className="card-body">
                  <span className="badge text-bg-secondary">{c.category}</span>
                  <h5 className="mt-2">{c.name}</h5>
                  <p className="text-secondary mb-1">{c.brand}</p>
                  <h5 className="text-primary">₹{c.price.toLocaleString("en-IN")}</h5>
                  <small className="text-secondary">
                    {c.socket && <>Socket: {c.socket}<br /></>}
                    {c.ramType && <>Memory: {c.ramType}<br /></>}
                    {c.wattage && <>Capacity: {c.wattage}W</>}
                  </small>
                </div>
                {loggedIn && <div className="card-footer bg-white border-0">
                  <button className="btn btn-outline-primary w-100" onClick={() => {addComponent(c); setPage("dashboard")}}>
                    Add to Build
                  </button>
                </div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function Dashboard() {
    return (
      <div className="container py-4">
        <div className="mb-4">
          <h2>PC Build Dashboard</h2>

<p className="text-secondary">
  Create your configuration and analyze it in real time.
</p>

<div className="build-progress mb-4">

  <div className="d-flex justify-content-between mb-2">
    <span>Build Completion</span>
    <strong>{selected.length} / 7 Components</strong>
  </div>

  <div className="progress" style={{ height: "10px" }}>
    <div
      className="progress-bar"
      style={{
        width: `${(selected.length / 7) * 100}%`
      }}
    ></div>
  </div>

</div>
        </div>

        {message && <div className="alert alert-info alert-dismissible">
          {message}
          <button className="btn-close" onClick={() => setMessage("")}></button>
        </div>}

        <div className="row g-4">
          <div className="col-lg-4">
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h5>Build Details</h5>
                <label className="form-label">Build Name</label>
                <input className="form-control mb-3" value={buildName} onChange={e => setBuildName(e.target.value)} />

                <label className="form-label">
  PC Purpose
</label>

<div className="purpose-grid">

  {[
    { name: "Gaming", icon: "🎮" },
    { name: "Programming", icon: "💻" },
    { name: "Office", icon: "📄" },
    { name: "Video Editing", icon: "🎬" },
    { name: "AI / Machine Learning", icon: "🤖" }
  ].map(item => (

    <button
      key={item.name}
      className={`purpose-btn ${
        purpose === item.name ? "purpose-active" : ""
      }`}
      onClick={() => setPurpose(item.name)}
    >

      <span>{item.icon}</span>

      <small>{item.name}</small>

    </button>

  ))}

</div>

                <label className="form-label">
  Budget: ₹{Number(budget).toLocaleString("en-IN")}
</label>

<input
  type="range"
  className="form-range budget-slider"
  min="30000"
  max="300000"
  step="5000"
  value={budget}
  onChange={e => setBudget(Number(e.target.value))}
/>

<div className="d-flex justify-content-between text-secondary small">
  <span>₹30,000</span>
  <span>₹3,00,000</span>
</div>
              </div>
            </div>

            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <h5>Selected Components</h5>
                  <span className="badge text-bg-primary">{selected.length}</span>
                </div>
                {selected.length === 0 ? (
                  <p className="text-secondary mb-0">No components selected yet.</p>
                ) : selected.map(c => (
                  <div className="selected-item" key={c.id}>
                    <div>
                      <small className="text-secondary">{c.category}</small>
                      <div className="fw-semibold">{c.name}</div>
                      <small>₹{c.price.toLocaleString("en-IN")}</small>
                    </div>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => removeComponent(c.id)}>×</button>
                  </div>
                ))}
                <button className="btn btn-outline-secondary w-100 mt-3" onClick={resetBuild}>Reset Build</button>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Select Components</h5>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => setPage("components")}>Browse All</button>
                </div>

                {categories.slice(1).map(cat => (
                  <div className="category-section" key={cat}>
                    <h6>{cat}</h6>
                    <div className="row g-2">
                      {components.filter(c => c.category === cat).map(c => (
                        <div className="col-md-6" key={c.id}>
                          <button className={`component-option ${selected.some(s => s.id === c.id) ? "active-option" : ""}`}
                            onClick={() => addComponent(c)}>
                            <span>
                              <strong>{c.name}</strong><br />
                              <small>{c.brand} • ₹{c.price.toLocaleString("en-IN")}</small>
                            </span>
                            <span>+</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="row g-3">
              <Stat title="Total Cost" value={`₹${totalCost.toLocaleString("en-IN")}`} />
              <Stat title="Estimated Power" value={`${estimatedPower}W`} />
              <Stat title="Remaining Budget" value={`₹${remainingBudget.toLocaleString("en-IN")}`}
                danger={remainingBudget < 0} />
            </div>

            <div className="card shadow-sm mt-4">
              <div className="card-body">
                <h5>Build Analysis</h5>
                <p className="text-secondary">Basic frontend compatibility analysis.</p>

                {checks.length === 0 ? (
                  <div className="alert alert-warning mb-0">
                    Select related components (CPU + Motherboard, RAM + Motherboard, or PSU) to see compatibility checks.
                  </div>
                ) : checks.map((check, index) => (
                  <div key={index} className={`analysis-row ${check.ok ? "analysis-ok" : "analysis-bad"}`}>
                    <div>
                      <strong>{check.ok ? "✓" : "✕"} {check.title}</strong>
                      <div><small>{check.detail}</small></div>
                    </div>
                    <span>{check.ok ? "Compatible" : "Incompatible"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function Stat({title, value, danger}) {
    return (
      <div className="col-md-4">
        <div className={`card shadow-sm stat-card ${danger ? "border-danger" : ""}`}>
          <div className="card-body">
            <small className="text-secondary">{title}</small>
            <h4 className={danger ? "text-danger" : "text-primary"}>{value}</h4>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      {page === "home" && <Home />}
      {page === "login" && <Login />}
      {page === "components" && <Components />}
      {page === "dashboard" && loggedIn && <Dashboard />}
      <footer className="text-center text-secondary py-4 mt-4">
        PC Build Bench • Frontend Prototype
      </footer>
    </>
  );
}
