import { render, screen } from '@testing-library/react'

import { PurchasesPage } from './PurchasesPage'

describe('PurchasesPage', () => {
  it('renders an empty purchase list', () => {
    render(<PurchasesPage />)

    expect(screen.getByText('Compras')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma compra registrada.')).toBeInTheDocument()
  })
})
