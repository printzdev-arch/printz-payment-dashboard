import React from "react";

const AddPrinterIllustration = ({
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
      className={`add-printer-illustration ${className}`.trim()}
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
              BACKGROUND
          ===================================================== */}
          <linearGradient
            id="printerBg"
            x1="0"
            y1="0"
            x2="1200"
            y2="300"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#EDFFF8" />
            <stop offset="0.5" stopColor="#F4FFFB" />
            <stop offset="1" stopColor="#E5FAF0" />
          </linearGradient>

          {/* =====================================================
              GREEN
          ===================================================== */}
          <linearGradient
            id="printerGreen"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0" stopColor="#18C98A" />
            <stop offset="1" stopColor="#047857" />
          </linearGradient>

          <linearGradient
            id="printerGreenLight"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0" stopColor="#34D399" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>

          {/* =====================================================
              PRINTER BODY
          ===================================================== */}
          <linearGradient
            id="printerBody"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#EAF7F2" />
          </linearGradient>

          {/* =====================================================
              GLASS
          ===================================================== */}
          <linearGradient
            id="printerGlass"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0" stopColor="#DDFBF0" />
            <stop offset="1" stopColor="#9FE4CA" />
          </linearGradient>

          {/* =====================================================
              BLUE
          ===================================================== */}
          <linearGradient
            id="printerBlue"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0" stopColor="#60A5FA" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>

          {/* =====================================================
              SHADOW
          ===================================================== */}
          <filter
            id="printerShadow"
            x="-30%"
            y="-30%"
            width="160%"
            height="180%"
          >
            <feDropShadow
              dx="0"
              dy="6"
              stdDeviation="7"
              floodColor="#047857"
              floodOpacity="0.12"
            />
          </filter>

          <filter
            id="printerSmallShadow"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="4"
              floodColor="#047857"
              floodOpacity="0.14"
            />
          </filter>
        </defs>

        {/* =====================================================
            BACKGROUND
        ===================================================== */}
        <rect
          width="1200"
          height="300"
          rx="14"
          fill="url(#printerBg)"
        />

        {/* Soft background circles */}
        <circle
          cx="135"
          cy="160"
          r="130"
          fill="#D7F7E8"
          opacity="0.5"
        />

        <circle
          cx="470"
          cy="125"
          r="150"
          fill="#D1F5E4"
          opacity="0.45"
        />

        <circle
          cx="790"
          cy="125"
          r="180"
          fill="#D7F7E9"
          opacity="0.45"
        />

        <circle
          cx="1080"
          cy="165"
          r="140"
          fill="#DCF9ED"
          opacity="0.5"
        />

        {/* =====================================================
            BACKGROUND CITY
        ===================================================== */}
        <g opacity="0.18">
          <rect
            x="55"
            y="120"
            width="55"
            height="95"
            rx="3"
            fill="#75D0A5"
          />

          <rect
            x="125"
            y="85"
            width="65"
            height="130"
            rx="3"
            fill="#8AD9B4"
          />

          <rect
            x="205"
            y="125"
            width="58"
            height="90"
            rx="3"
            fill="#65C99A"
          />

          <rect
            x="290"
            y="70"
            width="65"
            height="145"
            rx="3"
            fill="#8AD9B4"
          />

          <rect
            x="850"
            y="75"
            width="65"
            height="140"
            rx="3"
            fill="#8AD9B4"
          />

          <rect
            x="930"
            y="115"
            width="60"
            height="100"
            rx="3"
            fill="#65C99A"
          />

          <rect
            x="1010"
            y="70"
            width="70"
            height="145"
            rx="3"
            fill="#8AD9B4"
          />

          <rect
            x="1090"
            y="120"
            width="60"
            height="95"
            rx="3"
            fill="#65C99A"
          />
        </g>

        {/* =====================================================
            CLOUDS
        ===================================================== */}
        <g opacity="0.7">
          <circle
            cx="160"
            cy="75"
            r="20"
            fill="#FFFFFF"
          />

          <circle
            cx="185"
            cy="68"
            r="27"
            fill="#FFFFFF"
          />

          <circle
            cx="215"
            cy="77"
            r="18"
            fill="#FFFFFF"
          />

          <rect
            x="150"
            y="76"
            width="80"
            height="17"
            rx="8"
            fill="#FFFFFF"
          />
        </g>

        <g opacity="0.65">
          <circle
            cx="930"
            cy="68"
            r="18"
            fill="#FFFFFF"
          />

          <circle
            cx="955"
            cy="62"
            r="25"
            fill="#FFFFFF"
          />

          <circle
            cx="982"
            cy="71"
            r="18"
            fill="#FFFFFF"
          />

          <rect
            x="920"
            y="72"
            width="78"
            height="16"
            rx="8"
            fill="#FFFFFF"
          />
        </g>

        {/* =====================================================
            LEFT TREES
        ===================================================== */}
        <g>
          <rect
            x="120"
            y="165"
            width="7"
            height="60"
            rx="3"
            fill="#4D9574"
          />

          <path
            d="M123 182C109 172 102 158 102 145"
            stroke="#4D9574"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <path
            d="M123 176C137 167 144 155 144 142"
            stroke="#4D9574"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <circle
            cx="120"
            cy="135"
            r="27"
            fill="#65C994"
          />

          <circle
            cx="99"
            cy="149"
            r="20"
            fill="#86D8AA"
          />

          <circle
            cx="142"
            cy="149"
            r="20"
            fill="#58BE89"
          />
        </g>

        {/* =====================================================
            PRINTZ SHOP
        ===================================================== */}
        <g filter="url(#printerShadow)">
          {/* Building */}
          <rect
            x="175"
            y="118"
            width="260"
            height="115"
            rx="5"
            fill="#FFFFFF"
            stroke="#BFE8D6"
            strokeWidth="1.5"
          />

          {/* Green shop header */}
          <rect
            x="160"
            y="96"
            width="290"
            height="46"
            rx="7"
            fill="url(#printerGreen)"
          />

          {/* Header highlight */}
          <rect
            x="168"
            y="101"
            width="274"
            height="6"
            rx="3"
            fill="#34D399"
            opacity="0.45"
          />

          {/* PrintZ text */}
          <text
            x="305"
            y="130"
            textAnchor="middle"
            fontFamily="Arial, sans-serif"
            fontSize="28"
            fontWeight="700"
            fill="#FFFFFF"
          >
            PrintZ
          </text>

          {/* Awning */}
          <path
            d="
              M185 142
              H425
              L414 164
              H196
              Z
            "
            fill="#10B981"
          />

          {/* Awning stripes */}
          <path
            d="M205 142L214 164H235L230 142Z"
            fill="#FFFFFF"
          />

          <path
            d="M250 142L256 164H277L274 142Z"
            fill="#FFFFFF"
          />

          <path
            d="M295 142L298 164H320V142Z"
            fill="#FFFFFF"
          />

          <path
            d="M340 142L337 164H358L365 142Z"
            fill="#FFFFFF"
          />

          <path
            d="M385 142L378 164H399L409 142Z"
            fill="#FFFFFF"
          />

          {/* Glass storefront */}
          <rect
            x="195"
            y="165"
            width="220"
            height="60"
            rx="3"
            fill="url(#printerGlass)"
            stroke="#86D2B2"
          />

          {/* Left display */}
          <rect
            x="207"
            y="174"
            width="50"
            height="42"
            rx="3"
            fill="#EFFFF8"
          />

          {/* Poster */}
          <rect
            x="214"
            y="180"
            width="36"
            height="25"
            rx="2"
            fill="#FFFFFF"
          />

          <circle
            cx="224"
            cy="188"
            r="5"
            fill="#FACC15"
          />

          <path
            d="M216 201L225 193L231 198L239 190L248 201Z"
            fill="#60A5FA"
          />

          {/* Door */}
          <rect
            x="270"
            y="165"
            width="72"
            height="60"
            fill="#BDEEDB"
            stroke="#78CBA7"
          />

          <path
            d="M306 165V225"
            stroke="#78CBA7"
            strokeWidth="1.5"
          />

          <circle
            cx="300"
            cy="195"
            r="2"
            fill="#047857"
          />

          <circle
            cx="312"
            cy="195"
            r="2"
            fill="#047857"
          />

          {/* Right display */}
          <rect
            x="355"
            y="174"
            width="50"
            height="42"
            rx="3"
            fill="#EFFFF8"
          />

          {/* Printer poster */}
          <rect
            x="362"
            y="180"
            width="36"
            height="25"
            rx="2"
            fill="#FFFFFF"
          />

          <rect
            x="369"
            y="185"
            width="22"
            height="9"
            rx="2"
            fill="#A7E7D0"
          />

          <rect
            x="369"
            y="198"
            width="18"
            height="3"
            rx="1.5"
            fill="#C6EEE0"
          />
        </g>

        {/* =====================================================
            CONNECTION PATH
        ===================================================== */}
        <path
          d="
            M450 126
            C500 126 505 82 550 82
            C590 82 600 110 630 110
          "
          stroke="#13B981"
          strokeWidth="3"
          strokeDasharray="9 9"
          strokeLinecap="round"
        />

        {/* =====================================================
            PLUS BUTTON
        ===================================================== */}
        <g filter="url(#printerSmallShadow)">
          <circle
            cx="565"
            cy="83"
            r="31"
            fill="url(#printerGreen)"
          />

          <circle
            cx="565"
            cy="83"
            r="25"
            fill="#059669"
            opacity="0.25"
          />

          <path
            d="M551 83H579"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
          />

          <path
            d="M565 69V97"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>

        {/* =====================================================
            PRINTER AREA CARD
        ===================================================== */}
        <g filter="url(#printerShadow)">
          <rect
            x="625"
            y="90"
            width="420"
            height="150"
            rx="18"
            fill="#FFFFFF"
            stroke="#CBEFE0"
            strokeWidth="1.5"
          />

          {/* =================================================
              TOP PRINTER INFO CARD
          ================================================= */}
          <rect
            x="650"
            y="108"
            width="150"
            height="48"
            rx="10"
            fill="#F1FBF7"
            stroke="#D7EEE4"
          />

          {/* Printer mini icon */}
          <rect
            x="665"
            y="119"
            width="32"
            height="22"
            rx="4"
            fill="url(#printerGreen)"
          />

          <rect
            x="670"
            y="112"
            width="22"
            height="12"
            rx="2"
            fill="#FFFFFF"
            stroke="#059669"
            strokeWidth="2"
          />

          <rect
            x="673"
            y="137"
            width="16"
            height="7"
            rx="1"
            fill="#FFFFFF"
          />

          {/* Info lines */}
          <rect
            x="710"
            y="119"
            width="65"
            height="6"
            rx="3"
            fill="#A5DFC7"
          />

          <rect
            x="710"
            y="132"
            width="50"
            height="5"
            rx="2.5"
            fill="#D0EFE1"
          />

          {/* =================================================
              ADD BUTTON
          ================================================= */}
          <circle
            cx="985"
            cy="132"
            r="22"
            fill="url(#printerGreen)"
          />

          <path
            d="M976 132H994"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <path
            d="M985 123V141"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* =================================================
              PRINTER BODY
          ================================================= */}
          {/* Paper tray/top */}
          <path
            d="
              M715 151
              L875 151
              L900 170
              H690
              Z
            "
            fill="#D6E9E3"
          />

          <path
            d="
              M715 151
              L875 151
              L892 162
              H700
              Z
            "
            fill="#35545A"
          />

          {/* Main printer */}
          <rect
            x="685"
            y="165"
            width="220"
            height="78"
            rx="12"
            fill="url(#printerBody)"
            stroke="#A9D7C5"
            strokeWidth="1.5"
          />

          {/* Top control section */}
          <rect
            x="700"
            y="176"
            width="190"
            height="29"
            rx="7"
            fill="#263D42"
          />

          {/* Display */}
          <rect
            x="713"
            y="182"
            width="58"
            height="17"
            rx="3"
            fill="#CFF7E9"
          />

          <rect
            x="719"
            y="186"
            width="28"
            height="3"
            rx="1.5"
            fill="#5CCFA2"
          />

          <rect
            x="719"
            y="192"
            width="18"
            height="2"
            rx="1"
            fill="#8EE0BF"
          />

          {/* Printer buttons */}
          <circle
            cx="805"
            cy="187"
            r="5"
            fill="#10B981"
          />

          <circle
            cx="822"
            cy="187"
            r="5"
            fill="#34D399"
          />

          <circle
            cx="839"
            cy="187"
            r="5"
            fill="#60A5FA"
          />

          <circle
            cx="856"
            cy="187"
            r="5"
            fill="#10B981"
          />

          <circle
            cx="873"
            cy="187"
            r="5"
            fill="#FBBF24"
          />

          {/* Paper output slot */}
          <rect
            x="725"
            y="209"
            width="140"
            height="18"
            rx="3"
            fill="#D4E7E1"
          />

          {/* Printed paper */}
          <path
            d="
              M742 208
              H848
              V252
              H742
              Z
            "
            fill="#FFFFFF"
            stroke="#D2E8DF"
          />

          {/* Printed image */}
          <rect
            x="754"
            y="217"
            width="82"
            height="22"
            rx="2"
            fill="#EAFBF4"
          />

          <circle
            cx="768"
            cy="224"
            r="4"
            fill="#FACC15"
          />

          <path
            d="
              M755 236
              L772 226
              L784 233
              L799 222
              L834 239
              Z
            "
            fill="#60A5FA"
          />
        </g>

        {/* =====================================================
            PAPER STACK
        ===================================================== */}
        <g filter="url(#printerSmallShadow)">
          <rect
            x="645"
            y="222"
            width="82"
            height="24"
            rx="3"
            fill="#FFFFFF"
            stroke="#D3EAE1"
          />

          <path
            d="M650 217H720"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
          />

          <path
            d="M652 213H717"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
          />

          <path
            d="M655 209H714"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>

        {/* =====================================================
            INK CARTRIDGES
        ===================================================== */}
        <g filter="url(#printerSmallShadow)">
          {/* Cyan */}
          <rect
            x="895"
            y="214"
            width="18"
            height="38"
            rx="4"
            fill="#06B6D4"
          />

          <rect
            x="898"
            y="210"
            width="12"
            height="7"
            rx="2"
            fill="#164E63"
          />

          {/* Magenta */}
          <rect
            x="918"
            y="214"
            width="18"
            height="38"
            rx="4"
            fill="#EC4899"
          />

          <rect
            x="921"
            y="210"
            width="12"
            height="7"
            rx="2"
            fill="#831843"
          />

          {/* Yellow */}
          <rect
            x="941"
            y="214"
            width="18"
            height="38"
            rx="4"
            fill="#FACC15"
          />

          <rect
            x="944"
            y="210"
            width="12"
            height="7"
            rx="2"
            fill="#854D0E"
          />

          {/* Black */}
          <rect
            x="964"
            y="214"
            width="18"
            height="38"
            rx="4"
            fill="#334155"
          />

          <rect
            x="967"
            y="210"
            width="12"
            height="7"
            rx="2"
            fill="#0F172A"
          />
        </g>

        {/* =====================================================
            BOX
        ===================================================== */}
        <g filter="url(#printerSmallShadow)">
          <path
            d="
              M995 214
              L1040 214
              L1055 224
              V260
              H995
              Z
            "
            fill="#DDAA69"
          />

          <path
            d="
              M995 214
              L1010 204
              L1055 214
              L1040 224
              Z
            "
            fill="#F0BE7D"
          />

          <path
            d="
              M1010 204
              V215
            "
            stroke="#C58D50"
            strokeWidth="2"
          />

          <path
            d="
              M995 214
              L1010 224
              L1040 224
              L1055 214
            "
            stroke="#C58D50"
            strokeWidth="1.5"
          />

          {/* Box label */}
          <rect
            x="1010"
            y="231"
            width="27"
            height="17"
            rx="2"
            fill="#FFF7ED"
          />

          <path
            d="M1017 240L1023 234L1030 240"
            stroke="#C58D50"
            strokeWidth="1.5"
          />
        </g>

        {/* =====================================================
            RIGHT SMALL TREES
        ===================================================== */}
        <g>
          <rect
            x="1085"
            y="170"
            width="7"
            height="55"
            rx="3"
            fill="#4D9574"
          />

          <path
            d="M1088 184C1073 173 1067 160 1067 146"
            stroke="#4D9574"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <path
            d="M1088 177C1102 168 1109 157 1109 143"
            stroke="#4D9574"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <circle
            cx="1085"
            cy="137"
            r="27"
            fill="#65C994"
          />

          <circle
            cx="1064"
            cy="151"
            r="20"
            fill="#86D8AA"
          />

          <circle
            cx="1107"
            cy="151"
            r="20"
            fill="#58BE89"
          />
        </g>

        {/* =====================================================
            DECORATIVE PLUS
        ===================================================== */}
        <path
          d="M1080 80H1092"
          stroke="#6EE7B7"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M1086 74V86"
          stroke="#6EE7B7"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* =====================================================
            BOTTOM BUSHES
        ===================================================== */}
        <g>
          <circle
            cx="455"
            cy="258"
            r="19"
            fill="#73CD9E"
          />

          <circle
            cx="480"
            cy="262"
            r="15"
            fill="#58C18B"
          />

          <circle
            cx="505"
            cy="258"
            r="18"
            fill="#8BD9AD"
          />

          <circle
            cx="1065"
            cy="258"
            r="19"
            fill="#73CD9E"
          />

          <circle
            cx="1090"
            cy="262"
            r="15"
            fill="#58C18B"
          />

          <circle
            cx="1115"
            cy="258"
            r="18"
            fill="#8BD9AD"
          />
        </g>

        {/* =====================================================
            GROUND
        ===================================================== */}
        <path
          d="M65 269H1145"
          stroke="#55C99A"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.8"
        />

        <path
          d="M160 275H1080"
          stroke="#B8EAD5"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default AddPrinterIllustration;
