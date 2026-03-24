import type { Metadata } from 'next';
import Link from 'next/link';
import LegalDocumentShell from '@/components/LegalDocumentShell';

export const metadata: Metadata = {
  title: 'Políticas de uso e privacidade | NixVetApp',
  description:
    'Política de privacidade, tratamento de dados e integrações (incluindo Google) do NixVetApp — gestão clínica veterinária.',
  robots: { index: true, follow: true },
};

const LAST = '23 de março de 2026';

export default function PoliticasUsoPage() {
  return (
    <LegalDocumentShell title="Políticas de uso e privacidade" lastUpdated={LAST}>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">1. Introdução</h2>
        <p>
          O <strong>NixVetApp</strong> é uma plataforma de gestão para clínicas e profissionais veterinários. Este documento
          descreve como tratamos dados pessoais e informações da operação, em conformidade com a Lei Geral de Proteção de
          Dados (Lei nº 13.709/2018 — LGPD) e boas práticas para uso de APIs de terceiros, incluindo serviços{' '}
          <strong>Google</strong> quando você optar por integrar o calendário.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">2. Controlador e contato</h2>
        <p>
          O controlador dos dados pessoais tratados em razão do contrato de uso da plataforma é a empresa responsável pela
          operação do NixVetApp na sua relação com cada clínica ou titular, conforme contrato ou termos comerciais
          aplicáveis. Para exercício de direitos do titular, dúvidas sobre privacidade ou encarregado de dados (DPO), utilize
          o canal de contato indicado pelo seu contratante ou, na ausência, o suporte oficial do serviço.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">3. Dados que podemos tratar</h2>
        <p>Dependendo dos módulos utilizados, podemos tratar, entre outros:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Dados de cadastro de usuários (nome, e-mail, perfil de acesso, identificação da clínica/tenant);</li>
          <li>Dados de tutores e pacientes (animais) inseridos na plataforma pela clínica;</li>
          <li>Dados de agendamentos, consultas, prontuários e documentos gerados no sistema;</li>
          <li>Registros técnicos (logs, IP, data/hora de acesso) para segurança e auditoria;</li>
          <li>
            Dados provenientes de <strong>integrações opcionais</strong>, como tokens e metadados de calendário quando você
            conecta sua conta Google ao NixVetApp.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">4. Finalidades</h2>
        <p>Tratamos dados para:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Prestação do serviço SaaS (acesso, autenticação, multi-tenant por clínica);</li>
          <li>Operação de funcionalidades de agenda, prontuário, prescrições e demais módulos contratados;</li>
          <li>
            Sincronização opcional com <strong>Google Calendar</strong>, quando autorizado pelo usuário, para criar ou
            refletir eventos de agenda conforme as permissões concedidas no consentimento OAuth;
          </li>
          <li>Cumprimento de obrigações legais e resposta a solicitações legítimas de autoridades;</li>
          <li>Melhoria de segurança, prevenção a fraudes e suporte técnico.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">5. Integração com Google (Calendar API)</h2>
        <p>
          Se a clínica ou usuário habilitar a integração, o NixVetApp utilizará as credenciais OAuth fornecidas pelo Google,
          dentro dos escopos solicitados no fluxo de consentimento (por exemplo, criação/gerenciamento de eventos no
          calendário conforme implementação atual). Os tokens de acesso são armazenados de forma associada ao tenant e
          protegidos por medidas técnicas adequadas (incluindo criptografia em repouso, quando aplicável na infraestrutura).
        </p>
        <p>
          O uso das informações recebidas das APIs do Google seguirá a{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="text-blue-600 underline hover:no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de dados do usuário dos serviços de API do Google
          </a>
          , incluindo requisitos de uso limitado, quando aplicável.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">6. Compartilhamento</h2>
        <p>
          Podemos utilizar provedores de infraestrutura (hospedagem, banco de dados, e-mail transacional) e, quando ativa a
          integração, o <strong>Google</strong> como processador/fornecedor do serviço de calendário, conforme as políticas
          do Google. Não vendemos dados pessoais. Qualquer suboperador é selecionado com base em obrigações contratuais de
          confidencialidade e segurança.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">7. Retenção</h2>
        <p>
          Mantemos os dados pelo tempo necessário para cumprir as finalidades descritas, obrigações legais e resolução de
          litígios. Integrações com Google podem ser revogadas pelo usuário nas configurações da conta Google ou
          desconectadas no próprio NixVetApp, quando disponível.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">8. Direitos dos titulares (LGPD)</h2>
        <p>
          Nos termos da LGPD, o titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, eliminação,
          portabilidade, informação sobre compartilhamentos e revogação de consentimento, quando aplicável. Solicitações
          devem ser encaminhadas pelo canal oficial da clínica ou do operador da plataforma.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">9. Segurança</h2>
        <p>
          Adotamos medidas técnicas e administrativas proporcionais ao risco, como controle de acesso, HTTPS em trânsito,
          segregação por tenant e boas práticas de desenvolvimento. Nenhum sistema é 100% invulnerável; em caso de incidente
          relevante, comunicaremos conforme a lei.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">10. Alterações</h2>
        <p>
          Podemos atualizar esta política para refletir mudanças legais ou no produto. A data no topo desta página indica a
          última revisão. O uso continuado após alterações materialmente relevantes pode exigir novo aceite, conforme
          aplicável.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">11. Disposições gerais</h2>
        <p>
          Este documento complementa os <Link href="/termos-servicos-aplicativo" className="text-blue-600 underline">Termos de serviço do aplicativo</Link>.
          Em caso de conflito entre documentos, prevalecerá o acordo específico firmado com a clínica, quando existir.
        </p>
        <p className="text-sm text-slate-500">
          Texto modelo para fins de transparência e requisitos de plataformas (Google, lojas de app). Revise com assessoria
          jurídica antes da produção final.
        </p>
      </section>
    </LegalDocumentShell>
  );
}
