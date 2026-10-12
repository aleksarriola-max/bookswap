import { readFile, writeFile } from 'node:fs/promises';
export function summarize(offers, delivered=false) {
  const unique=new Map();
  for(const offer of offers) {
    if(!offer.seller || !Number.isFinite(offer.item) || offer.item<=0) continue;
    if(delivered && (!Number.isFinite(offer.shipping) || offer.shipping<0)) continue;
    if(!unique.has(offer.seller)) unique.set(offer.seller,offer.item+(delivered?offer.shipping:0));
  }
  const prices=[...unique.values()].sort((a,b)=>a-b);
  if(prices.length<5) return {status:'insufficient',sellerCount:prices.length};
  const quantile=q=>{const index=(prices.length-1)*q;const low=Math.floor(index);return Math.round((prices[low]+(prices[Math.ceil(index)]-prices[low])*(index-low))*100)/100;};
  return {status:'research-sample',sellerCount:prices.length,q25:quantile(.25),median:quantile(.5),q75:quantile(.75)};
}
if(process.argv.includes('--write')) {
  const pilot=JSON.parse(await readFile(new URL('../docs/pricing-pilot.json',import.meta.url),'utf8'));
  const result={...pilot,editions:pilot.editions.map(edition=>({...edition,itemSummary:summarize(edition.offers),deliveredSummary:summarize(edition.offers,true)}))};
  await writeFile(new URL('../docs/pricing-pilot-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
  console.log('Wrote research-only sample summaries; no app prices changed.');
}
