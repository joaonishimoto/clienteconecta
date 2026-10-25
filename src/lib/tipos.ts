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
  recompra_dias: number | null
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
  recompra_em: string | null
  recompra_avisada: boolean
}

export type Venda = {
  id: string
  cliente_id: string
  data: string
  total: number
}
