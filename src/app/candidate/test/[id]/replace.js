const fs=require('fs');
let p='C:\\Users\\shrey\\Desktop\\AuraHR\\AuraHR\\src\\app\\candidate\\test\\[id]\\page.tsx';
let c=fs.readFileSync(p,'utf8');
c=c.replace(/alert\('⚠️ VIOLATION/g, "setProctorAlert('⚠️ VIOLATION");
c=c.replace(/alert\(`⚠️ VIOLATION/g, "setProctorAlert(`⚠️ VIOLATION");
fs.writeFileSync(p,c);
