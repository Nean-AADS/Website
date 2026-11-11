/* Local terminology matching. No query or visitor information is transmitted. */
(()=>{
function fold(value){return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function normalize(value){
 let text=String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'');
 text=text.replace(/\bu[\s.]*c[\s.]*c[\s.-]*(11|1|3)\b/g,' ucc$1 ').replace(/\bu[\s.]*c[\s.]*c\b/g,' ucc ');
 text=text.replace(/\bo\s*(?:&|\/|and)\s*e\b/g,' ownership encumbrance ');
 text=fold(text)
 .replace(/\bownership(?: and)? encumbrances?\b/g,'ownershipencumbrance')
 .replace(/\b(?:certificates? of (?:good standing|existence|status)|(?:good standing|existence|status) certificates?)\b/g,'goodstanding')
 .replace(/\b(?:good standing|existence|status) certs?\b/g,'goodstanding')
 .replace(/\bgood standings?\b/g,'goodstanding')
 .replace(/\bcertified cop(?:y|ies)\b/g,'certifiedcopy')
 .replace(/\bsearch(?:es)? to reflect\b/g,'searchtoreflect')
 .replace(/\bregistered agents?\b/g,'registeredagent').replace(/\bra\b/g,'registeredagent')
 .replace(/\bsecretary of state\b/g,'secretaryofstate').replace(/\bsos\b/g,'secretaryofstate')
 .replace(/\b(?:municipal|muni) liens?\b/g,'municipallien')
 .replace(/\btax liens?\b/g,'taxlien').replace(/\bjudg(?:e)?ment liens?\b/g,'judgmentlien')
 .replace(/\bapostilles\b/g,'apostille').replace(/\bbankruptcies\b/g,'bankruptcy')
 .replace(/\bliens\b/g,'lien');
 return text.trim().replace(/\s+/g,' ');
}
function corpus(text){return fold(text)+' '+normalize(text)}
function query(value){const normalized=normalize(value);return {normalized,tokens:normalized.split(' ').filter(Boolean)}}
function prepare(item){return {item,title:corpus(item.title),exactTitle:normalize(item.title),summary:corpus(item.summary||''),body:corpus([item.title,item.summary,item.text,...(item.aliases||[])].join(' '))}}
function matches(prepared,compiled){return compiled.tokens.every(token=>prepared.body.includes(token))}
function score(prepared,compiled){if(!compiled.tokens.length)return 0;let score=prepared.exactTitle===compiled.normalized?240:0;if(prepared.title.includes(compiled.normalized))score+=70;for(const token of compiled.tokens){if(prepared.title.includes(token))score+=12;if(prepared.summary.includes(token))score+=4}return score}
window.AADS_SEARCH=Object.freeze({fold,normalize,query,prepare,matches,score});
})();
