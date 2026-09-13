export function stockPreview(current, kind, quantity, alreadyDeducted=false) {
 const before=Number(current),amount=Number(quantity);
 if(!Number.isInteger(before)||!Number.isInteger(amount)||before<0||amount<0||!['arrival','dispatch','count'].includes(kind))return null;
 const after=kind==='arrival'?before+amount:kind==='count'?amount:before-(alreadyDeducted?0:amount);
 return {before,after,valid:after>=0&&after<=999999};
}
