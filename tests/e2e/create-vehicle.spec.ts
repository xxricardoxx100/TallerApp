import { test, expect } from '@playwright/test';

test('home page loads y muestra botón de nuevo vehículo', async ({ page }) => {
  await page.goto('/');
  // Esperar a que cargue y buscar el botón FAB (fixed bottom-right con ícono +)
  const fab = page.locator('button.fixed.bottom-6.right-6');
  await expect(fab).toBeVisible();
});
