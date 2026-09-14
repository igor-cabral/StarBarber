import { useOutletContext } from 'react-router-dom';
import { Barbershop } from '@/types';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { publicPath } from '@/utils/publicPath';

export function CookiesPage() {
  const { barbershop } = useOutletContext<{ barbershop: Barbershop }>();

  return (
    <LegalPageLayout title="Política de Cookies" updatedAt="setembro de 2026" backTo={publicPath(barbershop.slug)}>
      <p>
        Cookies são pequenos arquivos guardados pelo seu navegador. Usamos o mínimo possível, e explicamos aqui
        exatamente o que cada um faz.
      </p>

      <h2>Cookies essenciais (sempre ativos)</h2>
      <p>
        Usamos apenas os cookies/armazenamento local necessários para manter você logado com segurança (sessão de
        autenticação, fornecida pela Supabase). Sem eles, não é possível usar a área "Minha conta" nem o painel
        administrativo. Por serem estritamente necessários ao funcionamento do serviço que você solicitou, a LGPD e
        o Marco Civil da Internet não exigem consentimento prévio para esse tipo de cookie — mas informamos aqui de
        qualquer forma, por transparência.
      </p>

      <h2>Cookies de análise ou publicidade</h2>
      <p>
        Este sistema <strong>não usa</strong> cookies de análise de terceiros (como Google Analytics) nem de
        publicidade/rastreamento no momento. Se isso mudar no futuro, esta página será atualizada e um novo
        consentimento será solicitado antes de qualquer cookie não essencial ser ativado.
      </p>

      <h2>Como gerenciar</h2>
      <p>
        Como não usamos cookies de rastreamento, não há preferências para configurar. Você pode limpar os cookies
        essenciais a qualquer momento nas configurações do seu navegador — isso vai apenas encerrar sua sessão,
        exigindo login novamente.
      </p>
    </LegalPageLayout>
  );
}
