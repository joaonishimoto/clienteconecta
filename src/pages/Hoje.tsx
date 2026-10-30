import { useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useDados } from '../lib/dados'
import { montarLembretes, type Lembrete } from '../lib/lembretes'
import { diaMes, dinheiro, hojeISO, primeiroNome } from '../lib/formato'
import { abrirWhatsapp } from '../lib/whatsapp'
import { Avatar, Aviso, BotaoWhatsapp, Vazio } from '../componentes'
import { IconeBolo, IconeCheck, IconeMoeda, IconeRepor } from '../icones'

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
    if (error) setErro('Não foi possível salvar. Confira a internet e tente de novo.')
    await recarregar()
  }

  const agora = new Date()
  const hora = agora.getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nome = perfil?.nome ? `, ${primeiroNome(perfil.nome)}` : ''
  const semana = agora.toLocaleDateString('pt-BR', { weekday: 'long' })
  const mes = agora.toLocaleDateString('pt-BR', { month: 'long' })
  const partes = [
    cobrancas.length && `${cobrancas.length} ${cobrancas.length === 1 ? 'cobrança' : 'cobranças'}`,
    aniversarios.length && `${aniversarios.length} ${aniversarios.length === 1 ? 'aniversário' : 'aniversários'}`,
    recompras.length && `${recompras.length} para repor`,
  ].filter(Boolean)
  const resumo = partes.length
    ? `Para hoje: ${partes.length > 1 ? partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1] : partes[0]}.`
    : 'Nada pendente para hoje.'

  return (
    <>
      {/* A folhinha do dia, como a do calendário de parede, e o resumo do que espera por ela. */}
      <header className="hoje-topo">
        <span className="folhinha" aria-hidden>
          <span className="folhinha-mes">{mes}</span>
          <span className="folhinha-dia">{agora.getDate()}</span>
        </span>
        <div className="hoje-titulo">
          <p className="topo-sub">
            {saudacao}
            {nome}
          </p>
          <h1>
            {semana.charAt(0).toUpperCase() + semana.slice(1)}, {agora.getDate()} de {mes}
          </h1>
          <p className="hoje-resumo">{resumo}</p>
        </div>
      </header>
      {erro && <Aviso>{erro}</Aviso>}

      {lembretes.length === 0 && (
        <Vazio titulo="Tudo em dia">Quando houver cobrança, aniversário ou produto para repor, ele aparece aqui.</Vazio>
      )}

      <div className="hoje-grupos">
      {cobrancas.length > 0 && (
        <Grupo icone={<IconeMoeda />} titulo="Cobranças" tom="cobranca">
          {cobrancas.map(
            (l) =>
              l.tipo === 'parcela' && (
                <Tarefa
                  key={l.parcela.id}
                  lembrete={l}
                  detalhe={
                    <>
                      <strong>{dinheiro(l.parcela.valor)}</strong>, {`parcela\u00a0${l.parcela.numero}\u00a0de\u00a0${l.parcela.de}`}
                      <span className={l.atrasada ? 'selo selo-atrasado' : 'selo selo-hoje'}>
                        {l.atrasada
                          ? `Atrasada desde ${diaMes(l.parcela.vencimento)}`
                          : l.parcela.vencimento === hoje
                            ? 'Vence hoje'
                            : `Vence ${diaMes(l.parcela.vencimento)}`}
                      </span>
                    </>
                  }
                  acao={
                    <button type="button" className="botao-pequeno" onClick={() => alterar('parcelas', l.parcela.id, { pago_em: hoje })}>
                      <IconeCheck /> Recebi
                    </button>
                  }
                />
              ),
          )}
        </Grupo>
      )}

      {aniversarios.length > 0 && (
        <Grupo icone={<IconeBolo />} titulo="Aniversários" tom="aniversario">
          {aniversarios.map(
            (l) =>
              l.tipo === 'aniversario' && (
                <Tarefa
                  key={l.cliente.id}
                  lembrete={l}
                  detalhe={
                    l.emDias === 0 ? (
                      <span className="selo selo-festa">Faz aniversário hoje</span>
                    ) : l.emDias === 1 ? (
                      'Faz aniversário amanhã'
                    ) : (
                      `Faz aniversário daqui a ${l.emDias} dias`
                    )
                  }
                />
              ),
          )}
        </Grupo>
      )}

      {recompras.length > 0 && (
        <Grupo icone={<IconeRepor />} titulo="Hora de repor" tom="repor">
          {recompras.map(
            (l) =>
              l.tipo === 'recompra' && (
                <Tarefa
                  key={l.item.id}
                  lembrete={l}
                  detalhe={
                    <>
                      Comprou <strong>{l.item.nome}</strong>
                    </>
                  }
                  acao={
                    <button
                      type="button"
                      className="botao-pequeno"
                      onClick={() => alterar('venda_itens', l.item.id, { recompra_avisada: true })}
                    >
                      <IconeCheck /> Já avisei
                    </button>
                  }
                />
              ),
          )}
        </Grupo>
      )}
      </div>
    </>
  )
}

function Grupo({ icone, titulo, tom, children }: { icone: ReactNode; titulo: string; tom: string; children: ReactNode }) {
  return (
    <section className={`secao grupo grupo-${tom}`}>
      <h2>
        <span className="grupo-icone">{icone}</span>
        {titulo}
      </h2>
      <div className="painel">{children}</div>
    </section>
  )
}

function Tarefa({ lembrete, detalhe, acao }: { lembrete: Lembrete; detalhe: ReactNode; acao?: ReactNode }) {
  return (
    <article className="tarefa">
      <Avatar nome={lembrete.cliente.nome} />
      <div className="tarefa-texto">
        <p className="tarefa-nome">{lembrete.cliente.nome}</p>
        <p className="tarefa-detalhe">{detalhe}</p>
        {acao && <div className="tarefa-acao">{acao}</div>}
      </div>
      <BotaoWhatsapp
        nome={lembrete.cliente.nome}
        onClick={() => abrirWhatsapp(lembrete.cliente.whatsapp, lembrete.mensagem)}
      />
    </article>
  )
}
