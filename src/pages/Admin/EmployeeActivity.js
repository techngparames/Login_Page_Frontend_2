
// frontend/src/pages/Admin/EmployeeActivity.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const EmployeeActivity = () => {
  const [activity, setActivity] = useState([]);
  const [singleActivity, setSingleActivity] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  // ================= FETCH ALL EMPLOYEE ACTIVITY =================
  const fetchActivity = async () => {
    try {
      const res = await axios.get("http://localhost:5050/api/admin/employee-activity");
      if (res.data.success) {
        const allActivities = [];
        res.data.employees.forEach(emp => {
          if (emp.loginHistory && emp.loginHistory.length > 0) {
            emp.loginHistory.forEach(entry => {
              allActivities.push({
                name: emp.name,
                employeeId: emp.employeeId,
                email: emp.email,
                date: entry.loginTime ? new Date(entry.loginTime).toLocaleDateString() : "-",
                loginTime: entry.loginTime ? new Date(entry.loginTime).toLocaleTimeString() : "-",
                logoutTime: entry.logoutTime ? new Date(entry.logoutTime).toLocaleTimeString() : "-",
                pauseTime: entry.pauseTime ? new Date(entry.pauseTime).toLocaleTimeString() : "-",
              });
            });
          }
        });
        setActivity(allActivities);
      }
    } catch (err) {
      console.error("Error fetching activity:", err);
    }
  };

  // ================= FETCH SELECTED EMPLOYEE ACTIVITY =================
  const fetchSelectedEmployeeActivity = async () => {
    if (!selectedEmployeeId) return alert("Please enter Employee ID!");
    try {
      const res = await axios.get("http://localhost:5050/api/admin/employee-activity");
      if (res.data.success) {
        const emp = res.data.employees.find(e => e.employeeId === selectedEmployeeId);
        if (!emp || !emp.loginHistory || emp.loginHistory.length === 0) {
          setSingleActivity([]);
          return alert("No activity found for this employee!");
        }
        const activities = emp.loginHistory.map(entry => ({
          name: emp.name,
          employeeId: emp.employeeId,
          email: emp.email,
          date: entry.loginTime ? new Date(entry.loginTime).toLocaleDateString() : "-",
          loginTime: entry.loginTime ? new Date(entry.loginTime).toLocaleTimeString() : "-",
          logoutTime: entry.logoutTime ? new Date(entry.logoutTime).toLocaleTimeString() : "-",
          pauseTime: entry.pauseTime ? new Date(entry.pauseTime).toLocaleTimeString() : "-",
        }));
        setSingleActivity(activities);
      }
    } catch (err) {
      console.error("Error fetching selected employee activity:", err);
    }
  };

  // ================= EXPORT PDF =================
  const exportPDF = (data, title) => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);

    const tableColumn = ["Date", "Employee Name", "EmpID", "Email", "Login Time", "Logout Time", "Pause Time"];
    const tableRows = data.map(emp => [
      emp.date,
      emp.name,
      emp.employeeId,
      emp.email,
      emp.loginTime,
      emp.logoutTime,
      emp.pauseTime,
    ]);

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    doc.save(`${title.replaceAll(" ", "_")}.pdf`);
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  return (
    <AdminLayout>
      <div style={{ fontFamily: "'Poppins', sans-serif" }}>
        <h1 style={{ color: "#0047ab", marginBottom: "20px" }}>Employee Activity</h1>

        {/* ================= EXPORT BUTTONS ================= */}
        <div style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap" }}>
          <button onClick={() => exportPDF(activity, "All Employees Activity")} style={styles.exportButton}>
            Export All Employees
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              placeholder="Enter Employee ID"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              style={styles.input}
            />
            <button onClick={fetchSelectedEmployeeActivity} style={styles.exportButton}>
              Get Selected Employee
            </button>
            {singleActivity.length > 0 && (
              <button onClick={() => exportPDF(singleActivity, `${singleActivity[0].name} Activity`)} style={styles.exportButton}>
                Export Selected Employee
              </button>
            )}
          </div>
        </div>

        {/* ================= ACTIVITY TABLE ================= */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr style={{ backgroundColor: "#0047ab", color: "#fff" }}>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Employee Name</th>
                <th style={styles.th}>EmpID</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Login Time</th>
                <th style={styles.th}>Logout Time</th>
                <th style={styles.th}>Pause Time</th>
              </tr>
            </thead>
            <tbody>
              {(singleActivity.length > 0 ? singleActivity : activity).length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                    No Activity Found
                  </td>
                </tr>
              ) : (
                (singleActivity.length > 0 ? singleActivity : activity).map((emp, index) => (
                  <tr key={index} style={{ textAlign: "center" }}>
                    <td style={styles.td}>{emp.date}</td>
                    <td style={styles.td}>{emp.name}</td>
                    <td style={styles.td}>{emp.employeeId}</td>
                    <td style={styles.td}>{emp.email}</td>
                    <td style={styles.td}>{emp.loginTime}</td>
                    <td style={styles.td}>{emp.logoutTime}</td>
                    <td style={styles.td}>{emp.pauseTime}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

const styles = {
  exportButton: {
    backgroundColor: "#1a73e8",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  th: { padding: "10px" },
  td: { padding: "10px", borderBottom: "1px solid #ddd" },
};

export default EmployeeActivity;