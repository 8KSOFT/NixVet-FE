"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Info, Loader2 } from "lucide-react";
import { API_PAGE_SIZE } from "@/lib/pagination";
import { ListPagination } from "@/components/list-pagination";
import { useBularioItemQuery, useBularioSearchQuery } from "@/hooks/apiHooks/useBulario";

export default function BularioPage() {
  const [listPage, setListPage] = useState(1);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: searchPage, isLoading: loading } = useBularioSearchQuery(activeQuery, listPage);
  const dataSource = searchPage?.items ?? [];
  const listTotal = searchPage?.total ?? 0;
  const listTotalPages = searchPage?.totalPages ?? 1;

  const { data: detailItem, isFetching: detailLoading } = useBularioItemQuery(
    detailVisible ? detailId : null,
  );

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(() => {
      setActiveQuery(query.trim());
      setListPage(1);
    }, 2000);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = () => {
    if (!query || query.trim().length < 2) {
      return;
    }
    setListPage(1);
    setActiveQuery(query.trim());
  };

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetailVisible(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center flex-wrap gap-2 mb-8">
        <h1 className="text-2xl font-extrabold font-['interDoFigma'] flex items-center gap-2">
          Bulário – Consulta de Medicamentos
        </h1>
      </div>

      <div className="mb-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7" />
            <Input
              placeholder="Buscar por nome do medicamento"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-12 rounded-full h-15! placeholder:text-black/80"
            />
          </div>
          {dataSource && (
            <Button
              className="text-primary"
              variant="link"
              onClick={() => {
                setQuery("");
                setActiveQuery("");
                setListPage(1);
              }}
            >
              Limpar lista
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-xs pl-5 mt-2">
          Digite pelo menos 2 caracteres e clique em Buscar para listar os
          medicamentos.
        </p>
      </div>

      <div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin w-6 h-6 text-muted-foreground/60" />
          </div>
        ) : dataSource.length === 0 ? (
          <div className="h-[calc(100vh-400px)] flex items-center justify-center text-muted-foreground">
            <p>
              {activeQuery
                ? "Nenhum medicamento encontrado."
                : "Use a busca acima para consultar o bulário."}
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop / tablet: tabela */}
            <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>Medicamento</TableHead>
                    <TableHead>Subtítulo</TableHead>
                    <TableHead className="w-30">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataSource.map((item) => (
                    <TableRow className="border-b border-gray-300 h-15" key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>{item.subtitle ?? "—"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-0"
                          title="Ver detalhes"
                          aria-label="Ver detalhes"
                          onClick={() => openDetail(item.id)}
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: cards */}
            <div className="space-y-3 md:hidden">
              {dataSource.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-300 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.subtitle ?? "—"}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-0 shrink-0"
                      title="Ver detalhes"
                      aria-label="Ver detalhes"
                      onClick={() => openDetail(item.id)}
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {activeQuery ? (
              <ListPagination
                page={listPage}
                totalPages={listTotalPages}
                total={listTotal}
                pageSize={API_PAGE_SIZE}
                onPageChange={setListPage}
                disabled={loading}
              />
            ) : null}
          </div>
        )}
      </div>

      <Dialog open={detailVisible} onOpenChange={setDetailVisible}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detailItem?.title ?? "Detalhes do medicamento"}
            </DialogTitle>
          </DialogHeader>
          {detailLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin w-6 h-6 text-muted-foreground/60" />
            </div>
          )}
          {!detailLoading && detailItem && (
            <div className="max-h-[70vh] overflow-y-auto">
              {detailItem.subtitle && (
                <p className="text-muted-foreground mb-3">
                  {detailItem.subtitle}
                </p>
              )}
              {(detailItem.dose_min_mg_kg != null ||
                detailItem.dose_max_mg_kg != null ||
                detailItem.dose_unit ||
                (detailItem.administration_routes?.length ?? 0) > 0 ||
                detailItem.frequency ||
                (detailItem.species?.length ?? 0) > 0 ||
                detailItem.toxicity_notes ||
                detailItem.contraindications) && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-primary">Posologia</h4>
                    {detailItem.vetalpha_validated && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-700">
                        Validado VetAlpha
                      </span>
                    )}
                  </div>
                  <div className="border rounded divide-y text-sm">
                    {(detailItem.dose_min_mg_kg != null || detailItem.dose_max_mg_kg != null) && (
                      <div className="grid grid-cols-1 gap-0.5 px-3 py-2 sm:grid-cols-3 sm:gap-0">
                        <span className="col-span-1 font-medium text-muted-foreground">Dose</span>
                        <span className="col-span-2">
                          {[detailItem.dose_min_mg_kg, detailItem.dose_max_mg_kg]
                            .filter((v) => v != null)
                            .join(" – ")}{" "}
                          {detailItem.dose_unit ?? "mg/kg"}
                        </span>
                      </div>
                    )}
                    {detailItem.frequency && (
                      <div className="grid grid-cols-1 gap-0.5 px-3 py-2 sm:grid-cols-3 sm:gap-0">
                        <span className="col-span-1 font-medium text-muted-foreground">Frequência</span>
                        <span className="col-span-2">{detailItem.frequency}</span>
                      </div>
                    )}
                    {(detailItem.administration_routes?.length ?? 0) > 0 && (
                      <div className="grid grid-cols-1 gap-0.5 px-3 py-2 sm:grid-cols-3 sm:gap-0">
                        <span className="col-span-1 font-medium text-muted-foreground">Vias</span>
                        <span className="col-span-2">{detailItem.administration_routes?.join(", ")}</span>
                      </div>
                    )}
                    {(detailItem.species?.length ?? 0) > 0 && (
                      <div className="grid grid-cols-1 gap-0.5 px-3 py-2 sm:grid-cols-3 sm:gap-0">
                        <span className="col-span-1 font-medium text-muted-foreground">Espécies</span>
                        <span className="col-span-2">{detailItem.species?.join(", ")}</span>
                      </div>
                    )}
                    {detailItem.toxicity_notes && (
                      <div className="grid grid-cols-1 gap-0.5 px-3 py-2 sm:grid-cols-3 sm:gap-0">
                        <span className="col-span-1 font-medium text-muted-foreground">Toxicidade</span>
                        <span className="col-span-2 whitespace-pre-wrap">{detailItem.toxicity_notes}</span>
                      </div>
                    )}
                    {detailItem.contraindications && (
                      <div className="grid grid-cols-1 gap-0.5 px-3 py-2 sm:grid-cols-3 sm:gap-0">
                        <span className="col-span-1 font-medium text-muted-foreground">Contraindicações</span>
                        <span className="col-span-2 whitespace-pre-wrap">{detailItem.contraindications}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {detailItem.details && detailItem.details.length > 0 ? (
                [...detailItem.details]
                  .sort((a, b) => {
                    const order = [
                      "Administração e doses",
                      "Indicações e contraindicações",
                      "Apresentações e concentrações",
                      "Interações medicamentosas",
                      "Farmacologia",
                      "Composição",
                      "Níveis de garantia",
                      "Quantidade recomendada",
                      "Sobre",
                    ];
                    const wa = order.indexOf(a.title ?? "");
                    const wb = order.indexOf(b.title ?? "");
                    return (wa === -1 ? 999 : wa) - (wb === -1 ? 999 : wb);
                  })
                  .map((section, idx) => {
                    const isDose = /administra|posolog|dose/i.test(
                      section.title ?? "",
                    );
                    return (
                      <div key={idx} className="mb-4">
                        <h4
                          className={`mb-2 flex items-center gap-2 font-semibold ${
                            isDose ? "text-emerald-700" : "text-primary"
                          }`}
                        >
                          {section.title}
                          {isDose && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              Doses
                            </span>
                          )}
                        </h4>
                        <div
                          className={`border rounded divide-y text-sm ${
                            isDose ? "border-emerald-300 bg-emerald-50/40" : ""
                          }`}
                        >
                          {section.data?.map((entry, i) => (
                            <div key={i} className="grid grid-cols-1 gap-0.5 px-3 py-2 sm:grid-cols-3 sm:gap-0">
                              <span className="font-medium text-muted-foreground col-span-1">
                                {entry.title ?? "—"}
                              </span>
                              <span className="col-span-2 whitespace-pre-wrap">
                                {entry.data || "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-muted-foreground">
                  Sem detalhes cadastrados.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
