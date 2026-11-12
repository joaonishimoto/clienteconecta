import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useDados } from '../lib/dados'
import type { Produto, ProdutoLembrete } from '../lib/tipos'
import { dinheiro, iniciais, lerDinheiro } from '../lib/formato'
import { enviarFoto } from '../lib/foto'
import { abrirWhatsapp } from '../lib/whatsapp'
import { Aviso, Botao, Campo, CampoTexto, Escolha, Topo, Vazio } from '../componentes'
import { IconeCamera, IconeLixo, IconeMais, IconeRepor, IconeWhatsapp } from '../icones'

const QUANDO = [
  { valor: 15, nome: 'Depois de 15 dias' },
  { valor: 30, nome: 'Depois de 1 mês' },
  { valor: 60, nome: 'Depois de 2 meses' },
  { valor: 90, nome: 'Depois de 3 meses' },
  { valor: 180, nome: 'Depois de 6 meses' },
  { valor: 365, nome: 'Depois de 1 ano' },
]

const quandoNome = (dias: number) => QUANDO.find((q) => q.valor === dias)?.nome ?? `Depois de ${dias} dias`

type LembreteForm = Pick<ProdutoLembrete, 'dias' | 'titulo' | 'descricao'> & { chave: number }
let proximaChave = 1

export function Catalogo({ userId }: { userId: string }) {
  const [editando, setEditando] = useState<string | 'novo' | null>(null)
  if (editando)
    return <FormProduto id={editando === 'novo' ? undefined : editando} userId={userId} voltar={() => setEditando(null)} />
  return <Lista editar={setEditando} />
}

function Lista({ editar }: { editar: (id: string) => void }) {
  const { produtos, produtoLembretes } = useDados()
  return (
    <>
      <Topo
        titulo="Catálogo"
        subtitulo={produtos.length ? `${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}` : undefined}
        acao={
          <Botao icone={<IconeMais />} onClick={() => editar('novo')}>
            Novo produto
          </Botao>
        }
      />
      {produtos.length === 0 && (
        <Vazio titulo="Nenhum produto ainda">Com o catálogo pronto, você vende mais rápido e manda fotos no WhatsApp.</Vazio>
      )}
      {produtos.length > 0 && (
        <div className="painel">
          {produtos.map((p) => (
            <div className="produto-linha" key={p.id}>
              <button type="button" className="produto-abrir" onClick={() => editar(p.id)}>
                {p.foto_url ? (
                  <img src={p.foto_url} alt="" className="produto-miniatura" />
                ) : (
                  <span className="produto-miniatura produto-sem-foto">{iniciais(p.nome)}</span>
                )}
                <span className="linha-texto">
                  <span className="linha-titulo">{p.nome}</span>
                  <span className="produto-preco">{dinheiro(p.preco)}</span>
                  <ResumoLembretes lembretes={produtoLembretes.filter((l) => l.produto_id === p.id)} />
                </span>
              </button>
              <button type="button" className="botao-whatsapp-icone" onClick={() => compartilhar(p)} aria-label={`Enviar ${p.nome} no WhatsApp`}>
                <IconeWhatsapp />
              </button>
            </div>
          ))}
        </div>
      )}
      {produtos.length > 0 && <p className="campo-dica">Toque no produto para editar, ou no ícone do WhatsApp para enviar à cliente.</p>}
    </>
  )
}

function ResumoLembretes({ lembretes }: { lembretes: ProdutoLembrete[] }) {
  if (!lembretes.length) return null
  return (
    <span className="linha-detalhe produto-lembretes">
      <IconeRepor />
      <span>
        {lembretes.length === 1
          ? `Lembrete: ${lembretes[0].titulo}`
          : `${lembretes.length} lembretes`}
      </span>
    </span>
  )
}

/** No celular, manda a foto junto (menu de compartilhar). Se não der, manda só o texto com o link da foto. */
async function compartilhar(p: Produto) {
  const texto = `*${p.nome}*\n${dinheiro(p.preco)}${p.descricao ? `\n${p.descricao}` : ''}`
  if (p.foto_url && navigator.canShare) {
    try {
      const blob = await (await fetch(p.foto_url)).blob()
      const arquivo = new File([blob], 'produto.jpg', { type: blob.type || 'image/jpeg' })
      if (navigator.canShare({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], text: texto })
        return
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  abrirWhatsapp('', p.foto_url ? `${texto}\n${p.foto_url}` : texto)
}

function FormProduto({ id, userId, voltar }: { id?: string; userId: string; voltar: () => void }) {
  const { produtos, produtoLembretes, recarregar } = useDados()
  const atual = produtos.find((p) => p.id === id)
  const [nome, setNome] = useState(atual?.nome ?? '')
  const [preco, setPreco] = useState(atual ? atual.preco.toFixed(2).replace('.', ',') : '')
  const [descricao, setDescricao] = useState(atual?.descricao ?? '')
  const [lembretes, setLembretes] = useState<LembreteForm[]>(() =>
    produtoLembretes
      .filter((l) => id && l.produto_id === id)
      .map((l) => ({ dias: l.dias, titulo: l.titulo, descricao: l.descricao, chave: proximaChave++ })),
  )
  const [foto, setFoto] = useState<string | null>(atual?.foto_url ?? null)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erro, setErro] = useState('')

  async function escolherFoto(arquivo: File | undefined) {
    if (!arquivo) return
    setErro('')
    setEnviandoFoto(true)
    try {
      setFoto(await enviarFoto(arquivo, userId))
    } catch {
      setErro('Não foi possível enviar a foto. Tente de novo.')
    } finally {
      setEnviandoFoto(false)
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const dados = {
      nome: nome.trim(),
      preco: lerDinheiro(preco),
      descricao: descricao.trim(),
      foto_url: foto,
    }
    const r = id
      ? await supabase.from('produtos').update(dados).eq('id', id).select('id').single()
      : await supabase.from('produtos').insert(dados).select('id').single()
    if (r.error) return setErro('Não foi possível salvar. Confira a internet e tente de novo.')

    // Os lembretes do produto são regravados juntos. Os que já nasceram de vendas não mudam.
    const produtoId = r.data.id
    const limpos = lembretes
      .map((l) => ({ produto_id: produtoId, dias: l.dias, titulo: l.titulo.trim(), descricao: l.descricao.trim() }))
      .filter((l) => l.titulo)
    const apagar = await supabase.from('produto_lembretes').delete().eq('produto_id', produtoId)
    const gravar = limpos.length && !apagar.error ? await supabase.from('produto_lembretes').insert(limpos) : null
    if (apagar.error || gravar?.error) {
      await recarregar()
      return setErro('O produto foi salvo, mas os lembretes não. Confira a internet e toque em Salvar de novo.')
    }
    await recarregar()
    voltar()
  }

  const mudarLembrete = (chave: number, mudanca: Partial<LembreteForm>) =>
    setLembretes((atual) => atual.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)))
  const novoLembrete = () =>
    setLembretes((atual) => [
      ...atual,
      { chave: proximaChave++, dias: 30, titulo: atual.length ? '' : 'Hora de repor', descricao: '' },
    ])

  async function excluir() {
    if (!id || !confirm(`Apagar ${nome} do catálogo?`)) return
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) return setErro('Não foi possível apagar. Tente de novo.')
    await recarregar()
    voltar()
  }

  return (
    <>
      <Topo titulo={id ? 'Editar produto' : 'Novo produto'} voltar={voltar} />
      <form className="formulario" onSubmit={salvar}>
        <label className="foto-campo">
          {foto ? <img src={foto} alt="" /> : <span className="foto-vazia"><IconeCamera /></span>}
          <span className="botao botao-secundario">{enviandoFoto ? 'Enviando…' : foto ? 'Trocar foto' : 'Colocar foto'}</span>
          <input type="file" accept="image/*" hidden onChange={(e) => escolherFoto(e.target.files?.[0])} />
        </label>
        <Campo rotulo="Nome do produto" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Campo rotulo="Preço" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="49,90" required />
        <Campo rotulo="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <fieldset className="lembretes">
          <legend className="campo-rotulo">Lembrar a cliente de comprar de novo</legend>
          <p className="campo-dica">
            Bom para refil, filtro, creme e chá. Depois de cada venda, o lembrete aparece na aba Hoje no dia certo.
          </p>
          {lembretes.map((l, i) => (
            <div className="lembrete-cartao" key={l.chave}>
              <div className="lembrete-topo">
                <span className="lembrete-numero">
                  <IconeRepor /> Lembrete {i + 1}
                </span>
                <button
                  type="button"
                  className="lembrete-tirar"
                  onClick={() => setLembretes((atual) => atual.filter((x) => x.chave !== l.chave))}
                >
                  <IconeLixo /> Tirar
                </button>
              </div>
              <Campo
                rotulo="Título"
                value={l.titulo}
                onChange={(e) => mudarLembrete(l.chave, { titulo: e.target.value })}
                placeholder="Ex.: Trocar o refil"
                required
              />
              <Escolha
                rotulo="Quando lembrar"
                opcoes={QUANDO.some((q) => q.valor === l.dias) ? QUANDO : [...QUANDO, { valor: l.dias, nome: quandoNome(l.dias) }]}
                valor={l.dias}
                mudar={(dias) => mudarLembrete(l.chave, { dias })}
              />
              <CampoTexto
                rotulo="Descrição (opcional)"
                value={l.descricao}
                onChange={(e) => mudarLembrete(l.chave, { descricao: e.target.value })}
                placeholder="Ex.: O refil dura 6 meses. Quer que eu separe um novo para você?"
                dica="Vai junto na mensagem do WhatsApp."
              />
            </div>
          ))}
          <Botao variante="secundario" icone={<IconeMais />} onClick={novoLembrete}>
            {lembretes.length ? 'Adicionar outro lembrete' : 'Adicionar lembrete'}
          </Botao>
        </fieldset>
        {erro && <Aviso>{erro}</Aviso>}
        <Botao type="submit" disabled={enviandoFoto}>
          Salvar
        </Botao>
        {id && (
          <Botao variante="perigo" icone={<IconeLixo />} onClick={excluir}>
            Apagar produto
          </Botao>
        )}
      </form>
    </>
  )
}
