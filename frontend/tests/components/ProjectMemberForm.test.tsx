import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ProjectMemberForm } from '@/components/project/ProjectMemberForm'
import { projectMemberService } from '@/services/projectMember'
import { userService } from '@/services/user'

jest.mock('@/services/projectMember')
jest.mock('@/services/user')

const mockedProjectMemberService = projectMemberService as jest.Mocked<
  typeof projectMemberService
>
const mockedUserService = userService as jest.Mocked<typeof userService>

const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  )
}

describe('ProjectMemberForm', () => {
  beforeEach(() => {
    mockedUserService.listUsers.mockResolvedValue({
      data: [
        {
          id: 1,
          username: 'tester',
          real_name: '测试用户',
          email: 'a@b.com',
          role: 'designer',
          is_active: true,
          created_at: '',
          updated_at: '',
        },
      ],
      total: 1,
      page: 1,
      size: 10,
    } as any)

    mockedProjectMemberService.create.mockResolvedValue({
      id: 10,
      project_id: 1,
      user_id: 1,
      role: 'manager',
      join_date: '2024-01-01',
      is_active: true,
      created_at: '',
      updated_at: '',
    } as any)
  })

  it('submits member creation request', async () => {
    renderWithProviders(<ProjectMemberForm projectId={1} />)

    const combos = await screen.findAllByRole('combobox')
    await userEvent.click(combos[0])
    await userEvent.click(await screen.findByText(/测试用户/))

    await userEvent.click(combos[1])
    await userEvent.click(screen.getByText('项目负责人'))

    await userEvent.click(screen.getByRole('button', { name: '添加成员' }))

    await waitFor(() => {
      expect(mockedProjectMemberService.create).toHaveBeenCalled()
    })
  })
})
