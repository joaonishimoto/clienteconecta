import type { Cliente, Venda, VendaItem } from './tipos'
import { dataBR, semAcento } from './formato'

// Busca simples feita na memória: cada palavra digitada precisa aparecer em algum lugar.
// "ana 9876" acha a Ana cujo telefone tem 9876; "shampoo maria" acha a venda de shampoo para a Maria.

function palavras(busca: string): string[] {
  return semAcento(busca).split(/\s+/).filter(Boolean)
}

/** Confere se todas as palavras aparecem no texto (sem acento) ou, se forem números, nos dígitos. */
function bate(termos: string[], texto: string, digitos: string): boolean {
  return termos.every((t) => {
    if (texto.includes(t)) return true
    // Telefone: só conta se ela digitou números (com ou sem traço e parênteses).
    const d = t.replace(/\D/g, '')
    return d.length >= 3 && /^[\d()+.-]+$/.test(t) && digitos.includes(d)
  })
}

/** Clientes pelo nome, telefone ou anotação. */
export function buscarClientes(clientes: Cliente[], busca: string): Cliente[] {
  const termos = palavras(busca)
  if (!termos.length) return clientes
  // Telefone inteiro colado, como "(11) 98765-4321": compara só os números.
  const digitos = busca.replace(/\D/g, '')
  if (digitos.length >= 3 && /^[\d\s()+.-]+$/.test(busca.trim()))
    return clientes.filter((c) => c.whatsapp.replace(/\D/g, '').includes(digitos))
  return clientes.filter((c) => bate(termos, semAcento(`${c.nome} ${c.observacao}`), c.whatsapp.replace(/\D/g, '')))
}

export type VendaAchada = { venda: Venda; cliente: Cliente | undefined; itens: VendaItem[] }

/** Vendas pelo produto, pelo nome da cliente ou pela data (25/12 ou 25/12/2026). */
export function buscarVendas(vendas: Venda[], itens: VendaItem[], clientes: Cliente[], busca: string): VendaAchada[] {
  const termos = palavras(busca)
  if (!termos.length) return []
  const porCliente = new Map(clientes.map((c) => [c.id, c]))
  const porVenda = new Map<string, VendaItem[]>()
  for (const i of itens) porVenda.set(i.venda_id, [...(porVenda.get(i.venda_id) ?? []), i])

  const achadas: VendaAchada[] = []
  for (const venda of vendas) {
    const cliente = porCliente.get(venda.cliente_id)
    const itensDela = porVenda.get(venda.id) ?? []
    const produtos = itensDela.map((i) => i.nome).join(' ')
    // A busca só mostra a venda se mencionar um produto ou uma data; só o nome já aparece na lista de clientes.
    const texto = semAcento(`${produtos} ${cliente?.nome ?? ''} ${dataBR(venda.data)}`)
    if (!bate(termos, texto, '')) continue
    const falaDaVenda = termos.some((t) => semAcento(`${produtos} ${dataBR(venda.data)}`).includes(t))
    if (falaDaVenda) achadas.push({ venda, cliente, itens: itensDela })
  }
  return achadas
}
