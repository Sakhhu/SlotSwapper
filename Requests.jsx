import React, { useEffect, useState } from 'react'
export default function Requests({token}){
  const [reqs,setReqs]=useState([])
  const load = async ()=>{
    const res = await fetch('http://localhost:5000/api/requests',{headers:{Authorization:'Bearer '+token}})
    const data = await res.json()
    setReqs(data)
  }
  useEffect(()=>{ load() },[])

  const respond = async (id, accept) => {
    await fetch('http://localhost:5000/api/swap-response/'+id,{method:'POST',headers:{'Content-Type':'application/json', Authorization:'Bearer '+token},body:JSON.stringify({accept})})
    load()
  }

  return <div style={{border:'1px solid #ccc',padding:10}}>
    <h4>Swap Requests</h4>
    <ul>
      {reqs.map(r=> (
        <li key={r.id}>
          {r.requesterId === r.requesterId ? `From: ${r.requesterName}` : `To: ${r.responderName}`} — {r.status}
          {r.responderId === JSON.parse(localStorage.getItem('user')||'{}').id && r.status==='PENDING' && (
            <span>
              <button onClick={()=>respond(r.id,true)}>Accept</button>
              <button onClick={()=>respond(r.id,false)}>Reject</button>
            </span>
          )}
        </li>
      ))}
    </ul>
  </div>
}
