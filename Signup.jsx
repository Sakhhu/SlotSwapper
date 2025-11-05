import React, { useState } from 'react'
export default function Signup({onSignup}){
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [err,setErr]=useState('')
  const submit=async e=>{
    e.preventDefault()
    setErr('')
    try{
      const res=await fetch('http://localhost:5000/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})})
      const data=await res.json()
      if (!res.ok) return setErr(data.error||'Signup failed')
      onSignup(data.token,data.user)
    }catch(er){ setErr('Network error') }
  }
  return <form onSubmit={submit} style={{border:'1px solid #ccc',padding:10}}>
    <h4>Signup</h4>
    <div><input placeholder='name' value={name} onChange={e=>setName(e.target.value)} /></div>
    <div><input placeholder='email' value={email} onChange={e=>setEmail(e.target.value)} /></div>
    <div><input placeholder='password' type='password' value={password} onChange={e=>setPassword(e.target.value)} /></div>
    <div><button type='submit'>Sign up</button></div>
    {err && <div style={{color:'red'}}>{err}</div>}
  </form>
}
