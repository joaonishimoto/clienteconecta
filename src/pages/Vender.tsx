import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useDados } from '../lib/dados'
import type { Aba } from '../App'
import { dataBR, dinheiro, hojeISO, lerData, lerDinheiro, primeiroNome, somarDias, somarMeses } from '../lib/formato'
import { abrirWhatsapp } from '../lib/whatsapp'
import { Avatar, Aviso, Botao, Campo, Linha, Secao, Topo, Vazio } from '../componentes'
import { IconeBusca, IconeCheck, IconeMais, IconeMenos, IconeWhatsapp } from '../icones'

type ItemVenda = { produtoId: string | null; nome: string; preco: number; quantidade: number; recompraDias: number | null }

export function Vender({ clienteInicial, irPara }: { clienteInicial: string | null; irPara: (a: Aba) => void }) {
  const { clientes, produtos, vendas, itens: itensSalvos, recarregar } = useDados()
  const [clienteId, setClienteId] = useState<string | null>(clienteInicial)
  const [busca, setBusca] = useState('')
  const [linhas, setLinhas] = useState<ItemVenda[]>([])
  const [avulso, setAvulso] = useState({ nome: '', preco: '' })
  const [vezes, setVezes] = useState(1)
  const [primeiroVencimento, setPrimeiroVencimento] = useState(dataBR(hojeISO()))
  const [recebiPrimeira, setRecebiPrimeira] = useState(true)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [concluida, setConcluida] = useState<{ total: number; vezes: number } | null>(null)

  const cliente = clientes.find((c) => c.id === clienteId)
  const total = linhas.reduce((s, l) => s + l.preco * l.quantidade, 0)

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

  // Passo 1: escolher a cliente.
  if (!cliente) {
    const termo = busca.toLowerCase().trim()
    const lista = clientes.filter((c) => c.nome.toLowerCase().includes(termo))
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
        {clientes.length === 0 && (
          <Vazio titulo="Nenhuma cliente cadastrada">Cadastre a cliente na aba Clientes e volte aqui para vender.</Vazio>
        )}
        {lista.length > 0 && (
          <Secao>
            {lista.map((c) => (
              <Linha key={c.id} inicio={<Avatar nome={c.nome} />} titulo={c.nome} onClick={() => setClienteId(c.id)} />
            ))}
          </Secao>
        )}
      </>
    )
  }

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

  return (
    <>
      <Topo
        titulo={`Venda para ${primeiroNome(cliente.nome)}`}
        subtitulo="Toque nos produtos que ela levou."
        voltar={clienteInicial ? undefined : () => setClienteId(null)}
      />

      {produtos.length === 0 && (
        <Vazio titulo="Catálogo vazio">Cadastre produtos no Catálogo, ou digite o produto logo abaixo.</Vazio>
      )}
      <div className="grade-produtos">
        {produtos.map((p) => {
          const qtd = quantidadeDe(p.id)
          return (
            <button
              type="button"
              key={p.id}
              className={`produto-botao ${qtd ? 'produto-escolhido' : ''}`}
              onClick={() => adicionar({ produtoId: p.id, nome: p.nome, preco: p.preco, recompraDias: p.recompra_dias })}
            >
              {p.foto_url ? <img src={p.foto_url} alt="" /> : <span className="produto-sem-foto">{p.nome.charAt(0)}</span>}
              <span className="produto-nome">{p.nome}</span>
              <span className="produto-preco">{dinheiro(p.preco)}</span>
              {qtd > 0 && <span className="produto-qtd">{qtd}</span>}
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

      {linhas.length > 0 && (
        <>
          <Secao titulo="Resumo">
            {linhas.map((l, i) => (
              <div className="linha-venda" key={i}>
                <span className="linha-texto">
                  <span className="linha-titulo">{l.nome}</span>
                  <span className="linha-detalhe">{dinheiro(l.preco * l.quantidade)}</span>
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
            <h2>Pagamento</h2>
            <div className="formulario">
              <label className="campo">
                <span className="campo-rotulo">Forma</span>
                <select value={vezes} onChange={(e) => setVezes(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n === 1 ? 'À vista' : `${n}x de ${dinheiro(total / n)}`}
                    </option>
                  ))}
                </select>
              </label>
              <Campo
                rotulo={vezes === 1 ? 'Data do pagamento' : 'Data da 1ª parcela'}
                inputMode="numeric"
                value={primeiroVencimento}
                onChange={(e) => setPrimeiroVencimento(e.target.value)}
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
        </>
      )}
    </>
  )
}
