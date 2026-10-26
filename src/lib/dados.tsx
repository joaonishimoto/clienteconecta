import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Cliente, Parcela, Perfil, Produto, Venda, VendaItem } from './tipos'
import type { Assinatura, Indicacao } from './assinatura'

// Uma revendedora tem poucas centenas de registros: carregamos tudo de uma vez
// e as telas filtram na memória. Depois de cada alteração, chamamos recarregar().

type Dados = {
  perfil: Perfil | null
  clientes: Cliente[]
  produtos: Produto[]
  vendas: Venda[]
  parcelas: Parcela[]
  itens: VendaItem[]
  assinatura: Assinatura | null
  indicacoes: Indicacao[]
  carregando: boolean
  erro: string | null
  recarregar: () => Promise<void>
}

const Contexto = createContext<Dados | null>(null)

const num = <T extends Record<string, unknown>>(linhas: T[], ...campos: (keyof T)[]) =>
  linhas.map((l) => {
    const c = { ...l }
    for (const k of campos) c[k] = Number(c[k]) as T[keyof T]
    return c
  })

export function ProvedorDados({ userId, children }: { userId: string; children: ReactNode }) {
  const [estado, setEstado] = useState<Omit<Dados, 'recarregar'>>({
    perfil: null,
    clientes: [],
    produtos: [],
    vendas: [],
    parcelas: [],
    itens: [],
    assinatura: null,
    indicacoes: [],
    carregando: true,
    erro: null,
  })

  const recarregar = useCallback(async () => {
    const [perfil, clientes, produtos, vendas, parcelas, itens, assinatura, indicacoes] = await Promise.all([
      supabase.from('perfis').select('id, nome, empresa').eq('id', userId).maybeSingle(),
      supabase.from('clientes').select('id, nome, whatsapp, aniversario, observacao').order('nome'),
      supabase.from('produtos').select('id, nome, preco, descricao, foto_url, recompra_dias').order('nome'),
      supabase.from('vendas').select('id, cliente_id, data, total').order('data', { ascending: false }),
      supabase.from('parcelas').select('id, venda_id, numero, de, valor, vencimento, pago_em').order('vencimento'),
      supabase.from('venda_itens').select('id, venda_id, produto_id, nome, quantidade, preco, recompra_em, recompra_avisada'),
      supabase
        .from('assinaturas')
        .select('pago_ate, codigo, indicada_por, meses_ganhos, assinatura_status, criado_em')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.from('indicacoes').select('status, premiada').eq('indicadora_id', userId),
    ])
    const falha = [perfil, clientes, produtos, vendas, parcelas, itens].find((r) => r.error)
    setEstado({
      perfil: perfil.data,
      clientes: clientes.data ?? [],
      produtos: num(produtos.data ?? [], 'preco'),
      vendas: num(vendas.data ?? [], 'total'),
      parcelas: num(parcelas.data ?? [], 'valor'),
      itens: num(itens.data ?? [], 'preco'),
      // Antes de rodar a migração 003 essas tabelas não existem: o app segue funcionando sem a assinatura.
      assinatura: assinatura.data,
      indicacoes: indicacoes.data ?? [],
      carregando: false,
      erro: falha?.error ? 'Não consegui carregar seus dados. Confira a internet e tente de novo.' : null,
    })
  }, [userId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return <Contexto.Provider value={{ ...estado, recarregar }}>{children}</Contexto.Provider>
}

export function useDados(): Dados {
  const d = useContext(Contexto)
  if (!d) throw new Error('useDados fora do ProvedorDados')
  return d
}
