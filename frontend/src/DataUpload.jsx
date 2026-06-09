import { useState, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const ACCEPTED_TYPES = [".csv", ".json"];
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ─────────────────────────────────────────────────────────────
// UPLOAD STATES 
// ─────────────────────────────────────────────────────────────
const STATES = {
  IDLE: "idle",
  DRAGGING: "dragging",
  VALIDATING: "validating",
  UPLOADING: "uploading",
  SUCCESS: "success",
  ERROR: "error",
};

// ─────────────────────────────────────────────────────────────
// FILE VALIDATOR
// ─────────────────────────────────────────────────────────────
function validateFile(file) {
  if (!file) return { valid: false, error: "No file selected." };

  const extension = "." + file.name.split(".").pop().toLowerCase();
  if (!ACCEPTED_TYPES.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported format. Please upload a ${ACCEPTED_TYPES.join(" or ")} file.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty." };
  }

  return { valid: true, error: null };
}

// ─────────────────────────────────────────────────────────────
// FORMAT HELPERS
// ─────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// Props:
//   onUploadSuccess(report) — called with the pipeline report
//   onUploadError(message)  — called on failure
//   apiEndpoint             — where to POST the file
// ─────────────────────────────────────────────────────────────
export default function DataUpload({
  onUploadSuccess,
  onUploadError,
  apiEndpoint = "/api/pipeline/run",
}) {
  const [uploadState, setUploadState] = useState(STATES.IDLE);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  // ── DRAG & DROP HANDLERS ────────────────────────────────────

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState(STATES.DRAGGING);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault(); // Required — without this, drop won't fire
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if leaving the drop zone entirely (not a child element)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setUploadState(STATES.IDLE);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, []);

  // ── FILE INPUT HANDLER ──────────────────────────────────────
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  // ── CORE FILE PROCESSING ────────────────────────────────────
  // Validates then sets the file — does NOT upload yet.
  // The user gets to review before committing.
  const processFile = (file) => {
    setUploadState(STATES.VALIDATING);
    setValidationError(null);
    setUploadResult(null);

    const { valid, error } = validateFile(file);

    if (!valid) {
      setValidationError(error);
      setUploadState(STATES.ERROR);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadState(STATES.IDLE); // Ready to upload, waiting for confirmation
  };

  // ── UPLOAD HANDLER ──────────────────────────────────────────

  const handleUpload = () => {
    if (!selectedFile) return;

    setUploadState(STATES.UPLOADING);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);

    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const report = JSON.parse(xhr.responseText);
          setUploadResult(report);
          setUploadState(STATES.SUCCESS);
          onUploadSuccess?.(report);
        } catch {
          setValidationError("Server returned an unexpected response.");
          setUploadState(STATES.ERROR);
        }
      } else {
        const msg = `Upload failed: ${xhr.status} ${xhr.statusText}`;
        setValidationError(msg);
        setUploadState(STATES.ERROR);
        onUploadError?.(msg);
      }
    };

    xhr.onerror = () => {
      const msg = "Network error — check your connection and try again.";
      setValidationError(msg);
      setUploadState(STATES.ERROR);
      onUploadError?.(msg);
    };

    xhr.open("POST", apiEndpoint);
    xhr.send(formData);
  };

  // ── RESET ───────────────────────────────────────────────────
  const handleReset = () => {
    setUploadState(STATES.IDLE);
    setSelectedFile(null);
    setValidationError(null);
    setUploadProgress(0);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── RENDER ──────────────────────────────────────────────────
  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerIcon}>⬆</span>
          <div>
            <h2 style={styles.title}>Upload Dataset</h2>
            <p style={styles.subtitle}>CSV or JSON · max {MAX_FILE_SIZE_MB}MB</p>
          </div>
        </div>

        {/* Drop Zone */}
        {uploadState !== STATES.SUCCESS && (
          <div
            style={{
              ...styles.dropZone,
              ...(uploadState === STATES.DRAGGING ? styles.dropZoneDragging : {}),
              ...(uploadState === STATES.ERROR ? styles.dropZoneError : {}),
            }}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label="Drop zone — click or drag a file here"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              style={{ display: "none" }}
              onChange={handleFileInputChange}
              aria-hidden="true"
            />

            {uploadState === STATES.DRAGGING ? (
              <DropZoneContent icon="📂" text="Drop it!" sub="Release to queue your file" accent />
            ) : selectedFile ? (
              <DropZoneContent
                icon="📄"
                text={selectedFile.name}
                sub={`${formatBytes(selectedFile.size)} · ${formatDate(new Date(selectedFile.lastModified))}`}
              />
            ) : (
              <DropZoneContent
                icon="⬆"
                text="Drag & drop your file here"
                sub="or click to browse"
              />
            )}
          </div>
        )}

        {/* Validation error */}
        {uploadState === STATES.ERROR && validationError && (
          <div style={styles.errorBanner} role="alert">
            <span>⚠</span>
            <span>{validationError}</span>
          </div>
        )}

        {/* Progress bar */}
        {uploadState === STATES.UPLOADING && (
          <div style={styles.progressWrap}>
            <div style={styles.progressMeta}>
              <span style={styles.progressLabel}>Uploading…</span>
              <span style={styles.progressPct}>{uploadProgress}%</span>
            </div>
            <div style={styles.progressTrack}>
              <div
                style={{ ...styles.progressBar, width: `${uploadProgress}%` }}
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}

        {/* Success panel */}
        {uploadState === STATES.SUCCESS && uploadResult && (
          <SuccessPanel result={uploadResult} onReset={handleReset} />
        )}

        {/* Action buttons */}
        {uploadState !== STATES.SUCCESS && uploadState !== STATES.UPLOADING && (
          <div style={styles.actions}>
            {selectedFile && uploadState !== STATES.ERROR && (
              <button style={styles.btnPrimary} onClick={handleUpload}>
                Run Pipeline
              </button>
            )}
            {(selectedFile || uploadState === STATES.ERROR) && (
              <button style={styles.btnSecondary} onClick={handleReset}>
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SUB-COMPONENTS ─────────────────────────────────────────────

function DropZoneContent({ icon, text, sub, accent }) {
  return (
    <div style={{ textAlign: "center", pointerEvents: "none" }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
      <p style={{ ...styles.dropText, ...(accent ? styles.dropTextAccent : {}) }}>{text}</p>
      <p style={styles.dropSub}>{sub}</p>
    </div>
  );
}

function SuccessPanel({ result, onReset }) {
  const q = result.quality_report?.issues ?? {};
  const score = result.quality_report?.quality_score_pct ?? "—";

  const stats = [
    { label: "Raw rows",     value: result.quality_report?.row_count_raw ?? "—" },
    { label: "Clean rows",   value: result.clean_row_count ?? "—" },
    { label: "Removed",      value: result.rows_removed ?? "—" },
    { label: "Quality score",value: `${score}%` },
    { label: "Null cells",   value: q.total_null_cells ?? 0 },
    { label: "Duplicates",   value: q.duplicate_row_count ?? 0 },
  ];

  return (
    <div style={styles.successPanel}>
      <div style={styles.successHeader}>
        <span style={styles.successIcon}>✓</span>
        <div>
          <p style={styles.successTitle}>Pipeline complete</p>
          <p style={styles.successSub}>Data is clean and ready to query</p>
        </div>
        <button style={styles.btnSecondary} onClick={onReset}>Upload another</button>
      </div>

      <div style={styles.statsGrid}>
        {stats.map(({ label, value }) => (
          <div key={label} style={styles.statCell}>
            <span style={styles.statValue}>{value}</span>
            <span style={styles.statLabel}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── STYLES ──────────────────────────────────────────────────────
const styles = {
  wrapper: {
    fontFamily: "'DM Mono', 'Fira Mono', monospace",
    display: "flex",
    justifyContent: "center",
    padding: "2rem 1rem",
    background: "#0d0d0f",
    minHeight: "100vh",
  },
  card: {
    width: "100%",
    maxWidth: 540,
    background: "#16161a",
    border: "1px solid #2a2a32",
    borderRadius: 16,
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    height: "fit-content",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.875rem",
  },
  headerIcon: {
    fontSize: 28,
    background: "#1e1e26",
    border: "1px solid #2a2a36",
    borderRadius: 10,
    width: 48,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#e8e8f0",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    margin: "0.2rem 0 0",
    fontSize: "0.78rem",
    color: "#555566",
    letterSpacing: "0.03em",
  },
  dropZone: {
    border: "1.5px dashed #2e2e3a",
    borderRadius: 12,
    padding: "2.5rem 1.5rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "border-color 0.15s, background 0.15s",
    background: "#111116",
  },
  dropZoneDragging: {
    borderColor: "#7c6af7",
    background: "#16153a",
  },
  dropZoneError: {
    borderColor: "#7f2a2a",
    background: "#180d0d",
  },
  dropText: {
    margin: "0 0 4px",
    fontSize: "0.9rem",
    color: "#9090a8",
    letterSpacing: "0.01em",
  },
  dropTextAccent: {
    color: "#a09af7",
    fontWeight: 600,
  },
  dropSub: {
    margin: 0,
    fontSize: "0.75rem",
    color: "#44444e",
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
    background: "#1c0f0f",
    border: "1px solid #5a2020",
    borderRadius: 8,
    padding: "0.75rem 1rem",
    fontSize: "0.82rem",
    color: "#e07070",
  },
  progressWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  progressMeta: {
    display: "flex",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: "0.8rem",
    color: "#6666 77",
  },
  progressPct: {
    fontSize: "0.8rem",
    color: "#7c6af7",
    fontWeight: 600,
  },
  progressTrack: {
    height: 4,
    background: "#1e1e26",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    background: "#7c6af7",
    borderRadius: 2,
    transition: "width 0.15s ease",
  },
  successPanel: {
    border: "1px solid #1e3a1e",
    borderRadius: 12,
    overflow: "hidden",
    background: "#0e1a0e",
  },
  successHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.875rem",
    padding: "1rem 1.25rem",
    borderBottom: "1px solid #1e3a1e",
  },
  successIcon: {
    fontSize: 20,
    width: 36,
    height: 36,
    background: "#1a3a1a",
    border: "1px solid #2a5a2a",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "#5ad65a",
  },
  successTitle: {
    margin: 0,
    fontSize: "0.88rem",
    fontWeight: 600,
    color: "#70d070",
    flex: 1,
  },
  successSub: {
    margin: "0.15rem 0 0",
    fontSize: "0.75rem",
    color: "#3a7a3a",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 0,
  },
  statCell: {
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    borderRight: "1px solid #1e3a1e",
    borderBottom: "1px solid #1e3a1e",
  },
  statValue: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#a0e0a0",
    letterSpacing: "-0.02em",
  },
  statLabel: {
    fontSize: "0.7rem",
    color: "#3a6a3a",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  actions: {
    display: "flex",
    gap: "0.75rem",
  },
  btnPrimary: {
    flex: 1,
    padding: "0.7rem 1.25rem",
    background: "#7c6af7",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.02em",
  },
  btnSecondary: {
    padding: "0.7rem 1rem",
    background: "transparent",
    border: "1px solid #2a2a36",
    borderRadius: 8,
    color: "#666677",
    fontSize: "0.82rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
};
