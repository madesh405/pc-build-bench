import React, { useMemo, useState } from "react";
import {
  FaDesktop, FaMicrochip, FaSearch, FaFilter, FaPlus, FaTrash,
  FaCheckCircle, FaTimesCircle, FaBolt, FaRupeeSign, FaCubes,
  FaArrowRight, FaUser, FaChartLine, FaLightbulb, FaShieldAlt,
  FaSignOutAlt, FaSave, FaExchangeAlt, FaHome
} from "react-icons/fa";
import { components, categories, workloads } from "./data";

const CORE_MODULES = [
  { id: "components", number: "01", short: "Components", title: "Component Management", icon: <FaMicrochip /> },
  { id: "build", number: "02", short: "Build", title: "PC Build Configuration", icon: <FaCubes /> },
  { id: "analysis", number: "03", short: "Analysis", title: "Compatibility & Analysis", icon: <FaCheckCircle /> }
];

const BUILD_CATEGORIES = ["CPU", "Motherboard", "RAM", "GPU", "Storage", "PSU", "Case"];

export default function App() {
  const [page, setPage] = useState("home");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginRedirect, setLoginRedirect] = useState("components");

  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [returnToBuildAfterSelection, setReturnToBuildAfterSelection] = useState(false);

  const [buildName, setBuildName] = useState("My Gaming PC");
  const [purpose, setPurpose] = useState("Gaming");
  const [budget, setBudget] = useState(100000);
  const [selected, setSelected] = useState([]);

  const [savedBuilds, setSavedBuilds] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const [profile, setProfile] = useState({
    name: "Student User",
    email: "student@example.com",
    role: "user"
  });

  const [adminComponents, setAdminComponents] = useState(components);

  const filteredComponents = useMemo(() => {
    const term = search.trim().toLowerCase();

    return components.filter((item) => {
      const matchesCategory = category === "All" || item.category === category;
      const text = `${item.name} ${item.brand} ${item.category}`.toLowerCase();
      return matchesCategory && text.includes(term);
    });
  }, [category, search]);

  const totalCost = selected.reduce((sum, item) => sum + Number(item.price), 0);
  const estimatedPower = selected.reduce((sum, item) => sum + Number(item.power || 0), 0);
  const remainingBudget = Number(budget) - totalCost;
  const progress = Math.min(100, Math.round((selected.length / BUILD_CATEGORIES.length) * 100));

  const analysisChecks = useMemo(() => {
    const cpu = selected.find((item) => item.category === "CPU");
    const motherboard = selected.find((item) => item.category === "Motherboard");
    const ram = selected.find((item) => item.category === "RAM");
    const psu = selected.find((item) => item.category === "PSU");
    const checks = [];

    if (cpu && motherboard) {
      checks.push({
        title: "CPU ↔ Motherboard Socket",
        input: `${cpu.socket} / ${motherboard.socket}`,
        ok: cpu.socket === motherboard.socket,
        output: cpu.socket === motherboard.socket ? "Compatible" : "Incompatible"
      });
    }

    if (ram && motherboard) {
      checks.push({
        title: "RAM ↔ Motherboard Type",
        input: `${ram.ramType} / ${motherboard.ramType}`,
        ok: ram.ramType === motherboard.ramType,
        output: ram.ramType === motherboard.ramType ? "Compatible" : "Incompatible"
      });
    }

    if (psu) {
      const recommended = Math.ceil(estimatedPower * 1.2);
      checks.push({
        title: "PSU Capacity",
        input: `${psu.wattage}W PSU / ${recommended}W recommended`,
        ok: Number(psu.wattage) >= recommended,
        output: Number(psu.wattage) >= recommended ? "Sufficient" : "Insufficient"
      });
    }

    return checks;
  }, [selected, estimatedPower]);

  const workloadScore = useMemo(() => {
    if (!selected.length) return 0;
    const matching = selected.filter((item) => item.workloads?.includes(purpose)).length;
    return Math.min(100, 40 + matching * 12 + (selected.some((item) => item.category === "GPU") ? 12 : 0));
  }, [selected, purpose]);

  const recommendations = useMemo(() => {
    const result = [];
    const cpu = selected.find((item) => item.category === "CPU");
    const motherboard = selected.find((item) => item.category === "Motherboard");
    const ram = selected.find((item) => item.category === "RAM");
    const gpu = selected.find((item) => item.category === "GPU");

    if (!cpu) result.push("Select a CPU to establish the base configuration.");
    if (!motherboard && cpu) result.push(`Select a motherboard with ${cpu.socket} socket.`);
    if (!ram) result.push("Select RAM and match its memory type with the motherboard.");
    if (!gpu && ["Gaming", "Video Editing", "AI / Machine Learning"].includes(purpose))
      result.push(`Consider a dedicated GPU for ${purpose}.`);
    if (ram && ram.name.includes("16GB") && ["Video Editing", "AI / Machine Learning"].includes(purpose))
      result.push("Consider moving to 32GB RAM for heavier workloads.");
    if (remainingBudget > 15000 && selected.length >= 3)
      result.push("Budget remains available for a possible upgrade.");
    if (!result.length) result.push("Current configuration has a good starting balance.");
    return result;
  }, [selected, purpose, remainingBudget]);

  function showMessage(text, type = "info") {
    setMessage(text);
    setMessageType(type);
    window.clearTimeout(window.__pcBenchToast);
    window.__pcBenchToast = window.setTimeout(() => setMessage(""), 2800);
  }

  function requireLogin(destination, reason) {
    setLoginRedirect(destination);
    setPage("login");
    showMessage(`Login required to ${reason}.`, "warning");
  }

  function login() {
    setLoggedIn(true);
    const destination = loginRedirect || "components";
    setLoginRedirect(null);
    setPage(destination);
    showMessage("✓ Login successful.", "success");
  }

  function logout() {
    setLoggedIn(false);
    setPage("home");
    showMessage("Logged out.", "info");
  }

  function startBuilding() {
    if (!loggedIn) {
      requireLogin("components", "start building");
      return;
    }
    setReturnToBuildAfterSelection(false);
    setCategory("All");
    setSearch("");
    setPage("components");
  }

  function openComponentSelector(targetCategory = "All", returnToBuild = true) {
    if (!loggedIn) {
      requireLogin("components", "select components");
      return;
    }
    setCategory(targetCategory);
    setSearch("");
    setReturnToBuildAfterSelection(returnToBuild);
    setPage("components");
  }

  function addComponent(component) {
    const old = selected.find((item) => item.category === component.category);

    if (old?.id === component.id) {
      showMessage(`✓ ${component.name} is already selected.`, "warning");
      if (returnToBuildAfterSelection) setPage("build");
      return;
    }

    if (old) {
      setSelected((prev) =>
        prev.map((item) => item.category === component.category ? component : item)
      );
      showMessage(`↻ ${component.category} changed to ${component.name}.`, "success");
    } else {
      setSelected((prev) => [...prev, component]);
      showMessage(`✓ ${component.name} added to your build.`, "success");
    }

    if (returnToBuildAfterSelection) {
      setPage("build");
    }
  }

  function removeComponent(id) {
    const item = selected.find((component) => component.id === id);
    setSelected((prev) => prev.filter((component) => component.id !== id));
    showMessage(`✓ ${item?.name || "Component"} removed.`, "info");
  }

  function resetBuild() {
    setSelected([]);
    setBuildName("My Gaming PC");
    setPurpose("Gaming");
    setBudget(100000);
    showMessage("Build reset.", "info");
  }

  function saveBuild() {
    if (!loggedIn) {
      requireLogin("build", "save your build");
      return;
    }

    const build = {
      id: Date.now(),
      name: buildName || "Untitled Build",
      purpose,
      budget: Number(budget),
      totalCost,
      power: estimatedPower,
      componentCount: selected.length
    };

    setSavedBuilds((prev) => [build, ...prev]);
    showMessage(`✓ "${build.name}" saved.`, "success");
  }

  function loadSavedBuild(saved) {
    setBuildName(saved.name);
    setPurpose(saved.purpose);
    setBudget(saved.budget);
    setPage("build");
    showMessage(`✓ "${saved.name}" loaded.`, "success");
  }

  function continueToAnalysis() {
    if (!selected.length) {
      showMessage("Select at least one component before analysis.", "warning");
      return;
    }
    setPage("analysis");
  }

  function goToModule(id) {
    if (!loggedIn) {
      requireLogin(id, "access the build workflow");
      return;
    }
    setPage(id);
  }

  return (
    <>
      <Navbar />

      {message && (
        <div className={`global-toast toast-${messageType}`}>
          <span>{message}</span>
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      {page === "home" && (
        <Home
          onStart={startBuilding}
          onComponents={() => {
            if (loggedIn) {
              setReturnToBuildAfterSelection(false);
              setPage("components");
            } else {
              requireLogin("components", "browse and select components");
            }
          }}
        />
      )}

      {page === "login" && <Login onLogin={login} />}

      {page === "components" && loggedIn && (
        <>
          <Workflow current="components" goToModule={goToModule} />
          <ComponentManagement
            filteredComponents={filteredComponents}
            category={category}
            setCategory={setCategory}
            search={search}
            setSearch={setSearch}
            selected={selected}
            onAdd={addComponent}
            onBack={() => setPage(returnToBuildAfterSelection ? "build" : "home")}
            onContinue={() => setPage("build")}
          />
        </>
      )}

      {page === "build" && loggedIn && (
        <>
          <Workflow current="build" goToModule={goToModule} />
          <BuildConfiguration
            buildName={buildName}
            setBuildName={setBuildName}
            purpose={purpose}
            setPurpose={setPurpose}
            budget={budget}
            setBudget={setBudget}
            selected={selected}
            removeComponent={removeComponent}
            progress={progress}
            totalCost={totalCost}
            remainingBudget={remainingBudget}
            estimatedPower={estimatedPower}
            resetBuild={resetBuild}
            saveBuild={saveBuild}
            chooseCategory={(cat) => openComponentSelector(cat, true)}
            addAll={() => openComponentSelector("All", true)}
            goToAnalysis={continueToAnalysis}
          />
        </>
      )}

      {page === "analysis" && loggedIn && (
        <>
          <Workflow current="analysis" goToModule={goToModule} />
          <Analysis
            buildName={buildName}
            purpose={purpose}
            budget={budget}
            selected={selected}
            totalCost={totalCost}
            estimatedPower={estimatedPower}
            remainingBudget={remainingBudget}
            checks={analysisChecks}
            workloadScore={workloadScore}
            recommendations={recommendations}
            onBack={() => setPage("build")}
            onSave={saveBuild}
            onNewBuild={() => {
              resetBuild();
              setPage("components");
            }}
            onWorkload={() => setPage("workload")}
          />
        </>
      )}

      {page === "mybuilds" && loggedIn && (
        <MyBuilds savedBuilds={savedBuilds} onLoad={loadSavedBuild} onBack={() => setPage("build")} />
      )}

      {page === "workload" && loggedIn && (
        <WorkloadModule
          purpose={purpose}
          setPurpose={setPurpose}
          selected={selected}
          score={workloadScore}
          recommendations={recommendations}
          onBack={() => setPage("analysis")}
        />
      )}

      {page === "profile" && loggedIn && (
        <Profile profile={profile} setProfile={setProfile} onBack={() => setPage("build")} />
      )}

      {page === "admin" && loggedIn && profile.role === "admin" && (
        <AdminModule
          adminComponents={adminComponents}
          setAdminComponents={setAdminComponents}
          onBack={() => setPage("build")}
        />
      )}

      <footer className="site-footer">
        PC Build Bench • Integrated Frontend Prototype
      </footer>
    </>
  );

  function Navbar() {
    return (
      <nav className="app-nav">
        <div className="navbar-wrapper">
          <button className="logo-btn" onClick={() => setPage("home")}>
            <FaDesktop className="logo-icon" />
            <span>PC Build Bench</span>
          </button>

          <div className="nav-actions">
            {loggedIn && CORE_MODULES.map((item) => (
              <button
                key={item.id}
                className={`nav-link-btn ${page === item.id ? "nav-active" : ""}`}
                onClick={() => goToModule(item.id)}
              >
                {item.icon} {item.short}
              </button>
            ))}

            {loggedIn && (
              <>
                <button className="nav-link-btn" onClick={() => setPage("mybuilds")}>
                  <FaSave /> My Builds
                </button>
                <button className="nav-link-btn" onClick={() => setPage("profile")}>
                  <FaUser /> Profile
                </button>
              </>
            )}

            {loggedIn && profile.role === "admin" && (
              <button className="nav-link-btn" onClick={() => setPage("admin")}>
                <FaShieldAlt /> Admin
              </button>
            )}

            {!loggedIn ? (
              <button className="login-btn" onClick={() => requireLogin("components", "continue")}>
                Login
              </button>
            ) : (
              <button className="logout-btn" onClick={logout}>
                <FaSignOutAlt /> Logout
              </button>
            )}
          </div>
        </div>
      </nav>
    );
  }
}

function Home({ onStart, onComponents }) {
  return (
    <>
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-circle circle-1" />
        <div className="hero-circle circle-2" />

        <div className="container hero-content">
          <div className="hero-icon"><FaDesktop /></div>
          <span className="badge text-bg-primary mb-3">PC Configuration Decision Support System</span>
          <h1 className="display-5 fw-bold">Build Your <span className="highlight">Perfect PC</span></h1>
          <p className="lead text-secondary mx-auto hero-text">
            Select components, configure a custom build, check compatibility,
            analyze your budget and estimate system power.
          </p>

          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <button className="btn btn-primary btn-lg hero-btn" onClick={onStart}>
              Start Building <FaArrowRight />
            </button>
            <button className="btn btn-outline-secondary btn-lg hero-btn" onClick={onComponents}>
              Browse Components
            </button>
          </div>
        </div>
      </section>

      <section className="module-strip">
        <div className="container">
          <div className="row g-3">
            {CORE_MODULES.map((item) => (
              <div className="col-md-4" key={item.id}>
                <div className="module-pill">
                  <span className="module-number">{item.number}</span>
                  <span className="module-pill-icon">{item.icon}</span>
                  <span>{item.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Workflow({ current, goToModule }) {
  return (
    <div className="container pt-4">
      <div className="workflow-card">
        <div className="workflow-header">
          <div>
            <span className="module-label">BUILD WORKFLOW</span>
            <h6 className="mb-0">Select → Configure → Analyze</h6>
          </div>
          <small className="text-secondary">01 → 02 → 03</small>
        </div>

        <div className="workflow-steps">
          {CORE_MODULES.map((item, index) => (
            <React.Fragment key={item.id}>
              <button
                className={`workflow-step ${current === item.id ? "workflow-active" : ""}`}
                onClick={() => goToModule(item.id)}
              >
                <span className="workflow-number">{item.number}</span>
                <span className="workflow-icon">{item.icon}</span>
                <span>{item.title}</span>
              </button>
              {index < CORE_MODULES.length - 1 && <div className="workflow-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function Login({ onLogin }) {
  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-visual">
          <div className="login-visual-icon"><FaDesktop /></div>
          <span className="badge text-bg-primary mb-3">PC Build Bench</span>
          <h2>Build with confidence.</h2>
          <p>Sign in to create, save and analyze your PC configurations.</p>
          <div className="login-benefits">
            <div><FaCheckCircle /> Create PC builds</div>
            <div><FaCheckCircle /> Save configurations</div>
            <div><FaCheckCircle /> Analyze compatibility</div>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-icon"><FaUser /></div>
          <span className="module-label">ACCOUNT ACCESS</span>
          <h2>Login to continue</h2>
          <p className="text-secondary">A login is required for the build workflow.</p>

          <label className="form-label">Email</label>
          <input className="form-control mb-3" type="email" defaultValue="student@example.com" />

          <label className="form-label">Password</label>
          <input className="form-control mb-3" type="password" defaultValue="password" />

          <button className="btn btn-primary w-100 login-submit" onClick={onLogin}>
            Login and Continue <FaArrowRight />
          </button>

          <div className="login-note">
            <FaShieldAlt /> Frontend demonstration authentication
          </div>
        </div>
      </div>
    </div>
  );
}

function ComponentManagement({
  filteredComponents, category, setCategory, search, setSearch,
  selected, onAdd, onBack, onContinue
}) {
  return (
    <div className="container py-4">
      <div className="section-heading">
        <div>
          <span className="module-label">MODULE 1</span>
          <h2>Component Management</h2>
          <p className="text-secondary mb-0">Browse, search, filter and select the hardware for your build.</p>
        </div>
        <button className="btn btn-primary" onClick={onContinue}>
          Continue to Build <FaArrowRight />
        </button>
      </div>

      <div className="component-selection-summary">
        <div>
          <strong>{selected.length}/7</strong>
          <span>main categories selected</span>
        </div>
        <div className="selection-progress">
          <div className="selection-progress-fill" style={{ width: `${Math.min(100, (selected.length / 7) * 100)}%` }} />
        </div>
      </div>

      <div className="card filter-card shadow-sm">
        <div className="row g-2">
          <div className="col-lg-7">
            <div className="input-group">
              <span className="input-group-text"><FaSearch /></span>
              <input
                className="form-control"
                placeholder="Search component or brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-lg-5">
            <div className="input-group">
              <span className="input-group-text"><FaFilter /></span>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="category-tabs">
        {categories.map((item) => (
          <button
            key={item}
            className={`category-tab ${category === item ? "category-tab-active" : ""}`}
            onClick={() => { setCategory(item); setSearch(""); }}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="component-grid">
        {filteredComponents.map((item) => {
          const isSelected = selected.some((selectedItem) => selectedItem.id === item.id);
          const categoryAlreadyUsed = selected.some((selectedItem) => selectedItem.category === item.category);
          return (
            <div className={`component-card-new ${isSelected ? "component-card-selected" : ""}`} key={item.id}>
              <div className="component-card-top">
                <span className="component-category">{item.category}</span>
                {isSelected && <span className="selected-badge"><FaCheckCircle /> Selected</span>}
              </div>

              <h5>{item.name}</h5>
              <p className="component-brand">{item.brand}</p>
              <div className="component-price">₹{item.price.toLocaleString("en-IN")}</div>

              <div className="component-specs">
                {item.socket && <span>Socket: {item.socket}</span>}
                {item.ramType && <span>Memory: {item.ramType}</span>}
                {item.wattage && <span>PSU: {item.wattage}W</span>}
                {item.power > 0 && <span>Power: {item.power}W</span>}
              </div>

              <button
                className={`btn w-100 mt-3 ${isSelected ? "btn-success" : "btn-outline-primary"}`}
                onClick={() => onAdd(item)}
              >
                {isSelected ? (
                  <><FaCheckCircle /> Selected</>
                ) : categoryAlreadyUsed ? (
                  <><FaExchangeAlt /> Replace {item.category}</>
                ) : (
                  <><FaPlus /> Select Component</>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {!filteredComponents.length && (
        <div className="empty-state">
          <FaSearch />
          <h5>No components found</h5>
          <p>Try a different search or category.</p>
        </div>
      )}

      <div className="module-footer-nav">
        <button className="btn btn-outline-secondary" onClick={onBack}><FaHome /> Back</button>
        <button className="btn btn-primary" onClick={onContinue}>Review Build <FaArrowRight /></button>
      </div>
    </div>
  );
}

function BuildConfiguration({
  buildName, setBuildName, purpose, setPurpose, budget, setBudget,
  selected, removeComponent, progress, totalCost, remainingBudget,
  estimatedPower, resetBuild, saveBuild, chooseCategory, addAll, goToAnalysis
}) {
  return (
    <div className="container py-4">
      <div className="section-heading">
        <div>
          <span className="module-label">MODULE 2</span>
          <h2>PC Build Configuration</h2>
          <p className="text-secondary mb-0">Organize your selected components into a structured PC build.</p>
        </div>
        <button className="btn btn-outline-primary" onClick={addAll}>
          <FaMicrochip /> Add / Replace
        </button>
      </div>

      <div className="build-flow-note">
        <span>01 Select</span><FaArrowRight />
        <strong>02 Configure</strong><FaArrowRight />
        <span>03 Analyze</span>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm p-3 mb-4">
            <h5>Build Details</h5>

            <label className="form-label mt-2">Build Name</label>
            <input className="form-control mb-3" value={buildName} onChange={(e) => setBuildName(e.target.value)} />

            <label className="form-label">Primary Workload</label>
            <select className="form-select mb-3" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {workloads.map((item) => <option key={item}>{item}</option>)}
            </select>

            <div className="workload-explanation">
              <strong>Why this matters</strong>
              <p>The workload helps the analysis and recommendation logic judge whether the configuration suits its intended use.</p>
            </div>

            <label className="form-label">
              Budget: <strong>₹{Number(budget).toLocaleString("en-IN")}</strong>
            </label>
            <input
              type="range"
              className="form-range"
              min="30000"
              max="300000"
              step="5000"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />

            <div className="d-flex justify-content-between small text-secondary">
              <span>₹30,000</span><span>₹3,00,000</span>
            </div>
          </div>

          <div className="card shadow-sm p-3">
            <div className="d-flex justify-content-between mb-2">
              <span>Build Progress</span><strong>{progress}%</strong>
            </div>
            <div className="progress mb-2">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <small className="text-secondary">{selected.length} of 7 main categories selected</small>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm p-3 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="mb-1">PC Components</h5>
                <small className="text-secondary">Each row is one required category.</small>
              </div>
              <span className="badge text-bg-primary">{selected.length}/7</span>
            </div>

            <div className="build-slots">
              {BUILD_CATEGORIES.map((category) => {
                const item = selected.find((component) => component.category === category);
                return (
                  <div className={`build-slot ${item ? "build-slot-filled" : ""}`} key={category}>
                    <div className="build-slot-icon">
                      {item ? <FaCheckCircle /> : <FaMicrochip />}
                    </div>

                    <div className="build-slot-info">
                      <span className="build-slot-category">{category}</span>
                      {item ? (
                        <>
                          <strong>{item.name}</strong>
                          <small>{item.brand} • ₹{item.price.toLocaleString("en-IN")}</small>
                        </>
                      ) : (
                        <small>Not selected</small>
                      )}
                    </div>

                    <button
                      className={`btn btn-sm ${item ? "btn-outline-secondary" : "btn-outline-primary"}`}
                      onClick={() => chooseCategory(category)}
                    >
                      {item ? <><FaExchangeAlt /> Change</> : <><FaPlus /> Add</>}
                    </button>

                    {item && (
                      <button className="slot-remove" onClick={() => removeComponent(item.id)}>
                        <FaTrash />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="row g-3">
            <SummaryCard icon={<FaRupeeSign />} title="Total Cost" value={`₹${totalCost.toLocaleString("en-IN")}`} />
            <SummaryCard icon={<FaBolt />} title="Estimated Power" value={`${estimatedPower}W`} />
            <SummaryCard
              icon={<FaRupeeSign />}
              title="Remaining Budget"
              value={`₹${remainingBudget.toLocaleString("en-IN")}`}
              danger={remainingBudget < 0}
            />
          </div>

          <div className="d-flex flex-wrap gap-2 mt-4">
            <button className="btn btn-outline-secondary" onClick={resetBuild}>Reset</button>
            <button className="btn btn-success" onClick={saveBuild}><FaSave /> Save Build</button>
            <button className="btn btn-primary ms-auto" onClick={goToAnalysis}>
              Analyze My Build <FaArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, title, value, danger }) {
  return (
    <div className="col-md-4">
      <div className={`card summary-card shadow-sm ${danger ? "danger-card" : ""}`}>
        <div className="card-body">
          <div className="summary-icon">{icon}</div>
          <small className="text-secondary">{title}</small>
          <h4 className={danger ? "text-danger" : "text-primary"}>{value}</h4>
        </div>
      </div>
    </div>
  );
}

function Analysis({
  buildName, purpose, budget, selected, totalCost,
  estimatedPower, remainingBudget, checks, workloadScore,
  recommendations, onBack, onSave, onNewBuild, onWorkload
}) {
  const recommendedPsu = Math.ceil(estimatedPower * 1.2);
  const allCompatible = checks.length > 0 && checks.every((item) => item.ok);

  return (
    <div className="container py-4">
      <div className="section-heading">
        <div>
          <span className="module-label">MODULE 3</span>
          <h2>Compatibility & Analysis</h2>
          <p className="text-secondary mb-0">Results generated from the current Module 2 configuration.</p>
        </div>
        <button className="btn btn-outline-secondary" onClick={onBack}>← Back to Build</button>
      </div>

      <div className="card analysis-header shadow-sm mb-4">
        <div>
          <h4 className="mb-1">{buildName}</h4>
          <span className="text-secondary">Primary workload: {purpose}</span>
        </div>
        <div className={`status-chip ${allCompatible ? "status-ok" : "status-warning"}`}>
          {allCompatible ? <FaCheckCircle /> : <FaTimesCircle />}
          {allCompatible ? "Configuration Compatible" : "Review Configuration"}
        </div>
      </div>

      <div className="row g-3 mb-4">
        <AnalysisMetric title="Total Cost" value={`₹${totalCost.toLocaleString("en-IN")}`} />
        <AnalysisMetric title="Budget" value={remainingBudget >= 0 ? "Within Budget" : "Over Budget"} />
        <AnalysisMetric title="Power" value={`${estimatedPower}W`} />
        <AnalysisMetric title="Workload Score" value={`${workloadScore}/100`} />
      </div>

      <div className="card shadow-sm p-4 mb-4">
        <h5>Budget Analysis</h5>
        <div className="analysis-io">
          <div>
            <span className="io-label">INPUT</span>
            <strong>Budget: ₹{Number(budget).toLocaleString("en-IN")}</strong>
          </div>
          <div className="io-arrow">→</div>
          <div>
            <span className="io-label">PROCESS</span>
            <strong>Sum selected component prices</strong>
          </div>
          <div className="io-arrow">→</div>
          <div>
            <span className="io-label">OUTPUT</span>
            <strong className={remainingBudget >= 0 ? "text-success" : "text-danger"}>
              {remainingBudget >= 0
                ? `₹${remainingBudget.toLocaleString("en-IN")} remaining`
                : `₹${Math.abs(remainingBudget).toLocaleString("en-IN")} over budget`}
            </strong>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card shadow-sm p-4 h-100">
            <div className="d-flex justify-content-between">
              <h5>Compatibility Checks</h5>
              <span className="small text-secondary">{checks.length} checks</span>
            </div>

            {!checks.length ? (
              <div className="alert alert-warning mt-3">
                Select CPU + Motherboard, RAM + Motherboard, or PSU to perform checks.
              </div>
            ) : checks.map((check, index) => (
              <div className={`check-row ${check.ok ? "check-ok" : "check-bad"}`} key={index}>
                <div className="check-icon">
                  {check.ok ? <FaCheckCircle /> : <FaTimesCircle />}
                </div>
                <div className="flex-grow-1">
                  <strong>{check.title}</strong>
                  <div className="small text-secondary">Input: {check.input}</div>
                </div>
                <span className="check-result">{check.output}</span>
              </div>
            ))}

            <div className="power-box mt-3">
              <FaBolt />
              <div>
                <strong>Power Result</strong>
                <div className="small text-secondary">
                  {estimatedPower}W estimated demand • Recommended PSU {recommendedPsu}W+
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm p-4 h-100">
            <div className="d-flex align-items-center gap-2 mb-2">
              <FaLightbulb className="text-warning" />
              <h5 className="mb-0">Recommendations</h5>
            </div>

            <p className="small text-secondary">
              Lightweight rule-based supporting module using workload, budget and selected hardware.
            </p>

            <div className="recommendation-list">
              {recommendations.map((item, index) => (
                <div className="recommendation-item" key={index}>
                  <span>{index + 1}</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>

            <div className="d-flex gap-2 mt-auto pt-4">
              <button className="btn btn-outline-primary" onClick={onWorkload}>
                <FaChartLine /> Workload
              </button>
              <button className="btn btn-success" onClick={onSave}>
                <FaSave /> Save
              </button>
              <button className="btn btn-outline-secondary" onClick={onNewBuild}>
                New
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisMetric({ title, value }) {
  return (
    <div className="col-md-3">
      <div className="metric-card shadow-sm">
        <small>{title}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function MyBuilds({ savedBuilds, onLoad, onBack }) {
  return (
    <div className="container py-4">
      <div className="section-heading">
        <div>
          <span className="module-label">SUPPORTING MODULE</span>
          <h2>My Builds</h2>
          <p className="text-secondary mb-0">Saved build summaries for future access.</p>
        </div>
        <button className="btn btn-outline-secondary" onClick={onBack}>← Back</button>
      </div>

      {!savedBuilds.length ? (
        <div className="empty-state">
          <FaSave />
          <h5>No saved builds</h5>
          <p>Use Save Build from Module 2 or Module 3.</p>
        </div>
      ) : (
        <div className="row g-3">
          {savedBuilds.map((build) => (
            <div className="col-md-6 col-lg-4" key={build.id}>
              <div className="card shadow-sm p-3 h-100">
                <span className="badge text-bg-light align-self-start">{build.purpose}</span>
                <h5 className="mt-2">{build.name}</h5>
                <p className="small text-secondary">{build.componentCount} components</p>
                <div className="build-summary-line"><span>Total</span><strong>₹{build.totalCost.toLocaleString("en-IN")}</strong></div>
                <div className="build-summary-line"><span>Power</span><strong>{build.power}W</strong></div>
                <div className="build-summary-line"><span>Budget</span><strong>₹{build.budget.toLocaleString("en-IN")}</strong></div>
                <button className="btn btn-outline-primary mt-3" onClick={() => onLoad(build)}>Load Build</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkloadModule({ purpose, setPurpose, score, recommendations, onBack }) {
  return (
    <div className="container py-4">
      <div className="section-heading">
        <div>
          <span className="module-label">SUPPORTING MODULE</span>
          <h2>Workload Evaluation</h2>
          <p className="text-secondary mb-0">A lightweight estimated suitability score.</p>
        </div>
        <button className="btn btn-outline-secondary" onClick={onBack}>← Back</button>
      </div>

      <div className="card shadow-sm p-4">
        <label className="form-label">Workload</label>
        <select className="form-select mb-4" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
          {workloads.map((item) => <option key={item}>{item}</option>)}
        </select>

        <div className="workload-score">
          <div>
            <small className="text-secondary">Estimated suitability</small>
            <h1>{score}/100</h1>
          </div>
          <FaChartLine />
        </div>

        <h5 className="mt-4">Supporting Suggestions</h5>
        {recommendations.map((item, index) => (
          <div className="recommendation-item" key={index}>
            <span>{index + 1}</span><p>{item}</p>
          </div>
        ))}

        <small className="text-secondary mt-3">
          Estimated rule-based result, not a hardware benchmark.
        </small>
      </div>
    </div>
  );
}

function Profile({ profile, setProfile, onBack }) {
  return (
    <div className="container py-4">
      <div className="section-heading">
        <div>
          <span className="module-label">SUPPORTING MODULE</span>
          <h2>User Profile</h2>
        </div>
        <button className="btn btn-outline-secondary" onClick={onBack}>← Back</button>
      </div>

      <div className="card shadow-sm p-4 profile-card">
        <div className="profile-avatar"><FaUser /></div>
        <label className="form-label">Name</label>
        <input className="form-control mb-3" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
        <label className="form-label">Email</label>
        <input className="form-control mb-3" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
        <label className="form-label">Role</label>
        <input className="form-control mb-3" value={profile.role} readOnly />
        <div className="alert alert-info mb-0">Frontend-only profile demonstration.</div>
      </div>
    </div>
  );
}

function AdminModule({ adminComponents, setAdminComponents, onBack }) {
  function updatePrice(id) {
    setAdminComponents((prev) => prev.map((item) => item.id === id ? { ...item, price: item.price + 500 } : item));
  }

  function deactivate(id) {
    setAdminComponents((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="container py-4">
      <div className="section-heading">
        <div>
          <span className="module-label">SUPPORTING MODULE</span>
          <h2>Administrator Management</h2>
          <p className="text-secondary mb-0">Small repository-management demonstration.</p>
        </div>
        <button className="btn btn-outline-secondary" onClick={onBack}>← Back</button>
      </div>

      <div className="card shadow-sm p-4">
        <div className="admin-note">
          <FaShieldAlt /> Update a demo price or deactivate a component.
        </div>

        <div className="table-responsive mt-3">
          <table className="table align-middle">
            <thead>
              <tr><th>Component</th><th>Category</th><th>Price</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {adminComponents.slice(0, 10).map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.category}</td>
                  <td>₹{item.price.toLocaleString("en-IN")}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => updatePrice(item.id)}>Update Price</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => deactivate(item.id)}>Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
