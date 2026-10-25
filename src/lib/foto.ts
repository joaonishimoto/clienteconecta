import { supabase } from './supabase'

/** Diminui a foto para no máximo 800px (economiza internet e espaço) e envia para o Supabase. */
export async function enviarFoto(arquivo: File, userId: string): Promise<string> {
  const imagem = await createImageBitmap(arquivo)
  const escala = Math.min(1, 800 / Math.max(imagem.width, imagem.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(imagem.width * escala)
  canvas.height = Math.round(imagem.height * escala)
  canvas.getContext('2d')!.drawImage(imagem, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob>((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error('foto'))), 'image/jpeg', 0.8),
  )
  const caminho = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('fotos').upload(caminho, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return supabase.storage.from('fotos').getPublicUrl(caminho).data.publicUrl
}
