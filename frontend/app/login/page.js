"use client";
import { useState } from "react";
import styles from "../../styles/login.module.css";

export default function LoginPage() {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    const res = await fetch("http://127.0.0.1:8000/login",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ name:"user",email,password })
    });

    const data = await res.json();
    alert(data.message);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>

        <h2>Student Login</h2>

        <form onSubmit={handleLogin}>

          <div className={styles.inputGroup}>
            <span>✉</span>
            <input
              type="email"
              placeholder="Email ID"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <span>🔒</span>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
            />
          </div>

          <div className={styles.options}>
            <label>
              <input type="checkbox"/> Remember me
            </label>

            <a href="#">Forgot Password?</a>
          </div>

          <button type="submit">LOGIN</button>

        </form>

        <p>
          Don't have account? <a href="/register">Register</a>
        </p>

      </div>
    </div>
  );
}