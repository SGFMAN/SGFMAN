import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import SettingsPage from "./pages/SettingsPage";

/* ----------------------------- Front Page ----------------------------- */

function Home({ jobs }) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return jobs.filter((j) => (j.address || "").toLowerCase().includes(q));
  }, [jobs, search]);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <img src="/logo.jpg" alt="SGFMAN Logo" style={{ maxWidth: "200px" }} />
      <h1>SGFMAN Job Search</h1>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search jobs by address"
        style={{ padding: "5px", width: "300px" }}
      />

      <div style={{ marginTop: "20px" }}>
        <button onClick={() => navigate("/job/new")}>➕ New Job</button>
        <button onClick={() => navigate("/settings")} style={{ marginLeft: "10px" }}>
          ⚙️ Settings
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: 0, marginTop: "20px" }}>
        {filtered.map((job) => (
          <li key={job.id} style={{ margin: "10px 0" }}>
            <button onClick={() => navigate(`/job/${job.id}`)}>
              {job.address}
            </button>
            <span style={{ marginLeft: "10px", fontStyle: "italic", color: "#555" }}>
              ({job.status || "Design Phase"})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------- Job Detail ----------------------------- */

const EMPTY = {
  address: "",
  finish: "",
  class: "",
  name1: "",
  name2: "",
  email1: "",
  email2: "",
  notes: "",
  price: "",
  date: "",
  colors: "",
  windows: "",
  contract: "",
  status: "Design Phase",
  depositAmount: "",
  conceptDrawingsConfirmed: "No",
  workingDrawingsConfirmed: "No",
  energyReport: "No",
};

function JobDetail({ jobs, setJobs }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const job = useMemo(
    () => (isNew ? { ...EMPTY } : { ...EMPTY, ...(jobs.find((j) => j.id === Number(id)) || {}) }),
    [isNew, id, jobs]
  );

  // Refs for uncontrolled text/number/date inputs
  const refs = {
    address: useRef(null),
    name1: useRef(null),
    name2: useRef(null),
    email1: useRef(null),
    email2: useRef(null),
    notes: useRef(null),
    price: useRef(null),
    date: useRef(null),
  };

  // Controlled for selects only
  const [selects, setSelects] = useState({
    finish: job.finish,
    class: job.class,
    status: job.status,
    depositAmount: job.depositAmount,
    conceptDrawingsConfirmed: job.conceptDrawingsConfirmed,
    workingDrawingsConfirmed: job.workingDrawingsConfirmed,
    colors: job.colors,
    windows: job.windows,
    energyReport: job.energyReport,
    contract: job.contract,
  });

  // Initialize input values when job changes
  useEffect(() => {
    if (refs.address.current) refs.address.current.value = job.address || "";
    if (refs.name1.current) refs.name1.current.value = job.name1 || "";
    if (refs.name2.current) refs.name2.current.value = job.name2 || "";
    if (refs.email1.current) refs.email1.current.value = job.email1 || "";
    if (refs.email2.current) refs.email2.current.value = job.email2 || "";
    if (refs.notes.current) refs.notes.current.value = job.notes || "";
    if (refs.price.current) refs.price.current.value = job.price || "";
    if (refs.date.current) refs.date.current.value = job.date || "";

    setSelects({
      finish: job.finish || "",
      class: job.class || "",
      status: job.status || "Design Phase",
      depositAmount: job.depositAmount || "",
      conceptDrawingsConfirmed: job.conceptDrawingsConfirmed || "No",
      workingDrawingsConfirmed: job.workingDrawingsConfirmed || "No",
      colors: job.colors || "",
      windows: job.windows || "",
      energyReport: job.energyReport || "No",
      contract: job.contract || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, job?.id]);

  const onSelectChange = (e) => {
    const { name, value } = e.target;
    setSelects((s) => ({ ...s, [name]: value }));
  };

  const collectForm = () => ({
    address: refs.address.current?.value || "",
    name1: refs.name1.current?.value || "",
    name2: refs.name2.current?.value || "",
    email1: refs.email1.current?.value || "",
    email2: refs.email2.current?.value || "",
    notes: refs.notes.current?.value || "",
    price: refs.price.current?.value || "",
    date: refs.date.current?.value || "",
    finish: selects.finish || "",
    class: selects.class || "",
    status: selects.status || "Design Phase",
    depositAmount: selects.depositAmount || "",
    conceptDrawingsConfirmed: selects.conceptDrawingsConfirmed || "No",
    workingDrawingsConfirmed: selects.workingDrawingsConfirmed || "No",
    colors: selects.colors || "",
    windows: selects.windows || "",
    energyReport: selects.energyReport || "No",
    contract: selects.contract || "",
  });

  const saveJob = async () => {
    const payload = collectForm();

    try {
      if (isNew) {
        const res = await fetch("http://localhost:5000/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const created = await res.json();
        if (!res.ok) throw new Error(created.error || "Failed to create job");
      } else {
        const res = await fetch(`http://localhost:5000/api/jobs/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.error || "Failed to update job");
      }

      const jobsRes = await fetch("http://localhost:5000/api/jobs");
      const jobsData = await jobsRes.json();
      setJobs(jobsData);

      if (isNew) {
        const newest = jobsData[jobsData.length - 1];
        navigate(`/job/${newest.id}`);
      } else {
        alert("Job updated!");
      }
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const deleteJob = async () => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    await fetch(`http://localhost:5000/api/jobs/${id}`, { method: "DELETE" });
    const jobsRes = await fetch("http://localhost:5000/api/jobs");
    const jobsData = await jobsRes.json();
    setJobs(jobsData);
    navigate("/");
  };

  const Row = ({ label, children, wide = false }) => (
    <>
      <label style={{ alignSelf: "center" }}>{label}</label>
      <div style={{ width: wide ? "100%" : "auto" }}>{children}</div>
    </>
  );

  const Section = ({ title, children }) => {
    const [open, setOpen] = useState(true);
    return (
      <div
        style={{
          gridColumn: "1 / -1",
          background: "#f9f9f9",
          padding: "10px",
          borderRadius: "8px",
          marginBottom: "15px",
          border: "1px solid #ddd",   // ✅ FIXED HERE
        }}
      >
        <h3
          onClick={() => setOpen(!open)}
          style={{
            margin: "0 0 10px 0",
            borderBottom: "1px solid #ddd",
            paddingBottom: "4px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {title}
          <span style={{ fontSize: "14px", color: "#666" }}>{open ? "▲" : "▼"}</span>
        </h3>
        {open && (
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "10px 15px" }}>
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>{isNew ? "Create New Job" : `Job Detail: ${job.address || ""}`}</h2>

      {/* Project status */}
      <div style={{ margin: "15px 0", display: "flex", alignItems: "center" }}>
        <label style={{ marginRight: "10px", fontWeight: "bold" }}>Project Status:</label>
        <select name="status" value={selects.status} onChange={onSelectChange}>
          <option value="Design Phase">Design Phase</option>
          <option value="Town Planning">Town Planning</option>
          <option value="With Building Surveyor">With Building Surveyor</option>
          <option value="Building Permit Issued">Building Permit Issued</option>
          <option value="In Construction">In Construction</option>
          <option value="Complete">Complete</option>
        </select>
      </div>

      {/* Columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "30px",
          maxWidth: "1400px",
        }}
      >
        {/* Column 1 */}
        <div>
          <Section title="Project details">
            <Row label="Address">
              <input name="address" ref={refs.address} defaultValue={job.address || ""} />
            </Row>
            <Row label="Finish">
              <select name="finish" value={selects.finish} onChange={onSelectChange}>
                <option value="">Select Finish</option>
                <option value="Affordable">Affordable</option>
                <option value="Superior">Superior</option>
              </select>
            </Row>
            <Row label="Class">
              <select name="class" value={selects.class} onChange={onSelectChange}>
                <option value="">Select Class</option>
                <option value="Dwelling">Dwelling</option>
                <option value="SSD">SSD</option>
                <option value="DPU">DPU</option>
                <option value="Det. Ex">Det. Ex</option>
                <option value="Studio">Studio</option>
              </select>
            </Row>
          </Section>

          <Section title="Client info">
            <Row label="Name 1">
              <input name="name1" ref={refs.name1} defaultValue={job.name1 || ""} />
            </Row>
            <Row label="Name 2">
              <input name="name2" ref={refs.name2} defaultValue={job.name2 || ""} />
            </Row>
            <Row label="Email 1">
              <input type="email" name="email1" ref={refs.email1} defaultValue={job.email1 || ""} />
            </Row>
            <Row label="Email 2">
              <input type="email" name="email2" ref={refs.email2} defaultValue={job.email2 || ""} />
            </Row>
          </Section>

          <Section title="Finance">
            <Row label="Price ($)">
              <input type="number" name="price" ref={refs.price} defaultValue={job.price || ""} />
            </Row>
            <Row label="Date">
              <input type="date" name="date" ref={refs.date} defaultValue={job.date || ""} />
            </Row>
            <Row label="Deposit Amount">
              <select
                name="depositAmount"
                value={selects.depositAmount}
                onChange={onSelectChange}
              >
                <option value="">Select Deposit</option>
                <option value="Full 5%">Full 5%</option>
                <option value="$5000 only">$5000 only</option>
              </select>
            </Row>
          </Section>
        </div>

        {/* Column 2 */}
        <div>
          <Section title="Drawings">
            <Row label="Concept Drawings Confirmed">
              <select
                name="conceptDrawingsConfirmed"
                value={selects.conceptDrawingsConfirmed}
                onChange={onSelectChange}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Row>
            <Row label="Working Drawings Confirmed">
              <select
                name="workingDrawingsConfirmed"
                value={selects.workingDrawingsConfirmed}
                onChange={onSelectChange}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Row>
          </Section>

          <Section title="Materials">
            <Row label="Colors">
              <select name="colors" value={selects.colors} onChange={onSelectChange}>
                <option value="">Select Colors</option>
                <option value="Not Sent">Not Sent</option>
                <option value="Waiting">Waiting</option>
                <option value="Complete">Complete</option>
              </select>
            </Row>
            <Row label="Windows">
              <select name="windows" value={selects.windows} onChange={onSelectChange}>
                <option value="">Select Windows</option>
                <option value="Not Ordered">Not Ordered</option>
                <option value="Ordered">Ordered</option>
              </select>
            </Row>
          </Section>

          <Section title="Reports">
            <Row label="Energy Report">
              <select name="energyReport" value={selects.energyReport} onChange={onSelectChange}>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Row>
          </Section>
        </div>

        {/* Column 3 */}
        <div>
          <Section title="Project Notes">
            <Row label="Notes" wide>
              <input name="notes" ref={refs.notes} defaultValue={job.notes || ""} style={{ width: "100%" }} />
            </Row>
          </Section>

          <Section title="Admin">
            <Row label="Contract">
              <select name="contract" value={selects.contract} onChange={onSelectChange}>
                <option value="">Select Contract</option>
                <option value="Not Sent">Not Sent</option>
                <option value="Waiting">Waiting</option>
                <option value="Complete">Complete</option>
              </select>
            </Row>
          </Section>
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <button onClick={saveJob}>{isNew ? "Create Job" : "Save Changes"}</button>
        {!isNew && (
          <button
            onClick={deleteJob}
            style={{ marginLeft: "10px", backgroundColor: "red", color: "white" }}
          >
            Delete Project
          </button>
        )}
        <button onClick={() => navigate("/")} style={{ marginLeft: "10px" }}>
          Main Menu
        </button>
      </div>
    </div>
  );
}

/* ------------------------------- App Root ------------------------------- */

export default function App() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/jobs")
      .then((res) => res.json())
      .then((data) => setJobs(data));
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home jobs={jobs} />} />
        <Route path="/job/:id" element={<JobDetail jobs={jobs} setJobs={setJobs} />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Router>
  );
}
