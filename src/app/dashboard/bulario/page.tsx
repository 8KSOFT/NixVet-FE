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
import { BookOpen, Search, Info, Loader2 } from "lucide-react";
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
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2 mb-8">
        <h1 className="text-2xl font-extrabold font-['interDoFigma'] flex items-center gap-2">
          Bulário – Consulta de Medicamentos
        </h1>
      </div>

      <div className="mb-4 ">
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
          <div className="border-t border-b border-gray-300">
            <Table>
              <TableHeader className="h-15">
                <TableRow className="border-b border-gray-300">
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Subtítulo</TableHead>
                  <TableHead className="w-30">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataSource.map((item) => (
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50 h-15 border-b border-gray-300"
                    key={item.id}
                  >
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.subtitle ?? "—"}</TableCell>
                    <TableCell>
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
