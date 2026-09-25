export function limbComponents(p,idx){
 const count=p.length/3,parent=new Int32Array(count).fill(-1),canonical=new Map();
 function find(x){let r=x;while(parent[r]!==r)r=parent[r];while(parent[x]!==x){let k=parent[x];parent[x]=r;x=k}return r}
 function union(a,b){a=find(a);b=find(b);if(a!==b)parent[b]=a}
 for(let v=0;v<count;v++){if(Math.abs(p[v*3])<=.49)continue;const key=[0,1,2].map(j=>Math.round(p[v*3+j]*1e5)).join(',');parent[v]=v;const old=canonical.get(key);if(old!==undefined)union(v,old);else canonical.set(key,v);}
 for(let k=0;k<idx.length;k+=3){const a=idx[k],b=idx[k+1],c=idx[k+2];if(parent[a]>=0&&parent[b]>=0)union(a,b);if(parent[b]>=0&&parent[c]>=0)union(b,c);if(parent[c]>=0&&parent[a]>=0)union(c,a);}
 const comps=new Map();for(let v=0;v<count;v++){if(parent[v]<0)continue;const r=find(v);parent[v]=r;let o=comps.get(r);if(!o){o={r,n:0,x:0,y:0,minY:Infinity,maxY:-Infinity,minX:Infinity,maxX:-Infinity};comps.set(r,o)}const x=p[v*3],y=p[v*3+1];o.n++;o.x+=x;o.y+=y;o.minY=Math.min(o.minY,y);o.maxY=Math.max(o.maxY,y);o.minX=Math.min(o.minX,x);o.maxX=Math.max(o.maxX,x);}
 for(const o of comps.values()){o.x/=o.n;o.y/=o.n;}
 return {parent,comps};
}
