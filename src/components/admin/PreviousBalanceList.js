import { useState, useEffect } from "react"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "../../services/authservice"
import "../../styles/pastDateRequests.css"

const PreviousBalanceList = () => {
  const [balanceData, setBalanceData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState([])

  
  const [selectedBranch, setSelectedBranch] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")

  
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  useEffect(() => {
    fetchBalanceData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [balanceData, selectedBranch, selectedStatus])

  const fetchBalanceData = async () => {
    try {
      setLoading(true)
      const balanceQuery = query(collection(db, "paymentToBeCollected"), orderBy("createdAt", "desc"))

      const balanceSnapshot = await getDocs(balanceQuery)
      const balanceList = []
      const branchSet = new Set()

      balanceSnapshot.forEach((doc) => {
        const data = doc.data()
        if (typeof data.balance === "number") {
          const paymentCollected = data.paymentCollected || 0
          const paymentToBeCollected = data.balance - paymentCollected
          const status = paymentToBeCollected <= 0 ? "finished" : "pending"

          balanceList.push({
            id: doc.id,
            branchName: data.branchName || "Unknown Branch",
            date: data.createdAt?.toDate?.() || new Date(),
            balance: data.balance,
            paymentCollected: paymentCollected,
            paymentToBeCollected: Math.max(0, paymentToBeCollected),
            status: status,
            ...data,
          })

          branchSet.add(data.branchName || "Unknown Branch")
        }
      })

      setBalanceData(balanceList)
      setBranches(Array.from(branchSet).sort())
    } catch (error) {
      console.error("Error fetching balance data:", error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...balanceData]

    if (selectedBranch) {
      filtered = filtered.filter((item) => item.branchName === selectedBranch)
    }

    if (selectedStatus) {
      filtered = filtered.filter((item) => item.status === selectedStatus)
    }

    setFilteredData(filtered)
    setCurrentPage(1) 
  }

  const clearFilters = () => {
    setSelectedBranch("")
    setSelectedStatus("")
  }

  
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

const formatDate = (date) => {
  if (!date) return "N/A"
  const safeDate = date instanceof Date ? date : new Date(date)
  return safeDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0)
  }

  const renderPaginationNumbers = () => {
    const pageNumbers = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    if (startPage > 1) {
      pageNumbers.push(
        <button key={1} onClick={() => paginate(1)} className="pagination-number">
          1
        </button>,
      )
      if (startPage > 2) {
        pageNumbers.push(
          <span key="ellipsis1" className="pagination-ellipsis">
            ...
          </span>,
        )
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => paginate(i)}
          className={`pagination-number ${currentPage === i ? "active" : ""}`}
        >
          {i}
        </button>,
      )
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageNumbers.push(
          <span key="ellipsis2" className="pagination-ellipsis">
            ...
          </span>,
        )
      }
      pageNumbers.push(
        <button key={totalPages} onClick={() => paginate(totalPages)} className="pagination-number">
          {totalPages}
        </button>,
      )
    }

    return pageNumbers
  }

  if (loading) {
    return <div className="loading-container">Loading previous balance data...</div>
  }

  return (
    <div className="past-date-requests-container">
      <h2>Previous Balance Management</h2>

      {}
      <div className="filters-container">
        <div className="filter-group">
          <label htmlFor="branch-filter">Filter by Branch:</label>
          <select
            id="branch-filter"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="filter-select"
          >
            <option value="">All Branches</option>
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter">Filter by Status:</label>
          <select
            id="status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="finished">Finished</option>
          </select>
        </div>

        <button onClick={clearFilters} className="clear-filters-btn">
          Clear Filters
        </button>
      </div>

      {}
      <div className="results-info">
        Showing <span className="filter-info">{currentItems.length}</span> of{" "}
        <span className="filter-info">{filteredData.length}</span> previous balance entries
        {(selectedBranch || selectedStatus) && (
          <span>
            {" "}
            (filtered by{" "}
            {[selectedBranch && `branch: ${selectedBranch}`, selectedStatus && `status: ${selectedStatus}`]
              .filter(Boolean)
              .join(", ")}
            )
          </span>
        )}
      </div>

      {}
      <div className="stock-table-wrapper">
        <table className="stock-readings-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Branch Name</th>
              <th>Date</th>
              <th>Balance</th>
              <th>Payment Collected</th>
              <th>Payment To Be Collected</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((item, index) => (
                <tr key={item.id}>
                  <td style={{textAlign: "center"}}>{indexOfFirstItem + index + 1}</td>
                  <td>{item.branchName}</td>
                  <td>{formatDate(item.date)}</td>
                  <td>
                    <span className="qty-badge">
                      {formatCurrency(item.balance)}
                    </span>
                  </td>
                  <td>
                    <span className="qty-badge">
                      {formatCurrency(item.paymentCollectedTillNow)}
                    </span>
                  </td>
                  <td>
                    <span className="qty-badge">
                      {formatCurrency(item.paymentToBeCollected)}
                    </span>
                  </td>
                  <td>
                    <span className={`qty-badge ${item.status === 'finished' ? 'finished' : ''}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: "center" }}>
                  No previous balance data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {}
      {totalPages > 1 && (
        <div className="pagination-container">
          <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="pagination-btn">
            Previous
          </button>

          <div className="pagination-numbers">{renderPaginationNumbers()}</div>

          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default PreviousBalanceList