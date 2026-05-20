import { test, expect } from '@playwright/test';

test.describe('Tela de login', () => {
  test('exibe formulário de acesso', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar na Plataforma/i })).toBeVisible();
  });

  test('permite alternar para cadastro', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Cadastre-se' }).click();
    await expect(page.getByRole('heading', { name: 'Criar Conta' })).toBeVisible();
    await expect(page.getByPlaceholder('Sua Agência')).toBeVisible();
  });

  test('permite abrir recuperação de senha', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Esqueceu a senha?' }).click();
    await expect(page.getByRole('heading', { name: 'Recuperar Senha' })).toBeVisible();
  });
});
