// Base visual dos PDFs: marca da Aline (logo, rosa, Playfair Display nos títulos e DM Sans no texto).
import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ReactNode } from 'react'
import logoUrl from '../assets/logo.png'
import dmRegular from '../assets/fonts/DMSans-Regular.ttf?url'
import dmItalic from '../assets/fonts/DMSans-Italic.ttf?url'
import dmMedium from '../assets/fonts/DMSans-Medium.ttf?url'
import dmBold from '../assets/fonts/DMSans-Bold.ttf?url'
import pfSemi from '../assets/fonts/PlayfairDisplay-SemiBold.ttf?url'
import pfBold from '../assets/fonts/PlayfairDisplay-Bold.ttf?url'
import pfItalic from '../assets/fonts/PlayfairDisplay-MediumItalic.ttf?url'
import type { Empresa } from '../data/tipos'
import { formatDoc } from '../lib/format'

Font.register({
  family: 'DM Sans',
  fonts: [
    { src: dmRegular, fontWeight: 400 },
    { src: dmItalic, fontWeight: 400, fontStyle: 'italic' },
    { src: dmMedium, fontWeight: 500 },
    { src: dmBold, fontWeight: 700 },
  ],
})
Font.register({
  family: 'Playfair Display',
  fonts: [
    { src: pfSemi, fontWeight: 600 },
    { src: pfBold, fontWeight: 700 },
    { src: pfItalic, fontWeight: 500, fontStyle: 'italic' },
  ],
})
// Sem hifenização automática: palavras inteiras, como num documento revisado.
Font.registerHyphenationCallback((palavra) => [palavra])

export const cor = {
  rosa: '#B24A77',
  deco: '#DA6F9A',
  rosaClaro: '#FFF8FA',
  rosaSuave: '#FBE3EC',
  borda: '#EFDCE4',
  tinta: '#222220',
  cinza: '#6E6166',
  creme: '#FEF7D9',
  verde: '#2F7A57',
  vermelho: '#B3261E',
}

export const s = StyleSheet.create({
  pagina: { paddingTop: 34, paddingBottom: 56, paddingHorizontal: 40, fontFamily: 'DM Sans', fontSize: 9, color: cor.tinta, lineHeight: 1.45 },
  cab: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 12, borderBottomWidth: 1.2, borderBottomColor: cor.deco },
  logo: { width: 112, height: 32, objectFit: 'contain' },
  cabEmpresa: { flex: 1, fontSize: 7.6, color: cor.cinza, lineHeight: 1.4 },
  cabEmpresaNome: { fontSize: 8.4, fontWeight: 700, color: cor.tinta },
  cabDoc: { width: 136, borderWidth: 0.8, borderColor: cor.borda, borderRadius: 6, padding: 8, alignItems: 'flex-end' },
  cabDocTipo: { fontSize: 6.8, fontWeight: 700, letterSpacing: 1.2, color: cor.rosa, textTransform: 'uppercase' },
  cabDocNum: { fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 12.5, lineHeight: 1.25, marginTop: 3 },
  cabDocData: { fontSize: 7.4, color: cor.cinza, marginTop: 3 },
  titulo: { marginTop: 18, marginBottom: 4 },
  eyebrow: { fontSize: 7, fontWeight: 700, letterSpacing: 1.6, color: cor.rosa, textTransform: 'uppercase' },
  h1: { fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 19, lineHeight: 1.2, marginTop: 3 },
  sub: { fontSize: 9, color: cor.cinza, marginTop: 3 },
  secao: { marginTop: 16 },
  secaoTit: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  secaoTxt: { fontSize: 7.2, fontWeight: 700, letterSpacing: 1.4, color: cor.rosa, textTransform: 'uppercase' },
  secaoLinha: { flex: 1, height: 0.8, backgroundColor: cor.borda },
  grade: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 7 },
  campo: { width: '50%', paddingRight: 10 },
  rotulo: { fontSize: 6.8, color: cor.cinza, textTransform: 'uppercase', letterSpacing: 0.8 },
  valor: { fontSize: 9.2, fontWeight: 500, marginTop: 1 },
  tabela: { borderWidth: 0.8, borderColor: cor.borda, borderRadius: 5, overflow: 'hidden' },
  tr: { flexDirection: 'row', borderTopWidth: 0.6, borderTopColor: cor.borda },
  th: { flexDirection: 'row', backgroundColor: cor.rosaClaro },
  thTxt: { fontSize: 6.8, fontWeight: 700, color: cor.cinza, textTransform: 'uppercase', letterSpacing: 0.6, paddingVertical: 5, paddingHorizontal: 6 },
  td: { fontSize: 8.4, paddingVertical: 5, paddingHorizontal: 6 },
  totalLinha: { flexDirection: 'row', borderTopWidth: 1.2, borderTopColor: cor.tinta, backgroundColor: cor.rosaClaro },
  kpis: { flexDirection: 'row', gap: 8, marginTop: 12 },
  kpi: { flex: 1, borderWidth: 0.8, borderColor: cor.borda, borderRadius: 6, padding: 9 },
  kpiDestaque: { backgroundColor: cor.rosaClaro, borderColor: cor.rosaSuave },
  kpiRot: { fontSize: 6.8, color: cor.cinza, textTransform: 'uppercase', letterSpacing: 0.6 },
  kpiVal: { fontSize: 13, fontWeight: 700, marginTop: 3 },
  kpiSub: { fontSize: 7, color: cor.cinza, marginTop: 2 },
  aviso: { flexDirection: 'row', gap: 6, backgroundColor: cor.creme, borderRadius: 6, padding: 9, marginTop: 12, fontSize: 8.4 },
  rodape: { position: 'absolute', bottom: 22, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.8, color: cor.cinza, borderTopWidth: 0.6, borderTopColor: cor.borda, paddingTop: 6 },
  b: { fontWeight: 700 },
  i: { fontStyle: 'italic' },
  num: { textAlign: 'right' },
})

export interface CabecalhoProps {
  empresa: Partial<Empresa>
  tipo: string
  numero?: string
  data: string
}

export function Cabecalho({ empresa, tipo, numero, data }: CabecalhoProps) {
  const linhas = [
    empresa.cnpj ? `CNPJ ${formatDoc(empresa.cnpj)}` : null,
    empresa.telefones,
    empresa.email_contato,
    empresa.endereco,
  ].filter(Boolean)
  return (
    <View style={s.cab}>
      <Image src={logoUrl} style={s.logo} />
      <View style={s.cabEmpresa}>
        {empresa.razao_social ? <Text style={s.cabEmpresaNome}>{empresa.razao_social}</Text> : null}
        <Text style={s.cabEmpresaNome}>{empresa.nome ?? 'Aline Antunes Decora'}</Text>
        {linhas.map((l) => <Text key={l}>{l}</Text>)}
      </View>
      <View style={s.cabDoc}>
        <Text style={s.cabDocTipo}>{tipo}</Text>
        {numero ? <Text style={s.cabDocNum}>{numero}</Text> : null}
        <Text style={s.cabDocData}>{data}</Text>
      </View>
    </View>
  )
}

export function Titulo({ eyebrow, titulo, sub }: { eyebrow?: string; titulo: string; sub?: string }) {
  return (
    <View style={s.titulo}>
      {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
      <Text style={s.h1}>{titulo}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  )
}

export function Secao({ titulo, children, quebra = true }: { titulo: string; children: ReactNode; quebra?: boolean }) {
  return (
    <View style={s.secao} wrap={quebra}>
      <View style={s.secaoTit} minPresenceAhead={40}>
        <Text style={s.secaoTxt}>{titulo}</Text>
        <View style={s.secaoLinha} />
      </View>
      {children}
    </View>
  )
}

export function Campo({ rotulo, valor, largura = '50%' }: { rotulo: string; valor?: string | null; largura?: string }) {
  return (
    <View style={[s.campo, { width: largura }]}>
      <Text style={s.rotulo}>{rotulo}</Text>
      <Text style={s.valor}>{valor || '—'}</Text>
    </View>
  )
}

export interface ColunaPdf {
  titulo: string
  largura: string
  num?: boolean
}

export function Tabela({ colunas, linhas, total }: { colunas: ColunaPdf[]; linhas: (string | ReactNode)[][]; total?: (string | null)[] }) {
  return (
    <View style={s.tabela}>
      <View style={s.th}>
        {colunas.map((c) => (
          <Text key={c.titulo} style={[s.thTxt, { width: c.largura }, c.num ? s.num : {}]}>{c.titulo}</Text>
        ))}
      </View>
      {linhas.map((l, i) => (
        <View key={i} style={s.tr} wrap={false}>
          {l.map((v, j) => (
            <View key={j} style={{ width: colunas[j].largura }}>
              {typeof v === 'string' ? <Text style={[s.td, colunas[j].num ? s.num : {}]}>{v}</Text> : v}
            </View>
          ))}
        </View>
      ))}
      {total ? (
        <View style={s.totalLinha} wrap={false}>
          {total.map((v, j) => (
            <Text key={j} style={[s.td, s.b, { width: colunas[j].largura }, colunas[j].num ? s.num : {}]}>{v ?? ''}</Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export function Kpi({ rotulo, valor, sub, destaque, corValor }: { rotulo: string; valor: string; sub?: string; destaque?: boolean; corValor?: string }) {
  return (
    <View style={[s.kpi, destaque ? s.kpiDestaque : {}]}>
      <Text style={s.kpiRot}>{rotulo}</Text>
      <Text style={[s.kpiVal, corValor ? { color: corValor } : {}]}>{valor}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
    </View>
  )
}

/** Texto com trechos em **negrito**. */
export function TextoRico({ texto, style }: { texto: string; style?: Parameters<typeof StyleSheet.create>[0][string] }) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  return (
    <Text style={style}>
      {partes.map((p, i) => (p.startsWith('**') ? <Text key={i} style={s.b}>{p.slice(2, -2)}</Text> : p))}
    </Text>
  )
}

export function Documento({ titulo, rodape, children }: { titulo: string; rodape: string; children: ReactNode }) {
  return (
    <Document title={titulo} author="Aline Antunes Decora" creator="Sistema Aline Antunes Decora" producer="feito por Pedro Hoffman" language="pt-BR">
      <Page size="A4" style={s.pagina}>
        {children}
        <View style={s.rodape} fixed>
          <Text>{rodape}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
