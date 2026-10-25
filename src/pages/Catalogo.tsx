import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useDados } from '../lib/dados'
import type { Produto } from '../lib/tipos'
import { dinheiro, lerDinheiro } from '../lib/formato'
import { enviarFoto } from '../lib/foto'
import { abrirWhatsapp } from '../lib/whatsapp'
import { Aviso, Botao, Campo, Topo, Vazio } from '../componentes'
import { IconeCamera, IconeLixo, IconeMais, IconeWhatsapp } from '../icones'

const RECOMPRA = [
  { dias: 0, nome: 'Não lembrar' },
  { dias: 30, nome: 'Depois de 1 mês' },
  { dias: 60, nome: 'Depois de 2 meses' },
  { dias: 90, nome: 'Depois de 3 meses' },
  { dias: 180, nome: 'Depois de 6 meses' },
  { dias: 365, nome: 'Depois de 1 ano' },
]

export function Catalogo({ userId }: { userId: string }) {
  const [editando, setEditando] = useState<string | 'novo' | null>(null)
  if (editando)
    return <FormProduto id={editando === 'novo' ? undefined : editando} userId={userId} voltar={() => setEditando(null)} />
  return <Lista editar={setEditando} />
}

function Lista({ editar }: { editar: (id: string) => void }) {
  const { produtos } = useDados()
  return (
    <>
      <Topo
        titulo="Catálogo"
        subtitulo={produtos.length ? `${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}` : undefined}
      />
      <Botao icone={<IconeMais />} onClick={() => editar('novo')}>
        Novo produto
      </Botao>
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
                  <span className="produto-miniatura produto-sem-foto">{p.nome.charAt(0)}</span>
                )}
                <span className="linha-texto">
                  <span className="linha-titulo">{p.nome}</span>
                  <span className="produto-preco">{dinheiro(p.preco)}</span>
                  {p.recompra_dias && <span className="linha-detalhe">Lembrar de repor em {p.recompra_dias} dias</span>}
                </span>
              </button>
              <button type="button" className="botao-redondo" onClick={() => compartilhar(p)} aria-label={`Enviar ${p.nome} no WhatsApp`}>
                <IconeWhatsapp />
              </button>
            </div>
          ))}
        </div>
      )}
      {produtos.length > 0 && <p className="campo-dica">Toque no produto para editar, ou no ícone verde para enviar.</p>}
    </>
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
  const { produtos, recarregar } = useDados()
  const atual = produtos.find((p) => p.id === id)
  const [nome, setNome] = useState(atual?.nome ?? '')
  const [preco, setPreco] = useState(atual ? atual.preco.toFixed(2).replace('.', ',') : '')
  const [descricao, setDescricao] = useState(atual?.descricao ?? '')
  const [recompra, setRecompra] = useState(atual?.recompra_dias ?? 0)
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
      recompra_dias: recompra || null,
    }
    const { error } = id
      ? await supabase.from('produtos').update(dados).eq('id', id)
      : await supabase.from('produtos').insert(dados)
    if (error) return setErro('Não foi possível salvar. Confira a internet e tente de novo.')
    await recarregar()
    voltar()
  }

  async function excluir() {
    if (!id || !confirm(`Apagar ${nome} do catálogo?`)) return
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) return setErro('Não foi possível apagar. Tente de novo.')
    await recarregar()
    voltar()
  }

  // Mantém a opção atual mesmo se veio de planilha com outro número de dias.
  const opcoes = RECOMPRA.some((r) => r.dias === recompra) ? RECOMPRA : [...RECOMPRA, { dias: recompra, nome: `Depois de ${recompra} dias` }]

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
        <label className="campo">
          <span className="campo-rotulo">Lembrar a cliente de comprar de novo</span>
          <select value={recompra} onChange={(e) => setRecompra(Number(e.target.value))}>
            {opcoes.map((r) => (
              <option key={r.dias} value={r.dias}>
                {r.nome}
              </option>
            ))}
          </select>
          <span className="campo-dica">Bom para refil, filtro, creme e chá.</span>
        </label>
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
