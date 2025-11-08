# Deployment Guide for AutoPointCloud

This guide covers deploying AutoPointCloud to Vercel and Netlify.

## Prerequisites

- Node.js 20+ installed
- npm or yarn package manager
- Git repository connected to GitHub

## Quick Deploy

### Deploy to Vercel (Recommended)

Vercel provides the best experience for Next.js applications:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sumeshthkr/autopointcloud)

**Via Dashboard:**
1. Visit [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your repository
5. Click "Deploy" (no configuration needed!)

**Via CLI:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd autopointcloud
vercel

# Follow the prompts
# Production URL will be provided
```

### Deploy to Netlify

Netlify also works great with Next.js:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/sumeshthkr/autopointcloud)

**Via Dashboard:**
1. Visit [netlify.com](https://netlify.com)
2. Sign in with GitHub
3. Click "Add new site" → "Import an existing project"
4. Select your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Click "Deploy site"

**Via CLI:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd autopointcloud
netlify deploy --prod

# Follow the prompts
```

## Configuration

### Build Settings

Both Vercel and Netlify auto-detect Next.js projects. However, if needed:

**Build Command:** `npm run build`
**Output Directory:** `.next`
**Node Version:** 20.x

### Environment Variables

No environment variables are required! The application runs entirely client-side.

### Custom Domain

**Vercel:**
```bash
vercel domains add yourdomain.com
```
Then add DNS records as instructed.

**Netlify:**
1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Follow DNS setup instructions

## Performance Optimization

### Already Optimized

The application includes:
- ✅ Dynamic imports for Three.js components
- ✅ Client-side rendering where appropriate
- ✅ Optimized bundle splitting
- ✅ Tailwind CSS tree-shaking
- ✅ TypeScript for type safety

### Edge Functions (Optional)

For advanced use cases, you can add edge functions:

**Vercel Edge Functions:**
Create `app/api/[route]/route.ts` files

**Netlify Edge Functions:**
Create `netlify/edge-functions/[name].ts` files

## Monitoring

### Vercel Analytics

Enable in Vercel dashboard:
1. Go to your project
2. Click "Analytics" tab
3. Enable analytics

### Netlify Analytics

Enable in Netlify dashboard:
1. Go to Site settings
2. Click "Analytics"
3. Enable analytics

## Troubleshooting

### Build Fails

**Issue:** Build fails with "Cannot find module"
**Solution:** Clear cache and rebuild
```bash
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

**Issue:** "WebGL not supported"
**Solution:** This is a client-side issue. Ensure users have modern browsers with WebGL support.

### Deploy Fails

**Issue:** "Node version mismatch"
**Solution:** Add `NODE_VERSION=20` to environment variables

**Issue:** "Build timeout"
**Solution:** Increase build timeout in dashboard settings (usually not needed)

### Runtime Issues

**Issue:** "Three.js not loading"
**Solution:** Check that dynamic import is working. Clear browser cache.

**Issue:** "File upload not working"
**Solution:** This is client-side. Check browser console for errors.

## Rollback

### Vercel

Vercel keeps all deployments. To rollback:
1. Go to Deployments tab
2. Find previous deployment
3. Click "..." → "Promote to Production"

### Netlify

Netlify also keeps deployment history:
1. Go to Deploys tab
2. Find previous deploy
3. Click "Publish deploy"

## CI/CD (Optional)

### GitHub Actions

The repository includes a CI/CD workflow at `.github/workflows/ci-cd.yml` that:
- Runs on every push
- Lints code
- Builds the project
- Can auto-deploy to Vercel/Netlify

To enable auto-deploy:

**For Vercel:**
1. Get Vercel token: `vercel login && vercel token`
2. Add to GitHub Secrets: `VERCEL_TOKEN`
3. Uncomment deploy step in workflow

**For Netlify:**
1. Get Netlify token from dashboard
2. Add to GitHub Secrets: `NETLIFY_AUTH_TOKEN`
3. Add site ID: `NETLIFY_SITE_ID`
4. Uncomment deploy step in workflow

## Cost Estimates

### Vercel

- **Hobby (Free):**
  - 100GB bandwidth/month
  - Unlimited deployments
  - Perfect for personal projects

- **Pro ($20/month):**
  - 1TB bandwidth
  - Team collaboration
  - Better for production

### Netlify

- **Starter (Free):**
  - 100GB bandwidth/month
  - 300 build minutes
  - Great for personal use

- **Pro ($19/month):**
  - 1TB bandwidth
  - 1000 build minutes
  - Better for production

## Best Practices

1. **Use Git Tags:** Tag production releases
   ```bash
   git tag -a v2.0.0 -m "Production release"
   git push origin v2.0.0
   ```

2. **Preview Deployments:** Both platforms create preview deployments for PRs

3. **Monitor Performance:** Check analytics regularly

4. **Update Dependencies:** Keep Next.js and Three.js updated
   ```bash
   npm outdated
   npm update
   ```

5. **Test Locally First:**
   ```bash
   npm run build
   npm start
   ```

## Support

For deployment issues:
- **Vercel:** https://vercel.com/support
- **Netlify:** https://www.netlify.com/support/

For application issues:
- GitHub Issues: https://github.com/sumeshthkr/autopointcloud/issues

## Migration from Old Version

If migrating from the Rust version:

1. The old Docker/Fly.io deployments should be retired
2. All functionality is now client-side
3. No database or server needed
4. Deploy the new Next.js version to Vercel/Netlify
5. Update DNS to point to new deployment

---

**Ready to deploy? Run `vercel` or `netlify deploy --prod` now!**
