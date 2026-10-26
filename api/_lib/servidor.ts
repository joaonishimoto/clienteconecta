// Peças usadas pelas funções da Vercel (pasta /api). Rodam no servidor, com as chaves secretas.
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

// Chave service_role: passa por cima da segurança por linha, então só existe aqui no servidor.
export const banco = createClient(process.env.VITE_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
  auth: { persistSession: false },
})

// Situações do Stripe em que o cartão continua cobrando sozinho.
export const CARTAO_ATIVO = ['active', 'trialing', 'past_due']

export type Assinatura = {
  user_id: string
  pago_ate: string
  stripe_cliente_id: string | null
  stripe_assinatura_id: string | null
  assinatura_status: string | null
}

/** Quem está pedindo, pelo token de login do Supabase que o app manda no cabeçalho. */
export async function usuarioDoPedido(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await banco.auth.getUser(token)
  return data.user
}

export async function assinaturaDe(userId: string): Promise<Assinatura | null> {
  const { data } = await banco.from('assinaturas').select('*').eq('user_id', userId).maybeSingle()
  return data
}

export async function assinaturaDoCliente(clienteId: string): Promise<Assinatura | null> {
  const { data } = await banco.from('assinaturas').select('*').eq('stripe_cliente_id', clienteId).maybeSingle()
  return data
}

/** Cliente do Stripe da usuária; cria na primeira vez. */
export async function clienteStripe(a: Assinatura, email: string | undefined): Promise<string> {
  if (a.stripe_cliente_id) return a.stripe_cliente_id
  const cliente = await stripe.customers.create({ email, metadata: { user_id: a.user_id } })
  await banco.from('assinaturas').update({ stripe_cliente_id: cliente.id }).eq('user_id', a.user_id)
  return cliente.id
}

/** O preço mensal cadastrado no Stripe é a única fonte do valor (cartão, Pix e mês grátis). */
export function precoMensal() {
  return stripe.prices.retrieve(process.env.STRIPE_PRECO_MENSAL ?? '')
}

export const json = (dados: unknown, status = 200) => Response.json(dados, { status })
