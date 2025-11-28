describe('项目成员管理流程', () => {
  it('should render member list section', () => {
    cy.visit('/projects/1')
    cy.contains('项目成员与生产配置').should('exist')
  })
})
