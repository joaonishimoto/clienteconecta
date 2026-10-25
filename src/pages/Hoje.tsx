import { useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useDados } from '../lib/dados'
import { montarLembretes, type Lembrete } from '../lib/lembretes'
import { diaMes, dinheiro, hojeISO, primeiroNome } from '../lib/formato'
import { abrirWhatsapp } from '../lib/whatsapp'
import { Avatar, Aviso, Botao, Vazio } from '../componentes'
import { IconeCheck, IconeWhatsapp } from '../icones'

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
  const pessoas = new Set(lembretes.map((l) => l.cliente.id)).size
  const dataCompleta = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const mes = agora.toLocaleDateString('pt-BR', { month: 'long' })
  const semana = agora.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '')

  return (
    <>
      {/* A folhinha de parede: o dia de hoje é o título da tela. */}
      <header className="hoje-topo">
        <h1 className="folhinha" aria-label={dataCompleta}>
          <span className="folhinha-mes" aria-hidden>{mes}</span>
          <span className="folhinha-dia" aria-hidden>{agora.getDate()}</span>
          <span className="folhinha-semana" aria-hidden>{semana}</span>
        </h1>
        <div className="hoje-texto">
          <p className="hoje-saudacao">
            {saudacao}
            {nome}.
          </p>
          <p className="hoje-resumo">
            {pessoas === 0
              ? 'Nenhuma mensagem para mandar hoje.'
              : pessoas === 1
                ? 'Uma cliente espera sua mensagem hoje.'
                : `${pessoas} clientes esperam sua mensagem hoje.`}
          </p>
        </div>
      </header>
      {erro && <Aviso>{erro}</Aviso>}

      {lembretes.length === 0 && (
        <Vazio titulo="Tudo em dia">Quando houver cobrança, aniversário ou produto para repor, ele aparece aqui.</Vazio>
      )}

      {cobrancas.length > 0 && (
        <Grupo titulo="Cobranças" tom="cobranca" total={cobrancas.length}>
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
        <Grupo titulo="Aniversários" tom="aniversario" total={aniversarios.length}>
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
        <Grupo titulo="Hora de repor" tom="repor" total={recompras.length}>
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

function Grupo({ titulo, tom, total, children }: { titulo: string; tom: string; total: number; children: ReactNode }) {
  return (
    <section className={`secao grupo grupo-${tom}`}>
      <h2>
        {titulo}
        <span className="grupo-total">{total}</span>
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
        <div className="tarefa-texto">
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
