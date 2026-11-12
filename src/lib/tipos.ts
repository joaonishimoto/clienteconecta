export type Perfil = { id: string; nome: string; empresa: string }

export type Cliente = {
  id: string
  nome: string
  whatsapp: string
  aniversario: string | null
  observacao: string
}

export type Produto = {
  id: string
  nome: string
  preco: number
  descricao: string
  foto_url: string | null
}

/** Lembrete que fica no produto do catálogo: "daqui a X dias, lembrar disto". */
export type ProdutoLembrete = {
  id: string
  produto_id: string
  dias: number
  titulo: string
  descricao: string
}

/** Lembrete criado numa venda: aparece na aba Hoje a partir de lembrar_em. */
export type VendaLembrete = {
  id: string
  venda_item_id: string
  titulo: string
  descricao: string
  lembrar_em: string
  avisado: boolean
}

export type Parcela = {
  id: string
  venda_id: string
  numero: number
  de: number
  valor: number
  vencimento: string
  pago_em: string | null
}

export type VendaItem = {
  id: string
  venda_id: string
  produto_id: string | null
  nome: string
  quantidade: number
  preco: number
}

export type Venda = {
  id: string
  cliente_id: string
  data: string
  total: number
}
