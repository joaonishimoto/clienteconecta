import { useState, type FormEvent } from 'react'
import { useDados } from '../lib/dados'
import {
  INDICADAS_POR_MES,
  PRECO_MENSAL,
  linkConvite,
  mensagemConvite,
  podeUsarConvite,
  progresso,
  situacao,
} from '../lib/assinatura'
import { irParaPagamento, usarConvite } from '../lib/pagamento'
import { dataBR, dinheiro } from '../lib/formato'
import { abrirWhatsapp } from '../lib/whatsapp'
import { Aviso, Botao, Campo } from '../componentes'
import { IconeCheck, IconeWhatsapp } from '../icones'

// O Pix do Stripe é liberado por convite; enquanto não estiver ativo na conta, o botão fica escondido.
const PIX = import.meta.env.VITE_PAGAR_PIX === 'true'

export function MinhaAssinatura() {
  const { assinatura } = useDados()
  const [indo, setIndo] = useState<'cartao' | 'pix' | null>(null)
  const [erro, setErro] = useState('')
  if (!assinatura) return null

  const s = situacao(assinatura)
  const ate = dataBR(assinatura.pago_ate.slice(0, 10))
  const texto = {
    teste: `Teste grátis até ${ate}.`,
    'em-dia': s.cartao ? `Em dia. Renova sozinha no cartão em ${ate}.` : `Em dia até ${ate}.`,
    vencendo: `Vence em ${ate}.`,
    vencida: `Venceu em ${ate}. Você ainda consegue anotar por alguns dias.`,
    bloqueada: `Venceu em ${ate}. Seus dados estão guardados; assine para voltar a anotar.`,
  }[s.tipo]

  async function pagar(forma: 'cartao' | 'pix') {
    setErro('')
    setIndo(forma)
    try {
      await irParaPagamento(forma)
    } catch {
      setErro('Não foi possível abrir o pagamento. Confira a internet e tente de novo.')
      setIndo(null)
    }
  }

  return (
    <section className="secao">
      <h2>Minha assinatura</h2>
      <p className="secao-texto">{texto}</p>
      {s.cartao ? (
        <Botao variante="secundario" disabled={indo !== null} onClick={() => pagar('cartao')}>
          {indo ? 'Abrindo…' : 'Trocar cartão ou cancelar'}
        </Botao>
      ) : (
        <>
          <Botao disabled={indo !== null} onClick={() => pagar('cartao')}>
            {indo === 'cartao' ? 'Abrindo…' : `Assinar por ${dinheiro(PRECO_MENSAL)} por mês`}
          </Botao>
          {PIX && (
            <Botao variante="secundario" disabled={indo !== null} onClick={() => pagar('pix')}>
              {indo === 'pix' ? 'Abrindo…' : 'Pagar 1 mês com Pix'}
            </Botao>
          )}
          <p className="campo-dica">
            No cartão, Apple Pay ou Google Pay, a cobrança é feita sozinha todo mês e você cancela quando quiser.
            {s.tipo === 'teste' && ' Assinando agora, a primeira cobrança só acontece quando o teste acabar.'}
          </p>
        </>
      )}
      {erro && <Aviso>{erro}</Aviso>}
    </section>
  )
}

export function IndiqueEGanhe() {
  const { assinatura, indicacoes, recarregar } = useDados()
  const [copiado, setCopiado] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  if (!assinatura) return null

  const { valendo, esperando } = progresso(indicacoes)
  const link = linkConvite(assinatura.codigo)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  async function usar(e: FormEvent) {
    e.preventDefault()
    try {
      const r = await usarConvite(codigo)
      setAviso(
        r === 'ok'
          ? { tipo: 'ok', texto: 'Convite registrado!' }
          : { tipo: 'erro', texto: 'Não achei esse código. Confira as letras e tente de novo.' },
      )
      if (r === 'ok') await recarregar()
    } catch {
      setAviso({ tipo: 'erro', texto: 'Não foi possível salvar. Confira a internet e tente de novo.' })
    }
  }

  return (
    <section className="secao">
      <h2>Indique e ganhe</h2>
      <p className="secao-texto">
        A cada {INDICADAS_POR_MES} amigas que assinarem pelo seu link, você ganha 1 mês grátis. Não tem limite.
      </p>
      <div className="painel indique">
        <p className="indique-conta">
          <strong>
            {valendo} de {INDICADAS_POR_MES}
          </strong>{' '}
          para o próximo mês grátis
        </p>
        <div
          className="indique-barra"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={INDICADAS_POR_MES}
          aria-valuenow={valendo}
          aria-label="Amigas que já contam"
        >
          <span style={{ width: `${(valendo / INDICADAS_POR_MES) * 100}%` }} />
        </div>
        {esperando > 0 && (
          <p className="campo-dica">
            {esperando === 1 ? '1 amiga ainda está' : `${esperando} amigas ainda estão`} no teste ou pagou há menos de 7
            dias. Depois disso, entra na conta.
          </p>
        )}
        {assinatura.meses_ganhos > 0 && (
          <p className="indique-ganhos">
            <IconeCheck /> Você já ganhou {assinatura.meses_ganhos} {assinatura.meses_ganhos === 1 ? 'mês' : 'meses'}
          </p>
        )}
        <p className="indique-link">{link}</p>
        <div className="acoes">
          <Botao variante="whatsapp" icone={<IconeWhatsapp />} onClick={() => abrirWhatsapp('', mensagemConvite(assinatura.codigo))}>
            Mandar
          </Botao>
          <Botao variante="secundario" onClick={copiar}>
            {copiado ? 'Copiado!' : 'Copiar link'}
          </Botao>
        </div>
      </div>

      {podeUsarConvite(assinatura) && (
        <form className="formulario" onSubmit={usar}>
          <Campo
            rotulo="Recebeu um convite?"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ex.: K7P2MX"
            dica="Digite o código do link de quem te indicou."
            autoCapitalize="characters"
          />
          <Botao type="submit" variante="secundario" disabled={codigo.trim().length < 6}>
            Usar convite
          </Botao>
        </form>
      )}
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
    </section>
  )
}
