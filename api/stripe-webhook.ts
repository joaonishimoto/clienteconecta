// Avisos do Stripe: pagamento confirmado empurra pago_ate e conta a indicação; estorno anula a indicação.
import type Stripe from 'stripe'
import { assinaturaDoCliente, banco, json, stripe } from './_lib/servidor.js'

export async function POST(request: Request) {
  let evento: Stripe.Event
  try {
    evento = await stripe.webhooks.constructEventAsync(
      await request.text(),
      request.headers.get('stripe-signature') ?? '',
      process.env.STRIPE_WEBHOOK_SECRET ?? '',
    )
  } catch {
    return json({ erro: 'assinatura inválida' }, 400)
  }

  const { data: visto } = await banco.from('eventos_stripe').select('id').eq('id', evento.id).maybeSingle()
  if (visto) return json({ ok: true, repetido: true })

  await tratar(evento)
  await banco.from('eventos_stripe').insert({ id: evento.id })
  return json({ ok: true })
}

async function tratar(evento: Stripe.Event) {
  switch (evento.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const s = evento.data.object
      const userId = s.client_reference_id
      if (!userId) return
      if (s.mode === 'subscription' && typeof s.subscription === 'string') {
        await banco
          .from('assinaturas')
          .update({ stripe_assinatura_id: s.subscription, assinatura_status: 'active' })
          .eq('user_id', userId)
      }
      // Pix: chega pago aqui (na hora ou depois, no async_payment_succeeded).
      if (s.mode === 'payment' && s.payment_status === 'paid') {
        await banco.rpc('estender_assinatura', { uid: userId, meses: 1 })
        await contarPagamento(userId)
      }
      return
    }

    case 'invoice.paid': {
      const fatura = evento.data.object
      const a = await assinaturaDoCliente(String(fatura.customer))
      if (!a) return
      const fim = Math.max(...fatura.lines.data.map((l) => l.period.end)) * 1000
      if (fim > new Date(a.pago_ate).getTime()) {
        await banco.from('assinaturas').update({ pago_ate: new Date(fim).toISOString() }).eq('user_id', a.user_id)
      }
      // Fatura zerada (teste ou mês grátis) não conta como pagamento para a indicação.
      if (fatura.amount_paid > 0) await contarPagamento(a.user_id)
      return
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = evento.data.object
      const a = await assinaturaDoCliente(String(sub.customer))
      if (!a) return
      // Uma assinatura antiga encerrando não apaga a nova.
      if (a.stripe_assinatura_id && a.stripe_assinatura_id !== sub.id) return
      const encerrada = evento.type === 'customer.subscription.deleted'
      await banco
        .from('assinaturas')
        .update({ stripe_assinatura_id: encerrada ? null : sub.id, assinatura_status: encerrada ? 'canceled' : sub.status })
        .eq('user_id', a.user_id)
      return
    }

    case 'charge.refunded': {
      const cobranca = evento.data.object
      if (!cobranca.customer) return
      const a = await assinaturaDoCliente(String(cobranca.customer))
      if (!a) return
      await banco.from('indicacoes').update({ status: 'anulada' }).eq('indicada_id', a.user_id).eq('status', 'pendente')
      return
    }
  }
}

/** 1º pagamento de quem foi indicada: começa a contar os 7 dias. */
async function contarPagamento(userId: string) {
  await banco
    .from('indicacoes')
    .update({ pago_em: new Date().toISOString() })
    .eq('indicada_id', userId)
    .eq('status', 'pendente')
    .is('pago_em', null)
}
