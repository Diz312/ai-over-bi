"use client";

import {
  BRAND_WHITE,
  SECONDARY_BLACK,
  SHADOW_CARD,
  TYPO_P1_BOLD,
} from "@/lib/theme";

export function NavBar() {
  return (
    <header
      data-region="navbar"
      style={{
        background: BRAND_WHITE,
        boxShadow: SHADOW_CARD,
        paddingLeft: 64,
        paddingRight: 64,
        display: "flex",
        alignItems: "center",
        width: "100%",
        position: "relative",
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flex: "1 0 0",
          height: 56,
          alignItems: "center",
          justifyContent: "space-between",
          minWidth: 1,
          position: "relative",
        }}
      >
        {/* Left — brand slot (Frame-adminNav position) */}
        <div
          style={{
            display: "flex",
            gap: 24,
            height: "100%",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <img
            alt="QuickBite"
            src="/icons/image%20103.png"
            style={{ height: 32, width: "auto", display: "block", flexShrink: 0 }}
          />
          <span style={TYPO_P1_BOLD}>AI over BI — QuickBite Analytics</span>
        </div>

        {/* Right — user settings + notification bell */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexShrink: 0,
          }}
        >
          {/* User Settings: greeting text + avatar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 400,
                color: SECONDARY_BLACK,
                lineHeight: "22px",
                letterSpacing: "-0.1875px",
                textAlign: "right",
                whiteSpace: "nowrap",
              }}
            >
              Hi, Ismar!
            </span>

            {/* Avatar: gold circle + profile icon stacked */}
            <div
              style={{
                position: "relative",
                width: 24,
                height: 24,
                flexShrink: 0,
              }}
            >
              <img
                alt=""
                src="/icons/avatar-ellipse.svg"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                }}
              />
              <img
                alt=""
                src="/icons/profile-icon.svg"
                style={{
                  position: "absolute",
                  left: 4,
                  top: 4,
                  width: 16,
                  height: 16,
                }}
              />
            </div>
          </div>

          {/* Nav Trailing Actions: bell icon + notification dot */}
          <div
            style={{
              position: "relative",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 4,
                borderRadius: "100%",
              }}
            >
              <img
                alt="Notifications"
                src="/icons/bell-fill.svg"
                style={{ width: 24, height: 24, display: "block" }}
              />
            </div>

            {/* Red dot: left:24 top:1 relative to the 32×32 trailing-actions container */}
            <div
              style={{
                position: "absolute",
                left: 24,
                top: 1,
                width: 8,
                height: 8,
              }}
            >
              <img
                alt=""
                src="/icons/notification-dot.svg"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
