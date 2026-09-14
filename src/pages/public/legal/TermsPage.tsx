import { Link, useOutletContext } from 'react-router-dom';
import { Barbershop } from '@/types';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { publicPath } from '@/utils/publicPath';

export function TermsPage() {
  const { barbershop } = useOutletContext<{ barbershop: Barbershop }>();

  return (
    <LegalPageLayout title="Termos de Uso" updatedAt="setembro de 2026" backTo={publicPath(barbershop.slug)}>
      <p>
        Estes termos regem o uso do sistema de agendamento online da <strong>{barbershop.name}</strong>. Ao criar
        uma conta, você concorda com o que está descrito aqui.
      </p>

      <h2>O que este sistema faz</h2>
      <p>
        Este é um sistema de agendamento de horários para os serviços oferecidos pela {barbershop.name}. Ele permite
        escolher um serviço, um profissional, uma data e um horário disponível, e gerenciar (visualizar, cancelar ou
        remarcar) seus próprios agendamentos.
      </p>

      <h2>Cadastro e conta</h2>
      <ul className="list-disc pl-5">
        <li>Você deve fornecer nome, e-mail e WhatsApp verdadeiros para criar uma conta.</li>
        <li>Você é responsável por manter sua senha em sigilo e por tudo que acontecer usando sua conta.</li>
        <li>Uma conta é pessoal — não a compartilhe com outras pessoas.</li>
      </ul>

      <h2>Agendamentos</h2>
      <ul className="list-disc pl-5">
        <li>Um agendamento só é confirmado quando o sistema emite um código de confirmação.</li>
        <li>
          Você pode cancelar ou remarcar seus próprios agendamentos pela área <Link to={publicPath(barbershop.slug, "/conta")}>Minha conta</Link>,
          respeitando a disponibilidade de horários no momento.
        </li>
        <li>
          A barbearia pode ter uma política própria de cancelamento (prazo mínimo, tolerância de atraso etc.),
          informada na página inicial ou diretamente pela equipe.
        </li>
        <li>Faltas recorrentes sem cancelamento prévio podem levar a restrições de novos agendamentos.</li>
      </ul>

      <h2>Uso adequado</h2>
      <p>Ao usar este sistema, você concorda em não:</p>
      <ul className="list-disc pl-5">
        <li>Fornecer dados falsos ou de terceiros sem autorização;</li>
        <li>Tentar acessar dados de outros clientes ou de outras barbearias no sistema;</li>
        <li>Usar o sistema para qualquer finalidade ilegal ou que prejudique seu funcionamento.</li>
      </ul>

      <h2>Disponibilidade</h2>
      <p>
        Fazemos o possível para manter o sistema disponível, mas não garantimos operação ininterrupta. A barbearia
        pode, a critério próprio, suspender temporariamente novos agendamentos.
      </p>

      <h2>Seus dados</h2>
      <p>
        O tratamento dos seus dados pessoais está descrito na nossa <Link to={publicPath(barbershop.slug, "/privacidade")}>Política de Privacidade</Link>.
      </p>

      <h2>Alterações destes termos</h2>
      <p>
        Podemos atualizar estes termos eventualmente. Caso façamos alterações relevantes, a data de "última
        atualização" no topo desta página será revisada.
      </p>
    </LegalPageLayout>
  );
}
