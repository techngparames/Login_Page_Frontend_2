// frontend/src/components/FaceLogin.js
import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import * as tf from "@tensorflow/tfjs";
import axios from "axios";

const FaceLogin = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("Initializing AI...");
  const [loading, setLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [matchedEmployee, setMatchedEmployee] = useState(null);

  // ================= Initialize Face Models =================
  useEffect(() => {
    const initModels = async () => {
      try {
        await tf.setBackend("webgl");
        await tf.ready();
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        setStatus("Face Login Ready ✅");
        fetchRegisteredEmployees();
      } catch (err) {
        console.error(err);
        setStatus("AI Initialization Failed ❌");
      }
    };
    initModels();

    return () => stopCamera();
  }, []);

  // ================= Fetch Registered Employees =================
  const fetchRegisteredEmployees = async () => {
    try {
      const res = await axios.get("http://localhost:5050/api/admin/onboarded-employees");
      if (res.data?.employees) {
        const emps = res.data.employees.map(emp => ({
          ...emp,
          faceDescriptor: new Float32Array(emp.faceDescriptor),
        }));
        setEmployees(emps);
      }
    } catch (err) {
      console.error("Error fetching employees:", err.response?.data || err.message);
      setStatus("Failed to load employees ❌");
    }
  };

  // ================= Camera Controls =================
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      setStatus("Camera On 📹");
    } catch (err) {
      console.error(err);
      setStatus("Failed to start camera ❌");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  // ================= Face Detection =================
  const scanFaceDescriptor = async () => {
    if (!videoRef.current) return null;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
    const detection = await faceapi
      .detectSingleFace(videoRef.current, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) return null;
    drawFaceBox(detection);
    return Array.from(detection.descriptor);
  };

  const drawFaceBox = (detection) => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;
    const displaySize = { width: videoRef.current.width, height: videoRef.current.height };
    faceapi.matchDimensions(canvas, displaySize);
    const resized = faceapi.resizeResults(detection, displaySize);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;
    ctx.strokeRect(resized.detection.box.x, resized.detection.box.y, resized.detection.box.width, resized.detection.box.height);
  };

  // ================= Compare Face =================
  const matchEmployee = (descriptor) => {
    for (let emp of employees) {
      const distance = faceapi.euclideanDistance(descriptor, emp.faceDescriptor);
      if (distance < 0.5) return emp;
    }
    return null;
  };

  // ================= Handle Login =================
  const handleLogin = async () => {
    setLoading(true);
    setStatus("Looking for your face 👀");
    await startCamera();

    let loginSucceeded = false;
    const interval = setInterval(async () => {
      const faceDescriptor = await scanFaceDescriptor();
      if (faceDescriptor && !loginSucceeded) {
        const emp = matchEmployee(faceDescriptor);
        if (emp) {
          loginSucceeded = true;
          setMatchedEmployee(emp);
          setStatus(`Login Successful ✅ Welcome ${emp.name}`);

          try {
            await axios.post("http://localhost:5050/api/admin/employee/action", {
              employeeId: emp.employeeId,
              action: "login",
            });
          } catch (err) {
            console.error("Error recording login:", err);
          }

          clearInterval(interval);
          stopCamera();
          setLoading(false);
        } else {
          setStatus("Your face is not registered ❌");
        }
      }
    }, 500);



    const handlePause = async () => {
  if (!matchedEmployee) return alert("No employee logged in!");
  try {
    await axios.post("http://localhost:5050/api/admin/employee/action", {
      employeeId: matchedEmployee.employeeId,
      action: "pause",
    });
    setStatus(`Pause recorded for ${matchedEmployee.name}`);
  } catch (err) {
    console.error("Error recording pause:", err);
    setStatus("Failed to record pause ❌");
  }
};

const handleLogout = async () => {
  if (!matchedEmployee) return alert("No employee logged in!");
  try {
    await axios.post("http://localhost:5050/api/admin/employee/action", {
      employeeId: matchedEmployee.employeeId,
      action: "logout",
    });
    setStatus(`Logout recorded for ${matchedEmployee.name}`);
    setMatchedEmployee(null);
  } catch (err) {
    console.error("Error recording logout:", err);
    setStatus("Failed to logout ❌");
  }
};

    // Minimum camera active time: 12 seconds
    setTimeout(() => {
      if (!loginSucceeded) {
        clearInterval(interval);
        setStatus("Your face is not registered ❌");
        stopCamera();
        setLoading(false);
      }
    }, 12000);
  };

  // ================= Handle Pause =================
  const handlePause = async () => {
    if (!matchedEmployee) return alert("No employee logged in!");
    try {
      await axios.post("http://localhost:5050/api/admin/employee/action", {
        employeeId: matchedEmployee.employeeId,
        action: "pause",
      });
      setStatus(`Pause recorded for ${matchedEmployee.name}`);
    } catch (err) {
      console.error("Error recording pause:", err);
      setStatus("Failed to record pause ❌");
    }
  };

  // ================= Handle Logout =================
  const handleLogout = async () => {
    if (!matchedEmployee) return alert("No employee logged in!");
    try {
      await axios.post("http://localhost:5050/api/admin/employee/action", {
        employeeId: matchedEmployee.employeeId,
        action: "logout",
      });
      setStatus(`Logout recorded for ${matchedEmployee.name}`);
      setMatchedEmployee(null);
      startCamera(); // camera restarts for next login
    } catch (err) {
      console.error("Error recording logout:", err);
      setStatus("Failed to logout ❌");
    }
  };

  return (
    <div style={styles.page}>
      {matchedEmployee && (
        <div style={popupStyles.overlay}>
          <div style={popupStyles.modal}>
            <h2>Login Successful ✅</h2>
            <p>Welcome, {matchedEmployee.name}!</p>
            <button style={popupStyles.button} onClick={() => setMatchedEmployee(null)}>Close</button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <h2>TechNg Nexus 💙</h2>
        <p>{status}</p>

        <div style={{ marginTop: "15px", width: "320px", height: "240px", margin: "0 auto", position: "relative" }}>
          <img
            src="/placeholder.png"
            alt="placeholder"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 1,
              display: cameraOn ? "none" : "block",
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: "12px",
              border: "2px solid #1565c0",
            }}
          />
          <video
            ref={videoRef}
            autoPlay
            muted
            width="320"
            height="240"
            style={{ ...styles.video, position: "absolute", top: 0, left: 0, zIndex: 2, display: cameraOn ? "block" : "none" }}
          />
          <canvas ref={canvasRef} width="320" height="240" style={{ position: "absolute", top: 0, left: 0, zIndex: 3 }} />
        </div>

        {matchedEmployee && (
          <div style={{ marginTop: "10px", textAlign: "left" }}>
            <p><strong>Employee ID:</strong> {matchedEmployee.employeeId}</p>
            <p><strong>Name:</strong> {matchedEmployee.name}</p>
          </div>
        )}

        <div style={{ marginTop: "15px", display: "flex", gap: "10px", flexDirection: "column" }}>
          <button onClick={handleLogin} style={styles.button} disabled={loading || matchedEmployee}>
            {loading ? "Processing..." : "Login"}
          </button>
          <button onClick={handlePause} style={styles.button} disabled={!matchedEmployee}>Pause</button>
          <button onClick={handleLogout} style={styles.button} disabled={!matchedEmployee}>Logout</button>
        </div>
      </div>
    </div>
  );
};

// ================= Styles =================
const styles = {
  page: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#eef4ff" },
  card: { background: "#fff", padding: "30px", borderRadius: "20px", width: "400px", textAlign: "center", boxShadow: "0 8px 25px rgba(0,0,0,0.08)" },
  video: { borderRadius: "12px", border: "2px solid #1565c0", objectFit: "cover" },
  button: { width: "100%", padding: "12px", marginTop: "10px", background: "#1565c0", color: "white", border: "none", borderRadius: "10px", cursor: "pointer" },
};

// ================= Popup Styles =================
const popupStyles = {
  overlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { background: "#fff", padding: "30px", borderRadius: "15px", textAlign: "center", boxShadow: "0 8px 25px rgba(0,0,0,0.2)" },
  button: { marginTop: "15px", padding: "10px 20px", background: "#1565c0", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
};

export default FaceLogin;