import { describe, expect, it } from 'vitest'
import { diasAteAniversario, lerData, lerDinheiro, mascaraData, mascaraTelefone, semAcento, somarMeses } from './formato'
import { linkWhatsapp, mostrarTelefone, normalizarWhatsapp } from './whatsapp'
import { montarLembretes } from './lembretes'
import { clientesParaCsv, lerClientes, lerProdutos } from './planilha'
import type { Cliente, Parcela, Venda, VendaItem } from './tipos'
import { podeUsarConvite, progresso, situacao } from './assinatura'

describe('formato', () => {
  it('formata data e telefone enquanto ela digita', () => {
    expect(mascaraData('2512')).toBe('25/12')
    expect(mascaraData('25121960')).toBe('25/12/1960')
    expect(mascaraTelefone('11987654321')).toBe('(11) 98765-4321')
    expect(mascaraTelefone('1133334444')).toBe('(11) 3333-4444')
    expect(mascaraTelefone('119')).toBe('(11) 9')
    expect(mascaraTelefone('')).toBe('')
  })

  it('compara nomes sem acento', () => {
    expect(semAcento('  Fátima ')).toBe('fatima')
  })

  it('lê datas do jeito brasileiro', () => {
    expect(lerData('25/12')).toBe('1900-12-25')
    expect(lerData('5/3/1958')).toBe('1958-03-05')
    expect(lerData('05/03/58')).toBe('1958-03-05')
    expect(lerData('1960-12-25')).toBe('1960-12-25')
    expect(lerData('31/02')).toBeNull()
    expect(lerData('')).toBeNull()
  })

  it('lê dinheiro com vírgula ou ponto', () => {
    expect(lerDinheiro('49,90')).toBe(49.9)
    expect(lerDinheiro('R$ 1.290,00')).toBe(1290)
    expect(lerDinheiro('49.9')).toBe(49.9)
    expect(lerDinheiro('abc')).toBe(0)
  })

  it('soma meses sem pular para o mês seguinte', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28')
    expect(somarMeses('2026-11-15', 2)).toBe('2027-01-15')
  })

  it('conta dias até o aniversário, virando o ano', () => {
    expect(diasAteAniversario('1958-10-25', '2026-10-25')).toBe(0)
    expect(diasAteAniversario('1900-10-27', '2026-10-25')).toBe(2)
    expect(diasAteAniversario('1900-01-01', '2026-12-31')).toBe(1)
  })
})

describe('whatsapp', () => {
  it('coloca o 55 e tira a formatação', () => {
    expect(normalizarWhatsapp('(11) 98765-4321')).toBe('5511987654321')
    expect(normalizarWhatsapp('011 98765-4321')).toBe('5511987654321')
    expect(normalizarWhatsapp('+55 11 98765-4321')).toBe('5511987654321')
    expect(linkWhatsapp('11987654321', 'Oi Ana')).toBe('https://wa.me/5511987654321?text=Oi%20Ana')
    expect(mostrarTelefone('5511987654321')).toBe('(11) 98765-4321')
  })
})

describe('lembretes', () => {
  const ana: Cliente = { id: 'c1', nome: 'Ana Maria', whatsapp: '11987654321', aniversario: '1900-10-26', observacao: '' }
  const bia: Cliente = { id: 'c2', nome: 'Bia', whatsapp: '', aniversario: '1900-12-01', observacao: '' }
  const vendas: Venda[] = [{ id: 'v1', cliente_id: 'c1', data: '2026-04-01', total: 300 }]
  const parcela = (id: string, vencimento: string, pago_em: string | null = null): Parcela => ({
    id, venda_id: 'v1', numero: 1, de: 3, valor: 100, vencimento, pago_em,
  })
  const item = (id: string, recompra_em: string | null, recompra_avisada = false): VendaItem => ({
    id, venda_id: 'v1', produto_id: 'p1', nome: 'Refil', quantidade: 1, preco: 100, recompra_em, recompra_avisada,
  })

  it('junta cobranças, aniversários e recompras do dia', () => {
    const l = montarLembretes(
      '2026-10-25',
      [ana, bia],
      vendas,
      [parcela('p-atrasada', '2026-10-20'), parcela('p-paga', '2026-10-20', '2026-10-20'), parcela('p-longe', '2026-11-25')],
      [item('i-vencido', '2026-10-01'), item('i-avisado', '2026-10-01', true), item('i-futuro', '2026-12-01')],
    )
    expect(l.map((x) => x.tipo)).toEqual(['parcela', 'aniversario', 'recompra'])
    expect(l[0].tipo === 'parcela' && l[0].atrasada).toBe(true)
    expect(l[0].mensagem).toContain('Oi Ana')
    expect(l[1].tipo === 'aniversario' && l[1].emDias).toBe(1)
  })
})

describe('planilha', () => {
  it('lê planilha com cabeçalho acentuado e ponto e vírgula', () => {
    const csv = '﻿Nome;Telefone;Aniversário\nAna;(11) 98765-4321;25/12\n;;\nBia;;'
    expect(lerClientes(csv)).toEqual([
      { nome: 'Ana', whatsapp: '(11) 98765-4321', aniversario: '1900-12-25', observacao: '' },
      { nome: 'Bia', whatsapp: '', aniversario: null, observacao: '' },
    ])
  })

  it('lê produtos com preço brasileiro', () => {
    expect(lerProdutos('produto,valor,recompra_dias\nChá Poli Ervas,"40,00",30')).toEqual([
      { nome: 'Chá Poli Ervas', preco: 40, recompra_dias: 30, descricao: '' },
    ])
  })

  it('exporta e importa de volta sem perder nada', () => {
    const c: Cliente = { id: 'x', nome: 'Ana; Silva', whatsapp: '119', aniversario: '1958-03-05', observacao: 'gosta de "chá"' }
    const [lida] = lerClientes(clientesParaCsv([c]))
    expect(lida).toEqual({ nome: c.nome, whatsapp: c.whatsapp, aniversario: c.aniversario, observacao: c.observacao })
  })
})

describe('mensagens de erro do login', () => {
  it('traduz os erros mais comuns', async () => {
    const { mensagemDeErro } = await import('./erros')
    expect(mensagemDeErro({ code: 'invalid_credentials' })).toContain('não conferem')
    expect(mensagemDeErro({ message: 'Email not confirmed' })).toContain('confirmar seu e-mail')
    expect(mensagemDeErro({ name: 'AuthRetryableFetchError', status: 0 })).toContain('internet')
    expect(mensagemDeErro({ code: 'over_email_send_rate_limit', status: 429 })).toContain('Espere um minuto')
    expect(mensagemDeErro({ code: 'qualquer' })).toContain('Algo deu errado')
    expect(mensagemDeErro(null)).toBe('')
  })
})

describe('assinatura', () => {
  const base = {
    codigo: 'K7P2MX',
    indicada_por: null,
    meses_ganhos: 0,
    assinatura_status: null,
    criado_em: '2026-10-01T12:00:00Z',
  }
  const agora = new Date('2026-10-10T12:00:00Z')

  it('mostra teste, vencendo, vencida e bloqueada pela data', () => {
    expect(situacao({ ...base, pago_ate: '2026-10-15T12:00:00Z' }, agora).tipo).toBe('teste')
    expect(situacao({ ...base, pago_ate: '2026-10-12T12:00:00Z' }, agora).tipo).toBe('vencendo')
    expect(situacao({ ...base, pago_ate: '2026-10-09T12:00:00Z' }, agora).tipo).toBe('vencida')
    expect(situacao({ ...base, pago_ate: '2026-10-06T12:00:00Z' }, agora).tipo).toBe('bloqueada')
    expect(situacao({ ...base, pago_ate: '2026-11-20T12:00:00Z' }, agora).tipo).toBe('em-dia')
  })

  it('no cartão não avisa que vai vencer, porque renova sozinha', () => {
    const s = situacao({ ...base, assinatura_status: 'active', pago_ate: '2026-10-12T12:00:00Z' }, agora)
    expect(s).toEqual({ tipo: 'em-dia', dias: 2, cartao: true })
  })

  it('conta as amigas até o próximo mês grátis', () => {
    const v = { status: 'valida', premiada: false } as const
    const p = { status: 'pendente', premiada: false } as const
    const premiada = { status: 'valida', premiada: true } as const
    expect(progresso([premiada, premiada, premiada, v, p, p, { status: 'anulada', premiada: false }])).toEqual({
      valendo: 1,
      esperando: 2,
    })
  })

  it('aceita convite só nos primeiros 7 dias e uma vez', () => {
    const a = { ...base, pago_ate: '2026-10-15T12:00:00Z' }
    expect(podeUsarConvite(a, new Date('2026-10-05T12:00:00Z'))).toBe(true)
    expect(podeUsarConvite(a, new Date('2026-10-09T12:00:00Z'))).toBe(false)
    expect(podeUsarConvite({ ...a, indicada_por: 'x' }, new Date('2026-10-02T12:00:00Z'))).toBe(false)
  })
})
