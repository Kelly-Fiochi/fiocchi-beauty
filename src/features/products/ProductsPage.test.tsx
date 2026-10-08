import { render, screen } from '@testing-library/react'

import { ProductsPage } from './ProductsPage'

describe('ProductsPage', () => {
  it('renders an empty product catalog', () => {
    render(<ProductsPage />)

    expect(screen.getByText('Catálogo de produtos')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Buscar produto ou SKU')).toBeInTheDocument()
    expect(screen.getByText('Nenhum produto encontrado.')).toBeInTheDocument()
  })
})
