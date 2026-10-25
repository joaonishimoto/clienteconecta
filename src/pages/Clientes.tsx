import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useDados } from '../lib/dados'
import type { Cliente, Parcela, VendaItem } from '../lib/tipos'
import { dataBR, diaMes, dinheiro, hojeISO, lerData, mascaraData, mascaraTelefone, primeiroNome, semAcento } from '../lib/formato'
import { abrirWhatsapp, mostrarTelefone } from '../lib/whatsapp'
import { Avatar, Aviso, Botao, BotaoWhatsapp, Campo, Linha, Secao, Topo, Vazio } from '../componentes'
import { IconeBolo, IconeBusca, IconeCheck, IconeEditar, IconeLixo, IconeMais, IconeVender, IconeVoltar, IconeWhatsapp } from '../icones'

type Tela = { tipo: 'lista' } | { tipo: 'ficha'; id: string } | { tipo: 'form'; id?: string }

export function Clientes({ vender }: { vender: (clienteId: string) => void }) {
  const [tela, setTela] = useState<Tela>({ tipo: 'lista' })
  const lista = () => setTela({ tipo: 'lista' })

  if (tela.tipo === 'form') {
    const voltar = tela.id ? () => setTela({ tipo: 'ficha', id: tela.id! }) : lista
    return <FormCliente id={tela.id} voltar={voltar} salvo={(id) => setTela({ tipo: 'ficha', id })} excluido={lista} />
  }
  if (tela.tipo === 'ficha')
    return (
      <Ficha id={tela.id} voltar={lista} editar={() => setTela({ tipo: 'form', id: tela.id })} vender={vender} />
    )
  return <Lista abrir={(id) => setTela({ tipo: 'ficha', id })} nova={() => setTela({ tipo: 'form' })} />
}

/** Quanto cada cliente ainda deve e se alguma parcela já venceu. */
function situacaoPorCliente(vendas: { id: string; cliente_id: string }[], parcelas: Parcela[], hoje: string) {
  const donaDaVenda = new Map(vendas.map((v) => [v.id, v.cliente_id]))
  const situacao = new Map<string, { aberto: number; atrasada: boolean }>()
  for (const p of parcelas) {
    const c = donaDaVenda.get(p.venda_id)
    if (!c || p.pago_em) continue
    const s = situacao.get(c) ?? { aberto: 0, atrasada: false }
    s.aberto += p.valor
    s.atrasada ||= p.vencimento < hoje
    situacao.set(c, s)
  }
  return situacao
}

function Lista({ abrir, nova }: { abrir: (id: string) => void; nova: () => void }) {
  const { clientes, vendas, parcelas } = useDados()
  const [busca, setBusca] = useState('')
  const [soDevendo, setSoDevendo] = useState(false)
  const situacao = situacaoPorCliente(vendas, parcelas, hojeISO())
  const quantasDevem = clientes.filter((c) => situacao.has(c.id)).length

  const termo = semAcento(busca)
  const digitos = busca.replace(/\D/g, '')
  const filtradas = clientes.filter(
    (c) =>
      (!soDevendo || situacao.has(c.id)) &&
      (semAcento(c.nome).includes(termo) || (digitos.length > 2 && c.whatsapp.replace(/\D/g, '').includes(digitos))),
  )

  return (
    <>
      <Topo
        titulo="Clientes"
        subtitulo={clientes.length ? `${clientes.length} ${clientes.length === 1 ? 'cliente' : 'clientes'}` : undefined}
      />
      <Botao icone={<IconeMais />} onClick={nova}>
        Nova cliente
      </Botao>
      {clientes.length > 5 && (
        <label className="busca">
          <IconeBusca />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou telefone"
            aria-label="Procurar cliente"
          />
        </label>
      )}
      {quantasDevem > 0 && (
        <div className="filtros" role="group" aria-label="Mostrar">
          <button type="button" aria-pressed={!soDevendo} onClick={() => setSoDevendo(false)}>
            Todas <span>{clientes.length}</span>
          </button>
          <button type="button" aria-pressed={soDevendo} onClick={() => setSoDevendo(true)}>
            A receber <span>{quantasDevem}</span>
          </button>
        </div>
      )}
      {clientes.length === 0 && (
        <Vazio titulo="Nenhuma cliente ainda">
          Cadastre a primeira em “Nova cliente”, ou traga sua lista de uma planilha em Minha conta.
        </Vazio>
      )}
      {clientes.length > 0 && filtradas.length === 0 && (
        <Vazio titulo={busca ? 'Ninguém com esse nome' : 'Ninguém aqui'}>
          {busca ? 'Confira a escrita ou procure só pelo primeiro nome.' : undefined}
        </Vazio>
      )}
      {filtradas.length > 0 && (
        <Secao>
          {filtradas.map((c) => {
            const s = situacao.get(c.id)
            return (
              <Linha
                key={c.id}
                inicio={<Avatar nome={c.nome} />}
                titulo={c.nome}
                detalhe={
                  <>
                    {c.whatsapp ? mostrarTelefone(c.whatsapp) : 'Sem WhatsApp'}
                    {s && (
                      <span className={`selo ${s.atrasada ? 'selo-atrasado' : 'selo-hoje'}`}>
                        {s.atrasada ? 'Atrasada' : 'A receber'}: {dinheiro(s.aberto)}
                      </span>
                    )}
                  </>
                }
                onClick={() => abrir(c.id)}
              />
            )
          })}
        </Secao>
      )}
    </>
  )
}

function Ficha({ id, voltar, editar, vender }: { id: string; voltar: () => void; editar: () => void; vender: (id: string) => void }) {
  const { clientes, vendas, itens, parcelas, recarregar } = useDados()
  const [erro, setErro] = useState('')
  // Guarda a última parcela marcada como recebida para ela poder desfazer um toque errado.
  const [recebida, setRecebida] = useState<Parcela | null>(null)
  const c = clientes.find((x) => x.id === id)
  if (!c) return <Topo titulo="Cliente não encontrada" voltar={voltar} />

  const hoje = hojeISO()
  const compras = vendas.filter((v) => v.cliente_id === id)
  const abertas = parcelas.filter((p) => !p.pago_em && compras.some((v) => v.id === p.venda_id))
  const emAberto = abertas.reduce((soma, p) => soma + p.valor, 0)
  const atrasadas = abertas.filter((p) => p.vencimento < hoje)
  const totalComprado = compras.reduce((soma, v) => soma + v.total, 0)

  async function marcar(p: Parcela, pago_em: string | null) {
    setErro('')
    const { error } = await supabase.from('parcelas').update({ pago_em }).eq('id', p.id)
    if (error) return setErro('Não foi possível salvar. Confira a internet e tente de novo.')
    setRecebida(pago_em ? p : null)
    await recarregar()
  }

  const nome = primeiroNome(c.nome)
  const cobranca =
    `Oi ${nome}, tudo bem? Passando para lembrar ` +
    (atrasadas.length
      ? `da parcela de ${dinheiro(atrasadas[0].valor)} que venceu em ${dataBR(atrasadas[0].vencimento)}.`
      : `que ainda falta ${dinheiro(emAberto)} das suas compras.`) +
    ` Qualquer coisa me chama!`

  return (
    <>
      <div className="ficha-barra">
        <button type="button" className="topo-voltar" onClick={voltar}>
          <IconeVoltar /> Clientes
        </button>
        <button type="button" className="botao-pequeno ficha-editar" onClick={editar}>
          <IconeEditar /> Editar
        </button>
      </div>
      <header className="ficha-topo">
        <Avatar nome={c.nome} />
        <div className="ficha-nome">
          <h1>{c.nome}</h1>
          <p className="topo-sub">{c.whatsapp ? mostrarTelefone(c.whatsapp) : 'Sem WhatsApp'}</p>
        </div>
        {c.whatsapp && <BotaoWhatsapp nome={c.nome} onClick={() => abrirWhatsapp(c.whatsapp, `Oi ${nome}, tudo bem?`)} />}
      </header>
      {erro && <Aviso>{erro}</Aviso>}

      {compras.length > 0 && (
        <ul className="ficha-resumo" aria-label="Resumo da cliente">
          <li>
            <strong>{dinheiro(totalComprado)}</strong> já comprou
          </li>
          <li>
            <strong>{compras.length}</strong> {compras.length === 1 ? 'compra' : 'compras'}
          </li>
          <li>
            <strong>{diaMes(compras[0].data)}</strong> última compra
          </li>
        </ul>
      )}

      {emAberto > 0 && (
        <div className={`destaque-receber ${atrasadas.length ? '' : 'destaque-receber-em-dia'}`}>
          <span className="destaque-receber-texto">
            {atrasadas.length ? 'Falta receber, com parcela atrasada' : 'Falta receber'}
            <strong>{dinheiro(emAberto)}</strong>
          </span>
          {c.whatsapp && (
            <button
              type="button"
              className="botao-whatsapp-icone"
              onClick={() => abrirWhatsapp(c.whatsapp, cobranca)}
              aria-label={`Lembrar ${nome} do pagamento pelo WhatsApp`}
              title="Lembrar pelo WhatsApp"
            >
              <IconeWhatsapp />
            </button>
          )}
        </div>
      )}

      <Botao icone={<IconeVender />} onClick={() => vender(c.id)}>
        Nova venda para {nome}
      </Botao>

      {(c.aniversario || c.observacao) && (
        <Secao>
          {c.aniversario && <Linha inicio={<IconeBolo />} titulo="Aniversário" fim={diaMes(c.aniversario)} />}
          {c.observacao && <Linha inicio={<IconeEditar />} titulo={c.observacao} />}
        </Secao>
      )}

      {recebida && (
        <div className="aviso aviso-ok aviso-com-acao" role="status">
          <span>Parcela de {dinheiro(recebida.valor)} marcada como recebida.</span>
          <button type="button" onClick={() => marcar(recebida, null)}>
            Desfazer
          </button>
        </div>
      )}

      <Secao titulo="Compras">
        {compras.length === 0 && <p className="painel-vazio">Nenhuma compra ainda. Toque em “Nova venda” para registrar a primeira.</p>}
        {compras.map((v) => (
          <Compra
            key={v.id}
            data={v.data}
            total={v.total}
            itens={itens.filter((i) => i.venda_id === v.id)}
            parcelas={parcelas.filter((p) => p.venda_id === v.id)}
            hoje={hoje}
            receber={(p) => marcar(p, hoje)}
          />
        ))}
      </Secao>
    </>
  )
}

/** Uma compra: o que levou, se já está paga e, se não, as parcelas que faltam. */
function Compra({
  data,
  total,
  itens,
  parcelas,
  hoje,
  receber,
}: {
  data: string
  total: number
  itens: VendaItem[]
  parcelas: Parcela[]
  hoje: string
  receber: (p: Parcela) => void
}) {
  const faltam = parcelas.filter((p) => !p.pago_em)
  const pagas = parcelas.length - faltam.length
  return (
    <div className="compra">
      <div className="compra-topo">
        <span>{dataBR(data)}</span>
        <strong>{dinheiro(total)}</strong>
      </div>
      {itens.length > 0 && <p className="compra-itens">{descreverItens(itens)}</p>}
      {faltam.length === 0 ? (
        <p className="compra-paga">
          <IconeCheck /> {parcelas.length > 1 ? `Paga, ${parcelas.length} parcelas` : 'Paga'}
        </p>
      ) : (
        <>
          {pagas > 0 && (
            <p className="compra-pagas">
              <IconeCheck /> {pagas} de {parcelas.length} {pagas === 1 ? 'parcela paga' : 'parcelas pagas'}
            </p>
          )}
          {faltam.map((p) => {
            const atrasada = p.vencimento < hoje
            return (
              <div className="parcela" key={p.id}>
                <span>
                  {p.de > 1 ? `${p.numero}ª de ${p.de}, ` : ''}
                  {dinheiro(p.valor)}
                  <small className={atrasada ? 'parcela-atrasada' : ''}>
                    {atrasada ? `Atrasada desde ${diaMes(p.vencimento)}` : p.vencimento === hoje ? 'Vence hoje' : `Vence ${diaMes(p.vencimento)}`}
                  </small>
                </span>
                <button type="button" className="botao-pequeno" onClick={() => receber(p)}>
                  <IconeCheck /> Recebi
                </button>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}


function FormCliente({
  id,
  voltar,
  salvo,
  excluido,
}: {
  id?: string
  voltar: () => void
  salvo: (id: string) => void
  excluido: () => void
}) {
  const { clientes, recarregar } = useDados()
  const atual = clientes.find((c) => c.id === id)
  const [nome, setNome] = useState(atual?.nome ?? '')
  const [whatsapp, setWhatsapp] = useState(atual?.whatsapp ? mascaraTelefone(mostrarTelefone(atual.whatsapp)) : '')
  const [aniversario, setAniversario] = useState(atual?.aniversario ? aniversarioTexto(atual.aniversario) : '')
  const [observacao, setObservacao] = useState(atual?.observacao ?? '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const repetida = nome.trim() && clientes.find((c) => c.id !== id && semAcento(c.nome) === semAcento(nome))

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (!nome.trim()) return setErro('Escreva o nome da cliente.')
    const data = lerData(aniversario)
    if (aniversario.trim() && !data) return setErro('Escreva o aniversário assim: 25/12')
    const dados: Omit<Cliente, 'id'> = { nome: nome.trim(), whatsapp: whatsapp.trim(), aniversario: data, observacao: observacao.trim() }
    setSalvando(true)
    const r = id
      ? await supabase.from('clientes').update(dados).eq('id', id).select('id').single()
      : await supabase.from('clientes').insert(dados).select('id').single()
    setSalvando(false)
    if (r.error) return setErro('Não foi possível salvar. Confira a internet e tente de novo.')
    await recarregar()
    salvo(r.data.id)
  }

  async function excluir() {
    if (!id || !confirm(`Apagar ${nome}? As compras dela também serão apagadas.`)) return
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) return setErro('Não foi possível apagar. Tente de novo.')
    await recarregar()
    excluido()
  }

  return (
    <>
      <Topo titulo={id ? 'Editar cliente' : 'Nova cliente'} voltar={voltar} />
      <form className="formulario" onSubmit={salvar} noValidate>
        <Campo
          rotulo="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoCapitalize="words"
          placeholder="Ex.: Ana Lúcia Ferreira"
          required
          autoFocus={!id}
        />
        {repetida && <p className="campo-dica campo-alerta">Já existe uma cliente chamada {repetida.nome}. Confira se não é a mesma.</p>}
        <Campo
          rotulo="WhatsApp"
          type="tel"
          inputMode="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(mascaraTelefone(e.target.value))}
          placeholder="(11) 98765-4321"
          dica="Com DDD. É para onde vão as mensagens e os lembretes."
        />
        <Campo
          rotulo="Aniversário"
          inputMode="numeric"
          value={aniversario}
          onChange={(e) => setAniversario(mascaraData(e.target.value))}
          placeholder="25/12"
          dica="Só dia e mês já basta."
        />
        <Campo rotulo="Anotação" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: prefere chá de ervas" />
        {erro && <Aviso>{erro}</Aviso>}
        <Botao type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : id ? 'Salvar alterações' : 'Cadastrar cliente'}
        </Botao>
        {id && (
          <Botao variante="perigo" icone={<IconeLixo />} onClick={excluir}>
            Apagar cliente
          </Botao>
        )}
      </form>
    </>
  )
}

function aniversarioTexto(iso: string): string {
  return iso.startsWith('1900-') ? diaMes(iso) : dataBR(iso)
}

function descreverItens(itens: VendaItem[]): string {
  return itens.map((i) => (i.quantidade > 1 ? `${i.quantidade}x ${i.nome}` : i.nome)).join(', ')
}
