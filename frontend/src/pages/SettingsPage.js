import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/* Reusable collapsible section */
function Section({ title, children }) {
  const [open, setOpen] = useState(true);

  return (
    <div
      style={{
        gridColumn: "1 / -1",
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 1fr",
            gap: "10px 15px",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();

  const [emailFrequency, setEmailFrequency] = useState("Weekly");
  const [statusTemplate, setStatusTemplate] = useState("");
  const [newJobTemplate, setNewJobTemplate] = useState("");

  // Load settings from backend
  useEffect(() => {
    fetch("http://localhost:5000/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.emailFrequency) setEmailFrequency(data.emailFrequency);
        if (data?.statusTemplate !== undefined) setStatusTemplate(data.statusTemplate);
        if (data?.newJobTemplate !== undefined) setNewJobTemplate(data.newJobTemplate);
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
      });
  }, []);

  // Save settings to backend
  const saveSettings = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailFrequency, statusTemplate, newJobTemplate }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Failed to save settings");
      alert("Settings saved!");
    } catch (e) {
      alert(`Save failed: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Settings</h2>

      {/* Three columns like the Project page */}
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
          <Section title="Email">
            <label style={{ alignSelf: "center" }}>Email Frequency</label>
            <div>
              <select
                value={emailFrequency}
                onChange={(e) => setEmailFrequency(e.target.value)}
              >
                <option value="Every 2 Minutes">Every 2 Minutes</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>

            <label style={{ alignSelf: "center" }}>Job Status Update</label>
            <div>
              <textarea
                rows={6}
                style={{ width: "100%" }}
                placeholder="This template is used for scheduled status updates..."
                value={statusTemplate}
                onChange={(e) => setStatusTemplate(e.target.value)}
              />
              <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                Sent on the schedule. The project’s current status and address are inserted above this text.
              </div>
            </div>

            <label style={{ alignSelf: "center" }}>New Job</label>
            <div>
              <textarea
                rows={6}
                style={{ width: "100%" }}
                placeholder="This template is sent immediately when a new job is created..."
                value={newJobTemplate}
                onChange={(e) => setNewJobTemplate(e.target.value)}
              />
              <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                Sent once, right after you click “Create Job”. Status and address are inserted above this text.
              </div>
            </div>
          </Section>
        </div>

        {/* Column 2 */}
        <div>
          <Section title="Notifications">
            <div style={{ gridColumn: "1 / -1", color: "#666" }}>
              (Placeholder for notification settings…)
            </div>
          </Section>

          <Section title="Reports">
            <div style={{ gridColumn: "1 / -1", color: "#666" }}>
              (Placeholder for report settings…)
            </div>
          </Section>
        </div>

        {/* Column 3 */}
        <div>
          <Section title="Account">
            <div style={{ gridColumn: "1 / -1", color: "#666" }}>
              (Placeholder for account settings…)
            </div>
          </Section>

          <Section title="Admin">
            <div style={{ gridColumn: "1 / -1", color: "#666" }}>
              (Placeholder for admin settings…)
            </div>
          </Section>
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <button onClick={saveSettings}>Save Settings</button>
        <button
          onClick={() => navigate("/")}
          style={{ marginLeft: "10px", padding: "6px 12px" }}
        >
          Main Menu
        </button>
      </div>
    </div>
  );
}
