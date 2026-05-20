import { test, expect } from '@playwright/test';

test('exibe aviso quando Supabase não está configurado', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText(/Supabase não configurado/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Recarregar Aplicativo/i })).toBeVisible();
});
