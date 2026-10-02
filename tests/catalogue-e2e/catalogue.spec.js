import { test, expect } from '@playwright/test';
import path from 'node:path';
const photo = path.resolve('public/assets/images/products/brass-panch-batti-diya/2.jpg');
async function open(page) { await page.goto('/admin/capture?catalogue-preview=1'); await expect(page.getByRole('heading', { name: 'Create your catalogue' })).toBeVisible(); }
async function fillProduct(page, name) { await page.getByLabel('Product name').fill(name); await page.locator('.dc-editor input[type=file]').first().setInputFiles(photo); await expect(page.getByRole('img', {name})).toBeVisible(); await expect(page.getByText('Saved on this device', {exact:true})).toBeVisible(); }

test('mobile form, local autosave/resume, no duplicates and real PDF download', async ({ page }) => {
  const errors=[], mutations=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('request',r=>{if(r.method()!=='GET')mutations.push(r.url());});
  await open(page); await fillProduct(page, 'Review product'); await page.getByLabel('Price ₹').fill('1499'); await page.getByLabel('Length', {exact:true}).fill('12.5');
  await expect(page.getByText('Saved on this device', {exact:true})).toBeVisible(); await page.reload(); await expect(page.getByLabel('Product name')).toHaveValue('Review product'); await expect(page.getByLabel('Price ₹')).toHaveValue('1499');
  await expect(page.locator('.dc-products li')).toHaveCount(1); await page.screenshot({path:'test-results/catalogue/mobile-form.png',fullPage:true});
  await page.getByRole('button',{name:'Preview catalogue'}).click(); await expect(page.getByRole('button',{name:'Download PDF'})).toBeVisible();
  const download=page.waitForEvent('download'); await page.getByRole('button',{name:'Download PDF'}).click(); const file=await download; expect(file.suggestedFilename()).toMatch(/\.pdf$/); await file.saveAs('test-results/catalogue/browser-export.pdf');
  await page.getByRole('button',{name:'Share PDF'}).click(); await expect(page.getByText(/File sharing isn’t available/)).toBeVisible();
  await page.getByRole('button',{name:'Back to editing'}).click(); await expect(page.getByLabel('Product name')).toHaveValue('Review product');
  expect(errors).toEqual([]); expect(mutations).toEqual([]); expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('incomplete and bad numeric drafts survive and cannot export',async({page})=>{
  await open(page); await page.getByLabel('Product name').fill('Unfinished'); await page.getByLabel('Price ₹').fill('-3'); await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible();
  await page.reload(); await expect(page.getByLabel('Price ₹')).toHaveValue('-3'); await page.getByRole('button',{name:'Preview catalogue'}).click(); await expect(page.getByRole('alert')).toContainText('Before exporting'); await expect(page.getByRole('button',{name:'Download PDF'})).toHaveCount(0);
});
test('photo errors retain previous photo; replacing and repeated saves do not duplicate products',async({page})=>{
  await open(page); await fillProduct(page,'Photo test'); await page.locator('.dc-editor input[type=file]').first().setInputFiles({name:'broken.jpg',mimeType:'image/jpeg',buffer:Buffer.from('not an image')}); await expect(page.getByRole('alert')).toContainText('could not open'); await expect(page.getByRole('img',{name:'Photo test'})).toBeVisible();
  await page.getByRole('button',{name:'Save & add another'}).click(); await expect(page.getByLabel('Product name')).toHaveValue(''); await expect(page.locator('.dc-products li')).toHaveCount(1); await expect(page.getByRole('button',{name:'Save & add another'})).toBeDisabled();
});
test('choose, reorder, remove and reuse saved products in another catalogue',async({page})=>{
  await open(page); await fillProduct(page,'First'); await page.getByRole('button',{name:'Save & add another'}).click(); await fillProduct(page,'Second'); await page.getByRole('button',{name:'Save & add another'}).click();
  await page.getByRole('button',{name:'Move Second up',exact:true}).click(); await expect(page.locator('.dc-products li').first()).toContainText('Second');
  await page.getByRole('button',{name:'Remove First from catalogue'}).click(); await expect(page.locator('.dc-products li')).toHaveCount(1);
  await page.getByRole('button',{name:/Your catalogues/}).click(); await page.getByRole('button',{name:'Start a new catalogue'}).click(); await page.getByRole('checkbox',{name:'First',exact:true}).check(); await expect(page.locator('.dc-products li')).toHaveCount(1); await expect(page.locator('.dc-products li')).toContainText('First');
});
test('layout stays within narrow and wide mobile viewport',async({page})=>{
  for (const width of [320,390,430]) { await page.setViewportSize({width,height:844}); await open(page); await page.getByLabel('Product name').fill('W'.repeat(160)); expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); }
});
