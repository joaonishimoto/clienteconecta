import Papa from 'papaparse'
import type { Cliente, Produto } from './tipos'
import { dataBR, lerData, lerDinheiro } from './formato'

// Planilhas em CSV com ponto e vírgula e BOM: é o formato que o Excel brasileiro abre direto.

type NovoCliente = Omit<Cliente, 'id'>
type NovoProduto = Omit<Produto, 'id' | 'foto_url'>

export function clientesParaCsv(clientes: Cliente[]): string {
  return gerar(
    ['nome', 'whatsapp', 'aniversario', 'observacao'],
    clientes.map((c) => [c.nome, c.whatsapp, c.aniversario ? aniversarioBR(c.aniversario) : '', c.observacao]),
  )
}

export function produtosParaCsv(produtos: Produto[]): string {
  return gerar(
    ['nome', 'preco', 'recompra_dias', 'descricao'],
    produtos.map((p) => [
      p.nome,
      p.preco.toFixed(2).replace('.', ','),
      p.recompra_dias ? String(p.recompra_dias) : '',
      p.descricao,
    ]),
  )
}

export function lerClientes(texto: string): NovoCliente[] {
  return linhas(texto)
    .map((l) => ({
      nome: campo(l, 'nome', 'cliente'),
      whatsapp: campo(l, 'whatsapp', 'telefone', 'celular', 'fone'),
      aniversario: lerData(campo(l, 'aniversario', 'nascimento', 'data de nascimento')),
      observacao: campo(l, 'observacao', 'obs', 'anotacao'),
    }))
    .filter((c) => c.nome)
}

export function lerProdutos(texto: string): NovoProduto[] {
  return linhas(texto)
    .map((l) => {
      const dias = parseInt(campo(l, 'recompra_dias', 'recompra', 'dias para recompra'), 10)
      return {
        nome: campo(l, 'nome', 'produto'),
        preco: lerDinheiro(campo(l, 'preco', 'valor')),
        recompra_dias: dias > 0 ? dias : null,
        descricao: campo(l, 'descricao'),
      }
    })
    .filter((p) => p.nome)
}

function aniversarioBR(iso: string): string {
  return iso.startsWith('1900-') ? dataBR(iso).slice(0, 5) : dataBR(iso)
}

function gerar(cabecalho: string[], dados: string[][]): string {
  return '﻿' + Papa.unparse([cabecalho, ...dados], { delimiter: ';' })
}

function linhas(texto: string): Record<string, string>[] {
  const r = Papa.parse<Record<string, string>>(texto.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: chave,
  })
  return r.data
}

/** "Aniversário " → "aniversario": cabeçalhos sem acento, maiúscula ou espaço sobrando. */
function chave(h: string): string {
  return h.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

function campo(linha: Record<string, string>, ...nomes: string[]): string {
  for (const n of nomes) {
    const v = linha[n]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

export function baixar(nomeArquivo: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.click()
  URL.revokeObjectURL(url)
}

/** Lê .xlsx do Excel ou .csv (em UTF-8 ou no padrão antigo do Excel brasileiro) e devolve CSV. */
export async function lerArquivo(arquivo: File): Promise<string> {
  if (/\.xlsx$/i.test(arquivo.name)) {
    const { readSheet } = await import('read-excel-file/browser')
    const linhas = await readSheet(arquivo)
    return Papa.unparse(
      linhas.map((l) => l.map((v) => (v instanceof Date ? dataBR(v.toISOString().slice(0, 10)) : v == null ? '' : String(v)))),
      { delimiter: ';' },
    )
  }
  const bytes = await arquivo.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}
