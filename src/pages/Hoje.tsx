import { useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useDados } from '../lib/dados'
import { montarLembretes, type Lembrete } from '../lib/lembretes'
import { diaMes, dinheiro, hojeISO, primeiroNome } from '../lib/formato'
import { abrirWhatsapp } from '../lib/whatsapp'
import { Avatar, Aviso, Botao, Vazio } from '../componentes'
import { IconeBolo, IconeCheck, IconeMoeda, IconeRepor, IconeWhatsapp } from '../icones'

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
  const pessoas = new Set(lembretes.map((l) => l.cliente.id)).size

  return (
    <>
      <header className="hoje-topo">
        <p className="hoje-saudacao">
          {saudacao}
          {nome}
        </p>
        <h1 className="hoje-data">{data.charAt(0).toUpperCase() + data.slice(1)}</h1>
        {pessoas > 0 && (
          <p className="hoje-resumo">
            {pessoas === 1 ? 'Uma cliente espera sua mensagem hoje.' : `${pessoas} clientes esperam sua mensagem hoje.`}
          </p>
        )}
      </header>
      {erro && <Aviso>{erro}</Aviso>}

      {lembretes.length === 0 && (
        <Vazio titulo="Tudo em dia">Nenhuma cobrança, aniversário ou recompra para hoje.</Vazio>
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
                    <Botao variante="leve" icone={<IconeCheck />} onClick={() => alterar('parcelas', l.parcela.id, { pago_em: hoje })}>
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
                      variante="leve"
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
      <div className="painel">{children}</div>
    </section>
  )
}

function Tarefa({ lembrete, detalhe, acao }: { lembrete: Lembrete; detalhe: ReactNode; acao?: ReactNode }) {
  return (
    <div className="tarefa">
      <div className="tarefa-quem">
        <Avatar nome={lembrete.cliente.nome} />
        <div>
          <p className="tarefa-nome">{lembrete.cliente.nome}</p>
          <p className="tarefa-detalhe">{detalhe}</p>
        </div>
      </div>
      <div className="tarefa-acoes">
        <Botao
          variante="whatsapp"
          icone={<IconeWhatsapp />}
          onClick={() => abrirWhatsapp(lembrete.cliente.whatsapp, lembrete.mensagem)}
        >
          WhatsApp
        </Botao>
        {acao}
      </div>
    </div>
  )
}
