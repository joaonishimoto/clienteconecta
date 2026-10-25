import { useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useDados } from '../lib/dados'
import { montarLembretes, type Lembrete } from '../lib/lembretes'
import { dataBR, diaMes, dinheiro, hojeISO, primeiroNome } from '../lib/formato'
import { abrirWhatsapp } from '../lib/whatsapp'
import { Aviso, Botao, Topo, Vazio } from '../componentes'

export function Hoje() {
  const { perfil, clientes, vendas, parcelas, itens, recarregar } = useDados()
  const [erro, setErro] = useState('')
  const hoje = hojeISO()
  const lembretes = useMemo(
    () => montarLembretes(hoje, clientes, vendas, parcelas, itens),
    [hoje, clientes, vendas, parcelas, itens],
  )

  const cobrancas = lembretes.filter((l) => l.tipo === 'parcela')
  const aniversarios = lembretes.filter((l) => l.tipo === 'aniversario')
  const recompras = lembretes.filter((l) => l.tipo === 'recompra')

  async function alterar(tabela: 'parcelas' | 'venda_itens', id: string, mudanca: Record<string, unknown>) {
    setErro('')
    const { error } = await supabase.from(tabela).update(mudanca).eq('id', id)
    if (error) setErro('Não consegui salvar. Confira a internet e tente de novo.')
    await recarregar()
  }

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nome = perfil?.nome ? `, ${primeiroNome(perfil.nome)}` : ''

  return (
    <>
      <Topo titulo={`${saudacao}${nome}!`} />
      <p className="subtitulo">Hoje é {dataBR(hoje)}. Veja quem chamar:</p>
      {erro && <Aviso>{erro}</Aviso>}

      {lembretes.length === 0 && (
        <Vazio>
          Tudo em dia! 🎉
          <br />
          Nenhuma cobrança, aniversário ou recompra para hoje.
        </Vazio>
      )}

      {cobrancas.length > 0 && <h2>💰 Cobranças</h2>}
      {cobrancas.map((l) => l.tipo === 'parcela' && (
        <Item
          key={l.parcela.id}
          lembrete={l}
          acao={
            <Botao variante="secundario" onClick={() => alterar('parcelas', l.parcela.id, { pago_em: hoje })}>
              ✓ Já recebi
            </Botao>
          }
        >
          <p>
            Parcela {l.parcela.numero} de {l.parcela.de}: <strong>{dinheiro(l.parcela.valor)}</strong>
          </p>
          <p className={l.atrasada ? 'atrasada' : ''}>
            {l.atrasada
              ? `Atrasada desde ${diaMes(l.parcela.vencimento)}`
              : l.parcela.vencimento === hoje
                ? 'Vence hoje'
                : `Vence ${diaMes(l.parcela.vencimento)}`}
          </p>
        </Item>
      ))}

      {aniversarios.length > 0 && <h2>🎂 Aniversários</h2>}
      {aniversarios.map((l) => l.tipo === 'aniversario' && (
        <Item key={l.cliente.id} lembrete={l}>
          <p>{l.emDias === 0 ? <strong>É hoje!</strong> : l.emDias === 1 ? 'Amanhã' : `Daqui a ${l.emDias} dias`}</p>
        </Item>
      ))}

      {recompras.length > 0 && <h2>🔁 Hora de repor</h2>}
      {recompras.map((l) => l.tipo === 'recompra' && (
        <Item
          key={l.item.id}
          lembrete={l}
          acao={
            <Botao variante="secundario" onClick={() => alterar('venda_itens', l.item.id, { recompra_avisada: true })}>
              ✓ Já avisei
            </Botao>
          }
        >
          <p>
            Levou <strong>{l.item.nome}</strong>
          </p>
        </Item>
      ))}
    </>
  )
}

function Item({ lembrete, acao, children }: { lembrete: Lembrete; acao?: ReactNode; children: ReactNode }) {
  return (
    <div className="cartao">
      <h3>{lembrete.cliente.nome}</h3>
      {children}
      <Botao variante="whatsapp" onClick={() => abrirWhatsapp(lembrete.cliente.whatsapp, lembrete.mensagem)}>
        Chamar no WhatsApp
      </Botao>
      {acao}
    </div>
  )
}
