import React from "react";

const AddAssestIllustration = ({
  className = "",
  style = {},
  height = 88,
  width = 188,
  ...rest
}) => {
  const containerHeight = typeof height === "number" ? `${height}px` : height;
  const containerWidth = typeof width === "number" ? `${width}px` : width;
  return (
    <div
      className={`add-asset-illustration ${className}`.trim()}
      style={{
        width: containerWidth,
        height: containerHeight,
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
        ...style,
      }}
      {...rest}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1500 700"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      >
        {/* =====================================================
            DEFINITIONS
        ===================================================== */}

        <defs>
          <linearGradient
            id="bg"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="#F1FBF5" />
            <stop offset="100%" stopColor="#DDF5E7" />
          </linearGradient>

          <linearGradient
            id="green"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="#087D4D" />
            <stop offset="100%" stopColor="#16B86B" />
          </linearGradient>

          <linearGradient
            id="darkGreen"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#0B6E46" />
            <stop offset="100%" stopColor="#064A31" />
          </linearGradient>

          <linearGradient
            id="printer"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#414B50" />
            <stop offset="100%" stopColor="#1C2428" />
          </linearGradient>

          <filter
            id="shadow"
            x="-30%"
            y="-30%"
            width="160%"
            height="170%"
          >
            <feDropShadow
              dx="0"
              dy="10"
              stdDeviation="14"
              floodColor="#075B38"
              floodOpacity="0.16"
            />
          </filter>

          <filter
            id="smallShadow"
            x="-30%"
            y="-30%"
            width="160%"
            height="170%"
          >
            <feDropShadow
              dx="0"
              dy="5"
              stdDeviation="7"
              floodColor="#075B38"
              floodOpacity="0.12"
            />
          </filter>
        </defs>

        {/* =====================================================
            BACKGROUND
        ===================================================== */}

        <rect
          width="1500"
          height="700"
          rx="28"
          fill="url(#bg)"
        />

        <circle
          cx="160"
          cy="170"
          r="210"
          fill="#D4F1E0"
        />

        <circle
          cx="1360"
          cy="530"
          r="240"
          fill="#D4F1E0"
        />

        <path
          d="M0 160C250 40 390 100 570 180C760 265 930 220 1100 130C1250 55 1380 80 1500 140V0H0V160Z"
          fill="#E9F9F0"
        />

        {/* =====================================================
            PRINT SHOP SIGN
        ===================================================== */}

        <g filter="url(#smallShadow)">
          <rect
            x="55"
            y="45"
            width="350"
            height="82"
            rx="16"
            fill="#FFFFFF"
          />

          <rect
            x="55"
            y="45"
            width="12"
            height="82"
            rx="6"
            fill="#159C60"
          />

          {/* printer icon */}
          <rect
            x="88"
            y="74"
            width="50"
            height="30"
            rx="6"
            fill="#159C60"
          />

          <rect
            x="98"
            y="62"
            width="31"
            height="20"
            rx="4"
            fill="#159C60"
          />

          <rect
            x="99"
            y="91"
            width="29"
            height="6"
            rx="2"
            fill="#FFFFFF"
          />

          <text
            x="158"
            y="96"
            fontSize="31"
            fontWeight="800"
            fill="#0C5F3D"
          >
            PRINT SHOP
          </text>
        </g>

        {/* =====================================================
            STORAGE RACK
        ===================================================== */}

        <g filter="url(#shadow)">
          <rect
            x="50"
            y="155"
            width="430"
            height="400"
            rx="18"
            fill="#0C7549"
          />

          <rect
            x="70"
            y="175"
            width="390"
            height="360"
            rx="12"
            fill="#F9FFFB"
          />

          {/* shelves */}
          <rect
            x="70"
            y="285"
            width="390"
            height="9"
            fill="#BDE3CE"
          />

          <rect
            x="70"
            y="400"
            width="390"
            height="9"
            fill="#BDE3CE"
          />

          <rect
            x="70"
            y="505"
            width="390"
            height="9"
            fill="#BDE3CE"
          />

          {/* =================================================
              INK CARTRIDGES
          ================================================= */}

          <rect
            x="92"
            y="195"
            width="47"
            height="72"
            rx="8"
            fill="#252D31"
          />

          <rect
            x="148"
            y="195"
            width="47"
            height="72"
            rx="8"
            fill="#27A8D0"
          />

          <rect
            x="204"
            y="195"
            width="47"
            height="72"
            rx="8"
            fill="#E65187"
          />

          <rect
            x="260"
            y="195"
            width="47"
            height="72"
            rx="8"
            fill="#E5B92C"
          />

          {/* cartridge highlights */}
          <rect
            x="104"
            y="208"
            width="23"
            height="26"
            rx="4"
            fill="#3B4549"
          />

          <rect
            x="160"
            y="208"
            width="23"
            height="26"
            rx="4"
            fill="#BDEEFF"
          />

          <rect
            x="216"
            y="208"
            width="23"
            height="26"
            rx="4"
            fill="#FFE0EC"
          />

          <rect
            x="272"
            y="208"
            width="23"
            height="26"
            rx="4"
            fill="#FFF2AF"
          />

          {/* Toners */}
          <rect
            x="325"
            y="205"
            width="105"
            height="35"
            rx="7"
            fill="#242D31"
          />

          <rect
            x="325"
            y="246"
            width="105"
            height="35"
            rx="7"
            fill="#313B40"
          />

          {/* =================================================
              PAPER
          ================================================= */}

          <rect
            x="95"
            y="315"
            width="150"
            height="72"
            rx="8"
            fill="#FFFFFF"
            stroke="#C6E4D2"
          />

          <path
            d="M95 315H245V335H95Z"
            fill="#159C60"
          />

          <text
            x="170"
            y="366"
            textAnchor="middle"
            fontSize="31"
            fontWeight="900"
            fill="#158B56"
          >
            A4
          </text>

          <text
            x="170"
            y="382"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="#65766D"
          >
            COPY PAPER
          </text>

          <rect
            x="265"
            y="315"
            width="150"
            height="72"
            rx="8"
            fill="#FFFFFF"
            stroke="#C6E4D2"
          />

          <path
            d="M265 315H415V335H265Z"
            fill="#75CDA0"
          />

          <text
            x="340"
            y="366"
            textAnchor="middle"
            fontSize="31"
            fontWeight="900"
            fill="#158B56"
          >
            A3
          </text>

          <text
            x="340"
            y="382"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="#65766D"
          >
            COPY PAPER
          </text>

          {/* =================================================
              INK BOTTLES
          ================================================= */}

          <g>
            <rect
              x="98"
              y="425"
              width="48"
              height="70"
              rx="8"
              fill="#242C30"
            />

            <rect
              x="158"
              y="425"
              width="48"
              height="70"
              rx="8"
              fill="#2498D0"
            />

            <rect
              x="218"
              y="425"
              width="48"
              height="70"
              rx="8"
              fill="#E44E86"
            />

            <rect
              x="278"
              y="425"
              width="48"
              height="70"
              rx="8"
              fill="#E6B829"
            />

            {/* caps */}
            <rect
              x="108"
              y="414"
              width="28"
              height="15"
              rx="4"
              fill="#343C40"
            />

            <rect
              x="168"
              y="414"
              width="28"
              height="15"
              rx="4"
              fill="#187CA9"
            />

            <rect
              x="228"
              y="414"
              width="28"
              height="15"
              rx="4"
              fill="#C33C6C"
            />

            <rect
              x="288"
              y="414"
              width="28"
              height="15"
              rx="4"
              fill="#B8921C"
            />

            {/* drops */}
            <circle
              cx="122"
              cy="450"
              r="8"
              fill="#FFFFFF"
            />

            <circle
              cx="182"
              cy="450"
              r="8"
              fill="#FFFFFF"
            />

            <circle
              cx="242"
              cy="450"
              r="8"
              fill="#FFFFFF"
            />

            <circle
              cx="302"
              cy="450"
              r="8"
              fill="#FFFFFF"
            />
          </g>
        </g>

        {/* =====================================================
            ASSET LABELS - LEFT
        ===================================================== */}

        <AssetLabel
          x={25}
          y={140}
          width={145}
          text="Ink Cartridges"
        />

        <AssetLabel
          x={285}
          y={140}
          width={135}
          text="Toner"
        />

        <AssetLabel
          x={25}
          y={390}
          width={125}
          text="A4 / A3 Paper"
        />

        <AssetLabel
          x={330}
          y={510}
          width={120}
          text="Ink Bottles"
        />

        {/* =====================================================
            PERSON
        ===================================================== */}

        <g>
          {/* body */}
          <path
            d="M500 305C535 270 620 270 655 310L685 550H475L500 305Z"
            fill="#18A866"
          />

          {/* apron */}
          <path
            d="M530 315H625L650 555H500L530 315Z"
            fill="#075A3B"
          />

          {/* neck */}
          <rect
            x="550"
            y="245"
            width="52"
            height="55"
            rx="12"
            fill="#EBA27C"
          />

          {/* face */}
          <ellipse
            cx="577"
            cy="195"
            rx="67"
            ry="74"
            fill="#F2AD85"
          />

          {/* hair */}
          <path
            d="M510 190C507 132 540 105 583 112C625 119 649 151 637 194C620 169 601 160 579 162C552 164 532 179 510 190Z"
            fill="#1E272B"
          />

          <path
            d="M529 147C548 120 574 115 600 123"
            stroke="#3A4449"
            strokeWidth="9"
            strokeLinecap="round"
          />

          {/* eyes */}
          <ellipse
            cx="553"
            cy="198"
            rx="6"
            ry="8"
            fill="#202427"
          />

          <ellipse
            cx="602"
            cy="198"
            rx="6"
            ry="8"
            fill="#202427"
          />

          {/* smile */}
          <path
            d="M558 232C571 243 591 243 604 230"
            stroke="#824938"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* shirt */}
          <path
            d="M525 287L577 318L629 287"
            stroke="#0A7449"
            strokeWidth="10"
          />

          {/* arms */}
          <path
            d="M512 315C475 345 475 395 520 414"
            stroke="#F2AD85"
            strokeWidth="29"
            strokeLinecap="round"
          />

          <path
            d="M635 315C677 342 697 380 665 414"
            stroke="#F2AD85"
            strokeWidth="29"
            strokeLinecap="round"
          />

          {/* clipboard */}
          <g transform="rotate(7 650 385)">
            <rect
              x="610"
              y="325"
              width="105"
              height="145"
              rx="11"
              fill="#263239"
              filter="url(#smallShadow)"
            />

            <rect
              x="623"
              y="340"
              width="79"
              height="113"
              rx="6"
              fill="#FFFFFF"
            />

            <rect
              x="642"
              y="360"
              width="42"
              height="8"
              rx="4"
              fill="#18A866"
            />

            <rect
              x="642"
              y="381"
              width="47"
              height="6"
              rx="3"
              fill="#D1E9DD"
            />

            <rect
              x="642"
              y="398"
              width="38"
              height="6"
              rx="3"
              fill="#D1E9DD"
            />

            <rect
              x="642"
              y="415"
              width="28"
              height="6"
              rx="3"
              fill="#D1E9DD"
            />
          </g>
        </g>

        {/* =====================================================
            MAIN PRINTER
        ===================================================== */}

        <g filter="url(#shadow)">
          <ellipse
            cx="390"
            cy="630"
            rx="220"
            ry="25"
            fill="#B8DAC9"
          />

          {/* body */}
          <rect
            x="100"
            y="505"
            width="440"
            height="115"
            rx="24"
            fill="url(#printer)"
          />

          {/* top */}
          <rect
            x="135"
            y="455"
            width="370"
            height="75"
            rx="20"
            fill="#424D52"
          />

          {/* paper */}
          <rect
            x="185"
            y="415"
            width="270"
            height="100"
            rx="8"
            fill="#FFFFFF"
          />

          <path
            d="M220 445H420"
            stroke="#D5EADF"
            strokeWidth="7"
            strokeLinecap="round"
          />

          <path
            d="M220 464H380"
            stroke="#D5EADF"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* output */}
          <rect
            x="180"
            y="585"
            width="285"
            height="75"
            rx="5"
            fill="#FFFFFF"
          />

          <rect
            x="220"
            y="605"
            width="190"
            height="7"
            rx="3"
            fill="#D7ECE1"
          />

          <rect
            x="220"
            y="621"
            width="140"
            height="7"
            rx="3"
            fill="#D7ECE1"
          />

          {/* control panel */}
          <rect
            x="455"
            y="530"
            width="55"
            height="40"
            rx="9"
            fill="#1C2529"
          />

          <circle
            cx="473"
            cy="550"
            r="6"
            fill="#1DB473"
          />

          <circle
            cx="491"
            cy="550"
            r="6"
            fill="#8BDCB4"
          />
        </g>

        {/* =====================================================
            TONER STOCK
        ===================================================== */}

        <g filter="url(#smallShadow)">
          <rect
            x="555"
            y="510"
            width="85"
            height="110"
            rx="10"
            fill="#20292D"
          />

          <rect
            x="650"
            y="510"
            width="85"
            height="110"
            rx="10"
            fill="#242D31"
          />

          <rect
            x="745"
            y="510"
            width="85"
            height="110"
            rx="10"
            fill="#222B2F"
          />

          <rect
            x="570"
            y="550"
            width="55"
            height="20"
            rx="5"
            fill="#26A8D2"
          />

          <rect
            x="665"
            y="550"
            width="55"
            height="20"
            rx="5"
            fill="#E34F87"
          />

          <rect
            x="760"
            y="550"
            width="55"
            height="20"
            rx="5"
            fill="#E4BB2C"
          />
        </g>

        <AssetLabel
          x={555}
          y={475}
          width={145}
          text="Toner Cartridges"
        />

        {/* =====================================================
            A4 PAPER BOX
        ===================================================== */}

        <g filter="url(#smallShadow)">
          <rect
            x="850"
            y="510"
            width="210"
            height="110"
            rx="12"
            fill="#E3B674"
          />

          <rect
            x="875"
            y="530"
            width="160"
            height="70"
            rx="8"
            fill="#FFF0D3"
          />

          <text
            x="955"
            y="570"
            textAnchor="middle"
            fontSize="33"
            fontWeight="900"
            fill="#168957"
          >
            A4
          </text>

          <text
            x="955"
            y="588"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="#69796F"
          >
            PAPER STOCK
          </text>
        </g>

        <AssetLabel
          x={865}
          y={475}
          width={115}
          text="Photo Paper"
        />

        {/* =====================================================
            STOCK BOXES
        ===================================================== */}

        <g filter="url(#smallShadow)">
          <rect
            x="1080"
            y="505"
            width="180"
            height="115"
            rx="13"
            fill="#D7A15D"
          />

          <rect
            x="1105"
            y="532"
            width="130"
            height="65"
            rx="8"
            fill="#EBC58C"
          />

          {/* printer mark */}
          <rect
            x="1145"
            y="548"
            width="50"
            height="28"
            rx="6"
            fill="#987142"
          />

          <rect
            x="1154"
            y="540"
            width="32"
            height="13"
            rx="4"
            fill="#987142"
          />

          {/* second box */}
          <rect
            x="1265"
            y="530"
            width="150"
            height="90"
            rx="13"
            fill="#DDA765"
          />

          <rect
            x="1285"
            y="550"
            width="110"
            height="50"
            rx="8"
            fill="#ECC78F"
          />
        </g>

        <AssetLabel
          x={1120}
          y={470}
          width={130}
          text="Stock Boxes"
        />

        {/* =====================================================
            ADD STOCK UI PANEL
        ===================================================== */}

        <g filter="url(#shadow)">
          {/* panel */}
          <rect
            x="820"
            y="95"
            width="555"
            height="375"
            rx="28"
            fill="#FFFFFF"
            stroke="#CBEBDC"
            strokeWidth="2"
          />

          {/* header */}
          <path
            d="M820 125C820 108 833 95 850 95H1345C1362 95 1375 108 1375 125V143H820V125Z"
            fill="url(#green)"
          />

          <circle
            cx="850"
            cy="119"
            r="6"
            fill="#FFFFFF"
          />

          <circle
            cx="872"
            cy="119"
            r="6"
            fill="#BCEFD3"
          />

          <circle
            cx="894"
            cy="119"
            r="6"
            fill="#7ED7A9"
          />

          {/* printer icon */}
          <circle
            cx="915"
            cy="210"
            r="62"
            fill="#E0F6E9"
          />

          <rect
            x="877"
            y="200"
            width="76"
            height="47"
            rx="9"
            fill="#11965B"
          />

          <rect
            x="890"
            y="180"
            width="50"
            height="28"
            rx="6"
            fill="#11965B"
          />

          <rect
            x="892"
            y="222"
            width="45"
            height="9"
            rx="3"
            fill="#FFFFFF"
          />

          {/* plus */}
          <circle
            cx="955"
            cy="245"
            r="23"
            fill="#18AA67"
          />

          <path
            d="M955 232V258M942 245H968"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* title */}
          <text
            x="1005"
            y="185"
            fontSize="40"
            fontWeight="800"
            fill="#0C4930"
          >
            Add Stock
          </text>

          <text
            x="1005"
            y="216"
            fontSize="16"
            fill="#6C7D74"
          >
            Add new stock items to your inventory
          </text>

          {/* input 1 */}
          <rect
            x="1005"
            y="242"
            width="325"
            height="47"
            rx="11"
            fill="#F0F9F4"
          />

          <rect
            x="1024"
            y="259"
            width="130"
            height="8"
            rx="4"
            fill="#B7DCC8"
          />

          {/* input 2 */}
          <rect
            x="1005"
            y="300"
            width="325"
            height="47"
            rx="11"
            fill="#F0F9F4"
          />

          <rect
            x="1024"
            y="317"
            width="175"
            height="8"
            rx="4"
            fill="#B7DCC8"
          />

          {/* input 3 */}
          <rect
            x="1005"
            y="358"
            width="325"
            height="47"
            rx="11"
            fill="#F0F9F4"
          />

          <rect
            x="1024"
            y="375"
            width="105"
            height="8"
            rx="4"
            fill="#B7DCC8"
          />

          {/* add button */}
          <rect
            x="1005"
            y="420"
            width="325"
            height="55"
            rx="13"
            fill="url(#green)"
          />

          <circle
            cx="1045"
            cy="447"
            r="11"
            fill="#FFFFFF"
          />

          <path
            d="M1045 440V454M1038 447H1052"
            stroke="#11945A"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <text
            x="1170"
            y="455"
            textAnchor="middle"
            fontSize="18"
            fontWeight="800"
            fill="#FFFFFF"
          >
            Add Stock
          </text>
        </g>

        {/* =====================================================
            RIGHT SIDE WORKFLOW ICONS
        ===================================================== */}

        {/* Barcode */}
        <WorkflowIcon
          x={1400}
          y={130}
          title="Barcode"
          type="barcode"
        />

        {/* CSV */}
        <WorkflowIcon
          x={1400}
          y={250}
          title="CSV Upload"
          type="document"
        />

        {/* Bulk */}
        <WorkflowIcon
          x={1400}
          y={370}
          title="Bulk Stock"
          type="box"
        />

        {/* Updated */}
        <WorkflowIcon
          x={1400}
          y={490}
          title="Updated"
          type="check"
        />

        {/* =====================================================
            DOTTED WORKFLOW LINE
        ===================================================== */}

        <path
          d="M1400 170V215"
          stroke="#159B60"
          strokeWidth="3"
          strokeDasharray="6 8"
        />

        <path
          d="M1400 290V335"
          stroke="#159B60"
          strokeWidth="3"
          strokeDasharray="6 8"
        />

        <path
          d="M1400 410V455"
          stroke="#159B60"
          strokeWidth="3"
          strokeDasharray="6 8"
        />
      </svg>
    </div>
  );
};

/* =========================================================
   ASSET LABEL
========================================================= */

const AssetLabel = ({
  x,
  y,
  width,
  text,
}) => {
  return (
    <g filter="url(#smallShadow)">
      <rect
        x={x}
        y={y}
        width={width}
        height="38"
        rx="19"
        fill="#FFFFFF"
        stroke="#CDEBDD"
        strokeWidth="2"
      />

      <circle
        cx={x + 20}
        cy={y + 19}
        r="7"
        fill="#159C60"
      />

      <text
        x={x + 36}
        y={y + 25}
        fontSize="13"
        fontWeight="700"
        fill="#155B3D"
      >
        {text}
      </text>
    </g>
  );
};

/* =========================================================
   WORKFLOW ICON
========================================================= */

const WorkflowIcon = ({
  x,
  y,
  title,
  type,
}) => {
  return (
    <g filter="url(#smallShadow)">
      <circle
        cx={x}
        cy={y}
        r="42"
        fill="#FFFFFF"
        stroke="#CBEADB"
        strokeWidth="3"
      />

      {type === "barcode" && (
        <>
          <rect
            x={x - 17}
            y={y - 22}
            width="4"
            height="44"
            fill="#14955B"
          />
          <rect
            x={x - 9}
            y={y - 22}
            width="3"
            height="44"
            fill="#14955B"
          />
          <rect
            x={x - 2}
            y={y - 22}
            width="6"
            height="44"
            fill="#14955B"
          />
          <rect
            x={x + 8}
            y={y - 22}
            width="3"
            height="44"
            fill="#14955B"
          />
          <rect
            x={x + 15}
            y={y - 22}
            width="5"
            height="44"
            fill="#14955B"
          />
        </>
      )}

      {type === "document" && (
        <>
          <path
            d={`M${x - 18} ${y - 23}
                H${x + 8}
                L${x + 19} ${y - 12}
                V${y + 23}
                H${x - 18}
                Z`}
            fill="#159B60"
          />

          <path
            d={`M${x + 8} ${y - 23}
                V${y - 12}
                H${x + 19}`}
            stroke="#FFFFFF"
            strokeWidth="3"
          />

          <rect
            x={x - 10}
            y={y - 2}
            width="20"
            height="4"
            rx="2"
            fill="#FFFFFF"
          />

          <rect
            x={x - 10}
            y={y + 8}
            width="17"
            height="4"
            rx="2"
            fill="#FFFFFF"
          />
        </>
      )}

      {type === "box" && (
        <>
          <path
            d={`M${x - 22} ${y - 12}
                L${x} ${y - 25}
                L${x + 22} ${y - 12}
                V${y + 15}
                L${x} ${y + 28}
                L${x - 22} ${y + 15}
                Z`}
            fill="#159B60"
          />

          <path
            d={`M${x - 22} ${y - 12}
                L${x} ${y + 1}
                L${x + 22} ${y - 12}`}
            stroke="#FFFFFF"
            strokeWidth="2"
          />

          <path
            d={`M${x} ${y + 1}V${y + 28}`}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        </>
      )}

      {type === "check" && (
        <>
          <circle
            cx={x}
            cy={y}
            r="26"
            fill="#159B60"
          />

          <path
            d={`M${x - 13} ${y}
                L${x - 4} ${y + 10}
                L${x + 16} ${y - 12}`}
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      <text
        x={x}
        y={y + 61}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#18764C"
      >
        {title}
      </text>
    </g>
  );
};

export const AddAssetsIllustration = AddAssestIllustration;
export default AddAssestIllustration;
