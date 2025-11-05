import React, { useState, useEffect } from 'react'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Marketplace from './pages/Marketplace'
import Requests from './pages/Requests'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')||'null'))

  useEffect(()=>{
    if (!token) { setUser(null); localStorage.removeItem('user'); }
  },[token])

  if (!token) {
    return <div style={{padding:20}}>
      <h2>SlotSwapper</h2>
      <div style={{display:'flex',gap:20}}>
        <Login onLogin={(t,u)=>{setToken(t); localStorage.setItem('token',t); localStorage.setItem('user',JSON.stringify(u)); setUser(u)}} />
        <Signup onSignup={(t,u)=>{setToken(t); localStorage.setItem('token',t); localStorage.setItem('user',JSON.stringify(u)); setUser(u)}} />
      </div>
    </div>
  }

  return <div style={{padding:20}}>
    <h2>SlotSwapper</h2>
    <div style={{marginBottom:10}}>
      <strong>Welcome {user?.name}</strong> &nbsp;
      <button onClick={()=>{localStorage.removeItem('token'); localStorage.removeItem('user'); setToken(null); setUser(null)}}>Logout</button>
    </div>
    <div style={{display:'flex',gap:20}}>
      <div style={{flex:1}}><Dashboard token={token} /></div>
      <div style={{flex:1}}>
        <Marketplace token={token} />
        <hr />
        <Requests token={token} />
      </div>
    </div>
  </div>
}

export default App
