import { db } from "../src/lib/db";
import { normalizeOption } from "../src/lib/studio-options";
import { randomUUID } from "node:crypto";
const value="Qoop geçici doğrulama "+randomUUID(),fieldId="primary",root="http://127.0.0.1:3000";
try{
 const body={fieldId,value};const send=async(v:string)=>fetch(root+"/api/studio/options",{method:"POST",headers:{"Content-Type":"application/json",Origin:root},body:JSON.stringify({...body,value:v})});
 const first=await send(value);if(!first.ok)throw Error("Option POST failed");
 const second=await send("  "+value.toLocaleUpperCase("tr-TR")+"  ");if(!second.ok)throw Error("Dedup POST failed");
 const rows=await(await fetch(root+"/api/studio/options")).json();
 if(rows.filter((x:any)=>x.fieldId===fieldId&&normalizeOption(x.value)===normalizeOption(value)).length!==1)throw Error("Persistence/dedup failed");
 const html=await(await fetch(root+"/studio")).text();if(!html.includes("Manolya"))throw Error("Expanded options missing");
 console.log("PASS live options API: persistence, normalized dedup, expanded UI");
}finally{await db.studioOption.deleteMany({where:{fieldId,normalized:normalizeOption(value)}});await db.$disconnect();}
