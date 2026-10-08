import { render, screen } from '@testing-library/react'

import { FinancePage } from './FinancePage'

describe('FinancePage', () => {
  it('renders an empty financial list', () => {
    render(<FinancePage />)

    expect(screen.getByText('Financeiro')).toBeInTheDocument()
    expect(screen.getByText('Movimentações financeiras')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma movimentação registrada.')).toBeInTheDocument()
  })
})
