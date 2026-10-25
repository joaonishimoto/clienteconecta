import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useDados } from '../lib/dados'
import type { Cliente, VendaItem } from '../lib/tipos'
import { dataBR, diaMes, dinheiro, hojeISO, lerData, primeiroNome } from '../lib/formato'
import { abrirWhatsapp, mostrarTelefone } from '../lib/whatsapp'
import { Acoes, Avatar, Aviso, Botao, Campo, Linha, Secao, Topo, Vazio } from '../componentes'
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

function Lista({ abrir, nova }: { abrir: (id: string) => void; nova: () => void }) {
  const { clientes, vendas, parcelas } = useDados()
  const [busca, setBusca] = useState('')
  const termo = semAcento(busca)
  const filtradas = clientes.filter((c) => semAcento(c.nome).includes(termo) || c.whatsapp.includes(busca.trim()))
  const devendo = new Set(
    parcelas.filter((p) => !p.pago_em).map((p) => vendas.find((v) => v.id === p.venda_id)?.cliente_id),
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
            placeholder="Procurar pelo nome"
            aria-label="Procurar cliente"
          />
        </label>
      )}
      {clientes.length === 0 && (
        <Vazio titulo="Nenhuma cliente ainda">
          Cadastre a primeira em “Nova cliente”, ou traga sua lista de uma planilha em Minha conta.
        </Vazio>
      )}
      {clientes.length > 0 && filtradas.length === 0 && <Vazio titulo="Ninguém com esse nome" />}
      {filtradas.length > 0 && (
        <Secao>
          {filtradas.map((c) => (
            <Linha
              key={c.id}
              inicio={<Avatar nome={c.nome} />}
              titulo={c.nome}
              detalhe={
                <>
                  {c.whatsapp ? mostrarTelefone(c.whatsapp) : 'Sem WhatsApp'}
                  {devendo.has(c.id) && <span className="selo selo-atrasado">Tem valor a receber</span>}
                </>
              }
              onClick={() => abrir(c.id)}
            />
          ))}
        </Secao>
      )}
    </>
  )
}

function Ficha({ id, voltar, editar, vender }: { id: string; voltar: () => void; editar: () => void; vender: (id: string) => void }) {
  const { clientes, vendas, itens, parcelas, recarregar } = useDados()
  const [erro, setErro] = useState('')
  const c = clientes.find((x) => x.id === id)
  if (!c) return <Topo titulo="Cliente não encontrada" voltar={voltar} />

  const compras = vendas.filter((v) => v.cliente_id === id)
  const emAberto = parcelas
    .filter((p) => !p.pago_em && compras.some((v) => v.id === p.venda_id))
    .reduce((soma, p) => soma + p.valor, 0)

  async function receber(parcelaId: string) {
    setErro('')
    const { error } = await supabase.from('parcelas').update({ pago_em: hojeISO() }).eq('id', parcelaId)
    if (error) setErro('Não foi possível salvar. Confira a internet e tente de novo.')
    await recarregar()
  }

  return (
    <>
      <button type="button" className="topo-voltar" onClick={voltar}>
        <IconeVoltar /> Clientes
      </button>
      <header className="ficha-topo">
        <Avatar nome={c.nome} />
        <div>
          <h1>{c.nome}</h1>
          {c.whatsapp && <p className="topo-sub">{mostrarTelefone(c.whatsapp)}</p>}
        </div>
      </header>
      {erro && <Aviso>{erro}</Aviso>}

      {emAberto > 0 && (
        <div className="destaque-receber">
          <span>Falta receber</span>
          <strong>{dinheiro(emAberto)}</strong>
        </div>
      )}

      <Acoes>
        {c.whatsapp && (
          <Botao
            variante="whatsapp"
            icone={<IconeWhatsapp />}
            onClick={() => abrirWhatsapp(c.whatsapp, `Oi ${primeiroNome(c.nome)}, tudo bem?`)}
          >
            WhatsApp
          </Botao>
        )}
        <Botao icone={<IconeVender />} onClick={() => vender(c.id)}>
          Nova venda
        </Botao>
      </Acoes>

      {(c.aniversario || c.observacao) && (
        <Secao>
          {c.aniversario && <Linha inicio={<IconeBolo />} titulo="Aniversário" fim={diaMes(c.aniversario)} />}
          {c.observacao && <Linha inicio={<IconeEditar />} titulo={c.observacao} />}
        </Secao>
      )}

      <Secao titulo="Compras">
        {compras.length === 0 && <p className="painel-vazio">Nenhuma compra ainda.</p>}
        {compras.map((v) => (
          <div className="compra" key={v.id}>
            <div className="compra-topo">
              <span>{dataBR(v.data)}</span>
              <strong>{dinheiro(v.total)}</strong>
            </div>
            {itens.some((i) => i.venda_id === v.id) && (
              <p className="compra-itens">{descreverItens(itens.filter((i) => i.venda_id === v.id))}</p>
            )}
            {parcelas
              .filter((p) => p.venda_id === v.id)
              .map((p) => (
                <div className={`parcela ${p.pago_em ? 'parcela-paga' : ''}`} key={p.id}>
                  <span>
                    {p.de > 1 ? `${p.numero}ª de ${p.de}, ` : ''}
                    {dinheiro(p.valor)}
                    <small>{p.pago_em ? `Pago em ${diaMes(p.pago_em)}` : `Vence ${diaMes(p.vencimento)}`}</small>
                  </span>
                  {p.pago_em ? (
                    <IconeCheck className="parcela-ok" />
                  ) : (
                    <button type="button" className="botao-pequeno" onClick={() => receber(p.id)}>
                      Recebi
                    </button>
                  )}
                </div>
              ))}
          </div>
        ))}
      </Secao>

      <Botao variante="secundario" icone={<IconeEditar />} onClick={editar}>
        Editar dados
      </Botao>
    </>
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
  const [whatsapp, setWhatsapp] = useState(atual?.whatsapp ?? '')
  const [aniversario, setAniversario] = useState(atual?.aniversario ? aniversarioTexto(atual.aniversario) : '')
  const [observacao, setObservacao] = useState(atual?.observacao ?? '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
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
      <form className="formulario" onSubmit={salvar}>
        <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus={!id} />
        <Campo
          rotulo="WhatsApp"
          type="tel"
          inputMode="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="(11) 98765-4321"
        />
        <Campo
          rotulo="Aniversário (dia/mês)"
          inputMode="numeric"
          value={aniversario}
          onChange={(e) => setAniversario(mascaraData(e.target.value))}
          placeholder="25/12"
        />
        <Campo rotulo="Anotação" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: prefere chá de ervas" />
        {erro && <Aviso>{erro}</Aviso>}
        <Botao type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
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

/** Coloca a barra sozinha: "2512" vira "25/12". */
function mascaraData(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

function semAcento(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function descreverItens(itens: VendaItem[]): string {
  return itens.map((i) => (i.quantidade > 1 ? `${i.quantidade}x ${i.nome}` : i.nome)).join(', ')
}
