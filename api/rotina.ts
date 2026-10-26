// Rotina diária (Vercel Cron): valida as indicações pagas há 7 dias e dá 1 mês grátis a cada 3.
import { CARTAO_ATIVO, assinaturaDe, banco, json, precoMensal, stripe } from './_lib/servidor.js'

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return json({ erro: 'proibido' }, 401)

  const { data: premios, error } = await banco.rpc('validar_indicacoes')
  if (error) return json({ erro: error.message }, 500)

  const lista = (premios ?? []) as { indicadora_id: string; meses: number }[]
  const preco = lista.length ? await precoMensal() : null
  for (const { indicadora_id, meses } of lista) {
    const a = await assinaturaDe(indicadora_id)
    try {
      // No cartão, vira crédito no Stripe e as próximas faturas saem zeradas.
      if (a?.stripe_cliente_id && a.stripe_assinatura_id && CARTAO_ATIVO.includes(a.assinatura_status ?? '')) {
        await stripe.customers.createBalanceTransaction(a.stripe_cliente_id, {
          amount: -(preco?.unit_amount ?? 0) * meses,
          currency: 'brl',
          description: `Indique e ganhe: ${meses} ${meses === 1 ? 'mês grátis' : 'meses grátis'}`,
        })
        continue
      }
    } catch (e) {
      console.error('crédito no Stripe falhou, estendendo a data', indicadora_id, e)
    }
    await banco.rpc('estender_assinatura', { uid: indicadora_id, meses })
  }
  return json({ premiadas: lista.length })
}
