import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useDados } from '../lib/dados'
import { baixar, clientesParaCsv, lerArquivo, lerClientes, lerProdutos, produtosParaCsv } from '../lib/planilha'
import { hojeISO } from '../lib/formato'
import { Aviso, Botao, Campo, Topo } from '../componentes'
import { IconeBaixar, IconeSair, IconeSubir } from '../icones'
import { IndiqueEGanhe, MinhaAssinatura } from './Assinatura'

export function Conta({ userId, fechar }: { userId: string; fechar: () => void }) {
  const { perfil, clientes, produtos, recarregar } = useDados()
  const [nome, setNome] = useState(perfil?.nome ?? '')
  const [empresa, setEmpresa] = useState(perfil?.empresa ?? '')
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('perfis').upsert({ id: userId, nome: nome.trim(), empresa: empresa.trim() })
    setAviso(error ? { tipo: 'erro', texto: 'Não foi possível salvar.' } : { tipo: 'ok', texto: 'Dados salvos!' })
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
      setAviso({ tipo: 'erro', texto: 'Não foi possível ler essa planilha. Use um arquivo .xlsx ou .csv.' })
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
        <Botao type="submit">Salvar dados</Botao>
      </form>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <MinhaAssinatura />
      <IndiqueEGanhe />

      <section className="secao">
        <h2>Planilhas</h2>
        <p className="secao-texto">Traga sua lista do Excel ou guarde uma cópia dos seus dados.</p>
        <div className="painel painel-acoes">
          <ArquivoBotao rotulo="Trazer clientes de planilha" escolher={(f) => importar('clientes', f)} />
          <ArquivoBotao rotulo="Trazer produtos de planilha" escolher={(f) => importar('produtos', f)} />
          <button type="button" className="painel-acao" onClick={() => baixar(`clientes-${hojeISO()}.csv`, clientesParaCsv(clientes))}>
            <IconeBaixar /> Baixar clientes
          </button>
          <button type="button" className="painel-acao" onClick={() => baixar(`produtos-${hojeISO()}.csv`, produtosParaCsv(produtos))}>
            <IconeBaixar /> Baixar produtos
          </button>
        </div>
        <p className="campo-dica">
          A planilha precisa de uma coluna “nome”. Para clientes também valem whatsapp, aniversario e observacao; para
          produtos, preco, recompra_dias e descricao. O jeito mais fácil é baixar uma planilha e usar como modelo.
        </p>
      </section>

      <Botao variante="perigo" icone={<IconeSair />} onClick={() => supabase.auth.signOut()}>
        Sair do app
      </Botao>
    </>
  )
}

function ArquivoBotao({ rotulo, escolher }: { rotulo: string; escolher: (f: File | undefined) => void }) {
  return (
    <label className="painel-acao">
      <IconeSubir /> {rotulo}
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
