"use client";
import { useState } from "react";
import styles from "../../styles/register.module.css";

export default function RegisterPage(){

const [form,setForm] = useState({
  name:"",
  email:"",
  password:"",
  gender:"",
  tuReg:"",
  program:""
});

const handleChange = (e)=>{
  setForm({...form,[e.target.name]:e.target.value});
};

const handleRegister = async (e)=>{
  e.preventDefault();

  const res = await fetch("http://127.0.0.1:8000/register",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(form)
  });

  const data = await res.json();
  alert(data.message);
};

return(
<div className={styles.container}>

<div className={styles.card}>

<h2>Create Account</h2>

<form onSubmit={handleRegister}>

<input
type="text"
name="name"
placeholder="Full Name"
value={form.name}
onChange={handleChange}
required
/>

<input
type="email"
name="email"
placeholder="Email"
value={form.email}
onChange={handleChange}
required
/>

<input
type="password"
name="password"
placeholder="Password"
value={form.password}
onChange={handleChange}
required
/>

<select
name="gender"
value={form.gender}
onChange={handleChange}
required
>
<option value="">Select Gender</option>
<option>Male</option>
<option>Female</option>
<option>Other</option>
</select>

<input
type="text"
name="tuReg"
placeholder="TU Registration Number"
value={form.tuReg}
onChange={handleChange}
required
/>

<select
name="program"
value={form.program}
onChange={handleChange}
required
>

<option value="">Select Program</option>

<optgroup label="Science">
<option>BIT</option>
<option>CSIT</option>
<option>MIT</option>
</optgroup>

<optgroup label="Management">
<option>BBA</option>
<option>BBS</option>
<option>BA</option>
</optgroup>

</select>

<button type="submit">REGISTER</button>

</form>

<p>
Already have account? <a href="/login">Login</a>
</p>

</div>

</div>
);
}