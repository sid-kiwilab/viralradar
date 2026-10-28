"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";

const BTN_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  padding: 0,
  margin: 0,
  border: "none",
  borderRadius: "50%",
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1,
  color: "rgba(255, 255, 255, 0.55)",
  background: "rgba(255, 255, 255, 0.12)",
  cursor: "pointer",
  flexShrink: 0,
  verticalAlign: "middle",
};

const POPOVER_STYLE: CSSProperties = {
  position: "fixed",
  zIndex: 10000,
  transform: "translate(-50%, calc(-100% - 6px))",
  maxWidth: "min(300px, 88vw)",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255, 255, 255, 0.18)",
  background: "#141618",
  boxShadow: "0 10px 28px rgba(0, 0, 0, 0.55)",
  fontSize: 12,
  fontWeight: 400,
  lineHeight: 1.45,
  letterSpacing: 0,
  textTransform: "none",
  textAlign: "left",
  whiteSpace: "normal",
  color: "rgba(242, 244, 243, 0.94)",
  pointerEvents: "none",
};

function prefersFineHover(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** Score definition on hover/focus — not in label DOM (avoids uppercase bleed). */
export function ScoreTip({ tip }: { tip: string }) {
  const tipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(true);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(
    null,
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const syncAnchor = useCallback(() => {
    const el = buttonRef.current;
    if (!el) {
      return;
    }
    const r = el.getBoundingClientRect();
    setAnchor({ top: r.top, left: r.left + r.width / 2 });
  }, []);

  const show = useCallback(() => {
    syncAnchor();
    setOpen(true);
  }, [syncAnchor]);

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    syncAnchor();
    const onScrollOrResize = () => {
      if (mountedRef.current) {
        syncAnchor();
      }
    };
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, syncAnchor]);

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (prefersFineHover()) {
        return;
      }
      event.preventDefault();
      if (open) {
        hide();
      } else {
        show();
      }
    },
    [open, show, hide],
  );

  const tooltip =
    open && anchor && typeof document !== "undefined"
      ? createPortal(
          <span
            id={tipId}
            role="tooltip"
            style={{ ...POPOVER_STYLE, top: anchor.top, left: anchor.left }}
          >
            {tip}
          </span>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={tip}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        style={BTN_STYLE}
        onMouseEnter={() => {
          if (prefersFineHover()) {
            show();
          }
        }}
        onMouseLeave={() => {
          if (prefersFineHover()) {
            hide();
          }
        }}
        onFocus={show}
        onBlur={hide}
        onPointerUp={onPointerUp}
      >
        ?
      </button>
      {tooltip}
    </>
  );
}
