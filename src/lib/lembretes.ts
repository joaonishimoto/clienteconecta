import type { Cliente, Parcela, Venda, VendaItem, VendaLembrete } from './tipos'
import { dataBR, diaMes, diasAteAniversario, dinheiro, primeiroNome, somarDias } from './formato'

export type Lembrete =
  | { tipo: 'aniversario'; cliente: Cliente; emDias: number; mensagem: string }
  | { tipo: 'parcela'; cliente: Cliente; parcela: Parcela; atrasada: boolean; mensagem: string }
  | { tipo: 'recompra'; cliente: Cliente; item: VendaItem; lembrete: VendaLembrete; mensagem: string }

export const DIAS_ANIVERSARIO = 3
export const DIAS_PARCELA = 3

/** Monta a lista da aba "Hoje": parcelas, aniversários e recompras, nessa ordem. */
export function montarLembretes(
  hoje: string,
  clientes: Cliente[],
  vendas: Venda[],
  parcelas: Parcela[],
  itens: VendaItem[],
  lembretesDeVenda: VendaLembrete[],
): Lembrete[] {
  const porId = new Map(clientes.map((c) => [c.id, c]))
  const clienteDaVenda = new Map(vendas.map((v) => [v.id, porId.get(v.cliente_id)]))
  const limiteParcela = somarDias(hoje, DIAS_PARCELA)

  const lista: Lembrete[] = []

  for (const p of parcelas) {
    const c = clienteDaVenda.get(p.venda_id)
    if (!c || p.pago_em || p.vencimento > limiteParcela) continue
    const atrasada = p.vencimento < hoje
    const quando = atrasada ? `que venceu em ${dataBR(p.vencimento)}` : `que vence em ${diaMes(p.vencimento)}`
    lista.push({
      tipo: 'parcela',
      cliente: c,
      parcela: p,
      atrasada,
      mensagem:
        `Oi ${primeiroNome(c.nome)}, tudo bem? Passando para lembrar da parcela ${p.numero}/${p.de} ` +
        `de ${dinheiro(p.valor)} ${quando}. Qualquer coisa me chama! Obrigada 😊`,
    })
  }
  lista.sort((a, b) =>
    a.tipo === 'parcela' && b.tipo === 'parcela' ? a.parcela.vencimento.localeCompare(b.parcela.vencimento) : 0,
  )

  const aniversarios = clientes
    .filter((c) => c.aniversario)
    .map((c) => ({ c, emDias: diasAteAniversario(c.aniversario!, hoje) }))
    .filter((x) => x.emDias <= DIAS_ANIVERSARIO)
    .sort((a, b) => a.emDias - b.emDias)
  for (const { c, emDias } of aniversarios) {
    lista.push({
      tipo: 'aniversario',
      cliente: c,
      emDias,
      mensagem:
        `Oi ${primeiroNome(c.nome)}! Feliz aniversário! 🎉 Desejo muita saúde e alegria. ` +
        `Preparei um carinho especial para você, quer saber?`,
    })
  }

  const itemPorId = new Map(itens.map((i) => [i.id, i]))
  const recompras = lembretesDeVenda
    .filter((l) => !l.avisado && l.lembrar_em <= hoje)
    .sort((a, b) => a.lembrar_em.localeCompare(b.lembrar_em))
  for (const l of recompras) {
    const i = itemPorId.get(l.venda_item_id)
    const c = i && clienteDaVenda.get(i.venda_id)
    if (!i || !c) continue
    // A descrição é o que ela quer dizer à cliente; sem descrição, vai a mensagem padrão.
    const recado = l.descricao.trim() || 'Está na hora de repor? Posso separar para você!'
    lista.push({
      tipo: 'recompra',
      cliente: c,
      item: i,
      lembrete: l,
      mensagem: `Oi ${primeiroNome(c.nome)}, tudo bem? Já faz um tempinho que você levou ${i.nome}. ${recado}`,
    })
  }

  return lista
}

