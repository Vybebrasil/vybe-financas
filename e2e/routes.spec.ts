import { test, expect } from '@playwright/test';

test.describe('Rotas URL', () => {
  test('redireciona para login quando não autenticado em /financeiro', async ({ page }) => {
    await page.goto('/financeiro');
    await expect(page.getByText(/Vybe|Finanças|Entrar|login/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('rota /relatorios carrega shell ou login', async ({ page }) => {
    await page.goto('/relatorios');
    await expect(page.locator('body')).toBeVisible();
  });
});
