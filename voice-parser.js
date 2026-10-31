/* AMEX Bolsillos v1.3 — intérprete local de frases dictadas.
 * No graba audio, no utiliza APIs ni envía datos a servidores.
 * Los nombres de comercios se proporcionan desde el almacenamiento local.
 */
(function(root){
'use strict';
const norm = s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ').replace(/\s+/g,' ').trim();
const key = s=>norm(s).replace(/[^a-z0-9]+/g,' ').trim();
const SWILE = /\b(?:swile|swail|swaile|suail|suayl|suail|swyle|souail|souaille|souaile|suil|suile|swile)\b/i;
const RELAIS = /\b(?:relais|relai|relay|reley|relei|rele|reles|relays|releys|relais)\b/i;
const AMEX = /\b(?:amex|am[\s-]?ex|am[\s-]?ecs|a[\s-]?mex|a[\s-]?mecs|american[\s-]+(?:express|xpress))\b/i;
const UNIT = {cero:0,uno:1,una:1,un:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiuno:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29,treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,un:1,une:1,deux:2,trois:3,quatre:4,cinq:5,six:6,sept:7,huit:8,neuf:9,dix:10,onze:11,douze:12,treize:13,quatorze:14,quinze:15,seize:16,vingt:20,trente:30,quarante:40,cinquante:50,soixante:60};
function wordNumber(source){
 let s=key(source);if(!s)return null;
 let p=s.split(/\s+/).filter(x=>!['y','et','and','de','d'].includes(x));
 if(!p.length || p.length>5)return null;
 if(p.length===1 && Object.prototype.hasOwnProperty.call(UNIT,p[0]))return UNIT[p[0]];
 let value=0;
 for(const w of p){if(!(w in UNIT))return null;const v=UNIT[w];if(v>=20&&v%10===0){if(value&&value>=20)return null;value+=v}else value+=v}
 return value>=0&&value<=99?value:null;
}
function parseAmount(raw){let s=String(raw||'').replace(/\s/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)&&n>=0&&n<100000?Math.round(n*100):null}
function amounts(text){
 const found=[], used=[];
 const numeric=/\b(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:€|euros?\b|eur\b)/giu;
 for(const m of text.matchAll(numeric)){const cents=parseAmount(m[1]);if(cents!==null){found.push({start:m.index,end:m.index+m[0].length,amount:cents,literal:m[0]});used.push([m.index,m.index+m[0].length])}}
 const words=/([\p{L}]+(?:[\s'-]+[\p{L}]+){0,6})\s+euros?\b/giu;
 for(const m of text.matchAll(words)){
   const tokens=norm(m[1]).replace(/-/g,' ').split(/\s+/);let number=null,count=0;
   for(let n=Math.min(5,tokens.length);n>=1;n--){const v=wordNumber(tokens.slice(-n).join(' '));if(v!==null){number=v;count=n;break}}
   if(number===null)continue;
   const prefix=m[1],start=m.index+prefix.length-prefix.trimEnd().split(/\s+/).slice(-count).join(' ').length;
   const end=m.index+m[0].length;
   if(used.some(([a,b])=>start<b&&end>a))continue;
   found.push({start,end,amount:number*100,literal:m[0]});
 }
 if(!found.length){const stand=/\b(?:por|de|a|con|pague|pago|pagué|paye|paid|cargados?|cobrado)\s+(\d{1,5}(?:[.,]\d{1,2})?)\b/giu;
   for(const m of text.matchAll(stand)){const cents=parseAmount(m[1]);if(cents!==null)found.push({start:m.index,end:m.index+m[0].length,amount:cents,literal:m[0]})}
 }
 return found.sort((a,b)=>a.start-b.start);
}
function merchantFor(raw,options){
 const optionsNames=Array.isArray(options)?options.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean):[];
 const n=key(raw), ranked=[];
 for(const name of optionsNames){
   const possibilities=[name,...name.split(/\s*\/\s*/)];
   for(const alias of possibilities){
     const v=key(alias);if(!v || v.length<3)continue;
     if((' '+n+' ').includes(' '+v+' '))ranked.push({name,score:v.length});
   }
 }
 ranked.sort((a,b)=>b.score-a.score);
 if(ranked.length)return {name:ranked[0].name,matched:true};
 const rx=/\b(?:en|chez|at|comercio|tienda|magasin)\s+([\p{L}\p{N}][\p{L}\p{N}\s.'&-]{1,60})/iu;
 const m=raw.match(rx);
 if(m){let value=m[1].split(/\b(?:por|pour|de|con|avec|cost[oó]|cargad[oa]s?|pagad[oa]s?|pagu[eé]|paye|payé|importe|total|fueron|fue|euros?|relai|swile|amex)\b/iu)[0].replace(/[\s,.;]+$/,'').trim();if(value.length>=2)return{name:value,matched:false}}
 return{name:'',matched:false};
}
function parse(text,opts={}){
 const raw=String(text||'').trim();const s=norm(raw),warnings=[];
 const hasSwile=SWILE.test(s),hasRelais=RELAIS.test(s),hasAmex=AMEX.test(s);
 const source=hasRelais&&(hasSwile||hasAmex)||hasSwile&&hasAmex?'Swile relais':hasRelais?'Swile relais':hasSwile?null:'AMEX';
 if(!raw)return{amount:null,merchant:'',source:null,pocket:'',warnings:['Dicta o escribe los detalles de la compra.'],canApply:false,swilePaid:null,total:null,ambiguous:true};
 const values=amounts(raw);
 const candidate=[];for(let i=0;i<values.length;i++){
   const v=values[i],before=norm(raw.slice(i?values[i-1].end:0,v.start)),after=norm(raw.slice(v.end,i+1<values.length?values[i+1].start:raw.length));
   const beforeTail=before.slice(-72),afterHead=after.slice(0,72);
   let role='unknown';
   if(/\b(?:total|compra|achat|factura|prix|valor|cost[oó]|co[uû]t)\b/.test(beforeTail)&&!/\b(?:swile|amex)\b/.test(beforeTail.slice(-25)))role='total';
   if(AMEX.test(afterHead.slice(0,45))||AMEX.test(beforeTail.slice(-35)))role='amex';
   else if(SWILE.test(afterHead.slice(0,48))&&RELAIS.test(afterHead.slice(0,60))&&/\b(?:cargad|cobrad|debita|debit|charged?|charg|restant|resto|saldo|remaining)/.test(afterHead+beforeTail))role='amex';
   else if(SWILE.test(afterHead.slice(0,45))||/\b(?:swile|swail|suail)\b/.test(beforeTail.slice(-35)))role=hasRelais && values.length===1 && /\b(?:cargad|cobrad|debita|debit|charged?|charg|restant|resto|saldo|remaining)/.test(afterHead+beforeTail)?'amex':'swile';
   if(RELAIS.test(afterHead.slice(0,35)) && values.length===1 && /\b(?:cargad|cobrad|debita|debit|charged?|charg|restant|resto|saldo|remaining)/.test(afterHead+beforeTail))role='amex';
   if(/(?:a|pour|to|en|sur)\s*$/.test(beforeTail)&&AMEX.test(afterHead.slice(0,20)))role='amex';
   candidate.push({...v,role});
 }
 let amex = candidate.find(v=>v.role==='amex'),swile =candidate.find(v=>v.role==='swile'),total=candidate.find(v=>v.role==='total');
 if(!amex&&candidate.length===1&&candidate[0].role==='unknown'&&!(hasSwile||hasRelais))amex=candidate[0];
 if(!amex&&candidate.length===1&&candidate[0].role==='unknown'&&(hasSwile||hasRelais))warnings.push('Indica explícitamente cuánto se cargó a AMEX; podría ser el total de la compra.');
 if(!amex&&candidate.length===1&&candidate[0].role==='swile'&&hasRelais)warnings.push('No está claro si ese importe es el total o solo la parte pagada con Swile.');
 if(!amex&&!swile&&!total&&candidate.length===1&&!hasSwile&&!hasRelais)amex=candidate[0];
 if(!amex&&candidate.length>1){const others=candidate.filter(v=>v!==swile&&v!==total);if(others.length===1 &&(hasAmex||hasRelais))amex=others[0]}
 if(candidate.length>1&&!amex)warnings.push('Hay varios importes; especifica el importe cargado a AMEX.');
 if(!candidate.length)warnings.push('No encontré un importe en euros.');
 if(hasSwile&&!hasRelais&&!hasAmex)warnings.push('Has mencionado Swile, pero no Relais ni AMEX. Confirma si hubo un cargo a AMEX.');
 if(!hasAmex&&!hasSwile&&!hasRelais)warnings.push('Tipo de pago no indicado: revisa si fue AMEX directa.');
 let amount=amex?amex.amount:null,swilePaid=swile?swile.amount:null,purchaseTotal=total?total.amount:null;
 if(amount!==null&&swilePaid!==null&&purchaseTotal===null)purchaseTotal=amount+swilePaid;
 if(amount!==null&&purchaseTotal!==null&&swilePaid===null && purchaseTotal>=amount)swilePaid=purchaseTotal-amount;
 if(amount!==null&&purchaseTotal!==null&&purchaseTotal<amount)warnings.push('El cargo a AMEX supera el total declarado: comprueba los importes.');
 if(amount!==null&&swilePaid!==null&&purchaseTotal!==null&&amount+swilePaid!==purchaseTotal)warnings.push('El total no coincide con la suma de Swile y AMEX.');
 if(hasSwile&&!hasRelais&&!hasAmex)amount=null;
 const found=merchantFor(raw,opts.merchants||[]);
 const pocketNames=opts.pockets||[],normalized=key(raw);let pocket='';
 const matches=pocketNames.filter(p=>{const k=key(p);return k.length>=3&&(' '+normalized+' ').includes(' '+k+' ')}).sort((a,b)=>b.length-a.length);
 if(matches.length)pocket=matches[0];
 else if(found.name && opts.rules && opts.rules[key(found.name)])pocket=opts.rules[key(found.name)];
 if(!found.name)warnings.push('No se identificó el comercio. Corrígelo antes de guardar.');
 const effectiveSource=source||'AMEX';
 const okAmount=amount!==null&&amount>0&&!warnings.some(x=>x.startsWith('El cargo a AMEX supera')||x.startsWith('El total no coincide'));
 return {merchant:found.name,matchedMerchant:found.matched,amount,source:effectiveSource,pocket,swilePaid,purchaseTotal,warnings,canApply:!!found.name&&okAmount,ambiguous:!okAmount,transcript:raw};
}
root.AmexVoiceParser=Object.freeze({parse,version:'1.3'});
})(window);
