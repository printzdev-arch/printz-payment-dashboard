import React from "react";

const PrintZSidebarIllustration = ({
  className = "",
  style = {},
  width = "100%",
  height = 190,
  ...rest
}) => {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        ...style,
      }}
      {...rest}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 360 210"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Background glow */}
          <radialGradient id="sidebar_glow">
            <stop offset="0%" stopColor="#0E8062" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#003A2D" stopOpacity="0" />
          </radialGradient>

          {/* PrintZ green */}
          <linearGradient
            id="sidebar_printzGreen"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="#20D393" />
            <stop offset="100%" stopColor="#04805E" />
          </linearGradient>

          {/* Building */}
          <linearGradient
            id="sidebar_building"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#D8F3E8" />
          </linearGradient>

          {/* Glass */}
          <linearGradient
            id="sidebar_glass"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="#9DE9CD" />
            <stop offset="100%" stopColor="#159B76" />
          </linearGradient>

          {/* Dashboard */}
          <linearGradient
            id="sidebar_screen"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#DDF7EC" />
          </linearGradient>

          {/* Shadow */}
          <filter
            id="sidebar_shadow"
            x="-30%"
            y="-30%"
            width="160%"
            height="180%"
          >
            <feDropShadow
              dx="0"
              dy="5"
              stdDeviation="6"
              floodColor="#000000"
              floodOpacity="0.28"
            />
          </filter>

          <filter
            id="sidebar_softShadow"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="4"
              floodColor="#000000"
              floodOpacity="0.25"
            />
          </filter>
        </defs>

        {/* =====================================================
            DARK SIDEBAR BACKGROUND
        ===================================================== */}

        <rect
          width="360"
          height="210"
          fill="#003B2D"
        />

        {/* Soft glow */}

        <ellipse
          cx="180"
          cy="140"
          rx="170"
          ry="95"
          fill="url(#sidebar_glow)"
        />

        {/* =====================================================
            BACKGROUND CITY
        ===================================================== */}

        <g opacity="0.15">
          <rect
            x="12"
            y="100"
            width="25"
            height="65"
            fill="#50C99A"
          />

          <rect
            x="43"
            y="82"
            width="30"
            height="83"
            fill="#50C99A"
          />

          <rect
            x="285"
            y="78"
            width="30"
            height="87"
            fill="#50C99A"
          />

          <rect
            x="322"
            y="100"
            width="25"
            height="65"
            fill="#50C99A"
          />
        </g>

        {/* =====================================================
            SMALL CLOUDS
        ===================================================== */}

        <g opacity="0.16">
          <circle
            cx="55"
            cy="62"
            r="16"
            fill="#B9F5DD"
          />

          <circle
            cx="75"
            cy="57"
            r="21"
            fill="#B9F5DD"
          />

          <circle
            cx="96"
            cy="64"
            r="15"
            fill="#B9F5DD"
          />

          <rect
            x="45"
            y="63"
            width="60"
            height="13"
            rx="7"
            fill="#B9F5DD"
          />
        </g>

        {/* =====================================================
            BRANCH LOCATION PINS
        ===================================================== */}

        <g filter="url(#sidebar_softShadow)">

          {/* Left pin */}

          <path
            d="
              M53 78
              C42 66 43 50 54 44
              C65 38 79 44 82 56
              C85 68 76 77 67 87
              Z
            "
            fill="url(#sidebar_printzGreen)"
          />

          <circle
            cx="62"
            cy="58"
            r="8"
            fill="#FFFFFF"
            opacity="0.95"
          />

          {/* Top pin */}

          <path
            d="
              M158 53
              C147 41 148 27 158 21
              C169 14 183 20 185 32
              C188 43 179 52 171 61
              Z
            "
            fill="url(#sidebar_printzGreen)"
          />

          <circle
            cx="167"
            cy="34"
            r="7"
            fill="#FFFFFF"
          />

          {/* Right pin */}

          <path
            d="
              M288 79
              C277 67 278 52 289 46
              C300 40 313 46 316 58
              C318 69 309 78 300 88
              Z
            "
            fill="url(#sidebar_printzGreen)"
          />

          <circle
            cx="297"
            cy="60"
            r="8"
            fill="#FFFFFF"
          />

        </g>

        {/* =====================================================
            BRANCH CONNECTION LINES
        ===================================================== */}

        <path
          d="M63 77C92 98 121 89 151 57"
          stroke="#25D49A"
          strokeWidth="2"
          strokeDasharray="5 5"
          opacity="0.7"
          fill="none"
        />

        <path
          d="M177 54C198 72 228 82 286 78"
          stroke="#25D49A"
          strokeWidth="2"
          strokeDasharray="5 5"
          opacity="0.7"
          fill="none"
        />

        {/* =====================================================
            PRINTZ SHOP
        ===================================================== */}

        <g filter="url(#sidebar_shadow)">

          {/* Main building */}

          <rect
            x="42"
            y="113"
            width="135"
            height="73"
            rx="5"
            fill="url(#sidebar_building)"
            stroke="#74CBAA"
            strokeWidth="1"
          />

          {/* Roof */}

          <path
            d="
              M34 113
              L52 94
              H167
              L185 113
              Z
            "
            fill="#E9FAF3"
            stroke="#8BD8BB"
            strokeWidth="1"
          />

          {/* Green shop sign */}

          <rect
            x="51"
            y="94"
            width="116"
            height="34"
            rx="6"
            fill="url(#sidebar_printzGreen)"
          />

          {/* Sign highlight */}

          <rect
            x="57"
            y="99"
            width="104"
            height="4"
            rx="2"
            fill="#6EE7B7"
            opacity="0.45"
          />

          {/* PrintZ */}

          <text
            x="109"
            y="118"
            textAnchor="middle"
            fontFamily="'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="19"
            fontWeight="700"
            fill="#FFFFFF"
          >
            PrintZ
          </text>

          {/* Left window */}

          <rect
            x="53"
            y="132"
            width="36"
            height="38"
            rx="3"
            fill="url(#sidebar_glass)"
          />

          {/* Window reflection */}

          <path
            d="M55 135L76 132L57 157Z"
            fill="#FFFFFF"
            opacity="0.25"
          />

          {/* Door */}

          <rect
            x="94"
            y="130"
            width="42"
            height="56"
            rx="3"
            fill="#A7E5D0"
            stroke="#68BFA0"
          />

          <path
            d="M115 130V186"
            stroke="#68BFA0"
            strokeWidth="1"
          />

          <circle
            cx="110"
            cy="157"
            r="2"
            fill="#047857"
          />

          <circle
            cx="120"
            cy="157"
            r="2"
            fill="#047857"
          />

          {/* Right window */}

          <rect
            x="141"
            y="132"
            width="27"
            height="38"
            rx="3"
            fill="url(#sidebar_glass)"
          />

          {/* Small shop plants */}

          <rect
            x="43"
            y="169"
            width="12"
            height="14"
            rx="3"
            fill="#D7EEE5"
          />

          <path
            d="M49 169C43 160 44 153 48 149"
            stroke="#10B981"
            strokeWidth="2"
            strokeLinecap="round"
          />

          <path
            d="M49 169C54 161 55 155 52 151"
            stroke="#34D399"
            strokeWidth="2"
            strokeLinecap="round"
          />

        </g>

        {/* =====================================================
            TREES
        ===================================================== */}

        <g>

          <rect
            x="24"
            y="143"
            width="5"
            height="45"
            rx="2"
            fill="#397B62"
          />

          <circle
            cx="27"
            cy="132"
            r="22"
            fill="#3EAC7B"
          />

          <circle
            cx="14"
            cy="142"
            r="15"
            fill="#5AC591"
          />

          <circle
            cx="41"
            cy="142"
            r="15"
            fill="#4AB987"
          />

        </g>

        <g>

          <rect
            x="184"
            y="143"
            width="5"
            height="45"
            rx="2"
            fill="#397B62"
          />

          <circle
            cx="187"
            cy="132"
            r="22"
            fill="#3EAC7B"
          />

          <circle
            cx="174"
            cy="142"
            r="15"
            fill="#5AC591"
          />

          <circle
            cx="201"
            cy="142"
            r="15"
            fill="#4AB987"
          />

        </g>

        {/* =====================================================
            DASHBOARD PANEL
        ===================================================== */}

        <g filter="url(#sidebar_shadow)">

          {/* Main panel */}

          <rect
            x="191"
            y="91"
            width="119"
            height="82"
            rx="10"
            fill="url(#sidebar_screen)"
            stroke="#57C59A"
            strokeWidth="1.5"
          />

          {/* Green header */}

          <rect
            x="191"
            y="91"
            width="119"
            height="21"
            rx="10"
            fill="url(#sidebar_printzGreen)"
          />

          <rect
            x="191"
            y="102"
            width="119"
            height="10"
            fill="url(#sidebar_printzGreen)"
          />

          {/* Header dots */}

          <circle
            cx="201"
            cy="101"
            r="3"
            fill="#FFFFFF"
            opacity="0.9"
          />

          <circle
            cx="211"
            cy="101"
            r="3"
            fill="#FFFFFF"
            opacity="0.65"
          />

          <circle
            cx="221"
            cy="101"
            r="3"
            fill="#FFFFFF"
            opacity="0.45"
          />

          {/* Profile icon */}

          <circle
            cx="209"
            cy="126"
            r="10"
            fill="#D8F7EA"
          />

          <circle
            cx="209"
            cy="123"
            r="3.5"
            fill="#059669"
          />

          <path
            d="
              M203 131
              C204 127 206 126 209 126
              C212 126 214 127 215 131
              Z
            "
            fill="#10B981"
          />

          {/* Text */}

          <rect
            x="227"
            y="120"
            width="48"
            height="5"
            rx="2.5"
            fill="#9BDDC4"
          />

          <rect
            x="227"
            y="130"
            width="35"
            height="4"
            rx="2"
            fill="#D0EEE2"
          />

          {/* Bar chart */}

          <rect
            x="205"
            y="153"
            width="8"
            height="12"
            rx="2"
            fill="#A8E5D0"
          />

          <rect
            x="218"
            y="147"
            width="8"
            height="18"
            rx="2"
            fill="#5BD0A1"
          />

          <rect
            x="231"
            y="140"
            width="8"
            height="25"
            rx="2"
            fill="#10B981"
          />

          <rect
            x="244"
            y="134"
            width="8"
            height="31"
            rx="2"
            fill="#059669"
          />

          {/* Growth line */}

          <path
            d="
              M202 150
              L217 145
              L230 148
              L246 135
              L267 128
            "
            stroke="#10B981"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />

          {/* Mini donut */}

          <circle
            cx="283"
            cy="145"
            r="18"
            fill="#DFF7ED"
          />

          <path
            d="
              M283 127
              A18 18 0 0 1
              299 154
              L283 145
              Z
            "
            fill="#059669"
          />

          <path
            d="
              M299 154
              A18 18 0 0 1
              267 154
              L283 145
              Z
            "
            fill="#34D399"
          />

          <circle
            cx="283"
            cy="145"
            r="7"
            fill="#FFFFFF"
          />

        </g>

        {/* =====================================================
            PRINTER
        ===================================================== */}

        <g filter="url(#sidebar_shadow)">

          {/* Paper */}

          <rect
            x="210"
            y="162"
            width="72"
            height="37"
            rx="3"
            fill="#FFFFFF"
            stroke="#CDE8DD"
          />

          <rect
            x="219"
            y="170"
            width="43"
            height="4"
            rx="2"
            fill="#B5E6D3"
          />

          <rect
            x="219"
            y="179"
            width="32"
            height="4"
            rx="2"
            fill="#D6EFE5"
          />

          <rect
            x="219"
            y="188"
            width="39"
            height="4"
            rx="2"
            fill="#D6EFE5"
          />

          {/* Printer body */}

          <rect
            x="240"
            y="154"
            width="82"
            height="54"
            rx="9"
            fill="url(#sidebar_building)"
            stroke="#80CBB0"
            strokeWidth="1.5"
          />

          {/* Printer top */}

          <rect
            x="253"
            y="146"
            width="57"
            height="22"
            rx="4"
            fill="#264B4A"
          />

          {/* Display */}

          <rect
            x="260"
            y="151"
            width="40"
            height="10"
            rx="2"
            fill="#D6F8EB"
          />

          {/* Buttons */}

          <circle
            cx="268"
            cy="180"
            r="4"
            fill="#10B981"
          />

          <circle
            cx="281"
            cy="180"
            r="4"
            fill="#34D399"
          />

          <circle
            cx="294"
            cy="180"
            r="4"
            fill="#60A5FA"
          />

          {/* Output tray */}

          <rect
            x="256"
            y="192"
            width="50"
            height="10"
            rx="2"
            fill="#C7E7DB"
          />

          {/* Printed page */}

          <rect
            x="264"
            y="193"
            width="34"
            height="23"
            rx="2"
            fill="#FFFFFF"
            stroke="#D2E9E0"
          />

          <circle
            cx="272"
            cy="200"
            r="3"
            fill="#FACC15"
          />

          <path
            d="M267 211L275 205L282 209L290 202L296 213H267Z"
            fill="#61CFA2"
          />

        </g>

        {/* =====================================================
            PLUS BUTTON
        ===================================================== */}

        <g filter="url(#sidebar_softShadow)">

          <circle
            cx="305"
            cy="124"
            r="21"
            fill="url(#sidebar_printzGreen)"
          />

          <path
            d="M297 124H313"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <path
            d="M305 116V132"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
          />

        </g>

        {/* =====================================================
            INK CARTRIDGES
        ===================================================== */}

        <g>

          <rect
            x="309"
            y="180"
            width="9"
            height="25"
            rx="2"
            fill="#06B6D4"
          />

          <rect
            x="320"
            y="180"
            width="9"
            height="25"
            rx="2"
            fill="#EC4899"
          />

          <rect
            x="331"
            y="180"
            width="9"
            height="25"
            rx="2"
            fill="#FACC15"
          />

          <rect
            x="342"
            y="180"
            width="9"
            height="25"
            rx="2"
            fill="#334155"
          />

        </g>

        {/* =====================================================
            FRONT BUSHES
        ===================================================== */}

        <g>

          <circle
            cx="55"
            cy="186"
            r="17"
            fill="#3DAE7D"
          />

          <circle
            cx="76"
            cy="190"
            r="13"
            fill="#4FC08B"
          />

          <circle
            cx="180"
            cy="190"
            r="16"
            fill="#3DAE7D"
          />

          <circle
            cx="198"
            cy="192"
            r="13"
            fill="#4FC08B"
          />

        </g>

        {/* =====================================================
            GROUND
        ===================================================== */}

        <path
          d="M20 200H345"
          stroke="#20B486"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.65"
        />

      </svg>
    </div>
  );
};

export default PrintZSidebarIllustration;
