import React from "react";

const BranchIllustration = ({
  className = "",
  style = {},
  height = 88,
  width = 360,
  ...rest
}) => {
  const containerHeight = typeof height === "number" ? `${height}px` : height;
  const containerWidth = typeof width === "number" ? `${width}px` : width;

  return (
    <div
      className={`branch-illustration-container ${className}`.trim()}
      style={{
        width: containerWidth,
        height: containerHeight,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        flexShrink: 0,
        ...style,
      }}
      {...rest}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1200 300"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      >
        <defs>
          {/* ================= BACKGROUND ================= */}
          <linearGradient
            id="branchBg"
            x1="0"
            y1="0"
            x2="1200"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#E8FAF2" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#F1FFF9" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#E8FAF2" stopOpacity="0.85" />
          </linearGradient>

          {/* ================= SHOP GRADIENT ================= */}
          <linearGradient id="branchShopGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* ================= PIN GRADIENT ================= */}
          <linearGradient id="branchPinGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* ================= GLASS GRADIENT ================= */}
          <linearGradient id="branchGlassGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#DDFBF0" />
            <stop offset="50%" stopColor="#BDEEDB" />
            <stop offset="100%" stopColor="#A8E5CE" />
          </linearGradient>

          {/* ================= SKYLINE GRADIENT ================= */}
          <linearGradient id="branchBuildingGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D0F5E3" />
            <stop offset="100%" stopColor="#BBEAD6" />
          </linearGradient>

          {/* ================= SHADOWS ================= */}
          <filter id="branchShopShadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow
              dx="0"
              dy="6"
              stdDeviation="7"
              floodColor="#047857"
              floodOpacity="0.12"
            />
          </filter>

          <filter id="branchPinShadow" x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow
              dx="0"
              dy="5"
              stdDeviation="6"
              floodColor="#047857"
              floodOpacity="0.22"
            />
          </filter>
        </defs>

        {/* =====================================================
            BACKGROUND
        ===================================================== */}
        <rect width="1200" height="300" rx="14" fill="url(#branchBg)" />

        {/* Soft ambient circles */}
        <circle cx="160" cy="155" r="125" fill="#D7F7E8" opacity="0.55" />
        <circle cx="480" cy="125" r="150" fill="#D0F5E3" opacity="0.45" />
        <circle cx="780" cy="120" r="160" fill="#D5F6E7" opacity="0.45" />
        <circle cx="1080" cy="165" r="135" fill="#DCF9ED" opacity="0.5" />

        {/* =====================================================
            BACKGROUND CITY SKYLINE
        ===================================================== */}
        <g opacity="0.28">
          {/* Left Skyline */}
          <rect x="70" y="115" width="55" height="110" rx="3" fill="#9ADDC1" />
          <rect x="135" y="85" width="65" height="140" rx="3" fill="#A8E5CB" />
          <rect x="210" y="125" width="58" height="100" rx="3" fill="#8FD6B7" />
          <rect x="280" y="70" width="65" height="155" rx="3" fill="#A3E1C5" />
          <rect x="355" y="105" width="60" height="120" rx="3" fill="#94D9BA" />

          {/* Right Skyline */}
          <rect x="785" y="105" width="60" height="120" rx="3" fill="#94D9BA" />
          <rect x="855" y="70" width="65" height="155" rx="3" fill="#A3E1C5" />
          <rect x="930" y="125" width="58" height="100" rx="3" fill="#8FD6B7" />
          <rect x="1000" y="85" width="65" height="140" rx="3" fill="#A8E5CB" />
          <rect x="1075" y="115" width="55" height="110" rx="3" fill="#9ADDC1" />

          {/* Windows */}
          <g fill="#79CBA7">
            <rect x="150" y="102" width="8" height="10" rx="1" />
            <rect x="168" y="102" width="8" height="10" rx="1" />
            <rect x="150" y="124" width="8" height="10" rx="1" />
            <rect x="168" y="124" width="8" height="10" rx="1" />

            <rect x="294" y="88" width="8" height="10" rx="1" />
            <rect x="312" y="88" width="8" height="10" rx="1" />
            <rect x="294" y="108" width="8" height="10" rx="1" />
            <rect x="312" y="108" width="8" height="10" rx="1" />

            <rect x="870" y="88" width="8" height="10" rx="1" />
            <rect x="888" y="88" width="8" height="10" rx="1" />
            <rect x="870" y="108" width="8" height="10" rx="1" />
            <rect x="888" y="108" width="8" height="10" rx="1" />

            <rect x="1014" y="102" width="8" height="10" rx="1" />
            <rect x="1032" y="102" width="8" height="10" rx="1" />
            <rect x="1014" y="124" width="8" height="10" rx="1" />
            <rect x="1032" y="124" width="8" height="10" rx="1" />
          </g>
        </g>

        {/* =====================================================
            SOFT CLOUDS
        ===================================================== */}
        <g opacity="0.75">
          <circle cx="170" cy="80" r="20" fill="#FFFFFF" />
          <circle cx="195" cy="73" r="27" fill="#FFFFFF" />
          <circle cx="220" cy="81" r="18" fill="#FFFFFF" />
          <rect x="160" y="80" width="72" height="17" rx="8" fill="#FFFFFF" />
        </g>

        <g opacity="0.75">
          <circle cx="980" cy="75" r="20" fill="#FFFFFF" />
          <circle cx="1005" cy="68" r="27" fill="#FFFFFF" />
          <circle cx="1030" cy="76" r="18" fill="#FFFFFF" />
          <rect x="970" y="75" width="72" height="17" rx="8" fill="#FFFFFF" />
        </g>

        {/* =====================================================
            LEFT FLANKING TREES
        ===================================================== */}
        <g>
          {/* Main Left Tree */}
          <rect x="250" y="165" width="8" height="65" rx="3" fill="#4D9574" />
          <path
            d="M254 182C236 170 228 155 228 138"
            stroke="#4D9574"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M254 174C270 163 278 150 278 135"
            stroke="#4D9574"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="250" cy="128" r="32" fill="#65C994" />
          <circle cx="225" cy="144" r="24" fill="#86D8AA" />
          <circle cx="276" cy="144" r="24" fill="#58BE89" />

          {/* Secondary Left Tree */}
          <rect x="355" y="178" width="6" height="50" rx="3" fill="#579A78" />
          <circle cx="358" cy="164" r="24" fill="#78D0A1" />
          <circle cx="340" cy="174" r="17" fill="#96DEB8" />
          <circle cx="375" cy="174" r="17" fill="#5FC38D" />
        </g>

        {/* =====================================================
            RIGHT FLANKING TREES
        ===================================================== */}
        <g>
          {/* Main Right Tree */}
          <rect x="942" y="165" width="8" height="65" rx="3" fill="#4D9574" />
          <path
            d="M946 182C928 170 920 155 920 138"
            stroke="#4D9574"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M946 174C962 163 970 150 970 135"
            stroke="#4D9574"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="942" cy="128" r="32" fill="#65C994" />
          <circle cx="917" cy="144" r="24" fill="#86D8AA" />
          <circle cx="968" cy="144" r="24" fill="#58BE89" />

          {/* Secondary Right Tree */}
          <rect x="839" y="178" width="6" height="50" rx="3" fill="#579A78" />
          <circle cx="842" cy="164" r="24" fill="#78D0A1" />
          <circle cx="824" cy="174" r="17" fill="#96DEB8" />
          <circle cx="859" cy="174" r="17" fill="#5FC38D" />
        </g>

        {/* =====================================================
            CENTRAL PRINT SHOP BUILDING
        ===================================================== */}
        <g filter="url(#branchShopShadow)">
          {/* Main Shop Body */}
          <rect
            x="440"
            y="142"
            width="320"
            height="122"
            rx="6"
            fill="#FAFFFD"
            stroke="#BDE8D5"
            strokeWidth="1.5"
          />

          {/* Shop Canopy Overhang */}
          <path
            d="M428 142H772L758 128H442L428 142Z"
            fill="#047857"
          />

          {/* Upper Green Brand Header Bar */}
          <rect
            x="475"
            y="108"
            width="250"
            height="38"
            rx="5"
            fill="url(#branchShopGradient)"
          />

          {/* Header Highlight */}
          <rect
            x="482"
            y="112"
            width="236"
            height="5"
            rx="2.5"
            fill="#34D399"
            opacity="0.5"
          />

          {/* Brand Name "PrintZ" */}
          <text
            x="600"
            y="134"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="22"
            fontWeight="800"
            fill="#FFFFFF"
            letterSpacing="0.03em"
          >
            PrintZ
          </text>

          {/* =================================================
              CENTRAL ENTRANCE DOOR
          ================================================= */}
          <rect
            x="572"
            y="172"
            width="56"
            height="92"
            rx="3"
            fill="#E2F7ED"
            stroke="#8ED6B7"
            strokeWidth="1.5"
          />

          {/* Door Glass Panel */}
          <rect
            x="580"
            y="180"
            width="40"
            height="44"
            rx="2"
            fill="url(#branchGlassGradient)"
            stroke="#8ED6B7"
            strokeWidth="1"
          />

          {/* Glass reflection */}
          <path
            d="M583 183L608 183L583 218Z"
            fill="#FFFFFF"
            opacity="0.45"
          />

          {/* Door Handles */}
          <circle cx="613" cy="235" r="2.5" fill="#047857" />

          {/* Door Divider */}
          <path d="M572 263H628" stroke="#047857" strokeWidth="2" />

          {/* =================================================
              LEFT DISPLAY WINDOW
          ================================================= */}
          <rect
            x="460"
            y="172"
            width="96"
            height="56"
            rx="3"
            fill="url(#branchGlassGradient)"
            stroke="#8ED6B7"
            strokeWidth="1.2"
          />

          {/* Window Glass Reflection */}
          <path
            d="M465 176L515 176L465 224Z"
            fill="#FFFFFF"
            opacity="0.45"
          />

          {/* Window Frame Separator */}
          <path d="M508 172V228" stroke="#8ED6B7" strokeWidth="1.2" />

          {/* Print Samples inside left window */}
          <rect x="468" y="206" width="16" height="14" rx="2" fill="#10B981" />
          <rect x="488" y="206" width="16" height="14" rx="2" fill="#34D399" />
          <rect x="514" y="206" width="16" height="14" rx="2" fill="#10B981" />
          <rect x="534" y="206" width="16" height="14" rx="2" fill="#059669" />

          {/* Small wall light / detail */}
          <circle cx="508" cy="158" r="4" fill="#10B981" opacity="0.8" />
          <rect x="488" y="156" width="40" height="4" rx="2" fill="#A7F3D0" />

          {/* =================================================
              RIGHT DISPLAY WINDOW
          ================================================= */}
          <rect
            x="644"
            y="172"
            width="96"
            height="56"
            rx="3"
            fill="url(#branchGlassGradient)"
            stroke="#8ED6B7"
            strokeWidth="1.2"
          />

          {/* Window Glass Reflection */}
          <path
            d="M649 176L699 176L649 224Z"
            fill="#FFFFFF"
            opacity="0.45"
          />

          {/* Window Frame Separator */}
          <path d="M692 172V228" stroke="#8ED6B7" strokeWidth="1.2" />

          {/* Print Samples inside right window */}
          <rect x="652" y="206" width="16" height="14" rx="2" fill="#10B981" />
          <rect x="672" y="206" width="16" height="14" rx="2" fill="#34D399" />
          <rect x="698" y="206" width="16" height="14" rx="2" fill="#10B981" />
          <rect x="718" y="206" width="16" height="14" rx="2" fill="#059669" />

          {/* Small wall light / detail */}
          <circle cx="692" cy="158" r="4" fill="#10B981" opacity="0.8" />
          <rect x="672" y="156" width="40" height="4" rx="2" fill="#A7F3D0" />
        </g>

        {/* =====================================================
            LARGE PROMINENT 3D-STYLED LOCATION PIN
        ===================================================== */}
        <g filter="url(#branchPinShadow)">
          {/* Ground pin shadow on canopy */}
          <ellipse
            cx="600"
            cy="106"
            rx="28"
            ry="7"
            fill="#047857"
            opacity="0.28"
          />

          {/* Main Pin Body */}
          <path
            d="
              M600 24
              C566 24 544 48 544 76
              C544 114 600 106 600 106
              C600 106 656 114 656 76
              C656 48 634 24 600 24Z
            "
            fill="url(#branchPinGradient)"
          />

          {/* Inner White Ring */}
          <circle cx="600" cy="74" r="18" fill="#FFFFFF" />

          {/* Inner Emerald Dot with Soft Inner Ring */}
          <circle cx="600" cy="74" r="10" fill="#10B981" />
          <circle cx="600" cy="74" r="5" fill="#FFFFFF" opacity="0.9" />
        </g>

        {/* =====================================================
            POTTED PLANTS BESIDE STORE ENTRANCE
        ===================================================== */}
        {/* Left Pot */}
        <g>
          <rect x="424" y="244" width="22" height="20" rx="3.5" fill="#DDEFE8" />
          <path
            d="M435 244C426 233 426 223 432 218"
            stroke="#059669"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M435 244C443 233 445 225 440 220"
            stroke="#10B981"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        {/* Right Pot */}
        <g>
          <rect x="754" y="244" width="22" height="20" rx="3.5" fill="#DDEFE8" />
          <path
            d="M765 244C756 233 756 223 762 218"
            stroke="#059669"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M765 244C773 233 775 225 770 220"
            stroke="#10B981"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        {/* =====================================================
            FRONT BUSHES
        ===================================================== */}
        <g>
          {/* Left Bushes */}
          <circle cx="280" cy="255" r="18" fill="#73CD9E" />
          <circle cx="304" cy="258" r="14" fill="#58C18B" />
          <circle cx="328" cy="255" r="17" fill="#8BD9AD" />

          {/* Right Bushes */}
          <circle cx="872" cy="255" r="18" fill="#73CD9E" />
          <circle cx="896" cy="258" r="14" fill="#58C18B" />
          <circle cx="920" cy="255" r="17" fill="#8BD9AD" />
        </g>

        {/* =====================================================
            GROUND LINE
        ===================================================== */}
        <path
          d="M65 269H1135"
          stroke="#55C99A"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.85"
        />

        <path
          d="M160 275H1040"
          stroke="#B8EAD5"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export const BranchManagementIllustration = BranchIllustration;
export default BranchIllustration;