import { test, expect } from '@playwright/test';

/**
 * Fluxo autenticado — só roda localmente com credenciais em .env.e2e.local:
 *   E2E_EMAIL=...
 *   E2E_PASSWORD=...
 */
test.describe('App autenticado', () => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    'Defina E2E_EMAIL e E2E_PASSWORD para rodar este teste',
  );

  test('navega entre abas principais após login', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('seu@email.com').fill(process.env.E2E_EMAIL!);
    await page.locator('input[type="password"]').fill(process.env.E2E_PASSWORD!);
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click();

    await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Financeiro' }).click();
    await expect(page.getByRole('heading', { name: /Nova Transação|Editar Transação/i })).toBeVisible();

    await page.getByRole('button', { name: 'Clientes' }).click();
    await expect(page.getByText(/Carteira de Clientes|Clientes/i).first()).toBeVisible();

    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByText('Cockpit financeiro')).toBeVisible();

    await page.getByRole('button', { name: 'Relatórios' }).click();
    await expect(page.getByText('Filtros Avançados')).toBeVisible();
  });
});
