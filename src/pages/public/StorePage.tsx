import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, ShoppingCart } from 'lucide-react';
import { Barbershop, Product } from '@/types';
import { createProductReservation, listPublicProducts } from '@/services/commerce';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { formatPrice } from '@/utils/format';
import { publicPath } from '@/utils/publicPath';
import { friendlyError } from '@/utils/errors';

export function StorePage() {
  const { barbershop } = useOutletContext<{barbershop:Barbershop}>();
  const { user } = useCustomerAuth();
  const [products,setProducts]=useState<Product[]|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [cart,setCart]=useState<Record<string,number>>({});
  const [sending,setSending]=useState(false);
  useEffect(()=>{listPublicProducts(barbershop.id).then(setProducts).catch(e=>setError(friendlyError(e,'Não foi possível carregar a loja.')))},[barbershop.id]);
  const selected=useMemo(()=>products?.filter(p=>(cart[p.id]??0)>0)??[],[products,cart]);
  const total=selected.reduce((s,p)=>s+p.price_cents*(cart[p.id]??0),0);
  async function reserve(){
    if(!user) return;
    setSending(true);
    try{
      const r=await createProductReservation(barbershop.id,selected.map(p=>({product_id:p.id,quantity:cart[p.id]})));
      alert(`Reserva ${r.reservation_code} criada! Você pode acompanhá-la em Minha conta.`);setCart({});
    }catch(e){alert(friendlyError(e,'Não foi possível criar a reserva.'))}finally{setSending(false)}
  }
  if(error)return <ErrorState message={error}/>; if(!products)return <LoadingState label="Carregando loja…"/>;
  return <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Loja</p><h1 className="mt-1 font-display text-3xl font-semibold">Produtos da {barbershop.name}</h1><p className="mt-2 max-w-xl text-sm text-graphite">Reserve seus produtos pelo site e retire na barbearia.</p></div>{selected.length>0&&<div className="rounded-2xl bg-ink px-4 py-3 text-paper"><p className="text-xs text-white/60">Sua reserva</p><p className="font-semibold">{selected.reduce((s,p)=>s+(cart[p.id]??0),0)} itens · {formatPrice(total)}</p></div>}</div>
    {products.length===0?<EmptyState title="Loja sem produtos no momento"/>:<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map(p=><Card key={p.id} className="overflow-hidden p-0"><div className="aspect-[4/3] bg-zinc-100">{p.photo_url?<img src={p.photo_url} alt={p.name} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-zinc-400"><ShoppingBag size={36}/></div>}</div><div className="p-5"><h2 className="font-medium">{p.name}</h2>{p.description&&<p className="mt-1 line-clamp-2 text-sm text-graphite">{p.description}</p>}<div className="mt-4 flex items-center justify-between"><span className="font-semibold">{formatPrice(p.price_cents)}</span><span className="text-xs text-graphite">{p.stock_quantity>0?'Disponível':'Sem estoque'}</span></div><div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-50 p-2"><button disabled={(cart[p.id]??0)<=0} onClick={()=>setCart(c=>({...c,[p.id]:Math.max(0,(c[p.id]??0)-1)}))} className="rounded-lg p-2 disabled:opacity-30"><Minus size={16}/></button><span className="text-sm font-medium">{cart[p.id]??0}</span><button disabled={p.stock_quantity<=0} onClick={()=>setCart(c=>({...c,[p.id]:(c[p.id]??0)+1}))} className="rounded-lg p-2 disabled:opacity-30"><Plus size={16}/></button></div></div></Card>)}</div>}
    {selected.length>0&&<Card className="sticky bottom-4 mt-8 flex flex-col gap-4 border-zinc-300 bg-white/95 p-5 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-graphite">Total da reserva</p><p className="font-display text-2xl font-semibold">{formatPrice(total)}</p></div>{user?<Button onClick={reserve} disabled={sending}><ShoppingCart size={17}/>{sending?'Reservando…':'Reservar para retirar'}</Button>:<Link to={publicPath(barbershop.slug,'/conta/entrar')} state={{from:publicPath(barbershop.slug,'/loja')}} className="rounded-xl bg-ink px-5 py-3 text-center text-sm font-medium text-paper">Entrar para reservar</Link>}</Card>}
  </div>;
}
