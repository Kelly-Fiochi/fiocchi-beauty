import { render, screen } from '@testing-library/react'

import { InventoryPage } from './InventoryPage'

describe('InventoryPage', () => {
  it('renders empty stock position and movement history', () => {
    render(<InventoryPage />)

    expect(screen.getByText('Controle de estoque')).toBeInTheDocument()
    expect(screen.getByText('Posição atual')).toBeInTheDocument()
    expect(screen.getByText('Últimas movimentações')).toBeInTheDocument()
    expect(screen.getByText('Nenhum produto cadastrado no estoque.')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma movimentação registrada.')).toBeInTheDocument()
  })
})
