import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useDados } from '../lib/dados'
import { baixar, clientesParaCsv, lerArquivo, lerClientes, lerProdutos, produtosParaCsv } from '../lib/planilha'
import { hojeISO } from '../lib/formato'
import { Aviso, Botao, Campo, Topo } from '../componentes'

export function Conta({ userId, fechar }: { userId: string; fechar: () => void }) {
  const { perfil, clientes, produtos, recarregar } = useDados()
  const [nome, setNome] = useState(perfil?.nome ?? '')
  const [empresa, setEmpresa] = useState(perfil?.empresa ?? '')
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('perfis').upsert({ id: userId, nome: nome.trim(), empresa: empresa.trim() })
    setAviso(error ? { tipo: 'erro', texto: 'Não consegui salvar.' } : { tipo: 'ok', texto: 'Dados salvos!' })
    await recarregar()
  }

  async function importar(tipo: 'clientes' | 'produtos', arquivo: File | undefined) {
    if (!arquivo) return
    setAviso(null)
    try {
      const texto = await lerArquivo(arquivo)
      const linhas = tipo === 'clientes' ? lerClientes(texto) : lerProdutos(texto)
      if (!linhas.length) {
        return setAviso({ tipo: 'erro', texto: 'Não achei nenhuma linha. A planilha precisa ter uma coluna "nome".' })
      }
      // Não duplica: pula quem já existe com o mesmo nome.
      const existentes = new Set((tipo === 'clientes' ? clientes : produtos).map((x) => x.nome.toLowerCase()))
      const novas = linhas.filter((l) => !existentes.has(l.nome.toLowerCase()))
      if (novas.length) {
        const { error } = await supabase.from(tipo).insert(novas)
        if (error) throw error
      }
      await recarregar()
      const pulados = linhas.length - novas.length
      setAviso({
        tipo: 'ok',
        texto: `${novas.length} ${tipo} importados.` + (pulados ? ` ${pulados} já existiam e foram pulados.` : ''),
      })
    } catch {
      setAviso({ tipo: 'erro', texto: 'Não consegui ler essa planilha. Use um arquivo .xlsx ou .csv.' })
    }
  }

  return (
    <>
      <Topo titulo="Minha conta" voltar={fechar} />

      <form className="formulario" onSubmit={salvar}>
        <Campo rotulo="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Campo
          rotulo="Marca que você revende"
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          placeholder="Ex.: Timol"
          dica="Aparece no topo do app."
        />
        <Botao type="submit">Salvar</Botao>
      </form>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <h2>Planilhas</h2>
      <p className="subtitulo">Traga sua lista do Excel ou guarde uma cópia dos seus dados.</p>
      <Botao variante="secundario" onClick={() => baixar(`clientes-${hojeISO()}.csv`, clientesParaCsv(clientes))}>
        ⬇️ Baixar clientes
      </Botao>
      <Botao variante="secundario" onClick={() => baixar(`produtos-${hojeISO()}.csv`, produtosParaCsv(produtos))}>
        ⬇️ Baixar produtos
      </Botao>
      <ArquivoBotao rotulo="⬆️ Trazer clientes de planilha" escolher={(f) => importar('clientes', f)} />
      <ArquivoBotao rotulo="⬆️ Trazer produtos de planilha" escolher={(f) => importar('produtos', f)} />
      <p className="campo-dica">
        Colunas de clientes: nome, whatsapp, aniversario, observacao. Colunas de produtos: nome, preco, recompra_dias,
        descricao. Dica: baixe a planilha primeiro e use como modelo.
      </p>

      <h2>Sair</h2>
      <Botao variante="perigo" onClick={() => supabase.auth.signOut()}>
        Sair do app
      </Botao>
    </>
  )
}

function ArquivoBotao({ rotulo, escolher }: { rotulo: string; escolher: (f: File | undefined) => void }) {
  return (
    <label className="botao botao-secundario">
      {rotulo}
      <input
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(e) => {
          escolher(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </label>
  )
}
