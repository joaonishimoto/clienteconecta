export const PRECO_MENSAL = 19.9
export const INDICADAS_POR_MES = 3
const TOLERANCIA_DIAS = 3
const DIA = 24 * 60 * 60 * 1000

export type Assinatura = {
  pago_ate: string
  codigo: string
  indicada_por: string | null
  meses_ganhos: number
  assinatura_status: string | null
  criado_em: string
}

export type Indicacao = { status: 'pendente' | 'valida' | 'anulada'; premiada: boolean }

export type Situacao = {
  /** teste e em-dia: tudo certo · vencendo: faltam 3 dias ou menos · vencida: na tolerância · bloqueada: só leitura */
  tipo: 'teste' | 'em-dia' | 'vencendo' | 'vencida' | 'bloqueada'
  dias: number
  cartao: boolean
}

export function situacao(a: Assinatura, agora = new Date()): Situacao {
  const fim = new Date(a.pago_ate).getTime()
  const dias = Math.ceil((fim - agora.getTime()) / DIA)
  const cartao = ['active', 'trialing', 'past_due'].includes(a.assinatura_status ?? '')
  // Nunca pagou: a data ainda é a do teste, criado junto com a conta.
  const emTeste = !cartao && fim - new Date(a.criado_em).getTime() <= 15 * DIA
  const tipo =
    dias <= -TOLERANCIA_DIAS ? 'bloqueada'
    : dias <= 0 ? 'vencida'
    : dias <= 3 && !cartao ? 'vencendo'
    : emTeste ? 'teste'
    : 'em-dia'
  return { tipo, dias, cartao }
}

/** Quantas já contam para o próximo mês grátis e quantas ainda estão no teste ou nos 7 dias. */
export function progresso(indicacoes: Indicacao[]) {
  return {
    valendo: indicacoes.filter((i) => i.status === 'valida' && !i.premiada).length % INDICADAS_POR_MES,
    esperando: indicacoes.filter((i) => i.status === 'pendente').length,
  }
}

/** Ela pode digitar um convite nos primeiros 7 dias, se ainda não usou nenhum. */
export function podeUsarConvite(a: Assinatura, agora = new Date()) {
  return !a.indicada_por && agora.getTime() - new Date(a.criado_em).getTime() < 7 * DIA
}

export function linkConvite(codigo: string, origem = window.location.origin) {
  return `${origem}/?convite=${codigo}`
}

export function mensagemConvite(codigo: string) {
  return (
    'Oi! Estou usando o ClienteConecta para organizar minhas clientes, vendas e cobranças pelo celular. ' +
    `Os primeiros 14 dias são grátis. Crie sua conta pelo meu link: ${linkConvite(codigo)}`
  )
}

// O convite chega no link (?convite=ABC123) antes do cadastro, então fica guardado até ela entrar.
const CHAVE_CONVITE = 'convite'

export function guardarConviteDoLink() {
  const params = new URLSearchParams(window.location.search)
  const codigo = params.get('convite')
  if (!codigo) return
  try {
    localStorage.setItem(CHAVE_CONVITE, codigo)
  } catch {
    // Sem armazenamento: ela ainda pode digitar o código em Minha conta.
  }
  params.delete('convite')
  const resto = params.toString()
  window.history.replaceState(null, '', window.location.pathname + (resto ? `?${resto}` : ''))
}

export function conviteGuardado(): string | null {
  try {
    return localStorage.getItem(CHAVE_CONVITE)
  } catch {
    return null
  }
}

export function esquecerConvite() {
  try {
    localStorage.removeItem(CHAVE_CONVITE)
  } catch {
    // nada a fazer
  }
}
