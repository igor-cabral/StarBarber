import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Banknote, Minus, Package, Plus, ReceiptText, ShoppingCart, WalletCards } from 'lucide-react';
import { ShopStaffProfile } from '@/services/auth';
import {
  closeCashRegister,
  createPosSale,
  fulfillProductReservation,
  getMyOpenCashSession,
  listPosCatalog,
  listRecentSales,
  listShopReservations,
  openCashRegister,
  setReservationStatus,
} from '@/services/commerce';
import { CashRegisterSession, Customer, PaymentMethod, Product, ProductReservation, Sale, Service } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { formatPrice } from '@/utils/format';
import { friendlyError } from '@/utils/errors';

type CartLine = { key: string; item_type: 'product'|'service'; id: string; name: string; price_cents: number; quantity: number };
const PAYMENT_LABEL: Record<PaymentMethod,string> = {cash:'Dinheiro',pix:'Pix',credit_card:'Crédito',debit_card:'Débito',other:'Outro'};

export function PosPage(){
  const {profile}=useOutletContext<{profile:ShopStaffProfile}>();
  const [products,setProducts]=useState<Product[]|null>(null); const [services,setServices]=useState<Service[]>([]); const [customers,setCustomers]=useState<Customer[]>([]);
  const [reservations,setReservations]=useState<ProductReservation[]>([]); const [sales,setSales]=useState<Sale[]>([]); const [session,setSession]=useState<CashRegisterSession|null>(null);
  const [cart,setCart]=useState<CartLine[]>([]); const [customerId,setCustomerId]=useState(''); const [payment,setPayment]=useState<PaymentMethod>('pix'); const [discount,setDiscount]=useState(0); const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState(false);
  const [opening,setOpening]=useState('0'); const [closing,setClosing]=useState('0');
  async function reload(){try{const [catalog,res,sl,cs]=await Promise.all([listPosCatalog(profile.barbershop_id),listShopReservations(profile.barbershop_id),listRecentSales(profile.barbershop_id,20),getMyOpenCashSession(profile.barbershop_id)]);setProducts(catalog.products);setServices(catalog.services);setCustomers(catalog.customers);setReservations(res);setSales(sl);setSession(cs);setError(null)}catch(e){setError(friendlyError(e,'Não foi possível carregar o caixa.'))}}
  useEffect(()=>{reload()},[profile.barbershop_id]);
  const subtotal=useMemo(()=>cart.reduce((s,i)=>s+i.price_cents*i.quantity,0),[cart]); const total=Math.max(0,subtotal-discount);
  function add(item_type:'product'|'service',x:Product|Service){const key=`${item_type}:${x.id}`;setCart(c=>{const found=c.find(i=>i.key===key);return found?c.map(i=>i.key===key?{...i,quantity:i.quantity+1}:i):[...c,{key,item_type,id:x.id,name:x.name,price_cents:x.price_cents,quantity:1}]})}
  function delta(key:string,d:number){setCart(c=>c.map(i=>i.key===key?{...i,quantity:i.quantity+d}:i).filter(i=>i.quantity>0))}
  async function open(){setBusy(true);try{await openCashRegister(Math.round(Number(opening||0)*100));await reload()}catch(e){alert(friendlyError(e,'Não foi possível abrir o caixa.'))}finally{setBusy(false)}}
  async function close(){if(!session||!confirm('Fechar este caixa agora?'))return;setBusy(true);try{await closeCashRegister(session.id,Math.round(Number(closing||0)*100));await reload()}catch(e){alert(friendlyError(e,'Não foi possível fechar o caixa.'))}finally{setBusy(false)}}
  async function finish(){if(cart.length===0)return;setBusy(true);try{await createPosSale({items:cart.map(i=>({item_type:i.item_type,id:i.id,quantity:i.quantity})),paymentMethod:payment,cashSessionId:session?.id,customerId:customerId||null,discountCents:discount});setCart([]);setDiscount(0);setCustomerId('');alert('Venda concluída.');await reload()}catch(e){alert(friendlyError(e,'Não foi possível concluir a venda.'))}finally{setBusy(false)}}
  async function fulfill(r:ProductReservation){setBusy(true);try{await fulfillProductReservation(r.id,payment,session?.id);alert(`Reserva ${r.code} concluída como venda.`);await reload()}catch(e){alert(friendlyError(e,'Não foi possível concluir a reserva.'))}finally{setBusy(false)}}
  if(error)return <ErrorState message={error}/>; if(!products)return <LoadingState label="Carregando frente de caixa…"/>;
  const activeReservations=reservations.filter(r=>r.status==='reserved'||r.status==='ready');
  return <div className="flex flex-col gap-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><h1 className="font-display text-2xl font-semibold">Frente de caixa</h1><p className="text-sm text-graphite">Venda produtos e serviços, receba reservas e acompanhe o movimento.</p></div><Card className="flex flex-wrap items-end gap-3 p-4">{session?<><div><p className="text-xs text-graphite">Caixa aberto</p><p className="font-medium">desde {new Date(session.opened_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</p></div><TextField label="Saldo contado (R$)" type="number" step="0.01" className="w-36" value={closing} onChange={e=>setClosing(e.target.value)}/><Button variant="secondary" onClick={close} disabled={busy}>Fechar caixa</Button></>:<><TextField label="Abertura (R$)" type="number" step="0.01" className="w-36" value={opening} onChange={e=>setOpening(e.target.value)}/><Button onClick={open} disabled={busy}><Banknote size={16}/> Abrir caixa</Button></>}</Card></div>

    <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
      <div className="space-y-6"><Card className="p-5"><h2 className="mb-4 font-display text-lg font-semibold">Produtos</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{products.map(p=><button key={p.id} onClick={()=>add('product',p)} disabled={p.stock_quantity<=0} className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 text-left hover:border-ink disabled:opacity-40">{p.photo_url?<img src={p.photo_url} alt="" className="h-12 w-12 rounded-lg object-cover"/>:<span className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100"><Package size={18}/></span>}<span className="min-w-0"><span className="block truncate text-sm font-medium">{p.name}</span><span className="text-xs text-graphite">{formatPrice(p.price_cents)} · estoque {p.stock_quantity}</span></span></button>)}</div></Card>
      <Card className="p-5"><h2 className="mb-4 font-display text-lg font-semibold">Serviços avulsos</h2><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{services.map(s=><button key={s.id} onClick={()=>add('service',s)} className="rounded-xl border border-zinc-200 p-3 text-left hover:border-ink"><span className="block text-sm font-medium">{s.name}</span><span className="text-xs text-graphite">{formatPrice(s.price_cents)}</span></button>)}</div></Card></div>

      <Card className="h-fit p-5 xl:sticky xl:top-24"><div className="mb-4 flex items-center gap-2"><ShoppingCart size={18}/><h2 className="font-display text-lg font-semibold">Venda atual</h2></div>{cart.length===0?<p className="rounded-xl bg-zinc-50 p-4 text-sm text-graphite">Adicione produtos ou serviços.</p>:<div className="space-y-3">{cart.map(i=><div key={i.key} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{i.name}</p><p className="text-xs text-graphite">{formatPrice(i.price_cents*i.quantity)}</p></div><div className="flex items-center gap-2"><button onClick={()=>delta(i.key,-1)}><Minus size={15}/></button><span className="w-5 text-center text-sm">{i.quantity}</span><button onClick={()=>delta(i.key,1)}><Plus size={15}/></button></div></div>)}</div>}
        <div className="mt-5 space-y-3 border-t border-zinc-100 pt-4"><label className="flex flex-col gap-1 text-sm text-graphite">Cliente<select value={customerId} onChange={e=>setCustomerId(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-ink"><option value="">Venda sem cliente</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="flex flex-col gap-1 text-sm text-graphite">Pagamento<select value={payment} onChange={e=>setPayment(e.target.value as PaymentMethod)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-ink">{Object.entries(PAYMENT_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><TextField label="Desconto (R$)" type="number" min="0" step="0.01" value={String(discount/100)} onChange={e=>setDiscount(Math.max(0,Math.round(Number(e.target.value)*100)))}/><div className="flex items-center justify-between text-sm"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div><div className="flex items-center justify-between text-lg font-semibold"><span>Total</span><span>{formatPrice(total)}</span></div><Button fullWidth onClick={finish} disabled={busy||cart.length===0}><WalletCards size={17}/>{busy?'Processando…':'Concluir venda'}</Button></div>
      </Card>
    </div>

    <Card className="p-5"><div className="mb-4 flex items-center gap-2"><ReceiptText size={18}/><h2 className="font-display text-lg font-semibold">Reservas para retirada</h2></div>{activeReservations.length===0?<p className="text-sm text-graphite">Nenhuma reserva aguardando retirada.</p>:<div className="divide-y divide-zinc-100">{activeReservations.map(r=><div key={r.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-medium">{r.code} · {r.customer?.name ?? 'Cliente'}</p><p className="text-sm text-graphite">{r.items?.map(i=>`${i.quantity}× ${i.product?.name ?? i.description ?? 'Produto'}`).join(' · ')}</p></div><div className="flex flex-wrap gap-2">{r.status==='reserved'&&<Button size="sm" variant="secondary" onClick={async()=>{await setReservationStatus(r.id,'ready');reload()}}>Marcar pronta</Button>}<Button size="sm" onClick={()=>fulfill(r)} disabled={busy}>Receber e concluir</Button><Button size="sm" variant="ghost" onClick={async()=>{if(confirm('Cancelar esta reserva?')){await setReservationStatus(r.id,'cancelled');reload()}}}>Cancelar</Button></div></div>)}</div>}</Card>

    <Card className="p-5"><h2 className="mb-4 font-display text-lg font-semibold">Últimas vendas</h2><div className="divide-y divide-zinc-100">{sales.map(s=><div key={s.id} className="flex items-center justify-between py-3"><div><p className="text-sm font-medium">{s.customer?.name ?? 'Venda balcão'}</p><p className="text-xs text-graphite">{new Date(s.created_at).toLocaleString('pt-BR')} · {PAYMENT_LABEL[s.payment_method]}</p></div><p className="font-medium">{formatPrice(s.total_cents)}</p></div>)}</div></Card>
  </div>
}
