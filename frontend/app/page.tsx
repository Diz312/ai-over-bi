// @page: HP  (route: /)
import Link from "next/link";
import {
  BRAND_WHITE,
  BRAND_GOLD,
  BRAND_RED,
  SECONDARY_BLACK,
  SECONDARY_DARK_GREY,
  SECONDARY_LIGHT_GREY,
  SECONDARY_LINK_BLUE,
  SECONDARY_IVORY,
  BACKFILL_GOLD,
  BACKFILL_RED,
  SHADOW_CARD,
} from "@/lib/theme";

// ── Figma MCP asset URLs ──────────────────────────────────────────────────────
const IMG_NAV_LOGO = "https://www.figma.com/api/mcp/asset/eec50283-af19-401c-8319-b8016be5e6f1";
const IMG_NAV_CHAT = "https://www.figma.com/api/mcp/asset/de64d349-39f2-4ca7-a54e-17d3d769cff5";
const IMG_NAV_AVATAR = "https://www.figma.com/api/mcp/asset/98cd8741-b5cf-4763-bcdc-b5fc200a6f33";
const IMG_USER_AVATAR = "https://www.figma.com/api/mcp/asset/63744335-d123-4b66-ac47-15c26c615299";
const IMG_KPI_SPARK_GREEN = "https://www.figma.com/api/mcp/asset/4c79414d-48fa-44f6-ab22-dbd8e4d83fe7";
const IMG_KPI_SPARK_RED = "https://www.figma.com/api/mcp/asset/2bd89fd5-8e1f-4149-9cb9-4e8887707ee5";
const IMG_CALL_MADE_GREEN = "https://www.figma.com/api/mcp/asset/366a0037-81b3-4098-9eb8-4854fdf0d88f";
const IMG_CALL_MADE_RED = "https://www.figma.com/api/mcp/asset/ae2c5f3d-e6f4-4158-b71f-f07bb509c690";
const IMG_INSTANT_MIX = "https://www.figma.com/api/mcp/asset/f929cf4b-c3a6-4e53-bde9-81ca01a70c16";
const IMG_EXPLORE_AI_CHAT = "https://www.figma.com/api/mcp/asset/65d2c6a7-4a81-4887-bbd9-094c87c0d0d4";
const IMG_CHEVRON_UP = "https://www.figma.com/api/mcp/asset/0114ae88-8227-4bad-a9eb-ac874b9a495a";
const IMG_CHEVRON_DOWN = "https://www.figma.com/api/mcp/asset/ff7c6b2e-091a-4615-a88e-3fadda369931";
const IMG_COMP_ICON = "https://www.figma.com/api/mcp/asset/b4ff6537-51df-45f1-a76d-86666d134fe4";
// Comparability section KPI tile assets
const IMG_COMP_ARROW_GREEN = "https://www.figma.com/api/mcp/asset/901c688f-1e23-4bce-81db-93b35ad8f915";
const IMG_COMP_ARROW_RED = "https://www.figma.com/api/mcp/asset/16ad81d7-8f18-4f29-9b0e-32cf683f1be0";
const IMG_COMP_SPARK_GREEN = "https://www.figma.com/api/mcp/asset/91724676-9708-46d1-b99e-fd6a96f194b4";
const IMG_COMP_SPARK_RED = "https://www.figma.com/api/mcp/asset/3cd9b5c0-2eba-47f4-990f-cd38eaea5699";
const IMG_COMP_SPARK_RED2 = "https://www.figma.com/api/mcp/asset/15e7d89b-0994-47b1-a6c1-f9d3083461e9";
// Chart + table screenshots from Figma (static visuals for demo)
const IMG_TABLE = "https://www.figma.com/api/mcp/asset/bee4e3e6-b66e-41d7-8368-1e8c719dcf8b";
// Bottom chart section graph assets

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionChevron({ direction = "up" }: { direction?: "up" | "down" }) {
  return (
    <div style={{ width: 15, height: 15, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img
        alt=""
        src={direction === "up" ? IMG_CHEVRON_UP : IMG_CHEVRON_DOWN}
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />
    </div>
  );
}

function ExploreAI({ imgSrc = IMG_EXPLORE_AI_CHAT }: { imgSrc?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      <span
        style={{
          color: SECONDARY_LINK_BLUE,
          fontSize: 14,
          lineHeight: "28px",
          letterSpacing: -0.15,
          textTransform: "capitalize",
          whiteSpace: "nowrap",
        }}
      >
        Explore with AI
      </span>
      <div style={{ position: "relative", width: 25, height: 25, flexShrink: 0 }}>
        <img alt="" src={imgSrc} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  exploreHref,
}: {
  icon: string;
  title: string;
  subtitle: string;
  exploreHref?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: 24,
        borderBottom: `1px solid #EAEAEA`,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1 }}>
        <div style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img alt="" src={icon} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <p
              style={{
                fontWeight: 700,
                fontSize: 24,
                lineHeight: "28px",
                color: SECONDARY_BLACK,
                letterSpacing: -0.15,
                whiteSpace: "nowrap",
                margin: 0,
              }}
            >
              {title}
            </p>
            {exploreHref && (
              <Link
                href={exploreHref}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  textDecoration: "none",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    color: SECONDARY_LINK_BLUE,
                    fontSize: 14,
                    lineHeight: "28px",
                    letterSpacing: -0.15,
                    whiteSpace: "nowrap",
                  }}
                >
                  Explore with AI
                </span>
                <div style={{ width: 20, height: 20 }}>
                  <img alt="" src={IMG_EXPLORE_AI_CHAT} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              </Link>
            )}
          </div>
          <p
            style={{
              fontWeight: 400,
              fontSize: 14,
              lineHeight: "16px",
              color: SECONDARY_DARK_GREY,
              letterSpacing: -0.15,
              whiteSpace: "nowrap",
              margin: 0,
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>
      <SectionChevron direction="up" />
    </div>
  );
}

function KpiBadge({
  value,
  direction,
}: {
  value: string;
  direction: "up" | "down";
}) {
  const isUp = direction === "up";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 16px",
        borderRadius: 100,
        background: isUp ? "#F2F7DA" : BACKFILL_RED,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontWeight: 400,
          fontSize: 32,
          lineHeight: "40px",
          color: isUp ? "#09781C" : BRAND_RED,
          letterSpacing: -0.15,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
      <div style={{ position: "relative", width: 24, height: 24, flexShrink: 0 }}>
        <img
          alt=""
          src={isUp ? IMG_CALL_MADE_GREEN : IMG_CALL_MADE_RED}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    </div>
  );
}

function HeroKpiTile({
  title,
  value,
  direction,
  spark,
}: {
  title: string;
  value: string;
  direction: "up" | "down";
  spark: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: BRAND_WHITE,
        border: "1px solid #EAEAEA",
        borderRadius: 10,
        boxShadow: "0px 4px 2px rgba(0,0,0,0.05)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <p
            style={{
              fontWeight: 700,
              fontSize: 16,
              lineHeight: "20px",
              color: SECONDARY_BLACK,
              letterSpacing: -0.15,
              margin: 0,
            }}
          >
            {title}
          </p>
        </div>
        <div style={{ width: 24, height: 24, flexShrink: 0 }}>
          <img
            alt=""
            src={IMG_INSTANT_MIX}
            style={{ width: "100%", height: "100%", objectFit: "contain", transform: "rotate(90deg)" }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <KpiBadge value={value} direction={direction} />
          <p
            style={{
              fontWeight: 400,
              fontSize: 14,
              lineHeight: "16px",
              color: SECONDARY_BLACK,
              letterSpacing: -0.15,
              whiteSpace: "nowrap",
              margin: 0,
            }}
          >
            Previous: <strong>110</strong>
          </p>
        </div>
        <div style={{ flex: 1, height: 29, alignSelf: "center", overflow: "hidden" }}>
          <img
            alt=""
            src={spark}
            style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <p
          style={{
            flex: 1,
            fontWeight: 400,
            fontSize: 12,
            lineHeight: "16px",
            color: "#909090",
            letterSpacing: -0.15,
            whiteSpace: "pre-wrap",
            margin: 0,
          }}
        >
          12 Sep - 12 Oct, 2025
        </p>
      </div>
    </div>
  );
}

function CompKpiTile({
  title,
  value,
  direction,
  spark,
  featured = false,
}: {
  title: string;
  value: string;
  direction: "up" | "down";
  spark: string;
  featured?: boolean;
}) {
  const isUp = direction === "up";
  return (
    <div
      style={{
        flex: 1,
        background: BRAND_WHITE,
        border: featured ? `3px solid ${BRAND_GOLD}` : "1px solid #EAEAEA",
        borderRadius: featured ? "10px 10px 5px 10px" : 10,
        boxShadow: "0px 4px 2px rgba(0,0,0,0.05)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 0,
      }}
    >
      <p
        style={{
          fontWeight: 700,
          fontSize: 16,
          lineHeight: "20px",
          color: SECONDARY_BLACK,
          letterSpacing: -0.15,
          margin: 0,
        }}
      >
        {title}
      </p>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 16px",
          borderRadius: 100,
          background: isUp ? "#F2F7DA" : BACKFILL_RED,
          alignSelf: "flex-start",
        }}
      >
        <span
          style={{
            fontWeight: 400,
            fontSize: 32,
            lineHeight: "40px",
            color: isUp ? "#09781C" : BRAND_RED,
            letterSpacing: -0.15,
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </span>
        <div style={{ position: "relative", width: 24, height: 24, flexShrink: 0 }}>
          <img
            alt=""
            src={isUp ? IMG_COMP_ARROW_GREEN : IMG_COMP_ARROW_RED}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      </div>
      <div style={{ height: 28, width: "100%", overflow: "hidden" }}>
        <img
          alt=""
          src={spark}
          style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }}
        />
      </div>
    </div>
  );
}

function DropdownField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <p
        style={{
          fontWeight: 600,
          fontSize: 14,
          lineHeight: "20px",
          color: SECONDARY_BLACK,
          margin: 0,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </p>
      <div
        style={{
          background: BRAND_WHITE,
          border: `1px solid ${SECONDARY_LIGHT_GREY}`,
          borderRadius: 8,
          padding: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <p
          style={{
            flex: 1,
            fontWeight: 400,
            fontSize: 14,
            lineHeight: "20px",
            color: SECONDARY_BLACK,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            margin: 0,
          }}
        >
          {value}
        </p>
        <div style={{ width: 12, height: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img
            alt=""
            src={IMG_CHEVRON_DOWN}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: BACKFILL_GOLD,
        borderLeft: `7px solid ${BRAND_GOLD}`,
        borderRadius: 12,
        padding: "10px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      <p style={{ fontWeight: 700, fontSize: 16, lineHeight: "20px", color: SECONDARY_BLACK, letterSpacing: -0.15, margin: 0 }}>
        {title}
      </p>
      <p style={{ fontWeight: 400, fontSize: 16, lineHeight: "20px", color: SECONDARY_BLACK, letterSpacing: -0.15, margin: 0 }}>
        {body}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: SECONDARY_IVORY, fontFamily: "sans-serif" }}>

      {/* ─── Navbar ────────────────────────────────────────────────────────── */}
      <header
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
            {[
              { label: "Home", active: true, href: "/" },
              { label: "Reports Catalog", active: false, href: "#" },
              { label: "Data Agent", active: false, href: "/agent" },
            ].map(({ label, active, href }) => (
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
          {/* Right: chat + avatar */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexShrink: 0 }}>
            <div style={{ position: "relative", width: 25, height: 25 }}>
              <img alt="" src={IMG_NAV_CHAT} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
            </div>
            <div style={{ position: "relative", width: 36, height: 36 }}>
              <img alt="" src={IMG_NAV_AVATAR} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: "50%" }} />
            </div>
          </div>
        </div>
      </header>

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: BRAND_WHITE,
          paddingLeft: 64,
          paddingRight: 64,
          paddingTop: 36,
          paddingBottom: 24,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <p
          style={{
            fontWeight: 700,
            fontSize: 32,
            lineHeight: "40px",
            color: SECONDARY_BLACK,
            letterSpacing: -0.15,
            margin: 0,
          }}
        >
          Intelligence Platform
        </p>
      </div>

      {/* ─── Main content ──────────────────────────────────────────────────── */}
      <div
        style={{
          paddingLeft: 64,
          paddingRight: 64,
          paddingTop: 24,
          paddingBottom: 48,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >

        {/* ── User + KPI Tiles ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* User header card */}
          <div
            style={{
              background: BRAND_WHITE,
              borderRadius: 16,
              boxShadow: "0px 1px 5px rgba(0,0,0,0.08)",
              padding: "16px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
                <img alt="" src={IMG_USER_AVATAR} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 18,
                    lineHeight: "28px",
                    color: SECONDARY_BLACK,
                    margin: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  Claire Devaney
                </p>
                <p
                  style={{
                    fontWeight: 400,
                    fontSize: 18,
                    lineHeight: "28px",
                    color: "#606060",
                    margin: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  Sr.Dir EDAA Transformation
                </p>
              </div>
            </div>
            <div
              style={{
                background: BRAND_GOLD,
                borderRadius: 16,
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 14, lineHeight: "20px", color: SECONDARY_BLACK }}>
                + Personalize Page
              </span>
              <span style={{ fontSize: 14, color: SECONDARY_BLACK }}>&rsaquo;</span>
            </div>
          </div>

          {/* 3 KPI tiles */}
          <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
            <HeroKpiTile title="KPI Title" value="274" direction="up" spark={IMG_KPI_SPARK_GREEN} />
            <HeroKpiTile title="KPI Title" value="274" direction="up" spark={IMG_KPI_SPARK_GREEN} />
            <HeroKpiTile title="KPI Title" value="274" direction="down" spark={IMG_KPI_SPARK_RED} />
          </div>
        </div>

        {/* ── Comparability Report card ─────────────────────────────────────── */}
        <div
          style={{
            background: BRAND_WHITE,
            borderRadius: 16,
            boxShadow: SHADOW_CARD,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <SectionHeader
            icon={IMG_COMP_ICON}
            title="Key Insights"
            subtitle="Performance trends and comparability metrics across your region."
            exploreHref="/agent"
          />

          {/* General Report Insights */}
          <div
            style={{
              background: BRAND_WHITE,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              borderBottom: `1px solid #EAEAEA`,
            }}
          >
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                <InsightCard
                  title="Trends"
                  body="Identify upward or downward trends in key metrics like sales, customer satisfaction, or operational efficiency over the three-month period."
                />
                <InsightCard
                  title="Correlations"
                  body="Discover correlations between different KPIs, such as the relationship between marketing spend and customer acquisition cost."
                />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                <InsightCard
                  title="Outliers"
                  body="Pinpoint any unusually high or low values in the KPIs, which may indicate specific issues or opportunities that require further investigation."
                />
                <InsightCard
                  title="Comparisons:"
                  body="Compare the performance of different regions, product lines, or time periods to identify best practices and areas for improvement."
                />
              </div>
            </div>
          </div>

          {/* Filters row */}
          <div
            style={{
              padding: "24px 24px 0",
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            <DropdownField label="Comp. Type" value="Comp type: Financial" />
            <DropdownField label="Timeframe" value="Timeframe: YTD" />
            <DropdownField label="Rank Against" value="Rank Against: Region" />
            <DropdownField label="Display Results By" value="Display Results By: Operator" />
          </div>

          {/* 6 Comp KPI tiles */}
          <div style={{ padding: "24px 24px 0", display: "flex", gap: 20 }}>
            <CompKpiTile title="Sales Comp." value="0.8%" direction="up" spark={IMG_COMP_SPARK_GREEN} featured />
            <CompKpiTile title="GC Comp" value="0.3%" direction="down" spark={IMG_COMP_SPARK_RED2} />
            <CompKpiTile title="GC/R/D" value="341" direction="up" spark={IMG_COMP_SPARK_GREEN} />
            <CompKpiTile title="OEPE" value="138" direction="down" spark={IMG_COMP_SPARK_RED} />
            <CompKpiTile title="KVS" value="35" direction="down" spark={IMG_COMP_SPARK_RED} />
            <CompKpiTile title="OSAT" value="87%" direction="down" spark={IMG_COMP_SPARK_RED} />
          </div>


          {/* Table screenshot + pagination */}
          <div style={{ padding: "24px" }}>
            <img
              alt="Comparability table"
              src={IMG_TABLE}
              style={{ width: "100%", display: "block", borderRadius: 8 }}
            />
          </div>
        </div>


      </div>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer
        style={{
          background: SECONDARY_BLACK,
          paddingLeft: 64,
          paddingRight: 64,
          paddingTop: 24,
          paddingBottom: 24,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <p
          style={{
            fontWeight: 400,
            fontSize: 14,
            lineHeight: "1.4",
            color: BRAND_WHITE,
            whiteSpace: "nowrap",
            margin: 0,
          }}
        >
          McDonald&apos;s @ 2025. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
