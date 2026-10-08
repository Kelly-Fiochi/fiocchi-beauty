import { render, screen } from '@testing-library/react'

import { AuditPage } from './AuditPage'

describe('AuditPage', () => {
  it('renders an empty activity history', () => {
    render(<AuditPage />)

    expect(screen.getByText('Auditoria')).toBeInTheDocument()
    expect(screen.getByText('Registro de atividades')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma movimentação registrada.')).toBeInTheDocument()
  })
})
