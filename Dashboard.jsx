import React, { useEffect, useState } from 'react'
export default function Dashboard({token}){
  const [events,setEvents]=useState([])
  const [title,setTitle]=useState('')
  const [start,setStart]=useState('')
  const [end,setEnd]=useState('')
  const [err,setErr]=useState('')

  const load = async ()=>{
    const res = await fetch('http://localhost:5000/api/events',{headers:{Authorization:'Bearer '+token}})
    const data = await res.json()
    setEvents(data)
  }
  useEffect(()=>{ load() },[])

  const create = async e=>{
    e.preventDefault()
    setErr('')
    const res = await fetch('http://localhost:5000/api/events',{method:'POST',headers:{'Content-Type':'application/json', Authorization:'Bearer '+token},body:JSON.stringify({title,startTime:Date.parse(start),endTime:Date.parse(end)})})
    const data = await res.json()
    if (!res.ok) return setErr(data.error||'Error')
    setTitle(''); setStart(''); setEnd(''); load()
  }

  const toggleSwappable = async (ev)=>{
    const newStatus = ev.status === 'SWAPPABLE' ? 'BUSY' : 'SWAPPABLE'
    await fetch('http://localhost:5000/api/events/'+ev.id, {method:'PUT', headers:{'Content-Type':'application/json', Authorization:'Bearer '+token}, body:JSON.stringify({status:newStatus})})
    load()
  }

  return <div style={{border:'1px solid #ccc',padding:10}}>
    <h4>Your Events</h4>
    <form onSubmit={create}>
      <input placeholder='title' value={title} onChange={e=>setTitle(e.target.value)} />
      <input type='datetime-local' value={start} onChange={e=>setStart(e.target.value)} />
      <input type='datetime-local' value={end} onChange={e=>setEnd(e.target.value)} />
      <button type='submit'>Create</button>
    </form>
    {err && <div style={{color:'red'}}>{err}</div>}
    <ul>
      {events.map(ev=> (
        <li key={ev.id}>
          <strong>{ev.title}</strong> — {new Date(ev.startTime).toLocaleString()} to {new Date(ev.endTime).toLocaleString()} — {ev.status}
          <button onClick={()=>toggleSwappable(ev)} style={{marginLeft:10}}>{ev.status==='SWAPPABLE'?'Make Busy':'Make Swappable'}</button>
        </li>
      ))}
    </ul>
  </div>
}
