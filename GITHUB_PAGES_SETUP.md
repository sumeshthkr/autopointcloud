# GitHub Pages Setup Guide

This guide will help you deploy AutoPointCloud to GitHub Pages in just a few minutes!

## 🚀 Quick Setup

### Prerequisites
- A GitHub account
- Your repository forked or cloned from `sumeshthkr/autopointcloud`

### Step 1: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** (top right of the repository page)
3. In the left sidebar, click on **Pages**
4. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
   - That's it! No need to select a branch or folder

### Step 2: Push to Main Branch

Simply push your code to the `main` branch:

```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

### Step 3: Wait for Deployment

1. Go to the **Actions** tab in your repository
2. You'll see a workflow called "Deploy to GitHub Pages" running
3. Wait for it to complete (usually takes 2-3 minutes)
4. Once complete, your site will be live at:
   ```
   https://[your-username].github.io/autopointcloud/
   ```

## 🎉 That's It!

Your AutoPointCloud application is now live and accessible to anyone!

## 🔄 Automatic Updates

Every time you push to the `main` branch, GitHub Actions will automatically:
1. Build your Next.js application
2. Export it as static files
3. Deploy to GitHub Pages

No manual intervention needed!

## 🛠️ Troubleshooting

### Build Fails

If the build fails, check the Actions tab for error messages. Common issues:

1. **Node version**: The workflow uses Node.js 20. Make sure your code is compatible.
2. **Build errors**: Run `npm run build` locally to catch any build errors before pushing.

### Site Not Loading

1. Check that the workflow completed successfully in the Actions tab
2. Wait a few minutes - sometimes GitHub Pages takes time to update
3. Clear your browser cache and try again
4. Verify the repository settings show GitHub Pages is enabled

### 404 Errors

If you see 404 errors:
1. Make sure the workflow is set to deploy from the `out` directory
2. Check that `next.config.ts` has the correct `basePath` configuration
3. Ensure the `.nojekyll` file exists in the `public` directory

## 🔧 Configuration

The application is already configured for GitHub Pages! Key settings:

### `next.config.ts`
```typescript
{
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/autopointcloud' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/autopointcloud/' : '',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
}
```

### `.github/workflows/deploy-gh-pages.yml`
- Automatically runs on push to `main` branch
- Builds the Next.js app
- Deploys to GitHub Pages

## 📚 Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Next.js Static Export Documentation](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 💡 Tips

1. **Custom Domain**: You can set up a custom domain in GitHub Pages settings
2. **HTTPS**: GitHub Pages automatically provides HTTPS
3. **Analytics**: Consider adding Google Analytics or similar to track usage
4. **Performance**: The static export ensures maximum performance and SEO

---

**Need Help?** Open an issue on the [GitHub repository](https://github.com/sumeshthkr/autopointcloud/issues)
