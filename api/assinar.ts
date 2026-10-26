// Abre o pagamento no Stripe: assinatura no cartão (com Apple Pay e Google Pay) ou 1 mês no Pix.
import { CARTAO_ATIVO, assinaturaDe, clienteStripe, json, precoMensal, stripe, usuarioDoPedido } from './_lib/servidor.js'

const DIA = 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  const usuario = await usuarioDoPedido(request)
  if (!usuario) return json({ erro: 'login' }, 401)
  const a = await assinaturaDe(usuario.id)
  if (!a) return json({ erro: 'sem_assinatura' }, 404)

  const { forma } = (await request.json().catch(() => ({}))) as { forma?: string }
  const origem = new URL(request.url).origin
  const cliente = await clienteStripe(a, usuario.email)
  const voltar = { success_url: `${origem}/?assinatura=ok`, cancel_url: `${origem}/?assinatura=cancelada` }

  if (forma === 'pix') {
    const preco = await precoMensal()
    const sessao = await stripe.checkout.sessions.create({
      ...voltar,
      mode: 'payment',
      customer: cliente,
      client_reference_id: usuario.id,
      locale: 'pt-BR',
      payment_method_types: ['pix'],
      line_items: [
        {
          quantity: 1,
          price_data: { currency: 'brl', unit_amount: preco.unit_amount ?? 0, product_data: { name: 'ClienteConecta: 1 mês' } },
        },
      ],
      metadata: { user_id: usuario.id },
    })
    return json({ url: sessao.url })
  }

  // Já assina no cartão: manda para a página do Stripe onde ela troca o cartão ou cancela.
  if (a.stripe_assinatura_id && CARTAO_ATIVO.includes(a.assinatura_status ?? '')) {
    const portal = await stripe.billingPortal.sessions.create({ customer: cliente, return_url: origem, locale: 'pt-BR' })
    return json({ url: portal.url })
  }

  // Quem ainda tem dias (teste ou Pix) só é cobrada quando eles acabarem. O Stripe exige ao menos 2 dias.
  const fim = new Date(a.pago_ate).getTime()
  const trial_end = fim - Date.now() > 2 * DIA ? Math.floor(fim / 1000) : undefined

  const sessao = await stripe.checkout.sessions.create({
    ...voltar,
    mode: 'subscription',
    customer: cliente,
    client_reference_id: usuario.id,
    locale: 'pt-BR',
    line_items: [{ price: process.env.STRIPE_PRECO_MENSAL, quantity: 1 }],
    subscription_data: { metadata: { user_id: usuario.id }, trial_end },
  })
  return json({ url: sessao.url })
}
