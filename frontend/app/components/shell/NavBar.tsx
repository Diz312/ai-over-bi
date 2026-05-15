"use client";

import Link from "next/link";
import {
  BRAND_RED,
  BRAND_WHITE,
  SECONDARY_BLACK,
  SHADOW_CARD,
} from "@/lib/theme";

const IMG_NAV_LOGO   = "https://www.figma.com/api/mcp/asset/eec50283-af19-401c-8319-b8016be5e6f1";
const IMG_NAV_CHAT   = "https://www.figma.com/api/mcp/asset/de64d349-39f2-4ca7-a54e-17d3d769cff5";
const IMG_NAV_AVATAR = "https://www.figma.com/api/mcp/asset/98cd8741-b5cf-4763-bcdc-b5fc200a6f33";

const NAV_LINKS = [
  { label: "Home",                  href: "/",       active: false },
  { label: "Reports Catalog",       href: "#",       active: false },
  { label: "Data Agent",             href: "/agent",  active: true  },
];

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
        boxSizing: "border-box",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 100,
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
        }}
      >
        {/* Left: logo + nav links */}
        <div style={{ display: "flex", gap: 8, height: "100%", alignItems: "center" }}>
          <div style={{ width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              alt="QuickBite"
              src={IMG_NAV_LOGO}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          </div>
          {NAV_LINKS.map(({ label, href, active }) => (
            <Link
              key={label}
              href={href}
              style={{
                display: "flex",
                height: "100%",
                alignItems: "center",
                padding: "0 16px",
                textDecoration: "none",
                color: active ? BRAND_RED : SECONDARY_BLACK,
                fontWeight: active ? 700 : 400,
                fontSize: 14,
                lineHeight: "16px",
                letterSpacing: -0.1875,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right: chat icon + avatar */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexShrink: 0 }}>
          <div style={{ width: 25, height: 25 }}>
            <img alt="" src={IMG_NAV_CHAT} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ width: 36, height: 36 }}>
            <img alt="" src={IMG_NAV_AVATAR} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} />
          </div>
        </div>
      </div>
    </header>
  );
}
