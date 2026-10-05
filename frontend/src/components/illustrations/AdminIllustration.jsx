import React from "react";

const AdminIllustration = ({
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
      className={`admin-illustration ${className}`.trim()}
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
            id="adminBg"
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

          {/* ================= GREEN ================= */}
          <linearGradient id="adminGreen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#16C784" />
            <stop offset="100%" stopColor="#04805E" />
          </linearGradient>

          <linearGradient id="shieldGreen" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* ================= BLUE ================= */}
          <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          {/* ================= ORANGE ================= */}
          <linearGradient id="orangeGradient" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#FDBA74" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>

          {/* ================= SHADOW ================= */}
          <filter id="adminShadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow
              dx="0"
              dy="6"
              stdDeviation="7"
              floodColor="#047857"
              floodOpacity="0.12"
            />
          </filter>

          <filter id="smallShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="3"
              floodColor="#047857"
              floodOpacity="0.14"
            />
          </filter>
        </defs>

        {/* =====================================================
            BACKGROUND
        ===================================================== */}
        <rect width="1200" height="300" rx="14" fill="url(#adminBg)" />

        {/* Soft abstract circles */}
        <circle cx="150" cy="155" r="125" fill="#D7F7E8" opacity="0.55" />
        <circle cx="500" cy="125" r="155" fill="#D0F5E3" opacity="0.45" />
        <circle cx="790" cy="120" r="175" fill="#D5F6E7" opacity="0.45" />
        <circle cx="1080" cy="165" r="140" fill="#DCF9ED" opacity="0.5" />

        {/* =====================================================
            BACKGROUND CITY
        ===================================================== */}
        <g opacity="0.18">
          <rect x="55" y="125" width="55" height="90" rx="3" fill="#65C99A" />
          <rect x="125" y="88" width="65" height="127" rx="3" fill="#78D2A8" />
          <rect x="205" y="125" width="58" height="90" rx="3" fill="#65C99A" />
          <rect x="290" y="70" width="65" height="145" rx="3" fill="#78D2A8" />
          <rect x="850" y="75" width="65" height="140" rx="3" fill="#78D2A8" />
          <rect x="930" y="115" width="60" height="100" rx="3" fill="#65C99A" />
          <rect x="1010" y="70" width="70" height="145" rx="3" fill="#78D2A8" />
          <rect x="1090" y="120" width="60" height="95" rx="3" fill="#65C99A" />
        </g>

        {/* =====================================================
            SOFT CLOUDS
        ===================================================== */}
        <g opacity="0.75">
          <circle cx="190" cy="82" r="22" fill="#FFFFFF" />
          <circle cx="215" cy="75" r="30" fill="#FFFFFF" />
          <circle cx="245" cy="83" r="20" fill="#FFFFFF" />
          <rect x="178" y="81" width="82" height="18" rx="9" fill="#FFFFFF" />
        </g>

        <g opacity="0.7">
          <circle cx="930" cy="70" r="20" fill="#FFFFFF" />
          <circle cx="955" cy="64" r="28" fill="#FFFFFF" />
          <circle cx="985" cy="73" r="20" fill="#FFFFFF" />
          <rect x="918" y="72" width="90" height="18" rx="9" fill="#FFFFFF" />
        </g>

        {/* =====================================================
            LEFT DECORATIVE PLANTS
        ===================================================== */}
        <g>
          <path
            d="M100 255C85 232 88 211 101 196"
            stroke="#277D5B"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M101 247C116 228 121 211 115 195"
            stroke="#15966C"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M94 234C78 225 72 212 75 199"
            stroke="#42B883"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <ellipse
            cx="101"
            cy="181"
            rx="17"
            ry="28"
            transform="rotate(-25 101 181)"
            fill="#52C995"
          />
          <ellipse
            cx="118"
            cy="185"
            rx="16"
            ry="28"
            transform="rotate(28 118 185)"
            fill="#35B87E"
          />
          <ellipse
            cx="77"
            cy="196"
            rx="14"
            ry="23"
            transform="rotate(-35 77 196)"
            fill="#7AD9AC"
          />
        </g>

        {/* =====================================================
            RIGHT DECORATIVE PLANTS
        ===================================================== */}
        <g>
          <path
            d="M1065 258C1053 233 1058 210 1073 194"
            stroke="#277D5B"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M1067 246C1084 225 1088 208 1082 192"
            stroke="#15966C"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M1060 235C1043 224 1038 210 1042 198"
            stroke="#42B883"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <ellipse
            cx="1070"
            cy="181"
            rx="18"
            ry="29"
            transform="rotate(-24 1070 181)"
            fill="#52C995"
          />
          <ellipse
            cx="1087"
            cy="185"
            rx="16"
            ry="28"
            transform="rotate(28 1087 185)"
            fill="#35B87E"
          />
          <ellipse
            cx="1044"
            cy="197"
            rx="14"
            ry="23"
            transform="rotate(-35 1044 197)"
            fill="#7AD9AC"
          />
        </g>

        {/* =====================================================
            PROFILE CARD
        ===================================================== */}
        <g filter="url(#adminShadow)">
          <rect
            x="195"
            y="96"
            width="300"
            height="118"
            rx="18"
            fill="#FFFFFF"
            stroke="#D0F0E2"
            strokeWidth="1.5"
          />

          {/* Soft card highlight */}
          <ellipse
            cx="285"
            cy="115"
            rx="95"
            ry="38"
            fill="#E8FFF4"
            opacity="0.7"
          />

          {/* Avatar circle */}
          <circle cx="250" cy="154" r="31" fill="#D5F7E6" />

          {/* Head */}
          <circle cx="250" cy="147" r="11" fill="#059669" />

          {/* Body */}
          <path
            d="M226 180 C228 164 237 158 250 158 C263 158 272 164 274 180Z"
            fill="#10B981"
          />

          {/* Profile information */}
          <rect x="305" y="125" width="115" height="8" rx="4" fill="#8FDEC0" />
          <rect x="305" y="143" width="85" height="7" rx="3.5" fill="#C5EEDD" />
          <rect x="305" y="159" width="105" height="7" rx="3.5" fill="#C5EEDD" />

          {/* Small status */}
          <rect
            x="305"
            y="179"
            width="64"
            height="19"
            rx="9.5"
            fill="#DDF9EA"
          />
          <circle cx="318" cy="188.5" r="4" fill="#10B981" />
          <text
            x="347"
            y="192"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="10"
            fontWeight="700"
            fill="#047857"
          >
            ADMIN
          </text>
        </g>

        {/* =====================================================
            CONNECTION LINE FROM CARD TO PANEL
        ===================================================== */}
        <path
          d="M495 153H535V124H570"
          stroke="#20B486"
          strokeWidth="2"
          strokeDasharray="7 7"
          strokeLinecap="round"
        />
        <circle cx="535" cy="153" r="4" fill="#10B981" />

        {/* =====================================================
            GEAR
        ===================================================== */}
        <g filter="url(#smallShadow)">
          <path
            d="
              M520 70 L527 70 L530 78 L538 81 L545 77 L550 82 L546 89 L549 97
              L557 100 L557 107 L549 110 L546 118 L550 125 L545 130 L538 126
              L530 129 L527 137 L520 137 L517 129 L509 126 L502 130 L497 125
              L501 118 L498 110 L490 107 L490 100 L498 97 L501 89 L497 82
              L502 77 L509 81 L517 78 Z
            "
            fill="url(#adminGreen)"
          />
          <circle cx="524" cy="103" r="10" fill="#FFFFFF" />
          <circle cx="524" cy="103" r="5" fill="#10B981" />
        </g>

        {/* Connection from gear */}
        <path
          d="M550 103H590V92"
          stroke="#20B486"
          strokeWidth="2"
          strokeDasharray="7 7"
          strokeLinecap="round"
        />

        {/* =====================================================
            MAIN ADMIN MANAGEMENT PANEL
        ===================================================== */}
        <g filter="url(#adminShadow)">
          {/* Panel */}
          <rect
            x="570"
            y="72"
            width="395"
            height="185"
            rx="18"
            fill="#FFFFFF"
            stroke="#D0F0E2"
            strokeWidth="1.5"
          />

          {/* Green top bar */}
          <rect
            x="570"
            y="72"
            width="395"
            height="40"
            rx="18"
            fill="url(#adminGreen)"
          />
          <rect
            x="570"
            y="94"
            width="395"
            height="18"
            fill="url(#adminGreen)"
          />

          {/* Window dots */}
          <circle cx="590" cy="91" r="4" fill="#FFFFFF" opacity="0.9" />
          <circle cx="605" cy="91" r="4" fill="#FFFFFF" opacity="0.9" />
          <circle cx="620" cy="91" r="4" fill="#FFFFFF" opacity="0.9" />

          {/* Panel header */}
          <text
            x="650"
            y="97"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="16"
            fontWeight="700"
            fill="#FFFFFF"
          >
            Admin Management
          </text>

          {/* =================================================
              ADMIN ROW 1
          ================================================= */}
          <circle cx="610" cy="137" r="20" fill="#E0F8ED" />
          <circle cx="610" cy="132" r="7" fill="#059669" />
          <path
            d="M598 151 C600 143 604 140 610 140 C616 140 620 143 622 151Z"
            fill="#10B981"
          />
          <rect x="645" y="128" width="90" height="7" rx="3.5" fill="#A0DFC4" />
          <rect x="645" y="142" width="135" height="6" rx="3" fill="#D1F0E2" />

          {/* Toggle */}
          <rect x="850" y="128" width="47" height="25" rx="12.5" fill="#10B981" />
          <circle cx="884" cy="140.5" r="8" fill="#FFFFFF" />

          {/* =================================================
              ADMIN ROW 2
          ================================================= */}
          <circle cx="610" cy="180" r="20" fill="#E5F0FF" />
          <circle cx="610" cy="175" r="7" fill="#2563EB" />
          <path
            d="M598 194 C600 186 604 183 610 183 C616 183 620 186 622 194Z"
            fill="#3B82F6"
          />
          <rect x="645" y="171" width="82" height="7" rx="3.5" fill="#A9C8F4" />
          <rect x="645" y="185" width="125" height="6" rx="3" fill="#D9E8FA" />

          {/* Toggle */}
          <rect x="850" y="171" width="47" height="25" rx="12.5" fill="#10B981" />
          <circle cx="884" cy="183.5" r="8" fill="#FFFFFF" />

          {/* =================================================
              ADMIN ROW 3
          ================================================= */}
          <circle cx="610" cy="223" r="20" fill="#FFF1E6" />
          <circle cx="610" cy="218" r="7" fill="#F97316" />
          <path
            d="M598 237 C600 229 604 226 610 226 C616 226 620 229 622 237Z"
            fill="#FB923C"
          />
          <rect x="645" y="214" width="95" height="7" rx="3.5" fill="#F5C7A5" />
          <rect x="645" y="228" width="110" height="6" rx="3" fill="#F9E0CC" />

          {/* Inactive toggle */}
          <rect x="850" y="214" width="47" height="25" rx="12.5" fill="#CBD5E1" />
          <circle cx="863" cy="226.5" r="8" fill="#FFFFFF" />
        </g>

        {/* =====================================================
            CHARACTER SITTING AT LAPTOP
        ===================================================== */}
        <g filter="url(#smallShadow)">
          {/* Desk shadow */}
          <ellipse cx="420" cy="265" rx="65" ry="6" fill="#047857" opacity="0.12" />

          {/* Body/Sweater */}
          <path
            d="M366 264 C368 214 388 190 412 188 C436 190 456 214 458 264 Z"
            fill="#059669"
          />

          {/* Collar & Neck */}
          <rect x="406" y="174" width="12" height="15" rx="3" fill="#FDBA74" />
          <polygon points="412,197 400,184 424,184" fill="#FFFFFF" />
          <polygon points="412,191 405,184 419,184" fill="#FED7AA" />

          {/* Head & Face */}
          <ellipse cx="412" cy="158" rx="17" ry="19" fill="#FED7AA" />
          <ellipse cx="396" cy="160" rx="3.5" ry="5.5" fill="#FDBA74" />

          {/* Hair */}
          <path
            d="M395 156 C394 140 404 135 418 135 C430 135 434 142 433 156 C428 148 419 146 409 150 C402 153 398 156 395 156 Z"
            fill="#0F172A"
          />
          <path
            d="M395 151 C393 157 394 165 397 169 C395 166 394 159 395 151 Z"
            fill="#0F172A"
          />

          {/* Arms reaching to laptop */}
          <path
            d="M374 234 C384 248 402 254 424 252"
            stroke="#059669"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <path
            d="M448 234 C442 248 432 254 416 252"
            stroke="#047857"
            strokeWidth="11"
            strokeLinecap="round"
          />

          {/* Hands */}
          <circle cx="416" cy="251" r="6" fill="#FED7AA" />
          <circle cx="426" cy="251" r="6" fill="#FED7AA" />

          {/* Laptop Base */}
          <path d="M400 256 L465 256 L460 260 L405 260 Z" fill="#94A3B8" />
          <rect x="405" y="256" width="55" height="2" rx="1" fill="#F1F5F9" />

          {/* Laptop Screen */}
          <path
            d="M440 218 L468 218 L465 256 L443 256 Z"
            fill="#CBD5E1"
            stroke="#94A3B8"
            strokeWidth="1"
          />
          <path d="M442 221 L465 221 L463 253 L444 253 Z" fill="#E0F2FE" />
          <circle cx="454" cy="237" r="3.5" fill="#38BDF8" opacity="0.85" />
        </g>

        {/* =====================================================
            SECURITY SHIELD
        ===================================================== */}
        <g filter="url(#adminShadow)">
          {/* Outer shield */}
          <path
            d="
              M1005 106 C970 106 950 124 950 151 C950 185 1005 226 1005 226
              C1005 226 1060 185 1060 151 C1060 124 1040 106 1005 106Z
            "
            fill="url(#shieldGreen)"
          />

          {/* White inner shield */}
          <path
            d="
              M1005 123 C982 123 968 136 968 154 C968 176 1005 202 1005 202
              C1005 202 1042 176 1042 154 C1042 136 1028 123 1005 123Z
            "
            fill="#FFFFFF"
            opacity="0.96"
          />

          {/* Green inner */}
          <path
            d="
              M1005 132 C988 132 978 141 978 155 C978 171 1005 190 1005 190
              C1005 190 1032 171 1032 155 C1032 141 1022 132 1005 132Z
            "
            fill="url(#shieldGreen)"
          />

          {/* User symbol */}
          <circle cx="1005" cy="151" r="9" fill="#FFFFFF" />
          <path
            d="M988 177 C990 165 996 160 1005 160 C1014 160 1020 165 1022 177Z"
            fill="#FFFFFF"
          />
        </g>

        {/* =====================================================
            GREEN CHECK BADGE
        ===================================================== */}
        <g filter="url(#smallShadow)">
          <circle cx="950" cy="202" r="27" fill="url(#adminGreen)" />
          <path
            d="M938 202L946 210L963 191"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Connection to shield */}
        <path
          d="M965 135H985"
          stroke="#20B486"
          strokeWidth="2"
          strokeDasharray="7 7"
          strokeLinecap="round"
        />

        {/* =====================================================
            DECORATIVE PLUS
        ===================================================== */}
        <path
          d="M1070 85H1082"
          stroke="#6EE7B7"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M1076 79V91"
          stroke="#6EE7B7"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M540 48H550"
          stroke="#6EE7B7"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M545 43V53"
          stroke="#6EE7B7"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* =====================================================
            BOTTOM BUSHES
        ===================================================== */}
        <g>
          <circle cx="165" cy="259" r="20" fill="#73CD9E" />
          <circle cx="190" cy="263" r="17" fill="#58C18B" />
          <circle cx="216" cy="259" r="20" fill="#8BD9AD" />
          <circle cx="1080" cy="259" r="20" fill="#73CD9E" />
          <circle cx="1105" cy="263" r="17" fill="#58C18B" />
          <circle cx="1130" cy="259" r="20" fill="#8BD9AD" />
        </g>

        {/* =====================================================
            GROUND
        ===================================================== */}
        <path
          d="M55 272H1145"
          stroke="#55C99A"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M120 278H1080"
          stroke="#B8EAD5"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export const TeamManagementIllustration = AdminIllustration;
export const AdminManagementIllustration = AdminIllustration;
export default AdminIllustration;