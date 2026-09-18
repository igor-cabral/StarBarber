import { useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { uploadBarbershopMedia } from '@/services/media';
import { friendlyError } from '@/utils/errors';

export function MediaUpload({
  barbershopId,
  category,
  value,
  onChange,
  label = 'Foto',
}: {
  barbershopId: string;
  category: 'products' | 'services' | 'barbers';
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Selecione um arquivo de imagem.');
    if (file.size > 5 * 1024 * 1024) return alert('A imagem deve ter no máximo 5 MB.');
    setUploading(true);
    try {
      onChange(await uploadBarbershopMedia(barbershopId, category, file));
    } catch (err) {
      alert(friendlyError(err, 'Não foi possível enviar a imagem.'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-graphite">{label}</span>
      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
          <img src={value} alt="Prévia" className="h-40 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-ink shadow"
            aria-label="Remover foto"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-sm text-graphite hover:border-ink">
          {uploading ? <Loader2 className="animate-spin" size={20} /> : <ImagePlus size={20} />}
          {uploading ? 'Enviando…' : 'Enviar imagem'}
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
      )}
      <input
        className="rounded-xl border border-zinc-200 px-3 py-2 text-xs text-graphite outline-none focus:border-accent"
        placeholder="Ou cole uma URL de imagem"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </div>
  );
}
