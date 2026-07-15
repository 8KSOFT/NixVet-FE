'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, ExternalLink } from 'lucide-react';

export default function ConfiguracoesFiscaisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-primary">Configurações Fiscais</h1>
        <p className="text-muted-foreground text-sm mt-1">Emissão de NFS-e para serviços prestados pela clínica aos clientes</p>
      </div>

      {/* Status do módulo */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <div className="p-3 bg-amber-100 rounded-full">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amber-800">Módulo em implementação</p>
            <p className="text-sm text-amber-700 mt-0.5">
              A emissão de NFS-e para serviços da clínica (consultas, cirurgias, exames) está sendo desenvolvida.
              Entre em contato com o suporte para habilitar quando disponível.
            </p>
          </div>
          <Badge variant="outline" className="border-amber-400 text-amber-700 shrink-0 sm:ml-auto">Em breve</Badge>
        </CardContent>
      </Card>

      {/* Sobre NFS-e */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> O que é NFS-e de serviços?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            A <strong className="text-foreground">Nota Fiscal de Serviços Eletrônica (NFS-e)</strong> é o documento fiscal emitido
            pela clínica para os clientes (responsáveis) após a prestação de serviços como consultas, cirurgias, exames e internações.
          </p>
          <p>
            É diferente da NFS-e da assinatura do NixVet — esta é emitida pelo NixVet para a clínica e já funciona
            automaticamente. Você pode consultá-la em <strong className="text-foreground">Assinatura &amp; NFS-e</strong>.
          </p>
          <p>
            Para emitir NFS-e de serviços, a clínica precisa de:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>CNPJ ativo com Inscrição Municipal na prefeitura</li>
            <li>Código Municipal de Serviço (LC 116/2003)</li>
            <li>Regime tributário definido (Simples Nacional, Lucro Presumido etc.)</li>
            <li>Integração com emissor fiscal (configurada pelo suporte)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Formulário de configuração futura (desabilitado) */}
      <Card className="opacity-60 pointer-events-none select-none">
        <CardHeader>
          <CardTitle className="text-base">Dados Fiscais da Clínica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>CNPJ da clínica</Label>
              <Input placeholder="00.000.000/0001-00" disabled />
            </div>
            <div>
              <Label>Inscrição Municipal</Label>
              <Input placeholder="000000-0" disabled />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Código de Serviço Municipal</Label>
              <Input placeholder="Ex: 8.01 — Medicina Veterinária" disabled />
            </div>
            <div>
              <Label>Regime Tributário</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples">Simples Nacional</SelectItem>
                  <SelectItem value="presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="real">Lucro Real</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Quer habilitar a emissão de NFS-e?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Fale com nosso suporte — configuramos o módulo fiscal para sua clínica.
            </p>
          </div>
          <Button variant="outline" className="w-full gap-2 sm:w-auto" asChild>
            <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" /> Falar com suporte
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
