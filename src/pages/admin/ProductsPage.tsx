import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Package, Pencil, Plus, Trash2, X } from 'lucide-react';
import { ShopStaffProfile } from '@/services/auth';
import { deleteProduct, listProducts, upsertProduct } from '@/services/commerce';
import { Product } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { MediaUpload } from '@/components/admin/MediaUpload';
import { formatPrice } from '@/utils/format';
import { friendlyError } from '@/utils/errors';

export function ProductsPage() {
  const { profile } = useOutletContext<{ profile: ShopStaffProfile }>();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [form, setForm] = useState<Partial<Product> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    setError(null);
    listProducts(profile.barbershop_id).then(setProducts).catch((e) => setError(friendlyError(e, 'Não foi possível carregar os produtos.')));
  }
  useEffect(reload, [profile.barbershop_id]);

  async function save() {
    if (!form?.name || form.price_cents == null) return;
    try {
      await upsertProduct({
        id: form.id,
        barbershop_id: profile.barbershop_id,
        name: form.name,
        description: form.description ?? null,
        sku: form.sku || null,
        price_cents: form.price_cents,
        stock_quantity: form.stock_quantity ?? 0,
        low_stock_threshold: form.low_stock_threshold ?? 3,
        photo_url: form.photo_url ?? null,
        active: form.active ?? true,
      });
      setForm(null);
      reload();
    } catch (e) {
      alert(friendlyError(e, 'Não foi possível salvar o produto.'));
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!products) return <LoadingState />;

  return <div className="flex flex-col gap-6">
    <div className="flex items-center justify-between gap-4">
      <div><h1 className="font-display text-2xl font-semibold">Produtos</h1><p className="text-sm text-graphite">Catálogo, preço, foto e estoque da loja.</p></div>
      <Button onClick={() => setForm({ stock_quantity: 0, low_stock_threshold: 3, active: true })}><Plus size={16}/> Novo produto</Button>
    </div>
    {products.length === 0 ? <EmptyState title="Nenhum produto cadastrado" description="Cadastre pomadas, shampoos, óleos, acessórios e outros itens vendidos pela barbearia."/> :
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{products.map((p) => <Card key={p.id} className="overflow-hidden p-0">
        <div className="aspect-[16/9] bg-zinc-100">{p.photo_url ? <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-zinc-400"><Package size={34}/></div>}</div>
        <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium">{p.name}</h3><p className="text-sm text-graphite">{formatPrice(p.price_cents)}</p></div><span className={`rounded-full px-2 py-1 text-xs ${p.stock_quantity <= p.low_stock_threshold ? 'bg-amber-100 text-amber-800':'bg-zinc-100 text-graphite'}`}>Estoque {p.stock_quantity}</span></div>
        <div className="mt-4 flex gap-2"><Button size="sm" variant="ghost" onClick={() => setForm(p)}><Pencil size={15}/> Editar</Button><Button size="sm" variant="ghost" onClick={async()=>{if(confirm('Excluir este produto?')){try{await deleteProduct(p.id);reload()}catch(e){alert(friendlyError(e,'Não foi possível excluir.'))}}}}><Trash2 size={15}/></Button></div></div>
      </Card>)}</div>}

    {form && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"><Card className="max-h-[92vh] w-full max-w-lg overflow-y-auto p-6">
      <div className="mb-5 flex items-center justify-between"><h2 className="font-display text-xl font-semibold">{form.id ? 'Editar produto':'Novo produto'}</h2><button onClick={()=>setForm(null)}><X size={20}/></button></div>
      <div className="flex flex-col gap-4">
        <MediaUpload barbershopId={profile.barbershop_id} category="products" value={form.photo_url} onChange={(photo_url)=>setForm({...form,photo_url})}/>
        <TextField label="Nome" value={form.name ?? ''} onChange={e=>setForm({...form,name:e.target.value})}/>
        <TextField label="Descrição" value={form.description ?? ''} onChange={e=>setForm({...form,description:e.target.value})}/>
        <TextField label="SKU / código interno" value={form.sku ?? ''} onChange={e=>setForm({...form,sku:e.target.value})}/>
        <div className="grid grid-cols-2 gap-3"><TextField label="Preço (R$)" type="number" step="0.01" value={form.price_cents != null ? String(form.price_cents/100):''} onChange={e=>setForm({...form,price_cents:Math.round(Number(e.target.value)*100)})}/><TextField label="Estoque" type="number" value={String(form.stock_quantity ?? 0)} onChange={e=>setForm({...form,stock_quantity:Math.max(0,Number(e.target.value))})}/></div>
        <TextField label="Avisar estoque baixo em" type="number" value={String(form.low_stock_threshold ?? 3)} onChange={e=>setForm({...form,low_stock_threshold:Math.max(0,Number(e.target.value))})}/>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active ?? true} onChange={e=>setForm({...form,active:e.target.checked})}/> Disponível para venda</label>
        <Button onClick={save}>Salvar produto</Button>
      </div>
    </Card></div>}
  </div>;
}
