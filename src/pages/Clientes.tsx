import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useDados } from '../lib/dados'
import type { Cliente, VendaItem } from '../lib/tipos'
import { dataBR, diaMes, dinheiro, hojeISO, lerData, primeiroNome } from '../lib/formato'
import { abrirWhatsapp, mostrarTelefone } from '../lib/whatsapp'
import { Aviso, Botao, Campo, Cartao, Topo, Vazio } from '../componentes'

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
  const { clientes } = useDados()
  const [busca, setBusca] = useState('')
  const termo = semAcento(busca)
  const filtradas = clientes.filter((c) => semAcento(c.nome).includes(termo) || c.whatsapp.includes(busca.trim()))

  return (
    <>
      <Topo titulo="Clientes" />
      <Botao onClick={nova}>+ Nova cliente</Botao>
      {clientes.length > 5 && (
        <Campo rotulo="Procurar" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome" />
      )}
      {clientes.length === 0 && <Vazio>Você ainda não tem clientes. Toque em “+ Nova cliente” para começar.</Vazio>}
      {filtradas.map((c) => (
        <Cartao key={c.id} onClick={() => abrir(c.id)}>
          <h3>{c.nome}</h3>
          {c.whatsapp && <p>{mostrarTelefone(c.whatsapp)}</p>}
        </Cartao>
      ))}
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
    if (error) setErro('Não consegui salvar. Confira a internet e tente de novo.')
    await recarregar()
  }

  return (
    <>
      <Topo titulo={c.nome} voltar={voltar} />
      {erro && <Aviso>{erro}</Aviso>}
      <div className="cartao">
        {c.whatsapp && <p>📱 {mostrarTelefone(c.whatsapp)}</p>}
        {c.aniversario && <p>🎂 Aniversário: {diaMes(c.aniversario)}</p>}
        {c.observacao && <p>📝 {c.observacao}</p>}
        {emAberto > 0 && (
          <p className="atrasada">
            Falta receber: <strong>{dinheiro(emAberto)}</strong>
          </p>
        )}
      </div>
      {c.whatsapp && (
        <Botao variante="whatsapp" onClick={() => abrirWhatsapp(c.whatsapp, `Oi ${primeiroNome(c.nome)}, tudo bem?`)}>
          Chamar no WhatsApp
        </Botao>
      )}
      <Botao onClick={() => vender(c.id)}>🛒 Nova venda para ela</Botao>
      <Botao variante="secundario" onClick={editar}>
        ✏️ Editar dados
      </Botao>

      <h2>Compras</h2>
      {compras.length === 0 && <Vazio>Nenhuma compra ainda.</Vazio>}
      {compras.map((v) => (
        <div className="cartao" key={v.id}>
          <h3>
            {dataBR(v.data)} · {dinheiro(v.total)}
          </h3>
          {itens.some((i) => i.venda_id === v.id) && <p>{descreverItens(itens.filter((i) => i.venda_id === v.id))}</p>}
          {parcelas
            .filter((p) => p.venda_id === v.id)
            .map((p) => (
              <div className="parcela" key={p.id}>
                <span>
                  {p.de > 1 ? `${p.numero}/${p.de} · ` : ''}
                  {dinheiro(p.valor)} · {p.pago_em ? `pago em ${diaMes(p.pago_em)}` : `vence ${diaMes(p.vencimento)}`}
                </span>
                {!p.pago_em && (
                  <button type="button" className="botao-pequeno" onClick={() => receber(p.id)}>
                    ✓ Recebi
                  </button>
                )}
              </div>
            ))}
        </div>
      ))}
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
    if (r.error) return setErro('Não consegui salvar. Confira a internet e tente de novo.')
    await recarregar()
    salvo(r.data.id)
  }

  async function excluir() {
    if (!id || !confirm(`Apagar ${nome}? As compras dela também serão apagadas.`)) return
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) return setErro('Não consegui apagar. Tente de novo.')
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
          Salvar
        </Botao>
        {id && (
          <Botao variante="perigo" onClick={excluir}>
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
