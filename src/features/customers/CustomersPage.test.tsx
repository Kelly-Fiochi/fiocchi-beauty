import { fireEvent, render, screen } from '@testing-library/react'

import { CustomersPage } from './CustomersPage'

describe('CustomersPage', () => {
  it('renders an empty customer list', () => {
    render(<CustomersPage />)

    expect(screen.getByText('Clientes')).toBeInTheDocument()
    expect(screen.getByText('Base de clientes')).toBeInTheDocument()
    expect(screen.getByText('Base de clientes')).toBeInTheDocument()
    expect(screen.getByText('Clientes ativos')).toBeInTheDocument()
  })

  it('opens the create form', () => {
    render(<CustomersPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Novo cliente' }))
    expect(screen.getAllByText('Novo cliente')).toHaveLength(2)
  })
})
