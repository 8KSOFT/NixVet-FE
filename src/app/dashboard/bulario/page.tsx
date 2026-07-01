"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import api from "@/lib/axios";
import {
  API_PAGE_SIZE,
  listQueryParams,
  parseListResponse,
} from "@/lib/pagination";
import { ListPagination } from "@/components/list-pagination";

interface BularioItem {
  id: string;
  title: string;
  subtitle: string | null;
  origin: string | null;
  link_details: string | null;
  details: Array<{
    title: string;
    data: Array<{ title: string | null; data: string }>;
  }> | null;
  // GRUPO 5 — dose estruturada (VetAlpha)
  dose_min_mg_kg?: number | null;
  dose_max_mg_kg?: number | null;
  dose_unit?: string | null;
  administration_routes?: string[] | null;
  frequency?: string | null;
  species?: string[] | null;
  toxicity_notes?: string | null;
  contraindications?: string | null;
  vetalpha_validated?: boolean;
  vetalpha_updated_at?: string | null;
}

export default function BularioPage() {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<BularioItem[]>([]);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailItem, setDetailItem] = useState<BularioItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const runSearch = useCallback(async (q: string, page: number) => {
    setLoading(true);
    try {
      const response = await api.get("/bulario", {
        params: { q: q || undefined, ...listQueryParams(page) },
      });
      const p = parseListResponse<BularioItem>(response.data, page);
      setDataSource(p.items);
      setListTotal(p.total);
      setListTotalPages(p.totalPages);
    } catch (error) {
      console.error("Error searching bulario:", error);
      setDataSource([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query.length < 2) return;
    setTimeout(async () => {
      if (query.trim() !== "") {
        void runSearch(query, listPage);
      }
    }, 2000);
  }, [query, activeQuery, listPage, runSearch]);

  const handleSearch = () => {
    if (!query || query.trim().length < 2) {
      return;
    }
    setListPage(1);
    setActiveQuery(query.trim());
  };

  const openDetail = async (id: string) => {
    setDetailVisible(true);
    setDetailLoading(true);
    setDetailItem(null);
    try {
      const response = await api.get<BularioItem>(`/bulario/${id}`);
      setDetailItem(response.data);
    } catch (error) {
      console.error("Error loading bulario detail:", error);
    } finally {
      setDetailLoading(false);
    }
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
                setDataSource([]);
                setListTotal(0);
                setListTotalPages(1);
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
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader className="h-15">
                <TableRow>
                  <TableHead className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Medicamento</TableHead>
                  <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Subtítulo</TableHead>
                  <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600 w-30">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataSource.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="border border-slate-200 px-3 py-3 font-medium text-slate-900">{item.title}</TableCell>
                    <TableCell className="border border-slate-200 px-3 py-3 text-slate-600">{item.subtitle ?? "—"}</TableCell>
                    <TableCell className="border border-slate-200 px-3 py-3 text-slate-600">
                      <button
                        onClick={() => openDetail(item.id)}
                        className="flex items-center gap-1 text-primary hover:underline text-sm"
                      >
                        <Info className="w-4 h-4" /> Ver detalhes
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
        <DialogContent className="max-w-2xl">
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
              {detailItem.link_details && (
                <p className="text-sm mb-3">
                  <a
                    href={detailItem.link_details}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    Link externo
                  </a>
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
                      <div className="grid grid-cols-3 px-3 py-2">
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
                      <div className="grid grid-cols-3 px-3 py-2">
                        <span className="col-span-1 font-medium text-muted-foreground">Frequência</span>
                        <span className="col-span-2">{detailItem.frequency}</span>
                      </div>
                    )}
                    {(detailItem.administration_routes?.length ?? 0) > 0 && (
                      <div className="grid grid-cols-3 px-3 py-2">
                        <span className="col-span-1 font-medium text-muted-foreground">Vias</span>
                        <span className="col-span-2">{detailItem.administration_routes?.join(", ")}</span>
                      </div>
                    )}
                    {(detailItem.species?.length ?? 0) > 0 && (
                      <div className="grid grid-cols-3 px-3 py-2">
                        <span className="col-span-1 font-medium text-muted-foreground">Espécies</span>
                        <span className="col-span-2">{detailItem.species?.join(", ")}</span>
                      </div>
                    )}
                    {detailItem.toxicity_notes && (
                      <div className="grid grid-cols-3 px-3 py-2">
                        <span className="col-span-1 font-medium text-muted-foreground">Toxicidade</span>
                        <span className="col-span-2 whitespace-pre-wrap">{detailItem.toxicity_notes}</span>
                      </div>
                    )}
                    {detailItem.contraindications && (
                      <div className="grid grid-cols-3 px-3 py-2">
                        <span className="col-span-1 font-medium text-muted-foreground">Contraindicações</span>
                        <span className="col-span-2 whitespace-pre-wrap">{detailItem.contraindications}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {detailItem.details && detailItem.details.length > 0 ? (
                detailItem.details.map((section, idx) => (
                  <div key={idx} className="mb-4">
                    <h4 className="font-semibold text-primary mb-2">
                      {section.title}
                    </h4>
                    <div className="border rounded divide-y text-sm">
                      {section.data?.map((entry, i) => (
                        <div key={i} className="grid grid-cols-3 px-3 py-2">
                          <span className="font-medium text-muted-foreground col-span-1">
                            {entry.title ?? "—"}
                          </span>
                          <span className="col-span-2">
                            {entry.data || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
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
