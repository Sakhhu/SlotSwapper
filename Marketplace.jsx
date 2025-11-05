import React, { useEffect, useState } from 'react'
export default function Marketplace({token}){
  const [slots,setSlots]=useState([])
  const [mySwappables,setMySwappables]=useState([])
  const [selectedOffer,setSelectedOffer]=useState(null)
  const [err,setErr]=useState('')

  const load = async ()=>{
    const res = await fetch('http://localhost:5000/api/swappable-slots',{headers:{Authorization:'Bearer '+token}})
    const data = await res.json()
    setSlots(data)
    const res2 = await fetch('http://localhost:5000/api/events',{headers:{Authorization:'Bearer '+token}})
    const data2 = await res2.json()
    setMySwappables(data2.filter(e=>e.status==='SWAPPABLE'))
  }
  useEffect(()=>{ load() },[])

  const requestSwap = async (theirSlotId) => {
    setErr('')
    if (!selectedOffer) return setErr('Choose one of your swappable slots as offer')
    const res = await fetch('http://localhost:5000/api/swap-request',{method:'POST',headers:{'Content-Type':'application/json', Authorization:'Bearer '+token},body:JSON.stringify({mySlotId:selectedOffer, theirSlotId})})
    const data = await res.json()
    if (!res.ok) return setErr(data.error||'Error')
    setSelectedOffer(null)
    load()
  }

  return <div style={{border:'1px solid #ccc',padding:10}}>
    <h4>Marketplace</h4>
    <div>
      <label>Your offers (choose one):</label>
      <select value={selectedOffer||''} onChange={e=>setSelectedOffer(e.target.value)}>
        <option value=''>-- select --</option>
        {mySwappables.map(s=> <option key={s.id} value={s.id}>{s.title} — {new Date(s.startTime).toLocaleString()}</option>)}
      </select>
      {err && <div style={{color:'red'}}>{err}</div>}
    </div>
    <ul>
      {slots.map(s=> (
        <li key={s.id}>
          <strong>{s.title}</strong> (by {s.ownerName}) — {new Date(s.startTime).toLocaleString()}
          <button style={{marginLeft:10}} onClick={()=>requestSwap(s.id)}>Request Swap</button>
        </li>
      ))}
    </ul>
  </div>
}
