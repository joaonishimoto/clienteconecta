import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useDados } from '../lib/dados'
import type { Aba } from '../App'
import {
  dataBR,
  dinheiro,
  hojeISO,
  lerData,
  lerDinheiro,
  mascaraData,
  mascaraTelefone,
  primeiroNome,
  semAcento,
  somarDias,
  somarMeses,
} from '../lib/formato'
import { abrirWhatsapp } from '../lib/whatsapp'
import { Avatar, Aviso, Botao, Campo, Linha, Secao, Topo, Vazio } from '../componentes'
import { IconeBusca, IconeCheck, IconeMais, IconeMenos, IconeWhatsapp } from '../icones'

type ItemVenda = { produtoId: string | null; nome: string; preco: number; quantidade: number; recompraDias: number | null }

const VEZES = Array.from({ length: 12 }, (_, i) => i + 1)

export function Vender({ clienteInicial, irPara }: { clienteInicial: string | null; irPara: (a: Aba) => void }) {
  const { clientes, produtos, vendas, itens: itensSalvos, recarregar } = useDados()
  const [clienteId, setClienteId] = useState<string | null>(clienteInicial)
  const [busca, setBusca] = useState('')
  const [buscaProduto, setBuscaProduto] = useState('')
  const [linhas, setLinhas] = useState<ItemVenda[]>([])
  const [avulso, setAvulso] = useState({ nome: '', preco: '' })
  const [vezes, setVezes] = useState(1)
  const [primeiroVencimento, setPrimeiroVencimento] = useState(dataBR(hojeISO()))
  const [recebiPrimeira, setRecebiPrimeira] = useState(true)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [concluida, setConcluida] = useState<{ total: number; vezes: number } | null>(null)
  const [vendoResumo, setVendoResumo] = useState(false)

  // A barra fixa some quando o resumo já está na tela, para não mostrar o total duas vezes.
  const temItens = linhas.length > 0
  useEffect(() => {
    const resumo = document.getElementById('resumo-venda')
    if (!resumo || !('IntersectionObserver' in window)) return
    const o = new IntersectionObserver(([e]) => setVendoResumo(e.isIntersecting))
    o.observe(resumo)
    return () => o.disconnect()
  }, [temItens, clienteId])

  const cliente = clientes.find((c) => c.id === clienteId)
  const total = linhas.reduce((s, l) => s + l.preco * l.quantidade, 0)
  const pecas = linhas.reduce((s, l) => s + l.quantidade, 0)

  if (concluida && cliente) {
    const lista = linhas.map((l) => `• ${l.quantidade}x ${l.nome}`).join('\n')
    const recibo =
      `Oi ${primeiroNome(cliente.nome)}! Obrigada pela compra.\n${lista}\n` +
      `Total: ${dinheiro(concluida.total)}` +
      (concluida.vezes > 1 ? ` em ${concluida.vezes}x de ${dinheiro(concluida.total / concluida.vezes)}` : '')
    return (
      <div className="concluida">
        <span className="concluida-icone">
          <IconeCheck />
        </span>
        <h1>Venda salva</h1>
        <p className="topo-sub">
          {dinheiro(concluida.total)} para {cliente.nome}
          {concluida.vezes > 1 ? `, em ${concluida.vezes} vezes` : ''}
        </p>
        <Botao variante="whatsapp" icone={<IconeWhatsapp />} onClick={() => abrirWhatsapp(cliente.whatsapp, recibo)}>
          Mandar recibo no WhatsApp
        </Botao>
        <Botao variante="secundario" onClick={() => irPara('vender')}>
          Fazer outra venda
        </Botao>
        <Botao variante="leve" onClick={() => irPara('hoje')}>
          Voltar para Hoje
        </Botao>
      </div>
    )
  }

  // Passo 1: escolher a cliente (ou cadastrar ali mesmo).
  if (!cliente) return <EscolherCliente busca={busca} setBusca={setBusca} escolher={setClienteId} />

  const adicionar = (l: Omit<ItemVenda, 'quantidade'>) =>
    setLinhas((atual) => {
      const i = l.produtoId ? atual.findIndex((x) => x.produtoId === l.produtoId) : -1
      if (i < 0) return [...atual, { ...l, quantidade: 1 }]
      return atual.map((x, j) => (j === i ? { ...x, quantidade: x.quantidade + 1 } : x))
    })

  const mudarQuantidade = (i: number, delta: number) =>
    setLinhas((atual) =>
      atual.map((x, j) => (j === i ? { ...x, quantidade: x.quantidade + delta } : x)).filter((x) => x.quantidade > 0),
    )

  async function salvar() {
    if (!cliente) return
    setErro('')
    const venc = lerData(primeiroVencimento)
    if (!venc) return setErro('Escreva a data do 1º pagamento assim: 25/12/2026')
    setSalvando(true)
    try {
      const hoje = hojeISO()
      const venda = await supabase.from('vendas').insert({ cliente_id: cliente.id, data: hoje, total }).select('id').single()
      if (venda.error) throw venda.error

      const r1 = await supabase.from('venda_itens').insert(
        linhas.map((l) => ({
          venda_id: venda.data.id,
          produto_id: l.produtoId,
          nome: l.nome,
          quantidade: l.quantidade,
          preco: l.preco,
          recompra_em: l.recompraDias ? somarDias(hoje, l.recompraDias) : null,
        })),
      )
      if (r1.error) throw r1.error

      // Centavos que sobram da divisão vão na primeira parcela.
      const centavos = Math.round(total * 100)
      const base = Math.floor(centavos / vezes)
      const r2 = await supabase.from('parcelas').insert(
        Array.from({ length: vezes }, (_, i) => ({
          venda_id: venda.data.id,
          numero: i + 1,
          de: vezes,
          valor: (base + (i === 0 ? centavos - base * vezes : 0)) / 100,
          vencimento: somarMeses(venc, i),
          pago_em: i === 0 && recebiPrimeira ? hoje : null,
        })),
      )
      if (r2.error) throw r2.error

      // Ela comprou de novo: os avisos de recompra antigos desses produtos não valem mais.
      const vendasDela = new Set(vendas.filter((v) => v.cliente_id === cliente.id).map((v) => v.id))
      const antigos = itensSalvos
        .filter(
          (i) =>
            !i.recompra_avisada && vendasDela.has(i.venda_id) && linhas.some((l) => l.produtoId && l.produtoId === i.produto_id),
        )
        .map((i) => i.id)
      if (antigos.length) await supabase.from('venda_itens').update({ recompra_avisada: true }).in('id', antigos)

      await recarregar()
      setConcluida({ total, vezes })
    } catch {
      setErro('Não foi possível salvar a venda. Confira a internet e tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  const quantidadeDe = (id: string) => linhas.find((l) => l.produtoId === id)?.quantidade ?? 0
  const termoProduto = semAcento(buscaProduto)
  const produtosVistos = produtos.filter((p) => semAcento(p.nome).includes(termoProduto))
  const irParaResumo = () => document.getElementById('resumo-venda')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <>
      <Topo
        titulo={`Venda para ${primeiroNome(cliente.nome)}`}
        subtitulo="Toque nos produtos que ela levou. Cada toque soma mais um."
        voltar={() => {
          setClienteId(null)
          setLinhas([])
        }}
      />

      {/* No computador, o resumo e o pagamento ficam ao lado dos produtos. */}
      <div className="venda-colunas">
        <div className="venda-produtos">
          {produtos.length > 8 && (
            <label className="busca">
              <IconeBusca />
              <input
                type="search"
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                placeholder="Procurar produto"
                aria-label="Procurar produto"
              />
            </label>
          )}
          {produtos.length === 0 && (
            <Vazio titulo="Catálogo vazio">Cadastre produtos no Catálogo, ou digite o produto logo abaixo.</Vazio>
          )}
          {produtos.length > 0 && produtosVistos.length === 0 && <Vazio titulo="Nenhum produto com esse nome" />}
          <div className="grade-produtos">
            {produtosVistos.map((p) => {
              const qtd = quantidadeDe(p.id)
              return (
                <button
                  type="button"
                  key={p.id}
                  className={`produto-botao ${qtd ? 'produto-escolhido' : ''}`}
                  onClick={() => adicionar({ produtoId: p.id, nome: p.nome, preco: p.preco, recompraDias: p.recompra_dias })}
                  aria-label={qtd ? `${p.nome}, ${qtd} na venda. Tocar para somar mais um` : `Adicionar ${p.nome}`}
                >
                  {p.foto_url ? <img src={p.foto_url} alt="" /> : <span className="produto-sem-foto">{p.nome.charAt(0)}</span>}
                  <span className="produto-nome">{p.nome}</span>
                  <span className="produto-preco">{dinheiro(p.preco)}</span>
                  {qtd > 0 ? (
                    <span className="produto-qtd">{qtd}</span>
                  ) : (
                    <span className="produto-somar" aria-hidden>
                      <IconeMais />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <details className="avulso">
            <summary>
              <IconeMais /> Produto fora do catálogo
            </summary>
            <div className="avulso-campos">
              <Campo rotulo="Nome" value={avulso.nome} onChange={(e) => setAvulso({ ...avulso, nome: e.target.value })} />
              <Campo
                rotulo="Preço"
                inputMode="decimal"
                value={avulso.preco}
                onChange={(e) => setAvulso({ ...avulso, preco: e.target.value })}
                placeholder="49,90"
              />
              <Botao
                variante="secundario"
                disabled={!avulso.nome.trim() || lerDinheiro(avulso.preco) <= 0}
                onClick={() => {
                  adicionar({ produtoId: null, nome: avulso.nome.trim(), preco: lerDinheiro(avulso.preco), recompraDias: null })
                  setAvulso({ nome: '', preco: '' })
                }}
              >
                Adicionar à venda
              </Botao>
            </div>
          </details>
        </div>

        {linhas.length === 0 ? (
          <div className="venda-resumo venda-resumo-vazio">
            <Vazio titulo="Nenhum produto ainda">Toque nos produtos ao lado. O total e o pagamento aparecem aqui.</Vazio>
          </div>
        ) : (
          <div className="venda-resumo" id="resumo-venda">
            <Secao titulo="Resumo">
              {linhas.map((l, i) => (
                <div className="linha-venda" key={i}>
                  <span className="linha-texto">
                    <span className="linha-titulo">{l.nome}</span>
                    <span className="linha-detalhe">
                      {l.quantidade > 1 ? `${l.quantidade} x ${dinheiro(l.preco)} = ` : ''}
                      {dinheiro(l.preco * l.quantidade)}
                    </span>
                  </span>
                  <span className="quantidade">
                    <button type="button" onClick={() => mudarQuantidade(i, -1)} aria-label={`Tirar um ${l.nome}`}>
                      <IconeMenos />
                    </button>
                    <strong aria-live="polite">{l.quantidade}</strong>
                    <button type="button" onClick={() => mudarQuantidade(i, 1)} aria-label={`Mais um ${l.nome}`}>
                      <IconeMais />
                    </button>
                  </span>
                </div>
              ))}
              <div className="total">
                <span>Total</span>
                <strong>{dinheiro(total)}</strong>
              </div>
            </Secao>

            <section className="secao">
              <h2>Como ela vai pagar?</h2>
              <div className="vezes" role="radiogroup" aria-label="Número de parcelas">
                {VEZES.map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={vezes === n} onClick={() => setVezes(n)}>
                    {n === 1 ? 'À vista' : `${n}x`}
                  </button>
                ))}
              </div>
              <p className="vezes-valor">
                {vezes === 1 ? (
                  <>
                    À vista: <strong>{dinheiro(total)}</strong>
                  </>
                ) : (
                  <>
                    {vezes} parcelas de <strong>{dinheiro(total / vezes)}</strong>
                  </>
                )}
              </p>
              <div className="formulario">
                <Campo
                  rotulo={vezes === 1 ? 'Data do pagamento' : 'Data da 1ª parcela'}
                  inputMode="numeric"
                  value={primeiroVencimento}
                  onChange={(e) => setPrimeiroVencimento(mascaraData(e.target.value))}
                  placeholder="25/12/2026"
                  dica={vezes > 1 ? 'As outras parcelas vencem no mesmo dia dos meses seguintes.' : undefined}
                />
                <label className="checkbox">
                  <input type="checkbox" checked={recebiPrimeira} onChange={(e) => setRecebiPrimeira(e.target.checked)} />
                  {vezes === 1 ? 'Já recebi o pagamento' : 'Já recebi a 1ª parcela'}
                </label>
              </div>
            </section>

            {erro && <Aviso>{erro}</Aviso>}
            <Botao onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando…' : `Salvar venda de ${dinheiro(total)}`}
            </Botao>
          </div>
        )}
      </div>

      {/* No celular, uma barra fixa mostra o total e leva ao pagamento sem precisar rolar. */}
      {linhas.length > 0 && !vendoResumo && (
        <div className="venda-barra">
          <span>
            {pecas} {pecas === 1 ? 'item' : 'itens'}
            <strong>{dinheiro(total)}</strong>
          </span>
          <button type="button" className="botao botao-principal" onClick={irParaResumo}>
            <span>Continuar</span>
          </button>
        </div>
      )}
    </>
  )
}

/** Passo 1: lista de clientes com as que compraram por último no topo, e cadastro rápido ali mesmo. */
function EscolherCliente({
  busca,
  setBusca,
  escolher,
}: {
  busca: string
  setBusca: (b: string) => void
  escolher: (id: string) => void
}) {
  const { clientes, vendas, recarregar } = useDados()
  const [nova, setNova] = useState({ nome: '', whatsapp: '' })
  const [cadastrando, setCadastrando] = useState(false)
  const [erro, setErro] = useState('')

  const termo = semAcento(busca)
  const lista = clientes.filter((c) => semAcento(c.nome).includes(termo))
  // As vendas já vêm da mais nova para a mais antiga.
  const recentes = [...new Set(vendas.map((v) => v.cliente_id))]
    .map((id) => clientes.find((c) => c.id === id))
    .filter((c) => c !== undefined)
    .slice(0, 3)
  const mostrarRecentes = !termo && clientes.length > 5 && recentes.length > 0
  // Se ela procurou um nome que não existe, o cadastro já começa com esse nome.
  const nomeNovo = nova.nome || (lista.length === 0 ? busca : '')

  async function cadastrar() {
    setErro('')
    setCadastrando(true)
    const r = await supabase
      .from('clientes')
      .insert({ nome: nomeNovo.trim(), whatsapp: nova.whatsapp.trim(), aniversario: null, observacao: '' })
      .select('id')
      .single()
    setCadastrando(false)
    if (r.error) return setErro('Não foi possível cadastrar. Confira a internet e tente de novo.')
    await recarregar()
    escolher(r.data.id)
  }

  return (
    <>
      <Topo titulo="Nova venda" subtitulo="Para quem é a venda?" />
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

      {mostrarRecentes && (
        <Secao titulo="Compraram por último">
          {recentes.map((c) => (
            <Linha key={c.id} inicio={<Avatar nome={c.nome} />} titulo={c.nome} onClick={() => escolher(c.id)} />
          ))}
        </Secao>
      )}

      {clientes.length > 0 && lista.length === 0 && <Vazio titulo="Ninguém com esse nome">Cadastre logo abaixo.</Vazio>}
      {lista.length > 0 && (
        <Secao titulo={mostrarRecentes ? 'Todas as clientes' : undefined}>
          {lista.map((c) => (
            <Linha key={c.id} inicio={<Avatar nome={c.nome} />} titulo={c.nome} onClick={() => escolher(c.id)} />
          ))}
        </Secao>
      )}

      <details className="avulso" open={clientes.length === 0 || (termo !== '' && lista.length === 0)}>
        <summary>
          <IconeMais /> Cliente nova? Cadastrar agora
        </summary>
        <div className="avulso-campos">
          <Campo
            rotulo="Nome"
            value={nomeNovo}
            onChange={(e) => setNova({ ...nova, nome: e.target.value })}
            autoCapitalize="words"
            placeholder="Ex.: Ana Lúcia Ferreira"
          />
          <Campo
            rotulo="WhatsApp"
            type="tel"
            inputMode="tel"
            value={nova.whatsapp}
            onChange={(e) => setNova({ ...nova, whatsapp: mascaraTelefone(e.target.value) })}
            placeholder="(11) 98765-4321"
          />
          {erro && <Aviso>{erro}</Aviso>}
          <Botao variante="secundario" disabled={!nomeNovo.trim() || cadastrando} onClick={cadastrar}>
            {cadastrando ? 'Cadastrando…' : 'Cadastrar e continuar a venda'}
          </Botao>
        </div>
      </details>
    </>
  )
}
