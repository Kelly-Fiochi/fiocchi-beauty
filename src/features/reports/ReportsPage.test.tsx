import { render, screen } from '@testing-library/react'

import { ReportsPage } from './ReportsPage'

describe('ReportsPage', () => {
  it('renders report cards without fabricated records', () => {
    render(<ReportsPage />)

    expect(screen.getByText('Relatórios')).toBeInTheDocument()
    expect(screen.getByText('Faturamento')).toBeInTheDocument()
    expect(screen.getByText('Nenhum produto vendido')).toBeInTheDocument()
  })

  it('starts a CSV report download', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    render(<ReportsPage />)
    screen.getByRole('button', { name: 'Exportar relatório' }).click()
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:report')
    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
  })
})
