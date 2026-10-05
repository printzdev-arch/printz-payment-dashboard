import React from "react";

const AdminDashboardIllustration = ({
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
      className={className}
      style={{
        width: containerWidth,
        height: containerHeight,
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
        viewBox="0 0 1400 420"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Background */}
          <linearGradient id="adminDash_bg" x1="0" y1="0" x2="1400" y2="420">
            <stop offset="0%" stopColor="#E9FFF7" />
            <stop offset="50%" stopColor="#F5FFFB" />
            <stop offset="100%" stopColor="#E4FAF1" />
          </linearGradient>

          {/* PrintZ Green */}
          <linearGradient id="adminDash_green" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#20D393" />
            <stop offset="100%" stopColor="#04805F" />
          </linearGradient>

          <linearGradient id="adminDash_greenDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* Dashboard */}
          <linearGradient id="adminDash_screen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F3FCF8" />
          </linearGradient>

          {/* Glass */}
          <linearGradient id="adminDash_glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#DFFFF2" />
            <stop offset="100%" stopColor="#9FE4C9" />
          </linearGradient>

          {/* Shadow */}
          <filter
            id="adminDash_shadow"
            x="-30%"
            y="-30%"
            width="160%"
            height="180%"
          >
            <feDropShadow
              dx="0"
              dy="8"
              stdDeviation="9"
              floodColor="#047857"
              floodOpacity="0.15"
            />
          </filter>

          <filter
            id="adminDash_smallShadow"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="5"
              floodColor="#047857"
              floodOpacity="0.12"
            />
          </filter>
        </defs>

        {/* =====================================================
            BACKGROUND
        ===================================================== */}

        <rect
          width="1400"
          height="420"
          fill="url(#adminDash_bg)"
        />

        {/* Soft background circles */}

        <circle
          cx="150"
          cy="190"
          r="170"
          fill="#D8F8EA"
          opacity="0.55"
        />

        <circle
          cx="510"
          cy="180"
          r="210"
          fill="#D1F5E4"
          opacity="0.4"
        />

        <circle
          cx="940"
          cy="170"
          r="220"
          fill="#D9F8EA"
          opacity="0.4"
        />

        <circle
          cx="1280"
          cy="190"
          r="180"
          fill="#DFF9EE"
          opacity="0.55"
        />

        {/* =====================================================
            CITY BACKGROUND
        ===================================================== */}

        <g opacity="0.22">
          <rect
            x="40"
            y="180"
            width="75"
            height="145"
            rx="4"
            fill="#74CFA5"
          />

          <rect
            x="130"
            y="125"
            width="85"
            height="200"
            rx="4"
            fill="#82D6AF"
          />

          <rect
            x="235"
            y="175"
            width="75"
            height="150"
            rx="4"
            fill="#69C99C"
          />

          <rect
            x="330"
            y="100"
            width="90"
            height="225"
            rx="4"
            fill="#8ADAB6"
          />

          <rect
            x="1040"
            y="110"
            width="80"
            height="215"
            rx="4"
            fill="#8ADAB6"
          />

          <rect
            x="1140"
            y="160"
            width="75"
            height="165"
            rx="4"
            fill="#69C99C"
          />

          <rect
            x="1230"
            y="105"
            width="90"
            height="220"
            rx="4"
            fill="#8ADAB6"
          />

          <rect
            x="1335"
            y="170"
            width="65"
            height="155"
            rx="4"
            fill="#69C99C"
          />
        </g>

        {/* =====================================================
            CLOUDS
        ===================================================== */}

        <g opacity="0.75">
          <circle cx="105" cy="100" r="27" fill="#FFFFFF" />
          <circle cx="140" cy="88" r="36" fill="#FFFFFF" />
          <circle cx="177" cy="102" r="25" fill="#FFFFFF" />

          <rect
            x="90"
            y="100"
            width="115"
            height="24"
            rx="12"
            fill="#FFFFFF"
          />
        </g>

        <g opacity="0.7">
          <circle cx="1120" cy="78" r="24" fill="#FFFFFF" />
          <circle cx="1150" cy="68" r="34" fill="#FFFFFF" />
          <circle cx="1185" cy="82" r="23" fill="#FFFFFF" />

          <rect
            x="1108"
            y="80"
            width="100"
            height="20"
            rx="10"
            fill="#FFFFFF"
          />
        </g>

        {/* =====================================================
            PRINTZ COMPANY BUILDING
        ===================================================== */}

        <g filter="url(#adminDash_shadow)">

          {/* Main building */}

          <rect
            x="95"
            y="205"
            width="360"
            height="125"
            rx="5"
            fill="#FFFFFF"
            stroke="#C3EBDD"
            strokeWidth="2"
          />

          {/* Main glass tower */}

          <rect
            x="155"
            y="125"
            width="190"
            height="205"
            rx="8"
            fill="#FFFFFF"
            stroke="#C3EBDD"
            strokeWidth="2"
          />

          {/* Glass facade */}

          <rect
            x="175"
            y="145"
            width="150"
            height="105"
            rx="4"
            fill="url(#adminDash_glass)"
          />

          {/* Glass divisions */}

          <path
            d="M225 145V250"
            stroke="#74C9A9"
            strokeWidth="2"
          />

          <path
            d="M275 145V250"
            stroke="#74C9A9"
            strokeWidth="2"
          />

          <path
            d="M175 195H325"
            stroke="#74C9A9"
            strokeWidth="2"
          />

          {/* Building side windows */}

          <rect
            x="115"
            y="225"
            width="105"
            height="70"
            rx="4"
            fill="url(#adminDash_glass)"
          />

          <rect
            x="350"
            y="225"
            width="85"
            height="70"
            rx="4"
            fill="url(#adminDash_glass)"
          />

          {/* Main entrance */}

          <rect
            x="225"
            y="250"
            width="95"
            height="80"
            rx="4"
            fill="#BCEBD9"
            stroke="#75C9A8"
          />

          <path
            d="M272 250V330"
            stroke="#75C9A8"
            strokeWidth="2"
          />

          <circle
            cx="265"
            cy="291"
            r="3"
            fill="#047857"
          />

          <circle
            cx="279"
            cy="291"
            r="3"
            fill="#047857"
          />

          {/* PrintZ sign */}

          <rect
            x="120"
            y="105"
            width="260"
            height="62"
            rx="10"
            fill="url(#adminDash_green)"
          />

          <rect
            x="130"
            y="112"
            width="240"
            height="7"
            rx="3.5"
            fill="#6EE7B7"
            opacity="0.45"
          />

          <text
            x="250"
            y="147"
            textAnchor="middle"
            fontFamily="Arial, sans-serif"
            fontSize="37"
            fontWeight="700"
            fill="#FFFFFF"
          >
            PrintZ
          </text>

        </g>

        {/* =====================================================
            TREES AROUND BUILDING
        ===================================================== */}

        <g>
          <rect
            x="60"
            y="250"
            width="8"
            height="80"
            rx="3"
            fill="#4D9574"
          />

          <circle
            cx="64"
            cy="225"
            r="38"
            fill="#58C18B"
          />

          <circle
            cx="40"
            cy="240"
            r="28"
            fill="#80D5A8"
          />

          <circle
            cx="88"
            cy="240"
            r="28"
            fill="#6BCB99"
          />
        </g>

        <g>
          <rect
            x="465"
            y="250"
            width="8"
            height="80"
            rx="3"
            fill="#4D9574"
          />

          <circle
            cx="469"
            cy="225"
            r="38"
            fill="#58C18B"
          />

          <circle
            cx="445"
            cy="240"
            r="28"
            fill="#80D5A8"
          />

          <circle
            cx="493"
            cy="240"
            r="28"
            fill="#6BCB99"
          />
        </g>

        {/* =====================================================
            DASHBOARD SCREEN
        ===================================================== */}

        <g filter="url(#adminDash_shadow)">

          {/* Outer monitor */}

          <rect
            x="520"
            y="72"
            width="600"
            height="265"
            rx="20"
            fill="#FFFFFF"
            stroke="#BCE9D6"
            strokeWidth="3"
          />

          {/* Green top frame */}

          <rect
            x="520"
            y="72"
            width="600"
            height="52"
            rx="20"
            fill="url(#adminDash_greenDark)"
          />

          <rect
            x="520"
            y="101"
            width="600"
            height="23"
            fill="url(#adminDash_greenDark)"
          />

          {/* PrintZ logo */}

          <text
            x="548"
            y="106"
            fontFamily="Arial, sans-serif"
            fontSize="22"
            fontWeight="700"
            fill="#FFFFFF"
          >
            PrintZ
          </text>

          {/* Window dots */}

          <circle
            cx="1080"
            cy="97"
            r="5"
            fill="#FFFFFF"
            opacity="0.8"
          />

          <circle
            cx="1095"
            cy="97"
            r="5"
            fill="#FFFFFF"
            opacity="0.8"
          />

          {/* =================================================
              SIDEBAR
          ================================================= */}

          <rect
            x="535"
            y="137"
            width="115"
            height="180"
            rx="10"
            fill="#E9F9F2"
          />

          {/* Active dashboard */}

          <rect
            x="548"
            y="150"
            width="88"
            height="31"
            rx="8"
            fill="url(#adminDash_green)"
          />

          {/* Home icon */}

          <path
            d="M565 165L571 159L577 165V173H565Z"
            fill="#FFFFFF"
          />

          <rect
            x="585"
            y="162"
            width="35"
            height="5"
            rx="2.5"
            fill="#FFFFFF"
            opacity="0.9"
          />

          {/* Sidebar item */}

          <circle
            cx="570"
            cy="199"
            r="8"
            fill="#8DD7B6"
          />

          <rect
            x="585"
            y="196"
            width="38"
            height="5"
            rx="2.5"
            fill="#A8DEC8"
          />

          {/* Sidebar item */}

          <circle
            cx="570"
            cy="228"
            r="8"
            fill="#8DD7B6"
          />

          <rect
            x="585"
            y="225"
            width="32"
            height="5"
            rx="2.5"
            fill="#A8DEC8"
          />

          {/* Sidebar item */}

          <circle
            cx="570"
            cy="257"
            r="8"
            fill="#8DD7B6"
          />

          <rect
            x="585"
            y="254"
            width="40"
            height="5"
            rx="2.5"
            fill="#A8DEC8"
          />

          {/* Sidebar item */}

          <circle
            cx="570"
            cy="286"
            r="8"
            fill="#8DD7B6"
          />

          <rect
            x="585"
            y="283"
            width="34"
            height="5"
            rx="2.5"
            fill="#A8DEC8"
          />

          {/* =================================================
              DASHBOARD CONTENT
          ================================================= */}

          {/* Summary cards */}

          <rect
            x="670"
            y="140"
            width="100"
            height="55"
            rx="9"
            fill="#F0FBF7"
          />

          <rect
            x="785"
            y="140"
            width="100"
            height="55"
            rx="9"
            fill="#F0FBF7"
          />

          <rect
            x="900"
            y="140"
            width="100"
            height="55"
            rx="9"
            fill="#F0FBF7"
          />

          <rect
            x="1015"
            y="140"
            width="85"
            height="55"
            rx="9"
            fill="#F0FBF7"
          />

          {/* Card icons */}

          <circle
            cx="692"
            cy="166"
            r="13"
            fill="#D7F7E8"
          />

          <rect
            x="685"
            y="160"
            width="14"
            height="12"
            rx="2"
            fill="#10B981"
          />

          <circle
            cx="807"
            cy="166"
            r="13"
            fill="#D7F7E8"
          />

          <circle
            cx="807"
            cy="162"
            r="5"
            fill="#10B981"
          />

          <path
            d="M798 174C799 168 803 166 807 166C812 166 815 168 816 174"
            fill="#10B981"
          />

          <circle
            cx="922"
            cy="166"
            r="13"
            fill="#D7F7E8"
          />

          <rect
            x="916"
            y="158"
            width="12"
            height="15"
            rx="2"
            fill="#10B981"
          />

          <circle
            cx="1037"
            cy="166"
            r="13"
            fill="#D7F7E8"
          />

          {/* =================================================
              BAR CHART
          ================================================= */}

          <rect
            x="670"
            y="210"
            width="250"
            height="105"
            rx="10"
            fill="#FFFFFF"
            stroke="#E0F1EA"
          />

          {/* Chart baseline */}

          <path
            d="M692 290H895"
            stroke="#D5EDE3"
            strokeWidth="2"
          />

          {/* Bars */}

          <rect
            x="705"
            y="265"
            width="22"
            height="25"
            rx="4"
            fill="#8BE0BD"
          />

          <rect
            x="738"
            y="248"
            width="22"
            height="42"
            rx="4"
            fill="#42C995"
          />

          <rect
            x="771"
            y="257"
            width="22"
            height="33"
            rx="4"
            fill="#10B981"
          />

          <rect
            x="804"
            y="235"
            width="22"
            height="55"
            rx="4"
            fill="#059669"
          />

          <rect
            x="837"
            y="220"
            width="22"
            height="70"
            rx="4"
            fill="#10B981"
          />

          {/* Growth line */}

          <path
            d="
              M700 258
              C735 245 748 250 775 240
              C805 228 820 235 850 215
              C865 205 880 208 895 198
            "
            stroke="#34D399"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />

          <circle
            cx="895"
            cy="198"
            r="5"
            fill="#10B981"
          />

          {/* =================================================
              DONUT CHART
          ================================================= */}

          <rect
            x="935"
            y="210"
            width="165"
            height="105"
            rx="10"
            fill="#FFFFFF"
            stroke="#E0F1EA"
          />

          <circle
            cx="985"
            cy="262"
            r="32"
            fill="#E4F8EF"
          />

          <path
            d="
              M985 230
              A32 32 0 0 1
              1016 271
              L985 262
              Z
            "
            fill="#059669"
          />

          <path
            d="
              M1016 271
              A32 32 0 0 1
              964 287
              L985 262
              Z
            "
            fill="#34D399"
          />

          <path
            d="
              M964 287
              A32 32 0 0 1
              985 230
              L985 262
              Z
            "
            fill="#A7E7D0"
          />

          <circle
            cx="985"
            cy="262"
            r="15"
            fill="#FFFFFF"
          />

          {/* Donut legend */}

          <circle
            cx="1040"
            cy="244"
            r="4"
            fill="#059669"
          />

          <rect
            x="1050"
            y="241"
            width="32"
            height="5"
            rx="2.5"
            fill="#B8E6D4"
          />

          <circle
            cx="1040"
            cy="261"
            r="4"
            fill="#34D399"
          />

          <rect
            x="1050"
            y="258"
            width="27"
            height="5"
            rx="2.5"
            fill="#B8E6D4"
          />

          <circle
            cx="1040"
            cy="278"
            r="4"
            fill="#A7E7D0"
          />

          <rect
            x="1050"
            y="275"
            width="35"
            height="5"
            rx="2.5"
            fill="#B8E6D4"
          />

        </g>

        {/* =====================================================
            FLOATING PRINTER CARD
        ===================================================== */}

        <g filter="url(#adminDash_smallShadow)">

          <rect
            x="455"
            y="105"
            width="155"
            height="85"
            rx="14"
            fill="#FFFFFF"
            stroke="#CBEFE0"
            strokeWidth="2"
          />

          {/* Printer icon */}

          <rect
            x="478"
            y="133"
            width="43"
            height="30"
            rx="5"
            fill="url(#adminDash_green)"
          />

          <rect
            x="485"
            y="124"
            width="29"
            height="16"
            rx="3"
            fill="#FFFFFF"
            stroke="#059669"
            strokeWidth="2"
          />

          <rect
            x="486"
            y="156"
            width="27"
            height="9"
            rx="2"
            fill="#FFFFFF"
          />

          <rect
            x="538"
            y="130"
            width="45"
            height="7"
            rx="3.5"
            fill="#A3DFC5"
          />

          <rect
            x="538"
            y="145"
            width="32"
            height="6"
            rx="3"
            fill="#D2EFE2"
          />

          <rect
            x="538"
            y="158"
            width="40"
            height="6"
            rx="3"
            fill="#D2EFE2"
          />

        </g>

        {/* =====================================================
            FLOATING USER CARD
        ===================================================== */}

        <g filter="url(#adminDash_smallShadow)">

          <rect
            x="450"
            y="230"
            width="160"
            height="82"
            rx="14"
            fill="#FFFFFF"
            stroke="#CBEFE0"
            strokeWidth="2"
          />

          <circle
            cx="478"
            cy="267"
            r="18"
            fill="#DDF8EA"
          />

          <circle
            cx="478"
            cy="262"
            r="6"
            fill="#059669"
          />

          <path
            d="
              M467 278
              C468 271 472 269 478 269
              C484 269 488 271 489 278
              Z
            "
            fill="#10B981"
          />

          <rect
            x="510"
            y="254"
            width="65"
            height="7"
            rx="3.5"
            fill="#9DDFC3"
          />

          <rect
            x="510"
            y="269"
            width="48"
            height="6"
            rx="3"
            fill="#D1EFE2"
          />

          <rect
            x="510"
            y="282"
            width="58"
            height="6"
            rx="3"
            fill="#D1EFE2"
          />

        </g>

        {/* =====================================================
            RIGHT FLOATING ANALYTICS CARD
        ===================================================== */}

        <g filter="url(#adminDash_smallShadow)">

          <rect
            x="1135"
            y="110"
            width="150"
            height="100"
            rx="15"
            fill="#FFFFFF"
            stroke="#CBEFE0"
            strokeWidth="2"
          />

          {/* Arrow */}

          <path
            d="M1160 180L1190 150L1204 163L1240 130"
            stroke="#10B981"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M1228 130H1240V142"
            stroke="#10B981"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Bars */}

          <rect
            x="1160"
            y="180"
            width="12"
            height="18"
            rx="3"
            fill="#B5EBD7"
          />

          <rect
            x="1180"
            y="170"
            width="12"
            height="28"
            rx="3"
            fill="#75D6B0"
          />

          <rect
            x="1200"
            y="160"
            width="12"
            height="38"
            rx="3"
            fill="#34C994"
          />

          <rect
            x="1220"
            y="148"
            width="12"
            height="50"
            rx="3"
            fill="#10B981"
          />

        </g>

        {/* =====================================================
            RIGHT CHECKLIST
        ===================================================== */}

        <g filter="url(#adminDash_smallShadow)">

          <rect
            x="1160"
            y="230"
            width="160"
            height="95"
            rx="15"
            fill="#FFFFFF"
            stroke="#CBEFE0"
            strokeWidth="2"
          />

          <circle
            cx="1185"
            cy="255"
            r="9"
            fill="#DDF8EA"
          />

          <path
            d="M1181 255L1184 258L1190 251"
            stroke="#059669"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <rect
            x="1203"
            y="252"
            width="75"
            height="6"
            rx="3"
            fill="#9DDFC3"
          />

          <circle
            cx="1185"
            cy="278"
            r="9"
            fill="#DDF8EA"
          />

          <path
            d="M1181 278L1184 281L1190 274"
            stroke="#059669"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <rect
            x="1203"
            y="275"
            width="62"
            height="6"
            rx="3"
            fill="#9DDFC3"
          />

          <circle
            cx="1185"
            cy="301"
            r="9"
            fill="#DDF8EA"
          />

          <path
            d="M1181 301L1184 304L1190 297"
            stroke="#059669"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <rect
            x="1203"
            y="298"
            width="80"
            height="6"
            rx="3"
            fill="#9DDFC3"
          />

        </g>

        {/* =====================================================
            ADMIN PERSON
        ===================================================== */}

        <g filter="url(#adminDash_smallShadow)">

          {/* Chair */}

          <path
            d="
              M1080 300
              C1080 275 1100 255 1125 255
              H1180
              C1200 255 1215 275 1215 300
              V360
              H1080
              Z
            "
            fill="#0B9F72"
          />

          {/* Person body */}

          <path
            d="
              M1040 360
              C1045 325 1060 302 1085 292
              L1130 292
              C1155 302 1170 325 1175 360
              Z
            "
            fill="url(#adminDash_green)"
          />

          {/* Neck */}

          <rect
            x="1092"
            y="265"
            width="25"
            height="30"
            rx="8"
            fill="#C9875B"
          />

          {/* Head */}

          <ellipse
            cx="1105"
            cy="245"
            rx="32"
            ry="38"
            fill="#D89A6B"
          />

          {/* Hair */}

          <path
            d="
              M1074 240
              C1070 213 1086 198 1110 201
              C1134 202 1144 218 1138 240
              C1128 226 1115 224 1100 228
              C1090 231 1082 237 1074 240
              Z
            "
            fill="#17383A"
          />

          {/* Face */}

          <circle
            cx="1094"
            cy="246"
            r="3"
            fill="#263238"
          />

          <circle
            cx="1117"
            cy="246"
            r="3"
            fill="#263238"
          />

          <path
            d="M1098 260C1103 264 1109 264 1114 260"
            stroke="#A65E48"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Arm */}

          <path
            d="
              M1080 305
              C1050 315 1025 326 1008 338
            "
            stroke="#D89A6B"
            strokeWidth="18"
            strokeLinecap="round"
          />

          {/* Laptop */}

          <path
            d="
              M955 295
              H1060
              V350
              H955
              Z
            "
            fill="#FFFFFF"
            stroke="#79CBB0"
            strokeWidth="3"
          />

          <rect
            x="965"
            y="305"
            width="85"
            height="34"
            rx="3"
            fill="#DDF8EE"
          />

          {/* Laptop chart */}

          <path
            d="M975 330L990 320L1005 326L1020 312L1040 317"
            stroke="#10B981"
            strokeWidth="3"
            fill="none"
          />

          <path
            d="
              M945 350
              H1070
              L1058 360
              H957
              Z
            "
            fill="#BBDDD2"
          />

        </g>

        {/* =====================================================
            SMALL PLANTS
        ===================================================== */}

        <g>
          <rect
            x="900"
            y="315"
            width="30"
            height="20"
            rx="5"
            fill="#D9EFE7"
          />

          <path
            d="M915 315C904 300 905 287 912 279"
            stroke="#059669"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <path
            d="M915 315C926 302 928 291 923 282"
            stroke="#10B981"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <path
            d="M915 315C913 302 917 293 920 286"
            stroke="#34D399"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>

        {/* =====================================================
            GROUND
        ===================================================== */}

        <path
          d="M30 365H1370"
          stroke="#51C79A"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.8"
        />

        <path
          d="M100 375H1290"
          stroke="#B7EAD5"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* =====================================================
            DECORATIVE PLUS
        ===================================================== */}

        <path
          d="M475 65H489"
          stroke="#6EE7B7"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <path
          d="M482 58V72"
          stroke="#6EE7B7"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <path
          d="M1270 75H1284"
          stroke="#6EE7B7"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <path
          d="M1277 68V82"
          stroke="#6EE7B7"
          strokeWidth="3"
          strokeLinecap="round"
        />

      </svg>
    </div>
  );
};

export default AdminDashboardIllustration;
