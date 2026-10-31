/* AMEX Bolsillos v1.3 — intérprete local de frases dictadas.
 * No graba audio, no utiliza APIs ni envía datos a servidores.
 * Los nombres de comercios se proporcionan desde el almacenamiento local.
 */
(function(root){
'use strict';
const norm = s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ').replace(/\s+/g,' ').trim();
const key = s=>norm(s).replace(/[^a-z0-9]+/g,' ').trim();
const SWILE = /\b(?:swile|swail|swaile|swaille|swayle|suail|suayl|swyle|souail|souaille|souaile|suil|suile|smile)\b/i;
const RELAIS = /\b(?:relais|relai|relay|reley|relei|rele|reles|relays|releys|relais)\b/i;
// Algunas transcripciones de iOS cortan «Relais» a «Ré» o «Ray».
// Solo consideramos esas sílabas si aparecen inmediatamente después de Swile.
const SWILE_SHORT_RELAIS = /\b(?:swile|swail|swaile|swaille|swayle|suail|suayl|swyle|souail|souaille|souaile|suil|suile|smile)\s*[,.:;\-]?\s*(?:re|ré|ray)\b/i;
const AMEX = /\b(?:amex|ameks|amecs|am[\s-]?(?:ex|eks|ecs)|a[\s-]?(?:mex|mecs)|american[\s-]+(?:express|xpress))\b/i;
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
 const names=Array.isArray(options)?options.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean):[];
 const n=key(raw),ranked=[];
 for(const name of names)for(const alias of [name,...name.split(/\s*\/\s*/)]){
   const v=key(alias);
   if(v.length>=3&&(' '+n+' ').includes(' '+v+' '))ranked.push({name,score:v.length});
 }
 ranked.sort((a,b)=>b.score-a.score);
 if(ranked.length)return{name:ranked[0].name,matched:true};
 // El dictado de iOS puede separar con comas las palabras de un comercio.
 // «en tienda, ejemplo bolsillo, alimentación» => «tienda ejemplo».
 const patterns=[
  /\b(?:comercio|establecimiento)\b\s*(?:(?:es|fue|se\s+llama|se\s+llamaba|de|del|en)\s+)?(?:[:,\-]\s*)?([\p{L}\p{N}][\p{L}\p{N}\s,.'&/-]{0,90})/iu,
  /\b(?:en|chez|at)\s+(?:(?:el|la|le|les)\s+)?([\p{L}\p{N}][\p{L}\p{N}\s,.'&/-]{0,90})/iu,
  /\b(?:tienda|magasin)\s+(?:de\s+)?([\p{L}\p{N}][\p{L}\p{N}\s,.'&/-]{0,90})/iu
 ];
 const stop=/\b(?:(?:del?|para\s+el)\s+)?(?:bolsillo|pocket|categor[ií]a)\b|\b(?:desde|depuis|descripcion|description|nota|note|cargad[oa]s?|cobrad[oa]s?|debitad[oa]s?|pagad[oa]s?|pagu[eé]|pay[eé]|paid|importe|total|cuestan?|cost[oó]|gaste|gasto|euros?|swile|swail|suail|relais|relai|relay|amex|american\s+express)\b/iu;
 const generic=new Set(['tienda','comercio','establecimiento','magasin','supermercado','restaurant','restaurante','el comercio','la tienda']);
 for(const rx of patterns){
   const m=raw.match(rx);if(!m)continue;
   const value=m[1].split(stop)[0].split(/[.!?;\r\n]/)[0]
      .replace(/^(?:(?:es|fue|se\s+llama|en|de|del|la|el)\s+)*/iu,'')
      .replace(/[,:"“”«»]+/g,' ').replace(/\s+/g,' ').trim();
   if(value.length>=2&&!generic.has(key(value))&&!/^\d+$/.test(value))return{name:value.slice(0,100),matched:false};
 }
 return{name:'',matched:false};
}
function expandSpokenCents(text){
 return text.replace(/\b(\d{1,4}|[\p{L}]+)\s+euros?\s+(?:(?:con|y|et|and)\s+)?(\d{1,2}|[\p{L}]+)(?!\s+euros?\b)(?=\s|[.,;!?]|$)/giu,(all,e,c)=>{
  const whole=/^\d+$/.test(e)?Number(e):wordNumber(e),cent=/^\d+$/.test(c)?Number(c):wordNumber(c);
  if(whole===null||cent===null||whole>9999||cent>99||!Number.isFinite(cent))return all;
  return whole+','+String(cent).padStart(2,'0')+' euros';
 });
}
function amountRole(v,prev,next,text,totalCount){
 const b=norm(prev).slice(-100),a=norm(next).slice(0,110);
 const near=(s,re)=>re.test(s);
 const amtPaid=/\b(?:pago|pague|pag[oó]|pay[eé]|paid|cargad[oa]s?|cobrad[oa]s?|debitad[oa]s?|charg[eé]s?|charged?|resto|restante|remaining|debite|debito)\b/;
 const totalBefore=/\b(?:total|compra|achat|factura|precio|prix|costo|cost[oó]|coste|salio|salió|valio|val[ií]a)\s*(?:fue|es|de|por|a|:|en|d un|d une|de la)?\s*$/;
 const totalAfter=/^\s*(?:en\s+)?(?:total|en total|la compra|d achat|achat total)\b/;
 const prevAmex=/\b(?:amex|ameks|amecs|a mex|am ecs|am eks|american express)\b[^,.]{0,34}$/;
 const prevSwile=/\b(?:swile|swail|swaile|swaille|swayle|suail|swyle|souail|souaille|suile|smile)\b[^,.]{0,34}$/;
 const afterAmex=/^\s*(?:[\w\s]{0,24}?\b)?(?:a|con|en|sur|par|por|avec|to|via|al|de)\s+(?:la\s+)?(?:amex|ameks|amecs|american express|a mex|am ecs|am eks)\b/;
 const afterSwile=/^\s*(?:[\w\s]{0,24}?\b)?(?:a|con|en|sur|par|por|avec|to|via|al|de)\s+(?:la\s+)?(?:swile|swail|swaile|swaille|swayle|suail|swyle|souail|suile|smile)\b/;
 const explicitSwile=afterSwile.test(a)||prevSwile.test(b);
 const explicitAmex=afterAmex.test(a)||prevAmex.test(b);
 const relayContext=RELAIS.test(a.slice(0,60))||RELAIS.test(b.slice(-60))||SWILE_SHORT_RELAIS.test(text);
 const charged=/\b(?:cargad[oa]s?|cobrad[oa]s?|debitad[oa]s?|charged?|charg[eé]s?|resto|restante|remaining)\b/;
 const pay=/\b(?:pag[oó]|pagu[eé]|pay[eé]|paid|pago)\b/;
 if(totalBefore.test(b)||(totalCount===1&&/^\s*por\s*$/.test(b))||totalAfter.test(a.slice(0,35))||/\b(?:compre|compr[eé]|achete|achet[eé])\s+(?:en\s+[\p{L}\s]+\s+)?por\s*$/.test(b))return'total';
 if(explicitAmex)return 'amex';
 if(explicitSwile && relayContext && (charged.test(b.slice(-50))||charged.test(a.slice(0,42))))return'amex';
 if(explicitSwile && !relayContext)return'swile';
 if(explicitSwile&&relayContext && pay.test(b.slice(-40)))return'swile';
 if(explicitSwile&&relayContext)return totalCount===1?'uncertain':'swile';
 if(relayContext && charged.test(b.slice(-55)) && totalCount===1)return'amex';
 if(/\b(?:am[eé]x|ameks|amecs|american express)\b/.test(b.slice(-40)+a.slice(0,38)))return'amex';
 return'unknown';
}
function parse(text,opts={}){
 const raw=String(text||'').trim(),warnings=[];
 if(!raw)return{amount:null,merchant:'',source:null,pocket:'',warnings:['Dicta o escribe los detalles de la compra.'],canApply:false,swilePaid:null,purchaseTotal:null,ambiguous:true};
 const s=expandSpokenCents(norm(raw));
 const hasSwile=SWILE.test(s),shortRelais=SWILE_SHORT_RELAIS.test(s),hasRelais=RELAIS.test(s)||shortRelais,hasAmex=AMEX.test(s);
 if(shortRelais&&!RELAIS.test(s))warnings.push('El dictado escribió «Swile Ré»: se interpreta como Swile Relais. Confirma el tipo de pago.');
 const source=hasRelais&&(hasSwile||hasAmex)||hasSwile&&hasAmex?'Swile relais':hasRelais?'Swile relais':hasSwile?null:'AMEX';
 const values=amounts(s);
 const classified=values.map((v,i)=>({...v,role:amountRole(v,s.slice(i?values[i-1].end:0,v.start),s.slice(v.end,i+1<values.length?values[i+1].start:s.length),s,values.length)}));
 const group=role=>classified.filter(x=>x.role===role);
 let amex=group('amex')[0]||null,swile=group('swile')[0]||null,total=group('total')[0]||null;
 if(group('amex').length>1)warnings.push('Hay varios importes atribuidos a AMEX; revisa el desglose.');
 if(group('swile').length>1)warnings.push('Hay varios importes atribuidos a Swile; revisa el desglose.');
 if(group('total').length>1)warnings.push('Hay varios totales declarados; revisa el desglose.');
 const unknown=group('unknown'), uncertain=group('uncertain');
 if(!amex && !hasRelais&&!hasSwile&&classified.length===1)amex=classified[0];
 if(!amex && hasRelais && total && swile && unknown.length===0 && uncertain.length===0 && total.amount>=swile.amount){
    amex={amount:total.amount-swile.amount,derived:true};
 }
 if(!amex && hasRelais && total && !swile && classified.length===2 && unknown.length===1)amex=unknown[0];
 if(!amex && hasRelais && swile && !total && classified.length===2 && unknown.length===1)amex=unknown[0];
 if(!amex && (hasRelais||hasSwile)){
   warnings.push('No se identificó con certeza cuánto se cargó a AMEX. Especifica «X euros cargados a AMEX por Swile Relais».');
 }
 if(!classified.length)warnings.push('No se encontró un importe en euros.');
 if(!hasRelais && hasSwile && !hasAmex)warnings.push('Swile sin Relais ni AMEX: confirma que exista un cargo a AMEX.');
 if(!hasRelais && !hasSwile && !hasAmex)warnings.push('Tipo de pago no indicado; revisa si fue AMEX directa.');
 let amount=amex?amex.amount:null,swilePaid=swile?swile.amount:null,purchaseTotal=total?total.amount:null;
 if(amount!==null&&swilePaid!==null&&purchaseTotal===null)purchaseTotal=amount+swilePaid;
 if(amount!==null&&purchaseTotal!==null&&swilePaid===null && purchaseTotal>=amount && source==='Swile relais')swilePaid=purchaseTotal-amount;
 if(amount!==null&&purchaseTotal!==null&&purchaseTotal<amount)warnings.push('El cargo a AMEX supera el total declarado.');
 if(amount!==null&&swilePaid!==null&&purchaseTotal!==null&&amount+swilePaid!==purchaseTotal)warnings.push('El total no coincide con la suma de Swile y AMEX.');
 if(group('amex').length>1||group('swile').length>1||group('total').length>1)amount=null;
 if(hasSwile&&!hasRelais&&!hasAmex)amount=null;
 const found=merchantFor(raw,opts.merchants||[]);
 const pocketNames=opts.pockets||[],normalized=key(raw);
 const matches=pocketNames.filter(p=>{const k=key(p);return k.length>=3&&(' '+normalized+' ').includes(' '+k+' ')}).sort((a,b)=>b.length-a.length);
 let pocket=matches.length?matches[0]:'';
 if(!pocket&&found.name&&opts.rules)pocket=opts.rules[key(found.name)]||'';
 if(!found.name)warnings.push('No se identificó el comercio. Corrígelo antes de guardar.');
 const invalid=warnings.some(x=>/varios importes|varios totales|total no coincide|supera el total|no se identifico con certeza/i.test(key(x)));
 const canApply=!!found.name&&amount!==null&&amount>0&&!invalid;
 return {merchant:found.name,matchedMerchant:found.matched,amount,source:source||'AMEX',pocket,swilePaid,purchaseTotal,warnings,canApply,ambiguous:!canApply,transcript:raw};
}
root.AmexVoiceParser=Object.freeze({parse,version:'1.3'});
})(window);
