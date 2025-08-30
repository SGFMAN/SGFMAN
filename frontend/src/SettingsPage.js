import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "10px 15px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Row({ label, children, wide = false }) {
  return (
    <>
      <label style={{ alignSelf: "center" }}>{label}</label>
      <div style={{ width: wide ? "100%" : "auto" }}>{children}</div>
    </>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();

  const [emailFrequency, setEmailFrequency] = useState("Weekly");
  const [emailTemplate, setEmailTemplate] = useState("");
  const [newJobTemplate, setNewJobTemplate] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.emailFrequency) setEmailFrequency(data.emailFrequency);
        if (data.emailTemplate) setEmailTemplate(data.emailTemplate);
        if (data.newJobTemplate) setNewJobTemplate(data.newJobTemplate);
      });
  }, []);

  const saveSettings = () => {
    fetch("http://localhost:5000/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailFrequency, emailTemplate, newJobTemplate }),
    }).then(() => alert("Settings saved!"));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Settings</h2>

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
            <Row label="Email Frequency">
              <select value={emailFrequency} onChange={(e) => setEmailFrequency(e.target.value)}>
                <option value="Every 2 Minutes">Every 2 Minutes</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </Row>
            <Row label="Job Status Update Email" wide>
              <textarea
                rows="4"
                style={{ width: "100%" }}
                value={emailTemplate}
                onChange={(e) => setEmailTemplate(e.target.value)}
              />
            </Row>
            <Row label="New Job Email" wide>
              <textarea
                rows="4"
                style={{ width: "100%" }}
                value={newJobTemplate}
                onChange={(e) => setNewJobTemplate(e.target.value)}
              />
            </Row>
          </Section>

          <Section title="Notifications">
            <p>(Placeholder for notification settings…)</p>
          </Section>
        </div>

        {/* Column 2 */}
        <div>
          <Section title="Reports">
            <p>(Placeholder for reports settings…)</p>
          </Section>

          <Section title="Users">
            <p>(Placeholder for user management…)</p>
          </Section>
        </div>

        {/* Column 3 */}
        <div>
          <Section title="Account">
            <p>(Placeholder for account settings…)</p>
          </Section>
          <Section title="Admin">
            <p>(Placeholder for admin settings…)</p>
          </Section>
          <Section title="System">
            <p>(Placeholder for system settings…)</p>
          </Section>
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <button onClick={saveSettings}>Save Settings</button>
        <button onClick={() => navigate("/")} style={{ marginLeft: "10px" }}>
          Main Menu
        </button>
      </div>
    </div>
  );
}
