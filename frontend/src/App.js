import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import SettingsPage from "./SettingsPage";

/* =========================
   ---- FRONT PAGE ----
   ========================= */
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
            <button onClick={() => navigate(`/job/${job.id}`)}>{job.address}</button>
            <span style={{ marginLeft: "10px", fontStyle: "italic", color: "#555" }}>
              ({job.status || "Design Phase"})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =========================
   ---- JOB DETAIL ----
   ========================= */
function JobDetail({ jobs, setJobs }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const job = jobs.find((j) => j.id === Number(id));

  const emptyJob = {
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

  const [status, setStatus] = useState(job?.status || emptyJob.status);

  useEffect(() => {
    setStatus(job?.status || emptyJob.status);
  }, [id, job]);

  const formRef = useRef(null);

  const saveJob = async () => {
    const fd = new FormData(formRef.current);
    const payload = Object.fromEntries(fd.entries());
    payload.status = status;

    if (isNew) {
      await fetch("http://localhost:5000/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`http://localhost:5000/api/jobs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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
          background: "#f9f9f9",
          padding: "10px",
          borderRadius: "8px",
          marginBottom: "15px",
          border: "1px solid #ddd",
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

  const formKey = isNew ? "new" : `job-${id}`;
  const current = job || emptyJob;

  return (
    <div style={{ padding: "20px" }}>
      <h2>{isNew ? "Create New Job" : `Job Detail: ${current.address}`}</h2>

      {/* Project status dropdown */}
      <div style={{ margin: "15px 0", display: "flex", alignItems: "center" }}>
        <label style={{ marginRight: "10px", fontWeight: "bold" }}>Project Status:</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Design Phase">Design Phase</option>
          <option value="Town Planning">Town Planning</option>
          <option value="With Building Surveyor">With Building Surveyor</option>
          <option value="Building Permit Issued">Building Permit Issued</option>
          <option value="In Construction">In Construction</option>
          <option value="Complete">Complete</option>
        </select>
      </div>

      <form ref={formRef} key={formKey}>
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
              <Row label="Address"><input name="address" defaultValue={current.address} /></Row>
              <Row label="Finish">
                <select name="finish" defaultValue={current.finish}>
                  <option value="">Select Finish</option>
                  <option value="Affordable">Affordable</option>
                  <option value="Superior">Superior</option>
                </select>
              </Row>
              <Row label="Class">
                <select name="class" defaultValue={current.class}>
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
              <Row label="Name 1"><input name="name1" defaultValue={current.name1} /></Row>
              <Row label="Name 2"><input name="name2" defaultValue={current.name2} /></Row>
              <Row label="Email 1"><input type="email" name="email1" defaultValue={current.email1} /></Row>
              <Row label="Email 2"><input type="email" name="email2" defaultValue={current.email2} /></Row>
            </Section>

            <Section title="Finance">
              <Row label="Price ($)"><input type="number" name="price" defaultValue={current.price} /></Row>
              <Row label="Date"><input type="date" name="date" defaultValue={current.date} /></Row>
              <Row label="Deposit Amount">
                <select name="depositAmount" defaultValue={current.depositAmount}>
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
                <select name="conceptDrawingsConfirmed" defaultValue={current.conceptDrawingsConfirmed}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </Row>
              <Row label="Working Drawings Confirmed">
                <select name="workingDrawingsConfirmed" defaultValue={current.workingDrawingsConfirmed}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </Row>
            </Section>

            <Section title="Materials">
              <Row label="Colors">
                <select name="colors" defaultValue={current.colors}>
                  <option value="">Select Colors</option>
                  <option value="Not Sent">Not Sent</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Complete">Complete</option>
                </select>
              </Row>
              <Row label="Windows">
                <select name="windows" defaultValue={current.windows}>
                  <option value="">Select Windows</option>
                  <option value="Not Ordered">Not Ordered</option>
                  <option value="Ordered">Ordered</option>
                </select>
              </Row>
            </Section>

            <Section title="Reports">
              <Row label="Energy Report">
                <select name="energyReport" defaultValue={current.energyReport}>
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
                <textarea name="notes" defaultValue={current.notes} rows={3} style={{ width: "100%" }} />
              </Row>
            </Section>

            <Section title="Admin">
              <Row label="Contract">
                <select name="contract" defaultValue={current.contract}>
                  <option value="">Select Contract</option>
                  <option value="Not Sent">Not Sent</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Complete">Complete</option>
                </select>
              </Row>
            </Section>
          </div>
        </div>
      </form>

      <div style={{ marginTop: "20px" }}>
        <button onClick={saveJob}>{isNew ? "Create Job" : "Save Changes"}</button>
        {!isNew && (
          <button onClick={deleteJob} style={{ marginLeft: "10px", backgroundColor: "red", color: "white" }}>
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

/* =========================
   ---- APP ROOT ----
   ========================= */
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
