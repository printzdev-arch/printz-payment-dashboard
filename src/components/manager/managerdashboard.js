import { useState, useEffect } from "react"
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore"
import { db, auth } from "../../services/authservice"
import "../../styles/managerdashboard.css"
import { Calendar, Printer, DollarSign, Package, TrendingUp, Users, Clock } from "lucide-react"

const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) {
    return "₹0"
  }
  let [integer, decimal] = Number.parseFloat(amount).toFixed(0).split(".")
  integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")

  if (integer.length > 4 && integer.includes(",,")) {
    integer = integer.replace(",,", ",")
  }

  return `₹${integer}${decimal ? "." + decimal : ""}`
}

const ManagerDashboard = () => {
  const [branchName, setBranchName] = useState("")
  const [userInfo, setUserInfo] = useState({ name: "", email: "", phone: "" })
  const [activePrinterCount, setActivePrinterCount] = useState(0)
  const [jumboXeroxCount, setJumboXeroxCount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [stockCount, setStockCount] = useState(0)
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true)
      try {
        const user = auth.currentUser
        if (user) {
          const userDoc = doc(db, "users", user.uid)
          const userSnapshot = await getDoc(userDoc)
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data()
            setBranchName(userData.branch)
            setUserInfo({
              name: userData.name || "N/A",
              email: user.email,
              phone: userData.phone || "N/A",
            })
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    fetchUserData()
  }, [])

  useEffect(() => {
    if (!branchName) return

    const fetchDashboardData = async () => {
      try {
        
        
        const printersQuery = query(collection(db, "printers"), where("branchName", "==", branchName))
        const printersSnapshot = await getDocs(printersQuery)
        
        let activePrinters = 0
        let jumboXeroxPrinters = 0
        
        printersSnapshot.docs.forEach((doc) => {
          const printerData = doc.data()
          if ((printerData.printerType === "MFP" || printerData.printerType==="SFP") && printerData.isActive === true) {
            activePrinters++
          }
          if (printerData.printerType === "LFP" && printerData.isActive === true) {
            jumboXeroxPrinters++
          }
        })
        
        setActivePrinterCount(activePrinters)
        setJumboXeroxCount(jumboXeroxPrinters)

        
        const totalAmountQuery = query(collection(db, "totalAmountReadings"), where("branchName", "==", branchName))
        const totalAmountSnapshot = await getDocs(totalAmountQuery)
        const totalAmountData = totalAmountSnapshot.docs.map((doc) => doc.data())

        let totalBranchRevenue = 0
        totalAmountData.forEach((data) => {
          totalBranchRevenue += data.totalAmount || 0
        })
        setTotalAmount(totalBranchRevenue)

        
        const stockQuery = query(collection(db, "stocks"), where("branchName", "==", branchName))
        const stockSnapshot = await getDocs(stockQuery)
        setStockCount(stockSnapshot.size)

        
        const today = new Date()
        const todayString = today.toISOString().split("T")[0]

        const todayAmountQuery = query(
          collection(db, "totalAmountReadings"),
          where("branchName", "==", branchName),
          where("date", "==", todayString),
        )

        const todayAmountSnapshot = await getDocs(todayAmountQuery)
        let todayTotal = 0
        todayAmountSnapshot.docs.forEach((doc) => {
          todayTotal += doc.data().totalAmount || 0
        })
        setTodayRevenue(todayTotal)

        
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0]

        const monthlyAmountQuery = query(
          collection(db, "totalAmountReadings"),
          where("branchName", "==", branchName),
          where("date", ">=", firstDayOfMonth),
          where("date", "<=", lastDayOfMonth),
        )

        const monthlyAmountSnapshot = await getDocs(monthlyAmountQuery)
        let monthlyTotal = 0
        monthlyAmountSnapshot.docs.forEach((doc) => {
          monthlyTotal += doc.data().totalAmount || 0
        })
        setMonthlyRevenue(monthlyTotal)

        
        const activities = []

        
        const recentPrinterReadingsQuery = query(
          collection(db, "printerReadings"),
          where("branchName", "==", branchName),
        )
        const printerReadingsSnapshot = await getDocs(recentPrinterReadingsQuery)

        printerReadingsSnapshot.docs.forEach((doc) => {
          const data = doc.data()
          if (data.lastUpdated) {
            activities.push({
              id: doc.id,
              type: "Printer Reading",
              description: `Updated printer readings`,
              date: data.date,
              timestamp: new Date(data.lastUpdated),
            })
          }
        })

        
        const recentStockReadingsQuery = query(
          collection(db, "stockReadings"),
          where("branchName", "==", branchName),
        )
        const stockReadingsSnapshot = await getDocs(recentStockReadingsQuery)

        stockReadingsSnapshot.docs.forEach((doc) => {
          const data = doc.data()
          if (data.lastUpdated) {
            activities.push({
              id: doc.id + "_stock",
              type: "Stock Reading",
              description: `Updated stock readings - ${data.stocks?.length || 0} items`,
              date: data.date,
              timestamp: new Date(data.lastUpdated),
            })
          }
        })

        
        const recentJumboReadingsQuery = query(
          collection(db, "jumboXeroxReadings"),
          where("branchName", "==", branchName),
        )
        const jumboReadingsSnapshot = await getDocs(recentJumboReadingsQuery)

        jumboReadingsSnapshot.docs.forEach((doc) => {
          const data = doc.data()
          if (data.lastUpdated) {
            activities.push({
              id: doc.id + "_jumbo",
              type: "Larger Format Reading",
              description: `Updated larger format reading`,
              date: data.date,
              timestamp: new Date(data.lastUpdated),
            })
          }
        })

        
        activities.sort((a, b) => b.timestamp - a.timestamp)
        setRecentActivity(activities.slice(0, 5))

        setLoading(false)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [branchName])

  if (loading) {
    return (
      <div className="manager-dashboard-loading">
        <div className="manager-dashboard-loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    )
  }

  return (
    <div className="printer-main-container">
      <div className="manager-dashboard-header">
        <h1>Manager Dashboard</h1>
        <div className="manager-dashboard-date">
          <Calendar className="manager-dashboard-icon" />
          <span>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="manager-dashboard-welcome">
        <h2>Welcome back, {userInfo.name}!</h2>
        <p>Branch: {branchName}</p>
      </div>

      <div className="manager-dashboard-stats">
        <div className="manager-dashboard-stat-card">
          <div className="manager-dashboard-stat-icon">
            <Printer size={24} />
          </div>
          <div className="manager-dashboard-stat-content">
            <h3>Active Printers</h3>
            <p className="manager-dashboard-stat-value">{activePrinterCount}</p>
          </div>
        </div>

        <div className="manager-dashboard-stat-card">
          <div className="manager-dashboard-stat-icon">
            <Package size={24} />
          </div>
          <div className="manager-dashboard-stat-content">
            <h3>Stock Items</h3>
            <p className="manager-dashboard-stat-value">{stockCount}</p>
          </div>
        </div>

        <div className="manager-dashboard-stat-card">
          <div className="manager-dashboard-stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="manager-dashboard-stat-content">
            <h3>Large format Printers</h3>
            <p className="manager-dashboard-stat-value">{jumboXeroxCount}</p>
          </div>
        </div>

        <div className="manager-dashboard-stat-card">
          <div className="manager-dashboard-stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="manager-dashboard-stat-content">
            <h3>Today's Revenue</h3>
            <p className="manager-dashboard-stat-value">{formatCurrency(todayRevenue)}</p>
          </div>
        </div>
      </div>

      <div className="manager-dashboard-sections">
        <div className="manager-dashboard-section manager-dashboard-user-section">
          <div className="manager-dashboard-section-header">
            <h2>User Information</h2>
          </div>
          <div className="manager-dashboard-user-info">
            <div className="manager-dashboard-user-avatar">
              <Users size={48} />
            </div>
            <div className="manager-dashboard-user-details">
              <p>
                <strong>Name:</strong> {userInfo.name}
              </p>
              <p>
                <strong>Email:</strong> {userInfo.email}
              </p>
              <p>
                <strong>Phone:</strong> {userInfo.phone}
              </p>
            </div>
          </div>
        </div>

        <div className="manager-dashboard-section manager-dashboard-activity-section">
          <div className="manager-dashboard-section-header">
            <h2>Recent Activity</h2>
          </div>
          <div className="manager-dashboard-activity-container">
            {recentActivity.length > 0 ? (
              <div className="manager-dashboard-activity-list">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="manager-dashboard-activity-item">
                    <div className="manager-dashboard-activity-icon">
                      <Clock size={18} />
                    </div>
                    <div className="manager-dashboard-activity-content">
                      <p className="manager-dashboard-activity-title">
                        {activity.type}
                      </p>
                      <p className="manager-dashboard-activity-subtitle">
                        {activity.description} • {activity.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="manager-dashboard-no-activity-container">
                <p className="manager-dashboard-no-activity">No recent activity found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManagerDashboard
