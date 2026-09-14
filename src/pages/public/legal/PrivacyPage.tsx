import { Link, useOutletContext } from 'react-router-dom';
import { Barbershop } from '@/types';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { publicPath } from '@/utils/publicPath';

export function PrivacyPage() {
  const { barbershop } = useOutletContext<{ barbershop: Barbershop }>();

  return (
    <LegalPageLayout title="Política de Privacidade" updatedAt="setembro de 2026" backTo={publicPath(barbershop.slug)}>
      <p>
        Esta política explica quais dados a <strong>{barbershop.name}</strong> coleta ao usar este sistema de
        agendamento, para que servem, e quais direitos você tem sobre eles, em conformidade com a Lei Geral de
        Proteção de Dados (Lei nº 13.709/2018 — LGPD).
      </p>

      <h2>Quem é o controlador dos seus dados</h2>
      <p>
        A <strong>{barbershop.name}</strong> é a controladora dos dados coletados neste site — é ela quem decide
        como e para que seus dados são usados. A plataforma técnica (StarBarber) atua como operadora, processando os
        dados apenas para viabilizar o funcionamento do sistema de agendamento, sob instrução da barbearia.
      </p>

      <h2>Quais dados coletamos</h2>
      <p>Ao criar uma conta e agendar um horário, coletamos:</p>
      <ul className="list-disc pl-5">
        <li>Nome completo</li>
        <li>E-mail (usado para login e comunicações sobre sua conta)</li>
        <li>WhatsApp/telefone (usado para contato sobre o agendamento)</li>
        <li>Histórico de agendamentos (serviços, datas, horários, status)</li>
      </ul>
      <p>Não coletamos dados sensíveis (saúde, biometria, etc.) nem dados de pagamento neste sistema.</p>

      <h2>Para que usamos esses dados</h2>
      <ul className="list-disc pl-5">
        <li>Criar e gerenciar sua conta de cliente</li>
        <li>Processar, confirmar, cancelar e remarcar seus agendamentos</li>
        <li>Entrar em contato sobre um agendamento específico</li>
        <li>Cumprir obrigações legais e fiscais da barbearia (ex.: histórico de atendimentos)</li>
      </ul>

      <h2>Com quem compartilhamos</h2>
      <p>
        Seus dados são visíveis para a equipe da <strong>{barbershop.name}</strong> (administradores, operadores de
        caixa e o profissional com quem você tem agendamento). Não vendemos nem compartilhamos seus dados com
        terceiros para fins de marketing. A infraestrutura técnica (banco de dados e autenticação) é fornecida pela
        Supabase, que atua como suboperadora.
      </p>

      <h2>Por quanto tempo guardamos seus dados</h2>
      <p>
        Enquanto sua conta estiver ativa. Se você solicitar a exclusão dos seus dados (veja abaixo), seus dados
        pessoais são anonimizados; o histórico de agendamentos em si pode ser mantido de forma não identificável,
        pois a barbearia tem interesse legítimo/obrigação legal em manter registros de atendimentos realizados.
      </p>

      <h2>Seus direitos</h2>
      <p>Você pode, a qualquer momento, na sua área de conta (<Link to={publicPath(barbershop.slug, "/conta")}>/conta</Link>):</p>
      <ul className="list-disc pl-5">
        <li>Consultar os dados e o histórico de agendamentos vinculados à sua conta</li>
        <li>Baixar uma cópia dos seus dados (portabilidade)</li>
        <li>Solicitar a exclusão (anonimização) dos seus dados pessoais</li>
      </ul>
      <p>
        Você também pode corrigir nome/WhatsApp diretamente na tela de agendamento, ou entrar em contato com a
        barbearia pelos canais informados na página inicial.
      </p>

      <h2>Cookies</h2>
      <p>
        Usamos apenas cookies essenciais de sessão (autenticação). Veja detalhes na nossa{' '}
        <Link to={publicPath(barbershop.slug, "/cookies")}>Política de Cookies</Link>.
      </p>

      <h2>Contato</h2>
      <p>
        Para dúvidas sobre seus dados, entre em contato com a {barbershop.name} pelos canais informados na página
        inicial{barbershop.whatsapp ? ` (WhatsApp: ${barbershop.whatsapp})` : ''}.
      </p>
    </LegalPageLayout>
  );
}
