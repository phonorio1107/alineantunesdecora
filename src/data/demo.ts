// Dados de demonstração. Serão substituídos pelas tabelas do Supabase.
import { toISODate } from '../lib/format'
import type { Cliente, Evento, ItemEstoque, OrdemServico, Orcamento } from './types'

const dia = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return toISODate(d)
}

export const clientes: Cliente[] = [
  { id: 'c1', nome: 'Juliana Martins', telefone: '(11) 98765-4321', email: 'juliana@email.com', cidade: 'São Paulo', origem: 'instagram' },
  { id: 'c2', nome: 'Rafael e Camila', telefone: '(11) 99812-3344', cidade: 'Santo André', origem: 'indicacao' },
  { id: 'c3', nome: 'Patrícia Souza', telefone: '(11) 97654-1122', cidade: 'São Bernardo', origem: 'whatsapp' },
  { id: 'c4', nome: 'Fernanda Lima', telefone: '(11) 96543-8899', email: 'fe.lima@email.com', cidade: 'São Paulo', origem: 'site' },
  { id: 'c5', nome: 'Marcos Oliveira', telefone: '(11) 95432-7766', cidade: 'Guarulhos', origem: 'instagram' },
  { id: 'c6', nome: 'Beatriz Costa', telefone: '(11) 94321-5544', cidade: 'Osasco', origem: 'indicacao' },
]

export const eventos: Evento[] = [
  { id: 'e1', clienteId: 'c1', titulo: '1 aninho da Helena', tipo: 'infantil', tema: 'Jardim Encantado', data: dia(2), horaMontagem: '10:00', horaInicio: '15:00', local: 'Buffet Alegria — Moema', convidados: 60, status: 'confirmado' },
  { id: 'e2', clienteId: 'c2', titulo: 'Casamento Rafael & Camila', tipo: 'casamento', tema: 'Rústico chique', data: dia(5), horaMontagem: '08:00', horaInicio: '19:00', local: 'Espaço Villa Verde', convidados: 180, status: 'confirmado' },
  { id: 'e3', clienteId: 'c3', titulo: 'Chá revelação', tipo: 'cha', tema: 'Nuvens e balões', data: dia(5), horaMontagem: '09:00', horaInicio: '14:00', local: 'Residência — São Bernardo', convidados: 35, status: 'pendente' },
  { id: 'e4', clienteId: 'c4', titulo: '15 anos da Laura', tipo: 'quinze_anos', tema: 'Paris', data: dia(12), horaMontagem: '12:00', horaInicio: '21:00', local: 'Salão Imperial', convidados: 150, status: 'confirmado' },
  { id: 'e5', clienteId: 'c5', titulo: 'Aniversário do Theo', tipo: 'infantil', tema: 'Safari', data: dia(19), horaMontagem: '10:00', horaInicio: '16:00', local: 'Condomínio Parque — Guarulhos', convidados: 50, status: 'pendente' },
  { id: 'e6', clienteId: 'c6', titulo: 'Batizado do Miguel', tipo: 'batizado', tema: 'Anjinhos', data: dia(-4), horaMontagem: '08:00', horaInicio: '12:00', local: 'Chácara Recanto', convidados: 70, status: 'realizado' },
  { id: 'e7', clienteId: 'c1', titulo: 'Mesa de Natal corporativa', tipo: 'corporativo', tema: 'Natal dourado', data: dia(26), horaMontagem: '07:00', horaInicio: '18:00', local: 'Escritório Paulista', convidados: 90, status: 'confirmado' },
]

export const orcamentos: Orcamento[] = [
  { id: 'o1', numero: 1042, clienteId: 'c1', eventoId: 'e1', descricao: 'Decoração completa + mesa de doces', tipo: 'infantil', dataEvento: dia(2), valor: 3800, sinal: 1140, status: 'aprovado', criadoEm: dia(-30) },
  { id: 'o2', numero: 1043, clienteId: 'c2', eventoId: 'e2', descricao: 'Cerimônia + recepção + assessoria do dia', tipo: 'casamento', dataEvento: dia(5), valor: 14500, sinal: 4350, status: 'aprovado', criadoEm: dia(-90) },
  { id: 'o3', numero: 1051, clienteId: 'c3', eventoId: 'e3', descricao: 'Mini table + painel de balões', tipo: 'cha', dataEvento: dia(5), valor: 1650, sinal: 0, status: 'enviado', criadoEm: dia(-3) },
  { id: 'o4', numero: 1048, clienteId: 'c4', eventoId: 'e4', descricao: 'Decoração completa + pista + entrada', tipo: 'quinze_anos', dataEvento: dia(12), valor: 9200, sinal: 2760, status: 'aprovado', criadoEm: dia(-45) },
  { id: 'o5', numero: 1053, clienteId: 'c5', eventoId: 'e5', descricao: 'Kit festa Safari', tipo: 'infantil', dataEvento: dia(19), valor: 2400, sinal: 0, status: 'enviado', criadoEm: dia(-1) },
  { id: 'o6', numero: 1054, clienteId: 'c6', descricao: 'Aniversário de 50 anos', tipo: 'outro', dataEvento: dia(40), valor: 4100, sinal: 0, status: 'rascunho', criadoEm: dia(0) },
  { id: 'o7', numero: 1039, clienteId: 'c6', eventoId: 'e6', descricao: 'Decoração batizado', tipo: 'batizado', dataEvento: dia(-4), valor: 2900, sinal: 870, status: 'aprovado', criadoEm: dia(-60) },
  { id: 'o8', numero: 1047, clienteId: 'c3', descricao: 'Festa infantil tema Frozen', tipo: 'infantil', dataEvento: dia(30), valor: 3100, sinal: 0, status: 'recusado', criadoEm: dia(-20) },
]

export const ordensServico: OrdemServico[] = [
  {
    id: 'os1', numero: 312, eventoId: 'e1', status: 'separado', equipe: ['Aline', 'Bruna'],
    checklist: [
      { item: 'Separar painel redondo floral', feito: true },
      { item: 'Conferir boleiras e bandejas', feito: true },
      { item: 'Encher balões (arco desconstruído)', feito: false },
      { item: 'Carregar o carro', feito: false },
    ],
  },
  {
    id: 'os2', numero: 313, eventoId: 'e2', status: 'a_preparar', equipe: ['Aline', 'Bruna', 'Carlos', 'Dani'],
    checklist: [
      { item: 'Confirmar flores com fornecedor', feito: true },
      { item: 'Separar castiçais e tecidos', feito: false },
      { item: 'Montar arranjos de mesa', feito: false },
      { item: 'Conferir iluminação', feito: false },
      { item: 'Reunião final com os noivos', feito: false },
    ],
  },
  {
    id: 'os3', numero: 314, eventoId: 'e4', status: 'a_preparar', equipe: ['Aline', 'Carlos'],
    checklist: [
      { item: 'Separar Torre Eiffel decorativa', feito: false },
      { item: 'Conferir letreiro neon', feito: false },
    ],
  },
  {
    id: 'os4', numero: 309, eventoId: 'e6', status: 'concluida', equipe: ['Aline', 'Bruna'],
    checklist: [
      { item: 'Montagem', feito: true },
      { item: 'Desmontagem e conferência de itens', feito: true },
    ],
  },
]

export const estoque: ItemEstoque[] = [
  { id: 'i1', nome: 'Painel redondo 2m', categoria: 'paineis', quantidade: 4, valorUnitario: 450, volumeLitros: 120, cor: 'Branco', local: 'Depósito A1', conservacao: 'otimo' },
  { id: 'i2', nome: 'Painel romano (trio)', categoria: 'paineis', quantidade: 2, valorUnitario: 980, volumeLitros: 300, cor: 'Off-white', local: 'Depósito A2', conservacao: 'bom' },
  { id: 'i3', nome: 'Cilindros (jogo com 3)', categoria: 'mobiliario', quantidade: 5, valorUnitario: 620, volumeLitros: 400, cor: 'Branco', local: 'Depósito B1', conservacao: 'otimo' },
  { id: 'i4', nome: 'Mesa provençal', categoria: 'mobiliario', quantidade: 3, valorUnitario: 850, volumeLitros: 900, cor: 'Branco', local: 'Depósito B2', conservacao: 'reparo' },
  { id: 'i5', nome: 'Boleira de vidro alta', categoria: 'boleiras', quantidade: 12, valorUnitario: 65, volumeLitros: 6, cor: 'Transparente', local: 'Prateleira C3', conservacao: 'otimo' },
  { id: 'i6', nome: 'Boleira dourada', categoria: 'boleiras', quantidade: 8, valorUnitario: 80, volumeLitros: 5, cor: 'Dourado', local: 'Prateleira C3', conservacao: 'bom' },
  { id: 'i7', nome: 'Bandeja espelhada', categoria: 'bandejas', quantidade: 20, valorUnitario: 45, volumeLitros: 2, cor: 'Prata', local: 'Prateleira C4', conservacao: 'otimo' },
  { id: 'i8', nome: 'Arranjo de flores artificiais', categoria: 'arranjos', quantidade: 30, valorUnitario: 90, volumeLitros: 15, cor: 'Rosa', local: 'Caixa D1', conservacao: 'bom' },
  { id: 'i9', nome: 'Toalha de cetim', categoria: 'tecidos', quantidade: 25, valorUnitario: 40, volumeLitros: 3, cor: 'Rosé', local: 'Armário E1', conservacao: 'otimo' },
  { id: 'i10', nome: 'Cordão de luz fada 10m', categoria: 'iluminacao', quantidade: 15, valorUnitario: 35, volumeLitros: 1, cor: 'Quente', local: 'Caixa D4', conservacao: 'otimo' },
  { id: 'i11', nome: 'Letreiro neon "Love"', categoria: 'letreiros', quantidade: 1, valorUnitario: 700, volumeLitros: 40, cor: 'Rosa', local: 'Depósito A3', conservacao: 'otimo' },
  { id: 'i12', nome: 'Balões nº 9 (pacote)', categoria: 'consumo', quantidade: 3, valorUnitario: 28, volumeLitros: 1, cor: 'Sortido', local: 'Armário E3', conservacao: 'otimo' },
]

export const clientePorId = (id: string) => clientes.find((c) => c.id === id)
export const eventoPorId = (id: string) => eventos.find((e) => e.id === id)
