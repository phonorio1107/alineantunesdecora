// Dados de demonstração. Serão substituídos pelas tabelas do Supabase.
import { toISODate } from '../lib/format'
import type { Cliente, Evento, ItemEstoque, OrdemServico, Orcamento } from './types'

const dia = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return toISODate(d)
}

export const clientes: Cliente[] = [
  { id: 'c1', nome: 'Juliana Martins', telefone: '(19) 98765-4321', email: 'juliana@email.com', cidade: 'Louveira', origem: 'instagram' },
  { id: 'c2', nome: 'Rafael e Camila', telefone: '(11) 99812-3344', cidade: 'Jundiaí', origem: 'indicacao' },
  { id: 'c3', nome: 'Patrícia Souza', telefone: '(19) 97654-1122', cidade: 'Vinhedo', origem: 'instagram' },
  { id: 'c4', nome: 'Fernanda Lima', telefone: '(19) 96543-8899', email: 'fe.lima@email.com', cidade: 'Campinas', origem: 'indicacao' },
  { id: 'c5', nome: 'Marcos Oliveira', telefone: '(19) 95432-7766', cidade: 'Valinhos', origem: 'instagram' },
  { id: 'c6', nome: 'Beatriz Costa', telefone: '(11) 94321-5544', cidade: 'São Paulo', origem: 'indicacao' },
]

export const eventos: Evento[] = [
  { id: 'e1', clienteId: 'c1', titulo: '1 aninho da Helena', tipo: 'infantil', tema: 'Jardim Encantado', data: dia(2), horaMontagem: '12:00', horaInicio: '15:00', local: 'Espaço Recanto — Louveira', convidados: 60, status: 'confirmado' },
  { id: 'e2', clienteId: 'c2', titulo: 'Casamento Rafael & Camila', tipo: 'casamento', tema: 'Rústico chique', data: dia(5), horaMontagem: '16:00', horaInicio: '19:00', local: 'Villa Verde — Jundiaí', convidados: 180, status: 'confirmado' },
  { id: 'e3', clienteId: 'c3', titulo: 'Chá revelação', tipo: 'cha', tema: 'Nuvens e balões', data: dia(5), horaMontagem: '11:00', horaInicio: '14:00', local: 'Residência — Vinhedo', convidados: 35, status: 'pendente' },
  { id: 'e4', clienteId: 'c4', titulo: '15 anos da Laura', tipo: 'quinze_anos', tema: 'Paris', data: dia(12), horaMontagem: '18:00', horaInicio: '21:00', local: 'Salão Imperial — Campinas', convidados: 150, status: 'confirmado' },
  { id: 'e5', clienteId: 'c5', titulo: 'Aniversário do Theo', tipo: 'infantil', tema: 'Safari', data: dia(19), horaMontagem: '13:00', horaInicio: '16:00', local: 'Condomínio Parque — Valinhos', convidados: 50, status: 'pendente' },
  { id: 'e6', clienteId: 'c6', titulo: 'Batizado do Miguel', tipo: 'batizado', tema: 'Anjinhos', data: dia(-4), horaMontagem: '09:00', horaInicio: '12:00', local: 'Chácara Bela Vista — Louveira', convidados: 70, status: 'realizado' },
  { id: 'e7', clienteId: 'c1', titulo: 'Confraternização de fim de ano', tipo: 'corporativo', tema: 'Natal dourado', data: dia(26), horaMontagem: '15:00', horaInicio: '18:00', local: 'Escritório — São Paulo', convidados: 90, status: 'confirmado' },
]

export const orcamentos: Orcamento[] = [
  { id: 'o1', numero: 1042, clienteId: 'c1', eventoId: 'e1', pacote: 'excepcional', descricao: 'Decoração + arco de balões desconstruído', tipo: 'infantil', dataEvento: dia(2), valor: 3800, sinal: 1140, status: 'aprovado', criadoEm: dia(-30) },
  { id: 'o2', numero: 1043, clienteId: 'c2', eventoId: 'e2', pacote: 'exclusivo', descricao: 'Cerimônia + recepção + assessoria', tipo: 'casamento', dataEvento: dia(5), valor: 14500, sinal: 4350, status: 'aprovado', criadoEm: dia(-90) },
  { id: 'o3', numero: 1051, clienteId: 'c3', eventoId: 'e3', pacote: 'especial', descricao: 'Mini table + painel de balões', tipo: 'cha', dataEvento: dia(5), valor: 1650, sinal: 0, status: 'enviado', criadoEm: dia(-3) },
  { id: 'o4', numero: 1048, clienteId: 'c4', eventoId: 'e4', pacote: 'extraordinario', descricao: 'Decoração completa + entrada + arranjos florais', tipo: 'quinze_anos', dataEvento: dia(12), valor: 9200, sinal: 2760, status: 'aprovado', criadoEm: dia(-45) },
  { id: 'o5', numero: 1053, clienteId: 'c5', eventoId: 'e5', pacote: 'especial', descricao: 'Festa Safari com peças neutras', tipo: 'infantil', dataEvento: dia(19), valor: 2400, sinal: 0, status: 'enviado', criadoEm: dia(-1) },
  { id: 'o6', numero: 1054, clienteId: 'c6', pacote: 'excepcional', descricao: 'Aniversário de 50 anos', tipo: 'outro', dataEvento: dia(40), valor: 4100, sinal: 0, status: 'rascunho', criadoEm: dia(0) },
  { id: 'o7', numero: 1039, clienteId: 'c6', eventoId: 'e6', pacote: 'especial', descricao: 'Decoração batizado + assessoria', tipo: 'batizado', dataEvento: dia(-4), valor: 2900, sinal: 870, status: 'aprovado', criadoEm: dia(-60) },
  { id: 'o8', numero: 1047, clienteId: 'c3', pacote: 'excepcional', descricao: 'Festa infantil tema Fazendinha', tipo: 'infantil', dataEvento: dia(30), valor: 3100, sinal: 0, status: 'recusado', criadoEm: dia(-20) },
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
  { id: 'i1', nome: 'Painel redondo 2m', categoria: 'paineis', quantidade: 4, valorUnitario: 450, volumeLitros: 120, cor: 'Branco', neutra: true, local: 'Acervo — parede A', conservacao: 'otimo' },
  { id: 'i2', nome: 'Painel romano (trio)', categoria: 'paineis', quantidade: 2, valorUnitario: 980, volumeLitros: 300, cor: 'Off-white', neutra: true, local: 'Acervo — parede A', conservacao: 'bom' },
  { id: 'i3', nome: 'Cilindros (jogo com 3)', categoria: 'mobiliario', quantidade: 5, valorUnitario: 620, volumeLitros: 400, cor: 'Branco', neutra: true, local: 'Acervo — piso B', conservacao: 'otimo' },
  { id: 'i4', nome: 'Mesa provençal', categoria: 'mobiliario', quantidade: 3, valorUnitario: 850, volumeLitros: 900, cor: 'Branco', neutra: true, local: 'Acervo — piso B', conservacao: 'reparo' },
  { id: 'i5', nome: 'Boleira de vidro alta', categoria: 'boleiras', quantidade: 12, valorUnitario: 65, volumeLitros: 6, cor: 'Transparente', neutra: true, local: 'Prateleira C3', conservacao: 'otimo' },
  { id: 'i6', nome: 'Boleira dourada', categoria: 'boleiras', quantidade: 8, valorUnitario: 80, volumeLitros: 5, cor: 'Dourado', neutra: true, local: 'Prateleira C3', conservacao: 'bom' },
  { id: 'i7', nome: 'Bandeja espelhada', categoria: 'bandejas', quantidade: 20, valorUnitario: 45, volumeLitros: 2, cor: 'Prata', neutra: true, local: 'Prateleira C4', conservacao: 'otimo' },
  { id: 'i8', nome: 'Arranjo de flores permanentes', categoria: 'arranjos', quantidade: 30, valorUnitario: 90, volumeLitros: 15, cor: 'Rosé', neutra: true, local: 'Caixa D1', conservacao: 'bom' },
  { id: 'i9', nome: 'Toalha de cetim', categoria: 'tecidos', quantidade: 25, valorUnitario: 40, volumeLitros: 3, cor: 'Off-white', neutra: true, local: 'Armário E1', conservacao: 'otimo' },
  { id: 'i10', nome: 'Cordão de luz fada 10m', categoria: 'iluminacao', quantidade: 15, valorUnitario: 35, volumeLitros: 1, cor: 'Luz quente', neutra: true, local: 'Caixa D4', conservacao: 'otimo' },
  { id: 'i11', nome: 'Bichinhos de pelúcia Safari', categoria: 'arranjos', quantidade: 6, valorUnitario: 70, volumeLitros: 20, cor: 'Sortido', neutra: false, local: 'Caixa D2', conservacao: 'bom' },
  { id: 'i12', nome: 'Balões nº 9 (pacote 50 un.)', categoria: 'consumo', quantidade: 3, valorUnitario: 28, volumeLitros: 1, cor: 'Sortido', neutra: true, local: 'Armário E3', conservacao: 'otimo' },
]

export const clientePorId = (id: string) => clientes.find((c) => c.id === id)
export const eventoPorId = (id: string) => eventos.find((e) => e.id === id)
