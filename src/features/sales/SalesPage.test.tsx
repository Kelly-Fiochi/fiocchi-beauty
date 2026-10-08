import { render, screen } from '@testing-library/react'

import { SalesPage } from './SalesPage'

describe('SalesPage', () => {
  it('renders an empty sales list', () => {
    render(<SalesPage />)

    expect(screen.getByText('Vendas')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma venda registrada.')).toBeInTheDocument()
  })
})
