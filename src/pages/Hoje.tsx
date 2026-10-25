import { useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useDados } from '../lib/dados'
import { montarLembretes, type Lembrete } from '../lib/lembretes'
import { diaMes, dinheiro, hojeISO, primeiroNome } from '../lib/formato'
import { abrirWhatsapp } from '../lib/whatsapp'
import { Avatar, Aviso, Botao, BotaoWhatsapp, Vazio } from '../componentes'
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
  const data = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      {/* Faixa azul da marca com o dia e o resumo do que espera por ela hoje. */}
      <header className="hoje-topo">
        <p className="hoje-saudacao">
          {saudacao}
          {nome}
        </p>
        <h1 className="hoje-data">{data.charAt(0).toUpperCase() + data.slice(1)}</h1>
        <ul className="hoje-contas" aria-label="Resumo de hoje">
          <li>
            <strong>{cobrancas.length}</strong> {cobrancas.length === 1 ? 'cobrança' : 'cobranças'}
          </li>
          <li>
            <strong>{aniversarios.length}</strong> {aniversarios.length === 1 ? 'aniversário' : 'aniversários'}
          </li>
          <li>
            <strong>{recompras.length}</strong> para repor
          </li>
        </ul>
      </header>
      {erro && <Aviso>{erro}</Aviso>}

      {lembretes.length === 0 && (
        <Vazio titulo="Tudo em dia">Quando houver cobrança, aniversário ou produto para repor, ele aparece aqui.</Vazio>
      )}

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
                      Parcela {l.parcela.numero} de {l.parcela.de}, <strong>{dinheiro(l.parcela.valor)}</strong>
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
                    <Botao variante="secundario" icone={<IconeCheck />} onClick={() => alterar('parcelas', l.parcela.id, { pago_em: hoje })}>
                      Recebi
                    </Botao>
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
                    <Botao
                      variante="secundario"
                      icone={<IconeCheck />}
                      onClick={() => alterar('venda_itens', l.item.id, { recompra_avisada: true })}
                    >
                      Já avisei
                    </Botao>
                  }
                />
              ),
          )}
        </Grupo>
      )}
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
      <div className="cartoes">{children}</div>
    </section>
  )
}

function Tarefa({ lembrete, detalhe, acao }: { lembrete: Lembrete; detalhe: ReactNode; acao?: ReactNode }) {
  return (
    <article className="tarefa">
      <div className="tarefa-quem">
        <Avatar nome={lembrete.cliente.nome} />
        <div className="tarefa-texto">
          <p className="tarefa-nome">{lembrete.cliente.nome}</p>
          <p className="tarefa-detalhe">{detalhe}</p>
        </div>
        <BotaoWhatsapp
          nome={lembrete.cliente.nome}
          onClick={() => abrirWhatsapp(lembrete.cliente.whatsapp, lembrete.mensagem)}
        />
      </div>
      {acao}
    </article>
  )
}
