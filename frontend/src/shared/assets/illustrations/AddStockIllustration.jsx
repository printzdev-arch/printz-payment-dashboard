import React from "react";

const AddStockIllustration = ({
  className = "",
  style = {},
  height = 88,
  width = 360,
  ...rest
}) => {
  const containerHeight =
    typeof height === "number" ? `${height}px` : height;
  const containerWidth =
    typeof width === "number" ? `${width}px` : width;

  return (
    <div
      className={`add-stock-illustration ${className}`.trim()}
      style={{
        width: containerWidth,
        height: containerHeight,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
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
          {/* =====================================================
              BACKGROUND GRADIENT
          ===================================================== */}
          <linearGradient
            id="stockBg"
            x1="0"
            y1="0"
            x2="1200"
            y2="300"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#EDFFF8" />
            <stop offset="50%" stopColor="#F4FFFB" />
            <stop offset="100%" stopColor="#E5FAF0" />
          </linearGradient>

          {/* =====================================================
              EMERALD GREEN GRADIENTS
          ===================================================== */}
          <linearGradient id="stockGreen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          <linearGradient id="stockGreenLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* =====================================================
              PRINTER / TECH BODY GRADIENTS
          ===================================================== */}
          <linearGradient id="stockBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#EAF7F2" />
          </linearGradient>

          <linearGradient id="stockDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A3842" />
            <stop offset="100%" stopColor="#192329" />
          </linearGradient>

          <linearGradient id="stockGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#DDFBF0" />
            <stop offset="100%" stopColor="#A7E5CE" />
          </linearGradient>

          {/* =====================================================
              CMYK TONER GRADIENTS
          ===================================================== */}
          <linearGradient id="stockCyan" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          <linearGradient id="stockMagenta" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F472B6" />
            <stop offset="100%" stopColor="#DB2777" />
          </linearGradient>

          <linearGradient id="stockYellow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#EAB308" />
          </linearGradient>

          {/* =====================================================
              KRAFT BOX GRADIENTS
          ===================================================== */}
          <linearGradient id="stockBoxKraft" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#EED2A4" />
            <stop offset="100%" stopColor="#D4A767" />
          </linearGradient>

          <linearGradient id="stockBoxTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F7DFB8" />
            <stop offset="100%" stopColor="#E6BC7E" />
          </linearGradient>

          {/* =====================================================
              SHADOW FILTERS
          ===================================================== */}
          <filter id="stockShadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow
              dx="0"
              dy="6"
              stdDeviation="7"
              floodColor="#047857"
              floodOpacity="0.12"
            />
          </filter>

          <filter id="stockSmallShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="4"
              floodColor="#047857"
              floodOpacity="0.13"
            />
          </filter>
        </defs>

        {/* =====================================================
            BACKGROUND
        ===================================================== */}
        <rect width="1200" height="300" rx="14" fill="url(#stockBg)" />

        {/* Soft background ambient circles */}
        <circle cx="140" cy="155" r="130" fill="#D7F7E8" opacity="0.5" />
        <circle cx="480" cy="125" r="150" fill="#D1F5E4" opacity="0.45" />
        <circle cx="810" cy="125" r="175" fill="#D7F7E9" opacity="0.45" />
        <circle cx="1080" cy="165" r="140" fill="#DCF9ED" opacity="0.5" />

        {/* Background warehouse shelf silhouettes */}
        <g opacity="0.2">
          <rect x="55" y="115" width="55" height="105" rx="3" fill="#75D0A5" />
          <rect x="125" y="85" width="65" height="135" rx="3" fill="#8AD9B4" />
          <rect x="205" y="125" width="58" height="95" rx="3" fill="#65C99A" />
          <rect x="280" y="70" width="65" height="150" rx="3" fill="#8AD9B4" />
          <rect x="870" y="75" width="65" height="145" rx="3" fill="#8AD9B4" />
          <rect x="950" y="115" width="60" height="105" rx="3" fill="#65C99A" />
          <rect x="1030" y="70" width="70" height="150" rx="3" fill="#8AD9B4" />
        </g>

        {/* Soft floating clouds */}
        <g opacity="0.7">
          <circle cx="185" cy="78" r="20" fill="#FFFFFF" />
          <circle cx="210" cy="72" r="28" fill="#FFFFFF" />
          <circle cx="240" cy="80" r="18" fill="#FFFFFF" />
          <rect x="175" y="78" width="75" height="18" rx="9" fill="#FFFFFF" />
        </g>

        <g opacity="0.7">
          <circle cx="1005" cy="72" r="20" fill="#FFFFFF" />
          <circle cx="1030" cy="66" r="26" fill="#FFFFFF" />
          <circle cx="1055" cy="73" r="18" fill="#FFFFFF" />
          <rect x="995" y="72" width="70" height="17" rx="8" fill="#FFFFFF" />
        </g>

        {/* Floor Horizon */}
        <ellipse cx="600" cy="265" rx="560" ry="18" fill="#D3F0E2" opacity="0.85" />

        {/* Decorative foliage left */}
        <g>
          <path
            d="M95 255C82 233 85 212 97 197"
            stroke="#277D5B"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M96 247C110 229 115 212 109 196"
            stroke="#15966C"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <ellipse cx="97" cy="183" rx="16" ry="26" transform="rotate(-25 97 183)" fill="#52C995" />
          <ellipse cx="113" cy="187" rx="15" ry="26" transform="rotate(28 113 187)" fill="#35B87E" />
          <ellipse cx="74" cy="197" rx="13" ry="22" transform="rotate(-35 74 197)" fill="#7AD9AC" />
        </g>

        {/* Decorative foliage right */}
        <g>
          <path
            d="M1105 256C1093 234 1097 212 1111 197"
            stroke="#277D5B"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M1106 248C1122 229 1126 213 1121 197"
            stroke="#15966C"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <ellipse cx="1110" cy="183" rx="16" ry="26" transform="rotate(-24 1110 183)" fill="#52C995" />
          <ellipse cx="1126" cy="187" rx="15" ry="26" transform="rotate(28 1126 187)" fill="#35B87E" />
          <ellipse cx="1086" cy="198" rx="13" ry="22" transform="rotate(-35 1086 198)" fill="#7AD9AC" />
        </g>

        {/* =====================================================
            SECTION 1: STORAGE SHELVING SYSTEM (x: 130 to 360)
        ===================================================== */}
        <g filter="url(#stockSmallShadow)">
          {/* Main Shelf Rack Uprights */}
          <rect x="140" y="80" width="8" height="175" rx="3" fill="#047857" />
          <rect x="350" y="80" width="8" height="175" rx="3" fill="#047857" />

          {/* Cross Shelves */}
          <rect x="136" y="88" width="228" height="7" rx="3" fill="#10B981" />
          <rect x="136" y="142" width="228" height="7" rx="3" fill="#10B981" />
          <rect x="136" y="196" width="228" height="7" rx="3" fill="#10B981" />
          <rect x="136" y="248" width="228" height="7" rx="3" fill="#10B981" />

          {/* Diagonal Bracing */}
          <line x1="144" y1="92" x2="354" y2="145" stroke="#A7F3D0" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="354" y1="145" x2="144" y2="198" stroke="#A7F3D0" strokeWidth="2" strokeDasharray="4 4" />

          {/* SHELF 1 (TOP): CMYK Toner Cartridges */}
          {/* Cyan */}
          <rect x="156" y="99" width="38" height="40" rx="5" fill="url(#stockCyan)" />
          <rect x="162" y="103" width="26" height="6" rx="2" fill="#E0F2FE" opacity="0.8" />
          <circle cx="175" cy="120" r="7" fill="#FFFFFF" opacity="0.9" />
          <text x="175" y="123" textAnchor="middle" fontSize="8" fontWeight="800" fill="#0284C7">C</text>
          <rect x="165" y="132" width="20" height="3" rx="1" fill="#BAE6FD" />

          {/* Magenta */}
          <rect x="204" y="99" width="38" height="40" rx="5" fill="url(#stockMagenta)" />
          <rect x="210" y="103" width="26" height="6" rx="2" fill="#FCE7F3" opacity="0.8" />
          <circle cx="223" cy="120" r="7" fill="#FFFFFF" opacity="0.9" />
          <text x="223" y="123" textAnchor="middle" fontSize="8" fontWeight="800" fill="#BE185D">M</text>
          <rect x="213" y="132" width="20" height="3" rx="1" fill="#FBCFE8" />

          {/* Yellow */}
          <rect x="252" y="99" width="38" height="40" rx="5" fill="url(#stockYellow)" />
          <rect x="258" y="103" width="26" height="6" rx="2" fill="#FEF9C3" opacity="0.8" />
          <circle cx="271" cy="120" r="7" fill="#FFFFFF" opacity="0.9" />
          <text x="271" y="123" textAnchor="middle" fontSize="8" fontWeight="800" fill="#B45309">Y</text>
          <rect x="261" y="132" width="20" height="3" rx="1" fill="#FDE68A" />

          {/* Black (Key) */}
          <rect x="300" y="99" width="38" height="40" rx="5" fill="url(#stockDark)" />
          <rect x="306" y="103" width="26" height="6" rx="2" fill="#94A3B8" opacity="0.8" />
          <circle cx="319" cy="120" r="7" fill="#FFFFFF" opacity="0.9" />
          <text x="319" y="123" textAnchor="middle" fontSize="8" fontWeight="800" fill="#1E293B">K</text>
          <rect x="309" y="132" width="20" height="3" rx="1" fill="#64748B" />

          {/* SHELF 2 (MID): Paper Ream Stacks */}
          {/* A4 Box 1 */}
          <rect x="156" y="154" width="76" height="39" rx="4" fill="#FFFFFF" stroke="#A7F3D0" strokeWidth="1.5" />
          <rect x="156" y="165" width="76" height="12" fill="#D1FAE5" />
          <text x="194" y="174" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#047857">A4 • 80g</text>
          <circle cx="165" cy="183" r="3" fill="#10B981" />
          <rect x="172" y="181" width="35" height="4" rx="2" fill="#D1FAE5" />

          {/* A3 Box */}
          <rect x="242" y="152" width="96" height="41" rx="4" fill="#FFFFFF" stroke="#A7F3D0" strokeWidth="1.5" />
          <rect x="242" y="164" width="96" height="13" fill="#10B981" />
          <text x="290" y="174" textAnchor="middle" fontSize="10" fontWeight="800" fill="#FFFFFF">A3 • 100g GLOSS</text>
          <rect x="252" y="182" width="45" height="4" rx="2" fill="#D1FAE5" />
          <rect x="304" y="182" width="24" height="4" rx="2" fill="#A7F3D0" />

          {/* SHELF 3 (BOTTOM): Bottled Ink Tanks */}
          {/* Black Ink Bottle */}
          <rect x="162" y="209" width="32" height="36" rx="5" fill="#1E293B" />
          <rect x="171" y="204" width="14" height="6" rx="2" fill="#0F172A" />
          <circle cx="178" cy="222" r="5" fill="#475569" />
          <line x1="168" y1="234" x2="188" y2="234" stroke="#64748B" strokeWidth="2" strokeDasharray="2 2" />

          {/* Cyan Ink Bottle */}
          <rect x="206" y="209" width="32" height="36" rx="5" fill="#0284C7" />
          <rect x="215" y="204" width="14" height="6" rx="2" fill="#0369A1" />
          <circle cx="222" cy="222" r="5" fill="#7DD3FC" />
          <line x1="212" y1="234" x2="232" y2="234" stroke="#BAE6FD" strokeWidth="2" strokeDasharray="2 2" />

          {/* Magenta Ink Bottle */}
          <rect x="250" y="209" width="32" height="36" rx="5" fill="#DB2777" />
          <rect x="259" y="204" width="14" height="6" rx="2" fill="#BE185D" />
          <circle cx="266" cy="222" r="5" fill="#F9A8D4" />
          <line x1="256" y1="234" x2="276" y2="234" stroke="#FBCFE8" strokeWidth="2" strokeDasharray="2 2" />

          {/* Yellow Ink Bottle */}
          <rect x="294" y="209" width="32" height="36" rx="5" fill="#EAB308" />
          <rect x="303" y="204" width="14" height="6" rx="2" fill="#CA8A04" />
          <circle cx="310" cy="222" r="5" fill="#FEF08A" />
          <line x1="300" y1="234" x2="320" y2="234" stroke="#FEF9C3" strokeWidth="2" strokeDasharray="2 2" />
        </g>

        {/* Floating Shelf Badge Top Left */}
        <g filter="url(#stockSmallShadow)">
          <rect x="150" y="44" width="148" height="28" rx="14" fill="#FFFFFF" stroke="#A7F3D0" strokeWidth="1.5" />
          <circle cx="166" cy="58" r="5" fill="#10B981" />
          <circle cx="166" cy="58" r="9" stroke="#10B981" strokeWidth="1.5" opacity="0.35" />
          <text x="180" y="62" fontSize="10.5" fontWeight="700" fill="#047857">SUPPLIES READY</text>
        </g>

        {/* =====================================================
            SECTION 2: INVENTORY SPECIALIST (x: 385 to 515)
        ===================================================== */}
        <g filter="url(#stockSmallShadow)">
          {/* Shadow under feet */}
          <ellipse cx="448" cy="257" rx="34" ry="7" fill="#047857" opacity="0.18" />

          {/* Legs / Dark Trousers */}
          <path d="M434 200 L430 252 L442 252 L445 204 Z" fill="#1E293B" />
          <path d="M451 204 L454 252 L466 252 L462 200 Z" fill="#1E293B" />
          {/* Shoes */}
          <rect x="424" y="248" width="20" height="7" rx="3" fill="#0F172A" />
          <rect x="452" y="248" width="20" height="7" rx="3" fill="#0F172A" />

          {/* Torso / Emerald Work Vest */}
          <path
            d="M428 142 C438 132 458 132 468 142 L472 206 C472 208 424 208 424 206 Z"
            fill="url(#stockGreen)"
          />
          {/* Inner Shirt Collar */}
          <path d="M441 136 L448 152 L455 136 Z" fill="#FFFFFF" />
          <line x1="448" y1="152" x2="448" y2="202" stroke="#047857" strokeWidth="2" />

          {/* Lanyard & ID Badge */}
          <path d="M444 142 L448 162 L452 142" stroke="#34D399" strokeWidth="2" fill="none" />
          <rect x="444" y="162" width="9" height="12" rx="2" fill="#FFFFFF" stroke="#047857" strokeWidth="1" />
          <rect x="446" y="164" width="5" height="3" rx="1" fill="#10B981" />

          {/* Head & Neck */}
          <rect x="444" y="126" width="8" height="12" rx="3" fill="#FBCFE8" />
          <circle cx="448" cy="116" r="16" fill="#FBCFE8" />

          {/* Styled Modern Hair */}
          <path
            d="M432 114 C432 99 442 94 456 96 C466 98 468 107 465 116 C460 108 450 106 442 108 C436 109 434 112 432 114 Z"
            fill="#1E293B"
          />

          {/* Friendly Face details */}
          <circle cx="453" cy="115" r="2" fill="#1E293B" />
          <circle cx="461" cy="115" r="2" fill="#1E293B" />
          <path d="M455 122 C458 125 462 124 464 121" stroke="#BE185D" strokeWidth="1.5" strokeLinecap="round" />

          {/* Left Arm holding Digital Tablet */}
          <path
            d="M430 148 C418 160 410 182 422 195"
            stroke="#10B981"
            strokeWidth="11"
            strokeLinecap="round"
          />
          {/* Modern Slim Tablet */}
          <g transform="rotate(-12 405 180)">
            <rect x="390" y="165" width="46" height="32" rx="4" fill="#0F172A" />
            <rect x="393" y="168" width="40" height="26" rx="2" fill="#ECFDF5" />
            <path d="M398 178 L401 181 L407 174" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
            <text x="410" y="180" fontSize="7" fontWeight="800" fill="#047857">+500</text>
            <rect x="398" y="186" width="30" height="3" rx="1.5" fill="#A7F3D0" />
          </g>

          {/* Right Arm holding Barcode Scanner */}
          <path
            d="M466 148 C478 158 488 172 498 170"
            stroke="#10B981"
            strokeWidth="11"
            strokeLinecap="round"
          />
          {/* Wireless Scanner */}
          <rect x="495" y="164" width="16" height="11" rx="3" fill="#1E293B" />
          <rect x="502" y="172" width="7" height="12" rx="2" fill="#334155" />
          <circle cx="509" cy="169" r="2.5" fill="#10B981" />
          {/* Laser targeting line */}
          <line
            x1="511"
            y1="169"
            x2="565"
            y2="175"
            stroke="#10B981"
            strokeWidth="2"
            strokeDasharray="4 3"
            opacity="0.85"
          />
        </g>

        {/* =====================================================
            SECTION 3: ADVANCED PRODUCTION PRINTER (x: 540 to 820)
        ===================================================== */}
        <g filter="url(#stockShadow)">
          {/* Base Unit Shadow */}
          <ellipse cx="680" cy="256" rx="130" ry="12" fill="#047857" opacity="0.16" />

          {/* Printer Main Lower Chassis */}
          <rect
            x="570"
            y="142"
            width="220"
            height="110"
            rx="12"
            fill="url(#stockBody)"
            stroke="#A7F3D0"
            strokeWidth="1.5"
          />

          {/* Contrast Dark Top & Scanner Section */}
          <rect x="560" y="105" width="240" height="42" rx="9" fill="url(#stockDark)" />
          <rect x="575" y="112" width="210" height="26" rx="6" fill="#384954" />

          {/* Scanner Glass Bed Beam */}
          <rect x="585" y="117" width="190" height="16" rx="4" fill="url(#stockGlass)" opacity="0.65" />
          <line x1="620" y1="117" x2="620" y2="133" stroke="#10B981" strokeWidth="2.5" />

          {/* Automatic Document Feeder (ADF) Top Lid */}
          <path
            d="M580 105 L600 82 L760 82 L780 105 Z"
            fill="#344652"
            stroke="#475569"
            strokeWidth="1"
          />
          <rect x="620" y="78" width="120" height="6" rx="3" fill="#10B981" />

          {/* Interactive Touchscreen Display Panel */}
          <g filter="url(#stockSmallShadow)">
            <rect
              x="765"
              y="94"
              width="68"
              height="48"
              rx="7"
              fill="#0F172A"
              stroke="#10B981"
              strokeWidth="2"
            />
            {/* Screen Content */}
            <rect x="769" y="98" width="60" height="40" rx="4" fill="#064E3B" />
            <circle cx="778" cy="106" r="3" fill="#34D399" />
            <text x="785" y="109" fontSize="7" fontWeight="800" fill="#34D399">READY</text>
            {/* Micro Graph on screen */}
            <rect x="774" y="116" width="50" height="3" rx="1.5" fill="#047857" />
            <rect x="774" y="116" width="38" height="3" rx="1.5" fill="#34D399" />
            <rect x="774" y="123" width="22" height="4" rx="2" fill="#10B981" />
            <rect x="800" y="123" width="24" height="4" rx="2" fill="#6EE7B7" />
            <text x="799" y="134" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#D1FAE5">STOCK 100%</text>
          </g>

          {/* Central Output Paper Tray with Dispensing Print Sheet */}
          <rect x="600" y="152" width="160" height="24" rx="5" fill="#1E293B" />
          {/* Freshly Printed Test Sheet */}
          <path
            d="M615 158 L615 196 L745 196 L745 158 Z"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="1"
          />
          {/* CMYK Test Color Swatches on Sheet */}
          <rect x="628" y="166" width="20" height="7" rx="1" fill="#0284C7" />
          <rect x="653" y="166" width="20" height="7" rx="1" fill="#DB2777" />
          <rect x="678" y="166" width="20" height="7" rx="1" fill="#EAB308" />
          <rect x="703" y="166" width="20" height="7" rx="1" fill="#1E293B" />
          {/* Text lines on printed paper */}
          <rect x="628" y="179" width="95" height="3" rx="1.5" fill="#94A3B8" />
          <rect x="628" y="186" width="65" height="3" rx="1.5" fill="#CBD5E1" />

          {/* Lower Paper Cassette Trays */}
          {/* Cassette 1 */}
          <rect x="585" y="206" width="190" height="19" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
          <rect x="655" y="212" width="50" height="6" rx="3" fill="#E2E8F0" />
          <circle cx="598" cy="215" r="3" fill="#10B981" />
          <text x="606" y="218" fontSize="6.5" fontWeight="700" fill="#64748B">TRAY 1 (A4)</text>

          {/* Cassette 2 */}
          <rect x="585" y="228" width="190" height="19" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
          <rect x="655" y="234" width="50" height="6" rx="3" fill="#E2E8F0" />
          <circle cx="598" cy="237" r="3" fill="#10B981" />
          <text x="606" y="240" fontSize="6.5" fontWeight="700" fill="#64748B">TRAY 2 (A3)</text>

          {/* Power / Status Indicator LEDs */}
          <circle cx="585" cy="125" r="4.5" fill="#10B981" />
          <circle cx="585" cy="125" r="9" stroke="#34D399" strokeWidth="1.5" opacity="0.4" />
        </g>

        {/* =====================================================
            SECTION 4: KRAFT BOXES & INVENTORY TRACKING (x: 840 to 1100)
        ===================================================== */}
        <g filter="url(#stockShadow)">
          {/* Ground shadow for boxes */}
          <ellipse cx="945" cy="256" rx="85" ry="10" fill="#047857" opacity="0.16" />

          {/* Lower Main Storage Box */}
          <rect
            x="860"
            y="172"
            width="145"
            height="80"
            rx="8"
            fill="url(#stockBoxKraft)"
            stroke="#B8863A"
            strokeWidth="1.5"
          />
          {/* Box Seam & Tape */}
          <rect x="860" y="196" width="145" height="12" fill="#D99B43" opacity="0.85" />
          <line x1="932" y1="172" x2="932" y2="252" stroke="#B8863A" strokeWidth="1.5" />

          {/* Shipping Label on Main Box */}
          <rect x="874" y="214" width="52" height="32" rx="3" fill="#FFFFFF" />
          {/* Barcode lines */}
          <rect x="880" y="219" width="3" height="16" fill="#1E293B" />
          <rect x="885" y="219" width="2" height="16" fill="#1E293B" />
          <rect x="889" y="219" width="4" height="16" fill="#1E293B" />
          <rect x="895" y="219" width="2" height="16" fill="#1E293B" />
          <rect x="899" y="219" width="5" height="16" fill="#1E293B" />
          <rect x="906" y="219" width="3" height="16" fill="#1E293B" />
          <rect x="912" y="219" width="2" height="16" fill="#1E293B" />
          <text x="880" y="241" fontSize="5.5" fontWeight="700" fill="#64748B">#PRZ-8902</text>

          {/* Handling Icons (This Way Up + Fragile) */}
          <g fill="#8C5C1E" opacity="0.8">
            <path d="M960 220 L965 214 L970 220 H967 V228 H963 V220 Z" />
            <path d="M974 220 L979 214 L984 220 H981 V228 H977 V220 Z" />
          </g>

          {/* Smaller Top Box Stacked */}
          <rect
            x="880"
            y="126"
            width="110"
            height="50"
            rx="6"
            fill="url(#stockBoxTop)"
            stroke="#B8863A"
            strokeWidth="1.5"
          />
          <rect x="880" y="142" width="110" height="9" fill="#D99B43" opacity="0.85" />
          {/* PrintZ Logo stamp on box */}
          <circle cx="910" cy="155" r="9" fill="#10B981" />
          <text x="910" y="159" textAnchor="middle" fontSize="9" fontWeight="900" fill="#FFFFFF">P</text>
          <text x="945" y="158" fontSize="8.5" fontWeight="800" fill="#8C5C1E">TONER KIT</text>
        </g>

        {/* Floating Modern Glassmorphic Badge Top Right (SKU Barcode) */}
        <g filter="url(#stockShadow)">
          <rect
            x="990"
            y="42"
            width="170"
            height="70"
            rx="14"
            fill="#FFFFFF"
            stroke="#A7F3D0"
            strokeWidth="2"
          />
          {/* Header pill */}
          <rect x="990" y="42" width="170" height="20" rx="10" fill="#10B981" />
          <circle cx="1006" cy="52" r="3.5" fill="#FFFFFF" />
          <circle cx="1016" cy="52" r="3.5" fill="#A7F3D0" />
          <text x="1075" y="56" textAnchor="middle" fontSize="9" fontWeight="800" fill="#FFFFFF" letterSpacing="0.5">
            STOCK VERIFIED ✓
          </text>

          {/* Barcode inside Card */}
          <g transform="translate(1004, 70)">
            <rect x="0" y="0" width="3" height="22" fill="#047857" />
            <rect x="6" y="0" width="2" height="22" fill="#047857" />
            <rect x="11" y="0" width="5" height="22" fill="#047857" />
            <rect x="19" y="0" width="2" height="22" fill="#047857" />
            <rect x="24" y="0" width="4" height="22" fill="#047857" />
            <rect x="31" y="0" width="2" height="22" fill="#047857" />
            <rect x="36" y="0" width="6" height="22" fill="#047857" />
            <rect x="45" y="0" width="3" height="22" fill="#047857" />
            {/* Green glowing laser scanline */}
            <line x1="-5" y1="11" x2="55" y2="11" stroke="#10B981" strokeWidth="2" />
          </g>

          <text x="1068" y="80" fontSize="10.5" fontWeight="800" fill="#0F172A">
            PRZ-STOCK
          </text>
          <text x="1068" y="93" fontSize="8.5" fontWeight="600" fill="#10B981">
            + Real-time Synced
          </text>
        </g>

        {/* Floating Stock Added Pill Badge */}
        <g filter="url(#stockSmallShadow)">
          <rect
            x="1005"
            y="126"
            width="135"
            height="32"
            rx="16"
            fill="#FFFFFF"
            stroke="#6EE7B7"
            strokeWidth="1.5"
          />
          {/* Plus Circle */}
          <circle cx="1022" cy="142" r="10" fill="#10B981" />
          <path d="M1022 137 V147 M1017 142 H1027" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <text x="1040" y="146" fontSize="10" fontWeight="700" fill="#047857">
            + Add Stock
          </text>
        </g>

        {/* Connection dotted flow lines */}
        <path
          d="M340 120 C 370 95, 410 95, 435 110"
          stroke="#10B981"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M515 165 C 540 145, 560 145, 575 155"
          stroke="#10B981"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M800 135 C 830 115, 850 115, 875 130"
          stroke="#10B981"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
          opacity="0.6"
        />
      </svg>
    </div>
  );
};

export default AddStockIllustration;
