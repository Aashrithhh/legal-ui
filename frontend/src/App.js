// src/App.js
import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

// Backend dev server; align with uvicorn port.
const API_BASE = "http://127.0.0.1:8001";

const CHAT_STORAGE_KEY = "legal_assistant_chat_v1";

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function riskBadgeColor(risk) {
  const r = (risk || "").toLowerCase();
  if (r === "high") return "bg-red-100 text-red-700 border-red-300";
  if (r === "medium") return "bg-yellow-100 text-yellow-700 border-yellow-300";
  if (r === "low") return "bg-green-100 text-green-700 border-green-300";
  return "bg-gray-100 text-gray-700 border-gray-300";
}

const styles = {
  page: {
    background: "#f4f7fb",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', sans-serif",
    color: "#1f2a44",
  },
  header: {
    background: "linear-gradient(90deg, #0f1c3f, #1e4b8f)",
    color: "#fff",
    padding: "22px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
    position: "sticky",
    top: 0,
    zIndex: 5,
  },
  headerTitle: {
    display: "flex",
    flexDirection: "column",
  },
  main: {
    maxWidth: 1400,
    margin: "20px auto",
    padding: "0 16px 40px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  gridSingle: {
    gridTemplateColumns: "1fr",
  },
  card: {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 10px 25px rgba(31,42,68,0.12)",
    overflow: "hidden",
  },
  cardHeader: {
    background: "#1f304b",
    color: "#fff",
    padding: "12px 16px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  cardBody: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  textarea: {
    width: "100%",
    minHeight: 90,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #d3dce6",
    background: "#f8fbff",
    fontSize: 14,
    outline: "none",
    resize: "vertical",
  },
  dropZone: {
    border: "2px dashed #3ab6ff",
    borderRadius: 12,
    padding: 28,
    textAlign: "center",
    background: "#f3fbff",
    color: "#2c4a7a",
    cursor: "pointer",
  },
  buttonPrimary: {
    flex: 1,
    background: "#1f304b",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "14px 16px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 6px 12px rgba(0,0,0,0.08)",
  },
  buttonGhost: {
    flex: 1,
    background: "#e6f6ff",
    color: "#007bff",
    border: "2px solid #8fd6ff",
    borderRadius: 12,
    padding: "14px 16px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  rowButtons: {
    display: "flex",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
  },
  accordionBox: (border, bg) => ({
    border: `1px solid ${border}`,
    background: bg,
    borderRadius: 8,
    marginBottom: 8,
    padding: 8,
  }),
  accordionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },
  accordionBody: (border) => ({
    marginTop: 6,
    paddingTop: 6,
    borderTop: `1px solid ${border}`,
    fontSize: 13,
  }),
  askInput: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #cfd8e3",
    background: "#f8fbff",
    fontSize: 14,
    outline: "none",
  },
  askButton: {
    background: "#008db3",
    border: "none",
    color: "#fff",
    padding: "12px 14px",
    borderRadius: 10,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export default function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [formData, setFormData] = useState({
    matterOverview: "",
    peopleAndAliases: "",
    noteworthyOrganizations: "",
    noteworthyTerms: "",
    additionalContext: "",
  });

  const [result, setResult] = useState(null);

  const [relevanceResults, setRelevanceResults] = useState(null);
  const [isRelevanceLoading, setIsRelevanceLoading] = useState(false);
  const [relevanceError, setRelevanceError] = useState(null);
  const [expandedFiles, setExpandedFiles] = useState({});

  const [askQuestion, setAskQuestion] = useState("");
  const [qaMessages, setQaMessages] = useState([]); // [{role, content}]
  const [isAskLoading, setIsAskLoading] = useState(false);
  const [qaError, setQaError] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addFiles = (files) => {
    const maxSize = 100 * 1024 * 1024;
    const arr = Array.from(files);
    const valid = arr.filter((file) => {
      if (file.size > maxSize) {
        alert(`File "${file.name}" exceeds 100MB.`);
        return false;
      }
      return true;
    });
    setUploadedFiles((prev) => [...prev, ...valid]);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files) addFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (uploadedFiles.length === 0) {
      setErrorMsg("Please upload at least one document.");
      return;
    }
    if (!formData.matterOverview.trim()) {
      setErrorMsg("Case Summary is required.");
      return;
    }

    const fd = new FormData();
    uploadedFiles.forEach((file) => {
      fd.append("files", file);
    });
    fd.append("metadata", JSON.stringify(formData));

    try {
      setIsLoading(true);
      setResult(null);

      const res = await fetch(`${API_BASE}/api/analyze-case`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Backend error:", res.status, text);
        setErrorMsg(`Error analyzing case (status ${res.status}).`);
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch (e2) {
      console.error(e2);
      setErrorMsg("Error analyzing case.");
    } finally {
      setIsLoading(false);
    }
  };

  const processRelevance = async () => {
    const criteria = (formData.matterOverview || "").trim();

    if (!criteria) {
      setRelevanceError("Case Summary is required for relevance check.");
      return;
    }

    if (uploadedFiles.length === 0) {
      setRelevanceError(
        "Please upload at least one document before running relevance check."
      );
      return;
    }

    setIsRelevanceLoading(true);
    setRelevanceError(null);
    setExpandedFiles({});
    setRelevanceResults(null);

    try {
      const fd = new FormData();
      fd.append("criteria", criteria);
      fd.append("metadata", JSON.stringify(formData));
      uploadedFiles.forEach((file) => {
        fd.append("files", file);
      });

      const res = await fetch(`${API_BASE}/api/relevance-check`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Relevance backend error:", res.status, text);
        throw new Error(
          text || `Error getting relevance (status ${res.status}).`
        );
      }

      const data = await res.json();
      setRelevanceResults({
        highlyRelevant: data.highlyRelevant || [],
        partiallyRelevant: data.partiallyRelevant || [],
        lessRelevant: data.lessRelevant || [],
        notRelevant: data.notRelevant || [],
        failed: data.failed || [],
      });
    } catch (err) {
      console.error(err);
      setRelevanceError(
        err.message || "Something went wrong while getting relevance results."
      );
    } finally {
      setIsRelevanceLoading(false);
    }
  };

  const toggleFileExpand = (key) => {
    setExpandedFiles((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAskQuestion = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const question = askQuestion.trim();
    if (!question) return;

    const newHistory = [...qaMessages, { role: "user", content: question }];
    setQaMessages(newHistory);
    setAskQuestion("");
    setIsAskLoading(true);
    setQaError(null);

    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history: newHistory,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to get answer (status ${res.status}).`);
      }

      const data = await res.json();
      const assistantMsg = {
        role: "assistant",
        content: typeof data === "string" ? data : data.answer || data.analysis || "",
      };
      setQaMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setQaError(err.message || "Something went wrong while asking the question.");
    } finally {
      setIsAskLoading(false);
    }
  };

  // Restore chat on page load
  useEffect(() => {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const parsed = safeJsonParse(saved, []);
      if (Array.isArray(parsed)) setQaMessages(parsed);
    }
  }, []);

  // Auto-save whenever chat changes
  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(qaMessages));
  }, [qaMessages]);

  async function saveTextAsFile({ filename, text }) {
    const isTxt = filename.toLowerCase().endsWith(".txt");
    const mime = isTxt ? "text/plain" : "application/json";

    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          isTxt
            ? { description: "Text", accept: { "text/plain": [".txt"] } }
            : { description: "JSON", accept: { "application/json": [".json"] } },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return;
    }

    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function toChatTranscript({ exportedAt, qaMessages }) {
    const lines = [];
    lines.push(`ExportedAt: ${exportedAt}`);
    lines.push("");
    lines.push("---- CHAT TRANSCRIPT ----");
    lines.push("");

    for (const m of qaMessages) {
      const role = (m.role || "").toUpperCase();
      lines.push(role || "MESSAGE");
      lines.push(m.content || "");
      lines.push("");
      lines.push("----");
      lines.push("");
    }
    return lines.join("\n");
  }

  const handleSaveChats = async () => {
    const exportedAt = new Date().toISOString();

    const txt = toChatTranscript({ exportedAt, qaMessages });

    const filename = `chats-${exportedAt.replace(/[:.]/g, "-")}.txt`;
    await saveTextAsFile({ filename, text: txt });
  };

  function handleClearAskSession() {
    setAskQuestion("");
    setQaMessages([]);
    setQaError(null);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  }

  const renderRelevanceSection = (section, title, colors) => {
    return (
      <div
        style={styles.accordionBox(colors.border, colors.bg)}
      >
        <button
          onClick={() => toggleFileExpand(`${title}`)}
          style={styles.accordionHeader}
        >
          <span style={{ fontSize: 15, fontWeight: 600 }}>{title} ({section.length})</span>
          <span style={{ fontSize: 18 }}>{expandedFiles[title] ? "-" : "+"}</span>
        </button>
        {expandedFiles[title] && section.length === 0 && (
          <div style={styles.accordionBody(colors.border)}>
            No documents found.
          </div>
        )}
        {expandedFiles[title] && section.map((file, idx) => {
          const key = `${title}-${file.name}-${idx}`;
          const open = expandedFiles[key];
          return (
            <div
              key={key}
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                borderRadius: 6,
                padding: 8,
                marginTop: 6,
              }}
            >
              <button
                onClick={() => toggleFileExpand(key)}
                style={styles.accordionHeader}
              >
                <span style={{ fontSize: 13 }}>{file.name}</span>
                <span style={{ fontSize: 12 }}>{open ? "-" : "+"}</span>
              </button>
              {open && (
                <div style={styles.accordionBody(colors.border)}>
                  {file.summary}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;
  const gridStyle = isMobile ? { ...styles.grid, ...styles.gridSingle } : styles.grid;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerTitle}>
          <span style={{ fontSize: 24, fontWeight: 700 }}>Legal Document Analysis</span>
          <span style={{ fontSize: 14, opacity: 0.9 }}>AI-Powered Case Intelligence &amp; Relevance Assessment</span>
        </div>
      </header>

      <main style={styles.main}>
        <div style={gridStyle}>
          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Document Upload Card */}
            <div style={styles.card}>
      <div style={{ ...styles.cardHeader, background: "#1f304b" }}>
        <span role="img" aria-label="upload">⬆</span>
        <span>Document Upload</span>
      </div>
              <div style={styles.cardBody}>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  style={{
                    ...styles.dropZone,
                    background: isDragging ? "#e0f5ff" : styles.dropZone.background,
                  }}
                >
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    id="file-upload"
                    onChange={handleFileInputChange}
                    style={{ display: "none" }}
                  />
                  <label htmlFor="file-upload" style={{ color: "#0d6efd", cursor: "pointer" }}>
                    Drop files here or click to browse
                  </label>
                  <div style={{ fontSize: 12, marginTop: 6, color: "#6b7a90" }}>
                    Supports PDF, TXT, EML • Max 100MB
                  </div>
                </div>

                {uploadedFiles.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {uploadedFiles.map((file, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 8px",
                          borderRadius: 8,
                          background: "#eef4ff",
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{file.name}</span>
                        <button
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#c53030",
                            fontSize: 16,
                            cursor: "pointer",
                          }}
                          onClick={() => removeFile(i)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={styles.card}>
              <div style={{ ...styles.cardHeader, background: "#1f304b" }}>
                <span>📑</span>
                <span>Case Details</span>
              </div>
              <div style={styles.cardBody}>
                <div style={{ marginBottom: 12 }}>
                  <div style={styles.sectionTitle}>Matter Overview *</div>
                  <textarea
                    style={{ ...styles.textarea, minHeight: 100 }}
                    placeholder="Brief description of the legal matter..."
                    value={formData.matterOverview}
                    onChange={(e) => handleInputChange("matterOverview", e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={styles.sectionTitle}>People and Aliases</div>
                  <textarea
                    style={styles.textarea}
                    placeholder="Key individuals, parties, and their aliases..."
                    value={formData.peopleAndAliases}
                    onChange={(e) => handleInputChange("peopleAndAliases", e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={styles.sectionTitle}>Noteworthy Organizations</div>
                  <textarea
                    style={styles.textarea}
                    placeholder="Relevant companies, entities, or institutions..."
                    value={formData.noteworthyOrganizations}
                    onChange={(e) => handleInputChange("noteworthyOrganizations", e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={styles.sectionTitle}>Noteworthy Terms</div>
                  <textarea
                    style={styles.textarea}
                    placeholder="Important legal terms, concepts, or keywords..."
                    value={formData.noteworthyTerms}
                    onChange={(e) => handleInputChange("noteworthyTerms", e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={styles.sectionTitle}>Additional Context</div>
                  <textarea
                    style={styles.textarea}
                    placeholder="Any other relevant information or context..."
                    value={formData.additionalContext}
                    onChange={(e) => handleInputChange("additionalContext", e.target.value)}
                  />
                </div>

                <div style={styles.rowButtons}>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    style={{ ...styles.buttonPrimary, opacity: isLoading ? 0.8 : 1 }}
                  >
                    {isLoading ? "Analyzing..." : "Generate Analysis"}
                  </button>
                  <button
                    onClick={processRelevance}
                    disabled={isRelevanceLoading}
                    style={{ ...styles.buttonGhost, opacity: isRelevanceLoading ? 0.85 : 1 }}
                  >
                    {isRelevanceLoading ? "Checking..." : "Check Relevance"}
                  </button>
                </div>

                {(errorMsg || relevanceError) && (
                  <div style={{ marginTop: 10, color: "red", fontSize: 13 }}>
                    {errorMsg || relevanceError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={styles.card}>
              <div style={{ ...styles.cardHeader, background: "#0c4de4" }}>
                <span>✨</span>
                <span>AI Analysis Response</span>
              </div>
              <div style={styles.cardBody}>
                {!result && !isLoading && (
                  <div style={{ textAlign: "center", color: "#7a8ba6", padding: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>Analysis results will appear here</div>
                    <div style={{ fontSize: 13 }}>Upload documents and generate analysis to begin</div>
                  </div>
                )}

                {isLoading && <p>Analyzing...</p>}

                {result && (
                  <div>
                    <h3 style={{ marginTop: 0 }}>Summary</h3>
                    <div
                      style={{ background: "#f8fbff", padding: 15, borderRadius: 10, border: "1px solid #e0e7f1" }}
                    >
                      <ReactMarkdown>{result.analysis}</ReactMarkdown>
                    </div>

                    <h3 style={{ marginTop: 18 }}>Issues ({result.issues?.length || 0})</h3>
                    {result.issues && result.issues.length > 0 ? (
                      result.issues.map((issue, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: "#fff",
                            padding: 14,
                            borderRadius: 10,
                            marginBottom: 12,
                            border: "1px solid #e0e7f1",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div style={{ flex: 1 }}>
                              <strong style={{ fontSize: 15 }}>{issue.title}</strong>
                              {issue.categoryGroup && (
                                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                                  <strong>Category:</strong> {issue.categoryGroup}
                                  {issue.categoryLabel && ` → ${issue.categoryLabel}`}
                                </div>
                              )}
                              {issue.extraLabels && (
                                <div style={{ fontSize: 11, color: "#666", marginTop: 2, fontStyle: "italic" }}>
                                  Also: {issue.extraLabels}
                                </div>
                              )}
                            </div>
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: 6,
                                border: "1px solid #ccc",
                                fontSize: 12,
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                marginLeft: 12,
                              }}
                              className={riskBadgeColor(issue.riskLevel)}
                            >
                              {issue.riskLevel}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                            <ReactMarkdown>{issue.description}</ReactMarkdown>
                          </div>
                          {issue.timeline && (
                            <p style={{ fontSize: 12, marginTop: 8, color: "#333" }}>
                              <strong>Timeline:</strong> {issue.timeline}
                            </p>
                          )}
                          {issue.partiesInvolved && (
                            <p style={{ fontSize: 12, marginTop: 4, color: "#333" }}>
                              <strong>Parties Involved:</strong> {issue.partiesInvolved}
                            </p>
                          )}
                          {issue.keyPeople && (
                            <p style={{ fontSize: 12, marginTop: 4, color: "#333" }}>
                              <strong>Key People:</strong> {issue.keyPeople}
                            </p>
                          )}
                          {issue.citations && (
                            <p style={{ fontSize: 11, marginTop: 4, color: "#555", fontStyle: "italic" }}>
                              <strong>Sources:</strong> {issue.citations}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "#7a8ba6" }}>No issues found.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Relevance Classification */}
            <div style={styles.card}>
              <div style={{ ...styles.cardHeader, background: "#0c4de4" }}>
                <span>📂</span>
                <span>Relevance Classification</span>
              </div>
              <div style={styles.cardBody}>
                {!relevanceResults && !isRelevanceLoading && (
                  <p style={{ color: "#7a8ba6", fontStyle: "italic" }}>
                    Run "Check Relevance" to see classifications.
                  </p>
                )}

                {isRelevanceLoading && <p>Analyzing...</p>}

                {relevanceResults && (
                  <div>
                    {renderRelevanceSection(
                      relevanceResults.highlyRelevant,
                      "Highly Relevant",
                      { border: "#28a745", bg: "#eafaf1" }
                    )}
                    {renderRelevanceSection(
                      relevanceResults.partiallyRelevant,
                      "Partially Relevant",
                      { border: "#17a2b8", bg: "#e2f3f8" }
                    )}
                    {renderRelevanceSection(
                      relevanceResults.lessRelevant,
                      "Less Relevant",
                      { border: "#ffc107", bg: "#fff8e1" }
                    )}
                    {renderRelevanceSection(
                      relevanceResults.notRelevant,
                      "Not Relevant",
                      { border: "#f5c6cb", bg: "#f8d7da" }
                    )}
                    {renderRelevanceSection(
                      relevanceResults.failed || [],
                      "Failed to Process",
                      { border: "#f5c6cb", bg: "#f8d7da" }
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Ask a Question */}
            <div style={{ ...styles.card, padding: 16, borderRadius: 18, boxShadow: "0 12px 28px rgba(0,0,0,0.12)" }}>
              <div
                style={{
                  background: "#1f2a44",
                  color: "#ffffff",
                  padding: "12px 20px",
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 18 }}>💬 Ask a question?</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleSaveChats}
                    style={{
                      border: "none",
                      background: "rgba(255,255,255,0.1)",
                      color: "#e5e7eb",
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Save chats
                  </button>
                  <button
                    onClick={handleClearAskSession}
                    style={{
                      border: "none",
                      background: "rgba(255,255,255,0.1)",
                      color: "#e5e7eb",
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Clear session
                  </button>
                </div>
              </div>
              <div style={styles.cardBody}>
                <div className="border rounded-md p-3 max-h-64 overflow-y-auto bg-gray-50 shadow-inner">
                  {qaMessages.length === 0 && (
                    <p className="text-sm text-gray-500">
                      Start by asking something about the uploaded documents.
                    </p>
                  )}
                  {qaMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`mb-2 text-sm ${msg.role === "user" ? "text-blue-800" : "text-gray-900"}`}
                    >
                      <strong>{msg.role === "user" ? "You:" : "Assistant:"}</strong>{" "}
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAskQuestion} className="mt-4 flex flex-col gap-2">
                  <textarea
                    rows={4}
                    className="w-full border rounded-xl px-3 py-2 text-sm shadow-sm"
                    placeholder="Type your question..."
                    value={askQuestion}
                    onChange={(e) => setAskQuestion(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isAskLoading}
                      className="px-5 py-2 text-sm rounded-full bg-blue-600 text-white disabled:opacity-50 shadow"
                    >
                      {isAskLoading ? "Thinking..." : "Ask"}
                    </button>
                  </div>
                </form>

                {qaError && (
                  <p className="mt-2 text-sm text-red-600">
                    {qaError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* modal removed */}
    </div>
  );
}
