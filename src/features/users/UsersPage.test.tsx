import { render, screen } from '@testing-library/react'

import { UsersPage } from './UsersPage'

describe('UsersPage', () => {
  it('renders an empty team list', () => {
    render(<UsersPage />)

    expect(screen.getByText('Usuários')).toBeInTheDocument()
    expect(screen.getByText('Equipe e permissões')).toBeInTheDocument()
    expect(screen.getByText('Nenhum usuário cadastrado.')).toBeInTheDocument()
  })
})
