// Cláusulas do contrato da Aline Antunes Decora, transcritas do modelo que ela usa hoje (pedido emitido em 28/10/2026).
// Texto preservado como está. Só viram campos: dados bancários e PIX (cláusula 3), prazo do saldo (cláusula 3) e cidade do foro (cláusula 8).
// Qualquer mudança de texto deve passar por advogado e ganhar um novo identificador em MODELO_CONTRATO.

export const MODELO_CONTRATO = 'aline-2026-10-v1'

export const TITULO_CONTRATO = 'Contrato de prestação de serviços e termo de responsabilidade'

export interface Paragrafo {
  /** Título em negrito no início do parágrafo, ex.: "1. OBJETO:". */
  titulo?: string
  texto?: string
  /** Bloco destacado (dados de pagamento). */
  destaque?: string[]
  recuo?: boolean
}

export interface ParametrosClausulas {
  bancoNome: string
  favorecido: string
  agencia: string
  conta: string
  pix: string
  diasSaldo: number
  cidadeForo: string
}

export function clausulas(p: ParametrosClausulas): Paragrafo[] {
  return [
    {
      titulo: '1. OBJETO:',
      texto: 'A presente proposta tem por objeto a locação de itens, conforme disposições acima, os quais são entregues em perfeitas condições de uso e assim devendo ser devolvidos.',
    },
    {
      titulo: '2. DA ASSESSORIA:',
      texto: 'Caso a CONTRATANTE tenha contratado este serviço, A CONTRATADA obriga-se a prestar serviços de assessoria à CONTRATANTE, compreendendo:',
    },
    {
      recuo: true,
      texto: 'I – **Assessoria Prévia ao Evento:** consiste na realização de reuniões de alinhamento, orientação e acompanhamento da CONTRATANTE quanto à definição do projeto de decoração, indicação e/ou acompanhamento de fornecedores, elaboração do cronograma do evento e suporte em questões correlatas à execução do mesmo.',
    },
    {
      recuo: true,
      texto: 'II – **Assessoria no Dia do Evento:** compreende o acompanhamento integral da montagem e desmontagem da decoração, recepção e orientação dos fornecedores contratados pela CONTRATANTE, supervisão da execução do cronograma previamente definido e apoio à equipe de cerimonial, visando assegurar o regular desenvolvimento do evento.',
    },
    {
      titulo: 'Parágrafo Único:',
      texto: 'Ficam excluídas das obrigações da CONTRATADA quaisquer atividades não descritas nos itens anteriores, salvo mediante contratação adicional, devidamente formalizada entre as partes.',
    },
    {
      titulo: '3. FORMA DE PAGAMENTO:',
      texto: 'O citado valor será pago à vista ou através de depósito bancário, de acordo com as datas de vencimento apresentadas na tabela de parcelas de pagamentos.',
      destaque: [
        `**BANCO:** ${p.bancoNome}`,
        `**${p.favorecido}**`,
        `**AGÊNCIA:** ${p.agencia}   **CONTA:** ${p.conta}`,
        `**PIX:** ${p.pix}`,
      ],
    },
    {
      texto: `Para a opção de pagamento parcelado, o valor total da DECORAÇÃO já deverá estar pago integralmente em até ${p.diasSaldo} dias antes da data de entrega do EVENTO, sob pena de ser a suspensa/cancelada por inadimplência exclusiva do Solicitante, sendo-lhe atribuído a título de multa o valor equivalente a 20% (vinte por cento) do valor da DECORAÇÃO.`,
    },
    {
      titulo: '4. FRETE E CUSTO:',
      texto: 'A DECORADORA é responsável pela entrega e retirada dos materiais contratados no local e horário previamente acordados com o Solicitante, podendo haver carência de até 1 (uma) hora para retirada/devolução destes materiais. Caso o Solicitante não disponibilize os materiais para seu recolhimento, a DECORADORA cobrará diárias adicionais até que os materiais sejam devolvidos.',
    },
    {
      titulo: '5. DO INADIMPLEMENTO:',
      texto: 'A falta de pagamento de qualquer parcela na data acordada acarretará ao Solicitante multa de 2%, juros de mora de 1% ao mês e correção monetária, bem como, em caso de cobrança judicial, serão acrescidas custas processuais e de honorários advocatícios na base de 20% sobre o valor do débito.',
    },
    {
      titulo: '6. VALIDADE DO ORÇAMENTO:',
      texto: 'Três dias, após o recebimento desta proposta. Após este prazo, os valores podem sofrer reajuste sem prévio aviso. Somente após o pagamento da 1ª parcela, mencionado na cláusula 3, será mantido o valor e garantida a reserva dos materiais.',
    },
    { titulo: '7. DISPOSIÇÕES GERAIS:' },
    {
      titulo: '7.1.:',
      texto: 'Os bens não poderão ser sublocados no todo ou em parte, nem cedidos a terceiros, seja a que título for, sendo também proibida a cessão ou transferência deste contrato.',
    },
    {
      titulo: '7.2.:',
      texto: 'A tolerância ou transigência da DECORADORA não implicará em novação, perdão, renúncia, alteração ou modificação do contrato, sendo o evento ou omissão considerado, para todos os fins de direito, como mera liberalidade do Solicitante, que transigiu, anuiu ou não exigiu o cumprimento da obrigação, não implicando, todavia, na renúncia do direito de exigir o cumprimento das obrigações aqui contidas, a qualquer tempo.',
    },
    {
      titulo: '7.3.:',
      texto: 'Todos os elementos constantes deste contrato não poderão ser danificados. Não será permitido furar, colar, cortar, pintar, grampear, adesivar qualquer equipamento que compõem o material desta empresa. Não é permitido fixar nenhum elemento no nosso material sem prévia orientação, conhecimento e autorização da Locadora, por medida de segurança. Portanto, fica sob a responsabilidade do Solicitante/Locatário, até a sua devolução quaisquer danos ou extravios causados ao material locado. Caso ocorra algum dano ao material da DECORADORA, a mesma poderá emitir nota fiscal no valor do material danificado ou inutilizado, com vencimento para 10 (dez) dias da data do término do evento.',
    },
    {
      titulo: '7.4.:',
      texto: 'Em caso de impossibilidade de utilização de elevador para a entrega de móveis ou distância superior a 50m, será necessário que o cliente pague adicional de colaborador extra. A DECORADORA fica eximida de qualquer responsabilidade quanto a desníveis de pisos e paredes que impeçam o uso adequado dos móveis ou tamanho de portas e elevadores que impeçam a passagem dos mesmos.',
    },
    { titulo: '7.5.: DA RESCISÃO CONTRATUAL:' },
    { texto: 'Em caso de desistência dos serviços contratados, a CONTRATANTE deverá comunicar a DECORADORA com antecedência.' },
    {
      recuo: true,
      texto: '**A)** Se a desistência ocorrer com mais de 30 (trinta) dias úteis de antecedência do evento, haverá a devolução de **80% do valor pago** pela CONTRATANTE, retendo a CONTRATADA 20% do valor total a título de despesas administrativas.',
    },
    {
      recuo: true,
      texto: '**B)** Se a desistência ocorrer entre 15 (quinze) e 30 (trinta) dias úteis de antecedência, haverá a devolução de **50% do valor pago**.',
    },
    {
      recuo: true,
      texto: '**C)** Se a desistência ocorrer com menos de 15 (quinze) dias úteis de antecedência, **não haverá devolução dos valores pagos**, podendo a CONTRATADA reter 100% do valor a título de multa contratual.',
    },
    {
      recuo: true,
      texto: 'D) Em caso de rescisão do contrato por iniciativa da **DECORADORA**, por motivos alheios à vontade do CONTRATANTE, a DECORADORA se obriga a **devolver integralmente o valor já pago** pela CONTRATANTE no prazo máximo de 5 dias úteis a partir da comunicação da rescisão, ficando a CONTRATANTE isenta de qualquer multa ou taxa de cancelamento.',
    },
    {
      titulo: '7.6.:',
      texto: 'O presente Contrato obriga não só às partes, como também seus sucessores a qualquer título, a cumprirem todas as cláusulas e condições aqui expressas.',
    },
    {
      titulo: '8. DO FORO:',
      texto: `As partes elegem o Foro da Comarca de ${p.cidadeForo} como competente para dirimir as questões decorrentes da execução deste Contrato, e concordam com as condições mencionadas na proposta de orçamento e memorial descritivo e que é parte integrante deste Contrato.`,
    },
  ]
}
