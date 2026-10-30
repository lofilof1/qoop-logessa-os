import { initialBrief } from "../src/lib/studio";
const root="http://127.0.0.1:3000";
const health=await fetch(root+"/api/health");if(!health.ok)throw Error("Healthcheck failed");
const connection=await(await fetch(root+"/api/studio/connection")).json();
if(typeof connection.configured!=="boolean"||"apiKey" in connection)throw Error("Invalid connection response");
const history=await fetch(root+"/api/studio/generate");if(!history.ok||!Array.isArray(await history.json()))throw Error("History unavailable");
if(!connection.configured){const r=await fetch(root+"/api/studio/generate",{method:"POST",headers:{"Content-Type":"application/json",Origin:root},body:JSON.stringify({brief:initialBrief(),variant:"00000000-0000-4000-8000-000000000000"})});if(r.status!==503)throw Error("Missing key should block paid request");}
console.log("PASS health, connection secrecy, production history; no paid image request made");
