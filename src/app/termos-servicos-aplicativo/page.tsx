import type { Metadata } from 'next';
import Link from 'next/link';
import LegalDocumentShell from '@/components/LegalDocumentShell';

export const metadata: Metadata = {
  title: 'Termos de serviço do aplicativo | NixVetApp',
  description:
    'Termos e condições de uso do aplicativo e plataforma NixVetApp para clínicas e profissionais veterinários.',
  robots: { index: true, follow: true },
};

const LAST = '23 de março de 2026';

export default function TermosServicosAplicativoPage() {
  return (
    <LegalDocumentShell title="Termos de serviço do aplicativo" lastUpdated={LAST}>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">1. Aceitação</h2>
        <p>
          Ao acessar ou utilizar o <strong>NixVetApp</strong> (site, aplicativo ou APIs associadas), você declara ter lido e
          concordado com estes Termos e com a{' '}
          <Link href="/politicas-uso" className="text-blue-600 underline">
            Política de uso e privacidade
          </Link>
          . Se não concordar, não utilize o serviço.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">2. Definições</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Plataforma:</strong> software NixVetApp oferecido em modelo SaaS para gestão clínica veterinária.
          </li>
          <li>
            <strong>Cliente / Clínica:</strong> pessoa jurídica ou profissional que contrata ou utiliza o serviço em nome de
            uma organização.
          </li>
          <li>
            <strong>Usuário:</strong> pessoa que acessa a Plataforma com credenciais fornecidas pelo Cliente.
          </li>
          <li>
            <strong>Conteúdo:</strong> dados, textos, arquivos e informações inseridos na Plataforma pelos Usuários ou pelo
            Cliente.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">3. Objeto do serviço</h2>
        <p>
          O NixVetApp oferece ferramentas de gestão (ex.: cadastros, agenda, prontuário, prescrições, integrações opcionais
          como Google Calendar), conforme plano contratado e disponibilidade técnica. Funcionalidades podem ser alteradas,
          melhoradas ou descontinuadas com aviso prévio razoável quando possível.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">4. Cadastro e credenciais</h2>
        <p>
          O Cliente é responsável pela veracidade dos dados cadastrais e pela gestão de Usuários (perfis, senhas, revogação
          de acesso). Não compartilhe credenciais. Atividades realizadas com login válido podem ser atribuídas ao Cliente,
          salvo comprovação de fraude externa não imputável ao Usuário.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">5. Uso permitido e proibições</h2>
        <p>É vedado, entre outros:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Utilizar a Plataforma para fins ilegais ou não autorizados;</li>
          <li>Violar direitos de terceiros ou normas de proteção de dados aplicáveis;</li>
          <li>Tentar obter acesso não autorizado a sistemas, dados de outros tenants ou contas de terceiros;</li>
          <li>Engenharia reversa, scraping abusivo ou sobrecarga intencional da infraestrutura;</li>
          <li>Revender ou sublicenciar o acesso sem autorização expressa.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">6. Integrações de terceiros (Google)</h2>
        <p>
          Recursos que dependem de serviços Google (ex.: sincronização de calendário) estão sujeitos aos termos e políticas do
          Google. A ativação é opcional e requer consentimento OAuth do titular da conta Google. O NixVetApp não se
          responsabiliza por indisponibilidade ou mudanças nas APIs do Google.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">7. Propriedade intelectual</h2>
        <p>
          O software, marca, layout e documentação do NixVetApp são de titularidade dos respectivos proprietários. O Cliente
          mantém a titularidade do seu Conteúdo. Concedemos licença de uso da Plataforma de forma limitada, não exclusiva e
          revogável, durante a vigência do relacionamento contratual.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">8. Disponibilidade e suporte</h2>
        <p>
          Empregamos esforços para manter o serviço disponível, sem garantia de funcionamento ininterrupto. Manutenções
          programadas ou emergenciais podem ocorrer. Canais de suporte seguem o acordo comercial com o Cliente.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">9. Limitação de responsabilidade</h2>
        <p>
          Na máxima extensão permitida pela lei aplicável, a responsabilidade por danos indiretos, lucros cessantes ou
          perda de dados não backupados pelo Cliente pode ser limitada ou excluída, conforme contrato específico. O uso de
          informações clínicas e decisões médico-veterinárias é de exclusiva responsabilidade do profissional e da clínica.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">10. Suspensão e encerramento</h2>
        <p>
          O acesso pode ser suspenso em caso de inadimplemento, violação destes Termos, ordem judicial ou risco à segurança.
          O Cliente pode solicitar encerramento conforme contrato. Após encerramento, dados podem ser excluídos ou entregues
          conforme política de retenção e acordo firmado.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">11. Lei e foro</h2>
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca do domicílio
          do Cliente contratante, salvo disposição legal imperativa em contrário ou cláusula específica em contrato escrito.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">12. Contato</h2>
        <p>
          Dúvidas sobre estes Termos devem ser encaminhadas ao canal oficial indicado no contrato ou na comunicação da
          operadora do NixVetApp.
        </p>
        <p className="text-sm text-slate-500">
          Texto modelo. Ajuste dados da empresa (razão social, CNPJ, e-mail, endereço, foro) e alinhe com contrato de
          prestação de serviços assinado com as clínicas.
        </p>
      </section>
    </LegalDocumentShell>
  );
}
