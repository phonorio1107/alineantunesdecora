// Ponto de entrada dos PDFs. Carregado sob demanda (import dinâmico) para não pesar a abertura do sistema.
import { pdf } from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import { ContratoPdf, FechamentoPdf, FluxoPdf, ReciboPdf, ResumoEventoPdf } from './documentos'
import type { DocumentProps } from '@react-pdf/renderer'

type Props<T> = T extends (p: infer P) => unknown ? P : never

const gerar = (el: ReactElement) => pdf(el as ReactElement<DocumentProps>).toBlob()

export const pdfContrato = (p: Props<typeof ContratoPdf>) => gerar(createElement(ContratoPdf, p))
export const pdfRecibo = (p: Props<typeof ReciboPdf>) => gerar(createElement(ReciboPdf, p))
export const pdfFechamento = (p: Props<typeof FechamentoPdf>) => gerar(createElement(FechamentoPdf, p))
export const pdfFluxo = (p: Props<typeof FluxoPdf>) => gerar(createElement(FluxoPdf, p))
export const pdfResumoEvento = (p: Props<typeof ResumoEventoPdf>) => gerar(createElement(ResumoEventoPdf, p))
