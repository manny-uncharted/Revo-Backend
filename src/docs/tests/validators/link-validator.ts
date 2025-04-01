// src/docs/tests/validators/link-validator.ts
import { SiteChecker } from 'broken-link-checker';

export async function checkLinks(port: number = 3000) {
  try {
  
    await new Promise<void>((resolve, reject) => {
      const siteChecker = new SiteChecker(
        { excludedKeywords: ['localhost'] },
        {
          link: (result) => {
            if (result.broken) {
              reject(new Error(`Broken link found: ${result.url.original} (${result.brokenReason})`));
            }
          },
          end: () => {
            console.log('Link validation passed');
            resolve();
          },
        }
      );

      siteChecker.enqueue(`http://localhost:${port}/api/docs`); 
    });
  } catch (error) {
    throw new Error(`Link validation error: ${error.message}`);
  }
}