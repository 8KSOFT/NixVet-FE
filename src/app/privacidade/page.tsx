import type { Metadata } from 'next';
import LegalDocumentShell from '@/components/LegalDocumentShell';

export const metadata: Metadata = {
  title: 'Política de Privacidade — Apps NixVetApp | NixVet',
  description:
    'Política de privacidade dos aplicativos NixVetApp Equipe e NixVetApp Tutor, em conformidade com a LGPD.',
  robots: { index: true, follow: true },
};

const LAST = '24 de julho de 2026';

export default function PrivacidadePage() {
  return (
    <LegalDocumentShell title="Política de Privacidade — Aplicativos NixVetApp" lastUpdated={LAST}>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">1. Quem somos</h2>
        <p>
          Os aplicativos <strong>NixVetApp Equipe</strong> e <strong>NixVetApp Tutor</strong> são desenvolvidos e mantidos
          pela <strong>8KSOFT Tecnologia da Informação LTDA</strong> (CNPJ 19.868.193/0001-25), com sede na Av. Praia de
          Belas, 1212 — Praia de Belas, Porto Alegre/RS, CEP 90110-001, Brasil. Nesta política, &quot;nós&quot;,
          &quot;NixVet&quot; ou &quot;8KSOFT&quot; se referem a essa empresa.
        </p>
        <p>
          Este documento descreve como tratamos dados pessoais em conformidade com a{' '}
          <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)</strong>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">2. Aplicativos cobertos</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>NixVetApp Equipe</strong> — uso profissional pela equipe da clínica veterinária: agenda, prontuários,
            atendimentos, financeiro e atendimento via WhatsApp.
          </li>
          <li>
            <strong>NixVetApp Tutor</strong> — uso pelos tutores (clientes das clínicas): consulta de pets, carteira de
            vacinação, receitas e agendamento.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">3. Papéis no tratamento de dados</h2>
        <p>
          A <strong>clínica veterinária</strong> contratante é a <strong>Controladora</strong> dos dados dos pacientes
          (animais), atendimentos, prontuários e de seus clientes. A <strong>8KSOFT/NixVet</strong> atua como{' '}
          <strong>Operadora</strong>, tratando esses dados por conta e ordem da clínica. Para os dados necessários ao
          funcionamento das contas dos aplicativos (cadastro, autenticação, notificações), a 8KSOFT atua como Controladora.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">4. Dados que coletamos</h2>
        <p>
          <strong>NixVetApp Equipe:</strong> nome e e-mail profissional (autenticação), código da clínica (vínculo ao
          estabelecimento), identificador e token do dispositivo (notificações e segurança) e dados de uso do app.
        </p>
        <p>
          <strong>NixVetApp Tutor:</strong> e-mail e telefone (autenticação por código e vínculo ao cadastro), nome, CPF
          quando aplicável, dados dos pets (vacinas, receitas, histórico — exibidos ao próprio tutor) e identificador/token
          do dispositivo.
        </p>
        <p className="text-slate-600">
          Não coletamos localização precisa, contatos da agenda ou fotos da galeria (exceto arquivos que você anexa
          deliberadamente), nem dados de cartão dentro do app — pagamentos, quando existirem, são processados pela plataforma
          Asaas fora do aplicativo.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">5. Bases legais (art. 7º e 11 da LGPD)</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Execução de contrato</strong> — prestação do serviço à clínica e ao tutor.</li>
          <li><strong>Consentimento</strong> — notificações e comunicações; revogável a qualquer momento.</li>
          <li><strong>Legítimo interesse</strong> — segurança, prevenção a fraude e melhoria do serviço.</li>
          <li><strong>Obrigação legal/regulatória</strong> — guarda de registros clínicos e fiscais.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">6. Com quem compartilhamos</h2>
        <p>Não vendemos dados pessoais. Compartilhamos apenas com operadores necessários ao funcionamento:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Provedor de infraestrutura em nuvem (hospedagem da aplicação e do banco de dados).</li>
          <li>Provedores de e-mail e SMS (envio do código de verificação e comunicações).</li>
          <li>Serviços de notificação (Expo, Apple APNs, Google FCM) para push.</li>
          <li>Asaas, para processamento de pagamentos, quando aplicável.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">7. Armazenamento e segurança</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Comunicação entre app e servidor sempre por HTTPS/TLS.</li>
          <li>Dados sensíveis (como telefone e e-mail) armazenados de forma criptografada.</li>
          <li>Tokens de acesso no armazenamento seguro do dispositivo (Keychain/Keystore).</li>
          <li>Acesso segregado por clínica (isolamento multi-tenant) e por perfil de permissão.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">8. Retenção</h2>
        <p>
          Mantemos os dados enquanto durar a relação com a clínica/tutor e pelos prazos legais aplicáveis. Encerrada a
          finalidade, os dados são eliminados ou anonimizados.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">9. Seus direitos (art. 18 da LGPD)</h2>
        <p>
          Você pode solicitar confirmação e acesso aos dados, correção, anonimização ou eliminação, portabilidade,
          informação sobre compartilhamentos e revogação do consentimento. Para dados sob controle da clínica, encaminhamos
          a solicitação ao respectivo estabelecimento.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">10. Notificações, menores e transferência</h2>
        <p>
          Usamos tokens de push apenas para notificações do serviço, desativáveis nas configurações do dispositivo. Os
          aplicativos não se destinam a menores de 18 anos. Caso algum provedor processe dados fora do Brasil, adotamos as
          salvaguardas exigidas pela LGPD.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">11. Contato e Encarregado (DPO)</h2>
        <p>
          Dúvidas ou solicitações sobre privacidade: <strong>privacidade@nixvetapp.com.br</strong>.<br />
          Encarregado pelo Tratamento de Dados (DPO): <strong>Marcelo Coppini</strong> — dpo@nixvetapp.com.br.<br />
          Endereço: Av. Praia de Belas, 1212 — Praia de Belas, Porto Alegre/RS, CEP 90110-001.
        </p>
      </section>
    </LegalDocumentShell>
  );
}
