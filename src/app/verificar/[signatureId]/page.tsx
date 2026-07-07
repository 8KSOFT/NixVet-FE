"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Loader2,
  Store,
  User as UserIcon,
  Download,
  FileText,
} from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-base";

interface Medication {
  name: string;
  concentration?: string;
  form_of_administration?: string;
  dosage?: string;
  frequency_value?: number;
  frequency_unit?: string;
  duration_value?: number;
  duration_unit?: string;
  usage_description?: string;
  observations?: string;
  continuous_use?: boolean;
}

interface VerificationData {
  level: 0 | 1 | 2;
  id: string;
  valid: boolean;
  status: "PENDING" | "SIGNING" | "SIGNED" | "REVOKED" | "EXPIRED";
  veterinarian: { name: string | null; crmv: string | null };
  clinic: string | null;
  signed_at: string | null;
  is_controlled: boolean;
  serial_number: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  has_pdf: boolean;
  tutor_name?: string;
  pet?: { name: string; species: string; weight: number | null };
  medications?: Medication[];
  observations?: string | null;
  tutor_cpf?: string | null;
  tutor_address?: string | null;
  tutor_phone?: string | null;
}

type Panel = "none" | "pharmacy" | "tutor";

const FORM_LABELS: Record<string, string> = {
  oral: "Oral",
  topica: "Tópica",
  colirio: "Colírio",
  spray: "Spray",
  injetavel: "Injetável",
  outro: "Outro",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
  } catch {
    return iso;
  }
}

function statusVisual(data: VerificationData) {
  if (data.status === "REVOKED")
    return { Icon: ShieldX, label: "Assinatura revogada", cls: "text-red-600 bg-red-50 border-red-200" };
  if (data.status === "EXPIRED")
    return { Icon: ShieldAlert, label: "Assinatura expirada", cls: "text-amber-600 bg-amber-50 border-amber-200" };
  if (data.valid && data.status === "SIGNED")
    return { Icon: ShieldCheck, label: "Assinatura válida", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  return { Icon: ShieldX, label: "Assinatura inválida", cls: "text-red-600 bg-red-50 border-red-200" };
}

export default function VerificarPage() {
  const params = useParams<{ signatureId: string }>();
  const signatureId = params?.signatureId as string;

  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("none");
  const [tokenInput, setTokenInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeToken, setActiveToken] = useState<string | null>(null);

  const fetchVerification = useCallback(
    async (token?: string, code?: string) => {
      const qs = new URLSearchParams();
      if (token) qs.set("token", token);
      if (code) qs.set("code", code);
      const url = `${getApiBaseUrl()}/verificar/${signatureId}${
        qs.toString() ? `?${qs.toString()}` : ""
      }`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.status === 404) throw new Error("Documento não encontrado.");
      if (res.status === 403) throw new Error("Token ou código inválido.");
      if (res.status === 429)
        throw new Error("Muitas tentativas. Aguarde alguns instantes.");
      if (!res.ok) throw new Error("Não foi possível verificar o documento.");
      return (await res.json()) as VerificationData;
    },
    [signatureId],
  );

  // Carga inicial (nível 0) — e auto-avanço se a URL trouxer token/código (QR).
  useEffect(() => {
    if (!signatureId) return;
    const sp = new URLSearchParams(window.location.search);
    const urlToken = sp.get("token") ?? undefined;
    const urlCode = sp.get("code") ?? undefined;
    (async () => {
      try {
        const d = await fetchVerification(urlToken, urlCode);
        setData(d);
        if (urlToken) setActiveToken(urlToken);
      } catch (e) {
        // Se falhar com token da URL, ainda mostra o status público.
        try {
          const d0 = await fetchVerification();
          setData(d0);
        } catch (e2) {
          setError((e2 as Error).message || (e as Error).message);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [signatureId, fetchVerification]);

  const submitPanel = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const token = tokenInput.trim().toUpperCase();
      const code = panel === "tutor" ? codeInput.trim() : undefined;
      const d = await fetchVerification(token, code);
      setData(d);
      setActiveToken(token);
      setPanel("none");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm w-full rounded-xl border border-red-200 bg-white p-6 text-center">
          <ShieldX className="mx-auto h-10 w-10 text-red-500" />
          <p className="mt-3 font-medium text-slate-800">{error}</p>
          <p className="mt-1 text-sm text-slate-500">
            Verifique o link ou o QR Code da receita.
          </p>
        </div>
      </main>
    );
  }

  if (!data) return null;
  const sv = statusVisual(data);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-lg space-y-4">
        <div className="text-center">
          <p className="text-lg font-bold tracking-tight text-slate-800">NixVetApp</p>
          <p className="text-xs text-slate-500">Verificação de receita digital</p>
        </div>

        {/* Status */}
        <div className={`rounded-xl border p-5 text-center ${sv.cls}`}>
          <sv.Icon className="mx-auto h-11 w-11" />
          <p className="mt-2 text-lg font-semibold">{sv.label}</p>
          {data.is_controlled && (
            <p className="mt-1 text-xs font-medium opacity-80">
              Receituário de Controle Especial{data.serial_number ? ` — Nº ${data.serial_number}` : ""}
            </p>
          )}
        </div>

        {/* Emitente */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <dl className="space-y-2 text-sm">
            <Row label="Veterinário(a)" value={data.veterinarian.name} />
            <Row label="CRMV" value={data.veterinarian.crmv} />
            <Row label="Clínica" value={data.clinic} />
            <Row label="Assinado em" value={fmtDate(data.signed_at)} />
            {data.status === "REVOKED" && (
              <Row label="Revogada em" value={fmtDate(data.revoked_at)} />
            )}
          </dl>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Nível 0 → escolha de acesso */}
        {data.level === 0 && (
          <div className="space-y-3">
            {panel === "none" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={() => { setPanel("pharmacy"); setError(null); }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                >
                  <Store className="h-4 w-4" /> Sou farmácia
                </button>
                <button
                  onClick={() => { setPanel("tutor"); setError(null); }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                >
                  <UserIcon className="h-4 w-4" /> Sou o tutor
                </button>
              </div>
            )}

            {panel !== "none" && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <p className="text-sm font-medium text-slate-700">
                  {panel === "pharmacy"
                    ? "Insira o token da farmácia (impresso na receita)."
                    : "Insira o token e o código de desbloqueio do tutor."}
                </p>
                <input
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Token (ex.: A1B2C3)"
                  autoCapitalize="characters"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase tracking-widest focus:border-slate-400 focus:outline-none"
                />
                {panel === "tutor" && (
                  <input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="Código de desbloqueio (4 dígitos)"
                    inputMode="numeric"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tracking-widest focus:border-slate-400 focus:outline-none"
                  />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={submitPanel}
                    disabled={submitting || !tokenInput.trim() || (panel === "tutor" && !codeInput.trim())}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Consultar
                  </button>
                  <button
                    onClick={() => { setPanel("none"); setError(null); }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nível ≥ 1 → documento */}
        {data.level >= 1 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-2 text-slate-700">
              <FileText className="h-4 w-4" />
              <p className="text-sm font-semibold">Prescrição</p>
            </div>

            <dl className="space-y-2 text-sm">
              {data.pet && (
                <Row
                  label="Paciente"
                  value={`${data.pet.name} (${data.pet.species}${
                    data.pet.weight != null ? `, ${data.pet.weight} kg` : ""
                  })`}
                />
              )}
              <Row label="Tutor" value={data.tutor_name ?? null} />
              {data.level === 2 && (
                <>
                  <Row label="CPF" value={data.tutor_cpf ?? null} />
                  <Row label="Telefone" value={data.tutor_phone ?? null} />
                  <Row label="Endereço" value={data.tutor_address ?? null} />
                </>
              )}
            </dl>

            {!!data.medications?.length && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                {data.medications.map((med, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium text-slate-800">
                      {i + 1}. {med.name}
                      {med.form_of_administration
                        ? ` — ${FORM_LABELS[med.form_of_administration] ?? med.form_of_administration}`
                        : ""}
                    </p>
                    {med.concentration && (
                      <p className="text-xs text-slate-500">{med.concentration}</p>
                    )}
                    <p className="text-xs text-slate-600">
                      {[
                        med.dosage && `Dose: ${med.dosage}`,
                        med.frequency_value != null && med.frequency_unit && `Freq.: ${med.frequency_value} ${med.frequency_unit}`,
                        med.duration_value != null && med.duration_unit && `Duração: ${med.duration_value} ${med.duration_unit}`,
                      ].filter(Boolean).join(" · ")}
                    </p>
                    {med.usage_description && (
                      <p className="text-xs text-slate-600">{med.usage_description}</p>
                    )}
                    {med.continuous_use && (
                      <span className="mt-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                        USO CONTÍNUO
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {data.observations && (
              <div className="border-t border-slate-100 pt-3 text-sm">
                <p className="font-medium text-slate-700">Recomendações</p>
                <p className="text-slate-600">{data.observations}</p>
              </div>
            )}

            {data.has_pdf && activeToken && (
              <a
                href={`${getApiBaseUrl()}/verificar/${data.id}/pdf?token=${encodeURIComponent(activeToken)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Download className="h-4 w-4" /> Baixar receita em PDF
              </a>
            )}

            {data.level === 1 && (
              <p className="text-center text-xs text-slate-400">
                É o tutor? Informe também o código de desbloqueio para ver seus dados.
              </p>
            )}
          </div>
        )}

        <p className="pt-2 text-center text-[11px] text-slate-400">
          Documento assinado digitalmente via NixVetApp. Consulta protegida e auditada.
        </p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value || "—"}</dd>
    </div>
  );
}
