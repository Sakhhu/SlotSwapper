import React, { useState } from 'react'
export default function Login({onLogin}){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [err,setErr]=useState('')
  const submit=async e=>{
    e.preventDefault()
    setErr('')
    try{
      const res=await fetch('http://localhost:5000/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})})
      const data=await res.json()
      if (!res.ok) return setErr(data.error||'Login failed')
      onLogin(data.token,data.user)
    }catch(er){ setErr('Network error') }
  }
  return <form onSubmit={submit} style={{border:'1px solid #ccc',padding:10}}>
    <h4>Login</h4>
    <div><input placeholder='email' value={email} onChange={e=>setEmail(e.target.value)} /></div>
    <div><input placeholder='password' type='password' value={password} onChange={e=>setPassword(e.target.value)} /></div>
    <div><button type='submit'>Login</button></div>
    {err && <div style={{color:'red'}}>{err}</div>}
  </form>
}
