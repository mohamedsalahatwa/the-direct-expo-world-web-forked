import { useEffect, useState } from "react";
import type { Meeting } from "@immersive/shared";
import { createMeeting } from "../api";
import { getDeveloper, FIRST_DEVELOPER, DEVELOPERS } from "../scene/developers";

/* -------------------------------------------------------------------------- */
/*  BoothPanel — compact developer card / modal on the right                  */
/* -------------------------------------------------------------------------- */

export interface BoothPanelProps {
  /** Developer to show; null closes the card (slides out). */
  developerId: string | null;
  onClose: () => void;
}

/**
 * A compact floating card that slides in from the right with a developer's key
 * details — logo, name, booth number, location — plus a clickable video-meeting
 * row and a primary "Join meeting" button. It never covers or dims the 3D scene,
 * so visitors keep exploring while it's open. Selecting another booth swaps the
 * content in place.
 */
export function BoothPanel({ developerId, onClose }: BoothPanelProps) {
  const open = developerId !== null;

  // Keep showing the last developer's content while the card slides out, so the
  // close animation doesn't flash empty.
  const [shownId, setShownId] = useState<string | null>(developerId);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the meeting state whenever a different developer's booth is shown.
  useEffect(() => {
    if (developerId !== null) {
      setShownId(developerId);
      setMeeting(null);
      setError(null);
      setBusy(false);
    }
  }, [developerId]);

  const dev = getDeveloper(shownId ?? FIRST_DEVELOPER.id);

  // Booth number is the developer's position on the floor roster (1-based).
  const boothNumber = Math.max(0, DEVELOPERS.findIndex((d) => d.id === dev.id)) + 1;
  const boothLabel = `Booth #${String(boothNumber).padStart(2, "0")}`;

  // Create an instant Google Meet for this booth (once), then open it. A second
  // click just re-opens the already-created link rather than spawning another.
  async function handleJoin() {
    if (meeting) {
      window.open(meeting.meetLink, "_blank", "noopener,noreferrer");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const m = await createMeeting({
        title: `${dev.name} — Investor Meeting`,
        startTime: new Date().toISOString(),
        attendees: dev.contact ? [dev.contact] : [],
      });
      setMeeting(m);
      window.open(m.meetLink, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      className={`booth-panel ${open ? "is-open" : ""}`}
      aria-hidden={!open}
      style={{ ["--accent" as string]: dev.color }}
    >
      <button className="bp-close" onClick={onClose} aria-label="Close panel">
        ✕
      </button>

      <div className="bp-card">
        <header className="bp-head">
          <div className="bp-logo">{dev.monogram}</div>
          <div className="bp-head-text">
            <h2 className="bp-name">{dev.name}</h2>
            <span className="bp-booth">{boothLabel}</span>
          </div>
        </header>

        <div className="bp-location">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
            />
          </svg>
          {dev.location}
        </div>

        {/* clickable video-meeting row */}
        <button className="bp-video" onClick={handleJoin} disabled={busy}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              fill="currentColor"
              d="M15 8.5V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2.5l4 3.5V5l-4 3.5Z"
            />
          </svg>
          <span className="bp-video-text">
            <strong>Video meeting</strong>
            <span>{meeting ? "Open meeting link" : "Google Meet"}</span>
          </span>
          <span className="bp-video-go" aria-hidden="true">
            →
          </span>
        </button>

        <button className="bp-join" onClick={handleJoin} disabled={busy}>
          {busy ? "Starting…" : "Join meeting"}
        </button>

        {error && <p className="bp-error">{error}</p>}
      </div>
    </aside>
  );
}
